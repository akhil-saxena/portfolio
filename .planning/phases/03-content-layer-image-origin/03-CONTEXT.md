# Phase 3 — the shape contract, and the seven decisions it cannot make for you

**Status:** written at planning time, 2026-08-25. Every number in it was read out of the
working tree this session, not carried from a document.

This file does two jobs.

1. **The shape contract** (§2) — the exact JSON each `data/*.json` file must hold when the
   phase ends. Plans 03-01…03-05 migrate the data *to* this contract; plan 03-06 encodes it
   in zod. Without a written contract in one place, the schema module ends up
   reverse-engineered from whatever the migrations happened to produce, which is the same
   two-sources-of-truth failure the phase exists to close.
2. **The open decisions** (§3) — seven questions the source artefacts either answer
   *twice, differently*, or do not answer at all. Each one changes data Akhil has already
   reviewed. **None is guessed here.** Each is a `checkpoint:decision` at the head of the plan
   that needs it, with a recommendation and the evidence behind it.

---

## 1. What the roadmap did not know

The roadmap's four success criteria predate ADR-002, the 00-11 review and the résumé edit of
2026-08-24. Six of its premises are measurably wrong or incomplete as written. Recorded here
once so no plan re-derives them.

| # | Roadmap / source premise | Measured, this session |
|---|---|---|
| 1 | "four `pub-*.r2.dev` URLs per photo" (prompt) | **156** URLs across 39 records — 4 remote variants each. `02-DNS-R2-PREREQS.md` already states this correctly; the fifth `urls` key, `thumb`, is a base64 LQIP data URI with no hostname. |
| 2 | "all **18** bullets across three roles use only `<strong>`" (ADR-001 §66, ADR-002 §2, 00-ADMIN-IA §2) | **13** bullets — Brevo 6, PharmEasy 3, MAQ 4 — carrying **17** `<strong>` runs. `24afda2 content(resume): cut Brevo to the six bullets carrying a figure` cut Brevo from 11 to 6 *after* all three documents were written. **12 of 13** bullets contain markup; `pharmeasy#2` contains none. The "only `<strong>`" claim itself is confirmed true: a tag census over the whole file returns `{strong: 34}` and nothing else. |
| 3 | Success criterion 1 — the schema is consumed by "the build, the **write path** and the admin's form errors" | **No write path exists in Phase 3.** The admin and its `publishContent` action are Phase 7. Two of the three consumers are real in this phase; the third is enforced *structurally* (03-06's single-definition gate) so that Phase 7 cannot add a second definition. Stated as a limit, not papered over. |
| 4 | Success criterion 4 — "No `pub-*.r2.dev` URL remains anywhere **in the repository**" | Literal compliance would require editing `02-DNS-R2-PREREQS.md`, whose entire content is a before/after measurement of that hostname, and `CLAUDE.md`'s legacy section. Rewriting evidence to satisfy a grep is the failure 01-23 named. → **Open decision OD-1.** |
| 5 | 00-ADMIN-IA §6 — `tags` is "revived, optional" | `PROJECT.md:91` says the field is **"Dropped."** and `research/ARCHITECTURE.md:481` bakes the drop into the reference schema with the comment *"Absence here is the enforcement."* Two live documents, opposite instructions. → **Open decision OD-3.** |
| 6 | 00-HUMAN-CHECKLIST §158 — the component count is "now derived at build time" | It is not, and it is stale for the **third** time. `data/resume.json`'s `design-system` project reads **"79-component React library"**. `../design-system/README.md:5` now says **81**, and `find src -mindepth 2 -maxdepth 2 -type d` returns **83**. Three numbers again. → **Open decision OD-6.** |

Two further things the roadmap does not mention at all, both found by probing the data:

- **`home_config.json` carries referential integrity nobody named.** All six `peekIds` are photo
  ids, and every `peekPositions` key is one of those six. Both hold today. Neither is asserted
  anywhere, and `/admin/home` (Phase 7) edits both — so a peek id pointing at a deleted photo is a
  silent blank tile. 03-06 asserts both alongside the `site_config` rule ADR-002 assigned to this
  phase.
- **`exif` is present on all 39 records with nullable fields, not optional.** `product-peppers`
  has all six fields `null`; `architecture-redbuilding` has five of six null; `lens` is null on 11.
  A schema declaring `exif` optional-but-complete would reject 11 real records.

---

## 2. The shape contract

Target state of `data/` at the end of Phase 3. Cited to the decision that produced each line.

### `data/portfolio_images.json` — array of 39, `id` unique

```
id            string, /^[a-z0-9-]+$/                       unchanged
title         string, min 1                                unchanged
category      string, must resolve in site_config          unchanged (lowercase)
date          string, /^\d{4}-\d{2}-\d{2}$/                unchanged
exif          object, all six fields string|number|null    unchanged — nullable, NOT optional
dimensions    { width:int, height:int }                    unchanged
urls.original|large|medium|small   string, must start with the canonical image origin   ← 03-01
urls.thumb    string, startsWith "data:image/webp;base64," unchanged
order         int, unique across all 39                    unchanged (global order)
alt           string, min 1, REQUIRED                      ← 03-04, from 00-PHOTO-CONTENT.md (39/39)
place         string, optional                             ← 03-04 (16/39 filled)
description   string, optional                             ← 00-ADMIN-IA §6; 0/39 filled, field absent
focalPoint    string, optional, default "50% 50%"          ← 00-ADMIN-IA §6 / D-23; 0/39 filled
categoryOrder int, unique within its category              ← D-22, backfilled in 03-04
tags          string[]                                     ← OPEN, OD-3
```

### `data/resume.json` — object; loses `projects`

```
experience[]  id, company, role, location, logo, url, bullets[]
              bullets are BOLD-ONLY INLINE MARKDOWN — "Reduced **p95 latency** by 40%"   ← 03-02
              period → structured date fields                                             ← OPEN, OD-4
skills[]      category, icon, items[]                       unchanged
education[]   id, school, logo, degree, cgpa, url, leadership[]
              period → same treatment as experience                                       ← OPEN, OD-4
projects      REMOVED                                                                     ← D-24, 03-05
```

### `data/projects.json` — NEW, array of 5, `id` unique  ← D-24, 03-05

```
id, title, label{text,icon}, description, tech[], icon, href, badges[{label,href,icon}]
```
Five records move **verbatim**, with one exception: the `design-system` description's hardcoded
component figure. → **OD-6.**

### `data/site_config.json` — `categoryColumns` map → category records  ← D-25, 03-03

```
categories[]  { id: lowercase, label: display, columns: int }
```
The migration is lossless and mechanical: `label === id[0].toUpperCase() + id.slice(1)` holds for
all seven real categories today, verified. The eighth key, `"All"`, is not a category. → **OD-2.**

### `data/home_config.json` — unchanged shape, newly asserted

`title, subtitle, intro, peekIds[6], peekPositions{}, socialLinks[3], ctas[2]`. No migration.
03-06 adds the two cross-file assertions described in §1.

---

## 3. Open decisions — AWAITING AKHIL

Each is a blocking `checkpoint:decision` at the head of the plan named. A plan may not proceed
past it on an executor's judgement, because every one of these changes reviewed data.

---

### OD-1 · What "anywhere in the repository" means for the `r2.dev` gate
**Blocks:** 03-01 Task 3 · **Type:** scope of a gate

Success criterion 4 says no `pub-*.r2.dev` URL remains anywhere in the repo. Twenty-three files
contain the string. Twenty are `.planning/` documents and `CLAUDE.md` — and one of them,
`02-DNS-R2-PREREQS.md`, is an evidence file whose *entire content* is the measured before/after
contrast between that hostname and `images.akhilsaxena.com`. Editing it would delete the proof
that the migration was worth doing.

- **Option A (recommended)** — the gate scopes to the **shipped artefact set**: `data/`, `src/`,
  `public/`, `scripts/`, `astro.config.mjs`, `wrangler.jsonc`, `*.example`, and `dist/` after a
  build. `.planning/**` and `CLAUDE.md`'s legacy section are excluded **by name, in the gate
  source, with the reason written beside them** — the 01-23 precedent: a document recording what
  was true on a date is falsified by a blanket replace.
- **Option B** — literal repo-wide, and the evidence files are rewritten.

**Recommendation: A.** It is the only reading under which the criterion means "no live consumer
can reach the uncached origin," which is what it is for.

---

### OD-2 · Is `"All"` a category record, or a filter affordance?
**Blocks:** 03-03 Task 1 · **Type:** data shape, changes reviewed data

`site_config.categoryColumns` has eight keys; only seven are real categories. `"All": 3` is the
column count for the unfiltered gallery. If it becomes a record with `id: "all"`, then 03-06's
referential-integrity rule — the rule ADR-002 §4 made this phase's whole justification for
deleting `/admin/site` — would accept `photo.category === "all"` as valid. That defeats it.

- **Option A (recommended)** — `categories[]` holds the **seven** real records; the unfiltered
  column count moves to a sibling scalar, `defaultColumns: 3`. The RI rule then has exactly seven
  legal values.
- **Option B** — eight records, and the RI rule carries a hardcoded `"all"` exclusion.

**Recommendation: A.** An exclusion list inside a referential-integrity check is a second source
of truth about what a category is.

**Second question, same plan:** the current key order is `All, Abstract, Architecture, Nature,
Portraits, Street, Wildlife, Product` — alphabetical except `Product`, which is last. Object key
order is incidental; array order is a decision. **Is that the intended filter-row order, or should
it be alphabetical, or by photo count (architecture 14 → product 2)?**

---

### OD-3 · `tags` — dropped, or revived?
**Blocks:** 03-06 Task 1 · **Type:** schema shape

`PROJECT.md:91` — *"Photo `tags` field — present in the schema, unused by all 39 photos.
**Dropped.**"* `research/ARCHITECTURE.md:481` implements the drop and comments *"Absence here is
the enforcement."* `00-ADMIN-IA.md` §6 lists `tags` as **"Revived. Empty on all 39 today."**
Both are live documents. The field is `[]` on all 39 records right now.

- **Option A** — dropped. The schema omits `tags`; 03-04 deletes the empty array from all 39
  records. A future tag needs a deliberate schema change.
- **Option B** — revived as `string[]` optional, and `/admin/photos` grows a tags control in
  Phase 7.

**No recommendation.** This is a product question about whether the gallery ever filters by
anything other than category, and nothing in the artefacts answers it.

---

### OD-4 · The résumé date-shape drift — migrate now, or leave `period`?
**Blocks:** 03-05 Task 2 · **Type:** data shape, changes reviewed data

00-ADMIN-IA §5 resolves this in writing: the structured fields win
(`startMonth, startYear, endMonth, endYear, isPresent`), `period` stops being stored and is
derived by a single formatter. The reasoning is sound — `period` is a lossy encoding that leaves
*"is this role current?"* unmodelled. The formatter's acceptance test is exact reproduction of
the four strings on disk: `Jul 2023 – Present`, `Nov 2022 – Jun 2023`, `Dec 2021 – Nov 2022`,
`Jul 2018 – Jun 2022` — three-letter month, **U+2013 en dash with spaces**.

What is *not* resolved is **when**. Doing it in Phase 3 changes four reviewed records for the
benefit of a screen that does not exist until Phase 7. Deferring it means 03-06 ships a schema
declaring `period: string` that Phase 7 must then change — which is precisely the drift this
phase exists to prevent, in slow motion.

- **Option A (recommended)** — migrate now. The schema declares the structured fields; `period`
  is deleted from disk; `src/lib/period.ts` derives it, with a test asserting all four strings
  reproduce byte-for-byte including the en dash.
- **Option B** — defer to Phase 7 and declare `period: string` now, accepting one known schema
  change later.

**Recommendation: A**, because the cost is four records and one formatter today versus a schema
migration plus an admin change together later.

**Sub-question if A:** education carries `period` too (`Jul 2018 – Jun 2022`) and 00-ADMIN-IA says
it gets the same treatment. Confirm — it is one more record, but it is a record you reviewed.

---

### OD-5 · Does `focalPoint` supersede `home_config.peekPositions`?
**Blocks:** 03-04 Task 3 · **Type:** data shape

00-ADMIN-IA §6 adds `photo.focalPoint`, *"same `"50% 25%"` shape Home's peek positions already
use."* `home_config.peekPositions` currently holds exactly one entry, for
`architecture-hawamahaldaytime`. Two fields, one shape, one fact — which is the exact pattern
D-25 and OD-4 both exist to kill.

- **Option A (recommended)** — they are **different facts** and both survive: `focalPoint` is the
  photo's own crop anywhere it is cropped; `peekPositions` is a Home-specific override for the
  3:2 peek frame. The one existing value stays in `home_config.json` untouched, and 03-06 asserts
  `peekPositions` keys ⊆ `peekIds`.
- **Option B** — `peekPositions` folds into `photo.focalPoint` and `home_config` loses the key.

**Recommendation: A**, but flagged rather than assumed: it is the one place in this phase where
I am arguing *for* two fields of the same shape, and the burden is on that argument.

---

### OD-6 · How the design-system component count stops going stale
**Blocks:** 03-05 Task 3 · **Type:** derivation, and a cross-phase dependency

`data/resume.json`'s `design-system` project description reads **"79-component React library
with semantic tokens, dark mode, and live Storybook docs."** Measured against the sibling repo
this session: `README.md:5` says **81**, and `find src -mindepth 2 -maxdepth 2 -type d` returns
**83**. The figure has now been wrong three times (80 → 79 → 81), and `db65b12 fix(data): repair a
dead CTA route and the stale component count` already fixed it once by hand.

The 00-11 review decided it is **derived at build time**. The obstacle is concrete:
`@akhil-saxena/design-system` **is not a dependency of this repo yet** — `package.json` has no
such entry, and Phase 1's v2.0.0 is unpublished. So Phase 3 cannot resolve the number.

- **Option A (recommended)** — 03-05 stores the description with a placeholder token
  (`{{ds.componentCount}}`), 03-06's schema **rejects** any project description containing a
  literal `\d+-component`, and Phase 5 — which installs the tarball — supplies the resolver. The
  gate is provable today: put `79-component` back, the gate fails.
- **Option B** — hardcode **81** now and accept a fourth staleness.
- **Option C** — reword the copy so no figure appears, and the problem stops existing.

**Recommendation: A**, with **C as a live alternative worth ten seconds of thought** — "a React
component library where one token change lands across every screen at once" carries the argument
without the number, and `00-COPY/one-liners.md` already contains that sentence.

**Note for whoever executes:** the *source* of the derived figure is itself contested. The
catalog (`OverviewPage.tsx`) is the authority per 01-12's ruling; `README.md` is explicitly
retired as an authority for the figure; the directory count is neither. Whatever Phase 5 reads,
it must read the catalog.

---

### OD-7 · Is the CONT-01 third consumer acceptable as a structural assertion?
**Blocks:** 03-06 Task 3 · **Type:** scope of a criterion

See §1 row 3. Phase 3 has two live consumers of the schema module — the build, and the migration
scripts that write `data/*.json`. The admin's form errors are Phase 7 and cost nothing when they
arrive (Astro Actions surface zod input errors for free), but they cannot be *demonstrated* now.

- **Option A (recommended)** — the criterion is met by the single-definition gate: no second
  definition of a content shape may exist anywhere under `src/`, proven by planting one. Phase 7
  therefore has no way to add a parallel validator without going red. The gate's blind spot is
  recorded in the plan.
- **Option B** — Phase 3 ships a `validateContent` Astro Action purely to have a third importer.

**Recommendation: A.** B is a route written to satisfy a checklist, and it would be the only
`prerender = false` surface in the repo that nothing calls.

---

## Open decisions — RESOLVED 2026-08-25

All seven answered by Akhil. Two were taken on the planner's recommendation because they are
mechanical; five are his.

| ID | Decision | Rationale |
|---|---|---|
| **OD-1** | **Scoped gate.** The `r2.dev` ban covers shipped artefacts, not the repository, with exclusions named in the gate source. | *Taken on recommendation.* A literal reading rewrites `02-DNS-R2-PREREQS.md`, whose entire content is the before/after `cf-cache-status` measurement — destroying the evidence that the migration worked. Identical in shape to the 01-23 rename, where historical records were deliberately left saying what was true when written. |
| **OD-2** | **Seven category records; `All` is not one.** A separate `defaultColumns` covers it, and `All` is a rendered affordance rather than a data record. | Admitting `all` as an id would force the ADR-002 referential-integrity rule to special-case exactly one value — and a special case inside the rule that exists to prevent silent orphaning is where the next silent orphan comes from. |
| **OD-3** | **`tags` is dropped.** The schema forbids the field, so a stray tag fails the build rather than sitting unread. | Seven categories already organise 39 photographs and the gallery filters by category. A second taxonomy with nothing rendering it is metadata that rots. Settles a contradiction three documents held simultaneously: `PROJECT.md:91` "Dropped", `research/ARCHITECTURE.md:481` implementing the drop, `00-ADMIN-IA` §6 "Revived". |
| **OD-4** | **Migrate the résumé dates now**, experience and education together. | Four records and one formatter while the data is small and freshly reviewed. Deferring means changing the schema and the admin form together in Phase 7 — the harder change, in the phase with the most moving parts. Migrating only experience would leave two date shapes in one file, which is how the original drift started. |
| **OD-5** | **Keep both `photo.focalPoint` and `home_config.peekPositions`.** | They answer different questions: `focalPoint` is the photograph's own default wherever it is cropped; `peekPositions` is the Home hero's specific crop. Flagged by the planner as the one place in the phase arguing for two fields of one shape, and accepted knowingly — collapsing them would bind the focal-point picker to a single surface rather than to the photograph. |
| **OD-6** | **Placeholder token**, `{{ds.componentCount}}`, resolved in Phase 5, with the build failing on an unresolved token. | The figure has gone stale **three times in nine days** — 80 → 79 → 81, with the `src` directory now at 83. The 00-11 verdict was "derive it at build time"; the planner measured that as unimplementable here, because `@akhil-saxena/design-system` is not a dependency of this repo and v2.0.0 is unpublished. The token keeps that intent alive for when it is, and makes the unresolved case loud rather than silent. |
| **OD-7** | **Structural gate** for criterion 1's third consumer. | *Taken on recommendation.* The write path is Phase 7 and does not exist yet, so Phase 3 has two live consumers. A `validateContent` action nobody calls would be a route written to satisfy a checklist. The gate asserts the schema has one definition and that every consumer imports it, which is the property the criterion is actually after. |

**Phase 3 is unblocked.** Every `checkpoint:decision` at the head of a plan can be answered from this
table.
