---
phase: 0
slug: design-ideation
status: open
---

# Phase 0 — Design-System Findings Register

## How to read this register

This file is the contract between Phase 0 and every phase that consumes the design
system. It exists because of the project's Core Value: **where bespoke and design-system
conflict, the design system wins and the gap becomes an upstream finding.** A row here is
a commitment to fix `@akhil-saxena/design-system`, never a licence to work around it
locally.

Each row records what the design system cannot do today, what should change upstream, and
which phases are blocked until it does. The `Evidence` column separates *measured* from
*asserted*: a row whose evidence is `pending` states a gap read out of the type
definitions or the API surface; a row with a number in it was built and measured. G-15 is
the reason that column exists — DS-09 sat in `.planning/` as an unmeasured, load-bearing
assumption for the whole project, and "the barrel probably tree-shakes" is exactly the
kind of claim that survives three planning documents and then fails in Phase 5.

The register was seeded from `00-UI-SPEC.md` §"Named gaps" (16 rows, already triaged), and
plan 01 added the two measured evidence cells. Rows are **not** re-litigated here — where
a gap statement cites a type signature, that signature was read out of
`../design-system/dist/index.d.ts` during UI-SPEC review and confirmed by the plan checker.

**Provenance of every claim in this file.** `CHANGELOG.md`, `README.md` and `src/` are the
current source of truth for the design system. `../design-system/.planning/` is a
historical artefact and is *not* — it is titled "JobDash Design System", claims 53 sections
against the README's 80, and documents `body.dark` when `src/tokens.css` ships
`:root.dark, .dark`. No number in this register came from it.

## Tier vocabulary

`tiers` is a **list, not a single value**. Legal values:

| Tier | Meaning |
|------|---------|
| `blocks-Phase-5` | The public site cannot meet its requirements until this is fixed |
| `should-fix-in-Phase-1` | Belongs in the charcoal-theme release; cheap and additive |
| `backlog` | Real, but nothing currently scheduled is blocked by it |
| `blocks-Phase-7` | Not Phase 1's problem, but must exist before the admin ships |
| `blocks-Phase-06.1` | Belongs to the cascade-layers & density-axis phase |

**The scope rule.** Phase 1's planner pulls **only** entries whose `tiers` list contains
`blocks-Phase-5` or `should-fix-in-Phase-1`. That is what gives Phase 1 an explicit scope
boundary instead of an open-ended list. Reading a tier as anything other than membership in
that list breaks the boundary.

**Why the field is a list.** D-04 originally defined a single tier from
`blocks-Phase-5` / `should-fix-in-Phase-1` / `backlog`. That enum has no way to say *"not
Phase 1's problem, but load-bearing before Phase 7."* Two gaps sit exactly there — **G-1**
(`FocalPointPicker`, D-23) and **G-7** (the D-16 conflict `DiffView`). Both are new
components, correctly excluded from Phase 1's token/theme release, and both are required
before the admin can ship. Tagged with a single `backlog` they read as "optional, revisit
someday", which is how a Phase 7 blocker goes missing.

**G-1 and G-7 each carry two tiers — `backlog` *and* `blocks-Phase-7`.** That pairing is
the entire reason the vocabulary was widened. Preserve it verbatim; collapsing either row
to one tier reintroduces the defect the revision fixed.

Phase 1 pulls AAA-1, G-3, G-4, G-5, G-6, G-8, G-9, G-11, G-12, G-13, G-14, G-15.
Phase 06.1 pulls G-2. Phase 7 pulls G-1 and G-7.

## Findings

| ID | Component | Disposition | Gap | Proposed upstream fix | Tiers | Evidence |
|----|-----------|-------------|-----|----------------------|-------|----------|
| **AAA-1** | `tokens.css` | UPDATE — additive | **Targeted AAA, ADOPTED (was contingent).** `--ink-3`/`--ink-4` move to `#4F4C42` / `#B1AEA8`; new `--ochre-d-strong` `#6B4417` / `#D4A66D` for small accent labels. | Ship both in the charcoal theme; extend `tokens.test.ts` with a 7:1 assertion for `--ink-3` and `--ochre-d-strong` on all three surfaces of each mode. **New token name only — `--focus` untouched, no existing token changes role.** | `should-fix-in-Phase-1` | pending |
| **G-1** | *(none)* | **NEW component** | **No focal-point crop picker.** D-23 needs drag-a-marker on a real 3:2 frame with live `object-position`. The legacy `PropertiesPanel` precedent is mouse-only, keyboard-inaccessible and touch-unaware — which is also the evidence for D-09's desktop-only refusal. | New `FocalPointPicker` built from DS primitives, keyboard-operable via arrow keys | `backlog`, **`blocks-Phase-7`** | pending |
| **G-2** | tokens + primitives | UPDATE | **Density axis cannot work as specified.** 0% of heights, 13.5% of padding, 10.8% of gaps are tokenised; `Button` padding is an inline style unreachable by CSS. | Introduce `--control-h`, `--control-px`, `--row-h`, `--field-gap`; adopt them in primitives; *then* vary by `data-density` | **`blocks-Phase-06.1`** (DS-11) | pending |
| **G-3** | `RichText` | UPDATE | **Marks cannot be restricted.** No `marks`/`extensions` prop. StarterKit + `Link` + `Underline` + `CodeBlockLowlight` are always on, with ⌘I / ⌘U / ⌘K live even if the toolbar is replaced. D-21 needs bold-only; a segment serializer would **silently drop** italic/underline/link — data loss on save. | `marks?: Array<"bold"\|"italic"\|…>` prop that configures extensions, not just the toolbar | `should-fix-in-Phase-1` | pending |
| **G-4** | `RichText` | UPDATE | **No segment output.** `outputFormat: "html" \| "json"` only. D-20 requires that no HTML string exist anywhere, so `"html"` must be designed out of reach. | Add `outputFormat: "segments"`, or document `"json"` + an adapter as the sanctioned path | `should-fix-in-Phase-1` | pending |
| **G-5** | `StatusPill` | UPDATE | **Stages are job-domain-locked**: `wishlist \| applied \| screening \| interviewing \| offer \| closed`. Unusable for D-13's draft/ready/published or D-15's pipeline states. *(CONTEXT.md §Reusable Assets lists `StatusPill` as covering D-15 — it does not.)* | Generic `stage` accepting a tone + label; keep the job stages as a preset | `should-fix-in-Phase-1` | pending |
| **G-6** | `FormErrorSummary` | UPDATE | `errors: string[]` — no anchor. D-18 requires deep-linking to the offending screen. | `errors: Array<{ message: string; href?: string }>` | `should-fix-in-Phase-1` | pending |
| **G-7** | *(none)* | **NEW component** | **No diff / side-by-side component** for D-16's per-file conflict screen — the largest single admin surface has zero DS coverage. | New `DiffView` (remote vs pending, per-file, with reload/overwrite actions) | `backlog`, **`blocks-Phase-7`** | pending |
| **G-8** | `AppShell` | UPDATE — additive | Slots are `sidebar \| topbar \| main \| footer`. D-15's persistent pipeline strip has nowhere to live that survives navigation. **Re-tiered from `backlog`:** it is a trivial additive optional prop, and omitting it invites every admin route to re-implement the strip independently — the divergence D-15 explicitly forbids ("two places that must agree"). | Optional `banner` slot between topbar and main | **`should-fix-in-Phase-1`** | pending |
| **G-9** | `SegmentedControl` | **NEW component** *(reclassified from UPDATE)* | **Not a hooks problem — an ARIA-pattern problem.** `SegmentedControl` is a WAI-ARIA **radiogroup** with state-driven `onChange` selection, so it has **no navigable anchor semantics at all**. PUB-04 needs prerendered `/photos/[category]` routes with real links: crawlable, Back-button-capable, zero JS. An `as="nav"` prop on the same component cannot serve radiogroup and nav/link-list ARIA patterns cleanly — the roles, keyboard model and selected-state semantics all differ. | Small **new sibling `FilterNav`** that shares `SegmentedControl`'s CSS classes for visual parity but renders real `<a href>` anchors with `aria-current="page"` | `blocks-Phase-5` | pending |
| **G-10** | *(none)* | accepted | No masonry / column-gallery component. | — (layout CSS is permitted by QUAL-03) | `backlog` | pending |
| **G-11** | `--text-*` | UPDATE — additive | **No step at 52px** (44→60 gap) for the Work and Photos display headers. | Add a step, available to every brand | `should-fix-in-Phase-1` | pending |
| **G-12** | `exports` map | UPDATE — additive | `./css/*` requires **extensionless** specifiers (`/css/base`, not `/css/base.css`); `import.meta.resolve` under-reports the broken form. | Add `"./css/*.css"` alongside the existing pattern | `should-fix-in-Phase-1` | **MEASURED.** The `exports` entry is `"./css/*": { "style": "./dist/css/*.css", "default": "./dist/css/*.css" }` — the wildcard already supplies `.css`, so `@akhil-saxena/design-system/css/base.css` expands to `dist/css/base.css.css`, a file that does not exist, and the Rolldown build fails. `@akhil-saxena/design-system/css/base` expands correctly to `dist/css/base.css`. The trap is that the broken form is the one every developer will write first, and `import.meta.resolve()` **does not catch it** — it substitutes the wildcard and returns a URL string without `stat`-ing the target, so it reports the broken specifier as resolvable. Only an actual build fails. 74 per-component sheets ship in `dist/css/`. |
| **G-13** | `Sortable` | UPDATE | Wires dnd-kit's `KeyboardSensor` so items *move* by keyboard, but passes no `announcements` / `screenReaderInstructions` — nothing is announced. (OQ-4) | Pass dnd-kit's announcer | `should-fix-in-Phase-1` | pending |
| **G-14** | `Lightbox` | UPDATE | Missing backdrop-click close, `srcset`, swipe, `aria-live` slide announcements. | Already scoped as **DS-07** | `blocks-Phase-5` | pending |
| **G-15** | barrel | UPDATE | **DS-09 tree-shaking fails.** One `import { Chip }` in a hydrated island drags the editor and drag-drop stacks into the browser. | Per-component JS subpath exports | `blocks-Phase-5` | **MEASURED 2026-08-17** at `astro@7.2.2` / `@astrojs/react@6.0.2` / `react@19.2.8` / DS `1.11.4`. Island chunk **570555 bytes raw, 176922 bytes gzip, 99 modules** — prosemirror 10, tiptap 23, lowlight 4, highlight.js 4, dnd-kit 3, lucide-react 43. Source: one `import { Chip }` rendered `client:load`, nothing else. Three configuration fixes were attempted during research and each produced **byte-identical output**: (1) `sideEffects: ["*.css"]` → `sideEffects: false`; (2) removing the leading `"use client"` directive from `dist/index.js`; (3) marking the module-scope `var lowlight = createLowlight();` as `/* @__PURE__ */`. The barrel is therefore **not shakeable by configuration**, and DS-09's per-component-JS-subpath fallback is the live branch, not a contingency. |

## Measured baselines

Both numbers below were produced by plan 01 in the throwaway `.playground/` harness against
the real packed tarball, on a cleared Vite cache. They are the counterpart measurements:
one claim failed, one held, and they are **not** the same claim.

| Claim | Result | Measurement |
|-------|--------|-------------|
| DS-09 barrel tree-shakes on a hydrated island | **FAILS** | 570555 B raw / 176922 B gzip / 99 modules — see G-15 |
| Composing the design system statically is free | **HOLDS** | **0** `<script>` tags on `probe/static`, a page rendering eight DS components (`AppBar`, `Heading`, `Text`, `Chip`, `Card`, `StatCard`, `Timeline`, `Footer`) |

**These two results must not be conflated.** A zero-JS pass on a static page says nothing
about tree-shaking, because a page with no hydration directive never produces a client
bundle to shake. The two fixtures are deliberately separate files —
`probe/static.astro` and `probe/island.astro` — and a DS-09 result reported without a byte
count is the warning sign that they were merged.

**Scope of the failure.** DS-09 bites *hydrated* islands only. The `/photos` `Lightbox` is
the single public hydration point in the entire roadmap; every other public surface is
covered by the second row and costs nothing.

**Stack fact that changes the analysis.** Astro 7 ships **Vite 8, which is Rolldown-based**,
so tree-shaking semantics are Rolldown's rather than Rollup's. This was not recorded
anywhere in `.planning/` before Phase 0 and it materially affects DS-09: Rollup-era advice
about `sideEffects`, `"use client"` and `/* @__PURE__ */` annotations **does not transfer**,
which is why all three attempted fixes came back byte-identical rather than partially
effective.

**Context for the budget conversation.** The shared React client runtime is itself
180634 B raw / 56513 B gzip, six modules, before any design-system code participates. Any
per-island budget has to be set with that floor in mind — it is not attributable to the
design system and no upstream fix removes it.

## Deferred thresholds

**The 50 KB gzip island threshold is NOT adopted by this phase.**

`check-bundle.mjs` compares each client chunk against **50 KB gzip**. That number is
**research assumption A8**. It was derived from the Lighthouse 95+ goal and PUB-14, *not*
from any stated budget, and no human has confirmed it. It **gates nothing in Phase 0**:
plan 01 runs the script as a measurement (`|| true`) and asserts on the contents of
`bundle-report.txt` rather than on its exit code. That accommodation is deliberate and must
not be "fixed" into a hard gate until the threshold is settled.

**It must be confirmed or replaced before Phase 5's bundle gate uses it.**

**No threshold choice changes the v1.11.4 verdict.** The measured island is 176922 B gzip —
roughly **3.5×** over this line. Moving the line anywhere defensible leaves G-15 failing, so
the deferral costs nothing and blocks nothing. The byte count is the finding; the comparison
is not.
