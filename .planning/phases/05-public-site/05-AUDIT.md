# Phase 5 — the six-class audit

**What this is.** The measurements `05-UI-SPEC.md` §16 says the executor owes *beyond* the gates,
taken in a real browser, at all six device classes of `00-RESPONSIVE-CONTRACT.md` §1, on the built
artefact, twice — once normally and once under `prefers-reduced-motion: reduce`.

**How to re-run it.**

```bash
npx playwright install chromium     # once per machine; no gate can do this for you
npm run build
npm run audit:public
```

**The run this document records.** `2026-08-29`, darwin/arm64, Chromium via `@playwright/test`
1.62.1, against `dist/client` built at commit `b6b2928`'s parent tree.

```
156 passed · 6 skipped (the reduce run's captures) · 0 failed · 2.7 min
42 screenshots written
```

**Every number below was read out of the run's own JSONL record**, not typed from a screen. The
harness appends one line per measurement to `$AUDIT_OUT/measurements.jsonl` as it goes, and this
document is written from that file.

---

## 0. The short version

| # | §16's owed measurement | Verdict |
|---|---|---|
| 1 | `doc == viewport` at all six classes on all six routes | **30 of 36 pass. 6 fail** — every route at 344px is 14px too wide. New finding **D-21**, upstream, ships. |
| 2 | State A fills, and one viewport departs | **PASS 6/6 in both runs.** Three controls, one of them constructed here because the two the plan handed over cannot fail on geometry. |
| 3 | Act 2 fits at 841 × 768 | **PASS.** The résumé heading's bottom is 696 against a 768 viewport — 72px of clearance where the reviewed capture had it cut off. |
| 4 | The Astro scoping trap — `#work`'s `scroll-snap-align` | **`start` at 6/6.** The trap does not occur. |
| 5 | The `Link` colours, read in a browser | Nav **correct**. Footer underline **wrong and shipping** — §4.6b's prediction confirmed, D-4. |
| 6 | Exactly three font families, and Playfair is not Georgia | **PASS.** Three families, four files, and a 176px width gap against Georgia. |
| 7 | The 44px hit floor | Nav **44**, footer **44**, filter pill **40** (OQ-4, upstream). Lightbox controls **32** (D-17). |
| 8 | `aria-current="page"` exactly once | **1 in the rail, 2 in the document**, on all eight gallery routes — §16's sentence is wrong about the document and right about the rail, exactly as 05-07 recorded. |

**Plus one finding no §16 item asked for:** under `prefers-reduced-motion: no-preference` the Home
page **intermittently scrolled itself 8–20px at first paint** — 6 of 48 measured loads, across five
of six classes. Under `reduce` it was 0 at 48 of 48. Snap was the cause.

> **RESOLVED, 2026-08-29.** Akhil's decision was to drop state A's snap point and keep `#work`'s.
> Re-measured the same way on the same machine: **15 of 48 before, 0 of 48 after**, under
> `no-preference`; 0 of 48 under `reduce` in both. `fills` and `departs` stayed **6/6 in both
> motion settings**. See §2's amended sub-section.

**And one copy row that never shipped:** §13.2's *Cross-link — Photos · ← see the work* did not
exist anywhere in the repository.

> **RESOLVED, 2026-08-29.** Built on Akhil's decision, matching `/work`'s treatment through one
> shared `CROSSLINK_TYPE`, and asserted on the served bytes character for character. See §12.

---

## 1. `doc == viewport` — 36 cells

**The predicate, and why it is the document's and not an element's.**
`document.documentElement.scrollWidth === window.innerWidth`.

- `clientWidth` was **rejected**: on the root element it is the viewport width minus a classic
  scrollbar, so it equals `innerWidth` whether or not the document overflows. The comparison would
  be vacuous.
- An element-level check (`rect.right > innerWidth`) was written first and **rejected after
  measuring it**. `/photos` at classes 1–2 is a horizontal rail *by design* (§8.3), so five filter
  pills legitimately sit past the right edge inside `overflow-x: auto`, and the element check
  reports ten violations on a page whose document does not overflow at all. The rail is the design;
  the document is the requirement.

Each cell also asserts `document.title !== ''` before reading geometry — a 404 page has
`scrollWidth === innerWidth` too, and thirty-six passing cells over six error pages is the exact
reporting failure T-05-15-01 names.

`doc − viewport`, in px. Identical in the normal and the reduced-motion run.

| route | 344 | 390 | 841 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|---:|---:|
| `/` | **+14** | 0 | 0 | 0 | 0 | 0 |
| `/work` | **+14** | 0 | 0 | 0 | 0 | 0 |
| `/photos` | **+14** | 0 | 0 | 0 | 0 | 0 |
| `/photos/abstract` | **+14** | 0 | 0 | 0 | 0 | 0 |
| `/photos/abstract/intothemist` | **+14** | 0 | 0 | 0 | 0 | 0 |
| `/resume` | **+14** | 0 | 0 | 0 | 0 | 0 |

The category and the photograph are **derived**, not named: first by `order` in
`data/portfolio_images.json`, and the URL is composed by `photoHref()` from
`src/lib/photo-srcset.ts` rather than by a `split('-')`, which is the failure 05-08 recorded.

### 🔴 D-21 — the AppBar overflows at 344px, on every page

```
344 × 882, coarse, every route:   documentElement.scrollWidth = 358   innerWidth = 344
overflowing element:              button.ds-atom-iconbtn (the theme toggle)
                                  left 326, right 358, width 32
```

`AppBar` renders two unnamed `<div>`s carrying **inline** `style="display:flex;gap:28px"` and
`gap:18px`, `min-width: auto`, inside a `justify-content: space-between` row with
`padding: 12px 16px`:

```
16 (pad) + 310 (brand + three nav links) + 32 (theme toggle) + 16 (pad) = 374 minimum
```

against a 344px viewport. **Not a webfont artefact** — measured 355px before `document.fonts.ready`
and 358px after. **Not a phone defect** — measured 0 overflow at 360px and at 374px. It is a
class-1 defect, and class 1 is the class `00-RESPONSIVE-CONTRACT.md` §1 says *"every arithmetic
check below is run against"*.

**Not worked around locally.** The gaps are inline styles on unnamed internal elements: no consumer
stylesheet can beat them without `!important`, which is the workaround the Core Value forbids and
which this phase has declined twenty times. Clipping the bar would hide the theme toggle, which
PUB-12 needs. Filed as **D-21** in `05-DS-FINDINGS.md`.

**It is asserted at 14, not tolerated.** The day the upstream fix lands, the audit fails and says so.

It is visible in `05-X-home-state-a-dark-344.png`: the sun icon at the top right is cut in half.

---

## 2. State A — the height budget, at six classes, twice

`fills` is **two-sided**: the scroll prompt is at or above the fold **and** `.hm-a`'s bottom reaches
at least the fold. `departs` is: one viewport of scroll leaves the peek grid entirely above the
viewport (`peekBottom <= 0`).

### 🔴 §16.2 says state A's bottom edge "**equals** `svh`". It does not, and it must not.

`.hm-a` is `min-height`, never `height` (§6.2), precisely so that content taller than the budget
overflows **visibly**. At class 1 the identity block, the peek grid and the prompt come to **903px
against an 882px viewport** — 21px of legitimate overflow. An equality assertion would red correct
code at the narrowest class and would have to be "fixed" by clipping, which is the failure
`min-height`-never-`height` exists to prevent. The predicate is `aBottom >= vh`.

### Normal run (`prefers-reduced-motion: no-preference`)

| class | viewport | ptr | bar | `aTopDoc` | `aBottom` | vh | prompt bottom | **fills** | `scrollMax` | peek after | **departs** | `loadY` |
|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|---|---:|
| 1 folded cover | 344 × 882 | coarse | 69 | 113 | 885 | 882 | 861 | **YES** | 1344 | −221 | **YES** | **18** |
| 2 phone portrait | 390 × 844 | coarse | 69 | 113 | 865 | 844 | 841 | **YES** | 1304 | −210 | **YES** | 0 |
| 3 foldable unfolded | 841 × 768 | coarse | 69 | 113 | 789 | 768 | 765 | **YES** | 983 | −196 | **YES** | 0 |
| 4 tablet portrait | 768 × 1024 | coarse | 69 | 113 | 1045 | 1024 | 1021 | **YES** | 1186 | −433 | **YES** | 0 |
| 5 tablet landscape | 1024 × 768 | coarse | 69 | 113 | 789 | 768 | 765 | **YES** | 999 | −140 | **YES** | 0 |
| 6 laptop | 1440 × 900 | fine | 57 | 101 | 909 | 900 | 885 | **YES** | 1022 | −142 | **YES** | 0 |

### Reduced-motion run (`prefers-reduced-motion: reduce`)

| class | `aBottom` | vh | prompt bottom | **fills** | scroll landed at | peek after | **departs** | `loadY` |
|---|---:|---:|---:|---|---:|---:|---|---:|
| 1 | 903 | 882 | 879 | **YES** | 882 | −200 | **YES** | 0 |
| 2 | 865 | 844 | 841 | **YES** | 844 | −189 | **YES** | 0 |
| 3 | 789 | 768 | 765 | **YES** | 768 | −175 | **YES** | 0 |
| 4 | 1045 | 1024 | 1021 | **YES** | 1024 | −412 | **YES** | 0 |
| 5 | 789 | 768 | 765 | **YES** | 768 | −119 | **YES** | 0 |
| 6 | 909 | 900 | 885 | **YES** | 900 | −133 | **YES** | 0 |

**The departure succeeds at 6 of 6 in both runs.** That is §12.2's proof: snap is an enhancement,
not the mechanism.

**The two runs land the scroll in different places, and that is snap working.** Under `reduce`,
`scrollTo(0, innerHeight)` lands at exactly `innerHeight`. Under `no-preference`, proximity snap
pulls it on to the nearest snap point — at class 1 it settles at 903, which is `#work`'s top. Both
depart; only one of them is a plain scroll.

### 🔴 The page scrolled itself at first paint, intermittently — FIXED

`--hm-above` is 116px against 113px of chrome above `.hm-a`, so state A's snap position clamps to
offset 0 and `loadY` should be 0. Measured over 8 loads per class per motion setting:

| | class 1 | class 2 | class 3 | class 4 | class 5 | class 6 |
|---|---|---|---|---|---|---|
| `no-preference` | `0,0,0,18,0,0,0,0` | `0,0,0,0,18,0,18,0` | `0,0,0,0,0,20,0,0` | `0,0,0,0,0,0,0,0` | `0,0,20,0,0,0,0,0` | `0,8,0,0,0,8,0,0` |
| `reduce` | 0 × 8 | 0 × 8 | 0 × 8 | 0 × 8 | 0 × 8 | 0 × 8 |

**6 of 48 loads under `no-preference`; 0 of 48 under `reduce`.** Snap is the only declaration the
query removes, so snap is the cause. 05-11 measured `loadY = 0` at 7 of 7 — one load per class,
which cannot see a 12.5% intermittency.

The magnitude is 8–20px against a 57–69px AppBar, so the bar is partly, never fully, scrolled off.
The audit asserts `loadY < barHeight` under `no-preference` (with the finding named) and
`loadY === 0` under `reduce`. An equality under `no-preference` would be a 12.5% flake, and a
flaky assertion teaches a re-run.

### ✅ FIXED, 2026-08-29 — state A's snap point is gone and `#work` keeps its own

Akhil took the candidate fix. `.hm-a`'s `scroll-snap-align: start` and the
`scroll-margin-top: var(--hm-above)` outset that was supposed to clamp it are removed;
`html:has(.hm-a) #work` is now the only snap point on the page, and `--hm-above` keeps its first
job as the height budget's subtrahend.

**Re-measured by the same method** — 8 loads per class per motion setting, fresh context each load,
over the built artefact behind `test/audit/serve-dist.mjs`, `document.fonts.ready` then 120 ms.
The before-run is this machine's, not the one tabulated above, so the two halves are comparable:

| | class 1 | class 2 | class 3 | class 4 | class 5 | class 6 | total |
|---|---|---|---|---|---|---|---|
| before, `no-preference` | 1/8 | 4/8 | 0/8 | 2/8 | 3/8 | 5/8 | **15 of 48** |
| before, `reduce` | 0/8 | 0/8 | 0/8 | 0/8 | 0/8 | 0/8 | **0 of 48** |
| **after, `no-preference`** | 0/8 | 0/8 | 0/8 | 0/8 | 0/8 | 0/8 | **0 of 48** |
| **after, `reduce`** | 0/8 | 0/8 | 0/8 | 0/8 | 0/8 | 0/8 | **0 of 48** |

Values seen before the fix: 8, 18 and 20px. This machine measured the intermittency at **31%**
where the run tabulated above measured 12.5% — the same defect, seen more often, which is what a
fresh context per load rather than a reused one buys.

**And the mechanism did not pay for it.** `fills` **6/6** and `departs` **6/6** in BOTH motion
settings, before and after. Under `no-preference` one viewport of scroll still lands on `#work`'s
snap point at every class — 903, 865, 789, 1045, 789, 909 — exactly as it did before, which is the
measurement that says Act 2 still lands.

**The assertion moved with the fix.** `loadY` is now asserted `=== 0` in BOTH projects rather than
`< barHeight` under `no-preference`. That equality is now honest: with no snap area within a
viewport of the document top there is nothing left to pull. **It was proven able to fail** — with
`.hm-a`'s rule planted back and the artefact rebuilt, the audit reported 7 failures: the six
computed-style reads (`state A must carry NO snap alignment`) and, at class 4, the equality itself
catching the self-scroll live in a single-load-per-class run.

---

## 3. The mutation controls — three, and only one of the two handed over survives

### What each control must do

"State A is exactly one viewport" is **two** requirements wearing one declaration. A control is
only a control once it breaks **one** of them and demonstrably leaves the other alone.

| control | breaks `fills` | breaks `departs` | verdict |
|---|---|---|---|
| `.hm-a { min-height: 60svh }` | **6 of 6, both runs** | **0 of 6, both runs** | ✅ the `fills`-from-below control |
| `.hm-a { min-height: 160svh }` | **6 of 6, both runs** | 4 of 6 under `no-preference`; **0 of 6 under `reduce`** | ⚠️ a `fills`-from-above control. **Not a `departs` control** — see below |
| `.hm-b { min-height: 0; padding-block: 0 }` | **0 of 6, both runs** | **class 6 only, both runs** | ✅ the `departs` control, constructed by this plan |

### Control 1 — `60svh`, and why `fills` must be two-sided

| class | `aBottom` | vh | prompt bottom | fills | peek after | departs |
|---|---:|---:|---:|---|---:|---|
| 1 | 774 | 882 | 750 | **NO** | −200 | YES |
| 2 | 747 | 844 | 723 | **NO** | −189 | YES |
| 3 | 685 | 768 | 661 | **NO** | −175 | YES |
| 4 | 751 | 1024 | 727 | **NO** | −203 | YES |
| 5 | 741 | 768 | 717 | **NO** | −119 | YES |
| 6 | 832 | 900 | 808 | **NO** | −129 | YES |

05-11's correction is carried and confirmed: a **one-sided** `fills` — "the prompt's bottom is at
or above the fold" — stays **true** under `60svh`, because a shorter state A keeps the prompt on
screen and simply brings the work band up with it. Only the two-sided predicate fires.

05-11 measured this control at 6 of its 7 classes, with 673 × 620 surviving. **At the six canonical
classes it fires at 6 of 6** — 673 × 620 is not in the approved matrix.

`departs` stays **YES at 6 of 6**, which is the half that makes it a control and not a second copy
of the other one.

### 🔴 Control 2 — `160svh` does not test what §16.2 says it tests

| class | project | `aBottom` | vh | fills | `scrollMax` | peek after | departs |
|---|---|---:|---:|---|---:|---:|---|
| 1 | normal | 1548 | 882 | NO | 1990 | **+16** | **NO** |
| 2 | normal | 1487 | 844 | NO | 1926 | **+12** | **NO** |
| 3 | normal | 1366 | 768 | NO | 1560 | −5 | YES |
| 4 | normal | 1775 | 1024 | NO | 1916 | −139 | YES |
| 5 | normal | 1366 | 768 | NO | 1576 | **+51** | **NO** |
| 6 | normal | 1565 | 900 | NO | 1678 | **+102** | **NO** |
| 1–6 | **reduce** | — | — | NO | — | −200 … −412 | **YES at 6 of 6** |

**Under `reduce`, `160svh` leaves `departs` true at every class.** The reason is geometric: the
peek grid sits near the *top* of state A and the scroll prompt is pinned to the bottom by
`margin-block-start: auto`, so making state A taller moves the **prompt** down and leaves the
photographs where they were. One viewport of scroll still clears them.

What happened under `no-preference` is that **proximity snap pulled the programmatic scroll back to
a snap point short of a full viewport** — measured at class 6: `scrollTo(0, 900)` settled at **665**.
So the "departure failure" this control produces is a snap artefact, not a geometry one.

This is the **third** correction §16.2's second control has taken:

1. Phase 0 specified it alone, and it could not fail — a shorter state A departs more easily.
2. 05-11 measured that it breaks `departs` at only 5 of 7 classes.
3. This run measured **why**: it breaks `departs` at 0 of 6 on geometry, and its `no-preference`
   failures come through the mechanism it is not testing.

It is kept, as the `fills`-from-above control, which it genuinely is.

### Control 3 — the one this plan had to construct

`departs` is `peekBottom(load) <= min(vh, scrollMax)`. The prompt sits **below** the peek grid, so
any mutation that pushes the photographs past the fold pushes the prompt past it too and breaks
`fills` in the same breath — measured with `.hm-tile { aspect-ratio: 1/2 }`, which breaks **both**
at 6 of 6. The only way to break `departs` while `fills` stays true is the **second** term: the
document running out of scroll before it runs out of viewport.

That is exactly §6.2's documented failure — *"at 768 × 1024, work + résumé + crosslink + footer came
to 1012px against a 1024px viewport … `scrollY=1012, photosBottom=12, NOT DEPARTED`"*.

| mutation | class 6 `scrollMax` | peek bottom at load | scroll landed at | peek after | departs |
|---|---:|---:|---:|---:|---|
| none | 1022 | 767 | 900 | −133 | YES |
| `.hm-b { min-height: 0 }` | **791** | 767 | 791 | −24 | YES |
| `.hm-b { min-height: 0; padding-block: 0 }` | **727** | 767 | 727 | **+40** | **NO** |

**And §6.2's guard is no longer load-bearing on its own.** With `.hm-b`'s `min-height` removed and
nothing else, `departs` stays true at 6 of 6 — Act 2's real content now exceeds a viewport by
itself at five classes, and at class 6 it clears by **24px**. Removing the padding as well takes
`scrollMax` to 727 and the departure fails. So the control is two declarations, and **the 24px is
the honest measure of how much margin `.hm-b { min-height: 100svh }` has left**. It should not be
deleted on the grounds that removing it changes nothing today.

`fills` stays **true at 6 of 6** under this control, in both runs, which is what makes it a
`departs` control rather than a third `fills` mutation.

### The controls are permanent, and what that trades away

All three run on **every** `npm run audit:public`, so a control that stops firing reds the suite.
The mutations are injected at runtime with `page.addStyleTag` — same specificity (0,1,0) as the
rule they replace, later in document order, no `!important` anywhere.

**Stated so nobody reads it as a wider claim:** runtime injection proves the *predicate* is
two-sided and would catch a wrong height. It does **not** re-prove the source→artefact path. 05-11
proved that half by source plant and byte-identical restore
(`src/styles/home.css` sha256 `1b8cc50d…`). Runtime injection was chosen here because a control
that runs on every audit is worth more than one that ran once, and because a plant left in the
working tree is what killed an agent earlier in this phase.

---

## 4. Act 2 at 841 × 768 — the binding case

The reviewed capture put *"The résumé"* on the bottom edge with its content cut off. Measured after
one viewport of scroll:

| class | viewport | work heading top | **résumé heading bottom** | vh | inside? | résumé block bottom |
|---|---|---:|---:|---:|---|---:|
| 1 | 344 × 882 | 32 | 1057 | 882 | no | 1214 |
| 2 | 390 × 844 | 32 | 1017 | 844 | no | 1174 |
| **3** | **841 × 768** | **32** | **696** | **768** | **YES — 72px of clearance** | 853 |
| 4 | 768 × 1024 | 32 | 736 | 1024 | yes | 893 |
| 5 | 1024 × 768 | 32 | 712 | 768 | yes | 869 |
| 6 | 1440 × 900 | 32 | 585 | 900 | yes | 701 |

**841 × 768 passes.** It is the only class the plan asks to fit, and **R-2** is why: *"only work and
résumé visible"* was agreed to mean what **fills the view** after the transition, not a promise that
both fit one viewport — which cannot hold at five projects plus a résumé at any class. Classes 1
and 2 are phones and need a second scroll for the résumé block; that is the agreed reading, not a
regression.

### The two dead gaps

| gap | declared | rendered |
|---|---|---:|
| the project grid → *"By day —"* | `margin-block-start: var(--space-8)` = **32px** | **56px** |
| the work band → *"The résumé"* | `.hm-b { row-gap: var(--space-8) }` = **32px** | **32px** |

Both declarations are the `--space-8` value 05-11 set, at all six classes, in both runs. **The
first one renders at 56px, not 32**, because `.hm-work` is a flex column with `gap: var(--space-6)`
(24px) and the margin composes with it: 24 + 32 = 56. §6.4 says both gaps "become `--space-8`
(32px)", and one of them is 56px on screen. Not a defect — nothing is cut off and the gap reads as
deliberate whitespace — but §6.4's sentence is about a declaration and a reader will take it as a
measurement.

---

## 5. The Astro scoping trap — the computed-style read

```
class 1–6, normal run:
  getComputedStyle(#work).scrollSnapAlign      = "start"     ← the trap does NOT occur
  getComputedStyle(#work).scrollMarginTop      = "0px"
  getComputedStyle(.hm-a).scrollSnapAlign      = "start"
  getComputedStyle(.hm-a).scrollMarginTop      = "116px"
  getComputedStyle(html).scrollSnapType        = "y"
  getComputedStyle(html).scrollBehavior        = "smooth"

class 1–6, reduce run:
  scrollSnapType = "none" · scrollBehavior = "auto"
  .hm-a  scrollSnapAlign = "none" · scrollMarginTop = "0px"
  #work  scrollSnapAlign = "none"
```

**`y`, not `y proximity`, and that is positive confirmation.** Chromium drops `proximity` from the
serialisation because it is the initial strictness. Under `mandatory` this reads `y mandatory`. The
short string is the correct one; it is recorded here so it is never misread as a partial
declaration.

**Why the trap does not occur, and why `:global()` is not the reason.** `home.css` is a plain
imported stylesheet, so nothing in it is scoped and `#work` reaches `HomeActTwo.astro`'s root
directly. Writing `:global()` there would be an unknown pseudo-class in a `.css` file, which
invalidates the selector and drops the rule — the defect arriving through its own fix. `home.css`
says so in its header, and 05-11's suite asserts `:global(` is absent from it.

**The suppression under `reduce` is real, not merely declared.** A source grep confirms a rule is
inside a media query; only a computed-style read in a browser under that preference confirms the
query applies.

---

## 6. The `Link` colours, read in a browser

Identical at all six classes; the theme is `dark` by default in every case.

| element | `color` | §4.2 | `text-decoration-color` | `font-size` |
|---|---|---|---|---|
| AppBar link (`variant="default"`) | `rgb(191, 191, 197)` | `--ink-2` `#bfbfc5`, **10.61 : 1** on the dark page ✅ | `rgb(191, 191, 197)` | 16px |
| Footer link (`variant="footer"`) | `rgb(242, 242, 244)` | `--ink` `#f2f2f4`, **17.37 : 1** ✅ | 🔴 **`rgba(0, 0, 0, 0.25)`** | 12.5px |

### 🔴 §4.6b's prediction, confirmed, and it ships

§4.6b says *"Phase 5 uses `variant='default'` in the footer, which is stylesheet-only and therefore
correct."* **That escape does not exist.** `Footer`'s own `renderLink` hardcodes
`<Link variant="footer" className="ds-atom-footer-link">` and exposes no per-item className, style
or variant hook, so **every** consumer of `Footer.links` gets the inline
`text-decoration-color: rgba(0,0,0,.25)`. On `#0d0d0f` that underline is invisible.

The link **text** is `--ink` and correct in both modes, so this degrades appearance rather than
function. **Not patched locally** — the only local fix is an `!important` reaching past a component
into its internals. Filed as **D-4**. `PublicLayout.astro` carries the reasoning at the call site.

This is the measurement §4.6a exists for: an inline style cannot be beaten by an app rule at
(0,1,0), and **every jsdom test still passes**, because jsdom implements no CSS specificity. Three
consecutive Phase 1 plans hit it.

---

## 7. Exactly three font families download, and Playfair is not Georgia

```
document.fonts, status "loaded":
  DM Sans Variable
  IBM Plex Mono
  Playfair Display Variable

absent, as required:  Inter · Archivo · JetBrains Mono · Newsreader

network, four files, all 200:
  dm-sans-latin-wght-normal.Xz1IZZA0.woff2
  playfair-display-latin-wght-normal.BOwq7MWX.woff2
  playfair-display-latin-wght-italic.DmbndNpe.woff2
  ibm-plex-mono-latin-500-normal.DSY6xOcd.woff2

h1 computed family:
  "Playfair Display Variable", "Playfair Display", Georgia, serif
```

Three **families**, four **files** — Playfair ships a roman and an italic face. §1.2's UNVERIFIED is
answered: the bare `@import "@fontsource-variable/…"` specifiers inside the design system's own
stylesheet **do** resolve through Vite from a transitive dependency.

### The width comparison, and the trap it walked into first

A family name in the computed style is **not** evidence that a file loaded — the computed value is
the declared list, resolved or not. So a fixed string is measured at 100px/700 in the h1's own
resolved stack and against Georgia:

| measured in | width |
|---|---:|
| the h1's own family stack | **1077.890625 px** |
| `Georgia` | **1254.0625 px** |
| `"No Such Family 9x7", Georgia` — the instrument's own control | **1254.0625 px** |

**A 176px gap.** Equal widths would mean a silent fallback.

**The first version of this probe was wrong, and it is worth recording how.** It declared
`font-family: "Playfair Display"` and measured **1025.109375px — identical, to eight decimal places,
to `font-family: serif`**. The loaded family is `Playfair Display *Variable*`, so the probe had
silently fallen back to Times and would have reported a fallback as a pass. That is §16.5's failure
mode reproduced *inside the instrument built to detect it*. The third row exists so the instrument
proves it can still see a fallback: an absent family must measure Georgia **exactly**, and it does.

---

## 8. The 44px hit floor, and the touch targets that miss it

Bounding-box heights, measured on `/photos`.

| class | pointer | AppBar link | Footer link | Filter pill | Lightbox close / prev / next |
|---|---|---:|---:|---:|---:|
| 1 · 344 × 882 | coarse | **44** ✅ | **44** ✅ | 🔴 **40** | 🔴 **32** |
| 2 · 390 × 844 | coarse | **44** ✅ | **44** ✅ | 🔴 **40** | 🔴 **32** |
| 3 · 841 × 768 | coarse | **44** ✅ | **44** ✅ | 🔴 **40** | 🔴 **32** |
| 4 · 768 × 1024 | coarse | **44** ✅ | **44** ✅ | 🔴 **40** | 🔴 **32** |
| 5 · 1024 × 768 | coarse | **44** ✅ | **44** ✅ | 🔴 **40** | 🔴 **32** |
| 6 · 1440 × 900 | fine | 21 | 16 | 40 | 32 |

**Five of six classes are coarse**, so the floor is the common case and not the exception
(`00-RESPONSIVE-CONTRACT.md` §2). Class 6 is fine-pointer and the floor does not bind; its numbers
are recorded rather than asserted.

- **The filter pill is 40px — OQ-4 / D-3.** `.ds-atom-segmented[data-size="lg"]
  .ds-atom-segmented-btn { height: 40px }` and `primitives.css` carries no `pointer: coarse` rule
  touching it. `FilterNav`'s `className` reaches the `<nav>` only. It is asserted **at 40**, not at
  `>= 40` and not at `>= 44`, so the day the upstream `min-height: 44px` lands the audit fails and
  tells you the good news.
- **The lightbox controls are 32px — D-17, and this is the worse one.** `.ds-atom-lightbox-close`
  declares 40px at (0,1,0); `.ds-atom-iconbtn[data-size="md"]` declares 32px at (0,2,0) and wins.
  Measured at **32 × 32 on a coarse pointer and on a fine one** — 12px under the floor, on the only
  affordances for closing and navigating a photograph on a phone.
- **`.ds-atom-lightbox-backdrop` computes `touch-action: pan-y`** — D-16's second half, confirmed
  in the browser. That declaration is why a consumer cannot add swipe-to-dismiss: the vertical axis
  is handed to the browser. **PUB-06 is partial because of it**, and that is not a Phase 5 defect.

**Class 5's pointer is `ambiguous` in the contract** and is walked as coarse here, because coarse is
the case that has a floor to miss. The fine half of class 5 is class 6's geometry at a shorter
viewport and is covered by class 6's row.

**Pointer emulation was itself measured, not assumed.** `hasTouch: true` alone resolves
`(pointer: coarse)` in Chromium — `matchMedia('(pointer: coarse)').matches` is `false` by default
and `true` with it, and `.ds-atom-appbar` renders 67px against 69px across the switch, which is the
design system's own coarse rule firing. **`isMobile: true` was rejected**: it also resolves coarse
but installs a mobile layout viewport, and the same page measured `aBottom` **847 under it against
865 without** — an 18px difference in the exact quantity the height budget is judged on. The
emulation must not move the measurement. Every class asserts its own pointer and its own viewport
before reading any geometry.

---

## 9. `aria-current="page"` — one in the rail, two in the document

| route | in the rail | in the document |
|---|---:|---:|
| `/photos` | 1 | 2 |
| `/photos/abstract` | 1 | 2 |
| `/photos/architecture` | 1 | 2 |
| `/photos/nature` | 1 | 2 |
| `/photos/portraits` | 1 | 2 |
| `/photos/product` | 1 | 2 |
| `/photos/street` | 1 | 2 |
| `/photos/wildlife` | 1 | 2 |

And in every case the rail's current pill points at the route it is on.

**§16 item 6's "exactly once" is wrong about the document and right about the rail.** The second
element is the AppBar's own *"photographs"* link, which `PublicNav` marks current on every route
under `/photos`. Written document-wide first, this assertion failed at 2 on all eight routes —
**independently reproducing the correction 05-07 already recorded** in
`test/public/photos-routes.node.test.ts`, whose header says exactly this. Both numbers are now
asserted here too, in a parsed DOM rather than a string count.

Two navigations each marking their own current item is defensible and common. It is recorded rather
than changed.

---

## 10. The screenshot set

**42 files**, in this directory, matching
`^05-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(344|390|768|841|1024|1440)\.png$` — which is
`00-RESPONSIVE-CONTRACT.md` §9's regex with `00` → `05`. **42 of 42 match. 0 are `-light-`**;
§9's rule that every public capture is `-dark-` survives verbatim. 9.2 MB total.

| artefact | files |
|---|---|
| `05-X-home-state-a-dark-{344,390,768,841,1024,1440}.png` | 6 |
| `05-X-home-state-b-dark-…` | 6 |
| `05-X-work-populated-dark-…` | 6 |
| `05-X-photos-populated-dark-…` | 6 |
| `05-X-photos-category-dark-…` | 6 |
| `05-X-photo-detail-dark-…` | 6 |
| `05-X-resume-populated-dark-…` | 6 |
| | **42** |

### 🔴 The captures are viewport-sized, not full-page, and that is forced rather than chosen

§9 asks for Home's state A **and** state B at all six classes, because *"one state is not evidence
of a two-state design"*. A full-page capture ignores the scroll position, so state A and state B
would be **the same image twice** — twelve files photographing one state. Every claim this audit
makes is about what fits in the viewport, so the viewport is what is captured. §9's full-page
assertion, written for Phase 0's admin artefacts, cannot be satisfied here without making the
two-state pair meaningless.

The captures come from the **normal** run only. Under `reduce` the page is identical at rest — the
query removes snap and smooth scrolling, neither of which paints — so a second set would be 42
duplicate files.

---

## 11. Every UNVERIFIED this phase carried, with its resolution

| where | question | resolution |
|---|---|---|
| **§1.2** | Does Vite resolve the bare `@fontsource-variable/…` specifiers inside the design system's own stylesheet? Do exactly three families download, and is Playfair actually Playfair? | **CLOSED** — §7 above. Three families, four files, a 176px width gap against Georgia, and an absent-family control proving the instrument can see a fallback. |
| **§4.6a / §4.6b** | Are the `Link` colours what the source says, in a browser? | **CLOSED** — §6 above. Nav correct; footer underline wrong and shipping, as D-4. |
| **§6.5** | Does the Astro scoping trap reach `#work`? | **CLOSED** — §5 above. `start` at 6/6, and the mechanism that closes it is a plain imported stylesheet, not `:global()`. |
| **§6.4** | Does Act 2 fit at 841 × 768? | **CLOSED** — §4 above. 72px of clearance. |
| **§12.2** | Does the departure survive `prefers-reduced-motion: reduce`? | **CLOSED** — §2 above. 6/6 in both runs, and the suppression is confirmed by computed style, not by a grep. |
| **§16.7** | Does the bundle gate bite — plant a `client:load`, watch it red, remove it, confirm the file is SHA-256-identical? | **CLOSED BY 05-14**, which ran nine controls including that one. Not re-run here. |
| **§16.8** | Does `node:crypto` reach a client chunk via the `VARIANTS` import? | **CLOSED BY 05-05** (`grep -rl 'node:crypto\|createHash' dist/client/` → exit 1, 11 files) and re-asserted continuously by 05-14's `A5-PIPELINE-CRYPTO` assertion. Not re-run here. |
| **§7.2** | Does Lighthouse's `unsized-images` audit accept a CSS `aspect-ratio` on a `width`-constrained image? | 🔴 **STILL OPEN. DEFERRED TO PHASE 8 under QUAL-01.** No Lighthouse run was done in this phase. Running one needs `lighthouse` installed, and a package install is not something this plan may do on its own authority. The fix if it flags is already written out in §7.2 and needs no design decision. |
| **§9.2** | Does `client:idle` measurably improve the Lighthouse score over `client:load` on `/photos`? | 🔴 **STILL OPEN — and it was recorded as answered when it was not.** See below. |

### 🔴 §9.2 — a measurement that was owed, never taken, never reported, and then cited

`src/pages/photos/index.astro` said, in shipped source:

> ``client:idle`, NOT `client:load` — measured, not reasoned. The four Lighthouse numbers behind
> that choice are in `05-12-SUMMARY.md`.`

**MEASURED: `05-12-SUMMARY.md` contains the word "Lighthouse" zero times.** So do "idle", "score",
"LCP", "TBT" and "performance". So does every other summary in this phase. `05-12-PLAN.md` made the
four numbers a **done criterion** (*"Build both, run Lighthouse … on `/photos` twice each, and keep
the better one"*), and its summary neither reports them nor records the omission.

This is the same failure class the phase has been hunting all along — a claim that cites evidence
that does not exist — and it had a citation pointing at it, which is what made it findable.

**Corrected in this plan.** The comment now says what is true and names Phase 8 as the owner.

**What could be measured here without installing anything**, on the built artefact over a local
origin:

```
/photos, client:idle as shipped
  1440 × 900   FCP 32ms   DCL 24ms   load 533ms
               all three chunks REQUESTED at 25–27 ms
  390 × 844    FCP 60ms   DCL 54ms   load 600ms
               all three chunks REQUESTED at 61–62 ms

  PhotoLightbox.jLpnyao1.js   17,751 B transferred
  client.CHz_MA6t.js         180,930 B
  react-dom.CAGmFW3z.js       11,387 B
```

**`client:idle` defers hydration, not download.** All three chunks go out *before*
`domContentLoaded` and ~500 ms before the `load` event. The directive is not buying a later fetch
here. Whether it buys a better score than `client:load` is the thing still unmeasured, and it needs
a Lighthouse run against both builds.

---

## 12. Copy — what is guarded, what is not, and one row that never shipped

**Nothing on this list is a browser measurement.** It is here because 05-09 and 05-10 both recorded
that rewriting the `<h1>` and the sub-paragraph leaves the whole suite green, and because the plan
that ends in a human copy review should hand that human the words.

Every string below was searched for, literally, across `test/` and `scripts/`, excluding this
plan's own harness. Three apparent hits were opened and discarded as false positives: `Akhil
Saxena` matches a git-author fixture in `test/pipeline/concurrent-push.node.test.ts`, `The work`
matches unrelated prose in `scripts/lib/dispatch-input.mjs`, and `Photographs` matches an
`aria-label` rather than the heading.

### §13.2's contract table, row by row

| row | shipped as | asserted? |
|---|---|---|
| Primary CTA — Home | `SCROLL FOR THE WORK ↓` | ✅ `test/public/home.node.test.ts` |
| Secondary CTA — Home Act 2 | `ALL WORK →` · `RÉSUMÉ →` · `View résumé` | ❌ none of the three |
| Primary CTA — Résumé | `Download the PDF` | ❌ |
| Cross-link — Work | *see the photographs →* | ✅ `test/public/work.node.test.ts`, character for character |
| **Cross-link — Photos** | 🔴 **does not exist** | — |
| Photo page — back | `← All photographs` · `← Product` | ✅ `test/public/photo-detail.node.test.ts` |
| Filter — unfiltered | `All · 40` | ✅ derived and asserted; the spec's literal `ALL · 39` is stale by one |
| Filter — category | `Architecture · 14` etc. | ✅ derived and asserted |
| Empty — category with no photos | implemented in `PhotoEmpty.tsx` | ❌ (and unreachable today) |
| Error — 404 | `Not found.` / `There is nothing at this address.` / `Go to the home page` | ✅ `test/public/seo.node.test.ts` |
| Destructive actions | none, by design | n/a |

### 🔴 §13.2's *Cross-link — Photos · ← see the work* was never built

`grep -rn "see the work"` across the whole repository returns **one** line: the spec row itself.
`/work` ships its half (`.wk-crosslink-row`, *see the photographs →*, asserted character for
character); `/photos` ships nothing. The pair was meant to be a pair. No gate caught it because
§13.2 is prose.

**Not added here.** Where it goes and what it looks like is a design decision on a reviewed page,
and this plan is an audit whose next step is Akhil reading it. The precedent is one element and two
rules, copied from `/work`.

### Page copy nothing asserts

| where | copy |
|---|---|
| Home `<h1>` | `Akhil Saxena` *(from `home_config.json` — CMS content, deliberately unpinned)* |
| Home subtitle | `Interfaces & Imagery` *(CMS)* |
| Home intro | `Building for the web. Photographing everything else.` *(CMS)* |
| Home Act-2 headings | `The work` · `The résumé` |
| Home by-day line | `By day — Senior Software Engineer at Brevo (Formerly Sendinblue).` *(role and company derived from `resume.json`)* |
| Home résumé line | `3 roles and 5 projects.` *(derived; and 05-11 measured that string equality cannot prove derivation — the literal passed every artefact check)* |
| `/work` `<h1>` | `Things I design and build.` |
| `/work` sub-paragraph | `Products shipped on my own — a component system and a few apps — alongside frontend engineering at Brevo.` |
| `/photos` `<h1>` | `Photographs` |
| `/photos` eyebrow | `40 photographs — all of them` *(derived count asserted; the wording is not)* |

**The Home strings are `home_config.json` and pinning them would break the CMS** — an editor
changing his own subtitle must not red the build. **The `/work` and `/photos` strings are page copy
in `.astro` source**, and pinning those has the same cost and benefit as the `/work` cross-link,
which §13.2 makes a contract entry and the suite asserts character for character.

**Not pinned here, and the reason is a boundary rather than an omission:** §13.2 deliberately
enumerates *which* strings are contract entries, and quietly extending that list from an audit
would widen a reviewed contract without review. It is on the list for Akhil, with the exact cost:
one assertion per string, in the file that already asserts the cross-link.

---

## 13. The `/resume` metric band — settled, and the reasoning

05-10 flagged this: the `metric` band renders on `/resume`, **§11.1's structure list does not
include it**, and `src/schemas/resume.ts`'s own comment scopes it to *"the right-aligned figure at
the end of each employment row on /work"*. It renders there on Akhil's instruction. Removing it is
one `<p class="rs-metric">` block in `ResumeEntry.astro` and two rules in `resume.css`; no test or
gate depends on it.

**Measured first, so the part that can be measured is not left to taste.** At all six classes:

| class | metric box | position | overflow |
|---|---|---|---|
| 1 · 344 | 116 × 17 | left 16 → right 132 — stacked under the identity | none |
| 2 · 390 | 116 × 17 | left 24 → right 140 — stacked | none |
| 3 · 841 | 116 × 17 | left 693 → right 809 — right-aligned in the header row | none |
| 4 · 768 | 116 × 17 | left 620 → right 736 | none |
| 5 · 1024 | 116 × 17 | left 860 → right 976 | none |
| 6 · 1440 | 116 × 17 | left 1144 → right 1260 | none |

It never collides, never wraps and never overflows; below the 673px rung it stacks under the
identity exactly as 05-10 said it would. Its colours match `/work`'s band exactly — value
`rgb(176, 176, 182)` = `--ochre-d-strong` (§4.3's accent item 2), label `rgb(168, 168, 174)` =
`--ink-3`.

**DECISION: it stays.** Three reasons, in order of weight.

1. **It was an instruction from the person the site is for.** A structure list in a spec is a weaker
   authority than that, and §11.1 is a list of what the page must contain, not a prohibition on
   what else it may.
2. **It is geometrically clean at every class**, and visually identical to the same figure on
   `/work`, so it reads as one vocabulary rather than two.
3. **Removal is one block and two rules with nothing depending on it**, so keeping it costs nothing
   that cannot be undone in five minutes if the human review disagrees.

**The residual, recorded rather than closed:** `src/schemas/resume.ts`'s comment still says the
field is `/work`'s, and §11.1 still does not list it. That is a documentation disagreement, not a
rendering one, and it should be fixed in whichever direction Akhil takes.

**Two things about the band that are for Akhil, not for me:**

- **The three values are placeholders** — already on his deferred list, not repeated as work here.
- **On the Brevo entry the metric says `+15% CONVERSION` and the first bullet says
  "conversion by 15%".** The band and the bullet make the same claim twice, four lines apart.
- **The space between value and label is drawn by CSS, not by text.** `textContent` is
  `+15%CONVERSION`, and `.rs-metric-value { margin-inline-end: 8px }` supplies the gap. It renders
  and reads correctly; a copy-paste and a screen reader get the unspaced string. This is 05-09's
  adjacent-expression finding, fixed visually by 05-10 in exactly the way 05-09 recommended.

---

## 14. What could not be measured, and why

**An audit that quietly omits a row is the same failure class as a gate that passes on nothing**, so
each of these is recorded rather than dropped.

| not measured | why | owner |
|---|---|---|
| Lighthouse `unsized-images` (§7.2) | needs `lighthouse` installed; a package install is not something an audit may do on its own authority | **Phase 8, QUAL-01** |
| `client:idle` vs `client:load` scores (§9.2) | same, and it also needs a second build with the directive changed | **Phase 8, QUAL-01** |
| Any Core Web Vital as a number | the origin here is `127.0.0.1` over loopback; FCP 32 ms and `load` 533 ms describe this machine, not a visitor | **Phase 8, QUAL-01**, against the deployed origin |
| Real device behaviour on iOS Safari and Android Chrome | Chromium emulation resolves `pointer: coarse` and the viewport, and it does **not** reproduce the mobile address bar, which is the entire reason §6.2 chose `svh` over `vh` | **Phase 8**, or a manual pass on hardware |
| Light mode at six classes | §9 of the responsive contract makes every public capture `-dark-`; light mode is the toggle's job and is checked in the human walk-through | task 3 |
| The source→artefact path for the mutation controls | the controls here are runtime injections; 05-11 proved the source-plant half with a byte-identical restore | closed by 05-11 |

---

## 15. Hand-off to Phase 8 — QUAL-01 and QUAL-04

**This audit runs locally and deliberately not in CI.** The recommendation is that it **stays that
way**, and the reason is not the browser download:

> A browser measurement is deterministic **per machine**, not per platform. libvips encodes
> differently on darwin/arm64 than on ubuntu/x64, and the same class of divergence applies to font
> rasterisation and sub-pixel layout — which are precisely the two things this suite measures. A
> cross-platform pixel assertion is a flake generator, and a flaky gate teaches a team to re-run
> rather than to read.

Every number in this document would need a tolerance to survive a platform change, and a tolerance
wide enough to survive it is wide enough to miss the 14px this audit found.

**What Phase 8 should take instead:**

1. **A real Lighthouse run against the deployed origin**, which closes §7.2 and §9.2 and is the
   thing QUAL-01 actually asks for. Neither needs this harness.
2. **The two upstream fixes as CI-observable facts.** If `2.0.0-beta.2` ships D-3 and D-21, the
   assertions here that are pinned at the *shortfall* (`pill === 40`, `overflow === 14`) will fail
   locally and say so. That is the notification mechanism; it does not need to be a gate.
3. **A single smoke assertion is defensible in CI**: `documentElement.scrollWidth ===
   innerWidth` at 344px on one route. It is integer-valued, has no sub-pixel component, and it is
   the one thing here that a platform cannot legitimately move. Everything else should not be a
   gate.
4. **`npm run audit:public` before any cutover**, as a release step rather than a push step.

The harness costs nothing to keep: 3 files, no new dependency (`@playwright/test` was already
installed by 05-01), one script key, and `test-results/` is gitignored.

---

## 16. The run's own controls — proving the audit can fail

Threat **T-05-15-01** is *an audit that reports a pass it did not measure*. Three walk-throughs.

### (a) Given no artefact at all

```
$ node test/audit/serve-dist.mjs /tmp/nosuchdir
serve-dist: /tmp/nosuchdir/index.html does not exist, so there is nothing to audit.
Run `npm run build` first. Serving an empty root would answer every request with a 404 and an
audit that walked it would measure a blank page at six device classes.
EXIT = 1
```

### (b) Given a document that answers 200 and carries none of the subjects

`AUDIT_ROOT` pointed at a root whose `index.html` is `<p>nothing here</p>`:

```
25 failed · 0 passed

Error: six-class audit: .hm-a is not in the document. The page did not render what the
       measurement is about, and a geometry read on a missing element is not a measurement.
Error: six-class audit: #work or .hm-a is not in the document.
Error: six-class audit: .ds-atom-appbar a[href="/work"] is not in the document.
Error: six-class audit: the page has no <h1>.
Error: /work did not render a titled document
Error: class 1 carries D-21's measured 14px AppBar overflow on /; if this number changed,
       the finding changed
```

**Every measurement fails, and every one names its own subject.** The `doc == viewport` cell fails
on the *title* anti-vacuity assertion before it ever reads a width — which is the check that stops
36 error pages being reported as 36 passes.

*(That run also found a defect in the harness: the `aria-current` test read an attribute off a
locator that resolved to nothing and waited out the full 60-second timeout instead of saying "there
is no current pill". The count is now asserted before the attribute is read.)*

### (c) On correct code

```
156 passed · 0 failed
```

### (d) The three mutation controls

Permanent test cases, not a one-off plant — §3 above. Each asserts both what it breaks and what it
must leave alone, so a control that collapses into another one reds the suite.

---

## 17. Defective premises in `05-15-PLAN.md`, and what replaced each

| # | the plan said | measured | replaced with |
|---|---|---|---|
| 1 | *"The measurements, per §16"*, then lists eight | Only **six** of the plan's eight are §16 items. §16's items **7** (the bundle gate bites) and **8** (`node:crypto` in a client chunk) are absent from the plan; the Astro scoping trap and the 44px floor are in the plan and not in §16. | Both substitutions taken (they are good measurements), and §16.7 / §16.8 chased to where they were actually closed — 05-14 and 05-05. §11 records both. |
| 2 | `key_links`: *"the six canonical viewports and the breakpoints come from `src/lib/layout-ladder.ts`, pattern `BREAKPOINTS`"* | `BREAKPOINTS` is `[375, 673, 1024]` — the three widths at which the **gutter** steps. It contains no viewport and never did. The viewports are the user's approved device matrix and live in the responsive contract. | The link is made load-bearing the only way it can be: `gutterAt(width)` is asserted against the value Chromium computes at every class (16/24/32/32/48/48, 6 of 6 correct), and the matrix is asserted to straddle every rung. A decorative import would have satisfied the letter and measured nothing. |
| 3 | §16.2: *"State A's bottom edge **equals** `svh`"* | It exceeds it by 3–21px at every class, by design — `.hm-a` is `min-height`, never `height`, so content taller than the budget overflows visibly. | `aBottom >= vh`, as one half of a two-sided `fills`. §2. |
| 4 | *"a `160svh` mutation must break **departs**"* | Under `reduce` it breaks `departs` at **0 of 6**. Its `no-preference` failures are proximity snap pulling the scroll short, not geometry. | Kept as the `fills`-from-above control, and a **third** control constructed for `departs`: `.hm-b { min-height: 0; padding-block: 0 }`, which fires at class 6 and leaves `fills` true at 6/6. §3. |
| 5 | *"Both mutation controls ran, each broke a DIFFERENT assertion"* | Both of the plan's controls break `fills`. Only one of the three breaks `departs`, and it is not one of the plan's two. | The three-control set in §3, with each control asserting what it must **not** break. |
| 6 | §16.2: *"one viewport of scroll leaves `photosBottom = 0`"* | It leaves −119 to −433 depending on class. Equality is unreachable. | `peekBottom <= 0`. |
| 7 | *"§9.2's `client:idle` measurement (already answered in 05-12; carry the number forward)"* | **It was never taken.** `05-12-SUMMARY.md` contains no Lighthouse number and no record of the omission, while the shipped source cites it as the location of four. | Recorded as still open, deferred to Phase 8, the source comment corrected, and a real proxy measurement taken instead. §11. |
| 8 | *"Add one script: `audit:public` … state the reason in a comment next to it"* | JSON has no comment syntax. | A sibling `"//audit:public"` key carrying the reason. Called out here so it is read as deliberate. |
| 9 | Task 1 verify: `npx playwright install --with-deps chromium` | `--with-deps` installs OS packages and is Ubuntu/Debian-only; this is darwin. | The browser was already installed. The audit doc's re-run instructions say `npx playwright install chromium`. |
| 10 | §16 item 6 / §8.2: *"`aria-current="page"` appears exactly once"* | Two per document on all eight routes. | Scoped to the rail, with the document's 2 asserted as well — the correction 05-07 had already made, reproduced independently. §9. |
| 11 | Task 2: capture per `00-RESPONSIVE-CONTRACT.md` §9, whose Phase 0 gate asserts full-page captures | A full-page capture ignores scroll position, so Home's state A and state B would be the same image twice. | Viewport-sized captures, with the reason recorded at the code and in §10. |
| 12 | The plan's `<interfaces>` class 3 is `841 × 768`; 05-11's audit used `673 × 620` as class 3 and `841 × 768` as a seventh "binding" case | The contract's canonical class 3 **is** 841 × 768. 05-11's extra class is why its `60svh` control fired at 6 of 7 rather than 6 of 6. | The contract's six, exactly. The discrepancy explains the difference between 05-11's numbers and these. |

---

## 18. Everything this audit found that nobody asked it to look for

| # | finding | severity |
|---|---|---|
| 1 | **D-21 — the AppBar overflows by 14px at 344px, on every route.** Upstream, inline gaps, no consumer fix. | 🔴 visible R-6 violation at the narrowest approved class |
| 2 | **Home scrolled itself 8–20px at first paint, 6 loads in 48 here and 15 in 48 on a re-run, under `no-preference` only.** Snap was the cause. **FIXED 2026-08-29** — state A's snap point dropped, 0 of 48 after, `fills`/`departs` still 6/6. | ✅ closed |
| 3 | **§13.2's *Cross-link — Photos · ← see the work* was never built.** One grep hit in the whole repo, and it is the spec row. | 🟡 a reviewed copy row missing from the site |
| 4 | **§9.2's four Lighthouse numbers were never measured, never recorded as skipped, and were cited in shipped source as existing.** | 🔴 a citation to evidence that does not exist |
| 5 | **The first gap §6.4 closed renders at 56px, not the declared 32px** — a flex `gap` and a `margin` composing. | 🟢 not a defect; §6.4's sentence is about a declaration |
| 6 | **`.hm-b { min-height: 100svh }` is 24px from being load-bearing at class 6** and is load-bearing nowhere today. | 🟢 recorded so nobody deletes it for being inert |
| 7 | **`product-peppers`'s previous and next links are both "Gadgets"** — the two-photograph category wrapping correctly, and reading like a bug. | 🟡 for the human review |
| 8 | **All five `StatusPill`s render `data-step="1"`**, so the non-colour signal distinguishes nothing — D-13, confirmed in the browser. | 🟡 upstream, already filed |
| 9 | **The lightbox controls are 32 × 32 on a fine pointer too**, not only coarse — D-17 is not a touch-only finding. | 🟡 upstream, already filed |
| 10 | **`npm run check` still carries the three pre-existing findings 05-05 logged** (7 diagnostics), none of them in this plan's files. | 🟢 pre-existing, in `deferred-items.md` |
| 11 | 🔴 **`npm test`'s "recorded intermittent" is not a flake. It is a race on the repository's own `node_modules/.vite`, and it now has a mechanism.** See below. | 🔴 a shared-mutable-state race in the test fixtures |

### 🔴 The `build-fails-loudly` intermittent, diagnosed

05-14 recorded a failure in `test/content/build-fails-loudly.node.test.ts` that it saw once, then
could not reproduce in isolation or in two full re-runs, and established was not reachable from the
gate chain. **This plan saw it twice in four full runs and caught it with a diagnosable message.**

| run | result | failing assertion |
|---|---|---|
| 1 | 1 failed / 1487 passed | *"exits 0, emits `dist/`"* — `expected 1 to be +0` |
| 2 | 1488 passed | — |
| 3 | 1488 passed | — |
| 4 | 1 failed / 1487 passed | *"the typo'd category is caught by a THIRD instrument"* — `expected 'ENOTEMPTY: directory not empty, renam…' to contain 'photoSlug'` |

Run 4's message is the whole finding:

```
ENOTEMPTY: directory not empty, rename
  '/…/T/gsd-content-build-YxHiAO/node_modules/.vite/deps_ssr_temp_275da332'
→ '/…/T/gsd-content-build-YxHiAO/node_modules/.vite/deps_ssr'
  at Object.renameSync (node:fs:1012:11)
```

**Three fixtures build in a temp sandbox and `symlinkSync` the repository's real `node_modules`
into it** — `test/content/build-fails-loudly.node.test.ts`,
`test/pipeline/record-valid.node.test.ts` and `test/pipeline/partial-failure.node.test.ts`. The
symlink is deliberate and correct (copying `node_modules` per sandbox would be unusable). But Vite's
dependency optimiser writes its cache to `<root>/node_modules/.vite/`, and through that symlink
**every sandbox writes into the one shared cache the repository itself uses**. The optimiser's final
step is an atomic `renameSync(deps_ssr_temp_XXXX → deps_ssr)`; when a second writer has populated
`deps_ssr` in between, the rename fails with `ENOTEMPTY`.

**The debris is still on disk and it corroborates the mechanism exactly.** `node_modules/.vite/`
holds four orphaned `deps_ssr_temp_*` directories. Two of them carry **1,197 entries** — a complete,
fully-optimised dependency set whose rename never happened — and their timestamps are the two
failing runs:

```
deps_ssr_temp_16cb5c1f   1197 entries   Aug 29 12:55:42   ← run 1
deps_ssr_temp_275da332   1197 entries   Aug 29 14:19:56   ← run 4
deps_ssr_temp_0cc2fa3a      1 entries   Aug 29 11:53:57   (ordinary partial debris)
deps_ssr_temp_3a53edd9      1 entries   Aug 29 14:01:06   (ordinary partial debris)
```

`deps_ssr_temp_275da332` is the directory named verbatim in run 4's error.

**This explains every observation 05-14 recorded**: green in isolation (one builder, no second
writer), green in two full re-runs (the race is a timing window, not a state), and not reachable
from the gate chain (`gate:content` does not build in a sandbox).

**Attempted reproduction, and it failed.** Running the three sandbox-building files together, three
times, gave 28/28 passed and zero `ENOTEMPTY` each time. The window needs the whole 41-file suite's
load to open, so the mechanism is evidenced by the error path and the orphaned caches rather than
by an on-demand repro. **Stated as an evidenced mechanism, not a proven one.**

**The fix, for whoever owns those fixtures — not taken here.** Give each sandbox its own optimiser
cache. Astro takes `vite: { cacheDir }`, so one line in the sandbox's config (or a `cacheDir` under
the sandbox's own temp directory) removes the shared writer entirely. **`node_modules` itself should
stay symlinked**; it is only the `.vite` sub-directory that is mutable shared state.

**Standing rule this suggests, in the family of the shared-index rule already in `STATE.md`:** *a
fixture may share a read-only dependency tree, but it must never share a directory the tool it
invokes writes to.*

---

## 18a. Two of the human walk-through's steps, taken automatically

Task 3's checklist has seven steps. Two of them are measurements rather than judgements, so they
were taken here to shorten the walk.

### Step 6 — the theme toggle, and no flash of the wrong theme (PUB-12)

```
first visit, OS prefers dark        documentElement.className = "dark"
click #pub-theme-toggle             className = ""        localStorage.theme = "light"
reload, earliest sample at 12.4ms   className = ""        ← never "dark"
                                    body background rgb(250, 250, 251) = --cream, light
click the toggle again              className = "dark"
```

**PASS.** The sample is taken on the first `readystatechange` from a script injected before any page
script, so it is the earliest observation available from inside the page. The stored preference wins
from the first frame; there is no dark flash to catch. `05-DS-FINDINGS.md` D-1 is why this is a
1,452 B inline block in the layout rather than a design-system import.

### Step 5 — ⌘P on `/resume`, and whether it prints dark (PUB-11 / OQ-5)

The theme has no `@media print` block (D-8), so CSS alone cannot un-`.dark` the page; the layout
listens for `beforeprint`. Instrumented from a listener registered before the layout's own:

```
page.pdf()                     beforeprint fires   →   className "dark" → removed
                               afterprint  fires   →   className ""     → restored
emulateMedia({ media:'print' })  no event          →   className "dark", body rgb(13, 13, 15)
```

**05-10's narrowing is confirmed:** headless Chromium's `page.pdf()` **does** fire `beforeprint`, so
the accepted OQ-5 risk is smaller than it was recorded. **And the residual is now measured rather
than described:** a print path that switches the media type *without* firing `beforeprint` — which
`emulateMedia` does, and which some headless pipelines do — renders the résumé on `#0d0d0f`. A human
pressing ⌘P fires `beforeprint` and gets a light page. The 195 KB PDF this produced is scratch and
is not committed.

**What is still a judgement, and still yours:** whether the light page that comes out reads as a
résumé or as a screenshot of a website. That is step 5's actual question and no probe answers it.

---

## 19. What needs Akhil's decision

Separated from everything above, which is settled.

| # | decision | cost of each way |
|---|---|---|
| **1** | **Cut a `2.0.0-beta.2` before Phase 8, or let the twenty-one findings wait?** D-21 is the new one and the only one visible on the shipped site. | Cutting it fixes the 344px overflow, the 40px filter pill, the 32px lightbox controls, the invisible footer underline and the swipe-to-dismiss that PUB-06 is partial without — five user-visible things in one release. Waiting ships all five. |
| **2** | **The 344px horizontal scroll (D-21) — ship it, or shorten the nav?** | Shipping it is 14px of scroll on every page at the folded cover. The only consumer-side lever is the nav labels: `photographs` is 94px of the 310px group, and `photos` would take the bar under 344. That is a copy change to a navigation label, which is yours. |
| **3** | ~~**`← see the work` on `/photos` — build it, or drop the row from §13.2?**~~ **ANSWERED: build it.** | Built. One element, one rule, and `CROSSLINK_TYPE` lifted into `src/lib/crosslink.ts` so the two halves are ONE declaration rather than two that agree today — the served `/work` half is byte-identical across the move. Asserted on the served bytes in both directions: one row on `/photos`, zero on all seven category routes. |
| **4** | **Pin the page copy, or leave it unguarded?** `/work`'s `<h1>` and sub-paragraph, `/photos`'s `<h1>`, the three Home Act-2 CTAs and `Download the PDF` are asserted nowhere; a copy edit ships silently. | Pinning is one assertion per string in files that already assert the cross-link, and it means a deliberate copy edit reds the build until you update the assertion. Leaving it means the human review is the only guard — which is what §13.2 chose for everything outside its table. |
| **5** | ~~**The intermittent snap-on-load — accept, or drop `.hm-a`'s snap point?**~~ **ANSWERED: drop it.** | Taken. `.hm-a`'s snap point and its outset are gone, `#work` is the only snap point, and §2's table was re-run: **0 of 48** under `no-preference` against 15 of 48 before, with `fills` and `departs` still 6/6 in both motion settings. |
| **6** | **`/resume`'s metric band — I decided it stays (§13). Confirm or overrule.** And separately: the Brevo metric and the Brevo first bullet make the same claim twice. | Removal is one block plus two rules. Either way, `src/schemas/resume.ts`'s comment and §11.1 need to agree with the answer. |
| **7** | **The three employment metrics as claims** — the plan asks you to read them out loud. `+15% CONVERSION` · `4K+ FRANCHISES` · `6× FASTER PIPELINES`. | Already on your deferred list as placeholders. Named here only because §12's copy walk-through puts them in front of you. |
| **8** | **The `node_modules/.vite` race — fix the three fixtures, or keep re-running?** It is the only red in `npm test` and it is now diagnosed. | The fix is a `cacheDir` per sandbox: one line in each of three fixtures, no behaviour change, and it retires a blocker that has cost two plans a re-run each. Leaving it means `npm test` fails roughly one full run in two on this machine, always in the same file, always for a reason that is not the code under test. |
| **9** | **Lighthouse before or during Phase 8?** Two UNVERIFIEDs (§7.2, §9.2) are waiting on one run, and it needs a package installed. | Doing it in Phase 8 against the deployed origin is the better measurement. Doing it now would need `lighthouse` installed on this machine, which no plan in this phase may authorise on its own. |
