---
phase: 01-design-system-charcoal-theme
plan: 12
subsystem: design-system
tags: [e13, e14, g-11, d-16-1, appbar, footer, touch-target, type-scale, pointer-coarse, specificity, source-order, inline-style, has-selector, split-css]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: probeComputed — the brand x mode computed-style helper the new spec's custom-property reads run through, and whose guards probeBoxes mirrors
  - phase: 01-design-system-charcoal-theme
    plan: 09
    provides: the "state the specificity, decide whether a consumer may override" discipline both new CSS rules follow
  - phase: 01-design-system-charcoal-theme
    plan: 10
    provides: the lesson that a specified fix can regress while every specified grep stays green
  - phase: 01-design-system-charcoal-theme
    plan: 11
    provides: the tie-on-specificity/source-order-decides failure mode, and the note that Link's default `inline` variant sets colour inline and is therefore not composable
provides:
  - "$DS/src/tokens.css — --text-4xl-plus: 52px, the scale's only interpolated step (G-11)"
  - "$DS/src/primitives.css — --ds-appbar-h declared at CLASS level on .ds-atom-appbar and driving min-height; two coarse-pointer touch-floor sections under their own component banners so split-css keeps each in its own consumer slice"
  - "$DS/src/tokens.test.ts — --ds-appbar-h allowlisted in COMPONENT_SCOPED, with a new documented category for class-level (rather than inline) component knobs"
  - "$DS/src/layout/AppBar/index.tsx — docstring recording the calc(100svh - var(--ds-appbar-h)) use case AND the one thing the property does not promise"
  - "$DS/tests/visual/touch-target.spec.ts — 10 Chromium cases under touch emulation; the design system's first coarse-pointer test of any kind"
  - "$DS/src/layout/AppBar/AppBar.stories.tsx — AnchorNavigation, the link-shaped bar every other story missed"
  - "$DS/src/layout/Footer/Footer.stories.tsx — CompactWithLinks, the href branch of renderLink that no story exercised"
  - "$DS/src/overview-links.test.ts — the count-agreement assertion plus EXCLUDED_FROM_CATALOG, a reasoned ratchet"
  - "$DS/README.md — 79 components, reconciled with the catalogue"
affects: [01-13 --ds-sidebar-w, 01-20 charcoal baselines, 01-21 publish, Phase 06.1 density axis + F-15-7 control floors, Phase 3 Work/Photos headers, Phase 5 manifest]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A component knob belongs on the component's CLASS in primitives.css, not inline in its style object. An inline custom property is fixed at construction so no media query can re-declare it; a class-level one can be driven by a media query, a container query or a future density axis. This plan re-declares --ds-appbar-h inside @media (pointer: coarse) and could not have done so inline"
    - "min-height/min-width, not padding, for a touch floor. Padding fails twice: an inline padding-* on consumer markup beats a class rule without !important, and padding adds to a content height so it cannot GUARANTEE a floor — the same 14px gave Footer's <a> 44px and its <button> 40.5px"
    - "A floor on .ds-atom-footer-link ties with .ds-atom-link (both (0,1,0)) and loses on source order, because .ds-atom-link is declared ~880 lines lower. Scope under .ds-atom-footer for (0,2,0): wins on specificity so it does not depend on file position, and still matches BOTH branches of renderLink where a .ds-atom-link compound would miss the <button>"
    - "hasTouch: true is what drives (pointer: coarse) in Chromium — isMobile is not needed, and Playwright's emulateMedia() cannot do it. Assert matchMedia in the spec, because every geometry case in a coarse block is vacuous if the query does not match"
    - ":has(a) scopes a re-declared geometry property to bars that actually contain the affected children, so a bar of Buttons is not told a height it does not paint. First :has() in the design system's CSS"
    - "split-css.mjs slugifies on the banner label up to `(` or `·` and MERGES same-named slices, so `DS atom: AppBar · touch targets (D-16-1)` lands in appbar.css. A cross-component rule must be split per component or a consumer importing one slice silently misses the other's floor"
    - "AppBar owns no anchors: logo/nav/actions are ReactNode slots. A component cannot restyle children it does not render — its stylesheet can, via a descendant rule"

key-files:
  created:
    - ../design-system/tests/visual/touch-target.spec.ts
  modified:
    - ../design-system/src/tokens.css
    - ../design-system/src/primitives.css
    - ../design-system/src/tokens.test.ts
    - ../design-system/src/layout/AppBar/index.tsx
    - ../design-system/src/layout/AppBar/AppBar.stories.tsx
    - ../design-system/src/layout/Footer/Footer.stories.tsx
    - ../design-system/src/OverviewPage.tsx
    - ../design-system/src/overview-links.test.ts
    - ../design-system/README.md

key-decisions:
  - "Token name --text-4xl-plus, 52px, placed between --text-4xl and --text-5xl in the light :root. No existing step renamed or revalued. tokens.css declares --text-* exactly once (lines 190-201) and no dark block declares any, so adding to :root alone satisfies the light-value-for-every-dark-token test trivially — verified, not assumed"
  - "--ds-appbar-h drives min-height, not height, with box-sizing: border-box. The bar is NOT constant, contrary to the plan's premise: measured 47px centered / 51px minimal / 53px default / 61px withSearch, wrapping to 63px at 344px. Its three slots are consumer ReactNodes so its height is content-determined and a fixed height would clip them"
  - "47px chosen as the floor (22px logo mark + 2x12px padding + 1px border) because it is the LOWEST natural variant height, so min-height moved zero pixels in any variant at any width"
  - "The touch floor is min-height/min-width and NOT padding, against the plan's explicit instruction, because the audited consumer sets padding-bottom inline and padding cannot guarantee a floor. Both failure modes were reproduced in the browser before choosing"
  - "The Footer floor is scoped .ds-atom-footer .ds-atom-footer-link (0,2,0) rather than the class the elements carry, proven necessary by a negative control in which the naive selector was completely invisible on the <a> form"
  - "E14 resolved on 79 with the two exclusions named AND their reasons distinguished: Field's is technical (no story, so no --docs page), IconButton's is editorial (its docs page resolves; cataloguing it would work). Recording that difference is the point"
  - "Two Storybook stories added rather than injecting synthetic DOM, so the probes measure real shipped markup. Costs one visual baseline each, which 01-20 records anyway"

patterns-established:
  - "Pattern: prove a cascade claim by writing the WRONG rule and watching the probe, not by reading the sheet. Three negative controls here each changed a rendered number that no grep and no vitest case could see"
  - "Pattern: a plan gate that greps a source file for a property name cannot distinguish a documentation mention from an inline write. Narrow it to the syntax of the thing being forbidden — for a JSX custom property, a quoted key followed by a colon"
  - "Pattern: when a test's exclusion list is the record of a decision, assert in BOTH directions — a new uncatalogued component fails by name, and a stale exclusion naming a deleted component also fails"

requirements-completed: [DS-02]

# Metrics
duration: 35min
completed: 2026-08-19
---

# Phase 01 Plan 12: AppBar height, the 44px touch floor, and one component count Summary

**A 52px type step, `--ds-appbar-h` exposed at class level so a media query can drive it, AppBar and Footer link targets raised from 16–22.5px to 44px at coarse pointers with fine-pointer geometry byte-identical, and three disagreeing component counts reduced to one asserted number with its exclusions reasoned — with the plan's two prescribed mechanisms (padding, and a `.ds-atom-footer-link` selector) both disproved in a browser before being replaced.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-19 14:00 IST
- **Completed:** 2026-08-19 14:35 IST
- **Tasks:** 2 of 2
- **Files modified:** 10 (9 modified, 1 created) — 712 insertions, 3 deletions

## Task Commits

Committed atomically as five commits rather than the plan's prescribed single
`fix(layout): …`, so an interruption could not lose a completed piece:

1. **Task 1 — 52px step** — `aa4ac53` `feat(tokens): add a 52px half-step to the shared type scale`
2. **Task 1 — AppBar height** — `82a61f9` `feat(appbar): expose the bar's height as --ds-appbar-h`
3. **Task 2 — RED** — `49bfc6c` `test(layout): add failing 44px touch-floor probes for AppBar and Footer`
4. **Task 2 — GREEN** — `ae3d50c` `fix(layout): meet the 44px touch floor in AppBar and Footer`
5. **Task 2 — E14** — `ab152b6` `fix(overview): reconcile the component count on 79 and assert it`

No REFACTOR commit: the GREEN rule is five declarations and had nothing to clean up.

---

## The four questions the plan asked

### 1. The chosen 52px token name

**`--text-4xl-plus: 52px`**, the plan's suggested name, kept.

Placed between `--text-4xl` and `--text-5xl` in the light `:root` so the scale reads
in order. Rationale recorded in the token's own comment: it is additive, it is the
scale's **only** interpolated step, and it is in keeping with `--text-2xs` already
extending the scale by prefix rather than by t-shirt size.

Verified rather than assumed, as the plan asked: `--text-*` is declared **exactly
once** in `tokens.css`, at lines 190–201, and **no dark block declares any**. The
type scale is therefore mode-independent, so adding to `:root` alone satisfies the
existing *"declares a light value for every token the dark theme overrides"* test
trivially. `--text-4xl` (44px), `--text-5xl` (60px) and `--text-xl` (22px) are
asserted unchanged by the plan's own gate, and `themes/charcoal.css` still declares
zero `--text-*`.

### 2. `min-height`, not `height` — and the plan's premise for the alternative was wrong

`--ds-appbar-h: 47px` drives **`min-height`**, with `box-sizing: border-box` added so
the value means the whole box (the sheet has no global border-box reset; it is set
per component, and `.ds-atom-appbar` did not have it).

The plan said *"Phase 0 measured the bar as constant at all six viewport classes and
not wrapping, so a fixed height is defensible."* **Measured in Chromium, the bar is
not constant:**

| variant | 344px | 390px | 768px | 1440px |
|---|---:|---:|---:|---:|
| `centered` | 47 | 47 | 47 | 47 |
| `minimal` | 51 | 51 | 51 | 51 |
| `default` | **63** | **63** | 53 | 53 |
| `withSearch` | **63** | **63** | 61 | 61 |

It varies by variant across a 16px range and it **does** wrap at 344px. Phase 0's
"constant" reading was of one consumer rendering one variant, not of the component.
A fixed `height` would clip `logo`, `nav` and `actions` — all three are consumer
`ReactNode` slots, so the height is content-determined.

**47px is the lowest natural variant height** (22px logo mark + 2×12px padding + 1px
bottom border), chosen so `min-height` moved **zero pixels**: all four variants at
344/390/768/1440 report bounding heights byte-identical to the pre-change baseline,
and `centered` paints exactly the 47px the property advertises.

The honest limit is documented in the AppBar docstring rather than implied away:
`--ds-appbar-h` is a **floor**, exact whenever the slots fit one row, and a consumer
who overfills a slot until it wraps gets a taller bar than the property reports. CSS
custom properties are inputs to layout, not readings of it. Making it an oracle
requires giving AppBar a definite row height — a geometry change across all four
variants, and properly Phase 06.1's density axis, which is what `--ds-appbar-h` on
the class is now the hook for.

### 3. Before / after computed target sizes at a coarse pointer

Chromium, `hasTouch: true`, 390×844, charcoal × light. Every number from
`getBoundingClientRect`, never from the sheet.

| Target | Before | After |
|---|---:|---:|
| AppBar `<a>` "akhil saxena" (brand, `Link quiet`) | 88.95 × **21** | 88.95 × **44** |
| AppBar `<a>` "work" | 35.39 × **21** | **44** × **44** |
| AppBar `<a>` "photographs" | 94.39 × **21** | 94.39 × **44** |
| AppBar bare inline-styled `<a>` "work" (consumer markup verbatim) | 29.52 × **20** | **44** × **44** |
| Footer `<a>` "Privacy" | 44.41 × **16** | 44.41 × **44** |
| Footer `<a>` "Terms" | 36.70 × **16** | **44** × **44** |
| Footer `<a>` "Status" | 39.14 × **16** | **44** × **44** |
| Footer `<button>` "Privacy" | 42.06 × **22.5** | **44** × **44** |
| Footer `<button>` "Terms" | 35.03 × **22.5** | **44** × **44** |
| Footer `<button>` "Status" | 37.13 × **22.5** | **44** × **44** |
| bar painted / `--ds-appbar-h` | 47 / 47px | **69 / 69px** |

The bare inline-styled anchor reproduces the audited consumer's markup — inline
`paddingBottom: 2` included — and landed on **20px**, the same number Phase 0
reported, so the reproduction is faithful rather than approximate.

**Fine pointer (1440×900, no touch) after the fix is byte-identical to before:**
anchors 88.95×21 / 35.39×21 / 94.39×21, Footer `<a>` 44.41×16 / 36.7×16 / 39.14×16,
bar 47 / 47px, and computed `min-height`/`min-width` both `auto`. Desktop density is
untouched, asserted font-independently by reading `min-height` rather than by
matching pixel counts that a face change would break.

### 4. The catalogue exclusion list

`EXCLUDED_FROM_CATALOG` in `src/overview-links.test.ts`, with the reasons
deliberately marked as different kinds:

| Component | Reason | Kind |
|---|---|---|
| **`Field`** | Not a rendered component: `useField()` plus a wrapper that puts a label, hint and error around a control the **caller** supplies. It also has **no story file**, so `inputs-field--docs` does not exist and cataloguing it would create exactly the broken tile the neighbouring link test prevents. | **Technical** — it *cannot* be catalogued as-is |
| **`IconButton`** | The icon-only form of `Button`, catalogued under `Button`. | **Editorial** — it *could* be catalogued: `IconButton.stories.tsx` is tagged `autodocs`, so `inputs-iconbutton--docs` resolves. Revisit the taxonomy and the asserted total becomes 80. |

Being explicit that IconButton's exclusion is a choice rather than a constraint is
the substance of the fix. `79 = 81 − 2` where one of the two was *quietly* dropped is
E14 again with a tidier face on it.

Counts, all three re-derived at execution time: README **80** → **79**; catalogue
sums to **79** across 10 categories; `find src -mindepth 2 -maxdepth 2 -type d` gives
**81**; delta is exactly `src/inputs/Field` and `src/inputs/IconButton`.

---

## AppBar owns no anchors — the plan's `files_modified` was wrong about this

Grepped and confirmed: `src/layout/AppBar/index.tsx` contains **no `<a>`, no `Link`
import and no `href`**. `logo`, `nav` and `actions` are `ReactNode` props. The three
20px anchors Phase 0 measured are **consumer children** — from
`.playground/src/components/PublicNav.tsx`, which passes an `<a href="/">akhil
saxena</a>` as `logo` and two `NavLink` anchors as `nav`.

Phase 0 had already written the correct selector down and it was not carried into the
plan. `.playground/src/styles/case.css:453`:

```
 18  .ds-atom-appbar a            — the design system's AppBar.  D-16-1, LEFT.
 18  .ds-atom-footer-link         — the design system's Footer.  D-16-1, LEFT.
```

So editing `AppBar/index.tsx` could not have fixed those targets, and the fix is a
descendant rule on `.ds-atom-appbar` in `primitives.css`. `AppBar/index.tsx` was
still touched, for its **docstring only** — no code change.

**`Footer/index.tsx` was listed in `files_modified` and was not modified at all.** Its
markup already carries `.ds-atom-footer-link` on both branches; the fix is entirely
CSS. Three files not in `files_modified` were added instead: the two stories and
`tests/visual/touch-target.spec.ts`.

## Gates repaired

**Task 1, gate 2 — self-contradictory.** The action says *"Document the property in the
`AppBar` docstring"*; the gate then failed on `grep -q 'ds-appbar-h'
AppBar/index.tsx`. Doing what the action says makes the gate fail. Demonstrated
first (gate red with the property declared purely at class level and merely
*mentioned* in prose), then narrowed to the gate's stated intent — an inline-style
**write**, which in JSX can only be a quoted key:

```bash
PAT="[\"']--ds-appbar-h[\"'][[:space:]]*\]?[[:space:]]*:"
if grep -qE "$PAT" "$DS/src/layout/AppBar/index.tsx"; then echo "FAIL: written as an inline style"; exit 1; fi
```

Negative-controlled both ways: it bites on `style={{ "--ds-appbar-h": "47px", … }}`
**and** on the computed-key form `["--ds-appbar-h"]:`, passes on the documented file,
and the file was restored byte-identical (sha `8893fc46…` before and after). The
documentation was written; the broken gate was fixed rather than the doc dropped.

**Task 2, gate 3 — describes a spec that does not contain the probes.** The gate runs
`control-boundary.spec.ts` with the comment *"the 44px probes live there"*. They do
not, and did not: that spec queries only `button, input, select, textarea`, its sole
`getBoundingClientRect` (line 248) is a zero-size **skip filter**, its only three
`44` matches are the string `3.44:1`, and it has no `pointer`/`hasTouch` handling at
all. Repaired by adding the spec where the probes actually live:

```bash
npx playwright test tests/visual/touch-target.spec.ts tests/visual/control-boundary.spec.ts --reporter=line
```

Both run green (13 passed). `control-boundary.spec.ts` was left unmodified.

## Negative controls run

Five, each reverted from a `cp` backup and verified byte-identical by `shasum -a
256`. No `git checkout --`, no `git stash`, no `git reset`.

| # | What was broken | Result |
|---|---|---|
| **NC-0** | The whole RED phase — the spec run before any CSS existed | 4 failed / 6 passed, reporting 21px, 16px, 22.5px and 20px. The "rule absent" state, measured rather than assumed |
| **NC-A** | Footer floor rewritten as `padding-block: 14px` at (0,2,0) | `<a>` reached 44px but **`<button>` only 40.5px**. Padding adds to a content height, so it cannot *guarantee* a floor — the two branches of one function land on different numbers |
| **NC-A2** | Footer floor rewritten with the naive `.ds-atom-footer-link` (0,1,0) | **The rule was completely invisible on the `<a>` form**: `padding: 0px`, height **16px**, unchanged. My rule at line 5322, `.ds-atom-link` at line 6204 — equal specificity, later wins. Every vitest case stayed green, because jsdom implements no specificity. *This is exactly the trap that cost 01-10 and 01-11 a rule each* |
| **NC-B** | AppBar floor rewritten as `padding-block: 12px` | Bare inline-styled anchor reached only **32px** (`pad=12px 0px 2px` — the inline `padding-bottom` won) and its **width stayed 29.52px**; the bar painted **70px while the property still said 69px**. The spec's inline-padding case caught it by name |
| **NC-C** | Four separate breaks of the count test: README back to 80; a new `src/inputs/ZzzProbeWidget/`; `IconButton` deleted from the exclusion list; the `categories` array mangled so the regex matches nothing | All four failed. README fails with *"expected 80 to be 79"*; the directory and the dropped exclusion each fail **naming the component**; the mangled parse fails **twice**, the pre-existing *"parses the Overview's own category data"* guard firing alongside the new assertion — so an empty parse cannot report agreement |

`NC-A2` and `NC-B` between them are why the shipped rule uses
`min-height`/`min-width` on a `(0,2,0)` selector rather than the padding on
`.ds-atom-footer-link` the plan specified.

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **`.ds-atom-footer-link`'s `padding: 5px 0` is already dead for the `<a>` form, on
   `main`.** `.ds-atom-link { padding: 0 }` was added 2026-08-15 in `1050c196`
   (*"fix: visual defects the suite could not see"*), which `git merge-base
   --is-ancestor` confirms is on **`main`**, i.e. it pre-dates the `charcoal-theme`
   branch. That is why the `<a>` form measures **16px** here while Phase 0 recorded
   22.5px against an older published tarball: the gap silently got **worse** by
   6.5px between the audit and this plan. Not this plan's to revert — the floor now
   covers it — but the dead declaration is still sitting at line 5198.

2. **The two branches of `Footer.renderLink` do not look alike.** Same cascade tie:
   `.ds-atom-link`'s `text-decoration: underline` beats `.ds-atom-footer-link`'s
   `text-decoration: none`, so an `href` link is underlined and an `onClick` link is
   not, in one footer row. Out of scope (E13 is geometry) and now at least both are
   44px, but a consumer mixing `href` and `onClick` links gets a visibly mixed row.

3. **`.ds-atom-appbar` has two `transition` declarations**, lines 5145 and 5152; the
   longhand list is dead because `transition: all 0.2s ease` follows it. Cosmetic,
   pre-existing, untouched.

4. **The design system had zero `(pointer: coarse)` handling before this plan.**
   Grepping `src/` and `tests/` for `coarse` returned nothing. These two rules are
   the first, which matters for Phase 06.1: the density axis will want a shared
   convention rather than two ad-hoc blocks, and `F-15-7`'s remaining control floors
   (Checkbox 22px, InlineEdit 25px, NumberStepper 24/30px, IconButton's 40px ceiling)
   are all still open and deliberately untouched here.

5. **Two new Storybook stories mean two new visual baselines.** `AnchorNavigation`
   and `CompactWithLinks` have no entry in `tests/visual/storybook.spec.ts-snapshots`.
   `storybook.spec.ts` captures *all* stories, so `npm run test:visual` will report
   them as missing until **01-20** records baselines — which is 01-20's job, and it
   must run after this branch lands. Not in the four sibling gates, so nothing here
   is red.

6. **A husky + lint-staged pre-commit hook in `$DS` transiently runs `git stash`.**
   Every commit prints *"Backed up original state in git stash"* and then cleans up;
   `git stash list` is empty after each. Benign while plans are sequential, and worth
   knowing given the standing prohibition on `git stash` — the executor never invoked
   it, the repo's own tooling did. It also runs `biome check --write` on staged files,
   so staged formatting is fixed silently.

## Deviations from plan

### Auto-fixed / decided without asking

1. **[Rule 1 — plan defect] Task 1 gate 2 contradicted its own action.** Repaired to
   match its stated intent, negative-controlled, documented above. Alternative was
   dropping required documentation to satisfy a broken check.
2. **[Rule 1 — plan defect] Task 2 gate 3 pointed at a spec with no 44px probes.**
   Repaired by adding `touch-target.spec.ts` to the command. `control-boundary.spec.ts`
   untouched and still green.
3. **[Rule 1 — plan premise wrong] "Do it with padding, not with `height`."** Padding
   was disproved twice in the browser (NC-A, NC-B). Shipped `min-height`/`min-width`.
   The plan's stated reason — *"a `height` on an inline element does nothing"* — also
   does not apply: these anchors are flex items in `.ds-atom-appbar` and in Footer's
   link rows, so they are blockified and `min-height` applies.
4. **[Rule 1 — plan premise wrong] "Phase 0 measured the bar as constant … so a fixed
   height is defensible."** Measured 47/51/53/61/63px. Shipped `min-height`.
5. **[Rule 2 — missing critical functionality] `box-sizing: border-box` on
   `.ds-atom-appbar` and on both floor rules.** There is no global border-box reset,
   so without it `min-height` would apply to the *content* box and a 47px floor would
   have painted a 72px bar.
6. **[Rule 2] `:has(a)` guard on the coarse `--ds-appbar-h`.** Re-declaring it
   unconditionally would tell an anchor-less bar of Buttons that it is 69px when it
   paints 53px — the same lie the property exists to prevent, inverted.
7. **[Rule 2] Split the floor across two component banners.** `split-css.mjs` slices
   on banners, so one combined block would have put the AppBar rule in `footer.css`
   and left a consumer importing `appbar.css` with no floor. Still 75 files,
   round-trip byte-exact.
8. **[Rule 3] Two Storybook stories added.** The probes had nothing real to measure:
   every AppBar story passes Buttons, every Footer story uses `onClick`. Composed from
   `Link` (`variant="quiet"`, stylesheet-only) rather than bare `<a>`, honouring
   `primitive-composition.test.ts` — which in fact excludes `.stories.tsx`, but the
   rule is right anyway.
9. **Five commits instead of the plan's one prescribed message.** Atomicity per the
   standing rules.
10. **`COMPONENT_SCOPED`'s docstring corrected.** It described its entries as *"set
    inline by a component"*, which is precisely what `--ds-appbar-h` is not. A third
    category was documented, naming the class-level form as the preferred one and
    `--ds-sidebar-w`'s inline form as the reason why.

### Not done

- **`Footer/index.tsx`** — listed in `files_modified`, needed no change.
- **No `REFACTOR` commit** — nothing to clean up.
- **`00-FINDINGS.md`** — deliberately not edited (protocol §10).

## Verification

| Plan verification item | Result |
|---|---|
| `--text-*` gains one 52px step, pre-existing steps asserted unchanged, charcoal declares zero `--text-*` | PASS — gate 1 as written |
| `--ds-appbar-h` declared at class level, drives the bar's height, in `COMPONENT_SCOPED` | PASS — gate 2 repaired; `min-height: var(--ds-appbar-h)`; spec asserts painted == declared in both pointer cells |
| Computed-style probes at coarse pointer show every AppBar/Footer target ≥ 44px; fine-pointer unchanged | PASS — 10/10 in `touch-target.spec.ts`; fine-pointer values byte-identical to the RED run |
| `overview-links.test.ts` asserts README = catalogue and catalogue + exclusions = directory count, parse guard intact | PASS — 3/3, and all four breaks fail |
| All four sibling gates | PASS — `npm test` 1625/1625 in 116 files, `check` 351 files clean, `typecheck` clean, `css:check` 75 files byte-exact |

`$DS` is tracked-clean on `charcoal-theme` (30 commits ahead of `main`), the only
untracked path being the known-harmless `design_handoff/design_handoff_ds_overview/`.
`git stash list` is empty. No temporary probe spec left behind.

## Self-Check: PASSED
