# Phase 2 — First deploy and production verification (FND-01, FND-07, AUTH-01)

Evidence file for plan 02-09. Records the first `wrangler deploy` this project has ever run,
the observed ordering that proves the deploy was gated by CI rather than merely configured to
be, and the unauthenticated probes against the live Worker.

All command output below is quoted verbatim, with one class of redaction: the Cloudflare Access
**team domain** and the JWT `kid`/`meta` query parameters are replaced with `<TEAM-REDACTED>` and
`<redacted>`. They are real Access configuration values and this file is committed to a public
repository. Nothing else is elided.

Measurements taken 2026-08-19 from a residential connection routed through Cloudflare's SIN colo
(`cf-ray` suffix `-SIN`).

**Read the scope boundary before reading the probes.** Every refusal recorded here is produced by
Cloudflare Access intercepting at the edge, *before the Worker executes*. That proves the dashboard
application is configured and covers all three prefixes. It proves nothing whatsoever about the
Worker's own auth code. Plan 02-10 disables the Access application and re-probes; the two sections
it owns are left as empty headings at the bottom of this file on purpose, so the missing half of
the evidence is visible rather than implied.

---

## Deploy evidence

### The deployed artifact

```
Total (27 modules)                          642.96 KiB
✨ Read 12 files from the assets directory  dist/client
Total Upload: 1349.45 KiB / gzip: 313.83 KiB
Worker Startup Time: 20 ms

Your Worker has access to the following bindings:
Binding                                      Resource
env.PORTFOLIO_BUCKET (portfolio-photos)      R2 Bucket
env.ASSETS                                   Assets

Uploaded akhilsaxena-portfolio (4.52 sec)
Deployed akhilsaxena-portfolio triggers (1.15 sec)
  preview.akhilsaxena.com (custom domain)
Current Version ID: 0012c4a0-5c96-41c5-b53d-81af37763938
```

`preview.akhilsaxena.com (custom domain)` is the line that matters: `wrangler deploy` created and
attached the hostname itself from the `routes` entry in `wrangler.jsonc`. No dashboard step, no
redeploy, no hand-created DNS record.

### Run ordering — the CI gate, observed rather than assumed

`gh run list --limit 4 --json name,conclusion,headSha,createdAt,updatedAt,databaseId`

| Workflow | Run ID | Conclusion | Commit | Created | Completed |
| --- | --- | --- | --- | --- | --- |
| CI | `32223411979` | success | `b0b2b3c` | 2026-08-19T06:26:21Z | 2026-08-19T06:27:21Z |
| Deploy | `32223481641` | success | `b0b2b3c` | 2026-08-19T06:27:23Z | 2026-08-19T06:57:11Z |

Asserted programmatically, not read off the table:

```
same commit                       : true  (b0b2b3c)
deploy started AFTER CI completed : true  (gap 2s)
deploy conclusion is success      : true
```

The comparison is against CI's `updatedAt` (completion), not `createdAt` (start). A deploy that
began after CI *started* but before it *finished* would not be gated, and comparing against
`createdAt` would call that a pass.

**The assertion was mutation-tested before it was trusted.** The ordering script was extracted
verbatim from the plan and run against 14 synthetic run lists with each verdict predicted before
the run; all 14 behaved as predicted (4 positives, 10 negatives). An empty run list fails with
`no CI run found` rather than passing vacuously. Two blind spots were measured and then closed in
a hardened variant used alongside the plan's own:

- The plan's `r.find(x => /ci/i.test(x.name))` binds the runs to each other but not to the commit
  actually pushed, so a stale-but-internally-consistent CI+Deploy pair from an earlier push would
  pass. The hardened variant pins `headSha` to the pushed commit.
- `/ci/i` also matches this repository's **stale legacy run literally named `ci`** (run
  `27702280883`, commit `1435ac1`, from 2026-06-17, still inside a 15-run window). The hardened
  variant anchors on `/^CI$/`.
- A deploy job whose `if:` guard evaluates false produces a run with `conclusion: "skipped"`, which
  **is** found by `r.find` — so the plan's "no deploy run found — DEPLOY_ENABLED was not set"
  diagnostic would never fire for that case; the real message is `the deploy did not succeed:
  skipped`. The hardened variant names `DEPLOY_ENABLED` on a skipped conclusion.

Hardened variant: 8 further fixtures, all as predicted (1 positive, 7 negatives).

### A second, fully push-triggered chain — no re-run in it

The deploy above reached success as a **re-run** of a `workflow_run`-triggered job (see this plan's
summary, deviation 3). Committing this evidence file then produced a chain with no re-run anywhere
in it, which is the cleanest possible form of the claim *a push to `main` produced a deployed
Worker*:

| Workflow | Run ID | Conclusion | Commit | Created | Completed |
| --- | --- | --- | --- | --- | --- |
| CI | `32226174187` | success | `41de8e3` | 2026-08-19T07:04:47Z | 2026-08-19T07:05:41Z |
| Deploy | `32226248052` | success | `41de8e3` | 2026-08-19T07:05:43Z | 2026-08-19T07:06:39Z |

Deploy created **2s after** CI completed, same commit, both green, first attempt. The hardened
ordering assertion passes against this chain with `PUSHED_SHA` pinned to `41de8e3`, and the plan's
own verify block re-run verbatim against the live deployment returned
`PRODUCTION_EDGE_PROBES_OK`, exit 0.

### Two failed deploys preceded the successful one

Recorded because "it deployed" is a much weaker claim than the sequence that produced it, and both
failures are reusable knowledge.

| # | Run | Commit | Died at | Cause |
| --- | --- | --- | --- | --- |
| 1 | `32223084450` | `9c84030` | wrangler account-ID validation | The `CLOUDFLARE_ACCOUNT_ID` repository secret was pasted with a **trailing newline**. `✘ [ERROR] Invalid account ID "***\n"`. |
| 2 | `32223481641` (first attempt) | `b0b2b3c` | R2 binding validation | `A request to the Cloudflare API (/accounts/***/r2/buckets/portfolio-photos) failed. Authentication error [code: 10000]` — the API token lacked **Workers R2 Storage : Edit**. |

Failure 1 is fixed in the repository: the publish step now strips whitespace from both credentials
before wrangler reads them (commit `b0b2b3c`). It is worth noting *where* it died — after the
enforcing dependency gate, the build, both route-gate runs and all 29 tests had already passed.
A stray byte in a secret surfaced at the latest possible point in the pipeline.

Failure 2 **falsifies a prediction from 02-08**, which rated R2 as *"probably not needed — the
binding is configuration at deploy time"* and advised adding it only on a 403 naming R2. Measured
answer: `wrangler deploy` calls `/r2/buckets/<name>` to validate the binding on every deploy, so
the scope is required for this configuration. 02-08's instruction to start minimal and widen on a
real error is what produced this measurement instead of a reflexive all-permissions token, and the
confidence column was honest that it was a guess.

The two scopes 02-08 rated optional for account resolution (`User Details : Read`,
`Memberships : Read`) were **not** added. They appear in wrangler's post-failure diagnostics only,
not in the deploy path, because `CLOUDFLARE_ACCOUNT_ID` is supplied.

### Hostname, read from configuration rather than prose

```
$ node -e '…JSON.parse(wrangler.jsonc).routes.find(r => r.custom_domain === true).pattern'
preview.akhilsaxena.com
```

DNS, asserted against public resolvers:

```
authoritative (anna.ns.cloudflare.com):
172.67.155.185
104.21.48.180
1.1.1.1:
172.67.155.185
104.21.48.180
8.8.8.8:
172.67.155.185
104.21.48.180
```

Both addresses are inside Cloudflare's published proxy ranges (`172.64.0.0/13`, `104.16.0.0/13`) —
the same shape 02-02 established for `images.akhilsaxena.com`.

**A local-resolver artifact worth recording, because it reads exactly like a deploy failure.**
Immediately after the deploy this machine's own resolver still returned nothing for
`preview.akhilsaxena.com`, because the pre-deploy probes had queried the name while it did not
exist and the zone's SOA minimum (1800s) had negatively cached that. `dig +short` said the domain
did not resolve while `curl` fetched it successfully over the same name — macOS's `getaddrinfo`
path and `dig`'s direct query do not share a cache. The DNS assertion therefore queries public
resolvers, not this machine. The negative entry expired on its own and the system resolver now
agrees.

---

## Public route (Criterion 1)

`curl -sS -o pub.body -D pub.hdr -w '%{http_code}' https://preview.akhilsaxena.com/` → **200**

```
HTTP/2 200
date: Wed, 19 Aug 2026 06:58:54 GMT
content-type: text/html
cf-cache-status: HIT
cache-control: public, max-age=0, must-revalidate
server: cloudflare
cf-ray: a2d745c4ffcf1658-SIN
alt-svc: h3=":443"; ma=86400
```

Body is 2580 bytes and contains the `stack-proof-ok` marker exactly once — emitted by
`src/components/StackProof.tsx`. This is Criterion 1's "serves prerendered public routes": the
route is served from Static Assets (`cf-cache-status: HIT`) rather than rendered per-request.

### `not_found_handling: "404-page"`

`GET /this-path-does-not-exist-02-09` → **404**

```
HTTP/2 404
content-type: text/html
cf-cache-status: MISS
```

Body is 1622 bytes with `<title>Not found — akhilsaxena.com</title>` — the committed
`src/pages/404.astro`, not a Cloudflare default error page. The `assets.not_found_handling` setting
in `wrangler.jsonc` is doing what it claims.

---

## Unauthenticated probes — edge layer

Three requests carrying no credential of any kind. **All three are refused by Cloudflare Access at
the edge, before the Worker runs.**

| Probe | Method | Status | Refusal mechanism |
| --- | --- | --- | --- |
| `/admin` | GET | **302** | redirect to `<TEAM-REDACTED>.cloudflareaccess.com/cdn-cgi/access/login/…` |
| `/api/health` | GET | **302** | same |
| `/_actions/ping` | POST (`application/json`, body `{}`) | **302** | same |

Verbatim response to `GET /admin`, redacted only as described at the top of this file:

```
HTTP/2 302
date: Wed, 19 Aug 2026 06:58:55 GMT
content-type: text/html; charset=UTF-8
location: https://<TEAM-REDACTED>.cloudflareaccess.com/cdn-cgi/access/login/preview.akhilsaxena.com?kid=<redacted>&meta=<redacted>&redirect_url=%2Fadmin
access-control-allow-credentials: true
cache-control: private, max-age=0, no-store, no-cache, must-revalidate, post-check=0, pre-check=0
expires: Thu, 01 Jan 1970 00:00:01 GMT
set-cookie: CF_AppSession=<redacted>; Expires=Thu, 20 Aug 2026 06:58:55 GMT; Path=/; Secure; HttpOnly
www-authenticate: Cloudflare-Access resource_metadata="https://preview.akhilsaxena.com/.well-known/cloudflare-access-protected-resource/admin"
server: cloudflare
cf-ray: a2d745ca0dcbb6a6-SIN
```

`/api/health` and `POST /_actions/ping` returned byte-identical 302s modulo `cf-ray` and
`redirect_url` (`a2d745cbdeeefd83-SIN`, `a2d745cd6d49fd36-SIN`).

**Why these are edge refusals and not the Worker's own 401.** `www-authenticate: Cloudflare-Access`,
the `cdn-cgi/access/login/` location and the `CF_AppSession` cookie are all set by Cloudflare, and
the Worker's own middleware answers 401 rather than 302. A 401 here would have meant Access did
**not** intercept that prefix and the Worker was carrying it alone. That distinction is the whole
reason the status code is recorded rather than just "refused".

`/_actions/*` returning 302 is the one worth calling out: it is the prefix most easily omitted from
an Access application because no page declares it, and the Access application covers it.

### Each refusal body checked individually

Not once after a loop — a single check after a loop only inspects the last iteration's body.

```
clean: admin.body
clean: health.body
clean: ping.body
clean: no r2 JSON in health.body
```

Each 143-byte body is Cloudflare's generic redirect page and discloses nothing:

```
<html>
<head><title>302 Found</title></head>
<body>
<center><h1>302 Found</h1></center>
<hr><center>cloudflare</center>
</body>
</html>
```

No cookie handling, no Access certs endpoint, no team domain, no AUD in any body. `/api/health`
never emitted its `{"status":"ok","r2":"reachable"}` payload — the R2 binding is not reachable by an
unauthenticated caller.

One honest note: a `set-cookie: CF_AppSession=…` header **is** present on the refusals. It is
Cloudflare Access's own pre-authentication session cookie, set by the edge, not by this
application's code, and it carries no identity. The plan's disclosure assertion is scoped to
response bodies, and the bodies are clean.

---

## Unauthenticated probes — Access disabled (Criterion 2)

## Authenticated confirmation (Criteria 2 and 4)

---

## Apex

The apex **`akhilsaxena.com` is deliberately not attached to the Worker**, and this plan did not
touch it. `dig +short akhilsaxena.com` still returns nothing, matching the measured baseline in
`02-DNS-R2-PREREQS.md`: the apex holds no A, AAAA or CNAME record at all. Cutover owns it, and
because there is no existing record to repoint, cutover will *create* one rather than replace one —
there is no delete-then-create window in which the apex serves an error.

`wrangler.jsonc` declares exactly one route, the non-apex `preview.akhilsaxena.com`, and the
verification for this plan hard-fails if that pattern is ever the apex.

`images.akhilsaxena.com` was re-checked after both failed deploys and after the successful one and
still returns 200 — nothing in this plan disturbed 02-02's R2 custom domain.
