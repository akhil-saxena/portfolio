---
phase: 01-design-system-charcoal-theme
plan: 05
subsystem: design-system
tags: [fonts, italic-axis, theme-api-open-decision-1, checkpoint-decision, playfair, baseline-restatement]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 04
    provides: src/fonts/charcoal.css and the 8-face baseline this plan moves to 12
  - phase: 00-design-ideation
    plan: THEME-API
    provides: open decision 1 — the italic axis, surfaced rather than resolved
provides:
  - "$DS/src/fonts/charcoal.css — 5 entry points, 12 faces, both Playfair axes, 0 tokens"
  - "$DS/src/tokens.test.ts — the face census restated to 12 / five, count in the test NAME as well as the assertion"
  - "THEME-API open decision 1, CLOSED as option-b by the user"
affects: [01-06 exports map, 01-12 AppBar/Footer, 01-20 charcoal baselines, 01-21 v2.0.0 publish, Phase 5 manifest comparison]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The recorded charcoal face baseline is 12 / 14 files / 295,920 B available — NOT 8. Any later plan quoting 8 is quoting a retired number."
    - "Face-rule counts belong in the test NAME as well as the assertion, so a restatement that misses one shows up as a name/behaviour mismatch rather than a silently green run"
    - "A synthesised oblique is provable by advance width: sheared roman outlines keep identical widths, drawn italics do not. getComputedStyle cannot tell the two apart — it reports `italic` for both."

key-files:
  created: []
  modified:
    - ../design-system/src/fonts/charcoal.css
    - ../design-system/src/tokens.test.ts

key-decisions:
  - "THEME-API open decision 1 CLOSED as option-b by the user: charcoal ships Playfair Display's drawn italic axis. The executor measured and presented; it did not choose."
  - "The recorded face baseline moves 8 -> 12 and was restated at all four enumerated sites, including the EDITING THIS FILE grep count that the plan predicted would be missed."
  - "The contract's 'two italic roles' is an undercount. A third exists inside the design system itself — primitives.css:2544, the datepicker placeholder — verified with getComputedStyle under data-brand=charcoal."
  - "tests/visual/font-download.spec.ts still reads 3 files WITH the axis present, because its probe page renders no italic text. A green 3-file result is NOT evidence the axis is absent."

requirements-completed: [DS-05]

# Metrics
duration: 20 min
completed: 2026-08-19
---

# Phase 1 Plan 05: The Italic Axis Summary

**THEME-API open decision 1 is closed as `option-b` — by the user, not by the executor. Charcoal
ships Playfair Display's drawn italic, the recorded face baseline moves from 8 to 12, and all four
restatement sites were updated and then proven to bite with a negative control. The load-bearing
extra result is that the contract's "two italic roles" is an undercount: a third lives in the
design system's own `primitives.css`.**

## Performance

- **Duration:** ~20 min (2026-08-19T08:50+0530 → 09:10+0530), spanning the checkpoint
- **Tasks:** 2 of 2
- **Files:** 0 created, 2 modified
- **Suite:** **1539** tests, 115 files, all passing (unchanged count — assertions were restated, not added)
- **Negative controls executed:** 1

---

## Decisions

### THEME-API open decision 1 — the italic axis — is CLOSED

| | |
|---|---|
| **Decision** | **`option-b`** — add `@fontsource-variable/playfair-display/wght-italic.css` |
| **Decided by** | **The user**, after reviewing a rendered comparison |
| **Final face baseline** | **12** face rules (was 8) |
| **Final file/byte baseline** | **14 files / 295,920 B available**; **+1 file / +38,804 B on the wire** |
| **Status** | **CLOSED.** THEME-API open decision 1 is resolved and must not be re-litigated. |

**Every later plan and every Phase 5 comparison must quote 12, not 8.** The 8 is retired. It was
correct for the four-entry-point layer 01-04 shipped and is wrong for the five-entry-point layer
that exists now.

The executor presented both options with measured costs and stopped. It did not choose, and did not
default. That mattered here specifically because **Option A was already in the file, so silence
would have shipped it** — which is the exact silent inheritance Phase 0 created this checkpoint to
prevent.

**Decision evidence:** `.planning/phases/01-design-system-charcoal-theme/01-05-italic-comparison.png`

---

## The measurement the decision was made against

### Bundled as a consumer resolves it — Vite, not grep

The harness reproduced 01-04's Option A figures **exactly** (8 / 10 / 200,864 B) without those
numbers being transcribed into it, which is the cross-check that it measures the same quantity.

| Bundled `fonts/charcoal.css` | Before (roman only) | After (committed) | Δ |
|---|---:|---:|---:|
| `@font-face` rules | 8 | **12** | +4 |
| of which `font-style: italic` | 0 | **4** | +4 |
| Font files emitted | 10 | **14** | +4 |
| Font bytes available | 200,864 | **295,920** | +95,056 |
| Emitted CSS bytes | 2,598 | 3,985 | +1,387 |
| Distinct families | 3 | **3** | **0** |

The committed file was re-bundled after the commit and produces 12 / 14 / 295,920 — the figures
above are of the shipped artefact, not of a scratch copy.

### On the wire — what actually downloads

Measured in Chromium with the request listener subscribed **before** navigation, on a page
rendering both editorial-italic roles:

| | Roman only | With italic axis | Δ |
|---|---:|---:|---:|
| Playfair files fetched | 1 | **2** | **+1** |
| Bytes transferred | 38,404 | **77,208** | **+38,804** |

**D-30's `unicode-range` guarantee survives the change intact.** 4 italic faces are declared and
**1** is fetched. The cyrillic, vietnamese and latin-ext italics — 56,252 B — are declared and
never requested, exactly as their roman counterparts are. The cost is paid only on a page that
actually renders an italic serif.

### The render, proven rather than asserted

A `getComputedStyle` check cannot distinguish these two states — it reports `italic` for both. The
distinction was read through CDP `CSS.getPlatformFontsForNode` plus advance width, on the string
"see the photographs" at 22px:

| Case | Platform font | Width |
|---|---|---:|
| Roman axis + `font-style: italic` | `Playfair Display` **[WEBFONT]** | **200.16px** |
| Roman axis, `font-style: normal` (control) | `Playfair Display` [WEBFONT] | **200.16px** |
| Drawn italic axis | `Playfair Display` **[WEBFONT]** | **182.41px** |
| Georgia italic (fallback control) | `Georgia` **[SYSTEM]** | 197.55px |

**The synthesised italic and the roman are identical to the hundredth of a pixel.** That is the
positive proof of synthesis: a shear transform does not change advance widths. The Georgia control
was included because a silent fallback in the "before" column would have overstated the case for
changing anything — it is [SYSTEM] at a third width, so it is distinguishable and it is not what
was happening. The drawn italic diverges by 17.75px, **8.9%**, on 19 glyphs.

---

## The four restatement sites — all four updated

The plan predicted site 4 would be the one missed. It was not.

| # | Site | Before | After |
|---|---|---|---|
| 1 | `src/tokens.test.ts` `CHARCOAL_ENTRY_POINTS` | 4 keys | **5 keys** (+ `wght-italic.css`: 4) |
| 1b | that map's doc comment | "The four charcoal entry points" | "The **five**…" |
| 1c | test **name** + its comment | "exactly its **four** entry points" / "adding a fifth" | "…**five**…" / "adding a sixth" |
| 2 | test **name** + assertion | "exactly **8** @font-face rules" / `toBe(8)` | "exactly **12**…" / `toBe(12)` |
| 3 | `fonts/charcoal.css` header | "The four entry points below produce 8 face rules (4 + 2 + 1 + 1)" | "The **five** … produce **12** face rules (**4 + 4** + 2 + 1 + 1)" |
| 4 | `EDITING THIS FILE` grep count | "exactly **four** at-rule inclusions … do not add a **fifth** mention" | "exactly **five** … do not add a **sixth** mention" |

**Site 4 is the one that makes the file's own documented gate wrong if missed.** The header warns
that the acceptance checks "read prose the same as code"; had it still said *four* while the file
carried five, the next reader would have deleted a real import to satisfy a stale comment.

A related trap was avoided deliberately: **the rewritten header contains no `@import` string.** The
plan's own gate strips only lines *beginning* with `/` or `*`, and the header's continuation lines
begin with letters — so an `@import` written into the prose would have inflated the count to 6 and
failed a gate that was measuring nothing wrong. Asserted explicitly (0 occurrences in lines 1–52).

### The `KNOWN GAP` paragraph is now a closed decision

Both open-question phrases the plan named — *"a Phase 1 decision about what '8 rules' is
measuring"* and *"not a defect in this file"* — are gone. The replacement records the decision, the
measured basis for it, and the three roles that depend on it, so the next reader finds a settled
question rather than an invitation to re-open one.

---

## Negative control — executed, and it bites for the stated reason

Per this phase's standing lesson, a restated number is worthless if nothing fails when it is wrong.
The italic import was removed (simulating the axis never having been added) and the suite re-run:

```
× resolves the charcoal face layer to exactly its five entry points
  → expected { …(4) } to deeply equal { …(5) }
× resolves the charcoal face layer to exactly 12 @font-face rules
  → expected 8 to be 12 // Object.is equality

Tests  2 failed | 34 passed | 71 skipped (107)
```

**Exactly 2 failures, naming exactly the two restated quantities, and the second literally prints
the baseline movement (`expected 8 to be 12`).** Restored with the import re-inserted after the
roman anchor; `src/fonts/charcoal.css` SHA-256 was
`2ca17913f62de2477a3f02c8f58a7ef6e61a77d3ad1d351998ef7995aa259a09` before the break and after the
restore — **byte-identical**. Suite green again at 36 passed.

`src/themes/charcoal.css` was not touched by this plan and remains
`eb151bbc5b63b55dc6bacafd1204775a1129a121ef98d329f950a6f86e9211cb`, the same value 01-01 through
01-04 each recorded — now unchanged across five plans.

---

## The family-to-face agreement gate (01-04) is still green

Re-run by name, as the plan required. **24 cases passed**, including both blocks:

```
✓ charcoal light --font-serif names a family that fonts/charcoal.css actually declares
✓ charcoal dark  --font-serif names a family that fonts/charcoal.css actually declares
```

**T-05-03 (family-name spoofing) is clear and was verified rather than assumed.** Fontsource
registers the italic axis as the **same** `Playfair Display Variable` family with
`font-style: italic`, not as a separate family — confirmed by reading the installed
`wght-italic.css`, and confirmed independently by the bundle emitting the same **3** families
before and after. `--font-serif` is complete; the silent-Georgia failure mode is not reachable
through this change.

---

## `font-download.spec.ts` still reads 3 files — and that is correct

Recorded explicitly so it is not later misread as evidence:

```
charcoal-only probe fetched 3 font files
both-layers  probe fetched 3 font files
2 passed (4.4s)
```

**A green 3-file result is NOT evidence that the italic axis is absent.** The probe's document
renders `<h1>`, `<p>` and `<code>` — no italic text anywhere — so the four italic faces are
declared and correctly never fetched. Its assertions are pattern-based per family, not a hard count
of 3, so neither option moves them. This was measured under both options before the decision and
confirmed again after the commit.

Anyone wanting the probe to exercise the italic axis must **add an italic run to its document
first**; changing the expected count alone would assert a number nothing produces.

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **The contract's "two italic roles" is an undercount; there is a third, and it is in the design
   system itself.** `src/primitives.css:2544`,
   `.ds-atom-datepicker-trigger-label.is-placeholder`, is `font-style: italic` on
   `font-family: var(--serif, "Newsreader", Georgia, serif)`. Charcoal defines `--serif` in **both**
   blocks (`themes/charcoal.css:101` and `:281`), so under `data-brand="charcoal"` this computes to:

   ```
   font-family: "Playfair Display Variable", "Playfair Display", Georgia, serif
   font-style:  italic
   font-weight: 500
   ```

   **Verified in a browser with `getComputedStyle`, not by grep.** THEME-API and 01-05-PLAN both
   say "two italic roles"; the measured count is **at least three**, and the third is a
   design-system component rather than portfolio markup — which strengthens the project's core
   value that the site proves the design system works. Weight 500 falls inside the italic axis's
   `font-weight: 400 900` range, so it is served correctly.

   Also note `utilities.css:178` — `.jd-markdown em` sets `font-style: italic` with no family of
   its own, so it inherits whatever serif context it sits in and becomes a fourth italic surface
   wherever that context is charcoal serif.

2. **The baseline window for 01-20 is open now and closes when 01-20 runs.** There are **0
   charcoal-named snapshots** among the 488 baseline PNGs on disk — every existing baseline is
   default-brand (Newsreader), so this change **moved no existing baseline**, and none was
   re-recorded. **01-20 must record the charcoal baselines WITH the italic axis present.** Had this
   decision been deferred past 01-20, adding the axis afterwards would have required re-recording
   every charcoal story containing an italic serif. This was the strongest timing argument for
   deciding now and it is now spent — the window is only open until 01-20 captures.

3. **`00-THEME-API.md` still describes the italic axis as open** (its *Font delivery* section and
   its *Three decisions this document surfaces rather than resolves* list, item 1). The contract
   was not edited — Phase 1 plans do not write Phase 0 artefacts — but a reader going to the
   contract for the face baseline will find **8** and the word *Open*. Whichever plan reconciles
   the contract should restate both to 12 / closed, citing this SUMMARY.

4. **Carried forward, still unaddressed from 01-03 and 01-04:** `check-no-ivory.sh` line 142 uses a
   case-sensitive `grep -cE` against uppercase `#8D8779`/`#C4BDAD` while `charcoal.css` carries
   them lowercase. Whichever plan ports that script must add `-i`. This plan did not touch it.

5. **Carried forward from 01-04, unchanged:** `package.json` `exports` still has no `./fonts/*`
   entry, so the specifier this file's own header documents
   (`@akhil-saxena/design-system/fonts/charcoal.css`) does not resolve for a consumer today.
   **01-06 owns this.** The italic axis makes it marginally more urgent — there are now 12 faces
   behind an unreachable specifier rather than 8.

---

## Deviations from Plan

**None.** The plan was executed exactly as written: the decision was presented and not made by the
executor, the user's answer was implemented, all four enumerated restatement sites were updated,
the family-name check was performed and reported, and the agreement gate was re-run.

Two things were done **beyond** the plan's letter, neither changing its scope:

1. **A negative control was executed** (the plan specified none for this task). Given that four
   inert gates have been found in this phase, a restated acceptance number that had never been seen
   to fail would have been the fifth. It fails correctly.
2. **The header was checked for `@import` occurrences in prose**, because the plan's own gate does
   not strip comment continuation lines and would have been inflated by one.

The plan's frontmatter lists `package.json` and `package-lock.json` in `files_modified`. **Neither
was touched, correctly** — Option B adds a subpath of a package 01-04 already installed, so there
was no install and no dependency change. T-05-SC (supply-chain) is clear by construction.

---

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 — decide the italic axis | *(no commit — `checkpoint:decision`)* | User replied `option-b` |
| 2 — implement + restate the baseline | `1bcaec3` | `feat(fonts): add the Playfair italic axis` (+27/−16) |

Branch `charcoal-theme` in `../design-system`, now **11 commits ahead** of that repo's `main`.
Author `Akhil Saxena <saxena.akhil42@gmail.com>`. **No AI attribution** anywhere — verified
programmatically across the whole branch
(`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` → `0`).

Both files' SHA-256 were identical before and after the commit, so the `lint-staged` hook
reformatted nothing: **the bytes that were tested are the bytes that were committed.**

## All four sibling gates green

```
npm test        115 files / 1539 tests passed
npm run check   347 files, no fixes applied
npm run typecheck  both projects clean
npm run css:check  74 files, round-trip byte-exact
```

Plus, beyond the four: `tests/visual/font-download.spec.ts` — 2 passed.

Sibling tree state at exit: `git status --porcelain` shows only the permitted
`?? design_handoff/design_handoff_ds_overview/`. Port 6006 was used by Playwright's managed
`webServer` and released; the user's `:4321` was checked before and after and left running.

## Self-Check: PASSED

Files claimed modified, verified on disk:

```
FOUND: ../design-system/src/fonts/charcoal.css   2ca17913…259a09  (5 entry points, 12 faces)
FOUND: ../design-system/src/tokens.test.ts       25f87304…909c4f
FOUND: .planning/phases/01-design-system-charcoal-theme/01-05-italic-comparison.png  (165,136 B)
```

Commit claimed, verified present on `charcoal-theme`:

```
FOUND: 1bcaec3  feat(fonts): add the Playfair italic axis
```

Claims verified by measurement rather than assertion:

```
VERIFIED: 5 entry points (comments stripped, occurrence-counted)
VERIFIED: 12 face rules / 14 files / 295,920 B — bundled from the committed file
VERIFIED: 3 families, unchanged — no new family name (T-05-03)
VERIFIED: negative control fails with exactly 2 assertions, "expected 8 to be 12"
VERIFIED: restore byte-identical, SHA 2ca17913…259a09
VERIFIED: header carries 0 occurrences of "@import" in prose
VERIFIED: both open-question phrases absent from the header
VERIFIED: font-download.spec.ts 3 files, 2 passed, WITH the axis present
```
