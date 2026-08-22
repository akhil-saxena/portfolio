---
phase: 01-design-system-charcoal-theme
plan: 19
subsystem: design-system
tags: [g-1, e12, focalpointpicker, pointer-events, abortcontroller, role-application, aspect-ratio, e2, live-region, touch-target, new-component]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 18
    provides: "the three-way gate proof and the 'try to walk through your own repair' step, which caught a walk-through in my own gate A; the E29 warning that produced the decorator-free stories and the --ochre brand assertion on the probed element; and the README 79 -> 80 step this plan completes to 81"
  - phase: 01-design-system-charcoal-theme
    plan: 13
    provides: "AppShell's --ds-sidebar-w class-level knob — the shape src/tokens.test.ts names as mandatory for a new component knob, and the reason the 3:2 default is CSS rather than a prop default (finding E2)"
  - phase: 01-design-system-charcoal-theme
    plan: 07
    provides: "Lightbox's pointer-event gesture, its draggable={false} fix for Chromium's native image drag, and the live-region-from-mount pattern with role=status aria-live=polite"
  - phase: 01-design-system-charcoal-theme
    plan: 15
    provides: "the announcement idiom — a noun subject, the quantity with its unit, a terminating full stop — kept here so the library's three live regions do not speak three different ways"
  - phase: 01-design-system-charcoal-theme
    plan: 12
    provides: "src/overview-links.test.ts, the README = catalogue = src/ count assertion, which failed by name on this component and did"
  - phase: 01-design-system-charcoal-theme
    plan: 02
    provides: "tests/visual/computed.ts probeComputed and hexToRgb — the instrument for the brand assertion on the marker fill"
provides:
  - "$DS/src/inputs/FocalPointPicker/index.tsx — a controlled two-axis focal-point control. One pointer code path for mouse, touch and pen; arrow keys at 1% and Shift+arrow at 10% with Home to centre; role=\"application\"; a polite live region present from mount; document listeners registered through an AbortController signal"
  - "$DS/src/primitives.css — the `DS atom: FocalPointPicker (G-1)` banner section, 47 non-comment lines, carrying the class-level --ds-focalpoint-ratio knob, the aspect-ratio declaration, touch-action: none and a 44x44 marker hit target"
  - "$DS/tests/visual/focalpoint.spec.ts — 16 Chromium cases making the six claims jsdom cannot: a real touch pointer, a real pen pointer, the measured keyboard sequence by keyboard alone, the document listener table read out of the engine, the frame's actual box, and the marker fill's brand"
  - "$DS/src/inputs/FocalPointPicker/FocalPointPicker.test.tsx — 24 jsdom cases including the mid-drag-unmount AbortSignal assertion, which is the one half of legacy defect 3 a browser cannot reach"
  - "$DS/src/inputs/FocalPointPicker/FocalPointPicker.stories.tsx — 4 decorator-free stories: Default, AspectRatios, FrameWidths, RatioFromCss"
  - "README 81 and the Overview catalogue's inputs list — the second and last step of 01-18's cascade"

# Tech stack
tech-stack:
  added: []
  patterns:
    - "A new component-scoped CSS knob is declared ON THE CLASS with the component writing nothing inline unless a per-instance prop is passed. src/tokens.test.ts states this in as many words; this is the first new component to follow it from the start"
    - "A source-level gate on a listener-cleanup claim must check EVERY addEventListener call's option object for a signal, not the presence of the AbortController identifier. The identifier alone is satisfied by a string literal and by a controller that is constructed and never used"
    - "Chromium's own listener table (CDP DOMDebugger.getEventListeners on `document`) is the direct measurement for a leaked-listener claim — but it must be asserted as a DELTA, because Storybook's preview registers pointer listeners on document at rest"
    - "role=\"application\" over a plain focusable element for a widget with no matching ARIA role, on the measured ground that Chromium exposes the latter as `generic` and axe-core reports nothing"

key-files:
  created:
    - ../design-system/src/inputs/FocalPointPicker/index.tsx
    - ../design-system/src/inputs/FocalPointPicker/FocalPointPicker.test.tsx
    - ../design-system/src/inputs/FocalPointPicker/FocalPointPicker.stories.tsx
    - ../design-system/tests/visual/focalpoint.spec.ts
  modified:
    - ../design-system/src/primitives.css
    - ../design-system/src/index.ts
    - ../design-system/src/OverviewPage.tsx
    - ../design-system/README.md

key-decisions:
  - "Place the focal point; do not drag the image. Recorded in the component docstring, not only here, because G-1 says the divergence is itself the argument for the component living upstream"
  - "role=\"application\", which the plan called a last resort, over the plain focusable element the plan preferred. MEASURED: Chromium exposes `div tabindex=0 aria-label` as AX role `generic`, so a screen reader keeps the arrow keys for its browse-mode cursor and the whole keyboard model is inert with a reader running — and axe-core 4.13 reports NO violation for it, so test:a11y would have passed the broken version"
  - "role=\"slider\" rejected: one aria-valuenow, two axes, so one of them would be silently dropped or misreported"
  - "The 3:2 default is `--ds-focalpoint-ratio: 3 / 2` on `.ds-atom-focalpoint-frame`, NOT a `= 1.5` prop default and NOT an inline style. Omitting the prop writes no style attribute at all. This is finding E2's shape and src/tokens.test.ts names the class-level form as mandatory for a new knob"
  - "onChange is suppressed when a keyboard step does not move the value, but the live region STILL speaks — at an edge a silent control is indistinguishable from a dead key, and a consumer tracking dirtiness must not see a form go dirty from someone holding an arrow key"
  - "The announcement is written once per drag on pointerup, and once per keyboard step. Never on pointermove"
  - "The marker's dot FILL is tokenised (var(--amber), which aliases --ochre under charcoal) and its two rings are literals — #fff inside rgba(0,0,0,0.45). The thing behind them is a consumer photograph, so no token can be guaranteed to contrast with it"
  - "The frame is NOT overflow: hidden. Clipping would look tidier and would cut the 44px marker hit box down at exactly the edges a coarse pointer needs it most"
  - "No errorMessage / hint / label-wrapper props. The plan specified seven props and an exported API cannot be narrowed without a major; the field contract is a separate decision, raised below as a finding"

patterns-established:
  - "Prove a gate three ways, then try to walk through the repair. Gate A was walked through on the first attempt and the walk-through is recorded rather than quietly closed"
  - "When a negative control cannot be made to bite, name it and DELETE the assertion that was written for it. An assertion that cannot fail reads as proof"

metrics:
  duration: ~2h15m
  completed: 2026-08-22
  tasks: 2
  commits: 3
  tests-added: 40
  gates-repaired: 4
  gates-added: 1
---

# Phase 01 Plan 19: FocalPointPicker Summary

**`FocalPointPicker` exists upstream, so no consumer writes 269 lines and re-picks the
interaction model while doing it.** Three legacy defects fixed and each proven in Chromium; the
one recorded model divergence decided deliberately and written into the source; and the plan's
own `aspect-ratio` gate found to pass on **prose alone**, with zero declarations in the
stylesheet, exactly as the briefing predicted.

The decision that mattered most was the one the plan got wrong. It preferred *"a plain focusable
element with a clear `aria-label`"* and called `role="application"` a last resort. Measured in
Chromium, a plain focusable element is exposed as AX role **`generic`** — not a widget — so a
screen reader keeps the arrow keys bound to its own browse-mode cursor and the arrow-key model
this component exists to provide is **inert with a reader running**. And `axe-core` 4.13 reports
**no violation** for that markup, so `test:a11y` — the plan's own safety net — would have passed
it. The keyboard fix would have shipped, been green everywhere, and been unusable by exactly the
users it was for.

---

## Commits

| Task | Gate | Commit | Message |
|---|---|---|---|
| 1 | RED | `f423d84` | `test(focalpointpicker): pin the three legacy defects and the rejected drag-the-image model` |
| 1 | GREEN | `a9532f9` | `feat(focalpointpicker): place a focal point by pointer, keyboard or pen (G-1)` |
| 2 | — | `52cf0b4` | `feat(focalpointpicker): add an accessible focal-point control (G-1)` |

Branch `charcoal-theme`, **50 commits** ahead of `main` (was 47). Tracked-clean at start and at
finish, with `?? design_handoff/design_handoff_ds_overview/` the only untracked line throughout.

---

## What was built

A controlled two-axis picker: `value: {x, y}` percentages, `onChange`, `src`, `alt`,
`aspectRatio?`, `label`, `className`. Seven props, as specified — an exported API cannot be
narrowed without a major, so nothing speculative was added.

```
<div class="ds-atom-focalpoint">
  <div class="ds-atom-focalpoint-frame" role="application" tabindex="0"
       aria-label={label} aria-describedby={hint}>      ← the one focusable element
    <img class="ds-atom-focalpoint-image" draggable="false"
         style="object-position: 25% 75%">              ← the live preview
    <span class="ds-atom-focalpoint-marker" aria-hidden="true"
          style="left:25%; top:75%">                    ← 44x44 hit box
      <span class="ds-atom-focalpoint-dot">             ← 14px visible dot
  </div>
  <span class="ds-visually-hidden" id={hint}>…arrow keys…</span>
  <div class="ds-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
</div>
```

### The line count, beside the prototype's 269

| | total | non-comment, non-blank |
|---|---|---|
| G-1's measured prototype `FocalPointSketch.tsx` | 419 | **269** (183 TS/JSX + 86 frame CSS) |
| `src/inputs/FocalPointPicker/index.tsx` | 379 | **159** |
| `src/primitives.css` FocalPointPicker section | 123 | **47** |
| **shipped implementation** | 502 | **206** |
| `FocalPointPicker.test.tsx` | 454 | 321 |
| `tests/visual/focalpoint.spec.ts` | 625 | 429 |

206 against 269, and the 47 CSS lines against the prototype's 86 — the whole difference there is
`aspect-ratio` replacing the padding-top hack, which needed a wrapper element, an inset child and
a hardcoded percentage per ratio and could not take the ratio as a variable at all. But the
saving is not the point the plan makes and not the one I would make either: it is written **once**,
has 750 lines of tests behind it, and is operable by keyboard and by touch.

---

## The interaction model, and the docstring that records the rejected one

Verbatim from `src/inputs/FocalPointPicker/index.tsx`:

> ## THE INTERACTION MODEL, AND THE ONE THAT WAS REJECTED
>
> This component **places the focal point** at the pointer's position inside the frame, expressed
> as a percentage of the frame's own width and height.
>
> The **rejected model** is the legacy one: drag the *image*, accumulating an inverted pixel delta
> with an arbitrary `/ 2` damping factor. It is rejected because it is **frame-size dependent** —
> an accumulated pixel delta means a fixed number of percentage points regardless of how wide the
> frame is, so "drag from the left edge to the middle" commits a different value on a 320px frame
> than on a 640px one, and the same stored crop cannot be reproduced from the same gesture.
> Placing the point directly has no delta to accumulate, no damping constant to justify, and no
> inversion to get the sign of.
>
> This paragraph is here rather than only in a plan summary on purpose. G-1 records that two
> reasonable engineers picked different models for one CSS property, and calls that divergence
> *"itself the argument for the component living upstream"* — so the next person to touch this
> file should find the decision, not re-derive it. `FocalPointPicker.test.tsx` asserts both
> halves: that two frame widths agree on a proportional release, and that they *disagree* on an
> identical pixel offset, which is what would break if someone reintroduced a delta.

---

## Frame-size independence, measured at two widths

The briefing said to prove it by measuring both, not by reasoning about percentages. Both halves
are asserted, in jsdom against stubbed rects **and** in Chromium against real boxes. The Chromium
numbers, printed by the spec:

```
frame-size independence: 320x213 -> 25% 75%,  640x427 -> 25% 75%
identical 80x40px offset: 320px frame -> 25% 19%,  640px frame -> 13% 9%
```

The first line is the claim: the same **proportional** release — a quarter across, three quarters
down — commits the same value on both frames.

The second line is the mirror, and it is the assertion that actually pins the model. An
**identical pixel** offset must *disagree*, because the value is a position inside the frame and
not an accumulated delta. If those two ever match, the component has drifted back to the legacy
model. A test with only the first line passes for the legacy control too — a `/ 2` damped pixel
delta also commits the same value at both widths when the *pixel* travel is the same, and the
first line's gesture happens to differ in pixels between the frames only because the frames
differ. The pair is what distinguishes them.

There is also a non-vacuity guard on the two-width test: it asserts the second frame is more than
300px wider than the first, because "measured at two widths" against two frames that turned out
the same width proves nothing.

**Non-vacuity of the geometry itself:** `default frame: 420 x 280 = 1.5000`, read off the frame's
own bounding box, and `CSS knob: 1.500 default, 1.000 overridden, both with no inline style`.

---

## The three legacy defects, each proven in a real browser

### 1. Mouse-only, so inert to touch and to pen

| Pointer | How it was driven | Result |
|---|---|---|
| touch | `hasTouch` context + CDP `Input.dispatchTouchEvent` touchStart/Move/End | `50% 25%` → `25% 75%` |
| pen | CDP `Input.dispatchMouseEvent` with `pointerType: "pen"`, `force: 0.5` | `50% 25%` → `75% 50%` |
| mouse | `page.mouse` | `50% 25%` → `10% 90%` mid-drag → `25% 75%` on release |
| bare `mousedown` | jsdom `fireEvent.mouseDown/Move/Up` | **no change** — there is no mouse-only path |

The touch case records the `pointerType` Chromium actually delivered, captured on a
capture-phase `pointerdown` listener installed before the gesture, and asserts `["touch"]`. The
first version of that test read a `window.__k` I never set, so `kind === null || kind === "touch"`
was a tautology — it would have passed on a mouse drag dressed up as a touch one, which is
precisely the defect it exists to catch. Fixed before running.

The mid-drag assertion is made **while the button is still held**, before the release. A component
that only committed on `pointerup` would pass every post-release assertion in the file.

`draggable={false}` on the `<img>` is carried over from Lightbox in 01-07: Chromium starts its
native image drag on a mouse or pen press and that cancels the pointer sequence before
`pointerup`, so without it the drag path would be touch-only.

### 2. Keyboard-unreachable

Driven **by keyboard alone** in Chromium — `Tab` from `body`, no mouse anywhere in the test — with
the focused element asserted to be `.ds-atom-focalpoint-frame` with `role="application"`:

| Keys | Preview (`object-position`) | Live region |
|---|---|---|
| — | `50% 25%` | *(empty, but the element exists)* |
| `↑ ↑ →` | `51% 23%` | `Focal point 51% from the left, 23% from the top.` |
| `Shift+↓` | `51% 33%` | `Focal point 51% from the left, 33% from the top.` |
| `Home` | `50% 50%` | `Focal point 50% from the left, 50% from the top.` |

Every value matches G-1's measured prototype exactly. The computed `object-position` after `Home`
reads `50% 50%`, so the preview followed the keyboard and not only the pointer.

The other half of `preventDefault` is asserted too: on a 4000px-tall page with focus on `body`,
`ArrowDown` **scrolls the page** and leaves the value untouched. A component that bound the arrow
keys on `document` would pass every assertion above and silently steal a page scroll.

### 3. Uncleaned listeners

Two complementary proofs, because neither alone covers the case.

**In Chromium**, read out of the engine's own listener table via CDP
`DOMDebugger.getEventListeners` on `document`:

| Moment | Listeners this component adds |
|---|---|
| before any drag | `[]` |
| mid-drag, button held | `["pointercancel", "pointermove", "pointerup"]` |
| after release | `[]` |
| after ten further gestures | `[]` |

Asserted as a **delta against a baseline**, not as an absolute count — measured: `document` is
*not* empty of pointer listeners at rest, because Storybook's own preview registers some. An
absolute assertion failed here for a reason with nothing to do with the component, and loosening
it to `greaterThan(0)` would have made it unfalsifiable. The delta helper has its own
self-consistency check (`added(baseline)` must be `[]`).

**In jsdom**, the mid-drag unmount — which a browser cannot reach, because there is no way to
unmount a Storybook story mid-gesture without also destroying the document the listeners live on.
The test instruments `document.addEventListener`, records the options object of every `pointer*`
registration, then asserts:

1. every recorded `signal` is an `AbortSignal` (not merely present);
2. every one is `aborted === false` while the drag is live;
3. **after `unmount()` mid-drag, every one is `aborted === true`**;
4. no further `onChange` fires from a post-unmount `pointermove`/`pointerup`.

Plus `pointerup` and `pointercancel` each abort on their own, and a second `pointerdown` without
an intervening up aborts the first drag's controller rather than leaving it live.

---

## Keyboard and screen-reader behaviour as observed in a real browser

**Focus.** One tab stop. `Tab` from `body` lands on the frame, which reports `role="application"`
and `aria-label` from the `label` prop. Focus ring is `box-shadow: var(--focus-ring)` on
`:focus-visible`, routed through the token the whole library uses. A pointer press also focuses
the frame (`focus({ preventScroll: true })`), so the keyboard path is reachable straight after a
drag without a Tab round trip.

**The announcement.** A `role="status" aria-live="polite" aria-atomic="true"` element, rendered
from mount and initially empty — asserted in the browser, because a region inserted at the moment
its content changes is frequently never announced at all. Text observed in Chromium:

```
Focal point 25% from the left, 75% from the top.
```

Not `"25, 75"`. It names both quantities, gives each a unit and an axis, and ends in a full stop.
That keeps the idiom 01-07 and 01-15 settled on — a noun subject, the quantity with its unit, a
terminating full stop (`Image 2 of 3. Harbour wall` / `…at position 2 of 5.`) — and changes only
the noun, because a focal point is a coordinate pair rather than a position in a list, so `{n} of
{total}` has nothing to count.

**Throttling, asserted in both directions.** Mid-drag, with the button held and the preview
already showing `10% 90%`, the live region is measured **empty**. It is written once on
`pointerup` and once per keyboard step. `pointermove` fires far faster than a reader can speak,
and a region rewritten every frame produces either a flood or — because each write replaces the
last before it is read — nothing at all.

**The instructions.** `aria-describedby` points at a separate visually-hidden element: *"Drag or
click to place the focal point. Arrow keys move it one percent, Shift and an arrow key move it ten
percent, and Home returns it to the centre."* It is deliberately not the live region, which would
re-read the whole paragraph on every change.

**What I did NOT verify.** No screen reader was run. The `role="application"` decision rests on the
Chromium AX-role measurement below plus documented browse-mode behaviour, and the plan's
`<human-check>` is the right place for the actual utterance. Stated plainly rather than implied.

### The ARIA decision, measured

`Accessibility.getPartialAXTree` in Chromium, over four candidate markups:

| markup | AX role | axe-core 4.13 |
|---|---|---|
| `div tabindex=0 aria-label` — **the plan's preference** | `generic` | no violation |
| `div role="application" tabindex=0 aria-label` — **shipped** | `application` | no violation |
| `div role="group" tabindex=0 aria-label` | `group` | no violation |
| `div role="slider" tabindex=0 aria-label aria-valuenow` | `slider` | no violation |

The axe harness was proved non-vacuous first: an `<img>` with no `alt` in the same harness
reported `image-alt [critical]`.

`generic` is not a widget, so arrow keys stay with the reader's virtual cursor. `slider` is
rejected for a different reason: one `aria-valuenow`, two axes, so one axis would have to be
dropped or misreported. `group` is not an interactive role. `application` is the only one that
both passes the arrow keys through and claims nothing false about the value's shape.

**Biome's own a11y lint disagrees**, and its suggested fix is dangerous:
`lint/a11y/noNoninteractiveTabindex` reads the *tag* — a `div` — and not the role, and offers
"remove the tabIndex attribute", which is legacy defect 2 verbatim. Suppressed with the reason
recorded inline. Also measured: the suppression must be the **last** comment line before the
attribute; written as the first line of an eight-line paragraph it reported
`suppressions/unused` and the rule still fired.

---

## Gates repaired, each with its three-way proof

`plan-gate-N` below is the plan's `<automated>` block run verbatim; `gate-X` is the replacement.
Every negative control mutated the real file, **diffed it before running** (01-18's controls
measured an unmodified file three times), and restored from a `cp` backup with `shasum -a 256`
confirmed byte-identical. Never `git checkout --`, `git stash`, `git reset` or `git clean`.

### Gate A — replaces task-1 gate 2 (`grep -q 'AbortController'`)

Two holes. The comment filter strips comments but not **string literals**, so
`const why = "AbortController"` satisfies it; and more seriously, it cannot tell an
`AbortController` wired into every listener from one **constructed and never used**.

Gate A strips comments *and* string/template literals, then requires `new AbortController(`, an
`.abort()` call, and — the load-bearing part — walks each `addEventListener(` call to its matching
paren and requires a `signal` inside. It reads event *types* from the unstripped source for the
failure message only; the `signal` check itself runs on the stripped copy, because otherwise
`addEventListener("pointermove signal", fn)` would satisfy it from a string.

| | plan-gate-2 | gate-A | `vitest` |
|---|---|---|---|
| pre-plan (`f4b1e2b`, no component file) | — | **FAIL** *"missing or empty — a grep count of 0 on a missing file reads as a pass"* | — |
| **A1** — `{ signal }` removed from all 3 calls, `new AbortController()` kept | **PASS** | **FAIL** *"3 addEventListener call(s), 3 with NO signal: pointermove, pointerup, pointercancel"* | **FAIL** 3/24, the three cleanup cases by name |
| shipped | PASS | **PASS** *"3 calls, all with a signal; 1 construction; pointer-uniform, no mousedown path"* | PASS 24/24 |

### Trying to walk through gate A — and succeeding

`{ signal }` → `{ signal: undefined }`. Every listener still leaks; `/\bsignal\b/` still matches.

| | plan-gate-2 | gate-A | `vitest` |
|---|---|---|---|
| **A2** — `{ signal: undefined }` ×3 | PASS | **PASS — walked through** | **FAIL** 3/24 |

Gate A alone does not close it, and no purely static gate can: binding is a runtime property.
What closes it is the vitest listener tracker, which asserts each recorded signal
`toBeInstanceOf(AbortSignal)` and `aborted === true` after the mid-drag unmount — `undefined`
fails both. Recorded rather than quietly patched, because the residual is real: **the source-level
gate is necessary and not sufficient, and the behavioural test is what makes the claim true.**

### Gate B — replaces task-1 gate 3 (`grep -q 'aspect-ratio' src/primitives.css`)

**This one was already passing on prose alone when I checked it**, exactly as the briefing said to
assume. Measured on the shipped tree before any repair:

```
--- every 'aspect-ratio' occurrence in primitives.css ---
7164:   Drag-a-marker focal point selection on a real aspect-ratio frame.
7166:   WHY `aspect-ratio` AND NOT THE PADDING HACK. The legacy 3:2 frame this
7168:   absolutely positioned child, because `aspect-ratio` did not exist when it was
7172:   `aspect-ratio` declaration replaces all of it and accepts any ratio the
--- is ANY of them a declaration? (comments stripped) ---
  NONE — every hit is inside a comment
--- the PLAN'S gate 3, verbatim ---
  PLAN GATE 3: PASS
```

Four comment lines, zero declarations, gate green. The ratio was arriving as an **inline**
`style={{ aspectRatio }}`, so the stylesheet had no `aspect-ratio` at all. Deleting the phrase
"WHY `aspect-ratio` AND NOT THE PADDING HACK" from my own prose would have turned it red with the
implementation unchanged — 01-18's `9.5px` gate, one plan later.

Gate B strips CSS comments, isolates the `DS atom: FocalPointPicker` banner section (so a
declaration in a neighbouring banner, where `split-css.mjs` would route it into the wrong sheet,
cannot pass), and requires an `aspect-ratio:` **declaration** inside it reading
`var(--ds-focalpoint-ratio)`, plus the class-level `--ds-focalpoint-ratio: 3 / 2` default, plus
`touch-action: none`.

| | plan-gate-3 | gate-B | `src/tokens.test.ts` |
|---|---|---|---|
| pre-plan (no banner) | — | **FAIL** *"no `DS atom: FocalPointPicker` banner — split-css routes by banner"* | — |
| **B1** — the `aspect-ratio:` declaration deleted, comment kept | **PASS** | **FAIL** *"no `aspect-ratio:` DECLARATION anywhere — every hit is inside a comment, which is what the plan gate accepted"* | — |
| **B2** — the class-level `--ds-focalpoint-ratio: 3 / 2` default deleted (E2's shape) | **PASS** | **FAIL** *"an inline-only default is fixed at construction and unreachable from any selector"* | **FAIL** |
| shipped | PASS | **PASS** | PASS |

### Gate C — replaces the frontmatter `key_link` pattern `objectPosition|object-position`

That pattern matches a comment, the prop name, and this component's own docstring. Gate C requires
an **assignment of a template literal** interpolating *both* axes with a `%` unit, onto an `<img>`.

| | plan `key_link` grep | gate-C | Chromium |
|---|---|---|---|
| pre-plan (no file) | — | **FAIL** | — |
| **C1** — `objectPosition: \`${x}% ${y}%\`` → `objectPosition: "50% 50%"` | **PASS** | **FAIL** *"no `objectPosition: \`…\`` assignment"* | — |
| **S3** — `object-fit: cover` deleted from the sheet | PASS | PASS | **FAIL** 1/16 |
| shipped | PASS | **PASS** *"objectPosition: `${point.x}% ${point.y}%` on an `<img>`, both axes, % unit"* | PASS 16/16 |

`S3` is the walk-through of gate C, and it is why the spec asserts `object-fit` too:
`object-position` is **ignored entirely** when `object-fit` is `fill`, which is the initial value.
Without that assertion a component that dropped `object-fit: cover` would pass every other check
in the file while the crop did nothing at all.

### Gate D — NEW. The plan's own 44px requirement had no gate whatsoever

The plan states *"the marker's hit target must meet 44px"* and *"This is a new component, so it
starts compliant"* in `<interfaces>` and `<done>`, with no `<automated>` and no `<manual>` block
behind it — undetectable if skipped. Gate D reads `.ds-atom-focalpoint-marker`'s declared
`width`/`height` in px, requires ≥ 44, and requires the centring margins to be exactly `-w/2` and
`-h/2`, or the point the percentages place is not the point the user grabbed.

| | gate-D |
|---|---|
| pre-plan (no rule) | **FAIL** *"no `.ds-atom-focalpoint-marker` rule"* |
| **D1** — 44px → 24px, margins → -12px | **FAIL** *"marker hit target is 24x24px, below the project floor of 44px"* |
| **D2** — 44px kept, `pointer-events: none` added | **FAIL** *"the box measures 44px and catches nothing"* |
| shipped | **PASS** *"44x44px, centred by margin -22/-22px"* |

`D2` is the walk-through of my own gate D, found before shipping and closed by widening it: a
44×44 box with `pointer-events: none` measures 44px and is not a hit target at all, and because
the frame would still receive the press by bubbling, nothing visibly breaks and the touch-floor
claim silently becomes false. Gate D also now rejects `overflow: hidden`/`clip` on the frame,
which would cut the hit box down at exactly the edges a coarse pointer needs it most. Chromium
confirms independently: `marker hit target: 44 x 44`, `pointer-events !== "none"`, and
`document.elementFromPoint` at the marker's centre resolves **to the marker**.

### Where the repaired gates live

The four scripts were one-shot verification instruments in a scratchpad. **A gate that lives only
in a scratchpad protects nothing**, so each has a permanent in-repo equivalent that runs in CI:

| gate | permanent equivalent |
|---|---|
| A | the `FocalPointPicker.test.tsx` listener tracker — the only form that catches `signal: undefined` |
| B | `src/tokens.test.ts`'s custom-property assertion (now that it bites — see below) + the spec's 3:2 and override measurements |
| C | the spec's computed `object-position` **and** `object-fit` assertions |
| D | the spec's marker box, `pointer-events` and `elementFromPoint` assertions |

---

## Which controls are non-inert, and which is not

**Non-inert (7).** `A1` and `A2` on the AbortController signal; `B1` and `B2` on the ratio
declaration and its class-level default; `C1` on the `objectPosition` template; `D1` and `D2` on
the marker geometry — every one flipped its gate red on a live run, with the diff printed and the
restore verified.

**Non-inert against the browser spec (4).** `S2` (signal removed → the listener-table test goes
red), `S3` (`object-fit: cover` removed → the object-position test goes red), `S4`
(`FINE_STEP` 1 → 2 → the measured keyboard sequence goes red), and `S5` (`rect.width` → a fixed
`400` denominator → **5 of 16** cases red, including frame-size independence). Each mutated the
shipped source, ran the whole spec in Chromium, and restored byte-identically.

**One inert control, named: `S1` — `touch-action: none`.** It could not be made to bite, in three
attempts:

1. First attempt patched the **wrong rule**. `touch-action: none` occurs three times in
   `primitives.css` (lines 1633, 4426, 7238) and a first-occurrence `replace` deleted another
   component's. Caught by reading the printed diff — the very reason the harness prints one.
2. Retargeted to `.ds-atom-focalpoint-frame` (line 7238, confirmed in the diff): **all 15 cases
   still green.**
3. Gave the page 3000px of scrollable body and asserted `window.scrollY === 0` after the touch
   drag: **still green.**

CDP's `Input.dispatchTouchEvent` dispatches DOM touch events directly and never enters Chromium's
touch-action / scroll-gesture pipeline, so **no Playwright-synthesised touch can observe that
declaration.** The `scrollY` assertion written for it was **removed rather than left in place** —
an assertion that cannot fail reads as proof — and the fact is recorded in the spec's own
docstring instead. `touch-action: none` rests on the reasoning in its CSS comment and on the human
check with a real finger. It is the one claim in this plan that is argued rather than measured.

---

## Plan premises that turned out false

**Four.**

### 1. `role="application"` is not a last resort; the plan's preferred option is unusable

Covered above. The plan preferred a plain focusable element with an `aria-label`; Chromium exposes
that as `generic`, and axe reports nothing. Both halves measured.

### 2. The `aspect-ratio` gate passes on prose alone

Covered above. Measured on the shipped tree, four comment hits and zero declarations.

### 3. `style={{ aspectRatio }}` is the wrong shape, and `src/tokens.test.ts` says so in words

The plan's action says *"CSS in a `DS atom: FocalPointPicker` banner section of `primitives.css`,
using `aspect-ratio` for the frame"* while its props section says `aspectRatio?: number` defaulting
to 1.5. Implemented literally as an inline `style={{ aspectRatio }}`, that puts the property
**inline**, where it outranks every class rule without `!important` — the E3/E5/F-12-2 family this
phase spent its length removing — and leaves the stylesheet with no `aspect-ratio` at all, which is
what made the plan's gate self-satisfying.

The first repair moved it to a custom property with a `var(--ds-focalpoint-ratio, 3 / 2)` fallback,
still written inline. **`npm test` then failed on an invariant the plan never mentions** —
`src/tokens.test.ts > defines every custom property referenced anywhere in src` — whose docstring
turns out to specify the answer:

> declared by a component on its OWN CLASS in primitives.css, as a knob a consumer or a media query
> can read and re-declare. `--ds-appbar-h` and `--ds-sidebar-w` are both this shape, **and it is the
> shape new component-scoped knobs must use.** […] set inline by a component on its own subtree
> […] Kept working, but **NOT the pattern to copy**: an inline custom property is fixed at
> construction, so no media query, container query or density axis can drive it. `--ds-sidebar-w`
> used to be this shape, which is why UI-SPEC's 208px compact sidebar was measured as unreachable
> (finding E2); plan 01-13 moved it to the class.

Shipped shape: `--ds-focalpoint-ratio: 3 / 2` and `aspect-ratio: var(--ds-focalpoint-ratio)` on
`.ds-atom-focalpoint-frame`; the component writes **no style attribute at all** unless
`aspectRatio` is passed, and the TS prop has no `= 1.5` default, so the number is declared in
exactly one place. Passing the prop is a per-instance override that knowingly trades reachability
away, documented on the prop — the same contract AppShell's `sidebarWidth` carries.

Measured in Chromium, on `RatioFromCss`, where **neither** picker passes the prop:

```
CSS knob: 1.500 default, 1.000 overridden, both with no inline style
```

This is the invariant the briefing warned about via 01-11 — one the plan never named, that only
the full suite caught, and that changed the design rather than needing a workaround.

### 4. jsdom cannot make the pointer assertions the plan's task-1 gate assumes

jsdom 25 has **no `PointerEvent`** (measured: `typeof window.PointerEvent === "undefined"`), and
Testing Library's `fireEvent.pointerMove` falls back to the bare `Event` constructor when the class
is missing, which **silently drops `clientX`/`clientY`**. Every position assertion read `50, 50` —
the clamp's `NaN` fallback — while looking like a plausible failure. Replaced with a local
`firePointer` helper that builds a `MouseEvent` (which carries the coordinates for real) under a
pointer event *name*. jsdom still cannot distinguish a touch pointer from a mouse one, which is why
the touch and pen claims live in the browser spec.

---

## Findings raised (not fixed)

Per protocol §9/§10 — recorded here, no rows added to `00-FINDINGS.md`.

### 1. `declaredIn()` in `src/tokens.test.ts` does not strip comments, so a comment can declare a token

`declaredIn` scans `/^\s*(--[a-z0-9-]+)\s*:/` across the **raw** file. My banner comment contained a
three-line usage example:

```
     @media (max-width: 672px) { .ds-atom-focalpoint-frame {
       --ds-focalpoint-ratio: 1;
     } }
```

That middle line satisfied the assertion, so deleting the **real** class-level declaration left
`defines every custom property referenced anywhere in src` **green** — measured: negative control
`B2` passed `src/tokens.test.ts` the first time I ran it. Protocol §7's "a header can invalidate its
own gate", found inside the repository's own invariant.

I did not change `tokens.test.ts` — it is outside this plan's file set and comment-stripping there
could turn other declarations red across 361 files. Instead I rewrote **my** example onto one line
beginning `@media`, which the pattern cannot match, and left a note in the CSS saying why it must
not be reformatted. `B2` re-run afterwards fails `tokens.test.ts` as it should. **A later plan
should strip comments in `declaredIn` and check what surfaces.**

### 2. `FocalPointPicker` has no `errorMessage` / `hint` / `label` field contract

`src/field-contract.test.tsx` enumerates fifteen controls by hand and this is the sixteenth input
that produces a value, so it is not in that list and nothing fails. The plan specified seven props
and an exported API cannot be narrowed without a major, so adding a field contract speculatively
would have been worse. But a focal point in an admin form can fail validation like anything else,
and every other value-producing input in the library can say so. **Decide before v2.0.0 ships** —
adding `errorMessage`/`hint` later is additive and safe, but joining the field contract *after*
consumers exist means their forms are inconsistent in the meantime.

### 3. `tests/visual-baselines/` has drifted badly from the story set

240 baseline directories, 240 PNGs (204 `light`, 36 `dark`). The built index holds **502** stories,
of which **444 have no baseline directory at all** — so 186 of the 240 directories name story ids
that no longer exist. The "01-20 owes N baselines" figure is a phase-01 running tally carried in
summaries, not a number derivable from disk. **01-20 should reconcile the directory against the
index before recording anything**, or it will record 21 new baselines into a set that is 75% stale
and 37% orphaned.

### 4. `lint/a11y/noNoninteractiveTabindex` suggests deleting the keyboard path

Biome reads the tag, not the role, so any correct `role="application"` widget trips it and its
offered fix is "remove the tabIndex attribute". Suppressed with a reason here. Worth a repo-level
rule configuration rather than a per-site suppression if a second such widget appears.

### 5. `husky`/`lint-staged` runs `git stash` on every commit

Each of my three commits printed `Backed up original state in git stash (…)` / `Cleaning up
temporary files`. That is pre-existing repo tooling on the commit path, not something this plan
invoked, and it cleaned up each time. Flagging it only because Phase 1's standing rules forbid
`git stash` and a future reader will see those lines in the log of every plan in this phase.

---

## Counts moved, and what 01-20 inherits

| | before | after |
|---|---|---|
| README `**N components across 10 categories.**` | 80 | **81** |
| `src/OverviewPage.tsx` inputs catalogue | 23 | **24** (81 total) |
| `src/` component directories | 82 | **83** (81 catalogued + 2 `EXCLUDED_FROM_CATALOG`) |
| `npm run css:check` byte-exact sheets | 78 | **79** |
| `dist/components/*.js` subpath entries | 82 | **83** |
| Storybook stories in the built index | 498 | **502** |
| `npm test` | 1745 / 116 files | **1780 / 118 files** |

`src/overview-links.test.ts` failed by name on the first run — *"these components exist in src/ but
are neither in the Overview catalogue nor in EXCLUDED_FROM_CATALOG: inputs/FocalPointPicker"* — and
all three numbers were moved together. `dist/components/FocalPointPicker.js` (160 B, with the
`"use client"` directive applied by `scripts/postbuild.mjs`) and `dist/css/focalpointpicker.css`
both emit; tsup's `MIN_COMPONENTS` floor of 70 is satisfied at 83.

### Visual baselines owed to 01-20: **21**

17 carried in (12 before 01-18 + 5 from 01-18) **+ 4 from this plan**:

```
inputs-focalpointpicker--default
inputs-focalpointpicker--aspect-ratios
inputs-focalpointpicker--frame-widths
inputs-focalpointpicker--ratio-from-css
```

All four are **decorator-free** — no `className="dark"`, no hardcoded page colour. The mode and
brand come from the toolbar globals, which is what E29 requires and what 01-19.1 is about to clean
up across 67 files. `tests/visual-baselines/` is `diff`-clean and still holds exactly 240 PNGs;
this plan wrote **zero**, because every assertion reads computed style, geometry or text. Any
`test-results/` produced by the Playwright runs was confirmed untracked (and `.gitignore`d) and
removed by explicit path — never `git clean`.

### Paste-ready `CHANGELOG.md` wording for 01-20

A new additive component needs **no** `BREAKING CHANGE:` footer, so the four already recorded for
v2.0.0 stand at four.

```markdown
### Added

- **`FocalPointPicker`** — choose the point a cropped image is anchored to, by dragging a marker on
  a real aspect-ratio frame with a live `object-position` preview (G-1). Operable by pointer, touch
  and pen through one code path; by keyboard alone with arrow keys at 1%, `Shift`+arrow at 10% and
  `Home` to recentre; and it announces the position in words through a polite live region. The
  frame defaults to 3:2 via the `--ds-focalpoint-ratio` CSS knob, which a media query can
  re-declare, with an `aspectRatio` prop as a per-instance override. The marker's hit target meets
  the 44px coarse-pointer floor. New subpath entry
  `@akhil-saxena/design-system/components/FocalPointPicker` and stylesheet
  `@akhil-saxena/design-system/css/focalpointpicker`.
```

---

## Verification

All four sibling gates green at the plan boundary, in `$DS`:

| gate | result |
|---|---|
| `npm test` | **1780 passed / 118 files**, exit 0 |
| `npm run check` | 362 files, exit 0 |
| `npm run typecheck` | exit 0 (`tsc --noEmit` + `tsconfig.test.json`) |
| `npm run css:check` | `split-css: OK — 79 files, round-trip byte-exact` |

Plus, beyond the plan's own blocks:

| | result |
|---|---|
| `npx playwright test tests/visual/focalpoint.spec.ts` | **16 passed** |
| `npm run test:a11y` | **502 passed / 84 suites** |
| `control-boundary` + `control-chrome` + `polish-audit` + `brand-probe` | **12 passed** — these auto-scan every story from `index.json`, so the four new ones are inside them |
| `npm run build` | exit 0; `dist/components/FocalPointPicker.js` + `.d.ts` + `.js.map` + `dist/css/focalpointpicker.css` |
| gates A / B / C / D | all PASS on shipped, all FAIL pre-plan, all FAIL with the fix disabled |

Brand assertion on the probed element, in all four brand × mode cells, via `probeComputed`:

| cell | `--ochre` on `.ds-atom-focalpoint-dot` | dot `background-color` |
|---|---|---|
| default × light | `""` *(declared only in charcoal.css — proof of cell)* | `rgb(245, 158, 11)` = `#f59e0b` |
| default × dark | `""` | `rgb(245, 158, 11)` |
| charcoal × light | `#b0722a` | `rgb(176, 114, 42)` = `#b0722a` |
| charcoal × dark | `#b0722a` | `rgb(176, 114, 42)` |

The marker fill is the one brand-responsive property on the component, so it doubles as the
E29 cell-proof: `--ochre` empty means the read belongs to the default brand and not to a scoped
wrapper. No composited alpha anywhere in this plan's measurements — every colour asserted is a
fully opaque token, so 01-18's `getComputedStyle` alpha trap does not apply. (The dot's outer ring
*is* `rgba(0, 0, 0, 0.45)` over a photograph and is deliberately **not** asserted as a contrast
figure, because compositing over arbitrary image data has no single answer.)

**Portal check, read from the live DOM** rather than inferred from the absence of a `createPortal`
import: every `[class*="ds-atom-focalpoint"]` and `[role="status"]` node is inside
`#storybook-root`, so `test:a11y`'s `checkA11y(page, "#storybook-root")` scope sees all of it. The
assertion has a non-vacuity guard (≥ 5 nodes found) so a selector that matched nothing cannot pass.

### Still open: the human check

The plan's `<human-check>` stands. Two parts of it are the parts I could not do:

1. **A real finger on a real touch device.** `touch-action: none` is the one declaration in this
   plan that no automated control could falsify (three attempts, above).
2. **A screen reader actually speaking.** The announcement text and the live region's attributes
   are asserted in Chromium; the utterance is not.

Everything else in that block — drag the marker and watch the preview follow and land where you
released, `Tab` back and adjust with arrow keys only — is asserted in Chromium and reproduces the
measured prototype exactly.

---

## For later plans

- **01-19.1** (E29 story-wrapper cleanup, 67 files): the four stories added here need no cleanup.
  They set no `className="dark"` and no hardcoded page colour.
- **01-20** (CHANGELOG, baselines): paste-ready wording above; **21** baselines owed; and please
  read finding 3 before recording — 444 of 502 story ids currently have no baseline directory and
  186 directories name ids that no longer exist.
- **01-21** (pack/publish): `dist/components/FocalPointPicker.js` and
  `dist/css/focalpointpicker.css` are new public surface; the sheet count is 79.
- **Phase 06.1** (density axis, `F-15-7` / `G-2`): `FocalPointPicker` has **no** `data-density`
  block, deliberately, per protocol §9. Its marker is already at the 44px floor, so it joins that
  queue with nothing owed. The `--ds-focalpoint-ratio` knob is class-level precisely so a density
  or container-query axis can reach it when that phase arrives.
- **Phase 7** (`/admin/home`): the component this route exists for. `home_config.json`'s
  `peekPositions` holds `"50% 25%"` strings; the `Default` story prints exactly that string beside
  the frame, so the wiring is a `${x}% ${y}%` template and nothing more.
- **Whoever touches `src/tokens.test.ts`**: finding 1. A comment can declare a token there.
