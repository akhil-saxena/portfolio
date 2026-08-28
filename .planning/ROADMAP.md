# Roadmap: akhilsaxena.com — Portfolio Rebuild

## Overview

The site is being rebuilt from scratch on Astro 7 + React islands, deployed to Cloudflare
Workers with Static Assets, consuming Akhil's own published design system. The journey
runs: design the two screens nobody has designed yet (admin, case studies) and validate
the monochrome identity against real components → ship that identity as a published design
system release while, in parallel, standing up an Astro Worker whose auth already fails
closed → make all content schema-validated and move every image off the uncached
`r2.dev` origin → debug the riskiest integration (sharp + exifr + concurrent R2/git
writes) from the command line before any UI depends on it → build the public site at
Lighthouse-grade weight → write the case studies → build the admin behind the
already-proven auth gate → harden and cut over to the apex domain.

**Live-site status shaping the schedule.** `akhilsaxena.com` is *not* currently serving —
the domain sits on Cloudflare nameservers with no host records. `akhilsaxena.pages.dev`
is still serving the *old* site only because the purged `main` fails to build and
Cloudflare keeps the last successful deployment alive. So there is real schedule
pressure but no hard outage, and the first successful new deploy replaces the old site.
That is why long-lead cutover items (nameserver verification, R2 custom domain) are
front-loaded into Phase 2 rather than left to Phase 8.

## Phases

**Phase Numbering:**

- Integer phases (0, 1, 2, …): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 0: Design & Ideation** - Wireframe the admin and case studies, resolve Work/Photos onto dark, validate the monochrome identity against real components — no production code
- [x] **Phase 1: Design System — Monochrome Theme** ✅ **COMPLETE 2026-08-25** (`2.0.0-beta.1` on the `next` dist-tag, SLSA provenance) — - CROSS-REPO (`../design-system`): ship the identity as a contrast-safe, correctly-fonted, published npm release
- [x] **Phase 2: Astro Foundation & Fail-Closed Auth** ✅ **COMPLETE** (`preview.akhilsaxena.com` serving) — - A deployed Worker that denies every unauthenticated request before any admin surface exists

### Release 1 — the public site, live

**Ordered by decision 2026-08-22: the public site ships complete and live before any admin
work begins.** Phase numbers are unchanged so the many existing cross-references to "Phase 7"
and "Phase 06.1" keep resolving; only the execution order moved.

- [x] **Phase 3: Content Layer & Image Origin** ✅ **COMPLETE 2026-08-26** — - One schema module enforced everywhere, HTML sanitized structurally, all 39 photos off `r2.dev`. **Now also owns the `site_config` referential-integrity rule** (ADR-002) — every `photo.category` must exist in `site_config`'s ids, since there is no `/admin/site` screen to guard it
- [x] **Phase 4: Photo Pipeline (Actions half)** ✅ **COMPLETE 2026-08-28 — 10/10 plans, all five criteria met**, both proven on live runs. CONT-05 holds by construction: each URL carries the content hash of the bytes it serves, so a re-upload changes the address and the old object stays intact — - The riskiest integration, driven from the command line, with zero admin UI in existence
- [ ] **Phase 5: Public Site** - Home, Work, Photos and **Résumé** on the monochrome identity, four of five routes shipping zero framework JS. At launch the project cards link **straight out** — Cairn to `cairn.co.in`, hued and Momentum to Google Play, TimeShift to the Chrome Web Store, the design system to its Storybook — every href already present in `data/resume.json`
- [ ] **Phase 8: Harden & Cut Over** — **BLOCKING PREREQUISITE: close the `private/*-clean.webp` master exposure (see STATE.md Blockers; 39/39 verified reachable 2026-08-26, deferred here by Akhil). Do not serve the apex domain with this open.** — - 95+ enforced in CI, the boundaries that matter under test, and the apex domain serving. **★ THIS IS THE LIVE MILESTONE.** The accepted-downtime clock stops here

### Release 2 — depth, then the admin

- [ ] **Phase 6: Case Studies** - Each project told as problem → decisions → outcome, including what was rejected. One route per study (`/work/{id}`). **Deliberately after launch** — this is the only content that needs Akhil writing prose, so it must not gate going live
- [ ] **Phase 9: Host the Storybook at `/design-system`** (NEW) - Serve the design system's own Storybook from this domain. Distinct from `/work/design-system`, which is the case study *about* it: one is the artefact, the other is the argument. Adds the project's first deliberate cross-repo build coupling, which is why it lands after cutover rather than before
- [ ] **Phase 06.1: Design System — Cascade Layers & Density Axis** - CROSS-REPO (`../design-system`): declared layer order replaces specificity arithmetic, and a density axis lets the admin be compact without portfolio overrides. **Moved off the critical path** — the density axis and its remaining touch-target floors (Checkbox, InlineEdit, NumberStepper, IconButton) are all admin controls; plan 01-12 already fixed the public `AppBar` and `Footer`
- [ ] **Phase 7: Admin CMS** - Five routes (dashboard, photos, home, résumé, projects): edit records, upload, crop, reorder and publish from a browser, with concurrency caught and deploy status told truthfully. Case-study prose and site config stay JSON in git — see ADR-002


### Parallel Tracks

This is one developer. "Parallel" means **safe to interleave or reorder** — not
simultaneous. The value is knowing a stall in one track does not stall another.

| Track | Phases | Independence |
|-------|--------|--------------|
| Design | 0 | Pure design artefact. Zero code dependency. Blocks only Phases 6 and 7. |
| Design system | 1 → 06.1 → 9 | **Separate repo** (`../design-system`), separate releases. Zero shared code or build with Phase 2/3 — until Phase 9, which introduces the first deliberate coupling. Phase 06.1 needs Phase 1 shipped and must land before Phase 7; it is **no longer on the path to live**. |
| Platform | 2 → 3 | This repo. Blocks everything downstream — start immediately. |
| Pipeline | 4 | Unblocked the moment Phase 3 lands. Drivable with `gh workflow run`, no UI. Can absorb slack whenever Phase 5/6 stall on a design question. |
| Product | 5 → 8 → 6 → 9 → 7 | The serial spine. Needs Phases 1 + 3. **Cutover (8) now sits between the public site and the case studies**, so Release 1 is 3 → 4 → 5 → 8. |

**Phase 1 ∥ Phase 2 is the load-bearing parallelism.** Phase 1 is the project's declared
blocker and Phase 2 is the longest-lead-time item. Neither should wait on the other.

## Phase Details

### Phase 0: Design & Ideation

**Goal**: Every screen the build phases need has a design, and the monochrome identity is proven against real design-system components before the theme release is cut
**Depends on**: Nothing (first phase)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05, DSGN-06
**Success Criteria** (what must be TRUE):

  1. A reviewable wireframe set exists for the admin CMS — every screen, its information architecture, and its states — where no design existed before
  2. A case-study page template exists as a design, with the problem → decisions → outcome structure laid out against real drafted content rather than lorem ipsum
  3. Work and Photos are resolved onto the monochrome dark palette, replacing the handoff's earlier ivory iteration
  4. Throwaway sketches render real `@akhil-saxena/design-system` components under the monochrome palette, and every gap they expose is written down as a design-system finding to fix upstream
  5. The monochrome theme's public API is decided in writing — scope selector, composition with `:root.dark`, font delivery — and first-pass copy exists for the five project one-liners and the case studies, drafted for Akhil to edit

**Plans**: 25 plans across 19 waves (8 gap-closure plans added for the public/admin rework)

Plans:
**Wave 1**

- [x] 00-01-PLAN.md — Scaffold the throwaway Astro playground, prove the D-02 fence, measure DS-09 tree-shaking, seed the gap register
- [x] 00-02-PLAN.md — The copy-length checker and the five one-liners and card descriptions
- [x] 00-03-PLAN.md — The admin information architecture: route-per-entity, the recovered field catalog, the artefact inventory

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 00-04-PLAN.md — the Phase 0 prototype theme and font stylesheets in `theme-prototype/` (their filenames keep the pre-01-23 brand name), with the exhaustiveness, font-name and three-surface contrast gates
- [x] 00-05-PLAN.md — The two long-form case studies: the design system and Cairn
- [x] 00-06-PLAN.md — The three short-form case studies: TimeShift, hued and Momentum

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 00-07-PLAN.md — The cascade-order probe, the D-33 CSS manifests, and the proposed exports map proven against a stub package

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 00-08-PLAN.md — 00-THEME-API.md: the monochrome theme's public API decided in writing
- [x] 00-09-PLAN.md — Work and Photos resolved onto monochrome, Home Act 2 resolving OQ-1, and the contact sheet started

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 00-10-PLAN.md — The long-form and short-form case-study templates rendered against the real drafts

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 00-11-PLAN.md — Human review of the public monochrome surfaces and the case-study templates *(checkpoint)*

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 00-12-PLAN.md — The admin shell, the compact-density prototype, the artefact registry and the pending dashboard

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 00-13-PLAN.md — /admin/photos against all 39 real photos, and the Sortable reorder island

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 00-14-PLAN.md — /admin/home with the focal-point island, and /admin/resume with the RichText island

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 00-15-PLAN.md — /admin/projects, /admin/projects/[id], /admin/site, and the per-file conflict diff

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 00-16-PLAN.md — Publish, discard and error overlays, the four phone capabilities, and the generated 42-cell coverage table

**Wave 12** *(blocked on Wave 11 completion)*

- [ ] 00-17-PLAN.md — Screenshot the artefact record, six review passes, then delete .playground/ per D-02 *(checkpoint)*

---

**Gap closure — the public and admin rework.** Off-plan, by direct user direction: one page per
case at `/work/{id}`, a two-state Home landing, the six-class responsive contract, and photo
positioning in the real public layout with a focal point per photo. Not from a verifier; there
is no VERIFICATION.md. **00-11 and 00-17 stay OPEN and are re-run against the reworked
artefacts, not replaced.**

Every `.playground/`-touching plan runs on the MAIN working tree, sequentially — the directory
is gitignored by the D-02 fence and does not propagate into a worktree. Only waves 13 and 19
are doc-only.

**Wave 13** *(doc-only, safe to parallelise)*

- [x] 00-18-PLAN.md — Compress four case drafts to 500-700 words and normalise the `## Decisions` heading
- [x] 00-19-PLAN.md — The four new photo fields, `description`'s render location, and the 39-row alt-text content brief

**Wave 14** *(blocked on 00-18 — main tree)*

- [x] 00-20-PLAN.md — One tier, one route per case: `/work/{id}` x 5, the either-spelling loader, `case.css` 900 to 1024

**Wave 15** *(blocked on Wave 14 — main tree)*

- [x] 00-21-PLAN.md — The responsive public shell: gutter ladder, `100svh`, `/work`'s horizontal scroll, the Photos filter rail

**Wave 16** *(blocked on Wave 15 — main tree)*

- [x] 00-22-PLAN.md — Home's two-state landing: `X-home` state A and state B at six device classes

**Wave 17** *(blocked on Waves 13 and 16 — main tree)*

- [x] 00-23-PLAN.md — `/admin/photos` reorder in the real public masonry, with a focal point on all 39

**Wave 18** *(blocked on Wave 17 — main tree)*

- [x] 00-24-PLAN.md — Place, description, alt text and tags; the `alt={t.title}` fix; D-15-1 closed

**Wave 19** *(blocked on Wave 18 — doc-only)*

- [x] 00-25-PLAN.md — The six-class screenshot contract, plan 00-17's four stale literals, and the re-review brief

**UI hint**: yes

> **Scope guard — no implementation.** This phase produces design artefacts only. The one
> deliberate exception is DSGN-04: the sketches are *running code* that imports the real
> design system package, because that is the only way to validate the theme before the
> release is cut. They are throwaway. No production application code is written here.

### Phase 1: Design System — Monochrome Theme

**Goal**: The monochrome identity ships as a consumable, contrast-safe, correctly-fonted theme from a published version of `@akhil-saxena/design-system`
**Depends on**: Phase 0 (theme API decided in DSGN-05, gaps found in DSGN-04)
**Parallel with**: Phase 2 — different repository, no shared code or build
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05, DS-06, DS-07, DS-08, DS-09
**Success Criteria** (what must be TRUE):

  1. `npm install @akhil-saxena/design-system@<new version>` from the public registry yields a working monochrome theme consumable by version number, with no local path or tarball required
  2. Applying the monochrome scope alongside `:root.dark` produces monochrome in both light and dark, regardless of which stylesheet the bundler ordered first
  3. Light-mode muted text and the ochre accent pass WCAG AA for body text, a darkened ochre token exists for focus rings, and `tokens.test.ts` fails CI if either regresses
  4. A page consuming only the monochrome theme downloads Playfair Display, DM Sans and IBM Plex Mono — and does not download Inter, Archivo, JetBrains Mono or Newsreader
  5. `Lightbox` closes on backdrop click, accepts a `srcset`, responds to swipe, and announces slide changes to a screen reader; and a public island importing design-system components pulls in no TipTap, ProseMirror or dnd-kit

**Plans**: TBD
**UI hint**: yes

> **CROSS-REPO.** This entire phase executes in the sibling repository `../design-system`,
> not in this one. It ends with a published npm version (DS-08); nothing in this repo
> consumes it until that version exists. During Phase 5's development the portfolio may
> consume it as a packed tarball (`npm pack` → `file:*.tgz`, never a symlink), but the
> phase is not done until the registry version is live.

> **DS-09 is a measurement, then a decision.** Whether the 334 KB barrel tree-shakes
> TipTap/ProseMirror out of a public island is unmeasured. Measure it here using the
> Phase 0 sketches. If tree-shaking already works, DS-09 is satisfied by evidence. If it
> does not, the fix is per-component JS subpath exports in this repo — an upstream fix,
> never a local workaround in the portfolio. Phase 5 re-checks the result as a gate.

### Phase 2: Astro Foundation & Fail-Closed Auth

**Goal**: A deployed Cloudflare Worker serves prerendered public routes and denies every unauthenticated request to `/admin`, `/api/*` and `/_actions/*` — before any admin surface exists to protect
**Depends on**: Nothing (parallel with Phase 1)
**Parallel with**: Phase 1 — different repository, no shared code or build
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):

  1. A push to `main` deploys an Astro 7 + React 19 app to Cloudflare Workers with Static Assets, gated by CI running lint, typecheck, build and tests
  2. A request to `/admin`, `/api/*` or `/_actions/*` carrying no valid Cloudflare Access JWT is rejected — including when the Access configuration is entirely absent — proven by a test running against real workerd rather than a mock
  3. The build fails, loudly, if any API or admin route was prerendered into `dist/`, and fails if a required secret is unset — there is no path that degrades to permissive at runtime
  4. R2 bindings resolve from `cloudflare:workers` in both `astro dev` and production, with no absence-guard in the code path that could mask a genuinely broken binding
  5. `akhilsaxena.com` is confirmed on Cloudflare-managed nameservers, an R2 custom domain is provisioned and serving cached images, and CI fails the build if the design-system dependency spec still starts with `file:`

**Plans**: TBD

> **Auth lands here, not in Phase 7.** The moment `/admin` exists as a route in a deployed
> Worker it is a live attack surface. This is the single most important sequencing call in
> the roadmap, and it mirrors the exact failure mode found in the legacy app, where auth
> was to be "tightened later" via a comment nobody acted on.

> **FND-07 is here because of lead time, not because it feels like cutover work.**
> Nameserver propagation and R2 custom-domain provisioning are the longest-lead items in
> the project. Discovering a problem with either at cutover means redoing DNS, secrets and
> CI simultaneously under outage pressure.

### Phase 3: Content Layer & Image Origin

**Goal**: All site content is schema-validated from a single source of truth, unsanitized HTML cannot structurally reach a page, and no image is served from the uncached `r2.dev` origin
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04
**Success Criteria** (what must be TRUE):

  1. One schema module validates photos, résumé, home config and site config, and that same module is what the build, the write path and the admin's form errors all consume — validation cannot drift between them
  2. Committing a malformed `data/*.json` fails the build with a readable error instead of shipping a broken site
  3. A résumé bullet containing a script tag is stripped at both the write boundary and the render boundary, verified by a test — the legacy stored-XSS class is closed structurally, not by convention
  4. No `pub-*.r2.dev` URL remains anywhere in the repository, and a photo request returns `cf-cache-status: HIT` from the R2 custom domain

**Plans**: 8 plans across 5 waves. Seven open decisions are recorded in
[`03-CONTEXT.md`](phases/03-content-layer-image-origin/03-CONTEXT.md) and surfaced as blocking
checkpoints inside the plans that need them — five of them change data Akhil has already reviewed.

Plans:
- [ ] 03-01-PLAN.md — wave 1 · CONT-04: the 156-URL origin migration, the canonical-origin module, and the scoped `r2.dev` gate (OD-1)
- [ ] 03-02-PLAN.md — wave 1 · the bold-only bullet grammar, and the 13-bullet `<strong>` → markdown conversion
- [ ] 03-03-PLAN.md — wave 1 · D-25: `site_config` categories become `{id, label, columns}` records (OD-2)
- [ ] 03-04-PLAN.md — wave 2 · merge the 39 reviewed alt values and 16 place values; backfill D-22's per-category order (OD-5)
- [ ] 03-05-PLAN.md — wave 2 · D-24: split `projects.json` out; settle the date shape and the component figure (OD-4, OD-6)
- [ ] 03-06-PLAN.md — wave 3 · CONT-01: the one schema module, the cross-file referential-integrity rules, and the single-definition gate (OD-3, OD-7)
- [ ] 03-07-PLAN.md — wave 4 · CONT-03: the render boundary, and the ban on raw-HTML sinks
- [ ] 03-08-PLAN.md — wave 5 · CONT-02: build enforcement, readable errors, and the phase-wide gate wiring

> **CONT-04 is early on purpose.** Building the gallery against URLs that are about to
> change is rework, and the uncached, rate-limited `r2.dev` origin makes Lighthouse scores
> non-reproducible. This is a data migration of all 39 manifest entries, not a config
> tweak, and it must precede Phase 5.

### Phase 4: Photo Pipeline (Actions half)

**Goal**: A photo goes from an R2 staging object to resized variants, extracted EXIF and a committed manifest entry — driven entirely from the command line, with no admin UI in existence
**Depends on**: Phase 3
**Parallel with**: Phase 5 and Phase 6 — no UI dependency in either direction
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, CONT-05
**Success Criteria** (what must be TRUE):

  1. `gh workflow run process-photos.yml` against a staged upload produces resized variants in R2 and a schema-valid manifest entry committed to `main`, with EXIF read from the original
  2. Re-running the same job for the same upload adds no duplicate manifest entry
  3. A job that fails partway leaves the manifest consistent with the bucket, and staged `temp/` objects expire on their own rather than accumulating
  4. A pipeline commit and a concurrent manual edit to the same files cannot clobber each other — one retries or reports a conflict
  5. Re-uploading a photo serves the new bytes from the CDN without a manual cache purge

**Plans**: TBD

> **Why this precedes the public site.** The Actions half depends only on the Phase 3
> schemas and R2 credentials — not on any admin UI — and is fully drivable with
> `gh workflow run`. Sequencing it here takes the riskiest, least-familiar integration
> (sharp + exifr + concurrent R2/git writes) off the critical path and gets it debugged
> early instead of last, wedged behind the admin. It also settles the manifest shape and
> the content-hashed key scheme (CONT-05) *before* the gallery builds `srcset` URLs
> against them — the same rework argument that puts CONT-04 in Phase 3.

### Phase 5: Public Site

> **Amended 2026-08-22.** The **Résumé page stays** and is not deferred. Two reasons: the two-act
> Home's Act 2 holds work *and* résumé in one viewport, so removing the page empties half the
> mechanism; and an HTML résumé is crawlable and linkable where a PDF is neither. `resume.json`
> already holds all three experience entries, three skill groups and the education record, and the
> page is one static route with zero framework JS — the cost is near nil. The PDF download button
> lives **on** that page, for the recruiter who wants the file.
>
> **At launch there are no `/work/{id}` case studies** — Phase 6 moved after cutover. So every
> project card links straight out to the real thing: `cairn.co.in`, two Google Play listings, the
> Chrome Web Store, and the Storybook. All five hrefs and their badges are already in
> `data/resume.json`; this is a rendering job, not a content one.


**Goal**: Visitors get the whole public site — Home, Work, Photos, Résumé — on the monochrome identity, at Lighthouse-grade weight, with four of the five routes shipping no framework JavaScript
**Depends on**: Phase 1 (published theme), Phase 3 (content layer)
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, PUB-07, PUB-08, PUB-09, PUB-10, PUB-11, PUB-12, PUB-13, PUB-14, SEO-01, SEO-02, SEO-03, SEO-05
**Success Criteria** (what must be TRUE):

  1. Home presents two acts — identity and photo grid filling the first viewport, work below; Work lists the five projects and the Brevo engineering strip; Résumé renders from structured data, offers the maintained PDF, and prints legibly
  2. Photos shows all 39 images in a masonry gallery with no pagination, nothing shifts as it loads, and category filtering works as real links to prerendered `/photos/[category]` routes — crawlable, Back-button-capable, zero JavaScript
  3. Clicking a photo opens a lightbox dismissible by keyboard, backdrop and swipe, showing EXIF with absent fields omitted entirely rather than placeheld, and cameras and lenses shown as human names; each photo also has its own prerendered page with a social card
  4. A visitor can switch between dark and light, the choice persists, there is no flash of the wrong theme on first paint, motion is suppressed under `prefers-reduced-motion`, and four of the five public routes ship zero framework JavaScript
  5. Every page carries a canonical URL plus Open Graph and Twitter card metadata, the résumé carries `Person` structured data, a sitemap is generated, and the legacy `/portfolio` path 301s to `/photos`

**Plans**: TBD
**UI hint**: yes

> **Bundle gate — go/no-go, not an assumption.** This is the first phase to build a public
> page. Before the gallery is considered done, run the bundle visualizer against the
> `/photos` build. If `prosemirror`, `tiptap`, `lowlight` or `dnd-kit` appear in a public
> chunk, that is a **stop**: the fix is an upstream design-system change (per-component JS
> subpath exports, feeding a patch release), never a local workaround here. The entire
> Lighthouse 95+ goal and PUB-14 rest on this measurement. Also audit DevTools → Network →
> Font: at most three families should download.

### Phase 6: Case Studies

> **Carries one deferred design-system decision.** If a study renders a metric as a tile, that is the
> trigger for `StatCard`'s `class="glass"` fix — it currently has no consumer anywhere, so it was
> deliberately left alone rather than fixed speculatively. Same one-line treatment `Badge` got in
> plan 01-18. See the `StatCard` row in `phases/00-design-ideation/00-HUMAN-CHECKLIST.md`.

**Goal**: Each project is told as a real case study — problem, decisions and outcome, including what was rejected — reusing the vocabulary the public site established
**Depends on**: Phase 0 (template design + drafted copy), Phase 5 (layout and typography vocabulary)
**Requirements**: CASE-01, CASE-02, CASE-03
**Success Criteria** (what must be TRUE):

  1. Every project listed on Work links to a case-study page structured as problem → decisions → outcome, and each names alternatives that were rejected and why — not only what was chosen
  2. Case studies are authored as Markdown in a content collection, so adding one is adding a file rather than editing a template
  3. The design-system case study reads as the flagship — it carries measured specifics and genuine depth, not a product description

**Plans**: TBD
**UI hint**: yes

### Phase 06.1: Design System — Cascade Layers & Density Axis (INSERTED)

**Goal**: The design system's cascade is order-independent by declaration rather than by specificity arithmetic, and it exposes a density axis — so the admin can be compact without a single spacing override in the portfolio
**Depends on**: Phase 1 (monochrome theme published; compound selectors in place to migrate from), Phase 0 (DSGN-04 findings evidencing what density actually needs)
**Parallel with**: Phases 2–6 — different repository, no shared code or build. Must land before Phase 7.
**Requirements**: DS-10, DS-11, DS-12
**Success Criteria** (what must be TRUE):

  1. Monochrome, dark and compact applied together resolve deterministically regardless of the order the bundler emits stylesheets — verified in a real Astro build, not only in isolation
  2. The admin's denser spacing comes entirely from `data-density="compact"`; no spacing token is redefined anywhere in the portfolio repo
  3. The existing Playwright snapshot suite passes on the layers migration as an isolated release, with no font or contrast changes landing alongside it
  4. A published npm version carries both changes, consumable by version number

**Plans**: TBD
**UI hint**: no

> **CROSS-REPO.** Executes in `../design-system`, not this repository. Inserted after
> Phase 0's discussion established two things Phase 1 deliberately excludes: that layers
> are the correct fix for source-order dependence but must not ship in the same release as
> the font split and contrast fixes (a visual regression would be unattributable), and that
> brand themes own colour, type and geometry but **not** spacing — leaving the admin's
> compact layout with no legitimate mechanism until a density axis exists.

> **Why not Phase 1.** Phase 1 uses explicit compound selectors
> (`:root[data-brand="monochrome"].dark` at (0,3,0) beats `:root.dark` at (0,2,0)) precisely
> so the monochrome theme is unblocked without a global cascade migration. This phase
> migrates that arithmetic to declared layer order and adds density as a fourth axis
> (brand × mode × density) — the combinatorial pressure that justifies layers in the first
> place.

### Phase 9: Host the Storybook at `/design-system`

**Goal**: The design system's own Storybook is served from `akhilsaxena.com/design-system`, so the
strongest argument for the library lives on the site the library built
**Depends on**: Phase 8 (cutover — this must not delay going live), Phase 1 (published release)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):

  1. `/design-system` serves the Storybook, and `/work/design-system` — the case study — links to it
     rather than to the CF Pages URL
  2. Publishing a new design-system version does not require a manual copy step in this repo
  3. The Storybook's assets do not regress the public pages' Lighthouse budget, because they are not
     loaded by any public route
  4. The CF Pages deployment can be retired, or is deliberately kept as a fallback with that stated

**Plans**: TBD
**UI hint**: no

> **Why this is separate, and after cutover.** `/design-system` is the artefact; `/work/design-system`
> is the argument about it. Both are worth having and they are not the same page. Hosting introduces
> the project's **first deliberate cross-repo build coupling** — a Storybook static build has to be
> produced in one repo and served by another — and the constraints file has so far treated cross-repo
> coupling as a hazard to be avoided (the packed-tarball rule exists for exactly that reason). That
> is a fair thing to take on, but not while it can delay the live milestone. At launch the link
> already works: `data/resume.json` carries `href: "https://design-system-ed1.pages.dev"` today.

### Phase 7: Admin CMS

**Goal**: Akhil can edit content, upload photos and publish the site from a browser, with concurrent edits caught per-file and deploy status reported truthfully
**Depends on**: Phase 0 (wireframes), Phase 2 (auth gate already proven), Phase 3 (schemas), Phase 4 (pipeline to drive)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10
**Success Criteria** (what must be TRUE):

  1. The whole round trip works without touching a terminal for photos and home config — open `/admin`, edit photo metadata and the Home landing through design-system form editors, preview the change, publish it, and see it live. **ADR-001 moved résumé, projects and site config out of the admin**; their round trip is an editor plus git
  2. Editing a file that changed underneath surfaces a recoverable "reload and re-apply" prompt, detected per-file by blob SHA — not a dead-end error, and never a silent overwrite
  3. The admin reports "deployed" only once the build actually succeeded, and the last publish can be reverted in one click
  4. Photos upload through the admin and the processing job's completion is reported back in the UI
  5. Per-photo `object-position` for the home hero crops is editable in the admin, and navigating away with unsaved changes warns first

**Plans**: TBD
**UI hint**: yes

> **Deliberately after the public site.** The accepted-downtime clock only stops when the
> public site is live. The admin serves one authenticated operator who has `git` and a
> text editor as a perfectly serviceable fallback in the meantime.

### Phase 8: Harden & Cut Over

**Goal**: `akhilsaxena.com` serves the new site at 95+ across the board, with the boundaries that matter under automated test and the old hostname redirecting
**Depends on**: Phase 7
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, SEO-04, SEO-06
**Success Criteria** (what must be TRUE):

  1. Public pages score 95+ on Lighthouse performance, accessibility, best practices and SEO, enforced as a standing CI gate rather than a one-off run
  2. The auth boundary, the publish path and the photo pipeline each have automated tests that fail when the behaviour breaks
  3. `akhilsaxena.com` serves the site with certificates issued and Cloudflare Access still admitting Akhil to `/admin`
  4. `akhilsaxena.pages.dev` 301s to the apex, so the already-indexed production hostname does not compete with the new one
  5. Application CSS beyond the design system is confined to layout, and the built site matches the design handoff on layout, typography, spacing and interaction

**Plans**: TBD

> **Cutover is a written pre-flight, not an improvised sequence.** Recreating rather than
> editing the Cloudflare Access application issues a new AUD and locks the admin out — a
> documented, easy mistake. The long-lead items (nameservers, R2 custom domain, secrets
> migration) were deliberately resolved back in Phase 2 so this phase is a flip, not a
> provisioning exercise.

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

Phases 1 and 2 are genuinely parallel (different repositories) and may be interleaved or
reordered freely. Phase 4 is unblocked after Phase 3 and may be interleaved with Phases 5
and 6.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Design & Ideation | 24/25 | In Progress|  |
| 1. Design System — Monochrome Theme | 23/24 | In Progress|  |
| 2. Astro Foundation & Fail-Closed Auth | 9/10 | In Progress|  |
| 3. Content Layer & Image Origin | 0/TBD | Not started | - |
| 4. Photo Pipeline (Actions half) | 0/TBD | Not started | - |
| 5. Public Site | 0/TBD | Not started | - |
| 6. Case Studies | 0/TBD | Not started | - |
| 7. Admin CMS | 0/TBD | Not started | - |
| 8. Harden & Cut Over | 0/TBD | Not started | - |

## Requirement Coverage

**73 of 73 v1 requirements mapped. No orphans, no duplicates.**

| Phase | Requirements | Count |
|-------|--------------|------:|
| 0. Design & Ideation | DSGN-01 … DSGN-06 | 6 |
| 1. Design System — Monochrome Theme | DS-01 … DS-09 | 9 |
| 2. Astro Foundation & Fail-Closed Auth | FND-01 … FND-07, AUTH-01 … AUTH-04 | 11 |
| 3. Content Layer & Image Origin | CONT-01, CONT-02, CONT-03, CONT-04 | 4 |
| 4. Photo Pipeline (Actions half) | PIPE-01 … PIPE-05, CONT-05 | 6 |
| 5. Public Site | PUB-01 … PUB-14, SEO-01, SEO-02, SEO-03, SEO-05 | 18 |
| 6. Case Studies | CASE-01, CASE-02, CASE-03 | 3 |
| 7. Admin CMS | ADMIN-01 … ADMIN-10 | 10 |
| 8. Harden & Cut Over | QUAL-01 … QUAL-04, SEO-04, SEO-06 | 6 |
| **Total** | | **73** |

### Placement notes for requirements that could plausibly sit elsewhere

| Requirement | Placed in | Why not elsewhere |
|-------------|-----------|-------------------|
| DS-09 (tree-shaking) | Phase 1 | The *fix*, if needed, is per-component JS exports in `../design-system`. The *measurement* is re-run as a go/no-go gate in Phase 5, but the requirement is owned upstream. |
| FND-07 (nameservers, R2 domain) | Phase 2 | Longest lead time in the project. Discovering a problem at cutover means redoing DNS, secrets and CI at once, under pressure. |
| AUTH-01…04 | Phase 2 | `/admin` is a live attack surface the moment it is routable. Treating auth as an admin-phase concern is exactly how the legacy fail-open fallback came to exist. |
| CONT-04 (r2.dev migration) | Phase 3 | A data migration of all 39 manifest entries. Building pages against URLs about to change is rework, and the uncached origin makes Lighthouse non-reproducible. |
| CONT-05 (stale re-uploads) | Phase 4 | Only observable via a re-upload, and the content-hashed key scheme is implemented in the pipeline. Depends on CONT-04's cached domain existing. |
| SEO-05 (`/portfolio` → `/photos`) | Phase 5 | An in-app redirect, verifiable the moment the routes exist. No DNS dependency. |
| SEO-04 (`pages.dev` → apex) | Phase 8 | Cannot be verified until the apex is actually serving. |
| QUAL-04 (handoff fidelity) | Phase 8 | A cross-cutting review pass over Phases 5–7 output. Splitting it per-phase would fragment the judgement. |
