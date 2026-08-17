---
phase: 0
plan: 01
subsystem: design-ideation
tags: [playground, design-system, measurement, tree-shaking, findings-register]

requires: []
provides:
  - throwaway Astro playground harness (.playground/, gitignored, worktree-local)
  - DS-09 tree-shaking verdict as measured bytes (G-15 evidence)
  - zero-JS static-render verdict (Claim 2)
  - 00-FINDINGS.md — the Phase 0 → Phase 1 scope contract
affects:
  - Phase 1 (charcoal theme release — pulls blocks-Phase-5 + should-fix-in-Phase-1)
  - Phase 5 (public site — G-15 is a go/no-go gate)
  - Phase 06.1 (density axis — pulls G-2)
  - Phase 7 (admin — pulls G-1, G-7)

tech-stack:
  added:
    - astro 7.2.2
    - "@astrojs/react 6.0.2"
    - react / react-dom 19.2.8
    - "@akhil-saxena/design-system 1.11.4 (file: tarball)"
    - playwright 1.59.1
  patterns:
    - tarball-not-symlink dependency (duplicate-React guard)
    - sourcemap-sources bundle analysis (no extra dependency)
    - measurement-not-gate for unconfirmed thresholds

key-files:
  created:
    - .planning/phases/00-design-ideation/00-FINDINGS.md
    - .playground/package.json (gitignored)
    - .playground/astro.config.mjs (gitignored)
    - .playground/tsconfig.json (gitignored)
    - .playground/check-bundle.mjs (gitignored)
    - .playground/check-no-js.sh (gitignored)
    - .playground/src/components/ChipIsland.tsx (gitignored)
    - .playground/src/pages/probe/island.astro (gitignored)
    - .playground/src/pages/probe/static.astro (gitignored)
  modified:
    - .gitignore

decisions:
  - "Sourcemaps enabled via vite.build.sourcemap, not Astro's build.sourcemap — Astro has no such key and silently drops it"
  - "check-bundle.mjs exit code is a measurement, not a gate, until the 50 KB threshold is human-confirmed"
  - "The literal token 'client:' is banned from static.astro including comments — the acceptance check is a plain grep"

metrics:
  duration: ~20 min
  completed: 2026-08-17
---

# Phase 0 Plan 01: Playground Harness & DS-09 Measurement Summary

Stood up the throwaway Astro playground against the real design-system tarball, proved the
duplicate-React and D-02 scope-fence guards hold, and settled two of DSGN-04's three claims
with recorded numbers: **DS-09 tree-shaking fails at 176922 B gzip / 99 modules, and static
composition of the design system costs zero JS.**

## What Was Built

| Task | Output | Commit |
|------|--------|--------|
| 1 | `.gitignore` fence + `.playground/` scaffold (package.json, astro.config.mjs, tsconfig.json, DS tarball, 329 deps) | `cb288db` |
| 2 | Two measurement scripts + three fixtures; both measurements run | *(no commit — see below)* |
| 3 | `00-FINDINGS.md` — 16-row register with G-15 and G-12 evidence | `a32f84f` |

**Task 2 produced no commit by design.** Every file it creates lives inside `.playground/`,
which task 1 gitignored. That is the D-02 fence working as specified, not a skipped step —
`git status` was clean after the task. Task 2's durable output is the evidence transcribed
into `00-FINDINGS.md` by task 3.

## The Measurements

**DS-09 tree-shaking — FAILS.** One `import { Chip }` from the barrel, rendered
`client:load`, nothing else in the file:

| Metric | Research (2026-08-17) | Plan 01 (reproduced) |
|--------|----------------------:|---------------------:|
| Island chunk, raw | 570,553 B | **570,555 B** |
| Island chunk, gzip | 176,754 B | **176,922 B** |
| Modules in chunk | 99 | **99** |
| ProseMirror / TipTap / lowlight / highlight.js / dnd-kit / lucide | 10 / 23 / 4 / 4 / 3 / 43 | **10 / 23 / 4 / 4 / 3 / 43** |
| Shared React client runtime | 180,667 B | **180,634 B** |

Independent reproduction to within ~0.1%. The deltas are the fresh `npm run build` of the
design system plus zlib version differences; the module counts are identical.

**Zero-JS static render — HOLDS.** `probe/static` renders eight DS components (`AppBar`,
`Heading`, `Text`, `Chip`, `Card`, `StatCard`, `Timeline`, `Footer`) and emits **0**
`<script>` tags. Verified the markup is genuinely rendered, not empty: `ds-atom-appbar`,
`ds-atom-card`, `ds-atom-chip`, `ds-atom-footer`, `ds-atom-heading`, `ds-atom-text`,
`ds-atom-timeline` and resolved `var(--ink)` / `var(--display)` token references are all
present in the emitted HTML.

## Guards Verified

- **Duplicate-React:** exactly one React runtime resolves; `npm ls react` shows every
  consumer (`@dnd-kit/*`, `@tiptap/react`, `lucide-react`, the DS itself) as
  `react@19.2.8 deduped`.
- **Tarball-not-symlink:** `node_modules/@akhil-saxena/design-system` is a real directory.
- **D-02 fence:** no `@astrojs/cloudflare`, `wrangler`, `vitest`, `@astrojs/node`, no
  adapter, no `src/pages/api`, no auth dependency, and no root `package.json` — so the CI
  `file:` dependency-spec gate can never see the playground's tarball spec.
- **Supply chain:** no package was added beyond the nine cleared by RESEARCH §Package
  Legitimacy Audit. `npm install` reported 0 vulnerabilities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sourcemaps were not emitted, so the DS-09 measurement could not run**

- **Found during:** Task 2
- **Issue:** `check-bundle.mjs` counts contributing modules by reading each chunk's
  `.js.map` `sources` array (MEASURE-1's method). Astro does not emit sourcemaps by
  default, so `dist/_astro/` held the 570 KB chunk but zero `.js.map` files and the script
  could not produce a module breakdown at all. Without it, G-15 would have been "the bundle
  is big" rather than "10 ProseMirror + 23 TipTap modules are in it" — an assertion, which
  is exactly what this plan exists to replace.
- **Fix:** enabled sourcemaps in `astro.config.mjs`. **First attempt used Astro's own
  `build.sourcemap` and silently did nothing** — Astro's public config schema has no
  `sourcemap` key (zero hits in `config.d.ts`) and it does not error on an unknown key, so
  the build succeeded and still emitted no maps. The working location is `vite.build.sourcemap`.
  Both facts are recorded in a comment in the config so the next person does not repeat it.
- **Files modified:** `.playground/astro.config.mjs`
- **Commit:** none (gitignored)

**2. [Rule 1 - Bug] `probe/static.astro` failed to build — JSX passed as a React prop from `.astro`**

- **Found during:** Task 2
- **Issue:** `<AppBar nav={<span>…</span>} />` crashed the build with *"Objects are not
  valid as a React child (found: object with keys {htmlParts, expressions, error})"*.
  `.astro` files are not JSX — that expression compiles to an Astro `RenderTemplateResult`,
  which React cannot render. Astro converts the default slot (children) for you, but never
  a prop.
- **Fix:** pass a plain string (`nav="Work · Photos · Résumé"`), which is a valid
  `ReactNode`. Cause and rule documented inline.
- **Files modified:** `.playground/src/pages/probe/static.astro`
- **Commit:** none (gitignored)

**3. [Rule 1 - Bug] My own explanatory comments would have failed the plan's acceptance check**

- **Found during:** Task 2 acceptance run
- **Issue:** the criterion `grep -q 'client:' probe/static.astro` must **exit 1** — the
  static fixture may carry no hydration directive. My comments explained the fixture by
  writing the directive name literally, so the grep matched prose and the fixture's own
  tripwire went red. The check cannot distinguish a directive from a comment.
- **Fix:** reworded to "hydration directive" throughout, and added a warning at the top of
  the file telling future editors the token is banned in comments too. The alternative —
  loosening the check — would have weakened a real guard.
- **Files modified:** `.playground/src/pages/probe/static.astro`
- **Commit:** none (gitignored)

### Corrections to the Plan's Own Verification

**4. [Rule 1 - Bug] The duplicate-React acceptance glob over-matches by 3**

The plan (inheriting RESEARCH's command) asserts:

```
find .playground/node_modules -path '*/react/package.json' -not -path '*/node_modules/*/node_modules/*' | wc -l   # expects 1
```

This returns **4**, not 1 — it also matches `@types/react`, `@astrojs/react` and
`@tiptap/react`, three scoped packages that merely end in `/react/` and are not React
runtime copies. RESEARCH's inline comment says *"must list exactly one
`node_modules/react/package.json`"*, so the **intent** is one React runtime; the glob is
just imprecise, and it would report a false duplicate-React failure on any dependency tree
containing a scoped `*/react` package.

The guard genuinely passes. Corrected assertions, either of which is sound:

```bash
find node_modules -type f -path '*/react/package.json' -not -path '*/@*/*'   # -> exactly 1
npm ls react react-dom                                                        # -> all "deduped"
```

Downstream plans and the phase verifier should use the corrected form.

## Handoff Note — the playground is worktree-local and will not survive

**`.playground/` was built inside this parallel-execution git worktree and is gitignored,
so it is destroyed when the orchestrator force-removes the worktree.** Nothing was lost
that matters — the measurements are committed in `00-FINDINGS.md`, and plan 17 deletes the
playground at phase exit anyway — but the harness itself is a stated prerequisite for the
downstream Phase 0 sketch plans (02-16).

Whichever plan next needs a running sketch must re-run task 1's scaffold sequence. It is
fully specified in RESEARCH §Standard Stack and reproduced exactly by this plan; the only
additions this plan discovered are `vite.build.sourcemap: true` and the two fixture bugs
above. Rebuild cost is ~30 seconds plus `npm install`.

If the orchestrator can run plans 02+ in the *same* worktree, no rebuild is needed.

## Observations Not Recorded as Findings

`StatCard` renders with a generic `class="glass"` plus `data-part` attributes and heavy
inline styles, rather than a `ds-atom-statcard` class like its siblings. This is a real
inconsistency in the design system and it makes `StatCard` harder to target from app CSS,
but it is not one of the 16 triaged rows and this plan is a transcription-plus-measurement
task, not an authoring one. Flagging it here rather than adding a 17th row, since Phase 1
pulls by tier and an untriaged row would sit outside that contract. Worth a decision at
verify-phase.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema was
introduced — this plan writes two documents and a gitignored local harness that serves
nothing.

## Self-Check: PASSED

**Files verified present:**
- `.planning/phases/00-design-ideation/00-FINDINGS.md` — FOUND
- `.playground/package.json`, `astro.config.mjs`, `tsconfig.json`, `check-bundle.mjs`,
  `check-no-js.sh`, `src/components/ChipIsland.tsx`, `src/pages/probe/island.astro`,
  `src/pages/probe/static.astro`, `bundle-report.txt` — all FOUND (gitignored, so present
  on disk only)

**Commits verified in `git log`:**
- `cb288db` — FOUND
- `a32f84f` — FOUND

**Plan `<verification>` block, all five:**
- `npx astro build` exits 0 — PASS
- `bash check-no-js.sh` exits 0 — PASS
- `bundle-report.txt` names prosemirror and tiptap with six-digit byte counts — PASS
- `git check-ignore -q .playground` exits 0 and `test ! -f package.json` exits 0 — PASS
- `00-FINDINGS.md` carries all 16 gap IDs and all five tier strings — PASS
