---
phase: 03-content-layer-image-origin
plan: 06
subsystem: content
tags: [zod, astro-zod, schema, validation, referential-integrity, gate, tdd]

requires:
  - phase: 03-01
    provides: "src/lib/image-origin.ts — IMAGE_ORIGIN and REMOTE_URL_KEYS, the only place the hostname is written"
  - phase: 03-02
    provides: "src/lib/bullets.ts — parseBullet, serializeBullet, containsHtmlTag"
  - phase: 03-03
    provides: "data/site_config.json as seven {id,label,columns} records plus defaultColumns (OD-2)"
  - phase: 03-04
    provides: "alt on 39/39, place on 16, categoryOrder on 39"
  - phase: 03-05
    provides: "data/projects.json, structured resume dates, src/lib/period.ts, the {{ds.componentCount}} token"
provides:
  - "src/schemas — the single definition of every content shape, five per-file schemas plus one cross-file validator"
  - "validateContentSet / assertContentSet — six referential-integrity rules, all violations accumulated"
  - "npm run gate:schema — a second definition of a content shape anywhere under src/ fails by name"
  - "OD-3 executed in both halves: tags removed from all 39 records AND rejected by the schema"
affects: [03-07, 03-08, phase-5-render, phase-7-admin]

tech-stack:
  added: []
  patterns:
    - "astro/zod only — nothing installed; a second zod copy is a type-identity hazard with defineCollection"
    - "Import the predicate, never restate it: containsHtmlTag, parseBullet, formatPeriod, IMAGE_ORIGIN"
    - "Anti-vacuity contract: .min(1) on top-level arrays, a `checked` census on every rule, and rules that could not run are named rather than silently skipped"
    - "Gate self-test on every invocation: each rule carries a canary it must flag and an anti-canary it must ignore"

key-files:
  created:
    - src/schemas/photo.ts
    - src/schemas/site.ts
    - src/schemas/resume.ts
    - src/schemas/projects.ts
    - src/schemas/home.ts
    - src/schemas/content-set.ts
    - src/schemas/index.ts
    - scripts/assert-single-schema-source.mjs
    - test/content/schemas.unit.test.ts
  modified:
    - data/portfolio_images.json
    - package.json

key-decisions:
  - "OD-3 = drop. tags removed from all 39 records and declared z.never().optional() so the refusal carries the decision rather than a generic 'Unrecognized key'."
  - "OD-7 = structural. No validateContent Astro Action; the single-definition gate stands in for the third consumer, and the claim is stated as weaker rather than papered over."
  - "focalPoint is .optional() with NO zod .default(), against the literal wording of 03-CONTEXT.md §2 — a default makes parse() return a value the input did not contain, and this module is also the Phase 7 write boundary."
  - "Remote photo URLs are checked by URL-origin equality, not startsWith — they disagree on a prefix-sharing domain and on a userinfo @ host."
  - "SCHEMA-LOOSENED added as a fourth gate rule, beyond the plan's three, converting one of the plan's accepted blind spots into a check for its direct textual forms."

patterns-established:
  - "Negative test cases are built by deep-cloning the real committed record and changing ONE field, enforced by a mutated() harness that diffs the clone and refuses any other change — and the harness itself is tested."
  - "Every gate rule is proven by planting the specific defect it targets, by confirming it fails given nothing to check, by confirming it passes on correct code, and by attempting a walk-through whose successes are recorded in the gate's own source."

requirements-completed: [CONT-01, CONT-03]

duration: 55min
completed: 2026-08-26
---

# Phase 3 Plan 06: The One Schema Module Summary

**Five `astro/zod` per-file schemas plus a six-rule cross-file validator in `src/schemas`, with a self-testing gate that fails by name on any rival definition under `src/` — and `tags` removed from both the data and the schema.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-08-26
- **Tasks:** 3 (Task 1 answered from the record; Tasks 2–3 executed)
- **Files created:** 9 · **Files modified:** 2
- **Suite:** 351 → **458 passing** across 10 files (107 new assertions)
- **Gates:** `gate:schema` 0, `gate:origin` 0, `gate:routes` 0, `check` 0, `typecheck` 0

## Task Commits

1. **Task 1 (OD-3 data half)** — `f5607f6` (content) — drop the empty `tags` array from all 39 records
2. **Task 2 RED** — `74d142b` (test) — the failing proof, 107 assertions
3. **Task 2 GREEN** — `65f4313` (feat) — the five schemas and the cross-file validator
4. **Task 3** — `a131de0` (feat) — `scripts/assert-single-schema-source.mjs` + `gate:schema`

## Both Checkpoint Verdicts

Task 1 was a `checkpoint:decision`. **Neither question was re-asked**: both were resolved by Akhil on 2026-08-25 (commit `a4cd122`) and recorded in `03-CONTEXT.md`'s authoritative bottom table. The plan's `autonomous: false` was stale metadata, cleared in `640db68`.

| | Verdict | Recorded rationale |
|---|---|---|
| **A · OD-3** | **`drop`** | "The schema forbids the field, so a stray tag fails the build rather than sitting unread. Seven categories already organise 39 photographs and the gallery filters by category. A second taxonomy with nothing rendering it is metadata that rots." Settles a contradiction three documents held simultaneously — `PROJECT.md:91` "Dropped", `research/ARCHITECTURE.md:481` implementing the drop, `00-ADMIN-IA` §6 "Revived". |
| **B · OD-7** | **`structural`** | The write path is Phase 7 and does not exist. A `validateContent` action nobody calls would be the only `prerender = false` surface in the repository that nothing calls — a route written to satisfy a checklist. |

## `tags` — Both Halves Done, Confirmed

- **Data:** `f5607f6` removed the key from **39/39** records. Diff is **39 deletions, 0 insertions**. A `JSON.stringify(_, null, 2)` round trip was proven byte-identical to the file on disk *before* the delete, so the diff contains the removal and nothing else. The script refused outright if any record's `tags` had held a value; all 39 were `[]`.
- **Schema:** `photo.ts` declares `tags: z.never({ error: 'OD-3: …' }).optional()` inside a `z.strictObject`. A present `tags` fails naming OD-3; any *other* unknown key fails too, via strictness. Both are asserted.
- **Contradiction, resolved:** OD-3's option text says *"03-04 deletes the empty array from all 39 records"*, but 03-04 explicitly scoped `tags` out. Verified before acting: all 39 still carried it. **The deletion was this plan's work, not a missed upstream step.**

## The Schema's Shape

`src/schemas/index.ts` is the single import surface.

| Export | Kind |
|---|---|
| `PhotoSchema`, `PhotoManifestSchema`, `PhotoExifSchema`, `PhotoUrlsSchema`, `POSITION`, `DEFAULT_FOCAL_POINT` | + types `Photo`, `PhotoExif`, `PhotoUrls` |
| `SiteConfigSchema`, `CategorySchema` | + types `SiteConfig`, `Category` |
| `ResumeSchema`, `ExperienceEntrySchema`, `EducationEntrySchema`, `SkillGroupSchema` | + 4 types |
| `ProjectsSchema`, `ProjectSchema`, `BadgeSchema` | + types `Project`, `Badge` |
| `HomeConfigSchema` | + type `HomeConfig` |
| `validateContentSet`, `assertContentSet`, `formatContentSetReport` | + types `ContentSetInput`, `ContentSetReport`, `ContentSetViolation`, `SkippedRule` |

`import { z } from 'astro/zod'` in every file. Nothing installed — `astro@7.2.2` bundles `zod ^4.3.6`, resolved copy **4.4.3**. `package.json` declares no `zod`, asserted.

**Three things imported rather than restated** — this is the plan's whole point:

- `containsHtmlTag` **and** `parseBullet` from `src/lib/bullets.ts`. The second refinement catches an unbalanced `**` that a tag predicate cannot see.
- `formatPeriod` from `src/lib/period.ts`. "isPresent implies no end date" is *not* restated as a boolean; the schema calls the formatter and treats a throw as the failure.
- `IMAGE_ORIGIN` / `REMOTE_URL_KEYS` from `src/lib/image-origin.ts`. `photo.ts` contains **zero** occurrences of the hostname, asserted.

**One thing deliberately not defined:** the seven category names. `category` is `z.string()` with a lowercase-slug assertion, checked against the real id set in `content-set.ts`. No `z.enum`, asserted.

**`exif` is nullable, not optional — verified before encoding.** Present on 39/39 with six fields; `product-peppers` all six null, `lens` null on 11, `camera` null on 1, four fields null on 2. A schema declaring it optional-but-complete would reject 11 real records. The test iterates every null-lens record individually.

### The six cross-file rules as implemented

| Rule | Assertion | Consequence it prevents |
|---|---|---|
| **RI-1** | every `photo.category` ∈ `site.categories[].id` | **the ADR-002 rule.** Names the photo id *and* the category. Exact comparison, no case transform on either side. |
| **RI-2** | every declared id is used by ≥1 photo | a filter tab that opens an empty gallery — RI-1 is clean in exactly this case |
| **RI-3** | every `home.peekIds` entry ∈ `photos[].id` | a blank hero tile that reads as a slow image |
| **RI-4** | every `home.peekPositions` key ∈ `peekIds` | dead crop config that looks live; keeps OD-5's two-fields-one-shape argument honest |
| **RI-5** | `photos[].id`, `photos[].order`, `projects[].id` each unique | names the duplicated value and the indices |
| **RI-6** | `categoryOrder` unique **within** its category | per-group, deliberately — a global check would reject the real data, where every category restarts at 1 |

All violations accumulate; nothing throws on first sight. `report.checked` reports `{photos, categories, peekIds, peekPositions, projects, categoryOrderGroups, rulesRun, rulesSkipped}`. A rule whose inputs failed their own schema is listed **by name** in `rulesSkipped` — it did not pass, it was not attempted.

## The Four-Step Proof, Per Gate

### A. The schema module — nine planted defects, each restored and re-verified by `shasum`

| # | Defect planted | Result |
|---|---|---|
| S1 | delete the `tags` declaration, relax `strictObject` → `object` | **3 red** |
| S2 | make RI-1's membership test unconditionally true | **3 red** |
| S3 | rewrite RI-6 as a **global** uniqueness check | **2 red** — it rejects the real data |
| S4 | add a lookalike `/[<>]/` *beside* the imported predicate | **5 red** — real prose `p95 < 50ms` |
| S5 | replace origin equality with `startsWith(IMAGE_ORIGIN)` | **1 red** — look-alike host passes a prefix |
| S6 | relax the manifest to `.min(0)` | **2 red** — this would have been the ninth vacuous gate |
| S7 | single-quoted bare `zod` import in a schema file | **1 red** |
| S8 | single-quoted `node:fs` import in a schema file | **1 red** |
| S9 | single-quoted category `z.enum` in `photo.ts` | **1 red** |

**Step 2 (nothing to check):** `validateContentSet` was fed empty arrays for photos, categories, peek ids, projects and experience, and separately an entirely missing `site` file. Every case **fails**, names what was empty, and reports `checked.photos === 0`. The missing-file case additionally lists `RI-1` (and the rest) in `rulesSkipped` rather than silently not firing.

**Step 3:** all five committed data files parse exactly as they stand; 458/458 suite.

**Step 4 (walk-throughs attempted):** three inputs that would satisfy a lazier implementation while violating its intent are asserted:
- `images.akhilsaxena.com.evil.test` must **fail** → a bare `startsWith` cannot satisfy the URL rule.
- the same `categoryOrder` in two different categories must **pass** → a global uniqueness check cannot satisfy RI-6.
- `p95 < 50ms`, `a < b > c`, `2 <3` must **pass** while `<!-- -->` and `</p>` fail → a restated character class cannot satisfy the HTML rule.

**The harness itself is proven.** `mutated()` deep-clones a real record, applies the change, diffs against the original, and throws unless the single differing JSON pointer is the one the case declared. Four permanent tests assert it refuses a two-field change, a **no-op** mutation, a change at the wrong pointer, and that it sees a key *deletion* as a diff.

### B. The single-definition gate

Clean tree: **exit 0**, `scanned 13 files under src/ (excluding src/schemas/), 4 rules applied`, `self-test: 4/4`. **No false positive** — nothing already in `src/` was excluded to achieve this.

| Control | Expected | Result |
|---|---|---|
| rival `z.object({ category, urls })` in `src/lib/rival.ts` | RED | `✖ src/lib/rival.ts:2: [RIVAL-ZOD-OBJECT] zod object over content fields: category, urls` |
| rival `interface Photo` (run **separately**) | RED | `✖ src/lib/rival.ts:1: [RIVAL-TYPE] interface Photo declared outside src/schemas` |
| `src/schemas` moved aside | RED | `✖ src/schemas: missing` — not a vacuous green |
| rival in `.astro` **frontmatter** | RED | `✖ src/pages/rival.astro:3: [RIVAL-ZOD-OBJECT] … badges, category` |
| rival in a plain `.js` under `src/` | RED | caught (scan list widened beyond the plan's three extensions) |
| `PhotoSchema.partial()` | RED | `[SCHEMA-LOOSENED] PhotoSchema.partial( weakens the schema` |
| guard on a content field + `throw` | RED | `[HAND-ROLLED-VALIDATOR]` |
| guard on a content field + 4xx `Response` | RED | `[HAND-ROLLED-VALIDATOR]` |
| **zero files scanned** (empty tree) | RED | `✖ src: zero files scanned` |
| `index.ts` exporting only 4 of 5 | RED | `✖ src/schemas/index.ts: does not export SiteConfigSchema` |
| **a rule's regex silently broken** | RED | `SELF-TEST FAILED — the gate cannot be trusted` / `RIVAL-TYPE: did NOT flag its own canary` |
| `z.object` with **one** content field | GREEN | the documented two-field threshold |
| guard + bare early `return` | GREEN | the documented narrowing |
| `import type { Photo } from '@/schemas'` | GREEN | correct usage |

**The self-test runs on every invocation.** Each of the four rules carries a canary it must flag and an anti-canary it must ignore; either failing aborts the gate before the scan. That is the direct answer to eight gates in this phase that shipped unable to fail.

## The Single-Definition Gate's Blind Spots

Recorded verbatim in the gate's own header, and **every one was demonstrated by running it, not imagined**:

1. **It cannot see anything outside `src/`.** `scripts/`, `test/` and a future `functions/` are unscanned. *Not hypothetical:* `test/content/photo-enrichment.unit.test.ts:57` declares its own `interface Photo` **today** and the gate is green with it there. A rival planted in `scripts/` was confirmed invisible. Deliberate — a test must be free to describe the shape it migrated, and a migration script must run on a Node runner — but it is exactly how the legacy `src/types.ts` drifted from the admin's local copies.
2. **It knows a fixed vocabulary of names, and only that.** `interface Photo` is caught; `interface Picture { id; category; urls }` was planted and **passed**. Widening `CONTENT_TYPE_NAMES` is cheap and should happen the moment a new content shape is named.
3. **It is a text scanner, not a TypeScript parser.** Confirmed misses: an anonymous inline object type on a parameter (`(p: { id: string; category: string; urls: … })`), and a `satisfies` expression over an object literal. A generator-produced rival does not exist on disk to read. Conversely, a rival written inside a string or comment is a false positive — accepted; the fix is to not write it, never an exclusion list.
4. **It cannot see indirect loosening.** `SCHEMA-LOOSENED` catches `PhotoSchema.partial()` textually, but `const Base = PhotoSchema; Base.partial()` was planted and **passed**. `.extend()` and `.omit()` are deliberately unmatched — they are how 03-07 legitimately derives a collection schema.
5. **It does not match a bare early `return` in rule 3**, only a `throw` or a 4xx `Response`. `if (photo.urls.thumb) return …` in a component is ordinary render control flow; a rule firing on it would be deleted inside a week, at which point it protects nothing.

Additionally unscanned by extension: `.md`, `.json`, `.css` under `src/` (a rival JSON schema was planted and passed).

## Criterion 1 — How Many Consumers Actually Exist

**Two, not three.** The build gate (03-07) and the migration scripts that wrote `data/*.json` are real. The third — the admin's form errors — is Phase 7 and is guarded **structurally**, not demonstrated. The gate makes a rival definition fail; **nothing here proves a future writer will *import* this one.** That is OD-7's accepted weakness and it is stated in `src/schemas/index.ts`, in the gate's header, and here, rather than counted as a third consumer.

## Decisions Made

1. **`focalPoint` is `.optional()` with no zod `.default()`**, against the literal wording of `03-CONTEXT.md` §2 (`optional, default "50% 50%"`). A zod default makes `parse()` return a value the input did not contain. This module is *also* the Phase 7 write boundary, so an admin that parses a record and commits the parse output would materialise `focalPoint` on all 39 records the first time anything is saved. `DEFAULT_FOCAL_POINT` is exported for the renderer instead, and a test pins `JSON.stringify(parse(record)) === JSON.stringify(record)`.
2. **URL-origin equality, not `startsWith`.** They agree on the data as it stands and disagree on a prefix-sharing domain and on a userinfo `@` host, both of which a hand-edit produces.
3. **`tags` spelled out as `z.never().optional()` rather than merely omitted**, so the refusal carries OD-3 rather than a generic "Unrecognized key".
4. **`site.ts` refuses `id === 'all'` at the point of definition** (OD-2), so RI-1 carries no exclusion list at all.
5. **`SCHEMA-LOOSENED` added as a fourth gate rule** beyond the plan's three, converting part of accepted threat `T-03-06-05` into a real check.
6. **The gate scans a wider extension set** than the plan's `.ts/.tsx/.astro` — a rival in plain JS under `src/` would otherwise be invisible for no reason but its extension.

## Deviations from Plan

### 1. [Rule 2 — missing critical functionality] `tags` deletion was unowned

- **Found during:** pre-flight verification. OD-3's option text assigns the deletion to 03-04; 03-04's plan explicitly scoped `tags` out.
- **Fix:** deleted here, in its own commit, with a byte-identical round-trip proof taken before the edit and a `cp` + `shasum` backup.
- **Committed in:** `f5607f6`

### 2. [Rule 1 — bug] Four of the plan's own Task-2 verification predicates cannot fire

Probed each against a planted defect; **none fired**:

| Plan predicate | Why it cannot fire |
|---|---|
| `/from\s+"zod"/` | double-quote-only; `biome.json` enforces `quoteStyle: single` |
| `/^\s*import[^\n]*from\s+"(node:...)"/m` | same |
| `/z\.enum\(\s*\[\s*"abstract"/` | same |
| `/<\s*\[a-zA-Z\]\|\\u003c\|<\/\?\[a-zA-Z\]/` | matches the **literal characters** `[a-zA-Z]` immediately after a `<`, which no real regex literal produces. A planted `/<\/?[a-zA-Z][^>]*>/` does not match. |

- **Fix:** all four are covered properly in `test/content/schemas.unit.test.ts`, quote-agnostic, and controls S7/S8/S9 prove each fires. The HTML case additionally uses a **behavioural** discriminator (real prose containing comparison operators must be accepted) plus a structural detector for *any* regex literal containing an angle bracket in `resume.ts`.
- **Committed in:** `65f4313`

### 3. [Rule 3 — blocking] The plan's Task-3 verify harnesses assume bash in a zsh shell

- **Issue:** every Task-3 `<automated>` block uses `${PIPESTATUS[0]}`, which zsh does not define (it is `$pipestatus[1]`). Run verbatim, the clean-tree control printed `FAIL: gate fires on the clean tree` **for a gate that exited 0** — a correct gate reported as failing. This is the same class as the three `( cmd && R=0 || R=1 )` subshell harnesses already repaired in the plan.
- **Fix:** re-ran every control under `bash -c`. All four then behaved as written.
- **Also:** Control 4's `grep -q 'cannot see'` is case-sensitive and failed against a header that said `WHAT THIS GATE CANNOT SEE` in capitals. A lower-case one-sentence summary was added to the header rather than the header being weakened.

**Total deviations:** 3 auto-fixed (1× Rule 2, 1× Rule 1, 1× Rule 3). No scope creep — each was required to make the plan's own claims true.

## Contradictions Found Between the Plan, the Context Doc, and the Tree

1. **`scripts/check-photo-content.mjs` does not exist.** The plan attributes the three alt-text rules to it. The live copy of those rules is `ROLE_PREFIXES` in `test/content/photo-enrichment.unit.test.ts`, which asserts them about the *migration* rather than about the *shape*. They are now stated in `src/schemas/photo.ts`, which is the authority, with a note in that file recording the misattribution.
2. **"The four committed data files" — there are five.** `data/` holds `portfolio_images.json`, `site_config.json`, `home_config.json`, `projects.json` and `resume.json`. `03-CONTEXT.md` §2 correctly describes five; the plan's `must_haves` and verification say four. All five are validated.
3. **The plan's `interfaces` block says `alt` is required "after 03-04" and `place` exists on 16.** Both confirmed by measurement (39/39 and 16/39, 23 with no key). `focalPoint` and `description` are on **0** records — the schema declares them optional and the suite asserts the 23 place-less records parse.
4. **`autonomous: false` in the plan frontmatter was stale**, cleared in `640db68` before this run. Recorded because the checkpoint was answered from `03-CONTEXT.md`'s bottom table rather than re-asked.

## Issues Encountered

- **One control harness of my own failed silently first time.** The `G12` patch (break a rule's regex, prove the self-test aborts) was written with nested-heredoc escaping and its `assert` raised — so the *unpatched* gate ran and the control printed `** FAILED **` for a gate that was fine. Rewritten as a standalone Python file with an explicit `sys.exit(2)` on non-application; it then passed. Recorded because it is the exact failure the plan warns about: suspect the harness before the code it measures.
- No `git checkout`, `stash`, `reset`, `clean`, `worktree` or `checkout-index` was used at any point. Reviewed data was backed up with `cp` and confirmed with `shasum` before editing; every control restored by `cp` or `rm` and re-verified by hash.

## Next Phase Readiness

- **03-07** can `import { PhotoSchema } from '@/schemas'` into `defineCollection` — it is a real `ZodObject` (Zod 4 keeps object identity through `.superRefine`), from the same `astro/zod` copy, and `z.prettifyError` is available for readable errors.
- **03-08** should chain `gate:schema` alongside `gate:origin` and `gate:routes`; it is deliberately **not** in `build` yet.
- **Phase 5** owes the `{{ds.componentCount}}` resolver. The schema already refuses a literal figure in both spellings.
- **Phase 7**, before adding any content form: widen `CONTENT_TYPE_NAMES` in the gate for every new shape, and import from `src/schemas` rather than declaring — the gate will name a rival, but only one whose name it already knows.

---
*Phase: 03-content-layer-image-origin*
*Completed: 2026-08-26*

## Self-Check: PASSED

All 9 created files exist on disk. All 4 claimed commits resolve in `git log`. No AI
attribution in any commit message or in this summary. Author on all four commits is
`Akhil Saxena <saxena.akhil42@gmail.com>` (repo default, unchanged).
