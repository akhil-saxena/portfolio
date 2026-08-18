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
| Photo — Alt text | `photo` | `/admin/photos` | `Field` + `TextInput`, hint copy: *"Describe what is in the frame. Not a copy of the title, and do not open with 'Image of'."* — **required**; see schema decision 6 |
| Photo — Category | `photo` | `/admin/photos` | `Field` + `Select`, sourced from the canonical category records (D-25) |
| Photo — Place | `photo` | `/admin/photos` | `Field` + `TextInput` — **manual free text, never derived**; see schema decision 6 |
| Photo — Description | `photo` | `/admin/photos` | `Field` + `Textarea` — renders in the lightbox only; see schema decision 7 |
| Photo — Tags | `photo` | `/admin/photos` | `Chip` set with an add-on-Enter input — **revived**, see below |
| Photo — Order | `photo` | `/admin/photos` | `Sortable` / `SortableItem` + `onReorder`; **G-13** |
| Photo — Position | `homeGallery`, `photo` | `/admin/home`, `/admin/photos` | focal-point crop picker; **G-1** — now per-photo across all 39, not six peek slots; see schema decision 6 |
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

**`Photo — Tags` was dropped on evidence, and is revived by direction.** The evidence has not
changed and is not being retracted: PROJECT.md listed the field under Out of Scope, and the
manifest still confirms why — **0 of 39 photos carry a tag** (re-counted against
`data/portfolio_images.json` this session, not read from this document). That drop was a
decision with evidence attached rather than a field that quietly failed to appear in a
wireframe, and the record should keep showing it that way.

**What changed is direction, not the measurement.** The user asked for tags back, so the field
returns as a `Chip` set with an add-on-Enter input — the same treatment `Project — Tech Stack`
and `Skills` already carry, so the admin gains no new interaction idiom for it. The reasoning
that produced the drop was sound on the evidence available; the input that overrides it is the
owner of the content saying he wants to tag photographs.

**The 39 empty arrays are now a content task, not an argument for dropping the field.** An
empty array on every record was read as "nobody uses this"; with the field revived it reads as
"nobody has filled this in yet", and it is tracked as exactly that in
`00-PHOTO-CONTENT.md` alongside the alt text. `tags` stays **optional** per photo — unlike
`alt` — so an untagged photo is a complete record, not an incomplete one.

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

Seven schema questions become unavoidable once the seven routes exist. Each is **resolved in
writing below with a chosen shape** — none is left as a Phase 3 or Phase 7 discovery, because
"we will find out when we get there" is the failure mode this section exists to prevent.

1. `projects` extracted from `resume.json` into `projects.json` (D-24)
2. Résumé bullets become structured segments (D-20)
3. A per-category photo order field (D-22)
4. Canonical category records (D-25)
5. The résumé date-shape drift — `startMonth`/`startYear`/… versus a single `period` string
6. The four new photo fields — `place`, `description`, `alt`, `focalPoint` — and the revived `tags`
7. Where `description` renders on the public site

### 1. `projects` moves out of `resume.json` into `projects.json` (D-24)

**Chosen shape.** A top-level `projects.json` array, each record carrying
`id, title, label, description, tech, icon, href, badges`. `resume.json` keeps `experience`,
`skills` and `education` and loses its `projects` key.

**Reason.** A project owns its case study, and a case-study body has no business living inside
the résumé document. The split is what makes `/admin/projects/[id]` a route rather than a
modal bolted onto the résumé screen.

`badges` is **already an array of objects** — Cairn carries
`{label: "Live", href: "https://cairn.co.in", icon: "arrow-up-right"}` today, and the other
four carry store and GitHub links in the same shape. D-45 extends that field to the
Live / Maintained / Archived status set, so the status work is an extension of an existing
array, not a new column. Nothing about the migration is speculative: five records move
verbatim.

### 2. Résumé bullets become structured segments (D-20)

**Chosen shape.** A bullet is an array of segments — `{text}` for plain runs and
`{text, emphasis: true}` for emphasised runs — rendered as React elements.

**Reason.** **No HTML string exists anywhere in the shape.** The legacy stored-XSS class
(`Timeline.tsx:48` plus three admin components rendering bullets through
`dangerouslySetInnerHTML` with no sanitiser in the repo) is *designed out* rather than
filtered. A filter can be bypassed or forgotten; a shape that cannot express markup cannot
carry an injection.

**The migration is narrow, and measured.** Scanning all 18 bullets across the three experience
entries, the only markup present is `<strong>` / `</strong>` — no anchors, no italics, no
spans. So the converter has exactly one tag to handle and the emphasis flag is the only mark
the shape needs.

This is why **G-3** and **G-4** are load-bearing rather than cosmetic: `RichText` cannot
restrict its marks (⌘I / ⌘U / ⌘K stay live regardless of the toolbar) and cannot emit
segments (`outputFormat` is `"html" | "json"`). A bold-only segment serializer over today's
`RichText` would silently drop an italic run on save — data loss, not a styling miss. Both are
findings against the design system; neither is worked around here.

### 3. A per-category photo order field (D-22)

**Chosen shape.** Photos keep the existing global `order` integer and gain a second
per-category order field. The per-category value **wins when a category filter is active**;
the global value governs the unfiltered gallery and the Home peek strip.

**Reason.** One ordering cannot serve both views. The 39 photos are unevenly distributed —
architecture 14, nature 8, wildlife 5, abstract 4, street 4, portraits 2, product 2 — so a
global order that reads well end-to-end scatters each category's best frames arbitrarily
within its own filtered view.

**Consequence for `/admin/photos`:** the grid view's reorder affordance is *modal on the
active filter*. Reordering with "All" selected writes the global field; reordering inside a
category writes that category's field. The screen must say which one it is writing, or the
operator will believe a reorder was lost.

### 4. Canonical category records (D-25)

**Chosen shape.** A category is a record — `{ id (lowercase), label (display), columns }` —
edited on `/admin/site`. Photos reference `id`. Display code reads `label`. Column counts read
`columns`.

**The drift, cited at its origin.** `data/portfolio_images.json` stores the category value
`architecture` (lowercase). `data/site_config.json`'s `categoryColumns` map keys the same
category as `Architecture` (Title-case). Two files, one concept, two spellings — and nothing
reconciles them except a render-time transform: the legacy `PropertiesPanel` Title-cased on
the fly with `c.charAt(0).toUpperCase() + c.slice(1)` to populate the category `<select>`.

**Why the record shape kills it.** Making display and key *different fields* removes the
transform entirely. The `categoryColumns` map's keys stop being a display string that happens
to be a key, and become an explicit `id` with an explicit `label` beside it. A transform that
does not exist cannot disagree with the data.

**Rename and delete need a designed reassignment path.** Renaming a label must not touch `id`
(otherwise 14 photos lose their category). Deleting a category must ask where its photos go —
`ConfirmDialog` + `Select`, stating the count plainly: *"12 photos use this."* This is the one
place on `/admin/site` where a confirm is not ceremonial.

### 5. The résumé date-shape drift — resolved, not discovered

**The drift.** `src/types.ts` on the legacy branch documents it in a header comment: the admin
"splits experience dates into `startMonth`/`startYear`/… while `resume.json` stores a single
`period` string." The legacy admin's local `ExperienceEntry` carried **both** —
`startMonth`, `startYear`, `endMonth`, `endYear`, `isPresent` **and** `period` — which is the
actual defect. Two representations of one fact, with nothing keeping them in agreement.

**Chosen shape: the structured fields win, and `period` stops being stored.** Experience and
education entries carry `startMonth`, `startYear`, `endMonth`, `endYear`, `isPresent`. The
`period` string is **derived at render time by a single formatter** and never persisted.

**Reason.** The fact being edited is a date range; a free-text string is a lossy encoding of it
that also invites format drift across entries (dash character, month abbreviation, casing).
Deriving the string gives exactly one source of truth — which is the same failure mode as
decision 4, in a different file. Choosing `period` instead would keep the display string
authoritative and leave "is this role current?" un-modelled, which the résumé and Work pages
both need.

**Consequence for the résumé screen's field set.** The single `Period` `TextInput` in the
recovered catalog becomes a date-range control: two `Select`s (month), two year inputs, and a
`Checkbox` "Present" that disables the end pair. Net **+4 controls per experience entry and
per education entry** against the recovered count. The formatter's acceptance test is exact
reproduction of the four strings on disk today — `Jul 2023 – Present`, `Nov 2022 – Jun 2023`,
`Dec 2021 – Nov 2022`, `Jul 2018 – Jun 2022` — with the en dash and the three-letter month, so
the public page does not visibly change on migration.

### 6. The four new photo fields, and the revived `tags`

**The record as it ships today**, re-read out of `data/portfolio_images.json` this session
rather than from any document: **39 records**, each carrying
`id, title, category, tags, date, exif{camera, lens, aperture, shutter, iso, focalLength},
urls, order, dimensions`. Four of the fields below do not exist on a single record —
`alt`, `place`, `description` and `focalPoint` are each present on **0 of 39** — and `tags`
exists on all 39 and is empty on all 39.

**Chosen shape.** The photo record gains four fields and revives one.

| Field | Type | Required | Rule |
|-------|------|----------|------|
| `alt` | `string` | **required for every published photo** | Describes the frame. Separate from `title`. |
| `place` | `string` | optional | **Manual free text. Never derived.** |
| `description` | `string` | optional | Prose about the photograph. Renders in the lightbox only — decision 7. |
| `focalPoint` | `string` | optional, defaults `"50% 50%"` | Same `"50% 25%"` shape Home's peek positions already use. |
| `tags` | `string[]` | optional | Revived. Empty on all 39 today. |

---

**`place` — manual, and the emptiness is a privacy decision that already happened.**

The image pipeline strips location deliberately. `scripts/process-images.js` on the
`legacy/nextjs-portfolio` branch calls `exifr.parse` inside `extractExif()` with
`pick: ["Make", "Model", "LensModel", "FNumber", "ExposureTime", "ISO", "FocalLength"]` and
**`gps: false`** beside it. GPS is not absent from the source files; it is read out and thrown
away on purpose, and the seven fields that survive are the seven the EXIF sub-form edits.

So `place` is typed by a human or it is empty. **Deriving it would publish the precise
coordinates of personal photographs** — including the ones taken where the photographer lives,
and the ones with people in them. That is a different act from publishing "Lisbon, Portugal",
which is what a human types when a human decides the location is worth saying. Free text is not
a lesser version of coordinates here; it is the field working correctly, because the
photographer chooses the granularity per photo.

**A future phase must not read an empty `place` as an invitation to derive one.** "Location is
missing, and we have EXIF, so let us backfill it from GPS" is a reasonable-sounding sentence
that reverses a privacy decision, and it is exactly the sentence this paragraph exists to stop.
If GPS ever needs to be read, that is a new decision made deliberately with the owner — not a
data-quality cleanup.

---

**`description` — optional prose, and it inherits the EXIF omission rule.**

An empty `description` renders **nothing** — never an em dash, never an empty paragraph
element holding open vertical space. This is the same rule the EXIF sub-form already carries
above, and it applies for the same reason: a `—` where prose should be reads as a data bug
rather than as an absence. Where it renders is decision 7.

---

**`alt` — required, and it is not `title`.**

*"Into The Mist"* **names** a photograph. It does not **describe** one. A screen-reader user
given `alt="Into The Mist"` receives a title they cannot resolve into an image, which is worse
than useless because it looks like the field was filled.

**Why this is non-negotiable rather than a nice-to-have here specifically:** the public gallery
ships **zero framework JS** across its static routes. There is no hover, no tooltip, no
progressive disclosure and no interaction of any kind that could supply a description later —
because there is no JS to implement one. `alt` is delivered on the `<img>` element itself and
**is the entire non-visual experience of 39 images**. It is not the fallback; it is the whole
channel.

**Three rules a value must satisfy:**

1. **It describes what is in the frame** — the subject, and enough of the setting to place it.
2. **It is not a copy of the title.** Case- and whitespace-insensitive equality is the failure
   a hurried fill produces, and the gate rejects it by name.
3. **It does not open with "Image of" / "Photo of" / "Picture of".** A screen reader announces
   the role before the text; the prefix is redundant speech, repeated 39 times on one page.

**`description` is not a substitute for `alt`.** A photo with a rich description and no alt is
still inaccessible, because the description lives in the lightbox and the grid is where the 39
images are. The two fields are not tiers of the same content — they answer different questions
for different readers.

---

**`focalPoint` — one shape for one concept.**

`data/home_config.json` already stores exactly this: `peekPositions` is a map from photo id to
a string, and its single populated entry today is
`"architecture-hawamahaldaytime": "50% 25%"` against a `peekIds` array of **six** photos. The
new field uses **that same string shape**, so a CSS `object-position` value stays a CSS
`object-position` value everywhere in the product rather than forking into a `{x, y}` object on
one screen and a string on another.

Default `"50% 50%"` — centre — so an unset focal point is indistinguishable from today's
behaviour and no migration is needed to preserve it.

**Whether `focalPoint` supersedes `peekPositions` or coexists with it is Phase 3's call**, and
it is genuinely a fork: a per-photo focal point is the photographer's judgement about the
photograph, while a peek position is a judgement about one slot in one layout. They may want to
be different values. This is named as an open migration question rather than resolved here,
because resolving it needs the Home layout to exist.

**G-1 escalates because of this field, and it is not fixed here.** The missing
`FocalPointPicker` was scoped against Home's **six** peek slots; `focalPoint` on the photo
record makes it load-bearing for the **main gallery admin across all 39**. Plan 14 measured the
hand-built cost at **269 non-comment lines** (`FocalPointSketch.tsx`, 419 lines total). The
escalation is recorded in this plan's SUMMARY; **G-1's tiers and its row in `00-FINDINGS.md`
are unchanged**, and no local workaround is proposed — a design-system gap is a finding.

---

**Ordering is untouched by this decision, and D-22's rule still governs `/admin/photos`.**

None of the five fields above is an ordering field, and adding them to `/admin/photos` changes
nothing about decision 3: the grid's reorder affordance remains **modal on the active filter**,
writing the **global `order` integer when "All" is selected** and the **per-category order
field when a category filter is active**. The screen must still say which of the two a drag
just wrote. Adding four editable fields to the same screen makes that label more necessary, not
less — a busier panel is exactly where an operator stops noticing which mode a reorder landed
in and concludes the reorder was lost.

---

**These fields are specified here and populated in the sketch fixture ONLY.**

Phase 0 writes no production code. **`data/portfolio_images.json` is not edited by this plan**,
and the acceptance gate on the task that wrote this section is
`git diff --quiet -- data/portfolio_images.json`. Phase 3's schema module owns the real
migration.

**The reason is not ceremony.** Writing the four fields onto all 39 records as empty strings
would produce a manifest that *looks* migrated — 39 records carrying `alt: ""` read as "the
migration ran and the content is pending", when in fact no migration has been designed, no
validation exists, and `alt` is supposed to be **required**. A record with a required field
present-and-empty is a worse artifact than a record without the field, because the absence is
what makes Phase 3 write the migration deliberately. The pending human content lives in
`00-PHOTO-CONTENT.md`, which is a brief, not a data file.

### 7. Where `description` renders on the public site — lightbox only

**This question is closed, not deferred.** The build phase inherits a position.

**Chosen behaviour.** `description` renders in the **lightbox only**. **`title` is the only
text in the grid.** And one binding requirement on top of that placement:

> **The description MUST be present in the served HTML, inside the figure, not injected by
> JavaScript at runtime.** The lightbox *reveals* it visually; it does not *create* it.

**Why that addition is load-bearing rather than an implementation detail.** `Lightbox` is a
hook-using, hydrated React island. A caption that only exists once that island hydrates is
unreachable to crawlers and to any visitor without JS — on a page whose entire design premise
is shipping **zero framework JS** across its static routes. Putting the text in the DOM at
build time and letting CSS and the lightbox control its *visibility* costs nothing and keeps
the page's content readable by everything that reads pages. A `<figcaption>` that is visually
hidden in the grid and revealed in the lightbox satisfies both halves.

**Why lightbox and not the grid:**

- **The masonry grid's rhythm is the design.** `00-PUBLIC-DESIGN-NOTES.md` resolution 5 gives
  photographs an edge on charcoal specifically so the frame carries the image. Thirty-nine
  captions insert a text column into what is composed as a photographic surface.
- **The height cost lands on the narrowest class, on the longest page.** At class 1 the content
  width is **312px** (§3: 344 − 32). A caption under every tile roughly doubles tile height
  there — on the Photos page, which carries all 39 images and is the longest page on the site.
- **The user has twice asked for less scroll** — *"I don't need long cases. Even short ones are
  very long"* and *"one page per case, not a long scroll"*. Doubling the height of the longest
  page cuts directly against a preference stated twice, and the fact that it was stated about
  case studies rather than the gallery does not make it a different preference.
- **The lightbox already hosts EXIF and already has room for prose.** `description` joins an
  existing text region instead of creating a new one, which is why this placement costs no
  layout work.
- **Hover-reveal is not the clean third option it appears to be.** Of the six device classes in
  `00-RESPONSIVE-CONTRACT.md` §1, **four are coarse-pointer** (1 folded cover, 2 phone
  portrait, 3 foldable unfolded, 4 tablet portrait), class 5 is **ambiguous**, and only class 6
  is **fine**. Hover is a reliable affordance on **one of six classes**. Any hover design needs
  a touch answer anyway — so it is not a way to avoid choosing, it is the same choice with an
  extra state to specify.

**The accessibility path does not depend on this choice, and that is what makes it safe to
choose.** `alt` is delivered on the `<img>` element and is present in the grid regardless of
what `description` does. Choosing lightbox-only moves *prose*, not *access*. **Stated
explicitly so it cannot be misread later: `description` is not a substitute for `alt`, and a
photo with a good description and no alt is still inaccessible.**

**Override condition.** If the grid should carry captions after all, this is **a layout
decision, not a copy one**: the peek and masonry height budgets in
`00-RESPONSIVE-CONTRACT.md` §5.3 recompute, and the Photos page's scroll length changes
materially at every class. Whoever reopens it reopens §5.3 with it.

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

---

## States and where each actually lives

D-03 requires the admin's states to be designed **exhaustively** — empty, loading, error,
dirty, conflict, success. D-13 layers a draft / ready / published axis on top, and D-09 wants
a second layout for every screen. Multiplied out that is a number nobody can build or review.

**The naive product, stated plainly:** 7 screens × 6 states × 2 layouts = **84**, plus the
cross-cutting surfaces that are not routes but are unavoidably screens — publish confirm in
valid and invalid variants (D-14, D-18), the per-file conflict diff (D-16), per-screen and
global discard confirms (D-17), the 401 re-auth prompt (D-19), the pipeline status strip
(D-15), the category-reassignment dialog (D-25) and the "open on desktop" refusal (D-09) —
roughly 12 more surfaces × ~2 states × 2 layouts ≈ 24. **Total ≈ 108 artefacts**, before a
single line of case-study or Work/Photos work.

**The reduction, and why it does not weaken D-03.** D-03's promise is *"nothing is left for
Phase 7 to invent."* That promise is kept by an **explicit, complete coverage matrix** — not
by rendering every cell. Most of the six states do not live at screen scope at all:

| State | The scope it genuinely lives at | Artefacts |
|-------|----------------------------------|----------:|
| `loading` | App shell + list-level skeleton — two treatments, not seven | **2** |
| `conflict` | One dedicated screen (D-16), reached from publish | **1** |
| `success` | A publish outcome — dashboard confirmation + status strip | **2** |
| `error` | Three genuinely different treatments: inline field warning under the lenient draft (D-18), the publish-block error summary (D-18), and network / 401 (D-19) | **3** |
| `dirty` | One badge pattern applied everywhere D-13 requires it — screen, sidebar, dashboard | **1** |
| `empty` | **The only genuinely per-screen state** — dashboard, photos, projects and a résumé section each mean something different | **4–5** |

**What that buys.** ≈ 20 desktop sketches (seven populated screens, ~5 meaningful empty
states, ~8 state treatments each applied to its most demanding host screen), ≈ 6 phone
sketches (D-09 permits exactly four capabilities and requires two refusals — not a 7×
multiplier), and ≈ 9 overlays and dialogs. **≈ 35 sketches**, down from ≈ 108, with no cell
left undeclared.

**The contract that makes the reduction checkable.** The contact sheet carries a
7 screens × 6 states = **42-cell** coverage table in which every cell is exactly one of
`designed` (with an artefact ID), `inherits: T-n` (with the treatment ID), or
`n/a: <reason>` (with a one-clause reason). **A blank cell fails review.** That single rule is
what converts "exhaustively" from an aspiration into a property a reviewer can check by
inspection — and it is why 35 sketches satisfy D-03 while 108 would merely exhaust everyone.

---

## Artefact inventory

These IDs are **a contract**. Plans 09 through 16 may add IDs; they may not silently rename
one. Findings, review comments and the coverage table all cite these, so a review comment
survives `.playground/`'s deletion. The one-line note states **what each artefact proves**,
not what it shows — a sketch that only shows something is not evidence.

### Screens — `S-` (7)

| ID | What it proves |
|----|----------------|
| `S-dashboard` | That pending changes grouped by entity are legible at a glance, so pending state has a permanent home instead of living inside a modal (D-06). |
| `S-home` | That six peek slots plus a focal position fit one full-width column with no split pane (D-07), and that the missing crop picker (G-1) is a real blocker rather than a nicety. |
| `S-photos` | That 39 real photos survive `DataGrid` at compact density with a legible row height, and that both ordering fields (D-22) can be expressed without ambiguity. |
| `S-resume` | That an 11-bullet experience entry plus two shorter ones, three skill groups and an education entry are workable full-width — the case that decided D-07. |
| `S-projects` | That five records with a status badge are a list, not a grid, and that D-45's three statuses are distinguishable at badge size. |
| `S-project-detail` | That a card record and a long-form case study can be authored on one route without either reading as an afterthought of the other (D-24). |
| `S-site` | That the category triple is editable in place and that `id` and `label` are visibly *different* fields — the whole point of decision 4. |

### Empty states — `E-` (5)

| ID | What it proves |
|----|----------------|
| `E-dashboard` | That "nothing pending" reads as a finished state rather than a broken one — the state this screen is in most of the time. |
| `E-photos` | That a gallery with nothing in it still leads with the upload affordance instead of an empty grid. |
| `E-projects` | That the projects list can be empty at all, and says what to do about it rather than just noting the absence. |
| `E-resume-section` | That an empty *section* inside an otherwise populated screen is distinguishable from a section still loading. |
| `E-category-filtered` | That an empty *filter result* is distinguishable from an empty dataset — the confusion that makes an operator think the filter is broken. |

### Treatments — `T-` (8)

| ID | What it proves |
|----|----------------|
| `T-loading-shell` | That the shell paints before data arrives, so navigation never blanks the window. |
| `T-loading-list` | That a list skeleton reserves the right height, so nothing jumps when the data lands. |
| `T-dirty-badge` | That `dirty` is legible in all three places D-13 requires it: the screen, the sidebar badge, and the dashboard. |
| `T-ready-badge` | That `ready` is distinguishable from `draft` at badge size — the D-13 distinction a single "unsaved" dot would collapse. |
| `T-error-inline` | That the lenient-draft warning (D-18) reads as *incomplete*, not as *rejected*. |
| `T-error-publish` | That the strict-publish block lists its failures and points at them — the surface `FormErrorSummary` cannot currently deep-link from (G-6). |
| `T-error-network` | That a transport failure is distinguishable from a validation failure, so the operator retries instead of editing. |
| `T-success-published` | That publish confirmation stays honest across the asynchronous photo half (D-12) — "committed" is not "processed". |

### Overlays — `O-` (9)

| ID | What it proves |
|----|----------------|
| `O-publish-valid` | That the confirm modal states exactly what is about to ship before it ships (D-14). |
| `O-publish-invalid` | That the invalid case is a designed state with a route to the fix, not a greyed-out button (D-18). |
| `O-discard-screen` | That per-screen discard returns to *published* state, never to an empty form — the D-11 rule made visible. |
| `O-discard-all` | That the global discard is guarded harder than the per-screen one, via `TypeToConfirm` (D-17). |
| `O-conflict-diff` | That one conflicted file can be resolved without abandoning an unrelated edit (D-16) — the largest single admin surface, and the one with zero design-system coverage (G-7). |
| `O-reauth-401` | That an expired session denies and re-authenticates with on-screen state preserved and the save retried in place (D-19) — and **never** depicts a bypass or a client-held credential. |
| `O-category-reassign` | That rename and delete carry a real reassignment path stating the blast radius: "12 photos use this" (D-25). |
| `O-pipeline-strip` | That pipeline status survives navigation and agrees with the per-photo tile — the two places D-15 requires to match; needs G-8. |
| `O-phone-sidebar` | That the sidebar collapses to a `Sheet` without dropping any of the seven routes (D-09). |

### Phone — `P-` (4)

| ID | What it proves |
|----|----------------|
| `P-dashboard` | That reviewing pending changes on a phone is a complete task, not a teaser that ends in "open on desktop". |
| `P-text-edit` | That fixing a typo on a phone actually reaches the field, at the comfortable density's 44px touch floor. |
| `P-photo-reorder` | That reordering by touch works — the D-09 capability most likely to be quietly dropped. |
| `P-publish` | That publish is reachable from a phone, which is the entire reason D-09 exists. |

### Refusals — `R-` (2)

| ID | What it proves |
|----|----------------|
| `R-crop-picker` | That the desktop-only refusal reads as honest rather than broken — justified by the legacy control being mouse-only and touch-unaware (G-1). |
| `R-case-study-authoring` | That long-form authoring refuses on a phone *with a reason*, instead of shipping an editor that fails on contact. |

### Public — `X-` (5)

| ID | What it proves |
|----|----------------|
| `X-work` | That the two-band Work page (D-44) survives the ivory → charcoal resolution without losing its employment/projects distinction. |
| `X-photos` | That the category filter row works as real anchors with `aria-current`, not a radiogroup (G-9), and still ships zero framework JS. |
| `X-case-long` | That the long case-study template holds real drafted prose at real length (D-39, D-40) rather than at placeholder length. |
| `X-case-short` | That the short template is genuinely a different template, not the long one truncated. |
| `X-contact-sheet` | The review convention itself: 42 cells, none blank, with the measurement readout on the same page as the design. |
---

## `S-photos` reopened — the layout board, and two escalations

Added by plan **00-23**. `S-photos` was completed by plan 00-13 and is reopened here on a
direct instruction from the user, quoted in full because the wording is the requirement:

> "I also want to have capability to move and position photos as I want, and see them in the
> actual view where i can move and see the position on actual final website"

Confirmed by decision prompt as **drag-to-reorder in the real public layout** plus a **focal
point per photo across all 39**, and explicitly **not** resize or span — the public gallery's
layout model is untouched.

### Why the finished screen did not already answer this

Plan 00-13 shipped two views: a `DataGrid` list over all 39 for metadata, and an **abstract**
`Sortable` grid for order — `auto-fill, minmax(128px, 1fr)` with a fixed **88px** thumbnail
height. A tile whose height is 88px regardless of the photo carries no information about where
that photo lands in a masonry whose entire shape comes from real aspect ratios. So neither view
answered *"where will this actually sit"*, which is the whole of what was asked.

The list view **stays**. `DataGrid` is for comparing records and finding one record; the board
is for order and for anything spatial. The screen legitimately has both, stacked, with an
`Eyebrow` naming each — in production a `SegmentedControl` switches them.

### This is consistent with D-07, not a reversal of it

D-07 chose a preview that **toggles to full width** rather than a split pane. This plan makes
that preview **editable** rather than read-only. It adds no second pane and takes no width from
the editing surface: the focal control sits beside the board above 900px and reflows beneath it
below, so the full-width posture D-07 selected is preserved at every class.

### The board's column model, and which side moved

`/photos` renders `column-count: 3` with `column-gap: var(--space-4)`, tiles `break-inside:
avoid` at a 10px radius (`photos.astro:455-462`). There is **no media query on the count** —
the public masonry is a flat three columns at every device class, because D-25's Title-case /
lower-case drift makes `site_config.categoryColumns` unreachable and `photos.astro` records
that as the reason.

**The board moved, not `/photos`.** `photos.astro` is a public sketch outside this plan's
scope, and a board that invents its own column count is exactly the failure the plan exists to
remove. Measured in Chromium from `getComputedStyle`, both pages at three widths:

| Width | `/photos` | board |
|-------|-----------|-------|
| 344 | cols=3 gap=16px radius=10px | cols=3 gap=16px radius=10px — **agree** |
| 768 | cols=3 gap=16px radius=10px | cols=3 gap=16px radius=10px — **agree** |
| 1440 | cols=3 gap=16px radius=10px | cols=3 gap=16px radius=10px — **agree** |

Two defects had to be fixed to reach that table, and both were invisible to grep:

1. **The density axis was silently rescaling the gap.** Writing `column-gap: var(--space-4)` —
   which is what `photos.astro` writes — drew the board at 16px on every coarse class and
   **12px at 1440**, because `density-compact.css:98` reassigns `--space-4: 12px` under
   `pointer: fine` and the board lives inside the admin. A narrower gap widens the columns,
   which changes tile heights, which moves where the multi-column algorithm breaks between
   columns — so the board would have shown a composition the public page does not have, at the
   one device class the operator actually works on. The density axis is right; the rule is that
   **a preview of a public surface is drawn at the public surface's spacing, not the host
   chrome's**, so the 16px is pinned as a literal with that reason written beside it.
2. **`Sortable` hard-codes the item box model inline.** Every item renders as
   `<li style={{listStyle:"none", padding:0, margin:0}}>` (`dist/index.js:9845`), and an inline
   style beats any stylesheet rule a consumer can write, so the vertical rhythm the public
   masonry gets from `margin-bottom: var(--space-4)` was unreachable and the board rendered with
   **zero vertical gap** until it was measured. A stylesheet `!important` outranks a
   non-important inline style and is the only route left.

### What the focal point actually does — measured, and not what the plan assumed

The public gallery tile is `<a class="ph-tile" style="aspect-ratio: W / H">` with `.ph-img
{ width: 100%; height: auto }`. It is **uncropped at the photo's own aspect ratio**, so
`object-position` is **inert on `/photos`**. The focal point is load-bearing where a photo is
placed in a frame it does not fit — Home's 3:2 peek slots, which is where D-23 and G-1 came
from.

A board claiming to show a live crop on the gallery frame would therefore have been lying about
the surface it imitates. So the board carries **two frames and names which one is on screen**:
`Gallery` (aspect-ratio W/H, uncropped, the `/photos` composition exactly — the default) and
`Peek slot` (3:2, `object-fit: cover`, `object-position` live). Column count, gap, radius and
reading order are identical in both; only the frame changes. The focal **marker** renders in
both, so the point is visible even where it does not bite.

### D-22's axis statement, as shipped

Carried across from plan 00-13 unchanged in substance, because a live reorder that does not name
the field it writes leaves an operator to conclude a reorder was lost. Stated **before** the
drag, not reported after it:

- no category active — "Dragging now writes **Global order** (order). Per-category orders are
  untouched."
- category active — "Dragging now writes **Architecture order** (the per-category order for
  architecture). The global order is untouched, and so is every other category."

Every tile carries **both** numbers (`global #16 · architecture #10`) plus its focal value, so
independence is visible on the tiles rather than asserted in a caption. The second ordering
field is still **not named** — that is one of Phase 3's migrations; the per-axis order is
derived at mount from the existing global `order`.

---

### G-1 escalates — from six peek slots to the whole gallery

**Was:** no focal-point crop picker, scoped to Home's six peek slots (`S-home`, `R-crop-picker`).

**Now:** load-bearing for the **main gallery admin across all 39 photos**. Every photo carries
`focalPoint`, in `home_config.peekPositions`' `"50% 25%"` shape per schema decision 6, so the
two do not diverge into two shapes for one concept.

**The tier is unchanged. Only the blast radius is.** It remains `backlog`, **`blocks-Phase-7`**.

**The cost, and why this plan makes it measurable rather than theoretical.** Plan 00-14 measured
the local prototype a consumer is forced to write at **419 lines — 269 non-comment**, of which
**86** are the 3:2 frame CSS ported from `legacy:src/styles/admin.css:1777-1797`. This plan
**reused those lines rather than writing a second copy**, and the reuse is provable rather than
asserted: `FocalPointSketch.tsx` is still 419 lines and its SHA-256 is
`71754ec92ae3e18648ee47117aca55d8453daf1a369ca7957714421b4d845ec2`, byte-identical to the copy
plan 14 left behind. Not forked, not reimplemented, not a line of its frame CSS copied.

**Two further properties of the absence were measured here, both new:**

- **The stand-in has no value-out channel.** `FocalPointSketch` exposes no `onChange`, no
  callback and no controlled `value`; its state is private and the only place the current value
  exists outside the component is the readout it paints. Coupling a live masonry tile to it
  therefore required **observing its rendered readout in the DOM** with a `MutationObserver`.
  That is the cost of G-1 stated precisely: the control that does not exist upstream also does
  not exist as a *composable* one downstream, so the second consumer pays again in a different
  currency.
- **Its frame ratio is a prop in the arithmetic only.** `frameRatioW` / `frameRatioH` feed the
  axis maths and the visible-band readout, but `.fp-frame` hard-codes `aspect-ratio: 3 / 2` in
  the component's own CSS. Passing a different ratio produces a readout describing a frame the
  component is still painting at 3:2. The board therefore passes the **same constant it draws
  the peek frame with**, so the maths and the paint agree — but an upstream `FocalPointPicker`
  must parameterise the ratio in *both*.

**Driven by keyboard, in Chromium, against the built `dist/`,** on
`architecture-hawamahaldaytime` — the one real crop in the product:

| Step | Readout | Tile `object-position` in the masonry |
|------|---------|----------------------------------------|
| at rest | `50% 25%` | `50% 25%` |
| `→ ×5`, `↓ ×3` | `55% 28%` | `55% 28%` |
| `Shift+↑` | `55% 18%` | `55% 18%` |

The tile followed the control on every step, and the tile caption's `focal 55% 18%` moved with
it. Switching to the peek frame then measured `aspect-ratio: 3 / 2`, `object-fit: cover`,
`object-position: 55% 18%` — the value biting on the surface where it applies. Zero page errors.

---

### G-13 escalates — from a secondary control to the primary interaction

**Was:** an accessibility gap on a secondary reorder affordance.

**Now:** drag is the **primary interaction of the screen**. The reorder is no longer one of two
views' worth of convenience; it is the thing the user asked for.

**Restated correctly, as plan 00-13 corrected it — the original wording is wrong and must not be
reintroduced.** dnd-kit's `DndContext` **does** supply `defaultAnnouncements` and
`defaultScreenReaderInstructions` when a consumer passes nothing, so a live region exists and
speech happens. What is wrong is *what it says*, and that a consumer cannot change it:
`Sortable`'s prop surface is `{ items, onReorder, renderItem, id, className, style }` with no
accessibility passthrough and no rest-spread onto `DndContext`.

**The fix is to EXPOSE an announcer, not to "pass one".**

**Re-measured on the new board, keyboard only, Chromium against the built `dist/` — focus a
tile, `Space`, `ArrowDown`, `Space`. Verbatim, and the wording is unchanged from plan 13's
measurement on the abstract grid:**

- `Space` → *"Draggable item abstract-intothemist was moved over droppable area
  abstract-intothemist."*
- `ArrowDown` → *"Draggable item abstract-intothemist was moved over droppable area
  abstract-lightscameraart."*
- `Space` → *"Draggable item abstract-intothemist was dropped over droppable area
  abstract-lightscameraart"*

The reorder itself **works** — the first two tiles swapped, by keyboard alone, and the focused
tile is `<div role="button" tabindex="0">`. The speech names **raw record slugs**, never the
photo's title ("Into The Mist"), and **never a position** — never "position 2 of 36", which is
the single fact a reorder user needs. Three live regions exist on the page, one per
`DndContext`.

**No local announcer was added.** `grep -qE 'aria-live|announcements|screenReaderInstructions'`
exits 1 against `PhotoLayoutBoard.tsx`. Bolting a fourth status region onto a page that already
has three would produce duplicate speech *and* convert an upstream finding into a silent local
fix, which PROJECT.md's Core Value forbids. Note that plan 13 recorded this assertion against
`SortableReorder.tsx`, which this plan **deletes** — the assertion now targets
`PhotoLayoutBoard.tsx` and any future check must be repointed.

**The consequence, stated plainly: Phase 7's photo positioning depends on G-13 landing in
Phase 1.** The screen whose primary interaction is a drag cannot ship with a reorder that
announces slugs and no position. G-13's tier is already `should-fix-in-Phase-1`; this escalation
is why that tier must hold rather than slip.

---

### A third composition limit, in the same family as plan 13's two

`Sortable` hard-codes `verticalListSortingStrategy` (`dist/index.js:9839`) and exposes no
`strategy` prop. In any layout that is not one vertical column — a masonry, a grid, anything
with more than one column — the in-flight shuffle transform applied to the **non-dragged** items
is computed along a single axis and is wrong. Collision detection is `closestCenter` against
real measured rects, so the **drop target is correct in two dimensions** and the reflow after
drop is correct; only the preview is wrong. The board neutralises that one transform in its own
CSS and lets the `DragOverlay` — which follows the pointer and is strategy-independent — carry
the feedback. Reported as *"`Sortable` needs a `strategy` prop"*, together with *"`Sortable`
should not hard-code its item box model inline"* from the masonry gap defect above.

---

### The findings register is untouched, and its denominator is FIFTEEN

No rows were added to `00-FINDINGS.md`. That file states its own scope rule — findings outside
the register go in SUMMARYs, not as new rows, because the tiers bound Phase 1's and Phase 7's
scope — and plan 16 refused permission to add rows for exactly this reason. **Escalating an
existing row's scope is not a new row**, so both escalations are recorded here and in
`00-23-SUMMARY.md` and the register's denominator is left alone.

**Correction to plan 00-23's own text:** the plan asserts the register carries *sixteen* rows
and gates on `= "16"`. Counted against the shipped file rather than the doc, it carries
**fifteen** — `G-1` through `G-15`, with `grep -c '^| \*\*G-'` returning 15. The gate is
arithmetically wrong and was **not** satisfied by adding a row. Fifteen is the correct fixed
denominator for any future check.
