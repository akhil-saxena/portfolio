---
phase: 01-design-system-charcoal-theme
plan: 22
subsystem: design-system / charcoal brand
tags: [theme, colour, accessibility, tokens, visual-baselines]
requires: ["01-20", "01-FIX-focus-ring-soft"]
provides: ["charcoal near-monochrome identity", "G2 dissolved", "G3 dissolved", "E1 closed by construction"]
affects: ["../design-system/src/themes/charcoal.css", "../design-system/src/tokens.test.ts", "12 visual specs", "489 charcoal baselines", "../design-system/CHANGELOG.md"]
tech-stack:
  added: []
  patterns: ["accent-as-neutral", "light accent fill in both modes", "token-identity assertions over value proxies"]
key-files:
  created: []
  modified:
    - "../design-system/src/themes/charcoal.css"
    - "../design-system/src/tokens.test.ts"
    - "../design-system/tests/visual/{accent-ink-contrast,brand-isolation,brand-probe,confirm-panel,filternav-parity,focalpoint,pinned-surface-ink,status-ladder,tabs-label-contrast,tinted-pill-ink}.spec.ts"
    - "../design-system/tests/visual/storybook.spec.ts-snapshots (489 charcoal)"
    - "../design-system/CHANGELOG.md"
decisions:
  - "--ochre* kept as declared back-compat aliases onto the amber family, because field-contract.spec.ts asserts --amber-d === --ochre-d by computed value and tokens.test.ts's tier register names --ochre-d and --ochre-d-strong in a hard-counted 54-case set"
  - "--amber is a LIGHT fill in both modes, because --ink-inverse is pinned dark by a #fef08a highlight literal no theme can reach"
  - "--focus unbound from the accent and bound to --ink, because a neutral accent is a mid grey and makes a weaker ring than the page's own text colour"
  - "charcoal light paper is #FDFDFE, not #FFFFFF, because pure white disarmed the F-15-3 confirm-panel gate"
  - "--amber-vivid neutralised despite being a semantic status dot, following the plan's stated scope of red and green only"
metrics:
  duration: "~3h"
  completed: "2026-08-25"
  commits: 5
  gates: "build/test/check/typecheck/css:check/test:a11y all 0; test:visual 1 (two documented flakes)"
---

# Phase 1 Plan 22: Charcoal, near-monochrome Summary

> **Renamed since.** Plan 01-23 renamed the brand **charcoal → monochrome** in code and in
> forward-looking documents, before anything published. Everything below is left exactly as
> written, because it records what was measured on 2026-08-25 under the name in use that day.
> Read every `charcoal` here as today's `monochrome`: `src/themes/charcoal.css` is now
> `src/themes/monochrome.css`, `[data-brand="charcoal"]` is now `[data-brand="monochrome"]`,
> and the `--charcoal-` baseline suffix is now `--monochrome-`. See `01-23-SUMMARY.md`.

Charcoal's accent hue is gone and its neutrals are true neutrals; the charcoal a11y sweep went from **11 failed / 497 passed to 508 / 508**, because every one of the 11 involved the retired ochre.

`$DS` branch `charcoal-theme`, `60921fa` (77 ahead) → **`e7b182f`** (82 ahead). `package.json` stays **1.11.4**. Nothing published, tagged or merged; the 164 pending renames are unapplied; `src/tokens.css` is byte-for-byte untouched.

| commit | what |
|---|---|
| `c1493bc` | `feat(theme): rebuild charcoal as near-monochrome, and retire the accent hue` |
| `3d2cf7f` | `test(visual): re-point the charcoal contract specs at the monochrome palette` |
| `30e41eb` | `test(visual): re-record the charcoal baselines against the monochrome palette` |
| `5b1b253` | `fix(theme): keep charcoal's light paper off pure white, and restore the gate it killed` |
| `e7b182f` | `docs(changelog): describe the identity that ships, and the a11y number it earns` |

---

## 1. The final ramp, with every channel spread

**No non-semantic token exceeds a channel spread of 9**, against the plan's ceiling of 24. The cast is faintly cool (blue channel high) and uniform, so nothing reads as tinted.

### Charcoal LIGHT — page `#fafafb` / paper `#fdfdfe` / panel `#f4f4f6`

| token | value | spread | page / paper / panel |
|---|---|---|---|
| `--ink` | `#111114` | 3 | 18.07 / 18.54 / 17.16 |
| `--ink-2` | `#424248` | 6 | 9.57 / 9.82 / 9.08 |
| `--ink-3` | `#525258` | 6 | 7.44 / 7.63 / 7.06 |
| `--ink-4` | → `--ink-3` | 6 | 7.44 / 7.63 / 7.06 |
| `--ink-5` | `#8d8d93` | 6 | 3.16 / 3.25 / 3.00 |
| `--ink-inverse` | `#0d0d0f` | 2 | 18.61 / 19.10 / 17.68 |
| `--cream` | `#fafafb` | 1 | — |
| `--cream-2` | `#fdfdfe` | 1 | — |
| `--cream-3` | `#f4f4f6` | 2 | — |
| `--amber` | `#8e8e97` | 9 | 3.11 / 3.19 / 2.96 |
| `--amber-d` | `#64646a` | 6 | 5.63 / 5.78 / 5.35 |
| `--ochre` | → `--amber` | 9 | 3.11 / 3.19 / 2.96 |
| `--ochre-d` | → `--amber-d` | 6 | 5.63 / 5.78 / 5.35 |
| `--ochre-d-strong` | `#4e4e54` | 6 | 7.92 / 8.13 / 7.52 |
| `--amber-l` | `#e4e4ea` | 6 | 1.21 / 1.25 / 1.15 |
| `--amber-ink` | → `--ink-inverse` | 2 | 18.61 / 19.10 / 17.68 |
| `--amber-vivid` | `#8e8e97` | 9 | 3.11 / 3.19 / 2.96 |
| `--wire` | `#88888e` | 6 | 3.38 / 3.47 / 3.21 |
| `--rule` | `#d8d8de` | 6 | 1.36 / 1.40 / 1.29 |
| `--rule-strong` | `#c4c4cc` | 8 | 1.66 / 1.71 / 1.58 |
| `--focus` | → `--ink` | 3 | 18.07 / 18.54 / 17.16 |

### Charcoal DARK — page `#0d0d0f` / paper `#17171a` / panel `#1e1e22`

| token | value | spread | page / paper / panel |
|---|---|---|---|
| `--ink` | `#f2f2f4` | 2 | 17.37 / 16.00 / 14.86 |
| `--ink-2` | `#bfbfc5` | 6 | 10.61 / 9.77 / 9.08 |
| `--ink-3` | `#a8a8ae` | 6 | 8.21 / 7.56 / 7.02 |
| `--ink-4` | → `--ink-3` | 6 | 8.21 / 7.56 / 7.02 |
| `--ink-5` | `#68686e` | 6 | 3.51 / 3.23 / 3.00 |
| `--ink-inverse` | `#0d0d0f` | 2 | (ink on a light fill, not on these) |
| `--cream` | `#0d0d0f` | 2 | — |
| `--cream-2` | `#17171a` | 3 | — |
| `--cream-3` | `#1e1e22` | 4 | — |
| `--amber` | `#f2f2f4` | 2 | 17.37 / 16.00 / 14.86 |
| `--amber-d` | `#95959b` | 6 | 6.52 / 6.01 / 5.58 |
| `--ochre` | → `--amber` | 2 | 17.37 / 16.00 / 14.86 |
| `--ochre-d` | → `--amber-d` | 6 | 6.52 / 6.01 / 5.58 |
| `--ochre-d-strong` | `#b0b0b6` | 6 | 9.00 / 8.29 / 7.70 |
| `--amber-l` | `#26262c` | 6 | 1.29 / 1.19 / 1.10 |
| `--amber-ink` | → `--ink-3` | 6 | 8.21 / 7.56 / 7.02 |
| `--amber-vivid` | `#8e8e97` | 9 | 5.98 / 5.51 / 5.12 |
| `--wire` | `#6d6d73` | 6 | 3.78 / 3.48 / 3.23 |
| `--rule` | `#2a2a30` | 6 | 1.36 / 1.25 / 1.16 |
| `--rule-strong` | `#3a3a42` | 8 | 1.72 / 1.59 / 1.47 |
| `--focus` | → `--ink` | 2 | 17.37 / 16.00 / 14.86 |

**Every figure above was recomputed from the file as written**, by parsing `charcoal.css`, resolving each `var()` chain, and measuring. Not one was carried forward. Recomputation caught **eleven stale figures in comments I had authored myself** during this plan — I wrote several before the measurement returned and they were wrong by 0.1 to 0.5. Each correction was applied with an assert-one-occurrence guard.

**Token names are unchanged.** 50 per block, identical sets between blocks, and identical to the previous release — verified by parsing both files. This is a value change with zero public API surface movement.

### Where the candidate palette was adopted, and the one place it was not

Akhil's chosen candidate **C · near-monochrome** is recorded verbatim on the comparison page still served on `localhost:5173`:

```
page #0d0d0f  surf #17171a  surf2 #1e1e22  text #f2f2f4  muted #8e8e97  wire #2a2a30
accent #f2f2f4  accentText #ffffff   "no accent hue at all — the photographs are the only colour"
```

Adopted verbatim: the three dark surfaces, `--ink`, and the accent fill.

**Not adopted: the muted step.** Candidate C's `#8e8e97` measures **5.98 / 5.51 / 5.12** on those surfaces — AA, but not the **AAA** charcoal has held for `--ink-3` since D-46 (*"the single largest legibility risk in the admin"*). It was lightened to `#a8a8ae` until the panel cleared 7. Same in light: `#5c5c66` reads 6.34 / 6.61 / 6.02 and became `#525258`. The plan permitted this — *"adjust if measurement demands, and say so"* — and this is the saying.

**Also not adopted: `accentText #ffffff`.** See F-22-3 in §9 — pure white as `--amber-d` puts white on white in the primary button's hover rule, which hardcodes `color: #fff`.

---

## 2. G2 and G3: dissolved, and verified by running the sweep

`DS_BRAND=charcoal npm run test:a11y`:

| | suites | tests |
|---|---|---|
| **before** | 4 failed, 80 passed | **11 failed, 497 passed** |
| **after** | **84 passed** | **508 passed, 508 total** |

Charcoal now matches the default brand exactly (508/508).

**Verified with a negative control, not by reasoning.** Restoring the pre-change `charcoal.css` from a `cp` backup — sha256 confirmed `11ca666e…` — and re-running reproduced **exactly 11 failed / 497 passed** in exactly four suites: `AlertBanner`, `DateRangePicker` (G2) and `AppBar`, `Card` (G3), matching the triage's attribution. The file was then restored from a backup of the new version, sha256 `8f6f27b1…`, and `git status` confirmed byte-exact.

This also disposes of the obvious false-pass: if `DS_BRAND` were silently ignored I would have measured the default brand both times and seen 508/508 twice. (The harness independently asserts the requested brand resolves in the DOM — `.storybook/test-runner.ts:120`.)

**G2 — `--amber-l` flattened onto the accent.** The pale tint is a pale tint again, so the hardcoded warning-banner inks recover:

| node | before | after |
|---|---|---|
| `.ds-atom-banner-desc` `#57534e` | **1.921** | **6.03** |
| `.ds-atom-banner-title` `#292524` | 3.819 | **11.98** |
| `.ds-atom-datepicker-cell.is-in-range` numeral (`--ink`) | 4.460 | **14.89** |

**G3 — the accent as text on a pinned near-black surface.** Both chips are literals a component hardcodes, so the theme had to come to them rather than reach them:

| node | before | after (light) | after (dark) |
|---|---|---|---|
| `AppBar` `DefaultLogo` on `#1c1c1a` | 4.296 | **5.26** | **15.27** |
| `Card [data-variant="dark"]` on `#1c1917` | 4.402 | **5.38** | **15.64** |

**G3 is what constrained the whole light ramp**, and it is worth recording because the constraint is not obvious. A light-mode monochrome wants a near-black accent — a black primary button is the modern idiom. That is impossible here:

- the chip needs the accent **lighter** than L ≈ 0.227 to clear AA on `#1c1c1a`;
- AA accent text on a near-white page needs it **darker** than L ≈ 0.162.

The two bands do not intersect, so no value satisfies both. The chip won, because it is the axe-tested one, and because `--ink-inverse` independently forces the fill to be light anyway (§3).

---

## 3. The invariant that decided the architecture

**`--amber` must be a LIGHT fill in both modes**, and this is a system-wide contract rather than a style choice. Every consumer that fills with it sets a dark foreground — `var(--ink-inverse, #000)`, a literal `#000`, or `#1f1b17` — and `--ink-inverse` is additionally pinned dark by `.ProseMirror mark`, which hardcodes `background: #fef08a`, a light yellow no theme can reach. A token that must work on a pinned light surface has no mode to follow.

So the accent fill does not invert with the mode while the ink on it does not either:

| | `--ink-inverse` on `--amber` | `#000` on it | `#1f1b17` on it |
|---|---|---|---|
| light | **5.98** | 6.47 | 5.27 |
| dark | **17.37** | 18.78 | 15.30 |

This replaced the retired Rule C-1 directional register in `tokens.test.ts` — see §5.

---

## 4. Semantic colour: verified, not assumed

`--red` and `--green` are inherited from `tokens.css` untouched, and re-measured against the **new** surfaces because those moved underneath them:

| | value | page / paper / panel |
|---|---|---|
| light `--red` | `#b8463f` | 5.05 / 5.18 / 4.80 |
| light `--green` | `#2f7a52` | 5.00 / 5.13 / 4.75 |
| dark `--red` | `#f0a4a0` | 9.73 / 8.96 / 8.32 |
| dark `--green` | `#7fcfa1` | 10.49 / 9.66 / 8.97 |

All eight cells clear AA. 01-18's ink-ramp status badges are untouched — `--sp-hue` for `muted` / `secondary` / `primary` still reads `--ink-5` / `--ink-2` / `--ink`, which is exactly the fix that a monochrome theme wants and it needed no adjustment at all.

---

## 5. The `--ochre*` decision, and which gate informed it

**Kept, declared, as back-compat aliases onto the `--amber*` family** — `--ochre: var(--amber)`, `--ochre-d: var(--amber-d)`, plus `--ochre-d-strong` carrying its own AAA literal.

The alias direction is **reversed** from before. The accent literal now lives on `--amber`, the token components actually consume; `--ochre` points at it. That satisfies the plan's gate (no `--amber*: var(--ochre*)`) while keeping the names alive.

Two gates decided this, and neither could be satisfied by removal:

1. **`tests/visual/field-contract.spec.ts:148`** asserts `--amber-d === --ochre-d` by **computed value**. Removing `--ochre-d` makes it resolve to the empty string and the assertion fails. Because it compares substituted values rather than source text, reversing the alias direction satisfies it unchanged.
2. **`src/tokens.test.ts`'s contrast tier register** names `--ochre-d` in the 4.5:1 tier and `--ochre-d-strong` in the 7:1 tier, inside a **hard-counted 54-case set** whose count assertion exists precisely so a token dropped from a tier cannot produce a smaller green run.

### Two gates repaired, because this plan retired their premise

**(a) "smuggles no foreign accent into charcoal itself."** It built an `ochreRamp` from charcoal's ochre-named literals, required `size >= 4` as an anti-vacuity floor, and checked charcoal's own accent literals came from it. With `--ochre*` as aliases the ramp is empty and the floor fires — correctly.

Replaced with a **strictly stronger** claim needing no reference set: charcoal declares **no brand-accent literal at all** (channel spread ≥ 60 within hue 18–70). A set-difference gate can pass vacuously on an empty reference; "there are none" cannot. The anti-vacuity floor moved to the thing that can still be vacuous — the parse — asserting ≥ 20 literals were actually read.

**(b) The six directional `--ochre` cases.** They pinned six ratios proving `--ochre` was a mid-tone fill failing the text bar on five of six surfaces. That distinction does not exist in a monochrome theme.

Replaced by six cases pinning what the accent actually rests on, still at 2dp in both directions, keeping the count at 54:

```
light/dark  --ink-inverse on --amber                    5.98 / 17.37
light/dark  --amber on the pinned AppBar chip #1c1c1a   5.26 / 15.27
light/dark  --amber on the pinned Card chip  #1c1917    5.38 / 15.64
```

These four chip cases **lock G3 shut permanently**, which the register it replaces never did.

---

## 6. The default brand is unchanged — proven two ways

**1. Source.** `src/tokens.css` sha256 `3969eb9118ede5a0fe2d9b03febc0aebc5deecfdaed83cf50df2becc84a2ac7b`, identical before and after. `src/primitives.css` sha256 `3f81d7834d…`, identical — it was mutated twice for negative controls and restored from a `cp` backup with the hash verified each time, and `git status` confirms it byte-identical to HEAD.

**2. Computed, in a browser, brand asserted at the probed element.** Every token read from a real default-brand story:

| token | default light | default dark |
|---|---|---|
| `--amber` | `#f59e0b` | `#f59e0b` |
| `--amber-d` | `#b45309` | `#fbbf24` |
| `--amber-l` | `#fef3c7` | `#fef3c7` |
| `--amber-ink` | `#92400e` | `#f5c56b` |
| `--amber-soft` / `--amber-warm` | `#fef3c7` / `#fdf6e3` | `#3a2e10` / `#2a2110` |
| `--cream` | `#fcfcfc` | `#181818` |
| `--focus-ring-soft` | `rgba(180, 83, 9, 0.22)` | `rgba(251, 191, 36, 0.3)` |
| `--ochre` | **`""`** | **`""`** |
| `data-brand` attribute | `(none)` | `(none)` |

`--ochre` resolving to the empty string is the leak check: charcoal cannot reach the default brand. `data-brand` reading `(none)` is the 01-19.1 lesson applied — the brand asserted at the node, not inferred from the URL.

**3. Baselines.** **Zero** non-charcoal baselines moved, across the whole plan (`git diff 60921fa..HEAD`). Cairn depends on `^1.9.0` and on charcoal being additive; both hold.

---

## 7. Baselines: 489 moved, and a finding worth more than the re-record

| | count |
|---|---|
| charcoal baselines re-recorded | **489** |
| charcoal baselines byte-identical | 15 |
| **non-charcoal baselines moved** | **0** |
| total store | 1,019 |

**The 15 were checked, not assumed.** Each was PNG-decoded and scanned for every colour in both palettes; none contains a single pixel of either. They are stories whose captured region is Storybook's own chrome plus a component in pinned or semantic colour — skeletons, avatars, sticky notes, the danger dialogs.

**The italic axis was confirmed loaded before capturing**, per 01-20: four Playfair italic faces registered with one `loaded`, `document.fonts.check('italic …')` true, and advance width **187.89 vs 193** upright — which is what separates a real italic face from a synthesised oblique, since a slant transform preserves advance width.

### F-22-1 — the visual suite does not detect a light-mode repaint

The first capture used a bare `--update-snapshots`. Playwright **presets that to `changed`**, so it rewrites only snapshots that mismatch. It rewrote **56 files**. The other **448 charcoal baselines were judged MATCHING** against images recording the ochre palette, because the default `toHaveScreenshot` threshold of `0.2` in YIQ absorbs a cream-to-white surface shift.

Confirmed by mtime — 56 rewritten, 448 untouched — and corrected with `--update-snapshots=all`.

**The consequence is not about this plan.** It means a whole-palette change in light mode does not trip `test:visual`. Had I trusted the bare flag, I would have shipped 448 baselines recording a palette that no longer exists, and every future run would have compared against them and passed.

---

## 8. Deviations from plan

### `[Rule 1 - Bug]` Pure white paper disarmed the F-15-3 gate

**Found during:** Task 2, full `test:visual`.

The first draft set charcoal light `--cream-2` to `#FFFFFF` — the canonical modern light surface, and what the plan's proposed ramp specified. It silently disarmed `tests/visual/confirm-panel.spec.ts`, which proves ConfirmDialog's panel is painted from the cascade rather than from the hardcoded `rgba(255,255,255,.97)` the finding measured. Its light case discriminated **by value** (`expect(b).toBeLessThan(255)`), so a charcoal paper of exactly `#FFFFFF` made the correct paint and the defect paint indistinguishable.

**Measured, not reasoned.** Reinstating the hardcoded background in `primitives.css` left the charcoal-light case **green**; only the dark case failed, and only because it overrides through `--cream-2` in its own rule.

**Fix, both halves — either alone leaves a hole:**

- Paper is **`#FDFDFE`**. One unit off pure white is invisible to a reader and means the token can never collide with the literal a dropped-out component paints. The warm identity's never-pure-white rule therefore **survives**, for a different reason than the one that made it: not because pure white is wrong beside a cream page, but because it is the value a component falls back to.
- The guard no longer discriminates by value. It asserts the painted colour equals the **resolved `--panel` token** — what F-15-3 always wanted, and what the value proxy only stood in for.

**Proven three ways:** PASSES with the defect present under the old pure-white paper (the dead state); **FAILS** on the charcoal-light case with the defect present under the new paper; PASSES as shipped. `primitives.css` restored from `cp` backup with sha256 verified after each mutation.

Every light "paper" figure was then recomputed — nine comment blocks in `charcoal.css`, six rows of the tier register. **Commit:** `5b1b253`.

### `[Rule 3 - Blocking]` Twelve specs pinned the retired palette

Nine specs hardcoded `#b0722a` / `#161616` / `#f4f1ea` / `#d4a66d`; `confirm-panel` and `brand-probe` needed the paper change. All were **correct to trip**, so each was re-pointed rather than loosened, and each still asserts a **declared** value rather than cross-cell agreement.

Structural change: the accent was one ochre in both modes, so `Record<Brand, string>` sufficed; the monochrome accent inverts with the mode, so those became `Record<Brand, Record<Mode, string>>`.

**A lesson about the sweep itself.** `confirm-panel` was missed by my first pass because it pins surfaces as **decimal channel values** (`toBeCloseTo(30, 0)`), not hexes — invisible to a hex grep. Only the full `test:visual` found it. **Commits:** `3d2cf7f`, `5b1b253`.

### `[Rule 2 - Missing]` `--focus` unbound from the accent

The plan specified `--focus` as *"near-white on dark, near-black on light"*, which `--amber-d` is not (`#95959b` / `#64646a`). Rather than distort the accent-text step, `--focus` was bound to `--ink`. Nothing asserted `--focus === --ochre-d`, so this is additive. The `color-mix` derivation of `--focus-ring-soft` from `--focus` that 01-FIX introduced is preserved and follows automatically.

### `[Rule 3 - Blocking]` `--amber-ink` was the last amber→ochre alias

The plan's gate 2 caught `--amber-ink: var(--ochre-d-strong)`, inherited from G4's fix. Re-pointed to `var(--ink-3)`. Re-verified across all four consumers, composited by hand — worst of the three surface stops: **5.89 / 4.99 / 5.32 / 7.56**, all clear of AA.

---

## 9. Findings raised (not fixed)

**F-22-1** — the visual suite's threshold hides a light-mode repaint. §7.

**F-22-2 — `--amber` painted as small text fails AA in light mode**, at **3.11 / 3.19 / 2.96**. Five rules do it, the most visible being `.ds-atom-table-sort-indicator`. **Not a regression** — the ochre it replaces measured 3.52 / 3.78 / 3.28 and also failed — and **not fixable from the token layer**, for the reason in §2: the value that would make it AA text on a near-white page puts it below AA on the pinned near-black chips, and the bands do not intersect. The theme documents the accent as a fill, never text; these five rules disagree. Fixing it means pointing them at `--amber-d` in `primitives.css`.

**F-22-3 — `.ds-atom-btn[data-variant="primary"]:hover` hardcodes `color: #fff`** over `var(--amber-d)`. Charcoal dark reads **2.98** against **3.01** before, so it is held level rather than deepened — `--amber-d` was chosen at the lightness that preserves it. The **default brand has the same defect worse, at 1.62**, because its own dark `--amber-d` is `#fbbf24`. This is the `01-FIX-focus-ring-soft` lesson recurring: *an alias cannot reach a literal*. One line in `primitives.css` fixes both brands — `.dark .ds-atom-btn[data-variant="primary"]:hover { color: var(--ink-inverse); }` — and no baseline captures a hover state, so it would move nothing.

**F-22-4 — warning surfaces keep an amber wash in dark mode.** `AlertBanner`, `Toast` and `DateRangePicker` override to `rgba(245,158,11,…)` literals under `.dark`, beyond any theme's reach. Measured composited backdrops in charcoal dark: `#241c0f`, `#37270e`, `#2d2519`, `#3f2f17`. They remain legible — the ink over them clears AA on every stop — but **charcoal dark is not strictly monochrome for those three components**. Arguably correct, since warning is semantic; recorded so it is a decision rather than a surprise.

**F-22-5 — the semantic status triad lost its middle colour.** `--amber-vivid` has three consumers and all three are status dots in a red/amber/green triad: `Badge[data-tone=warning]`'s dot, `DataGrid`'s `medium` priority beside `high → --red-vivid`, and `Avatar`'s `away`. It is neutralised to `#8e8e97`, so charcoal's triad is red / grey / green. **This follows the plan**, whose stated truth scopes semantic colour to *"error and success"* and whose gate exempts only `--red*` and `--green*`. Recording it because it is the one place where "semantic colour survives" is not quite the whole story — the previous theme had already replaced it with ochre, so this is the second step of the same erosion, not the first. Shape and label still distinguish the states; colour alone never did.

---

## 9a. DS-02 and DS-03 deliberately NOT marked complete

The plan's frontmatter claims `requirements: [DS-02, DS-03]`. **Neither was ticked**, because both were written against the ochre identity that this plan retired, and ticking them would be the flattering error this phase has already made once.

**DS-02** — *"Muted text passes WCAG AAA (7:1) in both modes against all three surfaces … and **every accent-as-text usage passes AA at minimum**."*
The first clause is **met and was deliberately protected**: `--ink-3` reads 7.44 / 7.63 / 7.06 light and 8.21 / 7.56 / 7.02 dark, which is why the chosen candidate's muted step was rejected as too light (§1). The second clause is **measurably false** — F-22-2, `--amber` as text in light mode at 3.11 / 3.19 / 2.96 — and §2 shows it is unreachable from the token layer while G3's pinned chips also have to clear AA. Closing DS-02 needs the five offending rules in `primitives.css` re-pointed at `--amber-d`, which is a component change this plan's scope forbids.

**DS-03** — *"`--ochre-d` for **focus rings**, fills and display type … `--ochre-d-strong` for small-label accent text that must reach AAA."*
`--ochre-d-strong` reaches AAA in both modes (7.92 / 8.13 / 7.52 and 9.00 / 8.29 / 7.70) and both tokens exist under a written rule. But `--ochre-d` is **no longer bound to the focus ring** — `--focus` is `--ink` now, because a neutral accent is a mid grey and made a weaker indicator than the page's own text colour. The requirement's letter therefore no longer describes what ships.

**Both need re-stating by a human against the monochrome identity, not ticking.** They are left `Pending` in `REQUIREMENTS.md` with the traceability table unchanged.

---

## 10. Gates, from the five commits, reported separately

| gate | exit | result |
|---|---|---|
| `build` | **0** | clean |
| `test` | **0** | **1949 passed / 123 files** — the expected baseline, unchanged |
| `check` | **0** | biome |
| `typecheck` | **0** | both tsconfigs |
| `css:check` | **0** | **79 files, round-trip byte-exact** |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites |
| `DS_BRAND=charcoal test:a11y` | **0** | **508 / 508**, 84 suites — was 11 failed / 497 passed |
| `test:visual` | 1 | 135 passed, 2 failed — both documented flakes, proven below |

**Both `test:visual` failures are the known ones and neither is reachable by this change:**

- `interaction-richtext--dark-mode.png`, **138 pixels, ratio 0.01** — the exact signature `01-FIX-focus-ring-soft.md` §8 recorded. It is a **default-brand** baseline (no `--charcoal` suffix) and `git status` confirms I never touched it; zero non-charcoal baselines moved in this plan.
- `richtext-marks.spec.ts` "bolding a phrase emits bold-only markdown" — the file contains **zero** references to `charcoal`, `--amber`, `--cream` or `--ochre`; it is a markdown-serialisation selection-boundary race (`"**Reduc**ed"` vs `"**Reduced**"`). It **passes in isolation** (15/15) and fails only in the full suite, which is the documented "suite state, not parallelism" discriminator.

`data-display-tabs--narrow-overflow--charcoal`, the other documented flake, did **not** fail — it was re-recorded.

---

## 11. Method notes

**The compositor was verified before any number was trusted.** `getComputedStyle` does not composite alpha. Checked against the recorded Tabs triple first — `--surf-2` `rgba(255,255,255,0.055)` over the three default-dark stops with `--ink-3` `#919191`:

| stop | composited | recorded | ratio | recorded |
|---|---|---|---|---|
| `#181818` | `#252525` | `#252525` | **4.882** | 4.882 |
| `#1f1f1f` | `#2b2b2b` | `#2b2b2b` | **4.473** | 4.473 |
| `#2a2a2a` | `#363636` | `#363636` | **3.851** | 3.851 |

**A calibration detail that mattered:** rounding the composite to integer channels reproduces the hexes but misses the ratios by ~0.02 (4.863 vs 4.882). The recorded figures use the **unrounded** composite. Negative control: treating `--surf-2` as opaque collapses all three to `5.634 / 5.23 / 4.554` and cannot produce the recorded set.

**Every mutation used a Python assert-one-occurrence guard** and was restored from a `cp` backup confirmed by `shasum -a 256`. No `git checkout -- <file>`, no `git checkout-index`, no `git stash`, no `git reset`, no `git worktree`, no `git clean` at any point. (`husky`/`lint-staged` runs its own `git stash` on every commit — expected tooling, and it reformatted two commits' staged files, after which every gate was re-run against the committed bytes.)

**Servers.** Akhil's Storybook on 6006 and comparison page on 5173 were both already running and were **reused, never killed**. The 5173 page turned out to hold the four candidate palettes verbatim, which is where candidate C's exact values came from. Before trusting any measurement, the running Storybook was checked to be serving the **new** CSS — it was, via Vite HMR — because a stale dev server would have poisoned both the a11y numbers and the baselines.

---

## Self-Check: PASSED

Files verified present:

- `FOUND: ../design-system/src/themes/charcoal.css`
- `FOUND: ../design-system/src/tokens.test.ts`
- `FOUND: ../design-system/CHANGELOG.md`
- `FOUND: ../design-system/tests/visual/confirm-panel.spec.ts`

Commits verified in `git log`: `c1493bc`, `3d2cf7f`, `30e41eb`, `5b1b253`, `e7b182f` — all present on `charcoal-theme`, which is 82 commits ahead of `main`. Working tree tracked-clean; the only untracked path is the known-harmless `design_handoff/design_handoff_ds_overview/`.
