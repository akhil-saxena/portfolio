---
phase: 0
plan: 15
subsystem: design-ideation
tags:
  [
    dsgn-01,
    dsgn-04,
    admin,
    projects,
    project-detail,
    site,
    conflict,
    d-09,
    d-10,
    d-16,
    d-19,
    d-24,
    d-25,
    d-39,
    d-41,
    d-42,
    d-45,
    g-7,
    overlays,
    diffview,
    reassignment,
    reauth,
    touch-floor,
  ]

requires:
  - .playground/ harness (plan 01)
  - theme-charcoal.css + fonts-charcoal.css (plan 04)
  - manifest-admin.css (plan 07)
  - src/layouts/Admin.astro, src/lib/artefacts.mjs, src/styles/density-compact.css, check-states.mjs, check-no-js.sh, src/pages/index.astro (plan 12)
  - THE ADMIN SKETCH IDIOM (plan 13) — followed, with four stated deviations
  - plan 14's density prop on Admin.astro, and its G-3 / G-4 evidence, reused rather than re-derived
  - 00-ADMIN-IA.md, 00-UI-SPEC.md, 00-RESPONSIVE-CONTRACT.md, 00-COPY/ (plan 05)
  - data/resume.json, data/site_config.json, data/portfolio_images.json, data/home_config.json — the real content, counted this session
provides:
  - S-projects, E-projects, S-project-detail, R-case-study-authoring, O-reauth-401, T-error-network, S-site, O-category-reassign, O-conflict-diff — NINE artefacts from four route files
  - src/fixtures/projects.json, project-detail.json, site.json, conflict.json — all values read from the real committed data
  - the seventh admin screen, so all 7 x 6 = 42 coverage cells now have a declaring route
  - `n/a` as a working third coverage value on the contact sheet, with a reason-or-fail guard
  - a 44px floor for Checkbox, InlineEdit and NumberStepper in density-compact.css, each measured
  - .playground/audit15.mjs and reflow15.mjs — the browser audits, re-runnable by plans 16 and 17
affects:
  - Phase 0 plan 16 (transcribes the findings below; the coverage table now has a complete input, and TWO bookkeeping problems below need its ruling)
  - Phase 0 plan 17 (screenshots 30 new URLs, one of them at a phone viewport, two of them overlays)
  - Phase 1 (six new design-system findings, three of them blocking the way UI-SPEC says overlays must be sketched)
  - Phase 2 (D-19's fail-closed boundary is now depicted rather than described)
  - Phase 3 (the projects.json extraction and the category record shape are both written against measured shapes)
  - Phase 7 (G-7 has a concrete requirements list instead of a one-line absence)
  - Phase 06.1 / DS-11 / G-2 (three more unreachable control-geometry targets, all measured)

tech-stack:
  added: []
  patterns:
    - a screen with a dynamic segment pins its state axis to ONE id, because a state is a property of the screen and not of the record
    - `getStaticPaths` sees only imports and top-level exports, so anything it reads must be exported
    - read the router's own comparator before writing two routes that could collide, rather than watching a gate fail
    - a coverage cell may be `n/a`, and an `n/a` with no reason must fail the build
    - measure a component with react-dom/server BEFORE composing it, when the sketch is static and the component might not be
    - the touch floor for a design-system control belongs in density-compact.css, because a scoped rule cannot reach inside a framework component at all

key-files:
  created:
    - .playground/src/pages/admin/projects/[...state].astro (gitignored)
    - .playground/src/pages/admin/projects/[id]/[...state].astro (gitignored)
    - .playground/src/pages/admin/site/[...state].astro (gitignored)
    - .playground/src/pages/admin/conflict-diff.astro (gitignored)
    - .playground/src/fixtures/projects.json + project-detail.json + site.json + conflict.json (gitignored)
    - .playground/audit15.mjs + reflow15.mjs (gitignored)
    - .planning/phases/00-design-ideation/deferred-items.md
  modified:
    - .playground/check-states.mjs (gitignored) — +3 SCREENS entries
    - .playground/src/pages/index.astro (gitignored) — `n/a` coverage handling + a reason-or-fail guard
    - .playground/src/styles/density-compact.css (gitignored) — PLAN 15 CORRECTION, three controls

decisions:
  - "EVERY OVERLAY IN THE DESIGN SYSTEM SERVER-RENDERS TO NOTHING. Modal, ConfirmDialog and Sheet all mount through DSPortal, which returns null until a mount effect runs. Measured with react-dom/server: 0 B each. UI-SPEC's hydration table prescribes sketching dialogs, sheets and the conflict diff 'open and static' — that instruction is not satisfiable with the components as shipped, and this plan needed three of them."
  - "`Modal` renders a ghost Close button into its header unconditionally with no prop to remove it, so the component as shipped cannot express a fail-closed re-authentication. That is a second, independent reason O-reauth-401 could not be composed from it."
  - "D-45's three statuses are NOT distinguishable by fill. Measured on charcoal light: Live vs Maintained fill separation 1.02:1, and all three fills sit within 1.07-1.14:1 of the page. Only the label text tells them apart, at a hardcoded 9.5px."
  - "`Badge` emits NO CLASS AT ALL and there is no badge.css in the package. It is one inline style object, so a consumer cannot target, theme or resize it from CSS — on a component that appears on all seven admin screens."
  - "The conflict diff is at /admin/conflict-diff/, not /admin/conflict/. The dashboard route already emits /admin/conflict/ as its own state, so the plan's path would have collided with it and check-states would have reported the collision as a rendering fault on the dashboard."
  - "The detail screen's state axis is pinned to `cairn`. Five ids x six states is thirty near-identical routes; a state is a property of the screen, not of the record."
  - "T-error-network is CLAIMED here, on /admin/projects/cairn/network/. UI-SPEC carries one contract row for 'network / 401', no plan 12-14 screen claimed the treatment, and no later plan sketches admin screens — it would otherwise have been a T- artefact with no host."
  - "The projects list is a Card list rather than a DataGrid, and the reason is rendered on the page: DataGrid's only Badge path is a closed job-application tone map, so all three D-45 values collapse to one tone inside it."

metrics:
  tasks: 3
  commits: 1
  artefacts: 9
  routes-emitted: 30
  pages-built: 77
  gates-green: 8
  gates-failing-by-design: 1
  duration: ~50m
  completed: 2026-08-18
---

# Phase 0 Plan 15: `/admin/projects`, `/admin/projects/[id]`, `/admin/site` and the conflict diff Summary

The last three admin screens plus the phase's largest design gap — which measured that **every
overlay in the design system server-renders to nothing**, so the way UI-SPEC says overlays must
be sketched cannot be done at all; that `Modal` ships a close control no prop can remove, so it
cannot express a fail-closed re-auth; that D-45's three statuses are separated by **1.02:1** and
are therefore told apart by their words rather than their colour; and that the 44px floor was
being missed on **48 checkbox targets across three existing screens** because the element an
audit measures is not the element a finger hits.

All seven admin routes now exist. The 42-cell coverage table has a complete input.

---

## THE HEADLINE FINDING — UI-SPEC'S OVERLAY STRATEGY IS NOT EXECUTABLE

UI-SPEC's hydration budget table says, of admin sketches:

> **Static by default.** … Dialogs, sheets, error summaries, conflict diff and skeletons are all
> sketched **open and static**. … 32 of ~35 sketches then cost 0 KB.

This plan needed three of them — `O-reauth-401` (`Modal role="alertdialog"`),
`O-category-reassign` (`ConfirmDialog tone="danger"` + `Select`) and the overwrite confirmation
on the diff. **None of the three could be composed.** Measured with `react-dom/server` against
the installed package, before any of the four route files was written:

| composed | server-rendered |
|---|---|
| `<Modal open role="alertdialog" title="Your session expired.">…</Modal>` | **0 B** |
| `<ConfirmDialog open tone="danger" title="Delete the Architecture category?" …/>` | **0 B** |
| `<Sheet open side="left">…</Sheet>` | **0 B** |
| `<Tabs …/>` (control) | 910 B |
| `<InlineEdit …/>` (control) | 146 B |
| `<NumberStepper …/>` (control) | 1,131 B |

The mechanism is one component, four lines:

```js
function DSPortal({ children, target }) {              // dist/index.js:2429
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, target ?? document.body);
}
```

`Modal`, `ConfirmDialog` and `Sheet` all return `<DSPortal>…</DSPortal>`, so under SSR — where no
effect runs — every one of them returns `null`. **Five of the nine `O-` artefacts in
`CANONICAL_IDS` are dialogs or sheets** (`O-publish-valid`, `O-publish-invalid`,
`O-discard-screen`, `O-discard-all`, `O-reauth-401`, `O-category-reassign`, `O-phone-sidebar` —
seven, counting the two discards and the phone sidebar). Every one of them is unreachable
without spending an island, and the island budget was exhausted by plan 14.

**What was done instead.** The chrome is hand-authored against the design system's OWN class
names — `ds-atom-modal-backdrop`, `ds-atom-modal`, `ds-atom-modal-hd`, `ds-atom-modal-body`,
`ds-atom-modal-ft` — all of which ARE in `modal.css`, so every painted pixel is still the design
system's and the only local thing is the mounting. It names its upstream owner at each site, it
dies with the playground, and it is the same sanctioned shape as `density-compact.css`.

**Proposed upstream fix.** An `inline`/`portal={false}` escape on `Modal`, `ConfirmDialog` and
`Sheet`, or a `DSPortal` that renders its children in place during SSR and adopts them on mount.
Either would also fix the second-order problem that no dialog in the product is server-rendered,
so none is present for a no-JS reader or a crawler.

---

## G-7 — THE CONCRETE REQUIREMENTS LIST

The plan asks for three things: which primitives were stretched, what props a `DiffView` would
need, and how per-file resolution state is expressed. All three, from building it.

### 1. The primitives that were stretched, and how far

| Wanted | Nearest primitive | Why it did not fit |
|---|---|---|
| two versions of one field, side by side | `Table` / `DataGrid` | Both are row-of-cells. A diff row is one field with **two values of the same field**, which is a different shape: the field name spans both columns and the two cells are alternatives rather than attributes. `DataGrid` also stringifies every cell (F-13-2), so nothing structured can go in one. |
| a file group with its own header, body and actions | `Card` | `Card` has no internal structure at all — no header, no footer, no action slot. Composed from a `Card` wrapping a hand-built `<section>` with three of my own classes. |
| resolved / outstanding at a glance | `Badge` | Carries the word, but see below: `Badge` has no class hook, so the row's own state had to be a `data-` attribute on my element plus a border-weight change. Three signals were needed because one of them is a colour. |
| the progress line (`2 outstanding · 1 resolved · 1 clean`) | *(nothing)* | Only the component knows how many of its files are resolved. Composed from three `Badge`s and a `role="status"` div. |
| "overwrite states its cost" | `ConfirmDialog tone="danger"` | Renders 0 B under SSR (above), and its panel has no stylesheet at all (below). |
| the two-column layout at ≥673px, stacked below | app layout CSS | Fine, and QUAL-03 permits it — but every consumer of a diff will write it again, including the decision about which axis collapses. |

### 2. The props `DiffView` would need

Derived from what the sketch had to hold, not from a wish list:

```ts
interface DiffViewProps {
  files: Array<{
    path: string;                       // the row's identity and its heading
    status: "conflicted" | "clean";     // clean files are SHOWN, not filtered — D-16's point
    rows: Array<{
      field: string;                    // spans both columns
      remote: ReactNode | null;         // null = "not in the published file"
      local:  ReactNode | null;         // null = "unchanged here"
      note?: ReactNode;                 // why this row is here
    }>;
    remoteAuthor?: string;              // "github-actions · process-photos.yml" reads
    remoteSummary?: string;             // very differently from a person's name
    localSummary?: string;
    baseSha?: string; remoteSha?: string;   // D-10's baseline, surfaced
  }>;
  resolutions: Record<string, "reload" | "overwrite" | null>;  // PER PATH, never global
  onResolve: (path: string, choice: "reload" | "overwrite") => void;
  labels?: { reload?: string; overwrite?: string };
  confirmOnOverwrite?: (path: string) => ReactNode;   // the destructive copy, per file
}
```

Four properties of that shape are load-bearing rather than cosmetic:

- **`resolutions` is keyed by path and `onResolve` takes a path.** There is deliberately no
  `onResolveAll`. A single global "theirs or mine" is exactly the shape D-16 rules out, and it
  is the shape the legacy `baseSha: "latest"` produced by accident.
- **`remote` and `local` are `null`able and null means two different things**, so the component
  must render *words* for each rather than a shared placeholder. ADMIN-IA's omission rule
  applies: never an em dash where a value belongs. Measured: **0 standalone em dashes** in the
  built page.
- **Clean files are part of `files`, not filtered out before the component sees them.** The
  résumé row is on the screen precisely so a reviewer can see it is *not* being asked about.
- **`confirmOnOverwrite` is per file** because the copy names the file: *"Overwrite the published
  `portfolio_images.json`?"* A shared dialog cannot say that.

### 3. How per-file resolution state is expressed

Three simultaneous signals, because one of them is a colour and a colour alone is not a
distinction:

1. a `Badge` carrying **words** — `Resolved — Reload remote` against `Needs a decision`;
2. the left rule changes token and weight — `--wire` (3.44:1) while outstanding, `--rule`
   (1.38:1) once resolved, so an outstanding file is the one that keeps the strong edge;
3. `data-resolved="true|false"` on the row, driving a slight recession.

And the count is stated **above the first row**, not inferred from it, because the failure this
guards against is a partially resolved conflict reading as finished (threat T-00-37). Rendered
simultaneously: **3 conflicted files (1 resolved, 2 outstanding) + 1 clean**, with
**5 `Reload remote` and 7 `Overwrite`** occurrences in the built page — per file, never global.
Asserted absent: `accept all|take theirs|take mine|resolve all`.

---

## NEW DESIGN-SYSTEM FINDINGS

Per `00-FINDINGS.md`'s fixed-denominator rule, these are reported here and **not** appended to
the sixteen-row register. Plan 16 transcribes them.

### F-15-1 · Every overlay server-renders to nothing

Stated in full above. **Fix:** an `inline` / `portal={false}` prop on `Modal`, `ConfirmDialog`
and `Sheet`, or an SSR-safe `DSPortal`. This one blocks the phase's own artefact strategy, so it
is not a nicety.

### F-15-2 · `Modal` cannot express a non-closable dialog

`Modal` renders a ghost `Button aria-label="Close"` into its header **unconditionally**
(`dist/index.js:2789-2799`) — there is no prop to remove it. `closeOnBackdropClick` exists, and
`useDismiss(open, onClose)` is called with no opt-out. So a `role="alertdialog"` that must offer
exactly one action cannot be built from it. D-19's re-auth is precisely that dialog: the admin's
auth fails closed, and a modal with a close control in the corner teaches Phase 2 the opposite.
**Fix:** a `closable?: boolean` (default `true`) that suppresses the header button, the Escape
handler and the backdrop path together — a partial opt-out is worse than none, because it looks
closed and is not.

### F-15-3 · `ConfirmDialog`'s panel has no stylesheet at all

There is no `.ds-atom-confirm-panel` rule in **any** file under `dist/css/`. The panel is one
inline style object with a hardcoded `background: "rgba(255,255,255,.97)"`, annotated in the
source as *"intentionally NOT the cream token — always-light (CONSTRAINT-010)"*, plus
`borderRadius: 14`, `padding: 22` and a literal box-shadow. Its danger tone is a 40px tile in
`var(--red)` over a hardcoded `rgba(239,68,68,.1)`. Nothing in the charcoal cascade reaches any
of it, and on charcoal light a near-white cool panel sits on a warm `#F4F1EA` page. Same family
as plan 13's F-13-6 (`FileInput` dropzone) — a component whose chrome is unreachable from CSS.
**Fix:** ship `confirmdialog.css` and move the panel and tone geometry into it.

### F-15-4 · `Badge` emits no class, and there is no `badge.css`

`Badge` renders `<span style="font-family:var(--mono);font-size:9.5px;padding:3px 8px;…">` with
**no `className` on the element at all**, and `ls dist/css/ | grep badge` returns nothing. A
consumer cannot select a Badge, cannot restyle one, and cannot raise its **hardcoded 9.5px**
type — on a component that appears on all seven admin screens, in the sidebar, in the topbar and
in every list. It also means a reflow or contrast audit has to select it by
`span:not([class])`, which is not a selector anyone should have to write.
**Fix:** give it `class="ds-atom-badge"` and a stylesheet, and put the size on the type scale.

### F-15-5 · D-45's three statuses are not distinguishable by fill

`S-projects` has to prove *"that D-45's three statuses are distinguishable at badge size."*
Measured in Chromium on the built page, charcoal light, page `#F4F1EA`, **with the alpha
composited over the page** — the raw channels give a number that is on no screen anywhere:

| status | tone | raw fill | composited | text | text-on-fill | fill vs page |
|---|---|---|---|---|---|---|
| Live | `success` | `rgba(34,197,94,.14)` | `rgb(215,235,214)` | `rgb(41,107,72)` | **5.08:1** | **1.11:1** |
| Maintained | `info` | `rgba(59,130,246,.12)` | `rgb(222,228,235)` | `rgb(30,58,138)` | 8.07:1 | **1.14:1** |
| Archived | `neutral` | `#FBF9F4` | `#FBF9F4` | `rgb(68,64,58)` | 9.78:1 | **1.07:1** |

Pairwise **fill** separation: **Live vs Maintained 1.02:1**, Live vs Archived 1.19:1,
Maintained vs Archived 1.22:1. All three badges are 19px tall at a hardcoded 9.5px.

So the claim holds **only because the words differ and their text colours differ**. As fills,
the three tones are the same colour, and all three are within 1.14:1 of the page — which is the
same failure plan 12 recorded for `pending` at 1.07:1, now measured across the whole light tone
set rather than one tone. A reader scanning a five-row list for archived projects gets no fill
signal at all. `Live`'s 5.08:1 also clears AA but not the 7:1 bar the charcoal contract holds
elsewhere, and at 9.5px the large-text allowance never applies.
**Fix:** raise the light-mode badge fill alphas so the tones separate from the page and from
each other, and put the badge type on the scale so 9.5px is not a literal.

### F-15-6 · `Tabs` server-renders the inactive panel with its children omitted

Measured before composing it:

```html
<div role="tabpanel" id="…-panel-case" aria-labelledby="…-tab-case"
     tabindex="0" hidden class="ds-atom-tabs-panel"></div>
```

The element is present; the content is not. So a static sketch that put the case-study half
behind the second tab would have shipped an empty box, plan 16 would have reviewed nothing and
plan 17 would have screenshotted nothing — and in production the same behaviour means no tab
panel but the first exists for a crawler or a no-JS reader. Plan 13's idiom rule 6 already
prescribes the answer for this shape (render both stacked, name each, say so in a comment), and
that is what the detail screen does. **Fix:** render all panels and hide the inactive ones, which
is what `hidden` is already there for.

### F-15-7 · `InlineEdit`, `NumberStepper` and `Checkbox` cannot meet the touch floor

Three more control-geometry targets, all measured, all in G-2 / DS-11 territory:

| control | measured | floor | instances |
|---|---|---|---|
| `.ds-atom-checkbox-label` | **22px** | 44px | 40 on `/admin/photos`, 4 on `/admin/resume`, 4 on `/admin/projects` |
| `.ds-atom-inlineedit` | **25px** | 44px | 7 on `/admin/site` |
| `.ds-atom-stepper-btn` | **24px** | 44px | 16 on `/admin/site` |
| `.ds-atom-stepper-input` | **30px** | 44px | 8 on `/admin/site` |

`InlineEdit`'s idle state is `<span role="button" tabindex="0">` with no height rule anywhere —
25px is its line box. A control whose entire interaction model is *"click the text"* is the one
that can least afford to be the size of the text on a touch device. `NumberStepper`'s two
buttons are `IconButton size="sm"`, hardcoded with no prop, which is plan 13's F-13-4 reaching a
second component: IconButton's three sizes are 24 / 32 / 40px, so its **largest** is still 4px
under the floor and no value of `size` would have helped even if the prop existed.

### F-15-8 (minor) · `InlineEdit`'s accessible name is the fixed string "Click to edit"

Seven rows on `/admin/site` announce the same three words, and none says *which* label is being
edited. There is no prop. **Fix:** an `ariaLabel` prop, as `NumberStepper` already has.

### Confirmed, not new · the amber leak reaches `Link`

`theme-charcoal.css` declares **zero** `--amber*` tokens (`grep -c amber` → `0`), so every
`Link variant="inline"` renders `color: var(--amber-d)`, which resolves in `tokens.css` to
`#b45309` on light and `#fbbf24` on dark. Every inline link on all four new screens is that
burnt orange rather than charcoal's ochre. Known upstream; not fixed locally.

---

## THE CHECKBOX FLOOR — A CORRECTION TO A RECORDED MEASUREMENT

Plan 13 reported `/admin/photos` as **"none under 44px"** at 344, 768 and 1024. It measured 40
checkbox targets at **22px**, and so did `/admin/resume`.

**Why it was missed, which is the reusable part.** `Checkbox` renders
`<input class="ds-atom-checkbox-input ds-visually-hidden">` clipped to 1px, with the painted box
and the hit area on the wrapping `<label>`. An audit that walks focusable elements measures the
**input** and gets 1px — so it either reports a failure nobody can act on, or excludes
visually-hidden elements and reports nothing at all. Both readings hide the real question.
`audit15.mjs` swaps the input's box for its label's and asks it.

`density-compact.css`'s own header already contains the number: *"its checkbox label is 22px."*
It was read there as the **row's** content floor — the 7px by which a compact row overshoots —
and the ROW was then given `height: 44px`, after which the row measured clean. **The label is not
the row.** Clicking a 44px row selects nothing; clicking the 22px label does.

Fixed in `density-compact.css` as a marked *PLAN 15 CORRECTION* block, alongside the `InlineEdit`
and `NumberStepper` floors. After it: `/admin/photos` 40 → 0 and `/admin/resume` 4 → 0.

---

## WHAT WAS BUILT

**Nine artefacts from four route files, and 30 routes:**

| Artefact | Route | Coverage |
|---|---|---|
| `S-projects` | `/admin/projects/` | designed |
| `E-projects` | `/admin/projects/empty/` | designed |
| `S-project-detail` | `/admin/projects/cairn/` (+4 sibling ids) | designed |
| `R-case-study-authoring` | `/admin/projects/cairn/phone/` | designed — a route with no coverage cell |
| `O-reauth-401` | `/admin/projects/cairn/reauth/` | designed — a route with no coverage cell |
| `T-error-network` | `/admin/projects/cairn/network/` | designed — **claimed here**, see deviations |
| `S-site` | `/admin/site/` | designed |
| `O-category-reassign` | `/admin/site/reassign/` | designed — a route with no coverage cell |
| `O-conflict-diff` | `/admin/conflict-diff/` | designed |
| `T-loading-list`, `T-error-inline`, `T-dirty-badge`, `T-success-published` | 18 state routes across 3 screens | inherits, pointer rendered |

**`/admin/projects`** — five real records as a `Card` list, each with its D-45 `Badge`, platform
`Chip`, card description, tech chips and a case-study summary (tier, sections, words), and no
input anywhere, because ADMIN-IA makes the list an entry point and puts editing on the detail
route. Statuses come from `00-COPY/one-liners.md`: **Cairn and Design System `Live`, hued,
Momentum and TimeShift `Maintained`** — *no project is `Archived`*, so the third tone is rendered
as a labelled swatch beside the list rather than pinned to a project that is not archived. No
year appears anywhere on the page (`grep -qE '20[0-9]{2}'` exits 1), per D-45.

**`/admin/projects/[id]`** — D-24's screen. The card half is the legacy field catalog verbatim
(`PropertiesPanel.tsx:499-577` — Title, Label, Description, Tech Stack, Link, Store Links,
Delete project) plus two fields justified by the data rather than the recovered list: the label
**icon**, which is stored on every record and had no editor, and **status**, which extends the
`badges` array that already carries `{label:"Live", …}` on Cairn today. The case-study half is
**1,695 words of real drafted prose across four sections**, taken from `00-COPY/case-cairn.md`,
because D-40's whole argument is that build phases must work against text lengths that exist.
Hero and screenshot `FileInput`s carry D-42's path in a comment. `grep -r 'projects.json' data/`
finds nothing — the migration is anticipated, not performed.

**`/admin/site`** — the screen no legacy `Selection` variant maps to, which ADMIN-IA records as
the mechanism by which the D-25 drift developed unnoticed. Seven canonical records with `id` and
`label` in **separately headed columns**, the id not editable and the label editable through
`InlineEdit`, `NumberStepper` for columns, and the real photo count per category as a `Badge`.
The legacy bridge is cited in a comment and its output is shown to be *correct on all seven
categories today* — which is exactly why nothing ever went visibly wrong.

**`/admin/conflict-diff`** — three conflicted files and one clean one, one resolved and two
outstanding, rendered simultaneously. Every quoted value is read out of the real committed JSON.

---

## DATA — COUNTED, NOT QUOTED

Every number below was computed by a throwaway generator this session and printed:

- **5 projects**, 8 badge objects, 14 tech chips between them; longest title `Design System`.
- **Case bodies:** cairn 1,695 words / 10,061 chars · design-system 1,654 / 9,969 · momentum 989
  / 5,828 · timeshift 814 / 4,844 · hued 799 / 4,950. Two `long`, three `short` (D-39). **62
  `[source: …]` provenance spans stripped** — they are audit annotation, not body copy.
- **39 photos across 7 categories**: architecture 14, nature 8, wildlife 5, abstract 4, street 4,
  portraits 2, product 2. `site_config.json` is **176 bytes**.
- **`categoryColumns` has EIGHT keys for SEVEN categories.** The eighth is `All`, which is not a
  category — no photo is stored against it, it cannot be deleted and it cannot be reassigned out
  of. It is the column count for the unfiltered gallery, so the screen edits it outside the record
  table rather than as an eighth row, which would have made it deletable with a photo count of 0.
- **The delete dialog quotes 14, not 12.** UI-SPEC's contract table illustrates the copy with
  *"12 photos use it"*; Architecture really has fourteen. A dialog whose entire job is to state
  the blast radius may not state it from an example.

---

## THE THREE SECURITY-SHAPED SCREENS

**`O-reauth-401`** — the whole populated screen stays rendered behind the backdrop, so 1,695
words of unsaved draft are visibly still there; the only action is `Sign in`; and nothing on the
surface holds a token, a session value or a form field. Asserted by case-insensitive grep over
the entire route file: **none of `dismiss`, `continue offline`, `skip`, `not now`, `maybe later`,
`bypass` appears anywhere in it.**

**`O-category-reassign`** — the destination `Select` is *inside* the confirm rather than a step
after it, listing the other six real categories with their real counts. There is no bare confirm
and no escape; `delete anyway|delete without|just delete` asserted absent.

**`O-conflict-diff`** — per file, never global; overwrite names what it drops, verbatim; and one
file is already resolved while two are outstanding, on the same screen, at the same time.

---

## VERIFICATION — measured, in a browser where it matters

```
astro build                    77 pages, 30 of them new
check-no-js.sh                 PASS  51 static routes at zero JS; 26 island routes verified hydrating
check-states.mjs               PASS  49 state pages across 7 screens, markers unique within each
check-no-ivory.sh              PASS
check-theme-exhaustive.mjs     PASS
check-font-names.mjs           PASS
check-contrast.mjs             PASS
check-css-size.mjs             PASS
check-bundle.mjs               EXIT 1 — BY DESIGN, this is G-15
```

**Built output.** All four new route files carry **0** `client:` directives and every new page
ships **0 `<script>` tags**. `0` occurrences of `[object Object]`. `0` standalone em dashes used
as a value on any of the four screens (the 42 present are prose punctuation). `data/` is
untouched — `git status --short data/` is empty.

**Touch floor, measured in Chromium 147** on the built `dist/` at all six device classes from
`00-RESPONSIVE-CONTRACT.md`. The audit walks every focusable box and, for a visually-hidden
input, measures its label instead:

| Route | 344 | 390 | 673 | 768 | 1024 | 1440 (fine) |
|---|---|---|---|---|---|---|
| `/admin/projects/` | **0** | 0 | 0 | 0 | 0 | 40 (compact, by design) |
| `/admin/projects/cairn/` | **0** | 0 | 0 | 0 | 0 | 44 |
| `/admin/projects/cairn/phone/` (comfortable) | **0** | 0 | 0 | 0 | 0 | 36 |
| `/admin/projects/cairn/reauth/` | **0** | 0 | 0 | 0 | 0 | 45 |
| `/admin/projects/cairn/network/` | **0** | 0 | 0 | 0 | 0 | — |
| `/admin/site/` | **0** | 0 | 0 | 0 | 0 | 57 |
| `/admin/site/reassign/` | **0** | 0 | 0 | 0 | 0 | 60 |
| `/admin/conflict-diff/` | **0** | 0 | 0 | 0 | 0 | 24 |

No horizontal page scroll at any width on any route. The phone refusal route correctly reports
`data-density="comfortable"` while the other seven report `compact`.

**Two floor failures the audit caught that no grep could have.** A `Link` written inside a
sentence on the detail screen measured **16px at all five coarse classes** — the identical
failure plan 14 found on the résumé's PDF link — and was pulled out into its own row, so the
floor holds with no WCAG 2.5.8 "in a sentence" exception claimed. And a coarse-pointer rule for
`.ds-atom-inlineedit` written in the site route's own `<style>` block **measured no change at
all**, which is how F-15-7's placement was found: Astro stamps its scoping attribute onto
elements in the Astro template and passes it as a *prop* to a framework component, so a
component with a fixed prop list never receives it and a scoped rule cannot reach inside it.
Plan 13 records this as an *island* rule; it is broader — **hydration is irrelevant, what matters
is that a framework component renders its own DOM.**

**Reflow, never hide (R-6), counted at 344px against 1440px** — not inspected, counted:

```
/admin/projects/          5 cards · 5 status badges · 14 tech chips · 3 swatches   identical at both
/admin/projects/cairn/    6 card fields · 1 store-link row · 4 case sections · 26 paragraphs · 2 asset panels
/admin/site/              7 category rows · 7 id cells · 8 steppers · 7 inline edits · 7 delete links
/admin/site/reassign/     1 dialog · 1 destination select
/admin/conflict-diff/     3 file cards · 9 diff rows · 9 remote cells · 9 local cells · 1 clean row
```

Nothing is dropped. The one deliberate absence is the case-study half on the phone refusal route,
which is the refusal doing what its copy says.

**Negative control for the changed gate.** `check-states.mjs` gained three `SCREENS` entries.
Control: `const state = Astro.params.state ?? "populated"` replaced with a constant on **all
three** new route files. `astro build` **still succeeded** — which is the silent collapse the
gate exists to catch — and the gate **failed, exit 1**, naming the screen:
`check-states: FAILURE MODE on "projects" — a state variant is not the state it claims to be`,
listing the populated marker leaking onto all six sibling pages and six markers absent from their
own. All three files were then restored and re-hashed:

```
projects        18ead2e9ad186f43c675328f845c30326d96623731a935c879c0a12360110909   before and after
project-detail  6611b38885a4478db5795a118f64ea4d54645dc25b2bdf3a7d23b8797c472962   before and after
site            f7e60b1219de3acb48684df3c4ed801bc54127878bef4d196b4934444a262c20   before and after
```

and `check-states.mjs` exits 0 again.

**Three gate bites during execution, all real, all fixed.** The build failed with
`PINNED is not defined` — Astro hoists imports and top-level **exports** into module scope and
leaves everything else inside the component factory, so `getStaticPaths` cannot see a plain
`const`. `check-states` failed on `project-detail` because its head block carried one constant
sentence for all seven states, so five markers were absent from their own pages. And the contact
sheet threw on the first `n/a` coverage cell.

---

## DEVIATIONS FROM PLAN

**1. [Plan correction] The route files are `<screen>/[...state].astro`, not `<screen>.astro`.**
Same correction plans 13 and 14 made, for the same reason: `?state=` cannot work under
`output: 'static'`. The plan's `structural_note` still says *"`?state=` is served by `astro dev`"*
— it is not, and plan 12 measured it. The acceptance greps naming the flat paths were run against
the real ones.

**2. [Plan correction] `R-case-study-authoring` is a route segment, not `?layout=phone`.**
Identical to plan 14's deviation 2. It is an extra `getStaticPaths` entry on the same file, so no
second file was added, and it is deliberately absent from `STATES` — a layout posture is not a
point in the draft lifecycle.

**3. [Rule 3 — blocking] The conflict diff is at `/admin/conflict-diff/`, not `/admin/conflict/`.**
The plan's path **collides**: `src/pages/admin/[...state].astro` already emits `/admin/conflict/`
as the dashboard's own conflict state, so a file there would have overwritten
`dist/admin/conflict/index.html` and `check-states` would have reported the collision as a
*rendering fault on the dashboard* rather than as a route collision — the hardest possible way to
diagnose it. The URL is now the artefact id, which is also the better name: seven screens declare
`ref: "O-conflict-diff"` and this is where the ref resolves.

**4. [Rule 3 — blocking] `src/pages/index.astro` learned the third coverage value.**
UI-SPEC and ADMIN-IA both specify every cell as one of `designed`, `inherits: T-n` or
`n/a: <reason>`. Plan 12's contact sheet was written before any screen needed the third and
validated every cell as if it carried a ref, so it threw on `/admin/site`'s two `n/a` cells. The
guard was **narrowed rather than widened**: an `n/a` cell carries no ref and MUST carry a reason
of at least twelve characters, so `n/a` cannot be used to make an undesigned cell look decided.
A blank cell still fails review; so, now, does a reasonless one.

**5. [Rule 2 — missing critical functionality] Three control floors added to `density-compact.css`.**
The 44px floor is a binding responsive-contract requirement. `Checkbox` (22px), `InlineEdit`
(25px) and `NumberStepper` (24 / 30px) were all under it at every coarse-pointer class. Fixed in
the sanctioned local prototype that names its upstream owner and dies with the playground —
plan 13's deviation 1 set exactly this precedent for table rows and the pager. As a side effect
it clears 44 pre-existing offenders on `/admin/photos` and `/admin/resume`.

**6. [Scope, deliberate] `T-error-network` is claimed here, and the plan does not ask for it.**
UI-SPEC's contract table carries ONE row for *"Error — network / 401 (D-19)"*, so the transport
failure and the expired session are one decision with two faces. No screen in plans 12-14 claimed
the treatment and no later plan sketches admin screens, so it would have been a `T-` artefact with
no host at all. It is at its own URL with no `STATES` row, exactly like the two refusals.

**7. [Scope, deliberate] `src/fixtures/project-detail.json` is a file the plan does not name.**
The detail screen is a distinct `CANONICAL_SCREENS` member with its own seven states and its own
markers; sharing `projects.json` would have forced both screens to render the same per-state copy.
Same shape of addition as plan 14's `SortableStatic.tsx`.

**8. [Scope, deliberate] The detail screen's state axis is pinned to `cairn`.**
`getStaticPaths` returns all five real ids at their base path — all five build — but emits the six
state routes and the three variant routes for one id. Five ids × six states is thirty
near-identical routes for no additional evidence.

**9. [Design decision] The projects list is a `Card` list and the `DataGrid` alternative is
rendered beside it as evidence.** UI-SPEC offers either. Plan 13's F-13-2 means `DataGrid`'s only
Badge path is a closed job-application tone map, so all three D-45 values collapse to one tone
inside it and the second half of `S-projects`' claim would be unprovable. A three-row `DataGrid`
renders that collapse next to the swatch row where the same three values carry three tones.

**10. [Idiom refinement] The category table is app layout CSS, not `Table`/`DataGrid`.**
UI-SPEC names either. Neither can hold this screen: `DataGrid` stringifies every cell, so
`InlineEdit` and `NumberStepper` — the two controls UI-SPEC's own mapping names for this very
row — would both render as `[object Object]`. QUAL-03 permits layout CSS; F-13-2's proposed
`render?: (row) => ReactNode` is what would let it be the component instead.

**11. [Noted] `AlertBanner`'s close-control prop is not written on the detail route, and neither
is its name.** The prop defaults to the truthiness of its callback and no callback is passed, so
the banner already has no close control — but this plan's acceptance asserts, by case-insensitive
grep over the whole file, that the 401 surface offers re-authentication and nothing else, and a
grep cannot tell a prop name from an affordance. Weakening the assertion to accommodate four
characters would have weakened the only automated guard on a fail-closed security screen. Worth
knowing about: the same assertion will trip on the same component again.

No architectural changes were needed; no Rule 4 checkpoint was raised.

---

## TWO BOOKKEEPING PROBLEMS PLAN 16 MUST RULE ON

**1. `T-error-publish` is inherited by the dashboard but designed nowhere.** The dashboard's
`error` cell reads `{ state: "error", coverage: "inherits", ref: "T-error-publish" }`, and a
repo-wide grep finds no screen that declares it `designed`. An `inherits` pointing at an artefact
nobody built is a covered-looking cell that is not covered — the exact failure the contact
sheet's ref guard exists to catch, and it slips through because the ref *is* a canonical id.
Plan 16 should either give it a host or record it as a known absence. `T-ready-badge` is designed
on the dashboard and is fine.

**2. Seven `O-` artefacts are dialogs or sheets and none of them can be composed.** See F-15-1.
`O-publish-valid`, `O-publish-invalid`, `O-discard-screen`, `O-discard-all` and `O-phone-sidebar`
are still unbuilt and would each hit the same wall. If plan 16's coverage review expects them, it
needs to know that the path is a local prototype of `modal.css`'s classes rather than the
component — the shape this plan used twice.

---

## Deferred Issues

One out-of-scope discovery, logged to
`.planning/phases/00-design-ideation/deferred-items.md` rather than fixed:

- **D-15-1** — `/admin/` renders three `<a class="adm-group-link">` at **23px** at every
  coarse-pointer class. The class is plan 12's, in plan 12's route file, and nothing in this plan
  reaches it. Not a regression: it has measured 23px since plan 12, and this is simply the first
  pass to walk every focusable box on that route in a browser.

---

## Known Stubs

None that block the plan's goal. Every `TextInput`, `Textarea`, `Select`, `InlineEdit` and
`NumberStepper` is uncontrolled; the two `FileInput`s accept a file and do nothing; `Add a
category`, `Add section`, `Add Link`, `Delete project`, `Sign in`, `Retry save`, `Reload remote`
and `Overwrite` are all inert; the `Delete…` link on a category row navigates to the reassignment
route rather than deleting anything. All of these are the D-02 scope fence working as specified,
each stated in a comment at its site, and Phase 7 owns the wiring. `.playground/` is deleted in
plan 17.

Asserted absent from all four route files: `grep -qiE 'fetch\(|localStorage|sessionStorage'`
exits 1.

---

## Threat Flags

None. No network endpoint, no storage, no credential, no upload target and no auth path was
added. The three trust boundaries this plan's threat model registers were all honoured and each
is asserted rather than claimed: `O-reauth-401` depicts deny-and-re-authenticate with six bypass
phrasings grepped absent (T-00-03); the conflict screen is per file with a global toggle grepped
absent and overwrite naming what it drops (T-00-36, T-00-37); the reassignment dialog quotes the
real count with no escape from choosing a destination (T-00-38); fixtures derive only from
committed public content and drafted publication copy (T-00-29); zero `client:` directives
(T-00-23); and `data/` is asserted unchanged with no migration performed (T-00-06).

---

## Self-Check: PASSED

- `.planning/phases/00-design-ideation/00-15-SUMMARY.md` — FOUND
- `.planning/phases/00-design-ideation/deferred-items.md` — FOUND
- `.playground/src/pages/admin/projects/[...state].astro` — FOUND (gitignored)
- `.playground/src/pages/admin/projects/[id]/[...state].astro` — FOUND (gitignored)
- `.playground/src/pages/admin/site/[...state].astro` — FOUND (gitignored)
- `.playground/src/pages/admin/conflict-diff.astro` — FOUND (gitignored)
- `.playground/src/fixtures/{projects,project-detail,site,conflict}.json` — FOUND (gitignored)
- `dist/admin/projects/index.html` + 6 state routes — FOUND
- `dist/admin/projects/{cairn,hued,momentum,timeshift,design-system}/index.html` — all 5 FOUND
- `dist/admin/projects/cairn/{empty,loading,error,dirty,conflict,success,phone,reauth,network}/index.html` — FOUND
- `dist/admin/site/index.html` + 6 state routes + `/reassign/` — FOUND
- `dist/admin/conflict-diff/index.html` — FOUND
- Playground work is gitignored by design (`.gitignore:38`), so tasks 1, 2 and 3 produce no
  commits, exactly as plans 01, 04, 07, 09, 10, 12, 13 and 14 did. The single commit for this
  plan is this SUMMARY plus `deferred-items.md`.
