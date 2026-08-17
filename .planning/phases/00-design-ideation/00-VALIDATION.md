---
phase: 0
slug: design-ideation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-17
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `00-RESEARCH.md` §Validation Architecture.

**Phase 0 has no application code and no unit-test framework of its own.** Its "tests" are
measurement scripts inside the throwaway `.playground/`, and they are genuine pass/fail
gates — three of them exist specifically to settle claims that Phases 1 and 5 depend on.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None in this repo — `package.json` does not exist at the portfolio root yet. Measurement is by Node scripts + Playwright inside `.playground/` |
| **Config file** | none — Wave 0 creates the scaffold |
| **Quick run command** | `cd .playground && npx astro build && node check-bundle.mjs && node check-theme-exhaustive.mjs` |
| **Full suite command** | `cd .playground && npx astro build && node check-bundle.mjs && node check-theme-exhaustive.mjs && node probe.mjs && bash check-no-js.sh` |
| **Estimated runtime** | < 5 s quick (research measured a two-page build at 606 ms with warm `node_modules`); full suite adds a Playwright run |

*`../design-system` runs Vitest 4 + Playwright 1.59 + Storybook test-runner; Phase 1
inherits that. Phase 0 deliberately does not stand up a test framework in the portfolio
repo — that is Phase 2's FND-06.*

---

## Sampling Rate

- **After every task commit:** `npx astro build && node check-theme-exhaustive.mjs`
- **After every plan wave:** full suite including `probe.mjs`
- **Before `/gsd-verify-work`:** full suite green, `00-FINDINGS.md` populated with triage
  tiers, and `test ! -d .playground` after the deletion task
- **Max feedback latency:** ~5 seconds (quick), ~30 seconds (full)

---

## Per-Task Verification Map

> Task IDs are assigned at plan time. This is the requirement → test contract each task
> must map onto; the planner populates Task ID / Plan / Wave columns.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | — | T-00-01 | Playground packages verified non-slopsquatted before install | manual gate | `slopcheck install -e npm` | n/a | ⬜ pending |
| TBD | TBD | TBD | DSGN-04 | — | N/A | integration (build) | `node .playground/check-bundle.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-04 | — | N/A | integration (build) | `bash .playground/check-no-js.sh` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-04 | — | N/A | e2e (browser) | `node .playground/probe.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-04 | — | N/A | integration (build) | `node .playground/check-css-size.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-05 | — | N/A | unit (static) | `node .playground/check-theme-exhaustive.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-05 | — | N/A | unit (static) | `node .playground/check-font-names.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-05 | — | N/A | integration (build) | `cd .playground && npx astro build` (stub `exports` fixture) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-05 | — | N/A | unit (static) | `node .playground/check-contrast.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-03 | — | N/A | unit (static) | `grep -rE '#F4F1EB\|#FFFEFB\|#E6E0D2\|#8D8779' .playground/src && exit 1 \|\| exit 0` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-06 | — | N/A | unit (static) | `node .playground/check-copy-length.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DSGN-01 | T-00-03 | Admin sketches depict deny-and-re-authenticate, never a dev-mode bypass | manual-only | contact-sheet coverage table review | n/a | ⬜ pending |
| TBD | TBD | TBD | DSGN-01 | T-00-02 | `RichText` sketch serialises to segments; no paste-HTML affordance depicted | manual-only | sketch review against D-20/D-21 | n/a | ⬜ pending |
| TBD | TBD | TBD | DSGN-02 | — | N/A | manual-only | visual review of `/case/long` and `/case/short` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.playground/` scaffold — `package.json`, `astro.config.mjs`, tarball install (covers all)
- [ ] `.playground/check-bundle.mjs` — DSGN-04 tree-shaking
- [ ] `.playground/check-no-js.sh` — DSGN-04 zero-JS
- [ ] `.playground/probe.mjs` + `src/pages/probe/casc-{a,b,c,d}.astro` — DSGN-04 cascade order
- [ ] `.playground/check-theme-exhaustive.mjs` — DSGN-05, the load-bearing invariant
- [ ] `.playground/check-font-names.mjs` — DSGN-05 font-family/`@font-face` agreement
- [ ] `.playground/check-contrast.mjs` — DSGN-05, port the ratio helper from `../design-system/src/tokens.test.ts`
- [ ] `.playground/check-css-size.mjs` — DSGN-04, measures the D-33 manifest
- [ ] `.playground/check-copy-length.mjs` — DSGN-06 length realism
- [ ] Fixture: stub package with the proposed `exports` map — DSGN-05 packaging
- [ ] `npm i playwright` in `.playground` (Chromium already cached)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Every screen × state cell is `designed` / `inherits` / `n/a` | DSGN-01 | *Coverage* is machine-checkable (generate the matrix from each screen's `STATES` array and assert no cell is unaccounted for); *quality* is a design judgement | Review the contact-sheet coverage table; no cell unaccounted for |
| Both case-study templates render against real drafted copy, not lorem | DSGN-02 | Design judgement | Visual review of `/case/long` and `/case/short` |
| Work and Photos read as charcoal, not recoloured ivory | DSGN-03 | The token grep proves absence of ivory values, not that the result is good | Side-by-side review against the handoff prototypes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Open Threshold — needs confirmation before it becomes a gate

`check-bundle.mjs` uses **50 KB gzip** as the pass threshold for a public island chunk
(research assumption A8). It was derived from the Lighthouse 95+ goal and PUB-14, not from
a stated budget. Confirm or replace it before it gates anything.

*Context: research measured a single `import { Chip }` island at **176,754 bytes gzip** —
3.5× over this threshold — so the check fails today regardless of where the line is drawn.*
