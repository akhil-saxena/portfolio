---
phase: 0
slug: design-ideation
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-17
reconciled: 2026-08-17
plan_count: 17
task_count: 40
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `00-RESEARCH.md` §Validation Architecture.
> **Reconciled 2026-08-17** against the full 17-plan set (00-01 … 00-17, 40 tasks).

**Phase 0 has no application code and no unit-test framework of its own.** Its "tests" are
measurement scripts inside the throwaway `.playground/` plus committed grep/structure gates over
the Markdown artefacts, and they are genuine pass/fail gates — several exist specifically to
settle claims that Phases 1, 5, 06.1 and 7 depend on.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None in this repo — `package.json` does not exist at the portfolio root yet, and this phase does not create one. Measurement is by Node scripts + Playwright inside `.playground/`, plus Node scripts committed under `.planning/phases/00-design-ideation/scripts/` |
| **Config file** | none — plan 01 creates the scaffold |
| **Quick run command** | `cd .playground && npx astro build && node check-theme-exhaustive.mjs && node check-coverage.mjs` |
| **Full suite command** | `cd .playground && npx astro build && node check-bundle.mjs; node check-theme-exhaustive.mjs && node check-font-names.mjs && node check-contrast.mjs && node check-css-size.mjs && node check-coverage.mjs && node check-states.mjs && bash check-no-js.sh && bash check-no-ivory.sh && node probe.mjs` |
| **Estimated runtime** | < 5 s quick (research measured a two-page build at 606 ms with warm `node_modules`); full suite adds a Playwright run, ~30 s |
| **Excluded from the sampling loop** | `.playground/shoot.mjs` (plan 17) — a one-off full-page capture of 35+ artefacts, minutes not seconds. It is an exit gate, not a feedback gate, and is deliberately outside the latency budget below. |

*`../design-system` runs Vitest 4 + Playwright 1.59 + Storybook test-runner; Phase 1
inherits that. Phase 0 deliberately does not stand up a test framework in the portfolio
repo — that is Phase 2's FND-06.*

---

## Sampling Rate

- **After every task commit:** `npx astro build && node check-theme-exhaustive.mjs` (playground
  tasks) or the task's own grep/structure gate (Markdown-artefact tasks)
- **After every plan wave:** full suite including `probe.mjs`
- **Before `/gsd-verify-work`:** full suite green, `00-FINDINGS.md` populated with `tiers`,
  the screenshot record present with ≥ 35 PNGs, and `test ! -d .playground` after the
  deletion task (**plan 00-17, task 3**)
- **Max feedback latency:** ~5 seconds (quick), ~30 seconds (full)

---

## Per-Task Verification Map

> Task IDs are `{plan}.{task}`. Every `auto` task in the phase appears here.
> `File Exists` marks whether the referenced script exists before the task runs, or is created
> by the task itself (**self**) or by an earlier plan (**named**).

### Wave 1 — foundation (no dependencies)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01.1 | 00-01 | 1 | DSGN-04 | T-00-01, T-00-05, T-00-06 | Packages verified non-slopsquatted before install; no adapter, no CI, no api route, no auth | integration (build) | `cd .playground && npm install && test ! -L node_modules/@akhil-saxena/design-system && npx astro build` | self | ⬜ pending |
| 01.2 | 00-01 | 1 | DSGN-04 | — | N/A | integration (build) | `node .playground/check-bundle.mjs` · `bash .playground/check-no-js.sh` | self | ⬜ pending |
| 01.3 | 00-01 | 1 | DSGN-04 | — | N/A | unit (static) | grep gate over `00-FINDINGS.md` for AAA-1 + G-1…G-15 and the `tiers` schema | self | ⬜ pending |
| 02.1 | 00-02 | 1 | DSGN-06 | T-00-08 | Invented facts fail the gate; bare numbers inside a gap block are rejected | unit (static) | `node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs` | self | ⬜ pending |
| 02.2 | 00-02 | 1 | DSGN-06 | T-00-08 | Every claim carries a `[source:` marker | unit (static) | `node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs` | 02.1 | ⬜ pending |
| 03.1 | 00-03 | 1 | DSGN-01 | — | N/A | unit (static) | heading + route grep gate over `00-ADMIN-IA.md` (`IA_ROUTES_OK`) | self | ⬜ pending |
| 03.2 | 00-03 | 1 | DSGN-01 | — | N/A | unit (static) | artefact-ID grep gate over `00-ADMIN-IA.md` (`IA_INVENTORY_OK`) | 03.1 | ⬜ pending |

### Wave 2 — theme tokens and long/short copy

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04.1 | 00-04 | 2 | DSGN-05 | T-00-12 | Non-existent `@fontsource-variable/ibm-plex-mono` asserted absent | integration (build) | `cd .playground && npx astro build` | 01.1 | ⬜ pending |
| 04.2 | 00-04 | 2 | DSGN-05 | — | N/A | unit (static) | `node .playground/check-theme-exhaustive.mjs` · `node .playground/check-font-names.mjs` | self | ⬜ pending |
| 04.3 | 00-04 | 2 | DSGN-05 | — | N/A | unit (static) | `node .playground/check-contrast.mjs` (three surfaces per mode) | self | ⬜ pending |
| 05.1 | 00-05 | 2 | DSGN-06 | T-00-07, T-00-08 | Only publicly-findable material stated as fact; stale `.planning/PROJECT.md` excluded as a source | unit (static) | `node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs` | 02.1 | ⬜ pending |
| 05.2 | 00-05 | 2 | DSGN-06 | T-00-07, T-00-14 | Rejected alternatives quoted from `REMOVED.md`, never invented | unit (static) | `node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs` + heading `diff` | 02.1 | ⬜ pending |
| 06.1 | 00-06 | 2 | DSGN-06 | T-00-07, T-00-14 | Motivation and outcome marked as gaps, never asserted | unit (static) | `node …/check-copy-length.mjs && diff <(grep -o '^## .*' case-timeshift.md) <(grep -o '^## .*' case-hued.md)` | 02.1 | ⬜ pending |
| 06.2 | 00-06 | 2 | DSGN-06 | T-00-14 | Exactly one code-visible decision; no manufactured register | unit (static) | `node …/check-copy-length.mjs` + two heading `diff` calls | 06.1 | ⬜ pending |

### Wave 3–4 — cascade, packaging, theme API, public sketches

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07.1 | 00-07 | 3 | DSGN-04, DSGN-05 | T-00-01, T-00-17 | Playwright loads only `localhost` serving this repo's own `dist/`; listener closed before exit | e2e (browser) | `node .playground/probe.mjs` | self |⬜ pending |
| 07.2 | 00-07 | 3 | DSGN-04 | — | N/A | integration (build) | `node .playground/check-css-size.mjs` | self | ⬜ pending |
| 07.3 | 00-07 | 3 | DSGN-05 | — | N/A | integration (build) | `cd .playground && npx astro build` against the stub `exports` fixture | self | ⬜ pending |
| 08.1 | 00-08 | 4 | DSGN-05 | — | N/A | unit (static) | heading + token-table grep gate over `00-THEME-API.md` | self | ⬜ pending |
| 08.2 | 00-08 | 4 | DSGN-05 | — | N/A | unit (static) | packaging/no-flash section grep gate over `00-THEME-API.md` | 08.1 | ⬜ pending |
| 09.1 | 00-09 | 4 | DSGN-03, DSGN-04 | T-00-21, T-00-23 | Zero `client:*` on public surfaces; fixtures are already-public content only | integration (build) | `cd .playground && npx astro build && bash check-no-js.sh` | 01.2 | ⬜ pending |
| 09.2 | 00-09 | 4 | DSGN-03 | T-00-23 | Zero `client:*` | integration (build) | `npx astro build && bash check-no-js.sh` | 01.2 | ⬜ pending |
| 09.3 | 00-09 | 4 | DSGN-03 | T-00-22 | Three measured contrast failures corrected by name, not carried | integration (build) | `bash .playground/check-no-ivory.sh` | self | ⬜ pending |

### Wave 5–6 — case-study templates and the public human review

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10.1 | 00-10 | 5 | DSGN-02 | T-00-23 | Zero `client:*`; copy loaded from committed Markdown, no HTML string path | integration (build) | `npx astro build && bash check-no-js.sh` | 01.2 | ⬜ pending |
| 10.2 | 00-10 | 5 | DSGN-02 | T-00-23 | Zero `client:*` | integration (build) | `npx astro build && bash check-no-js.sh` | 01.2 | ⬜ pending |
| 11.1 | 00-11 | 6 | DSGN-03 | — | N/A | **checkpoint** (human-verify) | none — blocking human gate | n/a | ⬜ pending |
| 11.2 | 00-11 | 6 | DSGN-02 | — | N/A | **checkpoint** (human-verify) | none — blocking human gate | n/a | ⬜ pending |
| 11.3 | 00-11 | 6 | DSGN-02, DSGN-03 | — | N/A | unit (static) | grep gate over `00-PUBLIC-DESIGN-NOTES.md` + `00-FINDINGS.md` | 09.3, 01.3 | ⬜ pending |

### Wave 7–11 — the admin sketch set (DSGN-01's screen design)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12.1 | 00-12 | 7 | DSGN-01, DSGN-04 | T-00-06, T-00-28 | Admin shell depicts no auth-optional or dev-bypass path; no adapter, no D1 | integration (build) | `npx astro build` + the `REGISTRY_OK` 42-cell arithmetic check | self | ⬜ pending |
| 12.2 | 00-12 | 7 | DSGN-01 | T-00-23, T-00-29, T-00-30 | Hydration allowlist fails in both directions; fixtures are public content only | integration (build + dev) | `node .playground/check-states.mjs && bash check-no-js.sh` | self | ⬜ pending |
| 13.1 | 00-13 | 8 | DSGN-01 | T-00-32 | Dropzone depicts no ingest path, so Phase 7 inherits no validation shape | integration (build) | `npx astro build && node check-states.mjs` + ≥ 39 `<img` assertion | 12.2 | ⬜ pending |
| 13.2 | 00-13 | 8 | DSGN-01, DSGN-04 | T-00-31, T-00-23 | No local announcer added — G-13 left intact as evidence; no persistence | integration (build) | `npx astro build && bash check-no-js.sh && node check-states.mjs` | 12.2 | ⬜ pending |
| 14.1 | 00-14 | 9 | DSGN-01, DSGN-04 | T-00-35, T-00-06 | Refusal is a designed state at comfortable density; no persistence in the island | integration (build) | `npx astro build && bash check-no-js.sh && node check-states.mjs` | 12.2 | ⬜ pending |
| 14.2 | 00-14 | 9 | DSGN-01, DSGN-04 | T-00-02, T-00-33, T-00-34 | `outputFormat="json"` only — no HTML string path; no local mark suppression; drift warning stays soft | integration (build) | `npx astro build && bash check-no-js.sh && node check-states.mjs` | 12.2 | ⬜ pending |
| 15.1 | 00-15 | 10 | DSGN-01 | T-00-03 | 401 modal offers re-authentication only — six bypass phrasings asserted absent | integration (build) | `npx astro build && bash check-no-js.sh && node check-states.mjs` | 12.2 | ⬜ pending |
| 15.2 | 00-15 | 10 | DSGN-01 | T-00-38 | Category delete requires a destination; no "delete anyway" escape | integration (build) | `npx astro build && node check-states.mjs` | 12.2 | ⬜ pending |
| 15.3 | 00-15 | 10 | DSGN-01, DSGN-04 | T-00-36, T-00-37 | Per-file resolution only — no global "accept all"; overwrite names what it drops | integration (build) | `npx astro build && node check-states.mjs` + per-file action-count assertion | 12.2 | ⬜ pending |
| 16.1 | 00-16 | 11 | DSGN-01 | T-00-03, T-00-41 | Discard guards scale with scope; 401 treatment matches `O-reauth-401` exactly | integration (build) | `npx astro build && bash check-no-js.sh && node check-states.mjs` | 12.2 | ⬜ pending |
| 16.2 | 00-16 | 11 | DSGN-01 | T-00-42 | Phone artefacts asserted free of `data-density="compact"`; ≥ 44px touch target | integration (build) | `npx astro build && bash check-no-js.sh` + zero-`client:` directory assertion | 12.2 | ⬜ pending |
| 16.3 | 00-16 | 11 | DSGN-01, DSGN-04 | T-00-39, T-00-40 | Blank cell, dangling `ref` and reasonless `n/a` each fail the build; no tier re-written | integration (build) | `npx astro build && node .playground/check-coverage.mjs` | self | ⬜ pending |

### Wave 12 — exit: screenshot record, review, deletion

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17.1 | 00-17 | 12 | DSGN-01…04 | T-00-44, T-00-45 | Mode asserted per class in-script, not trusted from the page; nothing secret exists to capture | e2e (browser) | `node .playground/shoot.mjs` + filename-contract regex + ≥ 35 PNG count | self | ⬜ pending |
| 17.2 | 00-17 | 12 | DSGN-01…04 | T-00-43 | Blocking human gate before an irreversible, unrecoverable deletion | **checkpoint** (human-verify) | none — blocking human gate | n/a | ⬜ pending |
| 17.3 | 00-17 | 12 | DSGN-01…04 | T-00-04, T-00-06, T-00-43 | Pre-flight runs before the `rm`; fence verified by absence; nothing in git history | integration (shell) | `test ! -d .playground` + five absence assertions (`FENCE_HELD`) | 17.1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage:** 40 tasks — 37 `auto`, all 37 carrying an `<automated>` block; 3 `checkpoint`
tasks (11.1, 11.2, 17.2), which are exempt by type. Longest run without an automated verify is
**2** (11.1 → 11.2), inside the 3-task continuity limit.

---

## Wave 0 Requirements

Phase 0 has no separate Wave 0: the scaffold and every measurement script are created by the
task that first needs them, always in an earlier wave than any task that consumes them. The
`File Exists` column above records that chain. Every item below is owned:

- [ ] `.playground/` scaffold — `package.json`, `astro.config.mjs`, tarball install → **01.1**
- [ ] `.playground/check-bundle.mjs` — DSGN-04 tree-shaking → **01.2**
- [ ] `.playground/check-no-js.sh` — DSGN-04 zero-JS → **01.2**, rewritten as an explicit
      four-route allowlist by **12.2**
- [ ] `.playground/probe.mjs` + `src/pages/probe/casc-{a,b,c,d}.astro` — cascade order → **07.1**
- [ ] `.playground/check-theme-exhaustive.mjs` — DSGN-05, the load-bearing invariant → **04.2**
- [ ] `.playground/check-font-names.mjs` — font-family/`@font-face` agreement → **04.2**
- [ ] `.playground/check-contrast.mjs` — three surfaces per mode → **04.3**
- [ ] `.playground/check-css-size.mjs` — the D-33 manifest → **07.2**
- [ ] `.planning/phases/00-design-ideation/scripts/check-copy-length.mjs` — DSGN-06 length
      realism → **02.1** *(lives in the phase directory, not the playground, because it must
      survive the D-02 deletion)*
- [ ] `.playground/check-no-ivory.sh` — DSGN-03 ivory absence → **09.3**
- [ ] `.playground/src/lib/artefacts.mjs` — canonical IDs and the 42-cell arithmetic → **12.1**
- [ ] `.playground/check-states.mjs` — proves `?state=` varies the render → **12.2**
- [ ] `.playground/src/lib/coverage.mjs` + `check-coverage.mjs` — the no-blank-cell gate → **16.3**
- [ ] `.playground/shoot.mjs` — the screenshot record → **17.1**
- [ ] Fixture: stub package with the proposed `exports` map — DSGN-05 packaging → **07.3**
- [ ] `npm i playwright` in `.playground` (Chromium already cached) → **07.1**

---

## Manual-Only Verifications

| Behavior | Requirement | Task ID | Why Manual | Test Instructions |
|----------|-------------|---------|------------|-------------------|
| Every screen × state cell is `designed` / `inherits` / `n/a` | DSGN-01 | 16.3 (machine) + 17.2 pass 1 (human) | *Coverage* is machine-checkable — the matrix is generated from each route's `STATES` array and a blank cell fails the build; *whether an `n/a` reason is convincing* is a design judgement | Review Part 2 of the contact sheet; no cell unaccounted for, and every `n/a` reason defensible |
| Each screen's IA matches its entity and its field catalog is complete | DSGN-01 | 17.2 pass 2 | Design judgement against `00-ADMIN-IA.md` | Open all seven `S-` artefacts |
| Each empty state says what is missing **and** what to do | DSGN-01 | 17.2 pass 3 | Copy judgement | Open the five `E-` artefacts |
| The three error treatments are genuinely distinct, and `dirty` is legible in all three D-13 places | DSGN-01 | 17.2 pass 4 | Design judgement | Open the eight `T-` artefacts |
| `O-conflict-diff` lets one file be resolved without abandoning another | DSGN-01 | 17.2 pass 5 | The single question D-16 exists to answer; no grep can judge it | Open the nine `O-` artefacts |
| The four phone capabilities are complete and the two refusals read as honest | DSGN-01 | 17.2 pass 6 | Design judgement | Open the four `P-` and two `R-` artefacts at 390 wide |
| Both case-study templates render against real drafted copy, not lorem | DSGN-02 | 11.2 | Design judgement | Visual review of `/case/long` and `/case/short` |
| Work and Photos read as charcoal, not recoloured ivory | DSGN-03 | 11.1 | The token grep proves absence of ivory, not that the result is good | Side-by-side review against the handoff prototypes |
| The screenshot record is legible, correctly moded and full-page | DSGN-01…04 | 17.2 | These images are all that survives the deletion | Spot-check `screenshots/` before approving task 17.3 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 37/37 `auto` tasks carry an
      `<automated>` block; the 3 `checkpoint` tasks are exempt by type
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — longest run is 2
      (11.1 → 11.2)
- [x] Wave 0 covers all MISSING references — every script is created by a task in an earlier
      wave than the first task that consumes it; the chain is recorded in the `File Exists` column
- [x] No watch-mode flags — verified by grep across all 17 plans
- [x] Feedback latency < 30s — quick loop ~5 s, full suite ~30 s. `shoot.mjs` (17.1) is
      explicitly excluded from the sampling loop as a one-off exit capture
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ⬜ **pending — requires the developer.** The six items above are satisfied and
checked by inspection of the plan set. Sign-off itself is a human decision and is deliberately
left unticked; it is also gated behind the two open items below, both of which need a human
answer rather than a measurement.

`wave_0_complete` stays `false` until plan 01 runs — no scaffold exists on disk yet.

---

## Open items — need a human answer before they become gates

**1. The 50 KB gzip island threshold.** `check-bundle.mjs` uses **50 KB gzip** as the pass
threshold for a public island chunk (research assumption A8). It was derived from the
Lighthouse 95+ goal and PUB-14, not from a stated budget. Confirm or replace it before it gates
anything.

*Context: research measured a single `import { Chip }` island at **176,754 bytes gzip** — 3.5×
over this threshold — so the check fails today regardless of where the line is drawn. Plan 01
task 2 therefore runs it as a **measurement** (`|| true`) and asserts on the report contents,
not on the exit code. That accommodation is deliberate and must not be "fixed" into a hard gate
until the threshold is confirmed.*

**2. Approval of the design itself.** Tasks 11.1, 11.2 and 17.2 are blocking human checkpoints.
17.2 in particular gates an **irreversible, unrecoverable** deletion: `.playground/` is
gitignored by design, so once task 17.3 runs there is nothing to restore from. No automated
gate can substitute for that approval.
