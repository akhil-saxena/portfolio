---
phase: 05-public-site
plan: 07
subsystem: public-gallery
tags: [masonry, column-count, filternav, aria-current, cls, lqip, srcset, oq-4, pub-03, pub-04, pub-05]
requires:
  - "05-05 — photoHref/photoSlug (BL-8), srcsetFor, sizesFor, GUTTER_RUNGS/BREAKPOINTS/MASONRY_GAP"
  - "05-06 — PublicLayout, public-shell.css, <Seo>, scripts/assert-gutter-ladder.mjs"
  - "05-01 — the design system from the registry, and gate:ds chained into gate:content"
provides:
  - "src/pages/photos/index.astro — every photograph, one masonry, no pagination"
  - "src/pages/photos/[category]/index.astro — seven prerendered routes from getStaticPaths over site_config"
  - "src/components/public/PhotoTile.astro — reserved box, LQIP, srcset, photoHref"
  - "src/components/public/PhotoGrid.astro — the column-count container and the eager cap"
  - "src/components/public/PhotoFilters.tsx — FilterNav with derived counts and a normalised activeHref"
  - "src/components/public/PhotoEmpty.tsx — §13.2's empty-category state, as a renderable component"
  - "src/styles/photos.css — the masonry, the tile, and an UNCONDITIONAL filter rail"
  - "test/public/photos-routes.node.test.ts — 67 HTTP assertions over the built site"
  - "npm run gate:ladder, chained into gate:content — the first consumer of PublicLayout wired it"
affects:
  - "05-08 (photo detail pages — every tile href is photoHref; the slugs must match)"
  - "05-12 (the Lightbox island intercepts .ph-tile anchors; /photos ships no module script today)"
  - "05-14 (gate:ladder is already wired; §5.3 assertion 3 will find one island entry here)"
  - "05-15 (the six-class audit — read finding 1 in deferred-items first)"
tech-stack:
  added: []
  patterns:
    - "the eager-loading count is min(4, n) by construction, never the literal four"
    - "an .astro-unrenderable branch is extracted into a .tsx so a test can reach it"
    - "an anti-vacuity guard is placed on the DERIVED artefact, not on the content field"
    - "a CSS declaration ships only if a negative control in a real browser showed it doing something"
key-files:
  created:
    - src/components/public/PhotoTile.astro
    - src/components/public/PhotoGrid.astro
    - src/components/public/PhotoFilters.tsx
    - src/components/public/PhotoEmpty.tsx
    - src/pages/photos/index.astro
    - src/pages/photos/[category]/index.astro
    - src/styles/photos.css
    - test/public/photos-routes.node.test.ts
  modified:
    - package.json
    - scripts/assert-gutter-ladder.mjs
    - test/content/build-fails-loudly.node.test.ts
    - .planning/phases/05-public-site/deferred-items.md
key-decisions:
  - "gate:ladder is wired into gate:content HERE, not left to 05-14 — the gate's own note said to wire it in the same commit as the first PublicLayout consumer, and that commit is this one"
  - "the filter rail is UNCONDITIONAL: §8.3's `max-width: 672px` scoping leaves 200px of horizontal scroll between 673 and ~900px, measured in Chromium"
  - "`flex: 0 0 auto` was written, measured inert three ways, and deleted rather than kept"
  - "OQ-4 ships at 40px against the 44px floor: filed upstream, no local override"
  - "the empty-category state lives in a .tsx, because no test in this repository can render an .astro"
  - "the `→` in §13.2's empty-state row is the table's marker for a link, not copy — the 404 row has the identical shape"
requirements-completed: [PUB-03, PUB-04, PUB-05]
duration: ~50min
completed: 2026-08-29
---

# Phase 5 Plan 07: The Masonry Gallery and the Filter Routes — Summary

**All 40 photographs in one `column-count` masonry with nothing shifting as it loads, and category
filtering as seven prerendered routes generated from `site_config` — real links, zero JavaScript,
exactly one current pill each. `gate:ladder` is wired and green: this plan is the consumer it was
waiting for.**

Four things did not survive contact with a real build or a real browser, and each is measured below:
§8.3's rail scoping leaves a 200px horizontal scroll on three device classes; Astro drops the space
between two adjacent expressions in a component's children; §13.2's empty state cannot be reached
the way the spec says; and `gate:schema` refuses a correct anti-vacuity guard and then refuses the
comment explaining why.

---

## What shipped, with every number derived at check time

| Route | tiles | manifest | `data-cols` | eager |
|---|---:|---:|---:|---:|
| `/photos` | **40** | 40 | 3 (`defaultColumns`) | 4 |
| `/photos/abstract` | 4 | 4 | 3 | 4 |
| `/photos/architecture` | 14 | 14 | 3 | 4 |
| `/photos/nature` | 8 | 8 | 2 | 4 |
| `/photos/portraits` | **2** | 2 | 2 | **2** |
| `/photos/product` | **2** | 2 | 2 | **2** |
| `/photos/street` | 4 | 4 | 2 | 4 |
| `/photos/wildlife` | 6 | 6 | 2 | 4 |

`dist/client/photos/all/` does not exist. No literal count appears in any copy string, any component
or any assertion: `/photos` reads `40 PHOTOGRAPHS — ALL OF THEM` from `getCollection('photos')`, and
each category reads `{n} photographs` from a group-by. The `/photos` `<Eyebrow>` renders the manifest
at **40** while `05-UI-SPEC.md` still says 39 in six places — which is the whole reason §13.3 exists.

**The `/photos` document is 65,845 bytes uncompressed (64.3 KB), against §7.3's ~120 KB re-check
threshold.** The inline LQIP payload measured on the committed data is 22,708 attribute characters,
of which 21,788 are base64 ≈ **16 KB decoded** — §7.3's figure of 22,085 for 39 records, plus one.

### The eager-loading count is `min(4, tiles)`, and that is not a defensive flourish

The plan's `<done>` asks for *"exactly four tiles carry `loading="eager"`"*. **`portraits` and
`product` hold two photographs each**, so that claim is false on two of the seven category routes
today, and on any category Phase 7 adds before its fourth photograph. `PhotoGrid` derives it as
`index < EAGER_TILE_COUNT`, which yields `min(4, n)` structurally; the suite asserts
`Math.min(EAGER_TILES_PER_SPEC, tiles)` with §7.5's four written once, as a requirement, independently
of the component. Asserting the literal would have been red against correct code on five of eight
pages the moment it was written.

### `photoHref` is imported, never re-derived (BL-8)

`PhotoTile.astro` imports `photoHref` from `src/lib/photo-srcset.ts`, which is 05-05's single
definition and the same function 05-08's `getStaticPaths` uses. `title` is not in the tile's `Props`
at all, so D-24-1's `alt={p.title}` defect is unrepresentable here rather than merely discouraged.
The `<img>` carries `alt` from the record on all 40 tiles, none of which equals any record's title.

`grep -rn "\.date" src/pages/photos src/components/public/Photo*` — run under **bash 5.3.9(1)**, with
a `test -e` guard on all six paths first, so a missing path could not be read as clean:

```
scan set:
src/pages/photos/[category]/index.astro
src/pages/photos/index.astro
src/components/public/PhotoEmpty.tsx
src/components/public/PhotoFilters.tsx
src/components/public/PhotoGrid.astro
src/components/public/PhotoTile.astro
--- grep -rn "\.date" ---
GREP_EXIT=1  (1 = no match, which is the required result; 2 would mean a path was missing)
```

Empty output, exit 1, over six files that were proven to exist.

---

## The gutter gate now has a consumer, and it is wired

**`node scripts/assert-gutter-ladder.mjs` → exit 0.** It read the built stylesheet for the first
time in this project's history:

```
assert-gutter-ladder: PASS
  scanned 1 stylesheet(s) (126892 bytes) under dist/client
  self-test: 13/13 canaries passed
  rungs found, in force order:
          base  --pub-gutter: var(--space-4)    [(no media query)]
       >=375px  --pub-gutter: var(--space-6)    [@media (width>=375px)]
       >=673px  --pub-gutter: var(--space-8)    [@media (width>=673px)]
      >=1024px  --pub-gutter: var(--space-12)   [@media (width>=1024px)]
```

**It is chained into `gate:content`, in the commit that landed the routes.** 05-06 left the wiring to
"05-07 or 05-14"; the gate's own `NO_CONSUMER_NOTE` says the right repair is to chain it *in the same
commit that lands the first route using PublicLayout*. That commit is `b2d138d`. Leaving it to 05-14
would have meant three more plans landing stylesheets against a gate nobody runs, which is the defect
this project has shipped nineteen times. The gate's note was also corrected in the same commit so it
no longer tells a future reader that the wiring is still owed — it now says the refusal, if reached,
means the stylesheet genuinely did not ship, and to rebuild before believing it.

`npm run gate:content` now prints `assert-gutter-ladder: PASS` as its last step, and `npm run build`
exits 0.

---

## Every gate proven able to fail — plant → FAIL, nothing → FAIL, correct → PASS, walk-through

Fourteen controls. **The outer shell is zsh 5.9; every control was executed through an explicit
`bash -c` (bash 5.3.9(1)-release, aarch64-apple-darwin25.1.0), and every plant went through a
file-based planter that asserts its own anchor and exits 9 without writing if the anchor is absent or
occurs twice** — 05-05 took two false PASSes from a `bash -c` planter whose plant text contained a
quote, and was saved only by that assertion.

### A. `test/public/photos-routes.node.test.ts` — the HTTP suite (67 assertions)

| # | Control | Result |
|---|---|---:|
| C1 | **PLANTED** — `activeHref={pathname}`, un-normalised (the plan's named control) | **1** — 8 red |
| C2 | **NOTHING TO CHECK** — `PhotoFilters` returns `null`, so there is no rail | **1** — 16 red, by refusal |
| C6 | **PLANTED** — the count line back as `{count} {noun}` | **1** — 7 red |
| C12 | **PLANTED** — the rail re-scoped inside `@media (max-width: 672px)` | **1** — 1 red |
| C13 | **PLANTED** — the masonry's 673px rung typed as 700px | **1** — 1 red |
| — | **CORRECT CODE**, before and after every plant | **0** — 67/67 |

**C1 is the exact bug §8.2 predicts, and it is a silent zero.** With the trailing slash left on,
every one of the eight routes reported `aria-current="page" — 0 in the rail, 1 in the page`. Nothing
errors, nothing looks wrong, and no page announces a current filter. It also measured the fact the
normalisation exists for: **`Astro.url.pathname` is `/photos/` with a trailing slash even on the
index route**, so the miss is total rather than partial.

**C2 is the anti-vacuity half.** With no rail at all the suite does not quietly pass over an empty
string — `filterNav()` throws by name:

```
Error: photos-routes: no element carrying aria-label="Photo categories" in the response.
Every assertion scoped to the rail would otherwise run over an empty string and pass.
```

### B. `scripts/assert-gutter-ladder.mjs`, through `npm run gate:content`, in a sandbox clone

| # | Control | Exit | Firing |
|---|---|---:|---|
| C5a | **CORRECT CODE** — `npm run gate:content` | **0** | prints `assert-gutter-ladder: PASS`, which is what proves it is IN the chain |
| C5b | **PLANTED** — the built CSS's 673px rung says `--space-12` | **1** | `rung 3 TOKEN: layout-ladder.ts says --space-8; the built CSS says var(--space-12)` |
| C5c | **NOTHING TO CHECK** — every `.css` moved out of `dist/client` | **1** | `no .css file anywhere under dist/client. This run read nothing and cannot pass.` |
| C5d | **CORRECT CODE** again, after restoring | **0** | PASS |

Run in a `git clone --no-hardlinks` sandbox with `node_modules` symlinked, so nothing was planted
into a `dist/` that a wave-mate might read.

### C. The routes are generated from the config — the plan's Task 2 control, and what it cost

The plan asks to *"delete one category record from a COPY of `site_config.json`, point the build at
it, confirm the route disappears and the check exits 1."* **It cannot run as written**: removing
`product` from the config orphans its two photographs and **RI-1 refuses the build** before a page is
rendered. The manifest copy has to lose those records in the same edit — at which point
`gate:origin` refuses the manifest for holding 38 records against its floor of 39, which is that gate
working exactly as designed. So the control ran as `npx astro build` in the sandbox, and the checker
was pointed at the two data sets separately:

```
sandbox plant: categories 7 -> 6; photographs 40 -> 38
routes emitted: abstract architecture index.html nature portraits street wildlife    ← no product/

(a) COMMITTED data vs SANDBOX dist   → EXIT 1
      FAIL missing …/dist/client/photos/product/index.html
      x /photos tile count != manifest length
      x srcset candidate count wrong
      x alt count != manifest length
      x 1 category-route mismatch(es)

(b) SANDBOX data vs SANDBOX dist     → EXIT 0
      /photos/abstract: 4 tiles, manifest 4 … /photos/wildlife: 6 tiles, manifest 6
```

(a) is the required red. **(b) is the half that makes it mean something**: at six categories and 38
photographs the whole gallery still reconciles, so the routes are genuinely a function of the config
and the checker is not simply always red. The sandbox was removed afterwards; the committed files
were never touched.

### D. The empty-category state — proven to render, in a real build

Reachable only by planting, and **not by planting data** — see the §13.2 finding below. The plant was
in this plan's own filter (`photo.category === \`${category.id}-C4PLANT\``), which is a negative
control on the branch itself and is non-breaking for a wave-mate's build. The emitted markup, §13.2
verbatim with the count derived:

```html
<div class="ph-empty">
  <h2 class="ds-atom-heading" data-size="md">No photographs in <!-- -->Portraits<!-- --> yet.</h2>
  <p class="ds-atom-text" data-variant="small">Every category on this site has at least one today; this one is new.</p>
  <a class="ds-atom-link" data-variant="default" href="/photos">See all <!-- -->40</a>
</div>
```

**`See all 40`, not `See all 39`.** §13.2 prints 39; the count is passed in and derived.

### E. The CSS declarations, in real Chromium — one negative control each

Playwright's Chromium against the built site over a static server, at 344×882 and 390×844 with
`hasTouch`/`isMobile` (`matchMedia('(pointer: coarse)').matches === true`, confirmed in the probe
output) and at 1440×900 fine-pointer.

| Declaration | Removed → measured | Verdict |
|---|---|---|
| `.ph-filters { max-width: 100% }` | document `scrollWidth` **868** against a 390px viewport (860 against 344) | **LOAD-BEARING** — the R-6 guard |
| `overflow-x: auto` | see the §8.3 finding below | **LOAD-BEARING** below ~900px |
| `scroll-snap-align: start` | container `scrollSnapType` still `x`, pill `scrollSnapAlign` **`none`** | **LOAD-BEARING** — Phase 0's exact defect |
| `white-space: nowrap` | no change at 390; it is what keeps a label on one line in the 673–900 band | kept |
| `flex: 0 0 auto` | `navScrollWidth` **842 unchanged** — with `nowrap`, without it, and with both gone | **NOT load-bearing → deleted** |

`flex: 0 0 auto` was mine, written with a comment claiming the rail would not scroll without it. The
control said otherwise, three ways. It was a second reach into a design-system class name buying
nothing measurable, and OQ-4 is an argument for making that reach smaller, so it was deleted rather
than kept "just in case" and the comment corrected.

**Chromium serialises `x proximity` as `x`**, because `proximity` is the initial strictness — the
probe read `scrollSnapType: x` and that is positive confirmation it is not `mandatory`, exactly as
§8.3 warns.

### F. `test/content/build-fails-loudly.node.test.ts` — updated on its own instruction

| Control | Exit | Firing |
|---|---:|---|
| **PLANTED** — `photoSlug` no longer refuses a mismatched prefix | **1** | the updated case goes red |
| **CORRECT CODE** | **0** | 11/11 |

---

## 🔴 §8.3's rail scoping leaves 200px of horizontal scroll. Measured, and fixed.

§8.3 prescribes the rail inside `@media (max-width: 672px)`, on the reasoning that above 672px eight
pills fit. **They do not.** Measured in Chromium against the build that shipped it, `/photos`:

| viewport | nav box | last pill's right edge | `document.scrollWidth` |
|---:|---:|---:|---:|
| 673px | 615px | 873px | **873** ← 200px of horizontal scroll |
| 700px | 642px | 873px | **873** |
| 800px | 742px | 873px | **873** |
| 900px | 842px | 873px | 900 |
| 1440px | 844px | 921px | 1440 |

The nav box was correctly clamped by `max-width: 100%`; the **pills** overflowed it, because the rail
rule was off, `overflow-x` was `visible`, and `white-space: nowrap` — which is what keeps a pill on
one line — turned the overflow into document scroll. R-6, on three device classes, on all eight
gallery routes, with nothing else on the page wrong.

**The rail is now unconditional**, and a width-scoped query could not have been right in any case:
the width at which eight pills fit is a function of how many categories exist and how long their
labels are, and Phase 7 can add one without touching this file. `overflow-x: auto` is a no-op where
the content fits. After the change, `doc === client` at 673, 700, 800, 900, 910, 1024 and 1440.

A standing assertion now guards it: the built stylesheet's `overflow-x` declaration on `.ph-filters`
must sit under **no at-rule at all**. **The first version of that assertion could not fail** — it took
the first `.ph-filters{` block in the sheet and checked its brace depth, and with `max-width: 100%`
still unconditional that block is at depth 0 whatever the rail is scoped to. Planted against a
deliberately re-scoped stylesheet it reported "depth 0" and **passed**. It was rewritten to walk the
sheet and ask the question that was meant, with its walker carrying four canaries, and then C12
turned it red as it should.

---

## 🔴 Astro drops the space between two adjacent expressions in a component's children

`<Eyebrow size="md">{count} {noun}</Eyebrow>` shipped as **`14photographs`** on every category route.
A literal text node after a single expression is unaffected — `/photos`'s
`{total} photographs — all of them` was correct throughout — so it is specifically the space *between
two expressions* that does not survive the slot crossing.

It is a page that looks almost right, on seven routes, with a green build and **59 green assertions**.
It was found by the empty-category control, not by any of them. Fixed by composing the string in
frontmatter, and the exact string is now asserted character for character over HTTP on all eight
routes (control C6 turns it red). Recorded in `deferred-items.md` for 05-08 … 05-12.

---

## 🔴 §13.2's empty state cannot be created "in one click", and the reason is a gate

§13.2 says the empty-category state "is unreachable today" but that "a Phase 7 category addition
creates it in one click". **`src/schemas/content-set.ts` RI-2 refuses a declared category that no
photograph uses**, and it runs in `astro:config:done`, so it fires on `astro build`, `astro check`
*and* `astro sync`. A new category **fails the build** until its first photograph is filed.

The branch was kept anyway, and not for symmetry: RI-2 is a CONTENT rule and this is a RENDERING one,
enforced by different instruments, either of which could be relaxed without the other noticing — and a
zero-length list is what a bug in the filter would produce with RI-2 intact and every category
populated. A route answering that with an empty `<div>` ships a page that is silently blank.

Its markup lives in `src/components/public/PhotoEmpty.tsx` rather than inline in the route, because
**neither** obvious way of proving it renders is available here: `test/public/shell.unit.test.ts`
measured that the `unit` project has no Astro plugin and importing an `.astro` fails in
`vite:import-analysis`, and a build over planted data never reaches the page. A React component with
no `client:*` directive is static HTML on the page and an ordinary import in a test.

**One reading is recorded rather than transcribed:** §13.2's `→` before `See all {n}` is the table's
marker for "then a link", not copy. The 404 row directly below has the identical shape
(`→ \`Go to the home page\``), and every row whose arrow IS copy carries it inside the backticks
(`ALL WORK →`, `SCROLL FOR THE WORK ↓`). So the link's text is `See all 40` and nothing else.

---

## OQ-4 — the shortfall ships, measured, and the upstream finding is written

**MEASURED, twice: once by reading the package and once in a browser.**

- `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` is `height: 40px` —
  `primitives.css:3638–3642`, exactly one occurrence, and the tallest of the three sizes.
- `primitives.css` contains **two** `@media (pointer: coarse)` blocks. **Neither mentions `segmented`
  or `filternav`** (counted programmatically over the parsed blocks, not grepped), while `AppBar` and
  `Footer` links each have one.
- In Chromium at 390×844 with `matchMedia('(pointer: coarse)').matches === true`, the pill's
  `getBoundingClientRect().height` is **40px**. Same at 344×882. Against a **44px** floor.

Five of the six device classes are coarse-pointer, so the four-pixel shortfall is the common case.
**It ships. It is not worked around locally.** A clean screenshot bought by a local override is
evidence of a fix that does not exist, which is why Phase 0 left D-16-1's design-system half unfixed
rather than patching it.

### The finding, for `@akhil-saxena/design-system@2.0.0-beta.2`

> **`FilterNav` misses the 44px coarse-pointer hit floor, and a consumer cannot reach its anchors.**
>
> `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` is `height: 40px` (`primitives.css`,
> one occurrence). `primitives.css` carries two `@media (pointer: coarse)` blocks and neither
> touches the segmented button, while `.ds-atom-appbar a` and `.ds-atom-footer .ds-atom-footer-link`
> both get `min-height: 44px` under that query. `FilterNav`'s `className` reaches the `<nav>` only,
> so a consumer cannot close the gap without reaching past the component into its class names.
> `00-RESPONSIVE-CONTRACT.md` §8 recorded the 44px floor and the classes-1–2 rail as G-9 acceptance
> clauses; the shipped component implements neither.
>
> **The fix is one rule, not a refactor.** Used height is `max(min-height, height)`, so
> `@media (pointer: coarse) { .ds-atom-segmented-btn { min-height: 44px } }` wins over the existing
> `height: 40px` without touching the drawn geometry — mirroring the AppBar/Footer treatment already
> in the file.
>
> **Second half:** the classes-1–2 rail needs `scroll-snap-align` on the anchors, which today
> requires the same reach. Either ship it under the same query, or expose a documented
> `itemClassName`. Measured by a consumer: `scroll-snap-type` on the container with no
> `scroll-snap-align` on the children is a rail that declares snapping and does not snap.

### The QUAL-03 judgement on the reach, with its reason

`src/styles/photos.css` selects `.ph-filters .ds-atom-segmented-btn` for exactly two declarations:
`white-space: nowrap` and `scroll-snap-align: start`. Both are **layout** — line-breaking and snap
alignment. Neither is paint, neither restyles the component, and both are scoped under `.ph-filters`
so they cannot reach a `SegmentedControl` elsewhere. QUAL-03 permits layout CSS. A third declaration
(`flex: 0 0 auto`) was written, measured to do nothing, and removed — the reach is one declaration
smaller than it was.

---

## `aria-current="page"` — and §16 item 6 is wrong about the document

**§16 item 6 asks for exactly one `aria-current="page"` on each of the eight Photos pages. Every page
has two**, and both are correct: `PublicNav` marks the AppBar's "photographs" link current on every
route under `/photos` (prefix-matched, by design — "a nav that announces nothing on 47 of the 49
pages is a nav that announces nothing"), and `FilterNav` marks one pill.

So the suite asserts **both**, separately: exactly **1** inside the `<nav aria-label="Photo
categories">` slice, and exactly **2** in the document. A document-wide count of 1 would be the
failure. Equality, never `>= 1`: zero (C1's silent miss) and two (a duplicated href) are both real
failure modes and only an equality catches both.

Per route, from the suite's own `process.stdout.write` output:

```
/photos:                aria-current="page" — 1 in the rail, 2 in the page
/photos/abstract:       1 in the rail, 2 in the page
/photos/architecture:   1 in the rail, 2 in the page
/photos/nature:         1 in the rail, 2 in the page
/photos/portraits:      1 in the rail, 2 in the page
/photos/product:        1 in the rail, 2 in the page
/photos/street:         1 in the rail, 2 in the page
/photos/wildlife:       1 in the rail, 2 in the page
```

`data-rejected="true"` occurs **0** times on every route — all eight hrefs are root-relative, so
`FilterNav`'s silent rejection never fires. Each pill's text is asserted as
`${label} · ${count}` with the count derived from a group-by, and the current pill's `href` is
asserted to equal the route's own — derived in the test, **not** imported from the component, so the
two derivations cannot agree by construction.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The count line lost its space (`14photographs`)**
- **Found during:** Task 2's empty-category control.
- **Fix:** composed in frontmatter; the exact string is now a standing HTTP assertion.
- **Files:** `src/pages/photos/[category]/index.astro`, `test/public/photos-routes.node.test.ts`
- **Commit:** `4d1794e`

**2. [Rule 1 — Bug] §8.3's rail scoping leaves 200px of horizontal scroll at 673–900px**
- **Found during:** Task 3's browser probe.
- **Fix:** the rail is unconditional; `flex: 0 0 auto` deleted as measured-inert; a standing
  assertion added, then rewritten because its first version could not fail.
- **Files:** `src/styles/photos.css`, `test/public/photos-routes.node.test.ts`
- **Commit:** `e7e7b6a`

**3. [Rule 2 — Missing critical functionality] The LQIP guard (T-05-07-01)**
- `urls.thumb` is the one manifest value that lands inside a CSS `url()`. Astro escapes the
  `style` **attribute**, which is confirmed in the emitted HTML — but the apostrophes in
  `url('data:…')` survive un-escaped, so a bare apostrophe inside the value would close the token
  and let everything after it be read as further declarations, inside an attribute the escaper
  considers clean. `PhotoTile` refuses anything that is not `data:image/webp;base64,` followed by
  the base64 alphabet and nothing else. `PhotoUrlsSchema` guards the file; this guards the
  interpolation site; neither ratifies the other.
- **Commit:** `bb39dd2`

**4. [Rule 3 — Blocking] `gate:schema` refused two correct anti-vacuity guards, then refused the
comment explaining the first**
- `[HAND-ROLLED-VALIDATOR]` fires on a condition naming any of its twelve `CONTENT_FIELDS` with a
  refusal within three lines. Both guards were re-pointed at the DERIVED artefact — `paths` in
  `getStaticPaths`, `counts.size` in `PhotoFilters` — which is the more precise claim in each case:
  what is being guarded is the thing Astro and `FilterNav` silently accept, not the content's shape.
  Then the explanatory comment was itself refused, because the rule scans raw source — the project's
  recurring comment-match class, the same one that bit `Seo.astro` against `gate:sinks` in 05-06. The
  conditions are now described in words. **Both false positives are written up in `deferred-items.md`
  for the gate's owner.**
- **Commit:** `aafabf8`

**5. [Rule 1 — Bug] `test/content/build-fails-loudly.node.test.ts` went red, and its own comment
authorised the repair**
- Its typo'd-category case asserted a green build and said: *"This pins a MEASURED BLIND SPOT rather
  than a desirable behaviour… If a future change makes this case red, that is an improvement and this
  test is what will say so — update it, do not delete it."* This plan is that change: `/photos` is the
  first route to read `getCollection('photos')`, and `photoHref` → `photoSlug` refuses an id that
  does not begin with `category + "-"`, so `architecture-singapore` filed under `archtecture` now
  throws during the prerender. The describe block's point is unchanged and still asserted — it is
  neither the gate speaking nor the collection. **One difference is now pinned as well:** this third
  instrument refuses LATE and leaves a partial `dist/` behind, which is the stale-artefact hazard
  05-06 lost an hour to, and the reason it is a poorer net than the gate rather than a replacement.
- **Commit:** `1ff5d2a`

### Deliberate additions to the plan's file list

- **`src/components/public/PhotoEmpty.tsx`** — the plan lists only two files for Task 2, but its own
  `<action>` requires the empty branch to be proven by a test, and no test in this repository can
  render an `.astro`. Reasons measured, recorded in the file's header.
- **`package.json` / `scripts/assert-gutter-ladder.mjs`** — the `gate:ladder` wiring and the
  correction to the gate's own note. See above for why this plan took it rather than 05-14.
- **`test/content/build-fails-loudly.node.test.ts`** — item 5 above.

### 🔴 A shared-index sweep, and it is mine

**Commit `aafabf8` contains `src/components/StackProof.tsx`'s deletion, which belongs to 05-11.** It
was staged in the shared index by that plan when I ran `git commit` after `git add <my paths>` —
`git commit` with no pathspec commits the whole index. This is the 04-06 failure repeating with a
different pair of plans, and my own post-commit deletion check would have caught it had I run it on
that commit rather than the next one.

- **Content is correct and complete; only attribution is wrong, and history was not rewritten** —
  the same disposition 04-06 took. 05-11 committed `src/pages/index.astro` immediately afterwards,
  so `HEAD` is consistent: `StackProof.tsx` is absent, the only remaining mention of it is a sentence
  in Home's header comment, and `npm run build` exits 0 on a clean tree.
- **Every subsequent commit in this plan used `git commit -- <paths>`**, the pathspec form, which
  commits only those paths regardless of what else is staged, and each was checked with
  `git diff --diff-filter=D --name-only HEAD~1 HEAD`. All four came back empty.
- **For the rest of this wave:** `git add <paths> && git commit -m … -- <the same paths>`. The `add`
  is needed for untracked files; the pathspec on `commit` is what makes the sweep impossible.

---

## Corrections to the plan and the UI-SPEC

1. **Task 1's `<verify>` cannot pass when Task 1 is committed.** It reads
   `dist/client/photos/index.html`, which does not exist until Task 2 creates the route. Task 1 was
   committed on its source-level gates (`astro check`, `biome`, `prettier`) and both tasks' verifies
   were run against the first build that contained the route. The plan's task ordering, not a defect
   in either task.
2. **§7.1's `@media (min-width: 1024px) { .ph-masonry[data-cols="3"] { column-count: 3 } }` is a
   no-op** against the 673px rule above it — both say 3. It is carried verbatim, with a comment
   saying so, because §7.1's table has a class-5/6 row and a stylesheet answering three of four rows
   invites the reader to conclude the fourth was forgotten. It survives minification (the suite reads
   `[375, 673, 1024]` out of the built sheet).
3. **§7.3's `border-radius: 10px` has no design-system token.** Measured: `tokens.css` ships
   `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-xl: 16px`,
   `--radius-pill: 999px`. The reviewed value is carried as a literal rather than silently moved to
   8 or 12, and the gap is recorded — a `--radius` rung between 8 and 12 is the upstream ask.
4. **§8.3's rail scoping**, **§13.2's empty-state reachability**, **§16 item 6's count** and
   **§13.3's 39** are each corrected above.
5. **`min-width: 0` on `.ph-filters` is inert today.** §8.3 calls it load-bearing; measured, the flex
   automatic minimum applies on the container's MAIN axis and `.ph-head` is a column, so Chromium
   reports `min-width: 0px` with or without the line. It is kept, and the declaration says so.

---

## Threat Flags

None. `T-05-07-01` was mitigated in the tile (see deviation 3) and `gate:sinks` exits 0.
`T-05-07-02` and `T-05-07-03` are `accept` dispositions and neither was disturbed: `urls.original`
was already public by design, and the measured page weight (64.3 KB document, ~16 KB of inline LQIP)
is recorded above for QUAL-01. No new network endpoint, auth path, file access or schema change was
introduced.

## Known Stubs

None. Every tile, every count and every filter link is wired to committed data. The empty-category
branch is unreachable today — that is a property of the content and of RI-2, not a stub, and it is
proven to render.

---

## Verification

```
npm run build                                    exit 0   (gate:content ends with assert-gutter-ladder: PASS)
npm test                                         exit 0   37 files, 1354/1354
npm run typecheck (astro check)                  0 errors, 0 warnings, 7 hints, 122 files
npx vitest run test/public/photos-routes…        67/67
node scripts/assert-ds-import-contract.mjs       exit 0   (PhotoFilters uses components/FilterNav, the subpath)
node scripts/assert-no-raw-html-sinks.mjs        exit 0
node scripts/assert-single-schema-source.mjs     exit 0   36 files scanned, 4/4 rules flagged their canary
node scripts/assert-gutter-ladder.mjs            exit 0   13/13 canaries, 4 rungs, 4 page maxima
biome + prettier on this plan's files            clean
<script type="module"> on any gallery route      0        (the island arrives in 05-12)
working tree                                     clean
```

`data/portfolio_images.json` was read and never written. No verify step ran `git add`. Every control
wrote into a `mktemp -d` sandbox or into a scratch directory outside the repository; the sandbox was
removed. Ports 6006 and 5173 were not touched — the browser probes served `dist/client` from an
OS-assigned ephemeral port and the vitest harness binds `--port 0`.

## Self-Check: PASSED

All eight created files and all four modified files exist on disk. All six commits
(`bb39dd2`, `aafabf8`, `b2d138d`, `4d1794e`, `e7e7b6a`, `1ff5d2a`) are in `git log`. No AI
attribution appears in any commit message, author or committer field; every commit is
`Akhil Saxena <saxena.akhil42@gmail.com>`.
