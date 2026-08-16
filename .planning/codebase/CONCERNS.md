# Codebase Concerns

**Analysis Date:** 2026-08-16

**Context:** This Next.js 15 app is being deliberately replaced by a new Astro + React
islands app (legacy code preserved on branch `legacy/nextjs-portfolio`). The items
below are filtered for that context: "this is old Next.js" is *not* a concern here.
What matters is which specific bugs, security gaps, and fragile patterns would
**repeat in the rebuild** if not explicitly fixed, versus what simply **dies with
the legacy app**. Every item below states this explicitly.

## Security

### Auth fallback in `requireAccess()` is a soft boundary, not a hard one

- Risk: `src/lib/access.ts:38-61` — when `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`
  are **not both set**, `requireAccess()` falls back to checking only that a
  `CF_Authorization=` substring exists in the `Cookie` header (line 58-59). It
  never validates the cookie's signature, expiry, or audience — any request that
  merely presents a cookie *named* `CF_Authorization` (with any value) passes.
  The code comments (lines 15-16, 56-57) are honest about this: "Not a security
  boundary on its own," relying entirely on Cloudflare Access gating the route at
  the edge first.
- Files: `src/lib/access.ts:38-61`; every mutating route calls it
  (`src/app/api/data/route.ts:8`, `deploy/route.ts:30`, `dispatch/route.ts:25`,
  `upload/route.ts:11`, `upload-asset/route.ts:19`, `upload-resume/route.ts:10`).
- Current mitigation: strict JWT verification (`jwtVerify` against Cloudflare's
  JWKS, `src/lib/access.ts:42-53`) activates automatically once both env vars are
  configured in the Pages dashboard. This repo has **no way to confirm those vars
  are actually set in production** — env vars live in the Cloudflare dashboard,
  not in the repo. If they were never set (e.g. forgotten during setup), every
  write endpoint's only real defense is Cloudflare Access at the edge; the in-code
  gate is a no-op that just checks a cookie name exists.
- Recommendation: verify `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` are set in the
  Cloudflare Pages dashboard today, independent of any rebuild. **Must be
  addressed in the rebuild**: port `requireAccess()` as strict-only (no
  cookie-presence fallback), or fail closed (401) instead of falling back when
  the JWT env vars are absent, so a misconfiguration can never silently degrade
  to the weaker check.

### `dangerouslySetInnerHTML` on user-editable resume bullets — stored XSS surface

- Risk: resume "bullet" strings are rendered as raw HTML with no sanitization
  anywhere in the pipeline, on **both** the public resume page and inside the
  admin editor:
  - `src/components/Timeline.tsx:48` — public `/resume` page, one `<li>` per
    bullet, `dangerouslySetInnerHTML={{ __html: bullet }}`.
  - `src/app/admin/page.tsx:602`, `src/components/admin/ExperienceEditor.tsx:266`,
    `src/components/admin/PropertiesPanel.tsx:175` — admin preview panes, same
    pattern.
  - No `DOMPurify` or any sanitizer is present in the codebase (`grep -r
    sanitize|DOMPurify src/` returns nothing) or in `package.json`.
  - Bullets are stored as free-text strings in `data/resume.json`, editable via
    a plain textarea (`src/components/admin/ExperienceEditor.tsx:70,90-92`) — an
    admin can (and does, to get bold text) type raw HTML tags directly.
- Impact: `data/resume.json` is written by `/api/deploy` (`src/app/api/deploy/route.ts`)
  which validates only that file paths are under `data/` (line 55-62) — it does
  **not** validate JSON content/shape. Anyone who can get a commit into
  `data/resume.json` (compromised admin session, leaked `GITHUB_PAT`, or a
  weakened `requireAccess()` per the item above) can inject `<img
  src=x onerror=...>` or `<script>`-adjacent markup that executes for every
  visitor of the public resume page. This is the highest-impact finding in this
  audit because it turns a single credential compromise into full script
  execution on the live site, not just an admin-panel-only issue.
- **Must be addressed in the rebuild.** Either sanitize with a real HTML
  sanitizer (DOMPurify or equivalent) before rendering, or replace free-text
  HTML bullets with a constrained rich-text format (e.g. markdown restricted to
  bold/italic, or a `{text, bold}[]` structure) that never reaches
  `dangerouslySetInnerHTML`.

### CSRF exposure on `multipart/form-data` routes depends entirely on Cloudflare's cookie settings, which this app doesn't control

- Risk: `src/app/api/upload/route.ts`, `upload-asset/route.ts`, and
  `upload-resume/route.ts` all parse `request.formData()` — a "simple" content
  type (`multipart/form-data`) that browsers send **without a CORS preflight**.
  If `requireAccess()` is running in cookie-fallback mode (see first item), the
  only thing standing between an attacker's page auto-submitting a hidden form
  to these endpoints and a successful forged upload/commit is whatever
  `SameSite` attribute Cloudflare Access sets on `CF_Authorization` — a setting
  this app has zero visibility into or control over from the code.
  `src/app/api/deploy/route.ts` and `dispatch/route.ts` are safer by accident:
  they require `Content-Type: application/json`, which **does** force a
  preflight, and since no route defines an `OPTIONS` handler or CORS headers,
  cross-origin JSON POSTs are blocked by the browser before they reach the
  server.
- Files: `src/app/api/upload/route.ts:14`, `upload-asset/route.ts:31`,
  `upload-resume/route.ts:14`.
- **Must be addressed in the rebuild** only insofar as strict JWT verification
  (item 1) is adopted — a signature-verified header-based check removes this
  dependency on cookie SameSite behavior entirely. If the rebuild keeps a
  cookie-based fallback, prefer `application/json` bodies (base64-encode file
  contents) over `multipart/form-data` for any mutating endpoint, specifically
  to keep the preflight requirement as a defense layer.

### SVG uploads accepted for site assets — latent stored-XSS if ever rendered inline

- Risk: `src/app/api/upload-asset/route.ts:15` allows `.svg` uploads to
  `logos/` or `icons/`. SVG can carry `<script>`/event-handler payloads that
  execute if ever loaded via `<object>`/`<iframe>`/direct navigation instead of
  `<img>`. Currently low real-world risk (single trusted admin, files are
  presumably rendered via `<img>`/`next/image` which doesn't execute embedded
  scripts), and this endpoint has no caller in the current UI (see Dead Code
  section) — but worth being deliberate about if the rebuild wires this back up.
- **Low priority for rebuild**: if re-enabling asset upload, either strip SVGs
  to a sanitized subset on upload or drop SVG from `ALLOWED_PATH` and require a
  raster format for anything not baked in at build time.

### `/api/track` is public by design — confirm that's the only public route and it stays inert

- `src/app/api/track/route.ts` intentionally skips `requireAccess()` (no call to
  it at all, unlike every other route) — this matches the documented design
  ("Cloudflare Access gates `/admin` and all `/api/*` except `/api/track`" in
  `AGENTS.md`). It validates `photoId` is a string ≤256 chars (line 17) before
  writing to the Analytics Engine binding, and is wrapped in try/catch so
  failures never surface (lines 24-33, 36-38).
- Residual risk: no rate limiting or origin check, so it can be spammed with
  arbitrary `photoId` strings, polluting the `photo_views` analytics dataset.
  No PII, no injection risk (blobs aren't rendered as HTML anywhere) — impact is
  limited to noisy analytics.
- **Low priority; dies with legacy app** unless the rebuild keeps per-photo view
  tracking, in which case add basic rate limiting (e.g. Cloudflare Turnstile or
  a simple IP-based throttle) before carrying this forward.

### `GITHUB_PAT` is a single shared, ambiently-trusted credential across every route

- Every mutating route (`data`, `deploy`, `dispatch`, `upload`, `upload-resume`)
  reads the same `process.env.GITHUB_PAT` and uses it for direct GitHub Contents
  API / Git Data API / Actions dispatch calls. There's no per-route scoping,
  no request signing, and the routes forward raw GitHub error bodies in early
  history (already partially fixed — see Fixed-But-Adjacent section below).
- This repo cannot verify the PAT's actual scope (classic vs. fine-grained,
  single-repo vs. account-wide) since it's a dashboard secret, not committed.
- **Recommendation, carries to rebuild:** use a fine-grained PAT scoped to this
  one repository with only `contents:write` + `actions:write` (no `admin`,
  no other repos). Verify this today regardless of the rebuild timeline.

## Known Bugs

### `baseSha: "latest"` permanently disables the optimistic-concurrency guard — silent data loss on save

- Symptoms: the admin's "Save & Deploy" action can silently overwrite newer
  data that was committed to `data/*.json` after the admin's current browser
  session was built/loaded (e.g. a photo processed by the GitHub Action
  pipeline after the admin last loaded), because the admin unconditionally
  sends the sentinel `baseSha: "latest"`.
- Files: `src/components/admin/DeployButton.tsx:86` (hardcoded `baseSha:
  "latest"`); `src/app/api/deploy/route.ts:87-102` — the conflict check
  (`if (baseSha !== "latest" && currentSha !== baseSha)`) is explicitly bypassed
  whenever `baseSha === "latest"`, which is always, today.
- Root cause: `src/app/admin/page.tsx:34-37` imports `data/*.json` directly at
  **build time** (`import portfolioData from "../../../data/portfolio_images.json"`)
  rather than fetching current GitHub HEAD content via `GET /api/data` on mount.
  So the admin's "initial" baseline is whatever was committed at the last
  Cloudflare Pages build, not the live HEAD — there is no `baseSha` value the
  client could send that would be meaningful, which is presumably *why* the
  bypass sentinel exists.
- This is **self-documented in the code itself**:
  `src/app/api/deploy/route.ts:87-92` says verbatim: *"The current admin sends
  'latest', which BYPASSES this guard and can silently clobber newer data —
  the rebuilt admin must load /api/data on mount, seed its editor state from
  it, and pass that commitSha as baseSha (then this 'latest' escape hatch can
  be removed)."*
- Trigger: (1) admin uploads a photo via `/api/upload` → GitHub Action processes
  it and commits an updated `portfolio_images.json` to `main`; (2) without
  reloading the (stale, build-time-snapshotted) `/admin` page, the operator
  makes an unrelated edit (e.g. reorders photos) and hits "Save & Deploy"; (3)
  the resulting commit is built from the operator's stale in-memory copy, which
  doesn't include the photo the Action just added — that photo's manifest entry
  is silently dropped from the next commit even though the processed images
  still exist in R2.
- **Must be addressed in the rebuild.** This is explicitly flagged as a
  known-and-deferred fix by the previous developer; the fix path is already
  written down in the code comment above. Do not re-introduce a "latest"-style
  escape hatch in the new admin.

## Fragility

### Photo pipeline has no atomicity between R2 upload, JSON manifest write, and git commit

- Files: `scripts/action-process.js:9-97`, `scripts/action-process-dispatch.js`,
  `scripts/process-images.js:85-167`, `.github/workflows/process-photos.yml`.
- Failure mode (push-trigger path, the one actually in use — see Dead Code
  below): `action-process.js` loops over all files under `new-photos/`,
  calling `processImage()` for each. `processImage()` (`process-images.js:112-138`)
  uploads 4 watermarked variants + 1 clean private variant to R2 **inside the
  loop, per image**, before the loop finishes. Only *after every image in the
  batch succeeds* does the script write the merged manifest once
  (`action-process.js:72`) and delete the now-processed source files
  (`action-process.js:74-76`). The separate "Commit and push" workflow step
  (`.github/workflows/process-photos.yml`, final step) has no `if: always()` /
  `continue-on-error`, so if the script throws on image N of M (network
  hiccup, a corrupt/oversized image, a `sharp` decode failure), the whole job
  fails and that step never runs.
- Consequence: images 1..N-1 in that batch already have real objects sitting
  under `photos/{category}/...` and `private/{category}/...-clean.webp` in R2,
  but since the manifest write never happened and the commit step never ran,
  `data/portfolio_images.json` has **no reference to them** — permanently
  orphaned R2 storage (no lifecycle/TTL policy found anywhere in the repo for
  the `photos/`, `private/`, or `temp/` prefixes). The source files for those
  same images remain committed under `new-photos/` (never deleted, since
  deletion happens after the failed write), so the next successful run
  reprocesses them — this part **is** idempotent because R2 keys are
  deterministic (`photos/${category}/${slug}${suffix}.webp`,
  `process-images.js:110`), so a retry simply overwrites the same keys. The
  orphan risk is specifically for the images that succeeded *within a batch
  that ultimately failed on a later image*.
- The `workflow_dispatch` / R2-`temp/` path (`action-process-dispatch.js`) is
  slightly worse on this axis: it downloads from `temp/`, processes, writes the
  manifest, *then* deletes the `temp/` object last (lines 71-80) — if the job
  fails at any point before that final delete (including during the multi-step
  R2 uploads inside `processImage`), the `temp/` object is orphaned with no
  automatic cleanup. **This path is currently dead code** (see below), so the
  risk is theoretical today but is exactly the shape of bug that would resurface
  if the rebuild wires the R2-upload-then-dispatch flow back up.
- **Must be addressed in the rebuild if the R2 + processing pipeline is
  carried forward.** Concrete fixes to carry over: (1) write the manifest
  incrementally per-image (or make the whole batch a single all-or-nothing
  transaction with a rollback that deletes any R2 objects uploaded so far on
  failure), (2) add an R2 lifecycle rule to auto-expire objects under `temp/`
  after e.g. 24h regardless of application-level cleanup, (3) make the "commit
  and push" step run via `if: always()` guarded on whether the manifest file
  actually changed, so partial progress isn't silently lost on a crash later in
  the same job.

### Two competing, only-partially-connected photo-upload flows — one is dead code

- `AGENTS.md` documents the pipeline as: *"admin uploads to R2 (`temp/`) →
  `/api/dispatch` triggers `.github/workflows/process-photos.yml` →
  `scripts/process-images.js`."* That flow exists in code
  (`src/app/api/dispatch/route.ts`, `scripts/action-process-dispatch.js`) but
  **is not called from any UI component** — `grep -rn "api/dispatch"
  src/app src/components` finds only the route file itself, no fetch call.
  Likewise `src/app/api/upload-asset/route.ts` (R2 asset upload for
  logos/icons) has no caller anywhere in `src/`.
- The flow that **is** actually wired up and used
  (`src/app/admin/page.tsx:249`, `handlePhotoUpload`) is `/api/upload`
  (`src/app/api/upload/route.ts`), which base64-encodes the *raw, unprocessed*
  image client→edge→GitHub and commits it directly to `new-photos/` via the
  GitHub Contents API — triggering the **push-based** trigger of
  `process-photos.yml`, not the `workflow_dispatch` one.
- Impact: this is pure documentation/implementation drift, not a live security
  hole (both dead endpoints still call `requireAccess()`), but it means: (a) a
  future maintainer reading `AGENTS.md` will implement against a flow that
  doesn't run, (b) two parallel, subtly-different failure/idempotency
  behaviors exist for "processing a photo" and only one is tested by actual
  usage, (c) uploads always go through the base64-in-JSON-to-GitHub-Contents-API
  path, which is heavier than necessary (see Performance section).
  `src/app/api/upload/route.ts:8` caps this at 25 MB raw, meaning up to
  ~33 MB of base64 JSON body handled synchronously in an edge function per
  upload.
- **Decide explicitly in the rebuild**: either drop the R2-`temp/` +
  `dispatch` + `workflow_dispatch` path entirely (delete
  `src/app/api/dispatch/route.ts`, `scripts/action-process-dispatch.js`, the
  `workflow_dispatch` trigger and `upload-asset` route), or actually wire the
  admin UI to use direct-to-R2 upload + dispatch (which avoids base64
  inflation and the edge function body-size ceiling) and delete the
  GitHub-Contents-API upload path instead. Don't carry both forward.

### No runtime validation gate on `data/*.json` before it reaches the build

- `data/portfolio_images.json`, `resume.json`, `home_config.json`,
  `site_config.json` are imported directly at build time
  (`src/app/portfolio/page.tsx:11-12`, `src/app/admin/page.tsx:34-37`,
  `src/app/resume/page.tsx`) and merely **cast** to a TS interface (e.g.
  `portfolioData as Photo[]`, `src/app/portfolio/page.tsx:17`) — a type
  assertion, not a runtime check. There is no schema library in the dependency
  tree (`zod`, `ajv`, etc. — none present; confirmed via `package.json` and a
  repo-wide grep).
- `POST /api/deploy` (`src/app/api/deploy/route.ts:54-62`) validates only that
  file paths start with `data/`; it does not parse or validate the JSON
  *content* being committed at all before creating the git blob/commit.
- `.github/workflows/ci.yml` runs `npm run lint` + `npm run typecheck` on push
  to `main`, but this runs **after** the admin's direct-to-`main` commit has
  already landed (there's no PR/branch-protection gate in this repo — the
  admin commits straight to `main` via the Git Data API,
  `src/app/api/deploy/route.ts:179-189`), and CI failing doesn't block or
  revert the Cloudflare Pages deploy that's triggered by the same push. If a
  malformed shape happens to still be syntactically valid JSON that satisfies
  the loose TS cast (e.g. wrong `category` string, missing optional field),
  nothing catches it before it's live in production.
- **Must be addressed in the rebuild**: validate `data/*.json` shape (a small
  zod schema per file) at the point of commit (`/api/deploy`-equivalent) and
  reject with a 400 before writing any blob, rather than relying on a
  TS-compile-time cast and a post-hoc, non-blocking CI run.

## Fixed-But-Adjacent (already addressed — noted for awareness, no action needed)

The commits `530783c` ("Harden API routes; fix dead analytics + asset upload")
and `1435ac1` (Next.js CVE bump) already closed several real issues. Recorded
here so the rebuild doesn't reintroduce them:

- A parallel, dead `functions/api/*` directory (Cloudflare Pages Functions
  convention) previously shadowed the real `src/app/api/*` routes and 404'd in
  production — deleted in `530783c`. **Don't add a top-level `functions/`
  directory in the rebuild** if still deploying via `@cloudflare/next-on-pages`
  or an equivalent worker-emitting adapter; this exact trap is easy to
  reintroduce by copy-pasting Cloudflare's generic Pages Functions docs.
  (Already called out in `AGENTS.md`.)
- `upload-asset` was previously a hardcoded 503 stub; now genuinely writes to
  the `PORTFOLIO_BUCKET` R2 binding (`src/app/api/upload-asset/route.ts:49-51`)
  — but per the Dead Code section above, still has no caller.
- Per-photo analytics tracking was a silent no-op (the old `functions/`
  version's binding access never worked from `src/app/api`); re-implemented in
  `src/app/api/track/route.ts:25-33` via `getRequestContext().env`.
- Size/type validation (`upload`, `upload-resume`) and tempKey format
  validation (`dispatch`) were added in the same commit — see
  `src/app/api/upload/route.ts:24-30`, `upload-resume/route.ts:16-33`,
  `dispatch/route.ts:46-48`.
- Raw GitHub error response bodies are still logged server-side via
  `console.error` in three places (`dispatch/route.ts:77`,
  `upload/route.ts:59`, `upload-resume/route.ts:81`) but are **not** returned
  to the client (`NextResponse.json` responses use generic messages) — this is
  fine as-is (server logs aren't client-exposed), just noting the pattern is
  inconsistent with `deploy/route.ts`, which never logs the raw body at all.

## Tech Debt

### Admin editor's local types have already drifted from the canonical data model — self-documented

- `src/types.ts:1-7` states directly: *"the `/admin` editor... still defines
  its own local copies that have drifted from these (e.g. it splits experience
  dates into `startMonth`/`startYear`/... while `resume.json` stores a single
  `period` string). When the admin is rebuilt, point it at these types."*
- Files: `src/app/admin/page.tsx:41-76` defines local `ExperienceEntry`,
  `EducationEntry`, `PortfolioPhoto` interfaces that overlap but don't match
  `src/types.ts`'s `Photo`/`PhotoUrls`/`PhotoExif`. `PortfolioPhoto.urls` (line
  74) only requires `medium`/`thumb` and marks `original` optional, while the
  canonical `PhotoUrls` (`src/types.ts:20-27`) requires all five variants.
- Impact: any code shared between admin and public pages has to work around
  two different shapes for "a photo," and the admin's date-splitting logic
  (`startMonth`/`startYear`/`endMonth`/`endYear`) has to be reassembled into
  the single `period` string `resume.json` actually stores — an extra
  transformation layer that's easy to get subtly wrong (e.g. on save,
  timezone/format mismatches when reconstituting `period`).
- **Must be addressed in the rebuild** — the canonical model already exists
  and is well-documented at `src/types.ts`; point the new admin at it directly
  instead of re-deriving local shapes.

### Dev-only dependency vulnerabilities with no upstream fix

- `npm audit` reports 11 vulnerabilities (7 high, 3 moderate, 1 low), all
  transitive through `wrangler`/`miniflare` (dev tooling: `undici`, `ws`) — none
  reachable in the production bundle since these are devDependencies used for
  local Cloudflare emulation only. No fix currently available upstream.
- **Low priority; carries to rebuild only as "keep monitoring."** Re-run
  `npm audit` after each `wrangler`/`@cloudflare/next-on-pages` bump; not
  actionable today since there's no patched version to move to.

### No test suite

- No `*.test.*`/`*.spec.*` files exist anywhere in `src/` or `scripts/`
  (confirmed via repo-wide glob). All correctness currently rests on
  `npm run lint` + `npm run typecheck` (`.github/workflows/ci.yml`) plus manual
  testing. This is consistent with a small personal-portfolio project and is
  **not** being flagged as debt to fix in the legacy app, but the rebuild
  should decide deliberately whether to add coverage for the highest-risk
  logic identified in this document — particularly `requireAccess()`'s two
  code paths and the `/api/deploy` conflict-detection logic — rather than
  organically ending up untested again by default.

## Performance

### Gallery data model will not scale past current size without changes

- `data/portfolio_images.json` is 57 KB for 39 photos (~1.5 KB/photo average),
  driven mostly by an inline base64 LQIP thumbnail per photo (avg 566 bytes of
  base64, `urls.thumb`, `src/types.ts:26`). This file is imported wholesale,
  synchronously, at build time by three different pages
  (`src/app/portfolio/page.tsx:11`, `src/app/admin/page.tsx:34`,
  presumably `src/app/resume/page.tsx` equivalents) and is also served in full
  by `GET /api/data` (`src/app/api/data/route.ts:24,38`) with no pagination.
- `src/components/MasonryGrid.tsx:24-56` renders every photo in the filtered
  set as a DOM node in one pass — no virtualization/windowing. It does
  mitigate cost somewhat: only the first 8 images request the `medium` variant
  and the rest request `small` (line 38), and only the first 4 are
  `eager`/`priority`-loaded (lines 43-44) with the rest deferred to native
  `loading="lazy"`.
- At 39 photos this is a non-issue. **Worth carrying forward as an explicit
  scaling decision** if the rebuild expects the gallery to grow materially
  (e.g. hundreds of photos): paginate/virtualize the grid, and move LQIP
  thumbnails out of the main manifest (e.g. a separate small
  `thumbnails.json` or embed them in the R2-hosted small variant's metadata)
  so the manifest fetched by the admin and imported at build time doesn't grow
  linearly with photo count.

### Lightbox always requests the full 2000px "original" variant

- `src/components/Lightbox.tsx:152-157` always sets `src={photo.urls.original}`
  regardless of viewport size; `next.config.js` sets `images.unoptimized: true`
  (required for the Cloudflare edge/no Node image-optimizer target), so
  `next/image` cannot generate viewport-appropriate variants at request time —
  the four pre-baked R2 variants (`original`/`large`/`medium`/`small`,
  `scripts/process-images.js:7-13`) are the only sizing lever available, and
  the lightbox doesn't use `large` even though it caps display at `90vw`/`75vh`
  (`Lightbox.tsx:159`). On mobile this downloads a full 2000px-wide image to
  display at a fraction of that size.
- **Worth carrying forward**: have the lightbox pick `large` on
  smaller viewports and `original` only above some breakpoint, or add a
  `<picture>`/manual `srcset` using the existing pre-baked variants, since
  `next/image`'s automatic responsive behavior is disabled by
  `unoptimized: true`.

## Test Coverage Gaps

- What's not tested: everything (no test framework configured — no
  `jest.config.*`/`vitest.config.*`, no test files). Highest-risk untested
  logic given this audit: `requireAccess()` fallback behavior
  (`src/lib/access.ts`), the `/api/deploy` conflict-detection branch
  (`src/app/api/deploy/route.ts:93-102`), and the photo-processing partial-
  failure paths (`scripts/action-process.js`, `scripts/action-process-dispatch.js`).
- Risk: regressions in exactly the areas already flagged as fragile in this
  document (auth, concurrency, pipeline atomicity) would ship silently.
- Priority: Medium — reasonable to defer given this is a low-traffic personal
  site, but if any of the "must fix in rebuild" items above are addressed,
  pair the fix with at least one test that pins the corrected behavior (e.g. a
  test asserting `requireAccess()` returns 401 when JWT env vars are unset and
  no valid JWT is presented, rather than falling through to a cookie check).

---

*Concerns audit: 2026-08-16*
