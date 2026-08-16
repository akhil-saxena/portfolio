# Codebase Structure

**Analysis Date:** 2026-08-16

**Context:** This structure map covers the CURRENT Next.js 15 (App Router) + React 19 app. It is written to double as a migration map for the planned Astro + React islands replacement — every path below is exhaustive and exact so a future move/port can be tracked file-by-file. Sections are weighted per the porting priorities: the admin/API/data-flow paths are documented exhaustively; public-page presentational components are listed but not elaborated.

## Directory Layout

```
portfolio/
├── .github/
│   └── workflows/
│       ├── ci.yml                       # lint + typecheck on push/PR
│       └── process-photos.yml           # photo pipeline (push + workflow_dispatch)
├── .npmrc                                # exists — DO NOT read/quote (may hold auth config)
├── data/                                 # ── SOURCE OF TRUTH — committed JSON, imported at build time
│   ├── home_config.json                  # home page: title/subtitle/intro/peekIds/peekPositions/socialLinks/ctas
│   ├── portfolio_images.json             # photo manifest: id/title/category/tags/date/exif/urls/dimensions/order
│   ├── resume.json                       # experience/projects/skills/education
│   └── site_config.json                  # categoryColumns (per-category masonry column count)
├── design_handoff_portfolio/             # static HTML design-handoff exports + support.js — not app code, reference only
├── docs/
│   └── superpowers/
│       ├── plans/                        # planning docs (not app code)
│       └── specs/                        # spec docs (not app code)
├── new-photos/                           # push-trigger inbox dir for photo pipeline Path A; only .gitkeep committed
│   └── .gitkeep
├── public/                               # static assets served as-is
│   ├── assets/                           # a few project logo icons (hued-icon.png, momentum-icon.png, timeshift-icon.png)
│   ├── fonts/                            # self-hosted woff2 fonts (DM Sans, DM Mono, Libre Baskerville)
│   ├── favicon.svg
│   ├── resume.pdf                        # the downloadable resume — overwritten by /api/upload-resume
│   └── *.svg                             # unused Next.js default svgs (file/globe/next/vercel/window)
├── scripts/                              # Node.js scripts — devDependency-only, run by GitHub Actions, NEVER bundled into the app
│   ├── action-process-dispatch.js        # workflow_dispatch entrypoint: R2 temp/ → processImage → append manifest
│   ├── action-process.js                 # push-trigger entrypoint: batch-processes new-photos/<category>/*
│   ├── migrate-existing.js               # one-off data migration script (not part of steady-state pipeline)
│   ├── process-images.js                 # shared core: sharp resize (4 variants) + watermark + exifr EXIF + R2 upload
│   └── reprocess-all.js                  # one-off re-processing script (not part of steady-state pipeline)
├── src/
│   ├── app/                              # Next.js App Router — pages + API routes
│   │   ├── admin/
│   │   │   └── page.tsx                  # THE admin editor — single client component, all editable state
│   │   ├── api/                          # every route.ts MUST `export const runtime = "edge"`
│   │   │   ├── data/route.ts             # GET — fetch current data/*.json + HEAD sha from GitHub
│   │   │   ├── deploy/route.ts           # POST — multi-file commit via GitHub Git Data API (blob→tree→commit→ref)
│   │   │   ├── dispatch/route.ts         # POST — trigger process-photos.yml workflow_dispatch (R2 temp/ path)
│   │   │   ├── track/route.ts            # POST — Analytics Engine write, no auth (only public API route)
│   │   │   ├── upload/route.ts           # POST — commit raw photo to new-photos/<category>/ (GitHub Contents API)
│   │   │   ├── upload-asset/route.ts     # POST — write logo/icon to R2 PORTFOLIO_BUCKET, return public URL
│   │   │   └── upload-resume/route.ts    # POST — overwrite public/resume.pdf via GitHub Contents API
│   │   ├── portfolio/
│   │   │   ├── layout.tsx                # metadata only (title/description/canonical)
│   │   │   └── page.tsx                  # public photography grid page — imports portfolio_images.json + site_config.json
│   │   ├── resume/
│   │   │   ├── layout.tsx                # metadata only
│   │   │   └── page.tsx                  # public resume/dev page — imports resume.json
│   │   ├── layout.tsx                    # RootLayout — <html>, theme-flash script, JSON-LD, font preloads, imports globals.css
│   │   ├── not-found.tsx                 # 404 page
│   │   └── page.tsx                      # public home page — imports portfolio_images.json + home_config.json
│   ├── components/
│   │   ├── admin/                        # admin-only components — see below for wired vs. dead
│   │   │   ├── AdminTopBar.tsx           # WIRED — tabs + ThemeToggle + DeployButton
│   │   │   ├── DeployButton.tsx          # WIRED — diff+commit+deploy flow, modal log UI
│   │   │   ├── DraggableMasonry.tsx      # WIRED — photo grid reorder (@atlaskit/pragmatic-drag-and-drop)
│   │   │   ├── PhotoUploadZone.tsx       # WIRED — drag/drop or picker upload form, feeds /api/upload
│   │   │   ├── PropertiesPanel.tsx       # WIRED — right-rail editor, 13-branch Selection switch (~940 lines)
│   │   │   ├── EducationEditor.tsx       # DEAD — not imported anywhere; superseded by inline PropertiesPanel branch
│   │   │   ├── ExperienceEditor.tsx      # DEAD — same
│   │   │   ├── PhotoEditModal.tsx        # DEAD — same (superseded by PropertiesPanel "photo" branch)
│   │   │   ├── PhotoGrid.tsx             # DEAD — same (superseded by DraggableMasonry)
│   │   │   ├── PreviewPanel.tsx          # DEAD — same (admin now previews inline, not in a separate panel)
│   │   │   ├── ProjectEditor.tsx         # DEAD — same
│   │   │   └── SkillsEditor.tsx          # DEAD — same
│   │   ├── FilterTabs.tsx                # public — category filter pills (photography page + admin reuse)
│   │   ├── Footer.tsx                    # public — site footer
│   │   ├── icons.tsx                     # shared icon registry (getIcon() + named Icon* exports)
│   │   ├── Lightbox.tsx                  # public — fullscreen photo viewer w/ swipe (react-swipeable)
│   │   ├── MasonryGrid.tsx               # public — CSS-columns photo grid (non-draggable; admin uses DraggableMasonry instead)
│   │   ├── PageNav.tsx                   # public — back-link + slot for page actions (used by portfolio/resume pages)
│   │   ├── ProjectCard.tsx               # public — resume project card
│   │   ├── SearchBar.tsx                 # public — photo search input
│   │   ├── ThemeToggle.tsx               # public+admin — dark/light toggle (localStorage + data-theme attr)
│   │   └── Timeline.tsx                  # public — resume experience timeline
│   ├── hooks/
│   │   ├── useInView.ts                  # IntersectionObserver — adds "visible" class to .reveal children (scroll-in animation)
│   │   ├── useScrollTitle.ts             # imperative DOM scroll-driven single-title dock-into-nav animation (portfolio page)
│   │   └── useSectionScrollTitle.ts      # same pattern, multi-section variant (resume page, one <h2> per section)
│   ├── lib/
│   │   ├── access.ts                     # requireAccess() — Cloudflare Access JWT verify (jose) + cookie fallback; module-level jwksCache
│   │   └── base64.ts                     # toBase64() — chunked ArrayBuffer→base64 for GitHub Contents API bodies
│   ├── styles/                           # plain CSS (no CSS-in-JS, no Tailwind) — LOWER PRIORITY, being discarded
│   │   ├── admin.css                     # admin-only classes (admin-props, admin-input, admin-topbar, etc.)
│   │   ├── dev.css                       # resume/dev page styles
│   │   ├── globals.css                   # base tokens, resets, theme vars
│   │   ├── home.css                      # home page (hd-*) styles
│   │   └── photography.css               # photography page + masonry styles
│   └── types.ts                          # canonical data model (Photo, ExperienceEntry, ProjectEntry, SkillGroup, etc.) — NOT yet used by admin (documented drift)
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.js                        # images.unoptimized: true (Cloudflare doesn't support next/image optimization); R2 remotePattern
├── package.json
├── package-lock.json
├── tsconfig.json                         # path alias: "@/*" → "./src/*"
├── tsconfig.tsbuildinfo                  # generated, not source
└── wrangler.toml                         # Cloudflare Pages config: pages_build_output_dir, R2 binding, Analytics Engine binding, plain env vars
```

## Directory Purposes

**`data/`:**
- Purpose: The entire content database of the site. No runtime DB — this JSON, committed to `main`, IS production content.
- Contains: 4 JSON files, each imported directly (`import x from "../../data/x.json"`) by exactly the pages/admin listed in "Key File Locations" below.
- Key files: all four are equally load-bearing; `portfolio_images.json` is the largest and most frequently mutated (every photo upload appends to it).

**`src/app/api/`:**
- Purpose: Every server-side mutation in the app — all are thin proxies to the GitHub REST/Git Data API or to Cloudflare bindings (R2, Analytics Engine). No route talks to a database.
- Contains: One `route.ts` per concern; all export `runtime = "edge"`; all except `track` call `requireAccess()` first.
- Key files: `deploy/route.ts` (the multi-file commit path — most complex), `data/route.ts` (the GET counterpart the admin should but does not yet call on mount).

**`src/components/admin/`:**
- Purpose: All admin-editor UI.
- Contains: A mix of currently-wired components (5 files) and dead/superseded ones (7 files) — see the Directory Layout listing above for the split. When porting, use the wired 5 as the functional spec; ignore the dead 7 except as historical reference for what NOT to rebuild.

**`scripts/`:**
- Purpose: Node.js-only image processing, run exclusively inside GitHub Actions (never inside the Next.js app or the Cloudflare Worker).
- Contains: Two workflow entrypoints (`action-process.js`, `action-process-dispatch.js`) sharing one processing core (`process-images.js`); plus two one-off maintenance scripts (`migrate-existing.js`, `reprocess-all.js`) not invoked by any workflow — check before assuming these still apply to the current manifest shape.
- Generated: No. Committed: Yes.

**`new-photos/`:**
- Purpose: Inbox directory for the push-triggered photo pipeline (Path A in ARCHITECTURE.md). Only `.gitkeep` is normally committed; photo files land here transiently between an `/api/upload` commit and the Action consuming/deleting them.
- Generated: Transient content yes (deleted by the Action after processing); directory itself: committed via `.gitkeep`.

**`design_handoff_portfolio/`:**
- Purpose: Static HTML design-handoff export (looks like a design tool's code export — `*.dc.html` files + `support.js`) kept for visual reference. Not imported by any app code (verified: no references from `src/`).
- Generated: External tool output. Committed: Yes, but not part of the runtime app.

**`docs/superpowers/`:**
- Purpose: Planning/spec documents for a "superpowers" initiative (unrelated to the Next→Astro port tracked by `.planning/`). Not app code.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML shell, metadata, theme-flash inline script, JSON-LD — Next-specific, will not port directly to Astro (Astro layouts replace this).
- `src/app/page.tsx`: Public home page.
- `src/app/portfolio/page.tsx`: Public photography grid page.
- `src/app/resume/page.tsx`: Public resume/dev page.
- `src/app/admin/page.tsx`: Admin editor (single file, ~810 lines) — the biggest single porting target.

**Configuration:**
- `wrangler.toml`: Cloudflare Pages bindings (`PORTFOLIO_BUCKET` R2, `PHOTO_ANALYTICS` Analytics Engine), plain vars (`GITHUB_REPO`, `R2_PUBLIC_URL`), `pages_build_output_dir = ".vercel/output/static"`.
- `next.config.js`: `images.unoptimized: true` (required since Cloudflare doesn't run Next's image optimizer) + R2 `remotePatterns` allow-list.
- `tsconfig.json`: `@/*` path alias → `./src/*`.
- `.npmrc`: present at repo root — existence noted only, contents not read (may contain registry/auth config).

**Core Logic (data flow):**
- `src/app/api/deploy/route.ts`: Multi-file GitHub commit (the "Save & Deploy" backend).
- `src/app/api/dispatch/route.ts`: Triggers the photo-processing GitHub Action (R2 `temp/` path — currently unused by the wired admin UI, see ARCHITECTURE.md constraints).
- `src/app/api/upload/route.ts`: The upload path actually wired to the admin UI today — commits raw file to `new-photos/`.
- `scripts/process-images.js`: The entire image-processing algorithm (resize variants, watermark, EXIF, R2 upload).
- `src/lib/access.ts`: Auth gate used by every mutating route.

**Testing:**
- Not applicable — no test files, test runner, or test config found anywhere in the repo (confirmed via `find . -name "*.test.*" -o -name "*.spec.*"` returning nothing under `src/`, `scripts/`, or root).

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g. `PropertiesPanel.tsx`, `DeployButton.tsx`).
- Hooks: `camelCase.ts` prefixed `use` (e.g. `useScrollTitle.ts`).
- Lib utilities: `camelCase.ts`, one export focus per file (e.g. `access.ts` exports `requireAccess`; `base64.ts` exports `toBase64`).
- API routes: fixed Next.js convention `route.ts` inside a `kebab-case` or single-word directory named for the endpoint (`upload-asset/route.ts` → `/api/upload-asset`).
- Scripts: `kebab-case.js` (CommonJS `require`, not ESM — distinct from the rest of the TS/ESM codebase).
- Data files: `snake_case.json` (`portfolio_images.json`, `home_config.json`, `site_config.json`) — inconsistent with `resume.json`'s single-word name.

**Directories:**
- Route segments under `src/app/` are lowercase, matching the URL path (`portfolio/`, `resume/`, `admin/`).
- Component subdirectories group by audience, not by feature: `components/admin/` vs. flat `components/*.tsx` for everything public.

## Where to Add New Code

**New public page:**
- Route: new directory under `src/app/<route>/` with `page.tsx` (+ optional `layout.tsx` for metadata).
- Data: add a new `data/<name>.json` file and `import` it directly in the page component (matches existing pattern in `page.tsx`/`portfolio/page.tsx`/`resume/page.tsx`).

**New admin editor field/section:**
- Add a new `Selection` union variant in `src/components/admin/PropertiesPanel.tsx` (type export at top of file) and a matching `if (selection.type === "...")` render branch.
- Add corresponding state + update handler in `src/app/admin/page.tsx` (follow the existing `handleUpdate*`/`handleDelete*`/`handleAdd*` naming pattern) and thread it through to `PropertiesPanel` props.
- If it needs its own file to persist, add it to the `files[...]` diff logic in `src/components/admin/DeployButton.tsx` and to the path allow-list check in `src/app/api/deploy/route.ts` (currently requires all paths start with `data/`).

**New API route:**
- Create `src/app/api/<name>/route.ts`; always start with `export const runtime = "edge";` and call `requireAccess()` first unless the route is intentionally public (only current precedent: `/api/track`).
- Remember: no `functions/` directory — next-on-pages ignores it; this constraint is specific to the current Next.js deployment path and does not necessarily carry over to the Astro + `@astrojs/cloudflare` replacement, which has its own routing/binding model to verify.

**Utilities:**
- Shared helpers: `src/lib/*.ts` — currently only 2 files; keep the one-concern-per-file convention.

## Special Directories

**`.vercel/` and `.next/` (not listed above, git-ignored):**
- Purpose: Build output directories — `.next/` from `next build`, `.vercel/output/static` is next-on-pages' emitted Cloudflare Worker bundle (`_worker.js`) that `wrangler.toml` points Cloudflare Pages at.
- Generated: Yes. Committed: No.

**`new-photos/`:**
- Purpose: Transient inbox for the push-triggered photo pipeline; see Directory Purposes above.
- Generated: Contents yes (photo files come and go); directory placeholder (`.gitkeep`) is committed.

**`public/`:**
- Purpose: Static files served verbatim by Next/Cloudflare Pages — fonts, the downloadable resume PDF (mutable via `/api/upload-resume`), a handful of project-logo icons, favicon.
- Generated: No (except `resume.pdf`, which is overwritten by the admin upload flow). Committed: Yes.

---

*Structure analysis: 2026-08-16*
