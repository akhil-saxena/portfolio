---
phase: 01-design-system-charcoal-theme
plan: 02
subsystem: testing
tags: [design-system, storybook, playwright, cascade, computed-style, test-harness]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 01
    provides: src/themes/charcoal.css — the 49-token charcoal layer this harness mounts, parses and breaks
provides:
  - "$DS/.storybook/preview.tsx — a `brand` toolbar global (default | charcoal) composing with the existing `theme` global"
  - "$DS/tests/visual/computed.ts — probeComputed(page, opts) and hexToRgb(hex), the shared computed-style probe for plans 01-09 through 01-20"
  - "$DS/tests/visual/brand-probe.spec.ts — charcoal's order-independence asserted in CI as computed values"
  - "tsconfig.test.json coverage of tests/**/*.ts, which previously covered zero files there"
  - "a browser-verified fix for the dark story wrapper, which defeated charcoal for all 50 design-system dark tokens"
affects: [01-03 CI gates, 01-04 font layer, 01-09 through 01-19 component fixes, 01-20 visual baselines]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Brand x mode is driven from the URL: iframe.html?id=<story>&globals=theme:<mode>;brand:<brand> — verified working on Storybook 8.6"
    - "A downstream plan asserts a rendered result with two lines: probeComputed(page, {story, brand, mode, selector, props}) then expect"
    - "A probe that cannot reach the requested cell, or whose selector matches nothing, THROWS — silence is what makes a harness lie"
    - "Expected values are derived by var()-expanding the stylesheet's own declarations, so the assertion is against the contract rather than against a transcribed constant"

key-files:
  created:
    - ../design-system/tests/visual/computed.ts
    - ../design-system/tests/visual/brand-probe.spec.ts
  modified:
    - ../design-system/.storybook/preview.tsx
    - ../design-system/tsconfig.test.json

key-decisions:
  - "The dark story wrapper drops its `dark` class under charcoal — the design system's own \":root.dark, .dark\" block matched that div and re-declared 50 neutral tokens below the brand layer"
  - "Order-independence is asserted as its observable consequence (every declared property wins in its own mode) plus a discriminating-set count, since four import orders cannot be constructed inside Storybook"
  - "The plan's default-brand --cream figures (#f5f3f0 / #1c1917) were Storybook chrome constants, not the token; the spec asserts the declared #fcfcfc / #181818"
  - "The source-level exhaustiveness check is soft, so the negative control exercises the browser half rather than short-circuiting at the parser"

requirements-completed: [DS-01, DS-06]

# Metrics
duration: 27 min
completed: 2026-08-19
---

# Phase 1 Plan 02: Charcoal Render Harness Summary

**Storybook now has a brand axis, Playwright has a shared computed-style probe, and charcoal's
order-independence is a CI assertion covering all 49 tokens in both modes — but the load-bearing
result is that building the harness immediately exposed a wrapper bug that would have made every
charcoal-dark assertion in the next nine plans measure the design system's neutrals while staying
green.**

## Performance

- **Duration:** 27 min (2026-08-19T01:25:51Z → 2026-08-19T01:52:52Z)
- **Tasks:** 3 of 3
- **Files:** 2 created, 2 modified (598 lines across the three primary files)

## Answers the plan asked for explicitly

1. **The Storybook `globals` query parameter works on 8.6** — the direct-DOM fallback was written
   but never needed. Every run reports `brand axis applied via url-globals 3x, direct-dom 0x`.
   Both `globals=theme:dark;brand:charcoal` and the `%3B`-encoded form drive the axis. The fallback
   stays in `computed.ts` because that query parameter is undocumented surface a Storybook upgrade
   could drop silently, and a harness that quietly stopped applying the brand would turn every
   charcoal assertion into a default-brand assertion that still passed.

2. **The `--wire` negative control was executed and it bit.** Values below.

3. **`storybook.spec.ts` passed with zero baseline updates** — `1 passed (1.6m)`,
   `visual baselines: captured 477, skipped 4 time-dependent`. `git status --porcelain` on
   `tests/visual/storybook.spec.ts-snapshots` is **empty**: 488 files, none added, modified or
   deleted, and no `-diff.png` artefacts were produced.

## The negative control (task 3c)

| | value |
|---|---|
| **SHA-256 before deleting** | `eb151bbc5b63b55dc6bacafd1204775a1129a121ef98d329f950a6f86e9211cb` |
| **SHA-256 after restoring** | `eb151bbc5b63b55dc6bacafd1204775a1129a121ef98d329f950a6f86e9211cb` |
| **Equal?** | **Yes — byte-identical.** Also equals the value 01-01 recorded, so nothing drifted between plans. |

Line 337 (`\t--wire: #727268;`, the charcoal **dark** declaration) was deleted — `git diff --stat`
confirmed **exactly one line, one deletion**, and the light declaration at line 178 was untouched.
Restored with `git checkout -- src/themes/charcoal.css`, never a stash or a reset.

**The spec went red, naming `--wire` twice — once from source, once from the browser:**

```
Error: declared in light but not dark
    expect(received).toEqual(expected) // deep equality
    - Array []
    + Array [
    +   "--wire",
    + ]

Error: charcoal dark --wire
    expect(received).toBe(expected) // Object.is equality
    Expected: ""
    Received: "#878173"
```

**The second one is the finding.** `#878173` is charcoal's **light** wire, rendering in **dark
mode** — one of the exact two fall-through modes Phase 0 recorded ("two of four probe variants
rendered the charcoal light wire `#878173` in dark mode and the other two fell through to the
design system's `rgba(255,255,255,0.22)`"). Which of the two you get is decided by emission order;
this preview imports `charcoal.css` after `tokens.css`, so charcoal light at (0,2,0) ties
`:root.dark` at (0,2,0) and wins on source order. Both are failures, and the exhaustiveness
invariant is what makes the question moot.

That the **browser** half fired independently of the parser half is the whole point, and it only
happened because the source-level check was made soft (see Deviations). With it hard, the run
short-circuited at the parser and the negative control would only ever have proven that a regex
works.

Restored file, re-run: `3 passed`.

## Accomplishments

- **The brand axis exists and composes.** All four cells are reachable and were measured:

  | | charcoal | default |
  |---|---|---|
  | **light** | `--cream` `#f4f1ea`, `--panel` `#fbf9f4`, `--ochre-d-strong` `#6b4417` | `--cream` `#fcfcfc`, `--amber` `#f59e0b` |
  | **dark** | `--cream` `#161616`, `--panel` `#1e1e1d`, `--ochre-d-strong` `#d4a66d` | `--cream` `#181818` |

  `--amber` is `#b0722a` in both charcoal modes. `brand` defaults to `default`, so no existing
  story changes and no baseline moved.

- **`probeComputed` is the harness nine plans will call.** Signature exactly as specified:
  `probeComputed(page, { story, brand, mode, selector, props, index? })` → `Record<string, string>`.
  It waits on the decorator having actually run rather than on `#storybook-root` existing (that
  container is in `iframe.html`'s static markup, so waiting on it is a race), kills animation and
  transition before reading (a colour mid-transition is a real computed value and a useless one),
  awaits `document.fonts.ready`, and **throws** both when the selector matches nothing and when the
  requested cell could not be reached — naming story, selector, brand and mode, and listing the
  `ds-*` classes that *are* present to make the failure diagnosable.

- **Order-independence is now a CI assertion: 49 properties × 2 modes, of which 45 are
  discriminating.** Expected values are not transcribed constants — they are computed by
  var()-expanding the stylesheet's own declarations with the parser `charcoal.css`'s header
  specifies, so the assertion tracks the contract rather than a copy of it. The spec additionally
  asserts that the discriminating set is >10 and that it **contains `--wire`**, which is what
  stops the negative control from being theatre.

- **E1 is asserted on a painted colour, not a token.** `Button` primary sets
  `background: var(--amber)` as an **inline** style, which beats any class rule without
  `!important` — findings E3, E5 and F-12-2 are all that shape. The spec asserts
  `background-color` is `rgb(176, 114, 42)` in both charcoal modes and `rgb(245, 158, 11)` under
  the default brand, via `hexToRgb`. This is the one assertion in the file that no source check
  could replace.

- **`tests/` is type-checked for the first time.** `tsconfig.test.json` covered **zero** files
  there; it now covers **five** (`computed.ts`, three specs, and `tests/treeshake/main.ts`), all
  passing. Confirmed with `--listFiles`, as the plan required.

- **All four sibling gates green at the plan boundary:** `npm test` 115 files / 1444 tests,
  `npm run check` 344 files, `npm run typecheck` both projects, `npm run css:check` 74 files
  round-trip byte-exact. Counts match 01-01's exactly apart from the two files this plan added.

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 — brand axis in the preview | `0f16a5f` | `test(storybook): add charcoal brand axis to the preview` |
| 2 — the probe helper | `2a6cc99` | `test(harness): add the brand x mode computed-style probe` |
| 3 — order-independence spec | `e7fd3b7` | `test(theme): assert charcoal resolves order-independently in both modes` |

Branch `charcoal-theme` in `../design-system`, now **4 commits ahead** of that repo's `main`.
Verified programmatically: **no AI attribution** in any subject, body or trailer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The dark story wrapper defeated charcoal for all 50 design-system dark tokens**

- **Found during:** Task 1, checking the existing decorator before editing it.
- **Issue:** The decorator wraps dark stories in `<div className="dark" …>`. That class matches the
  design system's own `:root.dark, .dark` token block, so the div **re-declared its 50 neutral dark
  tokens directly on itself**, below charcoal's `:root[data-brand="charcoal"].dark` — which can only
  ever match `<html>`. Declared beats inherited, so charcoal lost inside the wrapper. Measured in
  Chromium before changing anything:

  | property | inside `.dark` wrapper | inside a plain wrapper |
  |---|---|---|
  | `--cream` | `#181818` (design system) | **`#161616`** (charcoal) |
  | `--cream-2` | `#1f1f1f` | **`#1e1e1d`** |
  | `--wire` | `rgba(255, 255, 255, 0.22)` | **`#727268`** |
  | `--panel` | `#1c1c1c` | **`#1e1e1d`** |

  Tokens the design system's dark block does *not* declare (`--ochre-d-strong`, `--amber`) inherited
  charcoal correctly either way, which is precisely why this would have looked half-right.

- **Why it is severe:** every element in every story renders **inside** that wrapper. Each of the
  nine downstream plans would have probed charcoal × dark and been handed the design system's
  neutrals. The `--wire` reading above is *literally* the fall-through value Phase 0's negative
  control produces — the harness would have reproduced the bug it exists to detect, permanently and
  invisibly.
- **Fix:** the wrapper omits the `dark` class under charcoal. It is redundant there in any case —
  the decorator already puts `dark` on `<html>`, and all 228 `.dark` rules in `primitives.css` /
  `utilities.css` use a descendant combinator (verified: **zero** `.dark >` direct-child forms), so
  every one still matches from `<html>`. Under the default brand the wrapper is unchanged.
- **Verified:** `--cream` inside the wrapper now reads `#161616` under charcoal × dark; the whole
  49-token spec passes; `storybook.spec.ts` moved zero baselines.
- **Committed in:** `0f16a5f`

**2. [Rule 1 — Bug] The plan's default-brand `--cream` values were Storybook chrome constants**

- **Found during:** Task 3, before writing the assertion.
- **Issue:** The plan states that under `brand: default`, `--cream` must be `#f5f3f0` light /
  `#1c1917` dark. `tokens.css` actually declares `--cream: #fcfcfc` (line 88) and `#181818`
  (line 320). `#f5f3f0` is the `backgrounds` parameter's light value and `#1c1917` is `DARK_BG` —
  Storybook's own chrome, not this token. Asserting them would have made the gate red for a reason
  unrelated to the property it exists to protect, and the temptation would then have been to weaken
  the gate.
- **Fix:** assert the declared `#fcfcfc` / `#181818`. The assertion's *purpose* — charcoal is scoped
  and has not leaked — is served strictly better by the true values. A comment in the spec records
  the correction so the next reader does not "fix" it back.
- **Committed in:** `e7fd3b7`

**3. [Rule 3 — Blocking] `rootDir: "./src"` rejected every file under `tests/`**

- **Found during:** Task 2, adding `tests/**/*.ts` to `tsconfig.test.json`.
- **Issue:** `TS6059: File '…/tests/…' is not under 'rootDir' '…/src'` for all five files — the
  include matched, then the inherited `rootDir` rejected the lot, so the plan's mandated change
  could not take.
- **Fix:** override `rootDir` to `"."` in `tsconfig.test.json`. `rootDir` constrains where *emitted*
  output lands and this project sets `noEmit: true` — exactly the argument the file already makes
  for its `declaration` / `declarationMap` / `composite` overrides. Comment written in that voice.
- **Committed in:** `2a6cc99`

**4. [Rule 2 — Correctness] The source-level exhaustiveness check was made soft**

- **Found during:** Task 3, designing the negative control.
- **Issue:** As a hard `expect`, the "declared in light but not dark" check aborts the test before
  any browser assertion runs. Deleting `--wire` would then have proven only that the regex parser
  works — and this plan exists because **a grep cannot prove a style applied**.
- **Fix:** `expect.soft` for both invariant checks, matching the lesson `storybook.spec.ts` already
  records about a single hard assert hiding the rest of a looping test. Confirmed by the control:
  both the parser assertion and the browser assertion fired, and the browser one carried the
  `#878173` evidence.
- **Committed in:** `e7fd3b7`

**5. [Rule 3 — Blocking] The plan's own `test(` gate false-positives on `RegExp.prototype.test`**

- **Found during:** Task 2, running the plan's verify block.
- **Issue:** The gate `grep -qE '\btest\(' computed.ts` fired on `/^[0-9a-f]{6}$/i.test(full)` in
  `hexToRgb`. It cannot tell a regex method call from a declared Playwright case.
- **Fix:** **the gate was kept verbatim and the code moved** — `.exec(...) === null` instead. A gate
  is not weakened to accommodate an implementation detail. Worth flagging for whoever edits this
  file next: an intermediate version explained the workaround in a comment that *quoted the pattern*,
  and the gate then passed only because the literal `b` in `\btest(` glues to `test` and destroys the
  word boundary. That is an accident, not a pass, so the comment now states the constraint in prose
  and the file contains **no literal `test(` at all**.
- **Committed in:** `2a6cc99`

---

**Total deviations:** 5 auto-fixed (2 × Rule 1 bug, 2 × Rule 3 blocking, 1 × Rule 2 correctness).
No architectural change, no scope widening, every change inside the plan's declared `files_modified`
except the `tsconfig.test.json` `rootDir` line, which the plan mandated the include for.

## Issues Encountered

- **`config.rootDir` is `testDir`, not the repo root.** The first spec run failed looking for
  `tests/visual/src/themes/charcoal.css`. Derived from `test.info().config.configFile` instead, which
  is exact. Worth knowing for 01-03, which parses the same stylesheet.
- **Biome's `lint/style/useTemplate`** rejects mixed template/string concatenation, which the long
  diagnostic messages used. Rewritten as arrays joined with `" "` — lint-clean and it keeps the
  messages inside the 100-column limit. `npm run format` touched only files this plan created; no
  committed file was reformatted (verified by `git status` immediately after).
- **The pre-commit `lint-staged` hook takes its own `git stash`** (as 01-01 recorded). It cleaned up
  after itself every time; the working tree diff against `HEAD` was empty after each commit and the
  spec was re-run against the **committed** bytes and passed.
- **No `PIPESTATUS` was used anywhere**, per 01-01's warning. Gate exit codes were captured with
  `if cmd; then … fi`. The plan's own verify blocks contain no piped exit codes, so all were run
  verbatim.

## Findings raised (not fixed)

Per protocol §10, recorded here only. **No row was added to `00-FINDINGS.md`.**

1. **Dark-mode captures have a light surround — this lands on 01-20, not here.** The `backgrounds`
   addon paints the canvas `<body>` `#f5f3f0` from its own `default: "light"` value, independently of
   the `theme` global. Setting `globals=theme:dark` alone therefore gives a **dark story wrapper on a
   light page** (measured: `bodyBg rgb(245,243,240)`, `wrapperBg rgb(22,22,22)`); it is exactly why
   the wrapper exists. This has never bitten because the 488 baselines are all captured at default
   globals, i.e. light. **D-37's charcoal dark captures will hit it**, and `fullPage: true` will bake
   the light surround into every dark baseline. 01-20 should set the `backgrounds` global alongside
   `theme`, or capture the wrapper element rather than the page. Pre-existing behaviour, untouched by
   this plan.
2. **The default brand's dark wrapper backdrop moved `#1c1917` → `#181818`.** Following the plan's
   instruction to read the wrapper background from `var(--cream)` rather than the `DARK_BG` constant
   means the default brand now tracks its own token instead of a constant that disagreed with it by
   4 units. **No baseline moved** (dark globals are never used in capture, verified), but a human
   flipping the toolbar to dark under the default brand sees the 4-unit change. Called out because it
   is the one default-brand-visible consequence of this plan; `DARK_BG` still backs the `backgrounds`
   parameter and the dark-detection branch, both of which are brand-independent.
3. **`probeMeta` is per-worker module state.** It counts how the axis was applied, and Playwright
   gives each worker its own module registry. It is only meaningful when read from a spec in the same
   file that did the probing — which `brand-probe.spec.ts` does. A future plan asserting on it from a
   different file would read zeroes.
4. **`tests/treeshake/main.ts` is now type-checked** as a side effect of the `tests/**/*.ts` include.
   It passes today. Flagged so that a future failure there is understood as newly-*visible* rather
   than newly-*broken*.

## Verification Performed

- `npx playwright test tests/visual/brand-probe.spec.ts` → **3 passed**, re-run against the committed
  bytes after the pre-commit hook.
- `npx playwright test tests/visual/storybook.spec.ts` → **1 passed (1.6m)**, 477 captured, 4 skipped,
  **zero** snapshot files added/modified/deleted.
- Negative control executed: red naming `--wire` from both source and browser; restore verified
  byte-identical by SHA-256; green again.
- Four sibling gates green individually and as a single guarded expression.
- `--listFiles` proves 5 files under `tests/` are type-checked (was 0).
- Human-check evidence captured in Chromium: charcoal × dark renders `#161616` with an ochre
  `rgb(176,114,42)` primary button; default × dark renders `#181818` with `rgb(245,158,11)`.

## Next Phase Readiness

**Ready.** The harness the rest of Phase 1 depends on is in place and proven to fail when it should.

- **01-03** (CI gates) can reuse `blockOf` / `declarationsOf` from `brand-probe.spec.ts` — they
  implement the parser `charcoal.css`'s header specifies. Two carry-overs: derive the repo root from
  `test.info().config.configFile`, and remember 01-01's finding 1 (`check-no-ivory.sh` line 142 needs
  `-i` for the lowercased file).
- **01-04** (font layer) — `probeComputed` already awaits `document.fonts.ready`, so face-layer
  changes can be asserted on computed `font-family` directly.
- **01-09 … 01-19** (component fixes) — assert a rendered result in two lines:
  `const v = await probeComputed(page, { story, brand: "charcoal", mode: "dark", selector, props });`
  then `expect(v[...])`. The probe throws rather than returning empty, so a stale selector after a
  refactor surfaces as a loud failure instead of a green tautology.
- **01-20** (baselines) — **read finding 1 before recording charcoal dark captures.**
- **No blockers.** `$DS/.planning/` was never touched; this SUMMARY is the only portfolio-side write.

---
*Phase: 01-design-system-charcoal-theme*
*Completed: 2026-08-19*
</content>
</invoke>

## Self-Check: PASSED

Verified after writing this SUMMARY:
- all four claimed files exist in `../design-system`; each commit's `--stat` matches what this
  SUMMARY attributes to it (`0f16a5f` preview only; `2a6cc99` `computed.ts` + `tsconfig.test.json`;
  `e7fd3b7` `brand-probe.spec.ts` only)
- commits `0f16a5f`, `2a6cc99`, `e7fd3b7` exist on `charcoal-theme`, which is **4 ahead** of the
  sibling's `main`
- the 228 `.dark` rule figure was recounted from source, not transcribed
- **no path under `.planning/` was touched in either repository** by any of the three commits
- the frontmatter's `key_links` patterns all resolve: `themes/charcoal.css` and `data-brand` in
  `preview.tsx`, `probeComputed` in `brand-probe.spec.ts`
- this SUMMARY is the only file this plan wrote in the portfolio repo
