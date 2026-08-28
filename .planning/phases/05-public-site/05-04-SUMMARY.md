---
phase: 05-public-site
plan: 04
subsystem: photo-display
tags: [pub-07, pub-08, exif, gates, purity, workerd]
requires:
  - "05-01 (the workerd prerender finding, and the no-node-imports rule it produced)"
provides:
  - "src/lib/exif-display.ts — displayCamera / displayLens / exifRows, pure, no runtime imports"
  - "CAMERA_DISPLAY_NAMES / LENS_DISPLAY_NAMES — the two frozen lookup tables"
  - "EXIF_ROW_ORDER / EXIF_LABELS — the row order and the <dt> text, in one place"
  - "scripts/assert-exif-display-coverage.mjs — the build refusal on an unknown camera or lens"
affects:
  - "05-09 (the photo detail page renders exifRows())"
  - "05-10 / the Lightbox island (same module, browser chunk — this is why it is pure)"
  - "05-14 (owns wiring gate:exif into package.json; this plan deliberately did not)"
  - "Phase 7 admin (imports the same module; a new camera is a table edit plus a green gate)"
tech-stack:
  added: []
  patterns:
    - "a gate that CALLS the module under test rather than restating its data"
    - "Node 22 type-stripping: plain `node` imports a .ts module whose only import is `import type`"
    - "canaries derived from the real table keys, so the self-test cannot go stale"
key-files:
  created:
    - src/lib/exif-display.ts
    - scripts/assert-exif-display-coverage.mjs
    - test/public/exif-display.unit.test.ts
  modified: []
decisions:
  - "The lookup is EXACT — a case variant and a trailing space are refused, and that refusal is a permanent canary in the gate's self-test rather than a note"
  - "The ISO row is {label:'ISO', value:'200'}, not value 'ISO 200' — the plan's literal wording would render 'ISO: ISO 200'"
  - "The gate reads the tables by importing the module (mechanism (a)), measured to work with AND without --experimental-strip-types"
  - "Anti-vacuity is on the COMBINED camera+lens count, not per-field — per-field would red a legitimate phone-only import"
metrics:
  duration: "~1h"
  tasks: 2
  commits: 3
  completed: 2026-08-28
---

# Phase 5 Plan 04: EXIF Display Summary

`src/lib/exif-display.ts` turns the raw EXIF corpus into human names and omits absent fields
entirely, and an undecodable camera or lens string is now a build refusal that names both the
value and the photograph rather than a guess or a model code on the page.

**Everything below was measured. The two degenerate records were read out of
`data/portfolio_images.json` at check time, not typed into a fixture, and the module was proven
to run inside `workerd` — not merely green under vitest.**

---

## The display rules

### PUB-07 — a null field produces no row, and six nulls produce no block

`exifRows(exif)` is the **only** implementation. It returns `Array<{ label, value }>`, skipping
every field whose stored value is `null`. An empty array is a complete answer meaning *render no
block at all* — the caller checks `rows.length === 0`, not each field. No page may build its own
row list; PUB-07 would then have two implementations and one of them grows an em dash the first
time a gap looks unbalanced.

| Field | Label | Value |
|---|---|---|
| `camera` | Camera | `displayCamera(raw)` |
| `lens` | Lens | `displayLens(raw)` |
| `focalLength` | Focal length | verbatim |
| `aperture` | Aperture | verbatim |
| `shutter` | Shutter | verbatim |
| `iso` | ISO | `String(iso)` |

Row order is fixed in `EXIF_ROW_ORDER` and is Camera, Lens, Focal length, Aperture, Shutter, ISO.
Labels are in `EXIF_LABELS`. Both are exported so a page never restates them.

`wildlife-starfish`'s `"4.745mm"` renders **verbatim**, as §9.5 rules — a rounding rule for one
record is a second formatter earning its keep once.

### PUB-08 — the camera and lens transform, and where it lives

`src/lib/exif-display.ts`, two frozen `Record<string, string>` tables:

| Raw `exif.camera` | Display |
|---|---|
| `NIKON CORPORATION NIKON D5300` | Nikon D5300 |
| `samsung Galaxy Z Fold5` | Samsung Galaxy Z Fold5 |
| `SONY ILCE-7CM2` | Sony α7C II |
| `samsung SM-N970F` | Samsung Galaxy Note10 |
| `OnePlus AC2001` | OnePlus Nord |

| Raw `exif.lens` | Display |
|---|---|
| `18.0-55.0 mm f/3.5-5.6` | 18–55mm f/3.5–5.6 |
| `70.0-300.0 mm f/4.5-6.3` | 70–300mm f/4.5–6.3 |
| `Samsung Galaxy Z Fold5 Rear Wide Camera` | Wide |
| `FE 28-60mm F4-5.6` | Sony FE 28–60mm f/4–5.6 |

`displayCamera(null)` / `displayLens(null)` return `null`. An unrecognised **non-null** value
**throws**, naming itself. The three decoded model codes carry their citations in the module
header (Samsung support + GSMArena for `SM-N970F`, DeviceAtlas for `AC2001`, Adorama for
`ILCE-7CM2`), so the next reader can audit rather than trust.

**The lookup is an own-property check, not `table[value]`.** A plain object inherits
`constructor`, `toString` and `valueOf`, so a bare index would return a *function* for a stored
value of `"toString"` and put `function toString() { [native code] }` on the page. Planted and
proven: control 5d, and a permanent canary in the gate's self-test.

---

## The zero-rows and one-row proofs, read from the real manifest

Both are asserted twice — in vitest by reading the file with `node:fs`, and **in the real
prerender**, inside `workerd`, from a probe page created and deleted within this plan:

```
<pre id="runtime">records=40 | userAgent=Cloudflare-Workers | cwd=/bundle</pre>
<pre id="peppers">peppers rows=0 []</pre>
<pre id="red">red rows=1 [{"label":"Camera","value":"Nikon D5300"}]</pre>
<pre id="starfish">starfish [{"label":"Camera","value":"OnePlus Nord"},
                     {"label":"Focal length","value":"4.745mm"},
                     {"label":"Aperture","value":"f/1.8"},
                     {"label":"Shutter","value":"1/2800"},
                     {"label":"ISO","value":"125"}]</pre>
<pre id="refusal">exif-display: no display name for camera "CANON EOS UNKNOWN-9000". Add it to …</pre>
```

- **`product-peppers` → 0 rows.** All six fields null. No heading, no rule, no empty panel.
- **`architecture-redbuilding` → exactly 1 row**, `Camera` / `Nikon D5300`.
- **`wildlife-starfish`** shows the omit rule working mid-list: `lens` is null, so there is no
  Lens row and the remaining five keep their order.
- **The refusal fires inside workerd**, not only in Node.

Both suite assertions guard their own premise: if `product-peppers` ever gains a field, or
`architecture-redbuilding` ever gains a second, the test **fails saying the degenerate case needs
a new witness** rather than quietly passing on a record that no longer demonstrates anything.

**This is why the probe page existed.** 05-01 measured that the Astro prerender runs in `workerd`
(`import.meta.url` undefined, `process.cwd() === '/bundle'`, no filesystem) and that its first
implementation *passed 13/13 unit tests and then died in the build*. Vitest runs in Node; the
pages do not. `src/pages/exif-probe.astro` was created, built, read out of `dist/client/`, and
deleted; it appears in no commit (`git log --all -- src/pages/exif-probe.astro` is empty).

---

## Mechanism for reading the tables — measured, per the plan's instruction

The plan asked for option (a) to be measured first. **It works, and it works without the flag:**

```
node <script importing src/lib/exif-display.ts>                       exit 0
node --experimental-strip-types <same>                                exit 0   (identical output)
```

Node strips TypeScript types **by default from 22.18 onward**, and `.nvmrc` pins 22.22.3. So the
gate is a plain `node scripts/assert-exif-display-coverage.mjs`, with no flag — one less thing
05-14 has to remember when it wires this into `package.json`.

**It works for one fragile reason, and the gate's header says so by name.** `exif-display.ts`'s
only import is `import type { PhotoExif }`, which type-stripping **erases**, so Node never has to
resolve the extensionless `../schemas/photo` specifier — which it cannot resolve. If that module
ever gains a **value** import of an extensionless relative specifier, the gate stops loading; the
`catch` prints exactly that diagnosis and points at option (b). Option (b) is not needed and was
not taken.

Option (b) is nonetheless **already half-built**: `test/public/exif-display.unit.test.ts` asserts
the same coverage over the same corpus, so if the build-time position is ever lost, the claim is
not.

---

## The gate — four-step proof, every control run under bash

**Shell for every control below: `/opt/homebrew/bin/bash`, GNU bash 5.3.9(1)-release
(aarch64-apple-darwin25.1.0).** The interactive shell here is zsh and Actions runs bash, so no
control was believed from a zsh run. No `${PIPESTATUS[0]}` and no `( cmd && R=0 || R=1 )` — the
form throughout is `if node …; then RC=0; else RC=$?; fi`. Every fixture was written into
`mktemp -d`; **`data/portfolio_images.json` was never modified** (verified after the run:
`git status --short data/portfolio_images.json` → empty).

### `scripts/assert-exif-display-coverage.mjs` — 14 controls

| # | Control | Exit | What it printed |
|---|---|---:|---|
| 1 | **PLANTED DEFECT** — one camera → `CANON EOS UNKNOWN-9000` | **1** | `x abstract-intothemist — exif.camera = "CANON EOS UNKNOWN-9000"` … `has no entry in CAMERA_DISPLAY_NAMES` |
| 2 | **PLANTED DEFECT** — one lens → `EF 50mm f/1.8 STM` | **1** | `x abstract-intothemist — exif.lens = "EF 50mm f/1.8 STM"` … `has no entry in LENS_DISPLAY_NAMES` |
| 3a | **NOTHING TO CHECK** — `[]` | **1** | `holds zero records. An empty array satisfies every per-record rule without reading a record.` |
| 3b | **NOTHING TO CHECK** — a missing file | **1** | `cannot read … ENOENT` / `A gate that passes because its input is missing has checked nothing.` |
| 3c | **NOTHING TO CHECK** — `{"photos":[]}`, a non-array | **1** | `is not an array (got object)` |
| 3d | **NOTHING TO CHECK** — 1 record, all six exif fields null | **1** | `1 record(s) scanned and NOT ONE non-null camera or lens string among them.` |
| 3e | **NOTHING TO CHECK** — an empty-string path argument | **1** | `an empty manifest path was passed` — refuses to fall back to the real file |
| 3f | **MALFORMED** — a record with no `exif` object | **1** | `has no exif object … an absent object is a malformed record, not an empty one.` |
| 4 | **CORRECT DATA** — the committed manifest, no argument | **0** | full inventory, quoted below |
| 5a | **WALK-THROUGH** — `nikon corporation nikon d5300` | **1** | caught — the lookup is exact |
| 5b | **WALK-THROUGH** — `NIKON CORPORATION NIKON D5300 ` (trailing space) | **1** | caught |
| 5c | **WALK-THROUGH** — camera stored as the number `5300` | **1** | `is a number, not a string` — and the checked-value count dropped 68 → 67, derived |
| 5d | **WALK-THROUGH** — camera `"toString"` | **1** | caught — own-property lookup |
| 6 | **PLANTED DEFECT IN THE MODULE** — the `throw` replaced by a fallback, run against the **real** manifest | **1** | `SELF-TEST FAILED — this gate cannot be trusted` with 8 named canary failures |
| 7 | **PLANTED DEFECT IN THE MODULE** — `displayLens` removed from the exports | **1** | `no longer exports displayLens. Deleting the thing under test must never be what makes a gate green.` |

Control 4, verbatim — **every number derived from the file it read**:

```
assert-exif-display-coverage: PASS
  manifest: data/portfolio_images.json
  40 record(s) scanned, 68 non-null camera/lens value(s) resolved
  5 distinct camera string(s):
       31 x "NIKON CORPORATION NIKON D5300"
        3 x "samsung Galaxy Z Fold5"
        3 x "SONY ILCE-7CM2"
        1 x "OnePlus AC2001"
        1 x "samsung SM-N970F"
  4 distinct lens string(s):
       18 x "18.0-55.0 mm f/3.5-5.6"
        5 x "70.0-300.0 mm f/4.5-6.3"
        3 x "FE 28-60mm F4-5.6"
        3 x "Samsung Galaxy Z Fold5 Rear Wide Camera"
  tables: 5 camera entr(ies), 4 lens entr(ies), read from src/lib/exif-display.ts — not restated here
  self-test: both lookups flagged their unknown, case-variant, trailing-space and
             Object.prototype canaries, and left their own table keys and null alone
  every count above is derived from data/portfolio_images.json; none is written into this file
```

**39 + 29 = 68.** There is no `40`, no `5` and no `4` written anywhere in the gate.

**Control 6 is the one that matters most**, because it is the only one that tests the gate rather
than the data. The gate has no copy of the tables — it calls the module — so weakening the module
could have made the gate silently agree. It does not: the self-test runs before a single record is
read, and it fired with all eight canaries named:

```
assert-exif-display-coverage: SELF-TEST FAILED — this gate cannot be trusted.
  x camera: did NOT throw naming "NIKON CORPORATION NIKON D5300 ZZ-NOT-A-REAL-DEVICE" — this gate cannot detect a missing entry
  x camera: accepted the case variant "nikon corporation nikon d5300" — the lookup is not exact
  x camera: accepted "NIKON CORPORATION NIKON D5300 " — trailing whitespace is not being refused
  x camera: "toString" resolved — the lookup is an index, not an own-property check
  x lens:   … the same four …
  Refusing to report on real data with a broken check.
```

The canary strings are **derived** from the real table keys (`${firstKey} ZZ-NOT-A-REAL-DEVICE`,
`firstKey.toLowerCase()`, `` `${firstKey} ` ``), so they cannot go stale when a camera is added.

### `test/public/exif-display.unit.test.ts` — 8 controls

Same shell. The suite's corpus path is overridable by `EXIF_DISPLAY_CORPUS` **only** so its own
anti-vacuity guards can be proven to fire without moving `data/portfolio_images.json` aside in a
wave where three executors share one index. CI sets nothing and therefore reads the real file.

| # | Control | Exit | Result |
|---|---|---:|---|
| 1 | **PLANTED** — `displayCamera` falls back instead of throwing | **1** | 4 failed / 33 |
| 2 | **PLANTED** — an em dash emitted for every null field (the PUB-07 defect itself) | **1** | 8 failed — including the two degenerate-record assertions and `never emits a placeholder value anywhere in the corpus` |
| 3 | **PLANTED** — bare `table[raw]` index | **1** | 1 failed — only the prototype test, which is exactly the one that should |
| 4 | **PLANTED** — `import fs from 'node:fs'` | **1** | 2 failed — the purity scan and the type-only-import rule |
| 5 | **PLANTED** — a typo in one display name (`Nikon D5200`) | **1** | 4 failed — including the independent expectation table |
| 6 | **NOTHING TO CHECK** — an empty corpus array | **1** | suite refuses to collect: `holds zero records — every per-record claim here is vacuous` |
| 7 | **NOTHING TO CHECK** — a missing corpus file | **1** | suite refuses to collect (ENOENT) |
| 8 | **NOTHING TO CHECK** — one record, all six fields null | **1** | 6 failed, led by `actually exercises both tables — neither lookup is checked zero times` |
| — | **CORRECT CODE** — the committed manifest | **0** | **33 passed / 33** |

The module was restored byte-identically after every plant (`diff -q` against a pristine copy,
asserted at the end of each run).

### The plan's own `<verify>` blocks, run verbatim

Both were run as written, under bash, and both pass:

- Task 1 — `npx vitest run …` then `grep -nE "^[[:space:]]*import .+node:"` → `OK: no node import`.
- Task 2 — the three-step unknown-camera / empty-manifest harness → `OK: unknown camera caught`,
  `OK: refused an empty manifest`.

**The repaired purity pattern was re-measured and the plan's `<done>` figures reproduce exactly:**

```
grep -cE "node:"                             src/lib/exif-display.ts   ->  1
grep -cE "^[[:space:]]*import .+node:"       src/lib/exif-display.ts   ->  0
```

The one token hit is the module header's own sentence forbidding `node:` imports. The import
pattern was **not** widened.

---

## Corrections and contradictions

### 1. 🔴 The plan's `<verification>` block still carries the retired token grep

`<done>` was repaired to the import-statement form; **`<verification>` was not.** It still says:

> `grep -rn "node:" src/lib/exif-display.ts` finds nothing.

That is **unsatisfiable by any file carrying this plan's own mandated header**, which is required
to name the three model-code citations *and* state the no-`node:`-import rule. Measured above: a
conforming file scores **1** on the token pattern and **0** on the import pattern — exactly what
`<done>` predicts, two blocks apart in the same file. Treated as the stale half of an already-made
repair and **not** acted on; the import-statement form is what ran.

### 2. The ISO row — a deliberate departure from the plan's literal wording

The plan states `iso: 200` "renders as `ISO 200`", and §9.3 says the same. The row is a `<dl>`
pair — §9.3 fixes the layout as a label in IBM Plex Mono beside a value in DM Sans — so a value of
`"ISO 200"` renders **`ISO: ISO 200`**. Implemented as `{ label: 'ISO', value: '200' }`, which is
the only reading that reaches a reader as "ISO 200". The requirement is not reinterpreted away:
the suite asserts the joined form, `` `${row.label} ${row.value}` === 'ISO 200' ``, so if a later
plan changes either half the assertion goes red. Recorded in the module header at the point a
reader would question it.

### 3. The UI-SPEC's §9 figures are stale in six more places — the manifest is at **40**

Derived, never literalled. §9.5's **tables cover the corpus unchanged** (the 40th record,
`wildlife-gentlegiants`, is `SONY ILCE-7CM2` / `FE 28-60mm F4-5.6`, both already present), but six
stated numbers no longer hold:

| §9 claim | Stated | Measured at 40 |
|---|---:|---:|
| corpus size | 39 | **40** |
| `SONY ILCE-7CM2` photos | 2 | **3** |
| `FE 28-60mm F4-5.6` photos | 2 | **3** |
| `place` present | 16 of 39 | **17 of 40** |
| §9.4 distinct dates | "exactly two" | **three** — `2026-01-24`, `2026-03-28`, `2026-04-07` |
| §9.6 prerendered detail pages | 39 | **40** |

The per-field null counts are **unchanged** — camera 1, lens 11, aperture 2, shutter 2, iso 2,
focalLength 2, and 11 records with at least one null — because `wildlife-gentlegiants` carries all
six fields. So §9.3's degenerate-case argument survives intact.

**§9.4's conclusion is not weakened by the third date — it is strengthened.** Three values across
a corpus of forty, one of them two months adrift, is even less of a capture history than two was.
Do not display or sort by `photo.date`.

### 4. Anti-vacuity is on the combined count, and the residual is recorded

A corpus with cameras but **no** non-null lens would exercise the lens table zero times and still
pass. Making the check per-field would red the build on a legitimate phone-only import, and a gate
that fires on correct data gets turned off — this repository has the receipts. The combined check
catches the unambiguously vacuous case and no more. Recorded as **R1** in the gate's own header,
alongside **R2**: the gate proves a display name *exists*, never that it is *correct*
(`'OnePlus AC2001': 'Leica M11'` would pass here). Correctness rests on the citations in the module
header and on the independently written expectation table in the unit suite, which would disagree.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] My own comment-stripper canary could not fire**
- **Found during:** Task 1, on the first green run — the canary failed, not the module.
- **Issue:** the fixture was a JSDoc line, `` * import fs from 'node:fs' ``. It starts with `*`,
  so `^\s*import` never matched it and the "stripper removes it" assertion was testing nothing.
- **Fix:** the fixture is now a **block-commented-out import** starting at column 0, which does
  match; the JSDoc case is asserted as a **non**-match beside it, which documents precisely why
  the plan's shell gate was repaired to the import-statement form.
- **Files:** `test/public/exif-display.unit.test.ts` · **Commit:** `e923e0b`

**2. [Rule 2 — Missing critical functionality] Own-property lookup**
- Not in the plan. `table[value]` returns a *function* for a stored `"toString"` — a real
  possibility on hand-edited data, and the rendered output would be
  `function toString() { [native code] }`. `Object.hasOwn` throughout, with a test and a
  permanent gate canary. **Commit:** `e923e0b`

**3. [Rule 2 — Missing critical functionality] The gate refuses on five more shapes than the plan asked for**
- The plan named the empty array. Added: a missing file, invalid JSON, a non-array, an
  empty-string path argument, a record with no `exif` object, and a corpus in which every camera
  and lens is null — the last being the vacuity a per-record loop cannot see, since it iterates
  every record while calling neither lookup. **Commit:** `b83bd2b`

**4. [Rule 2 — Missing critical functionality] A self-test on every invocation**
- The plan asked for control runs. A control run proves the gate worked *once*, on the day it was
  written. The self-test proves it on every invocation, and control 6 shows it defeating a
  weakening of the module it depends on. **Commit:** `b83bd2b`

**5. [Housekeeping] Out-of-repo fixture paths printed as `../../../../../../var/folders/…`**
- `path.relative` from the repo root. Now repo-relative when inside the repo and absolute
  otherwise — the one string a failing gate most needs a reader to recognise. **Commit:** `b83bd2b`

**6. [Housekeeping] A plant harness written with `perl` corrupted UTF-8**
- The first Task-1 plant run used `perl -0pi -e`, which mangled `α` and the en dashes, so the
  em-dash control measured an encoding failure rather than the defect it named. **That
  measurement was discarded and re-run through a node harness**; the table above is the re-run.
  Recorded because a control that fails for the wrong reason looks exactly like one that worked.

### Deliberate non-actions

- **Not wired into `package.json`.** 05-14 owns that, per the plan. Until then the gate exists and
  is proven but does **not** run in `npm run build` — stated plainly rather than implied.
- **`data/portfolio_images.json` untouched** — read only, never written; verified after every
  control run.
- **`src/schemas/photo.ts` and `src/lib/photo-pipeline.ts` untouched** — §9.5's ruling.
- **`STATE.md` / `ROADMAP.md` not updated**, per instruction.
- **No `git add` from any verify step**, and no `git add -A`. Three commits, each staging named
  paths only, in a wave with two other executors on one index.

---

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0**, `astro check` 0 errors, all five gates PASS |
| `npx vitest run test/public/exif-display.unit.test.ts` | **33 passed / 33** |
| `node scripts/assert-exif-display-coverage.mjs` | **exit 0**, 40 records, 68 values, 5 cameras, 4 lenses |
| `npx biome check` on all three files | **exit 0** |
| `grep -nE "^[[:space:]]*import .+node:" src/lib/exif-display.ts` | **no match** |
| prerender inside `workerd` | `userAgent=Cloudflare-Workers`, `cwd=/bundle`, rows 0 / 1 correct |
| `git status --short data/` | empty |
| `git log --all -- src/pages/exif-probe.astro` | empty — the probe was never committed |
| `test -e src/pages/exif-probe.astro` | absent |
| Full `npx vitest run` | **1126 passed, 15 failed** — all 15 in `test/content/resume-structure.unit.test.ts`, see below |

### The 15 failures are 05-02's, not this plan's

`test/content/resume-structure.unit.test.ts` reds 15 cases asserting that each project record
"carries the eight keys in the order they were authored in" and "is byte-identical to its previous
home". They are caused by **committed** wave-mate work — `d986836 feat(05-02): give projects a
status and a one-liner, and land the copy Phase 0 reviewed` — which changed `data/projects.json`'s
key set. No file in this plan is on any path that reaches that suite: it reads `data/projects.json`
and `data/resume.json`; this plan created `src/lib/exif-display.ts`,
`test/public/exif-display.unit.test.ts` and `scripts/assert-exif-display-coverage.mjs` and modified
nothing. **Out of scope per the scope boundary, logged to `deferred-items.md`, and flagged here
because it is red on `main` right now and 05-02 must resolve it before the phase closes.**

A second transient was observed and is now clear: an intermediate `npm run build` failed
`astro check` with 6 errors, all in 05-05's then-untracked
`test/public/layout-ladder.unit.test.ts` referencing a module that did not exist yet. 05-05 has
since committed `src/lib/layout-ladder.ts` (`50d6fd3`) and the build is green. Recorded so the
next reader does not rediscover it as a mystery.

---

## Known Stubs

None. Every export is fully implemented and exercised against the real corpus. Nothing in this
plan renders to a public route yet — `src/lib/exif-display.ts` is imported by zero pages by
design, and 05-09 wires the first.

## Threat Flags

None. No network endpoint, no auth path, no schema change. `T-05-04-01` is dispositioned
`mitigate` as planned: the throw-on-unknown rule plus the coverage gate, both proven able to fail.
The one integrity concern beyond the register — an inherited `Object.prototype` member reaching
the page as a display name — is closed by the own-property lookup (deviation 2).

---

## For the plans that depend on this one

- **Call `exifRows(photo.exif)`. Do not build a row list.** PUB-07 has one implementation and it
  is that function. If `rows.length === 0`, render **nothing** — no heading, no rule, no panel.
  `product-peppers` is the record that will catch you.
- **`EXIF_LABELS` and `EXIF_ROW_ORDER` are exported.** Do not retype the labels in a page.
- **`displayCamera` / `displayLens` throw.** That is deliberate and it is the requirement. Do not
  wrap them in a `try/catch` that falls back — a fallback ships `SM-N970F` to a reader, which is
  the exact defect PUB-08 exists to prevent. The gate is what keeps the throw unreachable in
  practice.
- **A new photograph with a new camera reds the gate, by design.** The repair is two lines in
  `CAMERA_DISPLAY_NAMES` **plus the manufacturer listing that decodes the code**, in a comment.
  Do not add an entry you guessed.
- **05-14 must wire `gate:exif` into `gate:content`.** It is not wired now. A gate that runs
  nowhere is not a control — this repository has paid for that nineteen times.
- **Keep the module pure.** It goes into the Lightbox's browser chunk. A `node:` import, a
  `process` reference or a **value** import of the schema would each break something different:
  the browser chunk, the workerd prerender, and this gate's ability to load the module from plain
  `node`. All three are asserted.
- **The manifest is at 40 and the UI-SPEC says 39 in at least seven places.** Derive counts.

## TDD Gate Compliance

Plan task 1 carries `tdd="true"`. Both gates are in the log, in order:

- **RED** — `efca690 test(05-04): the EXIF display suite, asserted against the real manifest`, run
  before the module existed: `Cannot find module '../../src/lib/exif-display.ts'`, 0 tests
  collected. No test passed unexpectedly.
- **GREEN** — `e923e0b feat(05-04): exif-display …`, 33 passed / 33.
- **REFACTOR** — none needed; no commit made rather than an empty one.

## Self-Check: PASSED

- `src/lib/exif-display.ts` — **FOUND**
- `scripts/assert-exif-display-coverage.mjs` — **FOUND**
- `test/public/exif-display.unit.test.ts` — **FOUND**
- commit `efca690` — **FOUND** (`test(05-04): the EXIF display suite, asserted against the real manifest`)
- commit `e923e0b` — **FOUND** (`feat(05-04): exif-display — human camera and lens names, and no row for a null field`)
- commit `b83bd2b` — **FOUND** (`feat(05-04): the build refusal on an unknown camera or lens string`)
- author and committer on all three: `Akhil Saxena <saxena.akhil42@gmail.com>`; no AI attribution
  in any message, author or committer field.
