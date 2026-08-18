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

## 3. Why the plans are strictly sequential

The conclusion is right and the first draft's reasons were not the binding ones. File overlap and the
four-gate boundary invariant are real but weaker than these four, which were verified against the
sibling repo. Record them here so a later reader does not "parallelise the disjoint pairs":

**(a) `tsup.config.ts` sets `clean: true`.** Every `npm run build` **deletes `dist/`**. Thirteen plans
read `dist/` — `dist/tokens.css`, `dist/themes/`, `dist/fonts/`, `dist/css/*.css`,
`dist/components/*.js`. Worse than a race: `src/packaging.test.ts` is
`describe.skipIf(!existsSync(dist))`, so a concurrent build makes another plan's `exports`-exist
assertions **silently SKIP**. That is a false pass, not a flake, and it is invisible in a green run.

**(b) One Storybook on port 6006.** `playwright.config.ts` has `webServer` with
`reuseExistingServer: !process.env.CI`, and `test:a11y` / `test:visual:capture` go through
`start-server-and-test` on the same port. Two concurrent runs attach to **one** server serving a `src/`
the other executor is mid-edit. This repository has already recorded baselines with a bug present once;
that is exactly the mechanism.

**(c) One `node_modules` and one `package-lock.json`.** 01-04 and 01-05 install; 01-06, 01-08 and 01-21
`npm pack` / `npm publish`. Concurrent installs corrupt the lockfile and concurrent packs measure each
other's tree.

**(d) One git index.** Specific-path `git add` (§4) protects *staging*, but a plain `git commit` commits
the whole index — so a concurrent executor's staged file lands in the wrong commit.

**File overlap is a supporting reason, not the binding one.** It is real — `src/primitives.css` is
touched by nine plans and `src/tokens.test.ts` by six — but (a) through (d) would force sequence even
with disjoint file sets.

### The correction worth recording for future phases

The missing isolation is **in `$DS`, not in the portfolio**. A `git worktree add` **inside**
`../design-system` would dissolve (a), (c) and (d) — separate checkout, separate `node_modules`,
separate index — leaving only the port, which a `-p` flag handles.

**It is still not recommended for this phase**, for two reasons that survive the isolation:

1. **Semantic couplings do not follow `files_modified`.** 01-02's cascade negative control
   deletes and restores a line in `src/themes/charcoal.css`, and 01-03 parses that same file — a
   coupling through a path that was in **neither** plan's declared file set until this revision added
   it to both. Isolation does not fix a dependency the graph cannot see.
2. **A pre-capture merge adds risk for no gain** on a chain that is sequential anyway: 01-20 must
   record baselines against one tree, so every branch has to land before it.

So the sequential conclusion holds — but on (a) through (d), not on file overlap.

### If a future phase does parallelise

Any two plans running at once must have disjoint `files_modified` **and** must note the shared git
index: on a `.git/index.lock` failure, retry **once** after 2s, then raise a checkpoint rather than
deleting the lock.

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

## 7a. The verify idiom every plan uses

Every `<automated>` block in this directory follows one shape. It exists because an adversarial pass
found eight gates that could not fail — `|| echo` rescue tails, inverted semantics, `grep -viq` on
multi-line input, and `node -e` reading `process.env.DS` when `DS` was set as a shell-local or trailing
argv rather than exported.

- **Every block starts** `export DS=/Users/akhilsaxena/Documents/Personal/Repositories/design-system; `
  — `export`, not a bare assignment, so a child process (`node -e`, `npx`) actually sees it.
- **Positive assertion:** `CMD || { echo "FAIL: why"; exit 1; }`
- **Negative assertion:** `if CMD; then echo "FAIL: why"; exit 1; fi` — **never** `! CMD && …`, which
  inverts wrongly on multi-line input and cannot short-circuit a rescue.
- **No `set -e`**, and **no trailing `|| echo`**. A rescue tail turns every failure into exit 0. If a
  block ends in `|| echo`, it is not a gate.
- **Guard before you read.** `test -s <file> ||` before any `grep -o … | wc -l`, because a count of 0
  on a **missing** file reads as a pass.
- **Count occurrences with `grep -o … | wc -l`**, never `grep -c` (see §7 — it counts lines).
- **Strip comments before grepping source** when the same plan requires a comment naming the thing
  being grepped for; otherwise the gate invalidates itself.
- **Never pipe a test runner's exit code away.** Run it guarded first, then grep its output in a
  second statement. `npx vitest run … | grep -q foo` is green on a red run.
- **`--grep` takes one argument.** `npx playwright test --grep -i name` makes `-i` the pattern and
  `name` a file filter, which finds nothing and exits 1 forever. Target a **named spec file** instead.

Claims that no shell can check — a negative control actually being executed, a screen reader actually
speaking, a measurement taken in a throwaway consumer — go in a `<manual>` block naming the exact
values to paste into the SUMMARY. A claim in `<done>` with neither an `<automated>` nor a `<manual>`
behind it is undetectable if skipped.

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
