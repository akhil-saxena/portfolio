---
phase: 0
slug: design-ideation
consumers: [phase-7]
---

# Admin CMS — Information Architecture

**The table is the artefact; the sketches illustrate it.** RESEARCH.md's Architectural
Responsibility Map is explicit that a 39-control, 13-variant field catalog is unreviewable as
pictures. This document is what plans 12–16 sketch *against*, and what Phase 7 ports *from*.
It is the half of DSGN-01 that survives `.playground/`'s deletion at phase exit (D-02).

Everything here composes `@akhil-saxena/design-system`. Where the design system cannot carry
a surface, the gap is named by its `00-FINDINGS.md` ID and stops there — a gap is a finding,
never a workaround (Core Value). No bespoke substitute is proposed anywhere in this document.

---

## Routes

Seven routes, one entity each. D-05 names six; the seventh — `/admin/projects/[id]` — is
implied by D-24 ("a project owns its case study") but absent from D-05's list, and is written
down here so it stops being implied.

| Route | Entity | Source data | What the screen is for |
|-------|--------|-------------|------------------------|
| `/admin` | the pending set | D1 draft rows (D-10) | Pending changes grouped by entity, photos mid-pipeline, last publish time, and Publish. **Its empty state is a first-class screen** (D-06) — "nothing pending" is the state this screen is in most of the time. |
| `/admin/home` | `home_config.json` | `title`, `subtitle`, `intro`, 6 `peekIds`, `peekPositions` (1 of 6 set), 3 `socialLinks`, 2 `ctas` | Edit the two-act Home's identity block and choose which six photos peek. Hosts the focal-point crop picker (D-23). |
| `/admin/photos` | `portfolio_images.json` | 39 photos, 7 categories, `order` + the new per-category order (D-22) | Upload, retitle, recategorise and reorder the gallery. Two views: list for metadata, grid for order. |
| `/admin/resume` | `resume.json` | 3 experience entries (11 / 3 / 4 bullets), 3 skill groups, 1 education entry | Edit the résumé's structured content and replace the hand-maintained PDF (D-26 drift warning). |
| `/admin/projects` | new `projects.json` (D-24) | 5 projects × `{id, title, label, description, tech, icon, href, badges}` | List the five projects with their status badge. Entry point to the detail screen; no editing here. |
| `/admin/projects/[id]` | one project **plus its case study** | the project record + case-study body, hero and inline screenshots | The seventh screen. Edits card fields and case-study prose together, matching the visitor path Work → project → case study. |
| `/admin/site` | `site_config.json` | canonical category records (D-25) | Edit the category id / label / column count triples, and the reassignment path that rename and delete require. |

**This replaces the legacy three-tab model** (`home` / `photography` / `dev`), a tab switcher
in `AdminTopBar.tsx` driving one giant stateful `admin/page.tsx`. That model **had no home for
case studies at all** — the `dev` tab edited the project *card* and nothing behind it, which
is precisely the void D-24 fills and the reason the seventh route exists.

**The form gets the whole content column.** D-07 chose a preview that toggles to full width
rather than a split pane, so no route below reserves horizontal space for a preview. That is
what makes `/admin/resume` viable: three experience entries with 11, 3 and 4 bullets, three
skill groups and an education entry do not fit beside a live preview at any useful width. The
preview follows the admin's current mode, so a nested-dark case never occurs.

### Design-system composition per route

Taken from `00-UI-SPEC.md` §Component Mapping — not re-derived here. Where the mapping is
known-broken, the `00-FINDINGS.md` gap ID is named and the route stops at the gap.

| Route | Primary DS composition | Gap |
|-------|------------------------|-----|
| `/admin` | `AppShell` · `Card` per entity group · `Badge` (draft / ready) · `RelativeTime` (last publish) · `Button` "Publish changes" · `EmptyState` · `ProgressBar` (photos mid-pipeline) | **G-5** (`StatusPill` stages are job-domain-locked), **G-8** (`AppShell` has no banner slot for the pipeline strip) |
| `/admin/home` | `Field` + `TextInput` + `Textarea` · `Sortable` (peek order) · `Select` (CTA style) · focal-point crop picker | **G-1** (no crop picker exists in the design system) |
| `/admin/photos` | `DataGrid` (list view) · `Sortable` / `SortableItem` + `onReorder` (grid view, D-22) · `FileInput variant="dropzone"` · `Chip` (category filter) · `Badge` (per-photo pipeline state) · `EmptyState` | **G-5**, **G-13** (`Sortable` moves by keyboard but announces nothing) |
| `/admin/resume` | `Field` set · `RichText` bullets (D-21) · `Sortable` (bullet order) · `FileInput variant="button"` (PDF, D-26) · `AlertBanner tone="warning"` (PDF drift) | **G-3** (`RichText` marks cannot be restricted), **G-4** (`RichText` has no segment output) |
| `/admin/projects` | `DataGrid` or `Card` list · `Badge` (Live / Maintained / Archived, D-45) · `EmptyState` | **G-5** |
| `/admin/projects/[id]` | `Field` set (card fields) · `RichText` (case-study body) · `FileInput` (hero + screenshots, D-42) · `Tabs` (card ⇄ case study) | **G-3**, **G-4** |
| `/admin/site` | `Table` or `DataGrid` · `InlineEdit` (label) · `NumberStepper` (column count) · `ConfirmDialog` + `Select` (delete-with-reassignment) | — |

The cross-cutting surfaces that are not routes but are unavoidably screens carry two more
gaps: **G-6** (`FormErrorSummary` takes `errors: string[]` with no anchor, so D-18's
deep-link from the publish-block summary to the offending screen is impossible as shipped)
and **G-7** (D-16's per-file conflict diff — *"the most substantial single screen in the
admin"* — has zero design-system coverage). Both are recorded, neither is worked around.

---

## Field catalog

### The thirteen `Selection` variants, each with a destination

The legacy `PropertiesPanel.tsx` is 937 lines and switches on a 13-variant tagged union. Every
variant is mapped below, so none is orphaned by the route split.

| `Selection` variant | Legacy panel title | New route | Note |
|---------------------|--------------------|-----------|------|
| `none` | Actions | `/admin` | The legacy "Actions" rail was tab-conditional — three different bodies behind one variant. It dissolves into the dashboard (D-06) plus per-route toolbars. |
| `photo` | Photo | `/admin/photos` | Includes the EXIF sub-form (below). |
| `role` | Experience | `/admin/resume` | Company / Role / Location / Period / URL + Bullets. |
| `project` | Project | `/admin/projects/[id]` | The list at `/admin/projects` opens it; editing happens on the detail route. |
| `skillGroup` | Skill Group | `/admin/resume` | |
| `education` | Education | `/admin/resume` | |
| `homeTitle` | Site Title | `/admin/home` | |
| `homeSubtitle` | Tagline | `/admin/home` | |
| `homeIntro` | Intro Text | `/admin/home` | |
| `homeGallery` | Gallery Photo *N* | `/admin/home` | Carries "Position (drag to adjust)" — the G-1 surface. |
| `homeSocial` | Social Links | `/admin/home` | |
| `homeCta` | Button | `/admin/home` | |
| `resume` | Resume | `/admin/resume` | PDF download link + Upload New Resume. |

**No variant maps to `/admin/site`.** That is the finding, not an omission: `site_config.json`
had no editor at all in the legacy admin — its `categoryColumns` map was hand-edited in the
repo. D-25 gives it a screen for the first time, which is also why the drift below was free to
develop unnoticed.

### Completeness check — the legacy control counts

`PropertiesPanel.tsx` renders **33 `<input>` + 4 `<select>` + 2 `<textarea>` = 39 form
controls**, and **34 `<button>`**. Those two numbers are the port's completeness test: the
seven routes together must account for all **39** controls, and the **34** buttons are the
inventory of actions the admin can take. A route set that lands at 30 controls has silently
dropped something.

### Every recovered field label, with a home

Labels transcribed verbatim from the legacy panel. "DS composition target" is the design
system pairing, not a component that has been verified to fit — where it is known not to fit,
the gap ID is named.

| Field label | Legacy variant | Route | DS composition target |
|-------------|----------------|-------|-----------------------|
| Site Title | `homeTitle` | `/admin/home` | `Field` + `TextInput` |
| Tagline | `homeSubtitle` | `/admin/home` | `Field` + `TextInput` |
| Subtitle | `homeSubtitle` | `/admin/home` | `Field` + `TextInput` (the field inside the Tagline panel) |
| Intro Text | `homeIntro` | `/admin/home` | section heading |
| Introduction | `homeIntro` | `/admin/home` | `Field` + `Textarea` |
| Social Links | `homeSocial` | `/admin/home` | repeated row group; `Sortable` if order becomes editable |
| Icon | `homeSocial` | `/admin/home` | `Field` + `Select` (fixed icon set) |
| URL | `homeSocial`, `role` | `/admin/home`, `/admin/resume` | `Field` + `TextInput` |
| Button — Text | `homeCta` | `/admin/home` | `Field` + `TextInput` |
| Button — Link URL | `homeCta` | `/admin/home` | `Field` + `TextInput` |
| Button — Style | `homeCta` | `/admin/home` | `Field` + `Select` (primary / secondary) |
| Add Photo to Gallery | `none` (home tab) | `/admin/home` | `Modal` + `Card` grid picker |
| Replace with | `homeGallery` | `/admin/home` | `Modal` + `Card` grid picker |
| Photo — Title | `photo` | `/admin/photos` | `Field` + `TextInput` |
| Photo — Category | `photo` | `/admin/photos` | `Field` + `Select`, sourced from the canonical category records (D-25) |
| Photo — Tags | `photo` | `/admin/photos` | **dropped** — see below |
| Photo — Order | `photo` | `/admin/photos` | `Sortable` / `SortableItem` + `onReorder`; **G-13** |
| Photo — Position | `homeGallery` | `/admin/home` | focal-point crop picker; **G-1** |
| Camera | `photo` (EXIF) | `/admin/photos` | `Field` + `TextInput` |
| Lens | `photo` (EXIF) | `/admin/photos` | `Field` + `TextInput` |
| Aperture | `photo` (EXIF) | `/admin/photos` | `Field` + `TextInput` |
| Shutter | `photo` (EXIF) | `/admin/photos` | `Field` + `TextInput` |
| ISO | `photo` (EXIF) | `/admin/photos` | `Field` + `TextInput` (numeric in the manifest) |
| Focal Length | `photo` (EXIF) | `/admin/photos` | `Field` + `TextInput` |
| Company | `role` | `/admin/resume` | `Field` + `TextInput` |
| Role | `role` | `/admin/resume` | `Field` + `TextInput` |
| Period | `role`, `education` | `/admin/resume` | `Field` + `TextInput` — **see schema decision 5** |
| Location | `role` | `/admin/resume` | `Field` + `TextInput` |
| Bullets | `role` | `/admin/resume` | `RichText` (bold-only, D-21) + `Sortable`; **G-3, G-4, G-13** |
| Project — Name | `project` | `/admin/projects/[id]` | `Field` + `TextInput` |
| Project — Label | `project` | `/admin/projects/[id]` | `Field` + `TextInput` (+ icon `Select`) |
| Project — Description | `project` | `/admin/projects/[id]` | `Field` + `Textarea` |
| Project — Tech Stack | `project` | `/admin/projects/[id]` | `Chip` set with an add-on-Enter input |
| Project — Link | `project` | `/admin/projects/[id]` | `Field` + `TextInput` |
| Project — Store Links | `project` | `/admin/projects/[id]` | repeated `Select` + `TextInput` rows; becomes D-45's status `Badge` set |
| Skill Group | `skillGroup` | `/admin/resume` | `Field` + `TextInput` |
| Skills | `skillGroup` | `/admin/resume` | `Chip` set with an add-on-Enter input |
| School | `education` | `/admin/resume` | `Field` + `TextInput` |
| Degree | `education` | `/admin/resume` | `Field` + `TextInput` |
| CGPA | `education` | `/admin/resume` | `Field` + `TextInput` |
| Leadership | `education` | `/admin/resume` | `Chip` set with an add-on-Enter input |
| Resume PDF | `none` (dev tab), `resume` | `/admin/resume` | current-file link + `AlertBanner tone="warning"` on drift (D-26) |
| Upload New Resume | `resume` | `/admin/resume` | `FileInput variant="button"` |
| Actions | `none` | `/admin` + per-route toolbars | dissolved; see the variant table above |

**Two labels differ between the recovered list and the rendered source, verified this
session.** The project title field renders as `Title`, not `Name`; the CTA link field renders
as `Link`, not `Link URL`. Both are recorded so the port does not chase a label that was never
on screen.

**`Photo — Tags` is dropped on purpose, not lost.** PROJECT.md lists it under Out of Scope and
the manifest confirms why: **0 of 39 photos carry a tag**. It is named here so the drop is a
decision with evidence attached rather than a field that quietly failed to appear in a
wireframe.

### The EXIF sub-form — six fields, and an omission rule

Camera, Lens, Aperture, Shutter, ISO, Focal Length are one collapsible group behind an
"Edit EXIF Data" disclosure, exactly as the legacy panel had them.

**Missing fields are OMITTED ENTIRELY — never rendered as an em dash.** A `—` beside `f/11`
reads as a data bug, not as an absence. The gaps are field-level, not photo-level, and the
manifest proves both shapes exist:

- **`product-peppers`** carries no EXIF at all — the whole group is absent.
- **`architecture-redbuilding`** has **camera only** — one field present, five absent.

The admin editor must therefore render an empty EXIF field as empty and editable, while the
public lightbox renders nothing at all for it. Same data, two different treatments, and the
rule has to be written down or the public page will grow a row of em dashes.

---

## Schema decisions this IA forces

Five schema questions become unavoidable once the seven routes exist. Each is **resolved in
writing below with a chosen shape** — none is left as a Phase 3 or Phase 7 discovery, because
"we will find out when we get there" is the failure mode this section exists to prevent.

1. `projects` extracted from `resume.json` into `projects.json` (D-24)
2. Résumé bullets become structured segments (D-20)
3. A per-category photo order field (D-22)
4. Canonical category records (D-25)
5. The résumé date-shape drift — `startMonth`/`startYear`/… versus a single `period` string

---

## What is deliberately not ported

### Seven dead legacy admin components — no wireframe may be drawn from any of them

Verified by `git grep` across `legacy/nextjs-portfolio`: **zero import sites** outside their
own definitions.

- `PhotoGrid.tsx`
- `PhotoEditModal.tsx`
- `PreviewPanel.tsx`
- `ExperienceEditor.tsx`
- `EducationEditor.tsx`
- `ProjectEditor.tsx`
- `SkillsEditor.tsx`

(`PreviewPanel` appears once more, in a comment at `src/app/admin/page.tsx:158`.) They are a
superseded grid + modal + split-preview design that the inline WYSIWYG replaced. Sketching
from them would reconstruct an editor the legacy app itself abandoned.

**The detail worth keeping.** The dead `PreviewPanel` was a **split** preview. D-07
independently chose a **full-width toggle**. The legacy code already tried the split pane and
dropped it — which turns D-07 from a preference into a decision with a precedent behind it.

### The five wired components are the only admin analogs

`PropertiesPanel.tsx` (937 lines, the field catalog), `DraggableMasonry.tsx`,
`PhotoUploadZone.tsx`, `AdminTopBar.tsx`, `DeployButton.tsx`.

Two of them are analogs for what to *fix*, not what to copy:

- **`DeployButton.tsx`** detects change by `JSON.stringify(current) !== JSON.stringify(initial)`
  per file, and sends `baseSha: "latest"` — which disables the optimistic-concurrency guard
  that `/api/deploy` implements. D-10's server-side draft row, storing the blob SHA it was
  based on *at save time*, is the root-cause fix; the conflict screen (D-16) is where a real
  409 surfaces.
- **`PropertiesPanel.tsx`** already implements a focal-point control ("Position (drag to
  adjust)") as a mouse-drag pan with an inverted delta and a clamped `objectPosition`. It is
  mouse-only, keyboard-inaccessible and touch-unaware — useful twice: as the interaction
  precedent for D-23, and as the evidence that D-09's desktop-only refusal is honest rather
  than a cop-out.

The WYSIWYG shell around `PropertiesPanel` is discarded (PROJECT.md, Out of Scope). The field
inventory it represents is not — that inventory is this document.
