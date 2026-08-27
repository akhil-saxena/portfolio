---
phase: 04-photo-pipeline-actions-half
plan: 07
subsystem: pipeline
tags: [sharp, exif-reader, webp, watermark, lqip, pipe-01, criterion-1, od-9, od-10, od-12]

requires:
  - phase: 04-photo-pipeline-actions-half
    plan: 02
    provides: "src/lib/photo-pipeline.ts — VARIANTS, THUMB, publishedKey, contentHash, OBJECT_CACHE_CONTROL. Every number and every key in this plan comes from there."
  - phase: 04-photo-pipeline-actions-half
    plan: 04
    provides: "sharp@^0.35.4 and exif-reader@^2.0.3 as pinned devDependencies; rich-exif.jpg, no-exif.jpg, small-320px.jpg, expected-exif.json, and the measurement that the OD-12 differential corpus does not exist"
provides:
  - "scripts/lib/photo-derive.mjs — deriveAssets, buildVariants, addWatermark, buildThumb, readSource, extractExif, mapExifFields, captureDate, emptyExif, watermarkFontSize/Inset/Svg, MAX_SOURCE_BYTES, ALLOWED_SOURCE_FORMATS, EXIF_FIELDS"
  - "Upload descriptors — { key, bytes, contentType, cacheControl } per variant, keys composed only by publishedKey, so 04-09's uploader and the record address the same objects by construction"
  - "OD-9 option A implemented by ABSENCE: no code path composes an unwatermarked-master key, asserted at descriptors.length > 0 first"
  - "OD-10 option B implemented: date = DateTimeOriginal ?? ingestionDate, with the exif-reader tag name verified by running it"
  - "The six EXIF field names VERIFIED AGAINST exif-reader: Image.Make, Image.Model, Photo.LensModel, Photo.FNumber, Photo.ExposureTime, Photo.ISOSpeedRatings, Photo.FocalLength"
  - "test/pipeline/variants.unit.test.ts (25 cases) and test/pipeline/exif.unit.test.ts (44 cases) — all assertions on decoded output or on exif-reader's own contract"
  - "MEASURED: the numeric-literal guard in this plan's own <done> block passes on a missing file — the test -f repair B7 applied to the OD-9 grep was never applied to it"
affects: [04-09, 04-10, phase-05-gallery]

tech-stack:
  added: []
  patterns:
    - "Assert on DECODED OUTPUT, never on the arguments handed to the encoder — a call-counting test is green when the pipeline emits nothing"
    - "Prove a visual effect by comparing the module's real path against its own composite-skipped path AND by localising the changed pixels to a region computed from the spec's own inset rule"
    - "Compare the unwatermarked artefact against an encode RE-IMPLEMENTED in the test, so 'the thumb carries no mark' is not a claim the producer makes about itself"
    - "Return a PROBE beside a nullable result, so an all-null answer is distinguishable from a reader that never ran (T-04-32)"
    - "Verify a library's tag names by RUNNING the library, then assert the mapper rejects the rival library's spelling — a mapper that accepted both would pass the first check and still be one rename from silent loss"
    - "When a mandatory proof turns out to be unavailable, recover the half that still is and state in writing which half was lost"

key-files:
  created:
    - scripts/lib/photo-derive.mjs
    - test/pipeline/variants.unit.test.ts
    - test/pipeline/exif.unit.test.ts
  modified:
    - .planning/phases/04-photo-pipeline-actions-half/deferred-items.md

key-decisions:
  - "OD-9 = A: the pipeline stops writing unwatermarked masters entirely. Enforced by absence of the key path; the existing 39 stay reachable and remain Phase 8's."
  - "OD-10 = B: date is DateTimeOriginal ?? ingestionDate. Both branches asserted with synthetic parsed objects in exif-reader's own shape."
  - "captureDate formats from UTC parts, never local getters — exif-reader parses the naive EXIF stamp as UTC, and a local read shifts the day for any evening exposure east of Greenwich."
  - "ONE lossy encode per variant instead of legacy's two: resize to raw pixels, composite the mark onto them, encode WebP once at the variant's own quality. The q85/85/85/80 column is now true of the emitted bytes; under legacy it never was."
  - "MAX_SOURCE_BYTES = 25 MiB, matching the legacy /api/upload cap so both halves of one journey agree; checked before sharp() and at every exported entry point."
  - "addWatermark takes a sharp pipeline and returns one — that is what makes the single-encode path possible."
  - "OD-12's differential proof was NOT available; the recovered substitute proves the mapper's RENDERING against 66 reviewed values and says plainly that the READING half cannot be re-proved."

patterns-established:
  - "Anti-vacuity before the property: descriptors.length > 0 and per-field floors, because an empty list satisfies every 'no X' claim trivially"
  - "A module that owns no number, with the guard against re-typed literals scoped to assignment positions so it does not trip on the spec it enforces"

requirements-completed: [PIPE-01]

metrics:
  duration: 42min
  tasks: 3
  commits: 6
  files-created: 3
  lines: 1103
  tests: "69 new cases · unit 884/884 across 17 files · full suite 942/942 across 24 files"

completed: 2026-08-27
---

# Phase 04 Plan 07: The deriver — variants, watermark, LQIP and EXIF Summary

**One uploaded photograph now becomes four watermarked WebP variants at 2000/1200/800/400 (never
enlarged), a 40px unwatermarked inline LQIP, the source's own dimensions, a six-field EXIF block
mapped from `exif-reader`'s tag names rather than `exifr`'s, and a capture date — with four upload
descriptors and not one key that could add to the unwatermarked-master exposure.**

## Performance

- **Duration:** ~42 min
- **Tasks:** 3 of 3. Task 1 was the OD-9/OD-10 checkpoint, resolved in the brief and in
  `04-RESEARCH.md`'s resolutions table, so it was not re-asked.
- **Commits:** `54a4fec` (RED) · `6ecccd3` (GREEN) · `28dd072` (REFACTOR) · `a5cb728` (RED) ·
  `ac2e5c1` (GREEN) · `62871b2` (REFACTOR), plus this summary
- **Files created:** 3 — 494 module lines, 328 + 281 test lines

---

## The two decisions, as taken

### OD-9 · Option A — the pipeline stops writing unwatermarked masters

`scripts/lib/photo-derive.mjs` has **no code path that composes such a key**. Every key it emits
comes from `publishedKey()`, which can only produce the published prefix. The header says so in the
way `src/schemas/photo.ts` says it about `tags` — the absence is the decision, and the file records
why: the prefix is a path and not a permission, all 39 existing objects are publicly reachable
today, and Akhil deferred that cleanup to Phase 8. **Nothing here deletes them and nothing here
adds to them.**

The real control is the assertion, not the grep. In both suites:

```
expect(assets.descriptors.length).toBeGreaterThan(0);   // anti-vacuity FIRST
for (const descriptor of assets.descriptors) {
  expect(descriptor.key.startsWith('private/')).toBe(false);
}
```

Proven able to fail three ways — a planted backtick-template key, a planted single-quoted string
concatenation, and an empty descriptor list. All three FAIL, and the empty list fails on the
anti-vacuity line specifically. Table below.

### OD-10 · Option B — `date` is `DateTimeOriginal ?? ingestionDate`

`captureDate(parsed, ingestionDate)` reads `DateTimeOriginal` and falls back. Both branches are
asserted with **synthetic parsed objects in `exif-reader`'s own `{ Image, Photo }` shape**, plus
end-to-end through `deriveAssets` on real bytes generated in the test — never by regenerating
04-04's fixtures, which carry no date tag and belong to wave 2.

| Branch | Assertion | Result |
|---|---|---|
| Capture date present | `DateTimeOriginal = Date.UTC(2019,6,4,18,23,45)` → `'2019-07-04'` | PASS |
| Capture date present, real bytes | a JPEG written with `withExif({IFD2:{DateTimeOriginal:'2019:07:04 18:23:45'}})` → `assets.date === '2019-07-04'`, and `!== assets.ingestionDate` | PASS |
| Absent | `full()` with no date tag → the ingestion date | PASS |
| Absent, real bytes | `no-exif.jpg` → the ingestion date | PASS |
| Absent, null parse | `captureDate(null, …)` → the ingestion date | PASS |
| Unusable | `new Date(NaN)` → the ingestion date | PASS |
| String form | `'2021:11:02 06:15:00'` → `'2021-11-02'` | PASS |

**Option C was not considered available.** 04-04 measured the 39 served originals and three of the
unwatermarked masters as single-chunk `VP8` WebP with zero EXIF, verified three ways. The backfill
has nothing to read.

**A consequence, recorded rather than left to be discovered:** the 39 committed records mean *the
day it was published*; every new record will mean *the day it was taken*. That split is permanent.
Phase 5 sorts and displays `date` and has to decide which it presents. The module header says this.

---

## The six EXIF field names, verified against `exif-reader` specifically

Not against the legacy code, not against `exifr`. Verified by **running `exif-reader`** over
`rich-exif.jpg`'s real bytes and printing which key each value arrived under:

| Schema field | `exif-reader` group + tag | Reads back as | `exifr`'s name |
|---|---|---|---|
| `camera` | `Image.Make` + `Image.Model` | `"NIKON CORPORATION"`, `"NIKON D5300"` | same |
| `lens` | `Photo.LensModel` | `"18.0-55.0 mm f/3.5-5.6"` | same |
| `aperture` | `Photo.FNumber` | `11` (number) | same |
| `shutter` | `Photo.ExposureTime` | `0.002` (number) | same |
| `iso` | **`Photo.ISOSpeedRatings`** | `200` (number) | **`ISO`** |
| `focalLength` | `Photo.FocalLength` | `40` (number) | same |

`parsed.Photo.ISO` is **`undefined`** — asserted, not assumed. And because a mapper that read
*either* name would pass that check while still being one rename from silent loss, the mapper is
also fed `{ Photo: { ISO: 200 } }` and required to return `iso: null`. Planting
`positiveInteger(tags.ISOSpeedRatings ?? tags.ISO)` — the plausible "be generous" walk-through —
FAILS that assertion by name.

### `DateTimeOriginal`, verified the same way before anything was built on it

A JPEG is written in-suite with `withExif({ IFD2: { DateTimeOriginal: '2019:07:04 18:23:45' } })`,
re-read through `sharp().metadata().exif`, and parsed:

```
Photo keys: ["ISOSpeedRatings","ExifVersion","DateTimeOriginal","ComponentsConfiguration",
             "FlashpixVersion","ColorSpace","PixelXDimension","PixelYDimension"]
Photo.DateTimeOriginal = 2019-07-04T18:23:45.000Z   instanceof Date = true
```

Two things this pinned that a reading of the typings alone would not have:

1. **It is a `Date`, not a string** — `exif-reader`'s own typings declare it as `Date` in the Exif
   sub-IFD and as `string` in IFD0, so both shapes are reachable and both are handled.
2. **The naive EXIF timestamp is parsed AS UTC.** So `captureDate` formats from
   `toISOString().slice(0,10)` and never from `getFullYear()/getMonth()/getDate()`. A local-getter
   implementation reads the digits back through the runner's timezone and shifts the day for any
   evening exposure east of Greenwich — right in London, wrong in Delhi. The test forces
   `process.env.TZ = 'Asia/Kolkata'` around a `23:59Z` capture so the assertion does not depend on
   where the suite runs, and planting the local-getter version FAILS it by name.

### The `>= 1s` shutter branch — the gap 04-04 named, now covered

`fixtures/README.md` records that the generated files carry a `1/500` exposure, so only the
sub-second branch is reachable through them. Covered here by three synthetic cases:

| Input | Output | Note |
|---|---|---|
| `ExposureTime: 1/250` | `'1/250'` | the common branch |
| `ExposureTime: 2` | `'2s'` | **the branch no fixture reaches** |
| `ExposureTime: 1` | `'1s'` | the boundary itself, on the long branch |

Independently confirmed from the corpus: **all 19 distinct committed `shutter` values are `1/N`.
Not one is a long exposure.** The test asserts that count is zero and says why — it is the evidence
that the synthetic case is the only thing covering the branch, not a redundant duplicate of the data.

### Which OD-12 proof was available: the differential one was NOT

`04-RESEARCH.md` made the 39-record differential **mandatory** for option B. 04-04 Task 1 measured
the corpus out of existence — all 39 served objects and the three masters it probed are
single-chunk `VP8` with no `EXIF`, `XMP` or `ICCP`, by a raw chunk walk, by `metadata().exif` and by
the container header. **The reading half can never be re-proved.**

What was recovered instead, in this plan's REFACTOR commit: **the rendering half, against the
corpus that does exist.** Every non-null `aperture`, `shutter`, `focalLength` and `iso` in the
reviewed manifest is turned back into the tag it came from and pushed through the mapper, which
must return the committed string character for character — 66 distinct values across four fields,
with per-field floors so a truncated read refuses to pass. `camera` and `lens` are excluded because
a `Make`/`Model` split is not recoverable from a joined value.

It is weaker than the lost proof in one stated way, and both the test header and the module header
say which: **it shows the mapper agrees with 39 reviewed values on FORMAT, not that `exif-reader`
reads the same numbers `exifr` read in 2026-03.** Proven able to fail: rounding `f/${aperture}`
FAILS naming aperture, and emptying the manifest FAILS all five cases on their floors rather than
passing vacuously.

---

## The variant and watermark spec, as built

```
resize     sharp(src).resize({ width: Math.min(variant.maxWidth, sourceWidth),
                               withoutEnlargement: true })
                     .toColourspace('srgb').raw()
watermark  SVG <text>akhil saxena</text>, sized to the whole image
           font-family  monospace        font-weight  400
           font-size    Math.max(10, Math.min(24, Math.round(width * 0.01)))
           fill         rgba(255,255,255,0.20)
           anchor       text-anchor="end", x = width - inset, y = height - inset
           inset        Math.round(width * 0.015), both axes
           letter-spacing 0.08em
           composited with gravity 'center'   —   ON ALL FOUR VARIANTS
encode     .webp({ quality: variant.quality })      —   ONCE
thumb      resize to THUMB.width, withoutEnlargement, .webp({ quality: THUMB.quality })
           `data:image/webp;base64,…`               —   NO WATERMARK
```

**Measured output**, both fixtures, through the shipped module:

```
rich-exif.jpg   source 2400x1600 jpeg   dimensions=2400x1600   date=2026-08-27 (fallback)
  original 2000x1333 q85  38886B  hash=03b1f04e  fontSize=20
  large    1200x 800 q85  19462B  hash=41e46477  fontSize=12
  medium    800x 533 q85  12342B  hash=1e065903  fontSize=10
  small     400x 267 q80   5122B  hash=fed004e8  fontSize=10
  thumb      40x  27 q60    378B
  exif {"camera":"NIKON CORPORATION NIKON D5300","lens":"18.0-55.0 mm f/3.5-5.6",
        "aperture":"f/11","shutter":"1/500","iso":200,"focalLength":"40mm"}
  probe {"metadataRead":true,"exifPresent":true,"exifBytes":348,"parsed":true,"failure":null}

small-320px.jpg source 320x213 jpeg    dimensions=320x213     date=2026-08-27 (fallback)
  original  320x 213 q85   4974B  hash=e5efd41f  fontSize=10
  large     320x 213 q85   4974B  hash=e5efd41f  fontSize=10
  medium    320x 213 q85   4974B  hash=e5efd41f  fontSize=10
  small     320x 213 q80   4246B  hash=58f85bd8  fontSize=10
  thumb      40x  27 q60    368B
  exif  six nulls
  probe {"metadataRead":true,"exifPresent":false,"exifBytes":0,"parsed":false,"failure":null}
```

Four things worth reading off that:

- **`withoutEnlargement` holds.** All four of `small-320px`'s variants decode to **320**, not to
  2000/1200/800/400. Asserted on all four, not only on `original`.
- **`dimensions` is the SOURCE size (OD-11).** `2400x1600` while `urls.original` is `2000x1333`, so
  the two contracts are distinguishable on this fixture. A fixture where they coincide could not
  tell them apart.
- **The font size exercises both ends of the clamp** — 20 at 2000 wide, floored to 10 from 800
  down. The `24` ceiling is unreachable through `VARIANTS` (nothing is emitted wider than 2000) and
  is asserted directly on `watermarkFontSize(3000)` so the whole rule is proven rather than the part
  the table happens to reach.
- **Three of `small-320px`'s four hashes coincide, and that is correct.** The three `q85` variants
  are byte-identical at 320px. The keys still differ by suffix, so the four URLs are distinct and
  each resolves to the object written under it. Documented in `deriveAssets`' JSDoc so nobody
  "fixes" it.

### The watermark, proven by bytes and by pixels

| Proof | Method | Result |
|---|---|---|
| On all four variants | real path vs `{ watermark: false }`, bytes compared | all four DIFFER |
| Localised to the mark | decode both to raw pixels; box computed from `Math.round(width * 0.015)` and `watermarkFontSize(width)`, never hardcoded | bottom-right box **7707** differing pixels · top-left box **0** |
| Not on the thumb | byte-identical to an unwatermarked encode **re-implemented in the test** | identical |

The thumb proof is the important one: it does not come from the deriver, so "the LQIP carries no
mark" is not a claim the producer makes about itself. Planting a composite into `buildThumb` makes
it FAIL by name.

### The prose in `CLAUDE.md` is wrong, and the module says so

`CLAUDE.md`'s Architecture section says the legacy pipeline applied the watermark to "original and
medium (not thumb)". The legacy code contradicts its own comment — `addWatermark()` is called
inside `for (const variant of VARIANTS)`, so it ran on all four. The module implements the code's
behaviour and the header records that the prose was wrong.

### One deliberate departure from the legacy code shape

Legacy encoded each variant to WebP at the table's quality, then re-opened that WebP, composited
the mark, and called `.toBuffer()` **with no format method** — which makes sharp re-encode to WebP
at its own default quality. So the bytes actually serving all four live variants are a
second-generation encode at the default, and the `q85/85/85/80` in the requirement was **never true
of the delivered file**.

Here the resize output is taken as raw pixels, the mark is composited onto those pixels, and WebP is
encoded **once** at the variant's own quality. Same visual specification, one generation of loss
instead of two, and the quality column of `VARIANTS` becomes true of the emitted bytes. Raw is also
what makes the geometry exact — the SVG must be the size of the resized image, and `info.height` off
the raw buffer is the real height rather than a rounded guess. `.toColourspace('srgb')` precedes
`.raw()` so a CMYK source does not hand back four bands the re-open would read as RGBA.

This is why `addWatermark` takes a **sharp pipeline and returns one**: a buffer-in/buffer-out
signature would force it to decode and the caller to re-encode.

---

## Security controls (T-04-28, T-04-29, T-04-32, T-04-33)

| Threat | Control | Asserted by |
|---|---|---|
| T-04-28 decompression bomb | `MAX_SOURCE_BYTES` = 25 MiB, checked **before** `sharp()`; `limitInputPixels` left ON with a comment forbidding its removal | an oversized buffer that is **not a valid image** must fail naming the limit — if the order were swapped it would name the format instead |
| T-04-28 (bypass) | the cap is also applied inside `buildVariants` and `buildThumb`, both exported | both refuse an oversized buffer; a cap on one of two doors is not a cap |
| T-04-29 format trust | allowlist read from `metadata().format`, never an extension; `svg` and `gif` deliberately excluded | a text buffer is refused naming what it was; a zero-length buffer is refused |
| T-04-32 silent all-null | `extractExif` returns a probe: `metadataRead / exifPresent / exifBytes / parsed / failure` | a stub returning six nulls without reading FAILS "proves the metadata probe RAN and found nothing" |
| T-04-33 corrupt segment | any throw yields six nulls plus a **`process.stderr.write`** warning, and the job continues | the throw path is asserted, and the write is observed with a spy |

`process.stderr.write`, not `console.warn` — `console.log` and `console.info` print **nothing** under
this repository's vitest setup (`04-VALIDATION.md` hazard 7), and a warning nobody can see is a
warning that does not exist. stderr is visible both on an Actions runner and to the test.

`MAX_SOURCE_BYTES` is 25 MiB because that is the cap the legacy `/api/upload` enforced. Two
different caps on the two halves of one journey is a photograph that uploads and then silently never
appears. The dispatch path this phase implements had **no cap at all**.

---

## Every gate proven able to fail

**Shell: `zsh`** for all of it — the interactive shell of this machine, confirmed with
`ps -p $$ -o comm=`. Actions runs bash; nothing below uses `${PIPESTATUS[0]}`, `R=$?` or
`( cmd && R=0 || R=1 )`. Every capture is `if cmd; then R=0; else R=1; fi`.

**Where:** a `git clone --no-hardlinks` sandbox with `node_modules` symlinked in and its `.git`
intact (hazard 3: a tree copied without history fabricates failures). **The working tree was never
mutated and `git status` stayed clean throughout.** `0` = pass, `1` = fail.

| Plant | variants | exif | numeric grep | private grep | The assertion that named it |
|---|---|---|---|---|---|
| **none (correct code)** | **0** | **0** | **0** | **0** | — |
| drop `withoutEnlargement` + `Math.min` | 1 | 0 | 0 | 0 | `never enlarges: a 320px source yields FOUR 320px variants` |
| composite the mark onto the thumb | 1 | 0 | 0 | 0 | `leaves the thumb untouched — byte-identical to an independent unwatermarked encode` |
| hash all four from the source | 1 | 0 | 0 | 0 | `hashes each variant from ITS OWN bytes, so the four are pairwise distinct` + `addresses each object by the hash of the bytes it carries` |
| `dimensions` = the emitted size | 1 | 0 | 0 | 0 | `equals sharp(source).metadata(), and differs from the original variant` |
| **emit nothing** (empty variants, thumb, descriptors) | 1 | 1 | 0 | 0 | 9 cases incl. `emits exactly one variant per entry in VARIANTS` and the OD-9 anti-vacuity line |
| move the cap after the decode | 1 | 0 | 0 | 0 | `refuses a buffer larger than MAX_SOURCE_BYTES, naming the limit` |
| add a master key (backtick template) | 1 | 1 | 0 | **1** | `emits descriptors at all, THEN emits none under that prefix` |
| add a master key (single-quoted concat) | 1 | 1 | 0 | **1** | same — and the grep still catches it |
| **`descriptors: []`** | 1 | 1 | 0 | 0 | `descriptors.length > 0` — the anti-vacuity line, exactly as intended |
| `tags.ISO` (the hazard-11 defect) | 0 | 1 | 0 | 0 | `reads exif-reader names and NOT exifr names` + `iso` + `returns iso as a NUMBER` |
| `ISOSpeedRatings ?? ISO` (**walk-through**) | 0 | 1 | 0 | 0 | `reads exif-reader names and NOT exifr names` |
| `DateTimeDigitized` instead of `DateTimeOriginal` | 0 | 1 | 0 | 0 | 4 OD-10 cases incl. `surfaces the capture date through deriveAssets on real bytes` |
| local getters in the date formatter | 0 | 1 | 0 | 0 | `reads the tag the camera wrote, not the runner local day` |
| `extractExif` stubbed to return nulls unread | 0 | 1 | 0 | 0 | `proves the metadata probe RAN and found nothing, rather than never opening the file` |
| re-type `{ maxWidth: 2000, quality: 85 }` | 0 | 0 | **1** | 0 | the numeric guard |
| round `f/${aperture}` | 0 | 1 | 0 | 0 | `reproduces every committed aperture from its FNumber` |
| **manifest emptied** (nothing to check) | 0 | 1 | 0 | 0 | all five corpus cases fail on their floors — no vacuous pass |
| **delete the module** | 1 | 1 | **0 ← hole** | **1** | see below |

Four steps, per the contract: **plant → FAIL naming it · nothing to check → FAIL · correct code →
PASS · walk-through attempted.** Two walk-throughs were tried and both were caught — the "accept
both tag names" generosity, and composing the forbidden key by string concatenation instead of a
template literal.

### The B4 repair matters, re-verified

The shipped module contains `font-weight="400"` and `letter-spacing="0.08em"` — the watermark
specification this plan itself mandates. The **pre-repair** numeric pattern
`\b(2000|1200|800|400|85|80|60|40)\b` **matches line 366**, i.e. it would have failed on code
conforming to the plan. The repaired form, scoped to assignment positions, does not. Do not widen
it back.

### FINDING · the numeric guard has the hole B7 repaired for the OD-9 guard

Measured, and it is why `delete` shows `numeric grep = 0` above:

```
$ grep -nE '(maxWidth|width|height|quality)\s*[:=]\s*[0-9]' scripts/lib/does-not-exist.mjs
  -> no match, exit 2   ==> reads as PASS
$ test -f … && ! grep -nE "^[^*/]*['\"`]private/" …/does-not-exist.mjs
  -> FAIL, correctly
```

The OD-9 grep got a `test -f` prefix in the B7 repair precisely because a bare `! grep` passes on a
missing file. **The numeric guard beside it never got the same treatment**, so its "returns nothing"
success condition is satisfied by a file that does not exist. Not a live risk here — the module
exists and the load-bearing check is the decoded-width assertion — but logged in `deferred-items.md`
with the corrected shape for whoever lifts either grep into a script.

---

## Contradictions with the plan and the research

1. **`CLAUDE.md`'s watermark prose is false**, as the plan predicted. Recorded in the module header.
2. **The requirement's `q85/85/85/80` was never true of the legacy output.** The plan quotes the
   legacy `addWatermark` verbatim as the spec; that code's second encode uses sharp's *default*
   quality, discarding the table's. Implemented as a single encode at the table's quality instead —
   the requirement's reading, not the code's. Departure recorded in the header.
3. **The plan's `<interfaces>` EXIF pick-list is `exifr`'s**, including `ISO`. Under OD-12 = B that
   list is wrong for five of seven names in *placement* and one in *spelling*. The mapper is written
   against `exif-reader` and the names are verified by running it.
4. **The plan's `<done>` numeric grep is missing the `test -f` guard.** See above.
5. **`rich-exif.jpg` yields `date = 2026-08-27`, the fallback** — 04-04's fixtures carry no date
   tag, exactly as the brief said. The capture branch is therefore proven on bytes generated inside
   the test rather than on a committed fixture, which is what keeps wave 2 from being inverted.

Nothing else contradicted the plan.

## Known Stubs

None. Every exported function is implemented and exercised; nothing returns a placeholder value and
no component is wired to empty data.

## Threat Flags

None. This plan introduces no network endpoint, no auth path and no schema change. `sharp` and
`exif-reader` were added by 04-04 behind the Package Legitimacy Gate; **this plan installed
nothing** and did not open `package.json`.

---

## Verification

| Command | Result |
|---|---|
| `npx vitest run --project unit test/pipeline/variants.unit.test.ts` | 25/25, exit 0 |
| `npx vitest run --project unit test/pipeline/exif.unit.test.ts` | 44/44, exit 0 |
| `npx vitest run --project unit` | **884/884 across 17 files**, exit 0 |
| `npm test` | **942/942 across 24 files**, exit 0 |
| `npm run check` | exit 0 |
| `npm run typecheck` (`astro check`) | 0 errors, 0 warnings |
| `npx astro sync` | exit 0 |
| `npm run gate:schema` / `gate:sinks` / `gate:origin` / `gate:routes` / `gate:content` | all exit 0 |
| `npm run gate:liveness` | exit 0 |
| `node -e "import('./scripts/lib/photo-derive.mjs')"` | loads under plain `node` |
| `node -e "import('./src/lib/photo-pipeline.ts')"` | still loads under plain `node` |
| numeric-literal guard | no matches |
| OD-9 private-key guard | passes |

`data/portfolio_images.json` was **read only** and is byte-identical.

## TDD Gate Compliance

Both cycles ran RED → GREEN → REFACTOR with a commit at each gate, and every RED test came from
`<behavior>` rather than from `<done>`:

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 2 · variants, watermark, thumb, dimensions | `54a4fec` — fails on the absent module | `6ecccd3` — 24/24 | `28dd072` — the cap at every exported door |
| 3 · EXIF and `date` | `a5cb728` — **34 failed, 5 passed**; the 5 are the library-level tag checks and Task 2's descriptors | `ac2e5c1` — 39/39 | `62871b2` — the recovered corpus proof |

Task 3's RED is the stronger of the two: it fails on *behaviour* rather than on a missing import,
and the five that passed are precisely the assertions that check `exif-reader` itself rather than
this module.

## What 04-09 wires up

```js
const assets = await deriveAssets({ bytes, category, slug, ingestionDate });
const record  = buildRecord({ inputs, assets, date: assets.date, manifest });
for (const d of assets.descriptors) { /* PutObject d.key, d.bytes, d.contentType, d.cacheControl */ }
```

`assets` is already the exact shape `buildRecord` consumes — `slug`, `variants` keyed by `urlKey`
with `{ bytes, hash }`, `thumb`, `dimensions`, `exif`. `date` is the one line OD-10 was deferred
into, and it is now computed. `exifProbe` is available for the job log.

## Deferred

Both entries are in `deferred-items.md`: `yaml` is still an undeclared transitive dependency and
`engines.node` still understates its floor (04-06's entry), and the numeric guard needs the
`test -f` repair. **This plan did not edit `package.json`.**

## Self-Check: PASSED

All three created files exist on disk; all seven commits (`54a4fec`, `6ecccd3`, `28dd072`,
`a5cb728`, `ac2e5c1`, `62871b2`, `950ff82`) resolve in `git log`; every one is authored
`Akhil Saxena <saxena.akhil42@gmail.com>` with no AI attribution trailer; the working tree is
clean; and `git diff --diff-filter=D 54a4fec^ HEAD` lists no deletions — nothing was swept.
