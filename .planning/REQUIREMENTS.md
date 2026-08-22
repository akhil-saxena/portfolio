# Requirements: akhilsaxena.com — Portfolio Rebuild

**Defined:** 2026-08-16
**Core Value:** The site must be the proof that the design system works. Where a tradeoff arises between shipping something bespoke and shipping it out of the design system, the design system wins, and any gap it exposes is a finding to upstream rather than a workaround.

## v1 Requirements

### Design (Phase 0 — ideation and wireframing only, no implementation)

- [ ] **DSGN-01**: Admin CMS has a wireframed information architecture and screen design — no design exists for it today
- [ ] **DSGN-02**: Project case-study pages have a wireframed template — no design exists for them today
- [ ] **DSGN-03**: Work and Photos designs are resolved onto the dark palette (the handoff prototypes are an earlier ivory iteration)
- [ ] **DSGN-04**: Throwaway sketches are built against the real `@akhil-saxena/design-system` package, not hand-written HTML, so the charcoal theme is validated against actual components before the design system release is cut
- [ ] **DSGN-05**: The charcoal theme's public API is decided — how it scopes, how it composes with `:root.dark`, and how fonts are delivered
- [ ] **DSGN-06**: First-pass copy exists for the five project one-liners and the case studies, drafted for Akhil to edit, so build phases work against real text lengths

### Design System — cross-repo, delivered from `../design-system`

- [ ] **DS-01**: A charcoal brand theme exists as a third scope alongside `:root` and `:root.dark`, specificity-safe so it cannot lose to `:root.dark` on source order
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
-->

- [ ] **DS-04**: Font delivery is split out of `tokens.css` so consuming a theme does not force four unrelated font families
- [ ] **DS-05**: The charcoal theme ships Playfair Display, DM Sans and IBM Plex Mono faces, so redefining `--font-serif` cannot silently fall back to Georgia
- [ ] **DS-06**: `tokens.test.ts` covers the new theme's contrast contract, so a regression fails CI
- [ ] **DS-07**: `Lightbox` supports backdrop-click close, `srcset`, swipe, and `aria-live` slide announcements
- [ ] **DS-08**: The theme is published to npm and consumable by version number
- [ ] **DS-09**: Public-page components can be imported without pulling TipTap, ProseMirror or dnd-kit into the bundle — by tree-shaking if it already works, by per-component JS exports if it does not

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

- [ ] **FND-01**: An Astro 7 + React 19 app builds and deploys to Cloudflare Workers with Static Assets
- [ ] **FND-02**: Public routes are prerendered static; `/admin`, `/api/*` and `/_actions/*` render on demand
- [ ] **FND-03**: R2 bindings resolve from `cloudflare:workers` in both local dev and production, with no absence-guard masking a real failure
- [ ] **FND-04**: Missing secrets fail the build rather than degrading at runtime
- [ ] **FND-05**: The design system is consumed as a packed tarball during development, and CI fails the build if the dependency spec is still a local path at ship time
- [ ] **FND-06**: CI runs lint, typecheck, build and tests on every push
- [ ] **FND-07**: `akhilsaxena.com` nameservers are confirmed Cloudflare-managed and an R2 custom domain is provisioned — both long-lead items resolved early rather than at cutover

### Authentication — lands in the foundation phase, before any admin route exists

- [ ] **AUTH-01**: Requests to `/admin`, `/api/*` and `/_actions/*` without a valid Cloudflare Access JWT are denied
- [ ] **AUTH-02**: Missing Access configuration denies access — there is no cookie-presence fallback and no path that degrades to permissive
- [ ] **AUTH-03**: No API or admin route can be served as a prerendered static file, enforced by `run_worker_first` and a build assertion that `dist/api/` does not exist
- [ ] **AUTH-04**: An automated test asserts unauthenticated requests are rejected, run against a real workerd runtime rather than a mock

### Content Layer

- [ ] **CONT-01**: One shared schema module validates photos, résumé, home config and site config, and is enforced at build time, at write time, and in admin form errors
- [ ] **CONT-02**: A malformed content commit fails the build loudly instead of shipping
- [ ] **CONT-03**: Résumé bullet HTML is allowlist-sanitized at both the write boundary and the render boundary
- [ ] **CONT-04**: All 39 photo URLs are migrated off `pub-*.r2.dev` onto a cached R2 custom domain
- [ ] **CONT-05**: Photo keys or cache handling ensure a re-uploaded photo does not serve stale forever

### Public Site

- [ ] **PUB-01**: Home presents two acts — identity and photo grid filling the first viewport, work below
- [ ] **PUB-02**: Work lists the five projects and the Brevo engineering strip
- [ ] **PUB-03**: Photos shows all 39 images in a masonry gallery with no pagination
- [ ] **PUB-04**: Category filtering works as prerendered `/photos/[category]` routes with real links — crawlable, Back-button-capable, zero JavaScript
- [ ] **PUB-05**: Images reserve space from existing `dimensions` data and blur up from the existing base64 placeholders, so the gallery does not shift as it loads
- [ ] **PUB-06**: Clicking a photo opens a lightbox with keyboard, backdrop and swipe dismissal
- [ ] **PUB-07**: The lightbox shows EXIF, omitting absent fields entirely rather than rendering a placeholder — 11 of 39 photos have at least one null field
- [ ] **PUB-08**: Camera and lens strings display as human names, not raw model codes like `NIKON CORPORATION NIKON D5300`
- [ ] **PUB-09**: Each photo has its own prerendered page with a social card
- [ ] **PUB-10**: Résumé renders from structured data and offers the maintained PDF
- [ ] **PUB-11**: The résumé prints legibly
- [ ] **PUB-12**: Visitors can switch between dark and light, the choice persists, and there is no flash of the wrong theme on first paint
- [ ] **PUB-13**: Motion is suppressed under `prefers-reduced-motion`
- [ ] **PUB-14**: Four of the five public routes ship zero framework JavaScript

### Case Studies

- [ ] **CASE-01**: Each project has a case-study page structured as problem, decisions and outcome — including alternatives rejected, not only what was chosen
- [ ] **CASE-02**: Case studies are authored as Markdown in a content collection
- [ ] **CASE-03**: The design system case study exists and carries genuine depth, as the flagship project

### Photo Pipeline

- [ ] **PIPE-01**: A photo uploaded to R2 staging is resized, has its EXIF read, and is committed with an updated manifest
- [ ] **PIPE-02**: The pipeline is drivable end-to-end from the command line before any admin UI exists
- [ ] **PIPE-03**: Re-running a job for the same upload does not duplicate entries
- [ ] **PIPE-04**: A partial failure does not leave the manifest inconsistent with the bucket, and staged objects expire rather than accumulating
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

- [ ] **SEO-01**: Every page has canonical URL, Open Graph and Twitter card metadata
- [ ] **SEO-02**: The résumé page carries `Person` structured data
- [ ] **SEO-03**: A sitemap is generated
- [ ] **SEO-04**: `akhilsaxena.pages.dev` 301s to the apex — the production hostname is already indexed and carries no automatic noindex
- [ ] **SEO-05**: The legacy `/portfolio` path 301s to `/photos`
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
| Gallery pagination or infinite scroll | Measured: all 39 photos at `small` total 0.9 MB. The handoff's "SHOWING 8 OF 39" is unjustified complexity |
| Generating the résumé PDF from data | The PDF stays hand-maintained; automating it has no reader-visible payoff |
| Inline WYSIWYG admin | Form editors have fewer moving parts, and design-system inputs already carry the accessibility work |
| Photo `tags` field | Present in the schema, unused by all 39 photos |
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

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSGN-01 | Phase 0. Design & Ideation | Pending |
| DSGN-02 | Phase 0. Design & Ideation | Pending |
| DSGN-03 | Phase 0. Design & Ideation | Pending |
| DSGN-04 | Phase 0. Design & Ideation | Pending |
| DSGN-05 | Phase 0. Design & Ideation | Pending |
| DSGN-06 | Phase 0. Design & Ideation | Pending |
| DS-01 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-02 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-03 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-04 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-05 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-06 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-07 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-08 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-09 | Phase 1. Design System — Charcoal Theme (cross-repo) | Pending |
| DS-10 | Phase 06.1. Design System — Cascade Layers & Density Axis (cross-repo) | Pending |
| DS-11 | Phase 06.1. Design System — Cascade Layers & Density Axis (cross-repo) | Pending |
| DS-12 | Phase 06.1. Design System — Cascade Layers & Density Axis (cross-repo) | Pending |
| FND-01 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| FND-02 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| FND-03 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| FND-04 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| FND-05 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| FND-06 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| FND-07 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| AUTH-01 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| AUTH-02 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| AUTH-03 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| AUTH-04 | Phase 2. Astro Foundation & Fail-Closed Auth | Pending |
| CONT-01 | Phase 3. Content Layer & Image Origin | Pending |
| CONT-02 | Phase 3. Content Layer & Image Origin | Pending |
| CONT-03 | Phase 3. Content Layer & Image Origin | Pending |
| CONT-04 | Phase 3. Content Layer & Image Origin | Pending |
| CONT-05 | Phase 4. Photo Pipeline (Actions half) | Pending |
| PUB-01 | Phase 5. Public Site | Pending |
| PUB-02 | Phase 5. Public Site | Pending |
| PUB-03 | Phase 5. Public Site | Pending |
| PUB-04 | Phase 5. Public Site | Pending |
| PUB-05 | Phase 5. Public Site | Pending |
| PUB-06 | Phase 5. Public Site | Pending |
| PUB-07 | Phase 5. Public Site | Pending |
| PUB-08 | Phase 5. Public Site | Pending |
| PUB-09 | Phase 5. Public Site | Pending |
| PUB-10 | Phase 5. Public Site | Pending |
| PUB-11 | Phase 5. Public Site | Pending |
| PUB-12 | Phase 5. Public Site | Pending |
| PUB-13 | Phase 5. Public Site | Pending |
| PUB-14 | Phase 5. Public Site | Pending |
| CASE-01 | Phase 6. Case Studies | Pending |
| CASE-02 | Phase 6. Case Studies | Pending |
| CASE-03 | Phase 6. Case Studies | Pending |
| PIPE-01 | Phase 4. Photo Pipeline (Actions half) | Pending |
| PIPE-02 | Phase 4. Photo Pipeline (Actions half) | Pending |
| PIPE-03 | Phase 4. Photo Pipeline (Actions half) | Pending |
| PIPE-04 | Phase 4. Photo Pipeline (Actions half) | Pending |
| PIPE-05 | Phase 4. Photo Pipeline (Actions half) | Pending |
| ADMIN-01 | Phase 7. Admin CMS | Pending |
| ADMIN-02 | Phase 7. Admin CMS | Pending |
| ADMIN-03 | Phase 7. Admin CMS | Pending |
| ADMIN-04 | Phase 7. Admin CMS | Pending |
| ADMIN-05 | Phase 7. Admin CMS | Pending |
| ADMIN-06 | Phase 7. Admin CMS | Pending |
| ADMIN-07 | Phase 7. Admin CMS | Pending |
| ADMIN-08 | Phase 7. Admin CMS | Pending |
| ADMIN-09 | Phase 7. Admin CMS | Pending |
| ADMIN-10 | Phase 7. Admin CMS | Pending |
| SEO-01 | Phase 5. Public Site | Pending |
| SEO-02 | Phase 5. Public Site | Pending |
| SEO-03 | Phase 5. Public Site | Pending |
| SEO-04 | Phase 8. Harden & Cut Over | Pending |
| SEO-05 | Phase 5. Public Site | Pending |
| SEO-06 | Phase 8. Harden & Cut Over | Pending |
| QUAL-01 | Phase 8. Harden & Cut Over | Pending |
| QUAL-02 | Phase 8. Harden & Cut Over | Pending |
| QUAL-03 | Phase 8. Harden & Cut Over | Pending |
| QUAL-04 | Phase 8. Harden & Cut Over | Pending |

**Coverage:**
- v1 requirements: 73 total
- Mapped to phases: 73 ✓
- Unmapped: 0

*Phase 1 executes cross-repo in `../design-system`. Phases 1 and 2 are parallel
(different repositories); Phase 4 is parallel with Phases 5–6.*

---
*Requirements defined: 2026-08-16*
