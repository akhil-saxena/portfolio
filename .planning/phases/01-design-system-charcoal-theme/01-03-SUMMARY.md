---
phase: 01-design-system-charcoal-theme
plan: 03
subsystem: testing
tags: [design-system, tokens, wcag, contrast, ci-gate, negative-control, aaa-1]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 01
    provides: src/themes/charcoal.css — the 49-token, two-block charcoal layer this plan parses and defends
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: the browser-side harness; its `blockOf`/`declarationsOf` confirmed the same parser shape reused here
provides:
  - "$DS/src/tokens.test.ts — the charcoal exhaustiveness mirror in BOTH directions, inside the existing `token layer` group"
  - "$DS/src/tokens.test.ts — a parse-integrity case that catches under-parse AND over-parse, not just a numeric floor"
  - "$DS/src/tokens.test.ts — `charcoal token contrast (WCAG)`: 54 cases, 48 tiered + 6 directional --ochre, with the case count itself asserted"
  - "criterion 3 as a CI gate: `npm test` goes red if muted text or the ochre accent regresses"
affects: [01-04 through 01-19 component fixes, 01-20 visual baselines, 06.1 cascade-layer + density work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contrast cases are built as DATA, then emitted one `it()` each — so the case count is assertable and a dropped token is a failure rather than a smaller green run"
    - "Ratios are measured at collection time and carried in the case NAME, so the verbose reporter is itself the evidence table"
    - "An unresolvable token becomes a failing case naming it, never a collection crash that would preempt the exhaustiveness mirror"
    - "Parse integrity is asserted structurally (exactly two column-0 closing braces; the light slice must not contain the dark selector), not only as a numeric floor"

key-files:
  created: []
  modified:
    - ../design-system/src/tokens.test.ts

key-decisions:
  - "The plan's own indented-closing-brace control does NOT truncate a two-block file — it OVER-parses, and a bare `size >= 25` floor passes it at 49 while both mirrors also pass. Two structural assertions were added so the control actually bites."
  - "The specified `charcoalLight.size === charcoalDark.size` line was kept verbatim and a raw declaration count added beside it, because `declaredIn` returns a Set and absorbs the duplicate-name typo that line is documented to catch"
  - "The 48 tiered cases assert their tier bar, not a 2dp pin; only the 6 --ochre cases are pinned at 2dp, because directionality is the thing being defended there"
  - "A third negative control (darkening --ochre) was executed beyond the plan's two, because criterion 3's ochre half was otherwise asserted but never proven to bite"

requirements-completed: [DS-01, DS-02, DS-03, DS-06]

# Metrics
duration: 16 min
completed: 2026-08-19
---

# Phase 1 Plan 03: Charcoal CI Gates Summary

**Criterion 3 is now a CI gate — 59 new assertions in `src/tokens.test.ts`, every one of them
proven to bite by an executed negative control — but the load-bearing result is that the plan's
own headline control did not work as written: indenting the charcoal light block's closing brace
**over**-parses rather than truncating, so the specified `size >= 25` floor sails through at 49
while both exhaustiveness mirrors also pass. The gate that was meant to prove the floor does its
job instead proved the floor could not have caught it.**

## Performance

- **Duration:** ~16 min (2026-08-19T02:34Z → 02:50Z)
- **Tasks:** 2 of 2
- **Files:** 0 created, 1 modified (`src/tokens.test.ts`, 242 → 488 lines, +246)
- **Suite:** 1444 → **1503** tests (+59: 4 from task 1, 55 from task 2). 115 files, all passing.
- **Negative controls executed:** 5 (the plan named 3)

## The 54-case breakdown

`describe("charcoal token contrast (WCAG)")` — every foreground token against **page, paper and
panel of its own mode**, resolved through `resolve()` rather than hardcoded, so remapping a
surface alias is caught instead of silently measured against a stale literal.

| | page (`--cream`) | paper (`--cream-2`) | panel (`--cream-3`) |
|---|---|---|---|
| light | `#f4f1ea` | `#fbf9f4` | `#ede9e0` |
| dark | `#161616` | `#1e1e1d` | `#242423` |

**48 tiered pass-assertions** — 8 tokens × 3 surfaces × 2 modes:

| Bar | Tokens | light page / paper / panel | dark page / paper / panel |
|---|---|---|---|
| **7:1 AAA** | `--ink-3` | 7.61 / 8.16 / **7.09** | 8.18 / 7.54 / **7.02** |
| | `--ink-4` | 7.61 / 8.16 / **7.09** | 8.18 / 7.54 / **7.02** |
| | `--ochre-d-strong` | 7.55 / 8.10 / **7.03** | 8.16 / 7.53 / **7.01** |
| **4.5:1 AA** | `--ink` | 15.71 / 16.84 / 14.62 | 14.65 / 13.51 / 12.58 |
| | `--ink-2` | 9.12 / 9.78 / 8.50 | 10.51 / 9.69 / 9.02 |
| | `--ochre-d` | 5.22 / 5.60 / **4.86** | 6.02 / 5.55 / 5.17 |
| **3:1 SC 1.4.11** | `--wire` | 3.44 / 3.68 / **3.20** | 3.72 / 3.43 / **3.20** |
| | `--focus` | 5.22 / 5.60 / 4.86 | 6.02 / 5.55 / 5.17 |

**6 directional `--ochre` fail-assertions**, pinned at 2dp in *both* directions:

| Mode | page | paper | panel |
|---|---|---|---|
| light | 3.52 ❌ | 3.78 ❌ | 3.28 ❌ |
| dark | **4.56 ✅** | 4.20 ❌ | 3.91 ❌ |

`--ochre` clears the 4.5:1 text bar on **exactly one of six surfaces**. That is asserted as the
contract, not tolerated as a defect.

**The case array's length is asserted to be 54** in its own `it`, so a token dropped from a tier
list is a failure rather than a smaller green run. Reporter confirms **55** matching lines
(54 cases + the count assertion) against the plan's `>= 5` floor.

The three tightest values the plan named all reproduce exactly: **7.01** (dark
`--ochre-d-strong` on panel), **4.86** (light `--ochre-d` on panel), **3.20** (`--wire` on panel,
both modes). In both modes the binding constraint is the **panel**.

### Do all 54 reproduce the contract to 2dp?

**52 of 54 reproduce a contract-stated value exactly to 2dp. Zero discrepancies.** The remaining
two are not discrepancies — they are values the contract never stated:

- `00-THEME-API.md` line 246 records light `--ochre` as `3.52 ❌ as text | — | —`: the paper and
  panel columns are literally em-dashes. **Light `--ochre` on paper (3.78) and on panel (3.28) are
  measured here for the first time.** Both fail the text bar, so both are consistent with the
  fill-only rule and neither weakens it; they are recorded so the register covers all six
  surfaces rather than four.
- `--ink-4` carries no ratios of its own in either the contract or `charcoal.css` — it is
  documented only as an alias of `--ink-3`. Measured identical on all six surfaces, which is the
  alias holding.

An independent cross-check fell out of control D: darkening `--ochre` to `#8c591f` made the dark
page read **3.07**, which is exactly the figure `00-THEME-API.md` line 353 records for light
`--ochre-d` `#8C591F` on a dark surface. The reused `srgb`/`luminance`/`contrast` helpers agree
with the contract's own arithmetic on a value that was never transcribed into this test.

## Negative controls — all five executed, none merely described

`src/themes/charcoal.css` SHA-256 was **`eb151bbc5b63b55dc6bacafd1204775a1129a121ef98d329f950a6f86e9211cb`
before every break and after every restore — five breaks, five byte-identical restores**, and it
equals the value 01-01 and 01-02 both recorded, so the file has not drifted across three plans.
Every restore used `git checkout -- src/themes/charcoal.css`; never a stash, never a reset,
never a clean. Final `git status --porcelain src/themes/charcoal.css` is empty.

### Control A — delete a declaration from the charcoal light block (task 1)

Deleted `\t--rule: #d5cfc2;` (light). `git diff --stat` confirmed **1 file changed, 1 deletion(-)**,
no insertions. **2 tests went red**, the mirror naming the exact token:

```
FAIL  token layer > declares a charcoal light value for every token charcoal dark overrides
AssertionError: expected [ '--rule' ] to deeply equal []

FAIL  token layer > declares the same number of charcoal tokens in both blocks
AssertionError: expected 48 to be 49
```

| | value |
|---|---|
| SHA before | `eb151bbc…9211cb` |
| SHA after restore | `eb151bbc…9211cb` |
| Equal? | **Yes — byte-identical** |

### Control B1 — the plan's literal edit: indent the light block's closing brace by one space

**This is the control the plan called "the one that matters", and it does not do what the plan
says it does.** `git diff` showed exactly `-}` / `+ }`. Result — **the numeric parse floor passed**:

```
FAIL  token layer > parses a whole charcoal block rather than a truncated one
AssertionError: charcoal.css must have exactly one closing brace at column 0 per block:
                expected 1 to be 2

FAIL  token layer > declares the same number of charcoal tokens in both blocks
AssertionError: expected 98 to be 49
```

Both mirrors passed. `charcoalLight.size` was **49**, comfortably over the floor of 25. The
mechanism, verified before the edit was made: `block()` closes on the first `\n}`, so with the
light brace indented the next column-0 brace is the **dark block's**, at line 381. The light
slice therefore swallows the dark block whole and returns light ∪ dark — which, because the
invariant holds, is the same 49 names. Set difference against itself is empty in both
directions; size parity is 49 === 49. **A bare `size >= 25` floor cannot fail on this input.**

It goes red only because of the two structural assertions added under Rule 2 (see Deviations):
the column-0 closing-brace count, and the light-slice-must-not-contain-the-dark-selector check.
Both live in the `parses a whole charcoal block rather than a truncated one` case, so the
plan's `<done>` condition — the indented brace tripping the parse-integrity case rather than
passing silently — is met, by an assertion the plan did not specify.

| | value |
|---|---|
| SHA before | `eb151bbc…9211cb` |
| SHA after restore | `eb151bbc…9211cb` |
| Equal? | **Yes — byte-identical** |

### Control B2 — a genuine truncation, so the numeric floor itself is proven to bite

Because B1 exonerated rather than exercised the floor, a second parse-corruption control was run:
a nested at-rule inside the light block whose closing brace lands at column 0 (the other cause
`charcoal.css`'s own header warns about). **3 tests went red, the floor among them, with its
message in words:**

```
FAIL  token layer > parses a whole charcoal block rather than a truncated one
AssertionError: charcoal light is not a small theme, it is a TRUNCATED PARSE: check
src/themes/charcoal.css for an indented closing brace or a nested rule inside the charcoal
block. block() closes on the first newline-plus-brace at column 0, so a stray one truncates
the slice.: expected 4 to be greater than or equal to 25

FAIL  token layer > declares a charcoal light value for every token charcoal dark overrides
AssertionError: expected [ '--font-mono', '--font', …(43) ] to deeply equal []

FAIL  token layer > declares the same number of charcoal tokens in both blocks
AssertionError: expected 4 to be 49
```

The light block parsed **4** declarations instead of 49. Floor red at `4 >= 25`.

| | value |
|---|---|
| SHA before | `eb151bbc…9211cb` |
| SHA after restore | `eb151bbc…9211cb` |
| Equal? | **Yes — byte-identical** |

### Control C — `#6E6A5E` substituted for light `--ink-3` (task 2, AAA-1)

Substituted lowercase `#6e6a5e` (the file's convention; `parseInt(h,16)` is case-insensitive, so
case ≠ value) for the **first** occurrence only, confirmed by grep: line 135 changed, line 304's
dark `#b1aea8` untouched.

**Exactly 6 assertions failed — the number the plan predicted — at exactly the predicted ratios:**

| # | Failing case | ratio |
|---|---|---|
| 1 | `charcoal light --ink-3 on page clears 7:1 (AAA)` | **4.79** |
| 2 | `charcoal light --ink-3 on paper clears 7:1 (AAA)` | **5.14** |
| 3 | `charcoal light --ink-3 on panel clears 7:1 (AAA)` | **4.46** |
| 4 | `charcoal light --ink-4 on page clears 7:1 (AAA)` | **4.79** |
| 5 | `charcoal light --ink-4 on paper clears 7:1 (AAA)` | **5.14** |
| 6 | `charcoal light --ink-4 on panel clears 7:1 (AAA)` | **4.46** |

`Tests  6 failed | 65 passed (71)`. **4.79 page / 5.14 paper / 4.46 panel** — and the panel
failure is the one that matters. Worth recording precisely, because it affects how the count
should be read on any future re-run: the 6 is **3 surfaces × 2 tokens**, and the second token is
`--ink-4`, which is `var(--ink-3)`. It is 6 aliased readings of 3 independent measurements, not
6 independent ones. If `--ink-4` ever stops aliasing `--ink-3`, this control yields 3, and that
would be a change in the palette rather than a defect in the loop.

| | value |
|---|---|
| SHA before | `eb151bbc…9211cb` |
| SHA after restore | `eb151bbc…9211cb` |
| Equal? | **Yes — byte-identical** |

### Control D — darken `--ochre` (not requested; run because criterion 3 demands it)

The plan asserts the directional `--ochre` rule but never asks for it to be proven. Since this
plan **is** criterion 3 and the objective is explicit that this phase has already shipped two
gates that could not fail, the ochre half was executed too: `--ochre` darkened to `#8c591f` in
**both** blocks — literally the "darken it to make the lint pass" edit Rule C-1 exists to
forbid. **6 assertions failed:**

```
× charcoal light  --ochre fails the 4.5:1 text bar on page  = 5.22
× charcoal light  --ochre fails the 4.5:1 text bar on paper = 5.60
× charcoal light  --ochre fails the 4.5:1 text bar on panel = 4.86
× charcoal dark   --ochre clears the 4.5:1 text bar on page  = 3.07
× charcoal dark   --ochre fails the 4.5:1 text bar on paper = 2.83
× charcoal dark   --ochre fails the 4.5:1 text bar on panel = 2.64
```

The three light cases are the proof: they now **pass** the 4.5:1 text bar and went red *for
passing it*, because the assertion is directional. A one-sided `toBeLessThan(4.5)` would have
waved this edit straight through. SHA before/after restore: `eb151bbc…9211cb` = `eb151bbc…9211cb`,
**equal**.

## Accomplishments

- **Both exhaustiveness directions exist, and neither was dropped as duplicative.** The
  pre-existing `tokens.css` dark ⊆ light case (which caught `--rule-strong` shipping dark-only)
  still runs untouched; charcoal now has its own light ⊆ dark mirror *and* its own dark ⊆ light
  mirror. The light-only mechanism is written into the file in prose — a (0,2,0) tie with
  `:root.dark` decided by emission order, producing two *different* wrong answers, with light
  mode never breaking, which is why the class of bug ships.

- **The parser is now guarded as well as the invariant.** Under-parse (numeric floor, ≥25 per
  block), over-parse (light slice must not contain the dark selector), and structure (exactly
  two column-0 closing braces — `charcoal.css`'s **own** stated contract, quoted from its
  header). Each of the three is separately proven to bite.

- **54 contrast cases, each a named `it`.** The ratio is measured at collection time and carried
  in the case name, so `--reporter=verbose` prints the whole evidence table and a regression is
  legible without opening the file. An unresolvable token degrades to a *failing case naming it*
  rather than a collection crash — a crash would preempt the exhaustiveness mirror, which is the
  assertion that actually diagnoses a missing declaration.

- **AAA-1 is closed, with the gate proven to bite on the value it supersedes**, at the exact
  count and the exact three ratios the finding predicted.

- **All four sibling gates green at the plan boundary:** `npm test` 115 files / **1503** tests,
  `npm run check` 344 files no fixes applied, `npm run typecheck` both projects, `npm run
  css:check` 74 files round-trip byte-exact.

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 — exhaustiveness mirror + parse integrity | `bf36975` | `test(tokens): assert the charcoal exhaustiveness invariant in both directions` (+94) |
| 2 — three-surface contrast register | `bca2713` | `test(tokens): add the charcoal three-surface contrast register` (+152) |

Branch `charcoal-theme` in `../design-system`, now **6 commits ahead** of that repo's `main`.
Author `Akhil Saxena <saxena.akhil42@gmail.com>` on both, matching the branch's existing four.
**No AI attribution** in any subject, body or trailer across all six — verified programmatically
(`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` → `0`).

`src/tokens.test.ts` SHA-256 was identical before and after each commit, so the `lint-staged`
pre-commit hook reformatted nothing: **the bytes that were tested are the bytes that were
committed.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Correctness] The specified parse floor cannot fail on the control the plan names it for**

- **Found during:** Task 1, reasoning through control B before running it — then confirmed by
  simulating the edit in a scratch script *before* touching the repository.
- **Issue:** The plan specifies `charcoalLight.size >= 25` and `charcoalDark.size >= 25`, and
  states that indenting the light block's closing brace by one space will make it go red "rather
  than (a) silently passing". In a **two-block** file it does the opposite. `block()` closes on
  the first `\n}`; with the light brace indented, the next column-0 brace is the dark block's, so
  the light slice extends *through* the dark block and `declaredIn` returns light ∪ dark. Because
  the exhaustiveness invariant holds, that union is the **same 49 names**. Measured:
  `light set size: 49 -> floor >= 25 would PASS (over-parse, not truncation!)`. Both mirrors also
  pass — a set differenced against itself is empty. The floor is a one-sided bound and the failure
  mode is on the other side.
- **Why it is severe:** this plan's own objective states the phase has already shipped two gates
  that could not fail and instructs that a third must not be added. As specified, the parse floor
  would have been the third — worse, it would have carried a comment and a failure message
  asserting it defends against precisely the edit it cannot see.
- **Fix:** the specified floor was **kept verbatim** (it is the right assertion for a genuine
  truncation, and control B2 proves it) and two structural assertions were added beside it in the
  same case: (i) `charcoal.css` must contain exactly **two** lines beginning with a closing brace
  at column 0 — which is not an invention, it is the file's own header contract, and it is exactly
  the precondition `block()` depends on; (ii) the light slice must not contain the dark selector,
  a direct statement that the slice stopped where it should. Both are commented with the measured
  over-parse mechanism so the next reader does not "simplify" them away.
- **Verified:** B1 → red on both new assertions, floor green (documented above). B2 → red on the
  floor with its truncated-parse message, plus red on the brace count. Neither corruption passes
  silently.
- **Committed in:** `bf36975`

**2. [Rule 2 — Correctness] `size === size` cannot catch the duplicate-name typo it is documented to catch**

- **Found during:** Task 1, writing case (d).
- **Issue:** The plan specifies `charcoalLight.size === charcoalDark.size` and justifies it as
  catching "a same-name-twice typo in one block [that] would slip past both [mirrors]". It cannot.
  `declaredIn` returns a `Set`, so a name declared twice collapses to one entry *before* the
  comparison; the size is unchanged and the assertion is green. Given (a) and (b) pass, this line
  is mathematically incapable of failing on its own.
- **Fix:** the specified line was **kept verbatim**, and a `declarationCount()` helper added
  beside `declaredIn()` that counts raw matches without deduplicating, with both blocks asserted
  to have raw count === set size. That is the assertion that actually catches a duplicate. The
  comment states plainly why the line above it is not enough, so the pair is not later collapsed
  back into one.
- **Bonus, unplanned:** this is also what caught the B1 over-parse independently, reporting
  `expected 98 to be 49` — 98 being light's 49 plus dark's 49.
- **Committed in:** `bf36975`

**3. [Rule 2 — Correctness] The directional `--ochre` assertion was never required to be proven**

- **Found during:** Task 2, after the `#6E6A5E` control.
- **Issue:** `must_haves.truths` requires "tokens.test.ts fails if someone darkens `--ochre` to
  make a lint pass", and T-03-03 dispositions it `mitigate`. The plan's `<manual>` block requires
  evidence only for the `#6E6A5E` control. So the ochre half of criterion 3 would have shipped
  asserted-but-unproven — the exact shape of the two gates the objective says already shipped
  unable to fail.
- **Fix:** control D executed (above). 6 failures, and critically the three light cases went red
  *for passing* the text bar, which is the signature of a directional assertion working.
- **Committed in:** no code change — the assertion as written was already correct; this was
  verification the plan omitted.

**4. [Rule 3 — Blocking] `resolve()`'s `:root {` fallback throws on `charcoal.css`**

- **Found during:** Task 2, designing the contrast register.
- **Issue:** the shared `resolve()` falls back to `read(":root {")` when a token is absent from
  the requested selector, and `charcoal.css` has **no** `:root {` block — its selectors are
  `:root[data-brand="charcoal"]`. `block()` would throw `selector not found`. Today the throw is
  unreachable (`??` short-circuits and charcoal is exhaustive), but the moment a token goes
  missing — the regression this whole file exists to catch — the throw happens at **collection**
  time and takes the entire test file down, including the exhaustiveness mirror that would have
  named the missing token.
- **Fix:** a local `measure()` wrapper catches and returns the message, and the case body
  re-throws it. A missing token becomes one clearly-named failing case per surface instead of a
  file-level collection error. The shared `resolve()` was **not** modified — it is correct for
  `tokens.css`, which does have a `:root {` block, and changing it would alter the default
  theme's behaviour for no reason.
- **Committed in:** `bca2713`

---

**Total deviations:** 4 auto-fixed (3 × Rule 2 correctness, 1 × Rule 3 blocking). **No gate was
weakened; every specified assertion was kept verbatim and strengthened alongside.** No
architectural change, no scope widening. Every change is inside the plan's declared
`files_modified` — in fact inside a single file, `src/tokens.test.ts`; `src/themes/charcoal.css`
was declared but ends the plan byte-identical to how it started, as intended (it was only ever
broken and restored).

## Issues Encountered

- **The orchestrator's `check-no-ivory.sh` case-sensitivity warning did not apply to this plan.**
  That script is a Phase 0 reference implementation living in the portfolio at
  `.planning/phases/00-design-ideation/scripts/playground-measurements/check-no-ivory.sh`; it does
  **not** exist in `$DS` and plan 01-03 touches only `src/tokens.test.ts`. Nothing was ported, so
  no `-i` was added anywhere. **The warning stands unaddressed for whichever plan does port it**
  — line 142's `grep -cE` against uppercase `#8D8779` / `#C4BDAD` will still false-fail against
  the lowercase `charcoal.css` (both constants confirmed present in lowercase at lines 137 and
  180). It is also a `grep -c`, which counts lines rather than occurrences, per protocol §7.
- **The 2dp pin required literal `4.2`, not `4.20`.** `Number((4.2043).toFixed(2))` is `4.2`, so
  `toBe(4.20)` is fine but reads misleadingly; the table is commented to say the value is 4.20.
- **`npm test` prints `Error: Not implemented: navigation (except hash changes)`** from a jsdom
  environment in an unrelated suite. Pre-existing, not a failure — 115/115 files pass. Untouched,
  and not this plan's to fix (scope boundary).
- **The `lint-staged` pre-commit hook takes its own `git stash`** and cleaned up after itself both
  times, as 01-01 and 01-02 both recorded. `src/tokens.test.ts`'s SHA-256 was identical before and
  after each commit, so no committed byte differs from what was tested.
- **No `PIPESTATUS` anywhere**, per the zsh trap. Every gate exit code was captured with
  `if cmd; then … fi` or `cmd || { …; exit 1; }`. Both of the plan's verify blocks were run
  **verbatim**, unmodified, and both passed (`charcoal contrast cases reported = 55` against the
  `>= 5` floor). No server was started; port 6006 was never touched.
- **`biome` was run with `$DS` as cwd** in every invocation (`cd "$DS" && npm run check`), never
  from the portfolio root. `npx tsc` was never run bare — only `npm run typecheck`.

## Findings raised (not fixed)

Per protocol §10, recorded here only. **No row was added to `00-FINDINGS.md`.**

1. **A one-sided parse floor is a general anti-pattern, and it is about to be load-bearing.**
   Deviation 1 is specific to this plan, but the *shape* generalises: `block()`'s
   `indexOf("\n}")` fails in two opposite directions, and any single-bound guard covers one.
   This matters immediately for **Phase 06.1**, which is scheduled to add `@layer` (D-28) —
   wrapping `charcoal.css`'s blocks in a cascade layer indents both closing braces, which is
   exactly the over-parse case. The brace-count assertion added here will fail loudly when that
   happens, which is the desired outcome, but 06.1 should expect it and fix `block()` rather than
   relax the count. The same `\n}`-terminated parser is used by `tests/visual/brand-probe.spec.ts`
   (01-02) and by the Phase 0 measurement scripts, and neither has an equivalent guard.
2. **`--ink-4` being an alias makes 6 of the 54 cases derived rather than independent.** They are
   worth keeping — the alias holding *is* an assertion, and the contract explicitly relies on
   "the two cannot diverge by mode" — but a future reader tuning the case count should know that
   48 tiered cases cover **7** independently-valued tokens, not 8.
3. **`--ink-5` is measured by nothing.** It is documented in `charcoal.css` as decorative-only
   (light 3.17 / 3.40 / 2.95, dark 3.52 / 3.25 / 3.02) and correctly excluded from every tier
   here, since it is explicitly NEVER text and it sits below the 3:1 non-text floor on two
   surfaces. But nothing asserts that it *stays* decorative — no gate would catch a component
   adopting `--ink-5` as a text colour. That is a component-side lint, not a token-side one, so
   it belongs with the component plans (01-09 … 01-19) rather than here.
4. **The contract does not state light `--ochre` on paper or panel.** `00-THEME-API.md` line 246
   leaves both columns as em-dashes. This plan measured them (3.78, 3.28) and both fail the text
   bar, so the fill-only rule is unaffected — but the contract's own table is now less complete
   than the test that implements it. Worth a one-line fill-in whenever `00-THEME-API.md` is next
   edited for another reason.

## Verification Performed

- `npx vitest run src/tokens.test.ts --reporter=verbose` → **71 passed** (12 pre-existing + 4 from
  task 1 + 55 from task 2), all 54 contrast case names printed with their measured ratios.
- Both of the plan's `<automated>` verify blocks run **verbatim**: task 1's → `OK tokens.test.ts
  green with charcoal cases reported`; task 2's → `charcoal contrast cases reported = 55`, then
  `OK all four sibling gates green`.
- Five negative controls executed and observed red with the expected failure counts, token names
  and ratios; every restore SHA-256-verified byte-identical; green re-confirmed after each.
- All four sibling gates run both individually (with output visible) and as the plan's single
  guarded expression.
- Sibling tracked-clean gate re-asserted at plan start and after each commit — empty apart from
  the permitted `?? design_handoff/design_handoff_ds_overview/`.
- `$DS/.planning/` was never read for writing and never written to. This SUMMARY is the only file
  this plan wrote in the portfolio repo; the concurrent Phase 2 agent's edits to
  `.planning/config.json`, `vitest.workers.config.ts` and `test/` were left untouched and unstaged.

## Next Phase Readiness

**Ready.** Criterion 3 is a CI gate and every assertion behind it has been shown to fail on the
edit it exists to forbid.

- **01-04 onward** — `npm test` now fails on any charcoal token regression, so component work has
  a real safety net rather than a nominal one. Adding tokens to `charcoal.css` is safe: the parse
  floor is a floor, and the mirrors are name-set comparisons.
- **Adding a token to only one charcoal block will now fail CI**, naming the token. Adding one to
  both is free.
- **Anyone editing `src/themes/charcoal.css` structurally** (nesting, wrapping, `@layer`) will
  trip the brace-count assertion. That is intentional — see finding 1, and read it before
  "fixing" the assertion.
- **06.1** — read finding 1 before implementing D-28. The `@layer` wrap is the over-parse case.
- **No blockers.**

---
*Phase: 01-design-system-charcoal-theme*
*Completed: 2026-08-19*

## Self-Check: PASSED

Verified after writing this SUMMARY:
- `$DS/src/tokens.test.ts` and `$DS/src/themes/charcoal.css` both exist; commits `bf36975` and
  `bca2713` both exist on `charcoal-theme`, which is **6 ahead** of the sibling's `main`
- `src/themes/charcoal.css` ends this plan at SHA-256 `eb151bbc…9211cb`, **unchanged** from its
  pre-plan value and from the values 01-01 and 01-02 recorded; `git status --porcelain` on it is
  empty
- the `check-no-ivory.sh` claim was re-read from source, not transcribed: line 141 is `grep -ciF`
  (case-insensitive), line 142 is `grep -cE` (case-**sensitive**) — and `charcoal.css` carries
  `#8d8779` at line 137 and `#c4bdad` at line 180, both lowercase, so the false-fail is real
- the "contract does not state light `--ochre` on paper/panel" claim was re-read from
  `00-THEME-API.md` line 246, which shows `3.52 ❌ as text | — | —`
- `npx vitest run src/tokens.test.ts` re-run at self-check time → **71 passed**
- **no path under `.planning/` was touched in either repository** by either task commit; both are
  `src/tokens.test.ts` only
- this SUMMARY is the only file this plan wrote in the portfolio repo — the concurrent agent's
  `.planning/config.json`, `vitest.workers.config.ts` and `test/` were never staged
