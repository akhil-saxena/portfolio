---
phase: 04-photo-pipeline-actions-half
plan: 08
subsystem: photo-pipeline
tags: [actions, workflow_dispatch, input-validation, github-app-token, supply-chain]
requires:
  - src/lib/photo-pipeline.ts (04-02) — DISPATCH_INPUTS, assertStagingKey, altRefusalReason
  - data/site_config.json — the category id set, read at validation time
  - .github/workflows/ci.yml, deploy.yml — the conventions this file matches
provides:
  - .github/workflows/process-photos.yml — the workflow_dispatch trigger, inputs, permissions, token, concurrency, checkout depth, validation step
  - scripts/lib/dispatch-input.mjs — validateDispatchInputs, DispatchInputError, inputsFromEnv, assertRuleCoverage
  - test/pipeline/workflow-contract.unit.test.ts — 11 rules, 10 planted defects
  - test/pipeline/dispatch-input.unit.test.ts — 100 assertions
affects:
  - 04-09 (composes the pipeline steps into this workflow, replacing the boundary step)
  - 04-10 (blocking checkpoint confirms PHOTO_PIPELINE_APP_ID / PHOTO_PIPELINE_APP_PRIVATE_KEY)
tech-stack:
  added: []
  patterns:
    - accumulate-then-fail validation (same convention as src/schemas/content-set.ts)
    - inputs reach Node through env:, never interpolated into a run: block
    - third-party actions pinned to full 40-char commit SHAs
    - contract test parses the YAML rather than grepping it
key-files:
  created:
    - .github/workflows/process-photos.yml
    - scripts/lib/dispatch-input.mjs
    - test/pipeline/dispatch-input.unit.test.ts
    - test/pipeline/workflow-contract.unit.test.ts
  modified: []
decisions:
  - "OD-8 = A: a GitHub App installation token via actions/create-github-app-token@bcd2ba4 (v3.2.0)"
  - "The validation step runs BEFORE npm ci and before the token is minted"
  - "The token is minted LAST, so its live window is as short as the job allows"
  - "`yaml` is used as an undeclared transitive dependency; promote it to a devDependency"
metrics:
  duration: ~55 min
  completed: 2026-08-27
  tasks: 3
  commits: 5
  tests-added: 124
---

# Phase 04 Plan 08: The Dispatch Interface Summary

A `workflow_dispatch` workflow that refuses a bad dispatch in seconds — before `npm ci`, before a
token is minted, before a single R2 byte is read — plus a contract test that parses the YAML so
the workflow and `DISPATCH_INPUTS` cannot drift, proven by ten planted defects each failing on its
own rule id and nothing else.

---

## 1. The dispatch input contract

```
gh workflow run process-photos.yml --ref main \
  -f temp_key=temp/2026-08-27-egret.jpg \
  -f category=wildlife \
  -f title='Egret at the tank bund' \
  -F alt=@alt.txt \
  [-f place='Ranganathittu']
```

Five inputs, generated from `DISPATCH_INPUTS` — same names, same order, same `required` flags,
and the **descriptions are byte-equal**, asserted by parsing the YAML and comparing to the array.

| input | required | refused when |
|---|---|---|
| `temp_key` | yes | anything `assertStagingKey` refuses: outside the staging prefix, traversal, absolute, a different case of the prefix, a backslash, an empty remainder, `> 1024` UTF-8 bytes |
| `category` | yes | not byte-equal to an id in `data/site_config.json`, **read at validation time** — no case transform, no trim (RI-1's comparison) |
| `title` | yes | empty or whitespace-only |
| `alt` | yes | all four `PhotoSchema` rules **plus** OD-2b's placeholder refusal (below) |
| `place` | no | present and empty/whitespace — absent is fine |

Behaviours worth naming:

- **Every finding at once.** `DispatchInputError.findings` carries all of them and `message`
  contains all of them. `validateDispatchInputs({})` returns four findings, one per required
  input, and does not mention `place`.
- **Nothing is normalised into validity.** Values come back byte-for-byte as submitted.
- **Undeclared inputs are refused by name.**
- **A hostile value cannot flood a public log** (T-04-40): findings are capped at 700 characters
  and `assertStagingKey` truncates the key it quotes at 200. Asserted with an 811-character
  key — the finding does not contain it and is shorter than it.
- **The required set is derived, and that is demonstrated, not claimed.** `assertRuleCoverage` runs
  at module load and is exported so the test can hand it a *mutated* `DISPATCH_INPUTS`: adding
  `shutter_delay` makes the module unloadable by name; removing `place` does too.

### The `place` boundary, recorded rather than glossed

`${{ inputs.place }}` renders as `''` both when the caller omitted `place` and when the caller
passed `""`. The two are indistinguishable at the `env:` boundary, and only the first is a thing a
caller can mean, so `inputsFromEnv` treats an empty **optional** variable as absent. An empty
**required** variable is never dropped — it is passed through so its own rule says what is wrong
with it. Measured end to end (zsh):

```
INPUT_PLACE=''              -> exit 0, "4 of 5 declared input(s) supplied and accepted"
INPUT_PLACE='   '           -> exit 1, "place: place is empty or whitespace only…"
INPUT_PLACE='Ranganathittu' -> exit 0, "5 of 5 declared input(s) supplied and accepted"
```

---

## 2. The App token: how it is wired, and what remains `user_setup`

**OD-8 → Option A**, as resolved in `04-RESEARCH.md`'s resolutions block. The measured reason: a
push made with `GITHUB_TOKEN` triggers no workflow, and `deploy.yml` deliberately has neither a
`push` nor a `workflow_dispatch` trigger — so a pipeline commit made with the default token lands
in the manifest and deploys nothing, and criterion 5 is unreachable. An App installation token
triggers `push` normally, so `push → CI → workflow_run → Deploy` runs unchanged and stays the
**only** deploy path.

```yaml
- name: Mint the pipeline's push token
  id: push-token
  uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
  with:
    app-id: ${{ secrets.PHOTO_PIPELINE_APP_ID }}
    private-key: ${{ secrets.PHOTO_PIPELINE_APP_PRIVATE_KEY }}
```

The SHA was resolved live rather than copied: `gh api repos/actions/create-github-app-token/git/ref/tags/v3.2.0`
returned `commit bcd2ba49218906704ab6c1aa796996da409d3eb1`, dated 2026-05-12, message
`chore(main): release 3.2.0 (#370)`.

`permissions: contents: read` at workflow level, and **no `contents: write` anywhere** — the push
uses the App token, so a write grant on `GITHUB_TOKEN` would be a standing permission nothing uses.
Rule A11 fails if one is ever added.

**Option C was not drifted toward.** The workflow is not in `deploy.yml`'s `workflow_run.workflows`
list and the header says why, in the file, with the "two deploy paths, one gated" reasoning.

### Outstanding `user_setup` — Akhil provisions, 04-10 confirms

| what | where |
|---|---|
| Create the GitHub App | GitHub → Settings → Developer settings → GitHub Apps |
| Install it on `akhil-saxena/portfolio` with **`Contents: Read and write` and nothing else** | GitHub App settings → Install App |
| `PHOTO_PIPELINE_APP_ID` (repository secret) | the app's App ID |
| `PHOTO_PIPELINE_APP_PRIVATE_KEY` (repository secret) | the app → Generate a private key → the whole PEM |

**Nothing in this plan assumes they exist.** Until they do, the token step fails — and that failure
is the report that the setup is outstanding, which is written into the workflow header so nobody
"fixes" it by falling back to `GITHUB_TOKEN`. No secret value was printed, echoed or committed;
only the two names appear anywhere.

---

## 3. The `alt` validation wiring

**Imported, not re-implemented.** `scripts/lib/dispatch-input.mjs` calls
`altRefusalReason({ alt, title, filename })` from `src/lib/photo-pipeline.ts`, which owns
`ALT_MIN_LENGTH` (15), `ALT_PLACEHOLDER_EXACT` (9 whole-value tokens) and
`ALT_PLACEHOLDER_LEADING` (4 markers, each requiring following punctuation). `filename` is the
submitted `temp_key`, so "the camera's file name pasted into the alt field" is caught for free.

**Two rules had to be re-stated, and the reason is measured, not stylistic.**
`altRefusalReason` does **not** carry `PhotoSchema`'s role-prefix rule (`image of` / `photo of` /
`picture of`) or its `[AKHIL-` brief-marker rule, and this module **cannot import the schema**:
`src/schemas/photo.ts` imports the origin module extensionless, which Vite resolves and Node's ESM
resolver does not, so importing it would make the module unloadable under plain `node` on the
runner (measured by 04-02, written up in `photo-pipeline.ts`'s header). So the two rules are
re-stated in `dispatch-input.mjs` — and the agreement is **asserted rather than assumed**: the unit
test feeds each rejected value to the real `PhotoSchema` and requires the schema to refuse it too.
Duplication in the safe direction; everything refused here is refused there, later and more
expensively.

### The OD-2b gap is measured in the suite, side by side

```
schemaAccepts('TODO')                        -> true    (the gap OD-2b exists to close)
validateDispatchInputs({ …, alt: 'TODO' })   -> refused  "alt is the placeholder \"TODO\"…"
```

### The ACCEPTED residuals are pinned as hard as the refusals

All three pass, deliberately, and are asserted so a later "improvement" cannot tighten the rule
silently:

- `"TODO add real alt text here"`
- `"XXX marks the spot where the tide turned over the flats"`
- `"??? what even is this shot, the meter was reading two stops under"`

Alongside them, seven legitimate captions are asserted to pass — including
`"Todo el mundo crowds the square as the evening light drops behind the cathedral."`, the Spanish
caption whose existence is the reason the first residual stays open — plus **all 39 reviewed `alt`
values from the committed manifest**, iterated as a corpus:

```
[dispatch-input] alt corpus: 39 reviewed value(s), 0 refused
```

**The rule was not changed.** Nothing was silently improved, so no proof of the 39-plus-seven was
needed beyond pinning it — which was done anyway, because that pin is what makes a future change
prove itself.

---

## 4. The four-step proof per gate, with the shell each control ran in

**Shells, stated as the plan requires.** Every local control ran in **zsh** (`$0` printed
`/bin/zsh`). The one deliberate exception is the injection probe, which ran in **GNU bash 5.3.9**
under an explicit `bash -c`, because the thing being measured is bash's behaviour. No
`${PIPESTATUS[0]}`, no `( cmd && R=0 || R=1 )`, no bare `grep -c` was used anywhere; exit codes
were captured with `if cmd; then R=0; else R=1; fi`.

### Step 1 — PLANT THE DEFECT (ten, not seven)

Run in a **`git clone --no-hardlinks` sandbox** of the committed repository (never a `cp -r`), with
`node_modules` symlinked in. The plan asked for seven; the contract test grew three more rules
(A7, A10, A11), so ten were planted. Each produced **exactly one** finding, carrying its own rule
id. Verbatim `Received:` line per plant:

| plant | exit | finding |
|---|---|---|
| A1 add a push trigger | 1 FAIL | `A1: triggers are ["push","workflow_dispatch"]; the only permitted trigger is workflow_dispatch. A push or schedule trigger here is a second way in.` |
| A2 rename one input | 1 FAIL | `A2: inputs ["tempkey","category","title","alt","place"] do not equal DISPATCH_INPUTS ["temp_key","category","title","alt","place"], name for name and in order` |
| A4 `cancel-in-progress: true` | 1 FAIL | `A4: concurrency.cancel-in-progress is true; it must be false. A run cancelled mid-publish is how the bucket and the manifest end up disagreeing — same setting and same reason as deploy.yml.` |
| A5 repin an action to a tag | 1 FAIL | `A5: actions/setup-node@v7 is not pinned to a full 40-character commit SHA. A tag is a mutable pointer whoever controls the action's repository can move.` |
| A6 delete `fetch-depth` | 1 FAIL | `A6: the checkout step sets no fetch-depth. The default is a depth-1 shallow clone, which broke Deploy at run 32941901693 on 2026-08-26; the depth must be chosen in writing.` |
| A7 delete the permissions block | 1 FAIL | `A7: no workflow-level permissions block, so the job inherits the repository default` |
| A8 move a secret to job level | 1 FAIL | `A8: job process carries a secrets.* reference outside its steps, so every step in it — and every third-party action any of them invokes — can read it` |
| A9 put an input inside a `run:` | 1 FAIL | `A9: a run: block interpolates ${{ inputs.alt…. Actions substitutes that text before bash starts, so caller-supplied input in that position is shell source (T-04-35). Pass it through env: and read it as a variable.` |
| A10 add a legacy origin literal | 1 FAIL | `A10: the workflow contains a legacy development origin literal` |
| A11 grant `contents: write` | 1 FAIL | `A11: permissions grants contents: write to GITHUB_TOKEN. The pipeline pushes with the App installation token (OD-8 A), so a write grant here is a standing permission nothing uses and nobody re-reads.` |

Control before the first plant: `exit=0 PASS`. Control after the last restore: `exit=0 PASS`.
The ten plants also live **inside the test file** as permanent assertions
(`ruleIds(findings)` must equal exactly `['A6']` and so on), so this is a regression guard rather
than a one-off demonstration.

### Step 2 — NOTHING TO CHECK

Both forms, physically, in the sandbox:

```
file emptied  -> Error: workflow-contract: …/process-photos.yml is empty. Every rule below would pass over nothing.
file deleted  -> Error: workflow-contract: …/process-photos.yml could not be read — ENOENT… An unreadable workflow is a failure, never an absence of findings.
```

Also asserted in-suite: `auditWorkflow('')` returns exactly `['A0']`; so does a comment-only file;
and a document where `on:` resolved to the boolean `true` (the YAML 1.1 trap) reports `A0` rather
than passing over an absent trigger object.

The same "guard against nothing" shape is in the dispatch-input suite: the `findingsFor` helper
**throws if the validator accepted** the value, so no refusal test can pass by the validator having
no opinion.

### Step 3 — PASS ON CORRECT CODE, with counts rather than a bare PASS

```
[workflow-contract] .github/workflows/process-photos.yml: 1 trigger(s), 5 input(s), 1 job(s),
                    6 step(s), 3 uses: entr(ies), 3 run: block(s) — 0 finding(s)
[workflow-contract] secret-bearing step(s): Mint the pipeline's push token
[dispatch-input]    alt corpus: 39 reviewed value(s), 0 refused
```

Printed with `process.stdout.write`, never `console.log` — hazard 7 (`console.log` prints nothing
under this vitest setup) was honoured in both new files.

### Step 4 — WALK-THROUGH ATTEMPT: satisfy A9 and still be injectable?

**Attempted:** route the input through `env:` (which A9 permits) and then reference `$INPUT_ALT`
unquoted inside a `run:` block. A9 does **not** flag it. Measured in **GNU bash 5.3.9**, rather
than assumed:

```
$ ALT='$(touch /tmp/gsd-probe-injection)' bash -c 'echo $ALT'
$(touch /tmp/gsd-probe-injection)
NOT created — parameter expansion is not re-parsed as code

$ ALT='$(touch /tmp/gsd-probe-eval)' bash -c 'eval "echo $ALT"'
PWNED via eval: file exists
```

**Finding:** A9 not flagging the `env:` form is the rule being *right*, not a hole — bash expands a
parameter, it does not re-parse the result as code. The residual that genuinely remains is
`eval "$VAR"` or `sh -c "$VAR"`, which A9 does not look for. That boundary is written into the
contract test's header rather than left as false coverage, and the last assertion in the file pins
that the string `eval ` is absent from the workflow — which is the part a test can actually hold.

### `gate:origin`, before and after

```
before:  scanned 94 in-scope file(s) … .github/** (2)     exit 0
after:   scanned 99 in-scope file(s) … .github/** (3)     exit 0
```

`.github/**` is under **SCAN**, and its count increased by exactly one. Note the sequencing that
matters: immediately after writing the file the count was still `(2)`, because the gate lists
tracked files via `git ls-files` and an untracked file is not scanned — its own documented blind
spot 1. The `(3)` reading is from **after** the commit.

The plan's `done` grep, run in zsh:

```
grep -nE "'temp/'|\"temp/\"|abstract|architecture|images\.akhilsaxena\.com|r2\.dev" \
     scripts/lib/dispatch-input.mjs   ->  no matches
```

---

## 5. Deviations from the plan

### [Rule 2 — machine-checkable in place of unverifiable] The `done` grep's "outside comments"

**Found during:** Task 2. The plan's `done` said the grep must return nothing *"outside comments"*,
which the validation notes correctly flag as not machine-checkable.
**Resolved by making it stricter rather than by hand-waving:** `scripts/lib/dispatch-input.mjs`
contains those strings **nowhere at all**, comments included, and the unit test asserts exactly
that by reading its own source. The workflow was held to the same bar and also contains no staging
prefix and no origin literal. No human eye is required.
**Commit:** `dc1d55c`

### [Rule 2 — three rules added] The contract test has eleven rules, not ten

**Added:** A0 (the workflow parsed, and `on:` survived as a string rather than the YAML 1.1
boolean `true` — without this, rules A1–A3 would pass over an absent object) and A11 (no
`contents: write` grant on `GITHUB_TOKEN`, which is the executable form of the plan's instruction
that a write left in "just in case" is a standing grant nobody re-reads). A7's plant was added
too. All three are planted and proven.
**Commit:** `3095422`

### [Rule 2 — ordering, security and cost] Validation runs *before* `npm ci` and before the token

The plan's step list put `npm ci` before the validate step. It is the other way round, for two
reasons, both checkable:

1. `dispatch-input.mjs` imports only `node:` builtins and `src/lib/photo-pipeline.ts`, so it needs
   no installed dependency. **Measured in a `git clone` with no `node_modules` at all**: the CLI
   ran under bare `node` and exited 0. A bad dispatch now costs a checkout, not an install.
2. A bad dispatch never reaches the step that mints a credential.

The token step is also **last**, not first: the whole argument for option A over a PAT is that the
credential is short-lived, and a token minted at the top of a job that then spends minutes encoding
images is short-lived only on paper. 04-09 must keep it adjacent to the push. A contract assertion
pins the order (`validate` before `install` and before `mint`).
**Commit:** `3095422`

### [Rule 2 — widened, with the reason] A8 permits a secret in a step's `with:`, not only its `env:`

The plan worded assertion 8 as "only inside a step's `env:`". `actions/create-github-app-token`
takes its credentials through `with:` — that is the action's only input surface. The security
property being asserted is *step scope*, which `with:` satisfies identically, so A8 checks that no
`secrets.` reference appears at **workflow level or job level** and that every occurrence is inside
a step. A separate assertion pins that **exactly one** step carries a secret and prints which:
`Mint the pipeline's push token`.
**Commit:** `3095422`

### [Rule 1 — the plan's Task 2 text is stale] `alt: "TODO"` is now refused

Task 2's `<behavior>` said `"TODO"` is accepted "and that is the measured, intended behaviour".
That predates **OD-2b**, decided in the same review and recorded in the resolutions block, which
requires refusing placeholder-shaped `alt`. Both facts are asserted side by side: `PhotoSchema`
**accepts** `alt: "TODO"` (the measurement that justifies OD-2b) and `validateDispatchInputs`
**refuses** it. Wave 1's validators were imported, never re-copied.
**Commit:** `dc1d55c`

### [Recorded, not fixed] `yaml` is an undeclared transitive dependency

The contract test parses with `yaml` 2.9.0, which hoists to the top of `node_modules` from `vite`
(via `astro`) and `@astrojs/yaml2ts` and is `devOptional: true` in the committed lockfile — so
`npm ci` installs it deterministically and CI has it, but **nothing in `package.json` asks for it**.
It could not be added here: `package.json` belonged to a plan running in the same wave. The failure
mode is a loud `Cannot find module 'yaml'` at import, never a vacuous pass, which is why this was
shipped and recorded rather than worked around with a hand-rolled parser.
**Follow-up for whoever next owns `package.json`: promote `yaml` to a direct devDependency.**
**Commit:** `2adacc9`

### No REFACTOR commit for Task 2

RED → GREEN produced a module that needed no cleanup; a refactor commit was not manufactured to
satisfy the shape of the cycle. The RED (`9126de6`) and GREEN (`dc1d55c`) gates are both present.

---

## 6. Contradicting the plan or the research

1. **Plan Task 2's "`TODO` is accepted"** contradicts **OD-2b** in the research resolutions block.
   The resolutions block is authoritative and was followed. Detailed above.
2. **OD-2b as written in the research** is broader than what Wave 1 shipped. The resolution text
   demands refusing "a value equal to the filename, a value equal to the title verbatim, and
   anything shorter than ~15 characters" **and** `???`, `XXX` and the bare words — all of which are
   implemented — but the leading-marker rule was narrowed in 04-02 to require *following
   punctuation*, which is what leaves the three ACCEPTED residuals open. That narrowing is already
   recorded in `STATE.md` and in `photo-pipeline.ts`'s own comment. **Not changed here**, and the
   corpus pin makes any future change prove itself.
3. **The plan's `user_setup` block lists `PHOTO_PIPELINE_TOKEN`** as an OD-8 option B item. OD-8
   resolved to A, so that variable is **not** referenced anywhere and should not be provisioned.
4. **`gh workflow list` does not yet show `Process Photos`** — recorded as required. The commit is
   local; `main` is ahead of `origin/main`, and pushing was not asked for. Current remote state:
   `CI`, `Deploy`, `Dependabot Updates`. The workflow will appear on the first push.
5. **The workflow has NOT been dispatched.** 04-09 has not landed; the YAML was parsed and
   validated statically instead, as instructed.

---

## 7. Verification

| command | result |
|---|---|
| `npx vitest run --project unit test/pipeline/dispatch-input.unit.test.ts` | 100 passed |
| `npx vitest run --project unit test/pipeline/workflow-contract.unit.test.ts` | 24 passed |
| `npx vitest run --project unit` | **815 passed / 15 files**, exit 0 |
| `npm run gate:content` | all four gates PASS, exit 0, `.github/** (3)` |
| `npm run check` | exit 0 |
| `npm run typecheck` | 0 errors, 0 warnings |
| `npm test` | 872 passed / 873 — see below |

**The one failure is not this plan's.** `test/pipeline/concurrent-push.node.test.ts` (case 5 iii)
fails against `scripts/lib/git-publish.mjs` — both files belong to **04-06**, which was running
concurrently in the same wave. Verified not to be caused by these changes: the SHA in its error
(`459a41a…`, then `a967a06…` on a re-run) is not an object in this repository — it belongs to the
throwaway remote that test builds — and neither file is imported by, or imports, anything this plan
created. Left alone per the scope boundary; recorded here rather than in `deferred-items.md`,
because it is another plan's live work rather than a deferred discovery.

---

## Known Stubs

One, and it is the plan's declared scope boundary rather than an accident:

| file | what | resolved by |
|---|---|---|
| `.github/workflows/process-photos.yml` | the final step, `Pipeline steps land in plan 04-09 — this run validated inputs only`, prints what was not done and exits 0. The R2 read, derivation, upload, liveness check, manifest commit and staged-object delete are absent. | **04-09**, which replaces this step |

The step name is deliberately the boundary statement, so a run's step list says where the file
stops instead of implying a publish that did not happen.

## Threat Flags

None. Every security-relevant surface this plan introduces is in the plan's own `<threat_model>`:
T-04-34 (`temp_key` → object path), T-04-35 (`${{ inputs }}` → bash), T-04-36 (the push
credential), T-04-37 (a second deploy path), T-04-38 (action pinning), T-04-39 (credential scope),
T-04-40 (logging a hostile input) and T-04-41 (concurrent dispatches). Each has an executable
mitigation named above.

## Self-Check
: PASSED

All five artefacts exist on disk with the line counts above (each clears its `min_lines`:
workflow 202 ≥ 90, validator 439 ≥ 90, contract test 576 ≥ 90). All four commits resolve in
`git log`:

- `9126de6` test(04-08): failing spec for the dispatch input validator — RED
- `dc1d55c` feat(04-08): validate every dispatch input before any side effect — GREEN
- `3095422` feat(04-08): the Process Photos dispatch workflow, with a contract test that parses it
- `2adacc9` docs(04-08): record that the YAML parser is an undeclared transitive dependency
