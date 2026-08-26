---
phase: 03-content-layer-image-origin
plan: 04
subsystem: content layer / photo enrichment
tags: [migration, alt-text, accessibility, byte-identity, D-22, OD-5, CONT-01]
requires:
  - "03-01 (the manifest's 156 URLs already moved to images.akhilsaxena.com; this plan touches no url)"
provides:
  - "`alt` on 39 of 39 photo records, byte-identical to the brief Akhil reviewed on 2026-08-23"
  - "`place` on 16 records, and NO `place` key at all on the other 23"
  - "`categoryOrder` on 39 of 39 records — the D-22 per-category rank, dense 1…n inside each category"
  - "the field NAME `categoryOrder`, which 03-06's schema, Phase 5's gallery and Phase 7's /admin/photos must all use"
  - "the OD-5 verdict, pinned as an assertion rather than only recorded in prose"
  - "a merge proven to read the brief, and to refuse a pending marker by name"
affects:
  - "data/portfolio_images.json (three fields added; nothing else changed — 0 deletions of content)"
  - "03-06 (PhotoSchema can now require `alt` without failing the build; adds `focalPoint` optional with the default declared in the schema)"
  - "Phase 5 (the gallery builds against the final shape; it must assert `alt` on rendered HTML, which nothing here can)"
  - "Phase 7 (/admin/photos reorders inside a filter and will deliberately retire one assertion in this file, by name)"
tech-stack:
  added: []
  patterns:
    - "row set derived from the manifest, never from the table being read — a photo the table forgot is named, not skipped"
    - "markers mean ABSENT and absent means the KEY DOES NOT EXIST — asserted with `'place' in record`, which a falsy check cannot distinguish"
    - "the proof re-parses the source with an INDEPENDENT parser rather than importing the merge's own"
    - "evidence revision found by searching the file's own git log for the last PRE-migration shape, not HEAD~1 — wave-safe"
    - "a vacuous-by-construction assertion is labelled as such in place, rather than left to look like a check"
key-files:
  created:
    - "scripts/merge-photo-content.mjs"
    - "test/content/photo-enrichment.unit.test.ts"
  modified:
    - "data/portfolio_images.json"
decisions:
  - "OD-5 Option A, as decided by Akhil on 2026-08-25: both fields survive, no data moves, `focalPoint` written onto no record. The argument is written into the test file's doc comment, not only here."
  - "The per-category field is named `categoryOrder` — the sibling of the `order` it sits beside."
  - "TWO plan-supplied gates were repaired: the idempotence gate measured `git diff` against HEAD rather than the re-run, and the categoryOrder gate passed VACUOUSLY on an empty manifest, printing 'OK 7 categories' having seen none. See §5."
  - "The consistency invariant compares against the last pre-migration revision found in the manifest's own git log, not `git show HEAD~1` — the same repair 03-03 made, for the same reason."
  - "The merge refuses when the row count differs from the MANIFEST count rather than from a hardcoded 39, so publishing a 40th photograph is a named failure and not a silent one."
metrics:
  duration: "~35m"
  completed: "2026-08-26"
  commits: 3
  gates: "16 assertions in this file green on the real data; 18 planted defects each red and each naming the offending id; 7 vacuous-input modes each red; full unit project 322/322; biome clean"
---

# Phase 3 Plan 04: Photo Content Merge and the Per-Category Order — Summary

The 39 reviewed `alt` strings have left the markdown table and entered the manifest without being
retyped, and that is established by character-for-character comparison against an independently
re-parsed brief rather than by a diff looking plausible. `place` is on the 16 records the review
filled and **is not a key at all** on the other 23. Every record carries the D-22 per-category rank
the gallery will filter on. The brief itself is byte-identical to its committed revision: the merge
is one-way in fact, not only in intent.

---

## 1. The re-derived brief census

Measured this session, before writing anything, by parsing `00-PHOTO-CONTENT.md` fresh:

| Quantity | Expected by the plan | Measured |
|---|---|---|
| rows extracted | 39 | **39** |
| duplicate row ids | 0 | **0** |
| filled `alt` cells | 39 | **39** |
| filled `place` cells | 16 | **16** |
| filled `description` cells | 0 | **0** |
| filled `tags` cells | 0 | **0** |
| manifest ids with no row | none | **none** |
| row ids with no manifest record | none | **none** |
| markdown rows with a cell count ≠ 8 | — | **0** (so no `alt` string contains a literal pipe) |

The brief has not moved since planning. Nothing was merged against a description of it.

## 2. Before and after

| Key | Before | After |
|---|---|---|
| records | 39 | 39 |
| `alt` | 0 | **39** |
| `place` | 0 | **16** (and **23** records with no `place` key) |
| `categoryOrder` | 0 | **39** |
| `focalPoint` | 0 | **0** (OD-5: the default lives in 03-06's schema) |
| `description` | 0 | 0 |
| `tags` | 39 | 39 (untouched — contested under OD-3, settled in 03-06) |
| `order` | 39 | 39 (untouched) |

Two commits against the data, both additive:

- `27a5e38` — **55 insertions, 0 deletions** (39 `alt` + 16 `place`).
- `f37a159` — **40 insertions, 1 deletion**; the single deletion is one record whose `order` was its
  last key and gained a comma. Verified mechanically: record order, key order and every
  pre-existing value are unchanged.

Final key order per record: `id, title, alt, place?, category, tags, date, exif, urls, order, categoryOrder, dimensions`.
`alt` sits after `title`; `place` after `alt`; `categoryOrder` immediately after `order`, so the two
orderings — the one pair in the record that can silently contradict each other — are read together.

**Punctuation, measured rather than assumed.** The plan warned that "tidying" en dashes, curly
apostrophes or double spaces would change reviewed content. Across all 39 shipped `alt` values the
character census is: straight apostrophe U+0027 **present**, hyphen-minus **present**, curly
apostrophe U+2019 **absent**, em dash U+2014 **absent**, en dash U+2013 **absent**. So the specific
hazard the plan named does not occur in this data — but the byte-identity assertion is what
establishes that, and it is the thing that would catch it if a later edit introduced one.

## 3. The per-category rank as shipped

Derived by ranking each category by ascending global `order` and assigning 1…n densely. This
reproduces the plan's stated grouping exactly.

| Category | n | rank → global order |
|---|---|---|
| abstract | 4 | 1→1, 2→2, 3→3, 4→19 |
| architecture | 14 | 1→4, 2→5, 3→6, 4→7, 5→8, 6→9, 7→11, 8→12, 9→15, 10→16, 11→17, 12→23, 13→27, 14→30 |
| nature | 8 | 1→10, 2→13, 3→14, 4→18, 5→20, 6→21, 7→22, 8→28 |
| portraits | 2 | 1→24, 2→32 |
| product | 2 | 1→29, 2→31 |
| street | 4 | 1→25, 2→33, 3→34, 4→35 |
| wildlife | 5 | 1→26, 2→36, 3→37, 4→38, 5→39 |

14 + 8 + 5 + 4 + 4 + 2 + 2 = **39**.

### Why the field is called `categoryOrder`

00-ADMIN-IA §3 specifies the semantics — *"the per-category value wins when a category filter is
active; the global value governs the unfiltered gallery and the Home peek strip"* — and never names
the field, while three consumers must agree on the word: 03-06's schema, Phase 5's gallery and
Phase 7's `/admin/photos`. `categoryOrder` was chosen over `rank`, `positionInCategory` and
`sortIndex` because it reads as the sibling of the `order` it sits beside: the pair
`order` / `categoryOrder` states the two facts in the two words that distinguish them, and a reader
who knows what `order` means needs no glossary for the second. The reasoning is in the merge
script's header, not only here.

The derivation **refuses on a duplicate global `order`** rather than breaking the tie. A silent
tie-break would make the output depend on array position, and array position is not a fact anybody
reviewed.

## 4. OD-5 — verdict and where the argument now lives

**Option A. Both fields survive.** Decided by Akhil on 2026-08-25; presented, not chosen, by this
executor.

`photo.focalPoint` is *where the subject is in this photograph* — a property of the image, true in
any crop, anywhere on the site. `home_config.peekPositions` is *how this photo sits in Home's 3:2
peek frame* — a property of one placement in one layout. **Overriding one frame without changing how
the photograph is cropped everywhere else is not expressible with a single field.** Folding them
would give a photo exactly one crop in every context forever, and undoing that later would mean
undoing it with Phase 7's focal-marker editor already built on top.

This is the one place in Phase 3 where two fields of the same `"50% 25%"` shape are **defended**
rather than deleted — D-25 deleted `site_config.categoryColumns` and 00-ADMIN-IA §5 deleted the
résumé's `period` for exactly the duplication these two resemble — so the argument is written into
`test/content/photo-enrichment.unit.test.ts` above the assertions that enforce it, where the next
reader (03-06, adding `focalPoint` to `PhotoSchema`) will meet it at the moment it matters. It is
not left in prose in a summary.

**What this migration did about it: nothing.** Verified:

- `data/home_config.json` has **no working-tree modification** and is byte-identical to `HEAD`. Its
  last commit is `db65b12`, which predates this phase. The single value
  `{"architecture-hawamahaldaytime": "50% 25%"}` is untouched.
- `focalPoint` is present on **0 of 39** records. Per the resume-signal: the `"50% 50%"` default
  **lives in 03-06's schema**, written onto no record — an explicitly stored default is a value
  nobody edited that looks like one somebody chose.
- 03-06 still owns the rule that `peekPositions` keys ⊆ `peekIds`. It is **not** duplicated here.
  (It holds today: the one key is one of the six `peekIds`.)

## 5. Gates repaired — two plan-supplied gates were defective

### 5a. The idempotence gate measured the commit, not the re-run

**Before (as the plan shipped it):**

```bash
node scripts/merge-photo-content.mjs >/dev/null 2>&1 && git diff --quiet data/portfolio_images.json && echo "OK re-run is a no-op" || { echo "FAIL: not idempotent"; ... }
```

**Observed:** run inside Task 1, immediately after the merge that added 55 values, it reported

```
PLAN GATE REPORTED: FAIL: not idempotent
 data/portfolio_images.json | 55 ++++++++++++++++++++++++++++++++++++++++++++++
```

on a **correct, fully idempotent** merge. `git diff --quiet` asks whether the working tree matches
HEAD — a question about the *commit*, not about the re-run. Inside the task that just did the work
it is guaranteed red; run *after* the commit it is guaranteed green for any script that writes
nothing at all, **including one that was never run**. It cannot distinguish "the second run produced
the same bytes" from "the second run did nothing" from "the first run did nothing either". This is
the wave-1 "convergence is not work" defect wearing a different hat.

**After:** hash the file, re-run, hash again, and compare — plus two clauses the byte comparison
cannot supply:

```bash
enriched || exit 1                       # ANTI-VACUITY, checked FIRST so the failure names the real thing
PRE=$(shasum -a 256 data/portfolio_images.json | awk '{print $1}')
rm -f /tmp/idem.txt
node scripts/merge-photo-content.mjs > /tmp/idem.txt 2>&1 || { echo "FAIL: the re-run exited non-zero"; exit 1; }
POST=$(shasum -a 256 data/portfolio_images.json | awk '{print $1}')
[ "$PRE" = "$POST" ] || { echo "FAIL: the manifest changed on a second run ($PRE -> $POST)"; exit 1; }
grep -q 'No changes' /tmp/idem.txt || { echo "FAIL: bytes stable but the merge reported work"; exit 1; }
enriched || exit 1
```

where `enriched` refuses an empty or non-enriched manifest, because **an empty manifest and a no-op
script satisfy byte equality perfectly**. The `rm -f /tmp/idem.txt` matters: without it the gate can
grep a transcript from a previous run.

### 5b. The categoryOrder gate passed VACUOUSLY — the eighth in this project

The plan's Task-2 gate builds `by` from the manifest and then iterates `Object.entries(by)`. Given
an empty manifest it iterates **zero groups**, accumulates zero failures, and prints:

```
[G7 vacuous] gate exit=0
OK 7 categories, dense 1..n ranks, consistent with global order
```

— a sentence about seven categories it has never seen, with exit code 0. The `expect` table of
per-category counts does not save it, because the table is only consulted for categories that
already appear in the data; a category that vanished entirely is invisible to it.

**After** — three clauses, each marked `ANTI-VACUITY` in the source:

```js
if(!Array.isArray(a)||a.length===0){ console.error("FAIL: the manifest is empty or not an array — ... this gate must not report OK over zero records"); process.exit(1) }
if(a.length!==total) bad.push("the manifest holds "+a.length+" records, expected "+total);
for(const c of Object.keys(expect)) if(!by[c]) bad.push(c+": expected "+expect[c]+" photos, found NONE — the category is absent, not merely mis-ranked");
for(const [c,ps] of Object.entries(by)) if(!(c in expect)) bad.push(c+": unexpected category, ...");
```

The third clause is the load-bearing one: it is driven by the **expectation table**, not by the
data, so a group that disappeared cannot delete the assertion that would have caught it. The success
line also now reports what it actually saw — `OK 7 categories over 39 records` — so a future vacuous
run would be legible in the transcript rather than reassuring.

Proof of the repair:

```
[R7 correct]       exit=0  OK 7 categories over 39 records, dense 1..n ranks, consistent with global order
[R7 vacuous-empty] exit=1  FAIL: the manifest is empty or not an array — there is nothing to rank ...
[R7 vacuous-cat]   exit=1  FAIL: the manifest holds 37 records, expected 39
                           product: expected 2 photos, found NONE — the category is absent, not merely mis-ranked
[R7 swap]          exit=1  FAIL: architecture: categoryOrder disagrees with global order
```

### 5c. Two smaller hardenings, recorded rather than silently applied

- **The plan's `git show HEAD~1` instruction for the consistency invariant was not followed.** The
  plan asked for the consistency assertion to compare "against the previous git revision's global
  order". `HEAD~1` is a time bomb in a concurrent wave — 03-05 committed `2009dc9` during this plan's
  execution — and it is the exact defect 03-03 already found and repaired. Instead the test searches
  the **manifest's own git log** newest-first for the last revision in which **no record carries
  `categoryOrder`**, which is by definition the shape the ranks were derived from, and is stable no
  matter what else commits. Exhausting the log **throws** rather than yielding an empty map. Proven
  in §6, gate G8.
- **The merge refuses on a row count that differs from the MANIFEST's**, not from a hardcoded 39.
  The plan specified "the extracted row count is not 39". A literal 39 goes stale the day a 40th
  photograph is published, and hardcoding the answer next to the question is the tautology class
  wave 1 found twice. The manifest-derived form is strictly stronger — it also fails on 39 rows
  against 40 records — and matches `check-photo-content.mjs`'s own design rule.
- **Control B's failure branch `cat`s `/tmp/mc.txt`.** In its vacuous mode (stale anchor) the merge
  is never run, so it printed a transcript from an *earlier, unrelated* run. The gate still failed
  closed — exit 1 — but its evidence was misleading. Added `rm -f /tmp/mc.txt` at the top.

**One process finding of my own, not the plan's.** My first probe harness restored the *script* it
mutated but not the *data* that script had written. A planted non-idempotence defect (`mergedAt`)
therefore survived into the working tree for three commands. Caught by a key census before any
commit, and reset by restoring the pre-merge preimage and re-running the merge from clean. Nothing
contaminated reached a commit — `27a5e38` was verified additive-only against the preimage. A probe
that mutates a producer must restore the producer's output too.

## 6. The four-step proof, per gate

Every gate below was made to fail on purpose before it was believed. Notation: **P**lant the
defect it targets · **V**acuous input · **C**orrect code · **W**alk-through attempt.

### G1 — `test/content/photo-enrichment.unit.test.ts` (16 assertions)

| Step | Input | Result |
|---|---|---|
| **P** | one `alt` paraphrased (`ridge pole` → `ridgepole`) | **RED** — `alt mismatch on wildlife-pigeon: expected 'A pigeon on the ridgepole…' to be 'A pigeon on the ridge pole…'` |
| **P** | `place: ''` instead of absent on `nature-lonetree` | **RED** — 2 tests; `expected [ 'nature-lonetree' ] to deeply equal []` |
| **P** | `place` values swapped between two records (count still 16) | **RED** — `place mismatch on architecture-eiffeljpg: expected 'Florence, Italy' to be 'Paris, France'` |
| **P** | `alt` replaced by its own title | **RED** — byte-identity **and** rule 2, both naming `abstract-plane` |
| **P** | `"Photo of "` prefixed to an alt | **RED** — byte-identity **and** rule 3 |
| **P** | `[AKHIL-OPT]` planted in a `description` | **RED** — `expected [ 'abstract-watertexture' ] to deeply equal []` |
| **V** | manifest replaced with `[]` | **RED** — 5 tests, first being `expected +0 to be 39` |
| **V** | brief's tables stripped out entirely (0 rows parsed) | **RED** — `expected +0 to be 39`, then all 39 ids named as uncovered |
| **V** | one brief row given a 9th cell so it drops out of the parse | **RED** — `expected 38 to be 39`; `expected [ 'abstract-plane' ] to deeply equal []` |
| **C** | the shipped data | **GREEN** — 16/16 |
| **W** | *Could something satisfy it while violating its intent?* **Yes, one route:** editing the brief **and** the manifest identically. Byte-identity proves transport fidelity, not that the reviewed wording is intact. Closed by evidence outside the assertion: the brief is byte-identical to `HEAD` (`git diff --quiet` clean, unchanged since before this phase), so no such edit occurred here. It is not closed *by the gate*, and that is stated rather than papered over. |
| **W** | *Could the independent parser drift into agreement with the merge's?* It is a second implementation in a second language surface, and the count assertions (`rows.length === 39`, `rowById.size === 39`) fire before any comparison, so a parser that lost or merged rows is red before it can agree about the survivors. |

### G2 — the plan's inline manifest census (`node -e`, verify block 2)

| Step | Input | Result |
|---|---|---|
| **P** | `alt` blanked on one record | **RED** — `FAIL: no alt on architecture-parismuseum` |
| **P** | marker leaked into `description` | **RED** — `FAIL: pending marker leaked into architecture-singapore` |
| **P** | `place` turned into `''` | **RED** — `FAIL: empty place key present on architecture-singapore — absent means no key` |
| **P** | a 17th `place` key added | **RED** — `FAIL: expected 16 place keys, found 17` |
| **V** | manifest replaced with `[]` | **RED** — `FAIL: 0 records` |
| **V** | manifest file deleted | **RED** — ENOENT, exit 1 |
| **C** | the shipped data | **GREEN** — `OK 39 alt, 16 place keys, 23 records with no place key, 0 markers` |
| **W** | **Yes — it is a shape check, not a content check.** All 39 `alt` values could be replaced with arbitrary non-empty prose, and all 16 `place` values could be moved to the *wrong* 16 records, and it stays green: it counts. Closed by G1, which compares per id and byte for byte. Recorded because "OK 39 alt" reads like more than it proves. |

### G3 — `check-photo-content.mjs`, re-run to prove the merge is one-way

| Step | Input | Result |
|---|---|---|
| **P** | an `alt` cell blanked **in the brief** | **RED** — `FAIL: 1 photo-content violation(s) across 39 manifest record(s)` |
| **P** | a whole row deleted from the brief | **RED** — 1 violation, the missing id named |
| **V** | brief truncated to empty | **RED** — `FAIL: 39 photo-content violation(s)` |
| **C** | the brief as it stands | **GREEN** — `PASS: 39/39 manifest record(s) have a row; 39 alt text(s) written, 0 outstanding.` |
| **W** | **Yes.** The gate enforces *rules*, not *bytes*: a merge that rewrote the brief while keeping every rule satisfied would leave it green. So the stronger claim is asserted separately and directly — `git diff --quiet` and `git diff --cached --quiet` on the brief are both clean, and its SHA-256 is `335fb581…` both before and after every run and every control. That, not G3, is the evidence the merge is one-way. |

### G4 — Control A: does the merge actually read the brief?

| Step | Input | Result |
|---|---|---|
| **P** | merge patched to prefer the value already on the record (`if (typeof photo.alt === 'string') row.alt = photo.alt`) — i.e. "writes values it carries internally" | **RED** — `FAIL control A: the merge did not pick up an edited alt value. It may be writing values it carries internally.` |
| **V** | the mutation anchor replaced with a string that is nowhere in the brief | **RED** — `FAIL: the control found nothing to mutate — the anchor string is stale`. The control asserts its own mutation applied before it concludes anything; this is the trap `00-PHOTO-CONTENT.md`'s header documents for `sed -i ''`, and it is closed by mutating with node `String.replace` and comparing before/after. |
| **C** | the shipped merge | **GREEN** — `CONTROL A OK: editing the brief changes the manifest — the merge really reads it` |
| **W** | The sentinel is grepped out of the manifest, so a merge that read the brief and wrote it to the *wrong record* would still pass. Closed by G1's per-id byte comparison. The brief is restored and re-verified byte-identical after every run of this control. |

### G5 — Control B: does a pending marker stop the merge, by name?

| Step | Input | Result |
|---|---|---|
| **P** | the marker refusal removed from the merge (`if (false) {`) | **RED** — `FAIL control B: a placeholder marker can reach the manifest`, and the manifest then genuinely held `"wildlife-pigeon": alt = "[AKHIL-ALT]"`. The defect is real, and the control is what stands between it and a screen-reader user hearing a placeholder. |
| **V** | stale anchor (nothing mutated) | **RED** — `FAIL: control anchor stale`, exit 1. Fails closed: `R` is never set to `1`, so the `test "$R" = "1"` branch cannot pass by accident. |
| **C** | the shipped merge | **GREEN** — `CONTROL B OK: a pending marker in a required cell stops the merge and is named`, with the merge printing `"wildlife-pigeon" still carries the pending marker [AKHIL-ALT] in its required alt cell (line 118)` |
| **W** | Exit code alone would be walkable — any crash exits 1. That is why the control also greps for the **id** in the transcript. A merge that exits 1 for an unrelated reason fails the grep and the control still fails. |

### G6 — idempotence (**repaired**, §5a)

| Step | Input | Result |
|---|---|---|
| **P** | merge patched to write `next.mergedAt = Date.now()` | **RED** — `FAIL idempotence: the manifest changed on a second run (a5d15a00… -> 4f42e257…)` |
| **P** | merge patched to report phantom changes while writing identical bytes | **RED** — `FAIL idempotence: bytes were stable but the merge reported work — its change detection disagrees with what it wrote` |
| **V** | empty manifest **plus** a merge replaced by `process.exit(0)` — byte equality holds perfectly | **RED** — `FAIL idempotence: the manifest is EMPTY or not an array — stable bytes over nothing is not idempotence`. This is exactly the state the plan's original gate would have called green. |
| **C** | the shipped merge | **GREEN** — `OK re-run is a genuine no-op: identical bytes, 0 changes reported, the enriched manifest still in place` |
| **W** | A merge that read the brief, dropped `place` entirely and did so consistently would be idempotent. Closed by G1/G2, and by the gate's own precondition, which requires a non-zero `place` count before it will even start. |

### G7 — the plan's inline `categoryOrder` gate (**repaired**, §5b)

| Step | Input | Result |
|---|---|---|
| **P** | two ranks swapped inside architecture (density untouched) | **RED** — `architecture: categoryOrder disagrees with global order`, both sequences printed |
| **P** | duplicate rank in nature | **RED** — `nature: ranks 1,1,2,3,5,6,7,8 are not dense 1..n` |
| **P** | `categoryOrder` deleted from one record | **RED** — `FAIL: no integer categoryOrder on product-gadgets` |
| **V** | manifest replaced with `[]` | **plan's version: GREEN, exit 0** ← the defect. **Repaired version: RED** |
| **V** | the whole `product` category removed | **plan's version: GREEN** (it iterates the data, so an absent category is invisible). **Repaired version: RED** — `the manifest holds 37 records, expected 39` / `product: expected 2 photos, found NONE` |
| **C** | the shipped data | **GREEN** — `OK 7 categories over 39 records, dense 1..n ranks, consistent with global order` |
| **W** | **Yes.** It compares `categoryOrder` against the **live** `order` field, so editing *both* consistently but wrongly walks straight through it. Closed by G8, which compares against the pre-migration git revision instead — the two gates are complementary and neither alone is sufficient. |

### G8 — the two order invariants in the test file

| Step | Input | Result |
|---|---|---|
| **P** | every category's ranks **reversed** (density stays perfect, order inverted) | **RED**, and **only** the consistency test — `abstract disagrees with the global order at 27a5e38: expected [ 'abstract-plane', …(3) ] to deeply equal [ 'abstract-intothemist', …(3) ]`. This is the sharpest probe available: invariant 1 sees nothing, invariant 2 sees everything, which is exactly the split the plan asked for. |
| **P** | duplicate rank | **RED** — density names `nature`, with `[ 1, 1, 2, 3, 5, 6, 7, 8 ]` vs `[ 1, 2, 3, 4, 5, 6, 7, 8 ]` |
| **P** | `categoryOrder` deleted from one record | **RED** — `gives every record an integer categoryOrder` |
| **V** | `GIT_DIR` pointed at a non-existent directory, so the evidence search can find nothing | **RED** — `Error: Command failed: git log --format=%H -- data/portfolio_images.json`, `Test Files 1 failed`, `Tests no tests`. It errors during collection; it does **not** go green having compared nothing. |
| **V** | manifest replaced with `[]` | **RED** — 8 tests |
| **C** | the shipped data | **GREEN** — 16/16 |
| **W** | **The tautology walk-through, tested directly.** If the revision finder accepted a *post*-migration revision, it would compare the shipped ranks against themselves and pass on any shuffle. `HEAD` (`f37a159`) carries `categoryOrder` on 39/39 records and would be selected by a naive finder. Measured: the finder skips it and selects `27a5e38`, the last revision with none — and the failure messages above quote `27a5e38`, proving at the point of failure which revision was read. |
| **W** | A photograph published *after* this migration has no pre-migration rank, so the assertion would be unsatisfiable for it. Rather than silently skipping such ids — which would shrink the compared set toward zero — a dedicated test names them and instructs the reader to re-scope or retire the block. |

### G9 — the plan's order negative control (rank swap → suite red)

| Step | Input | Result |
|---|---|---|
| **P** | (this control **is** the plant) `arch[3].categoryOrder ⇄ arch[9].categoryOrder` | **GREEN as a control** — `CONTROL OK: a shuffled pair fails the consistency invariant`, with `AssertionError: architecture disagrees with the global order at 27a5e38` |
| **V** | if the `architecture` group were empty, `arch[3].categoryOrder` throws, node exits non-zero, `&&` short-circuits, `npx vitest` never runs and `$R` is never set to `1` → the control **fails closed**. Ranks are unique, so the swap can never be an accidental no-op. |
| **C** | the manifest is restored from `/tmp/co.bak` afterwards and confirmed byte-identical | ✔ |
| **W** | Its assertion is the suite's exit code, so *any* unrelated red would satisfy it. Narrowed by reading the transcript: the failure named is specifically `orders each category the same way the pre-migration global order did`, and 13 of 14 tests stayed green — so the control defeated the intended invariant and nothing else. |

**Plan-supplied harness already repaired before I started:** the two `( cmd && R=0 || R=1 )` subshell
assignments. Both were correct in the copy I received (`if cmd; then R=0; else R=1; fi` in control B,
plain command-list form in control A) and both behaved correctly under test — verified by driving
each into its failure branch above.

## 7. What these checks cannot see

- **Whether an `alt` value is true of the photograph.** That is what the 2026-08-23 review was for.
  No gate here replaces it, and none pretends to.
- **Whether `alt` ever reaches an `<img>`.** No page renders a photo until Phase 5, so "the entire
  non-visual channel" is currently a string in a JSON file. **Phase 5 must assert the attribute on
  rendered HTML.** Until it does, this phase has delivered the content and not the channel.
- **Whether the brief's wording is the wording Akhil approved.** Byte-identity proves the crossing,
  not the origin. The independent evidence is that the brief is unmodified since before this phase.

## 8. Contradictions and discrepancies found

1. **The plan's idempotence gate was wrong** (§5a) — it reported FAIL on a correct merge.
2. **The plan's `categoryOrder` gate passed vacuously** (§5b) — `OK 7 categories` over zero records.
3. **The plan's `git show HEAD~1` guidance for the consistency evidence** (§5c) is the same defect
   03-03 already found and repaired in this phase; 03-05 committed mid-execution, which would have
   moved `HEAD~1` under it.
4. **The plan's "refuse if the row count is not 39"** hardcodes an answer that goes stale on the
   next publish; replaced with a manifest-derived comparison (§5c).
5. **No contradiction between the plan and 03-CONTEXT.md was found.** Every number the plan asserted
   about the brief and the manifest — 39/39/16/0/0, the seven category counts, the global orders per
   category, `alt`/`place`/`description`/`focalPoint` at 0 of 39, `tags` `[]` on all 39, `order`
   globally unique 1…39 — was re-measured this session and every one held.
6. **A stylistic note, not a defect:** the punctuation hazard the plan warned about (en dashes,
   curly quotes) does not exist in the shipped `alt` values (§2). The warning was still worth
   honouring — the merge normalises nothing — but the risk it named was hypothetical for this data.

## Self-Check: PASSED

- `scripts/merge-photo-content.mjs` — FOUND (327 lines)
- `test/content/photo-enrichment.unit.test.ts` — FOUND (417 lines)
- `data/portfolio_images.json` — FOUND, 39 records, SHA-256 `4604606c…`
- `27a5e38` — FOUND, `content(photos): merge 39 reviewed alt values and 16 place values into the manifest`
- `f37a159` — FOUND, `content(photos): backfill per-category order (D-22)`
- `28c3a2d` — FOUND, `test(photos): pin the OD-5 verdict — focalPoint and peekPositions both survive`
- Full `unit` project: **322/322 green**. Biome: clean on both new files.
- Not touched, verified: `data/resume.json`, `data/home_config.json`, `data/site_config.json`,
  `.planning/STATE.md`, `.planning/ROADMAP.md`, and `00-PHOTO-CONTENT.md`.
