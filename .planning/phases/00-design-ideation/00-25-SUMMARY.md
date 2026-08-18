---
phase: 0
plan: 25
subsystem: design-ideation
tags:
  [
    dsgn-01,
    dsgn-02,
    dsgn-03,
    dsgn-04,
    screenshot-contract,
    six-device-classes,
    gap-closure,
    open-plan-amendment,
    human-checkpoint,
    re-review-brief,
    derived-not-asserted,
    fixed-denominator,
  ]

requires:
  - .planning/phases/00-design-ideation/00-RESPONSIVE-CONTRACT.md — §1's six-class matrix, §2's pointer-not-width density derivation, §9's capture policy, §10's confirm-or-override, §11's 00-11 deferral
  - .planning/phases/00-design-ideation/00-UI-SPEC.md — the filename grammar, the artefact ID scheme, the viewport/mode contract, the six review passes
  - .planning/phases/00-design-ideation/00-17-PLAN.md — the plan amended here; OPEN, unchanged in structure
  - .planning/phases/00-design-ideation/00-11-PLAN.md — READ ONLY; supplemented, never edited
  - .planning/phases/00-design-ideation/00-19-SUMMARY.md — the photo-field SPECIFICATION, used as Task 3's source because 00-24-SUMMARY.md did not exist
  - .planning/phases/00-design-ideation/00-20-SUMMARY.md — the five case routes and their word counts, which name the bracket pair by measurement
  - .planning/phases/00-design-ideation/00-21-SUMMARY.md — the responsive shell, the gutter ladder, the /work overflow closure
  - .planning/phases/00-design-ideation/00-22-SUMMARY.md — X-home, the two-state landing, the measured 131px of chrome
  - .planning/phases/00-design-ideation/00-23-SUMMARY.md — PhotoLayoutBoard, the focal point on all 39, the FIFTEEN-row correction
provides:
  - "00-SCREENSHOT-CONTRACT.md — the six-class capture policy, filename grammar, mode rules, >= 80 floor and derived total of 88"
  - "Plan 00-17's four stale viewport/count literals amended onto the six-class contract, so its own gate can pass"
  - "00-PUBLIC-DESIGN-NOTES.md §Re-review brief — what changed under the rework, what is deliberately broken, what still needs a human decision"
affects:
  - Phase 0 plan 00-17 — task 1 writes shoot.mjs against this contract; task 3's pre-flight floor is 80
  - Phase 0 plan 00-11 — its reviewer reads the brief before re-running; its three by-eye judgements are still open
  - Phase 1 — inherits D-16-1, G-2's control geometry, G-13's announcer passthrough and /photos' 44px floor, all named in the brief as already-owned
  - Phase 7 — reads the screenshot record the contract defines, after the playground is gone

tech-stack:
  added: []
  patterns:
    - "A count that changes with the artefact set is DERIVED with its arithmetic shown; only the floor is asserted"
    - "Capture lists come from CANONICAL_IDS plus each route's STATES export, never from a hand-listed URL set"
    - "A capture policy lives in a contract, not inside an OPEN plan whose human approval is pending"
    - "Amending an open checkpoint plan is verified STRUCTURALLY (task count, checkpoint count, flags, fence clauses) rather than by reading the file back"

key-files:
  created:
    - .planning/phases/00-design-ideation/00-SCREENSHOT-CONTRACT.md
  modified:
    - .planning/phases/00-design-ideation/00-17-PLAN.md
    - .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md
  deleted: []

decisions:
  - "TASK 2 WAS EXECUTED, NOT DECLINED. The plan offered a decline path; the orchestrator carried explicit user authorisation for this specific amendment, on the reasoning that 'leave 00-17 unmodified' and 'its assertions break under six device classes' cannot both hold — the (1440|390) regex rejects any -344.png the moment one exists, which under the six-class policy is immediately."
  - "THE DERIVED TOTAL IS 88, NOT 84. 00-RESPONSIVE-CONTRACT.md §9 estimated ~84; that figure predates the rework and carried neither X-home-act2 nor the three non-bracket case studies. 88 is shown as arithmetic in the contract's §6 and supersedes 84. The FLOOR stays at 80 deliberately, so retiring one artefact does not fail a gate that has nothing to say about the design."
  - "THE X-CASE BRACKET PAIR IS NAMED BY MEASUREMENT: longest X-case-cairn at 692 words, shortest X-case-design-system at 597. This is a different pair than it would have been before plan 00-18 ran — design-system was a LONG-tier study that compressed ~60% while the old short tier compressed ~20%, so the shortest study today is a former long one. Anyone selecting the bracket from memory of the tiers picks the wrong pair."
  - "X-HOME IS THE ONE DOCUMENTED EXCEPTION TO FULL-PAGE CAPTURE, and it had to be, because both its states live at one URL. A full-page capture of /home renders the whole ~1058px document identically at both scroll positions, so state A and state B would come out BYTE-IDENTICAL while twelve files claimed a two-state design had been photographed. 00-17's assertion is 'at least one capture taller than 900px', so the exception does not weaken it and that assertion needed no amendment."
  - "X-HOME-ACT2 IS CAPTURED AT 1440 ONLY, because it is the same Act-2 composition X-home already carries at six classes THROUGH ONE SHARED COMPONENT. Six more captures would photograph one design twice. Kept at one capture because OQ-1 cites the id and it must resolve to an image."
  - "THE ADMIN STAYS AT 1440 ONLY, and the reason is stronger than 'the admin has one user'. Density resolves by POINTER TYPE, not width, and pointer has TWO values — compact is photographed at 1440 (fine), comfortable at 390 and 344 (coarse). Both ends of a two-valued axis are already on the record; class 5's ambiguous pointer resolves to one of the two photographed values and is not a third state. Six classes x 29 artefacts would be 174 files measuring a distinction that does not exist."
  - "THE PROSE THAT QUOTED THE CHANGED LITERALS WAS CHANGED WITH THEM — six clauses, beyond the four literals. A plan whose acceptance criterion says 35 while its command tests 80 is one an executor resolves by guessing. The '~35 admin artefacts' prose was deliberately NOT changed: 35 is still the correct artefact count (29 desktop + 6 phone); only the FILE floor moved."
  - "TASK 3'S PHOTO-FIELD SECTION IS SOURCED FROM 00-19-SUMMARY.md, THE SPECIFICATION, because 00-24-SUMMARY.md did not exist in either the worktree or the main tree when this plan ran — plan 00-24 was executing in parallel. The brief states this in the document itself and instructs the reader to check 00-24's SUMMARY for deviations before the review runs. No outcome of 00-24 was guessed at."
  - "00-11'S THREE BY-EYE JUDGEMENTS WERE LEFT UNANSWERED, deliberately: the 44px-vs-52px Playfair header, the 22px --ochre-d-strong cross-link and the 1080px Brevo band cap. They require a human eye and were deferred precisely because the artefacts under them moved. 00-11-PLAN.md is byte-identical to the base commit."
  - "THE REGISTER IS FIFTEEN ROWS, verified: 00-FINDINGS.md carries exactly G-1 through G-15. The brief says fifteen and adds a line telling the reviewer that any document saying sixteen is wrong. No G- row was added to make any count agree, and 00-FINDINGS.md is untouched."

metrics:
  duration: 11m
  completed: 2026-08-18
  tasks_completed: 3
  files_created: 1
  files_modified: 2
  commits: 3
---

# Phase 0 Plan 25: The Six-Class Screenshot Contract, 00-17's Stale Literals, and the Re-review Brief Summary

Wrote the screenshot record's capture policy as a contract across six device classes, brought plan
00-17's four stale viewport and count literals onto it without touching its checkpoint or its
deletion fence, and briefed the human reviewer at plan 00-11 on the artefacts that changed
underneath that plan.

## What this closed

`00-RESPONSIVE-CONTRACT.md` §9 multiplied the screenshot record from two viewports to six device
classes and stated plainly that three of plan 00-17's automated assertions break. Left as they
were, **plan 00-17 could not pass its own gate**: its filename regex `(1440|390)` rejects any
`-344.png` the moment one exists, and under the six-class policy that is immediately. The phase
exit would have failed for a reason with nothing to do with the design.

Three things were needed and all three now exist — a contract 00-17's task 1 can implement, an
amended gate it can pass, and a brief 00-11's reviewer can use.

## Task 1 — `00-SCREENSHOT-CONTRACT.md`

**Commit `ba91b25`.** 352 lines, eleven sections, written as a specification the capture script can
be checked against line by line rather than as a description of one.

| § | What it fixes |
|---|---|
| §1 | The six canonical sizes, and the viewport token defined as **the width alone** so it stays enumerable and the regex stays closed |
| §2 | The per-class capture policy, **with the reason for every asymmetry** |
| §3 | The filename grammar and the new regex, plus the note that the grammar is *validated, not parsed* |
| §4 | Mode rules — every admin file `-light-`, every public file `-dark-`, no exception at any class |
| §5 | The floor, `SHOTS >= 80`, stated as a floor rather than a target |
| §6 | The derived total, **88**, with the arithmetic shown |
| §7 | The derive-from-`CANONICAL_IDS`-and-`STATES` rule, and the omission it prevents |
| §8 | The amended `X-` inventory — eleven ids, with `X-case-long` and `X-case-short` recorded as **retired** |
| §9 | How `X-home`'s two states are captured, and why they are the one exception to full-page capture |
| §10 | Capture hygiene carried forward unchanged (fonts, network idle, `astro dev`, `finally` teardown) |
| §11 | What the contract does *not* do — it does not replan 00-17, does not edit `00-FINDINGS.md`, decides nothing by eye |

**The reasons are the load-bearing part.** Without §2's stated reasons, the next person captures 174
admin files to measure an axis with two values. The strongest version of that argument is in the
contract: the admin record **already photographs both ends of the density axis** — `compact` at
1440 where the pointer is fine, `comfortable` at 390 and 344 where it is coarse — so class 5's
ambiguous pointer resolves to one of two images that already exist rather than to a third state.

**The count is derived, not asserted.** §6 shows `29 + 12 + 18 + 12 + 12 + 3 + 1 + 1 = 88` and
tells the next reader to recompute it rather than transcribe it. The floor stays at 80 with eight
files of headroom, on the reasoning that a gate pinned to an exact count fails on the next correct
change.

**Four ids §9 could not resolve now have answers, each with a stated reason rather than a default:**

| Id(s) | Policy | Reason |
|---|---|---|
| `X-case-cairn` (692 words), `X-case-design-system` (597) | all six | The bracket on the measure, **named by measurement**. A different pair than before plan 00-18 compressed: `design-system` was a *long*-tier study that compressed ~60%, so the shortest study today is a former long one. |
| `X-case-hued`, `-momentum`, `-timeshift` | 1440 only | Inside the bracket. One capture each, as proof the template rendered their content. |
| `X-home` | all six, **both states** | The transition is the artefact. |
| `X-home-act2` | 1440 only | The same composition `X-home` already carries at six classes **through one shared component**. |

**The `X-home` capture method is verifiable rather than approximate**, and it is the same fact as
plan 00-22's height budget stated twice. The chrome above state A is a constant **131px**, and
state A's height is `calc(100svh - var(--hm-above))` — so state A occupies document y `131 →
100svh` and state B's top sits at exactly `100svh`. Scrolling by exactly one viewport height lands
on it. With a bare `100svh` it would not: state A would end at `131 + 100svh` and one viewport of
scroll would leave a 131px band of photographs on screen while the CSS looked correct.

## Task 2 — the 00-17 amendment. **EXECUTED, not declined.**

**Commit `fb359a6`.** The plan offered a decline path. It was not taken: the orchestrator carried
explicit user authorisation for this specific amendment, on the reasoning that *"leave 00-17
unmodified"* and *"its assertions break under six device classes"* cannot both hold.

**`git diff --stat` for the amendment, as the plan's output section requires:**

```
 .planning/phases/00-design-ideation/00-17-PLAN.md | 31 ++++++++++++++++-------
 1 file changed, 22 insertions(+), 9 deletions(-)
```

Thirteen of those 22 insertions are one additive `<context>` block. The substantive change is
**nine lines**.

**The four literals:**

| # | Where | Before | After |
|---|---|---|---|
| 1 | task 1 `[automated]` | `(1440\|390)` | `(344\|390\|768\|841\|1024\|1440)` |
| 2 | task 1 `[automated]` | `test "$SHOTS" -ge 35` | `-ge 80` |
| 3 | task 3 `[automated]` | `[ "$SHOTS" -ge 35 ]` | `-ge 80` |
| 4 | frontmatter `must_haves.artifacts` | `min_files: 35` | `min_files: 80` |

**Plus six prose clauses that quote them**, so no criterion disagrees with its own command: the
`wc -l` criterion, the criterion quoting the old regex, task 3's pre-flight step 1, task 3's
pre-flight acceptance criterion, and the `<verification>` line. The sixth is the one the plan
called out by name — the *"every `X-` id has both a `-dark-1440.png` and a `-dark-390.png`"* clause,
rewritten to the six-class form and made to **defer to `00-SCREENSHOT-CONTRACT.md` §2 and §8**
rather than restate the policy table inside a plan file.

**One addition, and it is additive only:** an `@` reference to the contract in `<context>`, plus a
short `<capture_policy_precedence>` block stating that where the contract differs from the
two-viewport rows still quoted in `<interfaces>` and in task 1's action, the contract wins. The
plan asked for the `@` reference *"so its executor reads the policy rather than inferring it"*; the
precedence line is what makes the reference load-bearing instead of decorative. Without it, 00-17
would tell its executor to capture `X-` at two viewports while testing for 80 files — the exact
guess the plan warns against. **No existing line of `<interfaces>` or task 1's action was
modified**, so the change stays visible.

**Deliberately NOT changed: the `~35 admin artefacts` prose** at two places in the plan. 35 is
still the correct **artefact** count — 29 desktop plus 6 phone. Only the **file** floor moved.

### Verified structurally, not by reading the file back

Per the plan's instruction — and its warning that `grep -c` counts **lines** not matches, which
nearly produced a false control result in plan 00-16 — every assertion was run as a separate
command, and the plan's own `&&` chain was decomposed so that a mid-chain failure could not hide
the assertions after it.

| Assertion | Result |
|---|---|
| lines containing the six-size regex | **2** (need ≥ 2) |
| lines containing `(1440\|390)` | **0** |
| lines containing `ge 35` | **0** |
| lines containing `min_files: 80` | **1** |
| `<name>Task` lines | **3** — task count unchanged |
| `type="checkpoint` lines | **1** — one checkpoint, as the file actually has |
| `^autonomous: false` | present |
| `wave: 12` · `depends_on: ["00-16"]` · `phase: 00-design-ideation` | all unchanged |
| admin-never-dark assertion `grep -E '^00-[SETOPR]-'` | present |
| full-page assertion (`taller than 900px`) | present |
| four-document existence check | present, 1 occurrence |
| **deletion fence, all seven clauses** | `git status --porcelain -- .playground` · `rm -rf .playground` · `test ! -d .playground` · `@astrojs/cloudflare` · `test ! -f package.json` · `test ! -d src/pages/api` · `test ! -f wrangler.toml` — **all present** |
| six review passes | present |
| `00-17-SUMMARY.md` | **does not exist** |
| `00-17-PLAN.md` in `ROADMAP.md` | present, and `[x] 00-17-PLAN.md` occurs **0** times |

**Plan 00-17 is still OPEN.** Its roadmap line reads `- [ ] 00-17-PLAN.md — … *(checkpoint)*`, and
`ROADMAP.md` is byte-identical to the base commit.

## Task 3 — the re-review brief

**Commit `7ab893d`.** 181 lines appended to `00-PUBLIC-DESIGN-NOTES.md` as `## Re-review brief`,
in six numbered sections. `00-11-PLAN.md` is **byte-identical to the base commit**, verified with
`git diff --quiet` against `aeb5c14`.

**Source, stated explicitly — and it is the fallback.** `00-24-SUMMARY.md` **did not exist** in
either the worktree or the main tree when this plan ran; plan 00-24 was executing in parallel. The
brief's photo-field section is therefore written from **`00-19-SUMMARY.md`, the schema
specification**, which is authoritative about *what* changes but is not evidence of what shipped.
The brief says so in its own text and instructs the reader to **check `00-24-SUMMARY.md` for
deviations before the review runs**. No outcome of plan 00-24 was guessed at.

**What the brief records:**

1. **Route map, before and after.** `/case/long` and `/case/short` gone; `/work/{id}` × 5 and
   `/home` new; `/work-recolour`, `/work`, `/photos`, `/home-act2` and `/` surviving. A reviewer
   following 00-11's list today looks for two routes that do not exist.
2. **What each of 00-11's tasks now reviews.** Task 2 was written as *"the two case-study templates
   against real drafted copy"* and is now **one template against five compressed studies** at
   500–700 words. The judgement it asks for is unchanged; the artefact is not. One consequence
   named plainly: **its step 6 — "does the short form read as a deliberate tier, or as a truncated
   long form" — has no subject left**, because there is no short form. The tier question is closed
   by construction; the measure question is not, and is now asked of five documents.
3. **What is newly in front of the eye**, each with the plan that built it: the Home two-state
   landing (00-22), the compressed studies with Cairn's changed decisions (00-18, 00-20), the
   real-layout photo board with per-photo focal points (00-23), the responsive shell (00-21), and
   **Ivory→Charcoal exception 3 landing on `/work`'s cards for the first time** — four `class=` →
   `className=` fixes and a border that moved `rgb(51,51,47)` → `rgb(114,114,104)`, which is why
   the cards may read differently from wave 6.
4. **What is deliberately still broken**, with owners, so review time is not spent re-finding it:
   **D-16-1** (AppBar brand link and Footer link list under 44px on every public route, painting
   their own geometry inside the design system — Phase 1 with G-2), **`/photos/` failing the 44px
   floor at five of six coarse classes** (wordmark 20px, `.ph-xlink` 30px, footer links 22.5px —
   design-system-owned, not closed by the rework), **G-13** (the announcer speaks record slugs and
   no position — Phase 1 owns the passthrough) and **G-15** (`check-bundle.mjs` exits 1 by design).
   **One stale figure corrected: D-16-1's AppBar brand link is 20px at 344, not 40px.**
5. **The three §10 items still confirm-or-override** — R-1, R-2, R-3 — with the point that all
   three were **acted on** by this rework and that acting on an item does not confirm it. R-2 is
   flagged as the one to answer deliberately, because overriding it means **Home's content has to
   shrink**, and that is a content decision no plan in this phase is authorised to take.
6. **A pointer to `00-SCREENSHOT-CONTRACT.md`**, so the reviewer at 00-17 knows the record is six
   classes and roughly 88 files rather than two viewports and 49.

**00-11's three by-eye judgements are left unanswered** — the 44px-vs-52px Playfair header, the
22px `--ochre-d-strong` cross-link and the 1080px Brevo band cap. The brief says in its opening
paragraph that they are the reviewer's to give and that their answers still belong in
`## Review outcome`, which 00-11's own task 3 writes.

## The register is fifteen rows

Verified rather than repeated: `00-FINDINGS.md` carries exactly **G-1 through G-15**, fifteen rows.
The "sixteen" figure was propagated by mistake through this phase and into two plans' gates. The
brief quotes **fifteen** and adds a line telling the reviewer that any document saying sixteen is
wrong.

**No `G-` row was added** to make any count agree — the same refusal plan 00-23 made, and correct
for the same reason. `00-FINDINGS.md` is byte-identical to the base commit.

## Deviations from Plan

**1. [Rule 3 - Blocking] The plan's Task 2 verify block was a single `&&` chain the sandbox rejects**

- **Found during:** Task 2 verification
- **Issue:** The verify block chains sixteen assertions with `&&`. The execution sandbox refuses
  `&&`-chained compound commands, and a chain would in any case mask which assertion failed and
  silently skip every assertion after the first failure.
- **Fix:** Decomposed into single commands, run in four batches. **Every assertion in the chain was
  executed** and each printed its own result; the results are tabulated above. Two additional
  batches asserted the fence clauses and structural invariants individually rather than relying on
  the chain's `grep -q` coverage.
- **Files modified:** none — verification only.

**2. [Rule 3 - Blocking] Base commit corrected before any work**

- **Found during:** worktree branch check, before Task 1
- **Issue:** The worktree branch was at `c49599e` (plan 00-21's completion), which is an **ancestor**
  of the expected base `aeb5c14`. `git merge-base HEAD aeb5c14` returned HEAD, confirming the
  worktree was behind rather than diverged.
- **Fix:** `git reset --hard aeb5c14` — a fast-forward, no commits discarded. Verified HEAD matched
  before touching a file.
- **Files modified:** none.

**3. [Rule 1 - Bug] An absolute path resolved into the main repo, not the worktree**

- **Found during:** Task 2, first read of `00-17-PLAN.md`
- **Issue:** The first Read used
  `/Users/…/portfolio/.planning/phases/00-design-ideation/00-17-PLAN.md` — the **main repo** path,
  not the worktree's. Editing through that path would have written plan 00-17's amendment into the
  main working tree, outside this agent's branch, while a sibling agent was working there.
- **Fix:** Caught before any Edit. Re-read from
  `…/.claude/worktrees/agent-ad69a1eb608b6ed68/.planning/…` and every subsequent Edit targeted the
  worktree path. `git status` confirms the only modified files are the three this plan owns.
- **Files modified:** none — no wrong-tree write occurred.

**4. [Rule 2 - Missing critical content] The `<capture_policy_precedence>` block, beyond a bare `@` reference**

- **Found during:** Task 2
- **Issue:** The plan asked for *"an `@` reference to the contract in 00-17's `<context>` so its
  executor reads the policy rather than inferring it"*, and forbade touching `<interfaces>` or task
  1's action — both of which still state the **two-viewport** policy. A bare `@` reference leaves
  00-17 instructing its executor to capture `X-` at two viewports while testing for 80 files. That
  is precisely the *"prose and command state different contracts, so the executor guesses"* failure
  the plan's own action text names.
- **Fix:** Added a short precedence block beside the `@` reference stating that the contract wins
  over the two-viewport rows, and that it changes nothing about mode, full-page capture or the
  deletion fence. **Additive only** — no existing line of `<interfaces>` or task 1's action was
  modified, so the change stays visible rather than being edited away.
- **Files modified:** `00-17-PLAN.md` (13 of the 22 inserted lines)
- **Commit:** `fb359a6`

## Threat mitigations, as executed

| Threat ID | Disposition | How |
|---|---|---|
| T-00-78 | mitigated | Four literals amended; the amendment verified by structure — task count 3, checkpoint count 1, `autonomous: false`, all seven fence clauses present — rather than by reading the file back. |
| T-00-79 | mitigated | The amendment was isolated to its own task and its own commit; the must-not-touch list was asserted item by item; `00-17-SUMMARY.md` does not exist and `[x] 00-17-PLAN.md` occurs 0 times in `ROADMAP.md`. |
| T-00-80 | mitigated | The contract's §7 states the derive-from-`CANONICAL_IDS`-and-`STATES` rule, names the specific omission it prevents (`X-home`, added three plans before the capture runs) and restates the fail-loud requirement and its negative control. |
| T-00-81 | mitigated | The brief's §4 lists D-16-1, `/photos`' 44px floor, G-13 and G-15 with owners, and corrects D-16-1's one stale figure. |
| T-00-82 | mitigated | §6 shows the arithmetic and states that 80 is a floor, not a target; the total is recomputed from §2's policy and explicitly supersedes §9's ~84. |

## What is NOT done, deliberately

- **`00-17-PLAN.md` is OPEN.** No SUMMARY, not ticked, checkpoint untouched.
- **`00-11-PLAN.md` is byte-identical** and its three by-eye judgements are unanswered.
- **`00-FINDINGS.md` is untouched.** No `G-` row added.
- **`STATE.md` and `ROADMAP.md` are untouched** — the orchestrator owns those.
- **Nothing 00-24 owns was touched** — no playground file, no `00-ADMIN-IA.md`, no
  `deferred-items.md`. This plan wrote no code and needed no playground; `.playground/` is
  gitignored and absent from this worktree, which is expected for a documentation plan.

## Self-Check: PASSED

Created files verified present:

- `FOUND: .planning/phases/00-design-ideation/00-SCREENSHOT-CONTRACT.md`
- `FOUND: .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md` (modified, `## Re-review brief` present)
- `FOUND: .planning/phases/00-design-ideation/00-17-PLAN.md` (modified, amendment verified structurally)

Commits verified present in `git log`:

- `FOUND: ba91b25` — docs(00-25): write the six-class screenshot contract
- `FOUND: fb359a6` — docs(00-25): amend plan 00-17's four stale viewport literals, and nothing else
- `FOUND: 7ab893d` — docs(00-25): brief the human reviewers on what the rework changed

Absence assertions verified:

- `ABSENT: 00-17-SUMMARY.md` · `ABSENT: 00-11-SUMMARY.md`
- `UNMODIFIED vs aeb5c14: 00-11-PLAN.md` · `00-FINDINGS.md` · `STATE.md` · `ROADMAP.md`
