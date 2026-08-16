# Architecture Research

**Domain:** Static-first personal portfolio + photography site with a git-backed admin CMS, built on Astro islands over a cross-repo React design system, deployed to Cloudflare
**Researched:** 2026-08-16
**Confidence:** HIGH on framework/platform mechanics (official docs + package registry + reading the design-system source); MEDIUM on the cross-repo workflow recommendation and the JS-budget numbers (established practice + estimates, not measured on this codebase)

---

## Executive Corrections Before Anything Else

Three findings invalidate assumptions currently written into `PROJECT.md`. They are load-bearing for every diagram below, so they go first.

### 1. Astro 5 is two majors stale. Current is Astro 7.

| Package | Latest | Notes |
|---|---|---|
| `astro` | **7.2.2** | 5.x is legacy; 6 required Node 22 + Vite 7 + Zod 4; 7 uses Vite 8 and a Rust markdown engine |
| `@astrojs/cloudflare` | **14.2.1** | `peerDependencies: { astro: "^7.2.0", wrangler: "^4.83.0" }` |
| `@astrojs/react` | **6.0.2** | React 19 supported |

Building "Astro 5" in August 2026 means starting on an unsupported line. **Target Astro 7 + `@astrojs/cloudflare` 14.** Confidence: HIGH (npm registry, checked directly).

### 2. `@astrojs/cloudflare` no longer supports Cloudflare Pages. Deploy to Workers.

> "The adapter no longer supports Cloudflare Pages deployment. Migrate to Cloudflare Workers for the best experience and feature support." — [Astro Cloudflare adapter docs](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

This is not a cosmetic rename. Consequences that propagate through the whole design:

- Build output is `dist/` with `main: "dist/_worker.js/index.js"` and an `assets` binding — not `.vercel/output/static`.
- Config is `wrangler.jsonc`, requiring `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`.
- CI is **Workers Builds** (Cloudflare's git integration for Workers) rather than the Pages git integration. Same "push to `main` → rebuild" behaviour, different product surface. The publish loop is preserved.
- Static assets are served by the Workers Static Assets layer, which sits *in front of* the Worker. Requests only reach your code when no asset matches, **or** when the path is listed in `run_worker_first`.

`PROJECT.md`'s constraint "Deploys to akhilsaxena.com via Cloudflare Pages" should be restated as **Cloudflare Workers with Static Assets**. Everything the project actually wanted from Pages (git-push deploys, free static hosting, custom domain, Access in front) is present.

### 3. `Astro.locals.runtime.env` is gone. Bindings come from `cloudflare:workers`.

Removed in `@astrojs/cloudflare` v13 / Astro 6. Replacement:

```ts
import { env } from "cloudflare:workers";
const bucket = env.PORTFOLIO_BUCKET;          // R2 binding
// execution context (waitUntil) moved to Astro.locals.cfContext
```

`PROJECT.md`'s "Cloudflare bindings (R2 `PORTFOLIO_BUCKET`) come from `locals.runtime.env`" is out of date. The *substance* of the constraint survives — bindings are still not on `process.env`, still absent under a bare dev server without `platformProxy`, and still need guarding.

For plain string config (`GITHUB_PAT`, `GITHUB_REPO`, `R2_PUBLIC_URL`, `CF_ACCESS_*`), prefer **`astro:env`** over both `process.env` and `cloudflare:workers` — it gives a typed, validated schema and refuses to build if a required secret is missing:

```js
// astro.config.mjs
env: {
  schema: {
    GITHUB_PAT:            envField.string({ context: "server", access: "secret" }),
    GITHUB_REPO:           envField.string({ context: "server", access: "public" }),
    R2_PUBLIC_URL:         envField.string({ context: "client", access: "public" }),
    CF_ACCESS_TEAM_DOMAIN: envField.string({ context: "server", access: "secret" }),
    CF_ACCESS_AUD:         envField.string({ context: "server", access: "secret" }),
  }
}
```

Note: `astro:env` does **not** cover Cloudflare bindings. R2 stays on `cloudflare:workers`. Two mechanisms, cleanly split by kind.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BROWSER — PUBLIC (akhilsaxena.com)                                          │
│  Pure static HTML + CSS. Framework JS only where an island is declared.      │
├──────────────┬──────────────┬──────────────┬─────────────────────────────────┤
│  /           │  /work       │  /photos     │  /resume       /work/[slug]     │
│  0 islands   │  0 islands   │  1 island    │  0 islands     0 islands        │
│  ~0.6 KB JS  │  ~0.6 KB JS  │  ~50 KB gz   │  ~0.6 KB JS    ~0.6 KB JS       │
│  (inline     │  (inline     │  (Lightbox,  │                                 │
│   theme +    │   theme)     │   client:idle)│                                │
│   filters)   │              │              │                                 │
└──────────────┴──────────────┴──────────────┴─────────────────────────────────┘
                              ▲ served by Workers Static Assets, no Worker hit
                              │
┌──────────────────────────────────────────────────────────────────────────────┐
│  CLOUDFLARE ACCESS (Zero Trust, self-hosted app, PATH-SCOPED)                │
│  Protects  /admin*  ·  /api/*  ·  /_actions/*   ← all three, or it's a hole  │
│  Injects   Cf-Access-Jwt-Assertion   on every allowed request                │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│  ASTRO WORKER  (dist/_worker.js — on-demand routes only)                     │
│  wrangler.jsonc: run_worker_first = ["/admin*", "/api/*", "/_actions/*"]     │
├────────────────────────┬─────────────────────────────────────────────────────┤
│ src/middleware.ts      │ FAIL-CLOSED auth gate. Verifies the Access JWT via   │
│                        │ jose + remote JWKS. Missing CF_ACCESS_* config ⇒     │
│                        │ 503, never "allow". Runs before any handler.         │
├────────────────────────┼─────────────────────────────────────────────────────┤
│ src/pages/admin.astro  │ prerender=false. READ path: frontmatter fetches      │
│  (server-rendered)     │ data/*.json + HEAD sha from GitHub, passes them as   │
│                        │ props to <AdminApp client:only="react">.             │
├────────────────────────┼─────────────────────────────────────────────────────┤
│ src/actions/index.ts   │ WRITE path. astro:actions, zod-validated:            │
│  (astro:actions)       │   publishContent  · stagePhoto    · dispatchPhotoJob │
│                        │   jobStatus       · uploadResume  · uploadAsset      │
└────────┬───────────────┴────────────────────┬────────────────────────────────┘
         │                                    │
         │ Git Data API                       │ R2 binding (cloudflare:workers)
         │ (blob→tree→commit→ref)             │ workflow_dispatch API
         ▼                                    ▼
┌──────────────────────────┐      ┌───────────────────────────────────────────┐
│  GITHUB — repo `main`    │      │  CLOUDFLARE R2  (portfolio-photos)        │
│  data/*.json IS the DB   │◄─────┤  temp/{uploadId}   staging, 1-day TTL     │
│  public/resume.pdf       │commit│  photos/{cat}/…    public variants        │
└────────┬─────────────────┘      │  private/{cat}/…   unwatermarked masters  │
         │                        │  assets/{logos,icons}/…                   │
         │ push to main           └──────────────┬────────────────────────────┘
         ├────────────────────────────────┐      │ S3 SDK (Actions runner only)
         ▼                                ▼      │
┌─────────────────────────┐   ┌───────────────────┴───────────────────────────┐
│ WORKERS BUILDS (CI)     │   │  GITHUB ACTIONS — process-photos.yml          │
│ npm ci && astro build   │   │  concurrency: content-writes (serialized)     │
│ && wrangler deploy      │   │  sharp resize ×4 + watermark · exifr EXIF     │
│                         │   │  → R2 put · manifest append · rebase-push     │
│ BUILD FAILS ⇒ last good │   └───────────────────────────────────────────────┘
│ deployment stays live   │        Node 22 runner. sharp/exifr/@aws-sdk never
└─────────────────────────┘        enter the Worker bundle.
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|---|---|---|
| **Static public pages** | Render Home / Work / Photos / Résumé / case studies from validated content, at build time | `.astro` pages + `.astro` layout; design-system React primitives rendered server-side with **no** client directive |
| **Theme bootstrap** | Apply `class="dark"` to `<html>` before first paint | `<script is:inline>` in `<head>` of the base layout. Not an island — a render-blocking 12-line script |
| **Theme toggle** | Flip theme, persist to `localStorage.asx-theme` | DS `IconButton` rendered to static HTML + a delegated inline listener. Zero framework JS |
| **Category filters** | Show/hide masonry items by category | DS `Chip` rendered to static HTML + delegated inline listener. Zero framework JS |
| **Photo lightbox** | Modal image viewer with EXIF caption, keyboard nav, focus trap | The one genuine public island. DS `Lightbox` in a thin React wrapper, `client:idle` |
| **`src/content.config.ts`** | Declare the `photos` collection with a zod schema — the build-time validation gate | Astro Content Layer `file()` loader over `data/portfolio_images.json` |
| **`src/schemas/`** | **Single** zod module consumed by build, server, and client. The reason validation can't drift | Plain TS, imported by `content.config.ts`, `src/lib/content.ts`, and every action |
| **`src/lib/content.ts`** | Load + `parse()` the three object-shaped configs at module scope | Throws on invalid ⇒ build fails |
| **`src/middleware.ts`** | Fail-closed Access JWT verification for `/admin*`, `/api/*`, `/_actions/*` | `jose` + `createRemoteJWKSet`, module-level JWKS cache |
| **`src/actions/`** | All mutations. Typed RPC callable from the admin island | `astro:actions` + zod. Replaces the legacy hand-rolled `/api/*` routes |
| **`src/lib/github.ts`** | The only module that talks to `api.github.com`. Git Data API for all writes | One code path, not two (legacy split Contents API vs Git Data API) |
| **`src/lib/sanitize.ts`** | Strip everything but `<strong>`/`<em>` from résumé bullets | Runs in the zod `.transform()`, i.e. at build **and** at write time. Kills the stored-XSS class |
| **`AdminApp` island** | The editor. Forms over DS inputs, preview pane, publish button | `client:only="react"` — no SSR, no hydration mismatch, no SEO value |
| **`process-photos.yml`** | The only place `sharp`/`exifr`/S3 SDK run | Node 22 Actions runner, `concurrency` group serialising manifest writes |

---

## The Islands Boundary — the central decision

### The tension, stated honestly

`PROJECT.md` holds two goals that appear to conflict:

- **Core value:** "All UI comes from `@akhil-saxena/design-system` where a component exists." The design system is a **React** component library.
- **Quality bar:** "Lighthouse 95+ on public pages," with a real budget on a 39-photo gallery.

The apparent conflict: using `Card`, `Heading`, `Text`, `Link` for static content seems to force React onto every page. One React 19 island costs roughly **45–50 KB gzipped** (`react` + `react-dom/client` + the Astro island runtime) plus hydration TBT — on a page whose entire content is a name, four project tiles, and six `<img>` tags.

### The tension is false. Here is why.

**Astro renders React components to static HTML with zero client JavaScript when no `client:*` directive is present.** This is documented behaviour, not a trick:

> "This Astro component imports and uses a React component, which will render on the server as static HTML by default, avoiding unnecessary JavaScript on the client." — [Astro framework components guide](https://docs.astro.build/en/guides/framework-components/)

Reading the design-system source confirms this works for exactly the components in question. Hook usage across the primitives:

| Component | Hook references | Server-renderable with zero JS |
|---|---:|---|
| `foundation/Heading` | 0 | ✅ |
| `foundation/Text` | 0 | ✅ |
| `foundation/Link` | 0 | ✅ |
| `foundation/Eyebrow` | 0 | ✅ |
| `foundation/Divider` | 0 | ✅ |
| `surfaces/Card` | 0 | ✅ |
| `inputs/Button` | 0 | ✅ |
| `inputs/IconButton` | 0 | ✅ |
| `inputs/Badge` | 0 | ✅ |
| `inputs/Chip` | 0 | ✅ |
| `data-display/Timeline` | 0 | ✅ |
| `display/StatCard` | 0 | ✅ |
| `layout/AppBar` | 0 | ✅ |
| `layout/Footer` | 0 | ✅ |
| `data-display/SegmentedControl` | 3 | ⚠️ renders, but state is inert without hydration |
| `overlays/Lightbox` | many (portal, focus trap, scroll lock, dismiss) | ❌ genuinely needs an island |

Every primitive the public pages need is a pure `forwardRef` presentational component. They render to markup and class names; the behaviour lives in CSS.

### Recommendation

**Use design-system React components everywhere on public pages, with no client directive. Add behaviour with tiny inline scripts, not islands.**

This is the *only* option that satisfies both goals simultaneously. The three candidates and why the other two lose:

| Option | DS fidelity | Public JS | Verdict |
|---|---|---|---|
| Hydrate DS components everywhere (`client:load`) | Perfect | ~50 KB gz per page | **Rejected.** Pays a framework runtime to make static text interactive-capable. Nothing on Home, Work, or Résumé needs React at runtime. |
| Reimplement `Card`/`Heading`/`Text`/`Link` as `.astro` components | Broken | 0 KB | **Rejected outright.** This is the exact tradeoff the core value forbids: shipping bespoke where the DS has a component. It also silently forks the token contract, so a DS fix never reaches the site — destroying the "the site proves the DS works" argument. |
| **SSR the DS components, script the behaviour** | Perfect (same markup, same CSS, same tokens) | ~0.6 KB | **Recommended.** |

The third option is not a compromise. The rendered HTML is byte-identical to the hydrated version — same DS classes, same DS CSS, same token resolution, same a11y attributes. The DS is genuinely being dogfooded; it just isn't being *hydrated* where hydration buys nothing.

### Per-element ruling

| Element | Ruling | Rationale |
|---|---|---|
| Layout, headings, body copy, cards, links, footers | **DS React, SSR, no directive** | Zero interactivity. Free. |
| Photo grid (Home 3×2 and Photos masonry) | **`.astro` + plain `<img srcset>`** | 39 images × 5 URL variants is a data-shape problem, not a component problem. `astro:assets` is wrong here — the variants are pre-generated in R2, so let the browser pick with `srcset`/`sizes` and skip the image service entirely. Wrapping each tile in a DS component would add nothing the DS has an opinion about. |
| Theme toggle | **DS `IconButton`, SSR + delegated inline script** | The button *is* the DS component. Behaviour is `documentElement.classList.toggle("dark")` + one `localStorage` write. ~40 lines of vanilla vs ~50 KB of React. |
| Theme bootstrap (no-FOUC) | **`<script is:inline>` in `<head>`** | Must run before paint. An island cannot; it hydrates after. Non-negotiable — dark-by-default without this flashes light on every navigation. |
| Category filters | **DS `Chip` ×8, SSR + delegated inline script** | Toggling `hidden` on masonry children. `SegmentedControl` uses hooks and would need hydration — prefer `Chip`, which is pure and matches the handoff's pill design anyway. |
| Lightbox | **Island. DS `Lightbox`, `client:idle`** | Portal + focus trap + scroll lock + arrow-key nav. Reimplementing this correctly is exactly the work the DS exists to save. Hydrate it and pay the 50 KB — but only on `/photos`, and only after the main thread is idle. |
| Admin editors | **Island. `client:only="react"`** | Stateful forms, dirty tracking, file inputs, preview. Full React. No budget applies; the audience is one authenticated person. `client:only` (not `client:load`) because there is no SEO value and no server render worth reconciling. |

### Resulting public JS budget

| Page | Islands | Framework JS (gzip) | Inline JS |
|---|---|---:|---:|
| `/` | 0 | 0 | ~0.6 KB |
| `/work` | 0 | 0 | ~0.4 KB |
| `/work/[slug]` | 0 | 0 | ~0.4 KB |
| `/resume` | 0 | 0 | ~0.4 KB |
| `/photos` | 1 (`client:idle`) | ~50 KB, deferred | ~0.8 KB |
| `/admin` | 1 (`client:only`) | not budgeted | — |

Four of five public routes ship **zero framework JavaScript**. Lighthouse 95+ is not merely achievable; it is close to unavoidable.

### Rejected: Preact compat

`@astrojs/preact` with `compat: true` would cut the `/photos` island to ~12 KB. **Do not.** The design system declares `peerDependencies: { react: "^19.0.0" }` and its build externalises `react`/`react-dom`. Running it under `preact/compat` means the site is no longer proof that the *published* package works in a *React 19* app — it is proof that a shim works. That directly contradicts the core value, to save 38 KB on one route that already has zero islands elsewhere. Note it in FEATURES as an escape hatch if the gallery ever misses budget.

---

## Cross-Repo Dependency Management

The named blocker: the charcoal theme lives in `../design-system` (published as `@akhil-saxena/design-system`), and the portfolio must develop against a local build before switching to the published one.

### The four options, evaluated

| Approach | Mechanism | Duplicate-React risk | Verdict |
|---|---|---|---|
| `npm link` | Global symlink farm | **High** — `node_modules/react` resolves from the DS's own tree | Emergency only |
| `"file:../design-system"` | npm **symlinks** directory deps (same as `link:`) | **High** — identical failure mode to `npm link` | Not the default |
| **`npm pack` → `file:*.tgz`** | npm **copies** the tarball contents | **None** — one React, in the portfolio's tree | ✅ **Recommended default** |
| npm workspaces | Single lockfile, hoisted deps | Low | Wrong shape — separate repos, separate release cadence, and the DS is a published artifact with its own CI |

The distinction that matters and is easy to miss: **`file:` pointing at a directory is a symlink, not a copy.** It has exactly the same duplicate-peer hazard as `npm link`. Only `file:` pointing at a **tarball** copies. Vite's own guidance names this:

> "Due to differences in linked dependency resolution, transitive dependencies can deduplicate incorrectly; using `npm pack` on the linked dependency can fix this issue." — [Vite dependency pre-bundling](https://vite.dev/guide/dep-bundling)

### Recommended workflow

**Default loop — pack-and-install.** Add to the portfolio's `package.json`:

```jsonc
{
  "scripts": {
    "ds:sync": "npm --prefix ../design-system run build && npm --prefix ../design-system pack --pack-destination ./.local-packages && npm i --no-save ./.local-packages/akhil-saxena-design-system-*.tgz",
    "ds:release": "npm i @akhil-saxena/design-system@latest && rm -rf .local-packages",
    "ds:check": "node scripts/assert-published-ds.mjs"
  }
}
```

`.local-packages/` goes in `.gitignore`. One command reflects a theme change; ~4 seconds; no symlinks; React resolves once.

**Tight loop — symlink, guarded.** Only when actively debugging a component's internals, where a 4-second cycle is too slow:

```js
// astro.config.mjs
vite: {
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { exclude: ["@akhil-saxena/design-system"] },
}
```

Plus, in `../design-system`, run `npm run dev` (`tsup --watch`) so `dist/` tracks `src/`. Do **not** set `resolve.preserveSymlinks: true` — it breaks HMR ([vite#6479](https://github.com/vitejs/vite/issues/6479)).

**Ship gate.** `scripts/assert-published-ds.mjs` reads `package.json` and exits non-zero if the `@akhil-saxena/design-system` spec starts with `file:`, `link:`, or `workspace:`. Wire it into CI on `main`. This is the "explicit gate" `PROJECT.md` asks for, and it is ten lines.

### Named pitfalls

1. **"Invalid hook call" from two React copies.** The signature of a symlinked package. Diagnose with `npm ls react react-dom` — two entries means you have it. `npm pack` prevents it structurally; `resolve.dedupe` patches it for Vite only (SSR and the Astro build use separate resolution paths, so `dedupe` is not a complete fix).
2. **Stale `dist/`.** `file:../design-system` resolves to the package root; Astro imports `dist/index.js`. Editing DS `src/` changes nothing until the DS builds. Silent, and burns an hour the first time.
3. **Vite's dep cache serving the old build.** Pre-bundled deps live in `node_modules/.vite`. After re-packing, either `optimizeDeps.exclude` the package or restart with `--force`.
4. **`npm i` silently unlinking.** Any subsequent `npm install` in the portfolio re-resolves the `file:` spec and can discard an `npm link`. The pack-based flow is immune because the tarball path *is* the spec.
5. **CSS import order.** See below — this is the pitfall most likely to produce "the theme half-applied" confusion.
6. **`"use client"` build warnings.** `scripts/postbuild.mjs` stamps `"use client"` onto every emitted chunk. Rollup warns "Module level directives cause errors when bundled." Harmless — `@vitejs/plugin-react` (used by `@astrojs/react`) silences it, and the directive is inert outside RSC. Expect noise if the silencer misses; do not chase it.
7. **The DS is ESM-only** (`"type": "module"`, no `require` condition). Any build script that imports schemas or DS code must be `.mjs` or ESM-configured.
8. **Per-component CSS uses a `"style"` export condition** with a `"default"` fallback. Verify `import "@akhil-saxena/design-system/css/card"` resolves under Astro's build before depending on it for the budget (see below); the fallback should handle it.

### CSS architecture — and the font landmine

The design system's components **do not import their own CSS** (verified: zero `.css` imports in `src/**/*.tsx`). The consumer imports sheets explicitly. Two options:

| Strategy | Cost | Use |
|---|---|---|
| Monolithic: `tokens.css` + `primitives.css` + `utilities.css` | **~200 KB CSS** (`primitives.css` alone is 176 KB) | `/admin` only |
| Split: `css/base.css` + one file per rendered component | ~8 KB base + ~2–8 KB each | **Public pages** |

The DS ships 74 per-component sheets in `dist/css/` with a round-trip integrity check (`npm run css:check`). Public pages render maybe 8 distinct components → ~30 KB instead of ~200 KB. Take the split path; it is the difference between a comfortable Lighthouse 95+ and fighting for it.

**Order is load-bearing, and specificity makes it subtle.** The DS has exactly two theme scopes today: `:root` and `:root.dark`. A charcoal brand theme introduces a third axis. Specificity:

```
:root                        →  (0,1,0)
:root.dark                   →  (0,2,0)
:root[data-brand="charcoal"] →  (0,2,0)   ← ties with :root.dark; SOURCE ORDER decides
:root[data-brand].dark       →  (0,3,0)   ← wins cleanly
```

So the theme must (a) be imported **after** `tokens.css`, and (b) declare **both** a light and a dark block, or dark mode silently keeps the DS's amber. Astro does not guarantee CSS ordering across `.astro` files and React-component imports. **Put all imports in one file and import that file once, from the base layout:**

```css
/* src/styles/ds.css — the ONLY place DS CSS is imported */
@import "@akhil-saxena/design-system/tokens.css";
@import "@akhil-saxena/design-system/theme-charcoal.css";  /* new, from the theme phase */
@import "@akhil-saxena/design-system/css/base.css";
@import "@akhil-saxena/design-system/css/card.css";
/* … only the components this site renders … */
```

**The font landmine.** `tokens.css` opens with 14 `@fontsource` `@import`s — Inter (4 weights), Archivo (5), JetBrains Mono (4), Newsreader Variable (2) — declaring **~73 `@font-face` rules** across ~9 MB of font files in `node_modules`. The portfolio's identity is **Playfair Display / DM Sans / IBM Plex Mono**, none of which are in that set.

Two consequences, both of which the theme phase must handle:

1. If the theme only redefines `--font-serif: "Playfair Display", …` and nothing declares the `@font-face`, text silently falls back to Georgia. The site would look almost-right and be wrong.
2. Every `url()` in those 73 faces is copied into the build output by Vite. Browsers only *download* faces they use, so the wire cost is near zero — but the deploy is bloated and the CSS parse is not free.

**Finding for the design system** (exactly the kind `PROJECT.md` says to surface rather than work around): `tokens.css` conflates *tokens* with *font delivery*. Split it into `tokens.css` (custom properties only) and `fonts.css` (the `@fontsource` imports), so a brand theme can supply its own faces without inheriting the default four families. Ship the charcoal theme as `theme-charcoal.css` + `fonts-charcoal.css`.

---

## Recommended Project Structure

```
portfolio/
├── data/                              # Git-as-database. Path preserved from legacy
│   ├── portfolio_images.json          #   so the write allow-list ("data/") is unchanged.
│   ├── resume.json
│   ├── home_config.json
│   └── site_config.json
├── public/
│   ├── resume.pdf                     # hand-maintained; overwritten by uploadResume action
│   └── favicon.svg
├── scripts/                           # Node 22, Actions-runner only. NEVER imported by src/.
│   ├── process-images.js              #   sharp resize ×4 + watermark, exifr EXIF, R2 put
│   ├── action-process-dispatch.js     #   workflow_dispatch entry: R2 temp/ → manifest
│   └── assert-published-ds.mjs        #   ship gate: fails if the DS dep is a file: spec
├── src/
│   ├── schemas/                       # ★ THE single source of validation truth.
│   │   ├── photo.ts                   #   Imported by content.config.ts, lib/content.ts,
│   │   ├── resume.ts                   #   and every action. Cannot drift.
│   │   ├── config.ts
│   │   └── index.ts
│   ├── content.config.ts              # Astro 5+ location (was src/content/config.ts in v4)
│   ├── lib/
│   │   ├── content.ts                 # parse() the 3 object-shaped configs at module scope
│   │   ├── github.ts                  # ONLY module touching api.github.com. Git Data API.
│   │   ├── access.ts                  # Access JWT verification (jose + JWKS cache)
│   │   ├── r2.ts                      # binding access, guarded for local dev
│   │   └── sanitize.ts                # <strong>/<em> allow-list for résumé bullets
│   ├── middleware.ts                  # fail-closed gate on /admin*, /api/*, /_actions/*
│   ├── actions/
│   │   └── index.ts                   # publishContent, stagePhoto, dispatchPhotoJob,
│   │                                   # jobStatus, uploadResume, uploadAsset
│   ├── layouts/
│   │   ├── BaseLayout.astro           # <head>, theme bootstrap script, imports styles/ds.css
│   │   └── CaseStudyLayout.astro
│   ├── components/
│   │   ├── *.astro                    # DEFAULT. Static composition of DS React primitives.
│   │   │   ├── SiteHeader.astro       #   DS AppBar + ThemeToggle markup
│   │   │   ├── SiteFooter.astro       #   DS Footer
│   │   │   ├── PhotoGrid.astro        #   <img srcset> from the 5 URL variants
│   │   │   ├── ProjectTile.astro      #   DS Card + Heading + Text
│   │   │   └── CategoryFilters.astro  #   DS Chip ×8, static
│   │   └── islands/                   # ★ EXCEPTION. Everything here ships JS. Audit on sight.
│   │       ├── PhotoLightbox.tsx      #   client:idle — the only public island
│   │       └── admin/
│   │           ├── AdminApp.tsx       #   client:only="react"
│   │           ├── ResumeEditor.tsx
│   │           ├── HomeConfigEditor.tsx
│   │           ├── PhotoManager.tsx
│   │           └── PublishBar.tsx
│   ├── scripts/                       # vanilla behaviour attached to SSR'd DS markup
│   │   ├── theme.ts                   #   toggle + persist
│   │   └── filters.ts                 #   category show/hide
│   ├── styles/
│   │   ├── ds.css                     # ★ the ONLY DS CSS import site. Order is fixed here.
│   │   └── app.css                    # layout-only, per the DS constraint
│   └── pages/
│       ├── index.astro                # two-act Home
│       ├── work/index.astro
│       ├── work/[slug].astro          # case studies, from a content collection
│       ├── photos.astro
│       ├── resume.astro
│       ├── admin.astro                # prerender = false
│       └── api/                       # ONLY for things Actions can't express (large raw
│           └── (probably empty)       #   bodies, third-party webhooks). Prefer actions/.
├── .github/workflows/
│   ├── ci.yml                         # lint · typecheck · test · assert-published-ds
│   └── process-photos.yml             # workflow_dispatch only (the push path is retired)
├── astro.config.mjs
├── wrangler.jsonc                     # ★ replaces wrangler.toml. Workers, not Pages.
└── package.json
```

### Structure rationale

- **`src/components/*.astro` is the default; `src/components/islands/` is the exception.** Making the boundary a directory rather than a convention means "does this ship JS?" is answerable by `ls`, and a PR that adds a file under `islands/` is self-flagging. This is the single most valuable structural choice for holding the Lighthouse budget over time.
- **`data/` stays at the repo root.** The `file()` loader takes a project-root-relative path, so `file("data/portfolio_images.json")` works. Moving to `src/data/` would fork the write allow-list, the Action's commit path, and the legacy content — for no gain.
- **`src/schemas/` sits outside `content.config.ts`** precisely so the same module can be imported by the actions. If the schema lived inside the content config it would be build-only, and the server would re-implement it. That re-implementation is where drift starts.
- **`src/lib/github.ts` is the sole GitHub caller.** The legacy app used the Contents API for single files and the Git Data API for batches — two code paths for one operation, and the Contents path required a GET-for-sha per file. Git Data API handles both, atomically.
- **`src/pages/api/` is expected to stay empty.** Astro Actions supersede hand-rolled route handlers: typed RPC, zod input, `accept: "form"` for multipart, `z.instanceof(File)` for uploads, and structured errors the island can discriminate. Keep the directory as an escape hatch, don't reach for it.
- **`scripts/` is never imported by `src/`.** `sharp` is a native binary; `@aws-sdk/client-s3` is heavy. They stay devDependencies executed only on the Actions runner. Enforce with an ESLint `no-restricted-imports` rule.

### Astro configuration

```js
// astro.config.mjs
import { defineConfig, envField } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://akhilsaxena.com",
  // 'static' by default: every route prerenders unless it opts out.
  // The adapter is present ONLY so /admin and the actions can render on demand.
  adapter: cloudflare(),
  integrations: [react()],
  env: { schema: { /* see §Executive Corrections */ } },
  vite: { resolve: { dedupe: ["react", "react-dom"] } },
});
```

```jsonc
// wrangler.jsonc
{
  "name": "portfolio",
  "main": "dist/_worker.js/index.js",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "binding": "ASSETS", "directory": "./dist" },
  // Everything else is served straight from static assets, never touching the Worker.
  "run_worker_first": ["/admin*", "/api/*", "/_actions/*"],
  "r2_buckets": [{ "binding": "PORTFOLIO_BUCKET", "bucket_name": "portfolio-photos" }],
  "vars": { "GITHUB_REPO": "akhil-saxena/portfolio" }
}
```

> `/_actions/*` in `run_worker_first` — and in the Cloudflare Access policy — is the detail most likely to be missed. Astro Actions POST to `/_actions/<name>`. An Access app scoped only to `/admin*` and `/api/*` leaves every mutation publicly callable. The middleware gate is the reason this is defence-in-depth rather than a breach, but both layers must cover the same paths.

---

## Architectural Patterns

### Pattern 1: One zod module, three enforcement points

**What:** Define each content shape once in `src/schemas/`. Consume it at build time (content collection + config loader), at write time (action input), and at edit time (the island's error rendering).

**When:** Any git-as-database system where a bad write breaks the build rather than a transaction.

**Trade-offs:** Requires the schemas to be isomorphic — no Node-only dependencies. In exchange, "validated in the admin but not on the server" becomes structurally impossible.

```ts
// src/schemas/photo.ts — one definition
import { z } from "astro/zod";   // Astro 6+ ships Zod 4; use Astro's copy to avoid a second one

export const PhotoSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  category: z.enum(["abstract","architecture","nature","portraits","product","street","wildlife"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  order: z.number().int().nonnegative(),
  urls: z.object({
    original: z.url(), large: z.url(), medium: z.url(), small: z.url(),
    thumb: z.string().startsWith("data:image/webp;base64,"),
  }),
  exif: z.object({
    camera: z.string().nullable(), lens: z.string().nullable(),
    aperture: z.string().nullable(), shutter: z.string().nullable(),
    iso: z.number().nullable(), focalLength: z.string().nullable(),
  }).nullish(),                                   // one photo has no camera EXIF — nullish, not required
  dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
  // `tags` deliberately absent — dropped per PROJECT.md. Absence here is the enforcement.
});
```

```ts
// src/content.config.ts — enforcement point 1: the build
import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { PhotoSchema } from "./schemas/photo";

export const collections = {
  photos: defineCollection({
    loader: file("data/portfolio_images.json"),   // array of objects, each with `id`
    schema: PhotoSchema,
  }),
};
```

```ts
// src/actions/index.ts — enforcement point 2: the write
publishContent: defineAction({
  input: z.object({
    baseSha: z.string().length(40),
    photos:  z.array(PhotoSchema).optional(),     // same schema object
    resume:  ResumeSchema.optional(),
    home:    HomeConfigSchema.optional(),
    site:    SiteConfigSchema.optional(),
    message: z.string().min(1).max(200),
  }),
  handler: async (input, ctx) => { /* … */ },
}),
```

Enforcement point 3 is free: Astro Actions return typed input errors, and the island renders them with `isInputError(error)`. No client-side validation code is written at all.

**Why this is the answer to "where does validation belong?"** All three — but written once. The build gate is the backstop (a bad file cannot become a live page). The server gate is the real defence (a bad file never lands in git). The client gate is a UX affordance derived from the other two.

### Pattern 2: Build-time-throwing config loaders

**What:** Object-shaped configs (`resume.json`, `home_config.json`, `site_config.json`) don't fit the `file()` loader, which expects an array-with-`id` or a keyed map. Parse them at module scope instead.

**When:** Singleton config documents in a content collection system.

```ts
// src/lib/content.ts
import raw from "../../data/resume.json";
import { ResumeSchema } from "../schemas/resume";

// Module scope. Astro evaluates this during prerender, so a parse failure
// aborts `astro build` with the zod issue path — no bad page is emitted.
export const resume = ResumeSchema.parse(raw);
```

Trade-off vs. forcing everything through `file()`: you lose `getCollection()` ergonomics for these three, but you gain a plain typed export and a much clearer error. Worth it.

### Pattern 3: SSR'd design-system markup + delegated inline behaviour

**What:** Render the DS component server-side; attach behaviour with a delegated listener that targets a `data-*` hook, never a DS-internal class name.

**When:** Any interaction expressible as an attribute or class flip.

```astro
---
// src/components/ThemeToggle.astro
import { IconButton } from "@akhil-saxena/design-system";
---
<IconButton
  aria-label="Toggle theme"
  data-theme-toggle
  variant="ghost"
/>
<script>
  const KEY = "asx-theme";
  document.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("[data-theme-toggle]")) return;
    const dark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(KEY, dark ? "dark" : "light");
    document.documentElement.dataset.themeGlyph = dark ? "moon" : "sun";
  });
</script>
```

```astro
---
// src/layouts/BaseLayout.astro — must be is:inline and in <head>, before any paint
---
<script is:inline>
  (() => {
    const t = localStorage.getItem("asx-theme");
    if (t !== "light") document.documentElement.classList.add("dark");  // dark by default
    document.documentElement.dataset.themeGlyph = t === "light" ? "sun" : "moon";
  })();
</script>
```

**Trade-off, stated honestly:** the behaviour is not covered by the design system's tests, and a future DS release that changes `IconButton`'s DOM could break the `closest()` selector. Mitigate by hooking only on your own `data-*` attribute (as above) — the DS passes unknown props through to the DOM element, so the hook is yours, not theirs. The glyph swap is CSS driven off `[data-theme-glyph]`, not a DS prop, so no re-render is needed.

### Pattern 4: Per-file optimistic concurrency (fixing the `"latest"` bug properly)

**What:** The legacy `baseSha: "latest"` escape hatch existed because whole-HEAD comparison is *too strict*: the photo pipeline commits `portfolio_images.json` constantly, so a HEAD-based check would 409 an admin who only touched `resume.json`. Someone hit that, disabled the check, and shipped the data-loss bug.

Fix the strictness, not the check. Compare **blob SHAs per file**.

```ts
// src/lib/github.ts
export async function publish(files: Record<string, string>, baseSha: string) {
  const headSha = await getRef("heads/main");

  if (headSha !== baseSha) {
    // HEAD moved — but did it move under OUR files?
    const conflicts: string[] = [];
    for (const path of Object.keys(files)) {
      const [was, now] = await Promise.all([
        blobShaAt(baseSha, path),
        blobShaAt(headSha, path),
      ]);
      if (was !== now) conflicts.push(path);
    }
    if (conflicts.length) {
      throw new ActionError({
        code: "CONFLICT",
        message: `Changed upstream since you loaded: ${conflicts.join(", ")}. Reload to merge.`,
      });
    }
    // HEAD moved elsewhere (e.g. a photo commit) — safe to proceed on the NEW head.
  }

  const blobs = await Promise.all(
    Object.entries(files).map(([path, content]) => createBlob(path, content)));
  const tree   = await createTree(headSha, blobs);          // base_tree = CURRENT head
  const commit = await createCommit(tree, [headSha]);
  await updateRef("heads/main", commit, { force: false });  // 422 ⇒ raced; retry once from the top
  return commit;
}
```

**Trade-off:** two extra GitHub subrequests per file on the conflict path. Irrelevant at this scale (10 000 subrequests/invocation on the paid Workers plan), and it makes the guard something the operator will actually leave enabled — which is the entire point.

### Pattern 5: Client-generated job IDs for pipeline idempotency

**What:** The browser mints a UUID before uploading. It is simultaneously the R2 staging key, the workflow input, the run name, and the manifest dedupe key.

**When:** Any fire-and-forget async job triggered across a network boundary you don't control.

```
uploadId = crypto.randomUUID()
  → R2 key            temp/{uploadId}.{ext}
  → workflow input    upload_id
  → run-name          "photo: ${{ inputs.title }} (${{ inputs.upload_id }})"
  → manifest guard    if any entry has sourceUploadId === uploadId → no-op, exit 0
```

A retried dispatch is a no-op instead of a duplicate. A run is findable by name even if the dispatch response is lost. And the R2 key can never collide between two uploads of the same filename.

---

## Data Flow

### Flow A — Content publish (admin edit → live site)

```
 1  Operator opens https://akhilsaxena.com/admin
      │
 2  ├─ Cloudflare Access intercepts (path-scoped self-hosted app).
      │  Email-code login. On success, injects Cf-Access-Jwt-Assertion.
      │
 3  ├─ run_worker_first matches /admin* → request reaches the Worker
      │  (bypassing Static Assets).
      │
 4  ├─ src/middleware.ts: jwtVerify(header, JWKS, { issuer, audience }).
      │  CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD unset ⇒ 503 "not configured".
      │  ★ FAILS CLOSED. No cookie-presence fallback. This is the fix for
      │    legacy access.ts:38-61.
      │
 5  ├─ admin.astro frontmatter (prerender = false), server-side with the PAT:
      │    GET /repos/{repo}/git/ref/heads/main            → baseSha  (a REAL sha)
      │    GET /repos/{repo}/contents/data/*.json (raw ×4) → current content
      │  ★ NOT a build-time import. The legacy admin seeded from bundled JSON,
      │    which is stale the moment the photo pipeline commits.
      │
 6  └─ Renders <AdminApp client:only="react" initial={…} baseSha={sha} />
         Props are serialised into the HTML. No /api/data round trip exists.

 7  Operator edits. Island tracks dirty state PER FILE (an explicit dirty flag
    set by each change handler — not JSON.stringify comparison, which false-
    positives on key reordering and re-serialisation).

 8  Operator clicks Publish
      │
 9  ├─ actions.publishContent({ baseSha, ...changedFilesOnly, message })
      │    zod validates every payload with the SAME schemas the build uses.
      │    Invalid ⇒ typed input error, rendered inline. Nothing is committed.
      │    Résumé bullets pass through sanitize() in the schema .transform().
      │
10  ├─ Middleware re-checks the JWT (actions POST to /_actions/publishContent —
      │  covered by both the Access policy and run_worker_first).
      │
11  ├─ src/lib/github.ts publish():
      │    per-file blob-sha conflict check (Pattern 4)
      │    POST git/blobs ×N  →  POST git/trees (base_tree = current HEAD)
      │    →  POST git/commits  →  PATCH git/refs/heads/main (force: false)
      │    409 on real conflict, with the offending paths named.
      │
12  └─ Returns { sha }. Island resets baseSha = sha, clears dirty flags.

13  Push to main → Workers Builds fires
      npm ci && npx astro build && npx wrangler deploy
      │
14  ├─ astro build evaluates content.config.ts and src/lib/content.ts.
      │  ★ SCHEMA FAILURE HERE ⇒ BUILD FAILS ⇒ deploy does not happen ⇒
      │    the previous deployment stays live. Broken content cannot ship.
      │    (Step 9 should already have caught it; this is the backstop for
      │     hand-edited commits and for the pipeline's own writes.)
      │
15  └─ New Worker + static assets live in ~60–90 s.
```

**Where validation lives, summarised:** step 9 is the *gate* (stops the bad commit), step 14 is the *backstop* (stops the bad deploy), and the island's error rendering is a *derivative* of step 9. All three read `src/schemas/`.

### Flow B — Photo upload (browser → R2 → Actions → manifest → live)

```
 0  Browser mints uploadId = crypto.randomUUID()

 1  Island: actions.stagePhoto({ uploadId, file, title, category })
      accept: "form", input: z.instanceof(File) + metadata
      │
 2  ├─ Middleware: Access JWT verified.
      │
 3  ├─ Action validates: ≤25 MB · extension allow-list · magic-byte sniff
      │  (never trust the browser's Content-Type).
      │
 4  └─ import { env } from "cloudflare:workers"
         env.PORTFOLIO_BUCKET.put(`temp/${uploadId}.${ext}`, request.body)
         ★ Worker-proxied via the R2 BINDING — not a presigned URL. See below.

 5  Island: actions.dispatchPhotoJob({ uploadId, title, category })
      │
 6  ├─ POST /repos/{repo}/actions/workflows/process-photos.yml/dispatches
      │    { ref: "main",
      │      inputs: { upload_id, temp_key, title, category },
      │      return_run_details: true }          ← NEW, GitHub API, Feb 2026
      │  Returns 200 with the run id/url instead of a bare 204.
      │  ★ Deletes the legacy 10×-poll-for-the-run-id hack entirely.
      │
 7  └─ Returns { runId }. Island stores it.

 8  Island polls actions.jobStatus({ runId }) every ~5 s
      → GET /repos/{repo}/actions/runs/{runId} → { status, conclusion }
      (server-side: the PAT never reaches the browser)
      ★ This is how the admin learns the job finished. The legacy design had
        no answer — it fired and forgot.

 9  GitHub Actions: process-photos.yml
      concurrency: { group: "content-writes", cancel-in-progress: false }
      ★ Serialises ALL manifest writers. Two uploads queue; they don't race.
      │
10  ├─ IDEMPOTENCY GUARD: if data/portfolio_images.json already contains an
      │  entry with sourceUploadId === upload_id → log and exit 0.
      │  A retried dispatch is a no-op, not a duplicate.
      │
11  ├─ S3 SDK (Actions-only credentials): GetObject temp/{uploadId}.{ext}
      │
12  ├─ scripts/process-images.js:
      │    exifr.parse → { camera, lens, aperture, shutter, iso, focalLength }
      │    sharp → 4 webp variants (2000/1200/800/400) + SVG watermark
      │           → R2 photos/{category}/{slug}{suffix}.webp
      │    sharp → unwatermarked master → R2 private/{category}/{slug}-clean.webp
      │    sharp → 40px webp → base64 data URI (LQIP, embedded in the manifest)
      │
13  ├─ Append entry (+ sourceUploadId) to data/portfolio_images.json.
      │  ★ VALIDATE the appended entry against src/schemas/photo.ts BEFORE
      │    committing. A pipeline that writes malformed JSON currently produces
      │    a red build; validating here produces a red Action with a precise
      │    error, and main stays green.
      │
14  ├─ Delete R2 temp/{uploadId}.{ext}
      │
15  └─ git pull --rebase origin main && git push   (retry ×3 on non-fast-forward)
         → push to main → Workers Builds → live
```

#### Why binding-proxy upload, not presigned URLs

The brief asks about "presigned/direct upload to R2." Recommendation: **proxy through the Worker using the R2 binding.**

| | Binding proxy (recommended) | Presigned PUT |
|---|---|---|
| Credentials in the Worker | none — the binding *is* the grant | needs `R2_ACCESS_KEY_ID` + secret, a second credential set to rotate |
| R2 CORS config | not needed | required, plus the aws4fetch signed-header footgun (sending `Content-Type` from the browser breaks a `signQuery` URL) |
| Auth model | upload is inside the Access perimeter | the URL is a bearer capability that *escapes* Access once issued |
| Worker cost | `put(key, request.body)` is a stream — negligible CPU | zero |
| Size headroom | 100 MB request-body limit vs. a 25 MB cap | unbounded |

Four-to-one on a personal site with 25 MB photos. Presigned URLs are the right escape hatch if photos ever exceed ~100 MB or Worker CPU becomes a real constraint — note it, don't build it.

#### Failure modes and their answers

| Failure | Consequence | Mitigation |
|---|---|---|
| Upload lands in R2, dispatch call fails | Orphaned `temp/` object, no job | **R2 lifecycle rule: `prefix: "temp/", Days: 1`.** Configured once via `wrangler r2 bucket lifecycle add`. Self-healing, independent of any code path. |
| Operator closes the tab mid-job | Job completes; admin never sees it | Job is fully server-driven. Next admin load reflects the new manifest. `jobStatus` is a convenience, not a dependency. |
| Action crashes after R2 put, before delete | Orphaned `temp/` object | Same lifecycle rule. The explicit delete at step 14 is the fast path; the rule is the guarantee. |
| Dispatch retried (network flake, double click) | Duplicate manifest entry | `sourceUploadId` guard (step 10) + the existing deterministic `id = {category}-{slug}` duplicate check. |
| Two uploads at once | Interleaved manifest writes, lost entry | `concurrency: { group: "content-writes" }` serialises them. |
| **Pipeline commits while the admin is publishing** | Legacy behaviour: admin's `"latest"` clobbers the new photo | Per-file blob-sha check (Pattern 4). If the admin didn't touch `portfolio_images.json`, both land. If it did, a named 409. |
| Admin publish races the Action's push | Action's `git push` rejected non-fast-forward | `git pull --rebase` + 3 retries. The rebase is safe: the Action only appends to a JSON array. |
| Manifest write produces invalid JSON | Red build, site frozen at last good deploy | Validate in the Action (step 13) so the failure is caught before the commit, with a precise zod path. |

---

## Build Order / Dependency Graph

```
     ┌──────────────────────────────────────┐
     │ P0  DESIGN — admin + case-study UX   │  handoff has NO design for either.
     │     (design-system repo or Figma)    │  Blocks P5, P6. Blocks nothing else.
     └──────────────────────────────────────┘

  ┌─────────────────────────────┐      ┌────────────────────────────────────┐
  │ P1  DS: CHARCOAL THEME      │      │ P2  ASTRO FOUNDATION + AUTH        │
  │  ../design-system repo      │      │  this repo                         │
  │  · 3rd theme scope          │      │  · Astro 7 + adapter 14 + React 19 │
  │    :root[data-brand]        │  ∥   │  · wrangler.jsonc, Workers Builds  │
  │  · light-mode contrast fix  │      │  · run_worker_first, astro:env     │
  │    muted → ~#6E6A5E,        │      │  · ★ FAIL-CLOSED middleware        │
  │    add --ochre-d            │      │  · hello-world /admin proving the  │
  │  · split tokens/fonts;      │      │    prerender/on-demand split       │
  │    ship Playfair/DM Sans/   │      │  · ds:sync + ds:check gate         │
  │    IBM Plex faces           │      │  · CI: lint·typecheck·test         │
  │  · extend tokens.test.ts    │      └────────────────┬───────────────────┘
  │  · publish 1.12.0           │                       │
  └──────────────┬──────────────┘                       ▼
                 │                      ┌────────────────────────────────────┐
                 │                      │ P3  CONTENT LAYER                  │
                 │                      │  · src/schemas/ (zod, shared)      │
                 │                      │  · content.config.ts, lib/content  │
                 │                      │  · sanitize.ts (kills stored XSS)  │
                 │                      │  · port data/*.json, reconcile the │
                 │                      │    types.ts ↔ admin drift          │
                 │                      │  · tests: schema accepts real data,│
                 │                      │    rejects each known-bad shape    │
                 │                      └────────────────┬───────────────────┘
                 │                                       │
                 └───────────────┬───────────────────────┤
                                 ▼                       ▼
        ┌─────────────────────────────────┐   ┌──────────────────────────────┐
        │ P4  PUBLIC PAGES                │   │ P6b PHOTO PIPELINE (Actions) │
        │  Home · Work · Photos · Résumé  │   │  · process-photos.yml        │
        │  ★ islands boundary decided in  │ ∥ │  · scripts/*.js, concurrency │
        │    code here                    │   │  · idempotency guard         │
        │  · ds.css order + per-component │   │  · R2 lifecycle rule         │
        │  · srcset from the 5 variants   │   │  · drive with `gh workflow   │
        │  · Lightbox island, client:idle │   │    run` — needs NO admin UI  │
        └────────────────┬────────────────┘   └──────────────┬───────────────┘
                         │                                   │
              ┌──────────┴──────────┐                        │
              ▼                     ▼                        │
   ┌────────────────────┐  ┌────────────────────────────┐    │
   │ P5  CASE STUDIES   │  │ P6a ADMIN                  │◄───┘
   │  work/[slug]       │  │  · admin.astro read path   │
   │  needs P0 + P4     │  │  · actions/ write path     │
   │  patterns          │  │  · DS form editors         │
   └────────────────────┘  │  · Pattern 4 concurrency   │
                           │  · upload UI → P6b         │
                           │  needs P0 + P2 + P3        │
                           └────────────┬───────────────┘
                                        ▼
                        ┌────────────────────────────────┐
                        │ P7  HARDEN + CUT OVER          │
                        │  Lighthouse budget in CI       │
                        │  a11y, prefers-reduced-motion  │
                        │  auth/publish/pipeline tests   │
                        │  DNS → akhilsaxena.com         │
                        └────────────────────────────────┘
```

### Why this order — the real dependencies

**P1 ∥ P2 is genuine parallelism.** Different repositories, no shared code, no shared build. The theme is a token-layer CSS change with test coverage; the Astro foundation is config and a middleware file. Neither reads the other. This matters because P1 is the project's declared blocker and P2 is the longest-lead-time item (getting a Workers deploy green on a custom domain always takes longer than expected).

**Auth belongs in P2, not in the admin phase.** This is the single most important sequencing call here. The moment `/admin` exists as a route in a deployed Worker, it is a live attack surface. Shipping the fail-closed middleware *before* the first admin route means there is never a window where a half-built admin is reachable. The legacy app's fail-open fallback (`access.ts:38-61`) is precisely what happens when auth is treated as an admin-phase concern and "we'll tighten it later" gets written into a comment.

**P3 before P4, strictly.** Pages read from content collections. Writing pages first means writing them against untyped `import`s and then rewriting every data access when the collection lands. The schemas are also the port's forcing function for reconciling the documented `src/types.ts` ↔ admin type drift — resolve it once, in a schema, before three consumers encode the drift.

**P4 requires P1.** Not for correctness — the public pages would render fine against the DS's default amber/paper palette — but the pages *are* where the theme's gaps surface, and discovering "the theme has no `--ochre-d`" after building four pages means four rounds of visual rework. Ship the theme first; let *component-level* gaps (which are a different axis) feed subsequent DS patch releases.

**P4 before P6a, despite the admin being the better DS stress test.** `PROJECT.md`: "Live site is down until cutover — accepted, but it is a clock on the project." The clock only stops when the public site is up. The admin serves one authenticated user who currently has `git` and a text editor as a perfectly serviceable fallback.

**P6b is parallelisable with P4 and is a real find.** The Actions half of the photo pipeline depends only on P3 (the manifest schema) and on R2 credentials. It can be built, run, and verified end-to-end with `gh workflow run process-photos.yml -f upload_id=… -f temp_key=…` long before any admin UI exists. Splitting P6 this way removes the pipeline from the critical path entirely — and it means the riskiest, least-familiar integration (sharp + exifr + R2 + concurrent git push) gets debugged early instead of at the end, wedged behind the admin.

**P0 blocks only P5 and P6a.** The handoff covers Home, Work, and Photos. It has *no design at all* for `/admin` or for case studies. That gap is real work and it is on the critical path for two phases — but for neither of the two that must land first. Start it early; it doesn't gate P1–P4.

**P5 after P4.** Case studies reuse P4's layout, typography scale, and component vocabulary. Building them first means inventing that vocabulary twice.

### What can genuinely proceed in parallel

| Track | Phases | Independence |
|---|---|---|
| Design system | P1 | Separate repo, separate release. Zero shared code with P2/P3. |
| Design | P0 | Pure design artefact. Zero code dependency. |
| Platform | P2 → P3 | Blocks everything downstream; start immediately. |
| Pipeline | P6b | After P3. Testable via `gh workflow run` with no UI. |
| Product | P4 → P5, P6a | After P1+P3. This is the serial spine. |

Honest caveat: this is one developer. "Parallel" means *unblocked* — safe to interleave, safe to reorder — not simultaneous. The value of the graph is knowing that a stall in P1 does not stall P2/P3/P6b, and that P6b can absorb a day whenever P4 is blocked on a design question.

---

## Scaling Considerations

Users are not the scaling axis for a personal site behind Cloudflare's CDN — 39 photos and static HTML will serve arbitrary traffic. The real axes are content volume, build time, and edit concurrency.

| Axis | Today | 3× (≈120 photos) | 10× (≈400 photos) |
|---|---|---:|---|
| `portfolio_images.json` | ~39 entries, base64 LQIP inline | ~500 KB — still a single-file commit, fine | ~1.7 MB. Move `thumb` LQIP out of the manifest (R2 or a sidecar), or shard by category. |
| Astro build | seconds | seconds | Content Layer caches in `.astro/`; Astro 7.1 added `deferRender` for large collections if it bites. |
| `/photos` DOM | 39 `<img>`, lazy below fold | Add DS `Pagination` or `InfiniteList` (both already in the DS) | Definitely paginated. |
| Lightbox island props | ~12 KB JSON | ~40 KB — trim to `{ large, alt, exif }` only | Fetch on open, or read from `data-*` on the grid. |
| Admin publish payload | whole-file rewrite of ≤4 files | fine | Per-field patch instead of whole-file. |
| Concurrent editors | 1 | 1 | 1. Optimistic concurrency is protecting against *human vs. pipeline*, not human vs. human. |

### First bottleneck

**Not performance — the `.local-packages` workflow.** Every theme tweak is a manual `ds:sync`. If theme iteration turns out to be dozens of cycles rather than a handful, switch to the guarded-symlink mode for that stretch. Watch for it in P1/P4 and don't over-engineer it up front.

### Second bottleneck

**Deploy latency on the edit loop.** Every content change is a full rebuild + deploy, ~60–90 s. Acceptable for "add a photo on a Sunday." If it becomes annoying, the answer is a preview pane in the admin that renders from island state (already planned), **not** runtime content fetching — which would reintroduce the server runtime on public pages that dropping analytics was meant to eliminate.

---

## Anti-Patterns

### Anti-Pattern 1: Reimplementing design-system primitives as `.astro` components

**What people do:** "React on a static page is wasteful — I'll make `Card.astro`, `Heading.astro`, `Text.astro`."
**Why it's wrong:** It costs nothing to avoid (SSR'd React components ship zero JS), and it forks the token contract. A DS contrast fix or a spacing correction never reaches the site. The site stops being evidence that the design system works — which is this project's stated core value, not a preference.
**Instead:** Import the DS React component into `.astro` with no client directive. Reserve `.astro` components for *composition* (page sections, grids, layouts) — things the DS has no opinion about.

### Anti-Pattern 2: Hydrating an island for behaviour a `<script>` can do

**What people do:** `<ThemeToggle client:load />` because the toggle "is interactive."
**Why it's wrong:** ~50 KB gzip and hydration TBT on every page, to toggle one class. And it cannot fix FOUC — an island hydrates *after* first paint, so dark-by-default flashes light regardless.
**Instead:** SSR the DS `IconButton`, attach a delegated listener hooked on your own `data-*` attribute, and put the theme bootstrap in an `is:inline` `<head>` script. Same markup, same CSS, 1% of the bytes.

### Anti-Pattern 3: `baseSha: "latest"` — disabling a guard because it's too strict

**What people do:** Optimistic concurrency 409s on an unrelated upstream commit, so they bypass it "temporarily." (`DeployButton.tsx:86`. The fix was written in a code comment and never acted on.)
**Why it's wrong:** It converts a false-positive annoyance into silent data loss. An admin publish can clobber a photo the pipeline committed thirty seconds earlier, with no error anywhere.
**Instead:** Make the guard precise enough to leave on — per-file blob-sha comparison (Pattern 4). A guard nobody wants to bypass is the only guard that stays enabled.

### Anti-Pattern 4: Seeding the admin from a build-time `import`

**What people do:** `import photos from "../../data/portfolio_images.json"` in the admin, exactly like the public pages do.
**Why it's wrong:** The admin bundle is frozen at the last deploy. The photo pipeline commits between deploys. The admin therefore edits a stale copy and has no commit SHA to base a conflict check on — this is the *root cause* of the `"latest"` bug, not an unrelated defect.
**Instead:** `admin.astro` is `prerender = false`. Fetch content **and** HEAD SHA server-side in the frontmatter, pass both as island props. Fresh data and a real base SHA come from the same request.

### Anti-Pattern 5: Validating in the admin UI only

**What people do:** Nice inline form validation in the editor; the server takes whatever arrives.
**Why it's wrong:** The server is the only thing between a payload and `main`. And in a git-as-database system, a bad commit doesn't corrupt a row — it breaks the build for every future deploy until someone fixes it by hand.
**Instead:** One zod module, three enforcement points (Pattern 1). Client validation is a *derivative* of the server schema, not a parallel implementation.

### Anti-Pattern 6: Rendering author-controlled HTML with `dangerouslySetInnerHTML`

**What people do:** Résumé bullets contain `<strong>`, so render them raw. (`Timeline.tsx:48` plus three admin components, with no sanitizer anywhere in the legacy repo.)
**Why it's wrong:** "Author-controlled" stops being true the moment the author's session is the thing being attacked. It is stored XSS with a comment excusing it.
**Instead:** Sanitize inside the zod `.transform()` in `src/schemas/resume.ts`, with a `<strong>`/`<em>`-only allow-list. It then runs at build time *and* at write time, in Node, at zero client cost — and it is impossible to forget at a call site, because there is no unsanitized value to reach for.

### Anti-Pattern 7: Scoping Cloudflare Access to `/admin*` and `/api/*` only

**What people do:** Port the legacy Access policy verbatim.
**Why it's wrong:** Astro Actions POST to `/_actions/<name>`, a path that did not exist in the Next.js app. Every mutation would be outside the Access perimeter.
**Instead:** The Access policy and `run_worker_first` must both list `/admin*`, `/api/*`, **and** `/_actions/*`. Also: do **not** use the new one-click Worker-level Access ([Cloudflare changelog, 2026-08-14](https://developers.cloudflare.com/changelog/post/2026-08-14-workers-access/)) — it protects the entire Worker with no path granularity, which would lock the public site behind a login. Use a classic path-scoped self-hosted Access application.

### Anti-Pattern 8: Importing `sharp`/`exifr`/`@aws-sdk/client-s3` from `src/`

**What people do:** "The upload action could just resize it inline."
**Why it's wrong:** `sharp` is a native binary; it cannot run on `workerd`. The failure is a confusing build error, not a clean rejection.
**Instead:** Keep them devDependencies used only by `scripts/`. Add an ESLint `no-restricted-imports` rule so the boundary is enforced rather than remembered.

---

## Integration Points

### External Services

| Service | Integration pattern | Gotchas |
|---|---|---|
| **GitHub Git Data API** | `src/lib/github.ts` only. blob→tree→commit→ref for every write, including single files | Use Git Data for *all* writes, not Contents-API-for-one-file. Contents API needs a GET-for-sha per file and can't commit atomically. `PATCH refs` with `force: false`; a 422 means you raced — re-read HEAD and retry once. |
| **GitHub Actions dispatch** | `POST .../workflows/process-photos.yml/dispatches` with `return_run_details: true` | The `return_run_details` parameter (GitHub, [Feb 2026](https://github.blog/changelog/2026-02-19-workflow-dispatch-api-now-returns-run-ids/)) returns 200 + run details instead of a bare 204. Omitting it silently falls back to 204 — then you're stuck polling like the legacy code. |
| **Cloudflare R2** | Two distinct access paths, deliberately | Worker: `import { env } from "cloudflare:workers"` → `env.PORTFOLIO_BUCKET`. Actions runner: `@aws-sdk/client-s3` with separate `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`. Never mix. Add the `temp/` 1-day lifecycle rule at setup, not later. |
| **Cloudflare Access** | Path-scoped self-hosted application + in-Worker `jose` JWT verification | JWKS at `https://{TEAM_DOMAIN}/cdn-cgi/access/certs`, cached in a module-level `Map`. Must cover `/_actions/*`. Fail closed on missing config. |
| **Workers Builds** | Git integration on `main`: `npm ci && npx astro build && npx wrangler deploy` | Node 22+ (Astro 6 dropped 18/20). A failed build leaves the previous deployment serving — which is why the build-time schema gate is a genuine safety net and not just noise. |
| **Cloudflare Workers Static Assets** | `assets: { binding: "ASSETS", directory: "./dist" }` | Assets are matched *before* the Worker runs. Anything needing Worker logic must be in `run_worker_first`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `.astro` page ↔ DS React component | Direct import, **no** client directive | The zero-JS default. Adding a directive here is the single decision that costs 50 KB. |
| `.astro` page ↔ `src/components/islands/*` | Explicit `client:*` directive | Directory name is the audit surface. `client:idle` for the lightbox, `client:only="react"` for admin. |
| Admin island ↔ server | `astro:actions` typed RPC | Not `fetch("/api/...")`. Typed inputs, typed errors, zod for free, `accept: "form"` for multipart. |
| Actions ↔ GitHub | `src/lib/github.ts` | One module. The PAT never appears anywhere else. |
| Build ↔ content | Content Layer (`photos`) + module-scope parse (configs) | Both fail the build on invalid data. Same schemas as the actions. |
| Worker ↔ image processing | `workflow_dispatch` + R2 | Fully async. The Worker never touches pixels. |
| `src/` ↔ `scripts/` | **None.** Enforced by lint | `scripts/` is Node-only; `src/` is workerd-only. |
| Portfolio ↔ design system | Published npm package, `file:` tarball in dev | `ds:check` in CI fails the build if the spec is still local. |

---

## Open Questions for Later Phases

1. **Does `import "@akhil-saxena/design-system/css/card"` resolve under Astro's build?** The `exports` map uses a `"style"` condition with a `"default"` fallback. The fallback should work, but verify before the per-component CSS strategy becomes load-bearing for the budget. *(Confidence: MEDIUM. Cheap to test in P2.)*
2. **Barrel-import tree-shaking into islands.** The DS ships tiptap, lowlight, dnd-kit, and lucide-react as dependencies. `tsup` uses `splitting: true` and `sideEffects: ["*.css"]`, so importing `Lightbox` from the barrel *should* not pull tiptap into the `/photos` bundle. Measure it in P4 — if it does, use a deep import path. *(MEDIUM.)*
3. **JS budget numbers are estimates.** ~45–50 KB gz for a React 19 island is a well-known figure but was not measured on this build. Set a real budget with `lighthouse-ci` in P7 and let it be the arbiter. *(MEDIUM.)*
4. **How does the charcoal theme express its scope?** `:root[data-brand="charcoal"]` is the specificity-safe choice given `:root.dark` is `(0,2,0)`, but the design system owns that decision and has never had a third axis. Settle it in P1, in the DS repo, with a test.
5. **Case-study content shape.** Markdown via a `glob()` collection, or JSON in `data/`? Markdown is better for prose; JSON keeps everything editable in one admin. Depends on P0 and on whether case studies are admin-editable at all. Unresolved.

---

## Sources

**Framework and platform (HIGH confidence — official documentation, checked 2026-08-16)**
- [Astro — @astrojs/cloudflare integration guide](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) — Pages support dropped; `cloudflare:workers` env; `Astro.locals.cfContext`
- [Astro — Deploy to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/) — Workers config, `wrangler.jsonc`, Workers Builds
- [Astro — Upgrade to v6](https://docs.astro.build/en/guides/upgrade-to/v6/) — Node 22, Vite 7, Zod 4, Content Layer mandatory
- [Astro — Upgrade to v7](https://docs.astro.build/en/guides/upgrade-to/v7/) — Vite 8, markdown engine
- [Astro — Content collections](https://docs.astro.build/en/guides/content-collections/) — `file()` loader, JSON shapes, zod schemas
- [Astro — Content loader reference](https://docs.astro.build/en/reference/content-loader-reference/) — `file()` parser option
- [Astro — Actions](https://docs.astro.build/en/guides/actions/) — `defineAction`, `accept: "form"`, `z.instanceof(File)`, `getActionContext()` middleware gating
- [Astro — Framework components](https://docs.astro.build/en/guides/framework-components/) — server-rendered React with zero client JS
- [Astro — Directives reference](https://docs.astro.build/en/reference/directives-reference/) — `client:idle`, `client:visible`, `client:only`
- [Astro — On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/) — `export const prerender = false`
- [Astro — Environment variables](https://docs.astro.build/en/guides/environment-variables/) / [config reference](https://docs.astro.build/en/reference/configuration-reference/) — `astro:env` schema
- [Astro — Project structure](https://docs.astro.build/en/basics/project-structure/) — `src/content.config.ts` location
- [Astro — Share state between islands](https://docs.astro.build/en/recipes/sharing-state-islands/) — nanostores (noted, not needed here)
- [Cloudflare — Workers limits](https://developers.cloudflare.com/workers/platform/limits/) — 100 MB request body, CPU, subrequests
- [Cloudflare — R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) — prefix-scoped expiry, 1-day granularity
- [Cloudflare — Workers CI/CD (Workers Builds)](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Cloudflare changelog — Access on Workers (2026-08-14)](https://developers.cloudflare.com/changelog/post/2026-08-14-workers-access/) — Worker-level, not path-scoped
- [GitHub changelog — workflow_dispatch API returns run IDs (2026-02-19)](https://github.blog/changelog/2026-02-19-workflow-dispatch-api-now-returns-run-ids/) — `return_run_details`
- [GitHub Actions — workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) — `run-name` with `inputs` context, `concurrency`
- npm registry, queried directly: `astro@7.2.2`, `@astrojs/cloudflare@14.2.1` (peer `astro@^7.2.0`), `@astrojs/react@6.0.2`

**Design system (HIGH confidence — read the source at `../design-system` v1.11.4)**
- `package.json` — exports map, `peerDependencies react@^19`, `sideEffects: ["*.css"]`, ESM-only
- `tsup.config.ts` + `scripts/postbuild.mjs` — externals, `"use client"` stamping, CSS split
- `src/tokens.css` — `:root` / `:root.dark` scopes, 14 `@fontsource` imports (~73 `@font-face`)
- `src/foundation/*`, `src/surfaces/Card`, `src/inputs/*`, `src/overlays/Lightbox` — hook-usage audit
- `dist/` sizes — `primitives.css` 176 KB, `css/base.css` 8 KB, 74 per-component sheets

**Cross-repo workflow (MEDIUM confidence — Vite docs plus widely-reported community failure modes)**
- [Vite — Dependency pre-bundling](https://vite.dev/guide/dep-bundling) — `npm pack` fixes transitive dedupe; `optimizeDeps.exclude`
- [Vite — Shared options](https://vite.dev/config/shared-options) — `resolve.dedupe`, `resolve.preserveSymlinks`
- [vite#6479 — preserveSymlinks breaks HMR](https://github.com/vitejs/vite/issues/6479)
- [React — Invalid hook call warning](https://legacy.reactjs.org/warnings/invalid-hook-call-warning.html) — duplicate React diagnosis
- [vite-plugin-react#137 — "use client" warning handling](https://github.com/vitejs/vite-plugin-react/issues/137)

**Project context (read directly)**
- `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/INTEGRATIONS.md`, `design_handoff_portfolio/README.md`

---
*Architecture research for: static-first portfolio + git-backed CMS on Astro islands over a cross-repo React design system, Cloudflare Workers*
*Researched: 2026-08-16*
</content>
</invoke>
