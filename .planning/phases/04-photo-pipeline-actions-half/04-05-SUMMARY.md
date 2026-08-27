---
phase: 04-photo-pipeline-actions-half
plan: 05
subsystem: pipeline
tags: [record-producer, idempotence, upsert, content-hash, astro-sync, referential-integrity, purity]

requires:
  - phase: 04-photo-pipeline-actions-half
    plan: 01
    provides: "test/pipeline/fixtures/fortieth-photo.ts (FORTIETH_PHOTO, appendFortieth) — the growth control this plan's walk-through case plants in a sandbox, and the re-scoped 39-hardcoded assertions that let a 40th record exist at all"
  - phase: 04-photo-pipeline-actions-half
    plan: 02
    provides: "src/lib/photo-pipeline.ts — VARIANTS, THUMB, contentHash, publishedKey, publishedUrl, photoIdFor, assertStagingKey, assertPublishableAlt, CONTENT_HASH_RE"
  - phase: 03-content-layer-image-origin
    provides: "src/schemas (PhotoSchema, PhotoManifestSchema, validateContentSet + the six RI rules), src/lib/image-origin.ts, the astro:config:done content gate in astro.config.mjs"
provides:
  - "scripts/lib/photo-record.mjs — the PURE record producer and manifest upsert. buildRecord, upsertRecord, serialiseManifest, nextOrder, nextCategoryOrder. No filesystem, no network, no git, no sharp, no process spawn."
  - "OD-4 resolved and IMPLEMENTED: upsert keyed on `id`, exit 0, and it never renumbers `order` or `categoryOrder`."
  - "The contract 04-07's deriver must satisfy: { slug, variants{original,large,medium,small}.bytes, thumb, dimensions, exif }, with an optional per-variant `hash` that is cross-checked against its own bytes."
  - "The measured boundary, asserted: a schema-valid record over four R2 objects that do not exist passes `astro sync` at exit 0."
affects: [04-06, 04-07, 04-09, 04-10, phase-05-srcset]

tech-stack:
  added: []
  patterns:
    - "Validation-before-side-effects: a pure producer makes 04-09's steps 1-6 side-effect-free, so a crash before step 7 leaves R2, main and the manifest untouched"
    - "Anti-vacuity ordering: every 'the re-run added no duplicate' assertion is preceded by an assertion that the first run CHANGED the manifest"
    - "Whole-manifest rank comparison as a single string, so a partial renumbering cannot hide in a sampled check"
    - "Per-variant content hashing from each variant's own emitted buffer, never one source hash for all four"
    - "Walk-through attempts run in a `git clone --no-hardlinks` sandbox, and the two that succeeded were closed rather than noted"

key-files:
  created:
    - scripts/lib/photo-record.mjs
    - test/pipeline/idempotence.unit.test.ts
    - test/pipeline/versioned-key.unit.test.ts
    - test/pipeline/record-valid.node.test.ts
  modified: []

key-decisions:
  - "OD-4 A: upsert keyed on `id`, exit 0. A re-run recomputes the record and replaces it IN PLACE, preserving the existing `order` and `categoryOrder` byte-for-byte."
  - "The upsert replaces at the record's existing INDEX, not by remove-and-append — found by a walk-through attempt."
  - "Everything except the two ranks comes from the rebuilt record, asserted as a class rather than field by field — found by the second walk-through attempt."
  - "`date` stays a required argument. OD-10 is 04-07 Task 3's; defaulting here would settle it by accident."
  - "A per-variant `hash` supplied by the caller is cross-checked against its own bytes and refused on mismatch, so the uploader and the record cannot address different objects."
  - "The producer refuses `inputs.tags` by name (OD-3) rather than dropping it silently."
  - "`alt`, `title` and `place` are stored TRIMMED — `gh workflow run -F alt=@alt.txt` reads a file, and a file ends with a newline."
  - "A re-dispatch under a different category is an INSERT, not a repair: `id === category + '-' + slug`, so the id changes. A manifest where a shared id carries a different category is refused rather than resolved."

metrics:
  tasks: 3
  commits: 4
  tests-added: 60
  suite: "873 passed across 22 files (npm test), 815 in the unit project"
---

# Phase 4 Plan 05: The Record Producer and What a Re-Run Does — Summary

The pipeline can now turn derived assets plus validated dispatch inputs into one manifest record
that the real Phase 3 content gate accepts, and a second run for the same upload repairs that record
in place without moving a single photograph in the gallery.

---

## OD-4, as taken

**Option A — upsert keyed on `id`, exit 0.** Confirmed with its caveat.

A re-run **recomputes** the record — urls, hashes, dimensions, exif, title, alt, place — and replaces
it in place. Repairing a job that died between the R2 upload and the commit is therefore the ordinary
path (re-dispatch) rather than a manual cleanup, which is what criterion 3 needs.

**The caveat is implemented, not noted:** an upsert **does not renumber `order` or `categoryOrder`**.
`upsertRecord` takes those two values from the record it is replacing and discards the ones the
rebuild derived. Renumbering on a retry would reorder Akhil's reviewed gallery as a side effect of an
operational action, and downstream it would look like an ordinary content change with nothing to
attribute it to.

Two consequences of keying on `id`, recorded rather than glossed:

- `id` is `category + "-" + slug`, so **a re-dispatch under a different category produces a different
  id and is an INSERT, not a repair.** The wrongly-filed record stays until someone deletes it.
  Deleting records is not this pipeline's job, and no plan in this phase owns it.
- Because a shared id necessarily implies a shared category, `upsertRecord` never has to decide
  whether a preserved `categoryOrder` still ranks in the right group. If it ever meets a manifest
  where that is false, it **refuses** and names the disagreement rather than resolving it.

---

## The order-preservation proof

Four assertions, in `test/pipeline/idempotence.unit.test.ts`:

1. **Byte-for-byte.** Insert, change the bytes, upsert again, and compare
   `JSON.stringify({order, categoryOrder})` from before and after. Measured
   `{"order":40,"categoryOrder":9}` on both sides.
2. **Even when the maxima have moved.** A different photograph lands between the two runs, so
   `nextOrder` now returns 42. The repaired record still carries 40 and 9. This is the case a naive
   "recompute the rank" upsert gets wrong, and the one that would silently reorder the gallery.
3. **Over the whole manifest, not a sample.** Every other record's `id:order:categoryOrder` is joined
   into ONE string and compared before and after — 39 records in a single comparison, so a partial
   renumbering has nowhere to hide.
4. **In place.** The record keeps its **index**, and the whole id sequence is unchanged. (This one
   was added after a walk-through attempt defeated the first three — see below.)

Planted defect, in a `git clone --no-hardlinks` sandbox, zsh:

```
DEFECT B — `const preserved = { ...record };`  (i.e. keep the rebuild's ranks)
  ✖ the second run preserves order and categoryOrder BYTE-FOR-BYTE
      AssertionError: expected '{"order":41,"categoryOrder":10}' to be '{"order":40,"categoryOrder":9}'
  ✖ preserves them even when the maxima HAVE moved — the renumbering trap
      AssertionError: expected 42 to be 40
  Tests  2 failed | 49 passed (51)
```

---

## The anti-vacuity proof for criterion 2

`expect(second.length).toBe(first.length)` is **true of an implementation that adds nothing at all**.
So every "the re-run added no duplicate" assertion in this plan is preceded, in the same test body,
by an assertion that **the first run changed the manifest**: `length + 1`, the id present, and
`serialiseManifest(after) !== serialiseManifest(before)` — bytes, not just a count, because appending
`undefined` would satisfy a length check.

Planted defect — the upsert made a no-op (`if (index === -1) return [...manifest];`), zsh:

```
  ✖ INSERTING A NEW ID CHANGES THE MANIFEST — asserted first, so nothing below is vacuous
      AssertionError: expected 39 to be 40
  ✖ the second run leaves manifest.length unchanged — criterion 2, after the above
  ✖ the second run preserves order and categoryOrder BYTE-FOR-BYTE
  ✖ preserves them even when the maxima HAVE moved — the renumbering trap
  ✖ the second run DOES update the urls, the hash, the dimensions and the exif
  ✖ never mutates its input array or any record object in it
  ✖ a re-dispatch under a DIFFERENT category is an insert, not a repair
  ✖ refuses a manifest that disagrees with itself about a shared id's category
  ✖ a duplicate append — the thing the upsert prevents — is caught by RI-5 and RI-6
  Tests  9 failed | 42 passed (51)
```

**The vacuous implementation fails nine assertions, and the FIRST of them is the anti-vacuity one.**
Without that ordering, an upsert that dropped its record on the floor would satisfy criterion 2's
sentence while proving the opposite of what criterion 2 is for.

---

## The `astro sync` cases, verbatim

All measured in a disposable copy of the project (`cpSync` of `src`, `public`, `data`,
`astro.config.mjs`, `package.json`, `tsconfig.json`, `wrangler.jsonc`, `worker-configuration.d.ts`,
`biome.json`, `.nvmrc`, `.dev.vars`, `.env`; `node_modules` symlinked — `src` may **not** be
symlinked, per `build-fails-loudly.node.test.ts`). Binary spawned at
`node_modules/astro/bin/astro.mjs` with argv as **separate array elements**. Shell for the harness:
the vitest runner under zsh; the spawn itself uses `execFile`, no shell at all.

### 1. PASS ON CORRECT INPUT — exit 0, 1,753 ms

```
[content-gate] content set: PASS · checked: 40 photo(s), 7 category record(s), 6 peek id(s), 1 peek position(s), 5 project(s), 7 categoryOrder group(s) · rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
[content] Syncing content
[content] Synced content
[types] Generated 522ms
```

### 2. PLANTED — duplicate append — exit 1, 1,335 ms

```
  BUILD REFUSED — a file in data/ does not match the schema in src/schemas

content set: REFUSED — 3 finding(s)
  ✖ [RI-5] data/portfolio_images.json → indices 39, 40: duplicate photo id "nature-gateproof"
  ✖ [RI-5] data/portfolio_images.json → indices 39, 40: duplicate global order value 40
  ✖ [RI-6] data/portfolio_images.json → category nature: categoryOrder 9 is used by nature-gateproof and nature-gateproof
  checked: 41 photo(s), … 7 categoryOrder group(s)
  rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
```

All three, by name — and note the census is intact, because the schema passed. The net fires only
after the file is on disk, which is exactly why idempotence is decided in the producer.

### 3. PLANTED — undeclared lowercase category — exit 1, 1,310 ms

```
content set: REFUSED — 1 finding(s)
  ✖ [RI-1] data/portfolio_images.json → nature-gateproof → category: category "archtecture" does not exist in data/site_config.json
      the 7 declared ids are: abstract, architecture, nature, portraits, product, street, wildlife. Comparison is exact — no case transform on either side. …
  checked: 40 photo(s), … 8 categoryOrder group(s)
  rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
```

### 4. PLANTED — case-variant `Nature` — exit 1, 1,296 ms — **and it contradicts the plan**

```
content set: REFUSED — 1 finding(s)
  ✖ [SCHEMA-photos] data/portfolio_images.json → nature-gateproof — Gate Proof [photos[39] of 40] → category: category must be a lowercase slug. It is compared to site_config ids with NO case transform on either side, … · received "Nature"
  checked: 40 photo(s), … 0 categoryOrder group(s)
  rules run: RI-4
  rule NOT run: RI-1 — not run — data/portfolio_images.json did not satisfy its own schema, … It did NOT pass.
  rule NOT run: RI-2 … RI-3 … RI-5 … RI-6
```

### 5. PLANTED — legacy shape (`tags: []`, no `alt`, no `categoryOrder`) — exit 1, 1,321 ms

```
content set: REFUSED — 3 finding(s)
  ✖ [SCHEMA-photos] … → alt: Invalid input: expected string, received undefined · expected string
  ✖ [SCHEMA-photos] … → categoryOrder: Invalid input: expected number, received undefined · expected number
  ✖ [SCHEMA-photos] … → tags: OD-3: `tags` is dropped. It was empty on all 39 records and nothing renders it; … · expected never · received []
  checked: 40 photo(s), … 0 categoryOrder group(s)
  rules run: RI-4
  rule NOT run: RI-1 … RI-2 … RI-3 … RI-5 … RI-6  ("It did NOT pass.")
```

**Three of the research's four classes reproduced exactly.** The fourth (all four URLs on the retired
`r2.dev` origin) is unreachable from this producer by construction — `publishedUrl` reads
`IMAGE_ORIGIN` and there is no hostname literal in the module — and `gate:origin` covers it
independently.

### 6. NOTHING TO CHECK — emptied manifest — exit 1, 1,285 ms

```
content set: REFUSED — 1 finding(s)
  ✖ [SCHEMA-photos] data/portfolio_images.json: data/portfolio_images.json holds no photos. An empty manifest satisfies every per-record rule trivially, so it is refused rather than passed. · received []
  checked: 0 photo(s), …
  rules run: RI-4
  rule NOT run: RI-1 … RI-2 … RI-3 … RI-5 … RI-6
```

### 7. WALK-THROUGH — 40 records, four R2 objects that were never uploaded — **exit 0**, 1,851 ms

```
[content-gate] content set: PASS · checked: 40 photo(s), 7 category record(s), 6 peek id(s), 1 peek position(s), 5 project(s), 7 categoryOrder group(s) · rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
[content] Synced content
[types] Generated 596ms

fortieth urls.original = https://images.akhilsaxena.com/photos/nature/fortiethproof.webp
```

**This is the phase's load-bearing negative result and the test asserts exit 0 deliberately.**
`astro sync` opens no socket; a URL that 404s is the same string as a URL that 200s, and
`gate:origin` checks each URL's origin and never its liveness. A test that quietly expected exit 1
here would be asserting a behaviour the build does not have. The closure is
`scripts/verify-photo-urls.mjs` (04-03), which 04-09 runs as step 8, between the upload and the
commit.

The record is 04-01's `FORTIETH_PHOTO`, used **only in a sandbox** (hazard 8: its own first assertion
is that the committed manifest does not contain it; committing it fails four of that file's
assertions by design).

---

## Every gate, proven able to fail

Four steps each — **plant the defect → FAIL naming it; FAIL given nothing to check; PASS on correct
code; attempt a walk-through**. Every control below ran in **zsh** (interactive shell; verified with
`ps -o comm= -p $$`), except the `astro sync` spawns, which use `execFile` and therefore **no shell
at all** — deliberately, because passing `"astro sync"` as one argv element is the measured 245 ms
false failure zsh produces.

### Gate 1 — the purity grep (`scripts/lib/photo-record.mjs`)

Command, as repaired by the plan (`-E`, with `sharp` and unprefixed `from 'fs'` restored):

```bash
grep -nE "from '(node:)?fs|require\('fs'\)|node:child_process|from 'sharp'|fetch\(" scripts/lib/photo-record.mjs
```

| Step | Result |
|---|---|
| PASS on correct code | no matches, grep exits 1 → `PURE` |
| PLANT `import { readFileSync } from 'node:fs'` | `1:import { readFileSync } from 'node:fs';` → REFUSED |
| PLANT `sharp` + `node:child_process` + `fetch(` | all three lines reported → REFUSED |
| NOTHING TO CHECK — missing path | guarded with `test -f`; reports `REFUSED: … does not exist`, rc 2. **Unguarded, `grep` on a missing file exits 1 exactly like a pass** |
| NOTHING TO CHECK — empty file | `PASS`. Residual and honest: an empty file *is* pure. The gate must be read together with the module's `min_lines` and its test suite |
| WALK-THROUGH | **SUCCEEDS.** `const fs = await import('node:' + 'fs')` is reported PURE. A textual grep cannot see a computed dynamic import. Recorded, not closed: closing it needs a parse, and the module's real defence is that it has no reason to reach for one |

The gate also caught its own documentation on the first draft: the header quoted the command
verbatim, and the grep reported line 27 of the file it was scanning. The quotation was removed and
the reason written down where the next person will read it.

### Gate 2 — the trailing-newline round-trip

| Step | Result |
|---|---|
| PASS on correct code | 53/53 |
| PLANT `return JSON.stringify(manifest, null, 2);` (the legacy writer) | `✖ serialiseManifest > ends with exactly one newline` and `✖ … > round-trips the COMMITTED manifest byte-for-byte` — 2 failed / 49 passed |
| NOTHING TO CHECK | manifest replaced with `[]` → `✖ the committed manifest is what this file reasons about > loaded, and is at or above the reviewed floor` fires first, 6 failed. The suite refuses to run over nothing rather than passing vacuously |
| WALK-THROUGH | none found — the assertion compares the produced string to the committed file's raw bytes, so there is nothing left to approximate |

### Gate 3 — the upsert's rank preservation and anti-vacuity

| Step | Result |
|---|---|
| PASS on correct code | 53/53 |
| PLANT renumbering | 2 failed, named above |
| PLANT no-op | 9 failed, anti-vacuity assertion first, named above |
| NOTHING TO CHECK | emptied manifest → floor assertion fires, 6 failed |
| WALK-THROUGH ×2 | **BOTH SUCCEEDED against the 51-assertion suite, and both were closed** — see the next section |

### Gate 4 — CONT-05's per-variant versioning

| Step | Result |
|---|---|
| PASS on correct code | 53/53 |
| PLANT one source hash for all four variants (`contentHash(variants.original.bytes)`) | 6 failed, including `✖ four different buffers produce four different hashes` (`expected 1 to be 4`) and `✖ changing ONLY the small buffer changes ONLY urls.small` |
| NOTHING TO CHECK | emptied manifest → floor assertion fires |
| WALK-THROUGH | a per-variant **salt** instead of a per-variant hash would satisfy "four different hashes". Closed by the converse control: four **identical** buffers must produce four **identical** hashes, and the hash must equal a locally computed `sha256(bytes).slice(0,8)` |

### Gate 5 — the real content gate (`astro sync`)

The seven cases above **are** the four steps: case 1 is PASS on correct input, cases 2–5 are planted
defects each naming file, record and field, case 6 is nothing-to-check, case 7 is the walk-through —
which **succeeds, by design, and is the finding.**

---

## The two walk-throughs that succeeded, and were closed

Both were found by attacking the suite inside `git clone --no-hardlinks` (never a `cp` of the
worktree — hazard: a copy without `.git` fabricates failures), and both are defects a retry could
have shipped.

**1. Ranks preserved, record moved.** An upsert returning
`[...manifest.filter(notThisId), preserved]` passed all 51 assertions. The rank *values* were
correct, and the record happened to be last anyway. A record is not always last, and a repair that
moved one through a 39-record file produces a diff on reviewed content out of all proportion to what
changed — the same class of harm as renumbering, one step smaller. Now asserted with a record
deliberately **not** at the end, plus the whole id sequence unchanged.

**2. `place` silently dropped.** An upsert that discarded `place` on the repair path passed all 51,
because no test built a record *with* a place and then repaired it. `place` is reviewed content; a
retry losing it would be a silent edit. Now asserted **as a class**: everything except the two ranks
must be byte-identical to what `buildRecord` produced, so a field added later is covered without this
test being touched.

Both defects were re-planted against the hardened suite; each now fails, naming its own assertion.

---

## Contradictions found — plan, research and fixture

Recorded because each one would otherwise be inherited by a later plan.

**1. `04-05-PLAN.md` Task 3 case 3 mis-attributes the case-variant refusal.** It says a record whose
category is `Nature` is what "RI-1 must reject because the comparison applies no case transform".
**Measured: it never reaches RI-1.** `PhotoSchema.category` carries `.regex(/^[a-z0-9-]+$/)`, so the
per-file schema refuses it first, and a schema failure **suppresses the RI census** — RI-1 is then
printed as `rule NOT run`. Both refusals are correct; only the attribution is wrong. RI-1's
case-sensitive comparison is real but needs a *lowercase* slug to exercise, so the case was split in
two (§3 and §4 above). The same wording appears in `04-RESEARCH.md`'s interfaces block
("RI-1 … EXACT comparison, no case transform"), which is true of the rule and misleading about which
inputs reach it.

**2. `04-05-PLAN.md` Task 3 case 4 overstates the census suppression.** It says the output "must show
every RI rule listed as **not run**". **Five of six.** RI-4 runs: it compares
`home_config.peekPositions` against `home_config.peekIds` and needs no photograph at all
(`if (home)` in `src/schemas/content-set.ts`). Asserting "every" would have been asserting a
behaviour the gate does not have — the exact failure mode the plan's own case 7 warns about.

**3. `test/pipeline/fixtures/fortieth-photo.ts` overstates RI-6.** Its `appendFortieth` throws for a
category with no records, on the stated ground that "RI-6 requires 1…n with no gap". **RI-6 checks
uniqueness within a group and nothing else** — there is no density check in
`src/schemas/content-set.ts`. The fixture's *behaviour* is fine (refusing to guess is right); its
*rationale* is wrong, and a later plan reading it could implement a density rule nothing asks for.
This plan's `nextCategoryOrder` returns **1** for an empty category, which the plan requires
explicitly and which RI-6 accepts.

**4. The plan's `buildRecord({ inputs, assets })` sketch omits the manifest.** `order` and
`categoryOrder` are required by `PhotoSchema` and must be derived from the manifest in hand and never
from a cached read (pitfall P-5). The manifest is therefore a required fourth argument:
`buildRecord({ inputs, assets, date, manifest })`.

**5. No exported constant exists for the six EXIF field names or the `date` grammar.** Both are
restated in `scripts/lib/photo-record.mjs` with the reason written beside them — `src/schemas/photo.ts`
cannot be imported from `scripts/**` (measured: it resolves `'../lib/image-origin'` extensionlessly,
which Node's ESM resolver does not) and `src/lib/photo-pipeline.ts` exports neither. The agreement is
asserted rather than assumed, through `PhotoSchema`'s `strictObject`. **04-07 should consider whether
the EXIF field list belongs in `photo-pipeline.ts`**, since 04-07's mapper will be the third place it
is written.

---

## Deviations from plan

### Auto-fixed (Rule 2 — missing critical functionality)

**1. `buildRecord` takes the manifest as a required argument.** See contradiction 4 above. Without it
the produced record cannot carry the two rank fields the schema requires.

**2. A caller-supplied per-variant `hash` is cross-checked against its own bytes and refused on
mismatch.** 04-09's uploader addresses an object by a key it composed from a hash it computed. If
that hash and the record's ever disagreed, the manifest would point at four objects that were never
written — the exact lie only `scripts/verify-photo-urls.mjs` can see, caught here instead, before a
byte is uploaded.

**3. `inputs.tags` is refused by name rather than ignored.** OD-3 is contested by three live
documents; silently discarding the field would let a caller believe it had been stored.

**4. `alt`, `title` and `place` are stored trimmed.** `gh workflow run -F alt=@alt.txt` reads the
value from a file, and a file ends with a newline. Storing it would put a trailing `\n` into reviewed
content.

**5. `date` is validated as a date that exists**, not merely one that matches `YYYY-MM-DD`
(`2026-02-31` matches the regex).

**6. Two assertions added after successful walk-through attempts** — replace-in-place, and every
non-rank field carried from the rebuild. Committed separately (`548af30`) with the defeat recorded.

### Deliberate departures from the plan's text

**7. Task 3 case 3 split in two, and case 4's claim narrowed to five of six rules.** Both are measured
corrections; see contradictions 1 and 2. The file has **seven** cases, not six.

**8. No `refactor(04-05)` commit.** The plan allows one "if needed"; the module needed none. The third
commit is `test(04-05)`, which is what it is.

**9. The purity grep's verbatim quotation was removed from the module header.** It made the gate match
its own documentation. The reason is written where the quotation was.

**10. The derived-assets builder is local to each test file** rather than under
`test/pipeline/fixtures/`, which plan 04-04 owns in the same wave.

### Not done, and out of scope

- **Orphaned records after a category correction.** A re-dispatch under a corrected category inserts a
  new record and leaves the old one. No plan in this phase owns record deletion. Worth a line in
  `STATE.md`'s concerns, which this plan does not write.

---

## Commits

| Gate | Commit | What |
|---|---|---|
| RED | `df48ee3` | `test(04-05)` — both unit suites, failing at import: `Cannot find module '../../scripts/lib/photo-record.mjs'` |
| GREEN | `e92e87f` | `feat(04-05)` — the pure producer and OD-4's upsert; 51 passed |
| — | `6ca655a` | `test(04-05)` — the sandboxed real-gate proof, seven cases |
| HARDEN | `548af30` | `test(04-05)` — the two walk-throughs closed; 53 passed |
| DOCS | this file | |

**TDD gate compliance:** RED (`test`) → GREEN (`feat`) is present and in order. The RED commit was
verified failing before the module existed; the REFACTOR gate is absent because no refactor was
needed, which the plan permits.

---

## Verification

| Command | Result |
|---|---|
| `npx vitest run --project unit` | **exit 0** — 815 passed |
| both new unit files listed by name | **53 `✓` lines** matching `test/pipeline/(idempotence\|versioned-key)` |
| `npx vitest run --project integration test/pipeline/record-valid.node.test.ts` | **exit 0** — 7 passed, 14.0 s |
| `npm test` | **exit 0** — 873 passed across 22 files |
| `npm run gate:content` | **exit 0** (schema, sinks, origin, routes) |
| `npm run check` | **exit 0** (2 warnings, both in 04-08's `workflow-contract.unit.test.ts`) |
| `npm run typecheck` | **exit 0** — 0 errors, 0 warnings |
| `npx astro sync` | **exit 0** |
| `git status --short --porcelain -- data/ \| wc -l` | **0** — reviewed content untouched |
| purity grep | **no matches** |
| plain `node` import of the module | **loads**; exports `buildRecord, nextCategoryOrder, nextOrder, serialiseManifest, upsertRecord` |
| `serialiseManifest` round-trip | **byte-identical** to the committed 39-record file |

---

## What the next plans get

- **04-06** (`git-publish.mjs`) — `serialiseManifest` is the writer, and the retry loop must
  **re-read the fetched manifest and re-run `upsertRecord` against the new maxima**, which is exactly
  what pitfall P-5 needs and what the "preserves them even when the maxima HAVE moved" assertion
  models.
- **04-07** (the deriver) — the assets contract is fixed:
  `{ slug, variants: { original|large|medium|small: { bytes, hash? } }, thumb, dimensions, exif }`.
  Every variant must hand over **its own emitted buffer**. `date` is 04-07 Task 3's to decide (OD-10)
  and lands as a one-line change at the call site.
- **04-09** (the entrypoint) — steps 1–6 are side-effect-free because this module is pure. Step 6 is
  `astro sync` at ~1.8 s with no secrets. The record's four keys are recoverable from its URLs via
  `parsePublishedKey` if the uploader needs them.
- **04-10** — the purity grep's two residual holes (an empty file; a computed dynamic import) are
  documented above if that gate is ever promoted into the gate chain.

## Self-Check: PASSED
