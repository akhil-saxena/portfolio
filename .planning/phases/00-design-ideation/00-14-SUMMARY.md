---
phase: 0
plan: 14
subsystem: design-ideation
tags:
  [
    dsgn-01,
    dsgn-04,
    admin,
    home,
    resume,
    d-07,
    d-09,
    d-18,
    d-20,
    d-21,
    d-23,
    d-26,
    g-1,
    g-3,
    g-4,
    richtext,
    focal-point,
    refusal,
    segments,
    density,
    responsive,
  ]

requires:
  - .playground/ harness (plan 01)
  - theme-charcoal.css + fonts-charcoal.css (plan 04)
  - manifest-admin.css (plan 07)
  - src/layouts/Admin.astro, src/lib/artefacts.mjs, src/styles/density-compact.css, check-states.mjs, check-no-js.sh (plan 12)
  - THE ADMIN SKETCH IDIOM (plan 13) — followed, with two stated deviations
  - 00-ADMIN-IA.md (plan 03), 00-UI-SPEC.md, 00-RESPONSIVE-CONTRACT.md
  - data/home_config.json and data/resume.json — the real content, counted this session
provides:
  - S-home, R-crop-picker, S-resume, E-resume-section — four artefacts from two route files
  - src/components/FocalPointSketch.tsx — sanctioned island 2 of 3, D-23's control and G-1's measured cost
  - src/components/RichTextBullets.tsx — sanctioned island 3 of 3, G-3's and G-4's demonstrated evidence
  - src/components/SortableStatic.tsx — Sortable rendered with zero hydration, shared by both screens
  - src/fixtures/home.json + src/fixtures/resume.json — all real values, states keyed
  - a `density` prop on Admin.astro, so UI-SPEC's comfortable-for-R- contract is expressible
  - check-states.mjs registered for two more screens — 4 screens, 28 state pages
  - the D-20 segment converter and the ADMIN-IA decision-5 period formatter, both round-trip asserted
affects:
  - Phase 0 plan 15 (route shape, artefact claiming, the hydration budget is now fully spent)
  - Phase 0 plan 16 (transcribes the findings below into 00-FINDINGS.md; G-3 needs REWRITING, not copying)
  - Phase 0 plan 17 (screenshots 15 new URLs across the two screens, one of them at 390x844)
  - Phase 1 (six new design-system findings, one of them a shipped bug)
  - Phase 3 (the bullet-segment migration and the résumé date migration are both now written against measured shapes)
  - Phase 7 (the crop control's real cost, and the fact that a bold-only editor cannot be built on RichText as shipped)

tech-stack:
  added: []
  patterns:
    - a LAYOUT variant is a route with no STATES row, exactly like plan 13's filter condition
    - a component's own geometry ships inside the component, not in the host page, when the argument is "every consumer rewrites this"
    - render Sortable without hydration through a tiny wrapper, because an .astro page cannot author renderItem
    - assert the acceptance test ON THE PAGE when the test is "reproduce what is on disk"
    - measure the touch floor in a browser; a grep cannot see source order

key-files:
  created:
    - .playground/src/pages/admin/home/[...state].astro (gitignored)
    - .playground/src/pages/admin/resume/[...state].astro (gitignored)
    - .playground/src/components/FocalPointSketch.tsx (gitignored)
    - .playground/src/components/RichTextBullets.tsx (gitignored)
    - .playground/src/components/SortableStatic.tsx (gitignored)
    - .playground/src/fixtures/home.json (gitignored)
    - .playground/src/fixtures/resume.json (gitignored)
  modified:
    - .playground/check-states.mjs (gitignored) — +2 SCREENS entries
    - .playground/src/layouts/Admin.astro (gitignored) — +density prop

decisions:
  - "`toolbar={null}` DOES NOT SUPPRESS THE TOOLBAR. RichText renders `!readOnly && (toolbar ?? defaultToolbar)` and `??` falls through on null, so the value the prop's own docstring prescribes for suppression selects the DEFAULT toolbar. Twelve buttons render. This is a shipped bug, not a gap, and it escalates G-3."
  - "G-3 AS WRITTEN IS PARTLY WRONG. Measured in Chromium: the italic and underline shortcuts DO stay live with toolbar={null}, but Cmd-K does NOT create a link — it was never a keyboard binding, only a toolbar button, while the component advertises it in its own hint list. The link mark is still reachable, because autolink is hardcoded on: typing a URL creates one with no keystroke."
  - "D-23's argument is stronger than the plan states, and it is arithmetic. Five of the six peek photos are 2000x1333 — the frame's own 3:2 — so no crop value changes anything on them. The one photo carrying a crop is the one that is 2000x3000. The feature fires only on the aspect-ratio outlier, and 25 is not a stop on the nine-point preset lattice."
  - "`FieldError` has no severity. FieldErrorProps is `{ message, className }` and the markup is a fixed role=alert span in --red-ink, so D-18's LENIENT warning and its STRICT publish block render identically and both interrupt. UI-SPEC's 'Field + FieldError at warning severity' is not expressible."
  - "R-crop-picker is a ROUTE, not a state — /admin/home/phone/ — with no STATES row, because a layout variant is not a point in the draft lifecycle. The plan's suggested `?layout=phone` cannot work for the same reason `?state=` cannot."
  - "Home's `empty` declares inherits: E-resume-section rather than inventing E-home. home_config.json always has a title, subtitle and intro; the only emptiable thing is a SECTION, which is exactly what E-resume-section proves."
  - "T-error-inline and T-loading-list are declared `inherits` on BOTH screens, following plan 13's prescription rather than this plan's action, which assigned T-error-inline here. The error state still renders an instance of the warning, because 'saving still works' is invisible without a save control on screen."

metrics:
  tasks: 2
  commits: 1
  artefacts: 4
  routes-emitted: 15
  pages-built: 47
  gates-green: 8
  gates-failing-by-design: 1
  duration: ~35m
  completed: 2026-08-17
---

# Phase 0 Plan 14: `/admin/home` and `/admin/resume` Summary

Two form-heavy screens, two islands and one designed refusal — which measured that D-23's crop
value exists only because one of six photos is the wrong shape, that `toolbar={null}` does not
suppress the toolbar at all, that `Cmd-K` never bound anything while `autolink` binds itself, and
that a bold-only serializer over today's `RichText` drops an italic run without leaving a trace
that a mark was ever there.

---

## G-1 — THE MEASURED COST OF NOT HAVING `FocalPointPicker`

**`FocalPointSketch.tsx` is 419 lines: 269 non-comment lines, of which 86 are the 3:2 frame CSS
ported from `legacy:src/styles/admin.css:1777-1797` and 183 are TypeScript and JSX.**

That is the number the plan asked for, and the reason it is evidence rather than trivia: every
consumer that wants a focal point rewrites all 269 of those lines, including the two
accessibility defects fixed below, and gets to re-choose the interaction model while doing it.

**Two of the legacy control's three defects are fixed here, and the third is too.** Driven in
Chromium 147 against the built `dist/`, not read out of the source:

| | legacy (`PropertiesPanel.tsx:739-786`) | here | measured |
|---|---|---|---|
| pointer input | mouse-down only | pointer events + capture | drag to (25%, 75%) moved `object-position` from `50% 25%` to `25% 75%` |
| keyboard | **no `tabIndex`, no key handler — unreachable** | `tabIndex={0}` + arrows | `↑↑→` from `50% 25%` → `51% 23%`; `Shift+↓` → `51% 33%`; `Home` → `50% 50%` |
| listener cleanup | `document` listeners, removed on mouse-up only | `AbortController`, aborted on unmount | — |
| live value | none | `role="status" aria-live="polite"` readout | reset restored `50% 25%` exactly |

Zero console errors and zero page errors across the whole run.

**One interaction-model change, stated rather than slipped in.** The legacy control drags the
*image*, with an inverted delta and an arbitrary `/ 2` damping factor, which makes the same drag
mean a different value on a 320px frame than on a 640px one. This control places the *focal
point* directly. The two coincide geometrically — `object-position: x% y%` aligns the point at
(x%, y%) of the image with the point at (x%, y%) of the frame — so a marker dragged to (x%, y%)
of the frame **is** the value, at any frame size. That two reasonable engineers would pick
different models for the same CSS property is itself an argument for the component living
upstream.

**A usability requirement the sketch surfaced and an upstream component would have to carry:**
with `object-fit: cover`, only the *overflowing* axis responds. On the site's one cropped photo
the horizontal number is inert at every value. The control has to say which axis is live, and
this one does, computed from the real pixel dimensions.

---

## D-23 — THE ARGUMENT IS ARITHMETIC, AND IT IS STRONGER THAN THE PLAN SAYS

The six real `peekIds` were looked up in `portfolio_images.json` and measured:

| photo | dimensions | ratio | crop stored |
|---|---|---|---|
| architecture-singapore | 2000 × 1333 | 3:2 | — |
| abstract-intothemist | 2000 × 1333 | 3:2 | — |
| nature-acrossthetrees | 2000 × 1333 | 3:2 | — |
| **architecture-hawamahaldaytime** | **2000 × 3000** | **2:3** | **`50% 25%`** |
| wildlife-kingfisher | 2000 × 1333 | 3:2 | — |
| architecture-eiffeljpg | 2000 × 1333 | 3:2 | — |

**Five of six are already the frame's own ratio.** A crop value changes nothing on any of them.
The one photo that carries a crop is the one photo that is portrait in a landscape frame — so the
whole feature fires on the aspect-ratio outlier, and a preset grid would offer nine
indistinguishable choices on five photos while failing to express the one value that matters.

**And it cannot express it.** A nine-point preset lattice is `{0, 50, 100}` on each axis. `25` is
not a stop on it. The page checks this at render time rather than asserting it, and prints the
consequence, computed:

> `50% 25%` · This value is NOT on the nine-point preset lattice (0 / 50 / 100 on each axis). A
> preset picker would have had to change it. · 2000 × 3000 in a 3:2 frame, so the crop is
> **vertical** — the second number moves the image and the first is inert at every value. ·
> Showing **13.9% to 58.3%** of the original — a 44.4% band. At 50% it would be 27.8% to 72.2%.

So snapping the site's one crop to the nearest preset would move the visible band by **13.9% of
a 3000px original, about 417px**. That is the number D-23 is worth.

---

## G-3 — THE THREE CMD-KEY ANSWERS, AND A FOURTH THING NOBODY ASKED

Driven by keyboard in Chromium 147 against the built `dist/`, with `toolbar={null}` passed.

| # | Question | Answer | Evidence in the editor DOM |
|---|---|---|---|
| 1 | Does **⌘I** still apply italic? | **YES** | `<em>` present after the shortcut |
| 2 | Does **⌘U** still apply underline? | **YES** | `<u>` present after the shortcut |
| 3 | Does **⌘K** still create a link? | **NO** | no `<a>`, and no link bar opened |

**Question 3's answer is a correction to G-3, not a reprieve.** ⌘K was never a keyboard binding —
TipTap's `Link` extension does not bind it and `RichText` adds no root key handler. It is a
*toolbar button*, which the component nonetheless advertises as a shortcut in its own hint list
(`HINT_ITEMS`, `dist/index.js:8640-8648`). So the component documents a shortcut it does not
implement.

**And the link mark is reachable anyway, with no keystroke at all.** `Link` is configured
`{ openOnClick: false, autolink: true }` (`dist/index.js:8692`), hardcoded. Typing a URL creates
one:

```
typed:  See https://cairn.co.in for the tracker
DOM:    <p>See <a target="_blank" rel="noopener noreferrer nofollow"
                 href="https://cairn.co.in">https://cairn.co.in</a> for the tracker</p>
stored: [ { text: "See https://cairn.co.in for the tracker" } ]
```

That is worse than a live shortcut, because it needs no user intent.

**Two more marks and one node type, also live, also unstorable.** `⌘⇧H` produced `<mark>`
(Highlight is registered unconditionally) and `⌘⌥2` produced `<h2>`. The page's serializer named
both: *"2 thing(s) dropped on serialize — Marks the shape cannot carry: highlight. Node types the
shape cannot carry: heading."*

**Bold, the control case:** `⌘B` → `<strong>` → `[ { text: "…", emphasis: true } ]`. The one mark
the shape carries works.

### F-14-1 · `toolbar={null}` does not suppress the toolbar — a shipped bug

`RichTextProps.toolbar` documents itself as *"Replace the default toolbar with a custom
ReactNode; **pass `null` to suppress the toolbar entirely**."* It does not. The component renders

```js
!readOnly && (toolbar ?? defaultToolbar)     // dist/index.js:9143
```

and `??` falls through on `null`, so the documented suppression value **selects the default
toolbar**. Measured in the hydrated DOM with `toolbar={null}` passed: **one
`[role="toolbar"][aria-label="Formatting"]` inside `.ds-atom-richtext`, carrying twelve buttons** —
Bold, Italic, Underline, Highlight, Strikethrough, Inline code, Heading style, Bulleted list,
Ordered list, Blockquote, Horizontal rule, Insert link. Eleven of the twelve author something
D-20's shape has no field for.

This is strictly worse than G-3 as filed. G-3 says the marks cannot be *restricted*; this says
the affordances cannot even be *hidden*. `toolbar={false}` would work, because `false ?? x` is
`false` and `false` is a valid `ReactNode` — so the type permits a value that behaves correctly
while the documented one does not. **Fix:** `toolbar === null ? null : (toolbar ?? defaultToolbar)`,
or a separate `showToolbar` prop, plus the `marks?: Array<"bold" | "italic" | …>` prop G-3 already
proposes.

Left in place rather than hidden with a CSS rule, and said out loud on the page so a reviewer does
not read a twelve-button toolbar as the sketch getting it wrong. Asserted absent:
`grep -qE 'preventDefault.*(Key|key).*i|metaKey' RichTextBullets.tsx` exits 1.

---

## G-4 — THE BEFORE AND AFTER, SERIALIZED AT BUILD TIME

`outputFormat` offers two values. One emits a string of markup, which D-20 rules out on principle
rather than convenience — if that string exists anywhere, the stored-XSS class D-20 designs away
is back — so the island uses the document format and adapts it. Asserted:
`grep -q '"html"' RichTextBullets.tsx` exits 1.

**The adapter loses, and here is the loss, taken out of `dist/admin/resume/index.html` — server-
rendered, no hydration, no typing:**

```
BEFORE — what was authored          AFTER — what would be stored
plain:  "Introduced RBAC with "     [
bold:   "40+ permissions"             { text: "Introduced RBAC with " },
plain:  " across "                    { text: "40+ permissions", emphasis: true },
italic: "6 business verticals"        { text: " across 6 business verticals, scaling access for " },
plain:  ", scaling access for "       { text: "1K+ enterprise users", emphasis: true },
bold:   "1K+ enterprise users"        { text: "." }
plain:  "."                          ]
```

The bold runs survive as `emphasis: true`. **The italic run comes back as plain text and the two
neighbouring plain runs merge around it**, so the stored value carries no record that a mark was
ever there. Seven runs in, five segments out, and nothing in the output says which one was lost.
That is a silent save, which is why G-4 is data loss rather than a styling miss.

The live panel does the same thing on whatever is in the editor, and names what it dropped —
verified in the browser: after `⌘I` it read *"1 thing(s) dropped on serialize — Marks the shape
cannot carry: italic. The editor still shows them. The stored value above does not."*

### F-14-2 · `RichText` downloads a six-language syntax highlighter to edit a résumé bullet

`CodeBlockLowlight` is registered unconditionally and lazily loads its grammars in an effect.
Measured as real gzip requests against the built output:

| route | JS requests | gzip |
|---|---|---|
| `/admin/` (no island) | 0 | **0 B** |
| `/admin/photos/` (`Sortable`) | 6 | 252,757 B · 246.8 KB |
| `/admin/home/` (focal control) | 6 | 254,171 B · 248.2 KB |
| **`/admin/resume/` (`RichText`)** | **12** | **265,875 B · 259.6 KB** |

The résumé route makes **twice the requests** and costs 13.1 KB more, and every one of the six
extra chunks is a lowlight grammar nobody asked for: `typescript` 3,113 · `javascript` 2,651 ·
`python` 1,508 · `css` 4,264 · `xml` 822 · `json` 360 = **12,718 B gzip** of syntax highlighter,
downloaded after hydration, on every visit to a page whose only content is prose bullets.
**Fix:** gate `CodeBlockLowlight` behind a prop, or ship the grammar loader behind the code-block
toolbar action rather than mount.

---

## THE DATA SHAPES, BOTH ROUND-TRIP ASSERTED

### D-20's bullet segments — the migration is narrow, and it was scanned rather than believed

All 18 bullets across the three experience entries were scanned with a tag regex; the converter
**throws** on anything other than `<strong>`. Nothing threw. ADMIN-IA's claim holds.

- **18 bullets → 45 segments, 17 of them carrying `emphasis`**
- Counts preserved exactly: **11 / 3 / 4**, and the 11-bullet Brevo entry renders in full
- Round-trip asserted in both directions: re-emitting each segment array as the legacy string
  reproduces the byte on disk

### ADMIN-IA decision 5's period formatter — all four strings, byte for byte

`period` is not stored. Each entry carries `startMonth` / `startYear` / `endMonth` / `endYear` /
`isPresent`, and one formatter derives the string. The acceptance test runs in the generator **and
again on the page**, which prints the result, because an acceptance test nobody can see is a claim:

| structured | derived | on disk |
|---|---|---|
| `Jul 2023`, isPresent | `Jul 2023 – Present` | ✅ identical |
| `Nov 2022` → `Jun 2023` | `Nov 2022 – Jun 2023` | ✅ identical |
| `Dec 2021` → `Nov 2022` | `Dec 2021 – Nov 2022` | ✅ identical |
| `Jul 2018` → `Jun 2022` | `Jul 2018 – Jun 2022` | ✅ identical |

En dash (U+2013) and three-letter month included. The single `Period` `TextInput` becomes two
month `Select`s, two year inputs and a `Present` `Checkbox` that disables the end pair — the
**+4 controls per entry** ADMIN-IA predicted.

### D-26's PDF drift — the number is computed, not typed

Two fixture timestamps four days apart, and the generator **throws** if they do not yield exactly
the number the verbatim copy states. Rendered on all seven résumé routes, `AlertBanner
tone="warning"`, not dismissible, nothing on the screen disabled:

> **The PDF is older than the résumé data.** / `resume.json` changed 4 days after `resume.pdf` was
> uploaded. This won't block publishing.

It stays up after a successful publish, because publishing commits `resume.json` and not the PDF —
and the success state's copy says so rather than implying the PDF was refreshed.

---

## D-18's LENIENT HALF, AND THE SEVERITY THE COMPONENT CANNOT EXPRESS

### F-14-3 · `FieldError` has no severity, so D-18's two severities render identically

`FieldErrorProps` is `{ message?: string | null; className?: string }`. The markup is a fixed
`<span role="alert" class="ds-atom-field-error">` in `--red-ink` (`field.css`). There is no tone,
no severity, no variant. UI-SPEC specifies *"`Field` + `FieldError` at warning severity"* — that
value does not exist.

So the **lenient draft warning** ("needs a title before you can publish; the draft is saved") and
the **strict publish block** ("this is why publishing failed") render as the same red text with the
same assertive `role="alert"`. One schema, two severities, one appearance. Not recoloured locally:
that would hide the gap. **Fix:** a `tone?: "error" | "warning"` on `FieldError` and on `Field`'s
`errorMessage` path, and `role="status"` rather than `role="alert"` at warning severity — an
incomplete draft field should not interrupt.

**What was rendered instead** is the fact a reviewer cannot otherwise see: on
`/admin/resume/error/` and `/admin/home/error/` the verbatim copy *"Needs a title before this can
be published."* attaches to the field it is about, and the save controls sit beside it, enabled.
Measured: **0 buttons carry `disabled` on `dist/admin/resume/error/index.html`**, and
`Mark as ready` is present.

---

## R-crop-picker — A DESIGNED REFUSAL, AT ITS OWN URL, AT THE RIGHT DENSITY

`/admin/home/phone/`, verbatim from UI-SPEC's contract table:

> **Crop needs a bigger screen.** / Setting a focal point means dragging inside a 3:2 frame, which
> doesn't work on a phone. Everything else on this screen does.

- The copy appears on **exactly one** file in `dist/` — asserted, not assumed.
- **The last sentence is checkable rather than rhetorical.** The route renders the whole rest of
  the screen underneath: the title block, the peek strip, the socials, the two CTAs. Measured
  **0 controls under 44px** at 344, 390, 768 and 1024, all coarse pointer.
- **Comfortable density, not compact.** `data-density="comfortable"` on the phone route,
  `"compact"` on the other seven. The difference is measurable rather than declarative: at 1440
  fine pointer the compact route's buttons measure **30px** and its nav rows **30px**, and the
  comfortable route's measure **32px** and **36px**.
- The refusal is *true*: the legacy control has one mouse-down handler and no pointer or touch
  events, so on a phone it does not respond at all. In production the refusal is a media query;
  the sketch gives it a URL so plan 16 can review it and plan 17 can screenshot it at 390 × 844.

---

## WHAT WAS BUILT

**Four artefacts from two route files, plus one extra route:**

| Artefact | Route | Coverage |
|---|---|---|
| `S-home` | `/admin/home/` | designed — 6 peek slots, the real crop, the full field catalog |
| `R-crop-picker` | `/admin/home/phone/` | designed — a route with no coverage cell |
| `S-resume` | `/admin/resume/` | designed — 11/3/4 bullets, 3 skill groups, 1 education entry |
| `E-resume-section` | `/admin/resume/empty/` | designed |
| `T-loading-list`, `T-error-inline`, `T-dirty-badge`, `O-conflict-diff`, `T-success-published` | 10 state routes across both screens | inherits, pointer rendered |

**`/admin/home`** — the legacy panel titles become section headings and the legacy *field* labels
are kept verbatim beneath them, which is why the first field reads **`Name`** and not `Site Title`:
the panel was titled Site Title and the input inside it was labelled Name
(`legacy:PropertiesPanel.tsx:669-684`). Then Tagline/`Subtitle`, Intro Text/`Introduction`
(`Textarea`), the six-slot peek strip through `Sortable` with every slot's stored crop in mono,
`Gallery Photo 4 / Position (drag to adjust)` over the island, `Replace with`, three social rows
(`Icon` `Select` + `Label` + `URL`) and two CTA rows (`Text` + `Link` + `Style` `Select`, with the
legacy option labels `Primary (filled)` / `Secondary (outlined)` intact).

**`/admin/resume`** — all fifteen recovered field labels present: Company, Role, Location, URL,
Icon, Period, Bullets, Skill Group, Skills, School, Degree, CGPA, Leadership, Resume PDF, Upload
New Resume. `Icon` appears twice and both are justified by the data rather than by the recovered
list: `experience[].logo` is `null` on all three entries and `skills[].icon` carries
`code`/`layers`/`filter` and is rendered on the public page — **neither had an editor in the legacy
admin, so the data carried values nobody could change.** `FileInput variant="button"` accepts a PDF
and does nothing with it.

**Three components.** `FocalPointSketch.tsx` and `RichTextBullets.tsx` are the last two sanctioned
islands. `SortableStatic.tsx` renders the design system's `Sortable` with **zero hydration**, on
both screens, because an `.astro` page cannot author `renderItem` — it takes a function returning a
`ReactNode` and Astro frontmatter has no JSX.

---

## MORE NEW DESIGN-SYSTEM FINDINGS

Per `00-FINDINGS.md`'s fixed-denominator rule, these are reported here and **not** appended to the
sixteen-row register. Plan 16 transcribes them.

### F-14-4 · An SSR-rendered `Sortable` ships a keyboard trap it cannot fulfil

`Sortable` server-renders correctly and draws fine, but `SortableItem` spreads dnd-kit's
attributes onto the item wrapper regardless. Taken out of the built HTML:

```html
<div class="ds-atom-sortable-item" role="button" tabindex="0" aria-disabled="false"
     aria-roledescription="sortable" aria-describedby="DndDescribedBy-16">
```

Three problems on a list that cannot drag. It is a **keyboard stop** — 18 of them on the résumé
screen, 6 on Home — that does nothing when activated. It **promises drag-and-drop** to a screen
reader via `aria-roledescription="sortable"`. And `aria-describedby` is **dangling**: no element
with `id="DndDescribedBy-16"` exists anywhere in the static output, because dnd-kit mounts the
description in an effect. Verified: 0 `id="DndDescribedBy-*"` and 0 `DndLiveRegion` in
`dist/admin/resume/index.html` against 18 references to them.

`onReorder` is also **required by the type** for a list that can never reorder. **Fix:** a
`disabled` / `readOnly` prop on `Sortable` that suppresses the listeners, the role, the
roledescription and the describedby, and makes `onReorder` optional.

### F-14-5 · `Sortable` and `RichText` have no loading state, so the one place plan 13's rule cannot be followed is a list

Plan 13's idiom says *"use the component's own loading prop where one exists (`DataGrid.loading`,
`Select.loading`), never a bespoke skeleton."* Neither `Sortable` nor `RichText` has one. Both
screens' `loading` states therefore compose the design system's `Skeleton` by hand — not bespoke,
but not the component's own claim about its own height either, which is what the treatment is
supposed to demonstrate. **Fix:** a `loading` prop on `Sortable` that reserves `items.length` rows.

### F-14-6 · `FileInput variant="button"` is themeable and `variant="dropzone"` is not — which narrows F-13-6

Plan 13 filed `FileInput` as unthemeable. Measured against the button variant, that is
dropzone-specific: `variant="button"` renders a design-system `Button variant="secondary"`
(`dist/index.js:5884-5904`) and inherits charcoal correctly. The dropzone's inline style object
with its hardcoded `#E8D9AC` is a separate code path. What both share is that **`FileInput` has no
`label` prop, only `ariaLabel`**, and it calls `useField` internally — so a consumer cannot wrap it
in their own `Field` with a hand-built wiring, and a visible label has to be a sibling element.

---

## VERIFICATION — measured, in a browser where it matters

```
astro build                    47 pages, 15 of them new (/admin/home/* x8, /admin/resume/* x7)
check-no-js.sh                 PASS  21 static routes at zero JS; 26 island routes verified hydrating
check-states.mjs               PASS  28 state pages across 4 screens, markers unique within each
check-no-ivory.sh              PASS
check-theme-exhaustive.mjs     PASS
check-font-names.mjs           PASS
check-contrast.mjs             PASS
check-css-size.mjs             PASS
check-bundle.mjs               EXIT 1 — BY DESIGN, this is G-15
```

**Built output.** `dist/admin/home/index.html` and `dist/admin/resume/index.html` each carry
exactly **1 `<script>` tag**; `grep -c 'client:'` is **1** on each route file. The literal
`50% 25%` appears in both `src/fixtures/home.json` and the rendered home page. All **18 bullet
rows** and all **6 peek slots** render at every width.

**The hydration budget is now fully spent, and the plan's figure needs one correction.** The plan
says the budget is "exactly 4 pages"; the allowlist has **six** entries, because `probe/casc-c` and
`probe/casc-d` are pre-existing measurement fixtures from the cascade matrix. Counting *routes*, 26
hydrate: 3 admin screens × their state routes (8 + 8 + 7) plus the 3 probes. Zero remain for plans
15 and 16.

**Touch floor and reflow, measured in Chromium 147** on the built pages with the islands hydrated.
The audit walks every focusable box and reports anything under 44px:

| Route | Class | pointer | density | doc width | under 44px |
|---|---|---|---|---|---|
| `/admin/home/` | 344 folded | coarse | compact | 344 = viewport | **none** |
| `/admin/home/` | 390 phone | coarse | compact | 390 = viewport | **none** |
| `/admin/home/` | 768 tablet-portrait | coarse | compact | 768 = viewport | **none** |
| `/admin/home/` | 1024 tablet-landscape | coarse | compact | 1024 = viewport | **none** |
| `/admin/home/` | 1440 laptop | fine | compact | 1440 = viewport | 37 (compact, by design) |
| `/admin/home/phone/` | 344 – 1024 | coarse | **comfortable** | = viewport | **none** |
| `/admin/resume/` | 344 folded | coarse | compact | 344 = viewport | **none** |
| `/admin/resume/` | 390 / 768 / 1024 | coarse | compact | = viewport | **none** |
| `/admin/resume/` | 1440 laptop | fine | compact | 1440 = viewport | 108 (compact, by design) |

No horizontal page scroll at any width. The frame's computed `aspect-ratio` is `3 / 2` and its
measured box is 1.4952–1.4965 at every class — **a real 3:2 frame, checked in the layout rather
than grepped in the source**.

**Two floor failures the audit caught that no grep could have.** The reset button beside the crop
frame measured **30px at all four coarse classes**, because
`@media (pointer: coarse) { .fp-reset { min-height: 44px } }` was written *before* the base
`.fp-reset { min-height: 30px }` rule — same specificity (0,1,0), so source order decided it and
the floor lost. And the `Download PDF` link measured **16px**, because it was a word inside a
sentence and inherited the line box. WCAG 2.5.8's "in a sentence" exception would have permitted
the second; it was pulled out into its own row instead, so the floor now holds with **no exception
claimed**.

**Em dashes.** 12 on the résumé page, all of them prose punctuation. **One was not**, and the count
found it: `<Select placeholder="—">` on the End month field of an `isPresent` entry — an em dash
standing in for an absent value, which is exactly what ADMIN-IA's omission rule forbids. Removed;
`grep -c 'select-placeholder">—'` is now 0.

**Negative control for the changed gate.** `check-states.mjs` gained two `SCREENS` entries. Control:
`const state = Astro.params.state ?? "populated"` replaced with a constant on **both** new routes.
`astro build` still succeeded — which is the silent collapse the gate exists to catch — and the gate
**failed, exit 1**, naming the screen: `check-states: FAILURE MODE on "home" — a state variant is
not the state it claims to be`, listing the populated marker leaking onto all six other pages and
six markers absent from their own. Assertion 3 (marker uniqueness) caught it; assertion 2 (body
inequality) did not, for the reason plan 13 already recorded — `astro dev` injects per-route content
that keeps the bodies from being byte-identical. Both files were then restored and re-hashed:

```
resume  e5c5cda4c112b8e296efc51c76b8e9b5c617e9f395d2ee6ae486058d95e7ac78   before and after
home    7b166a02f5c4bfc77ca2476227af7ff36b6741cc965d14ab36ae1539a6153776   before and after
```

and `check-states.mjs` exits 0 again.

**Three gate bites during execution, all real, all fixed.** `check-no-js.sh` failed
`dist/admin/resume/loading/index.html` for shipping zero script tags — the island had been nested
inside a section that only renders on some states, which is exactly the failure plan 13's
"render the island unconditionally" rule predicts. `check-states.mjs` failed twice on markers that
were one character longer than the copy that rendered them.

---

## DEVIATIONS FROM PLAN

**1. [Plan correction] The route files are `src/pages/admin/<screen>/[...state].astro`, not
`src/pages/admin/<screen>.astro`.**
The plan's `files_modified` names `home.astro` and `resume.astro`. Those paths produce a screen with
no state axis at all, because `?state=` does not work under `output: 'static'` — plan 12 measured it
and plan 13 made the rest-param route the prescriptive idiom. The idiom wins. The acceptance greps
naming the flat paths were run against the real ones; `grep -c 'client:'` is 1 on each. Same shape
of correction as plan 13's deviation 5.

**2. [Plan correction] `R-crop-picker` is a route segment, not `?layout=phone`.**
The plan suggests reaching the refusal with a query variant "to avoid a second file". A query
variant cannot work for the same reason `?state=` cannot; it is an eighth `getStaticPaths` entry on
the same file, so no second file was added either. Deliberately absent from `STATES` and
`CANONICAL_STATES` — a layout variant is not a point in the draft lifecycle, and adding it would
silently make the coverage table 49 cells.

**3. [Idiom, deliberate] `T-error-inline` is `inherits` here, not `designed`.**
The plan's action assigns the treatment to this screen. Plan 13 claimed it on `/admin/photos` and
prescribed that plans 14 and 15 inherit it. Plan 13 is the measured document and the orchestrator's
brief restates the rule, so both screens declare `inherits` — and both still render an *instance* of
the warning, because "saving still works" is invisible without a save control on screen. Same for
`T-loading-list`.

**4. [Plan gap filled] Home's `empty` state declares `inherits: E-resume-section`.**
The plan does not say which artefact Home's empty state points at, and there is no `E-home` in
`CANONICAL_IDS`. `home_config.json` always carries a title, a subtitle and an intro, so there is no
empty Home *screen*; the only emptiable thing is a *section*, the peek strip, which is precisely
what `E-resume-section` proves. Inventing an `E-home` would have put a second design in the review
for one decision and taken the E- set past the five ADMIN-IA enumerates.

**5. [Rule 3 — blocking] `Admin.astro` gained a `density` prop.**
Plan 12 hardcoded `data-density="compact"` on the html element because no `R-` artefact existed yet.
UI-SPEC's viewport contract requires `P-` and `R-` artefacts at **comfortable**, and the acceptance
criterion asserts the phone variant does not carry `data-density="compact"`. Two lines plus a
docstring, defaulting to `compact` so the seven existing admin routes are byte-unchanged in that
respect. Verified first that every rule in `density-compact.css` is scoped under
`[data-density="compact"]`, so `comfortable` is the design system's own geometry rather than a
second set of rules.

**6. [Rule 3 — blocking] `SortableStatic.tsx` is a new file the plan does not name.**
`Sortable`'s `renderItem` is a function returning a `ReactNode` and an `.astro` frontmatter block
cannot author JSX. One shared 101-line wrapper closes that for both screens; the alternative was
writing it twice or dropping the `Sortable` composition UI-SPEC's component mapping names for both
routes.

**7. [Scope, deliberate] The `RichTextBullets` island does not render the whole bullet list.**
It renders the live editor, the two serializer readouts and the edited bullet re-rendered from its
stored segments. The full ordered list of every bullet renders once, in the `Sortable` beneath it,
from the same segments and as React elements. Rendering all eleven twice on one 960px column would
have put 22 rows on screen for one entry.

No architectural changes were needed; no Rule 4 checkpoint was raised.

---

## Known Stubs

None that block the plan's goal. Every `TextInput`, `Textarea`, `Select` and `Checkbox` is
uncontrolled; the two `Sortable` lists draw and do not drag; the skill and leadership chip inputs
accept focus and do nothing; `FileInput` accepts a PDF and does nothing with it; the
`Replace with` / `Add Photo to Gallery` / `Add bullet` buttons are inert. All of these are the D-02
scope fence working as specified, each stated in a comment at its site, and Phase 7 owns the wiring.
`.playground/` is deleted in plan 17.

Asserted absent from both islands: `grep -qiE 'fetch\(|localStorage|sessionStorage'` exits 1.

---

## Threat Flags

None. No network endpoint, no storage, no credential and no upload target was added; the two trust
boundaries this plan touches (authored rich text → stored content, committed site content →
gitignored fixtures) are the ones the plan's own threat model already registers, and both
dispositions were honoured — the segment shape carries no markup string, and the G-3 workaround the
register forbids was not written.

---

## Self-Check: PASSED

- `.planning/phases/00-design-ideation/00-14-SUMMARY.md` — FOUND
- `.playground/src/pages/admin/home/[...state].astro` — FOUND (gitignored)
- `.playground/src/pages/admin/resume/[...state].astro` — FOUND (gitignored)
- `.playground/src/components/FocalPointSketch.tsx` — FOUND (gitignored)
- `.playground/src/components/RichTextBullets.tsx` — FOUND (gitignored)
- `.playground/src/components/SortableStatic.tsx` — FOUND (gitignored)
- `.playground/src/fixtures/home.json` + `resume.json` — FOUND (gitignored)
- `dist/admin/home/index.html` + 7 sibling routes — FOUND
- `dist/admin/resume/index.html` + 6 sibling routes — FOUND
- Playground work is gitignored by design (`.gitignore:38`), so tasks 1 and 2 produce no commits,
  exactly as plans 01, 04, 07, 09, 10, 12 and 13 did. The single commit for this plan is this
  SUMMARY.
