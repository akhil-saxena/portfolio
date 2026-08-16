# Phase 0: Design & Ideation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 0-design-ideation
**Areas discussed:** Sketch & wireframe medium, Admin CMS architecture, Charcoal theme public API, Case studies & copy

---

## Sketch & Wireframe Medium

### Artefact pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Two tiers + kitchen sink | Low-fi wireframes plus one consolidated DS sketch page | |
| Everything is a DS sketch | Every screen is throwaway code importing the real package | ✓ |
| Low-fi admin, DS for the rest | Cheap wireframes for the admin void, DS sketches elsewhere | |

**User's choice:** Everything is a DS sketch
**Notes:** Maximum validation — gaps surface in real composition rather than isolation. Consistent with Core Value.

### Sketch harness

| Option | Description | Selected |
|--------|-------------|----------|
| Throwaway Astro playground | Mirrors the Phase 2 stack; consumes DS as a packed tarball | ✓ |
| Throwaway Vite + React app | Real bundler, simpler, no risk of becoming production | |
| DS repo Storybook | Zero setup, existing a11y and visual-regression harnesses | |

**User's choice:** Astro playground, after asking Claude to recommend
**Notes:** Claude recommended Astro on three grounds — DS-09 tree-shaking (Vite would suffice), the unverified zero-JS `forwardRef` static-render claim (Astro only), and the (0,2,0) cascade tie where Astro does not guarantee CSS ordering across `.astro` and React imports (Astro only, and decisive). Scope-creep risk fenced by: no adapter, no CI, no `/api`, no auth, deleted at phase exit. Claude also flagged a DSGN-05 ↔ DSGN-04 loop, resolved by sketches carrying a hand-written `charcoal-draft.css` — DSGN-04 validates DSGN-05 rather than blocking on it.

### State coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Structurally distinct only | Sketch a state only when layout or component choice changes | |
| Happy path only | One sketch per screen, states described in prose | |
| Every state, exhaustively | Empty, loading, error, dirty, conflict, success per screen | ✓ |

**User's choice:** Every state, exhaustively
**Notes:** Accepted the sketch-count multiplier to surface DS gaps in error/validation components now rather than in Phase 7.

### Findings destination

| Option | Description | Selected |
|--------|-------------|----------|
| FINDINGS.md + triage tiers | Markdown file with blocks-Phase-5 / should-fix-in-Phase-1 / backlog | ✓ |
| GitHub issues in DS repo | Findings live where the fix happens | |
| FINDINGS.md, mirrored at exit | Both, mirrored at phase exit | |

**User's choice:** FINDINGS.md + triage tiers
**Notes:** Gives Phase 1's planner an explicit scope boundary rather than an open-ended list.

---

## Admin CMS Architecture

### Navigation model

| Option | Description | Selected |
|--------|-------------|----------|
| Route-per-entity sidebar | /admin/home, /photos, /resume, /projects, /site | ✓ |
| Keep the 3 tabs | home / photography / dev, as in the legacy app | |
| Mirror the public routes | Admin nav mirrors the live site exactly | |

**User's choice:** Route-per-entity sidebar
**Notes:** Case studies get a real home instead of being wedged into the legacy "dev" tab.

### Preview pane

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side, live | Form left, rendered output right, updating as you type | |
| Toggle to full preview | Form full width; a toggle swaps to the public view | ✓ |
| Live where cheap, toggle where not | Split by cost per entity | |

**User's choice:** Toggle to full preview
**Notes:** Gives résumé's nested arrays room and sidesteps split-pane responsive design.

### Publish and drafts

| Option | Description | Selected |
|--------|-------------|----------|
| Review step, then commit | Changed-files summary with per-file diffs, then commit | |
| One button, log modal | Commit immediately, stream the build log | |
| Per-screen save, global publish | Pending state, one Publish — flagged as needing a store | |

**User's choice:** *Free-text override* — "keep pending state/draft, with a real db in cf backend"
**Notes:** Claude had flagged option 3's storage problem (no runtime filesystem; localStorage or a git branch). The user solved it with a real Cloudflare datastore instead. Claude recommended D1 over KV (eventual consistency would break read-after-write on your own draft) and over Durable Objects (overkill for one user), and named the downstream impacts before proceeding: PROJECT.md's constraint needs rewording, Phase 2 grows a binding and will trip the schema-push gate, Phase 7 grows draft CRUD, the auth boundary widens, and a "draft is a layer, never a fork" rule is required. Claude also noted the unanticipated benefit: the draft row can store the blob SHA it was based on at save time, making 409 detection accurate — a root-cause fix for the legacy `baseSha: "latest"` bug.

### What drafts

**User's choice:** *Free-text* — "keep photos too in draft"
**Notes:** Claude reconciled this with the already-locked R2 staging pipeline: upload stages the binary to R2 and writes a pending row referencing the key; Publish fires `workflow_dispatch`. Consequence surfaced — Publish becomes asynchronous for photos.

### Publish confirmation

**User's choice:** *Free-text* — "publish should just show a modal with list of items changed, or a preview of site after changes, and confirm publish action"

### Photo pipeline progress

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent status strip | App-shell strip surviving navigation | |
| Modal stays open, per-photo rows | Progress view inside the confirm modal | |
| Strip, plus a photo-screen column | Both, with inline state on affected tiles | ✓ |

**User's choice:** Strip, plus a photo-screen column
**Notes:** Most sketching work of the three; two surfaces that must agree.

### Résumé bullet format

| Option | Description | Selected |
|--------|-------------|----------|
| Restricted markdown | `**bold**` through a sanitizing parser with a tiny allow-list | |
| Structured segments | Token arrays rendered as React elements; no HTML string exists | ✓ |
| Plain text | No formatting at all | |

**User's choice:** Structured segments
**Notes:** Claude grounded the options by measuring the actual file — only `<strong>` is used across `resume.json`, and it is used on the metrics recruiters scan for. Structured segments design the injection class out rather than filtering it.

### Bullet authoring UX

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown in, segments out | Type `**bold**`, parse to segments on save | |
| DS rich-text input | The design system's RichText with bold as the only mark | ✓ |
| Text field + bold toggle | Direct segment editing, no syntax | |

**User's choice:** DS rich-text input
**Notes:** Dogfoods a DS component the public site would never exercise.

### Photo ordering

| Option | Description | Selected |
|--------|-------------|----------|
| One global order | Single array order; filtering hides non-matching | |
| Global + per-category override | Global default, per-category order wins when filtered | ✓ |
| Per-category only | Order always scoped to a category | |

**User's choice:** Global + per-category override
**Notes:** Claude reported that the DS exports `Sortable`/`SortableDndContext`/`SortableItem` with `onReorder`, so the drag-vs-buttons question was settled by Core Value rather than asked. Keyboard-fallback adequacy became a FINDINGS.md check.

### Hero crop control

| Option | Description | Selected |
|--------|-------------|----------|
| Drag focal point on preview | Drag a marker on the photo in a real 3:2 frame | ✓ |
| Sliders with live 3:2 preview | Two RangeSliders driving a live preview | |
| Presets, with a fine-tune escape | Nine-point grid plus numeric override | |

**User's choice:** Drag focal point on preview
**Notes:** Grounded by measurement — only 1 of 6 peek photos has a custom position, and its value (`50% 25%`) could not have come from a preset grid. The DS has no crop picker; this becomes a FINDINGS.md entry.

### Validation model

| Option | Description | Selected |
|--------|-------------|----------|
| Lenient draft, strict publish | Drafts save incomplete; publish blocks on schema | ✓ |
| Strict on every save | A draft cannot be saved unless it validates | |
| Publish-time only | Drafts entirely freeform | |

**User's choice:** Lenient draft, strict publish

### Discard behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Per-screen and global | Both a per-entity revert and a Discard All | ✓ |
| Global only | One Discard All | |
| Per-screen only | No bulk action | |

**User's choice:** Per-screen and global

### Admin landing route

| Option | Description | Selected |
|--------|-------------|----------|
| Pending-changes dashboard | Pending items, pipeline state, last publish, Publish | ✓ |
| Redirect to first entity | /admin sends you to /admin/home | |
| Site preview as home | Preview with pending changes applied | |

**User's choice:** Pending-changes dashboard
**Notes:** Claude reframed the originally-planned "first-run empty admin" question as unproductive — content is already populated, so the real empty states are no-pending-changes, an empty category, and an unwritten case study.

### Admin theming

| Option | Description | Selected |
|--------|-------------|----------|
| Charcoal throughout | Admin and public share one identity | |
| Stock DS theme in admin | The admin is a tool and looks like one | |
| Charcoal, light mode default | Charcoal tokens, light default, denser spacing | ✓ |

**User's choice:** Charcoal, light mode default
**Notes:** Claude flagged that this makes Phase 1's light-mode contrast fixes load-bearing for the admin, raising their priority rather than adding scope.

### Save model

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced autosave | Persist a beat after typing stops | |
| Explicit save per screen | A Save button per entity | |
| Autosave with save points | Autosave plus an explicit "mark as ready" | ✓ |

**User's choice:** Autosave with save points
**Notes:** Claude flagged the consequence — three states per entity (draft / ready / published) must be legible on the screen, the sidebar badge and the dashboard, multiplying the sketch count alongside exhaustive states.

### Session expiry

| Option | Description | Selected |
|--------|-------------|----------|
| Detect, prompt, resume in place | 401 on autosave triggers re-auth keeping state | ✓ |
| Let Access redirect | Standard Cloudflare bounce | |
| Warn before expiry | Banner with a Stay signed in action | |

**User's choice:** Detect, prompt, resume in place

### Résumé PDF drift

| Option | Description | Selected |
|--------|-------------|----------|
| Drift warning on résumé screen | Warn when resume.json is newer than the PDF | ✓ |
| Upload field, no drift check | Replace the file, sync is your job | |
| Block publish on drift | Publish refuses until the PDF is re-uploaded | |

**User's choice:** Drift warning on résumé screen

### Projects and case studies IA

| Option | Description | Selected |
|--------|-------------|----------|
| Project owns its case study | One screen edits card fields and case study together | ✓ |
| Separate routes, linked | Peers, with a project picker on the case study | |
| Projects under Résumé | Projects stay a résumé section, matching the data | |

**User's choice:** Project owns its case study
**Notes:** Claude grounded this by finding that `projects` lives inside `resume.json` but drives the public Work page. The choice implies extracting `projects.json` — a migration decided here rather than discovered in Phase 3.

### Photo category ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical list, admin-managed | id, display label, column count, edited on /admin/site | ✓ |
| Fixed set in schema | Closed enum with display labels | |
| Admin-managed, no delete | Add and rename only | |

**User's choice:** Canonical list, admin-managed
**Notes:** Claude surfaced the existing drift — photos store `architecture` lowercase while `site_config.categoryColumns` keys `Architecture`. Separating id from display label fixes it by construction.

### Responsive scope

| Option | Description | Selected |
|--------|-------------|----------|
| Phone-capable for light edits | Sheet sidebar; crop picker and case-study authoring desktop-only | ✓ |
| Desktop only | One layout, hard minimum width | |
| Fully responsive | Every screen at every width | |

**User's choice:** Phone-capable for light edits

### Conflict resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Per-file reload or overwrite | Resolve file by file with a diff view | ✓ |
| Auto-rebase, flag the rest | Silent merge when records do not collide | |
| Reload everything | Any conflict re-bases all pending changes | |

**User's choice:** Per-file reload or overwrite

---

## Charcoal Theme Public API

### Scope selector

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit compound selectors | `:root[data-brand="charcoal"].dark` at (0,3,0) beats `:root.dark` | ✓ |
| CSS cascade layers | Declared layer order, immune to source order | |
| Layers plus compound selectors | Both, belt and braces | |

**User's choice:** Compound selectors now, layers as their own release
**Notes:** This was the most contested decision. Claude initially recommended compound selectors on consumer-breakage grounds. **The user challenged it** — "aren't we adding a change to design system itself so that we use the DS correctly?" — and was right on two counts: the consumer argument was overweighted (consumers are the portfolio and Cairn, both the user's, confirmed via `CAIRN-CONSOLIDATION.md`), and **both options are upstream DS changes, so Core Value does not discriminate between them**. Claude corrected the reasoning and re-recommended on a different basis: keeping a global cascade migration out of a release already carrying the font split and contrast fixes, so a visual regression stays attributable. Claude also noted that the admin's denser spacing makes density a fourth axis, which strengthens the case for layers eventually. The user resolved it with a third path not originally offered as the recommendation — compound selectors in Phase 1, layers in a dedicated later release.

### Font delivery split

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens and faces as separate entries | theme-charcoal.css + fonts-charcoal.css | ✓ |
| One entry per theme | A single charcoal.css with tokens and fonts | |
| Per-family subpaths | Consumer composes each family | |

**User's choice:** Tokens and faces as separate entries, after asking Claude to recommend
**Notes:** Claude recommended on three grounds — it fixes the axis rather than the instance (one-entry-per-theme replicates the coupling inside each theme), its failure mode is loud rather than silent (per-family subpaths fail one family at a time, which is the DS-05 trap), and per-family control saves only a small mono file that `font-display: swap` keeps off the critical path anyway.

### Font format

**User's choice:** *Free-text confirmation* — "yes variable fonts is good. latin subset is also okay"
**Notes:** Proposed by Claude as discretion items rather than a separate question, since the stated problem is font count (~73 `@font-face` rules) and variable fonts collapse a family to roughly one rule.

### Token surface a brand owns

| Option | Description | Selected |
|--------|-------------|----------|
| Colour, type, and geometry accents | Plus radius, shadow, border weight — not spacing | ✓ |
| Colour and typography only | Narrowest contract | |
| The full token surface | Anything tokenised, spacing included | |

**User's choice:** Colour, type, and geometry accents

### Density mechanism and CSS assembly

**User's choice:** *Free-text delegation* — "use denser layout and whatever you think best"
**Notes:** Claude decided both and recorded them as decisions: `data-density="compact"` as a DS-level axis rather than portfolio CSS (an `.admin` spacing override would be the workaround Core Value forbids), shipping with the layers release since density is the fourth cascade axis that justifies it; and a hand-maintained CSS manifest file, chosen because it satisfies both hard constraints with zero tooling so the sketches produce a real measured number this phase.

### No-flash script ownership

| Option | Description | Selected |
|--------|-------------|----------|
| DS ships it, app inlines it | Exported snippet, inlined by the consumer | |
| App writes its own | Purely a consuming-app concern | |
| DS ships a real no-flash module | Documented entry point handling storage, fallback, motion, brand | ✓ |

**User's choice:** DS ships a real no-flash module

### Packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Subpath exports, same package | /themes/charcoal.css alongside existing exports | ✓ |
| Separate theme package | Independent versioning with a peer dependency | |
| Bundled into main entry | Inside the existing tokens.css | |

**User's choice:** Subpath exports, same package

### Versioning and the Cairn break

| Option | Description | Selected |
|--------|-------------|----------|
| Major version, default fonts kept | v2.0.0 with fonts/default.css preserved | ✓ |
| Minor version, deprecation window | Keep the rules, deprecate, remove later | |
| Major version, fonts dropped | v2.0.0 shipping faces only for charcoal | |

**User's choice:** Major version, default fonts kept
**Notes:** Claude raised this as a definite break rather than a hypothetical one, having confirmed Cairn depends on `tokens.css` for fonts today.

### Visual regression coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Representative subset | Components where a brand theme can break something | |
| Full parity with default | Every component, both modes | ✓ |
| Contrast tests only | Rely on tokens.test.ts alone | |

**User's choice:** Full parity with default

### Nested dark preview

| Option | Description | Selected |
|--------|-------------|----------|
| Iframe preview | Preview gets its own document root | |
| Charcoal ships a scoped form too | A non-root variant for nested containers | |
| Preview follows admin mode | Nothing nests | ✓ |

**User's choice:** *Free-text correction* — "admin and website both support dark and light. so preview follows admin works fine"
**Notes:** Claude had raised this as a gap created by the compound-selector decision — `:root[data-brand="charcoal"].dark` only matches `<html>`, so a nested dark preview inside a light admin would not resolve. The user's correction dissolved the problem entirely: since both surfaces support both modes, checking dark means toggling the admin. This removed a requirement from charcoal's public API, keeping scoping at three rule blocks.

---

## Case Studies & Copy

### Case study scope

| Option | Description | Selected |
|--------|-------------|----------|
| All five, DS is the flagship | Five case studies, design system written strongest | ✓ |
| Four products, DS proven by the site | DS stays a one-liner; the site is its case study | |
| Depth where there is a story | Full studies only where a narrative exists | |

**User's choice:** All five, DS is the flagship
**Notes:** Claude surfaced a documentation discrepancy — PROJECT.md and ROADMAP.md say "four own projects" but `resume.json` has five, and the design-system entry is stale (auto-generated id, "77-component" when it is now 80). *Correction, 2026-08-17: Claude also described the `design-system-ed1.pages.dev` URL as dead. It is not — it returns HTTP 200 and is the DS README's own Storybook badge link. All other items were confirmed and fixed.*

### Substance sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Repos, with gaps flagged | Draft from code, mark [NEEDS AKHIL] where underivable | |
| Repos plus a short interview | Code for decisions, interview for why and outcome | ✓ |
| Repos only, best effort | Infer motivation and outcome | |

**User's choice:** *Modified* — "repos + short interview, but interview comes at last phase"
**Notes:** Claude confirmed all five repos are available locally and named the limit — code shows what was decided, rarely why, and never the outcome. Claude flagged that deferring the interview makes length-realism critical: a six-word stub where a paragraph belongs defeats DSGN-06's stated purpose of letting build phases work against real text lengths. Also surfaced that the final phase gains a copy-finalisation pass it does not currently have.

### Template structure

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed skeleton, flexible middle | Same open and close, expanding decisions section | |
| Fixed length, all five | Same section count and length throughout | |
| Tiered by depth | Long form for DS and Cairn, short form for the rest | ✓ |

**User's choice:** Tiered by depth

### Imagery

| Option | Description | Selected |
|--------|-------------|----------|
| Hero image, text otherwise | One strong image per case study | |
| Hero plus inline screenshots | Plus one or two shots where showing beats describing | ✓ |
| No imagery, typography only | Pure editorial | |

**User's choice:** Hero plus inline screenshots

### Asset pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Simple R2 asset path | Direct upload to R2 under assets/, dimensions at upload | ✓ |
| Reuse the photo pipeline | sharp variants, WebP, LQIP | |
| Committed to the repo | public/, versioned with content | |

**User's choice:** Simple R2 asset path
**Notes:** Claude noted the photo pipeline composites a watermark and extracts EXIF, neither appropriate for a screenshot, and that `/api/upload-asset` → R2 `assets/*` is existing precedent.

### One-liner voice

| Option | Description | Selected |
|--------|-------------|----------|
| Idea first, then one hard fact | Plain-language purpose, then a concrete detail | ✓ |
| Lead with the opinion | Open with the distinctive decision | |
| Feature-forward | State plainly what each does | |

**User's choice:** Idea first, then one hard fact
**Notes:** Claude showed the current five are inconsistent — Cairn leads with an opinion, hued opens poetically, Momentum and the design system are plain feature lists.

### Work page structure

| Option | Description | Selected |
|--------|-------------|----------|
| Two bands: employment, then projects | Different kinds of evidence, presented differently | ✓ |
| One list, projects first | Everything on one plane, own work leading | |
| One list, chronological | Interleaved by date | |

**User's choice:** Two bands: employment, then projects

### Recency signalling

| Option | Description | Selected |
|--------|-------------|----------|
| Status only, no dates | Extend badges with Live / Maintained / Archived | ✓ |
| Dates and status | Built date plus current status | |
| Neither | Evergreen, no temporal claims | |

**User's choice:** Status only, no dates

---

## Claude's Discretion

- Sidebar per-entity badge distinguishing draft from ready — forced by the three-state save model.
- Résumé PDF replacement uses the DS `FileInput`.
- Theme named `charcoal`; per-family weight ranges left to implementation, since variable fonts largely dissolve the question.
- Preview opens in the admin's current mode; dark-first on open noted as a nicety.
- Density mechanism (`data-density="compact"` at DS level) and CSS assembly (hand-maintained manifest) — both explicitly delegated by the user.

## Deferred Ideas

- Correct `PROJECT.md`'s "No runtime filesystem" constraint, superseded by the D1 draft store.
- Correct "four own projects" to five in `PROJECT.md` and `ROADMAP.md`; fix the stale design-system project entry.
- A separate design-system release after Phase 1 migrating CSS to `@layer` and adding the `data-density` axis. Must land before Phase 7. Not currently a roadmap phase.
- A coordinated Cairn update to consume design-system v2.0.0 with `fonts/default.css`. External to this roadmap.
- Automated CSS manifest generation from component usage, once a hand-maintained manifest exists to test against. Scope owner unsettled.
- A copy-finalisation pass in the final phase — the deferred interview plus editing drafts to final before cutover.

---

*No scope creep was redirected during this discussion — all threads stayed within Phase 0's design-artefact boundary. The cross-phase impacts above are consequences of in-scope decisions, not new capabilities proposed for this phase.*
