---
phase: 04-photo-pipeline-actions-half
plan: 01
subsystem: content
tags: [wave-0, test-rescoping, cohort-vs-floor-vs-invariant, anti-vacuity, fixtures]

requires:
  - phase: 03-04
    provides: "the 39-record merge from 00-PHOTO-CONTENT.md, and test/content/photo-enrichment.unit.test.ts as its byte-identity proof"
  - phase: 03-06
    provides: "src/schemas — PhotoSchema, PhotoManifestSchema, validateContentSet"
  - phase: 03-08
    provides: "the astro:config:done content-gate, and test/content/build-fails-loudly.node.test.ts"
  - phase: 03-01
    provides: "scripts/assert-no-r2dev-urls.mjs — the floor shape this plan copied, and the test/** SKIP rule that let test/pipeline/fixtures/ exist without a new gate rule"
provides:
  - "A test suite that accepts a 40th photograph: 15 assertions across 4 files classified as cohort, floor or invariant, with the class and its reason written beside each one"
  - "scripts/migrate-photo-origin.mjs re-scoped off its exact-39 equality — --verify now runs, and can see a manifest that lies about the bucket, at any corpus size"
  - "test/pipeline/fixtures/fortieth-photo.ts — FORTIETH_PHOTO and appendFortieth, the growth control 04-05 and 04-09 import"
  - "test/pipeline/manifest-growth.unit.test.ts — 23 assertions; the standing proof that fails the day a hardcoded corpus size returns"
affects: [04-02, 04-03, 04-05, 04-09, phase-7-admin]

tech-stack:
  added: []
  patterns:
    - "Classify a count assertion before repairing it: cohort (about a migration's inputs, iterate the frozen source), floor (anti-vacuity only, >=), invariant (true forever, iterate the whole collection plus a floor)"
    - "Derive a cohort from the frozen document, never from the artefact under test — a cohort computed from the manifest cannot detect a manifest that changed"
    - "Report an exclusion rather than failing it, and print it with process.stdout.write: console.log and console.info are both swallowed by this vitest setup"
    - "Pair every `length`-derived equality with a non-zero clause: a derived expectation and an empty input agree that nothing was the expected amount of nothing"
    - "Place new test fixtures under an already-classified path; a new top-level directory stops the build at gate:origin with `unclassified path`"

key-files:
  created:
    - test/pipeline/fixtures/fortieth-photo.ts
    - test/pipeline/manifest-growth.unit.test.ts
  modified:
    - test/content/photo-enrichment.unit.test.ts
    - test/content/schemas.unit.test.ts
    - test/content/site-config-migration.unit.test.ts
    - test/content/build-fails-loudly.node.test.ts
    - scripts/migrate-photo-origin.mjs

key-decisions:
  - "The 15 assertions were classified individually, not bumped 39 -> 40. Nine are cohort claims about the 03-04 merge and are now iterated over the brief's row set; five are floors or invariants over the whole manifest; one derives its expectation from the sandbox's own manifest."
  - "COHORT is derived from .planning/phases/00-design-ideation/00-PHOTO-CONTENT.md, a frozen document, and never from data/portfolio_images.json. Proof step 4 is the check on that: renaming one cohort id must fail naming the id, and it does."
  - "The four non-photo censuses in schemas.unit.test.ts (categories, peek ids, projects, bullets) stay EQUALITIES. Nothing in Phase 4 grows them, and a change to any of them is a decision that should red the assertion deliberately."
  - "manifest-growth.unit.test.ts deliberately FAILS if FORTIETH_PHOTO's id is ever present in the committed manifest. The fixture is a test record; its leaking into reviewed content should be loud. This makes the plan's step-3 instruction literally unsatisfiable — see Contradictions."
  - "The migration script keeps its exact collection guard; only the RECORD-COUNT equality became a floor. The URL arithmetic is derived from manifest.length and still compared exactly."

metrics:
  duration: "~35 min"
  tasks_completed: 3
  commits: 4
  files_created: 2
  files_modified: 5
  completed: 2026-08-27
---

# Phase 4 Plan 01: Re-scope the 39-hardcoded assertions Summary

Fifteen count assertions across four files were classified individually as **cohort**, **floor** or
**invariant** — with the class and its reason written into the file beside each one — so a 40th
photograph turns the suite green instead of red, and `migrate-photo-origin --verify` runs at any
corpus size instead of refusing at 40.

---

## Before / after, measured

Every exit code below was captured as `if cmd; then R=0; else R=1; fi`, **never** `R=$?` and never
in a subshell. All local runs are **zsh** (`/bin/zsh`, `echo $0`). No control here runs in bash;
nothing in this plan touches a workflow file.

| Measurement | Before (`1f845a4`) | After |
|---|---|---|
| `npx vitest run --project unit`, 39 committed records | **444 passed / 7 files, exit 0** | **exit 0** (my four files: 191 passed / 4; whole project 611 / 10 with 04-02 and 04-03 landed) |
| `npx vitest run --project unit`, one valid 40th record | **exit 1 — 14 failed / 430 passed** | **exit 0 — 503 passed / 9 files** |
| `npm test`, one valid 40th record | not measured (unit already red) | **exit 0 — 543 passed / 14 files** |
| `npx astro sync`, 40 records | exit 0, `PASS · 40 photo(s)` — the build could not see it | exit 0, `PASS · 40 photo(s)` (unchanged, correctly) |
| `node scripts/migrate-photo-origin.mjs --verify`, 40 records | **exit 1** — `expected 39 records, found 40`, **zero requests issued** | **exit 0** — `checked 160 of 160 URLs` when all resolve; **exit 1 naming the four 404s** when they do not |
| `npm run gate:origin`, 40 records | exit 0 (already a floor — the worked example) | exit 0, `160 remote URL(s) across 39+ records` |
| `npm run gate:content` + `npm run build`, 40 records | not measured | **both exit 0** |

**The 15, attributed by file** (measured in a `git clone --no-hardlinks` of `1f845a4` with a valid
40th record appended):

```
❯ test/content/photo-enrichment.unit.test.ts     (16 tests |  9 failed)
❯ test/content/schemas.unit.test.ts             (107 tests |  4 failed)
❯ test/content/site-config-migration.unit.test.ts (45 tests | 1 failed)
+ test/content/build-fails-loudly.node.test.ts   — 1 (integration project, not in the unit run)
                                                  = 15 across 4 files
```

---

## The per-assertion classification table

| # | File | Assertion (title as it now reads) | Class | Shape after |
|---|---|---|---|---|
| 1 | photo-enrichment | `parses exactly the cohort the frozen brief describes, and it is not zero` | **cohort** + dated baseline | `rows.length === COHORT_BASELINE (39)`, `COHORT.size > 0`. The `manifest.length` equality is **gone** — it was never the claim |
| 2 | photo-enrichment | `has a manifest record for every brief row, and names the records outside the cohort` | **cohort bijection, one direction** | brief→manifest fails; manifest→brief is *reported* by name. Held honest by the partition identity `COHORT.size + outside.length === manifest.length` |
| 3 | photo-enrichment | `every cohort record carries the brief cell for its id, character for character` | **cohort** | iterates `rows`, looks each id up in the manifest (loop direction reversed) |
| 4 | photo-enrichment | `has a non-empty alt on every record in the manifest` | **invariant** + floor | whole manifest; `toHaveLength(manifest.length)` + `>= COHORT.size` |
| 5 | photo-enrichment | `contains no pending marker anywhere in the manifest, in any field` | **invariant** + floor | whole manifest + floor added |
| 6 | photo-enrichment | `has 16 cohort place keys, each byte-identical to its brief cell` | **cohort** | `EXPECTED_PLACES = 16` restated as "16 of the 39 cohort records"; the final filter is now cohort-scoped |
| 7 | photo-enrichment | `gives the remaining cohort records NO place key at all — not an empty string` | **cohort** (+ invariant for the empty-string half) | complement **computed** as `COHORT.size - EXPECTED_PLACES`, never `39 - 16` |
| 8 | photo-enrichment | `has no alt that merely repeats its own title` | **invariant** + floor | it is `PhotoSchema.superRefine` rule 2 — true of every record forever |
| 9 | photo-enrichment | `has no alt opening with "Image of" / "Photo of" / "Picture of"` | **invariant** + floor | `superRefine` rule 3, same reason |
| 10 | photo-enrichment | `gives every record an integer categoryOrder` | **invariant** + floor | equality on 39 replaced by `>= COHORT.size` |
| 11 | photo-enrichment | `ranks each category exactly 1…n with no gap and no duplicate` | **invariant** + floor | `counted === manifest.length` + floor |
| 12 | photo-enrichment | `found a pre-migration revision holding the whole cohort` | **cohort** | `previous.orders.size === COHORT.size` |
| 13 | photo-enrichment | `covers the whole cohort — a photo published after the migration is reported, not failed` | **cohort** | `COHORT ⊆ previous.orders`, iterating COHORT; out-of-cohort ids reported. **This is the block whose own failure message demanded re-scoping.** |
| 14 | photo-enrichment | `orders each cohort category the same way the pre-migration global order did` | **cohort** | each group filtered to cohort members before comparing; `compared === COHORT.size` |
| 15 | photo-enrichment | `writes focalPoint onto no COHORT record` | **cohort** | a photograph published later may legitimately carry a crop (Phase 7's editor authors exactly that) |
| 16 | photo-enrichment | `stores no explicit copy of the "50% 50%" default` | **invariant** + floor | deliberately **not** cohort-scoped: "never store the default" is about every record that will ever exist |
| 17 | schemas | `holds at least the reviewed photo corpus, and the four fixed censuses exactly` | **floor** (photos) + **equality** (the other four) | `EXPECTED_PHOTOS` → `MIN_PHOTOS`, `>= 39` |
| 18 | schemas | `carries exif on every record with nullable fields` | **invariant** + floor | `toHaveLength(PHOTOS.length)` — the claim was always "all of them" |
| 19 | schemas | `the whole set passes validateContentSet, and says how much it looked at` | **invariant** + floor | `report.checked.photos === PHOTOS.length`. Hardcoding 39 asserted the file's SIZE, a different claim |
| 20 | schemas | `accepts every record that carries no place key at all` | **invariant** + floor | `>= MIN_PLACELESS_PHOTOS (23)`. **Not in the plan** — see Contradictions |
| 21 | schemas | `is absent from every committed record` (tags) | **invariant** + floor | already whole-manifest, so it never failed; retitled and given a floor |
| 22 | site-config-migration | `reads the whole photo manifest, and every record resolves to a live category` | **floor** + **invariant** | `>= 39` plus a real category-resolution claim, so the block still cannot pass vacuously |
| 23 | build-fails-loudly | `exits 0, emits dist/, and reports a census of the sandbox manifest` | **derived** | census read from `path.join(sandbox, 'data', 'portfolio_images.json')`, guarded by `n > 0` first |

Rows 16, 21 and 23's floors were added even though those three did not fail at 40 — they were
`filter(...).toEqual([])` / `toHaveLength(0)` shapes, which an empty manifest satisfies trivially.

`scripts/migrate-photo-origin.mjs`: `EXPECTED_RECORDS = 39` (`!==`) → `MIN_RECORDS = 39` (**floor**);
`EXPECTED_REMOTE_URLS = 39 * 4` → **derived** `manifest.length * REMOTE_URL_KEYS.length`, still
compared exactly at the collection guard, now with an added `=== 0` clause.

---

## Four-step proof, per gate, with its shell

All in **zsh** (`/bin/zsh`), in a `git clone --no-hardlinks` of the repository **with its history**
(11 revisions of `data/portfolio_images.json` reachable — P-4: a `cp -r` without `.git` fabricates
four failures because four migration proofs walk `git log` and throw). `.env` and `.dev.vars` copied
in; `node_modules` symlinked. Exit codes captured only as `if cmd; then R=0; else R=1; fi`.

### Gate A — the 15 re-scoped assertions (the whole re-scoping, as one gate)

| Step | Input | Result | Names the thing? |
|---|---|---|---|
| **1 · plant the defect** | 40th record reusing `order: 39` | `unit` **exit 1** (4 failed), `astro sync` **exit 1** | ✅ `✖ [RI-5] data/portfolio_images.json → indices 38, 39: duplicate global order value 39`, plus `manifest-growth > global order stays unique … (RI-5)` and `schemas > the whole set passes validateContentSet`. Re-run with a **distinct id** to isolate the duplicate-order defect from the fixture-id collision: same result, 4 failures / 2 files |
| **2 · nothing to check** | manifest replaced with `[]` | `unit` **exit 1**, `astro sync` **exit 1**, `migrate --verify` **exit 1**, `gate:origin` **exit 1** | ✅ `AssertionError: expected 0 to be greater than or equal to 39` on every re-scoped floor. photo-enrichment went to **13 of 16 failed** (from 9 at a valid 40) — nothing was loosened into vacuity. `manifest-growth` fails at collection with its own sentence: `appendFortieth: refusing to derive order/categoryOrder from an empty manifest` |
| **3 · pass on correct input** | realistic 40th record, `order: 40`, `categoryOrder: 9` | `unit` **exit 0 — 503 passed / 9 files**; `npm test` **exit 0 — 543 / 14**; `astro sync` **exit 0** `PASS · 40 photo(s)`; `gate:origin` **exit 0**; `npm run build` **exit 0**; `gate:content` **exit 0** (all four gates PASS); `migrate --verify` **exit 0** `checked 160 of 160 URLs` when the addresses resolve | ✅ **This is the measurement the plan exists to flip: 15 red → 0.** The out-of-cohort report printed `photo-enrichment: 1 manifest record(s) are outside the 03-04 cohort … nature-riverstones` |
| **4 · walk-through attempt** | 40 records, one cohort id renamed `nature-acrossthetrees` → `…treez` | `unit` **exit 1** (4 cohort blocks failed), `astro sync` **exit 1** | ✅ `AssertionError: no manifest record for cohort id nature-acrossthetrees: expected undefined to be defined`, and `expected [ 'nature-acrossthetrees' ] to deeply equal []`. **The cohort is not derived from the manifest** — the walk-through fails. RI-3 fired independently on `home_config.peekIds[2]` |

### Gate B — `scripts/migrate-photo-origin.mjs` (floor + derived arithmetic), zsh

| Step | Input | Result |
|---|---|---|
| **1 · plant the defect** | 38 records (one below the floor) | **exit 1** — `found 38 records, expected at least 39. The CONT-04 migration cohort was 39 records; a manifest that lost one is a data loss, not a smaller job` |
| **1b · plant, arithmetic** | 40 records, one record's `large` key deleted | **exit 1** — `abstract-intothemist.large is missing or not a string` |
| **1c · plant, liveness** | 40 records, the new record's four objects never uploaded | **exit 1** — `4 of 160 URLs did not return 200 image/webp`, all four named. **160 checked; before this change it checked 0** |
| **2 · nothing to check** | `[]` | **exit 1** — `found 0 records, expected at least 39` |
| **2b · nothing to check** | no such file | **exit 1** — `refusing to report success with nothing to migrate` |
| **3 · pass on correct input** | 39 committed | **exit 0** both modes; `156 of 156` / `checked 156 of 156 URLs`; manifest **byte-identical** (`sha256 e85b2a3c…` before and after) |
| **3b · pass, grown** | 40 records, all addresses resolvable | **exit 0** — `checked 160 of 160 URLs in 13.7s` |
| **4 · walk-through attempt** | could an input satisfy the derived equality while violating its intent? | The equality is now derived from `manifest.length`, so `[]` makes **both sides 0** and they agree. Closed by an explicit `targets.length === 0` clause **and** by the floor above it. Measured: on `[]` the **floor** is what fires — the `=== 0` clause is unreachable defence-in-depth, and is recorded as such rather than claimed as a proven plant |

### Gate C — `test/pipeline/manifest-growth.unit.test.ts` (the new standing proof), zsh

| Step | Input | Result |
|---|---|---|
| **1 · plant the defect** | 40th record with a duplicate `order` | **4 of 23 failed**, including `global order stays unique across the grown array — INVARIANT (RI-5)` and `reports PASS with no violations` |
| **2 · nothing to check** | `[]` on disk | file **fails at collection**, naming the cause. Its own §5 asserts `PhotoManifestSchema.safeParse([])` is unsuccessful (`/holds no photos/`), `validateContentSet` over `[]` is not PASS, and a non-array manifest is refused |
| **3 · pass on correct input** | 39 committed | **exit 0 — 23 passed** |
| **4 · walk-through attempt** | could `appendFortieth` return its input and pass? | No: §2 asserts `GROWN.length === COMMITTED.length + 1`, `GROWN !== COMMITTED`, the nested objects are not shared, and the pre-call `COMMITTED_BEFORE_JSON` snapshot is compared against both the in-memory array **and** a fresh read of the file. A first draft compared `COMMITTED.length` against itself — a tautology, caught and replaced before commit |

### Gate D — `gate:origin` after `test/pipeline/fixtures/` appeared, zsh

Pitfall P-7 says a new **top-level** tracked path stops the build with `unclassified path`. The
fixture was placed under `test/`, which `scripts/assert-no-r2dev-urls.mjs` already classifies as a
named SKIP. Measured: `npm run gate:origin` **exit 0**, `test/**` skip count went **15 → 16**, no
`unclassified path` finding. No gate rule was added, because none was needed.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The out-of-cohort report printed nothing.** Commit `e8d0295`.
Found during proof step 3. Both "reported by name" sites used `console.info`, and a throwaway probe
measured that under `vitest 4.1.10 --project unit`, of `console.log`, `console.info` and
`process.stdout.write`, **only the last reaches the output**. The exclusion had its justification
written down and then never displayed — the same failure as one that lives in a plan file. Both call
sites now go through a `report()` helper over `process.stdout.write`, with the probe result recorded
beside it so it does not get tidied back. Re-measured at 40 records: the line prints and names the
record.

**2. [Rule 1 — Bug] A tautological assertion in my own first draft** of
`manifest-growth.unit.test.ts`: `expect(COMMITTED.length).toBe(COMMITTED.length)`. Replaced with a
comparison against a pre-call module-scope snapshot, plus a fresh read of the file from disk. Fixed
before the Task 3 commit.

**3. [Rule 2 — Missing critical functionality] A non-zero clause on the derived URL arithmetic.**
The plan asked only that `EXPECTED_REMOTE_URLS` become derived. Derived from `manifest.length`, the
equality self-satisfies at zero records. Added `targets.length === 0` explicitly.

**4. [Rule 2] Floors on three assertions the plan did not list** (rows 16, 21, 23 above) because
their `toEqual([])` / `toHaveLength(0)` shapes pass trivially over an empty manifest.

---

## Contradictions found

**1. The plan names the wrong fourth failing assertion in `schemas.unit.test.ts`.**
It lists `is absent from all 39 committed records` (tags, line ~643) as one of the four. Measured:
that assertion is **already whole-manifest** (`PHOTOS.filter(p => 'tags' in p)`) and **passes at
40**. The real fourth failure is `optional photo fields > accepts the 23 records with no place key at
all` (line ~729): `expect(without.length).toBe(23)` → `expected 24 to be 23`, because the 40th record
carries no `place`. It is a cohort-complement census, and is now a floor
(`MIN_PLACELESS_PHOTOS = 23`, which can only rise). Both were handled.

**2. The plan's photo-enrichment list enumerates 13 blocks; only 9 fail at 40.**
`has 16 place keys`, `gives the other 23 records NO place key`, `has no alt that merely repeats its
own title`, `has no alt opening with "Image of"`, `found a pre-migration revision`, and `stores no
explicit copy of the "50% 50%" default` were already cohort- or invariant-shaped and passed. They
were still re-scoped or floored per the plan's instruction; the count in the plan is the number of
blocks it asked me to touch, not the number that were red.

**3. Proof step 3 as written is unsatisfiable.** It says "append a correctly-numbered
`FORTIETH_PHOTO`. Require `npx vitest run --project unit` exit 0". Measured: appending the fixture
itself makes `manifest-growth` fail 4 of 23 — by design. Its first assertion is `is a record the
committed manifest does not already contain`, and `appendFortieth` then produces a duplicate id and
order. **I kept the guard**: the fixture is a test record, and its leaking into reviewed content
should be loud, not silently absorbed. Step 3 was therefore measured with a **realistic** 40th
record of the shape the pipeline will produce (distinct id) — which is the input the plan's claim is
actually about. Recorded here so 04-05 and 04-09 do not import `appendFortieth` and then commit its
output.

**4. Proof step 3 also requires `migrate-photo-origin --verify` exit 0 at 40 records.** That cannot
hold for a record whose four R2 objects were never uploaded: `--verify` exits 1 naming four 404s,
which is the verifier **working** and is precisely the gap 04-RESEARCH §6 describes. Step 3 was
split: 3a (new addresses, `--verify` exit 1 naming the 404s) and 3b (addresses that resolve,
`--verify` exit 0, `checked 160 of 160`).

**5. `test/pipeline/` already existed when this plan reached Task 3.** 04-VALIDATION's Wave 0 list
and the plan both say "the directory does not exist". Plan 04-03 landed
`test/pipeline/verify-photo-urls.unit.test.ts` first (commit `16c3d49`). No consequence: the
`test/**` SKIP covers the whole subtree, and `gate:origin` stayed green.

**6. `npm run gate:content` requires `dist/`.** `gate:routes` refuses when the build output is
absent — *"a gate that quietly passes when there is nothing to check is how a phase ships an
assertion that never ran"*. So `gate:content` cannot be run in a fresh clone without
`npm run build` first. That is the gate working (and matches the briefing note); recorded because the
plan's `<verification>` lists `npm run gate:content` with no build step in front of it.

**7. `--verify` uses HEAD, and pitfall P-1 says HEAD lies about caching.** Not a contradiction on
inspection: `--verify` asserts **status and content-type**, never cache headers, so HEAD is a sound
probe for what it claims. Plan 04-03 has since recorded the same conclusion (commit `808f8d2`). Left
unchanged, as the plan instructed.

---

## Concurrency notes

04-02 and 04-03 were executing against the same working tree throughout. Only this plan's files were
ever staged — never `git add -A`. Two transient failures observed in the full unit run belonged to
04-02's then-uncommitted `src/lib/photo-pipeline.ts` and
`test/pipeline/photo-pipeline-contract.unit.test.ts`, plus two `astro check` errors in the same file;
all were green by the end of this plan. `test/pipeline/fixtures/fortieth-photo.ts` deliberately does
**not** import 04-02's new `THUMB_PREFIX` export, which was uncommitted at the time — the prefix
agreement is proven instead by running the fixture through `PhotoSchema.parse`, whose `thumbUri`
refinement compares against the schema's own constant.

`src/lib/photo-pipeline.ts`, `src/schemas/photo.ts`, `src/lib/image-origin.ts` and
`scripts/verify-photo-urls.mjs` were read but never modified.

---

## Known stubs

None.

## Threat flags

None. No new network surface, no new auth path, no schema change. The threat register's T-04-01
(a re-scope that quietly became a no-op) is mitigated by proof steps 2 and 4 above, both measured.
T-04-02 (the census string) is mitigated by the `n > 0` guard preceding the `toContain`.
T-04-SC: this plan installed nothing; `npm` was invoked only through existing `run` scripts.

---

## Commits

| Hash | Task | Message |
|---|---|---|
| `1b43b1d` | 1 | `test(04-01): classify all 15 count assertions, in the file, beside each one` |
| `e030338` | 2 | `fix(04-01): the migration verifier refused to run at 40 records — floor it` |
| `e354ff7` | 3 | `test(04-01): the 40th-record fixture, and the proof that growth stays green` |
| `e8d0295` | — | `fix(04-01): the out-of-cohort report printed nothing — console.info is swallowed` |

`data/portfolio_images.json` is byte-identical to `HEAD` (`sha256 e85b2a3c6226df70…`, backed up and
compared with `shasum` before and after). `git status --short --porcelain -- data/` returns 0 lines.
No `git clean`, `git stash`, `git reset --hard`, `git checkout --` or `git worktree` was run at any
point; every sandbox was a `git clone --no-hardlinks`, and both clones were deleted.

## Self-Check: PASSED

- `test/pipeline/fixtures/fortieth-photo.ts` — FOUND
- `test/pipeline/manifest-growth.unit.test.ts` — FOUND
- commits `1b43b1d`, `e030338`, `e354ff7`, `e8d0295` — all FOUND in `git log --oneline --all`
- `grep -n 'toHaveLength(39)\|toBe(39)\|toContain(.39 photo' test/content/*.ts` — returns nothing
- `npx vitest run --project unit` — exit 0
- `npm run gate:content` — exit 0
- `node scripts/migrate-photo-origin.mjs --verify` — exit 0
