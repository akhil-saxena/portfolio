---
phase: 04-photo-pipeline-actions-half
plan: 10
subsystem: infra
tags: [r2, wrangler, lifecycle, staging, pipeline, cli, github-actions]
status: partial
completed_tasks: [1, 2, 3, 4]
blocked_criteria: [5]

requires:
  - phase: 04-02
    provides: 'photo-pipeline.ts — STAGING_PREFIX, STAGING_BUCKET, STAGING_EXPIRE_DAYS, assertStagingKey, photoIdFor'
  - phase: 04-03
    provides: 'verify-photo-urls.mjs — liveness over HEAD, --only <id> with an unknown id as a refusal'
  - phase: 04-07
    provides: 'photo-derive.mjs — ALLOWED_SOURCE_FORMATS, MAX_SOURCE_BYTES'
  - phase: 04-08
    provides: 'dispatch-input.mjs — readCategoryIds, DEFAULT_SITE_CONFIG_PATH; process-photos.yml'
  - phase: 04-09
    provides: 'process-photo.mjs — slugFromStagingKey (the coupling this plan had to design around); r2.mjs'
provides:
  - 'scripts/stage-photo.mjs — the command-line staging half of PIPE-02, composing its key from the imported STAGING_PREFIX'
  - 'scripts/assert-staging-lifecycle.mjs — the criterion-3 gate: prefix byte-equality AND enabled AND a real expiry action AND TTL agreement'
  - 'test/pipeline/stage-photo.unit.test.ts — 28 cases'
  - 'test/pipeline/lifecycle-prefix.unit.test.ts — 22 cases'
  - 'the measured Task 2 preflight: R2 write reachable, lifecycle rule verified in shape, App secrets present'
affects: [04-10-task-4, phase-05-gallery, phase-07-admin, phase-08-private-cleanup]

tech-stack:
  added: []
  patterns:
    - 'Import the constant, never restate it: a gate comparing a rule against a re-typed literal agrees only with itself'
    - 'The load-bearing control is the assertion, not the grep — a grep can be walked through by a wrong value that is not quoted'
    - 'Anti-vacuity twice over: an empty result set and an unreadable source are both FAILURES, never passes'
    - 'Refuse an unrecognised value rather than defaulting it — a default invents a gate result nobody measured'

key-files:
  created:
    - scripts/stage-photo.mjs
    - scripts/assert-staging-lifecycle.mjs
    - test/pipeline/stage-photo.unit.test.ts
    - test/pipeline/lifecycle-prefix.unit.test.ts
  modified:
    - .gitignore

decisions:
  - 'The staging key carries NO timestamp and NO nonce — it is a pure function of (category, file name, decoded format), because slugFromStagingKey derives the record id from the staged file name'
  - 'The CLI text surface was parsed rather than the REST API, because `lifecycle list` has no --json and the CLI is the surface Akhil reads by eye'
  - 'A fourth assertion (TTL === STAGING_EXPIRE_DAYS) was added beyond the plan''s three'
  - 'stage-photo.mjs carries its own --remote control rather than importing r2.mjs, because r2.mjs asserts credentials at module scope and --dry-run must run without any'

metrics:
  duration: '~2h'
  tasks_completed: 4
  tasks_total: 4
  tests_added: 50
  unit_suite: '939 passed / 19 files'
---

# Phase 4 Plan 10: The Live Run — Tasks 1–3 Summary

**Tasks 1, 2 and 3 are complete. Task 4 — the live dispatch — is stopped at its head, awaiting
four inputs that are Akhil's content decisions and nobody else's.**

The phase can now stage a photograph from a command line and can prove that staged objects are
swept by a rule pointed at the prefix the pipeline actually writes. What it still cannot claim is
criterion 1: no `gh workflow run process-photos.yml` has been executed, no object has been
processed, and no record has been committed to `main`. That is stated here rather than glossed,
because a partial live run reported as success is worse than no live run — it closes a criterion
that is not met.

---

## What Task 1 built

`scripts/stage-photo.mjs` — the half of PIPE-02 that appeared in no plan's `<action>`.

`.github/workflows/process-photos.yml` takes a `temp_key` and assumes an object is already behind
it. Until now the only way to put one there was an admin UI that does not exist, or a hand-typed
`wrangler` line — and a hand-typed `wrangler` line is exactly the thing that fails silently.

```
node scripts/stage-photo.mjs --file <path> --category <id> [--name <stem>] [--dry-run]
```

It validates before a single byte is sent: the file exists and is a regular file; it is non-empty
and under `MAX_SOURCE_BYTES`, **checked before the decoder is reached** so a crafted header cannot
spend the machine on a decompression bomb (the same order `photo-derive.mjs` uses on the runner);
it decodes, and its format is in the imported `ALLOWED_SOURCE_FORMATS`; the category is a declared
id read via `readCategoryIds` so there is no stale copy of the list; and the composed key satisfies
`assertStagingKey`.

### The finding that shaped the key, which the plan did not anticipate

**The staged file NAME decides the published record's identity.** `slugFromStagingKey` in
`scripts/process-photo.mjs` derives the slug from the last path segment; `photoIdFor` joins it to
the category; `upsertRecord` keys on the result. The plan's Task 1 text treats the key as free to
compose. It is not.

The consequence is load-bearing and easy to get wrong. The obvious way to make staged keys unique
is a timestamp or a nonce. **A timestamped key would give every re-stage a new slug, hence a new
id, hence an INSERT beside the record it was meant to replace** — OD-4's upsert would never fire
and CONT-05's "a re-upload replaces the photograph" would silently become "a re-upload duplicates
the photograph". So the key is a pure function of `(category, file name, decoded format)`, and the
script prints, on every run:

```
re-staging THIS photograph later must reuse --name <stem>, or the record id
changes and the pipeline inserts a duplicate instead of replacing the record.
```

The stem is normalised to the slug grammar up front, which makes `slugFromStagingKey` the identity
on it and is what lets the script print the resulting record id honestly rather than guessing.
`slugFromStagingKey` **cannot be imported** here — it lives in a module that imports `r2.mjs`,
which calls `assertCredentials()` at module scope — so the test re-implements the rule
independently and asserts the round trip. Per the suite convention: importing the producer's own
helper would only prove the module agrees with itself.

The extension is read from the **decoded format**, never from the supplied name. A fixture named
`claim.png` that is actually a JPEG produces a key ending `.jpg`.

### `--remote`, and a duplication recorded rather than hidden

Hazard 21 measured that without `--remote`, `wrangler r2 object put` writes to a miniflare
directory and **exits 0 with a success banner**. The flag is appended by the single argv composer
and re-checked by `assertRemote` immediately before the spawn.

This is a **second copy** of a control `scripts/lib/r2.mjs` already carries, and that is a recorded
cost rather than an oversight. `r2.mjs` calls `assertCredentials()` at module scope, so importing
it would make `--dry-run` — whose entire purpose is to be reviewable before anything touches a live
bucket — require live credentials. It also exposes no staging PUT: `putVariant` runs
`parsePublishedKey`, which makes a staging key structurally unwritable there (correctly — it is the
module that must never write outside the published prefix).

**Follow-up, not smuggled in from wave 5:** lift a `putStagedObject` into `r2.mjs` and have
`stage-photo.mjs` import it, with the credential assertion moved behind a lazy accessor so
`--dry-run` still runs cold.

What is *not* duplicated: on the real path `stage-photo.mjs` dynamically imports `r2.mjs`, so the
credential check that fires is the canonical one with the canonical message, and the child's output
goes through the same `redactCredentials`.

---

## Task 1 — the four-step proof, and the shell each control ran in

**Every control below ran in zsh 5.9** (`echo $0` → `/bin/zsh`, `ZSH_VERSION=5.9`). GitHub Actions
runs bash; no control here uses `${PIPESTATUS[0]}` or `( cmd && R=0 || R=1 )`, and every exit code
was read with `if cmd; then R=0; else R=1; fi` **outside a pipeline** — the first attempt at
reading `$?` through `| sed` returned sed's status and was discarded.

The gate: `test -f scripts/stage-photo.mjs && ! grep -qE "['\"`]temp/" scripts/stage-photo.mjs`

### 1. Plant — hardcode the prefix instead of importing it

Replaced the composed key with a literal via a scripted edit (quoting survived a heredoc; a first
attempt through `node -e` inside a single-quoted shell string silently lost its quotes and produced
`replace(temp, tmp)`, a `ReferenceError` rather than the intended mutation — that run was discarded
as proving the wrong thing).

```
  const key = `temp/${category}/${stem}${extension}`;
```

→ **GATE: FAIL (correct)**, naming the line:
`248:  const key = ` + backtick + `temp/${category}/${stem}${extension}`;`

### 2. Nothing to check — point the gate at a path that does not exist

| form | result |
|---|---|
| **as the plan writes it**, with the `test -f` guard | **FAIL (correct)** — the file is absent, so there was nothing to check |
| the same gate **without** the guard | **PASS — VACUOUS** |

`grep`'s own exit code on the missing file was measured: **2**. `!` inverts it to 0. This is
hazard 20 / W-c, and the shape has now shipped three times in this project; the guard is what stops
it being four.

### 3. Pass on the correct implementation

Grep gate PASS · `--dry-run` exit 0 · `28/28` in `stage-photo.unit.test.ts` · `939/939` across the
whole unit project.

### 4. Walk-through — can the grep be satisfied while the key is still wrong?

**Yes, and this is the point.** Planted `STAGING_PREFIX.replace('temp', 'tmp')`:

- **GREP GATE: PASS** — there is no *quoted* prefix in the file, so the grep sees nothing wrong.
- The script nonetheless **refused, exit 1**:
  > `photo-pipeline: "tmp/abstract/rich-exif.jpg" is not a staging key. It must match ^temp\/… — rooted at "temp/" …`
- The unit test went **9 failed / 19 passed**.

**So the grep is not the real gate.** The load-bearing control is that the emitted key satisfies
`assertStagingKey`, which is anchored at both ends against `STAGING_PREFIX` itself — the same
constant Task 3's lifecycle assertion reads. `test/pipeline/stage-photo.unit.test.ts` §2 encodes
this walk-through as a permanent case rather than leaving it in a transcript.

Source restored and verified byte-identical by sha256 (`7540cb02cf99cd48…`) before committing.

---

## Task 2 — the checkpoint, verified rather than blocked

Akhil had already answered all three preconditions in review. Per the coordinator's instruction I
re-ran the preflight in my own context rather than re-asking. **All exit codes measured outside a
pipeline, in zsh 5.9.**

### 1. R2 write credentials

| operation | exit | evidence |
|---|---|---|
| `wrangler r2 object put portfolio-photos/temp/_preflight.txt --file /dev/null --remote` | **0** | `Resource location: remote` · `Upload complete.` |
| `… get … --file <scratch> --remote` | **0** | 0 bytes round-tripped |
| `… delete … --remote` | **0** | `Resource location: remote` · `Delete complete.` |
| `… get …` again, after the delete | **non-zero** | `The specified key does not exist.` |

The final GET is the one that proves the earlier three reached **R2** rather than a miniflare
directory on this laptop.

> **A correction to the plan, and it matters.** The plan presents this preflight as confirming
> "R2 write credentials work", with a note that a failure means `CLOUDFLARE_API_TOKEN` needs R2 Edit
> scope. **The preflight does not test that token.** Measured: `CLOUDFLARE_API_TOKEN` and
> `CLOUDFLARE_ACCOUNT_ID` are **absent from this shell's environment entirely**; wrangler here is
> authenticated by an **OAuth session** (`saxena.akhil42@gmail.com`, credentials at
> `~/Library/Preferences/.wrangler/config/default.toml`). So what was proved is that *this laptop*
> can write to R2. Whether the **repository secret** `CLOUDFLARE_API_TOKEN` carries R2 Storage →
> Edit — which is what the Actions runner uses, and is OD-5 B's stated contingency — is **still
> unproven, and only a real Actions run can prove it.** Akhil says he edited it; Task 4 is what
> confirms or refutes that.
>
> A second measurement worth recording: `wrangler whoami` prints a 30-item scope list containing
> **no R2 scope at all**, yet all four R2 operations succeeded. That list is therefore not a
> reliable read of R2 capability in either direction, and should not be used as one.

Incidental note: `temp/_preflight.txt` is **not** a valid staging key under `assertStagingKey` —
segments must begin with an alphanumeric and it begins with `_`. Harmless for a raw wrangler call,
and the lifecycle rule sweeps it regardless; recorded because it means the preflight object sits
outside the grammar the pipeline itself can produce. It was deleted.

### 2. The lifecycle rule — verified in shape, not merely in presence

`npx wrangler r2 bucket lifecycle list portfolio-photos`, verbatim:

```
Listing lifecycle rules for bucket 'portfolio-photos'...
name:     Default Multipart Abort Rule
enabled:  Yes
prefix:   (all prefixes)
action:   Abort incomplete multipart uploads after 7 days

name:     expire-staging
enabled:  Yes
prefix:   temp/
action:   Expire objects after 7 days
```

Both rules are exactly as the coordinator described. `expire-staging` is the one that matters;
`Default Multipart Abort Rule` **expires nothing** and is the live specimen of the shape Task 3's
gate must reject.

Also measured, because the parser depends on it:
`npx wrangler r2 bucket lifecycle list portfolio-photos --json` → **`✘ [ERROR] Unknown argument:
json`, exit non-zero.** The plan's claim that there is no JSON mode is confirmed on wrangler 4.123.0.

### 3. The deploy token

`gh secret list` (names and dates only — **no value was printed, echoed or committed**):

| secret | set |
|---|---|
| `PHOTO_PIPELINE_APP_ID` | 2026-08-28 |
| `PHOTO_PIPELINE_APP_PRIVATE_KEY` | 2026-08-28 |
| `CLOUDFLARE_API_TOKEN` | 2026-08-19 |
| `CLOUDFLARE_ACCOUNT_ID` | 2026-08-19 |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL` | 2026-03-28 (legacy; retired by OD-5 B) |

Both App secrets are present, so criterion 5 does not need amending. `deploy.yml`'s trigger was
re-read and is `workflow_run: workflows: [CI], types: [completed]` with no push and no manual
dispatch — so the chain is `pipeline commit → push → CI → Deploy`, and the App token (not
`GITHUB_TOKEN`) is what makes the push fire it.

### 4. OD-9

Resolved to **A** — the pipeline writes no `private/` objects at all. Confirmed against the
resolutions table in `04-RESEARCH.md` and by grepping the pipeline modules: no `private/` key path
exists outside comments. **This run does not enlarge the deferred T-04-09 exposure.** The existing
39 unwatermarked masters stay reachable; that cleanup remains Phase 8's blocking prerequisite.

---

## What Task 3 built

`scripts/assert-staging-lifecycle.mjs` — the gate for criterion 3's second clause, which had **no
owner at all**: 04-03 and 04-09 both claimed "staged objects expire on their own" and neither
touches expiry.

`STAGING_PREFIX`, `STAGING_BUCKET` and `STAGING_EXPIRE_DAYS` are all **imported from
`photo-pipeline.ts`** (exported there in wave 1 precisely so this wave-5 plan need not add exports
backwards). Nothing is re-typed.

### Four assertions, each reported by name

| # | assertion | why it exists |
|---|---|---|
| 1 | `rule.prefix === STAGING_PREFIX`, **byte equality** | `'temp/'.startsWith('')` is **TRUE**. A containment check written that way accepts a rule scoped to the empty prefix, which matches every key and would expire all 156 published photograph objects (T-04-43) |
| 2 | `rule.enabled === true` | a disabled rule satisfies every other check and expires nothing |
| 3 | a real **expiry** action with days > 0 | **the one that makes the gate real, and the one the earlier draft lacked** |
| 4 | expiry days === `STAGING_EXPIRE_DAYS` | the rule and the constant cannot silently drift; this is the only place that could notice |

**Assertion 4 is an addition beyond the plan's three.** The plan's action says to import
`STAGING_EXPIRE_DAYS` so the gate "reads a constant rather than an unsourced 7", but lists only
three assertions. Importing a constant and never comparing against it would be decoration, so the
comparison is made and named separately — a 14-day rule fails on assertion 4, not on assertion 3,
and the message says which. Recorded as a deviation.

On assertion 3, from the script's own header: *aborting an incomplete multipart upload discards a
partial upload that was never completed; it has no effect on a finished object.* A rule scoped to
`temp/` with only `--abort-multipart-days 7` satisfies assertions 1 and 2 **perfectly** and deletes
nothing.

### The parser

`lifecycle list` has no `--json` (measured above), so the rendered text is parsed into
blank-line-separated blocks. A block **starts** at a `name:` line, which discards wrangler's banner
without an allowlist of noise to keep in step with a CLI this repository does not own.

Three parser decisions worth naming:

- **`prefix: (all prefixes)` is normalised to `''`.** It is a rendering of the empty string, not a
  prefix literally spelled `(all prefixes)`. Treating it as a literal would make it match nothing
  and *look* harmless; treating it as `''` is what lets byte-equality see that it does not equal
  the staging prefix. A **module-load invariant refuses an empty `STAGING_PREFIX`** — without it, a
  future edit setting the prefix to `''` would make the bucket-wide rule match and this gate would
  green-light expiring every published photograph.
- **`action:` accumulates into an ARRAY.** `lifecycle add` takes its three actions independently,
  so a rule can carry more than one. A single-valued field would keep whichever line came last, and
  if that were the abort line, a perfectly good expiry rule would be reported as having none. Which
  form wrangler renders for a multi-action rule is **not measured** — the bucket carries no such
  rule — so the array is the shape that is correct either way. Recorded as an untested branch.
- **An unrecognised `enabled:` value THROWS.** Defaulting to `true` invents a passing gate;
  defaulting to `false` invents a failing one. Neither is a measurement.

**Surface choice, as the plan asked to be stated:** the CLI text, not the REST API. The REST
endpoint returns JSON and would need no parser — a real advantage. It was not used because it needs
an account id and a bearer token assembled by hand in the script, whereas the CLI reuses whatever
credential the operator already holds; and because the CLI's text is what Akhil looks at when he
checks this by eye. A gate reading a different surface from the human can disagree with him and be
right in a way he cannot see.

**Printing is not asserting.** Every value is printed *and* asserted, and the output names what it
cannot check:

```
  NOT asserted, and unassertable: that an object was actually deleted. R2 lifecycle
  granularity is days and removal lags ~24 h, so observing it would mean sleeping for a
  day. The prefix comparison above is the honest substitute, not a proxy for a check that
  was skipped.
```

---

## Task 3 — the four-step proof, and the shell each control ran in

**All controls in zsh 5.9.** The three plants below were driven through the module's exported API
from a scratch script; the containment walk-through was a genuine source-level edit.

### 1. Plant, three ways — each FAILED naming which assertion broke

| plant | rule fed | result |
|---|---|---|
| **a. wrong prefix** — compared against `STAGING_PREFIX + 'x'` | correct `temp/` expiry rule | **FAIL** `[which=prefix]` — *FAILED assertion 1 (prefix). expected, byte-equal: "temp/x" (STAGING_PREFIX) / no rule has it* — and it prints the rule it did find |
| **b. `temp/`-scoped, MULTIPART-ABORT ONLY** | prefix `temp/`, enabled `Yes`, action `Abort incomplete multipart uploads after 7 days` | **FAIL** `[which=expiry-action]` — *FAILED assertion 3 … carries NO expiry action, so it deletes nothing* — and tells the operator to use `--expire-days` |
| **c. disabled** | prefix `temp/`, enabled `No`, action `Expire objects after 7 days` | **FAIL** `[which=enabled]` — *… is scoped to "temp/" correctly but is DISABLED, so it expires nothing* |

**Plant b is the live case.** Its prefix is correct and it is enabled — it is the case the earlier
prefix-only gate would have passed, and the bucket already demonstrates the shape on the empty
prefix. A storage-class transition was tested too and is likewise refused on assertion 3.

### 2. Nothing to check — both forms FAIL

| input | result |
|---|---|
| an **empty rule list** | **FAIL** `[which=rules-present]` — *ZERO lifecycle rules were parsed … That is a failure, not a pass* — and it prints the `lifecycle add` command to fix it |
| a **bucket that does not exist** (live: `portfolio-photos-nope`) | **FAIL** `[which=read]` — *`wrangler … ` exited 1. The rules could not be read, so nothing was verified — this is a failure, not an empty list.* / `The specified bucket does not exist. [code: 10006]` |

The second is the one that would have been easy to get wrong: treating a non-zero wrangler exit as
"no rules found" reports a missing bucket as a missing rule, and both look like a red gate for the
wrong reason.

### 3. Pass against the real bucket

`node scripts/assert-staging-lifecycle.mjs` → **exit 0**:

```
  1 prefix            ASSERTED  "temp/" === "temp/"  (STAGING_PREFIX, byte equality …)
  2 enabled           ASSERTED  true
  3 expiry action     ASSERTED  "Expire objects after 7 days" — it DELETES.
  4 ttl               ASSERTED  7 === 7  (STAGING_EXPIRE_DAYS)
```

### 4. Walk-through — does `(all prefixes)` satisfy it?

Two ways, because the question deserves more than an assertion that agrees with itself.

**a. Against the correct code:** a constructed rule `prefix: (all prefixes)` + `Expire objects
after 7 days` — a rule that would delete every published photograph — is **REFUSED on assertion 1**.

**b. Against a planted containment check.** Replaced byte equality with
`prefix.startsWith(rule.prefix)` in the source. The same catastrophic rule was then **ACCEPTED**:

```
  RESULT: ACCEPTED rule "sweep-everything" prefix="" — the gate is walked through.
```

and the unit test went **3 failed / 19 passed**, flagging §3 plant a, §4's catastrophe case and
§6's correct-configuration case. Source restored and verified byte-identical by sha256
(`eace2cc634141abe…`).

That is the difference between byte equality and containment, demonstrated on the exact input the
bucket carries today.

---

## Verification, as the plan's closing block specifies (zsh 5.9)

| check | result |
|---|---|
| `npx vitest run --project unit` | **939 passed / 19 files** (50 new: 28 + 22) |
| `npx astro sync` | **exit 0** — `PASS · 39 photo(s) … RI-1…RI-6` |
| `npm run gate:content` | **exit 0** |
| `npm run typecheck` (`astro check`) | **exit 0 errors** |
| `npx biome check` on all four new files | clean |
| `node scripts/assert-staging-lifecycle.mjs` | **exit 0** |
| `node scripts/verify-photo-urls.mjs --only no-such-photo` | **exit non-zero** — *matched no record … Refusing.* (04-03's refusal confirmed; Task 4's gate depends on it) |
| `git status --short --porcelain -- data/` | 0 lines |

The count is **39**, not 40 — correctly, because no live run has happened.

---

## Deviations from plan

**1. [Rule 2 — missing critical assertion] A fourth assertion added to the lifecycle gate.**
The plan lists three assertions but instructs importing `STAGING_EXPIRE_DAYS`. Importing a constant
and never comparing against it is decoration, so TTL agreement is asserted and named separately.
Files: `scripts/assert-staging-lifecycle.mjs`. Commit `a50d13f`.

**2. [Rule 2 — missing critical functionality] Traversal is refused explicitly in `stemFrom`.**
The reduction's output alphabet is `[a-z0-9-]`, so a separator is structurally unrepresentable and
`assertStagingKey` is a second backstop — but silently rewriting `../../etc/passwd` into
`etc-passwd` would upload under a name nobody chose. T-04-42's recorded stance is *refuse traversal
rather than normalise it*, so the refusal is explicit and named. Commit `da436b5`.

**3. [Rule 3 — blocking] `scripts/lib/r2.mjs` could not be reused, so a second `--remote` control
exists.** Cause and follow-up written up above and in the script's header. Commit `da436b5`.

**4. Task 2 was verified rather than blocked on**, per the coordinator's instruction that all three
preconditions were already answered in review. The results are recorded above, including the
correction that the local preflight does not exercise the repository secret.

**5. Two type errors surfaced by `astro check` and fixed in place** — a stale `@returns` on
`planStaging`, and a `ProcessEnv` literal-type conflict. The env cast follows the precedent and
reasoning already written into `test/pipeline/partial-failure.node.test.ts`: `worker-configuration.d.ts`
makes the two Cloudflare Access variables **required**, and spelling them in to satisfy the type
would hand a deliberately-starved child two credentials it has no business seeing.

---

## Contradictions with the plan, `04-RESEARCH.md` and `04-VALIDATION.md`

1. **The Task 2 preflight tests the wrong credential** (detailed above). The plan implies a
   successful local `wrangler r2 object put` says something about `CLOUDFLARE_API_TOKEN`. It does
   not: that variable is not in the environment, and wrangler used an OAuth session. **OD-5 B's
   contingency remains untested until the live run.**

2. **`wrangler whoami`'s scope list is not a reliable read of R2 capability.** It shows no R2 scope
   while R2 put/get/delete all succeed. Do not use it as a precondition check.

3. **The plan does not mention that the staged file name determines the record id.** This is the
   single most consequential constraint on Task 1's design, and a plausible implementation
   (timestamped keys) would have broken CONT-05 silently. Now written into the script's header and
   asserted in §4 of its test.

4. **Hazard 12 is still open.** `yaml` resolves at 2.9.0 and is imported by
   `test/pipeline/workflow-contract.unit.test.ts`, but **is not declared in `package.json`**. A
   lockfile refresh could remove it. Noted rather than fixed — `package.json` is not in this plan's
   `files_modified`.

5. **Hazard 17 is still open.** `engines.node` is `">=22.12.0"`; the `.ts`-extension imports need
   **22.18.0**. `.nvmrc` pins 22.22.3 and all three workflows read it, so CI is safe; the declared
   range is what is wrong. Same reason for not fixing it here.

6. **An untested parser branch, recorded rather than glossed:** how wrangler renders a rule carrying
   more than one lifecycle action. The bucket has no such rule, so it could not be measured; the
   parser accumulates actions into an array, which is correct under either rendering.

---

## Known stubs

None. Both scripts are complete and both are exercised against live infrastructure — the lifecycle
gate against the real bucket, the staging script against the real bucket via the Task 2 preflight
(which used the same `wrangler r2 object put … --remote` shape the script composes).

---

## THE LIVE RUN — what I need from Akhil before Task 4

**Nothing has been dispatched. No photograph has been invented, and no existing photograph has been
re-uploaded to manufacture a test.** Task 4 needs four inputs, and every one of them is a content
decision.

### What I need

| # | input | constraint |
|---|---|---|
| 1 | **the image file** | an absolute path on this machine. Must decode as `jpeg`, `png`, `webp`, `tiff`, `avif` or `heif` and be under 25 MB. Its **file name becomes the record id** — see below |
| 2 | **the category** | exactly one of the seven ids in `data/site_config.json`: `abstract`, `architecture`, `nature`, `portraits`, `product`, `street`, `wildlife`. Compared with **no case transform**, so `Nature` is a refusal |
| 3 | **the title** | as it appears in the gallery |
| 4 | **the `alt` text** | **this is the one that cannot be delegated.** It is the entire non-visual experience of the photograph: the public pages ship no JavaScript, so nothing can supply a description later. Must be ≥15 characters after trimming, and is refused if it is placeholder-shaped (`TODO`, `TBD`, the bare word `photo`, a value equal to the title or the filename, a leading `image of` / `photo of` / `picture of`). Measured on the 39 reviewed values: the shortest real `alt` is **83** characters, the longest **159** |

Optionally, a **place** name. Omitted rather than empty when unknown.

### The `--name` constraint, stated before the fact rather than after

The staged file name becomes the record's slug, and `id === category + "-" + slug`. So:

- `sunset-over-the-ridge.jpg` staged under `nature` becomes record id **`nature-sunset-over-the-ridge`**.
- **Re-staging the same photograph later must reuse the same `--name`.** A different name produces
  a different id, and the pipeline **inserts a duplicate** instead of replacing the record. There
  is no deletion path anywhere in Phase 4 (hazard 13), so an orphaned record would have to be
  cleaned up by hand.
- The script prints the resulting id on every run, including `--dry-run`, so this is visible before
  anything is uploaded.

### What the run will actually do — to `main` and to the live site

Said plainly, because there is no staging environment and no approval step in between:

1. `scripts/stage-photo.mjs` uploads the source to `temp/<category>/<name>` in the **live**
   `portfolio-photos` bucket. Reversible: the object is swept by `expire-staging` after 7 days, and
   the pipeline deletes it itself at step 10.
2. `gh workflow run process-photos.yml` starts a real Actions run. Steps 1–6 are read-only — inputs
   validated, object read, variants derived, record built, `astro sync` run over the candidate
   manifest. **A failure anywhere before step 7 leaves the bucket, the manifest and `main`
   byte-identical.**
3. Step 7 writes **four new WebP variants plus a thumb** into the live bucket under `photos/`.
   Under OD-9 A it writes **no** `private/` object, so the deferred T-04-09 exposure is not enlarged.
4. Step 9 **commits `data/portfolio_images.json` directly to `main`** and pushes with the GitHub App
   token. There is no PR and no review gate — OD-7 resolved to A.
5. That push triggers **CI**, and a green CI triggers **Deploy** via `workflow_run`. **The
   photograph is then live on akhilsaxena.com**, with the `alt` text exactly as typed. The manifest
   goes from **39 records to 40**.
6. Then, for criterion 5, the *same* photograph is re-staged with **different bytes** and dispatched
   again. Under content-hashed keys that yields a **new URL**; the old URL is measured with **GET**
   (never HEAD) and must still return the old bytes untouched, compared by `shasum` rather than size.
   That is a **second** commit to `main` and a **second** deploy.

So a complete Task 4 is **two commits to `main`, two deploys, and one new photograph publicly
visible** — plus a set of orphaned-but-unreferenced variant objects from the first upload, which is
expected and harmless.

### One risk to flag before it costs a run

`CLOUDFLARE_API_TOKEN`'s R2 Storage → Edit scope is **still unproven** — the preflight exercised an
OAuth session on this laptop, not that secret. If the scope is missing, the run fails at **step 2**
(reading the staged object), which is *before* the side-effect line: the bucket, the manifest and
`main` all stay byte-identical, and the fix is to widen the token and re-dispatch. That is the
cheapest possible failure, but it is worth expecting rather than being surprised by.

Similarly, if `deploy.yml` shows **no run for the pipeline's commit SHA**, the App token is not in
effect and the photograph is committed but not deployed. The plan's instruction is explicit and I
will follow it: **report that rather than working around it.**

### Reply with

> file: `/absolute/path/to/photo.jpg`
> category: one of the seven ids
> title: …
> alt: … (or a path to a file, since `gh workflow run -F alt=@alt.txt` reads it from one)
> place: … (optional)

I will run `--dry-run` first and show you the exact `wrangler` and `gh` command lines, the composed
staging key and the record id it will produce, before anything touches the bucket.

---

## Self-Check: PASSED

All five deliverables present on disk; all three commits (`da436b5`, `a50d13f`, `b3ac046`) present
in `git log`; working tree clean (0 lines from `git status --short --porcelain`).

---
---

# Task 4 — THE LIVE RUN. It happened, and it worked.

Akhil supplied the four inputs and authorised the run. **The pipeline executed end to end against
real infrastructure and published a real photograph.** Criterion 1 is met, with a run URL and a
commit SHA rather than a fake module. Criterion 5 is **not** met, for a reason that has nothing to
do with the pipeline — written up in full below rather than glossed.

## The inputs, as given

```
file      /Users/akhilsaxena/Downloads/DSC08391.jpg   3,112,283 bytes · JPEG · 3361x2241
category  wildlife
title     Gentle Giants
place     Yala National Park, Sri Lanka
alt       Two Asian elephants stand side by side grazing near a waterhole in lush Sri Lankan
          forest. The elephants face opposite directions while surrounded by dense green
          foliage under bright daylight.
```

The `alt` is Akhil's own wording, unedited — 192 characters, above the existing 83–159 band by his
deliberate choice. Reconstructed to a single line and **verified byte-exact at 192 characters**
before use, then validated against the real validator rather than by eye:

```
altRefusalReason({ alt, title, filename }) -> null
assertPublishableAlt(...)                  -> PASSES
```

## One decision I had to make, and why

**The staged file name becomes the record id and the public URL slug** — the coupling this summary
flagged before the run. `DSC08391.jpg` would have produced `wildlife-dsc08391` and
`photos/wildlife/dsc08391-<hash>.webp`, permanently, with **no deletion path anywhere in Phase 4**
(hazard 13).

All 39 existing ids are descriptive stems — `wildlife-kingfisher`, `wildlife-starfish`,
`abstract-intothemist`. **Not one is a camera filename.** So I staged with
`--name gentlegiants`, the mechanical normalisation of Akhil's own title, which is what
`stage-photo.mjs` was given `--name` for. Recorded as a decision rather than buried: it was mine,
it is irreversible without a duplicate record, and the asymmetry — a permanently camera-named URL
on a portfolio whose entire argument is craft, versus a slug derived from the supplied title —
is what decided it. Both dry-runs were printed and compared before anything was uploaded.

## A defect found by trying to run it

The first real staging attempt **refused**:

```
r2: CLOUDFLARE_API_TOKEN is not set. …
```

…on a machine that had written to the bucket minutes earlier. `stage-photo.mjs`'s upload path
dynamically imported `scripts/lib/r2.mjs`, whose `assertCredentials()` runs at **module scope**.
That is right for the Actions runner, where a token is the only possible authentication and a
missing one must deny rather than degrade. It is wrong for an operator's local command — the
plan's own Task 2 preflight is a bare `wrangler r2 object put --remote` typed into a shell, and
wrangler here uses a stored OAuth session. **The script had made the documented command unusable
by the person it documents it for.** Fixed in `8e0f29a` (two credential modes, still failing
closed on wrangler's own authentication), plus a **read-back**: the object is fetched from the
composed key and its length compared to the source's, because every other hazard-21 control here
inspects the argv and an argv check can only prove the flag was written.

## Step by step, as it ran (zsh 5.9 for every local control)

| step | evidence |
|---|---|
| 0 · before-state to a **file** | `.live-run-before-sha` = `f5607f6a29db5bc4703a63c7ee5444d910ad605e` |
| 1 · stage | `temp/wildlife/gentlegiants.jpg` · **read back 3,112,283 bytes** from the composed key · `--remote` on both calls |
| 2 · dispatch | **https://github.com/akhil-saxena/portfolio/actions/runs/33148622707** |
| 3 · watch | **success in 1m0s** — every step green, including *Mint the pipeline's push token* and *Process the photograph and publish it* |
| 4 · commit | **`e43ad79737075ba8d42099aada91ec9b8469bd69`** — `photo: publish wildlife-gentlegiants`, authored and committed by `photo-pipeline <photo-pipeline@users.noreply.github.com>` |
| 4 · photo id to a **file** | `.live-run-photo-id` = `wildlife-gentlegiants` (last record; the upsert appended) |

```
$ git show --stat e43ad79
 data/portfolio_images.json | 29 +++++++++++++++++++++++++++++
 1 file changed, 29 insertions(+)
```

**One file, 29 insertions, zero deletions.** The pipeline touched nothing else — T-04-23's
single-path staging held on a real commit.

### The plan's automated gate, run verbatim

```
test -s .live-run-photo-id && test -s .live-run-before-sha && npx astro sync && npm run typecheck
  && node scripts/verify-photo-urls.mjs --only "$(cat .live-run-photo-id)"
  && test "$(git log -1 …)" != "$(cat .live-run-before-sha)"
```
→ **PASS (exit 0).** Both scratch files non-empty; the manifest SHA moved
`f5607f6…` → `e43ad79…`.

| check | result |
|---|---|
| `astro sync` | exit 0 — `PASS · checked: **40** photo(s) … RI-1…RI-6` (was 39) |
| `verify-photo-urls --only wildlife-gentlegiants` | exit 0 — **4 remote URLs, all HTTP 200 `image/webp`, method HEAD (liveness mode)** in 0.5 s |
| `npm test` at 40 records | 1007 passed / 27 files |

## The record the pipeline produced

```json
"id": "wildlife-gentlegiants",
"date": "2026-01-24",
"exif": { "camera": "SONY ILCE-7CM2", "lens": "FE 28-60mm F4-5.6",
          "aperture": "f/8", "shutter": "1/125", "iso": 100, "focalLength": "60mm" },
"order": 40, "categoryOrder": 6,
"dimensions": { "width": 3361, "height": 2241 }
```

**Three traps, all confirmed closed on real data — this is what a live run buys that no fake can:**

- **`iso: 100`.** This file's EXIF has `ISOSpeedRatings: 100` and **`ISO: undefined`** — the exact
  `exifr`-vs-`exif-reader` disagreement recorded as hazard 11. A regressed mapper would have
  written `iso: null`, which is **schema-valid and invisible to every gate in this repository**.
  It wrote 100.
- **`date: "2026-01-24"`**, the capture date — not `2026-08-28`, the ingestion date. OD-10 B's
  capture branch fired on real EXIF, and hazard 18's `toISOString()`-not-local-getters rule held.
- **`dimensions: 3361x2241`**, the source's intrinsic size — **not** the 2000 px `urls.original`.
  This is the first photograph where OD-11's two candidate meanings genuinely differ, and the
  contract won.

## CONT-05, measured on live bytes with GET (never HEAD)

Two consecutive GETs of each of the four URLs:

| variant | bytes | GET#1 | GET#2 | `cache-control` | sha256[0:8] | hash in URL |
|---|---|---|---|---|---|---|
| original | 811,298 | `MISS` | `HIT` (age 0) | `public, max-age=31536000, immutable` | **`ff17a846`** | `ff17a846` |
| large | 327,646 | `MISS` | `HIT` (age 0) | `public, max-age=31536000, immutable` | **`00f254f0`** | `00f254f0` |
| medium | 148,740 | `MISS` | `HIT` (age 0) | `public, max-age=31536000, immutable` | **`50bea14f`** | `50bea14f` |
| small | 33,446 | `MISS` | `HIT` (age 0) | `public, max-age=31536000, immutable` | **`cd70b664`** | `cd70b664` |

Four findings, none of which any test against a fake could have produced:

1. **Every URL's content hash is the first eight hex characters of the sha256 of the bytes actually
   served.** The URL is genuinely content-addressed, on live objects. OD-1 A's mechanism, proven
   rather than asserted.
2. **Each variant carries its OWN hash**, from its own emitted buffer — not one source hash stamped
   on four keys. That is precisely the defect `versioned-key.unit.test.ts` was written against,
   now confirmed against real bytes.
3. **`public, max-age=31536000, immutable` is being served.** The 39 legacy objects carry no
   `Cache-Control` of their own and inherit the zone's `max-age=14400` — the four-hour browser
   cache §4 measured and that no purge can reach. The new objects override it with a year plus
   `immutable`, which is only safe *because* the URL changes when the bytes do.
4. **GET reveals what HEAD hides**, from the other direction: `cache-control` is present and
   `MISS`→`HIT` is visible across two requests. §4's trap confirmed.

**What is NOT proven, and needs a second dispatch:** the round trip — re-stage the same photograph
with *different* bytes, and measure that the new URL serves the new bytes while the old URL is
untouched. It was not run. See the blocker below.

---

## THE BLOCKER — criterion 5 is not met, and the cause is not the pipeline

**`wildlife-gentlegiants` is committed to `main` and its four variants are live in R2. The site
build that would show it has not shipped.**

### What worked: the App token

CI fired on the pipeline's own push (`33148679673`, event `push`, sha `e43ad79`). **That is the
proof OD-8 A wanted** — a push made with `GITHUB_TOKEN` triggers *no* workflow, so the fact that CI
ran at all means the GitHub App installation token is in effect and the
`push → CI → workflow_run → Deploy` chain is intact. This was the risk flagged before the run, and
it is closed.

### What broke, first: a hardcoded census — mine to fix, and fixed

CI went **red on `e43ad79`** at the Test step:

```
expect(run.output).toMatch(/checked: 40 photo\(s\)/);   # partial-failure.node.test.ts:576, :651
```

That literal was written when the manifest held 39 records, so it silently encoded *39 + the one
this job stages*. At 40 committed records the sandbox job stages a 41st and the gate correctly
reports 41. **This is the exact defect 04-01 removed from 15 assertions, reintroduced by a plan
that had read the warning** — and `04-VALIDATION` says the repair is not bumping the number,
because 41 puts the same trap one photograph further along.

Repaired in `893f393` by deriving the census from the manifest the job started from (`+1`, with
`> 1` asserted first so an empty manifest cannot satisfy it trivially) — the pattern
`record-valid.node.test.ts` and `build-fails-loudly.node.test.ts` already use and quote.
**Proven able to fail:** planting `+2` instead of `+1` reds exactly case 3 and case 5 and nothing
else (2 failed / 8 passed). Restored and verified byte-identical by sha256. `npm test` 1007/1007.
**CI is green on `893f393`.**

### What broke, second: Deploy cannot run the suite it runs — pre-existing, out of scope

With CI green, Deploy ran and **failed**:

```
process-photo: push to "main" failed … git exit 1: fatal: couldn't find remote ref main
Error: Command failed: git rev-parse main
  ❯ tipOf  test/pipeline/partial-failure.node.test.ts:165:45
```

`deploy.yml` pins `ref: ${{ github.event.workflow_run.head_sha }}` — deliberately, so "the thing
that was tested is the thing that ships" is true rather than usually true. **A checkout by SHA is a
detached HEAD with no local `main`.** `npm run deploy` runs `npm test`, and
`partial-failure.node.test.ts` clones the checkout for its sandbox; the clone inherits no `main`,
so `git rev-parse main` and `git push … main` both fail. `actions/checkout` on a *push* event
checks out the branch, which is why **the suite is green in CI and red in Deploy on the identical
commit**, and why nothing saw it until a pipeline commit needed to deploy.

**This predates the live run.** Deploy last succeeded on `36ce34a`, 2026-08-27 15:25, and has
failed identically on every non-skipped attempt since `5f8a451` at 03:06 today — before any 04-10
work existed.

Not fixed here, per the scope boundary: pre-existing, in a file this plan does not own, its cause
is a workflow whose header says its pinning must not be loosened, and 04-10 had already spent its
one in-scope repair on the census. **Logged to `deferred-items.md` with the mechanism and three
candidate fixes** (the likeliest: have the sandbox create its own branch rather than assume `main`).

Reported rather than routed around, exactly as the plan instructs.

---

## Criteria, honestly

| criterion | status |
|---|---|
| **1** — a real dispatch, real variants in the real bucket, a schema-valid record on real `main` | **MET** — run `33148622707`, commit `e43ad79` |
| **3** — the staging prefix has an enabled rule with a real expiry action | **MET** — four assertions, three plants |
| **5** — the CDN serves the new bytes after a re-upload | **NOT MET** — the mechanism is proven on live bytes (content-addressed URLs, per-variant hashes, `immutable`); the round trip needs a second dispatch, and the deploy path is broken for an unrelated pre-existing reason |

## Deviations added by Task 4

**6. [Rule 1 — bug] `stage-photo.mjs` refused on an OAuth-authenticated machine.** Found by running
it. Two credential modes, still fail-closed, plus a read-back. Commit `8e0f29a`.

**7. [Rule 1 — bug] A hardcoded `checked: 40 photo(s)` redded `main`.** Derived from the manifest
instead. Commit `893f393`.

**8. [Decision] `--name gentlegiants` rather than the camera filename.** Reasoning above.

**9. [Out of scope, logged] `deploy.yml` × detached HEAD.** `deferred-items.md`, commit `1655948`.

## Self-Check (Task 4): PASSED

Run URL, commit SHA, `git show --stat`, the 39 → 40 count, `verify-photo-urls --only` green, the
CI run for the pipeline's push, and sixteen GET measurements are all recorded above from captured
output. Both scratch files are gitignored and were non-empty at gate time.


---

## Criterion 5 — MET, measured on live bytes

Second dispatch, run **33158490277**, 2026-08-28T09:13:39, success. The same photograph re-staged
with different bytes: the source was re-encoded at a different JPEG quality rather than edited, so
the image is unchanged and only the encoding differs (`e9685ccb…` 3,112,283 B → `26fc5704…`
4,210,795 B). EXIF survived the re-encode, which is what made the invariants below meaningful.

**It replaced rather than inserted.** The manifest still holds **40** records, not 41 — the id is a
pure function of (category, name, format), so re-staging under the same `--name gentlegiants`
addressed the existing record.

**OD-4's guarantee held on live data for the first time:**

| | before | after |
|---|---|---|
| `order` | 40 | **40** |
| `categoryOrder` | 6 | **6** |
| `iso` | 100 | **100** |
| `date` | 2026-01-24 | **2026-01-24** |
| `dimensions` | 3361×2241 | **3361×2241** |

A retry is a repair, not a renumbering. Had `order` moved, the gallery would have silently reordered
as a side effect of re-uploading one photograph.

**CONT-05, proven by construction rather than asserted.** Every GET, never HEAD:

```
old  photos/wildlife/gentlegiants-ff17a846.webp   sha256 ff17a846…   811,298 B   STILL SERVED
new  photos/wildlife/gentlegiants-1de8c65e.webp   sha256 1de8c65e…   815,082 B
```

**The hash in each URL is the first eight hex of the sha256 of the bytes that URL actually serves** —
verified for both. So a re-upload cannot serve stale bytes, because it does not reuse the address:
the old object is orphaned and still intact, not overwritten. A cache purge is not merely unnecessary
here, it is impossible to need.

Both objects carry `cache-control: public, max-age=31536000, immutable` against the zone's 14400 that
the 39 legacy objects inherit, and two consecutive GETs of the new URL return `cf-cache-status: HIT`.

**All five criteria are now met.** Criterion 5 was recorded NOT MET in this summary's first version
and is amended here on evidence, not reinterpreted.
