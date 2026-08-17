---
phase: 0
plan: 13
subsystem: design-ideation
tags: [dsgn-01, dsgn-04, admin, photos, d-03, d-12, d-15, d-18, d-22, d-25, density, compact, responsive, g-2, g-5, g-13, g-15, datagrid, sortable]

requires:
  - .playground/ harness (plan 01)
  - theme-charcoal.css + fonts-charcoal.css (plan 04)
  - manifest-admin.css (plan 07)
  - src/layouts/Admin.astro, src/lib/artefacts.mjs, src/styles/density-compact.css, check-states.mjs, check-no-js.sh (plan 12)
  - 00-ADMIN-IA.md (plan 03) and 00-UI-SPEC.md — the documents this screen sketches against
  - 00-RESPONSIVE-CONTRACT.md (off-plan) — binding, written after this plan
  - data/portfolio_images.json and data/site_config.json — the real content, counted this session
provides:
  - S-photos, E-photos, E-category-filtered, T-loading-list, T-error-inline — five artefacts from one route file
  - src/components/SortableReorder.tsx — the D-22 reorder island, one of exactly three sanctioned islands
  - src/fixtures/photos.json — all 39 real photos plus eight state variants
  - check-states.mjs generalised to N screens, so plans 14 and 15 add a line rather than a file
  - manifest-admin.css + 2 sheets — DataGrid's undeclared CSS dependencies
  - density-compact.css correction — two of plan 07's fifteen declarations were inert, measured
  - THE ADMIN SKETCH IDIOM, stated prescriptively below for plans 14 and 15
affects:
  - Phase 0 plans 14 and 15 (route shape, artefact claiming, form composition, empty-state voice, island rules)
  - Phase 0 plan 16 (transcribes the findings below into 00-FINDINGS.md; two artefacts here are claimed, not inherited)
  - Phase 0 plan 17 (screenshots eight real URLs on this screen)
  - Phase 06.1 / DS-11 / G-2 (three new unreachable control-geometry targets, all measured)
  - Phase 1 (six new design-system findings)
  - Phase 3 (two data-shape corrections that change what the migrations are written against)
  - Phase 7 (the list-vs-grid split, and why per-photo editing cannot live on a tile)

tech-stack:
  added: []
  patterns:
    - one file per screen at src/pages/admin/<screen>/[...state].astro, exporting getStaticPaths + SCREEN + STATES
    - a route may emit MORE paths than STATES declares, when an artefact has no coverage cell
    - measure the component in a browser before believing either the docs or the plan
    - a fixture exists to produce a state the real data cannot
    - global page styles, not scoped, on any page carrying an island
    - claim a treatment artefact where its most demanding host is, and say so, so siblings can inherit

key-files:
  created:
    - .playground/src/pages/admin/photos/[...state].astro (gitignored)
    - .playground/src/components/SortableReorder.tsx (gitignored)
    - .playground/src/fixtures/photos.json (gitignored)
  modified:
    - .playground/check-states.mjs (gitignored) — generalised from one route to a SCREENS list
    - .playground/src/styles/manifest-admin.css (gitignored) — +pagination, +iconbutton
    - .playground/src/styles/density-compact.css (gitignored) — plan 13 correction block, 4 rules

decisions:
  - "G-13 AS WRITTEN IS WRONG. `Sortable` passes no announcer, but dnd-kit's DndContext supplies its OWN defaults when you pass nothing, so a live region exists and speech happens. The real defect is that the speech names raw record ids and never a position, and that `Sortable` exposes no prop through which a consumer could replace it."
  - "DataGrid stringifies every cell, so a Badge can only enter a row through a column keyed exactly `status`, routed through a private job-application lookup. The pipeline column is keyed `status` for that reason and all three states therefore share one tone."
  - "Compact's 32px row is unreachable inside DataGrid, and the thing making it unreachable is a selection column with no prop to remove it. Measured: 35px, dropping to 28px with the selection cell hidden."
  - "`filtered-empty` is a route but NOT a seventh state. A filtered-empty is a filter condition, not a point in a draft lifecycle; adding it to CANONICAL_STATES would make the coverage table 49 cells while every check kept passing."
  - "This plan CLAIMS T-loading-list and T-error-inline on /admin/photos rather than inheriting them, because 39 rows is the most demanding host for both. Plans 14 and 15 should declare `inherits` for these two."
  - "The E-category-filtered fixture holds 25 photos, not the 39 the plan specified, because every real category has members and the real data cannot produce the state at all."

metrics:
  tasks: 2
  commits: 1
  artefacts: 5
  routes-emitted: 8
  photos-rendered: 39
  gates-green: 8
  gates-failing-by-design: 1
---

# Phase 0 Plan 13: `/admin/photos` Summary

The densest admin screen, sketched against all 39 real photos at compact density with both of
its genuinely distinct empty states and a running keyboard-drivable reorder — which measured
that G-13's premise is wrong, that compact's 32px row is unreachable inside `DataGrid` because
of a selection column nobody can remove, and that `DataGrid` announces every grid in the
product as "Job applications".

---

## THE ADMIN SKETCH IDIOM — PRESCRIPTIVE, FOR PLANS 14 AND 15

Plans 14 and 15 run in parallel after this one and cannot ask questions. Everything below is a
rule, not a suggestion. Where it differs from `00-UI-SPEC.md`, this document is the measured
one and UI-SPEC is the older one.

### 1. Route shape — copy this exactly

```
src/pages/admin/<screen>/[...state].astro
```

One file per screen. It exports `getStaticPaths`, `SCREEN` and `STATES`, reads
`Astro.params.state ?? "populated"`, and **throws** when the fixture key is missing. Never
`Astro.url.searchParams` — a prerendered route has no query string in dev either.

`getStaticPaths` returns `{ params: { state: undefined } }` first (that is the base path, so
`dist/admin/<screen>/index.html` exists) then one entry per `CANONICAL_STATES` member.

**A route MAY emit more paths than `STATES` declares.** `STATES` has exactly seven entries
because it feeds the 7 × 6 coverage table. An artefact with no coverage cell — `E-category-filtered`
is the only one in this phase — gets an extra `getStaticPaths` entry and no `STATES` row. Do
not add anything to `CANONICAL_STATES`.

**Register a new screen in `check-states.mjs`** by adding one line to its `SCREENS` array:

```js
{ id: "resume", route: "/admin/resume/", fixtures: "resume.json" },
```

The script now loops screens; markers are checked for uniqueness *within* a screen, not across
screens, because every admin route legitimately shares the shell's copy. **A screen with no
entry is not checked at all.** Add the line in the same commit as the route.

### 2. Fixtures

`src/fixtures/<screen>.json`, keyed by state. Every one of the seven states needs a key, and
every key needs a `marker`: a ≥12-character fragment of that state's own authored copy that
appears on no other state of that screen. Not a debug token — a page must render the state to
satisfy it.

Generate the fixture from the real committed JSON with a throwaway script. Copy values
verbatim, nulls included. **Count what you copied and print the count.**

A fixture legitimately holds data the real content cannot produce. `filtered-empty` here holds
25 photos rather than 39 because all seven real categories have members, so no real filter is
empty. Say so in a comment where you do it.

### 3. Field layout and label placement — one shape, no variants

```astro
<Field label="Title" wiring={wiring("f-<record>-title")}>
  <TextInput id="f-<record>-title" defaultValue={…} />
</Field>
```

- **`Field` supplies the label. `TextInput` does not.** Both have a `label` prop; using both
  renders the label twice. `Field` wins, because `ADMIN-IA` prescribes `Field` + control and
  because `Field` is the only one that also positions hint and error.
- **`defaultValue`, never `value`.** A static sketch has no `onChange`, and React's controlled-input
  warning is not something to ship into a reviewer's console.
- **`wiring` is built by hand.** `Field` wants the output of the `useField` hook, and an Astro
  page cannot call a hook. `FieldWiring` is a plain interface, so construct the object in
  frontmatter:
  ```js
  const wiring = (id) => ({ controlId: id, hintId: undefined, errorId: undefined,
                            describedBy: undefined, invalid: false });
  ```
  Ids must be unique across the page. Use `f-<record-id>-<field>`.
- **`Field` + `Select` needs `ariaLabel` as well**, duplicating the visible label. `Field` emits
  `<label for>` with no `id` of its own, and `Select`'s trigger is a `role="combobox"` button,
  which is not a labelable element — so the label points at nothing and there is no id to feed
  `ariaLabelledBy`. Pass `ariaLabel` and add a comment. Do not drop the `Field`.
- **Two columns at ≥673px, one below.** `grid-template-columns: repeat(2, minmax(0, 1fr))`.
  Sub-forms (EXIF here) go two-up at ≥375px.

### 4. Control density

- Vertical rhythm between fields is `var(--space-4)`, between groups `var(--space-6)`,
  section breaks `var(--space-8)`. `density-compact.css` already reassigns all three under
  `.adm-main` at `pointer: fine`. **Use the tokens; never a literal.**
- Do not write your own control heights. `density-compact.css` owns them.
- **Any control you author yourself needs a `@media (pointer: coarse) { min-height: 44px }`
  rule.** Five of six device classes are coarse. Put the floor on the *hit area*, not the paint.
- Never gate density on width. Never use `any-pointer`.

### 5. Empty-state voice — and the rule that made two of them different

Second person. Name the object. State the count. Say what happens next. No exclamation marks.

**The distinguishing rule, which is the reusable part:** an empty state must say *why it is
empty*, and two empty states that are empty for different reasons are two designs, not one
component with different words.

| | `E-photos` | `E-category-filtered` |
|---|---|---|
| Means | nothing exists | your filter excluded everything |
| CTA | **yes** — `Upload a photo` | **none** — the fix is elsewhere |
| Context kept | none needed | the filter row stays lit, and the library count stays visible |
| Second line | teaches an invariant (`Processing runs after you publish`) | names both escapes (recategorise, or delete the category on Site) |

Copy comes verbatim from `00-UI-SPEC.md` §Contract table. Hold each string in a named `const`
at the top of the frontmatter so it is greppable in one place.

If your screen has a filtered or scoped view, it has two empty states. Sketch both.

### 6. Table versus grid — decide by what the operator is doing

- **Table (`DataGrid`) for metadata**: comparing records, finding one record, reading fields
  across rows. It is text-only (see §9), so it cannot carry a thumbnail.
- **Grid (tiles) for order and for images.** Anything visual, anything spatial.
- If a screen has both, **render both stacked** with an `Eyebrow` naming each, and say in a
  comment that production switches them with a `SegmentedControl`. A sketch that hides one
  behind a dead control needs a second URL to review, and the whole route-per-state idiom
  exists so a reviewer walks URLs that exist.
- **Never put a control inside a sortable tile.** `SortableItem` spreads dnd-kit's listeners
  onto the item wrapper, so the tile *is* the drag handle and carries `role="button"` and
  `tabindex=0`. A nested button is invalid ARIA and unreachable by keyboard. Per-record editing
  belongs in the list view or a detail panel. This is a component constraint, not taste.

### 7. Dirty, loading and error on a screen

- **Dirty** — pass `navStates={fx.nav}` to `Admin.astro`; the sidebar badge follows. Add a
  `Badge tone="pending" dot` in the screen body only if your screen has something screen-specific
  to say about *what* is dirty. Otherwise declare `inherits: T-dirty-badge` and render the
  pointer block (`.ph-inherit` / `.adm-inherit`: an `Eyebrow` reading `INHERITS <id>` plus one
  `Text` saying what is specific to your screen). Plan 12 owns the badge design.
- **Loading** — use the component's own loading prop where one exists (`DataGrid.loading`,
  `Select.loading`), never a bespoke skeleton. Keep the shell, the filters and the primary
  action interactive while the body waits; that is the claim the treatment makes.
- **Error** — D-18 is lenient: the message is about *publishing*, saving still works, and the
  message attaches to the field it is about. Say "saving still works" in the body text; a
  reviewer cannot see it otherwise.

### 8. Artefact claiming — read this before you write your `STATES`

**This plan CLAIMS two treatments rather than inheriting them:**

- `T-loading-list` on `/admin/photos` — 39 rows is the longest list in the admin.
- `T-error-inline` on `/admin/photos` — an inline error is unmissable on a four-field form and
  easy to lose in a 39-row list, so the list is the demanding host.

**Plans 14 and 15 must declare `coverage: "inherits"` for both** and render the pointer block.
Plan 12 owns `T-loading-shell`, `T-dirty-badge`, `T-ready-badge`, `T-success-published`,
`O-conflict-diff` and `O-pipeline-strip`. That leaves `T-error-publish`, `T-error-network`,
the `O-*` overlays and the `P-*` / `R-*` sets unclaimed. Claim in your `STATES` comment, in
one sentence, naming the host and why it is the demanding one.

### 9. The hydration budget, mechanically

One island remains after this plan (`admin/home` and `admin/resume` are both on the allowlist;
this plan spent the `admin/photos` slot).

- **Exactly one line of your `.astro` file may contain the directive string.** The acceptance
  greps count LINES, not occurrences, so do not mention it in a comment.
- **Render the island unconditionally.** `check-no-js.sh` fails an allowlisted route that ships
  zero script tags, and *every state route of an allowlisted screen is allowlisted*. Pass empty
  data on states where the island has nothing to do and return `null` from the component. Astro
  still emits `<astro-island>` and the hydration script.
- **Island props must be JSON-serializable.** No functions. Verified.
- **A page carrying an island needs `<style is:global>`, not `<style>`.** Astro's scoped styles
  work by stamping `data-astro-cid-*` onto elements *in the Astro template*; a framework
  component renders its own DOM and never receives the attribute, so a scoped rule cannot reach
  a single node inside your island. This bites the moment you add one.

---

## G-13 — THE MEASURED ANSWER, IN THREE PARTS

Driven by keyboard only in Chromium 147 against the built `dist/`: focus a tile, `Space`,
`ArrowDown`, `Space`. Not read out of the source.

**Q1. Does a live region exist in the DOM?**
**YES — two of them.** `<div id="DndLiveRegion-0" role="status" aria-live="assertive"
aria-atomic="true">` and `DndLiveRegion-1`, one per `DndContext` on the page. Both are present
and empty at rest after hydration, and both are absent from the SSR'd HTML because dnd-kit
mounts them in an effect. Each sortable tile also carries
`aria-describedby="DndDescribedBy-0"` pointing at a `display: none` element holding dnd-kit's
default instructions: *"To pick up a draggable item, press the space bar. While dragging, use
the arrow keys to move the item. Press space again to drop the item in its new position, or
press escape to cancel."*

**Q2. Is the item's new position announced?**
**NO. Something is announced, and it is not the position.** Verbatim, at each step:

| Key | Announced |
|-----|-----------|
| `Space` (pick up) | `Draggable item abstract-intothemist was moved over droppable area abstract-intothemist.` |
| `ArrowDown` | `Draggable item abstract-intothemist was moved over droppable area abstract-lightscameraart.` |

Three defects in that text. It speaks **raw record ids** (`abstract-lightscameraart`), never the
photo's title. It speaks **no position at all** — never "position 2 of 36", which is the one
fact a reorder user needs. And the pick-up event announces the item as having moved over
*itself*, which reads as a move that did not happen.

**Q3. Is the drop confirmed?**
**YES, textually, and uselessly.** `Draggable item abstract-intothemist was dropped over
droppable area abstract-lightscameraart` (no full stop, unlike the other two). It confirms that
*something* landed but not *where*, for the same two reasons as Q2.

**So G-13's premise is wrong and its proposed fix is already in place.** UI-SPEC records G-13 as
*"passes no `announcements` / `screenReaderInstructions` — nothing is announced"*, fix
*"Pass dnd-kit's announcer"*. dnd-kit's `DndContext` renders `<Accessibility>` with
`defaultAnnouncements` and `defaultScreenReaderInstructions` **when the consumer passes
nothing** (`@dnd-kit/core@6.3.1`, `core.esm.js:40-88`). Passing nothing gets you the defaults,
not silence. The announcer is already passed; it is passed *generically*.

**G-13 restated, as it should be transcribed:** `Sortable` renders dnd-kit's default announcer,
which speaks record ids and never a position, and `Sortable`'s prop surface is
`{ items, onReorder, renderItem, id, className, style }` with **no accessibility passthrough and
no rest-spread onto `DndContext`** — so a consumer *cannot* replace the defaults with
title-and-position text. The fix is an announcer passthrough on `Sortable` (and on
`SortableDndContext`), not "pass the announcer".

**Two related observations from the same run.** A page with two `DndContext`s gets two
`aria-live="assertive"` regions and there is no way to share one. And the keyboard path
**works**: every reorder recorded below was performed with the keyboard alone, so the movement
is sound and only the speech is not.

No local announcer was added. Asserted:
`grep -qE 'aria-live|announcements|screenReaderInstructions' SortableReorder.tsx` exits 1.

---

## D-22 — BOTH AXES, MEASURED INDEPENDENT

One control, because D-22 is one decision: the category filter *is* the ordering axis. Above the
grid, in words: **"Dragging now writes Global order (order). Per-category orders are untouched."**
and, with a category active, **"Dragging now writes Architecture order (the per-category order
for architecture). The global order is untouched, and so is every other category."** Every tile
carries both of its numbers (`global #5 · architecture #1`), so the independence is visible on
the tiles rather than asserted in a caption.

Driven by keyboard, both directions:

| Action | Architecture sequence | Global sequence (36 items) |
|---|---|---|
| reorder inside Architecture | `Haunted Mansion, Office Greens, …` → `Office Greens, Haunted Mansion, …` | **byte-identical** |
| reorder under All | unchanged | changed |

The second ordering field is **not** invented here. Per-axis order is derived at mount from the
existing global `order`, restricted per category, and held in component state. Phase 3 names the
field.

---

## NEW DESIGN-SYSTEM FINDINGS

Per `00-FINDINGS.md`'s fixed-denominator rule, these are reported here and **not** appended to
the sixteen-row register. Plan 16 transcribes them.

### F-13-1 · `DataGrid` announces every grid in the product as "Job applications"

`Table.Root`'s `ariaLabel` is hardcoded to the string `"Job applications"` inside `DataGrid`
(`dist/index.js:8491`) and `DataGrid` exposes no way to change it. Verified in the built HTML:
`aria-label="Job applications"` is on the photos grid. Every `DataGrid` in the admin will
announce itself as a job-application table. Same closed-job-domain family as G-5, second
component. **Fix:** an `ariaLabel` prop, required.

### F-13-2 · `DataGrid` stringifies every cell, so a `ReactNode` cannot enter a row

`children: String(row[col.key] ?? "")` (`dist/index.js:8586`). A component in a cell renders as
`[object Object]`. **The single escape hatch is a column keyed exactly `status`**, which
`DataGrid` routes through a private lookup — `{applied, interviewing, offer, rejected}`
(`dist/index.js:8376`) — and renders as a `Badge`; an unknown value falls through to
`tone: "neutral"` with the raw string as the label. So D-15's pipeline column is keyed `status`
here, and processed / processing / failed all render in one tone because the tone map is closed
and private. There is a second magic key, `priority`, mapping to a coloured dot. **Fix:** a
`render?: (row) => ReactNode` on `DataGridColumn`, and delete both magic keys.

### F-13-3 · Compact's 32px row is unreachable inside `DataGrid`, and a selection column is why

Measured on 39 rows at 1440 fine pointer:

| | height |
|---|---|
| target (UI-SPEC compact) | 32px |
| before this plan (plan 07's B4 inert) | **40px** |
| after the specificity correction | **35px** painted / 34px computed |
| with `DataGrid`'s selection cell hidden | **28px** |
| and with the pipeline `Badge` also hidden | 26px |

Three stacked causes. (a) `DataGrid` pins `density="comfortable"` on its own `Table.Root`
(`dist/index.js:8492`) with no prop and no inheritance, and `table.css`'s
`.ds-atom-table[data-density="comfortable"] .ds-atom-table-row` is specificity (0,3,0) against
plan 07's (0,2,0) — so the density prototype's row rule **never applied to anything**. (b) Once
it does apply, `height` on a `<tr>` is a **minimum**: forcing the declaration to `8px` still
measures 35px. (c) The content floor is set by a **selection column the consumer did not ask for
and cannot remove** — `DataGrid` renders `SelectAllCell` and a `SelectCell` per row
unconditionally, `onSelectionChange` is optional but the column is not, and its 22px checkbox
label accounts for 7 of the 9px overshoot.

**Fix:** a `density` prop on `DataGrid`, a `--row-h` custom property in `table.css`'s density
modes, and a `selectable` prop. All three are G-2 / DS-11 territory.

### F-13-4 · `DataGrid`'s CSS is not self-contained, and its pager cannot meet the touch floor

`DataGrid` renders a `Pagination` in its footer **unconditionally** — no prop hides it, so a
39-row single-page grid still gets one — and `Pagination` renders `IconButton`s. Neither
`pagination.css` nor `iconbutton.css` is named by `datagrid.css` or documented anywhere, so
`@import ".../css/datagrid"` yields a grid with an **unstyled pager**, measured at 21px tall.
With both sheets added it is 28px (`pagination.css:29`) and 24px (`iconbutton.css:35`) — still
under the 44px floor at every coarse-pointer class. And `IconButton`'s three sizes are
**24 / 32 / 40px**, so its *largest* size is 4px under the floor: there is no value of `size`
that satisfies a coarse pointer. **Fix:** ship one sheet per compound component or declare
dependencies; and rebase the icon-button scale so one step meets 44px.

### F-13-5 · `SortableItem` is exported; the context it needs is not

`Sortable`, `SortableItem` and `SortableDndContext` are all public, which implies a
compose-your-own-list path. It does not exist: `SortableItem` calls dnd-kit's `useSortable`,
which reads its index and sibling ids from `SortableContext` — **not exported**. Outside one,
the context default supplies `items: []`, every hand-built item reports index `-1`, no strategy
applies, and the list degrades to plain draggables. **Second, related:** `Sortable` detects a
parent `SortableDndContext` and returns only its list body, letting the parent handle drag end
(`dist/index.js:9848-9850`) — so **`onReorder` is silently never called** while the type still
requires it. The gallery list here is deliberately *not* nested for that reason. **Fix:**
re-export `SortableContext`, or document the two as mutually exclusive and make `onReorder`
optional when nested.

### F-13-6 · `FileInput variant="dropzone"` is unthemeable

`FileInput` has **no stylesheet at all** — there is no `css/fileinput.css` in the package. Its
dropzone chrome is one inline style object carrying a **hardcoded `#E8D9AC`** border plus
`var(--paper-warm)`, `var(--paper-deep)` and `var(--amber)`, none of which the charcoal theme
redeclares. `tokens.css` resolves them to `#f4f4f4` / `#ededed` / `#f59e0b` — a *cool* grey
panel and a yellow icon on a warm `#F4F1EA` charcoal-light page. Nothing in the cascade reaches
any of it. Same family as the known `Button variant="primary"` amber leak, but worse: that one
is a token, this one is a literal. `FileInput` also has **no `label` prop** — only `ariaLabel` —
and its internal `Field` is used without one, so a dropzone cannot carry a visible label.

### F-13-7 (minor) · `Field`'s label cannot name a `Select`

`Field` renders `<label class="ds-atom-field-label" for={wiring.controlId}>` with no `id` of its
own. `Select`'s trigger is a `role="combobox"` `<button>`, not a labelable element, so the
label names nothing and there is no id to pass to `ariaLabelledBy`. Every `Field` + `Select`
pair must duplicate the label into `ariaLabel`. **Fix:** give `Field`'s label an id derived from
`controlId`, and expose it on `FieldWiring` as `labelId`.

---

## DATA CORRECTIONS — count things, do not quote them

All 39 photos were counted out of `data/portfolio_images.json` this session, not read from a
document. Confirmed: **39** photos; **7** lowercase categories; distribution architecture 14 /
nature 8 / wildlife 5 / abstract 4 / street 4 / portraits 2 / product 2 (matches ADMIN-IA);
**0 of 39** carry a tag (so the dropped `Tags` field is right); `dimensions` present on all 39;
longest real title `Portrait Patrika Gate 1` at 23 characters. Two claims do **not** hold:

1. **`product-peppers` does not lack an `exif` key.** `00-ADMIN-IA.md` says it "carries no EXIF
   at all — the whole group is absent" and `00-13-PLAN.md` repeats it as "has **no** `exif` at
   all". The record carries an `exif` **object whose six values are every one of them `null`**.
   The design consequence is identical; the **shape** is not, and Phase 3's migration would have
   been written against a key that is in fact always present.

2. **The omission rule fires on eleven photos, not two.** ADMIN-IA names `product-peppers` (0 of
   6) and `architecture-redbuilding` (1 of 6). Nine more are 5 of 6 — `lens` is `null` on
   `abstract-watertexture`, `architecture-singapore`, `architecture-singaporesentosa`,
   `architecture-templemahabalipuram`, `architecture-singaporeflyer`, `nature-hillsandgreens`,
   `nature-shipsunset`, `portraits-whitedresshalf`, `wildlife-starfish`. **28% of the library.**
   A rule that fires on 28% is a layout requirement, not an edge case, and both the admin form
   and the public lightbox have to be designed for a partially-filled EXIF block as the normal
   case.

**And the reconciliation of the omission rule, which ADMIN-IA states twice in tension.** Both
halves are right, on different surfaces:

- **Read-only surfaces omit.** The present/absent summary line, the list's `1 of 6` cell, the
  public lightbox. Never an em dash. (`grep -c '—' dist/admin/photos/index.html` → `0`.)
- **Editable surfaces render the field, empty and editable**, with the absence stated by the
  summary line rather than by a character inside the input. Otherwise a missing value cannot be
  filled in.

---

## WHAT WAS BUILT

**Five artefacts from one route file**, plus a sixth route:

| Artefact | Route | Coverage |
|---|---|---|
| `S-photos` | `/admin/photos/` | designed — 39 photos, both views, both detail panels |
| `E-photos` | `/admin/photos/empty/` | designed |
| `T-loading-list` | `/admin/photos/loading/` | designed — **claimed here** |
| `T-error-inline` | `/admin/photos/error/` | designed — **claimed here** |
| `E-category-filtered` | `/admin/photos/filtered-empty/` | designed — a route with no coverage cell |
| `T-dirty-badge` / `O-conflict-diff` / `T-success-published` | `/dirty/`, `/conflict/`, `/success/` | inherits (plan 12), pointer rendered |

**The screen.** `Chip` anchors for the eight category filters, each carrying its rendered label
*and* its raw stored key in mono — D-25's drift on screen in the one place it costs. A
`FileInput variant="dropzone"` that accepts a file and does nothing (D-02). `DataGrid` over all
39 as the list view. A hydrated tile grid over the 36 that are *in the gallery* as the order
view, with the 3 still processing in a separate **staged** strip — because D-12 makes a photo
reach the gallery when processing finishes, not when you publish, and keeping them out is what
makes the topbar strip and the grid agree (D-15's "two places that must agree"). Two detail
panels, pinned by id to `architecture-redbuilding` (camera only) and `product-peppers` (nothing
read), with `Field` + `TextInput` + `Select` and the six-field EXIF sub-form.

**The island.** `SortableReorder.tsx`, `client:load`, one directive line on the whole route.

---

## VERIFICATION — measured, in a browser where it matters

```
astro build                    32 pages, 8 of them /admin/photos/*
check-no-js.sh                 PASS  21 static routes at zero JS; 11 island routes verified hydrating
check-states.mjs               PASS  14 state pages across 2 screens, markers unique within each
check-no-ivory.sh              PASS
check-theme-exhaustive.mjs     PASS
check-font-names.mjs           PASS
check-contrast.mjs             PASS
check-css-size.mjs             PASS
check-bundle.mjs               EXIT 1 — BY DESIGN, this is G-15
```

**Built output.** `dist/admin/photos/index.html` carries **41 `<img>` tags covering 39 distinct
R2 URLs** (36 gallery tiles + 3 staged + 2 detail previews), **2 `<script>` tags**, `0` em
dashes, and `0` occurrences of `[object Object]`. `grep -c 'client:'` → `1` on the photos route,
`0` on the dashboard.

**Touch floor and reflow, measured in Chromium 147** on the built page with the island hydrated.
The audit walks every focusable box and reports anything under 44px:

| Class | pointer | doc width | tiles | columns | table row | under 44px |
|---|---|---|---|---|---|---|
| 344 | coarse | 344 = viewport | 36 | 2 | 44px | **none** |
| 768 | coarse | 768 = viewport | 36 | 4 | 44px | **none** |
| 1024 | coarse | 1024 = viewport | 36 | 5 | 44px | **none** |
| 1440 | fine | 1440 = viewport | 36 | 6 | 35px | (compact, by design) |

No horizontal page scroll at any width, and all 36 tiles present at 344px in two columns —
**reflow, never hide**. The `DataGrid` scrolls inside its own container, which is WCAG 1.4.10's
explicit data-table exception rather than a reflow failure.

**Island cost, measured rather than quoted.** `/admin/photos/` downloads
**248,559 B gzip (242.7 KB)**: `dist.B7RgvqLu.js` 190,438 B (97 modules — lucide 43, tiptap 23,
prosemirror 10, highlightjs 4, dndkit 4), `client.Ctz3ZYbq.js` 56,535 B, `SortableReorder.js`
1,586 B. The phase's recorded G-15 figure is 176,922 B; the shared design-system chunk has grown
**7.5%** now that it serves five islands. The often-quoted "~177 KB per island" is therefore the
*old* barrel measurement, and the real first-island cost on a page is **~243 KB gzip** once
`react-dom` is counted. Two islands remain in the budget.

**Negative control for the changed gate.** `check-states.mjs` was generalised from one route to
a `SCREENS` list. Control: `const state = Astro.params.state ?? "populated"` in the photos route
replaced with a constant. The gate failed, naming the screen —
`check-states: FAILURE MODE on "photos" — a state variant is not the state it claims to be`,
listing the populated marker leaking onto all six other pages and six markers absent from their
own. Assertion 3 (marker uniqueness) is what caught it, exactly as that script's own header
predicts; assertion 2 (body inequality) did not, because `astro dev` injects per-route content
that keeps the bodies from being byte-identical. The file was then restored and re-hashed:
`2a6ed7c6a0a91b04c25654047a665d9a74c051a7ceb24098eddd567daaee8bca` before and after, and
`check-states.mjs` exits 0 again.

---

## DEVIATIONS FROM PLAN

**1. [Rule 2 — missing critical functionality] The 44px floor did not hold, and three sets of
rules were added to `density-compact.css`.**
Found during task 1, on the first real table in the phase. Measured 40px table rows and a 21px
pager at every coarse-pointer class, against a binding responsive-contract floor of 44px. Plan
07's B4 and its coarse table-row rule had never applied to anything (F-13-3). Fixed in
`density-compact.css` — the sanctioned local prototype, which names DS-11 / G-2 as its owner and
dies with the playground — as a clearly-marked *PLAN 13 CORRECTION* block that leaves plan 07's
counted tally intact as written and states the corrected figure (17 declarations across 13
rules, 14 not expressible as a `--space-*` change) beside it. The upstream fix is named in the
comment and is **not** attempted locally. Floor now measured clean at 344, 768 and 1024.

**2. [Rule 3 — blocking] `manifest-admin.css` gained `pagination` and `iconbutton`.**
`DataGrid` renders a `Pagination` unconditionally and nothing declares its stylesheets, so the
pager rendered unstyled (F-13-4). Two lines, with the finding recorded in the manifest header.

**3. [Plan correction] The `filtered-empty` fixture holds 25 photos, not 39.**
The plan specifies "the full 39 with an active category filter that matches none". Every one of
the seven real categories has members, so no filter over the full 39 is empty. The 14
architecture photos are removed instead. Recorded in the fixture and in the page.

**4. [Plan correction] `E-category-filtered` is a route, not a state.**
The plan implies seven fixture states; `filtered-empty` is an eighth `getStaticPaths` entry and
is deliberately absent from `STATES` and `CANONICAL_STATES`, because it is a filter condition
rather than a lifecycle state and adding it would silently make the coverage table 49 cells.

**5. [Plan correction] The acceptance criterion naming `src/pages/admin/index.astro` refers to a
file that does not exist.** Plan 12 built the dashboard as `src/pages/admin/[...state].astro`.
Checked there instead: `grep -c 'client:'` → `0`. The budget was not spent twice.

**6. [Scope, deliberate] `T-loading-list` and `T-error-inline` are claimed here as `designed`,
not `inherits`.** The plan's own action assigns `T-loading-list` to this file; `T-error-inline`
is claimed on the same argument and flagged prescriptively above so plans 14 and 15 inherit
rather than duplicate.

No architectural changes were needed; no Rule 4 checkpoint was raised.

---

## Known Stubs

None that block the plan's goal. The dropzone accepts a file and does nothing, and the category
`Select` and every `TextInput` are uncontrolled — both are the D-02 scope fence working as
specified, stated in comments at each site, and Phase 7 owns the wiring. `.playground/` is
deleted in plan 17.

---

## Self-Check: PASSED

- `.planning/phases/00-design-ideation/00-13-SUMMARY.md` — FOUND
- `.playground/src/pages/admin/photos/[...state].astro` — FOUND (gitignored)
- `.playground/src/components/SortableReorder.tsx` — FOUND (gitignored)
- `.playground/src/fixtures/photos.json` — FOUND (gitignored)
- `dist/admin/photos/index.html` + 7 sibling state routes — FOUND
- Playground work is gitignored by design (`.gitignore:38`), so tasks 1 and 2 produce no
  commits, exactly as plans 01, 04, 07, 09, 10 and 12 did. The single commit for this plan is
  this SUMMARY.
