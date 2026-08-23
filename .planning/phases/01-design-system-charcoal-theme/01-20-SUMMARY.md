---
phase: 01-design-system-charcoal-theme
plan: 20
subsystem: design-system
tags: [d-37, ds-06, ds-07, visual-baselines, brand-axis, playwright, storybook-globals, changelog, italic-axis, parallelism, gate-defect]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: the `brand` global in .storybook/preview.tsx, which the capture loop drives through the `globals` query parameter
  - phase: 01-design-system-charcoal-theme
    plan: 19.1
    provides: "the E29 conversion of 70 story files to story-level `globals: { theme: 'dark' }`, which is why 68 default baselines move here — and, unintentionally, why control-boundary.spec.ts is red"
  - phase: 01-design-system-charcoal-theme
    plan: 13-18
    provides: the six new story ids and the component work whose finished behaviour these baselines record
provides:
  - "$DS/tests/visual/storybook.spec.ts-snapshots — 1,019 baselines: 504 charcoal beside 504 default, plus 11 pending-rename orphans"
  - "$DS/tests/visual/storybook.spec.ts — brand x mode capture, one test per brand, forced serial"
  - "$DS/.storybook/test-runner.ts — DS_BRAND, threaded through a `prepare` override, with a per-story <html data-brand> assertion"
  - "$DS/src/visual-baseline-coherence.test.ts — brand-aware ids, D-37 parity gate, and a charcoal-differs-from-default gate"
  - "$DS/CHANGELOG.md — the 2.0.0-beta.1 entry, breaking changes first"
  - ".planning/phases/01-design-system-charcoal-theme/01-20-rename-baselines.mjs — the 164-entry rename proposal, unapplied"
affects: [01-21 publish, Phase 5 consumption]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drive a Storybook global from Playwright with `?globals=brand:charcoal` rather than by writing `documentElement.dataset.brand`. The decorator calls `removeAttribute` on every render whose global says otherwise, so a DOM write is undone by the next render — a change a grep confirms and a browser does not."
    - "Story-level `globals` compose with URL globals per KEY: a story pinning `theme: dark` keeps its mode and still takes the brand. Verified by reading resolved tokens (charcoal dark --cream #161616 vs the design system's #181818), not by trusting the URL."
    - "Suffix a second axis so it sorts ADJACENT to the first: `--charcoal` precedes `-chromium-darwin` because 0x2D < 0x63, so both brands of one story are neighbouring lines rather than two halves of a directory."
    - "`fullyParallel: true` plus a split test = two passes contending for one dev server. It destabilises the COMPARISON, not the capture — the flagged baseline was correct and re-recording it would have degraded the gate while making it green."
    - "A one-shot Playwright probe cannot borrow the suite's `waitForSelector(..., 'attached')`: the suite only survives it because toHaveScreenshot retries until two shots agree. Waiting on the actual element is what made the probe reproduce the committed bytes exactly."
    - "Prove a font axis was loaded at capture time by blocking exactly one file and re-capturing: allowed reproduced the committed baseline byte-for-byte, blocked did not."

key-files:
  created:
    - .planning/phases/01-design-system-charcoal-theme/01-20-rename-baselines.mjs
  modified:
    - ../design-system/tests/visual/storybook.spec.ts
    - ../design-system/tests/visual/storybook.spec.ts-snapshots
    - ../design-system/.storybook/test-runner.ts
    - ../design-system/src/visual-baseline-coherence.test.ts
    - ../design-system/CHANGELOG.md

requirements-completed: [DS-06, DS-07]

key-decisions:
  - "T-20-01 was discharged as 'every moved baseline is attributable', not as the plan's literal 'zero updates before capture' — which 01-19.1 had already made impossible. Ran the suite unmodified first, classified all 68 movements (every one dark-named, zero light-mode), and only then captured"
  - "The moved-baseline count is 68, measured. The 72 in circulation was an estimate: 72 is the number of dark story ids, 68 is the number whose pixels changed, and the 4-story difference is exactly 01-19.1's S3 shape"
  - "Charcoal snapshots are suffixed `--charcoal` rather than prefixed or put in a subdirectory, so the two brands of one story sort adjacent (0x2D precedes the `c` of `-chromium-darwin`)"
  - "Mode is not a third capture loop. It is already an axis of the story set — one --dark-mode story per component, each pinning `globals: { theme: 'dark' }` since 01-19.1 — so brand x every story IS brand x mode. A mode loop would have duplicated 504 light stories under a global their own story-level global overrides"
  - "The brand reaches the a11y runner through a `prepare` override that boots iframe.html WITH a story id, because Storybook discards the `globals` query parameter on an id-less boot. A DOM write was rejected on mechanism: the decorator's removeAttribute undoes it on the next render"
  - "postVisit asserts <html data-brand> per story. This caught my own broken threading on all 508 stories; without it DS_BRAND=charcoal would have reported 508 PASSED while sweeping the default brand"
  - "The capture spec is forced serial. The plan's split caused a false 96px failure through contention on one Storybook; the recorded bytes were correct and re-recording would have degraded the gate while turning it green"
  - "control-boundary.spec.ts was NOT repaired. Proven not caused by this plan (its entire input set is unchanged since 87dee17), owned by 01-10, broken by 01-19.1, and every tempting repair weakens the gate. Reported as 6 green / 1 red rather than as the criterion met"
  - "The 164 renames and the 11 dead orphans in the gating store were both left alone. The commit is purely additive — zero deletions, verified per commit"
  - "The changelog heading is `## 2.0.0-beta.1`, checked against both this plan's `^## 2\\.0\\.0\\b` gate and src/version.test.ts's `^## <version>\\b` which runs inside prepublishOnly"

# Metrics
duration: ~3h
completed: 2026-08-23
tasks-completed: 2 of 3
checkpoint-open: "Task 3 — blocking human-verify, not attempted"
---

# Phase 01 Plan 20: Charcoal snapshot parity, the seven-gate sweep, and the v2.0.0-beta.1 changelog Summary

**1,019 baselines now record every story under both brands in both modes, the changelog says what breaks and what a consumer does about it — and the two gates that only ever run here both found something: `test:visual` is red on a pre-existing cross-plan defect that no earlier plan could have seen, and the brand-threaded a11y sweep produced the first charcoal accessibility numbers that have ever existed, 25 violations across eight components.**

> ## Task 3 is OPEN and awaiting the developer
>
> Task 3 is a `checkpoint:human-verify` with `gate="blocking"`: the developer looks at
> charcoal across the library and approves the release. **It has not been attempted,
> simulated, or recorded.** No approval exists. Nothing has been published, `latest` has not
> moved, `package.json` is still `1.11.4`, the branch is not merged and no tag was created.
>
> The rename mapping is likewise **unapplied** — it is one of the things Task 3 decides.

---

## 1. Baselines: 488 → 1,019

| | before | after |
|---|---|---|
| tracked files in `tests/visual/storybook.spec.ts-snapshots/` | **488** | **1,019** |
| default-brand baselines backing a live story | 477 | **504** |
| charcoal baselines | 0 | **504** |
| pending-rename orphans left in place | 11 | **11** |
| capturable stories (508 stories − 4 `TIME_DEPENDENT`) | 504 | 504 |

`488 = 477 backed + 11 orphaned`, and `1,019 = 504 + 504 + 11`. Re-derive any of it with:

```bash
ls tests/visual/storybook.spec.ts-snapshots | wc -l                                    # 1019
ls tests/visual/storybook.spec.ts-snapshots | grep -c -- '--charcoal-chromium-darwin'   # 504
```

### The 27 baselines that were owed, named

These were stories added by plans 01-13 → 01-19 that had never been captured. All 27 are
new files, examined individually (8.6 KB – 38.5 KB, no blanks, sensible dimensions) before
they were allowed into a commit:

| # | story id | # | story id |
|---|---|---|---|
| 1 | `data-display-datagrid--compact-unselectable` | 15 | `interaction-richtext--segment-output` |
| 2 | `data-display-filternav--beside-segmented-control` | 16 | `interaction-richtext--serialize-loss-reported` |
| 3 | `data-display-filternav--default` | 17 | `interaction-sortable--announced-reorder` |
| 4 | `data-display-filternav--rejected-hrefs` | 18 | `layout-appbar--anchor-navigation` |
| 5 | `data-display-filternav--sizes` | 19 | `layout-appshell--with-banner` |
| 6 | `inputs-focalpointpicker--aspect-ratios` | 20 | `layout-appshell--with-banner-and-footer` |
| 7 | `inputs-focalpointpicker--default` | 21 | `layout-footer--compact-with-links` |
| 8 | `inputs-focalpointpicker--frame-widths` | 22 | `overlays-confirmdialog--inline-panel` |
| 9 | `inputs-focalpointpicker--ratio-from-css` | 23 | `overlays-lightbox--responsive-gallery` |
| 10 | `inputs-statuspill--status-ladder` | 24 | `overlays-modal--not-closable` |
| 11 | `interaction-richtext--bold-only` | 25 | `patterns-formvalidation--anchored-error-summary` |
| 12 | `interaction-richtext--bold-only-no-toolbar` | 26 | `patterns-formvalidation--field-error-severity` |
| 13 | `interaction-richtext--code-block-opt-in` | 27 | `patterns-formvalidation--field-required-marker` |
| 14 | `interaction-richtext--no-toolbar` | | |

### 68 baselines moved, not 72 — and every one is attributable

**The figure is 68. The 72 that has been circulating was an estimate carried in prose, not a
measurement.** Both numbers are real and they measure different things:

- **72** = the number of story ids containing `dark`.
- **68** = the number whose recorded pixels actually changed.
- **4** = the difference, and they are exactly 01-19.1's **S3** shape — stories that were
  *already* receiving `<html>.dark` because `preview.tsx` treats
  `globals.backgrounds.value === "#1c1917"` as dark, so they worked by hex coincidence and
  their rendering did not move. Measured, they are `foundation-tokencheck--dark`,
  `layout-appbar--dark-mode`, `layout-appshell--dark` and `layout-footer--dark-mode`.

**Every one of the 68 is a `--dark-mode` story. Zero light-mode baselines moved.** That is
the signature of 01-19.1's E29 conversion (`380d979`): a story that used to render a dark
island on a light page now correctly darkens the whole page. There is no unexplained pixel
movement anywhere in the set.

Re-derive:

```bash
git checkout 87dee17 -- /dev/null 2>/dev/null   # not needed; run against the parent commit
npx playwright test tests/visual/storybook.spec.ts --grep "default brand"
```

**T-20-01 was discharged in the honest form, not the plan's form.** The plan asked for the
default brand to be "green with **zero** updates before capture, else stop". That was
impossible by construction — 01-19.1 had already guaranteed 68 baselines would move — so
demanding it literally would have meant stopping on a repair. The substance of the threat is
*"no baseline moves for a reason nobody can name"*, and that is what was checked:

1. Ran the suite **unmodified** first. Result: 95 flagged = 27 missing + 68 mismatched.
2. Classified all 68. Every one dark-named, zero light-mode. Cross-checked against
   01-19.1's own S3 note, which independently predicts 72 − 4 = 68.
3. Only then captured.

A further check that the plan did not ask for: the pre-change and post-change runs flag
**byte-identically the same 68 ids**, proving the brand query parameter I added is inert for
the default brand rather than merely appearing to be.

---

## 2. The italic axis WAS loaded when the 504 charcoal images were captured

Confirmed at the byte level, not inferred. `fonts/charcoal.css` names the DatePicker
placeholder as one of three italic-serif roles, and
`.ds-atom-datepicker-trigger-label.is-placeholder` sets `font-style: italic` with
`var(--serif, …)` — which charcoal declares (`--serif: var(--font-serif)` →
`"Playfair Display Variable"`). So `inputs-datepicker--popover-variant--charcoal` renders
"Pick a date" in italic Playfair, and it is a committed baseline.

Re-captured that story twice against the live preview:

| configuration | sha256 (first 12) | italic face | `fonts.check("italic 12px …")` | text width |
|---|---|---|---|---|
| italic allowed (shipping) | **`d02c934c3f8e`** | `loaded: 1` | `true` | 57.63 px |
| italic woff2 blocked (control) | `e9e4d682d84b` | `error: 1` | `false` | 58.94 px |
| **the committed baseline** | **`d02c934c3f8e`** | — | — | — |

**The allowed capture is byte-identical to the committed baseline; the blocked one is not.**
The synthesised oblique is 1.31 px wider, because shearing the roman outlines does not
change advance widths the way a drawn italic does. Three corroborations: the network fetches
`playfair-display-latin-wght-italic.woff2`; a face with `style: "italic"` reaches
`status: "loaded"`; and the rendered specimen matches `01-05-italic-comparison.png`'s
**Option B** — the cursive `w`, the single-storey italic `a` — against Option A's sheared
roman.

One methodological note worth keeping, because it invalidated three earlier probe runs:
`waitForSelector("#storybook-root", { state: "attached" })` returns **immediately**, before
the story mounts. The capture suite survives that only because `toHaveScreenshot` retries
until two consecutive shots agree. A one-shot probe must wait on the real element — and once
it did, it reproduced the suite's bytes exactly, which is what makes the comparison above
trustworthy.

---

## 3. The seven gates, on one commit

Commit **`827f860`**, branch `charcoal-theme`, working tree clean (only the permitted
untracked `design_handoff/design_handoff_ds_overview/`). Each gate run separately, exit code
captured directly rather than piped into anything:

| gate | exit | what it reported |
|---|---|---|
| `npm run build` | **0** | full `tsup` build; `dist/` regenerated first, so `packaging.test.ts` runs rather than `skipIf`-skipping |
| `npm test` | **0** | **1,946 passed / 123 files** |
| `npm run check` | **0** | Biome, 376 files |
| `npm run typecheck` | **0** | **both** tsconfigs — `tsc --noEmit && tsc -p tsconfig.test.json --noEmit` |
| `npm run css:check` | **0** | **79 files, round-trip byte-exact** |
| `npm run test:visual` | **1** | 19 spec files / 128 tests — see §3.2 |
| `npm run test:a11y` | **0** | **508 passed / 84 suites** — default brand ONLY, see §3.3 |

Informational, not one of the seven:

| | exit | |
|---|---|---|
| `DS_BRAND=charcoal npm run test:a11y` | **1** | **483 passed, 25 failed / 8 suites** — §3.3 |

**`npm test` is 1,946, not the 1,944 this plan inherited.** The +2 are the two gates added to
`src/visual-baseline-coherence.test.ts` (D-37 parity, charcoal-differs-from-default).

**Six of seven are green. `test:visual` is red and I did not make it green.** The plan's
criterion "all seven gates pass on one commit" is therefore **NOT met**, and it is reported
that way rather than presented as met.

### 3.1 The baseline store itself is clean

Run single-worker — which is how CI runs it, since `playwright.config.ts` sets
`workers: process.env.CI ? 1 : undefined` — the capture spec passes **both** brands with
**zero** attachments:

```
visual baselines [default]:  captured 504, skipped 4 time-dependent
visual baselines [charcoal]: captured 504, skipped 4 time-dependent
```

So the 1,019 recorded images agree with what the library renders today. That is the artifact
this plan owns, and it is verified.

### 3.2 `test:visual` — one deterministic failure, and a suite that is not deterministic

The same commit was run three times. Only one failure is reproducible:

| run | workers | failures |
|---|---|---|
| A | default (parallel) | `control-boundary:117`, `storybook.spec` charcoal (`data-display-tabs--narrow-overflow`) |
| B | default (parallel) | `control-boundary:117`, `richtext-marks:287`, `storybook.spec` default (`patterns-coachmark--default`) |
| C | **1** (as CI) | `control-boundary:117`, `sortable-announce:179` |

**`control-boundary.spec.ts:117` is the only failure present in all three.** Everything else
moves between runs, so the honest statement is two separate things: one real defect, plus a
suite with timing-sensitive specs.

**The real defect — `every control's boundary clears 3:1 in charcoal light`:**

```
ds-atom-input        1.02:1  border rgba(255,255,255,0.12)  e.g. inputs-autocomplete--dark-mode
ds-atom-oauthbtn     1.01:1  border rgba(255,255,255,0.2)   e.g. inputs-oauthbutton--dark
ds-atom-textarea     1.9:1   border rgb(240,164,160)        e.g. inputs-textarea--dark-mode
ds-atom-segmented-btn 1.64:1 border rgb(201,197,188)        e.g. data-display-segmentedcontrol--dark-mode
ds-atom-tabs-trigger 1.28:1  border rgb(225,222,215)        e.g. data-display-tabs--dark-mode
ds-atom-footer-link  1.96:1  border rgb(177,174,168)        e.g. layout-footer--dark-mode
```

**Every cited example is a `--dark-mode` story, in a test whose name says "charcoal light".**
The spec asks for light via `iframe.html?…&globals=theme:light;brand:charcoal` (line 135),
but since `380d979` those stories pin `globals: { theme: "dark" }` at **story** level, which
overrides a URL global. So it reads dark-mode border tokens (`rgba(255,255,255,0.12)`)
composited over a charcoal-**light** page (`rgb(251,249,244)`) — a cell that does not exist.
The spec does have a guard for this (lines 238–242), but it was written against the **old**
mechanism, a `.dark` wrapper element, which 01-19.1 deleted; it no longer matches, and the
forced `classList.remove("dark")` at lines 160–177 does not reach whatever still declares the
dark value.

**It is a cross-plan defect between 01-10 and 01-19.1, and this plan did not cause it.**
Proven by input set rather than by argument — `control-boundary.spec.ts` reads `src/**` CSS
and components, the stories, and `.storybook/preview.tsx`, and:

```bash
git diff --name-only 87dee17..HEAD | grep -v '\.png$'
#   .storybook/test-runner.ts
#   CHANGELOG.md
#   src/visual-baseline-coherence.test.ts
#   tests/visual/storybook.spec.ts
```

contains **none** of them, so the spec's entire input set is unchanged since `87dee17` and its
verdict cannot have changed. On the branch, `5d382e0` (the spec's last edit) is at position 22
and `380d979` (the conversion) at 51; this plan's commits are 65–69.

**Not fixed, deliberately.** Working out why a dark token survives the forced light is a real
cascade investigation across six components owned by other plans, and the repairs most likely
to occur to a hurried reader — loosen the threshold, widen the skip list — make the gate pass
by making it mean less. Routed in §7.

**The non-deterministic remainder**, each of which passed in at least one of the three runs:

- `richtext-marks:287` — a selection race. It expected `**Reduced**` and got
  `**Red**uced …`, i.e. the bold applied to a partial selection. 01-15 already had to change
  this area once (`2bfc5da`, "retry the select-all instead of polling it").
- `sortable-announce:179` — `"the live region never changed … the keystroke produced no
  announcement"` after a 5 s poll. A keyboard-interaction timing flake.
- Two capture stories, in the parallel runs only: `data-display-tabs--narrow-overflow`
  (charcoal) and `patterns-coachmark--default`. Both are measurement- or position-dependent
  layouts. Neither recurs single-worker — see §5, where the first of them nearly caused a
  wrong fix.

These are a **finding about suite reliability** (F-20-4), not about this plan's artifact, and
they are why §3.1's single-worker result is the trustworthy read of the baseline store.

### 3.3 `test:a11y` is green, and that is NOT charcoal coverage

`npm run test:a11y` exits **0** at 508/508 — **on the default brand only.** `preview.tsx`
sets `initialGlobals.brand = "default"` deliberately and no story overrides it, so an
unqualified run sweeps the JobDash cream/ink/amber palette exclusively. **A green
`test:a11y` says nothing whatsoever about the brand this release is named for**, and it should
not be quoted as though it did.

With the brand axis this plan added:

| command | exit | result | brand-axis assertion firings |
|---|---|---|---|
| `npm run test:a11y` | **0** | 508 passed / 84 suites | 0 |
| `DS_BRAND=charcoal npm run test:a11y` | **1** | **483 passed, 25 failed / 8 suites failed** | 0 |

All 25 are `color-contrast`. **This is the first charcoal accessibility measurement that has
ever existed in this repository.** The brief named two components; the sweep found eight:

| component | failing stories | example violating element |
|---|---|---|
| `Interaction/SplitButton` | 7 | — |
| `Layout/AppBar` | 6 | — |
| `Inputs/DatePicker` | 5 | `ds-atom-datepicker-cell-num` (16 nodes) |
| `Feedback/AlertBanner` | 3 | `ds-atom-banner-title`, `ds-atom-banner-desc` |
| `Surfaces/Card` | 1 | — |
| `Interaction/RichText` | 1 | — |
| `Inputs/StatusPill` | 1 | `ds-atom-statuspill` |
| `Inputs/DateRangePicker` | 1 | — |

None is fixed here. They belong to the plans that own those components, they are recorded in
§7 and in `CHANGELOG.md`'s *Known issues in this beta*, and they are **not** beta blockers.
The two the brief predicted (`DatePicker`, `SplitButton` at 4.402:1) are both in the list,
alongside six it did not.

## 4. The brand threading was broken, and my own assertion caught it

This is the most valuable thing in the plan, so it gets its own section.

The plan's verify block for the a11y half is `grep -qi 'brand' .storybook/test-runner.ts`.
That is a gate satisfiable by a **comment** — the failure shape this phase has now hit
fourteen times. So the threading was written as real code plus a per-story assertion in
`postVisit`: `<html data-brand>` must equal the requested brand, or throw.

**It threw — on all 508 stories.** `prepare()` navigated to
`iframe.html?globals=brand:charcoal` with no story id, and Storybook only honours the
`globals` query parameter on a boot that carries an `id`. Measured three ways against the
live preview, reading resolved tokens rather than the URL:

| URL shape | `data-brand` | `--cream` |
|---|---|---|
| `?id=X&viewMode=story&globals=brand:charcoal` | `charcoal` | `#f4f1ea` |
| `?globals=brand:charcoal` (no `id`) | `default` | `#fcfcfc` |
| `?id=X&globals=…` then `setCurrentStory` to Y | `charcoal` | `#f4f1ea` |

The third row is why one navigation can brand an entire sweep: globals that have landed on an
id-carrying boot survive the channel switches the runner uses to move between stories. The
fix seeds the first story id from `index.json`, so there is no hardcoded id to go stale.

**Without that assertion, `DS_BRAND=charcoal npm run test:a11y` would have reported
508 PASSED while sweeping the default brand.** That is T-20-02 precisely: a gate green
because it was measuring the wrong thing. A `grep` for the word `brand` would have been
satisfied throughout.

A DOM write was considered and rejected on mechanism, not taste: `preview.tsx`'s decorator
calls `removeAttribute("data-brand")` on every render whose global is not charcoal, so
setting the attribute from `preVisit` is undone by the next render — a change a grep confirms
and a browser does not.

---

## 5. The capture was red once, and re-recording would have been the wrong fix

The first full `test:visual` run flagged
`data-display-tabs--narrow-overflow--charcoal` at **96 pixels (ratio 0.01)**, while its own
call log said *"captured a stable screenshot"*.

The obvious reading is "the baseline is bad, re-record it". It was wrong. Re-running the same
spec **serially** — no `--update-snapshots`, not a byte touched — flags **nothing**: 504 +
504, exit 0. The recorded image was correct all along.

The cause is `playwright.config.ts`'s `fullyParallel: true`. Splitting one test into two put
both brand passes on the wire at once against **one** Storybook dev server, and a story whose
layout depends on measurement (tab overflow: two triggers plus a 32 px More button) is where
that contention surfaces first. It destabilised the **comparison**, not the capture.

This is 01-SIBLING-PROTOCOL §3(b)'s mechanism — *"two concurrent runs attach to ONE
server… this repository has already recorded baselines with a bug present once"* — reached
from a direction the protocol did not anticipate: not two executors, but one spec's own two
tests. Fixed with `test.describe.configure({ mode: "serial" })`. Wall clock 1.9 min → 3.4
min; each test still ~1.6 min against the 300 s per-test budget, so the split's purpose (a
failure that names the brand) is intact.

Had I re-recorded instead, the gate would have gone green while becoming less trustworthy —
a correct image overwritten by whatever the next contended run produced.

---

## 6. The rename mapping — prepared, printed, and UNAPPLIED

**164 category renames + 6 unresolved = 170 directories**, in
`$DS/tests/visual-baselines/`, per `RENAME-PENDING.json`.

| transition | directories |
|---|---|
| `atoms` → `inputs` | 74 |
| `surfaces` → `overlays` | 42 |
| `compound` → `inputs` | 21 |
| `pickers` → `inputs` | 10 |
| `compound` → `interaction` | 9 |
| `atoms` → `display` | 8 |
| **total** | **164** |

The 6 unresolved have no target and are left alone by every mode:
`atoms-avatar--custom-gradient`, `atoms-avatar--deterministic`,
`atoms-avatar--with-presence`, `atoms-rollingnumber--basic`,
`atoms-rollingnumber--multi-digit`, `pickers-daterangepicker--mobile-stepper`.

**Nothing was moved.** `git -C $DS status --porcelain tests/visual-baselines` reports 0
changes. The proposal is a reversible script:

```bash
cd .planning/phases/01-design-system-charcoal-theme
node 01-20-rename-baselines.mjs            # dry run: prints the mapping and all 164 `git mv` lines
node 01-20-rename-baselines.mjs --apply    # perform them
node 01-20-rename-baselines.mjs --revert   # exact inverse
```

Dry run verified: **164 movable, 0 source-missing, 0 blocked**, and it emits exactly 164
`git mv` commands runnable as-is.

**What the developer should know before deciding.** `tests/visual-baselines/` is written by
`npm run test:visual:capture` (D-31) and **is not a CI job — nothing compares against it**.
The regression gate is the *other* store, Playwright's
`storybook.spec.ts-snapshots/`, which this script does not touch. So the value of applying it
is **provenance** — keeping a component's recorded history attached to its current id — not
gate correctness. Declining costs nothing that re-running the capture would not regenerate.

Separately, the **gating** store still holds **11** orphans of the same kind
(`overlays-card--*` ×7, `overlays-stickynote--*` ×4). Those are dead duplicates whose
successors (`surfaces-card--*`, `surfaces-stickynote--*`) already have current baselines, so
deleting them loses nothing — but that is also the developer's call, and this plan's commit
was kept purely additive: **zero deletions**, verified per commit.

---

## 7. Findings raised (not fixed)

Per 01-SIBLING-PROTOCOL §10 these are recorded here and **not** added to `00-FINDINGS.md`.

**F-20-1 — Charcoal's amber→ochre bridge is bypassed by hardcoded hex in shipped CSS.**
Charcoal maps all seven `--amber*` tokens to ochre, but ten declarations hardcode the amber
family and so ignore it. A pixel sweep of all 504 charcoal captures for the seven default
amber values found the visible ones:

| location | selector | visible in a capture? |
|---|---|---|
| `primitives.css:1951,1958` | `.dark .ds-atom-banner[data-variant="warning"]` (+ its icon) | **yes** — `feedback-alertbanner--dark-mode` shows a yellow `#fbbf24` border and icon on charcoal dark |
| `primitives.css:2244,2250` | `.dark .ds-atom-toast[data-tone="warning"]` (+ its icon) | **yes** — `feedback-toast--dark-mode` |
| `primitives.css:2694` | `.dark .ds-atom-datepicker-cell…:hover::before` | no — hover only |
| `primitives.css:5078,5115` | `.hljs-literal` in RichText code blocks | arguably intentional (syntax palette) |
| `primitives.css:1063` | `.ds-atom-stickynote` gradient | intentional, documented invariant |
| `utilities.css:186,199` | `.jd-markdown` blockquote / link | JobDash-scoped utility |

Route to the plans owning AlertBanner and Toast. **These two are recorded INTO the charcoal
baselines**, so they will compare clean until fixed — and when they are fixed, exactly
`feedback-alertbanner--dark-mode--charcoal` and `feedback-toast--dark-mode--charcoal` are
*expected* to move. Stated here so that movement reads as the repair it is.

Ruled out as content rather than theming, by checking source: ColorPicker/ColorInput
(`index.tsx:17,33,36,37` — the component's own swatch palette), Carousel
(`Carousel.stories.tsx` — story artwork), StickyNote (a yellow sticky note, documented
"does NOT flip in .dark").

**F-20-2 — 25 charcoal `color-contrast` violations across 8 components.** §3.3. First
charcoal a11y numbers to exist. Route to the owning plans.

**F-20-3 — `control-boundary.spec.ts` cannot express "charcoal light" for a mode-pinned
story.** §3.2. A cross-plan defect between 01-10 and 01-19.1. Route to 01-10; the repair is
probably to skip stories whose *effective* mode is not the requested one, the same shape as
01-19.1's own fix to `brand-isolation.spec.ts`.

**F-20-4 — `test:visual` is a 19-spec suite, and 3 of its specs had never run together with
the rest.** The plan treated `npm run test:visual` as "the snapshot gate". It runs 128 tests
across 19 spec files. This is the first plan to run all of them, which is how F-20-3
surfaced.

---

## 8. What the coherence test can and cannot detect

`src/visual-baseline-coherence.test.ts` is now brand-aware and has two new gates. Because a
reader will otherwise assume "green" means "the baseline store is correct", its blind spots
are written into the file's own header and repeated here.

**It CAN detect:**
1. A legacy baseline directory that is neither a live story nor accounted for in
   `RENAME-PENDING.json`.
2. A rotted manifest — a key that came back to life, or a target that vanished.
3. A snapshot whose id matches no live story **and** has no same-component/story id under
   another category (a typo, or a genuinely deleted component).
4. **(new)** A live story missing its charcoal baseline — D-37 parity, so the parity claim
   cannot decay into a sentence in a SUMMARY.
5. **(new)** A charcoal baseline byte-identical to its default counterpart — i.e. the brand
   axis silently not reaching the capture.

**It CANNOT detect:**
1. A baseline for a **deliberately deleted** story whose component name still exists under
   another category. The rename tolerance excuses that **by design** — which is exactly why
   the 11 `overlays-card--*` / `overlays-stickynote--*` orphans sit in the gating store
   unflagged.
2. Anything about image **content**. Every check is over filenames and hashes. A baseline
   recorded with a visual defect present compares clean forever — F-20-1 is a live instance.
3. A capture taken under the wrong *mode* (as opposed to brand). There is no equivalent of
   the `data-brand` assertion for `.dark`.

### The control that proved nothing, and the correction

My first negative control planted `overlays-card--default--charcoal` — a charcoal baseline
for a renamed-away story — expecting it to be caught. **It stayed green both before and after
the change**, because the rename tolerance is *supposed* to excuse it. A control that plants
something the test deliberately tolerates proves nothing about the test, and the docstring I
had already written claiming otherwise was wrong and has been rewritten.

What the brand strip actually changes, measured rather than argued: **no verdict at all.**
`splitId` keeps only the first two `--` segments, so it discarded the suffix anyway and
`renameCandidates` is unaffected. The strip alters the `ids.has()` lookup, and there the
difference is total — of 504 charcoal names, the unstripped form recognised **0** as live
story ids and excused all **504** through the rename tolerance; the stripped form recognises
all **504** as live and excuses none. So the charcoal half of the store was green by way of a
tolerance built for a different purpose: a test passing for the wrong reason.

The two **new** gates do bite, proven in both directions and restored from `cp` backups with
`git` confirming the snapshot directory clean:

| control | result |
|---|---|
| remove one charcoal baseline | RED, naming `inputs-button--default` |
| overwrite one charcoal baseline with its default render | RED, naming `inputs-button--default` |
| make an allowlisted brand-invariant story differ | RED, naming the stale exemption |
| typo a component name in a charcoal filename | RED (also caught before the change) |

Three stories are legitimately brand-invariant and are **enumerated, not absorbed into a
threshold**, so a fourth is a failure: `data-display-timeline--empty` (renders no themed
surface), `display-sparkline--custom-colors` (the story's subject is overriding the palette),
`foundation-dotgrid--high-opacity-amber` (hardcoded canvas, left deliberately by 01-19.1).
501 of 504 charcoal/default pairs differ.

---

## 9. Task 2 — the changelog

`CHANGELOG.md` now opens with **`## 2.0.0-beta.1 — The charcoal brand, and a font layer you
now import yourself`**, matching the repo's existing `## X.Y.Z — Summary` form.

**The heading is `2.0.0-beta.1`, not `2.0.0`**, per the developer's `<version-override>` in
01-21: this ships under the `next` dist-tag. Both regexes were checked to match it:
this plan's gate `^## 2\.0\.0\b` (the `\b` sits between `0` and `-`), and
`src/version.test.ts`'s `^## <package.json version>\b`, which runs inside `prepublishOnly`
and would abort 01-21's publish on a `## v2.0.0` or `## [2.0.0] - date` form.

Breaking changes first, three of them, each with the migration a consumer performs — gathered
from the `BREAKING CHANGE:` footers on `58f9e8c`, `9eab3bd` and `4230b9a` and the 01-13 →
01-17 summaries, rather than re-derived from diffs.

`9eab3bd` carries **two** footers, not one: the inline `--ds-sidebar-w` and the 767px rule.
Both are documented, the latter with the two-declaration media query that restores the old
posture.

**Two things were corrected against source rather than carried from the plan's prose:**

- The plan lists a prop `RichText.marks`. **It does not exist**; the prop is
  `RichText.allow`. Every prop named in the entry was grepped against `src/` first.
- The plan says the overlay fix means four overlays "can now server-render". They can, but
  only via the opt-in `inline` prop — the default is still **0 B**, which is correct for a
  modal over a live app. The entry states the opt-in and the measured figures (Modal 1,065 B,
  ConfirmDialog 1,902 B, TypeToConfirm 1,707 B, Sheet 1,075 B; Tabs 1,202 → 1,255 B). My own
  first draft had "Modal, Drawer, ConfirmDialog and Lightbox", which is wrong on two of four.

The subpath-import contract gets its own section with 01-08's measured before/after
(570,555 B raw / 176,922 B gzip / 99 modules → 1,620 B / 785 B / 2 modules) and states
plainly that the barrel is unchanged and still correct for server-rendered and admin code.

A **Known issues in this beta** section records F-20-1, F-20-2 and the fact that an
unqualified `test:a11y` does not sweep charcoal. A beta that hides its own known failures is
not worth publishing.

`package.json` is untouched at **1.11.4** — asserted, since the bump belongs to 01-21 so that
bump and publish stay one reviewed step.

---

## 10. Deviations from plan

**1. [Rule 1 — gate defect] `src/visual-baseline-coherence.test.ts` was made brand-aware
and gained two gates.** Not in `files_modified`. The file parses baseline filenames and knew
nothing about a second axis; leaving it would have meant 504 new files passing through a
tolerance built for renames. The two added gates (D-37 parity, charcoal-differs-from-default)
close the one hole no other check covered: a silently-broken `globals` parameter writing
default renders under charcoal names. Commit `d4c0663`.

**2. [Rule 1 — bug] `test.describe.configure({ mode: "serial" })` on the capture spec.**
Not in the plan, which asked only for the split. The split *caused* a false failure; serial
is the completion of the plan's own instruction, not a departure from it. Commit `7b0232c`.

**3. [Rule 1 — bug] `prepare()` in `test-runner.ts` had to boot with a story id.** The first
version of my own brand threading did not work. Commit `827f860`.

**4. [Rule 3 — enabling] The rename proposal lives in the portfolio phase directory**, not in
`$DS`, so that `$DS`'s commits stay about baselines and the sibling repo gains no untracked
or half-applied tooling.

**5. Not done, deliberately: `control-boundary.spec.ts` was not repaired.** §3.2. Owned by
other plans, proven not caused by this one, and the tempting repairs all weaken the gate.
This is why the seven-gate criterion is reported as **6 green / 1 red** rather than as met.

**6. Not done, deliberately: `TIME_DEPENDENT` was not widened.** It is byte-identical to its
pre-plan contents, asserted mechanically. The one flaky-looking story was a parallelism
artefact, not nondeterminism (§5), so adding it would have hidden a real bug.

---

## 11. Commits

| # | hash | message |
|---|---|---|
| 1 | `a9ec1ef` | `test(visual): record charcoal snapshot baselines (D-37)` — 601 files |
| 2 | `d4c0663` | `test(baselines): make the coherence check brand-aware and pin D-37 parity` |
| 3 | `086bd7b` | `docs(changelog): add the v2.0.0-beta.1 entry` |
| 4 | `7b0232c` | `test(visual): run the two brand captures serially, not in parallel` |
| 5 | `827f860` | `fix(test-runner): boot the preview with a story id so the brand global lands` |

`charcoal-theme` is **69** commits ahead of `main`, tracked-clean, `git stash list` empty,
**zero deletions** in any commit (verified per commit with
`git diff --diff-filter=D --name-only HEAD~1 HEAD`).

---

## 12. What the developer needs in hand for Task 3

- **Storybook is already running on `:6006`** (the long-lived instance, reused throughout
  rather than starting a second — `test:a11y` and Playwright both want that port).
- **`npx playwright show-report`** in `$DS` for the visual report.
- **Charcoal renders to look at first**, since they are where the interesting things are:
  `feedback-alertbanner--dark-mode--charcoal` (the yellow warning, F-20-1),
  `inputs-datepicker--popover-variant--charcoal` (the italic serif placeholder **and** the
  `--wire` control edge), `data-display-filternav--default--charcoal` (ochre, not amber).
- **The two brands of one story sit on adjacent lines** in the snapshot directory:
  `X--charcoal-chromium-darwin.png` sorts immediately before `X-chromium-darwin.png`,
  because `-` (0x2D) precedes the `c` of `-chromium`.
- **Step 5 of the review — "set Brand back to `default`, it must look exactly as it did"** —
  has a mechanical answer already: of the 1,019 baselines, the only default-brand images that
  moved are the 68 dark-mode ones, all attributable to 01-19.1, and **zero** light-mode
  default baselines moved.
- **The changelog question ("if I were Cairn, would I know what to do?")** is answerable from
  `CHANGELOG.md`'s first section; the migration is the one `import` line under BREAKING #1.
- **Two open decisions that are yours, not mine:** whether to apply the 164 renames (§6), and
  whether to delete the 11 dead orphans in the gating store (§6).

---

## Self-Check: PASSED

Files claimed as created or modified, verified present:
`$DS/tests/visual/storybook.spec.ts`, `$DS/.storybook/test-runner.ts`,
`$DS/src/visual-baseline-coherence.test.ts`, `$DS/CHANGELOG.md`,
`01-20-rename-baselines.mjs`, `01-20-SUMMARY.md`, and
`$DS/tests/visual/storybook.spec.ts-snapshots/` at **1,019** files.

Commits claimed, verified in `git log`: `a9ec1ef`, `d4c0663`, `086bd7b`, `7b0232c`,
`827f860`.

Verified absent, as required: no version bump (`package.json` still `1.11.4`), no tag, no
merge, no publish, `latest` unmoved, `RENAME-PENDING.json` unapplied
(`git status --porcelain tests/visual-baselines` → 0 changes), `TIME_DEPENDENT` byte-identical
to its pre-plan contents, and no approval recorded for Task 3.
