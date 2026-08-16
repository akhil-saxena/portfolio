# Testing Patterns

**Analysis Date:** 2026-08-16

## Test Framework

**There is no automated test suite in this repository.** This is stated plainly and is a
finding, not an oversight to gloss over:

- No test runner is installed (`package.json` dependencies/devDependencies contain no
  `jest`, `vitest`, `mocha`, `@testing-library/*`, `playwright`, `cypress`, or any other
  test framework).
- No test config files exist (`jest.config.*`, `vitest.config.*`, `playwright.config.*` — all
  absent, confirmed via filesystem search).
- No `test` script in `package.json`. The only scripts are:
  ```json
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit"
  ```
- No `*.test.*` or `*.spec.*` files exist anywhere in the repo (confirmed via recursive
  search of `src/`, `scripts/`, and the repo root).

**Run Commands:** there is nothing to run. `npm test` is not defined.

## De Facto Verification Approach (what actually catches bugs today)

In the absence of tests, correctness is enforced by three layers, none of which are
functional tests:

1. **CI static checks** (`.github/workflows/ci.yml`, on every push to `main` and every PR):
   ```yaml
   - run: npm ci
   - run: npm run lint        # eslint (eslint-config-next core-web-vitals + typescript)
   - run: npm run typecheck   # tsc --noEmit, strict mode
   ```
   This catches type errors, unused-hook-dependency issues, and Next.js best-practice
   violations (e.g. `next/image` misuse) — it catches **nothing** about runtime behavior,
   API response correctness, auth enforcement, or data integrity.

2. **`next build`** — runs at Cloudflare Pages deploy time (not in CI). Fails on TypeScript
   errors and on Next.js's own build-time checks (e.g. invalid route exports). This is the
   only point where the actual production bundle is verified to compile — but it still does
   not exercise any runtime logic (no route handler is ever invoked during a build).

3. **Manual QA against the live/preview deployment** — the only mechanism that actually
   exercises: API route behavior (`/api/deploy`, `/api/dispatch`, `/api/upload*`,
   `/api/data`, `/api/track`), the Cloudflare Access auth boundary, the GitHub commit/webhook
   round-trip, and the photo-processing GitHub Action. None of this is scripted or repeatable
   — it depends on a human clicking through `/admin` after each change.

**Net effect:** a regression in `requireAccess()`, in the GitHub blob/tree/commit sequence in
`src/app/api/deploy/route.ts`, in the optimistic-concurrency (`baseSha`) check, or in the
`scripts/process-images.js` EXIF/watermark/resize pipeline would only be caught by a human
manually re-testing the admin flow end-to-end, or by a live-site bug report. This is the
single most consequential quality gap in the codebase and should be closed early in the
rebuild — it currently isn't a mere gap, it's the entire safety net.

## What Should Be Tested in the Rebuild

Given the architecture (Astro + React islands, same Cloudflare Pages / R2 / GitHub-as-CMS
model per `AGENTS.md`), the highest-leverage test targets, in priority order:

### 1. The auth boundary (`requireAccess()` / its rebuild equivalent)
- Unit test: with `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` set, a request with no
  `Cf-Access-Jwt-Assertion` header → 401; a request with an invalid/expired JWT → 401; a
  request with a valid JWT → passes through (`null` return).
- Unit test: with those env vars **unset**, the cookie-presence fallback branch — no
  `CF_Authorization=` cookie → 401, cookie present → passes.
- This is the entire server-side defense-in-depth for every mutating endpoint
  (`src/lib/access.ts` currently: `data`, `deploy`, `dispatch`, `upload`, `upload-asset`,
  `upload-resume` all call it; `track` intentionally does not). A test suite should assert
  every mutating route actually calls it — e.g. a lint rule or a route-enumeration test that
  fails if a new `route.ts` under `src/app/api/` is added without calling the access guard.
  This closes the exact class of regression the codebase's own CLAUDE/AGENTS notes warn
  about ("aren't a single dashboard toggle away from being open").

### 2. The GitHub commit path (`/api/deploy`, `/api/upload*`)
- The blob → tree → commit → ref-update sequence in `src/app/api/deploy/route.ts` is the
  mechanism by which **all** content edits reach production. It currently has zero test
  coverage. At minimum:
  - Mock `fetch` to `api.github.com` and verify the request bodies sent at each step (blob
    content/encoding, tree `base_tree`, commit `parents`, ref `sha`) match GitHub's Git Data
    API contract.
  - Test the optimistic-concurrency branch: stale `baseSha` (mismatched `currentSha`) → 409
    with `{ error: "conflict", currentSha }`; matching `baseSha` → proceeds; the `"latest"`
    bypass value → proceeds unconditionally (and should be removed once the admin correctly
    threads `commitSha` from `/api/data`, per the in-code TODO comment in `deploy/route.ts`).
  - Test the "all paths must be under `data/`" guard rejects path traversal / arbitrary
    paths (`../`, absolute paths, non-`data/` prefixes).
  - Test partial-failure handling: what happens if blob creation succeeds for file 1 but
    fails for file 2 in `Promise.all` (currently throws inside the map, caught by the outer
    try/catch, returns generic 500 — no rollback of already-created blobs, though orphaned
    unreferenced blobs are harmless in git's object model since nothing points to them).
- `/api/upload` (photo → `new-photos/<category>/<name>.<ext>` commit) and `/api/upload-resume`
  (PDF magic-byte check + get-SHA-then-PUT) share this GitHub-write pattern and deserve the
  same mocked-fetch treatment, particularly the file-type/size validation branches (extension
  allowlist, magic-byte check, `MAX_BYTES`).

### 3. The photo pipeline (`scripts/process-images.js` + the dispatch flow)
- `scripts/process-images.js` (sharp resize to 4 variants + watermark + exifr EXIF
  extraction) is pure Node/CommonJS and the most testable, script-shaped piece of the whole
  system — yet has no tests. Test with fixture images:
  - Each variant (`""`, `-lg`, `-md`, `-sm`) is produced at the expected max width/quality.
  - The 40px blur placeholder (`THUMB_WIDTH`/`THUMB_QUALITY`) generates a valid base64 data URI.
  - `extractExif()` returns `null` (not throws) for images with no/corrupt EXIF data — this
    is already guarded with try/catch in the source, a regression test would lock in that
    guarantee.
  - `slugify()`/`titleCase()` produce the expected filenames/titles for edge-case inputs
    (unicode, multiple spaces, leading digits).
- `src/app/api/dispatch/route.ts`'s polling loop (up to `maxAttempts=10` × `pollIntervalMs=
  2000` waiting for a `workflow_dispatch` run to appear) is currently untested and has no
  visible unit test seam (real `setTimeout`, real `fetch`) — in the rebuild, inject a clock/
  fetch so this loop's timeout (504) and success paths can be tested without waiting 20
  real seconds.

### 4. Data-shape integrity (see also CONVENTIONS.md — "Data Validation" finding)
- There is currently no schema validation on `data/*.json` at all. A rebuild test suite
  should assert `data/portfolio_images.json`, `data/resume.json`, `data/home_config.json`,
  and `data/site_config.json` conform to their `src/types.ts` (or successor schema) shapes —
  ideally via a shared zod schema used by both the validator and the type system, tested
  with both valid fixtures and known-bad shapes (missing required field, wrong type).
- The known type drift between `src/types.ts` and the admin editor's local interfaces
  (documented in a comment at the top of `src/types.ts`) is exactly the kind of bug a
  snapshot/contract test between "what the editor produces" and "what the public pages
  expect" would catch immediately.

### 5. Cloudflare-binding local-dev guards
- `src/app/api/track/route.ts`'s inner try/catch around `getRequestContext().env` (swallows
  binding-unavailable errors so tracking never 500s) should have a regression test asserting
  the route returns `{ ok: true }` even when `getRequestContext` throws.
- `src/app/api/upload-asset/route.ts` does NOT wrap its `getRequestContext()` call — under
  plain `next dev` this throws unhandled rather than hitting the "Storage not configured"
  500 branch. A test exercising this route without a Cloudflare context would immediately
  surface this gap (see CONCERNS.md / CONVENTIONS.md for the fix recommendation).

## Suggested Framework for the Rebuild

Given Astro + React islands + edge runtime API routes: **Vitest** (fast, ESM-native, works
well with Astro's Vite-based tooling) for unit/integration tests of route handlers, `src/lib/`
utilities, and the image-processing script; **`@testing-library/react`** for the interactive
islands (lightbox, search/filter, admin drag-and-drop); a lightweight **contract/fixture
test** for `data/*.json` shape validation; and (optional, lower priority given the site's
size) **Playwright** for a small number of true end-to-end smoke tests covering the
`/admin` → GitHub commit → rebuild loop against a sandboxed test repo, since that flow is
both the riskiest (writes to production content) and the only one manual QA currently
covers.

## Coverage

**Requirements:** None — there is no coverage tool configured and nothing to measure.

## Test Types (current state)

**Unit Tests:** None.

**Integration Tests:** None.

**E2E Tests:** None. All "testing" of the admin → GitHub → Pages rebuild → live site loop
is manual, performed by the maintainer after deploying.

---

*Testing analysis: 2026-08-16*
