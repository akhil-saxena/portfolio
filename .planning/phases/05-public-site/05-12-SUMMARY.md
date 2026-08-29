---
phase: 05-public-site
plan: 12
subsystem: ui
tags: [island, lightbox, hydration, pub-14, exif, history-api, progressive-enhancement, gate]

requires:
  - phase: 05-07
    provides: the masonry, PhotoTile/PhotoGrid, the eight gallery routes and photos.css
  - phase: 05-08
    provides: the 40 prerendered detail pages every tile links to, and the exifRows contract in use
  - phase: 05-04
    provides: exifRows — the single implementation of PUB-07's omit-null rule
  - phase: 05-05
    provides: photoHref / srcsetFor
provides:
  - "src/components/public/PhotoLightbox.tsx — the one island: a delegated listener, a history entry, the design system's Lightbox"
  - "src/lib/photo-lightbox.ts — the build-time items builder, split out because it did NOT tree-shake"
  - "scripts/assert-photo-date-unrendered.mjs — §9.4's standing refusal, proven able to fail nine ways"
  - "test/public/lightbox.node.test.ts — 85 HTTP + render assertions, including a 43-document zero-island sweep"
  - "data-lb-index on every tile anchor, id=ph-grid on the masonry"
affects: [05-14, 05-15, 06-case-studies, 08-cutover]

tech-stack:
  added: []
  patterns:
    - "an island's client entry is the MODULE, not the component — a build-time helper exported beside it is NOT tree-shaken out of the browser chunk"
    - "Astro 7 emits <astro-island>, not <script type=\"module\">; every PUB-14 predicate spelled the old way is vacuous or red"
    - "a design-system component that omits an inline colour hands it to the cascade; one that inlines it can only be reached by its own `color` prop"
    - "a gate over source splits into a CODE layer that refuses and a COMMENT layer that reports"

key-files:
  created:
    - src/components/public/PhotoLightbox.tsx
    - src/lib/photo-lightbox.ts
    - scripts/assert-photo-date-unrendered.mjs
    - test/public/lightbox.node.test.ts
  modified:
    - src/pages/photos/index.astro
    - src/pages/photos/[category]/index.astro
    - src/components/public/PhotoGrid.astro
    - src/components/public/PhotoTile.astro
    - src/styles/photos.css
    - test/public/photos-routes.node.test.ts
    - .planning/phases/05-public-site/deferred-items.md

key-decisions:
  - "NO local swipe-to-dismiss. The shipped Lightbox's swipe NAVIGATES; PUB-06's literal wording is not met and it is filed upstream rather than worked around — §9.1 says G-14 is closed, and the backdrop declares touch-action: pan-y on purpose."
  - "client:idle is KEPT, and the measurement says it is a tie rather than a win. Under Lighthouse's mobile throttle idle and load are indistinguishable on all four metrics; on loopback idle moves the chunk request from ~27ms to ~93-174ms and TBT is 0 either way."
  - "sizes is omitted from every item. sizesFor answers a masonry-column question and the lightbox image is max-width: 90vw; the DS docstring says a srcset with no sizes is read as 100vw, which is already correct."
  - "the items builder lives in src/lib/photo-lightbox.ts, not beside the component — measured: exported from the island module it put srcsetFor/VARIANTS/GUTTER_RUNGS into the browser chunk."
  - "the caption is omitted when there is nothing to say (no rows AND no place), a deliberate narrowing of the plan's 'empty exifRows -> no caption'. Indistinguishable on the committed corpus; recorded."

patterns-established:
  - "Every gate and suite control runs as `node <file>`, never through `bash -c '…'`."
  - "A planter asserts its anchor occurs exactly once, re-asserts the plant at check time, and verifies the restore by sha256 against a backup outside the repository."
  - "An artefact predicate is anchored to markup: `<astro-island` and `</astro-island>`, never the bare name — the bootstrap script that DEFINES the element mentions it five more times."

requirements-completed: [PUB-07, PUB-14]
requirements-partial: [PUB-06]

duration: ~2h
completed: 2026-08-29
---

# Phase 5 Plan 12: The One Island Summary

**One route family hydrates and four still ship zero. `/photos` and the seven category routes each
carry exactly one `<astro-island>` resolving to a 17,451 B Lightbox chunk; `/`, `/work`, `/resume`
and all forty photo pages carry none — 43 documents swept, not sampled. Clicking a tile opens the
photograph at its own index without changing the URL, Escape / the backdrop / the close button / the
Back button all dismiss it, the arrow keys navigate and wrap, the `aria-live` region announces each
slide, and with JavaScript disabled the same click navigates to the prerendered detail page.**

Four things did not survive contact with a real build or a real browser, and each is measured below.
**PUB-06's "swipe dismissal" is not met and cannot be met locally** — the shipped component's swipe
navigates. **`<script type="module">` is the wrong predicate for hydration under Astro 7**, which
made two of the plan's three `<verify>` commands red or vacuous and puts a hole in §5.3. **A
build-time helper exported beside an island is not tree-shaken out of the browser chunk.** And **the
lightbox caption is invisible in light mode** unless the page tells the design system to hand over
the colour.

---

## The island, as built — and its exact shipped byte count

`src/components/public/PhotoLightbox.tsx`. It renders nothing of its own until opened: while `open`
is false the design system's `Lightbox` returns `null`, and the item array is not even *built* —
`useMemo` returns a frozen empty array.

### The bytes, measured on the shipped artefact

| Chunk | raw | gzip -9 | brotli |
|---|---:|---:|---:|
| `_astro/PhotoLightbox.jLpnyao1.js` — **the island** | **17,451 B** | 7,026 B | 6,202 B |
| `_astro/client.CHz_MA6t.js` — `@astrojs/react` + React | 180,630 B | 56,392 B | 48,938 B |
| `_astro/react-dom.CAGmFW3z.js` | 11,087 B | 3,928 B | 3,509 B |
| **chunk total** | **209,168 B** | **67,346 B** | **58,649 B** |
| inline `<script>` payload on the page (3 blocks: 1,452 + 316 + 4,380) | 6,148 B | — | — |
| **total client JavaScript a gallery route ships** | **215,316 B** | — | — |

**That is the number 05-14's ceiling measures.** Every one of the three chunks is reached from the
gallery routes and only from them: `/`, `/work`, `/resume` and every `/photos/<category>/<slug>`
reference no chunk at all and carry a single 1,452 B inline `<script>`, the shell's theme block.
`dist/client` holds **exactly three** `.js` files in total.

**Against §1.1's baseline of 9 files / 15,351 B for `components/Lightbox`:** the island chunk is
17,451 B, i.e. **+2,100 B over the design-system component's own source**, which is `Lightbox` plus
`Text`, `Eyebrow`, `IconButton`, the three lucide glyphs, `src/lib/exif-display.ts` and this file's
own ~120 lines, minified. Nothing near the barrel's 416,590 B, and the sweep confirms it: **zero**
files under `dist/client` match `prosemirror|tiptap|lowlight|highlight\.js|dnd-kit`, and **zero**
match `node:crypto|createHash` (T-05-12-04).

### 🔴 The builder was not tree-shaken, and the split is what fixed it

`lightboxRecordsFor` was written as a second export of the island's own file. Rolldown did **not**
remove it from the browser chunk:

```
exported from PhotoLightbox.tsx   19,336 B   /srcsetFor|VARIANTS|GUTTER_RUNGS|sizesFor/ -> PRESENT
moved to src/lib/photo-lightbox.ts 17,435 B   -> ABSENT          (-1,901 B)
```

An island's client entry is the **module**, not the component, so everything the module's top level
reaches is in the graph — `srcsetFor`, and through it `photo-variants.ts` and `layout-ladder.ts`.
Nothing broke; the chunk was simply bigger than its own header claimed. `exifRows`' lookup tables
**are** still in the chunk, correctly: the caption is built in React from the single implementation
of PUB-07's rule.

### The three lines the plan asks to be quoted

The modified-key guard, and the ordering that makes this a progressive enhancement:

```ts
if (mouse.defaultPrevented) return;
if (mouse.button !== 0) return;
if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey) return;
if (items.length === 0) return;
```

```ts
const raw = anchor.getAttribute(INDEX_ATTRIBUTE);
if (raw === null || !/^\d+$/.test(raw)) return;          // T-05-12-01
const parsed = Number.parseInt(raw, 10);
if (!Number.isInteger(parsed) || parsed < 0 || parsed >= items.length) return;

try {
  setIndex(parsed);
  setOpen(true);
  try { window.history.pushState({ phLightbox: true }, '', window.location.href); pushedRef.current = true; }
  catch { pushedRef.current = false; }
} catch {
  return;
}

mouse.preventDefault();                                   // LAST, and only once it has opened
```

Every bail is before `preventDefault`, so anything the listener declines falls through to the
anchor. **Measured**: a meta-click opens `/photos/architecture/hauntedmansionjpg` in a new tab, no
lightbox appears, and the gallery tab does not navigate.

`data-lb-index` is parsed with a digits-only test rather than by `Number.parseInt` alone — that
accepts `"3abc"` and `"0x2"` — and bound-checked against `items.length`, so a rewritten attribute
navigates instead of opening the wrong photograph.

---

## PUB-06 in a real browser — 31 checks, and the one that does not hold

Playwright Chromium against the built artefact over a static server on an ephemeral port (never 5173
or 6006). Desktop 1440×900 fine-pointer, touch 390×844 `hasTouch`/`isMobile` with
`matchMedia('(pointer: coarse)').matches === true` confirmed in the probe, and a third context with
`javaScriptEnabled: false`.

| # | Behaviour | Reading |
|---|---|---|
| 1 | a tile click opens at its own index | `img src = …/architecture/hauntedmansionjpg-lg.webp`, the record at `data-lb-index="3"` |
| 2 | the dialog is named by the photograph | `aria-label="Image lightbox: Phantom Manor's mansard roof, dormer windows and iron roof cresting, half screened by surrounding trees."` |
| 3 | the URL does not change | `/photos/` throughout |
| 4 | **Escape closes** | backdrops 1 → **0** |
| 5 | **a backdrop click closes** | click at (12, 12) → backdrops **0** |
| 6 | the close button closes | backdrops **0** |
| 7 | **the Back button dismisses rather than leaving the page** | `history.state = {"phLightbox":true}` → `goBack()` → backdrops **0**, url still `/photos/`, **40 tiles still there** |
| 8 | closing unwinds the entry | `history.state` → `null` |
| 9 | **ArrowRight / ArrowLeft navigate** | +1 → `officegreens-lg`, −2 → `watertexture-lg` |
| 10 | **they wrap** | at slide 0, ArrowLeft → `wildlife/gentlegiants-373ba4c9-lg` (the last); ArrowRight → back to slide 0 |
| 11 | **the `aria-live` region announces the slide** | `"Image 5 of 40. A modern building's vertical metal fins seen from below, framed by palm fronds and a red-flowering shrub."` |
| 12 | a meta-click does not open it | backdrops 0; the prerendered page opens in a new tab |
| 13 | a record with EXIF renders one row per surviving field | 1 caption block, **6** rows |
| 14 | **`product-peppers` renders NO caption at all** | `.ds-atom-lightbox-caption` count **0**, `.ph-lb-caption` count **0** |
| 15 | the caption is white in **light** mode | value `rgb(255, 255, 255)`, label `rgb(255, 255, 255)`, `html.class = (no class — light)` |
| 16 | **a leftward swipe NAVIGATES** | still open, src → `officegreens-lg` |
| 17 | a rightward swipe navigates back | src → `hauntedmansionjpg-lg` |
| 18 | 🔴 **a downward swipe does NOTHING** | still open, src unchanged |
| 19 | a backdrop **tap** closes on touch | backdrops **0** |
| 20 | **with JavaScript disabled, a tile click navigates** | url `/photos/architecture/hauntedmansionjpg`, `.pd-frame` count **1**, backdrops 0, 40 tiles rendered |

`31 passed, 0 failed`.

### 🔴 PUB-06's "swipe dismissal" is NOT met, and it is filed rather than worked around

PUB-06 reads *"a lightbox with keyboard, backdrop and swipe dismissal"*. **The shipped component's
swipe navigates.** Measured in `chunk-4I5ZCPSS.js`:

```js
var BACKDROP_TAP_SLOP_PX = 10;
var SWIPE_MIN_DISTANCE_PX = 44;
var SWIPE_HORIZONTAL_DOMINANCE = 1.5;
...
if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return;
if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_DOMINANCE) return;
if (dx < 0) goNext(); else goPrev();
```

A vertical drag hits neither branch: `dx` is small so navigation returns, and `backdropTapRef` is
false because the gesture travelled past the 10px tap slop, so backdrop-close returns too. Confirmed
in the browser (row 18).

**Nothing local was added, and that is a decision.** §9.1 states *"G-14 is closed. Do not
re-implement any part of it"*, and `.ds-atom-lightbox-backdrop` declares `touch-action: pan-y` with
a comment explaining that the vertical axis is deliberately left to the browser — so a consumer
gesture layer would be fighting a rule the design system wrote on purpose. The Core Value's
disposition for a gap the site exposes is a finding, which is how OQ-4's 40px pill and `Eyebrow`'s
inline weight already ship.

**What a touch reader has today:** a backdrop tap closes (row 19), the close button closes, the Back
button closes, and Escape closes from a keyboard. **PUB-06 is marked partial, not complete.**

> **Upstream, for `@akhil-saxena/design-system@2.0.0-beta.2` — `Lightbox` has no swipe-to-dismiss.**
>
> `onPointerUp` implements swipe-to-navigate only. On a phone the only dismissals are a ≤10px
> backdrop tap and a 32×32px close button (see below); there is no gesture for "put this away",
> which is the one gesture a full-bleed image viewer is expected to have.
>
> **The fix is one branch, not a refactor**, in the existing `onPointerUp`, before the horizontal
> test:
> ```js
> if (dy >= SWIPE_MIN_DISTANCE_PX && Math.abs(dy) > Math.abs(dx) * SWIPE_HORIZONTAL_DOMINANCE) { onClose(); return; }
> ```
> It cannot collide with navigation — the two conditions are mutually exclusive by construction.
> **It also needs `touch-action: none` (or `pan-x`) on `.ds-atom-lightbox-backdrop`**, because the
> current `pan-y` hands the vertical axis to the browser; that is why a consumer cannot add this,
> and why it belongs upstream.

### 🔴 The lightbox's controls are 32×32px, and the component's own rule says 40px

**MEASURED** in Chromium at 390×844 with a coarse pointer, `getComputedStyle`:

```
close  32px x 32px   (rect 32x32)
next   32px x 32px   (rect 32x32)          §2.3's floor: 44px
```

The cause is inside the design system, between two of its own rules:

- `.ds-atom-lightbox-close` / `-prev` / `-next` declare `width: 40px; height: 40px` — specificity **(0,1,0)**
- `.ds-atom-iconbtn[data-size="md"]` declares `width: 32px; height: 32px` — specificity **(0,2,0)**

`Lightbox` renders its three controls as `<IconButton>` at the default `size="md"`, so **the
Lightbox's own 40px rule never applies** — the author's intent is 40px and the shipped control is
32px. Both are under the 44px floor. `primitives.css` carries two `@media (pointer: coarse)` blocks
and **neither mentions `iconbtn` or `lightbox`** (read from the parsed blocks, not grepped), while
`.ds-atom-appbar a` and `.ds-atom-footer-link` each get `min-height: 44px`.

This matters more than OQ-4's four pixels: on touch these are the *only* affordances for closing and
navigating, and they are 12px short. Same disposition — it ships, no local override.

---

## `client:idle` vs `client:load` — measured, and the answer is "no difference"

**Lighthouse itself was not run, and the substitution is recorded rather than glossed.** `lighthouse`
is not a dependency of this repository; installing it means a `package-lock.json` edit in a wave
another plan is committing into, which is the collision 02-05 refused and 04-06 / 05-07 paid for. So
the four metrics a Lighthouse Performance score is built from were measured directly in Chromium
(`PerformanceObserver` for `paint`, `largest-contentful-paint`, `layout-shift` and `longtask`), with
the same 4× CPU throttle Lighthouse applies, and the two builds were produced from the same source
with only the directive changed.

**Under Lighthouse's mobile throttle** (1.6 Mbps down, 750 Kbps up, 150 ms RTT, 4× CPU):

| build | run | FCP | LCP | CLS | TBT | island chunk requested |
|---|---:|---:|---:|---:|---:|---:|
| `client:idle` | 1 | 2128 ms | 6252 ms | 0.0002 | **0 ms** | 2134 ms |
| `client:idle` | 2 | 2144 ms | 6264 ms | 0.0002 | **0 ms** | 2152 ms |
| `client:load` | 1 | 2120 ms | 6252 ms | 0.0002 | **0 ms** | 2121 ms |
| `client:load` | 2 | 2128 ms | 6260 ms | 0.0002 | **0 ms** | 2128 ms |

**Unthrottled network, 4× CPU** (the only condition where the directive is visible at all):

| build | run | FCP | LCP | TBT | island chunk requested |
|---|---:|---:|---:|---:|---:|
| `client:idle` | 1 | 152 ms | 1372 ms | 0 ms | **174 ms** (after FCP) |
| `client:idle` | 2 | 84 ms | 364 ms | 0 ms | **93 ms** (after FCP) |
| `client:load` | 1 | 80 ms | 524 ms | 0 ms | **25 ms** (before FCP) |
| `client:load` | 2 | 92 ms | 684 ms | 0 ms | **29 ms** (before FCP) |

**§9.2 recorded this as UNVERIFIED. It is now measured, and the honest answer is that it is a tie.**
`client:idle` does not measurably improve the page: on a throttled link the browser's idle callback
fires as soon as the document is parsed anyway, and **TBT is 0 ms in all eight runs** — 209 KB of
React at 4× CPU throttle produces no long task, because hydrating a component that returns `null`
is nothing. The only reproducible difference is *when* the chunk is requested, and only on a fast
link.

**`client:idle` is kept.** Not because it won, but because it is the strictly weaker claim on the
main thread — it cannot be worse — and because §9.2 specifies it. The choice is now recorded as a
measurement rather than as reasoning, which is what §9.2 asked for. `test/public/lightbox.node.test.ts`
asserts `client="idle"` on all eight routes so a silent change to `load` is visible.

**Both builds emitted byte-identical chunks** (`209,168 B`, same three files); only the 186 bytes of
directive bootstrap in the document differ.

---

## The page-weight cost of the island's props — and why it is nearly free

An island's props are serialised into the document, and this one carries 40 records:

| | raw | gzip -9 | brotli |
|---|---:|---:|---:|
| `/photos` as shipped | **107,983 B** | 31,220 B | **24,853 B** |
| the same document with the `props` attribute removed | 71,965 B | 26,413 B | 23,360 B |
| **the island props cost** | **+36,018 B** | +4,807 B | **+1,493 B** |

36 KB uncompressed, **1.5 KB brotli** — because `alt` and `srcSet` already appear in the tiles and a
compressor collapses the duplication. Against §7.3's ~120 KB re-check threshold the document is at
105.5 KB raw and 24.3 KB brotli. Recorded for QUAL-01; no action taken.

---

## PUB-07 in the lightbox — the same rule, from the same module

The caption is built in React from `exifRows(item.exif)`, which is 05-04's single implementation.
No field is read and no value is formatted in the island.

```
captions: 39 blocks, 220 rows, 0 em dashes / Unknown / N/A
no caption: product-peppers — exifRows 0, no place
place: present on 17 of 40 items, matching the manifest
```

**220 rows across 39 blocks** is the same total 05-08 measured on the detail pages, from the same
function — the two renderers agree because there is one rule, not because they were compared.

**`product-peppers` gets `undefined`, not an empty node.** `Lightbox` renders
`current.caption ? <div className="ds-atom-lightbox-caption"> : null`, so an empty node would still
paint the caption box under the image — the placeholder PUB-07 forbids, wearing a different hat.
Verified in the browser (row 14) and in the suite.

**The em dash matcher is U+2014 only.** `LENS_DISPLAY_NAMES` renders **en** dashes on purpose
(`18–55mm f/3.5–5.6` is a range) and 05-08 measured them on 26 of 40 pages; conflating the two would
red two thirds of the corpus against correct code.

### 🔴 The caption is invisible in light mode unless the page hands the colour over

`Lightbox` is always dark in both themes — §9.1's invariant, and correct. `.ds-atom-lightbox-caption`
sets `color: #ffffff` on the container. But a `Text` inside it renders
`<span class="ds-atom-text" data-variant="body">`, whose default colour is `var(--ink-2)`.

**Measured in the browser, light mode:** `--ink-2` → `rgb(66, 66, 72)`, `--ink-3` → `rgb(82, 82, 88)`.
Against the composited backdrop (`rgba(0,0,0,.92)` over `--cream: #fcfcfc` → `rgb(20, 20, 20)`):

| | contrast |
|---|---:|
| `--ink-2` (what `Text` defaults to) | **1.85 : 1** |
| `--ink-3` (what `Eyebrow` inlines) | **2.37 : 1** |
| `#ffffff` (what ships) | **18.42 : 1** |

**Negative control, in a copy of the built artefact held outside the repository:**

```
CORRECT CODE          value=rgb(255, 255, 255)  label=rgb(255, 255, 255)  html=(light)
PLANTED (rule gone)   value=rgb(66, 66, 72)     label=rgb(255, 255, 255)  html=(light)
RESTORED              value=rgb(255, 255, 255)  label=rgb(255, 255, 255)  html=(light)
VERDICT: `.ph-lb-caption .ds-atom-text { color: inherit }` is LOAD-BEARING.
```

**The two components need opposite treatments, and neither is a reach past the component:**

- **`Text`** omits any inline colour when `tone` is absent. `primitives.css` puts the variant default
  inside `:where(…)` at specificity (0,0,0) and says why, verbatim: *"passing `tone` means the
  component owns the colour; omitting it hands the colour to the cascade."* So the island passes no
  `tone` and `photos.css` carries **one** declaration, `.ph-lb-caption .ds-atom-text { color: inherit }`
  at (0,2,0). `inherit` states no palette value, so it cannot drift from the theme.
- **`Eyebrow`** INLINES `color: var(--ink-3)` whenever neither `color` nor `tone` is given. An inline
  style cannot be reached by a consumer stylesheet without `!important`, so the component's own
  documented `color` prop is the only path it offers: `color="inherit"`.

**A first version of this control could not have failed the way it claimed.** It ran with
`colorScheme: 'light'` and reported `html class = dark` while passing — the shell's theme block does
not read `prefers-color-scheme` at all, it defaults to `.dark` and only `localStorage.theme ===
'light'` removes the class. Fixed with an init script; every reading above is from a genuinely light
page.

**And the planter's first version looked in the wrong file.** `.ph-lb-caption` is **not** in any
`.css` file under `dist/client` — `photos.css` is inlined into each gallery document's own `<style>`
and only `public-shell.css` is emitted as a linked sheet. The control refused rather than passing on
nothing. That is 05-07's and 05-08's inlined-stylesheet finding in a third place: **any artefact gate
that reads only `dist/client/**/*.css` is blind to every declaration in `photos.css`.**

---

## 🔴 `<script type="module">` is the wrong predicate, and it broke two of the plan's three verifies

**MEASURED** on a correct build: a hydrated `/photos` document carries **zero** `<script type="module">`.

```
photos/index.html                  module=0  astro-island=1  <script>=3  107,983 B
photos/architecture/index.html     module=0  astro-island=1  <script>=3   49,452 B
… all eight gallery routes identical in shape …

EVERY OTHER ROUTE (44 documents): module scripts != 0 or astro-island != 0 : 0
                                   distinct <script> counts across them   : 1
```

Astro 7 emits
`<astro-island component-url="/_astro/PhotoLightbox.<hash>.js" component-export="PhotoLightbox"
renderer-url="/_astro/client.<hash>.js" client="idle" props="…">` plus three classic `<script>`
blocks, the third of which reaches the chunk through a dynamic `import()`. This is exactly the hole
05-08 flagged: *"Not closed by anything today: a dynamic `import()` inside a classic script."*

**Consequences, all recorded in `deferred-items.md` for 05-14:**

1. **§5.3's assertion 1** ("zero `<script type="module" src=`" on a static route) is **vacuously
   true everywhere** — it would pass on a page that hydrates.
2. **§5.3's assertion 3** ("exactly one island entry", same spelling) is **red against a correct
   build**.
3. **§5.2's rule** — "a public route may carry at most one `<script is:inline>` … and it is the theme
   script" — needs to distinguish authored inline scripts from Astro's bootstrap. Measured bytes:
   theme block **1,452 B**, bootstrap blocks **316 B** and **4,380 B**.
4. **05-07's own assertion was about to become the worst kind of green.** `'%s ships no framework
   JavaScript yet — the island arrives in 05-12'` asserted `<script type="module"> === 0` and would
   have stayed green on a page shipping 209 KB of React. Rewritten in this plan to assert one
   `<astro-island>` whose `component-export` is `PhotoLightbox` and whose `component-url` matches
   `/^\/_astro\/PhotoLightbox\.[^/]*\.js$/`, with the module count still reported.

---

## Every gate proven able to fail

The interactive shell is **zsh 5.9**. **Every control was written to a file and run as `node <file>`
or `bash <file>`**, never as `bash -c '…'` with an embedded quoted token — 05-05 took two false
PASSes from exactly that, and 05-10 took three from zsh's builtin `echo`. Every planter asserts its
anchor occurs **exactly once** before writing, re-asserts the plant **at check time**, and verifies
the restore by **sha256 against a backup outside the repository**.

### A. `scripts/assert-photo-date-unrendered.mjs` — 11 controls, all behaved

| # | Control | Exit | Diagnostic |
|---|---|---:|---|
| 1 | **PLANTED** — a file under the scan root containing `photo.date` | **1** | `x …/probe.astro:1: [DATE-DOT] ".date" — a \`.date\` property access` |
| 2 | **PLANTED** — `const { date } = photo` | **1** | `[DATE-BINDING] "{ date }"` |
| 2b | **PLANTED** — `photo["date"]`, `photo['date']`, `` photo[`date`] `` | **1** | three `[DATE-COMPUTED]` findings, lines 1, 2 and 3 |
| 3 | **NOTHING TO CHECK** — a non-existent scan root | **1** | `scan root "…/no-such-directory" does not exist. A PASS here would be a statement about an empty set` |
| 3b | **NOTHING TO CHECK** — a root holding no scannable file | **1** | `matched ZERO files (.astro .ts .tsx .js .jsx .mjs .cjs)` |
| 3c | **NOTHING TO CHECK** — every file in scope is empty | **1** | `1 file(s) scanned, 0 bytes read — every file in scope was empty` |
| 4 | **CORRECT CODE** — the real `src/` | **0** | `scanned 9 file(s), 85,941 bytes` — and it names all nine |
| 5 | **ANTI-CANARY** — `updatedAt`, `dateFormatter`, `{ dateFormatter }`, `dateModified`, `dates` | **0** | PASS — the rule is not a substring match on "date" |
| 6 | **WALK-THROUGH** — see below | **0** | two residuals printed by name |
| 7 | **REFUSAL** — a C0 control character (U+0007) in a scanned file | **1** | `contains the C0 control character U+0007 at offset 13 … refused rather than skipped` |
| 8 | **REFUSAL** — a scan root argument present but empty | **1** | `path.resolve(cwd, '') is cwd, so this would have scanned the entire repository` |
| 9 | **CORRECT CODE**, re-run after every plant | **0** | PASS, 9 files, identical byte count |

**Control 6 — the walk-through, recorded as residuals rather than as completeness:**

```
comment-layer residuals (REPORTED, not refused): 2
  ~ probe.astro:4  [DATE-DOT] // this comment names photo.date on purpose
  ~ probe.astro:5  [DATE-DOT] /* and so does this block: photo.date */
known blind spots: a split key `photo["da" + "te"]` and a computed key `photo[k]`
                   are both invisible to a textual rule (W1, W2).
```

- `photo["da" + "te"]` — **gets through. OPEN.** No literal `date` exists to match; closing it needs
  an AST pass with constant folding. Same residual `assert-ds-import-contract.mjs` records for a
  split package specifier.
- `photo[k]` where `k` is computed — **gets through. OPEN**, same reason.
- **A comment naming the field gets through BY DESIGN**, and it is printed by name on every run. This
  is deliberate: every route the gate scans carries a comment saying the field is not rendered, and
  05-06, 05-07 and 05-08 each lost time to a matcher reading its own explanation as the violation. A
  gate that reddened those comments would be disabled the first day it ran. The gate refuses on a
  **code** layer and reports on a **comment** layer; both are canaried.

**The self-test runs on every invocation:** 12 canaries must fire on the code layer (plain access,
nested access, three quote styles of a computed key, three destructure shapes, an object literal, a
sort comparator, an `.astro` template expression, a code line with a trailing comment), 10
anti-canaries must stay silent, and the comment layer must still *see* a commented mention —
otherwise the residual report itself would be vacuous.

**A repair found by running the controls, not by reading the code:** the first revision printed
*"a photo route references `photo.date`"* over **every** refusal, so control 3c — an empty scan set —
was announced as a rendered date. Correct diagnostic underneath, false headline on top. There are now
two banners.

**A second repair, on the gate's own source.** The control-character rule was first written as a
regex character class. Biome's `lint/suspicious/noControlCharactersInRegex` refuses it — correctly —
and it fires on ` ` escapes as readily as on literals. Suppressing that rule *in the one gate
whose job is to find control characters* would mean carrying a standing exemption for the hazard, so
it is a codepoint scan instead, which needs no exemption and can report the code and the offset.

### B. `test/public/lightbox.node.test.ts` — 6 controls, all behaved

| # | Control | Result |
|---|---|---|
| C1 | **PLANTED** — `lightboxIndex={index + 1}`, so `data-lb-index` starts at 1 | **RED**, 8 failed / 77 passed — `× /photos: every tile carries a real href and a dense data-lb-index` on all eight routes |
| C2 | **PLANTED** — `date: photo.date` added to the island's props | **RED**, 1 failed — `× 🔴 no item carries \`date\`` · `expected [ Array(5) ] to not include 'date'` |
| C3 | **PLANTED** — `client:load` instead of `client:idle` on `/photos` | **RED**, 1 failed — `AssertionError: expected 'load' to be 'idle'` |
| C4 | **PLANTED** — the masonry loses `id="ph-grid"` | **RED**, 8 failed — `× … has exactly one #ph-grid` on all eight routes |
| C5 | **NOTHING TO CHECK** — the manifest emptied before the module guard | **RED**, `Tests no tests` with the FILE failed — `Error: lightbox: data/portfolio_images.json holds no records; nothing to check.` |
| C6 | **CORRECT CODE**, after every plant | **GREEN**, 85/85 |

Every restore was **byte-identical by sha256**; backups lived in a `mkdtemp` directory outside the
repository, because 05-10 lost three to a concurrent `rm -rf dist`.

**C5's shape is the one that matters:** `Tests no tests` with the *file* failed. A suite that derived
zero routes and then passed zero comparisons would have reported green.

**🔴 One assertion of mine had this project's signature defect, and the control found it.** The first
version counted the bare string `astro-island` and expected 2 (open and close tag). It measured
**seven** — Astro's bootstrap block contains `customElements.define('astro-island', …)` and several
other mentions, so a substring count reads the runtime that *defines* the element as further
instances of it. This is 05-08's `grep -c 'pd-exif'` returning 5 on a page that renders none, in a new
place. Anchored to `<astro-island` and `</astro-island>` instead.

### C. The 43-document zero-island sweep

```
zero-island sweep: 43 documents (/, /work, /resume and all 40 photo pages)
                   — 0 astro-island, 0 module scripts
```

Derived from the manifest with `photoHref`, not sampled: PUB-14's claim is about *all* of the photo
pages, and one spot check would pass on a build that hydrated the other thirty-nine. The count is
asserted as `manifest.length + 3`, so a 41st photograph strengthens it.

---

## 🔴 Defective verify commands in the plan

**Two of the three are red against correct code.** Both were run verbatim, from a file, to record the
exact output.

### 1. Task 1's `photo-pipeline` grep — exit **1** on a correct island

```
if grep -n "photo-pipeline" src/components/public/PhotoLightbox.tsx; then echo "FAIL: …"; exit 1; fi
```
```
66: * This file must never import `src/lib/photo-pipeline.ts`, directly or transitively: it reaches
FAIL: island imports photo-pipeline
EXIT=1
```

The island's header **explains** that it must never import that module, and a substring grep reads the
explanation as the violation. This project's recurring class, for the fourth time.

**Replaced with a specifier-position check — and my first replacement had the same defect.** Reusing
`assert-ds-import-contract.mjs`'s patterns unchanged, it exited 1 at line 61: those patterns allow
400 characters between `import` and `from`, so a JSDoc sentence containing the word "import" and,
four lines later, ``from `srcsetFor` `` matches as a specifier. **Specifier position is not by itself
immune to prose** — the DS gate escapes this only because it excludes `scripts/` from its default
scan, and its own docstring says so. The working form splits the file into a code layer and a comment
layer, fails on the first and reports the second, and carries six canaries (4 must fire, 2 must not).

```
OK: src/components/public/PhotoLightbox.tsx — 7 import specifier(s) on code lines, none naming "photo-pipeline".
    self-test: 6/6 canaries behaved (4 must fire, 2 must not).
    comment layer: 0 import-shaped mention(s) — reported, not failed.
```

Proven able to fail: a planted real import in a copy → exit 1 naming the line; a missing file → exit
1; an empty file → exit 1.

### 2. Task 2's module-script count — exit **1** on a correct build

```
dist/client/photos/index.html: module scripts 0
FAIL: expected exactly one island entry
EXIT=1
```

See the section above. Replaced with an `<astro-island>` predicate that also names the chunk. The
rest of that command — the `test -d dist/client` guard and the forbidden-family sweep — is sound and
was kept; the sweep is now over **every** `.js` under `dist/client` with an explicit refusal when it
reads zero files.

### 3. Task 3's verify — **sound, and it passes as written**

```
OK: caught
OK: refused a missing root
Test Files  1 passed (1)
Tests  85 passed (85)
EXIT=0
```

Recorded because two of three being defective makes the third worth confirming rather than assuming.

---

## Contradictions with the plan and the UI-SPEC

| # | Where | What |
|---|---|---|
| 1 | Plan `must_haves` + Task 2 `<done>`; PUB-06 | *"a swipe closes"*. **False against the shipped component** — the swipe navigates. §9.1's own measurement says the same thing and calls G-14 closed, so the plan's wording and the spec's evidence disagree with each other. Filed upstream; PUB-06 marked partial. |
| 2 | Plan Task 2 `<action>` | *"`items` is built … with `srcsetFor` / `sizesFor`"*. **`sizesFor` is not used, deliberately.** It answers a masonry-column question; the lightbox image is `max-width: 90vw`, and `LightboxItem.sizes`' docstring says a `srcset` with no `sizes` is read as 100vw, *"which is already correct for a full-bleed lightbox"*. Passing the column string would fetch a column-width file for a full-screen display — no error, just a blurrier photograph. Same judgement 05-08 made for the detail page. |
| 3 | Plan Task 1 `<action>` | *"an item whose `exifRows` is empty gets no caption at all"*. **Narrowed:** the caption is omitted when there is nothing to say — no rows **and** no `place`. Dropping a reviewed `place` because a camera wrote no aperture is not what PUB-07 asks for. MEASURED: exactly one record yields zero rows (`product-peppers`) and it has no `place`, so the two readings are indistinguishable on the committed corpus. A constructed place-only record covers the branch in the suite; `data/` was never written. |
| 4 | Plan Task 2 / §5.3 / §5.2 | The `<script type="module">` predicate. See above; three separate spec assertions inherit it. |
| 5 | §9.4 | *"the 39 records carry exactly two distinct dates"*. **Re-measured: 40 records, THREE distinct dates** — `2026-01-24`, `2026-03-28`, `2026-04-07`. The plan's `<action>` says three and is right. Nothing renders or reads the field, so the discrepancy is inert; the gate's message states the measured number. |
| 6 | §9.1 / plan `<interfaces>` | *"`components/Lightbox` traces to 9 files / 15,351 B"* — **confirmed independently**, and the same method reports `hooks` at 11 files / 19,372 B (a barrel, which is why `assert-ds-import-contract.mjs` excludes it), `components/RichText` at 14 files with 6 × `@tiptap`, and the barrel at 101 files / 416,590 B. |
| 7 | §13.2 | Gives **no copy for the lightbox caption**. Nothing was invented: the caption carries only data-derived strings — `place`, and the `exifRows` label/value pairs the detail page already uses. Flagged for 05-15. |
| 8 | Plan `files_modified` | Lists six files. **Four more were required** and each is justified below. |

---

## Deviations from Plan

### Deliberate additions to the plan's file list

**1. `src/components/public/PhotoGrid.astro` and `src/components/public/PhotoTile.astro`**
Task 2 requires `data-lb-index` on each tile anchor and `id="ph-grid"` on the masonry container.
Neither element exists in a file the plan lists — the anchor is rendered by `PhotoTile` and the
container by `PhotoGrid`, both 05-07's. §9.2 spells the attribute on the anchor itself, and that is
where it went: the island's listener does `target.closest('a[data-lb-index]')`, so the element it
finds is the same element whose `href` it declines to prevent. A wrapper `<div>` would have let those
two drift apart. `PhotoTile` refuses a non-integer or negative index by name.

**2. `src/lib/photo-lightbox.ts`** — created because of a measurement, not a preference. See the
tree-shaking finding above.

**3. `test/public/photos-routes.node.test.ts`** — Task 2 falsified an assertion in it. Leaving a test
named *"ships no framework JavaScript"* green on a hydrating page is worse than not having it.

**4. `.planning/phases/05-public-site/deferred-items.md`** — two findings for 05-14.

### Auto-fixed

**1. [Rule 1 — Bug] The plan's Task 1 verify is red against correct code**
- **Found during:** Task 1. **Fix:** a code-layer/comment-layer specifier check with six canaries.
  My first replacement had the same defect and is recorded above. **Commit:** `a44c48e` (the island;
  the check itself lives in the session scratchpad, not the repository).

**2. [Rule 1 — Bug] The island chunk carried `srcsetFor`, `VARIANTS`, `GUTTER_RUNGS` and `sizesFor`**
- **Found during:** Task 2's chunk measurement. **Fix:** the builder moved to
  `src/lib/photo-lightbox.ts`; −1,901 B and the four symbols are gone from the chunk.
  **Commit:** `1d1ae84`

**3. [Rule 2 — Missing critical functionality] The caption was a theme ink on an always-dark surface**
- **Found during:** Task 2's browser probe. **Fix:** `color: inherit` handed to `Text` through the
  cascade path `primitives.css` documents, and `color="inherit"` passed to `Eyebrow`, which offers no
  other path. Proven load-bearing by a negative control against a copy of the built artefact.
  **Commit:** `1d1ae84`

**4. [Rule 1 — Bug] `photos-routes.node.test.ts` was about to pass on a hydrating page**
- **Fix:** rewritten to assert one `<astro-island>` naming the Lightbox chunk. **Commit:** `1d1ae84`

**5. [Rule 1 — Bug, in my own assertion] A bare `astro-island` substring count measured 7, not 2**
- **Found during:** Task 3's first suite run. **Fix:** anchored to `<astro-island` and
  `</astro-island>`. **Commit:** `bed7ce5`

**6. [Rule 1 — Bug, in my own gate] One refusal banner made a false claim**
- **Found during:** Task 3's control 3c. **Fix:** two banners. **Commit:** `bed7ce5`

**7. [Rule 3 — Blocking] Biome refuses a control-character class in a regex**
- **Fix:** a codepoint scan rather than a lint suppression, in the one gate whose job is to find
  control characters. **Commit:** `bed7ce5`

### Investigated and left alone

- **`astro check` warns `ts(6196): 'Props' is declared but never used` on `PhotoGrid.astro:57`.**
  Verified **pre-existing**: the file was restored from `HEAD` into the working tree, `astro check`
  re-run — the warning is present on 05-07's committed version too — and the file restored
  byte-identically (`shasum -c` OK). Out of scope; logged in `deferred-items.md` with the second
  finding, that `astro check`'s Result line reports "0 warnings" while printing six.
- **`test/content/build-fails-loudly.node.test.ts` was red for two cases mid-plan.** Cause:
  05-13's commit `e271d9b` added `sitemap(…)` to `astro.config.mjs`'s integrations array, so that
  suite's exact-string anchor `'integrations: [react(), contentGate],'` no longer matched and its own
  guard — *"If the string ever changes, this control would silently test the wired config instead"* —
  refused rather than passing vacuously. **Not mine, not fixed by me**; 05-13 repaired it and the
  final run is 1487/1487.

### Deliberate non-actions

- **`data/portfolio_images.json` and `data/site_config.json` were read and never written.**
  `git status data/` is empty. The place-only caption branch is covered by a **constructed** record
  in the suite rather than by editing reviewed content.
- **No local swipe-to-dismiss, no local 44px override, no `!important`.** Three measured
  design-system shortfalls ship, each with its upstream patch written out.
- **No `git add -A`, no `git add` from a verify step, no `git checkout`/`stash`/`reset`/`clean`/
  `worktree`.** Every commit used `git add <paths> && git commit … -- <the same paths>`, and each was
  checked with `git diff --diff-filter=D --name-only HEAD~1 HEAD` — all four came back empty.
  05-13's files (`astro.config.mjs`, `test/public/seo.node.test.ts`) were modified in the shared tree
  throughout and never staged.
- **No scratch file in the repository.** Every control, planter, probe and backup lives in the session
  scratchpad. The browser probes served a copy of `dist/client` from an OS-assigned ephemeral port;
  ports 6006 and 5173 were not touched.

---

## Threat model — dispositions as implemented

| Threat | Disposition | Where |
|---|---|---|
| T-05-12-01 — `data-lb-index` read from the DOM | **mitigated** | digits-only parse + bound check against `items.length`; on any failure `preventDefault` is never reached, so the anchor navigates |
| T-05-12-02 — island props serialised into the page | **accepted** | only public manifest fields; `date` excluded and gated. The suite asserts no item carries a `date` key **and** that no item's serialised JSON matches `\d{4}-\d{2}-\d{2}` — 80 items across 8 routes |
| T-05-12-03 — a barrel import pulling 400 KB into a public chunk | **mitigated** | `assert-ds-import-contract.mjs` exit 0; **0** files under `dist/client` match the forbidden families, over an explicit non-empty file list |
| T-05-12-04 — `node:crypto` reaching a client chunk | **mitigated** | the island never imports `photo-pipeline`; **0** of the three client chunks match `node:crypto\|createHash` |

## Threat Flags

None. The island introduces no network endpoint, no auth path, no file access and no schema change.
Its only input is a DOM click, and its only output is component state and a same-URL history entry.

## Known Stubs

None. Every item the island receives is wired to `data/portfolio_images.json`; the one thing that
*looks* like an omission — no caption on `product-peppers` — is PUB-07's requirement, asserted by
name in the suite and verified in the browser.

---

## Verification

| Command | Result |
|---|---|
| `npm run build` | **exit 0** |
| `npm test` | **exit 0** — 41 files, **1487 passed**, 0 failed |
| `npx vitest run test/public/lightbox.node.test.ts` | **85 passed** |
| `npx vitest run test/public/photos-routes.node.test.ts` | **67 passed** |
| `npm run check` (biome + prettier) | **exit 0** — 6 pre-existing warnings, none in this plan's files |
| `npm run typecheck` (`astro check`) | **exit 0** — 132 files, 0 errors, 7 hints |
| `node scripts/assert-photo-date-unrendered.mjs` | **exit 0** — 9 files, 85,941 bytes, 22 canaries |
| `node scripts/assert-ds-import-contract.mjs` | **exit 0** |
| `node scripts/assert-no-raw-html-sinks.mjs` | **exit 0** |
| `node scripts/assert-gutter-ladder.mjs` | **exit 0** |
| `node scripts/assert-single-schema-source.mjs` | **exit 0** |
| `node scripts/assert-exif-display-coverage.mjs` | **exit 0** |
| `node scripts/assert-no-unresolved-placeholders.mjs dist` | **exit 0** |
| forbidden families under `dist/client` | **0 hits** over 3 `.js` files (an explicit non-empty list) |
| `<astro-island>` on `/`, `/work`, `/resume` and all 40 photo pages | **0**, on all 43 |
| browser behaviour probe | **31 passed, 0 failed** |
| date-gate controls | **11/11 behaved** |
| suite controls | **6/6 behaved**, every restore byte-identical |
| `git add` inside a verify step | **never** |
| `data/` written | **never** |

## Self-Check: PASSED

```
FOUND: src/components/public/PhotoLightbox.tsx
FOUND: src/lib/photo-lightbox.ts
FOUND: scripts/assert-photo-date-unrendered.mjs
FOUND: test/public/lightbox.node.test.ts
FOUND: a44c48e  feat(05-12): the one island — a delegated listener, a history entry and the design system's Lightbox
FOUND: 1d1ae84  feat(05-12): wire the island into the two gallery routes — one hydrates, four still ship zero
FOUND: bed7ce5  test(05-12): the photo-date gate, proven able to fail nine ways, and the island's HTTP suite
FOUND: 631d50b  docs(05-12): two findings for 05-14 — the module-script predicate, and astro check's warning count
git ls-files --error-unmatch <all four created files>  -> all four tracked
```

No AI attribution appears in any commit message, author or committer field; every commit is
`Akhil Saxena <saxena.akhil42@gmail.com>`.

---

## For the plans that depend on this one

- **05-14 (the JS budget gate).** The number to gate is **215,316 B raw** of client JavaScript on a
  gallery route — 209,168 B across three chunks (`67,346 B` gzip, `58,649 B` brotli) plus 6,148 B of
  inline `<script>`. The other four route families ship **0 chunks** and one 1,452 B inline block.
  **Do not spell the predicate `<script type="module">`** — see `deferred-items.md` items 6 and 7.
  `scripts/assert-photo-date-unrendered.mjs` is **not** wired into `package.json`; chaining it into
  `gate:content` is yours. The `THUMB_URI` guard is still duplicated in `PhotoTile.astro` and
  `[slug].astro`, as 05-08 recorded.
- **05-15 (human review).** Three things. (i) **PUB-06 is partial** — the swipe navigates, it does not
  dismiss, and the upstream patch is written out above. (ii) The lightbox's close and prev/next
  controls render **32×32px** against a 44px coarse floor, and the `Lightbox`'s own stylesheet asks
  for 40px and loses to `IconButton`. (iii) §13.2 gives no copy for the caption; it carries `place`
  and the EXIF label/value pairs and nothing invented.
- **Anyone writing an artefact gate on a class name in `photos.css`:** it is **inlined into the page's
  own `<style>`**, not emitted as a `.css` file. A gate reading `dist/client/**/*.css` sees
  `public-shell.css` and nothing else.
- **Anyone counting an element by name:** `astro-island` appears **7** times on a page with one
  island, because the bootstrap script defines the custom element. Anchor to `<tag` and `</tag>`.
- **Upstream, for `2.0.0-beta.2`,** three findings this plan measured, on top of the ones 05-07…05-11
  already filed:
  1. **`Lightbox` has no swipe-to-dismiss**, and `touch-action: pan-y` is why a consumer cannot add
     one. One branch in `onPointerUp` plus a `touch-action` change.
  2. **`Lightbox`'s controls render at `IconButton`'s 32px, not its own 40px, and neither meets 44px.**
     `.ds-atom-iconbtn[data-size="md"]` (0,2,0) beats `.ds-atom-lightbox-close` (0,1,0). Give the
     lightbox controls `size="lg"`, or add them to a `@media (pointer: coarse)` block as `AppBar` and
     `Footer` already have.
  3. **`Eyebrow` inlines its colour and `Text`'s `mono` prop is inert.** `Eyebrow` needs the
     `:where()` treatment `Text` got in finding E5, so a consumer class can win. And `Text`'s
     `baseStyle` inlines `fontFamily: "var(--font)"`, which beats
     `.ds-atom-text[data-mono="true"] { font-family: var(--mono) }` — **measured in the browser**:
     with the inline style the computed family is `"DM Sans Variable", …`; without it,
     `"IBM Plex Mono", …`. The prop cannot take effect as shipped.
