---
phase: 04-photo-pipeline-actions-half
plan: 04
subsystem: infra
tags: [sharp, exif-reader, exif, fixtures, wrangler, r2, dependencies, testing]

requires:
  - phase: 04-photo-pipeline-actions-half (plan 04-02)
    provides: "src/lib/photo-pipeline.ts — VARIANTS, THUMB, STAGING_*, PUBLISHED_PREFIX, contentHash"
  - phase: 02
    provides: "src/lib/image-origin.ts — IMAGE_ORIGIN, the only place the hostname is written"
provides:
  - "sharp promoted from a transitive resolution to a direct, pinned devDependency at ^0.35.4"
  - "exif-reader@^2.0.3 as the EXIF reader (OD-12 option B), fed from sharp's metadata buffer"
  - "OD-5 resolved to B: R2 I/O goes through wrangler r2 object; @aws-sdk/client-s3 is NOT a dependency"
  - "Three regenerable fixtures: rich EXIF, no EXIF, and a 320px source below the smallest variant"
  - "expected-exif.json — an expectation table declared by hand, not computed by any mapper"
  - "A measured, byte-level verdict that OD-12's 39-record differential corpus DOES NOT EXIST"
affects: [04-07 derivation module, 04-09 entrypoint, 04-08 workflow, 04-10 lifecycle and secrets, Phase 8 private-prefix exposure]

tech-stack:
  added: ["sharp@^0.35.4 (devDependency, direct)", "exif-reader@^2.0.3 (devDependency)"]
  patterns:
    - "Expectation tables are declared by hand and emitted by the generator, never computed by the code under test"
    - "Fixtures are regenerable from a committed, byte-deterministic script rather than hand-made binaries"
    - "Evidence files are bound to the committed manifest, so fabricated evidence fails"

key-files:
  created:
    - scripts/generate-photo-fixtures.mjs
    - test/pipeline/fixtures.unit.test.ts
    - test/pipeline/fixtures/README.md
    - test/pipeline/fixtures/exif-differential.txt
    - test/pipeline/fixtures/expected-exif.json
    - test/pipeline/fixtures/rich-exif.jpg
    - test/pipeline/fixtures/no-exif.jpg
    - test/pipeline/fixtures/small-320px.jpg
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "OD-5 = B: wrangler r2 object, not @aws-sdk/client-s3. OD-6 resolved to A so a Cloudflare API token is provisioned anyway; ~27 packages avoided and the five R2_* secrets become retirable."
  - "OD-12 = B: exif-reader fed from sharp(...).metadata().exif, not exifr."
  - "The 39-record differential proof OD-12 made mandatory is UNAVAILABLE — measured, not assumed. Option B was implemented on a cross-library differential instead, and the downgrade is recorded."
  - "exifr was run once in a throwaway directory as the reference implementation and was NOT added to this repository."

patterns-established:
  - "Anti-vacuity driven by the expectation, not the data: a comparison that reads nothing must refuse to pass"
  - "One `it` per EXIF tag rather than one toEqual over the object, so a regression names itself"
  - "Never leave files staged between steps in a concurrently-worked tree"

requirements-completed: [PIPE-01]

duration: 78min
completed: 2026-08-27
---

# Phase 04 Plan 04: Image Toolchain and EXIF Fixtures Summary

**`sharp@^0.35.4` and `exif-reader@^2.0.3` pinned as direct devDependencies with no S3 SDK, three byte-deterministic fixtures behind a hand-declared expectation table — and a measured finding that the 39-record EXIF corpus OD-12's mandatory proof depended on does not exist.**

## Performance

- **Duration:** ~78 min
- **Started:** 2026-08-27T21:55Z
- **Completed:** 2026-08-27T23:13Z
- **Tasks:** 3 (Task 2 was a checkpoint, pre-resolved)
- **Files modified:** 10

## Accomplishments

- Measured, at the byte level, that **all 39 live originals carry no EXIF at all** — killing the premise of OD-12's mandatory differential proof before the decision rested on it.
- Recovered the strongest available substitute proof (a cross-library differential) **without adding `exifr` to the repository**, and caught a real mapping difference in the process.
- Promoted `sharp` from a transitive resolution to a direct, pinned devDependency, and proved `npm ci` fetches the Linux prebuild rather than compiling — by actually resolving for linux/x64, not by grepping the lockfile.
- Built three regenerable fixtures and proved, with 12 planted defects and 4 walk-through attempts, that every gate guarding them can fail.

## Task Commits

1. **Task 1: Measure whether OD-12's differential corpus actually exists** — `52e9c5e` (test)
2. **Task 2: OD-5 and OD-12** — checkpoint, pre-resolved by the orchestrator; no commit
3. **Task 3: Install the pinned toolchain and build three regenerable fixtures** — `1d2dd8a` (feat)
   - Fixtures, generator and fixture test were **swept into `f16c6af` by a concurrent plan** — see Deviations
4. **Deviation (Rule 2): bind the differential evidence to the manifest** — `531cf46` (test)

**Plan metadata:** committed with this summary.

## The dependency diff

```
devDependencies:
+ "exif-reader": "^2.0.3"
+ "sharp": "^0.35.4"
```

`npm install --save-dev sharp@^0.35.4 exif-reader@^2.0.3` reported **1 package added, 4 changed, 416 audited, 0 vulnerabilities.**

| | Before | After |
|---|---|---|
| `sharp` | transitive only — 0.35.3 via `astro@7.2.2`, 0.35.2 via `miniflare` | **direct devDependency `^0.35.4`**; astro dedupes onto it |
| `exif-reader` | absent | **`^2.0.3`** (published 2025-12-12) |
| `exifr` | absent | **still absent** — run once in a throwaway dir only |
| `@aws-sdk/client-s3` | absent | **still absent** — OD-5 = B, ~27 packages avoided |

**The plan's original check was vacuous and its repair was necessary.** `sharp` already resolved transitively, so `require('sharp/package.json').version` would have succeeded before any promotion happened. (Incidentally it does not even work: `sharp`'s `exports` map does not expose `./package.json`, so that check would have thrown regardless of the dependency state.) The repaired check asserts the **`devDependencies` entry** exists.

**Runner prebuild, proven rather than grepped.** The plan's check was `grep -q '@img/sharp-linux-x64' package-lock.json`. Stronger evidence was taken in a throwaway directory:

```
$ npm ci --os=linux --cpu=x64          # shell: zsh
added 423 packages, and audited 424 packages in 8s
no native build markers                # no node-gyp, no prebuild-install, no "building"
$ ls node_modules/@img/
sharp-libvips-linux-x64  sharp-libvips-linuxmusl-x64  sharp-linux-x64  sharp-linuxmusl-x64 ...
```

The Linux prebuild **materialises**, and nothing compiles. `npm ci` was also run cleanly (exit 0, 415 packages) in a full clone.

## The 39-record differential result, field by field

**There is no result, because there is nothing to re-extract from. This is a measurement, not a shortfall of effort.**

The research made the proof mandatory: *"re-extract EXIF from the 39 live originals and require all six fields to reproduce the committed values byte-for-byte, nulls included."* Task 1 existed to check that premise first. It is false.

**Census, re-measured rather than carried forward — it agrees with the research exactly:**

| field | `camera` | `lens` | `aperture` | `shutter` | `iso` | `focalLength` |
|---|---|---|---|---|---|---|
| nulls among 39 | 1 | 11 | 2 | 2 | 2 | 2 |

The one `camera`-null record is `product-peppers`, which is also the only all-six-null record — so those are the same record, not two.

**The probe.** All 39 `urls.original` fetched with **GET** (a body is required; HEAD cannot carry one), origin **read from `src/lib/image-origin.ts`**, never hand-typed (T-04-16). Two independent readers per object so the library was not taken on trust: `sharp(buf).metadata().exif`, and a raw RIFF chunk walk.

**Result — 39 of 39, no exceptions:**

- 39/39 returned **200 `image/webp`**, zero 404s — a real absence, not an absent file.
- 39/39 `sharp.exif = ABSENT`.
- 39/39 contain **exactly one RIFF chunk, `VP8`**. No `EXIF`, no `XMP`, no `ICCP`. There is no container slot metadata could hide in.
- Header confirms it: `RIFF….WEBPVP8 ` — the image data begins at offset 12, nothing precedes it.

**So the per-field differential result is, for every one of the six fields and every one of the 39 records: 0 of 6 reproducible.** `test/pipeline/fixtures/exif-differential.txt` carries one row per record, with an explicit header warning that `0/6` means *the extraction cannot run*, not *the extraction ran and everything drifted*.

**Three `private/*-clean.webp` masters** were read as well — read-only, GET, nothing written, deleted or re-uploaded (T-04-09; exposure deferred by Akhil to Phase 8). Same encoder, same result: no EXIF.

**Mechanism, not a guess.** The legacy encoder is `.resize(...).webp({quality})` with **zero occurrences** of `withMetadata`, `withExif`, `keepMetadata` or `keepExif` in the whole file; sharp strips by default. The camera sources were never committed (`new-photos/` on the legacy branch holds only `.gitkeep`). **The 39 committed `exif` blocks are the only surviving record of those bytes** — they are the output of an extraction, not an input one can be re-run against.

### What was run instead, and what it found

A cross-library differential, in a throwaway directory, with `exifr@7.1.3` as the reference implementation copied verbatim from the legacy extractor:

| field | `exifr` 7.1.3 (A) | `exif-reader` 2.0.3 (B) | verdict |
|---|---|---|---|
| `camera` | `"NIKON CORPORATION NIKON D5300"` | same | MATCH |
| `lens` | `"18.0-55.0 mm f/3.5-5.6"` | same | MATCH |
| `aperture` | `"f/11"` | same | MATCH |
| `shutter` | `"1/500"` | same | MATCH |
| `iso` | `200` | `200` | MATCH |
| `focalLength` | `"40mm"` | same | MATCH |

Repeated on `no-exif.jpg`: all six `null` in both, and **both return a complete six-key object**, never `undefined`. **12/12 fields match.**

**It caught a real mapping difference.** `exifr` surfaces EXIF tag `0x8827` as **`ISO`**; `exif-reader` surfaces it as **`ISOSpeedRatings`**. A verbatim port would read `d.ISO`, get `undefined`, and write `iso: null` into every future record — schema-valid, silently wrong, invisible to every gate in this repository. This is exactly the regression class OD-12's proof existed to catch.

**This is weaker than the mandated proof, and the weakness is stated rather than papered over:** it shows the two libraries agree with each other on files this repository constructed, not that either agrees with 39 photographs a human reviewed in 2026-03. Nothing available can show the latter.

## Every gate proven able to fail

All controls run in **bash** via `run-control.sh`, inside a **`git clone --no-hardlinks`** of this repo (hazard 3: a copy without `.git` fabricates failures — four tests here walk `git`). The cross-library controls ran in **zsh** in a separate throwaway directory. Baseline in the clone: **27 passed**.

### Gate A — `test/pipeline/fixtures.unit.test.ts` (shell: bash)

| Step | Control | Result |
|---|---|---|
| **Plant** | P1 rich fixture's `Model` tag drifts from the table | FAIL — `yields the picked tag Model with the value expected-exif.json states` |
| **Plant** | P2 declared `iso` disagrees with declared `ISOSpeedRatings` | FAIL — `expected 'iso=100' to be 'iso=200'` |
| **Plant** | P3 `no-exif.jpg` is given EXIF after all | FAIL ×2 — `reports no EXIF buffer at all`, `reaches exif-reader's FAILURE PATH…` |
| **Plant** | P4 `small-320px.jpg` becomes 500px | FAIL — `is exactly 320px wide and narrower than the smallest VARIANTS maxWidth` |
| **Plant** | P5 generator becomes non-deterministic (`Math.random`) | FAIL — `regenerates byte-identically — the generator is deterministic` |
| **Plant** | P6 a fixture is untracked (`git rm --cached`) | FAIL — `…small-320px.jpg exists, is non-empty and is TRACKED BY GIT` |
| **Nothing to check** | V1 expectation table with `tags: {}` | FAIL ×9 — all seven per-tag tests fire the anti-vacuity clause instead of comparing `undefined` to `undefined` |
| **Nothing to check** | V2 every declared field set to `null` | FAIL — `exercises all six schema fields — none is left null by the fixture` |
| **Nothing to check** | V3 expectation table deleted | FAIL — the file cannot load |
| **Correct code** | pristine | **PASS — 27/27** |
| **Walk-through** | P4b make the fixture exactly 400px, the boundary a `>=` would admit | BLOCKED — `toBeLessThan(narrowest)` fails |
| **Walk-through** | W1 widen `VARIANTS` small to 600 so a 500px fixture "counts" | BLOCKED — `toBe(320)` still fails |
| **Walk-through** | W2 move the expectation *with* the defect (change `write` **and** `parsed`) | BLOCKED — `expected 'camera=NIKON CORPORATION NIKON D5300' to be 'camera=NIKON CORPORATION CANON EOS R6'` |

### Gate B — the OD-12 differential evidence (shell: bash)

| Step | Control | Result |
|---|---|---|
| **Plant** | D1 one row names a record that does not exist | FAIL — `names only real record ids — no row can be fabricated to satisfy a row count` |
| **Plant** | D2 evidence trimmed to the 3 rows the plan's check demanded | FAIL — `covers at least the 39 records that existed…` |
| **Plant** | D4 the verdict sentence reworded in README.md | FAIL — `states the verdict in README.md, not only in the data file` |
| **Nothing to check** | evidence file emptied | FAIL — same row-count assertion |
| **Correct code** | pristine | **PASS — 27/27** |
| **Walk-through** | D3 `x 1/1`, `y 2/2`, `z 3/3` — three fabricated rows | **The plan's own shell check exits 0 on this.** The committed test exits 1, naming two reasons |

### Gate C — the cross-library differential (shell: zsh, throwaway directory)

| Step | Control | Result |
|---|---|---|
| **Plant** | extractor B reads `d.ISO` instead of `d.ISOSpeedRatings` — the exact careless-port mistake | FAIL, exit 1 — `iso  200  null  DRIFT` |
| **Nothing to check** | point it at `does-not-exist.jpg` | **exit 0 — THE GATE COULD NOT FAIL.** Fixed, see Deviations |
| **Correct code** | pristine | PASS, exit 0 — `fields that drifted: 0/12` |
| **Walk-through** | drop `rich-exif.jpg` from the compared list | BLOCKED — `rich-exif.jpg was never compared. Refusing to pass.` |
| **Walk-through** | re-point the anti-vacuity clause at `no-exif.jpg` | BLOCKED — names all six fields left null |

## Which of the six fields the fixtures exercise

**All six.** The `withExif` round trip was measured, not assumed — IFD placement is not a free choice and a tag written to the wrong IFD is silently dropped by libvips.

| Schema field | Tag | IFD | Written | Reads back | Exercised |
|---|---|---|---|---|---|
| `camera` | `Make`+`Model` | IFD0 | strings | same | yes |
| `lens` | `LensModel` | IFD2 | string | same | yes |
| `aperture` | `FNumber` | IFD2 | `"11/1"` | `11` | yes |
| `shutter` | `ExposureTime` | IFD2 | `"1/500"` | `0.002` | yes — sub-second, so the `1/N` branch fires |
| `iso` | `ISOSpeedRatings` | IFD2 | `"200"` | `200` | yes |
| `focalLength` | `FocalLength` | IFD2 | `"40/1"` | `40` | yes |

**The one behaviour these fixtures do NOT reach** is the `>= 1s` branch of the shutter mapping (`` `${t}s` ``) — a long exposure would need a fourth fixture. **04-07 must cover it with a direct unit test of the mapper against a synthetic parsed object.** Named here in writing rather than quietly dropped.

**The no-EXIF path is a thrown exception, not a null** — measured, and load-bearing for 04-07:

```
exifReader(undefined)        -> THREW TypeError: Cannot read properties of undefined
exifReader(Buffer.alloc(0))  -> THREW Error: Invalid EXIF data: buffer should start with "Exif", "MM" or "II".
sharp(no-exif.jpg).metadata() -> Object.hasOwn(meta,'exif') === false
```

So the legacy *"return null on ANY throw, caller substitutes an all-null object"* behaviour is **required, not incidental**: `PhotoExifSchema` is a `strictObject` of six nullable, **non-optional** fields, so an absent `exif` is a schema failure and a six-null one is not. 04-07's `try/catch` is what stands between those outcomes.

## Verification

| Check | Result |
|---|---|
| `npx vitest run --project unit` | **exit 0 — 15 files, 815 tests passed** |
| `npx vitest run --project unit test/pipeline/fixtures.unit.test.ts` | exit 0 — 27 passed |
| `npm run gate:content` | exit 0 (schema, sinks, origin, routes all PASS) |
| `gate:origin` unclassified paths | none — `test/**` skipped by named rule (30 files), `scripts/**` scanned (17) |
| `npm run check` | exit 0 |
| `npm run typecheck` | exit 0 — 74 files, 0 errors, 0 warnings |
| `npm ci` (in a clone) | exit 0 — 415 packages, no native build |
| `npm ci --os=linux --cpu=x64` | exit 0 — `@img/sharp-linux-x64` materialises, no native build |
| generator determinism | identical sha256 across runs; `git diff --quiet -- test/pipeline/fixtures/` exit 0 |
| `git ls-files test/pipeline/fixtures/` | all three images + `expected-exif.json` tracked |

## Decisions Made

- **OD-5 = Option B — `wrangler r2 object`, not `@aws-sdk/client-s3`.** OD-6 resolved to A, so a Cloudflare API token is provisioned for the lifecycle rule regardless; the research's own condition for flipping its recommendation is met. One credential system, ~27 fewer packages, and the five `R2_*` secrets become retirable. **Contingency unchanged:** `CLOUDFLARE_API_TOKEN` must carry **R2 Storage → Edit**, unverified from here and tested by 04-10 Task 2's blocking checkpoint. Falling back to the SDK is a recorded deviation, not an executor's call.
- **OD-12 = Option B — `exif-reader` fed from sharp's buffer.** Implemented on the cross-library differential above, with the corpus finding recorded as a material change to the decision's basis.
- **`exifr` was not added to the repository.** Running it once in a throwaway directory as the reference implementation recovered the proof's substance without taking on a four-year-stale dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — missing critical functionality] The differential evidence file was protected by a walkable shape check**

- **Found during:** the four-step failure proof for Task 1's gate
- **Issue:** the plan verified `exif-differential.txt` with `>= 3 lines matching /^\S+\s+\d+\/\d+/`. **Measured walkable:** a file containing `x 1/1`, `y 2/2`, `z 3/3` satisfies it and exits 0. The only artefact recording why OD-12's mandatory proof could not be run was guarded by a check that fabricated evidence passes.
- **Fix:** four assertions in `test/pipeline/fixtures.unit.test.ts` binding the rows to the committed manifest — ≥39 rows (a floor, so a 40th photo strengthens rather than falsifies), every row id present in the manifest, no id repeated, and the verdict sentence present in README.md.
- **Verification:** all four proven able to fail (Gate B table). On the fabricated file, the plan's check exits 0 and this exits 1.
- **Committed in:** `531cf46`

**2. [Rule 1 — bug] The cross-library differential could not fail**

- **Found during:** Task 3, control 2
- **Issue:** pointed at a nonexistent file it reported **12/12 MATCH and exited 0** — both extractors caught their own error, returned `null`, and `null === null` six times over. It agreed with itself about nothing.
- **Fix:** an anti-vacuity clause driven by the expectation, not the data: `rich-exif.jpg` is *declared* to carry all six fields, so if it is absent from the comparison or yields any null, the run refuses to pass.
- **Verification:** control 2 now exits 1 with `ANTI-VACUITY FAILED: rich-exif.jpg was never compared.`; two walk-throughs blocked.
- **Committed in:** recorded in `test/pipeline/fixtures/README.md` (`1d2dd8a`) — the script lives in a throwaway directory because it needs `exifr`, and is reproduced verbatim in the README.

**3. [Rule 3 — blocking issue avoided] `npm ci` not run in the shared working tree**

- **Found during:** Task 3 verification
- **Issue:** the plan's verify begins `npm ci`, which deletes and reinstalls `node_modules`. **Three other plans (04-05, 04-06, 04-08) are executing in this same working tree** and were running vitest against it. Running `npm ci` here would have broken them mid-suite.
- **Fix:** `npm ci` proven in a `git clone --no-hardlinks` instead (exit 0, 415 packages), plus the stronger `npm ci --os=linux --cpu=x64` in a separate directory, which is the actual runner claim.
- **Verification:** both exit 0, no native-build markers, `@img/sharp-linux-x64` materialised.

### Issues Encountered

**A concurrent plan's commit swept this plan's staged files.**

The plan's repaired determinism verify is `git add test/pipeline/fixtures && node scripts/generate-photo-fixtures.mjs && git diff --quiet`. That `git add` — and an earlier one needed to make the tracked-by-git assertion meaningful before committing — left files staged in an index **shared with three concurrently-executing plans**. 04-06's commit `f16c6af` ("the failing concurrency spec") swept them in:

```
scripts/generate-photo-fixtures.mjs      -> f16c6af  (04-06)
test/pipeline/fixtures.unit.test.ts      -> f16c6af  (04-06)
test/pipeline/fixtures/rich-exif.jpg     -> f16c6af  (04-06)
test/pipeline/fixtures/no-exif.jpg       -> f16c6af  (04-06)
test/pipeline/fixtures/small-320px.jpg   -> f16c6af  (04-06)
test/pipeline/fixtures/expected-exif.json -> f16c6af  (04-06)
```

The files are tracked and correct; only the attribution is wrong. History was **not** rewritten — `git reset` is forbidden here and other agents have committed on top. Not resolved, recorded.

**The mitigation is already in the committed test:** its determinism assertion deliberately does **not** call `git add`, using `git diff --quiet` paired with a separate `git ls-files --error-unmatch` test to close the untracked-file blindness instead. The comment in that test explains why. Subsequent commits in this plan staged and committed in a single atomic invocation.

---

**Total deviations:** 3 auto-fixed (1 × Rule 1, 1 × Rule 2, 1 × Rule 3) + 1 unresolved cross-plan issue
**Impact on plan:** No scope creep. Two of the three were gates that could not fail, found by running the prescribed controls rather than assuming them.

## Things that contradict the plan or the research

1. **OD-12's mandatory differential proof is unavailable, not merely expensive.** The research called it *"unusually cheap"* and the resolution table made it mandatory with a per-field null census to reproduce. **The corpus does not exist.** Option B was implemented as instructed, but its stated evidentiary basis is gone and was replaced with something weaker. **Akhil may want to revisit OD-12 on this ground** — the plan itself says the finding *"materially strengthens option A"*. The counter-argument, and the reason B still looks right: the cross-library differential found a real mapping trap (`ISO` vs `ISOSpeedRatings`) that a `exifr`-forever decision would simply never have surfaced, and `exifr` remains four years stale.

2. **The plan's `sharp` check was worse than "vacuous".** The W1 repair note says the original *"passed TODAY, unmodified"*. It could not have: `require('sharp/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED` because sharp's `exports` map does not expose `./package.json`. The repair was right; its stated reason was not.

3. **The plan's `git add`-first determinism repair is unsafe in this tree.** It is correct about `git diff` being blind to untracked files, and it is what caused this plan's work to be swept into another plan's commit. The committed test achieves the same guarantee without touching the shared index.

4. **The plan's Task 1 authorises reading three `private/` objects** (*"Do the same for the corresponding `private/…` object"* for each of three records); the execution brief said one. Three were read, **GET only, nothing written**. Flagging the discrepancy rather than choosing silently.

5. **`console.log` swallowing (hazard 7) was designed around, not re-derived.** Every reporting path here uses `process.stdout.write`; test findings surface through vitest assertion messages, which are not affected.

## User Setup Required

Unchanged by this plan, but two items are now **confirmed** rather than conditional:

- **`CLOUDFLARE_API_TOKEN` must carry R2 Storage → Edit.** OD-5 = B makes this load-bearing for all R2 I/O, not just the lifecycle rule. Tested by 04-10 Task 2's blocking checkpoint. Only Akhil can check or extend the scope.
- **The five `R2_*` secrets are now retirable** (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL`). Nothing in the pipeline will read them under OD-5 = B and OD-3 = A. Deleting them is Akhil's call and belongs to 04-08/04-10's `user_setup`.

## Next Phase Readiness

**Ready for 04-07.** It has `sharp`, `exif-reader`, `VARIANTS`/`THUMB` from 04-02, three fixtures covering rich EXIF / absent EXIF / `withoutEnlargement`, and a declared expectation table to assert its mapper against.

**Two obligations passed to 04-07, both stated in writing above:**
1. Cover the `>= 1s` shutter branch with a direct unit test against a synthetic parsed object — the fixtures cannot reach it.
2. Read ISO as **`ISOSpeedRatings`**, not `ISO`. A verbatim port of the legacy mapper writes `iso: null` into every record, and no gate in this repository can see it.

**Concern:** `src/lib/photo-pipeline.ts` was not modified by this plan and still loads under plain `node`; 04-07 and 04-09 depend on that and it remains true.

---
*Phase: 04-photo-pipeline-actions-half*
*Completed: 2026-08-27*
