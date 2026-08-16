<!-- GSD:project-start source:PROJECT.md -->
## Project

**akhilsaxena.com — Portfolio Rebuild**

A personal portfolio and photography site for Akhil Saxena — frontend engineer and
photographer. Four public views (a two-act Home, Work, Photos, Résumé) plus case-study
pages for his own projects, and a private `/admin` CMS he uses to edit content and
publish photos without touching a terminal. It is being rebuilt from scratch on Astro +
React islands, consuming his own published design system,
[`@akhil-saxena/design-system`](https://www.npmjs.com/package/@akhil-saxena/design-system).

The audience is people evaluating him professionally — hiring managers, collaborators,
peers — and himself, as the person who adds photos on a Sunday.

**Core Value:** **The site must be the proof that the design system works.** A component library's
strongest possible argument is a real product built on it — so if a tradeoff arises
between shipping something bespoke and shipping it out of the design system, the design
system wins, and any gap it exposes is a finding rather than a workaround.

### Constraints

- **Design system**: All UI comes from `@akhil-saxena/design-system` where a component
  exists — app-specific CSS confined to layout. This is the project's core value, not a
  preference.
- **Cross-repo dependency**: The charcoal theme must be built and published from the
  `design-system` repo (`../design-system`) before the portfolio can consume it. During
  development the portfolio consumes it as a **packed tarball** (`npm pack` →
  `file:*.tgz`), never `file:../design-system` or `npm link` — both are symlinks and
  carry the duplicate-React "invalid hook call" hazard. A CI gate fails the build if the
  dependency spec still starts with `file:` at ship time.
- **Platform**: Cloudflare **Workers + Static Assets** — `@astrojs/cloudflare` dropped
  Pages support in v13. Config is `output: 'static'` (the default) + `adapter:
  cloudflare()`, with `export const prerender = false` on `/admin` and every
  `src/pages/api/*` route. Bindings come from `import { env } from "cloudflare:workers"`
  (`Astro.locals.runtime` is removed) and **work in local dev** — `astro dev` runs real
  `workerd`, so binding access must NOT be guarded; a guard would mask a real failure.
- **No runtime filesystem**: Content is committed JSON. The admin publishes by committing
  to the repo via the GitHub API; there is nothing to write to at runtime.
- **Security**: Auth fails closed. Mutating routes verify the signed Cloudflare Access
  JWT; a missing configuration denies rather than degrades.
- **Performance**: Lighthouse 95+ on public pages, with a real budget on the 39-photo
  gallery.
- **Live site is down** until cutover — accepted, but it is a clock on the project.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 (`^5` in `package.json`) — all app/route code under `src/`
- JavaScript (CommonJS) — standalone Node scripts run only by GitHub Actions: `scripts/process-images.js`, `scripts/action-process.js`, `scripts/action-process-dispatch.js`, `scripts/migrate-existing.js`, `scripts/reprocess-all.js` (excluded from ESLint via `eslint.config.mjs` `globalIgnores: ["scripts/**"]`, and excluded from the Next bundle)
## Runtime
- Deployed runtime: Cloudflare Pages edge Workers runtime (V8 isolates), NOT Node.js. Every API route file exports `export const runtime = "edge"` (Next.js Edge Runtime), which `@cloudflare/next-on-pages` compiles into the single `_worker.js` Cloudflare Worker.
- Local dev runtime: Node.js via `next dev` (plain Node/V8, no Cloudflare bindings available — see access.ts / Cloudflare Bindings section below).
- GitHub Actions runtime: Node.js 20 (`.github/workflows/process-photos.yml` → `actions/setup-node@v4`, `node-version: 20`) for image-processing scripts; CI workflow (`.github/workflows/ci.yml`) uses Node 20 as well (`node-version: "22"` in ci.yml — note: ci.yml uses 22, process-photos.yml uses 20).
- No `.nvmrc`, no `engines` field in `package.json` — Node version is pinned only inside each GitHub Actions workflow file.
- npm (package-lock.json present — lockfile committed)
- `.npmrc`: `legacy-peer-deps=true` (needed because of React 19 + some peer-dep mismatches)
## Frameworks
- Next.js `^15.5.19` (App Router) — recently bumped from 15.2.4 for critical CVEs (see git log `1435ac1`)
- React `^19.2.4` / React DOM `^19.2.4`
- `@cloudflare/next-on-pages` `^1.13.16` — build adapter that converts the Next.js build output into a Cloudflare Pages-compatible Worker (`_worker.js` in `.vercel/output/static`, per `wrangler.toml` `pages_build_output_dir`)
- `jose` `^5.9.6` — used only in `src/lib/access.ts` for remote JWKS fetch + JWT verification of Cloudflare Access tokens
- `@atlaskit/pragmatic-drag-and-drop` `^1.7.9`
- `@dnd-kit/core` `^6.3.1`, `@dnd-kit/sortable` `^10.0.0`, `@dnd-kit/utilities` `^3.2.2`
- `react-swipeable` `^7.0.2`
- ESLint `^9` with `eslint-config-next` `^16.2.1` (flat config, `eslint.config.mjs`)
- TypeScript `^5`, checked via `tsc --noEmit` (`npm run typecheck`)
- `next build` (also typechecks)
## Key Dependencies
- `next` `^15.5.19` — framework, routing, API route handlers
- `react` / `react-dom` `^19.2.4`
- `@cloudflare/next-on-pages` `^1.13.16` — Cloudflare Pages build adapter and `getRequestContext()` API for accessing bindings
- `jose` `^5.9.6` — Cloudflare Access JWT verification (`src/lib/access.ts`)
- `@atlaskit/pragmatic-drag-and-drop`, `@dnd-kit/*` — admin photo-reorder drag & drop (lower priority, admin UI only)
- `react-swipeable` — public gallery lightbox swipe navigation (lower priority)
- `sharp` `^0.34.5` — image resize/WebP encode/watermark compositing, used exclusively in `scripts/process-images.js`
- `exifr` `^7.1.3` — EXIF metadata extraction, used exclusively in `scripts/process-images.js`
- `@aws-sdk/client-s3` `^3.1019.0` — S3-compatible client used to talk to Cloudflare R2 from Node (Actions runner), used in `scripts/process-images.js` (`createR2Client`), `scripts/action-process.js`, `scripts/action-process-dispatch.js`, `scripts/migrate-existing.js`, `scripts/reprocess-all.js`. **These three deps (`sharp`, `exifr`, `@aws-sdk/client-s3`) never run in the Cloudflare Worker/edge runtime — R2 access from edge routes goes through the Cloudflare R2 binding (`PORTFOLIO_BUCKET`), not this SDK.**
- `@cloudflare/workers-types` `^4.20260317.1` — TS types for Workers/Cloudflare runtime globals
- `@types/node` `^20`, `@types/react` `^19`, `@types/react-dom` `^19`
- `typescript` `^5`, `eslint` `^9`, `eslint-config-next` `^16.2.1`
## Configuration
- `GITHUB_PAT` — GitHub Personal Access Token with repo contents/workflow write scope; used by `/api/data`, `/api/deploy`, `/api/dispatch`, `/api/upload`, `/api/upload-resume` to call the GitHub REST/Git API
- `GITHUB_REPO` — `"akhil-saxena/portfolio"` (also set as a `[vars]` default in `wrangler.toml`, but production value comes from the Pages dashboard)
- `R2_PUBLIC_URL` — public base URL for the R2 bucket, `"https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev"` (also defaulted in `wrangler.toml [vars]`)
- `CF_ACCESS_TEAM_DOMAIN` — e.g. `"myteam.cloudflareaccess.com"`; when set together with `CF_ACCESS_AUD`, enables strict JWT verification in `src/lib/access.ts`
- `CF_ACCESS_AUD` — the Cloudflare Access application's AUD tag; paired with `CF_ACCESS_TEAM_DOMAIN`
- No `.env` file exists in the repo (confirmed absent) — all env vars are configured via the Cloudflare Pages dashboard and `wrangler.toml [vars]` (for the two non-secret defaults).
- `PORTFOLIO_BUCKET` — R2 bucket binding, `bucket_name = "portfolio-photos"` (`wrangler.toml` `[[r2_buckets]]`)
- `PHOTO_ANALYTICS` — Analytics Engine binding, `dataset = "photo_views"` (`wrangler.toml` `[[analytics_engine_datasets]]`)
- Both bindings are unavailable under plain `next dev` (no Cloudflare request context in local Node dev) — every call site wraps binding access in a guard/try-catch so local dev doesn't 500 (`src/app/api/track/route.ts`, `src/app/api/upload-asset/route.ts`).
- `next.config.js` — `images.unoptimized: true` (no Next image optimization at the edge), `images.remotePatterns` allow-lists the R2 public hostname `pub-2d90aedeebcf4142afe524930c3b6471.r2.dev`
- `wrangler.toml` — `compatibility_date = "2024-09-23"`, `compatibility_flags = ["nodejs_compat"]`, `pages_build_output_dir = ".vercel/output/static"` (output of `@cloudflare/next-on-pages`)
- **Important deploy-shape note:** a top-level `functions/` directory is explicitly NOT used/ignored under this build mode — all server code must live in `src/app/api/*/route.ts` App Router handlers, each exporting `export const runtime = "edge"`. This is stated as a hard constraint in `AGENTS.md`.
## Platform Requirements
- Node.js (20+ recommended, matching Actions runner; no enforced `engines`/`.nvmrc`)
- `npm install` (uses `legacy-peer-deps=true` via `.npmrc`)
- `npm run dev` → plain `next dev` (no Cloudflare bindings; binding-dependent routes degrade gracefully)
- Cloudflare Pages, build command produces `.vercel/output/static` via `@cloudflare/next-on-pages`, live at akhilsaxena.pages.dev
- GitHub Actions (`ubuntu-latest`, Node 20) runs the photo-processing pipeline and CI checks
- Secrets required in GitHub Actions (`process-photos.yml`): `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL` (S3-compatible R2 API credentials — separate from the Cloudflare Pages `PORTFOLIO_BUCKET` binding used at request time)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## CI Gate — what is actually enforced today
- run: npm ci
- run: npm run lint        # eslint (flat config, eslint.config.mjs)
- run: npm run typecheck   # tsc --noEmit
### ESLint configuration (`eslint.config.mjs`)
- `scripts/**` (the Node/CommonJS Actions scripts: `scripts/process-images.js` etc.) is
- No custom rule overrides beyond the ignores — the project relies entirely on
### TypeScript strictness (`tsconfig.json`)
## Naming Patterns
- React components: `PascalCase.tsx`, one component per file, matching the exported name
- Admin-only components live under `src/components/admin/` (still PascalCase) — a clear
- Hooks: `useCamelCase.ts` under `src/hooks/` (`useInView.ts`, `useScrollTitle.ts`,
- Library/util modules: `camelCase.ts` under `src/lib/` (`access.ts`, `base64.ts`) — no
- API routes: `src/app/api/<name>/route.ts` (Next.js App Router convention) — the `<name>`
- Types: centralized in a single `src/types.ts` (not split per-domain) — see note below.
- Exported API handlers are always named `GET` / `POST` (Next.js convention), one per file
- Regular functions: `camelCase`, verb-first (`toBase64`, `requireAccess`, `getJwks`,
- `camelCase` throughout. Constants that are effectively fixed configuration are
- `PascalCase`, no `I`-prefix. Request/response shapes for API routes are declared as local
- Domain types (`Photo`, `PhotoExif`, `PhotoUrls`, `ExperienceEntry`, `EducationEntry`,
## Code Style
- No Prettier config present anywhere in the repo (`.prettierrc*` absent). Formatting is
- **Fix in rebuild:** add Prettier (or Biome) and wire it into CI so formatting is enforced,
- `eslint-config-next` (`core-web-vitals` + `typescript` presets) only — no custom rules.
## Import Organization
- `@/*` → `./src/*` (configured in `tsconfig.json`). Used consistently for everything under
- Data JSON files in `data/` are **not** under the `@/*` alias and are imported via relative
## Error Handling
- `400` — malformed/missing input (missing required fields, invalid path format)
- `401` — `requireAccess()` rejection (see Auth section)
- `413` — file exceeds `MAX_BYTES`
- `415` — wrong file type/content (not an image, not a PDF)
- `409` — optimistic-concurrency conflict in `deploy/route.ts` (stale `baseSha`)
- `500` — internal error (env vars missing, unexpected exception, storage not configured)
- `502` — upstream GitHub API call failed (`!res.ok` from a GitHub fetch)
- `504` — dispatch/poll timeout waiting for a GitHub Actions run ID to appear
- **Required binding** (`upload-asset/route.ts`, R2 `PORTFOLIO_BUCKET`): read via
- **Optional/best-effort binding** (`track/route.ts`, Analytics Engine `PHOTO_ANALYTICS`):
## Data Validation — explicit finding: there is none
- **No schema validation library** is used anywhere in the codebase or `package.json`
- **Committed JSON in `data/`** (`resume.json`, `portfolio_images.json`, `home_config.json`,
- **API request bodies** are validated with hand-rolled, per-field `if` checks only — see
- **Admin form input** (`src/components/admin/*.tsx`) has no client-side schema validation
## API Route Conventions (summary — see also ARCHITECTURE.md/CONCERNS.md)
- **Every** route file starts with `export const runtime = "edge";` immediately after
- **`requireAccess(request)`** (`src/lib/access.ts`) is called as the first line inside every
- Env vars (`GITHUB_PAT`, `GITHUB_REPO`) are read via `process.env` and always explicitly
- Cloudflare bindings (`PORTFOLIO_BUCKET`, `PHOTO_ANALYTICS`) are read via
## Function Design
## Module Design
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Public pages (`/`, `/portfolio`, `/resume`) are effectively static: they `import` JSON directly from `data/` at build time — no fetch, no loader, no runtime read.
- The `/admin` editor is a single giant client component holding parallel in-memory copies of all editable data, diffed against the imports it was seeded from, and committed on explicit "Save & Deploy".
- Mutating API routes are thin GitHub API proxies (Contents API for single-file writes like resume PDF/photo upload; Git Data API blob/tree/commit/ref sequence for the multi-file `/api/deploy`) — there is no ORM/service layer.
- Photo processing is fully offloaded to GitHub Actions (`sharp`/`exifr`/`@aws-sdk/client-s3` are devDependencies used ONLY by CI scripts, never bundled into the edge runtime).
- Every API route is edge-runtime (`export const runtime = "edge"`), required because next-on-pages compiles the whole app to a single Cloudflare Worker — Node-only APIs (native `fs`, etc.) are unavailable inside routes.
## Layers
- Purpose: Render portfolio/resume/home content from committed JSON, prerendered at build.
- Location: `src/app/page.tsx`, `src/app/portfolio/page.tsx`, `src/app/resume/page.tsx`
- Contains: Client components (`"use client"`) that `import ... from "../../data/*.json"` directly — Next's bundler inlines the JSON at build time.
- Depends on: `data/*.json`, shared display components (`Timeline`, `ProjectCard`, `MasonryGrid`, etc.), per-page CSS files.
- Used by: End users. No dependency on API routes at all for read paths (except `/api/track` fire-and-forget analytics from within photo view components, not shown in files read but implied by `PHOTO_ANALYTICS`).
- Purpose: WYSIWYG editing of the same content the public pages render, with local unsaved state until deploy.
- Location: `src/app/admin/page.tsx`, `src/components/admin/*`
- Contains: One large stateful page + a right-rail `PropertiesPanel` that switches on a `Selection` discriminated union; drag-and-drop reordering (two different libraries: `@dnd-kit/*` for bullets/home-gallery, `@atlaskit/pragmatic-drag-and-drop` for the photo masonry grid).
- Depends on: `data/*.json` (as seed/initial state only), `/api/upload`, `/api/upload-resume`, `/api/deploy`.
- Used by: Site owner only, gated by Cloudflare Access.
- Purpose: Perform the actual writes — nothing is written to a database; every mutation is a commit to `main` via the GitHub REST/Git Data API, or a `workflow_dispatch` call.
- Location: `src/app/api/*/route.ts`
- Contains: `requireAccess()` gate, thin `fetch()` calls to `api.github.com`, request validation (path allow-lists, file-size limits, magic-byte checks).
- Depends on: `process.env.GITHUB_PAT`, `process.env.GITHUB_REPO` (plain env vars); `getRequestContext().env` for Cloudflare bindings (R2 `PORTFOLIO_BUCKET`, Analytics Engine `PHOTO_ANALYTICS`) in `/api/upload-asset` and `/api/track`.
- Used by: Admin editor client components.
- Purpose: Heavy image processing that cannot run on the Cloudflare Worker (sharp is a native binary, exifr needs file I/O).
- Location: `.github/workflows/process-photos.yml`, `scripts/*.js`
- Contains: Two entrypoints — `action-process.js` (push-triggered batch mode, reads `new-photos/<category>/*`) and `action-process-dispatch.js` (workflow_dispatch mode, reads a single R2 `temp/` object) — both delegate to shared `scripts/process-images.js`.
- Depends on: `sharp`, `exifr`, `@aws-sdk/client-s3` (all devDependencies, never imported by app code).
- Used by: GitHub Actions runner only, triggered either by a push touching `new-photos/**` or by `/api/dispatch`.
## Data Flow
### Content Publishing Flow (admin edit → live site) — HIGH PRIORITY TO PORT
- Resume PDF: `PropertiesPanel` resume section → `POST /api/upload-resume` (`src/app/api/upload-resume/route.ts`) → GitHub Contents API PUT to `public/resume.pdf` (fetches existing `sha` first, since Contents API requires it for updates).
- Logo/icon assets: `POST /api/upload-asset` (`src/app/api/upload-asset/route.ts`) → writes directly to R2 `PORTFOLIO_BUCKET` (NOT a GitHub commit) under `assets/logos/*` or `assets/icons/*`, returns the public R2 URL for the admin to paste into a field.
### Photo Pipeline Flow (admin upload → processed site asset) — HIGH PRIORITY TO PORT
- `processImage(filePath, category, r2Client, bucket, publicUrl)`:
## Key Abstractions
- Purpose: Represents "what is currently selected for editing" in the admin WYSIWYG — drives which form renders in `PropertiesPanel`.
- Examples: `src/components/admin/PropertiesPanel.tsx:92-105` (type definition), consumed throughout `src/app/admin/page.tsx`.
- Pattern: A tagged union with 13 variants (`none`, `photo`, `role`, `project`, `skillGroup`, `education`, `homeTitle`, `homeSubtitle`, `homeIntro`, `homeGallery`, `homeSocial`, `homeCta`, `resume`); `PropertiesPanel` is one long sequence of `if (selection.type === "...")` blocks, each owning its own local `update()` closure that merges partial updates back through a callback prop. This is the shape to preserve when porting to design-system form components — each branch maps to one form.
- Purpose: Canonical shapes for `data/*.json`, explicitly noted as NOT yet used by the admin (which has its own drifted local interfaces).
- Location: `src/types.ts`
- Pattern: File-level comment states: "the /admin editor still defines its own local copies that have drifted from these... When the admin is rebuilt, point it at these types." — e.g. admin splits experience dates into `startMonth/startYear/endMonth/endYear/isPresent` while `resume.json`/`types.ts` store a single `period` string. Reconciling this drift is a defined task for the port.
- Purpose: Avoid always rewriting every JSON file — only files whose serialized JSON differs from the initial import are sent to `/api/deploy`.
- Location: `src/components/admin/DeployButton.tsx:54-73`
- Pattern: Simple `JSON.stringify(current) !== JSON.stringify(initial)` comparison per file, not a structural diff — reordering keys or float formatting differences would false-positive.
- Purpose: All writes are Git commits; there is no other datastore for `data/*.json` or `public/resume.pdf`.
- Examples: `src/app/api/deploy/route.ts` (multi-file, Git Data API: blob→tree→commit→ref), `src/app/api/upload/route.ts` and `src/app/api/upload-resume/route.ts` (single-file, simpler Contents API PUT).
- Pattern: Two different GitHub API surfaces used for what is conceptually the same operation (commit files to `main`) — the port should pick one consistent approach (likely the Git Data API for all writes, since it supports multi-file atomic commits and doesn't require a prior GET-for-sha round trip per file).
## Entry Points
- Location: `src/app/admin/page.tsx` (only file under `src/app/admin/`, no nested layout)
- Triggers: Direct navigation, gated by Cloudflare Access at the edge (dashboard-configured) plus in-code fallback checks on mutating API calls.
- Responsibilities: Renders the entire WYSIWYG editor; the sole client-side entry point for all content mutation.
- Location: `src/app/api/{data,deploy,dispatch,track,upload,upload-asset,upload-resume}/route.ts`
- Triggers: `fetch()` calls from admin components.
- Responsibilities: Each is a single-purpose edge function; none share code beyond `requireAccess()` and `toBase64()`.
- **Deployment constraint:** next-on-pages compiles the whole Next app into ONE `_worker.js` emitted to `.vercel/output/static` (per `wrangler.toml`'s `pages_build_output_dir`). A top-level `functions/` directory (Cloudflare Pages' native per-route Functions convention) is IGNORED in this build mode — the project previously had one, it 404'd, and was removed (per `AGENTS.md`). This is why ALL server code must live under `src/app/api/*/route.ts` with `export const runtime = "edge"`, and why Cloudflare bindings (R2, Analytics Engine) must be read via `getRequestContext().env` rather than any Functions-specific binding mechanism. Any replacement architecture (Astro + `@astrojs/cloudflare`) must re-derive how bindings are exposed to server-rendered routes under ITS build model — the constraint here was specific to next-on-pages' worker-bundling behavior, not a Cloudflare platform-wide limitation.
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
### Diff-by-JSON-stringify for change detection
### Bypassed concurrency guard
## Error Handling
- Route-level: `const denied = await requireAccess(request); if (denied) return denied;` at the top of every mutating handler.
- Upstream (GitHub API) failures are surfaced as 502 with a generic message; response bodies from failed GitHub calls are logged server-side (`console.error`) but not returned to the client verbatim (avoids leaking tokens/internals).
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
