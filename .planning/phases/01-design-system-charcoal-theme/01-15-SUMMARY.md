---
phase: 01-design-system-charcoal-theme
plan: 15
subsystem: design-system
tags: [e8, g-13, sortable, dnd-kit, announcements, live-region, accessibility, passthrough, keyboard]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 14
    provides: the "unfailable in both directions" gate class (repaired here in a fourth variety — a pre-existing comment satisfying a whole-file grep), the comment-stripping idiom, the 9-baseline count this plan increments, and the "a control can pass in RED by coincidence" discipline
  - phase: 01-design-system-charcoal-theme
    plan: 07
    provides: the `{n} of {total}` one-based announcement format this plan matches, so two components in one library do not announce position two different ways
provides:
  - "$DS/src/interaction/Sortable/index.tsx — `announcements` and `screenReaderInstructions` on BOTH `SortableProps` and `SortableDndContextProps`, forwarded through one shared `useDndAccessibility` hook onto dnd-kit's `accessibility` prop"
  - "$DS/src/index.ts — `Announcements` and `ScreenReaderInstructions` re-exported from @dnd-kit/core, so a consumer types an announcer without adding dnd-kit itself"
  - "$DS/src/interaction/Sortable/Sortable.test.tsx — 13 new vitest cases (16 -> 29), including the four-callback lifecycle driven by keyboard in jsdom"
  - "$DS/src/interaction/Sortable/Sortable.stories.tsx — AnnouncedReorder, the reference announcer a consumer copies"
  - "$DS/tests/visual/sortable-announce.spec.ts — 5 Chromium cases driving a keyboard reorder and reading the effect-mounted live region, with explicit non-vacuity and staleness guards"
affects: [01-16 E9 portal/SSR family, 01-20 charcoal baselines (count now TEN) + v2.0.0 changelog, 01-21 publish, Phase 4/5 admin photo reorder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read the LIBRARY's type, not the plan's prose description of it. `DndContext` has no top-level `announcements` prop at all — both live under `accessibility` — so the plan's literal wording would not have compiled. Same class as 01-14's non-existent `density=\"compact\"`, one level further out: the drift was between the plan and a third-party .d.ts"
    - "When two events write to ONE live region, the last one wins and the first is inaudible. dnd-kit fires onDragStart then immediately onDragOver on the self-collision, so the utterance a user hears after pick-up is onDragOver's. An announcer that replaces only onDragStart is a fix that changes nothing audible"
    - "Return `undefined` from an announcement callback to leave the previous utterance standing. dnd-kit's `announce` ignores null/undefined rather than clearing — that is the whole mechanism for suppressing the self-collision without duplicating the pick-up text"
    - "Forward `undefined` for the whole options object when every member is absent, so the props the wrapped component receives are identical to what they were before the passthrough existed. `{}` is not equivalent: dnd-kit's members are REQUIRED, so `{}` throws and the region is never written — silence plus an unhandled error"
    - "A `not.toContain(...)` assertion on text read from an effect-mounted node is vacuous until the text is asserted non-empty. Every read in the spec goes through a helper that asserts truthiness first, and a second helper that requires the text to have CHANGED — otherwise a keystroke that fell on the floor re-asserts the previous sentence"
    - "jsdom drives dnd-kit's whole announcement lifecycle — pick up, drop AND cancel — but only across a macrotask tick, because the sensor attaches its post-activation listener asynchronously. What jsdom cannot do is complete a MOVE: every rect is 0x0, so ArrowDown is a no-op"

key-files:
  created:
    - ../design-system/tests/visual/sortable-announce.spec.ts
  modified:
    - ../design-system/src/interaction/Sortable/index.tsx
    - ../design-system/src/interaction/Sortable/Sortable.test.tsx
    - ../design-system/src/interaction/Sortable/Sortable.stories.tsx
    - ../design-system/src/index.ts

key-decisions:
  - "The passthrough target is dnd-kit's `accessibility={{ announcements, screenReaderInstructions }}`, NOT two top-level DndContext props. `DndContext` has no top-level ones; the plan's task-1 behaviour wording is describing the effect, and taken literally it is a type error"
  - "Absent props forward `accessibility={undefined}`, built once in a `useMemo`, so a consumer who passes neither prop gets byte-identical props to the pre-plan component. Measured: `{}` throws `announcements.onDragStart is not a function` and the live region stays empty"
  - "The nested no-op is documented on both props (option (a)), not warned about (option (b)) — this library ships no dev-mode warnings anywhere else. Asserted behaviourally (the parent's announcer speaks, the child's marker never appears) AND as a source fact"
  - "The reference announcer suppresses the self-collision in `onDragOver`, not by rewriting `onDragStart`. Fixing onDragStart alone is inaudible, which is the practical consequence of G-13's misattribution"
  - "Position is `{n} of {total}`, one-based, full-stop terminated — 01-07's `Lightbox` idiom. The noun differs (`position` vs `Image`) because the subject differs; the unit, the base and the terminator do not"
  - "The announcer lives in the STORY, not in the library. The plan's `files_modified` scopes it there and a shipped default announcer would be a second set of defaults competing with dnd-kit's"
  - "No `@layer`, no density block, no touch-target change — protocol §9. The `IconButton`/`--row-h` family stays Phase 06.1's"
  - "CHANGELOG.md was NOT written — 01-20 owns it. This plan is additive: NO `BREAKING CHANGE:` footer, and the paste-ready wording is below"

patterns-established:
  - "Pattern: a whole-file case-insensitive grep for a common English word is never a gate. `grep -qiE 'position'` on Sortable.stories.tsx was satisfied pre-plan by the comment `// Items appear in stable positions`, and once this plan lands it is satisfied five more ways — including by the docstring that QUOTES the defect. Repaired to require an INTERPOLATED `position ${…} of ${…}` in comment-stripped code, which prose cannot satisfy"
  - "Pattern: a negative control that removes the FIX rather than breaking the TEST reproduces the original finding verbatim. NC-4 dropped the story's two props and printed G-13's three quoted strings character-for-character — an independent reproduction of the Phase 0 measurement, in this repo, in this plan"
  - "Pattern: when a plan says an assertion is impossible in jsdom, test the claim. Space/Space/Escape all reach dnd-kit's KeyboardSensor under jsdom once a macrotask tick separates them, which moved four announcement callbacks from 'browser only' into `npm test`"

requirements-completed: [DS-01]

# Metrics
duration: 35min
completed: 2026-08-19
---

# Phase 01 Plan 15: Sortable's announcer passthrough Summary

**Two props on two components let a consumer replace what a reorder says — and the plan's own
description of dnd-kit's API was wrong in four places, including the one that decides the fix:
the "moved over itself" utterance G-13 attributes to the pick-up event is `onDragOver`'s, so an
announcer that replaces only `onDragStart` would have shipped, type-checked, passed every gate,
and changed nothing a screen reader says.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-19 16:01 IST
- **Completed:** 2026-08-19 16:36 IST
- **Tasks:** 2 of 2
- **Files modified:** 5 (1 created) — 793 insertions, 5 deletions
- **Tests:** Sortable 16 → **29**; `npm test` 1,682 → **1,695**; `test:a11y` 490 → **491**; new Playwright spec **5** cases
- **Negative controls executed:** 7, every mutation restored from a `cp` backup and verified by `shasum -a 256`

## Task Commits

| # | Hash | Message |
|---|---|---|
| 1 (RED) | `6adeb61` | `test(sortable): add failing announcer-passthrough and defaults-unchanged probes` |
| 1 (GREEN) | `5a83f18` | `feat(sortable): expose the dnd-kit announcer so reorders can speak titles and positions` |
| 1 (docs) | `de015e5` | `docs(sortable): state what an empty announcer actually does, as measured` |
| 2 | `b416fbd` | `test(sortable): ship a reference announcer story and drive it by keyboard in Chromium` |

`charcoal-theme` is **40** commits ahead of `main`, tracked-clean, `git stash list` empty.

The third commit is comment-only, in two files already committed, and exists because a negative
control falsified a claim I had written in a shipped comment. It is separate rather than amended so
the correction is legible as a correction.

---

## The before/after, measured by keyboard in Chromium 147

Three ways, because the "before" deserved an independent reproduction rather than a transcription.

### Before — dnd-kit's defaults on the UNMODIFIED component

Run against `interaction-sortable--single-list` **before a line of this plan was written**, driving
`focus → Space → ArrowDown → Space` with `page.keyboard` and reading `[id^="DndLiveRegion"]`:

| keystroke | live region |
|---|---|
| `Space` | `Draggable item task-a was moved over droppable area task-a.` |
| `ArrowDown` | `Draggable item task-a was moved over droppable area task-b.` |
| `Space` (drop) | `Draggable item task-a was dropped over droppable area task-b` |

### Before — the same defaults on the photo ids, via NC-4

NC-4 removed the two props from the new story and re-ran the spec. The output is **G-13's three
quoted strings, character-for-character**:

| keystroke | live region |
|---|---|
| `Space` | `Draggable item abstract-intothemist was moved over droppable area abstract-intothemist.` |
| `ArrowDown` | `Draggable item abstract-intothemist was moved over droppable area abstract-lightscameraart.` |
| `Space` (drop) | `Draggable item abstract-intothemist was dropped over droppable area abstract-lightscameraart` |

That is an independent reproduction of the Phase 0 measurement — same repo, same component, a
different session and a different harness — and it is what makes the "after" column evidence rather
than assertion.

### After — the reference announcer the story ships

| keystroke | live region |
|---|---|
| `Space` | `Picked up Into the Mist. Position 1 of 5. Use the arrow keys to move it, then press space to drop.` |
| `ArrowDown` | `Into the Mist moved to position 2 of 5, over Lights, Camera, Art.` |
| `Space` (drop) | `Dropped Into the Mist at position 2 of 5.` |

All three measured defects closed, each asserted separately:

| defect | before | after | asserted by |
|---|---|---|---|
| speaks a raw record id, never a title | `abstract-intothemist` | `Into the Mist` | `toContain("Into the Mist")` **and** `not.toContain(id)` for all five ids, on all three utterances |
| speaks no position at all | — | `position 1 of 5` → `2 of 5` | `/position \d+ of 5/i` on all three, plus the pick-up/move positions asserted **different** so it cannot report a move that did not move |
| pick-up says it moved over ITSELF | `…item X was moved over droppable area X.` | `Picked up Into the Mist.` | `not.toMatch(/moved over/i)`, `toMatch(/^Picked up /)`, and the title counted **once** not twice |
| drop has no full stop | `…droppable area abstract-lightscameraart` | `…at position 2 of 5.` | `text.endsWith(".")` on all three |

### The position phrasing, against 01-07's

01-07's `Lightbox` announces `Image {position} of {total}. {alt}` — measured there as
`Image 2 of 3. Harbour wall`. This plan keeps the **unit** (`{n} of {total}`), the **base**
(one-based) and the **terminator** (full stop) and changes only the noun: `position 2 of 5` rather
than `Image 2 of 5`, because in a reorder the item is the subject of the sentence and the position
is what changed, where in a lightbox the image *is* the position. Same idiom, no drift.

---

## Plan premises that turned out false

**Seven.** Four of them are about dnd-kit's actual API, read out of
`node_modules/@dnd-kit/core/dist/**/*.d.ts` and `core.esm.js` rather than from the plan's prose.

### 1. `DndContext` has NO top-level `announcements` prop — both live under `accessibility`

The plan's task-1 behaviour reads *"`<Sortable announcements={a}>` passes `a` to the DndContext it
renders"*, and its `<interfaces>` block describes the types without saying where they attach.
`DndContext.d.ts` is unambiguous:

```ts
export interface Props {
	id?: string;
	accessibility?: {
		announcements?: Announcements;
		container?: Element;
		restoreFocus?: boolean;
		screenReaderInstructions?: ScreenReaderInstructions;
	};
	…
}
```

`<DndContext announcements={a}>` is a **type error**. Shipped as
`accessibility={accessibility}` on both components, built once by a shared hook.

This is 01-14's `density="compact"` lesson one level further out: there the plan restated a union
that existed in the repo; here it restated the shape of a **third-party** declaration file.
`key_links` happens to say *"dnd-kit's DndContext accessibility prop"*, which is right — and the
behaviour bullets it is supposed to describe are not.

### 2. `Announcements` has FIVE members, not four, and `onDragStart` does not receive `over`

The plan: *"a record of callbacks — `onDragStart`, `onDragOver`, `onDragEnd`, `onDragCancel` — each
receiving an event with `active` / `over`"*. The declaration:

```ts
export interface Announcements {
	onDragStart({ active }: Pick<Arguments, 'active'>): string | undefined;
	onDragMove?({ active, over }: Arguments): string | undefined;   // ← absent from the plan
	onDragOver({ active, over }: Arguments): string | undefined;
	onDragEnd({ active, over }: Arguments): string | undefined;
	onDragCancel({ active, over }: Arguments): string | undefined;
}
```

`onDragStart` gets `Pick<Arguments, 'active'>` — **no `over`**. And `onDragMove` exists and is the
only optional member. Both mattered: the reference announcer is contextually typed off
`Announcements`, so writing `over` in `onDragStart` would not compile, and the four required members
are why the next premise falls over.

### 3. An empty announcer does not "replace the defaults with silence" — it throws

The plan names the hazard as silence and the threat register calls it denial of service. Measured
under NC-3, which substituted `{}` for `undefined`:

```
TypeError: announcements.onDragStart is not a function     (×4 unhandled)
5 failed | 24 passed (29)
  → expected '' to be 'Draggable item a was moved over droppable area a.'
```

Because every member except `onDragMove` is required and dnd-kit calls them unguarded, `{}` is a
**compile error** in TypeScript and, forced past it, throws inside dnd-kit's monitor dispatch — so
the live region is never written at all. The audible result *is* silence, with an unhandled error
behind it, which is strictly worse than the plan's description. The disposition is unchanged; the
mechanism is now recorded accurately, in the shipped comment (`de015e5`) as well as here.

### 4. The "moved over itself" utterance is `onDragOver`'s, not the pick-up event's — and this one decides the fix

G-13 and the plan both say *"the **pick-up event** announces the item as having moved over itself"*.
dnd-kit's default `onDragStart` says nothing of the kind:

```js
onDragStart(_ref) { let { active } = _ref; return "Picked up draggable item " + active.id + "."; }
```

What happens is that a drag start immediately produces a collision of the active item with **its own
droppable**, `onDragOver` fires in the same commit, and it overwrites `onDragStart`'s message in the
one live region they share. The **text** G-13 records is right; the **event** is wrong.

That is not pedantry — it is the fix. An announcer that replaces only `onDragStart` type-checks,
satisfies every gate in the plan, and changes nothing a user hears, because `onDragOver` still
overwrites it a frame later. The reference announcer therefore returns `undefined` from `onDragOver`
on the self-collision, which leaves the pick-up utterance standing (dnd-kit's `announce` ignores
null/undefined rather than clearing).

Pinned permanently as Test 21, and isolated by **NC-5**, which removed only the self-collision guard:

```
AFTER Space  "Into the Mist moved to position 1 of 5, over Into the Mist."
Expected pattern: /^Picked up /
```

### 5. dnd-kit's live regions are NOT portaled — so `test:a11y` does see them

The task brief warned that `npm run test:a11y` scans no portaled content and that dnd-kit's live
regions are portaled, so the a11y suite could not verify the announcer. Reading `Accessibility`:

```js
return container ? createPortal(markup, container) : markup;
```

`container` comes from `accessibility.container`, which this library never sets. Measured in
Chromium: `insideStorybookRoot: true` for the live region and for the `aria-describedby` target.
Pinned by the spec's fifth case, and `test:a11y` reports **491 passed** with
`Sortable.stories.tsx` PASS.

The verification was still done by keyboard in a real browser as instructed — the *reason* is just
different from the one given. The regions **are** absent from the initially-parsed HTML (mounted in
an effect), which is the half that is true and the half that makes an unguarded query vacuous; the
spec asserts that too, by fetching the raw document and checking `DndLiveRegion` does not appear in
it.

### 6. `SortableDndContext` produces ONE live region, not two

G-13's *"a page with two `DndContext`s gets two `aria-live="assertive"` regions"* is true of the
Phase 0 sketch and **not** of this library's cross-list story. Measured on
`interaction-sortable--cross-list`: `{"count":1,"ids":["DndLiveRegion-0"]}`. The nesting sentinel is
why — two `Sortable`s inside a `SortableDndContext` render **no** `DndContext` of their own. Two
regions require two *standalone* `Sortable`s. Recorded, not fixed: it is dnd-kit's architecture
either way, and the correction narrows who is exposed to it.

### 7. jsdom can drive the whole announcement lifecycle

Not a plan claim so much as a reasonable assumption I started with and then tested. Space, Space
again and Escape all reach dnd-kit's `KeyboardSensor` under jsdom — but only if a **macrotask tick**
separates them, because the sensor attaches its post-activation document listener asynchronously.
Without the tick, Escape and the drop are silently lost and the region still holds the pick-up text,
so an assertion would read a stale utterance:

```
without a tick:  P2 escape → "Draggable item a was moved over droppable area a."   (unchanged)
with a tick:     E2 escape → "Dragging was cancelled. Draggable item a was dropped."
```

That moved all four callbacks into `npm test`. What jsdom genuinely cannot do is complete a **move**:
every `getBoundingClientRect` is 0×0, so `sortableKeyboardCoordinates` finds no rect below the active
one, ArrowDown is a no-op and `over` never becomes anything but the active item itself — which is
exactly the announcement that matters most, and why the Playwright spec is not optional.

### Premises that held — checked, not assumed

| Premise | Verdict |
|---|---|
| `Sortable`'s prop surface is `{ items, onReorder, renderItem, id, className, style }`, no passthrough, no rest-spread | **TRUE**, all six and nothing else |
| Two places render a `DndContext`, both need the passthrough | **TRUE** — `Sortable` (standalone) and `SortableDndContext` |
| A nested `Sortable` renders no `DndContext`, so its prop is a no-op | **TRUE** — `if (hasParentDnd) return listContent;` at line 221 of the original |
| Both build sensors identically | **TRUE** — `PointerSensor` + `KeyboardSensor` with `sortableKeyboardCoordinates`, verbatim in both |
| The keyboard path works and must not be touched | **TRUE** — untouched, and now pinned twice (Test 29 in jsdom, a full reorder in Chromium) |
| dnd-kit substitutes `defaultAnnouncements` / `defaultScreenReaderInstructions` when nothing is passed | **TRUE** — `core.esm.js:88,91`, default-parameter destructuring |
| The default drop message lacks a full stop where the other two have one | **TRUE** — measured, and pinned as a literal in the defaults regression case |
| `SortableItemData`'s index signature means a consumer can already put a title on an item | **TRUE** — the story hangs `title` off it |
| 01-07's `Lightbox` format is `Image {position} of {total}. {alt}` | **TRUE** |
| `@dnd-kit/core` is already a dependency, so re-exporting its types is safe | **TRUE** — a real `dependencies` entry (`^6.3.1`), not a dev or peer one, so a consumer resolves them transitively. Verified in the built artifact: `dist/index.d.ts:87` re-exports both, and `dist/components/Sortable.d.ts` declares both props on both interfaces |
| Re-exporting rather than redeclaring makes a dnd-kit bump a typecheck failure | **TRUE** by construction |

---

## Gates repaired

Six consecutive plans now. **One repair this time, of the worst class 01-14 named** — unfailable in
both directions, and satisfied by a comment nobody wrote on purpose.

### Task 2, gate 2 — a whole-file grep for a common English word

```bash
grep -qiE 'position' "$DS/src/interaction/Sortable/Sortable.stories.tsx" || { echo "FAIL: …"; exit 1; }
```

**Already green before the plan started.** What satisfies it on the pre-plan file:

```
210:// Items appear in stable positions - no transform spring on drag.
```

A pre-existing comment on the `ReducedMotion` story, which has nothing to do with announcements.
Exactly 01-14's `Pagination`-in-a-rule-comment defect in a new substrate: *case-insensitive grep of a
whole file for a common word*. And it gets worse once this plan lands — the fix-disabled file
satisfies it **five** ways, including via the docstring that has to quote *"never 'position 2 of 5'"*
in order to state the defect at all. So the forbidden-adjacent literal is again a substring of
something the same task is required to document.

Demonstrated in both directions rather than argued:

| stories file state | plan's gate | repaired gate |
|---|---|---|
| pre-plan (no announcer) | **PASS** — cannot fail | FAIL — *no interpolated position/total; n=0* |
| shipped, with the announcer's two props DELETED | **PASS** — cannot detect a regression either | FAIL — *no story passes announcements* |
| shipped | PASS | PASS — *n=4* |

Repaired to assert on **generated structure rather than prose**, the same move 01-14 made: strip
comments, then require an *interpolated* position-and-total inside a template literal, which no
comment and no static string can satisfy, plus an actual `announcements={` prop on a story:

```bash
code=$(sed -e 's://.*::' "$sf" | perl -0777 -pe 's{/\*.*?\*/}{}gs')
n=$(printf '%s' "$code" | grep -oiE 'position \$\{[^}]+\} of \$\{[^}]+\}' | wc -l)
[ "$n" -ge 1 ] || FAIL
printf '%s' "$code" | grep -q 'announcements={' || FAIL
```

`grep -o … | wc -l` rather than `grep -c`, per protocol §7.

### The other four gates were sound — each premise checked against the pre-plan tree

| Gate | Pre-plan | Verdict |
|---|---|---|
| T1 g1 `npx vitest run src/interaction/Sortable --reporter=verbose` | 7 failed / 22 passed | sound |
| T1 g2 `announcements` / `screenReaderInstructions` present, no `{...rest}`, comments stripped | both **absent** → correctly FAILS | sound. Strengthened, not repaired: added an occurrence count of `accessibility={accessibility}` (expects **2**), because "the word appears" would pass with only one of the two components wired |
| T1 g3 `Announcements|ScreenReaderInstructions` in `src/index.ts` | **absent** → correctly FAILS | sound |
| T2 g1 `npx playwright test tests/visual/sortable-announce.spec.ts` | file absent → exit 1 | sound. The plan's own §7a note about `--grep` taking one argument is why it names a file; it is right |
| T2 g3 the four sibling gates | — | sound |

**One incidental confirmed:** `--reporter=basic` is not a valid vitest reporter in this repo —
`Error: Failed to load custom Reporter from basic`, exit 1, **zero tests collected**. The plan uses
`verbose` throughout, which is correct.

---

## Negative controls run

**Seven.** Every mutation restored from a `cp` backup and verified byte-identical by `shasum -a 256`.
No `git checkout --`, no `git stash`, no `git reset`, no `git clean`, no `git worktree`.

| # | What was broken | Result |
|---|---|---|
| **NC-0** | Pre-plan `index.tsx` restored, i.e. the exact tree of the RED commit | **7 failed / 22 passed (29)** — Tests 17, 18, 19, 24, 25, 27, 28. Restored: `0ed65f2b…` |
| **NC-1** | `accessibility` dropped from `Sortable`'s own `DndContext` | **3 failed** — `expected 'Draggable item a was moved over dropp…' to be 'ZQX grabbed a.'` Restored: `0ed65f2b…` |
| **NC-2** | `accessibility` dropped from `SortableDndContext`'s shared `DndContext` | **3 failed** — including `to be 'PARENT grabbed a.'` Restored: `0ed65f2b…` |
| **NC-3** | Absent props forward `{}` instead of `undefined` | **5 failed / 24 passed** — the five "defaults unchanged" cases, all `expected '' to be …`, plus **4 unhandled `TypeError: announcements.onDragStart is not a function`**. Restored: `0ed65f2b…` |
| **NC-4** | The story's two props deleted (the announcer removed, the passthrough intact) | **2 failed**, and it printed G-13's three verbatim strings. `Expected pattern: not /moved over/i` / `Received: "Draggable item abstract-intothemist was moved over droppable area abstract-intothemist."` Restored: `5d5932f0…` |
| **NC-5** | The story's `onDragOver` no longer suppresses the self-collision | **1 failed** — `Received: "Into the Mist moved to position 1 of 5, over Into the Mist."`, `Expected pattern: /^Picked up /`, and the title counted twice. Restored: `5d5932f0…` |
| **NC-6** | The "Ignored when nested" sentence deleted from the `announcements` docstring | **1 failed** — Test 28, `expected '/**\n\t * Replaces what a screen read…' to match /ignored/i`. Restored: `bc255c80…` |

### Why none of these could have passed by accident

The brief's point: *a control can pass in RED by coincidence, and one did.* Each control here is
attributable by construction, and the mechanism is different for each group.

- **NC-1, NC-2 (custom announcer reaches the DndContext).** The expected strings are built from the
  markers `ZQX` / `PARENT` / `CHILD`, which **share no substring with any dnd-kit default**. There is
  exactly one code path that can put `ZQX` into a live region — the passthrough — so a pass cannot
  come from anywhere else, and the observed failure text is the *default*, naming precisely what
  took its place. The converse also holds: the defaults cases cannot accidentally read a marker.
- **NC-3 (the regression guard).** Tests 20, 21, 22, 23, 26 and 29 **pass in RED**, by construction —
  they assert that behaviour is *unchanged*, and in RED it trivially is. The RED run is therefore no
  evidence about them at all, which is 01-14's NC-3 lesson applied prospectively. NC-3 is the only
  evidence they bite, and it is decisive: five of the six flip to failing, each with
  `expected '' to be …`, and the sixth (Test 26, the live-region count) is a structural precondition
  that NC-3 does not touch and NC-0/NC-2 do.
- **NC-4 (the story announcer).** Cannot pass by coincidence because the assertion is not "some text
  appeared" but "the raw record id `abstract-intothemist` does **not** appear" — and the id is
  produced *only* by dnd-kit's default template. Critically, this assertion would be vacuous against
  an empty live region, which is why every read asserts non-emptiness first (see below); NC-4's
  failure is the region holding the *default* string, not holding nothing.
- **NC-5 (defect 3 in isolation).** The single most coincidence-prone control, and the one designed
  hardest against it. Removing the self-collision guard changes **only** the pick-up utterance; the
  move and the drop are byte-identical, and it still speaks a title and a correct position, so every
  other assertion in the suite stays green. Only the two assertions aimed at defect 3 fail — the
  phrasing (`/^Picked up /`) and the duplicate-naming count. A pass there cannot come from the title
  fix or the position fix, because both are still present and still asserted.
- **NC-6 (documentation).** A single sentence removed from a single docstring; the slice asserted is
  anchored to the JSDoc block that opens immediately before the declaration, so no other comment in
  the file can satisfy it.

### The vacuous-pass trap this spec was written against, and the bug it caught in my own test

The plan flags one route to a vacuous pass (querying the live region before the effect mounts it).
There is a second the plan does not name: **a keystroke that does nothing leaves the previous
sentence in the region**, so an assertion aimed at step *N* silently re-asserts step *N−1*. Both are
guarded — `spoken()` asserts the text is truthy before returning it, and `spokenAfter(previous)`
polls until the text has *changed*.

That second guard immediately earned itself. The reorder case pressed
`Space` / `ArrowDown` / `Space` back to back and the list **did not move**:

```
Expected: "Lights, Camera, Art"
Received: "Into the Mist"
```

Not a component bug — dnd-kit activates the sensor and attaches its move listener across a frame, so
three immediate presses lose the ArrowDown. The same asynchrony as the jsdom tick in premise 7,
observed independently in a browser. Fixed by pacing the presses through `spokenAfter`, which is what
the announcement cases already did — which is exactly why they passed while this one failed, and why
a spec without a change-detecting read would have shown three green announcements over a list that
never moved.

Two further self-inflicted defects the tests caught before they could ship:

1. **Test 28 sliced the docstring from the previous member's semicolon** — and prose contains
   semicolons (`…forward the announcer; pass it to the…`), so it read a fragment and failed on the
   fixed file. Re-anchored to the JSDoc opener.
2. **`type Page = Parameters<Parameters<typeof test>[1]>[0]["page"]`** ran fine under Playwright
   (which does not typecheck) and produced **11 `tsc` errors**. Playwright green + typecheck red is a
   shape worth naming: the sibling gate caught what the runner could not.

---

## Verification

| Plan verification item | Result |
|---|---|
| `npx vitest run src/interaction/Sortable` passes all six behaviours | **PASS** — **29/29**. All six have named cases; behaviour 6's full reorder is in the browser spec because jsdom cannot complete a move (premise 7) |
| A Playwright keyboard-driven reorder reads the live region and finds a title and a one-based position, and no raw record id | **PASS** — **5/5** in Chromium. Title, `position N of 5`, all five ids excluded, all three utterances terminated, and the DOM order asserted to have actually changed |
| `Announcements` and `ScreenReaderInstructions` are re-exported from `src/index.ts` | **PASS** — and verified in the **built** artifact: `dist/index.d.ts:87`, with both props on both interfaces in `dist/components/Sortable.d.ts` |
| No rest-spread onto `DndContext` | **PASS** — and `accessibility={accessibility}` occurs exactly **2** times in comment-stripped code, so both components are wired, not one |
| All four sibling gates pass | **PASS** — `npm test` **1695/1695** in 116 files; `npm run check` clean (353 files); `npm run typecheck` clean (both projects); `npm run css:check` **75 files**, byte-exact |
| `npm run test:a11y` (not required by the plan; run because the brief questioned whether it sees the live regions) | **PASS** — **491/491** in 82 suites, exit 0, `Sortable.stories.tsx` PASS. The regions are not portaled, so the suite does see them |
| `npm run build` green and the passthrough survives into `dist/` (not required; checked) | **PASS** — exit 0; `npm test` re-run after the build with **no skipped suites**, so `packaging.test.ts` genuinely ran against the fresh `dist/` |
| No existing visual baseline moved (not required; checked) | **PASS** — 487 captured, **0** pixel-mismatch failures, 10 missing-baseline errors only |

### `<human-check>` — still outstanding

The plan's human check asks for VoiceOver or NVDA. **Not performed** — no screen reader was driven.
What was done instead is the strongest available substitute: the live region's text content read out
of a real Chromium after each keystroke, which is the string a screen reader is handed. The
`aria-live="assertive"` / `role="status"` / `aria-atomic="true"` attributes and the
`aria-describedby` wiring are asserted too, so the delivery mechanism is verified even though the
speech is not. Worth doing once with VoiceOver on `interaction-sortable--announced-reorder`.

---

## Storybook baselines 01-20 must record — the measured list is now **TEN**

01-14 measured nine. This plan adds one, measured by running the suite rather than counted from
SUMMARYs:

| Story id | Owed by | Introduced in |
|---|---|---|
| `overlays-lightbox--responsive-gallery` | 01-11 (flagged), story from 01-07 | `c198985` |
| `patterns-formvalidation--field-required-marker` | 01-11 | `e24f865` |
| `patterns-formvalidation--field-error-severity` | 01-11 | `e24f865` |
| `patterns-formvalidation--anchored-error-summary` | 01-11 | `e24f865` |
| `layout-appbar--anchor-navigation` | 01-12 | `82a61f9`…`ae3d50c` |
| `layout-footer--compact-with-links` | 01-12 | `ae3d50c` |
| `layout-appshell--with-banner` | 01-13 | `3f69b6d` |
| `layout-appshell--with-banner-and-footer` | 01-13 | `3f69b6d` |
| `data-display-datagrid--compact-unselectable` | 01-14 | `4230b9a` |
| **`interaction-sortable--announced-reorder`** | **01-15** | `b416fbd` |

Mine renders five photo cards with an `announcements` object and `screenReaderInstructions` supplied.
Its **static** appearance is a plain sortable list — the announcer is invisible at rest, so the
baseline is cheap and stable; the two live-region elements it adds are `display: none` and
`clip-path: inset(100%)` respectively.

### No existing baseline moved — measured

```
visual baselines: captured 487, skipped 4 time-dependent
10 x  "A snapshot doesn't exist at …, writing actual."
 0 x  pixel-mismatch failures
```

Zero comparison failures across all 487, **including the four existing Sortable baselines**
(`--single-list`, `--cross-list`, `--reduced-motion`, `--dark`). That is the visual half of "passing
nothing keeps today's behaviour exactly": those four stories pass neither prop, so they forward
`accessibility={undefined}` and render identically.

**The run wrote the 10 missing PNGs** (Playwright writes on first miss and fails once). All 10 were
untracked, and all 10 were removed **by explicit path**, each checked against
`git ls-files --error-unmatch` first so a tracked file could not be deleted by mistake. **No
`git clean`.** The snapshot directory is `diff`-clean against its pre-run inventory — 488 files
before, 498 during, 488 after, identical file lists.

---

## CHANGELOG wording for 01-20

Not written here: `01-20-PLAN.md` owns `CHANGELOG.md` and this plan's `files_modified` does not list
it. **This change is purely additive — there is no `BREAKING CHANGE:` footer on any of the four
commits**, and the four that already exist for v2.0.0 are unaffected. Exact wording to paste:

```markdown
- **`Sortable` and `SortableDndContext` accept `announcements` and
  `screenReaderInstructions`.** Both are forwarded to dnd-kit; omitting them
  keeps dnd-kit's defaults exactly, so nothing changes for existing callers.

  Those defaults are not silence, and that is the problem: they speak the raw
  record id, no position at all, and describe a pick-up as a move over the item
  itself —

  ```
  Draggable item abstract-intothemist was moved over droppable area abstract-intothemist.
  ```

  Supply an announcer to say something a person can act on. `Announcements` and
  `ScreenReaderInstructions` are re-exported from the package, so you do not need
  `@dnd-kit/core` as a direct dependency to write one:

  ```tsx
  import type { Announcements } from "@akhil-saxena/design-system";
  ```

  Two things to know before writing one. The utterance heard immediately after
  pick-up comes from **`onDragOver`**, not `onDragStart` — the active item
  collides with its own droppable the moment a drag begins and overwrites the
  pick-up message — so returning `undefined` from `onDragOver` for that
  self-collision is what stops "moved over itself"; returning `undefined` leaves
  the previous utterance standing rather than clearing it. And every member
  except `onDragMove` is required: a partial object will not compile, and an
  empty one throws on the first drag rather than muting the announcer.

  `Sortable.stories.tsx` → `AnnouncedReorder` is a reference implementation that
  speaks a title and a one-based `position N of M`, matching what `Lightbox`
  announces.

  A `Sortable` nested inside a `SortableDndContext` renders no `DndContext` of
  its own, so **its** `announcements` is ignored — pass the announcer to the
  `SortableDndContext`.
```

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **G-13's own text needs two corrections, and one of them is load-bearing.** The register says the
   pick-up event announces a move over itself; it is `onDragOver`, and the practical consequence is
   that a plan written against the register would fix the wrong callback and change nothing audible.
   It also says a page with two `DndContext`s gets two live regions, which is true of two standalone
   `Sortable`s and **false** of a `SortableDndContext` with two nested ones (measured: one region).
   Not edited — the register states a fixed denominator and §10 forbids it — but whoever reads G-13
   next should read this section beside it.

2. **`Sortable` has no `announcements` default of its own, deliberately, and no consumer will know
   the defaults are bad.** The library now exposes the fix but ships dnd-kit's defective defaults as
   the out-of-the-box behaviour. A shipped default announcer would be a second set of defaults
   competing with dnd-kit's and it is out of scope, but it is the obvious next question and the story
   is currently the only place the answer lives.

3. **Two `aria-live="assertive"` regions per page with no way to share one** — unchanged from G-13,
   for the standalone case. dnd-kit's `Accessibility` mounts one per `DndContext` with no shared-region
   option; the only lever is `accessibility.container`, which relocates a region rather than merging
   them. dnd-kit's architecture, not this library's. Recorded, not restructured.

4. **The live regions are absent from the SSR'd HTML** — asserted in the spec by fetching the raw
   document and checking `DndLiveRegion` does not appear. Same family as E9's portal problem
   (plan 01-16) but it is dnd-kit's effect-mounted markup, not this library's. Out of scope, and the
   practical consequence is only that a test must wait rather than query.

5. **`assertive` is the wrong politeness for a reorder, and it is not configurable.** dnd-kit
   hardcodes `ariaLiveType = "assertive"` in `@dnd-kit/accessibility`'s `LiveRegion` and `DndContext`
   exposes no way to change it. Every keystroke of a 36-item drag interrupts whatever the screen
   reader was saying. 01-07 chose `polite` for `Lightbox`'s slide announcements — deliberately, and
   for the same kind of stream — so the two components are now inconsistent on politeness for a
   reason neither of them controls. Fixing it means either a dnd-kit change or replacing its
   `Accessibility` component wholesale.

6. **`SortableDndContext`'s `handleDragOver` is an empty callback with a comment where the logic
   should be** (`// cross-list overId tracking handled by parent state if needed`). Not touched — the
   plan forbids it and it is not in the finding — but it means a cross-list announcer's `onDragOver`
   is the only thing in that component that knows an item crossed a list boundary, and it has no
   access to the destination list's `id` except through `over.data.current.sortable.containerId`. The
   reference announcer is single-list for that reason; a cross-list one is harder than it looks.

7. **`dataGridPresets`-style export was NOT needed here, but the asymmetry is worth noting.** 01-14
   had to export a preset because it removed behaviour. This plan adds behaviour, so the reference
   announcer can live in a story. If a second component ever needs the same title-and-position
   phrasing, the phrasing itself should become an exported helper rather than a third copy — that is
   how the 01-07/01-15 format agreement would stop being a convention maintained by hand.

8. **`.mjs` files are still outside the pre-commit hook's `lint-staged` glob** — carried forward from
   01-14 finding #2, unchanged and still unowned. Not hit by this plan (nothing here is `.mjs`), and
   recorded so the count of plans that have observed it keeps rising.

9. **The concurrent-`.planning`-commit hazard did not bite this time.** 01-13 lost a draft to it and
   01-14 measured 177 intervening commits (a mismeasurement, per the brief — the real figure was the
   user's own doc-only session). This SUMMARY was written in one pass and committed with a
   specific-path `git add`, per the standing rule.

---

## Deviations from plan

### Auto-fixed / decided without asking

1. **[Rule 1 — plan premise wrong] The passthrough target is `accessibility={{ … }}`, not two
   top-level `DndContext` props.** The plan's literal wording is a type error. Shipped through one
   shared `useDndAccessibility` hook so the two call sites cannot drift.
2. **[Rule 1 — plan premise wrong] `onDragStart` receives only `active`, and `Announcements` has a
   fifth member.** The reference announcer is contextually typed off `Announcements` so neither can
   be got wrong silently.
3. **[Rule 1 — plan premise wrong] The self-collision utterance is `onDragOver`'s.** The fix targets
   `onDragOver`; targeting `onDragStart` alone would have been inaudible. Pinned (Test 21) and
   isolated (NC-5).
4. **[Rule 1 — plan gate already green] Task 2 gate 2's `grep -qiE 'position'`** matched a pre-existing
   comment on the pre-plan file and matches five things once the plan lands. Repaired to require an
   interpolated position/total in comment-stripped code; proven to fail on the pre-plan file **and**
   with the fix disabled.
5. **[Rule 1 — bug in my own test] Test 28 sliced the docstring at the previous semicolon**, and
   docstring prose contains semicolons. Re-anchored to the JSDoc opener.
6. **[Rule 1 — bug in my own spec] A broken `Page` type alias** passed under Playwright and produced
   11 `tsc` errors. Replaced with `import { type Page } from "@playwright/test"`.
7. **[Rule 1 — bug in my own spec] Three back-to-back keystrokes lost the ArrowDown.** Paced through
   the change-detecting read, which is also the guard against re-asserting a stale utterance.
8. **[Rule 2 — missing critical functionality] The spec asserts the live region is non-empty before
   asserting anything about its content.** The plan's `not.toContain(rawId)` is vacuously true
   against an empty region, and the region is effect-mounted. Also added the change-detection guard,
   which the plan does not name and which caught deviation 7.
9. **[Rule 2] `screenReaderInstructions` is demonstrated in the story too, not only `announcements`.**
   The plan's task-2 action names only the announcer; shipping the passthrough with half of it
   undemonstrated would leave a consumer to guess the shape of `{ draggable: string }`.
10. **[Rule 2] `SortableDndContext` gets both props, with its own docstrings** that say it is the
    right place for a cross-list announcer — the inverse of the nested no-op note, so a reader
    arriving at either component is told where the announcer belongs.
11. **[Rule 2] The task-1 gate was strengthened to count `accessibility={accessibility}`** (expects
    exactly 2). The plan's `grep -q 'announcements'` passes with only one of the two components wired,
    which is precisely the failure NC-1 and NC-2 exist to detect.
12. **[Rule 2] The built artifact was checked, not just the source.** `dist/index.d.ts:87` and
    `dist/components/Sortable.d.ts` carry the re-export and both props; `@dnd-kit/core` was confirmed
    to be a real `dependencies` entry, without which the re-export would break every consumer's
    typecheck while passing every gate in this repo.
13. **[Rule 1 — my own shipped comment was wrong] `{}` "throws" understated it.** Corrected in
    `de015e5` to say it throws *and* the region is never written, so the user gets silence with an
    unhandled error behind it. NC-3 is the measurement.
14. **Task boundaries kept, plus one extra commit.** RED / GREEN / docs-correction / story+spec. The
    docs commit is comment-only and separate so the correction reads as a correction.
15. **The story is `AnnouncedReorder` and uses the finding's own record ids**
    (`abstract-intothemist`, `abstract-lightscameraart`), which is what let NC-4 reproduce G-13's
    quoted strings character-for-character instead of paraphrasing them.

### Deferred (explicitly, with reasoning)

- **`@layer` / cascade layers (D-28), the `data-density` axis (D-32 / G-2) and the `F-15-7`
  control-geometry floors** — protocol §9, Phase 06.1. Nothing here touches CSS at all.
- **`assertive` → `polite` for the live region** — not configurable through dnd-kit; see finding 5.
- **A shipped default announcer** — see finding 2.
- **The two dnd-kit architectural observations** — findings 3 and 4, recorded as dnd-kit's, not this
  library's, exactly as the plan required.
- **`CHANGELOG.md`** — 01-20's. Wording above; **no `BREAKING CHANGE:` footer**, this is additive.
- **VoiceOver / NVDA** — the plan's `<human-check>`; see Verification.

### Rule 4 (architectural) — none raised

Nothing required a structural change. Sensors, `collisionDetection`, `arrayMove`,
`verticalListSortingStrategy`, `useReducedMotion` and `SortableItem`'s transform logic are all
byte-identical to their pre-plan form; the only edits inside the two components are the destructured
props, one hook call each, and one attribute each on the `DndContext` element.

---

## Self-Check: PASSED

```
FOUND: src/interaction/Sortable/index.tsx              FOUND: 6adeb61
FOUND: src/interaction/Sortable/Sortable.test.tsx      FOUND: 5a83f18
FOUND: src/interaction/Sortable/Sortable.stories.tsx   FOUND: de015e5
FOUND: src/index.ts                                    FOUND: b416fbd
FOUND: tests/visual/sortable-announce.spec.ts
FOUND: dist/index.d.ts:87  export { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
FOUND: dist/components/Sortable.d.ts  announcements?: / screenReaderInstructions?: on both interfaces
ABSENT (correctly): tests/visual/tmp-*.spec.ts, src/interaction/Sortable/tmp-*.test.tsx
tests/visual/storybook.spec.ts-snapshots: 488 files, diff-clean against pre-run
restored files match the green snapshot: index.tsx bc255c80…, stories 5d5932f0…, test 872d1706…, spec 26763f3a…
$DS working tree: tracked-clean; git stash list: empty; charcoal-theme +40
```
