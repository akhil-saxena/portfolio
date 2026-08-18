---
phase: 00-design-ideation
plan: 18
subsystem: copy
tags: [case-studies, compression, copy-gate, heading-normalisation, provenance]
requires:
  - "00-RESPONSIVE-CONTRACT.md §7 (supersedes D-39: one tier, R-1 sets 500–700 words)"
  - "00-COMPRESSION-NOTE.md + 00-COPY/case-design-system-COMPRESSED.md (the accepted shape)"
  - "scripts/check-copy-length.mjs (D-40 floor, unchanged, an acceptance gate here)"
provides:
  - "Four case studies inside the R-1 500–700 band, measured not asserted"
  - "One middle-heading spelling across all five studies: `## Decisions`"
  - "scripts/check-case-length.mjs — a committed, re-runnable band gate"
  - "00-PUBLIC-DESIGN-NOTES.md §Case-study compression — the loss record + heading ruling"
affects:
  - "plan 00-20 (loader must accept either heading spelling and throw on neither; moves design-system into OWNED; retires X-case-long / X-case-short)"
  - "Phase 6 (renders this corpus; five [NEEDS AKHIL] blocks are its fill contract)"
tech-stack:
  added: []
  patterns:
    - "Gate written before the edit it measures, and shown to fail first"
    - "Required heading as a one-slot / two-spelling match, erroring on neither"
    - "Provenance markers stripped from the count, asserted separately"
    - "Marker-phrase verification by line-anchored count vs total-occurrence count"
key-files:
  created:
    - .planning/phases/00-design-ideation/scripts/check-case-length.mjs
    - .planning/phases/00-design-ideation/00-18-SUMMARY.md
  modified:
    - .planning/phases/00-design-ideation/00-COPY/case-cairn.md
    - .planning/phases/00-design-ideation/00-COPY/case-hued.md
    - .planning/phases/00-design-ideation/00-COPY/case-momentum.md
    - .planning/phases/00-design-ideation/00-COPY/case-timeshift.md
    - .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md
decisions:
  - "Keep Cairn's decisions 1, 2 and 6; drop 3, 4 and 5 whole — the reference draft's rule is that the rejected alternative must cost a named incident, not an argument"
  - "Add the explicit `The option not taken:` / `What it would have cost:` pair to hued, Momentum and TimeShift, which had the reasoning but not the greppable marker phrasing"
  - "Add `badge: Live` to case-cairn.md so all five studies carry identical frontmatter keys"
  - "Leave `one-liners.md` untouched — outside this plan's files_modified; the 80→79 correction is flagged below, not applied"
metrics:
  duration: ~21 min
  completed: 2026-08-18
  tasks: 3
  commits: 3
  files-changed: 6
---

# Phase 00 Plan 18: Case-study compression and heading normalisation Summary

Four case studies compressed to the R-1 500–700 band against the accepted reference shape,
with the middle heading normalised to `## Decisions` across all five and a committed gate that
re-measures the band on demand.

## What shipped

**Task 1 — the band gate, written first (`9c88bed`).**
`scripts/check-case-length.mjs` measures every `case-*.md` over its four required sections and
fails outside 500–700. Run against the *uncompressed* corpus before any draft was touched, it
exited 1 naming cairn (1,713) and momentum (798) — so the gate is not a description of the edit
it was written to bless.

**Task 2 — the four drafts (`122fc9a`).**
**Task 3 — the loss record, ruling and negative control (`633078f`).**

## The real numbers

Every figure below is what `check-case-length.mjs` printed this session. It strips HTML comments
**and `[source: ...]` markers** before counting, so these run below plan 00-10's figures for the
same files — that difference is the measure, not an error. The plan anticipated it and told me
to trust my own run.

| Study | Before | After | Cut | Sections after (Problem · Decisions · Outcome · Assets) |
|---|---|---|---|---|
| cairn | 1,713 | **680** | −60% | 150 · 305 · 152 · 73 |
| momentum | 798 | **682** | −15% | 173 · 274 · 135 · 100 |
| timeshift | 682 | **647** | −5% | 140 · 278 · 118 · 111 |
| hued | 682 | **619** | −9% | 156 · 268 · 117 · 78 |
| design-system *(reference, not owned)* | 1,633 | **597** | −63% | 122 · 243 · 164 · 68 |

Note hued and timeshift were **already inside** the band under this measure (682 each) — plan
00-10's figures had them at 698 and 703. They were still trimmed, toward the reference's density
rather than merely into the band, so the five studies read as one corpus.

## Verification

| Gate | Result |
|---|---|
| `check-case-length.mjs` | **exit 0** — 6 case files, 4 enforced, all inside 500–700 |
| `check-copy-length.mjs` | **exit 0** — 7 files, 6 `[NEEDS AKHIL]` markers, shortest block **85 words** (floor 40) |
| `^## Decision$` anywhere in `00-COPY/` | **0** in all six case files |
| `^## Decisions$` | exactly **1** in each of the six case files |
| `git diff --quiet` on `case-design-system.md` | **exit 0** — byte-identical |
| `git diff --quiet` on `case-design-system-COMPRESSED.md` | **exit 0** — byte-identical |
| `STATE.md` / `ROADMAP.md` | untouched — the full diff vs base is exactly the plan's six files |

**Marker pairs verified as real, not wrap artefacts.** Line-anchored count compared against
total-occurrence count across the four owned drafts: `The option not taken:` 6 line-leading == 6
total; `What it would have cost:` 6 line-leading == 6 total. Per file: cairn 3/3, hued 1/1,
momentum 1/1, timeshift 1/1. CASE-01's requirement survives in every study.

**Negative control.** `case-timeshift.md` SHA-256
`1c1599b7176d210c5a7fca6d2e3a77204e430ed0c3026d441d8a6e1505010ff1`; line 28 (`## Decisions`)
deleted; gate exited **1** naming the file, both accepted spellings and the headings found;
restored with `git checkout --` on that path only; SHA-256 after **identical**;
`git status --porcelain` empty for the path; gate back to **exit 0**.

The control produced a result worth keeping: with the heading gone, the orphaned decision prose
was absorbed upward into `## Problem` (140 → **418** words) and the file's total stayed **647 —
inside the band**. A length check alone would have passed the broken file. That is the argument
for treating the middle heading as a required slot rather than counting whatever headings appear.

## Every load-bearing number re-verified against shipped code

The brief warned that seven factual errors this phase all came from docs describing code. I
re-read each claim out of the sibling repos rather than trusting the drafts:

| Claim | Verified against | Result |
|---|---|---|
| hued: 31,898 colour names | `res/raw/color_names.json`, parsed | confirmed (README still says 18,000+) |
| hued: merge threshold `15.0` | `ColorAggregator.kt:25` `MERGE_THRESHOLD` | confirmed |
| hued: no network permission | `AndroidManifest.xml:27` `tools:node="remove"` | confirmed |
| TimeShift: 179 tests, nine files | `it(` count across `test/*.test.js` | confirmed (README still says 65) |
| TimeShift: eight ambiguous abbreviations, five multi-candidate | `AMBIGUOUS_ABBREVIATIONS`, parsed | confirmed — 8 keys, 5 with >1 zone |
| TimeShift: six-priority ladder, `resolveTimezoneLegacy` | `timezone-resolver.js`, priorities 1–6 labelled, legacy fn at 120 | confirmed |
| Momentum: five engine files, zero `android.*`/`androidx.*` | `engine/` listing + grep | confirmed — 5 files, grep exit 1 |
| Momentum: 76 tests, 52 on the engine, no `androidTest/` | `@Test` counts; directory absent | confirmed |
| Cairn: `--ink-4` 3.36:1, `--ink-5` 1.34:1, 7 of 8 public pages, 12 pages audited | `A11Y-AUDIT.md` | confirmed |
| Cairn: five-stage pipeline | `schema/applications.ts:15` enum | confirmed (PROJECT.md still says six) |
| Cairn: refusal ban list runs in `lint:all` | `lint-refusals.sh:8`, `package.json:28` | confirmed |

No draft claim needed correcting — the three stale-README figures had already been fixed by plan
00-06 and I confirmed the fixes rather than re-trusting them. Momentum's README "4 widgets"
figure does not appear in this draft, so nothing needed changing there.

## Findings raised (not fixed — outside this plan's file set)

**1. `one-liners.md` still ships `80` components — the 80→79 correction was NOT applied.**
The user ruled the count is **79**, matching `../design-system/src/OverviewPage.tsx` (the shipped
catalog, which omits `Field` and `IconButton`). `00-COPY/one-liners.md` carries `80` in **both**
the design-system one-liner (line: `- one-liner:`) and the Work card (`- card:`), plus a
`- source:` line citing `README.md` for "80 components across 10 categories".

**This file is not in plan 00-18's `files_modified`, so I did not touch it.** Flagging so it is
not lost. All three candidates (79/80/81) are two characters, so the D-43 budgets (one-liner
60–110, card 120–200) are unaffected — the current measured values are 97 and 160 and would not
move. Whoever picks this up should also update the `- source:` line, since `README.md` is the
wrong authority for the figure.

**2. `case-design-system.md` has two marker phrases that do not start a line.** Not my file.
It carries **6** total occurrences of `What it would have cost:` but only **4** that begin a
line — lines **64** and **106** carry the marker mid-line, after other prose. A line-oriented
grep reports that file's pair as broken. This is the same class of failure the compression note
called the seventh verification-method failure of the phase, still live in the un-compressed
source. Recorded in the design notes too.

**3. Cairn's Ghost Watch removal is not quite total.** `REMOVED.md` claims the feature was
removed end to end. Re-verification confirms the cron, scheduled handler, URL-check route, SSRF
guard and the three application status columns are all gone — but the value **`ghost_flagged`
survives in the `timeline_events.kind` enum** (`src/db/schema/timeline-events.ts:26`). The prose
now attributes "end to end" to `REMOVED.md` and states only what was verified; the residue is
recorded in the file's provenance comment. Worth resolving before Phase 6 quotes the removal as
total.

## Deviations from Plan

### Auto-fixed / judgement applied

**1. [Rule 2 — missing critical functionality] Added the explicit option/cost pair to three drafts**
- **Found during:** Task 2
- **Issue:** hued, Momentum and TimeShift carried the rejected alternative and its cost inside
  running prose. CASE-01's defining requirement was therefore present to a reader but invisible
  to the grep used to prove it, and not visually distinct at render time.
- **Fix:** each now carries one `**The option not taken:**` / `**What it would have cost:**`
  pair, both phrases line-leading and unwrapped. No reasoning was invented — the existing
  argument was promoted into the marker phrasing.
- **Commit:** `122fc9a`

**2. [Judgement] Cairn kept decisions 1, 2 and 6; dropped 3, 4 and 5 whole**
- Applied the reference draft's rule: keep the decisions whose rejected alternative costs a
  *named incident*, cut those whose alternative costs only an argument. Dropped: *Cut the
  Settings page*, *Multi-tenancy is structural and lint-enforced*, *The free tier is a hard ship
  gate*. **Decision 4 is the most arguable cut** — it is the security one, and its cost ("one
  forgotten predicate is a cross-tenant leak") is a named failure mode rather than an incident
  that occurred. Named in the design notes as the entry to restore if Phase 6 wants a security
  decision on that page.

**3. [Judgement] Cairn's cross-repo coda demoted to an HTML comment rather than deleted**
- The design system later aliasing `--ink-4` away for its own 1.96:1 dark-mode failure is the
  corpus's only two-repo contrast finding. Cut from prose as the third example of a point
  decision 3 already makes with a measured incident, but retained in-file as a comment (comments
  are stripped from the count, so it costs nothing against the band).

**4. [Rule 2 — consistency] Added `badge: Live` to `case-cairn.md`**
- It was the only study with no `badge:` key. Sourced from the value already recorded for cairn
  in `00-COPY/one-liners.md`. All five studies now carry identical frontmatter keys, which is
  what a single template needs. If badges do not belong in case-study frontmatter, they come out
  of all five together.

**5. [Scope] `one-liners.md` deliberately not modified** — see Finding 1 above.

### Not deviations

`tier:` left in place on all four (the plan requires this — deleting it here while the parallel
run leaves it on `case-design-system.md` would split the corpus into two frontmatter shapes).
Titles reduced to bare project names and all "long form" / "short form" / "per D-39" references
removed, as the plan directs; verified zero remaining across the four.

## Known Stubs

None. The five `[NEEDS AKHIL]` blocks are not stubs — they are D-40 placeholder contracts to be
filled by interview in Phase 6, all above the 40-word floor (shortest 85 words), all carrying
`<angle-bracket>` slots rather than invented figures.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change — this plan
edits Markdown copy and adds one dependency-free Node script that reads the corpus and exits.

T-00-46 (two heading spellings) is mitigated as planned: corpus normalised, gate accepts either
and errors on neither, negative control recorded with a matching SHA-256. T-00-47 (concurrent
edit of `case-design-system.md`) held — both design-system files are byte-identical.
T-00-48 (orphaned `[source:]` markers) — markers are stripped from the count and asserted
separately; cairn went 25 → 8 markers, all with their claims. T-00-49 (placeholder erosion) held
— `check-copy-length.mjs` passes unchanged.

## Self-Check: PASSED

Files verified present:
- `FOUND: .planning/phases/00-design-ideation/scripts/check-case-length.mjs`
- `FOUND: .planning/phases/00-design-ideation/00-COPY/case-cairn.md`
- `FOUND: .planning/phases/00-design-ideation/00-COPY/case-hued.md`
- `FOUND: .planning/phases/00-design-ideation/00-COPY/case-momentum.md`
- `FOUND: .planning/phases/00-design-ideation/00-COPY/case-timeshift.md`
- `FOUND: .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md`

Commits verified in `git log`:
- `FOUND: 9c88bed` — feat(00-18): add the R-1 case-study length band gate
- `FOUND: 122fc9a` — docs(00-18): compress four case studies to the R-1 band, normalise the middle heading
- `FOUND: 633078f` — docs(00-18): record what the case-study compression cost, and the heading ruling
