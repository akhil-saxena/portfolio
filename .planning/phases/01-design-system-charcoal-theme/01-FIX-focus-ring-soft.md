# `--focus-ring-soft` — the amber ring charcoal could not reach, and the seam that hid it

**Status: fixed, gated and committed.** Found by the developer's eye on a focused
`TextInput` during 01-20 Task 3, the human capture review. Every automated gate was
green on it, and the write-up below spends more space on *why* than on the two-line
repair, because the repair is small and the blind spot is not.

`$DS` = `design-system`, branch `charcoal-theme`. Started at `1a4fc75` (75 commits
ahead of `main`), finished at **`60921fa`** (77 ahead). `package.json` stays at
**1.11.4**. Nothing published, tagged or merged; the 164 pending renames are
unapplied; 01-20 Task 3 untouched.

Two commits, atomic and separate:

| commit | what |
|---|---|
| `a534d6f` | `fix(charcoal): derive --focus-ring-soft from --focus, killing the amber ring` |
| `60921fa` | `test(tokens): gate the seam the amber focus ring slipped through` |

The headline, in one line each:

- **In charcoal dark, every focused text field drew its glow in `#fbbf24` at 30% —
  JobDash's amber — inside a border that had correctly gone ochre.** Browser-measured
  before and after.
- **The seam is the finding.** The token was overridden *inside `tokens.css`*, not by
  charcoal, so all three existing exhaustiveness mirrors passed — two of them
  **vacuously**. A gate that only compares charcoal-overridden tokens could never
  have caught this, and would have missed the next one too.
- **The sweep found one more class of hit that is not a defect**, and saying which is
  which is most of the value: three warm literals charcoal cannot reach are
  warm-tinted *neutrals* it is entitled to inherit, and four more are status *reds*
  it deliberately shares. Only `--focus-ring-soft` was a brand accent.

---

## 1. The compositor was verified before any number here was trusted

`getComputedStyle` does not composite alpha. This is a 22–30% shadow over a surface,
so every composited figure below is done by hand, and the compositor was checked
against the recorded Tabs triple **before** being pointed at the ring.

I did not take the triple's provenance on trust either — I searched all four
theme/mode contexts for the token pair that reproduces `4.882 / 4.473 / 3.851` over
`--cream` / `--cream-2` / `--cream-3` and let the search name it. It returned
`--ink-3` on `--surf-2` in **default dark**, which is exactly the pairing
`01-FIXES-charcoal-a11y-g1-g4-g5.md` records, arrived at independently.

`--surf-2` `rgba(255,255,255,0.055)` over the three default-brand dark stops, with
`--ink-3` `#919191` on top:

| stop | value | composited | recorded | ratio | recorded | |
|---|---|---|---|---|---|---|
| `--cream` | `#181818` | `#252525` | `#252525` | **4.882** | 4.882 | MATCH |
| `--cream-2` | `#1f1f1f` | `#2b2b2b` | `#2b2b2b` | **4.473** | 4.473 | MATCH |
| `--cream-3` | `#2a2a2a` | `#363636` | `#363636` | **3.851** | 3.851 | MATCH |

**Negative control.** Treating `--surf-2` as opaque collapses all three stops to a
single `3.152` — it cannot even produce three *different* numbers, let alone the
right ones. So the alpha step is doing real work rather than being decorative.

---

## 2. The defect

`src/tokens.css` declares four focus tokens. Charcoal's `--focus: var(--ochre-d)`
repoints two of them for free, because they derive:

```
258  --focus: var(--amber-d);
259  --focus-ring:        0 0 0 3px var(--focus);                             derives
260  --focus-ring-offset: 0 0 0 2px var(--page-bg), 0 0 0 5px var(--focus);   derives
264  --focus-ring-soft:   0 0 0 3px rgba(180, 83, 9, 0.22);    [light]        LITERAL
363  --focus-ring-soft:   0 0 0 3px rgba(251, 191, 36, 0.3);   [dark]         LITERAL
```

The two literals are not arbitrary. They are **inlined copies of `--amber-d`**:

- `--amber-d` light is `#b45309` = `rgb(180, 83, 9)`
- `--amber-d` dark is `#fbbf24` = `rgb(251, 191, 36)`

So the value charcoal needed was already one `var()` hop away, and the sheet spelled
it out by hand instead. Charcoal aliases `--amber-d: var(--ochre-d)` in both blocks —
the amber bridge — but an alias cannot reach a literal. `--focus-ring-soft` is the
one focus treatment `--focus` could not repoint, and charcoal.css's own comment near
line 186 overclaimed: it said repointing `--focus` "repoints every focus treatment in
the system", which was true of `--focus-ring` and `--focus-ring-offset` and false of
this one.

This is **E1**'s failure mode (*"`--amber*` never redeclared under charcoal"*)
surviving on the one path where the accent was not spelled as a token at all.

### 2.1 Why every gate was green — the seam, precisely

Three exhaustiveness mirrors exist in `src/tokens.test.ts`, and `--focus-ring-soft`
satisfied all three:

| gate | what it compares | why it passed |
|---|---|---|
| `declares a light value for every token the dark theme overrides` | tokens.css dark ⊆ tokens.css light | it **is** declared in both blocks — passes legitimately |
| `restates every charcoal light token in the charcoal dark block` | charcoalLight ⊆ charcoalDark | charcoal never mentions it, so it is in neither set — passes **vacuously** |
| `declares a charcoal light value for every token charcoal dark overrides` | charcoalDark ⊆ charcoalLight | same — passes **vacuously** |

The token was overridden **inside `tokens.css`'s own dark block**, not by charcoal.
Charcoal therefore never "overrides" it, and the two charcoal mirrors had *nothing to
compare*. Set-difference gates are silent on the empty set: they cannot distinguish
"charcoal correctly has no opinion" from "charcoal is missing an opinion it needed".

And no contrast gate samples it because **it is a `box-shadow`** — the WCAG cases
walk text-on-surface pairs, and a glow is neither.

It fell between the two checks, and it is the only token in the sheet with that
shape.

---

## 3. The fix — derived, not hardcoded, and *not* where I first intended

The instruction was to declare `--focus-ring-soft` in both charcoal blocks, and to
prefer a token-level derivation over a second literal if the codebase has one. It
does: `color-mix(in srgb, var(--token) N%, transparent)` is an established idiom
here — `primitives.css` already runs five such washes on `--amber`, and
`ConfirmDialog` documents it in so many words as "existing idiom for the same
problem". There is no `--ochre-d-rgb`-style channel triplet anywhere in `src/`, and
no relative-colour syntax, so `color-mix` is the house answer.

**Shipped:**

```css
/* :root[data-brand="charcoal"] */
--focus: var(--ochre-d);
--focus-ring-soft: 0 0 0 3px color-mix(in srgb, var(--focus) 22%, transparent);

/* :root[data-brand="charcoal"].dark */
--focus: var(--ochre-d);
--focus-ring-soft: 0 0 0 3px color-mix(in srgb, var(--focus) 30%, transparent);
```

Derived from **`--focus`**, not from `--ochre-d` directly. `--focus` is the sheet's
documented single binding point for focus treatment; keying the soft ring to it makes
charcoal.css's line-186 claim *true* rather than aspirational, and means a future
repoint of `--focus` carries the glow with it. Alphas are the design system's own
0.22 / 0.30, so the treatment is unchanged and only the hue follows the brand.

### 3.1 The approach I rejected, and why — this is the load-bearing part

My first instinct was better architecture: fix it **upstream** in `tokens.css` by
making the default's own declaration derive —
`0 0 0 3px color-mix(in srgb, var(--focus) 22%, transparent)`. Since the literals are
just inlined `--amber-d`, that is numerically a no-op for the default brand, it
deletes the drift hazard at the source rather than moving it, and charcoal would then
need **zero** new declarations.

Measurement killed it. Chromium does not compute `color-mix` back to `rgba()`:

```
color-mix(in srgb, #b45309 22%, transparent)  ->  color(srgb 0.705882 0.32549 0.0352941 / 0.22)
rgba(180, 83, 9, 0.22)                        ->  rgba(180, 83, 9, 0.22)
```

The **rendered pixels are identical** (0.705882 × 255 = 180.0, 0.32549 × 255 = 83.0,
0.0352941 × 255 = 9.0, alpha 0.22), but the *computed-value string* differs. That
means the upstream version could not be described as leaving the default brand
byte-unchanged, and any present or future assertion reading that computed string
would see a change. The brief's constraint was explicit — additive, JobDash identity
untouched, measured not asserted — and the upstream fix fails it on a technicality
that is nevertheless real.

So: **charcoal-side, which is strictly additive — `tokens.css` is byte-for-byte
untouched — but derived rather than literal, so I keep both properties.** A literal
inside charcoal would still have been a literal, and would have drifted from
`--ochre-d` the moment that value changed; `color-mix` against `--focus` cannot.

**This is worth flagging as a deliberately-deferred improvement, not a closed
question.** The upstream literals in `tokens.css` remain literals. They are now
*harmless* — charcoal overrides them and the new gate forbids a repeat — but the
cleaner sheet still has `--focus-ring-soft` deriving from `--focus` at `:root`, and
that is a one-line change worth making at 06.1 when a computed-string change is
cheap to absorb.

---

## 4. Browser-measured, before and after

A real Chromium page, `tokens.css` + `themes/charcoal.css` + `primitives.css`, a
`.ds-atom-input` focused for real (`document.activeElement`, `el.matches(":focus")`
both asserted true), reading the **settled** value.

> **A measurement trap worth recording.** The first three readings came back
> `rgba(0, 0, 0, 0) 0px 0px 0px 0px` — no ring at all — while the `:focus` rule was
> demonstrably matched. `.ds-atom-input` carries `transition: box-shadow 0.15s`, so
> reading immediately after `focus()` samples the *interpolated start* of a
> `none → shadow` transition, which is transparent zero. A 400 ms settle is the
> difference between measuring the ring and measuring nothing, and the "nothing"
> reads exactly like a component with no focus ring.

**Brand asserted at the probed element**, per 01-19.1's lesson — a charcoal-only
token *and* a neutral, because 01-19.1 measured `--ochre` reading correctly at a node
whose neutrals were shadowed. Both are clean here: `--ochre` resolves to `#b0722a`
under charcoal and to nothing under the default brand, and `--cream` resolves to
charcoal's own `#161616` rather than the default's `#181818`.

| brand / mode | `--focus` | border (computed) | ring BEFORE | ring AFTER |
|---|---|---|---|---|
| default light | `#b45309` | `rgb(180, 83, 9)` | `rgba(180, 83, 9, 0.22)` | `rgba(180, 83, 9, 0.22)` — **unchanged** |
| default dark | `#fbbf24` | `rgb(251, 191, 36)` | `rgba(251, 191, 36, 0.3)` | `rgba(251, 191, 36, 0.3)` — **unchanged** |
| charcoal light | `#8c591f` | `rgb(140, 89, 31)` | `rgba(180, 83, 9, 0.22)` ✗ amber | `color(srgb 0.54902 0.34902 0.121569 / 0.22)` = **`#8c591f`** ✓ |
| charcoal dark | `#c6883a` | `rgb(198, 136, 58)` | **`rgba(251, 191, 36, 0.3)` ✗ `#fbbf24`** | `color(srgb 0.776471 0.533333 0.227451 / 0.3)` = **`#c6883a`** ✓ |

Channel arithmetic on the `color(srgb …)` output, exact:

- light: `0.54902 · 255, 0.34902 · 255, 0.121569 · 255` = `(140.0001, 89.0001, 31.0001)` → **`#8c591f`** = `--ochre-d` light
- dark: `0.776471 · 255, 0.533333 · 255, 0.227451 · 255` = `(198.0001, 135.9999, 58.0)` → **`#c6883a`** = `--ochre-d` dark

**The visual signature of the bug, and of the fix.** Before, the border and the ring
disagreed: an ochre `rgb(198,136,58)` boundary wrapped in an amber `#fbbf24` glow.
That two-tone is what the eye caught, and it is why a colour-blind gate never would
have. After, ring and border are the same hue.

### 4.1 The composited glow, and one honest consequence

Composited by hand with the verified compositor, ring over the surface it lands on,
contrast against that same surface:

| mode | surface | BEFORE ring | ratio | AFTER ring | ratio |
|---|---|---|---|---|---|
| charcoal light | page `#f4f1ea` | `#e6ceb8` | 1.338 | `#ddd0bd` | 1.349 |
| charcoal light | paper `#fbf9f4` | `#ebd4c0` | 1.351 | `#e3d6c5` | 1.362 |
| charcoal light | panel `#ede9e0` | `#e0c8b1` | 1.325 | `#d8c9b6` | 1.337 |
| charcoal dark | page `#161616` | `#5b491a` | 2.070 | `#4b3821` | **1.628** |
| charcoal dark | paper `#1e1e1d` | `#604e1f` | 2.081 | `#503e26` | **1.634** |
| charcoal dark | panel `#242423` | `#645223` | 2.067 | `#55422a` | **1.624** |

**In charcoal dark the glow gets dimmer — 2.070 → 1.628 — and that is not a
regression.** Two reasons, and I checked both rather than assuming:

1. **The glow is not the indicator.** `tokens.css` says so in as many words: the soft
   ring is for text fields "where the **border colour change carries the
   indication** and a solid 3px ring would read as an error state." SC 1.4.11
   compliance rides on the border, which is `var(--focus)` = `--ochre-d`, recorded at
   6.02 / 5.55 / 5.17 in charcoal dark — and which was already correct before this
   fix. Neither the old amber glow (2.07) nor the new ochre glow (1.63) clears 3:1,
   and neither was ever asked to.
2. **The old number was the anomaly.** Before the fix, charcoal dark's glow was
   1.55× louder than charcoal light's (2.070 vs 1.338) — because it was borrowing a
   foreign, brighter accent. After, dark sits 1.21× above light (1.628 vs 1.349). The
   fix moves the treatment *into* family rather than out of it.

For completeness, if the developer decides prominence parity with the old glow is
wanted, the alpha that restores 2.070 in charcoal dark is **0.421**. I did not apply
it: the brief said keep the design system's alphas unless measurement says otherwise,
and measurement says the treatment is now internally consistent. Raising it is a
design call with a number attached, not a defect.

---

## 5. The default brand is unchanged — measured three ways

1. **Source.** `src/tokens.css` is byte-for-byte untouched.
   `shasum` = `4ac02ffd42904ef5fd603ccad848bc5cd8612a01` at the start of this work
   and at the end, identical to the `cp` backup taken before anything was edited.
   The whole diff is `src/themes/charcoal.css` (+18/−1) and `src/tokens.test.ts`
   (+132).
2. **Scope.** Both new declarations live under `:root[data-brand="charcoal"]` and
   `:root[data-brand="charcoal"].dark`. Neither selector can match when
   `data-brand` is absent.
3. **Computed.** The browser table in §4 reads the default brand's ring as
   `rgba(180, 83, 9, 0.22)` light and `rgba(251, 191, 36, 0.3)` dark, **before and
   after, character for character** — not inferred from the selector, actually
   probed with the theme file loaded.

`dist` corroborates the split after a clean build:

```
dist/themes/charcoal.css   focus-ring-soft: 0 0 0 3px color-mix(in srgb, var(--focus) 22%, transparent)
                           focus-ring-soft: 0 0 0 3px color-mix(in srgb, var(--focus) 30%, transparent)
dist/tokens.css            focus-ring-soft: 0 0 0 3px rgba(180, 83, 9, 0.22)
                           focus-ring-soft: 0 0 0 3px rgba(251, 191, 36, 0.3)
```

---

## 6. The full amber-literal sweep of `tokens.css` — every hit

This was the part worth more than the single fix, and it changed my mind about what
the gate should assert.

Method: strip comments, parse every declaration in both `tokens.css` blocks, extract
every sRGB literal from **values only**, and cross-reference against the set of
tokens charcoal redeclares. Charcoal's amber bridge is complete over the named
tokens — all seven `--amber*` are aliased:

```
--amber        = var(--ochre)          --amber-l      = var(--ochre)
--amber-d      = var(--ochre-d)        --amber-soft   = var(--ochre)
--amber-vivid  = var(--ochre)          --amber-warm   = var(--ochre)
--amber-ink    = var(--ink-inverse) / var(--ochre-d-strong)
```

So every leak has to be a literal in a token charcoal does not name. Widening to
**any** warm literal (hue 15–70, any saturation) that charcoal does not redeclare
returns exactly five, and the classification is the finding:

| line | token | literal | hue | spread | verdict |
|---|---|---|---|---|---|
| 264 | `--focus-ring-soft` (light) | `rgba(180, 83, 9, 0.22)` | 26.0 | **171** | **DEFECT — brand accent. Fixed.** |
| 363 | `--focus-ring-soft` (dark) | `rgba(251, 191, 36, 0.3)` | 43.3 | **215** | **DEFECT — brand accent. Fixed.** |
| 335 | `--g-bd` (dark) | `rgba(247, 236, 219, 0.07)` | 36.4 | 28 | warm *neutral* — not fixed, see below |
| 334 | `--g-bg` (dark) | `rgba(15, 13, 11, 0.7)` | 30.0 | 4 | warm *neutral* — not fixed |
| 75 | `--fill-disabled` (light) | `#8e8782` | 25.0 | 12 | warm *neutral* — not fixed |

**`--focus-ring-soft` was the only brand-accent leak.** The other three are
warm-tinted neutrals: a glass border at 7% alpha, a warm near-black glass fill, and a
warm grey. `--g-bd` has a high *HSL saturation* (63.6%) which is exactly why HSL
saturation is the wrong discriminator for near-whites — its actual chroma is a
28/255 channel spread, i.e. a barely-warm white. I did **not** fix these: charcoal is
entitled to inherit warm-tinted neutrals, they carry no brand identity, and touching
the glass tokens would move StatCard and every `.ds-glass` capture during an open
baseline review for no measurable gain. They are reported, not repaired.

For completeness, the sweep also surfaced the **status reds**, which are the same
*structural* shape (a literal duplicating a token) but not a brand leak — charcoal
deliberately shares them and redeclares none:

| token | light | dark | hue |
|---|---|---|---|
| `--red` | `#b8463f` | `#f0a4a0` | 3.5 / 3.0 |
| `--red-ink` | `#9b3b35` | (aliases `--red`) | 3.5 |
| `--red-vivid` | `#ef4444` | `#ef4444` | 0.0 |
| `--error-ring` | `rgba(184, 70, 63, 0.18)` | `rgba(240, 164, 160, 0.24)` | 3.5 / 3.0 |

`--error-ring` deserves a specific note: it is `--focus-ring-soft`'s exact twin — a
`box-shadow` spelling a colour as an rgba literal that duplicates a token
(`--red` / `--red-ink`), invisible to every contrast gate for the same reason. It is
**not** a defect today only because charcoal shares the reds. If charcoal ever
rebrands its error colour, `--error-ring` breaks in precisely the way
`--focus-ring-soft` just did, and the new gate will catch it the moment a red
override appears in charcoal.

---

## 7. Closing the seam, and proving the gate three ways

Fifteen consecutive plans shipped a defective gate, so this one is proven rather
than asserted, and then attacked.

**What it asserts.** Reachability, not symmetry. A brand-accent colour spelled as a
*literal* in `tokens.css` cannot be reached by any brand, so charcoal must redeclare
the token carrying it. A second case closes the obvious bypass — redeclare it inside
charcoal and paint it amber anyway — by requiring charcoal's own accent literals to
come from its ochre ramp. Both read **parsed declarations with comments stripped**;
neither can be satisfied by prose.

**Two axes, both required, and no allowlist to erode.** I deliberately did not ship
an allowlist, because an allowlist is the thing that erodes one token at a time. The
thresholds do the work instead:

- **channel spread ≥ 60/255** is chroma. Admits the amber ramp (`#b45309` spreads
  171, `#fbbf24` spreads 215); rejects the warm *neutrals* charcoal may inherit
  (`--g-bd` 28, `--fill-disabled` 12, dark `--g-bg` 4).
- **hue 18–70** is the amber/ochre wedge. Rejects the status reds charcoal
  deliberately shares — all four sit at hue 0–3.5.

Channel spread replaced HSL saturation after `--g-bd` showed that saturation
misclassifies near-whites. That is the sweep paying for the gate's design.

**Three-way proof.**

| # | state | expected | result |
|---|---|---|---|
| 1 | pre-fix tree (charcoal restored from `cp` backup, 0 declarations) | FAIL | **FAIL**, exit 1 — named both: `tokens.css light --focus-ring-soft: rgba(180, 83, 9)` and `tokens.css dark --focus-ring-soft: rgba(251, 191, 36)` |
| 2 | fix disabled — charcoal declares the token but with the amber rgba literal | FAIL | **FAIL**, exit 1 — `charcoal dark --focus-ring-soft: rgba(251, 191, 36) is not one of charcoal's ochre values` |
| 3 | as shipped | PASS | **PASS**, exit 0 |

Proof 1 was re-run **after** biome reformatted the test file, so the proof applies to
the bytes that shipped, not to a draft.

**Then I tried to walk through it.**

| attempt | outcome |
|---|---|
| Satisfy it with a comment — add `/* --focus-ring-soft: handled by --focus … */` to charcoal and declare nothing | **HELD.** `grep -c focus-ring-soft` returns 1, so a name-grep gate would have passed. The gate still failed, naming both declarations, because values are read from parsed declarations with comments stripped. |
| Declare it in one block only (light, not dark) | **HELD** by the *pre-existing* mirror: `restates every charcoal light token in the charcoal dark block` failed with `expected [ '--focus-ring-soft' ] to deeply equal []`, plus the count case. |
| Make the gate vacuous — rename all 38 `--ochre` occurrences so the ramp it compares against is empty | **HELD.** An explicit anti-vacuity floor fired: `expected 0 to be greater than or equal to 4`. It cannot pass by comparing against an empty set. |

Every mutation was applied with a Python assert-one-occurrence guard that proved the
file actually changed before the gate ran, and every one was restored from a `cp`
backup confirmed by `shasum`. No `git checkout -- <file>`, no `git stash`, no
`git reset`, no `git clean` at any point.

**One residual hole, stated rather than hidden.** The gate reasons about literals. A
*desaturated* warm literal (spread < 60) in a charcoal-unreachable token still slips
through — by construction, since that is the same rule that correctly exempts
`--g-bd`. That is a deliberate trade, and §6 enumerates the three tokens currently in
that band so the next reader inherits the list rather than the surprise.

---

## 8. Baseline movement: **zero**

The store is `tests/visual/storybook.spec.ts-snapshots` — **1,019 files, 0
modified**, confirmed by `git status --short tests/` returning empty at the end. **No
baseline was re-recorded and no image moved.** 01-20 Task 3 is untouched.

A focus ring only appears in a capture if a story renders a focused control. No story
uses `autoFocus`, and there is no pseudo-state addon — but play functions can leave a
control focused, so I measured rather than reasoned.

`test:visual` reports **1 failed / 136 passed**, and the single failure is
`interaction-richtext--dark-mode.png`, 138 pixels, ratio 0.01 — in the **default
brand** run, which my charcoal-only change cannot reach.

I proved that rather than arguing it. Restoring the pre-fix charcoal from backup and
re-running the full suite reproduces the **identical** signature: same snapshot, same
138 pixels, same 0.01 ratio, same 1 failed / 136 passed. It is the known richtext
flake, it is not mine, and per the brief I did not chase or re-record it.

No charcoal capture moved at all.

---

## 9. Gates, from one commit pair, reported separately

| gate | exit | result |
|---|---|---|
| `build` | **0** | clean |
| `test` | **0** | **1949 passed / 123 files** — was 1946/123; +3 are the new gate's cases |
| `check` | **0** | biome, 379 files |
| `typecheck` | **0** | both tsconfigs |
| `css:check` | **0** | **79 files, round-trip byte-exact** |
| `test:a11y` | **0** | **508 / 508**, 84 suites, default-brand only |
| `test:visual` | 1 | 136 passed, 1 failed — `interaction-richtext--dark-mode`, proven pre-existing in §8 |

Informational, unchanged by this work and not mine:

| | |
|---|---|
| `DS_BRAND=charcoal test:a11y` | **11 failed / 497 passed** — the documented G2 + G3 total (4 + 7), deliberately open, not mine |

The 11 land in 4 suites — `AlertBanner`, `Card`, `AppBar`, `DateRangePicker` — which
matches the triage's "2 components" for G2 plus "2 components" for G3, and its 4 + 7
violation split. I did not re-derive which suite belongs to which group; the counts
reconcile and none of them moved.

`check` failed once mid-work on formatting alone — biome wanted different line breaks
in the new test cases. Fixed with `biome check --write` on that one file, then every
gate re-run and Proof 1 re-verified against the formatted bytes.

---

## 10. What I did not do

- **Did not** publish, tag, merge, or bump `package.json` — stays `1.11.4`.
- **Did not** apply the 164 pending renames.
- **Did not** touch 01-20 Task 3, or re-record any baseline.
- **Did not** fix `--g-bd`, `--g-bg` or `--fill-disabled` — warm neutrals, §6.
- **Did not** fix `--error-ring` — not a defect while charcoal shares the reds, §6.
- **Did not** derive the upstream `tokens.css` literals — measured as a
  computed-string change to the default brand, deferred to 06.1, §3.1.
- **Did not** raise charcoal dark's glow alpha to 0.421 — a design call, numbers in
  §4.1.
- **Did not** start or kill a Storybook. The developer's server on 6006 was **not
  running** when I checked (`HTTP 000`, no listener), so there was nothing to reuse or
  disturb; the Playwright and test-runner harnesses manage 6006 themselves with
  `reuseExistingServer` on, and the browser probe in §4 used no server at all —
  `addStyleTag` against the real CSS files.

---

## Reviewed and confirmed — 2026-08-25

**The dimmer glow stands.** Akhil reviewed the prominence drop (2.070 → 1.628) and kept it rather
than restoring the old loudness with the computed `0.421` alpha. Recorded here so it reads as a
decision rather than as a side effect nobody looked at.

The reasoning that carried it: `tokens.css` states the **border** carries the focus indication and the
glow is secondary — and the border is a solid 1px ochre, unmissable. The *old* figure was the
anomaly: JobDash's amber made the dark ring **1.55×** louder than the light one, where ochre puts it
at **1.21×**, near parity across modes. Restoring the loudness would have reinstated an asymmetry
that came from the previous brand rather than from a decision.

### How this was found, and why no gate could have

Akhil photographed a focused `TextInput` during the 01-20 Task 3 review and asked why the ring looked
pale. Two separate things had to be untangled:

1. **The real defect** — `--focus-ring-soft` hardcoded `rgba(251, 191, 36, 0.3)`, JobDash's `#fbbf24`,
   which charcoal could not reach because an **alias cannot reach a literal**.
2. **A viewing artefact on top of it** — a box-shadow composites over whatever sits *behind* the
   element, and on a Storybook **docs** page that is the light docs chrome, not the dark page. Ochre
   at 30% measures `#e5d1b7` over light chrome and `#4b3821` over a real charcoal-dark page. The pale
   halo in the screenshot was the ring landing on Storybook's own container.

The fix is nonetheless visible even in the artefact: the old amber over that same light chrome would
have been `#f5e1b0`, distinctly yellow, against the shipped `#e5d1b7`.

**Neither a contrast gate nor the exhaustiveness gate could have caught the underlying defect** — it is
a `box-shadow` rather than a colour token, and it is overridden *inside* `tokens.css` rather than by
charcoal, so the "declare a light value for every token the dark theme overrides" check had nothing to
compare. It fell in the seam between two gates, which is now closed by a reachability assertion rather
than a symmetry one.
