---
phase: 04-photo-pipeline-actions-half
plan: 06
subsystem: pipeline
tags: [git, concurrency, pipe-05, criterion-4, retry, argv-guard, github-actions]

requires:
  - phase: 04-photo-pipeline-actions-half
    plan: 02
    provides: "src/lib/photo-pipeline.ts — PUBLISH_BRANCH ('main') and PUBLISH_RETRY_LIMIT (3), OD-7 A"
  - phase: 04-photo-pipeline-actions-half
    plan: 05
    provides: "scripts/lib/photo-record.mjs — serialiseManifest, used as the writer in case 0b (optional at author time, present at run time)"
provides:
  - "scripts/lib/git-publish.mjs — publishManifest with a bounded re-derive-and-retry, PublishConflictError, and observeGit"
  - "ALLOWED_GIT_SUBCOMMANDS / ALLOWED_GIT_CONFIG_KEYS / a 12-token FORBIDDEN_GIT_ARGS — the argv vocabulary T-04-22 and T-04-23 are asserted against"
  - "test/pipeline/concurrent-push.node.test.ts — criterion 4 demonstrated against a real bare repository, no mocks"
  - "04-CONCURRENCY-CONTRACT.md — the per-file blob-SHA obligation Phase 7's admin publish path must honour"
  - "MEASURED: publishManifest validates bytes, never semantics — validation belongs inside the rederive callback (04-09 step 9)"
affects: [04-08, 04-09, phase-07-admin-write-path]

tech-stack:
  added: []
  patterns:
    - "An observer that can WITNESS the real runner but cannot REPLACE it — a substitutable runner proves a prohibition about a runner that never ran"
    - "Argv-level prohibition with an anti-vacuity floor on the captured invocation count, plus a positive list of sanctioned argv asserted to pass"
    - "A structural half (subcommand allow-list, -c key allow-list, refspec shape, `add` shape) beside the token half, because a token list can be walked around"
    - "An optional cross-plan import held to the imported function's own defining property, so the fallback cannot silently drift"

key-files:
  created:
    - scripts/lib/git-publish.mjs
    - test/pipeline/concurrent-push.node.test.ts
    - .planning/phases/04-photo-pipeline-actions-half/04-CONCURRENCY-CONTRACT.md
  modified: []

key-decisions:
  - "OD-7 A implemented: commit directly to main, bounded re-derive-and-retry, never rebase, never force"
  - "Only a non-fast-forward rejection enters the retry path; auth patterns are matched FIRST so a credential failure fails the job (T-04-27)"
  - "publishManifest enforces the trailing-newline contract at the publish boundary and writes rederive's bytes verbatim — serialiseManifest stays the single writer"
  - "The plan's <behavior> ban on `reset --hard` was resolved in favour of its <action>: the reset to the fetched tip is sanctioned and asserted to PASS the guard"
  - "FORBIDDEN_GIT_ARGS extended from 5 tokens to 12 plus four structural checks, after the walk-through measured two ways past the original five"

metrics:
  duration: 25min
  tasks: 3
  commits: 5
  files-created: 3
  lines: 1690
  tests: "11 new cases · full suite 873/873 across 22 files"

completed: 2026-08-27
---

# Phase 04 Plan 06: Concurrency — the pipeline's half of PIPE-05 Summary

**A pipeline push that loses a race to a human now fetches, throws its own commit away, re-derives
the record against the manifest that won, and pushes again — bounded at three attempts, after
which it fails loudly naming the branch, the remote head and the attempt count; proven against a
real bare repository where a real foreign commit survives, by SHA reachability.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 of 3, no checkpoints (`autonomous: true`)
- **Commits:** `f16c6af` (RED), `3e58d1e` (GREEN), `35c0a44` (Task 2 hardening), `845eb09` (Task 3), plus this summary
- **Files created:** 3 (546 → 583 module lines, 941 test lines, 166 doc lines)

---

## The retry semantics, exactly

`publishManifest({ repoDir, branch, filePath, message, rederive, retryLimit, committerName, committerEmail })`

`branch` defaults to `PUBLISH_BRANCH` and `retryLimit` to `PUBLISH_RETRY_LIMIT`, both **imported**
from `src/lib/photo-pipeline.ts` — no literal `'main'` and no literal `3` appears in the module.

Per attempt:

1. Read `filePath`, assert it ends in **exactly one** `\n` (see below), else `PublishInputError`.
2. `git add -- <filePath>` — one path, never `-A`, never `.` (T-04-23).
3. `git -c user.name=… -c user.email=… commit -m <message> -- <filePath>` — the pathspec is
   repeated on `commit` so a pre-existing index entry cannot ride along. The identity comes from
   the caller, never from the runner's global config.
4. `git push origin HEAD:refs/heads/<branch>` — a plain fast-forward push. The remote's own refusal
   is the guard (T-04-22); the module never asserts anything about the remote itself.

On failure the stderr is **classified**, and the classification order is load-bearing:

- **auth patterns first** (`authentication failed`, `could not read Username`, `terminal prompts
  disabled`, `permission denied`, `repository not found`, `HTTP 401/403`, …) → throw
  `PublishGitError` **immediately**. T-04-27: three silent retries against a bad credential turns
  "your token is wrong" into "publish conflict after 3 attempts", and `CLAUDE.md`'s rule is that a
  missing configuration denies rather than degrades. `GIT_TERMINAL_PROMPT=0` and `LC_ALL=C` are set
  on every invocation — the first so a missing credential fails instead of hanging, the second
  because git translates the messages this classification reads.
- **conflict** = `Updates were rejected because…`, or `! [rejected]` **together with** one of
  `non-fast-forward` / `fetch first` / `stale info`. `! [rejected]` alone is deliberately not
  enough: git also emits it for "refusing to update checked out branch" and for tag clobbering,
  neither of which a re-derive can fix.
- **anything else** → throw. An unclassified git failure is not a conflict.

On a conflict:

5. `git fetch origin <branch>`; `git rev-parse FETCH_HEAD` → `remoteHead`.
6. If `attempts >= retryLimit` → **throw `PublishConflictError`** carrying `branch`, `remoteHead`,
   `attempts`. Otherwise:
7. `git reset --hard <remoteHead>` — the pipeline's own commit is **discarded, not rebased**.
8. Re-read `filePath` **from the fetched state** and call `rederive(fetchedContent)`.
9. Assert the returned bytes, write them **verbatim**, loop.

A `rederive` that **throws** propagates straight out: the loop aborts, the budget is not consumed,
nothing is pushed. That is how a validation failure is meant to be signalled.

`nothing to commit` is not an error: the module returns `{ changed: false }` with the current head,
because the desired state already holds.

**Why re-derive and not rebase** (P-5, written into the module header): a `git rebase` replays the
diff *"insert a record whose order is 40"* onto a tip where 40 is already taken. The textual merge
frequently **succeeds** and yields two records at rank 40 — it resolves `order` incorrectly even
when it works. Re-derive recomputes against the maxima that actually hold.

**Never logged:** the remote URL. `git remote` lists *names*; `git remote get-url` is never called,
and `redactRemotes()` scrubs anything URL-shaped from git's own stderr before it reaches an error
message (T-04-25). Attempt logs carry the branch and the SHA only, written with
`process.stdout.write` because `console.log` is swallowed by this repository's vitest setup.

---

## Case 0 — the argv assertion, and its anti-vacuity clause

**The witness.** `observeGit(fn)` installs an observer that is handed a frozen `{ argv, cwd }`
before each `execFile` spawn and whose return value is ignored. It **cannot replace the runner**,
deliberately: a test that injects a substitute runner proves a prohibition about a runner that
never ran, which is the vacuous shape this project's register already records nine times. A
throwing observer aborts the invocation it was called for, which is what makes case 0 a **live
guard across every case in the file** rather than one assertion at the end.

**The assertion has two halves.**

*Tokens* (`FORBIDDEN_GIT_ARGS`, exported from the module so 04-09 inherits the vocabulary):
`rebase`, `--rebase`, `--force`, `-f`, `--force-with-lease`, `--force-if-includes`, `--mirror`,
`-A`, `--all`, `-a`, `clean`, `filter-branch`.

*Structure* (in the test, because these are claims about a call's shape, not about a word in it):

| Check | Walks around what |
|---|---|
| `ALLOWED_GIT_SUBCOMMANDS` = rev-parse, remote, add, commit, push, fetch, reset | `git update-ref refs/heads/main <sha>` rewrites a ref with no push at all |
| `ALLOWED_GIT_CONFIG_KEYS` = user.name, user.email | `git -c remote.origin.push=+HEAD:refs/heads/main push origin` forces, invisibly |
| no `+`-prefixed token in a `push` argv | `git push origin +HEAD:refs/heads/main` forces with **no flag** |
| `git add` must be exactly `add -- <one path>` | `git add .` stages a whole runner working tree without ever writing `-A` |

**Why argv and not a source grep.** The module is required to call git through `execFile` with an
argv **array**, so its source reads `['reset', '--hard', ref]` and never the string `reset --hard`.
Running the plan's original grep against argv-style source matched nothing. And the plan *instructs*
a `reset --hard` to the fetched tip, so only an argv-level check can distinguish the sanctioned
reset from an unsanctioned force — case 0(a) asserts exactly that discrimination, listing eight
sanctioned argv (including `['reset','--hard','abc1234']`) that **must** produce zero findings.

**The anti-vacuity clause** lives in case 0(z), the terminal audit:

```
expect(observed.length).toBeGreaterThan(0);          // an empty capture must not pass
expect(violations).toEqual([]);                      // named, not counted
expect(census.get('push'))   > 0
expect(census.get('commit')) > 0
expect(census.get('fetch'))  > 0
expect(census.get('reset'))  > 0                     // the sanctioned reset ran, and passed
```

The four census clauses matter as much as the count: "no forbidden argv" is trivially true of a
module that never pushed. Measured on the green run:

```
[case 0z] 110 git invocations captured, 0 forbidden.
          verbs: add×15 commit×15 fetch×9 push×15 remote×11 reset×8 rev-parse×37
```

Proven able to fail: with the observer notification removed from the module, case 0(z) reports
`AssertionError: expected 0 to be greater than 0`.

---

## The newline proof, on the retry path

Case 0(b) does **not** re-serialise locally. It obtains the writer from
`scripts/lib/photo-record.mjs` — 04-05 landed mid-run, so the green run used the real function:

```
[case 0b] manifest writer in use: serialiseManifest — scripts/lib/photo-record.mjs (04-05)
          — reproduces the committed manifest byte-for-byte (59941 bytes)
```

If that module had not landed the test falls back to a stand-in, and **either writer is held to
`serialiseManifest`'s own defining property** in `beforeAll`: it must reproduce the real committed
`data/portfolio_images.json` byte-for-byte, or the suite throws before any case runs. A stand-in
that drifted from the real writer cannot satisfy that, so the fallback is not a hole.

The case forces a conflict, asserts **`attempts > 1` first** (so the claim is about the retry path
specifically), then reads the blob out of `origin` and asserts:

- `blob.at(-1) === 0x0a` and `blob.at(-2) !== 0x0a` — exactly one trailing newline;
- `bytesEqual(blob, encode(whatTheWriterReturned))` — **byte fidelity**. `publishManifest`
  re-serialises nothing, so the bytes `serialiseManifest` produced are the bytes that landed. That
  is what keeps `serialiseManifest` the single writer of manifest bytes rather than one of two.

```
[case 0b] retry blob = 636 bytes, tail "  }\n]\n", byte-identical to serialiseManifest
```

A second, permanent case plants the defect: a `rederive` that strips the newline is **refused**,
naming `serialiseManifest`, and `origin` does not move.

```
[case 0b planted] refused; origin/main unmoved at 287c200c
```

---

## Every gate, proven able to fail

Nine plants. **The interactive shell throughout was zsh 5.9** (`ps -p $$ -o comm=` → `/bin/zsh`,
`ZSH_VERSION=5.9`); the batched plant harness ran in **bash 5.3.9** and is named where it did.
Exit codes were captured as `if cmd; then R=0; else R=1; fi` — never `R=$?`, never
`${PIPESTATUS[0]}`, never `( cmd && R=0 || R=1 )`. Every plant was restored from a scratchpad copy
and verified with `diff -q`; **no `git checkout --`, `git stash`, `git reset --hard`,
`git worktree` or `git clean` was used in this working tree.**

| # | Gate | Plant → FAIL (named) | Nothing to check → FAIL | Correct code → PASS | Shell |
|---|---|---|---|---|---|
| G1 | case 0 argv prohibition | `push --force` → *banned token "--force" in: git push --force origin HEAD:refs/heads/main*, 9 cases red | observer never notified → *expected 0 to be greater than 0* | 110 invocations, 0 forbidden | bash 5.3.9 |
| G1w | …walk-through ×3 | `-f` / `+HEAD:refs…` / `add -A` → each named at the argv **after hardening**; **silent before** | — | sanctioned argv (incl. `reset --hard`) produce zero findings | bash 5.3.9 |
| G2 | case 0b bytes + newline | module re-serialises on write → *expected false to be true*, and the newline plant stops rejecting | no concurrent edit → *expected 1 to be greater than 1* | 636-byte blob, tail `}\n]\n` | bash 5.3.9 |
| G3 | case 2 rederive argument | read before the reset (P-5) → fails on the **argument**, `- Expected + Received` diff of the two manifests | no human commit → *expected 1 to be greater than 1* | `attempts=2`, human SHA is the tip's predecessor | bash 5.3.9 |
| G4 | case 5(iii) exhaustion | return instead of throw → *expected undefined to be an instance of PublishConflictError* | (covered by G1's empty capture, which also breaks the race hook) | `PublishConflictError` after 3 attempts | bash 5.3.9 |
| G5 | case 3 preconditions | both preconditions deleted → *expected error to be instance of PublishInputError* | — | fails by name, no push, no commit | bash 5.3.9 |
| G6 | Task 3 doc gate | `baseSha`→`basesha` FAIL; `409`→prose FAIL | empty file FAIL; file absent FAIL | PASS on the real doc | zsh 5.9 |
| RED | the spec without its module | module moved aside → *Cannot find module '../../scripts/lib/git-publish.mjs'*, vitest exit 1 | — | 11/11 after the module landed | zsh 5.9 |

### The walk-through found a real hole, and it was the sharpest finding of the plan

The review specified case 0's banned list as `rebase`, `--force`, `--force-with-lease`, `-A`,
`--all`. **Measured: that list does not hold.** Two patched modules force-pushed while the guard
stayed silent —

```
git push -f origin HEAD:refs/heads/main       -> guard silent, case 1 (clean push) GREEN
git push origin +HEAD:refs/heads/main         -> guard silent, case 1 (clean push) GREEN
```

— and the clobber surfaced only downstream, in case 2, as *"expected […] to include 'human-first'"*.
That is a **consequence**, not the operation, and criterion 4 asked for the operation. `-f` is
simply the short spelling of `--force`; the leading `+` is the force marker with no flag at all.

After hardening, both are caught at the argv and named:

```
[case 0] FORBIDDEN GIT ARGV — banned token "-f" in: git push -f origin HEAD:refs/heads/main (cwd …/pipeline)
[case 0] FORBIDDEN GIT ARGV — force refspec "+HEAD:refs/heads/main" in: git push origin +HEAD:refs/heads/main (cwd …/pipeline)
[case 0] FORBIDDEN GIT ARGV — banned token "-A"; git add must be exactly "add -- <one path>", got "-A" in: git add -A (cwd …/pipeline)
```

---

## Verbatim output — all cases, green run

```
[case 0b] manifest writer in use: serialiseManifest — scripts/lib/photo-record.mjs (04-05) — reproduces the committed manifest byte-for-byte (59941 bytes)
[case 0] FORBIDDEN GIT ARGV — banned token "rebase" in: git push origin rebase main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "--rebase" in: git push origin --rebase main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "--force" in: git push origin --force main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "-f" in: git push origin -f main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "--force-with-lease" in: git push origin --force-with-lease main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "--force-if-includes" in: git push origin --force-if-includes main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "--mirror" in: git push origin --mirror main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "-A" in: git push origin -A main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "--all" in: git push origin --all main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "-a" in: git push origin -a main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "clean" in: git push origin clean main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — banned token "filter-branch" in: git push origin filter-branch main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — force refspec "+HEAD:refs/heads/main" in: git push origin +HEAD:refs/heads/main (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — config injection "-c remote.origin.push=+HEAD:refs/heads/main" in: git -c remote.origin.push=+HEAD:refs/heads/main push origin (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — git add must be exactly "add -- <one path>", got "." in: git add . (cwd /nowhere)
[case 0] FORBIDDEN GIT ARGV — subcommand "update-ref" is outside this module's vocabulary in: git update-ref refs/heads/main deadbeef (cwd /nowhere)
[case 1] attempts=1 origin/main=6a609bb6c42ee97b51fe85c0504c012f0a18e043
[case 2] attempts=2 human=37c05705 tip=49a10489 predecessor-of-tip=37c05705 ids=seed-1,seed-2,seed-3,human-first,pipeline-contended
[case 0b] retry blob = 636 bytes, tail "  }\n]\n", byte-identical to serialiseManifest — scripts/lib/photo-record.mjs (04-05)
[case 0b planted] refused; origin/main unmoved at 287c200c
[case 3] missing-file: git ran rev-parse,rev-parse · missing-origin: git ran rev-parse,remote,rev-parse,remote — no push, no commit
[case 4] contended attempts=2, follow-up attempts=1, HEAD=main, worktree clean
[case 5 i] rederive threw on attempt 2 of a budget of 3; rederive calls=1; origin unmoved at d5ac8016
[case 5 ii] FINDING: publishManifest publishes a stale re-derive (attempts=2, ids=seed-1,seed-2,seed-3,pipeline-stale). Catching layer = the caller's rederive callback (04-09 step 9, astro sync INSIDE the loop). publishManifest itself catches nothing semantic — by design, recorded here so 04-09 cannot assume otherwise.
[case 5 iii] PublishConflictError: publish conflict: branch "main" moved under the pipeline on all 3 attempt(s); remote head is now 22b877f248ac308e32c2d0eb64f12db3e8fb7809. The pipeline pushed nothing.
[case 5 iii] origin authors=Akhil Saxena · ids=seed-1,seed-2,seed-3,human-race-1,human-race-2,human-race-3
[case 0z] 110 git invocations captured, 0 forbidden. verbs: add×15 commit×15 fetch×9 push×15 remote×11 reset×8 rev-parse×37
[teardown] removed 10 temp repositor(ies); nothing left in /var/folders/…/T

 Test Files  1 passed (1)
      Tests  11 passed (11)
```

Case 3's line is the one worth re-reading: on a missing file the module ran **`rev-parse` twice and
nothing else**; on a missing `origin`, `rev-parse, remote` twice. No `commit`, no `push`, budget
untouched — the failure is reported, not retried into.

---

## Case 5, and the layer that catches a stale re-derive — the answer the plan asked for

The plan asked this to be recorded *precisely*, because *"if the answer is 'none', the ordering in
04-09 is wrong"*. Measured:

- **A `rederive` that throws** aborts the loop on the spot. `rederive calls=1` against a budget of
  3, `origin` unmoved. Case 5(i).
- **A `rederive` that returns the stale manifest** — the walk-through — **is committed and pushed**.
  The shipped ids were `seed-1,seed-2,seed-3,pipeline-stale`: the human's record is gone from the
  file, and the pipeline's `order` was computed against maxima that no longer hold. Case 5(ii).

**So the catching layer is the `rederive` callback itself. `publishManifest` catches nothing
semantic — it does not parse the JSON and has no notion of `order`.** That is deliberate and is now
written into the module header as well as here. It confirms rather than contradicts 04-09, whose
step 9 already says *"Validation must be inside the retry loop, not only before it — the re-derived
record has different ranks and is therefore a different record."* **04-09 must not weaken that.**

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — missing critical functionality] `FORBIDDEN_GIT_ARGS` extended from 5 tokens to 12, plus four structural checks**
- **Found during:** Task 2, the walk-through step
- **Issue:** The review-specified list (`rebase`, `--force`, `--force-with-lease`, `-A`, `--all`)
  was measured to miss `git push -f`, `git push origin +HEAD:refs/heads/main`, `git add .`,
  `git -c remote.origin.push=+… push` and `git update-ref`. Case 1 stayed **green** while the module
  force-pushed. Since B6 deleted the source grep, case 0 is *"the only remaining control"* — a hole
  in it is a hole in T-04-22 and T-04-23 outright.
- **Fix:** token list extended in the module; subcommand allow-list, `-c` key allow-list,
  `+`-refspec check and exact `add` shape added in the test; re-measured, all now named at the argv.
- **Files:** `scripts/lib/git-publish.mjs`, `test/pipeline/concurrent-push.node.test.ts`
- **Commit:** `35c0a44`

**2. [Rule 2] The trailing-newline contract enforced in the module, not only asserted in the test**
- **Found during:** Task 1
- **Issue:** Case 0b asserts the committed blob; nothing would have *prevented* a future caller
  handing `publishManifest` newline-less bytes.
- **Fix:** `assertWriterContract` runs before staging on **every** attempt, naming
  `serialiseManifest` and quoting the offending tail. Bytes from `rederive` are written verbatim,
  so the module is a transport, not a second writer.
- **Commit:** `3e58d1e`

**3. [Rule 1] `Buffer` does not typecheck in this repository's ambient environment**
- **Found during:** Task 1, `npm run typecheck`
- **Issue:** With workers types alongside `@types/node`, the global `Buffer` resolves to a shape
  with no `.equals()` and a zero-argument `.toString()`. Three `astro check` errors in the test.
- **Fix:** `Uint8Array` + `TextDecoder`/`TextEncoder` throughout, with a `bytesEqual` helper; the
  reason is written beside `gitBytes` so nobody reintroduces `Buffer`.
- **Commit:** `3e58d1e`

**4. [Rule 3] Case 2's assertion order changed**
- **Issue:** The `rederive`-argument assertions sat *after* the merged-content checks, so the P-5
  plant failed on the consequence (`to include 'human-first'`) rather than on the argument.
- **Fix:** the argument assertions moved ahead of them; the plant now fails on the manifest diff
  handed to `rederive`, which is the sharper report.
- **Commit:** `35c0a44`

### Deliberate departures from the plan text

**5. Task 1 was committed as a genuine RED/GREEN pair rather than one commit.** The plan's B8 repair
moved the test into Task 1's `<files>` *"as the RED half of the pair"*, and Task 1 is `tdd="true"`.
So: `f16c6af` commits the spec alone and was **measured failing** (`Cannot find module
'../../scripts/lib/git-publish.mjs'`, vitest exit 1, zsh 5.9); `3e58d1e` commits the module. The
gate sequence `test(…)` → `feat(…)` is present in the log. Task 2 and Task 3 are one commit each.

**6. The plan's `<behavior>` ban on `reset --hard` contradicts its own `<action>`, and was resolved
in favour of the `<action>`.** See "Contradictions" below.

---

## Contradictions found in the plan or research

1. **The plan bans and mandates the same operation.** Task 1 `<behavior>` line 129: *"never calls
   `reset --hard` on a branch it did not create"*. Task 1 `<action>` step 2 (line 150): *"reset the
   local branch to the fetched tip"*. Resolved in favour of the `<action>` and of the review's
   own banned-token list, which omits `--hard`: the reset is **sanctioned**, and case 0(a) asserts
   `['reset', '--hard', 'abc1234']` produces **zero** findings, because a gate that banned it would
   ban the design rather than the defect.

2. **`PROJECT.md:127` is the wrong line.** The plan's `<objective>` and Task 3 both cite
   `PROJECT.md:127` for *"HEAD-comparison is too strict"*. Measured: that text is at
   **`PROJECT.md:122-126`**; line 127 is inside item 6, *"The documented pipeline is dead code"*.
   The related risk is at `PROJECT.md:108`. The contract document cites the correct lines.

3. **The legacy ref-PATCH refusal is a 422, not a 409.** `04-RESEARCH.md` §9 and the plan's
   `<interfaces>` say a commit landing between the ref read and the PATCH *"is still refused; that
   narrow last line of defence is what the legacy route mapped to 409"* — true, but the wording
   invites reading GitHub as returning 409. Measured on the branch:
   `src/app/api/deploy/route.ts:192` reads `if (updateRefRes.status === 422)` and *then* returns
   409 to the client. The 409 is the route's, not GitHub's. Recorded in the contract.

4. **The review's case-0 banned list is insufficient**, measured — see Deviation 1. This is the one
   that matters: it was specified as *"the only remaining control"* and it did not hold.

5. **The suite size in `04-VALIDATION.md` is stale.** It records *"484 across 12 files"*; the
   briefing said 651/15; measured at the end of this plan, **873 across 22**. Wave 2 is landing
   underneath, so the number is a moving target rather than an error — but nothing should assert on
   it.

6. **`package.json` `engines.node` understates the real floor.** `scripts/lib/git-publish.mjs`
   imports `../../src/lib/photo-pipeline.ts` **with its `.ts` extension** (as does 04-05's
   `photo-record.mjs`), which needs Node's unflagged type stripping — documented as landing in
   **22.18.0**, while `engines.node` says `>=22.12.0`. Not a live risk: `.nvmrc` pins **22.22.3**
   and all three workflows use `node-version-file: .nvmrc`, so CI and the runner are safe. It is a
   contributor-machine hazard only. **Not fixed here** — `package.json` is 04-04's file and 04-04
   was running concurrently. Logged to `deferred-items.md`.

---

## Threat Flags

None. Every mitigation in the plan's register (T-04-22 … T-04-27, T-04-SC) is implemented and
asserted; T-04-22 and T-04-23 are asserted more strictly than specified, for the reason in
Deviation 1. No new network endpoint, auth path, file-access pattern or schema change was
introduced. This plan installs nothing — no `npm install` was run.

## Known Stubs

None.

## Requirements

- **PIPE-05** — the pipeline's half is complete and proven; the admin's half is specified in
  `04-CONCURRENCY-CONTRACT.md` and belongs to Phase 7. **Not marked complete**, because the
  requirement spans both sides.
- **Criterion 4** — met, without the admin: a foreign commit to `data/portfolio_images.json`
  survives a concurrent pipeline push, proven by SHA reachability, and exhaustion is a loud named
  failure.

## Verification

| Command | Exit |
|---|---|
| `npx vitest run --project integration test/pipeline/concurrent-push.node.test.ts` | 0 — 11/11 |
| `npm test` | 0 — **873 passed, 22 files** |
| `npm run check` | 0 |
| `npm run typecheck` | 0 |
| `npm run gate:content` | 0 |
| Task 3 doc gate (`test -s` && `grep -q baseSha` && `grep -q 409`) | 0 |

## Self-Check: PASSED

Files claimed → found on disk and tracked by git:
`scripts/lib/git-publish.mjs`, `test/pipeline/concurrent-push.node.test.ts`,
`.planning/phases/04-photo-pipeline-actions-half/04-CONCURRENCY-CONTRACT.md`,
`.planning/phases/04-photo-pipeline-actions-half/04-06-SUMMARY.md`,
`.planning/phases/04-photo-pipeline-actions-half/deferred-items.md`.

Commits claimed → found in the log: `f16c6af`, `3e58d1e`, `35c0a44`, `845eb09`, `18c587a`.

`git diff --diff-filter=D` across all five: **no file deletions**. All five authored
`Akhil Saxena <saxena.akhil42@gmail.com>`; no AI attribution in any message.

`STATE.md` and `ROADMAP.md` were deliberately **not** touched, per the execution brief — four
plans in this wave were writing concurrently.

## TDD Gate Compliance

`type: execute`, Task 1 `tdd="true"`. Both gate commits are present and in order:
**RED** `f16c6af` (`test(04-06)`, measured failing) → **GREEN** `3e58d1e` (`feat(04-06)`). No
REFACTOR commit; `35c0a44` is Task 2's hardening, which changes behaviour and is correctly not
labelled `refactor`.
