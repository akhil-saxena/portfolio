# Charcoal theme prototype — rescued before the D-02 deletion

Byte-identical copies from `.playground/src/styles/` (verified with `cmp`). These are the
TESTED prototype Phase 1 ports into `@akhil-saxena/design-system`: 37 tokens at light
`(0,2,0)` / dark `(0,3,0)`, the D-29 tokens/faces split, 54 contrast ratios reproducing
UI-SPEC to 2dp, and the exhaustiveness invariant proven order-independent by 00-07's
136-assertion cascade probe.

| File | What it is | Downstream owner |
|---|---|---|
| `theme-charcoal.css` | The 37-token contract, both modes | Phase 1 (DS-01…DS-05) |
| `fonts-charcoal.css` | The 8 `@font-face` rules (D-29 split) | Phase 1 (DS-06, D-36 major) |
| `density-compact.css` | The compact-density prototype, `pointer: fine`-gated | Phase 06.1 (DS-11) |
| `manifest.css` / `manifest-admin.css` | D-33's hand-maintained import manifests, measured | Phase 1 / Phase 5 |

Both theme files carry an "EDITING THIS FILE" header naming the greps that depend on them.
`00-THEME-API.md` is the API contract; these files are the values. Like
`scripts/playground-measurements/`, they are reference artefacts for a cross-repo port —
not wired to anything in this repo.
