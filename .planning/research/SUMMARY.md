# Project Research Summary

**Project:** akhilsaxena.com — Portfolio Rebuild
**Domain:** Static-first personal portfolio + photography site with a git-backed admin CMS, built on Astro islands over a cross-repo React design system, deployed to Cloudflare
**Researched:** 2026-08-16
**Confidence:** HIGH overall — stack/platform facts verified against npm registry, official Astro/Cloudflare docs, and direct reads of `../design-system`'s published source and this repo's data files. MEDIUM on cross-repo workflow recommendations and JS-budget predictions pending in-project measurement.

---

## Corrections to PROJECT.md (read this first)

All four researchers independently found that several premises written into `PROJECT.md` are **factually wrong against the current toolchain** (verified 2026-08-16). The roadmap must be built against the corrected facts below, not the document as currently written. `PROJECT.md`'s "Platform" and "Cross-repo dependency" constraints need editing before or during roadmap creation.

1. **Astro is at 7.2.2, not 5.** `@astrojs/cloudflare@14.2.1` pins `peerDependencies: { astro: "^7.2.0" }` and will hard-fail with `MISSING_EXPORT` on anything earlier. Astro 7 requires **Node >= 22.12.0** and ships Vite 8.
2. **`@astrojs/cloudflare` dropped Cloudflare Pages support in v13.** There is no flag to restore it. The target is **Cloudflare Workers with Static Assets**, deployed via **Workers Builds** (the Pages git-integration equivalent). `PROJECT.md` says "Cloudflare Pages" twice — both must change to Workers.
3. **`Astro.locals.runtime.env` is removed.** Bindings come from `import { env } from "cloudflare:workers"`. `Astro.request.cf` replaces `.cf`; `Astro.locals.cfContext` replaces `ExecutionContext`.
4. **Bindings DO work in local dev.** `astro dev` now runs inside real `workerd` (via `@cloudflare/vite-plugin`), with Miniflare simulating R2 locally. `PROJECT.md`'s constraint "bindings are absent in local dev — access must be guarded" is a stale `next dev`-era assumption and is now **actively harmful**: keeping a "binding might be undefined" guard around a real, always-present local binding just means a genuinely broken binding fails silently instead of throwing. Delete the guard-because-absent reasoning; keep guards only for genuine misconfiguration.
5. **`file:../design-system` is a symlink, not a copy** — same duplicate-React hazard as `npm link` (two copies of React, intermittent "Invalid hook call" that can vanish on refresh). The correct default workflow is **`npm pack` → install the tarball** (`file:./local-packages/*.tgz`), which npm copies rather than symlinks. Reserve raw symlinking for a guarded, actively-debugging tight loop only (`vite.resolve.dedupe` + `optimizeDeps.exclude`).
6. **The DS bundle is a single 334 KB (71 KB gz) JS barrel with no per-component JS exports.** The `exports` map only splits CSS (`./tokens.css`, `./css/*`), not JS — there is no `./components/Chip`-style subpath to import around TipTap/ProseMirror/dnd-kit. And DS CSS (`tokens.css` + `primitives.css` + `utilities.css`) is **~204 KB raw, not the ~165 KB PROJECT.md implies** (`primitives.css` alone is ~181 KB).
7. **EXIF gaps affect 11 of 39 photos at the field level, not "one photo lacks camera EXIF."** `lens` is null on 11 photos; `product-peppers` has zero EXIF fields; `architecture-redbuilding` has camera only. The lightbox needs field-level graceful omission, not a single whole-block empty state.
8. **All 39 photos' URLs point at `pub-*.r2.dev`**, which Cloudflare's own docs say is **rate-limited, uncached, and "for development purposes" only** (no WAF, no caching, no Bot Management). This directly blocks the Lighthouse 95+ goal (every image request goes to uncached origin) and produces non-reproducible Lighthouse scores under rate-limiting. Fix requires provisioning an R2 custom domain **and a one-time rewrite of all 39 manifest URLs** — a data migration, not a config tweak, and it should happen early (Phase 1) so Phase 2+ don't build against soon-to-change URLs.

### The two highest-severity NEW risks (beyond the legacy CONCERNS.md findings)

- **A second, differently-shaped fail-open auth path.** Astro prerenders everything under `src/pages/api/*` **by default** unless `export const prerender = false` is set on every single endpoint. Separately, Cloudflare Workers Static Assets serve a matching static file **before** the Worker ever runs, unless the path is listed in `run_worker_first`. Compose the two: forget `prerender = false` on one endpoint, and the build silently emits a static JSON snapshot of that route's build-time output at that path — `requireAccess()` never executes, and the response *looks correct* (a smoke test would pass). This is distinct from, and additional to, the legacy cookie-presence fallback CONCERNS.md already found. Defense: `run_worker_first: ["/admin*", "/api/*", "/_actions/*"]` in `wrangler.jsonc` (all three prefixes — Astro Actions POST to `/_actions/<name>`, easy to forget), a CI assertion that `dist/api/` and `dist/admin/` don't exist after build, and a live integration test asserting 401 with no Access header, run against `astro preview` (real workerd).
- **The `tokens.css` font landmine.** The DS's `tokens.css` bundles 14 `@fontsource` imports for Inter/Archivo/JetBrains Mono/Newsreader (73 `@font-face` rules) — **none of which are Playfair Display / DM Sans / IBM Plex**, the portfolio's actual identity. If the charcoal theme only redefines `--font-serif: "Playfair Display", …` without also shipping the `@font-face` declarations for it, text silently falls back to Georgia — the site looks almost-right and is wrong. This must be handled explicitly wherever the theme is built (see Roadmap Implications).

### The one major de-risking finding — the DS-vs-Lighthouse tension is FALSE

`PROJECT.md` implicitly frames "use the design system everywhere" and "Lighthouse 95+" as being in tension, because the DS is a React library and React islands cost ~45–50 KB gz + hydration TBT. **This is not actually a conflict.** Reading the DS source shows every primitive the public pages need (`Heading`, `Text`, `Link`, `Card`, `Button`, `Chip`, `IconButton`, `Timeline`, `StatCard`, `AppBar`, `Footer` — 14 of 15 audited components) is a pure `forwardRef` component with **zero hook usage**. Astro renders React components to static HTML with **zero client JavaScript** when no `client:*` directive is present — this is documented, standard behavior, not a workaround. So: SSR every DS component with no directive, and attach behavior (theme toggle, category filters) with tiny delegated inline `<script>` tags targeting `data-*` hooks — same markup, same CSS, same tokens, ~1% of the bytes of hydrating. The measured result: **4 of 5 public routes ship zero framework JS**; only `/photos` hydrates one island (the `Lightbox`, which genuinely needs portal/focus-trap/scroll-lock behavior), on `client:idle`. Lighthouse 95+ is not merely achievable, it's close to unavoidable with this approach — and it's the *only* option that fully dogfoods the DS without shipping a React runtime to every page.

---

## Key Findings

### Recommended Stack

Target **Astro 7.2.2 + `@astrojs/cloudflare` 14.2.1 + `@astrojs/react` 6.0.2 + React 19.2.8**, deployed to **Cloudflare Workers with Static Assets** via Workers Builds. Use `output: 'static'` (the default — do not use `'server'` or the nonexistent `'hybrid'`) with `export const prerender = false` only on `/admin` and API/action endpoints. Config lives in `wrangler.jsonc` (not `.toml`), with `"main": "@astrojs/cloudflare/entrypoints/server"`, `run_worker_first` covering `/admin*`, `/api/*`, `/_actions/*`, and an R2 binding for `PORTFOLIO_BUCKET`.

**Core technologies:**
- `astro@^7.2.2` — framework, routing, per-route static/on-demand split, Content Collections + Zod validation of `data/*.json` at build time
- `@astrojs/cloudflare@^14.2.1` — Workers adapter; required for any on-demand route; pins `wrangler ^4.83.0`
- `@astrojs/react@^6.0.2` — React 19 island renderer, no shim needed
- `@akhil-saxena/design-system@^1.11.4` (+ charcoal theme release) — all UI; ESM-only, workerd-safe
- `jose@^6.2.9` — Access JWT verification (Web Crypto build, no Node built-ins, Cloudflare's own docs use this exact library/pattern)
- `ultrahtml/transformers/sanitize` (bundled with Astro) — allowlist HTML sanitizer for résumé bullets; zero runtime deps, workerd-safe (reject `isomorphic-dompurify`/`sanitize-html`, both pull Node-only machinery)
- Plain hand-written `<img srcset>` over the 5 existing R2 variants — **no Astro image service, no Cloudflare Images**; set `imageService: 'passthrough'` explicitly (the adapter's new default, `'cloudflare-binding'`, silently expects a paid Cloudflare Images product to be enabled)
- Vitest 4 + `@cloudflare/vitest-pool-workers` (runs tests inside real workerd — the only way to actually test that auth fails closed) + Playwright + Testing Library
- Biome (TS/CSS/JSON) + `astro check` (the real `.astro` type-checker) + Prettier scoped to `.astro` files only (Biome's Astro support is experimental)

Full technology table, version-compatibility matrix, and "what not to use" list: `.planning/research/STACK.md`.

### Expected Features

Feature scope is **already decided** in PROJECT.md — nothing new is proposed. Research instead measured the real content/data and identified specific execution details and scope reductions.

**Must have (table stakes):**
- Gallery: `aspect-ratio` from existing `dimensions` data (kills CLS), LQIP from existing `urls.thumb` base64, real `srcset`/`sizes` over the 4 real variants, `break-inside: avoid`, eager+`fetchpriority=high` on the first tile only
- Category filtering as **prerendered `/photos/[category]` routes** with real `<a>` pills (not client-side query-param filtering) — zero JS, crawlable, free Back-button support, and makes `site_config.categoryColumns` (per-category column counts) meaningful
- Lightbox: backdrop-click close, `aria-live` slide announcement, swipe on touch, neighbour preload, responsive `srcset` in the lightbox itself — **four of these five are gaps in the DS `Lightbox` component today** and should be raised as design-system findings, batched into the charcoal-theme release, not patched locally in the portfolio
- EXIF: field-level null omission (11/39 photos affected), camera/lens string normalization (only 5 distinct cameras, 4 distinct lenses — a tiny static lookup table)
- Résumé: allowlist-sanitized bullets (both at write time and render time), print stylesheet, `Person` JSON-LD, labelled PDF download link
- SEO: canonical URLs, full OG + Twitter card set, **301 `akhilsaxena.pages.dev` → apex** (production `.pages.dev` has NO auto-noindex, unlike preview deployments — the old domain is already indexed), **301 `/portfolio` → `/photos`** (legacy path rename)
- Admin: fail-closed auth, real per-file blob-SHA optimistic concurrency with 409 surfaced as a recoverable "reload" UX (not a dead-end error), schema validation at three points (form, write, build), unsaved-changes guard

**Should have (differentiators, not mandatory for launch):**
- Post-publish build-status polling (poll GitHub Actions/deploy run status) — the single biggest gap across git-backed CMS prior art (Decap, Sveltia, Pages CMS all leave "did it deploy?" unanswered)
- One-click "revert last publish" using the pre-publish SHA already in hand
- Prerendered per-photo pages (`/photos/<id>`) with per-photo OG cards
- Admin commit diff preview

**Defer / scope reductions found by research:**
- **No gallery pagination or infinite scroll.** Measured: all 39 photos at `small` variant total **0.9 MB**. The handoff's "SHOWING 8 OF 39" language implies paging that is unnecessary complexity with negative payoff — render all 39, use native `loading="lazy"`.
- **LQIP and `dimensions` already exist** in `portfolio_images.json` for all 39 photos — this is pure wiring, not new pipeline work.
- No photo search, no date display/sort (dates in the data are ingest dates from a 10-day window, not capture dates — showing them would misrepresent the body of work), no GPS/location EXIF (not in the data, and a privacy risk to add), no three-state theme toggle, no editorial/branch workflow in admin (one editor, no reviewer — pure overhead).

Full feature landscape, dependency graph, MVP definition, and anti-features: `.planning/research/FEATURES.md`.

### Architecture Approach

Astro renders public pages as prerendered static HTML on Cloudflare's CDN with **zero server runtime**; a Cloudflare Access-gated Worker handles only `/admin`, `/api/*`, and Astro Actions (`/_actions/*`) on demand. Content lives as committed JSON in `data/*.json` (git-as-database); the admin publishes by committing directly via the GitHub Git Data API (blob → tree → commit → ref), never the Contents API for multi-file writes. One shared Zod schema module (`src/schemas/`) is consumed at three enforcement points — Astro Content Collections at build time, Astro Actions at write time, and the admin form's error rendering — so validation cannot drift between "checked in the UI" and "checked before it hits `main`."

**Major components:**
1. **Static public pages** (`.astro` + SSR'd DS React primitives, no client directive) — Home, Work, Résumé, case studies; zero framework JS
2. **Photo gallery + Lightbox** — `.astro`-composed `<img srcset>` grid (not an Astro image service) plus one genuine React island (`client:idle`) for the DS `Lightbox`
3. **`src/middleware.ts` / per-route `requireAccess()`** — fail-closed Access JWT verification via `jose` + `createRemoteJWKSet`, guarding `/admin*`, `/api/*`, `/_actions/*` — note: middleware itself runs at *build time* for prerendered pages, so gate it on `context.isPrerendered` or prefer per-route guards over a blanket middleware
4. **`src/schemas/`** — the single Zod source of truth, imported by `content.config.ts`, `lib/content.ts`, and every Action
5. **`src/actions/`** (Astro Actions) — typed RPC for `publishContent`, `stagePhoto`, `dispatchPhotoJob`, `jobStatus`, replacing hand-rolled `/api/*` routes
6. **`src/lib/github.ts`** — the sole module touching `api.github.com`, implementing per-file blob-SHA conflict detection (the real fix for the legacy `baseSha: "latest"` bug)
7. **`process-photos.yml`** (GitHub Actions, Node 22 runner) — the only place `sharp`/`exifr`/`@aws-sdk/client-s3` run; never imported into the Worker bundle; driven by `workflow_dispatch` with a client-generated `uploadId` for idempotency

Full system diagram, component responsibilities, project structure, and data-flow sequences (publish path and photo-upload path): `.planning/research/ARCHITECTURE.md`.

### Critical Pitfalls

Top pitfalls beyond the two flagged above (composed fail-open auth, font landmine):

1. **Planning around Cloudflare Pages when the adapter only supports Workers** — decide the deploy target in the foundation phase, before any deploy wiring exists; discovering this at cutover means redoing DNS, secrets, and CI simultaneously under outage pressure.
2. **Local `file:` linking the design system creates a second React copy** ("Invalid hook call," sometimes only on cold SSR, sometimes vanishing on refresh) — default to `npm pack` + tarball install; configure `vite.resolve.dedupe` from the first commit regardless.
3. **`r2.dev` uncached/rate-limited image origin** blocks Lighthouse 95+ and produces non-reproducible scores — migrate to an R2 custom domain and rewrite manifest URLs early (Phase 1), not at cutover.
4. **Deterministic R2 keys + a newly-cached custom domain = permanently stale re-uploaded photos** — a genuinely non-obvious interaction once Pitfall 3 is fixed. Use content-hashed keys (`{slug}-{shorthash}.webp`) or purge-on-write; also upload to R2 *before* committing the manifest (404s cache too).
5. **"Deployed!" shown at commit time, not at successful build** — the admin can only observe the commit synchronously; build failures (schema rejection, a stricter Astro 7 Rust-compiler HTML error) leave the site on the old deploy with no signal. Change the copy to "Committed — deploying…" and poll the actual workflow run.
6. **Concurrent commits racing** — the admin publish and the photo-pipeline Action can both target `main` at once. Needs: `concurrency` group on the Actions workflow, per-file blob-SHA conflict detection (not whole-HEAD comparison, which would false-positive on unrelated pipeline commits), and rebase-and-retry on the Action's push.

Full pitfall catalogue (16 documented, each with why-it-happens/how-to-avoid/warning-signs/phase-to-address), technical debt patterns, "looks done but isn't" checklist, and recovery strategies: `.planning/research/PITFALLS.md`.

---

## Implications for Roadmap

Research (independently, in ARCHITECTURE.md) already produced a build-order dependency graph. It should be treated as the strong starting point for the roadmap, not re-derived from scratch.

### Phase 0: Design (case studies + admin UX)
**Rationale:** The design handoff covers Home, Work, and Photos only — there is no design at all for `/admin` or for project case-study pages. This is real, unblocked work that should start immediately since it gates two *downstream* phases but nothing upstream.
**Delivers:** Admin UX design; one written case study + its template (write the case study first, then design against real content — not lorem ipsum).
**Addresses:** Case-study page feature (FEATURES.md §E), admin form-editor UX (§H).
**Blocks:** Case-studies phase and Admin phase only — does not block platform/foundation/content work.

### Phase 1 (parallel track A): Design-system charcoal theme
**Rationale:** Cross-repo blocker declared in PROJECT.md; genuinely independent of the Astro app (different repo, different release, no shared code/build). This is also the project's stated critical path for identity — start it in parallel with Phase 2, not after it.
**Delivers:** A third DS theme scope (`:root[data-brand="charcoal"]`, specificity-safe against `:root.dark`), light-mode contrast fixes (muted → ~#6E6A5E, add `--ochre-d` — two tokens currently fail AA), fonts split out of `tokens.css` into an opt-in `fonts.css` shipping Playfair Display/DM Sans/IBM Plex faces (the font-landmine fix), extended `tokens.test.ts` coverage, published as a new npm version (e.g. 1.12.0).
**Uses:** Stack findings on CSS cascade/specificity and the font-delivery split (STACK.md, ARCHITECTURE.md CSS section).
**Avoids:** Pitfall 4 (font landmine) and Pitfall 11 (CSS import-order/cascade ambiguity) from PITFALLS.md — both are upstream, design-system-repo fixes.
**Cross-repo:** This entire phase happens in `../design-system`, not this repo.

### Phase 2 (parallel track B): Astro foundation + auth
**Rationale:** The longest lead-time item (Workers deploy on a custom domain always takes longer than expected) and the single most important sequencing decision in the whole project: **ship fail-closed auth middleware here, before any admin route exists**, not later in an "admin phase." The moment `/admin` exists as a route in a deployed Worker it is a live attack surface; there must never be a window where a half-built admin is reachable without the auth gate already in place. This mirrors the exact failure mode CONCERNS.md found in the legacy app (auth "tightened later" via a comment that was never acted on).
**Delivers:** Astro 7 + adapter 14 + React 19 scaffolded; `wrangler.jsonc` (Workers, not Pages) with `run_worker_first` covering `/admin*`, `/api/*`, `/_actions/*`; `astro:env` schema for secrets (fails the build if unset, no silent-degrade path); a hello-world `/admin` route proving the prerender/on-demand split and the auth gate actually deny unauthenticated requests (tested against `astro preview`, real workerd); `ds:sync`/`ds:check` scripts (pack-and-install workflow + a CI gate that fails if the DS dependency is still a `file:`/`link:` spec at ship time); CI running lint, typecheck, `astro build`, tests.
**Uses:** STACK.md's exact `astro.config.mjs`/`wrangler.jsonc` recommendations; ARCHITECTURE.md's auth data flow (Flow A).
**Avoids:** Pitfall 1 (Pages vs Workers), Pitfall 2 (composed fail-open auth — the highest-severity new risk), Pitfall 5 (duplicate React), Pitfall 6 (workerd build-time Node incompatibilities), Pitfall 7 (accidental Cloudflare Images billing dependency).
**Also start in this phase (long lead time items):** verify `akhilsaxena.com`'s nameservers are Cloudflare-managed (blocks the entire deploy target if not — up to 48h registrar propagation if not); provision the R2 custom domain and plan the manifest URL rewrite (Pitfall 3/8) rather than leaving it for cutover.

### Phase 3: Content layer
**Rationale:** Must precede public pages. Writing pages against untyped `import`s and then rewriting every data access once Content Collections land is wasted work; the schemas are also the forcing function for reconciling any documented-vs-actual type drift in the ported data.
**Delivers:** `src/schemas/` (shared Zod, isomorphic — no Node-only deps so it works at build time in workerd), `content.config.ts` + `file()` loader for the `photos` collection, module-scope `parse()` for the three singleton config files, `src/lib/sanitize.ts` (kills the résumé stored-XSS class structurally, not by convention), ported `data/*.json`, tests asserting the schema accepts real data and rejects each known-bad shape.
**Implements:** ARCHITECTURE.md Pattern 1 ("one Zod module, three enforcement points") and Pattern 2 (build-time-throwing config loaders).

### Phase 4: Public pages (Home, Work, Photos, Résumé)
**Rationale:** This is where the islands-boundary decision (SSR everything, hydrate only the Lightbox) gets made concrete in code, and where the design-system's real per-page CSS/JS weight gets measured for the first time. Requires the charcoal theme (Phase 1) — not for correctness, since pages would render fine against the DS default palette, but because the theme's gaps (missing `--ochre-d`, contrast) surface exactly here, and discovering them after four pages are built means four rounds of rework.
**Delivers:** Gallery with `aspect-ratio`/LQIP/`srcset`/`break-inside: avoid`; prerendered `/photos/[category]` filter routes; Lightbox island (`client:idle`); résumé print stylesheet + JSON-LD; SEO (canonical, OG/Twitter, sitemap, both redirect sets).
**Addresses:** Nearly all of FEATURES.md's P1-priority table-stakes items.
**Must measure here, not later:** whether the DS barrel import tree-shakes TipTap/ProseMirror out of the `/photos` bundle (Pitfall 3 — a 5-minute experiment that de-risks the whole Lighthouse goal; if it fails, it's a design-system finding, fixed upstream, not worked around locally); which fonts actually download in DevTools Network (should be ≤2-3, not the DS's default 4 families).

### Phase 5: Case studies (`work/[slug]`)
**Rationale:** Reuses Phase 4's layout, typography scale, and component vocabulary — building case studies first would mean inventing that vocabulary twice. Needs Phase 0's design work.
**Delivers:** 4 project case studies + Brevo, each following the outcome → context → problem → decisions (with rejected alternatives) → result structure that research identified as the load-bearing pattern separating a real case study from filler.

### Phase 6a: Photo pipeline (GitHub Actions half) — genuinely parallel, test without any admin UI
**Rationale:** This is a real, actionable finding: the Actions half of the photo pipeline depends only on Phase 3 (the manifest schema) and R2 credentials — **not** on any admin UI. It can and should be built and verified end-to-end via `gh workflow run process-photos.yml -f upload_id=… -f temp_key=…` well before the admin exists. This removes the riskiest, least-familiar integration (sharp + exifr + concurrent R2/git writes) from the critical path and gets it debugged early instead of last, wedged behind the admin.
**Delivers:** `process-photos.yml` with a `concurrency` group (serializing manifest writers), the `sourceUploadId` idempotency guard, R2 `temp/` 1-day lifecycle rule, schema validation of the appended manifest entry before commit, rebase-and-retry on push.
**Split rationale:** Do not bundle this with Phase 6b (admin) — plan and build them as two halves of one design, but the Actions half has no UI dependency and should not wait on one.

### Phase 6b: Admin
**Rationale:** Needs Phase 0 (design), Phase 2 (auth foundation already in place — this phase only adds routes behind an already-proven gate), and Phase 3 (schemas). Deliberately sequenced *after* public pages: PROJECT.md accepts downtime "until cutover," and that clock only stops when the public site is live — the admin serves one authenticated operator who currently has `git` + a text editor as a perfectly serviceable fallback.
**Delivers:** `admin.astro` read path (server-fetches fresh content + a real HEAD SHA per request — never a build-time import, which is the root cause of the legacy `baseSha: "latest"` bug); a single `client:only="react"` admin island (one React root — cross-island state fragmentation would silently defeat the concurrency fix); DS form editors + preview pane; per-file blob-SHA concurrency with 409 surfaced as a reload-and-merge UX; upload UI wired to Phase 6a's pipeline; unsaved-changes guard.
**Avoids:** Pitfall 10 (cross-island state), Pitfall 12 (JWKS/Access edge cases), Pitfall 13 (concurrent commits), Pitfall 14 ("Deployed!" shown before the build actually succeeds).

### Phase 7: Harden + cut over
**Rationale:** Domain cutover is high-risk and time-boxed once started (site is down until it completes) — a written pre-flight checklist, not an improvised sequence.
**Delivers:** Lighthouse budget enforced in CI; a11y + `prefers-reduced-motion` verification; auth/publish/pipeline test coverage complete; DNS cutover to akhilsaxena.com (nameservers, apex + `www` Custom Domains, cert provisioning, `.pages.dev` 301s, Access AUD re-verification — recreating rather than editing the Access app issues a new AUD and locks out the admin, a documented easy mistake).
**Avoids:** Pitfall 15 (cutover-day surprises) — items with long lead time (nameserver check, R2 custom domain, secrets migration) must have started in Phase 2, not here.

### Phase Ordering Rationale

- **Phase 1 (DS theme) and Phase 2 (Astro foundation) are genuine parallelism** — different repositories, no shared code or build. This matters because Phase 1 is the project's declared blocker and Phase 2 is the longest-lead-time item; neither should wait on the other.
- **Auth belongs in Phase 2, not a later "admin phase"** — this is the single most important sequencing call in the whole roadmap, directly motivated by the legacy app's fail-open regression.
- **Content layer (3) strictly precedes public pages (4)** — avoids a rewrite-everything moment when typed collections land.
- **The photo pipeline's Actions half (6a) is independently parallel and testable via `gh workflow run` with zero admin UI** — this is a genuine scope/schedule finding, not just a nice-to-have: it de-risks the hardest integration early and gives the roadmap a phase that can absorb schedule slack whenever Phase 4/5 stall on a design question.
- **Public pages (4) come before admin (6b)** despite the admin being arguably the better DS stress test, because the accepted-downtime clock only stops when the public site is live.
- This is one developer; "parallel" means *safe to interleave/reorder*, not simultaneous — the value is knowing a stall in the DS-theme track doesn't stall the Astro-foundation track, and vice versa.

### Research Flags

Phases likely needing deeper research during planning (`--research-phase <N>`):
- **Phase 1 (DS charcoal theme):** the specificity/scope mechanics of introducing a third theme axis (`:root[data-brand]`) alongside `:root.dark`, and the font-split architecture, are novel to this design system — verify the chosen approach against the DS's actual test suite before committing.
- **Phase 4 (Public pages):** the DS-barrel tree-shaking question (does `import { Lightbox } from '@akhil-saxena/design-system'` pull ProseMirror into the `/photos` bundle?) is unresolved and load-bearing for the entire Lighthouse goal — treat the first build's bundle-visualizer output as a go/no-go gate, and have a rollback plan (deep import path, or an upstream DS ask) ready.
- **Phase 6b (Admin) / Phase 2 (Auth):** Cloudflare Access JWKS caching-in-a-Worker specifics (per-isolate cache lifetime, 6-week key rotation with 7-day grace) are subtle enough to warrant explicit test-writing guidance during planning, not just implementation.
- **Phase 7 (Cutover):** Workers Custom Domain requirements (no existing CNAME, no wildcard matching, active-zone requirement) have several sequencing traps; the pre-flight checklist in PITFALLS.md should be turned into phase acceptance criteria directly.

Phases with standard, well-documented patterns (research-phase likely unnecessary):
- **Phase 3 (Content layer):** Astro Content Collections + `file()` loader + Zod is a documented, first-party pattern with a working example already in STACK.md.
- **Phase 5 (Case studies):** reuses Phase 4's established component vocabulary; primarily a content/writing task.
- **Phase 6a (Photo pipeline Actions half):** the sharp/exifr/R2 pipeline is largely unchanged from the legacy design (the documented-but-dead R2-staging flow), just now actually wired up and tested.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version, peer-dependency, and config claims verified directly against the npm registry and current `withastro/docs`/`developers.cloudflare.com` source, not secondary summaries. |
| Features | HIGH on measured items (photo/data facts, EXIF completeness, payload sizes — all measured directly from `data/*.json` and live R2 requests); MEDIUM on convention items (EXIF display ordering, prior-art CMS comparison) which reflect observed practice rather than a written spec. |
| Architecture | HIGH on framework/platform mechanics (official docs + reading `../design-system` source directly); MEDIUM on the cross-repo workflow recommendation and JS-budget numbers, which are estimates pending in-project measurement. |
| Pitfalls | HIGH on platform/version facts (verified against current docs and the actual published DS npm tarball); MEDIUM on tree-shaking and hydration-cost predictions, which require measurement in Phase 1/4 to confirm. |

**Overall confidence:** HIGH. The one recurring caveat across all four documents is the same: **the design-system bundle's actual tree-shaking behavior in a production Astro build is unmeasured** and should be the very first thing verified once the foundation phase exists — everything about the Lighthouse-95+ strategy depends on it holding.

### Gaps to Address

- **Does the DS barrel tree-shake TipTap/ProseMirror out of a public island?** Unknown until measured (Phase 1/4). If it fails, the fix belongs upstream in the design system (per-component JS subpath exports) — flag as a design-system finding, not a portfolio workaround.
- **Does `@akhil-saxena/design-system/css/card`-style per-component CSS resolve cleanly under Astro's build?** The `exports` map uses a `"style"` condition with a `"default"` fallback; should work but is unverified — cheap to test early.
- **Playfair Display: shipped from the DS theme, or via Astro's built-in `fonts` config?** STACK.md recommends the latter (DS owns only the token, Astro owns delivery) but this crosses the repo boundary and should be settled before the theme release is cut, not discovered mid-build.
- **Case-study content shape** — Markdown via a `glob()` collection vs. JSON in `data/` — depends on Phase 0's design output and on whether case studies should be admin-editable at all. Unresolved; a Phase 0/5 planning decision.
- **`bullets` as sanitized HTML vs. restructured typed segments** (résumé) — sanitization is the safe, cheap default; restructuring eliminates the injection class entirely but costs a migration of 4 existing entries. Flagged as a roadmap option, not a default, in STACK.md.
- **Exact DNS cutover propagation timing** (nameserver change, cert issuance) is LOW confidence in the source docs — treat as schedule risk with buffer, not a fixed duration, in Phase 7 planning.

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, `npm pack`), queried 2026-08-16 — exact versions/peers/exports for `astro`, `@astrojs/cloudflare`, `@astrojs/react`, `@akhil-saxena/design-system`, `jose`, `ultrahtml`, and the full dev-tooling set
- `/withastro/docs` (via Context7) and raw `docs.astro.build` pages — `output`/`prerender` semantics, Cloudflare adapter guide (Pages removal, binding API changes, image service defaults), Actions, Content Collections, environment variables, testing guide, v6/v7 upgrade guides
- `developers.cloudflare.com` — Access JWT validation, R2 public buckets and consistency docs, Workers static-asset routing and migration-from-Pages guide, Workers limits, custom domains
- Direct reads of `../design-system` source and published tarball — `package.json` exports/peers, `tsup.config.ts`, `tokens.css` font imports, hook-usage audit of every component the public pages need, measured CSS/JS sizes
- Direct reads of this repo's `data/portfolio_images.json`, `resume.json`, `home_config.json`, `site_config.json`, and live HTTP requests against the R2 `pub-*.r2.dev` bucket
- GitHub REST API docs (Contents/Git Data API semantics, rate limits, workflow_dispatch `return_run_details`)

### Secondary (MEDIUM confidence)
- Nielsen Norman Group, web.dev, Smashing Magazine, CSS-Tricks — UX/performance convention sources (scrolljacking, lazy-load LCP penalty, native CSS masonry status)
- Community reports (`withastro/astro` issues, Vite issue tracker, Medium/blog posts) corroborating the duplicate-React and CSS-cascade failure modes
- Biome docs on `.astro` support maturity

### Tertiary (LOW confidence)
- Secondary framing of Cloudflare Pages as "maintenance mode" — no formal Cloudflare deprecation exists; treated as color only, since the adapter's removal of Pages support is what actually forces the decision
- EXIF display ordering convention (Flickr/500px-style) — observed practice, not a written spec
- Exact DNS/cert-provisioning propagation timing during cutover — Cloudflare's docs don't characterize duration

---
*Research completed: 2026-08-16*
*Ready for roadmap: yes*
