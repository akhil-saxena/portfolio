# Portfolio — agent guide

Personal portfolio + photography site. Stock **Next.js 15 (App Router) + React 19**,
deployed to **Cloudflare Pages via `@cloudflare/next-on-pages`**. Live at
[akhilsaxena.pages.dev](https://akhilsaxena.pages.dev).

## How it deploys (read this before touching the API)

- The Pages build runs next-on-pages, which emits a single `_worker.js` into
  `.vercel/output/static` (see `wrangler.toml`). **A top-level `functions/`
  directory is ignored** in this mode — don't add one (the project used to have
  one; it 404'd and was removed). All server code lives in `src/app/api/*/route.ts`.
- Every API route handler **must** `export const runtime = "edge"`.
- Plain string env vars (`GITHUB_PAT`, `GITHUB_REPO`, `R2_PUBLIC_URL`) are read via
  `process.env`. **Cloudflare bindings** (R2 `PORTFOLIO_BUCKET`, Analytics Engine
  `PHOTO_ANALYTICS`) are NOT on `process.env` — get them from
  `getRequestContext().env` (`@cloudflare/next-on-pages`). They're unavailable under
  plain `next dev`, so guard binding access so local dev doesn't 500.

## Data & content flow

- Site content is committed JSON in `data/` (`resume.json`, `portfolio_images.json`,
  `home_config.json`, `site_config.json`), imported at build time by the pages.
- The `/admin` editor (behind Cloudflare Access) edits that data and writes it back
  by committing to the repo via the **GitHub Contents/Git API** in `/api/deploy`
  (and `/api/upload*`). Pushing to `main` triggers the Pages rebuild. There is **no
  runtime filesystem** to write to.
- Photos: admin uploads to R2 (`temp/`) → `/api/dispatch` triggers
  `.github/workflows/process-photos.yml` → `scripts/process-images.js` resizes
  (sharp) + reads EXIF (exifr) and commits processed images. `sharp`/`exifr`/
  `@aws-sdk/client-s3` are devDeps used only by those Actions scripts.

## Auth

Cloudflare Access (email-code) gates `/admin` and all `/api/*` except `/api/track`.
In-code, mutating routes call `requireAccess()` (`src/lib/access.ts`) — it verifies
the signed `Cf-Access-Jwt-Assertion` JWT when `CF_ACCESS_TEAM_DOMAIN` +
`CF_ACCESS_AUD` are set, and otherwise falls back to a cookie-presence check. Set
those two env vars in the Pages dashboard to enable strict server-side verification.

## Checks

`npm run lint` (eslint) and `npm run typecheck` (`tsc --noEmit`) — both run in CI
(`.github/workflows/ci.yml`). `next build` also typechecks.
