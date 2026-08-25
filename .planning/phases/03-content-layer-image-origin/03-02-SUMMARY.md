---
phase: 03-content-layer-image-origin
plan: 02
subsystem: content / stored bullet grammar
tags: [grammar, migration, xss-structural, vitest-projects, round-trip, gate-repair]
requires: []
provides:
  - "`src/lib/bullets.ts` — the one grammar for a stored résumé bullet (parse, serialize, containsHtmlTag)"
  - "13 bullets stored as bold-only inline markdown; zero HTML tags anywhere in data/resume.json"
  - "a third vitest project, `unit`, glob `test/**/*.unit.test.ts`, no globalSetup"
  - "a round-trip property proven lossless on all 13 real bullets and 19 fixtures"
  - "an independent three-equality migration proof against the last <strong>-bearing revision"
affects:
  - "data/resume.json (12 of 13 bullets rewritten)"
  - "vitest.config.ts, vitest.workers.config.ts (contract paragraph)"
  - "test/content/site-config-migration.unit.test.ts (03-03 consumed the new `unit` project)"
tech-stack:
  added: []
  patterns:
    - "migration imports the grammar and never writes a delimiter itself — one source of truth about the encoding"
    - "before-revision located by CONTENT (newest revision still carrying <strong>) rather than HEAD~1, so concurrent commits cannot move it"
    - "fixture table carries an `identityAgrees` column, and a meta-test asserts the column is exactly right"
    - "unbalanced input is a named throw, so parse accepts exactly the language serialize emits"
key-files:
  created:
    - "src/lib/bullets.ts"
    - "test/content/bullets.unit.test.ts (124 cases)"
    - "test/content/bullets-migration.unit.test.ts (60 cases)"
    - "scripts/migrate-resume-bullets.mjs"
    - "vitest.unit.config.ts"
  modified:
    - "data/resume.json"
    - "vitest.config.ts"
    - "vitest.workers.config.ts"
decisions:
  - "A lone unescaped `*` THROWS rather than being treated as literal. The plan only mandated a throw on unbalanced `**`; extending it makes `parseBullet` accept exactly the language `serializeBullet` emits, which is what makes the round trip total rather than best-effort"
  - "`BulletSyntaxError` is NOT exported — the plan fixes the surface at four exports, and `error.name` discriminates across module boundaries where `instanceof` does not. A gate asserts the surface is exactly those four"
  - "`containsHtmlTag` also returns true for `<!` and `<?` (comments, doctype, PIs), beyond the four cases the plan named. Found by walking the narrower rule through: `<!--` was the only input carrying markup that the narrow rule missed"
  - "A THIRD equality — position equality — was added to the migration proof. Projection AND emphasis together are both satisfied by an emphasis that moved to a different occurrence of the same text"
  - "The before-revision is found by content, not `HEAD~1`. Three plans of wave 1 commit to one branch; `HEAD~1` was another plan's commit at the moment this ran"
  - "Four of the plan's own gates were unfailable or tautological as written and were repaired before use — see §Gate repairs"
metrics:
  duration: "~30m"
  completed: "2026-08-26"
  commits: 3 (+1 docs)
  gates: "unit 229/229, check 0, typecheck 0 errors / 0 warnings; workers 18/18"
---

# Phase 3 Plan 02: The Bold-Only Bullet Grammar Summary

A stored résumé bullet is now prose plus zero or more `**`-wrapped spans, and that phrase is
defined in exactly one module. The storage half of criterion 3 is closed **by construction**: there
is no string in `data/resume.json` that a renderer could read as a tag, because the grammar has no
production that emits an angle bracket. Not a filter — a shape.

`main` `28fa34f` → **`412ca9e`**. Three commits, 12 lines of reviewed content changed, 184 new test
cases.

| commit | what |
|---|---|
| `2acee08` | RED — the `unit` vitest project, the spec, a throwing stub. 122 of 124 red. |
| `6c14e0a` | GREEN — `src/lib/bullets.ts`. 124/124. |
| `412ca9e` | The migration, the 12-line diff, and the independent three-equality proof. |

---

## 1. The corpus, re-derived before anything was converted

Measured against `data/resume.json` at `28fa34f`, not carried from a document.

| quantity | measured | plan said |
|---|---|---|
| experience entries | 3 (`brevo`, `pharmeasy`, `maq`) | 3 ✓ |
| bullets | **13** — brevo 6, pharmeasy 3, maq 4 | 13 ✓ |
| `<strong>` opens / closes | **17 / 17**, balanced | 17 / 17 ✓ |
| whole-file tag census | **`{strong: 34}`** and nothing else | `{strong: 34}` ✓ |
| nested `<strong>` | 0 | 0 ✓ |
| empty / whitespace-only tag content | 0 | 0 ✓ |
| whitespace against a delimiter | 0 | 0 ✓ |
| bullets containing `*` | **0** | 0 ✓ |
| bullets containing `\` | **0** | 0 ✓ |
| bullets containing `` ` ``, `[`, `]`, `_` | **0** | 0 ✓ |
| bullets with **no** markup | **1** — `pharmeasy#2` | 1 ✓ |
| bullets containing `&` | **1** — `pharmeasy#2`, a literal `&` in "upsell & cross-sell", not an entity |  — |

**My count agrees with yours in every particular.** The three documents claiming "all **18**
bullets" (ADR-001 §66, ADR-002 §2, 00-ADMIN-IA §2) are wrong by five, for the reason you gave:
`24afda2` cut Brevo from 11 to 6 after they were written. The "only `<strong>`" half of the claim
survives measurement intact.

One number in the plan is off by one in the other direction: it says to paste **"the 13-line diff"**
(twice — `<action>` and `<output>`). The diff is **12 lines**, because `pharmeasy#2` carries no
markup and was not converted. The migration reports `inspected 13 bullets, converted 12`. This is
the plan's own "12 of 13" observation not being carried into its own arithmetic — the same class of
slip, one document later.

### Before / after counts

| | before | after |
|---|---|---|
| bullets | 13 | 13 |
| emphasised spans | 17 (`<strong>…</strong>`) | 17 (bold runs from `parseBullet`) |
| bullets carrying emphasis | 12 | 12 |
| bullets with none | 1 (`pharmeasy#2`) | 1 (`pharmeasy#2`) |
| HTML tags in the whole file | 34 | **0** |
| bytes | 7 437 | 7 216 |

The 221-byte drop is exact: each `<strong>X</strong>` loses 17 characters of tags and gains 4
of delimiters, so 17 runs × 13 = 221.

---

## 2. The diff, in full

12 lines. `data/` is excluded from Biome (`biome.json` → `"!data"`), so the formatting is the
script's own `JSON.stringify(data, null, 2)` plus a trailing newline — verified byte-identical to
the file's pre-existing serialisation before anything was written.

```diff
@@ brevo @@
-        "Improved <strong>conversion by 15%</strong> by transforming a one-page checkout for <strong>2.5M+ users</strong> into a 3-step flow",
-        "Engineered a unified, responsive settings navigation package adopted across <strong>18+ micro-frontend apps</strong>",
-        "Integrated <strong>18+ GoLang APIs</strong> and optimized payload structures, reducing <strong>API response size by 50%</strong>",
-        "Reduced support tickets by <strong>12–20%</strong> in high-traffic modules (<strong>10K+ weekly users</strong>) via UX improvements and automated domain authentication",
-        "Integrated Sniper Links into signup emails, boosting engagement across <strong>5M+ annual signups</strong>",
-        "Introduced RBAC with <strong>40+ permissions</strong> across 6 business verticals, scaling access for <strong>1K+ enterprise users</strong>"
+        "Improved **conversion by 15%** by transforming a one-page checkout for **2.5M+ users** into a 3-step flow",
+        "Engineered a unified, responsive settings navigation package adopted across **18+ micro-frontend apps**",
+        "Integrated **18+ GoLang APIs** and optimized payload structures, reducing **API response size by 50%**",
+        "Reduced support tickets by **12–20%** in high-traffic modules (**10K+ weekly users**) via UX improvements and automated domain authentication",
+        "Integrated Sniper Links into signup emails, boosting engagement across **5M+ annual signups**",
+        "Introduced RBAC with **40+ permissions** across 6 business verticals, scaling access for **1K+ enterprise users**"
@@ pharmeasy @@
-        "Modernized the UX for the B2B portal orders page, enhancing productivity for <strong>4K+ franchises</strong> across <strong>4 countries</strong>",
-        "Developed UIs for receipt generation and editing, reducing support tickets and <strong>response time by 30%</strong>",
+        "Modernized the UX for the B2B portal orders page, enhancing productivity for **4K+ franchises** across **4 countries**",
+        "Developed UIs for receipt generation and editing, reducing support tickets and **response time by 30%**",
@@ maq @@
-        "Built analytics pipelines from <strong>7+ data sources</strong>, modeling data into a Delta Lake (bronze, silver, gold) architecture",
-        "Developed a real-time write-back sync system for an app deployed to <strong>16K+ stores</strong>, ensuring operational reliability",
-        "Led SQL scripting and data modeling in a 4-member team, delivering an analytics solution for PepsiCo North America in <strong>under 3 months</strong>",
-        "Improved pipeline execution time by <strong>6×</strong> by replacing Power Automate workflows with Azure Data Factory"
+        "Built analytics pipelines from **7+ data sources**, modeling data into a Delta Lake (bronze, silver, gold) architecture",
+        "Developed a real-time write-back sync system for an app deployed to **16K+ stores**, ensuring operational reliability",
+        "Led SQL scripting and data modeling in a 4-member team, delivering an analytics solution for PepsiCo North America in **under 3 months**",
+        "Improved pipeline execution time by **6×** by replacing Power Automate workflows with Azure Data Factory"
```

`pharmeasy#2` — *"Delivered a client-side recommendation system leveraging a rule engine to enable
product upsell & cross-sell"* — is byte-identical before and after. It is the one record a converter
that assumed every bullet has a tag would have been wrong about; the script's fast path returns it
untouched and still parses it, so an already-migrated file is re-validated rather than rubber-stamped.

The en dash in `12–20%`, the `×` in `6×` and the `&` in `pharmeasy#2` all survive verbatim.

---

## 3. The escaping rule, and why it is dead code on purpose

- A literal `*` in run text serialises as `\*`. A literal `\` as `\\`. `parseBullet` reverses both.
- A backslash before anything else is a **named throw**, not a literal backslash. So there is no
  input where `parse` silently reinterprets an author's characters.
- A lone unescaped `*` is also a **named throw**. The plan only required this for unbalanced `**`;
  extending it is what makes the round trip *total*: `parseBullet` accepts **exactly** the language
  `serializeBullet` emits, no wider. Under the softer rule, `parse("5 * 3")` would round-trip to
  `"5 \* 3"` — a silent rewrite of the author's text, which is precisely the shape of G-4.
- `<`, `>`, `&`, `"` are **not** escaped. They are ordinary characters of run text, because the
  output of `serializeBullet` is a JSON string in `data/resume.json`, not HTML. Escaping them here
  would be an encoding applied at the wrong layer: it would corrupt the stored text and still tell
  you nothing about what a renderer does.

Today's corpus contains **zero** `*` and **zero** `\`, so every line of the escape handling is
unreachable against the data on disk. It is written now because the first time someone types
"5 * 3" into the Phase 7 editor it stops being unreachable, and writing it then costs a debugging
session under a half-finished WYSIWYG against reviewed content.

Two edge cases the normal form pins down, both round-trip-load-bearing:

- **Adjacent bold runs are never merged.** `**b****c**` and `**bc**` are different strings; merging
  would lose a run boundary on save — G-4 exactly.
- **An empty bold run is preserved.** `a ****b` parses to `[plain "a ", bold "", plain "b"]`.
  Dropping it would change the string.

---

## 4. Gate repairs — four of the plan's own checks could not fail

This is the part worth reading. Every gate below was run against a planted defect *before* being
trusted, and four of them turned out to be unfailable or tautological as written.

### R-1 · `/three/i.test(vitest.workers.config.ts)` — matched a comment (7th occurrence in this project)

The plan's check for "the contract paragraph now says three globs" was a whole-file grep for the
word *three*. `vitest.workers.config.ts` line 11 has said, since plan 02-05:

> `node_modules/@cloudflare/vitest-pool-workers/package.json` declares exactly **three** export subpaths

Transcript, run against the file **before** my edit:

```
=== PLAN'S GATE AS WRITTEN, against vitest.workers.config.ts BEFORE my edit ===
gate PASSES — on the pre-edit file that says "the two globs may never overlap".
matched line: *   - `node_modules/@cloudflare/vitest-pool-workers/package.json` declares exactly three
```

Repaired by scoping to the contract paragraph, requiring the phrase *three globs*, requiring all
three suffixes by name, and **asserting the old wording is gone** (`/\bthe two globs\b/` must not
match).

### R-2 · The mutual-exclusivity loop was a tautology

```js
const names=["a.workerd.test.ts","a.node.test.ts","a.unit.test.ts"];
const globs=[/\.workerd\.test\.ts$/,/\.node\.test\.ts$/,/\.unit\.test\.ts$/];
```

Three hardcoded regexes tested against three hardcoded filenames. Nothing in it reads a config
file, so **no change to any vitest config could make it fail**. Repaired to extract the real
`test.include` values out of the three config files, compile them to matchers, and additionally
walk every real `test/**/*.test.ts` on disk asserting each matches exactly one — which is the half
that catches an *orphaned* test file, something the plan's version structurally could not see.

### R-3 · The Node-import gate only matched double-quoted specifiers

```js
/^\s*import[^\n]*from\s+"(node:[^"]+|fs|path|url|crypto)"/gm
```

`biome.json` sets `javascript.formatter.quoteStyle: 'single'` and `npm run check` enforces it, so
**no import this repository can contain would ever match**. Measured:

```
=== G2 STEP 1a — DEFECT: a single-quoted node: import (what biome would produce) ===
  repaired gate exit=1     plan gate PASSES
=== G2 STEP 1b — DEFECT: a double-quoted node: import (the only shape the plan saw) ===
  repaired gate exit=1     plan gate FAILS
=== G2 STEP 1c — DEFECT: a dynamic import('node:crypto') ===
  repaired gate exit=1     plan gate PASSES
```

Two of the three realistic defect shapes walked straight through it.

### R-4 · The idempotence gate reported a no-op for a run that did 12 conversions

`node scripts/migrate-resume-bullets.mjs && git diff --quiet data/resume.json` measures
*convergence on HEAD*, not *no work done*. Restoring the pre-migration file and re-running gives:

```
=== G6 STEP 2 — fix disabled: run against the PRE-migration file ===
  OK re-run is a no-op          <-- FALSE PASS: the script had just converted 12 bullets
```

Repaired to require all three of `converted 0`, `unchanged — nothing written`, and a clean diff.
The same input then reads correctly:

```
=== G6r STEP 2 — fix disabled: pre-migration file on disk ===
  FAIL: not idempotent — converted 12
```

---

## 5. The four-step proof, per gate

### G1 · three projects, mutually exclusive globs, contract paragraph current

| step | result |
|---|---|
| 1 · defect: unit project dropped from `vitest.config.ts` | **FAIL** — `references 2 project configs, expected 3` |
| 1 · defect: unit glob widened to `test/**/*.test.ts` | **FAIL** — `'test/content/a.workerd.test.ts' matches 2 project globs` |
| 1 · defect: an orphaned `test/content/orphan.test.ts` | **FAIL** — `matches 0 project globs — it would be run by no project` |
| 2 · fix disabled (contract paragraph reverted, no other defect) | **FAIL** — `still says 'the two globs may never overlap'`; the plan's original check **PASSES** on this identical input |
| 3 · shipped | **PASS** — 3 projects, 3 globs mutually exclusive, 6 test files each matched exactly once |
| 4 · walk-through | **Found one, recorded not closed:** a test file outside `test/` (e.g. `src/**/*.test.ts`) matches no project glob and is invisible to all three projects *and* to this check, because the check enumerates `test/**`. Also: the contract-paragraph slice is a 1 400-char window before `include:`; moving the comment further away would slip out of it. |

**Limit, stated rather than glossed:** G1 is an executor-time check, not CI. `npm run check` does
not run it. Nothing stops plan 03-08 from adding a fourth, overlapping glob. Folding it into a
persistent `*.unit.test.ts` was deliberately not done here — wave 1 had two other agents writing to
`test/content/`, and an unplanned file there was a collision risk for no gain within this plan.
**Recommended for whichever plan next touches the vitest configuration.**

### G2 · exactly four exports, no Node-only imports

| step | result |
|---|---|
| 1 · defect: `import { readFileSync } from 'node:fs'` (single-quoted) | **FAIL** |
| 1 · defect: same, double-quoted | **FAIL** |
| 1 · defect: `export const _leak = () => import('node:crypto')` | **FAIL** |
| 1 · defect: `containsHtmlTag` un-exported | **FAIL** — `is not exported` |
| 1 · defect: `export class BulletSyntaxError` (surface grows) | **FAIL** — `export surface is [...], expected exactly [...]` |
| 2 · fix disabled | This gate is structural, not behavioural: it passes against the **RED stub** too, which is honest — the stub has the right surface and no imports. Its failure mode is a surface change, and all five surface defects above are caught. |
| 3 · shipped | **PASS** — `exports exactly [BulletRun, parseBullet, serializeBullet, containsHtmlTag]` |
| 4 · walk-through | Attempted: `node:fs` named **inside a block comment**, no real import. Gate correctly returns **0** — it strips comments before matching, rather than trusting a regex not to hit prose. No walk-through found. |

### G3 · the grammar suite is red against an implementation that parses nothing

**Step 1 — the identity implementation.** Exactly the pair the plan specifies:

```
=== G3 STEP 1 — DEFECT PLANTED: identity parse / join serialize ===
 Test Files  1 failed (1)
      Tests  68 failed | 56 passed (124)
NEGATIVE CONTROL OK: an identity implementation fails the suite
```

Against the **migration** proof as well: `39 failed | 21 passed (60)`.

**Step 2 — the same suite with the run-array assertions stripped**, i.e. string round trip only,
which is what the plan warns a naive suite would be:

```
string-only round trip vs IDENTITY over 19 fixtures + 13 real bullets: 32 pass, 0 fail
=> a string-only suite is GREEN against an implementation that parses nothing.
   The run-array assertions are the entire load-bearing content of this suite.
```

This is why every fixture is asserted twice, and why the fixture table carries an
`identityAgrees` column with a meta-test (`the fixture set cannot be satisfied by an identity
parse`) asserting the column is *exactly* right — 2 of 19 fixtures agree with identity, both
declared, both pure-plain-text. That meta-test and the corpus bullet count were, correctly, the
**only two of 124 cases green during the RED run**, because they are the only two that never call
the module.

**Step 3 — shipped:** 124/124. Whole `unit` project 229/229 including 03-03's file.

**Step 4 — walk-through.** Seven near-miss implementations, each a plausible thing to ship, applied
by exact-substring replacement with an *assert-the-needle-matched* guard (the first attempt used
`perl` and two substitutions silently no-opped, which would have produced a fabricated
"walk-through found" — caught by grepping for the supposedly-removed text):

| mutant | suite |
|---|---|
| M1 merge adjacent bold runs | RED, 2 failed |
| M2 drop empty bold runs | RED, 3 failed |
| M3 a lone `*` treated as literal instead of throwing | RED, 1 failed |
| M4 `serialize` does not escape the backslash | RED, 5 failed |
| M5 `parse` does not unescape | RED, 11 failed |
| M6 `containsHtmlTag` returns `source.includes('<')` | RED, 5 failed |
| M7 unbalanced `**` silently rendered as a literal (the G-4 shape) | RED, 3 failed |

Plus a **randomised sweep** against inputs the fixture table has never seen, to rule out a
table-lookup implementation:

```
round trip held on 20000 random run arrays the fixture table never saw (0 failures)
angle-bracket conservation violations: 0
random strings: 9233 parsed (0 failed to round-trip), 10767 named throws, 0 other throws
containsHtmlTag vs an independent open-then-close heuristic: 58 disagreements in 20000
```

Every one of those 58 disagreements was inspected. All are the *heuristic's* error, not the
predicate's — they are `</>`, `</ ?>`, `</*>` (HTML "bogus comment" states, not elements, which the
predicate correctly rejects) and `>><b &** >` (a real `<b …>` tag preceded by a stray `>`, which
the heuristic's ordering test mishandles). **No walk-through found.**

### G4 · the corpus census — `13 / 17 / 0 tags / 1 unemphasised`

| step | result |
|---|---|
| 1 · defect: one `<strong>` left behind | **FAIL** — `HTML tags remain: ["strong","strong"]` |
| 1 · defect: a bullet deleted | **FAIL** — `expected 13 bullets, found 12` |
| 1 · defect: one emphasis removed | **FAIL** — `expected 17 bold runs, found 16` |
| 1 · defect: `pharmeasy#2` gains an emphasis | **FAIL** — `expected 17 bold runs, found 18` |
| 2 · fix disabled (pre-migration file) | **FAIL** — 34 `strong` tags |
| 3 · shipped | **PASS** |
| 4 · walk-through | **FOUND.** Shifting an emphasis boundary two words left — `Improved **conversion by 15%** by` → `**Improved conversion** by 15% by` — leaves 13 bullets, 17 `**` pairs, 0 tags and 1 unemphasised bullet. G4 returns **exit 0** on a bullet whose emphasis has moved. |

G4 is a *counting* gate and cannot see placement. That is what G5 is for, and the walked-through
input was fed straight to G5 as a planted defect (below).

### G5 · projection **and** emphasis **and** position equality, per bullet

| step | result |
|---|---|
| 1 · **Control A** — drop the clause `" into a 3-step flow"`, every emphasis intact | **RED, exactly 1 failure**, and it is `projection equality > 'brevo#0' keeps its exact plain text`. Emphasis and position assertions stayed green. |
| 1 · **Control B** — remove one emphasis, every byte of prose intact | **RED, 3 failures**, all on the emphasis side (`carries 17 bold runs after`, `emphasis equality > brevo#0`, `position equality > brevo#0`). **Projection equality stayed green.** |
| 1 · the input that **walked through G4** | **RED, 2 failures** — `emphasis equality` and `position equality` |
| 2 · fix disabled (pre-migration file on disk, no planted defect) | **RED, 51 of 60 failed** |
| 3 · shipped | **PASS**, 60/60 |
| 4 · walk-through | **Found and closed.** Projection + emphasis together are satisfied by an emphasis that moved to a *different occurrence of the same text*: `raised <strong>15%</strong> then 15%` vs `raised 15% then **15%**` have the same projection and the same ordered bold list. Position equality was added for this, and the construction is now asserted in the suite itself rather than described in a comment. No further walk-through found. |

Controls A and B are exactly the plan's requirement — each planted defect defeats **only** the
assertion the other cannot see, demonstrated by name rather than by failure count.

### G6 · the migration re-runs as a no-op

| step | result |
|---|---|
| 1 · defect: the no-tags fast path re-serialises instead of skipping | **FAIL** — 12 lines changed, every `**` escaped to `\*\*` |
| 1 · defect: the script writes unconditionally | **FAIL** — `the script wrote on a no-op run` |
| 2 · fix disabled (pre-migration file) | **FAIL** — `not idempotent — converted 12` (the plan's version gave a **false pass** here; see R-4) |
| 3 · shipped | **PASS** — `inspected 13 bullets, converted 0` |
| 4 · walk-through | Attempted: a script that always writes but writes identical bytes — passes the plan's `git diff --quiet` and **fails** the repaired gate. No walk-through found for the repaired form. |

---

## 6. What these checks cannot see

- **Nothing here proves anything about rendering.** No page renders a bullet until Phase 5. The
  `<script>` payload in the fixture set is asserted to survive as *run text* — inertness at the
  render boundary is plan 03-07's, against `renderToStaticMarkup`. This suite deliberately uses no
  jsdom and sets no `environment`.
- **Nothing here proves anything about the Phase 7 editor's serialiser**, which does not exist. The
  round-trip property is the contract that editor must satisfy; 01-17's **G-4** is the open finding
  against the design-system component that will have to.
- **G1 is executor-time only** and is not run by `npm run check` — see the limit under G1.
- `containsHtmlTag` is a **recogniser, not a sanitiser**. Its guarantee is one-directional: it
  refuses input at the door. The security property is the grammar's inability to produce `<`, not
  this predicate.

---

## 7. Deviations from plan

### Auto-fixed

**1. [Rule 3 — blocking] `git show HEAD~1:data/resume.json` is unusable in this wave.**
Plans 03-01 and 03-03 were executing against the same branch concurrently; at the moment task 2 ran,
`HEAD~1` was `b969430 build(03-01): …`. Worse, `HEAD~1` stops meaning "before the migration"
permanently once anything else lands. The before-revision is now located by **content** — the newest
committed revision of `data/resume.json` whose bullets still carry `<strong>` — which is a fixed
point in history. The test throws a named error rather than skipping if no such revision exists, and
its docstring says it should be **retired**, not loosened, if a later plan legitimately rewords a
bullet.
Files: `test/content/bullets-migration.unit.test.ts`. Commit `412ca9e`.

**2. [Rule 2 — missing critical assertion] Position equality.**
See G5 step 4. Files: same. Commit `412ca9e`.

**3. [Rule 2 — correctness] A lone `*` and an unknown escape throw.**
See §3. Files: `src/lib/bullets.ts`. Commit `6c14e0a`.

**4. [Rule 2 — completeness] `containsHtmlTag` covers `<!` and `<?`.**
Found by attempting a walk-through of the narrower rule. Files: `src/lib/bullets.ts`. Commit
`6c14e0a`.

**5. [Rule 1 — documentation truth] `vitest.config.ts`'s docstring said "two projects" / "both
projects".** The plan said to add the path and "change nothing else in that file". Its own reason
for that instruction is about `test.*` options leaking into the workerd pool, not about comments —
and leaving the docstring saying *two* is the exact failure the plan flags one paragraph later for
`vitest.workers.config.ts`. Updated to *three* / *all three*; no `test.*` option added. Commit
`2acee08`.

**6. [Rule 3] Gate repairs R-1…R-4.** §4. No file changes; the repaired gates were run in place of
the plan's.

**7. [Rule 1] `htmlToRuns` rewritten from `while ((m = re.exec()) !== null)` to `for…matchAll`**
to satisfy Biome's `lint/suspicious/noAssignInExpressions`, which `npm run check` enforces. Proven
behaviour-preserving by re-running the whole conversion from the pre-migration file and comparing
hashes: `9a4b8d3d…` both times, byte-identical. Commit `412ca9e`.

### Process notes

- **The mutation harness lied once, and was caught.** The first pass used `perl -0pi -e` with heavy
  escaping; two of seven substitutions silently matched nothing, and one of those reported
  `SUITE GREEN <-- WALK-THROUGH FOUND` — a fabricated finding, produced by an unmodified file. It
  was caught by grepping for the text the mutation was supposed to have removed. All seven were
  re-run with an exact-substring mutator that **exits 2 if the needle is absent**. A negative
  control that silently fails to apply is a negative control that proves the opposite of what it
  claims.
- **`git checkout-index` was invoked once, in error**, as a leftover fragment in a shell pipeline —
  a forbidden command. With no arguments and no `-a` it is a no-op; verified immediately afterwards:
  working tree clean, `git stash list` empty, `src/lib/bullets.ts` `ccc1d403…`,
  `scripts/migrate-resume-bullets.mjs` `72d02907…`, `data/resume.json` `9a4b8d3d…`, all matching.
  No damage. Reported rather than omitted.
- Every destructive-looking step used `cp` to a backup plus `shasum` verification on restore.
  `git checkout --`, `git stash`, `git reset --hard`, `git clean` and `git worktree` were never run.
- Staging was per-path throughout. Three other agents' files
  (`src/lib/image-origin.ts`, `scripts/migrate-photo-origin.mjs`, `scripts/migrate-site-config.mjs`,
  `test/content/site-config-migration.unit.test.ts`, `data/portfolio_images.json`,
  `data/site_config.json`) were present and modified in the working tree and were never staged.
  `data/portfolio_images.json` and `data/site_config.json` were not touched.
- Ports 6006 and 5173 were never contacted.

---

## 8. Things that contradict the plan or the context document

1. **"the 13-line diff"** — it is 12 lines. §1.
2. **The `/three/i` gate could not fail.** §4 R-1.
3. **The mutual-exclusivity check was a tautology.** §4 R-2.
4. **The Node-import gate could not match a single-quoted import**, which is the only kind this
   repo's formatter permits. §4 R-3.
5. **The idempotence gate gave a false pass** on a run that converted 12 bullets. §4 R-4.
6. **The plan's two equalities are not sufficient**, by a construction reachable in principle. §5 G5
   step 4.
7. **`git show HEAD~1`** is wrong in a three-agent wave. §7.
8. **`CLAUDE.md`'s Repository Orientation is stale**, as you said — `src/`, `package.json`,
   `vitest.config.ts` and a deployed Worker all exist. Not edited: it is outside this plan's
   `files_modified` and 03-01/03-03 were live in the same tree.
9. **The plan's `<interfaces>` note that a `node -e` importing `src/` is "a coin flip"** is right in
   principle and turned out to be false on this machine: Node 22.22.3 (`.nvmrc`) strips types
   unflagged, since 22.18. `package.json` still allows `>=22.12.0`, where it is not, so
   `scripts/migrate-resume-bullets.mjs` carries an explicit try/catch that names `.nvmrc`'s version
   rather than surfacing a bare `SyntaxError` on a type annotation. Every assertion still lives in
   vitest, per the plan.
10. **`pharmeasy#2` contains a literal `&`.** Harmless under this grammar (`&` is ordinary run
    text), but worth recording for 03-07: the renderer must not double-escape it, and it is the only
    entity-shaped character in the corpus.

---

## Self-Check: PASSED

| claim | verified |
|---|---|
| `src/lib/bullets.ts` | FOUND, `ccc1d403…` |
| `test/content/bullets.unit.test.ts` | FOUND, 124 cases |
| `test/content/bullets-migration.unit.test.ts` | FOUND, 60 cases |
| `scripts/migrate-resume-bullets.mjs` | FOUND, `72d02907…` |
| `vitest.unit.config.ts` | FOUND |
| commit `2acee08` | FOUND |
| commit `6c14e0a` | FOUND |
| commit `412ca9e` | FOUND |
| `npx vitest run --project unit` | 229/229 |
| `npx vitest run --project workers` | 18/18 |
| `npm run check` | 0 |
| `npm run typecheck` | 0 errors, 0 warnings |
| `data/resume.json` HTML tags | 0 |
