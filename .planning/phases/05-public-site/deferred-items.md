# Phase 5 — deferred items

Out-of-scope discoveries, logged rather than fixed. Each names the plan that found it and the
plan that owns it.

---

## 1. `test/content/resume-structure.unit.test.ts` — 15 failing cases on `main`

- **Found by:** 05-04, during its full-suite verification run (2026-08-28).
- **Owner:** **05-02.**
- **Cause:** commit `d986836 feat(05-02): give projects a status and a one-liner, and land the
  copy Phase 0 reviewed` changed the key set of `data/projects.json`.
  `test/content/resume-structure.unit.test.ts` asserts that each project record *"carries the
  eight keys in the order they were authored in"* and *"is byte-identical to its previous home,
  key order included, except the OD-6 field"*. Five records × three assertions = 15 failures.
- **Measured:** `npx vitest run` → **1126 passed, 15 failed**, all 15 in that one file. Every
  other file in the suite is green.
- **Why 05-04 did not fix it:** no file in 05-04 is on any path reaching that suite. It reads
  `data/projects.json` and `data/resume.json`; 05-04 created `src/lib/exif-display.ts`,
  `test/public/exif-display.unit.test.ts` and `scripts/assert-exif-display-coverage.mjs` and
  modified nothing else. Editing another plan's content assertions mid-wave is exactly the
  cross-plan interference the shared-index rule exists to prevent.
- **What has to be decided, not just fixed:** the failing assertions are a *deliberate*
  losslessness proof from 03-05's migration — "byte-identical to its previous home". Adding a
  field is a legitimate change, so the assertion needs to be re-pointed at the new key set with
  the new field named as the exception, in the same shape the existing `except the OD-6 field`
  clause uses. Deleting the assertions would delete the proof.
- **Status: RED on `main` right now.** It must be resolved before the phase closes.

---

## `npm run check` has three pre-existing findings, none of them 05-05's

- **Found by:** 05-05, during Task 1's verification run (2026-08-28).
- **Owner:** unassigned — they predate this plan and belong to whoever owns those files.
- **Measured:** every one of these files is byte-identical to `HEAD` in 05-05's working tree
  (`git diff --quiet HEAD -- <file>` exits 0 for all three), so the findings exist on `main`
  independently of anything this plan did.

  ```
  scripts/lib/r2.mjs:469:9                      lint/style/useTemplate            FIXABLE
  scripts/assert-ds-import-contract.mjs:566:5   lint/correctness/noUnusedVariables FIXABLE
  test/pipeline/workflow-contract.unit.test.ts  lint/suspicious/noTemplateCurlyInString ×5
                                                (lines 672, 673, 674, 684, 685)
  ```

- **Why 05-05 did not fix them:** `npm run check` is not in `npm run build`, so none of these
  blocks the phase today — but 05-01's SUMMARY records `npm run check` at **exit 0**, which means
  all three arrived between 05-01 and wave 2. The five `noTemplateCurlyInString` findings are
  almost certainly intentional (a workflow-contract test asserting on literal `${{ }}` GitHub
  Actions expressions) and want a scoped biome ignore with a reason, not an autofix. The two
  FIXABLE ones are one `biome check --write` away.
- **Why not just run the autofix:** four plans shared this index during wave 2. `biome check
  --write` on files another plan is mid-edit is the 04-06 index-sweep failure with a different
  tool. 05-05 formatted only its own five files, by explicit path.
