---
phase: 05-public-site
plan: 11
subsystem: public-home
tags: [pub-01, pub-13, seo-01, two-act-home, marker-migration, snap, peek-grid, b3]
requires:
  - "05-02 (Project.oneLiner, Project.status)"
  - "05-05 (GUTTER_RUNGS, BREAKPOINTS, MASONRY_GAP, PAGE_MAX, srcsetFor)"
  - "05-06 (PublicLayout, public-shell.css, <Seo>)"
provides:
  - "src/pages/index.astro — the two-act Home, zero framework JavaScript"
  - "src/components/public/PeekGrid.astro — six photographs, reflowed not truncated"
  - "src/components/public/HomeActTwo.astro — the work band and the résumé band"
  - "src/styles/home.css — the state-A budget, the peek ladder, the Act-2 grid, the snap rules"
  - "test/public/home.node.test.ts — 22 HTTP/source assertions over real workerd"
  - "the marker `home-render-ok`, replacing `stack-proof-ok` in all three sites"
affects:
  - "05-15 (owes the six-class departure audit; both mutation controls are RUN and recorded below)"
  - "05-14 (the public-route JS budget gate — Home is route 1, zero framework JS)"
  - "any plan that reads GET / and expects a marker: it is `home-render-ok`, not `stack-proof-ok`"
tech-stack:
  added: []
  patterns:
    - "an over-estimated ALLOWANCE beats a local copy of a design-system number: the two errors are not symmetric"
    - "a mutation control is only a control once its predicate is two-sided"
    - "derivation is a SOURCE property; an artefact can show the value and never how it was obtained"
key-files:
  created:
    - src/components/public/PeekGrid.astro
    - src/components/public/HomeActTwo.astro
    - src/styles/home.css
    - test/public/home.node.test.ts
  modified:
    - src/pages/index.astro
    - src/middleware.ts
    - test/harness/preview-reachable.node.test.ts
    - test/auth/deny-unauthenticated.node.test.ts
  deleted:
    - src/components/StackProof.tsx
decisions:
  - "The marker is `home-render-ok` on `data-home-marker` on the <h1>, which is a design-system `Heading` — a React component with no client directive, so the assertion still proves what it proved"
  - "The flex-fill mechanism 05-06 prescribes CANNOT size state A on a two-act page; the budget is an explicit min-height and `flex: 1 0 auto` is kept for its shrink half only"
  - "--hm-above is an over-estimated allowance (116px), never a local re-declaration of --ds-appbar-h"
  - "The peek photographs are NOT links, so state A keeps its measured one-Tab-one-Enter property"
  - "sizesFor is deliberately not called for the peek grid: it is built for the masonry's ladder and PAGE_MAX.photos"
metrics:
  duration: "~3h"
  tasks: 3
  commits: 3
  completed: 2026-08-29
---

# Phase 5 Plan 11: The Two-Act Home — Summary

The Home page is the two acts as specified, at all six responsive classes plus the 841 × 768
binding case, with zero framework JavaScript. **The `stack-proof-ok` contract was migrated, not
removed, and both suites were made to fail in both of their directions to prove it is still
load-bearing.**

**Five things in the plan or the UI-SPEC did not survive contact, and three of them are in the
plan's own verification scaffolding.** The mechanism `<interfaces>` prescribes for the height
budget cannot size state A on this page at all; the `scroll-margin-top` fallback it offers ships
the exact defect §6.5 warns about; and three of its predicates could not have passed on correct
code. Each is measured below.

| commit | what |
|---|---|
| `d442d83` | state A, and the marker migrated in the same commit as the deletion |
| `c639852` | state B — the work band, the résumé band, and the two dead gaps |
| `c24784a` | snap inside the motion query, and the departure suite |

---

## The two acts as built

**State A** — `.hm-a`, a plain `<div>` (not a `<section>`: an unnamed section is not exposed as a
region, and a named one would be a fourth landmark where §6.6.4 specifies three):

- `<h1>` "Akhil Saxena" from `home_config.title`, Playfair 60 / 700 / `--lh-tight` / `--ls-tighter`
- the italic subtitle "Interfaces & Imagery", Playfair italic `--text-xl` / 400
- the intro from `home_config.intro`
- `<section aria-label="Photographs">` holding a `<ul>` of six tiles
- `<a href="#work">SCROLL FOR THE WORK ↓</a>` — the only focusable element in state A

**State B** — `<div id="work" class="hm-b">`, holding two named regions rather than being one
itself, so "The résumé" is not nested inside a region called "The work":

- `<section aria-labelledby="hm-work-h">` — "The work", `ALL WORK →` → `/work`, the auto-fit
  project grid, and the "By day —" line closing the band
- `<section aria-labelledby="hm-resume-h">` — a `Divider`, "The résumé", `RÉSUMÉ →` → `/resume`,
  the derived shape line, the three skill-category names as an `Eyebrow`, and `View résumé`

**Does Home link to any photograph? No — deliberately, and this is the answer to the brief's
question.** `photoHref` is therefore not imported, and the peek tiles are not anchors. The reason
is a measured property, not a preference: Phase 0 recorded *"Prompt is a real anchor — one Tab and
one Enter from the landing"*, and six tile links would put six tab stops in front of the one CTA
state A has. `/photos` is reachable from the nav on every route. If a later plan makes the tiles
links, it **must** import `photoHref` from `src/lib/photo-srcset.ts` (BL-8) and must re-measure the
tab-order property.

`srcsetFor` **is** imported and used for all six tiles, unchanged.

---

## THE MARKER — migrated, and proven still load-bearing in both directions

**New marker: `home-render-ok`.** It is the value of `data-home-marker` on Home's `<h1>`.

**Carried by commit `d442d83`**, which moved all three sites in one commit:

| site | before | after |
|---|---|---|
| `test/harness/preview-reachable.node.test.ts:37` | `toContain('stack-proof-ok')` | `toContain('home-render-ok')` |
| `test/auth/deny-unauthenticated.node.test.ts:140` | `toContain('stack-proof-ok')` | `toContain('home-render-ok')` |
| `src/middleware.ts:21` | the contract, in prose | the same contract naming the new marker, plus a paragraph recording the migration |

**Why the `<h1>`, and why an attribute.** The `<h1>` is a design-system `Heading` — a React 19
component rendered with **no** `client:*` directive. So the assertion still proves the whole chain
in one shot, exactly as the old one did: the build ran, a React component became static HTML with
no hydration script, workerd served it, and the middleware let the prerendered route through. A
marker on a hand-written element would have proved strictly less. It is an *attribute* rather than
the heading's text because the text is `home_config.json`'s `title` — reviewed content a Phase 7
admin edit may legitimately change — while an attribute in code cannot be edited out of the CMS.

### The proof that both suites still fail for the right reason

Two controls, because the assertion has two halves and a control that trips the first never reaches
the second. Shell: **zsh** (`$0` = `/bin/zsh`).

**Control 1 — point both at a route that does not exist** (`/no-such-route-05-11/`):

```
FAIL |integration| test/auth/deny-unauthenticated.node.test.ts > serves GET / with 200 and the static build marker
  AssertionError: expected 404 to be 200
FAIL |integration| test/harness/preview-reachable.node.test.ts > answers the index route with 200 and the static build marker
  AssertionError: expected 404 to be 200
Test Files  2 failed (2)      Tests  2 failed | 9 passed (11)
```

**Control 2 — the route exists, the MARKER does not.** Renamed `HOME_RENDER_MARKER` to
`marker-dropped-by-a-later-plan` in `index.astro` and rebuilt. This is the control that matters,
because it is the one a future plan actually causes:

```
FAIL |integration| test/auth/deny-unauthenticated.node.test.ts
  AssertionError: expected '<!DOCTYPE html><html lang="en" data-b…' to contain 'home-render-ok'
    140|     expect(await response.text()).toContain('home-render-ok');
FAIL |integration| test/harness/preview-reachable.node.test.ts
  AssertionError: expected '<!DOCTYPE html><html lang="en" data-b…' to contain 'home-render-ok'
     37|     expect(body).toContain('home-render-ok');
Test Files  2 failed (2)      Tests  2 failed | 9 passed (11)
```

The status assertion passed (200) and the **marker assertion itself** bit. The contract is intact.

**Restored, byte-identical, and green:**

```
test/harness/preview-reachable.node.test.ts   bb90306ec96598992dd6b0b6d76d7b8d34102dcb9f78972aa47c75b9e146b604
test/auth/deny-unauthenticated.node.test.ts   9943b5c539f306d2261b294ca71756eaea3b839831a7c17dbc56ef2dda587716
src/pages/index.astro                         (git status clean)

npx vitest run --project integration home.node + preview-reachable + deny-unauthenticated
  Test Files  3 passed (3)      Tests  33 passed (33)
```

### The dangling-reference check matches an import, not a word

```
$ grep -rnE "(from|import).*StackProof" src test
$ echo $?
1                                     # no match — correct
```

`grep -rn StackProof src test` still matches **three** prose sites (`src/lib/content.ts:20`,
`src/pages/index.astro`, and both suites' migration comments), which is why the plan's own
objective replaced it. `src/lib/content.ts:20` says *"`src/pages/index.astro` renders `StackProof`
and no content"* — now stale, in a file no plan authorises me to edit. **Deferred, not fixed.**

### 🔴 The deletion was carried by another plan's commit, and HEAD was broken for 4 minutes

`scripts/assert-no-r2dev-urls.mjs` scopes itself with `git ls-files`, so the deletion had to be
**staged** before the gate would stop reporting `StackProof.tsx: unreadable — ENOENT`. In the
window between that `git rm --cached` and my commit, **05-07's `aafabf8` committed my staged
deletion** — 36 deletions in a commit whose message never mentions it — leaving HEAD with
`index.astro` importing a file that no longer existed, and both suites still asserting
`stack-proof-ok`. `d442d83` closed it.

**The lesson is an ordering one, and it generalises:** in a shared live tree, *stage-then-verify*
is unsafe, because any concurrent `git commit` sweeps the index. Verify first; stage and commit
back-to-back with nothing in between. A gate scoped by `git ls-files` forces the unsafe order, and
that is worth knowing before the next one is written.

---

## 🔴 `flex: 1 0 auto` CANNOT size state A on this page. It is arithmetic, not a defect.

`public-shell.css` §2 tells this plan the opt-in is one declaration. On a one-section page that is
right. Here it distributes **zero**:

```
.pub-shell { min-height: 100svh; display: flex; flex-direction: column }
.pub-main  { flex: 1 1 auto;     display: flex; flex-direction: column }
```

Flexbox distributes FREE SPACE, and free space exists only while a container is taller than its
content. `.pub-main`'s content is `.hm-a` + `.hm-b`, and `.hm-b` is `min-height: 100svh` (required —
the 768 × 1024 departure). So the shell's content already exceeds `100svh`, `min-height` is
satisfied with nothing left over, `.pub-main`'s height is content-determined, and `flex-grow: 1` on
`.hm-a` grows it by nothing. **State A would have been exactly as tall as its own content, on a page
that builds and looks plausible.**

`flex: 1 0 auto` is kept, because its other half is load-bearing and unaffected: `flex-shrink: 0` is
what makes content taller than the budget overflow **visibly** — §6.2's `min-height`-never-`height`
property. The grow half is inert here and the stylesheet says so.

The budget is therefore explicit:

```css
.hm-a {
  --hm-bar-allowance: calc(var(--space-16) + var(--space-2));   /* 72px */
  --hm-above: calc(var(--space-11) + var(--hm-bar-allowance));  /* 116px */
  flex: 1 0 auto;
  min-height: calc(100svh - var(--hm-above));
}
```

### `--ds-appbar-h`, measured a second time — and the declared value is itself wrong

The UI-SPEC says the finding is *"closed upstream — do not re-measure."* It is not, and there is now
a **second** reason not to copy the property. Read in Chromium at every class:

| where | fine pointer | coarse pointer |
|---|---|---|
| `getPropertyValue('--ds-appbar-h')` **inside** `.ds-atom-appbar` | `"47px"` | `"69px"` |
| the same call on `.hm-a`, a **sibling** of the bar | `""` | `""` |
| the bar's **actual rendered height** | **57px** | **69px** |

Custom properties inherit to descendants, not siblings, so 05-06's finding reproduces exactly. But
the declared 47px is also **10px short of what the bar actually renders on a fine pointer** — so even
a faithful local re-declaration of `--ds-appbar-h`, the thing `public-shell.css` forbids by name,
would have produced a state A 10px too tall at 1440. Both go upstream for `2.0.0-beta.2`.

### Why an over-estimate, and why that is the right kind of wrong

`--hm-above` is 116px against 113px of real chrome (69 coarse bar + 44 `.pub-main` padding).
Measured `aTopDoc = 113` at every class. **The two errors are not symmetric.** Under-estimating
pushes the scroll prompt below the fold — the single failure the subtraction exists to prevent.
Over-estimating ends state A ~3–25px early, inside Act 2's `--space-8` leading whitespace, where
nothing is drawn. So the allowance is sized against the taller bar and used at both pointer types,
and it is named an *allowance* rather than a copy.

---

## The six-class measurement, in Chromium

`.hm-a`'s bottom must reach the fold **and** the prompt must be above it (`fills`); one viewport of
scroll must leave no photograph on screen (`departs`).

| class | viewport | ptr | bar | aBottom | fills | scrollMax | photosBottom | departs | loadY | `#work` snapAlign | snapType | cols | tile |
|---|---|---|---:|---:|---|---:|---:|---|---:|---|---|---:|---|
| 1 folded cover | 344 × 882 | coarse | 69 | 903 | **YES** | 1308 | −236 | **YES** | 0 | `start` | `y` | 2 | 148 × 99 |
| 2 phone portrait | 390 × 844 | coarse | 69 | 865 | **YES** | 1304 | −210 | **YES** | 0 | `start` | `y` | 2 | 163 × 109 |
| 3 foldable narrow | 673 × 620 | coarse | 69 | 641 | **YES** | 1214 | −111 | **YES** | 0 | `start` | `y` | 3 | 192 × 108 |
| 4 tablet portrait | 768 × 1024 | coarse | 69 | 1045 | **YES** | 1186 | −433 | **YES** | 0 | `start` | `y` | 3 | 224 × 149 |
| 5 tablet landscape | 1024 × 768 | coarse | 69 | 789 | **YES** | 999 | −140 | **YES** | 0 | `start` | `y` | 3 | 299 × 168 |
| 6 laptop | 1440 × 900 | fine | 57 | 909 | **YES** | 1022 | −142 | **YES** | 0 | `start` | `y` | 3 | 349 × 233 |
| **B binding** | **841 × 768** | coarse | 69 | 789 | **YES** | 983 | −196 | **YES** | 0 | `start` | `y` | 3 | 248 × 140 |

**Six tiles rendered and six visible at every class**, and `document.scrollWidth === innerWidth` at
every class — no R-6 horizontal scroll. **The 841 × 768 binding case passes**, where the reviewed
captures put "The résumé" on the bottom edge with its content cut off.

The tile widths reproduce §6.3's measured table exactly at classes 1–5 (148, 163, 192, 224, 299).
Class 6 differs — 349 against the carried 317 — because `.pub-max-home` now caps the content box at
`PAGE_MAX.home` (1080) where Phase 0's playground did not; the arrangement (3 × 2 at 3:2) is
unchanged.

---

## The snap rules, and the computed-style reads the plan asked for

```css
@media (prefers-reduced-motion: no-preference) {
  html:has(.hm-a) { scroll-snap-type: y proximity; --hm-sticky-nav: 0px; }
  .hm-a           { scroll-snap-align: start; scroll-margin-top: var(--hm-above); }
  html:has(.hm-a) #work { scroll-snap-align: start; scroll-margin-top: var(--hm-sticky-nav); }
}
```

- **`getComputedStyle(document.querySelector('#work')).scrollSnapAlign` reads `start`** at 7/7.
  **The Astro scoping trap does not occur**, and `:global()` is *not* the reason it does not.
  `home.css` is a plain imported stylesheet, so **nothing in it is scoped** and `#work` reaches
  `HomeActTwo.astro`'s root directly. Writing `:global()` there would have been an unknown
  pseudo-class in a `.css` file, invalidating the selector and **dropping the rule** — the defect
  arriving through its own fix. The suite asserts `:global(` is absent, over comment-stripped
  source, and that assertion **bit on its first run** against the header sentence explaining why.
- **`getComputedStyle(document.documentElement).scrollSnapType` serialises as `y`.** Chromium drops
  `proximity` because it is the initial strictness. Recorded so it is not misread as a failure:
  **`y` is positive confirmation it is not `mandatory`.**
- **Under `RM=reduce`, Chromium reports `scrollSnapType: none`, `.hm-a` `scrollSnapAlign: none` and
  `scrollMarginTop: 0px`** — every snap declaration really is inside the query — and the departure
  still completes, so snap is never load-bearing.
- `scroll-behavior: smooth` is **not** restated: `public-shell.css` §4 already declares it on `html`
  inside this same query for every public route.

### 🔴 The plan's own `scroll-margin-top` fallback ships the defect §6.5 warns about

The plan says: *"if the shell's flex mechanism means there is no constant to take, say so and use
`scroll-margin-top: var(--space-11)`."* Planted exactly that (44px) and measured:

```
RM=no-preference 673x620   scrollY at load=69  after 600ms=69  .hm-a margin=44px  aTopDoc=113
RM=no-preference 1024x768  scrollY at load=69  after 600ms=69  .hm-a margin=44px  aTopDoc=113
RM=no-preference 841x768   scrollY at load=69  after 600ms=69  .hm-a margin=44px  aTopDoc=113
RM=no-preference 390x844   scrollY at load=69  after 600ms=69  .hm-a margin=44px  aTopDoc=113
```

**The page scrolls itself to 69px at first paint and hides the entire AppBar** — precisely *"the page
would scroll itself and hide the nav at first paint."* `69 = 113 − 44`. With `var(--hm-above)`
(116px) it is **0 at 7/7**. State A's snap position is the top of the document, and an outset larger
than the chrome is free because the position clamps to scroll offset 0; an outset smaller than it is
this.

---

## The two mutation controls 05-15 owes — RUN, and **neither behaves as the plan states**

Both were executed rather than merely handed over, because the plan's framing of them turned out to
be wrong in both directions.

| control | plan says | **measured** |
|---|---|---|
| `.hm-a { min-height: 60svh }` | must break **fills** | breaks fills at **6 of 7** — but **only with a two-sided predicate** |
| `.hm-a { min-height: 160svh }` | must break **departs** | breaks **fills** at 7/7; breaks **departs** at only **5 of 7** |

**1. A one-sided `fills` predicate cannot fail, and I reproduced the plan's own hazard inside my own
instrument.** My first `fills` was *"the prompt's bottom is at or above the fold"*. Under `60svh` that
stayed true at **7/7** — a shorter state A keeps the prompt on screen; it just brings the work band
on screen with it. `fills` must be **two-sided**: the prompt visible **and** `.hm-a`'s bottom at or
below the fold. With that, `60svh` reports `NO-lo` at classes 1, 2, 4, 5, 6 and B.

**Class 3 (673 × 620) survives `60svh`** — `aBottom` 622 against a 620 viewport — because at the
shortest viewport state A's *content* already exceeds 60svh. That is a true fact about the class,
not a gap in the control, and 05-15 should assert 6/7 rather than 7/7.

**2. `160svh` does not break `departs` everywhere.** It reports `departs: NO` at classes 1, 2, 3, 5
and 6, and **YES at 4 (768 × 1024) and B (841 × 768)** — the two tallest documents relative to their
viewport still complete the departure. 05-15 must assert the control fires at *some* class, or use a
larger multiplier.

`departs` stays **YES at 7/7** under `60svh`, confirming the plan's reasoning that a shorter state A
departs more easily, not less — which is exactly why the second control alone was never sufficient.

Source restored byte-identical after every control:
`src/styles/home.css` → `1b8cc50df898362eae030bce744ffa695b9f2291eea93c70ca7c969ed83fec91`.

---

## The peek grid

`grep -n "aspect-ratio" src/styles/home.css`, quoted in full — lines 145/147/150/151 are the
paragraph explaining the rule; **190 and 210 are the only declarations, both on `.hm-tile`, neither
in a media condition:**

```
145: * **Tile aspect steps on a HEIGHT rung at 800px, and that is not an aspect-ratio branch** — it is
147: * an aspect-ratio branch flips mid-gesture on a foldable, which is the single most demanding
150: * `aspect-ratio` appears only on the tile, for its own intrinsic box. It is never a media
151: * condition. `grep -n "aspect-ratio" src/styles/home.css` is quoted in the SUMMARY.
190:  aspect-ratio: 16 / 9;
210:    aspect-ratio: 3 / 2;
```

The suite asserts this structurally rather than by grep — it parses every `@media` condition and
requires none to mention `aspect-ratio`, then requires the property to be present so the test cannot
pass on an empty stylesheet.

**The height rung `@media (min-height: 800px)` is present** (line 208) and is the only thing that
changes the tile aspect. Column count steps once, at `@media (min-width: 673px)`, and the suite
asserts every `min-width` in the file is a member of `BREAKPOINTS` from `layout-ladder.ts`.

`alt` is the photograph's own `alt`, never its `title` (D-24-1), asserted in both directions over
`<img alt="…">` **attribute values**. All six take `loading="eager"` (§7.5). `object-position` comes
from `peekPositions`, defaulting to `DEFAULT_FOCAL_POINT` imported from `src/schemas/photo.ts`
(1 override + 5 defaults, counted from the artefact). The count is `data-peek-count`, derived.

### `sizesFor` is deliberately not called, and that is not a re-derivation

`sizesFor(columns)` is built for the masonry's ladder (1 column at base, 2 at the first breakpoint)
against `PAGE_MAX.photos` (1280). The peek grid is 2 at base, 3 from 673, against `PAGE_MAX.home`
(1080). Calling it would emit a `sizes` that is silently wrong — the wrong variant of all six
photographs, no visual symptom, no error. `PeekGrid.astro` composes its own from the **same**
`GUTTER_RUNGS`, `MASONRY_GAP` and `PAGE_MAX`; no breakpoint, gutter, gap or cap is typed. As shipped:

```
sizes="(min-width:1024px) calc((min(100vw, 1080px) - 96px - 32px) / 3),
       (min-width: 673px) calc((100vw - 64px - 32px) / 3),
       (min-width: 375px) calc((100vw - 48px - 16px) / 2),
       calc((100vw - 32px - 16px) / 2)"
```

**Finding for whoever needs a third grid:** `sizesFor` cannot be reused across arrangements. The
honest fix is to give it the ladder as a parameter, not to copy it. Not done here — 05-07 and 05-08
are importing that module concurrently and a signature change in wave 4 is not worth the risk.

---

## Act 2, the two gaps, and the three landmarks

**The two gap values, quoted from the stylesheet:**

```
284:  gap: var(--space-8);            /* .hm-b — GAP 2, before "The résumé" */
404:  margin-block-start: var(--space-8);   /* .hm-byday — GAP 1, after the project grid */
```

Both are `--space-8` (32px), as §6.4 rules.

**The three named landmarks, read off the built page:**

| landmark | accessible name |
|---|---|
| `<section class="hm-peek" aria-label="Photographs">` | **Photographs** |
| `<section class="hm-work" aria-labelledby="hm-work-h">` | **The work** |
| `<section class="hm-resume" aria-labelledby="hm-resume-h">` | **The résumé** |

Exactly three, asserted as a count so a fourth is a failure. Zero `order`, zero positive `tabindex`,
zero `position: fixed` on a focusable element, and neither state is hidden.

**Projects: 5 of 5 rendered, 0 elided** — read from `data-project-count="5"` /
`data-projects-elided="0"` on the grid, not assumed. The cap is 6, and `shown === min(records, 6)` is
asserted. Each card carries its `oneLiner` (never its `description`), with `{{ds.componentCount}}`
resolved to **81** through `resolveDsTokens`.

The résumé band states the shape of the record — `resume.json` has no prose summary field, and
inventing one would put unowned copy on the primary route. Every figure is derived: "3 roles and 5
projects" from `resume.experience.length` and `projects.length`, the three skill-category names from
`resume.skills`, and the "By day —" subject from the `isPresent` experience entry.

---

## The 60px heading, and its upstream finding

**MEASURED**, `dist/components/Heading.d.ts`: `HeadingSizeToken` is `"2xs" … "4xl"` and **stops at
`4xl` (44px)**, while `dist/tokens.css` ships `--text-4xl-plus` (52) and `--text-5xl` (60). *The
component's token union does not expose two steps its own type scale defines.* Filed for
`2.0.0-beta.2`.

**Which mechanism was used, and why the alternative is not available.** MEASURED in
`chunk-DQHLFJNO.js`: the numeric `size` path inlines `fontSize`, `lineHeight: 1` and a size-derived
`letterSpacing`; the token path emits `data-size` and inlines nothing. `Heading` *does* concatenate
`className` — but its **default size is the number 28**, so a bare `<Heading className="hm-name">`
inlines `font-size: 28px`, which no class rule can beat. Passing a token size instead emits
`data-size`, whose `.ds-atom-heading[data-size=…]` rule is (0,2,0) against a class's (0,1,0) — so the
class loses that way too.

So: **`size={60} weight={700}`**, whose own letter-spacing derivation lands on `var(--ls-tighter)`
above 28px, exactly as §3.1 asks. The one thing it gets wrong is `line-height: 1` where §3.1 wants
`--lh-tight`; `style` spreads last in the component, so the correction goes through the component's
own prop. Both values are tokens.

The same shape recurs on the two `3xl` section headings: `.ds-atom-heading[data-size="3xl"]` sets
`line-height: var(--lh-tight)` where §3.1's section-heading row wants `--lh-snug`, so those take
`style={{ lineHeight: 'var(--lh-snug)' }}` too. The card title's `--ls-tight` needs no inline style —
`[data-size="xl"]` sets font-size and line-height but **not** letter-spacing, so a class wins there
uncontested. Recorded as one upstream finding with two faces: **the token size steps bake a
line-height that §3.1 disagrees with for two of its roles.**

---

## Every gate proven able to fail

Four steps each: **plant → FAIL naming it; FAIL given nothing; PASS on correct code; walk-through
attempted, residuals recorded.** Every planter asserts its own anchors before writing, after 05-05's
two false PASSes. **Every control below ran in `zsh`** (`$0` = `/bin/zsh`; Actions runs `bash`, so no
`${PIPESTATUS[0]}` and no `( cmd && R=0 || R=1 )` appears anywhere). No verify step ran `git add`.

### Gate 1 — the state-A artefact check

| step | result |
|---|---|
| nothing to check (`dist/client/index.html` removed) | `FAIL: dist/client/index.html does not exist — this run read nothing and cannot pass.` exit 1 |
| plant `alt={photo.title}` + a marker rename | exit 1, **19 findings**, each named: 6 × "title used as alt … (D-24-1)", 6 × "some image uses "Singapore" (a title) as its alt", "the migrated marker home-render-ok is not in the page", "home-render-ok is not on the `<h1>`" |
| correct code | `peek ids 6, eager images 6, module scripts 0, failures 0` → PASS |
| restore | `787fd290…` / `e5222866…` — byte-identical, `git status` clean |

**Walk-through residual, found and CLOSED.** In the planted run, five ids reported "alt missing" and
`architecture-singapore` did **not** — because the positive half was a whole-document
`h.includes(r.alt)`, and `<Seo>` emits that same string as `og:image:alt` (`SITE_OG_IMAGE_ID` is
`architecture-singapore`). A meta tag was satisfying an assertion about an image. The positive half
now reads **`alt` attribute values only** (`6` on the page) and refuses to run on zero.

### Gate 2 — the Act-2 artefact check

| step | result |
|---|---|
| nothing to check | `FAIL: … read nothing and cannot pass.` exit 1 |
| plant 4 (unresolved token · `aria-hidden` on the résumé region · literal `3 roles and 5 projects.` · cap 6→2) | exit 1, **8 findings**: `aria-hidden/inert on a non-decorative element: <section class="hm-resume" aria-hidden="true">`, `no <section aria-labelledby="hm-resume-h">`, `2 named <section> landmark(s), expected 3`, `hand-typed count(s): 3 roles, 5 projects`, 3 × `no longer derives via …`, `2 project(s) shipped; the cap of 6 over 5 records says 5` |
| isolated token plant (cap left correct) | exit 1, artefact side: `missing oneLiner for design-system`, `UNRESOLVED oneLiner reached the page`, `an unresolved {{…}} token reached the page` |
| correct code | `projects shown 5 of 5; elided 0; failures 0` → PASS |
| restore | `24f23fea…` / `cefd516d…` — byte-identical |

**Cross-check: 05-03's `assert-no-unresolved-placeholders.mjs` was tripped for the first time**,
against the same planted build. 05-03 recorded it as *"built and standing; it simply is not tripped
today."* It is now:

```
BUILD REFUSED — OQ-1b: an unresolved placeholder reached rendered HTML
  x dist/client/index.html:34: [PH-RAW] {{ds.componentCount}}
  1 finding(s) (1 occurrence(s)).        exit 1
```

### 🔴 Three of the plan's own Task-2 predicates could not have passed on correct code

1. **`h.includes(pr.oneLiner)`** compares the **raw** string from `data/projects.json`. The
   design-system record carries `{{ds.componentCount}}` and the page renders it **resolved**, by
   design and by §6.7 — so the plan's check reports a missing one-liner on a correct build.
   Repaired by resolving against the package's own README with `DS_COUNT_PATTERN`'s regex, which is
   also the stronger assertion: it proves the token was resolved *and* resolved to 81.
2. **`/aria-hidden="true"/.test(h)`** over the whole document. **MEASURED: the correct page carries
   eight**, and every one is a design-system component hiding its own decorative glyph —
   `IconButton`'s glyph wrapper, two lucide `<svg>`s, and five `StatusPill` markers whose *shape*
   carries the status while their text ("Live") stays exposed. §6.6.3 forbids hiding **a state**, not
   hiding a decoration. Replaced with an allow-list — permitted only on `<svg>` and on a `<span>`
   carrying `ds-atom-*-marker|glyph`, refused everywhere else — so an imagination gap is a loud
   false alarm rather than a silent miss. It reports its scan set (`130 start tags scanned; 8 carry
   aria-hidden/inert, 8 permitted`).
3. **Raw-JSON string comparison.** Two skill categories contain `&`, which renders as `&amp;`, so
   `h.includes(g.category)` reports content missing that is plainly on the page.

**And one the plan did not have: string equality cannot prove DERIVATION.** Planting the literal
`"3 roles and 5 projects."` left every artefact-side check green, because the literal agrees with
the derivation *today* — which is §13.3's hazard exactly, and is how a hardcoded 39 turned `main`
red in Phase 4. An artefact can show a value and never how it was obtained, so the source side now
refuses `\b\d+\s+(roles|projects|components|photographs)\b` over comment-stripped source, with a
canary (`rendered 3 roles and 5 projects` → must flag) and an anti-canary (`${roleCount} roles` →
must not), both checked on every run.

### Gate 3 — the snap and departure checks

| step | result |
|---|---|
| nothing to check | the comment stripper is asserted non-empty first; `home.css: 420 lines, 178 non-blank outside comments`, and a stripper canary + anti-canary run before any rule |
| plant `scroll-margin-top: var(--space-11)` | `scrollY at load = 69` at 4/4 classes probed — the page hides its own nav |
| plant `min-height: 60svh` | fills `NO-lo` at 6/7 |
| plant `min-height: 160svh` | fills `NO-hi` at 7/7, departs `NO` at 5/7 |
| correct code | fills **YES** and departs **YES** at 7/7, `loadY = 0` at 7/7 |
| restore | `1b8cc50d…` — byte-identical |

`test/public/home.node.test.ts`: **22 passed (22)**. The `:global(` assertion **bit on its first
run** against the header sentence explaining why `:global()` must not be written — the same shape as
the plan's own `grep -rn StackProof`, a rule matching a *word* rather than a *construct*. Repaired
to read comment-stripped source, with an anti-vacuity assertion beside it.

---

## Verification

| check | result |
|---|---|
| `npm run build` | **exit 0** (clean `rm -rf dist` rebuild) |
| `npm run check` | **exit 0** — read by redirect, never through a pipe |
| `npm run typecheck` | **exit 0**, `Result (122 files): 0 errors` |
| `node scripts/assert-ds-import-contract.mjs` | **exit 0** |
| `node scripts/assert-no-raw-html-sinks.mjs` | **exit 0** |
| `node scripts/assert-gutter-ladder.mjs` | **exit 0** |
| `node scripts/assert-no-unresolved-placeholders.mjs dist` | **exit 0**, 11 files / 172,913 bytes scanned |
| `dist/client/index.html` `<script type="module">` | **0** |
| my three test files | **33 passed (33)** |
| `npm test` (whole repo) | **19 failed \| 1335 passed** — all 19 in `test/public/photos-routes.node.test.ts` (18, 05-07's) and `test/content/build-fails-loudly.node.test.ts` (1, `expected 41 to be 40` — a concurrent agent's in-flight 41st manifest record). **None is mine.** |

---

## Contradictions with the plan and the UI-SPEC

1. **`<interfaces>`: "this plan writes `.hm-a { flex: 1 0 auto; }` and nothing else for the budget."**
   That cannot size state A on a two-act page — free space is zero. An explicit `min-height` is
   required. §6.2's three load-bearing properties are all preserved.
2. **The `scroll-margin-top: var(--space-11)` fallback ships the load-snap it warns about** — 69px at
   first paint, measured at 4/4 classes probed.
3. **§6.2 / the UI-SPEC: "The Phase 0 finding is closed upstream — do not re-measure."** Still wrong,
   reproduced independently, *and* the declared 47px is 10px below the bar's rendered 57px on a fine
   pointer.
4. **Task 2's verify has three predicates that fail on correct code** (raw one-liner, blanket
   `aria-hidden`, unescaped `&`), and a fourth gap (equality cannot prove derivation).
5. **Task 1's verify wraps a body containing single-quoted tokens in `bash -c '…'`** — the exact
   mechanism that gave 05-05 two false PASSes. Every check here runs as a plain `node` file with no
   quoting layers.
6. **Both 05-15 mutation controls are mis-stated** (see the table above): `60svh` needs a two-sided
   `fills` or it cannot fail, and `160svh` does not break `departs` at 2 of 7 classes.
7. **§13.2 lists `RÉSUMÉ →` *and* `View résumé`** and both are shipped, per the contract — two links
   to `/resume` within one region. Recorded as a mild redundancy for a screen-reader user rather
   than silently dropping one.
8. **`data/home_config.json`'s `ctas` still point at `/portfolio`, a legacy route.** Not rendered by
   this page and not written to; carried forward as content migration, exactly as Phase 0 recorded.

## Deferred

- **`src/lib/content.ts:20`** says *"`src/pages/index.astro` renders `StackProof` and no content"* —
  now stale prose in a file no plan authorises this one to edit.
- **`sizesFor` cannot be reused across grid arrangements**; the fix is a ladder parameter, deferred
  out of wave 4 because 05-07 and 05-08 import that module concurrently.
- **Two upstream findings for `2.0.0-beta.2`**: `HeadingSizeToken` stops at `4xl` while the scale
  ships `4xl-plus` and `5xl`; and `--ds-appbar-h` is both unreachable from a sibling and 10px below
  the bar's rendered height on a fine pointer.

## Handed to 05-15

The six-class departure audit, with **both** controls now measured rather than assumed:

- **`.hm-a { min-height: 60svh }` must break `fills` — and `fills` must be TWO-SIDED** (prompt above
  the fold **and** `.hm-a`'s bottom at or below it). Expect **6 of 7**; class 3 (673 × 620) survives
  because its content already exceeds 60svh.
- **`.hm-a { min-height: 160svh }` must break `departs` at some class, not at all.** Expect **5 of
  7**; classes 4 (768 × 1024) and B (841 × 768) still depart. It breaks `fills` at 7/7.
- A third control worth keeping: **`scroll-margin-top: var(--space-11)` on `.hm-a` must produce
  `scrollY > 0` at load.** Measured at 69.
- The 841 × 768 binding case passes today and should stay in the matrix.

## Self-Check

- `src/pages/index.astro` — FOUND
- `src/components/public/PeekGrid.astro` — FOUND
- `src/components/public/HomeActTwo.astro` — FOUND
- `src/styles/home.css` — FOUND
- `test/public/home.node.test.ts` — FOUND
- `src/components/StackProof.tsx` — **ABSENT** (the correct outcome; an existence guard here would
  invert a correct build into a failure)
- commits `d442d83`, `c639852`, `c24784a` — FOUND

## Self-Check: PASSED
