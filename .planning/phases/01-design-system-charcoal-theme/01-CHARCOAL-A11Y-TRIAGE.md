# Charcoal a11y triage — the 25 violations, grouped by root cause

**Status: triage only. Nothing here is fixed.** This document exists because
"25 violations across 8 components" is a number, not a plan, and the first
question — whether those eight components share one defect or have eight — has a
measured answer: **five root causes, and the largest accounts for 12 of the 25.**

Upstream: `01-20-SUMMARY.md` §3.3 (F-20-2), which produced the first charcoal
accessibility measurement that has ever existed in this repository.
`$DS` commit `827f860`, branch `charcoal-theme`.

---

## 0. What is being counted, and how the two numbers relate

Three different counts circulate for the same finding. All three are correct and
they measure different things:

| unit | count | what it is |
|---|---|---|
| **failing tests / stories** | **25** | jest cases that failed under `DS_BRAND=charcoal npm run test:a11y`. Each carries exactly **one** `color-contrast` rule violation. This is the 25 in "25 violations". |
| **axe rule violations** | **25** | one per story — every failure in the set is the same rule, `color-contrast`, `impact: serious`. So violations and failing stories are 1:1 here. |
| **axe nodes** | **41** | individual DOM elements cited across those 25 violations. axe groups nodes under a rule, so one violation can name eleven elements — `inputs-daterangepicker--default` does. |

`25 stories → 25 violations → 41 nodes`. **Nothing grew**; 41 is a finer unit
than 25, not a larger version of it. The table in §2 has **one row per
violation** (25 rows) and states each row's node count.

**There is also a 26th violation that the gate finds and then throws away.** See
§5.1 — it is a gate-scoping defect, not a new component failure, and it is
deliberately excluded from the 25.

---

## 1. How these numbers were measured, and why they can be trusted

Every ratio below was measured **twice, by two independent implementations**, and
all **41 nodes agree**:

1. **axe-core 4.x**, via `checkA11y` in `.storybook/test-runner.ts`, scoped to
   `#storybook-root` — the shipping gate.
2. **A hand-written compositor**, run against the same live render in the same
   browser, resolving each element's foreground and backdrop independently.

Agreement between a measurement and itself proves nothing — this phase has been
caught by that repeatedly. Agreement with an *independent* implementation is what
makes the table trustworthy, so the second implementation was itself verified
before its output was used:

### 1.1 The compositor was verified against a known-good value first

The known-good is the Tabs case from 01-19/01-20, which recorded the inactive
pill label at **4.882 / 4.473 / 3.851** over `--cream` / `--cream-2` /
`--cream-3` — `--surf-2` (`rgba(255,255,255,0.055)`) composited over the default
brand's three dark stops, with `--ink-3` `#919191` on top.

| stop | value | composited | ratio | recorded | |
|---|---|---|---|---|---|
| `--cream` | `#181818` | `#252525` | **4.882** | 4.882 | MATCH |
| `--cream-2` | `#1f1f1f` | `#2b2b2b` | **4.473** | 4.473 | MATCH |
| `--cream-3` | `#2a2a2a` | `#363636` | **3.851** | 3.851 | MATCH |

Reproducing one of three could be luck; reproducing the ordered triple could
not. Three further checks, because a compositor that agrees on one case can
still be broken:

- **Negative control — alpha ignored** gives `5.634 / 5.230 / 4.554`. Visibly
  different at every stop, so the check distinguishes a correct compositor from
  the exact defect it exists to catch (the one that once read **2.020** where the
  composited truth was **1.114**).
- **Hex parsing asserted directly**, not inferred from a ratio. The first version
  of this compositor could only parse `rgb()`; fed `#1e1e1d` its regex returned
  `rgb(1,1,1)` and fed `#161616` it returned `rgb(161616,0,0)`. It produced
  plausible-looking per-surface numbers that were garbage. That is why §3's
  per-surface figures are computed by the *verified* compositor and not by the
  first one.
- **`parse()` throws on an unparseable colour** rather than returning zeros. A
  parser that silently returns black turns every ratio into a confident lie —
  this is the `luminance()`-returns-`NaN` shape that made `ratio < 4.5` always
  false in an earlier plan.

### 1.2 The brand was asserted at the probed element, both halves

Per story, and per the rule that `--ochre` once read *correctly* at a node whose
*neutrals* were shadowed underneath it:

- `<html data-brand>` = `charcoal` — **26/26 stories**
- `--ochre` = `#b0722a` at the **deepest** node of `#storybook-root` (charcoal-only
  token, so the brand layer provably reaches that node) — **26/26**
- `--cream` = charcoal's own value at that same node (`#f4f1ea` light /
  `#161616` dark), and **not** the design system's (`#fcfcfc` / `#181818`) —
  **26/26**

The probe boots `iframe.html` **with a story id**. Without it Storybook
discards the `globals` query parameter, which is how a 508-story charcoal sweep
once passed while rendering the default brand.

### 1.3 The same 26 stories were probed under the default brand

**All 26 are clean under `brand: default` — 0 violations, whole-document scope
included.** So:

- **None of the 25 is a pre-existing default-brand defect** that charcoal merely
  exposed. Every one is charcoal-specific. The number is not inflated by
  inherited bugs, and it cannot be waved away as "already broken".
- Conversely, the charcoal sweep is not finding *phantom* failures: the same
  instrument, same stories, same scope, returns zero when the brand is off.

---

## 2. The 25 violations, one row per violation

All 25 are `color-contrast`, `impact: serious`, WCAG 2 AA SC 1.4.3. Every row
requires **4.5:1** — none of the offending text qualifies as "large" (large is
≥24px normal or ≥18.66px bold; the largest here is 14px normal and the only bold
entries are 13px and 11px).

`fg` / `bg` are the **composited** values. `grp` is the root-cause group from §3.

| # | grp | component | story id | mode | offending element | nodes | fg | bg | ratio | needs |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | G1 | Interaction/SplitButton | `interaction-splitbutton--default` | light | `.ds-atom-split-primary > span` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 2 | G1 | Interaction/SplitButton | `interaction-splitbutton--tones` | light | `.ds-atom-split-primary[data-variant="primary"] > span` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 3 | G1 | Interaction/SplitButton | `interaction-splitbutton--variants` | light | `.ds-atom-split-primary[data-variant="primary"] > span` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 4 | G1 | Interaction/SplitButton | `interaction-splitbutton--per-action-variant` | light | `.ds-atom-split-primary > span` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 5 | G1 | Interaction/SplitButton | `interaction-splitbutton--sizes` | light | `.ds-atom-split-primary[data-size="sm\|md\|lg"] > span` | **3** | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 6 | G1 | Interaction/SplitButton | `interaction-splitbutton--with-icons` | light | `.ds-atom-split-primary > span:nth-child(2)` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 7 | G1 | Interaction/SplitButton | `interaction-splitbutton--dark-mode` | **dark** | `.ds-atom-split-primary[data-variant="primary"] > span` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 8 | G1 | Inputs/DatePicker | `inputs-datepicker--default` | light | `.is-selected > .ds-atom-datepicker-cell-num` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 9 | G1 | Inputs/DatePicker | `inputs-datepicker--with-events` | light | `.is-selected > .ds-atom-datepicker-cell-num` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 10 | G1 | Inputs/DatePicker | `inputs-datepicker--with-time-picker` | light | `.is-selected > .ds-atom-datepicker-cell-num` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 11 | G1 | Inputs/DatePicker | `inputs-datepicker--playground` | light | `.is-selected > .ds-atom-datepicker-cell-num` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 12 | G1 | Inputs/DatePicker | `inputs-datepicker--dark-mode` | **dark** | `.is-selected > .ds-atom-datepicker-cell-num` | 1 | `#1c1917` | `#b0722a` | **4.402** | 4.5 |
| 13 | G2 | Feedback/AlertBanner | `feedback-alertbanner--tones` | light | `.ds-atom-banner-title` + `.ds-atom-banner-desc` | **2** | `#292524` / `#57534e` | `#b0722a` | **3.819** / **1.921** | 4.5 |
| 14 | G2 | Feedback/AlertBanner | `feedback-alertbanner--with-description` | light | `.ds-atom-banner-title` + `.ds-atom-banner-desc` | **2** | `#292524` / `#57534e` | `#b0722a` | **3.819** / **1.921** | 4.5 |
| 15 | G2 | Feedback/AlertBanner | `feedback-alertbanner--non-dismissible` | light | `.ds-atom-banner-title` + `.ds-atom-banner-desc` | **2** | `#292524` / `#57534e` | `#b0722a` | **3.819** / **1.921** | 4.5 |
| 16 | G2 | Inputs/DateRangePicker | `inputs-daterangepicker--default` | light | `.is-in-range > .ds-atom-datepicker-cell-num` ×11 | **11** | `#1a1815` | `#b0722a` | **4.460** | 4.5 |
| 17 | G3 | Layout/AppBar | `layout-appbar--default` | light | `DefaultLogo` chip (inline style) | 1 | `#b0722a` | `#1c1c1a` | **4.296** | 4.5 |
| 18 | G3 | Layout/AppBar | `layout-appbar--minimal` | light | `DefaultLogo` chip | 1 | `#b0722a` | `#1c1c1a` | **4.296** | 4.5 |
| 19 | G3 | Layout/AppBar | `layout-appbar--with-search` | light | `DefaultLogo` chip | 1 | `#b0722a` | `#1c1c1a` | **4.296** | 4.5 |
| 20 | G3 | Layout/AppBar | `layout-appbar--centered` | light | `DefaultLogo` chip | 1 | `#b0722a` | `#1c1c1a` | **4.296** | 4.5 |
| 21 | G3 | Layout/AppBar | `layout-appbar--scrolled` | light | `DefaultLogo` chip | 1 | `#b0722a` | `#1c1c1a` | **4.296** | 4.5 |
| 22 | G3 | Layout/AppBar | `layout-appbar--dark-mode` | **dark** | `DefaultLogo` chip | 1 | `#b0722a` | `#1c1c1a` | **4.296** | 4.5 |
| 23 | G3 | Surfaces/Card | `surfaces-card--stat-card` | light | `[data-variant="dark"] > div:nth-child(3)` | 1 | `#b0722a` | `#1c1917` | **4.402** | 4.5 |
| 24 | G4 | Inputs/StatusPill | `inputs-statuspill--dark-mode` | **dark** | `[data-stage="screening"]` + `[data-stage="interviewing"]` | **2** | `#161616` | `#342b1b` / `#45351a` | **1.294** / **1.530** | 4.5 |
| 25 | G5 | Interaction/RichText | `interaction-richtext--dark-mode` | **dark** | `.ProseMirror mark` | 1 | `#eae7e0` | `#fef08a` | **1.061** | 4.5 |

**Totals: 25 violations · 8 components · 41 nodes · 6 dark-mode stories, 19 light.**

Two things this table makes visible that a per-component count hides:

- **`#b0722a` — `--ochre` — is on one side of every single row.** All 25 are the
  accent meeting text. There is no violation anywhere in the set that does not
  involve the brand's accent colour.
- **19 of 25 are LIGHT-mode failures.** The instinct that a new dark theme's
  problems are dark-mode problems is wrong here.

---

## 3. Grouped by root cause

Five groups. They partition the set exactly: **12 + 4 + 7 + 1 + 1 = 25**
violations, **2 + 2 + 2 + 1 + 1 = 8** components, **14 + 17 + 7 + 2 + 1 = 41**
nodes.

### The hypothesis, settled

The specific defect to test first was the one `004254f` fixed in Tabs:
`color: #1c1917` hardcoded, where `#1c1917` **is** the default brand's
`--ink-inverse`, so `[data-brand="charcoal"]` can never override it — measured at
**4.402:1** on `--ochre`.

**It accounts for 2 of the 8 components, 12 of the 25 violations, and 14 of the
41 nodes.** Not eight. It is by far the largest group — nearly half the set, and
the cheapest to fix — but **six components have five other causes**, so this is
not one shared root cause repeated eight times.

There is, however, a real generalisation, and it is worth more than the literal
hex: **every one of the five groups is a colour decision taken against the
default brand's palette and expressed in a form `[data-brand="charcoal"]` cannot
reach** — a hex literal (G1, G2, G3, G5), an alias flattened by the accent
bridge (G2), or a token used outside its documented role (G3, G4). Five distinct
repairs, one recurring mistake.

---

### G1 — hardcoded `#1c1917` on a `var(--amber)` fill · 12 violations · 2 components · 14 nodes

**Identical to the Tabs bug fixed by `004254f`, same hex, same 4.402:1.**

| location | selector | declaration | stories |
|---|---|---|---|
| `src/primitives.css:2869-2872` | `.ds-atom-split-primary[data-variant="primary"], .ds-atom-split-chevron[data-variant="primary"]` | `background: var(--amber);` `color: #1c1917;` | 7 |
| `src/primitives.css:2511-2517` | `.ds-atom-datepicker-cell.is-selected` | `background: var(--amber);` `color: #1c1917;` | 5 |

Both fills bridge correctly — charcoal maps `--amber: var(--ochre)` = `#b0722a`.
Only the ink is stranded. The DatePicker rule even carries a comment explaining
the pin as a "handoff invariant… `--ink` would flip to cream in dark mode",
which is a correct observation about `--ink` and the wrong conclusion: the token
that means "ink that stays dark on an accent fill in both modes" already exists
and is `--ink-inverse`.

**The fix is the one `004254f` already validated:** `#1c1917` →
`var(--ink-inverse)`. Charcoal declares `--ink-inverse: #161616` in **both**
mode blocks, which measures **4.56:1** on `#b0722a` — clears AA.

---

### G2 — charcoal flattens the pale `--amber-l` tint onto the mid-tone `--ochre` · 4 violations · 2 components · 17 nodes

**The most consequential group, and the only one that is a theme-design question
rather than a code slip.**

In the default brand `--amber-l` is `#fef3c7` — a *pale wash*, used as a surface
under dark text. Charcoal's accent bridge maps **five** amber steps onto one
value:

```css
--amber-l:     var(--ochre);   /* #b0722a */
--amber-soft:  var(--ochre);
--amber-vivid: var(--ochre);
--amber-warm:  var(--ochre);
--amber:       var(--ochre);
```

So every consumer that relied on "`--amber-l` is a pale tint I can put dark text
on" gets a mid-tone fill instead. The bridge preserves *hue* and destroys
*lightness role*.

| location | selector | declaration | ratio |
|---|---|---|---|
| `src/primitives.css:1918-1932` | `.ds-atom-banner[data-variant="warning"]` + `-title` / `-desc` | `background: var(--amber-l);` `color: #292524;` / `#57534e;` | 3.819 / **1.921** |
| `src/primitives.css:2518-2521` | `.ds-atom-datepicker-cell.is-in-range` | `background: var(--amber-l);` numeral inherits `var(--ink)` | 4.460 |

The AlertBanner rule's own comment is the clearest statement of the broken
premise: *"Warning text must always be dark — amber-l bg (#fef3c7) is light"*.
It names the default brand's hex as the justification. Under charcoal that
premise is false.

`.ds-atom-banner-desc` at **1.921:1** is the second-worst reading in the whole
set. This is not a near-miss.

DateRangePicker is the *same surface cause* with a token ink rather than a
literal one: nothing is hardcoded, `var(--ink)` is charcoal's own `#1a1815`, and
it still lands at **4.460** — missing 4.5 by **0.04**. A group whose members
range from 1.921 to 4.460 cannot be resolved by nudging one value.

---

### G3 — `--ochre` used as TEXT on a pinned near-black surface · 7 violations · 2 components · 7 nodes

The inverse of G1: here the **background** is the hex literal and the
**foreground** is the brand-controlled token. Charcoal's own documentation states
the invariant this breaks — `--ochre` is *"a FILL, never text"*.

| location | code | ratio |
|---|---|---|
| `src/layout/AppBar/index.tsx:25-47` (`DefaultLogo`) | inline `background: "#1c1c1a"` + `color: "var(--amber)"`, 13px **weight 800** | 4.296 |
| `src/primitives.css:1122-1127` + story inline | `.ds-atom-card[data-variant="dark"] { background: #1c1917 }` + `color: var(--amber)` at 11px | 4.402 |

`DefaultLogo`'s comment is again a default-brand measurement used as a
cross-brand guarantee: *"pinning the chip keeps amber at 8.1:1 in both themes"*.
True for `--amber` `#f59e0b`; charcoal's `--ochre` `#b0722a` is far darker, and
8.1 becomes 4.296.

**This group is a token gap, not a typo.** The chip is pinned dark in *both*
modes, so it needs an "accent on near-black, mode-independent" step. Charcoal has
no such token: `--ochre-d` is `#8c591f` in light (darker — worse) and `#c6883a`
in dark. Fixing G3 properly means **adding a token to the theme's public
surface**, which is why §6 flags it as not-before-beta.

---

### G4 — `--amber-ink` collapsed to one dark value across modes, then used on a low-alpha tint · 1 violation · 1 component · 2 nodes

**The worst-measuring group after G5, and the only one whose ratio is
page-dependent.**

`src/primitives.css:6612-6620`:
```css
.ds-atom-statuspill[data-stage="screening"]    { background: rgba(245,158,11,0.10); color: var(--amber-ink); }
.ds-atom-statuspill[data-stage="interviewing"] { background: rgba(245,158,11,0.18); color: var(--amber-ink); font-weight: 700; }
```

Two independent problems compound:

1. The tint is a **hardcoded amber rgba** that bypasses the bridge entirely — the
   `--amber*` family is mapped to ochre and this declaration ignores it. Same
   family as F-20-1.
2. `--amber-ink` differs by **brand and mode**. The default brand declares
   `#92400e` light and **`#f5c56b` dark** — a *light* ink for dark surfaces.
   Charcoal declares `--amber-ink: var(--ink-inverse)` = **`#161616` in both
   modes**, with the documented rationale *"it is the ink ON an ochre fill, and
   --ochre does not change between modes."* That is correct for a **solid**
   ochre fill and catastrophic for a **10%** tint, where the composited surface
   is essentially the page.

There is no `.dark` override for these two stages (only `offer` has one), so
dark mode gets the dark ink.

**Per-surface, computed with the verified compositor.** This is the only
violation in the set whose backdrop is translucent, so the only one where the
ratio depends on which stop it lands on — and it **fails on all three**:

| cell | stage | over `--cream` | over `--cream-2` | over `--cream-3` |
|---|---|---|---|---|
| **charcoal dark** | screening | `#2c2415` **1.178** | `#342b1b` **1.294** | `#393021` **1.397** |
| **charcoal dark** | interviewing | `#3e2e14` **1.391** | `#45351a` **1.530** | `#4a3a1f` **1.648** |
| charcoal light | screening | 15.011 | 16.005 | 14.057 |
| charcoal light | interviewing | 14.232 | 15.104 | 13.393 |
| default dark | screening | 9.354 | 8.596 | 7.449 |
| default dark | interviewing | 7.916 | 7.275 | 6.341 |
| default light | screening | 6.416 | 6.165 | 5.823 |
| default light | interviewing | 6.044 | 5.823 | 5.522 |

The story renders on `--cream-2`, giving 1.294 / 1.530 — which is exactly what
axe and the in-browser probe independently reported. **No surface rescues it**:
the verdict is stop-independent even though the magnitude is not. And the
`charcoal light` row is the same declaration passing at 15:1, which is what makes
this a mode collapse rather than a bad colour.

**The other 40 nodes have opaque backdrops and therefore deterministic ratios**,
which makes them simpler to reason about than the Tabs bug was — Tabs was
page-dependent (4.882 / 4.473 / 3.851) and passed on the page while failing on
both raised surfaces. Only G4 has that property here.

---

### G5 — a hardcoded highlight colour with `color: inherit` · 1 violation · 1 component · 1 node

`src/primitives.css:5021-5026`:
```css
.ds-atom-richtext-surface .ProseMirror mark { background: #fef08a; color: inherit; }
```

A pinned pale-yellow highlight with **inherited** text colour. In dark mode the
inherited ink is charcoal's near-white `--ink` `#eae7e0`, giving **1.061:1** —
**the worst reading in the entire set. The highlighted word is invisible.**

Why the default brand passes here is worth stating, because it is not luck:
under `brand: default` this same story is clean at whole-document scope. The
default brand's dark `--ink` composites differently against `#fef08a` in the
surrounding RichText surface cascade; measured, the default render produced zero
violations. So G5 is genuinely charcoal-specific rather than a latent bug the
charcoal sweep happened to reach first.

The declaration pins a background and delegates the foreground — the one
combination that cannot be safe across modes.

---

## 4. Fix estimate per group

Line and file counts are the shipped-source edit only, excluding tests,
changelog and baselines.

Baseline movement is measured, not estimated: a sweep of **all 508 stories under
charcoal** counted which stories actually contain each group's affected DOM. A
fix moves exactly those stories' baselines. See §4.1 for the measured surface
and §4.2 for the resulting counts.

**Key asymmetry the developer needs before Task 3:** whether a fix moves
**default-brand** baselines as well as charcoal ones depends entirely on whether
the replacement token resolves to the *same hex* in the default brand.

| group | replacement | default value | old literal | default baselines move? |
|---|---|---|---|---|
| **G1** | `var(--ink-inverse)` | `#1c1917` | `#1c1917` | **NO — byte-identical** |
| **G2** | `var(--amber-ink)` | `#92400e` | `#292524` / `#57534e` | **YES** |
| **G3** | new token | — | `#1c1c1a` | **YES** if the chip changes |
| **G4** | `.dark` override | — | — | **NO** if scoped to charcoal-dark |
| **G5** | explicit `color` | — | `inherit` | **YES** unless charcoal-scoped |

**G1 is the only group that is provably free of default-brand pixel movement**,
because the token it introduces resolves to the exact hex it replaces. That, and
not just its size, is why it is first in §6.

---

## 5. Severity read — honest in both directions

### 5.1 A 26th violation the gate finds and discards — `feedback-toast--tones`

`.storybook/test-runner.ts` calls `checkA11y(page, "#storybook-root")`. **Toast
renders through a portal to `document.body`, outside that scope.** The run log
shows Storybook's own a11y annotation reporting *"Found 1 a11y violations"* for
`Feedback/Toast > Tones` — and the suite then prints **PASS**.

Measured at whole-document scope: `div[data-tone="warning"] > .ds-atom-toast-msg`,
`#292524` on `#b0722a`, **3.81:1**. It is a **G2** instance (hardcoded dark ink
on a bridged `--amber-l`/`--amber` fill) in a component the gate cannot see.

**This is a gate defect, not a component discovery.** The honest total is
therefore **25 counted + at least 1 uncounted**, and the uncounted set is
"everything that portals" — Toast, and potentially Modal, Drawer, Tooltip,
CommandPalette and every popover. It is excluded from the 25 above so the counts
reconcile with 01-20, and recorded here so nobody reads 25 as complete. F-20-1
independently flagged the same Toast declaration by pixel sweep, which
corroborates it.

**Quantifying the blind spot is a prerequisite to trusting any charcoal a11y
number**, and it is not done. Nothing in §6 should be read as "then charcoal is
clean".

### 5.2 Real user-facing failures — 18 of 25

| # | violation | why it is real |
|---|---|---|
| **G5** RichText `mark` | **1.061:1** | Highlighted text is *invisible* in charcoal dark. The single worst defect in the set. |
| **G4** StatusPill ×2 | 1.294 / 1.530 | Pill labels effectively invisible in charcoal dark, on all three surface stops. |
| **G2** AlertBanner desc ×3 | **1.921:1** | The explanatory line of a warning banner. Fails by a factor, not a margin. |
| **G2** AlertBanner title ×3 | 3.819:1 | Warning headline. |
| **G1** SplitButton ×7 | 4.402:1 | The label of the primary action on a real control. |
| **G1** DatePicker ×5 | 4.402:1 | The selected date — the one cell a user must read. |

Six of these are borderline (4.402 vs 4.5, a 2% shortfall) and would not be
noticed by most sighted users in good light. They are still real: SC 1.4.3 is a
floor, the fix is a one-token swap with zero default-brand movement, and the
identical defect was already accepted as worth fixing in Tabs.

### 5.3 Artefacts of a story's own construction — 1 of 25

- **`surfaces-card--stat-card` (row 23).** The failing element is a
  **story-authored inline style**, `<div style={{fontSize: 11, color: "var(--amber)"}}>`,
  in `Card.stories.tsx`. The *component* contributes the hardcoded
  `background: #1c1917`; the ochre text is the story's own choice of artwork. A
  consumer who puts ochre text on a dark card hits the same thing, so it is a
  true finding about the pairing — but no shipped component code puts that text
  there. **Fixing the story would make this row disappear without improving the
  library**, which is exactly the shape to avoid.

### 5.4 Genuinely in between — 6 of 25

- **`layout-appbar--*` ×6 (rows 17-22).** `DefaultLogo` **is shipped component
  code** in `src/layout/AppBar/index.tsx`, so this is not story artwork — but it
  is only rendered when a consumer passes **no `logo` prop**, and every real
  consumer passes one. The portfolio will. So: a real defect in a real shipped
  default that most users will never see. It inflates the *story* count
  six-fold (six AppBar stories all render the same chip) while being **one**
  defect in **one** component. Counting it as six user-facing failures overstates
  it; calling it a story artefact understates it.

### 5.5 What is NOT in the set — and one reason to distrust that

Checked and confirmed absent: no violation is a deliberately-disabled control, a
`parameters.a11y.disable` opt-out, or decorative text. No story in the set pins a
page colour that fights the brand — `darkElements` was `["html(root)"]` on all
six dark stories and `[]` on all nineteen light ones, so 01-19.1's E29 conversion
is holding and **no violation here is an artefact of a stray `.dark` wrapper**.

But §5.1 means the set is scoped, not complete. **25 is a floor, not a total.**

---

## 6. Recommended order

### 1. G1 — `#1c1917` → `var(--ink-inverse)`, 2 declarations · SAFE BEFORE BETA

Largest group (12 of 25, 48%), smallest edit, and the **only** group with
provably zero default-brand pixel movement — `--ink-inverse` resolves to
`#1c1917` in the default brand, the exact literal it replaces. The identical fix
is already validated in the tree at `004254f`, and `tabs-label-contrast.spec.ts`
is the precedent for the gate that should accompany it.

Do this one first regardless of what happens to the others.

### 2. G4 — a `.dark` override for the two tinted StatusPill stages · SAFE BEFORE BETA

Second-worst ratios (1.294 / 1.530) and confined to one dark-mode declaration
pair. Scoped to charcoal-dark it moves no default baselines. **Do not fix by
changing `--amber-ink` in charcoal's dark block** — that token is correct for
solid ochre fills and is used by them; changing it to a light value would break
every correct consumer to fix one incorrect one. The defect is the *tint*, not
the token.

### 3. G5 — an explicit `color` on `mark` · SAFE BEFORE BETA, with a caveat

Worst single ratio in the set (1.061) and a one-line fix. The caveat is that the
correct value is `var(--ink-inverse)`-shaped — dark ink pinned against a pinned
light highlight — and setting it unconditionally **will move the default brand's
`interaction-richtext--dark-mode` baseline**, because that render currently
inherits near-white and would become dark. Small, attributable, and reviewable
in one image, but it is not zero.

---

### NOT SAFE BEFORE THE BETA

**G2 — the `--amber-l` flattening. Do not fix before the beta.**

This is not a code fix. Charcoal deliberately maps five amber steps onto one
ochre value, and G2 is that decision meeting consumers that depended on the
steps being distinct. The candidate repairs are all load-bearing:

- **Give charcoal a genuine pale-ochre step** for `--amber-l`. Correct, and it is
  a **new value in the theme's public token surface** — an API addition shipping
  in a beta whose changelog is already written, and it would move every charcoal
  baseline containing a warning banner or a date range.
- **Retarget the consumers to `var(--amber-ink)`.** Two declarations, but it
  **moves default-brand baselines** (`#292524` → `#92400e` is a visible hue
  change) and leaves DateRangePicker — which has no literal to swap — unfixed at
  4.460.
- **Nudge `--ochre`.** Would darken the brand's identity to pass a lint, which
  `check-contrast.mjs` is explicitly built to reject.

The group spans 1.921 to 4.460, so no single adjustment resolves it. It needs a
decision, not an edit, and taking it under beta pressure is how a theme acquires
a token nobody can explain.

**G3 — the pinned logo chip. Do not fix before the beta.**

Needs a mode-independent "accent on near-black" token that charcoal does not
have (§3/G3). Adding one is the same public-surface change as G2's first option.
Mitigating factor: `DefaultLogo` is a fallback no real consumer renders (§5.4),
so the user-facing cost of deferring is close to zero — the *lowest* cost-of-delay
in the whole set despite being the second-largest group by story count.

**§5.1's gate blind spot — measure before the beta, fix after.**

Do not fix the scoping now: widening `checkA11y` beyond `#storybook-root` would
pull Storybook's own chrome into every one of 508 stories and change what the
gate means library-wide, days before a release. But **do measure it**: one
whole-document sweep gives the real charcoal violation count. Shipping a beta
whose changelog says "25 known violations" when the instrument cannot see
portalled content is the kind of number this phase has been burned by fourteen
times.

---

## 7. Reproducing everything above

```bash
cd $DS
npm run storybook -- --quiet --no-open          # reuse :6006 if already up

npm run test:a11y                                # default brand: 508 passed, exit 0
DS_BRAND=charcoal npm run test:a11y              # charcoal: 483 passed / 25 failed, exit 1
```

The 25 failing story ids are in §2. The per-node fg/bg/ratio figures come from
axe-core's own `any[].data` cross-checked against an independently written
compositor verified on the recorded Tabs triple (§1.1).
