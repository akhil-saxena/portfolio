---
phase: 01-design-system-charcoal-theme
plan: 10
subsystem: design-system
tags: [e6, wire, rule, sc-1.4.11, control-boundary, statcard, rule-c-3, computed-style]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: probeComputed — the brand x mode computed-style helper the Button regression case runs on
  - phase: 01-design-system-charcoal-theme
    plan: 03
    provides: --wire in charcoal's 3:1 tier, so the token VALUES were already gated before this plan bound components to them
  - phase: 01-design-system-charcoal-theme
    plan: 09
    provides: the inline-to-stylesheet migration pattern, the display/color ratchet this plan shrank, and the specificity lesson that shaped every edit here
provides:
  - "$DS/src/primitives.css — 38 var(--wire) declarations, up from 1; 82 var(--rule) remain, down from 112"
  - "$DS/tests/visual/control-boundary.spec.ts — a Chromium computed-style gate over 38 controls in 482 stories, plus two targeted Button regression cases"
  - "$DS/src/tokens.test.ts — --wire !== --rule asserted in all four theme x mode cells"
  - "$DS/src/display/StatCard/index.tsx — emits `ds-atom-statcard glass` plus any consumer class"
  - "$DS/src/inputs/{Button,Chip,Textarea}/index.tsx — inline border shorthands moved into the stylesheet, which is what made the token rebinding reachable at all"
affects: [01-11, 01-12 AppBar/Footer geometry, 01-18 Badge, 01-20 charcoal baselines, Phase 06.1 density]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jsdom DROPS `border: 1px solid var(--rule)` entirely — a var() inside a multi-value shorthand does not parse, so borderColor reads `\"\"` and borderTopColor never leaves the UA `buttonface`. An inline border shorthand is invisible to a naive jsdom colour assertion"
    - "jsdom populates `borderColor` from a `border-color` LONGHAND (unsubstituted, as the literal var(--wire)) but still never populates borderTopColor"
    - "A Storybook scan must wait for #storybook-root to have CHILDREN, not merely to be attached — `attached` returns before React renders and silently skips the slower stories"
    - "Elements inside a `.dark` story wrapper are a different theme cell and resolve DEFAULT-theme dark tokens; a brand-scoped scan must exclude them or it reports dark-mode numbers as light-mode failures"
    - "Moving a declaration out of inline style ACTIVATES every dormant rule it was outranking — audit those rules before the move, not after"

key-files:
  created:
    - ../design-system/tests/visual/control-boundary.spec.ts
  modified:
    - ../design-system/src/primitives.css
    - ../design-system/src/inputs/Button/index.tsx
    - ../design-system/src/inputs/Button/Button.test.tsx
    - ../design-system/src/inputs/Chip/index.tsx
    - ../design-system/src/inputs/Textarea/index.tsx
    - ../design-system/src/inputs/FileInput/index.tsx
    - ../design-system/src/inputs/ColorPicker/index.tsx
    - ../design-system/src/display/StatCard/index.tsx
    - ../design-system/src/display/StatCard/StatCard.test.tsx
    - ../design-system/src/tokens.test.ts
    - ../design-system/src/styling-boundary.test.ts

key-decisions:
  - "Moved Button's and Chip's inline `border: 1px solid var(--rule)` base shorthand into primitives.css as well as the token. Without it the plan's specified fix REGRESSES Button secondary from --wire to --rule, and both of the plan's own grep gates stay green through the regression. Proven by reinstating it."
  - "Added a third assertion the plan did not specify — named controls must bind --wire BY IDENTITY, compared against the token resolved from the live cascade. The plan's conditions (1) and (2) are logically equivalent under a max()-based boundary contrast, so on their own they are one assertion written twice."
  - "Extended Rule C-3 with a stated corollary: --wire goes on the OUTER boundary of an interactive control; internal subdivision of one control stays --rule. This is what keeps SplitButton's chevron divider, NumberStepper's segment rules and the calendar grid quiet."
  - "Did NOT move StatCard's borderRadius to the stylesheet. `.glass` sets border-radius: var(--radius-xl) (16px) in utilities.css, which is imported AFTER primitives.css, so a (0,1,0) rule would tie and lose on source order — silently changing StatCard's corners from 12px to 16px."
  - "Removed two dormant `border-color` declarations (Button secondary hover, dark secondary hover) rather than letting the inline-to-stylesheet move activate them; both were rgba values around 1.09:1 that would have dropped the boundary below 3:1 on hover only."
  - "Did NOT record the missing overlays-lightbox--responsive-gallery baseline, per 01-09. Deleted the PNG Playwright wrote so the tracked-clean gate stays valid for 01-11."

requirements-completed: [DS-02, DS-03, DS-06]

# Metrics
duration: 55m
completed: 2026-08-19
---

# Phase 1 Plan 10: Control Boundaries on `--wire` (E6) Summary

**E6 is closed, and the headline is that the plan's specified fix for `Button` would have
made things worse while every gate it named went green.** `Button`'s `baseStyle` carried
`border: "1px solid var(--rule)"` inline. Deleting `borderColor: "var(--wire)"` from
`variantStyles` and adding a stylesheet rule — the literal instruction — leaves the inline
`--rule` shorthand winning, so `secondary` would have gone from **3.44:1 to 1.38:1**. Both
of the plan's `<automated>` greps pass in that state; it was reinstated and measured. The
base border moved with the token. Same shape in `Chip` and `Textarea`.

`--wire` in `primitives.css`: **1 → 38**. `--rule`: **112 → 82**.

## Performance

- **Duration:** ~55 minutes
- **Tasks:** 2 of 2, landed as **1 commit** (see deviations — both tasks edit `primitives.css`)
- **Files:** 1 created, 11 modified, 3 baselines re-recorded
- **Suite:** 116 files / 1583 tests → **116 files / 1590 tests** (+7), all passing
- **Biome:** 349 files, no fixes applied · **tsc** both projects · **css:check** 75 files byte-exact
- **Negative controls:** 3 run (1 ineffective-mutation, correctly detected), all restored SHA-identical

---

## The Rule C-3 classification

The question, applied to all **112** non-comment `var(--rule)` / `var(--rule-strong)`
declarations in `primitives.css`: **is the border the only thing telling you where the
control starts?** Nobody had ever made this list; that is E6's real content.

### Rebound to `--wire` — the border is load-bearing (33 in-place + 5 new/moved = 38)

| Component | Selectors | Fill it sits on | Why |
|---|---|---|---|
| **TextInput** | `.ds-atom-input`, `.ds-atom-input-wrap`, `.dark .ds-atom-input` | `var(--cream)` = **the page** | **The finding.** 1.000:1 fill delta, 1.38:1 hairline |
| **Textarea** | `.ds-atom-textarea` (moved out of inline) | `var(--cream)` = **the page** | Identical to TextInput; invisible to a CSS grep because it was inline |
| **Select / Combobox** | `.ds-atom-select`, `.ds-atom-autocomplete`, `.ds-atom-select-search input` | `--surf-1` / `--cream-2` | Field chrome is the whole affordance |
| **MultiSelect** | `.ds-atom-multiselect`, `.ds-atom-multiselect-checkbox`, `.ds-atom-multiselect-chip-more` | `--surf-1` / `--cream-2` | The control, its unchecked box, and the *interactive* “+n more” chip |
| **NumberStepper** | `.ds-atom-stepper` | `rgba(255,255,255,.6)` | Outer boundary of the control |
| **SplitButton** | `.ds-atom-split`, `.ds-atom-split[data-variant="ghost"]` | none / transparent | Outer boundary; ghost has no fill at all |
| **SegmentedControl** | `.ds-atom-segmented`, `.dark .ds-atom-segmented` | `--cream-2` (1.06:1) | A control, and its fill does not delimit it |
| **Button** | `.ds-atom-btn[data-variant="secondary"]` (new) | `--panel` (1.06:1) | Right token, wrong layer — moved out of inline |
| **Chip** | `.ds-atom-chip[data-interactive]` (new) | `--cream-3` | An interactive chip is a control; a plain one is a label |
| **DatePicker** | `.ds-atom-datepicker-trigger`, `.ds-atom-datepicker-nav`, `.ds-atom-datepicker-time .ds-atom-input` | `--panel` / transparent | Trigger, nav buttons, inner field |
| **Calendar** | `.ds-atom-calendar-navbtn`, `.dark …` | transparent | Buttons with no fill |
| **Carousel** | `.ds-atom-carousel-arrow`, `.dark …` | `--surf-1` | Buttons |
| **RichText** | `.ds-atom-richtext`, `.ds-atom-richtext-linkinput`, both `.dark` twins | `--surf-1` / `--cream` | The editing surface is a control; the link field is an input |
| **AppBar** | `.ds-atom-appbar-search`, `.dark …` | `--cream-2` (1.06:1) | A search input |
| **SearchAndFilters** | `.ds-atom-searchfilters-input`, `.dark …` | `--cream-2` | An input |
| **CopyToClipboard** | `.ds-atom-copy` | `var(--cream)` = **the page** | A button at 1.000:1 fill |
| **Pagination** | `.ds-atom-pagination-icbtn` | `--g-bg` | An icon button |
| **ColorInput / ColorPicker** | `.ds-atom-colorinput-swatch` + 2 inline in `ColorPicker` | the chosen colour | A pale swatch has only its rim |
| **Card** | `.ds-atom-card[data-surface="outline"]` | `transparent` | The border **is** the surface |
| **StatusPill** | `[data-stage="wishlist"]` | `--cream-2` (1.06:1) | The one stage with no tint to rely on |
| **FileInput** | dropzone (inline) | `--paper-warm` | Was a hardcoded `#E8D9AC` that never themed — 1.37:1 |

### Left on `--rule` — decorative, or something else does the job (82 remain)

| Category | Selectors | Reason |
|---|---|---|
| **Overlay chrome** | `Modal`, `Sheet`, `BottomSheet`, `HoverCard`, `Toast`, `DSDropdown`, `DatePicker` popover, `CommandPalette` panel, `richtext-linkpopover`, `calendar-events-popover` | A panel fill **and** a shadow already delimit these |
| **Structural separators** | `modal-hd/ft`, `sheet-hd/ft`, `select-search`, `datepicker-time`, `datepicker-popover-actions`, `cmd-search`, `datagrid-bulkbar/footer`, `appshell-topbar/sidebar`, `footer`, `appbar[data-scrolled]` | Separators between regions, not control boundaries |
| **Tables & grids** | `table-header`, `table-row`, `calendar-cell`, `calendar-week`, `calendar-weekcell`, `dayview-allday/hour`, `tabs-list` | The text in each row/cell/tab establishes it — Rule C-3's “a heading already does that job”. Rebinding these turns the UI into a dark spreadsheet |
| **Dividers & spines** | `Divider` (incl. dashed), `Timeline` spine, `accordion-item + item`, `richtext-toolbar-divider`, `wizard-connector`, `ProseMirror hr` | Decorative by definition |
| **Filled surfaces** | `Card[data-variant="glass"]`, `Card[data-variant="kanban"]`, `AlertBanner`, `Kbd`, `multiselect-chip`, `StatusPill` tinted stages, `ProseMirror pre` | A fill already says where they are |
| **`background: var(--rule)`** | 8 declarations (`timeline::after`, `carousel-dot`, `wizard-connector`, `richtext-toolbar-divider`, …) | Not borders at all |
| **Internal subdivision** | `stepper-display` left/right, `split-chevron` | See the corollary below |

### The three ambiguous rulings the plan asked for

1. **`Card` — split, as instructed.** `[data-variant="glass"]` and `[data-variant="kanban"]`
   both carry a `--surf-1` fill *and* a backdrop blur, so Rule C-3 says `--rule`. Only
   `[data-surface="outline"]` was rebound: it declares `background: transparent`, so its
   dashed border **is** the surface. There is no `[data-variant="outline"]` — the outline
   case is spelled `data-surface`.

2. **`Chip` — interactive only.** `.ds-atom-chip[data-interactive]` gets `--wire`; a plain
   chip keeps `--rule` because it is a label and its text carries it. **A toned chip
   (success/danger/info/warning) still sets `border-color` inline and still wins** — its
   tinted fill delimits it, which is precisely when C-3 says `--rule` is right. The same
   split appears one level down: `.ds-atom-multiselect-chip` is a label and stayed, while
   `.ds-atom-multiselect-chip-more` has `cursor: pointer` and moved.

3. **`AlertBanner` — left, as instructed.** It carries a tinted fill per tone, so its border
   is not its sole boundary. Phase 0 listed it among the `--rule` binders; listing is not
   condemning.

### The corollary this plan had to add

Rule C-3 as written does not decide **internal** dividers inside one bordered control —
`NumberStepper`'s segment rules and `SplitButton`'s chevron divider both separate one
interactive segment from another. The ruling applied, and stated so a reviewer can apply it:

> **`--wire` goes on the OUTER boundary of an interactive control. Internal subdivision of a
> single control stays `--rule`.**

The control's own boundary already satisfies SC 1.4.11's “where is this control”; the
internal segmentation is refinement. This is also what keeps the calendar grid, the tab
strip and the table rows quiet — without it the classification over-applies, which is
exactly what the plan's `<human-check>` warns to look for.

---

## The gate, and what it caught

`tests/visual/control-boundary.spec.ts` — **3 cases, all green**, over **38 controls in 482
stories** under `brand=charcoal, mode=light`. Measured live in the run:

```
--wire = rgb(135, 129, 115)   (#878173)
--rule = rgb(213, 207, 194)   (#d5cfc2)
```

Three assertions, not the plan's two:

1. **Rule C-3.** A control whose fill does not delimit it (`fillDelta <= 1.1`) must have a
   border clearing **3:1**.
2. **Perceptible at all.** `fillDelta > 1.1` **or** `borderContrast >= 3`.
3. **Bind `--wire` by identity.** Seven named controls must paint exactly the token
   resolved from the live cascade — not merely “something above 3:1”.

**(1) and (2) are logically equivalent** once boundary contrast is taken as the max against
the control's own fill *and* the surface behind it, which is the only honest way to compute
it. The plan presents them as independent; they are one assertion written twice. Assertion
(3) is the one that does the extra work, and it is the one that catches the Button-shaped
regression by name rather than by a number a reader has to interpret. All three use
`expect.soft`, so one run reports everything.

Two further cases use `probeComputed` on `.ds-atom-btn[data-variant="secondary"]` directly,
in **charcoal light and charcoal dark** — the scan keys on the first `ds-` class and all four
Button variants share `ds-atom-btn`, so `secondary` cannot be isolated there.

### Four defects the gate found that the CSS enumeration could not

All four were **inline or in a different class**, so no amount of grepping `primitives.css`
would have surfaced them. Every one is named in the plan's own rebind list or is its exact analogue:

| Control | Measured | Cause |
|---|---|---|
| `ds-atom-textarea` | **1.51:1** border on a **1.02:1** fill | `border: "1px solid var(--rule)"` inline in `baseTextareaStyle` |
| `ds-atom-fileinput` | **1.37:1** | hardcoded `#E8D9AC` — a hex that did not respond to the theme at all |
| `ds-atom-colorpicker-swatch` | **1.38:1** | inline `var(--rule)`; a pale swatch has only its rim, and the rim is what SC 1.4.11 is about |
| `ds-atom-statuspill` | **1.51:1** | the neutral `wishlist` stage — every other stage has a tint to rely on |

### Two gate-integrity bugs found in the gate itself

1. **The scan was racing React.** `waitForSelector("#storybook-root", { state: "attached" })`
   — copied verbatim from `control-chrome.spec.ts` as the plan instructed — returns *before*
   React renders, because that element ships in `iframe.html`'s static markup.
   `computed.ts`'s docstring records this race for the same reason. Measured: the scan was
   **silently skipping stories**, and the roster read **31** controls. Waiting for
   `children.length > 0` took it to **38**, and `ds-atom-datepicker-trigger` — one of the
   seven controls assertion (3) pins — reappeared. It had been unreachable, so asserting it
   would have failed for the wrong reason and asserting it *loosely* would have proved nothing.
2. **The scan was reading the wrong theme cell.** Stories named `*--dark-mode` wrap their
   content in `.dark`, so their controls resolve the dark token block — and in a brand-less
   demo, the **default** theme's dark values. That produced eleven “charcoal light failures”
   reported at `rgba(255, 255, 255, 0.22)`, which is default dark `--wire`. Elements inside a
   `.dark` subtree are now excluded, as are visually hidden native inputs (Checkbox, Radio
   and Toggle hide the real `<input>` and draw a sibling, so its UA border read as a bogus 1.2:1).

`LABEL_IS_THE_AFFORDANCE` holds **13** entries, each with a reason, in the shrink-only shape
01-09 established — ghost Button and SplitButton, the chrome-less inner input, CommandPalette's
search, tabs, listbox options, IconButton's transparent variants, pagination numerals, calendar
and datepicker cells, the native range input, and StatusPill's tinted stages.

---

## Negative controls

| # | Control | Expected | Result | Restored |
|---|---|---|---|---|
| N0 | unmutated | GREEN | **GREEN 3/3** | — |
| N1 | reinstate `border: "1px solid var(--rule)"` in Button's `baseStyle` — **the plan's fix, done literally** | RED | **RED**, both modes | SHA identical |
| N2a | mutate `.ds-atom-input` by stale line number | *ineffective* | **mutation did not land; gate correctly stayed GREEN** | n/a |
| N2b | re-aimed: `.ds-atom-input` back to `--rule` | RED | **RED**, all three assertions | SHA identical |

**N1 is the plan's whole thesis, measured.** Under the regression:

| Gate | Result |
|---|---|
| plan's `<automated>` grep #1 (`--wire` count >= 6) | **GREEN** — 38 |
| plan's `<automated>` grep #2 (no inline `--wire` in Button) | **GREEN** |
| `control-boundary.spec.ts` Button cases | **RED**, both modes |

The browser failure named the colours: `secondary must paint --wire (rgb(135, 129, 115)),
not --rule (rgb(213, 207, 194))`, and in dark `rgb(114, 114, 104)` vs `rgb(51, 51, 47)`.

**A correction to my own docstring, caught by running the control.** I had written that jsdom
“reported no change either”. It is not true, and the control disproved it: the inline shorthand
suppresses the sheet's `border-color` in jsdom's cascade model, so `getComputedStyle(el).borderColor`
came back `""` and the unit case failed. jsdom can say *“something inline is in the way”*; it can
never say *which colour the button paints*. The docstring now says that, measured. This is the
01-08 failure mode — a comment asserting something the mutation contradicts — caught only because
the control was actually executed.

**N2b reproduced the finding's own numbers exactly**, which is the strongest evidence the gate
measures what it claims:

```
ds-atom-input fill 1:1 + border 1.38:1 (rgb(244, 241, 234) over rgb(244, 241, 234))
```

That is the **1.000:1 fill delta and the 1.38:1 hairline** from the Phase 0 measurement, rediscovered
by the gate rather than restated from the plan. The two Button cases stayed green throughout, so the
mutation was localised rather than breaking the file.

**N2a is the 01-07/01-08 distinction, live.** My line number was stale because earlier edits had
grown the file. The `[mutation landed]` probe reported the mismatch and aborted before writing,
so the following GREEN run was an *ineffective mutation*, not an inert assertion — and re-aiming
by selector rather than by line made it bite.

---

## Visual baselines: 3 moved, and why that number is small

`storybook.spec.ts` — **478 captured, 4 time-dependent skipped.** Reviewed individually
(`expected` vs `actual` PNGs opened, not just the diff), then re-recorded:

| Baseline | Pixels | What changed, and why it is correct |
|---|---|---|
| `inputs-textarea--error-state` | 4 | **The error border went from a washed-out pink to a true red.** `[data-error="true"] { border-color: var(--red) }` had *never applied* — the inline `border` shorthand outranked it. A dormant rule correctly activating |
| `inputs-textarea--dark-mode` | 5 | Same component, dark block |
| `interaction-searchandfilters--with-filters` | 105 | `.ds-atom-searchfilters-input` moved `--rule → --wire` |

**The plan warns that an unexpectedly small count means the rebinding did not reach the
elements. It did reach them, and this was proven rather than assumed.** A direct
computed-style probe in the **default** theme — the theme the baselines are recorded in:

```
inputs-textinput--default    .ds-atom-input                          rgba(0,0,0,0.18)  == WIRE
inputs-textarea--default     .ds-atom-textarea                       rgba(0,0,0,0.18)  == WIRE
inputs-select--default       .ds-atom-select                         rgba(0,0,0,0.18)  == WIRE
inputs-fileinput--dropzone   .ds-atom-fileinput                      rgba(0,0,0,0.18)  == WIRE
inputs-colorpicker--default  [data-testid=colorpicker-swatch]        rgba(0,0,0,0.18)  == WIRE
inputs-button--variants      .ds-atom-btn[data-variant=secondary]    rgba(0,0,0,0.18)  == WIRE
                                        (--wire = rgba(0,0,0,0.18), --rule = rgba(0,0,0,0.08))
```

All six bind `--wire`. The count is small because in the **default** theme the rebinding moves a
1px hairline from `rgba(0,0,0,0.08)` to `rgba(0,0,0,0.18)` — roughly a 10% luminance shift on a
single-pixel line, under Playwright's default per-pixel `threshold: 0.2`. **Charcoal is where this
is dramatic (1.38:1 → 3.44:1), and no charcoal baselines exist yet — 01-20 records them.** The
computed-style gate is the right instrument for this change; the screenshot suite was never going
to be.

The known pre-existing failure remains: `overlays-lightbox--responsive-gallery` has no baseline
(added by `c198985`, an earlier plan). Not recorded, per 01-09 — the PNG Playwright wrote was
deleted by explicit path so 01-11's tracked-clean gate stays valid.

---

## StatCard

Emitted `class` attribute, asserted in `StatCard.test.tsx`:

```
class="ds-atom-statcard glass wk-stat"      // with className="wk-stat"
class="ds-atom-statcard glass"              // bare
```

**A consumer can now select one StatCard without selecting every glass surface.** That is the
finding, carried unfixed through Phase 0 plans 00-01, 00-04, 00-07 and 00-09, and the reason it
mattered is concrete: `glass` is declared in `utilities.css` and named in `$DS/.planning/PROJECT.md`
§8 as a cross-component contract class, so `.glass { … }` in a page stylesheet restyled every glass
surface at once. `glass` is **kept** — the fix is additive.

`padding: 16` and the whole `[data-part="label"]` type block moved into a new `DS atom: StatCard`
banner section; the label element now carries **no `style` attribute at all**, and its treatment is
asserted through `getComputedStyle` with the real sheet injected. StatCard consequently came **off**
01-09's inline-`color` ratchet — the ratchet shrank from 26 entries to 25, which is the confirmation
the briefing asked for.

`borderRadius: 12` deliberately stayed inline. `.glass` sets `border-radius: var(--radius-xl)` =
**16px**, and `utilities.css` is imported *after* `primitives.css`, so a `(0,1,0)` rule would tie
with `.glass` and lose on source order — silently rounding StatCard's corners from 12px to 16px.
This is 01-09's lesson one layer over: the trap is not always specificity, sometimes it is a tie
broken by import order.

---

## Two dormant rules removed rather than activated

Moving a declaration out of inline style activates everything it was outranking. Audited before
the move, not after:

- `.ds-atom-btn[data-variant="secondary"]:hover` declared `border-color: rgba(0,0,0,0.12)` — **1.09:1**.
- `.dark .ds-atom-btn[data-variant="secondary"]:hover` declared `rgba(255,255,255,0.18)`.

Neither had ever applied. Letting them switch on would have dropped the boundary below the 3:1 floor
**on hover only** — a defect visible to nobody and caught by nothing. Both declarations were deleted,
so the border stays `--wire` on hover, which is also exactly what shipped before.

`.dark .ds-atom-chip`'s hardcoded `border-color: rgba(255,255,255,0.18)` was likewise dormant and was
replaced with `var(--rule)` — the value dark mode actually rendered — rather than activated.

---

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 + 2 | `5d382e0` | `fix(controls): bind interactive boundaries to --wire and add the StatCard atom class` — 15 files, +753/−74 |

Branch `charcoal-theme` in `../design-system`, now **22 commits ahead** of that repo's `main`.
Author `Akhil Saxena <saxena.akhil42@gmail.com>`. **No AI attribution** —
`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` over the commit body and
author → `0`.

## Sibling gates at exit

`npm test` **116 files / 1590 tests**; `npm run check` **349 files, no fixes applied**;
`npm run typecheck` both projects clean; `npm run css:check` **75 files round-trip byte-exact**.
Tree shows only the permitted `?? design_handoff/design_handoff_ds_overview/`; `git stash list`
empty (lint-staged's own stash cleaned up as expected).

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The plan's Button fix would have regressed Button**

- **Found during:** Task 1, reading `Button/index.tsx` before editing.
- **Issue:** the plan says to move `variantStyles.secondary`'s `borderColor: "var(--wire)"` into
  `primitives.css`. `baseStyle` also carries `border: "1px solid var(--rule)"` **inline**, which
  beats any class rule. Doing only what the plan says leaves secondary painting `--rule` at 1.38:1,
  down from `--wire` at 3.44:1 — a regression *caused by* the fix for the finding about that very
  ratio.
- **Why this is the dangerous kind:** the plan's two `<automated>` gates are `grep -o 'var(--wire)'
  primitives.css | wc -l >= 6` and `! grep var(--wire) Button/index.tsx`. **Both pass under the
  regression** — verified by reinstating it, not by reasoning about it.
- **Fix:** the base `border` moved to `.ds-atom-btn` alongside the new
  `[data-variant="secondary"] { border-color: var(--wire) }`. `primary`/`ghost`/`danger` still set
  `borderColor` inline and are unchanged. Proven by two `probeComputed` cases in both charcoal modes.
- **Commit:** `5d382e0`

**2. [Rule 1 — Bug] `Chip` and `Textarea` had the identical inline-shorthand defect**

- **Issue:** `Chip`'s `baseStyle` and `toneStyles.default` both bound `--rule` inline, so
  `.ds-atom-chip[data-interactive]` could not have rebound anything. `Textarea` bound
  `border: "1px solid var(--rule)"` inline over a `var(--cream)` fill — i.e. **the finding
  verbatim**, on a component the plan names in its rebind list, and completely invisible to a
  `primitives.css` grep.
- **Fix:** both base borders moved to the stylesheet. `Textarea` is now `--wire`; toned Chips keep
  their inline semantic border and still win, which is correct under Rule C-3.
- **Commit:** `5d382e0`

**3. [Rule 2 — Correctness] `FileInput`'s dropzone bound a hardcoded hex**

- **Issue:** `border: 2px dashed #E8D9AC` — not a token, so it never responded to the theme at all,
  and measured **1.37:1** in charcoal light. The plan names the FileInput dropzone in its rebind list.
- **Fix:** `var(--wire)`, kept inline because the value is driven by the `dragOver` prop. Only the
  token changed, which is the plan's own stated boundary.
- **Commit:** `5d382e0`

**4. [Rule 1 — Bug] The new gate was racing React and reading the wrong theme cell**

- **Issue:** two independent defects in the discovery mechanism the plan told me to copy verbatim —
  a wait that returns before render (silently shrinking the roster from 38 to 31 controls), and no
  exclusion for `.dark` story wrappers (reporting default-dark token values as charcoal-light failures).
- **Fix:** wait for `#storybook-root` to have children and throw by name if it never does; skip
  `.dark` subtrees and visually hidden inputs.
- **Commit:** `5d382e0`

**5. [Rule 1 — Bug] A false claim in my own docstring, caught by the negative control**

- **Issue:** the spec's docstring asserted jsdom “reported no change either” under the N1 regression.
  Running N1 disproved it — jsdom's cascade model does let the inline shorthand suppress the sheet's
  `border-color`, so the unit case failed with `borderColor === ""`.
- **Fix:** the docstring now states the measured behaviour and the real distinction — jsdom can
  detect *that something inline is in the way*, never *which colour is painted*.
- **Commit:** `5d382e0`

### Scope additions, declared

- **`Chip`, `Textarea`, `FileInput`, `ColorPicker` and `styling-boundary.test.ts` are outside the
  plan's `files_modified`.** Chip and Textarea are named in the plan's task-1 action text; FileInput
  is named in its rebind list; ColorPicker is the same defect as the `ColorInput` swatch the plan's
  own list covers; the ratchet edit is forced by the StatCard fix (a stale entry fails the gate).
- **Both tasks landed as one commit.** Task 1 and task 2 both edit `primitives.css`; splitting them
  would have required staging hunks rather than files, which is less atomic, not more. The plan
  specifies a single commit message and it was used verbatim.
- **A third assertion was added to the gate** beyond the plan's two, because the plan's two are
  logically equivalent (reasoned above).

**Total deviations:** 5 auto-fixed (4 × Rule 1 bug, 1 × Rule 2 correctness) plus 3 declared scope
notes. No gate was weakened, no baseline was recorded blind, and no finding's scope was adjusted.

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **`OAuthButton` binds `--wire` inline** (`src/inputs/OAuthButton/index.tsx:46`,
   `1.5px solid var(--wire)`), with a hardcoded `rgba(255,255,255,.2)` for its dark branch. It is a
   second pre-existing `--wire` binder the plan's premise did not know about — the correct token in
   the wrong layer, exactly like Button was. Not fixed: outside the file set, and the dark branch
   needs a token decision rather than a move.

2. **`StatusPill`'s tinted stages sit at ~1.08:1 against the page.** `rgba(245,158,11,.1)` and its
   siblings are too faint to delimit a pill on a light surface. This is a **tone-alpha** problem, not
   a `--wire`/`--rule` one, so it was recorded rather than widened into. The neutral `wishlist` stage
   *was* fixed, because it had no tint to fall back on.

3. **`.ds-atom-calendar` fills with `var(--cream)` — the page — and rims itself at 1.38:1.** By the
   letter of Rule C-3 a Calendar is a surface rather than a control, and it is dense with text, so it
   was left. But a charcoal-light Calendar has no perceptible outer edge, which is the same measurement
   that made E6 a finding. Worth a decision rather than a silent inheritance.

4. **`Checkbox` and `Radio` bind `var(--ink-4)`, not `--rule`.** They never appeared in the `--rule`
   sweep. Their unchecked boxes are named in the plan's rebind list, so this is worth confirming
   deliberately: `--ink-4` may well be correct (it is darker than `--rule`), but nothing asserts it,
   and the visually-hidden native inputs mean the drawn box is a sibling element the current scan does
   not measure.

5. **`FileInput`'s icon tile** (`index.tsx:265`) still binds `var(--rule)` inline. It is `aria-hidden`
   decoration, so `--rule` is right — noted only because it is the one remaining inline `--rule` in
   that file and a future reader will wonder.

6. **`storybook.spec.ts` still exits 1** on the missing `overlays-lightbox--responsive-gallery`
   baseline, unchanged since `c198985`. 01-20 owns it.

---

## Self-Check: PASSED

Files claimed as created/modified, verified on disk:

```
FOUND: tests/visual/control-boundary.spec.ts        (438 lines, new)
FOUND: src/primitives.css                           (38 var(--wire), 82 var(--rule))
FOUND: src/display/StatCard/index.tsx               (contains "ds-atom-statcard" and "glass")
FOUND: src/inputs/{Button,Chip,Textarea,FileInput,ColorPicker}/index.tsx
FOUND: src/tokens.test.ts                           (--wire !== --rule, 4 cells)
FOUND: src/styling-boundary.test.ts                 (StatCard color entry removed)
```

Commit verified: `git log --oneline --all | grep 5d382e0` → found.

Plan gates re-run verbatim against the committed tree:

```
--wire references in primitives.css = 38   (>= 6)                        PASS
Button has no inline var(--wire); primitives.css does                    PASS
npm run css:check && npm test                                            PASS
npx playwright test tests/visual/control-boundary.spec.ts   3 passed     PASS
StatCard has both "ds-atom-statcard" and "glass"                         PASS
npm test && npm run check && npm run typecheck && npm run css:check      PASS
```
