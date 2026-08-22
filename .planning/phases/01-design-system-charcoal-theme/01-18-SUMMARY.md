---
phase: 01-design-system-charcoal-theme
plan: 18
subsystem: design-system
tags: [g-5, g-9, f-15-4, f-15-5, statuspill, badge, filternav, tone, ink-ramp, color-mix, aria-current, zero-js, split-css, css-only-edge]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 16
    provides: "the decisive lesson, which repeated exactly — the load-bearing edit is DELETING the inline style object, not adding a rule beside it; plus the three-way gate proof and the 'try to walk through your own repair' step, which caught my first Badge gate repair and my first parity property list"
  - phase: 01-design-system-charcoal-theme
    plan: 14
    provides: "split-css.mjs's per-sheet sibling-dependency headers, which this plan had to extend — the graph is derived from JS imports and could not see a CSS class-reuse coupling"
  - phase: 01-design-system-charcoal-theme
    plan: 11
    provides: "FormErrorSummary's `inAppHref` allow-shape rule, reused verbatim for FilterNav's consumer-supplied href (T-18-01)"
  - phase: 01-design-system-charcoal-theme
    plan: 12
    provides: "the README = catalog = src/ count assertion, which fails BY NAME on a new component and did"
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: "tests/visual/computed.ts probeComputed — the only instrument that can show a color-mix() actually resolved in the right brand"
provides:
  - "$DS/src/inputs/StatusPill/index.tsx — a discriminated union: the six job stages as a preset, plus a generic `tone` + `label` path using the library's existing Tone vocabulary. Emits data-tone and data-step"
  - "$DS/src/inputs/Badge/index.tsx — emits `ds-atom-badge` + `data-tone` and holds NO inline typography or colour at all; the only surviving inline style is the `dotColor` runtime escape"
  - "$DS/src/primitives.css — a `DS atom: Badge` banner (dist/css/badge.css, first time), a `DS atom: FilterNav` banner (dist/css/filternav.css), and StatusPill's measured three-step ink-ramp fill ladder with a shape marker. 76 sheets -> 78"
  - "$DS/src/data-display/FilterNav/ — a labelled <nav> of real <a href> with aria-current=page, zero state, zero effects, zero event handlers; shares SegmentedControl's classes for parity"
  - "$DS/scripts/split-css.mjs — CSS_ONLY_EDGES (declared, non-transitive, machine-checked) + a read-only --audit-json flag"
  - "$DS/tests/visual/status-ladder.spec.ts — 10 Chromium cases measuring the fill ladder in all four brand x mode cells with the brand asserted at the point of measurement"
  - "$DS/tests/visual/filternav-parity.spec.ts — 7 Chromium cases: computed-style parity, real resolved hrefs, the link-list keyboard model, and the href allow-shape in the browser"
  - "$DS/src/primitive-composition.test.ts — OWNS_BARE_ANCHOR, a named exclusion with a measured reason and a staleness check"
affects: [01-19 FocalPointPicker (count 80 -> 81), 01-20 charcoal baselines (now SEVENTEEN) + v2.0.0 changelog, 01-21 publish, Phase 5 PUB-04 /photos/[category] + check-no-js gate, Phase 7 state->tone mapping, Phase 06.1 density]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A fill ladder must be built from the INK RAMP, not from a hue. color-mix(--ink N%, --paper) moves away from the surface in every brand and both modes by construction — that is what an ink ramp is. Hue tokens do not: --green is a dark editorial #2f7a52 in light and a light pastel #7fcfa1 in dark, so it INVERTS, and --ochre is identical in both modes so it changes role. Measured: the mix percentage that clears 1.2:1 in charcoal light fails in the other three brand x mode cells"
    - "Three luminance steps is a measured CEILING, not a preference. Contrast ratio is a pure function of luminance, so N pairwise-1.2:1 steps span 1.2^N from the page; six steps put the last fill's text at 3.76:1 in charcoal dark, below AA at a pill's type size where the large-text allowance never applies. Three hold 7:1 in all four cells"
    - "Hue belongs on the marker and the hairline, never on the fill, once the fill carries the ladder. --green on step 1's fill measures 3.55:1, so hue TEXT does not survive a ladder — hue survives as a shape, which is not text"
    - "Two ARIA patterns, two components, one stylesheet. FilterNav reuses .ds-atom-segmented* and sets data-active=true so the active anchor paints from the SAME [data-active] rule the active segment does. Parity is asserted on computed style, not by eye, and the coupling is documented in BOTH docstrings"
    - "getComputedStyle does NOT composite alpha. background-color returns the declared rgba, so a 14% wash read as opaque gives 2.02:1 against the page where the real figure is 1.11:1 — 'a number that is on no screen anywhere'. Composite over the backdrop before measuring"
    - "Chromium reports color-mix() as `color(srgb 0.84 0.83 0.81)` with channels in 0-1, not 0-255. A parser that assumes 0-255 yields luminance ~0.0003 and page ratios in the teens — a wrong parser that looks like a spectacular result"
    - "`sed -e 's://.*::'` eats the `//` inside a string literal. It turns `href.startsWith(\"//\")` into `href.startsWith(\"`, so a gate asserting the protocol-relative rejection false-FAILS on correct code. Strip block comments, then FULL-LINE // comments only"
    - "A dependency graph derived from JS imports cannot see a CSS class-reuse coupling. FilterNav borrows SegmentedControl's classes without importing it — deliberately, since importing a stateful radiogroup into a zero-JS anchor list defeats tree-shaking — so css/filternav shipped declaring only tokens and base while being incomplete: F-13-3 one door over"
    - "A declared list can still be honest if a test proves each entry from first principles. CSS_ONLY_EDGES and OWNS_BARE_ANCHOR are both hand-written and both machine-checked — the edge must borrow a class the dependency defines and the borrower does not; the anchor exemption must still contain a bare <a href>"

key-files:
  created:
    - "$DS/src/data-display/FilterNav/index.tsx"
    - "$DS/src/data-display/FilterNav/FilterNav.test.tsx"
    - "$DS/src/data-display/FilterNav/FilterNav.stories.tsx"
    - "$DS/tests/visual/status-ladder.spec.ts"
    - "$DS/tests/visual/filternav-parity.spec.ts"
  modified:
    - "$DS/src/inputs/StatusPill/index.tsx"
    - "$DS/src/inputs/Badge/index.tsx"
    - "$DS/src/primitives.css"
    - "$DS/scripts/split-css.mjs"
    - "$DS/src/css-split.test.ts"
    - "$DS/src/primitive-composition.test.ts"
    - "$DS/src/styling-boundary.test.ts"
    - "$DS/src/data-display/SegmentedControl/index.tsx"
    - "$DS/src/index.ts"
    - "$DS/src/OverviewPage.tsx"
    - "$DS/README.md"

key-decisions:
  - "StatusPill adopted `Tone` from src/foundation/tone.ts (primary | secondary | muted | accent | danger | success) plus the deprecated LegacyTone spellings via resolveTone, rather than inventing a status-specific union. A pill with its own names would have been a FOURTH closed vocabulary, which is the shape of the defect G-5 names"
  - "The fill ladder is derived from --ink, not from a hue, and the percentages are PER-MODE. One table cannot serve four brand x mode cells — measured"
  - "Badge's tone fills were carried over as the SAME literals. Tokenising them is a visual change under charcoal (--amber-vivid aliases --ochre), and a class hook must not move pixels. Recorded as a finding instead"
  - "The generic StatusPill path always renders a <span>. A status read out of content is not a control; the preset path keeps defaulting to <button> because changing a pipeline stage is what a kanban pill is for"
  - "FilterNav renders a bare <a>, not <Link>. Measured: .ds-atom-link[data-variant] rules at (0,2,0) would underline every category and recolour the active label, and Link always emits an inline style"
  - "The CSS-only dependency edge is applied NON-transitively. Borrowing a class needs that component's sheet, not the sheets of everything it renders"
  - "justify-content: center was REMOVED from .ds-atom-filternav-link after a negative control proved it changes nothing (a content-sized flex item has no free main-axis space). Recorded rather than silently dropped"

patterns-established:
  - "Assert the brand ON the probed element, every read. --amber is the discriminator in all four cells: tokens.css declares it once as #f59e0b and charcoal aliases it to --ochre (#b0722a) in both blocks. --ochre is asserted too, since it exists only in charcoal.css, so an empty read is positive proof the brand did not apply"
  - "A property list is a gate, and an omitted property is an inert gate. The parity list omitted text-decoration and display — the two loudest anchor-vs-button defaults — so deleting a declaration left all seven cases green"
  - "When a property differs for a legitimate mechanical reason, assert the observable CONSEQUENCE rather than deleting the assertion. display is flex on the anchor and block on the button; label centring is measured with a Range instead"

requirements-completed: [DS-01, DS-02]

# Metrics
duration: 1h 45m
completed: 2026-08-22
---

# Phase 1 Plan 18: StatusPill generalisation, Badge's class hook, and FilterNav Summary

**`StatusPill` now takes a tone and a label so it can express any status, `Badge` emits `ds-atom-badge` with zero inline styling, three adjacent statuses clear 1.2:1 in all four brand × mode cells off an ink-ramp ladder plus a shape marker, and `FilterNav` gives PUB-04 a crawlable zero-JS category nav that is computationally identical to `SegmentedControl`.**

## Performance

- **Duration:** ~1h 45m (includes one 600s watchdog stall on `npm run build`, resumed without redoing work)
- **Tasks:** 2 of 2
- **Files changed:** 19 (+1919 / −118)
- **Commits:** 4 — `3b87054`, `6846399`, `e2b5ebd`, `f4b1e2b`
- **Branch:** `charcoal-theme`, 47 ahead of `main`, tracked-clean

## What changed

| Finding | Change | Verified by |
|---|---|---|
| **G-5** | `StatusPill` gains a generic `tone` + `label` path as a discriminated union; the six job stages survive as a preset | 8 new vitest cases, 2 `@ts-expect-error` type assertions |
| **F-15-4** | `Badge` emits `ds-atom-badge` + `data-tone`; every declaration moved to `primitives.css`; `dist/css/badge.css` exists | 6 new vitest cases + both `styling-boundary` ratchets went stale and were removed |
| **F-15-5** | StatusPill's generic path ships a measured three-step ink-ramp fill ladder + a shape marker | 10 Chromium cases, four brand × mode cells, brand asserted per read |
| **G-9** | New `FilterNav`: labelled `<nav>` of real `<a href>` with `aria-current="page"`, zero JS | 13 vitest cases + 7 Chromium cases |

Gate state at close: `npm test` **1755 passed**, `check` clean, `typecheck` clean, `css:check` **78 sheets byte-exact** (was 76), `test:a11y` **498 passed**, `npm run build` exit 0, both new Playwright specs **17 passed**.

---

## THE MEASUREMENT: `Badge`'s D-45 fills, both modes, brand asserted

Probed on `inputs-badge--tones` (which carries **no** `.dark` decorator — its sibling `DarkMode` story does, plus a hardcoded `#1c1917` page, and would have measured the default brand). `--amber` read `#b0722a` and `--ochre` was non-empty on every read, so the cascade was charcoal's.

**Alpha had to be composited by hand.** `getComputedStyle` returns the *declared* `rgba()`, not the paint. Read as opaque, `Live` measures 2.020:1 against the page; composited it is 1.114:1. The finding warned about exactly this ("the raw channels give a number that is on no screen anywhere") and my first probe walked into it.

### charcoal LIGHT — page `#F4F1EA`, panel `#EDE9E0`

| Status | tone | raw fill | composited | vs page | vs panel | text on fill |
|---|---|---|---|---|---|---|
| Live | `success`/`passed` | `rgba(34,197,94,.14)` | `rgb(215,235,214)` | **1.114** | 1.105 | 5.08 |
| Maintained | `info`/`upcoming` | `rgba(59,130,246,.12)` | `rgb(222,228,235)` | **1.137** | 1.131 | 8.07 |
| Archived | `neutral` | `#FBF9F4` | `#FBF9F4` | **1.072** | 1.151 | 9.78 |

Pairwise: **Live/Maintained 1.021**, Live/Archived 1.194, Maintained/Archived 1.219.

This reproduces `00-15-SUMMARY`'s table to three decimals, including all three text-on-fill figures. The finding is exactly right.

### charcoal DARK — page `#161616`, panel `#242423` (never measured before)

| Status | tone | raw fill | composited | vs page | vs panel | text on fill |
|---|---|---|---|---|---|---|
| Live | `success`/`passed` | `rgba(34,197,94,.14)` | `rgb(24,47,32)` | **1.256** | 1.277 | 7.78 |
| Maintained | `info`/`upcoming` | `rgba(59,130,246,.12)` | `rgb(26,35,49)` | **1.145** | 1.156 | 5.93 |
| Archived | `neutral` | `#1E1E1D` | `#1E1E1D` | **1.085** | 1.074 | 9.69 |

Pairwise: **Live/Maintained 1.097**, Live/Archived 1.158, **Maintained/Archived 1.056**.

**Dark is not better, it is differently bad.** The tightest pair moves from `Live`/`Maintained` (1.021) to `Maintained`/`Archived` (1.056), and *every* pair is under 1.16:1. `Archived` against the panel is **1.074** — on a raised card the Archived badge is effectively invisible. This confirms `00-PUBLIC-DESIGN-NOTES.md:270` ("on charcoal dark those three surfaces sit within ~1.1:1 of one another") with numbers.

**The scope correction in my brief holds and matters:** D-45's badges render on the public Work page, whose default is charcoal **dark**, so the mode the finding did *not* measure is the primary one.

---

## Is F-15-5 a token-availability problem or a styling problem?

**Primarily styling — but the reason "pick better tones" cannot fix it is token availability.** Four measurements, in order:

1. **Styling.** `Badge`'s tinted fills are hardcoded `rgba()` literals, not tokens — `rgba(59,130,246,.12)`, `rgba(34,197,94,.14)`, `rgba(245,158,11,.15)`, `rgba(239,68,68,.12)`. They are **brand-blind**: identical under charcoal and the default brand, identical in light and dark. Charcoal's accent bridge never reaches them.
2. **Styling, and it is the model not the palette.** A 12–15% alpha wash of *any* hue composites within ~1.16:1 of a light page and ~1.26:1 of a dark one. **No choice of hue fixes it at that alpha.** So the finding's proposed fix — raise the alphas / pick different tones — treats the symptom.
3. **Token availability, first half.** The tint family is **2 of 5 complete**: `--green-bg` and `--red-bg` exist; there is **no `--blue-bg`, no `--purple-bg`, no `--ochre-l`**. And under charcoal, `--amber-l`, `--amber-soft`, `--amber-vivid` and `--amber-warm` *all* alias full-strength `--ochre` — charcoal has **no accent tint step at all**, which `charcoal.css` states outright ("no ochre tint step was ever measured"). A consumer wanting to fix `Badge` by pointing at tokens has nothing to point at for three of five hues.
4. **Token availability, the decisive half.** **No single derived-fill formula from the existing hue tokens can hold a 1.2:1 three-step ladder across brand × mode.** Measured: the best charcoal-light triad (`--ink-5`@54% / `--green`@22% / `--ochre`@70% over `--paper`) passes in charcoal light and **fails in the other three cells** — `charcoal-dark` pair 1.13, `default-light` pair 1.08, and `default-dark` text 3.5:1. The cause is that `--green` **inverts** between modes (`#2f7a52` → `#7fcfa1`) while `--ochre` is **static**, so its role relative to the surface flips.

So: the 1.02:1 was *caused* by styling, and is *un-fixable-by-retoning* because of token availability. That is why the fix builds the ladder from the **ink ramp** — the one family that is exhaustive and monotone in every cell by construction, because charcoal's exhaustiveness invariant guarantees it — and demotes hue to redundant reinforcement.

**No token was added**, per the plan's instruction.

### The shipped ladder, measured in Chromium

`color-mix(in srgb, var(--ink) N%, var(--paper))`, per-mode N. Two tones share each step, so a **triad** is the unit: the *neutral* triad `muted`/`secondary`/`primary` (what D-45 wants — three distinguishable **neutral** statuses, which `00-PUBLIC-DESIGN-NOTES.md:276` says the palette "supplies roughly one" of) and the *hued* triad `success`/`accent`/`danger`.

| cell | N | vs page | pairwise | text on fill |
|---|---|---|---|---|
| charcoal light | 16 / 27 / 38 % | 1.300 / 1.677 / 2.220 | 1.290 / 1.324 / 1.707 | 12.08 / 9.36 / 7.08 |
| charcoal dark | 7 / 15 / 22 % | 1.296 / 1.643 / 2.048 | 1.268 / 1.246 / 1.580 | 11.31 / 8.92 / 7.15 |
| default light | 16 / 27 / 38 % | 1.387 / 1.783 / 2.350 | 1.285 / 1.318 / 1.694 | 11.99 / 9.33 / 7.08 |
| default dark | 7 / 15 / 22 % | 1.280 / 1.636 / 2.053 | 1.278 / 1.255 / 1.604 | 11.85 / 9.27 / 7.39 |

Every fill clears **1.2:1** against the page *and* ≥1.11 against the panel; every label clears **7:1** on its own fill. Worst margin anywhere: 1.246.

**Three is a ceiling, measured.** Contrast ratio is a pure function of luminance, so N pairwise-1.2:1 steps span 1.2^N from the page. Six steps put the sixth fill's text at **3.76:1** in charcoal dark — below AA at a pill's type size, where the large-text allowance never applies. D-13 and D-45 both need exactly three states, so the ceiling sits above the requirement.

**The non-colour signal** is a leading marker whose *shape* is driven by `data-step` — the same attribute that drives the fill, so a later restyle cannot move one without the other. Step 1 is a hollow ring, step 2 a filled disc, step 3 a filled square. Text is `var(--ink)` on every step, never the hue: `--green` on step 1's fill measures **3.55:1**, so hue text does not survive a ladder.

### What this plan deliberately does NOT do

It does not map D-13's or D-45's specific states to specific tones. That mapping is UI-SPEC's and lives in the consumer — **Phase 7's**. This plan makes a *distinguishable set* available and proves it. `Badge`'s own fills are unchanged (see Findings raised), so **F-15-5 closes on the component G-5 makes available, and the D-45 consumer must switch from `Badge` to `StatusPill` for the public Work page to benefit.** That switch is Phase 7's, and it is the point of closing G-5.

---

## Premises falsified

1. **"`Badge` emits no class at all."** *True as stated, and incomplete in the way that matters.* `Badge` had no `className` of its own — but a consumer `className` **did** reach the element through `{...rest}`. So the defect was never the missing attribute; it was that **an inline style beats a class rule without `!important`**, so no class could ever resize it. 01-16's lesson repeated exactly: the load-bearing edit is **deleting** `style={{...baseStyle, ...toneStyles[tone]}}`, not adding a rule beside it.

2. **The plan's own `9.5px` gate is inert, and I proved it.** `Badge` declared `fontSize: 9.5` — a **number, no unit**. `grep -qE '9\.5px'` could not see it. What the grep actually matched was a **comment** three lines below ("under AA for this 9.5px label"). Removing four characters from that comment makes the plan's gate **PASS with `fontSize: 9.5` fully intact**. It also fails in the opposite direction: the plan's own action text requires documenting that `--text-2xs` *is* 9.5px, and doing so keeps the gate red. Both 01-16 shapes in one three-line gate.

3. **"Charcoal declares `--blue`, `--purple`, `--green`, `--red`."** *False.* `charcoal.css` declares **none** of them, and zero occurrences of `ochre` exist in `tokens.css`. Those four resolve from the design system's own `:root` / `:root.dark`, so they are not charcoal-tuned and they invert between modes — which is what breaks a single-percentage ladder.

4. **"Pick tones far enough apart."** *Not achievable as posed.* No hue-derived triad clears 1.2:1 in all four brand × mode cells (§ above). The ladder had to come off the ink ramp.

5. **`justify-content: center` on the anchor is load-bearing.** *False, proven.* A content-sized flex item has no free main-axis space. Removed.

6. **`display: inline-flex` is redundant.** *Also false* — and I briefly believed it because my first slack measurement was **horizontal only**. With the vertical axis added, removing `display` or `align-items` moves the label **15–16px** off centre. The first conclusion was an artefact of an incomplete instrument.

7. **`split-css.mjs` derives every dependency.** *False for a CSS-only coupling.* `componentEdges` reads relative `from "…"` imports. `FilterNav` borrows `SegmentedControl`'s classes **without importing it**, so `dist/css/filternav.css` shipped declaring only `tokens` and `base` while being incomplete without `segmentedcontrol`'s rules — **F-13-3 one door over**.

8. **`--amber` reads as `rgb(...)`.** *False.* Chromium resolves a custom property's `var()` chain but keeps the **authored format**, so `--amber: var(--ochre)` reads `#b0722a`. My first brand assertion compared against the rgb spelling and all ten cases failed — the guard catching itself.

9. **Chromium reports `color-mix()` in 0–255 channels.** *False.* It reports `color(srgb 0.843137 0.835294 0.816941)` — channels in **0–1**. A parser assuming 0–255 gives luminance ≈0.0003 and page ratios of **18.5:1**: a wrong parser that looks like a triumph.

10. **`sed -e 's://.*::'` strips comments safely.** *False*, and **the plan's own gate 2.2 uses it.** It eats the `//` inside a string literal, turning `href.startsWith("//")` into `href.startsWith("`, so a gate asserting the protocol-relative rejection **false-FAILS on correct code**. Observed on this very file.

11. **`getComputedStyle` gives the painted colour.** *False for alpha.* It returns the declared `rgba()`. Read as opaque, `Live` is 2.020:1 against the page; the real figure is 1.114:1.

---

## Gates repaired, each with its three-way proof

### A. The Badge gate (plan Task 1, assertion 2)

| Proof | Input | Result |
|---|---|---|
| FAIL pre-plan | untouched `Badge/index.tsx` + `primitives.css` | `FAIL: Badge emits no class` |
| FAIL, fix disabled — the 01-16 trap | `ds-atom-badge` added **beside** the inline object | `FAIL: Badge still declares fontSize inline — the class hook would be cosmetic` |
| FAIL, fix disabled | `9.5px` restored as a CSS literal | `FAIL: badge type is not on the scale` |
| FAIL, fix disabled | Badge banner renamed (split-css emits nothing) | `FAIL: no 'DS atom: Badge' banner section` |
| FAIL, walks through the PLAN's gate | comment edited, `fontSize: 9.5` intact | `FAIL: Badge emits no class` |
| PASS | shipped | `OK` |

**It walked through its own first repair.** Moving `baseStyle`/`toneStyles` into a sibling `./styles.ts` and keeping `style={{ ...baseStyle }}` on the root silenced every property-name grep with the defect 100% intact — I built it and watched it pass. Second strengthening: no local imports, exactly one `style=` binding, and that one must be the `dotColor` escape. Re-proved on all six inputs.

The **binding** assertion is not the shell gate. It is `Badge.test.tsx > has no inline typography`, which reads the *rendered* element and requires `getAttribute("style")` to be `null` — no arrangement of imports satisfies that while an inline object reaches the root. Verified: the walk-through source fails it (4 of 12 red), then restored and re-run green, `shasum` identical both sides.

### B. The FilterNav gate (plan Task 2, assertion 2)

The plan's gate greps for `aria-current` and against `role="radio|useState|useEffect|onChange`. **A `<button>` list with a prop callback satisfies it in full** — no hook names, no `role="radio"`, no `onChange` — while being uncrawlable, not Back-button-capable and useless without JS, i.e. precisely what G-9 exists to prevent. I built the impostor and watched it pass.

| Proof | Input | Result |
|---|---|---|
| FAIL pre-plan | component absent | `FAIL: FilterNav source missing or empty` |
| FAIL, walks through the PLAN's gate | button-list impostor | `FAIL: renders no <a> — the entire point of G-9` |
| FAIL, fix disabled ×5 | `aria-current`→`aria-checked`; `<a>`→`<button>`; `//` rejection removed; first-char test removed; `aria-label`→`data-label` | five distinct named failures |
| FAIL, walk-through attempt | real anchors **plus** an `onClick` | `FAIL: attaches a DOM event handler — it would hydrate` |
| PASS | shipped | `OK` |

Repairs: a **positive** assertion that an `<a href>` is rendered at all (the plan had none); `<button>`, `aria-checked` and competing roles forbidden; the hook list widened from three names to twelve plus any `on[A-Z]…={` handler and `"use client"`; `tabIndex` forbidden (a roving tabindex is the radiogroup keyboard model); and both halves of the href allow-shape asserted. All mutations were applied to **copies** — the shipped file's sha was unchanged throughout.

### C. The parity property list — an inert gate I wrote myself

My first `ITEM_PROPS` omitted `text-decoration-line` and `display`, the two loudest anchor-vs-button defaults. The negative control walked straight through: deleting a declaration from `.ds-atom-filternav-link` left **all seven cases green**. After adding them, each declaration was tested individually with a *verified* edit:

| declaration removed | verdict |
|---|---|
| `display: inline-flex` | **FAIL** — label 15–16px off centre vertically |
| `align-items: center` | **FAIL** — label 15–16px off centre vertically |
| `text-decoration: none` | **FAIL** — `text-decoration-line` reads `underline` |
| `justify-content: center` | **PASS → dead code, removed** |

An earlier round of these "negative controls" was invalid: a `perl -0777 -i -pe "s{…}{$1}"` inside double quotes had `$1` eaten by bash, so the substitution never applied and three runs measured an unmodified file while printing plausible results. Protocol §7's "a `sed` that changed nothing exits 0", one tool over. Redone in Python with the edit diffed before each run.

`display` itself is **excluded** from the equality set for a stated reason — the anchor computes `flex`, the button `block`, both 32px, because a UA-styled `<button>` centres its own content and an `<a>` does not. Deleting an inconvenient assertion is how a gate dies, so the **observable consequence** is asserted instead: label centring on both axes, measured with a `Range` over the text.

### D. Two ratchets fired, which is the half that usually never does

`styling-boundary.test.ts` listed `inputs/Badge/index.tsx` in **both** `KNOWN_INLINE_DISPLAY` and `KNOWN_INLINE_COLOR`, each annotated *"owned by plan 01-18"*. Both went **stale** and failed, demanding removal — independent confirmation, from a test I did not write, that the inline styles are gone. `css-split.test.ts` then failed for a stale `dist/`, correctly refusing to accept an undeclared `datagrid → badge` edge.

### Which control proves the suite is not inert

Two, and they are different kinds:

- **`Badge.test.tsx > "has no inline typography, so a consumer stylesheet can resize it"`** — the only assertion in this plan that a `ds-atom-badge`-added-beside-the-inline-object fix cannot satisfy. Every other Badge case passes on that fix. It is what makes F-15-4 closed rather than annotated.
- **`status-ladder.spec.ts`'s `--amber` / `--ochre` brand assertion** — it caught its own hex/rgb format bug before measuring anything, and it is the only thing standing between this plan and E29. Without it, a probe in `inputs-badge--dark-mode` or `inputs-statuspill--dark-mode` reads the default brand and reports a confident wrong number.

Passing-by-construction in RED, and named as such: `Badge > "still lets an explicit style prop win"`, `StatusPill > "still merges a consumer className"` (reaches through `{...rest}` regardless), and `StatusPill > "rejects at the type level"` (a `@ts-expect-error` is a *typecheck* assertion — vitest cannot fail it; `npm run typecheck` is where it bites, and it reported 7 errors in RED).

---

## `FilterNav` × `SegmentedControl`: the computed-style parity comparison

Probed on `data-display-filternav--beside-segmented-control`, which renders both in **one DOM** so they are compared under one cascade rather than across two navigations, and which carries no `.dark` decorator.

**Container** (`.ds-atom-filternav` vs `.ds-atom-segmented`) — `background-color`, `border-top-width/style/color`, `border-radius`, `padding-top/left`, `gap`, `display`, `align-items`: **deep-equal in all four brand × mode cells.**

**Inactive item** and **active item** (`[aria-current="page"]` vs `.ds-atom-segmented-btn[data-active]`) — `text-decoration-line`, `height`, `line-height`, `padding-left/right`, `font-family`, `font-size`, `font-weight`, `border-radius`, `color`, `background-color`, `white-space`: **deep-equal in all four cells.**

Representative (charcoal dark): container `background-color: rgb(30,30,29)`, `border 1px solid rgb(114,114,104)`, `border-radius 999px`, `padding 2px`, `gap 2px`; item `height 32px`, `padding 0 14px`, `font-size 13px`, `font-weight 500`, `border-radius 999px`, `text-decoration-line: none`.

Non-vacuity: the active item's `background-color` must **differ** from the inactive one's, or all three comparisons could be passing on one identical unstyled box. The active anchor carries `data-active="true"` precisely so it paints from `.ds-atom-segmented-btn[data-active]` — the **same rule**, not a copy.

**What deliberately differs**, asserted separately: 4 real anchors whose `.href` resolves to an absolute URL, exactly one `aria-current="page"`, `tabindex` null on every link, and the keyboard model — `ArrowRight` moves neither focus nor selection (a radiogroup would move both), while `Tab` walks the list.

---

## Findings raised (not fixed)

- **`Badge`'s tinted fills are brand-blind hardcoded `rgba()` literals.** `info`/`success`/`warning`/`error`/`done`/`upcoming`/`passed` all use raw alpha washes, so charcoal's accent bridge never reaches them and the same colour paints in every brand and mode. Tokenising `rgba(245,158,11,.15)` → `--amber-vivid` **changes the paint under charcoal** (that token aliases `--ochre`), so it is a visual change and belongs with the D-45 consumer switch, not with a class hook.
- **The tint token family is 2 of 5 complete.** `--green-bg` and `--red-bg` exist; `--blue-bg`, `--purple-bg` and `--ochre-l` do not. Charcoal has **no accent tint step at all**. A future plan that wants hue-carried status fills needs per-mode tint tokens; `01-03`'s register is the right gate for them.
- **`.ds-atom-statuspill:hover` applies its `brightness()` filter to `[data-interactive="false"]` pills too**, which are `<span>`s that cannot be activated. Pre-existing; not touched because scoping it would move existing baselines.
- **`split-css.mjs` has no entrypoint guard and calls `rmSync(dist/css)` at top level.** Importing it from a test would delete the built stylesheets mid-run — and `src/packaging.test.ts` is `describe.skipIf(!existsSync(dist))`, so the damage surfaces as tests **silently skipping**, exactly the false-pass protocol §3(a) describes. Worked around with a read-only `--audit-json` flag that exits before the write path; the missing guard remains.
- **E29 is live in the two components this plan touched.** `Badge.stories.tsx > DarkMode` and `StatusPill.stories.tsx > DarkMode` both set `className="dark"` **and** a hardcoded `#1c1917` page. Not fixed (separate plan), avoided by probing only decorator-free stories.

## Anything later plans need

- **01-19:** the component count is now **80**. `FocalPointPicker` takes it to 81 — README, `OverviewPage.tsx` *and* `src/` must all move, or `overview-links.test.ts` fails by name. `src/` is at 82 directories with 2 named exclusions (`Field`, `IconButton`).
- **01-20 now owes SEVENTEEN visual baselines,** not twelve. This plan adds **5** stories: `inputs-statuspill--status-ladder`, and `data-display-filternav--{default,sizes,beside-segmented-control,rejected-hrefs}` (plus one new `--docs` page). `tests/visual-baselines/` is untouched at **240** tracked PNGs, `diff`-clean, and **no PNG was written anywhere** — both new specs read computed style rather than capturing. `test-results/` and `playwright-report/` were removed by explicit path after confirming both were untracked and `.gitignore`d.
- **`css:check` is now 78 sheets byte-exact** (was 76): `badge.css` and `filternav.css` are new. `filternav.css` declares `segmentedcontrol` with CSS-only wording; `datagrid.css` now declares `badge`.
- **Phase 5 / PUB-04:** `FilterNav` is ready. `activeHref` comes from the URL (`Astro.url.pathname`); `ariaLabel` **must be unique per page** (axe `landmark-unique` failed this component's own `Sizes` story until the three instances were named apart). The `check-no-js` gate should find zero hydration: no state, no effects, no handlers, asserted by grep, by SSR test and by `tabindex` absence in the browser.
- **Phase 7:** mapping product states to tones is yours. Use **one triad**, not a mix — the *neutral* triad (`muted`/`secondary`/`primary`) for D-45's Live/Maintained/Archived, the *hued* triad (`success`/`accent`/`danger`) for a semantic surface. Pairing across them gives two identical fills. And **switch D-45 from `Badge` to `StatusPill`**, or F-15-5's measured 1.02:1 keeps shipping on the public Work page.
- **`OWNS_BARE_ANCHOR`** and **`CSS_ONLY_EDGES`** are the two hand-maintained lists this plan added. Both have staleness checks; if a future plan makes either entry untrue, the test names the entry to delete.

## `CHANGELOG.md` wording for 01-20 (paste-ready)

This adds the **fifth** `BREAKING CHANGE:` footer for v2.0.0. The first four were 01-15's and 01-16's additive ones plus the earlier pair; **this one is a real break** — `Badge` was self-styling via inline styles and now requires a stylesheet.

```markdown
### Added

- **`FilterNav`** — a crawlable anchor sibling to `SegmentedControl` (G-9). A labelled
  `<nav>` of real `<a href>` elements with `aria-current="page"` on the current one.
  No state, no effects, no event handlers: selection is a prop derived from the URL,
  so a prerendered category route is crawlable and Back-button-capable with zero JS.
  It reuses `SegmentedControl`'s CSS classes, so the two are computationally
  identical — asserted on computed background, border, padding, font and height in
  all four brand × mode cells. Component count 79 → 80.
- **`StatusPill` generic tone path** — `<StatusPill tone="success" label="Published" />`
  alongside the existing `stage` preset, as a discriminated union so a call site
  cannot supply both. Tones are the library's own `Tone` vocabulary (`primary`,
  `secondary`, `muted`, `accent`, `danger`, `success`) with the deprecated raw-token
  spellings still accepted (G-5). The stage union was job-application-specific, so
  the component appeared on none of the admin screens and `Badge` stood in on three
  surfaces it could not express.
- **`dist/css/badge.css`** and **`dist/css/filternav.css`** (76 → 78 sheets).

### Changed

- **Three adjacent statuses are now distinguishable** (F-15-5). `StatusPill`'s generic
  path paints a three-step fill ladder derived from `--ink`, plus a leading marker
  whose shape (ring / disc / square) repeats the same split without colour. Measured
  in Chromium: every fill clears 1.2:1 against the page and ≥1.11 against the panel,
  and every label clears 7:1 on its own fill, in charcoal and the default brand, light
  and dark. Previously three adjacent statuses sat 1.02:1 apart on charcoal light and
  1.06:1 apart on charcoal dark — only the words separated them. Three steps is a
  measured ceiling: six pairwise-1.2:1 steps put the last label at 3.76:1 in charcoal
  dark, below AA at a pill's type size.

### Fixed

- **`Badge` is selectable, themable and resizable** (F-15-4). It emits
  `class="ds-atom-badge"` and `data-tone`, and its type step is `var(--text-2xs)`.
  Previously it rendered a `<span>` with no class and an inline style object carrying a
  hardcoded 9.5px, on a component that appears on every admin screen — so an audit had
  to select it as `span:not([class])` and no stylesheet could resize it.

BREAKING CHANGE: `Badge` no longer carries inline styles. Every declaration moved to
`.ds-atom-badge` in `primitives.css`, so a consumer that imported the JS without any
stylesheet previously got a styled badge and now gets an unstyled `<span>`. Import
`@akhil-saxena/design-system/css/badge` (or `primitives.css`). The visual output is
otherwise unchanged: `--text-2xs` is 9.5px and every tone fill kept its exact value.
Two further consequences, both intended: a consumer `className` or stylesheet rule now
actually applies to a Badge, and `dist/css/datagrid.css` now declares `css/badge` as a
sibling dependency.
```

## Self-Check: PASSED

- `$DS/src/data-display/FilterNav/{index,FilterNav.test,FilterNav.stories}.tsx` — FOUND
- `$DS/tests/visual/{status-ladder,filternav-parity}.spec.ts` — FOUND
- `$DS/dist/css/badge.css` (4471 B), `$DS/dist/css/filternav.css` (3307 B), `$DS/dist/components/FilterNav.js` — FOUND
- Commits `3b87054`, `6846399`, `e2b5ebd`, `f4b1e2b` — FOUND on `charcoal-theme`
- `npm test` 1755 passed · `check` clean · `typecheck` clean · `css:check` 78 byte-exact · `test:a11y` 498 passed · `build` exit 0 · Playwright 17 passed
- `$DS` tracked-clean; `git stash list` empty; `tests/visual-baselines/` 240 PNGs, `diff`-clean
