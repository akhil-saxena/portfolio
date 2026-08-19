---
phase: 01-design-system-charcoal-theme
plan: 14
subsystem: design-system
tags: [e7, f-13-1, f-13-2, f-13-3, g-5, datagrid, density, specificity, roving-tabindex, reactnode, css-split, compound-component, import-graph]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 12
    provides: the "a source grep cannot tell prose from code" gate-defect class, repaired here in a third variety — a forbidden pattern that is a SUBSTRING of a legitimately different string
  - phase: 01-design-system-charcoal-theme
    plan: 13
    provides: the declaration-versus-reference gate repair, the comment-stripping filter idiom, the 8-baseline count this plan increments, and the "run the negative control the RED phase cannot give you" discipline
provides:
  - "$DS/src/data-display/DataGrid/index.tsx — density / selectable / ariaLabel / pagination props, DataGridColumn.render, renderCellValue's isValidElement branch, and dataGridPresets.statusBadge / .priorityDot replacing the key-triggered lookups"
  - "$DS/scripts/split-css.mjs — componentSheetDeps: a transitive component-import-graph derivation, a --deps-json flag, an unknown-flag guard, and a sibling-sheet block in every generated header (40 of 75 sheets)"
  - "$DS/src/css-split.test.ts — 3 new cases asserting the graph finds the known compounds and that every derived edge is declared in the emitted header"
  - "$DS/src/data-display/DataGrid/DataGrid.test.tsx — 24 new vitest cases (22 -> 46)"
  - "$DS/src/data-display/DataGrid/DataGrid.stories.tsx — CompactUnselectable, the story where all four props and a ReactNode cell appear together"
  - "$DS/src/index.ts — dataGridPresets and DataGridDensity exported publicly"
  - "$DS/README.md — the per-component-CSS section now explains that a composed component needs more than one sheet, and points at the generated header as the source of truth"
affects: [01-18 StatusPill (G-5's other half), 01-20 charcoal baselines + v2.0.0 changelog, 01-21 publish, Phase 06.1 density token axis + IconButton scale rebase, Phase 4/5 admin photo grid]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive a public union from the component you forward to, never restate it. `DataGridDensity = NonNullable<TableRootProps[\"density\"]>` cannot drift; a restated `\"comfortable\" | \"compact\"` would have accepted a value with no CSS behind it — which is exactly what the plan asked for"
    - "A roving-tabindex offset is a function of the columns that exist, not a constant. The `+1` was the checkbox column; making the column optional without making the offset optional puts every arrow key one cell right, and jsdom sees it only if a test asserts the CELL CONTENT rather than the cell index"
    - "Declare a generated artifact's dependencies as machine-readable import lines inside the generated header, above the first content banner. Prose anywhere in the file is unassertable — the unfixed datagrid.css already contained the word Pagination in a rule comment"
    - "Take the TRANSITIVE closure of a component-render graph, not the direct edges. datagrid needs iconbutton without importing it; a direct-only list names pagination and still ships an unstyled pager, which is the same bug one level down"
    - "A key-triggered behaviour (`if (col.key === \"status\")`) is action-at-a-distance on a string. Convert it to a named preset the caller points at: nothing is lost, nothing fires by accident, and the preset works under any key"
    - "When a plan's gate greps for a forbidden literal, check whether that literal is a SUBSTRING of something the same task must document. `density=\"comfortable\"` is inside `[data-density=\"comfortable\"]`, which the prop docstring has to quote to state the (0,3,0) fact"

key-files:
  created: []
  modified:
    - ../design-system/src/data-display/DataGrid/index.tsx
    - ../design-system/src/data-display/DataGrid/DataGrid.test.tsx
    - ../design-system/src/data-display/DataGrid/DataGrid.stories.tsx
    - ../design-system/scripts/split-css.mjs
    - ../design-system/src/css-split.test.ts
    - ../design-system/src/index.ts
    - ../design-system/README.md

key-decisions:
  - "`ariaLabel` gets a neutral default (\"Data grid\"), NOT required. Required would break every call site's compile for no safety gain, and an absent name is worse than a generic one on a role=grid"
  - "`density`'s union is `cozy | comfortable | spacious`, derived from Table.Root. The plan's `comfortable | compact` does not exist anywhere in the design system; `cozy` IS the 32px mode the finding calls compact"
  - "The badge/dot mappings become `dataGridPresets.statusBadge` / `.priorityDot`, exported and pointed at from a column's `render`. Both are breaking, both are affordable in this major"
  - "`render` is `(value, row) => ReactNode`, not the plan's `(row) => ReactNode`, so a preset can be key-agnostic and work under any column name — which is the whole point of removing the key match"
  - "text-align is now applied to EVERY cell, not only plain ones. A `status` column with `align: \"right\"` silently lost its alignment; measured to move no baseline"
  - "The CSS dependency is declared by the GENERATOR, derived from the import graph, with README as commentary that explicitly tells the reader to trust the header instead"
  - "Sheet dependencies are transitive, and components with no sheet of their own (Badge) are walked through rather than skipped"
  - "No permanent browser geometry case was added. The 32px measurement is Phase 06.1's number to own; pinning it here would assert a value that phase is going to change"
  - "CHANGELOG.md was NOT written — 01-20 owns it. Two BREAKING CHANGE: footers carry the breaks and the exact wording is below"

patterns-established:
  - "Pattern: a gate's forbidden pattern can be a substring of a required one. Strip comments AND anchor with a word boundary — `(?<![\\w-])density=\"comfortable\"` distinguishes the JSX prop from the CSS attribute selector the docstring must quote"
  - "Pattern: a case-insensitive grep of a whole generated file for a component NAME is never a dependency assertion. datagrid.css already said `Pagination` in a rule comment, so the plan's gate passed in the RED state and — proven by NC-2 — also passes when the fix is deliberately disabled"
  - "Pattern: a test that passes in RED for the wrong reason still needs a negative control. `moves the roving focus origin` read td[1]=\"Stripe\" before the change only because td[0] was the checkbox; NC-3 is the only evidence it bites"

requirements-completed: [DS-01]

# Metrics
duration: 40min
completed: 2026-08-19
---

# Phase 01 Plan 14: DataGrid's density, selection column, accessible name, cells and sheet dependencies Summary

**Five hardcoded values became four props and one column field, the job-domain badge and dot lookups stopped firing on a column's name, and every generated stylesheet now declares the sibling sheets its component renders — with the plan's own density union falsified against the source, its CSS gate proven unfailable in both directions, and 32px measured as genuinely reachable only once the selection column is gone.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-08-19 15:20 IST
- **Completed:** 2026-08-19 16:00 IST
- **Tasks:** 2 of 2
- **Files modified:** 7 — 821 insertions, 105 deletions
- **Tests:** DataGrid 22 → **46**; css-split 4 → **7**; `npm test` 1,655 → **1,682**; `test:a11y` 489 → **490**

## Task Commits

| # | Hash | Message |
|---|---|---|
| 1 (RED) | `7c4dd35` | `test(datagrid): add failing prop, ReactNode-cell and sheet-dependency probes` |
| 2 | `4230b9a` | `feat(datagrid)!: add density, selectable, ariaLabel and pagination props with ReactNode cells` |
| 3 | `4fe6904` | `build(css): derive and declare each sheet's sibling dependencies` |

`charcoal-theme` is **36** commits ahead of `main`, tracked-clean, `git stash list` empty.

The plan put the props in task 1 and ReactNode cells in task 2, but both are edits to the same
region of one file; splitting them would have meant writing the preset refactor, reverting it,
committing, and re-adding it. They ship in `4230b9a` under the plan's own suggested task-2
message, and the CSS work — which shares no file with them — is its own commit.

---

## The four questions the plan asked

### 1. `ariaLabel`: default, not required — and the changelog wording

**A neutral default, `"Data grid"`.** The plan offered "neutral default or required, record which";
required is the wrong trade here:

- Required breaks **every** call site's compile, including ones that would have passed a correct
  name, in exchange for no guarantee — a required prop can still be filled with `"table"`.
- The failure it is meant to prevent is a *bad* name, and the type system cannot tell a good one
  from a bad one.
- Omitting the default entirely was the third option and is the worst: `role="grid"` with no
  accessible name at all is less usable than a generic one, and axe would not flag it.

The prop's docstring says plainly that the default is generic on purpose and that a page with more
than one grid must pass a real one. Asserted by *"does not announce itself as a job-application
table when the name is omitted"*, which checks both halves — not `"Job applications"`, **and**
truthy.

### 2. The opt-in mechanism for the badge/dot presets

`DataGridColumn` has **no** render-ish field today — checked before deciding, as the plan instructed
— so `render` is new:

```ts
render?: (value: unknown, row: DataGridRow) => React.ReactNode;
```

**`(value, row)`, not the plan's `(row)`.** A `render` that only receives the row cannot know which
column it is rendering, so a preset would have to close over a key — and a key-bound preset is the
thing being removed. With the value passed in, `dataGridPresets.statusBadge` works under a column
named `state`, `stage` or anything else, which is the actual requirement.

Both mappings are preserved verbatim and exported:

```ts
{ key: "status",   …, render: dataGridPresets.statusBadge }
{ key: "priority", …, render: dataGridPresets.priorityDot }
```

`dataGridPresets` and `DataGridDensity` are exported from `src/index.ts`, or a consumer could not
reach the preset that replaces the behaviour they lost.

### 3. The CSS-dependency mechanism, and why

**The generator**, exactly as the plan's action required, and derived rather than listed.

`componentSheetDeps` walks every `src/<category>/<Component>/index.tsx`, **strips comments first**
(a docstring naming another component is prose, and counting it would declare a dependency that
does not exist), keeps only relative specifiers that resolve to a known component directory, and
takes the **transitive** closure.

Transitive is not a refinement, it is the requirement: `DataGrid` does not import `IconButton`. It
imports `Pagination`, which does. A direct-only list would name `pagination` and still ship an
unstyled pager — F-13-3 one level down. Components with no banner of their own (`Badge` is one
inline style object with no class at all) contribute no sheet but are still **walked through**, so
anything they rendered would still be declared.

40 of 75 sheets declare siblings; the largest list is 9 (`daterangepicker`). `datagrid` gets:

```
button, checkbox, field, formvalidation, iconbutton, link, pagination, table
```

Emitted as import lines in the generated header, above the first content banner:

```css
   DataGrid renders other components, and the split is BY component, so their rules
   are not in this file. Import these alongside it or the composed parts render
   unstyled — a DataGrid imported on its own had a 21px unstyled pager:
     import "@akhil-saxena/design-system/css/button";
     …
     import "@akhil-saxena/design-system/css/table";
```

Import lines rather than prose **because the claim has to be assertable** — see the gate repair
below. The byte-exact round trip is untouched: headers are added at write time and were never part
of it (`css:check` still reports 75 files, byte-exact).

`README.md` gained a paragraph, but it explicitly tells the reader to trust the header rather than
the snippet, and names `--deps-json` for the whole map. That is commentary on a mechanism, not the
mechanism.

### 4. `--row-h` and the pager's 44px target are Phase 06.1's

**Deferred deliberately, with the reasoning, so nobody reads the absence as an oversight.**

`IconButton`'s three sizes are **24 / 32 / 40px** — confirmed in `primitives.css` lines 218–229 and
`IconButtonSize = "sm" | "md" | "lg"`. Its *largest* is **4px under** the 44px coarse floor, so **no
value of `size` satisfies it**. Measured on the live pager, which is worse than the plan assumed:

| measured in Chromium | value |
|---|---:|
| `.ds-atom-pagination-icbtn` painted height | **24px** (`data-size="sm"`) |
| gap to the 44px coarse floor | **20px** |
| best reachable by changing `size` alone | 40px — still 4px short |

The scale rebase is `F-15-7` / `G-2` → **Phase 06.1**. Not attempted here.

Likewise `--row-h` / `--control-h` / `--field-gap` and the `data-density` **token** layer: protocol
§9 puts them in 06.1 and this plan ships only the props that make them reachable. **The split is
now measured rather than asserted** — see below.

---

## The measurement that decides whether E7's API half is worth anything

The user's instruction was explicit: *"Measure the row height with the column off before claiming
compact's 32px is reachable."* Chromium, `getBoundingClientRect`, both stories real:

| | `--default` | `--compact-unselectable` |
|---|---:|---:|
| `data-density` | `comfortable` | `cozy` |
| declared `height` (computed) | 39px | 31px |
| **painted row height** | **40** | **32** |
| body cells / header cells | 7 / 7 | 4 / 4 |
| tallest cell's content | **22** | **19** |
| checkbox label height | **22** | — (absent) |
| pager `<nav>` count | 1 | **0** |

**32px is reachable, and only because the column is gone.** The two causes are separable in the
numbers: with the selection column present the tallest cell content is **22px**, which is the
checkbox label; without it the tallest is **19px**. `cozy` declares `height: 32px`, and a `<tr>`'s
height is a minimum — so the declaration only wins when nothing inside is taller. At
comfortable+selectable the content floor (22) sits under the declaration (40) and is invisible;
push the declaration down to 32 and the 22px label plus cell padding is what would have stopped it.

**Header and body cell counts agree in both configurations** — the misalignment the plan predicted,
and `test:a11y` is clean on the new story.

No permanent browser case pins these numbers. Phase 06.1 owns the geometry and is going to change
them; a case asserting 32 here would be a case that phase has to delete. The probe was temporary,
was run, and was deleted (`tests/visual/` has no `tmp-*` left).

---

## Gates repaired

Four consecutive plans, now five.

### Task 2, gate 3 — unfailable, and provably so in BOTH directions

```bash
grep -qiE 'pagination|iconbutton' "$DS/dist/css/datagrid.css" || { echo "FAIL: …"; exit 1; }
```

`dist/css/datagrid.css` **already contained the word** before this plan:

```
46:/* Footer — row count (left) + Pagination (right) */
```

The grep is case-insensitive, so the rule comment satisfies it. This is protocol §7's trap verbatim
— *"Comments are matched too"* — but with a twist worth naming: the comment is not documentation
the plan required, it is a **pre-existing rule comment**, so no amount of care in writing the fix
would have avoided it.

Demonstrated both ways rather than argued:

```
plan's gate on the PRE-CHANGE sheet   -> PASSES   (the gate cannot fail)
plan's gate with the fix DISABLED     -> PASSES   (NC-2; it cannot detect a regression either)
repaired gate on the PRE-CHANGE sheet -> correctly FAILS
repaired gate with the fix DISABLED   -> correctly FAILS, naming css/pagination and css/iconbutton
```

Repaired to require machine-readable declarations **inside the generated header** — everything above
the first `/* ─── ` banner — so a rule comment further down cannot reach it:

```js
const header = css.slice(0, css.indexOf("/* ───"));
for (const dep of ["pagination", "iconbutton"])
  if (!header.includes(`css/${dep}`)) { /* FAIL */ }
```

This is why the mechanism is import lines and not a sentence: **the artifact had to be shaped so the
gate could be written.** A prose declaration would have left the gate exactly as unfailable as it
started.

### Task 1, gate 2 — fires on a substring of what the same task must document

```bash
if grep -q 'density="comfortable"' "$f"; then echo "FAIL: density is still hardcoded…"; exit 1; fi
```

Red on the **fixed** file. The match:

```
118:	 * `.ds-atom-table[data-density="comfortable"] .ds-atom-table-row`, which is
```

`density="comfortable"` is a **substring of `[data-density="comfortable"]`** — and the plan's own
action requires that selector be quoted, since stating the (0,3,0) fact is the entire justification
for the prop. Two independent defects in one pattern:

1. it greps raw source, so a comment counts (01-12's and 01-13's defect);
2. even in *code* it cannot tell a JSX prop from a `data-` attribute selector.

Repaired by stripping comments **and** anchoring with a word boundary:

```js
/(?<![\w-])density="comfortable"/g
/(?<![\w-])ariaLabel="Job applications"/g
```

```
"density=\"comfortable\""       raw=1  code-only=0
"ariaLabel=\"Job applications\"" raw=0  code-only=0
```

The `grep -q 'selectable'` / `grep -q 'ariaLabel'` halves were also weak — a bare mention passes —
so they were narrowed to **declarations** (`^\s*selectable\?:\s*boolean;`), which is 01-13's
declaration-versus-reference repair applied to a prop instead of a custom property. Negative-
controlled both ways: **6 failures** on the pre-plan file, **2** under NC-1, clean on the shipped
file.

### The other gates were sound

`npx vitest run … --reporter=verbose`, the `isValidElement` grep, `test -s dist/css/datagrid.css`,
the four sibling gates and `test:a11y` all work as written. One incidental: **`--reporter=basic` is
not a valid vitest reporter in this repo** and produces a *startup* error, exit 1, with zero tests
run — a shape that reads like a red suite. The plan uses `verbose`, which is fine.

---

## Plan premises that turned out false

Three, all checked against the live source rather than inferred.

### 1. `density?: "comfortable" | "compact"` — `"compact"` does not exist

`Table.Root`'s union is **`"cozy" | "comfortable" | "spacious"`** (`Table/index.tsx:63`), and
`primitives.css` has rules for exactly those three:

| value | selector | height |
|---|---|---:|
| `cozy` | `.ds-atom-table[data-density="cozy"] .ds-atom-table-row` | **32px** |
| `comfortable` | `…[data-density="comfortable"]…` | 40px |
| `spacious` | `…[data-density="spacious"]…` | 48px |

There is no `compact` anywhere in the design system. **`cozy` IS the 32px mode the finding calls
compact** — the vocabularies differ, the number does not.

Accepting the plan's literal union would have shipped a `data-density="compact"` with **no rule
behind it**, i.e. a prop that type-checks and does nothing — and protocol §9 puts the `data-density`
token layer in Phase 06.1, so adding the missing block here was out of scope by two independent
routes. Shipped instead as a **derived** type:

```ts
export type DataGridDensity = NonNullable<TableRootProps["density"]>;
```

which cannot drift from the component it forwards to. Pinned by *"accepts every density the inner
Table accepts, so the passthrough cannot drift"*, which sweeps all three.

The plan's `(0,3,0)` arithmetic is **correct** — two classes plus one attribute — and the selector
is at `primitives.css:4184` as described.

### 2. The finding is keyed on `status` **and** `priority`, not `status` alone

`must_haves` and the objective name only the `status` column. `index.tsx:313` had the identical
shape for `priority`:

```ts
if (col.key === "priority") { … PRIORITY_COLOR[row[col.key]] … }
```

Same action-at-a-distance, same private map, same silent capture of a consumer's column name. Fixed
identically and pinned by its own case (*"no longer routes a column keyed priority through the
job-domain dot map"*); leaving it would have closed half of G-5's DataGrid surface.

### 3. Task 2's CSS gate was already green before the plan started

Covered under **Gates repaired**. Recorded here too because it is a *premise* — the plan's verify
block asserts the gate "checks" the mechanism, and it did not.

### Premises that held — checked, not assumed

| Premise | Verdict |
|---|---|
| `ariaLabel="Job applications"` hardcoded at line **242** | **TRUE**, exactly line 242 |
| `density="comfortable"` hardcoded at line **243** | **TRUE**, exactly line 243 |
| `SelectAllCell` / `SelectCell` unconditional at **248 / 293** | **TRUE**, both |
| `String(row[col.key])` at **307 / 342 / 355** | **TRUE**, all three |
| `<Pagination>` unconditional at **368–373** | **TRUE**, and `ariaLabel="DataGrid pagination"` |
| The line-17 note that `<Pagination>` is a SIBLING of `Table.Root` | **TRUE** — DOM shape preserved unchanged |
| `.ds-atom-table[data-density="comfortable"] .ds-atom-table-row` is (0,3,0) | **TRUE** |
| `DataGridColumn` has no render-ish field | **TRUE** — `key/label/width/sortable/align` only |
| A `status` value outside the four job keys collapses to one tone | **TRUE** — `entry?.tone ?? "neutral"` |
| `--amber-vivid` already maps to ochre under charcoal | **TRUE** — `charcoal.css:235` and `:368` |
| `IconButton`'s largest size is 40px, 4px under the coarse floor | **TRUE** — and the pager uses `sm`, i.e. **24px** |
| `datagrid.css` is not self-contained | **TRUE**, and total: **0** occurrences of any pager class |
| `split-css.mjs` derives sheets from banners; `css-split.test.ts` asserts byte-exact round trip | **TRUE** — both preserved |
| `useTableSelection` does not fire `onSelectionChange` on mount | **TRUE** — only inside `setSelected` |

---

## The bug the plan predicted, and the control that proves it was fixed

The plan warned: *"Watch the column count… That misalignment is the likely bug."* It was, in a place
the plan did not name — the **roving-tabindex model**, whose `+1` offset *is* the checkbox column:

```ts
const totalCols = columns.length + 1;                       // +1 for checkbox column
focusedCell[1] === colIdx + 1 ? 0 : -1                      // header and body
useState<[number, number]>([HEADER_ROW, 1])                 // origin
```

With `selectable={false}` and the offset left alone, every arrow key lands one column right. The
`colSpan` half the plan *did* name is the visible one; this one is silent.

**Its guard passes in the RED state by coincidence** — `td[1]` is `"Stripe"` before the change only
because `td[0]` is the checkbox — so the RED run is no evidence at all. NC-3 is:

```
NC-3 (offset restored):  1 failed | 45 passed
  moves the roving focus origin to the first data column when the checkbox column is gone
  AssertionError: expected 'Staff Engineer' to be 'Stripe'
```

Exactly one column right. Restored, sha `53a54198…` before and after, 46/46 green.

---

## Negative controls run

Five. Every mutation restored from a `cp` backup and verified byte-identical by `shasum -a 256`. No
`git checkout --`, no `git stash`, no `git reset`, no `git clean`, no `git worktree`.

| # | What was broken | Result |
|---|---|---|
| **NC-0** | The whole RED phase — both suites run before any implementation | vitest **19 failed / 27 passed (46)**; `css-split.test.ts` failed at **collection**, because an unrecognised `--deps-json` fell through to the write path and printed its summary line where JSON was expected |
| **NC-1** | `ariaLabel` and `density` re-hardcoded in the real JSX, i.e. the pre-plan form | repaired gate exits **1** naming both. The plan's gate "caught" it too — but also "catches" the fixed file, which is the point. Restored: sha `53a54198…` |
| **NC-2** | The generator's dependency block disabled and `dist/css` regenerated | repaired gate **FAILS** (`css/pagination`, `css/iconbutton`); `css-split.test.ts` **1 failed / 6 passed**; **the plan's loose grep says PASS in this state and in the fixed state** — the clearest proof it was never a gate. Restored, 40 sheets declare siblings again |
| **NC-3** | The roving-tabindex `+1` offset restored while `selectable={false}` | **1 failed**, `expected 'Staff Engineer' to be 'Stripe'`. The predicted misalignment, and the only evidence its guard bites. Restored: sha `53a54198…` |
| **NC-4** | The plan's own gate patterns run against the pre-plan backup | **6 failures** — both forbidden literals present, all four prop declarations absent. Confirms the repaired gate discriminates the two file states rather than merely passing |

**NC-2 and NC-3 are the two that mattered.** NC-2 falsified the plan's verification mechanism;
NC-3 caught a live bug whose guard the RED phase could not exercise.

One asymmetry against 01-13: **this defect class is fully visible to jsdom.** Cell counts, `colSpan`,
`aria-label`, `data-density` and focus targets are all markup facts. The browser was needed for one
thing only — whether 32px is actually *painted* — and that is the number Phase 06.1 will own.

---

## Verification

| Plan verification item | Result |
|---|---|
| `npx vitest run src/data-display/DataGrid src/css-split.test.ts` passes all thirteen behaviours | **PASS** — **53/53** (46 DataGrid + 7 css-split). All seven task-1 and all six task-2 behaviours have a named case |
| No `ariaLabel="Job applications"` and no hardcoded `density="comfortable"` remain | **PASS** — 0 of each outside comments; gate **repaired** (it fired on the docstring, and on a substring of a CSS selector) and negative-controlled both ways |
| `dist/css/datagrid.css` names its sibling sheets, and a test guards it | **PASS** — 8 declared in the generated header; 3 new cases in `css-split.test.ts`; gate **repaired** (unfailable as written, proven in both directions by NC-2) |
| `npm run test:a11y` clean on DataGrid stories, including the `selectable={false}` story | **PASS** — **490/490** in 82 suites, exit 0, `DataGrid.stories.tsx` PASS. Header/body cell counts measured equal in Chromium in both configurations (7/7 and 4/4) |
| All four sibling gates | **PASS** — `npm test` **1682/1682** in 116 files; `npm run check` clean; `npm run typecheck` clean (both projects — stories are typechecked); `npm run css:check` 75 files, byte-exact |
| `npm run build` green and `dist/css/datagrid.css` non-empty | **PASS** — exit 0; 2,497 bytes; the header survives the real `postbuild.mjs` path, not just a direct script run |
| No existing visual baseline moved (not required by the plan; checked anyway) | **PASS** — 485 captured, **0** pixel-mismatch failures, 9 missing-baseline errors only |

---

## Storybook baselines 01-20 must record — the measured list is now **NINE**

01-13 measured eight. This plan adds one, so the count is **nine**, measured by running the suite
rather than counted from SUMMARYs:

| Story id | Owed by | Introduced in |
|---|---|---|
| `overlays-lightbox--responsive-gallery` | 01-11 (flagged), story from 01-07 | `c198985` |
| `patterns-formvalidation--field-required-marker` | 01-11 | `e24f865` |
| `patterns-formvalidation--field-error-severity` | 01-11 | `e24f865` |
| `patterns-formvalidation--anchored-error-summary` | 01-11 | `e24f865` |
| `layout-appbar--anchor-navigation` | 01-12 | `82a61f9`…`ae3d50c` |
| `layout-footer--compact-with-links` | 01-12 | `ae3d50c` |
| `layout-appshell--with-banner` | 01-13 | `3f69b6d` |
| `layout-appshell--with-banner-and-footer` | 01-13 | `3f69b6d` |
| **`data-display-datagrid--compact-unselectable`** | **01-14** | `4230b9a` |

Mine renders `density="cozy"`, `selectable={false}`, `pagination={false}`,
`ariaLabel="Shortlisted candidates"`, a `Badge` in a column keyed `stage`, and `<em>` elements as
raw cell *values* — so 01-20's snapshot and a11y runs cover every new path at once.

### No existing baseline moved — measured

```
visual baselines: captured 485, skipped 4 time-dependent
9 x  "A snapshot doesn't exist at …, writing actual."
0 x  pixel-mismatch failures
```

Zero comparison failures across all 485, **including the four existing DataGrid baselines**
(`--default`, `--sortable`, `--with-selection`, `--dark-mode`). That is the direct answer to the two
things that could have moved them:

- **the preset opt-in** — the stories now pass `render: dataGridPresets.statusBadge` / `.priorityDot`
  explicitly, and the output is identical to what the key match produced;
- **`text-align` on every cell** — `status` and `priority` cells gained `style="text-align: left"`,
  which is a `<td>`'s default in LTR, so the markup changed and the paint did not.

**The run wrote the 9 missing PNGs** (Playwright writes on first miss and fails once). All 9 were
untracked, and all 9 were removed **by explicit path**, each checked against
`git ls-files --error-unmatch` first so a tracked file could not be deleted by mistake. **No
`git clean`.** The snapshot directory is byte-identical to its pre-run inventory — 488 files,
`diff` clean.

---

## CHANGELOG wording for 01-20

Not written here: `01-20-PLAN.md` owns `CHANGELOG.md` and this plan's `files_modified` does not
list it. Both breaks are in `BREAKING CHANGE:` footers on `4230b9a`. Exact wording to paste beside
01-13's AppShell entry and the font relocation:

```markdown
- **`DataGrid` no longer announces itself as "Job applications", and no longer
  renders a job-application Badge or priority dot just because a column is named
  `status` or `priority`.**

  The accessible name is now the `ariaLabel` prop, defaulting to the generic
  `"Data grid"`. Every grid built on this library previously announced itself as a
  job-application table. Pass a real name — a page with more than one grid needs
  one:

  ```tsx
  <DataGrid ariaLabel="Photos" … />
  ```

  The two built-in cell mappings fired on a column's **key**, so a consumer's own
  `status` column silently became a job-domain badge and every value outside
  `applied` / `interviewing` / `offer` / `rejected` collapsed to `tone="neutral"`.
  They are unchanged in behaviour but must now be asked for:

  ```tsx
  import { dataGridPresets } from "@akhil-saxena/design-system";

  const columns = [
    { key: "status",   label: "Status",   width: 110, render: dataGridPresets.statusBadge },
    { key: "priority", label: "Priority", width: 90,  render: dataGridPresets.priorityDot },
  ];
  ```

  A column with no `render` shows its value as text, and `render` works under any
  key — `(value, row) => ReactNode` — so a Badge is no longer confined to a column
  called `status`. Cell values may now be React elements directly; anything else
  keeps the exact `String(value ?? "")` coercion it had.

- **`DataGrid` gained `density`, `selectable` and `pagination`, all additive.**
  `density` forwards to the inner table (`"cozy"` 32px / `"comfortable"` 40px /
  `"spacious"` 48px) instead of being pinned to `comfortable`, which mattered
  because `table.css` styles rows at specificity **(0,3,0)** —
  `.ds-atom-table[data-density="comfortable"] .ds-atom-table-row` — so a
  consumer's own (0,2,0) row rule never applied to anything. `selectable={false}`
  removes the select-all cell and every row checkbox; a `<tr>`'s height is a
  minimum and the 22px checkbox label was the content floor, so both are needed to
  reach a 32px row (measured: 40px → 32px). `pagination={false}` suppresses the
  pager while leaving `page` / `totalPages` / `onPageChange` and the footer row
  count alone.

- **Per-component stylesheets now declare the sibling sheets they need.** The split
  is by component, so a composed component's sheet is incomplete by construction:
  `import ".../css/datagrid"` gave a grid with an entirely unstyled pager, because
  `DataGrid` renders `Pagination`, which renders `IconButton`, and all three are
  separate sheets. Every generated header now lists them, derived from the import
  graph rather than maintained by hand. Nothing to change — the sheets themselves
  are byte-identical — but if you import per-component CSS, **read the header**.
```

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **The pager's touch target is 24px, not 40px — a 20px gap, not 4px.** `Pagination` renders its
   prev/next `IconButton`s at `data-size="sm"`, measured at **24px** painted. The plan's
   "`IconButton`'s largest is 40px, 4px under the floor" is right about the *ceiling* but understates
   the live shortfall by 16px. Two changes are needed, not one: the scale rebase (`F-15-7` / `G-2`)
   **and** a size bump at the call site. **Phase 06.1.**

2. **`.mjs` files are not covered by the pre-commit hook.** `lint-staged`'s glob is
   `*.{ts,tsx,js,jsx,json,jsonc,css}`, so committing `scripts/split-css.mjs` printed *"No staged
   files match any configured task"* and ran nothing. `npm run check` (`biome check .`) **does**
   cover it, so the sibling gate catches what the hook misses — but the hook is the thing that runs
   on every commit, and 01-13 recorded it as load-bearing. Adding `mjs,cjs,mts,cts` to the glob is a
   one-line fix nobody owns yet.

3. **`splitCss` is exported but the module cannot be imported — it writes `dist/css` at import
   time.** That is why `css-split.test.ts` shells out via `execFileSync` rather than importing, and
   why `--deps-json` exists as a flag rather than as a function call. Gating the side effects behind
   `process.argv[1] === fileURLToPath(import.meta.url)` would make the module importable and let the
   test assert the graph directly. Not done here: it changes how `postbuild.mjs` and `css:check`
   invoke the script, which is a build-pipeline decision, and the flag delivers the same assertion.

4. **An unrecognised flag used to rebuild `dist/css` silently.** Fixed (exit 2), and worth recording
   because it is *how* the RED phase failed: `--deps-json` fell through to the write path and printed
   the summary line where JSON was expected, so the test failed at **collection** rather than at an
   assertion — a shape that reads like a broken test file rather than a red gate. Protocol §3(a)
   warns that a stray build makes other plans' `dist/` assertions silently skip; a typo'd flag was a
   route to exactly that.

5. **`selectable` is read at mount for the roving-focus origin.** `useState([HEADER_ROW, selCols])`
   seeds once, so toggling `selectable` on a live grid leaves the stored column stale. The keydown
   handler clamps to `totalCols - 1`, so it cannot point past the last cell — but the *origin* is
   whatever the first render decided. Toggling selection at runtime is not a use case anyone has;
   recorded so the clamp is understood as a guard rather than a full fix.

6. **`DataGrid`'s bulk-action bar hardcodes "Export" / "Archive" / "Clear" and wires none of them.**
   Two of the three buttons have no `onClick` at all. Out of scope for E7 and the three F-13
   findings, but it is the same class of problem this plan just fixed twice over: job-domain
   vocabulary baked into a library component with no way for a consumer to supply its own. Whoever
   owns the admin photo grid will hit it.

8. **`main` in the PLANNING repo advanced 177 commits during this 40-minute plan.** At spawn time
   `HEAD` was `697b094`; at commit time it was `7259024`, with `697b094` still an ancestor and 177
   commits in between — including phase-0 and phase-2 work from other sessions. Nothing of mine was
   affected: the SUMMARY was written in one pass and committed with a specific-path `git add`, so it
   is the only file in `a011db6`. But 01-13's finding #7 (a concurrent `git commit` swept its
   half-written draft into someone else's commit) is not a one-off — `.planning/` is a shared index
   with several phases live in it. **Write the SUMMARY in one pass, `git add` the exact path, and
   commit immediately.** Do not leave it unstaged between edits.

9. **`Badge` still has no class hook**, so "does this cell contain a Badge?" cannot be asserted
   directly — the new tests detect its *absence* via `cell.children.length === 0` and its *presence*
   via label text. `F-15-4`, owned by **01-18**, which will make those assertions cleaner.

---

## Deviations from plan

### Auto-fixed / decided without asking

1. **[Rule 1 — plan premise wrong] `density`'s union is `cozy | comfortable | spacious`.** The plan's
   `"comfortable" | "compact"` names a value that exists nowhere; `cozy` is the 32px mode. Shipped as
   a type derived from `TableRootProps["density"]` so it cannot drift.
2. **[Rule 1 — plan gate unfailable] Task 2 gate 3 passes on the unfixed sheet.** A pre-existing rule
   comment contains "Pagination". Repaired to require import lines inside the generated header;
   NC-2 shows the plan's version passes with the fix disabled too.
3. **[Rule 1 — plan gate fires on required documentation] Task 1 gate 2's `density="comfortable"`.**
   It is a substring of `[data-density="comfortable"]`, which the prop docstring must quote to state
   the (0,3,0) fact. Repaired with a comment strip *and* a word boundary.
4. **[Rule 1 — plan gate too weak] The same gate's `grep -q 'selectable'` / `'ariaLabel'` halves.**
   A mention passes. Narrowed to declarations, mirroring 01-13's repair.
5. **[Rule 1 — bug found during the task] The roving-tabindex `+1` offset.** Not named by the plan,
   silent, and its guard passes in RED by coincidence. Fixed and controlled by NC-3.
6. **[Rule 1 — bug] `text-align` was applied only to plain cells**, so a `status` or `priority`
   column with `align: "right"` silently lost it. Now uniform; measured to move no baseline.
7. **[Rule 2 — missing critical functionality] `priority` gets the same treatment as `status`.** The
   plan names only `status`; the identical key-triggered lookup existed for `priority`, and leaving
   it would close half the finding.
8. **[Rule 2] `render` takes `(value, row)`, not `(row)`.** A row-only signature cannot make a preset
   key-agnostic, which is the requirement.
9. **[Rule 2] `dataGridPresets` and `DataGridDensity` exported from `src/index.ts`.** Not in
   `files_modified`; without it a consumer cannot reach the preset that replaces the behaviour the
   breaking change removed.
10. **[Rule 2] Space is left to the page when `selectable={false}`.** Calling `preventDefault` on a
    grid with nothing to select would break Space-to-scroll.
11. **[Rule 2] `selectionCount` is forced to 0 while unselectable**, so the bulk bar cannot appear
    through any path.
12. **[Rule 2] `split-css.mjs` rejects an unknown flag with exit 2** instead of silently rebuilding
    `dist/css`. Discovered as the RED failure mode; protocol §3(a) is why it matters.
13. **[Rule 3] Two `noUncheckedIndexedAccess` errors in the new tests**, fixed with explicit casts;
    `npm run typecheck` covers stories and tests via `tsconfig.test.json`.
14. **Task boundaries merged.** Both tasks edit the same region of `index.tsx`; splitting would have
    meant reverting and re-adding the preset work. The props + cells land in one commit under the
    plan's own suggested task-2 message; the CSS work, which shares no file, is its own.
15. **The 32px measurement is recorded, not pinned.** Phase 06.1 owns the geometry and will change
    the number; a permanent case asserting 32 here is one that phase has to delete. The probe was
    temporary and deleted.

### Deferred (explicitly, with reasoning)

- **`--row-h` / `--control-h` / `--field-gap` and the `data-density` token layer** — protocol §9,
  Phase 06.1.
- **The pager's 44px touch target** — `IconButton`'s sizes are 24/32/40, so its largest is 4px short
  and **no value of `size` reaches the floor**; the live pager is at 24px, so the real gap is 20px.
  `F-15-7` / `G-2` → Phase 06.1. Recorded so its absence is not read as an oversight.
- **`CHANGELOG.md`** — 01-20's. Wording supplied above; two `BREAKING CHANGE:` footers on `4230b9a`.

### Rule 4 (architectural) — none raised

Nothing required a structural change. The `<Pagination>`-as-sibling DOM shape flagged at line 17 was
read before touching the tree and is **unchanged**: `pagination={false}` removes the element, it does
not move it.

---

## Self-Check: PASSED

```
FOUND: src/data-display/DataGrid/index.tsx           FOUND: 7c4dd35
FOUND: src/data-display/DataGrid/DataGrid.test.tsx   FOUND: 4230b9a
FOUND: src/data-display/DataGrid/DataGrid.stories.tsx FOUND: 4fe6904
FOUND: scripts/split-css.mjs
FOUND: src/css-split.test.ts
FOUND: src/index.ts
FOUND: README.md
FOUND: dist/css/datagrid.css  (2,497 bytes, 8 declared sibling sheets)
ABSENT (correctly): tests/visual/tmp-*.spec.ts
tests/visual/storybook.spec.ts-snapshots: 488 files, diff-clean against pre-run
$DS working tree: tracked-clean; git stash list: empty; charcoal-theme +36
```
