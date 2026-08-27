---
phase: 04-photo-pipeline-actions-half
plan: 09
subsystem: infra
tags: [r2, wrangler, github-actions, astro, sharp, git, pipeline, idempotence]

requires:
  - phase: 04-02
    provides: 'photo-pipeline.ts — keys, URLs, ids, VARIANTS, OBJECT_CACHE_CONTROL, DISPATCH_INPUTS, PUBLISH_BRANCH/RETRY_LIMIT'
  - phase: 04-03
    provides: 'verify-photo-urls.mjs — liveness over HEAD, --only <id> with an unknown id as a refusal'
  - phase: 04-05
    provides: 'photo-record.mjs — buildRecord, upsertRecord (preserves order/categoryOrder), serialiseManifest'
  - phase: 04-06
    provides: 'git-publish.mjs — publishManifest, bounded re-derive-and-retry, PublishConflictError'
  - phase: 04-07
    provides: 'photo-derive.mjs — variants, watermark, EXIF, capture date, upload descriptors, MAX_SOURCE_BYTES'
  - phase: 04-08
    provides: 'dispatch-input.mjs + process-photos.yml — the validated dispatch surface'
provides:
  - 'scripts/process-photo.mjs — the ten-step job, with the side-effect line written into the source between steps 6 and 7'
  - 'scripts/lib/r2.mjs — R2 get/put/delete over `wrangler r2 object`, failing closed at module init'
  - 'scripts/lib/r2-fail-closed.probe.mjs — T-04-47''s only executable enforcement, with a five-fixture self-test'
  - 'the workflow''s processing step, with every credential scoped to it and persist-credentials: false on the checkout'
  - 'test/pipeline/partial-failure.node.test.ts — ten cases, a failure injected at every boundary'
  - 'workflow-contract rules A12 (secret scoping by name), A13 (persist-credentials), A14 (the entrypoint is invoked and exists)'
affects: [04-10, phase-05-gallery, phase-07-admin]

tech-stack:
  added: []
  patterns:
    - 'Validate-before-side-effects: steps 1-6 are read-only and the boundary is a comment in the source'
    - 'Once-only token: the staged object is deleted LAST, so a re-run of a completed job exits 0 having done nothing'
    - 'Substitute at the module boundary in a git clone sandbox, not with a mocking framework'
    - 'Enumerate the permitted shape, never a count: workflow secrets are checked against a named allow-list'

key-files:
  created:
    - scripts/process-photo.mjs
    - scripts/lib/r2.mjs
    - scripts/lib/r2-fail-closed.probe.mjs
    - test/pipeline/partial-failure.node.test.ts
    - test/pipeline/fixtures/fake-r2.mjs
    - test/pipeline/fixtures/verifier-shim.mjs
  modified:
    - .github/workflows/process-photos.yml
    - test/pipeline/workflow-contract.unit.test.ts
    - .planning/phases/04-photo-pipeline-actions-half/deferred-items.md

key-decisions:
  - 'The slug comes from the staged file name, not the title — this plan owns it, because no module in the phase claimed it and a re-dispatch must reproduce the same id'
  - 'Step 8 probes with HEAD via the real frozen mode table, asserted at run time rather than grepped'
  - 'astro sync runs inside the retry loop as well as at step 6, and case 6 counts three gate runs to hold it there'
  - 'persist-credentials: false on the checkout, or the GITHUB_TOKEN extraheader outranks the App token and the push triggers no CI'
  - "workflow-contract's 'exactly one secret-bearing step' is replaced by a named allow-list rather than bumped to two"
  - 'The step-9 failure path deliberately does NOT restore the manifest; steps 7 and 8 do'

patterns-established:
  - 'Anti-vacuity by injected-throw assertion: every negative case asserts its defect fired, not merely that nothing changed'
  - 'A probe with a --self-test that runs its own checker against synthetic honest and defective modules'
  - 'Sandbox overlay of working-tree changes, reported rather than inferred, with a missing source as a throw'

requirements-completed: [PIPE-01, PIPE-03, PIPE-04]

duration: 5h 5m
completed: 2026-08-28
---

# Phase 4 Plan 09: The Composed Pipeline Summary

**One staged upload becomes one committed, live photograph in ten steps, with nothing above step 7
having a side effect — proven by injecting a failure at every boundary and measuring what survived,
and by planting eight defects and watching each one turn the suite red.**

## Performance

- **Duration:** 5h 5m (including one machine-sleep interruption after Task 1's first file)
- **Started:** 2026-08-27T23:00Z (approx.)
- **Completed:** 2026-08-28T00:55Z
- **Tasks:** 3 of 3
- **Files created:** 6 · **Files modified:** 3
- **Tests:** 942/942 across 24 files → **957/957 across 25 files**

## The composed step order

```
 1  read the dispatch inputs and validate them          [nothing read, nothing written]
 2  GET the staged object out of R2                     [read-only]
 3  sharp: 4 variants + a 40px thumb; EXIF              [pure, in memory]
 4  hash each variant -> compose keys and URLs           [pure]
 5  read the manifest, build the record, upsert, write   [local write to the checkout only]
 6  astro sync — the whole content gate                  [exit 1 stops the job]
 ---------------- NOTHING ABOVE THIS LINE HAS A SIDE EFFECT ----------------
 7  PUT the four variants to R2
 8  liveness: every URL in the new record, 200 image/webp
 9  git commit + push, with the bounded re-derive-and-retry loop
10  DELETE the staged object                            [the once-only token]
```

The line is a comment in `scripts/process-photo.mjs`, sitting exactly where it falls, so an edit
that moves an upload above it is visibly wrong rather than subtly wrong. It is repeated in the
workflow's header.

Ten distinguishable outcomes, one final line naming which: `PUBLISHED` (0), `STAGED_ABSENT` (0),
`INTERNAL` (1), `INPUTS_REJECTED` (2), `STAGED_READ_FAILED` (3), `DERIVE_FAILED` (4),
`GATE_REJECTED` (5), `UPLOAD_FAILED` (6), `LIVENESS_FAILED` (7), `PUBLISH_CONFLICT` (8),
`PUBLISH_FAILED` (9). `gh run view` is the only diagnostic surface, so every case below asserts the
code, not merely "non-zero".

## Where `astro sync` sits relative to the retry loop, and why

**Inside it, and also before it.** `applyAndGate()` is called at step 6 and again from within the
`rederive` callback passed to `publishManifest`.

Two reasons, both measured by 04-06 rather than assumed:

1. **`publishManifest` validates bytes, never semantics.** It checks that the re-derived content is
   a string ending in exactly one newline. 04-06 measured that a `rederive` returning *stale*
   content is committed and pushed, silently discarding a concurrent human record. The catching
   layer has to be `rederive` itself.
2. **The re-derived record is a different record.** `order` and `categoryOrder` are computed from
   the maxima in the manifest that actually won, so a retry produces ranks the step-6 run never
   saw. A gate hoisted out of the loop would let a retry publish a manifest that never passed it.

This is held by an assertion, not by prose: case 6 counts `content set: PASS` occurrences in the
job's output and requires **three** — one at step 6, one per re-derive. Planting the hoist (removing
`applyAndGate` from `rederive`) produced `expected [ 'content set: PASS' ] to have a length of 3 but
got 1`.

`rederive` restores the fetched bytes before throwing, so a rejection inside the loop leaves the
checkout clean rather than holding a record the gate refused.

## The HEAD probe at step 8

Step 8 spawns `node scripts/verify-photo-urls.mjs <manifest> --only <id>` with an argv array and
**no `--cache`**, so the method comes from 04-03's frozen `REQUEST_MODES` table — the one whose
runtime invariant makes the module refuse to load if it is edited into a mode that asserts on
`cache-control` over HEAD.

The plan's constraint is honoured for the reason it gives: a `HEAD` returns `cf-cache-status:
DYNAMIC` and therefore reaches R2, while a `GET` can be answered `HIT` by the edge and so cannot
distinguish *the object exists* from *the object was cached before the upload silently failed*.
Step 8 runs immediately after writing a mutable key, which is the one place in this phase where
that difference decides whether a record with no bytes behind it gets committed.

**Asserted at run time, not grepped.** The verifier shim records `mode.method` and `mode.name` from
the real table into the fake bucket's log, and case 8 asserts `HEAD` / `liveness` / `--only <id>` /
no `--cache`. Planting `--cache` in the entrypoint produced `expected 'GET' to be 'HEAD'`.

## The fail-closed probe result

`node scripts/lib/r2-fail-closed.probe.mjs` — **PASS**:

```
  declared:   REQUIRED_ENV = [CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID]
  discovered: enforced at import = [CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID]
  checked:    2 variable(s), each re-seeding all 2 and emptying exactly one
```

It reads `REQUIRED_ENV` from the module rather than carrying a list, because the set differs between
OD-5's two branches. It **refuses** if that array is empty. For each name it re-seeds all of them,
empties exactly that one, cache-busts the import, and requires a throw whose message names that
variable — the shape the W2 repair called for, and the reason it matters is that this machine has
no `R2_*` or `CLOUDFLARE_*` set at all, so a probe that accepted any `/CLOUDFLARE_/`-shaped message
would pass because some *other* variable was absent.

It also **discovers** the enforced set from the module's own refusals and compares it to the
declared one, so a variable enforced but not declared is a finding.

`--self-test` runs the checker against five synthetic modules (honest, fail-open, vague,
vague-on-empty, empty-list) and requires each to behave as stated. The `honest` case is what stops
a checker that always reported FAIL from satisfying the other four.

## Every gate proven able to fail

Interactive shell for all local proofs: **zsh** (`echo $0` → `/bin/zsh`). The Actions steps and the
test's git hook are **bash**, spelled with an explicit `#!/usr/bin/env bash`. No `${PIPESTATUS[0]}`,
no `R=$?` after a pipe, and every proof used `if cmd; then R=0; else R=1; fi`.

### Gate 1 — `scripts/lib/r2-fail-closed.probe.mjs` (shell: zsh)

| Step | What was done | Result |
|---|---|---|
| Plant the defect | module-init `assertCredentials()` commented out | **FAIL**, naming both variables: *"CLOUDFLARE_API_TOKEN was emptied and … imported CLEANLY — it fails OPEN"* |
| Plant a second | the refusal message no longer names the variable | **REFUSED**, naming the cause: *"refused to import naming CLOUDFLARE_API_TOKEN, which is ALREADY seeded"* |
| Nothing to check | `REQUIRED_ENV = []` | **REFUSED**: *"an empty or absent list makes every per-variable check loop over nothing"* |
| Pass on correct code | restored | **PASS**, exit 0, `git status` clean |
| Walk-through | five self-test fixtures, incl. one that names the variable when ABSENT and goes vague only when EMPTY | all five behave as stated |

### Gate 2 — `test/pipeline/workflow-contract.unit.test.ts` (shell: zsh)

Four new planted-defect cases, each required to produce its own rule id and nothing else:

| Plant | Rule | Result |
|---|---|---|
| the App private key duplicated into the processing step | A12 | FAIL — *"appears in 2 steps"*, naming the secret |
| `secrets.SOME_OTHER_TOKEN` introduced | A12 | FAIL — *"is referenced but is not in SECRET_SCOPES"* + *"CLOUDFLARE_ACCOUNT_ID … appears in no step"* |
| `persist-credentials: false` deleted | A13 | FAIL — *"no new workflow run"* |
| `node scripts/process-photo.mjs` replaced by an echo | A14 | FAIL — *"a green run that published nothing"* |

Nothing to check: the pre-existing `loadWorkflow` refusals for a missing and an empty workflow still
pass. Pass on correct code: **29/29**.

### Gate 3 — `test/pipeline/partial-failure.node.test.ts` (shell: zsh)

Eight defects planted in `scripts/process-photo.mjs`, one at a time, each restored afterwards:

| Plant | Case | Result |
|---|---|---|
| A — the step-6 gate call deleted | 3 | FAIL `expected 7 to be 5` (and the `--only` refusal caught the unwritten manifest) |
| B — the step-6 restore deleted | 3 | FAIL on manifest byte-identity |
| C — step 8's exit code ignored | 5 | FAIL `expected +0 to be 7` — the forbidden direction would have shipped |
| D — `--cache` added to step 8 | 8 | FAIL `expected 'GET' to be 'HEAD'` |
| D (first attempt) | 8 | **invalid plant** — a trailing `//` comment inside the call made it a SyntaxError; it proved nothing and was redone |
| E — `applyAndGate` removed from `rederive` | 6 | FAIL `expected [ 'content set: PASS' ] to have a length of 3 but got 1` |
| F — step 10 moved above step 9 | 6 | FAIL — one delete recorded where zero were required |
| G — an import renamed so the entrypoint cannot load | **all 10** | **all 10 FAIL** |

**G is the "given nothing to check" step, and it is the most important row in this table.** With an
unloadable entrypoint every case fails, including the negative ones — so no case is satisfiable by a
job that never ran. Case 9 fails in 0 ms via its own explicit refusal, because case 8 never produced
a post-run count to compare against.

Pass on correct code: **10/10**, and `npm test` **957/957 across 25 files**.

## The nine (ten) cases

| # | Case | Exit | Injected throw fired | Puts | Deletes | Tip moved |
|---|---|---|---|---|---|---|
| 8 | happy path | 0 `PUBLISHED` | — (none) | 4 | 1 | **yes** |
| 9 | re-run after success | 0 `STAGED_ABSENT` | — (`get-miss` recorded) | 0 new | 0 new | no |
| 1 | throw in step 2 (staged GET) | 3 | `get` | 0 | 0 | no |
| 2 | step 3 derive refuses undecodable bytes | 4 | staged read happened; deriver named it | 0 | 0 | no |
| 3 | step 6 gate rejects (RI-2) | 5 | gate output names RI-2 **and `checked: 40 photo(s)`** | 0 | 0 | no |
| 4 | step 7 dies after two of four puts | 6 | `put#3` | **2** | 0 | no |
| 5 | puts accepted, nothing persists; step 8 sees 404 | 7 | 4 puts, 0 objects, verifier HEAD → 404 | 4 | 0 | no |
| 6 | step 9 exhausts the retry budget | 8 | 3 attempts, 2 re-derives, **3 gate runs** | 4 | 0 | no |
| 6b | rival lands *during* the push (lost CAS) | 9 | rival commit on origin, ours absent | 4 | 0 | rival only |
| 7 | step 10 delete fails | **0** `PUBLISHED` | `delete` | 4 | 0 | **yes** |

- **The forbidden direction is impossible.** In cases 4, 5, 6 and 6b the manifest is byte-identical
  and the branch tip is unmoved. No path commits a record whose objects are not in the bucket.
- **The permitted direction is demonstrated and named.** Case 4 leaves exactly two orphan objects and
  the job's own output says so; case 5 and case 6 leave four. All are unreferenced and swept by the
  staging lifecycle rule.
- **Criterion 2** is case 9: the staged object is gone, the job exits 0, `manifest.length` is
  unchanged *against the value case 8 measured*, and zero new puts are recorded.

## Deviations from plan

### Auto-fixed and auto-decided

**1. [Rule 2 — missing critical functionality] The slug had no owner, so this plan took it.**
`deriveAssets` requires a `slug`, `buildRecord` reads `assets.slug`, `photoIdFor` joins it — and no
module or decision in Phase 4 says where it comes from. `slugFromStagingKey()` derives it from the
staged file name, with the reasoning in the source: the id must survive a repair re-dispatch (a
title-derived slug would orphan the record a re-dispatch was meant to fix), `assertStagingKey` has
already constrained the key to ASCII, and all 39 committed ids are `<category>-<file stem>`.
*Commit: 1a253ba.*

**2. [Rule 2] `persist-credentials: false` added to the checkout step.** Without it
`actions/checkout` leaves an `http.https://github.com/.extraheader` carrying `GITHUB_TOKEN`, and an
Authorization header outranks credentials in a remote URL — so the pipeline's push would *look* like
it used the App token and would in fact use `GITHUB_TOKEN`, which GitHub documents as creating no
new workflow run. The photograph would land on `main`, run no CI and never deploy: precisely the
failure OD-8 A chose an App token to avoid, arriving silently on a green run. Rule A13 now holds it.
*Commit: 1a253ba.*

**3. [Rule 2] The two Cloudflare values are whitespace-stripped, copying `deploy.yml`.** That file
records a measured incident: this project's first deploy died on `Invalid account ID "***\n"` from a
trailing newline in a pasted secret. Here the same byte would surface at step 2 as *"the staged
object could not be read"*. *Commit: 1a253ba.*

**4. [Rule 1 — bug] The step-7 failure path now restores the manifest.** The plan's case 4 requires
byte-identity after a partial upload, and step 5 has already written the candidate by then. Steps 7
and 8 restore it; **step 9 deliberately does not**, because `publishManifest` may already have
committed or run `reset --hard`, and writing over that would leave the tree dirty against its own
HEAD. *Commit: 1a253ba.*

**5. [Rule 1 — bug, in this plan's own test harness] The sandbox overlay was silently skipping every
file.** `git()` trims its output, which eats the leading space of `git status --porcelain`'s
`" M path"`, so `line.slice(3)` produced `cripts/process-photo.mjs`, `existsSync` was false, and a
`continue` swallowed it. **Measured consequence: all seven planted defects were invisible and the
suite stayed green while testing the last committed entrypoint instead of the edited one.** Fixed by
parsing untrimmed output and by making a missing overlay source a **throw** — the `continue` is what
turned a one-character parse bug into a suite that could not fail. *Commit: c460d62.*

**6. [Rule 1 — bug] `execFileSync` discards stderr on a zero exit,** so case 7 could not see the
warning it exists to assert. Switched to `spawnSync`, which captures both streams on both paths.
*Commit: c460d62.*

**7. [Rule 1 — bug] `npm run typecheck | tail` reports `tail`'s exit status.** `astro check` had been
returning **1 error** behind a green-looking pipeline: `worker-configuration.d.ts` augments
`NodeJS.ProcessEnv` with `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` as *required*, and the
deliberately starved child environment does not have them. Cast, with the reason written down —
naming those two variables to satisfy the type would hand the pipeline credentials it has no
business seeing. Every gate was then re-verified with `if cmd; then …`. *Commit: b49ec6b.*

**8. [Rule 1 — bug, in the test's own hook] The rival git hook inherited `GIT_DIR`/`GIT_INDEX_FILE`.**
Git exports them to every hook, so a hook that `cd`s elsewhere and runs `git add` is still operating
on the *calling* repository's index. It corrupted the work clone and the job died on `error: invalid
object 100644 … for 'README.md'` — which looks like a pipeline bug and is a test bug. The hook now
unsets git's environment first. *Commit: c460d62.*

### Contradicting the plan, the research or the validation contract

**A. `workflow-contract`'s "exactly one secret-bearing step" could not survive this plan, and was
replaced rather than weakened.** The plan says the contract test "must still pass unchanged". It
cannot: the assertion is `expect(carriers).toHaveLength(1)`, and the processing step legitimately
needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Bumping the `1` to a `2` would have been
the weakening it looks like — `2` is satisfied by *any* two steps holding *any* secrets, including
the App private key sitting in the step that shells out to `node`. So the count is gone and rule
**A12** enumerates the permitted shape instead: every `secrets.X` must be one of four declared
names, each must appear in exactly one step, that step must be the one declared for it, and every
declared name must appear at least once. This is `04-VALIDATION.md` hazard 14's own lesson —
*enumerate the permitted shape, do not enumerate forbidden spellings* — applied to the assertion
that hazard 14 did not reach. The other 23 assertions are untouched; the file is now 29 tests.

**B. The plan's case-3 injection (RI-1 via an unresolvable category) is UNREACHABLE, and that is a
good property.** `scripts/lib/dispatch-input.mjs` validates `category` against
`data/site_config.json` at step 1, and its `alt` rules are a strict superset of `PhotoSchema`'s. No
dispatch that survives step 1 can build a record the content gate refuses. Case 3 plants **RI-2** in
the content set instead (a declared category no photograph uses) and additionally asserts
`checked: 40 photo(s)` in the gate's own output — which proves the candidate really was written and
really was read before being rolled back. Without that, "byte-identical" would also be satisfied by
a job that never wrote the file at all.

**C. A second, real concurrency rejection exists that `git-publish.mjs` does not classify as a
conflict.** Building case 6 surfaced it: if the rival lands *during* the push rather than before it,
git has already computed the ref's expected old value and the remote answers `cannot lock ref
'refs/heads/main': is at <new> but expected <old>` / `! [remote rejected] … (failed to update ref)`.
`CONFLICT_REASONS` matches `non-fast-forward|fetch first|stale info`, none of which appear, so the
job exits **9 without retrying** where a re-derive would have worked. The outcome is safe — nothing
committed, bytes orphaned, token unspent, re-dispatch repairs — so it is **pinned by case 6b and
deferred**, not fixed inside this plan: conflict classification is `git-publish.mjs`'s central
decision and 04-06's header argues at length for matching the reason rather than the `! [rejected]`
marker. Case 6b goes red, by name, the day someone changes it.

**D. `wrangler r2 object` defaults to LOCAL storage, and the omission is invisible.** Measured in the
installed wrangler 4.123.0 bundle (`src/utils/is-local.ts`): `isLocal(args, defaultValue = true)`
returns **true** when neither `--local` nor `--remote` is given. A pipeline missing the flag would
"get" from an empty miniflare directory, find nothing, and — because an absent staged object is
deliberately exit 0 — report a clean no-op for every dispatch forever. `--remote` is therefore
appended by the single argv composer and re-checked immediately before every spawn.

**E. `scripts/lib/dispatch-input.mjs` is binary to `grep`.** It joins on a NUL written as a raw byte,
so `file` reports `data`, `grep -c export` exits 1 printing nothing, and `grep -a -c export` returns
9. Every `grep`-based control over `scripts/lib/*.mjs` reports a clean pass over a file it never
read — the third appearance of this shape in the phase after hazard 20's two `! grep` guards.
Logged, not fixed (04-08's file). It is contagious: pasting the entry into `deferred-items.md`
turned *that* file binary too, which was caught and stripped.

## Threat register — dispositions discharged

| Threat | How |
|---|---|
| T-04-42 (decompression bomb) | `MAX_SOURCE_BYTES` checked on the downloaded length at step 2, before sharp, reading the deriver's own constant |
| T-04-43 (a record with no bytes) | step 8, plus case 5 asserting the branch tip does not move; plant C proves the assertion fires |
| T-04-44 (a rejected record left in the tree) | step 6 restores before throwing; case 3 asserts byte-identity; plant B proves it fires |
| T-04-45 (child process spawning) | every child spawned with an argv array; no `shell: true` anywhere; the workflow passes inputs via `env:` |
| T-04-46 (credential in a log) | minimal child environment, `redactCredentials()` on captured output, status + message + key only |
| T-04-47 (fail-open on a missing credential) | module-init assertion + `r2-fail-closed.probe.mjs`, proven able to fail four ways |
| T-04-48 (indistinguishable failure) | ten named outcomes, one final line, each asserted by exit code in the suite |
| T-04-49 (R2 rate limits) | one in-flight write per key, 1 s spacing per key, bounded retry on transient failures only |
| T-04-09 (`private/*` masters) | unchanged: `putVariant` runs `parsePublishedKey`, so such a key is unwritable here, not merely unproduced |
| T-04-SC (package installs) | nothing installed; the workflow runs `npm ci` from the committed lockfile |

## What 04-10 inherits

- **Nothing was dispatched, written to R2 or pushed.** No `gh workflow run`, no live object, no
  commit to `main`. That remains 04-10's, behind Akhil's blocking credentials checkpoint.
- **Two credentials must exist and carry the right scope:** `CLOUDFLARE_API_TOKEN` with **R2 Storage
  → Edit** (unverified from here — OD-5 B's stated contingency) and `CLOUDFLARE_ACCOUNT_ID`.
- **Two App secrets are still `user_setup`:** `PHOTO_PIPELINE_APP_ID` and
  `PHOTO_PIPELINE_APP_PRIVATE_KEY`. Until they exist the token step fails, which is the report that
  the setup is outstanding.
- **`--only <id>` with an unknown id is still a refusal**, which is what lets 04-10's live-run gate
  be unable to go green over a run that never happened.
- The staging lifecycle rule (04-10 Task 2) is what sweeps the orphan bytes cases 4, 5 and 6 leave
  behind. Until it exists they accumulate.

## Known stubs

None. Every code path in `scripts/process-photo.mjs` is exercised by at least one of the ten cases
except `INPUTS_REJECTED` and `INTERNAL`, whose producers (`validateDispatchInputs`, a missing
`astro` binary) are covered by 04-08's own suite and by an explicit refusal respectively.

## Self-Check: PASSED

Files asserted present and commits asserted reachable — see the verification block below.
