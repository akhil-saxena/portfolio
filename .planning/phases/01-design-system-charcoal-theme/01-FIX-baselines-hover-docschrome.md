# Baselines, the hover literal, and the docs chrome — three jobs, and three claims that turned out to be wrong

**Status: all three committed.** `$DS` = `design-system`, branch `charcoal-theme`,
**89 → 92** commits ahead of `main`, tracked-clean apart from the known-harmless
`?? design_handoff/design_handoff_ds_overview/`. `package.json` stays **1.11.4**;
nothing published, tagged or merged; zero tags point at HEAD; the 164 pending
renames are unapplied.

| commit | job | what |
|---|---|---|
| `b6aba81` | 1 | `test(visual): re-record the default-brand richtext baseline that recorded a fixed a11y defect` |
| `4a259f0` | 2 | `fix(a11y): put the hovered primary icon button's ink on a token, and gate the hover state` |
| `12b723c` | 3 | `fix(storybook): make the docs chrome follow the Theme and Brand toggles` |

**One baseline moved, out of 1,019.** Not two. The headline of this document is that
each of the three jobs was briefed on a diagnosis that measurement contradicted, and
in each case the real defect was somewhere adjacent:

- **Job 1** was to re-record two stale baselines. Only one is stale. The second is
  **byte-identical to a correctly settled capture** and re-recording it would have
  written a half-collapsed layout into the store.
- **Job 2** was to fix `primitives.css:84`. That line is **dead code** — an inline
  style outranks the whole rule, so its `#fff` has never rendered. The live instance
  of the defect is line **265**, on a different component.
- **Job 3**'s two `#f59e0b` ambers in `docsTheme` are **inert** — they paint nothing.
  The defect that *was* real, and unbriefed, is 37 hardcoded `#f7fafc` code chips.

---

## 0. The correction I owe on my own reporting

**I have called both Job 1 baselines "flakes", and both labels were wrong — in
opposite directions.**

| baseline | what I called it | what it is |
|---|---|---|
| `interaction-richtext--dark-mode` | a flake | **stale** — it records a fixed a11y defect |
| `data-display-tabs--narrow-overflow--monochrome` | a flake, then "stale not flaky" | **genuinely racy, and its baseline is CORRECT** |

The second label was corrected once already, from "flake" to "stale", and the
correction moved it further from the truth. `01-23-SUMMARY.md` §6 gave four facts for
staleness; three of them are equally consistent with a race, and the fourth —
*"three consecutive fresh captures are byte-identical to each other
(`6c474a7b7a3889fa`)"* — is the one that inverted cause and effect.

**I reproduced that exact hash.** Those three captures are **1280×736**. The baseline
is **1280×720**. They are byte-identical to each other because the *capture method*
is deterministic, not because the *story* is: a one-shot capture that waits only for
`document.fonts.ready` lands in the pre-collapse transient every single time. What
the triple proves is that the measurement was repeatable, which is not the same
claim as the baseline being wrong.

The discriminator that actually settles it is in §1.3.

---

## 1. Job 1 — one re-record, and the second baseline defended

### 1.1 The compositor and the contrast tool were calibrated before anything was trusted

`getComputedStyle` does not composite alpha, so every figure in this document that
sits on a wash was composited by hand, unrounded. The tool was verified against five
independently documented values **before** being pointed at anything new:

| check | computed | documented | |
|---|---|---|---|
| `#ededed` on `#fef08a` (the recorded defect) | **1.006** | 1.006 | MATCH |
| `#1c1917` on `#fef08a` (as shipped) | **15.028** | 15.03 | MATCH |
| `#fff` on `--amber-d` `#fbbf24` (default dark) | **1.669** | 1.67 | MATCH |
| `#fff` on `--amber-d` `#b45309` (default light) | **5.022** | 5.02 | MATCH |
| `#fff` on `--amber-d` `#64646a` (monochrome light) | **5.878** | 5.88 | MATCH |

And against the Tabs compositing triple from `01-FIX-monochrome-accent.md` §1 —
`--surf-2` `rgba(255,255,255,0.055)` over three dark stops, reproducing `#252525` /
`#2b2b2b` / `#363636` and **4.882 / 4.473 / 3.851** exactly. The documented failure
mode reproduces too: treating the wash as opaque collapses all three to **3.152**.

### 1.2 `interaction-richtext--dark-mode` — stale, and re-recorded

Traced in git, not argued:

- the baseline was last written at **`a9ec1ef`**;
- at `a9ec1ef` the rule declared **`color: inherit`** — the G5 defect;
- **`f1767f2`** fixed it to a pinned literal and never re-recorded the image.

Decoded by hand, my capture against the old baseline: **368 raw pixels** differ,
inside one **56×14 box at (403,93)**, colour pair **`#ededed → #1c1917`**. That
reproduces the decode in `01-FIX-monochrome-accent.md` §9 independently.

Measured in the browser at the element, brand asserted and a neutral checked:

| | value |
|---|---|
| `<html data-brand>` | `(unset)` — default brand |
| `--cream` (the neutral) | `#181818` — default dark |
| `.ProseMirror mark` colour | `rgb(28, 25, 23)` = `#1c1917` |
| `.ProseMirror mark` background | `rgb(254, 240, 138)` = `#fef08a` |
| box | `[401, 90, 59, 17]` |

**Before → after: 1.006 → 15.03.** The new image was verified to contain the fix
rather than merely to be new — the darkest ink inside the highlight box is `#1c1917`.

Captured with **`--update-snapshots=all` restricted to that one story id**, never the
bare flag. The restriction was implemented as a temporary allowlist in
`storybook.spec.ts`, applied with an assert-one-occurrence guard, **proved to select**
(`captured 1` and `captured 0` in the two brand passes, three times running), and
restored from a `cp` backup confirmed byte-identical by `shasum -a 256`
(`ddeb276e…fea5a` before and after).

### 1.3 `data-display-tabs--narrow-overflow--monochrome` — NOT stale, and NOT re-recorded

**The decisive measurement.** Three captures taken with the spec's exact protocol
*plus* a wait for the overflow measurement and the backgrounds addon to settle:

| | size | sha256 (first 24) | vs baseline |
|---|---|---|---|
| recorded baseline | 1280×720 | `568564bc98bb29727e844174` | — |
| settled capture #1 | 1280×720 | `568564bc98bb29727e844174` | **BYTE-IDENTICAL** |
| settled capture #2 | 1280×720 | `568564bc98bb29727e844174` | **BYTE-IDENTICAL** |
| settled capture #3 | 1280×720 | `568564bc98bb29727e844174` | **BYTE-IDENTICAL** |
| "fresh" capture, 01-23's method | 1280×**736** | `6c474a7b7a3889fa…` | different size |

A stale baseline cannot be byte-identical to a correct capture. The store holds the
right image.

**The failing render is visibly wrong, not merely different.** Decoding the actual
against the baseline: 317 raw pixels in a **92×13 box at (223,90)**, colour pairs
`#f5f3f0 → #424248` — that is *text where the baseline correctly has page
background*. Rendered side by side:

- baseline: `Dashboard | Analytics | ⋯` — 2 tabs plus the More button
- failing capture: `Dashboard | Analytics | Reports | ⋯` — **3 tabs**

**The mechanism, measured to the pixel.** `Tabs` computes overflow from a single
`ResizeObserver` on `.ds-atom-tabs`, whose width never changes, so `measure()`
effectively runs once. `available = clientWidth − MORE_WIDTH = 300 − 44 = 256`, and
the comparison is `cumulative + width > available`:

| font state | "Reports" width | cumulative at 3 tabs | test | visibleCount |
|---|---:|---:|---|---:|
| fallback metrics (`fonts=loading`) | **77** | **257** | 257 > 256 → stop | **2** |
| DM Sans loaded | **76** | **256** | 256 ≤ 256 → fits | **3** |

**A one-pixel font-metric difference, landing exactly on the boundary**, decides
whether the story shows two tabs or three — permanently for that page load, because
nothing re-measures. A frame-by-frame trace catches the transition directly: at frame
7, `fonts=loading`, widths `95/85/77/116/61/66`, 6 triggers at 736 px; at frame 8, 2
triggers at 720 px.

**Why Playwright's own stability check does not save it.** The call log reads
*"captured a stable screenshot"* immediately before reporting 94 differing pixels.
`toHaveScreenshot` compares two screenshots **100 ms apart**; the wrong state persists
far longer than that, so it is "stable" and wrong. That phrase appears in both
failures discussed here and is not evidence of correctness.

**Reproduction profile:** passes 5/5 in isolation (three single-story runs, one
standalone monochrome pass of all 504, one contended `--grep` run); failed in one
full-suite run; **passed in the final full-suite run** (§4). Intermittent, load-
dependent, and the recorded image is the correct end state in every settled capture.

**The gate was proved live before any of this was believed.** Planting exactly 94
pixels into the baseline made the probe report **"94 pixels (ratio 0.01)"** — the
precise signature 01-22 and 01-23 attributed to staleness — and the file was restored
from a `cp` backup with `shasum` confirming `568564bc…e852`, `git status` clean.

**Not re-recorded, deliberately.** Re-recording would replace a correct image with a
half-collapsed one, which is exactly the hazard `storybook.spec.ts`'s own serial-mode
comment warns about. **What it needs is a component fix, not a baseline write** — see
§5, F-1.

### 1.4 Store invariants

| | before | after |
|---|---:|---:|
| baselines on disk | 1019 | **1019** |
| baselines tracked | 1019 | **1019** |
| blobs changed | — | **1** |
| other-file blob multiset | `644cb829…3cbe54` | `644cb829…3cbe54` **unchanged** |

The one change: `interaction-richtext--dark-mode-chromium-darwin.png`,
`a136087f → 0bcb6880`. The multiset check covers the **other 1018** (not 1017 — only
one file moved).

---

## 2. Job 2 — seven literals, one live defect, and one that cannot render

### 2.1 All seven measured, in all four brand × mode cells

Composited by hand where alpha is involved; brand asserted at `<html>` and `--cream`
cross-checked at every reading.

| line | selector | default light | default dark | mono light | mono dark | verdict |
|---|---|---:|---:|---:|---:|---|
| **84** | `btn[primary]:hover` | 5.02 | **1.67** | 5.88 | **2.98** | **INERT — never renders** |
| **265** | `iconbtn[primary]:hover` | 5.02 | **1.67** | 5.88 | **2.98** | **THE DEFECT — fixed** |
| 273 | `iconbtn[danger]` | 4.83 | 4.83 | 4.83 | 4.83 | correct — left |
| 2942 | `split[danger]` | 4.83 | 4.83 | 4.83 | 4.83 | correct — left |
| 1705 | `lightbox-caption` | 18.40 | 20.76 | 18.42 | 20.87 | correct — left |
| 1721 | `lightbox-close` | 19.67 | 20.87 | 19.68 | 20.93 | correct — left |
| 1741 | `lightbox-next` | 19.67 | 20.87 | 19.68 | 20.93 | correct — left |

**Why the four "correct" ones are genuine exceptions rather than oversights.** 273 and
2942 paint on a **pinned** `#dc2626`; both ends are literals, so the ratio is
brand- and mode-independent by construction — this is the pinned-background rule
being obeyed, not broken. The Lightbox trio sits on a pinned
`rgba(0,0,0,0.92)` backdrop (close/next add a further `rgba(0,0,0,0.45)`), through
which the page barely shows: the composited backdrop is `#141414` in light and
`#020202` in dark. White there is right *because* the surface is pinned, and it takes
hand-compositing of two alpha layers to say so with a number.

**F-FIX-2's claim that line 84 "is now the last one" was wrong by six.** That is the
fourth time this phase a "this is the only instance" statement has been falsified by
a sweep, and each time the sweep found more than the finding did.

### 2.2 Line 84 is dead code — measured, not inferred

`Button` applies its variant styles **inline**:

```
inline color      : "var(--ink-inverse)"
inline background : "var(--amber)"
COMPUTED color    : rgb(28, 25, 23)      <- while :hover matched
COMPUTED bg       : rgb(245, 158, 11)    <- --amber, NOT --amber-d
```

An inline declaration outranks every class selector, so the whole hover rule at
82–85 never paints: **the primary button does not darken on hover at all**, and its
`#fff` has never rendered. `IconButton` sets no inline colour —
`inline color: ""` — and its hover really does paint `#ffffff` on `#fbbf24`.

This is why a literal-count gate would have been actively harmful here: it would have
found two identical-looking defects, and the "obvious" one is the one that does
nothing. `01-FIX-monochrome-accent.md` used the IconButton as the *correct* sibling
against which the Button "disagreed"; the two in fact carried the same literal, and
the disagreement runs the other way.

### 2.3 The repair, and why no token spans all four cells

`--ink-inverse` is the ink-on-accent-fill token and is correct in **both dark cells**.
It is not correct in default light, where it would take 5.02 down to **3.48** — a
figure that reproduces the one documented in F-FIX-2. There is **no existing token
that is correct in all four cells**, and none was invented. Hence `.dark`-scoped, with
the light literals left because they *measure* correct:

| cell | before | after |
|---|---:|---:|
| default light | 5.02 | 5.02 (unchanged, rule is `.dark`-scoped) |
| **default dark** | **1.67** | **10.48** |
| monochrome light | 5.88 | 5.88 (unchanged) |
| **monochrome dark** | **2.98** | **6.52** |

The same `.dark` rule is added for the Button so the latent 1.67 cannot ship if those
inline styles are ever lifted, and the inertness is recorded in the stylesheet.

### 2.4 The gate, proved by planting its own target

No visual baseline captures a hover state and axe never hovers, so this defect was
**invisible to every committed gate in both brands**. New:
`tests/visual/hover-ink-contrast.spec.ts` (G6), 8 tests, measuring the rendered
cascade with the pointer on the control.

| run | result |
|---|---|
| pre-fix | **FAIL** on exactly 2 of 8 — 1.67 and 2.98 |
| `#fff` replanted in the `.dark` rule (the exact target defect) | **FAIL**, same 2, same ratios |
| as shipped | **PASS 8/8** |
| **walk-through:** keep `#fff`, move the fill off the accent | **FAIL** — *"hover fill #181818 is neither --amber nor --amber-d"* |

The walk-through matters: white on a near-black fill measures ~18:1, so a
**ratio-only gate would have gone green** while the control silently stopped being an
accent step. The fill-identity assertion is load-bearing, as is the `:hover`
assertion — an unhovered control reads its resting ink and passes comfortably, which
the first draft of this measurement did.

### 2.5 Baseline movement: none

**Zero.** 1019 before, 1019 after, none modified. Job 2 was the one job permitted to
move default-brand baselines and it moved nothing, because no baseline captures a
hover state. Reported by story id as required: **the list is empty.**

---

## 3. Job 3 — what outranked `.docs-story`, and what the docs theme can and cannot follow

### 3.1 What outranked `.docs-story` — found in the browser, not guessed

`storybook.css` already declared `background: var(--cream) !important` on
`.docs-story`, and **every sibling in that same rule obeyed** — `.sbdocs-content`
resolves to the brand's cream in dark mode. Via
`CSS.getMatchedStylesForNode` (Chrome DevTools Protocol), the winner is:

```
#anchor--foundation-heading--default .docs-story { background: #f5f3f0 !important; }
```

The **backgrounds addon** injects that per story anchor in docs mode, from
`parameters.backgrounds.values`. Both declarations are `!important`, so the winner is
decided on specificity, and an ID beats any number of classes:

| rule | specificity |
|---|---|
| addon's `#anchor--… .docs-story` | **(1,1,0)** |
| ours, `.docs-story` | (0,1,0) |
| ours, `:root.dark .docs-story` | (0,2,1) |

**This was lost on specificity, not priority — another `!important` could never have
fixed it.** The repair carries an ID of its own,
`#storybook-docs [id^="anchor--"] .docs-story` at **(1,2,0)**.

**`parameters.backgrounds` is deliberately untouched.** Pointing its values at
`var(--cream)` is a one-line fix with a thousand-file blast radius: the same values
paint the **story canvas**, whose `#f5f3f0` body is recorded in all 1,019 baselines.

### 3.2 What `docsTheme` can and cannot be made to follow

`create()` runs once at module scope, so it can never be a function of a global —
confirmed, not assumed. The route that works is CSS custom properties, which
Storybook emits verbatim into Emotion rules for the browser to resolve per `<html>`
state. **Each key was tested individually:**

| | keys |
|---|---|
| **accept `var()`** (10) | `appBg` `appContentBg` `appPreviewBg` `textInverseColor` `barBg` `barTextColor` `inputBg` `inputBorder` `inputTextColor` `colorPrimary` |
| **reject `var()`** (3) | `appBorderColor` `textColor` `colorSecondary` |

The three that reject are piped through polished's `parseToRgb`, which throws
*"Couldn't parse the color string"* and **blanks the entire docs page**. They are now
neutral literals, documented as unable to follow either toggle; what the eye sees on
those surfaces is corrected in `storybook.css`, which can use tokens because it is
real CSS. That is the CSS-variable-driven route the brief anticipated, and the exact
boundary of it is now measured rather than assumed.

**The two `#f59e0b` ambers were inert.** Planting an unmistakable `#ff00ff` on
**both** `colorPrimary` and `colorSecondary` paints **nothing** across four docs
pages. These keys theme the manager UI, and there is no `.storybook/manager.ts`, so
the manager runs Storybook's own default theme — swept, and it carries zero
`#f59e0b` / `#f5f3f0` / `#e7e2dc`. They were retired-identity configuration with no
rendered effect: the same shape as Job 2's dead `#fff`.

### 3.3 A third surface, unbriefed and found only by sweeping

Inline `<code>` and the args-table pills are painted from a **hardcoded Emotion class
(`#f7fafc`)** that no theme value reaches at all — **37 elements per page**, still
near-white in dark mode. Both ends are pinned from tokens.

**A first attempt at this was wrong and the sweep caught it.** Re-inking the text
alone — while the chips kept their pinned `#f7fafc` — drove **30 cells to 1.75:1**.
That is precisely the G5 defect this repo already has a rule about: *a rule that pins
a background must pin its foreground.* Measured, reverted, and fixed properly rather
than shipped.

### 3.4 Result, all four cells

| cell | `.sbdocs-wrapper` / `-content` / `-preview` / `.docs-story` | retired-identity elements | chrome text < 4.5:1 |
|---|---|---:|---:|
| default light | all `rgb(252,252,252)` = `--cream` | 0 | 0 |
| default dark | all `rgb(24,24,24)` = `--cream` | 0 | 0 |
| monochrome light | all `rgb(250,250,251)` = `--cream` | 0 | 0 |
| **monochrome dark** | all **`rgb(13,13,15)`** = `--cream` | **0** | **0** |

Docs-chrome text below AA went from **2 spans at 1.70 / 1.86** to **0**. The success
criterion — *Brand monochrome + Theme dark, no white container and no amber chrome* —
is met and measured.

### 3.5 The gate, proved by planting its own targets

`tests/visual/docs-chrome-theme.spec.ts` (G7), 4 tests.

| run | result |
|---|---|
| specificity rule removed | **FAIL ×4** — *".docs-story does not follow --cream"* |
| code-chip rule removed | **FAIL ×4** — *"#f7fafc (unthemed code chip)"* |
| as shipped | **PASS ×4** |
| `colorPrimary` `#f59e0b` restored | **PASS — the gate does NOT catch this** |

**That last row is an honest limit, stated rather than hidden.** The gate cannot catch
a `colorPrimary` regression because that key renders nothing in the docs preview —
established by the magenta test, not assumed. It is not claimed to cover it. Given
eighteen consecutive plans shipped a gate that did not catch its own target, an
uncaught row that is *named* seemed better than a gate that quietly implies coverage
it does not have.

**Baseline movement: none.** Docs pages are not captured by the visual suite, and
every selector added is scoped to docs-only containers that do not exist in
`viewMode=story`.

---

## 4. Gates, each exit code separately

Run from the shipped tree after `npm run format`.

| gate | exit | result |
|---|---:|---|
| `npm run build` | **0** | clean |
| `npm test` | **0** | **1951 passed / 1951**, 123 files |
| `npm run check` | **0** | after `npm run format` — see below |
| `npm run typecheck` | **0** | both tsconfig projects |
| `npm run css:check` | **0** | round-trip byte-exact |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites |
| `DS_BRAND=monochrome test:a11y` | **0** | **508 / 508**, 84 suites — held |
| `npm run test:visual` | **0** | **150 passed, 0 failed** |

`npm run check` went red **once per job**, both times with **exactly 1 `format`
diagnostic and 0 `lint`** (the new spec files). `npm run format` fixed it, and every
gate was re-run from scratch afterwards — the zeroes above are all post-format.

**`test:visual` reached 0 — without re-recording the tabs baseline.** In the final
full run the story's font race fell the settled way and the recorded image matched,
which is one more confirmation that the store holds the correct image. It remains
intermittent: an earlier full run in this session failed it at 94 px. The gate is
therefore **not reliably 0** until the component is fixed (§5, F-1), and I would
rather say that than present one green run as a settled result.

`npm test` reporting **123 files / 0 skipped** matters: `packaging.test.ts` is
`skipIf(!existsSync(dist))`, so `build` was run first and its assertions actually
executed.

---

## 5. Findings raised, not fixed

**F-1 — `Tabs` decides its overflow count from a single font-metric-dependent
measurement, and never re-measures.** The `ResizeObserver` observes an element whose
width never changes, so `measure()` effectively runs once; if it runs before the web
font swaps, "Reports" measures 77 px instead of 76 and `257 > 256` flips the visible
tab count from 3 to 2 — permanently for that page load. **This is a real user-facing
defect, not a test artefact**: a visitor on a cold cache and a visitor on a warm one
see different numbers of tabs. It is also the sole remaining `test:visual` failure.
Three candidate fixes, all of which are product decisions rather than mechanical
repairs, which is why none was taken here:
  1. re-run `measure()` on `document.fonts.ready`;
  2. compare with `>=` / use fractional `getBoundingClientRect().width` instead of
     integer `offsetWidth`, so the boundary is not decided by a rounding step;
  3. move the story off the cliff (its container is 3 px from the boundary), which
     fixes the symptom and leaves the component defect in place.
Option 1 is the honest fix; option 3 alone would be the flattering one.

**F-2 — Playwright's "captured a stable screenshot" is not evidence of correctness,
and has now misled three write-ups.** It compares two screenshots 100 ms apart. Both
of this session's failures printed it. It should not be quoted as a determinism
signal again.

**F-3 — `.ds-atom-btn[data-variant="primary"]` has no working hover state.** The
inline `variantStyles` defeat the entire `:hover` rule, so the primary button never
darkens. Fixing it means moving those inline styles into the stylesheet, which is an
architectural change to the component's styling contract and would move baselines.

**F-4 — `docsTheme.appBorderColor`, `textColor` and `colorSecondary` can never follow
the theme.** They are neutral literals now, and the surfaces they paint are corrected
in CSS, but the underlying limitation is Storybook's, not ours.

**F-5 — the two `docsTheme` ambers, and `primitives.css:84`, were both dead
configuration.** Two of the three defects briefed in this batch had no rendered
effect. The pattern worth noting: **a literal that looks wrong is not evidence that
anything renders wrong**, and in both cases the neighbouring live defect was found
only by sweeping outward from the briefed line.

---

## 6. Method notes

**Servers.** Storybook on **6006** and the page on **5173** were **reused, never
killed** — both answer 200 at the end. Before trusting any measurement the dev server
was confirmed to be serving the edited bytes (`curl` + `grep` for the new symbols),
because a stale Vite cache would have poisoned the probes and the gates at once.

**No forbidden git.** No `git checkout -- <file>`, no `git checkout-index`, no
`git stash`, no `git reset`, no `git worktree`, no `git clean`, at any point. Every
restore came from a `cp` backup verified with `shasum -a 256`, and every mutation was
applied with a Python **assert-one-occurrence** guard that was verified present in the
file before the run — the guard fired on a real mismatch during Job 3 rather than
letting a suite go green against an unmutated file. `husky`/`lint-staged` runs its own
`git stash` on every commit; that is expected tooling, and the committed bytes were
re-verified against the gated `sha256` afterwards (`3cd40624b8fe2cff` for
`primitives.css`). Nothing was ever staged with `git add -A`.

**Brand discipline.** Every browser reading in this document asserts
`<html data-brand>` **and** cross-checks a neutral (`--cream`), per the 01-19.1 lesson
that a node can carry the right brand while its neutrals are shadowed.

---

## 7. Post-conditions

- Branch **`charcoal-theme`** (kept deliberately), **92** commits ahead of `main`,
  tracked-clean; only `?? design_handoff/design_handoff_ds_overview/` untracked.
- `package.json` **1.11.4**. Nothing published, tagged or merged; **0** tags at HEAD;
  the 164 pending renames unapplied.
- **1,019** baselines on disk and tracked. **Exactly one blob changed across all three
  jobs**; the sorted multiset of the other **1018** is unchanged
  (`644cb829…3cbe54` before and after).
- **Akhil's Storybook tab on 6006 needs a reload** — Job 3 changed
  `.storybook/preview.tsx` and `.storybook/storybook.css`, and a tab holding the old
  docs chrome will keep rendering the retired cream until refreshed.

## Self-Check: PASSED

- `$DS/tests/visual/hover-ink-contrast.spec.ts` — FOUND
- `$DS/tests/visual/docs-chrome-theme.spec.ts` — FOUND
- `$DS/.storybook/preview.tsx`, `$DS/.storybook/storybook.css`,
  `$DS/src/primitives.css` — FOUND, all modified as described
- `b6aba81`, `4a259f0`, `12b723c` — all FOUND on `charcoal-theme`
- 1019 baselines tracked; 1 blob moved; other-1018 multiset unchanged — verified
