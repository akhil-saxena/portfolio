# Photo content brief — 39 rows awaiting Akhil

<!--
  ORDERING CONSTRAINT, load-bearing:
  The FIRST literal occurrence of the alt marker in this file MUST be a table row's
  alt cell. The negative controls for check-photo-content.mjs replace the first
  occurrence in the file; if prose above the tables ever contains the marker
  literally, those controls would silently edit prose and stop testing anything.
  The marker is therefore explained in a section BELOW the tables, not above them.
-->

Generated from `data/portfolio_images.json` — **39 records**, one row each, no row hand-typed. `title`, `category` and `date` are copied
verbatim from the manifest so you have context. The last four columns are yours to fill.

---

## What alt text is for here

The public gallery ships **zero framework JS**. There is no hover, no tooltip, no tap-to-
expand and no interaction of any kind that could reveal a description later, because there
is no JavaScript on the page to implement one. The `alt` string is delivered on the `<img>`
element itself, and it is **the entire non-visual experience of all 39 photographs**. It is not a
fallback for when something fails — it is the whole channel, and nothing else is coming.

This is also why **nobody but you can write these**. An agent that has never seen your
photographs and writes 39 plausible descriptions of them produces 39 confident lies about your
own work, and every one of them reaches a screen-reader user as fact. So every `alt` cell
below is a placeholder marker and nothing else.

## The three rules

1. **Describe what is in the frame** — the subject, and enough setting to place it.
2. **Do not repeat the title.** A title names a photograph; alt text describes one. They are
   different jobs and the gate rejects a value that equals its own title.
3. **Do not open with "Image of", "Photo of" or "Picture of".** A screen reader announces
   the role before it reads your text, so the prefix is the same word twice — 39 times on
   one page.

Aim for one sentence. Long alt text is its own accessibility defect: the listener hears
the whole string before reaching the next image, with no way to skim.

## Worked example — the difference, on a real record

Take `abstract-intothemist`, whose title is **“Into The Mist”**. That title is evocative; it is not a
description. Three candidate alt values:

- ✗ `Into The Mist` — breaks rule 2. It is the title. A listener receives a name they cannot resolve into
  an image, and it *looks* like the field was filled in.
- ✗ `Photo of mist over trees` — breaks rule 3. The first two words are announced twice.
- ✓ The shape that works: **‹what the frame shows›, ‹enough setting to place it›.** For
  instance — and this is an *illustration of the shape only, deliberately not a description
  of your actual photograph, which nobody writing this file has seen* — something of the form
  “Bare branches fading into thick white fog, only the nearest tree in focus.” Replace it
  with what is really in the frame.

## The other three columns

- **`place`** — free text, e.g. `Lisbon, Portugal`. **Optional, and deliberately manual.**
  The image pipeline strips GPS on purpose (`exifr.parse(..., { gps: false })` in
  `scripts/process-images.js`), so there is nothing to derive it from — and deriving it would
  be a privacy regression, publishing the precise coordinates of personal photographs.
  You choose the granularity per photo: a city, a country, a park, or nothing at all.
- **`description`** — **optional** prose about the photograph. It renders in the **lightbox
  only**, never under the grid tile. An empty description renders nothing at all — no em
  dash, no gap.
- **`tags`** — **optional**, comma-separated. Currently empty on all 39 records.

**Only `alt` is required.** A photo with no place, no description and no tags is a complete
record. A photo with no alt is not.

---

## The rows

Every `alt` cell below carries a required-value placeholder marker; the three optional
columns carry a different one. Replace a marker with your text, or clear an optional cell to
leave it empty. Both markers are named and explained in *Why the marker here differs* at the
end of this file.

### architecture — 14 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `architecture-hauntedmansionjpg` | Haunted Mansion | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-officegreens` | Office Greens | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-parismuseum` | Paris Museum | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-redbuilding` | Red Building | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-singapore` | Singapore | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-singaporesentosa` | Singapore Sentosa | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-templemahabalipuram` | Temple Mahabalipuram | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-eiffeljpg` | Eiffel | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-citypalacegate` | City Palace Gate | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-hawamahaldaytime` | Hawa Mahal Daytime | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-pigeonatumaidbhawan` | Pigeon At Umaid Bhawan | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-singaporeflyer` | Singapore Flyer | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-citypalacewide` | City Palace Wide | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-europepalacejpg` | Europe Palace | architecture | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### nature — 8 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `nature-acrossthetrees` | Across The Trees | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-hillsandgreens` | Hills And Greens | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-naturehills` | Nature Hills | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-lonetree` | Lone Tree | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-naturewaterfall` | Nature Waterfall | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-shipsunset` | Ship Sunset | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-sunrisepoint` | Sunrise Point | nature | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-fairwayreflections` | Fairway Reflections | nature | 2026-04-07 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### wildlife — 5 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `wildlife-kingfisher` | Kingfisher | wildlife | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-deerinsight` | Deer In Sight | wildlife | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-pigeon` | Pigeon | wildlife | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-starfish` | Starfish | wildlife | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-yinyangjpg` | Yin Yang | wildlife | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### abstract — 4 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `abstract-intothemist` | Into The Mist | abstract | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `abstract-lightscameraart` | Lights Camera Art | abstract | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `abstract-watertexture` | Water Texture | abstract | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `abstract-plane` | Plane | abstract | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### street — 4 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `street-davidjpg` | David | street | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `street-disneylandwalle` | Disneyland Wall E | street | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `street-slothjpg` | Sloth | street | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `street-tunnelvision` | Tunnel Vision | street | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### portraits — 2 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `portraits-portraitpatrikagate1` | Portrait Patrika Gate 1 | portraits | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `portraits-whitedresshalf` | White Dress Half | portraits | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### product — 2 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `product-peppers` | Peppers | product | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `product-gadgets` | Gadgets | product | 2026-03-28 | [AKHIL-ALT] | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

**Totals** — architecture 14, nature 8, wildlife 5, abstract 4, street 4, portraits 2, product 2.
Sum: **39**, against a manifest of **39**.

---

## Why the marker here differs from the one used elsewhere

The two markers in the tables above are `[AKHIL-ALT]` for the required alt value and `[AKHIL-OPT]` for the
three optional ones.

That differs from the `[NEEDS·AKHIL]` marker the copy drafts use, and it looks like an
inconsistency. It is not. *(The interpunct in that name is deliberate — spelled with a plain
space, the literal string would make this file register as an unwritten copy draft to a gate
that has no business scanning it.)*

`scripts/check-copy-length.mjs` enforces a **40-word floor** after every such marker — D-40's
realism rule for prose written at paragraph scale, where a two-line placeholder hides a real
writing job.

Alt text is one sentence. Reusing that marker would do one of two things, both bad: fail the
copy-length gate on 39 rows, or push the writer toward 40-word alt strings — **and a 40-word alt
string is itself an accessibility defect**, because a screen-reader user hears every word of
it before reaching the next image, 39 times over.

Different content, different floor, different marker. The two gates also never meet: this
file lives at the phase root, and `check-copy-length.mjs` scans `00-COPY/` and nothing else.

Completeness and quality here are enforced by
`.planning/phases/00-design-ideation/scripts/check-photo-content.mjs` instead, which
derives its row set from the manifest — so a newly published photo cannot be missed by
forgetting to add a row.
