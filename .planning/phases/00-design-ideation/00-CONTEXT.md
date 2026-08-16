# Phase 0: Design & Ideation - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 0 produces **design artefacts only**. It delivers:

1. A reviewable wireframe set for the admin CMS — every screen, its information
   architecture, and its states (DSGN-01)
2. A case-study page template, laid out against real drafted content (DSGN-02)
3. Work and Photos resolved onto the charcoal dark palette, replacing the handoff's
   earlier ivory iteration (DSGN-03)
4. Throwaway sketches that render real `@akhil-saxena/design-system` components under
   charcoal, with every gap they expose written down as an upstream finding (DSGN-04)
5. The charcoal theme's public API, decided in writing (DSGN-05)
6. First-pass copy for the five project one-liners and the case studies (DSGN-06)

**No production application code is written in this phase.** The one deliberate exception
is DSGN-04: the sketches are *running code* importing the real design-system package,
because that is the only way to validate the theme before the release is cut. They are
throwaway and are deleted at phase exit.

**Scope-fence note:** all wireframes are now DS sketches (D-01), so the Astro playground
is the medium for the entire phase — not just DSGN-04. It remains throwaway. See D-02 for
the fence that keeps it from becoming the Phase 2 foundation.

</domain>

<decisions>
## Implementation Decisions

### Sketch & wireframe medium

- **D-01:** Every screen — admin, case study, Work, Photos — is a throwaway DS sketch:
  running code importing the real `@akhil-saxena/design-system` package under charcoal.
  Chosen over low-fidelity wireframes so gaps surface in real composition rather than in
  isolation.
- **D-02:** The sketches live in a **throwaway Astro playground** mirroring the eventual
  Phase 2 stack, consuming the design system as an `npm pack` tarball (never a symlink).
  Three unverified claims require the shipping stack to test: DS-09 tree-shaking; the
  zero-JS `forwardRef` static-render claim on which the whole "DS everywhere + Lighthouse
  95+" strategy rests; and the (0,2,0) cascade tie between `:root[data-brand]` and
  `:root.dark`, where Astro does not guarantee CSS ordering across `.astro` and React
  imports. Only Astro can test the last two.
  **Scope fence (mandatory):** no Cloudflare adapter, no CI wiring, no `/api` routes, no
  auth, and a Phase 0 exit task that deletes the directory. Without an adapter and CI it
  cannot silently become the Phase 2 foundation.
- **D-03:** Admin states are sketched **exhaustively** — empty, loading, error, dirty,
  conflict, success per screen. Nothing is left for Phase 7 to invent, and design-system
  gaps in error/validation components surface now.
- **D-04:** Design-system gaps are recorded in a **`00-FINDINGS.md`** in this phase
  directory: component, gap, proposed upstream fix, and a triage tier —
  `blocks-Phase-5` / `should-fix-in-Phase-1` / `backlog`. Phase 1's planner reads it and
  pulls in only the first two tiers, giving Phase 1 an explicit scope boundary rather than
  an open-ended list.

### Admin CMS — navigation and shell

- **D-05:** **Route-per-entity sidebar**: `/admin` (dashboard), `/admin/home`,
  `/admin/photos`, `/admin/resume`, `/admin/projects`, `/admin/site`. Replaces the legacy
  three-tab model (home/photography/dev), which had no home for case studies.
- **D-06:** `/admin` lands on a **pending-changes dashboard** — pending items grouped by
  entity, photos mid-pipeline, last publish time, and Publish. Gives pending state a
  permanent home instead of living only inside a modal. Its empty state matters.
- **D-07:** The preview is a **toggle to full width**, not a split pane — the form gets
  full width, a Preview toggle swaps to the rendered public view. Chosen so résumé's
  nested experience/projects/skills/education arrays have room. The preview **follows the
  admin's current mode**; both admin and public site support light and dark, so no
  nested-dark case ever occurs.
- **D-08:** The admin wears **charcoal, defaulting to light mode**, with denser spacing
  for utility work. Keeps DSGN-04's component coverage wide (forms, tables, dialogs, error
  summaries, steppers — surfaces the public site never touches) without editing in a dark
  warm room.
- **D-09:** **Phone-capable for light edits.** Full admin on desktop; on a phone the
  sidebar collapses to a Sheet and you can review pending changes, fix text, reorder
  photos and publish. The focal-point crop picker and case-study authoring are
  desktop-only with an honest "open on desktop" state. Every screen needs a second layout;
  two screens need a designed refusal.

### Admin CMS — drafts, publishing, and conflict

- **D-10:** **Server-side pending/draft state in Cloudflare D1.** Each screen saves into
  pending state; a global Publish ships what is pending to GitHub. KV was rejected for
  eventual consistency (a draft system must never fail read-after-write); Durable Objects
  are overkill for a single user.
  **Key benefit beyond cross-device editing:** the draft row stores the blob SHA it was
  based on *at save time*, so publish-time 409 detection has a real server-side baseline
  instead of whatever a long-open tab happened to load. This is the root-cause fix for the
  legacy `baseSha: "latest"` bug.
- **D-11:** **A draft is always pending changes layered on published JSON, never an
  independent fork.** Discard-draft always returns to published state. This rule is what
  prevents two sources of truth.
- **D-12:** **Everything drafts, photos included.** Upload stages the binary to R2 and
  writes a pending photo row (title, category, position, `peekPositions` crop) referencing
  the R2 key; Publish fires `workflow_dispatch`; Actions processes with sharp/exifr and
  commits the processed variants plus the manifest entry. Binaries never enter git
  history. **Consequence: Publish is asynchronous for photos.**
- **D-13:** **Autosave with save points.** Debounced autosave to D1, plus an explicit "mark
  as ready" per screen that moves an entity onto the pending list. Three states per entity
  — draft / ready / published — must be legible on the screen, the sidebar badge, and the
  dashboard.
- **D-14:** Publish opens a **confirm modal** listing changed items and/or a preview of the
  site with changes applied, requiring explicit confirmation.
- **D-15:** Photo pipeline progress surfaces in **two places that must agree**: an
  app-shell status strip that survives navigation (failure recoverable by retrying the
  dispatch without re-uploading), plus per-photo inline state on affected tiles in
  `/admin/photos`.
- **D-16:** On a 409, the conflict screen offers **per-file reload or overwrite** — each
  conflicted file shows the remote change alongside the pending change, resolved file by
  file, so a photo-pipeline collision on the manifest never forces abandoning an unrelated
  résumé edit. This diff view is the most substantial single screen in the admin.
- **D-17:** **Discard is both per-screen and global** (Discard All), each with its own
  confirm state.
- **D-18:** **Lenient draft, strict publish.** Drafts save when incomplete with inline
  per-field warnings; Publish runs the schema server-side and blocks, surfacing failures in
  a `FormErrorSummary` that deep-links to the offending screen. One schema, two severities.
  The publish modal needs a designed invalid state, not just a disabled button.
- **D-19:** A Cloudflare Access session expiring mid-edit is **detected on autosave (401),
  prompts for re-auth while keeping on-screen state, and retries the save in place.**
  Requires a 401-aware autosave path rather than fire-and-forget.

### Admin CMS — content editing

- **D-20:** Résumé bullets become **structured segments** — arrays of `{text}` /
  `{text, emphasis: true}` rendered as React elements. No HTML string exists anywhere, so
  the stored-XSS class is *designed out* rather than filtered. Only `<strong>` is used
  across `resume.json` today, so migration is narrow.
- **D-21:** Bullets are authored with the design system's **`RichText`** component
  (confirmed exported) with bold as the only enabled mark, serializing to segments.
- **D-22:** Photo ordering is **global by default with a per-category override** that wins
  when that filter is active. Photos already carry an `order` field; a second ordering
  field is required. Reordering uses the DS's exported
  `Sortable` / `SortableDndContext` / `SortableItem` with `onReorder`; whether its keyboard
  fallback is adequate is a FINDINGS.md check during sketching.
- **D-23:** Hero crops are set by **dragging a focal marker** on the photo rendered in a
  real 3:2 frame, with `object-position` following live. Preserves fine control — the one
  existing value is `50% 25%`, which no preset grid could produce. **The DS has no crop
  picker; this is a FINDINGS.md entry** and a custom control built from DS primitives.
- **D-24:** **A project owns its case study.** `/admin/projects` lists the projects;
  opening one edits its card fields and its case study together, matching the visitor path
  Work → project → case study. **Implies extracting `projects` out of `resume.json` into
  `projects.json`** — a schema split decided here rather than discovered in Phase 3.
- **D-25:** Photo categories become **canonical records** — id (lowercase), display label,
  column count — edited on `/admin/site`. This kills the existing lowercase-vs-Title-case
  drift between `portfolio_images.json` (`architecture`) and `site_config.categoryColumns`
  (`Architecture`) by making display and key different fields. Rename and delete need a
  designed reassignment path ("12 photos use this").
- **D-26:** The résumé PDF stays hand-maintained, but the admin **warns on drift**: store
  the PDF's upload timestamp, and if `resume.json` has changed since, the résumé screen and
  publish modal say so. A soft warning, not a publish block.

### Charcoal theme public API (DSGN-05)

- **D-27:** Scoping uses **explicit compound selectors**: `:root[data-brand="charcoal"]`
  at (0,2,0) for light, and `:root[data-brand="charcoal"].dark` at (0,3,0) for dark, which
  outranks `:root.dark` by arithmetic rather than by source order. No scoped non-root form
  is required on this site's account (see D-07 — no nesting case exists).
  *Reasoning note: Claude's initial argument leaned on consumer-breakage risk and was
  overweighted — consumers are the portfolio and Cairn, both Akhil's. Both candidate
  options were upstream DS changes, so Core Value did not discriminate between them. The
  deciding factor is keeping a global cascade migration out of a release that already
  carries the font split and the contrast fixes, so a visual regression stays
  attributable.*
- **D-28:** **Cascade layers happen, but as their own design-system release after Phase 1**,
  verified independently against the existing Playwright snapshots. Compound selectors
  unblock charcoal in Phase 1; the layers migration lands separately and carries the
  `data-density` axis with it.
- **D-29:** Font delivery splits into **tokens and faces as separate entries** —
  `theme-charcoal.css` carries tokens only, `fonts-charcoal.css` carries the `@font-face`
  sets. Makes DS-04 literally true (`tokens.css` ends with zero `@font-face`), fixes the
  axis once for every present and future theme, and fails *loudly* at integration if the
  font import is omitted. Per-family subpaths were rejected: forgetting one family is a
  silent single-face fallback, exactly the DS-05 failure mode being eliminated.
- **D-30:** **Variable fonts where available** (Playfair Display, DM Sans and IBM Plex Mono
  all ship variable), **latin subset only**, `font-display: swap`. The stated problem is
  font *count* — ~73 `@font-face` rules — and variable fonts collapse a family's weight
  range to roughly one rule.
- **D-31:** A brand theme owns **colour, typography, and geometry accents** (radius,
  shadow, border weight) — **but not spacing or sizing**. Editorial identity lives largely
  in sharp corners and hairline rules (Cairn already contributed a `--rule-s` token);
  layout maths stays design-system owned. **This boundary must be written down precisely or
  it erodes one token at a time.**
- **D-32:** Because brand themes cannot own spacing, the admin's denser layout comes from a
  **`data-density="compact"` axis at design-system level, never portfolio CSS** —
  overriding spacing tokens under an `.admin` selector would be exactly the workaround Core
  Value forbids. Density is a fourth cascade axis (brand × mode × density), which supplies
  the concrete justification the layers release (D-28) was otherwise missing. It ships with
  that release, before Phase 7 builds the admin. **Phase 0's job is only to prove the
  shape** — render admin sketches at compact density and log what the DS lacks.
- **D-33:** DS CSS is assembled via a **hand-maintained manifest file** — one app-level CSS
  file importing tokens, the charcoal theme, and exactly the per-component sheets in use.
  Satisfies both hard constraints simultaneously: a single file preserves cascade order,
  and ~30 KB ships instead of 204 KB. Zero tooling, so the sketches produce a real measured
  number this phase. Failure mode is a visibly unstyled component.
- **D-34:** The design system **ships a real no-flash module** — a documented entry point
  handling storage, system-preference fallback, `prefers-reduced-motion` on transitions,
  and the brand attribute together. Adds real API surface and tests to the DS rather than
  leaving every consumer to reinvent a script whose class-name contract the DS owns.
- **D-35:** The theme ships as **subpath exports in the same package** —
  `@akhil-saxena/design-system/themes/charcoal.css` and `/fonts/charcoal.css`, matching the
  existing `exports` map shape. One version number covers components and theme, so they
  cannot mismatch.
- **D-36:** Phase 1 ships as **v2.0.0**, preserving the existing four families as
  `fonts/default.css`. Removing `@font-face` from `tokens.css` is a definite break for
  Cairn, which gets its fonts that way today; semver tells the truth and the migration
  becomes a one-line import rather than a font hunt.
- **D-37:** Charcoal gets **full Playwright snapshot parity** with the default theme —
  every component, both modes. Nothing regresses unseen, and DS-06's contrast contract gets
  a visual companion. Accepted cost: doubled snapshot count and review burden.

### Case studies and copy (DSGN-02, DSGN-06)

- **D-38:** **All five projects get case studies, with the design system as the flagship** —
  it is the only one whose outcome the reader is looking at while reading it, and the only
  one that can close with "this page is built on it."
  **Note: `resume.json` has five projects, not the four originally stated in PROJECT.md and
  ROADMAP.md** — Cairn, hued, Momentum, TimeShift, and the Design System.
  **Resolved 2026-08-17:** the "four projects" count was corrected to five across
  PROJECT.md, ROADMAP.md and REQUIREMENTS.md (DSGN-06, PUB-02); the design-system entry's
  auto-generated id `project-1777750009929` became `design-system`, and its stale
  "77-component" became "80-component" (the DS README's own current claim at v1.11.4).
  Its `design-system-ed1.pages.dev` URL was **verified live (HTTP 200)** — an earlier
  claim in this discussion that it was dead was wrong. No URL change is needed.
- **D-39:** Case studies are **tiered by depth** — a long form for the design system and
  Cairn, a short form for hued, Momentum and TimeShift. Two templates to design and sketch.
- **D-40:** Substance comes from **the repos, with gaps flagged**; the interview that fills
  those gaps happens in the **final phase**, not now. All five repos are available locally
  (`../cairn`, `../design-system`, `../hued`, `../Momentum`, `../TimeShift`).
  **Critical constraint:** code shows *what* was decided, rarely *why*, and never the
  *outcome*. Drafts must therefore be **length-realistic even where provisional** — a
  six-word `[NEEDS AKHIL]` stub where a paragraph belongs defeats DSGN-06's entire purpose,
  which is that build phases work against real text lengths. Gaps get realistic-length
  marked placeholder prose, not short markers.
  **Never infer motivation or outcome as fact.** In front of engineers, an invented
  decision is worse than an admitted gap.
- **D-41:** Case studies carry a **hero image plus one or two inline screenshots** where a
  decision is easier shown than described. Assets exist for all five (Play Store listings
  for hued and Momentum, Chrome Store for TimeShift, live sites for Cairn and the design
  system, plus Storybook).
- **D-42:** Screenshots use a **simple R2 asset path** — admin uploads straight to R2 under
  `assets/`, on the same custom domain as photos (the legacy `/api/upload-asset` pattern is
  the precedent). Dimensions captured at upload for CLS; no Actions run, so publish stays
  fast. They do **not** go through the photo pipeline, which composites a watermark and
  extracts EXIF — neither of which belongs on a screenshot.
- **D-43:** One-liners converge on **idea first, then one hard fact** — open with what it is
  for in plain language, close with a single concrete technical detail. hued and TimeShift
  already use this shape; Momentum and the design system are currently plain feature lists
  and need rewriting.
- **D-44:** The Work page uses **two bands: employment, then projects.** Brevo, PharmEasy
  and MAQ as a professional-experience band; own projects as a separate band below. They
  are different kinds of evidence read for different reasons.
- **D-45:** Projects and case studies carry **status, not dates** — extend the existing
  `badges` field (already carrying "Live" on Cairn) with Live / Maintained / Archived. A
  reader learns whether it is real and current without the page ageing. An honest
  "Archived" reads better than an undated project assumed dead.

### Claude's Discretion

- Sidebar shows a per-entity badge distinguishing draft from ready — forced by D-13's
  three-state model, no separate decision needed.
- Résumé PDF replacement uses the DS `FileInput` on the résumé screen.
- Theme name is `charcoal`; per-family weight ranges left to implementation, since variable
  fonts (D-30) largely dissolve the question.
- Preview opens in the admin's current mode; dark-first on open noted as a nicety, since
  dark is what visitors actually get.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project intent and scope
- `.planning/PROJECT.md` — Core Value (the site is the proof the design system works),
  measured design-system findings, contrast measurements, content facts, and locked Key
  Decisions. **Note: its "no runtime filesystem" constraint is superseded by D-10 and is
  still unfixed — see Deferred Ideas.** (Its "four projects" count was corrected to five on
  2026-08-17.)
- `.planning/REQUIREMENTS.md` — DSGN-01…DSGN-06 for this phase; DS-01…DS-09 for Phase 1,
  which this phase's DSGN-05 output feeds directly.
- `.planning/ROADMAP.md` §"Phase 0: Design & Ideation" — goal, success criteria, and the
  no-implementation scope guard.

### The legacy app being ported
- `.planning/codebase/ARCHITECTURE.md` — admin component responsibilities, the
  `PropertiesPanel` form-field catalog (explicitly "the catalog to port"), the
  content-publishing data flow, and the photo pipeline. The seven dead admin components
  listed there must NOT be ported.
- `.planning/codebase/CONCERNS.md` — the four reinforcing defects the rebuild fixes.

### Design source material
- `design_handoff_portfolio/` — four HTML prototypes plus spec. High fidelity on Home;
  `Work.dc.html` and `Photos.dc.html` are the **earlier ivory iteration** that DSGN-03 must
  resolve onto charcoal. **Contains no design for `/admin` or case studies** — that void is
  DSGN-01 and DSGN-02.

### The design system (cross-repo)
- `../design-system/package.json` — current `exports` map, the shape D-35 extends.
- `../design-system/dist/index.d.ts` — confirmed exports relevant to the admin:
  `Sortable`, `SortableDndContext`, `SortableItem`, `RichText`, `AppShell`, `EmptyState`,
  `DataGrid`, `FormErrorSummary`, `ProgressBar`, `StatusPill`, `ConfirmDialog`,
  `TypeToConfirm`, `Wizard`, `InlineEdit`, `FileInput`, `Sheet`, `Lightbox`.
- `../design-system/src/tokens.css` — the `:root.dark, .dark` scope definition D-27 must
  outrank, and the ~73 `@font-face` rules D-29 removes.
- `../design-system/CAIRN-CONSOLIDATION.md` — establishes Cairn as the second consumer,
  which is what makes D-36's major-version treatment necessary.

### Content being designed against
- `data/resume.json` — five projects (not four), experience, skills, education; bullets
  currently containing `<strong>` only.
- `data/portfolio_images.json` — 39 photos, existing `order` field, lowercase categories.
- `data/home_config.json` — `peekIds` (6 photos), `peekPositions` (1 of 6 set, `50% 25%`).
- `data/site_config.json` — `categoryColumns` with Title-case keys, the drift D-25 fixes.

### Case-study source repos (all local)
- `../cairn`, `../design-system`, `../hued`, `../Momentum`, `../TimeShift` — the substance
  for D-40's drafts.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **The design system covers far more of the admin than expected.** `Sortable` +
  `onReorder` (D-22), `RichText` (D-21), `AppShell`, `EmptyState`, `DataGrid`,
  `FormErrorSummary` (D-18), `ProgressBar` + `StatusPill` (D-15), `ConfirmDialog` +
  `TypeToConfirm` (D-14), `Sheet` (D-09 mobile), `FileInput`, `InlineEdit`, `Wizard`. The
  admin is mostly composition, not new components.
- **Two things the DS does not have**, both confirmed FINDINGS.md entries: a focal-point
  crop picker (D-23), and a density axis (D-32).
- **`data/*.json` already carries more than the handoff assumed** — five URL variants per
  photo, base64 LQIP in `urls.thumb`, `dimensions` on every photo, and an `order` field.

### Established Patterns

- **The legacy `PropertiesPanel` is the form-field catalog** — one JSX branch per
  `Selection` variant. The WYSIWYG shell around it is discarded, but the field inventory it
  represents is the real input to the admin wireframes.
- **`/api/upload-asset` → R2 `assets/*`** is existing precedent for the non-photo asset
  path D-42 adopts.
- **Existing type drift** — `src/types.ts` documents that the admin defined its own drifted
  copies (e.g. admin splits dates into `startMonth/startYear/endMonth/endYear/isPresent`
  while `resume.json` stores a single `period` string). Reconciling this is a defined port
  task, not a discovery.

### Integration Points

- **DSGN-05 output → Phase 1 (DS-01…DS-09), cross-repo.** The written theme API is Phase
  1's direct input.
- **DSGN-04 findings → Phase 1 scope**, bounded by D-04's triage tiers.
- **The sketches are also Phase 1's measurement instrument** for DS-09 tree-shaking and the
  zero-JS render claim.
- **Admin wireframes → Phase 7**, and D-10's D1 draft store reaches back into Phase 2.

</code_context>

<specifics>
## Specific Ideas

- The Astro playground must specifically test **CSS ordering across `.astro` and React
  imports** — the documented hazard that only this harness can reproduce. Import DS CSS
  both ways, in whichever order Astro chooses, and confirm charcoal still wins in both
  modes. This turns DS-01 from a claim into a measurement before Phase 1 writes a line.
- The design-system case study should close by pointing at the page the reader is on.
- `home_config.peekPositions` has one value, `50% 25%` — proof that presets are
  insufficient (D-23).
- `product-peppers` has no EXIF at all and `architecture-redbuilding` has camera only;
  missing fields must be omitted entirely, never rendered as `—`.

</specifics>

<deferred>
## Deferred Ideas

**These are consequences of this discussion that belong to other phases. None are scope
creep into Phase 0 — they are impacts to record before planning.**

### Corrections needed to project documents
- **`PROJECT.md`'s "No runtime filesystem" constraint is superseded by D-10** and must be
  reworded: no runtime store for *published* content; drafts are the exception; published
  JSON stays in git.
- ~~**`PROJECT.md` and `ROADMAP.md` say "four own projects"; there are five** (D-38). The
  design-system entry also needs its id and component count corrected.~~
  **DONE 2026-08-17** — corrected across PROJECT.md, ROADMAP.md and REQUIREMENTS.md
  (DSGN-06, PUB-02); `resume.json`'s design-system id is now `design-system` and its
  description reads "80-component". The Storybook URL was verified live and needed no change.

### Phase scope this discussion grew
- **Phase 1** ships as **v2.0.0** (D-36), and gains a no-flash module (D-34) and full
  charcoal snapshot parity (D-37). Its light-mode contrast fixes (DS-02, DS-03) become
  load-bearing for the admin too (D-08), raising their priority.
- **Phase 2** grows a **D1 binding, draft schema and migrations** (D-10). This will trip
  GSD's schema-push blocking-task gate at plan time. Its fail-closed auth boundary widens
  to cover D1 writes, not just GitHub mutations.
- **Phase 3** grows four schema migrations: `projects` extracted into `projects.json`
  (D-24); résumé bullets converted to structured segments (D-20); a per-category photo
  order field (D-22); canonical category records replacing the lowercase/Title-case split
  (D-25).
- **Phase 7** grows draft CRUD, publish-from-draft, three-state tracking, a 401-aware
  autosave path (D-19), the per-file conflict diff UI (D-16), and phone layouts (D-09).
- **Final phase** gains a **copy-finalisation pass** — the D-40 interview plus editing
  drafts to final before cutover. It currently has no copy work in it.

### New work with no phase yet
- ~~**A separate design-system release after Phase 1** migrating CSS to `@layer` and adding
  the `data-density` axis (D-28, D-32).~~ **DONE 2026-08-17** — added to the roadmap as
  **Phase 06.1: Design System — Cascade Layers & Density Axis**, with new requirements
  DS-10, DS-11 and DS-12 in REQUIREMENTS.md. Depends on Phase 1, interleavable with 2–6,
  must land before Phase 7.
- **A coordinated Cairn update** to consume design-system v2.0.0 with the new
  `fonts/default.css` import (D-36). External to this project's roadmap.
- **Automated CSS manifest generation** from component usage (D-33), once a hand-maintained
  manifest exists to test against. Scope owner — portfolio or design system — unsettled.

</deferred>

---

*Phase: 0-design-ideation*
*Context gathered: 2026-08-17*
