---
phase: 01-design-system-charcoal-theme
type: reference
consumers: [every 01-NN-PLAN.md in this directory]
---

# Phase 1 execution protocol — cross-repo mechanics

**Every plan in this directory `@`-references this file. Read it before task 1.**

Phase 1 is a **cross-repo phase**. The plans live in the portfolio repo; **every line of
implementation lands in the sibling repository**
`/Users/akhilsaxena/Documents/Personal/Repositories/design-system`.

Referred to throughout as `$DS`. Set it first, in every shell:

```bash
DS=/Users/akhilsaxena/Documents/Personal/Repositories/design-system
```

`files_modified` in each plan's frontmatter lists sibling paths prefixed `../design-system/`
so the orchestrator's overlap detection can read them. Those prefixes are relative to the
portfolio repo root, i.e. `../design-system/src/tokens.css` **is** `$DS/src/tokens.css`.

---

## 1. Tracked-clean gate — the first action of every plan, without exception

```bash
git -C "$DS" status --porcelain | grep -v '^?? design_handoff/design_handoff_ds_overview/'
```

**Expected output: empty.**

`design_handoff/design_handoff_ds_overview/` is a known-harmless untracked directory and is
the only permitted line. **Any other line — tracked modification, staged change, or a
different untracked path — means a human session left work in that repository.** That has
happened: an interactive session was open in `$DS` while this phase was planned.

If the gate is not empty: **STOP.** Raise a `checkpoint:human-verify` that prints the exact
`git status --porcelain` output and asks the user what to do with it. Do **not** stash, do
**not** commit it, do **not** `git clean`, do **not** work around it by branching on top.

## 2. Branch

All Phase 1 work lands on **`charcoal-theme`**, cut once off the sibling's `main`.

```bash
git -C "$DS" rev-parse --verify charcoal-theme >/dev/null 2>&1 \
  && git -C "$DS" checkout charcoal-theme \
  || git -C "$DS" checkout -b charcoal-theme main
```

Confirm with `git -C "$DS" branch --show-current` → `charcoal-theme`. **Never commit to
`main` in `$DS`.**

## 3. No worktree isolation — this is why the plans are sequential

A git worktree of the portfolio cannot write to a different repository, so executors run on
the portfolio's **main working tree** with no isolation. Consequences encoded in every plan:

- Plans are **strictly sequential** (`depends_on` chains 01-01 → 01-02 → … → 01-21). Waves
  equal plan numbers. Two plans never run at once.
- The reason is not only file overlap: **`npm test` / `check` / `typecheck` / `css:check`
  must be green in `$DS` at every plan boundary**, and that is a repo-global invariant two
  concurrent executors cannot both hold.
- If a future plan is ever run in parallel with another, both must note the **shared git
  index**: on a `.git/index.lock` failure, retry **once** after 2s, then raise a checkpoint
  rather than deleting the lock.

## 4. Staging and commits

- **Specific-path adds only.** `git -C "$DS" add <explicit path> [<explicit path> …]`.
  Never `git add -A`, never `git add .`, never `git add src` — the untracked
  `design_handoff/` directory must remain untracked and unstaged.
- **Conventional commits**, scoped to the design system's own vocabulary:
  `feat(theme): …`, `fix(card): …`, `test(tokens): …`, `build(exports): …`,
  `refactor(fonts): …`, `docs(readme): …`.
- **No Claude, no AI, no co-author attribution of any kind** — not in the subject, not in the
  body, not as a trailer. This is a personal repository.
- Commit as the repository's configured author. Do not pass `--author`.

## 5. Green at every plan boundary

Before the **final** commit of every plan, all four must pass in `$DS`:

```bash
( cd "$DS" && npm test && npm run check && npm run typecheck && npm run css:check )
```

A plan that cannot get all four green does not commit its final task — it raises a
checkpoint. `npm run check` is Biome (`biome check .`), so formatting is enforced; run
`npm run format` before `check` if it complains about formatting only.

## 6. Never touch the sibling's planning artefacts

`$DS/.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, INGEST-CONFLICTS.md,
intel/, phases/, _archive/) belongs to that repository's own GSD workflow. **Read it for
conventions; never write to it.** `$DS/.planning/PROJECT.md` describes the *JobDash* cream/
ink/amber identity — that is the design system's own product context, not this phase's, and
charcoal is an additional brand alongside it, never a replacement for it.

## 7. Platform traps — each of these produced a false pass in Phase 0

- **BSD `sed` silently no-ops on `0,/re/`.** For any "replace the first occurrence" edit, use
  `perl -0777 -pe` or a small Node script, then `git diff` the file to confirm the edit
  actually landed. A `sed` that changed nothing exits 0.
- **`grep -c` counts LINES, not occurrences.** Two matches on one line count once. For
  occurrence counts use `grep -o … | wc -l`.
- **Comments are matched too, so a header can invalidate its own gate.** Both prototype CSS
  files carry an `EDITING THIS FILE` header naming the greps that depend on them. Filter
  comments before counting: `grep -v '^\s*[/*]' file | grep -c token`. A bare `== 0` gate on
  an unfiltered file is forbidden.
- **A grep cannot prove a style applied.** Every claim of the form "the rule now wins" must be
  verified by reading `getComputedStyle` in a real browser, never by the declaration's
  presence in source. **Inline styles beat class rules without `!important`** — that is the
  whole content of findings E3, E5 and F-12-2.
- **Negative controls must be verified to bite, then restored byte-identically.** Break the
  thing, watch the gate go red *with the expected assertion count*, restore, confirm the
  file's `shasum -a 256` matches the pre-break value, confirm the gate is green again. A
  negative control that was never run proves nothing.
- **Never run bare `npx tsc`.** Use `npm run typecheck`. (`$DS` does have `typescript`, but a
  repo without it resolves `npx tsc` to the squatted `tsc@2.0.4` package.)
- **Stale-artefact trap.** After any rebuild/repack of `$DS`, delete consumer caches before
  measuring: `rm -rf node_modules/.vite dist` in whatever consumes the tarball. npm's
  integrity check short-circuits on an unchanged tarball filename.

## 8. Phase 1 inputs — read from the portfolio repo, not from `$DS`

| Artefact | What it is |
|---|---|
| `.planning/phases/00-design-ideation/00-THEME-API.md` | **The contract.** Every number Phase 1 needs, written inline. 995 lines, 11 sections. |
| `.planning/phases/00-design-ideation/theme-prototype/theme-charcoal.css` | The **tested** 37-token stylesheet, both blocks. Port it; do not re-derive values. |
| `.planning/phases/00-design-ideation/theme-prototype/fonts-charcoal.css` | The tested 4-entry-point face layer (8 `@font-face`). |
| `.planning/phases/00-design-ideation/theme-prototype/manifest.css`, `manifest-admin.css` | D-33's measured import manifests (Phase 5 consumes these). |
| `.planning/phases/00-design-ideation/theme-prototype/density-compact.css` | **Phase 06.1's, not Phase 1's.** Do not port it here. |
| `.planning/phases/00-design-ideation/scripts/playground-measurements/` | The ten reference gate implementations + a README mapping each to its finding. Authored to run from `.playground/`; **they will not run unmodified** — port the logic. |
| `.planning/phases/00-design-ideation/00-FINDINGS.md` | The **fifteen**-row gap register (G-1…G-15 plus AAA-1) and the `F-1x-x` pointer index. A "sixteen" figure circulated earlier and is wrong. |
| `.planning/phases/00-design-ideation/00-HUMAN-CHECKLIST.md` §E | The 15-item E1…E15 handover queue this phase closes. |

## 9. Out of scope for Phase 1 — do not plan, do not implement

- **Cascade layers (`@layer`) — D-28 / DS-10.** Deferred to **Phase 06.1** deliberately, so a
  visual regression in this release stays attributable. Measured as "not needed yet": 272
  green assertions with no `@layer` and no `!important` anywhere.
- **The `data-density` axis — D-32 / DS-11 / G-2.** Phase 06.1. `density-compact.css` is
  parked in `theme-prototype/` for that phase.
- **`DiffView` — G-7.** `blocks-Phase-7`, not Phase 1.
- **A masonry / column-gallery component — G-10.** Accepted; layout CSS is permitted by
  QUAL-03.
- **`F-15-7` control-geometry floors** (Checkbox label 22px, InlineEdit 25px, NumberStepper
  24/30px, IconButton's 40px ceiling). Same family as G-2 → Phase 06.1. **Exception:**
  `AppBar`/`Footer`'s own geometry is D-16-1 / E13 and IS in scope (plan 01-12), and
  `IconButton`'s scale rebase is in scope only where 01-14 needs it for `DataGrid`'s pager.

## 10. Anything discovered that is not on the list

Record it in the plan's own **SUMMARY**, under `## Findings raised (not fixed)`. Do **not**
add rows to `00-FINDINGS.md` — that register states a fixed denominator, and adding a row
silently changes the tier-pull contract. Do not widen a plan's scope to fix it.
