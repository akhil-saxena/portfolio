# Pitfalls Research

**Domain:** Astro + React islands static/hybrid site on Cloudflare, consuming a self-published React design system, with a git-backed (GitHub-API) admin CMS
**Researched:** 2026-08-16
**Confidence:** HIGH on platform/version facts (verified against current official docs and the actual published npm artifacts); MEDIUM on tree-shaking and hydration-cost predictions (require measurement in-project)

> **Scope note.** `.planning/codebase/CONCERNS.md` already covers the legacy app's XSS, fail-open auth, `baseSha: "latest"`, pipeline atomicity, missing schema validation, and dead code. None of that is restated here. Everything below is a **new-stack** hazard that the legacy audit could not have found, because the legacy app was Next.js on Pages.

---

## ⚠️ Read This First: Two Project Assumptions Are Already Invalid

Both are stated as fact in `PROJECT.md` and both are wrong against the current toolchain. They are cheap to fix now and very expensive to discover in Phase 3.

| `PROJECT.md` says | Reality (verified 2026-08-16) |
|---|---|
| "Deploys to akhilsaxena.com via **Cloudflare Pages**" / "**Platform**: Cloudflare Pages" | `@astrojs/cloudflare` **v13.0.0 dropped official Cloudflare Pages support**. Current version is **14.2.1**. The changelog entry is explicit: *"Drops official support for Cloudflare Pages in favor of Cloudflare Workers… the adapter now only supports deployment to Cloudflare Workers by default."* The Astro deploy guide now only documents Workers. |
| "Cloudflare bindings (R2 `PORTFOLIO_BUCKET`) come from **`locals.runtime.env`**" | `Astro.locals.runtime` was **removed** in adapter v13. The replacement is `import { env } from 'cloudflare:workers'`. (`.cf` → `Astro.request.cf`; `.caches` → global `caches`; `ExecutionContext` → `Astro.locals.cfContext`.) v14.0.0 removed even the deprecation warnings. |

Also worth pricing in: **Astro is at v7.2.2**, not v5. Between the legacy audit's mental model and today there are three Astro majors (v5→v6→v7) and two adapter majors (v12→v13→v14).

Cloudflare has **not** deprecated Pages — the Pages docs carry no maintenance-mode banner. The break is on the *Astro* side, not the Cloudflare side. So the decision is real and needs making, not assumed.

---

## Critical Pitfalls

### Pitfall 1: Planning for Cloudflare Pages when the adapter only supports Workers

**What goes wrong:**
The roadmap is written around Pages (`wrangler.toml` with `pages_build_output_dir`, the Pages↔GitHub build integration, the Pages dashboard for env vars, `_worker.js` in `.vercel/output/static`). Phase 1 scaffolds it, everything appears fine because a **static-only** Astro build deploys to Pages happily. The break lands in Phase 3 when `/admin` and `/api/*` need on-demand rendering, and the adapter's Workers-only output does not match what Pages expects. At that point the deploy target, the DNS plan, the secrets location, and the CI wiring all have to change at once — under the pressure of a site that is already down.

**Why it happens:**
The legacy app was on Pages, `AGENTS.md` documents Pages, and a static Astro site genuinely does deploy to Pages. The failure only surfaces when the server half arrives, which is deliberately late in the plan.

**How to avoid:**
Decide the target in **Phase 1, before any deploy wiring exists**, and write it into `PROJECT.md`. Recommended: **Cloudflare Workers with static assets**, which is where the adapter, the Astro docs, and Cloudflare's own guidance all point. Concretely:
- `wrangler.jsonc`, not `wrangler.toml`, with `assets.directory: "./dist"` and `assets.binding: "ASSETS"`.
- Adapter ≥13 provides its own entrypoint: `"main": "@astrojs/cloudflare/entrypoints/server"` works for both `astro dev` and production. (The older `dist/_worker.js/index.js` value still appears in some docs; prefer the adapter entrypoint.) Since v13 the wrangler file is *optional* if you have no bindings — but this project has R2, so you need one.
- Replace the Pages↔GitHub build integration with a **GitHub Actions deploy job** (`wrangler deploy`). This is not a downgrade — it lets you gate deploys on lint/typecheck/schema-validation, which `CONCERNS.md` flagged as impossible under Pages' auto-build.
- `compatibility_flags` per the Astro guide: `["nodejs_compat", "global_fetch_strictly_public"]`.

**Warning signs:**
Any `wrangler.toml` with `pages_build_output_dir`. Any reference to `.vercel/output/static`. Any doc still saying "push to main triggers the Pages rebuild." Adapter version pinned `<13` to keep Pages working (this strands you on an unsupported branch immediately).

**Phase to address:** Phase 1 (Foundation) — this is a decision, not an implementation, and it must precede all deploy wiring.

---

### Pitfall 2: `run_worker_first` defaults to `false` — a prerendered `/admin` or `/api/*` bypasses the Worker entirely

**What goes wrong:**
This is the single most dangerous item in this document, because it is a **fail-open auth path with a different shape than the one `CONCERNS.md` found**, and it produces no error.

Two independent defaults compose into a hole:

1. **Astro:** in `output: 'static'` (the default), endpoints under `src/pages/api/` **are prerendered by default**. Astro calls the handler *once at build time* and writes the returned body to a static file. You must write `export const prerender = false` on *every single* endpoint.
2. **Cloudflare Workers static assets:** the default routing serves a **matching static asset first**, and only runs the Worker when nothing matches. (This is the *opposite* of Pages, where Functions ran before assets.)

Compose them: forget `export const prerender = false` on `/api/deploy`, and the build emits a static file at that path. Cloudflare then serves that file directly. `requireAccess()` never executes — not because it was weak, but because the Worker was never invoked. The same applies to a `/admin` page that gets prerendered.

**Why it happens:**
Three reinforcing reasons. (a) `export const prerender = false` is per-file boilerplate with no linting; the tenth endpoint is the one you forget. (b) The Pages→Workers routing inversion is counter-intuitive to anyone porting from Pages. (c) The failure is *silent and looks like success* — a prerendered `GET /api/data` returns plausible-looking JSON (the build-time snapshot), so a smoke test passes.

**How to avoid:**
Defence in depth, all three layers:
- Set **`assets.run_worker_first: ["/admin", "/admin/*", "/api/*"]`** in `wrangler.jsonc`. The array form exists precisely for this — Worker-first on protected routes, asset-first everywhere else so the public site keeps its edge-cache performance.
- Add a **build-time assertion**: after `astro build`, fail CI if any file matching `dist/admin/**` or `dist/api/**` exists on disk. Five lines of Node, and it makes the whole class of bug impossible to ship.
- Add an **integration test that asserts `GET /api/deploy` with no Access header returns 401**, run against `astro preview` (which now runs real workerd). Pair it with the `requireAccess()` unit tests `CONCERNS.md` already asked for.

**Warning signs:**
`dist/api/` exists after a build. An `/api/*` route returns 200 with identical content on every request regardless of input. An endpoint responds correctly *without* the `Cf-Access-Jwt-Assertion` header. Astro build logs listing an `/api/…` path among prerendered routes.

**Phase to address:** Phase 1 (set `run_worker_first` + the build assertion when scaffolding), re-verified in Phase 3 (Admin) and again at Phase 5 (Cutover).

---

### Pitfall 3: The design system's JS is one 334 KB barrel that statically imports TipTap, ProseMirror, dnd-kit and lowlight

**What goes wrong:**
Measured directly from the published `@akhil-saxena/design-system@1.11.4` tarball:

- `dist/index.js` is **334 KB raw / 71 KB gzipped**, a single file — not per-component chunks.
- Its `exports` map has **no per-component JS subpaths**. Only `.`, `./hooks`, `./icons`, `./tokens.css`, `./primitives.css`, `./utilities.css`, `./css/*`. CSS is splittable; **JS is not**.
- `index.js` carries **top-level static imports** of `@tiptap/react`, `@tiptap/starter-kit`, five `@tiptap/extension-*` packages, `lowlight`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, and `lucide-react` — all listed as hard `dependencies`, not peer or optional.

So `import { Chip } from '@akhil-saxena/design-system'` in the photo-gallery island puts TipTap + the entire ProseMirror stack + highlight.js into the module graph of a **public page whose Lighthouse target is 95+**. Tree-shaking *may* rescue it — the package correctly declares `sideEffects: ["*.css"]`, so Rollup is permitted to drop unused JS exports — but TipTap/ProseMirror and highlight.js are historically poor tree-shaking subjects, and a single unanalysable reference anchors the whole subtree. This is a coin-flip you cannot afford to discover in Phase 4.

**Why it happens:**
Bundle cost is invisible during development. `astro dev` serves unbundled ESM, so the gallery feels instant locally. The number only appears in a production build, and only if someone looks.

**How to avoid:**
- **Measure in Phase 1, not Phase 4.** Build a throwaway page that imports exactly one trivial DS component into a `client:load` island, run `astro build`, and inspect the emitted client chunks (`rollup-plugin-visualizer` or just `ls -la dist/_astro/`). If `prosemirror`/`lowlight`/`tiptap` appear, tree-shaking has failed. **This is a five-minute experiment that de-risks the entire performance goal.**
- If it fails, the fix belongs **upstream in the design system**, which is exactly what this project's Core Value says to do: *"any gap it exposes is a finding rather than a workaround."* The finding is: **the DS needs per-component JS subpath exports** (`./components/*`) so consumers can import `Chip` without importing `RichText`. Ideally TipTap/lowlight also move to `optionalDependencies` + `import()` behind the `RichText` component.
- Set a hard **per-page JS budget** in CI (e.g. ≤ 60 KB gzipped total client JS on `/`, `/photos`, `/work`, `/resume`) and fail the build on regression. Without a number in CI this silently rots.
- Regardless: the admin should be the *only* place that touches `RichText`, and it should be a separately-chunked, non-prerendered route so its weight never lands on a public page.

**Warning signs:**
`prosemirror-*`, `lowlight`, `highlight.js`, or `@tiptap` in `dist/_astro/*.js`. Any public-page client chunk over ~100 KB gzipped. Lighthouse "Reduce unused JavaScript" flagging a DS chunk. TBT above ~200 ms on the gallery.

**Phase to address:** Phase 1 (measure + decide), Phase 0/1 of the **design-system repo** (fix upstream — this is on the critical path and blocks portfolio integration), enforced in Phase 4 (Quality).

---

### Pitfall 4: `tokens.css` drags in 15 `@fontsource` imports / 73 `@font-face` rules — and you cannot import tokens without them

**What goes wrong:**
Verified in the published `dist/tokens.css`:

```
@import "@fontsource/inter/{400,500,600,700}.css";        → 7 @font-face each = 28
@import "@fontsource/archivo/{500,600,700,800,900}.css";  → 3 @font-face each = 15
@import "@fontsource/jetbrains-mono/{400,500,600,700}.css"; → 6 @font-face each = 24
@import "@fontsource-variable/newsreader/opsz{,-italic}.css"; → 3 each = 6
```

**73 `@font-face` declarations, 4 families, from a file you are *required* to import** to get the design tokens. Add the portfolio's own Playfair Display and it is five families on a site that visually uses two.

Two distinct costs, which are worth separating because conflating them leads to the wrong fix:

- **CSS weight (certain):** ~30 KB of `@font-face` text inlined into your critical, render-blocking stylesheet, on top of `primitives.css` at **181 KB** + `tokens.css` 16 KB + `utilities.css` 5.9 KB ≈ **204 KB raw** of DS CSS. (The brief said ~165 KB; measured it is 204 KB.)
- **Font bytes (conditional):** browsers only fetch a `@font-face` whose family is actually used, and `@fontsource` ships `unicode-range` subsets, so non-Latin never downloads. But if DS component tokens reference Inter/Archivo/JetBrains Mono anywhere in rendered output, you pay for real: Inter latin ~24 KB × 4 weights, Archivo ~14 KB × 5, JetBrains Mono ~21 KB × 4, Newsreader variable latin 58–132 KB depending on axis file. Worst case is **~400 KB of fonts**, which is fatal to LCP.

On the `@import`-waterfall question specifically: these are **bare specifiers** (`@fontsource/inter/400.css`), which Vite resolves and **inlines at build time** — so they do *not* create the classic sequential network waterfall that `@import url(https://…)` would. The render-blocking-waterfall concern is real for remote `@import` but **does not apply here**. Do not spend effort solving that; spend it on font *count*.

**Why it happens:**
The DS bundles fonts for zero-config correctness in its own docs site. That is right for a component library demo and wrong for a performance-budgeted portfolio, and the coupling to `tokens.css` means the consumer has no opt-out.

**How to avoid:**
- **Audit which families actually render.** In Phase 1, load a representative page and check DevTools → Network → Font. Anything downloaded that is not Playfair or the one body face is waste.
- **Upstream fix (preferred, and again a legitimate DS "finding"):** split fonts out of `tokens.css` into an opt-in `@akhil-saxena/design-system/fonts.css`, leaving `tokens.css` as pure custom properties. This is a small, non-breaking-ish DS change and it is the correct architecture — a token file should not make network decisions for its consumer.
- **Consumer-side mitigation if upstream slips:** override the font-family tokens to your own stack in the charcoal theme so the DS families are never *used* (unused `@font-face` costs bytes-of-CSS but zero font downloads), and `<link rel="preload" as="font" crossorigin>` only the 1–2 faces in the LCP element.
- Ensure `font-display: swap` (fontsource default) survives, and **set explicit `size-adjust`/fallback metrics** for the display serif or the swap will cost you CLS on the exact hero text that is your identity.

**Warning signs:**
More than 2–3 font files in the Network panel. Lighthouse "Ensure text remains visible during webfont load" or "Avoid enormous network payloads." Any CLS attributable to the hero heading.

**Phase to address:** Phase 1 (audit), design-system repo (upstream split), Phase 4 (preload + fallback metrics + budget enforcement).

---

### Pitfall 5: Local `file:` linking the design system creates a second React copy → "Invalid hook call"

**What goes wrong:**
`PROJECT.md` commits to linking `../design-system` via `file:` during development. npm implements `file:` for a directory as a **symlink**. Vite then resolves `react` from *inside* `../design-system/node_modules`, while the app resolves its own — two React instances, one dispatcher, and every DS component using a hook throws `Invalid hook call. …You might have more than one copy of React in the same app.`

The Astro-specific aggravation: this can appear **only in SSR**, or **only on the first request after a cold dev-server start**, or **only in the island and not in the Astro page**, because Astro maintains separate SSR and client dependency-optimizer graphs. Astro has shipped fixes for exactly this shape recently — adapter 14.1.2 (*"Fixes React invalid hook warning during cold SSR optimizer reload when using ClientRouter"*) and a core fix prebundling `astro/components` and the ClientRouter runtime *"…which caused React 'Invalid hook call' errors in islands on the first request after a cold cache."* A user report on Astro 6 + adapter 13 described a blank page with this error that **disappeared on refresh** — an intermittent bug is far worse than a consistent one, because it gets dismissed as a fluke for weeks.

**Why it happens:**
`file:` symlinking is the obvious ergonomic choice for cross-repo work, and the symptom is intermittent and misattributed.

**How to avoid:**
- Add to `astro.config.mjs` **from day one**, before it breaks:
  ```js
  vite: {
    resolve: { dedupe: ['react', 'react-dom', 'react/jsx-runtime'] },
  }
  ```
  Belt-and-braces: an npm `overrides` block pinning a single `react`/`react-dom` version, and ensure the DS repo keeps React as `peerDependencies` only (it does — `^19.0.0` — so it must not also carry them as real deps or devDeps that get symlinked in).
- **Prefer `npm pack` + install-the-tarball over `file:` symlinking.** A tarball install is a real copy with real dependency resolution and behaves like the published package — which also makes the "switch to published version at integration" gate a no-op instead of a re-integration. This directly de-risks the cross-repo constraint `PROJECT.md` already flags.
- **Pin `@astrojs/cloudflare` ≥ 14.2.1 and Astro ≥ 7.2.x** so you are above the known ClientRouter/optimizer hook-call fixes. If you adopt `<ClientRouter />` for view transitions, this is not optional.

**Warning signs:**
`Cannot read properties of null (reading 'useRef'|'useState')`. An error that vanishes on refresh. `ls node_modules/@akhil-saxena/design-system/node_modules/react` returning a directory. Two `react` entries in a bundle visualizer.

**Phase to address:** Phase 1 (Foundation) — configure `dedupe` and choose the linking strategy in the very first commit that adds the DS.

---

### Pitfall 6: Prerendering now runs in **workerd**, so build-time code is subject to Workers runtime limits

**What goes wrong:**
Adapter v13 changed how prerendering works: *"The Cloudflare adapter now uses the new `setPrerenderer()` API to prerender pages via HTTP requests to a local preview server running workerd, instead of using Node.js."* And `astro dev` itself now runs in workerd, not Node.

Consequence: a dependency that reaches for a Node built-in **at module load** now fails during `astro build`, not just at request time. Anything in the DS's transitive graph, any `node:fs` read of `data/*.json` outside Astro's own import handling, any Node-only markdown/EXIF/image helper — all of it is now inside the Workers sandbox at build time.

This is a *good* change (dev ≈ prod), but it inverts the mental model in `AGENTS.md` and `PROJECT.md`, both of which assume "bindings are absent in local dev, so guard access." Under workerd dev, bindings **are** present locally via Miniflare. The guard is still worth having, but the *reason* changed, and code written to the old assumption will be wrong in both directions.

**Why it happens:**
"Build steps run in Node" is a near-universal assumption. Nothing warns you it no longer holds.

**How to avoid:**
- Set `compatibility_date` deliberately and record why. **Node.js compatibility is now on by default for `compatibility_date` ≥ 2026-08-04**; for anything between 2024-09-23 and 2026-08-03 you must add `"compatibility_flags": ["nodejs_compat"]`. Pick a recent date and still list `nodejs_compat` explicitly — it is harmless and it documents intent.
- If a prerendered page genuinely needs Node APIs, the adapter provides **`prerenderEnvironment: 'node'`** as the escape hatch. Know it exists; treat reaching for it as a signal to remove the dependency instead.
- Run `astro build` in CI from Phase 1 so a workerd-incompatible dependency is caught the day it is added, not at cutover.

**Warning signs:**
Build errors naming `node:fs`, `node:path`, `node:child_process`. `astro dev` failing on a dependency that installs cleanly. Errors mentioning workerd, Miniflare, or "not supported in this environment" during build rather than request.

**Phase to address:** Phase 1 (Foundation), with CI `astro build` as the standing detector.

---

### Pitfall 7: `imageService` now defaults to `cloudflare-binding`, which is a paid product you have not enabled

**What goes wrong:**
Adapter v13 *"Changes the default image service from `compile` to `cloudflare-binding`."* If you use `<Image />` or `<Picture />` from `astro:assets` without configuring `imageService`, the build/runtime now expects Cloudflare Images to be enabled on the account. It is not, and it is a billable product. You get broken images, or a surprise line item, or both.

**Why it happens:**
It is a *default*, so nothing prompts you. And the failure is visual, so it looks like a CSS bug.

**How to avoid:**
This project does not need runtime image optimization **at all** — all 39 photos already exist as five pre-baked R2 variants (`original`/`large`/`medium`/`small` + a base64 LQIP `thumb`). That is a better `srcset` than any optimizer would produce. So:
- Set **`imageService: 'passthrough'`** explicitly in the adapter config, and write the reason in a comment.
- Render photos with a plain `<img>` + hand-built `srcset`/`sizes` over the existing variants, not `astro:assets`. This also fixes the legacy bug `CONCERNS.md` found (lightbox always fetching the 2000 px `original`) — with a real `srcset`, mobile picks `large` or `medium` automatically.
- If you later want optimization for non-photo assets, the object form `imageService: { build: 'compile', runtime: 'passthrough' }` is available.

**Warning signs:**
Broken/blank images after an adapter upgrade. Build errors referencing an `IMAGES` binding. Cloudflare Images appearing in billing.

**Phase to address:** Phase 1 (config), Phase 2 (Photos gallery — `srcset` implementation).

---

### Pitfall 8: Serving 39 photos × 5 variants from `pub-*.r2.dev` — a rate-limited, **uncached, development-only** endpoint

**What goes wrong:**
Every URL in `data/portfolio_images.json` points at `https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev`. Cloudflare's R2 docs are unambiguous: *"Public access through `r2.dev` subdomains is **rate-limited** and should only be used for **development purposes**,"* and WAF, **caching**, access controls and Bot Management *"are not available when using the `r2.dev` development url."*

Uncached means every gallery visitor pulls every image from origin. On a page with 39 images this is the dominant cost of your Lighthouse score, and no amount of `srcset` tuning compensates for a zero-cache origin. Worse, it is rate-limited — a Lighthouse run or a burst of traffic can get throttled, producing a *non-reproducible* bad score that looks like a flake.

`CONCERNS.md` analysed the gallery's DOM and manifest cost but not the delivery path, because from Next.js's perspective the URLs were just strings.

**How to avoid:**
- **Put the bucket behind a custom domain** (e.g. `cdn.akhilsaxena.com` or `images.akhilsaxena.com`) in Phase 5's DNS work — arguably earlier, since it changes every URL in the manifest. This unlocks Cloudflare's cache, and it is free.
- Because URLs change, plan a **one-time rewrite of `data/portfolio_images.json`** plus an update to `R2_PUBLIC_URL` in both the Workers config and the GitHub Actions secrets. Do this *before* Phase 2 builds against the old URLs, or you rewrite the gallery's assumptions twice.
- Set a long `Cache-Control` on R2 objects at upload time in the processing script — R2 custom domains honour object cache metadata.

**Warning signs:**
`r2.dev` anywhere in committed data or config. `cf-cache-status: DYNAMIC` (or absent) on image responses. Lighthouse "Serve static assets with an efficient cache policy" listing every photo. Wildly variable LCP between runs.

**Phase to address:** Phase 1 (provision the custom domain + rewrite manifest URLs — do it *early*, it is a data migration), verified Phase 4.

---

### Pitfall 9: Deterministic R2 keys + a cached custom domain = permanently stale photos

**What goes wrong:**
This is the sting in Pitfall 8's tail, and it is a genuinely non-obvious interaction.

`CONCERNS.md` correctly identifies deterministic R2 keys (`photos/{category}/{slug}{suffix}.webp`) as a *virtue* — they make reprocessing idempotent. But R2's consistency docs note that while R2 itself is strongly consistent, **when caching is enabled on a custom domain, overwritten objects continue serving the stale version until the cache TTL expires or is purged**, and 404s are cached by default too.

So the moment you fix Pitfall 8, re-uploading a corrected photo to the same key silently serves the old image to everyone, for as long as your (deliberately long) TTL. The admin sees success. The pipeline sees success. The site shows the old photo. This is a classic "works for the author, broken for everyone" bug because the author's browser may have a different cache state.

**How to avoid:**
- **Content-hash or version the R2 keys**: `photos/{category}/{slug}-{shorthash}.webp`. Costs nothing, eliminates the class. The manifest already stores full URLs, so nothing else needs to know.
- Or, if keys must stay stable, have the processing Action **purge the Cloudflare cache by URL** after upload (Cloudflare API, one call per changed object) — more moving parts and another credential.
- Note the 404-caching behaviour: if the site references an image before the pipeline finishes uploading it, the 404 gets cached. Ordering matters — **upload to R2 before committing the manifest**, never the reverse.

**Warning signs:**
"I re-uploaded it but it still shows the old one." Hard-refresh fixes it; normal load does not. `cf-cache-status: HIT` on an object whose R2 `uploaded` timestamp is newer than the cache age.

**Phase to address:** Phase 3 (Photo pipeline) — bake versioned keys in when implementing the R2 staging flow, since you are rewriting that code anyway.

---

### Pitfall 10: React context does not cross island boundaries — the admin must be one island, the theme must not be React at all

**What goes wrong:**
Every `client:*` directive creates a **separate React root** with a separate context tree. Two failures follow, and they fail differently:

- **Theme:** a `<ThemeProvider>` wrapped around the toggle island cannot be read by the lightbox island. Developers respond by wrapping each island individually, which yields *n* independent providers that disagree after a toggle, and reintroduces FOUC because provider state initialises after paint.
- **Admin:** if the admin is composed as several islands (`<ResumeEditor client:load />`, `<PreviewPanel client:load />`, `<DeployButton client:load />`), they cannot share editor state. The instinctive workaround — lift state into a module-level store — appears to work and then *silently defeats the `baseSha` fix* that `CONCERNS.md` mandates, because "which snapshot is this editor based on" becomes ambiguous across roots.

**Why it happens:**
It is the single biggest mental-model shift from Next.js, where one React root owns the page. Everything about writing React encourages assuming shared context.

**How to avoid:**
- **Theme: do not use React context.** Use the mechanism the DS already provides — a class on `<html>` (`:root` / `:root.dark`) plus CSS custom properties — set by a **blocking `<script is:inline>` in `<head>`** that reads `localStorage` then `prefers-color-scheme` before first paint. The React toggle island only writes `localStorage` and flips the class. Zero cross-island state, zero FOUC. If you adopt `<ClientRouter />`, **re-run the theme script on `astro:after-swap`** — the router replaces `document.documentElement` and the class is lost mid-navigation, reintroducing the flash on every page change.
- **Admin: one island.** A single `<AdminApp client:only="react" />` owning the whole editor. `client:only` is correct here specifically because the admin must never be prerendered (Pitfall 2) and has nothing meaningful to SSR.
- **Public pages: `client:load` only where interaction is immediate.** Prefer `client:visible` for the gallery/lightbox and `client:idle` for the toggle — hydration cost is a direct TBT tax against the 95+ goal.

**Warning signs:**
More than one `client:` directive inside `/admin`. A React `ThemeProvider` in the tree. Theme flash on first paint or on navigation. Toggling the theme updates one island and not another.

**Phase to address:** Phase 2 (theme script + island directive strategy), Phase 3 (admin as a single island).

---

### Pitfall 11: The mandatory CSS import order is enforced by nothing, and `client:only` changes when CSS is emitted

**What goes wrong:**
The DS requires `tokens.css` → `primitives.css` → `utilities.css`. Astro's documented rule is that among stylesheets of equal specificity, **"the *last one imported* wins"** — so a wrong order is not an error, it is a subtly wrong cascade: utilities silently lose to primitives, or the charcoal theme's overrides lose to base tokens. You debug it as a specificity problem in the theme and never suspect import order.

Layered on top: the charcoal theme introduces a **third scope axis** to a DS that has only ever had `:root` and `:root.dark` (`PROJECT.md` flags this). Brand-theme tokens fighting `:root.dark` on equal specificity is exactly the situation where import order decides the winner.

And `client:only="react"` components are never server-rendered, so Astro cannot collect their styles during SSR — CSS for a `client:only` island can arrive late or, in edge cases, be missed entirely. For the admin that means a flash of unstyled forms; for a public island it would be CLS.

**How to avoid:**
- Import all three DS stylesheets, **in order, in exactly one place** — the base `Layout.astro` — and never in a component. Astro's own docs advise importing the Layout *before* other imports so it holds lowest precedence; follow that.
- Wrap the app's own overrides in an explicit **`@layer`** so precedence is declared rather than inherited from import order. This is the durable fix; import order then stops being load-bearing.
- Add a **regression test on the cascade**, not just on tokens: assert computed `--color-*` values on `:root`, `:root.dark`, and the charcoal scope in a real browser. The DS already has `src/tokens.test.ts` proving contrast — that proves the *values*, not that they *win*. Extend it.
- Because the DS exposes `./css/*` per-component subpaths, per-component CSS splitting **is** available even though JS splitting is not (Pitfall 3). Using it is worthwhile — but only *after* the global three are loaded, and it does not help if the barrel already pulled the JS.
- For the admin's `client:only` island, import its CSS from the enclosing `.astro` page rather than the component, so Astro emits it as a page stylesheet.

**Warning signs:**
A theme override that only works with `!important`. Different cascade behaviour between `astro dev` and `astro build`. Unstyled admin form fields for a frame on load. Correct token values in DevTools' Computed panel but wrong rendering.

**Phase to address:** Phase 1 (Layout + `@layer` structure), design-system repo (charcoal theme scope + extended cascade tests), Phase 3 (admin `client:only` CSS).

---

### Pitfall 12: JWKS fetching inside a Worker — module-scope caching is not a cache, and `exp` is not the only clock

**What goes wrong:**
`requireAccess()` uses `jose`'s `createRemoteJWKSet`, cached in a module-level `Map`. In Workers this is **per-isolate**, and isolates are created and evicted freely with no guarantees. On a low-traffic personal admin, nearly every request may be a cold isolate → a **blocking subrequest** to `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` before auth resolves. That is added latency on every admin action, plus a hard dependency on an external fetch inside the request path.

Two sharper edges:
- **Workers forbid I/O in global scope.** You cannot warm the JWKS at module init; the fetch must happen inside the handler. Code that "optimises" by hoisting it will throw at runtime, not build time.
- **Key rotation:** Cloudflare *"rotates the signing key every 6 weeks,"* with *"previous keys remain[ing] valid for 7 days after rotation."* Over-aggressive caching (e.g. stuffing the JWKS in KV with a long TTL) produces an admin that hard-fails roughly every six weeks with an opaque signature error. Cloudflare's own guidance is to match the JWT's `kid` against the fetched certs rather than blindly trusting a cached set — which is precisely what `createRemoteJWKSet` does natively, so **let it**, and configure its `cacheMaxAge`/`cooldownDuration` rather than wrapping it in your own cache.

Additionally, `PROJECT.md`'s hard requirement that auth "fails closed" needs a specific decision here: **if the JWKS fetch fails (network blip, subrequest limit), you must return 401, not 500-and-retry-open.** Write that test.

**How to avoid:**
- Keep `createRemoteJWKSet` and its built-in caching; do not add a KV layer. Instantiate lazily inside the handler, memoised per team-domain in module scope (as a best-effort warm cache, never relied upon).
- Verify **`iss` *and* `aud` *and* `exp`** — verifying only `aud` is the common shortcut and it accepts tokens from a different Access team. `jose`'s `clockTolerance` should be small but non-zero (~30 s) for skew; do **not** set it to minutes.
- Read the token from the **`Cf-Access-Jwt-Assertion` header**, which Cloudflare states is the authoritative source for both browser and non-browser requests — *"the cookie is not guaranteed to be passed."* This also cleanly resolves the CSRF concern `CONCERNS.md` raised, because a header-based check cannot be forged by a cross-origin form post.
- **Non-browser calls:** the admin's own `fetch('/api/deploy')` from a page already behind Access carries the cookie and the header, so it works. But anything scripted (a CLI, a curl smoke test, a synthetic monitor) needs an Access **service token** (`CF-Access-Client-Id` / `CF-Access-Client-Secret`) with its own Access policy. Decide in Phase 3 whether you want one for testing — if not, your integration tests can only assert the *deny* path, which is still the important half.
- Note the earlier interaction: on Workers, **Access protects the hostname at the edge**, but with asset-first routing your in-code check may never run (Pitfall 2). Edge-gating and in-code verification are genuinely independent layers here; do not let one justify skipping the other.

**Warning signs:**
Admin actions with a consistent several-hundred-ms floor. Intermittent 401s clustering ~6 weeks apart. `Error: Invalid Compact JWS` or `JWKSNoMatchingKey`. Any `await fetch(...)` at module top level.

**Phase to address:** Phase 3 (Admin auth), with the deny-path tests `CONCERNS.md` already requires.

---

### Pitfall 13: Concurrent commits — the admin deploy and the photo Action racing on `main`

**What goes wrong:**
`CONCERNS.md` covers the *client* half (`baseSha: "latest"` must become a real SHA). The *server/pipeline* half is unaddressed and is a live scenario in the new design: the admin publishes via the Git Data API while `process-photos.yml` is mid-run and about to `git push` its own manifest update.

Two distinct failures:
1. **The admin loses.** `PATCH /git/refs/heads/main` with `force: false` returns 422 (correctly surfaced as 409). Fine — *if* the admin can recover. If the UI just shows "conflict" with no reload-and-merge path, the operator's unsaved edits are stranded and they will hit force-refresh, losing them. **A correct conflict detector with no recovery UX is a data-loss bug wearing a seatbelt.**
2. **The Action loses.** `git push` from the workflow is rejected non-fast-forward. Unless the workflow rebases and retries, the job fails *after* R2 uploads have already happened — reproducing exactly the orphaned-object failure `CONCERNS.md` documented, now triggered by a race rather than a crash.

**Secondary rate limits** compound it. GitHub allows **no more than 80 content-generating requests per minute and 500 per hour**, plus a **900 points/minute** budget where writes cost 5 points. A batch photo upload that commits per-image, plus admin deploys, plus Action pushes, can plausibly brush the per-minute ceiling — and secondary-limit responses are **403 with a `Retry-After`**, not 429, so naive error handling misclassifies them as auth failures.

**How to avoid:**
- **Serialise at the source:** give `process-photos.yml` a `concurrency: { group: main-commit, cancel-in-progress: false }` so pipeline runs queue rather than race each other.
- **Retry-with-refetch on the admin side:** on 409, re-fetch `/api/data`, show the operator a diff, and let them re-apply — never silently overwrite, never silently discard.
- **Rebase-and-retry in the Action:** `git pull --rebase` then push, with 2–3 attempts.
- **Batch commits.** The Git Data API path (`blobs → tree → commit → ref`) commits *n* files in one ref update. Use it in the Action too, instead of per-image Contents-API calls. Fewer commits, fewer rate-limit points, fewer race windows.
- **Handle 403 + `Retry-After` explicitly** as backoff, distinct from 401.
- **Fine-grained PAT:** repo-scoped, `contents:write` + `actions:write` only (as `CONCERNS.md` recommends) — but also note fine-grained PATs **expire**, max one year, and expiry produces a 401 that looks exactly like a revoked token. Put the expiry date in a calendar reminder and make the admin surface "GitHub auth failed" distinctly from "you are not signed in," or you will debug Cloudflare Access for an hour over an expired GitHub token.

**Warning signs:**
409s in normal use. Failed workflow runs with "non-fast-forward." 403s from GitHub containing `Retry-After`. R2 objects with no manifest entry.

**Phase to address:** Phase 3 (Admin publish path + photo pipeline) — these are two halves of one design and should be planned together.

---

### Pitfall 14: A push triggers a build that fails, and the admin reports success

**What goes wrong:**
The publish path is fire-and-forget: commit → (something) rebuilds → done. If the build fails — schema validation rejects the JSON, a DS upgrade breaks a type, Astro v7's **stricter Rust compiler** rejects markup that v6 tolerated — the admin has already shown "Deployed!" The operator believes the change is live. The site keeps serving the previous deployment, which is the *right* runtime behaviour and the *worst* feedback behaviour: nothing is broken, nothing is updated, and nobody knows.

**Why it happens:**
The commit is the only thing the admin can observe synchronously. Build status lives in a different system.

**How to avoid:**
- Change the admin's language: **"Changes committed — deploying…"**, not "Deployed."
- Poll `GET /repos/{repo}/actions/runs?head_sha={sha}` for the deploy workflow's conclusion and show real status. You are already implementing exactly this polling pattern for `/api/dispatch`; reuse it.
- Move deployment into GitHub Actions (Pitfall 1) and **gate `wrangler deploy` behind lint + typecheck + the zod schema validation** `CONCERNS.md` mandates. A failing gate then means "not deployed," which is honest and recoverable, rather than Pages' "auto-deployed regardless of CI."
- Validate `data/*.json` with zod **in `/api/deploy` before writing the blob** as well — a 400 before the commit is infinitely better than a red build after it.

**Warning signs:**
"I saved it but the site didn't change." Successful admin actions with no corresponding successful deploy run. Divergence between `main` HEAD and the deployed version.

**Phase to address:** Phase 3 (Admin publish feedback), Phase 1 (CI-gated deploy pipeline).

---

### Pitfall 15: Cutover — Workers custom domains have requirements the current setup does not meet, and the site is down while you find out

**What goes wrong:**
The site is already down (`main` purged), so cutover is on a clock and there is no fallback. Several requirements only bite at the last moment:

- **You cannot create a Workers Custom Domain on a hostname that already has a CNAME record.** If `akhilsaxena.com` or `www` currently CNAMEs to `akhilsaxena.pages.dev`, that record must be removed first. Doing this at cutover means a DNS-propagation gap on top of the existing outage.
- **Custom Domains require an active Cloudflare zone**, and Workers Custom Domains do not support external/partial-CNAME setups the way Pages did — the Pages→Workers migration guide calls out "custom domains outside Cloudflare-managed zones" as a **Pages** advantage. If `akhilsaxena.com`'s nameservers are not already Cloudflare's, that is a **registrar change with up-to-48h propagation** — a schedule risk, not a config task.
- **No wildcard matching:** apex and `www` are separate Custom Domains. Forgetting `www` is the classic omission.
- **Certificate provisioning is not instant.** Budget for it rather than discovering it live.
- `_redirects` and `_headers` still work on Workers but **must live in the static asset directory** (`public/` → `dist/`), and you need `.assetsignore` to keep build artefacts out of the asset upload.
- **`*.workers.dev` is "treated as a Free website"** and is not a production target — do not soft-launch there and call it done.

Plus the mundane one that always gets missed: the old `akhilsaxena.pages.dev` will be indexed and linked. Without 301s to the apex you split link equity and leave a stale copy live — which for a *portfolio* means a recruiter can land on the old site.

**How to avoid:**
Run cutover as its own phase with a written pre-flight, verified **before** the day:
1. `akhilsaxena.com` is on Cloudflare nameservers, zone active. *(Do this first — it is the long pole.)*
2. No conflicting CNAME on apex or `www`.
3. Workers Custom Domains for **both** apex and `www`; cert issued and verified.
4. `www` → apex 301 (or vice versa) — pick one canonical host and be consistent with `<link rel="canonical">`.
5. `akhilsaxena.pages.dev` 301s to the apex; delete or disable the old Pages project *after* redirects are confirmed.
6. R2 custom domain live and the manifest already rewritten (Pitfall 8) — **not** left for cutover day.
7. Cloudflare Access application's hostname updated to the new domain, and `CF_ACCESS_AUD` re-checked (**the AUD tag changes if the Access app is recreated rather than edited** — this locks you out of your own admin and is a very easy mistake).
8. Secrets migrated from the Pages dashboard to Workers (`wrangler secret put`) — a different store, so nothing carries over automatically.
9. Deploy to a preview/staging Workers URL and run Lighthouse there **before** flipping DNS.

**Warning signs:**
Discovering nameserver ownership on cutover day. `Cf-Access-Jwt-Assertion` present but `aud` mismatched. 526/525 TLS errors. Lighthouse first run happening on production.

**Phase to address:** Phase 5 (Cutover) — but items 1, 6 and 8 must start in Phase 1 because of lead time.

---

### Pitfall 16: Astro v7's Rust compiler rejects the handoff HTML, and `compressHTML: 'jsx'` eats your whitespace

**What goes wrong:**
Two Astro v7 changes that specifically target the "port four HTML prototypes into components" work this project starts with:

- The **Rust compiler replaced the Go compiler** and enforces stricter HTML validation: *"Unclosed tags now produce errors"* and *"semantically invalid HTML is no longer auto-corrected."* Hand-written prototype HTML is exactly the kind of markup that has an unclosed `<div>`, a `<div>` inside a `<p>`, or an invalid nesting that every browser silently repairs. Under v7 these are **build errors**, discovered one at a time.
- **`compressHTML` default changed from `true` to `'jsx'`**: whitespace between adjacent inline elements now collapses per JSX rules, so `<span>hello</span> <em>world</em>` can render as `helloworld`. This produces *visual* bugs in exactly the typographic, serif-heavy identity work that is the point of the design — and it will be misdiagnosed as a CSS problem for hours.

Also relevant if case-study pages use markdown: v7 **replaced remark/rehype with Sätteri** as the default Markdown processor. Any remark/rehype plugin (including most syntax-highlighting and directive plugins) needs porting or an explicit reinstall of `@astrojs/markdown-remark`.

**Why it happens:**
These are toolchain-version changes, invisible unless you read the v7 upgrade guide. Everyone's Astro mental model is at v4/v5.

**How to avoid:**
- Run the prototype HTML through a validator **before** porting, and fix nesting there rather than debugging it through Astro's compiler.
- Decide `compressHTML` explicitly in `astro.config.mjs` (`true` restores HTML whitespace rules) and note the choice — do not inherit the default silently.
- If case studies use markdown, decide Sätteri vs. reinstalling the remark pipeline in Phase 1, before content is written against one of them.

**Warning signs:**
Build errors about unclosed tags when the markup "looks fine." Words running together in rendered output but not in source. Markdown plugins that no longer apply.

**Phase to address:** Phase 0/1 (design port + foundation), Phase 2 (case-study pages).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| `file:` link the DS instead of `npm pack` + tarball install | One-step cross-repo iteration | Duplicate React → intermittent "Invalid hook call"; integration-time surprises because linked ≠ published | Only with `vite.resolve.dedupe` configured **and** a pre-merge gate that builds against the packed tarball |
| `import { X } from '@akhil-saxena/design-system'` (barrel) everywhere | Ergonomic, matches DS docs | Risks TipTap/ProseMirror in public bundles; no per-component JS subpaths exist to escape to | Acceptable in `/admin` (weight is irrelevant there); **never** on a public page until Pitfall 3's measurement passes |
| `output: 'server'` globally "so the API routes just work" | No per-page `prerender` boilerplate | Every public page becomes SSR — destroys the Lighthouse goal and the static-site rationale for dropping analytics | Never. Keep `output: 'static'` + `export const prerender = false` per endpoint |
| Skip `run_worker_first`, rely on Cloudflare Access at the edge | One less config line | Silent fail-open if a route is ever prerendered; recreates `CONCERNS.md`'s auth finding in a new form | Never |
| Keep `r2.dev` URLs "for now" | Zero migration work | Uncached + rate-limited image delivery; blocks Lighthouse 95+; and migrating later means rewriting all 39 manifest entries anyway | Only for local dev fixtures |
| Long cache TTL on stable R2 keys without content hashing | Great cache hit rate | Re-uploaded photos never appear; needs manual purge forever | Only with an automated purge step in the Action |
| Compose the admin from several islands | Feels like normal React | Cross-root state fragmentation; undermines the `baseSha` correctness fix | Never — one `client:only` root |
| Ship the charcoal theme by overriding tokens in app CSS instead of upstreaming | Unblocks the portfolio immediately | Violates the project's Core Value; DS never gains brand-theming; override fights `:root.dark` on specificity | As a time-boxed spike only, with the upstream PR already open |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Cloudflare bindings | Using `Astro.locals.runtime.env` (removed in adapter v13) or `process.env` | `import { env } from 'cloudflare:workers'`; `Astro.request.cf`; `Astro.locals.cfContext` for `waitUntil` |
| Cloudflare Access | Reading the `CF_Authorization` cookie | Read `Cf-Access-Jwt-Assertion`; Cloudflare states the cookie *"is not guaranteed to be passed"* |
| Cloudflare Access | Verifying only `aud` | Verify `iss` **and** `aud` **and** `exp`, with small `clockTolerance` |
| Cloudflare Access | Recreating the Access app during domain migration | Edit the existing app — recreating issues a **new AUD tag**, invalidating `CF_ACCESS_AUD` |
| GitHub API | Treating 403 as an auth failure | Secondary rate limits return **403 with `Retry-After`** — back off, do not re-auth |
| GitHub API | Contents API for multi-file publishes | Git Data API (blobs → tree → commit → ref) — atomic, fewer rate-limit points. Note Contents API **GET** fully supports only ≤1 MB; 1–100 MB needs raw/object media types; >100 MB unsupported |
| GitHub PAT | Assuming it persists | Fine-grained PATs expire (max 1 year); surface "GitHub auth failed" distinctly from "not signed in" |
| R2 | Presigning from a Worker with the AWS SDK v3 | AWS SDK v3 is heavy for a Worker bundle (Pitfall: 3 MiB free / 10 MiB paid compressed limit). Use `aws4fetch`, or skip presigning: proxy the upload through the Worker via the `PORTFOLIO_BUCKET` binding. Presigned URL max expiry is **7 days** |
| R2 | Forgetting CORS for direct browser PUT | Configure bucket CORS for the site origin. Pin `Content-Type` in the signature — a mismatch yields 403 |
| R2 | Assuming eventual consistency | R2 is **strongly consistent** for read-after-write, list and delete. The staleness risk is **CDN caching**, not R2 |
| R2 `temp/` | Application-level cleanup only | Add a **lifecycle rule** expiring `temp/` after 24h — the only cleanup that survives a crashed job |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| DS barrel drags TipTap/ProseMirror into a public island | Public chunk >100 KB gzip; high TBT | Measure in Phase 1; per-component JS subpaths upstream; CI JS budget | Immediately — on the first DS component used in a public island |
| 73 `@font-face` / 4 DS families + Playfair | Multiple font requests; CLS on hero; ~30 KB of `@font-face` CSS | Split fonts out of `tokens.css` upstream; override family tokens; preload only LCP faces | Immediately |
| 204 KB of unsplit DS CSS render-blocking | Poor FCP; "Reduce unused CSS" | Use `./css/*` per-component subpaths after the global three; consider `build.inlineStylesheets: 'auto'` (default, 4 KB threshold) | Immediately |
| `r2.dev` uncached + rate-limited image origin | Variable LCP; no `cf-cache-status: HIT`; throttling under load | R2 custom domain + long `Cache-Control` | Immediately at 39 images; catastrophic above ~100 |
| 39 images all eager / no `srcset` | Huge LCP; bandwidth waste on mobile | `loading="lazy"` beyond the fold; `fetchpriority="high"` on LCP only; real `srcset` from the 5 pre-baked variants; `width`/`height` from `dimensions` to kill CLS | Immediately |
| `client:load` on every island | TBT tax; poor INP | `client:visible` (gallery/lightbox), `client:idle` (toggle), `client:only` (admin only) | Above ~2–3 eager islands |
| Worker bundle approaching the size limit | Deploy fails, error code 10027 | **3 MiB free / 10 MiB paid, compressed.** Keep the admin's DS weight in client chunks, not the Worker; avoid AWS SDK v3 server-side. Check with `wrangler deploy --outdir bundled/ --dry-run` | When the admin's server bundle pulls in DS SSR code |
| Worker startup time | Cold-start latency; deploy rejection | **1 s startup budget** for global-scope execution; keep module top-level work minimal (and no I/O there at all) | Large server bundles |
| 57 KB manifest with inline base64 LQIP imported by every page | Larger HTML/JS payload on all pages | Already flagged in `CONCERNS.md`; additionally, in Astro import it only in the pages that need it — Astro will not tree-shake a JSON import per-page | ~150+ photos |

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Endpoint prerendered → Worker never runs → auth skipped | **Unauthenticated write endpoint in production.** Highest-severity item here | `export const prerender = false` on every endpoint + `run_worker_first` array + build assertion that `dist/api/` does not exist |
| Failing open when the JWKS fetch fails | Auth bypass during a transient network fault | Explicit 401 on any verification failure including fetch errors; test it |
| Verifying `aud` without `iss` | Accepts tokens minted by a different Access team | Verify both; assert in a test |
| Assuming edge Access gating removes the need for in-code checks | With asset-first routing these are independent layers | Keep both; `run_worker_first` makes the in-code layer actually reachable |
| Public bucket exposing the `private/` clean (unwatermarked) originals | Watermarking defeated | The public R2 custom domain must not serve `private/`. Verify by direct URL request — the key layout alone is not access control |
| SVG in the DS icon/asset path rendered inline | Stored XSS (`CONCERNS.md` flagged for uploads; same applies to any inlined SVG) | Raster-only for uploads; sanitize any SVG that is inlined rather than `<img>`-referenced |
| Committing `wrangler.jsonc` with real binding IDs / account ID | Low, but avoidable disclosure | Bindings by name; account ID via CI secret |
| Fine-grained PAT over-scoped or account-wide | A compromised admin can write to every repo | Single-repo, `contents:write` + `actions:write` only (per `CONCERNS.md`), calendar the expiry |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| "Deployed!" shown at commit time | Operator believes a change is live when the build failed | "Committed — deploying…" + poll the workflow run for real status |
| 409 conflict with no recovery path | Operator's edits stranded; they force-refresh and lose work | Re-fetch, show a diff, let them re-apply — the necessary companion to the `baseSha` fix |
| Theme flash on load or on navigation | Dark-by-default site flashes light; feels broken | Blocking inline `<script>` in `<head>`; re-run on `astro:after-swap` if using `ClientRouter` |
| Photo upload with no progress or failure surface | Silent partial batches (the failure mode `CONCERNS.md` documented) | Per-photo status; surface Action run status; make orphans visible |
| Lightbox EXIF empty state | One of 39 photos has no camera EXIF (`PROJECT.md`) — renders as blank labels | Omit missing fields entirely rather than showing empty rows |
| `prefers-reduced-motion` honoured in app CSS but not in DS components | Requirement silently unmet | Verify DS components respect it; if not, that is a DS finding |

## "Looks Done But Isn't" Checklist

- [ ] **Every API endpoint:** has `export const prerender = false` — verify `dist/api/` does not exist after build
- [ ] **Auth:** returns 401 without `Cf-Access-Jwt-Assertion`, tested against `astro preview` (real workerd), not just unit-tested
- [ ] **Auth:** `run_worker_first` covers `/admin` and `/api/*` in `wrangler.jsonc`
- [ ] **Bindings:** use `import { env } from 'cloudflare:workers'`, not `locals.runtime.env` (removed) or `process.env`
- [ ] **Images:** `imageService` set explicitly to `'passthrough'`; no accidental Cloudflare Images dependency
- [ ] **Images:** no `r2.dev` URL anywhere in `data/`, config, or Actions secrets
- [ ] **Images:** every `<img>` has `width`/`height` (from the manifest's `dimensions`) — CLS is the easiest Lighthouse point to lose
- [ ] **Fonts:** DevTools Network shows only the fonts actually rendered — not 4 DS families
- [ ] **Bundle:** no `prosemirror`/`tiptap`/`lowlight` in any public-page chunk
- [ ] **Bundle:** a CI budget exists and fails the build on regression
- [ ] **React:** exactly one copy — `vite.resolve.dedupe` set; verified in a bundle visualizer
- [ ] **DS consumption:** the published npm package builds, not the `file:` link — gated before ship
- [ ] **CSS:** tokens → primitives → utilities imported once, in order, in the Layout; overrides in an `@layer`
- [ ] **Theme:** no flash on first paint **and** none after navigation
- [ ] **Admin:** a single React root; no cross-island state
- [ ] **Publish:** real `baseSha`; 409 has a recovery path, not just an error toast
- [ ] **Publish:** zod validation runs in `/api/deploy` **before** the blob write, and again as a CI gate before deploy
- [ ] **Pipeline:** `concurrency` group on the workflow; rebase-and-retry on push
- [ ] **R2:** `temp/` lifecycle rule exists in the bucket (not just cleanup code)
- [ ] **R2:** `private/` unwatermarked originals are not reachable via the public domain — tested by direct URL
- [ ] **Cutover:** apex **and** `www` both configured; `pages.dev` 301s; Access AUD re-verified; secrets migrated to Workers
- [ ] **Lighthouse:** 95+ measured on the deployed Workers URL with a cold cache, not on `astro preview`

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Planned for Pages, adapter needs Workers | **LOW if caught in Phase 1; HIGH at Phase 3/5** | Rewrite `wrangler.jsonc`, move secrets, add an Actions deploy job. The cost is entirely a function of when it is found |
| Prerendered endpoint bypassing auth | LOW to fix, **HIGH if exploited** | Add `prerender = false` + `run_worker_first`, redeploy, rotate `GITHUB_PAT` (assume compromise), audit commit history |
| TipTap in public bundles | MEDIUM | Add per-component JS subpaths to the DS, republish, re-point imports. Cross-repo, so it has release latency — hence measure early |
| Duplicate React | LOW | Add `dedupe` + `overrides`; switch `file:` → packed tarball; clear `node_modules/.vite` |
| `r2.dev` shipped to production | MEDIUM | Provision the R2 custom domain, rewrite all 39 manifest entries, update `R2_PUBLIC_URL` in two places, redeploy |
| Stale cached photos on deterministic keys | LOW–MEDIUM | Purge by URL; then migrate to content-hashed keys so it cannot recur |
| Access AUD changed at cutover | MEDIUM — **you are locked out of your own admin** | Read the new AUD from the Access dashboard, `wrangler secret put CF_ACCESS_AUD`, redeploy. Keep dashboard access as the out-of-band path |
| Concurrent-commit data loss | **HIGH** | `git reflog` / commit history on `main` to recover the clobbered manifest; R2 objects survive, so re-derive entries from bucket contents |
| Expired GitHub PAT | LOW | Regenerate, `wrangler secret put`. Prevented by a calendar reminder |
| DNS/nameserver not ready at cutover | **HIGH — extends the outage by up to 48h** | Cannot be accelerated. Must be front-loaded to Phase 1 |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| 1. Pages vs Workers target | Phase 1 (decision) | `PROJECT.md` updated; `wrangler.jsonc` with `assets.directory`; Actions deploy job green |
| 2. Prerendered endpoint bypasses Worker | Phase 1, re-check Phase 3 & 5 | Build asserts no `dist/api/`; live 401 test without Access header |
| 3. DS barrel / TipTap in public bundles | Phase 1 (measure) + DS repo (fix) | Bundle visualizer shows no `prosemirror`; CI JS budget passes |
| 4. Font count from `tokens.css` | Phase 1 (audit) + DS repo (split) | ≤3 font files in Network panel; no font-related CLS |
| 5. Duplicate React | Phase 1 | `dedupe` present; clean cold-start `astro dev`; single React in visualizer |
| 6. workerd at build/dev time | Phase 1 | `astro build` green in CI from the first commit |
| 7. `imageService` default | Phase 1 | `imageService: 'passthrough'` explicit; images render; no Images billing |
| 8. `r2.dev` delivery | Phase 1 (early — data migration) | Zero `r2.dev` in repo; `cf-cache-status: HIT` on photos |
| 9. Stale cached photos | Phase 3 | Re-upload a photo; new bytes served without manual purge |
| 10. Island boundaries / theme / admin state | Phase 2 (theme), Phase 3 (admin) | One `client:` directive in `/admin`; no flash on load or nav |
| 11. CSS order & cascade | Phase 1 + DS repo | Three imports in Layout only; cascade test on all three scopes |
| 12. Access JWT / JWKS in a Worker | Phase 3 | Tests: no header → 401; wrong `aud` → 401; wrong `iss` → 401; JWKS fetch failure → 401 |
| 13. Concurrent commits & rate limits | Phase 3 | Forced-conflict test yields 409 + working recovery; workflow `concurrency` set |
| 14. Failed build reported as success | Phase 1 (CI gate) + Phase 3 (status polling) | Admin shows a failed deploy as failed |
| 15. Domain cutover | Phase 5 (start items 1/6/8 in Phase 1) | Pre-flight checklist fully green **before** DNS flip |
| 16. Astro v7 compiler & `compressHTML` | Phase 0/1, Phase 2 | Prototypes validate; `compressHTML` set explicitly; typographic spot-check |

## Sources

**Verified directly (HIGH confidence):**
- `@astrojs/cloudflare` CHANGELOG (raw, github.com/withastro/astro) — v13.0.0 Pages drop, `Astro.locals.runtime` removal, `imageService` default change, workerd dev/prerender, entrypoint change; v14.x ClientRouter hook-call fixes
- `npm view` — astro@7.2.2, @astrojs/cloudflare@14.2.1, @astrojs/react@6.0.2, @akhil-saxena/design-system@1.11.4
- **`npm pack @akhil-saxena/design-system@1.11.4`** — measured CSS sizes (primitives 181 KB, tokens 16 KB, utilities 5.9 KB, 74 per-component files), `dist/index.js` 334 KB/71 KB gzip, exports map, `sideEffects`, top-level TipTap/dnd-kit/lowlight/lucide imports, 15 `@fontsource` `@import` lines
- `@fontsource/*` packages installed and measured — 73 `@font-face` rules, per-weight woff2 sizes
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) — 3 MiB free / 10 MiB paid compressed, 1 s startup, 25 MiB per asset
- [Workers static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) — asset-first default, `run_worker_first` incl. array form
- [Pages → Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) — routing inversion, custom-domain differences, `_redirects`/`_headers`, `.assetsignore`
- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) — no existing CNAME, no wildcards, active zone required
- [Astro endpoints](https://docs.astro.build/en/guides/endpoints/) — static-mode endpoints prerender by default
- [Astro config reference](https://docs.astro.build/en/reference/configuration-reference/) — `output` values, `build.inlineStylesheets` default `'auto'`
- [Astro styling](https://docs.astro.build/en/guides/styling/) — cascade order, "last one imported wins", `vite.ssr.noExternal`
- [Astro v7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/) — Rust compiler strictness, `compressHTML: 'jsx'`, Sätteri markdown, Vite 8
- [Astro Cloudflare deploy guide](https://docs.astro.build/en/guides/deploy/cloudflare/) — Workers-only, wrangler config, `nodejs_compat` + `global_fetch_strictly_public`
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/) — JWKS endpoint, 6-week rotation / 7-day grace, header vs cookie, `kid` matching
- [Node.js compat in Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) — default-on from compat date 2026-08-04; `nodejs_compat` required 2024-09-23→2026-08-03
- [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) — 5,000/hr; 80/min and 500/hr content-generating; 900 points/min; 100 concurrent
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) — 1 MB / 1–100 MB / >100 MB tiers
- [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) — `r2.dev` rate-limited, dev-only, no caching
- [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/) — strong consistency; CDN staleness caveat
- [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) — 7-day max, CORS + `Content-Type` signing

**Community / corroborating (MEDIUM–LOW confidence, flagged inline):**
- [withastro/astro#16529](https://github.com/withastro/astro/issues/16529) — Astro 6 + adapter 13 React "Invalid hook call", intermittent, closed unreproduced
- [Web Performance Calendar: the curious performance case of CSS @import](https://calendar.perfplanet.com/2024/the-curious-performance-case-of-css-import/) and [DebugBear on @import](https://www.debugbear.com/blog/avoid-css-import) — used to *rule out* the remote-`@import` waterfall for this codebase
- [Astro Tips: dark mode](https://astro-tips.dev/recipes/dark-mode/) and [What the FOUC? Astro transitions](https://www.simonporter.co.uk/posts/what-the-fouc-astro-transitions-and-tailwind/) — `astro:after-swap` theme re-application
- [Solving the problem with npm link and React hooks](https://medium.com/bbc-product-technology/solving-the-problem-with-npm-link-and-react-hooks-266c832dd019) — duplicate-React root cause

---
*Pitfalls research for: Astro + React islands on Cloudflare Workers with a git-backed CMS and a self-published design system*
*Researched: 2026-08-16*
