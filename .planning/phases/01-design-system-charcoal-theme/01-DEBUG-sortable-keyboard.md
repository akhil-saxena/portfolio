---
status: resolved
finding: E34
trigger: "It is specifying that I need to press space and drag an item. But whenever I focus on a tile, it always selects task A. Even if I'm clicking on task D, it is still dragging task A itself."
created: 2026-08-22
updated: 2026-08-23
commits:
  - 9fd1375 fix(sortable) — FocusScopedKeyboardSensor
  - e75c10d test(sortable) — 4 vitest + 4 Chromium cases
---

# E34 — keyboard reorder appears to always pick up the first item

`$DS/src/interaction/Sortable/index.tsx`. Fixed. A second question about
`ConfirmDialog`'s docs page is answered at the end; it needed no fix.

---

## 1. Symptoms

| | |
|---|---|
| expected | focusing Task D and pressing Space picks up Task D |
| actual | Task A is picked up and moved no matter which tile is focused or clicked |
| errors | none — nothing throws, nothing warns, nothing logs |
| started | pre-existing; **predates 01-15**, proven in §4 |

## 2. Reproduction

Chromium 147, against the running Storybook on `:6006`,
`interaction-sortable--single-list`.

The first thing measured was the developer's exact gesture, and it **passed**:

```
click Task D, then Space   → active = Task D, dragging = ["Task D"]
                             spoken = "Draggable item task-d ... over ... task-d."
Tab x4 to Task D, Space    → dragging = ["Task D"]
.focus() Task D, Space     → dragging = ["Task D"]
```

Focus was never the problem. `document.activeElement` was Task D at every
keystroke, `tabIndex` was 0 on all five tiles, `aria-describedby` and `role` were
identical, and the same held on the docs page (28 tiles, six `DndContext`s). Four
of the five hypotheses in the brief were eliminated by that one measurement:
focus reaches the clicked tile, Space is not swallowed by a child, the ids are
distinct and correct (`task-a`…`task-e`, one per tile), and the spread order
clobbers nothing.

**What reproduces it is a two-step sequence, and the brief's list did not contain
it.** The list assumed a single gesture. The defect needs a prior one:

```
focus Task A, press Space          → dragging = ["Task A"]          (the wedge)
click Task D                       → active = Task D  BUT  dragging = ["Task A"]
press ArrowDown                    → "task-a was moved over ... task-b."
press Space                        → order = [Task B, Task A, Task C, Task D, Task E]
```

Focus is visibly on Task D. dnd-kit is still holding Task A. Every subsequent
keystroke moves Task A. **That is the bug report, verbatim.**

## 3. Root cause

`KeyboardSensor` opens a drag that only a key can close. Read from
`@dnd-kit/core@6.3.1`, `core.esm.js:1154`:

```js
attach() {
  this.handleStart();
  this.windowListeners.add(EventName.Resize, this.handleCancel);
  this.windowListeners.add(EventName.VisibilityChange, this.handleCancel);
  setTimeout(() => this.listeners.add(EventName.Keydown, this.handleKeyDown));
}
```

A document `keydown`, a window `resize`, a window `visibilitychange`. **Nothing
about the pointer and nothing about focus reaches the sensor.** So a keyboard
drag survives any click, any focus change, any scroll — indefinitely.

Three properties turn that into the reported symptom:

1. **`DndContext` refuses every new activation while a drag is held.** In
   `bindActivatorToSensorInstantiator`, `if (activeRef.current !== null || …)
   return`. The click on Task D therefore cannot start a drag of its own and is
   **discarded in silence**. That is why the symptom presents as *"it always
   drags the first item"* rather than as *"nothing happens"* — there is no error,
   no warning, and the interaction stays fully responsive while pointing at the
   wrong item.

2. **The announcer instructs the user straight into it.** Tab lands on the first
   tile, and Space there is exactly what the screen-reader instruction
   (*"To pick up a draggable item, press the space bar…"*) has just told them to
   do. So the very first action a keyboard user is told to take wedges the list.
   That is what makes this severe rather than obscure: the failure is on the
   opening move, and it is reached by following the instructions.

3. **DOM focus and dnd-kit's `active` silently diverge**, and only focus has a
   visible indicator. The user sees the focus ring on Task D and reasonably reads
   it as "Task D is what I am about to move".

Consequence for 01-15: the announcer was never wrong. *"Picked up Into the Mist.
Position 1 of 5"* was a truthful report of what dnd-kit was holding. It was the
holding that was wrong — which is precisely why an announcement is not evidence
about identity, and why the new tests read the resulting DOM order instead.

## 4. Is it pre-existing? — proven, not asserted

**Two independent lines of evidence.**

*By diff.* Everything 01-15 changed in `Sortable/index.tsx` (112 insertions,
3 deletions) is: two optional props on each of two interfaces, one `useMemo`
hook (`useDndAccessibility`), one `accessibility={…}` prop on each `DndContext`,
and comments. `git diff 5a83f18^ de015e5` contains **no** reference to
`useSensor`, `useSensors`, `KeyboardSensor`, `PointerSensor`,
`collisionDetection`, `coordinateGetter`, or any listener. It cannot have
introduced a sensor-lifecycle defect.

*By reproduction.* The pre-01-15 component (`git show 5a83f18^:…index.tsx`,
245 lines, **no announcer API at all**) was checked out into the tree and driven
by a temporary probe that reads dnd-kit's default live region rather than a
supplied announcer:

| tree | result |
|---|---|
| pre-01-15 (`5a83f18^`) | **FAIL** — `live region said: Draggable item a was dropped over droppable area a` |
| committed HEAD (`2bfc5da`) | **FAIL** — byte-identical message |
| with the fix | **PASS** |

Holding `a` and then clicking `c` left `a` held on the pre-01-15 component too,
and the next Space *dropped a* instead of picking up `c`. The defect predates
01-15 and is not a regression from it. 01-15's announcer made the wrong pick-up
*audible* for the first time, which is plausibly how the developer found it. The
probe was deleted; the tree is clean.

## 5. Why the existing test passed on a broken component

`tests/visual/sortable-announce.spec.ts` — all five cases:

```ts
await page.locator(TILE).first().focus();
await page.keyboard.press("Space");
```

and `Sortable.test.tsx` — all 29 cases, via a helper whose name is the whole
problem:

```ts
function focusFirstTile() {
	(document.querySelector(".ds-atom-sortable-item") as HTMLElement).focus();
}
```

**"The tile that was picked up" and "the first tile" were the same element in
every case in the library.** Reading `task-a` out of the live region was
therefore equally consistent with a correct component and with a component that
can only ever pick up index 0 — the assertion could not distinguish them. It was
not a weak assertion about the right thing; it was a strong assertion about a
quantity that carried no information.

Two further blind spots, both structural:

- **No case ever focused a tile that was not first.** Nothing in the suite could
  observe a mismatch between focus and `active`.
- **No case ever moved the pointer during a drag.** The wedge needs two
  interaction modalities in sequence, and every existing case used exactly one.

01-15 verified the keystroke sequence `focus → Space → ArrowDown → Space` in
Chromium and that verification was sound; it simply started from
`.first().focus()`, so the sequence it drove was the one path where a
first-item-only component is indistinguishable from a correct one.

## 6. The fix

`FocusScopedKeyboardSensor` (`src/interaction/Sortable/index.tsx`), registered in
place of `KeyboardSensor` in both `Sortable` and `SortableDndContext`. It adds
the two exits the sensor lacks:

- **a `pointerdown` outside the dragged tile**, and
- **a `Tab` off it**,

both **cancel** rather than drop. A click elsewhere says nothing about *where*
the item should go, so cancelling restores the order the user started with and
dnd-kit announces *"Dragging was cancelled"* through the live region that is
already there.

**Both triggers fire before focus has actually moved, and that ordering is
load-bearing.** dnd-kit's `RestoreFocus` re-focuses the dragged tile after a
keyboard drag ends *unless* `document.activeElement` is already the activator's
target (`core.esm.js:2712`). Cancelling while focus is still on the dragged tile
lets that guard suppress the restore **by itself** — no extra code. Capture-phase
`pointerdown` precedes the browser's focus default action, and `keydown` precedes
Tab's, so both satisfy it. Cancelling on `focusin` instead — which was the
obvious first design — yanks focus back to Task A the instant the user clicks
Task D: **the same defect wearing a different coat.**

**`accessibility.restoreFocus: false` was rejected as too broad.** It would fix
the yank by turning off focus restoration for *every* drag, including the ones
that need it (a keyboard reorder whose DOM node is replaced by reconciliation).

Two mechanisms inside the class deserve naming:

- **Cancellation goes through `props.onCancel()`, dnd-kit's own public
  `SensorProps` callback** — `createHandler(Action.DragCancel)`, which clears
  `activeRef`, dispatches `DragCancel`, and nulls `activeSensor`. Not a synthetic
  `Escape` keydown, which is the community-standard workaround: the sensor
  listens on the *document*, and `Modal`, `ConfirmDialog`, `Lightbox`,
  `CommandPalette`, `DSDropdown` and `useDismiss` all listen for Escape on the
  document too. A synthetic Escape would make a mere click close an enclosing
  Modal — and a `Sortable` inside a Modal is the admin's photo reorder.
- **The base sensor's stale document `keydown` listener is neutralised, not left
  live.** Its `detach()` is private and reachable only from its own handlers, so
  the props object the base holds is blanked instead (the base reads every
  callback and option off it on each keystroke). Without this, that stale
  listener sees the Space that starts the *next* pick-up and ends it
  immediately — the bug, restored one keystroke later. The exit callbacks are
  wrapped *before* `super()` so dnd-kit's own drop and cancel paths remove the
  guard's listeners too.

## 7. Three-way proof

The new tests assert the **identity** of the picked-up item — via a recording
announcer in vitest, and via the resulting **DOM order** in Chromium, which a
truthful announcement about the wrong item cannot fake.

| | vitest (Tests 30–33) | Chromium (4 cases) |
|---|---|---|
| **committed tree** (`2bfc5da`) | **2 failed** / 31 passed | **2 failed** / 2 passed |
| **fix present, sensor swap reverted** | **2 failed** / 31 passed | **2 failed** / 2 passed |
| **shipped** | **33 passed** | **4 passed** (3 consecutive runs) |

The pre-fix failure message is the bug stated as data:

```
AssertionError: the pointerdown outside the held tile must release it:
  expected [ 'start:a' ] to include 'cancel:a'
```

The two cases that pass on the broken tree are the ones that *should*: "Space
picks up the tile that has focus" (the coverage gap — correct behaviour that was
simply never asserted) and "the plain keyboard reorder is unchanged" (the
regression control, which a guard cancelling on *any* pointerdown would fail).
Test 33 is the matching negative control: a pointerdown **inside** the held tile
must not release it.

## 8. Regression checks, in the browser

- plain keyboard reorder `focus → Space → ArrowDown → Space` — works, and focus
  still lands on the moved tile afterwards (asserted, since the fix leans on
  `RestoreFocus` staying intact)
- `Escape` still cancels, order intact
- mouse drag still reorders
- pointerdown inside the held tile does not release it
- `SortableDndContext` (cross-list) unaffected

**Gates:** `npm test` **1942 passed / 123 files** (1938 + 4 new), `css:check`
**79 sheets byte-exact**, `typecheck` clean, `biome check` clean on 349 files.
`test:a11y`'s pre-existing red on `Data Display/Tabs › DarkMode` was not touched.

## 9. Findings raised, not fixed

1. **A plain click on a tile fires a whole phantom drag cycle.** `PointerSensor`
   is registered with no `activationConstraint`, so `pointerdown` starts a drag
   and `pointerup` ends it. Measured: clicking a tile speaks *"Draggable item
   task-d was dropped over droppable area task-d"*. A screen-reader user hears a
   spurious drop on every click. `activationConstraint: { distance: 4 }` is the
   standard remedy; it changes drag-start behaviour, so it is not a debug-session
   change.
2. **The cross-list keyboard reorder does not move anything.**
   `interaction-sortable--cross-list`, keyboard only: the announcements are
   correct end to end (*"t1 … dropped over droppable area t2"*) and the order
   never changes. **Confirmed pre-existing** — reproduced on the committed tree
   before any edit. Unverified hypothesis: `active.data.current.sortable.containerId`
   is undefined on that path, so the story's `handleMove` takes
   `activeListId === overListId` (undefined === undefined), picks `setDone` for a
   `todo` item, finds `oi === -1`, and returns `prev`. Worth confirming, since
   the admin's reorder is single-list and this is not on its critical path.
3. **Escape during a keyboard drag inside a Modal both cancels the drag and
   closes the Modal.** Both listen on the document, and the Modal's listener is
   registered first. Pre-existing, and the reason the fix does not synthesise
   Escape.

---

# ConfirmDialog — the two appearances, and the black rectangles

## Plain answer for the developer

> You are seeing two things at once, and only one of them is a dialog doing
> something unusual. Every ConfirmDialog story except one lifts its panel out to
> the end of the page when it opens, so it can sit above everything — those are
> the ones that look like a normal dialog floating over the docs. The one
> exception is the story called *Inline*, added in 01-16, which deliberately
> leaves the panel where it is written instead of lifting it out; that is the
> only story whose picture can contain the panel at all, which is why it is the
> one used for colour checks. So: same component, two rendering modes, both
> intentional. The cream colour is right, not a bug — charcoal's light theme uses
> cream surfaces, so a cream panel is what a correct charcoal dialog looks like.
> The black band is the dialog's own dimming layer: normally it covers the whole
> window, but inside a docs page it gets boxed into the story's own frame, so
> instead of dimming the page it paints a dark stripe across that one story. The
> open "Delete account" dialog is sitting across the middle of that stripe, which
> is why it reads as two black rectangles rather than one.

## What the rectangles actually are — measured

Reproduced the screenshot exactly: `overlays-confirmdialog--docs` under
`brand:charcoal`, light theme, with the TypeToConfirm dialog opened. There are
exactly **two** opaque dark regions on the page, and both are
`.ds-atom-modal-backdrop`, `rgba(0, 0, 0, 0.65)`, `position: fixed`:

| element | rect | parent |
|---|---|---|
| the open TypeToConfirm dialog's backdrop | `0,0 1200x1000` — full viewport | portaled to `document.body` |
| the **inline** story's backdrop | `121,576 958x84` — one story canvas | inside `.docs-story` |

Both panels measure `color(srgb 0.984 0.976 0.957 / 0.97)` — cream at 97%,
**correct for charcoal light**. So this is not a brand-tracking failure.

**The "two rectangles" are one element.** The inline story's 958x84 backdrop is
bisected by the foreground portaled panel sitting across its middle; the visible
left and right remainders read as two rectangles. And it reads as *solid* black
rather than a 65% veil because two backdrops stack there: 0.65 over 0.65 ≈ 0.88.

**Why it is boxed into the canvas** — the same story, same backdrop, two
contexts:

```
isolated story canvas : backdrop 1200x1000 at 0,0   containing block: NONE (viewport)
inside the docs page  : backdrop  958x84  at 121,672
                        containing block: div.css-sx1422 transform=matrix(1,0,0,1,0,0)
```

Storybook's docs canvas wrapper carries a transform for its zoom control. A
transform — even the identity matrix — makes an element the containing block for
`position: fixed` descendants, so the backdrop resolves against the canvas box
instead of the viewport. In its own story canvas the same backdrop is a correct
full-viewport dimmer.

## Verdict: not a defect to fix

- **Not DotGrid's always-dark canvas** — DotGrid is not on this page.
- **Not one of the five files pinning a white chrome backdrop** — the colour here
  is `rgba(0,0,0,0.65)`, brand-independent by design, and both panels track
  charcoal correctly.
- **It is the documented `inline` tradeoff.** `inline`'s own docstring says it
  *"reintroduces coupling to ancestor `overflow` / `transform` / `z-index` — see
  `DSPortal`'s `inline` prop, which documents the tradeoff in full."* A boxed
  backdrop is that coupling, observed.

Recorded as a follow-up rather than fixed: **an `inline` ConfirmDialog arguably
should not render a backdrop at all**, since it cannot be a full-viewport dimmer
by construction. That is a design change to the one story whose visual baseline
contains the panel (`tests/visual/confirm-panel.spec.ts` reads it in all four
brand x mode cells), so it belongs with 01-20's baselines, not a debug session.
