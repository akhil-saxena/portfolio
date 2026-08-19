# 02-07 Auth Negative Controls

A green auth suite is worth exactly as much as the evidence that it would go red. Phase 0 had
four controls pass for the wrong reason before this discipline caught them, and plan 01-03 paid
for the sharper version of the lesson: *"the control was EXECUTED and the file was SHA-restored"
does not mean "the control tests what it claims."*

So each control below was **predicted before it was run** — mechanism first, then the exact set
of tests expected to fail — and the prediction is reproduced verbatim alongside the result,
including where it was wrong. A control whose failures do not match its stated mechanism has
gone red for the wrong reason and proves nothing.

Every mutation was made with **Node**, never BSD `sed`, whose `-i '' '0,/re/s//X/'` form is a
silent no-op that exits 0 and would make a control appear to run while changing nothing. Every
mutation script asserts its target string exists and exits non-zero if it does not.

## Digests

Recorded with `shasum -a 256` before the first control, and re-taken after the last restore.

| File | SHA-256 (before) | SHA-256 (after) |
|---|---|---|
| `src/lib/verify-access-jwt.ts` | `7067d871e787d8554c155e25b586180d9025d16c4da628e7ec83850a17ff9e2b` | `7067d871…9e2b` ✅ |
| `src/lib/access.ts` | `e4f4256467a544516daabf325641c08ba6114f424dd8915580f88cfd71cce35f` | `e4f42564…e35f` ✅ |
| `src/middleware.ts` | `8a8e37397b2ea478804987b08ecc7141ba835011c4f833034256dfc53645279f` | `8a8e3739…279f` ✅ |
| `src/actions/index.ts` | `57e9174494a5792b6b4afb6ba3110b5c282f9d94762701773e18672e2ad4b06b` | `57e91744…4b06b` ✅ |

`src/actions/index.ts` is digested alongside the three the plan names, because Control C mutates
it too. `diff` of the before/after digest files is empty and `git status --porcelain src/` is
empty after every control.

Baseline for every "expected" count below: **29 tests, 4 files, all green** — 18 in the
`workers` project (13 auth + 5 harness) and 11 in `integration` (9 auth + 2 harness).

---

## Control A — the fail-open catch

**Claim under test:** the `catch` in `verifyAccessJwt` fails *closed*, and the suite would notice
if it did not.

**Why this mutation and not another.** It is the closest living relative of the legacy
cookie-presence fallback that AUTH-02 exists to delete. Nobody writes `return true` on purpose;
they write it after watching JWKS fetches fail in a log and deciding the verification is "flaky".
The legacy fallback was added for exactly that shape of sympathetic reason.

**Mutation** (`src/lib/verify-access-jwt.ts`):

```diff
   } catch {
     // Rule 3. The one line Control A inverts.
-    return false;
+    return true;
   }
```

**Prediction, recorded before running:**

> Only reached when a token IS present and `teamDomain`/`aud` are non-empty. A no-header request
> returns `false` at the rule-1 guard and never enters the `try`, so the no-header deny tests
> must STILL PASS. The garbage-header requests DO enter the `try`; the `.invalid` team domain
> makes the JWKS fetch throw; the mutated catch then permits.
> **EXPECT: 5 integration failures + 1 workers failure = 6.**
> If all 8 integration deny tests fail, the rule-1 guard is not where I think it is.

**Result: 11 failed, 18 passed.** The prediction was right about the mechanism and **wrong about
the count, in the direction of underestimating the mutation.**

```
 ❯ |integration| test/auth/deny-unauthenticated.node.test.ts (9 tests | 5 failed) 73ms
     × refuses GET /admin with a garbage Cf-Access-Jwt-Assertion header 7ms
     × refuses GET /api/health with a garbage Cf-Access-Jwt-Assertion header 7ms
     × refuses POST /_actions/ping with a garbage Cf-Access-Jwt-Assertion header 4ms
     × refuses GET /admin?debug=1 with a garbage header 4ms
     × leaks neither the team domain, the AUD, nor any mention of a cookie 12ms
 ❯ |workers| test/auth/access-jwt.workerd.test.ts (13 tests | 6 failed) 97ms
     × denies a syntactically invalid token 2ms
     × denies a well-formed token signed by a different keypair 1ms
     × denies a validly signed token carrying a different aud 1ms
     × denies a validly signed token issued by a different team domain 1ms
     × denies an expired token 0ms
     × denies when the JWKS endpoint fails, rather than permitting the request 0ms

 Test Files  2 failed | 2 passed (4)
      Tests  11 failed | 18 passed (29)
```

**Why the count was wrong, and why the error matters.** The prediction treated that `catch` as
JWKS-outage handling. It is not: **jose signals every verification failure by throwing.** Wrong
signature, wrong `aud`, wrong `iss`, expired, unparseable — all of them arrive at that one line.
So the catch is not one deny path among many, it is *the* deny path for every cryptographic and
claim failure in the system, and inverting it opens all of them at once. That makes the line more
load-bearing than the plan's own description of it, and it is recorded here because the
under-estimate is the useful part of the result.

**The half of the prediction that had to hold, and did.** The three no-header cases are absent
from the failure list — verified explicitly rather than by eyeballing:

```
  still passed: refuses GET /admin$
  still passed: refuses GET /api/health$
  still passed: refuses POST /_actions/ping$
```

They never enter the `try`, so a mutation to the `catch` cannot reach them. Had they failed too,
the control would have gone red for some *other* reason and this whole section would be void.

**The single most alarming line in this document:**

```
 FAIL  |integration| … > refuses GET /admin with a garbage Cf-Access-Jwt-Assertion header
AssertionError: expected 200 to be 401
```

Not a wrong status code — a **200**. With one word changed, `/admin` renders to a caller holding
the string `garbage.not-a-real-jwt.at-all`. That is the fail-open, in the most literal form
available, and it is what the deny suite exists to catch. (threat T-02-32)

**Restored.** `shasum -a 256 src/lib/verify-access-jwt.ts` →
`7067d871e787d8554c155e25b586180d9025d16c4da628e7ec83850a17ff9e2b`, identical to the recorded
digest; `git diff --quiet` clean.

---

## Control B — the always-deny implementation

**Claim under test:** the suite *discriminates* rather than merely rejecting everything.

This is the most important control in the plan. AUTH-01 is a requirement about refusals, so it is
natural to write a suite of nothing but refusals — and such a suite is **fully satisfied by an
implementation that never authorises anyone**. The phase would then ship an admin nobody can
enter, with a green test run vouching for it, and the failure would surface as a human being
locked out of production in plan 02-09.

**Mutation** (`src/lib/verify-access-jwt.ts`): an unconditional deny as the first statement.

```diff
 }: VerifyAccessJwtInput): Promise<boolean> {
+  // CONTROL B: always deny.
+  return false;
   // Rules 1 and 2. …
```

**Prediction, recorded before running:**

> EXACTLY 2 failures, both in the WORKERS project, both cases that require `true` (the
> signed-token positive case and the JWKS-cache case). **ZERO integration failures** — every deny
> assertion is satisfied by an admin nobody can enter, which is the whole point of the control.

**Result: 2 failed, 27 passed. The prediction was exact.**

```
 ❯ |workers| test/auth/access-jwt.workerd.test.ts (13 tests | 2 failed) 58ms
     × verifies a correctly signed, correctly audienced, unexpired token 4ms
     × fetches the JWKS endpoint exactly once for two successive verifications 0ms

 Test Files  1 failed | 3 passed (4)
      Tests  2 failed | 27 passed (29)
```

```
 FAIL  |workers| … > verifyAccessJwt authorises a genuine Cloudflare Access token >
       verifies a correctly signed, correctly audienced, unexpired token
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ test/auth/access-jwt.workerd.test.ts:195:67
```

**The number that matters is 0.** Every one of the **9 integration tests passed** — all eight
HTTP deny assertions across all three protected prefixes, with and without a garbage header,
including the query-string case and the disclosure case. The entire Criterion-2 HTTP evidence
base is green against an implementation that authorises nobody. Only two unit cases in the
`workers` project noticed, and both of them are cases that require a `true`.

That is the justification for Test 1 existing at all, and for it being described in the test file
as the most important case in the file.

**Pre-validated before it was written.** This result was measured once already, during Task 1:
before any implementation existed, a temporary always-deny stub was landed, `npm run test:workers`
was run, and it reported `Tests 2 failed | 16 passed (18)` — the same two cases. The stub was then
deleted and the file recreated properly in Task 2. Simulating a control before running it is the
01-03 lesson applied: it means this section's result was predicted from two independent
directions rather than rationalised afterwards.

**Restored.** Digest identical, `git diff --quiet` clean.

---

## Control C — the uncovered prefix

**Claim under test:** `/_actions/*` is genuinely covered, rather than incidentally refusing for
some unrelated reason.

AUTH-01 names this prefix explicitly because it is the one most easily forgotten: no page declares
it, Astro injects `/_actions/[...path]` itself. Plan 02-04 additionally measured that Astro's
`security.checkOrigin` does **not** cover it for JSON bodies — `origin-check.js` only treats
form-like content types as forbidden cross-origin — so the Access JWT check carries this prefix
alone, with no CSRF protection underneath it. (`threat_flag: csrf-not-covered`)

**Mutation** (both halves, as the plan specifies): `/_actions/*` removed from
`RUN_WORKER_FIRST_PATTERNS` in `src/middleware.ts`, and the `requireAccess` call removed from the
`ping` handler in `src/actions/index.ts`.

**Prediction:** 3 integration failures — ping without a header, ping with a garbage header, and
the disclosure case (which issues both). Workers project untouched.

**Result: 3 failed, 26 passed. Exact.**

```
 ❯ |integration| test/auth/deny-unauthenticated.node.test.ts (9 tests | 3 failed) 66ms
     × refuses POST /_actions/ping 10ms
     × refuses POST /_actions/ping with a garbage Cf-Access-Jwt-Assertion header 3ms
     × leaks neither the team domain, the AUD, nor any mention of a cookie 11ms

 Test Files  1 failed | 3 passed (4)
      Tests  3 failed | 26 passed (29)
```

```
 FAIL  |integration| … > refuses POST /_actions/ping
AssertionError: expected 200 to be 401 // Object.is equality

- Expected
+ Received

- 401
+ 200
```

Again a **200**, not a different error code: with both halves gone, `POST /_actions/ping` returns
its result to an anonymous caller. (threat T-02-34)

### C1 and C2 — what each half covers on its own

The plan specifies removing both halves together. Two extra sub-cases were run because "both
together" leaves an obvious question unanswered, and the answer is uncomfortable enough to be
worth writing down.

| Sub-case | Mutation | Result |
|---|---|---|
| **C1** | ONLY the `/_actions/*` pattern removed from `src/middleware.ts`; in-action check intact | **29 passed, 0 failed** |
| **C2** | ONLY the in-action `requireAccess` removed; middleware pattern intact | **29 passed, 0 failed** |

**Neither half of the `/_actions/*` defence is behaviourally observable on its own.** Each one
answers 401 when the other is missing, which is precisely what defence in depth is supposed to do
— and precisely why no HTTP test can distinguish "both present" from "one present".

The consequence must be stated plainly rather than left implicit: **the only thing standing
between this codebase and a silently single-layered Actions prefix is a `grep`** — Task 2's
`for p in '/admin' '/api/' '/_actions/'; do grep -Fq "$p" src/middleware.ts` — plus the
`requireAccess` grep on `src/actions/index.ts`. Those greps are load-bearing, not decorative, and
that discovery is what turned up the vacuity described in the next section.

**Restored.** Both files byte-identical, all four digests match, `git status --porcelain src/`
empty.

---

## Two verify assertions were found vacuous — by planted violation, during this plan

Not a control in the plan's list, but the same discipline applied to the plan's own `<verify>`
block, and it caught two assertions that would have passed against a real regression.

Task 2's verify contains `grep -Fq "$p" src/middleware.ts` for each protected prefix, and
`grep -Fq "$t" src/lib/verify-access-jwt.ts` for `createRemoteJWKSet`, `cdn-cgi/access/certs`,
`audience` and `issuer`. Nine mutations were planted against the as-written implementation. **Two
were missed:**

| Planted violation | Verdict (first pass) |
|---|---|
| `/_actions/*` deleted from the middleware's pattern array | **MISSED** |
| `audience: aud` deleted from the `jwtVerify` call | **MISSED** |

Both for the same reason, and it is the reason plan 02-05 recorded for `defineWorkersConfig`:
**the greps were matching prose.** The middleware's header comment transcribed
`run_worker_first`'s patterns verbatim (`["/admin", "/admin/*", "/api/*", "/_actions/*"]`), and
the JWT module's header comment said "both `issuer` and `audience` checked". Deleting either from
the *code* left the literal sitting in a *comment*, and the assertion stayed green.

Fixed **in the prose, never in the assertion** — the project's standing rule, applied in the
direction it is usually applied in reverse. Every literal the verify greps for now appears in code
and nowhere else; the comments describe the same things without transcribing them (`iss` and `aud`
instead of the option names, "the four patterns in the constant below" instead of the list), and
both files carry a note explaining that the absence is deliberate so a future author does not
helpfully paste the list back into the docstring.

Re-run after the fix: **15 planted violations, 15 caught**, including all eight that target these
literals — each of the three prefixes deleted individually, `audience` deleted, `issuer` deleted,
`createRemoteJWKSet` swapped for `createLocalJWKSet`, the certs path changed, and the
`astro:env/server` import swapped for a local module.

The general form, worth carrying into 02-08 and 02-09: **a `grep -F` assertion against a
well-commented file is a check on documentation until proven otherwise.** Prove it with a planted
violation, or strip comments before grepping, as this plan's verify already does for
`src/lib/access.ts` and `src/lib/r2.ts`.

---

## The control that cannot be built in Phase 2

Plan 02-06's controls document names this plan as the owner of a **behavioural** control for
`run_worker_first`. It has not been built, and it is not constructible while the prerender gate
holds. This section says so plainly rather than manufacturing a control that proves nothing.

`assets.run_worker_first` changes behaviour only when Cloudflare Static Assets *would otherwise
have served a file* at the requested path — assets are matched before the Worker runs, so the
setting is what pulls a path back to the Worker. Demonstrating it therefore requires a static file
to exist under a protected prefix. But 02-06's build gate exists precisely to make the build
**fail** if any file exists at `dist/api`, `dist/admin` or `dist/_actions` (resolved from the real
assets root, `dist/client`, per 02-04's finding). Confirmed for this plan's build: the assets root
contains `404.html`, `index.html`, `_astro/`, `assets/`, `favicon.svg`, `resume.pdf`,
`_headers`, `.assetsignore` — and nothing under any protected prefix.

So a standalone behavioural control would have to disable the gate that makes `run_worker_first`
unnecessary in the first place, and would then be measuring a configuration that cannot occur.

What *is* verified, and it covers the composed outcome rather than the isolated setting:

- **The config value** — asserted against the installed `wrangler` schema by 02-03, and carried
  through to the generated deploy config: `wrangler deploy --dry-run` on this plan's build reports
  27 modules, 12 assets and both bindings, with `run_worker_first` intact on all four patterns.
- **The composed outcome** — the 8 HTTP 401 assertions in this plan. If a static file ever *did*
  shadow one of these routes, those assertions would return that file's contents instead of a 401
  and fail. They are the behavioural check; they simply cannot isolate which half produced the
  result.
- **The absence of the precondition** — 02-06's gate, with its own planted-violation control.

**Item to revisit:** if a static file ever legitimately lands under a protected prefix — a
`/admin/favicon.ico`, an `/api/openapi.json` — then 02-06's gate must be narrowed to permit it,
and at that moment a standalone `run_worker_first` control becomes both constructible and
necessary. Until then the two halves are each verified and the composition is verified; only the
isolation is not. It is a gap in evidence, not a gap in defence, and it is recorded as the former.

---

## Final state

| Check | Result |
|---|---|
| `npm test` | 29 passed, 4 files, 0 failed |
| `npm run build` | exit 0 |
| `npm run check` | exit 0 (biome + prettier) |
| `shasum -a 256` × 4 | all identical to the recorded before-digests |
| `git status --porcelain src/` | empty |
| `src/lib/access.ts`, comments stripped | no `CF_Authorization`, no `cookie` |
