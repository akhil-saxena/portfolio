---
phase: 05-public-site
plan: 15
subsystem: testing
tags: [pub-01, pub-04, pub-12, pub-13, pub-14, playwright, six-class-audit, responsive, chromium]
requires:
  - "05-06 (PublicLayout, public-shell.css, the gutter ladder in CSS)"
  - "05-05 (BREAKPOINTS, GUTTER_RUNGS, gutterAt, photoHref, photoSlug)"
  - "05-07 … 05-13 (the five public route families this audit walks)"
  - "05-14 (npm test builds with NODE_ENV=production, so dist/ is the real artefact)"
provides:
  - "test/audit/six-class.spec.ts — 156 browser assertions over 6 device classes x 6 derived routes, twice"
  - "test/audit/playwright.config.ts — a normal and a prefers-reduced-motion project"
  - "test/audit/serve-dist.mjs — the static origin, which refuses an empty root"
  - "npm run audit:public — deliberately NOT in npm test, with the reason in package.json"
  - ".planning/phases/05-public-site/05-AUDIT.md — every §16 measurement, per class, both runs"
  - "42 committed captures at the six canonical viewport sizes, all -dark-"
  - "D-21 — the AppBar overflows 344px on every route, filed in 05-DS-FINDINGS.md"
  - "a departs mutation control that can actually fail, replacing the plan's second one"
affects:
  - "06-case-studies (the harness generalises to a new route family for free)"
  - "08-cutover (QUAL-01 and QUAL-04 inherit two Lighthouse UNVERIFIEDs and a CI recommendation)"
  - "any 2.0.0-beta.2 (D-21 is new, and it is the only finding visible on the shipped site)"
tech-stack:
  added: []
  patterns:
    - "a mutation control belongs in the suite, not in a plan: a control that runs on every audit reds when it stops firing"
    - "a control must assert what it does NOT break, or two controls collapse into one"
    - "an instrument needs its own control: an absent font family must measure the fallback exactly"
    - "measure the emulation before measuring through it — isMobile moved the quantity under test by 18px"
    - "a shortfall is asserted AT the shortfall, so the upstream fix reports itself"
key-files:
  created:
    - test/audit/six-class.spec.ts
    - test/audit/playwright.config.ts
    - test/audit/serve-dist.mjs
    - .planning/phases/05-public-site/05-AUDIT.md
  modified:
    - package.json
    - .gitignore
    - .planning/phases/05-public-site/05-DS-FINDINGS.md
    - src/pages/photos/index.astro
key-decisions:
  - "The /resume metric band STAYS — measured clean at all six classes, and it was Akhil's instruction"
  - "The 160svh control is demoted to a fills control; a third control was constructed for departs"
  - "D-21 and OQ-4 are asserted at their measured shortfall, not tolerated, so the upstream fix reds the audit"
  - "The captures are viewport-sized: a full-page capture makes Home's two states the same image twice"
  - "The audit stays out of CI — a browser measurement is deterministic per machine, not per platform"
  - "The missing /photos cross-link is reported, not built: it is a design decision on a reviewed page"
  - "The page copy is not pinned: §13.2 chose which strings are contract entries and an audit must not widen it"
patterns-established:
  - "The three-control set: 60svh breaks fills, .hm-b{min-height:0;padding-block:0} breaks departs, and each asserts what it leaves alone"
  - "Anti-vacuity in a browser: assert document.title before geometry, or 36 error pages pass as 36 cells"
  - "AUDIT_ROOT points the harness at a document with none of its subjects, so 'fails on nothing' is a repeatable run"
requirements-completed: [PUB-01, PUB-04, PUB-12, PUB-13, PUB-14]
duration: 4h 5m
completed: 2026-08-29
---

# Phase 5 Plan 15: The six-class audit Summary

**Thirty of thirty-six `doc == viewport` cells pass and the six that fail are one upstream
`AppBar` bug at 344px; the departure holds at 6/6 in both motion settings; and two of the three
things this plan was handed as controls could not fail, so one was demoted and a third was built.**

## Performance

- **Duration:** ~4h
- **Tasks:** 2 of 3 complete; task 3 is the human review and is Akhil's
- **Files created:** 4 · **modified:** 4 · **captures committed:** 42
- **Commits:** `b6b2928`, `3e2d36f`, and this summary

## The eight owed measurements

| # | measurement | classes | result |
|---|---|---|---|
| 1 | `doc == viewport`, six routes | all six | **30/36.** All six routes overflow by **14px at 344** — D-21 |
| 2 | State A fills, one viewport departs | all six, both runs | **6/6 and 6/6**, twice |
| 3 | Act 2 fits at 841 × 768 | class 3 | **PASS** — résumé heading bottom **696** of **768**, 72px clear |
| 4 | `#work`'s `scroll-snap-align` (the Astro scoping trap) | all six | **`start` 6/6.** Trap does not occur |
| 5 | The `Link` colours, in a browser | all six | nav `rgb(191,191,197)` ✅ · footer underline **`rgba(0,0,0,.25)`** 🔴 |
| 6 | Three font families, Playfair ≠ Georgia | all six | **3 families, 4 files**, **1077.89 vs 1254.06 px** |
| 7 | The 44px hit floor | five coarse | nav **44** ✅ · footer **44** ✅ · pill **40** 🔴 · lightbox **32** 🔴 |
| 8 | `aria-current="page"` | eight gallery routes | **1 in the rail, 2 in the document** |

Full tables, both motion settings, in `05-AUDIT.md`.

## The two mis-stated controls, and what replaced them

05-11 warned that both were wrong. It was right about the first and understated the second.

| control | the plan said | measured | disposition |
|---|---|---|---|
| `.hm-a { min-height: 60svh }` | must break **fills** | breaks fills **6/6** — but only with a **two-sided** `fills`. Breaks `departs` **0/6** | ✅ kept, as the `fills`-from-below control |
| `.hm-a { min-height: 160svh }` | must break **departs** | **breaks `departs` at 0 of 6 under `reduce`.** Its `no-preference` failures are proximity snap pulling `scrollTo(0, 900)` back to **665** | ⚠️ **demoted** to the `fills`-from-above control |
| `.hm-b { min-height: 0; padding-block: 0 }` | *(did not exist)* | breaks **`departs` at class 6** in both runs, `scrollMax` 727 against a peek bottom of 767, and leaves **`fills` true 6/6** | ✅ **built here**, the real `departs` control |

**Why the second one cannot work.** The peek grid sits near the *top* of state A and the prompt is
pinned to the bottom by `margin-block-start: auto`, so a taller state A moves the **prompt** down
and leaves the photographs where they were. And because the prompt is *below* the grid, any mutation
that pushes the photographs past the fold breaks `fills` in the same breath — measured with
`.hm-tile { aspect-ratio: 1/2 }`, which breaks both at 6/6. **The only way to break `departs` alone
is the document running out of scroll**, which is §6.2's own documented failure.

**A finding that fell out of building it:** `.hm-b { min-height: 100svh }` is **no longer
load-bearing at any class**. Removing it alone leaves `departs` true 6/6; at class 6 it clears by
**24px**. The padding has to go too before the departure fails. Recorded so nobody deletes the guard
for being inert — 24px is the margin it has left.

All three controls are **permanent test cases**, injected at runtime with `addStyleTag` at the same
(0,1,0) specificity, later in document order, no `!important`. That is a narrower claim than 05-11's
source plant and it is stated as such at the code.

## The `/resume` metric band — decided

**It stays.** Measured first: 116 × 17 at every class, never wrapping, never colliding, never
overflowing; right-aligned at classes 3–6 and stacked under the identity below the 673px rung,
exactly as 05-10 predicted. Value `rgb(176,176,182)` = `--ochre-d-strong` and label
`rgb(168,168,174)` = `--ink-3` — identical to `/work`'s band, so it reads as one vocabulary.

Three reasons, in order of weight: it was an instruction from the person the site is for, and a
structure list is a weaker authority than that; it is geometrically clean everywhere; and removal is
one block plus two rules with nothing depending on it, so keeping it costs nothing irreversible.

**Residual:** `src/schemas/resume.ts`'s comment and §11.1 still scope the field to `/work`. That is a
documentation disagreement to fix in whichever direction Akhil takes.

## Touch targets, at the coarse-pointer classes

| control | height | floor | finding |
|---|---:|---:|---|
| AppBar link | **44** | 44 | ✅ `css/appbar.css:120` |
| Footer link | **44** | 44 | ✅ `primitives.css:5763` |
| Filter pill | **40** | 44 | 🔴 OQ-4 / D-3, upstream |
| Lightbox close / prev / next | **32** | 44 | 🔴 D-17, upstream, **and on a fine pointer too** |

`.ds-atom-lightbox-backdrop` computes **`touch-action: pan-y`** — D-16's second half, confirmed in
Chromium at 390 × 844. That is why a consumer cannot add swipe-to-dismiss and why **PUB-06 is
partial**.

Both shortfalls are asserted **at their shortfall** (`=== 40`, `=== 32` is recorded; `=== 14` for
D-21), so the day `2.0.0-beta.2` fixes them the audit fails and says so.

## What is still unguarded, in copy

Every §13.2 row and every visible page string was searched for, literally, across `test/` and
`scripts/`. Three apparent hits were opened and discarded as false positives (a git-author fixture,
unrelated script prose, an `aria-label`).

**Asserted:** `SCROLL FOR THE WORK ↓` · *see the photographs →* · `← All photographs` · both 404
lines · the derived counts and the derived count line.

**Not asserted:** `ALL WORK →` · `RÉSUMÉ →` · `View résumé` · `Download the PDF` · `The work` ·
`The résumé` · `/work`'s `<h1>` *"Things I design and build."* and its sub-paragraph · `/photos`'s
`<h1>` · the empty-category copy. Home's `<h1>`, subtitle and intro come from `home_config.json` and
are **deliberately** unpinned — pinning CMS content would red the build when Akhil edits his own
subtitle.

**Not pinned by this plan, and that is a boundary rather than an omission:** §13.2 deliberately
enumerates which strings are contract entries; quietly extending that list from an audit would widen
a reviewed contract without review. It is on the decision list with its exact cost.

### 🔴 One contract copy row was never built

§13.2's **Cross-link — Photos · *← see the work*** does not exist. `grep -rn "see the work"` across
the entire repository returns **one** line: the spec row itself. `/work` ships its half, asserted
character for character. The pair was meant to be a pair, and no gate caught it because §13.2 is
prose.

## Findings nobody asked for

| # | finding |
|---|---|
| **D-21** | 🔴 **The `AppBar` overflows 344px by 14px on every route.** Two unnamed `<div>`s with **inline** `gap: 28px` / `18px` and `min-width: auto` need 374px minimum. Not a font artefact (355 before `fonts.ready`, 358 after); absent at 360 and 374. The theme toggle is the element pushed off-screen. **No consumer fix exists without `!important`.** Filed as the twenty-first design-system finding, and the only one visible on the shipped site. |
| **snap-on-load** | 🔴 Home **self-scrolls 8–20px at first paint on 6 of 48 loads** under `no-preference`, across five of six classes, and **0 of 48** under `reduce`. Snap is the cause. 05-11 measured one load per class and could not see a 12.5% intermittency. |
| **§9.2** | 🔴 **Four Lighthouse numbers were owed by 05-12's plan, never taken, never recorded as skipped — and `src/pages/photos/index.astro` cited `05-12-SUMMARY.md` as holding them.** That file contains "Lighthouse" zero times. **Comment corrected**; the UNVERIFIED goes to Phase 8. Measured instead: `client:idle` defers **hydration, not download** — all three chunks are requested at 25–27 ms, before `domContentLoaded` and ~500 ms before `load`. |
| **`npm test`** | 🔴 **The recorded intermittent is a race on the repository's own `node_modules/.vite`, and it now has a mechanism.** Three fixtures `symlinkSync` the real `node_modules` into their sandbox, so every sandboxed Vite optimiser writes the **shared** cache and races on `renameSync(deps_ssr_temp_X → deps_ssr)`. Two orphaned temp directories with **1,197 entries each** sit on disk carrying the timestamps of the two failing runs, one of them named verbatim in the error. Could **not** be reproduced on demand with the three files alone (28/28 × 3), so it is stated as an evidenced mechanism, not a proven one. Fix: a `cacheDir` per sandbox. |
| **§6.4's first gap** | 🟢 renders at **56px**, not the declared 32 — `.hm-work`'s 24px flex gap composes with the 32px margin. Not a defect; §6.4's sentence is about a declaration and a reader will take it as a measurement. |
| **`product-peppers`** | 🟡 previous **and** next both read *"Gadgets"* — a two-photograph category wrapping correctly, and reading like a bug. |
| **StatusPill** | 🟡 all five render `data-step="1"` — D-13 confirmed in the browser; the non-colour signal distinguishes nothing. |
| **PUB-12** | ✅ **No dark flash.** Toggle to light, reload: the earliest in-page sample at 12.4 ms already reads light, body `rgb(250,250,251)`. |
| **OQ-5** | ✅ `page.pdf()` **does** fire `beforeprint` (05-10's narrowing confirmed). 🟡 `emulateMedia({media:'print'})` does **not**, and prints on `#0d0d0f`. A human pressing ⌘P is safe. |

## Twelve defective premises in the plan

Full table with the replacement for each in `05-AUDIT.md` §17. The load-bearing ones:

1. **`key_links` says the six viewports come from `src/lib/layout-ladder.ts`, pattern `BREAKPOINTS`.**
   `BREAKPOINTS` is `[375, 673, 1024]` — gutter rungs, not viewports. Replaced with a link that is
   load-bearing: `gutterAt(width)` asserted against Chromium's computed `--pub-gutter` at every class
   (16/24/32/32/48/48, 6/6 correct) and the matrix asserted to straddle every rung.
2. **§16.2's "State A's bottom edge *equals* `svh`".** It exceeds it by 3–21px by design —
   `min-height`, never `height`. An equality would red correct code at class 1 and be "fixed" by
   clipping.
3. **"a `160svh` mutation must break departs"** — third correction this control has taken, and this
   time with the mechanism: it breaks `departs` at 0/6 on geometry.
4. **"each control broke a DIFFERENT assertion"** — both of the plan's break `fills`.
5. **§16.2's "leaves `photosBottom = 0`"** — it leaves −119 to −433. Equality unreachable.
6. **"§9.2 already answered in 05-12; carry the number forward"** — it was never answered.
7. **"The measurements, per §16"** — only six of the plan's eight are §16 items; §16.7 and §16.8 are
   absent from the plan and were chased to 05-14 and 05-05, where they were actually closed.
8. **"state the reason in a comment next to it"** in `package.json` — JSON has no comments. A
   sibling `"//audit:public"` key carries it.
9. **`npx playwright install --with-deps chromium`** — `--with-deps` is Ubuntu/Debian-only.
10. **§16 item 6's "exactly once"** — two per document, as 05-07 had already recorded.
11. **§9's full-page capture contract** — a full-page capture makes Home's state A and state B the
    same image twice.
12. **Class 3.** The plan's 841 × 768 is the contract's canonical class 3; 05-11 used 673 × 620 and
    kept 841 × 768 as a seventh case, which is why its `60svh` control fired at 6/7 and this one
    fires at 6/6.

## Contradictions with the UI-SPEC

| where | the spec says | measured |
|---|---|---|
| §16.2 | state A's bottom **equals** `svh`, and `photosBottom = 0` | `>= vh` by 3–21px; `photosBottom` −119 to −433 |
| §16.2 | `160svh` breaks `departs` | 0 of 6 on geometry |
| §16 item 6 / §8.2 | `aria-current="page"` **exactly once** per gallery page | once in the rail, **twice** in the document |
| §4.6b | "Phase 5 uses `variant='default'` in the footer, which is stylesheet-only and therefore correct" | **that escape does not exist** — `Footer` hardcodes `variant="footer"`; the underline is `rgba(0,0,0,.25)` on `#0d0d0f` |
| §6.2 | `--ds-appbar-h` is "closed upstream — do not re-measure" | **wrong for the third time.** The bar renders 69 coarse / 57 fine; the declared 47px is 10px short and unreadable from a sibling anyway (D-2) |
| §6.4 | both dead gaps "become `--space-8` (32px)" | declared 32 both; the first **renders 56** |
| §13.2 | Cross-link — Photos · *← see the work* | **does not exist** |
| §13.2 / §13.3 | `ALL · 39` | renders `All · 40`, derived — the spec's literal is stale, the site is right |
| §9.2 | the `client:idle` question is answered in 05-12 | it is not, anywhere |
| §7.2 | `unsized-images` needs "a real Lighthouse run before QUAL-01" | none was done in this phase |

## Every gate proven able to fail

| walk-through | result |
|---|---|
| **Given no artefact** — `serve-dist.mjs` at a root with no `index.html` | **exit 1**, naming the path and why an empty root would measure a blank page six times |
| **Given a 200 that carries none of the subjects** (`AUDIT_ROOT` at `<p>nothing here</p>`) | **25 failed, 0 passed**, each naming its own subject: `.hm-a is not in the document` · `#work or .hm-a` · `.ds-atom-appbar a[href="/work"]` · `the page has no <h1>` · `/work did not render a titled document` · `class 1 carries D-21's measured 14px overflow` |
| **On correct code** | **156 passed, 0 failed**, 6 skipped (the reduce run's captures) |
| **The three mutation controls** | permanent, and each asserts what it must NOT break |

That vacuity run also found a defect in the harness: the `aria-current` test read an attribute off a
locator that resolved to nothing and burned the full 60-second timeout instead of saying "there is
no current pill". The count is now asserted before the attribute is read.

## Verification

```
npm run build            exit 0   (astro check + astro build + gate:content, eleven gates)
npm test                 1488 / 1488 passed
npm run audit:public     156 passed · 6 skipped · 0 failed · 2.6 min
task 2's verify          OK: 42 screenshots
npx biome check test/audit/   clean
npm run check            exit 1 — the SAME three pre-existing findings 05-05 logged
                         (7 diagnostics), none in this plan's files. Out of scope, already
                         in deferred-items.md
```

`npm test` failed twice in five full runs, both times in
`test/content/build-fails-loudly.node.test.ts`, both times for the `node_modules/.vite` race above,
and passed 1488/1488 three times including the final run before each commit.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] `test/audit/serve-dist.mjs` is a fourth file, not in `files_modified`.**
Playwright's `webServer` takes a *command*, not a function, so the static origin cannot live inside
`playwright.config.ts` without being started once per worker process and racing itself on the port.
`npx astro preview` was the alternative and was rejected: it boots wrangler, reads `wrangler.jsonc`,
binds R2 and the analytics dataset, and can warm a cache — four variables in a measurement harness,
none of them under measurement. Reasoning at the file head. **Commit `b6b2928`.**

**2. [Rule 2 — Missing critical] `AUDIT_ROOT` added to the config.** One env var, for one purpose:
pointing the harness at a document carrying none of its subjects, so "fails on nothing" is a
repeatable run rather than a claim. **Commit `b6b2928`.**

**3. [Rule 2 — Missing critical] `test-results/` and `playwright-report/` added to `.gitignore`.**
`npm run audit:public` writes error-context artefacts there on any failure. **Commit `b6b2928`.**

**4. [Rule 2 — Missing critical] D-21 added to `05-DS-FINDINGS.md`,** with the browser
confirmations of D-4 and D-17 folded into their rows and the count corrected to twenty-one. Task 3
asks Akhil to decide whether a `2.0.0-beta.2` is worth cutting *from that file*; deciding it from a
list missing the only finding visible on the shipped site would be deciding on the wrong evidence.
**Commit `3e2d36f`.**

**5. [Rule 1 — Bug] The `client:idle` comment in `src/pages/photos/index.astro` cited evidence that
does not exist.** It said the four Lighthouse numbers are in `05-12-SUMMARY.md`; that file contains
the word zero times, and so does every other summary in the phase. Comment-only change: it now
states that §9.2 is still open, names Phase 8 as the owner, and carries the measurement that *could*
be taken here. **Commit `3e2d36f`.**

### Deliberately not done

- **The `/photos` cross-link was not built.** Where it goes and what it looks like is a design
  decision on a reviewed page. Reported with the precedent (`/work`'s `.wk-crosslink-row`).
- **The page copy was not pinned.** §13.2 chose which strings are contract entries; widening that
  from an audit would extend a reviewed contract without review.
- **D-21 was not worked around.** The only lever is `!important` reaching past a component into its
  unnamed internals, which the Core Value forbids; clipping the bar would hide the theme toggle.
- **The snap-on-load intermittency was not fixed.** The candidate fix changes a reviewed mechanism.
- **The `node_modules/.vite` race was not fixed.** Three fixtures outside this plan, and the fix
  needs the owner's judgement about where each sandbox's cache should live.
- **`STATE.md` and `ROADMAP.md` were not touched**, per the brief.
- **`data/*.json` was read, never written.**

## For Phase 8

- **Two UNVERIFIEDs wait on one Lighthouse run against the deployed origin:** §7.2's
  `unsized-images` and §9.2's `client:idle` vs `client:load`. Neither needs this harness. A package
  install was not something this plan could authorise on its own.
- **The recommendation is that this audit stays out of CI.** A browser measurement is deterministic
  per *machine*, not per platform — libvips, font rasterisation and sub-pixel layout all diverge on
  darwin/arm64 against ubuntu/x64, which are exactly the things measured. A tolerance wide enough to
  survive a platform change is wide enough to miss the 14px this audit found. **One exception is
  defensible:** `scrollWidth === innerWidth` at 344px on one route is integer-valued, has no
  sub-pixel component, and is the one thing a platform cannot legitimately move.
- **Run `npm run audit:public` as a release step before cutover.** It costs three files, no new
  dependency, and one script key.
- **The pinned-at-shortfall assertions are the notification mechanism** for the upstream fixes:
  `pill === 40` and `overflow === 14` fail the day `2.0.0-beta.2` lands.

## Self-Check: PASSED

```
FOUND: test/audit/six-class.spec.ts             (1013 lines; min_lines 80)
FOUND: test/audit/playwright.config.ts
FOUND: test/audit/serve-dist.mjs
FOUND: .planning/phases/05-public-site/05-AUDIT.md
FOUND: 42 captures, 42/42 matching the contract regex, 0 -light-
FOUND: b6b2928  feat(05-15): the six-class harness
FOUND: 3e2d36f  docs(05-15): the audit
```

No commit in this plan deleted a tracked file.
