---
phase: 05-public-site
plan: 03
subsystem: content-schema
tags: [oq-1b, pub-02, metric, placeholder-gate, migration, resume]
requires:
  - "05-01 — the workerd finding, and resolveDsTokens' {{…}} refusal that this gate is the artefact-side half of"
  - "05-02 — ProjectSchema settled; the one-commit-for-schema-and-data discipline"
provides:
  - "ExperienceEntry.metric — required { value, label } (OQ-1b)"
  - "Three approved employment metrics in data/resume.json, each traced to a reviewed bullet"
  - "scripts/migrate-experience-metric.mjs — idempotent, provenance-checked, refuses rather than guesses"
  - "scripts/assert-no-unresolved-placeholders.mjs — the OQ-1b build refusal over rendered HTML"
  - "test/content/experience-metric.unit.test.ts — 30 cases"
affects:
  - "05-09 (renders the Work employment band; its Task 1 runs this gate under set -e)"
  - "05-14 (owns the gate:placeholders wiring into gate:content — NOT done here)"
  - "05-13, 05-15 (unblocked: no {{…}} token was ever landed)"
tech-stack:
  added: []
  patterns:
    - "provenance as a control: the migration re-checks that each metric's supporting bullet is still on disk, and prints the bullet index"
    - "the gate reads the ARTEFACT (dist/), because 'survived into a rendered route' is a fact there and an inference in src/"
    - "an assert-*.mjs gate guards its body behind a script check so a test can import its detector"
key-files:
  created:
    - scripts/migrate-experience-metric.mjs
    - scripts/assert-no-unresolved-placeholders.mjs
    - test/content/experience-metric.unit.test.ts
  modified:
    - src/schemas/resume.ts
    - data/resume.json
key-decisions:
  - "Checkpoint resolved as approve-sketch: the three sketch values land as final, so no {{…}} token was ever stored and waves 4-7 are not blocked"
  - "No placeholder refusal in the schema — deliberately, per plan: a stored token is a legitimate intermediate state, a rendered one never is"
  - "The gate enumerates no token names; any {{…}} in shipped HTML fails"
  - "The entity-encoded walk-through was CLOSED with a second rule; the split-brace one is an OPEN, pinned residual"
  - "05-02's copyWithNoLiteralComponentFigure was considered and is NOT applicable — it refuses a component count, which no employment metric is"
requirements-completed: [PUB-02]
duration: ~1h
completed: 2026-08-28
---

# Phase 5 Plan 03: The Employment Metric and the Placeholder Refusal — Summary

`ExperienceEntry` gained a required `metric`, the three approved figures are on disk, and a
`{{…}}` token that reaches rendered HTML now fails the build. **No placeholder was landed**, so
05-09's `assert-no-unresolved-placeholders.mjs dist` under `set -e` will not trip and waves 4, 5, 6
and 7 are not blocked. The guard is built and standing; it simply is not tripped today.

**Two things in the plan did not survive measurement**, one of them a wrong filename in the
objective and one a regex that does not mean what it says. Both below.

---

## The checkpoint, taken as decided

**Option `approve-sketch`.** The three pairs, verbatim as stored:

| id | `metric.value` | `metric.label` | supporting bullet, index **derived from the file** |
|---|---|---|---|
| `brevo` | `+15%` | `CONVERSION` | bullet **1** of 6 — "Improved **conversion by 15%** by transforming a one-page checkout for **2.5M+ users** into a 3-step flow" |
| `pharmeasy` | `4K+` | `FRANCHISES` | bullet **1** of 3 — "Modernized the UX for the B2B portal orders page, enhancing productivity for **4K+ franchises** across **4 countries**" |
| `maq` | `6×` | `FASTER PIPELINES` | bullet **4** of 4 — "Improved pipeline execution time by **6×** by replacing Power Automate workflows with Azure Data Factory" |

`6×` is U+00D7 MULTIPLICATION SIGN, matching the bullet it comes from — not the letter `x`.

**The bullet indices are computed, not asserted.** The migration finds each metric's supporting
sentence in that record's own bullets and prints where it found it:

```
migrate-experience-metric: 3 record(s) in data/resume.json
  brevo      +15%  CONVERSION        ← bullet 1 of 6
  pharmeasy  4K+   FRANCHISES        ← bullet 1 of 3
  maq        6×    FASTER PIPELINES  ← bullet 4 of 4
```

That output is the measurement that kills option 2. Two of three are bullet 1 and MAQ's is bullet
4, so a first-bold-span derivation returns `7+ data sources` for MAQ — a true fact about the job
and not its result. **No derivation was implemented.**

---

## The schema diff

`src/schemas/resume.ts`, `ExperienceEntrySchema` only:

```
  id, company, role, ...dateFields, location, logo, url, bullets,
+ metric,  z.strictObject({ value: z.string().min(1), label: z.string().min(1) })
  .superRefine(checkPeriod)
```

`EducationEntrySchema`, `SkillGroupSchema` and `ResumeSchema` are **unchanged**. Required, not
optional — all three records carry one and §10 has no employment row without it.

**No placeholder-shaped refusal in the schema**, per the plan's instruction, and the reasoning is
written into the field's own comment rather than left in the plan: whether a placeholder reaches a
reader is a fact about *rendered output*. A stored token is a legitimate intermediate state — it is
exactly what option `defer` would have committed — while a rendered one never is. The refusal
therefore lives on `dist/`, and the *stored* side is asserted by the unit suite instead, which is
the layer where it is a consequence of the decision rather than a rule.

### On 05-02's `copyWithNoLiteralComponentFigure` — considered, correctly not reused

The brief asked me to reuse it if `metric` needed the same protection. **It does not, and applying
it would be a category error.** That helper refuses a *literal component figure* (`\d+[- ]component`)
so a stale design-system count cannot be hand-typed back into project copy. `+15%`, `4K+` and `6×`
are employment results; none is a component count and no label mentions components. A rule that
cannot fire on the data it guards is decorative, and this repository already has eleven of those.
No second copy of the helper was written, and the helper was not touched.

---

## Idempotence, on disk

```
pre-migration   54590f20d9c2df547e5cc873ec75c8c3e27a7eb9d5227d1df002822d1570fb57
run 1           ba04d943b499e611e9a4a0fcdca67dce10c9d6aaa91da86ee584f7a1a1352a27
run 2           ba04d943b499e611e9a4a0fcdca67dce10c9d6aaa91da86ee584f7a1a1352a27   ← byte-identical
```

Run under `bash` 5.3.9(1)-release, using the plan's own verify command verbatim (`sha256sum` does
exist on this machine, at `/sbin/sha256sum`). The second run reports `data/resume.json already up
to date`. A third check run (`--check`) exits 0.

`git diff` on the file is **15 insertions, 3 deletions** — the three `metric` objects and the three
`]` lines that gained a comma. `skills` and `education` are untouched.

Idempotence is also measured **in process**, over the transform's own output, not with
`git diff --quiet` (03-04 shipped that and it read the changes the first run had just made).

---

## Every gate proven able to fail

**Shell for every control below: `bash` 5.3.9(1)-release (`/opt/homebrew/bin/bash`), invoked
explicitly.** The interactive shell here is zsh and Actions runs bash. No `${PIPESTATUS[0]}` and no
`( cmd && R=0 || R=1 )` appears anywhere; every control uses `if node …; then R=0; else R=$?; fi`.
**No verify step ran `git add`** — 05-05 was committing to this index throughout (its `71d7902` and
`d305905` landed between my two commits).

### A. The placeholder gate — the four required controls, plus three more

| # | Control | Exit | Verdict |
|---|---|---:|---|
| 1 | **PLANTED DEFECT** — HTML holding `{{metric.value}}` | **1** | names file, line and token |
| 2 | **NOTHING TO CHECK** — empty directory | **1** | "scan root matched no HTML" |
| 3 | **CORRECT OUTPUT** — HTML holding `+15% CONVERSION` | **0** | PASS |
| 4 | **WALK-THROUGH** — three attempts | — | see below |
| 5 | **NOTHING TO CHECK** — missing directory | **1** | "scan root is missing or is not a directory" |
| 6 | **NOTHING TO CHECK** — empty-string argument | **1** | refuses; `path.resolve(cwd, '')` is cwd |
| 7 | **NOTHING TO CHECK** — one `.html` present, 0 bytes | **1** | "1 file(s) scanned, 0 bytes read" |

Control 1, verbatim:

```
==============================================================================
  BUILD REFUSED — OQ-1b: an unresolved placeholder reached rendered HTML
==============================================================================

  x …/bad/i.html:1: [PH-RAW] {{metric.value}}
      …<html><body><p>{{metric.value}}</p></body></h…

  1 finding(s) (1 occurrence(s)).
  Open question OQ-1b; requirement PUB-02; threat T-05-03-01.
```

Control 2, verbatim — a **refusal**, not a pass:

```
  x …/empty: scan root matched no HTML
      a gate that read nothing is indistinguishable from a gate that found nothing. No file
      under it matched .html, so this run checked nothing and cannot pass.
```

Control 3, verbatim:

```
assert-no-unresolved-placeholders: PASS
  scanned 1 file(s) (48 bytes) matching .html
  self-test: 2/2 rules flagged every canary and ignored every anti-canary; 12 canaries checked
  rules: PH-RAW, PH-ENTITY
  no token names are enumerated — any {{…}} in shipped HTML is a failure
```

### The walk-through — three attempts, one closed, one caught, one open

| Attempt | Outcome |
|---|---|
| `&#123;&#123;metric.value&#125;&#125;` — HTML-entity encoded | **CLOSED.** Caught by a second rule, `[PH-ENTITY]` |
| a token inside an HTML comment | **CAUGHT** by `[PH-RAW]` — the scan reads text, not a parsed DOM |
| a token split across a line break **between its two braces** | **GETS THROUGH** — open residual |

**The entity hole was closed rather than recorded.** `[PH-ENTITY]` decodes the six spellings a
browser paints as a brace — `&#123;`/`&#125;` with any leading zeros, `&#x7b;`/`&#x7d;` in either
case, and the HTML5 named `&lbrace;`/`&lcub;`/`&rbrace;`/`&rcub;` — then applies the same detector,
per line so line numbers stay exact. It also catches the **mixed** form `{&#123;metric.value}}`,
which neither rule alone would see. It correctly does **not** fire on `&amp;#123;&amp;#123;`, which
renders as visible text and is not this gate's failure.

**The split-brace residual is OPEN and deliberate.** The rule that would close it, `/\{\s*\{/`, is
a false-positive risk against inline `<style>` and minified inline `<script>`, and a gate that
fires on correct output gets switched off rather than obeyed (05-01's own lesson). It is also not
reachable by the mechanism this gate exists for — a stored token arrives as one string and is
emitted contiguously. Recorded in the gate's own header as blind spot 1 **and pinned by a test**
that asserts the token is *not* detected, so if anyone closes it they update the test deliberately
instead of the residual rotting in prose. Three further blind spots are recorded in the header:
double-escaped entities (not a hole), text assembled in the browser (05-15's Playwright audit is
the right tool), and non-HTML artefacts (05-13's sitemap).

### B. The gate's self-test, proven able to fail in both directions

Run against copies of the script with the detector mutated; the real file was never edited.

| Mutation | Result |
|---|---|
| detector made **blind** (`/\{\{\{\{/`) | `SELF-TEST FAILED`, exit **1**, names all 7 unflagged canaries across both rules |
| detector made **too broad** (`/\{/`) | `SELF-TEST FAILED`, exit **1**, names both flagged anti-canaries |

Both abort **before** the scan, so a silently-broken rule cannot present as a clean tree.

### C. The schema requirement, through the real build

| # | Control | Exit |
|---|---|---:|
| 1 | **CORRECT CODE** — the migrated data | **0** |
| 2 | **PLANTED** — `metric` deleted from `pharmeasy` | **1** |

Control 2, verbatim — it names the file, the record by its own identifier, and the field:

```
  BUILD REFUSED — a file in data/ does not match the schema in src/schemas
content set: REFUSED — 1 finding(s)
  ✖ [SCHEMA-resume] data/resume.json → pharmeasy — PharmEasy [experience[1] of 3] → metric:
      Invalid input: expected object, received undefined · expected object
  rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
```

`data/resume.json` was `cp`-backed-up and `shasum`-confirmed before any write, and restored by
re-running the migration with its sha256 re-checked against `ba04d943…`. **No `git checkout --`,
`git stash`, `git reset`, `git clean` or `git worktree` was used at any point.**

### D. The migration's own refusals — 12 controls, driven through its exported seams

Writes nothing: every control passes a clone to `migrateResume`, and the idempotence controls use
`runMigration`'s `transform` seam, which reads the file but never writes it.

| # | Control | Verdict |
|---|---|---|
| M1 | a record with **no table row** (a 4th job) | **REFUSES**, names the id and both directions |
| M2 | a **table row with no record** (typo id `pharmeasey`) | **REFUSES** |
| M3 | the supporting bullet rewritten — **provenance lost** | **REFUSES**: *"record "maq": no bullet contains the sentence this metric is derived from"* |
| M4 | an unknown key on a record | **REFUSES**: *"Refusing rather than dropping them"* |
| M5 | an empty `value` in the table | **REFUSES** |
| M6 | **NOTHING TO CHECK** — `experience` emptied | **REFUSES**: *"a pass that proves nothing"* |
| M7 | **NOTHING TO CHECK** — the table emptied | **REFUSES** |
| M8 | a duplicate experience id | **REFUSES** |
| M9 | **CORRECT CODE** — the real file and table | **PASS** |
| M10 | **DEFECTIVE CONTROL** — a transform appending a **constant** | **PASSES — proves nothing** |
| M11 | a transform that **READS what it rewrites** | **REFUSES**: *"the migration is NOT idempotent"* |
| M12 | **CORRECT CODE** — `runMigration` with the real transform | **PASS** |

**M10 is in the table on purpose.** The brief warned that 05-02's first two attempts at this
control were themselves defective, so the defective one was run rather than described: a transform
that appends a constant, or that ignores the incoming `metric`, is still idempotent and passes.
Only M11 — which reads the record's current value and concatenates — makes the comparison fire.
The seam is documented in the function's own docstring, including that warning, so the next author
does not have to rediscover it.

### E. The unit suite — 5 planted defects, each caught by name

| # | Plant | Assertions that fired |
|---|---|---|
| P1 | a stored value hand-edited (`+15%` → `+18%`) | *carries exactly the value/label pairs approved at the checkpoint* |
| P2 | **NOTHING TO CHECK** — `experience` emptied | **8 assertions red**, incl. *has a non-empty experience array — without this every assertion below is vacuous*. The suite **fails**; it does not go green over an empty corpus |
| P3 | `{{metric.value}}` stored in a metric | *stores no {{…}} placeholder in any metric string* + the pairs assertion |
| P4 | a metric added to the **education** record | *does NOT put a metric on the education record* + *accepts the committed file* |
| P5 | all three `evidence` sentences pointed at bullet 1 | *proves the FIRST-BULLET DERIVATION would be wrong — at least one is not bullet 1* |

**CORRECT CODE: 30 passed / 30.** All mutated files restored and re-hashed afterwards
(`data/resume.json` → `ba04d943…`, `scripts/migrate-experience-metric.mjs` → `abbb9b43…`).

P5 is the one worth keeping: it is the durable form of §15's rejection. Whoever proposes "we could
just derive this from the first bullet" gets a red test with the reason in its name.

---

## 🔴 Corrections to the plan and the UI-SPEC

1. **The plan's objective names the wrong file.** Line 66: *"These are ordinary editable content in
   `data/projects.json` once landed."* They are in **`data/resume.json`** — `data/projects.json` is
   05-02's five project records and has no `experience` array. The plan's own `files_modified`,
   `must_haves.artifacts` and task 2 all say `data/resume.json` correctly; only the objective's
   closing paragraph is wrong. Matters for Phase 7, which will wire the admin editor to whichever
   file this sentence sends it to.

2. **`(?!\{)` does not exempt a triple brace, and reading it as though it did would be wrong.** The
   plan specifies "fail on any occurrence of `{{` followed by anything other than `{`". Read
   quickly that forgives `{{{raw}}}`. Measured: it does not. In `{{{raw}}}` the match at offset 0 is
   skipped by the lookahead, the scan advances one character, and offsets 1–2 match with `r` next —
   the **overlapping** occurrence catches it. So the lookahead creates no hole. This is now asserted
   in the gate's self-test and in the unit suite rather than left as a comment, because an exemption
   that does not exempt is worth more as a pinned behaviour.

3. **The default scan root `dist` and the real asset root `dist/client` give identical results
   today** — both scan the same 2 files, because `dist/server` holds `.mjs` and no HTML. 05-01's
   correction (build output is `dist/client`, not `dist`) stands; it just does not change this
   gate's coverage. The plan's `<verification>` line `… .mjs dist` is correct as written.

4. **The plan's task-3 anti-canary description is ambiguous** — *"an anti-canary holding `{ x }` and
   `{{{raw}}}`-free prose"*. Implemented as: `{ x }` prose is an anti-canary, and `{{{raw}}}` is a
   **canary** (it must fire, per finding 2). Recording the reading taken.

5. **UI-SPEC §0.3 verified accurate.** `ExperienceEntrySchema` genuinely had no `metric`, and the
   three supporting bullets are on disk exactly as §14.5 quotes them, character for character
   including the `**` emphasis and the U+00D7 in `6×`.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The gate ran its scan at module scope, which would have killed the test run**
- **Found during:** Task 3, writing the unit suite.
- **Issue:** the plan's gate shape (following `assert-no-raw-html-sinks.mjs`) executes the self-test,
  argument parsing, scan and `process.exit(1)` at module scope. The plan also asks the unit suite to
  test the detector. Importing `findPlaceholders` would therefore have run a scan inside the vitest
  worker with `process.argv[2]` set to a vitest argument, and **called `process.exit` from inside the
  test process**.
- **Fix:** the body is now `export function main()`, invoked behind the same
  `pathToFileURL(process.argv[1]).href === import.meta.url` guard the migration scripts use. All
  seven gate controls were re-run after the change; behaviour is unchanged.
- **Commit:** `8903405`

**2. [Rule 2 — Missing critical functionality] `[PH-ENTITY]`, closing the entity walk-through**
- **Issue:** the plan asks only that the entity attempt be *recorded* as a residual. An
  entity-encoded token renders to the reader as a visible `{{metric.value}}` — the exact outcome
  OQ-1b exists to prevent — and closing it costs one rule with near-zero false-positive risk, since
  `&#123;&#123;` in real HTML means "display two braces".
- **Fix:** decode the six brace spellings per line, then apply the same detector; report the decoded
  context and say so. Canaries and anti-canaries added for it, and the double-escaped form is an
  explicit anti-canary so correct escaping is not flagged.
- **Commit:** `8903405`

**3. [Rule 2 — Missing critical functionality] The provenance is checked, not quoted**
- **Issue:** the plan's table of supporting bullets would have lived in a script header. The claim
  "every metric traces to reviewed copy" then stops being true the first time a bullet is
  rewritten, silently, and this whole plan rests on that claim.
- **Fix:** each table row carries the substring of its supporting bullet, matched against that
  entry's own bullets on every run, with the 1-based index printed. Control M3 proves it refuses.
  It deliberately does **not** require the metric's own text to appear in the bullet —
  `FASTER PIPELINES` compresses "Improved pipeline execution time", and such a rule would refuse
  the reviewed wording.
- **Commit:** `6e4a6ac`

**4. [Housekeeping] Biome formatting on three files**
- `biome check --write` was run on **only my own files, by explicit path** — never repo-wide, per
  05-05's note in `deferred-items.md` that `biome check --write` on a shared index is the 04-06
  sweep with a different tool.

### Deliberate non-actions

- **`package.json` untouched.** `git diff --stat -- package.json package-lock.json` is empty. The
  gate is invoked by path in every proof above. **05-14 owns `gate:placeholders`.**
- **No schema-level placeholder refusal**, per the plan, with the reasoning written into the field.
- **`copyWithNoLiteralComponentFigure` not reused and not touched** — see above.
- **No derivation implemented**, in any form.
- **`STATE.md` and `ROADMAP.md` untouched**, per instruction.
- **`astro.config.mjs`, `src/content.config.ts`, `.github/**` untouched.**
- **05-05's files untouched** (`src/lib/photo-srcset.ts`, `layout-ladder.ts`).

---

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** |
| `astro check` | **0 errors**, 6 hints, 104 files |
| `npx vitest run` (full suite) | **1204 passed / 1204**, 33 files (was 1174/32; +30) |
| `npx vitest run test/content/experience-metric.unit.test.ts` | **30 passed / 30** |
| `npm run check` (biome + prettier) | **exit 0** |
| `node scripts/assert-no-unresolved-placeholders.mjs dist` | **exit 0** |
| `node scripts/migrate-experience-metric.mjs --check` | **exit 0** (no change) |
| `git diff --stat -- package.json package-lock.json` | **empty** |
| `git status --short` | **clean** |

**On the `dist` run meaning less than it looks like.** It exits 0 over the **two** routes that exist
today (`/` and `/404`). That proves the gate runs clean against real build output and that nothing
currently ships a token — it does **not** yet prove anything about `/work`, which does not exist.
05-09 renders the employment band and 05-14 wires the gate into `gate:content`; those are where it
starts guarding the thing it was built for.

**A wave-mate observed this plan mid-flight.** 05-05's `d305905` records that
`test/pipeline/partial-failure.node.test.ts` overlays the *uncommitted* working tree, so while
`src/schemas/resume.ts` required `metric` and the migration had not yet run, 3 of 10 pipeline cases
went red on an otherwise-green tree. That is the B4b interference the plan's `depends_on` predicted,
extended to the full suite. It is why the schema and the data landed in **one** commit, and the
1204/1204 above was measured after that commit.

---

## Known Stubs

None. All three records carry real approved values; no `{{…}}` token was stored anywhere.

## Threat Flags

None. No network endpoint, auth path or schema change at a trust boundary. `T-05-03-01` is
discharged in both halves: the schema makes the field impossible to omit silently (control C2) and
the gate makes a placeholder impossible to render silently (controls A1–A7). `T-05-03-02` remains
`accept` — the three figures are already public in the reviewed bullets on the same page.

---

## For the plans that depend on this one

- **`metric` is `{ value, label }`, both required.** §10: value in `--ochre-d-strong`, label in the
  ink ramp, same mono size, right-aligned. Do not concatenate them into one string.
- **The gate is NOT wired into `package.json`.** 05-14 must add `gate:placeholders` and chain it
  into `gate:content`. Until then it only runs where a plan invokes it by path — 05-09 Task 1 does.
- **Point it at `dist`** (the default). `dist/client` also works and gives the same answer.
- **It is importable now**: `findPlaceholders` and `decodeBraceEntities` are exported, and importing
  the module does **not** run a scan.
- **Do not weaken it to a source scan.** Reading the artefact is the whole design; a source scan
  answers a different and weaker question.
- **The split-brace residual is open**, pinned by a test. Read the gate's header before "fixing" it.
- **If you add a fourth job**, the migration refuses until the table gains a matching row *and* that
  row's supporting sentence is in that record's bullets. That refusal is the feature.

---

## Self-Check: PASSED

All five claimed files exist on disk. `git ls-files --error-unmatch` confirms both new tracked files
are tracked rather than merely present — asserted that way, not with `git add`, because 05-05 shared
this index (04-06 swept six of 04-04's files exactly that way). Both claimed commits (`6e4a6ac`,
`8903405`) exist in `git log`. Working tree clean.

A case-insensitive sweep of both commits for `claude|anthropic|co-authored-by|generated with|ai
assistant` across author, committer and message returns **0**. Author and committer on both are
`Akhil Saxena <saxena.akhil42@gmail.com>`, verified rather than set.
