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
