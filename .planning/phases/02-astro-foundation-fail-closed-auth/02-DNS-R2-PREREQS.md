# Phase 2 — DNS and R2 prerequisites (FND-07)

Evidence file for plan 02-02. Records the nameserver verdict for `akhilsaxena.com`, what the
apex serves today, the measured caching behaviour of the `pub-*.r2.dev` origin all 39 photos
currently use, and — once provisioned — the R2 custom domain and its cache proof.

All command output below is quoted verbatim. Measurements taken 2026-08-18, from a residential
connection routed through Cloudflare's SIN colo (`CF-RAY` suffix `-SIN`).

---

## Nameserver evidence

**NAMESERVERS: CLOUDFLARE-MANAGED**

`dig NS akhilsaxena.com +short`

```
anna.ns.cloudflare.com.
shane.ns.cloudflare.com.
```

Both delegated nameservers end in `.ns.cloudflare.com`, so the zone is Cloudflare-managed.

**Why this line is the most important one in the file.** Cloudflare's Pages-to-Workers migration
guide states verbatim: *"Unlike Pages, Workers does not support any domain whose nameservers are
not managed by Cloudflare."* A NOT CLOUDFLARE-MANAGED verdict here would have invalidated the
platform decision itself — not a config file — and forced a registrar nameserver move with a
multi-hour propagation window before any Worker could serve the apex. It did not. **The stack
decision (Cloudflare Workers + Static Assets) is confirmed viable for this domain**, and the
roadmap's reason for pulling FND-07 into wave 1 of Phase 2 (lead time on a potential blocker) is
discharged with no blocker found.

This verdict is re-asserted automatically in Task 3, because a registrar change between tasks
would silently invalidate it.

---

## Apex baseline

The apex has **no address record at all** — it does not resolve, and therefore serves nothing.

`dig +short akhilsaxena.com`

```
(no output)
```

`dig akhilsaxena.com A +noall +answer +comments`

```
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 40420
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1
```

`NOERROR` with `ANSWER: 0` is the signature of a zone that exists and is authoritative but holds
no record for the queried name — as opposed to `NXDOMAIN`, which would mean the zone itself is
absent. `AAAA` and `CNAME` queries likewise returned empty.

Cross-checked against independent resolvers and against Cloudflare's own authoritative
nameserver, because this finding contradicts an assumption in the plan text and a local-resolver
failure would look identical:

| Resolver                             | `akhilsaxena.com` A | Result        |
| ------------------------------------ | ------------------- | ------------- |
| system resolver                      | (empty)             | NOERROR, 0 answers |
| `1.1.1.1`                            | (empty)             | NOERROR, 0 answers |
| `8.8.8.8`                            | (empty)             | NOERROR, 0 answers |
| `anna.ns.cloudflare.com` (authoritative) | (empty)         | NOERROR, 0 answers, `aa` flag set |

`dig @anna.ns.cloudflare.com akhilsaxena.com A +noall +answer +comments`

```
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 7574
;; flags: qr aa rd; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1
```

The `aa` (authoritative answer) flag with zero answers from the zone's own nameserver settles it:
the record does not exist. This is not a resolution failure on this machine.

`curl -sS -o /dev/null -D - https://akhilsaxena.com`

```
curl: (6) Could not resolve host: akhilsaxena.com
```

**Finding — this corrects an assumption carried in the plan text.** Plan 02-02's checkpoint
copy says the apex "still points at the legacy Pages project". It does not. There is no apex A,
AAAA or CNAME record whatsoever, which matches CLAUDE.md's "Live site is down until cutover"
rather than a live legacy deployment. The practical consequence is favourable: **cutover will not
require repointing an existing apex record, only creating one**, so there is no
delete-then-create window where the apex serves an error. It also means no apex record can
conflict with anything this phase does.

### Candidate subdomains are unoccupied

Checked ahead of the checkpoint so the developer does not discover a conflict mid-dashboard.
`wrangler deploy` fails loudly if a `custom_domain` route collides with an existing record.

| Hostname                   | `dig +short` result | Status                      |
| -------------------------- | ------------------- | --------------------------- |
| `images.akhilsaxena.com`   | (no output)         | free — no conflicting record |
| `preview.akhilsaxena.com`  | (no output)         | free — no conflicting record |
| `www.akhilsaxena.com`      | (no output)         | free — not needed this phase |

---

## r2.dev origin baseline (before)

Object measured: `photos/abstract/intothemist-sm.webp` — the `urls.small` value of the first
entry in `data/portfolio_images.json`, confirmed present in the live manifest.

Full URL:
`https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/photos/abstract/intothemist-sm.webp`

**Request 1** — `curl -sS -o /dev/null -D -`

```
HTTP/1.1 200 OK
Date: Tue, 18 Aug 2026 10:47:16 GMT
Content-Type: image/webp
Content-Length: 3204
Connection: keep-alive
Accept-Ranges: bytes
ETag: "0d1c6930a303789079a2834031e731b7"
Last-Modified: Sun, 29 Mar 2026 11:22:33 GMT
Server: cloudflare
CF-RAY: a2d056e38eb1cf50-SIN
```

**Request 2** — immediately following, same command

```
HTTP/1.1 200 OK
Date: Tue, 18 Aug 2026 10:47:25 GMT
Content-Type: image/webp
Content-Length: 3204
Connection: keep-alive
Accept-Ranges: bytes
ETag: "0d1c6930a303789079a2834031e731b7"
Last-Modified: Sun, 29 Mar 2026 11:22:33 GMT
Server: cloudflare
CF-RAY: a2d0571d794dce7a-SIN
```

### Measured verdict

| Observation        | Request 1 | Request 2 | Note                                            |
| ------------------ | --------- | --------- | ----------------------------------------------- |
| `cf-cache-status`  | **absent** | **absent** | header not emitted at all — not MISS, not BYPASS |
| `age`              | absent    | absent    | no cache-age accounting                          |
| `cache-control`    | absent    | absent    | no cacheability directive from the origin        |
| `content-length`   | 3204      | 3204      | identical                                        |
| `etag`             | `0d1c6930a303789079a2834031e731b7` | same | identical object                                 |
| `CF-RAY`           | `a2d056e38eb1cf50-SIN` | `a2d0571d794dce7a-SIN` | different rays — two distinct edge requests |

**`cf-cache-status` is absent on both requests, which is the finding.** A cached-but-cold origin
would report `MISS` then `HIT`; an explicitly bypassed one would report `BYPASS` or `DYNAMIC`.
Emitting no `cf-cache-status` header at all is consistent with Cloudflare's documentation that
`r2.dev` public buckets are served outside the CDN cache and are rate-limited, with no WAF, no
caching and no Bot Management — "for development purposes only". Both requests reached the origin.

This is the before-state that the R2 custom domain must improve on. Task 3 asserts
`cf-cache-status: HIT` on the second consecutive request through the new hostname; without that
contrast the provisioning cannot be called done, because an unproxied custom domain looks correct
in the dashboard while reproducing exactly this behaviour.

Body SHA-256, recorded now so Task 3 can prove the custom domain serves the same bytes from the
same bucket rather than a different one:

```
24543e2811a80e5b98c5fad3952dde8f059d7b5db40627543d3a656be17e1fe3
```

### Scale of the Phase 3 rewrite this unblocks

Measured from `data/portfolio_images.json` (read-only; this plan does not modify it):

- **39** photo entries.
- Each entry's `urls` object has five keys: `original`, `large`, `medium`, `small`, `thumb`.
- **156** of those values are `pub-*.r2.dev` URLs — four remote variants per photo. The fifth,
  `thumb`, is an inline base64 LQIP data URI and contains no hostname.

So Phase 3's CONT-04 ("no `pub-*.r2.dev` URL remains anywhere in the repository") is a **156-URL**
rewrite across 39 entries, not a 39-URL one. Recorded here so that plan sizes the work correctly.

---

## R2 custom domain (provisioned)

Provisioned by the developer in the Cloudflare dashboard (R2 → `portfolio-photos` → Settings →
Public access → Custom domains) during the Task 2 checkpoint.

| Property | Observed value |
| --- | --- |
| Hostname | `images.akhilsaxena.com` |
| Bucket | `portfolio-photos` |
| DNS record type | `A` (two records, TTL 300) |
| Addresses | `172.67.155.185`, `104.21.48.180` |
| Proxied | **Yes (orange cloud)** — established by three independent signals, below |
| Status | Active and serving on first probe; no activation wait was needed |

`dig images.akhilsaxena.com +noall +answer`

```
images.akhilsaxena.com.	300	IN	A	172.67.155.185
images.akhilsaxena.com.	300	IN	A	104.21.48.180
```

A `CNAME` query returns empty: the zone presents flattened `A` records at the Cloudflare edge,
which is the expected shape for a proxied R2 custom domain rather than a direct bucket CNAME.

### How "proxied" was established rather than assumed

The orange/grey-cloud toggle is the single setting that decides whether this plan succeeded, and
a grey-cloud record looks healthy in the dashboard while behaving exactly like `r2.dev`. Three
independent observations confirm it is proxied:

1. **Both addresses are inside Cloudflare's published proxy ranges**, checked against the live
   `https://api.cloudflare.com/client/v4/ips` response by CIDR containment:
   - `172.67.155.185` ∈ `172.64.0.0/13`
   - `104.21.48.180` ∈ `104.16.0.0/13`
2. **`cf-cache-status` is emitted at all.** The baseline origin omits the header entirely; only a
   proxied hostname reports cache state.
3. **A second request returns `HIT` with a non-zero `age`.** An unproxied record cannot, because
   nothing is caching in front of it.

---

## Cache evidence (after)

Same object as the baseline: `photos/abstract/intothemist-sm.webp`, now fetched through
`https://images.akhilsaxena.com/`.

**Request 1** — `curl -sS -o /dev/null -D -`

```
HTTP/2 200
date: Tue, 18 Aug 2026 11:15:44 GMT
content-type: image/webp
content-length: 3204
accept-ranges: bytes
etag: "0d1c6930a303789079a2834031e731b7"
last-modified: Sun, 29 Mar 2026 11:22:33 GMT
server: cloudflare
cache-control: max-age=14400
cf-cache-status: MISS
cf-ray: a2d08097cdfdfd06-SIN
alt-svc: h3=":443"; ma=86400
```

**Request 2** — immediately following, same command

```
HTTP/2 200
date: Tue, 18 Aug 2026 11:15:53 GMT
content-type: image/webp
content-length: 3204
accept-ranges: bytes
etag: "0d1c6930a303789079a2834031e731b7"
last-modified: Sun, 29 Mar 2026 11:22:33 GMT
server: cloudflare
age: 9
cache-control: max-age=14400
cf-cache-status: HIT
cf-ray: a2d080d4eee4aa0f-SIN
alt-svc: h3=":443"; ma=86400
```

`MISS` then `HIT` is the exact cold-then-warm sequence the plan required. No retry and no polling
were needed — the domain was already Active on the first probe, so "not yet activating" never had
to be distinguished from "misconfigured".

### Before/after comparison

| Observation | `pub-*.r2.dev` (before) | `images.akhilsaxena.com` (after) |
| --- | --- | --- |
| Protocol | HTTP/1.1 | **HTTP/2** (with `alt-svc` advertising HTTP/3) |
| `cf-cache-status` req 1 | **absent** | `MISS` |
| `cf-cache-status` req 2 | **absent** | **`HIT`** |
| `age` | absent | `9` on the cached hit |
| `cache-control` | absent | `max-age=14400` (4 hours) |
| `content-length` | 3204 | 3204 (unchanged) |
| `etag` | `0d1c6930a303789079a2834031e731b7` | identical |
| Cache/WAF/Bot Management | none (documented dev-only origin) | Cloudflare edge cache + WAF |

The upgrade to HTTP/2 and the arrival of a real `cache-control` directive are incidental to the
requirement but both matter for the Lighthouse 95+ budget on the 39-photo gallery.

### Byte-for-byte bucket check (T-02-05)

Confirms the custom domain fronts the *same* bucket and did not expose a different one. All three
bodies are identical:

```
24543e2811a80e5b98c5fad3952dde8f059d7b5db40627543d3a656be17e1fe3  after-customdomain.webp
24543e2811a80e5b98c5fad3952dde8f059d7b5db40627543d3a656be17e1fe3  after-r2dev.webp
24543e2811a80e5b98c5fad3952dde8f059d7b5db40627543d3a656be17e1fe3  baseline-r2dev.webp   (Task 1)
```

Identical SHA-256 across the pre-change baseline, the current `r2.dev` origin, and the new custom
domain. No additional bucket was exposed.

---

## Handoff to later phases

These two lines are the entire machine-readable output of this plan. Both are consumed by later
plans; treat them as load-bearing strings, not prose.

`R2_PUBLIC_URL = https://images.akhilsaxena.com`

`WORKER_CUSTOM_DOMAIN = preview.akhilsaxena.com`

### `R2_PUBLIC_URL` — consumed by Phase 3 (CONT-04)

The canonical image host for the rest of the project's life. Phase 3 rewrites the **156**
`pub-*.r2.dev` URLs across the 39 entries of `data/portfolio_images.json` to this origin, and
`wrangler.jsonc` carries this value in `vars` from Phase 3 onward.

**Explicitly not this phase's work:** the manifest rewrite and the removal of the `pub-*.r2.dev`
public URL both belong to Phase 3's CONT-04. `data/portfolio_images.json` is unmodified by this
plan, verified with `git diff --quiet`. The `r2.dev` public URL is deliberately left enabled —
all 156 manifest URLs still point at it, so disabling it now would break the only image source
the project has.

### `WORKER_CUSTOM_DOMAIN` — consumed by plan 02-03

The non-apex subdomain the Worker itself will answer on. **Decided, not provisioned** — nothing
was created for it in the dashboard. Plan 02-03 writes it into `wrangler.jsonc` as a `routes`
entry with `custom_domain: true`, and `wrangler deploy` attaches the hostname on the first deploy
in plan 02-09. Verified free of conflicting DNS records at the time of writing, so that deploy
will not fail on a collision.

**Why a subdomain is required at all, and not `*.workers.dev`:** Cloudflare Access applications
can only be scoped to hostnames in a zone you control. A Worker reachable only at `*.workers.dev`
cannot have Access applied to it, which would make the production auth verification in plans
02-09 and 02-10 impossible. This is what connects a DNS decision to the phase's fail-closed auth
requirement.

**The apex `akhilsaxena.com` is deliberately NOT attached.** Cutover owns it. Note the measured
correction recorded under `## Apex baseline`: the apex currently holds no record at all, so
cutover will *create* an apex record rather than repoint one — there is no delete-then-create
window in which the apex serves an error.

### Phase 4 obligation — stale cache on same-key re-upload (T-02-08)

Now that images are served through a cached domain with `cache-control: max-age=14400`,
re-uploading a photo under the same deterministic R2 key will serve **stale bytes for up to four
hours**, and indefinitely from some edges if revalidation does not occur. No photo is re-uploaded
in Phase 2, so the risk is not live yet. **Phase 4 owns the fix** — content-hashed object keys, or
an explicit cache purge on write. Recorded here so it is not rediscovered as a bug report.

### Phase 4 constraint — do not put private objects behind this domain

`images.akhilsaxena.com` is a public, cached, unauthenticated origin for the whole
`portfolio-photos` bucket. Any later phase that writes non-public objects — notably the `temp/`
staging prefix used by the upload pipeline — must not rely on that prefix being unreachable
through this hostname. Either keep staging objects in a separate bucket, or treat anything written
to `portfolio-photos` as world-readable.
