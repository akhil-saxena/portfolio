---
phase: 00-design-ideation
plan: 06
subsystem: ui
tags: [copywriting, case-study, content, markdown, dsgn-06]

# Dependency graph
requires:
  - phase: 00-design-ideation
    provides: "Plan 00-02's check-copy-length.mjs gate and the canonical one-liners.md corpus"
provides:
  - "Three short-form case studies (TimeShift, hued, Momentum) at finished length"
  - "The short-form template: ## Problem, ## Decision, ## Outcome, ## Assets — byte-identical across all three"
  - "A verified fact base per repo, each claim carrying a [source:] marker"
  - "Three length-realistic [NEEDS AKHIL] gaps with search logs, for the final-phase interview"
affects: [phase-06-case-studies, phase-05-work-page, final-phase-content-interview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Short-form case study = one problem + exactly ONE code-visible decision + admitted gap"
    - "Provenance-by-HTML-comment: corrections and search logs live in comments, not prose"

key-files:
  created:
    - .planning/phases/00-design-ideation/00-COPY/case-timeshift.md
    - .planning/phases/00-design-ideation/00-COPY/case-hued.md
    - .planning/phases/00-design-ideation/00-COPY/case-momentum.md
  modified: []

key-decisions:
  - "## Decision is singular in the short form — one code-visible decision, never padded to three"
  - "Momentum's decision sourced from ARCHITECTURE.md + shipped code, NOT docs/MIGRATION_PLAN.md (T-00-07 bars unreleased internal docs)"
  - "Every load-bearing number counted from shipped data this session; three stale README claims found and overridden"
  - "Missing store screenshots recorded as capture tasks rather than invented filenames"

patterns-established:
  - "Verify-against-shipped-data: READMEs are treated as untrusted for any number"
  - "Search-log comment sits within 3 lines above every [NEEDS AKHIL] marker"

requirements-completed: [DSGN-06]

# Metrics
duration: 34min
completed: 2026-08-17
---

# Phase 00 Plan 06: Short-Form Case Studies Summary

**Three structurally identical short-form case studies — TimeShift's confidence-returning resolver ladder, hued's CIELAB clustering at a 15.0 merge threshold, and Momentum's pure-Kotlin engine layer — each with one code-visible decision, sourced numbers, and honest paragraph-length gaps.**

## Performance

- **Duration:** ~34 min
- **Started:** 2026-08-17T11:47:00Z
- **Completed:** 2026-08-17T12:21:00Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Established the short-form template — `## Problem`, `## Decision`, `## Outcome`, `## Assets` — byte-identical across all three files, so plan 10 renders them through one template. Verified by two `diff` calls, both exit 0.
- Gave each study a real problem statement and exactly **one** architectural decision that is visible in the code, each stated with what it cost rather than only what it bought.
- **Corrected three stale README claims** by counting the shipped data instead. This is the plan's core anti-risk (T-00-08) and it fired three times.
- Replaced Momentum's feature-list voice outright: its `## Problem` is a problem statement with zero list items, and the six-noun run is absent from the file.
- Left motivation and outcome as `[NEEDS AKHIL]` gaps at 115+ words each (floor is 40), every guessed value in an angle-bracket slot, each preceded within 3 lines by a search log recording what was checked and why it came up empty.

## Task Commits

1. **Task 1: Draft TimeShift and hued, establishing the short-form structure** — `594abe3` (docs)
2. **Task 2: Draft Momentum, replacing the feature-list voice** — `b86d06e` (docs)

## Files Created

- `.planning/phases/00-design-ideation/00-COPY/case-timeshift.md` — the timezone-abbreviation ambiguity problem; decision is the six-priority resolver ladder that returns a confidence level, costing a retained legacy API and a runtime argument-shape check.
- `.planning/phases/00-design-ideation/00-COPY/case-hued.md` — palette-as-theme, design-first; decision is perceptual merging in CIELAB (ΔE under a fixed `15.0`), costing a greedy single-pass clustering that reports dominance rather than centroids.
- `.planning/phases/00-design-ideation/00-COPY/case-momentum.md` — problem-first rewrite; decision is the pure-Kotlin engine layer, costing duplicated entry points where the engine needs stored data.

## Verified Fact Base

Every number below was counted from shipped files during this session and carries a `[source:]` marker in the copy.

| Project | Fact | Source |
|---------|------|--------|
| TimeShift | 179 test cases across 9 files, no skips | `test/*.test.js` |
| TimeShift | 8 abbreviations registered ambiguous; **only 5** map to >1 zone | `src/timezone-data.js` |
| TimeShift | 59 commits; manifest v2.2.0 | git, `manifest.json` |
| hued | 31,898 colour names | `app/src/main/res/raw/color_names.json` |
| hued | ΔE merge threshold `15.0`, greedy frequency-ordered clustering | `ColorAggregator.kt` |
| hued | No INTERNET permission; `ACCESS_NETWORK_STATE` explicitly removed | `AndroidManifest.xml` |
| hued | 19 commits | git |
| Momentum | Zero `android.*`/`androidx.*` imports across all 5 engine files | `engine/` |
| Momentum | 76 JVM tests, 52 against the engine; **no `androidTest/` source set at all** | `app/src/test/` |
| Momentum | 396 commits; 21-bullet README feature list | git, `README.md` |

## Decisions Made

- **`## Decision` is singular in the short form.** The long form uses `## Decisions` plural. These three repos have no decisions register to compress, so the section is capped at one decision and deliberately not padded.
- **Momentum's decision came from `ARCHITECTURE.md` plus the shipped code, not `docs/MIGRATION_PLAN.md`.** See deviation 3 — this was a direct conflict between the plan's task text and its own threat model.
- **Asset gaps are stated, not filled.** Two of the three projects have no screenshots committed; no filenames were invented.
- **Provenance corrections live in HTML comments,** which the checker strips and the rendered page never shows. A reader needs the correct number, not the correction; a future drafter needs both.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's CST ambiguity claim is contradicted by the shipped data**
- **Found during:** Task 1
- **Issue:** The plan's action text states "CST alone is ambiguous across US Central, China Standard and Cuba Standard." `AMBIGUOUS_ABBREVIATIONS` registers CST with exactly two candidates — `America/Chicago` and `Asia/Shanghai`. There is no Cuba entry anywhere in the file. Writing the plan's version would have put an invented fact in front of readers who can open the repo (T-00-08).
- **Fix:** Wrote the data's version. Also refined the aggregate claim: 8 abbreviations are registered as ambiguous but only 5 (CST, IST, BST, AST, WET) map to more than one candidate zone — GST, WAT and SST each have one.
- **Files modified:** `case-timeshift.md`
- **Verification:** Parsed the `AMBIGUOUS_ABBREVIATIONS` block and printed candidate counts per key.
- **Committed in:** `594abe3`

**2. [Rule 1 - Bug] TimeShift's README test count is stale — the same pattern wave 1 found in hued**
- **Found during:** Task 1
- **Issue:** `README.md` line 44 claims "65 tests". The plan told me to read the count out of the repo this session; counting `it(` declarations across `test/*.test.js` gives **179**, with no `.skip`/`.todo`/`.only`. `node_modules` is absent so the suite could not be executed, and installing into a read-only sibling repo was out of scope — the count is static but exhaustive.
- **Fix:** Used 179 with a `[source:]` marker naming `test/*.test.js`, and recorded the correction in an HTML comment instructing future drafters not to re-source it from the README.
- **Files modified:** `case-timeshift.md`
- **Verification:** Per-file counts summed and cross-checked against a manual reading of `timezone-resolver.test.js` (21, matched).
- **Committed in:** `594abe3`

**3. [Rule 2 - Missing Critical] The plan's task text and its own threat model disagreed about Momentum's decision source**
- **Found during:** Task 2
- **Issue:** Task 2 offers `docs/MIGRATION_PLAN.md` as a candidate for the single decision. T-00-07 in the same plan forbids "an unreleased migration plan's internal detail" from entering the prose. `MIGRATION_PLAN.md` is exactly that: a week-by-week internal schedule with DAO method signatures, file-count estimates, and the line count of a predecessor React Native codebase that no public artifact mentions.
- **Fix:** Applied the threat model, which takes precedence. Used the engine-layer decision instead — strictly better evidenced (verifiable in shipped code this session), and it agrees with the canonical one-liner, which already commits to "a pure-Kotlin engine layer". Recorded the reasoning in an HTML comment in the file so the choice is auditable rather than silent.
- **Files modified:** `case-momentum.md`
- **Verification:** Confirmed zero `android.*`/`androidx.*` imports across `engine/`, and that only `StreakEngine` names a persistence type.
- **Committed in:** `b86d06e`

**4. [Rule 3 - Blocking] Two of the three projects have no screenshots to name**
- **Found during:** Tasks 1 and 2
- **Issue:** The plan directs assets to be "sourced from the Play Store listing for hued and the Chrome Store listing for TimeShift", implying committed assets. Only hued has them (`publishing/screenshots/final/01.png`–`06.png` plus a feature graphic). TimeShift carries only `icons/*.png`. Momentum's `store-listing/` has a feature graphic and a launcher icon but no screenshots — just mock data and a local database file. Naming a plausible path would have been a fabricated fact.
- **Fix:** Named only files that exist, and stated explicitly for TimeShift and Momentum that the hero/screenshot is **not in the repository** and must be captured from the live store listing.
- **Files modified:** all three
- **Verification:** Directory listings and a repo-wide screenshot search per project.
- **Committed in:** `594abe3`, `b86d06e`

**5. [Rule 3 - Blocking] Search-log comments sat too far above their `[NEEDS AKHIL]` markers**
- **Found during:** Task 1
- **Issue:** The acceptance criterion requires each marker to be "preceded within four lines by an HTML comment opening `<!--`". My initial multi-line search logs put `<!--` eleven lines above the marker, which fails the strict reading.
- **Fix:** Compacted each search log to a dense 3-line comment sitting immediately above its marker, preserving the D-40 rule 4 content (what was searched, why it came up empty). Exhaustive per-repo source lists moved to the top-of-file comment.
- **Files modified:** all three
- **Verification:** Marker/comment line numbers checked in each file — gap is 3 lines everywhere.
- **Committed in:** `594abe3`, `b86d06e`

**6. [Rule 1 - Bug] My own Momentum comment reproduced the forbidden six-noun run verbatim**
- **Found during:** Task 2
- **Issue:** The voice note quoted the old `resume.json` description in full to explain what was being replaced. That put the literal `streaks, milestones, badges` in the file, which the acceptance grep requires to be absent — a plain grep does not care that it sat inside an HTML comment framed as the thing being removed.
- **Fix:** Rewrote the comment to reference the run and point at where it is quoted in full (`00-CONTEXT.md` D-43, `00-06-PLAN.md`) without reproducing it.
- **Files modified:** `case-momentum.md`
- **Verification:** `grep -n 'streaks, milestones, badges'` now exits 1.
- **Committed in:** `b86d06e`

---

**Total deviations:** 6 auto-fixed (3 bugs, 1 missing critical, 2 blocking)
**Impact on plan:** No scope creep. Deviations 1, 2 and 6 were factual-integrity fixes and are exactly what T-00-08 exists to catch; deviation 3 resolved an internal contradiction in the plan in favour of its own threat model; deviations 4 and 5 were honesty and gate-compliance corrections. All three artifacts and every acceptance criterion landed as specified.

## Issues Encountered

- **Worktree spawned at a stale base** (`5029049`, several commits behind). Corrected with `git reset --hard 38eadc4` after the branch-namespace assertion passed and the tree was confirmed clean — the documented wave-1 behaviour, handled as instructed.
- **Sandbox blocked process substitution and heredocs.** The plan's verify blocks use `diff <(grep …) <(grep …)`. Ran the equivalent by extracting heading sequences to scratchpad files and diffing those; both comparisons exit 0, so the criterion is satisfied by equivalent means rather than the literal command.
- **Sibling-repo `git` access worked** from this worktree, contrary to the wave-1 note. Commit counts (59 / 19 / 396) were read directly rather than inferred; all other facts still came from committed files.

## Findings for Later Phases

- **READMEs in these repos are systematically stale on numbers.** Three independent cases: TimeShift's test count (65 → 179), hued's colour names (18,000+ → 31,898, re-confirming wave 1), and Momentum's widget count (README says 4, `ARCHITECTURE.md` says six and lists six). **Any number in a case study must be counted from shipped data, never lifted from a README.** The correction notes are embedded as HTML comments in the two affected files.
- **Screenshot capture is real, unscheduled work.** Four assets need capturing from live store listings before the case-study pages can ship: a TimeShift hero and inline shot, and a Momentum hero-adjacent inline shot. hued is fully covered from `publishing/`.
- **TimeShift does have a `docs/superpowers/{plans,specs}` directory** — not a `.planning/` directory, and it records implementation design rather than rationale, so D-39's short-form tiering still holds. Worth knowing it exists if the tiering is ever revisited.

## User Setup Required

None — Markdown only, no build, no external service.

## Next Phase Readiness

- All three short-form drafts are at finished length, so Phase 6 can lay out the short template against real measures rather than placeholder stubs.
- The heading contract is enforceable: `## Problem`, `## Decision`, `## Outcome`, `## Assets`, verified byte-identical across the three files.
- Plan 05's two long-form studies use `## Decisions` plural; the deliberate singular/plural split between the tiers is the signal that two templates exist, not one.
- Open for the final-phase interview: three `[NEEDS AKHIL]` gaps, each with a search log naming exactly what was checked, so the interview can go straight to the questions only Akhil can answer.

---
*Phase: 00-design-ideation*
*Completed: 2026-08-17*
