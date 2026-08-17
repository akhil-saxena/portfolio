---
project: momentum
tier: short
status: first-pass
awaiting: akhil-edit
badge: Maintained
---

# Momentum

<!--
Short form per D-39, and the heading sequence here is byte-identical to case-timeshift.md and
case-hued.md because plan 10 renders all three through ONE template.

Voice note (D-43 rule 1): Momentum needed the most rewriting of the five. Its README opens
with a twenty-one-bullet feature list, and its old resume.json description hung a run of six
comma-separated nouns off "Goal tracker with adaptive daily targets" — a changelog, not a
sentence. That run is quoted in full in 00-CONTEXT.md (D-43) and in 00-06-PLAN.md, and is
deliberately NOT reproduced here so a grep for it across 00-COPY/ stays clean. The voice below
is replaced rather than edited, and it follows the rewritten momentum one-liner in
00-COPY/one-liners.md, which is canonical because it has a measured character budget and the
Home Act-2 grid is laid out against it.

Sources read this session: README.md, ARCHITECTURE.md, app/build.gradle.kts,
app/src/main/java/com/momentum/app/engine/*.kt, app/src/main/java/com/momentum/app/data/dao/LogDao.kt,
app/src/test/java/com/momentum/app/**, store-listing/. docs/MIGRATION_PLAN.md was read and
then deliberately NOT sourced — see the note under ## Decision.
-->

## Problem

A goal with a deadline tells you almost nothing about today. "Read 50 books by December" is a
real intention and a useless instruction on a Tuesday morning [source: `README.md`, §What it
does]. The arithmetic that turns a target into an amount you can act on right now is the part
people skip, and it is the part that quietly decides whether the goal survives a bad week.

Dividing what is left by the days remaining works only until the first day you miss. After
that a fixed quota is wrong in a specific and discouraging way: it keeps showing the original
daily number while the real requirement climbs behind it, so the distance between what the
tracker says and what the goal actually needs widens in silence until the target is out of
reach and the screen is still displaying a comfortable figure. Momentum exists to keep that
number honest. It recalculates what today requires from what has actually been logged,
compensating when you have fallen behind and easing off when you are ahead, so the single
number in front of you is the current answer rather than the original plan.

That daily number is the product. Everything else on the surface — the streak that survives a
configured rest day, the intermediate checkpoints, the calendar heatmap — exists to make that
number legible over weeks rather than to be collected for its own sake.

## Decision

`ARCHITECTURE.md` names one decision as the key one, and it is the right one to keep: the
arithmetic does not live in the app. It lives in an `engine/` package of plain Kotlin objects
with no Android dependencies [source: `ARCHITECTURE.md`, §Key Design Decisions]. That claim
survives contact with the shipped code — across the five files in `engine/` there is not a
single `android.*` or `androidx.*` import [source:
`app/src/main/java/com/momentum/app/engine/`, checked this session]. The engines take plain
data in and hand plain results back; they hold no state and reach for nothing.

The consequence is the test suite. Momentum has no instrumented source set at all — there is
no `androidTest/` directory — so the entire suite runs on the JVM: 76 tests, of which 52 sit
directly against the engine [source: `app/src/test/java/com/momentum/app/`, counted this
session]. The rules deciding what today's number should be are checked without an emulator in
the loop, which is the whole return on the decision.

What it cost is visible at the one seam where the engine needs stored data. `StreakEngine` is
split in two: `computeFromDailyTotals` takes a plain list of daily totals and is the real
computation, while `computeStreak` is a thin suspend wrapper that accepts a Room `LogDao`,
fetches a bounded window of days and delegates straight back to it [source:
`app/src/main/java/com/momentum/app/engine/StreakEngine.kt`]. It is the only place in the
package that names a persistence type, and it exists so callers do not have to assemble that
query themselves. The same tension shows up in the clock: today's date arrives as a parameter
with a default rather than being read inside the engine, marked in its own documentation as
injectable for testing. Purity is not free here — it is paid for in duplicated entry points
and in arguments that would otherwise simply be ambient.

<!--
Sourcing note. docs/MIGRATION_PLAN.md was the other candidate decision and is deliberately not
used. It is an unreleased internal planning document, and T-00-07 confines this copy to what a
reader could already find in a public README, a store listing or the shipped app. Its detail —
week-by-week schedule, DAO method signatures, file-count estimates and the line-count of the
predecessor codebase — is exactly the internal material that must not cross into public prose.
The engine-layer decision is strictly better evidenced anyway: it is verifiable in shipped code
this session, and the canonical one-liner already carries it. ONE decision, per D-39: 396
commits record no rationale, and manufacturing a second or third to match the long form would
be inventing decisions in front of the audience most likely to open the repository.
-->

## Outcome

<!-- Searched and empty: README.md, ARCHITECTURE.md, docs/, store-listing/ and all 396 commits record
what was built and how, never why it was started or what it changed. No retrospective, no ADRs, no
analytics or crash-reporting SDK wired into the shipped app, so adoption is not recoverable here. -->
[NEEDS AKHIL] — why this was built, and what happened after it shipped.

Momentum started because <the goal Akhil was personally trying to hold onto, and the tracker
that failed him while he tried>, which is the detail that makes the adaptive target read as a
fix rather than a feature. Since it went out it has reached roughly <n> installs, and the
behaviour worth reporting is <whether people kept logging after the first fortnight>, because
a goal tracker that is abandoned quietly is indistinguishable from one that worked. The
judgement to record plainly is <whether the adaptive number actually changed Akhil's own
follow-through, or whether it turned out to be the wrong lever> — and if it was the wrong
lever, <what he would build in its place> is the most useful sentence on this page.

## Assets

The hero is `store-listing/feature-graphic.png` [source: `store-listing/`], the one composed
asset the repository carries. The single inline screenshot belongs under `## Problem`, showing
a goal card with the day's required amount on it, because that number is the argument the whole
page makes and it is easier shown than described. It is **not in the repository** — apart from
the feature graphic and `ic_launcher-playstore.png`, `store-listing/` holds only mock data and
a local database file, so the screenshot has to be captured from the live Play Store listing
rather than committed. D-41 caps this page at the hero plus one either way.

Both files upload straight to R2 under `assets/`, served from the same custom domain as the
photo gallery, with width and height captured at upload so the case-study page reserves the
space and does not shift as images land. Neither passes through the photo pipeline: that
pipeline composites a watermark and extracts EXIF, and neither belongs on a screenshot.
