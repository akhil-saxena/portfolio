---
phase: 05-public-site
plan: 09
subsystem: ui
tags: [astro, react, design-system, statuspill, stretched-link, seo, work]

requires:
  - phase: 05-01
    provides: the design system installed from the registry, the import contract, and `resolveDsTokens`
  - phase: 05-02
    provides: `data/projects.json` with `status`, `oneLiner` and the reviewed card copy
  - phase: 05-03
    provides: the resolved `metric` on every experience entry, and the `dist/` placeholder refusal
  - phase: 05-06
    provides: PublicLayout, public-shell.css, `<Seo>`, the gutter ladder and the page maxima
provides:
  - "/work — the header, the employment strip and the five project cards, zero framework JavaScript"
  - "src/components/public/EmploymentBand.astro — the 1080-capped hairline band, capped from PAGE_MAX.band"
  - "src/components/public/ProjectCard.astro — Card + StatusPill + Chip + the stretched outbound link"
  - "src/styles/work.css — the page's layout and §3.1 type roles, with the specificity arithmetic stated"
  - "test/public/work.node.test.ts — 15 HTTP controls over the built artefact"
affects: [05-11, 05-13, 05-14, 05-15, 06-case-studies, 08-cutover]

tech-stack:
  added: []
  patterns:
    - "a stretched-link `::after` on the card TITLE, so the link's accessible name is the title and the badge row stays a sibling rather than an illegal nested anchor"
    - "a layout constant that CSS needs but cannot import arrives as an inline custom property from the TypeScript record, so the number is written once"
    - "an artefact claim about a card is asserted INSIDE that card — every count in the check and the suite is sliced to its own region"
    - "a design-system component that inline-styles a property is overridden through its own `style`/`color` props, never with `!important` and never from a stylesheet that would lose to the inline rule"

key-files:
  created:
    - src/pages/work.astro
    - src/components/public/EmploymentBand.astro
    - src/components/public/ProjectCard.astro
    - src/styles/work.css
    - test/public/work.node.test.ts
  modified: []

key-decisions:
  - "The card surface links out through a STRETCHED TITLE ANCHOR, not a card-shaped anchor: the accessible name is the title plus the announcement rather than forty words, and the badges stay siblings."
  - "`badges[]` renders with NO icon. The design system's `icons` subpath exports 32 wrappers and none of the four stored icon names; reaching around it into its transitive `lucide-react` was refused."
  - "`getCollection('projects')` returns the records sorted by `id`, not in file order (MEASURED). The file supplies the ORDER and the collection the validated RECORDS."
  - "The band is capped by `PAGE_MAX.band` through an inline custom property; `.pub-max-band` was rejected because it also centres, which would inset the band 100px from the header above it."
  - "The employment metric takes 05-10's treatment exactly, plus a CSS separator — `compressHTML` deletes the template whitespace between the two spans, which is why /resume currently runs them together."

patterns-established:
  - "Every planter asserts its own anchor, re-asserts the plant AT CHECK TIME, and verifies each restore byte-identical against a backup held outside the repository."
  - "A source-level plant is the only honest control for a suite whose globalSetup rebuilds: an artefact plant is overwritten before the first assertion runs."
  - "A criterion that is a plain grep for a token name fires on prose. Move the prose; do not narrow the grep."

requirements-completed: [PUB-02, SEO-01]

duration: ~65min
completed: 2026-08-29
---

# Phase 5 Plan 09: The Work Route Summary

**`/work` renders the three employment rows and the five project cards straight out of
`data/resume.json` and `data/projects.json` with zero framework JavaScript, spells its own project
count from the data and refuses to render one above twelve, opens all thirteen outbound anchors
safely and announced through a stretched title link that never nests an anchor inside an anchor, and
carries the employment metric in exactly the treatment 05-10 gave it on `/resume` — with the one
separator that page is missing.**

## Performance

- **Duration:** ~65 min
- **Tasks:** 3 of 3
- **Files created:** 5 · **Files modified:** 0
- **Commits:** `067b8f5`, `e545049`, `4a9f01a`, plus this summary

---

## The route as built

`src/pages/work.astro` → `PublicLayout mainClass="pub-max-work wk-page"`, `<Seo>` into the named head
slot, then four blocks in `<main>`:

| # | Block | Source | Rendered by |
|---|---|---|---|
| 1 | `<h1>` "Things I design and build**.**" + the 480px sub-paragraph | reviewed page copy, transcribed from `design_handoff_portfolio/Work.dc.html` | plain elements, Playfair `--text-4xl` |
| 2 | `PROFESSIONAL EXPERIENCE` + three hairline rows | `resume.experience` via `src/lib/content.ts` | `EmploymentBand.astro`, `formatPeriod()` |
| 3 | `PROJECTS` + the derived count line + the card grid | the `projects` collection, ordered by `data/projects.json` | `ProjectCard.astro`, `Card` · `StatusPill` · `Chip` · `Link` |
| 4 | the italic serif cross-link → `/photos` | reviewed copy (§13.2) | design system `Link` |

Derived at build time from the committed fixtures: **3 employment rows**, **5 project cards**,
**14 tech chips**, **8 badge links**, **13 outbound anchors**, **81 components / 10 categories**.
None of those numbers is written in `work.astro`, `EmploymentBand.astro`, `ProjectCard.astro`,
`work.css` or `work.node.test.ts` — every one is read from its source at build or test time.

The count line reads **`five — shipped on my own`**; `five` is `spellCount(projects.length)` and
the rest is §10 item 5's reviewed copy. `spellCount` spells 1–12 and **throws** above that, which
was proven by a real build rather than by argument (below).

**The header copy is on the page and nowhere else.** §10 items 1 and 2 give the header but no
sub-paragraph text; the reviewed sentence came out of the 2026-08-22 handoff capture —
*"Products shipped on my own — a component system and a few apps — alongside frontend engineering at
Brevo."* — which also confirmed the `see the photographs →` cross-link, its right alignment and its
accent, and the space between a metric's two halves.

---

## The metric band — how it renders, and how it lines up with 05-10

Both halves are read whole from the record and rendered in the row's right-hand column:

```css
.wk-metric        { font-family: var(--font-mono); font-size: var(--text-xs);
                    font-weight: var(--weight-medium); letter-spacing: var(--ls-wide);
                    text-align: right; color: var(--ink-3); }
.wk-metric-value  { margin-right: var(--space-2); color: var(--ochre-d-strong); }
```

Compared, declaration by declaration, against `src/styles/resume.css`'s `.rs-metric` /
`.rs-metric-value`:

| Property | `/resume` (05-10) | `/work` (this plan) | Same? |
|---|---|---|---|
| family | `--font-mono` | `--font-mono` | ✅ |
| size | `--text-xs` (11) | `--text-xs` (11) | ✅ |
| weight | `--weight-medium` | `--weight-medium` | ✅ |
| letter-spacing | `--ls-wide` | `--ls-wide` | ✅ |
| line-height | `--lh-normal` | `--lh-normal` | ✅ |
| value colour | `--ochre-d-strong` | `--ochre-d-strong` | ✅ |
| label colour | `--ink-3` (the ink ramp) | `--ink-3` | ✅ |
| alignment | left inside a right-hand column (`.rs-entry-aside { align-items: flex-start }`) | `text-align: right` | §10 asks for right-aligned here |
| separator | **none** | `margin-right: var(--space-2)` | ❌ — see below |

**Nothing encodes the wording.** The page, both components, the stylesheet and the suite compare
`entry.metric.value` and `entry.metric.label` to `data/resume.json` and never to a string. Editing a
value changes rendered text and nothing else; emptying one is refused by
`ExperienceEntrySchema`'s `strictObject`; storing a `{{…}}` token fails the build through
`scripts/assert-no-unresolved-placeholders.mjs`, which this plan re-ran and which is proven able to
fire below.

### 🔴 The one divergence, and it is a defect on `/resume`, not a choice here

MEASURED in the built `dist/client/resume/index.html`:

```
rs-metric-value">+15%</span><span class="rs-metric-label"
rs-metric-value">4K+</span><span class="rs-metric-label"
rs-metric-value">6×</span><span class="rs-metric-label"
```

There is **nothing between the two spans**, so `/resume` renders `+15%CONVERSION`,
`4K+FRANCHISES` and `6×FASTER PIPELINES` as single run-together words. `ResumeEntry.astro` puts the
two spans on separate source lines; Astro's `compressHTML` (on by default) removes that newline, so
a whitespace-only separator in a template does not survive the build. Neither `.rs-metric` nor
`.rs-metric-value` declares a gap.

The reviewed capture reads `+15% CONVERSION` with a space, so the space is the reviewed intent on
both routes. `/work` declares it in CSS, where compression cannot reach it. **`/resume` is plan
05-10's file and was not touched from here** — this is reported for 05-15, and the fix is one
declaration: `.rs-metric-value { margin-right: var(--space-2) }`.

---

## Every gate proven able to fail

Four steps each: **plant → FAIL naming it · FAIL given nothing to check · PASS on correct code ·
walk-through**. The interactive shell is **zsh 5.9**; every control body ran under **bash
5.3.9(1)-release** via `bash <file>`, and the shell is named per control. Every planter asserted its
own anchor before editing, re-asserted the plant **at check time** (05-10 recorded a false PASS
caused by a concurrent build regenerating a file between a control's `mv` and its check), and every
restore was verified byte-identical against a backup held **outside** the repository.

### A. The task-1 artefact check — rows, periods, metrics, the amber prohibition · shell: bash 5.3.9(1)-release

| # | Control | Result |
|---|---|---|
| A1 | correct code | `rows: 3 rendered against 3 stored` · three period lines printed · `metrics: 3/3` · exit **0** |
| A2 | one built `<article class="wk-row">` deleted | `rows: 2 rendered against 3 stored` · `FAIL: 2 rendered row(s) against 3 stored` · exit **1** |
| A3 | one rendered period changed (`Jun 2023` → `Jul 2023`) | prints rendered and expected side by side · `FAIL: row 1 (pharmeasy) period/role line does not equal formatPeriod(entry)` · exit **1** |
| A4 | one metric value emptied in the built page | `FAIL: metric value for pharmeasy is not in the built page` · exit **1** |
| A5 | the renderer removed, the data intact (`wk-role` → `wk-gone`) | `FAIL: no .wk-role line in the built page — the renderer is missing, not the data` · exit **1** |
| A6 | **nothing to check** — the built page absent | `FAIL: …/dist/client/work/index.html does not exist — every assertion below would read nothing` · exit **1** |
| A7 | the vivid amber token written into `work.css` | `amber-vivid in src/styles/work.css: 1 occurrence(s)` · exit **1** |
| A8 | correct code again | exit **0** |

`formatPeriod` is **imported** by the check from `src/lib/period.ts` (`node --experimental-strip-types`),
not re-implemented — a check carrying its own date formatter would be the second definition the
invariant exists to prevent.

**Walk-through — three inputs that satisfy this check while violating its intent:**

| Probe | Verdict |
|---|---|
| a company name changed in the built page | exit 0 — **ACCEPTED.** The check reads only the role/period line. **Closed by the suite**, which asserts each row contains its own `entry.company`. |
| two metric values swapped between rows | exit 0 — **ACCEPTED.** It asks "does this value appear", not "in which row". **Closed by the suite**, which asserts each value and label inside its own `<article class="wk-row">`. |
| the 1080 cap removed from the band | exit 0 — **ACCEPTED.** Not this check's claim. **Closed by the suite** (control D5). |

### B. The task-2 artefact check — cards, outbound anchors, pills, the count · shell: bash 5.3.9(1)-release

| # | Control | Result |
|---|---|---|
| B1 | correct artefact | `cards: 5 rendered against 5 stored` · `external anchors in the grid: 13 (expected 13), announced 13` · `count line: "five — shipped on my own"` · exit **0** |
| B2 | one badge anchor loses its `rel` | `FAIL: card hued: an anchor with target="_blank" carries rel=null` · exit **1** |
| B3 | one external anchor loses its announcement | `FAIL: card momentum: an external anchor (…momentum.goals) has no new-tab announcement` · exit **1** |
| B4 | a card's `StatusPill` removed | `FAIL: card hued carries 0 StatusPill span(s), expected exactly 1` · exit **1** |
| B5 | a `Badge` element introduced into a card | `FAIL: card hued carries 1 Badge element(s); §10.2 forbids Badge here` · exit **1** |
| B6 | a card link repointed | `FAIL: card cairn's card link points at https://cairn.example, not https://cairn.co.in` · exit **1** |
| B7 | one whole card removed | `cards: 4 rendered against 5 stored` · exit **1** |
| B8 | the count line hand-typed wrong (`five` → `four`) | `FAIL: the count line reads "four — shipped on my own", expected "five — shipped on my own"` · exit **1** |
| B9 | **nothing to check** — the built page absent | refuses, naming the file · exit **1** |
| B10 | correct artefact again | exit **0** |

Every plant printed its own resulting digest, every restore came back to
`a4ac90ac734cb6e5da420da1465ab6f96e7230e63fdfa48c347eba3cb6221d34`, and B4's first anchor
(`data-tone="secondary"`) was **REFUSED** because no project is `archived` — which is itself a
finding, recorded below.

**Walk-through — two inputs that satisfy this check while violating its intent:**

| Probe | Verdict |
|---|---|
| the `::after` stretch rule deleted from the CSS | exit 0 — **ACCEPTED.** The check reads the HTML; the card would still link out from its title, just not from its whole surface. Not closed anywhere; it is a visual claim and belongs to 05-15. |
| a card's chips replaced with another card's | exit 0 — the chip assertion is `card.includes('>tech</span>')` and two cards could share a stack. **Closed by the suite**, which compares each card's chip list to `project.tech` with `toEqual`. |

### C. `spellCount` above range, proven through a REAL BUILD · shell: bash 5.3.9(1)-release

The `<done>` asks for the throw "proven by calling the word map with 13". A source plant is the
strongest available form: the function then runs inside `workerd` during prerender, which is where
it would actually be called.

Plant: `spellCount(cards.length)` → `spellCount(SPELLED_COUNT.length + 1)`.

```
[ERROR] RangeError: work.astro: spellCount(13) - the projects count line spells 1 to 12 in words
and refuses anything outside that range. Falling back to digits would ship a bare numeral in a
Playfair-and-mono line where nobody would notice it. Extend SPELLED_COUNT, or reword the line.
    at spellCount (…/dist/server/.prerender/chunks/work_CoHrhqH_.mjs:95:72)
[ERROR] [build] Caught error rendering /work
-> astro build exit 1
```

Restored byte-identical (`c3291251…`), rebuilt, exit **0**.

**A side finding fixed on the way:** the message originally contained an em dash. Astro puts a
prerender error into an `x-astro-prerender-error` HTTP header, warns loudly about the non-ASCII
byte, and the message it finally prints is **mangled** (`spellCount(13) â the projects…`). The
throw's text was changed to ASCII so the surfaced build error is readable — a refusal nobody can
read is most of the value gone.

### D. The resolver stub — ONE defect, TWO independent controls · shell: bash 5.3.9(1)-release

Plant: `resolveDsTokens(project.description)` → `((t: string) => t)(project.description)`, i.e. the
identity, together with the one-liner guard so it could not mask the artefact-level result. Planted
in **this plan's own file** rather than in 05-01's `src/lib/ds-component-count.ts`, so no concurrent
plan saw a broken module in the shared tree; the effect on `dist/` is identical.

**Control 1 — `scripts/assert-no-unresolved-placeholders.mjs dist`, exit 1:**

```
  BUILD REFUSED — OQ-1b: an unresolved placeholder reached rendered HTML
  x dist/client/work/index.html:34: [PH-RAW] {{ds.componentCount}}
      …across every screen at once. {{ds.componentCount}} componen…
  x dist/client/work/index.html:34: [PH-RAW] {{ds.categoryCount}}
  2 finding(s) (2 occurrence(s)).
```

**Control 2 — the HTTP suite, exit 1, scoped to the one claim:**

```
FAIL  |integration| … > resolves the component figure from the design system README, never a token
AssertionError: card design-system's description is not the resolved stored one
Tests  1 failed | 13 passed (14)
```

Restored byte-identical (`931a0e76…`); rebuild exit 0, gate exit 0, suite 14/14.

### E. `test/public/work.node.test.ts` — 15 controls, six source plants · shell: zsh 5.9 driving `npx vitest run`

Green: **15 passed**, against the built artefact served by real `workerd`. Evidence lines, verbatim
(written with `process.stdout.write` — `console.log` prints nothing under this repo's vitest setup):

```
work: 21535 bytes of HTML from http://127.0.0.1:54472/work
h1: 1 element, "Things I design and build.", stop wrapped in .wk-stop
rows: 3 rendered against 3 stored, every period from formatPeriod
metrics: 3 value+label pair(s), each inside its own row, none compared to a literal
band: --wk-band-max is 1080px, which is PAGE_MAX.band
cards: 5 rendered, in file order (cairn, hued, momentum, timeshift, design-system)
ds figures: resolver 81 components / 10 categories · served card 81 / 10 · neither token survives · 1 stored description(s) carry a token
outbound: 13 anchor(s) in the grid, 13 announced, all rel-paired
statuses: 5 pill(s), one per card, generic path, zero Badge; tones live, maintained
chips: 14 rendered against 14 stored, each inside its own card
count line: "five — shipped on my own" for 5 stored project(s)
cross-link: "see the photographs →" → /photos, italic serif in --ochre-d
seo: canonical === og:url === https://akhilsaxena.com/work; og:title/description/type/image/image:alt and twitter:card present
scripts: 1 tag(s), 0 type=module, 0 astro-island, 0 ld+json; the one block is the shell's theme script
grid: steps at 673px, 1024px; every @media width in the served CSS is one of 375, 673, 1024
```

**Every plant is in SOURCE**, because the suite's `globalSetup` runs a real `astro build` before it
serves — an artefact plant would be overwritten before a single assertion ran, which is a false
control dressed as a real one.

| # | Plant | Failing test | Result |
|---|---|---|---|
| D1 | `client:load` on the cross-link | *ships zero framework JavaScript* | `expected 3 to be 1` · exit **1** |
| D2 | a second `<h1>` | *carries exactly one `<h1>`* | `the page carries 2 <h1> elements` · exit **1** |
| D3 | the cross-link copy edited | *carries the italic serif cross-link* | `expected 'see the photos →' to be 'see the photographs →'` · exit **1** |
| D4 | a card link loses `target="_blank"` | *opens every outbound anchor safely* | `expected 8 to be 13` · exit **1** |
| D5 | the band cap detached from `PAGE_MAX.band` | *caps the band at PAGE_MAX.band* | `to contain 'style="--wk-band-max: 1080px"'` · exit **1** |
| D6 | the grid stepped at 1100px | *steps the card grid at the ladder's own breakpoints* | `the served CSS steps at 1100px, which is not in BREAKPOINTS` · exit **1** |
| D7 | correct source again | — | **15 passed** |

Each failure is scoped to the claim that broke (1 failed, 13–14 passed) and every restore was
byte-identical.

**Anti-vacuity:** every derived expectation is preceded by an assertion that the fixture is
non-trivial — experience records > 0, projects > 0, `.wk-row` blocks > 0, cards > 0, stored tech
> 0, CSS bytes > 0, `BREAKPOINTS.length` > 2, the resolver's two counts > 0, and **at least one
stored description must carry a `{{…}}` token**, or "no token survives" would be true of a fixture
that never had one.

**Walk-through — the residual, measured not imagined:**

Plant: the `<h1>` copy rewritten to `Stuff I knock together.` **and** the sub-paragraph replaced
with `Lorem ipsum dolor sit amet.` Result: **15 passed, exit 0.** The reviewed page copy is
**not asserted** — only that there is exactly one `<h1>` and that the accent is on a wrapped final
stop. **OPEN, and deliberately.** The two sentences are page copy rather than data, 05-15 owns the
copy review, and the suite's own evidence line prints the rendered heading verbatim
(`h1: 1 element, "Stuff I knock together."`), so a reviewer reading the output sees the change. The
cross-link is the exception and IS asserted character for character, because §13.2 makes it a
contract entry.

---

## 🔴 Seven defects in the plan's own `<verify>` commands

All were found by detonating the commands, not by reading them.

### Task 1 (three)

1. **`/class="[^"]*wk-row/g` is a CONTAINS match.** It counts any class attribute whose value
   contains `wk-row` anywhere. It happens to be exact against this implementation only because the
   row's children were named `wk-identity` / `wk-company` / `wk-metric` rather than `wk-row-*` — the
   obvious naming. Had they been, the command would have reported 5 rows per row and the equality
   `rows !== n` would have failed on correct code. Replaced with `/class="wk-row"/g`.
2. **It asserts no period at all**, while the task's own `<done>` requires each rendered period to
   equal `formatPeriod(entry)` "computed independently in the check". Added, in document order, with
   the real function imported.
3. **No presence refusal and no `--amber-vivid` grep**, both of which the `<done>` asks for. A
   `readFileSync` on a missing artefact does exit non-zero, but it does not say which red it is.

### Task 2 (four)

4. **The `target` / `rel` counts are PAGE-WIDE and compared as two totals.** Two totals can balance
   while an individual anchor is unpaired — and the count silently absorbs anything the shared shell
   adds later. Replaced with a per-anchor assertion scoped inside each card.
5. **`h.includes(pr.href)` proves only that the href is somewhere on the page.** cairn's href is on
   its badge as well as its card link, so the assertion passes for cairn with the card link gone.
   Replaced with "the anchor carrying `wk-card-link` inside card *i* has href `projects[i].href`".
6. **Neither "exactly one StatusPill per card" nor "zero Badge" is asserted**, though both are in
   the `<done>`.
7. **The derived count line is not asserted**, though the `<done>` requires it to be recorded
   against `projects.length`.

### Task 3

**Task 3's command was found sound** — `test -f` guarded, the direction correct, and it refuses
rather than passing vacuously. Two holes are properties of its pattern rather than defects in its
wiring, and both are closed by the suite: it matches only the double-quoted `type="module"`
spelling, and it cannot see a dynamic `import()` inside a classic script. The second is 05-14's gate,
exactly as 05-10 recorded.

### A criterion that fires on prose, and was left alone

`grep -n "amber-vivid" src/styles/work.css` returns nothing — **the criterion is a plain grep, so it
fired on the CSS header comment that explained why the token is not used**, twice. That is the
loud-and-fixable direction, so the check was left exactly as written and the prose was moved to name
the step without naming the token. Recorded because 05-10 hit the same class from the other side (a
trailing comment failing a colour check).

---

## 🔴 Design-system gaps, all measured against the installed `2.0.0-beta.1`

### 1. The `icons` subpath cannot supply a single one of the badge icons

§10.1 and this plan both ask for `badge.icon` mapped to a lucide icon from
`@akhil-saxena/design-system/icons`. MEASURED: that subpath exports **32** named wrappers —
`AlertTriangle, Bold, Check, CheckCircle2, ChevronDown/Left/Right/Up, Clock, Code, Copy, Heading2,
Heading3, Info, Italic, Link, Link2, List, ListOrdered, Minus, Moon, MoreHorizontal, Plus, Quote,
Search, Star, Strikethrough, Sun, Trash, Trash2, Underline, X, XCircle` — and **none of the four
stored icon names has one**: `arrow-up-right`, `play-store`, `github`, `chrome-store`. There is no
`ExternalLink` and no `ArrowUpRight`. The generic `Icon` component (which takes a `LucideIcon`) is
**not exported from any public subpath**. `lucide-react@1.35.0` still has `ArrowUpRight` and
`ExternalLink` but dropped brand glyphs at v1, so `Github` and `Chrome` do not exist to re-export.

Reaching around the design system into its transitive `lucide-react` was **refused** — it is not a
dependency of this repository, and the Core Value settles this trade. The badges render as text
links carrying `badge.label`, which already reads "Play Store", "GitHub", "Chrome Store".

**Filed upstream:** the curated icon set has no outbound/external-link glyph at all, which every
public site needs.

### 2. The §10.2 tone mapping does NOT produce a three-way shape split — it produces a two-way one, and today a zero-way one

`StatusPill`'s docstring, quoted at length in §10.2, promises a marker *"whose SHAPE is driven by
`data-step`, so the three-way split survives greyscale and colour blindness"*. MEASURED, in
`dist/chunk-TYSPT6SD.js`:

```js
var TONE_STEP = { muted: "1", success: "1", secondary: "2", accent: "2", primary: "3", danger: "3" };
```

So §10.2's mapping — `live → success · maintained → muted · archived → secondary` — puts **`live`
and `maintained` on the same step**: the same fill (`color-mix(in srgb, var(--ink) 7%, var(--paper))`
in dark) and the same marker shape (hollow ring). They separate only by the marker's hue
(`--green` against `--ink-5`) and by their words.

**And today it is narrower still.** MEASURED in the built page: the five pills are
`data-tone="muted" data-step="1"` ×3 and `data-tone="success" data-step="1"` ×2. **No project is
`archived`, so every pill on `/work` is step 1** — identical fill, identical shape. The non-colour
signal F-15-5 exists to provide currently distinguishes nothing on this page.

**Not worked around.** §10.2's mapping is a reviewed decision and a component consumer is not the
place to overrule it. The available fix upstream is a `TONE_STEP` that does not collide on two tones
a public status vocabulary actually uses; the available fix here would be `live → primary`
(step 3, square marker), which is a design decision for 05-15.

### 3. `Link` inline-sets `font-family` on every variant, so a serif or mono link is not expressible from CSS

MEASURED through `renderToStaticMarkup`: every variant emits
`style="font-family:var(--font);cursor:pointer"`. An inline declaration cannot be beaten by any app
stylesheet rule at any specificity without `!important`.

The component **does** merge a consumer `style` object over its own (measured: `fontFamily` replaced,
`cursor` retained) and it has a `color` prop, so both overrides on this page go through the
component's own API. This is why the card title carries `style={{ fontFamily: 'var(--font-display)' }}`
plus `color="var(--ink)"`, and why the cross-link's whole type role is an inline object rather than
a `work.css` rule that would silently lose. **Filed upstream:** the family belongs in the stylesheet
with the rest of the variant, or `Link` needs a documented typography escape hatch.

### 4. `Eyebrow` has no `as` prop, so it cannot carry heading semantics

`EyebrowProps extends HTMLAttributes<HTMLSpanElement>` with `size`, `color` and `tone` — no `as`.
§5.4 lists `Eyebrow` in `/work`'s inventory, but `PROFESSIONAL EXPERIENCE` and `PROJECTS` are the
page's two section headings and a `<span>` would remove them from the document outline. Plain `<h2>`
elements were used, exactly as 05-10 did on `/resume`.

This is the **third** member of a family: `Heading`, `Card` and `Link` have `as`; `Button` (05-10),
`Eyebrow`, `Chip` and `StatusPill` do not. **Filed upstream** as one finding rather than four.

### 5. `Card`'s hover transition is declared outside any motion query

`primitives.css:7124` — `.ds-atom-card[data-hover="elevate"] { transition: box-shadow 0.15s, border-color 0.15s }`,
with no `prefers-reduced-motion` guard. §12.2 (PUB-13) names the card hover border transition
explicitly. Declaring this page's transition inside `no-preference` therefore does **not** remove the
animation under `reduce` — the component's own would still run. `work.css` carries both blocks at
(0,4,0), and the `reduce` reset is load-bearing rather than belt-and-braces. **Filed upstream**; the
local reset is documented at the rule.

### 6. `Chip` CONCATENATES `className` — §4.6c is stale

MEASURED: `<Chip className="x">` renders `class="ds-atom-chip x"`. §4.6c records it clobbering,
CARRIED from Phase 0; that is no longer true in `2.0.0-beta.1`. This component **wraps** the chips in
`<li>` anyway and passes no `className`, so it is correct either way — but §4.6c should be corrected
before someone designs around a defect that has been fixed. `Chip` does inline-style its own
font-size, colour, background, radius and padding, which is a smaller instance of finding 3.

---

## Findings that are not the design system's

### 🔴 `getCollection` does not preserve the file's order

MEASURED, on the first build of task 2: `getCollection('projects')` returned the five records
**sorted by `id`** — cairn, design-system, hued, momentum, timeshift — where `data/projects.json`
stores them cairn, hued, momentum, timeshift, design-system. The page shipped the design-system card
**second**, which is neither §10.1's order nor an order anybody chose. Worse, it is an order that
MOVES: renaming a project's `id` silently reshuffles a reviewed grid.

`work.astro` now reads `data/projects.json` for the ORDER and the collection for the validated
RECORDS, and the suite asserts the rendered order against the file. Anyone else in Phase 5 or 6
consuming a collection whose order matters — 05-11's Home Act 2 renders the same five records — has
the same problem.

### `compressHTML` deletes whitespace between sibling elements

The cause of the `/resume` metric defect above, and a general one: a separator that exists only as a
newline in an `.astro` template does not survive the build. Declare it in CSS or emit it explicitly.

### `npm run build` takes 11 seconds, not 2–4 minutes and certainly not 10

MEASURED, timed, with `dist/` present: `wrangler types && astro check && astro build && gate:content`
completed in **11s**; a bare `npx astro build` completed in **1.4–3s**. 05-06 recorded "exceeded 10
minutes twice" and 05-10 corrected that to 2–4 minutes for a clean rebuild. No `rm -rf dist` was run
from this plan — `dist/` is shared and a concurrent wipe took three of 05-10's backups — so this
figure is for a warm tree, which is the case every verify in wave 4 actually runs in.

### `npm run build` was RED for ~25 minutes on another plan's untracked file

`test/public/photo-detail.node.test.ts:190` (05-08, untracked at the time) failed `astro check` with
`ts(2345)`, which is chained into `npm run build` before `astro build` runs. Task 2 was verified with
`npx wrangler types && npx astro build && npm run gate:content` and an `astro check` filtered to this
plan's files (0 errors), and the full `npm run build` was re-run to exit **0** once 05-08 landed
`5b0751c`. Recorded because a repo-wide typecheck in the build command makes every concurrent plan's
build hostage to every other plan's uncommitted work.

---

## Decisions this plan made, with their reasoning

### The anchor structure: a stretched title link

§10.1 asks for two things that cannot both be literal HTML — the whole card surface links to
`project.href`, and `badges[]` is a row of outbound links. An `<a>` inside an `<a>` is not merely
invalid; the parser **closes the outer anchor at the inner one**, so the badge row would fall outside
the card link and the DOM would stop matching the source.

The card rendered **as** an anchor with the badge row moved outside it was rejected: the badges are
part of the card's composition, and moving them out of the bordered box changes the reviewed design
to satisfy an implementation constraint.

**Chosen: the title is the anchor, stretched over the card with a positioned `::after`.**

- The accessible **name** of the card's destination is the project title plus the visually-hidden
  "(opens in a new tab)". A card-shaped anchor would have swallowed the title, the status, the whole
  description and every tech chip into one link name — forty words to learn where one link goes.
- Exactly **one** anchor per card for the card's own destination, so a screen reader's link list has
  one entry per project rather than one plus a duplicate.
- The badge links are **siblings** of the stretched anchor, not descendants: independently focusable,
  independently clickable, and tab order reads title → badges → next card.
- The focus ring is drawn on the anchor's own inline box (`box-shadow` paints on the element, not on
  its `::after`), so a keyboard user sees a ring around the title rather than an invisible ring
  around the whole card. `:focus-within` on the card paints the same accent border a mouse hover
  does, so the "you are on this card" affordance is not mouse-only.

**The tradeoff, stated rather than hidden:** the transparent overlay sits above the description, so
card text cannot be selected with the mouse. That is inherent to every stretched-link implementation.
Accepted because the card's text is a two-sentence summary that also exists at the destination.

**The suite guards the structure**, not just the behaviour: it asserts no card contains an anchor
inside another anchor, so a future "simplification" back to a card-shaped anchor goes red.

### The visually-hidden mechanism

**`.ds-visually-hidden`, from the design system's own `primitives.css`** — measured present, with
`clip-path: inset(50%)` on a 1px box plus a `white-space: nowrap` guard, which is the current
recommended form. **No app rule was written**, so QUAL-03's layout allowance is not spent on this at
all. All 13 outbound anchors carry it; the suite asserts the announced count equals the external
count and that neither is zero.

### The band's cap

`PAGE_MAX.band` (1080) arrives as an inline custom property, `style="--wk-band-max: 1080px"`, and
`work.css` reads `max-width: min(var(--wk-band-max), 100%)`. The number is written **once** in the
repository. Reusing the shell's `.pub-max-band` class was rejected: it also sets
`margin-inline: auto`, which would centre the band and inset its left edge 100px from the header
above it and the card grid below it. A cap that shortens the measure is the reviewed intent (J3:
*"it's fine"* — so a row reads as one row rather than a serif title and a mono metric floating
apart); a cap that moves the left margin is not.

### The specificity arithmetic, stated at each site

STATE.md records "a CSS rule losing silently to an existing rule declared lower in `primitives.css`"
as a three-for-three defect class. Both overlapping rules were **grepped for before being written**
and the arithmetic is in the stylesheet:

| This page | Beats | Why deterministic |
|---|---|---|
| `.dark .wk-grid .wk-card[data-variant='glass']` (0,4,0) | `primitives.css:1133` (0,2,0) — `border: --rule` | §4.4 rule 1 needs `--wire` on dark; wins on specificity, not source order |
| `.wk-grid .wk-card[data-hover='elevate']:hover` (0,4,0) | `primitives.css:7126` (0,3,0) | light mode |
| `.dark .wk-grid .wk-card[data-hover='elevate']:hover` (0,5,0) | `primitives.css:7130` (0,4,0) — `--ink-4` | dark mode; a (0,4,0) rule would have TIED and lost by source order |

---

## Contradictions with the plan and the UI-SPEC

| # | Where | What |
|---|---|---|
| 1 | Plan task 2 · §10.1 | `badge.icon` "mapped to a lucide icon from `@akhil-saxena/design-system/icons`" is **not implementable** — none of the four stored names exists there, and neither does a generic outbound glyph. Badges render label-only. |
| 2 | §10.2 | The `StatusPill` docstring's "three-way split survives greyscale" does **not** hold under §10.2's own tone mapping: `success` and `muted` share `data-step="1"`. With no `archived` project today, all five pills are step 1. |
| 3 | §4.6c | "`Chip` clobbers rather than concatenates `className`" is **stale** — measured concatenating in `2.0.0-beta.1`. |
| 4 | §5.4 | Lists `Eyebrow` for `/work`. It has no `as` prop and the two eyebrows are section headings; plain `<h2>` used, as `/resume` did. `Heading`, `Text` and `Divider` are also not used — the page's four type roles are three app rules and one component. |
| 5 | Plan task 2 | "Take the breakpoints from `BREAKPOINTS`, do not retype them." A CSS media query cannot read a custom property, let alone a TypeScript constant, so the two numbers ARE retyped in `work.css` — and held to the ladder by a suite control that reads the **served** stylesheet, which is how `public-shell.css` resolves the identical problem. |
| 6 | §10 item 2 | Gives the sub-paragraph a size and a 480px cap but **no copy**. The reviewed sentence was taken from `design_handoff_portfolio/Work.dc.html`, which also supplied the space between a metric's two halves. |
| 7 | §10 item 4 / OQ-1b | The plan's task 1 says "if plan 05-03's checkpoint chose `defer`, this is the point at which the build goes red". It did **not** defer: `data/resume.json` carries three resolved metric objects and `assert-no-unresolved-placeholders.mjs dist` exits **0**. There is no red build to record. |
| 8 | Plan task 1 `<done>` | The `--amber-vivid` criterion is a plain grep and fires on prose. Left as written; the comment was reworded. |
| 9 | 05-10's `/resume` | The metric's two halves render with no separator. The reviewed capture has a space. Reported, not fixed — it is 05-10's file. |
| 10 | 05-06 / 05-10 on build times | Neither 10+ minutes nor 2–4 minutes: `npm run build` measured at **11s** on a warm tree, `npx astro build` at 1.4–3s. |

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Bug] The project grid shipped in the wrong order**
- **Found during:** task 2's first artefact check, which refused with `card 1 does not carry the title of project hued — the grid order has drifted`
- **Issue:** `getCollection('projects')` returns records sorted by `id`, not in file order.
- **Fix:** the file supplies the order, the collection the records; the suite asserts the rendered order against the file.
- **Files:** `src/pages/work.astro` · **Commit:** `e545049`

**2. [Rule 1 — Bug] A build refusal's message was mangled in the surfaced error**
- **Found during:** the `spellCount(13)` build plant
- **Issue:** the em dash in the thrown message went into `x-astro-prerender-error`, drew a non-ASCII warning, and the message Astro finally printed read `spellCount(13) â the projects…`.
- **Fix:** the message is ASCII.
- **Files:** `src/pages/work.astro` · **Commit:** `e545049`

**3. [Rule 2 — Missing critical functionality] The metric's two halves would have run together**
- **Issue:** `compressHTML` removes the template whitespace between the value and label spans, which is what makes `/resume` read `+15%CONVERSION`.
- **Fix:** `.wk-metric-value { margin-right: var(--space-2) }`, declared in CSS where compression cannot reach it.
- **Files:** `src/styles/work.css` · **Commit:** `067b8f5`

**4. [Rule 2 — Missing critical functionality] PUB-13 was not met by declaring this page's transition inside `no-preference`**
- **Issue:** the design system declares `transition: box-shadow .15s, border-color .15s` on `[data-hover="elevate"]` outside any motion query, so it runs under `reduce` regardless of what this page declares.
- **Fix:** a `@media (prefers-reduced-motion: reduce)` reset at (0,4,0), scoped to `.wk-card`. Reported upstream at the rule.
- **Files:** `src/styles/work.css` · **Commit:** `e545049`

**5. [Rule 2 — Missing critical functionality] Seven defective predicates in the plan's own verify commands** were replaced with scoped, exact-equality checks carrying their own anti-vacuity refusals. Both replacements are quoted in full in the control tables above and live at
`check-task1.mjs` / `check-task2.mjs` in this run's scratch directory; the durable form of every claim they make is now in `test/public/work.node.test.ts`, which is committed.

**6. [Rule 1 — Bug, in my own comments] Two comments contradicted themselves.** `work.astro` said "there is no `three` and no `five` in this file" in a sentence containing both; `EmploymentBand.astro` said the word "three" appeared nowhere in it, in a paragraph containing it. Both reworded to the claim that is actually true and actually load-bearing: no count is *rendered* or *asserted* as a literal.

### Deliberate non-actions

- **`data/resume.json`, `data/projects.json` and `data/home_config.json` were read and never written.**
- **No file outside this plan's declared set was modified.** `/resume`'s missing metric separator, 05-08's typecheck failure and the design-system findings are all reported rather than patched.
- **No `git add -A`, no `git add` from a verify step, no `git checkout`/`stash`/`reset`/`clean`/`worktree`, and no `rm -rf dist`.** Every backup lived in the scratch directory, outside the repository.
- **`gate:sinks` untouched.** No raw-HTML sink, no allowlist entry; T-05-09-03 is mitigated by Astro's own escaping, and the built page shows `Cloudflare&#39;s` where the stored copy has an apostrophe.
- **The Footer underline defect** (§4.6b, 05-06) reaches this page through the shared shell and was **not** patched locally — same reasoning 05-10 gave.
- **`--amber-vivid` appears nowhere in `work.css`**, not even in prose.

---

## Verification

| Command | Result |
|---|---|
| `npm run build` | **exit 0** — `astro check` 0 errors, `gate:content` = schema · sinks · origin · routes · ds · ladder |
| `npm test` | **exit 0** — 39 files, **1378 passed**, 0 failed (unit, integration, workers) |
| `npx vitest run test/public/work.node.test.ts` | **15 passed** |
| `npm run check` | **exit 0** — biome 120 files, 6 pre-existing warnings, 1 info; prettier clean |
| `npm run typecheck` | **exit 0** |
| `node scripts/assert-ds-import-contract.mjs` | **exit 0** — 3/3 rules, 18 canaries, 98 files |
| `node scripts/assert-no-raw-html-sinks.mjs` | **exit 0** |
| `node scripts/assert-gutter-ladder.mjs` | **exit 0** — 4 rungs, 4 maxima |
| `node scripts/assert-no-unresolved-placeholders.mjs dist` | **exit 0** — 2/2 rules, 12 canaries, 0 tokens in `dist/` |
| `grep -n "amber-vivid" src/styles/work.css` | **no output** |
| `git add` inside a verify step | **never** |

Artefact facts, read from `dist/client/work/index.html`: 21 anchors total, **13** `target="_blank"`,
**13** `rel="noopener noreferrer"`, **13** `.ds-visually-hidden` announcements, **1** `<script>` tag,
**0** `type="module"`, **0** `astro-island`, **0** `{{` tokens.

---

## Known Stubs

None. Every element on the page is wired to `data/resume.json`, `data/projects.json` or
`data/home_config.json` (through the shell). There is no placeholder text, no empty array flowing to
a renderer and no "coming soon".

The three employment metrics ARE placeholders in the editorial sense (OQ-1b), but they are real
committed data rendered from the record — 05-03 resolved them rather than deferring, so the token
mechanism has nothing to catch here today and was proven able to catch it anyway (control D above).

The badge **icons** are absent rather than stubbed: no placeholder glyph, no empty `<span>`, no
"icon coming soon". The label carries the meaning.

## Threat Flags

None. The route introduces no network endpoint, no auth path, no file access and no schema change.

- **T-05-09-01 (reverse tabnabbing)** — mitigated as planned, and asserted **per anchor** rather than
  as a count equality: every `target="_blank"` in the grid carries `rel="noopener noreferrer"`,
  13/13, proven able to fail by controls B2 and D4.
- **T-05-09-02 (a placeholder metric published as fact)** — mitigated: the gate ran against `dist`
  inside this plan's own verify at exit 0, and was proven able to exit 1 naming both tokens with
  their file and line.
- **T-05-09-03 (project copy interpolation)** — mitigated: no `set:html` anywhere, `gate:sinks`
  re-run and unchanged, and the stored apostrophe ships as `&#39;` with no double encoding.

---

## For the plans that depend on this one

- **05-11 (Home):** the same five records render in Act 2. `getCollection` will hand them to you
  **sorted by `id`**, not in file order — see the finding above.
- **05-13 (a11y / motion):** the card hover transition needed a local `reduce` reset because the
  design system declares its own outside any motion query. Any other consumer of
  `Card hover` has the same problem.
- **05-14 (bundle / JS budget):** `/work` ships **one** `<script>` — the shell's inline theme block —
  zero `type="module"`, zero `astro-island`, zero `ld+json`. The suite asserts all four. **Not closed
  by anything today: a dynamic `import()` inside a classic script**, exactly as 05-10 recorded.
  05-06's `assert-gutter-ladder.mjs` is already wired into `gate:content` by 05-07 and passes.
- **05-15 (human review):** four things to look at. (i) The five status pills are visually a single
  step — no `archived` project exists, and `live`/`maintained` collide on `data-step`. (ii) The
  badges have no icons. (iii) `/resume`'s metric renders `+15%CONVERSION` with no space. (iv) The
  header and sub-paragraph copy are asserted nowhere; a copy edit ships silently, by design.
- **Anyone separating two inline elements in an `.astro` template:** `compressHTML` deletes the
  whitespace. Declare the gap in CSS.
- **Anyone styling a design-system `Link`:** `font-family` is an inline style on every variant. Go
  through the `style` prop, which the component merges, not through a stylesheet rule that will lose.

---

## Self-Check: PASSED

All five files this plan claims to have created exist on disk and are tracked; the built artefact is
present; all three commit hashes resolve in `git log`.

```
FOUND: src/pages/work.astro
FOUND: src/components/public/EmploymentBand.astro
FOUND: src/components/public/ProjectCard.astro
FOUND: src/styles/work.css
FOUND: test/public/work.node.test.ts
FOUND: dist/client/work/index.html
FOUND: 067b8f5  feat(05-09): /work — the header, the accent full stop and the employment band
FOUND: e545049  feat(05-09): the five project cards — StatusPill, the stretched link and a derived count
FOUND: 4a9f01a  feat(05-09): the cross-link, and the /work HTTP suite over the built artefact
```
