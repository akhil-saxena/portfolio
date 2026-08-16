# Coding Conventions

**Analysis Date:** 2026-08-16

**Context:** This is the legacy Next.js 15 + React 19 portfolio, about to be replaced by an
Astro + React-islands rebuild. This document separates conventions worth **carrying forward**
from gaps worth **fixing** in the rebuild.

## CI Gate — what is actually enforced today

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

```yaml
- run: npm ci
- run: npm run lint        # eslint (flat config, eslint.config.mjs)
- run: npm run typecheck   # tsc --noEmit
```

That is the **entire** automated gate. There is no test step (none exists — see TESTING.md),
no build step in CI (though `next build` also typechecks and is required to deploy on
Cloudflare Pages), and no formatting check (no Prettier config in the repo — formatting is
whatever eslint's rules pass, not auto-enforced).

**Carry forward:** keep `lint` + `typecheck` as a required PR gate — cheap, catches real
regressions before they reach the Cloudflare Pages build.

**Fix in rebuild:** add a test step and (ideally) a `next build` / `astro build` step to CI so
production build failures are caught before merge, not after Cloudflare's build (currently
`next.config.js` sets no `eslint.ignoreDuringBuilds` or `typescript.ignoreBuildErrors`
overrides, so both lint and typecheck errors would in fact fail the Pages build too if they
ran there — but CI itself doesn't invoke `next build`, so this safety net is only exercised at
deploy time, not at PR time).

### ESLint configuration (`eslint.config.mjs`)

Flat config (ESLint 9) composed from `eslint-config-next`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/**"]),
]);
```

- `scripts/**` (the Node/CommonJS Actions scripts: `scripts/process-images.js` etc.) is
  explicitly excluded — it's plain CommonJS run by GitHub Actions, not part of the Next.js
  bundle, and isn't held to the same (ESM/JSX-aware) ruleset.
- No custom rule overrides beyond the ignores — the project relies entirely on
  `eslint-config-next`'s `core-web-vitals` + `typescript` presets.

### TypeScript strictness (`tsconfig.json`)

```json
{
  "target": "ES2017",
  "strict": true,
  "skipLibCheck": true,
  "noEmit": true,
  "esModuleInterop": true,
  "moduleResolution": "bundler",
  "resolveJsonModule": true,
  "isolatedModules": true,
  "jsx": "preserve",
  "paths": { "@/*": ["./src/*"] }
}
```

**On:** `strict: true` (implies `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`,
`strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`, `noImplicitThis`).
`isolatedModules` and `resolveJsonModule` (required for the `import data from "../data/*.json"`
pattern used throughout pages).

**Off / not configured:** no `noUncheckedIndexedAccess`, no `noImplicitOverride`, no
`noFallthroughCasesInSwitch`, no `exactOptionalPropertyTypes`, no `noUnusedLocals` /
`noUnusedParameters` (unused-var checking is left to eslint, not tsc). `skipLibCheck: true`
means declaration files aren't type-checked (standard Next.js default, but means d.ts drift
in deps won't surface as an error here).

**`next.config.js` note:** the config (`images.unoptimized`, `images.remotePatterns` for the
R2 public hostname only) sets no `eslint.ignoreDuringBuilds` or `typescript.ignoreBuildErrors`
overrides, so both lint and typecheck are still active during `next build` — but CI's `lint`/
`typecheck` steps run independently via the npm scripts, not via `next build`, so PR checks and
the Cloudflare Pages build are two separate enforcement points that happen to agree today.
**Fix in rebuild:** if the new stack's build config ever gains an "ignore during build" escape
hatch, don't enable it — keep lint/typecheck blocking at both PR time and deploy time.

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx`, one component per file, matching the exported name
  (`src/components/SearchBar.tsx` exports `SearchBar`).
- Admin-only components live under `src/components/admin/` (still PascalCase) — a clear
  subdirectory split between public-site components and the WYSIWYG admin editor.
- Hooks: `useCamelCase.ts` under `src/hooks/` (`useInView.ts`, `useScrollTitle.ts`,
  `useSectionScrollTitle.ts`) — one hook per file, filename matches the exported function.
- Library/util modules: `camelCase.ts` under `src/lib/` (`access.ts`, `base64.ts`) — no
  `index.ts` barrel; each file is imported directly (`@/lib/access`, `@/lib/base64`).
- API routes: `src/app/api/<name>/route.ts` (Next.js App Router convention) — the `<name>`
  segment is kebab/lowercase (`upload-asset`, `upload-resume`, `dispatch`, `track`).
- Types: centralized in a single `src/types.ts` (not split per-domain) — see note below.

**Functions:**
- Exported API handlers are always named `GET` / `POST` (Next.js convention), one per file
  in most routes (no route currently exports more than one HTTP method).
- Regular functions: `camelCase`, verb-first (`toBase64`, `requireAccess`, `getJwks`,
  `unauthorized`).

**Variables:**
- `camelCase` throughout. Constants that are effectively fixed configuration are
  `UPPER_SNAKE_CASE` at module scope (`MAX_BYTES`, `ALLOWED_EXT`, `ALLOWED_PATH` in the
  upload routes).

**Types/Interfaces:**
- `PascalCase`, no `I`-prefix. Request/response shapes for API routes are declared as local
  `interface`s directly above the handler that uses them (e.g. `DeployRequest`, `GitBlob`,
  `GitTreeResponse` in `src/app/api/deploy/route.ts`) rather than imported from a shared
  types module — these are route-local, ad hoc, and not reused.
- Domain types (`Photo`, `PhotoExif`, `PhotoUrls`, `ExperienceEntry`, `EducationEntry`,
  `ProjectEntry`, `SkillGroup`, `ResumeData`) live in one file: `src/types.ts`.

**Known type drift (documented in-repo, worth fixing in rebuild):**
`src/types.ts` carries this comment verbatim:
> "the /admin editor (`src/app/admin/page.tsx`, `components/admin/PropertiesPanel.tsx`)
> still defines its own local copies that have drifted from these (e.g. it splits
> experience dates into `startMonth`/`startYear`/... while `resume.json` stores a single
> `period` string). When the admin is rebuilt, point it at these types."
This is a real, acknowledged inconsistency — the admin editor's local interfaces and the
canonical `src/types.ts` are not the same shape. **Fix in rebuild:** single source of truth
for these types, imported everywhere (editor, API routes, public pages).

## Code Style

**Formatting:**
- No Prettier config present anywhere in the repo (`.prettierrc*` absent). Formatting is
  whatever the author's editor/eslint produced — consistent but not tool-enforced.
  Observed style: 2-space indent, double quotes, semicolons, ~90-100 col soft wrap on long
  fetch/JSX chains.
- **Fix in rebuild:** add Prettier (or Biome) and wire it into CI so formatting is enforced,
  not just conventionally followed.

**Linting:**
- `eslint-config-next` (`core-web-vitals` + `typescript` presets) only — no custom rules.
  This means React hooks rules, `next/image` usage rules, and standard TS rules are
  enforced; nothing project-specific (no rule banning `any`, no import-order rule, etc.).

## Import Organization

No enforced import order (no `eslint-plugin-import` / `simple-import-sort` present). Observed
de-facto order in most files:
1. Framework imports (`next/server`, `next/image`, `next/link`, `react`)
2. Third-party packages (`jose`, `@cloudflare/next-on-pages`)
3. Internal absolute imports via `@/*` alias (`@/lib/access`, `@/components/...`, `@/hooks/...`)
4. Relative data/JSON imports (`../../data/portfolio_images.json` — see below)
5. CSS imports (`@/styles/*.css`) — always last

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`). Used consistently for everything under
  `src/` (components, hooks, lib).
- Data JSON files in `data/` are **not** under the `@/*` alias and are imported via relative
  paths that vary by nesting depth (`../../data/portfolio_images.json` from `src/app/page.tsx`,
  `../../../data/portfolio_images.json` from `src/app/portfolio/page.tsx`). **Fix in
  rebuild:** add a `@data/*` alias (or equivalent) so these imports aren't relative-path
  fragile when files move.

## Error Handling

**API routes — uniform pattern:**
Every route wraps its body in `try { ... } catch (err) { console.error(...); return
NextResponse.json({ error: "..." }, { status: 500 }); }`. Within the try block, expected
failure modes are checked explicitly and return early with a JSON error body and an
appropriate status code — there is no shared error-handling middleware or helper; each route
repeats the pattern inline. See `src/app/api/deploy/route.ts`, `src/app/api/data/route.ts`,
`src/app/api/dispatch/route.ts`, `src/app/api/upload/route.ts`,
`src/app/api/upload-asset/route.ts`, `src/app/api/upload-resume/route.ts`.

**Error response shape:** always `{ error: string }`, optionally with extra fields for
specific cases (`{ error: "conflict", message: "...", currentSha }` in `deploy/route.ts` for
409 responses). No error codes/enum, no consistent `details` field — just a human-readable
`error` string. **Fix in rebuild:** define one shared `ApiError` type/helper
(`{ error: string; code?: string }`) instead of each route inlining its own shape.

**Status codes used, and what they mean in this codebase:**
- `400` — malformed/missing input (missing required fields, invalid path format)
- `401` — `requireAccess()` rejection (see Auth section)
- `413` — file exceeds `MAX_BYTES`
- `415` — wrong file type/content (not an image, not a PDF)
- `409` — optimistic-concurrency conflict in `deploy/route.ts` (stale `baseSha`)
- `500` — internal error (env vars missing, unexpected exception, storage not configured)
- `502` — upstream GitHub API call failed (`!res.ok` from a GitHub fetch)
- `504` — dispatch/poll timeout waiting for a GitHub Actions run ID to appear

This 400/401/409/413/415/500/502/504 vocabulary is a good, sensible convention —
**carry forward** into the rebuild's API layer.

**GitHub API failures:** every `fetch()` to `api.github.com` is followed by an explicit
`if (!res.ok)` check that returns a `502` with a route-specific message (never leaks the raw
GitHub response body to the client, though it does `console.error` the status + body server-side
for debugging — see `dispatch/route.ts` line ~77 and `upload/route.ts` line ~59).

**Cloudflare binding access — local-dev guard pattern:**
Two different strategies are used depending on whether the binding is required or optional:
- **Required binding** (`upload-asset/route.ts`, R2 `PORTFOLIO_BUCKET`): read via
  `getRequestContext().env` and explicitly checked (`if (!env.PORTFOLIO_BUCKET) return
  NextResponse.json({ error: "Storage not configured" }, { status: 500 })`). Under plain
  `next dev` there is no Cloudflare request context, so `getRequestContext()` itself may throw —
  this route does NOT wrap that call in try/catch, meaning local `next dev` calls to this
  route will 500 with an unhandled exception rather than the clean "Storage not configured"
  message. **Fix in rebuild:** wrap `getRequestContext()` itself in a try/catch (or a shared
  helper) so the "not configured" branch is reachable in local dev, not just when the
  binding is merely undefined.
- **Optional/best-effort binding** (`track/route.ts`, Analytics Engine `PHOTO_ANALYTICS`):
  the entire `getRequestContext().env...writeDataPoint(...)` call is wrapped in its own
  inner `try { } catch { /* no Cloudflare binding in this context */ }` specifically so a
  missing binding **never** fails the request — tracking is fire-and-forget. This is the
  **correct** pattern and should be the template used everywhere bindings are accessed.
  **Carry forward:** the "swallow binding-access errors for non-critical writes" pattern
  from `src/app/api/track/route.ts`.

**Concurrency control:** `deploy/route.ts` implements optimistic concurrency via a
`baseSha`/`currentSha` comparison before committing (409 on mismatch), but the current admin
UI passes the literal string `"latest"` as `baseSha`, which **bypasses the check entirely**
and can silently overwrite newer data. This is called out explicitly in a code comment in
that file. **Fix in rebuild:** admin must fetch `/api/data` on mount, store the returned
`commitSha`, and pass the real value as `baseSha` on save — remove the `"latest"` escape hatch.

## Data Validation — explicit finding: there is none

- **No schema validation library** is used anywhere in the codebase or `package.json`
  (no `zod`, `yup`, `joi`, `ajv`, `superstruct` — confirmed via grep across `src/` and
  dependencies).
- **Committed JSON in `data/`** (`resume.json`, `portfolio_images.json`, `home_config.json`,
  `site_config.json`) is imported directly via `import data from "../../data/x.json"` and
  cast with `as Photo[]` / accessed with bare property reads — no runtime validation that the
  JSON actually matches `src/types.ts`. A malformed edit to these files (e.g. via the admin's
  GitHub commit path) would not be caught until a page throws at render time or `next build`
  fails on a type mismatch (and only if the cast surfaces the issue, which `as` casts largely
  suppress).
- **API request bodies** are validated with hand-rolled, per-field `if` checks only — see
  `deploy/route.ts` (`if (!files || typeof files !== "object" ...)`, `if (!baseSha ||
  typeof baseSha !== "string")`), `dispatch/route.ts` (regex-constrains `tempKey` to
  `^temp\/[a-zA-Z0-9._/-]+$`), `upload-asset/route.ts` (regex on `path`:
  `^(logos|icons)\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp|svg)$`). These are reasonable
  ad hoc guards but are not systematic — each route reinvents its own validation, error
  message, and status code, and there's no shared "validate this shape" utility.
- **Admin form input** (`src/components/admin/*.tsx`) has no client-side schema validation
  either — inputs are read as plain strings/state and passed straight through to the
  save/deploy API calls.

**Recommendation for rebuild:** adopt a schema library (zod is the natural fit given the
edge runtime + TypeScript-first codebase) for (1) validating the shape of `data/*.json` at
build/import time so a bad commit fails fast with a clear message, and (2) validating API
route request bodies in one place instead of per-route hand rolled checks. This directly
addresses the admin/`src/types.ts` drift noted above — a single zod schema can be the source
of both the runtime validator and the inferred TypeScript type.

## API Route Conventions (summary — see also ARCHITECTURE.md/CONCERNS.md)

- **Every** route file starts with `export const runtime = "edge";` immediately after
  imports — mandatory per `AGENTS.md`, and consistently followed in all 7 route files
  (`data`, `deploy`, `dispatch`, `track`, `upload`, `upload-asset`, `upload-resume`).
- **`requireAccess(request)`** (`src/lib/access.ts`) is called as the first line inside every
  mutating/read-sensitive handler, before any other logic:
  `const denied = await requireAccess(request); if (denied) return denied;`
  Applied in: `data` (GET), `deploy` (POST), `dispatch` (POST), `upload` (POST),
  `upload-asset` (POST), `upload-resume` (POST).
  **Not applied** in `track` (POST) — this is intentional and documented (`AGENTS.md`: "Cloudflare
  Access ... gates /admin and all /api/* except /api/track"), since track is the public
  page-view beacon called from unauthenticated visitor pages.
- Env vars (`GITHUB_PAT`, `GITHUB_REPO`) are read via `process.env` and always explicitly
  null-checked before use, returning a `500` with `"Missing env vars"` if absent — never
  assumed to be present.
- Cloudflare bindings (`PORTFOLIO_BUCKET`, `PHOTO_ANALYTICS`) are read via
  `getRequestContext().env`, never `process.env` (per `AGENTS.md` — bindings are not on
  `process.env`).

## Function Design

**Size:** API route handlers are long (100-200+ lines for `deploy/route.ts` and
`dispatch/route.ts`) because each GitHub API call, its error branch, and status-code mapping
are all inlined sequentially rather than extracted into helpers. No route currently factors
out a shared "call GitHub API and handle errors" utility, despite every route repeating the
same `fetch(...) + if (!res.ok)` shape with the same headers object recreated in each file.
**Fix in rebuild:** extract a small `githubFetch()` / `GithubClient` helper (shared headers,
shared `!ok` → structured error mapping) — this alone would cut ~30-40% of the boilerplate in
`deploy`, `data`, `dispatch`, `upload`, `upload-resume`.

**Parameters:** React components take a single typed props object
(`interface XProps { ... }` immediately above the component, e.g. `SearchBarProps` in
`src/components/SearchBar.tsx`). API handlers take the standard single `NextRequest` param.

**Return Values:** Components return JSX directly (no wrapper HOCs observed). API handlers
always return `NextResponse.json(...)`.

## Module Design

**Exports:** Components use `export default function ComponentName(...)`. Hooks and lib
utilities use named exports (`export function useInView()`, `export function toBase64()`,
`export async function requireAccess()`). No default export is used for non-component modules.

**Client/Server split:** Components requiring browser APIs are marked `"use client"` at the
top of the file (23 of the files under `src/` use this directive) — this includes both
interactive leaf components (`SearchBar`, `FilterTabs`, `Timeline`) and whole page files
(`src/app/page.tsx`, `src/app/portfolio/page.tsx` are both `"use client"` despite having no
obvious need for client-only rendering of their static JSON content — this is a rebuild
opportunity: in Astro, this content should be static/server-rendered by default, with client
islands limited to genuinely interactive pieces like the lightbox, search, and drag-and-drop
admin editor).

**Barrel Files:** None — no `index.ts` re-export files anywhere in `src/`. Every import
targets the concrete file directly.

**CSS:** Plain global `.css` files per page/area under `src/styles/` (`globals.css`,
`home.css`, `photography.css`, `admin.css`, `dev.css`), imported directly into the page
component that needs them (e.g. `import "@/styles/home.css"` in `src/app/page.tsx`). No CSS
Modules, no CSS-in-JS, no Tailwind. Class names are hand-written, prefixed by page/area
(`hd-` for homepage, `admin-` for admin components) to avoid collisions given the global
scope.

---

*Convention analysis: 2026-08-16*
