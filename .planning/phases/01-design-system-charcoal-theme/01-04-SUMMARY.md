---
phase: 01-design-system-charcoal-theme
plan: 04
subsystem: design-system
tags: [fonts, d-29, d-36, breaking-change, criterion-4, negative-control, semver-major]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 01
    provides: src/themes/charcoal.css — the --font-* tokens whose family names this plan asserts against real @font-face rules
  - phase: 01-design-system-charcoal-theme
    plan: 03
    provides: the lesson that a control must fail FOR ITS STATED REASON — applied here, and it caught the plan's headline gate
provides:
  - "$DS/src/fonts/charcoal.css — the charcoal face layer, 4 entry points, 8 faces, 0 tokens"
  - "$DS/src/fonts/default.css — the four pre-2.0 families relocated verbatim, 15 inclusions, 73 faces, 0 tokens"
  - "$DS/src/tokens.css — the token layer with zero transitive faces, D-36's breaking half"
  - "$DS/src/tokens.test.ts — `font delivery`: 36 cases incl. the transitive face count the plan's own gate cannot see"
  - "$DS/tests/visual/font-download.spec.ts — criterion 4 as a real network measurement, both halves"
affects: [01-05 italic axis decision, 01-06 exports map, 01-20 baselines, 01-21 v2.0.0 publish + registry re-measure]

# Tech tracking
tech-stack:
  added:
    - "@fontsource-variable/playfair-display@5.3.0"
    - "@fontsource-variable/dm-sans@5.3.0"
    - "@fontsource/ibm-plex-mono@5.3.0"
  patterns:
    - "Face counts are measured TRANSITIVELY — follow every @import into node_modules and sum — because the published dist/tokens.css is a raw copy and its face count is always 0"
    - "A negative assertion is only load-bearing if the thing it forbids was actually available; the criterion-4 probe therefore declares all 81 faces and asserts only 3 download"
    - "Every observed font URL must match one of the seven family patterns, so a Fontsource file rename fails loudly instead of turning a negative assertion into a tautology"

key-files:
  created:
    - ../design-system/src/fonts/charcoal.css
    - ../design-system/src/fonts/default.css
    - ../design-system/tests/visual/font-download.spec.ts
  modified:
    - ../design-system/src/tokens.css
    - ../design-system/src/tokens.test.ts
    - ../design-system/.storybook/preview.tsx
    - ../design-system/package.json
    - ../design-system/package-lock.json

key-decisions:
  - "The plan's headline gate — zero @font-face in dist/tokens.css — was ALREADY GREEN before any change, because dist/tokens.css is a byte-identical copyFileSync of src. It was kept verbatim and a transitive face-count assertion added beside it, proven to bite where the specified one cannot."
  - "The criterion-4 browser probe serves its own document via page.route() rather than loading a story, and runs TWICE: charcoal-only (the criterion as worded) and both-layers (the version whose negative half can actually fail)."
  - "The Variable-suffix guard checks BOTH charcoal blocks, not only light — reading one block would leave a wrong family name in the other undetected."
  - "Storybook's 26-pixel first-run diff was diagnosed by CDP getPlatformFontsForNode, not by re-recording: the label rasterises the real JetBrains Mono webfont. Second run was clean; the flake was Vite re-optimising deps after the install."

requirements-completed: [DS-04, DS-05, DS-06]

# Metrics
duration: 30 min
completed: 2026-08-19
---

# Phase 1 Plan 04: Font Delivery + D-36 Summary

**D-36 landed: the token layer's transitive face payload went from 73 rules / 128 files /
2,174,132 B to 0 / 0 / 0, and the four families were relocated losslessly. But the load-bearing
result is the same shape as 01-03's: the plan's own headline gate — "zero `@font-face` in
`dist/tokens.css`" — was already green before a single line changed, and stayed green when all 73
faces were deliberately put back into every consumer's bundle. It measured nothing, in either
direction, and I proved that by running it against the reintroduced defect.**

## Performance

- **Duration:** ~30 min (2026-08-19T08:18+0530 → 08:48+0530)
- **Tasks:** 4 of 4
- **Files:** 3 created, 5 modified
- **Suite:** 1503 → **1539** tests (+36), 115 files, all passing
- **Negative controls executed:** **6** (the plan named 1)

---

## The three D-36 measurements — and why one of the plan's three is unmeasurable

The plan asked for three numbers "beside their prior values 16,007 / 73 / 65,493". Two of the
three are fine. The middle one names a file where the quantity does not exist.

| # | Measurement | Prior (stated) | Prior (measured) | After | Verdict |
|---|---|---:|---:|---:|---|
| 1 | `src/tokens.css` on disk | 16,007 B | **16,007 B** ✓ | **15,817 B** | −190 B, as predicted ("barely moves") |
| 2 | `@font-face` in **`dist/tokens.css`** | 73 | **0** ✗ | **0** | **the quantity is not in this file** |
| 3 | `dist/tokens.css` bytes | 65,493 | **16,007 B** ✗ | **15,817 B** | same reason |

`scripts/postbuild.mjs` builds `dist/tokens.css` with `copyFileSync(src, dist)`. It is a **raw
copy**, verified with `cmp`: byte-identical before and after. It has therefore *always* held zero
face rules and 15 bare `@fontsource` `@import` lines — including on the release that shipped all
73. The 73 come into existence only when a bundler resolves those specifiers.

**So the real measurement had to be taken where the inlining happens.** I bundled the published
`dist/tokens.css` through Vite exactly as a consumer would, before and after:

| Bundled `dist/tokens.css` | Before | After |
|---|---:|---:|
| `@font-face` rules | **73** | **0** |
| Distinct families | Archivo, Inter, JetBrains Mono, Newsreader Variable | *(none)* |
| Font files emitted | **128** | **0** |
| Font bytes emitted | **2,174,132 B** | **0 B** |
| Emitted CSS bytes | 82,277 B | 15,817 B |

**Three of those four reproduce `00-THEME-API.md` exactly** — 73 rules, 128 files (65 woff2 + 63
woff), 2,174,132 B. That is a strong cross-check on the harness, since none of the three was
transcribed into it.

**The fourth does not, and it is not drift.** The contract's 65,493 B is a *bundled CSS byte*
figure, and that number is a function of how the bundler rewrites `url()` targets — mine emits
hashed asset paths (`/assets/inter-latin-400-normal-<hash>.woff2`), which are longer than
Fontsource's relative `./files/…`. Face count, file count and font bytes are all bundler-config
independent; the CSS byte figure is not. **Use 73 / 128 / 2,174,132 as the D-36 baseline and treat
65,493 as config-specific to whatever Phase 0 built.**

### The relocation is provably lossless

Bundling `fonts/default.css` **on its own** reproduces the old payload exactly:

| Bundled | `@font-face` | files | font bytes | families |
|---|---:|---:|---:|---|
| `fonts/default.css` | **73** | **128** | **2,174,132** | Archivo, Inter, JetBrains Mono, Newsreader Variable |
| `fonts/charcoal.css` | **8** | **10** | **200,864** | DM Sans Variable, IBM Plex Mono, Playfair Display Variable |

Both charcoal figures match the contract's table exactly (8 rules; 10 files = 8 woff2 + 2 woff;
200,864 B). The "nothing was deleted, only moved" promise in the `BREAKING CHANGE:` footer is
therefore a measured claim, and it is asserted in CI (`relocates all 73 pre-2.0 faces without
losing one`).

## Per-entry-point face census

Parsed from the installed packages, keyed by specifier so a Fontsource minor bump that moves one
subset count fails with a diff rather than a bare total mismatch:

| Entry point | Faces | Expected |
|---|---:|---:|
| `@fontsource-variable/playfair-display/wght.css` | **4** | 4 |
| `@fontsource-variable/dm-sans/wght.css` | **2** | 2 |
| `@fontsource/ibm-plex-mono/latin-400.css` | **1** | 1 |
| `@fontsource/ibm-plex-mono/latin-500.css` | **1** | 1 |
| **Total** | **8** | 8 |

All four resolve through each package's `./*.css` `exports` wildcard, with the file present on
disk — checked explicitly, because the failure otherwise is G-12's postcss `ENOENT` quoting the
bare specifier as a filesystem path.

`@fontsource-variable/ibm-plex-mono` was never typed into any command, and a machine assertion
fails the build if it ever appears in `package.json` (T-00-12).

## Criterion 4, measured as a download

`tests/visual/font-download.spec.ts` subscribes to `page.on("request")` **before** navigating and
serves its own document through `page.route()` — the real `tokens.css`, `themes/charcoal.css` and
`fonts/*.css` off disk, with the Fontsource entry points inlined and their `url()` targets
re-pointed at routed paths serving the actual woff2 bytes. `<html data-brand="charcoal">`, and the
three text runs reach their families *through* the charcoal `--font-*` tokens rather than naming
them directly, so the whole chain is exercised.

**The full observed URL list — identical for both tests:**

```
http://charcoal-font-probe.test/__font/3/playfair-display-latin-wght-normal.woff2
http://charcoal-font-probe.test/__font/5/dm-sans-latin-wght-normal.woff2
http://charcoal-font-probe.test/__font/6/ibm-plex-mono-latin-400-normal.woff2
```

**Three files. One latin file per family. Zero pre-2.0 families.** That is D-30's *"latin-only
DOWNLOAD, guaranteed by `unicode-range`"* measured rather than assumed: 8 faces are declared, 10
files are available, 3 are fetched. Playfair's cyrillic, vietnamese and latin-ext rules and DM
Sans's latin-ext rule are all present and none is requested.

Storybook isolation **was not impractical** and the half was not deferred to 01-21 — but see
below, because the isolation the plan proposed is precisely what makes the negative half
worthless.

## Negative controls — all six executed, each verified to fail for its stated reason

`src/themes/charcoal.css` SHA-256 was
`eb151bbc5b63b55dc6bacafd1204775a1129a121ef98d329f950a6f86e9211cb` before every break and after
every restore. It is the same value 01-01, 01-02 and 01-03 each recorded, so the file has not
drifted across four plans. Every restore used `git checkout -- <path>`; never a stash, never a
reset, never a clean.

### Control A — the plan's named control: strip `Variable` from `--font-serif` (light block)

**Exactly 4 assertions failed, naming exactly the four predicted tokens.**

| # | Failing case | head resolved to |
|---|---|---|
| 1 | `charcoal light --font-serif names a family that fonts/charcoal.css actually declares` | `Playfair Display` |
| 2 | `charcoal light --font-display …` | `Playfair Display` |
| 3 | `charcoal light --display …` | `Playfair Display` |
| 4 | `charcoal light --serif …` | `Playfair Display` |

```
AssertionError: charcoal light --font-serif heads its stack with "Playfair Display", which has
no @font-face in fonts/charcoal.css. Registered there: dm sans variable, ibm plex mono,
playfair display variable
Tests  4 failed | 103 passed (107)
```

**A count of 1 would have been a failure of this task; the count is 4.** The alias resolution
works: `--font-display`, `--display` and `--serif` all resolve through `--font-serif`. The eight
**charcoal dark** cases stayed green, which independently confirms the two blocks are read
separately.

| | value |
|---|---|
| SHA before | `eb151bbc…9211cb` |
| SHA after restore | `eb151bbc…9211cb` |
| Equal? | **Yes — byte-identical** |

### Control B — a custom property sneaks into the charcoal face layer

Appended `:root { --font-display-fallback: Georgia; }`. **1 failure**, the right one:
`fonts/charcoal.css carries faces only, never tokens`. Restored to SHA
`19d4ddaa…10d9a1`, equal.

### Control C — a forbidden family is added to the charcoal face layer

Appended `@import "@fontsource/inter/400.css";`. **4 failures**, and critically the criterion-4
negative half fired on its own message:

```
× resolves the charcoal face layer to exactly its four entry points  → expected {…(5)} to equal {…(4)}
× resolves the charcoal face layer to exactly 8 @font-face rules     → expected 15 to be 8
× names exactly the three charcoal families, with the Variable suffix
× downloads none of the four pre-2.0 families under charcoal         → expected ['Inter','Inter','Inter',…(4)] to equal []
```

Restored to SHA `19d4ddaa…10d9a1`, equal.

### Control D — the one that condemns the plan's own gate

Put **all 73 faces back into every consumer's bundle** without writing the string `@fontsource`
anywhere, by adding one line to `src/tokens.css`:

```css
@import "./fonts/default.css";
```

**All three of the plan's specified task-2 gates passed with the defect fully present:**

```
src  @fontsource=0  @font-face=0
dist @font-face=0   (plan asserts == 0)
>>> ALL THREE OF THE PLAN'S GATES PASS. The defect is fully present.
```

And what a consumer's bundler actually emitted from that same `src/tokens.css`:

```
"bundled_font_face": 73,
"font_files_emitted": 128,
"font_bytes_emitted": 2174132,
"face_families": ["Archivo", "Inter", "JetBrains Mono", "Newsreader Variable"]
```

The added transitive assertion went red, with the diff naming the culprit:

```
× font delivery > pulls in zero faces transitively through the token layer
  → expected { './fonts/default.css': 73 } to deeply equal {}
```

Restored; `src/tokens.css` SHA `287a7cdf…fda7b3`, equal; rebuilt; 107 passed.

### Control E — the `Variable` strip, measured at the network layer

Same edit as control A but in **both** blocks, then re-ran the browser probe. Downloads dropped
from **3 to 2** and both tests went red naming the family:

```
charcoal-only probe fetched 2 font files
both-layers  probe fetched 2 font files
Error: Playfair Display was never downloaded. Observed:
  …/dm-sans-latin-wght-normal.woff2, …/ibm-plex-mono-latin-400-normal.woff2
```

This is the DS-05 failure mode caught as an *absent HTTP request* — the page silently rendering
Georgia, exactly as `00-THEME-API.md` describes it. SHA `eb151bbc…9211cb`, equal.

### Control F — the control that proves the plan's proposed isolation would have been decoration

Added `<span style="font-family: Inter">` to the probe page, so the document renders text that
reaches a pre-2.0 family.

| Test | Result | Why |
|---|---|---|
| **charcoal-only page** | **PASSED** ✗ | Inter's faces are not declared there, so no request *can* occur |
| **both layers declared** | **FAILED** ✓ | `Inter was downloaded although charcoal names no token that reaches it` — `inter-latin-400-normal.woff2` |

**The negative half of the criterion, tested the way the plan describes it, cannot fail.** "Isolate
so the page consumes only charcoal" removes the very faces whose absence is being asserted. That is
the same shape as 01-03's over-parsing brace and as the `Set` that absorbed its own duplicate. The
both-layers test is the one carrying the criterion; the charcoal-only test is kept because it is
the criterion as literally worded, and is now documented in the file as the tautological half.
Spec SHA `3256b611…f11a86e` before and after, equal.

## The Storybook baseline scare, and how it was diagnosed

The first run of `storybook.spec.ts` after the change failed on **one** story,
`foundation-divider--labeled`, by **26 pixels** in an 11×7 box at (190,35)–(200,41).

The plan says a moving baseline means the face layer is not reaching Storybook, and forbids
re-recording. Both were right to say, and neither was the answer. Rather than trust or re-record
pixels, I read the ground truth through CDP `CSS.getPlatformFontsForNode`:

```
<div>  ->  JetBrains Mono x2 [WEBFONT]
<span> ->  JetBrains Mono x2 [WEBFONT]
```

The label rasterises the **real webfont**, not a fallback; `document.fonts` reported **85**
registered faces (73 default + 8 charcoal + 4 of Storybook's own Nunito Sans), up from 77 — so both
face layers were reaching the preview. The 11×7 box is the two-glyph 9.5px "OR" label; a fallback
would have moved the whole page and changed its height, and the image dimensions were identical.

**A second run with no code change passed: 477 captured, 4 skipped, zero baseline updates.** The
cause is in the Storybook log — `[vite] Re-optimizing dependencies because lockfile has changed`,
triggered by the three packages installed minutes earlier. Run 1 raced Vite's dep re-optimisation.
**Nothing was re-recorded.**

## Accomplishments

- **D-36's break is real, versioned and one line to migrate.** 73 faces / 128 files / 2.17 MB
  leave the token layer; all four families survive intact in `fonts/default.css`; the commit
  carries a `BREAKING CHANGE:` footer naming them and the migration line.

- **The gate that actually holds D-36 in place now exists.** `pulls in zero faces transitively
  through the token layer` follows every `@import` into `node_modules` and sums. It is the only
  assertion in this plan that fails on control D — the specified source-grep and dist-grep both
  sail through.

- **DS-05 cannot regress silently, in two independent layers.** A source-level family-to-face
  agreement check across **three** token blocks (default `:root`, charcoal light, charcoal dark),
  resolving `var()` aliases; and a network-level probe where a lost `Variable` suffix shows up as a
  font that never gets fetched.

- **Criterion 4 is asserted in both directions at both levels** — package census (8 rules, 3
  families, 4 forbidden families explicitly absent) and real HTTP requests (3 files, one per
  family, zero pre-2.0 families), with the negative half placed where it can actually fail.

- **The token-count assertion is asserted.** Each theme's font-token set is pinned at 8 by name, so
  a renamed token produces a failure rather than a smaller green run — the 01-03 lesson applied
  prospectively.

- **All four sibling gates green:** `npm test` 115 files / **1539** tests, `npm run check` 347
  files no fixes applied, `npm run typecheck` both projects, `npm run css:check` 74 files
  round-trip byte-exact.

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 — install + two face layers | `71e30b1` | `feat(fonts): add charcoal and default face layers (D-29 split)` (+124) |
| 2 — the D-36 breaking change | `58f9e8c` | `feat(tokens)!: remove @font-face from the token layer` (+23/−20) |
| 3 — census + agreement gate | `d93c1e1` | `test(fonts): assert face census and font-family-to-face agreement` (+248/−2) |
| 4 — browser download probe | `dd1d0b4` | `test(fonts): measure the charcoal font download in a browser` (+224) |

Branch `charcoal-theme` in `../design-system`, now **10 commits ahead** of that repo's `main`.
Author `Akhil Saxena <saxena.akhil42@gmail.com>` on all four. **No AI attribution** anywhere —
verified programmatically across the whole branch
(`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` → `0`).

Every file's SHA-256 was identical before and after its commit, so the `lint-staged` hook
reformatted nothing: **the bytes that were tested are the bytes that were committed.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Correctness] The plan's headline D-36 gate cannot fail on the defect it names**

- **Found during:** Task 2, before editing anything — the pre-change baseline measurement.
- **Issue:** The plan's central assertion is `grep -o '@font-face' dist/tokens.css | wc -l` must be
  `0`, "was 73". `dist/tokens.css` is produced by `copyFileSync(src/tokens.css, dist/tokens.css)`
  in `scripts/postbuild.mjs`. Measured before any change: **0 faces, 16,007 bytes, byte-identical
  to source under `cmp`**. The gate was already green with the defect fully present, and the
  `test -s` guard the plan (correctly) insists on does not help, because the file exists and is
  non-empty.
- **Why it is severe:** this is the plan's own stated reason for being a major, and it is the
  assertion `<verification>` and `<success_criteria>` both lead with. As specified it is the third
  gate in this phase that could not fail.
- **Fix:** the specified gate was **kept verbatim** — it is cheap and it would catch a future
  postbuild that starts bundling — and `pulls in zero faces transitively through the token layer`
  was added beside it, resolving every `@import` through `node_modules` and summing. It fails with
  `expected { './fonts/default.css': 73 } to deeply equal {}` on an edit the specified gates cannot
  see. Both are commented with the `copyFileSync` mechanism so neither is later "simplified" away.
- **Verified:** control D above. Specified gates green, added assertion red, consumer bundle
  independently confirming 73 faces / 128 files / 2,174,132 B.
- **Committed in:** `d93c1e1`

**2. [Rule 2 — Correctness] The criterion-4 isolation the plan proposes makes the negative half a tautology**

- **Found during:** Task 4, designing the probe.
- **Issue:** The plan says Storybook loads both face layers, so a naive story would legitimately
  fetch Inter — therefore "isolate: render the probe with an explicit charcoal-only stack". But
  a page that loads only `fonts/charcoal.css` **has no Inter face at all**, so "zero requests
  matching `inter`" is true by construction and cannot fail. That is the half the plan itself
  calls "the criterion's actual content".
- **Fix:** the probe runs twice. Test 1 links charcoal alone — the criterion as literally worded,
  documented in the file as the half that cannot fail. Test 2 links **both** layers, so all 81
  faces are declared and the browser genuinely could fetch Inter; it does not, because no charcoal
  `--font-*` token reaches it. An exhaustiveness assertion was also added — every observed URL must
  match one of the seven family patterns — so a Fontsource file rename fails loudly instead of
  making a pattern match nothing and pass.
- **Verified:** control F. With a stray `font-family: Inter` span on the page, test 1 **passed**
  and test 2 **failed** naming `inter-latin-400-normal.woff2`.
- **Committed in:** `dd1d0b4`

**3. [Rule 2 — Correctness] The `Variable`-suffix guard read only charcoal's light block**

- **Found during:** Task 3, immediately before running control A.
- **Issue:** charcoal declares all eight font tokens in **both** blocks (lines 91–101 and
  273–281). Checking only `:root[data-brand="charcoal"]` leaves a wrong family name in the dark
  block undetected — the mirror image of the light-only blind spot that let `--rule-strong` ship
  dark-only.
- **Fix:** a third `(theme, block, face layer)` pair, `charcoal dark`, added to the loop. Charcoal
  now contributes 16 agreement cases instead of 8.
- **Verified:** control A breaks the light block only, and produces exactly 4 failures — all
  labelled `charcoal light` — while all 8 `charcoal dark` cases stay green. The separation is
  demonstrated, not assumed. The plan's predicted count of 4 is unaffected.
- **Committed in:** `d93c1e1`

**4. [Rule 3 — Blocking] `npm install` reformatted `package.json` in a way `npm run check` rejects**

- **Found during:** Task 1.
- **Issue:** `npm install --save` rewrote the `lint-staged` glob array across three lines; Biome
  requires it on one. `npm run check` — a plan-boundary gate — went red on formatting alone.
- **Fix:** `npx biome check --write package.json`, scoped to that one file rather than a repo-wide
  `npm run format`, per protocol §5. The dependency diff is exactly +3 lines.
- **Committed in:** `71e30b1`

---

**Total deviations:** 4 auto-fixed (3 × Rule 2 correctness, 1 × Rule 3 blocking). **No gate was
weakened; every specified assertion was kept verbatim and strengthened alongside.** No
architectural change, no scope widening. `src/themes/charcoal.css` was declared in no plan file
list here but was broken and restored three times; it ends byte-identical, SHA
`eb151bbc…9211cb`.

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **`00-THEME-API.md`'s 65,493 B bundled-`tokens.css` figure is not reproducible and should be
   retired as a D-36 baseline.** Face count (73), file count (128) and font bytes (2,174,132) all
   reproduce exactly; the CSS byte figure is a function of the bundler's `url()` rewriting scheme.
   Measured here as 82,277 B under a plain Vite build. **Cite 73 / 128 / 2,174,132.**

2. **`src/tokens.css`'s header still reads `v1.5.0`** while `package.json` is at `1.11.4` and
   heading for `2.0.0`. The new paragraph I added says "as of v2.0.0" four lines below it, which
   reads oddly. Left alone deliberately: 01-21 owns the version bump.

3. **`package.json` `exports` has no `./fonts/*` or `./themes/*` entry yet**, so the specifiers
   both new file headers document —`@akhil-saxena/design-system/fonts/charcoal.css` — do not
   resolve for a consumer today, and `dist/fonts/` is not produced by `postbuild.mjs`. **01-06 owns
   exactly this** and must not be skipped, or the v2.0.0 migration line in the `BREAKING CHANGE:`
   footer is unusable.

4. **Seven orphaned visual baselines.** 488 PNGs on disk, 481 stories in Storybook's index, 477
   captured (4 time-dependent skipped). The plan's "488 baselines" figure is the file count, not
   the assertion count. Relevant to 01-20, which records charcoal baselines.

5. **`storybook.spec.ts` is flaky immediately after a dependency install.** Run 1 produced a
   26-pixel single-glyph diff while Vite was re-optimising deps; run 2 was clean. Anything that
   runs the visual suite right after `npm install` should warm the server first.

6. **Still unaddressed, carried from 01-03:** `check-no-ivory.sh` line 142 uses a case-sensitive
   `grep -cE` against uppercase `#8D8779`/`#C4BDAD` while `charcoal.css` carries them lowercase.
   This plan did not port that script either. Whichever plan ports it must add `-i`.

7. **The `KNOWN GAP` italic-axis paragraph in `fonts/charcoal.css` is untouched, as instructed.**
   01-05 resolves it. Note for that plan: the recorded baseline this plan established is **8 faces
   / 10 files / 200,864 B / 3 downloaded files**. Adding `wght-italic.css` moves the first to 12,
   and the download figure will move too — the 22px italic display subtitle would then fetch a
   fourth file.

## Self-Check: PASSED

Files claimed created, verified on disk:

```
FOUND: ../design-system/src/fonts/charcoal.css              19d4ddaa…10d9a1
FOUND: ../design-system/src/fonts/default.css               b7d8e88f…aabc8d
FOUND: ../design-system/tests/visual/font-download.spec.ts  3256b611…f11a86e
FOUND: ../design-system/src/tokens.css                      287a7cdf…fda7b3  (15,817 B)
FOUND: ../design-system/src/tokens.test.ts                  af527a9c…acff279
```

Commits claimed, verified present on `charcoal-theme`:

```
FOUND: 71e30b1  feat(fonts): add charcoal and default face layers (D-29 split)
FOUND: 58f9e8c  feat(tokens)!: remove @font-face from the token layer
FOUND: d93c1e1  test(fonts): assert face census and font-family-to-face agreement
FOUND: dd1d0b4  test(fonts): measure the charcoal font download in a browser
```

Sibling tree state at exit: `git status --porcelain` shows only the permitted
`?? design_handoff/design_handoff_ds_overview/`. Branch `charcoal-theme`, 10 commits ahead of
`main`. Port 6006 released; the user's `:4321`, `:6008` and `:6009` were checked and left running.
