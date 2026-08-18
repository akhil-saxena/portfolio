---
phase: 0
plan: 19
subsystem: design-ideation
tags:
  [
    dsgn-01,
    photo-schema,
    alt-text,
    accessibility,
    privacy,
    place,
    description,
    focal-point,
    tags-revival,
    d-22,
    d-23,
    d-25,
    d-40,
    g-1,
    content-brief,
    gate,
  ]

requires:
  - data/portfolio_images.json — the real 39-record manifest, read as the source of truth over every document
  - data/home_config.json — peekIds (6) and peekPositions, the existing focal-point precedent
  - legacy/nextjs-portfolio:scripts/process-images.js — the pipeline's deliberate `gps: false`
  - .planning/phases/00-design-ideation/00-ADMIN-IA.md — the field catalog amended here, and its five existing schema decisions
  - .planning/phases/00-design-ideation/00-RESPONSIVE-CONTRACT.md — §1 device classes, §3 gutters (312px at class 1), §5.3 height budgets
  - .planning/phases/00-design-ideation/scripts/check-copy-length.mjs — read for the house gate idiom, left untouched
provides:
  - 00-ADMIN-IA.md schema decision 6 — `place`, `description`, `alt`, `focalPoint` and the revived `tags`, each resolved rather than listed
  - 00-ADMIN-IA.md schema decision 7 — `description` renders lightbox-only AND must be present in the served HTML
  - 00-PHOTO-CONTENT.md — the 39-row content brief, script-generated, zero alt text invented
  - scripts/check-photo-content.mjs — a four-rule gate whose row set is derived from the manifest, not hand-listed
  - the field catalog rows Photo — Alt text, Photo — Place, Photo — Description; Photo — Position gains /admin/photos
affects:
  - Phase 3 (owns the real manifest migration; this plan deliberately did not touch data/portfolio_images.json)
  - Phase 5 (the 39 alt texts become a shipping blocker when the gallery goes live; they are not a blocker on any Phase 0 plan)
  - Phase 7 (G-1 escalates from Home's six peek slots to all 39 photos — recorded, not fixed)
  - any future plan writing a negative control on macOS (the GNU-sed `0,/re/` idiom is a silent no-op here)

tech-stack:
  added: []
  patterns:
    - a gate's row set derived from the shipped manifest cannot miss a record that a hand-listed array would
    - a placeholder marker's FIRST literal occurrence must be inside the data it marks, or a control that mutates "the first occurrence" edits prose and proves nothing
    - two markers with different content scales need different names, because a word-count floor written for paragraphs is an accessibility defect when applied to alt text
    - "the absence of data is sometimes a decision that already happened" — write down which, or a later phase reads the gap as an invitation
    - BSD sed silently no-ops on `0,/re/s//…/` and exits 0; mutate with node and assert on exit code plus the named id

key-files:
  created:
    - .planning/phases/00-design-ideation/00-PHOTO-CONTENT.md — 39 rows, 7 category groups, script-generated
    - .planning/phases/00-design-ideation/scripts/check-photo-content.mjs — the four-rule gate
    - .planning/phases/00-design-ideation/00-19-SUMMARY.md
  modified:
    - .planning/phases/00-design-ideation/00-ADMIN-IA.md — 3 catalog rows added + 1 changed + 1 re-homed, the tags paragraph rewritten, schema decisions 6 and 7 added

decisions:
  - "`description` RENDERS IN THE LIGHTBOX ONLY, AND MUST BE IN THE SERVED HTML — not injected by JavaScript at runtime. The placement was the user's call, delegated and then decided; the served-HTML requirement is the half that makes it safe. `Lightbox` is a hook-using, hydrated island, so a caption it creates at runtime is unreachable to crawlers and to anyone without JS — on a page whose design premise is shipping zero framework JS across its static routes. The description lives in the DOM inside the figure; the lightbox reveals it visually. Recorded as schema decision 7."
  - "`place` IS MANUAL FREE TEXT AND MUST NEVER BE DERIVED. `scripts/process-images.js` on the legacy branch calls `exifr.parse` with `gps: false` beside its seven-field `pick` list — location is STRIPPED, not missing. An empty `place` is therefore a privacy decision that already happened, and 'we have EXIF, let us backfill location' is the reasonable-sounding sentence that would reverse it. Deriving it would publish precise coordinates of personal photographs."
  - "`alt` IS REQUIRED AND IS NOT `title`. The public gallery ships zero framework JS, so there is no hover, tooltip or later interaction that could supply a description — `alt` is the entire non-visual experience of 39 images, not a fallback. Three rules: describe the frame, do not repeat the title, do not open with a role prefix. Rules 2 and 3 are machine-enforced."
  - "NO ALT TEXT WAS INVENTED — not one of the 39. Every alt cell carries `[AKHIL-ALT]` and nothing else. The plan asked for a worked example showing 'a good alt' beside a real title; that was honoured with the two WRONG answers written out in full (which are truthful, because they are derivable from the title alone) and the right answer given as a SHAPE with its one illustrative rendering explicitly flagged as not a description of the actual photograph. Writing a confident description of an unseen photograph is exactly T-00-51 in this plan's own threat register."
  - "THE FIELDS ARE NOT WRITTEN TO data/portfolio_images.json. `git diff --quiet -- data/portfolio_images.json` was an acceptance gate on task 1 and passes. 39 records carrying `alt: \"\"` would read as a completed migration when none has been designed — and a REQUIRED field present-and-empty is a worse artifact than an absent one, because the absence is what makes Phase 3 write the migration deliberately."
  - "`focalPoint` REUSES `home_config.peekPositions`' STRING SHAPE (`\"50% 25%\"`), defaulting to `\"50% 50%\"`, so one CSS `object-position` concept does not fork into a string on one screen and an `{x, y}` object on another. Whether it SUPERSEDES `peekPositions` or coexists with it is named as an open Phase 3 migration question rather than resolved: a per-photo focal point is a judgement about the photograph, a peek position is a judgement about one slot in one layout, and they may legitimately want to differ."
  - "THE TAGS PARAGRAPH WAS REWRITTEN, NOT DELETED. The 0-of-39 evidence is re-counted against the manifest and kept; what changed is direction, not the measurement. The record now shows a field dropped on evidence and revived by the owner of the content, rather than an earlier reasoning that was simply wrong."
  - "NO NEW `G-` ROW WAS ADDED to 00-FINDINGS.md. G-1 escalates materially — the missing FocalPointPicker was scoped against Home's six peek slots and `focalPoint` makes it load-bearing across all 39 — but the register states its own fixed-denominator rule and Phase 1 and Phase 7 read its pull lists. The escalation is recorded here and in decision 6; G-1's tiers, text and row are untouched. Same rule plan 16 followed."
  - "D-22 IS RESTATED RATHER THAN ASSUMED. None of the five fields is an ordering field, so the grid's reorder affordance remains modal on the active filter — global `order` under 'All', the per-category field under a filter — and the screen must still say which one a drag wrote. Adding four editable fields to that screen makes the label MORE necessary, not less."
  - "A SECOND MARKER, `[AKHIL-OPT]`, MARKS THE THREE OPTIONAL COLUMNS. The plan specified one marker and said all four columns are 'empty and marked'; using `[AKHIL-ALT]` for optional cells would have made the required/optional distinction invisible in the artifact the writer actually reads, and would have broken every marker count."

metrics:
  duration: ~35 min
  completed: 2026-08-18
  tasks: 3
  files_created: 3
  files_modified: 1
  commits: 4
---

# Phase 0 Plan 19: Photo Schema, Description Placement and the Alt-Text Brief Summary

Specified four new photo fields and revived a fifth, closed the `description` render question
as lightbox-only-with-served-HTML, and opened 39 alt texts as tracked human content behind a
four-rule gate that refuses the two answers a hurried fill produces.

## What was built

**Three commits, three artifacts.**

| Task | Commit | Artifact |
|------|--------|----------|
| 1 | `c0206ed` | `00-ADMIN-IA.md` — 3 catalog rows added, 1 changed, 1 re-homed; tags paragraph rewritten; schema decisions 6 and 7 |
| 2 | `d0817b5` | `00-PHOTO-CONTENT.md` — 39 rows, script-generated |
| 3 | `f2b7579` | `scripts/check-photo-content.mjs` — the four-rule gate |

### The schema, as specified

| Field | Type | Required | Rule |
|-------|------|----------|------|
| `alt` | `string` | **required** | Describes the frame. Separate from `title`. Machine-enforced. |
| `place` | `string` | optional | **Manual. Never derived.** |
| `description` | `string` | optional | Lightbox only, and present in the served HTML. |
| `focalPoint` | `string` | optional, default `"50% 50%"` | Reuses `peekPositions`' `"50% 25%"` shape. |
| `tags` | `string[]` | optional | Revived. Empty on all 39 today. |

### The brief — counts printed by the generator, never transcribed

39 rows against a 39-record manifest, grouped so a category is one sitting:

| Category | Rows |
|----------|-----:|
| architecture | 14 |
| nature | 8 |
| wildlife | 5 |
| abstract | 4 |
| street | 4 |
| portraits | 2 |
| product | 2 |
| **Sum** | **39** |

These match the distribution `00-ADMIN-IA.md` decision 3 already cites — re-counted from
`data/portfolio_images.json` this session rather than copied from the document, per the phase's
verify-against-shipped-data rule. They agree.

## Verification

| Check | Result |
|-------|--------|
| `check-photo-content.mjs` exits 0 | PASS — `39/39 manifest record(s) have a row` |
| Every manifest id present in the brief | PASS — `ALL_39_PRESENT` |
| `[AKHIL-ALT]` markers | 40 (39 rows + 1 naming the marker in the closing section, after the tables) |
| `[NEEDS AKHIL]` literals in the brief | 0 |
| `check-copy-length.mjs` still passes, untouched | PASS — 7 files, 6 markers, shortest block 106 words |
| `git diff --quiet -- data/portfolio_images.json` | exit 0 — manifest untouched |
| `00-COPY/` untouched (sibling agent owns it) | exit 0 across all three commits |
| `STATE.md` / `ROADMAP.md` untouched | exit 0 across all three commits |
| File deletions in the three commits | none |

### The three negative controls

Each asserts on the gate's **exit code and the id it names** — never on `grep -c`, which counts
LINES rather than matches and nearly produced a false result in plan 16, control 4. Each restore
writes back the original bytes and re-hashes.

| Control | Mutation | Expected | Exit | Named the id | Cited the rule |
|---------|----------|----------|-----:|--------------|----------------|
| A | row for `wildlife-yinyangjpg` deleted | rule 1 | 1 | yes | `COMPLETENESS` |
| B | `abstract-intothemist` alt ← `Into The Mist` | rule 3 | 1 | yes | `ALT-EQUALS-TITLE` |
| C | `wildlife-kingfisher` alt ← `Photo of a bird on a branch` | rule 4 | 1 | yes | `ALT-ROLE-PREFIX` |

**All three hashes, before edit and after restore, are identical:**

```
before: 261ea4c1505e6fd8d7b69d3fb141fc2afdb3e711794bdecb3093639ef1c89c00
after : 261ea4c1505e6fd8d7b69d3fb141fc2afdb3e711794bdecb3093639ef1c89c00
```

The same hash appears in all three rows because each control restores from the same pristine
bytes before the next runs. The gate was re-run clean after every restore, and `git status`
shows the brief unmodified against its commit.

A fourth control was run separately using the plan's own prescribed command against
`architecture-hauntedmansionjpg` (the first marker in the file) — see the deviation below for
why the plan's version of it could not be used as written.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's Task 3 verify command is a silent no-op on macOS**

- **Found during:** Task 3, running the plan's `<verify><automated>` block.
- **Issue:** The block mutates the brief with
  `sed -i '' '0,/\[AKHIL-ALT\]/s//Photo of a bird on a branch/'`. The `0,/re/` start-address form
  is a **GNU sed extension**. The BSD sed shipped with macOS accepts it, **changes nothing, and
  exits 0** — verified in isolation: `diff` reported no difference and `sed_exit=0`, with
  `sed --version` returning `illegal option -- -`, confirming BSD. The gate then correctly
  passed, the `! node …` clause failed, and the whole chain reported failure.
- **Why it matters more than a broken command:** written the other way round — asserting a pass —
  the same no-op would have *silently proven a control that never ran*. That is the identical
  false-control class as the `grep -c` hazard the plan itself warns about.
- **Fix:** substituted a portable Node mutation (`String.prototype.replace`) for the sed, and ran
  the plan's control sequence with it. The gate exited 1 naming
  `architecture-hauntedmansionjpg` and `ALT-ROLE-PREFIX (rule 4)`; the restore hashed identical
  to `261ea4c1…`. The trap is now documented in the gate's own header docblock so the next
  person writing a control for this file does not reach for the GNU form.
- **Files modified:** `scripts/check-photo-content.mjs` (header docblock).
- **Commit:** `f2b7579`

**2. [Rule 2 - Missing critical functionality] Marker ordering made load-bearing and enforced**

- **Found during:** Task 2, from the generator's own self-report.
- **Issue:** The first draft explained the marker in the opening brief, which put a literal
  `[AKHIL-ALT]` in prose **above** the tables. Any control that mutates "the first occurrence"
  would then have edited prose, leaving all 39 rows intact and the gate correctly passing — a
  control that proves nothing while appearing to run. The generator caught it directly:
  `ALT markers in file: 40 … first ALT marker is on a table row: false`.
- **Fix:** moved the marker explanation to a section **below** the tables, removed both literals
  from the opening brief, and recorded the constraint as an HTML comment at the top of the file
  so a future editor does not silently reintroduce it. Re-ran: `first ALT marker is on a table
  row: true`.
- **Files modified:** `00-PHOTO-CONTENT.md`.
- **Commit:** `d0817b5`

**3. [Rule 2 - Missing critical functionality] A fifth gate rule: duplicate rows**

- **Issue:** The plan specified four conditions. Two rows for one id would pass all four while
  meaning one row is edited and the other silently ignored.
- **Fix:** added `DUPLICATE-ROW`, naming both line numbers.
- **Commit:** `f2b7579`

**4. [Rule 2 - Correctness] `[AKHIL-OPT]` introduced for the three optional columns**

- **Issue:** The plan says `alt`, `place`, `description` and `tags` are all "empty and marked",
  but names only the alt marker. Using `[AKHIL-ALT]` in optional cells would have erased the
  required/optional distinction in the artifact the writer reads, and inflated every marker
  count from 39 to 156.
- **Fix:** `[AKHIL-OPT]` for the three optional columns. Neither marker collides with
  `[NEEDS AKHIL]`; the brief passes `grep -c '\[NEEDS AKHIL\]'` at 0.
- **Commit:** `d0817b5`

### Judgement call recorded rather than silently taken

**The worked example does not contain an invented description of a real photograph.**

The plan asked for "one worked example, using a real record from the manifest, showing the title
beside a good alt so the difference is visible rather than described." Written literally, that
requires composing a confident description of a photograph nobody executing this plan has seen —
which is precisely the harm the same plan prohibits two paragraphs later ("Do not invent any alt
text. Not one row.") and registers as **T-00-51**.

Resolved by making the example's *truthful* half carry the weight. On the real record
`abstract-intothemist` (title *"Into The Mist"*, chosen because the title is evocative rather
than descriptive), the brief shows:

- ✗ `Into The Mist` — rule 2. Fully truthful: it is derivable from the title alone.
- ✗ `Photo of mist over trees` — rule 3. Also truthful as a *form*.
- ✓ the shape that works, given as **‹what the frame shows›, ‹enough setting to place it›**, with
  its single illustrative rendering explicitly labelled *"an illustration of the shape only,
  deliberately not a description of your actual photograph, which nobody writing this file has
  seen."*

The difference between a title and an alt string is therefore visible, and no sentence in the
file claims to describe a photograph it has not seen. All 39 table cells remain `[AKHIL-ALT]`.

## G-1 escalation — recorded, not fixed

`focalPoint` on the photo record changes G-1's blast radius. The missing `FocalPointPicker` was
scoped against **Home's six peek slots** (`home_config.json` `peekIds` has exactly 6 entries, of
which `peekPositions` populates exactly 1 today). With `focalPoint` on the photo record it
becomes load-bearing for the **main gallery admin across all 39**.

Plan 14 measured the hand-built cost at **269 non-comment lines** (`FocalPointSketch.tsx`, 419
total). That is now the cost of the absence multiplied across a primary admin screen rather than
a six-slot strip.

**No fix is proposed here and no row was added to `00-FINDINGS.md`.** The register states its own
fixed-denominator rule, and Phase 1 and Phase 7 read its pull lists — appending or re-tiering a
row would change another phase's scope without a decision. G-1's tiers (`backlog`,
`blocks-Phase-7`), text and measurements are untouched. The escalation is recorded in
`00-ADMIN-IA.md` schema decision 6 and here. Per the core value, this stays a **finding**; no
local workaround was built.

## Known pending content — intentional, and tracked

The 39 `[AKHIL-ALT]` markers are **not stubs in the defect sense**; they are the deliberate
output of this plan and its entire point. They are tracked in `00-PHOTO-CONTENT.md`, counted by
`check-photo-content.mjs` on every run, and:

- **not a blocker on any Phase 0 plan** — the sketches render these fields from the fixture's
  placeholder values;
- **a blocker at Phase 5**, when the gallery ships. A photograph reaching production with
  `[AKHIL-ALT]` in its alt attribute is a shipping defect, and the gate is what makes that
  countable rather than discovered.

117 optional `place` / `description` / `tags` cells are pending and never blocking.

`data/portfolio_images.json` carries none of these fields, deliberately — Phase 3 owns the
migration.

## Threat surface

No new network endpoints, auth paths, file access patterns or trust-boundary schema changes.
The two threats this plan's own register names are both mitigated as designed:

- **T-00-50** (`place` derived from GPS) — schema decision 6 states the field is manual and cites
  the pipeline's deliberate `gps: false` at its source.
- **T-00-51** (invented alt presented as the photographer's) — 39 markers, zero invented strings,
  plus the judgement call above extending the same rule to the worked example.
- **T-00-52** (manifest reading as migrated) — `git diff --quiet` gate passes.
- **T-00-53** (tags evidence erased) — paragraph rewritten, 0-of-39 measurement retained.

## Facts verified against shipped data, not documents

| Claim | Source read | Result |
|-------|-------------|--------|
| 39 records, 9 keys | `data/portfolio_images.json` | confirmed exactly |
| `tags` empty on all 39 | same | 0 records with a non-empty tag |
| `alt`/`place`/`description`/`focalPoint` absent | same | present on 0 of 39 each |
| Category distribution | same | matches decision 3's cited figures |
| Pipeline strips GPS | `legacy/nextjs-portfolio:scripts/process-images.js` | `gps: false` in `extractExif()`'s `exifr.parse` options |
| Home has six peek slots | `data/home_config.json` | `peekIds` length 6; `peekPositions` populated for 1 |
| Class 1 content width 312px | `00-RESPONSIVE-CONTRACT.md` §3 | `344 − 32 = 312px` |
| Four of six classes are coarse-pointer | `00-RESPONSIVE-CONTRACT.md` §1 | classes 1–4 coarse, 5 ambiguous, 6 fine — hover is reliable on **one** of six |
| G-1 hand-built cost | `00-FINDINGS.md` G-1 row (plan 14 measurement) | 269 non-comment lines |

## Self-Check: PASSED

All created files exist and all commit hashes resolve.

```
FOUND: .planning/phases/00-design-ideation/00-PHOTO-CONTENT.md
FOUND: .planning/phases/00-design-ideation/scripts/check-photo-content.mjs
FOUND: .planning/phases/00-design-ideation/00-ADMIN-IA.md (modified)
FOUND: c0206ed  FOUND: d0817b5  FOUND: f2b7579
```
