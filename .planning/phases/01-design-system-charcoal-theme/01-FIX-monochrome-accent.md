# The monochrome accent — a grey primary button, and the three things holding it there

**Status: fixed, gated and committed.** Found by Akhil's eye during the 01-20
Task 3 review of the theme 01-22 had just shipped — *"its grey buttons, should be
white no? or black"*. He was right, and the interesting part is not the fix but
what the fix had to move first: the light accent was pinned into a mid band by
three independent consumer groups whose requirements do not intersect, so this
was never a token-layer change, and 01-22 was correct to decline to make it one.

`$DS` = `design-system`, branch `charcoal-theme`. Started at **`e7b182f`** (82
ahead of `main`), finished at **`b9f7e73`** (87 ahead). `package.json` stays
**1.11.4**. Nothing published, tagged or merged; zero tags point at HEAD; the 164
pending renames are unapplied; **`src/tokens.css` is byte-for-byte untouched**,
sha256 `3969eb91…`, the same hash 01-22 recorded.

| commit | what |
|---|---|
| `005ae2a` | `fix(charcoal): put the light accent at the ink end, and move what was holding it there` |
| `435dbc5` | `test: re-point the accent register and the brand specs at the inverting accent` |
| `8ce0d69` | `test(visual): re-record the 175 charcoal baselines the inverting accent moves` |
| `c3d3469` | `docs(charcoal): correct ten figures I wrote before the measurement returned` |
| `b9f7e73` | `docs(changelog): record the accent that stopped reading as disabled, and what it cost` |

The headline, one line each:

- **The light primary button measured 3.11:1 against its own page.** Not a taste
  problem. A non-text control needs 3:1 to be *seen*; the fill was under it. It
  now reads **18.07**, and its label goes **5.98 → 18.07**.
- **The accent could not move alone, and the reason is a measured impossibility,
  not a preference.** Three consumer groups bound it, and no value of `--amber`
  satisfies all three at once. Every one of them is a component change.
- **Two 1.00:1 controls were already shipping in charcoal dark** — invisible, and
  green on every gate, because axe-core returns `incomplete`/`equalRatio` rather
  than a violation for a ratio that rounds to 1.00. This change surfaces them
  because it would have created two more in light.
- **`interaction-richtext--dark-mode.png` is not a flake.** It is a stale
  default-brand baseline recording an accessibility defect that was fixed three
  plans ago, and two write-ups have classified it as flaky by its pixel
  signature. Proved from git. **Not re-recorded** — §9.

---

## 1. The compositor was verified before any number here was trusted

`getComputedStyle` does not composite alpha, and four figures below are washes.
Calibrated against the recorded Tabs triple *before* being pointed at anything —
`--surf-2` `rgba(255,255,255,0.055)` over the three default-dark stops with
`--ink-3` `#919191`:

| stop | composited | recorded | ratio | recorded | |
|---|---|---|---|---|---|
| `#181818` | `#252525` | `#252525` | **4.882** | 4.882 | MATCH |
| `#1f1f1f` | `#2b2b2b` | `#2b2b2b` | **4.473** | 4.473 | MATCH |
| `#2a2a2a` | `#363636` | `#363636` | **3.851** | 3.851 | MATCH |

**Two negative controls, both reproducing the documented failure mode.** Treating
`--surf-2` as opaque collapses all three stops to a single `3.152` — it cannot
produce three *different* numbers, let alone the right ones. Rounding the
composite to integer channels reproduces the hexes but misses every ratio by
~0.019 (4.863 vs 4.882), which is why every figure below uses the **unrounded**
composite.

---

## 2. The defect, stated as a measurement

Charcoal's two blocks mapped the accent asymmetrically:

```
LIGHT   --amber #8e8e97   --ink #111114   page #fafafb
DARK    --amber #f2f2f4   --ink #f2f2f4   page #0d0d0f
```

Dark's accent **is** its ink. Light's was a mid grey held two steps away from it.

| charcoal light, before | measured |
|---|---|
| primary fill `#8e8e97` against the page `#fafafb` | **3.11** — under the 3:1 SC 1.4.11 floor |
| primary label `#0d0d0f` on that fill | 5.98 |

A control whose fill does not clear the non-text floor against its own page is
not a weak-looking control; it is one whose *boundary is not perceivable*. In a
monochrome system the primary action makes the same claim the primary text does —
maximum contrast against the page — so the light block was simply wrong and the
dark block was right.

---

## 3. Why it had been held there — three groups, and the bands do not intersect

This is the part worth more than the repair, because it is why the obvious
one-line change is not available.

**Group A — every filled control paints a near-black foreground on the accent.**
Nine sites read `--ink-inverse`, which charcoal pinned near-black in *both*
blocks; three more pinned their own literals. At the ink end all twelve collapse:

| site | ink | on the new fill `#111114` |
|---|---|---|
| `--ink-inverse` (9 sites incl. the primary button) | `#0d0d0f` | **1.03** |
| `SegmentedControl` active label | `#000` | **1.11** |
| `MultiSelect` tick | `#1f1b17` | **1.10** |
| `Checkbox` tick | `#1c1917` | **1.08** |

**Group B — two components pin a near-black chip and paint the accent as TEXT on
it.** `AppBar`'s `DefaultLogo` hardcodes `#1c1c1a`; `Card`'s dark variant
hardcodes `#1c1917`. These are literals no theme can reach, so the theme has to
come to them — which is finding G3, and it is what constrained the whole light
ramp in 01-22. At the ink end: **1.10** and **1.08**.

**Group C — `Snackbar` fills from `--ink` and accents from `--amber`.** Once the
two alias, the action label and the tone stripe are painted in their own
background.

**The arithmetic that closes the question.** Keeping Group A alive requires the
fill to stay light enough to carry a near-black ink at 4.5:1, i.e. relative
luminance ≥ **0.2007**, which is about `#7a7a82` — still a mid grey, still
reading as disabled. Group B wants it lighter still. There is no value of
`--amber` that gives a black button *and* a legible chip. **The bands do not
intersect**, exactly as 01-22's §2 recorded for the warm palette, and the
consequence is the same: the accent is not the thing to move on its own.

So all three groups moved, and none of the moves touches `tokens.css`.

---

## 4. The chosen value — a token reference, in both blocks, and why

```css
:root[data-brand="charcoal"]      { --amber: var(--ink); }   /* was #8e8e97 */
:root[data-brand="charcoal"].dark { --amber: var(--ink); }   /* was #f2f2f4 */
```

**A token reference, not a literal — and the dark block was changed too, although
its rendered value did not move.** The instruction was to check whether
`var(--ink)` is correct here, since dark "already effectively does that". It did
not: dark declared `#f2f2f4` as its own literal that *happened* to equal `--ink`.
Writing both blocks as the same alias makes the two modes identical **in source
text**, which is the strongest available statement of the symmetry — and the
defect's shape was precisely an asymmetry between the blocks.

Against the file's own doctrine, which is explicit that you alias only when the
roles are genuinely the same and duplicate the value when they merely coincide
(it keeps dark's `--ink-inverse` `#0d0d0f` separate from dark's `--cream`
`#0d0d0f` for exactly that reason): **the accent and the primary ink are the same
role here.** Under a monochrome identity "the accent" *means* "maximum contrast
against the page", which is what `--ink` is. It is a rule, not a coincidence, and
`--focus: var(--ink)` is the established precedent in the same file.

It also means the `--focus-ring-soft` lesson cannot recur on this token. An alias
cannot reach a literal — so there is now no literal here to reach.

### `--amber-d` is UNCHANGED, and that is the measured answer, not an omission

The instruction was to carry the hover step down with the fill so hover still
reads as a deliberate step. Measured in L\*, moving it makes the two modes *less*
symmetric, not more:

| | fill L\* | hover L\* | ΔL\* |
|---|---|---|---|
| light, **before** | 59.28 | 42.56 | 16.72 |
| light, **shipped** | 5.15 | 42.56 | **37.40** |
| dark (untouched) | 95.54 | 61.87 | **33.67** |

Leaving `--amber-d` where it is turns the light hover from a 16.72 darkening into
a **37.40 lift**, against dark's 33.67 darkening — near-symmetric in magnitude and
symmetric in direction, since both now move toward mid-grey. Carrying it down to
preserve the *old* step magnitude would have produced ΔL\* ≈ 19.9, half of dark's.

It also has seven text consumers that would have moved with it. It reads 5.63 /
5.78 / 5.35 as accent text and carries the hover rule's hardcoded white at
**5.88**. Nothing about them changes.

### The two companion token moves

- **`--ink-inverse` light: `#0d0d0f` → `#fafafb`.** It inks the accent fill, so
  once the fill inverts it must. Its name was always the correct description of
  the role; only its charcoal values contradicted it. It measures **18.07** on
  the fill in light against **17.37** in dark — the same control within 0.7 of
  itself across modes.
- **`--amber-ink` light: `var(--ink-inverse)` → `var(--ink-3)`.** It is the ink
  for a *tinted pill*, never a solid fill, so it had to come off `--ink-inverse`
  before that token began to move — a near-white on the pale washes these pills
  use measures **1.12**. Both blocks now say `var(--ink-3)`. On the warning
  badge's composited `rgba(245,158,11,0.15)` wash it reads **6.67 / 6.82 / 6.37**,
  all clear of AA (was 16.68 / 17.06 / 15.93).

---

## 5. The 63 `--amber` consumers at ink weight, classified

Sweeping `primitives.css` for `var(--amber)` in **code** (comments stripped)
returns **63** after this change, from 66 before — the three that left are the
snackbar's action label, its hover and its warning stripe, which moved to
`--amber-vivid` (§6). `--amber-d` has a further 14 and none of them moved.

### FILL — 41 sites. Want full contrast; all improve.

`iconbtn[primary]` · `checkbox-box:checked` ×2 · `radio-dot` · `toggle-track` ·
`range-fill` · `progress-fill` · `datepicker-cell` ×6 · `split-chevron` ·
`multiselect-checkbox` · `segmented-btn[active]` ×2 · `timeline-dot` ·
`carousel-dot` ×2 · `tabs-trigger[active]` ×3 · `table-row[selected]` ×2 ·
`table-resize-handle` · `calendar-*` ×9 · `richtext-toolbar [active]` ·
`wizard-dot` · `coachmark-dot` · `sortable-overlay-ghost` · `focalpoint-dot` ·
`statuspill[accent]` (`--sp-hue`)

Nothing here is too heavy — a fill at the ink end is the point. Two got *fixed*
in passing, both silently broken before:

| site | before (charcoal light) | after |
|---|---|---|
| `wizard-dot[active]`, `color: var(--cream)` on the fill | **3.11** | **18.07** |
| `toggle-thumb` `#fff` on the checked track | **3.25** | **18.85** |

### BORDER — 15 sites. This is where "too heavy" could live. One flagged.

| site | verdict at ink weight |
|---|---|
| `checkbox-box:checked` ×2, `multiselect-checkbox` | same colour as the fill it rings — no change in appearance |
| `radio-box:checked` ×2 | a near-black ring around the checked radio; correct, and matches the dot inside it |
| `select[open]`, `select[solid][open]`, `multiselect[open]`, `multiselect[solid][open]` | the open-state boundary, at 18.07 on the page. Heavy — but `--focus` is already `--ink`, so a near-black "this control is open" edge is *consistent* rather than novel |
| `calendar-weekcell[today]` | a 1px near-black ring on today's column. Reads stronger than before; still one hairline |
| `inlineedit-input`, `sortable-item[dragging]` | edit and drag affordances. Heavy is the intent |
| `range-thumb`, `border: 2px solid var(--amber)` | **flagged, cosmetic.** The thumb is `#fff` with a 2px accent ring, and the ring now sits at **1.00** against the fill it rests on — it is absorbed. The knob itself went 3.25 → 18.85, so the control reads *better*; the ring simply no longer does anything on the filled side. Not an a11y issue (the knob's edge is carried by the fill/track boundary) and not fixed here, because fixing it means deciding what a thumb ring is *for*. Recorded as **F-FIX-3**. |
| `ProseMirror blockquote` `border-left: 3px` | **the most debatable, and shipped as-is.** A 3px near-black rule beside quoted text, at 18.07 against the page where it was 3.11. Under an editorial serif identity whose display face is Playfair, a quote rule at ink weight is a defensible typographic choice rather than an accident — and it is now the same weight as the ink beside it, which is what a monochrome theme means. Flagged for the eye, not for a gate. |

### TEXT — 7 sites. All improve, and this is what closes DS-02.

`datepicker-trigger.is-open` (dark only) · `select-check` ·
`table-sort-indicator` · `richtext-toolbar [active]` · `ProseMirror a` and
`a:hover` · `link[default]:hover` (`text-decoration-color`)

Measured on the composited surface where relevant: the richtext toolbar's active
label sits on a `color-mix(--amber 12%, transparent)` wash, which composites to
`#e1e1e2` in light and carries the label at **14.38** (dark: `#313134`, **11.55**).

---

## 6. What moved at the component layer, and what it cost the default brand

Eight declarations across five files. **Every one is byte-identical in the default
brand**, and that is by construction rather than by luck: each literal replaced
resolves to the value that brand already painted.

| site | was | now | charcoal light | charcoal dark | default |
|---|---|---|---|---|---|
| `SegmentedControl` active label | `#000` | `var(--ink-inverse)` | 1.11 → **18.07** | 18.78 (`.dark` keeps its literal) | 9.78 → 8.14, both AA |
| `MultiSelect` tick | `#1f1b17` | `var(--ink-inverse)` | 1.10 → **18.07** | 16.1 → 17.37 | 7.97 → **8.14** |
| `Checkbox` tick (inline) | `#1c1917` | `var(--ink-inverse)` | 1.08 → **18.07** | 16.1 → 17.37 | **unchanged** |
| `ProseMirror mark` ink | `var(--ink-inverse)` | `#1c1917` pinned | 1.12 avoided; 16.68 → **15.03** | same | **unchanged** |
| `datepicker` selected-cell event dot | `var(--ink)` | `var(--ink-inverse)` | 1.00 → **18.07** | **1.00 → 17.37** | 7.95 → **8.14** |
| `AppBar` `DefaultLogo` ink | `var(--amber)` | `var(--amber-vivid)` | 1.10 → **5.26** | 15.27 → **5.26** | **unchanged** |
| `Card` dark-variant ink + bar (story) | `var(--amber)` | `var(--amber-vivid)` | 1.08 → **5.38** | 15.64 → **5.38** | **unchanged** |
| `Snackbar` action ×2 + warning stripe | `var(--amber)` | `var(--amber-vivid)` | 5.80 (held) | **1.00 → 2.90** | **unchanged** |

### The pinned-highlight rule, applied to the rule that established it

`.ProseMirror mark` is the G5 case: *a rule that pins a background must pin its
foreground*. It had been repaired by pointing at `--ink-inverse`, on the premise
that the token was mode-independent in every brand. That premise is now false, and
reaching for it would have put `#fafafb` on `#fef08a` at **1.12** — a fresh
instance of the exact defect the rule exists to prevent, arriving through the
token that was standing in for it. It now pins a literal, which is what the rule
actually says.

### `--amber-vivid` turns out to be the token G3 said did not exist

The a11y triage recorded G3 as *"a token gap, not a typo… fixing G3 properly means
adding a token to the theme's public surface,"* and deferred it past the beta.
It does not need one. `--amber-vivid` is declared **identically in both charcoal
blocks** — the design system documents that as its property, and charcoal's own
comment already called it *"one value that stays visible in both modes."* That is
precisely and only what a foreground on a pinned background needs. Nobody spotted
it because under the warm identity `--amber-vivid` equals `--amber` in the default
brand, so the distinction between them was invisible.

Which is also why the default brand does not move: `--amber-vivid` is `#f59e0b`
there in **both** modes, exactly what `--amber` resolved to at those three sites.

### `Calendar` chips — 34 readings, found by the probe, not by reasoning

`ev.color` lands as an inline `background` while the label came from the
stylesheet. A brand whose ink moves therefore puts a near-white label on a
caller-supplied mid-tone: **34 violations between 2.18 and 3.60** across seven
stories. The chip now pins its ink beside its background, chosen by measured
ratio against the design system's two pinned inks.

The first fix was wrong and the probe caught that too. Deferring to the
stylesheet for unparseable input left all 34 in place, because **every** shipped
story passes a `var(--blue-vivid, #1d6aff)`-shaped expression rather than a hex —
and the literal inside such a fallback is *not* what the token resolves to
(`--blue-vivid` renders `#3b82f6`). Reading it would have measured the wrong
colour. It falls back to the dark ink instead, which is what the default brand
already painted on every one of these chips.

Four story events passed `var(--amber, #f59e0b)` *as* an event colour. That is the
chip's own default fill, and passing it explicitly is what made the two paths
indistinguishable; those four now omit `color` and render byte-identically in the
default brand.

---

## 7. Before and after, browser-measured, brand asserted at the probed element

Measured on `inputs-button--variants` and `inputs-button--dark-mode`, reading
`--ochre` (charcoal-only) **and** `--cream` (a neutral) at the probed node, per
the 01-19.1 lesson that a charcoal-only token can read correctly at a node whose
neutrals are shadowed. The `before` column comes from a real second run against
the pre-change `charcoal.css`, restored from a `cp` backup and re-verified by
sha256 afterwards — not from arithmetic.

### charcoal LIGHT — `data-brand=charcoal`, `--ochre` `#8e8e97` → `#111114`, `--cream` `#fafafb` both runs

| | fill | label | label/fill | fill/page | border | border/page |
|---|---|---|---|---|---|---|
| primary **before** | `#8e8e97` | `#0d0d0f` | 5.98 | **3.11** | `#64646a` | 5.63 |
| primary **after** | `#111114` | `#fafafb` | **18.07** | **18.07** | `#64646a` | 5.63 |
| secondary **before** | `#fdfdfe` | `#424248` | 9.82 | 1.03 | `#88888e` | 3.38 |
| secondary **after** | `#fdfdfe` | `#424248` | **9.82** | **1.03** | `#88888e` | **3.38** |

### charcoal DARK — `--ochre` `#f2f2f4` both runs, `--cream` `#0d0d0f`

| | fill | label | label/fill | fill/page | border | border/page |
|---|---|---|---|---|---|---|
| primary **before** | `#f2f2f4` | `#0d0d0f` | 17.37 | 17.37 | `#95959b` | 6.52 |
| primary **after** | `#f2f2f4` | `#0d0d0f` | **17.37** | **17.37** | `#95959b` | **6.52** |
| secondary **before** | `#17171a` | `#bfbfc5` | 9.77 | 1.09 | `#6d6d73` | 3.78 |
| secondary **after** | `#17171a` | `#bfbfc5` | **9.77** | **1.09** | `#6d6d73` | **3.78** |

**Secondary does not move in either mode**, in any figure — it is built from
`--panel` / `--ink-2` / `--wire` and touches no accent token. Recorded because
"nothing moved" is a result, and because it is the control the primary is judged
against: the light primary went from *below* secondary's boundary contrast (3.11
vs 3.38) to five times above it.

### Accent borders that changed

| border | before | after |
|---|---|---|
| `select[open]` / `multiselect[open]`, on the light page | 3.11 | **18.07** |
| `blockquote border-left`, on the light page | 3.11 | **18.07** |
| `range-thumb` ring, against its own fill | 3.25 | **1.00** — flagged, §5 |
| primary button border (`--amber-d`), both modes | 5.63 / 6.52 | **unchanged** |

---

## 8. DS-02: the figure changed, and the clause it made false is now true

01-22 logged **F-22-2** and left **DS-02** unticked on one measurable clause:
*"every accent-as-text usage passes AA at minimum"*, false at **3.11 / 3.19 /
2.96** in charcoal light and declared *"not fixable from the token layer, because
the value that would make it AA text on a near-white page puts it below AA on the
pinned near-black chips, and the bands do not intersect."*

That analysis was right, and this change dissolves it by moving the chips off the
accent rather than by finding an impossible value.

| `--amber` as text, page / paper / panel | before | after |
|---|---|---|
| charcoal **light** | 3.11 / 3.19 / 2.96 | **18.07 / 18.54 / 17.16** |
| charcoal **dark** | 17.37 / 16.00 / 14.86 | **unchanged** |

**F-22-2 is dissolved**, and its five named offenders — most visibly
`.ds-atom-table-sort-indicator` — clear AAA rather than merely AA. Verified
empirically, not just arithmetically: the browser sweep in §10 returns **zero**
`color-contrast` violations across all 508 stories in charcoal, which is where
those five rules live.

**DS-02 is still not ticked.** Its first clause (muted text at AAA) holds
unchanged at 7.44 / 7.63 / 7.06 light and 8.21 / 7.56 / 7.02 dark. Its second
clause is now true. But 01-22's reason for leaving it `Pending` was that the
requirement *"was written against the ochre identity this plan retired, and
ticking it would be the flattering error this phase has already made once."* That
reason is untouched by this change — the requirement's wording still describes a
theme that no longer exists. **It needs re-stating by a human against the
monochrome identity, not ticking**, and I have left `REQUIREMENTS.md` alone.

---

## 9. The default brand — proven three ways, and one thing that did not move

**1. Source.** `src/tokens.css` sha256
`3969eb9118ede5a0fe2d9b03febc0aebc5deecfdaed83cf50df2becc84a2ac7b` — identical
before and after, and identical to what 01-22 recorded. `git diff` across all
five commits touches it zero times. Cairn on `^1.9.0` is unaffected; the version
stays `1.11.4` and nothing was published or tagged.

**2. Computed, in a browser, brand asserted at the probed element.** Read from
real default-brand stories on `localhost:6006`:

| token | default light | default dark |
|---|---|---|
| `--amber` | `#f59e0b` | `#f59e0b` |
| `--amber-d` | `#b45309` | `#fbbf24` |
| `--amber-ink` | `#92400e` | `#f5c56b` |
| `--ink-inverse` | `#1c1917` | `#1c1917` |
| `--cream` | `#fcfcfc` | `#181818` |
| `--ochre` | **`""`** | **`""`** |
| `data-brand` attribute | `(none)` | `(none)` |

`--ochre` resolving to the empty string is the leak check — charcoal cannot reach
the default brand. And the whole default-brand button ladder is unchanged:
primary 8.14 label / 2.09 fill-on-page in light and 8.14 / 8.27 in dark, secondary
7.63 and 7.42, danger 4.83 in both.

**3. Baselines. Zero non-charcoal baselines moved** — §10.

### The one that did not move, and should have: `interaction-richtext--dark-mode`

`test:visual` exits 1 on a single mismatch, **138 pixels, ratio 0.01**, on a
default-brand baseline. Both prior write-ups record that exact signature as a
known flake. **It is not a flake, and this is the finding of the whole exercise
about how we read a red gate.**

Decoding both PNGs by hand: 368 raw pixels differ, in one 56×14 box at (403,93),
and the colour pairs are `#ededeb → #201d19` — near-white expected, near-black
actual, on the `#fef08a` highlight.

Traced in git rather than argued:

- the baseline was last written at **`a9ec1ef`**;
- at that commit `.ProseMirror mark` declared **`color: inherit`** — the G5
  defect, which measured **1.006:1** in the default brand;
- **`f1767f2`** fixed it to `var(--ink-inverse)` and never re-recorded this image.

So the baseline records a shipped accessibility defect, the rendering has been
correct since `f1767f2`, and the mismatch is a **stale expectation**, not
non-determinism. My own change cannot be responsible: it moved this rule from
`var(--ink-inverse)` to `#1c1917`, and the default brand resolves
`--ink-inverse` to `#1c1917` in **both** blocks.

**Not re-recorded**, deliberately. The instruction was that zero non-charcoal
baselines may move and that any movement should stop and report. Re-recording it
is a one-command decision, and it is yours. Filed as **F-FIX-1**.

`richtext-marks.spec.ts`, the other documented flake, **passed** in the final run.

---

## 10. Gates, from the shipped commit, each exit code separately

| gate | exit | result |
|---|---|---|
| `build` | **0** | clean |
| `test` | **0** | **1951 passed / 123 files** — was 1949; +2 from the new register cases |
| `check` | **0** | biome |
| `typecheck` | **0** | both tsconfigs |
| `css:check` | **0** | **79 files, round-trip byte-exact** |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites |
| `DS_BRAND=charcoal test:a11y` | **0** | **508 / 508**, 84 suites — **held**, not regressed |
| `test:visual` | 1 | **136 passed, 1 failed** — the stale default baseline in §9, and nothing else |

### The gate `test:a11y` cannot be, and the sweep that can

axe returns `incomplete` with messageKey `equalRatio` rather than a violation for
a ratio that rounds to 1.00, and `checkA11y` only fails on violations. A control
painted in its own background is therefore **invisible to the committed gate in
every brand** — the codebase already documents this, in the comment above the very
rule that ships it.

Since this change makes `--amber` alias `--ink`, that blind spot is not academic
here: it would have rewarded shipping an invisible snackbar action. So the sweep
was run under a probe that treats `equalRatio` incompletes as failures, over all
508 stories, in both brands:

| | violations | `equalRatio` incompletes |
|---|---|---|
| charcoal, **before** | 7 (scrim/animation artefacts) | 0 |
| charcoal, **first attempt** | 41 | 0 |
| charcoal, **second attempt** | 5 | 0 |
| charcoal, **shipped** | **0** | **0** |
| default, **shipped** | **0** | **0** |

The 41 and the 5 are the Calendar chips of §6 — found by the probe, twice, and
neither would have been caught by anything else in the repo. The `before` 7 are
scrim-composited readings on `overlays-modal--not-closable` and
`overlays-commandpalette--filtered-empty` that settle out with a longer wait;
one of them, `button[data-variant="primary"]` at **2.34**, is the grey button
this whole fix is about, measured through a modal scrim.

The two 1.00:1 controls the code contained in charcoal dark — the snackbar action
and the datepicker event dot — do **not** appear in the `before` column, because
no story renders them in a swept state. They were found by reading the cascade,
not by the sweep, and they are fixed.

---

## 11. Every new gate proved three ways, then walked at

The register in `src/tokens.test.ts` grows from **54 to 56** cases, and the count
assertion says so. Each mutation was applied with a Python assert-one-occurrence
guard, **verified present in the file before the run**, and restored from a `cp`
backup with sha256 confirmed after — `44b797a8…` every time, with `git status`
clean.

| # | mutation | result |
|---|---|---|
| 0 | **pre-fix** — the register as 01-22 shipped it, against the new tokens | **FAIL**, 3 cases |
| 1 | revert the fix: light accent back to `#8e8e97` | **FAIL** |
| 2 | flatten `--amber` onto one near-black value in *both* blocks | **FAIL** — `dark --ink-inverse on --amber = 1.03`, and the inversion case |
| 3 | light accent near-black (`#131318`) but decoupled from `--ink` | **FAIL** — `17.75` ≠ `18.07`, and `#131318` ≠ `--ink` |
| 4 | make `--amber-vivid` mode-dependent in the light block only | **FAIL** — both chip cases *and* the mode-stability case |
| 5 | **shipped** | **PASS** |

Cases 2, 3 and 4 are the walk-throughs, and each exists because the obvious
"simplification" defeats a weaker gate. Case 2 is the one that matters: asserting
only "the chip token is one value across modes" is satisfied by flattening the
accent onto one value too — which is the change that put the grey button on the
page. So `--amber` is asserted to be **different** between blocks *and* to equal
`--ink` at both ends.

**The guard earned its place during this run.** Mutation 4's first form did not
match the file, and the assert fired rather than the suite going green on an
unmutated file — a "123 passed" that would have read exactly like a proof.

`pinned-surface-ink.spec.ts` was **strengthened, not adjusted**. It asserted
`--ink-inverse` is mode-independent; that is now false under charcoal, and the
file's own subject is the reason. It now asserts the mark's ink is a pinned
literal in all four brand × mode cells, asserts `--ink` still flips (without which
the spec is vacuous), and additionally asserts that charcoal's `--ink-inverse`
**does** invert — so pointing the mark back at it is a red test rather than a
tempting simplification.

**Can a grep walk through any of this?** No — every case resolves the `var()`
chain from the parsed stylesheet and measures, or reads a computed value from a
live browser. The one thing a grep *could* satisfy — "charcoal names
`--amber-vivid` somewhere" — is not asserted anywhere.

---

## 12. Baselines: 175 moved, 0 non-charcoal, and the flag form matters

Captured with **`--update-snapshots=all`**, never the bare flag. 01-22 measured
that the bare form presets to `changed` and silently judged 448 charcoal
baselines "matching" against a completely different palette, because the default
`toHaveScreenshot` threshold of 0.2 in YIQ absorbs a whole-surface shift.

All **504** charcoal baselines were therefore rewritten, and **git** — not the run
log — was asked which changed bytes.

| | count |
|---|---|
| charcoal baselines re-recorded | **175** |
| charcoal baselines byte-identical after rewrite | **329** |
| **non-charcoal baselines moved** | **0** |
| total store | 1,019 |

The 329 are identical because they were re-encoded and compared, not because a
threshold declined to look. The default-brand test was deliberately not given
`--update-snapshots` at all, which is why §9's stale baseline is still red.

**44 components moved.** Every one paints the accent as a fill, a border or a dot.
By story id:

```
data-display-calendar (9)  agenda-slot dark-mode day-view month-default
                           month-overflow-chips month-with-events multi-day-event
                           sunday-first week-view
data-display-table (10)    combined default density-comfortable density-cozy
                           density-spacious pagination pagination-many-pages
                           pagination-outside-table playground sticky-header
data-display-carousel (8)  autoplay content-slides controlled default image-slides
                           no-arrows playground reduced-motion
data-display-tabs (7)      manual-activation narrow-overflow pill playground
                           underline with-counts with-disabled
data-display-segmentedcontrol (7)  default disabled five-options playground sizes
                           two-options with-disabled-option
overlays-modal (7)         alert-dialog basic confirm-dialog-basic
                           confirm-dialog-with-description large-content
                           not-closable with-footer
overlays-bottomsheet (7)   full half keyboard-aware mobile-filters swipe-to-close
                           with-footer with-title
inputs-button (6)          default disabled loading sizes variants with-icon
inputs-rangeslider (6)     at-max at-min basic fit-score playground
                           with-label-and-format
interaction-splitbutton (6) default per-action-variant sizes tones variants with-icons
overlays-popover (6)       bottom-end bottom-start context-menu-default
                           context-menu-with-disabled top-end top-start
inputs-datepicker (5)      default disable-past playground with-events with-time-picker
inputs-radio (5)           controlled default disabled playground standalone
layout-appshell (5)        collapsed-default default with-banner
                           with-banner-and-footer with-footer
data-display-timeline (5)  clickable horizontal milestones playground vertical
data-display-filternav (4) beside-segmented-control default rejected-hrefs sizes
display-minidonut (4)      default edge-cases multi-color with-label
feedback-toast (4)         auto-dismiss default persistent stacking
inputs-focalpointpicker (4) aspect-ratios default frame-widths ratio-from-css
inputs-toggle (4)          checked disabled-checked group states
interaction-richtext (4)   dark-mode default playground read-only
overlays-sheet (4)         default left-side mobile-full-width with-footer
data-display-*, display-*, feedback-*, inputs-*, layout-*, overlays-*, patterns-*,
surfaces-* — the remaining 22 components, 1–3 stories each:
  display-minibar (3) no-labels weekly-activity with-labels
  display-sparkline (3) default flat-data no-fill
  feedback-emptystate (3) default dual-cta single-cta
  feedback-inlineconfirm (3) custom-labels disabled-auto-cancel primary-variant
  feedback-progressbar (3) custom-max default range
  inputs-checkbox (3) checked dark-mode disabled-checked
  inputs-daterangepicker (3) default disable-past playground
  inputs-fileinput (3) disabled dropzone dropzone-pdf-only
  inputs-statuspill (3) all-stages status-ladder with-chevron
  patterns-wizard (3) three-step-form two-step-no-validation vertical-orientation
  feedback-snackbar (2) default progress
  layout-appbar (2) dark-mode minimal
  layout-splithero (2) default narrow-aside
  overlays-hovercard (2) button-anchor user-profile-preview
  patterns-formvalidation (2) field-required-marker password-strength-all
  feedback-alertbanner (1) children-slot
  foundation-tokencheck (1) light
  inputs-iconbutton (1) variants
  inputs-select (1) with-dots
  overlays-actionsheet (1) default
  overlays-confirmdialog (1) success
  patterns-coachmark (1) multi-step-story
  surfaces-card (1) application-card
```

`layout-appbar--dark-mode` and `layout-appbar--minimal` move for the G3 repair —
the logo mark goes from near-white to the mid-grey vivid step in dark. That is
the one place where a chip *lost* contrast (15.27 → 5.26) and gained the property
it actually needed: a foreground that does not invert underneath a background
that cannot.

---

## 13. Findings raised, not fixed

**F-FIX-1 — `interaction-richtext--dark-mode.png` is a stale default-brand
baseline, not a flake.** It records `color: inherit` on the pinned highlight, a
1.006:1 defect fixed at `f1767f2`. Two write-ups classified it as flaky by its
138px/0.01 signature; the signature is stable *because a stale expectation is
deterministic*. Re-recording it is one command and moves one non-charcoal
baseline. §9 has the proof. **This also retires the discriminator**: "matches the
known pixel count" is not evidence of a flake, and the other documented flake
(`richtext-marks`) has an actual behavioural signature — it passes in isolation
and fails in the full suite.

**F-FIX-2 — `.ds-atom-btn[data-variant="primary"]:hover` still hardcodes
`color: #fff`, and it is now the last one.** Asked to report it and fix it only
if wrong: **it is correct in charcoal light and got better** (5.88 on the
unchanged `--amber-d`, where it now sits over a hover state that *lifts* off a
black fill), correct in default light (**5.02**), and **wrong in charcoal dark at
2.98 and in default dark at 1.67** — which is F-22-3, unchanged and undeepened
(01-22 recorded 1.62 for the default-dark cell; recomputed here it is 1.67).
Not fixed here, and the reason is specific: the repair has to be `.dark`-scoped
(`color: var(--ink-inverse)` would take *default light* from 5.02 down to **3.48**),
so it changes default-brand rendering. No baseline captures a hover state, so it
would move nothing — but it is a separate defect in a separate brand and deserves
its own commit and its own decision. It is now conspicuous rather than merely
present: `.ds-atom-iconbtn[data-variant="primary"]` reaches the same `--amber-d`
hover fill through `var(--ink-inverse)` and reads **6.52** in charcoal dark where
the button reads 2.98, so the two sibling controls now disagree in the same state.

**F-FIX-3 — `.ds-atom-range-thumb`'s 2px accent ring is absorbed by its own
fill**, at 1.00 in charcoal light and 1.00 in charcoal dark. §5. The control reads
better overall (white knob 3.25 → 18.85), so this is a cosmetic loss, not an a11y
one. Fixing it means deciding what the ring is for — an edge against the track, or
an edge against the fill — which is a design question.

**F-FIX-4 — `Snackbar`'s tone-stripe vocabulary does not survive charcoal dark,
and the accent was only the loudest case.** The surface fills from `--ink`, which
is near-white in charcoal dark, while `--blue` / `--green` / `--red` are tuned as
foregrounds for dark backgrounds. Measured on that fill: warning
(`--amber-vivid`) **2.90**, and its siblings are worse. The action label is fixed
from 1.00 to 5.80 light / 2.90 dark, still short of the 4.5 text bar — and no
value clears 4.5 on both `#111114` and `#f2f2f4`, so the snackbar's accent
genuinely has to invert with the mode. **The default brand has the same defect
worse**: its dark action label reads **1.83** on `#ededed` today, untouched by this
change. `.dark .ds-atom-snackbar-action { color: var(--cream) }` fixes both
brands (15.17 default, 17.37 charcoal) and moves one non-charcoal baseline, so it
is deliberately left out of this change.

**F-FIX-5 — `.ds-atom-wizard-dot[data-status="active"]` was at 3.11 in charcoal
light and nobody noticed.** `color: var(--cream)` on an `--amber` fill. Fixed for
free by this change (18.07), and recorded because it means the "every consumer
that fills with `--amber` sets a *dark* foreground" invariant 01-22 asserted was
never quite true — this one set a light foreground on a light fill and had been
failing the whole time. In the **default brand** it still reads **2.09**
(`#fcfcfc` on `#f59e0b`) and is untouched here.

**F-FIX-6 — `ev.color` on `Calendar` is an unguarded colour API.** A caller can
pass any colour and the chip's ink is chosen from two fixed candidates. That is
now measured rather than inherited, which is strictly better, but a caller
passing a colour near either candidate still gets a low ratio and nothing warns
them. The same shape exists wherever a component accepts a colour prop.

---

## 14. Method notes

**Servers.** Storybook on **6006** and the comparison page on **5173** were both
already running and were **reused, never killed**. Before trusting any
measurement the dev server was checked to be serving the new code — `curl`ing
`/src/data-display/Calendar/index.tsx` and `/src/themes/charcoal.css` off 6006
and grepping for the new symbols — because a stale Vite cache would have poisoned
the a11y numbers, the probes and the baselines at once. That check is what proved
the *first* Calendar fix had genuinely landed and was genuinely insufficient,
rather than being a caching artefact.

**Every figure in this document was recomputed from the files as written**, and
ten figures I had authored in the first two commits were wrong by 0.2 to 1.0 —
each written from an estimate before the measurement came back. `c3d3469` fixes
them, individually, each with an assert-one-occurrence guard. This is the same
failure 01-22 caught eleven times in its own prose; the lesson evidently has to be
re-learned per plan, so the honest mitigation is the recompute pass, not the
resolution to be careful.

**No forbidden git.** No `git checkout -- <file>`, no `git checkout-index`, no
`git stash`, no `git reset`, no `git worktree`, no `git clean` at any point.
Every restore came from a `cp` backup verified by `shasum -a 256`. (`husky` /
`lint-staged` runs its own `git stash` on every commit — expected tooling, and it
reformatted one commit's staged files, after which the gates were re-run against
the committed bytes.) Nothing was ever staged with `git add -A`; the untracked
`design_handoff/design_handoff_ds_overview/` is still untracked.

**charcoal.css's editing invariants, checked mechanically after every edit:**
exactly **2** lines beginning with a closing brace; exactly **2** mentions of the
strong accent step; exactly **1** at-sign, the one inside the package specifier in
the header; **0** phantom token-colons in comments; **50** declarations per block,
**50** unique names per block, and the two name sets identical with an empty
symmetric difference.

---

## Self-Check: PASSED

Files verified present:

- `FOUND: ../design-system/src/themes/charcoal.css`
- `FOUND: ../design-system/src/primitives.css`
- `FOUND: ../design-system/src/tokens.test.ts`
- `FOUND: ../design-system/src/layout/AppBar/index.tsx`
- `FOUND: ../design-system/src/inputs/Checkbox/index.tsx`
- `FOUND: ../design-system/src/data-display/Calendar/index.tsx`
- `FOUND: ../design-system/tests/visual/pinned-surface-ink.spec.ts`
- `FOUND: ../design-system/CHANGELOG.md`

Commits verified in `git log`: `005ae2a`, `435dbc5`, `8ce0d69`, `c3d3469`,
`b9f7e73` — all present on `charcoal-theme`, which is **87** commits ahead of
`main`. `package.json` is `1.11.4`; zero tags point at HEAD. Working tree
tracked-clean; the only untracked path is the known-harmless
`design_handoff/design_handoff_ds_overview/`.
