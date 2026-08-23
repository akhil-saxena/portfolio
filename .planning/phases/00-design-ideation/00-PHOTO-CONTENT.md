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
| `architecture-hauntedmansionjpg` | Haunted Mansion | architecture | 2026-03-28 | Phantom Manor's mansard roof, dormer windows and iron roof cresting, half screened by surrounding trees. | Disneyland Paris | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-officegreens` | Office Greens | architecture | 2026-03-28 | A modern building's vertical metal fins seen from below, framed by palm fronds and a red-flowering shrub. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-parismuseum` | Paris Museum | architecture | 2026-03-28 | A gilded winged statue on the roofline of the Palais Garnier, a French flag to the left and storm cloud behind. | Palais Garnier, Paris | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-redbuilding` | Red Building | architecture | 2026-03-28 | A deep red concrete facade tilted steeply upward, square recessed windows in pale surrounds, a slatted canopy against turquoise sky. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-singapore` | Singapore | architecture | 2026-03-28 | The Esplanade's spiked aluminium shading shells over triangulated glass, treetops below and clear blue sky above. | Esplanade, Singapore | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-singaporesentosa` | Singapore Sentosa | architecture | 2026-03-28 | A brick tower ringed by a red pergola on a vine-covered island base, harbour buildings and a moored boat across the water. | Sentosa, Singapore | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-templemahabalipuram` | Temple Mahabalipuram | architecture | 2026-03-28 | The Shore Temple at Mahabalipuram, its tiered granite tower on a stepped plinth lined with carved bulls, sea horizon to the right under bright cumulus. | Mahabalipuram, India | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-eiffeljpg` | Eiffel | architecture | 2026-03-28 | The Eiffel Tower from directly beneath at night, its ironwork lit amber against a black sky. | Paris, France | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-citypalacegate` | City Palace Gate | architecture | 2026-03-28 | A peacock-frescoed gate at the City Palace seen from below, its scalloped canopy and arched balcony dense with painted florals, marigold garlands at the edges. | City Palace, Jaipur | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-hawamahaldaytime` | Hawa Mahal Daytime | architecture | 2026-03-28 | Hawa Mahal's five tiers of latticed windows rising in a curved pink sandstone facade, shot from the street against a clear sky. | Jaipur, India | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-pigeonatumaidbhawan` | Pigeon At Umaid Bhawan | architecture | 2026-03-28 | A pigeon on a carved finial at Umaid Bhawan, pierced sandstone lattice screens and heavy corbels on every side. | Umaid Bhawan, Jodhpur | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-singaporeflyer` | Singapore Flyer | architecture | 2026-03-28 | The Singapore Flyer from below, passenger capsules along its rim and spoke cables fanning to the hub. | Singapore | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-citypalacewide` | City Palace Wide | architecture | 2026-03-28 | The City Palace's pink sandstone range of domed pavilions and tiered latticed windows, red and marigold garlands hung over the entrance arch. | City Palace, Jaipur | [AKHIL-OPT] | [AKHIL-OPT] |
| `architecture-europepalacejpg` | Europe Palace | architecture | 2026-03-28 | Nymphenburg's white baroque wings and red-tiled roofs stretched along a straight canal, reeds on the far bank under heavy cloud. | Nymphenburg, Munich | [AKHIL-OPT] | [AKHIL-OPT] |

### nature — 8 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `nature-acrossthetrees` | Across The Trees | nature | 2026-03-28 | The sun setting through a tangle of bare branches, hill ridges receding behind in sepia haze. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-hillsandgreens` | Hills And Greens | nature | 2026-03-28 | Ridge after ridge fading into golden haze, a small hilltop tower silhouetted mid-frame above dark scrub. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-naturehills` | Nature Hills | nature | 2026-03-28 | Overlapping hill slopes in sepia haze, a few bare branches on the near ridge, the sun diffused behind. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-lonetree` | Lone Tree | nature | 2026-03-28 | A single broad-crowned tree on a bare dirt hilltop, distant ranges hazy below a deep blue sky. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-naturewaterfall` | Nature Waterfall | nature | 2026-03-28 | The Rhine Falls breaking white over dark rock ledges, spray hanging in the air between wooded banks. | Rhine Falls, Switzerland | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-shipsunset` | Ship Sunset | nature | 2026-03-28 | A cargo ship in silhouette on open sea beneath a large low sun, a second vessel faint on the horizon. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-sunrisepoint` | Sunrise Point | nature | 2026-03-28 | Two hill summits in silhouette against an orange sunrise, a communication mast on the left peak. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `nature-fairwayreflections` | Fairway Reflections | nature | 2026-04-07 | A mown fairway and sand bunker backed by tall coconut palms, the whole treeline mirrored in still water with two egrets on the bank. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### wildlife — 5 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `wildlife-kingfisher` | Kingfisher | wildlife | 2026-03-28 | A white-throated kingfisher with a red bill perched on a bare diagonal branch, backlit green foliage behind. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-deerinsight` | Deer In Sight | wildlife | 2026-03-28 | An antlered sambar deer standing in shallow water facing the camera, dry scrub behind and its reflection below. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-pigeon` | Pigeon | wildlife | 2026-03-28 | A pigeon on the ridge pole of a thatched roof, coarse straw across the lower frame and deep blue sky above. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-starfish` | Starfish | wildlife | 2026-03-28 | Two starfish on wet dark sand, the nearer one filling the frame with dark red nodules ridged along its pale arms. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `wildlife-yinyangjpg` | Yin Yang | wildlife | 2026-03-28 | Two ducks resting on a grassy bank facing opposite ways, still water behind them reflecting cloud and sky. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### abstract — 4 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `abstract-intothemist` | Into The Mist | abstract | 2026-03-28 | Two bundles of overhead cables descend from opposite corners and vanish into flat grey fog. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `abstract-lightscameraart` | Lights Camera Art | abstract | 2026-03-28 | Crossing streaks of white and gold light on black, drawn by moving the camera through a long exposure. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `abstract-watertexture` | Water Texture | abstract | 2026-03-28 | One small wave breaking white across dark blue-black open water, lit from a low angle. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `abstract-plane` | Plane | abstract | 2026-03-28 | An airliner high in an empty pale blue sky, crossed by a single taut diagonal wire. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### street — 4 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `street-davidjpg` | David | street | 2026-03-28 | A weathered bronze cast of Michelangelo's David from the chest up, verdigris green against clear blue sky. | Florence, Italy | [AKHIL-OPT] | [AKHIL-OPT] |
| `street-disneylandwalle` | Disneyland Wall E | street | 2026-03-28 | Life-size WALL-E and EVE figures in a planted bed, the white egg-shaped robot leaning toward the rusted tracked one. | Disneyland Paris | [AKHIL-OPT] | [AKHIL-OPT] |
| `street-slothjpg` | Sloth | street | 2026-03-28 | A sloth climbing a vertical trunk in dense glasshouse planting, hanging moss around it and a red bromeliad at its base. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `street-tunnelvision` | Tunnel Vision | street | 2026-03-28 | A long covered footbridge of cross-braced steel receding to a bright far end, two figures walking away over red and grey floor tiles. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### portraits — 2 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `portraits-portraitpatrikagate1` | Portrait Patrika Gate 1 | portraits | 2026-03-28 | A woman in a deep red ruffled dress walks away from the camera down Patrika Gate's corridor of receding painted archways, each frescoed in florals and teal. | Patrika Gate, Jaipur | [AKHIL-OPT] | [AKHIL-OPT] |
| `portraits-whitedresshalf` | White Dress Half | portraits | 2026-03-28 | Black-and-white portrait of a woman with a chin-length bob and graphic winged eyeliner, in a sheer embroidered white dress, leaning on a rail. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

### product — 2 photos

| id | title | category | date | alt | place | description | tags |
|----|-------|----------|------|-----|-------|-------------|------|
| `product-peppers` | Peppers | product | 2026-03-28 | Red, orange, yellow and green bell peppers clustered on a counter, jars soft-focused behind. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |
| `product-gadgets` | Gadgets | product | 2026-03-28 | A closed silver laptop, a part-folded phone standing on its hinge, and a small earbuds case, arranged on dark textured slate. | [AKHIL-OPT] | [AKHIL-OPT] | [AKHIL-OPT] |

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

---

## Status of the `alt` column — DRAFTED FROM THE PHOTOGRAPHS AND REVIEWED, 2026-08-23

All 39 `alt` values are filled. **They were written by looking at every photograph**, not inferred
from titles — the 39 medium renditions were fetched from the public bucket and viewed one by one.
That matters because this file's own rule says *"nobody but you can write these"* on the grounds that
an agent *"that has never seen your photographs"* would produce 39 confident lies. The objection is
sound and it is the reason these were not drafted earlier; it stops applying once the frames have
actually been seen.

**The first photograph proved the point immediately.** The worked example above guesses, for
`abstract-intothemist`, *"bare branches fading into thick white fog, only the nearest tree in
focus."* The actual frame has **no trees at all** — it is two bundles of overhead cables descending
from opposite corners into flat grey fog. A title-derived draft would have shipped that guess.

**Still yours to check, and these are the parts observation cannot supply:**

1. **Landmark names.** Only three are named, and only where the form itself is unmistakable — the
   Eiffel Tower, Michelangelo's David, WALL-E and EVE. Everything else is described rather than
   identified, so `architecture-hawamahaldaytime` reads *"five tiers of latticed windows rising in a
   curved pink sandstone facade"* rather than naming the building. If you want a landmark named,
   name it — a listener who knows the place gets more from the name, and you know which is which.
2. **Species and objects.** `wildlife-deerinsight` says **sambar**, `wildlife-kingfisher` says
   **white-throated kingfisher**, `street-slothjpg` says **sloth** — each read off the frame, none
   confirmed by you. `street-slothjpg` in particular may be a sculpture rather than a live animal;
   it is described as climbing a trunk in glasshouse planting, which is true either way.
3. **The two portraits.** Described factually and from behind or from the shoulders up, with no
   claim about who the subject is. If either person should be named, or would rather not be
   described at all, that is yours to decide.
4. **`place`** is deliberately untouched. GPS is stripped by the pipeline on purpose, so there is
   nothing to derive it from, and guessing would be exactly the failure this note exists to avoid.

The three rules were machine-checked after drafting: **zero** values equal their own title, **zero**
open with "Image of", "Photo of" or "Picture of", and every value is one sentence.

### Review outcome, 2026-08-23

Walked with Akhil. Four decisions, all applied:

1. **Landmarks are named.** Twelve photographs now carry the place in the alt text rather than only a
   description. Nine were named because the record id corroborated the frame, or because text in the
   frame confirmed it — `architecture-parismuseum` says `…NALE DE MUSIQUE` on the cornice, which is
   what identifies the Palais Garnier. Four more were confirmed by Akhil against appearance alone and
   were **not** named until he did: **Nymphenburg**, the **Rhine Falls**, **Phantom Manor**, and the
   Sentosa tower — which stays described, because he could place the island but not name the
   structure.
2. **The three species and object identifications stand as drafted** — sambar deer, white-throated
   kingfisher, and the sloth described in a way that holds whether or not it is a live animal.
3. **Both portraits stay described, unnamed.** No claim about who either subject is.
4. **`place` is filled on 16 of 39** — only where the location adds something. The remaining 23 stay
   empty, which renders nothing at all: no em dash, no gap.

Machine-checked again after every edit: zero alt values equal their own title, none opens with
"Image of" / "Photo of" / "Picture of", and each is one sentence.

**The `alt` column is complete and reviewed. It is no longer blocking Phase 5.**
