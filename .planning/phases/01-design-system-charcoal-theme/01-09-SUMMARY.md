---
phase: 01-design-system-charcoal-theme
plan: 09
subsystem: design-system
tags: [styling-boundary, cascade, specificity, e3, e4, e5, ds-01, ratchet, where-selector]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 08
    provides: the 81 per-component subpath entries — Card and Chip each have their own entry shim now, so these edits reach consumers who import the subpath directly
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: probeComputed, the brand x mode computed-style helper all four browser cases use
provides:
  - "$DS/src/surfaces/Card/index.tsx — no inline base style at all; display, box-sizing and font-family live in .ds-atom-card"
  - "$DS/src/inputs/Chip/index.tsx — className concatenated, matching Card; the last clobbering component in the library"
  - "$DS/src/foundation/Text/index.tsx — variant colour handed to the stylesheet; colour precedence written into the docstring"
  - "$DS/src/primitives.css — .ds-atom-card gains font-family; four :where() Text variant-colour rules at zero specificity"
  - "$DS/src/styling-boundary.test.ts — display and color ratcheted, 30 + 26 entries each with a reason"
  - "$DS/tests/visual/brand-probe.spec.ts — 4 consumer-boundary cases x 4 brand x mode cells, all computed reads"
affects: [01-12 AppBar/Footer geometry, 01-18 Badge F-15-4, 01-20 charcoal baselines, Phase 5 page CSS]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ":where() to place a component default BELOW a consumer class — (0,0,0) loses by specificity rather than tying at (0,1,0) and being decided by load order"
    - "jsdom implements NO CSS specificity — it resolves the cascade by source order only. It does model inline-beats-stylesheet correctly, so it can prove an inline-removal fix but never a specificity contract"
    - "jsdom DOES apply real stylesheets to getComputedStyle, so a unit test can inject the actual primitives.css and read a computed value instead of an attribute"
    - "jsdom returns custom properties unsubstituted — computed colour reads back as the literal var(--ink-2)"
    - "git checkout -- <file> restores from HEAD, so it DESTROYS uncommitted work when used to undo a mutation in a file the plan is editing; restore from a copy instead"
    - "a ratchet keyed file -> reason (Record<string,string>) gives per-entry justification and still fails on a stale entry"

key-files:
  created: []
  modified:
    - ../design-system/src/surfaces/Card/index.tsx
    - ../design-system/src/surfaces/Card/Card.test.tsx
    - ../design-system/src/inputs/Chip/index.tsx
    - ../design-system/src/inputs/Chip/Chip.test.tsx
    - ../design-system/src/foundation/Text/index.tsx
    - ../design-system/src/foundation/Text/Text.test.tsx
    - ../design-system/src/primitives.css
    - ../design-system/src/styling-boundary.test.ts
    - ../design-system/tests/visual/brand-probe.spec.ts

key-decisions:
  - "Used :where() for the Text variant colours instead of the plan's literal `.ds-atom-text[data-variant=\"body\"]`. The bare selector weighs (0,2,0) and would have outranked a consumer's (0,1,0) class — closing E5 in the source while leaving it open in the browser. This is the plan's own stated ladder; the selector it specified could not implement it."
  - "Did NOT record the missing overlays-lightbox--responsive-gallery baseline. It belongs to an earlier plan's story (c198985) and recording a portaled-dialog baseline blind is how this repo previously captured a bug as the reference."
  - "Removed Text's colour from variantStyles as well as from variantPick. Leaving the dead values would have kept Text on the new inline-color ratchet, so the fix would have read as incomplete in its own gate."
  - "Enumerated 56 inline display/color sites as ratchet entries with reasons rather than widening the regex, per the plan — the list is visible and can only shrink."

requirements-completed: [DS-01]

# Metrics
duration: 25m
completed: 2026-08-19
---

# Phase 1 Plan 09: Consumer Styling Boundary (E3, E4, E5) Summary

**All three findings are closed and each is proven by a computed style read in a real
browser, in all four brand × mode cells — not by the presence of a declaration in source.
The default theme is bit-for-bit unchanged: all 488 tracked visual baselines compared with
zero modified. The headline correction is that the plan's specified selector for E5 would
not have worked: `.ds-atom-text[data-variant="body"]` weighs (0,2,0) and outranks a
consumer's `.foo` at (0,1,0), so it would have moved the defect from the inline layer to
the class layer while every source-level grep went green. It ships inside `:where()` at
(0,0,0) instead.**

## Performance

- **Duration:** ~25 minutes
- **Tasks:** 2 of 2, committed as 3 atomic commits
- **Files:** 0 created, 9 modified (all in `$DS`)
- **Suite:** 116 files / 1568 tests → **116 files / 1583 tests** (+15), all passing
- **Biome:** 348 files, no fixes applied
- **Negative controls:** 5 run, 4 expected-RED + 1 expected-GREEN, all restored byte-identically

---

## The three fixes, and what each one actually was

### E3 — `Card` inlined `display: block`

The finding said the inline declaration beat the class layer. What the code showed is
sharper: **`.ds-atom-card` already declared `box-sizing: border-box; display: block`**. The
inline copy was pure duplication that bought nothing and cost the consumer everything. So
"move the declaration" was really "delete the redundant inline copy" for two of the three
properties; only `font-family: var(--font)` genuinely moved.

`baseStyle` is gone entirely and `style={{ ...baseStyle, ...style }}` became `style={style}`,
so a consumer's inline `style` prop still wins.

### E4 — `Chip` clobbered `className`

One-line fix, exactly as specified: destructure `className`, concatenate with Card's
template pattern. The rest-spread can no longer reintroduce it because `className` is no
longer in `...rest`.

**Confirmed no pixel moved, and confirmed *why*:** the only internal caller is
`SearchAndFilters` (`src/interaction/SearchAndFilters/index.tsx:173`) and it passes no
`className`, so nothing in the library was relying on the clobber. Chip's inline
`baseStyle`/`toneStyles` declare `background`, `border-color` and `color`, which already
outranked `.dark .ds-atom-chip` — the only non-`[data-interactive]` rule in its section.
Restoring the class therefore changes no painted property. The measured cost was the focus
ring, and that is what the browser case checks.

### E5 — `Text` could not be recoloured, and the plan's fix would not have fixed it

`Text` inlined its variant colour whenever `tone` was absent. The four colours moved to
`primitives.css` — **but not with the selector the plan specified.**

The plan's own precedence ladder requires the variant default to sit *below* a consumer's
class rule while `[data-tone]` sits *above* it. `[data-tone]` is `(0,2,0)`, and a bare
`.ds-atom-text[data-variant="body"]` is **also `(0,2,0)`**. Shipping that selector would
have put the variant default at the same weight as `tone` and above any consumer class:
E5 would have stayed open, with `grep` and the unit tests both green.

`:where(.ds-atom-text[data-variant="body"])` weighs `(0,0,0)`. The ladder now holds by
specificity rather than by load order:

| # | Source | Specificity |
|---|---|---|
| 1 (lowest) | `:where(.ds-atom-text[data-variant="…"])` | (0,0,0) |
| 2 | a consumer's class rule | (0,1,0) |
| 3 | `.ds-atom-text[data-tone="…"]` | (0,2,0) |
| 4 (highest) | the deprecated `color` prop | inline |

The contract that falls out — *passing `tone` means the component owns the colour; omitting
it hands the colour to the cascade* — is now written into the component docstring, which is
the sentence E5 was asking for.

`fontSize` was left exactly as it was, per the plan.

---

## probeComputed readings — all three fixes, both brands, both modes

From `tests/visual/brand-probe.spec.ts`, 4 new cases, 16 cells, all green.

### E3 — Card

| Cell | bare `display` | bare `box-sizing` | bare `font-family` | + consumer `.wk-card` |
|---|---|---|---|---|
| default / light | `block` | `border-box` | Inter, -apple-system, … | `display=flex` `flex-direction=column` `class="ds-atom-card wk-card"` |
| default / dark | `block` | `border-box` | Inter, -apple-system, … | `display=flex` `flex-direction=column` |
| charcoal / light | `block` | `border-box` | `"DM Sans Variable", "DM Sans", system-ui, sans-serif` | `display=flex` `flex-direction=column` |
| charcoal / dark | `block` | `border-box` | `"DM Sans Variable", "DM Sans", system-ui, sans-serif` | `display=flex` `flex-direction=column` |

The `font-family` column is the load-bearing one for the move: it resolves per brand from
the class rule, so nothing was lost by taking it off the element.

### E4 — Chip

| Cell | bare `class` | bare `cursor` | bare `color` / `background` | + consumer class + `[data-interactive]` |
|---|---|---|---|---|
| default / light | `ds-atom-chip` | `auto` | `rgb(28,28,26)` / `rgb(240,240,240)` | `class="ds-atom-chip wk-chip"` `cursor=pointer` |
| default / dark | `ds-atom-chip` | `auto` | `rgb(237,237,237)` / `rgb(42,42,42)` | `class="ds-atom-chip wk-chip"` `cursor=pointer` |
| charcoal / light | `ds-atom-chip` | `auto` | `rgb(26,24,21)` / `rgb(237,233,224)` | `class="ds-atom-chip wk-chip"` `cursor=pointer` |
| charcoal / dark | `ds-atom-chip` | `auto` | `rgb(234,231,224)` / `rgb(36,36,35)` | `class="ds-atom-chip wk-chip"` `cursor=pointer` |

`cursor` moving `auto → pointer` is the atom hook doing work again: it comes from
`.ds-atom-chip[data-interactive]`, which could not reach the element while the consumer
class had replaced the atom class.

### E5 — Text

| Cell | body default `color` | + consumer `.wk-red` |
|---|---|---|
| default / light | `rgb(87, 83, 78)` | `rgb(255, 0, 0)` |
| default / dark | `rgb(171, 171, 171)` | `rgb(255, 0, 0)` |
| charcoal / light | **`rgb(68, 64, 58)`** = `#44403a` | `rgb(255, 0, 0)` |
| charcoal / dark | **`rgb(201, 197, 188)`** = `#c9c5bc` | `rgb(255, 0, 0)` |

The two charcoal values are exactly the `--ink-2` figures the plan named, independently
corroborating that the rule resolves through the charcoal token layer and not the default one.

### E5 — the specificity contract (browser-only)

The consumer sheet is injected **last**, which is the ordering that would win if this were
decided by source order. It does not win:

| Cell | `tone="muted"` colour | after a later consumer rule |
|---|---|---|
| default / light | `rgb(107, 101, 96)` | `rgb(107, 101, 96)` — unchanged |
| default / dark | `rgb(145, 145, 145)` | `rgb(145, 145, 145)` — unchanged |
| charcoal / light | `rgb(79, 76, 66)` | `rgb(79, 76, 66)` — unchanged |
| charcoal / dark | `rgb(177, 174, 168)` | `rgb(177, 174, 168)` — unchanged |

---

## The `className` enumeration E4 actually asked for

E4's complaint is *"inconsistent API"*, so the finding only closes once the inconsistency is
enumerated. All **81** components scanned, comment-stripped, and the categories sum to 81:

| Handling | Count | Notes |
|---|---:|---|
| Concatenates, template-literal idiom | **69** | `` `ds-atom-x${className ? ` ${className}` : ""}` `` — Chip joined this group |
| Concatenates, array-join idiom | **1** | `Field` — `["ds-atom-field", className].filter(Boolean).join(" ")`. Correct, but a third spelling of the same thing |
| **Clobbers** | **0** | was 1 (`Chip`) — the library has no clobbering component left |
| Accepts no `className` at all | **11** | `Avatar`, `Badge`, `InlineConfirm`, `Snackbar`, `Toast`, `ActionSheet`, `ConfirmDialog`, `Lightbox`, `Tooltip`, `Coachmark`, `Wizard` |

The eleven are a real gap but not the same bug: they never promise to accept a class, so
nothing is silently discarded. Not fixed here — that is eleven components' worth of API
change and is recorded as a finding rather than smuggled into this plan.

---

## The ratchet: `display` and `color`

Added in the existing shape, as `Record<file, reason>` so each entry carries its own
justification and a fixed-but-not-removed entry still fails. **30 `display` entries, 26
`color` entries.** Both documented as shrink-only.

The reasons distinguish two genuinely different situations, which is the useful part:

- **Internal wrapper** — a `<div style={{ display: "flex" }}>` with no class of its own.
  Unreachable from a consumer stylesheet either way, so migrating it buys nothing today.
- **Root base style** — a module-level style object spread onto the element that *also*
  carries the `ds-atom-*` class. This is the E3 shape exactly, and every one is a
  consumer-styling bug nobody has reported yet.

Entries carrying an owning finding rather than a migration note:

| Entry | Property | Owner |
|---|---|---|
| `inputs/Badge/index.tsx` | display + color (10 tone colours) | **F-15-4**, plan 01-18 — Badge is one inline style object with no class hook at all |
| `layout/AppBar/index.tsx` | display (8) + color | **D-16-1**, plan 01-12 |
| `layout/Footer/index.tsx` | display (3) + color | **D-16-1**, plan 01-12 |
| `foundation/Eyebrow/index.tsx` | color | **identical shape to E5** — see findings below |
| `foundation/Link/index.tsx` | color (3, in `variantStyles`) | same E5 migration, not done |

`Card` and `Text` are **not** on either list — they came off as a result of this plan, which
is the ratchet tightening rather than merely being declared.

---

## Negative controls — the ratchet was proven to bite

A ratchet that is green on the day it is written proves nothing. Five controls:

| # | Control | Expected | Result | Restored |
|---|---|---|---|---|
| N0 | positive control, unmutated | GREEN | **GREEN 5/5** | — |
| N1 | plant `display: "flex"` in `foundation/Heading` (not on the list) | RED | **RED**, `new inline display …: expected [ 'foundation/Heading/index.tsx' ] to deeply equal []` | SHA identical |
| N2 | plant `color: "var(--ink-2)"` in `foundation/Text` (just cleaned) | RED | **RED**, naming `foundation/Text/index.tsx` | see deviation 1 |
| N3 | remove the inline `display` from `inputs/Kbd` (on the list) and leave its entry | RED on the *stale* branch | **RED**, `fixed — remove from KNOWN_INLINE_DISPLAY: expected [ 'inputs/Kbd/index.tsx' ]` | SHA identical |
| N5 | write `display: "flex"` and `color: "red"` **inside a comment** in `Heading` | GREEN | **GREEN 5/5** | SHA identical |

**N1's first attempt was an ineffective mutation, not an inert gate** — the 01-08
distinction, live. `Heading` has no `const baseStyle`, so the `perl` substitution matched
nothing and the file was unchanged; the gate was right to stay green. Re-aimed at
`const composed`, it landed and bit. The `[mutation landed]` probe is what caught it, and
every control here carries one.

**N5 matters more than it looks.** `Card/index.tsx`'s new docstring contains the literal
string `.wk-card { display: flex; flex-direction: column }` — so if comment-stripping ever
broke, Card would report itself as an offender and the gate would fail. It does not, which
is an incidental standing proof on real content; N5 is the deliberate version.

The RED runs also confirm the *positive* half of each assertion pair, since only one of the
five cases failed each time — the other four stayed green, so the mutation was localised
rather than breaking the file.

---

## Zero visual baselines changed

`npx playwright test tests/visual/storybook.spec.ts` — **478 captured, 4 time-dependent
skipped**. Proven directly rather than inferred from a green run:

```
git status --porcelain -- 'tests/visual/storybook.spec.ts-snapshots/*.png' | grep -v '^??'
>>> (empty) — no tracked snapshot is modified
```

**488 tracked baselines, 0 modified.** The suite uses `expect.soft`, so every comparison ran;
a mismatch anywhere would have been reported.

The run does report one failure, and it is **not** a moved pixel: `A snapshot doesn't exist
at … overlays-lightbox--responsive-gallery-chromium-darwin.png`. That story has never had a
baseline — `git log --all` on the snapshot path returns nothing — and it was added by
`c198985 feat(lightbox): swipe navigation and slide announcements`, an earlier plan in this
phase. Nothing in this plan touches Lightbox or creates stories, so this failure is
pre-existing. Playwright wrote the actual PNG; **it was deleted** (specific path, `rm -f`,
never `git clean`) so the tracked-clean gate stays valid for plan 01-10. Raised as a finding
below rather than recorded.

---

## Task Commits

| Task | Commit | Time | What |
|---|---|---|---|
| 1a | `9a41853` | 11:31 | `fix(card): move the inline base styles into .ds-atom-card` — index.tsx, Card.test.tsx, primitives.css |
| 1b | `dc0990d` | 11:32 | `fix(chip): concatenate a consumer className instead of replacing the atom class` |
| 2 | `2abe60b` | 11:47 | `fix(styling-boundary): let consumers style Card display, Chip class and Text colour` — Text, primitives.css, the ratchet, brand-probe |

Task 1 was split into two commits because the two components are independent and each is
separately verifiable; that is more atomic than the plan's single task, not less.

Branch `charcoal-theme` in `../design-system`, now **21 commits ahead** of that repo's `main`
(was 18). Author `Akhil Saxena <saxena.akhil42@gmail.com>`. **No AI attribution** —
`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` across all three
commit bodies → `0`.

## Sibling gates at exit

`npm test` **116 files / 1583 tests**; `npm run check` **348 files, no fixes applied**;
`npm run typecheck` both projects clean; `npm run css:check` **74 files round-trip
byte-exact**. Tree shows only the permitted `?? design_handoff/design_handoff_ds_overview/`.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The plan's specified selector for E5 would not have closed E5**

- **Found during:** Task 2, working out where the variant colours should land.
- **Issue:** the plan says to write `.ds-atom-text[data-variant="body"] { color: var(--ink-2) }`.
  That selector weighs **(0,2,0)** — a class plus an attribute — against a consumer's bare
  `.foo` at **(0,1,0)**. It therefore outranks exactly the rule E5 exists to let a page write.
  The plan's own precedence ladder puts the variant default *below* a consumer class, and its
  own reasoning about `[data-tone]` being (0,2,0) is what makes the contradiction visible:
  two rules cannot both be (0,2,0) and sit on opposite sides of a (0,1,0) rule.
- **Why this is the dangerous kind:** every source-level check would have passed. The unit
  test for "a consumer can recolour Text" would have passed too **in jsdom**, because jsdom
  implements no specificity and resolves by source order — the consumer sheet loads last, so
  it would have won there and lost in every real browser.
- **Fix:** the four rules ship inside `:where()`, weight (0,0,0). The `[data-tone]` rules stay
  unwrapped at (0,2,0). Both halves are asserted: structurally in `Text.test.tsx` (reading
  `selectorText` off the parsed sheet) and behaviourally in `brand-probe.spec.ts`, where the
  consumer sheet is injected *last* and still loses to `tone`.
- **Commit:** `2abe60b`

**2. [Rule 1 — Bug] `git checkout --` destroyed this plan's uncommitted work mid-control**

- **Found during:** Task 2, negative control N2.
- **Issue:** N2 planted an inline `color` in `src/foundation/Text/index.tsx` and restored with
  `git checkout -- <file>`. That restores from **HEAD**, not from the pre-mutation working
  tree — and Text's E5 fix was still uncommitted. The control's own SHA comparison caught it
  immediately (`[RESTORE FAILED]`), and inspection confirmed the inline `var(--ink-2)` was back.
- **Fix:** re-applied all four Text edits from the same scripted patches, re-formatted,
  re-ran — green. Every subsequent control (N3, N5) restores from a `cp` backup instead.
- **Worth carrying forward:** `git checkout -- <path>` is listed as the *safe* way to undo a
  single file, and it is — but only for a file the plan has not modified. For a file with
  uncommitted plan work it is destructive. The SHA check is what made this recoverable in
  seconds instead of silent.
- **Commit:** `2abe60b` (the re-applied state is what shipped)

**3. [Rule 2 — Correctness] Removed Text's colour from `variantStyles`, not just from `variantPick`**

- **Found during:** Task 2, populating the ratchet.
- **Issue:** the plan says to drop the `...(tone ? null : { color: variantBase.color })` line.
  Doing only that leaves `variantStyles` carrying four dead `color: "var(--ink-…)"` literals —
  which still match the new inline-`color` ratchet, so `Text` would have remained on its own
  allowlist. A fix that cannot pass the gate it ships alongside is not finished.
- **Fix:** `variantStyles` is now size and line-height only, with a docstring saying where the
  colours went and why `fontSize` stayed.
- **Commit:** `2abe60b`

### Scope additions, declared

- **`tests/visual/brand-probe.spec.ts` is outside the plan's `files_modified`.** The plan
  requires `probeComputed` verification in both brands but names no home for it. A throwaway
  spec would have produced the numbers and left no CI guard — and `Text.test.tsx`'s docstring
  points at `brand-probe.spec.ts` for the specificity claim, so a throwaway would have made
  that cross-reference false. Four permanent cases were added instead.
- **Task 1 committed as two commits** rather than one, per component.

**Total deviations:** 3 auto-fixed (2 × Rule 1 bug, 1 × Rule 2 correctness) plus 2 declared
scope notes. No gate was weakened, no baseline was re-recorded, and no finding's scope was
adjusted.

---

## What jsdom can and cannot prove — measured, because it changed the test design

Both facts were established with throwaway probes before any test was written, not assumed:

| Question | jsdom 25.0.1 | Consequence for this plan |
|---|---|---|
| Does `getComputedStyle` apply real stylesheets? | **Yes** — the actual 173 KB `primitives.css` parses in ~51 ms to 1,017 rules and resolves | The unit tests inject the shipped sheet and read computed values, so a rule in the wrong banner section fails in `npm test` |
| Does it honour inline-beats-stylesheet? | **Yes** | E3/E4/E5 unit cases bite for the right reason — each was RED before its fix |
| Does it implement specificity? | **No** — source order only. A (0,2,0) rule declared first loses to a (0,1,0) rule declared later | Every specificity claim was moved to the browser. Had it not been checked, the `:where()` correction above would have looked unnecessary |
| Does it substitute `var()`? | **No** — returns the literal `var(--ink-2)` | Variant-default assertions compare against the literal token reference |
| Does it support `:where()`? | **Yes** (nwsapi 2.2.23) | The structural assertion runs in jsdom; the weight it implies does not |

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **`storybook.spec.ts` has been failing since `c198985`, for a missing baseline.**
   `overlays-lightbox--responsive-gallery` was added by an earlier plan in this phase and its
   snapshot was never recorded, so the visual gate exits 1 on every run and has done so for
   every plan since. This plan did not record it: the story is a portaled Lightbox dialog,
   `npm run test:a11y` scans no portaled content, and this repository has already recorded a
   baseline with a bug present once. **01-20 owns baseline recording and should record it
   there, after review** — but any plan between now and then will see a red visual gate that
   is not theirs.

2. **`Eyebrow` has E5 exactly, and it is still open.** `src/foundation/Eyebrow/index.tsx:45`
   reads `...(color ? { color } : tone ? null : { color: "var(--ink-3)" })` — the identical
   construction Text carried. A page cannot recolour an Eyebrow from a stylesheet either. It
   is one `:where()` rule plus a two-line deletion, the same shape as this plan's Text change,
   but `Eyebrow` is outside this plan's declared file set so it was entered on the ratchet
   rather than fixed.

3. **`Link` carries the same pattern in `variantStyles`** — three colours inlined per variant
   (`src/foundation/Link/index.tsx:22,30,38`). Same migration, same reasoning, not done.

4. **Eleven components accept no `className` at all.** Listed in the enumeration table above.
   They do not silently discard a class the way Chip did, so this is a smaller problem — but
   it means "pass a class to restyle it" is not yet a property of the library, only of 70 of
   its 81 components. `Avatar` and `Badge` are the two that stand out, being widely composed.

5. **Three idioms for the same concatenation.** 69 components use the template literal, one
   (`Field`) uses `["ds-atom-x", className].filter(Boolean).join(" ")`. Both are correct.
   Worth collapsing to one helper when something else touches that surface — a shared
   `cx()` would also make the ratchet's job easier.

6. **`.ds-atom-chip` has no base rule at all.** Its section in `primitives.css` contains only
   `[data-interactive]` states and `.dark .ds-atom-chip`. Every base property — box type,
   padding, radius, border, font-size, colour — is inline, so `.dark .ds-atom-chip`'s three
   declarations are unreachable in practice: they are overridden by `baseStyle`/`toneStyles`
   on every render. That dark-mode rule is currently dead code, and will stay dead until
   Chip's base layer migrates.

7. **Card owns two banner sections and only one was needed.** `split-css.mjs` names Card as
   one of five components with a base plus an extensions section. `font-family` went into the
   base section with the other two base properties. Recorded because the plan flagged it as a
   trap and the answer turned out to be unambiguous.

---

## Self-Check: PASSED

Files claimed, verified on disk in `$DS`:

```
FOUND: src/surfaces/Card/index.tsx        5587abca71b8
FOUND: src/inputs/Chip/index.tsx          27b770ff7555
FOUND: src/foundation/Text/index.tsx      ff958cf77eea
FOUND: src/styling-boundary.test.ts       abcf6288e4f2
FOUND: src/primitives.css                 468d2704981b
```

Commits claimed, verified present on `charcoal-theme`:

```
FOUND: 9a41853  fix(card): move the inline base styles into .ds-atom-card
FOUND: dc0990d  fix(chip): concatenate a consumer className instead of replacing the atom class
FOUND: 2abe60b  fix(styling-boundary): let consumers style Card display, Chip class and Text colour
```

Plan `must_haves` key_links, verified by pattern:

```
FOUND: ds-atom-card    in src/surfaces/Card/index.tsx  (2 occurrences)
FOUND: ds-atom-chip${  in src/inputs/Chip/index.tsx
FOUND: display         in src/styling-boundary.test.ts (KNOWN_INLINE_DISPLAY, 30 entries)
```

No server was started by hand — Playwright's `webServer` managed Storybook on 6006 and shut
it down. Ports 4321, 6008 and 6009 were never bound.
