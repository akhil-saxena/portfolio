# Playground measurement scripts — rescued before the D-02 deletion

## Why these are here

`00-UI-SPEC.md:832` states the four measurement scripts "**are** committed into the phase
directory", and plan `00-17` repeats it. **Both were wrong.** `git log --all --diff-filter=A`
found **zero** history for any of the ten scripts below — they existed only inside gitignored
`.playground/`, which plan 00-17 task 3 deletes with `rm -rf`.

Worse, task 3's acceptance criterion — *"the four measurement scripts still exist under
`.planning/phases/00-design-ideation/`"* — would have **appeared to pass**, because three
unrelated copy-corpus scripts (`check-case-length.mjs`, `check-copy-length.mjs`,
`check-photo-content.mjs`, from plans 00-18/19/20) already sit in the parent directory.

The roadmap documents these as reused downstream:
- **Phase 1 / DS-09** — *"Measure it here using the Phase 0 sketches"* → `check-bundle.mjs`
- **Phase 5** — bundle gate → `check-bundle.mjs`
- **Phase 06.1** — the density axis and cascade work → `check-theme-exhaustive.mjs`,
  `check-contrast.mjs`, `check-css-size.mjs`

Deleting the playground without these would have destroyed the only implementation of every
measurement this phase produced.

## Provenance and caveat

Copied **byte-identical** from `.playground/` (verified with `cmp`). They were authored to run
with `.playground/` as the working directory and reference paths like `dist/`,
`src/styles/theme-charcoal.css` and `node_modules/@akhil-saxena/design-system`. **They will not
run unmodified from this location** — that is expected. They are preserved as the reference
implementation for a later phase to port, not as a runnable suite here.

## What each one measures

| Script | Measures | Recorded finding |
|---|---|---|
| `check-bundle.mjs` | JS pulled into a hydrated client chunk by one DS import | **G-15 / DS-09.** Exits **1 by design** — the non-zero *is* the finding |
| `check-theme-exhaustive.mjs` | Every charcoal token restated in both light and dark blocks, bidirectionally, with a parse floor | The exhaustiveness invariant — the root-cause fix for the cascade hazard |
| `check-contrast.mjs` | 54 WCAG ratios, reproducing UI-SPEC to 2dp | Asserts `--ochre` **fails** the text bar on 2 of 3 dark surfaces, directionally, so it cannot be quietly darkened |
| `check-font-names.mjs` | `@font-face` rule counts and family names | Charcoal adds 8; the DS ships 73; a real consumer emits **81** |
| `check-css-size.mjs` | Per-manifest CSS bytes, raw and gzip | D-33's manifest numbers |
| `check-coverage.mjs` | The 42-cell coverage matrix; fails on a blank or unhosted cell | Includes the `UNHOSTED_INHERITS` condition added by 00-16 |
| `check-states.mjs` | Every declared screen state resolves to a real prerendered route | Caught that `?state=` never worked under `output: 'static'` |
| `check-no-js.sh` | Zero framework JS on static routes; allowlisted island routes really hydrate | The counterpart to G-15 |
| `check-no-ivory.sh` | No ivory token value survives the charcoal resolution | Excludes `theme-charcoal.css` by exact filename, with an assertion closing that exclusion |
| `check-alt-drift.mjs` | `[ALT PENDING]` count stays tied to unfilled `[AKHIL-ALT]` rows | Counts table **rows** and `alt` **attributes** — `grep -c` counts lines and over-counts by 1 |

## Not rescued, deliberately

`shoot.mjs` (the screenshot harness) is **not** here. Committing anything from `.playground/`
into git breaks the D-02 scope fence that task 3's own pre-flight checks — it requires
`git status --porcelain -- .playground` to be empty. The 88 screenshots it produced are
committed under `../screenshots/`; the harness is not.
