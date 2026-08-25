---
phase: 03-content-layer-image-origin
plan: 03
subsystem: content layer / category records
tags: [migration, data-shape, referential-integrity, losslessness-proof, D-25, OD-2]
requires: []
provides:
  - "`site_config.categories[]` as seven canonical `{id, label, columns}` records"
  - "`site_config.defaultColumns` as the unfiltered gallery's column count"
  - "the seven-value id set 03-06's referential-integrity rule checks against, with no exclusion list"
  - "a losslessness proof that is red on a lost column count, a case drift, and a missing evidence revision"
affects:
  - "data/site_config.json (shape replaced)"
  - "03-06 (the RI rule now has a seven-value id set to check against)"
  - "Phase 5 (the gallery reads two keys, not one map)"
tech-stack:
  added: []
  patterns:
    - "evidence revision found by searching the file's own git log, not HEAD~1 — wave-safe"
    - "negative-control iteration driven by the OLD key set, so deleting a record cannot delete the assertion that catches it"
    - "label compared as a VERBATIM legacy key rather than re-derived from the id"
key-files:
  created:
    - "scripts/migrate-site-config.mjs"
    - "test/content/site-config-migration.unit.test.ts"
  modified:
    - "data/site_config.json"
decisions:
  - "OD-2 Option A, as decided by Akhil: seven records, `\"All\"` becomes the sibling scalar `defaultColumns: 3`, no `\"all\"` id, no exclusion list in the RI rule"
  - "OD-2b alphabetical by id, as decided by Akhil; the rule is written beside the sort in the migration script because array order is now a decision and the next reader must not re-sort it thinking it was accidental"
  - "The plan's `git show HEAD~1:data/site_config.json` evidence lookup was REPLACED with a search of the file's own log. HEAD~1 is a time bomb in a concurrent wave — see §6. This is the plan's one real defect."
  - "`parseLegacyMap` is not exported: Biome's lint/suspicious/noExportsInTest is right that nothing outside the file consumes it, and the guard tests live in the same file"
metrics:
  duration: "~20m"
  completed: "2026-08-25"
  commits: 2
  gates: "45 unit tests green on the real migration; 8 planted defects each red; full unit project 169/169; astro check 0 errors; biome clean"
---

# Phase 3 Plan 03: Canonical Category Records Summary

`site_config` no longer stores a Title-cased string map that disagrees with the lowercase category
every photo actually holds. It stores seven records with the join key and the display string as
**different fields**, so the render-time transform that used to reconcile them has nowhere left to
live. The drift is not fixed — it is deleted.

Portfolio `main` `2060cf9` → **`af0704a`** (migration) → **this summary**.

| commit | what |
|---|---|
| `af0704a` | `content(site): make categories canonical records with separate id and label` — 3 files, +427/−11 |

Task 1 (the OD-2 checkpoint) required no commit: Akhil resolved both halves in review before
execution began, recorded at the head of `03-CONTEXT.md` §3. Nothing was re-asked and nothing was
decided by me.

---

## 1. The verdict, and the reason it is not tidiness

**OD-2 — Option A.** `categories[]` holds the **seven** real records. The unfiltered column count
becomes a sibling scalar `defaultColumns: 3`. `"all"` is not a category record.

The reasoning worth preserving, because it is the whole justification for the shape: an exclusion
list inside a referential-integrity check is a **second source of truth about what a category is**,
living inside the check that exists to have exactly one. ADR-002 §4 made this RI rule the entire
justification for deleting `/admin/site`, so if `photo.category === "all"` could validate, the rule
would be defeated and the trade would have bought nothing. Keeping `"all"` out of `categories[]` is
what makes the rule mean something. The id set is now exactly the set of values a photo may legally
hold: seven, no special cases.

**OD-2b — Alphabetical by `id`.** `abstract, architecture, nature, portraits, product, street,
wildlife`.

The previous key order was `All, Abstract, Architecture, Nature, Portraits, Street, Wildlife,
Product` — alphabetical except `Product`, which trailed with no recorded reason. Object key order is
incidental; **array order is a decision**, because it becomes the filter row's order and it is
committed. Alphabetical was chosen because it is **self-maintaining** when a category is added (the
rule picks the slot, nobody does) and **scannable by name** at the size this list will ever be.
`product` stops being an unexplained anomaly.

JSON cannot hold a comment, so the rule is written beside the `.sort()` in
`scripts/migrate-site-config.mjs`, ending `Do NOT re-sort this thinking the order was accidental —
it is a decision.`

---

## 2. Before and after, in full

**Before** (176 bytes, `f4ec6c8`):

```json
{
  "categoryColumns": {
    "All": 3,
    "Abstract": 3,
    "Architecture": 3,
    "Nature": 2,
    "Portraits": 2,
    "Street": 2,
    "Wildlife": 2,
    "Product": 2
  }
}
```

**After** (`af0704a`):

```json
{
  "categories": [
    { "id": "abstract",     "label": "Abstract",     "columns": 3 },
    { "id": "architecture", "label": "Architecture", "columns": 3 },
    { "id": "nature",       "label": "Nature",       "columns": 2 },
    { "id": "portraits",    "label": "Portraits",    "columns": 2 },
    { "id": "product",      "label": "Product",      "columns": 2 },
    { "id": "street",       "label": "Street",       "columns": 2 },
    { "id": "wildlife",     "label": "Wildlife",     "columns": 2 }
  ],
  "defaultColumns": 3
}
```

(Shown one-record-per-line for reading; the committed file is `JSON.stringify(data, null, 2)` plus a
trailing newline, so each record spans five lines. `data/` is Biome-excluded — `biome.json` →
`"!data"` — so that serialisation is the final formatting.)

`label` is the retired key **verbatim**, never re-derived as `Title(id)`. It happens to equal
`Title(id)` for all seven today, and that is fine: the point of D-25 is not that the label differs
*now*, it is that it *can*, without the id moving — 00-ADMIN-IA §4's *"renaming a label must not
touch `id` (otherwise 14 photos lose their category)"*.

---

## 3. Re-derivation before touching reviewed data

Every premise in the plan was re-measured out of the working tree first. All held, so nothing
stopped:

| premise | measured |
|---|---|
| 8 keys in `categoryColumns` | 8 ✓ |
| 7 distinct photo categories, all lowercase | 7, zero non-lowercase ✓ |
| every photo category present in the map when Title-cased | 7/7 ✓ |
| `"All"` the only key with no photo | ✓ |
| `label === Title(id)` for all seven | 7/7 ✓ |
| nothing consumes the file yet | `grep -rn categoryColumns` over `src/ scripts/ test/ public/` → nothing ✓ |

`data/site_config.json` was backed up with `cp` and confirmed by `shasum -a 256` before the
migration wrote to it (`53e2dbf9…`), and the backup was re-hashed afterwards to prove the evidence
copy was not touched. Every planted-defect run below restores from a `cp` backup and re-verifies the
post-restore hash equals `9e9fbc22b05064d52a2149f3ff3693d33d61f112f1a3c3cabde6a40a727ad853`; all
restores verified.

---

## 4. The four-step proof

The gate is `test/content/site-config-migration.unit.test.ts`, 45 assertions. Each step below was
run, not reasoned about.

### Step 1 — plant a lost column count → **FAILS BY NAME** ✓

| plant | result | named |
|---|---|---|
| `architecture.columns` 3 → 2 | exit 1, `1 failed \| 44 passed` | `legacy key "Architecture" is accounted for > carries its column count across unchanged` — `expected 2 to be 3` |
| `portraits.columns` key deleted | exit 1, `2 failed \| 43 passed` | `expected undefined to be 2`; `expected [ 'id', 'label' ] to deeply equal [ 'columns', 'id', 'label' ]` |

The failing test's full path names the category, which is the property that matters: the suite title
is `legacy key "Architecture" is accounted for`.

### Step 2 — point at an empty or missing previous revision → **FAILS, does not pass vacuously** ✓

This is the mode that has bitten the project six times, so it was attacked three ways:

| plant | result |
|---|---|
| **2a** ref list emptied — no previous revision at all | exit **1**. `Test Files 1 failed`, `Tests no tests`. `Error: No revision of data/site_config.json containing a usable 'categoryColumns' map was found. The losslessness proof has nothing to compare against and MUST NOT pass vacuously — searched 0 revision(s).` |
| **2b** ref pointed at a commit predating the file | exit **1**, same error, `searched 2 revision(s)` — `git show` throws per candidate, the loop exhausts, the guard fires |
| **2c** the guard itself removed (naive impl returns `{}` instead of throwing) | exit **1**, but the informative number is the **test count: 45 → 23**. Twenty-two assertions silently vanished — that is the vacuous pass in the act of happening. |

Step 2c is the most useful result in this summary. It shows the throw-guard is genuinely
load-bearing (removing it deletes 22 assertions), **and** that a second, independent layer still
catches it: `the evidence this proof rests on > resolves a previous revision that actually holds the
retired map` asserts `expect(legacyKeys).toHaveLength(8)` — a hard number, not `> 0`, so a truncated
evidence revision fails rather than shrinking the proof — and `every record traces back to a legacy
key` fails too. Two independent things must be defeated, not one.

Eight further vacuous inputs are closed **permanently in the file** rather than only in this
session, under `describe('the comparison cannot pass vacuously')`: empty string, whitespace-only,
`null`, non-JSON, no `categoryColumns` key, empty map, map-as-array, and a non-integer column count.
Each must return `null`, and a `null` from every candidate revision throws.

### Step 3 — passes on the real migration ✓

`45 passed (45)`, exit 0. Full `unit` project alongside 03-02's suite: `169 passed (169)`.
`astro check`: **0 errors** (34 files; the two `ts(6385)` warnings are pre-existing in
`test/harness/runtime.workerd.test.ts` and out of scope). Biome clean on both new code files.

### Step 4 — the walk-through: can a label or id silently change case? → **NO** ✓

This was the attack most likely to succeed, because the obvious way to write this test —
"expect `label` to equal `Title(id)`" — would pass every case-drift variant. That formulation is
explicitly refused in the file's header comment.

| walk-through attempt | result |
|---|---|
| `label` silently lowercases: `"Architecture"` → `"architecture"` | exit 1, **4 failed**. `maps to exactly one record, matched on the VERBATIM legacy key as its label` — `expected [] to have a length of 1`. `architecture` is not a key of the retired map, so the record matches nothing. |
| `id` silently Title-cases: `"architecture"` → `"Architecture"` | exit 1, **4 failed**, including `every photo category resolves to an id — no case transform between the two files` (`expected [ …(14) ] to deeply equal []` — all 14 architecture photos orphan at once) and `id "Architecture" is referenced by at least one photo` |

The walk-through is closed because `label` is checked as a **verbatim key of the old map**, not
derived from `id`, and `id` is checked as `key.toLowerCase()` against `/^[a-z0-9-]+$/` **and**
against the 39 photos. The plan's third truth — ids are lowercase on both sides with no case
transform between them — is asserted from both directions.

### The plan's own two negative controls, also run

| control | result |
|---|---|
| transpose `architecture` ↔ `portraits` column counts | exit 1, `2 failed`: `expected 2 to be 3` and `expected 3 to be 2`. Record shape stays valid and the id set stays correct; only the losslessness comparison can see it. |
| delete the category 14 photos use | exit 1, **6 failed**, named `architecture`, including `holds exactly 7 category records` and the RI direction |

The delete control is why iteration is driven by the **old key set** rather than the new records. Had
`describe.each` iterated `config.categories`, deleting `architecture` would have deleted its own test
case along with it — the deletion would remove the assertion meant to catch it, and the run would go
green with 44 tests. Driving from the eight legacy keys makes a missing record fail *in the suite
named after it*.

---

## 5. Per-category photo counts, as of migration — the dated baseline

Measured against `data/portfolio_images.json` on **2026-08-25** (read-only; 03-01 and 03-02 own that
file and it was not written).

| id | label | columns | photos |
|---|---|---:|---:|
| abstract | Abstract | 3 | 4 |
| architecture | Architecture | 3 | **14** |
| nature | Nature | 2 | 8 |
| portraits | Portraits | 2 | 2 |
| product | Product | 2 | **2** |
| street | Street | 2 | 4 |
| wildlife | Wildlife | 2 | 5 |
| — | *(unfiltered)* | `defaultColumns` 3 | 39 |

**Sum 39 / 39 photos in file.** Context §3's two spot-checks both confirmed: architecture **14**,
product **2**.

Referential integrity, both directions, as of migration:

- photos whose `category` does **not** resolve to an id: **0**
- ids with **zero** photos: **0**
- photo categories with no matching id: **0**

Nothing to report to 03-01 — there is no orphaned photo to leave alone.

---

## 6. Deviations — one real defect in the plan

### 6.1 `HEAD~1` as the evidence revision is a time bomb in a concurrent wave (Rule 1)

**The plan said:** compare against *"the previous committed revision (`git show
HEAD~1:data/site_config.json`, falling back to `HEAD`)"*.

**Why that is wrong here:** 03-01 and 03-02 commit to the same branch in the same wave. `HEAD~1`
means "the commit before whatever landed last", not "the commit before this migration". 03-02 landed
between this plan's start and its commit — observed directly in `git status`, whose in-flight
`src/lib/bullets.ts` and untracked `vitest.unit.config.ts` were committed mid-execution.

The failure is worse than flaky, because it is **green today and vacuous tomorrow**. Once any commit
lands after `af0704a`, `HEAD~1:data/site_config.json` resolves to the **already-migrated** file,
which has no `categoryColumns` — so the reconstruction would compare the new shape against itself,
and the plan's `falling back to HEAD` fallback resolves to the new shape too. Under the plan's
wording the test would have iterated zero legacy keys and passed. That is precisely the vacuous mode
Step 2 exists to close, written into the plan's own instructions.

**What was built instead:** `findLegacyRevision()` walks the file's own history newest-first
(`git log --format=%H -- data/site_config.json`) and returns the most recent revision that still
holds a **usable** map, with the reason written above it. It is stable regardless of what else
commits, and it throws — never returns empty — when no such revision exists.

**Proven, not asserted.** After `af0704a` the file's log is `af0704a, f4ec6c8, e31d963`. The
resolver skips `af0704a` (its own migration, no `categoryColumns`) and reports the ref in a test
name: `resolves a previous revision that actually holds the retired map (f4ec6c8)`. Verified green
post-commit.

**And the time bomb was detonated, not predicted.** Measured one commit later, with `ff5c462` (this
summary) at `HEAD`:

```
HEAD~1 is now: af0704a content(site): make categories canonical records ...
HEAD~1 -> categoryColumns present: false  => comparison iterates 0 keys => VACUOUS PASS
HEAD   -> categoryColumns present: false  => comparison iterates 0 keys => VACUOUS PASS
```

Both the plan's primary lookup and its stated fallback return the **migrated** shape. Had the gate
been written as the plan specified, it would have gone green from this commit onward while comparing
the new records against nothing at all — and it would have done so on the very next commit, not in
some distant future. At the same moment the shipped resolver still reports
`resolves a previous revision that actually holds the retired map (f4ec6c8)`, `45 passed`.

### 6.2 Biome forbids the exported helper (Rule 3)

`export function parseLegacyMap` tripped `lint/suspicious/noExportsInTest`, which would fail
`npm run check`. The rule is right — nothing outside the file consumes it and the guard tests are in
the same file — so the `export` was dropped and the doc comment reworded. Both new code files are
Biome-clean. The controls were re-run **after** this edit (lost column count, label lowercased) and
still fail identically.

### 6.3 The plan's idempotency check only works after the commit (minor)

`node scripts/migrate-site-config.mjs && git diff --quiet data/site_config.json` cannot pass before
the migration is committed — the file is legitimately modified against `HEAD` at that point.
Idempotency was proven **pre-commit** by `shasum -a 256` before and after a second run (identical:
`9e9fbc22…`, script reporting `OK 0 changes — 7 records already canonical`) and again **post-commit**
in the plan's own form, which then passed: `OK re-run is a no-op`.

### 6.4 `test/content/` did not exist (expected)

Created by this plan. `vitest.unit.config.ts`'s `test/**/*.unit.test.ts` glob picks it up with no
config change, so nothing outside this plan's three files was touched — 03-02's in-flight
`src/lib/bullets.ts` and the vitest configs were deliberately left unstaged.

---

## 7. What these checks cannot see

Carried forward from the plan verbatim, because it stays true and Phase 5 inherits it:

- **Nothing proves any renderer honours `columns`.** Nothing reads this file until Phase 5's gallery.
  A column count of `3` is currently a number in a file and nothing more.
- **Nothing proves `label` is ever displayed.** That link is Phase 5's to make and Phase 5's to gate.
  What *is* proven now is that when Phase 5 renders it, no transform sits between `label` and `id`
  that could disagree with either.
- **The RI rule itself is 03-06's**, not this plan's. What landed here is the id set it will check
  against — seven values, no exclusion list — and the proof that the set is complete and that every
  photo already resolves against it.

`CLAUDE.md`'s "Repository Orientation" claim that the repo is pre-code with no `src/` is **stale** —
Phase 2 shipped; `src/`, `package.json`, `test/` and 34 typechecked files all exist. Confirmed by
`ls`, not assumed.

---

## Self-Check: PASSED

- `data/site_config.json` — FOUND, 7 records + `defaultColumns`
- `scripts/migrate-site-config.mjs` — FOUND
- `test/content/site-config-migration.unit.test.ts` — FOUND, 45 tests green
- commit `af0704a` — FOUND in `git log`, authored `Akhil Saxena <saxena.akhil42@gmail.com>`
- no AI attribution in the commit message or in any of the three files (grepped for
  `claude|co-authored|generated with|anthropic`) — CLEAN
