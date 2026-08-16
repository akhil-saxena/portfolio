# External Integrations

**Analysis Date:** 2026-08-16

> Weighted for a port to a new Astro + React islands app. Every API route, auth flow, and data schema below is intended to be reproduced as-is by the new app; public-page rendering integrations are out of scope for the rewrite and are not detailed here.

## Admin/API Surface — `src/app/api/*/route.ts`

All routes below export `export const runtime = "edge"` (Cloudflare Pages Edge Runtime via `@cloudflare/next-on-pages`). All except `/api/track` are gated at the edge by Cloudflare Access AND in-code by `requireAccess()` (see Auth section). Cloudflare Access allows `/api/track` through unauthenticated (public gallery view-tracking).

### `GET /api/data` — `src/app/api/data/route.ts`
- Auth: `requireAccess(request)` (401 if denied)
- Requires env: `GITHUB_PAT`, `GITHUB_REPO` (500 `{error:"Missing env vars"}` if absent)
- Fetches in parallel via GitHub REST API (raw content, using `Accept: application/vnd.github.raw+json`):
  - `GET https://api.github.com/repos/{repo}/contents/data/portfolio_images.json`
  - `GET https://api.github.com/repos/{repo}/contents/data/resume.json`
  - `GET https://api.github.com/repos/{repo}/git/ref/heads/main` (with `Accept: application/vnd.github+json`) — to read current HEAD commit SHA
- Headers used on every GitHub call: `Authorization: Bearer {GITHUB_PAT}`, `User-Agent: portfolio-admin`
- Response 200: `{ photos: <portfolio_images.json content>, resume: <resume.json content>, commitSha: string }`, `Cache-Control: no-store`
- Response 502 if any of the three GitHub calls fail; 500 on thrown error
- **Known gap (documented in code comment in `/api/deploy`):** the admin UI currently does NOT call this endpoint on mount — it should, to seed editor state and use the returned `commitSha` as `baseSha` for the deploy conflict-check (see below). The new app must wire this up properly.

### `POST /api/deploy` — `src/app/api/deploy/route.ts`
- Auth: `requireAccess(request)`
- Requires env: `GITHUB_PAT`, `GITHUB_REPO`
- Request body: `{ files: Record<string, string>, baseSha: string, message: string }`
  - `files`: map of repo-relative path → full new file content (stringified JSON). **All paths must start with `"data/"`** — validated server-side (400 `Invalid file path` otherwise).
  - `baseSha`: expected current HEAD SHA the client's edit is based on, for optimistic-concurrency conflict detection. **Current admin UI (`src/components/admin/DeployButton.tsx` line 86) always sends the literal string `"latest"`, which bypasses the conflict check entirely** — a documented gap; the rebuilt admin must pass a real `commitSha` from `/api/data`.
  - `message`: commit message (client currently sends the fixed string `"chore: update portfolio data via admin"`)
- Flow (uses the GitHub Git Data API, not Contents API, so multiple files can be committed atomically):
  1. `GET /repos/{repo}/git/ref/heads/main` → current HEAD sha
  2. If `baseSha !== "latest"` and it doesn't match current HEAD → `409 { error: "conflict", message, currentSha }`
  3. For each file: `POST /repos/{repo}/git/blobs` with `{content, encoding: "utf-8"}` → blob sha
  4. `POST /repos/{repo}/git/trees` with `{base_tree: currentSha, tree: [{path, mode: "100644", type: "blob", sha}, ...]}` → new tree sha
  5. `POST /repos/{repo}/git/commits` with `{message, tree: treeSha, parents: [currentSha]}` → new commit sha
  6. `PATCH /repos/{repo}/git/refs/heads/main` with `{sha: commitSha, force: false}` — a 422 here is treated as a conflict (409 to client), any other failure is 502
- Response 200: `{ sha: string, status: "committed" }`
- **Pushing to `main` is what triggers the Cloudflare Pages rebuild** (Cloudflare Pages GitHub integration, external to this codebase — no explicit webhook code)
- Currently called from `src/components/admin/DeployButton.tsx` with all four possible `data/*.json` files diffed client-side against `initialX` props before inclusion (only changed files are sent): `data/portfolio_images.json`, `data/resume.json`, `data/site_config.json`, `data/home_config.json`

### `POST /api/dispatch` — `src/app/api/dispatch/route.ts`
- Auth: `requireAccess(request)`
- Requires env: `GITHUB_PAT`, `GITHUB_REPO`
- **Not currently called from any client code** (`grep` across `src/` finds no fetch to `/api/dispatch` — this is a built-but-unwired endpoint; the admin's actual photo-upload path is `/api/upload`, see below)
- Request body: `{ tempKey: string, title: string, category: string, tags?: string[] }`
  - `tempKey` validated against `^temp\/[a-zA-Z0-9._/-]+$` (constrains to the R2 `temp/` prefix)
- Flow:
  1. `POST /repos/{repo}/actions/workflows/process-photos.yml/dispatches` with `{ref: "main", inputs: {temp_key, title, category, tags: tags.join(",")}}` — triggers the `workflow_dispatch` branch of `.github/workflows/process-photos.yml`
  2. Polls (up to 10 attempts, 2s apart) `GET /repos/{repo}/actions/workflows/process-photos.yml/runs?per_page=5&event=workflow_dispatch` for a run created after the dispatch timestamp
- Response 200: `{ runId: number }`; 504 if no run found after polling; 502 if dispatch call fails
- **Implies a currently-missing piece:** something must first PUT the image into R2 at `temp/<key>` before calling this — no such upload-to-R2-temp route exists in `src/app/api/*`. The design intent (per `AGENTS.md`) is: admin uploads to R2 `temp/` → `/api/dispatch` → Action reads `temp_key`, processes, deletes it (see `scripts/action-process-dispatch.js`). The actual wired-up path today bypasses R2-temp entirely (see `/api/upload` below).

### `POST /api/upload` — `src/app/api/upload/route.ts` (the ACTUAL wired photo-upload path used by the admin today)
- Auth: `requireAccess(request)`
- No GitHub-independent limits: max 25 MB, allowed extensions `jpg jpeg png webp gif heic heif tif tiff`, `file.type` must be empty or start with `image/`
- Request: `multipart/form-data` with fields `file` (File), `category` (string, default `"uncategorized"`), `title` (string, default filename)
- Flow: base64-encodes the file (`src/lib/base64.ts` `toBase64`, chunked to avoid call-stack overflow) and commits it directly to the repo via the GitHub Contents API:
  - `PUT https://api.github.com/repos/{repo}/contents/new-photos/{safeCategory}/{safeName}.{ext}` with `{message: "chore: upload photo {safeName} via admin", content: base64}`
  - `safeName` = lowercased title with non-alphanumerics collapsed to `_`; `safeCategory` = category with non-`[a-zA-Z0-9_-]` stripped (default `"uncategorized"`)
- Response 200: `{ status: "uploaded", message, path }`; 502 on GitHub failure
- **This commit to `new-photos/**` is what triggers `.github/workflows/process-photos.yml`'s `push` trigger** (paths filter `new-photos/**`), which runs `scripts/action-process.js` (NOT the R2-temp/dispatch path) — see Image Pipeline section.
- Called from `src/app/admin/page.tsx` (`handlePhotoUpload`, ~line 249)

### `POST /api/upload-asset` — `src/app/api/upload-asset/route.ts`
- Auth: `requireAccess(request)`
- **Not currently called from any client code** (built but unwired, like `/api/dispatch`)
- Requires Cloudflare binding `PORTFOLIO_BUCKET` (via `getRequestContext().env`) — 500 `"Storage not configured"` if absent (e.g. under plain `next dev`)
- Request: `multipart/form-data`, fields `file` (File) and `path` (string), validated against `^(logos|icons)\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp|svg)$`; max 5 MB
- Flow: `env.PORTFOLIO_BUCKET.put("assets/" + path, arrayBuffer, {httpMetadata: {contentType}})`
- Response 200: `{ url: "{R2_PUBLIC_URL}/assets/{path}" }` (reads `R2_PUBLIC_URL` from the Cloudflare binding env, NOT `process.env`)
- Intended for uploading project/company logo icons referenced by `resume.json` (`logo`, `icon` fields)

### `POST /api/upload-resume` — `src/app/api/upload-resume/route.ts`
- Auth: `requireAccess(request)`
- Max 10 MB, must have `.pdf` extension AND pass a magic-byte check (`%PDF-` = `0x25 0x50 0x44 0x46 0x2d`) — 415 if not a valid PDF
- Requires env: `GITHUB_PAT`, `GITHUB_REPO`
- Flow: base64-encodes file, then GitHub Contents API:
  1. `GET /repos/{repo}/contents/public/resume.pdf` to fetch current file `sha` (needed to update an existing file; if absent, creates new)
  2. `PUT /repos/{repo}/contents/public/resume.pdf` with `{message: "chore: update resume PDF via admin", content: base64, sha?}`
- Response 200: `{ status: "uploaded", message: "Resume updated! Site will rebuild." }`; 502 on GitHub failure
- Called from `src/components/admin/PropertiesPanel.tsx` (~line 915)

### `POST /api/track` — `src/app/api/track/route.ts`
- **No auth** — explicitly excluded from Cloudflare Access enforcement (per `AGENTS.md`) so public visitors can trigger it
- Request: `{ photoId: string }` (validated: non-empty, ≤256 chars, else 400)
- Flow: best-effort write to the Analytics Engine binding:
  ```ts
  const env = getRequestContext().env as { PHOTO_ANALYTICS?: AnalyticsEngineDataset };
  env.PHOTO_ANALYTICS?.writeDataPoint({
    indexes: ["photo_view"],
    blobs: [photoId],
    doubles: [1],
  });
  ```
  Wrapped in try/catch that swallows errors — binding is unavailable under plain `next dev`, and tracking must never fail the request.
- Response: always `{ ok: true }` (200) or `{ error: "Error" }` (500) on outer failure
- Called from `src/components/Lightbox.tsx` (~line 105) on every photo view, fire-and-forget (`.catch(() => {})`)

## Auth — Cloudflare Access

**Provider:** Cloudflare Access (Zero Trust), email-code login, gates `/admin` and all of `/api/*` **except `/api/track`** at the Cloudflare edge (configured in the Cloudflare dashboard, not in this repo's code).

**In-code defense-in-depth:** `src/lib/access.ts`, function `requireAccess(request: NextRequest): Promise<NextResponse | null>`
- Returns `null` if the request may proceed, or a `401 {error: "Unauthorized"}` `NextResponse` if not.
- Usage pattern in every protected route: `const denied = await requireAccess(request); if (denied) return denied;`
- **Strict mode** (JWT verification) activates only when BOTH `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` env vars are set:
  - Reads the `Cf-Access-Jwt-Assertion` request header (set by Cloudflare Access at the edge)
  - Verifies it using `jose`'s `jwtVerify` against a remote JWKS at `https://{CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs` (fetched via `createRemoteJWKSet`, cached per team-domain in a module-level `Map`)
  - Verification options: `{ issuer: "https://{CF_ACCESS_TEAM_DOMAIN}", audience: CF_ACCESS_AUD }`
  - Any missing header or verification failure → 401
- **Fallback mode** (when either env var is unset): only checks that the request's `Cookie` header contains `CF_Authorization=` (presence check only — NOT a cryptographic guarantee, relies entirely on Access already gating the path at the edge). This mode exists so enabling the strict-mode env vars can never accidentally lock out the live admin before they're configured — designed to be safely tightened later.
- **Env vars:**
  - `CF_ACCESS_TEAM_DOMAIN` — e.g. `"myteam.cloudflareaccess.com"`
  - `CF_ACCESS_AUD` — the Access application's AUD tag
  - Both must be set together in the Cloudflare Pages dashboard to enable strict verification; neither appears to be set in `wrangler.toml [vars]` (only non-secret defaults are there), implying they are (or should be) configured directly in the Pages dashboard as secrets.

## Data Storage / Publishing Model

**"Database":** None — there is no runtime database. All content is committed JSON in `data/`, read at Next.js build time by pages, and read/written at admin-runtime via the **GitHub Contents/Git Data REST API** (not a git CLI, not a local filesystem — Cloudflare Workers have no writable FS). This GitHub-as-database + rebuild-on-push model is the core publishing mechanism to port.

- `GITHUB_PAT` — GitHub Personal Access Token (repo contents + workflow dispatch scopes required); read via `process.env.GITHUB_PAT` in every route that talks to GitHub
- `GITHUB_REPO` — `"akhil-saxena/portfolio"`; read via `process.env.GITHUB_REPO`
- Every GitHub API call sets `User-Agent: portfolio-admin` and `Authorization: Bearer {GITHUB_PAT}`
- A push to `main` (from `/api/deploy`, `/api/upload`, or `/api/upload-resume`, or from the `process-photos` Action's own commit) triggers Cloudflare Pages' native GitHub integration to rebuild and redeploy — this is configured in the Cloudflare Pages dashboard, not in repo code.

**File Storage (photos/images):**
- Cloudflare R2 (S3-compatible object storage), bucket name `portfolio-photos`
- **At request time (edge routes):** accessed exclusively via the Cloudflare Pages **binding** `PORTFOLIO_BUCKET` (declared in `wrangler.toml` `[[r2_buckets]]`), obtained via `getRequestContext().env.PORTFOLIO_BUCKET` — never via `process.env` and never via the AWS S3 SDK. Only `/api/upload-asset` uses this today.
- **In GitHub Actions (image processing scripts):** accessed via the AWS S3-compatible SDK (`@aws-sdk/client-s3`), using distinct R2 API credential secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` — all GitHub Actions repo secrets, separate from the Pages binding). See `scripts/process-images.js` `createR2Client()`.
- Public base URL: `R2_PUBLIC_URL` = `https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev` (set both as a `wrangler.toml [vars]` default and as a GitHub Actions secret)
- R2 key layout: `photos/{category}/{slug}{variant-suffix}.webp` (public, watermarked variants), `private/{category}/{slug}-clean.webp` (unwatermarked original, not referenced in `data/portfolio_images.json` — for the owner's private access only), `assets/{logos|icons}/{name}.{ext}` (via `/api/upload-asset`), `temp/{key}` (intended transient staging for the dispatch flow — see gap noted above)

**Caching:** None detected (no Redis/KV/edge-cache config beyond `Cache-Control: no-store` on `/api/data`).

## Authentication & Identity

Covered above under "Auth — Cloudflare Access". No other identity provider; the site has a single admin user model (whoever passes Cloudflare Access).

## Monitoring & Observability

**Error Tracking:** None (no Sentry/Bugsnag). Errors are `console.error`-logged inside route handlers and returned as JSON error responses.

**Analytics:** Cloudflare Analytics Engine, binding `PHOTO_ANALYTICS`, dataset `photo_views` (`wrangler.toml [[analytics_engine_datasets]]`). Single write path: `/api/track` (see above). No corresponding read/query code found in this repo (querying is presumably done via the Cloudflare dashboard or the Analytics Engine SQL API externally).

## CI/CD & Deployment

**Hosting:** Cloudflare Pages, build output `.vercel/output/static` (produced by `@cloudflare/next-on-pages`), live at `akhilsaxena.pages.dev`. Pages auto-builds on every push to `main` (native Cloudflare↔GitHub integration, not visible as code in this repo).

**CI Pipeline:** `.github/workflows/ci.yml` — on push to `main` and on PRs: `npm ci` → `npm run lint` (ESLint) → `npm run typecheck` (`tsc --noEmit`). Node 22, npm cache.

**Photo processing pipeline:** `.github/workflows/process-photos.yml` (permissions: `contents: write`), two triggers:
1. `push` to `main` with changed paths matching `new-photos/**` → runs `scripts/action-process.js` (reads all files under `new-photos/<category>/`, processes each, updates `data/portfolio_images.json`, deletes the source files, commits+pushes). This is the path actually exercised today (fed by `/api/upload`).
2. `workflow_dispatch` (manual or via `/api/dispatch`) with inputs `temp_key`, `title`, `category`, `tags` → runs `scripts/action-process-dispatch.js` (downloads a single object from R2 `temp_key`, processes it, appends to `data/portfolio_images.json`, deletes the R2 temp object, commits+pushes). This path is built but currently unreachable from the live admin UI (see `/api/dispatch` gap above).
- Both scripts share `scripts/process-images.js` (`processImage`, `createR2Client`, `slugify`, `titleCase`, `extractExif`, `addWatermark`) — see Image Pipeline below.
- Final step in both trigger paths: `git add data/portfolio_images.json new-photos/`, commit (`"chore: process new photos and update manifest"`), `git push` as `github-actions[bot]`.

**Image Processing details (`scripts/process-images.js`):**
- Reads EXIF via `exifr.parse(filePath, {pick: ["Make","Model","LensModel","FNumber","ExposureTime","ISO","FocalLength"], gps: false})`, maps to `{camera, lens, aperture, shutter, iso, focalLength}` (all nullable; on any exifr error the whole exif object is `null` at the entry level, defaulted to an all-null shape by call sites)
- Generates 4 WebP variants via `sharp`, each uploaded to R2:
  | Suffix | Max width | Quality | `urls` key |
  |---|---|---|---|
  | `` (none) | 2000 | 85 | `original` |
  | `-lg` | 1200 | 85 | `large` |
  | `-md` | 800 | 85 | `medium` |
  | `-sm` | 400 | 80 | `small` |
- Every served variant gets an SVG-text watermark ("akhil saxena", bottom-right, `rgba(255,255,255,0.20)`, monospace) composited via `sharp` before upload
- Separately uploads an **unwatermarked** clean copy to `private/{category}/{slug}-clean.webp` (2000px max, quality 85) — not exposed in the public JSON
- Generates a 40px-wide, quality-60 WebP thumbnail and embeds it as a base64 data URI directly in the JSON (`urls.thumb`, e.g. `data:image/webp;base64,...`) — used as an LQIP blur placeholder, no R2 round-trip
- `id` = `{category}-{slugify(baseName)}`; `slugify` = lowercase, spaces→`-`, strip non `[a-z0-9-]`; duplicate `id` aborts processing for that image (`action-process-dispatch.js` exits with error; `action-process.js` skips with a warning and continues with the rest)
- `order` = `max(existing orders) + 1`, assigned sequentially as images are appended
- `date` = today's date (`YYYY-MM-DD`) at processing time — NOT the photo's EXIF capture date

**Utility scripts (devDep-only, not part of the automated pipeline):**
- `scripts/migrate-existing.js` — one-off migration importing photos from a sibling `../../temp-website-project/akhil-photo/public/images/portfolio` directory (external to this repo; historical use only)
- `scripts/reprocess-all.js` — re-runs processing over all existing entries (maintenance script)

## Environment Configuration Summary

**Plain string vars (`process.env`, Pages dashboard "Variables"; two also default in `wrangler.toml [vars]`):**
- `GITHUB_PAT` (secret)
- `GITHUB_REPO` (`"akhil-saxena/portfolio"`)
- `R2_PUBLIC_URL` (`"https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev"`)
- `CF_ACCESS_TEAM_DOMAIN` (secret/config, enables strict Access JWT verification)
- `CF_ACCESS_AUD` (secret/config, enables strict Access JWT verification)

**Cloudflare resource bindings (`wrangler.toml`, accessed only via `getRequestContext().env` from `@cloudflare/next-on-pages`, unavailable in plain `next dev`):**
- `PORTFOLIO_BUCKET` — R2 bucket `portfolio-photos`
- `PHOTO_ANALYTICS` — Analytics Engine dataset `photo_views`

**GitHub Actions secrets (`process-photos.yml` env, Node/S3-SDK context only — distinct from the above):**
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL`

**Secrets location:** Cloudflare Pages dashboard (Variables/Secrets) for edge runtime vars + bindings config in `wrangler.toml`; GitHub repo Settings → Secrets and variables → Actions for the image-processing pipeline's R2 S3 credentials. No `.env` file in the repo.

## Webhooks & Callbacks

**Incoming:** None — no webhook receiver endpoints in `src/app/api/*`.

**Outgoing:**
- GitHub REST/Git Data API calls (contents, git blobs/trees/commits/refs, workflow dispatch, workflow runs) — see per-route breakdown above. All authenticated with `GITHUB_PAT` as a Bearer token.
- Implicit "webhook": pushing to `main` triggers Cloudflare Pages' own build webhook (Cloudflare↔GitHub native integration; no code in this repo initiates or receives it).

## Data Schemas (`data/*.json`) — must be read as-is by the new app

Canonical TypeScript types are defined in `src/types.ts` (explicitly documented there as "the source of truth mirror" — note the comment that the admin UI's own local types have already drifted, e.g. splitting `period` into `startMonth`/`startYear`/etc., and should be reconciled against these when rebuilt).

### `data/portfolio_images.json` — array of `Photo`, 39 entries currently
```ts
interface Photo {
  id: string;                 // "{category}-{slugified-filename}", e.g. "abstract-intothemist"
  title: string;
  category: string;            // one of (currently): abstract, architecture, nature, portraits, product, street, wildlife
  tags: string[];               // currently all empty arrays in existing data
  date?: string;                 // "YYYY-MM-DD" — set to processing date, not EXIF date
  urls: {
    original: string;            // full R2 public URL, 2000px webp, watermarked
    large: string;                // "-lg", 1200px
    medium: string;               // "-md", 800px
    small: string;                 // "-sm", 400px
    thumb: string;                  // base64 data: URI, 40px LQIP blur placeholder (NOT an R2 URL)
  };
  exif?: {
    camera: string | null;
    lens: string | null;
    aperture: string | null;        // e.g. "f/11"
    shutter: string | null;          // e.g. "1/500" or "2s"
    iso: number | null;
    focalLength: string | null;       // e.g. "40mm"
  };
  order: number;                       // sort order, sequential int, max+1 on append
  dimensions?: { width: number; height: number };
}
```

### `data/resume.json` — single object
```ts
interface ResumeData {
  experience: {
    id: string; company: string; role: string;
    period: string;              // free-text range, e.g. "Jul 2023 – Present"
    location?: string; logo?: string | null; url?: string | null;
    bullets: string[];            // may contain inline <strong> HTML markup (author-controlled, rendered raw)
  }[];
  projects: {
    id: string; title: string;
    label?: { text: string; icon?: string };
    description: string; tech: string[];
    icon?: string | null;          // path like "/assets/hued-icon.png" or null
    href?: string;
    badges?: { label: string; href?: string; icon?: string }[];
  }[];
  skills: { category: string; icon?: string; items: string[] }[];
  education: {
    id: string; school: string; degree: string; period: string;
    cgpa?: string; logo?: string | null; url?: string | null;
    leadership?: string[];
  }[];
}
```

### `data/home_config.json` — single object (44 lines)
```json
{
  "title": "Akhil Saxena",
  "subtitle": "Interfaces & Imagery",
  "intro": "...",
  "peekIds": ["<photo id>", ...],
  "peekPositions": { "<photo id>": "<CSS object-position value e.g. '50% 25%'>" },
  "socialLinks": [{ "icon": "github|linkedin|mail", "url": "...", "label": "..." }],
  "ctas": [{ "text": "...", "link": "/portfolio", "style": "primary|secondary" }]
}
```

### `data/site_config.json` — single object (11 lines)
```json
{
  "categoryColumns": {
    "All": 3, "Abstract": 3, "Architecture": 3, "Nature": 2,
    "Portraits": 2, "Street": 2, "Wildlife": 2, "Product": 2
  }
}
```
Controls masonry-grid column count per gallery category filter.

---

*Integration audit: 2026-08-16*
