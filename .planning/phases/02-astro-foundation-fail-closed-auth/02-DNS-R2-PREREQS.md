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

_Pending — filled by Task 3 after the developer provisions the domain in the Cloudflare dashboard
(Task 2 checkpoint). Will record the hostname, the DNS record type, and the observed proxied
status._

---

## Cache evidence (after)

_Pending — filled by Task 3. Will record two verbatim header dumps from consecutive fetches
through the custom domain, asserting `cf-cache-status: HIT` on the second, plus the SHA-256
comparison against the r2.dev baseline above._

---

## Handoff to later phases

_Pending — filled by Task 3 with the two canonical lines that later plans read: the R2 public
URL that Phase 3's CONT-04 rewrites all 156 manifest URLs to, and the non-apex Worker hostname
that plan 02-03 writes into `wrangler.jsonc` as a `custom_domain` route._
