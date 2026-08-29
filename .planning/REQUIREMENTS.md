# Requirements: akhilsaxena.com — Portfolio Rebuild

**Defined:** 2026-08-16
**Core Value:** The site must be the proof that the design system works. Where a tradeoff arises between shipping something bespoke and shipping it out of the design system, the design system wins, and any gap it exposes is a finding to upstream rather than a workaround.

## v1 Requirements

### Design (Phase 0 — ideation and wireframing only, no implementation)

- [x] **DSGN-01**: Admin CMS has a wireframed information architecture and screen design — no design exists for it today
- [x] **DSGN-02**: Project case-study pages have a wireframed template — no design exists for them today
- [x] **DSGN-03**: Work and Photos designs are resolved onto the dark palette (the handoff prototypes are an earlier ivory iteration)
- [x] **DSGN-04**: Throwaway sketches are built against the real `@akhil-saxena/design-system` package, not hand-written HTML, so the charcoal theme is validated against actual components before the design system release is cut
- [x] **DSGN-05**: The charcoal theme's public API is decided — how it scopes, how it composes with `:root.dark`, and how fonts are delivered

<!-- DSGN-04 and DSGN-05 keep the name "charcoal" deliberately. The brand was renamed to
     monochrome in plan 01-23, and the [Phase 01] decision in STATE.md scopes that rename to code
     and forward-looking documents only, because the Phase 0 artefacts these two rows point at
     literally carry the old name on disk: theme-prototype/'s filenames, 00-THEME-API.md's prose,
     and the phase directory 01-design-system-charcoal-theme/. Renaming here would make the rows
     name files that do not exist. DS-01 and DS-05 below WERE renamed, because they describe what
     the installed package ships today. -->

- [x] **DSGN-06**: First-pass copy exists for the five project one-liners and the case studies, drafted for Akhil to edit, so build phases work against real text lengths

### Design System — cross-repo, delivered from `../design-system`

- [x] **DS-01**: A **monochrome** brand theme (renamed from *charcoal* in plan 01-23, before anything published) exists as a third scope alongside `:root` and `:root.dark`, specificity-safe so it cannot lose to `:root.dark` on source order
- [ ] **DS-02**: Muted text passes **WCAG AAA (7:1)** in both modes against all three surfaces (page, card, panel), and every accent-as-text usage passes AA at minimum — measured against elevation, not only against the page background
- [ ] **DS-03**: Two accent tokens exist and are governed by a written rule: `--ochre-d` for focus rings, fills and display type (mirroring the existing `--amber-d` treatment), and `--ochre-d-strong` for small-label accent text that must reach AAA

<!--
DS-02/DS-03 revised 2026-08-17 after Phase 0's UI-SPEC review measured the palette against
card and panel surfaces rather than the page alone. Two findings forced the change:

1. PROJECT.md's claim that "the dark palette is clean" does not survive elevation — ochre
   #B0722A is 4.56:1 on the page but 4.20:1 on a card and 3.91:1 on a panel, failing AA
   wherever elevation exists.
2. PROJECT.md's proposed ~#6E6A5E light-mode muted fix is insufficient at 4.46:1 on an
   inset panel.

The bar is **targeted AAA**, not blanket AAA — a deliberate choice. Full AAA forces
--ochre-d to #6B4417 in light mode, which reads as dark chocolate-brown rather than ochre,
costing the identity the rebuild is organised around. Splitting the token confines the 7:1
requirement to the small-label accent text that needs it. WCAG does not recommend AAA as a
blanket site-wide policy.

Locked values: --ink-3/-4 = #4F4C42 (light) / #B1AEA8 (dark);
--ochre-d = #8C591F / #C6883A (unchanged, feeds --focus, non-text under SC 1.4.11);
--ochre-d-strong = #6B4417 / #D4A66D (small-label accent text only).
See .planning/phases/00-design-ideation/00-UI-SPEC.md for the full contract.

────────────────────────────────────────────────────────────────────────────
SUPERSEDED 2026-08-22 by plan 01-22 — kept, not rewritten, because everything
above was true on 2026-08-17 and the reasoning is what made the split filable.

The ochre identity this note is written around WAS REJECTED at the 01-20
capture review, and the palette was rebuilt near-monochrome in 01-22; the
brand was renamed charcoal -> monochrome in 01-23, before anything published.
So the locked values above are history. What that costs each row:

  DS-02 clause 1 (muted text at AAA on three surfaces) SURVIVES the rebuild
        and was deliberately protected -- --ink-3 measures 7.44 / 7.63 / 7.06
        light and 8.21 / 7.56 / 7.02 dark, which is why the candidate palette's
        lighter muted step was rejected. Clause 2 ("every accent-as-text usage
        passes AA") is MEASURABLY FALSE: finding F-22-2, --amber painted as
        small text in monochrome light, 3.11 / 3.19 / 2.96. Five rules in
        primitives.css do it and the fix is to re-point them at --amber-d.

  DS-03's two tokens exist under a written rule and --ochre-d-strong reaches
        AAA in both modes (7.92 / 8.13 / 7.52 and 9.00 / 8.29 / 7.70), but
        --ochre-d IS NO LONGER THE FOCUS-RING TOKEN: --focus is bound to --ink,
        because a neutral accent is a mid grey and made a weaker indicator than
        the page's own text colour. The row's letter no longer describes what
        ships.

BOTH ROWS NEED RE-STATING BY A HUMAN against the monochrome identity. Plan
01-22 refused to tick them and this audit refuses to reword them: renaming a
brand is a correction, but re-drawing a contrast contract is a scope decision.
Evidence: .planning/phases/01-design-system-charcoal-theme/01-22-SUMMARY.md
sections 9 and 9a.
-->

- [x] **DS-04**: Font delivery is split out of `tokens.css` so consuming a theme does not force four unrelated font families
- [x] **DS-05**: The monochrome theme ships Playfair Display, DM Sans and IBM Plex Mono faces, so redefining `--font-serif` cannot silently fall back to Georgia
- [x] **DS-06**: `tokens.test.ts` covers the new theme's contrast contract, so a regression fails CI
- [x] **DS-07**: `Lightbox` supports backdrop-click close, `srcset`, swipe, and `aria-live` slide announcements
- [x] **DS-08**: The theme is published to npm and consumable by version number
- [x] **DS-09**: Public-page components can be imported without pulling TipTap, ProseMirror or dnd-kit into the bundle — by tree-shaking if it already works, by per-component JS exports if it does not

### Design System — cascade layers and density, delivered from `../design-system`

<!--
Added after Phase 0's discussion. Deliberately NOT part of Phase 1: layers must not ship
in the same release as the font split and contrast fixes, or a visual regression becomes
unattributable. Density has no legitimate mechanism until this lands, because brand themes
own colour, type and geometry but not spacing.
-->

- [ ] **DS-10**: Design-system CSS resolves by declared cascade-layer order rather than specificity arithmetic, so precedence no longer depends on the order a bundler emits stylesheets
- [ ] **DS-11**: A `data-density="compact"` axis exists alongside brand and mode, redefining spacing tokens so a consumer never overrides spacing itself
- [ ] **DS-12**: The layers migration ships as an isolated release verified against the existing Playwright snapshot suite, with brand × mode × density combinations covered

### Foundation

- [x] **FND-01**: An Astro 7 + React 19 app builds and deploys to Cloudflare Workers with Static Assets
- [x] **FND-02**: Public routes are prerendered static; `/admin`, `/api/*` and `/_actions/*` render on demand
- [x] **FND-03**: R2 bindings resolve from `cloudflare:workers` in both local dev and production, with no absence-guard masking a real failure
- [x] **FND-04**: Missing secrets fail the build rather than degrading at runtime
- [x] **FND-05**: The design system is consumed **from the npm registry by version number**, and the ship path fails if the dependency spec is still a local path or a symlink. *(Wording corrected 2026-08-29: the packed-tarball bridge this row originally described was the pre-publication mechanism and was retired when `2.0.0-beta.1` shipped on 2026-08-25. A `file:*.tgz` spec remains the sanctioned dev-time fallback — `gate:deps:advisory` reports one without failing — but the enforcing gate on the deploy path refuses it.)*
- [x] **FND-06**: CI runs lint, typecheck, build and tests on every push
- [x] **FND-07**: `akhilsaxena.com` nameservers are confirmed Cloudflare-managed and an R2 custom domain is provisioned — both long-lead items resolved early rather than at cutover

### Authentication — lands in the foundation phase, before any admin route exists

- [x] **AUTH-01**: Requests to `/admin`, `/api/*` and `/_actions/*` without a valid Cloudflare Access JWT are denied
- [x] **AUTH-02**: Missing Access configuration denies access — there is no cookie-presence fallback and no path that degrades to permissive
- [x] **AUTH-03**: No API or admin route can be served as a prerendered static file, enforced by `run_worker_first` and a build assertion that `dist/api/` does not exist
- [x] **AUTH-04**: An automated test asserts unauthenticated requests are rejected, run against a real workerd runtime rather than a mock

### Content Layer

- [ ] **CONT-01**: One shared schema module validates photos, résumé, home config, **projects** and site config, and is enforced at build time, at write time, and in admin form errors. *(Count corrected 2026-08-29: `projects.json` was split out as a fifth content file by plan 03-05, and `validateContentSet` takes all five — RI-5 would be skipped on four.)*
- [x] **CONT-02**: A malformed content commit fails the build loudly instead of shipping
- [ ] **CONT-03**: Résumé bullet prose **cannot carry markup at all** — the stored grammar has no production that emits an angle bracket, and the render boundary emits React elements and text children rather than an HTML string — enforced at the storage boundary, the render boundary and the write boundary. *(Mechanism corrected 2026-08-29. This row used to say "allowlist-sanitized at both the write boundary and the render boundary". That names a sanitiser, and ADR-001 §66 — preserved by ADR-002 §2 — deliberately rejected one: "a filter can be bypassed or forgotten; a shape that cannot express markup cannot carry an injection." Plan 03-02 declined to tick this row for exactly that reason and recommended this rewording; 03-07 did the same for the render half. Three boundaries, not two — the third is the write path, which does not exist until Phase 7.)*
- [x] **CONT-04**: **Every remote photo URL in the manifest** — four variants per record, so `4 × data/portfolio_images.json.length` (160 at 40 records today), the `thumb` being an inline base64 LQIP with no origin — is migrated off `pub-*.r2.dev` onto a cached R2 custom domain. *(Count de-hardcoded 2026-08-29: this row said "All 39 photo URLs", which was wrong twice over — the migration moved 156 URLs across 39 records, and the manifest is now at 40. The gate derives the count and treats 39 as a floor, so it survives a 41st photograph; this row now names the derivation instead of a number.)*
- [x] **CONT-05**: Photo keys or cache handling ensure a re-uploaded photo does not serve stale forever

### Public Site

- [x] **PUB-01**: Home presents two acts — identity and photo grid filling the first viewport, work below
- [x] **PUB-02**: Work lists the five projects and the Brevo engineering strip
- [x] **PUB-03**: Photos shows **every photograph in the manifest** — the page derives the count from `getCollection('photos').length` and never declares it (40 today) — in a masonry gallery with no pagination. *(Count de-hardcoded 2026-08-29, matching ROADMAP criterion 2. This row said "all 39 images"; the manifest reached 40 on 2026-08-28.)*
- [x] **PUB-04**: Category filtering works as prerendered `/photos/[category]` routes with real links — crawlable, Back-button-capable, and **the filter rail itself ships no JavaScript**: `PhotoFilters` carries no `client:*` directive, so it renders to static HTML and every pill is a plain anchor. *(Clarified 2026-08-29. The bare phrase "zero JavaScript" was ambiguous once the lightbox landed: the gallery and the seven category documents each hydrate exactly one island, and that island is PUB-06's `PhotoLightbox`, not the filter. PUB-14 is where the route-level JS budget lives.)*
- [x] **PUB-05**: Images reserve space from existing `dimensions` data and blur up from the existing base64 placeholders, so the gallery does not shift as it loads
- [x] **PUB-06**: Clicking a photo opens a lightbox with keyboard, backdrop and swipe dismissal
- [x] **PUB-07**: The lightbox shows EXIF, omitting absent fields entirely rather than rendering a placeholder — **11 of the manifest's 40 records** carry at least one null EXIF field today, one of them (`product-peppers`) all six, and the renderer emits one row per surviving field rather than counting. *(Denominator corrected 2026-08-29: this row said "11 of 39". The numerator 11 is unchanged and re-derived from `data/portfolio_images.json`; both numbers are dated observations, not a contract — the property is "omit, never placehold", which `exifRows` asserts per record across the whole corpus.)*
- [x] **PUB-08**: Camera and lens strings display as human names, not raw model codes like `NIKON CORPORATION NIKON D5300`
- [x] **PUB-09**: Each photo has its own prerendered page with a social card
- [x] **PUB-10**: Résumé renders from structured data and offers the maintained PDF
- [x] **PUB-11**: The résumé prints legibly
- [x] **PUB-12**: Visitors can switch between dark and light, the choice persists, and there is no flash of the wrong theme on first paint
- [x] **PUB-13**: Motion is suppressed under `prefers-reduced-motion`
- [x] **PUB-14**: Four of the five public routes ship zero framework JavaScript

### Case Studies

- [ ] **CASE-01**: Each project has a case-study page structured as problem, decisions and outcome — including alternatives rejected, not only what was chosen
- [ ] **CASE-02**: Case studies are authored as Markdown in a content collection
- [ ] **CASE-03**: The design system case study exists and carries genuine depth, as the flagship project

### Photo Pipeline

- [x] **PIPE-01**: A photo uploaded to R2 staging is resized, has its EXIF read, and is committed with an updated manifest
- [x] **PIPE-02**: The pipeline is drivable end-to-end from the command line before any admin UI exists
- [x] **PIPE-03**: Re-running a job for the same upload does not duplicate entries
- [x] **PIPE-04**: A partial failure does not leave the manifest inconsistent with the bucket, and staged objects expire rather than accumulating
- [ ] **PIPE-05**: Pipeline commits and admin publishes cannot clobber each other

### Admin

- [ ] **ADMIN-01**: Akhil can edit the résumé, home config, project cards and photo metadata through form editors built from design-system components. **Site config is explicitly excluded** — its integrity is enforced by a Phase 3 schema rule instead of a screen. *(Reworded by [ADR-002](ADR-002-admin-scope-revised.md), superseding ADR-001.)*
- [ ] **ADMIN-02**: Changes can be previewed before publishing
- [ ] **ADMIN-03**: Publishing commits to the repository and triggers a rebuild
- [ ] **ADMIN-04**: A concurrent edit is detected per-file by blob SHA and surfaced as a recoverable reload, not a dead-end error and not a silent overwrite
- [ ] **ADMIN-05**: The admin reports "deployed" only once the build actually succeeded, not at commit time
- [ ] **ADMIN-06**: The last publish can be reverted in one click
- [ ] **ADMIN-07**: Photos can be uploaded through the admin, with the job's completion reported back
- [ ] **ADMIN-08**: Per-photo `object-position` for the home hero crops is editable rather than left to rot
- [ ] **ADMIN-09**: Navigating away with unsaved changes warns first
- [ ] **ADMIN-10**: The whole round trip — edit, publish, see it live — works without touching a terminal, **except for case-study prose and site config**. *(Qualified by [ADR-002](ADR-002-admin-scope-revised.md).)*

### SEO and Cutover

- [x] **SEO-01**: Every page has canonical URL, Open Graph and Twitter card metadata
- [x] **SEO-02**: The résumé page carries `Person` structured data
- [x] **SEO-03**: A sitemap is generated
- [ ] **SEO-04**: `akhilsaxena.pages.dev` 301s to the apex — the production hostname is already indexed and carries no automatic noindex
- [x] **SEO-05**: The legacy `/portfolio` path 301s to `/photos`
- [ ] **SEO-06**: The site serves from `akhilsaxena.com` with certificates issued and Access still working for the admin

### Quality

- [ ] **QUAL-01**: Public pages score 95+ on Lighthouse performance, accessibility, best practices and SEO, enforced in CI
- [ ] **QUAL-02**: The auth boundary, the publish path and the photo pipeline have automated test coverage
- [ ] **QUAL-03**: Application CSS beyond the design system is confined to layout
- [ ] **QUAL-04**: The built site matches the design handoff on layout, typography, spacing and interaction

## v2 Requirements

| ID | Requirement | Why deferred |
|----|-------------|--------------|
| **ADMIN-11** | Commit diff preview before publishing | The preview pane covers most of the need |
| **CONT-06** | Restructure résumé bullets from HTML to typed segments | Sanitization closes the hole now; restructuring costs a data migration and a more complex editor |
| **CASE-04** | Case studies editable through the admin | Written once; revisit only if revised often |
| **BLOG-01** | Writing/blog section | Not part of the vision — Akhil hasn't considered wanting one |

## Out of Scope

| Feature | Reason |
|---------|--------|
| Photo view analytics | Cut deliberately. It was the only thing forcing a server runtime onto public pages; dropping it makes them fully static and removes an attack surface |
| Gallery pagination or infinite scroll | Measured: all 39 photos at `small` total 0.9 MB. The handoff's "SHOWING 8 OF 39" is unjustified complexity. *(**The two 39s here are a dated measurement and are deliberately left standing** — they record what was weighed when the decision was taken. The manifest is at 40; nothing about the conclusion moves. `src/pages/photos/index.astro` names this decision at its head and derives its own count.)* |
| Generating the résumé PDF from data | The PDF stays hand-maintained; automating it has no reader-visible payoff |
| Inline WYSIWYG admin | Form editors have fewer moving parts, and design-system inputs already carry the accessibility work |
| Photo `tags` field | **Removed, not merely unused.** This row used to read *"Present in the schema, unused by all 39 photos"*; that stopped being true on 2026-08-25, when plan 03-06 executed OD-3 in both halves — the empty `tags` array was deleted from all 39 records (39 deletions, 0 insertions) and `src/schemas/photo.ts` now declares `tags: z.never().optional()` inside a `z.strictObject`, so a present `tags` is refused **by name**. Re-adding it is a deliberate schema change. |
| Photo date display or sorting | The stored dates are ingest dates from a 10-day window, not capture dates — showing them would misrepresent the work |
| GPS / location EXIF | Not in the data, and a privacy risk to add |
| Astro image service or Cloudflare Images | Five correctly-sized variants already exist; sharp cannot run in workerd anyway |
| Client-side query-param photo filtering | Prerendered category routes are strictly better — crawlable, zero JS, free Back-button |
| Three-state theme toggle | Two states, dark by default, as designed |
| Editorial / branch workflow in admin | One editor, no reviewer — pure overhead |
| Cookie consent banner | With analytics cut there is nothing to consent to; a banner would imply tracking that does not happen |
| Dynamic or edge-generated OG images | Reintroduces exactly the server-runtime cost that got analytics cut |
| Keeping the legacy Next.js app running in parallel | `main` was deliberately purged; downtime was accepted explicitly |

## Traceability

**Audited 2026-08-29** against the repository at `d73d23f` — `npm test` **1509/1509 across 43
files**, all **11 gates** in `gate:content` exit 0, `gate:deps` exit 0, CI and Deploy both green
at that commit, `@akhil-saxena/design-system@2.0.0-beta.2` installed from the registry. Before
this audit every one of the 76 rows read `Pending` while Phases 0–4 were complete; the file had
never been maintained.

**How to read this table.**

| Status | Meaning | Checkbox above |
|---|---|---|
| **Complete** | Every clause of the row is proven by the cited artefact. The citation is a thing you can open, run or fetch — a named test, a gate, a committed file, a measured number in a plan summary. | `- [x]` |
| **Partial** | A named part is proven and a named part is not. The Evidence cell says which is which. **Not rounded up.** | `- [ ]` |
| **Pending** | Nothing is proven yet, or the work belongs to a phase that has not run. | `- [ ]` |

**The checkbox and the status agree by construction:** `- [x]` if and only if **Complete**.
Partial and Pending are both unticked, because a tick is a claim that the whole row holds.

**Rule this audit followed:** a row is Complete only if the evidence was *opened*, not
remembered. Where no proof could be found the row stayed Partial or Pending with the reason
written down, however obviously done it looked. Paths are relative to the repository root
unless prefixed `../design-system` (Phases 1 and 06.1 execute cross-repo).

| Requirement | Phase | Status | Evidence |
|-------------|-------|--------|----------|
| DSGN-01 | Phase 0. Design & Ideation | Complete | `00-ADMIN-IA.md` — 473 lines, route-per-entity, all 39 recovered legacy form controls mapped to 7 routes (00-03). 22 admin captures tracked under `phases/00-design-ideation/screenshots/` (`S-`/`E-`/`T-`/`O-`/`P-`/`R-`). Review passes B1–B6 walked with Akhil 2026-08-22, verdicts in `00-17-SUMMARY.md`; pass 5 verified `/admin/conflict-diff/` structurally — per-file `Reload`/`Overwrite` on all five files, zero global "resolve all". **Residual:** checklist items C4/C5 (live reorder positioning) are still unticked and the playground is deleted, so they need `git checkout playground/phase-0-sketches -- .playground` to walk. |
| DSGN-02 | Phase 0. Design & Ideation | Complete | 00-10 rendered the long- and short-form templates against the real drafts; 00-20 gave each case its own route (`/work/{id}` × 5). 30 captures `00-X-case-{cairn,design-system,hued,momentum,timeshift}-populated-dark-{344,390,768,841,1024,1440}.png`. The 68ch prose measure was **CONFIRMED** at the 2026-08-22 walk and is what Phase 6 builds against (`00-PUBLIC-DESIGN-NOTES.md` § Review outcome). |
| DSGN-03 | Phase 0. Design & Ideation | Complete | 00-09 (Work/Photos recolour + Home Act 2), 00-21 (responsive shell), 00-22 (two-state Home). Walk verdicts, `00-PUBLIC-DESIGN-NOTES.md` § Review outcome: `--wire` project cards on dark **PASS**; photo tiles + active filter pill **PASS** at 1440 and 390, dark-toned photographs do not bleed. `00-RESPONSIVE-CONTRACT.md` §9 makes every public capture `-dark-`, and 42 of 42 Phase 5 captures match. |
| DSGN-04 | Phase 0. Design & Ideation | Complete | 00-01 scaffolded the throwaway Astro playground importing the **real** `@akhil-saxena/design-system`, proved the D-02 deletion fence and took the first DS-09 tree-shaking measurement. 00-04 built the prototype theme; 6 `theme-prototype/` files tracked. Gaps written up as upstream findings in `00-FINDINGS.md` rather than worked around — the register Phase 1 then closed. |
| DSGN-05 | Phase 0. Design & Ideation | Complete | `00-THEME-API.md` (00-08): scope selector, composition with `:root.dark`, and font delivery all decided in writing. Open decision 1 was closed as `option-b` **by Akhil, not by the executor** (01-05-SUMMARY). |
| DSGN-06 | Phase 0. Design & Ideation | Complete | `00-COPY/` holds `one-liners.md` plus five case drafts; 00-02 shipped a zero-dependency length gate enforcing D-40/D-43 budgets and the no-guessed-numbers rule; 00-18 compressed four drafts to 500–700 words. **Residual, recorded honestly at the walk:** the `[source:]` annotations were **NOT CHECKED** — "recorded as unverified, not as passed" — and must resurface before Phase 6 consumes the copy. |
| DS-01 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | Read in the **installed** package: `node_modules/@akhil-saxena/design-system/dist/themes/monochrome.css` declares exactly two flat blocks — `:root[data-brand="monochrome"]` at (0,2,0) and `:root[data-brand="monochrome"].dark` at (0,3,0) — so the light block ties `:root.dark` and the dark block wins by arithmetic, not by source order. 01-01 ported all 74 prototype declarations verbatim; 01-23 renamed the brand with 504 baselines `git mv`'d and zero re-capture. |
| DS-02 | Phase 1. Design System — Monochrome Theme (cross-repo) | **Partial** | **Clause 1 MET and deliberately protected:** `--ink-3` measures 7.44 / 7.63 / 7.06 light and 8.21 / 7.56 / 7.02 dark against page, card and panel — the candidate palette's lighter muted step was rejected to keep it. **Clause 2 MEASURABLY FALSE:** finding F-22-2, `--amber` painted as small text in monochrome light, **3.11 / 3.19 / 2.96**. Five rules in `primitives.css` do it; the fix is to re-point them at `--amber-d`, a component change 01-22's scope forbade. Plan 01-22 §9a refused to tick this row. **The row also still names the retired ochre identity and needs re-stating by a human** — see the dated note above the DS block. |
| DS-03 | Phase 1. Design System — Monochrome Theme (cross-repo) | **Partial** | **MET:** both tokens exist under a written rule, and `--ochre-d-strong` reaches AAA in both modes (7.92 / 8.13 / 7.52 light, 9.00 / 8.29 / 7.70 dark). **NOT MET as written:** `--ochre-d` is no longer bound to the focus ring — `--focus` is `--ink`, because a neutral accent is a mid grey and made a weaker indicator than the page's own text colour. The requirement's letter no longer describes what ships. 01-22 §9a; needs re-stating, not ticking. |
| DS-04 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | Font delivery is a separate subpath: the installed package ships `dist/fonts/default.css` and `dist/fonts/monochrome.css` alongside `dist/themes/`. 01-04 measured the token layer's transitive face payload collapse; 01-06 closed the defect 01-04 named. Consuming a theme no longer forces four unrelated families — proven downstream by `gate:fonts`. |
| DS-05 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | `npm run gate:fonts` on `dist/`: **12 `@font-face` rules, 3 distinct families** (Playfair Display Variable, DM Sans Variable, IBM Plex Mono), 14 emitted font assets, and Inter / Archivo / JetBrains Mono / Newsreader absent as both family and asset name; 7/7 self-test rules flagged their canary. The Georgia half is measured in a browser — `05-AUDIT.md` §7: the h1's own stack renders a fixed string at **1077.89 px** against Georgia's **1254.06 px**, a 176px gap, with an absent-family control proving the instrument can still see a fallback. |
| DS-06 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | `../design-system/src/tokens.test.ts` — 54 KB, 86 references to `monochrome`, 59 contrast assertions added by 01-03 as a CI gate, extended by 01-10 and 01-20. `DS_BRAND=monochrome npm run test:a11y` is **508/508 across 84 suites**, up from 11 failed / 497 (01-22 §10). |
| DS-07 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | 01-07, all four capabilities measured **in Chromium** rather than inferred from a prop: backdrop-click close (three conditions, because two let one swipe navigate *and* close), `srcSet`/`sizes` passthrough with `img.currentSrc` resolving to a 464-char candidate, pointer-event swipe navigation (`swipe left 160px → Image 3 of 3`), and `role="status" aria-live="polite"` announcing `Image 2 of 3. Harbour wall`. Lightbox unit tests 19 → 44; 20 mutation cases executed. `2.0.0-beta.2` later added swipe-to-**dismiss** on top (D-16). |
| DS-08 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | `2.0.0-beta.1` published 2026-08-25 to the **`next`** dist-tag with **SLSA v1 provenance** via GitHub Actions trusted publishing (OIDC) — verified from the registry, not the local pack: `dist-tags.latest` unmoved at `1.11.4`, publisher `npm-oidc-no-reply@github.com`, registry shasum byte-identical to the local pack (01-21). This repository now consumes `^2.0.0-beta.2` **by version number**: `npm run gate:deps` PASS — 25 declared dependencies, no `file:`/`link:`/`portal:` spec, no top-level `node_modules` symlink. |
| DS-09 | Phase 1. Design System — Monochrome Theme (cross-repo) | Complete | Fixed upstream: 01-08 shipped 81 per-component JS entries (an `import { Chip }` island fell from 570,555 B / 99 modules to **1,620 B / 2 modules**); 01-17 moved the six-language highlighter off the eager path, −8,010 B gzip. **Re-checked as Phase 5's go/no-go gate and now standing in CI:** `npm run gate:public-js` sweeps **215,354 B across 6 chunk sources** for `prosemirror|tiptap|lowlight|highlight.js|dnd-kit` in both npm-name and minified-identifier spellings — 0 hits — and its 10 rules each flagged their canary and ignored their anti-canary on this run. |
| DS-10 | Phase 06.1. Design System — Cascade Layers & Density Axis (cross-repo) | Pending | Phase 06.1 has not run — `.planning/phases/06.1-design-system-cascade-layers-density-axis/` is empty. Deliberately off the critical path: layers must not ship in the same release as the font split and contrast fixes, or a visual regression becomes unattributable. |
| DS-11 | Phase 06.1. Design System — Cascade Layers & Density Axis (cross-repo) | Pending | Phase 06.1 has not run. The compact-density work that exists is 00-12's **prototype** in the deleted playground, not a published axis; the density axis has no legitimate mechanism until DS-10 lands, because brand themes own colour, type and geometry but not spacing. |
| DS-12 | Phase 06.1. Design System — Cascade Layers & Density Axis (cross-repo) | Pending | Phase 06.1 has not run. |
| FND-01 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `package.json`: `astro@^7.2.2`, `react@^19.2.8`, `@astrojs/cloudflare@^14.2.1`. `wrangler.jsonc` uses Workers **with Static Assets** (`assets.directory: ./dist`, `binding: ASSETS`, `not_found_handling: 404-page`), `main: @astrojs/cloudflare/entrypoints/server` — not Pages. Deployed and serving on `preview.akhilsaxena.com` (02-09); the **Deploy** run for `d73d23f` completed **success** at 2026-08-29T11:31:57Z. |
| FND-02 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `astro.config.mjs` leaves `output` at its default `static` and attaches the adapter only to unlock per-route `prerender = false`. `npm run gate:routes` PASS, **both sides**: source side — the 2 routed files under the protected prefixes each declare an uncommented `export const prerender = false` (`src/pages/admin/index.astro`, `src/pages/api/health.ts`); output side — no `api/`, `admin/` or `_actions/` path exists under the Static Assets root, resolved from `dist/server/wrangler.json` rather than assumed. `/_actions/*` is real, not notional: `src/actions/index.ts` defines `ping`. |
| FND-03 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `src/lib/r2.ts` reads `env.PORTFOLIO_BUCKET` from `cloudflare:workers` with **no truthiness check, no optional chaining, no `??`, no try/catch and never a null return** — the file's own header explains that a guard would convert a genuinely broken binding into a silent wrong answer. Proven live, not asserted: 02-04 did a real `.list()` round trip under `astro dev`, and `test/harness/runtime.workerd.test.ts` runs inside real `workerd` with the live binding. |
| FND-04 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `astro.config.mjs` declares `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` as `envField.string({ context: 'server', access: 'secret' })` — **non-optional, no default** — under `validateSecrets: true`. 02-06 measured five ways that exporting the values into the process environment does *not* satisfy this: the adapter's prerender sandbox reads an on-disk file, so a job that only sets them as step-level `env:` fails the build. CI's *Assert no placeholder value was inlined* step then proves the secrets are read at runtime and not baked in. |
| FND-05 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `npm run gate:deps` PASS across `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, `overrides`/`resolutions` and top-level symlinks. It is **enforcing on the ship path**: `npm run deploy` = `gate:deps && build && test && gate:content && wrangler deploy`, and `.github/workflows/deploy.yml`'s only publish step runs `npm run deploy`. Everyday CI runs the **advisory** form on purpose, so a dev-time tarball reports without failing. 02-06 watched both refusals fire with **37 planted violations**, from a tree whose SHA-256 digest was identical before and after. |
| FND-06 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `.github/workflows/ci.yml` on every push and PR: `npm ci` → `npm run check` (biome + prettier) → `npm run typecheck` (`astro check`) → `npm run build` (which ends in the 11-gate chain) → the no-inlined-secret assertion → `npm test` (both Vitest projects) → **`npm run gate:content` a second time**, because the integration suite's global setup rebuilds `dist/` and the dist-scoped gates would otherwise never see the bytes that ship. Actions pinned to full commit SHAs, `fetch-depth: 0`, Node from `.nvmrc`. **CI** for `d73d23f` completed **success** at 2026-08-29T11:28:55Z. |
| FND-07 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | 02-02: `akhilsaxena.com` confirmed on Cloudflare-managed nameservers, and `images.akhilsaxena.com` provisioned as a **proxied R2 custom domain measured serving `cf-cache-status: HIT`** — replacing an origin that emitted no cache header at all. Both long-lead cutover items resolved in Phase 2 rather than at cutover. |
| AUTH-01 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `test/auth/deny-unauthenticated.node.test.ts` — 9 HTTP cases against real `workerd`: `/admin`, `/api/health` and `POST /_actions/ping` refused with **401** bare and again with a garbage `Cf-Access-Jwt-Assertion`. The proof is **discriminating, not universal**: 02-07 forced `verifyAccessJwt` to always deny and all nine stayed green while only the signed-token positive case redded. |
| AUTH-02 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `test/auth/access-jwt.workerd.test.ts` → *"verifyAccessJwt denies when the Access configuration is empty (AUTH-02)"*: an otherwise valid token is denied with `teamDomain` empty and again with `aud` empty; a JWKS-endpoint failure **denies rather than permits**. `astro.config.mjs`'s `validateSecrets: true` closes the configuration half. The single strongest artefact is 02-10: with the Cloudflare Access application **disabled for one second**, all five request shapes returned **exactly 401** from the Worker's own code, 24-byte bodies, each checked individually for the team domain, the AUD, the word `cookie` and `/api/health`'s `r2` key. That is the one observation the legacy cookie-presence fallback would have failed. |
| AUTH-03 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | `wrangler.jsonc` `assets.run_worker_first: ["/admin", "/admin/*", "/api/*", "/_actions/*"]` — written as two explicit `/admin` entries rather than one wildcard, because an unmatched Cloudflare pattern **fails open silently**. `npm run gate:routes` asserts both halves and is what 02-06 planted against. |
| AUTH-04 | Phase 2. Astro Foundation & Fail-Closed Auth | Complete | The workerd Vitest project is real `workerd`, and that was **measured rather than configured-and-hoped**: 02-05 re-ran the same three assertions verbatim in Node and got `undefined`, `undefined` and `Node.js/22`. `test/auth/access-jwt.workerd.test.ts` runs there; `test/auth/deny-unauthenticated.node.test.ts` runs HTTP against the built site served by real `workerd`. Both are in `npm test`, which CI and the deploy path each run. |
| CONT-01 | Phase 3. Content Layer & Image Origin | **Partial** | **Build-time enforcement MET.** `src/schemas/` holds five `astro/zod` per-file schemas plus a six-rule cross-file validator, and the `astro:config:done` integration in `astro.config.mjs` fires on `build`, `check` **and** `sync`. `npm run gate:schema` PASS — 44 files scanned under `src/`, 4 self-tested rules (RIVAL-ZOD-OBJECT, RIVAL-TYPE, HAND-ROLLED-VALIDATOR, SCHEMA-LOOSENED), all 5 schemas exported. **Write-time and admin-form-error enforcement DO NOT EXIST** — there is no write path until Phase 7, and 03-06 recorded OD-7 as `structural` precisely so a `validateContent` action nobody calls would not be written to satisfy a checklist. **Known blind spot, in the gate's own header:** `test/content/photo-enrichment.unit.test.ts:57` declares a rival `interface Photo` and `gate:schema` is blind to it, because the scan is `src/`-only. |
| CONT-02 | Phase 3. Content Layer & Image Origin | Complete | The `contentGate` hook in `astro.config.mjs` throws a stack-emptied, readable refusal naming the **file, the record by its own identifier, and the field**; `test/content/build-fails-loudly.node.test.ts` drives it. Verified independently by planting a cross-file violation: exit **1**, **no `dist/` emitted**, and the report reads `✖ [RI-1] data/portfolio_images.json → abstract-intothemist → category: category "archtecture" does not exist in data/site_config.json` with all six RI rules named as run. 03-08 also **disproved** the mechanism its own research prescribed — a module-scope `parse()` that nothing imports leaves the build green and emits `dist/`. |
| CONT-03 | Phase 3. Content Layer & Image Origin | **Partial** | **Storage boundary MET, structurally:** the stored grammar (`src/lib/bullets.ts`, 03-02) has no production emitting an angle bracket, and `src/schemas/resume.ts` carries two refinements — one refusing an HTML tag by name, one refusing anything outside the bold-only grammar that a tag predicate cannot see. **Render boundary MET:** `src/components/Bullets.tsx` emits React elements and text children, never an HTML string; `test/content/xss-boundaries.unit.test.ts` drives one payload through both boundaries with two non-overlapping assertions, so neither a pass-through nor an escape-everything renderer can be green. `npm run gate:sinks` PASS — 51 files, 5 self-tested rules (React raw HTML, Astro `set:html`, `innerHTML`, `insertAdjacentHTML`, `document.write`), 2 allowlisted entries both still matching and both prose. **Write boundary DOES NOT EXIST** — Phase 7. |
| CONT-04 | Phase 3. Content Layer & Image Origin | Complete | `npm run gate:origin` PASS: **219 in-scope files, 0 occurrences** of the legacy development origin, and **160 remote URLs across the manifest all starting `https://images.akhilsaxena.com/`** — every scanned and skipped root named by rule rather than left implicit. The cached half is 02-02's measurement, `cf-cache-status: HIT`. **Gate blind spot, disclosed in its own header:** an *untracked* file under `src/` escapes, because the scan is driven by `git ls-files` — it protects what will ship, not what is merely on disk. |
| CONT-05 | Phase 4. Photo Pipeline (Actions half) | Complete | Proven **by construction on live bytes**, second dispatch run `33158490277`, 2026-08-28. The hash in each URL is the first eight hex of the sha256 of the bytes that URL actually serves — verified for both the old (`ff17a846…`, 811,298 B) and the new (`1de8c65e…`, 815,082 B) object — so a re-upload does not reuse the address, the old object is **orphaned and still intact rather than overwritten**, and a purge is impossible to need. Both carry `cache-control: public, max-age=31536000, immutable`; two consecutive **GET**s (never HEAD — HEAD returns `DYNAMIC` with no `cache-control`) return `cf-cache-status: HIT`. `test/pipeline/versioned-key.unit.test.ts` holds the unit half. Today 1 of 40 records carries content-hashed keys — the only one this pipeline produced; the other 39 are migrated legacy keys, and re-uploading any of them goes through the same pipeline and gets a new address. |
| PUB-01 | Phase 5. Public Site | Complete | `test/public/home.node.test.ts` asserts the scroll prompt is a real `<a href="#work">` with a real target (not a `div` calling `scrollIntoView`), three named landmarks, and no positive `tabindex`. Measured in a browser at all six device classes, twice: `05-AUDIT.md` §2 — state A **fills 6/6** and one viewport of scroll **departs 6/6**, in both motion settings; §4 — Act 2 fits the binding 841 × 768 case with the résumé heading's bottom at 696 against a 768 viewport, **72px of clearance** where the reviewed capture had it cut off. |
| PUB-02 | Phase 5. Public Site | Complete | `test/public/work.node.test.ts` against the served bytes: one card per project in `data/projects.json` order with the count **spelled from the data and never typed** (5 today — cairn, hued, momentum, timeshift, design-system), one row per experience entry with the period from `formatPeriod` (3 today — Brevo, PharmEasy, MAQ Software), each metric value and label inside the row it belongs to, every stored tech chip inside its own card, and every outbound anchor opened safely with the target change announced. |
| PUB-03 | Phase 5. Public Site | Complete | `test/public/photos-routes.node.test.ts` derives the expected set from the manifest at check time — no literal — and asserts one `a.ph-tile` per record on `/photos` and on each of the 7 category routes. `src/pages/photos/index.astro` computes `total` from `getCollection('photos').length` and **refuses to render on an empty collection** rather than showing an honest-looking zero. `npm run gate:public-js` counted **43 zero-JS + 8 hydrating + 1 404 = 52** documents; there is no pagination control anywhere in the built artefact. |
| PUB-04 | Phase 5. Public Site | Complete | Seven prerendered `/photos/[category]/` documents exist in `dist/client` and all seven are in the sitemap and answer 200 (`test/public/seo.node.test.ts`). `src/components/public/PhotoFilters.tsx` carries **no `client:*` directive**, so it renders to static HTML — its own header records why the `.tsx` wrapper exists at all (a `ReactNode` inside an array prop cannot be reached by an Astro slot) and that there is no state, no effect and no handler in it. `test/public/photos-routes.node.test.ts` asserts **exactly one** `aria-current="page"` pill per route — equality, because zero and two are both real failure modes — and that no synthetic `/photos/all` route was invented. |
| PUB-05 | Phase 5. Public Site | Complete | `test/public/photos-routes.node.test.ts`, on every tile of every gallery route: an `aspect-ratio: w / h` reserved from the stored `dimensions`, **and** `background-image: url('data:image/webp;base64,` — the existing LQIP. `width`/`height` attributes are asserted **absent** (0 of n), because `dimensions` is the source photograph's size and not the served variant's. The outcome is measured rather than argued: Lighthouse **CLS 0.000** on `/photos` and on the category route at both form factors (`05-AUDIT.md` §20). |
| PUB-06 | Phase 5. Public Site | Complete | All three dismissals, and the third only became true in `2.0.0-beta.2`. **Keyboard:** closed by 05-12 against the shipped chunk (Escape, plus Arrow navigation). **Backdrop:** measured by 05-12. **Swipe:** `05-AUDIT.md` §8a, driven at 390 × 844 coarse on the built artefact with a real 12-step pointer track — a **350px downward swipe dismisses** (backdrop present before, absent after) while a **180px leftward swipe still navigates** (`intothemist-lg.webp` → `lightscameraart-lg.webp`, overlay still open). Both branches asserted in the same run, because a dismiss branch that swallowed horizontal swipes would trade one half of this row for the other. `.ds-atom-lightbox-backdrop` computes `touch-action: pinch-zoom` at 344, 390 and 1440. The CSS half was consumer-unfixable, which is why `PhotoLightbox.tsx` filed D-16 upstream instead of building a local gesture layer. **The `partial` disposition this row carried is retired.** |
| PUB-07 | Phase 5. Public Site | Complete | `test/public/exif-display.unit.test.ts` — 30+ assertions over the **real** manifest: `exifRows` returns `[]` for an all-null record so the caller renders no block at all (`product-peppers`), exactly one row labelled Camera for `architecture-redbuilding`, **never a placeholder anywhere in the corpus**, and exactly as many rows as the record has non-null fields **for every record**. `npm run gate:exif` re-derives every count from `data/portfolio_images.json` and writes none of them into itself. The lightbox half is `test/public/lightbox.node.test.ts`: a record with empty `exifRows` and no `place` gets **no caption at all**. |
| PUB-08 | Phase 5. Public Site | Complete | `src/lib/exif-display.ts` holds two frozen lookup tables — 5 camera entries, 4 lens entries — and `npm run gate:exif` proves both directions: every distinct non-null value in the corpus is covered (31 × `NIKON CORPORATION NIKON D5300`, 18 × `18.0-55.0 mm f/3.5-5.6`, …) **and** no table entry is dead, because a dead entry is an unchecked claim. An unknown string **throws by name** rather than falling through to the raw code, and the lookup refuses a case variant, a trailing space and an `Object.prototype` member. `test/public/photo-detail.node.test.ts` then asserts the served pages ship **no raw camera or lens string anywhere**. |
| PUB-09 | Phase 5. Public Site | Complete | `test/public/photo-detail.node.test.ts` → *"every photograph has its own prerendered page (PUB-09)"*: 200 with exactly one `<h1>` that is never the alt text, previous/next as real anchors that wrap inside the category and return to the start after exactly as many steps as the category is long, and the social card pointing at the **large** variant. The join is proven by **fetching**, not by comparing two derivations: every href every built tile carries answers 200. 40 photo routes, all in the 51-URL sitemap, all fetched 200 (05-13). |
| PUB-10 | Phase 5. Public Site | Complete | `test/public/resume.node.test.ts` against the served page, every count **derived** from `data/resume.json` with an anti-vacuity refusal first: all 15 stored bullets (13 experience + 2 education `leadership`) character for character, bold runs as `<strong>` elements with the count derived and no `**` surviving, the one literal ampersand encoded exactly once, every skill in every group, one metric band per experience entry with both halves derived — and *"offers the maintained PDF, and the origin actually serves it"*. |
| PUB-11 | Phase 5. Public Site | Complete | Measured in a real browser, not asserted from CSS (05-10, five observations): page count **2** (`/Count 2` in the PDF), the field is **light** after `beforeprint` (`rgb(250, 250, 251)` on `rgb(17, 17, 20)`, from `rgb(13, 13, 15)` on `rgb(242, 242, 244)` before), **15 of 15** bullets present with a client rect in print media, and **4 of 4** external URLs printed after their link text via resolved `::after` content. Re-confirmed independently in `05-AUDIT.md` §18a. The print block is asserted to restate **no** design-system colour token, with four controls including one that refuses vacuously when the block is absent. **Disclosed residual:** a headless path that switches media type *without* firing `beforeprint` renders the résumé on `#0d0d0f`; a human pressing ⌘P fires it. |
| PUB-12 | Phase 5. Public Site | Complete | `05-AUDIT.md` §18a step 6, sampled on the first `readystatechange` from a script injected before any page script — the earliest observation available from inside the page: first visit with OS dark → `className = "dark"`; toggle → `""` and `localStorage.theme = "light"`; **reload, earliest sample at 12.4 ms → `className` never `"dark"`**, body background `rgb(250, 250, 251)`; toggle again → `"dark"`. The stored preference wins from the first frame. `test/public/shell.unit.test.ts` pins the mechanism: exactly one `<script>` in the layout, `is:inline`, under 40 lines, and it is the theme script and nothing else. |
| PUB-13 | Phase 5. Public Site | Complete | Suppression confirmed **by computed style in a browser, not by a grep**: `05-AUDIT.md` §2 ran the whole six-class suite twice, and `loadY` is 0 of 48 under `reduce`. `test/public/home.node.test.ts` asserts every snap declaration sits inside `prefers-reduced-motion: no-preference`; `test/public/shell.unit.test.ts` asserts scroll-behaviour is inside that query and never the reverse. `src/styles/work.css` carries a load-bearing `reduce` reset at (0,4,0) for the card hover, because the design system declared that transition outside any motion query (D-14). **Weaker link, disclosed:** the lightbox island's own `animation: lightboxFade 0.2s` is neutralised by the design system's system-wide guard at `primitives.css:7453`, which is *read* rather than measured in a browser — see the audit report. |
| PUB-14 | Phase 5. Public Site | Complete | `npm run gate:public-js`, run on this artefact: **43 zero-JS + 8 hydrating + 1 404 = 52** documents; every zero-JS route asserted to reach **0 B** of reachable chunk bytes rather than sampled; `<script type="module">` across the whole artefact **0**; build mode **PRODUCTION** (2 chunks carry React's production error-code form, 0 carry a development message). Raw bytes on disk: **app 17,489 / 19,000 · vendor 191,717 / 200,000 · total 209,206 / 240,000**, with `app + vendor === total` asserted rather than assumed. The four zero-JS route families are `/`, `/work`, `/resume` and the 40 photo detail pages; the one that hydrates is the gallery, and its single island is `PhotoLightbox`. 05-14 planted a `client:load`, watched the gate red, removed it and confirmed the file was SHA-256-identical. |
| CASE-01 | Phase 6. Case Studies | Pending | Phase 6 has not run and is deliberately after cutover — it is the only content needing Akhil to write prose, so it must not gate going live. The drafts exist (`00-COPY/`, five studies, twelve decisions each naming the option not taken); no `/work/{id}` route is built. At launch every project card links straight out. |
| CASE-02 | Phase 6. Case Studies | Pending | Phase 6 has not run. `src/content.config.ts` exists but declares no case-study collection. |
| CASE-03 | Phase 6. Case Studies | Pending | Phase 6 has not run. The design-system draft exists at `00-COPY/case-design-system.md` (00-05, 202 lines); the flagship judgement is Phase 6's. |
| PIPE-01 | Phase 4. Photo Pipeline (Actions half) | Complete | Live run `33148622707` → commit `e43ad79`: a staged R2 upload became four watermarked WebP variants at 2000/1200/800/400 (never enlarged) plus an LQIP, EXIF read from the original, and a schema-valid 40th record on real `main`. Unit halves: `test/pipeline/variants.unit.test.ts` and `test/pipeline/exif.unit.test.ts`, behind three byte-deterministic fixtures with a hand-declared expectation table (`test/pipeline/fixtures/`, including one file with **no** EXIF and one already ≤400px). |
| PIPE-02 | Phase 4. Photo Pipeline (Actions half) | Complete | Drivable from the command line with **zero admin UI in existence** — that is the whole point of the phase's placement. `scripts/stage-photo.mjs` stages (composing its key from the imported `STAGING_PREFIX` rather than a second copy), then `gh workflow run process-photos.yml`. `test/pipeline/workflow-contract.unit.test.ts` parses the workflow YAML so the dispatch inputs cannot drift from `scripts/lib/dispatch-input.mjs`. Two live runs, `33148622707` and `33158490277`. |
| PIPE-03 | Phase 4. Photo Pipeline (Actions half) | Complete | `test/pipeline/idempotence.unit.test.ts` — upsert keyed on `id`, exit 0, no duplicate. Confirmed on live data by the second dispatch: the manifest still holds **40** records, not 41, because the id is a pure function of (category, name, format). 03-04's warning was heeded — the idempotence gate measures the **re-run**, not the commit; the earlier form read the additions the merge had just made and reported `FAIL: not idempotent` on correct code. |
| PIPE-04 | Phase 4. Photo Pipeline (Actions half) | Complete | **Consistency:** `test/pipeline/partial-failure.node.test.ts` runs seven cases in a git sandbox, each with its own exit code and its own put/delete census — partial upload `exit=6`, liveness failure `exit=7`, publish conflict `exit=8`, lost CAS `exit=9`, delete failure `exit=0` with the tip moved — so a failure between derive and upload leaves the manifest byte-identical. `scripts/verify-photo-urls.mjs` refuses module load if its frozen HEAD/GET mode table is violated, because a GET cannot distinguish "the object exists" from "the object was cached before the upload failed". **Expiry:** `scripts/assert-staging-lifecycle.mjs` asserts prefix byte-equality **and** enabled **and** a real expiry action **and** TTL agreement — four assertions, three plants — rather than asserting a deletion R2 takes ~24 h to perform. |
| PIPE-05 | Phase 4. Photo Pipeline (Actions half) | **Partial** | **The pipeline's half is MET and proven:** `test/pipeline/concurrent-push.node.test.ts` — a pipeline push that loses a race to a human fetches, throws its own commit away, re-derives against the winner and retries, so a foreign commit to `data/portfolio_images.json` survives. **The admin's half does not exist.** Plan 04-06 **deliberately did not tick this row** and wrote the obligation down instead: `04-CONCURRENCY-CONTRACT.md` (`status: one side shipped (pipeline), one side owed (Phase 7 admin)`) specifies the per-file blob-SHA contract Phase 7 must honour, records that the legacy admin sent `baseSha: "latest"` and bypassed the guard entirely, and names two gaps that remain after Phase 4 — admin ↔ pipeline untested end to end, and admin ↔ admin not covered at all. **Note:** ROADMAP criterion 4 for Phase 4 is met (pipeline vs a manual git edit); this requirement is broader than that criterion. |
| ADMIN-01 | Phase 7. Admin CMS | Pending | Phase 7 has not run. `src/pages/admin/index.astro` is the auth-gated placeholder route Phase 2 needed in order to have something to protect; there is no editor. |
| ADMIN-02 | Phase 7. Admin CMS | Pending | Phase 7 has not run. |
| ADMIN-03 | Phase 7. Admin CMS | Pending | Phase 7 has not run. |
| ADMIN-04 | Phase 7. Admin CMS | Pending | Phase 7 has not run. The contract it must satisfy is already written and inherited from Phase 4: `04-CONCURRENCY-CONTRACT.md` §2. |
| ADMIN-05 | Phase 7. Admin CMS | Pending | Phase 7 has not run. |
| ADMIN-06 | Phase 7. Admin CMS | Pending | Phase 7 has not run. |
| ADMIN-07 | Phase 7. Admin CMS | Pending | Phase 7 has not run. The job it must drive exists and is proven from the command line (PIPE-01/02). |
| ADMIN-08 | Phase 7. Admin CMS | Pending | Phase 7 has not run. `focalPoint` is in the schema as `.optional()` with **no** zod `.default()`, specifically so an admin that parses a record and commits the parse output cannot materialise the field on every record the first time anything is saved (03-06). |
| ADMIN-09 | Phase 7. Admin CMS | Pending | Phase 7 has not run. |
| ADMIN-10 | Phase 7. Admin CMS | Pending | Phase 7 has not run. |
| SEO-01 | Phase 5. Public Site | Complete | `test/public/seo.node.test.ts` audits **every** public HTML document in `dist/client` and asserts it audited no fewer: the full tag set on each, each non-empty; canonical and `og:url` absolute, on the site origin and **identical to each other**; `twitter:card` `summary_large_image` everywhere; every `og:image` absolute on the **image** origin (the plan had this wrong); each photo detail page carrying its own photograph at the large variant. Proven by fetching: **every canonical resolves 200 and lands on the page that declares it**, and every sitemap URL is exactly the canonical of the page it names — 51/51, both directions. |
| SEO-02 | Phase 5. Public Site | Complete | `/resume` carries `Person` as **microdata** (OQ-2), asserted in `test/public/resume.node.test.ts`: itemscope with name, jobTitle, worksFor and url; one `sameAs` per profile link and one email per mail link, **both counts derived**; every microdata attribute in canonical lower case; and **no JSON-LD by any mechanism**. Validated externally by POSTing the built `dist/client/resume/index.html` to `validator.schema.org`: **one Person, six properties, a nested Organization (`Brevo (Formerly Sendinblue)`), 0 errors, 0 warnings.** Google's Rich Results Test was not used and 05-10 says why — it takes a public URL and the live site is down until cutover. |
| SEO-03 | Phase 5. Public Site | Complete | `dist/client/sitemap-0.xml` holds **51** `<loc>` entries. Not one count in the suite is a literal: the census is derived three ways, each from its own source and each preceded by a refusal that fires if its source is empty — 4 fixed routes **walked** from `src/pages/` (skipping dynamic segments, `404.astro` and anything carrying `prerender = false`), 7 categories from `site_config.json`, 40 photo routes via `photoHref`. Both joins check both directions with no residue, and **all 51 were fetched verbatim from real `workerd` with `redirect: 'manual'` — 51 × 200, zero redirects**. 🔴 The unfiltered build was advertising `https://akhilsaxena.com/admin/`, the Access-gated CMS, to every crawler; the filter is in `astro.config.mjs` and the 404's absence is proven by **planting** a 404 entry rather than by removing a filter that never did the work. |
| SEO-04 | Phase 8. Harden & Cut Over | Pending | Cannot be Complete now: it is deployment work. `akhilsaxena.com` has **no DNS record at all** — not an `A`, not a `CNAME`; `curl` cannot resolve it (02-10 finding 1, which falsified that plan's own premise that the apex was still on legacy Pages). There is no apex for `pages.dev` to 301 to yet. |
| SEO-05 | Phase 5. Public Site | Complete | `public/_redirects` carries **two literal rules, no wildcard, no capture** — `/portfolio/*  /photos/:splat` is the construct that turns a redirects file into an open redirect, and the legacy branch has no sub-paths anyway (measured with `git ls-tree` on `legacy/nextjs-portfolio`). The second rule is a measurement, not symmetry: with only the unslashed rule, `GET /portfolio/` returned **404** against real `workerd`. `test/public/seo.node.test.ts` asserts the file reached `dist/client` **byte-for-byte** — the only check that notices the adapter silently appending a second, unreviewed set of rules — and follows the redirect to a 200 gallery. A real **301 with a 0-byte body**, both forms, query strings carried across. |
| SEO-06 | Phase 8. Harden & Cut Over | Pending | Deployment work — hostname, certificates, DNS. The Worker serves `preview.akhilsaxena.com` today; the apex is deliberately **not** attached in `wrangler.jsonc` ("Cutover owns it"). 🔴 **Phase 8 must not cut over with the `private/*-clean.webp` master exposure open** — see STATE.md Blockers: all 39 unwatermarked masters verified publicly downloadable 2026-08-26, 39/39 HTTP 200 `image/webp`. |
| QUAL-01 | Phase 8. Harden & Cut Over | Pending | **Not Complete on either clause, and the gap is now measured rather than guessed.** `05-AUDIT.md` §20, Lighthouse 13.4.1, median of three runs, six route families × two form factors: **accessibility, best-practices and SEO are 100 in all 48 cells** and desktop performance is 99–100 on all six. **Mobile performance misses 95 on three routes** — `/photos` **87**, `/photos/architecture` **93**, `/photos/architecture/hawamahaldaytime` **94** — all three the photo routes, all three **LCP alone** (TBT 0 ms, CLS 0.000, Speed Index perfect; the deficit is 13.7 points and 13.7 of them are LCP). Cause named by Lighthouse, not inferred: the LCP element is the 24th tile, `loading="lazy"`, because §7.5's "first four" is a DOM-order rule and the masonry is a column-order layout. Second clause: **not enforced in CI**, deliberately — `audit:public` and `audit:lighthouse` are not chained into `npm test` or `npm run build`, because a browser measurement is deterministic per *machine*, not per platform. Phase 8 owns both the deployed-origin run and the decision about what becomes a standing gate. |
| QUAL-02 | Phase 8. Harden & Cut Over | **Partial** | **Auth boundary MET** — `test/auth/access-jwt.workerd.test.ts` (real workerd) and `test/auth/deny-unauthenticated.node.test.ts` (real HTTP), with a discriminating control. **Photo pipeline MET** — 19 files under `test/pipeline/`, including seven-case partial-failure and concurrent-push sandboxes. **Publish path PARTIAL** — the pipeline's git publish path is covered (`scripts/lib/git-publish.mjs` via `concurrent-push` and `partial-failure`); the **admin** publish path does not exist until Phase 7 and is therefore untested by definition. |
| QUAL-03 | Phase 8. Harden & Cut Over | Pending | Phase 8 owns the judgement and no gate asserts it. What exists is strong supporting evidence, not the verdict: `05-DS-FINDINGS.md` records **zero `!important` in `src/styles/`** (the token occurs three times under `src/` and all three are prose explaining why it was not used), no component re-implemented or forked, and no local copy of a design-system token value. `npm run gate:ds` PASS enforces the import contract across 111 files. Individual layout allowances were reasoned in place (05-07, 05-09), but "confined to layout" has never been measured across the whole stylesheet set. |
| QUAL-04 | Phase 8. Harden & Cut Over | Pending | A cross-cutting review pass over Phases 5–7 output; Phase 7 has not run, so it cannot be taken. The inputs are ready: 42 committed captures at six device classes (`05-X-*`), `05-AUDIT.md`'s 156-assertion six-class run, and a hand-off section (§15) naming exactly what Phase 8 should take and what it should not turn into a gate. |

**Coverage:**
- v1 requirements: **76** total *(the "73" this line carried was written before DS-10, DS-11 and DS-12 were added with Phase 06.1; ROADMAP.md's Requirement Coverage table still says 73 in three places and omits the DS-10…12 row.)*
- Mapped to phases: 76 ✓
- Unmapped: 0

**Status roll-up, 2026-08-29:**

| | Complete | Partial | Pending | Total |
|---|---:|---:|---:|---:|
| Phase 0 · Design & Ideation | 6 | 0 | 0 | 6 |
| Phase 1 · Design System — Monochrome (cross-repo) | 7 | 2 | 0 | 9 |
| Phase 06.1 · Cascade Layers & Density (cross-repo) | 0 | 0 | 3 | 3 |
| Phase 2 · Astro Foundation & Fail-Closed Auth | 11 | 0 | 0 | 11 |
| Phase 3 · Content Layer & Image Origin | 2 | 2 | 0 | 4 |
| Phase 4 · Photo Pipeline (Actions half) | 5 | 1 | 0 | 6 |
| Phase 5 · Public Site | 18 | 0 | 0 | 18 |
| Phase 6 · Case Studies | 0 | 0 | 3 | 3 |
| Phase 7 · Admin CMS | 0 | 0 | 10 | 10 |
| Phase 8 · Harden & Cut Over | 0 | 1 | 5 | 6 |
| **Total** | **49** | **6** | **21** | **76** |

**The six Partials are the ones worth reading before Phase 8's go/no-go**, because each is a
row that looks done from a distance:

1. **DS-02** — muted text at AAA holds; "every accent-as-text usage passes AA" is false at 3.11.
2. **DS-03** — both tokens exist; `--ochre-d` is no longer the focus-ring token. Both DS rows
   still describe the retired ochre identity and need **re-stating by a human**, not ticking.
3. **CONT-01** — one schema module, enforced at build time. Write time and admin form errors do
   not exist until Phase 7.
4. **CONT-03** — storage and render boundaries closed. The write boundary is Phase 7.
5. **PIPE-05** — the pipeline defends itself against a human; the admin half is owed and specified.
6. **QUAL-02** — two of three boundaries under test; the admin publish path is the third.

*Phase 1 executes cross-repo in `../design-system`. Phases 1 and 2 are parallel
(different repositories); Phase 4 is parallel with Phases 5–6.*

---
*Requirements defined: 2026-08-16*
*Traceability audited against delivered work: 2026-08-29, at `d73d23f`*
