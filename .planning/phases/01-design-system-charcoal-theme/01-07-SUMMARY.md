---
phase: 01-design-system-charcoal-theme
plan: 07
subsystem: design-system
tags: [lightbox, g-14, ds-07, criterion-5a, srcset, swipe, live-region, pointer-events, mutation-battery]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 06
    provides: the packaged consumable surface this component ships inside; nothing in 01-07 depends on its exports map
provides:
  - "$DS/src/overlays/Lightbox/index.tsx — backdrop-click close, srcSet/sizes passthrough, pointer-event swipe navigation, polite slide announcements"
  - "LightboxItem gains srcSet?: string and sizes?: string — the responsive-image surface the 39-photo gallery needs"
  - "A ResponsiveGallery story carrying srcSet, sizes and captions across three slides"
  - ".ds-atom-lightbox-backdrop gains touch-action: pan-y, inside the DS atom: Lightbox banner section"
  - "The measured fact that DSPortal-mounted panels are invisible to npm run test:a11y"
affects: [01-20 visual baselines + a11y sweep, Phase 5 photo gallery, any future portal-mounted component's a11y coverage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "setPointerCapture on pointerdown retargets the compatibility mouse events to the capturing element, so a child button's onClick never fires and every click reports the capturing element as its target — measured in Chromium, and the reason this component does not use it"
    - "A mutation battery needs POSITIVE cases: two no-op mutations exposed a battery whose every run failed because --reporter=basic does not exist in Vitest 4 and threw while loading"
    - "DSPortal mounts to document.body; the storybook test-runner scopes axe to #storybook-root; therefore test:a11y scans no portaled panel at all — for Lightbox, Modal, Sheet, BottomSheet, Tooltip, Popover, HoverCard and Toast alike"
    - "axe colour-contrast readings taken during an opacity animation sample a half-composited background and report false violations; the test-runner's preVisit freeze is load-bearing, not cosmetic"

key-files:
  created: []
  modified:
    - ../design-system/src/overlays/Lightbox/index.tsx
    - ../design-system/src/overlays/Lightbox/Lightbox.test.tsx
    - ../design-system/src/overlays/Lightbox/Lightbox.stories.tsx
    - ../design-system/src/primitives.css

key-decisions:
  - "setPointerCapture, which the plan names explicitly, is NOT used. Measured in Chromium: capturing on pointerdown suppresses the close button's onClick entirely and makes every click report the backdrop as its target, which defeats both of the plan's own backdrop-close conditions."
  - "Backdrop close needs THREE conditions, not the plan's two. A horizontal drag that both starts and ends on the backdrop emits a click whose target IS the backdrop and whose pointerdown target is ALSO the backdrop — measured — so without a travel check one swipe would navigate and close at once."
  - "The local showNav guard in the swipe path was deleted after a mutation run proved it dead code: goPrev/goNext already own the one-item rule, which is exactly why the plan said to reuse them."
  - "img draggable={false}: Chromium starts its native image drag on a mouse or pen press and cancels the pointer sequence before pointerup, so without it the swipe was touch-only on the overlay's largest target."

requirements-completed: [DS-07]

# Metrics
duration: 105 min
completed: 2026-08-19
---

# Phase 1 Plan 07: Lightbox — Backdrop Close, srcset, Swipe, Announcements Summary

**All four G-14 sub-gaps are closed and each is verified by behaviour in a real browser, not by
the presence of a prop — but the two load-bearing results are corrections to the plan: the
`setPointerCapture` it specifies would have silently killed the close button, and its
two-condition backdrop guard would have let one swipe navigate and close in the same gesture.
Both were caught by measuring Chromium before writing the code. The third result is that
`npm run test:a11y` scans no portaled panel at all, so its green tick on the Lightbox stories
had never covered a single line of this component's markup.**

## Performance

- **Duration:** ~105 min (2026-08-19 09:56 → 11:41 IST)
- **Tasks:** 2 of 2
- **Files:** 0 created, 4 modified
- **Suite:** **1564** tests / 115 files, all passing (1539 → 1564, **+25**)
- **Lightbox unit tests:** 19 → **44**
- **Mutation cases executed:** **20** (7 + 11 + the polite gate in both directions)
- **Negative controls executed:** every one of them; **2 fixed a real gap in my own tests**

---

## What shipped

| Capability | Where | Evidence |
|---|---|---|
| Backdrop-click close | `onBackdropClick`, three conditions | Chromium: `click empty backdrop → open=false`; `click the image → open=true` |
| `srcSet` / `sizes` | `LightboxItem`, passed to `img` | Chromium: `srcset=true sizes=100vw`, `img.currentSrc` resolved to a 464-char candidate |
| Swipe navigation | `onPointerUp`, native pointer events, no library | Chromium: `swipe left 160px → Image 3 of 3` |
| Slide announcements | `role="status" aria-live="polite"` region | Chromium: `text="Image 2 of 3. Harbour wall"` |

### The chosen thresholds, and the case each defends

| Constant | Value | Rejects |
|---|---:|---|
| `SWIPE_MIN_DISTANCE_PX` | **44** | A tap. A tap is a zero-length swipe, so without a distance floor every touch of the overlay navigates. 44px is the platform minimum touch-target edge — one deliberate finger-width of travel. |
| `SWIPE_HORIZONTAL_DOMINANCE` | **1.5** | A vertical scroll or drag-to-dismiss that drifts sideways. Comparing raw absolute deltas (ratio 1) still fires on a 46-degree drag, which reads as the overlay stealing the gesture. |
| `BACKDROP_TAP_SLOP_PX` | **10** | A completed swipe over empty backdrop. Measured in Chromium, that gesture emits a click whose target IS the backdrop and whose pointerdown target is ALSO the backdrop, so both of the plan's two conditions pass and the overlay would navigate and close at once. |

Verified against the real thresholds in Chromium: a **30px** drag does nothing and leaves the
overlay open; a **40×300px** vertical drag does nothing and leaves it open; a **160px** horizontal
drag navigates.

### The exact announcement string

```
Image 2 of 3. Harbour wall
```

Format is `Image {position} of {total}. {alt}`, one-based. The plan's sketch (`Image 2 of 36.
Cliffs at dawn.`) carried a trailing period; it is omitted, because `alt` is consumer text and any
alt already ending in punctuation would render `… dawn..`. The sentence break after the total is
what a screen reader pauses on either way.

Read from the live region in Chromium across a real navigation sequence:

| Action | Live region text | `img` alt |
|---|---|---|
| open | `""` | Cliffs at dawn |
| ArrowRight | `Image 2 of 3. Harbour wall` | Harbour wall |
| swipe left 160px | `Image 3 of 3. Low tide` | Low tide |
| swipe right 160px | `Image 2 of 3. Harbour wall` | Harbour wall |
| drag 30px | `Image 2 of 3. Harbour wall` *(unchanged)* | Harbour wall |
| vertical drag 40×300 | `Image 2 of 3. Harbour wall` *(unchanged)* | Harbour wall |

The live region's computed style, read in the browser rather than asserted from source:

```
display=block  visibility=visible  width=1px  clip-path=inset(50%)
role=status    aria-live=polite    text=""   (on first open)
```

`display: block` and `visibility: visible` are the point: `.ds-visually-hidden` takes the region
out of the picture without taking it out of the accessibility tree.

## `test:a11y` — the number, and why the number alone is not the claim

```
Test Suites: 82 passed, 82 total
Tests:       482 passed, 482 total
Time:        19.267 s
A11Y_EXIT=0

PASS browser: chromium src/overlays/Lightbox/Lightbox.stories.tsx
  ● Console
    console.log
      No accessibility violations detected!
```

**That green does not cover this plan's markup, and would have been an inert gate.**
`DSPortal` mounts to `document.body`; `.storybook/test-runner.ts` calls
`checkA11y(page, "#storybook-root")`. Measured directly:

```
panel inside #storybook-root? : false   (parent: BODY)
```

Every Lightbox story also opens its overlay only on a button click, so the runner visits a page
whose story root contains one `<Button>` and nothing else. So I ran axe myself, over the **whole
document**, with the panel **open**, applying the same animation freeze `preVisit` applies:

| Story | whole-document violations, panel open, animations frozen |
|---|---:|
| `SingleImage` | **0** |
| `Gallery` | **0** |
| `WithCaption` | **0** |
| `DarkMode` | **0** |
| `ResponsiveGallery` *(new)* | **0** |

Caption contrast, from axe's own pass data: `#ffffff` on `#141313` = **18.54:1** against a 4.5:1
requirement.

### The freeze is load-bearing, and I proved it by getting it wrong first

My first whole-document run — **without** the freeze — reported `color-contrast (serious)` on
`.ds-atom-lightbox-caption`, at 2.51 and then 3.45 on two runs, with backgrounds `#a09e9c` and
`#878684`. Those are mid-`lightboxFade` greys: axe sampled a half-composited backdrop. With the
freeze applied the same node passes at 18.54:1. `test-runner.ts`'s comment — "axe stops sampling
colours from a half-faded element" — is a measurement, not a nicety, and a probe that skips it
manufactures serious-severity false positives.

## Measurements that changed the implementation

Both were taken in Chromium via Playwright **before** any component code was written.

### 1. `setPointerCapture` on pointerdown destroys the plan's own backdrop-close design

| gesture | capture=none | capture=always |
|---|---|---|
| click the close button | `BUTTON ONCLICK FIRED`, click target=`btn` | **`BUTTON ONCLICK FIRED` absent**, click target=`backdrop` |
| click the image | click target=`img` | click target=`backdrop` |

With capture on, the close button stops working entirely **and** every click reports the backdrop
as its target — so a `target === currentTarget` guard would fire on a click on the image. The plan
names `setPointerCapture` explicitly; it is not used, and the component's own comment records why.
The backdrop is `position: fixed; inset: 0`, so every pointer event inside the window already
bubbles to it and capture buys nothing.

### 2. Two drag gestures that the plan's two conditions do not reject

```
[drag from a non-draggable image -> release over backdrop]
   pointerdown target=img       pointerup target=backdrop     click target=backdrop
[horizontal drag entirely on the BACKDROP]
   pointerdown target=backdrop  pointerup target=backdrop      click target=backdrop
```

The first is the case the plan anticipated — `target === currentTarget` alone passes it, which is
why pointerdown-origin tracking exists. The second passes **both** of the plan's conditions, and is
exactly the swipe gesture task 2 adds. Hence the third condition.

## Mutation batteries — 20 cases, all reconciled

Every guard was mutated, the suite re-run, and the file restored and SHA-checked.

### Battery 1 — backdrop close and srcset (7 cases)

| id | mutation | expect | observed | test that went red |
|---|---|---|---|---|
| M1 | drop the click-time target guard | RED | RED | gesture begins on backdrop, click lands on a child |
| M2 | drop the pointerdown-origin factor | RED | RED | near-stationary press slipping off the image |
| M3 | drop the travel/tap-slop factor | RED | RED | drag starting and ending on the backdrop |
| M4 | stop passing `srcSet` | RED | RED | srcSet and sizes reach the img |
| M5 | coerce absent `srcSet` to `""` | RED | RED | no empty srcset attribute |
| **P1** | **positive control** — slop 10 → 11px | GREEN | GREEN | — |
| **P2** | **positive control** — reorder the two `&&` operands | GREEN | GREEN | — |

### Battery 2 — swipe and announcements (11 cases + the gate)

| id | mutation | expect | observed |
|---|---|---|---|
| N1 | drop the 44px distance floor | RED | RED |
| N2 | drop the dominance check | RED | RED |
| N3 | drop the one-item rule in `goNext` | RED | RED |
| N4 | invert the swipe direction | RED | RED |
| N5 | stop recording the announced slide | RED | RED |
| N6 | render the live region only after a navigation | RED | RED |
| N7 | speak only the alt, no position or total | RED | RED |
| N8 | zero-based numbering | RED | RED |
| N9 | drop the reset-on-close | RED | RED |
| **P3** | **positive control** — floor 44 → 45px | GREEN | GREEN |
| **P4** | **positive control** — swap two independent early returns | GREEN | GREEN |
| G-polite | flip `polite` → the interrupting level | gate FAILs | **gate FAILed** |

`index.tsx` SHA before battery 2 `a464ad9dff0a`, after restore `a464ad9dff0a` — **byte-identical**,
and it is the same SHA now on disk in commit `c198985`. **The bytes that were mutation-tested are
the bytes that were committed.**

### Three things the batteries caught that review would not have

1. **The battery itself was inert on its first run.** All five negative cases reported RED — and so
   did both positive controls, and so did the *restored* file at a byte-identical SHA. Cause:
   `--reporter=basic` does not exist in Vitest 4; it is loaded as a custom reporter module and
   throws, so every run exited non-zero regardless of the tests. **Only the positive controls
   exposed this** — the negative results were indistinguishable from a working battery. This is
   02-06's failure mode reproduced exactly.

2. **M2 was GREEN: the pointerdown-origin guard had no test that isolated it.** The long
   drag-from-image case is already caught by the travel check. The gesture only that guard rejects
   is a *near-stationary* press that begins on the image and releases 2px onto the backdrop — a tap
   at the image's edge. Added as a test; M2 now bites.

3. **N3 was GREEN: the local `showNav` guard in the swipe path was dead code.** `goPrev`/`goNext`
   already return early on a one-item set, which is precisely why the plan told me to reuse them.
   The redundant line was **deleted** rather than kept as untestable defence, and N3 retargeted to
   `goNext`'s own guard, where it bites.

## The comment-strip is load-bearing here, and demonstrably so

The plan requires the reasoning for choosing `polite` to be recorded, and gates on the rejected
level being absent from the code. Both are satisfied because the gate strips comments first:

```
unstripped occurrences in index.tsx : 3
naive gate verdict                  : WOULD FAIL (false positive on its own comment)
protocol gate (comments stripped)   : OK polite live region, not assertive
```

The paragraph in `index.tsx` names the rejected level and cites G-13's two-regions complaint. A
gate that grepped the raw file would have failed on the documentation it asked for.

## CSS — inside the banner, verified by the splitter, not by a grep

`touch-action: pan-y` was added to `.ds-atom-lightbox-backdrop`. Rather than grep the source for
position, the split was run in-process and the slice inspected:

```
touch-action:pan-y occurrences in the lightbox slice: 1
touch-action:pan-y occurrences in every OTHER slice:  1   (pre-existing, another component)
split-css: OK — 74 files, round-trip byte-exact
```

Computed in Chromium on the open panel: `backdrop computed touch-action : pan-y`.

## Accomplishments

- **Criterion 5a is met.** Backdrop close, `srcset`, swipe and screen-reader announcements, each
  demonstrated by behaviour in Chromium and each covered by a mutation-verified test.

- **G-14 closed with all four sub-gaps addressed, none deferred**, and G-13's three named defects
  avoided: the announcement speaks a human-readable `alt` rather than an identifier, carries
  position **and** total, and never announces a move that did not happen.

- **Two plan defects caught before they shipped**, both by measuring the platform rather than
  trusting the instruction — and one of them (`setPointerCapture`) would have produced a Lightbox
  whose close button silently did nothing.

- **The always-dark D-350 invariant is intact.** No `:root.dark` rule was added; the only CSS
  change is one `touch-action` declaration. 01-20's snapshot parity has nothing new to reconcile
  beyond the one added story.

- **All four sibling gates green**, re-run on the committed tree: `npm test` 115 files / **1564**
  tests, `npm run check` 347 files no fixes applied, `npm run typecheck` both projects,
  `npm run css:check` 74 files byte-exact.

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 — backdrop close + srcset | `2458dd4` | `feat(lightbox): backdrop-click close and srcset passthrough` (+286 across 2 files) |
| 2 — swipe + announcements | `c198985` | `feat(lightbox): swipe navigation and slide announcements` (+415 across 4 files) |

Branch `charcoal-theme` in `../design-system`, now **14 commits ahead** of that repo's `main`.
Author `Akhil Saxena <saxena.akhil42@gmail.com>`. **No AI attribution** — verified on both commits
(`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` → `0`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `setPointerCapture`, which the plan specifies, breaks the close button**

- **Found during:** Task 1, pre-implementation measurement.
- **Issue:** The plan's action says to implement swipe with "`pointerdown` / `pointerup` plus
  `setPointerCapture`". Measured in Chromium, capturing on pointerdown retargets the compatibility
  mouse events to the capturing element: the close `IconButton`'s `onClick` **never fires**, and
  every click — including one on the image — reports the backdrop as its target, defeating the
  plan's own `e.target === e.currentTarget` condition.
- **Fix:** capture is not used. The backdrop is `position: fixed; inset: 0`, so pointerup already
  bubbles to it from anywhere in the window; `onPointerCancel` resets the gesture state. The
  measurement is recorded in the component's comment so the next reader does not re-add it.
- **Files modified:** `src/overlays/Lightbox/index.tsx`
- **Commit:** `2458dd4`

**2. [Rule 2 — Correctness] Backdrop close needs a third condition or one swipe both navigates and closes**

- **Found during:** Task 1, second Chromium probe.
- **Issue:** The plan specifies two conditions. A horizontal drag that both starts and ends on the
  backdrop — the exact gesture task 2 adds — produces `pointerdown target=backdrop`,
  `click target=backdrop`. Both conditions pass, so the swipe would navigate **and** close.
- **Fix:** a third condition, total pointer travel ≤ `BACKDROP_TAP_SLOP_PX` (10). Covered by two
  tests and by mutation M3.
- **Commit:** `2458dd4`

**3. [Rule 2 — Correctness] `img draggable={false}`**

- **Found during:** Task 1 probe; applied in task 2 where swipe made it load-bearing.
- **Issue:** Chromium begins its native image drag on a mouse or pen press over an `img`, which
  cancels the pointer sequence before `pointerup`. The measured log for a default-draggable image
  shows `pointerdown` and then **nothing** — no pointerup, no click. The swipe would therefore have
  been touch-only on the overlay's single largest target, and the plan's own stated reason for
  choosing pointer events ("touch, pen and mouse-drag in one code path") would not have held.
- **Fix:** `draggable={false}` on the lightbox image. Verified: `swipe left over the IMAGE →
  Image 3 of 3. Low tide`.
- **Commit:** `c198985`

**4. [Rule 1 — Bug] Deleted the redundant `showNav` guard in the swipe path**

- **Found during:** Task 2 mutation battery (N3 came back GREEN).
- **Issue:** The plan says "Guard on `showNav`". A local guard in `onPointerUp` is unreachable
  behaviour: `goPrev`/`goNext` already return early when `showNav` is false, which is exactly why
  the plan told me to reuse them. Shipping it would have meant a line no test can cover.
- **Fix:** line deleted; the required behaviour is unchanged and still tested ("a swipe on a
  single-item Lightbox does nothing"), and N3 was retargeted to `goNext`'s guard, where it bites.
- **Commit:** `c198985`

**5. [Rule 3 — Blocking] Two Biome rules block the specified markup**

- **Found during:** Task 1 and task 2 `npm run check`.
- **Issue:** `lint/a11y/useKeyWithClickEvents` rejects `onClick` on the backdrop div;
  `lint/a11y/useSemanticElements` rejects `role="status"` on a div, wanting `<output>`. Biome's
  pre-commit hook blocks both.
- **Fix:** two `biome-ignore` suppressions, each stating a reason rather than silencing:
  the keyboard equivalent of a backdrop click is Escape, which `useDismiss` owns as a stack (a
  local `onKeyDown` would be precisely the second Escape path that hook exists to prevent); and
  `<output>` is a form-association element whose live-region behaviour is the least consistently
  supported of the announcement patterns, while `<output role="status">` trips
  `noRedundantRoles` — measured, both spellings were tried.
- **Commit:** `2458dd4`, `c198985`

**6. [Rule 3 — Blocking] The plan's single commit message split across two per-task commits**

- **Issue:** The plan names one message, `feat(lightbox): backdrop close, srcset, swipe and slide
  announcements`, on task 2; the executor protocol requires a commit per task.
- **Fix:** split into `feat(lightbox): backdrop-click close and srcset passthrough` (task 1) and
  `feat(lightbox): swipe navigation and slide announcements` (task 2). Together they name exactly
  the four capabilities the plan's message names.

---

**Total deviations:** 6 auto-fixed (2 × Rule 1 bug, 2 × Rule 2 correctness, 2 × Rule 3 blocking).
No gate was weakened — three were **added** (the whole-document axe scan, the in-process CSS-slice
check, and 20 mutation cases). No architectural change. No package installed. No scope widening:
`useDismiss`, `useFocusTrap`, `useScrollLock`, the arrow-key listener and the controlled/
uncontrolled split were not modified, and their pre-existing tests all still pass.

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **`npm run test:a11y` scans no portal-mounted content anywhere in the design system.**
   `DSPortal` mounts to `document.body`; `test-runner.ts` scopes `checkA11y` to `#storybook-root`.
   By `DSPortal`'s own docstring that is **Tooltip, Popover, Modal, Sheet, BottomSheet, Lightbox,
   HoverCard and Toast** — eight components whose entire overlay surface has never been axe-tested,
   while the suite reports "No accessibility violations detected!" for each of their stories. The
   fix is one argument: `checkA11y(page, undefined, …)` scans the document, or the include list
   becomes `["#storybook-root", ".ds-atom-lightbox-backdrop", …]`. **This is the highest-value item
   in this list** and it belongs to whichever plan owns `test-runner.ts`. Until it lands, a green
   `test:a11y` is not evidence about any overlay.

2. **No Lightbox story renders its overlay open**, so even a document-scoped sweep would see
   nothing without a click. Same for the visual baselines: 01-20 will capture five Lightbox
   screenshots that are all a single button on an empty canvas. A story with `open` defaulting to
   true would fix both — but it would also cover the autodocs page with a `z-index: max` fixed
   overlay, so it needs `tags: ["!autodocs"]` or a `docs: { disable: true }`. Deliberately not done
   here: it changes what 01-20 captures, and that is 01-20's decision to make.

3. **jsdom 25 implements neither `PointerEvent` nor `setPointerCapture`.** `@testing-library/dom`
   falls back to the plain `Event` constructor when the named one is missing, and plain `Event`
   **silently drops `clientX`/`clientY`** — so a pointer-gesture test written the obvious way reads
   `undefined` coordinates and passes for the wrong reason. `Lightbox.test.tsx` installs a local
   `MouseEvent`-derived polyfill. Any future component with a pointer gesture needs the same, and
   it would be better in `src/test-setup.ts` than copied per file.

4. **Storybook's `test-runner` freeze is a correctness requirement for any local axe probe.**
   Running axe against an element mid-`lightboxFade` produced two different `color-contrast
   (serious)` readings (2.51, 3.45) on a node that measures **18.54:1** once frozen. Any future
   ad-hoc a11y measurement in this repo must apply the same style tag or it will manufacture
   serious-severity false positives.

5. **`Math.hypot` is used for the tap-slop check** where the rest of the gesture code compares axis
   deltas. It is correct and readable, but it is the only place a Euclidean distance appears; if a
   future plan adds a second gesture surface, the two should share one helper rather than diverge.

6. **Still unaddressed, carried from 01-06:** `$DS/.gitignore` has no `*.tgz` rule (01-08 and 01-21
   both pack); `src/tokens.css`'s header still reads `v1.5.0` against a `1.11.4` package;
   `check-no-ivory.sh` line 142 is case-sensitive against lowercase hex. This plan packed nothing
   and touched none of those files.

## Self-Check: PASSED

Files claimed modified, verified on disk in `$DS` (SHA-256, first 12):

```
FOUND: ../design-system/src/overlays/Lightbox/index.tsx           a464ad9dff0a   378 lines
FOUND: ../design-system/src/overlays/Lightbox/Lightbox.test.tsx   ad52e7ca68d1   624 lines
FOUND: ../design-system/src/overlays/Lightbox/Lightbox.stories.tsx 8f14d23c1906  338 lines
FOUND: ../design-system/src/primitives.css                        a3ffe912cad8
```

Commits claimed, verified present on `charcoal-theme`:

```
FOUND: 2458dd4  feat(lightbox): backdrop-click close and srcset passthrough
FOUND: c198985  feat(lightbox): swipe navigation and slide announcements
```

Sibling tree state at exit: `git status --porcelain` shows only the permitted
`?? design_handoff/design_handoff_ds_overview/`. Branch `charcoal-theme`, 14 commits ahead of
`main`. All four gates re-run **on the committed tree**: `npm test` exit 0 / 1564 tests,
`npm run check` exit 0, `npm run typecheck` exit 0, `npm run css:check` exit 0.

Storybook was started on **6006** for the axe probe and stopped; `lsof` confirms 0 listeners on
6006 at exit. Ports **4321** (the user's playground), **6008** and **6009** were never bound by
this plan and each still holds its own listener, untouched. No `git stash`, no `reset --hard`, no
worktree, no `npm install`, no `npm pack` — so no stray `.tgz`.
