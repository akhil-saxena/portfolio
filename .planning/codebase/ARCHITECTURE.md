<!-- refreshed: 2026-08-16 -->
# Architecture

**Analysis Date:** 2026-08-16

**Context:** This is the CURRENT Next.js 15 (App Router) + React 19 app, deployed to Cloudflare Pages via `@cloudflare/next-on-pages`. It is being replaced by an Astro + React islands app. This document emphasizes the parts that must be PORTED: the content-publishing data flow, the photo pipeline, the `/admin` editor architecture, and the build-time data-import boundary. Public-page component trees and Next-specific layout/metadata plumbing are covered lightly since they are being discarded.

## System Overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                         BROWSER — /admin (client component)               │
│  `src/app/admin/page.tsx` — single "use client" page, WYSIWYG editor      │
│  holds ALL editable state (photos, resume, home config, site config)      │
│  in useState; imports data/*.json directly as INITIAL state at build time │
├───────────────────┬───────────────────────────┬───────────────────────────┤
│  AdminTopBar       │  Inline editable regions  │  PropertiesPanel          │
│  (tabs + Deploy)   │  (click-to-select overlay │  (right-rail form editor, │
│  `components/      │  on the real page markup, │  one branch per          │
│   admin/           │  reused CSS from public   │  Selection.type)          │
│   AdminTopBar.tsx` │  pages)                   │  `components/admin/       │
│                    │                           │   PropertiesPanel.tsx`   │
└─────────┬──────────┴─────────────┬─────────────┴──────────┬────────────────┘
          │                        │                        │
          ▼                        ▼                        ▼
 ┌─────────────────┐    ┌────────────────────┐   ┌──────────────────────────┐
 │ DeployButton     │    │ PhotoUploadZone    │   │ DraggableMasonry         │
 │ diffs edited     │    │ POST /api/upload   │   │ (pragmatic-drag-and-drop │
 │ state vs initial │    │ (commits image to  │   │  reorder within grid)   │
 │ *.json, POSTs    │    │  new-photos/ →     │   └──────────────────────────┘
 │ changed files    │    │  triggers push-     │
 └────────┬─────────┘    │  based workflow)   │
          │              └──────────┬─────────┘
          │                         │
          ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    EDGE API ROUTES (single _worker.js)                    │
│  `src/app/api/*/route.ts` — every route `export const runtime = "edge"`   │
├───────────────┬───────────────┬───────────────┬───────────────┬───────────┤
│ /api/data     │ /api/deploy   │ /api/dispatch │ /api/upload*  │ /api/track│
│ GET current   │ POST commits  │ POST triggers │ POST photo/   │ POST      │
│ data/*.json + │ data/*.json   │ workflow_     │ resume/asset  │ Analytics │
│ HEAD sha      │ via Git Data  │ dispatch for  │ upload        │ Engine    │
│ (from GitHub  │ API (blob→    │ process-      │               │ write     │
│ Contents API) │ tree→commit→  │ photos.yml    │               │ (public,  │
│               │ ref update)   │               │               │ no auth)  │
└───────┬───────┴───────┬───────┴───────┬───────┴───────┬───────┴───────────┘
        │               │               │               │
        │  requireAccess() gate (all except /api/track) — `src/lib/access.ts`
        ▼               ▼               ▼               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    GITHUB (Contents/Git Data API + Actions)               │
│  Commits land on `main` → Cloudflare Pages build hook fires               │
│  `process-photos.yml` (workflow_dispatch OR push to new-photos/**)        │
│  runs `scripts/action-process-dispatch.js` / `action-process.js`          │
│  → `scripts/process-images.js` (sharp resize 4 variants + watermark,      │
│    exifr EXIF read, upload to R2) → commits updated                       │
│    data/portfolio_images.json + processed files back to `main`            │
└───────────────────────────┬───────────────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│         CLOUDFLARE PAGES BUILD (next-on-pages) — `next build`             │
│  Public pages import `data/*.json` directly (build-time, not runtime)     │
│  `src/app/page.tsx`, `src/app/portfolio/page.tsx`, `src/app/resume/       │
│   page.tsx` → emitted into a single `_worker.js` in                       │
│   `.vercel/output/static` per `wrangler.toml`                             │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| AdminPage | Owns ALL admin state (photos, resume, home/site config, selection, dirty tracking); renders 3 tabs (home/photography/dev) reusing public-page markup with click-to-edit overlays | `src/app/admin/page.tsx` |
| AdminTopBar | Tab switcher + hosts ThemeToggle and DeployButton | `src/components/admin/AdminTopBar.tsx` |
| DeployButton | Diffs current vs. initial JSON, POSTs only changed files to `/api/deploy`, shows commit/build log modal | `src/components/admin/DeployButton.tsx` |
| PropertiesPanel | Right-rail form editor; one JSX branch per `Selection` union variant (photo, role, project, skillGroup, education, homeTitle/Subtitle/Intro/Gallery/Social/Cta, resume); this IS the form-field catalog to port to a design system | `src/components/admin/PropertiesPanel.tsx` |
| DraggableMasonry | Drag-to-reorder grid used inside the admin photography tab (uses `@atlaskit/pragmatic-drag-and-drop`, distinct DnD lib from PropertiesPanel's bullet reordering) | `src/components/admin/DraggableMasonry.tsx` |
| PhotoUploadZone | Drag/drop or file-picker upload form (title, category, tags) feeding `onPhotoUpload` → `/api/upload` | `src/components/admin/PhotoUploadZone.tsx` |
| requireAccess | Server-side Cloudflare Access JWT verification (defense-in-depth behind edge Access) | `src/lib/access.ts` |
| toBase64 | Chunked ArrayBuffer→base64 for GitHub Contents API file bodies | `src/lib/base64.ts` |
| process-images.js | Core image pipeline: sharp resize to 4 webp variants + watermark, exifr EXIF extraction, R2 upload, thumb base64 LQIP | `scripts/process-images.js` |
| action-process-dispatch.js | Actions-runner entry point for the admin-upload (R2 `temp/*`) path; downloads from R2, calls `processImage`, appends to `data/portfolio_images.json`, deletes R2 temp object | `scripts/action-process-dispatch.js` |
| action-process.js | Actions-runner entry point for the legacy push-to-`new-photos/` path; batch-processes a local directory | `scripts/action-process.js` |

## Pattern Overview

**Overall:** Static-first JAMstack with a Git-as-database publishing model. There is no runtime database and no runtime filesystem — `data/*.json` committed to the repo IS the persistence layer, and every write goes through a GitHub API commit followed by a full Cloudflare Pages rebuild.

**Key Characteristics:**
- Public pages (`/`, `/portfolio`, `/resume`) are effectively static: they `import` JSON directly from `data/` at build time — no fetch, no loader, no runtime read.
- The `/admin` editor is a single giant client component holding parallel in-memory copies of all editable data, diffed against the imports it was seeded from, and committed on explicit "Save & Deploy".
- Mutating API routes are thin GitHub API proxies (Contents API for single-file writes like resume PDF/photo upload; Git Data API blob/tree/commit/ref sequence for the multi-file `/api/deploy`) — there is no ORM/service layer.
- Photo processing is fully offloaded to GitHub Actions (`sharp`/`exifr`/`@aws-sdk/client-s3` are devDependencies used ONLY by CI scripts, never bundled into the edge runtime).
- Every API route is edge-runtime (`export const runtime = "edge"`), required because next-on-pages compiles the whole app to a single Cloudflare Worker — Node-only APIs (native `fs`, etc.) are unavailable inside routes.

## Layers

**Public pages (build-time data layer):**
- Purpose: Render portfolio/resume/home content from committed JSON, prerendered at build.
- Location: `src/app/page.tsx`, `src/app/portfolio/page.tsx`, `src/app/resume/page.tsx`
- Contains: Client components (`"use client"`) that `import ... from "../../data/*.json"` directly — Next's bundler inlines the JSON at build time.
- Depends on: `data/*.json`, shared display components (`Timeline`, `ProjectCard`, `MasonryGrid`, etc.), per-page CSS files.
- Used by: End users. No dependency on API routes at all for read paths (except `/api/track` fire-and-forget analytics from within photo view components, not shown in files read but implied by `PHOTO_ANALYTICS`).

**Admin editor layer (client-side working-copy state):**
- Purpose: WYSIWYG editing of the same content the public pages render, with local unsaved state until deploy.
- Location: `src/app/admin/page.tsx`, `src/components/admin/*`
- Contains: One large stateful page + a right-rail `PropertiesPanel` that switches on a `Selection` discriminated union; drag-and-drop reordering (two different libraries: `@dnd-kit/*` for bullets/home-gallery, `@atlaskit/pragmatic-drag-and-drop` for the photo masonry grid).
- Depends on: `data/*.json` (as seed/initial state only), `/api/upload`, `/api/upload-resume`, `/api/deploy`.
- Used by: Site owner only, gated by Cloudflare Access.

**API route layer (edge functions, GitHub proxy):**
- Purpose: Perform the actual writes — nothing is written to a database; every mutation is a commit to `main` via the GitHub REST/Git Data API, or a `workflow_dispatch` call.
- Location: `src/app/api/*/route.ts`
- Contains: `requireAccess()` gate, thin `fetch()` calls to `api.github.com`, request validation (path allow-lists, file-size limits, magic-byte checks).
- Depends on: `process.env.GITHUB_PAT`, `process.env.GITHUB_REPO` (plain env vars); `getRequestContext().env` for Cloudflare bindings (R2 `PORTFOLIO_BUCKET`, Analytics Engine `PHOTO_ANALYTICS`) in `/api/upload-asset` and `/api/track`.
- Used by: Admin editor client components.

**CI/Actions layer (Node.js, off the edge runtime):**
- Purpose: Heavy image processing that cannot run on the Cloudflare Worker (sharp is a native binary, exifr needs file I/O).
- Location: `.github/workflows/process-photos.yml`, `scripts/*.js`
- Contains: Two entrypoints — `action-process.js` (push-triggered batch mode, reads `new-photos/<category>/*`) and `action-process-dispatch.js` (workflow_dispatch mode, reads a single R2 `temp/` object) — both delegate to shared `scripts/process-images.js`.
- Depends on: `sharp`, `exifr`, `@aws-sdk/client-s3` (all devDependencies, never imported by app code).
- Used by: GitHub Actions runner only, triggered either by a push touching `new-photos/**` or by `/api/dispatch`.

## Data Flow

### Content Publishing Flow (admin edit → live site) — HIGH PRIORITY TO PORT

1. Admin loads `/admin` (`src/app/admin/page.tsx:99-136`) — imports `data/portfolio_images.json`, `data/resume.json`, `data/site_config.json`, `data/home_config.json` directly (bundled at build time, NOT fetched at runtime) and seeds `useState` for every editable field.
2. **Known gap (documented in code):** the admin does NOT currently call `GET /api/data` on mount to get a fresh commit SHA — it hardcodes `baseSha: "latest"` in the deploy call (`src/app/api/deploy/route.ts:87-93`, `src/components/admin/DeployButton.tsx:86`), which bypasses optimistic-concurrency conflict detection. The comment in `deploy/route.ts` states the rebuilt admin must load `/api/data` on mount and pass its `commitSha` as `baseSha` so this escape hatch can be removed.
3. User edits content via inline "click-to-select" regions in the page body → `PropertiesPanel` right rail (`src/components/admin/PropertiesPanel.tsx`) → local `setState` handlers in `admin/page.tsx` (e.g. `handleUpdatePhoto`, `handleUpdateExperience`) mark `hasUnsaved` + track `dirtyFiles`.
4. User clicks "Save & Deploy" → `DeployButton.handleDeploy()` (`src/components/admin/DeployButton.tsx:46-120`):
   a. Serializes current `photos`/`resume`/`siteConfig`/`homeConfig` to JSON strings.
   b. Diffs each against its `initial*` prop (the value imported at page load) — only changed files are included in the `files` map.
   c. POSTs `{ files, baseSha: "latest", message }` to `/api/deploy`.
5. `POST /api/deploy` (`src/app/api/deploy/route.ts`):
   a. `requireAccess()` gate.
   b. Validates all `files` keys start with `data/`.
   c. Fetches current HEAD SHA of `main` via GitHub Git Data API (`GET /repos/{repo}/git/ref/heads/main`).
   d. Conflict-checks `baseSha` vs `currentSha` (bypassed while `baseSha === "latest"`).
   e. Creates one blob per file (`POST .../git/blobs`), then a tree (`POST .../git/trees` with `base_tree: currentSha`), then a commit (`POST .../git/commits`), then updates the `main` ref (`PATCH .../git/refs/heads/main`).
   f. Returns `{ sha, status: "committed" }`, or 409 on conflict.
6. The commit landing on `main` triggers Cloudflare Pages' git-integration build hook (external to this repo's code — configured in the Cloudflare dashboard).
7. Cloudflare Pages runs `next build` via `@cloudflare/next-on-pages`, which re-imports the now-updated `data/*.json` into the public pages and emits a fresh `_worker.js`.
8. Site is live with new content in ~1-2 minutes (per the DeployButton UI copy).

**Auxiliary single-file writes** (same GitHub-commit pattern, bypass `/api/deploy`'s batch flow):
- Resume PDF: `PropertiesPanel` resume section → `POST /api/upload-resume` (`src/app/api/upload-resume/route.ts`) → GitHub Contents API PUT to `public/resume.pdf` (fetches existing `sha` first, since Contents API requires it for updates).
- Logo/icon assets: `POST /api/upload-asset` (`src/app/api/upload-asset/route.ts`) → writes directly to R2 `PORTFOLIO_BUCKET` (NOT a GitHub commit) under `assets/logos/*` or `assets/icons/*`, returns the public R2 URL for the admin to paste into a field.

### Photo Pipeline Flow (admin upload → processed site asset) — HIGH PRIORITY TO PORT

There are two independent trigger paths into the same `scripts/process-images.js` core, and the admin only exercises Path B:

**Path A — push-triggered batch (legacy, still wired in the workflow):**
1. Images placed under `new-photos/<category>/*` and pushed to `main`.
2. `.github/workflows/process-photos.yml` `push` trigger (paths filter: `new-photos/**`) runs `scripts/action-process.js`.
3. `action-process.js` (`scripts/action-process.js`) scans `new-photos/<category>/`, calls `processImage()` per file, appends to `data/portfolio_images.json`, deletes the source files, commits + pushes.

**Path B — admin upload via R2 `temp/` + workflow_dispatch (current admin flow):**
1. In `/admin`, `PhotoUploadZone` (`src/components/admin/PhotoUploadZone.tsx`) collects file + title/category/tags → `handlePhotoUpload` in `admin/page.tsx:242-259` → `POST /api/upload` (`src/app/api/upload/route.ts`) with `FormData`.
2. **Note:** `/api/upload/route.ts` actually commits the raw file directly to `new-photos/<category>/<slug>.<ext>` via the GitHub Contents API (`PUT /repos/{repo}/contents/{path}`) — this is Path A's trigger, not an R2 `temp/` upload, despite `/api/dispatch` existing for the R2 path. (Re-check at port time: `upload/route.ts` writes to `new-photos/`, so the *actual* wired admin flow today is A, triggered indirectly via this commit; `/api/dispatch` + R2 `temp/` is the intended/parallel flow but nothing in the current admin UI calls `/api/dispatch`.)
3. `/api/dispatch` (`src/app/api/dispatch/route.ts`) — present and functional, but not called from any admin component read during this analysis — would: validate `tempKey` matches `^temp/[a-zA-Z0-9._/-]+$`, `POST` a `workflow_dispatch` event to `process-photos.yml` with inputs `temp_key`, `title`, `category`, `tags`, then poll `GET .../runs?event=workflow_dispatch` up to 10× (2s interval) to resolve the new run's `id` for UI feedback.
4. `process-photos.yml` `workflow_dispatch` branch runs `scripts/action-process-dispatch.js`:
   - Downloads the object at `INPUT_TEMP_KEY` from R2 via `@aws-sdk/client-s3` `GetObjectCommand`.
   - Writes it to a local `.tmp/` file (`processImage()` needs a file path).
   - Calls shared `processImage()` (below), overrides `title`/`tags` from workflow inputs.
   - Appends the new entry to `data/portfolio_images.json` (rejects on duplicate `id` — computed as `${category}-${slugify(baseName)}`).
   - Deletes the R2 `temp/` object and the local temp file.
5. Workflow's final "Commit and push" step (shared by both trigger paths) commits `data/portfolio_images.json` + `new-photos/` and pushes to `main` → triggers the same Cloudflare Pages rebuild as the content-publishing flow above.

**Shared image-processing core (`scripts/process-images.js`):**
- `processImage(filePath, category, r2Client, bucket, publicUrl)`:
  1. `extractExif()` — `exifr.parse()` picks `Make/Model/LensModel/FNumber/ExposureTime/ISO/FocalLength`, formats into the `PhotoExif` shape (aperture as `f/N`, shutter as `1/N` or `Ns`, etc.).
  2. Resizes 4 `VARIANTS` via `sharp` (`""`→2000px "original", `-lg`→1200px, `-md`→800px, `-sm`→400px, all webp, quality 80-85), applies an `addWatermark()` SVG composite ("akhil saxena" text, bottom-right) to each, uploads each to R2 at `photos/<category>/<slug><suffix>.webp`.
  3. Separately uploads an UNwatermarked "clean" original to `private/<category>/<slug>-clean.webp` (not linked from any manifest field read during this analysis — appears to be an admin/backup copy).
  4. Generates a 40px-wide base64 `thumb` (LQIP blur placeholder, quality 60, no watermark).
  5. Returns the full `Photo`-shaped object (id, title, category, tags: `[]`, date, exif, urls, dimensions) that both entrypoints append to `data/portfolio_images.json`.

## Key Abstractions

**Selection (discriminated union):**
- Purpose: Represents "what is currently selected for editing" in the admin WYSIWYG — drives which form renders in `PropertiesPanel`.
- Examples: `src/components/admin/PropertiesPanel.tsx:92-105` (type definition), consumed throughout `src/app/admin/page.tsx`.
- Pattern: A tagged union with 13 variants (`none`, `photo`, `role`, `project`, `skillGroup`, `education`, `homeTitle`, `homeSubtitle`, `homeIntro`, `homeGallery`, `homeSocial`, `homeCta`, `resume`); `PropertiesPanel` is one long sequence of `if (selection.type === "...")` blocks, each owning its own local `update()` closure that merges partial updates back through a callback prop. This is the shape to preserve when porting to design-system form components — each branch maps to one form.

**Data model types (source of truth for the port):**
- Purpose: Canonical shapes for `data/*.json`, explicitly noted as NOT yet used by the admin (which has its own drifted local interfaces).
- Location: `src/types.ts`
- Pattern: File-level comment states: "the /admin editor still defines its own local copies that have drifted from these... When the admin is rebuilt, point it at these types." — e.g. admin splits experience dates into `startMonth/startYear/endMonth/endYear/isPresent` while `resume.json`/`types.ts` store a single `period` string. Reconciling this drift is a defined task for the port.

**Dirty-tracking / diff-based deploy:**
- Purpose: Avoid always rewriting every JSON file — only files whose serialized JSON differs from the initial import are sent to `/api/deploy`.
- Location: `src/components/admin/DeployButton.tsx:54-73`
- Pattern: Simple `JSON.stringify(current) !== JSON.stringify(initial)` comparison per file, not a structural diff — reordering keys or float formatting differences would false-positive.

**GitHub Contents/Git Data API as persistence:**
- Purpose: All writes are Git commits; there is no other datastore for `data/*.json` or `public/resume.pdf`.
- Examples: `src/app/api/deploy/route.ts` (multi-file, Git Data API: blob→tree→commit→ref), `src/app/api/upload/route.ts` and `src/app/api/upload-resume/route.ts` (single-file, simpler Contents API PUT).
- Pattern: Two different GitHub API surfaces used for what is conceptually the same operation (commit files to `main`) — the port should pick one consistent approach (likely the Git Data API for all writes, since it supports multi-file atomic commits and doesn't require a prior GET-for-sha round trip per file).

## Entry Points

**`/admin` page:**
- Location: `src/app/admin/page.tsx` (only file under `src/app/admin/`, no nested layout)
- Triggers: Direct navigation, gated by Cloudflare Access at the edge (dashboard-configured) plus in-code fallback checks on mutating API calls.
- Responsibilities: Renders the entire WYSIWYG editor; the sole client-side entry point for all content mutation.

**API route handlers:**
- Location: `src/app/api/{data,deploy,dispatch,track,upload,upload-asset,upload-resume}/route.ts`
- Triggers: `fetch()` calls from admin components.
- Responsibilities: Each is a single-purpose edge function; none share code beyond `requireAccess()` and `toBase64()`.
- **Deployment constraint:** next-on-pages compiles the whole Next app into ONE `_worker.js` emitted to `.vercel/output/static` (per `wrangler.toml`'s `pages_build_output_dir`). A top-level `functions/` directory (Cloudflare Pages' native per-route Functions convention) is IGNORED in this build mode — the project previously had one, it 404'd, and was removed (per `AGENTS.md`). This is why ALL server code must live under `src/app/api/*/route.ts` with `export const runtime = "edge"`, and why Cloudflare bindings (R2, Analytics Engine) must be read via `getRequestContext().env` rather than any Functions-specific binding mechanism. Any replacement architecture (Astro + `@astrojs/cloudflare`) must re-derive how bindings are exposed to server-rendered routes under ITS build model — the constraint here was specific to next-on-pages' worker-bundling behavior, not a Cloudflare platform-wide limitation.

**GitHub Actions workflows:**
- Location: `.github/workflows/process-photos.yml`, `.github/workflows/ci.yml`
- Triggers: `process-photos.yml` — push to `main` touching `new-photos/**`, OR `workflow_dispatch` (called from `/api/dispatch`). `ci.yml` — every push/PR, runs `npm run lint` + `npm run typecheck`.
- Responsibilities: `process-photos.yml` is the only place `sharp`/`exifr`/`@aws-sdk/client-s3` execute.

## Architectural Constraints

- **No runtime filesystem or database:** `data/*.json` is read only at build time via static `import`; nothing in the deployed Worker reads or writes local files. All "persistence" is a GitHub commit.
- **Single worker bundle:** Every route lives in one `_worker.js`; there is no per-route isolation, no `functions/` directory, no independent scaling of API routes vs. page rendering.
- **Edge runtime only:** `export const runtime = "edge"` is mandatory on every route file; Node-specific APIs are unavailable (this is why image processing is pushed entirely into GitHub Actions rather than an API route).
- **Cloudflare bindings unavailable under `next dev`:** `getRequestContext().env` (used for R2 and Analytics Engine bindings in `/api/upload-asset` and `/api/track`) throws or returns undefined outside the Cloudflare Pages runtime — both call sites guard with try/catch or optional chaining so local dev doesn't 500.
- **Global/module state:** `src/lib/access.ts` keeps a module-level `jwksCache: Map` for JWKS key sets — the only cross-request in-memory state in the codebase.
- **Dead/unused admin components:** `src/components/admin/PhotoGrid.tsx`, `PhotoEditModal.tsx`, `PreviewPanel.tsx`, `ExperienceEditor.tsx`, `EducationEditor.tsx`, `ProjectEditor.tsx`, `SkillsEditor.tsx` are not imported anywhere in `src/app` or by the components that ARE wired up (verified via repo-wide grep) — they represent a superseded editor design (grid+modal+separate preview) later replaced by the inline WYSIWYG (`admin/page.tsx` + `PropertiesPanel` + `DraggableMasonry`). Do not port these; port the wired components only.
- **Two DnD libraries coexist:** `@dnd-kit/*` (used for bullet reordering and the home-page gallery in `admin/page.tsx` and `PropertiesPanel.tsx`) and `@atlaskit/pragmatic-drag-and-drop` (used only in `DraggableMasonry.tsx` for the photo grid) — an unresolved duplication worth consolidating in the port.
- **`/api/upload` vs `/api/dispatch` divergence:** The wired admin upload flow (`/api/upload`) commits raw files to `new-photos/` and relies on the PUSH trigger of `process-photos.yml`, NOT the R2-`temp/`+`workflow_dispatch` path that `/api/dispatch` implements. `/api/dispatch` and its R2 `temp/` convention exist in code but are not invoked from the current admin UI — confirm intent before porting (either finish wiring Path B, or drop `/api/dispatch` and `action-process-dispatch.js`).
- **Optimistic concurrency is currently disabled:** `baseSha: "latest"` in `DeployButton.tsx` bypasses the conflict check `/api/deploy` implements — documented as a known gap to fix by loading `/api/data` on mount.

## Anti-Patterns

### Local type drift instead of shared types

**What happens:** The admin editor (`admin/page.tsx`, `PropertiesPanel.tsx`) defines its own `ExperienceEntry`/`EducationEntry`/`ProjectEntry`/`PortfolioPhoto` interfaces, duplicated and subtly different from the canonical ones in `src/types.ts` (e.g. `period: string` vs. split `startMonth/startYear/endMonth/endYear/isPresent`).
**Why it's wrong:** Two sources of truth for the same data shape risk silent field loss on save (e.g. if a start/end-month split field isn't reconciled back into `period` before serializing).
**Do this instead:** Import and extend `src/types.ts` types directly; the file's own header comment already flags this as required work for the rebuild.

### Diff-by-JSON-stringify for change detection

**What happens:** `DeployButton.tsx` compares `JSON.stringify(current)` to `JSON.stringify(initial)` to decide which files changed.
**Why it's wrong:** Sensitive to key order and doesn't distinguish "no real change" from "cosmetic reserialization"; also means the WHOLE file is always re-sent even for a one-field edit, when the API supports arbitrary partial file sets.
**Do this instead:** Track dirty fields/files explicitly (the code already has an unused `dirtyFiles` state in `admin/page.tsx` — `markDirty()` is defined but never called) and only serialize files known to be dirty.

### Bypassed concurrency guard

**What happens:** `baseSha: "latest"` sent unconditionally from `DeployButton.tsx`, so `/api/deploy`'s SHA-mismatch conflict check (`src/app/api/deploy/route.ts:93`) never fires in practice.
**Why it's wrong:** Two concurrent admin sessions (or an admin edit racing a photo-processing Action commit) can silently clobber each other's changes.
**Do this instead:** Load `GET /api/data` on admin mount, store the returned `commitSha`, and pass it as `baseSha` on deploy (already called out in code comments as the fix).

## Error Handling

**Strategy:** Every API route wraps its body in try/catch, logs via `console.error`, and returns a JSON `{ error: string }` with an appropriate HTTP status (400 validation, 401 auth, 409 conflict, 413/415 upload limits, 500/502/504 upstream failures). Client-side, `DeployButton` and inline upload handlers use `alert()` and a small in-modal log list — no toast system or centralized error boundary.

**Patterns:**
- Route-level: `const denied = await requireAccess(request); if (denied) return denied;` at the top of every mutating handler.
- Upstream (GitHub API) failures are surfaced as 502 with a generic message; response bodies from failed GitHub calls are logged server-side (`console.error`) but not returned to the client verbatim (avoids leaking tokens/internals).

## Cross-Cutting Concerns

**Logging:** `console.error` only, no structured logging or external log sink.
**Validation:** Ad hoc per-route (regex path allow-lists, file-size caps, magic-byte sniffing for PDFs, extension/MIME allow-lists for images) — no shared schema/validation library.
**Authentication:** Cloudflare Access at the edge (dashboard-configured) gates `/admin` and all `/api/*` except `/api/track`; `requireAccess()` in `src/lib/access.ts` adds a second, in-code check — strict JWT verification via `jose` when `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` are set, else a cookie-presence fallback.

---

*Architecture analysis: 2026-08-16*
