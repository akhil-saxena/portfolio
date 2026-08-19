---
phase: 02-astro-foundation-fail-closed-auth
plan: 07
subsystem: auth
tags: [cloudflare-access, jwt, jose, astro-middleware, workerd, fail-closed, negative-control]

# Dependency graph
requires:
  - phase: 02-03
    provides: astro:env schema with both Access secrets non-optional and validateSecrets true; jose@6 from the audited package set; the .invalid placeholder env examples
  - phase: 02-04
    provides: the three protected route surfaces returning a deliberate 503; src/lib/r2.ts; the measured Astro Actions and checkOrigin findings
  - phase: 02-05
    provides: the two Vitest projects, the astro preview global setup on real workerd, and the *.workerd.test.ts / *.node.test.ts project-selection contract
provides:
  - "src/lib/verify-access-jwt.ts — pure, injectable JWT verification with a module-level JWKS cache, unit-tested inside real workerd"
  - "src/lib/access.ts — requireAccess(request), the astro:env/server importer, no cookie fallback in code"
  - "src/middleware.ts — blanket prefix guard gated on isPrerendered, prefix list verbatim from run_worker_first"
  - "/admin, /api/health and /_actions/ping all answering 401 without a verified JWT, asserted over real HTTP"
  - "22 auth tests: 13 inside workerd against a real RS256 keypair, 9 over HTTP against astro preview"
  - "MEASURED: FND-04 is now LIVE — with all three secret sources cleared the build fails with [EnvInvalidVariables]; before this module it passed"
  - "MEASURED: fetchMock does not exist in @cloudflare/vitest-pool-workers@0.21.3; the pool monkeypatches globalThis.fetch for MSW-style interception instead"
  - "MEASURED: neither half of the /_actions/* defence is behaviourally observable alone — C1 and C2 both leave all 29 tests green"
  - "02-AUTH-CONTROLS.md — three controls, each predicted before it ran"
affects: [02-06, 02-08, 02-09, 07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth denies by construction: no branch returns permission, and the single `true` sits downstream of a completed jwtVerify"
    - "The astro:env read is split out of the verification logic so the verification is unit-testable inside the workers pool"
    - "Middleware guards on context.isPrerendered as its first statement, because Astro middleware runs at build time for prerendered pages"
    - "The middleware prefix list is wrangler.jsonc's run_worker_first verbatim, and the matcher derives behaviour from the patterns rather than restating them"
    - "Literals that a verify greps for appear in CODE ONLY — never transcribed into a comment, because grep -F cannot tell the difference"
    - "Negative controls are PREDICTED before they are run; a control whose failures do not match its stated mechanism is void"

key-files:
  created:
    - src/lib/verify-access-jwt.ts
    - src/lib/access.ts
    - src/middleware.ts
    - test/auth/access-jwt.workerd.test.ts
    - test/auth/deny-unauthenticated.node.test.ts
    - .planning/phases/02-astro-foundation-fail-closed-auth/02-AUTH-CONTROLS.md
  modified:
    - src/pages/api/health.ts
    - src/pages/admin/index.astro
    - src/actions/index.ts

key-decisions:
  - "Hand-rolled the JWKS interceptor and named it fetchMock, because fetchMock was removed from the pool in 0.21.3 and msw is not installed — the same class of finding as 02-05's defineWorkersConfig, resolved the same way"
  - "Ran the plan's own Control B a wave early, as a temporary stub during Task 1, so the RED state was 'false instead of true' rather than an unwired import error"
  - "Neither Vitest config was modified: both include globs already reach test/auth/, and the plan makes widening them conditional"
  - "Added a 12th workers case (JWKS endpoint failure denies) beyond the plan's 11, so Control A lands on a unit assertion and not only on integration"
  - "Added Control sub-cases C1 and C2 beyond the plan's three, because 'remove both halves' cannot show what either half covers alone"
  - "Fixed two vacuous verify assertions in the PROSE, not the assertion — the project's standing rule applied in the reverse direction"

patterns-established:
  - "Predict-then-run: every negative control records its mechanism and expected failure set before execution, and records where the prediction was wrong"
  - "A grep -F assertion against a well-commented file is a check on documentation until a planted violation proves otherwise"

requirements-completed: [AUTH-01, AUTH-02, AUTH-04]

# Metrics
duration: 30min
completed: 2026-08-19
---

# Phase 2 Plan 07: Fail-Closed Cloudflare Access Auth Summary

**Every request to `/admin`, `/api/*` and `/_actions/*` without a verified Cloudflare Access JWT now returns 401 — proven inside real `workerd` and over real HTTP against real `workerd` — and the proof is discriminating rather than universal, because forcing `verifyAccessJwt` to always deny leaves all nine HTTP tests green and only the signed-token positive case red.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-19T08:33 (local, IST)
- **Completed:** 2026-08-19T08:56 (local, IST)
- **Tasks:** 3 of 3
- **Files created:** 6 · **modified:** 3

## Task Commits

1. **Task 1: Write the failing auth suite — RED** — `a254e12` (test)
2. **Task 2: Implement fail-closed Access verification — GREEN** — `5437d3b` (feat)
3. **Task 3: Prove the suite discriminates — three auth negative controls** — `39c434b` (docs)

## Accomplishments

- **22 new auth tests, all green** — 13 in the `workers` project against a real RS256 keypair minted in-test with the JWKS intercepted, 9 in `integration` over HTTP against `astro preview`. Total suite is now **29 tests across 4 files**, green from a wiped `dist/` and `.astro/`.
- **`npm run build`, `npm run check` and `wrangler deploy --dry-run` all pass** — 27 modules (up from 23; the new module is `virtual_astro_middleware.mjs`), 12 assets, both bindings, `run_worker_first` intact.
- **FND-04 is live and measured** (see Findings 1). This is the handoff 02-06 was blocked on.
- **Three negative controls, each predicted before it ran**, plus two sub-cases the plan did not ask for. Control A bit harder than predicted; Control B and C were exact.
- **Two of the plan's own verify assertions were caught passing vacuously** and repaired — see Findings 3.
- **The legacy cookie-presence fallback does not exist in code**, and the reason it existed is written out verbatim in a comment so it is refused on purpose rather than forgotten about.

## The positive path is NOT assertable locally — and this is the plan's stated limitation

Both committed env examples use `CF_ACCESS_TEAM_DOMAIN=placeholder.cloudflareaccess.invalid`. The `.invalid` TLD is reserved by RFC 2606 and can never resolve, so **no token can be verified against a local `astro preview`** — every HTTP request to a protected prefix denies, including one carrying a genuine token, because the JWKS fetch cannot complete. That is the correct fail-closed outcome and it is deliberately not worked around.

The consequence is precise: `/api/health` returning **200** with `{"status":"ok","r2":"reachable"}` to an authenticated caller is **not proven by this plan**. What is proven locally is (a) the deny path over HTTP, and (b) that verification genuinely succeeds for a correctly signed, correctly audienced token — asserted in the `workers` project, where the JWKS endpoint is intercepted and a real keypair signs a real token. The composed authenticated HTTP path is confirmed by **plan 02-09's human checkpoint** against the deployed Worker with real Access secrets. No local positive was faked to close the gap.

## Findings

### 1. FND-04 activates with this plan — measured both ways

02-04 measured that `validateSecrets` was still dormant, because Astro only validates when something imports the virtual module and nothing did. `src/lib/access.ts` is that importer. Re-measured here with `.env` moved aside, `.dev.vars` moved aside, `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` unset in the process env, and **`dist/` and `.astro/` wiped first** — the wipe matters, because the build log shows Astro reading `dist/server/.prerender/.dev.vars`, which is exactly the stale artifact that gave 02-03 a false pass:

```
BUILD_EXIT=1
[EnvInvalidVariables] The following environment variables defined in `env.schema` are invalid:
- CF_ACCESS_TEAM_DOMAIN is missing
- CF_ACCESS_AUD is missing
```

Before this plan the identical experiment **passed**. Both env files were restored and verified byte-identical with `cmp`.

**This is why the wave order was reversed.** Had 02-06 run first, its missing-secret negative control would have asserted against a build that legitimately passes — shipping criterion 3's own control unable to fail. 02-06 can now write that control against a real failure.

### 2. `fetchMock` was removed from `@cloudflare/vitest-pool-workers` in 0.21.3

The plan specifies `fetchMock` from `cloudflare:test` for JWKS interception. It does not exist, and this was measured rather than inferred:

- `grep -rn fetchMock node_modules/@cloudflare/vitest-pool-workers/` returns **nothing** — not in `dist/`, not in `types/cloudflare-test.d.ts`, not in the sourcemaps.
- The runtime export list (`dist/worker/lib/cloudflare/test-internal.mjs`, final line) names 30 exports; `fetchMock` is not among them.
- The undici `MockAgent` / `MockInterceptor` **types** are still declared in `types/cloudflare-test.d.ts` but nothing exports a value of that type — orphaned declarations left by the removal.
- What replaced it is legible in `src/worker/fetch-mock.ts` via the sourcemap:

  ```js
  const originalFetch = fetch;
  // Monkeypatch `fetch()`. This looks like a no-op, but it's not. It allows MSW to
  // intercept fetch calls using it's Fetch interceptor.
  globalThis.fetch = async (input, init) => originalFetch.call(globalThis, input, init);
  ```

  Interception is now expected at the global-`fetch` layer, and `msw` is not in the dependency set.

This is 02-05's `defineWorkersConfig` finding repeating with a different name, and it was resolved the same way — follow the installed version. Installing `msw` was not an option on two independent grounds: `package.json` belongs to 02-06 this wave, and a package install is explicitly excluded from auto-fix. See Deviation 1.

**Relevant to whether jose can be intercepted this way at all:** `jose/dist/webapi/jwks/remote.js` declares `async function fetchJwks(url, headers, signal, fetchImpl = fetch)`. The default parameter is evaluated per call and resolves `fetch` from the global scope at call time, so replacing `globalThis.fetch` is genuinely picked up. That was checked in the source before the interceptor was written, not discovered by trial.

### 3. Two of the plan's verify assertions were vacuous — caught by planted violation

Task 2's verify greps `src/middleware.ts` for each protected prefix and `src/lib/verify-access-jwt.ts` for `createRemoteJWKSet`, `cdn-cgi/access/certs`, `audience` and `issuer`. Nine mutations were planted against the implementation as first written. **Two were missed:**

| Planted violation | First pass |
|---|---|
| `/_actions/*` deleted from the middleware's pattern array | **MISSED** |
| `audience: aud` deleted from the `jwtVerify` call | **MISSED** |

Both because **the greps were matching my own prose**: the middleware header transcribed `run_worker_first`'s patterns verbatim, and the JWT module's header said "both `issuer` and `audience` checked". Deleting either from the code left the literal in a comment and the assertion stayed green.

Fixed in the prose, never in the assertion. Every greped literal now appears in code and nowhere else, and both files carry a note saying the absence is deliberate so nobody helpfully pastes the list back into the docstring. **Re-run: 15 of 15 planted violations caught.**

Carried forward for 02-08 and 02-09: *a `grep -F` assertion against a well-commented file is a check on documentation until proven otherwise.* Strip comments first (as this plan's verify already does for `access.ts` and `r2.ts`), or prove it with a planted violation.

### 4. The `catch` in `verifyAccessJwt` is far more load-bearing than "JWKS outage handling"

Control A's prediction expected 6 failures; it produced 11. The mechanism prediction held exactly — the three no-header cases still passed, because they return at the emptiness guard and never enter the `try` — but the count was wrong because **jose signals every verification failure by throwing**. Wrong signature, wrong `aud`, wrong `iss`, expired, unparseable: all of them land on that one line. Inverting it opens all of them simultaneously, and `/admin` with a garbage header returned **200**, not a different error code.

The under-estimate is the useful part: the plan (and this implementation's own comment, since corrected) described that catch as covering JWKS availability. It is the deny path for the entire cryptographic and claim surface.

### 5. Neither half of the `/_actions/*` defence is behaviourally observable on its own

Control C removes both the middleware prefix and the in-action check, as the plan specifies, and 3 tests fail. Two extra sub-cases were run because "both together" leaves the obvious question open:

| Sub-case | Mutation | Result |
|---|---|---|
| **C1** | ONLY the `/_actions/*` middleware pattern removed | **29 passed, 0 failed** |
| **C2** | ONLY the in-action `requireAccess` removed | **29 passed, 0 failed** |

That is defence in depth working as intended, and it means **no HTTP test can distinguish "both present" from "one present"**. The only thing standing between this codebase and a silently single-layered Actions prefix is the pair of `grep` assertions in Task 2's verify — which is precisely why Finding 3 mattered enough to fix rather than note.

### 6. The `/_actions/*` prefix carries the JWT check alone (carried forward, not newly found)

02-04 measured that `security.checkOrigin` does not protect `/_actions/*`: `astro/dist/core/app/origin-check.js` treats only form-like content types as forbidden cross-origin, so `application/json` returns `false` regardless of `Origin`. This plan's integration tests POST exactly that content type and reach the handler, consistent with the finding. The Access JWT check is the entire mitigation on that prefix, and both the action file and the test file say so at the point where it matters. Recorded as `threat_flag: csrf-not-covered`.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] `fetchMock` does not exist in the installed pool**

- **Found during:** Task 1, while checking the interception API before writing the suite
- **Issue:** See Finding 2. The plan's specified interception mechanism was removed in 0.21.3.
- **Fix:** A local interceptor installed over `globalThis.fetch` — the exact global the pool monkeypatches for this purpose — deliberately **named `fetchMock`**, so the plan's `grep -q 'fetchMock'` matches a real interceptor rather than a comment about one (the 02-05 documentation-comment situation, avoided). It is stricter than the removed helper: an un-intercepted request throws, is recorded, and fails the suite via `fetchMock.assertNoEscapedRequests()`. Combined with the `.invalid` TLD that is two independent reasons no test can reach a real Access endpoint (T-02-38).
- **Not fixed by installing:** `msw` would be the upstream-sanctioned route. `package.json` is 02-06's this wave, and package installs are excluded from auto-fix.
- **Files:** `test/auth/access-jwt.workerd.test.ts` · **Commit:** `a254e12`

**2. [Rule 2 — Missing critical] The RED state would otherwise have been an unwired import error**

- **Found during:** Task 1
- **Issue:** The plan's `<done>` asks for a red that shows status-code or `verifyAccessJwt` failures "rather than import errors", but the workers suite necessarily imports a module Task 2 creates. The integration half gave a genuine red (8 × `expected 503 to be 401`); the workers half gave `Cannot find module`.
- **Fix:** A temporary always-deny stub was landed, `npm run test:workers` run, and the result recorded — `Tests 2 failed | 16 passed (18)`, the two failures being the signed-token positive case and the JWKS-cache case, with all 11 deny cases green. The stub was then **deleted** before commit and the file created properly in Task 2.
- **Why this is worth a deviation:** it converts the workers red from "unwired" to "false instead of true", and it independently pre-validates Control B a task before Control B is written — the 01-03 lesson about simulating a control before running it.
- **Files:** none committed (measurement only) · **Commit:** `a254e12` (recorded in the message)

**3. [Rule 2 — Missing critical] Two verify assertions passed against a real regression**

- **Found during:** Task 2 quality gates, while mutation-testing the verify
- **Issue:** See Finding 3.
- **Fix:** Every literal the verify greps for was removed from comments in `src/middleware.ts`, `src/lib/verify-access-jwt.ts` and `src/lib/access.ts`, so each assertion is a check on code. The prose says the same things without transcribing them, and each file explains why the absence is deliberate.
- **Files:** `src/middleware.ts`, `src/lib/verify-access-jwt.ts`, `src/lib/access.ts` · **Commit:** `5437d3b`

### Scope additions

**4. A twelfth workers case: JWKS endpoint failure denies**

The plan lists 11 workers cases. A twelfth was added — a JWKS endpoint returning 500 must deny — so Control A lands on a unit assertion and not only on integration behaviour. With the file's "no escaped requests" case that is 13.

**5. Control sub-cases C1 and C2**

The plan's Control C removes both halves of the `/_actions/*` defence. Two further runs isolate each half. Both are green, which is the finding (see Finding 5). Recorded in `02-AUTH-CONTROLS.md` under Control C rather than as separate controls.

### Not done, deliberately

**6. Neither Vitest config was modified.** The plan lists `vitest.workers.config.ts` and `vitest.integration.config.ts` in Task 1's files and makes the change conditional — *"if a glob does not reach `test/auth/`, widen it"*. Both globs are `test/**/*.{workerd,node}.test.ts` and already match. Confirmed empirically: the RED run reported `|workers| test/auth/access-jwt.workerd.test.ts` and `|integration| test/auth/deny-unauthenticated.node.test.ts`, each under the correct project. Touching them would have been churn on files a sibling wave may also read.

**7. `package.json` is byte-unmodified.** `git diff HEAD~3 -- package.json` is empty. `@types/node` was not installed and the one-file `tsconfig.json` exclusion was left in place — both belong to 02-06.

## Verification Evidence

- `npm test` → **29 passed, 4 files, 0 failed**, from `dist/` and `.astro/` wiped beforehand. Run to completion 8 times across the plan.
- Task 1 verify → `RED_CONFIRMED`. Task 2 verify → `GREEN_CONFIRMED`. Task 3 verify → `AUTH_CONTROLS_RECORDED`. All three transcribed to a script and run with `bash`, using the plan's `<verify_idiom>` (no bare commands, no reliance on `PIPESTATUS`, which is empty under zsh).
- `npm run build` exit 0; `astro check` 0 errors; `npm run check` (biome + prettier) exit 0.
- `wrangler deploy --dry-run` → 27 modules, 621.59 KiB, 12 assets from `dist/client`, `env.PORTFOLIO_BUCKET` and `env.ASSETS` both bound.
- Assets root resolved from `dist/server/wrangler.json` → `dist/client`; contains no `api/`, `admin/` or `_actions/` (FND-02 still holds).
- FND-04 experiment → build **fails** with `[EnvInvalidVariables]`; env files restored and `cmp`-verified.
- Mutation testing: **6/6** planted violations caught against the Task 1 verify, **15/15** against the Task 2 verify after the prose repair.
- Controls: A → 11 failures with the stated mechanism confirmed; B → exactly 2, both requiring `true`, 0 integration failures; C → exactly 3; C1 and C2 → 0 each.
- All four file digests identical before and after the controls; `git status --porcelain src/` empty.
- `pgrep -f 'astro preview'` → no orphan. `.astro/preview.json` → absent.

## Known Stubs

| Stub | File | Status |
|---|---|---|
| `/admin` renders a placeholder page, not an editor | `src/pages/admin/index.astro` | **Intentional and scoped.** Phase 7 owns the admin (decision D-05). This plan's job was the lock, not the room — no design-system import, nothing from `.playground/`, no admin UI. The page is reachable only with a verified JWT. |
| `ping` returns `{ pong: true }` | `src/actions/index.ts` | **Intentional and permanent-ish.** It exists to make `/_actions/*` a real, testable prefix. Real actions arrive with the admin in Phase 7. |

Neither stub prevents this plan's goal — both are behind the lock this plan installed.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: csrf-not-covered | `src/actions/index.ts` | `/_actions/*` has no CSRF protection underneath the Access JWT check. Astro's `security.checkOrigin` returns `false` for `application/json` regardless of `Origin` (02-04's measurement, re-confirmed by this plan's tests reaching the handler with that content type). The JWT check carries the prefix alone. Not new surface — recorded again because this plan is where the mitigation now lives. |

No new security-relevant surface was introduced beyond the plan's `<threat_model>`. All eight `mitigate` dispositions (T-02-30 … T-02-36, T-02-38) have a corresponding test or control; T-02-37 (JWKS latency/outage) remains `accept`, and Test 12 asserts the accepted behaviour is a denial rather than a permit.

## Notes for 02-06, 02-08 and 02-09

1. **02-06:** FND-04 is now live. The missing-secret negative control will fire — the expected failure is `[EnvInvalidVariables] CF_ACCESS_TEAM_DOMAIN is missing / CF_ACCESS_AUD is missing`, exit 1. **Wipe `dist/` and `.astro/` first**: the build reads `dist/server/.prerender/.dev.vars`, and a stale one is what gave 02-03 a false pass.
2. **02-06:** `package.json` is untouched by this plan. `@types/node` plus deleting the one-file `tsconfig.json` exclusion is still yours, and `test/auth/*` typechecks today, so removing the exclusion should not regress it.
3. **02-06:** your prerender gate is what makes a standalone `run_worker_first` behavioural control unconstructible. That is stated honestly in `02-AUTH-CONTROLS.md` rather than papered over; if you narrow the gate to admit a legitimate static file under a protected prefix, that control becomes both possible and necessary.
4. **02-09:** the authenticated 200 on `/api/health` is yours to confirm. Locally the `.invalid` placeholder makes every token unverifiable by design. Expect `{"status":"ok","r2":"reachable"}` with a real `Cf-Access-Jwt-Assertion`.
5. **02-08/02-09:** do not trust a `grep -F` assertion against these files without a planted violation. Two were vacuous in this plan for exactly that reason.
6. **All:** the `workers` project's `SELF` still reaches 02-05's 501 stub. Auth HTTP assertions live in `*.node.test.ts` against `inject('previewBaseUrl')`.

## Scope

`ROADMAP.md`, `STATE.md` and `REQUIREMENTS.md` were deliberately **not** updated, per the executing instruction. `requirements-completed` lists AUTH-01, AUTH-02 and AUTH-04 as satisfied by this plan's evidence; recording them is the orchestrator's step.

`package.json`, both Vitest configs, `wrangler.jsonc`, `astro.config.mjs`, `tsconfig.json`, `data/`, `.playground/` and `../design-system` were not touched.

## Self-Check: PASSED

All 6 created files and all 3 modified files verified present on disk. All three commit hashes verified present in `git log`.
