---
phase: 0
plan: 23
subsystem: design-ideation
tags:
  [
    dsgn-01,
    dsgn-04,
    s-photos-reopened,
    real-layout-board,
    masonry,
    drag-reorder,
    focal-point,
    g-1-escalation,
    g-13-escalation,
    d-22,
    d-07,
    d-02-fence,
    hydration-budget,
    pointer-coarse,
    r-6,
    negative-control,
    sortable-strategy-limit,
    sortable-inline-box-model,
    slopsquat-npx-tsc,
  ]

requires:
  - .planning/phases/00-design-ideation/00-13-SUMMARY.md — the admin sketch idiom; S-photos as first built
  - .planning/phases/00-design-ideation/00-14-SUMMARY.md — FocalPointSketch, reused here unmodified
  - .planning/phases/00-design-ideation/00-19-SUMMARY.md — schema decision 6, the focalPoint shape
  - .planning/phases/00-design-ideation/00-RESPONSIVE-CONTRACT.md — binding; six device classes, 44px floor, R-6
  - .playground/src/components/FocalPointSketch.tsx — reused, byte-identical, NOT forked
  - .playground/src/pages/photos.astro — the public masonry the board copies its column model from
provides:
  - "PhotoLayoutBoard.tsx — /admin/photos order view rebuilt as the REAL public masonry with live per-photo focal point"
  - "focalPoint on all 39 fixture photos, in home_config.peekPositions' shape"
  - "00-ADMIN-IA.md §S-photos reopened — G-1 and G-13 escalated in writing with measured evidence"
  - "Three new measured Sortable composition limits: no strategy prop, inline item box model, no announcer passthrough (G-13)"
  - "Correction: 00-FINDINGS.md carries FIFTEEN G- rows, not sixteen"
affects:
  - Phase 1 — G-13 must land there; Phase 7's photo positioning depends on it
  - Phase 7 — photo positioning inherits this board's model and D-22's axis statement
  - Phase 3 — names the second ordering field and migrates focalPoint onto the real manifest

tech-stack:
  added: []
  patterns:
    - "A preview of a public surface is drawn at the PUBLIC surface's spacing, not the host chrome's density-scaled tokens"
    - "Island CSS ships with the component, not in the host page's is:global block"
    - "Selection by delegated capture-phase listeners on a wrapper, because a Sortable tile is itself the drag handle"

key-files:
  created:
    - .playground/src/components/PhotoLayoutBoard.tsx
  modified:
    - .playground/src/pages/admin/photos/[...state].astro
    - .playground/src/fixtures/photos.json
    - .planning/phases/00-design-ideation/00-ADMIN-IA.md
  deleted:
    - .playground/src/components/SortableReorder.tsx

decisions:
  - "The BOARD moved to match /photos, not the reverse — photos.astro is outside this plan's scope and a board that invents its own column count is the failure the plan exists to remove"
  - "Two named tile frames (Gallery / Peek slot) because the public gallery is UNCROPPED, so object-position is inert there and a single-frame board would have lied"
  - "FocalPointSketch is passed 3:2, not the photo's own aspect, because .fp-frame hard-codes aspect-ratio 3/2 and the ratio prop feeds only the arithmetic"
  - "No row added to 00-FINDINGS.md; escalations recorded in 00-ADMIN-IA.md per that file's own fixed-denominator rule"

metrics:
  duration: ~35 min
  completed: 2026-08-18
---

# Phase 0 Plan 23: The `/admin/photos` Layout Board Summary

`/admin/photos` now reorders photos **inside the real public masonry** — same three columns,
same 16px gap, same real aspect ratios as `/photos` — with an editable focal point on all 39
photos whose crop updates the tile live, and G-1 and G-13 escalated in writing rather than
patched locally.

## NO COMMIT FOR TASKS 1 AND 2 — THE D-02 SCOPE FENCE

Every file tasks 1 and 2 touch lives inside `.playground/`, which is **gitignored** by the D-02
scope fence. Five prior plans recorded the same thing. `git status --short` is empty for all of
it. The durable committed output is task 3's amendment to `00-ADMIN-IA.md` plus this SUMMARY,
and the screenshots plan 00-17 takes before the playground is deleted.

## THE FOUR PLAYGROUND FILES THE ORCHESTRATOR MUST COPY BACK

This plan ran in a git worktree with its own copy of `.playground/`. Nothing in it is committed.
Copy these four, from
`.claude/worktrees/agent-a7db64ad58a7e5abd/.playground/` into the main checkout's `.playground/`:

| # | Path (relative to `.playground/`) | What it is |
|---|-----------------------------------|------------|
| 1 | `src/components/PhotoLayoutBoard.tsx` | **NEW, 743 lines.** The real-layout reorder board: public masonry, drag order, live focal point via a reused `FocalPointSketch`, D-22's axis sentence, both order numbers per tile, the staged strip. Ships its own CSS. |
| 2 | `src/components/SortableReorder.tsx` | **DELETE THIS FILE.** Replaced by (1). It is already deleted in the worktree; the copy-back must remove it from main, not merely skip it. |
| 3 | `src/pages/admin/photos/[...state].astro` | **MODIFIED, 868 lines.** Imports and renders `PhotoLayoutBoard` at the single `client:load` site; new `LAYOUT BOARD / ORDER + FOCAL POINT` section copy; the deleted island's dead `.ph-*` CSS removed from the `is:global` block. |
| 4 | `src/fixtures/photos.json` | **MODIFIED, 7711 lines.** `focalPoint` added to every photo record — 259 inserted lines across all 8 states, covering all 39 unique photos. Every pre-existing byte is unchanged. |

`FocalPointSketch.tsx` is **not** in that list and must **not** be copied: it is byte-identical
to main (`sha256 71754ec92ae3e18648ee47117aca55d8453daf1a369ca7957714421b4d845ec2`).

## What was built

### Task 1 — `PhotoLayoutBoard.tsx`, and `SortableReorder.tsx` deleted

Replaced rather than added: a component named for the abstract grid it no longer renders is a
name that lies, and the hydration budget allows exactly one island on this screen.

The old view was `auto-fill, minmax(128px, 1fr)` with a **fixed 88px thumbnail**. A tile whose
height is 88px regardless of the photo says nothing about where that photo lands in a masonry
whose entire shape comes from real aspect ratios — which is why it could not answer the user's
question.

The board renders `column-count: 3` / `column-gap: 16px` / 10px radius, tiles at their own
`aspect-ratio: W/H`, captions **overlaid** rather than stacked underneath (a footer below the
image would change tile heights and the composition would stop being the public one).

**Focal editing is beside the board, never on the tile.** `SortableItem` spreads dnd-kit's
listeners onto the item wrapper, so the tile **is** the drag handle and carries `role="button"`
`tabindex="0"` — confirmed in the browser. A control nested inside it would be invalid ARIA and
unreachable by keyboard. The constraint and its resolution are commented where the tile is
defined, because the obvious implementation is the forbidden one. Selection is delegated:
`onPointerDownCapture` runs before dnd-kit's own bubble-phase handler, and `onFocusCapture`
catches `focusin` from tabbing or arrowing.

### Task 2 — wired, and all 39 given a focal point

`focalPoint` added in `home_config.peekPositions`' `"50% 25%"` shape (schema decision 6). The
edit was a **text insertion, not a reparse-and-rewrite**: the script inserts one line after each
`"src":` line and then proves that deleting the inserted lines reproduces the original file
exactly, refusing to write otherwise.

- **259 lines inserted**, one per photo record across all 8 states
- **39 unique photo ids** — counted against the shipped fixture, not quoted from a doc
- **7 non-default values**, chosen to move both axes so an x-axis bug cannot hide:
  `architecture-hawamahaldaytime` `50% 25%` (the site's one real crop, carried verbatim from
  `src/data/home_config.json` so the two sources agree), `portraits-portraitpatrikagate1`
  `50% 20%`, `portraits-whitedresshalf` `50% 18%`, `architecture-officegreens` `50% 30%`,
  `street-tunnelvision` `50% 62%`, `wildlife-kingfisher` `62% 40%`, `abstract-plane` `38% 44%`

`data/portfolio_images.json` is **untouched** — `git status --short` empty throughout.

Everything else on the screen survives: all 7 `STATES`, `filtered-empty`, the 8 `Chip` category
anchors, the dropzone, the `DataGrid` over all 39, the staged strip, both pinned detail panels.
Exactly **one** line carries the directive string; the built page ships exactly **1** island.

### Task 3 — escalations, browser audit, keyboard drive, two controls

`00-ADMIN-IA.md` gained a 225-line section: why `S-photos` reopened in the user's own words, why
it is **consistent with D-07** (that decision already chose a full-width preview over a split
pane — this makes it editable, not read-only), the column model and which side moved, G-1's
escalation, G-13's escalation, the third `Sortable` composition limit, and the register
correction.

## Measurements — all in a browser, none by grep

### The column model now agrees at every class

| Width | `/photos` | board |
|-------|-----------|-------|
| 344 | cols=3 gap=16px radius=10px | cols=3 gap=16px radius=10px — **agree** |
| 768 | cols=3 gap=16px radius=10px | cols=3 gap=16px radius=10px — **agree** |
| 1440 | cols=3 gap=16px radius=10px | cols=3 gap=16px radius=10px — **agree** |

Two defects had to be fixed to get there, and **neither was visible to grep** (see Deviations 6
and 7).

### 44px floor, `under44=0` everywhere it is required

`audit15.mjs` across all five `/admin/photos/*` routes × six device classes: **AUDIT PASS**,
`under44=0` at all five coarse classes on every route, zero horizontal scroll, zero page errors.
(`under44` is the **raw** count — the de-duplication the brief warns about affects only the
itemised detail lines printed beneath it, not that figure.)

Board-owned hit areas at 344 coarse, from `getBoundingClientRect`, not from a rule:

| Control | n | min height |
|---------|---|-----------|
| axis + frame buttons | 10 | **44px** |
| masonry tiles (the drag handles) | 36 | 62.2px |
| staged tiles | 3 | 100px |

### R-6 — reflow, never hide

| Content | 344 | 1440 | |
|---------|-----|------|--|
| category chips | 8 | 8 | same |
| axis + frame buttons | 10 | 10 | same |
| masonry tiles | 36 | 36 | same |
| staged rows | 3 | 3 | same |
| DataGrid rows | 39 | 39 | same |
| detail panels | 3 | 3 | same |

Nothing is dropped at 344; it reflows.

### The keyboard reorder drive — G-13's evidence, VERBATIM

Chromium against the built `dist/`, keyboard only. Focused element:
`<div role="button" tabindex="0">`.

- `Space` → *"Draggable item abstract-intothemist was moved over droppable area
  abstract-intothemist."*
- `ArrowDown` → *"Draggable item abstract-intothemist was moved over droppable area
  abstract-lightscameraart."*
- `Space` → *"Draggable item abstract-intothemist was dropped over droppable area
  abstract-lightscameraart"*

Order before: `[abstract-intothemist, abstract-lightscameraart, abstract-watertexture, …]`
Order after: `[abstract-lightscameraart, abstract-intothemist, abstract-watertexture, …]`

**The movement works. The speech does not.** Raw record slugs, never the title ("Into The
Mist"), never a position — never "position 2 of 36", the one fact a reorder user needs. Three
live regions already exist on the page, one per `DndContext`. Wording is unchanged from plan
13's measurement on the abstract grid, so this is a second independent confirmation.

### The focal keyboard drive — the tile follows the value

On `architecture-hawamahaldaytime`:

| Step | `FocalPointSketch` readout | tile `object-position` in the masonry |
|------|---------------------------|----------------------------------------|
| at rest | `50% 25%` | `50% 25%` |
| `→ ×5`, `↓ ×3` | `55% 28%` | `55% 28%` |
| `Shift+↑` | `55% 18%` | `55% 18%` |

The tile caption moved with it (`focal 55% 18%`). Switching to the peek frame measured
`aspect-ratio: 3 / 2`, `object-fit: cover`, `object-position: 55% 18%`. Zero page errors.

### Two negative controls — both bit, both restores byte-identical

**Control A — strip `focalPoint` from one record.** Removed 7 lines for
`abstract-intothemist`. The task-2 acceptance check **failed** (the check bites). The build
still succeeded and the board rendered `object-position: 50% 50%` **without throwing** — the
field is genuinely optional per schema decision 6. Restored; `sha256 892e01910b627b4d…`
identical; check passed again.

**Control B — add a second hydration directive.** Directive lines went 1 → 2, so the one-line
grep failed. Asserted on **behaviour, not on the edited string**: islands in the built page went
**1 → 2**. Restored; `sha256 2cedb9d6ebebe25b…` identical; island count back to 1; exactly one
directive line again.

### Gates

`astro build` 92 pages · `check-no-js.sh` 0 · `check-states.mjs` 0 (49 state pages) ·
`check-coverage.mjs` 0 (42/42 cells) · `check-no-ivory.sh` 0 · `check-theme-exhaustive.mjs` 0 ·
`check-font-names.mjs` 0 · `check-contrast.mjs` 0 · `check-css-size.mjs` 0 ·
`check-bundle.mjs` **1, by design (G-15)**.

## Findings and escalations

Recorded in `00-ADMIN-IA.md`, **not** as new rows in `00-FINDINGS.md`.

- **G-1 escalates** from Home's six peek slots to the whole 39-photo gallery admin. Tier
  unchanged (`backlog`, `blocks-Phase-7`); only the blast radius changed. Plan 14's 269
  non-comment lines were **reused**, provably — the file is byte-identical. Two new properties
  of the absence were measured: the stand-in has **no value-out channel** (no `onChange`, no
  controlled value; live coupling required a `MutationObserver` on its rendered readout), and
  its **frame ratio is a prop in the arithmetic only** (`.fp-frame` hard-codes
  `aspect-ratio: 3 / 2`).
- **G-13 escalates** from a secondary control to the **primary interaction of the screen**.
  Restated correctly: `defaultAnnouncements` exist, speech happens, it speaks slugs and no
  position, and `Sortable` exposes no way to replace it — the fix is to **expose** an announcer.
  **Phase 7's photo positioning depends on G-13 landing in Phase 1.** No local announcer added;
  `grep -qE 'aria-live|announcements|screenReaderInstructions'` exits 1 against the board.
  Plan 13 asserted this against `SortableReorder.tsx`, which is now deleted — future checks must
  point at `PhotoLayoutBoard.tsx`.
- **New — `Sortable` has no `strategy` prop.** It hard-codes `verticalListSortingStrategy`
  (`dist/index.js:9839`), so the in-flight shuffle transform is one-axis and wrong in any
  multi-column layout. Collision is `closestCenter` on real rects, so the **drop target and the
  post-drop reflow are correct**; only the preview is wrong. Neutralised in the board's own CSS,
  with `DragOverlay` carrying the feedback.
- **New — `Sortable` hard-codes its item box model inline.** Items render as
  `<li style={{listStyle:"none", padding:0, margin:0}}>` (`dist/index.js:9845`), which beats any
  consumer stylesheet, so item spacing is unreachable without `!important`.
- **New — `00-FINDINGS.md` carries FIFTEEN `G-` rows, not sixteen.** See Deviation 3.

## Deviations from Plan

### 1. [Environment] Executed in a git worktree, not the main working tree

The plan's `<execution_environment>` says to run on the main tree because `.playground/` does
not propagate into a worktree. The orchestrator overrode this and spawned a parallel worktree
with a mandatory step-zero instruction to copy `.playground/` in from the main checkout, because
a sibling agent (plan 00-22) is concurrently editing the main playground and both plans run
`rm -rf dist && astro build`, which cannot be shared. Copy verified before any other work: 92
pages, exit 0. **Fence verified by SHA-256 and mtime** — every gate script, `photos.astro` and
`FocalPointSketch.tsx` are byte-identical to main, and every sibling-owned file in my copy still
carries the copy-time mtime `12:04:32`, so the five files that differ from main differ because
the sibling changed **main**, not because I changed my copy.

### 2. [Rule 3 — Blocking] The `npx tsc --noEmit` gate is not runnable, and reaches a squatted package

Task 1's verification ends `npx tsc --noEmit -p tsconfig.json`. **TypeScript is not a dependency
of the playground** — no `typescript` in `package.json`, none anywhere in `node_modules`. So
`npx tsc` resolves to the unrelated registry package **`tsc@2.0.4`**, which is deprecated, prints
*"This is not the tsc command you are looking for"* and exits 1. Any prior plan running this gate
got a false failure or auto-downloaded that stub.

**No package was installed.** Installing a package to satisfy a gate is outside auto-fix scope,
and auto-substituting for a name that does not resolve as expected is precisely the slopsquat
hazard. The compile gate used instead is `astro build`, which parses and transforms every `.tsx`
and fails on syntax errors and unresolved imports — it caught two real errors in this plan (see
Deviation 8). **Recommendation for the phase:** either add `typescript` + `@astrojs/check` as
devDependencies and use `astro check`, or drop the `tsc` line from plan templates. Leaving it
invites `npx` to fetch an unvetted package on every run.

### 3. [Correction] The findings register has FIFTEEN rows, not sixteen — no row was added

Task 3's verification gates on
`test "$(grep -c '^| \*\*G-' 00-FINDINGS.md)" = "16"`. Counted against the shipped file, it is
**15** — `G-1` through `G-15`. The plan's prose says "the sixteen" throughout. The gate is
arithmetically wrong.

**The register was left untouched.** Making the gate pass would have meant adding a row, which
is exactly the tampering threat T-00-69 names — the tiers bound Phase 1's and Phase 7's scope.
Fifteen is the correct fixed denominator; the correction is recorded in `00-ADMIN-IA.md`.

### 4. [Rule 1 — Bug] `FocalPointSketch` is passed 3:2, not the photo's own aspect ratio

The plan says the frame ratio "is ALREADY parameterised, so a non-3:2 frame needs no component
change" and to "pass the photo's own aspect rather than 3:2". **It is parameterised in the
arithmetic only.** `frameRatioW/H` feed the axis calculation and the visible-band readout, but
`.fp-frame` hard-codes `aspect-ratio: 3 / 2` in the component's own CSS. Passing the photo's own
aspect makes `liveAxis` compute as `"neither"` and the panel say *"the photo already matches the
frame, and neither number moves anything"* — while the frame is still painting at 3:2 and still
cropping. The control would have described a frame it was not drawing.

Fixed by using **one constant** (`PEEK_W`/`PEEK_H` = 3/2) for both the peek tile frame and the
props, so the maths and the paint agree. The parameterisation gap is recorded under G-1 as a
requirement on any upstream `FocalPointPicker`.

### 5. [Rule 1 — Bug] The board has two named tile frames, because the public gallery does not crop

The plan says each tile applies its focal point live as `object-position` so that changing the
crop changes the tile "in the masonry immediately". Measured, the public tile is
`<a class="ph-tile" style="aspect-ratio: W / H">` with `.ph-img { width: 100%; height: auto }` —
**uncropped at the photo's own aspect ratio**, so `object-position` is **inert on `/photos`**. A
board showing a live crop in the gallery frame would have been lying about the surface it
imitates.

Resolved by giving the board two frames and naming which is on screen: **Gallery** (the `/photos`
composition exactly, the default) and **Peek slot** (3:2 cover — Home's frame, where the value
actually bites). Column count, gap, radius and reading order are identical in both. The focal
marker renders in both, so the point stays visible even where it does not move the image.

### 6. [Rule 1 — Bug] The masonry gap is pinned to 16px, not `var(--space-4)`

Writing the token — which is what `photos.astro` writes — drew the board at 16px on every coarse
class and **12px at 1440**, because `density-compact.css:98` reassigns `--space-4: 12px` under
`pointer: fine` and the board lives inside the admin. Caught by the probe
(`/photos gap=16px` vs `board gap=12px`), invisible to grep. A narrower gap widens the columns,
changes tile heights, and moves where the multi-column algorithm breaks — so the board would have
shown a composition the public page does not have, at the one class the operator works on.
Pinned to the public literal, with the reason written beside it.

### 7. [Rule 1 — Bug] `!important` on the masonry item margin

`Sortable` renders every item as `<li style={{listStyle:"none", padding:0, margin:0}}>`, an
**inline** style that beats any consumer stylesheet. The vertical rhythm the public masonry gets
from `margin-bottom: var(--space-4)` was therefore unreachable, and the board rendered with
**zero vertical gap** until `getComputedStyle` reported `margin-bottom: 0px`. A stylesheet
`!important` outranks a non-important inline style and is the only route left. Recorded as a
composition limit, not hidden.

### 8. [Rule 1 — Bug] Backticks inside the component's CSS template literal

Twice, prose backticks written inside `PB_CSS` terminated the template literal and failed the
build with a parse error. Caught by `astro build` both times. Seven lines stripped. Noted because
the playground idiom of heavily commented CSS-in-a-template-literal makes this a recurring trap
for any plan adding an island stylesheet.

### 9. [Scope] Dead island CSS removed from the route's `is:global` block

The deleted component's `.ph-reorder` / `.ph-axis-*` / `.ph-tile*` rules had no consumer left.
`PhotoLayoutBoard` ships its own CSS with the component (the `FocalPointSketch` idiom), which is
both portable and checkable — the masonry copied from `photos.astro` is one block that can be
diffed against one block. The route file shrank 40558 → 37313 bytes and the block's lead comment
and coarse-pointer floor were updated to match.

## Out of scope — recorded, not fixed

**`/photos/` fails the 44px floor at all five coarse classes**, with 7 undersized targets: the
`akhil saxena` wordmark (20px), `.ph-xlink` "← see the work" (30px), and
`.ds-atom-link.ds-atom-footer-link` footer links (22.5px). None are owned by this plan —
`photos.astro` and the public shell are outside its five-file fence, and the failures predate it.
**Consequence:** task 3's automated one-liner
(`node audit15.mjs /admin/photos/ /photos/`) cannot exit 0 for reasons this plan cannot address.
The `<verification>` criterion that actually applies — *"zero undersized targets **owned by this
plan** across the five photos routes at all six classes"* — is met. Not written to
`deferred-items.md` because that file is outside this plan's path fence and a sibling agent is
running concurrently; it belongs there and should be moved by whoever owns the public routes.

## Self-Check: PASSED

```
FOUND: .playground/src/components/PhotoLayoutBoard.tsx          (743 lines)
GONE : .playground/src/components/SortableReorder.tsx           (deleted, as required)
FOUND: .playground/src/pages/admin/photos/[...state].astro      (868 lines, 1 directive line)
FOUND: .playground/src/fixtures/photos.json                     (7711 lines, 259 focalPoint)
FOUND: .planning/phases/00-design-ideation/00-ADMIN-IA.md       (679 -> 904 lines)
FOUND: .planning/phases/00-design-ideation/00-23-SUMMARY.md     (this file)

grep FocalPointSketch PhotoLayoutBoard.tsx                      -> 7   (reused)
grep -E 'aria-live|announcements|screenReaderInstructions'      -> 0   (G-13 intact)
grep any-pointer PhotoLayoutBoard.tsx                           -> 0
grep 'pointer: coarse' PhotoLayoutBoard.tsx                     -> 2
grep -c 'client:' [...state].astro                              -> 1
grep -c SortableReorder [...state].astro                        -> 0
grep -c '<astro-island' dist/admin/photos/index.html            -> 1
grep -c '^| \*\*G-' 00-FINDINGS.md                              -> 15  (unchanged; plan said 16)
git status --short                                              -> empty (real manifest untouched)
```

Commits are listed by the orchestrator; tasks 1 and 2 produced none, per the D-02 fence above.
