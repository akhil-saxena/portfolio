---
phase: 0
plan: 22
subsystem: design-ideation
tags:
  [
    dsgn-03,
    dsgn-04,
    r-2,
    r-6,
    two-state-landing,
    svh,
    height-budget,
    peek-gallery,
    scroll-snap,
    prefers-reduced-motion,
    six-class-matrix,
    class-vs-classname,
    astro-scoped-css,
    negative-control,
    t-00-62,
    t-00-63,
    t-00-64,
    t-00-65,
    t-00-66,
  ]

requires:
  - 00-RESPONSIVE-CONTRACT.md — BINDING; §5 the whole mechanism, §5.1 svh, §5.2 the foldable, §5.3 the height budget, §5.4 snap, §5.5 reduced motion, §5.6 keyboard/AT, §5.7 R-2
  - 00-21-SUMMARY.md — the shell this builds on: `min-height: 100svh` on body, the 375/673/1024 rungs, `--pub-gutter`, the dvh prohibition, the rail-is-forbidden-on-Home ruling
  - .playground/src/layouts/Public.astro (plan 09, modified by 00-21) — read, not modified
  - .playground/src/pages/home-act2.astro (plan 09, fixed by 00-21) — Act 2 extracted out of it here
  - .playground/src/data/home_config.json, portfolio_images.json, resume.json — rendered as committed
  - audit15.mjs / audit21.mjs (plans 15 / 21) — re-run on both Home routes
provides:
  - "X-home at /home — the two-state landing, both states, working at all six device classes"
  - "components/HomeAct2.astro — ONE Act-2 composition rendered by /home and /home-act2, proved visually neutral across 2 592 boxes"
  - "`min-height: calc(100svh - var(--hm-above))` — state A's budget, with the 131px of chrome above it MEASURED rather than assumed"
  - "the peek arrangement solved per class as a height budget, with column count on width rungs and tile aspect on a height rung"
  - "the departure measured at 6/6, and two negative controls that bite at 6/6 in opposite directions"
  - "audit22.mjs, control22.mjs, navprobe22.mjs, snap22.mjs, classprobe22.mjs — five measuring instruments in .playground/"
  - "four class= -> className= fixes; Ivory→Charcoal exception 3 applies on /work's project cards for the first time"
  - '00-PUBLIC-DESIGN-NOTES.md "## Home two-state landing" — arrangement table, departure numbers, control hashes, both new findings'
affects:
  - Phase 0 plan 00-17 — /home is a new screenshot target; X-home and X-home-act2 are both registered and both captured
  - Phase 0 plans 00-24, 00-25 — .playground/ left building at 93 pages with every gate in its expected state
  - Phase 1 — TWO new design-system findings: AppBar exposes no height property, and Chip clobbers a consumer className where Card concatenates. Plus Card inlines `display`
  - Phase 3 — home_config.ctas still points at the legacy /portfolio route; recorded as a content migration, not rewritten
  - Phase 5 — PUB-01 inherits a built landing; --hm-sticky-nav is the one line to change if PUB-09 makes the nav sticky

tech-stack:
  added: []
  patterns:
    - a full-viewport section is `100svh` MINUS the measured chrome above it, never a bare 100svh
    - the peek grid's column count steps on width rungs and its tile aspect steps on a HEIGHT rung, because the thing being solved is a height
    - reach a component's root from a page with `:global(html:has(.page-marker) #target)`, and let custom properties inherit rather than trying to select through the cid
    - a negative control must assert on the property its own mutation can break — verify the direction, not just that the mutation is real
    - `className`, never `class`, on a React design-system component, and verify the style APPLIED in a browser rather than that the source says so

key-files:
  created:
    - .planning/phases/00-design-ideation/00-22-SUMMARY.md
    - .playground/src/pages/home.astro (gitignored)
    - .playground/src/components/HomeAct2.astro (gitignored)
    - .playground/audit22.mjs (gitignored)
    - .playground/control22.mjs (gitignored)
    - .playground/navprobe22.mjs (gitignored)
    - .playground/snap22.mjs (gitignored)
    - .playground/classprobe22.mjs (gitignored)
  modified:
    - .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md
    - .playground/src/pages/home-act2.astro (gitignored)
    - .playground/src/lib/artefacts.mjs (gitignored)
    - .playground/src/pages/index.astro (gitignored)
    - .playground/src/pages/work.astro (gitignored)
    - .playground/src/pages/work-recolour.astro (gitignored)

decisions:
  - State A is `calc(100svh - var(--hm-above))`, not `100svh` — the 131px of AppBar row plus main padding above it comes out of the budget, or one viewport of scroll leaves a band of photographs on screen
  - The 131px is MEASURED at all six classes and constant; the 87px AppBar half is a hard-coded number and that is recorded as a design-system gap, guarded by the departure assertion rather than left to rot
  - Tile aspect steps on a `min-height: 800px` rung, not a width rung — §5.3 asks for exactly this and it is not the aspect-ratio branch §1 forbids
  - Class 3's narrow end got 16:9 (measured 192×108) over 2:1, because both fit and 16:9 keeps more of the photograph
  - State B carries `min-height: 100svh`, because at 768×1024 it measured 12px short of a viewport and the document could not scroll far enough to complete the departure
  - Act 2 extracted to a component rather than copied, and the extraction proved visually neutral by geometry snapshot rather than by byte-comparing HTML that Astro rehashes anyway
  - Snap reaches `<html>` through `:global(html:has(.hm-a))` rather than a bare global rule, so the scoping is a property of the markup rather than of the bundler's chunking
  - The plan's single 60svh negative control was replaced by two controls in opposite directions, because 60svh cannot break the departure assertion it was pointed at
  - `Chip` clobbering a consumer `className` recorded as a finding, not worked around by hand-writing `ds-atom-chip` in the consumer
  - `Card` inlining `display: block` recorded as a finding, not patched with `!important` from the consumer

metrics:
  duration: ~35 min
  tasks: 3
  commits: 2 (tasks 1 and 2 are playground-only — D-02 fence)
  completed: 2026-08-18
---

# Phase 0 Plan 22: Home Two-State Landing Summary

`/home` now shows one viewport of photographs with a real anchor as its scroll prompt, and one
viewport of scroll clears it **completely at all six device classes** — measured in Chromium,
not asserted. The mechanism is a plain document scroll: zero framework JS, zero aspect-ratio
branch, zero JS viewport measurement.

## What was built

**Task 1 — state A.** `src/pages/home.astro`: the name treatment, the six-photo peek grid and
the scroll prompt inside one `min-height` viewport box. All six `peekIds` render at all six
classes; column count steps on the settled 375 / 673 / 1024 width rungs and tile aspect steps on
a **height** rung, because what §5.3 is solving is a height.

**Task 2 — state B.** Act 2 extracted to `src/components/HomeAct2.astro` and rendered by both
`/home` and `/home-act2`, so one approved composition cannot exist twice in the screenshot
record. Then the work band and a real, small résumé section, after state A in DOM order, with
three named landmarks and nothing hidden from assistive technology.

**Task 3 — snap, reduced motion, the audit, the record.** `scroll-snap-type: y proximity` inside
`prefers-reduced-motion: no-preference`, verified by `getComputedStyle`. `X-home` registered in
`CANONICAL_IDS` and indexed on the contact sheet. Six-class audit, two negative controls, and
the committed record in `00-PUBLIC-DESIGN-NOTES.md`.

## The one number that decides the whole thing

**State A is `100svh` minus the chrome above it, and getting that wrong is a 131-pixel error
that looks like nothing in the source.** State A is not the first thing on the page — the
AppBar row and `.pub-main`'s top padding sit above it. A bare `100svh` section has its *bottom*
one viewport **plus** that chrome down the document, so one viewport of scroll leaves a band of
photographs on screen and the requirement fails while the CSS looks exactly right.

Measured with `navprobe22.mjs`, and **constant at all six classes** — the AppBar does not wrap
even at 344:

| | 344×882 | 390×844 | 673×620 | 768×1024 | 1024×768 | 1440×900 |
|---|---|---|---|---|---|---|
| `.pub-bar` height | 87 | 87 | 87 | 87 | 87 | 87 |
| `.pub-main` padding-top | 44 | 44 | 44 | 44 | 44 | 44 |
| first section top | **131** | **131** | **131** | **131** | **131** | **131** |

This is also how §5.2's own arithmetic counts it — its class-3 table spends "Nav 56" *inside*
the 712px it budgets. So `min-height: calc(100svh - var(--hm-above))`.

## The peek arrangement, per class, with measured heights

| Class | Viewport | `svh` | Budget | Arrangement | Tile (measured) | Gallery |
|---|---|---|---|---|---|---|
| 1 folded cover | 344×882 | 882 | 751 | 2 × 3 at 3:2 | 148 × 99 | 329 |
| 2 phone | 390×844 | 844 | 713 | 2 × 3 at 3:2 | 163 × 109 | 359 |
| 3 foldable narrow | 673×620 | 620 | 489 | **3 × 2 at 16:9** | **192 × 108** | **232** |
| 4 tablet portrait | 768×1024 | 1024 | 893 | 3 × 2 at 3:2 | 224 × 149 | 314 |
| 5 tablet landscape | 1024×768 | 768 | 637 | 3 × 2 at 16:9 | 299 × 168 | 352 |
| 6 desktop | 1440×900 | 900 | 769 | 3 × 2 at 3:2 | 317 × 212 | 440 |

**Class 3's narrow end was checked first and is the binding case, exactly as §5.2 said.** At
673 × 620 the tile measures **192 × 108** — 16:9, and the contract's derived table predicted
192 × 108 for that arrangement *to the pixel*. 3:2 at the same width is 192 × 128, two rows plus
the gap being 272px, which is §5.2's ~44px overflow. 16:9 keeps more of the photograph than 2:1
and fits, so 16:9 shipped. Nothing overflows at any class, so `min-height`'s visible-overflow
escape was never needed.

## The departure

| Class | `svh` | State A top / height / **bottom** | After one viewport of scroll | State B below the fold |
|---|---|---|---|---|
| 344×882 | 882 | 131 / 751 / **882** | `photosBottom=0` **departed** | 1475px |
| 390×844 | 844 | 131 / 713 / **844** | `photosBottom=0` **departed** | 1388px |
| 673×620 | 620 | 131 / 489 / **620** | `photosBottom=0` **departed** | 1062px |
| 768×1024 | 1024 | 131 / 893 / **1024** | `photosBottom=0` **departed** | 1182px |
| 1024×768 | 768 | 131 / 637 / **768** | `photosBottom=0` **departed** | 1001px |
| 1440×900 | 900 | 131 / 769 / **900** | `photosBottom=0` **departed** | 1058px |

State A's bottom equals `svh` **exactly** at all six. `doc == viewport` at all six on both
`/home` and `/home-act2` — zero horizontal scroll, so the `.ha-grid` reflow plan 00-21 added
survived the rewrite (re-measured, as that file's note asks, rather than assumed).

**R-2 as implemented:** state B continues 1001–1475px below the fold at all six classes, and
that is the resolution rather than a defect. No route removed, no section removed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The plan's own negative control could not fail**

- **Found during:** Task 3
- **Issue:** The plan specified: change `100svh` to `60svh` and confirm the **departure**
  assertion fails at every class. Run exactly as written it reported `departed` at **all six**.
  The reason is arithmetic, not instrumentation: **a shorter state A departs more easily, not
  less.** One viewport of scroll clears a 60svh block with room to spare. The mutation is real
  and the assertion is real; they simply do not meet. Reporting it as a pass would have recorded
  a control that cannot fail — the exact thing a control exists to rule out.
- **Fix:** state A being *exactly* one viewport is two requirements wearing one declaration, and
  each fails in its own direction. Two controls, each asserting on the property its own mutation
  breaks. `60svh` (too short) breaks *"the landing shows the photos section"* — state A's bottom
  falls short of `svh` and the work band is on screen before the reader scrolls: 717/882,
  747/844, 618/620, 700/1024, 738/768, 797/900. `160svh` (too tall) breaks *"the photo section
  moves fully up"* — `photosBottom` after one viewport of scroll is +529, +506, +372, +614,
  +461, +540. **Both bite at 6/6.** Both measure with snap disabled, because proximity snap
  parks `photosBottom` at exactly 0 even when the budget is wrong — the enhancement masking the
  mechanism. Restore is byte-identical: `sha256 27d04a4f…5ba0ac8` before and after.
- **Files modified:** `.playground/control22.mjs`
- **Commit:** none — D-02 fence

**2. [Rule 1 — Bug] `#work`'s snap and scroll-margin rules matched nothing**

- **Found during:** Task 3, in a browser probe
- **Issue:** `getComputedStyle(work).scrollSnapAlign` read **`none`** while the source said
  `start`. Astro scopes a page's rules with the *page's* cid and a component renders with its
  *own*: the work band is `HomeAct2.astro` and emits `data-astro-cid-53zdqmy2`, while every rule
  in `home.astro` compiles to `data-astro-cid-vbfttlze`. A bare `#work { }` in the page compiles
  to `#work[data-astro-cid-vbfttlze]` and matches nothing. **This is plan 00-21's rail defect
  exactly, in a new costume** — and the plan's grep gates pass the broken version in both cases.
- **Fix:** `:global(html:has(.hm-a) #work)` reaches it, and the page's three measurements moved
  onto the document element so they *inherit* into the component. `scroll-margin-top`'s honest
  value is 0 and the CSS initial value is also 0, so reading it back proves nothing — the audit
  now overrides `--hm-sticky-nav` with an inline style on `<html>` (which outranks the
  stylesheet rule) and reads `#work`'s computed `scroll-margin-top` back as **37px**.
- **Files modified:** `.playground/src/pages/home.astro`, `.playground/audit22.mjs`
- **Commit:** none — D-02 fence

**3. [Rule 1 — Bug] The departure failed at 768×1024 because the document could not scroll**

- **Found during:** Task 3's first audit run
- **Issue:** `scrollY=1012, photosBottom=12, NOT DEPARTED`. The whole of state B — work,
  résumé, crosslink and footer together — came to **1012px against a 1024px viewport**. Twelve
  pixels short. The document was 2036px tall so its maximum scroll offset was 1012px, and *a
  page that cannot scroll a full viewport cannot complete the departure.* Tablet portrait is the
  only class in the matrix tall enough in absolute pixels to run out of document before it runs
  out of viewport; the other five clear it by 71px to 563px.
- **Fix:** `.hm-b { min-height: 100svh }`. The rule comes out of the user's own sentence rather
  than out of the test that caught it: for work and résumé to be what *fills* the view once
  state A has gone, they have to be able to fill it. Same unit as state A, because the two are
  halves of one transition and denominating them differently would make the target distance
  depend on which half you measured.
- **Files modified:** `.playground/src/pages/home.astro`
- **Commit:** none — D-02 fence

**4. [Rule 2 — Missing critical] Snap would have snapped the page on load**

- **Found during:** Task 3, reasoning about where a snap area starts
- **Issue:** A snap area starts at the element's own box, and state A's box begins 131px down
  the document. `scroll-snap-align: start` alone puts snap point one at **131**, not 0 — close
  enough to the initial scroll offset for proximity to pull it — so the page would scroll itself
  131px at first paint and hide the nav. That is precisely the *"large involuntary viewport
  translation"* §5.4 is written to avoid, introduced by the enhancement meant to respect it.
- **Fix:** `scroll-margin-top: var(--hm-above)` on state A outsets the snap area by the chrome
  above it, putting snap point one at 0 where the landing actually is. Snap point two needs no
  outset: the work band starts exactly one viewport down and the nav is not sticky.
- **Files modified:** `.playground/src/pages/home.astro`
- **Commit:** none — D-02 fence

**5. [Rule 3 — Blocking] Two of my own comments would have failed the plan's own grep gates**

- **Found during:** Task 1
- **Issue:** `grep -v '^[[:space:]]*[/*]' | grep -cE '100vh|100dvh|100lvh'` returned **2**. The
  filter drops a line that *opens* a comment but keeps continuation lines, so a paragraph
  explaining *why* a unit was rejected reads to the instrument as a declaration using it. This
  is 00-21's deviation 5, hit from the same direction.
- **Fix:** each forbidden token moved onto a line that opens its own comment. Both tokens are
  still named in full and the explanation is not weakened — the file carries a note telling the
  next person why the comments are shaped that way.
- **Files modified:** `.playground/src/pages/home.astro`
- **Commit:** none — D-02 fence

**6. [Rule 1 — Bug] The audit modelled every class as a fine pointer**

- **Found during:** Task 3
- **Issue:** The prompt's hit box measured **16px at all six classes**, including the five
  coarse ones — so the `@media (pointer: coarse)` 44px floor looked absent. Playwright's default
  context has `hasTouch: false`, so `pointer: coarse` never matched and a touch-only rule read
  as missing. The rule was correct; the instrument was measuring the wrong device.
- **Fix:** `hasTouch` set per class, following `audit21.mjs`'s own model — coarse at 344, 390,
  673, 768 and 1024; fine at 1440. Re-measured: **44px at the five coarse classes, 16px at
  1440.** Pointer type is resolved by device, never by width (§2), which is why class 5 is
  coarse and class 6 is not.
- **Files modified:** `.playground/audit22.mjs`
- **Commit:** none — D-02 fence

**7. [Rule 3 — Blocking] `resume.json` has no summary field and its role key is not `title`**

- **Found during:** Task 2
- **Issue:** The plan says "a short summary drawn from `src/data/resume.json`". The fixture is
  `experience` / `projects` / `skills` / `education` and holds no prose summary at all; the
  experience entries key the job title as `role`, not `title`.
- **Fix:** the section states the shape of the record — the current role, "3 roles and 5
  projects", the three skill category names — rather than paraphrasing a summary that does not
  exist. Inventing one would have put copy on Home that exists in no fixture and that Phase 5
  would then have to find an owner for.
- **Files modified:** `.playground/src/pages/home.astro`
- **Commit:** none — D-02 fence

### Assigned extra fix — `class` → `className`, verified in a browser

Four one-word changes: `work.astro:219` `.wk-card`, `work.astro:236` `.wk-chip`,
`work.astro:265` `.wk-legend-card`, `work-recolour.astro:176` `.wr-card`.

Plan 00-21 recorded that `Card` and `Chip` "silently drop the `class` prop" and attributed it
upstream. It is a **consumer usage error**: `class` is not a recognised React prop, `className`
is, and `Card` supports it. Measured with `classprobe22.mjs` on both routes, before and after:

| | before | after |
|---|---|---|
| `class` attribute on the card | `ds-atom-card` | `ds-atom-card wk-card` |
| elements matching `.wk-card` | **0** | **5** |
| elements matching `.wk-chip` | **0** | **14** |
| **card border-colour** | **`rgb(51,51,47)` = `--rule`, 1.43:1** | **`rgb(114,114,104)` = `--wire`** |
| chip border-colour | `rgb(51,51,47)` | `rgb(114,114,104)` |
| `.wk-card` flex-direction | `row` | `column` |

**Ivory→Charcoal exception 3 now applies on `/work`'s project cards for the first time** — the
painted border had been sitting at exactly the contrast the exception exists to escape.
`/work-recolour` moved with it. **The corrected total is 0**: a sweep of every design-system
component across every `.astro` page in `src/pages` and `src/components` finds no remaining
`class=` usage, and none was introduced by this plan.

## Findings recorded, not worked around

**NEW — `AppBar` exposes no custom property carrying its height.** A consumer building a
full-viewport landing underneath it has nowhere to read the number from, so `--hm-nav: 87px` is
a hard-coded measurement in a page stylesheet. Not left to rot: `audit22.mjs` measures state A's
bottom edge against the viewport at all six classes, so if AppBar's height ever moves the gate
goes red rather than the landing going quietly wrong.

**NEW — `Chip` clobbers a consumer `className` where `Card` concatenates.** `Chip` destructures
`className` into `...rest` and spreads it *after* `className="ds-atom-chip"`, so a consumer
className **replaces** the atom hook: measured `chipClassAttr: "wk-chip"`,
`chipKeepsAtomClass: false`. The net visual change here is nil and that was measured too —
`.dark .ds-atom-chip`'s three declarations were already fully overridden by Chip's own inline
`baseStyle`/`toneStyles`, and its `[data-interactive]` focus rules do not apply to a
non-interactive chip; background stayed `rgb(36,36,35)` = `--cream-3` and colour
`rgb(234,231,224)` = `--ink` across the change. But the hook is gone from the DOM and on an
interactive chip it would take the focus ring with it. Not worked around by hand-writing
`ds-atom-chip` in the consumer — that reaches into design-system internals and breaks silently
if the atom class is renamed.

**NEW — `Card` inlines `display`, so a consumer cannot change it from a stylesheet.** Only
visible once the `className` fix landed: `.wk-card { display: flex; flex-direction: column }`
now matches its element and `flex-direction` applies while `display` does **not** — `Card` sets
`display: block` inline, which beats a class rule without `!important`. The consequence is real:
`.wk-tags { margin-top: auto }` does nothing outside a flex column, so `/work`'s cards do not
bottom-align their tech chips as designed. Not patched with `!important` from the consumer —
same shape as the recorded "`Text` inlines its variant colour" finding.

All three recorded here rather than as new `00-FINDINGS.md` rows: that register states its own
fixed denominator of sixteen.

**Observation, not fixed — `home_config.ctas` points at `/portfolio`,** a legacy route; the
public routes are `/work`, `/photos` and `/resume`. Rendered as committed (T-00-66, accepted).
Silently rewriting fixture data would hide a content migration Phase 3 has to make.

## Threat register disposition

| Threat | Disposition | Evidence |
|---|---|---|
| T-00-62 state A hidden from AT | mitigated | `display:flex`, `visibility:visible`, no `aria-hidden`, no `inert` on either state, asserted in the audit and by the plan's grep gate (0) |
| T-00-63 strict snap trapping a reader | mitigated | `proximity` only; the strict value appears nowhere; two snap points both reachable; whole block inside the reduced-motion query; proven non-load-bearing three ways |
| T-00-64 peek gallery losing photos | mitigated | all six `peekIds` asserted present in the built HTML by manifest URL, and all six tiles measured painted and non-degenerate at all six classes |
| T-00-65 two divergent copies of Act 2 | mitigated | one component, both routes; extraction proved neutral across 2 592 boxes at six classes |
| T-00-66 `/portfolio` drift rewritten | accepted | rendered as committed, recorded as an observation |

## Accessibility, measured

DOM order `photos > work > resume` at byte offsets 7725 < 16207 < 19886. Zero `order`, zero
`position: fixed` on a focusable, zero positive `tabindex`. Prompt is `<a href="#work">` — one
Tab, one Enter. Three named landmarks: `aria-label="Photographs"`, `aria-labelledby` → "The
work", `aria-labelledby` → "The résumé". Hit areas at the five coarse classes: prompt **44px**,
résumé CTA **44px**, both dropping to painted height at 1440 where the pointer is fine.

`/home`'s nine remaining `under44` offenders are **identical to every other public route's** —
three AppBar anchors at 20px and three Footer links at 22.5px (design-system half of D-16-1),
two `.ha-all` at 14px/28px and one `.hm-xlink` at 30px (layout-owned third, which 00-21 recorded
as recurring). Nothing this plan added is under the floor.

## Reduced motion and snap

| | `no-preference` | `reduce` |
|---|---|---|
| `scroll-snap-type` on the scrollport | `y` | `none` |
| `scroll-snap-align` on state A / `#work` | `start` / `start` | `none` / `none` |
| `scroll-behavior` | `smooth` | `auto` |
| departure at 6/6 | **DEPARTED** | **DEPARTED** |

Chromium serialises `y proximity` as `y` — `proximity` is the initial strictness — which 00-21
verified against a synthetic control, so `y` is positive confirmation it is **not** the strict
value. **Snap is proven non-load-bearing three independent ways:** the `reduce` run above (where
the whole block is off and the departure still holds at 6/6), a runtime `!important` override in
`control22.mjs` (6/6 departed), and the fact that no state is reachable only by snap.

Snap reaches `<html>` via `:global(html:has(.hm-a))` rather than a bare global rule, so the
scoping is a property of the markup instead of the bundler's chunking. Asserted, not assumed:
`scroll-snap-type` reads `none` on `/`, `/work/`, `/photos/`, `/home-act2/` and `/work/cairn/`,
and `y` on `/home/` only.

## Why tasks 1 and 2 produced no commit

Every file they touch is inside `.playground/`, which is gitignored at `.gitignore:38` — the
**D-02 fence**, which exists so the playground does not propagate into worktrees.
`git check-ignore -v .playground/src/pages/home.astro` returns `.gitignore:38: .playground/`,
and `git status --porcelain -- .playground` is empty. Six prior plans in this phase recorded the
same thing. The durable output is task 3's committed record in `00-PUBLIC-DESIGN-NOTES.md` plus
the screenshots plan 00-17 takes before deletion.

## Build state

| | |
|---|---|
| `npx astro build` | **93 pages** — 92 plus `/home` |
| `check-no-js.sh` | **0** — 67 static routes at zero framework JS, 26 island routes verified to hydrate. `/home` is one of the 67 |
| `check-theme-exhaustive` · `check-font-names` · `check-contrast` · `check-css-size` · `check-states` · `check-coverage` · `check-no-ivory` | all **0** |
| `check-bundle.mjs` | **1 — BY DESIGN.** Finding G-15, not breakage |
| `audit21.mjs`, `/home` + `/home-act2` × 6 classes | **zero H-SCROLL**; `under44` is D-16-1 only, identical on both routes |
| `audit15.mjs` | **1** — D-16-1 open, correct behaviour, as 00-21 recorded |
| `audit22.mjs` | **PASS** at 6/6, and PASS again under `RM=reduce` |
| `control22.mjs` | **PASS** — no leak, snap non-load-bearing, both controls bite 6/6, restore SHA-256-identical |
| `snap22.mjs` | `/home-act2` **byte-identical** before and after the extraction — 432 lines, 2 592 boxes |

## Files outside my scope, untouched

`STATE.md` and `ROADMAP.md`: `git status --porcelain` returns 0 lines for both. Plan 00-23's five
paths (`PhotoLayoutBoard.tsx`, `SortableReorder.tsx`, `admin/photos/[...state].astro`,
`fixtures/photos.json`, `00-ADMIN-IA.md`): untouched, 0 lines. `.planning/config.json` shows
modified in `git status` and was **not** touched by this plan or included in either commit.

## Self-Check: PASSED

All 13 files verified present on disk. Commits `e73cba7` and the SUMMARY commit verified in
`git log`. `STATE.md`, `ROADMAP.md` and all five of 00-23's paths verified untouched.
