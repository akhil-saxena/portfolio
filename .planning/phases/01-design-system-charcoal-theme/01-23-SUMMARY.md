---
phase: 01-design-system-charcoal-theme
plan: 23
subsystem: design-system / monochrome brand
tags: [rename, public-api, visual-baselines, changelog, planning-hygiene]
requires: ["01-22"]
provides:
  - "brand renamed charcoal -> monochrome before anything published"
  - '`data-brand="monochrome"` as the public brand attribute'
  - "`./themes/monochrome.css` and `./fonts/monochrome.css` as the public subpaths"
  - "`DS_BRAND=monochrome` as the a11y sweep's brand switch"
  - "504 visual baselines renamed with zero re-capture"
affects:
  - "../design-system/src/themes/monochrome.css"
  - "../design-system/src/fonts/monochrome.css"
  - "../design-system/.storybook/preview.tsx"
  - "../design-system/.storybook/test-runner.ts"
  - "../design-system/tests/visual/storybook.spec.ts-snapshots (504 renamed)"
  - "../design-system/CHANGELOG.md (2.0.0-beta.1 entry only)"
  - "../design-system/README.md"
  - ".planning/ROADMAP.md, STATE.md, ADR-001, ADR-002"
tech-stack:
  added: []
  patterns:
    - "case-preserving rename with a per-file assert-one-occurrence guard"
    - "git mv for every rename so history follows, proven by a blob-hash multiset"
    - "completeness gate (zero old references) rather than a happy-path gate"
key-files:
  created:
    - "../design-system/src/themes/monochrome.css (renamed from charcoal.css)"
    - "../design-system/src/fonts/monochrome.css (renamed from charcoal.css)"
  modified:
    - "../design-system/.storybook/{preview.tsx,test-runner.ts}"
    - "../design-system/src/{tokens.css,primitives.css,tokens.test.ts,story-mode.test.ts,visual-baseline-coherence.test.ts}"
    - "../design-system/tests/visual/*.spec.ts (17 specs + computed.ts)"
    - "../design-system/{CHANGELOG.md,README.md}"
    - ".planning/{ROADMAP.md,STATE.md,ADR-001-admin-scope.md}"
decisions:
  - "README.md was renamed too, though the plan did not list it: package.json's `files` ships it, so leaving it documenting `themes/charcoal.css` would have shipped a broken subpath in the published README (Rule 2)"
  - "`src/tokens.css`'s `sourced from Cairn (neutral charcoal)` became `(neutral dark greys)` rather than `(neutral monochrome)`, because that phrase describes a COLOUR, not the brand, and renaming it would have been false"
  - "ROADMAP's 00-04 line stopped naming `theme-charcoal.css` / `fonts-charcoal.css` and points at `theme-prototype/` instead — those Phase 0 filenames are deliberately not renamed, so the reference could be neither renamed (dangling) nor kept (gate)"
  - "STATE stopped naming the sibling branch and points at `01-SIBLING-PROTOCOL.md` §2 — the branch keeps its name deliberately, and the protocol document is historical and exempt"
  - "`data-display-tabs--narrow-overflow--monochrome` was NOT re-recorded despite failing: it is a stale baseline created by 01-22, and moving it is the developer's call"
metrics:
  duration: "~1h"
  completed: "2026-08-25"
  commits: 2
  gates: "build/test/check/typecheck/css:check/test:a11y(both brands) all 0; test:visual 1 (two stale baselines, both pre-existing, neither re-recorded)"
---

# Phase 1 Plan 23: Monochrome Summary

The brand is now **monochrome** everywhere a consumer, a build or a test can see it, and still
**charcoal** everywhere the record says what was true on a date. Nothing published, so the rename cost
nothing: `package.json` is still `1.11.4`, `latest` has not moved, the branch is unmerged.

`$DS` branch **`charcoal-theme`** (kept, deliberately), `a2b6c00` (88 ahead) → **`04e7e38`** (89 ahead).
Portfolio `main` → **`d0c0753`**. 543 files changed in the sibling, 4 in the portfolio.

| repo | commit | what |
|---|---|---|
| `$DS` | `04e7e38` | `refactor(theme): rename the charcoal brand to monochrome` — 37 modified, 506 renamed |
| portfolio | `d0c0753` | `docs(01-23): rename the brand to monochrome in the forward-looking documents only` |

---

## 1. The occurrence count: 621 found, against the 584 measured — reconciled, not material

The plan's **37 files** is exactly right. The **584** is a different denominator from the same tree.

| scope | files | occurrences (case-insensitive) |
|---|---:|---:|
| `src` + `.storybook` + `tests` + `scripts`, excluding PNGs | **37** | **573** |
| the above **plus** `CHANGELOG.md` and `README.md` | 39 | **621** |

Broken down by case across all 39 tracked non-PNG files: `charcoal` **544**, `CHARCOAL` **40**,
`Charcoal` **37**.

**584 = 544 + 40.** The measurement counted the lowercase and uppercase forms across the whole tree and
missed the 37 title-case ones — `Charcoal` at the head of a sentence or in a Storybook toolbar label.
That the residual is exactly 37, the same number as the file count, is a coincidence and it cost me a
few minutes to convince myself of that. Nothing had drifted since the measurement; the tree was
tracked-clean at 88 commits, as briefed.

**All 621 are accounted for:**

| where | count | what happened |
|---|---:|---|
| 37 code files | 572 | renamed, case-preserving |
| `src/tokens.css` | 1 | rephrased, not renamed — see §2 |
| `README.md` | 8 | renamed (a shipped artefact — see §2) |
| `CHANGELOG.md` | 40 | renamed — **all 40 were inside the `2.0.0-beta.1` entry** |

The changelog needed no surgical scoping in the end: `## 2.0.0-beta.1` spans lines 9–436 and the
historical `1.11.x` and earlier sections contain **zero** mentions. I scoped the edit to the entry
anyway and asserted the head and tail bytes were unchanged, because a gate that is only correct by
luck is not a gate.

---

## 2. Three references could be neither renamed nor kept

A blanket replace passes every count gate and produces two false statements and one dangling pointer.

**`src/tokens.css`: `sourced from Cairn (neutral charcoal)`.** That is a description of a *colour*,
inherited from Cairn's dark ramp, not a reference to the brand. Renaming it would have claimed Cairn
sourced the ramp from a design-system brand that did not exist when it was written. It is now
`(neutral dark greys)`.

**ROADMAP's 00-04 line named `theme-charcoal.css` and `fonts-charcoal.css`.** Those are real files in
`.planning/phases/00-design-ideation/theme-prototype/`, deliberately not renamed. Renaming the
reference dangles it; keeping it fails the gate. The line now points at the directory.

**STATE named the sibling branch `charcoal-theme`.** The branch keeps its name — it is merged and
deleted at 01-21 — so the literal could not be renamed, and the gate forbids keeping it. STATE now
points at `01-SIBLING-PROTOCOL.md` §2, which is historical, exempt, and still spells the branch out.
**This is the one place the plan's own gate forces information out of a forward-looking document**, and
it is worth Akhil knowing it happened rather than discovering it. The same constraint bites a second
time on the way out: STATE's own record of *this plan* cannot spell the old name either, so its new
decision and velocity entries say "the pre-rename brand name". The full text lives here instead.

**And one addition the plan did not list: `README.md`.** `package.json`'s `files` field is
`["dist","README.md","LICENSE"]`, so the README **ships**. Leaving it telling consumers to
`import "@akhil-saxena/design-system/themes/charcoal.css"` would have published documentation for a
subpath that resolves to nothing. Renamed under Rule 2. Its §"Respell the entry" passage, which uses
the theme file as its worked example of the `"./themes/*.css"` wildcard, survives the rename intact.

Seven further prose repairs were applied where the mechanical result was tautological or false —
`Monochrome shipped its first five betas as a warm theme` became `This brand shipped…`, `monochrome is
near-monochrome` became `this brand is near-monochrome`, and three `Pair it with fonts-monochrome.css`
pointers were corrected to the real subpaths `fonts/monochrome.css` and `themes/monochrome.css` (they
had been naming the Phase 0 prototype filenames, not the shipped ones).

---

## 3. The browser proof: the new attribute resolves the theme, and the old one is dead

A grep for zero `charcoal` cannot distinguish a complete rename from a **consistent rename that applies
to nothing**. So this was measured in Chromium against a booted story (`inputs-button--default`), on
`iframe.html` **with an `id`** — the 01-20 lesson: Storybook discards `globals` on an id-less boot.

Read via `getComputedStyle`, at `<html>` **and** at the node the story actually renders in — the
01-19.1 lesson: a node can carry the right brand while its neutrals are shadowed underneath. Both an
accent (`--amber`) and neutrals (`--cream`, `--cream-2`, `--wire`, `--ink`) were read, because the
accent alone would not have caught a shadowed neutral.

| `globals=brand:` | `<html data-brand>` | `--amber` | `--cream` | `--cream-2` | `--wire` | `--ink` | verdict |
|---|---|---|---|---|---|---|---|
| `monochrome`, light | `"monochrome"` | `#111114` | `#fafafb` | `#fdfdfe` | `#88888e` | `#111114` | **theme resolves** |
| `monochrome`, dark | `"monochrome"` | `#f2f2f4` | `#0d0d0f` | `#17171a` | `#6d6d73` | `#f2f2f4` | **theme resolves** |
| `charcoal`, light | *(absent)* | `#f59e0b` | `#fcfcfc` | `#f4f4f4` | `rgba(0, 0, 0, 0.18)` | `#1c1c1a` | falls through to **default** |
| `default`, light | *(absent)* | `#f59e0b` | `#fcfcfc` | `#f4f4f4` | `rgba(0, 0, 0, 0.18)` | `#1c1c1a` | control |

Every monochrome figure matches `src/themes/monochrome.css` exactly, at both nodes, in both modes. Row
3 is the one that matters: `brand:charcoal` now leaves `data-brand` **unset** and resolves the design
system's own amber. The old name is not an alias — it is gone.

**A second, independent, per-story proof.** `.storybook/test-runner.ts`'s `postVisit` asserts on
**every** story that `<html data-brand>` equals the requested `DS_BRAND`. `DS_BRAND=monochrome` passes
**508 / 508**, which is 508 separate confirmations that the attribute applies.

---

## 4. The gates, and the one that could not fail

Each gate was pushed three ways: red before the fix, red with the fix reverted, green as shipped.

**The completeness gate (zero `charcoal` in `src`/`.storybook`/`tests`/`scripts`) bites.** I planted the
exact partial-rename the plan warns about — `document.documentElement.dataset.brand = "charcoal"` in
`preview.tsx`, while the theme declares `monochrome` — and it flagged the file. Restored and confirmed
byte-identical by `shasum -a 256` (`0c8cc94…62f4` before and after).

**The `data-brand="charcoal"` selector gate does NOT bite on that mutation, and this is worth
recording.** The plan's third automated check greps for the attribute *literal*. The dangerous partial
rename does not use the literal — it goes through the DOM API, `dataset.brand = "charcoal"`, which the
grep cannot see. It passed while the harness was set to a brand no stylesheet declared. **The
zero-references gate is the load-bearing one; the selector gate is a narrower special case of it.**
Eighteen plans in, that is the eighteenth gate that would not have caught what it was written to catch.

**The a11y brand-axis gate bites, loudly.** `DS_BRAND=charcoal test:a11y` now throws on **2032**
assertions across every story: *"requested DS_BRAND=charcoal but `<html data-brand>` resolves to
default"*.

**The changelog gate bites.** Planting `charcoal` back into the `2.0.0-beta.1` entry turned the parser
red; restored from the committed blob via `git show HEAD:CHANGELOG.md` (never `git checkout --`), and
`git status` reports the file clean.

**The history gate bites.** It currently sees **106** files under `.planning/phases` still mentioning
charcoal; a blanket replace would drive that to 0 and fail it, which is the design.

### Exit codes

| gate | exit | evidence |
|---|---:|---|
| `npm run build` | **0** | emits `dist/themes/monochrome.css` + `dist/fonts/monochrome.css` |
| `npm test` | **0** | **1951 passed / 1951**, 123 files, **0 skipped** |
| `npm run check` | **0** | after `npm run format` — see below |
| `npm run typecheck` | **0** | both `tsconfig` projects |
| `npm run css:check` | **0** | `79 files, round-trip byte-exact` |
| `test:a11y` (default) | **0** | **508 / 508**, 84 suites |
| `DS_BRAND=monochrome test:a11y` | **0** | **508 / 508**, 84 suites |
| `npm run test:visual` | **1** | 136 passed, 1 failed, 1 did not run — §6 |

`npm run check` failed **1** on the first pass with **6 diagnostics, all category `format`, zero
`lint`**: `monochrome` is three characters longer than `charcoal`, so six lines crossed Biome's width.
`npm run format` fixed exactly those 6 files (protocol §5's sanctioned move), and every gate was re-run
from scratch afterwards — the 0s above are all post-format.

`npm test` running **0 skipped** matters: `src/packaging.test.ts` is `describe.skipIf(!existsSync(dist))`,
so the build was run *before* the tests and its `exports`-exist assertions actually executed rather than
silently skipping (protocol §3a).

---

## 5. The baselines: 504 in, 504 out, 1019 total, nothing re-recorded

| | before | after |
|---|---:|---:|
| `*--charcoal-chromium-darwin.png` | **504** | **0** |
| `*--monochrome-chromium-darwin.png` | 0 | **504** |
| total tracked baselines | **1019** | **1019** |
| on disk | 1019 | 1019 |

All 504 matched the suffix exactly before the move, and each was moved individually with `git mv` — the
index recorded **504 `R`** entries and git detected every one at **100% similarity**.

**The proof that nothing was re-recorded is not the count.** I fingerprinted the sorted multiset of all
1019 blob hashes before and after: `969ad76ffbcba48d23e84a44fadaa12a`, identical. And a full
`shasum -a 256` of all 1019 files was taken before the visual suite ran and again after **the full
suite, two standalone monochrome re-runs and three a11y sweeps** — byte-identical. Playwright created
nothing, which was the whole trap: 504 names the spec cannot find would have become 504 silent
re-records under a green exit.

**The spec found them.** The run printed
`visual baselines [monochrome]: captured 504, skipped 4 time-dependent` — 504 comparisons attempted
against 504 renamed files, zero reported missing. `src/visual-baseline-coherence.test.ts` is the
belt-and-braces here: it asserts the `--monochrome-chromium-darwin.png` suffix from inside `npm test`,
so a PNG rename that disagreed with the code rename would have failed the vitest gate, not just the
Playwright one.

---

## 6. `test:visual` exits 1 on **two** stale baselines, not one — and neither is mine

The brief predicted one. There are two, and the second is a genuine finding.

**`interaction-richtext--dark-mode.png` — 138 px, ratio 0.01, default brand.** Exactly as briefed and
exactly the signature `01-FIX-focus-ring-soft.md` §8 recorded: a stale default-brand baseline still
holding a defect fixed at `f1767f2`. It carries no brand suffix, I never touched it, and re-recording
it is the developer's call. **Reported unchanged.**

**`data-display-tabs--narrow-overflow--monochrome.png` — 94 px, ratio 0.01.** New to this report, and
the reason is structural: `storybook.spec.ts` is `describe.configure({ mode: "serial" })`, so when the
default-brand test fails the monochrome test is **skipped** ("1 did not run"). 01-22 re-recorded this
file at `8ce0d69` and its summary noted the story *"did not fail — it was re-recorded"*. **Nobody had
run a comparison against it since.** This plan's standalone monochrome run is the first, which is why
it surfaced now.

Four independent facts say the rename did not cause it:

1. The baseline blob is **`d1ae1191…`** at both `HEAD` (new name) and `HEAD~1` (old name) — the rename
   changed the filename and not one byte of the image.
2. **503 of 504** monochrome baselines match. A broken brand would move all 504, because every story
   would render in the default palette.
3. It reproduces identically across two runs (94 px both times), so it is not the concurrency flake the
   spec's own serial-mode comment documents at 96 px.
4. Three consecutive fresh captures of that story under `brand:monochrome` are **byte-identical to each
   other** (`6c474a7b7a3889fa`). The render is deterministic — so the *recorded image* is stale, not the
   story.

That is the exact hazard `storybook.spec.ts`'s serial-mode comment warns about: *"Re-recording would
have overwritten a correct image with whatever the next contended run produced"*. 01-22 re-recorded it
under `--update-snapshots=all` during a contended pass, and it captured a tab-overflow layout one
measurement off. **I did not re-record it.** It needs one deliberate re-record from a quiet machine,
and that is Akhil's call, not mine.

---

## 7. The historical record is untouched, and demonstrably so

**106 files under `.planning/phases` still mention charcoal**, plus 8 more elsewhere in `.planning` —
114 in total. Every plan, every summary, `00-FINDINGS.md`, `00-THEME-API.md`, the triage and fix
documents, the Phase 0 prototype stylesheets and scripts, and the phase directory name
`01-design-system-charcoal-theme` are exactly as they were.

**Exactly four forward-looking documents changed**, and `ADR-002-admin-scope-revised.md` turned out to
carry no mentions at all, so three files actually moved: ROADMAP (24 occurrences), STATE (6, after two
hand-written row rewrites that carried the branch-name and plan-count changes), ADR-001 (1). The gate
was negative-controlled on ADR-001 — planting the old name back turned it red, and the file was
restored from its committed blob via `git show`, with `git status` confirming it byte-identical.

`01-22-SUMMARY.md` gained a **seven-line pointer note above its title and nothing below it** —
`git diff --numstat` reports **+7 / −0**. It says the brand was renamed afterwards and gives the
mapping, so a reader is not confused, without a single character of the dated record being edited.

**The design system's own `.planning/` was never touched** (protocol §6).

---

## 8. Deviations from plan

### `[Rule 2 - Missing]` `README.md` renamed although the plan did not list it

`package.json`'s `files` ships the README. Leaving it documenting `themes/charcoal.css` would have
published instructions for a subpath that no longer resolves. 8 occurrences renamed. **Commit:** `04e7e38`.

### `[Rule 1 - Bug]` Two comment references would have become false, one dangling

`src/tokens.css`'s "neutral charcoal" (a colour, not the brand) and three "Pair it with
`fonts-charcoal.css`" pointers (Phase 0 prototype filenames, not the shipped ones) were rephrased rather
than renamed. Detailed in §2. **Commit:** `04e7e38`.

### `[Rule 3 - Blocking]` `npm run check` red on 6 formatting diagnostics

`monochrome` is longer than `charcoal`, so six lines crossed Biome's width. Resolved with
`npm run format` per protocol §5, and all five gates re-run afterwards. Zero `lint` diagnostics at any
point. **Commit:** `04e7e38`.

---

## 9. Findings raised (not fixed)

Per protocol §10 these are recorded here and **not** added to `00-FINDINGS.md`.

1. **`data-display-tabs--narrow-overflow--monochrome.png` is a stale baseline** left by 01-22's
   `--update-snapshots=all` pass. Deterministic 94 px delta. Needs one deliberate re-record on a quiet
   machine. §6.
2. **The serial-mode skip hides the second brand's entire capture pass.** While
   `interaction-richtext--dark-mode` fails, the monochrome test never runs in `npm run test:visual` —
   504 comparisons silently unexercised on every full run. Both stale baselines above are downstream of
   this. Worth considering `mode: "serial"` with a `test.describe.configure({ retries })` or splitting
   the brands into separate files that do not gate each other.
3. **Three forward-looking `.planning` documents still carry the old brand name** and were outside this
   plan's declared four: `PROJECT.md`, `REQUIREMENTS.md`, `OPEN-GATES.md`. Not widened — Akhil set the
   scope. They will read oddly against a renamed ROADMAP.
4. **`src/themes/monochrome.css` cites `check-font-names.mjs`** as enforcing the face-name contract.
   That script does not exist in `$DS`; it lives in the portfolio at
   `.planning/phases/00-design-ideation/scripts/playground-measurements/check-font-names.mjs`.
   Pre-existing, unrelated to the rename.
5. **Two stale hex figures in comments, left by 01-22.** `.storybook/preview.tsx` says the brand's dark
   `--cream` is `#161616` and `src/primitives.css` repeats `#161616` / `#F4F1EA` / `#1E1E1D` in three
   "MEASURED" blocks. The current values are `#0d0d0f` / `#fafafb` / `#1e1e22`. Comments only, no gate
   reads them, but they will mislead the next reader.

---

## 10. Post-conditions

- `package.json` is **`1.11.4`**. Nothing published, nothing tagged, nothing merged. The 164 pending
  renames stay unapplied.
- Branch **`charcoal-theme`**, at **89 commits** ahead of `main`, tracked-clean. Only
  `?? design_handoff/design_handoff_ds_overview/` untracked, as expected.
- The default brand is unchanged. With comments stripped, `src/tokens.css`, `src/primitives.css` and
  `src/fonts/default.css` are **identical** to their previous contents, and the theme differs by
  **exactly two lines** — the two selectors. Cairn is untouched.
- The exports map needed **no edit**: `"./themes/*.css"` is a wildcard.
  `@akhil-saxena/design-system/themes/monochrome.css` resolves to `dist/themes/monochrome.css`;
  `…/themes/charcoal.css` returns `MODULE_NOT_FOUND`.
- **Akhil's Storybook on 6006 and page on 5173 were reused, never killed** — both still answer 200.
  **His open Storybook tab needs a reload:** the toolbar global's value changed from `charcoal` to
  `monochrome`, so a tab holding the old value will silently render the default brand until refreshed.

---

## Self-Check: PASSED

- `$DS/src/themes/monochrome.css` — FOUND; `$DS/src/fonts/monochrome.css` — FOUND;
  `src/themes/charcoal.css` — correctly ABSENT.
- 504 `*--monochrome-chromium-darwin.png` — FOUND; 0 `*charcoal*`; 1019 total.
- `04e7e38` — FOUND in `$DS`. `d0c0753` — FOUND in the portfolio.
- Zero `charcoal` in `$DS` `src`/`.storybook`/`tests`/`scripts`; 106 `.planning/phases` files still
  mention it, as required.
