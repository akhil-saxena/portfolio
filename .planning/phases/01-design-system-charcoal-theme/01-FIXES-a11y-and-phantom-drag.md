---
status: resolved
findings: [E35, E36]
trigger: "test:a11y exits 1 on Data Display/Tabs › DarkMode; and every click on a Sortable tile speaks a phantom drop"
created: 2026-08-23
updated: 2026-08-23
commits:
  - f8f7aa6 fix(tabs) — opaque dark pill track
  - 004254f fix(tabs) — charcoal's --ink-inverse reaches the active pill label
  - a795f01 test(tabs) — browser contrast gate + token gate repair
  - ca6a74d fix(sortable) — PointerSensor activationConstraint
  - 87dee17 test(sortable) — click silence and real-drag gate
gates:
  npm test: 1944 passed / 123 files
  test:a11y: 508 passed / 84 suites — exit 0
  css:check: 79 sheets byte-exact
  typecheck: clean
  check: clean, 375 files
baselines_added_for_01_20: 0
---

# Fix 1 — `test:a11y` red on Tabs, and Fix 2 — the phantom drag cycle

Both landed. `test:a11y` **exits 0**. Two findings were raised and fixed that the
brief did not know about, and three more are recorded unfixed.

---

## 1. The verbatim axe failure

Reproduced before touching anything, against the developer's already-running
Storybook on `:6006` (reused rather than started, since `test:a11y` and
Playwright's `webServer` both want that port):

```
Data Display/Tabs > Dark Mode
Message:
 Found 1 a11y violations, run the test with 'a11y: { test: 'error' }' parameter to see the full report

┌─────────┬──────────────────┬───────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────┐
│ (index) │ id               │ impact    │ description                                                                                                      │ nodes │
├─────────┼──────────────────┼───────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────┤
│ 0       │ 'color-contrast' │ 'serious' │ 'Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds' │ 2     │
└─────────┴──────────────────┴───────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────┘

┌─────────┬──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┬────────────┐
│ (index) │ target                                           │ html                                                │ violations │
├─────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────────┼────────────┤
│ 0       │ '["#_r_7_-tab-analytics > .ds-atom-tabs-label"]' │ '<span class="ds-atom-tabs-label">Analytics</span>' │ '[0]'      │
│ 1       │ '["#_r_7_-tab-settings > .ds-atom-tabs-label"]'  │ '<span class="ds-atom-tabs-label">Settings</span>'  │ '[0]'      │
└─────────┴──────────────────────────────────────────────────┴─────────────────────────────────────────────────────┴────────────┘

  ● Data Display/Tabs › DarkMode › smoke-test
    assert.strictEqual(received, expected)
    Expected value to strictly be equal to: 0
    Received: 1
    Message: 1 accessibility violation was detected
```

Pre-fix full sweep: **507 passed, 1 failed, 508 total; 83 suites passed, 1
failed.** The Tabs DarkMode case was the *only* failure in the repository, so it
was the only thing standing between the branch and a green a11y gate.

axe's own numbers for both nodes, from `node.any[0].data`:

```
fgColor #919191   bgColor #2b2b2b   contrastRatio 4.49   expectedContrastRatio "4.5:1"
fontSize "9.8pt (13px)"   fontWeight "normal"
```

### The traced token — and the two things the trace corrected

Traced from the failing element's computed style back to the declaration, not
guessed:

- foreground `rgb(145, 145, 145)` = `#919191` = **`--ink-3`**, via
  `src/primitives.css` → `.dark .ds-atom-tabs-trigger { color: var(--ink-3) }`.
- background composited to `#2b2b2b`, and the ancestor chain is where the real
  cause is:

```
bgStack = [ div.ds-atom-tabs-list = rgba(255,255,255,0.055),   <- --surf-2
            div                   = rgba(31,31,31,1) ]         <- --cream-2
```

**Correction 1 — the failing labels are the *pill* variant's, not the underline
variant's.** Both nodes probe as `variant: "pill"`, `active: false`. The
underline strip on the same page measures 5.230 and passes. `--ink-3` is shared
by both variants; only the pill variant puts it on a raised track.

**Correction 2 — this is a DEFAULT-brand defect. Charcoal is not implicated.**
The brand was asserted at the probed element, both halves, per the E29 rule:

```
--ochre  = ""          (empty — charcoal declares #b0722a, so charcoal is NOT mounted)
--cream  = #181818     (default dark; charcoal declares #161616)
--ink-3  = #919191     (default dark; charcoal declares #b1aea8)
<html>   class="dark"  data-brand=(none)
```

The reason is in `.storybook/preview.tsx`: the global defaults are
`theme: "light"`, `brand: "default"`, and the DarkMode story overrides **only**
`theme`. Charcoal dark measures 5.966–8.177 on the same pairings and was never
at risk.

**The alpha trap was live here.** `--surf-2` is `rgba(255, 255, 255, 0.055)`.
Read as an opaque colour it is near-white and tells you nothing; composited by
hand over `--cream-2` it is `#2b2b2b`. This is exactly the 01-18 hazard, and it
is also why the existing token gate could not see the failure — see §6.

### 01-19.1 did not cause this

Stated plainly for the record, and measured rather than assumed. The translucent
track's contrast is a function of the surface behind it:

| track = `--surf-2` over | composites to | `--ink-3` ratio | |
|---|---|---|---|
| `--cream` `#181818` | `#252525` | **4.882** | pass |
| `--cream-2` `#1f1f1f` | `#2b2b2b` | **4.473** | FAIL |
| `--cream-3` `#2a2a2a` | `#363636` | **3.851** | FAIL |

AA held on the page and broke on both raised stops. The failure was latent in
the component from the moment the pill variant was written. Plan 01-19.1
converted 67 story files off hardcoded `className="dark"` wrappers, which put
this story on a `--cream-2` page — the middle row — and made a pre-existing
failure *reachable*. Same shape as E34 turning out to predate 01-15 rather than
being a regression from it.

---

## 2. The fix, and the option that was rejected

Two options were weighed with numbers, as the durable-vs-minimal tradeoff the
diagnosis opened up.

**Option A — make the track opaque at `--cream-3`. CHOSEN.**

| page | track | `--ink-3` ratio |
|---|---|---|
| `--cream` | `#2a2a2a` | 4.554 |
| `--cream-2` | `#2a2a2a` | 4.554 |
| `--cream-3` | `#2a2a2a` | 4.554 |

Page-independent by construction. 4.554 is *exactly* `--ink-3`'s own documented
floor on `--cream-3`, so the labels stop being a special case rather than being
granted an exception — the fix brings Tabs **into** the ramp's guarantee instead
of widening the guarantee to fit Tabs.

**Option B — keep the veil, brighten the label. REJECTED.** The minimum grey
clearing the worst cell (`#363636`) is `#9e9e9e`. Rejected on four measured
grounds:

- it is **still page-dependent** (4.530 / 5.262 / 5.743) — the next raised
  surface anyone adds reintroduces the bug silently;
- `#9e9e9e` sits at 158, exactly midway between `--ink-3` (145) and `--ink-2`
  (171) — 13 steps each way — collapsing the muted step;
- `.dark .ds-atom-tabs-trigger` is **shared with the underline variant**, so it
  recolours every dark tab label and erodes the de-emphasis gap from **2.69x to
  2.29x**;
- strictly larger baseline blast radius.

**Visual consequence to see at 01-20.** Opacity trades "always visibly raised"
for "always contrast-determinate". On a `--cream-3` page the track is now flush
with its background rather than 12 steps lighter. No story does that today (§5),
and a hairline ring would restore delineation if the developer wants it — noted,
not done, because it is a design addition.

Light mode is untouched: it measures 5.421–5.679 on all three stops. The
asymmetry is real, not convenience — a white veil under *light* text lowers
contrast, under *dark* text it raises it, so light is safe by construction.

### Before / after, inactive AND active

Measured in the browser, composited, after the fix (`axe color-contrast
violations = 0`):

| variant | label | active | fg | bg | before | after |
|---|---|---|---|---|---|---|
| pill | Analytics | no | `#919191` | `#2a2a2a` | **4.473 FAIL** | **4.554 PASS** |
| pill | Settings | no | `#919191` | `#2a2a2a` | **4.473 FAIL** | **4.554 PASS** |
| pill | Overview | **yes** | `#161616` | `#b0722a` charcoal / `#f59e0b` default | 4.402 charcoal FAIL | **4.555 / 8.143 PASS** |
| underline | Analytics | no | `#919191` | `#1f1f1f` | 5.230 | 5.230 unchanged |
| underline | Settings | no | `#919191` | `#1f1f1f` | 5.230 | 5.230 unchanged |
| underline | Overview | **yes** | `#ededed` | `#1f1f1f` | 14.079 | 14.079 unchanged |

**The gap survived, and it survived by construction rather than by luck: no
label colour changed at all in the default brand.** The underline
active/inactive ratio is 2.69x before and after. And in the pill variant the
distinction was never carried by lightness in the first place — the active pill
is an `--amber` **fill** with near-black ink, so an inactive pill label could not
be mistaken for active no matter how bright it got.

The pill `bgStack` after the fix is a single opaque entry, so there is no
compositing left in that path to get wrong.

---

## 3. Fix 1b — a second, independent contrast defect, found by the new gate

The browser gate failed on **charcoal dark** the first time it ran, on the
**active** pill label:

```
data-display-tabs--pill      [pill,active] "Overview": #1c1917 on #b0722a = 4.402
data-display-tabs--dark-mode [pill,active] "Overview": #1c1917 on #b0722a = 4.402
```

`.dark .ds-atom-tabs[data-variant="pill"] .ds-atom-tabs-trigger[data-active]`
set `color: #1c1917` as a **literal**. That hex *is* the default brand's
`--ink-inverse`, so hardcoding it meant charcoal's override could never reach the
rule — charcoal's `--amber` resolves to `--ochre` `#b0722a`, and `#1c1917` on it
is 4.402:1.

| | ink | on `--amber` | ratio | |
|---|---|---|---|---|
| default dark | `#1c1917` | `#f59e0b` | 8.143 | pass |
| charcoal | `#1c1917` | `#b0722a` | **4.402** | FAIL |
| charcoal, fixed | `#161616` | `#b0722a` | **4.555** | pass |

`#161616` is charcoal's `--ink-inverse`, and `charcoal.css` **already documents
that pairing as measuring 4.56 on `--ochre`** — the correct value was declared
and simply unreachable. `--ink-inverse` resolves to `#1c1917` in the default
brand, so the substitution is **byte-identical there** and moves no default-brand
rendering.

**Not `--amber-ink`**, which was the tempting choice and would have been a severe
regression: it is the ink for a *tinted* amber, and in default dark it is
`#f5c56b`, measuring **1.338:1** on a full-strength `--amber` fill.

The sibling light-mode rule already used `var(--ink-inverse, #000)`, so the
literal in the dark rule was an un-tokenised duplicate, not a deliberate
exception.

---

## 4. Fix 2 — the phantom drag

`PointerSensor` was registered with no `activationConstraint` in **both** sensor
lists — `Sortable` (line 296) and `SortableDndContext` (line 370) — so
`pointerdown` started a drag and `pointerup` ended it.

### The constraint chosen, and why

**`activationConstraint: { distance: 4 }`**, declared once as
`POINTER_ACTIVATION` and applied to both lists.

- **A radius, not a box.** Read from `@dnd-kit/core@6.3.1`, `core.esm.js:1043`:
  `hasExceededDistance` uses `Math.sqrt(dx**2 + dy**2) > measurement` for a
  numeric value, so any direction of travel past 4px activates.
- **`distance`, not `delay` + `tolerance`.** The delay form is the other
  documented remedy and is worse for this component: it puts latency in front of
  every *deliberate* drag in order to fix a problem caused by *accidental* ones.
  The admin's core gesture is reordering, so the deliberate path is the hot one.
- **Why 4.** Measured: a press meant to be a click travels 0–3px, and 4 is above
  that whole range. It is also below a real drag — 5px still activates — so the
  dead zone is imperceptible in a gesture that intends to move a tile.

### Live-region readings — the three the brief asked for

Read out of dnd-kit's own live region (`[id^="DndLiveRegion"]`), driving the
**fourth** tile of `interaction-sortable--single-list`, never the first, per
E34's lesson:

| gesture | before | after |
|---|---|---|
| **plain click (0px)** | `"Draggable item task-d was dropped over droppable area task-d"` | **`""` — silent** |
| 2px twitch | `"…task-d was dropped over…task-d"` | **`""` — silent** |
| 3px twitch | `"…task-d was dropped over…task-d"` | **`""` — silent** |
| 5px move | `"…dropped over…task-d"` | `"…dropped over…task-d"` (correct — that *is* a drag) |
| **short deliberate drag**, one tile down | `"…task-d was dropped over droppable area task-e"` | **same, plus order `A B C E D`** |
| **keyboard reorder** | pick-up `"…task-d was moved over…task-d."` → ArrowDown `"…moved over…task-e."` → `"…dropped over…task-e"` | **unchanged, order `A B C E D`** |

Both halves are shown, as demanded: the click is silent **and** real gestures
still announce and still reorder. Order is read from the DOM rather than trusted
from the utterance, because E34 established that the announcer was truthful while
the component held the wrong tile.

**One probe artefact worth recording, because it nearly became a false finding.**
My first keyboard measurement showed the reorder announcing correctly but *never
changing the order* — which looks exactly like E34's unfixed finding #2. It was
my probe: dnd-kit attaches the `KeyboardSensor`'s document `keydown` listener
inside a `setTimeout` (`core.esm.js:1154`), so an `ArrowDown` sent immediately
after `Space` is dropped on the floor. With a 250ms gap the reorder works. The
gate carries that gap and a comment saying why.

### E34 is intact

- `Sortable.test.tsx` — **33/33**, including E34's Tests 30–33.
- `sortable-keyboard-target.spec.ts` — **4/4**, including *"clicking another tile
  releases the held one, so the next Space picks up the tile that was clicked"*.
- `sortable-announce.spec.ts` — **5/5**.

That first spec passing is the load-bearing one: `FocusScopedKeyboardSensor`'s
release guard listens for `pointerdown` on the **document itself**, so it is
independent of whether `PointerSensor` activates. Adding the constraint could not
disarm it, and now that is asserted rather than assumed.

I also corrected a comment in `Sortable.test.tsx` that documented the phantom
drag as *live* ("PointerSensor is registered with no activation constraint, so
pointerdown alone starts a drag") and would otherwise have become false — the
exact "gate matched a comment" hazard, in its passive form.

---

## 5. Baselines for 01-20 — **zero additions**, one already-owed capture changes content

Measured, not reasoned. The suite was run twice — once on the shipped tree, once
with only this plan's two CSS hunks reverted (sha proven before and after) — and
the flagged sets were **byte-identical**:

```
run 1  SHIPPED tree   exit=1  flagged=68
run 2  PRE-FIX tree   exit=1  flagged=68   (primitives.css 217219fa56f7 -> 4f629f510086)
diff flagged-shipped flagged-prefix  ->  IDENTICAL
restored: sha MATCHES
```

So **this plan adds no story to 01-20's list.** The 68 mismatches and the 27
missing baselines are the pre-existing 27-owed / 72-moving accounting, untouched.

Then, to answer the pixel question exactly rather than by inference, all **508
stories** were scanned for the selector the fix actually targets:

```
render a pill Tabs in any mode (2):
  data-display-tabs--pill
  data-display-tabs--dark-mode
render a pill Tabs under .dark — the only ones the fix can repaint (1):
  data-display-tabs--dark-mode   (has an ACTIVE pill too)
```

**Conclusion for 01-20, named by story id:**

- **`data-display-tabs--dark-mode`** — the single story whose pixels this plan
  changes. Its pill track records `#2a2a2a` instead of `#2b2b2b`. It was
  **already** in the 68-mismatch set, so no count changes; only the content of a
  capture 01-20 already owed. Under charcoal it also picks up the `#161616`
  active-pill ink.
- `data-display-tabs--pill` — renders a pill but in light mode; **unaffected**,
  and verified clean in both runs.
- `interaction-sortable--single-list`, `--cross-list` — verified **clean in both
  runs**, confirming the activation constraint is behavioural and repaints
  nothing. (`interaction-sortable--dark` is in the pre-existing set for unrelated
  reasons.)

**One side effect I caused and reverted.** Playwright auto-creates missing
baselines on first run, so the two sweeps wrote the 27 files 01-20 owes. Those
are 01-20's to record deliberately, so I deleted all 27 (list preserved at
`scratchpad/run/deleted-27-baselines.txt`). Verified afterwards: **488 tracked
baselines, exactly as before, and zero tracked baselines modified.** They were
never committed.

---

## 6. Gates — every repair with its three-way proof

### 6a. THE DEFECTIVE GATE THAT LET THIS SHIP — `src/tokens.test.ts`

Defective gate #13, and the shape is **"unfailable in one direction."**

The case was named *"muted text steps clear AA (4.5:1) on **every surface**, in
both themes"* and its surface list was six **opaque** tokens:

```ts
const lightSurfaces = ["--cream", "--cream-2", "--cream-3", "--panel", "--bg", "--paper-deep"];
const darkSurfaces = lightSurfaces;
```

`--surf-2` and `--surf-3` are surfaces by role, back **29** `background` rules in
`primitives.css`, and in dark composite **lighter than `--cream-3`**. Neither was
in the list. The name claimed a coverage the list did not have.

**And adding them would not have helped, which is the real defect.**
`luminance()` called `.replace("#","")` then `parseInt` on slices of whatever
string it got. Proven empirically, not asserted:

```
luminance("rgba(255, 255, 255, 0.055)")  = NaN
contrast("#919191", that)                = NaN
the caller's guard is `ratio < 4.5`      -> NaN < 4.5 === false
```

So the surface was not measured leniently — **it was not measured at all, and the
gate reported no failure.** Adding `--surf-2` to the list would have looked like
closing the gap while measuring nothing.

**Three-way proof of the repair**, on the real file, edit verified by sha:

| | result |
|---|---|
| old parser, `--surf-2` added to the list | **0 failures reported — silent pass** |
| new parser, `--surf-2` added to the list | **exit 1**, `luminance(): "rgba(255, 255, 255, 0.055)" is translucent (alpha 0.055). Composite it onto a backdrop with flatten(colour, backdrop) first…` |
| repaired gate, correct usage | **110 passed** |

The repair goes further than parsing, because parsing alone was still a trap:
read alpha-blind, `--surf-2` reports `--ink` at **1.17:1** — a confident number
about a surface painted nowhere. So `luminance()` now **refuses** any alpha < 1
and callers must go through `flatten(colour, backdrop)`, which makes the backdrop
an explicit argument instead of an assumption. An unparseable colour throws too.

Also: name narrowed to *"every **OPAQUE** surface stop"*; a new case measures the
translucent stops **composited**; and `--ink-3`/`--ink-4` on a dark veil are
recorded as a **known boundary with their numbers** (3.85 on `--surf-2` over
`--cream-3`, 3.44 on `--surf-3`) rather than silently widened. Widening them was
declined precisely because it would have made the gate **unpassable on a correct
fix** — the three-times-seen failure shape.

A note on the composite helper: `tokens.test.ts` **already contained** an `over()`
compositor, one `describe` block away, in `inset surface visibility`. The
capability existed; the contrast gate just never used it.

### 6b. NEW GATE — `tests/visual/tabs-label-contrast.spec.ts`

All 8 Tabs stories x 4 brand-mode cells. Walks each label's ancestor chain,
composites every translucent layer to the first opaque one, asserts 4.5:1.
Brand asserted at the probed element, **both halves** (`--ochre` *and* a
neutral), per E29.

It asserts **two** things, and the second exists because of what the first
cannot distinguish:

1. the composited ratio clears 4.5:1;
2. **in dark, the surface behind the label is opaque.**

*What could the ratio assertion alone not distinguish?* "Safe on every surface"
from "safe on the surface this story happens to use." On the default `--cream`
page the broken track measured 4.882 and **passed**. A ratio-only sweep was one
story away from proving nothing — the same shape as E34, where every case focused
the first tile so "the tile picked up" and "the first tile" were the same
element.

**Three-way proof**, every control's edit proven by sha before/after and restored
from a `cp` backup with the sha re-verified:

| control | exit | detail |
|---|---|---|
| track reverted to `--surf-2` | **1** | default dark **and** charcoal dark; 6 messages |
| active ink reverted to `#1c1917` | **1** | charcoal dark only, 4.402 x2 |
| both reverted (true pre-fix) | **1** | 8 messages, incl. 4.473 and 4.402 |
| **shipped** | **0** | 4/4 |

**WALK-THROUGH ATTEMPT — DEFEATED.** Pre-fix tree *plus* the story's decorator
moved off the raised page (`--cream-2` → `--cream`). The ratio failures vanish,
exactly reproducing how the defect originally hid — and **the gate still fails**,
on the opacity assertion. It cannot be walked through by finding a friendlier
page.

Control A also proves the two assertions are independent: on the pre-fix tree
`data-display-tabs--pill` passes the ratio (4.88) and **fails the opacity check**,
while charcoal dark passes the ratio (6.459) and fails opacity too.

### 6c. NEW GATE — `tests/visual/sortable-click-silence.spec.ts`

Six Chromium cases, driving the **fourth** tile.

*What could "the click is silent" alone not distinguish?* A component that can no
longer drag at all — `distance: 400` satisfies it. So every silence case is
paired with one driving a real gesture to a **changed DOM order**, and the 4px
radius is pinned from **both** sides. A single mid-range probe would be satisfied
by any threshold between 1px and the probe distance, carrying no information
about the value that shipped.

| control | exit | detail |
|---|---|---|
| constraint removed (pre-fix) | **1** | the 3 silence cases fail; the 3 positive cases pass |
| weakened to `distance: 0` | **1** | only the 3px case fails — **pins from below** |
| **`distance: 400` (walk-through)** | **1** | clicks silent, but the 5px and real-drag cases **fail** — **pins from above** |
| **shipped** | **0** | 6/6 |

The `distance: 400` control is the one that matters, and it is the brief's own
test: *a constraint large enough to silence clicks but which breaks a genuine
short drag is not a fix.* The gate refuses it.

Only silence is asserted for the cross-list context, because E34 recorded that
its *keyboard* reorder does not move anything — pre-existing and unrelated — so
asserting a completed cross-list move would fail for a reason this fix does not
own.

### 6d. Which controls are non-inert

Both negative controls had their edits **proven to land by sha** before the run,
per the 01-18 lesson where three controls silently measured an unmodified file
after bash ate `$1` inside a `perl -i` substitution. Every mutation in this plan
was made by Python with an assert-exactly-one-occurrence guard, never by a shell
in-place edit.

| negative control | edit proof | gate | verdict |
|---|---|---|---|
| `.ds-atom-tabs-panel` padding `16px` → `17px` (light-only, unrelated) | `217219fa56f7 → 8c009084d0be` | **exit 0** | **non-inert**: the file demonstrably changed and the gate correctly ignored it |
| rename `POINTER_ACTIVATION` → `POINTER_ACTIVATION_RENAMED` (3 sites, behaviour identical) | `203e601321f1 → efd7e53e701c` | **exit 0** | **non-inert**: sha changed, gate stayed green |

Neither gate is a blanket "any edit to this file fails" detector. All restores
were verified byte-identical to the shipped tree.

### 6e. A gate caught *me*, and it is worth recording

Two of my first drafts of the token repair failed the existing *"defines every
custom property referenced anywhere in src"* case — first for a `var(--nope)`
string literal in an assertion, then for the token syntax appearing inside a
**comment**. That is the documented `declaredIn()` behaviour (it does not strip
comments) working as intended, and it is the same class of hazard as 01-19.1's
hand-rolled comment stripper desyncing on the apostrophe in `don't`. The final
comment avoids naming the syntax at all and says why.

---

## 7. Findings raised, NOT fixed

**F1 — `check-contrast.mjs` does not exist.** `src/themes/charcoal.css` cites it
twice as a live gate: line 131 *"check-contrast.mjs reproduces"* and line 326
*"check-contrast.mjs asserts that failure DIRECTIONALLY — if `--ochre` ever
starts passing the text bar everywhere, the check fails and says so."* Searched
the whole repo: **no such file, and nothing references it outside those two
comments.** A phantom gate — prose asserting a guarantee that nothing enforces.
The `--ochre`-must-keep-failing invariant it claims to protect is currently
unprotected.

**F2 — `test:a11y` never sweeps the charcoal brand.** This is the most important
finding here. `.storybook/preview.tsx` defaults `brand: "default"`, and axe runs
per story at whatever globals the story declares. No story sets
`brand: "charcoal"`. So **the a11y gate that must be green for this release does
not assess the brand the release ships.** Fix 1b is the proof: a real 4.402:1 AA
failure in charcoal that `test:a11y` reported as green, found only because the
new browser gate sweeps all four cells. A charcoal pass of the axe sweep belongs
in 01-20 or 01-21.

**F3 — the same literal-ink-on-amber pattern is in two more components.**
Measured in the browser with the brand asserted at the element
(`--ochre=#b0722a`), not inferred from the CSS:

| component | selector | default (both modes) | charcoal (both modes) |
|---|---|---|---|
| DatePicker | `.ds-atom-datepicker-cell.is-selected` | 8.143 pass | **4.402 FAIL** |
| SplitButton | `.ds-atom-split-primary[data-variant="primary"]` | 8.143 pass | **4.402 FAIL** |
| Tabs (fixed, control) | `.dark …pill…[data-active]` | 8.143 pass | **4.555 pass** |

Note these are **not** `.dark`-scoped, so they fail in charcoal **light as well
as dark** — four failing cells each, wider than Tabs'. The repair is the same
one-line substitution (`#1c1917` → `var(--ink-inverse)`), byte-identical in the
default brand. Left unfixed deliberately: they are separate components with their
own baselines, they need their own gate, and the scope boundary says report
rather than sprawl. `inputs-datepicker--dark-mode` and
`interaction-splitbutton--dark-mode` are both already in the pre-existing
68-mismatch set. `primitives.css` has further hardcoded `#1c1917` at lines 827,
868, 1124–1133 and 5040 that were not assessed.

**F4 — `--ink-3` on a translucent surface is unsafe library-wide in dark**, not
just in Tabs: 3.851 on `--surf-2` over `--cream-3` and 3.437 on `--surf-3` over
`--cream-3`. Now recorded as a tested boundary in `tokens.test.ts` rather than an
unexamined gap, and the component-level invariant (muted text must not sit on a
translucent surface in dark) is asserted for Tabs only. The other 29 `--surf-*`
background rules were not audited for muted text.

**F5 — the light-mode pill track is still translucent** (`--surf-2` at 0.55).
It measures 5.421–5.679 and is safe by construction in light, so it was left
alone; but it retains the same page-dependence in principle.

---

## 8. Gates, final

| gate | result |
|---|---|
| `npm test` | **1944 passed / 123 files** (1942 + 2 new in `tokens.test.ts`) |
| **`test:a11y`** | **508 passed / 84 suites — EXIT 0** (from 507/508, exit 1) |
| `css:check` | **79 sheets, round-trip byte-exact** |
| `typecheck` | clean |
| `check` (biome) | clean, 375 files |
| `tabs-label-contrast.spec.ts` | 4/4 |
| `sortable-click-silence.spec.ts` | 6/6 |
| E34 `sortable-keyboard-target.spec.ts` | 4/4 |
| `sortable-announce.spec.ts` | 5/5 |
| new baselines owed by this plan | **0** |

`test:a11y` was driven as `DS_TEST_MODE=a11y test-storybook --url
http://localhost:6006` — the exact inner command of the npm script — against the
developer's already-running Storybook, because `start-server-and-test` would try
to bind a second server to the contested port 6006. The only difference is who
started the server.

Tree is clean apart from the known-harmless `?? design_handoff/…`. The scratch
probe `probe-a11y.mjs` was deleted; all other probes live outside the repo.

---

## 9. Paste-ready CHANGELOG wording for 01-20

```markdown
### Fixed

- **Tabs**: the dark pill track is now an opaque `--cream-3` instead of the
  translucent `--surf-2`. The inactive labels' contrast previously depended on
  whatever surface the strip sat on — 4.88:1 on the page but 4.47:1 and 3.85:1 on
  the two raised stops — and failed WCAG AA on both. It is now 4.55:1 wherever
  the strip is used. No label colour changed, so the active/inactive
  de-emphasis is unchanged.
- **Tabs**: the active pill label now uses `var(--ink-inverse)` instead of a
  hardcoded `#1c1917`. That literal was the default brand's own value, so a
  brand override could not reach it; on charcoal's ochre fill it measured
  4.40:1. It is now 4.56:1 on charcoal and byte-identical on the default brand.
- **Sortable**: a plain click on a tile no longer runs a whole drag cycle.
  `PointerSensor` had no activation constraint, so `pointerdown` started a drag
  and `pointerup` ended it — which, with the drag announcer, spoke a spurious
  "was dropped over" into the live region on every single click. Pointer drags
  now activate after 4px of travel. Keyboard reordering is unaffected.
```

---

## 10. What I would tell the developer, in one paragraph

> Both are fixed and the accessibility gate is green for the first time. The tab
> one turned out to be more interesting than it looked: the failing labels were
> the pill variant's, and the real cause was that the strip's background was a
> see-through white film, so its contrast changed depending on what was behind
> it — it happened to pass on the plain page and fail on the two raised ones.
> Making that background solid fixes it everywhere at once, and I did not touch
> the label colours at all, so an inactive tab still looks exactly as dimmed as
> before. While gating that I found a second, worse one: the active pill's text
> colour was written as a raw hex that happened to be the default theme's value,
> which meant charcoal could never override it and the charcoal version was
> failing too. Same one-line kind of fix. Two things you should know: the
> accessibility sweep has never actually tested the charcoal theme — only the
> default one — so that second bug was invisible to it, and the same raw-hex
> mistake is still present in the date picker and the split button. Neither is
> mine to fix here, but both should be before you publish. The click-that-speaks
> bug is gone; a click is now silent, and dragging and keyboard reordering both
> still work and still announce.
