---
phase: 00-design-ideation
plan: 03
subsystem: ui
tags: [admin-cms, information-architecture, design-system, schema-migration, wireframes]

# Dependency graph
requires:
  - phase: 00-design-ideation
    provides: 00-CONTEXT.md decisions D-01…D-47, 00-RESEARCH.md field-catalog recovery and combinatorial analysis, 00-UI-SPEC.md Component Mapping and Review Convention
provides:
  - Seven-route, route-per-entity admin IA replacing the legacy three-tab model, including the 7th route (/admin/projects/[id]) that D-05 omitted
  - Complete field catalog recovered from the legacy PropertiesPanel — 13 Selection variants and every field label mapped to a route and a design-system composition target
  - Five schema decisions resolved in writing with a chosen shape, including the résumé date-shape drift
  - The six admin states given a real scope and artefact count, with the 42-cell coverage contract that makes D-03 checkable
  - Forty canonical artefact IDs recorded as a rename-proof contract for plans 09–16
affects: [phase-3-schema-migrations, phase-7-admin-build, plans 12-16 admin sketching]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-per-entity admin IA — one entity per route, no tab-conditional panels"
    - "Gap-not-workaround: every design-system shortfall is a 00-FINDINGS.md ID, never a bespoke substitute"
    - "Coverage contract over exhaustive rendering — 42 cells declared, ~35 artefacts drawn"

key-files:
  created:
    - .planning/phases/00-design-ideation/00-ADMIN-IA.md
  modified: []

key-decisions:
  - "Résumé date-shape drift resolved: structured startMonth/startYear/endMonth/endYear/isPresent fields win; the period string is derived at render time, never stored"
  - "Photo tags field is dropped with evidence (0 of 39 photos carry a tag), recorded as a decision rather than a silent omission"
  - "No legacy Selection variant maps to /admin/site — site_config.json had no editor at all, which is why the category drift developed unnoticed"
  - "The per-category photo order is modal on the active filter, so /admin/photos must state which ordering field a reorder writes"

patterns-established:
  - "Artefact notes state what an artefact proves, not what it shows — a sketch that only shows something is not evidence"
  - "EXIF omission rule: missing fields are omitted entirely in public render, empty-but-editable in the admin"

requirements-completed: [DSGN-01]

# Metrics
duration: 13min
completed: 2026-08-17
---

# Phase 0 Plan 03: Admin CMS Information Architecture Summary

**A 473-line route-per-entity admin IA that recovers all 39 legacy form controls into seven routes, resolves five schema decisions the port would otherwise discover in Phase 7, and pins forty artefact IDs as a rename-proof review contract.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-17T05:55:00Z
- **Completed:** 2026-08-17T06:07:52Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- **Every field the legacy admin edited has a named home.** All 13 `Selection` variants map to one of the seven routes, and every recovered field label carries a route plus a design-system composition target. The legacy control counts (39 form controls, 34 buttons) are recorded as the port's completeness test — a route set that lands at 30 controls has silently dropped something.
- **The seventh route is written down.** D-05 lists six routes; D-24's "a project owns its case study" implies a seventh (`/admin/projects/[id]`) that no decision recorded. It now exists on paper, with the observation that the legacy `dev` tab edited the project *card* and nothing behind it — the void D-24 fills.
- **Five schema decisions resolved, not deferred.** `projects.json` extraction, segment bullets, per-category photo order, canonical category records, and the date-shape drift each carry a chosen shape and a one-line reason.
- **The category drift is cited at its origin.** `portfolio_images.json` stores `architecture`; `site_config.json`'s `categoryColumns` keys the same category as `Architecture`; the legacy `PropertiesPanel` reconciled them with a render-time `c.charAt(0).toUpperCase() + c.slice(1)`. Splitting display from key removes the transform, and a transform that does not exist cannot disagree with the data.
- **D-03's exhaustiveness became a bounded target.** The naive product (≈108 artefacts) is reduced to ≈35 by giving each of the six states its real scope, with a 42-cell coverage matrix in which a blank cell fails review.
- **Forty canonical artefact IDs recorded**, each with a one-line note on what it *proves*.

## Task Commits

Each task was committed atomically:

1. **Task 1: Recover the legacy field catalog and write the route-per-entity IA** - `1e96ab8` (docs)
2. **Task 2: Resolve the four schema decisions and the state-scope reduction** - `5b10004` (docs)

## Files Created/Modified

- `.planning/phases/00-design-ideation/00-ADMIN-IA.md` - 473 lines, six H2 sections: Routes, Field catalog, Schema decisions this IA forces, What is deliberately not ported, States and where each actually lives, Artefact inventory.

## Decisions Made

Four decisions were made inside the plan's stated latitude:

1. **The date-shape drift resolves in favour of the structured fields.** The plan said "pick one shape, state which." Structured `startMonth`/`startYear`/`endMonth`/`endYear`/`isPresent` wins and `period` becomes a derived string, never persisted. Rationale: the fact being edited is a date range, a free-text string is a lossy encoding that invites format drift across entries, and "is this role current?" needs to be modelled rather than parsed out of prose. The formatter's acceptance test is exact reproduction of the four strings on disk today (en dash, three-letter month), so the public page does not visibly change on migration. Consequence recorded: +4 controls per experience and per education entry.

2. **`Photo — Tags` is recorded as deliberately dropped, with evidence.** PROJECT.md lists it under Out of Scope; the manifest was checked this session and confirms 0 of 39 photos carry a tag. Recording the drop as a decision-with-evidence is what keeps must-have truth #1 ("nothing silently dropped") true.

3. **The absence of a `/admin/site` legacy variant is stated as a finding.** No `Selection` variant maps to that route because `site_config.json` had no editor at all — its `categoryColumns` map was hand-edited in the repo. That absence is the mechanism by which the D-25 drift developed unnoticed, so it is recorded rather than passed over.

4. **The per-category order is described as modal on the active filter.** D-22 says the per-category value wins when a filter is active; the consequence for `/admin/photos` — that the screen must say which field a reorder is writing — is drawn out, because an unstated mode is how an operator concludes a reorder was lost.

## Deviations from Plan

None - plan executed exactly as written.

Two small factual corrections were folded into the document rather than treated as deviations, since the plan asked for verbatim recovery and verbatim recovery is what surfaced them:

- The plan's recovered label list names the project title field as **Name**; the rendered source labels it **Title**.
- The plan's list names the CTA link field as **Link URL**; the rendered source labels it **Link**.

Both are recorded in the field catalog under a note so the port does not chase a label that was never on screen. No plan instruction was contradicted — the plan's list is reproduced intact and the source difference is annotated beside it.

## Issues Encountered

- The worktree spawned at a commit older than the wave base (`697b094`). Corrected with `git reset --hard` after the branch-namespace assertion passed; the working tree was clean, so nothing was lost.
- Several verification commands in the plan are multi-clause shell one-liners that the worktree sandbox refuses to run. Executed them as scripts in the scratchpad instead — same commands, same results, no semantic change.

## Threat Model Compliance

All three `mitigate` dispositions in the plan's STRIDE register are satisfied by content in the document:

| Threat ID | Mitigation location |
|-----------|---------------------|
| T-00-09 (stored XSS designed in) | Schema decision 2 states "**No HTML string exists anywhere in the shape**" and explains that the legacy class is designed out rather than filtered, with the measured evidence (`<strong>` is the only markup across all 18 bullets). |
| T-00-10 (silent overwrite on publish) | The `DeployButton.tsx` analog records both the `JSON.stringify` diff and the `baseSha: "latest"` bypass as the defect being fixed, names D-10's save-time blob SHA as the real baseline, and gives the conflict screen a named home (`O-conflict-diff`, D-16). |
| T-00-11 (401 re-auth affordance) | `O-reauth-401` proves "denies and re-authenticates with on-screen state preserved and the save retried in place (D-19) — and **never** depicts a bypass or a client-held credential." |

No new security-relevant surface was introduced. No secret, token or binding is named; every data shape described is already-public site content committed to the repository.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plans 12–16 have their sketching target.** The seven routes, the field catalog and the forty artefact IDs are the input those plans sketch against, and the 42-cell coverage contract is the completeness test they are checked by.
- **Phase 3 has four of its five migrations specified in writing** — `projects.json` extraction, segment bullets, per-category order, canonical category records — plus the date-shape resolution, which was previously an open discovery.
- **Phase 7 has its port source.** The document is self-contained and survives `.playground/`'s deletion at phase exit (D-02).
- **Carried forward, not blocking:** the gaps this IA depends on (G-1 crop picker and G-7 conflict diff) are `blocks-Phase-7` and sit outside Phase 1's scope by design; G-3/G-4 (`RichText`) are load-bearing for schema decision 2 and are already tiered `should-fix-in-Phase-1`.

## Self-Check: PASSED

- `.planning/phases/00-design-ideation/00-ADMIN-IA.md` — FOUND (473 lines, 6 H2 sections)
- Commit `1e96ab8` — FOUND
- Commit `5b10004` — FOUND
- Task 1 automated verify (`IA_ROUTES_OK`) — PASSED
- Task 2 automated verify (`IA_INVENTORY_OK`, all 40 artefact IDs) — PASSED
- All task-1 and task-2 acceptance criteria re-checked after task 2's edits — PASSED, no regression

---
*Phase: 00-design-ideation*
*Completed: 2026-08-17*
