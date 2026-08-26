---
phase: 03-content-layer-image-origin
plan: 05
subsystem: content layer / projects split, résumé date shape
tags: [migration, data-shape, losslessness-proof, code-point-assertion, D-24, OD-4, OD-6]
requires:
  - "03-02's bold-only bullets (verified intact: 13 bullets, 0 HTML tags, 34 `**` delimiters)"
provides:
  - "`data/projects.json` — the five project records as a top-level array, moved verbatim"
  - "`data/resume.json` with exactly `experience, skills, education`"
  - "`src/lib/period.ts` — the single formatter deriving a display period from structured dates"
  - "structured date fields on all four dated records, with `period` deleted from disk"
  - "`{{ds.componentCount}}` in place of the stale `79-component` literal, with a gate that rejects any literal figure"
affects:
  - "data/resume.json (projects key removed; four period strings replaced by structured fields)"
  - "03-06 (two `file()` loader targets of the same shape; the `\\d+[- ]component` rejection lifts into the schema; `period` is derived, never declared)"
  - "Phase 5 (must supply the `{{ds.componentCount}}` resolver AND fail the build on an unresolved token)"
  - "Phase 7 (`/admin/projects` opens a file already in its final shape; the résumé editor edits date fields, not a display string)"
tech-stack:
  added: []
  patterns:
    - "evidence revision found by a COMBINED content predicate (still has projects AND still has four periods), so a same-wave commit cannot become the baseline"
    - "separator equality asserted on CODE POINTS, never on a glyph comparison"
    - "source-constraint gates moved out of the plan's verify block and into the test suite, so they survive the afternoon they were run"
    - "the migration reports semantic work and tree effect as two separate numbers"
key-files:
  created:
    - "data/projects.json"
    - "src/lib/period.ts"
    - "scripts/migrate-resume-structure.mjs"
    - "test/content/resume-structure.unit.test.ts"
  modified:
    - "data/resume.json"
decisions:
  - "OD-4 Option A including education, as decided by Akhil: `period` deleted from all four records; months stored as INTEGERS 1-12"
  - "OD-6 Option A, as decided by Akhil: `{{ds.componentCount}}` stored; the rest of the reviewed sentence byte-identical"
  - "SIX plan-supplied gates were defective. Three are new findings of this plan (zsh `PIPESTATUS`, the comment-matching locale check, the convergence-measuring idempotence gate); two more are the quote-style-blind import check and the walk-through-able substring locale check. All are recorded with before/after below."
  - "The plan's period.ts source checks were re-homed into the test suite rather than left as `node -e` one-liners, because a gate that only exists in a verify block protects one afternoon"
metrics:
  duration: "~55m"
  completed: "2026-08-26"
  commits: 3
  gates: "77 assertions in the new file; 322 across the full unit project; 17 planted defects each proven red; 3 walk-throughs attempted, 1 succeeded and was closed"
---

# Phase 3 Plan 05: The Projects Split, the Date Shape and the Component Figure — Summary

`projects` left `resume.json` for a top-level `data/projects.json` array, verbatim; the four
`period` strings became structured date fields with `src/lib/period.ts` as their only renderer; and
the `79-component` literal became `{{ds.componentCount}}` behind a gate that rejects any digit-led
component figure in a project description.

---

## 1. The two verdicts, verbatim

Both were pre-resolved by Akhil and handed to the executor with the instruction not to re-ask. Task
1 was therefore recorded, not paused on. Quoted from `03-CONTEXT.md` §3 and the execution brief:

> **OD-4 — Option A, including education.** `period` is deleted from disk for **all four**
> records — three experience entries **and** education. `src/lib/period.ts` derives it, with a test
> asserting all four strings reproduce byte-for-byte: `Jul 2023 – Present`, `Nov 2022 – Jun 2023`,
> `Dec 2021 – Nov 2022`, `Jul 2018 – Jun 2022` — three-letter month, **U+2013 en dash with
> spaces**.

> **OD-6 — Option A, placeholder + Phase 5 resolver.** Store `{{ds.componentCount}}`; 03-06's
> schema rejects any project description containing a literal `\d+-component`; Phase 5 supplies the
> resolver.

### The OD-6 wording actually used

Before (`412ca9e`):

```
79-component React library with semantic tokens, dark mode, and live Storybook docs.
```

After:

```
{{ds.componentCount}}-component React library with semantic tokens, dark mode, and live Storybook docs.
```

The figure — and only the figure — was replaced. Everything from `-component` onward is
byte-identical to the reviewed sentence, and that is asserted two ways (a derived comparison
against the evidence revision, and a suffix comparison stated in the opposite direction so a bug in
one cannot make both agree).

### Months are stored as INTEGERS

`startMonth: 7`, not `startMonth: "Jul"`. The three-letter string is a rendering concern; storing it
would recreate the exact coupling OD-4 removes — Phase 7's editor would be editing a display string
again, and the month table would then have two homes. `src/lib/period.ts` owns the only month table
that produces output.

`isPresent: true` means `endMonth` and `endYear` are **absent** — not `null`, not `0`. One record
(Brevo) is in that state, and `formatPeriod` throws rather than render a range that is both open and
closed.

---

## 2. Two premises in the plan and context body are wrong. Corrected here.

Both concern OD-6, and neither changes what was built.

1. **"Phase 1's v2.0.0 is unpublished, so Phase 3 cannot resolve the number."** False.
   `@akhil-saxena/design-system@2.0.0-beta.1` is published on the `next` dist-tag. Phase 5's
   resolver can take a real dependency rather than reading a sibling checkout. The token is
   therefore **not** a workaround for an unresolvable number — the number is resolvable, just not
   at this layer, because resolving it means reading the shipped catalog and the catalog arrives
   with the dependency.

2. **"The figure has been wrong three times (80 → 79 → 81)."** The three-numbers problem is
   **already closed upstream.** `../design-system/src/OverviewPage.tsx`'s `categories` array — the
   authority per 01-12 — sums to **81**; `README.md` says **81**; `src/overview-links.test.ts`
   asserts the two agree. The 83 directory count differs by exactly the two documented exclusions
   (`Field`, `IconButton`). **Only `data/resume.json`'s 79 was stale**, and it is now gone.

**The resolver's source is the catalog** (`OverviewPage.tsx`'s `categories` array). Not `README.md`,
which 01-12 explicitly retired as an authority for this figure, and not the directory count, which
never was one. Both corrections are written into `scripts/migrate-resume-structure.mjs`'s header so
the next reader of that file does not inherit the stale framing.

---

## 3. What shipped

### `data/projects.json` — as committed

```json
[
  {
    "id": "cairn",
    "title": "Cairn",
    "label": { "text": "Web", "icon": "code" },
    "description": "Job application tracker with interview workflows and feedback tracking, built on a custom design system. Deliberately anti-gamified and runs entirely on Cloudflare's free tier.",
    "tech": ["Astro", "React", "TypeScript", "Cloudflare"],
    "icon": null,
    "href": "https://cairn.co.in",
    "badges": [
      { "label": "Live", "href": "https://cairn.co.in", "icon": "arrow-up-right" }
    ]
  },
  {
    "id": "hued",
    "title": "hued",
    "label": { "text": "Android App", "icon": "android" },
    "description": "See your life through color. Extracts dominant palettes from your photo gallery by week, month, and year. Privacy-first, all on-device.",
    "tech": ["Kotlin", "CIELAB"],
    "icon": "/assets/hued-icon.png",
    "href": "https://play.google.com/store/apps/details?id=app.hued",
    "badges": [
      { "label": "Play Store", "href": "https://play.google.com/store/apps/details?id=app.hued", "icon": "play-store" },
      { "label": "GitHub", "href": "https://github.com/akhil-saxena/hued", "icon": "github" }
    ]
  },
  {
    "id": "momentum",
    "title": "Momentum",
    "label": { "text": "Android App", "icon": "android" },
    "description": "Goal tracker with adaptive daily targets, streaks, milestones, badges, home screen widgets, and cloud sync.",
    "tech": ["Kotlin", "Material 3"],
    "icon": "/assets/momentum-icon.png",
    "href": "https://play.google.com/store/apps/details?id=com.momentum.goals",
    "badges": [
      { "label": "Play Store", "href": "https://play.google.com/store/apps/details?id=com.momentum.goals", "icon": "play-store" },
      { "label": "GitHub", "href": "https://github.com/akhil-saxena/momentum-android", "icon": "github" }
    ]
  },
  {
    "id": "timeshift",
    "title": "TimeShift",
    "label": { "text": "Chrome Extension", "icon": "chrome" },
    "description": "Right-click any time on the web to convert it instantly. NLP-powered parsing with smart timezone disambiguation and DST awareness.",
    "tech": ["JavaScript", "Chrome APIs", "NLP"],
    "icon": "/assets/timeshift-icon.png",
    "href": "https://chromewebstore.google.com/detail/timeshift-global-timezone/bnghkolhekleahihlmpjniedgedjphel",
    "badges": [
      { "label": "Chrome Store", "href": "https://chromewebstore.google.com/detail/timeshift-global-timezone/bnghkolhekleahihlmpjniedgedjphel", "icon": "chrome-store" },
      { "label": "GitHub", "href": "https://github.com/akhil-saxena/convert-timezone", "icon": "github" }
    ]
  },
  {
    "id": "design-system",
    "title": "Design System",
    "label": { "text": "Web", "icon": "code" },
    "description": "{{ds.componentCount}}-component React library with semantic tokens, dark mode, and live Storybook docs.",
    "tech": ["React", "TypeScript", "CSS"],
    "icon": null,
    "href": "https://design-system-ed1.pages.dev",
    "badges": [
      { "label": "GitHub", "href": "https://github.com/akhil-saxena/design-system", "icon": "github" }
    ]
  }
]
```

*(Reflowed here for readability. On disk it is `JSON.stringify(records, null, 2)` plus a trailing
newline — `data/` is Biome-excluded, so that serialisation is final.)*

### `data/resume.json` after

Top-level keys are exactly `experience, skills, education`. The four dated records:

| record | keys where `period` used to sit | stored |
|---|---|---|
| `experience[brevo]` | `startMonth, startYear, isPresent` | `7, 2023, true` |
| `experience[pharmeasy]` | `startMonth, startYear, endMonth, endYear, isPresent` | `11, 2022, 6, 2023, false` |
| `experience[maq]` | `startMonth, startYear, endMonth, endYear, isPresent` | `12, 2021, 11, 2022, false` |
| `education[vit]` | `startMonth, startYear, endMonth, endYear, isPresent` | `7, 2018, 6, 2022, false` |

The new fields take `period`'s slot rather than being appended, so the committed diff reads as a
field changing shape where it already lived.

---

## 4. The four period strings, reproduced byte-for-byte

`formatPeriod` was run against the four migrated records and compared to the strings read out of
`412ca9e` — the pre-migration revision — not to strings copied from the plan.

```
brevo      "Jul 2023 – Present"     === git(412ca9e) YES   separator U+2013 at index 9  U+002D present: false
pharmeasy  "Nov 2022 – Jun 2023"    === git(412ca9e) YES   separator U+2013 at index 9  U+002D present: false
maq        "Dec 2021 – Nov 2022"    === git(412ca9e) YES   separator U+2013 at index 9  U+002D present: false
vit        "Jul 2018 – Jun 2022"    === git(412ca9e) YES   separator U+2013 at index 9  U+002D present: false
```

The evidence revision is also verified rather than assumed: the suite asserts that every one of the
four baseline strings itself uses U+2013 and contains neither U+002D nor U+2014. Without that,
"exact reproduction" could have meant "exactly reproduces the wrong character".

### Why the assertion is on code points

Under a planted hyphen-for-en-dash swap, the two comparisons report the same defect very
differently:

```
# string equality — the two sides are visually indistinguishable
AssertionError: expected 'Jul 2023 - Present' to be 'Jul 2023 – Present'
  Expected: "Jul 2023 – Present"
  Received: "Jul 2023 - Present"

# code-point equality — the same defect, as a number
AssertionError: expected [ 74, 117, 108, 32, 50, 48, 50, …(11) ] to deeply equal [ … ]
  -   8211,
  +   45,
```

Both assertions are kept. The code-point one is the proof; the string one exists so the failure
message is readable once you know what to look for.

---

## 5. Gate proofs — four steps each

17 defects were planted across 10 gates. Every one turned its gate red. Three walk-throughs were
attempted; one succeeded and was closed.

### G1 — the structural check (plan Task 2, verify 1)

| step | result |
|---|---|
| 1 · plant | duplicate id → `FAIL: duplicate project ids`; `icon` deleted from `cairn` → `FAIL: cairn keys [badges,description,href,id,label,tech,title]`; sixth record → `FAIL: projects.json is not an array of 5` |
| 2 · nothing to check | `[]` → `FAIL: projects.json is not an array of 5` |
| 3 · correct code | `OK 5 project records: cairn, hued, momentum, timeshift, design-system` |
| 4 · walk-through | **SUCCEEDED.** It compares key *sets* (`.sort()`), so reversing a record's eight keys passes. Blocked by G2, which compares ordered `Object.keys` and ordered `JSON.stringify`. G1's blindness is left as-is and documented; the order claim belongs where it is asserted. |

### G2 — the verbatim-move proof (plan Task 2, verify 2)

| step | result |
|---|---|
| 1 · plant | changed a nested `badges[0].href` on `timeshift` → red; `icon: null` → `""` on `cairn` → red; rewrote the OD-6 sentence keeping the token → red on *"design-system.description changed the figure and NOTHING else"* |
| 2 · nothing to check | the walker, run against `data/site_config.json`, **threw**: *"searched 3 revision(s)"*. Against a path with no history: *"searched 0 revision(s)"*. Plus 11 in-suite rejection cases (empty, whitespace, `null`, `undefined`, non-JSON, bare array, no `projects` key, empty array, non-array, null records, records with no `id`) |
| 3 · correct code | green; the chosen ref is printed in the test name — `resolves a pre-split revision of data/resume.json that still holds projects (412ca9e)` |
| 4 · walk-through | **SUCCEEDED.** Re-indenting `projects.json` to four spaces and dropping the trailing newline passes — it is a JSON-content proof, not a byte proof. Escalated to G5, which initially *also* passed; see the repair in §6.3. |

### G3 — the dropped-badge control (plan Task 2, verify 3)

| step | result |
|---|---|
| 1 · plant | `hued.badges` truncated to one entry → red on *"is byte-identical to its previous home"*. G1 stayed green on the same input, which is the point of the control |
| 2 · nothing to check | covered by G2 step 2 — the control cannot run without an evidence revision |
| 3 · correct code | green |
| 4 · walk-through | dropping the badge *and* the evidence would be needed; the evidence is in git and the walker throws when it is absent |

### G4 — the reinstated-literal control (plan Task 2, verify 4)

| step | result |
|---|---|
| 1 · plant | `design-system.description` set back to the exact `79-component …` sentence → **three** assertions red: the token is missing, the figure/suffix comparison fails, and `no project description anywhere contains a literal component figure` fails |
| 2 · nothing to check | `it('the evidence revision did carry a literal figure — the change had a target')` fails if the baseline never had one, so the "no literals" assertion cannot be green against a corpus that never had a figure |
| 3 · correct code | green; the regex is separately unit-tested against `79-component`, `81 component`, `12-Component`, `{{ds.componentCount}}-component`, `a component library` |
| 4 · walk-through | **Notable.** The verbatim comparison masks `description`, so reinstating the *exact original sentence* passes it — byte-identical to the evidence is exactly what it checks. Only the three named OD-6 assertions catch it. This is precisely why the plan required "one field differs" to be a *named expectation* rather than a tolerance, and it is now demonstrated rather than argued |

### G5 — idempotence (plan Task 2, verify 5) — **repaired, see §6.3**

| step | result |
|---|---|
| 1 · plant | `projects.json` re-indented to four spaces → repaired gate reports `OK 0 semantic changes, but 1 file(s) rewritten … This run DID work; it is not a no-op` → **FAIL**. The plan's original gate on the identical input, clean tree: `OK re-run is a no-op` |
| 2 · nothing to check | `projects.json` deleted and no `projects` key → exit 1, *"the five records are in neither file, so there is nothing to migrate and nothing to verify"*. `experience: []` → exit 1, *"resume.json experience holds 0, expected 3 record(s)"* |
| 3 · correct code | `OK 0 changes, no file rewritten — 5 project records and 4 dated records already canonical`, and the files are byte-identical across the re-run |
| 4 · walk-through | hand-editing `cairn.title` then re-running passes G5 — the migration is content-preserving by design. Blocked by G2 (*"is byte-identical to its previous home"*) |

### G6 — period reproduction (plan Task 3, verify 1)

| step | result |
|---|---|
| 1 · plant | `MONTH_NAMES[month]` off-by-one → red on 4 reproduction cases plus *"renders every month name from the table, in order"*; `'Jul'` → `'July'` → red; `brevo.startMonth` 7 → 8 in the data → red |
| 2 · nothing to check | `parseEvidencePeriods` rejects: empty, no `experience`/`education`, only three of four periods, a blank period string, and the post-migration shape. The real `412ca9e` is accepted with exactly 4 |
| 3 · correct code | green, all four byte-exact (§4) |
| 4 · walk-through | **BLOCKED.** A formatter hardcoding the four answers keyed on `startYear` reproduces all four — and is caught by the *"shapes the corpus does not contain"* block: the throw cases and the twelve-month enumeration go red. Those tests were not decoration |

### G7 — `period.ts` source constraints (plan Task 3, verify 2) — **repaired twice, see §6.4 and §6.5**

| step | result |
|---|---|
| 1 · plant | real `Intl.DateTimeFormat` in code → red on *"uses no locale-dependent date API"* (the file legitimately contains that name once, in a comment — the correct file passes, the defective one with two occurrences fails); a **single-quoted** `import { readFileSync } from 'node:fs'` → red on *"imports nothing at all — no Node builtin, in either quote style"*; a pasted `–` glyph replacing the escape → red on *"writes the en dash as the escape – in code, never as a pasted glyph"* |
| 2 · nothing to check | with the source stripped to empty, all four guard predicates report FAIL (`contains export function formatPeriod`, `contains MONTH_NAMES`, `length > 400`, `contains –`), and a whole-file comment-out makes the suite red |
| 3 · correct code | green |
| 4 · walk-through | **SUCCEEDED, then closed.** `const Locale = Intl;` followed by `new Locale.DateTimeFormat(...)` contains neither `Intl.` nor `Intl.DateTimeFormat`, and passed the substring check while silently reintroducing the ICU dependency — green locally because Node's ICU happens to emit `Jul`. Closed by switching to word-bounded patterns and banning `Date` outright: `[/\bIntl\b/, /\btoLocale[A-Za-z]*\b/, /\bDate\b/, /\bnew Date\b/, /\bformatToParts\b/]`. The same walk-through is now red |

### G8 — no double representation (plan Task 3, verify 3) — **repaired, see §6.6**

| step | result |
|---|---|
| 1 · plant | `period` added back onto `education[vit]` alongside its structured fields → red on *"no entry carries two representations of the same fact"* and *"vit stores structured dates and no period string"* |
| 2 · nothing to check | `experience: []` and `education: []` → **red** on six assertions including *"finds all four dated records on disk today"*. The plan's version printed `OK no entry carries two representations of the same fact` on the same input |
| 3 · correct code | green |
| 4 · walk-through | storing the string under a different key (`dateRange`) would pass — noted as a residual; 03-06's schema is the right place to close it with a strict key set |

### G9 — the en-dash negative control (plan Task 3, verify 4)

| step | result |
|---|---|
| 1 · plant | the escape replaced by `-` → **six** assertions red, including all four reproductions, *"separates the two halves with SPACE U+2013 SPACE and nothing else"*, and the source-level escape check. The control's own anchor check (`if (s === before) FAIL: control anchor stale`) confirms the substitution actually happened |
| 2 · nothing to check | the control refuses to run if no `–` escape is present to swap |
| 3 · correct code | green |
| 4 · walk-through | a literal `–` glyph pasted in place of the escape defeats *this* control (there is nothing named `–` to swap) — which is why G7 separately asserts no U+2013 glyph appears in code |

### G10 — the whole toolchain (plan Task 3, verify 5)

| step | result |
|---|---|
| 1 · plant | Biome caught `lint/suspicious/noExportsInTest` on an exported helper during development; fixed by dropping the export, matching 03-03's precedent |
| 2 · nothing to check | n/a — `npm run check` and `astro check` both fail loudly on an empty or unparseable file |
| 3 · correct code | `npm run check` PASS · `npm run typecheck` PASS (0 errors, 0 warnings, 6 hints) · `vitest --project unit` **322/322 across 5 files** |
| 4 · walk-through | `astro check` does not typecheck `data/*.json`; that is 03-06's job and is why 03-06 exists |

---

## 6. Plan-supplied gates that had to be repaired

Six, of which **four are new findings of this plan**. Two had already been repaired in the plan
before hand-off (the subshell `( cmd && R=0 || R=1 )` harnesses and the `HEAD~1` evidence lookup);
both repairs were confirmed correct in use.

### 6.1 `${PIPESTATUS[0]}` — a green suite reported as FAIL *(new)*

**Before** (plan, Task 2 verify 2 and Task 3 verify 1):

```sh
npx vitest run … --reporter=verbose 2>&1 | tail -40; test ${PIPESTATUS[0]} -eq 0 || { echo "FAIL: verbatim-move proof red"; exit 1; }
```

`PIPESTATUS` is a **bash** array. The shell here is zsh, where the array is `$pipestatus` and
`PIPESTATUS` is unset. Run verbatim against a passing suite:

```
(eval):test:3: unknown condition: -eq
PLAN-HARNESS SAYS: FAIL: verbatim-move proof red
```

A correct gate reporting failure — the same family as the two harness defects already repaired.

**After:**

```sh
if npx vitest run --project unit <file> >/tmp/out.txt 2>&1; then tail -40 /tmp/out.txt; else tail -40 /tmp/out.txt; echo "FAIL: proof red"; exit 1; fi
```

### 6.2 The Node-import check was blind to the project's own quote style *(new)*

**Before** (plan, Task 3 verify 2):

```js
const bad = [...s.matchAll(/^\s*import[^\n]*from\s+"(node:[^"]+|fs|path|url|crypto)"/gm)];
```

Measured directly:

```
plan regex vs SINGLE-quoted node:fs import -> 0 match(es)   <- biome.json sets quoteStyle: "single"
plan regex vs DOUBLE-quoted node:fs import -> 1 match(es)
```

The one form the repository can actually contain is the one form it could not see. This is the
wave-1 defect repeating verbatim.

**After** — an assertion in the suite, matching both quote styles, and inverted to require *zero*
imports rather than merely no banned ones:

```ts
const imports = [...PERIOD_CODE.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
expect(imports).toEqual([]);
```

…plus a positive control asserting the regex matches all three specifier forms, so "no imports
found" cannot mean "the regex is broken".

### 6.3 The idempotence gate measured convergence, not work *(new)*

**Before** (plan, Task 2 verify 5):

```sh
node scripts/migrate-resume-structure.mjs >/dev/null 2>&1 && git diff --quiet data/resume.json data/projects.json && echo "OK re-run is a no-op"
```

Two faults. `>/dev/null 2>&1` discards the script's own report, and `git diff --quiet` compares to
**HEAD** — so it conflates "the migration is idempotent" with "the migration has been committed",
and it cannot see a run that did work and converged. Demonstrated on a clean tree by re-indenting
`projects.json` to four spaces:

```
PLAN GATE SAYS: OK re-run is a no-op   <-- WRONG: it rewrote a file
```

**After** — snapshot the files, run, compare to the **snapshot** (not HEAD), *and* require the
script's own report to contain the exact string `0 changes, no file rewritten`:

```
script: OK 0 semantic changes, but 1 file(s) rewritten — the serialisation on disk was not canonical …
work=some tree=moved
G5 FAIL: the re-run was not a no-op
```

**This also caught a defect in code written for this plan.** The first version of the migration's
final `console.log` hardcoded `0 files rewritten` inside its zero-work branch, so a run that
rewrote a file reported doing nothing. Found by the G2 step-4 walk-through, fixed in commit
`2009dc9`, and the wrong report is quoted in the script's own comment so it is not reintroduced.

### 6.4 The locale check matched its own explanatory comment *(new)*

**Before** (plan, Task 3 verify 2):

```js
if (/Intl\.DateTimeFormat|toLocaleString|toLocaleDateString/.test(s)) { … process.exit(1) }
```

`src/lib/period.ts` is required by the plan to explain *why* those APIs are banned. That comment
makes the gate fail on correct code:

```
== G7 (plan version) against CORRECT code ==
FAIL: locale-dependent month formatting — workerd ICU is not the local Node ICU
  exit=1
```

This is the **seventh** comment-match defect recorded on this project, and the first where the
false result is a FAIL rather than a PASS.

**After** — strip comments before testing, with a meta-test proving the stripper neither eats code
nor mistakes `https://` for a line comment, and a guard that the stripped source still contains
`export function formatPeriod`, `MONTH_NAMES` and more than 400 characters. Stripping also makes
the check *stronger*: an escape or an import that exists only in a comment no longer counts as
evidence either way. The suite additionally asserts the banned name **is** present in the raw
source, so the reason stripping is needed is itself pinned.

### 6.5 The tightened locale check, after a successful walk-through *(new)*

Substring matching on `Intl.` is walk-through-able. Demonstrated:

```
const Locale = Intl;
return new Locale.DateTimeFormat('en', { month: 'short' }).format(new Date(2020, month - 1, 1));
```

→ gate **PASS**, and the four reproductions stayed green because the developer's Node ICU emits
`Jul`. This is exactly the failure the constraint exists to prevent: correct locally, wrong in
`workerd`, with no failing test. Closed by switching to word-bounded patterns and banning `Date`
outright. Re-run: red.

### 6.6 The two-representations check could pass on zero records

**Before** (plan, Task 3 verify 3): `[...r.experience, ...r.education].filter(…)` — with both arrays
empty, `both.length` is 0 and the gate prints `OK no entry carries two representations of the same
fact`.

**After** — the check lives in the suite next to hard counts: `experience` is 3, `education` is 1,
the four ids are enumerated by name via `it.each`, and the open-range set is asserted to be exactly
`['brevo']` so "zero open ranges" fails rather than passes. On empty arrays the suite goes red on
six assertions.

### A note on where these gates now live

The plan's `period.ts` source checks were `node -e` one-liners inside `<verify>`. They are
assertions in `test/content/resume-structure.unit.test.ts` instead. A gate that lives in a verify
block protects the afternoon it was run; the same check in the unit project protects every commit
afterwards, and CI already runs it.

---

## 7. Data safety

`data/resume.json` was copied to a backup and checksummed before any write
(`3b06d17d270fec38964fc337c507594d77d1f07b4c9b97fa638861218bca301c`). Every negative control
snapshotted its target, restored it, and verified the restore by SHA-256 — **17 mutate/restore
cycles, all confirmed byte-identical**, ending on a clean `git status`.

03-02's work is intact and was re-measured after the final commit:

| invariant | expected | measured |
|---|---|---|
| bullets | 13 | **13** |
| HTML tags anywhere in the file | 0 | **0** |
| `**` delimiters | 34 (17 spans) | **34** |

And against the pre-execution backup, with the date fields excluded from the comparison:

```
skills identical: true
experience minus date fields identical: true
education minus date fields identical: true
```

Nothing outside the `projects` key, the four `period` fields and the one OD-6 description changed.
`data/portfolio_images.json` was never touched (03-04 owns it); no `git clean`, `git stash`,
`git reset --hard`, `git checkout --` or `git worktree` was run; every commit staged explicit paths.

---

## 8. The Phase 5 obligation

The plan is right that these checks cannot see whether the token ever *resolves*. Nothing renders a
project card until Phase 5, so `{{ds.componentCount}}` is currently a string no code reads. The
gates prove only that a stale literal cannot come back.

**A sentence Phase 5's planner can lift verbatim:**

> Phase 5 must fail the build on an unresolved `{{ds.*}}` token in any committed content string —
> resolving `{{ds.componentCount}}` from the shipped design-system catalog
> (`OverviewPage.tsx`'s `categories` array, the authority per 01-12; **not** `README.md`, which
> 01-12 retired for this figure, and **not** the `src` directory count, which was never one) — so
> that 03-05 has replaced a wrong number with a build failure rather than with a visible
> placeholder, which would be worse.

`@akhil-saxena/design-system@2.0.0-beta.1` is published on the `next` dist-tag, so this resolver can
take a real dependency rather than reading a sibling checkout. Adding that dependency is Phase 5's
tarball step and is governed by `gate:deps`; **no package was installed by this plan** (T-03-05-SC).

*Not recorded in ROADMAP.md — STATE.md and ROADMAP.md are being reconciled centrally after the
wave, per the execution brief.*

---

## 9. Residual gaps, stated rather than smoothed over

1. **The token is unread by anything.** §8. This is the whole risk of OD-6 Option A and it is
   deferred, not closed.
2. **G1 is blind to key order; G2 is blind to serialisation formatting.** Neither is a defect on its
   own — each is covered by another gate — but no single gate proves "byte-identical file". The
   chain is G1 → G2 → G5, and it is only sound while all three run.
3. **A date range stored under a different key name** (`dateRange: "Jul 2023 – Present"`) would pass
   the two-representations check. 03-06's schema should use a strict key set.
4. **`src/lib/period.ts` has no consumer yet.** It is exercised only by tests. Phase 5's résumé
   view is its first real caller, and the `workerd` claim in its header is argued, not measured —
   nothing in this plan imports it inside `workerd`. 03-06 will, when the schema does.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or trust-boundary schema change. The
one threat-register entry with a runtime component (T-03-05-SC, package installs) was satisfied by
installing nothing.

---

## Commits

| hash | message |
|---|---|
| `a587552` | `content(resume): split projects into projects.json (D-24)` |
| `2009dc9` | `content(resume): store structured dates and derive the period string` |

Both authored `Akhil Saxena <saxena.akhil42@gmail.com>`, the repository default, unchanged.

## Self-Check: PASSED
