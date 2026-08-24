# Charcoal a11y — G1, G4 and G5 fixed; G2 and G3 deliberately open; and the real violation count

**Status: G1, G4 and G5 are fixed, gated and committed. G2 and G3 are untouched by
design.** Upstream: `01-CHARCOAL-A11Y-TRIAGE.md`, whose partition and per-node
figures this work independently reproduced before changing anything.

`$DS` = `design-system`, branch `charcoal-theme`. Started at `5dbf0d3` (70 commits
ahead of `main`), finished at **`5fb2ce4`** (74 ahead). `package.json` stays at
**1.11.4**. Nothing published, tagged or merged; the 170 pending renames are
unapplied; 01-20 Task 3 untouched.

The headline is two numbers:

- **The shipping gate went from 25 charcoal `color-contrast` failures to 11.** The
  11 that remain are exactly G2 (4) + G3 (7).
- **The honest total was never 25.** A whole-document sweep that also counts axe's
  `incomplete` bucket finds **21 further stories** carrying a measurable contrast
  failure that the gate never fails on, plus an undecidable tail of up to 18 more,
  plus two shipped states that no story renders at all. **25 is a floor, and the
  floor is roughly half the number.**

---

## 1. The compositor was verified before any number here was trusted

Every ratio below is composited by hand. `getComputedStyle` does not composite
alpha — it reports `rgba(245,158,11,0.10)` verbatim — and this phase has already
paid for trusting it once (2.020:1 read where the composited truth was 1.114:1).

The compositor is **one source text**, unit-verified in Node and injected into the
browser for the live sweeps, so the implementation that was checked is the
implementation that ran. Verifying one and shipping another is the defect this
avoids.

### 1.1 Against the recorded Tabs triple — all six values, exactly

`--surf-2` `rgba(255,255,255,0.055)` over the three default-brand dark stops with
`--ink-3` `#919191` on top:

| stop | value | composited | recorded | ratio | recorded | |
|---|---|---|---|---|---|---|
| `--cream` | `#181818` | `#252525` | `#252525` | **4.882** | 4.882 | MATCH |
| `--cream-2` | `#1f1f1f` | `#2b2b2b` | `#2b2b2b` | **4.473** | 4.473 | MATCH |
| `--cream-3` | `#2a2a2a` | `#363636` | `#363636` | **3.851** | 3.851 | MATCH |

Reproducing the ordered triple *and* the three composited hexes could not be
luck. Four further checks, because a compositor that agrees on one case can still
be broken:

- **Negative control.** Ignoring alpha gives `5.634 / 5.230 / 4.554` — the
  triage's own recorded control values, and visibly different at every stop. The
  check therefore distinguishes a correct compositor from the exact defect it
  exists to catch.
- **Hex parsing asserted directly**, not inferred from a ratio. Nine literals
  including `#1e1e1d → rgb(30,30,29)` and `#161616 → rgb(22,22,22)` — the two the
  first version of this parser read as `rgb(1,1,1)` and `rgb(161616,0,0)`.
- **`parse()` throws** on `""`, `not-a-colour`, `#12345`, `color(display-p3 …)`,
  `rgb(a,b,c)`, `#gggggg`. A parser that silently returns black turns every ratio
  into a confident lie — the `luminance()`-returns-`NaN` shape that made
  `ratio < 4.5` always false in an earlier plan. `luminance()` throws on `NaN`
  rather than propagating it.
- **The triage's whole table reproduced**: 4.402, 3.819, 1.921, 4.460, 4.296,
  1.061, and all **18 rows** of G4's translucent per-stop table (1.178 / 1.294 /
  1.397 / 1.391 / 1.530 / 1.648 and the six charcoal-light and six default rows),
  each to three decimals from the theme's declared stops.

One reconciliation: the triage prints Toast at **3.81** and AlertBanner title at
**3.819**. These are the *same colour pair* (`#292524` on `#b0722a`); 3.81 is a
truncation, not a second measurement. That is consistent with §5.1's claim that
the Toast row is a G2 instance, and it is the arithmetic proof of it.

### 1.2 The brand was asserted at the probed element, both halves

Per story, per the rule that `--ochre` once read *correctly* at a node whose
*neutrals* were shadowed:

- `<html data-brand>` = `charcoal`
- `--ochre` = `#b0722a` at the **deepest node** of `#storybook-root` (charcoal-only
  token, so the brand layer provably reaches that node)
- `--cream` = charcoal's own value at that **same node** (`#f4f1ea` light /
  `#161616` dark) and **not** the design system's (`#fcfcfc` / `#181818`)

Across the 508-story sweep: **0 brand-assertion failures**. The one transient
(`patterns-coachmark--default`) was re-probed individually and passes. Every probe
boots `iframe.html` **with a story id** — without it Storybook discards the
`globals` parameter, which is how a 508-story charcoal sweep once ran the default
brand.

Both sweeps had exactly one story error each, and they were **different stories**;
both were re-measured individually and are clean (0 violations, 0 incomplete). So
coverage is 508/508, not 507.

---

## 2. G1 — stranded ink on an accent fill · FIXED · commit `7b3d25d`

Two declarations, `#1c1917` → `var(--ink-inverse)`:

| location | selector |
|---|---|
| `src/primitives.css` | `.ds-atom-split-primary[data-variant="primary"], .ds-atom-split-chevron[data-variant="primary"]` |
| `src/primitives.css` | `.ds-atom-datepicker-cell.is-selected` |

### 2.1 Before → after, per component, measured

| component | brand | nodes | before | after | fail before | fail after |
|---|---|---|---|---|---|---|
| **SplitButton** | charcoal | 18 | **4.402** | **4.555** | 18 | 0 |
| **SplitButton** | default | 18 | 8.143 | 8.143 | 0 | 0 |
| **DatePicker** (`.is-selected`) | charcoal | 5 | **4.402** | **4.555** | 5 | 0 |
| **DatePicker** | default | 5 | 8.143 | 8.143 | 0 | 0 |
| **DateRangePicker** endpoints | charcoal | 4 | **4.402** | **4.555** | 4 | 0 |
| **DateRangePicker** endpoints | default | 4 | 8.143 | 8.143 | 0 | 0 |

The 18 SplitButton nodes are 9 text-bearing faces plus 9 chevrons; axe cites only
the 9 with text, which is how the triage's 9-node figure and this 18-node figure
reconcile. Ink moved `#1c1917 → #161616` in charcoal and `#1c1917 → #1c1917` in
default.

### 2.2 The 14-charcoal / 0-default asymmetry — confirmed, not assumed

The triage predicted it and reasoned it from `--ink-inverse` *being* `#1c1917` in
the default brand. Checked rather than inherited:

- **charcoal: 27 nodes across exactly 14 stories** had their ink change.
- **default: 0 nodes** had their ink change — byte-identical resolution.

The 14 stories, named:

```
interaction-splitbutton--default            (light)   inputs-datepicker--default          (light)
interaction-splitbutton--tones              (light)   inputs-datepicker--with-events      (light)
interaction-splitbutton--variants           (light)   inputs-datepicker--with-time-picker (light)
interaction-splitbutton--per-action-variant (light)   inputs-datepicker--playground       (light)
interaction-splitbutton--sizes              (light)   inputs-datepicker--dark-mode        (dark)
interaction-splitbutton--with-icons         (light)   inputs-daterangepicker--default     (light)
interaction-splitbutton--dark-mode          (dark)    inputs-daterangepicker--dark-mode   (dark)
```

That set includes the two DateRangePicker stories the triage flagged as "clean but
would still move" — so the prediction was right in its detail, not just its count.

**However: none of these 14 images actually moved.** See §5.

---

## 3. G4 — the tinted StatusPill ink · FIXED · commits `2641744` then `5fb2ce4`

### 3.1 The first implementation was wrong, and two existing gates said so

The triage recommends "a `.dark` override for the two tinted StatusPill stages"
and explicitly warns **against** changing charcoal's `--amber-ink`, because that
token "is correct for solid ochre fills and is used by them; changing it to a
light value would break every correct consumer to fix one incorrect one."

I implemented the recommendation (`2641744`) and it was rejected by the repo:

1. `src/tokens.test.ts` → *"defines every custom property referenced anywhere in
   src"*. The override reached for `--ochre-d-strong`, which is declared only in
   `themes/charcoal.css`. Referencing it from `primitives.css` would have meant
   **promoting it into every brand's base token surface to fix one pill** — the
   same public-surface cost the triage rules out for G2 and G3.
2. Relocating the rule into `charcoal.css` then failed *"parses a whole charcoal
   block rather than a truncated one"*, which asserts that file has **exactly two
   closing braces at column 0**. `charcoal.css` is contractually a two-block token
   file with zero component selectors, and that contract is what stops every
   token-mirror test in the suite from silently measuring a truncated parse.

Relaxing either gate to admit my change would have been the anti-pattern. Both
were correct, and between them they say the component layer was never the right
place: **the defect is the theme's alias, so the fix is the alias.**

### 3.2 The triage's warning is inverted — measured, with the consumer census

`--amber-ink` has **five** consumers in `src/`. **Not one is a solid ochre fill.**
`tokens.css` defines the token as *"text colours for use **on a tinted pill** of
the same hue (Badge, Chip, StatusPill, error summaries)"*, and the Tabs fix
`004254f` already recorded the same reading in its own comment (*"NOT
--amber-ink: that token is the ink for a TINTED amber"*).

In charcoal dark, **all four** consumers were failing:

| consumer | surface | before | after |
|---|---|---|---|
| StatusPill `screening` | `rgba(245,158,11,0.10)` | **1.18** | **6.93** |
| StatusPill `interviewing` | `rgba(245,158,11,0.18)` | **1.39** | **5.87** |
| Badge `[data-tone="warning"]` | `rgba(245,158,11,0.15)` | **1.30** | **6.27** |
| DatePicker `.is-open` trigger | `--paper-warm` = `--cream-2` | **1.09** | **7.53** |

(worst of the three surface stops; all four failed on all three before, all four
clear AA on all three after.) There were **no correct consumers to break**. The
warning's stated premise does not hold.

**Fix:** charcoal's **dark-block only** `--amber-ink: var(--ink-inverse)` →
`var(--ochre-d-strong)` (`#d4a66d`), the theme's own ochre-as-text step, which
`tokens.test.ts` already documents for that role. Charcoal light is untouched
(reads 15.263 / 14.451 on the same pills). The default brand is untouched
entirely. Solid ochre fills are unaffected — G1 pointed those at `--ink-inverse`
directly.

### 3.3 Before → after, per node

| story | mode | node | before | after |
|---|---|---|---|---|
| `inputs-statuspill--dark-mode` | dark | Screening | `#161616` on `#342b1b` **1.294** | `#d4a66d` on `#342b1b` **6.308** |
| `inputs-statuspill--dark-mode` | dark | Interviewing | `#161616` on `#45351a` **1.530** | `#d4a66d` on `#45351a` **5.336** |
| `inputs-statuspill--all-stages` | light | ×2 | 15.263 / 14.451 | unchanged |
| `inputs-statuspill--with-chevron` | light | ×2 | 15.263 / 14.451 | unchanged |
| default brand, all cells | — | ×6 | 5.662–8.596 | unchanged |

One measured correction to the triage: its charcoal-light G4 figures (15.011 /
16.005 / 14.057) are the per-stop table, not the rendered story. Live, the pills
composite to `#f5ebd9` / `#f5e4c7` and read **15.263 / 14.451**. The dark row
matches the triage exactly.

**A note the triage could not have had:** two of the four consumers — Badge
`[data-tone="warning"]` and the open DatePicker trigger — are rendered by **zero
stories, in either mode** (swept across all 22 Badge/DatePicker/StatusPill/Chip
stories under charcoal). They are shipped states that no story-driven gate can
reach. See §6.4.

---

## 4. G5 — pinned surface, inherited ink · FIXED · commit `f1767f2`

`.ds-atom-richtext-surface .ProseMirror mark` pinned `background: #fef08a` and
delegated the foreground with `color: inherit`. Fixed to `var(--ink-inverse)`.

| story | brand | mode | before | after |
|---|---|---|---|---|
| `interaction-richtext--dark-mode` | charcoal | dark | `#eae7e0` on `#fef08a` **1.061** | `#161616` **15.550** |
| `--default` / `--read-only` / `--playground` | charcoal | light | `#1a1815` 15.223 | `#161616` **15.550** |
| `interaction-richtext--dark-mode` | **default** | dark | `#ededed` on `#fef08a` **1.006** | `#1c1917` **15.028** |
| `--default` / `--read-only` / `--playground` | default | light | `#1c1c1a` 14.666 | `#1c1917` **15.028** |

### 4.1 A triage claim falsified: G5 was never charcoal-specific

The triage states, with reasoning: *"under `brand: default` this same story is
clean at whole-document scope … measured, the default render produced zero
violations. So G5 is genuinely charcoal-specific rather than a latent bug the
charcoal sweep happened to reach first."*

The default brand measures **1.006:1 — worse than charcoal's 1.061.** The default
sweep is green for a reason nobody would guess: **axe-core refuses to judge a
ratio that rounds to 1.00.** It returns `incomplete` with
`messageKey: "equalRatio"`, and `checkA11y` fails only on `violations`. Charcoal's
1.061 rounds to 1.06 and becomes a violation; default's 1.006 rounds to 1.00 and
becomes an unreported `incomplete`.

Verified directly, same story, same instrument, both brands:

```
charcoal dark  #eae7e0 on #fef08a  contrastRatio 1.06  → VIOLATION   (messageKey null)
default  dark  #ededed on #fef08a  contrastRatio 1     → INCOMPLETE  (messageKey equalRatio)
```

So **one of the 25 "charcoal-specific" violations was a pre-existing default-brand
defect all along**, and the mechanism hiding it is a *third* blind spot: a defect
severe enough to round to 1.00 is invisible to the a11y gate **in every brand**.
This is the opposite of the intuition that near-miss cases are the ones that slip
through.

---

## 5. Baseline movement — measured, and much smaller than predicted

**Nothing was re-recorded.** The store is still **1,019 files, 0 modified**. The
three changed images are left changed-but-unrecorded for the developer to approve
at 01-20 Task 3.

Measured by running `storybook.spec.ts` alone per brand — the configuration the
triage established is where the known-flaky Tabs comparison passes. Both brands
completed all 504 captures (`captured 504, skipped 4 time-dependent`), so this is
a complete read, not a first-failure abort.

| baseline | brand | pixels | ratio | group |
|---|---|---|---|---|
| `inputs-statuspill--dark-mode--charcoal.png` | charcoal | 281 | 0.01 | G4 |
| `interaction-richtext--dark-mode--charcoal.png` | charcoal | 131 | 0.01 | G5 |
| `interaction-richtext--dark-mode.png` | default | 138 | 0.01 | G5 |

**Total: 3 of 1,019 (0.29%).** The triage priced G1+G4+G5 at 14 + 1 + 4 = **19
charcoal images and 4 default**, and its five-group union at 34.

### 5.1 Why G1 moved zero images despite changing 27 nodes in 14 stories

`#1c1917` → `#161616` is a per-channel delta of 6/3/1 on small dark text. At the
comparator's default threshold (0.2 YIQ) that is below the per-pixel tolerance in
every one of the 14 stories, so no pixel registers as different. G5's three light
stories are the same story (`#1a1815 → #161616`, `#1c1c1a → #1c1917`) and also did
not move.

So the correct expectation for Task 3 is **3 images to approve, not 19** — and all
three are dark-mode images with one obvious, attributable change each.

### 5.2 A caveat on how this was measured, worth recording

I first tried comparing at `threshold: 0` to enumerate every pixel-level
difference. That reports **133 default-brand baselines as differing**, including
`foundation-divider--default`, `inputs-textinput--default` and the whole
`feedback-skeleton--*` family — none of which any of these fixes can touch. At
zero tolerance the measurement is dominated by pre-existing renderer
nondeterminism (~26% of the default store), not by the change under test. The
authoritative instrument is the gate's own threshold, which is also what the
developer approves against. Recorded because it is a trap: a strict comparison
looks more rigorous and is in fact less informative, and it would have reported a
44× overstatement of this change's footprint.

---

## 6. Job 2 — what the gate cannot see, and the real number

Method: sweep all 508 stories under charcoal at **whole-document** scope with
`resultTypes: ["violations", "incomplete"]`, partition every reported node by
whether it lies inside `#storybook-root`, then re-measure every gate-invisible
node with the verified compositor. **The scoping was not changed** — this is a
parallel measurement, and `checkA11y` still reads `#storybook-root` and still
fails only on violations.

### 6.1 The instrument reproduces the triage exactly first

Restricting the sweep to *violations, in-root* — what the shipping gate sees —
returns **41 nodes across 25 stories**, with the triage's ratios (4.40, 4.45,
4.29, 3.81/1.92, 1.29/1.53, 1.06) and its 11-node DateRangePicker row. An
independent instrument landing on the same 25/41 is what makes the numbers below
credible.

### 6.2 The additional violations: 21 stories / 28 nodes

Nodes that are measurably below their AA floor and that the gate **never fails
on**, on the pre-fix tree:

| # | story | mode | nodes | ratios | mechanism |
|---|---|---|---|---|---|
| 1 | `feedback-toast--tones` | light | 1 | 3.82 | portal scope |
| 2 | `feedback-toast--dark-mode` | dark | 1 | 1.09 | portal + `elmPartiallyObscured` |
| 3 | `inputs-daterangepicker--default` | light | 2 | 4.40 | `pseudoContent` |
| 4 | `inputs-daterangepicker--dark-mode` | dark | 2 | 4.40 | `pseudoContent` |
| 5 | `data-display-tabs--with-counts` | light | 1 | 4.46 | `pseudoContent` |
| 6–12 | `data-display-table--` ×7 (`default`, `dark-mode`, `density-comfortable`, `density-cozy`, `density-spacious`, `playground`, `sticky-header`) | mixed | 7 | 3.60–3.80 | `incomplete`, no key |
| 13–14 | `display-rollingnumber--counter-dark`, `--counter-light` | mixed | 5 | 2.45–3.23 | `shortTextContent` |
| 15–16 | `inputs-fileinput--dropzone`, `--dropzone-pdf-only` | light | 2 | 3.77 | `shortTextContent` |
| 17–19 | `patterns-wizard--three-step-form`, `--two-step-no-validation`, `--vertical-orientation` | light | 3 | 3.52 | `shortTextContent` |
| 20–21 | `layout-splithero--default`, `--narrow-aside` | light | 4 | 2.06–3.01 | `bgGradient` |

**By mechanism:** portal scope 2 · pseudo-element background 3 · axe `incomplete`
with no key 7 · `shortTextContent` 7 · `bgGradient` 2.

Two of these are worth naming as findings in their own right because they are
*component* defects, not story artefacts, and both are the same root cause as a
deferred group:

- **`.ds-atom-table-sort-indicator`** — `font-size: 9px; color: var(--amber)`. In
  charcoal `--amber` is `--ochre` `#b0722a`, so this is **`--ochre` used as TEXT**,
  which charcoal's own documentation calls *"a FILL, never text"*. 3.775–3.796
  across 7 Table stories. **This is G3's root cause, and by story count it is
  larger than G3's Card case.** axe returns `incomplete` with no `messageKey`, so
  the gate has never failed on it.
- **`patterns-wizard--*` step marker** — `#f4f1ea` (near-white) on `#b0722a` at
  11px/700 = **3.522**. The G1 defect in the opposite direction: light ink on
  ochre reaches only 3.522, where G1's dark `#161616` reaches 4.555. Confirms the
  fix direction G1 chose was the correct one of the two.

### 6.3 The undecidable tail, stated honestly as a range

**52 nodes across 18 stories** have a gradient or image backdrop that *neither*
axe *nor* this compositor can resolve. Claiming a number for them would be the
same defect as axe claiming a pass. They are Carousel, StickyNote, Calendar,
InfiniteList, Avatar and MiniDonut, and they could contribute anywhere from 0 to
18 further failing stories.

**So the answer to "how many more than 25":**

> **21 additional stories are measurably failing (28 nodes), with an undecidable
> tail of up to 18 more. The true charcoal contrast-failure count on the pre-fix
> tree is therefore between 46 and 64 stories, against a published figure of 25.**
>
> After G1/G4/G5, the gate reports 11 and the measurable-but-invisible set is 19
> stories / 24 nodes — so the honest post-fix figure is **30 to 48**, not 11.

**Recommendation for the changelog:** do not write "25 known violations". Write
something the measurement supports, e.g. *"25 violations reported by the a11y
gate; the gate is scoped to `#storybook-root` and does not fail on axe's
`incomplete` results, and a whole-document sweep finds at least 21 more."*

### 6.4 A fourth blind spot the triage did not have: story coverage

Two shipped states that fail in charcoal dark are rendered by **no story at all**:

- `.ds-atom-badge[data-tone="warning"]` — 1.30:1 before this fix
- `.ds-atom-datepicker-trigger.is-open` — 1.09:1 before this fix

Swept across all 22 Badge/DatePicker/StatusPill/Chip stories under charcoal: zero
occurrences in either mode. These are outside the 508 entirely, so **no
story-driven instrument — axe's, the visual store's, or mine — can reach them**,
at any scope and with any bucket included. This is a coverage bound rather than an
instrument bound, and in principle it is the largest of the four, because the
a11y gate can only ever see states some story renders.

Both are fixed as a side effect of G4 (§3.2), which is the only reason they were
found: the token census went looking for consumers, not stories.

### 6.5 Did G1 reach the two `incomplete` DateRangePicker endpoints? Yes — proven causally

They are `.is-range-start` / `.is-range-end`, they inherit their ink from
`.is-selected`, and their ochre pill is painted by a `::before`, which is why axe
reports *"background could not be determined due to a pseudo element"* and never
judges them.

- **Measured:** `#1c1917` on `#b0722a` **4.402 → 4.555**, 4 nodes across
  `inputs-daterangepicker--default` and `--dark-mode`, with the prober correctly
  identifying `button::before` as the real backdrop.
- **Proven, not inferred:** re-stranding **only** the DatePicker declaration turns
  **6 DateRangePicker nodes** red in the new spec while leaving SplitButton green
  (§7.1, control B). That is a controlled experiment establishing the causal link,
  rather than an argument from the cascade.

So the G1 fix reaches 4 nodes / 2 stories that the gate cannot observe in either
direction. It does **not** fix `inputs-daterangepicker--default`'s 11 `.is-in-range`
violations, which are G2 and remain.

---

## 7. Gates, and the three-way proof for each new one

Three specs were added, one per group. All three follow the
`tabs-label-contrast.spec.ts` precedent the triage names, take no screenshots, and
so add nothing to the baseline store.

### 7.1 `accent-ink-contrast.spec.ts` (G1) — 4 cells × 18 stories

Asserts four things, none sufficient alone: the composited ratio; that the
backdrop **is** the brand accent; that at least two **pseudo-painted** fills were
reached; and **per-declaration** node counts.

| proof | result |
|---|---|
| **FAILS pre-fix** | 4/4 cells red, every node at exactly `#1c1917 on #b0722a = 4.402` |
| **Control A** — re-strand *only* SplitButton | red on `interaction-splitbutton` **only** (34 node mentions); DatePicker green |
| **Control B** — re-strand *only* DatePicker | red on `inputs-datepicker` (9) **and `inputs-daterangepicker` (6)** only; SplitButton green |
| **PASSES shipped** | 4/4 green. Counts: 8/8/6 light, 9/9/9 dark, viaPseudo 2 light / 4 dark |

Both controls were proven to have actually mutated the file (sha changed, 2 changed
lines vs the fixed version) before their results were believed — three controls in
an earlier plan measured an unmodified file.

**Walk-through attempts:**

- Replace the primary selector with a class that does not exist → **first version
  left both DARK cells green**, because DatePicker nodes alone cleared the single
  total. Fixed by making the floors per-declaration; now **4/4 cells red** with
  *"no split-primary node was measured in this cell"*.
- Make the `::before` pill `transparent` → red, *"no accent fill painted by a
  pseudo-element was measured"*.
- **Nudge `--ochre` darker instead of fixing the ink** — the repair
  `check-contrast.mjs` exists to reject → red, because the backdrop must composite
  to `#b0722a` exactly.

### 7.2 `tinted-pill-ink.spec.ts` (G4) — 4 cells × 6 stories

Asserts the composited ratio, that the fill is **still translucent**, that both
stages and ≥2 distinct backdrops were reached, and — carrying most of the weight —
the resolved **`--amber-ink` per cell**, which is the only coverage Badge and the
open DatePicker trigger have (§6.4).

| proof | result |
|---|---|
| **FAILS pre-fix** | red; charcoal dark 1.294 / 1.530 |
| **Control** — revert the dark alias to `--ink-inverse` | red on the token assertion |
| **Control** — change the **light** block too (over-broad theme edit) | **red**, and only the light-cell token assertion can see it: light already passes at 15:1, so the ratio assertions alone would have let it through |
| **Control** — make the pill fill opaque (ratio would pass) | red, *"the pill fill is no longer translucent … stopped measuring the tint-composited case"* |
| **PASSES shipped** | 4/4 green. 4 pills / 2 stories light; 6 pills / 3 stories dark across **4 distinct backdrops** |

Floors were set from **measurement**, not estimate — the first version guessed 6
pills per cell and failed on the light cells, which have 4.

**The `offer` precedent was measured before being copied, and rejected.** The
adjacent `.dark …[data-stage="offer"]` rule uses `color: var(--green)`, so the
obvious move was `var(--amber)`. That measures **2.765–3.868** on these composited
tints and would have shipped a fix that matched the local precedent and still
failed.

### 7.3 `pinned-surface-ink.spec.ts` (G5) — 2 brands × 4 stories × 2 modes

Asserts the ratio, that the background is still the pinned literal, and — the
assertion that carries the weight — that **the ink does not differ between light
and dark**. Stated as a comparison rather than a threshold, so the defect fails for
the reason it is wrong.

| proof | result |
|---|---|
| **FAILS pre-fix** | red in **both** brands: *"ink moved between modes (light `#1a1815` vs dark `#eae7e0`)"* and *"(light `#1c1c1a` vs dark `#ededed`)"* |
| **Control** — pin the ink to the mode-flipping `var(--ink)` | red, even though the light-mode ratio still passes |
| **Control** — unpin the background (`var(--cream-3)`) | red, *"no longer measuring a pinned surface"* |
| **PASSES shipped** | 2/2 green |

The pre-fix run failing in the **default** brand is the point: axe reports only
`incomplete` there, so this spec catches a defect the a11y gate cannot (§4.1).

### 7.4 Gate results — all from `5fb2ce4`, each run separately

| gate | exit | result |
|---|---|---|
| `npm run build` | **0** | full `tsup` build, 474 artifacts |
| `npm test` | **0** | **1,946 passed / 123 files** |
| `npm run check` | **0** | Biome, 379 files |
| `npm run typecheck` | **0** | both tsconfigs |
| `npm run css:check` | **0** | **79 files, round-trip byte-exact** |
| `npm run test:a11y` | **0** | **508 passed / 84 suites** (default brand) |
| `npm run test:visual` | **1** | 135 passed / 2 failed / 1 did not run, of 138 |

Informational:

| | exit | |
|---|---|---|
| `DS_BRAND=charcoal npm run test:a11y` | **1** | **11 failed / 497 passed, 4 suites** (was 25 / 483, 8 suites) |

The charcoal run is the independent confirmation of the headline: the 11 remaining
failures are `Feedback/AlertBanner` ×3, `Inputs/DateRangePicker > Default`,
`Layout/AppBar` ×6, `Surfaces/Card > StatCard` — **exactly G2 (4) + G3 (7)**, with
nothing else left behind.

**`npm test` went red once during this work, at 1945/1946**, and that is recorded
rather than smoothed over: `tokens.test.ts` caught G4's first implementation
referencing a charcoal-only token from `primitives.css` (§3.1). It is green at
1946/1946 on the shipped tree.

**`test:visual`'s two failures:**

1. `storybook.spec.ts › default brand` — `interaction-richtext--dark-mode`,
   138 px. **This is mine**, and it is G5's expected default-brand baseline
   movement (§5).
2. `richtext-marks.spec.ts › bolding a phrase emits bold-only markdown, not HTML`
   — **not mine.** It passes **15/15 in isolation**, and its body exercises
   keyboard input and markdown serialization with zero references to `mark`,
   `color` or `highlight`; none of the four declarations changed here can affect
   it. Same F-20-4 suite-state pattern as `sortable-announce.spec.ts`.

The known-flaky `data-display-tabs--narrow-overflow--charcoal` did **not** appear:
serial mode skipped the charcoal capture after the default failure, and when
`storybook.spec.ts` was run alone per brand it flagged only the three baselines in
§5 — consistent with the triage's finding that it passes in that configuration. It
was not chased and not re-recorded.

---

## 8. G2 and G3 — deliberately open, with the triage's reasons intact

Both are **untouched**. Neither is deferred for effort; both are deferred because
the decision is not the executor's to take.

### G2 — charcoal flattens the pale `--amber-l` onto the mid-tone `--ochre`

**4 violations · 2 components · 17 nodes · ratios 1.921 to 4.460.** Still failing:
`feedback-alertbanner--tones`, `--with-description`, `--non-dismissible`, and
`inputs-daterangepicker--default`'s 11 `.is-in-range` cells.

**It needs a theme decision, not an edit.** Charcoal deliberately maps five amber
steps onto one ochre value, and G2 is that decision meeting consumers that
depended on the steps being distinct. Every candidate repair is load-bearing:
inventing a genuine pale-ochre step **adds a value to the theme's public token
surface** in a beta whose changelog is written; retargeting consumers to
`--amber-ink` **moves default-brand baselines** (`#292524 → #92400e` is a visible
hue change) and leaves DateRangePicker, which has no literal to swap, unfixed at
4.460; nudging `--ochre` darkens the brand's identity to pass a lint, which
`check-contrast.mjs` exists to reject. A group spanning 1.921 to 4.460 cannot be
resolved by moving one value.

Two things this work adds to G2's file: the Toast row (§1.1) is arithmetically the
same colour pair as the AlertBanner title, and `data-display-tabs--with-counts` at
**4.460** (§6.2) is the same `#1a1815`-on-`#b0722a` pairing as the DateRangePicker
in-range cells — so G2 is at least one story wider than the triage recorded, in a
place axe cannot see.

### G3 — `--ochre` used as TEXT on a pinned near-black surface

**7 violations · 2 components · 7 nodes · 4.296 and 4.402.** Still failing:
`layout-appbar--*` ×6 and `surfaces-card--stat-card`.

**It needs a mode-independent "accent on near-black" token that charcoal does not
have.** `--ochre-d` is `#8c591f` in light — darker, and worse — and `#c6883a` in
dark, so there is no existing step that works in both. Adding one is the same
public-surface change as G2's first option. Mitigating factor, unchanged: the
`DefaultLogo` chip is a fallback rendered only when a consumer passes no `logo`
prop, and every real consumer passes one.

This work adds one item to G3's file that raises its priority: the **Table sort
indicator** (§6.2) is `--ochre` as 9px text across **7 stories** at 3.775–3.796,
which is the same root cause in shipped component code that real consumers *will*
render — unlike `DefaultLogo`. G3's cost-of-delay is no longer close to zero.

---

## 9. Process notes

- **Restores.** Every mutation for a negative control was restored from a `cp`
  backup and confirmed with `shasum`. `src/themes/charcoal.css` was verified
  byte-identical to `HEAD` two independent ways after each control.
- **One deviation to record.** During the first walk-through I used
  `git checkout-index -f -- src/themes/charcoal.css` to restore a mutated file.
  That is in the `git checkout` family and I should have used the `cp` backup.
  No harm resulted — the file was verified identical to `HEAD` immediately
  afterwards, and the intended inverse edit was in place as well — but it was the
  wrong instrument and every later restore used `cp`.
- **No `git stash`, `reset --hard`, `clean` or `worktree`** was run. `husky`/
  `lint-staged` runs its own `git stash` on each commit; that is expected tooling
  and appears in the commit output.
- **Storybook on :6006 was already running and was reused, never killed.**
- Baselines: **1,019 files, 0 modified.** 170 renames pending, unapplied.
  `package.json` at **1.11.4**. Nothing published, tagged or merged. 01-20 Task 3
  untouched.

## 10. Commits

| commit | contents |
|---|---|
| `7b3d25d` | G1 — two declarations to `var(--ink-inverse)`, + `accent-ink-contrast.spec.ts` |
| `2641744` | G4 — first implementation (a `.dark` override in `primitives.css`), + `tinted-pill-ink.spec.ts` |
| `f1767f2` | G5 — `mark` ink pinned, + `pinned-surface-ink.spec.ts` |
| `5fb2ce4` | G4 — moved to charcoal's dark `--amber-ink` after two existing gates rejected the first implementation; spec updated to assert the token contract |

`2641744` is left in history rather than squashed, because the record that
`tokens.test.ts` and the `charcoal.css` two-block contract caught a wrong
implementation is worth more than a clean sequence.
