---
phase: 02-astro-foundation-fail-closed-auth
plan: 04
subsystem: routing
tags: [astro, cloudflare-workers, r2, astro-actions, prerender, fail-closed, workerd]

# Dependency graph
requires:
  - phase: 02-03
    provides: astro.config.mjs + wrangler.jsonc + the installed 17-package set; run_worker_first on all four prefixes
  - phase: 02-02
    provides: the portfolio-photos R2 bucket named in wrangler.jsonc
provides:
  - "src/lib/r2.ts — the single, unguarded accessor for the PORTFOLIO_BUCKET R2 binding"
  - "/admin as a genuinely on-demand route (prerender = false), refusing every caller with 503"
  - "/api/health as an on-demand endpoint that exercises R2 through a real .list() round trip"
  - "/_actions/ping — the /_actions/* prefix made real and testable, refusing with 503"
  - "MEASURED: Astro Actions need nothing beyond src/actions/index.ts when an adapter is attached"
  - "MEASURED: the effective Static Assets root is dist/client, resolved from the adapter-generated deploy config — assertions on dist/api are vacuous"
  - "MEASURED: astro dev in Astro 7 is a daemon supervisor; kill $! orphans the real server"
  - "MEASURED: security.checkOrigin does NOT block cross-origin JSON POSTs to /_actions/*"
  - "wrangler deploy --dry-run succeeds again — 02-03's run_worker_first blocker is cleared"
affects: [02-05, 02-06, 02-07, 02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Binding access is unguarded by policy: no truthiness check, optional chaining, ?? / || fallback, try/catch or null return anywhere near env.PORTFOLIO_BUCKET"
    - "Every protected route declares export const prerender = false; protection is prefix-shaped via run_worker_first rather than per-file"
    - "Stub surfaces refuse with 503, never 401 and never 2xx, so the auth plan's tests start genuinely red"
    - "dist assertions resolve the assets root from dist/server/wrangler.json rather than hardcoding a path"

key-files:
  created:
    - src/lib/r2.ts
    - src/pages/api/health.ts
    - src/pages/admin/index.astro
    - src/actions/index.ts
  modified: []

key-decisions:
  - "The ping action throws ActionError SERVICE_UNAVAILABLE (503) instead of returning a constant object — the plan's own <done>, <objective> and <verification> all require non-2xx, and an unauthenticated 2xx is forbidden for the whole phase"
  - "prerender = false sits on line 3 of health.ts, after two imports, rather than line 1 — the plan explicitly permits imports to precede it and Biome is happier; still inside the 'first three lines' criterion"
  - "src/lib/access.ts was deliberately NOT created here: it belongs to 02-07's files_modified, so FND-04's build gate stays dormant one more wave. 02-03's summary predicted otherwise; the plan frontmatter is authoritative"
  - "The r2 import uses the @/ tsconfig alias, exercising the path mapping 02-03 configured rather than leaving it unproven"

patterns-established:
  - "Dev servers are started with `astro dev --background` and stopped with `astro dev stop`; a bare `kill $!` is a known orphan bug"
  - "Any assertion about build output is proven with a planted violation before it is trusted"

requirements-completed: [FND-02, FND-03]

# Metrics
duration: 45min
completed: 2026-08-19
---

# Phase 2 Plan 04: Route Surface and R2 Binding Summary

**The three surfaces this phase exists to protect — `/admin`, `/api/*`, `/_actions/*` — now exist as genuinely on-demand routes that refuse every caller with 503, with `env.PORTFOLIO_BUCKET` proven live from `cloudflare:workers` through a real `.list()` round trip under `astro dev`, and the plan's own `dist/` assertions caught passing vacuously.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-19T01:06Z
- **Completed:** 2026-08-19T01:51Z
- **Tasks:** 2 of 2
- **Files created:** 4 (exactly the plan's `files_modified` list; nothing else touched)

## Accomplishments

- `src/lib/r2.ts` reads `env.PORTFOLIO_BUCKET` from `cloudflare:workers` with **no** truthiness check, optional chaining, `??`/`||` fallback, try/catch or null return — mutation-tested with 10 planted violations, all 10 caught.
- All three protected surfaces return **503** under real `workerd`, and the `/api/health` body is `{"status":"auth-unwired","r2":"reachable"}` — the FND-03 proof, since that word is unreachable unless `.list({ limit: 1 })` resolved against the Miniflare-backed bucket.
- After a clean build the **effective** Static Assets root (`dist/client`, resolved from the adapter-generated deploy config) contains no `api/`, `admin/`, `_actions/` or `admin.html` — FND-02.
- **`wrangler deploy --dry-run` succeeds again.** 02-03's finding 5 (`Cannot set run_worker_first without a Worker script`) is cleared: `main: entry.mjs` now appears in the generated config, `run_worker_first` carries through all four prefixes intact, and both bindings resolve.
- Four behaviours were measured rather than assumed, and three of them change what 02-05, 02-06 and 02-07 must do (see Findings).

## Task Commits

1. **Task 1: The unguarded R2 accessor and the on-demand API endpoint** — `7a26fca` (feat)
2. **Task 2: The /admin page and the /_actions/* surface** — `da2d1f7` (feat)

## Files Created/Modified

- `src/lib/r2.ts` (31 lines) — `getPortfolioBucket(): R2Bucket`, plus a header comment that states the *reason* the guard is absent so a future reader does not "fix" it back into a silent failure.
- `src/pages/api/health.ts` (39 lines) — `prerender = false` on line 3; `GET` performs a real `.list({ limit: 1 })` and returns 503 with a body that discloses no bucket contents.
- `src/pages/admin/index.astro` (36 lines) — `prerender = false` in frontmatter, returns 503 text/plain. No admin UI, no design-system import, nothing from `.playground/`.
- `src/actions/index.ts` (32 lines) — `export const server` with one `ping` action that throws `ActionError` `SERVICE_UNAVAILABLE`.

`package.json` is byte-unmodified (`git diff --quiet package.json` passes), as is `worker-configuration.d.ts`. `.playground/` is untouched.

## Findings

### 1. Astro Actions need nothing beyond `src/actions/index.ts` — *because an adapter is attached*

**This is the question the plan asked to resolve empirically and record for 02-07.**

Under `output: 'static'`, creating `src/actions/index.ts` is sufficient on its own. No extra config, no `prerender = false` page to call it, no integration entry. Read from the installed source rather than the docs:

- `node_modules/astro/dist/actions/integration.js:13-19` injects the route `/_actions/[...path]` with **`prerender: false` hard-coded**. The actions endpoint is on-demand by construction and cannot be prerendered by accident.
- The same file's `astro:routes:resolved` hook throws `ActionsWithoutServerOutputError` **only** when `!settings.config.adapter && !hasNonPrerenderedRoute(routes)`. `@astrojs/cloudflare` is attached, so the first clause is false and the guard never fires — *even if this project had no other on-demand route at all*.

Confirmed live: `POST /_actions/ping` reached the handler under `astro dev` and returned the handler's own status.

Two mechanics 02-07 needs:

- **`ActionError` codes map straight through to HTTP status.** `astro/dist/actions/runtime/entrypoints/route.js` returns `serialized.status` verbatim, and `codeToStatusMap` (`.../runtime/client.js:38`) has `SERVICE_UNAVAILABLE: 503` and `UNAUTHORIZED: 401`. Swapping the stub's refusal for a real 401 in 02-07 is a one-word change.
- **The response body is JSON-shaped, not empty:** `{"type":"AstroActionError","code":"SERVICE_UNAVAILABLE","status":503,"message":"..."}`. Tests can assert on `code` as well as status.

### 2. `security.checkOrigin` does NOT protect `/_actions/*` from cross-origin JSON POSTs

Discovered while confirming the ping response would not be a spurious 403. `astro/dist/core/app/origin-check.js`:

```js
const hasContentType = request.headers.has("content-type");
if (hasContentType) {
  const formLikeHeader = hasFormLikeHeader(request.headers.get("content-type"));
  return formLikeHeader && !isSameOrigin;   // <- application/json => false, always
}
return !isSameOrigin;
```

A POST carrying `content-type: application/json` is only "forbidden cross-origin" if the content type is **form-like** (`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`). JSON is not, so the origin check returns `false` regardless of the `Origin` header. Verified empirically: `curl -X POST -H 'content-type: application/json'` with no `Origin` header reached the handler.

**Consequence for 02-07:** Astro's built-in CSRF protection cannot be counted as any part of the `/_actions/*` mitigation. The Access JWT check must carry the entire load on that prefix. This is exactly why the plan insisted the prefix be made real and testable rather than left implicit.

### 3. The plan's `dist/` assertions were vacuous — proven with a planted violation

The plan asserts `test -d dist/api`, `test -d dist/admin`, `test -d dist/_actions`, `test -f dist/admin.html`. **With an adapter attached none of those paths can ever exist**, because Astro splits output into `dist/client` (what Static Assets serve) and `dist/server` (the Worker). Every one of the four passes no matter what the build emits — the same class of error 02-03 corrected three times.

Proven rather than reasoned. A temporary `src/pages/api/tmp-prerender-probe.ts` with no `prerender` export was planted and the build re-run:

| Assertion | Result against the violating build |
|---|---|
| `test -d dist/api` (plan as written) | **MISSED** — reported absent |
| `test -d dist/client/api` (corrected) | **CAUGHT** |

The emitted artifact was `dist/client/api/tmp-prerender-probe` — **extensionless**, not `.json`. So the plan's companion check for `dist/**/health*.json` would also have missed a prerendered `/api/health`.

The verify now resolves the assets root from the adapter-generated config instead of hardcoding it:

```
assets.directory in dist/server/wrangler.json = "../client"
  -> /Users/.../portfolio/dist/client
```

**This is the single most important handoff to 02-06,** which turns this one-off check into the permanent build gate. Its gate must (a) resolve the assets root from `dist/server/wrangler.json` rather than assume `dist/`, (b) match extensionless artifacts, not just `*.json`/`*.html`, and (c) be proven with a planted violation before it is trusted. Its own fixture (`src/pages/api/prerender-fixture.ts`) is the right vehicle; the probe used here was temporary and is deleted.

### 4. `astro dev` in Astro 7 is a daemon supervisor — `kill $!` orphans the real server

`astro dev` forks a **detached background** dev server and the CLI process exits. It exposes `astro dev stop`, `astro dev status`, `astro dev logs [--follow]`, a `--background` flag and a lock file (`--ignore-lock`).

Measured directly:

| Action | Port 4331 afterwards | `astro dev status` |
|---|---|---|
| `kill $!` on the CLI (the plan's teardown) | **still LISTEN, pid 64110** | "Dev server running ... (background)" |
| `astro dev stop` | free | "No dev server is running." |

So the plan's `kill "$(cat /tmp/dev4331.pid)"` would have left a live server behind, and its `pgrep -f 'astro dev'` orphan check would have reported the *wrong* process anyway (see deviation 3). Replaced with `--background` + `astro dev stop`, and the orphan check scoped to port 4331 plus astro's own daemon registry.

**02-05 and 02-07 must not use `kill $!` on `astro dev`.** Whether `astro preview` behaves the same way was not tested here — under this adapter it is a different code path (`wrangler dev` against `dist/`), so 02-05 should measure it rather than infer from this.

### 5. A dev server started immediately after `npm run build` fails its first start — reproducibly

Observed three times, always in the same position: `npm run build`, then `astro dev`, then `Dev server process exited before becoming ready.` A second start immediately afterwards succeeds in ~3s.

The first hypothesis — cold Vite cache — is **wrong** and was falsified: with `.astro` wiped and no preceding build, the first start succeeds in 3s.

Root cause, from the daemon's own log at `.astro/dev.log` (the supervisor's stdout shows only the one-line "exited before becoming ready", which is why this was invisible at first):

```
Re-optimizing dependencies because vite config has changed
optimized dependencies changed. reloading
[vite] program reload
The file does not exist at ".../node_modules/.vite/deps_ssr/route-cache-V-5MB2pf.js?v=ef21eeb1"
which is in the optimize deps directory. The dependency might be incompatible with the dep optimizer.
  at runInRunnerObject (workers/runner-worker/index.js:107:3)
```

`astro build` and `astro dev` share the dep-optimizer cache at `node_modules/.vite/deps_ssr`. The build leaves it keyed to the build config; the dev server detects the change, re-optimizes and reloads, and the `@cloudflare/vite-plugin` **workerd runner** then resolves a pre-reload hashed dep file that no longer exists. The runner throws, the process exits, the supervisor reports readiness failure. The retry succeeds because the cache is now consistent.

**Consequence for 02-05 and 02-07:** any harness that builds and then starts a server in the same workspace must retry the first start (or pre-warm), and must read `.astro/dev.log` for diagnosis — the supervisor's stdout is not enough. The accommodation used here is a single retry, which has succeeded on every occurrence.

### 6. FND-04 is still not live after this plan, and it is a plan-ownership fact rather than an oversight

02-03's summary predicted this plan would create `src/lib/access.ts` and thereby activate `validateSecrets`. **It does not.** 02-04's `files_modified` is exactly four files, none of them `access.ts`; **`src/lib/access.ts` is listed in 02-07's `files_modified`** (wave 4). Creating it here would have collided with a sibling plan's ownership and could have polluted the TDD-red state 02-07 needs.

Measured both ways, with `dist/` and `.astro/` wiped per case and all three secret sources cleared (`.env`, `.dev.vars`, `process.env`):

| Case | Build result |
|---|---|
| current `src/` (nothing imports `astro:env/server`), all three sources cleared | **PASSES** — the gate is still dormant |
| one temporary module importing `astro:env/server`, same conditions | **FAILS**: `[EnvInvalidVariables] CF_ACCESS_TEAM_DOMAIN is missing / CF_ACCESS_AUD is missing` |

`grep -rn 'astro:env' src/` returns nothing. So 02-03's finding 1 is re-confirmed exactly, the configuration remains correct and complete, and **FND-04 activates in wave 4 the moment 02-07's `src/lib/access.ts` imports `astro:env/server`.** Both temporary files were deleted and the tree verified clean.

**02-06 must not schedule its missing-secret negative control before 02-07's module exists**, or it will assert against a build that legitimately passes.

## Known Stubs

All three surfaces are intentional stubs. Each carries a `TODO(02-07)` marker naming the plan that replaces it. None of them is a fail-open path: every one refuses unconditionally.

| Stub | File | Behaviour today | Resolved by |
|---|---|---|---|
| `/admin` | `src/pages/admin/index.astro:32` | 503 text/plain, renders no UI | 02-07 (middleware + `requireAccess()`), Phase 7 (the actual admin) |
| `/api/health` | `src/pages/api/health.ts:35` | 503 JSON after a real R2 round trip | 02-07 (401 unauthenticated / 200 verified) |
| `/_actions/ping` | `src/actions/index.ts:26` | throws `ActionError SERVICE_UNAVAILABLE` → 503 | 02-07 (401 unauthenticated / `{ pong: true }` verified) |

503 rather than 401 is required, not incidental: 02-07 must be able to write a genuinely failing test asserting 401, and a stub already answering 401 would satisfy that test with no auth code behind it.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: csrf-not-covered | `src/actions/index.ts` | Astro's `security.checkOrigin` does not treat `content-type: application/json` as form-like, so it never blocks a cross-origin JSON POST to `/_actions/*` (finding 2). The threat register's T-02-15 mitigation for this prefix rests entirely on the Access JWT check that 02-07 adds; no framework CSRF protection backs it up. |

## Decisions Made

- **`ping` throws 503 instead of returning a constant object.** The plan's `<action>` prose says "returns a small constant object", but its own `<done>` ("all three paths return 503 and none returns 2xx"), its `<objective>` ("every one of the three routes returns 503") and its `<verification>` all require a refusal. Resolved toward the security constraint. The eventual contract is preserved as a declared type (`type PingResult = { pong: true }`) with the handler annotated `(): PingResult`, so 02-07 can see the shape it must return without the stub ever producing it.
- **`src/lib/access.ts` deliberately not created** — see finding 6. FND-04 is explicitly *not* claimed in `requirements-completed`.
- **`prerender = false` on line 3 of `health.ts`**, after `import type { APIRoute }` and the r2 import. The plan permits imports to precede it, the gate checks for a top-level declaration rather than a line number, and it remains within the stated "first three lines". Verified Biome does not reorder it (`npm run check` clean).
- **The `@/` tsconfig alias is used for the r2 import**, exercising the path mapping 02-03 configured rather than leaving it unproven. `astro check`: 0 errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's `dist/` assertions could never fire**
- **Found during:** Task 2
- **Issue:** `test -d dist/api`, `dist/admin`, `dist/_actions`, `dist/admin.html` all assert against paths that cannot exist with an adapter attached; the build emits `dist/client` + `dist/server`. Every assertion passed vacuously.
- **Fix:** Resolve the effective assets root from `dist/server/wrangler.json` (`assets.directory: "../client"`) and assert against that, plus a `find ... -name 'health*'` catch for extensionless artifacts. The plan's original four assertions were kept underneath, unchanged.
- **Verification:** Planted a prerendered `src/pages/api/tmp-prerender-probe.ts`; the corrected assertion CAUGHT it at `dist/client/api/tmp-prerender-probe`, the plan's original MISSED it. Fixture deleted, clean rebuild confirmed absent.
- **Committed in:** verification tooling only; no repo file changed.

**2. [Rule 3 - Blocking] `astro dev` teardown orphans the server**
- **Found during:** Task 2
- **Issue:** Astro 7's `astro dev` is a daemon supervisor. `kill "$(cat pid)"` kills the CLI and leaves the real server listening (measured: pid 64110 still held :4331).
- **Fix:** `npx astro dev --port 4331 --background`, poll, `npx astro dev stop`, with an `EXIT` trap so a watchdog kill cannot orphan it. A single retry was added for the post-build first-start failure (finding 5).
- **Verification:** After the run, port 4331 free and `astro dev status` reports "No dev server is running."

**3. [Rule 3 - Blocking] The orphan check would have failed on someone else's server**
- **Found during:** Task 2
- **Issue:** `pgrep -f 'astro dev'` matches the user's `.playground` review server (pids 10228/10247), which is explicitly out of scope and must be left running. The assertion would have failed for a reason unrelated to this plan.
- **Fix:** Scoped the orphan check to `lsof -ti :4331` plus `astro dev status`, i.e. only the server this plan started.
- **Verification:** `.playground` server confirmed still running at the end of every experiment.

**4. [Rule 1 - Bug] An assertion I added false-positived on a comment**
- **Found during:** Task 2
- **Issue:** A `grep -n '\.playground'` guard I added matched the words ".playground/" inside an explanatory comment in `admin/index.astro`.
- **Fix:** Strip comments first and match only `import`/`from`/`require` forms.
- **Verification:** Re-ran; passes on the real files, and the guard still fires on a planted import.

### Reported, NOT fixed

**5. FND-04's build gate is still dormant** — `src/lib/access.ts` belongs to 02-07, not to this plan (finding 6). Measured, not assumed: build passes with all three secret sources cleared; fails with `[EnvInvalidVariables]` the moment a one-line importer is planted. Not listed in `requirements-completed`. Handed to 02-07 (creates the importer) and 02-06 (must sequence its negative control after 02-07).

---

**Total deviations:** 4 auto-fixed (2× Rule 1, 2× Rule 3), 1 reported-not-fixed.
**Impact on plan:** No scope creep — the four `files_modified` are exactly the four files created, and no other repo file changed. Three of the four auto-fixes are corrections to verification that would otherwise have passed vacuously or failed for the wrong reason.

## Issues Encountered

- **Post-build dev server start failure** (finding 5). Cost three attempts to characterise; falsified the obvious cold-cache hypothesis before finding the real cause in `.astro/dev.log`.
- **The supervisor hides the crash.** `astro dev`'s stdout carries only `{"message":"Dev server process exited before becoming ready."}`. The actual stack trace lives in `.astro/dev.log`, and `astro dev logs` only reads a *running* daemon — so on a failed start it unhelpfully answers "No dev server is running." Read the file directly.
- **All experiments were trap-guarded.** Every reversible experiment (planted fixture, planted `astro:env` importer, removed `.env`/`.dev.vars`, mutation tests) restored on `EXIT`, so a watchdog kill could not have left the tree dirty. `.env` and `.dev.vars` were byte-compared against their backups afterwards.

## Verification Results

| Check | Result |
|---|---|
| `src/lib/r2.ts` imports `env` from `cloudflare:workers` | pass |
| no truthiness check / `?.` / `??` / `\|\|` / try-catch / null return near the binding | pass — mutation-tested, 10/10 planted violations caught |
| `src/pages/api/health.ts` declares `prerender = false` in its first three lines | pass (line 3) |
| `health.ts` calls `getPortfolioBucket().list({ limit: 1 })`, unwrapped | pass |
| `TODO(02-07)` markers present on all three stubs | pass |
| `src/pages/admin/index.astro` declares `prerender = false` | pass |
| no design-system import, no `.playground` import in any new file | pass |
| `src/actions/index.ts` exports `server` with a `ping` action | pass |
| `npm run check` (Biome + Prettier) | pass |
| `npm run build` / `astro check` | pass — 0 errors, 0 warnings, 0 hints |
| **`dist/client/{api,admin,_actions}` and `admin.html` absent after build** | **pass — and proven non-vacuous with a planted prerendered route** |
| no `health*` artifact in the public asset bundle | pass |
| generated deploy config has a `main` (Worker entry exists) | pass — `main: entry.mjs` |
| `wrangler deploy --dry-run` | pass — 23 modules, 12 assets from `dist/client`, R2 + ASSETS bindings resolved |
| `GET /admin` under `astro dev` | **503** |
| `GET /api/health` under `astro dev` | **503** |
| `POST /_actions/ping` under `astro dev` | **503** |
| no 2xx from any of the three | pass |
| `/api/health` body contains `"r2":"reachable"` | **pass — FND-03 proven on real workerd** |
| no orphan process on port 4331; astro daemon registry empty | pass |
| user's `.playground` dev server left running | pass |
| `git diff --quiet package.json` | pass |
| `worker-configuration.d.ts` unmodified | pass |
| `.playground/` untouched | pass |
| **build fails with Access secrets absent** | **not yet — cause re-confirmed and owned by 02-07 (finding 6)** |

## Requirements

- **FND-02** — met. All three protected surfaces are on-demand and provably absent from the bundle Static Assets serve, verified against the *resolved* assets root rather than an assumed path.
- **FND-03** — met. `env.PORTFOLIO_BUCKET` resolved from `cloudflare:workers` under real `workerd` and a live `.list({ limit: 1 })` round trip succeeded, through a code path containing no absence-guard (mutation-tested).
- **AUTH-03** — unchanged from 02-03 at the configuration level; `run_worker_first` now additionally survives into a deploy config that has a Worker to apply it to.
- **FND-04** — still **not** met, deliberately. See finding 6. Not claimed.

## Next Phase Readiness

Ready. The surface auth must protect now exists, refuses everything, and is deployable in principle.

Four things wave 4 must not rediscover:

1. **02-06** — the prerendered-route gate must resolve the assets root from `dist/server/wrangler.json`, match extensionless artifacts, and be proven with a planted violation. A gate written against `dist/api` is a no-op. Its missing-secret negative control must be sequenced **after** 02-07's `src/lib/access.ts` exists.
2. **02-07** — `src/lib/access.ts` is yours and it activates FND-04 the moment it imports `astro:env/server`. Astro's CSRF check does not cover `/_actions/*` JSON POSTs, so the JWT check carries that prefix alone. Swapping each stub's 503 for 401 is a one-word change in all three files (`ActionError` code `UNAUTHORIZED` maps to 401).
3. **02-05** — do not `kill $!` an `astro dev`; use `--background` + `astro dev stop`. Retry the first server start after a build, and read `.astro/dev.log` on failure. Whether `astro preview` shares the behaviour is untested.
4. **02-09** — `wrangler deploy --dry-run` passes now; the `.wrangler/deploy/config.json` redirect 02-03 flagged is confirmed present and pointing at `dist/server/wrangler.json` with `assets.directory: "../client"`.

---
*Phase: 02-astro-foundation-fail-closed-auth*
*Completed: 2026-08-19*

## Self-Check: PASSED

- All 4 claimed created files exist on disk (`src/lib/r2.ts`, `src/pages/api/health.ts`, `src/pages/admin/index.astro`, `src/actions/index.ts`), and no file outside the plan's `files_modified` was created or changed.
- Both claimed commits resolve in `git log`: `7a26fca`, `da2d1f7`.
- All four `must_haves.artifacts` satisfy their contracts: `r2.ts` 31 lines ≥ 8 and contains `cloudflare:workers`; `admin/index.astro` and `health.ts` both contain `prerender = false` as uncommented top-level declarations; `actions/index.ts` exports `server`.
- Both `key_links` match: `health.ts` → `getPortfolioBucket` → a real `.list({ limit: 1 })`; `r2.ts` → `from 'cloudflare:workers'`.
- All four `must_haves.truths` clean-pass, with the second strengthened rather than weakened: "none of the three appears as a static file in `dist/`" is asserted against the *resolved* Static Assets root (`dist/client`) and proven non-vacuous by a planted violation, because the literal `dist/` form could never have failed.
- Every cited line number was re-checked against the files; one was corrected (`health.ts:36` → `health.ts:35`).
- Working tree clean apart from files owned by other agents (`.planning/config.json`, the sibling's `06.1-*` phase directory).
