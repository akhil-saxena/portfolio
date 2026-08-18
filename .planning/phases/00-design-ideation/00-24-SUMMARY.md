---
phase: 0
plan: 24
subsystem: design-ideation
tags:
  [
    dsgn-01,
    dsgn-03,
    dsgn-04,
    photo-fields,
    alt-text,
    accessibility,
    privacy,
    place,
    description,
    tags-revival,
    lightbox,
    d-15-1,
    d-16-1,
    d-18,
    d-22,
    g-14,
    drift-gate,
    44px-floor,
    gap-closure,
  ]

requires:
  - .planning/phases/00-design-ideation/00-19-SUMMARY.md — schema decisions 6 and 7, implemented here
  - .planning/phases/00-design-ideation/00-PHOTO-CONTENT.md — the 39-row brief, read by the drift gate, never edited
  - .planning/phases/00-design-ideation/00-23-SUMMARY.md — focalPoint already on all 39, and the layout board this plan renders beside
  - .planning/phases/00-design-ideation/00-13-SUMMARY.md — the Field + wiring composition idiom, used unchanged
  - .planning/phases/00-design-ideation/deferred-items.md — D-15-1 and D-16-1
  - .playground/src/pages/photos.astro — the alt-equals-title defect, at line 182
  - .playground/src/pages/admin/[...state].astro — plan 12's dashboard, one rule added
provides:
  - the four new photo fields and the revived tags, rendered in both pinned detail panels of /admin/photos
  - the missing-alt AlertBanner — the screen's real first-run state, count derived from the data
  - photos.astro reading the photo's own alt, with a visible ALT PENDING placeholder where it is unwritten
  - description in the served HTML, hidden in the grid, reserved to the lightbox
  - .playground/check-alt-drift.mjs — the fixture/brief drift gate, with both of its counting rules
  - D-15-1 closed with before/after at all six device classes
  - D-24-1 opened — alt={title} survives on home.astro and two admin islands
affects:
  - Phase 3 (owns the real manifest migration; data/portfolio_images.json is still untouched)
  - Phase 5 (must remove the ALT PENDING string, must reimplement the drift gate's two counting rules, owns home.astro's copy of the same defect)
  - Phase 7 (builds an editor whose first-run state is 39 unfilled alt texts, and inherits the banner as designed)
  - Phase 1 (a fourth DS composition limit: FieldProps has no required flag)

tech-stack:
  added: []
  patterns:
    - "reaching the floor and reporting it have to be the SAME measurement — an ::after hit area is invisible to an audit that measures the anchor's own box"
    - "align-items: flex-end grows a link's hit area upward while leaving its border-bottom under the text, so the drawn hairline does not move"
    - "count the STRUCTURE, not the string — a marker's name in prose is indistinguishable from the marker in data to any raw match"
    - "a gate whose expected value was transcribed rather than counted is worse than no gate: it teaches the next agent to fabricate data"
    - "an acceptance grep cannot tell a live media condition from a comment about one, so the forbidden query string must not be written even in prose"
    - "a fixture-only example should be a bracketed marker, not plausible prose — a readable sentence in a screenshot is indistinguishable from real content"

key-files:
  created:
    - .playground/check-alt-drift.mjs — the drift gate (gitignored, playground-only)
    - .playground/probe24.mjs — the browser probe for both tasks (gitignored)
    - .playground/d151.mjs — the D-15-1 measurement harness (gitignored)
    - .playground/audit15-raw.mjs — audit15 with de-duplication disabled (gitignored)
    - .planning/phases/00-design-ideation/00-24-SUMMARY.md
  modified:
    - .planning/phases/00-design-ideation/00-ADMIN-IA.md — the four fields as rendered, the banner, the defect, the placeholder rule, the drift gate, description's reservation
    - .planning/phases/00-design-ideation/deferred-items.md — D-15-1 resolved, D-16-1 restated open, D-24-1 opened
    - .playground/src/fixtures/photos.json — place/description/alt/tags on all 39 (gitignored)
    - .playground/src/data/portfolio_images.json — place/description/alt on all 39 (gitignored)
    - .playground/src/pages/admin/photos/[...state].astro — the four fields, the banner (gitignored)
    - .playground/src/pages/photos.astro — the alt fix, the lightbox slot (gitignored)
    - .playground/src/pages/admin/[...state].astro — one rule, in the existing coarse block (gitignored)

decisions:
  - "NO ALT TEXT WAS INVENTED. `alt` is null on all 39 records in both the fixture and the playground's manifest copy, and 39 of 39 remain unfilled. The 39 `[AKHIL-ALT]` rows in 00-PHOTO-CONTENT.md are the only place a real value comes from. An agent that writes 39 plausible descriptions of photographs it has never seen produces 39 confident lies about the photographer's own work, and each one reaches a screen-reader user as fact."
  - "THE PLAN'S `= 16` FINDINGS GATE IS WRONG AND WAS NOT SATISFIED. `00-FINDINGS.md` carries FIFTEEN `G-` rows — G-1 through G-15, `grep -c '^| \\*\\*G-'` returns 15. Plan 00-23 hit the same gate and refused to add a row; the same refusal here. Fabricating a finding to make a check pass is strictly worse than a failing check, because the register's tiers bound Phase 1's and Phase 7's scope and a phantom row would silently expand both. 00-ADMIN-IA.md already carries 00-23's correction naming fifteen as the fixed denominator."
  - "`description` IS EMITTED INTO THE SERVED HTML AND HIDDEN WITH `display: none`, not merely reserved by a comment. Schema decision 7 has two halves — lightbox-only AND present in the served HTML — and only the second is verifiable. A caption the hydrated `Lightbox` island builds on open is unreachable to a crawler and to anyone without JS, on a page whose premise is zero framework JS. `display: none` rather than a visually-hidden clip, because a clipped-but-exposed node would make every tile announce its description as part of the link name in the grid, which is not the design."
  - "THE `ALT PENDING` PLACEHOLDER, NOT `alt=\"\"` AND NOT THE TITLE. `alt=\"\"` declares an image decorative; declaring all 39 photographs on a photography gallery decorative is a worse lie than the title was. The title is the lie the fix exists to remove. A visible placeholder appears in the built HTML, so a reviewer walking the artefact sees outstanding content work rather than a finished-looking page. All three reasons INVERT once the site is live, which is why 00-ADMIN-IA.md records the prohibition rather than the string."
  - "THE DRIFT GATE COUNTS TABLE ROWS AND ALT ATTRIBUTES, NOT MARKER OCCURRENCES — a correction to the plan's own verify command, made twice. The brief holds FORTY `[AKHIL-ALT]`: 39 table cells plus one prose mention on the line explaining what the markers mean, so the plan's raw count would have failed on a correct page. And the page itself names `[ALT PENDING]` in its visible note about the debt, so a document-wide count reported 40 placeholders for 39 images. Both are the same lesson as `grep -c` counting lines: count the structure."
  - "D-15-1 CLOSED WITH `align-items: flex-end`, NOT PADDING AND NOT AN `::after` OVERLAY. The plan offered padding or an overlay. Padding grows the box but pushes the 1px hairline away from the word it underlines — the drawn geometry would have changed. An `::after` overlay does not work AT ALL: `audit15.mjs` measures the anchor's own bounding box, so a pseudo-element hit area would have left the element reporting 23px while the real target was 44 — the fix would have been invisible to the check that exists to prove it. Reaching the floor and reporting it have to be the same measurement."
  - "D-16-1 LEFT OPEN, AND THE PLAN'S TASK-2 VERIFY COMMAND IS WRONG TO INCLUDE `/photos/`. That command expects `audit15.mjs /admin/ /photos/` to exit 0, which cannot hold while D-16-1 is open — and the same plan's task 3 instructs that it stay open, with `T-00-77` dispositioning a local patch as `accept`. `/photos/` reports exactly the 7 offenders D-16-1 already documents (3 AppBar at 20px, 3 Footer at 22.5px, 1 `.ph-xlink` at 30px), none new and none mine. The binding gate is the `done` criterion, which names `/admin/` only, and `/admin/` reports 0 at all five coarse classes."
  - "`.ph-xlink` ADDED TO D-16-1'S INVENTORY RATHER THAN OPENED AS A NEW ITEM. It is the exact twin of the `.wk-xlink` that entry already records on `/work/` — a page-local cross-link class in a public sketch, same shape, same 30px. A third instance of a recorded pattern is evidence for that pattern, not a separate discovery."
  - "D-24-1 OPENED RATHER THAN FIXED: `alt={title}` survives on `home.astro:154` (PUBLIC — six peek photos) and on three admin island call sites. The public one is the same defect and wants the same fix, but `home.astro` is plan 09's file and this plan's charter names `photos.astro`. The three admin ones are materially weaker — each thumbnail sits beside the same title as text, so they may want `alt=\"\"` — and should be judged separately rather than batched into one sweep."
  - "A FOURTH DS COMPOSITION LIMIT: `FieldProps` HAS NO `required` FLAG. `{ label, hint, errorMessage, wiring, group, children, className }` — so a required field has no component-level visible affordance. Requiredness is encoded in the label STRING (`\"Alt text (required)\"`) and repeated in the hint, which means every screen invents its own marker and they will not match. The native `required` attribute passes through `TextInput`, so the semantics are right; only the marker has no home. Recorded for Phase 1, not worked around."
  - "FIXTURE-ONLY EXAMPLES ARE BRACKETED MARKERS, NEVER PLAUSIBLE PROSE. Two records carry `[FIXTURE place — typed by hand, never derived]` and `[FIXTURE description — lightbox only, see 00-PHOTO-CONTENT.md]`, and three carry `fixture-tag-a/b/c`. A readable sentence would be indistinguishable from real content in one of plan 00-17's screenshots, and `place` in particular is the field that decides whether the site publishes where a personal photograph was taken."
  - "THE PLAYGROUND'S MANIFEST COPY WAS EXTENDED TOO — a deviation from the plan's file list, taken so the served-HTML half of schema decision 7 is exercised rather than merely coded. `photos.astro` renders `.playground/src/data/portfolio_images.json`, not the admin fixture; without `description` on at least one record the requirement would have been an unexecuted branch. The REPO's `data/portfolio_images.json` is untouched and `git diff --quiet` on it passes — Phase 3 owns that migration."

metrics:
  duration: ~25 min
  completed: 2026-08-18
  tasks: 3
  files_created: 1
  files_modified: 2
  commits: 1
---

# Phase 0 Plan 24: The Four Photo Fields, the Alt Fix and D-15-1 Summary

Added `place`, `description`, `alt` and the revived `tags` to the photo editor, removed the
defect that made all 39 public images announce their name as their description, and closed the
most-used undersized touch target in the admin — inventing not one word of alt text.

## Tasks 1 and 2 produced NO COMMIT, and that is the D-02 fence

Every file those two tasks touched lives inside `.playground/`, which is **gitignored** by the
D-02 fence: the sketch is a disposable artefact whose output is screenshots and findings, not
shipped code. Playground files do not appear in `git status` and cannot appear in a commit. The
durable output of this plan is task 3's committed amendments — `00-ADMIN-IA.md` and
`deferred-items.md` — plus the screenshots plan 00-17 takes before the playground is deleted.

Evidence for the two uncommitted tasks is therefore the gate output reproduced below, all of it
from a real Chromium against the built `dist/`.

| Task | Commit | Output |
|------|--------|--------|
| 1 | none — D-02 fence | Four fields + revived tags in both detail panels; the missing-alt banner |
| 2 | none — D-02 fence | `photos.astro` reads the photo's own `alt`; the lightbox slot; D-15-1 fixed |
| 3 | `4bed583` | `00-ADMIN-IA.md` + `deferred-items.md` |

## NO ALT TEXT WAS INVENTED — 39 of 39 still unfilled

**Records left unfilled: 39 of 39.** `alt` is `null` on every record in both the admin fixture
(all 259 raw objects across the 8 states, 39 unique ids) and the playground's manifest copy. The
39 `[AKHIL-ALT]` rows in `00-PHOTO-CONTENT.md` are untouched and remain the only place a real
value comes from.

```
  placeholders in ALT ATTRIBUTES           : 39
  the marker named anywhere in the page    : 40 (1 in the visible note)
  unfilled [AKHIL-ALT] ROWS in the brief   : 39
  raw [AKHIL-ALT] occurrences (39 rows + 1 prose) : 40
  alt attributes equal to a tile caption   : 0
  lightbox description nodes in the HTML   : 2
ALT_IN_SYNC 39
```

## Task 1 — the four fields, the revived tags, the first-run state

**The fixture.** A throwaway script inserted the four keys, asserting a byte-identical
round-trip of the file's shape (tab indent, trailing newline) *before* mutating, so the diff can
only contain new keys. Printed: `RECORDS_CHANGED 259` raw objects, `UNIQUE_IDS_CHANGED 39`,
`ALT_FILLED 0`.

**Both pinned panels** — `architecture-redbuilding` (camera only) and `product-peppers` (six
null EXIF values) — render a `CONTENT` group between Category and EXIF:

| Field | Composition | id |
|-------|-------------|-----|
| **Alt text (required)** | `Field` + `TextInput`, `required`, `aria-required` | `f-<id>-alt` |
| Place | `Field` + `TextInput` | `f-<id>-place` |
| Description | `Field` + `Textarea` `rows={3}` | `f-<id>-description` |
| Tags | `Field` `group` + `Chip` set + add-on-Enter `TextInput` | `f-<id>-tags` |

Alt text sits **first**, above Place and Description: it is the only required one and it is
unfilled on all 39, so it must not be the third thing the operator scrolls past. It sits beside
Title on purpose — "Red Building" next to an empty Alt text field is the clearest available
statement that one *names* the photograph and the other *describes* it.

**The hint that has to do real work** carries the three rules, because the wrong value looks
right: *"Required. Describe what is in the frame. Do not repeat the title. Do not start with
'Image of' or 'Photo of'."*

**`place`'s hint names it as manual and says why:** *"Typed by hand. There is nothing to derive
it from — the photo pipeline strips GPS on import (`gps: false`), on purpose."* An empty `place`
is a privacy decision that already happened, and "we have EXIF, let us backfill location" is the
reasonable-sounding sentence that would reverse it.

**The omission rule, extended.** `architecture-redbuilding` carries fixture-only values and
`product-peppers` carries none, so filled and omitted are in view together. Measured: **0**
inputs on the route render `—` as a value.

**The missing-alt banner** derives its count (`fx.photos.filter((p) => !p.alt).length`), reads
*"39 of 39 photos have no alt text."*, says **"Saving still works: fill them in as you go"** per
D-18's leniency, and is an `AlertBanner` at `tone="warning"` — not a dialog. Verified in the
browser: **0** `DSPortal`/modal/sheet nodes in the DOM.

### Task 1 gates

```
FIELDS_ON_ALL 39            (four keys on all 39, alt filled on 0)
CLIENT_COUNT_OK             (exactly 1 line carries the hydration directive)
NO_ZERO_BYTE_OVERLAY_OK     (0 Modal / ConfirmDialog / Sheet elements)
astro build                 93 pages
check-no-js.sh              PASS — 67 static routes zero JS, 26 islands hydrate
check-states.mjs            PASS — 49/49 state pages reachable and distinct
check-coverage.mjs          PASS — 42/42 cells, no blanks
audit15.mjs /admin/photos/  AUDIT PASS — under44 = 0 at all five coarse classes
```

## Task 2 — the alt fix, the lightbox slot, and D-15-1

**`photos.astro:182`'s `alt={t.title}` is gone.** The attribute now reads the photo's own `alt`
field, falling back to `[ALT PENDING — see 00-PHOTO-CONTENT.md]`. Measured in the browser across
all 39 tiles:

```
  tiles                 : 39
  alt equals caption    :  0     <- the defect
  alt = ALT PENDING     : 39
  alt = ""              :  0     <- would declare a photograph decorative
  img with no alt attr  :  0
```

**`description` is in the served HTML.** Two records carry one; both are emitted inside the tile
as `<span class="ph-desc" data-lightbox-caption>` and hidden with `display: none`. Measured:
`descNodes: 2`, `descComputedDisplay: "none"`, `descBoxes: 0` (nothing occupies space), and the
route still reports **0** `<astro-island>` nodes and **0** scripts — G-14 remains visible by its
absence and the zero-JS budget holds. 00-21's coarse floor on the filter rail is intact: 8 pills,
0 under 44px.

### D-15-1 — measured before and after, in a browser, at all six device classes

| Device class | Pointer | Before | After |
|--------------|---------|--------|-------|
| 344 folded | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** |
| 390 phone | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** |
| 673 foldable-unfolded | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** |
| 768 tablet-portrait | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** |
| 1024 tablet-landscape | coarse | 23 / 23 / 23 px | **45 / 45 / 45 px** |
| 1440 laptop | fine | 23 / 23 / 23 px | 23 / 23 / 23 px — **unchanged on purpose** |

`audit15.mjs /admin/` went from **3 offenders at every coarse class** to **0**. Three
declarations, inside the `@media (pointer: coarse)` block that already existed at the end of
plan 12's style block:

```css
.adm-group-link { display: inline-flex; align-items: flex-end; min-height: 44px; }
```

**The drawn geometry did not move.** Measured with a `Range` over the text node: the gap from the
bottom of the glyph run to the border edge is **1px before and 1px after, at every one of the six
classes**, and computed `font-size` is 17px in both states. `align-items: flex-end` pins the text
line box to the bottom of the grown box, so all 22px of new height lands *above*, where nothing is
drawn.

**Nothing else in plan 12's route file changed** — no markup, no other selector, no import, no
frontmatter. Proven by control B below, whose restore is SHA-256-identical.

## Task 3 — the record, and two controls that bite

### Control A — the drift gate

```
  sha256 before : 261ea4c1505e6fd8d7b69d3fb141fc2afdb3e711794bdecb3093639ef1c89c00
  filled row 84, id `architecture-hauntedmansionjpg`
  PASS  gate FAILS with the brief one row ahead of the data  — exit 1
  PASS  the failure NAMES BOTH counts  — DRIFT pending=39 brief=38
  PASS  it fails in the direction that matters (brief < placeholders)
  sha256 after  : 261ea4c1505e6fd8d7b69d3fb141fc2afdb3e711794bdecb3093639ef1c89c00
  PASS  restore is byte-identical (SHA-256)
  PASS  gate returns to its pass verdict  — ALT_IN_SYNC 39
```

The pass verdict was recorded *before* the mutation so "differs" had a baseline, the mutation was
applied with Node rather than `sed` (BSD `sed -i '' '0,/re/s//X/'` is a silent no-op that exits
0), the assertion is on the gate's **exit code and named counts** rather than on `grep -c` of the
edited string, and the restore runs in a `finally` so a crash cannot leave a committed planning
file mutated while a parallel agent is running.

### Control B — the 44px floor

```
  sha256 before : 2d21ce75f56c6bac37bd5f8846722329460aef17602ea13fba6792a9b7b0cf26
  heights, rule present : 45/45/45  x5 coarse classes
  heights, rule removed : 23/23/23  x5 coarse classes
  PASS  audit15 /admin/ reports 3 offenders at every coarse class  — under44 = 3, 3, 3, 3, 3
  PASS  the offender is named as .adm-group-link at 23px
  sha256 after  : 2d21ce75f56c6bac37bd5f8846722329460aef17602ea13fba6792a9b7b0cf26
  PASS  restore is byte-identical (SHA-256)
  PASS  audit15 /admin/ returns to 0 offenders at every coarse class
```

**Both controls were checked for direction, not just for change.** Control A must fail with the
brief *behind* the placeholders (39 vs 38), which is the drift that matters; control B must
produce *undersized* targets, not merely different ones. This phase already had a control report
success in the wrong direction (plan 00-22's `60svh`), and one that cannot fail in the direction
you care about is worse than none.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The plan's drift gate over-counted the brief by one, then the page by one**

- **Found during:** Task 2
- **Issue:** The plan's verify one-liner counts raw `[AKHIL-ALT]` occurrences in the brief and
  expects them to equal `ALT PENDING` occurrences in the built HTML. The brief holds **40**: 39
  table cells plus one prose mention on the line that explains what the two markers mean. So a
  correct page would have failed the gate. After fixing that, the gate failed the other way: the
  page's own visible note about the debt *names* `[ALT PENDING]`, so a document-wide count
  reported 40 placeholders for 39 images.
- **Fix:** `.playground/check-alt-drift.mjs` counts markdown table **rows** whose alt cell is the
  bare marker, and placeholders inside `alt` **attributes**. It also asserts directly that no
  `alt` attribute equals its own tile's caption — the defect itself rather than a proxy — and
  that at least one `description` reached the served HTML. Both counting rules are recorded in
  `00-ADMIN-IA.md` because Phase 5 has to reimplement them.
- **Commit:** `4bed583` (the recorded rules; the script is gitignored)

**2. [Rule 3 — Blocking] My own comment tripped the plan's `any-pointer` absence grep**

- **Found during:** Task 2
- **Issue:** The D-15-1 comment explained *"never on `any-pointer`"*, and the gate strips only
  lines whose first non-space character is `/` or `*` — a continuation line inside a `/* */`
  block starts with a word, so the prose counted as a violation.
- **Fix:** The comment now spells the query as "the ANY-prefixed pointer query" and says why the
  literal is withheld. Exactly the idiom `photos.astro` already uses for the radiogroup component
  it must not name, and `[...state].astro` for the hydration directive. The gate cannot tell a
  live media condition from a comment about one.
- **Commit:** none — playground file (D-02 fence)

**3. [Rule 2 — Missing critical functionality] `description` had to be emitted, not just commented**

- **Found during:** Task 2
- **Issue:** The plan says to reserve `description`'s slot with a comment and not render it. But
  schema decision 7's binding half is that the description must be **present in the served
  HTML**, and a comment cannot demonstrate or verify that. `photos.astro` renders
  `.playground/src/data/portfolio_images.json`, which carried no `description` at all, so the
  requirement would have been an unexecuted branch.
- **Fix:** `place`, `description` and `alt` mirrored onto the playground's manifest copy (`alt`
  null on all 39; the same two ids as the fixture carry bracketed fixture-only values), and the
  description emitted into the tile hidden with `display: none`. The plan's "does not render in
  the grid" is honoured — it is in the DOM and occupies no space. This extends the plan's file
  list by one gitignored playground file.
- **Commit:** none — playground file (D-02 fence)

### Refusals

**4. The plan's `00-FINDINGS.md` `= 16` gate is wrong. No `G-` row was added.**

The register carries **fifteen** rows — `G-1` through `G-15`; `grep -c '^| \*\*G-'` returns 15.
Plan 00-23 hit the identical gate and refused to add a row; the same refusal here, for the same
reason. The register states its own fixed-denominator rule because the tiers bound Phase 1's and
Phase 7's pull lists, so a phantom row would silently expand both — a fabricated finding is
strictly worse than a failing check. `00-ADMIN-IA.md` already carries 00-23's correction naming
fifteen as the correct denominator for any future check. **Task 3's verify command fails on this
one clause and passes on every other.**

**5. D-16-1 not patched, and the plan's task-2 verify command is wrong to include `/photos/`.**

That command expects `audit15.mjs /admin/ /photos/` to exit 0. It cannot, while D-16-1 is open —
and the same plan's task 3 *instructs* that D-16-1 stay open, with `T-00-77` dispositioning a
local patch as `accept`. `/photos/` reports exactly the seven offenders D-16-1 already documents,
counted with de-duplication disabled: 3 `AppBar` links at 20px, 3 `Footer` links at 22.5px, 1
`.ph-xlink` at 30px. **None new, none introduced by this plan** (focusables on the route are
unchanged at 54). `AppBar` and `Footer` paint their own geometry inside the design system, so a
consumer fix reaches past the component — the workaround the Core Value forbids. The binding gate
is the task's `done` criterion, which names `/admin/` only, and `/admin/` reports 0 at all five
coarse classes.

## Design-system findings (recorded, not worked around)

**A fourth composition limit, joining plan 13's two and plan 00-23's `Sortable` strategy.**
`FieldProps` is `{ label, hint, errorMessage, wiring, group, children, className }` — there is
**no `required` flag**, so a required field has no component-level visible affordance.
Requiredness had to be encoded in the label string (`"Alt text (required)"`) and repeated in the
hint, which means every screen in the product will invent its own marker and they will not match.
The native `required` attribute passes through `TextInput` to the `<input>`, so the semantics are
correct; only the visible marker has no home. Recorded for Phase 1 alongside the `G-2`
control-geometry family.

Everything the prompt's brief listed was respected without incident: no `class=` on a React DS
component (repo-wide total still **0**), `Chip` used only non-interactively so its `className`
clobber cannot cost a focus ring, no consumer `display: flex` relied on through `Card`, and no
`Text` coloured from a stylesheet.

## Known Stubs

**The tag add-on-Enter input is inert** — it accepts focus and does nothing. That is the D-02
fence, not an omission: the playground is a static sketch with no `onChange` anywhere, and every
other chip set in the admin (Skills, Project — Tech Stack) is inert the same way. Phase 7 wires
it.

**The `ALT PENDING` placeholder is itself a deliberate stub**, tracked by the drift gate and
prohibited from production in `00-ADMIN-IA.md`. It resolves when the 39 real strings land —
Phase 5.

Neither prevents this plan's goal. Both are recorded rather than hidden.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or trust-boundary schema change.
The one privacy-relevant surface, `place`, was handled as the register requires: null or a
bracketed fixture-only marker on every record, never derived, with the reason on screen in the
field's own hint.

## Files

**Committed** (`4bed583`)

- `.planning/phases/00-design-ideation/00-ADMIN-IA.md` — +153 lines
- `.planning/phases/00-design-ideation/deferred-items.md` — +137 lines

**Playground, gitignored** — `src/fixtures/photos.json`, `src/data/portfolio_images.json`,
`src/pages/admin/photos/[...state].astro`, `src/pages/photos.astro`,
`src/pages/admin/[...state].astro`, and four new harnesses: `check-alt-drift.mjs`,
`probe24.mjs`, `d151.mjs`, `audit15-raw.mjs` (`audit15` with de-duplication disabled, because it
collapses offenders on `tag + class` and the raw count is what a floor audit needs).

**Untouched and verified so:** the repo's `data/portfolio_images.json` (`git diff --quiet`
passes — Phase 3 owns that migration), `00-FINDINGS.md`, `00-PHOTO-CONTENT.md`, `STATE.md`,
`ROADMAP.md`, and plan 00-25's three files.

## Playground state on exit

`npx astro build` → **93 pages**. `check-no-js.sh` PASS (67 static routes zero framework JS, 26
island routes hydrate). `check-theme-exhaustive`, `check-font-names`, `check-contrast`,
`check-css-size`, `check-states`, `check-coverage`, `check-no-ivory` and the new
`check-alt-drift` all exit 0. `check-bundle.mjs` still **exits 1 by design** — that is recorded
finding G-15, not breakage. `audit15.mjs /admin/` and `/admin/photos/` both AUDIT PASS.
`probe24.mjs` PASS — 25 browser assertions.

## Self-Check: PASSED
