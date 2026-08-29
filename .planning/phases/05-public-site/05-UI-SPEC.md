---
phase: 5
slug: public-site
artefact: ui-spec
status: draft
shadcn_initialized: false
preset: none
design_system: "@akhil-saxena/design-system@2.0.0-beta.1 (dist-tag `next`)"
brand: monochrome
created: 2026-08-28
---

# Phase 5 — UI Design Contract (Public Site)

> The visual and interaction contract for `/`, `/work`, `/photos`, `/photos/[category]`,
> `/photos/[category]/[slug]` and `/resume`. Consumed by the planner as task input, by the
> executor as the source of truth, and by the auditor after the fact.

## How to read this document

Phase 0 produced the design. Phase 1 produced the theme. **This document is neither.** It is the
contract that binds Phase 0's reviewed decisions to the components that actually shipped in
`2.0.0-beta.1`, with every claim re-measured against the published package and the committed data
rather than carried forward on trust.

Three kinds of statement appear, and they are labelled:

| Marker | Meaning |
|---|---|
| **MEASURED** | Checked this session. The command is quoted. |
| **CARRIED** | Quoted from a Phase 0 artefact that recorded its own measurement. Not re-derived. |
| **UNVERIFIED** | Stated from reasoning, not measurement. Every one is also an Open Question or carries a verification step. |

Everything not marked is a decision this document takes. Each proceeds as written unless
overridden — **silence is assent**, per the convention `00-UI-SPEC.md` §Confirm-or-Override
established and `00-RESPONSIVE-CONTRACT.md` §10 continued.

---

## 0. Four source premises corrected before anything is built on them

Phase 3 and Phase 4 each found their own briefs wrong. So did this one.

### 0.1 The design system is **not installed**

```bash
$ ls node_modules/@akhil-saxena
ls: node_modules/@akhil-saxena: No such file or directory
$ grep -c design-system package.json
0
```

**MEASURED.** `@akhil-saxena/design-system` appears in neither `dependencies` nor
`package-lock.json`. The brief states "The design system is installed. You can inspect it, read
its exports…" — it is not, and nothing in this repository has ever imported it.

`STATE.md` §Pending Todos already carries this: *"Repoint the portfolio at the registry.
`@akhil-saxena/design-system@2.0.0-beta.1` is published; the dependency is still a packed tarball.
Do this before Phase 5."* It is worse than recorded — there is no tarball either.

Everything below was therefore measured against the **published tarball**, which is what
`npm install` will produce:

```bash
$ npm pack @akhil-saxena/design-system@next && tar xzf akhil-saxena-design-system-2.0.0-beta.1.tgz
```

**Phase 5 task 1 is `npm i @akhil-saxena/design-system@next`, and `npm run gate:deps` must pass
against it** (that gate refuses a `file:` spec; a registry spec satisfies it now rather than at
cutover).

### 0.2 The project hrefs and badges are in `data/projects.json`, not `data/resume.json`

**MEASURED.** `Object.keys(require('./data/resume.json'))` is `["experience","skills","education"]`.
The five projects live in `data/projects.json`, created by plan 03-05 under D-24, with the schema
at `src/schemas/projects.ts`. The brief and `ROADMAP.md` Phase 5's amendment both say
`resume.json`. Read `projects.json`.

### 0.3 Work is **not** "a rendering job, not a content one" — two fields do not exist

**MEASURED**, against `src/schemas/projects.ts` and `src/schemas/resume.ts`, both `z.strictObject`:

| What the reviewed Phase 0 design renders | Field it needs | Exists? |
|---|---|---|
| `LIVE` / `MAINTAINED` / `ARCHIVED` status badge (D-45) | `Project.status` | **No.** `badges[]` is a link list — cairn's first badge label happens to read `"Live"`, hued's read `"Play Store"` and `"GitHub"`. It is not a status. |
| Home Act-2 one-liner (60–110 chars) *and* Work card description (120–200 chars) — two different strings | `Project.oneLiner` + `Project.description` | **No.** One `description` field. |
| Employment-band metric (`+15% CONVERSION`, `4K+ FRANCHISES`, `6× FASTER PIPELINES`) | `ExperienceEntry.metric` | **No.** |

And `00-COPY/one-liners.md` — which carries both strings *and* the `badge:` status for all five
projects, sourced and reviewed — **was never merged into `data/projects.json`**. Compare cairn:

- `projects.json`: `"Job application tracker with interview workflows and feedback tracking, built on a custom design system. Deliberately anti-gamified and runs entirely on Cloudflare's free tier."` (176 chars, the pre-Phase-0 copy)
- `one-liners.md` card: `"A job application tracker for a search that runs long, where restraint is the product. …"` (196 chars, the reviewed copy)

This is **OQ-1** below. It is the largest single dependency Phase 5 carries and it is a schema
change plus a data migration, not a render.

### 0.4 Exactly **one** record's `dimensions` differs from its served original, not three

```bash
# fetch all 39 urls.original, parse the WebP header, compare to dimensions
$ node /tmp/d5.cjs
DIFFERS nature-fairwayreflections manifest=4608x3072 original=2000x1333 ratioΔ=0.025%
records where dimensions !== urls.original pixel size: 1 of 39
```

**MEASURED.** The brief says three; `src/schemas/photo.ts`'s own comment says *"Two other records
differ the same way."* Both are wrong. `architecture-redbuilding` (1920×1280) and `abstract-plane`
(1318×2341) were sub-2000px sources, so their `original` is byte-for-byte the source size.

This **strengthens** rather than weakens the schema's ruling. Independently:

```bash
# all 39 small variants, manifest ratio vs served ratio
39 small variants: ratio deviations >1%: 0
small widths seen: 400
total small bytes: 0.86 MB
```

**Reserve from the ratio. See §7.2.**

---

## 1. Design System

| Property | Value |
|---|---|
| Package | **`@akhil-saxena/design-system@2.0.0-beta.1`**, dist-tag **`next`** (`latest` is 1.11.4 and must not be used — Cairn depends on it) |
| Brand | **`monochrome`** — the ochre identity was retired in plan 01-22 |
| Components shipped | **83** entry points under `dist/components/` · README states **81** (the catalogue's number; `Field` and `IconButton` are deliberately excluded — MEASURED, and the two figures reconcile exactly) |
| Icons | `lucide-react`, re-exported at `@akhil-saxena/design-system/icons` |
| Fonts | Playfair Display (roman **and** drawn italic) · DM Sans · IBM Plex Mono — 5 `@import`s, 12 face rules |
| shadcn | **not used, and this is final.** No `components.json`, no `tailwind.config.*`. Installing a second component library is the exact workaround the Core Value forbids. |

### 1.1 The import contract — this is load-bearing for PUB-14 and DS-09

**Every component is imported from its own subpath. Never from the barrel.**

```ts
import { FilterNav } from "@akhil-saxena/design-system/components/FilterNav";  // ✅
import { FilterNav } from "@akhil-saxena/design-system";                       // ❌ banned
```

**MEASURED** — transitive module graph of each subpath entry, resolved from `dist/`:

| Subpath | Files | Raw bytes | External deps | prosemirror / tiptap / lowlight / dnd-kit |
|---|---:|---:|---|---|
| `components/FilterNav` | 2 | 1,815 | react | **none** |
| `components/Card` | 2 | 1,065 | react | **none** |
| `components/Badge` | 2 | 937 | react | **none** |
| `components/Divider` | 2 | 2,340 | react | **none** |
| `components/Timeline` | 2 | 2,038 | react | **none** |
| `components/Link` | 2 | 1,500 | react | **none** |
| `components/Button` | 2 | 5,405 | react | **none** |
| `components/Heading` · `Text` · `Eyebrow` | 3 | ~1.9 K | react | **none** |
| `components/StatusPill` | 3 | 2,792 | react | **none** |
| `components/Footer` | 3 | 4,123 | react | **none** |
| `components/Chip` | 3 | 5,881 | react, lucide-react | **none** |
| `components/AppBar` | 8 | 22,155 | react | **none** |
| **`components/Lightbox`** | **9** | **15,351** | react, react-dom, lucide-react | **none** |
| *(control)* `components/RichText` | 14 | 64,977 | **6 × @tiptap** | **PRESENT** |
| *(control)* `components/Sortable` | 3 | 8,103 | **3 × @dnd-kit** | **PRESENT** |
| *(control)* barrel `.` | 101 | 416,590 | tiptap ×6, dnd-kit ×3 | **PRESENT** |

The two controls prove the measurement bites: the same method that reports "none" for thirteen
public components reports the forbidden families for the three surfaces that genuinely carry them.

**G-15 / DS-09 is satisfied by construction on the subpath path** — not by trusting the bundler.
`STATE.md` records that the barrel now tree-shakes too (`import { Chip }` fell from 570,555 B to
1,620 B), but that is a Rolldown behaviour measured in a different repository. The subpath rule
does not depend on it.

### 1.2 The CSS import contract

In the shared public layout, once:

```ts
import "@akhil-saxena/design-system/tokens.css";
import "@akhil-saxena/design-system/themes/monochrome.css";
import "@akhil-saxena/design-system/fonts/monochrome.css";
import "@akhil-saxena/design-system/primitives.css";   // see the note
```

- **Order is house style, not correctness.** The theme's exhaustiveness invariant makes it
  order-independent (**CARRIED**, `themes/monochrome.css` header, verified against four
  constructed import orders in Phase 0).
- **`primitives.css` is 235,100 bytes.** The per-component sheets under `css/*.css` are the
  alternative and cut it to what is used. **Take the whole sheet in Phase 5** and revisit only if
  QUAL-01 fails — the per-component split has a documented ordering hazard (`css/filternav.css`'s
  own header: *"SOURCE ORDER IS LOAD-BEARING HERE… this section must stay AFTER
  SegmentedControl's"*), and trading a measured-correct cascade for an unmeasured byte saving is
  the wrong order of operations. Record the number; do not act on it before Lighthouse says to.
- **`fonts/monochrome.css` uses bare `@import "@fontsource-variable/..."` specifiers.**
  **UNVERIFIED** that Vite resolves them from a transitive dependency's stylesheet. **Verification
  step:** open DevTools → Network → Font on a built page and assert **exactly three families**
  download (Playfair Display, DM Sans, IBM Plex Mono) and that Inter, Archivo, JetBrains Mono and
  Newsreader do not. A silent failure here renders Playfair as **Georgia** and looks almost right.

### 1.3 `"use client"` is on every component entry and is harmless here

**MEASURED** — every file under `dist/components/` opens with `"use client";`. In Astro this is
inert: a React component with no `client:*` directive renders to static HTML regardless. It does
**not** put Phase 5 on the wrong side of PUB-14. Recorded because it looks like it should.

---

## 2. Spacing

**The design system owns the spacing scale. The brand does not, and neither does this site.**
`monochrome.css` declares no `--space-*` (**MEASURED** — the ownership allowlist in its header,
confirmed by grep). App CSS composes the existing 16-step scale and never adds a step.

| Token | px | Where Phase 5 uses it |
|---|---:|---|
| `--space-1` | 4 | Icon gap, inline label offset |
| `--space-2` | 8 | Chip gap, EXIF row gap |
| `--space-4` | 16 | **Masonry column-gap and tile bottom margin** · **peek-grid gap** · gutter rung 1 |
| `--space-6` | 24 | Card padding · gutter rung 2 · Act-2 grid gap at classes 1–2 |
| `--space-8` | 32 | Section breaks · gutter rung 3 · Act-2 grid gap at classes 3–4 · **the two Act-2 gaps that must tighten (§6.4)** |
| `--space-10` | 40 | Act-2 grid **row** gap at classes 5–6 |
| `--space-11` | 44 | The touch floor · `.pub-main` top padding |
| `--space-12` | 48 | Gutter rung 4 · major section breaks |
| `--space-14` | 56 | Act-2 grid **column** gap at classes 5–6 |
| `--space-16` | 64 | Page-level vertical spacing |

### 2.1 The gutter ladder — one custom property, four rungs

**CARRIED** verbatim from `00-PUBLIC-DESIGN-NOTES.md` §"Responsive shell", which measured it in a
real browser at all six classes and reached zero horizontal scroll on 54 route×class combinations.

```css
.pub-shell { --pub-gutter: var(--space-4);  padding: 0 var(--pub-gutter); }  /* class 1, base   */
@media (min-width:  375px) { .pub-shell { --pub-gutter: var(--space-6);  } } /* class 2         */
@media (min-width:  673px) { .pub-shell { --pub-gutter: var(--space-8);  } } /* classes 3–4     */
@media (min-width: 1024px) { .pub-shell { --pub-gutter: var(--space-12); } } /* classes 5–6     */
```

**The ladder is one property and five derived rules, and that is the point.** Every full-bleed row
cancels the gutter with a negative margin and pays it back as padding. Hardcode `--space-12` in one
of them and the AppBar or the Footer overhangs by 32px a side — which presents as a horizontal
scroll, i.e. the exact R-6 violation the ladder exists to close, reintroduced by the fix for it.
The five sites are `.pub-shell` padding, `.pub-bar` margin, the AppBar's own padding, `.pub-footer`
margin, and the Footer's own padding. **`.pub-footer` is the one that gets missed.**

### 2.2 Layout maxima

Home **1080** · Work and Photos **1280** · Work's employment band **1080** (J3, CONFIRMED by Akhil
2026-08-19) · prose measure **68ch** (`max-width: min(68ch, 100%)`). Every one is `min(cap, 100%)`
in effect, so none needs a breakpoint.

### 2.3 The 44px floor is on the hit area, not the drawn control

Five of the six device classes are coarse-pointer, so **the floor is the common case**. It is
reached by growing the *anchor box* under `@media (pointer: coarse)` while the painted geometry
stays put — never by growing the paint. **Never gate on width** (a 1024px tablet and a 1024px
laptop window want opposite answers). **Never use `any-pointer`** (a tablet in a keyboard case
reports fine as *attached* while touch stays primary, and the user still touches the screen).

**MEASURED, and it is a live gap:** the design system now carries the floor for `AppBar`'s links
(`css/appbar.css:120`, `min-height: 44px` under `@media (pointer: coarse)`) and for
`Footer`'s (`primitives.css:5763`) — closing both design-system halves of D-16-1. It does **not**
carry it for `FilterNav`: `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` is **40px**,
the tallest of the three sizes, and `primitives.css` contains no `pointer: coarse` rule touching it.
See §8.3 and **OQ-4**.

---

## 3. Typography

`--text-*`, `--lh-*` and `--ls-*` are design-system-owned. `--font-*` and `--weight-*` are
theme-owned. **Phase 5 redefines none of them.**

**MEASURED**, `dist/tokens.css`: the scale is `2xs 9.5 · xs 11 · sm 12.5 · base 13 · md 15 ·
lg 17 · xl 22 · 2xl 28 · 3xl 40 · 4xl 44 · **4xl-plus 52** · 5xl 60 · 6xl 72`. G-11 landed —
the 52px step exists.

### 3.1 The public roles

| Role | Family | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|
| Home name — "Akhil Saxena" | Playfair | `--text-5xl` 60 | 700 | `--lh-tight` 0.94 | `--ls-tighter` |
| Page header — Work, Photos | Playfair | **`--text-4xl` 44** | 700 | `--lh-snug` 1.08 | `--ls-tighter` |
| Section heading — "The work", "The résumé" | Playfair | `--text-3xl` 40 | 700 | `--lh-snug` | `--ls-tighter` |
| Italic subtitle — "Interfaces & Imagery" | Playfair **italic** | `--text-xl` 22 | 400 | `--lh-snug` | `--ls-tight` |
| Project / card / photo title | Playfair | `--text-xl` 22 | 700 | `--lh-snug` | `--ls-tight` |
| Body — card description, résumé bullet | DM Sans | `--text-md` 15 | 400 | `--lh-relaxed` 1.55 | `--ls-base` |
| Body — one-liner, tagline, sub-paragraph | DM Sans | `--text-base` 13 | 400 | `--lh-relaxed` 1.55 | `--ls-base` |
| Nav link | DM Sans | `--text-base` 13 | 500 | `--lh-normal` 1.5 | `--ls-base` |
| Footer / meta / EXIF value | DM Sans | `--text-sm` 12.5 | 400 | `--lh-normal` 1.5 | `--ls-base` |
| Eyebrow · metric · counter · EXIF label | IBM Plex Mono | `--text-xs` 11 | 500 | `--lh-normal` 1.5 | `--ls-wide` 0.1em |
| Filter pill · status label | IBM Plex Mono | `--text-2xs` 9.5 | 500 | 1 | `--ls-wide` |
| **Italic serif cross-link** | Playfair **italic** | **`--text-lg` 17** | 400 | `--lh-snug` | `--ls-tight` |

### 3.2 The two judgements Akhil already answered — do not re-open them

- **44px, not 52px** (J1, CONFIRMED 2026-08-19). Playfair's larger x-height and heavier stems
  already carry the weight the handoff got from Newsreader at 52. `--text-4xl-plus` ships and
  **this page does not use it.**
- **The cross-link is 17px in `--ochre-d`, not 22px in `--ochre-d-strong`** (J2, OVERRIDDEN — and
  not by the offered fallback). Verdict: *"too big and heavy, can keep smaller font too."* Both
  axes were rejected.

### 3.3 One anti-aliasing rule, carried

`-webkit-font-smoothing: antialiased` stays. Its consequence: **Playfair at weight 400 must not
carry a body role below 15px on a dark surface.** Below 15px, body is DM Sans. The 17px italic
cross-link is the smallest serif on the site and clears it.

---

## 4. Colour — monochrome

**Everything in `00-UI-SPEC.md` §Color is superseded.** That section specifies the ochre charcoal
palette, which was rejected on sight at the 01-20 capture review and replaced in 01-22. Ochre
`#B0722A` appears nowhere in `2.0.0-beta.1`.

**The reason is the design constraint, and it is the whole argument of this phase:** sampling all
39 photographs found the 30–45° hue band at 14.8% of their chromatic pixels and 15–30° a further
9.4%, so the interface accent lived inside the second-largest colour band of the content it was
meant to recede behind. Removing the hue dissolved two accessibility findings by construction.
**The photographs are the only source of colour on the page.**

### 4.1 The 60 / 30 / 10 split

| Role | Dark (public default) | Light | Usage |
|---|---|---|---|
| **Dominant (60%)** | `--cream` **`#0d0d0f`** | `#fafafb` | Page field |
| **Secondary (30%)** | `--cream-2` **`#17171a`** raised · `--cream-3` **`#1e1e22`** inset | `#fdfdfe` · `#f4f4f6` | Cards, photo-tile backing, EXIF panel, footer |
| **Accent (10%)** | `--ochre-d` = `--amber-d` **`#95959b`** · `--ochre-d-strong` **`#b0b0b6`** | `#64646a` · `#4e4e54` | See the reserved-for list |
| **Accent fill** | `--ochre` = `--amber` = **`var(--ink)`** `#f2f2f4` | `var(--ink)` `#111114` | Filled primary controls only |
| **Destructive** | `--red` (unchanged) | `--red` | Not used on the public site |

**Colour that carries meaning survived the monochrome pass; colour that carried only identity did
not.** The error red and the success green are inherited untouched. The line is meaning, not
saturation.

### 4.2 Measured ratios — computed this session, against all three surfaces of each mode

Computed with a WCAG relative-luminance implementation and cross-checked against the figures the
theme file states in its own comments; they agree to two decimal places on every shared row, so the
method is verified rather than asserted.

| Token | Dark value | page / paper / panel | Light value | page / paper / panel |
|---|---|---|---|---|
| `--ink` | `#f2f2f4` | 17.37 / 16.00 / 14.86 | `#111114` | 18.07 / 18.54 / 17.16 |
| `--ink-2` | `#bfbfc5` | 10.61 / 9.77 / 9.08 | `#424248` | 9.57 / 9.82 / 9.08 |
| `--ink-3` / `--ink-4` | `#a8a8ae` | **8.21 / 7.56 / 7.02** AAA | `#525258` | **7.44 / 7.63 / 7.06** AAA |
| `--ink-5` *(decorative only)* | `#68686e` | 3.51 / 3.23 / 3.00 | `#8d8d93` | 3.16 / 3.25 / 3.00 |
| `--ochre-d` / `--amber-d` | `#95959b` | 6.52 / 6.01 / 5.58 AA | `#64646a` | 5.63 / 5.78 / 5.35 AA |
| `--ochre-d-strong` | `#b0b0b6` | 9.00 / 8.29 / 7.70 AAA | `#4e4e54` | 7.92 / 8.13 / 7.52 AAA |
| `--wire` *(control border)* | `#6d6d73` | 3.78 / 3.48 / 3.23 ✅ 3:1 | `#88888e` | 3.38 / 3.47 / 3.21 ✅ 3:1 |
| `--rule` *(hairline)* | `#2a2a30` | 1.36 / 1.25 / 1.16 | `#d8d8de` | 1.36 / 1.40 / 1.29 |
| `--amber-vivid` | `#8e8e97` | 5.98 / 5.51 / 5.12 | `#8e8e97` | **3.11 / 3.19 / 2.96** |

**One prohibition falls straight out of the last row.** `--amber-vivid` is the same literal in both
modes, so in **light** it fails AA as text on every surface. It is a marker/dot step. **Never render
`--amber-vivid` as text.** This is the exact figure `STATE.md` flags as making DS-02's
"every accent-as-text usage passes AA" clause measurably false; on the public site the rule is
simply "do not use it as text".

### 4.3 Accent reserved for — the explicit list

The list is shorter than Phase 0's, because in a monochrome system the accent *is* the ink ramp and
an accent that appears everywhere is a theme.

| # | Element | Token |
|---|---|---|
| 1 | The **period** in "Things I design and build**.**" — 44px display | `--ochre-d` |
| 2 | The three **employment metrics** — 11px mono | `--ochre-d-strong` |
| 3 | The **italic serif cross-link** — 17px | `--ochre-d` (J2) |
| 4 | The **scroll prompt** on Home — 11px mono, underlined | `--ochre-d` |
| 5 | **Card hover border** on Work project cards — non-text | `--ochre-d` |
| 6 | The **focus ring** — non-text, `--focus` (= `var(--ink)` in monochrome) | `--focus` |

Everything else — nav links, footer links, filter pills, status pills, EXIF, body copy — takes the
ink ramp or a design-system semantic tone.

### 4.4 Two rules carried from the ivory→charcoal resolution that still bind

**Rule 1 — on dark, a card's boundary is carried by its border; on light, by its fill.**
`--cream-2` over `--cream` in dark is a ~1.1:1 delta, so the fill draws nothing. Project cards and
filter pills take **`--wire`** in dark, not `--rule`. **CARRIED**, and re-measured in Phase 0 after
the `class`→`className` fix: the painted border moved from `rgb(51,51,47)` (`--rule`, 1.43:1) to
`--wire`.

**Rule 2 — photographs need an edge on dark that they did not need on ivory.** The gallery skews
dark: architecture at night, `abstract-intothemist`, wildlife. Photo tiles take
`box-shadow: inset 0 0 0 1px var(--rule)` **in dark only**, none in light. Reviewed and PASSED at
1440 and 390 on 2026-08-22.

### 4.5 `--surf-*` — the Phase 0 gap dissolved, and here is the arithmetic

Phase 0 flagged that `AppBar` fills from `--surf-2`, which the brand does not declare, so the nav
would take the design system's neutral translucent white. **MEASURED** — that is still true
(`--surf-2` is in `tokens.css`, used 47× in `primitives.css`, absent from `monochrome.css`), and it
no longer matters, because the composite is now neutral:

- dark: `rgba(255,255,255,.055)` over `#0d0d0f` composites to **`#1a1a1c`**, against `--cream-2`
  `#17171a` — a 3/255 delta.
- light: `rgba(255,255,255,.55)` over `#fafafb` composites to **`#fdfdfe`** — `--cream-2` exactly.

**The finding is closed by the monochrome pass, not by a fix.** Recorded so nobody re-opens it, and
so nobody "fixes" it with a local override that would move the AppBar off the surface it already
matches.

### 4.6 Three component-level colour defects, measured against `2.0.0-beta.1`

| # | Defect | Consequence for Phase 5 | Disposition |
|---|---|---|---|
| a | **`Link` sets `color` as an inline style on `inline`, `footer` and `action`.** Only `default` and `quiet` are stylesheet-only. **MEASURED** in `chunk-6X5ZERPL.js`. | An app rule at (0,1,0) loses to an inline style and every unit test still passes, because jsdom implements no CSS specificity. Three consecutive Phase 1 plans hit this; 01-11 shipped a grey link inside a red error box. | Use `variant="default"` or `variant="quiet"`, or pass the `color` prop. **Verify the computed colour in a real browser, not in a test.** |
| b | **`Link variant="footer"` / `"action"` inline `textDecorationColor: rgba(0,0,0,.25)`.** The dark-mode rule `.dark .ds-atom-link[data-variant="footer"]` sets `rgba(255,255,255,.4)` and **loses to the inline style.** | The public footer is dark by default; its link underlines are black at 25% on `#0d0d0f` — effectively invisible. | **Finding, not a workaround.** File upstream. Phase 5 uses `variant="default"` in the footer, which is stylesheet-only and therefore correct. |
| c | **`Chip` clobbers rather than concatenates `className`** — it spreads `...rest` after `className="ds-atom-chip"`, so a consumer class *replaces* the atom hook. `Card`, `Badge`, `Link`, `FilterNav` all concatenate. **CARRIED** from Phase 0, and the asymmetry is unchanged in `2.0.0-beta.1`. | A `className` on a Work tech chip silently removes `ds-atom-chip` and, on an interactive chip, its focus ring. | Do not pass `className` to `Chip`. Wrap it. |

**`class` is not `className`.** Phase 0 lost this twice: `<Card class="wk-card">` renders
`class="ds-atom-card"` with no error, no warning and a page that looks plausible —
`querySelectorAll('.wk-card').length` was **0**. A gate asserting zero `class=` on any
design-system component in any `.astro` file is cheap and pays for itself.

---

## 5. PUB-14 — the per-route JavaScript budget

**This is the constraint that decides every component choice, so it is stated before the routes.**

### 5.1 The five routes, and the one that hydrates

| # | Route pattern | Pages | Framework JS | The reason |
|---|---|---:|---|---|
| 1 | `/` | 1 | **ZERO** | Two-act Home is `min-height`, DOM order and a real `<a href="#work">`. Nothing to hydrate. |
| 2 | `/work` | 1 | **ZERO** | Five cards, three employment rows, all static. |
| 3 | **`/photos` + `/photos/[category]`** | **8** | **`Lightbox`, `client:idle`** | PUB-06 requires **swipe** dismissal. `:target` gives a CSS-only lightbox but not swipe and not arrow-key navigation. This is the one route where the interaction cannot be expressed without JS. |
| 4 | `/photos/[category]/[slug]` | 39 | **ZERO** | The photo's own page. It is also the no-JS destination of every gallery tile. |
| 5 | `/resume` | 1 | **ZERO** | Renders `resume.json` through `<Bullets>`; prints. |

**Four of five ship zero framework JavaScript. Photos is the fifth.** `/404` and the
`/portfolio` → `/photos` redirect carry none.

### 5.2 What "zero framework JavaScript" permits, stated so it cannot drift

PUB-14 says **framework** JavaScript. It bans React hydration. It does **not** ban a hand-written
`<script is:inline>`. This is the whole reason PUB-12's theme toggle can exist on all five routes.

> **The rule: a public route may carry at most one `<script is:inline>`, it lives in the shared
> layout, it is the theme script and nothing else, and it is under 40 lines.** Any second inline
> script, and any `client:*` directive outside `/photos`, fails the gate.

### 5.3 The gate

`.playground/check-no-js.sh` is gone with the playground. Phase 5 rebuilds it as
`scripts/assert-public-routes-ship-no-js.mjs`, and it must **bite** before it is believed — the
project has shipped nine gates that could not fail. The negative control is: add a
`client:load` to one static route, rebuild, assert the gate exits 1, remove it, assert the file is
SHA-256-identical and the gate exits 0 again.

Assertions:

1. Every `dist/**/*.html` outside `/photos/` and `/photos/<category>/` contains **zero**
   `<script type="module" src=` referencing an Astro island chunk.
2. Every such page contains **exactly one** `<script is:inline>`-emitted block, and its text
   matches the theme script.
3. `/photos/index.html` and each `/photos/<category>/index.html` contain **exactly one** island
   entry, and it resolves to the Lightbox chunk.
4. **No public chunk anywhere in `dist/` matches `/prosemirror|tiptap|lowlight|highlight\.js|dnd-kit/`.**
   This is the DS-09 go/no-go re-check the roadmap demands. If it fires, the fix is an upstream
   design-system change feeding a patch release — **never a local workaround.** Given §1.1's
   measurement it should not fire; the gate exists because "should not" is not evidence.
5. `src/lib/photo-pipeline.ts` appears in no client chunk (see §7.3).

Also audit **DevTools → Network → Font: at most three families download** (§1.2).

### 5.4 Component inventory per route — what the bundle gate has to check

| Route | Design-system components (all via `components/*`) | App layout CSS |
|---|---|---|
| shared shell | `AppBar` · `Footer` · `Link` (`variant="default"`) · `IconButton` (theme toggle) | `.pub-shell`, `.pub-bar`, `.pub-main`, `.pub-footer`, the gutter ladder |
| `/` | shell + `Heading` · `Text` · `Eyebrow` · `Divider` · `Card` · `StatusPill` | `.hm-a` peek grid, `.hm-b` Act-2 auto-fit grid |
| `/work` | shell + `Heading` · `Text` · `Eyebrow` · `Divider` · `Card` · `Chip` · `StatusPill` | `.wk-band` employment rows, `.wk-grid` |
| `/photos`, `/photos/[category]` | shell + `Heading` · `Text` · `Eyebrow` · **`FilterNav`** · **`Lightbox` (island)** | `.ph-masonry` (`column-count`), `.ph-filters` rail |
| `/photos/[category]/[slug]` | shell + `Heading` · `Text` · `Eyebrow` · `Divider` | `.pd-frame`, `.pd-exif` |
| `/resume` | shell + `Heading` · `Text` · `Eyebrow` · `Divider` · `Button` · `Chip` | `.rs-entry`, `@media print` |

**`Timeline` is deliberately not used** for the employment band. Phase 0 offered "`Timeline` or
hairline `Divider` rows"; the reviewed capture is hairline rows with a right-aligned mono metric,
and `Timeline` renders a dot-and-rail vertical structure that is a different composition. Recorded
as a choice, not an omission.

**Masonry has no component (G-10, accepted).** QUAL-03 permits layout CSS; `column-count` is layout.

---

## 6. Home (PUB-01)

### 6.1 The mechanism — plain document scroll, and nothing else

State A is the identity block plus a six-photo peek grid plus a scroll prompt, **exactly one
viewport tall**. State B is the work band plus the résumé band, following it in DOM order. The
prompt is a real `<a href="#work">`.

Four properties follow, and each is why this mechanism was chosen over a scroll-driven animation
or a JS-pinned section: it is the minimum that satisfies the request; it ships zero JS; it cannot
trap a keyboard user because there is nothing to trap; and **it is aspect-ratio-independent**,
which is the whole answer to the near-square foldable at ~1.1. Any implementation reaching for
`aspect-ratio` or a `vw`-derived height forfeits that.

### 6.2 "Filling the viewport" on a phone — the exact declaration

```css
.hm-a {
  --hm-above: calc(var(--ds-appbar-h) + var(--space-11));
  min-height: calc(100svh - var(--hm-above));
}
```

Three things are load-bearing:

- **`svh`, never `vh`, never `dvh`.** `100vh` is the *large* viewport — the height with the mobile
  address bar retracted — so at first paint on iOS Safari and Android Chrome it is taller than what
  the reader can see, and the scroll prompt (the one element whose entire job is to be visible at
  first paint) is pushed below the fold. `dvh` is forbidden on any scroll-transition participant
  because it changes *during* the scroll, moving the transition's own target distance mid-gesture.
- **`min-height`, never `height`.** Content taller than the budget must overflow *visibly*. A
  visible overflow is a failure a screenshot catches; a clip is one it hides.
- **The chrome above state A comes out of the budget.** State A does not start at the top of the
  document. A full `100svh` section has its bottom one viewport *plus* the chrome down the page, and
  one viewport of scroll leaves a band of photographs on screen. Phase 0 measured that band at
  **131px**.

**`--ds-appbar-h` is a real custom property and replaces Phase 0's hardcoded 87px.** MEASURED,
`dist/css/appbar.css`:

```
:48   --ds-appbar-h: 47px;
:138  @media (pointer: coarse) { --ds-appbar-h: 69px; }
```

Its own comment names this use case: *"a consumer building a full-viewport landing needs
`min-height: calc(100svh - var(--ds-appbar-h))`; a bare `100svh` puts its bottom edge below the fold
by exactly the bar's height."* **The Phase 0 finding is closed upstream — do not re-measure the
AppBar in a browser and paste the number.**

**Consequence: `--hm-above` is 91px on fine pointers and 113px on coarse, not a constant 131.** Every
Phase 0 peek arrangement therefore gets *more* budget, not less, so all six still fit — class 6
gains 40px, class 3 gains 18px. Do not re-solve the grid.

**`.hm-b { min-height: 100svh }` is required and is not decorative.** State B must be able to fill
the view for the departure to complete. It failed at exactly one class and only a browser found it:
at 768×1024, work + résumé + crosslink + footer came to **1012px against a 1024px viewport**, so the
document's maximum scroll offset was 1012px and *a page that cannot scroll a full viewport cannot
complete the departure* — `scrollY=1012, photosBottom=12, NOT DEPARTED`. Tablet portrait is the only
class tall enough in absolute pixels to run out of document before it runs out of viewport.

### 6.3 The peek grid — column count is a function of available *height*

`home_config.peekIds` is six and **six render at all six classes.** Reflow, never hide: dropping to
four on a narrow screen means two of the six photographs Akhil chose do not exist on that class, and
there is no summary edition of a portfolio to fall back to.

The naive instinct — narrower viewport, fewer columns — is **backwards**. Fewer columns means more
rows means taller. **CARRIED**, measured in a real browser at all six classes:

| Class | Viewport | Arrangement | Tile (measured) | Gallery height |
|---|---|---|---|---:|
| 1 folded cover | 344 × 882 | **2 × 3 at 3:2** | 148 × 99 | 329 |
| 2 phone portrait | 390 × 844 | **2 × 3 at 3:2** | 163 × 109 | 359 |
| 3 foldable unfolded, narrow end | 673 × 620 | **3 × 2 at 16:9** | 192 × 108 | **232** |
| 4 tablet portrait | 768 × 1024 | **3 × 2 at 3:2** | 224 × 149 | 314 |
| 5 tablet landscape | 1024 × 768 | **3 × 2 at 16:9** | 299 × 168 | 352 |
| 6 laptop | 1440 × 900 | **3 × 2 at 3:2** | 317 × 212 | 440 |

- **Column count steps on the width rungs 375 / 673 / 1024. Tile aspect steps on a *height* rung at
  800px.** That is not an aspect-ratio branch — it is a query on the axis the budget is denominated
  in. 3:2 at 1024×768 needs 418px of gallery against 637px minus ~246px of chrome; it does not fit,
  and at 900px tall it does.
- **Gap is `--space-4` (16px)** at every class — the same value Act 2's grid snapped the handoff's
  off-grid 14px to, so the two grids on one page agree.
- **The peek grid is a grid at every class and NEVER a horizontal rail.** A rail fits any budget,
  which is what makes it tempting, and it nests a horizontal scroller inside this page's vertical
  snap container — on iOS a horizontal rail readily steals the vertical gesture. `/photos` *is* a
  rail at classes 1–2 precisely because it has no vertical snap container. **Same pattern, opposite
  verdict, and the reason is the container.**
- **`object-position` comes from `home_config.peekPositions`**, defaulting to `50% 50%`. One entry
  exists: `architecture-hawamahaldaytime: "50% 25%"`. Same grammar as the photo schema's
  `focalPoint`, deliberately.
- **`alt` is the photo's own `alt`, never its `title`.** `deferred-items.md` D-24-1 records
  `home.astro:154 alt={p.title}` as a **public** defect on the site's primary route: six images
  announcing their name where their description belongs, to exactly the readers who cannot see them.
  All 39 real `alt` strings are committed and reviewed. Fix it here.

### 6.4 Act 2 — the auto-fit grid, and the one class where it must be verified

**The featured-first arrangement in the committed screenshots is superseded.** Akhil rejected it:
he intends to add more projects and wants **every project to carry equal weight**, which rules out a
featured slot and any fixed arrangement that must be redesigned when the count changes. The deciding
constraint is Act 2's own mechanism — a grid that grows with the project count eventually pushes the
résumé below the fold and breaks the thing it lives inside.

```css
.hm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: var(--space-6);                                     /* classes 1–2 */
}
@media (min-width:  673px) { .hm-grid { gap: var(--space-8); } }
@media (min-width: 1024px) { .hm-grid { row-gap: var(--space-10); column-gap: var(--space-14); } }
```

- **`min(300px, 100%)` is the guard, not a style choice.** A bare `minmax(300px, 1fr)` in a 312px
  content box overflows once the gap is counted, which presents as a horizontal scroll — the R-6
  violation `.ha-grid` already produced once at 344 (`doc=356/344`, and it was proved pre-existing
  rather than caused by the gutter ladder, by overriding `--pub-gutter` at runtime). The guard makes
  the failure unrepresentable rather than merely unlikely.
- **Six-project cap.** `projects.slice(0, 6)`, in file order, with an "**All work →**" link to
  `/work`. `/work` is the complete two-band list, so Home is a teaser by design and a seventh project
  needs no Home change.
- **`/work` gets the same reflow ladder:** one column at classes 1–2, two at 3–4, three at 5–6 —
  the same three rungs the shell steps at, so page and shell never disagree about which class they
  are in.

**The two dead gaps must close.** Reviewing the committed captures on 2026-08-23 found that at
**841 × 768** — the near-square foldable — "The résumé" sits on the bottom edge with its content cut
off, so *"work and résumé occupy the view"* fails at exactly one class. The capture carries two large
dead gaps: between the project grid and the *"By day —"* line, and again before "The résumé". Both
become **`--space-8` (32px)**. Chosen over letting Act 2 scroll below 900px (which would make the
near-square class behave unlike every other) and over shrinking the résumé block there (which would
leave it saying almost nothing at that width).

> **Phase 5 must verify Act 2 fits at 841 × 768 specifically, not only at 1440. It is the binding
> case.**

### 6.5 Snap and the scroll prompt

```css
@media (prefers-reduced-motion: no-preference) {
  html:has(.hm-a) { scroll-snap-type: y proximity; scroll-behavior: smooth; }
  .hm-a { scroll-snap-align: start; scroll-margin-top: var(--hm-above); }
  :global(html:has(.hm-a) #work) { scroll-snap-align: start; }
}
```

- **`proximity`, never `mandatory`.** State B is taller than the viewport at every class; under
  `mandatory` the browser can snap back past content the reader is trying to reach.
- **Snap lives *inside* `prefers-reduced-motion: no-preference`, and that is the non-obvious part.**
  Snap converts a small user gesture into a large involuntary viewport translation — exactly the
  class of motion the preference exists to suppress. Same for `scroll-behavior: smooth`, which is
  **opt-in, never opt-out**; written the other way round the accessible path becomes the exception.
- **Snap is never load-bearing.** Every state reachable with snap is reachable without it. Phase 0
  proved this by running the whole six-class departure audit under `RM=reduce` and passing.
- **`scroll-margin-top` on state A is required or the page snaps on load.** A snap area starts at
  the element's own box, which begins `--hm-above` down the document — close enough to the initial
  offset for proximity to pull it, so the page would scroll itself and hide the nav at first paint.
  Snap point two needs no outset.
- **`#work`'s own `scroll-margin-top` is `0`, and that is a measurement, not an omission.** The
  public nav is `position: static` at all six classes. It ships as `--hm-sticky-nav: 0` rather than
  being left out, because the value is a function of the shell: the moment the nav becomes sticky,
  that is the one line to change.
- **Astro scoping trap, and a grep cannot see it.** A page's scoped CSS cannot reach a component's
  root — a bare `#work { }` in `home.astro` matches nothing if the work band is its own `.astro`
  component, because Astro scopes each file with its own `data-astro-cid-*`.
  `getComputedStyle(work).scrollSnapAlign` reads `none` while the source says `start`. Use `:global()`
  and put the shared measurements on the document element so they inherit. **This defect has now
  appeared twice in this project in two costumes and passed the plan's grep gate both times.**

### 6.6 Accessibility of the two-state landing

1. **DOM order is reading order is tab order** — photos, then work, then résumé.
2. The transition is achievable with **zero `order`, zero `position: fixed` on a focusable element,
   and zero positive `tabindex`.** If a composition cannot be built inside that constraint, the
   composition is wrong — not the requirement.
3. **Nothing is hidden from assistive technology.** State A moving out of view is a *scroll
   position*. `display: none`, `visibility: hidden`, `aria-hidden` and `inert` are all **forbidden**
   on either state. This is the trap the framing invites: hiding the inactive state would delete the
   photo gallery from every screen-reader user. A screen-reader user reads photos → work → résumé
   linearly and never encounters the two-state framing at all, which is the correct outcome.
4. Three named landmarks: `aria-label="Photographs"`, and `aria-labelledby` on the work and résumé
   sections pointing at their headings.
5. The prompt is `<a href="#work">`, not a chevron, not a `<div onclick>`, not a button calling
   `scrollIntoView`. One Tab and one Enter, works with zero JS, appears in the a11y tree, and
   functions as a skip link.

### 6.7 The `{{ds.componentCount}}` token — how to resolve it

`data/projects.json`'s design-system description is
`"{{ds.componentCount}}-component React library with semantic tokens, dark mode, and live Storybook docs."`
and `ProjectSchema` **refuses** any description carrying a literal component figure (`/\b\d+[- ]component/i`),
because the number went stale three times in nine days and was hand-repaired once.

**Resolve it at build time from the installed package's README, with the same regex the design
system's own CI asserts against.**

```ts
// src/lib/ds-component-count.ts — server-only, run in Astro frontmatter
const README = readFileSync(require.resolve("@akhil-saxena/design-system/package.json")
                              .replace(/package\.json$/, "README.md"), "utf8");
const m = /\*\*(\d+) components across (\d+) categories\.\*\*/.exec(README);
if (!m) throw new Error("…"); // fail the build; a missing count must not render as a token
```

**MEASURED** against the shipped tarball: the regex matches, and returns **81** components across
**10** categories.

**Why the README and not a directory count.** `dist/components/*.js` is **83**. The design system's
`src/overview-links.test.ts` names the two deliberate exclusions — `Field` (not a rendered component)
and `IconButton` (catalogued under `Button`) — and asserts README, the shipped catalogue and the
`src/` listing all agree. 83 − 2 = 81, and the two figures reconcile exactly. Counting `dist/`
would ship 83 and encode the exclusion list in the consumer.

**Fail loudly.** A missing or unmatched regex must throw. Rendering the literal `{{ds.componentCount}}`
on the page a hiring manager reads first is the failure this token exists to prevent, and
`{{ds.componentCount}}` passes `ProjectSchema` — the schema bans the figure, not the token.

`00-COPY/one-liners.md` says 79 and the committed captures say 80. **Do not fix either by hand** —
the whole point of deriving it is that no hand-maintained copy of the number should exist.

---

## 7. Photos — the masonry gallery (PUB-03, PUB-05)

### 7.1 The grid

39 photographs, **no pagination**. It is not an optimisation to skip it — it is measured:
**all 39 `small` variants total 0.86 MB** (MEASURED this session; `medium` 2.96 MB, `large`
5.67 MB). The handoff's "SHOWING 8 OF 39" implies a truncation that does not exist.

Mechanism: **CSS `column-count`.** It is the only zero-JS masonry, and QUAL-03 permits layout CSS.
Its cost is column-major DOM order, which is also the reading order of a column layout, so nothing
is lost.

```css
.ph-masonry { column-count: 1; column-gap: var(--space-4); }
.ph-masonry > * { break-inside: avoid; margin-bottom: var(--space-4); }

@media (min-width:  375px) { .ph-masonry { column-count: 2; } }
@media (min-width:  673px) { .ph-masonry[data-cols="3"] { column-count: 3; } }
@media (min-width: 1024px) { .ph-masonry[data-cols="3"] { column-count: 3; } }
```

**Columns come from `site_config.json`, and the config value is the class-5/6 value.** MEASURED:
seven `{id,label,columns}` records, alphabetical, no `"all"` record, `defaultColumns: 3`. Only two
values occur — `3` for `abstract` and `architecture`, `2` for the other five. So
`data-cols` is `2` or `3` and **two explicit rules cover every case; no `min()` inside
`column-count`, no math function, no risk.**

| Class | `columns: 2` category | `columns: 3` category | `/photos` (`defaultColumns: 3`) |
|---|---:|---:|---:|
| 1 (≤ 374) | 1 | 1 | 1 |
| 2 (375–672) | 2 | 2 | 2 |
| 3–4 (673–1023) | 2 | 3 | 3 |
| 5–6 (≥ 1024) | 2 | 3 | 3 |

**This departs from the Phase 0 sketch at narrow classes only, and deliberately.** The sketch is a
flat three columns at every width — 105px tiles at 390px, which is not a photograph — and its own
on-page annotation says so: *"D-25 — NOT FIXED HERE, ON PURPOSE… The column counts that drift are
meant to drive are therefore unreachable, which is why this masonry is a flat three columns."* At
1440 nothing moves, so nothing Akhil reviewed changes.

**Order:** `/photos` sorts by `order`; `/photos/[category]` sorts by `categoryOrder`. **MEASURED:**
`order` is dense 1…39, and `categoryOrder` is dense 1…n within all seven categories. Never sort by
`date` — see §9.4.

### 7.2 CLS reservation — from the ratio, never from the pixels

```html
<a class="ph-tile" href="/photos/{category}/{slug}"
   style={`aspect-ratio:${d.width} / ${d.height}; background-image:url("${urls.thumb}")`}>
  <img src={urls.medium} srcset={…} sizes={…} alt={photo.alt} loading="lazy" decoding="async" />
</a>
```

**The ruling: `dimensions` supplies the aspect ratio and nothing else.** It is the intrinsic size of
the **source photograph**, not of `urls.original`. Writing `width={photo.dimensions.width}` on an
`<img>` whose `src` is `urls.original` states 4608 for a 2000px image — harmless for layout, wrong
for anything reasoning about bytes.

**Evidence it is safe:** across all 39, the manifest ratio and the served ratio deviate by **0%
above the 1% threshold**, and the single record where the absolute sizes differ deviates by
**0.025%** in ratio.

Do **not** emit `width` / `height` attributes. `aspect-ratio` + `width: 100%` reserves the box
correctly. **UNVERIFIED:** Lighthouse's `unsized-images` audit accepts a CSS `aspect-ratio` on a
`width`-constrained image; confirm this against a real Lighthouse run before QUAL-01 is measured,
and if it flags, the fix is to emit the *served variant's* size —
`width={Math.min(800, d.width)} height={Math.round(Math.min(800, d.width) * d.height / d.width)}` —
never the manifest's raw numbers.

### 7.3 Blur-up — CSS only, zero JS, no white flash

**The LQIP is the tile's own `background-image`, sized `cover`.** The `<img>` sits on top and, when
its bytes decode, paints over its own background. There is no `load` event to listen for, so there is
nothing to hydrate; the browser's upscaling of a 40px-wide WebP supplies the blur without a `filter`.

```css
.ph-tile { display: block; background-color: var(--cream-2); background-size: cover;
           background-position: center; overflow: hidden; border-radius: 10px; }
.dark .ph-tile { box-shadow: inset 0 0 0 1px var(--rule); }   /* §4.4 rule 2 */
.ph-tile img { display: block; width: 100%; height: auto; }
```

- **`background-color: var(--cream-2)`, not white.** The base64 URI decodes essentially instantly,
  but the surface underneath it must still be a page colour. A white-backed placeholder flashes hard
  on `#0d0d0f`, and that has been a recorded Phase 5 build note since the ivory→charcoal resolution.
- **MEASURED:** the 39 `thumb` values total **22,085 base64 characters** (min 207, median 495, max
  1,275) ≈ **16 KB of decoded bytes** inlined into the `/photos` HTML. Acceptable; record it against
  QUAL-01 and re-check if the document exceeds ~120 KB uncompressed.
- **`THUMB` is `{ width: 40, quality: 60 }`** — MEASURED, `src/lib/photo-pipeline.ts:336`.

### 7.4 `srcset`, derived from `VARIANTS` and never from literals

**MEASURED**, `src/lib/photo-pipeline.ts:318`:

```ts
export const VARIANTS = [
  { urlKey: 'original', suffix: '',    maxWidth: 2000, quality: 85 },
  { urlKey: 'large',    suffix: '-lg', maxWidth: 1200, quality: 85 },
  { urlKey: 'medium',   suffix: '-md', maxWidth:  800, quality: 85 },
  { urlKey: 'small',    suffix: '-sm', maxWidth:  400, quality: 80 },
];
// resize is sharp(buf).resize({ width: Math.min(maxWidth, sourceWidth), withoutEnlargement: true })
```

Resize is **by width, capped, never enlarged**. Therefore the width descriptor for each variant is
exactly `Math.min(variant.maxWidth, photo.dimensions.width)` — no served size needs storing.

**Verified against real bytes on seven records spanning the edge cases**, including the two whose
source is under a cap:

| Record | source w | original | large | medium | small |
|---|---:|---|---|---|---|
| `nature-fairwayreflections` | 4608 | 2000×1333 | 1200×800 | 800×533 | 400×267 |
| `architecture-redbuilding` | 1920 | **1920**×1280 | 1200×800 | 800×533 | 400×267 |
| `abstract-plane` | 1318 | **1318**×2341 | 1200×2131 | 800×1421 | 400×710 |
| `architecture-officegreens` | 2000 | 2000×3553 | 1200×2132 | 800×1421 | 400×711 |

`min(2000, 1920) = 1920` ✅, `min(1200, 1318) = 1200` ✅. The formula holds on every measured case.

```ts
const srcset = VARIANTS
  .map(v => `${photo.urls[v.urlKey]} ${Math.min(v.maxWidth, photo.dimensions.width)}w`)
  .join(", ");
```

`sizes`, per the column ladder, written as one string per page:

```
sizes="(min-width:1024px) calc((min(100vw, 1280px) - 96px - 32px) / 3),
       (min-width: 673px) calc((100vw - 64px - 32px) / 3),
       (min-width: 375px) calc((100vw - 48px - 16px) / 2),
       calc(100vw - 32px)"
```

Emit the `/2` form for `columns: 2` categories. Derive the gutter and gap numbers from the same
constants the CSS uses; a `sizes` that disagrees with the layout is a silently wrong download size.

**Import constraint.** `photo-pipeline.ts` imports `node:crypto` at module scope and its own header
records that it is written for a Node runner. **Import `VARIANTS` in `.astro` frontmatter only —
never inside a `.tsx` island.** The Lightbox receives finished `srcSet` strings as props and never
imports the module. §5.3 assertion 5 enforces this. **UNVERIFIED** that a prerendered Astro page can
import it cleanly under the Cloudflare adapter; **measure it in the first Phase 5 wave**, and if it
fails, the fix is to move `VARIANTS` and `THUMB` down into a Node-free module that
`photo-pipeline.ts` re-exports — **never a second copy of the numbers.**

### 7.5 `loading` and `decoding`

`loading="lazy" decoding="async"` on every tile **except the first four**, which take
`loading="eager" fetchpriority="high"` so the LCP candidate is not deferred. Home's six peek photos
are all above the fold at every class and all take `loading="eager"`.

---

## 8. Category filtering (PUB-04) — real links, zero JavaScript

### 8.1 Routes

| Route | Content | Sort |
|---|---|---|
| `/photos` | all 39 | `order` |
| `/photos/abstract` … `/photos/wildlife` | that category | `categoryOrder` |

Seven prerendered category routes from `site_config.categories`, plus `/photos`. **No `"all"`
record exists in the config and none is invented** — `/photos` is the unfiltered route and takes
`defaultColumns: 3`. Generate the routes with `getStaticPaths()` from the config, never from a
hardcoded list, so a Phase 7 category addition produces a route without a code change.

### 8.2 `FilterNav`, and why it is not `SegmentedControl`

**MEASURED**, `dist/components/FilterNav.d.ts` and `chunk-ZNX6U4ZE.js` — G-9 shipped, and the
component's own docstring names PUB-04 by number:

| | `SegmentedControl` | `FilterNav` |
|---|---|---|
| container | `role="radiogroup"` | `<nav aria-label>` |
| item | `<button role="radio">` | `<a href>` |
| selection | `aria-checked` + `onChange` | `aria-current="page"` |
| JS | required (controlled state) | **none** |

```astro
<FilterNav
  items={[{ href: "/photos", label: <>All <span class="ph-count">· 39</span></> },
          ...categories.map(c => ({ href: `/photos/${c.id}`, label: <>{c.label} <span class="ph-count">· {n}</span></> }))]}
  activeHref={active}
  ariaLabel="Photo categories"
  size="lg"
/>
```

Three implementation notes, each measured out of the source:

- **`label` is `ReactNode`**, so the per-category count in the reviewed capture (`ALL · 39`,
  `ARCHITECTURE · 14`) composes without a second component.
- **`activeHref` must match an item `href` exactly** — the component does
  `items.findIndex(i => i.href === activeHref)` and, on no match, simply marks nothing current.
  Astro's directory build format serves `/photos/street/` with a trailing slash. **Normalise
  `Astro.url.pathname` before passing it**, and assert in a test that every one of the eight pages
  renders exactly one `aria-current="page"`. A silent zero is the failure mode here.
- **`FilterNav` rejects any href that is not `/`, `#` or `.`-leading** and renders it as a
  `<span data-rejected="true">` in `--ink-3`. All eight hrefs are root-relative, so none is rejected
  — but a future absolute URL would silently stop being clickable while still looking present.

### 8.3 The rail at classes 1–2, and the hit-area floor

Eight anchors at 312px content, at a 44px hit height, wrap to as many as **four rows — 176px of an
~800px viewport spent on a filter row.** Measured as a rail it is **52px**.

```css
@media (max-width: 672px) {
  .ph-filters { flex-wrap: nowrap; overflow-x: auto; min-width: 0;
                scroll-snap-type: x proximity; }
}
```

- **`min-width: 0` is load-bearing.** `.ph-filters` is a flex item, and a flex item's default
  `min-width: auto` refuses to shrink below min-content — which, once the row is `nowrap`, is the
  sum of all eight pills. Without it the rail does not scroll: it blows the header out and reopens
  the horizontal scroll.
- **`scroll-snap-type` without `scroll-snap-align` on the children is a rail that declares snapping
  and does not snap.** Phase 0's first build shipped exactly that; a probe caught it
  (`getComputedStyle(pill).scrollSnapAlign === "none"` while the container read `x`). Chromium
  serialises `x proximity` as `x` because `proximity` is the initial strictness, so `snap=x` in a
  probe is positive confirmation it is *not* `mandatory`.
- **`scroll-snap-align: start` on the pills requires selecting `.ds-atom-segmented-btn` from the
  consumer**, because `FilterNav`'s `className` reaches the `<nav>` only. That is a descendant
  layout rule, not a restyle, and QUAL-03 permits it — but it is a reach into a design-system class
  name and it belongs in **OQ-4** alongside the hit-area gap.
- **The 44px floor is NOT met by the component.** MEASURED: `[data-size="lg"]` is **40px** and
  `primitives.css` carries no `pointer: coarse` rule for it. See **OQ-4**.

### 8.4 The filter pill's visual contract

**The active pill's meaning is "maximum contrast against the field", not "dark".** On the ivory
prototype it was filled dark; mapping the literal colours onto a dark page produces a pill invisible
against it. On monochrome dark the active pill fills **light** — `--ink` background, `--ink-inverse`
text — which is exactly what `.ds-atom-segmented-btn[data-active]` already resolves to now that the
accent is the ink. Reviewed and **PASSED** at 1440 and 390 on 2026-08-22.

Inactive pills keep an outline, and that outline is **`--wire`, not `--rule`** — a filter pill is an
interactive control and its border is its only boundary (WCAG 1.4.11, 3:1). Measured `--wire`:
3.78 / 3.48 / 3.23 dark, 3.38 / 3.47 / 3.21 light.

---

## 9. The lightbox and the photo pages (PUB-06 · PUB-07 · PUB-08 · PUB-09)

### 9.1 `Lightbox` — DS-07 / G-14 verified against the shipped chunk

**MEASURED**, `dist/components/Lightbox.d.ts` and `chunk-4I5ZCPSS.js`:

| DS-07 clause | Evidence |
|---|---|
| backdrop-click close | present, and *"deliberately not suppressible"* per its docstring |
| `srcset` | `LightboxItem.srcSet` + `sizes`; `srcSet` emitted twice in the chunk. Omitting it emits **no** `srcset` attribute — an empty `srcset=""` is not the same thing. |
| **swipe** | `onPointerDown` / `onPointerUp` / `onPointerCancel` (×2 each), with a `gestureRef` recording `{x, y, startedOnBackdrop}` |
| `aria-live` slide announcement | `<div class="ds-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>` |
| keyboard | `role="dialog"` + `aria-modal`, `useFocusTrap`, ArrowLeft/Right + Escape on a document listener, wrap-around navigation |

**G-14 is closed. Do not re-implement any part of it.**

**One property that matters for PUB-12:** the docstring records an *"always-dark invariant (NO
`:root.dark` overrides)"*. The lightbox is dark in light mode too. That is correct — the image is
the surface — and it must not be "fixed" to follow the theme.

### 9.2 How the island is wired without hydrating the grid

The grid stays **static Astro HTML**. A thin island carries the `Lightbox` and a delegated click
listener; it renders nothing of its own until opened.

```astro
<div id="ph-grid" class="ph-masonry" data-cols={cols}> …39 anchors… </div>
<PhotoLightbox client:idle items={items} gridSelector="#ph-grid" />
```

- Each tile is `<a href="/photos/{category}/{slug}" data-lb-index={i}>`. The island intercepts the
  click on a modified-key-free left click and opens at that index; it calls `preventDefault()` only
  once it has opened.
- **With JavaScript off, or before the island idles, every tile is a working link to a prerendered
  page.** That is the same mechanism satisfying PUB-04's crawlability, PUB-06's lightbox, PUB-09's
  per-photo page and the Back button — one decision, four requirements.
- **`client:idle`, not `client:load`.** The gallery's LCP is an image; the lightbox is not needed
  until a click. **UNVERIFIED:** whether `client:idle` measurably improves the Lighthouse score over
  `client:load` here — measure both on `/photos` before QUAL-01 is judged and keep the better one.
- The island must **push a history entry** on open and close on `popstate`, so the Back button
  dismisses the lightbox rather than leaving the page. Without it the Back-button guarantee holds for
  the no-JS path and breaks for the JS path.

### 9.3 EXIF — omitted entirely, never placeheld (PUB-07)

**MEASURED across all 39:**

| Field | null count |
|---|---:|
| `camera` | **1** |
| `lens` | **11** |
| `aperture` · `shutter` · `iso` · `focalLength` | **2** each |
| *at least one field null* | **11** |

Two records need the degenerate cases, and both are real:

- **`architecture-redbuilding`** — camera present, everything else null.
- **`product-peppers`** — **all six fields null.** The whole EXIF block must be absent: no heading,
  no rule, no empty panel. A "Details" heading over nothing is the placeholder PUB-07 forbids,
  wearing a different hat.

> **The rule: render a row only if its value is non-null. Render the EXIF block only if at least one
> row survives. Never `—`, never "Unknown", never an empty `<dd>`.**

`place` follows the same rule and is present on **16 of 39** — reviewed, and deliberately empty on
the other 23 because *"an empty description renders nothing at all — no em dash, no gap."*

Layout: a `<dl>`, label in IBM Plex Mono `--text-xs` 11px `--ls-wide` at `--ink-3`, value in DM Sans
`--text-sm` 12.5px at `--ink-2`.

`aperture`, `shutter` and `focalLength` are already display-ready strings —
**MEASURED** distinct values: `f/1.8 … f/13`, `1/25 … 1/3200`, `4.3mm … 300mm`. `iso` is a number:
render as `ISO 200`. The single ugly value is `wildlife-starfish`'s `"4.745mm"`; **render it
verbatim.** A rounding rule for one record is a second formatter earning its keep once.

### 9.4 `date` — do not display it, do not sort by it

**MEASURED: the 39 records carry exactly two distinct dates — `2026-03-28` and `2026-04-07`.**
That is a ten-day ingest window, not a capture history. Sorting by it is meaningless and displaying
it misrepresents when the photographs were made.

`REQUIREMENTS.md` §Out of Scope already settled this: *"Photo date display or sorting — The stored
dates are ingest dates from a 10-day window, not capture dates — showing them would misrepresent the
work."* The brief asks this document to decide what to call the field. **It is not rendered, so it
needs no name.**

The permanent split the brief describes — existing records meaning "published", future records
meaning "taken" — is exactly why. A renderer that displayed the field would imply one meaning for
both, and the reconciling backfill is impossible. **Add `scripts/assert-photo-date-unrendered.mjs`:
`photo.date` may not be referenced from any file under `src/pages/photos*` or `src/components/Photo*`.**
Give it a canary and an anti-canary like every other gate here.

### 9.5 Camera and lens as human names (PUB-08)

**MEASURED — the raw corpus is closed and small:**

| Raw `exif.camera` | Photos | Display |
|---|---:|---|
| `NIKON CORPORATION NIKON D5300` | 31 | **Nikon D5300** |
| `samsung Galaxy Z Fold5` | 3 | **Samsung Galaxy Z Fold5** |
| `SONY ILCE-7CM2` | 2 | **Sony α7C II** |
| `samsung SM-N970F` | 1 | **Samsung Galaxy Note10** |
| `OnePlus AC2001` | 1 | **OnePlus Nord** |
| `null` | 1 | *(row omitted)* |

| Raw `exif.lens` | Photos | Display |
|---|---:|---|
| `18.0-55.0 mm f/3.5-5.6` | 18 | **18–55mm f/3.5–5.6** |
| `null` | 11 | *(row omitted)* |
| `70.0-300.0 mm f/4.5-6.3` | 5 | **70–300mm f/4.5–6.3** |
| `Samsung Galaxy Z Fold5 Rear Wide Camera` | 3 | **Wide** *(the body is already named on the row above)* |
| `FE 28-60mm F4-5.6` | 2 | **Sony FE 28–60mm f/4–5.6** |

**It is a lookup table, not an algorithm, and the measurement is what decides that.** A prettifier
that strips the manufacturer prefix and title-cases would get `NIKON CORPORATION NIKON D5300` right
and would produce `SM-N970F`, `AC2001` and `ILCE-7CM2` unchanged — **three of the five non-null
camera strings are model codes no algorithm can decode.** The three were resolved from the
manufacturers' own model listings rather than guessed:

- `SM-N970F` → Galaxy Note10 ([Samsung support](https://www.samsung.com/levant/support/model/SM-N970FZKAMID/), [GSMArena](https://www.gsmarena.com/samsung_galaxy_note10-9788.php))
- `AC2001` → OnePlus Nord ([DeviceAtlas](https://deviceatlas.com/device-data/devices/oneplus/ac2001/59684389))
- `ILCE-7CM2` → Sony Alpha 7C II ([Adorama](https://www.adorama.com/isoa7cm2s.html))

**Where it lives:** `src/lib/exif-display.ts` — a pure module with no Node imports, importable by a
prerendered page and later by the Phase 7 admin.

**Not in the schema.** The schema stores what the camera wrote; that is the source of truth and it is
what a re-run of the pipeline would reproduce. **Not in the pipeline either** — rewriting at ingest
would destroy the raw value for the 39 records already committed, and there is no path to recover it.

**Fail loudly on an unknown string.** A build gate iterates every `exif.camera` and `exif.lens` in
`data/portfolio_images.json` and fails if any non-null value has no table entry, naming the value and
the photo. Rendering the raw code would ship `SM-N970F` to a reader; rendering a guess would ship a
lie. Refusing the build is the only option that does neither, and the table is a two-line edit.

### 9.6 The photo detail page (PUB-09)

`/photos/[category]/[slug]` — 39 prerendered pages, **zero framework JavaScript.**

- `<img src={urls.large}>` with the full `srcset`, `sizes="min(100vw, 1080px)"`, `loading="eager"`,
  `fetchpriority="high"`, and the same `aspect-ratio` + LQIP background as the tile.
- Below the frame: `title` (Playfair 22px), `place` if present, then the EXIF `<dl>`.
- **Previous / next as real anchors**, in `categoryOrder` within the category, wrapping. Plus a
  "← All photographs" link and a link to the category.
- `alt` is the photo's own `alt`. The `<h1>` is the `title`. **They are different strings by rule and
  by gate** — no value equals its own title, machine-checked after every edit in Phase 0.
- Social card (SEO-01): `og:image` = `urls.large` (**MEASURED 1200w**, the OG recommended width),
  `og:image:alt` = `photo.alt`, `twitter:card` = `summary_large_image`, `og:type` = `article`,
  canonical = the page's own absolute URL.

---

## 10. Work (PUB-02)

Structure, as reviewed at 1440 on 2026-08-22:

1. **Header** — "Things I design and build**.**" · Playfair 44px/700 · the period in `--ochre-d`.
2. **Sub-paragraph** — DM Sans 13px, capped at 480px.
3. **`PROFESSIONAL EXPERIENCE`** — mono eyebrow 11px `--ls-wide`.
4. **Three employment rows**, hairline-separated, **capped at 1080px inside the 1280px page**
   (J3 CONFIRMED: *"it's fine"* — the cap makes each row read as one row rather than a serif title
   and a mono metric floating apart, and the two bands read as two kinds of evidence). Company in
   Playfair 22px/700, role · period in DM Sans 13px `--ink-3`, metric right-aligned in mono 11px
   `--ochre-d-strong`.
   - **Period comes from `src/lib/period.ts`'s `formatPeriod()`** — already written, already the one
     definition of the invariant, already asked by `ResumeSchema`'s refinement. Do not format dates
     in a page.
   - **The metric has no field. See OQ-1.**
5. **`PROJECTS`** — mono eyebrow, with `FIVE — SHIPPED ON MY OWN` right-aligned.
6. **Card grid** — one column at classes 1–2, two at 3–4, three at 5–6.
7. **Italic serif cross-link**, right-aligned, above the footer: *"see the photographs →"* ·
   Playfair italic 17px in `--ochre-d`.

### 10.1 Every card links straight out — no case studies at launch

Phase 6 moved after cutover, so a card's title and its whole surface link to `project.href`:

| Project | `href` | MEASURED from `data/projects.json` |
|---|---|---|
| cairn | `https://cairn.co.in` | ✅ |
| hued | `https://play.google.com/store/apps/details?id=app.hued` | ✅ |
| momentum | `https://play.google.com/store/apps/details?id=com.momentum.goals` | ✅ |
| timeshift | `https://chromewebstore.google.com/detail/timeshift-global-timezone/bnghkolhekleahihlmpjniedgedjphel` | ✅ |
| design-system | `https://design-system-ed1.pages.dev` | ✅ |

All external anchors carry `rel="noopener noreferrer"` and `target="_blank"`, with a visually-hidden
"(opens in a new tab)" so the target change is announced.

`project.badges[]` renders as a row of small outbound links (Play Store, GitHub, Chrome Store) using
`project.badges[].icon` mapped to a lucide icon. **`badges[]` is a link list. It is not the status.**

### 10.2 The status badge is `StatusPill`, not `Badge` — and the design system built it for this

**MEASURED**, `dist/components/StatusPill.d.ts` — G-5 shipped a generic tone path alongside the
job-domain preset, and its docstring names this exact surface:

> *"The generic path always renders a `<span>`. A status read out of content is not a control — a
> `Live` / `Maintained` / `Archived` label on a public Work card has nothing to activate."*
>
> *"The generic path renders a leading marker whose SHAPE is driven by `data-step`, so the three-way
> split survives greyscale and colour blindness. F-15-5 measured D-45's three statuses at a 1.02:1
> fill separation — 'only the words separate them, at 9.5px' — and a fill ladder alone would still be
> a colour distinction."*

**MEASURED**, `dist/css/statuspill.css` — the fill ladder is `color-mix(in srgb, var(--ink) N%,
var(--paper))` at N = 16/27/38 in light and **7/15/22 in dark**, with a comment recording that the
light percentages would overshoot the dark run and drop step 3's text to 4.51:1. The marker is
`transparent` with a 1.5px border at step 1 and square-cornered at step 3.

```tsx
<StatusPill tone="success" label="Live" />
<StatusPill tone="muted"   label="Maintained" />
<StatusPill tone="secondary" label="Archived" />
```

Tone vocabulary is `primary | secondary | muted | accent | danger | success` (MEASURED,
`tone-D_FdXB6H.d.ts`). **`Badge`'s own docstring points here for exactly this case**, and F-15-5 is
closed. Do not use `Badge` for a three-way status.

**The Phase 0 finding that `tone="accent"` renders the design system's yellow is also closed:**
monochrome now declares `--amber`, `--amber-d`, `--amber-ink`, `--amber-l`, `--amber-soft`,
`--amber-vivid` and `--amber-warm` in both blocks (MEASURED), so the declarative tone axis resolves
to the ink ramp. Phase 5 may use `tone=` freely and **must not** reach for a token by name through
the legacy `color` prop the way the Phase 0 sketches had to.

**Which project is which status is not in the data. See OQ-1.** `00-COPY/one-liners.md` carries the
reviewed values with their reasons (`badge: Live` for design-system and cairn; `Maintained` for hued,
momentum and timeshift, each because the repo ships a released version with no changelog showing
continuing work — *the conservative reading, per D-45*).

### 10.3 `Card` composition

`<Card className="wk-card" variant="glass" padding="lg" hover>` — MEASURED: `Card` concatenates
`className` and no longer inlines `display`, so `.wk-card { display: flex; flex-direction: column }`
now applies and `.wk-tags { margin-top: auto }` bottom-aligns the tech chips as designed. Both were
broken in Phase 0 and both were consumer errors (`class` instead of `className`) rather than
component defects.

Card boundary on dark is **`--wire`**, per §4.4 rule 1. Reviewed **PASS** — *"cards hold their edges;
borders carry the boundary rather than the fill, as the resolution intended."*

---

## 11. Résumé (PUB-10 · PUB-11 · SEO-02)

The page stays. Two reasons the roadmap amendment gives and this document restates because they
change the design: **Act 2 holds work *and* résumé in one viewport, so removing the page empties half
the mechanism**; and an HTML résumé is crawlable and linkable where a PDF is neither.

### 11.1 Structure

`resume.json` is `{ experience, skills, education }` and nothing else. **MEASURED: there is no prose
summary field**, so the page states the shape of the record rather than paraphrasing it. Inventing a
summary sentence would put copy on the page that exists in no fixture and that nobody owns.

1. `<h1>` Akhil Saxena · Playfair 44px/700.
2. One line: current role · company · period, from `formatPeriod()`.
3. **Download the PDF** — `<Button as="a" href="/resume.pdf" download>` (MEASURED: `public/resume.pdf`
   exists). The button lives **on this page**, not in the nav, per the roadmap amendment: *"for the
   recruiter who wants the file."*
4. **Experience** — three entries, **13 bullets** (6 + 3 + 4, MEASURED).
5. **The employment metric**, on each experience entry's header row — the same `metric`
   `{ value, label }` pair §10 puts on `/work`'s employment band, in the same treatment: IBM Plex
   Mono `--text-xs` 11 / 500 / `--ls-wide`, the value in `--ochre-d-strong` and the label on the
   ink ramp, right-aligned above the 673px rung and stacked under the identity below it.
   **AMENDED 2026-08-29, and this list was wrong rather than incomplete.** The band has rendered
   here since 05-10, on Akhil's instruction. 05-15 measured it at all six device classes — 116 × 17,
   never wrapping, never colliding, never overflowing, colours identical to `/work`'s — and Akhil
   confirmed it stays. A structure list that omits a shipping element is how the element gets
   deleted by someone reading the list as exhaustive; `src/schemas/resume.ts` carried the mirror
   error at the field itself and was corrected in the same commit.
6. **Skills** — three groups, rendered as `Chip` rows.
7. **Education** — one entry with its `leadership` bullets.

### 11.2 Bullets render as elements, never as an HTML string

**`<Bullets items={entry.bullets} />` from `src/components/Bullets.tsx` is the only renderer.** It is
already written, already tested, and imports `parseBullet` from `src/lib/bullets.ts` rather than
restating the grammar.

- **MEASURED: 13 bullets, zero `<` characters, 17 bold spans, one literal `&`** (`upsell &
  cross-sell` in `pharmeasy#2`), longest bullet 141 characters.
- **Do not add an escaper.** React escapes text children by construction; a second one would
  double-encode that `&` into `&amp;amp;` and render visibly wrong. The suite already asserts the
  rendered corpus contains exactly one `&`.
- `dangerouslySetInnerHTML`, `set:html` and `.innerHTML` are all banned under `src/` by
  `scripts/assert-no-raw-html-sinks.mjs`, **and an allowlist can never forgive a use form** — only
  prose about one. This is the constraint that decides §12.3.

### 11.3 The print stylesheet — what it is for

**Intent: a recruiter presses ⌘P and gets a résumé, not a screenshot of a website.** Two pages of
A4/Letter, all thirteen bullets present, every URL recoverable on paper.

| Concern | Rule |
|---|---|
| Page | `@page { margin: 15mm }` |
| Removed | AppBar, footer, theme toggle, the PDF-download button (a printed page telling you to download a PDF is noise), cross-links, the peek/photo furniture |
| Type | Body moves from the `--text-base` (13px ≈ 9.75pt) role to the **`--text-md` (15px ≈ 11.25pt)** role; entry titles to `--text-lg` 17px. **This is a role change, not a token change** — nothing redefines `--text-*`. |
| Breaks | `break-inside: avoid` on each experience entry, each skill group and the education block; `break-after: avoid` on every heading |
| Links | `a[href^="http"]::after { content: " (" attr(href) ")" }` so URLs survive paper |
| Measure | The 68ch cap becomes the print column; no fixed px width |

**The mode problem, stated honestly.** The public default is dark, and a dark page prints as a black
field or gets colour-adjusted unpredictably. The theme has **no `@media print` block** — MEASURED,
`themes/monochrome.css` contains zero at-rules by design, and CSS cannot remove the `.dark` class the
dark block is scoped to. The chosen fix is the smallest one that restates no token:

```js
// inside the single inline theme script — §12.1
addEventListener("beforeprint", () => document.documentElement.classList.remove("dark"));
addEventListener("afterprint",  () => applyStoredTheme());
```

**Residual risk, recorded not hidden:** some headless print-to-PDF paths do not fire `beforeprint`.
**The gap is filed upstream** — the theme should carry a print block or expose the light block under
a hook. Do **not** close it locally by restating the ten surface and ink tokens inside
`@media print`; that is the workaround the Core Value forbids, and it would silently drift from the
theme on the next release. See **OQ-5**.

---

## 12. Theme, motion and SEO

### 12.1 No flash of the wrong theme (PUB-12)

**MEASURED, and it is a gap: `2.0.0-beta.1` ships no no-flash module.** The exports map is
`.`, `./hooks`, `./icons`, `./components/*`, `./tokens.css`, `./primitives.css`, `./utilities.css`,
`./themes/*.css`, `./fonts/*.css`, `./css/*` — nothing else. There is no `applyTheme`, no
`useTheme`, no theme entry point, and `grep -rl localStorage ../design-system/src/` finds only
`Coachmark`, `AppShell`, `useResizableColumns` and `Autocomplete`. **D-34 was decided in DSGN-05 and
Phase 1 did not ship it.**

So Phase 5 writes it locally, and that is a finding to file, not a preference. See **OQ-3**.

**The mechanism, and why it cannot flash:**

```html
<html lang="en" data-brand="monochrome" class="dark">
<head>
  <script is:inline>
    (function () {
      var d = document.documentElement, s = null;
      try { s = localStorage.getItem("theme"); } catch (e) {}
      if (s === "light") d.classList.remove("dark");
      addEventListener("beforeprint", function () { d.classList.remove("dark"); });
      addEventListener("afterprint",  function () { if (s !== "light") d.classList.add("dark"); });
    })();
  </script>
```

- **`data-brand` and `class="dark"` are server-rendered attributes, not script-set.** A script that
  sets the brand paints one frame of the default brand first. Setting them in the markup means the
  correct theme is in the cascade before the first byte of body is parsed.
- **Dark is the default and `prefers-color-scheme` is not consulted.** `REQUIREMENTS.md` §Out of
  Scope: *"Three-state theme toggle — Two states, dark by default, as designed."* The script's only
  job is to *remove* `dark` for a returning light-mode visitor, which it does in `<head>` before any
  paint.
- **The toggle is a design-system `IconButton` with a listener attached by the same inline script.**
  No React handler, no island, so all five routes keep zero framework JS.
- **`localStorage` is wrapped in `try`.** Safari in private mode throws on access, and an
  unhandled throw here would abort the script before the class is corrected — a flash caused by the
  code that exists to prevent one.
- No CSP is configured on this site today. If one is added at Phase 8, this script needs a hash or a
  nonce; record it now rather than discovering it at cutover.

### 12.2 Reduced motion (PUB-13)

Everything the page generates is suppressed; nothing the user performs is.

| Motion | Rule |
|---|---|
| `scroll-snap-type` | Inside `@media (prefers-reduced-motion: no-preference)` — snap converts a small gesture into a large involuntary viewport translation |
| `scroll-behavior: smooth` | **Opt-in**, same query. Never `scroll-behavior: auto` as the exception. |
| Photo-tile hover `scale(1.03)` / 0.6s | Same query. This is the existing precedent and the pattern the rest of the site follows. |
| Card hover border transition | Same query |
| Any scroll-driven effect on the departing photos block | **Disabled entirely, not slowed** |
| User-initiated scrolling | **Exempt. Must not be suppressed.** |

Verify by running the six-class audit twice, once with `prefers-reduced-motion: reduce`, and
asserting the departure still succeeds — that is the proof snap is an enhancement rather than the
mechanism.

### 12.3 SEO (SEO-01 · SEO-02 · SEO-03 · SEO-05)

- **SEO-01** — every page: `<link rel="canonical">` absolute, `og:title`, `og:description`,
  `og:type`, `og:url`, `og:image` (absolute), `og:image:alt`, `twitter:card`. A shared `<Seo>` Astro
  component takes them as props so no page hand-writes a tag.
  - **There is no site OG image.** MEASURED: `public/` holds `resume.pdf`, `favicon.svg` and three
    project icons. Rather than commission one, use a landscape photograph's `large` variant —
    **recommend `architecture-singapore`** (2000×1333, 1.5:1, and it is already the first peek photo
    on Home). Dynamic/edge-generated OG images are explicitly out of scope.
- **SEO-03** — `@astrojs/sitemap` is **not installed**; adding it is a dependency addition, and the
  five route patterns plus 39 photo pages plus 7 category pages give a 49-URL sitemap.
- **SEO-05** — `/portfolio` → `/photos` must be a real **301**, not a meta-refresh page. Assert the
  status code with `curl -sI` against the built preview, not against the source.
- **SEO-02** — `Person` structured data on `/resume`, **and it is blocked by the sinks gate.**

**MEASURED, with the Astro compiler this repository has installed:**

```
plain expr in ld+json   $$render`<script type="application/ld+json">{j}</script>`
is:inline + expr        $$render`<script type="application/ld+json">{j}</script>`
set:html                $$render`<script type="application/ld+json">${$$unescapeHTML(j)}</script>`
define:vars             $$render`<script ...>(function(){${$$defineScriptVars({j})}JSON.stringify(j)})();</script>`
```

**Astro does not interpolate an expression inside a `<script>` body.** `{j}` ships to the page as the
literal two characters `{j}` — a naive implementation ships broken JSON-LD, and every gate passes.
`define:vars` wraps the body in an IIFE, which is not valid JSON either. **`set:html` is the only
mechanism, and `gate:sinks` bans it in use form and cannot allowlist it.** See **OQ-2**.

---

## 13. Copywriting Contract

### 13.1 Voice — public

> **Idea first, in plain language. Then one hard technical fact.**

| Slot | Where | Shape | Budget |
|---|---|---|---|
| **One-liner** | Home Act-2 grid, 13px, ~380px column | One sentence. Plain-language purpose, then one concrete detail. | **60–110 characters**, must fit 2 lines |
| **Card description** | Work project card, 15px, ~600px card | Two sentences. Sentence 1 is the one-liner's idea; sentence 2 is the hard fact. | **120–200 characters**, must fit 3 lines |

Five rules, each of which the copy in `data/projects.json` breaks somewhere today:

1. **No feature lists.** A comma-separated run of six nouns is a changelog. Momentum's current
   description — *"Goal tracker with adaptive daily targets, streaks, milestones, badges, home screen
   widgets, and cloud sync"* — is the example.
2. **The hard fact is a number, a constraint or a named technique** — never an adjective. "CIELAB"
   and "runs entirely on Cloudflare's free tier" qualify; "modern" and "powerful" do not.
3. **No superlatives, no "beautiful", no "seamless".** The audience is engineers.
4. **Status carries currency, not prose.** The `StatusPill` says whether it is alive; the sentence
   must not also say it, and must never carry a date.
5. **The design-system one-liner closes by pointing at the page the reader is on.** It is the only
   project whose outcome the reader is looking at while reading about it.

The reviewed copy for all five projects, both lengths, with per-claim sources and measured character
counts, is in `.planning/phases/00-design-ideation/00-COPY/one-liners.md`. **It is the copy Phase 5
ships** — subject to OQ-1's migration.

### 13.2 Contract table

| Element | Copy |
|---|---|
| **Primary CTA — Home** | `SCROLL FOR THE WORK ↓` (mono 11px `--ls-wide`, underlined, `--ochre-d`) |
| **Secondary CTA — Home Act 2** | `ALL WORK →` · `RÉSUMÉ →` · `View résumé` |
| **Primary CTA — Résumé** | `Download the PDF` |
| **Cross-link — Work** | *see the photographs →* (Playfair italic 17px) |
| **Cross-link — Photos** | *← see the work* |
| **Photo page — back** | `← All photographs` · `← {Category}` |
| **Filter — unfiltered** | `ALL · 39` |
| **Filter — category** | `{LABEL} · {n}` from `site_config.label` and the measured count |
| **Empty — category with no photos** | **No photographs in {Category} yet.** / *Every category on this site has at least one today; this one is new.* → `See all 39` |
| **Error — 404** | **Not found.** / *There is nothing at this address.* → `Go to the home page` |
| **Destructive actions** | **None. The public site has no mutating action, no form and no destructive path.** Recorded explicitly so the checker's destructive-copy dimension has an answer rather than a blank. |

**The empty-category state is unreachable today** (MEASURED: all seven categories have 2–14 photos)
and must still exist, because a Phase 7 category addition creates it in one click and a page with
neither photographs nor an explanation is what would ship.

### 13.3 Two copy facts that must not be hand-typed

- **The component count** — §6.7. Derived at build time. `00-COPY/one-liners.md` says 79, the
  committed captures say 80, the package says 81. **Do not fix either by hand.**
- **The photograph count** — `39 PHOTOGRAPHS — ALL OF THEM` and every `· n` in the filter row come
  from `getCollection('photos').length` and a group-by, never a literal. Plan 03-01's `--verify`
  already hardcodes 39 and `STATE.md` flags that it stops working the day a 40th lands; do not add a
  second place with the same problem.

---

## 14. Registry Safety

| Registry | Packages / blocks used | Safety gate |
|---|---|---|
| shadcn official | **none — shadcn is not used on this project** | not applicable |
| npm — **`@akhil-saxena/design-system@2.0.0-beta.1`** (first-party, `next` tag) | all UI, via `components/*` subpaths | **not required — first-party.** Published 2026-08-25 by GitHub Actions trusted publishing (OIDC) with SLSA provenance; there is no local publish path. The registry tarball's shasum came back byte-identical to the local pack, so the build is reproducible. **CARRIED**, `STATE.md`. |
| npm — `@astrojs/sitemap` (**new dependency**, SEO-03) | sitemap generation | **`slopcheck install -e npm` before it enters `package.json`.** `-e npm` is required: run from a directory without a `package.json` it defaults to PyPI and falsely flags `react-dom`. |
| third-party component registry | **none declared** | not applicable — the vetting gate is not triggered |

**No third-party registry is declared, so no `shadcn view` diff is required.** If one is proposed
later, it does not enter this contract until it has been viewed and the flagged-pattern scan
recorded with a date.

---

## 14.5 Decisions — resolved by Akhil, 2026-08-28

These are decisions, not recommendations. Plans implement them as written.

| # | Resolution |
|---|---|
| **OQ-1** | **Extend the schema and migrate the copy** as a Phase 5 wave-1 task, taking `status`, `oneLiner` and the card copy **verbatim** from `00-COPY/one-liners.md`. A `scripts/migrate-project-copy.mjs` alongside the four Phase 3 migrations. |
| **OQ-1b** | **The three employment metrics are PLACEHOLDERS — Akhil supplies the real ones later.** See the mechanism below; a silent placeholder is not acceptable and he did not ask for one. |
| **OQ-2** | **Microdata, not JSON-LD.** `itemscope`/`itemtype`/`itemprop` on markup already on the page. Zero script bytes on a zero-JS route, and the sinks gate stays exactly as strict as Phase 3 left it. Option 3 (a static `public/` file) does not work and is recorded so it is not re-proposed. |
| **OQ-3** | **Write the no-flash script locally (~12 lines) AND file the gap upstream** for `2.0.0-beta.2`. The Core Value says a design-system gap is a *finding* rather than a workaround; it does not say the finding must be fixed before the consumer ships. The live site is down, which is a clock. |
| **OQ-4** | **Fix `FilterNav` upstream** — a `@media (pointer: coarse) { min-height: 44px }` on `.ds-atom-segmented-btn`, mirroring the `AppBar`/`Footer` treatment already in `primitives.css`, plus a `scroll-snap-align` hook. No local override. It fixes Cairn too, and it can ride the same patch release as OQ-3's theme export. |
| **OQ-5** | **`beforeprint`/`afterprint` in the existing inline script.** Restates no token and works on every page. The residual risk — some headless print-to-PDF paths do not fire the events — is accepted and recorded. |

### OQ-1b — the placeholder mechanism, and why it is not just a string

Akhil asked for placeholders and will supply the real metrics later. **The placeholder must fail the
build, not sit quietly**, and this project has already paid for that lesson twice:

- Phase 3 stored `{{ds.componentCount}}` and made the schema **reject** any literal `\d+-component`,
  so a stale hand-typed figure could not return. That is the precedent to copy.
- Phase 4 measured that `alt: "TODO"` **passes all four content rules** — which is precisely why Akhil
  then asked for a placeholder refusal on `alt`. An unguarded placeholder ships.

So: store the metric as `{{metric.value}}` / `{{metric.label}}`, and add a gate that **fails the
build** if a `{{…}}` token survives into a rendered public route. The employment band is the first
thing a hiring manager reads on Work; it must be impossible for it to go live reading `{{metric.value}}`.

**For reference when he supplies them**, all three sketch values are traceable to reviewed bullets —
this was measured, not assumed:

| Company | Sketch metric | Supporting bullet |
|---|---|---|
| Brevo | `+15% CONVERSION` | *"Improved **conversion** by transforming a one-page checkout…"* — **the bullet was reworded 2026-08-29.** It read *"Improved **conversion by 15%** by…"*, which made the band's claim a second time four lines below it. Akhil approved removing the figure from the prose; the band carries the number. `migrate-experience-metric.mjs`'s `evidence` row was re-derived in the same commit, and its provenance refusal is what asked for it. |
| PharmEasy | `4K+ FRANCHISES` | *"enhancing productivity for **4K+ franchises** across **4 countries**"* |
| MAQ Software | `6× FASTER PIPELINES` | *"Improved pipeline execution time by **6×**…"* — **bullet 4**, not bullet 1 |

That last row is why OQ-1's option 2 was rejected: deriving from each first bullet yields
`7+ data sources` for MAQ, which is wrong.

## 15. Open questions

Each blocks a named route or requirement. **I cannot ask Akhil; the orchestrator must.**

---

### OQ-1 — Work and Home Act 2 need three fields that do not exist, and the reviewed copy was never merged

**Blocks:** PUB-02 (Work), PUB-01 (Home Act 2), and the D-45 status vocabulary on both.

`ProjectSchema` and `ExperienceEntrySchema` are `z.strictObject`, so the missing fields cannot be
added by editing `data/*.json` alone — the schema is the single definition and
`scripts/assert-single-schema-source.mjs` refuses a rival one.

| Missing | Needed by | Source that already exists |
|---|---|---|
| `Project.status: "live" \| "maintained" \| "archived"` | `StatusPill` on Work and Home | `00-COPY/one-liners.md` `badge:` lines, with a sourced reason each |
| `Project.oneLiner` (60–110 chars) | Home Act 2 | `00-COPY/one-liners.md` `one-liner:` lines |
| `Project.description` replaced with the reviewed card copy (120–200 chars) | Work card | `00-COPY/one-liners.md` `card:` lines |
| `ExperienceEntry.metric: { value, label }` | Work's employment band | **Nowhere.** `+15% CONVERSION`, `4K+ FRANCHISES` and `6× FASTER PIPELINES` exist only in a Phase 0 sketch. |

**Options**

1. **Extend the schema and migrate the data as Phase 5 wave 1** (a `scripts/migrate-project-copy.mjs`
   alongside the four Phase 3 migrations already in `scripts/`), taking the copy from
   `00-COPY/one-liners.md` verbatim. The metric is authored by Akhil — three short strings.
2. **Derive the metric from the first bullet's first bold span.** MEASURED at the time, it would
   produce `conversion by 15%`, `4K+ franchises`, `7+ data sources`. Two of three are close to the
   sketch and the third is wrong (the sketch says `6× FASTER PIPELINES`, which is MAQ's *fourth*
   bullet). A clever derivation that is right two times in three is worse than a field.
   **AND THE REJECTION HAS SINCE GOT STRONGER, WHICH IS WORTH RECORDING RATHER THAN QUIETLY
   RESTATING.** The Brevo bullet was reworded on 2026-08-29 to stop it repeating the band's own
   figure, so its first bold span is now `conversion` — a derivation would today yield a metric with
   no number in it at all. The derivation was rejected because it encodes a false relationship into
   a renderer, and this is what that costs: the relationship broke the first time reviewed copy was
   edited for a reason that had nothing to do with the metric.
3. **Drop the metric column and the status pill from Phase 5**, ship the band as company/role/period
   only, and let Phase 6 add them. Costs the reviewed design two of its distinguishing elements.

**Recommendation: option 1, with the metric authored.** It is one schema change, one migration and
three sentences from Akhil. Option 2 encodes a false relationship into a renderer; option 3 ships a
design the reviewer did not approve. **Ask Akhil for the three employment metrics** — they are the
only content in this phase nobody else can supply.

---

### OQ-2 — `Person` JSON-LD has no Astro mechanism that the sinks gate permits

**Blocks:** SEO-02.

MEASURED with `@astrojs/compiler` (§12.3): `set:html` is the only construct that interpolates into a
`<script>` body; a plain expression ships the literal `{j}`; `define:vars` wraps the body in an IIFE.
`scripts/assert-no-raw-html-sinks.mjs` refuses `set:html` in use form and its own documentation
states an allowlisted occurrence is **still** refused if it is a use — the exemption path can never
forgive an actual sink.

**Options**

1. **Microdata instead of JSON-LD.** `<div itemscope itemtype="https://schema.org/Person">` with
   `itemprop` attributes on the name, jobTitle, worksFor, url and sameAs already on the page. Needs
   **no sink at all**, adds no script, and Google supports microdata for `Person`.
2. **Add a fourth rule to the gate** that permits `set:html` only when the attribute is on a
   `<script type="application/ld+json">` and the expression is a `JSON.stringify(...)` call, with a
   canary and anti-canary like the other three. Narrow, but it puts a hole in the gate that closed a
   real historical XSS class.
3. **Ship JSON-LD from `public/` as a static file** and reference it. `application/ld+json` is not
   fetched by reference; this does not work. Recorded so it is not re-proposed.

**Recommendation: option 1.** It satisfies SEO-02 with zero new script bytes on a zero-JS route and
leaves the gate that closed the stored-XSS class exactly as strict as Phase 3 left it. Microdata is
also inspectable in the DOM, which JSON-LD is not.

---

### OQ-3 — D-34's no-flash module was decided in Phase 0 and Phase 1 did not ship it

**Blocks:** PUB-12 on all five routes.

MEASURED: no theme entry point in the package's exports, no `applyTheme`/`useTheme`, no
`localStorage` outside four unrelated components. DSGN-05's reasoning was that **the class-name
contract is the design system's** — `:root.dark` / `.dark` and `data-brand` are its selectors,
changed on its release schedule — so leaving every consumer to reinvent the script is how consumers
drift out of sync with a contract they do not own. The portfolio and Cairn would each carry a copy.

**Options**

1. **Write it locally in Phase 5** (§12.1, ~12 lines) and **file the gap upstream** as a finding for
   a `2.0.0-beta.2`. Ships now; accepts one duplicated selector contract for one release.
2. **Block Phase 5 on a design-system patch** that adds `@akhil-saxena/design-system/theme`. Correct
   by the Core Value, and it puts a cross-repo release in front of the public site while the live
   site is down.
3. **Write it locally and do not file it.** Cheapest and worst — the next selector change breaks the
   portfolio silently.

**Recommendation: option 1.** The Core Value says a gap the design system exposes is a **finding**
rather than a workaround; it does not say the finding has to be fixed before the consumer ships. The
local script must carry a header naming D-34 and the upstream finding, so it is deletable rather than
load-bearing.

---

### OQ-4 — `FilterNav` misses the 44px coarse-pointer hit floor, and a consumer cannot reach its anchors

**Blocks:** PUB-04's accessibility on five of six device classes.

MEASURED: `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` is **40px**, the tallest of
three sizes, and `primitives.css` carries `@media (pointer: coarse)` rules for `AppBar` and `Footer`
links but **not** for the segmented button. `FilterNav`'s `className` prop reaches the `<nav>` only;
the anchors carry design-system classes with no consumer hook. The same reach is needed a second
time for `scroll-snap-align` on the rail (§8.3).

`00-RESPONSIVE-CONTRACT.md` §8 recorded this as a G-9 **acceptance clause** — *"meets the 44px
hit-area floor on coarse pointers without growing its drawn geometry, and supports the classes-1–2
horizontal rail"* — and the shipped component implements neither half.

**Options**

1. **Fix upstream**, mirroring the `AppBar`/`Footer` treatment already in `primitives.css`: a
   `@media (pointer: coarse)` `min-height: 44px` on `.ds-atom-segmented-btn`, plus a
   `scroll-snap-align` hook or a documented `itemClassName`. Correct, and it needs a patch release.
2. **Reach past the component** with `.ph-filters .ds-atom-segmented-btn { … }` from the page. It is
   layout-only and QUAL-03 permits layout CSS — but a clean screenshot bought by a local override is
   evidence of a fix that does not exist, which is precisely why Phase 0 left D-16-1's design-system
   half unfixed rather than patching it.
3. **Ship at 40px** and record the four-pixel shortfall.

**Recommendation: option 1, with option 2 as a time-boxed bridge only if the patch cannot land in the
same week.** If the bridge is taken it must carry a header naming the upstream finding and a
`TODO(remove-when: FilterNav ships the coarse floor)`, so it is deletable rather than absorbed.

---

### OQ-5 — the theme has no `@media print` block, and CSS cannot un-`.dark` a page

**Blocks:** PUB-11.

MEASURED: `themes/monochrome.css` contains zero at-rules by design — its own editing note requires
it. The dark block is scoped to `.dark`, and no CSS construct removes a class.

**Options**

1. **`beforeprint` / `afterprint` in the existing inline script** (§11.3). Restates no token, works
   on every page rather than just `/resume`, four lines. Residual risk: some headless print-to-PDF
   paths do not fire the events.
2. **Restate the five surface and five ink tokens inside `@media print`** on the résumé page. Works
   unconditionally; is a local restatement of design-system colour, which the Core Value forbids and
   which will drift silently on the next theme release.
3. **File it upstream and wait** for a theme print block or a `data-force-light` hook.

**Recommendation: option 1 now, option 3 in parallel.** Print is a medium, not a mode, and the theme
is the right owner. **Ask Akhil whether he prints the résumé himself from the browser or only sends
the PDF** — if the answer is "only the PDF", the residual risk in option 1 costs nothing and this
stops being a question.

---

### OQ-6 — three smaller decisions, each cheap to answer

| # | Question | Options | Recommendation |
|---|---|---|---|
| a | **The site-wide OG image.** None exists in `public/`. | A photograph's `large` variant · a new asset · none | **`architecture-singapore`** — 2000×1333, landscape, already the first peek photo, zero new assets. Dynamic OG generation is out of scope. |
| b | **Nav contents.** The reviewed captures show `work` and `photographs` only; PUB-10 adds a fourth route. | add `résumé` · leave it to Home's Act-2 link and the footer | **Add `résumé`.** Three nav items still fit at 344 (the AppBar was measured not to wrap there), and a recruiter should not have to scroll Home to find it. |
| c | **`/photos` vs `/photos/[category]` as one route or two for PUB-14's count.** | one pattern · two | **One.** They share a template, a layout and an island. Stated so the gate's denominator is not argued about after it is written. |

---

## 16. Verification the executor owes, beyond the gates

Not tests — measurements, each of which has already been wrong once in this project.

1. **Act 2 fits at 841 × 768.** The binding case, and the one that failed in the last review.
2. **State A's bottom edge equals `svh` at all six classes**, and one viewport of scroll leaves
   `photosBottom = 0`. Two controls, because "exactly one viewport" is two requirements wearing one
   declaration and each fails in its own direction: a `60svh` mutation must break *fills*, a `160svh`
   mutation must break *departs*. Phase 0's plan specified only the second and it **could not fail** —
   a shorter state A departs more easily, not less.
3. **`doc == viewport` at all six classes on all six routes.** Zero horizontal scroll.
4. **The `Link` colour is what you think it is, read in a browser**, not in jsdom (§4.6a).
5. **Exactly three font families download**, and Playfair is not Georgia (§1.2).
6. **`aria-current="page"` appears exactly once** on each of the eight Photos pages (§8.2).
7. **The bundle gate bites** — plant a `client:load`, watch it go red, remove it, confirm the file is
   SHA-256-identical and it goes green (§5.3).
8. **`node:crypto` does not reach a client chunk** via the `VARIANTS` import (§7.4).

---

## 17. Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending — six open questions, of which **OQ-1 blocks Work and Home Act 2** and must be
answered before the planner scopes those routes.

---

*Phase 5 · public-site · written 2026-08-28.*
*Sources — measured this session: the published tarball `@akhil-saxena/design-system@2.0.0-beta.1`
(`dist/{index.js, tokens.css, primitives.css, themes/monochrome.css, fonts/monochrome.css,
components/*.d.ts, css/*.css}` and README), `data/{portfolio_images,resume,projects,site_config,home_config}.json`,
`src/{schemas,lib,components}/`, `package.json`, `astro.config.mjs`, `wrangler.jsonc`,
`scripts/assert-no-raw-html-sinks.mjs`, `@astrojs/compiler` transform output, and the 39 photographs'
served WebP headers and byte counts from `images.akhilsaxena.com`.
Carried without re-derivation: `00-UI-SPEC.md`, `00-PUBLIC-DESIGN-NOTES.md`,
`00-RESPONSIVE-CONTRACT.md`, `00-THEME-API.md`, `00-FINDINGS.md`, `00-PHOTO-CONTENT.md`,
`00-COPY/one-liners.md`, `deferred-items.md`, `ROADMAP.md` Phase 5, `REQUIREMENTS.md`, `STATE.md`,
`03-CONTEXT.md` §2, and screenshots `00-X-{home-state-a,home-state-b,work,photos}-dark-{344,390,1440}.png`.
Every contrast ratio in §4.2 was computed this session and reproduces the theme file's own stated
figures to two decimal places.*
