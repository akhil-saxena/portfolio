# Technology Stack

**Analysis Date:** 2026-08-16

> This repo (Next.js 15 + Cloudflare Pages) is being replaced by a new Astro + React islands app. This document is weighted toward what must be ported: the admin/API surface, data schemas, and the Cloudflare/GitHub integration model. Public-page rendering (styling, fonts, layout components) is covered only lightly.

## Languages

**Primary:**
- TypeScript 5 (`^5` in `package.json`) — all app/route code under `src/`
- JavaScript (CommonJS) — standalone Node scripts run only by GitHub Actions: `scripts/process-images.js`, `scripts/action-process.js`, `scripts/action-process-dispatch.js`, `scripts/migrate-existing.js`, `scripts/reprocess-all.js` (excluded from ESLint via `eslint.config.mjs` `globalIgnores: ["scripts/**"]`, and excluded from the Next bundle)

**Config:** `tsconfig.json` — `target: ES2017`, `strict: true`, `moduleResolution: "bundler"`, path alias `@/*` → `./src/*`, `jsx: "preserve"` (Next plugin).

## Runtime

**Environment:**
- Deployed runtime: Cloudflare Pages edge Workers runtime (V8 isolates), NOT Node.js. Every API route file exports `export const runtime = "edge"` (Next.js Edge Runtime), which `@cloudflare/next-on-pages` compiles into the single `_worker.js` Cloudflare Worker.
- Local dev runtime: Node.js via `next dev` (plain Node/V8, no Cloudflare bindings available — see access.ts / Cloudflare Bindings section below).
- GitHub Actions runtime: Node.js 20 (`.github/workflows/process-photos.yml` → `actions/setup-node@v4`, `node-version: 20`) for image-processing scripts; CI workflow (`.github/workflows/ci.yml`) uses Node 20 as well (`node-version: "22"` in ci.yml — note: ci.yml uses 22, process-photos.yml uses 20).
- No `.nvmrc`, no `engines` field in `package.json` — Node version is pinned only inside each GitHub Actions workflow file.

**Package Manager:**
- npm (package-lock.json present — lockfile committed)
- `.npmrc`: `legacy-peer-deps=true` (needed because of React 19 + some peer-dep mismatches)

## Frameworks

**Core:**
- Next.js `^15.5.19` (App Router) — recently bumped from 15.2.4 for critical CVEs (see git log `1435ac1`)
- React `^19.2.4` / React DOM `^19.2.4`
- `@cloudflare/next-on-pages` `^1.13.16` — build adapter that converts the Next.js build output into a Cloudflare Pages-compatible Worker (`_worker.js` in `.vercel/output/static`, per `wrangler.toml` `pages_build_output_dir`)

**Auth/JWT:**
- `jose` `^5.9.6` — used only in `src/lib/access.ts` for remote JWKS fetch + JWT verification of Cloudflare Access tokens

**Drag & drop (admin photo reorder):**
- `@atlaskit/pragmatic-drag-and-drop` `^1.7.9`
- `@dnd-kit/core` `^6.3.1`, `@dnd-kit/sortable` `^10.0.0`, `@dnd-kit/utilities` `^3.2.2`

**Touch gestures (lightbox swipe):**
- `react-swipeable` `^7.0.2`

**Testing:** None detected — no test framework, no test files (`*.test.*`/`*.spec.*` not found).

**Build/Dev/Lint:**
- ESLint `^9` with `eslint-config-next` `^16.2.1` (flat config, `eslint.config.mjs`)
- TypeScript `^5`, checked via `tsc --noEmit` (`npm run typecheck`)
- `next build` (also typechecks)

## Key Dependencies

**Critical (production, `dependencies`):**
- `next` `^15.5.19` — framework, routing, API route handlers
- `react` / `react-dom` `^19.2.4`
- `@cloudflare/next-on-pages` `^1.13.16` — Cloudflare Pages build adapter and `getRequestContext()` API for accessing bindings
- `jose` `^5.9.6` — Cloudflare Access JWT verification (`src/lib/access.ts`)
- `@atlaskit/pragmatic-drag-and-drop`, `@dnd-kit/*` — admin photo-reorder drag & drop (lower priority, admin UI only)
- `react-swipeable` — public gallery lightbox swipe navigation (lower priority)

**DevDependencies used ONLY by GitHub Actions scripts (not part of the Next app bundle at all):**
- `sharp` `^0.34.5` — image resize/WebP encode/watermark compositing, used exclusively in `scripts/process-images.js`
- `exifr` `^7.1.3` — EXIF metadata extraction, used exclusively in `scripts/process-images.js`
- `@aws-sdk/client-s3` `^3.1019.0` — S3-compatible client used to talk to Cloudflare R2 from Node (Actions runner), used in `scripts/process-images.js` (`createR2Client`), `scripts/action-process.js`, `scripts/action-process-dispatch.js`, `scripts/migrate-existing.js`, `scripts/reprocess-all.js`. **These three deps (`sharp`, `exifr`, `@aws-sdk/client-s3`) never run in the Cloudflare Worker/edge runtime — R2 access from edge routes goes through the Cloudflare R2 binding (`PORTFOLIO_BUCKET`), not this SDK.**

**Other devDependencies:**
- `@cloudflare/workers-types` `^4.20260317.1` — TS types for Workers/Cloudflare runtime globals
- `@types/node` `^20`, `@types/react` `^19`, `@types/react-dom` `^19`
- `typescript` `^5`, `eslint` `^9`, `eslint-config-next` `^16.2.1`

## Configuration

**Environment (plain `process.env`, string vars — Pages "Variables" in dashboard):**
- `GITHUB_PAT` — GitHub Personal Access Token with repo contents/workflow write scope; used by `/api/data`, `/api/deploy`, `/api/dispatch`, `/api/upload`, `/api/upload-resume` to call the GitHub REST/Git API
- `GITHUB_REPO` — `"akhil-saxena/portfolio"` (also set as a `[vars]` default in `wrangler.toml`, but production value comes from the Pages dashboard)
- `R2_PUBLIC_URL` — public base URL for the R2 bucket, `"https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev"` (also defaulted in `wrangler.toml [vars]`)
- `CF_ACCESS_TEAM_DOMAIN` — e.g. `"myteam.cloudflareaccess.com"`; when set together with `CF_ACCESS_AUD`, enables strict JWT verification in `src/lib/access.ts`
- `CF_ACCESS_AUD` — the Cloudflare Access application's AUD tag; paired with `CF_ACCESS_TEAM_DOMAIN`
- No `.env` file exists in the repo (confirmed absent) — all env vars are configured via the Cloudflare Pages dashboard and `wrangler.toml [vars]` (for the two non-secret defaults).

**Cloudflare bindings (NOT on `process.env` — resource bindings declared in `wrangler.toml`, only reachable via `getRequestContext().env` from `@cloudflare/next-on-pages`):**
- `PORTFOLIO_BUCKET` — R2 bucket binding, `bucket_name = "portfolio-photos"` (`wrangler.toml` `[[r2_buckets]]`)
- `PHOTO_ANALYTICS` — Analytics Engine binding, `dataset = "photo_views"` (`wrangler.toml` `[[analytics_engine_datasets]]`)
- Both bindings are unavailable under plain `next dev` (no Cloudflare request context in local Node dev) — every call site wraps binding access in a guard/try-catch so local dev doesn't 500 (`src/app/api/track/route.ts`, `src/app/api/upload-asset/route.ts`).

**Build:**
- `next.config.js` — `images.unoptimized: true` (no Next image optimization at the edge), `images.remotePatterns` allow-lists the R2 public hostname `pub-2d90aedeebcf4142afe524930c3b6471.r2.dev`
- `wrangler.toml` — `compatibility_date = "2024-09-23"`, `compatibility_flags = ["nodejs_compat"]`, `pages_build_output_dir = ".vercel/output/static"` (output of `@cloudflare/next-on-pages`)
- **Important deploy-shape note:** a top-level `functions/` directory is explicitly NOT used/ignored under this build mode — all server code must live in `src/app/api/*/route.ts` App Router handlers, each exporting `export const runtime = "edge"`. This is stated as a hard constraint in `AGENTS.md`.

## Platform Requirements

**Development:**
- Node.js (20+ recommended, matching Actions runner; no enforced `engines`/`.nvmrc`)
- `npm install` (uses `legacy-peer-deps=true` via `.npmrc`)
- `npm run dev` → plain `next dev` (no Cloudflare bindings; binding-dependent routes degrade gracefully)

**Production:**
- Cloudflare Pages, build command produces `.vercel/output/static` via `@cloudflare/next-on-pages`, live at akhilsaxena.pages.dev
- GitHub Actions (`ubuntu-latest`, Node 20) runs the photo-processing pipeline and CI checks
- Secrets required in GitHub Actions (`process-photos.yml`): `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL` (S3-compatible R2 API credentials — separate from the Cloudflare Pages `PORTFOLIO_BUCKET` binding used at request time)

---

*Stack analysis: 2026-08-16*
