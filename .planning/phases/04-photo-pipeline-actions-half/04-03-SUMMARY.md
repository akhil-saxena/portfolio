---
phase: 04-photo-pipeline-actions-half
plan: 03
subsystem: pipeline
tags: [pipe-04, liveness-gate, r2, cdn, head-vs-get, anti-vacuity, criterion-3]

requires:
  - phase: 03-01
    provides: "src/lib/image-origin.ts — IMAGE_ORIGIN and REMOTE_URL_KEYS, the single source of both"
  - phase: 02-02
    provides: "scripts/migrate-photo-origin.mjs --verify — the shape this generalises, and its anti-vacuity reasoning"
provides:
  - "scripts/verify-photo-urls.mjs — manifest-to-bucket liveness; the only thing in the repository that can see a schema-valid record pointing at objects that do not exist"
  - "`--only <photoId>` single-record mode, whose refusal on an unknown id 04-10's criterion-1 gate depends on"
  - "`--cache` mode, which switches the method to GET because a cache assertion over HEAD reports a result it did not measure"
  - "npm run gate:liveness — registered, deliberately NOT chained into gate:content"
  - "test/pipeline/verify-photo-urls.unit.test.ts — 36 network-free assertions on assembly, the floors, the origin check, the retry policy and the argv contract"
affects: [04-09, 04-10]

tech-stack:
  added: []
  patterns:
    - "Derive the expected count from the input, then make 'nothing to check' a refusal — a derived count is satisfied by an empty input (0 === 0 * 4), so the floor is what makes the derivation safe"
    - "Make the wrong measurement unrepresentable rather than discouraged: method and cache-assertion are two fields of one frozen mode record, with a load-time invariant that throws"
    - "Check the origin of a URL before requesting it, comparing `new URL(u).origin` for equality — `startsWith(IMAGE_ORIGIN)` accepts `https://images.akhilsaxena.com.attacker.example`"
    - "Retry only statuses that mean 'ask again'; a 404 is the defect under test and must be reported on sight"
    - "Prove a test file can fail by mutating the code it covers, not by reading it — three mutations, three specific reds"

key-files:
  created:
    - scripts/verify-photo-urls.mjs
    - test/pipeline/verify-photo-urls.unit.test.ts
  modified:
    - package.json

key-decisions:
  - "HEAD is the liveness probe and that is a correctness choice, not a cost one. `cf-cache-status: DYNAMIC` on every HEAD means a HEAD is not served from the edge cache, so it reaches R2 and answers 'is the object in the bucket?'. A GET can be answered `HIT` by the edge and therefore cannot distinguish 'the object exists' from 'the object was cached before the upload failed' — a live hazard at pipeline step 8, which runs immediately after writing a MUTABLE key with a 2h edge TTL."
  - "`--cache` switches the method to GET as part of the same decision. The two request modes are frozen records in one table and a load-time invariant throws if any mode ever asserts on `cache-control` over HEAD. Proven by mutating the table: the module refuses to load."
  - "The URL count is derived (`records.length * REMOTE_URL_KEYS.length`), unlike `migrate-photo-origin.mjs`'s asserted 39. Correct in both places for opposite reasons: a migration over a reviewed cohort must stop if the corpus changed; a standing gate must survive the corpus growing, which is this phase's entire purpose."
  - "`gate:liveness` is NOT chained into `gate:content`. The four gates in that chain are offline and run on every build and CI job; this one makes 156 network requests. A CDN blip must not red a build whose code is fine — and the blip is measured, not hypothetical (see §4)."
  - "RETRYABLE_STATUSES = 408/425/429/500/502/503/504, and NOT 404. Added after a real false red. A status that persists across all three attempts is still reported, annotated `(after 3 attempts)`, so the retry cannot mask a broken object."
  - "The origin check compares `new URL(value).origin` for equality and fires BEFORE any request (T-04-10). A `startsWith` check would accept `https://images.akhilsaxena.com.attacker.example/...` — asserted in the walk-through, and it does start with the origin string."

patterns-established:
  - "A refusal is a distinct class from a finding: findings are accumulated and all printed, a refusal stops the run before any side effect. Both exit 1; the distinction is for the reader and for the unit test, which asserts on refusals without opening a socket."
  - "A network-free test of a network tool replaces `globalThis.fetch` with a spy that THROWS and asserts in `afterEach` that it was never called."

requirements-completed: [PIPE-04]

duration: 30min
completed: 2026-08-27
---

# Phase 4 Plan 03: Manifest-to-bucket liveness Summary

**A schema-valid manifest record whose R2 objects do not exist now fails a command that names the
record, the URL key and the URL — closing a property that had zero enforcement, since `npx astro
sync` reports `PASS · 40 photo(s) · RI-1…RI-6` at exit 0 over exactly that manifest and
`gate:origin` passes it too.**

## Performance

- **Duration:** ~30 min (20:05 → 20:33, 2026-08-27)
- **Tasks:** 3 of 3, one commit each
- **Files created:** 2 (538 + 581 lines) · **Files modified:** 1 (`package.json`, one line)
- **My unit file:** 36 passed / 36, no network
- **Commits:** `77cdf37` (Task 1), `16c3d49` (Task 2), `b20f380` (Task 3), plus this SUMMARY

**Shell for every control below: `zsh 5.9`** (`ZSH_VERSION=5.9`, `BASH_VERSION=unset`,
`ps -p $$ -o comm= → /bin/zsh`). **No control needed `bash -c`.** Every exit code was captured as
`if cmd; then R=0; else R=1; fi` — never `R=$?`, never `${PIPESTATUS[0]}`, never
`( cmd && R=0 || R=1 )`.

Sandbox: `git clone --no-hardlinks /Users/…/portfolio <scratchpad>/p4-liveness` with `node_modules`
symlinked. A clone rather than `cp -r`, so `git log` works inside it; verified before use
(`git log --oneline -1 → 16c3d49`). Deleted at the end; `git status --short --porcelain -- data/`
in the real repository is empty.

---

## 1. The hole, reproduced in my own sandbox

Not taken from `04-RESEARCH.md` §6 on faith. One record's `urls.medium` was repointed at
`https://images.akhilsaxena.com/photos/nature/thiswasneveruploaded-md.webp` — correct origin,
correct `/photos/<category>/<name>.webp` shape, object never uploaded — and then every existing
gate was run over that manifest:

```
ASTRO_SYNC_EXIT_BRANCH=0
20:24:20 [content-gate] content set: PASS · checked: 39 photo(s), 7 category record(s), 6 peek
id(s), 1 peek position(s), 5 project(s), 7 categoryOrder group(s) · rules run: RI-1, RI-2, RI-3,
RI-4, RI-5, RI-6

GATE_ORIGIN_EXIT_BRANCH=0
assert-no-r2dev-urls: PASS
```

**Both green over a URL that 404s.** §6's finding holds, and it holds on a 39-record manifest as
well as on the planted 40th — the hole is not about record count.

---

## 2. The four-step proof, per gate

Six gate/assertion surfaces shipped in this plan. Each gets the four steps. **Shell: zsh 5.9 for
all of them.**

### G1 — liveness: a record pointing at an object that does not exist

| Step | Result |
|---|---|
| **1. Plant** | `nature-acrossthetrees.medium` → `…/photos/nature/thiswasneveruploaded-md.webp`. **EXIT_BRANCH=1**, stdout empty (no PASS printed) |
| **2. Nothing to check** | see G4 — five cases, all exit 1 |
| **3. Pass on correct data** | pristine sandbox **EXIT_BRANCH=0**, `checked: 156 remote URL(s) = 39 record(s) x 4 remote key(s)` |
| **4. Walk-through** | see G2 (200 non-webp) and G3 (`data:` URI, look-alike host) |

Step 1, verbatim:

```
verify-photo-urls: 1 of 156 URL(s) did not satisfy HTTP 200 + content-type image/webp:
  x nature-acrossthetrees.medium: HTTP 404 — https://images.akhilsaxena.com/photos/nature/thiswasneveruploaded-md.webp
```

Naming check, each needle grepped individually: `NAMED: nature-acrossthetrees` · `NAMED: .medium` ·
`NAMED: thiswasneveruploaded-md.webp` · `NAMED: HTTP 404`.

Step 3, verbatim, and the cross-check that the number comes from the data:

```
verify-photo-urls: PASS
  manifest:  …/p4-liveness/data/portfolio_images.json
  scope:     all 39 record(s)
  checked:   156 remote URL(s) = 39 record(s) x 4 remote key(s), derived from the manifest at run time
  keys:      original, large, medium, small
  origin:    https://images.akhilsaxena.com  (from src/lib/image-origin.ts)
  method:    HEAD (liveness mode)
  excluded:  urls.thumb — a data:image/webp;base64 LQIP with no hostname, excluded by construction
             (REMOTE_URL_KEYS does not contain it)
  every one returned HTTP 200 with content-type image/webp in 17.2s

node -e "const m=require('./data/portfolio_images.json');console.log(m.length*4)"  →  156
```

**And a stronger derivation proof than the cross-check.** A 38-record copy of the manifest was fed
to the same binary:

```
scope:     all 38 record(s)
checked:   152 remote URL(s) = 38 record(s) x 4 remote key(s), derived from the manifest at run time
EXIT_BRANCH=0
```

152, not 156. The number follows the input, which is the property `migrate-photo-origin --verify`
does not have.

### G2 — the content-type branch: a 200 that is not an image

**1. Plant.** The origin serves a live 200 non-webp on the canonical host:
`GET /robots.txt → 200 text/plain; charset=utf-8`. Pointed `nature-acrossthetrees.medium` at it.

```
run1 (GET/--cache): EXIT_BRANCH=1
verify-photo-urls: 1 of 4 URL(s) did not satisfy HTTP 200 + content-type image/webp + cache-control:
  x nature-acrossthetrees.medium: content-type "text/plain; charset=utf-8" is not image/webp — https://images.akhilsaxena.com/robots.txt
```

Three consecutive runs, identical. **The branch fires on content-type, not on status.**
**2.** Covered by G4. **3.** The pristine run above passes with the same code path.
**4. Walk-through:** the only way past this branch is a URL that returns 200 **and** declares
`image/webp` — which is the property being asserted.

⚠️ **The HEAD-mode contrast, which is a finding in its own right.** The same planted URL under the
default HEAD mode reported `HTTP 404` on runs 1 and 2 and `content-type "text/plain…"` on run 3. See
§4 — the origin genuinely answers HEAD and GET differently on that path, and the resolution is that
HEAD is the *right* probe, not that it is unreliable.

### G3 — the origin check, before any request (T-04-10)

**1. Plant, twice.**

A `data:` URI in a remote key — the value a "skip what isn't a URL" filter would have swept in:

```
EXIT_BRANCH=1
verify-photo-urls: 1 target(s) were rejected before any request was made:
verify-photo-urls:   x nature-acrossthetrees.original: origin is "null", expected exactly
  "https://images.akhilsaxena.com" — not requested — data:image/webp;base64,UklGRjgBAABXRUJQVlA4ICw…
```

A look-alike host, which is the walk-through attempt against the check itself:

```
naive startsWith(IMAGE_ORIGIN) would accept it: true
EXIT_BRANCH=1
verify-photo-urls:   x nature-acrossthetrees.large: origin is
  "https://images.akhilsaxena.com.attacker.example", expected exactly
  "https://images.akhilsaxena.com" — not requested —
  https://images.akhilsaxena.com.attacker.example/photos/nature/acrossthetrees-lg.webp
```

`https://images.akhilsaxena.com.attacker.example/...`.startsWith('https://images.akhilsaxena.com')
is **true**, so a prefix check would have fetched an attacker-chosen host and could have reported its
200 as proof of liveness. Equality on `new URL(u).origin` rejects it, and `— not requested —` in the
message is the part that says no request was made.

**2.** G4. **3.** Pristine passes. **4. Walk-through attempted and failed:** no value satisfying
`new URL(v).origin === IMAGE_ORIGIN` can point at another host, because the origin *is* the host.

### G4 — the floors: "nothing to check" is a refusal

Five cases, **all EXIT_BRANCH=1, all with empty stdout** (no PASS line anywhere):

| Case | Message (verbatim, path elided) |
|---|---|
| manifest replaced with `[]` | `…/portfolio_images.json holds 0 records — a verifier that checked zero URLs and reported PASS is the vacuous gate this file exists to not be. Refusing.` |
| manifest file deleted | `no manifest at …/portfolio_images.json — there is nothing to check, which is a failure and never a pass.` |
| `--only a-photo-id-that-does-not-exist` | `--only "a-photo-id-that-does-not-exist" matched no record in …/portfolio_images.json (39 record(s) present) — a single-record check that silently found nothing to check would let a live-run gate go green over a run that never happened. Refusing.` |
| invalid JSON | `/tmp/broken.json is not valid JSON — Unexpected end of JSON input` |
| non-array top level | `/tmp/object.json is not a top-level array — the manifest shape changed, so the records.length x 4-keys arithmetic does not apply. Refusing.` |

**Walk-through attempt on the count check specifically:** `0 === 0 * 4` is arithmetically true, so
the derived-count assertion alone is satisfied by an empty manifest. That is why the empty-record
floor and a bare `targets.length === 0` floor both exist, ahead of and behind the arithmetic. The
unit test asserts each separately.

### G5 — "assert cache-control over HEAD" is unrepresentable

**1. Plant.** In the sandbox, edited the frozen mode table so `liveness` carries
`assertCacheControl: true` while keeping `method: 'HEAD'`:

```
EXIT_BRANCH=1, stdout empty
Error: verify-photo-urls: request mode "liveness" asserts on cache-control over HEAD. A HEAD
against this origin returns no cache-control at all (04-RESEARCH §4, measured); such a mode
reports a result it did not measure. Refusing to run.
```

The module refuses at load, before argv is parsed. **2.** The invariant runs on every invocation
including the refusal paths. **3.** Unmutated, both modes load and run. **4. Walk-through:** the only
way to construct the bad combination is to edit that table, which is what was just planted.

### G6 — can the unit test itself fail? Three mutations, three specific reds

Baseline in the sandbox: `36 passed (36)`, EXIT_BRANCH=0.

| Mutation to the script | Unit result | Which tests went red |
|---|---|---|
| delete the `--only matched no record` refusal | `2 failed \| 34 passed` | `refuses an id that matches no record, naming the id` · `exits 1 naming the id when --only matches no record` |
| delete the pre-request origin check | `2 failed \| 34 passed` | both `the origin check fires before any request (T-04-10)` cases |
| add `404` to `RETRYABLE_STATUSES` | `2 failed \| 34 passed` | `does NOT retry a 404 …` · `retries only statuses that mean "ask again" …` |
| restored | `36 passed (36)`, EXIT_BRANCH=0, `shasum` equal to the pristine copy | — |

Mutation 1 also demonstrated defence in depth: with the named refusal gone, the CLI still refused an
unknown id — `assembled 0 remote URLs — nothing to check. This is a failure, never a pass.` — just
less actionably. Both layers ship.

---

## 3. `--only <id>` refuses an unknown id — the specific proof 04-10 needs

04-10's criterion-1 gate is only meaningful if a single-record check over an id that matches nothing
is a **refusal**, not a silent pass. Three independent proofs:

1. **CLI, real repository, 39 records present** — `EXIT_BRANCH=1`, stdout empty, message names the
   id and says `matched no record` (§2 G4 row 3).
2. **Unit test on the pure function** — `refuses an id that matches no record, naming the id`
   asserts the throw, that the message is non-empty, that it contains the id, and that it contains
   `matched no record`.
3. **Unit test on the spawned CLI** — asserts `stderr.length > 0` **before** asserting content, then
   `status === 1`, then that stdout does **not** contain `PASS`.

Plus a fourth property nobody asked for but which matters if 04-10 passes a slug: `--only` with a
**prefix of a real id** also refuses. Matching is exact equality on `record.id`.

And the positive half: `--only <known id>` assembles **exactly 4** targets — `checked: 4 remote
URL(s) = 1 record(s) x 4 remote key(s)` — asserted in the test as `REMOTE_URL_KEYS.length` and
independently as `4`.

---

## 4. GET vs HEAD — measured here, and it changed a conclusion

### 4a. The brief's hazard, reproduced exactly

```
$ curl -sSI https://images.akhilsaxena.com/photos/abstract/intothemist.webp
HTTP/2 200 · content-type: image/webp · cf-cache-status: DYNAMIC · (no cache-control) · cf-ray …-HKG

$ curl -sS -o /dev/null -D - https://images.akhilsaxena.com/photos/abstract/intothemist.webp
HTTP/2 200 · content-type: image/webp · cf-cache-status: REVALIDATED · cache-control: max-age=14400 · cf-ray …-SIN
```

`04-RESEARCH.md` §4 and `04-VALIDATION.md` hazard 1 are both confirmed. **`--cache` therefore
switches the method to GET**, and G5 above proves the wrong combination cannot be constructed. A run
of `--only abstract-intothemist --cache` passes, meaning `cache-control` really is present on GET for
these objects.

### 4b. A second, unlisted divergence — and why it does NOT mean "use GET for liveness"

`https://images.akhilsaxena.com/robots.txt` is **not** an object in the bucket. Under `fetch`:

| Observation | HEAD | GET |
|---|---|---|
| run 1 | `404` (`text/plain;charset=UTF-8`, `cf-cache: DYNAMIC`) | `200 text/plain; charset=utf-8`, `cf-cache: HIT` |
| run 2 | `404` | `200`, `HIT` |
| run 3 | `200 text/plain` | `200`, `HIT` |
| curl HEAD ×3, any UA, http1.1 | `200` every time | `200` |

So the **status** of a HEAD and a GET can differ on this origin, not just the headers, and different
Cloudflare colos answer differently (`cf-ray … -HKG` vs `… -SIN`). My first instinct was to
"harden" the gate by re-confirming every HEAD failure with a GET. **That would have been wrong, and
the measurement is what shows why:**

- HEAD is `DYNAMIC` — it is not served from the edge cache, so it reaches R2 and answers *is the
  object in the bucket?*
- GET can be answered `HIT` by the edge. Here it returns 200 for a key the bucket does not hold.
- Pipeline step 8 runs this verifier right after writing a **mutable** key whose edge TTL is ~2h and
  whose browser `max-age` is 4h. A GET-based liveness check could therefore report a *previous*
  upload's cached bytes as proof that *this* upload succeeded — a false pass on precisely the
  half-committed state PIPE-04 exists to prevent.

**Conclusion: liveness = HEAD deliberately, because it asks the bucket; cache behaviour = GET,
because only a GET carries the headers. Neither substitutes for the other.** This is now written in
the script header. The plan justified HEAD as *sufficient*; the measurement shows it is *correct*,
which is a stronger and different claim.

All four remote keys of all 39 records agreed `200 image/webp` on both methods in every run —
roughly 470 observations. The divergence is on a zone-served path, not on a photo.

---

## 5. Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] A one-off origin 5xx was reported as a finding**
- **Found during:** Task 3, step 1 — the very first full sandbox run
- **Issue:** the run reported **two** failures, the planted 404 and
  `architecture-hauntedmansionjpg.small: HTTP 502` on an untouched record. Ten immediate re-probes
  of that exact URL (5× HEAD + 5× GET via curl) returned `200 image/webp` **10/10**. A false red on
  a live object.
- **Why it is a bug and not noise:** this gate's real home is pipeline step 8, *after* the R2
  upload. A false 502 there fails a legitimate publish and leaves exactly the inconsistent state
  PIPE-04 exists to prevent.
- **Fix:** `RETRYABLE_STATUSES = {408, 425, 429, 500, 502, 503, 504}`, retried across the existing
  three attempts with linear backoff. **`404` is deliberately absent** — it is the defect under
  test. A retryable status that persists across all attempts is still reported, annotated
  `(after 3 attempts)`.
- **Anti-masking proof:** three of the five new unit tests. `retries a 502 and reports the eventual
  200 as a pass` (2 fetch calls) · `reports a 502 that persists across all attempts, saying how many
  it tried` (3 calls, message contains `HTTP 502`, `after 3 attempts`, the id and the URL) ·
  `does NOT retry a 404` (**1** call). Plus mutation 3 in §2 G6: adding 404 to the set turns the
  suite red.
- **Files:** `scripts/verify-photo-urls.mjs`, `test/pipeline/verify-photo-urls.unit.test.ts`
- **Commit:** `b20f380`

**2. [Rule 2 — Missing critical coverage] The retry path had no test, so the test file grew in Task 3**
- Task 3's `<files>` lists only `scripts/verify-photo-urls.mjs`. Introducing a retry policy without
  covering it would have shipped an untested way for the gate to stop failing, so five assertions
  were added to the Task 2 file and committed in Task 3. `checkTarget` is exported and its backoff
  is injectable **only** so those tests drive the retry with a stubbed `fetch` and no real waiting;
  nothing in the CLI passes it.
- **Commit:** `b20f380`

**3. [Rule 2 — Correctness of the record] The header's HEAD/GET rationale was rewritten**
- The plan frames HEAD as *sufficient* for status and content-type. §4b measures something stronger
  and more useful: HEAD is *correct* for this question because it bypasses the edge cache, and a
  GET-based liveness check has a specific false-pass mode on a mutable key. Written into the script
  header so 04-09 does not "optimise" the method later.
- **Commit:** `b20f380`

### Not deviations, recorded for completeness

- **`package.json` carries no comment beside `gate:liveness`.** The plan says "beside the script
  entry if the format allows" — `package.json` is strict JSON, consumed by npm and by
  `assert-no-local-dep-specs.mjs`, so a comment would break it. The reason lives in the script
  header and in §6 below.
- **`test/pipeline/` is a new directory but not a new top-level path,** so §6's `gate:origin`
  classification trap does not fire: `test/**` is an existing named SKIP rule and `scripts/**` an
  existing SCAN rule. `gate:origin` passes and its report shows `test/** (15)` skipped by name.

---

## 6. Why `gate:liveness` is not in `gate:content`

`gate:content` = `gate:schema && gate:sinks && gate:origin && gate:routes`. All four are **offline**,
and they run on every `npm run build`, every `npm run deploy` and every CI job. This one makes **one
network request per remote URL — 156 today**, taking 13–18s.

Putting it on the build path would mean a CDN blip, a DNS hiccup or an offline laptop reds a build
whose code is fine, which teaches everyone to ignore the gate. **That blip is measured, not
hypothetical:** the `HTTP 502` in §5 happened during this plan's own proof, and §4b's HEAD/GET
divergence shows the origin is not perfectly consistent across colos either.

Its two real homes:

- **step 8 of the pipeline job (04-09)**, between the R2 upload and the commit, so a failed upload
  becomes a failed job with **no manifest change** — criterion 3;
- **a deliberate manual/e2e run (04-10)**, where `--only <id>` over the just-published record is the
  cheap form.

`git diff 1f845a4 -- package.json` is a **single `+` line**. `gate:content` is byte-identical and
still exits 0 (all four sub-gates PASS).

---

## 7. Verification, as run in the real repository

| Command | Result |
|---|---|
| `node scripts/verify-photo-urls.mjs` | **EXIT_BRANCH=0** · `checked: 156 remote URL(s) = 39 record(s) x 4 remote key(s)` |
| `node scripts/verify-photo-urls.mjs --only nature-fairwayreflections` | **EXIT_BRANCH=0** · `checked: 4 remote URL(s) = 1 record(s) x 4 remote key(s)` |
| `node scripts/verify-photo-urls.mjs --only a-photo-id-that-does-not-exist` | **EXIT_BRANCH=1**, names the id |
| `npm run gate:liveness` | **EXIT_BRANCH=0** |
| `npm run gate:content` | **EXIT_BRANCH=0**, four PASS lines, unchanged |
| `npx vitest run --project unit test/pipeline/verify-photo-urls.unit.test.ts` | **EXIT_BRANCH=0** · `36 passed (36)` |
| `npx vitest run --project unit` | lists `test/pipeline/verify-photo-urls.unit.test.ts` (all 36 ✓) · project-wide result affected by concurrent plans, see §8 |
| `git status --short --porcelain -- data/ \| wc -l \| tr -d ' ' \| grep -qx 0` | **EXIT_BRANCH=0** — no data change survived the proof |
| `npm run typecheck` | 2 errors, **both in `src/lib/photo-pipeline.ts` (04-02, in flight)** — zero in my two files |
| `npm run check` | fails on 3 files, **all 04-01/04-02's** — my two files pass `biome check` |

---

## 8. Concurrent-plan observations — not mine to fix, recorded so they are not mistaken for mine

04-01 and 04-02 were running in the same working tree throughout. Snapshots taken while verifying:

- `test/content/schemas.unit.test.ts` failed twice mid-session with
  `ReferenceError: EXPECTED_PHOTOS is not defined` (a half-applied rename). Green again by the end —
  04-01's re-scoping landed as `1b43b1d` / `e030338` / `e354ff7`.
- `src/lib/photo-pipeline.ts` currently has **2 `astro check` errors** (`ts(1360)` at 307:12,
  `ts(2344)` at 294:62) and fails `biome check` on formatting, as do
  `test/pipeline/manifest-growth.unit.test.ts` and
  `test/pipeline/photo-pipeline-contract.unit.test.ts`. `test/pipeline/photo-pipeline-contract.unit.test.ts`
  has 2 failing tests. All 04-02/04-01 files, all mid-flight; per the scope boundary I did not touch
  them.
- `scripts/migrate-photo-origin.mjs` changed under me (04-01 flooring its 39-record assertion). My
  script imports nothing from it, so nothing here depends on that landing.

---

## 9. Contradictions with the plan, `04-RESEARCH.md` and `04-VALIDATION.md`

1. **The plan's step-4 instruction, "the origin serves `404 text/html` for a missing key, so use a
   path that returns HTML with a 200 if one exists".** One does:
   `https://images.akhilsaxena.com/robots.txt` → `200 text/plain; charset=utf-8`. Used it, and the
   content-type branch fired (§2 G2). The plan's fallback ("assert the content-type branch
   directly") was not needed live, though the unit test asserts it too.
2. **The plan's HEAD rationale is understated.** It says HEAD "is sufficient for status and
   content-type". §4b shows HEAD is *the correct probe* — because it is `DYNAMIC` and therefore asks
   R2 rather than the cache — and that a GET-based liveness check has a specific false-pass mode on
   a mutable key. Recorded in the script header. **04-09 should not switch step 8 to GET.**
3. **`04-VALIDATION.md`'s requirement→test map row for PIPE-04 says `node
   scripts/verify-photo-urls.mjs` is an *integration* test.** It is a script, not a Vitest project
   file, and it is deliberately outside all three project globs. The Vitest-visible part is
   `test/pipeline/verify-photo-urls.unit.test.ts` (unit, network-free). Nothing to change in the
   code; the row's "type" column is the thing that is loose.
4. **`04-VALIDATION.md` quick-run baseline "444 tests / 7 files" is already stale** — 611 tests / 10
   files by the end of this session, from three plans landing at once. Not a contradiction, just a
   figure that will keep moving.
5. **Neither document anticipated an origin 5xx during verification.** §5 deviation 1. Worth
   carrying into 04-09's step-8 wiring: the retry is inside the script, so the workflow needs no
   retry of its own.

Nothing else in `04-RESEARCH.md` §4 or §6 failed to reproduce. §6's central claim — a schema-valid
manifest pointing at 404s passes `astro sync` and `gate:origin` at exit 0 — reproduced exactly (§1).

---

## 10. What this still cannot see

- **Whether the bytes at a live URL are the right image.** 200 + `image/webp` proves an object
  exists and is a WebP. It cannot prove it is the photograph the record describes, or that it has
  the `dimensions` the record claims. Written in the script header under `WHAT IT CANNOT SEE`.
- **`urls.thumb`.** Excluded by construction; the test proves the exclusion is by name and not by a
  filter, and proves every record carries a `thumb` that `new URL()` parses happily as `data:` —
  the value the careful-looking filter would have swept in.
- **Whether the pipeline actually calls it.** That is 04-09's step 8. The `--only` mode and its
  unknown-id refusal are the interface that plan needs, proven in §3.

## Known Stubs

None. Every code path in `scripts/verify-photo-urls.mjs` is exercised either by the 36 unit
assertions or by the six proofs in §2.

## Self-Check

```
FOUND: scripts/verify-photo-urls.mjs
FOUND: test/pipeline/verify-photo-urls.unit.test.ts
FOUND: package.json (gate:liveness present)
FOUND: 77cdf37   FOUND: 16c3d49   FOUND: b20f380
```

## Self-Check: PASSED
