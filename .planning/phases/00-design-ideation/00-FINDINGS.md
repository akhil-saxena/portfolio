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

The register was seeded from `00-UI-SPEC.md` §"Named gaps" (16 rows, already triaged); plan
01 measured G-12 and G-15, and plan 04 measured AAA-1 and G-11. **Plan 16 transcribed the
admin half**, adding measured evidence to G-1, G-2, G-3, G-4, G-5, G-6, G-7, G-8 and G-13
from the sketches plans 12 to 15 built. Rows are **not** added or
re-litigated by a measurement plan — a plan that finds something outside the sixteen records
it in its own SUMMARY instead, so the tier-pull contract below keeps a fixed denominator.
Where
a gap statement cites a type signature, that signature was read out of
`../design-system/dist/index.d.ts` during UI-SPEC review and confirmed by the plan checker.

**Two rows had their GAP STATEMENT corrected by measurement, and the correction is the
finding.** G-3's original wording claimed ⌘K stays live; it never was a keyboard binding at
all, while `toolbar={null}` fails to suppress the toolbar and `autolink` creates links with no
keystroke. G-13's original wording claimed nothing is announced; dnd-kit supplies its own
default announcer when a consumer passes nothing, so speech happens and names raw record ids
and no position. **Neither correction changes a tier**, and both proposed fixes changed shape
rather than scope. A gap that survives three documents and then measures differently is the
reason the `Evidence` column exists.

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
| **AAA-1** | `tokens.css` | UPDATE — additive | **Targeted AAA, ADOPTED (was contingent).** `--ink-3`/`--ink-4` move to `#4F4C42` / `#B1AEA8`; new `--ochre-d-strong` `#6B4417` / `#D4A66D` for small accent labels. | Ship both in the charcoal theme; extend `tokens.test.ts` with a 7:1 assertion for `--ink-3` and `--ochre-d-strong` on all three surfaces of each mode. **New token name only — `--focus` untouched, no existing token changes role.** | `should-fix-in-Phase-1` | **MEASURED 2026-08-17** by `.playground/check-contrast.mjs`, which *ports* the design system's own `srgb` / `luminance` / `contrast` / `resolve` helpers from `tokens.test.ts` rather than hand-rolling a second WCAG formula. 54 ratios, every foreground token against **all three surfaces of its own mode**, never the page alone. `--ink-3` / `--ink-4` `#4F4C42` light → **7.61** page / **8.16** paper / **7.09** panel; `#B1AEA8` dark → **8.18** / **7.54** / **7.02**. `--ochre-d-strong` `#6B4417` light → **7.55** / **8.10** / **7.03**; `#D4A66D` dark → **8.16** / **7.53** / **7.01**. All twelve clear 7:1, and in both modes the binding constraint is the **panel** (`--cream-3`) — the surface a page-only measurement never sees. **`--focus` is untouched:** it remains `var(--ochre-d)` and measures 5.22 / 5.60 / 4.86 light and 6.02 / 5.55 / 5.17 dark against a 3:1 non-text floor (SC 1.4.11), so the AAA change added a token name and altered no existing token's role. **The gate is proven to bite:** substituting the earlier proposal `#6E6A5E` for light `--ink-3` fails 6 assertions at 4.79 / 5.14 / **4.46** — a value that reads like an AA pass on the page and fails AA outright on the panel. |
| **G-1** | *(none)* | **NEW component** | **No focal-point crop picker.** D-23 needs drag-a-marker on a real 3:2 frame with live `object-position`. The legacy `PropertiesPanel` precedent is mouse-only, keyboard-inaccessible and touch-unaware — which is also the evidence for D-09's desktop-only refusal. | New `FocalPointPicker` built from DS primitives, keyboard-operable via arrow keys | `backlog`, **`blocks-Phase-7`** | **MEASURED 2026-08-18 (plan 14).** The local prototype a consumer is forced to write, `FocalPointSketch.tsx`, is **419 lines — 269 non-comment**, of which **86** are the 3:2 frame CSS ported from `legacy:src/styles/admin.css:1777-1797` and **183** are TypeScript and JSX. That is the cost of the absence: every consumer that wants a focal point rewrites all 269 lines *and* re-chooses the interaction model while doing it. **The three legacy defects, each read out of `legacy:src/components/admin/PropertiesPanel.tsx:739-786` and each measured in Chromium 147 against the built `dist/` rather than inferred:** (1) **mouse-only** — the legacy control binds `mousedown` only, so it is inert to touch and to pen; the prototype uses pointer events with capture, and a drag to (25%, 75%) moved `object-position` from `50% 25%` to `25% 75%`. (2) **keyboard-unreachable** — the legacy control has *no* `tabIndex` and *no* key handler, so the only stored crop in the product cannot be set without a mouse; the prototype is `tabIndex={0}` with arrow keys, measured `↑↑→` `50% 25%` → `51% 23%`, `Shift+↓` → `51% 33%`, `Home` → `50% 50%`, with a `role="status" aria-live="polite"` readout. (3) **uncleaned listeners** — the legacy control attaches `document` listeners and removes them on mouse-up only, so an unmount mid-drag leaks them; the prototype aborts them through an `AbortController` on unmount. Zero console errors and zero page errors across the whole run. **One interaction-model divergence is recorded rather than slipped in:** the legacy control drags the *image*, with an inverted delta and an arbitrary `/ 2` damping factor, so the same drag means a different value on a 320px frame than on a 640px one; the prototype places the *focal point* directly, which is frame-size independent. That two reasonable engineers pick different models for one CSS property is itself the argument for the component living upstream. Tiers unchanged. |
| **G-2** | tokens + primitives | UPDATE | **Density axis cannot work as specified.** 0% of heights, 13.5% of padding, 10.8% of gaps are tokenised; `Button` padding is an inline style unreachable by CSS. | Introduce `--control-h`, `--control-px`, `--row-h`, `--field-gap`; adopt them in primitives; *then* vary by `data-density` | **`blocks-Phase-06.1`** (DS-11) | **MEASURED 2026-08-18 (plan 12), counted by parsing the prototype rather than by reading it** (comments stripped, braces matched). A working `compact` axis over the real admin shell needed **11 rules / 15 declarations** at `pointer: fine`, plus 2 rules / 2 declarations for the 44px floor at `pointer: coarse`. Of the 15: **3 (20%) are `--space-*` reassignments** — the mechanism DS-11 assumes — and **12 (80%) are not expressible as a token change at all**. The 12 break down as **8** overriding an existing raw length at a site that references no spacing token, **3** *introducing* a declaration the design system does not have (Button height, table-row height, table-header height), and **1** on a class of the playground's own, included because 30px is off the 4px grid so even a component written today against the spacing scale could not name compact's control height from it. **`Button`'s padding is the unreachable case, confirmed in the emitted HTML:** `padding: 7px 14px` is an inline style object, so it survives all 15 declarations at 14px horizontal on every size and no stylesheet reaches it; `lg` keeps an inline 44px height rather than compact's 36px; and the one `height` override necessarily hits xs / sm / md / lg together, because **`Button` emits no `data-size` attribute while its sibling `Select` does** — so the size *scale* is flattened rather than varied, and two controls that must line up at one height in a form row are reachable to different degrees. **One target needed zero declarations because it is unreachable at all:** the 208px sidebar — `AppShell` writes `--ds-sidebar-w` as an inline style on its own root (`style="--ds-sidebar-w:208px"` in the emitted HTML) and `sidebarWidth` is a constant fixed at construction, so no media query can drive it. **Two of UI-SPEC's five compact numbers cannot be *named* by the spacing scale even in principle** — 30px is not a multiple of 4 (the scale steps 28 then 32) and 208px is on the grid but far past the scale's 64px ceiling — which is the argument for a separate control-geometry layer rather than for extending `--space-*`. Plan 15 added three more control-geometry targets, all measured on coarse pointers: `.ds-atom-checkbox-label` **22px**, `.ds-atom-inlineedit` **25px**, `.ds-atom-stepper-btn` **24px** and `.ds-atom-stepper-input` **30px**, all against a 44px floor. Tier unchanged. |
| **G-3** | `RichText` | UPDATE | **Marks cannot be restricted.** No `marks`/`extensions` prop. StarterKit + `Link` + `Underline` + `CodeBlockLowlight` are always on, with ⌘I / ⌘U / ⌘K live even if the toolbar is replaced. D-21 needs bold-only; a segment serializer would **silently drop** italic/underline/link — data loss on save. | `marks?: Array<"bold"\|"italic"\|…>` prop that configures extensions, not just the toolbar | `should-fix-in-Phase-1` | **MEASURED 2026-08-18 (plan 14), driven by keyboard in Chromium 147 against the built `dist/` — and the gap as originally written is PARTLY WRONG, so transcribe the corrected form.** Three questions, three answers, with `toolbar={null}`: **⌘I still applies italic — YES** (`<em>` present after the shortcut). **⌘U still applies underline — YES** (`<u>` present). **⌘K still creates a link — NO**: no `<a>` appeared and no link bar opened. **Question 3's answer is a correction, not a reprieve.** ⌘K was never a keyboard binding in the first place — it is a toolbar button the component nevertheless advertises in its own hint list — and the link mark is still reachable without any keystroke, because `autolink` is hardcoded on and typing a URL creates one. Two further marks and one node type are also live and also unstorable: **`⌘⇧H` produced `<mark>`** (Highlight is registered unconditionally) and **`⌘⌥2` produced `<h2>`**. Control case: **`⌘B` → `<strong>` → `[{ text: "…", emphasis: true }]`**, the one mark the D-20 shape can carry. **A shipped bug escalates this gap and should be filed with it:** `toolbar={null}` **does not suppress the toolbar**. `RichText` renders `!readOnly && (toolbar ?? defaultToolbar)`, and `??` falls through on `null`, so the exact value the prop's own docstring prescribes for suppression selects the DEFAULT toolbar — twelve buttons render. The fix therefore needs two parts: `toolbar` must honour `null` (or gain a separate `showToolbar`), **and** the `marks?: Array<…>` prop must configure the *extensions* rather than the toolbar, because suppressing the toolbar was never what made the marks unreachable. Tier unchanged. |
| **G-4** | `RichText` | UPDATE | **No segment output.** `outputFormat: "html" \| "json"` only. D-20 requires that no HTML string exist anywhere, so `"html"` must be designed out of reach. | Add `outputFormat: "segments"`, or document `"json"` + an adapter as the sanctioned path | `should-fix-in-Phase-1` | **MEASURED 2026-08-18 (plan 14), serialized at build time out of `dist/admin/resume/index.html` — server-rendered, no hydration, no typing, so the loss is a property of the adapter rather than of a live session.** The bullet is Brevo's RBAC line from the real `data/resume.json`. **Before — what was authored (7 runs):** plain `"Introduced RBAC with "` · bold `"40+ permissions"` · plain `" across "` · **italic `"6 business verticals"`** · plain `", scaling access for "` · bold `"1K+ enterprise users"` · plain `"."`. **After — what the `"json"`-plus-adapter path would store (5 segments):** `[ { text: "Introduced RBAC with " }, { text: "40+ permissions", emphasis: true }, { text: " across 6 business verticals, scaling access for " }, { text: "1K+ enterprise users", emphasis: true }, { text: "." } ]`. **The two bold runs survive as `emphasis: true`. The italic run comes back as plain text and the two neighbouring plain runs merge around it**, so the stored value carries no record that a mark was ever there — seven runs in, five segments out, and nothing in the output naming which one was lost. That is a **silent** save, which is why this is data loss rather than a styling miss: nothing at any layer can detect it after the fact. Verified live as well as at build time — after `⌘I` the panel read *"1 thing(s) dropped on serialize — Marks the shape cannot carry: italic. The editor still shows them. The stored value above does not."* `"html"` is not an escape: D-20 rules out a markup string on principle, because if that string exists anywhere the stored-XSS class D-20 designs away is back. Asserted in the prototype: `grep -q '"html"' RichTextBullets.tsx` exits 1. Tier unchanged. |
| **G-5** | `StatusPill` | UPDATE | **Stages are job-domain-locked**: `wishlist \| applied \| screening \| interviewing \| offer \| closed`. Unusable for D-13's draft/ready/published or D-15's pipeline states. *(CONTEXT.md §Reusable Assets lists `StatusPill` as covering D-15 — it does not.)* | Generic `stage` accepting a tone + label; keep the job stages as a preset | `should-fix-in-Phase-1` | **MEASURED 2026-08-18 (plans 12 and 13). `StatusPill` appears on ZERO of the seven admin screens**, and `Badge` stands in on **two distinct surfaces**, each for a different closed union it cannot express. **Surface 1 — D-13's draft / ready / published (plan 12).** D-13 requires the three states legible in three places: the screen, the sidebar badge and the dashboard. All three render `Badge` with UI-SPEC's mapping (`pending` → draft, `upcoming` → ready, `done` → published). Asserted in the dashboard route: `StatusPill` appears only inside a comment and `<StatusPill` is absent from the file. **Surface 2 — D-15's photo-pipeline states (plan 13),** on the `/admin/photos` grid. `CONTEXT.md` §Reusable Assets lists `StatusPill` as covering D-15; it does not, and that line is wrong. **A second, compounding defect was measured on surface 2 and belongs with this row:** `DataGrid` stringifies every cell, so a `Badge` can only enter a row through a column keyed *exactly* `status`, which `DataGrid` then routes through a **private job-application tone lookup** — so all three pipeline values collapse to one tone inside the grid. The closed union is therefore not only unusable as a component, it is *wired into a second component's rendering path*. **A third surface has since appeared (plan 15):** D-45's `Live` / `Maintained` / `Archived` on `/admin/projects`, again `Badge`, and again inexpressible as a `stage`. Tier unchanged. |
| **G-6** | `FormErrorSummary` | UPDATE | `errors: string[]` — no anchor. D-18 requires deep-linking to the offending screen. | `errors: Array<{ message: string; href?: string }>` | `should-fix-in-Phase-1` | **MEASURED 2026-08-18 (plan 16), by composing the real component on the two surfaces that need it.** The prop surface is exactly `{ errors: string[]; title?: string; className?: string }` (`dist/index.d.ts:3350-3354`). Unlike the four dialogs, **`FormErrorSummary` does render under SSR — 156 B** — so this gap is not hidden behind the portal problem: the component works and simply cannot carry a link. **The consequence, built twice:** on `O-publish-invalid` (the D-18 modal) and on `T-error-publish` (the inline publish block), the three `Go to Résumé` / `Go to Photos` / `Go to Home` actions had to render as **separate elements beside the summary**, in a second ordered list whose only binding to the first is that the two arrays happen to be in the same order. That is visibly not what D-18 asks for — the link is next to the list rather than on the failure — and reordering or renumbering either array desynchronises them with nothing to catch it. The component was **not** forked to add an `href`: the Core Value makes the gap a finding, and those two routes are its evidence. The emitted markup is `<div role="alert" class="ds-atom-form-error-summary"><strong>…</strong><ul><li>…</li></ul></div>` — a `<ul>` of plain text, with no element in it that could take an anchor. Tier unchanged. |
| **G-7** | *(none)* | **NEW component** | **No diff / side-by-side component** for D-16's per-file conflict screen — the largest single admin surface has zero DS coverage. | New `DiffView` (remote vs pending, per-file, with reload/overwrite actions) | `backlog`, **`blocks-Phase-7`** | **MEASURED 2026-08-18 (plan 15) by building the screen, so this is a requirements list rather than a one-line absence.** UI-SPEC's DS-composition column for this screen reads, in full, *nothing*. **(a) The primitives that were stretched, and how far.** *Two versions of one field side by side* → nearest is `Table` / `DataGrid`, and both are row-of-cells while a diff row is one field with **two alternatives of the same field** (the field name spans both columns); `DataGrid` also stringifies every cell, so nothing structured can enter one. *A file group with header, body and actions* → `Card`, which has **no internal structure at all** — no header, footer or action slot — so it wraps a hand-built `<section>` with three local classes. *Resolved / outstanding at a glance* → `Badge`, which carries the word but emits **no class**, so the row's state had to be a `data-` attribute plus a border-weight change. *The progress line (`2 outstanding · 1 resolved · 1 clean`)* → **nothing**; only the component knows how many of its files are resolved, so it was composed from three `Badge`s and a `role="status"` div. *Overwrite stating its cost* → `ConfirmDialog tone="danger"`, which renders **0 B** under SSR and whose panel has no stylesheet at all. **(b) The props it would need**, derived from what the sketch had to hold: `files: Array<{ path; status: "conflicted" \| "clean"; rows: Array<{ field; remote: ReactNode \| null; local: ReactNode \| null; note? }>; remoteAuthor?; remoteSummary?; localSummary?; baseSha?; remoteSha? }>` · `resolutions: Record<string, "reload" \| "overwrite" \| null>` · `onResolve: (path, choice) => void` · `labels?` · `confirmOnOverwrite?: (path) => ReactNode`. **Four of those are load-bearing rather than cosmetic:** `resolutions` is keyed by **path** and there is deliberately **no `onResolveAll`** — a global "theirs or mine" is the shape D-16 rules out and the shape the legacy `baseSha: "latest"` produced by accident; `remote` and `local` are nullable and **null means two different things** ("not in the published file" vs "unchanged here"), so the component must render *words* for each rather than a shared placeholder (measured: **0 standalone em dashes** in the built page); **clean files are part of `files`, not filtered out**, because the résumé row is on screen precisely so a reviewer sees it is not being asked about; and `confirmOnOverwrite` is **per file** because the copy names the file. **(c) How per-file resolution state is expressed** — three simultaneous signals, because one of them is a colour and a colour alone is not a distinction: a `Badge` carrying **words** (`Resolved — Reload remote` vs `Needs a decision`), a left rule that changes token and weight (`--wire` 3.44:1 while outstanding, `--rule` 1.38:1 once resolved), and `data-resolved="true\|false"` driving a slight recession. The count is stated **above the first row** rather than inferred from it, because the failure guarded against is a partially resolved conflict reading as finished. Rendered simultaneously: 3 conflicted files (1 resolved, 2 outstanding) + 1 clean, with 5 `Reload remote` and 7 `Overwrite` occurrences — per file, never global; `accept all\|take theirs\|take mine\|resolve all` asserted absent. Tiers unchanged. |
| **G-8** | `AppShell` | UPDATE — additive | Slots are `sidebar \| topbar \| main \| footer`. D-15's persistent pipeline strip has nowhere to live that survives navigation. **Re-tiered from `backlog`:** it is a trivial additive optional prop, and omitting it invites every admin route to re-implement the strip independently — the divergence D-15 explicitly forbids ("two places that must agree"). | Optional `banner` slot between topbar and main | **`should-fix-in-Phase-1`** | **MEASURED 2026-08-18 (plan 12), by composing D-15's strip and living with the result on all seven admin routes.** `AppShell`'s slots are exactly `sidebar \| topbar \| main \| footer`, so the strip is composed **into the topbar** (`src/components/AdminTopbar.tsx`, artefact `O-pipeline-strip`). **The consequence, stated plainly rather than inferred: the strip does not survive as a distinct region.** It is welded to the topbar's own layout, it shares one row of the shell with the global publish action, and **it has no landmark of its own** — so a screen-reader user has no way to reach "the thing telling me my photos are still processing" except by walking the topbar. **Both alternatives are worse in the exact way D-15 forbids:** putting it in `main` makes each of the seven routes re-implement it, which *is* the divergence D-15 rules out when it requires "two places that must agree"; putting it in `footer` puts an active-process indicator below the fold. The strip's **failure** state is the sharpest case, sketched in plan 16 at `/admin/overlays/pipeline-failure/`: `Processing failed for 2 photos.` with a retry that must state *"The originals are still staged. Retrying does not re-upload them."* — recovery copy competing for row space with the primary CTA. Tier unchanged (already re-tiered from `backlog` before this measurement, and the measurement supports it). |
| **G-9** | `SegmentedControl` | **NEW component** *(reclassified from UPDATE)* | **Not a hooks problem — an ARIA-pattern problem.** `SegmentedControl` is a WAI-ARIA **radiogroup** with state-driven `onChange` selection, so it has **no navigable anchor semantics at all**. PUB-04 needs prerendered `/photos/[category]` routes with real links: crawlable, Back-button-capable, zero JS. An `as="nav"` prop on the same component cannot serve radiogroup and nav/link-list ARIA patterns cleanly — the roles, keyboard model and selected-state semantics all differ. | Small **new sibling `FilterNav`** that shares `SegmentedControl`'s CSS classes for visual parity but renders real `<a href>` anchors with `aria-current="page"` | `blocks-Phase-5` | pending |
| **G-10** | *(none)* | accepted | No masonry / column-gallery component. | — (layout CSS is permitted by QUAL-03) | `backlog` | pending |
| **G-11** | `--text-*` | UPDATE — additive | **No step at 52px** (44→60 gap) for the Work and Photos display headers. | Add a step, available to every brand | `should-fix-in-Phase-1` | **MEASURED — the hole is real, and the Phase 0 workaround is recorded rather than improvised.** The Work and Photos page headers call for **52**px. The shared scale steps at **44** (`--text-4xl`) and 60 (`--text-5xl`), so 52 sits in an 8px gap — the only one of fifteen handoff sizes that lands further than ±2px from an existing step. Phase 0 sketches therefore render those two headers at **44**px and park a reference screenshot at **52**px beside them, instead of hardcoding 52. The reason is the D-31 boundary, not timidity: `--text-*` is *sizing* and therefore design-system-owned, so a brand needing a missing step files it upstream as a new step available to every brand. The boundary held in practice, not only on paper — `.playground/src/styles/theme-charcoal.css` declares **zero** `--text-*` (and zero `--space-*` / `--lh-*` / `--ls-*` / `--z-*` / `--dur-*` / `--ease-*`) properties, asserted by grep in that plan's acceptance criteria. |
| **G-12** | `exports` map | UPDATE — additive | `./css/*` requires **extensionless** specifiers (`/css/base`, not `/css/base.css`); `import.meta.resolve` under-reports the broken form. | Add `"./css/*.css"` alongside the existing pattern | `should-fix-in-Phase-1` | **MEASURED.** The `exports` entry is `"./css/*": { "style": "./dist/css/*.css", "default": "./dist/css/*.css" }` — the wildcard already supplies `.css`, so `@akhil-saxena/design-system/css/base.css` expands to `dist/css/base.css.css`, a file that does not exist, and the Rolldown build fails. `@akhil-saxena/design-system/css/base` expands correctly to `dist/css/base.css`. The trap is that the broken form is the one every developer will write first, and `import.meta.resolve()` **does not catch it** — it substitutes the wildcard and returns a URL string without `stat`-ing the target, so it reports the broken specifier as resolvable. Only an actual build fails. 74 per-component sheets ship in `dist/css/`. **RE-MEASURED 2026-08-17 (plan 07), with the observed error text and the `import.meta.resolve()` claim converted from inherited to measured.** A JS `import "@akhil-saxena/design-system/css/base.css"` in an `.astro` page fails the build with exit 1 and `` [vite]: Rolldown failed to resolve import "@akhil-saxena/design-system/css/base.css" from "…/src/pages/probe/scratch-broken.astro" `` — reproducing research's message verbatim. **A CSS `@import` of the same broken specifier fails differently and worse:** `` [vite] Unable to resolve `@import "@akhil-saxena/design-system/css/card.css"` from …/src/styles `` followed by `` [postcss] ENOENT: no such file or directory, open '@akhil-saxena/design-system/css/card.css' ``. That second message quotes the **bare specifier as though it were a filesystem path** and never mentions the doubled extension, so the D-33 manifest — which is entirely CSS `@import` statements — gets the *less* diagnostic of the two failures. `import.meta.resolve()` was then run directly against both spellings: the broken one **returns `…/dist/css/base.css.css` and does not throw**, and `existsSync` on that exact returned path is **false**. So the resolver reports a path it has not checked, confirmed rather than assumed. **The D-35 packaging shape is now tested, not asserted:** a private local fixture (`.playground/fixtures/stub-theme-pkg`) carrying only the proposed map installs as a `file:` dependency and an `.astro` page importing both `…/themes/charcoal.css` and `…/fonts/charcoal.css` **builds clean**, with both sheets' content present in the emitted page. The counter-proof was run on the same fixture: respelling the entry as `"./themes/*"` (the shape the existing `./css/*` entry has) makes the `*` capture `charcoal.css`, substitutes to `themes/charcoal.css.css`, and fails with `` [vite]: Rolldown failed to resolve import "stub-theme-pkg/themes/charcoal.css" ``. **The `.css` inside the wildcard is what makes D-35's specifier string work, and that is now a measurement rather than a reading of the spec.** `../design-system` was not modified. |
| **G-13** | `Sortable` | UPDATE | Wires dnd-kit's `KeyboardSensor` so items *move* by keyboard. **RESTATED FROM MEASUREMENT — the original wording, "passes no `announcements` / `screenReaderInstructions`, nothing is announced", is wrong.** Something *is* announced; it speaks **raw record ids and never a position**, and `Sortable` exposes no prop through which a consumer could replace it. (OQ-4) | **Announcer PASSTHROUGH** on `Sortable` (and on `SortableDndContext`) so a consumer can supply title-and-position text — *not* "pass the announcer", which is already happening | `should-fix-in-Phase-1` | **MEASURED 2026-08-18 (plan 13), driven by keyboard alone in Chromium 147 against the built `dist/` — focus a tile, `Space`, `ArrowDown`, `Space`. Three questions, three answers.** **Q1 — does a live region exist? YES, two of them:** `<div id="DndLiveRegion-0" role="status" aria-live="assertive" aria-atomic="true">` and `DndLiveRegion-1`, one per `DndContext` on the page, both empty at rest after hydration and both **absent from the SSR'd HTML** because dnd-kit mounts them in an effect. Each tile also carries `aria-describedby="DndDescribedBy-0"` pointing at a `display: none` element holding dnd-kit's default instructions. **Q2 — is the new position announced? NO. Something is announced and it is not the position.** Verbatim: `Space` → *"Draggable item abstract-intothemist was moved over droppable area abstract-intothemist."*; `ArrowDown` → *"Draggable item abstract-intothemist was moved over droppable area abstract-lightscameraart."* **Three defects in that text:** it speaks raw record ids and never the photo's title; it speaks **no position at all**, never "position 2 of 36", which is the one fact a reorder user needs; and the pick-up event announces the item as having moved over *itself*, which reads as a move that did not happen. **Q3 — is the drop confirmed? Textually, and uselessly:** *"Draggable item abstract-intothemist was dropped over droppable area abstract-lightscameraart"* (no full stop, unlike the other two) — it confirms that *something* landed, not *where*. **Why the original wording is wrong:** dnd-kit's `DndContext` renders `<Accessibility>` with `defaultAnnouncements` and `defaultScreenReaderInstructions` **when the consumer passes nothing** (`@dnd-kit/core@6.3.1`, `core.esm.js:40-88`). Passing nothing gets the defaults, not silence. `Sortable`'s prop surface is `{ items, onReorder, renderItem, id, className, style }` with **no accessibility passthrough and no rest-spread onto `DndContext`**, so a consumer cannot replace them. Two related observations from the same run: a page with two `DndContext`s gets two `aria-live="assertive"` regions with no way to share one, and **the keyboard path itself works** — every reorder in the sketch was performed by keyboard alone, so the movement is sound and only the speech is not. No local announcer was added: `grep -qE 'aria-live\|announcements\|screenReaderInstructions' SortableReorder.tsx` exits 1. Tier unchanged. |
| **G-14** | `Lightbox` | UPDATE | Missing backdrop-click close, `srcset`, swipe, `aria-live` slide announcements. | Already scoped as **DS-07** | `blocks-Phase-5` | pending |
| **G-15** | barrel | UPDATE | **DS-09 tree-shaking fails.** One `import { Chip }` in a hydrated island drags the editor and drag-drop stacks into the browser. | Per-component JS subpath exports | `blocks-Phase-5` | **MEASURED 2026-08-17** at `astro@7.2.2` / `@astrojs/react@6.0.2` / `react@19.2.8` / DS `1.11.4`. Island chunk **570555 bytes raw, 176922 bytes gzip, 99 modules** — prosemirror 10, tiptap 23, lowlight 4, highlight.js 4, dnd-kit 3, lucide-react 43. Source: one `import { Chip }` rendered `client:load`, nothing else. Three configuration fixes were attempted during research and each produced **byte-identical output**: (1) `sideEffects: ["*.css"]` → `sideEffects: false`; (2) removing the leading `"use client"` directive from `dist/index.js`; (3) marking the module-scope `var lowlight = createLowlight();` as `/* @__PURE__ */`. The barrel is therefore **not shakeable by configuration**, and DS-09's per-component-JS-subpath fallback is the live branch, not a contingency. |

## Admin findings outside the sixteen — an INDEX, not register rows

**This section adds no row, no tier and no scope to anything.** The register's own rule above
is that a plan finding something outside the sixteen records it in **its own SUMMARY**, so the
tier-pull contract keeps a fixed denominator — and that rule is deliberately not bent here.
Plan 16's instructions permitted appending new `G-` rows; doing so would have changed the
lists in "Phase 1 pulls …" without a decision, which is exactly the repudiation risk this
file's own tier rules guard against. What follows is therefore a **pointer table**: where to
find each admin measurement, and nothing more. Every one of them is already committed in the
named SUMMARY, which remains the record.

**Read these before planning Phase 1 or Phase 7.** They are not scoped by the pull contract,
so a planner who reads only the sixteen rows above will not see them — and three of them block
the way UI-SPEC itself says overlays must be built.

| Ref | One line | Recorded in |
|-----|----------|-------------|
| **F-15-1** | **Every overlay server-renders to nothing.** `Modal`, `ConfirmDialog`, `TypeToConfirm` and `Sheet` all mount through `DSPortal`, which returns `null` until a mount effect runs (`dist/index.js:2429-2436`) — measured at **0 B each** with `react-dom/server`, re-confirmed in plan 16. No dialog in the product is server-rendered, so none exists for a no-JS reader or a crawler. Proposed fix: an `inline` / `portal={false}` escape, or an SSR-safe `DSPortal` that renders in place and adopts on mount. | `00-15-SUMMARY.md`, `00-16-SUMMARY.md` |
| **F-15-2** | `Modal` renders a ghost `Button aria-label="Close"` into its header **unconditionally** (`dist/index.js:2789-2799`) with no prop to remove it, so it cannot express a fail-closed re-auth. Proposed fix: `closable?: boolean` suppressing the header button, the Escape handler and the backdrop path *together*. | `00-15-SUMMARY.md` |
| **F-15-3** | `ConfirmDialog`'s panel has **no stylesheet at all** — no `.ds-atom-confirm-panel` rule anywhere under `dist/css/`. It is one inline style object with a hardcoded `rgba(255,255,255,.97)` background and a danger tone in `var(--red)` over `rgba(239,68,68,.1)`. Nothing in the charcoal cascade reaches any of it. | `00-15-SUMMARY.md` |
| **F-15-4** | `Badge` emits **no class at all** and there is no `badge.css`. One inline style object, hardcoded 9.5px type, on a component that appears on all seven admin screens. A consumer cannot select, restyle or resize one. | `00-15-SUMMARY.md` |
| **F-15-5** | D-45's three statuses are **not distinguishable by fill** on charcoal light: Live vs Maintained **1.02:1**, and all three fills within **1.07–1.14:1** of the page. Only the words and their text colours separate them, at 9.5px. | `00-15-SUMMARY.md` |
| **F-15-6** | `Tabs` server-renders the inactive panel **with its children omitted** — the element is present, the content is not — so a static sketch behind a second tab ships an empty box, and in production no tab panel but the first exists for a crawler. | `00-15-SUMMARY.md` |
| **F-15-7** | Three more control-geometry targets under the 44px floor, all measured: `Checkbox`'s label **22px**, `InlineEdit` **25px**, `NumberStepper` **24 / 30px**. Same family as G-2; `IconButton`'s largest of three sizes is 40px, so no value of a size prop would have helped. | `00-15-SUMMARY.md` |
| **F-15-8** | `InlineEdit`'s accessible name is the fixed string *"Click to edit"* with no prop — seven rows on `/admin/site` announce the same three words. | `00-15-SUMMARY.md` |
| **F-14-1** | `toolbar={null}` **does not suppress the toolbar** (`!readOnly && (toolbar ?? defaultToolbar)`; `??` falls through on `null`). A shipped bug, folded into G-3's proposed fix above. | `00-14-SUMMARY.md` |
| **F-14-2** | `RichText` registers `CodeBlockLowlight` unconditionally and lazily downloads a six-language syntax highlighter to edit a résumé bullet. | `00-14-SUMMARY.md` |
| **F-13-1** | `DataGrid` hardcodes `Table.Root`'s `ariaLabel` to **"Job applications"**, so every grid in the product announces itself as a job-application table. Same closed-job-domain family as G-5. | `00-13-SUMMARY.md` |
| **F-13-2** | `DataGrid` **stringifies every cell**, so a `ReactNode` cannot enter a row; a `Badge` can only arrive through a column keyed exactly `status`, routed through a private job-application tone map. | `00-13-SUMMARY.md` |
| **F-13-3** | `DataGrid` renders a `Pagination` in its footer unconditionally, and neither `pagination.css` nor `iconbutton.css` is named by `datagrid.css` — a compound component whose CSS is not self-contained. Measured: an unstyled pager at **21px** against the 44px floor. | `00-13-SUMMARY.md` |
| **F-12-1** | `AppShell` cannot express a responsive sidebar posture: no `collapsed` / `defaultCollapsed` prop, `cloneElement` overwrites a consumer-supplied `collapsed`, and `--ds-sidebar-w` is an inline style. Distinct from G-8 (a missing slot) — this is about posture. Folded into G-2's evidence above. | `00-12-SUMMARY.md` |
| **F-12-2** | `Button variant="primary"` sets `background: var(--amber)` **inline**, and the charcoal theme declares zero `--amber*` tokens, so the admin's most prominent control renders the design system's yellow on a warm charcoal-light field with no stylesheet able to reach it. `ProgressBar`'s fill is the same unmapped token, and `Link variant="inline"` resolves `--amber-d` to `#b45309`. | `00-12-SUMMARY.md`, `00-15-SUMMARY.md` |
| **F-12-3** | `Button` emits no `data-size` attribute while its sibling `Select` does, so CSS can select a Select by size and cannot select a Button by size. Folded into G-2's evidence above. | `00-12-SUMMARY.md` |

## Measured baselines

Every number below was produced in the throwaway `.playground/` harness against the real
packed tarball, on a cleared Vite cache. The first two are plan 01's and are the counterpart
measurements: one claim failed, one held, and they are **not** the same claim. The third is
plan 04's. The fourth and fifth are plan 07's.

| Claim | Result | Measurement |
|-------|--------|-------------|
| DS-09 barrel tree-shakes on a hydrated island | **FAILS** | 570555 B raw / 176922 B gzip / 99 modules — see G-15 |
| Composing the design system statically is free | **HOLDS** | **0** `<script>` tags on `probe/static`, a page rendering eight DS components (`AppBar`, `Heading`, `Text`, `Chip`, `Card`, `StatCard`, `Timeline`, `Footer`) |
| D-29's tokens/faces split collapses the face layer | **HOLDS** | **8** `@font-face` rules from `fonts-charcoal.css` against the design system's **73** — 10 emitted font files / 200864 B, against 128 files / 2174132 B |
| The charcoal cascade is order-independent | **HOLDS** | **136 assertions green per run, across 4 constructed import orders × 2 colour modes × 2 `inlineStylesheets` settings** — 17 tokens, every cell identical and every value equal to what `theme-charcoal.css` declares for that mode |
| D-33's manifest ships materially less than the whole primitives sheet | **HOLDS** | public component set **41179 B raw / 9447 B gzip** (14 sheets), admin **109864 B / 19763 B** (38 sheets), against `primitives.css` whole at **181861 B / 36083 B** — 77.4% / 73.8% less for the public surface |

**The font-split baseline, in full (plan 04).** `fonts-charcoal.css` re-exports four Fontsource
entry points — `playfair-display/wght.css` (4 subset rules), `dm-sans/wght.css` (2),
`ibm-plex-mono/latin-400.css` (1) and `latin-500.css` (1) — for **8 `@font-face` rules**,
counted twice independently: by `grep` on the emitted chunk and by `check-font-names.mjs`
parsing the packages themselves. The design system's `tokens.css` emits **73** in the same
build, reproducing research's count exactly. The asset trees measured in one `astro build`
that loads both: charcoal **10 files (8 woff2 + 2 woff) / 200864 B**, design system
**128 files (65 woff2 + 63 woff) / 2174132 B** — a 92% cut in files and 91% in bytes. The
byte figure is smaller than research's "2.36 MB" for the same 128 files because these are
summed file sizes rather than block-rounded disk usage; the **file counts match exactly**
(65 woff2 + 63 woff), so the two measurements agree on what is there and differ only in how
they weigh it. The static IBM Plex Mono package is the reason charcoal emits 10 files for 8
rules: it ships a legacy `.woff` beside each `.woff2`, which the two variable packages do not.

**D-30's premise is false and this is the correction.** "All three ship variable" does not
hold — no variable build of IBM Plex Mono is published to npm, so the mono family is served
from the static package at two weights. This is a factual correction, not a supply-chain
finding: the guessable variable package name returns a registry 404 and is *unclaimed*, so
installing it would resolve to whatever eventually claims that name. `fonts-charcoal.css`
asserts its own absence in the plan's acceptance criteria for exactly that reason.

**"Latin subset only" is also not a package option** for the two variable families — neither
ships per-subset CSS. What is guaranteed is a latin-only *download*: the non-latin rules carry
a `unicode-range` this site's content never matches, so the browser fetches one file per
family. 4 of the 8 rules are Playfair's subsets, and 3 of those 4 will never be requested.

**These first two results must not be conflated.** A zero-JS pass on a static page says nothing
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

**Footnote to G-15's byte count, so a re-run is not mistaken for drift (plan 07).** Adding
two trivial islands to the playground (the cascade probe's variants C and D, one CSS import
each) caused Rolldown to factor `jsx-runtime` out into its own shared chunk, which moves the
`ChipIsland` chunk from **570555 B / 176922 B / 99 modules** to **570274 B / 176798 B /
97 modules**. **The heavy-module counts are byte-for-byte unchanged** — prosemirror 10,
tiptap 23, lowlight 4, highlight.js 4, dnd-kit 3, lucide 43 — so G-15's verdict, its
mechanism and its 3.5× overage are all untouched. The 570555/176922/99 figures remain the
canonical record because they were measured on the one-island tree; the delta is recorded
here only so nobody re-runs `check-bundle.mjs` after plan 07 and concludes the measurement
is unstable.

**The cascade probe, in full (plan 07).** Four pages, each differing only in where two
stylesheets are imported: `casc-a` tokens-then-theme in `.astro`; `casc-b` the reverse;
`casc-c` tokens in `.astro` with the theme carried by a `client:load` React island;
`casc-d` the reverse of `c`. Playwright reads
`getComputedStyle(document.documentElement)` for 17 charcoal tokens in each of the eight
cells, over a fifteen-line `node:http` server rather than an adapter-aware preview command
(the D-02 fence). **Every cell is identical, and every value equals what
`theme-charcoal.css` declares for that mode** — the second assertion matters because
cross-variant agreement alone would also pass if charcoal had failed to apply on all four
pages. The two anchors: `--cream` resolves **#161616** dark / **#f4f1ea** light in all four
orders, and `--ochre-d-strong` **#d4a66d** / **#6b4417**. **This is where research measured
a failure and this phase measures a pass, and the difference is the invariant, not luck:**
research probed a deliberately non-exhaustive prototype and watched `--cream` break in both
orderings; plan 04's theme restates 37/37 tokens at (0,3,0), so there is no tie left to lose.

**The negative control reproduces research's failure exactly, by construction.** Deleting
the single `--wire` declaration from the charcoal dark block and rebuilding makes the probe
exit 1 and produces **two different wrong answers from one omission**: `casc-a` and `casc-d`
apply the charcoal *light* wire `#878173` in dark mode, while `casc-b` and `casc-c` fall
through to the design system's neutral `rgba(255,255,255,0.22)` → `#ffffff38`. Restoring the
line returns the file to a byte-identical SHA-256 and the probe to exit 0. That is the
D-02 claim-3 hazard reproduced on demand in this stack, not inherited from a document.

**Ordering is unaffected by `inlineStylesheets`, and the emitted orders were read out of the
HTML rather than assumed.** Under `'auto'` the ~2 KB charcoal sheet inlines as a `<style>`
tag and the 65 KB token layer links; under `'never'` both link. **The emitted sequence is
identical under both settings** — `casc-a` and `casc-d` emit tokens-then-charcoal, `casc-b`
and `casc-c` emit charcoal-then-tokens — confirming research's claim with the two orders
observed directly rather than trusted.

**New mechanism finding: an island's CSS is not "last", it is wherever the component's
import statement sits.** `casc-c` imports the island component *before* `tokens.css` and
emits charcoal first; moving the `tokens.css` line above the component import flips the page
to tokens-first (measured both ways). So island CSS does not get a privileged late position
merely by being hoisted — its cascade position is decided by the position of the
**component's** `import` statement in the page. **Operationally this means an import sorter
or a lint autofix can silently flip which stylesheet wins a tie**, which is a second,
independent argument for the exhaustiveness invariant: it is the only thing that makes the
result insensitive to a reformat. The playground's two island variants keep the component
import first for exactly this reason, and say so in their headers — otherwise `casc-c` and
`casc-d` would emit the *same* order and the island half of the matrix would silently test
one order twice while still passing.

**@layer stays deferred, and this is the evidence for that.** Compound selectors plus
exhaustiveness are sufficient across the whole matrix with no cascade layers and no
`!important` anywhere. D-28's deferral of `@layer` to Phase 06.1 is therefore a measured
"not needed yet" rather than an unexamined postponement.

**The D-33 manifest, measured (plan 07).** Two hand-maintained single files, each ordered
token layer → faces → theme → `base` → per-component sheets, using extensionless
per-component specifiers throughout:

| Set | Sheets | Raw | Gzip |
|-----|-------:|----:|-----:|
| Public component set (`base` + 13) | 14 | **41179 B** | **9447 B** |
| Admin component set (public + 24) | 38 | **109864 B** | **19763 B** |
| `primitives.css` whole — the alternative | 1 | 181861 B | 36083 B |
| Public route, everything it actually ships | — | 86593 B | 33867 B |
| Admin route, everything it actually ships | — | 122964 B | 39177 B |

The first three rows are the comparison D-33 rests on: the public surface ships **77.4% less
raw / 73.8% less gzip** of component CSS than the whole sheet, and even the admin — with
every form control, the data grid, the editor and the overlay surfaces — comes in below it.
The last two rows are what a visitor downloads, and they are much closer together than the
first three, which is the finding in the next paragraph.

**Correction: `primitives.css` is 181861 B, not the 178398 B research recorded.** Measured
three ways and identical in all three — the installed 1.11.4 tarball, `../design-system/dist/`
and `../design-system/src/` all report **181861 bytes**. Research's other split-CSS figures
are low by the same margin (`base.css` 7094 vs **8741**; all 74 sheets concatenated 217569 vs
**221032**, a delta of exactly 3463 B in both the concatenation and `primitives.css`), so the
discrepancy is systematic rather than a single typo. **The figures above supersede research's
for any Phase 1 or Phase 5 comparison**; research's `178398` / `41281` / `8923` should not be
re-quoted. The direction of D-33's conclusion is unaffected and if anything strengthened.

**The manifest ships 81 `@font-face` rules, and D-29's split does not fix that on its own.**
`manifest.css` and `manifest-admin.css` each emit **81** face rules: the design system's
**73** (inlined by its `tokens.css`, which the manifest must import because it carries the
values charcoal overrides) plus charcoal's own **8**. So the 8-vs-73 win recorded above is a
win *for the charcoal layer in isolation*, and it does **not** survive a consumer that also
imports the current `tokens.css`. Nothing here is a new gap — it is the same
face-rules-inside-the-token-layer problem already recorded under D-29/D-36 — but it is the
first measurement of what the split is worth **at the consumer**, and the answer is that
D-36's major version has to actually remove the faces from `tokens.css` for the manifest to
benefit. The public route's 86593 B is ~65 KB token layer and ~21 KB of everything else,
which is why rows 4-5 of the table are so much closer than rows 1-3.

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
