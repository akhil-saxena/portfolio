# Phase 0: Design & Ideation - Research

**Researched:** 2026-08-17
**Domain:** Design-artefact production + a throwaway Astro/React measurement harness for a cross-repo design system
**Confidence:** HIGH (the three load-bearing claims were measured in a real Astro 7 build during this research, not inferred)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied verbatim from `.planning/phases/00-design-ideation/00-CONTEXT.md` §Implementation Decisions.
D-01…D-45 are locked. This research investigates **how** to execute them; it does not
re-open **what** they decided.

#### Sketch & wireframe medium

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

#### Admin CMS — navigation and shell

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

#### Admin CMS — drafts, publishing, and conflict

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

#### Admin CMS — content editing

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

#### Charcoal theme public API (DSGN-05)

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

#### Case studies and copy (DSGN-02, DSGN-06)

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

### Deferred Ideas (OUT OF SCOPE)

**These are consequences of the discussion that belong to other phases. None are scope
creep into Phase 0 — they are impacts to record before planning.**

#### Corrections needed to project documents
- **`PROJECT.md`'s "No runtime filesystem" constraint is superseded by D-10** and must be
  reworded: no runtime store for *published* content; drafts are the exception; published
  JSON stays in git.
- ~~**`PROJECT.md` and `ROADMAP.md` say "four own projects"; there are five** (D-38). The
  design-system entry also needs its id and component count corrected.~~
  **DONE 2026-08-17.**

#### Phase scope this discussion grew
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

#### New work with no phase yet
- ~~A separate design-system release after Phase 1 migrating CSS to `@layer` and adding the
  `data-density` axis (D-28, D-32).~~ **DONE 2026-08-17** — added as **Phase 06.1** with
  requirements DS-10, DS-11, DS-12.
- **A coordinated Cairn update** to consume design-system v2.0.0 with the new
  `fonts/default.css` import (D-36). External to this project's roadmap.
- **Automated CSS manifest generation** from component usage (D-33), once a hand-maintained
  manifest exists to test against. Scope owner — portfolio or design system — unsettled.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DSGN-01** | Admin CMS has a wireframed information architecture and screen design | §Admin IA & Combinatorial Analysis — a 937-line legacy `PropertiesPanel` field catalog recovered from `legacy/nextjs-portfolio`; a screen × state inventory with a measured artefact count (§"The combinatorial risk"); a state-scoping reduction that cuts ~108 naive artefacts to ~35 |
| **DSGN-02** | Project case-study pages have a wireframed template | §Case-Study Substance — derivability matrix per repo, evidencing D-39's long/short tiering; §Architecture Patterns → "Two case-study templates" |
| **DSGN-03** | Work and Photos resolved onto the dark palette | §Charcoal Palette — full token set extracted from `design_handoff_portfolio/README.md`, including the ivory tokens being replaced; §Open Question OQ-1 (the home Act-2 grid is 2×2 for four projects; there are five) |
| **DSGN-04** | Throwaway sketches built against the real DS package | §Astro Playground Harness (verified end-to-end during this research); §Measured Baseline — all three D-02 claims answered with numbers; §Don't Hand-Roll |
| **DSGN-05** | Charcoal theme public API decided | §Charcoal Theme API Mechanics — specificity arithmetic verified; the **exhaustive-dark-block invariant** (the real order-independence fix); `exports` map delta; variable-font availability corrected (IBM Plex Mono has no Fontsource variable package) |
| **DSGN-06** | First-pass copy for five one-liners and the case studies | §Case-Study Substance — what each repo can and cannot supply; §Code Examples → `[NEEDS AKHIL]` length-realistic placeholder convention |
</phase_requirements>

---

## Summary

This is a design phase whose deliverables are documents and throwaway sketches, but three
of its six requirements hinge on **measurements**, and the plan is only as good as the
method it prescribes for taking them. Accordingly, this research stood up the actual
harness D-02 describes — Astro 7.2.2 + `@astrojs/react` 6.0.2 + React 19.2.8 consuming
`@akhil-saxena/design-system@1.11.4` as an `npm pack` tarball — and ran the three
experiments. All three now have answers.

**The headline result is that DS-09 tree-shaking definitively does not work.** A single
`import { Chip }` inside a `client:load` island produced a **570,553-byte (176,754-byte
gzip) client chunk containing 10 ProseMirror modules, 23 TipTap modules, 4 lowlight, 4
highlight.js, 3 dnd-kit and 43 lucide-react modules** — 99 modules total, against a
270-byte baseline for a bare React island. Patching the package to `sideEffects: false`,
removing the `"use client"` directive, and marking the module-scope `createLowlight()` call
`/* @__PURE__ */` each produced **byte-identical output**. The ROADMAP framed DS-09 as "a
measurement, then a decision"; the measurement is done and the decision is forced —
**Phase 1 must ship per-component JS subpath exports.** That is no longer a contingency
branch in the plan.

The second and third claims resolved more happily but with a sharp caveat. The zero-JS
static-render claim **holds** — a page rendering `Heading`, `Text`, `Card` and `Chip` with
no `client:*` directive emitted an HTML file containing **zero `<script>` tags**, with
every DS component present as inline styles referencing `var(--token)`. And the cascade
hazard is **real and reproducible by construction**: swapping two import statements in an
`.astro` frontmatter reliably flips the emitted stylesheet order, and a charcoal token
declared in the light block but *not* restated in the dark block resolves to the *light*
value in dark mode. That failure is not a specificity bug — D-27's arithmetic is correct —
it is an **exhaustiveness bug**, and the fix is a one-line invariant test that mirrors one
the design system already has.

**Primary recommendation:** build the harness first as Wave 0, run the three measurements
as Wave 1, and treat everything downstream of them as sketching. Then split the phase —
DSGN-03/04/05 unblock Phase 1 (the project's declared blocker) and should ship as soon as
the measurements land; DSGN-01/02/06 block only Phases 6 and 7 and carry an artefact count
(~35 sketches under the reduction below, ~108 without it) that will otherwise hold Phase 1
hostage for no scheduling benefit.

---

## Architectural Responsibility Map

Phase 0 has no production tiers, so this maps each phase capability to the artefact class
that owns it — the equivalent question of "which thing is responsible for proving this."

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Charcoal token values, contrast | Written spec (`00-THEME-API.md`) | Playground sketch | Numbers must be reviewable as text before Phase 1 implements them; the sketch confirms they look right |
| Cascade order-independence | Automated invariant test | Playwright computed-style probe | The static invariant is the root-cause fix and runs in CI; the browser probe is a confirmatory smoke test |
| Font delivery shape | Written spec + `exports` map delta | Playground build (font-file count) | Resolution is a packaging question; the build gives the byte count that justifies it |
| DS-09 tree-shaking verdict | Playground build + sourcemap analysis | — | Only a real production bundle can answer it. **Answered: fails.** |
| Zero-JS static render | Playground build (`grep '<script'`) | — | Only a real build can answer it. **Answered: holds.** |
| Admin IA (routes, entities, fields) | Written inventory (`00-ADMIN-IA.md`) | Sketch | A 39-field, 13-variant catalog is unreviewable as pictures; the table is the artefact, the sketch illustrates it |
| Admin screen states | State-matrix table + representative sketches | — | Per D-03 exhaustiveness is asserted by the matrix; sketches cover each *treatment*, not each cell |
| Case-study template | Sketch rendered against real drafted copy | Written outline | D-40's whole point is real text lengths — a sketch without prose proves nothing |
| Case-study copy | Markdown drafts in `00-COPY/` | — | Plain text, edited by a human; no rendering needed to review wording |
| DS gap capture | `00-FINDINGS.md` with D-04 triage tiers | — | Phase 1's planner reads this file directly; it is an interface, not a note |

---

## Standard Stack

### Core — the throwaway playground

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `astro` | 7.2.2 | Playground framework | Mirrors the Phase 2 stack per D-02. `[VERIFIED: npm registry, published 2026-08-13]` |
| `@astrojs/react` | 6.0.2 | React island renderer | The only supported React integration; peer-accepts React 19. `[VERIFIED: npm registry]` |
| `react` / `react-dom` | 19.2.8 | Island runtime; DS peer dep | DS `peerDependencies` require `^19.0.0`. `[VERIFIED: ../design-system/package.json]` |
| `@akhil-saxena/design-system` | 1.11.4, as `file:*.tgz` | The system under test | D-02 mandates tarball, never symlink. `[VERIFIED: installed as a real directory, not a symlink, during this research]` |
| `playwright` | 1.x | Computed-style probe for the cascade test | Chromium already cached at `~/Library/Caches/ms-playwright`; the DS repo already uses `@playwright/test` 1.59.1. `[VERIFIED: probe ran successfully]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fontsource-variable/playfair-display` | 5.3.0 | Charcoal display serif | Prototyping `fonts-charcoal.css`. 4 subsets in `wght.css`. `[VERIFIED: npm registry + tarball inspected]` |
| `@fontsource-variable/dm-sans` | 5.3.0 | Charcoal UI sans | 2 subsets only (latin, latin-ext) in `wght.css`. `[VERIFIED: tarball inspected]` |
| `@fontsource/ibm-plex-mono` | 5.3.0 | Charcoal mono | **Static only** — see the correction below. Ships `latin-400.css` / `latin-500.css` per-subset files. `[VERIFIED: tarball inspected]` |

### Deliberately NOT installed (D-02 scope fence)

`@astrojs/cloudflare`, `wrangler`, any CI workflow, any `src/pages/api/*`, any auth
dependency, `vitest`. Installing any of these converts the playground into a Phase 2
foundation candidate, which is exactly what the fence exists to prevent. The absence of an
adapter is itself the enforcement mechanism.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@fontsource*` in a DS-owned `fonts/charcoal.css` | Astro's stable top-level `fonts` config (`fonts: [{ provider, name, cssVariable, subsets, weights }]`, present in Astro 7.2.2 with `subsets`, `unicodeRange`, `fallbacks` and variable-weight-range support) | Rejected by D-29/D-35: font delivery must live in the DS package so DS-05's "silent Georgia fallback" is impossible and so Cairn gets the same fix. Astro's API would move delivery into each consumer, reintroducing the omission failure mode. `[CITED: astro@7.2.2 dist/types/public/config.d.ts]` |
| Playwright computed-style probe | Parsing emitted `<link>`/`<style>` order from `dist/**/*.html` | Order inspection is cheap and deterministic but does not prove the *resolved value*. Use it as a fast signal; use the probe for the assertion |
| `rollup-plugin-visualizer` for bundle analysis | Sourcemap `sources` array | The sourcemap lists every contributing module by path — exact, zero extra dependencies, and greppable. Used for every measurement in this document |

**Installation (the exact sequence verified during this research):**

```bash
# 1. Pack the DS. npm pack does NOT run `prepublishOnly`, so `npm run build` first
#    if src/ has changed since the last build.
cd ../design-system && npm run build && npm pack --pack-destination ../portfolio/.playground

# 2. Scaffold the playground manually (avoid `npm create astro` — it is interactive
#    and scaffolds CI/adapter choices the fence forbids).
cd ../portfolio/.playground
npm install astro@7.2.2 @astrojs/react@6.0.2 react@19.2.8 react-dom@19.2.8 \
  ./akhil-saxena-design-system-1.11.4.tgz

# 3. Confirm the tarball installed as a copy, not a symlink — the duplicate-React guard.
ls -la node_modules/@akhil-saxena/          # must be a directory, not a symlink
find node_modules -path '*/react/package.json' -not -path '*/node_modules/*/node_modules/*'
# must list exactly one `node_modules/react/package.json`
```

**Tarball refresh loop when the DS changes:**

```bash
cd ../design-system && npm run build && npm pack --pack-destination ../portfolio/.playground
cd ../portfolio/.playground
npm install ./akhil-saxena-design-system-<version>.tgz   # re-resolves the same spec
rm -rf node_modules/.vite dist                            # Vite caches the old copy
npx astro build
```

`rm -rf node_modules/.vite` is not optional. npm will happily reinstall a same-named
tarball without invalidating Vite's dependency cache, and you will measure the previous
build. During this research a deliberate sentinel edit (`ds-atom-chip` →
`ds-atom-chip-PATCHED`) confirmed the cache-clear step is what makes the loop honest.

**Version verification:** every version above was confirmed with `npm view <pkg> version`
on 2026-08-17. Astro 7 requires **Node >= 22.12.0**; the local runtime is v22.22.3.

---

## Package Legitimacy Audit

Run with `slopcheck` 
(available at `/opt/homebrew/bin/slopcheck`).

**Method note worth carrying into the plan:** `slopcheck install <pkgs>` auto-detects the
ecosystem from project files. Run from a directory with no `package.json` it defaulted to
**PyPI** and reported 6 of 8 packages as `[SLOP]` — including `react-dom`. The `-e npm`
flag is mandatory for this project. Cross-ecosystem confusion is a documented ~9%
hallucination vector and it cuts both ways: it also manufactures false positives.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `astro` | npm | since 2021-03-13 | 3.94M/wk | github.com/withastro/astro | [OK] | Approved |
| `@astrojs/react` | npm | since 2022-03-18 | 1.30M/wk | github.com/withastro/astro | [OK] | Approved |
| `@astrojs/cloudflare` | npm | since 2022-06-16 | 513K/wk | github.com/withastro/astro | [OK] | Approved (not installed this phase — fence) |
| `react` | npm | since 2011-10-26 | 115.6M/wk | github.com/react/react | [OK] | Approved |
| `react-dom` | npm | since 2014-05-06 | 135.8M/wk | github.com/react/react | [OK] | Approved |
| `@playwright/test` | npm | since 2020-09-24 | 37.5M/wk | github.com/microsoft/playwright | [OK] | Approved |
| `@fontsource-variable/playfair-display` | npm | since 2023-05-21 | 84K/wk | github.com/fontsource/font-files | [OK] | Approved |
| `@fontsource-variable/dm-sans` | npm | since 2023-09-09 | 209K/wk | github.com/fontsource/font-files | [OK] | Approved |
| `@fontsource/ibm-plex-mono` | npm | since 2020-12-23 | 882K/wk | github.com/fontsource/font-files | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

**A package that does not exist:** `@fontsource-variable/ibm-plex-mono` returns **npm 404**.
See §Charcoal Theme API Mechanics → Font delivery. This is not a slop finding — it is a
factual correction to D-30.

---

## Measured Baseline — the three D-02 claims, answered

All numbers below come from a real `astro build` run during this research, at
`astro@7.2.2 / @astrojs/react@6.0.2 / react@19.2.8 / @akhil-saxena/design-system@1.11.4`.
Astro 7 ships **Vite 8, which is Rolldown-based**, so tree-shaking semantics are
Rolldown's, not Rollup's — a stack fact that had not been recorded anywhere in
`.planning/` and materially affects the DS-09 result.

### Claim 1 — DS-09 tree-shaking: **FAILS** `[VERIFIED: measured]`

`src/components/ChipIsland.tsx` containing nothing but
`import { Chip } from "@akhil-saxena/design-system"`, rendered `client:load`:

| Metric | Value |
|--------|------:|
| Island chunk, raw | **570,553 bytes** |
| Island chunk, gzip | **176,754 bytes** |
| Modules in chunk (from sourcemap `sources`) | **99** |
| — ProseMirror modules | 10 |
| — TipTap modules | 23 |
| — lowlight modules | 4 |
| — highlight.js modules | 4 |
| — dnd-kit modules | 3 |
| — lucide-react modules | 43 |
| Baseline: a bare React island with `useState` | **270 bytes** |
| Shared React client runtime | 180,667 bytes |

Three attempted fixes, each rebuilt from a cleared Vite cache, each producing
**byte-identical output**:

1. `sideEffects: ["*.css"]` → `sideEffects: false` — no change.
2. Removing the leading `"use client";` directive from `dist/index.js` — no change.
3. Marking the module-scope `var lowlight = createLowlight();` as `/* @__PURE__ */` — no change.

**Conclusion for the plan:** the barrel is not shakeable by configuration. DS-09's fallback
branch ("by per-component JS exports if it does not") is the live branch. Phase 1 must add
per-component JS subpath exports to the `exports` map, and Phase 0's `00-FINDINGS.md`
should record this at tier `blocks-Phase-5` — because `/photos` is the one hydrating public
route and 177 KB gzip of ProseMirror on it makes PUB-14 and QUAL-01 unreachable.

**Silver lining that the plan should not miss:** this only bites *hydrated* islands. The
`/photos` Lightbox is the only public hydration point in the whole roadmap. Everything else
is Claim 2.

### Claim 2 — zero-JS static render: **HOLDS** `[VERIFIED: measured]`

A page importing `Heading`, `Text`, `Card`, `Chip`, `Timeline`, `StatCard`, `AppBar` and
`Footer` from the barrel into `.astro` frontmatter, with **no** `client:*` directive:

```
$ grep -o "<script[^>]*>" dist/static/index.html
(no output)
```

The emitted markup is fully rendered — e.g.
`<span class="ds-atom-chip" style="...color:var(--amber-d);background:rgba(245,158,11,.10)...">`
— proving the components resolve against the token layer at build time and ship as plain
HTML.

**Correction to PROJECT.md's stated reasoning.** PROJECT.md and `research/SUMMARY.md`
attribute this to "DS primitives are pure `forwardRef` with zero hooks." A hook audit of
all 86 non-test component files found **only 32 are hook-free** — 37%, not "every
primitive." The *conclusion* is right and the *reason* is wrong: Astro renders any React
component to static HTML without a `client:*` directive, hooks or not; `useState` simply
returns its initial value during SSR. This matters because it changes what can fail. The
real risks are (a) module-scope `document`/`window` access, and (b) components whose
correct appearance depends on an effect that never runs.

Audit result for the components this project needs:

| Hook-free (renders correctly as static HTML) | Uses hooks (needs `client:*` or careful static use) |
|---|---|
| `Chip`, `Text`, `Heading`, `Card`, `Link`, `Divider`, `Eyebrow`, `Button`, `Badge`, `Timeline`, `StatCard`, `AppBar`, `Footer`, `EmptyState`, `StatusPill`, `ProgressBar` | `SegmentedControl`, `Lightbox`, `DataGrid`, `Sheet`, `Sortable`, `RichText`, `AppShell`, `ConfirmDialog`, `Wizard`, `InlineEdit`, `FileInput`, `Modal` |

Only 5 files guard `typeof window` at all (`Coachmark`, `BottomSheet`, `AppShell` ×2) — no
component reads `document` at module scope, so SSR crashes are unlikely.
`[VERIFIED: grep over ../design-system/src]`

Note `SegmentedControl` uses hooks. PUB-04 specifies category filtering as prerendered
`/photos/[category]` routes with real links and zero JS, so the sketches should render
category filters as `Chip`/`Link` anchors, not `SegmentedControl` — and if a
`SegmentedControl`-shaped static variant is wanted, that is a `00-FINDINGS.md` entry.

### Claim 3 — CSS cascade order: **the hazard is real, and the fix is exhaustiveness** `[VERIFIED: measured]`

**Astro's documented rule** is a *category* order — "`<link>` tags in the head (lowest
precedence), imported styles, scoped styles (highest precedence)" — and, for equal
specificity within a category, "the last one imported wins."
`[CITED: docs.astro.build/en/guides/styling/]` Within the *imported styles* category, order
is decided by `cssOrder(a, b)` in `astro/dist/core/build/runtime.js`, which sorts by
accumulated import index ascending and then by module-graph depth descending. The import
index is derived from `info.importedIds.indexOf(childId)` — literally the position of the
`import` statement inside the importing module.
`[VERIFIED: read astro@7.2.2 dist/core/build/{runtime,graph,plugins/plugin-css}.js]`

The practical consequence, and the single most useful methodological finding in this
document:

> **You cannot reliably reproduce Astro's ordering nondeterminism by hoping to observe it.
> You reproduce it by deterministically constructing both orderings and asserting the theme
> wins in each.** Swapping two adjacent `import` statements flips the emitted order every
> time.

Three variants were built, each with `<html class="dark" data-brand="charcoal">`, a
prototype charcoal theme whose light block declares `--ink` and `--cream` but whose dark
block deliberately restates only `--ink`:

| Variant | Import shape | Emitted head order |
|---------|--------------|--------------------|
| A | `tokens.css` then `theme-charcoal.css`, both in `.astro` | tokens, then charcoal |
| B | `theme-charcoal.css` then `tokens.css`, both in `.astro` | charcoal, then tokens |
| C | `tokens.css` in `.astro`, `theme-charcoal.css` imported by a `client:load` React island | tokens, then charcoal |

Variant C is important on its own: **island CSS is hoisted out of the island into a
page-level stylesheet**, so it competes in exactly the same cascade bucket as `.astro`
imports. There is no separate island cascade to reason about.

Playwright computed values on `document.documentElement`:

```
casc-a dark   --ink=#eae7e0   --cream=#f4f1ea   <-- WRONG: charcoal LIGHT bg in dark mode
casc-a light  --ink=#1a1815   --cream=#f4f1ea   ok
casc-b dark   --ink=#eae7e0   --cream=#181818   <-- WRONG: DS dark bg, charcoal lost
casc-b light  --ink=#1a1815   --cream=#f4f1ea   ok
casc-c dark   --ink=#eae7e0   --cream=#f4f1ea   <-- WRONG (same as A)
casc-c light  --ink=#1a1815   --cream=#f4f1ea   ok
```

Read this carefully, because it is the whole finding:

- `--ink` **is** restated in `:root[data-brand="charcoal"].dark` at (0,3,0). It resolves
  correctly in every variant and both modes. **D-27's specificity arithmetic is correct.**
- `--cream` is **not** restated in the charcoal dark block. It breaks in *both* orderings,
  differently: charcoal-after-tokens leaves the light value applied in dark mode; charcoal-
  before-tokens lets `:root.dark` (0,2,0) beat `:root[data-brand="charcoal"]` (0,2,0) on
  source order and drops charcoal entirely.
- Light mode never breaks, because `:root[data-brand="charcoal"]` (0,2,0) beats `:root`
  (0,1,0) unconditionally.

**Therefore the load-bearing rule for DSGN-05 is not a selector choice — it is an
exhaustiveness invariant:**

> `:root[data-brand="charcoal"].dark` must declare **every** custom property that
> `:root[data-brand="charcoal"]` declares. With that invariant held, every charcoal token
> resolves at (0,3,0) in dark mode and the cascade becomes order-independent by
> construction, with no dependence on `@layer` and no dependence on the manifest.

This mirrors the design system's existing test almost exactly — `tokens.test.ts` already
asserts *"declares a light value for every token the dark theme overrides"* with the
comment *"A token that exists only under .dark silently resolves to nothing in light mode.
`--rule-strong` shipped that way."* Charcoal needs the mirror assertion, and it is ~15
lines against the existing `block()` / `declaredIn()` helpers.
`[VERIFIED: read ../design-system/src/tokens.test.ts]`

**`inlineStylesheets` does not change the ordering.** Astro's default is
`build.inlineStylesheets: 'auto'`, which inlines any stylesheet under Vite's 4 kB
`assetsInlineLimit` as a `<style>` tag and links the rest.
`[CITED: docs.astro.build/en/reference/configuration-reference/]` A 104-byte prototype
theme inlined; the 65 KB `tokens.css` linked. Order was preserved identically under both
`'auto'` and `'never'`. Test both settings anyway — it costs one config flag — but do not
expect it to be the variable that breaks you.

### Bonus measurement — the font problem, quantified

Importing only `@akhil-saxena/design-system/tokens.css` into one Astro page emits:

| Metric | Value |
|--------|------:|
| Bundled `tokens.css` | **65,493 bytes** (29,803 gzip) — up from 14,948 bytes on disk |
| `@font-face` rules in the bundled output | **73** (exactly PROJECT.md's estimate) |
| Font files emitted into `dist/_astro/` | **128** (65 woff2 + 63 woff) |
| Total font bytes emitted | **2.36 MB** (1.32 MB woff2 only) |
| Families | Inter (56 files), JetBrains Mono (36), Archivo (30), Newsreader (6) |

The `@import "@fontsource/…"` bare specifiers do resolve and inline at build time as
PROJECT.md said — but that is what turns a 15 KB stylesheet into a 65 KB one with 73
`@font-face` rules and a 2.36 MB asset tree, none of it Playfair, DM Sans or IBM Plex.
This is the measured case for D-29 and D-36's major version.

### Bonus measurement — the D-33 manifest number

| Set | Raw | Gzip |
|-----|----:|-----:|
| `primitives.css` (whole) | 178,398 B | 35,098 B |
| All 74 split sheets concatenated | 217,569 B | — |
| `base.css` alone | 7,094 B | — |
| Plausible public-page manifest (base + text, heading, eyebrow, link, divider, card, chip, button, appbar, footer, timeline, lightbox, statuspill, segmentedcontrol) | **41,281 B** | **8,923 B** |
| Plausible admin-extra set (24 further sheets) | +73,654 B | — |

D-33's "~30 KB ships instead of 204 KB" is directionally right; the realistic public figure
is ~41 KB raw / ~9 KB gzip. Record the actual number the sketches produce.

### Bonus finding — the per-component CSS subpath is spelled without `.css`

`.planning/research/SUMMARY.md` listed this as an open gap. It is now closed, and the
answer is a trap:

```js
// package.json exports:  "./css/*": { "style": "./dist/css/*.css", "default": "./dist/css/*.css" }

import "@akhil-saxena/design-system/css/base.css";  // -> dist/css/base.css.css  ❌ build fails
import "@akhil-saxena/design-system/css/base";      // -> dist/css/base.css      ✅
```

The build error is `[vite]: Rolldown failed to resolve import
"@akhil-saxena/design-system/css/base.css"`. Worse, `import.meta.resolve()` reports the
broken form as resolvable — it performs pattern substitution without stat-ing the target —
so a naive Node-level resolution check passes while the build fails. The D-33 manifest must
use extensionless specifiers, and this belongs in `00-FINDINGS.md` (suggested upstream fix:
add `"./css/*.css": "./dist/css/*.css"` alongside the existing pattern so both spellings
work). `[VERIFIED: measured]`

---

## Charcoal Theme API Mechanics (DSGN-05)

### Specificity arithmetic — verified correct

| Selector | Specificity | Source |
|----------|------------|--------|
| `:root` | (0,1,0) | `tokens.css` light block |
| `.dark` | (0,1,0) | `tokens.css` dark block, second selector in the list |
| `:root.dark` | (0,2,0) | `tokens.css` dark block, first selector in the list |
| `:root[data-brand="charcoal"]` | (0,2,0) | D-27 light |
| `:root[data-brand="charcoal"].dark` | (0,3,0) | D-27 dark |

`tokens.css` declares `:root.dark, .dark { … }` as a selector list; each selector carries
its own specificity, so charcoal-light at (0,2,0) beats the bare `.dark` at (0,1,0)
unconditionally and only ties with `:root.dark`.
`[VERIFIED: ../design-system/src/tokens.css:278-279]`

**The tie is not the problem the design must solve. The exhaustiveness invariant is.** See
Claim 3 above.

### The `exports` map delta (D-35)

Current map — `themes` and `fonts` do not exist:

```json
"exports": {
  ".":               { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./hooks":         { "types": "./dist/hooks/index.d.ts", "import": "./dist/hooks/index.js" },
  "./icons":         { "types": "./dist/icons/index.d.ts", "import": "./dist/icons/index.js" },
  "./tokens.css":     "./dist/tokens.css",
  "./primitives.css": "./dist/primitives.css",
  "./utilities.css":  "./dist/utilities.css",
  "./css/*":         { "style": "./dist/css/*.css", "default": "./dist/css/*.css" }
}
```

Proposed additions (purely additive — not the breaking part of v2.0.0):

```json
"./themes/*.css": { "style": "./dist/themes/*.css", "default": "./dist/themes/*.css" },
"./fonts/*.css":  { "style": "./dist/fonts/*.css",  "default": "./dist/fonts/*.css"  }
```

Spelling the wildcard as `./themes/*.css` (rather than `./themes/*`) makes
`@akhil-saxena/design-system/themes/charcoal.css` — the exact string D-35 specifies —
resolve to `dist/themes/charcoal.css`, and avoids the double-extension trap the existing
`./css/*` entry has.

Two mechanical consequences the plan must not skip:

1. `package.json` `files: ["dist", "README.md", "LICENSE"]` means the new CSS must land in
   `dist/`. `scripts/postbuild.mjs` currently hard-codes
   `for (const css of ["tokens.css", "primitives.css", "utilities.css"])` and throws on a
   copy failure by design. Phase 1 extends that loop.
   `[VERIFIED: ../design-system/scripts/postbuild.mjs]`
2. `src/packaging.test.ts` already asserts *"every path in `exports` actually exists in
   dist"*, including wildcard patterns (it checks the directory holds at least one match).
   The new entries get that coverage for free.
   `[VERIFIED: ../design-system/src/packaging.test.ts]`

**How to validate the map shape in Phase 0 without editing the design system.** Create a
throwaway stub package inside the playground with only the proposed `exports` map and two
empty CSS files, install it as `file:`, and import both subpaths in an `.astro` file. If
`astro build` succeeds, the map shape is proven. This gives DSGN-05 a *tested* spec without
Phase 1 work leaking into Phase 0 and without touching `../design-system`. Do **not** rely
on `import.meta.resolve` alone — the `base.css.css` case above shows it under-reports.

### Font delivery (D-29, D-30) — one correction and one real decision

**Correction (HIGH confidence, contradicts D-30):**

> `@fontsource-variable/ibm-plex-mono` **does not exist**. `npm view` returns 404. Neither
> does `@fontsource-variable/ibm-plex-serif`. Fontsource mirrors Google Fonts, and Google
> Fonts has not onboarded the variable IBM Plex family (only `@fontsource-variable/ibm-plex-sans`
> exists). `@ibm/plex-mono@2.5.0` on npm ships **static split faces only** — no VF file.
> A variable IBM Plex Mono exists upstream in the IBM/plex GitHub releases, but nothing on
> npm packages it. `[VERIFIED: npm registry 404 + @ibm/plex-mono tarball inspected]`

D-30's stated *goal* (collapse ~73 `@font-face` rules) survives intact. Its stated *premise*
("all three ship variable") does not. Two of three do.

**The real decision — "latin subset only" is not a package option for variable fonts:**

| Package | CSS entry points | Subsets in that file |
|---------|------------------|----------------------|
| `@fontsource-variable/playfair-display` | `index.css`, `wght.css`, `wght-italic.css` — **no per-subset files** | 4: cyrillic, vietnamese, latin-ext, latin |
| `@fontsource-variable/dm-sans` | `index.css`, `wght.css`, `standard.css`, `opsz.css` (+ italics) — **no per-subset files** | 2: latin-ext, latin |
| `@fontsource/ibm-plex-mono` (static) | per-weight **and** per-subset: `latin-400.css`, `latin-500.css`, … | 1 each |

`[VERIFIED: all three tarballs unpacked and inspected]`

So there are two viable shapes for `fonts/charcoal.css`, and DSGN-05 must pick one in
writing:

- **Option A — re-export the package CSS.** `@import` `playfair-display/wght.css` +
  `dm-sans/wght.css` + `ibm-plex-mono/latin-400.css` + `latin-500.css`.
  → **8 `@font-face` rules** (4 + 2 + 1 + 1). Zero maintenance. Not literally "latin only,"
  but each non-latin rule carries a `unicode-range` the browser never matches on this
  site's content, so **network cost is still one file per family**. 73 → 8 rules.
- **Option B — hand-author the rules.** Write four `@font-face` blocks pointing directly at
  `…/files/playfair-display-latin-wght-normal.woff2` etc. (the Fontsource `exports` map
  exposes `./files/*.woff2`).
  → **exactly 4 rules**, literally latin-only. Costs a Vite `url()` resolution question
  (bare specifiers inside CSS `url()`) that must be verified in the playground before it is
  written into the spec, and re-verified whenever Fontsource renames a file.

**Recommendation: Option A**, and reword D-30's "latin subset only" as "latin-only *download*,
guaranteed by `unicode-range`." It gets ~89% of the reduction for ~0% of the fragility, and
the failure mode of Option B (a renamed woff2 in a Fontsource minor bump) is a silent
missing face — the exact DS-05 class of bug D-29 exists to kill.

Also worth writing down explicitly: `font-family` names include the word `Variable`
(`'Playfair Display Variable'`, `'DM Sans Variable'`). A charcoal theme that sets
`--font-serif: "Playfair Display", Georgia, serif` while `fonts/charcoal.css` declares
`font-family: 'Playfair Display Variable'` **silently falls back to Georgia** — precisely
the DS-05 failure mode. The token strings and the `@font-face` family names must match, and
a test should assert it.

### The token-ownership boundary (D-31) — write it as an allowlist, not prose

D-31 warns the boundary "erodes one token at a time." The enforceable form is a **name
allowlist checked by a test**, not a paragraph. From `tokens.css`'s actual prefixes:

| Charcoal MAY redefine | Charcoal MUST NOT redefine |
|---|---|
| `--ink*`, `--cream*`, `--paper*`, `--rule*`, `--wire`, `--track`, `--fill-*`, `--scrim*`, `--g-bg`, `--g-bd`, `--amber*`/accent, `--blue`, `--purple`, `--green`, `--red`, `--ds-illust-*` | `--space-*`, `--text-*`, `--lh-*`, `--ls-*`, `--ds-sidebar-w`, `--ds-snackbar-offset` |
| `--font*`, `--display`, `--mono`, `--serif`, `--weight-*` | any sizing/spacing scale |
| `--radius-*`, `--shadow-*`, `--rule-s` (geometry accents) | — |

Note the tension the spec must resolve out loud: `--text-*` (type *scale*) is sizing and
stays DS-owned, while `--font-*` (type *stacks*) and `--weight-*` are identity and are
theme-owned. That is a defensible line but it is not self-evident, and D-31 explicitly asks
for precision.

---

## Admin IA & Combinatorial Analysis (DSGN-01)

### The field catalog exists — recover it, do not re-derive it

`src/components/admin/PropertiesPanel.tsx` was purged from `main` but is intact on the
`legacy/nextjs-portfolio` branch:

```bash
git show legacy/nextjs-portfolio:src/components/admin/PropertiesPanel.tsx
```

**937 lines, 13 `Selection` union variants, 33 `<input>` + 4 `<select>` + 2 `<textarea>`
(39 form controls) and 34 `<button>`.** `[VERIFIED: recovered and counted]`

Field labels recovered verbatim: Site Title, Tagline, Intro Text, Subtitle, Introduction,
Social Links, Button (Text/Link URL/Style), Photo (Title/Category/Tags/Order/Position),
Camera, Lens, Aperture, Shutter, ISO, Focal Length, Company, Role, Period, Location, Icon,
URL, Bullets, Project (Name/Label/Description/Tech Stack/Link/Store Links), Skill
Group/Skills, School, Degree, CGPA, Leadership, Resume PDF / Upload New Resume, Add Photo
to Gallery, Replace with, Actions.

The legacy panel also already implements a focal-point control ("Position (drag to
adjust)") as a mouse-drag pan with an inverted delta and a `50%`-clamped
`objectPosition`. It is **mouse-only, keyboard-inaccessible, and touch-unaware** — which is
useful twice: as a working precedent for D-23's interaction, and as the reason D-09's
"desktop-only, with an honest refusal state" is the right call rather than a cop-out.
`[VERIFIED: read from the legacy branch]`

### Entity → screen map (D-05, D-24, D-25)

| Screen | Entity | Source data | Notes |
|--------|--------|-------------|-------|
| `/admin` | pending set | D1 draft rows | D-06 dashboard; **its empty state is a first-class screen** |
| `/admin/home` | `home_config.json` | title, subtitle, intro, `peekIds` (6), `peekPositions` (1 of 6 set), `socialLinks` (3), `ctas` (2) | contains the focal-point picker (D-23) |
| `/admin/photos` | `portfolio_images.json` | 39 photos, 7 categories, `order` + new per-category order (D-22) | contains `Sortable` reorder |
| `/admin/resume` | `resume.json` | experience (3), skills (3 groups), education (1) | `RichText` bullets (D-21); PDF drift warning (D-26) |
| `/admin/projects` | new `projects.json` (D-24) | 5 projects × `{id,title,label,description,tech,icon,href,badges}` | list view |
| `/admin/projects/[id]` | one project + its case study | as above + case-study body | **7th screen, implied by D-24 but not listed in D-05** |
| `/admin/site` | `site_config.json` | category records (D-25) | rename/delete reassignment path |

### The combinatorial risk — with a number

D-03 requires six states (empty, loading, error, dirty, conflict, success), D-13 layers a
draft/ready/published model, and D-09 requires a second layout for every screen.

**Naive product:** 7 screens × 6 states × 2 layouts = **84**, plus the cross-cutting
surfaces that are not routes but are unavoidably screens — publish confirm modal in valid
and invalid variants (D-14, D-18), per-file conflict diff (D-16, "the most substantial
single screen"), per-screen and global discard confirms (D-17), 401 re-auth prompt (D-19),
pipeline status strip (D-15), category-reassignment dialog (D-25), "open on desktop"
refusal (D-09) — roughly 12 more surfaces × ~2 states × 2 layouts ≈ **24**. Total ≈ **108
artefacts**, before any case-study or Work/Photos work.

That is not deliverable in one phase alongside DSGN-02 through DSGN-06, and it would be
unreviewable if it were.

**The reduction that keeps D-03's guarantee while making it tractable.** D-03's promise is
*"nothing is left for Phase 7 to invent."* That promise is kept by an **explicit coverage
matrix**, not by rendering every cell. Most of the six states do not live at screen scope
at all:

| State | Real scope | Artefacts needed |
|-------|-----------|-----------------|
| `loading` | App shell + list-level skeleton | 2 treatments, not 7 |
| `conflict` | One dedicated screen (D-16) | 1 screen, 2 layouts |
| `success` | Publish outcome — dashboard + status strip | 2 |
| `error` | Three genuinely different treatments: inline field warning (lenient draft), `FormErrorSummary` publish block, network/401 | 3 |
| `dirty` | Same badge + save-point affordance everywhere (D-13) | 1 pattern + per-screen application |
| `empty` | **Genuinely per-screen** — dashboard, photos, projects, résumé sections each mean something different | 4–5 |

Realistic deliverable:

- ~7 desktop screens in their populated state, plus ~5 meaningful empty states, plus ~8
  state treatments applied to their most demanding host screen → **≈ 20 desktop sketches**
- D-09 permits exactly four phone capabilities plus two refusals, so phone is
  **≈ 6 sketches**, not a 7× multiplier
- Overlays and dialogs → **≈ 9 sketches**
- **Total ≈ 35 sketches** + one coverage matrix table asserting all 7 × 6 combinations are
  `designed` / `inherits-pattern-N` / `n/a`

Thirty-five throwaway sketches is still the largest single body of work in the phase.

### Recommendation: split the phase

The evidence points one way and the scheduling argument is independent of the artefact
count:

- **DSGN-03, DSGN-04, DSGN-05 block Phase 1**, which ROADMAP.md names as the project's
  declared blocker and one half of the load-bearing Phase 1 ∥ Phase 2 parallelism.
- **DSGN-01 blocks only Phase 7** (the second-to-last phase). **DSGN-02 and DSGN-06 block
  only Phase 6.**

Holding Phase 1 behind 35 admin sketches buys nothing.

> **Suggested split** — *offered as evidence for the orchestrator's decision, not as a
> locked recommendation, since phase structure is the orchestrator's call:*
> - **Phase 0a — Charcoal Validation:** playground harness, the three measurements,
>   `00-FINDINGS.md`, `00-THEME-API.md` (DSGN-05), Work/Photos on charcoal (DSGN-03).
>   Exit criterion: Phase 1 can start.
> - **Phase 0b — Admin & Case-Study Design:** DSGN-01, DSGN-02, DSGN-06, reusing 0a's
>   harness. Runs in parallel with Phase 1/2. Owns the playground-deletion exit task.
>
> **If split, D-02's "Phase 0 exit task that deletes the directory" moves to 0b's exit,**
> not 0a's — the harness is 0b's medium too (D-01 makes every screen a DS sketch). The
> fence itself is unaffected: no adapter, no CI, no `/api`, no auth throughout.

---

## Case-Study Substance (DSGN-02, DSGN-06)

### Derivability matrix — measured per repo

D-40 says substance comes from the repos with gaps flagged. Here is what each repo actually
holds. `[VERIFIED: filesystem + git]`

| Project | Planning docs | Commits | Genuinely derivable | Genuinely NOT derivable |
|---------|--------------|--------:|--------------------|------------------------|
| **design-system** | `.planning/PROJECT.md` (Core Value, 10 Locked Design Constraints with exact token values, 20-row Key Decisions Log), **`CHANGELOG.md` 43 KB with per-change rationale and measured contrast ratios**, `CAIRN-CONSOLIDATION.md`, 80 components, Playwright + axe + vitest suites | — | Problem, decisions **with reasons and numbers**, rejected approaches, constraints, test strategy | Adoption/outcome beyond "Cairn and this site use it" |
| **Cairn** | `.planning/PROJECT.md` (12-row Key Decisions table **with rationale column**), **`.planning/REMOVED.md` — an authoritative list of features cut, with why**, `ARCHITECTURE.md`, `TECH-STACK.md`, `A11Y-AUDIT.md`, `docs/`, runbook | **873** | Problem, decisions + rationale, **rejected alternatives verbatim** (CASE-01's hardest requirement), constraints, refusals-as-identity | Usage numbers, whether the wedge worked |
| **Momentum** | `ARCHITECTURE.md`, `README.md` (79 lines, MVVM layer diagram), `docs/MIGRATION_PLAN.md`, `store-listing/` | 396 | What it does, architecture, full feature surface, screenshots | Why any of it; outcome; **one-liner needs rewriting per D-43** |
| **TimeShift** | `README.md` (46 lines), `docs/`, 65 tests, `PRIVACY_POLICY.md` | 59 | What it does, supported formats (verbatim examples), test count, the disambiguation problem (CST/IST/BST) — a genuinely good "problem" hook | Why built; outcome |
| **hued** | `README.md` (51 lines) — **already written as narrative, not a feature list**, `docs/`, `publishing/` | **19** | What, tech stack, stated design philosophy ("design-first app, not an app with design"), the palette-as-theme idea | Decisions, outcome; thin commit history |

**This independently validates D-39's tiering.** The two projects with `.planning/`
directories — design-system and Cairn — are exactly the two D-39 assigns the long form.
That is not a coincidence to be noted in passing; it is the reason the tiering is correct,
and it is worth stating in the case-study spec.

**Two cautions the plan must carry:**

1. **The design-system's `.planning/PROJECT.md` is stale and will mislead.** It is titled
   *"Project: JobDash Design System"*, says *"53 sections"* (the README says 80 components),
   and documents `body.dark` as the theming mechanism when the shipped code uses
   `:root.dark, .dark`. **`CHANGELOG.md` is the accurate current source**; the planning docs
   are historical. Drafting the flagship case study from `PROJECT.md` would put stale facts
   in front of the exact audience most likely to check them.
   `[VERIFIED: cross-read PROJECT.md vs README.md vs src/tokens.css]`
2. **D-43's diagnosis is confirmed by the data.** hued's README opens *"Every photo you take
   carries color. Over weeks and months, those colors tell a story you've never seen"* —
   already idea-first. Momentum's opens with a 21-bullet feature list, and the design
   system's `resume.json` one-liner is *"80-component React library with semantic tokens,
   dark mode, …"* — both plain feature lists needing the D-43 rewrite.

### What "done well" looks like for an engineering case study

The shape CASE-01 asks for — problem → decisions → outcome, *including alternatives
rejected* — has one reliable tell: **a decision section that names the option not taken and
what it would have cost.** Cairn's `REMOVED.md` and the design-system's CHANGELOG already
write in that register natively (e.g. *"`--ink-4` … was historically equal to `--ink-3` in
light but a much dimmer grey in dark, which silently dropped ~28 text usages to 2.4:1 in
dark mode. Aliasing keeps both modes honest."*). The drafting task for those two is closer
to *selection and compression* than to authoring.

For the three short-form projects, the honest structure is narrower: a real problem
statement (TimeShift's timezone-abbreviation ambiguity is genuinely interesting), one
architectural decision that is visible in the code, and an explicit `[NEEDS AKHIL]` block
for motivation and outcome — **at paragraph length**, per D-40.

---

## Architecture Patterns

### System Architecture Diagram — Phase 0 information flow

```
  ../design-system @1.11.4          data/*.json (39 photos, 5 projects,
  (npm run build → npm pack)         résumé, home, site config)
            │                                     │
            │  file:*.tgz (a COPY, never a link)  │  real content, never lorem
            ▼                                     ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  THROWAWAY ASTRO PLAYGROUND  (.playground/, deleted at exit)  │
  │  astro 7.2.2 + @astrojs/react 6.0.2 + react 19.2.8            │
  │  NO adapter · NO CI · NO /api · NO auth   ← the fence         │
  │                                                                │
  │  src/styles/manifest.css ──┬─ tokens.css                      │
  │   (D-33, single file,      ├─ theme-charcoal.css  (prototype) │
  │    preserves cascade)      ├─ fonts-charcoal.css  (prototype) │
  │                            └─ css/<component>  (extensionless!)│
  │                                                                │
  │  src/pages/                                                    │
  │   ├─ admin/*        ← DSGN-01 sketches (charcoal LIGHT, D-08) │
  │   ├─ case/*         ← DSGN-02 long + short templates          │
  │   ├─ work, photos   ← DSGN-03 on charcoal DARK                │
  │   └─ probe/*        ← measurement fixtures only               │
  └───────────────────────────────────────────────────────────────┘
        │                    │                      │
        │ astro build        │ astro build          │ astro build + playwright
        ▼                    ▼                      ▼
  ┌───────────────┐  ┌────────────────┐  ┌────────────────────────┐
  │ MEASURE-1     │  │ MEASURE-2      │  │ MEASURE-3              │
  │ island chunk  │  │ grep '<script' │  │ computed --token values │
  │ sourcemap     │  │ in dist/*.html │  │ across 4 import orders  │
  │ sources[]     │  │                │  │ × 2 modes × 2 inline    │
  └───────┬───────┘  └───────┬────────┘  └───────────┬────────────┘
          │                  │                       │
          └──────────────────┴───────────────────────┘
                             ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  PHASE 0 OUTPUTS (the only things that survive)               │
   │  00-FINDINGS.md    → Phase 1 scope (tiers: blocks-Phase-5 /   │
   │                       should-fix-in-Phase-1 / backlog)        │
   │  00-THEME-API.md   → Phase 1 DS-01…DS-09 spec                 │
   │  00-ADMIN-IA.md    → Phase 7                                  │
   │  00-COPY/*.md      → Phase 5 (one-liners) + Phase 6 (studies) │
   │  screenshots/      → the reviewable record of deleted sketches│
   └──────────────────────────────────────────────────────────────┘
```

### Recommended playground structure

```
.playground/                      # gitignored OR committed-then-deleted; decide in the plan
├── akhil-saxena-design-system-1.11.4.tgz
├── astro.config.mjs              # integrations:[react()] and nothing else
├── package.json
├── probe.mjs                     # Playwright computed-style probe (see Code Examples)
├── check-bundle.mjs              # sourcemap sources analyser
├── check-theme-exhaustive.mjs    # the load-bearing invariant test
├── public/                       # nothing; photos load from r2.dev during Phase 0
└── src/
    ├── styles/
    │   ├── manifest.css          # D-33 — the single import point
    │   ├── theme-charcoal.css    # prototype tokens (D-29 split, tokens only)
    │   └── fonts-charcoal.css    # prototype @font-face (D-29 split, faces only)
    ├── data/                     # symlink or copy of ../data/*.json — real content
    ├── layouts/
    │   ├── Public.astro          # dark by default
    │   └── Admin.astro           # charcoal LIGHT + data-density="compact" (D-08, D-32)
    ├── components/               # islands ONLY where interaction is being sketched
    └── pages/
        ├── index.astro           # a contact sheet linking every sketch — see below
        ├── admin/…
        ├── case/…
        ├── work.astro / photos.astro
        └── probe/…               # measurement fixtures, excluded from the contact sheet
```

### Pattern 1: The contact sheet

**What:** `pages/index.astro` is a single index linking every sketch, grouped by screen,
with each state as a labelled sub-link and a one-line note on what it proves.
**When to use:** always, from the first sketch.
**Why:** this is the answer to "how do you keep 35 artefacts reviewable rather than an
unnavigable pile of pages." A reviewer walks one list; a coverage table on the same page
asserts the 7 × 6 matrix. Without it, D-03's exhaustiveness guarantee is unverifiable
by inspection, which defeats it.

### Pattern 2: State via query parameter, not via 35 files

**What:** one route per screen; the state comes from `Astro.url.searchParams.get('state')`
and switches the fixture data. `/admin/photos?state=empty`, `?state=conflict`, etc.
**When to use:** for every admin screen.
**Why:** 7 files instead of 42; the state list lives in one array per screen, so the
coverage matrix can be *generated* from it rather than hand-maintained; and adding a state
is one array entry. Costs nothing — these pages are never deployed.

```astro
---
// src/pages/admin/photos.astro
import Admin from "../../layouts/Admin.astro";
export const STATES = ["populated","empty","loading","error","dirty","conflict","success"] as const;
const state = Astro.url.searchParams.get("state") ?? "populated";
const fixture = await import(`../../fixtures/photos.${state}.json`).catch(() => null);
---
<Admin state={state}>{ /* … */ }</Admin>
```

### Pattern 3: Prototype the charcoal theme in the playground, spec the packaging separately

**What:** `src/styles/theme-charcoal.css` and `fonts-charcoal.css` live in the playground
and are imported by relative path. The `exports`-map shape is proven separately with a stub
package (see §Charcoal Theme API Mechanics).
**When to use:** throughout Phase 0.
**Why:** DSGN-05 is *"decided in writing"* and Phase 1 implements. Editing
`../design-system/src` to prototype would put Phase 1 work in Phase 0, in a repo that is
explicitly *not* throwaway, and would require touching `postbuild.mjs` too. Splitting
prototype-here / spec-the-packaging keeps the fence intact while still testing both.

### Pattern 4: Two case-study templates rendered against real prose

**What:** `case/long.astro` (design system, Cairn) and `case/short.astro` (hued, Momentum,
TimeShift), each rendering an actual drafted Markdown file from `00-COPY/`.
**When to use:** DSGN-02.
**Why:** D-40's entire justification for length-realistic drafts is that build phases work
against real text lengths. A template laid out against lorem or against six-word stubs
proves nothing about line-length, heading rhythm, or where a screenshot needs to sit.

### Anti-Patterns to Avoid

- **Adding `@astrojs/cloudflare` "just to be realistic."** It is the single change that
  makes the playground a viable Phase 2 foundation, which D-02 forbids. Nothing in the
  three measurements needs an adapter — all three were taken during this research without
  one.
- **Measuring tree-shaking on a page with no `client:*` directive.** The static path ships
  zero JS by construction; a "pass" there is meaningless. DS-09 is only observable on a
  hydrated island.
- **Testing the cascade in one import order and calling it verified.** Both orders resolve
  differently. See Claim 3.
- **Declaring a charcoal token in the light block only.** This is the failure Claim 3
  measured. Every light-block token must be restated in the dark block.
- **Writing `@akhil-saxena/design-system/css/chip.css`.** Extensionless. The build error is
  clear but the pattern is invisible until it bites.
- **Drafting the design-system case study from `../design-system/.planning/PROJECT.md`.**
  It is stale (see §Case-Study Substance caution 1).
- **Sketching admin screens in dark mode.** D-08 locks charcoal *light* for the admin, and
  the light palette is where DS-02/DS-03's contrast failures live (`#7A7568` at 4.07:1,
  `#B0722A` at 3.52:1 — both fail AA). Sketching in dark hides exactly the problems the
  admin sketches exist to surface.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Which modules are in a client bundle | A regex over minified JS | The `.js.map` `sources` array | Minifiers rename identifiers but sourcemaps keep original module paths. Exact, zero dependencies, and it is what produced every number in this document |
| Resolved CSS custom-property values | Reading link order and reasoning about specificity | Playwright `getComputedStyle(document.documentElement).getPropertyValue('--x')` | Order inspection cannot see `unicode-range`, `@supports`, or the interaction of inline `<style>` with `<link>`. The browser is the only authority |
| Serving `dist/` for the probe | `astro preview` | A 15-line `node:http` static server | `astro preview` is adapter-aware and the fence forbids an adapter. A plain static server is deterministic and starts instantly |
| Charcoal cascade correctness | A `!important` sweep, or `@layer` | The exhaustive-dark-block invariant + a test | `@layer` is explicitly deferred to Phase 06.1 by D-28; `!important` would break every consumer override. Exhaustiveness is the root-cause fix and needs no new mechanism |
| Contrast checking the charcoal palette | A hand-written WCAG formula | `../design-system/src/tokens.test.ts` — extend it | The DS already has the relative-luminance implementation, the AA thresholds, and CI wiring. DS-06 requires the test to live there anyway |
| Admin form controls | Bespoke inputs | `Field`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Toggle`, `NumberStepper`, `FileInput`, `RichText` — all exported | Core Value. Anything missing is a `00-FINDINGS.md` entry, not a local component |
| Photo reorder | A drag implementation | `Sortable` / `SortableDndContext` / `SortableItem` with `onReorder` | D-22. Already wired to dnd-kit's `KeyboardSensor` + `sortableKeyboardCoordinates` |
| Empty / error / progress / confirm surfaces | Bespoke states | `EmptyState`, `FormErrorSummary`, `ProgressBar`, `StatusPill`, `ConfirmDialog`, `TypeToConfirm` | All exported (verified in `src/index.ts`). The admin is composition, not new components |
| Package name legitimacy | Eyeballing npm | `slopcheck install -e npm …` | The `-e npm` flag is mandatory — see §Package Legitimacy Audit |

**Key insight:** the two genuine build-it-yourself items in this phase are the ones D-23 and
D-32 already identified — a focal-point crop picker and a density axis — and neither is
built here. Phase 0 sketches them and files them. Everything else in the admin is
composition over 80 existing components, which is precisely the Core Value claim the phase
is testing.

---

## Common Pitfalls

### Pitfall 1: Measuring a stale tarball
**What goes wrong:** the DS is rebuilt and repacked, `npm install ./x.tgz` reports success,
and the build measures the previous copy.
**Why it happens:** the tarball filename is unchanged, so npm's integrity check can
short-circuit, and Vite's `node_modules/.vite` dependency cache holds the old optimised
copy regardless.
**How to avoid:** `rm -rf node_modules/.vite dist` before every measurement build. Verify
freshness once with a sentinel edit (change a class name in `dist/index.js`, rebuild, grep
the output) so you know the loop is honest.
**Warning signs:** byte-identical output hashes across builds you expected to differ. (This
is also how three *legitimate* null results were confirmed during this research — the
sentinel is what distinguishes "no effect" from "no rebuild.")

### Pitfall 2: Concluding the DS is tree-shakeable because a static page ships no JS
**What goes wrong:** MEASURE-2 passes spectacularly (zero `<script>` tags) and DS-09 is
marked resolved.
**Why it happens:** the two claims sound like the same claim.
**How to avoid:** DS-09 is only observable on a page with a `client:*` directive. Keep the
two fixtures in separate files with separate names (`probe/static.astro`,
`probe/island.astro`).
**Warning signs:** a DS-09 result reported without a byte count.

### Pitfall 3: A charcoal token that only exists in the light block
**What goes wrong:** dark mode shows a light background, or reverts to the design system's
neutral dark instead of charcoal — and which one you get depends on import order, so it may
not reproduce.
**Why it happens:** `:root[data-brand="charcoal"]` and `:root.dark` both compute (0,2,0).
**How to avoid:** the exhaustiveness invariant, enforced by `check-theme-exhaustive.mjs`
(see Code Examples). Run it in the playground this phase, and hand it to Phase 1 as a
`tokens.test.ts` case.
**Warning signs:** a token whose dark-mode value is correct in `astro dev` but wrong in
`astro build` (dev and build order differently), or a colour that changes when an unrelated
import is added.

### Pitfall 4: The Variable suffix in font-family names
**What goes wrong:** `--font-serif: "Playfair Display", Georgia, serif` while the
`@font-face` declares `font-family: 'Playfair Display Variable'`. Text renders in Georgia.
The page looks *almost* right.
**Why it happens:** Fontsource variable packages append `Variable` to the family name; the
handoff spec and every design reference say "Playfair Display."
**How to avoid:** assert in a test that every family named in a `--font-*` token appears as
a `font-family` in the paired `fonts-*.css`. This is DS-05's failure mode restated, and the
one D-29's loud-failure design is meant to catch — but D-29 only catches a *missing import*,
not a *name mismatch*.
**Warning signs:** headings that look like Georgia; `document.fonts.check('16px "Playfair Display"')`
returning `false`.

### Pitfall 5: The admin sketches become an unnavigable pile
**What goes wrong:** 35 artefacts land, nobody can tell whether the matrix is covered, and
DSGN-01's "reviewable wireframe set" success criterion cannot be judged.
**Why it happens:** exhaustiveness (D-03) and reviewability pull in opposite directions.
**How to avoid:** Pattern 1 (contact sheet) + Pattern 2 (state via query param) from the
first sketch, not retrofitted. Generate the coverage table from the per-screen state arrays.
**Warning signs:** a `pages/admin/` directory with more than ~10 files.

### Pitfall 6: The playground quietly becomes the Phase 2 foundation
**What goes wrong:** `.playground/` accumulates an adapter, a `wrangler.jsonc`, a test
runner, and a workflow; deleting it stops being possible.
**Why it happens:** it is genuinely the right stack, and each addition is individually
reasonable.
**How to avoid:** the deletion task is a planned task with a verifiable check
(`test ! -d .playground`), not a note. Screenshot every sketch into
`.planning/phases/00-design-ideation/screenshots/` **before** deletion, so the review
record outlives the code. Consider `.gitignore`-ing the playground entirely so there is no
history to be tempted by.
**Warning signs:** `@astrojs/cloudflare` or `wrangler` appearing in `.playground/package.json`.

### Pitfall 7: Trusting the design system's own planning docs
**What goes wrong:** the flagship case study ships with "53 sections", "JobDash Design
System", and `body.dark` — in front of engineers who will open the repo.
**Why it happens:** `../design-system/.planning/PROJECT.md` is a historical artefact; the
README and CHANGELOG moved on.
**How to avoid:** treat `CHANGELOG.md`, `README.md` and `src/` as the current source; treat
`.planning/` as evidence of *what was decided and why*, with every factual claim
re-verified against code.
**Warning signs:** any number in a case study that was not read out of a file this week.

### Pitfall 8: `slopcheck` in the wrong ecosystem
**What goes wrong:** `react-dom` is reported as hallucinated.
**Why it happens:** ecosystem auto-detection defaults to PyPI when run outside a directory
with a `package.json`.
**How to avoid:** always `slopcheck install -e npm …`.
**Warning signs:** `(pypi)` in the output for a JavaScript package.

---

## Code Examples

All four scripts below were executed during this research and produced the numbers quoted
in §Measured Baseline. Sources are the local repos and the live builds.

### MEASURE-1 — DS-09 tree-shaking verdict

```js
// .playground/check-bundle.mjs  — run after `astro build`
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const HEAVY = {
  prosemirror: /prosemirror/i, tiptap: /tiptap/i, lowlight: /lowlight/i,
  highlightjs: /highlight\.js/i, dndkit: /dnd-kit/i, lucide: /lucide/i,
};
const dir = "dist/_astro";
let failed = false;

for (const f of readdirSync(dir).filter((f) => f.endsWith(".js.map"))) {
  const map = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const js = f.replace(/\.map$/, "");
  const counts = {};
  for (const s of map.sources)
    for (const [k, re] of Object.entries(HEAVY)) if (re.test(s)) counts[k] = (counts[k] ?? 0) + 1;
  const heavy = Object.keys(counts).filter((k) => k !== "lucide");
  console.log(`${js}  ${statSync(join(dir, js)).size} B  ${map.sources.length} modules`, counts);
  if (heavy.length) { failed = true; console.error(`  FAIL: ${heavy.join(", ")} in a client chunk`); }
}
process.exit(failed ? 1 : 0);
```

**Pass threshold for DSGN-04:** zero `prosemirror` / `tiptap` / `lowlight` / `dnd-kit`
modules in any `dist/_astro/*.js` chunk reachable from a public page, and the largest island
chunk under **50 KB gzip**. **Measured at v1.11.4: 570,553 B raw / 176,754 B gzip, 99
modules — FAIL by a factor of ~3.5 on gzip alone.**

### MEASURE-2 — zero-JS static render

```bash
# every public sketch page except the one deliberate island must have no <script>
for f in $(find dist -name index.html | grep -v '/photos/'); do
  n=$(grep -c '<script' "$f" || true)
  [ "$n" -eq 0 ] || { echo "FAIL $f has $n script tag(s)"; exit 1; }
done && echo "PASS: zero framework JS on all static routes"
```

Astro emits a tiny `<style>astro-island,astro-slot{display:contents}</style>` and an
`astro-island` custom element only on pages that hydrate; a page with no `client:*`
directive gets neither. **Measured: 0 script tags on a page rendering 8 DS components.**

### MEASURE-3 — the cascade probe

```js
// .playground/probe.mjs — `node probe.mjs` after `astro build`
import { chromium } from "playwright";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const TYPES = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".woff2":"font/woff2" };
const srv = createServer((req, res) => {
  let p = join("dist", decodeURI(req.url.split("?")[0]));
  if (existsSync(p) && !extname(p)) p = join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(4321, r));

const TOKENS = ["--ink","--ink-2","--ink-3","--cream","--cream-2","--rule","--amber-d","--font-serif"];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const variant of ["a","b","c","d"])          // 4 deliberately-constructed import orders
  for (const mode of ["dark","light"]) {
    await page.goto(`http://localhost:4321/probe/casc-${variant}/`);
    await page.evaluate((m) => document.documentElement.classList.toggle("dark", m === "dark"), mode);
    const got = await page.evaluate((t) => {
      const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries(t.map((k) => [k, cs.getPropertyValue(k).trim()]));
    }, TOKENS);
    console.log(variant, mode, JSON.stringify(got));
  }
await browser.close(); srv.close();
```

Build the four variants by **construction**, not by hope:
`a` = tokens then theme in `.astro`; `b` = theme then tokens in `.astro`; `c` = tokens in
`.astro`, theme from a `client:load` island; `d` = the reverse of `c`. Run the whole matrix
under both `build.inlineStylesheets: 'auto'` and `'never'`. **Every cell must produce
identical values.** Any variation is the bug.

### The load-bearing invariant — exhaustive dark block

```js
// .playground/check-theme-exhaustive.mjs
import { readFileSync } from "node:fs";
const css = readFileSync("src/styles/theme-charcoal.css", "utf8");

const block = (sel) => {
  const i = css.indexOf(sel);
  if (i === -1) throw new Error(`selector not found: ${sel}`);
  const o = css.indexOf("{", i);
  return css.slice(o, css.indexOf("\n}", o));
};
const declared = (s) => new Set([...s.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]));

const light = declared(block(':root[data-brand="charcoal"] {'));
const dark  = declared(block(':root[data-brand="charcoal"].dark {'));
const missing = [...light].filter((t) => !dark.has(t));

if (missing.length) {
  console.error(
    "FAIL: these charcoal tokens are declared in light but not restated in dark.\n" +
    "Each ties with :root.dark at (0,2,0), so its dark value depends on stylesheet order:\n  " +
    missing.join("\n  "));
  process.exit(1);
}
console.log(`PASS: all ${light.size} charcoal tokens restated in the dark block`);
```

This is the mirror of `../design-system/src/tokens.test.ts`'s existing *"declares a light
value for every token the dark theme overrides"*. Hand it to Phase 1 as a `tokens.test.ts`
case — it is DS-01's real acceptance criterion, expressed as code.

### D-40 length-realistic placeholder convention

```markdown
## Outcome

<!-- NEEDS AKHIL: outcome. Nothing in the repo records whether the wedge worked —
     there are no analytics, no install counts in git, and no retro. The paragraph
     below is deliberately written at the length the finished section needs so the
     template is laid out against a real measure; every claim in it is a guess and
     must be replaced or deleted before ship. -->

> [NEEDS AKHIL] Cairn has been in daily use through a live job search since <month>,
> across roughly <n> applications. The parts that earned their keep were <x> and <y>;
> the part that did not was <z>, which is why <feature> was cut in <version>. If there
> is one number worth quoting here it is <metric> — but it needs to come from Akhil,
> not from the repository, because the repository has no idea whether any of this
> helped.
```

The visible marker is short; the **placeholder prose is the length of the finished
paragraph**. That is the distinction D-40 draws, and it is the only version that lets the
case-study template be judged.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on this phase |
|--------------|------------------|--------------|----------------------|
| Astro on Vite 5/6 (Rollup) | **Astro 7 on Vite 8 (Rolldown)** | Vite 8, ~2026 | Tree-shaking semantics are Rolldown's. `sideEffects: false` did not shake the DS barrel; do not assume Rollup-era advice transfers `[VERIFIED: measured]` |
| Fonts self-hosted per consumer | Astro ships a **stable top-level `fonts` config** with `subsets`, `weights`, `unicodeRange`, `fallbacks`, variable-weight ranges | Astro 6/7 | A real alternative to `@fontsource*`, **rejected by D-29/D-35** because delivery must live in the DS package. Worth naming in the spec as the road not taken |
| Astro CSS order "undefined" (roadmap#540, 2023) | Astro guarantees a **category** order — link < imported < scoped — implemented and merged | Astro 3.x, RFC merged 2023-04-25 | Within the *imported* category, order is still `cssOrder()`-derived and flips with import position. The hazard is narrower than the 2023 issue implies, and still real `[VERIFIED: read astro@7.2.2 source]` |
| `@cloudflare/next-on-pages` (legacy site) | `@astrojs/cloudflare` 14.x, Workers + Static Assets | adapter v13 dropped Pages | Not used this phase (D-02 fence); noted because the version has moved past PROJECT.md's "v13" |
| `@fontsource/<family>` static weights | `@fontsource-variable/<family>` | ongoing | **Not universal.** No variable IBM Plex Mono or IBM Plex Serif exists on Fontsource `[VERIFIED: npm 404]` |

**Deprecated/outdated in the project's own docs:**
- PROJECT.md's *"DS primitives are pure `forwardRef` with zero hooks"* — true of 32 of 86
  components, not all. The conclusion survives; the reasoning does not.
- PROJECT.md's *"whether tree-shaking saves us is a 5-minute build experiment"* — the
  experiment is done. It does not.
- `../design-system/.planning/PROJECT.md` — stale product name, component count, and
  theming mechanism.
- `design_handoff_portfolio/README.md` — says the design system has *"55 components"*; the
  README says 80. Also its home Act-2 grid is 2×2 for four projects (see OQ-1).

---

## Project Constraints (from CLAUDE.md)

Actionable directives extracted from `./CLAUDE.md`, carrying the same authority as
CONTEXT.md's locked decisions.

| Directive | Bearing on Phase 0 |
|-----------|-------------------|
| **All UI comes from `@akhil-saxena/design-system` where a component exists; app CSS confined to layout.** This is the core value, not a preference | Every sketch composes DS components. A gap is a `00-FINDINGS.md` entry, never a local component. QUAL-03 later audits this |
| **Consume the DS as a packed tarball (`npm pack` → `file:*.tgz`), never `file:../design-system` or `npm link`** — both symlink and carry the duplicate-React "invalid hook call" hazard | Binding on the playground. Verified during this research that the tarball installs as a copy with exactly one React |
| **CI gate fails the build if the dependency spec still starts with `file:`** | Not applicable this phase (no CI in the playground, per the fence) — but the playground's `package.json` **will** contain `file:…tgz`, so the plan must ensure it is never the thing CI points at |
| **Platform: Cloudflare Workers + Static Assets; `output: 'static'` + `adapter: cloudflare()`; `prerender = false` on `/admin` and `src/pages/api/*`** | Explicitly excluded from the playground by D-02's fence. Note the tension and keep it stated |
| **Bindings from `import { env } from "cloudflare:workers"`, and must NOT be guarded** | Not exercised this phase; no bindings, no adapter |
| **Auth fails closed; missing configuration denies** | No auth in the playground. The admin sketches show a 401 re-auth state (D-19) as a *design*, with no implementation |
| **Lighthouse 95+ on public pages, with a real budget on the 39-photo gallery** | The DS-09 measurement is the leading indicator. Record the manifest byte count and the island chunk size in `00-FINDINGS.md` as the Phase 5 baseline |
| **No runtime filesystem / content is committed JSON** | Superseded for drafts by D-10 (CONTEXT.md flags this as an unfixed PROJECT.md correction). Phase 0 designs against D-10 |
| **GSD workflow enforcement — start work through a GSD command before editing files** | Procedural; the plan's tasks satisfy it |
| **Commit identity: `saxena.akhil42@gmail.com`; no Claude co-author trailer** | Applies to every commit this phase makes |

---

## Runtime State Inventory

Not applicable. Phase 0 is greenfield design work: it creates a throwaway directory, writes
Markdown artefacts, and deletes the directory. No rename, refactor, migration or string
replacement is in scope, and no stored data, live service config, OS registration, secret
or build artefact is touched.

The one state-like concern — the playground directory outliving the phase — is covered as
Pitfall 6 and as an explicit deletion task with a verifiable check.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Astro 7 (`engines.node >= 22.12.0`) | ✓ | v22.22.3 | — |
| npm | tarball install, `npm pack` | ✓ | 10.9.8 | — |
| `../design-system` with a built `dist/` | `npm pack` | ✓ | v1.11.4, `dist/` present (2026-08-15) | `npm run build` in that repo |
| Playwright Chromium | MEASURE-3 | ✓ | `chromium-headless-shell` 151.0.7922.34 installed during this research; `chromium-1217/1228` also cached | Parse `<link>` order from `dist/**/*.html` (weaker — does not prove resolved values) |
| `slopcheck` | package legitimacy gate | ✓ | on PATH at `/opt/homebrew/bin/slopcheck` | Tag all packages `[ASSUMED]` |
| `git` | recovering `PropertiesPanel.tsx` from `legacy/nextjs-portfolio` | ✓ | 2.50.1; branch present locally | — |
| `gh` | none this phase | ✓ | 2.93.0 | — |
| `../cairn`, `../hued`, `../Momentum`, `../TimeShift` | DSGN-06 substance | ✓ | all present with git history (873 / 19 / 396 / 59 commits) | — |
| `design_handoff_portfolio/` | DSGN-03 | ✓ | 4 prototypes + spec README | — |
| `data/*.json` | real content for sketches | ✓ | 4 files | — |
| Network access to `pub-*.r2.dev` | photo images in Work/Photos sketches | ⚠ unverified | — | Sketch against `dimensions` + the base64 LQIP already in `urls.thumb`; CONT-04 migrates the origin in Phase 3 anyway |
| `ctx7` CLI / Context7 MCP | library docs | ✗ | — | Used WebFetch against official docs + direct source reads (higher fidelity here, since the primary subject is a local repo) |
| `wrangler` | — | ✗ | — | Not needed; the D-02 fence excludes it |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `ctx7` (WebFetch + source reading used instead);
r2.dev reachability (LQIP/dimension-driven placeholders).

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`.

Phase 0 has no application code and therefore no unit-test framework of its own. Its
"tests" are the four measurement scripts, which are genuine pass/fail gates and belong in
VALIDATION.md as such.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None in this repo** — `package.json` does not exist at the portfolio root yet. Measurement is by Node scripts + Playwright inside `.playground/` |
| Config file | none — see Wave 0 |
| Quick run command | `cd .playground && npx astro build && node check-bundle.mjs && node check-theme-exhaustive.mjs` |
| Full suite command | `cd .playground && npx astro build && node check-bundle.mjs && node check-theme-exhaustive.mjs && node probe.mjs && bash check-no-js.sh` |

*(For reference, `../design-system` runs Vitest 4 + Playwright 1.59 + Storybook test-runner;
Phase 1 inherits that infrastructure. Phase 0 deliberately does not stand up a test
framework in the portfolio repo — that is Phase 2's FND-06.)*

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSGN-04 | A `client:*` island importing one DS component contains no ProseMirror/TipTap/lowlight/dnd-kit | integration (build) | `node .playground/check-bundle.mjs` | ❌ Wave 0 |
| DSGN-04 | A page with no `client:*` directive emits zero `<script>` tags | integration (build) | `bash .playground/check-no-js.sh` | ❌ Wave 0 |
| DSGN-04 | Charcoal resolves identically across 4 import orders × 2 modes × 2 `inlineStylesheets` settings | e2e (browser) | `node .playground/probe.mjs` | ❌ Wave 0 |
| DSGN-04 | The D-33 manifest yields a measured public CSS byte count | integration (build) | `node .playground/check-css-size.mjs` | ❌ Wave 0 |
| DSGN-05 | Every charcoal light-block token is restated in the dark block | unit (static) | `node .playground/check-theme-exhaustive.mjs` | ❌ Wave 0 |
| DSGN-05 | Every family named in a `--font-*` token has a matching `@font-face` family | unit (static) | `node .playground/check-font-names.mjs` | ❌ Wave 0 |
| DSGN-05 | The proposed `themes/*.css` and `fonts/*.css` `exports` subpaths resolve in a real build | integration (build) | `cd .playground && npx astro build` (stub package fixture) | ❌ Wave 0 |
| DSGN-05 | Charcoal light `muted` and `ochre` clear 4.5:1 on `#F4F1EA` | unit (static) | `node .playground/check-contrast.mjs` — port the ratio helper from `../design-system/src/tokens.test.ts` | ❌ Wave 0 |
| DSGN-01 | Every screen × state cell is `designed` / `inherits` / `n/a` | manual-only | contact-sheet coverage table review | n/a |
| DSGN-02 | Both templates render against real drafted copy, not lorem | manual-only | visual review of `/case/long` and `/case/short` | n/a |
| DSGN-03 | Work and Photos carry no ivory token values | unit (static) | `grep -rE '#F4F1EB\|#FFFEFB\|#E6E0D2\|#8D8779' .playground/src && exit 1 \|\| exit 0` | ❌ Wave 0 |
| DSGN-06 | Every `[NEEDS AKHIL]` marker is followed by ≥ 40 words of placeholder prose (D-40 length realism) | unit (static) | `node .playground/check-copy-length.mjs` | ❌ Wave 0 |

**Manual-only justification:** DSGN-01 and DSGN-02 are design-judgement deliverables. The
*coverage* of DSGN-01 is machine-checkable (generate the matrix from each screen's `STATES`
array and assert no cell is unaccounted for); the *quality* is not.

### Sampling Rate

- **Per task commit:** `npx astro build && node check-theme-exhaustive.mjs` (< 5 s once
  `node_modules` is warm — the spike built two pages in 606 ms)
- **Per wave merge:** full suite including `probe.mjs`
- **Phase gate:** full suite green, `00-FINDINGS.md` populated with triage tiers, and
  `test ! -d .playground` after the deletion task

### Wave 0 Gaps

- [ ] `.playground/` scaffold: `package.json`, `astro.config.mjs`, tarball install — covers all
- [ ] `.playground/check-bundle.mjs` — covers DSGN-04 (tree-shaking)
- [ ] `.playground/check-no-js.sh` — covers DSGN-04 (zero-JS)
- [ ] `.playground/probe.mjs` + `src/pages/probe/casc-{a,b,c,d}.astro` — covers DSGN-04 (cascade)
- [ ] `.playground/check-theme-exhaustive.mjs` — covers DSGN-05 (the load-bearing invariant)
- [ ] `.playground/check-font-names.mjs`, `check-contrast.mjs`, `check-css-size.mjs` — covers DSGN-05
- [ ] `.playground/check-copy-length.mjs` — covers DSGN-06
- [ ] Fixture: stub package with the proposed `exports` map — covers DSGN-05 (packaging)
- [ ] Framework install: `npm i playwright` in `.playground` (Chromium already cached; the
      headless shell was downloaded during this research)

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section is
included. Phase 0 writes no application code, accepts no input, and stores no data, so most
categories are structurally inapplicable — but two of the artefacts it produces are
security-load-bearing for later phases, and one supply-chain surface is live now.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (design only) | The 401 re-auth state (D-19) is *designed* here; AUTH-01…04 implement it in Phase 2 |
| V3 Session Management | no (design only) | Cloudflare Access owns the session; the admin sketches must not depict a local "remember me" or any client-held credential |
| V4 Access Control | no | No routes exist |
| V5 Input Validation | **indirectly — yes** | D-18's lenient-draft/strict-publish design and D-20's structured segments are the *designs* that make CONT-01 and CONT-03 implementable. Getting D-20 wrong here (e.g. sketching a "paste HTML" affordance) would reintroduce the legacy stored-XSS class by design |
| V6 Cryptography | no | Nothing is signed or encrypted this phase |
| V14 Configuration / Supply Chain | **yes** | Every package installed into `.playground/` is a live supply-chain surface — see the Package Legitimacy Audit. `slopcheck -e npm` returned `[OK]` on all 9 |

### Known Threat Patterns for this phase's stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slopsquatted npm package installed into the playground | Tampering / Elevation | `slopcheck install -e npm` before install; all 9 packages verified `[OK]` and all have ≥ 84K weekly downloads and a real source repo |
| Malicious `postinstall` in a transitive dependency | Elevation | `npm view <pkg> scripts.postinstall`; none of the 9 direct dependencies declares one |
| Designing a `dangerouslySetInnerHTML`-shaped affordance into the admin | Tampering (stored XSS) | **D-20 designs the class out**: bullets are `{text}` / `{text, emphasis}` segments, never HTML strings. The `RichText` sketch (D-21) must serialise to segments, and the sketch should make that visible so Phase 7 cannot "simplify" it back to HTML |
| Sketching a permissive auth fallback (e.g. a "dev mode" bypass on the 401 screen) | Spoofing | The legacy `access.ts` cookie-presence fallback is exactly this failure. The D-19 re-auth sketch shows *deny + re-authenticate*, never *degrade* |
| Leaking `pub-*.r2.dev` URLs or real secrets into committed sketch fixtures | Information Disclosure | Fixtures use the existing public photo URLs only; no secret is needed by any Phase 0 artefact |
| The playground surviving into production | Elevation | It has no adapter and no CI. Deletion is a verified task |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The naive admin artefact count (~108) reduces to ~35 under the state-scoping analysis | Admin IA & Combinatorial Analysis | If the reduction is rejected as violating D-03's "exhaustively," the phase is materially larger than planned and the split becomes mandatory rather than advisable. **This is the single highest-value item to confirm with Akhil before planning.** |
| A2 | `/admin/projects/[id]` is a distinct 7th screen | Admin IA | D-24 implies it ("opening one edits its card fields and its case study together") but D-05 lists six routes. If it is meant to be a panel inside `/admin/projects`, the IA changes |
| A3 | Option A (re-export Fontsource CSS, 8 `@font-face` rules) is preferable to Option B (hand-authored, 4 rules, literally latin-only) | Charcoal Theme API Mechanics | D-30 says "latin subset only." If that is read strictly, Option B is required and the plan needs an extra task to verify Vite's `url()` resolution of bare specifiers inside CSS |
| A4 | Prototyping the charcoal theme inside the playground (not in `../design-system/src`) satisfies DSGN-04 | Architecture Patterns → Pattern 3 | If DSGN-04's "validated against actual components" is read to require the real published subpath, Phase 0 must edit `../design-system` and `postbuild.mjs`, which pulls Phase 1 work forward |
| A5 | The token-ownership allowlist in §D-31 correctly classifies `--text-*` as sizing (DS-owned) and `--weight-*` as typography (theme-owned) | Charcoal Theme API Mechanics | A misclassification either blocks a legitimate charcoal expression or opens the erosion D-31 warns about. Needs Akhil's sign-off, since D-31 explicitly asks for precision |
| A6 | Photo images will load from `pub-*.r2.dev` during Phase 0 sketching | Environment Availability | Not probed during this research (the origin is documented as rate-limited). If it fails, sketches fall back to LQIP + `dimensions`, which is visually weaker for DSGN-03 review |
| A7 | The five-project count (D-38) does not break the handoff's 2×2 home grid | Open Questions → OQ-1 | See OQ-1 — this is a real design gap, not a certainty |
| A8 | 50 KB gzip is the right pass threshold for a public island chunk | Code Examples → MEASURE-1 | Derived from the Lighthouse 95+ goal and PUB-14, not from a stated budget. The number should be confirmed or replaced before it becomes a gate |

---

## Open Questions

1. **OQ-1 — The home page's Act-2 grid holds four projects; there are five.**
   - What we know: `design_handoff_portfolio/README.md` specifies Act 2 as *"2×2 grid of
     project entries (gap 40px 56px)"* naming Design System, hued, Momentum and TimeShift —
     **Cairn is absent**, and the design system's blurb says "55 components." D-38 locks five
     projects, D-44 restructures Work into two bands, and D-45 adds status badges.
   - What's unclear: whether Home shows all five (breaking 2×2), shows a curated four with
     "ALL WORK →" carrying the fifth, or moves to a different layout. This is Home, which
     DSGN-03 does not cover (it covers Work and Photos) and PUB-01 owns in Phase 5 — so it
     currently has **no owner in Phase 0** despite Phase 0 being the design phase.
   - Recommendation: add it to DSGN-03's scope as a one-sketch decision, or record it
     explicitly as a Phase 5 deferral in the plan. Leaving it implicit means Phase 5
     improvises a layout the handoff never specified.

2. **OQ-2 — Where does the playground live, and is it committed?**
   - What we know: D-02 mandates deletion at phase exit. `commit_docs: true` in config.
   - What's unclear: `.playground/` gitignored (no history, clean deletion, but no record) vs
     committed-then-`git rm` (reviewable in history, and therefore recoverable — which is
     exactly what the fence is trying to prevent).
   - Recommendation: gitignore the playground; commit only `screenshots/` and the four
     measurement scripts (which are the reusable artefacts) into the phase directory. The
     scripts have value for Phase 1 and Phase 5's bundle gate; the sketches do not.

3. **OQ-3 — Does DSGN-04 also need admin sketches, or only public ones?**
   - What we know: D-08 justifies charcoal-light admin partly *because* it "keeps DSGN-04's
     component coverage wide (forms, tables, dialogs, error summaries, steppers)". D-32 says
     "Phase 0's job is only to prove the shape — render admin sketches at compact density and
     log what the DS lacks."
   - What's unclear: this couples DSGN-04's completion to DSGN-01's sketches, which is
     precisely the coupling the phase-split recommendation would break.
   - Recommendation: if the phase is split, 0a's DSGN-04 covers *public* components plus a
     deliberate thin slice of admin surfaces (one form, one dialog, one table, one error
     summary) sufficient to exercise density and the form components; 0b's admin sketches
     then append to the same `00-FINDINGS.md`. State this explicitly or the split leaves
     DSGN-04 ambiguous.

4. **OQ-4 — Does `Sortable`'s keyboard fallback meet D-22's bar?**
   - What we know: `src/interaction/Sortable/index.tsx` wires dnd-kit's `KeyboardSensor` with
     `sortableKeyboardCoordinates`, so items *move* by keyboard. It does **not** pass dnd-kit's
     `announcements` or `screenReaderInstructions` to `DndContext`, so nothing is announced.
     `[VERIFIED: grep of the component source]`
   - What's unclear: whether "adequate" for D-22 means movement or movement + announcement.
   - Recommendation: file it in `00-FINDINGS.md` at tier `should-fix-in-Phase-1` — dnd-kit
     supplies the announcer, so the upstream fix is small.

5. **OQ-5 — Does `data-density="compact"` need to exist for Phase 0's admin sketches?**
   - What we know: D-32 says density ships with the Phase 06.1 release, and Phase 0 only
     "proves the shape." But D-08 requires the admin to *look* denser to be judged.
   - What's unclear: whether the sketches apply a playground-local prototype of the density
     token overrides (which is not a portfolio workaround — the playground is throwaway) or
     are sketched at default density with density noted as pending.
   - Recommendation: prototype it in the playground under `[data-density="compact"]` with a
     comment naming DS-11 as the owner. It is the only way to log "what the DS lacks" with
     evidence, and the throwaway status means it cannot become the workaround D-32 forbids.

---

## Sources

### Primary (HIGH confidence)

- **Live measurement** — a real `astro@7.2.2` + `@astrojs/react@6.0.2` + `react@19.2.8`
  build consuming `@akhil-saxena/design-system@1.11.4` as an `npm pack` tarball, executed
  during this research: tree-shaking, zero-JS, cascade probe, font/CSS byte counts, the
  `css/*.css` resolution failure, three attempted tree-shaking fixes
- `../design-system/` — `package.json` (exports, peers, `sideEffects`), `tsup.config.ts`,
  `scripts/postbuild.mjs`, `scripts/split-css.mjs`, `src/tokens.css` (`:root.dark, .dark` at
  278-279; 16 `@fontsource` imports), `src/tokens.test.ts`, `src/packaging.test.ts`,
  `src/index.ts` (85 export statements), all 86 component sources (hook audit),
  `dist/index.js` + `dist/css/` (74 sheets), `README.md`, `CHANGELOG.md` (43 KB),
  `.planning/PROJECT.md`
- `astro@7.2.2` npm tarball — `dist/core/build/runtime.js` (`cssOrder`),
  `dist/core/build/graph.js` (`getParentExtendedModuleInfos`),
  `dist/core/build/plugins/plugin-css.js` (`generateBundle`, `appendCSSToPage`),
  `dist/types/public/config.d.ts` (the `fonts` API)
- Fontsource tarballs unpacked and inspected: `@fontsource-variable/playfair-display@5.3.0`,
  `@fontsource-variable/dm-sans@5.3.0`, `@fontsource/ibm-plex-mono@5.3.0`,
  `@ibm/plex-mono@2.5.0`
- npm registry — `npm view` for all versions; registry API for creation dates, repos and
  download counts; the `@fontsource-variable/ibm-plex-mono` 404
- `git show legacy/nextjs-portfolio:src/components/admin/PropertiesPanel.tsx` — 937 lines,
  13 `Selection` variants, 39 form controls, the focal-point pan control
- This repo — `CLAUDE.md`, `.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE,config.json}`,
  `.planning/codebase/ARCHITECTURE.md`, `.planning/research/SUMMARY.md`,
  `.planning/phases/00-design-ideation/00-CONTEXT.md`, `data/*.json`,
  `design_handoff_portfolio/README.md`
- `../cairn` (`.planning/PROJECT.md`, `.planning/REMOVED.md`, 873 commits), `../Momentum`
  (396), `../TimeShift` (59), `../hued` (19)
- `slopcheck install -e npm` on all 9 recommended packages

### Secondary (MEDIUM confidence)

- `docs.astro.build/en/guides/styling/` — the documented cascading order (link < imported <
  scoped) and "last one imported wins"; corroborated by reading `cssOrder()` in source
- `docs.astro.build/en/reference/configuration-reference/` — `build.inlineStylesheets`
  default `'auto'`, 4 kB threshold; corroborated by the measured build
- `docs.astro.build/en/guides/integrations-guide/react/` — installation and options
- `github.com/withastro/roadmap` issue 540 ("CSS Ordering", closed/merged 2023-04-25) — the
  RFC that produced the current category ordering, including the verbatim *"due to chunking
  of shared dependencies, we cannot guarantee that CSS ordering will be correct"*

### Tertiary (LOW confidence)

- Web search results on IBM Plex Mono variable-font availability upstream (IBM/plex GitHub
  releases). Only used to explain *why* Fontsource lacks the package; the operative claim —
  that no npm variable package exists — is a HIGH-confidence 404
- Community reports of Astro CSS-order surprises (issues 3357, 4393, 6029, 6975, 10065,
  11950). Directionally corroborating; superseded for this project by the direct source read
  and the measured probe

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| The three D-02 measurements | **HIGH** | Taken in a real Astro 7 build during this research, with a sentinel edit confirming build freshness and three independent negative controls on the tree-shaking result |
| Charcoal theme API mechanics | **HIGH** | Specificity verified against the actual `tokens.css` selectors; the exhaustiveness invariant demonstrated with measured computed values; font packages unpacked and inspected; the IBM Plex Mono correction is a registry 404 |
| Playground harness | **HIGH** | Stood up end-to-end and built successfully; the tarball-is-a-copy and single-React properties were verified, not assumed |
| Standard stack versions | **HIGH** | `npm view` on 2026-08-17; all 9 packages `slopcheck [OK]` on the correct ecosystem |
| Admin IA field catalog | **HIGH** | Counted from the recovered 937-line source |
| Admin artefact count / the reduction | **MEDIUM** | The naive 108 is arithmetic from D-03/D-05/D-09; the ~35 reduction is a judgement about state scope that Akhil should confirm (A1) |
| Case-study derivability | **HIGH** | Every repo inspected directly — planning docs, READMEs, commit counts |
| Phase-split recommendation | **MEDIUM** | The scheduling argument (Phase 1 blocked by 3 of 6 requirements) is HIGH; whether to act on it is the orchestrator's call |
| Security domain | **MEDIUM** | Mostly inapplicable by construction; the supply-chain portion is HIGH (slopcheck-verified) |

**Research date:** 2026-08-17
**Valid until:** 2026-09-16 (30 days) for the design/IA/copy analysis.
**7 days** for the stack numbers — Astro 7.2.2 published 2026-08-13 and Vite 8 / Rolldown
tree-shaking is actively changing. **Re-run `check-bundle.mjs` at the start of Phase 1 and
again at Phase 5's bundle gate**; a Rolldown improvement could alter the DS-09 verdict, and
that verdict is currently sized to change Phase 1's scope.
