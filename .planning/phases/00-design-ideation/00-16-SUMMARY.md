---
phase: 0
plan: 16
subsystem: design-ideation
tags:
  [
    dsgn-01,
    dsgn-04,
    admin,
    overlays,
    publish,
    discard,
    phone,
    d-09,
    d-11,
    d-12,
    d-14,
    d-15,
    d-17,
    d-18,
    d-19,
    d-20,
    coverage-matrix,
    findings-register,
    g-6,
    touch-floor,
  ]

requires:
  - .playground/ harness (plan 01), theme + fonts (plan 04), manifest-admin.css (plan 07)
  - src/layouts/Admin.astro, src/components/AdminSidebar.tsx, src/lib/artefacts.mjs, check-states.mjs, check-no-js.sh, src/pages/index.astro (plan 12)
  - THE ADMIN SKETCH IDIOM (plan 13) — followed, with stated deviations
  - src/components/SortableStatic.tsx (plan 14) — reused rather than rewritten
  - src/fixtures/dashboard.json (plan 12) and src/fixtures/photos.json (plan 13) — both read, neither edited
  - audit15.mjs (plan 15) — re-run on all twelve new routes rather than replaced
  - data/resume.json — the real Brevo bullet, read at build time
provides:
  - O-publish-valid, O-publish-invalid, T-error-publish, O-discard-screen, O-discard-all — five overlays from one route file
  - P-dashboard, P-text-edit, P-photo-reorder, P-publish, O-phone-sidebar — the four D-09 capabilities and the Sheet
  - src/lib/coverage.mjs — buildMatrix + auditMatrix, the 42-cell generator and its six conditions
  - check-coverage.mjs — the standalone gate, source-parsing so it still reports when the build cannot complete
  - the contact sheet's Part 2 (42 generated cells) and Part 3 (six phone rows), both placeholders removed
  - 00-FINDINGS.md's admin half — measured evidence on G-1, G-2, G-3, G-4, G-5, G-6, G-7, G-8, G-13, plus a 16-row pointer index
  - src/lib/phone.mjs and src/fixtures/overlays.json
affects:
  - Phase 0 plan 17 (12 new URLs to screenshot; the contact sheet is now the whole review surface)
  - Phase 1 (nine rows now carry measurements; TWO GAP STATEMENTS were corrected by measurement — G-3 and G-13)
  - Phase 2 (D-19's fail-closed boundary now stated identically on two surfaces, with the second asserted against six bypass phrasings)
  - Phase 7 (G-6 and G-7 now carry requirements lists; the publish/discard/error surface is designed rather than described)

tech-stack:
  added: []
  patterns:
    - a coverage table must check that an `inherits` RESOLVES, not merely that its ref is a legal id
    - two fixtures that must agree should throw at build time rather than promise in a comment
    - a contract string carrying a COUNT is asserted against the data it describes, so the number cannot be typed
    - a `Link` written inside a sentence measures 16px on every coarse-pointer class — pull it into its own row
    - `grep -c` counts LINES, so a negative control that greps for an id can be satisfied by an unrelated line carrying the same id
    - a declared floor is a guarantee; print the guarantee on the screen and the measurement in the SUMMARY

key-files:
  created:
    - .playground/src/pages/admin/overlays/[...o].astro (gitignored)
    - .playground/src/pages/admin/phone/{dashboard,text-edit,photo-reorder,publish}.astro (gitignored)
    - .playground/src/lib/coverage.mjs + phone.mjs (gitignored)
    - .playground/check-coverage.mjs (gitignored)
    - .playground/src/fixtures/overlays.json (gitignored)
    - .planning/phases/00-design-ideation/00-16-SUMMARY.md
  modified:
    - .planning/phases/00-design-ideation/00-FINDINGS.md — nine rows measured, two gap statements corrected, one pointer index added
    - .planning/phases/00-design-ideation/deferred-items.md — D-16-1 logged, D-15-1 answered
    - .playground/src/pages/index.astro (gitignored) — Parts 2 and 3 filled, the build-failing gate, a 44px floor

decisions:
  - "T-error-publish IS NOW HOSTED, and the class of failure is now machine-caught. It was inherited by the dashboard from plan 12 and designed nowhere; plan 16 task 1 designs it at /admin/overlays/error-publish/ and adds a SIXTH gate condition — UNHOSTED_INHERITS — so an `inherits` whose target nobody built fails the build. The dashboard's cell is still `inherits`, never `designed`; what changed is that the ref now resolves."
  - "THE DISCARD DIALOGS QUOTE 2 AND 6, NOT UI-SPEC'S 6 AND 12. UI-SPEC's contract table illustrates them with worked examples; the real session has 6 changes across 4 screens of which Photos owns 2. Plan 15 set this precedent on the category-delete dialog (14 photos, not the illustrated 12). The clause `across 4 screens` survives verbatim because it is true."
  - "T-error-network IS NOT RE-CLAIMED. Plan 15 hosts it at /admin/projects/cairn/network/. This plan renders the same treatment at /admin/overlays/error-network/ as a CROSS-CHECK with byte-identical copy, and deliberately omits it from the ARTEFACTS export so one treatment keeps one owner."
  - "NO NEW `G-` ROW WAS ADDED to 00-FINDINGS.md, against the plan's explicit permission. The register states its own fixed-denominator rule and two other phases read its pull lists; appending a row would have changed Phase 1's or Phase 7's scope without a decision. The fifteen findings outside the sixteen are transcribed as a POINTER INDEX carrying no tier and explicitly excluded from the pull contract."
  - "The `?o=` mechanism the plan specifies does not exist, for the same measured reason `?state=` does not. Overlays are a rest-param route."
  - "O-phone-sidebar is rendered in a 390 x 640 containment frame with exactly three properties neutralised (position, height, width), each named at its site, so P-dashboard and the sheet can be screenshotted separately."
  - "P-photo-reorder DECLARES a 56px row floor because `.ds-atom-sortable-item` has no height rule of any kind. Measured rows come out at 78px (100px on the badged row) because the thumbnail drives them, so 56px is printed as the guarantee and the measurement lives here."

metrics:
  tasks: 3
  commits: 1
  artefacts: 10
  routes-emitted: 12
  pages-built: 89
  coverage-cells: 42
  gates-green: 9
  gates-failing-by-design: 1
  negative-controls: 4
  duration: ~55m
  completed: 2026-08-18
---

# Phase 0 Plan 16: publish/discard/error overlays, the four phone capabilities, and the generated coverage table Summary

The phase's coverage claim stopped being a claim. **42 cells, generated from the screens'
own `STATES` arrays, zero blanks, and a build that fails on any of six conditions** — including
the one plan 15 found by hand and could not fix: an `inherits` cell whose target nobody ever
built. All five remaining overlays and all four phone capabilities exist, every count in every
destructive dialog is computed from the same fixture the dashboard renders, and
`00-FINDINGS.md` now carries measured evidence on nine gaps instead of the word `pending`.

---

## THE RULING ON `T-error-publish`

Plan 15 handed this over as an open question, and it deserves a direct answer.

**Before this plan it was NOT covered.** `src/pages/admin/[...state].astro` has declared
`{ state: "error", coverage: "inherits", ref: "T-error-publish" }` since plan 12, and no screen
declared it `designed`. The contact sheet's ref guard could not see it, because that guard asks
whether a ref is a member of `CANONICAL_IDS` — and `T-error-publish` is one. The cell read as
covered, linked to a real name, and pointed at nothing. **That is strictly worse than a blank
cell: a blank cell is visibly undone.**

**Two things were done, and both were needed.**

1. **It was given a host**, because the plan's task 1 requires it: `T-error-publish` is now
   designed at `/admin/overlays/error-publish/`. It is the **inline** half of D-18's strict
   severity — the state the dashboard is in when the operator arrives and publishing is already
   blocked, with the pending list still on screen underneath and nothing to close. That is a
   different artefact from `O-publish-invalid`, which is the **modal** the operator gets when
   they press Publish. One is a condition; the other is an interruption. The dashboard's cell
   needs the first, which is exactly why it inherits rather than pointing at the modal.

2. **The class of failure was made machine-catchable**, because a host that somebody remembered
   to build is not a guarantee. `src/lib/coverage.mjs` adds a sixth condition,
   **`UNHOSTED_INHERITS`**: every `inherits` ref must resolve to an artefact some module
   actually declares — either a `designed` cell, or an `ARTEFACT` / `ARTEFACTS` export on a
   route that has no coverage cell of its own. Verified to bite (negative control 4 below).

**What the matrix reports.** The dashboard's `error` cell is still `inherits`, never
`designed` — no cell anywhere claims `T-error-publish` as designed-in-place. What the table now
additionally prints, in every `inherits` cell, is **where the treatment is hosted**, as a link.
So the table says what it means: this cell is covered *by that artefact, at that URL*, and the
build fails if that URL does not exist.

---

## THE OVERLAY PROBLEM, RE-MEASURED BEFORE ANYTHING WAS WRITTEN

Plan 15's headline finding was reproduced against the installed 1.11.4 tarball with
`react-dom/server` before the first route file, because this plan needed **four** portalled
components rather than three:

| composed | server-rendered |
|---|---|
| `<ConfirmDialog open tone="danger" …/>` | **0 B** |
| `<TypeToConfirm open guardWord="discard" …/>` | **0 B** |
| `<Sheet open side="left">…</Sheet>` | **0 B** |
| `<Modal open title="T">…</Modal>` | **0 B** |
| `<FormErrorSummary errors={[…]} />` | **156 B** ← renders |
| `<AlertBanner open tone="danger" …/>` | **279 B** ← renders |

**Measuring first is what made the plan executable.** Two of the six DO render, so
`O-publish-invalid` composes the real `FormErrorSummary` and `T-error-publish` and
`T-error-network` compose the real `AlertBanner`. Only the four that render nothing are
prototyped, hand-authored against `modal.css` and `sheet.css`'s own class names — every painted
pixel is still the design system's and the only local thing is the mounting. Each site carries
a `data-ds-component` attribute naming what it stands in for, and every route in the file
prints the substitution on screen as review chrome.

**One consequence worth stating plainly for Phase 7:** no dialog in the product is
server-rendered, so none exists for a no-JS reader or a crawler. The proposed fix is unchanged
from plan 15 — an `inline` / `portal={false}` escape, or an SSR-safe `DSPortal` that renders in
place and adopts on mount.

---

## THE COUNTS, AND WHY THEY ARE NOT UI-SPEC'S

UI-SPEC's contract table illustrates the two discard dialogs with **"The 6 pending changes on
this screen"** and **"12 pending changes across 4 screens"**. The sketched session — which is
the dashboard's `dirty` state, transcribed — is:

```
home    home_config.json        2 changes    draft
photos  portfolio_images.json   2 changes    draft
resume  resume.json             1 change     ready
site    site_config.json        1 change     ready
                                6 changes across 4 screens, in 4 files
```

So the dialogs read **"The 2 pending changes on this screen"** and **"6 pending changes across
4 screens"**. The clause `across 4 screens` is verbatim and true. Plan 15 set this precedent
explicitly — UI-SPEC illustrates the category-delete dialog with *"12 photos use it"* and
Architecture really has fourteen — and the rule it stated applies unchanged here: **a dialog
whose entire job is to state a blast radius may not state it from an example.**

**The agreement is enforced, not promised.** `/admin/overlays/[...o].astro` imports *both*
`overlays.json` and `dashboard.json` and throws if the entity set or any per-entity change
count has drifted:

```
admin/overlays: the overlay fixture has drifted from the dashboard fixture.
  dashboard.json dirty : home:2 photos:2 resume:1 site:1
  overlays.json session: …
```

And the two contract strings that carry a count inside them are asserted against the data they
describe — `3 things must be fixed before publishing.` against `errors.length`, and
`Processing failed for 2 photos.` against `pipelineFailure.failed` — so neither number can be
typed. `P-publish` reads the same fixture, and the two confirms were diffed in the built HTML:
both emit `Publish 6 changes across 4 screens?` and `This commits 4 files`.

---

## WHAT WAS BUILT — 10 ARTEFACTS, 12 ROUTES

| Artefact | Route | Notes |
|---|---|---|
| `O-publish-valid` | `/admin/overlays/publish-valid/` | `ConfirmDialog tone="neutral"`, prototyped. Lists 4 entities, 6 changes, 4 files, and states D-12's asynchrony. |
| `O-publish-invalid` | `/admin/overlays/publish-invalid/` | Real `FormErrorSummary` + three deep links rendered **beside** it. G-6's evidence. |
| `T-error-publish` | `/admin/overlays/error-publish/` | The inline publish block. **Newly hosted** — see the ruling above. |
| `O-discard-screen` | `/admin/overlays/discard-screen/` | `ConfirmDialog tone="danger"`, prototyped. Names the 2 changes it drops and the 4 it leaves. |
| `O-discard-all` | `/admin/overlays/discard-all/` | `TypeToConfirm guardWord="discard"`, prototyped, with the guard field and its case-sensitivity stated. |
| `O-pipeline-strip` (failure) | `/admin/overlays/pipeline-failure/` | Existing id, failure variant. The strip is in the **topbar** via the layout, which is G-8. |
| `T-error-network` | `/admin/overlays/error-network/` | **Cross-check, not a second host.** Byte-identical copy to plan 15's `O-reauth-401`. |
| `P-dashboard` + `O-phone-sidebar` | `/admin/phone/dashboard/` | Capability 1. The sheet renders the *same* `AdminSidebar` the desktop shell does. |
| `P-text-edit` | `/admin/phone/text-edit/` | Capability 2, against the real 148-character Brevo bullet 4. |
| `P-photo-reorder` | `/admin/phone/photo-reorder/` | Capability 3, six real Architecture photos through plan 14's `SortableStatic`. |
| `P-publish` | `/admin/phone/publish/` | Capability 4, same list and counts as `O-publish-valid`. |
| — | `/admin/overlays/` | Index over the seven overlay routes. |

**The two refusals are linked from all four phone routes**, so Part 3's six rows all resolve to
something a reviewer can open. `R-crop-picker` is at `/admin/home/phone/` (plan 14) and
`R-case-study-authoring` at `/admin/projects/cairn/phone/` (plan 15).

### D-09's two refusals read as honest rather than broken

Both were built by earlier plans; this plan's job was to make them reachable and to say why
they are refusals. Each of the four phone routes carries a **"DELIBERATELY NOT HERE"** section
listing what that capability omits and why — not what is missing, but what was declined:
`P-text-edit` declines emphasis, links and code (G-3 is the reason, spelled out), bullet
reordering and structural edits; `P-photo-reorder` declines crop (G-1), upload and category
reassignment; `P-publish` declines the invalid state and the conflict screen, on the stated
ground that both are *reading* surfaces. The phone index rows for the two `R-` artefacts are
rendered with a dashed rule and a `refused` badge beside the four permitted ones, so the closed
set is visible as a set. And the contact sheet's Part 3 states the property that makes a
refusal honest: **neither ends in a dead end** — the crop refusal leaves every other field on
Home editable and the case-study refusal leaves the project's card fields editable.

---

## THE COVERAGE TABLE — 42 CELLS, SIX CONDITIONS, FOUR NEGATIVE CONTROLS

```
  screen          empty       loading     error       dirty       conflict    success
  dashboard       designed    designed    inherits    designed    inherits    designed
  home            inherits    inherits    inherits    inherits    inherits    inherits
  photos          designed    designed    designed    inherits    inherits    inherits
  resume          designed    inherits    inherits    inherits    inherits    inherits
  projects        designed    inherits    inherits    inherits    inherits    inherits
  project-detail  inherits    inherits    inherits    inherits    inherits    inherits
  site            n/a         n/a         inherits    inherits    inherits    inherits

  42 cells — 9 designed, 31 inherits, 2 n/a, 0 blank
```

**The 31 `inherits` cells are the reduction, and they are the reason condition 6 matters.**
Three quarters of the table is a pointer, so a pointer that resolves to nothing is three
quarters of the risk. Each now carries a link to where its treatment is hosted, printed in the
cell.

**The gate runs twice, on purpose.** `src/pages/index.astro` calls `buildMatrix` +
`auditMatrix` during the page render and **throws**, so `astro build` itself fails — the gate is
*in* the build rather than beside it. `check-coverage.mjs` parses the same declarations
straight out of the `.astro` sources, so it still reports **when the build cannot complete at
all**, which is precisely the situation it exists for. Both call the same two functions; neither
has its own copy of a rule.

### The four negative controls, each restored to a byte-identical SHA-256

| # | Control | Result |
|---|---|---|
| 1 | remove the dashboard's `dirty` entry from `STATES` | `check-coverage` **exit 1**, `astro build` **exit 1**, both naming `[BLANK_CELL] dashboard/dirty` — *and* six `UNHOSTED_INHERITS`, because six screens inherit `T-dirty-badge` from that cell |
| 2 | change `T-success-published` → `T-succes-published` | **exit 1**, `[DANGLING_REF] dashboard/success`, naming the string |
| 3 | empty the `site/empty` `n/a` reason | **exit 1** on both, `[REASONLESS_NA] site/empty` |
| 4 | delete `T-error-publish` from the overlay route's `ARTEFACTS` | **exit 1** on both, `[UNHOSTED_INHERITS] dashboard/error` — the condition that did not exist before this plan |

```
dashboard   8d33ba888ecefe3c274f1ec6fdcb778c20f74d157b617ac93d0bc9bb28ccff15   before and after
site        f7e60b1219de3acb48684df3c4ed801bc54127878bef4d196b4934444a262c20   before and after
overlays    54a0527334302208dbd0c8a1aa546de3280b0143f9538b8a8d53945d3323a3f8   before and after
```

**A trap worth recording, because it nearly produced a false result.** The first run of control
4 checked its own edit with `grep -c 'id: "T-error-publish"'`, which printed **1** after the
removal — and I almost read that as "the removal failed". It had not: `grep -c` counts **lines,
not matches**, and a second line in the same file (`{ o: "error-publish", id:
"T-error-publish", … }`, the route index) carries the identical substring for an unrelated
reason. The control was re-run printing the `ARTEFACTS` ids before and after, which is an
assertion about the thing being changed rather than about a string in a file.

---

## THE 44px FLOOR — AUDITED IN A BROWSER, AND IT CAUGHT THINGS

`audit15.mjs` (plan 15's, re-run rather than replaced) on all twelve new routes plus the
contact sheet, at all six device classes from `00-RESPONSIVE-CONTRACT.md`.

**Two failures on the overlay routes that no grep would have found**, both the same shape plans
14 and 15 each hit once: a `Link` written *inside a sentence* measured **16px at all five
coarse classes**, on `/admin/overlays/error-network/` (the `O-reauth-401` cross-reference) and
on `/admin/overlays/pipeline-failure/` (the `/admin/photos` cross-reference). Both were pulled
into their own rows. **No WCAG 2.5.8 "in a sentence" exception was claimed** — the exception
exists, and taking it on a review artefact whose whole point is the floor would have been the
excuse rather than the fix.

Final state, all coarse-pointer classes:

| Route | 344 | 390 | 673 | 768 | 1024 |
|---|---|---|---|---|---|
| `/admin/overlays/` and all seven overlay routes | **0** | 0 | 0 | 0 | 0 |
| `/admin/phone/dashboard/` | **0** | 0 | 0 | 0 | 0 |
| `/admin/phone/text-edit/` | **0** | 0 | 0 | 0 | 0 |
| `/admin/phone/photo-reorder/` | **0** | 0 | 0 | 0 | 0 |
| `/admin/phone/publish/` | **0** | 0 | 0 | 0 | 0 |
| `/` (contact sheet) | 6 | 6 | 6 | 6 | 6 |

**The contact sheet's six are pre-existing and are logged rather than fixed.** Filling Parts 2
and 3 created **78** undersized targets — `.cs-matrix-cell` (40 at 14px), `.cs-matrix-host`
(31 at 39px), `.cs-matrix-screen` (7 at 15px) and `.cs-id` (30 at 18px, of which 17 are this
plan's new rows) — and all 78 were fixed with one `@media (pointer: coarse)` block. The
remaining six are three `AppBar` links and three `Footer` links from `Public.astro`, which
plan 09 owns and which measure identically on `/work`, a route this plan does not touch. Logged
as **D-16-1** in `deferred-items.md`, together with the observation from the same run that
`/work` **scrolls horizontally at 344 and 390** (`doc=385/344`, `doc=416/390`).

**The reorder row floor, measured rather than asserted.** `.ds-atom-sortable-item` in
`sortable.css` sets `user-select`, `cursor`, `border-radius` and a transition — **and no
height, min-height or padding at all**, so a row is exactly its content's line boxes. The
floor is therefore *declared* (56px, printed on the screen as a guarantee) and the rows measure
**78px, with the badged row at 100px**, because the thumbnail and two lines of text drive them.
Same family as F-15-7 and the G-2 control-geometry gap. The rule could not live in
`density-compact.css`: every rule in that file is scoped to compact **and** a fine pointer, and
this route is comfortable and coarse.

**R-6, counted at 344 against 1440** on all twelve routes plus the contact sheet — nothing
dropped anywhere:

```
/admin/overlays/publish-valid/    4 entity groups · 6 change lines · 1 async panel · 2 actions
/admin/overlays/publish-invalid/  1 summary · 3 error items · 3 deep links
/admin/overlays/error-publish/    2 banners · 3 error items · 3 deep links · 4 pending groups
/admin/overlays/discard-all/      1 panel · 4 entity groups · 6 change lines · 1 guard field
/admin/phone/dashboard/           4 entity cards · 6 change lines · 1 sheet · 7 nav rows · 6 D-09 rows
/admin/phone/photo-reorder/       6 rows · 3 omissions · 2 refusals
/                                 8 matrix rows · 42 matrix cells · 6 phone rows · 24 cross-cutting
```

The 900px matrix scrolls **inside its own container**, so the page itself reports `doc=344/344`
with no horizontal scroll. Reflowing a 7 × 6 matrix into seven stacked lists would have stopped
it being a matrix, which is the one thing it is for.

---

## `00-FINDINGS.md` — WHAT CHANGED, AND WHAT DELIBERATELY DID NOT

**Nine rows moved from `pending` to measured**, each traceable to the plan that measured it:

| Row | What it gained |
|---|---|
| **G-1** | `FocalPointSketch.tsx` at **419 lines / 269 non-comment** (86 CSS, 183 TS+JSX), and all three legacy defects — mouse-only, keyboard-unreachable (*no* `tabIndex`, *no* key handler), listeners removed on mouse-up only — each with the prototype's measured fix. Plus the interaction-model divergence, which is itself an argument for the component living upstream. |
| **G-2** | Plan 12's counted diff: **15 declarations, 3 (20%) expressible as a token change, 12 (80%) not**; `Button`'s inline `padding: 7px 14px` unreachable; `--ds-sidebar-w` inline; two of UI-SPEC's five compact numbers unnameable by the spacing scale. Plus plan 15's three further targets at 22 / 25 / 24 / 30px. |
| **G-3** | The three ⌘-key answers — **⌘I yes, ⌘U yes, ⌘K no** — with the correction that ⌘K was never a binding and `autolink` needs no keystroke, plus `⌘⇧H` → `<mark>` and `⌘⌥2` → `<h2>`, plus the shipped `toolbar={null}` bug. |
| **G-4** | The before-and-after segment arrays, **7 runs in / 5 segments out**, with the italic run returning as plain text and its two neighbours merging around it — a silent save. |
| **G-5** | `StatusPill` on **zero of seven screens**; `Badge` standing in on D-13 (three places) and D-15 (the photos grid), with `DataGrid`'s private job-application tone map collapsing all three pipeline values; and D-45 as a third surface. |
| **G-6** | This plan's own: `errors: string[]`, no `href`, so `Go to Résumé` renders as a separate element beside the summary on **two** surfaces, bound to its failure only by list order. |
| **G-7** | Plan 15's full requirements list — the six stretched primitives, the `DiffViewProps` shape, the four load-bearing properties, and the three simultaneous per-file resolution signals. |
| **G-8** | The strip composed into `topbar`, and the consequence: **no landmark of its own**, sharing a row with the publish action, with both alternatives worse in the exact way D-15 forbids. |
| **G-13** | The three keyboard answers, verbatim announcements, and the correction that dnd-kit supplies its own defaults — so the fix is an announcer **passthrough**, not "pass the announcer". |

**Two gap STATEMENTS were corrected by measurement — G-3 and G-13.** Neither correction changes
a tier; both proposed fixes changed shape rather than scope. A note at the top of the register
now says so, because a gap that survives three documents and then measures differently is the
whole reason the `Evidence` column exists.

**No row was deleted, no tier changed, no sixth tier value invented.** Verified by parsing the
file: 16 register rows, 7 columns each, every tier value in the five-word vocabulary, and
`G-1` and `G-7` each still carrying both `backlog` **and** `blocks-Phase-7`. `Phase 1 pulls …`
and `Phase 06.1 pulls G-2. Phase 7 pulls G-1 and G-7.` are untouched.

**No new `G-` row was added, and that is a deliberate refusal of the plan's own permission** —
see deviation 6.

---

## DEVIATIONS FROM PLAN

**1. [Plan correction] The overlays are `overlays/[...o].astro`, not `overlays.astro`, and there
is no `?o=`.** Identical to the `?state=` correction plans 13, 14 and 15 each made. Under
`output: 'static'` Astro strips the query string in the dev server as well as at build
(`astro/dist/core/request.js:20`), so all seven overlays would have rendered as one page. The
plan's `structural_note` still says *"`?state=` is served by `astro dev`"*; it is not, and plan
12 measured it. Every acceptance grep naming the flat path was run against the real one, and
`test -f dist/admin/overlays/index.html` passes because a rest param with `o: undefined` emits
the base path.

**2. [Idiom, plan 15] `T-error-network` is a cross-check here, not a second host.** The plan
lists it among task 1's six artefacts. Plan 15 claimed it, and the orchestrator's instruction is
to declare `inherits` rather than re-claim. So the route exists, carries the verbatim copy and
satisfies every acceptance grep, and is deliberately **absent** from the `ARTEFACTS` export so
`buildMatrix` records exactly one host for the treatment. The value of rendering it twice is
that the two surfaces are now *provably* identical, which is what D-19 needs.

**3. [Rule 2 — missing critical functionality] A sixth gate condition, `UNHOSTED_INHERITS`.**
The plan names five. The sixth is the ruling on plan 15's handover: without it,
`T-error-publish` would have been "fixed" by building one route and the class of failure would
have remained invisible. Verified to bite by negative control 4.

**4. [Scope, deliberate] Two files the plan does not name: `src/lib/phone.mjs` and the
`ARTEFACTS` export convention.** D-09's permitted set is *closed* — four things, not roughly
four — so the set belongs in one importable place that the four routes and the contact sheet's
Part 3 all read; four private copies is four chances to drift. `ARTEFACTS` generalises plan 15's
singular `ARTEFACT` on `conflict-diff.astro` rather than renaming it, because renaming would
have been a silent edit to a file this plan does not own; `buildMatrix` accepts both. Same shape
of addition as plan 15's `project-detail.json`.

**5. [Design decision] The two discard dialogs quote the fixture, not UI-SPEC's worked
examples.** Stated in full above. `across 4 screens` is verbatim; `2` and `6` replace `6` and
`12`.

**6. [Deliberate refusal] No new `G-` row in `00-FINDINGS.md`, and the fifteen outside findings
are a POINTER INDEX instead.** The plan says *"If a plan surfaced a gap not already in the
register, add a new row with an ID continuing the `G-` sequence."* The register's own rule,
written before this plan, says the opposite: *"Rows are not added or re-litigated by a
measurement plan — a plan that finds something outside the sixteen records it in its own SUMMARY
instead, so the tier-pull contract keeps a fixed denominator."* Those cannot both be followed.
The register's rule wins, because the file states in as many words that its tiers **bound two
other phases' scope** (`Phase 1 pulls …`, `Phase 7 pulls G-1 and G-7`), and appending rows would
change those lists without a decision — which is threat **T-00-40**, from this plan's own threat
model. What was added instead is a clearly-fenced section stating that it adds **no row, no tier
and no scope**, listing F-12-1 to F-15-8 with one line each and the SUMMARY that records them.
It is navigation, not triage. Phase 1's planner is told in bold to read it, because the pull
contract will not surface it.

**7. [Rule 1 — bug] Two `Link`s inside sentences measured 16px and were pulled into their own
rows.** Found by the browser audit, not by grep. Same failure plan 14 found on the résumé PDF
link and plan 15 on the detail screen; the third occurrence in three plans, which suggests the
idiom rule should be "never write a `Link` inside a sentence in an admin sketch".

**8. [Rule 2] A 44px floor on the contact sheet's own link classes.** Filling Parts 2 and 3
created 78 undersized targets on a page nobody had audited. Fixed in one block; the six
pre-existing `AppBar`/`Footer` targets were left alone and logged.

**9. [Noted] `P-photo-reorder`'s printed floor is a guarantee, not a measurement.** The screen
says *"no row shorter than 56px"*; the rows measure 78px and 100px. Printing 78 would have been
a number typed into copy that nothing checks, and the plan's own acceptance asks the screen to
*state its touch-target size*, which a guarantee does more honestly than a snapshot.

**10. [Answered, not taken] `deferred-items.md` D-15-1 suggested plan 16 fix the dashboard's
23px `.adm-group-link` as "a one-line correction".** Declined under the SCOPE BOUNDARY rule —
nothing this plan wrote reaches that class, and reaching into another plan's route file to fix a
floor it did not break is how a one-line correction becomes an unreviewed edit. Recorded as
answered rather than left ambiguous.

No architectural changes were needed; no Rule 4 checkpoint was raised.

---

## VERIFICATION

```
astro build                    89 pages, 12 of them new (77 before this plan)
check-coverage.mjs             PASS  42/42 cells, 0 blank, every inherits hosted
check-no-js.sh                 PASS  63 static routes at zero JS; 26 island routes verified hydrating
check-states.mjs               PASS  49 state pages across 7 screens, markers unique within each
check-no-ivory.sh              PASS
check-theme-exhaustive.mjs     PASS
check-font-names.mjs           PASS
check-contrast.mjs             PASS
check-css-size.mjs             PASS
check-bundle.mjs               EXIT 1 — BY DESIGN, this is G-15
```

**Hydration budget unchanged.** Zero `client:` directives across all six new source files
(`grep -c` on the overlay route prints `0`; the phone directory reports zero files with a
non-zero count). The playground still has exactly the four allowlisted hydrating pages, so
plan 07's DS-09 measurement stays readable.

**Density.** All four phone routes emit `data-density="comfortable"` in the built HTML, verified
by reading the attribute rather than the source; `data-density="compact"` appears **zero times**
in `src/pages/admin/phone/`. Two comments describing the compact selector were reworded so the
source grep is clean as well as the output — a grep cannot tell a rule from prose describing
one, and this plan's own acceptance criterion is a grep.

**Copy assertions on the overlay route file.** `3 things must be fixed before publishing.` ·
`Your session expired.` · `This can't be undone.` · `Retrying does not re-upload them.` ·
`TypeToConfirm` with `guardWord="discard"` · `ConfirmDialog tone="danger"` — all present.
`disabled` appears **0** times. `dismiss|continue offline|skip|not now|maybe later|bypass`
appears **0** times, case-insensitively, over the whole file.

**Contact sheet.** Both plan-09 placeholders are gone (`cs-placeholder` appears 0 times in
`dist/index.html`). Part 2 renders 8 `<tr>` (1 header + 7 rows), 14 `<th>` and **42 `<td>`**,
with 40 cell links, 31 host links and 2 reasons. Part 3 renders exactly **6** rows — four `P-`
and two `R-` — each linking its artefact.

---

## Known Stubs

None that block the plan's goal. Every button on every new route is inert; the `TypeToConfirm`
guard field is `readonly`; the `Textarea` on `P-text-edit` does not save; `P-photo-reorder`
draws and does not drag and says so on screen. All of these are the D-02 scope fence working as
specified, each stated in a comment at its site, and Phase 7 owns the wiring. `.playground/` is
deleted in plan 17.

Asserted absent from all six new source files: `grep -rqiE 'fetch\(|localStorage|sessionStorage'`
exits 1. `data/` is untouched — `git status --short data/` is empty.

---

## Threat Flags

None. No network endpoint, no storage, no credential, no upload target and no auth path was
added. The plan's eight registered threats were each honoured and asserted rather than claimed:
**T-00-39** — six machine-checked conditions with four negative controls proving the gate bites,
and a matrix generated from the screens so it cannot drift; **T-00-40** — every tier asserted
against the five-value vocabulary, no row deleted, `G-1` and `G-7` verified to retain both
tiers, and no row added; **T-00-03** — `T-error-network` carries the verbatim deny-and-
re-authenticate copy with six bypass phrasings grepped absent over the whole file, byte-identical
to plan 15's modal; **T-00-41** — the two discard guards are distinct components at distinct
strengths and every count in destructive copy is computed from the fixture; **T-00-42** — all
four phone routes verified `comfortable` in the built HTML with zero targets under 44px at every
coarse class; **T-00-29** — fixtures derive only from `dashboard.json`, `photos.json` and
`data/resume.json`, all committed public content; **T-00-23** — zero `client:` directives across
ten new files; **T-00-06** — no auth, no D1, no endpoint, every action inert.

---

## Self-Check: PASSED

- `.planning/phases/00-design-ideation/00-16-SUMMARY.md` — FOUND
- `.planning/phases/00-design-ideation/00-FINDINGS.md` — FOUND, 16 register rows intact
- `.planning/phases/00-design-ideation/deferred-items.md` — FOUND, D-16-1 present
- `.playground/src/pages/admin/overlays/[...o].astro` — FOUND (gitignored)
- `.playground/src/pages/admin/phone/{dashboard,text-edit,photo-reorder,publish}.astro` — all 4 FOUND (gitignored)
- `.playground/src/lib/coverage.mjs` + `phone.mjs` — FOUND (gitignored)
- `.playground/check-coverage.mjs` — FOUND (gitignored)
- `.playground/src/fixtures/overlays.json` — FOUND (gitignored)
- `dist/admin/overlays/index.html` + 7 overlay routes — all FOUND
- `dist/admin/phone/{dashboard,text-edit,photo-reorder,publish}/index.html` — all 4 FOUND
- Playground work is gitignored by design (`.gitignore:38`), so tasks 1 and 2 and most of task 3
  produce no commits, exactly as plans 01, 04, 07, 09, 10, 12, 13, 14 and 15 did. The single
  commit for this plan is this SUMMARY plus `00-FINDINGS.md` and `deferred-items.md`.
