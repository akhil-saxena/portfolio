---
phase: 00-design-ideation
plan: 02
subsystem: copy
tags: [copywriting, node, esm, validation, d-40, d-43, d-45]

# Dependency graph
requires: []
provides:
  - "Five project one-liners (60-110 chars) and five card descriptions (120-200 chars) in the D-43 idea-then-hard-fact shape"
  - "Per-project D-45 badge assignment (Live/Maintained) with the file that justifies it"
  - "check-copy-length.mjs — the reusable D-40 length-realism and D-43 budget gate over 00-COPY/"
  - "Provenance line per project naming the file each hard fact was read out of"
affects: [00-05, 00-06, 01-foundation, work-page, home-act-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Copy corpus as committed Markdown under 00-COPY/, linted by a zero-dependency Node ESM script"
    - "Fail-loud gate: accumulate every violation, name the failure mode, never warn and exit 0"

key-files:
  created:
    - .planning/phases/00-design-ideation/scripts/check-copy-length.mjs
    - .planning/phases/00-design-ideation/00-COPY/one-liners.md
  modified: []

key-decisions:
  - "check-copy-length.mjs resolves its corpus from import.meta.dirname, not cwd, so plans 05 and 06 can run it from anywhere"
  - "HTML comments are stripped before the word count and the digit scan — D-40 rule 4 commentary is meta about the gap, not the finished-length prose, and routinely carries real counts that would false-trip rule 3"
  - "A missing 00-COPY/ directory exits 1; an empty one exits 0 — a gate that passes by finding nothing to check is not a gate"
  - "hued and Momentum and TimeShift carry Maintained, not Live: shipped to a store with no changelog showing continuing work is the conservative reading D-45 asks for"
  - "hued's colour-name count was left out of the copy entirely because the repo contradicts itself on it"

patterns-established:
  - "Rule-tagged violation messages (LENGTH-REALISM / BUDGET / GUESS-VISIBILITY) so a failing run names which decision was broken"
  - "Every copy entry carries a - source: line ending in its measured character counts, so budget compliance is visible rather than asserted"

requirements-completed: [DSGN-06]

# Metrics
duration: 10min
completed: 2026-08-17
---

# Phase 0 Plan 02: One-Liners and the Copy-Length Gate Summary

**Five rewritten project one-liners and card descriptions inside measured character budgets, plus a zero-dependency Node gate that enforces D-40 length realism, D-43 budgets and D-40's no-guessed-numbers rule across the copy corpus.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-17T05:57:35Z
- **Completed:** 2026-08-17T06:07:55Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- `check-copy-length.mjs` enforces three rules over `00-COPY/*.md` and accumulates every violation before exiting, so one run names every problem rather than the first
- Momentum's six-noun feature run and the design system's feature list are both replaced outright, not edited — the two rewrites D-43 explicitly called for
- The design-system one-liner closes by pointing at the page the reader is on, per UI-SPEC rule 5 and D-38
- Every hard fact is traceable to a named file read this session; nothing came from the stale `../design-system/.planning/PROJECT.md`
- Resolved a real in-repo contradiction in hued's colour-name count rather than picking a number and hoping

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the copy-corpus length checker** - `cdc7aa7` (feat)
2. **Task 2: Write the five one-liners and card descriptions** - `5c004b4` (docs)

## Files Created/Modified

- `.planning/phases/00-design-ideation/scripts/check-copy-length.mjs` - The D-40/D-43 gate. Walks `00-COPY/` for `*.md` and enforces: (1) a `[NEEDS AKHIL]` marker must be followed by >= 40 words before the next heading, rule, next marker or EOF; (2) in `one-liners.md`, `- one-liner:` payloads are 60-110 chars and `- card:` payloads are 120-200; (3) a bare run of two or more digits inside a marker block is a guess wearing a fact's clothes unless it sits in an `<angle-bracket>` slot. No dependencies beyond `node:fs` and `node:path`; zero `console.warn`.
- `.planning/phases/00-design-ideation/00-COPY/one-liners.md` - Five `## <project>` sections in the order the plan fixed, each carrying `- one-liner:`, `- card:`, `- badge:` and `- source:`. Frontmatter marks it `status: first-pass`, `awaiting: akhil-edit`.

## Decisions Made

- **Corpus resolved from `import.meta.dirname`, not cwd.** Plans 05 and 06 will run this checker from wherever they happen to be; a cwd-relative path would silently scan nothing and pass.
- **HTML comments stripped before both scans.** D-40 rule 4 requires an HTML comment above each marker stating what was searched. That comment is commentary about the gap, not the finished-length prose, and it routinely carries genuine counts. Counting it would inflate rule 1 and false-trip rule 3 on exactly the text D-40 mandates.
- **A marker's block also terminates at the next marker.** Two markers in one section would otherwise let the first borrow the second's prose and pass on words it does not own.
- **Missing corpus directory fails loud (exit 1); empty corpus passes (exit 0).** An empty `00-COPY/` is a legitimate starting state. A missing one means the corpus moved or was deleted, and a gate that passes by finding nothing to check is worse than no gate.
- **Badges: Live for design-system and cairn, Maintained for hued, Momentum and TimeShift.** design-system is Live because `package.json` is at 1.11.4 and `CHANGELOG.md`'s newest entry is that same release; cairn is Live because it is deployed at cairn.co.in with `REMOVED.md` as the current v1 scope of record. The three store-published apps ship at fixed versions (hued 1.1.0, Momentum 1.1.0, TimeShift 2.2.0) with no changelog showing continuing work, so Maintained is the honest reading — and D-45's own argument is that an honest lesser status reads better than an overclaimed one.
- **hued's colour-name count omitted from the copy.** See Issues Encountered.
- **TimeShift's hard fact is the CST/IST/BST disambiguation, not the README's "65 tests".** The disambiguation is stated in the README and is the genuinely hard fact the plan pointed at; the test count could not be confirmed without installing and running the suite, which this plan's threat model rules out.

## Deviations from Plan

None - plan executed exactly as written.

Both tasks ran as specified, all acceptance criteria passed on first execution, and no
deviation rule was triggered. The judgement calls recorded under "Decisions Made" are
elaborations within the latitude the plan's `<action>` blocks left open, not departures from
them.

## Issues Encountered

**hued's repo contradicts itself on the colour-name count.** `README.md` claims "18,000+
evocative color names" while `publishing/play-store-listing.md` claims "31,000+". Rather than
pick one, the shipped data was counted directly:
`app/src/main/res/raw/color_names.json` holds **31,898** entries — the store listing is
correct and the README is stale. Because the plan's `<read_first>` named the README as a
calibration source, quoting it would have shipped a stale number into public copy in front of
an audience that can open the repo (threat T-00-08). The count is therefore left out of the
copy entirely and the hued hard fact rests on the CIELAB clustering technique and the
"no network permissions requested" constraint, both of which agree across the store listing,
the privacy policy and the source. The discrepancy is recorded in hued's `- source:` line so
plans 05 and 06 do not rediscover it.

**Sibling-repo `git` commands are blocked by worktree isolation.** Badge currency could not be
established from commit recency. Committed-file evidence was used instead — version fields and
changelog presence — which is a better fit for threat T-00-07 anyway, since it restricts the
evidence to facts already public in a README, CHANGELOG or store listing.

## Verification

All plan-level verification passed:

- `node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs` exits 0
- Five exact H2 headings present; `- one-liner:`, `- card:`, `- badge:` and `- source:` each appear exactly 5 times
- No superlative (`beautiful|seamless|powerful|modern|cutting.edge`), no `55 component`, no `JobDash|53 section|body.dark` — all three greps exit 1
- `streaks, milestones, badges` absent — Momentum's feature-list copy is gone
- A `- one-liner:` line contains `this page` (design-system), satisfying UI-SPEC rule 5

Checker behaviour was proved with a negative control rather than assumed. A scratch file
carrying `[NEEDS AKHIL] Cairn shipped in 2024.` produced three independently-reported
violations — one LENGTH-REALISM (4 words against the 40-word floor) and two GUESS-VISIBILITY
(`2024` and `4200` outside angle-bracket slots) — while a second, deliberately long block in
the same file was correctly *not* flagged for length, confirming that the heading terminator
scopes each marker's block and that the rules do not mask one another. A scratch `one-liners.md`
with short payloads produced two BUDGET violations naming the actual counts against the broken
bound. Both scratch files were removed by explicit path and the checker returned to exit 0.

## Known Stubs

None. `one-liners.md` contains no `[NEEDS AKHIL]` markers by design — a one-liner has no room
for one, and per the plan any unsourceable fact would have been declared `NOT SOURCED — see
case study` in its `- source:` line instead. No project needed that escape hatch; all five hard
facts were sourced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plans 05 and 06 can run the checker as-is.** It is committed in the phase directory rather
  than `.playground/`, so it survives the playground's deletion, and it resolves its corpus
  relative to its own location. Case-study drafts dropped into `00-COPY/` are linted the moment
  they exist, including their `[NEEDS AKHIL]` blocks.
- **The budget rule is scoped to `one-liners.md` by basename**, as the plan specified. If plans
  05 or 06 introduce `- one-liner:` or `- card:` lines in other corpus files and want them
  budget-checked, `BUDGETED_FILE` is the single constant to widen.
- **`data/resume.json` is not yet updated** with this copy. That is correct for this plan — the
  corpus is the source of truth for the phase and the sketches key off it — but a later plan
  must carry these five one-liners, card descriptions and badge values into `resume.json`,
  including the `badges` extension D-45 calls for (Cairn currently carries `Live`; the other
  four carry store/GitHub links only).
- **One open thread for the final-phase interview:** hued's `README.md` colour-name count is
  stale against its own shipped data and should be corrected in that repo.

## Self-Check: PASSED

- `scripts/check-copy-length.mjs` — FOUND
- `00-COPY/one-liners.md` — FOUND
- `00-02-SUMMARY.md` — FOUND
- Commit `cdc7aa7` (Task 1) — FOUND
- Commit `5c004b4` (Task 2) — FOUND
- Checker exits 0 against the committed corpus; working tree clean

---
*Phase: 00-design-ideation*
*Completed: 2026-08-17*
