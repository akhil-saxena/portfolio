---
phase: 0
slug: design-ideation
artefact: responsive-contract
status: draft — awaiting the confirm-or-override answers in §10
created: 2026-08-17
origin: >
  OFF-PLAN. Added by direct user direction mid-phase, after plans 00-09 and 00-10 were
  built. There is no PLAN.md for this document.
extends: 00-UI-SPEC.md §"Viewport and mode contract", §Density Contract (both invariants),
  §"Screenshot record"
supersedes:
  - D-39 (case studies tiered by depth) — one tier now
invalidates_as_built:
  - 00-10 (two templates, two stacked routes)
  - 00-09 §X-home-act2 (does not implement the new landing behaviour)
  - 00-17 (screenshot contract assumes two viewports)
leaves_open:
  - 00-11 (three by-eye verdicts unanswered; artefacts about to change)
---

# Phase 0 — Responsive Device Contract

> The six-class device contract, mode and density resolution per class, and the technical
> constraints a full-viewport scroll design must satisfy.

## Why this document exists, and why it exists *now*

The user's direction (recorded verbatim-in-substance in `00-PUBLIC-DESIGN-NOTES.md`
§"Responsive direction") makes responsive behaviour across phone, tablet, foldable and
laptop a **hard requirement** and introduces a **two-state, full-viewport Home landing**.
Neither was a requirement when plans 00-09 and 00-10 were built.

It exists *before* the admin sketches (00-12 → 00-16) rather than after them because those
five sketches have not been built yet. A responsive contract written after them would be a
retrofit, and a retrofit of a full-viewport scroll design across six aspect ratios is
exactly the kind of work that produces a per-screen special case instead of a rule. The
user's approved sequencing was explicit: **"Responsive spec, then admin, then public
rework."** This is the first of those three.

**It is a written contract only.** No code, no `.playground/` change. Every number below is
either quoted from `00-UI-SPEC.md`, measured from the built sketches during this session, or
derived with the derivation stated inline. Derivations that should be reviewed rather than
assumed are collected in **§10 Confirm-or-override**.

## What it extends, and the one thing it does not contradict

`00-UI-SPEC.md` §"Viewport and mode contract" is a **three-row** table over two viewports:

| Class | Mode | Density | Viewport |
|-------|------|---------|----------|
| `S- E- T- O-` (admin, desktop) | charcoal **LIGHT** (D-08) | `compact` | 1440 × 900 |
| `P- R-` (admin, phone) | charcoal **LIGHT** | **`comfortable`** (44px touch floor) | 390 × 844 |
| `X-` (public) | charcoal **DARK** | `comfortable` | 1440 × 900 + 390 × 844 |

**All three rows survive this document unchanged.** Admin stays light — *"sketching the
admin in dark mode is an anti-pattern, not a preference: the light palette is where
DS-02/DS-03's contrast failures live, and dark hides them."* Public stays dark. Phone stays
`comfortable`. Desktop stays `compact`.

What changes is the **derivation**, not the values. UI-SPEC's density invariant 2 states the
rule as a *breakpoint* rule — *"`data-density="compact"` MUST NOT apply below the phone
breakpoint"* — and §2 below shows that with six classes a breakpoint rule is provably
insufficient. The replacement rule resolves density by **pointer type**. Under the pointer
rule, 1440 is a fine pointer and 390 is a coarse pointer, so **UI-SPEC's three rows are a
correct special case of the new rule**. That is why this is an extension and not a
correction.

Both density invariants are carried verbatim and are load-bearing throughout:

1. **Density never changes type size.** Only spacing and control geometry.
2. **`compact` must never cross the 44px touch floor.**

---

## §1 — The six-class device matrix

Approved by the user, "as proposed", including the folded cover screen.

| # | Class | Width band (CSS px) | Canonical capture | Aspect | Primary pointer | Gutter (§3) | Content width at canonical |
|---|-------|--------------------|-------------------|-------:|-----------------|------------|---------------------------:|
| 1 | **Foldable, folded (cover screen)** | 344–374 | **344 × 882** | 0.39 | coarse | `--space-4` 16 | **312px** |
| 2 | **Phone portrait** | 360–430 | **390 × 844** | 0.46 | coarse | `--space-6` 24 | **342px** |
| 3 | **Foldable, unfolded** | 673–884 | **841 × 768** | **1.10** | coarse | `--space-8` 32 | **777px** |
| 4 | **Tablet portrait** | 768–834 | **768 × 1024** | 0.75 | coarse | `--space-8` 32 | **704px** |
| 5 | **Tablet landscape / small laptop** | 1024–1280 | **1024 × 768** | 1.33 | **ambiguous** | `--space-12` 48 | **928px** |
| 6 | **Laptop / desktop** | 1440+ | **1440 × 900** | 1.60 | fine | `--space-12` 48 | **1344px**, capped by §3 |

Classes 1 and 2 overlap by design: a 360–374px viewport could be either a small phone or a
cover screen, and **nothing in the design needs to tell them apart** — they get the same
treatment, which is why the overlap is harmless rather than ambiguous. The narrowest real
target in the whole matrix is **344px**, and every arithmetic check below is run against it.

**The aspect band, and the one class that matters.** Full-viewport transitions must hold
from **~0.39** (cover screen) to **~1.80** (a 1440 × 800 laptop window). Class 3 is the
case that breaks naive designs, for a reason that is not just "it sits in the middle":

> **Class 3 is the only class whose aspect band contains 1.0**, and it is the only class
> that can **cross 1.0 without a navigation** — unfolding takes a 344px viewport to ~841px
> in one frame, and rotating the unfolded device crosses 1.0 again. Its band runs roughly
> 0.81 (unfolded portrait, ~673 × 830) to ~1.35 (unfolded landscape, ~884 × 653).

The consequence is stated in §6, and it is stronger than a width constraint: **any layout
decision that branches on aspect ratio will flip mid-gesture on a foldable.** So no layout
decision in this contract branches on aspect ratio. The canonical 841 × 768 gives 1.095 and
is the single most demanding capture in the matrix.

*Derivation note on the heights.* The width bands are the user's approved matrix. The
canonical heights are the standard viewport heights for each class's representative
hardware; only the widths are contractual. The heights exist so that §5's height-budget
arithmetic has a number to work against, and any height within ~±10% of the canonical
leaves that arithmetic's conclusions unchanged. They are **derived, not measured from
devices in hand** — flagged in §10.

---

## §2 — Density is resolved by pointer type, not by width

**This is the finding the six-class matrix forces, and it is first-class.**

### The derivation

UI-SPEC's density invariant 2 is a width rule. Apply it to class 5:

- A **1024px-wide laptop browser window** is a fine pointer. `compact`'s 30px controls and
  32px table rows are correct there — that is the whole point of the axis, and the admin's
  primary user is at a laptop.
- A **1024px-wide tablet in landscape** is a coarse pointer. A 30px control is **14px below
  the 44px touch floor** (UI-SPEC §Spacing exception 1, D-09). `compact` there is a
  regression, not a density.

**Same width. Opposite correct answer.** No width threshold can separate them, because
width is not the variable that differs. Therefore:

> **Width alone cannot decide density. `pointer: fine` must.**

UI-SPEC deferred the *mechanism* to Phase 06.1 — *"which of those two is Phase 06.1's call,
and Phase 0 records the requirement, not the mechanism."* The six-class matrix **promotes
that mechanism to a Phase 0 requirement**, because it is no longer a choice between two
equivalent implementations. One of the two candidates UI-SPEC named (the consumer sets the
attribute responsively, i.e. by width) is now known to be wrong.

### The mechanism, and the distinction that decides it

```css
/* REQUIRED. */
@media (pointer: fine) { /* compact may take effect */ }

/* FORBIDDEN. */
@media (any-pointer: fine) { /* compact may take effect */ }
```

`pointer` describes the **primary** input; `any-pointer` matches if *any* attached input
qualifies. The difference is not academic — it is the difference between a right and a wrong
answer on real hardware:

| Device | `pointer: fine` | `any-pointer: fine` | Correct density |
|--------|----------------|--------------------|-----------------|
| Laptop, mouse or trackpad | ✅ true | ✅ true | `compact` |
| Phone, cover screen, tablet | ❌ false | ❌ false | `comfortable` |
| **Tablet + attached trackpad keyboard** | **❌ false** | **✅ true** | **`comfortable`** |

The third row is the one that decides it. A tablet with a keyboard case still reports touch
as its primary pointer, and the user still touches the screen — so `pointer: fine` returns
the right answer and `any-pointer: fine` returns the wrong one. **`any-pointer` is
forbidden by this contract for any density purpose.**

### Resolved mode and density, per class

Public is `comfortable` at every class (carried unchanged from UI-SPEC's `X-` row). The
density axis is therefore an **admin-only** axis, and the 44px floor is a **both-surfaces**
floor.

| # | Class | Pointer | Public mode / density | Admin mode / density | 44px floor |
|---|-------|---------|----------------------|---------------------|-----------|
| 1 | Folded cover | coarse | DARK / `comfortable` | LIGHT / **`comfortable`** | **yes** |
| 2 | Phone portrait | coarse | DARK / `comfortable` | LIGHT / **`comfortable`** | **yes** |
| 3 | Foldable unfolded | coarse | DARK / `comfortable` | LIGHT / **`comfortable`** | **yes** |
| 4 | Tablet portrait | coarse | DARK / `comfortable` | LIGHT / **`comfortable`** | **yes** |
| 5 | Tablet landscape / small laptop | **by `pointer: fine`** | DARK / `comfortable` | LIGHT / **`compact` iff `pointer: fine`, else `comfortable`** | **iff coarse** |
| 6 | Laptop / desktop | fine | DARK / `comfortable` | LIGHT / **`compact`** | no |

**Five of six classes are coarse-pointer, so the 44px floor is the common case and not the
exception.** UI-SPEC states the floor for "a phone layout"; under this matrix it binds on
the folded cover, the phone, the unfolded foldable, the tablet portrait and the
coarse-pointer half of class 5.

### What the 44px floor does *not* mean

It does not mean every control is visibly 44px tall. That reading would destroy the
editorial identity — a 9.5px mono filter pill grown to a 44px slab is a different design.

> **The floor is a floor on the hit area, not on the drawn control.** A 9.5px pill keeps its
> drawn geometry and reaches 44px through padding or a `::after` overlay that extends the
> target without extending the paint.

Concrete instance, and it is the site's worst case. Photos has **eight** category filter
anchors (`00-PUBLIC-DESIGN-NOTES.md` resolution 6). At class 1's **312px** content width,
eight anchors at a 44px minimum hit height wrap to as many as four rows — **176px of a
~800px viewport spent on a filter row**. That is not acceptable on a cover screen, so:

> **The Photos filter row wraps at classes 3–6 and becomes a horizontal scroll rail with
> `scroll-snap-type: x proximity` at classes 1–2.**

The rail is safe *there* specifically because Photos has no vertical snap container — the
nested-scroll hazard named in §5.4 does not apply. On Home it would, which is why the peek
gallery is **not** a rail (§5.3).

### What this adds to the findings register — and where it goes

**G-2** already says the density axis cannot work as specified and needs a control-geometry
token layer (`--control-h`, `--control-px`, `--row-h`, `--field-gap`) before `data-density`
can vary anything. This contract adds one clause to G-2's **acceptance criteria**, not a new
row:

> The density variation must be gated on `@media (pointer: fine)`, never on a width
> breakpoint and never on `any-pointer`. A DS that varies `--control-h` by width ships a
> sub-44px control to every tablet.

**G-9**'s proposed new `FilterNav` inherits the hit-area floor and the classes-1–2 rail
above, likewise as an acceptance clause rather than a new row.

`00-FINDINGS.md` states its own scope rule: *"Rows are **not** added or re-litigated by a
measurement plan — a plan that finds something outside the sixteen records it in its own
SUMMARY instead, so the tier-pull contract below keeps a fixed denominator."* This document
honours that. **`00-FINDINGS.md` is not edited.** The one candidate *new* gap (§8) is
recorded in `00-RESPONSIVE-SUMMARY.md`, and the two clauses above are additions to existing
rows to be applied when those rows are next opened.

---

## §3 — The gutter ladder, and the arithmetic that forces it

**Measured, this session, read-only from the built sketches:**

| Fact | Location | Value |
|------|----------|-------|
| Public shell gutter | `.playground/src/layouts/Public.astro:100` | `padding: 0 var(--space-12)` — **48px each side, unconditional** |
| Width media queries in the entire playground | `.playground/src/**` | **one** — `case.css:423 @media (max-width: 900px)` |
| `pointer:` media queries | `.playground/src/**` | **zero** |
| `dvh` / `svh` / `lvh` | `.playground/src/**` | **zero** |
| `100vh` | `.playground/src/layouts/Public.astro:95` | **one**, on `body` |
| `scroll-snap` | `.playground/src/**` | **zero** |
| `prefers-reduced-motion` | `.playground/src/pages/photos.astro:361` | **one**, guarding the tile hover `scale(1.03)` |

So the honest starting position is that **the public sketches carry essentially no
responsive work** — one media query, in the case template, on a round number. This is not a
criticism of plans 09 and 10: responsive was not a requirement when they were written. It is
the baseline the rework starts from, and it means plan 00-17's requirement to capture every
`X-` artefact at 390 as well as 1440 would currently photograph a 1440 design squeezed into
390px.

**Why the fixed 48px gutter fails.** At class 1, `48 × 2 = 96px` of a 344px viewport is
**28% of the screen spent on padding**, leaving 248px of content. Ladder, all four values
real steps on the 4px grid:

| Classes | Gutter | Token | Content width at the class's narrowest |
|---------|-------:|-------|--------------------------------------:|
| 1 (≤ 374) | 16px | `--space-4` | 344 − 32 = **312px** |
| 2 (375–672) | 24px | `--space-6` | 360 − 48 = **312px** |
| 3, 4 (673–1023) | 32px | `--space-8` | 673 − 64 = **609px** |
| 5, 6 (≥ 1024) | **48px** | `--space-12` | 1024 − 96 = **928px** |

**The ≥ 1024 row is deliberately unchanged.** Classes 5 and 6 keep the exact gutter the
approved 1440 design was signed off at, so the ladder cannot alter anything a reviewer has
already accepted. At 1024 the resulting 928px content sits under Home's 1080px cap, so the
cap is inert there and no new cap interaction is introduced.

**Layout maxima carried unchanged** (UI-SPEC §Spacing): Home 1080 · Work and Photos 1280 ·
admin content column 960 · case measure 68ch. Every one becomes `min(cap, 100%)` in effect —
a max-width smaller than the content box is already inert, so no cap needs a breakpoint.

---

## §4 — The 68ch measure across six classes

68ch at `--text-md` 15px DM Sans ≈ **620px** (UI-SPEC's derivation, unchanged).

| Class | Content width | 68ch fits? | Effective measure |
|-------|-------------:|-----------|------------------|
| 1 Folded cover | 312 | ❌ | ~34ch |
| 2 Phone portrait | 312–342 | ❌ | ~34–37ch |
| 3 Foldable unfolded | 609–777 | ✅ from 620 up | 68ch |
| 4 Tablet portrait | 704 | ✅ | 68ch |
| 5 Tablet landscape | 928 | ✅ | 68ch |
| 6 Laptop | 1344 → capped | ✅ | 68ch |

**Below class 3 the measure is device-bound and nothing can fix it.** 34ch is under the
55–75ch band's floor and under the 45ch minimum usually cited for comfortable reading. The
contract's position is that this is **correct and must not be compensated for**:

- `max-width: min(68ch, 100%)` — the declaration stays `68ch`, the viewport wins when it is
  narrower. No `max-width` in `vw`, no `clamp()` on the measure.
- **Line height stays `--lh-relaxed` 1.55** and letter spacing stays `--ls-base`. Tightening
  either to fit more characters per line at 34ch trades the one thing still working
  (vertical rhythm) for the one thing that cannot be fixed (line length).
- **Type size does not shrink.** Density invariant 1 governs the density axis; the same
  logic governs the responsive axis. A smaller face at 312px buys ~4ch and costs legibility
  on the class with the worst reading conditions in the matrix.

**Plan 10's 68ch assertion survives.** It asserts the two page sources declare the *same
literal*, and the literal is unchanged. It was never an assertion about rendered width, so
narrow classes do not break it. Recorded because it looks like it should break and does not.

**One breakpoint changes, and only its number.** `case.css:423`'s `@media (max-width: 900px)`
drops the 200px mono rail. The rail composition needs `200 + 48 + 620 = 868px` of content,
so it can only exist at class 5 and above (928px content ✅) and must be gone at classes 3
and 4 (609–777px ❌). 900 gets that right **by accident** — it happens to land in the
884→1024 dead zone between class 3's ceiling and class 5's floor.

> **Change `900` to `1024`.** Identical behaviour at every real viewport; the breakpoint now
> names a class boundary instead of a round number, so the next person to read it can tell
> whether it is load-bearing.

---

## §5 — The Home two-state landing

### What was asked for

> *"just the homepage landing shows the photos section and prompts user to scroll. as
> scrolled, the photo section moves fully up and only work+resume sections are visible in
> the view"*

With, from the same message, the constraint that bounds every decision below:

> *"the sections for photos, work, resume as they exist on home right now stay as is."*

### The mechanism: a plain document scroll

```
State A   photos section, exactly one viewport tall, with an explicit scroll prompt
State B   the scroll prompt's target — the work + résumé block
```

**The mechanism is normal document flow.** The photos section gets `min-height: 100svh`; the
work + résumé block follows it in DOM order; the prompt is a real `<a href="#work">`. That
alone delivers everything in the user's sentence: photos fills the landing view, it prompts
a scroll, and one viewport of scroll clears it **completely** — exactly, by construction,
because it is exactly one viewport tall.

Four reasons this is the mechanism rather than a scroll-driven animation or a JS-pinned
section:

1. **It is the minimum that satisfies the requirement.** Nothing in the user's sentence
   asks for an animation. It asks for a landing state, a prompt, and a clean departure.
2. **It ships zero JavaScript.** PUB-14 requires four of five public routes to ship zero
   framework JS, and `check-no-js.sh` currently passes on 14 routes. A pinned-section
   implementation would put Home on the wrong side of that.
3. **It cannot trap a keyboard user**, because there is nothing to trap (§5.6).
4. **It is aspect-ratio-independent** — see §5.2, which is the whole answer to the
   near-square foldable.

`scroll-snap` is an **enhancement layered on top of this**, not the mechanism. §5.4.

### §5.1 — Viewport units: `svh`, and why not the other three

`100vh` is the large viewport (`lvh`) — the height with the mobile address bar **retracted**.
At first paint on iOS Safari and Android Chrome the address bar is **visible**, so `100vh` is
taller than what the user can see. For this design that is not a cosmetic bug, it is a
direct hit on the requirement: **the scroll prompt — the one element whose entire job is to
be seen at first paint — is pushed below the fold.** A two-state full-viewport landing is
precisely the design `100vh` breaks.

| Unit | Behaviour | Verdict for state A |
|------|-----------|--------------------|
| `100vh` / `100lvh` | Address bar retracted | **Forbidden.** Prompt below the fold at first paint. |
| `100dvh` | Tracks the live viewport | **Forbidden on any scroll-transition participant.** It changes *during* the scroll, so the transition's own target distance moves mid-gesture — jitter on its own, and a snap-fight where a snap point is in play (§5.4). |
| **`100svh`** | Address bar visible | **Required.** The smallest the viewport gets, so state A fits at first paint under every chrome state. |

**Ruling: `min-height: 100svh`, not `height`.** `min-height` so that content taller than the
budget overflows and pushes the prompt down *visibly* instead of being clipped invisibly.
A visible overflow is a failure a screenshot catches; a clip is one it hides.

**The `lvh − svh` delta is a feature, and it is worth naming as one.** Once the user starts
scrolling and the address bar retracts, the visible viewport grows to `lvh` while the photos
block stays `svh` tall — so a ~60–100px sliver of the work band's top edge appears at the
bottom. That is the classic *"there is more below"* affordance, arriving at exactly the
moment it is useful, at zero cost. At first paint there is no sliver, which is why the
explicit prompt still has to do the work.

**Desktop is unaffected.** With no dynamic browser chrome, `svh == lvh == dvh == vh` at
classes 5 and 6, so the whole discussion is a classes-1–4 concern and the approved 1440
design does not move.

**One existing line to change:** `Public.astro:95`'s `min-height: 100vh` on `body`. It is
currently harmless — it only makes short pages fill the screen — but it is the wrong unit in
the one place in the codebase that will be copied from. `100svh`.

### §5.2 — The near-square foldable at ~1.1

The general worry is right: a design tuned at 1.80 and 0.46 can fail at 1.10. Here is where
it does and does not.

**The transition itself does not fail at 1.1, and the reason is structural.** The mechanism
in §5 references two things: `svh` and DOM order. Neither is a function of aspect ratio. The
photos block is one viewport tall at 0.39 and at 1.80 and at every value between, so the
"moves fully up and out" property holds at 1.10 for the same reason it holds anywhere —
**not** because 1.10 was special-cased. *The design is robust at ~1.1 because it was
specified in viewport-height units and document order rather than in aspect ratio.* Any
implementation that reaches for `aspect-ratio` or a `vw`-derived height forfeits that, which
is why §1 forbids aspect-ratio branching.

**What does get tight at 1.1 is state A's *composition*, and class 3 is the binding class.**
Worked at both ends of class 3's band, with `svh ≈ height − 56px` of browser toolbar:

*Wide end, 841 × 768 (aspect 1.095), content 777px, svh ≈ 712px:*

| Element | Height |
|---------|-------:|
| Nav | 56 |
| Name (60px Playfair, `--lh-tight` 0.94) + italic subtitle 22 + tagline 22, with spacing | ~168 |
| Peek gallery, 3 × 2 at 3:2, tiles (777 − 32) / 3 = 248px wide → 165px tall | 346 |
| Scroll prompt | 40 |
| Vertical page padding | 64 |
| **Total** | **~674px in ~712px** — fits, **~38px headroom** |

*Narrow end, 673 × 612 (aspect 1.10), content 609px, svh ≈ 556px:*

| Element | Height |
|---------|-------:|
| Nav 56 + name block 168 + prompt 40 + padding 64 | 328 |
| Peek gallery, 3 × 2 at 3:2, tiles (609 − 32) / 3 = 192px wide → 128px tall | 272 |
| **Total** | **~600px in ~556px** — **overflows by ~44px** |

**So class 3 is the class where state A's composition does not fit, at the narrow end of its
own band.** That is the honest finding, and it is a *composition* problem with a
*composition* fix (§5.3) — not a mechanism problem.

**Ruling for class 3:** state A holds its promise (`min-height: 100svh`, prompt inside it,
one viewport of scroll clears it) at every point in the band. Where the composition
overflows, it overflows visibly and the height budget in §5.3 is what resolves it. **Class 3
at its narrow end is the first thing to check in the sketch phase**, and it is why the
screenshot matrix in §9 captures 841 × 768 at all.

### §5.3 — State A is a height budget, and columns go *up* as height goes *down*

The naive reflow instinct is "narrower viewport → fewer columns". Applied to the 6-photo peek
gallery it is **backwards**, and the arithmetic says so at class 3's narrow end (609px of
content, ~556px of `svh`, ~228px available to the gallery after the 328px of fixed chrome):

| Arrangement | Tile width | Tile height (3:2) | Rows | Gallery height | Fits 228px? |
|-------------|----------:|-----------------:|-----:|--------------:|------------|
| 2 × 3 | 296 | 197 | 3 | **623** | ❌ far worse |
| 3 × 2 | 192 | 128 | 2 | **272** | ❌ by 44px |
| 6 × 1 | 88 | 59 | 1 | **59** | ✅ but 88px is not a photograph |
| 3 × 2 at 16:9 | 192 | 108 | 2 | **232** | ✅ marginal |
| 3 × 2 at 2:1 | 192 | 96 | 2 | **208** | ✅ |

Fewer columns means more rows means **taller**. So:

> **Rule: state A is specified as a per-class height budget, and the peek grid's column
> count × tile aspect are solved to fit that budget. Column count is a function of available
> height as much as of available width.**

This is the same shape of derivation as §2's: **width alone decides neither the density nor
the full-viewport composition.** That is the through-line of this document.

Two rules bound the solution space so the sketch phase is solving, not inventing:

1. **Reflow, never hide. All six peek photos render at all six classes.** Dropping to four
   on a narrow screen means two of the six photos Akhil chose never exist on that class.
   This is a portfolio; there is no summary edition to fall back to. `home_config.peekIds`
   is six, and six render.
2. **The peek gallery is a grid at every class, never a horizontal scroll rail.** A rail
   would fit any budget, but it nests a horizontal scroller inside the vertical snap
   container of §5.4 — and on iOS a horizontal rail readily steals the vertical gesture.
   The Photos filter row *is* a rail at classes 1–2 (§2) precisely because Photos has no
   vertical snap container. Same pattern, opposite verdict, and the reason is the container.

For classes 1 and 2 the budget is comfortable: at 312px content, `2 × 3` at 3:2 gives
(312 − 16) / 2 = 148px tiles → 99px tall → 3 rows = **329px**, against a `svh` of ~700–800
minus ~330px of chrome. **Fits with room.** The tight class is 3, not 1.

### §5.4 — `scroll-snap`: adopted, narrowly, with its failure modes named

`scroll-snap-type` is the obvious mechanism for "photos moves fully up and out". It is
adopted as an **enhancement over** §5's plain scroll, in exactly one form:

```css
@media (prefers-reduced-motion: no-preference) {
  .home        { scroll-snap-type: y proximity; }   /* proximity, never mandatory */
  .home-photos { scroll-snap-align: start; }
  .home-work   { scroll-snap-align: start; }
}
```

Two snap points, both reachable, `proximity`. The failure modes, each named and each
answered:

| Failure mode | Why it bites here | Answer |
|---|---|---|
| **`mandatory` traps content taller than the snap port** | State B is *two* sections (work + résumé) and is taller than the viewport at every class (§5.7). Under `mandatory` the browser can snap back past content the reader is trying to reach. | **`proximity`.** `mandatory` is forbidden by this contract. |
| **It fights user scroll** | A small trackpad flick meant as an adjustment gets amplified to a full-viewport jump; the page reads as taking control. | `proximity` only pulls near a snap point, and there are two. |
| **It can trap keyboard users** | `Tab` moves focus into the next section, the browser scrolls to reveal it, the snap re-snaps to a position where the focused element is off-screen. Focus and scroll position fight. | `proximity` yields to the focus scroll. Plus §5.6: nothing depends on snap for reachability. |
| **It behaves badly with variable-height content** | Section heights vary by class and by content. | Only **two** snap points exist and only one boundary matters (leaving state A), which is the one height the design pins exactly. |
| **Screen readers do not participate at all** | Browse-mode reading follows DOM order and ignores snapping, so state A is never "hidden" from AT. | Correct behaviour, not a bug — and it constrains what snap may be *relied on* for. See §5.6. |

**Snap is never load-bearing.** Every state reachable with snap is reachable without it. If
snap is removed entirely the design still meets the user's sentence, because §5's mechanism
already does. That is the test a snap enhancement has to pass.

### §5.5 — `prefers-reduced-motion` is a requirement, not a nicety

A scroll-driven full-viewport transition needs a reduced-motion path. Four rules:

1. **`scroll-snap-type` lives *inside* `@media (prefers-reduced-motion: no-preference)`.**
   This is the non-obvious one and it is deliberate: **snap converts a small user gesture
   into a large involuntary viewport translation**, which is the exact class of motion
   reduced-motion exists to suppress. Under a reduced-motion preference the page is a plain
   document scroll and nothing moves that the user did not directly move.
2. **`scroll-behavior: smooth` is opt-in, never opt-out.**
   `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }`.
   Written the other way round, the default is animated and the accessible path is the
   exception — which is the wrong default for a prompt whose target is one viewport away.
3. **Any scroll-driven animation on the departing photos block — fade, parallax,
   `animation-timeline: scroll()` — is disabled entirely** under reduced motion. Not slowed.
   Disabled. The block simply scrolls.
4. **The existing guard is the precedent, and it is carried.** `photos.astro:361` already
   wraps the tile hover `scale(1.03)` / 0.6s in a reduced-motion query. That is the pattern
   the rest of the site follows.

Note what is *not* covered: **user-initiated scrolling itself is exempt** from
`prefers-reduced-motion` and must not be suppressed. The preference governs motion the page
generates, not motion the user performs.

### §5.6 — Keyboard and screen-reader access

If state A scrolls fully out of view, tab order and focus management must still be sane.
Six rules, and the first is the one the others follow from.

1. **DOM order is reading order is tab order.** Photos, then work, then résumé — in the
   source, in the a11y tree, and in the tab sequence.
   > **The two-state transition must be achievable with zero `order`, zero
   > `position: fixed` on a focusable element, and zero `tabindex` greater than 0.** If a
   > composition cannot be built inside that constraint, the composition is wrong — not the
   > accessibility requirement.
2. **The scroll prompt is a real `<a href="#work">`.** Not a decorative chevron, not a
   `<div onclick>`, not a button that calls `scrollIntoView`. A keyboard user reaches state B
   with one `Tab` and one `Enter`; it functions as a skip link; it works with zero JS; and it
   appears in the a11y tree as a named link to a named target.
3. **The target carries `scroll-margin-top` equal to the sticky nav's height.** Without it
   the anchor jump puts the work heading underneath the `AppBar`. If the public nav is not
   sticky at a given class, the value is 0 there — it is a per-class number, not a constant.
4. **Nothing is hidden from assistive technology.** State A moving out of view is a *scroll
   position*, not `display: none`, not `visibility: hidden`, not `aria-hidden`, and not
   `inert`. All four are **forbidden** on either state. This is the trap a two-state design
   walks into: the framing invites you to hide the inactive state, which would delete real
   content — the photo gallery — from every screen-reader user. A screen-reader user reads
   photos → work → résumé linearly and never encounters the two-state framing at all, which
   is the correct outcome.
5. **Focus is always visible after it moves.** The ring is `--ochre-d` via `--focus`
   (non-text, SC 1.4.11, 3:1). Because §5.4 refuses `mandatory`, the scroll position the
   browser picks when revealing a focused element is stable — nothing re-snaps it away. That
   is the concrete, user-visible payoff of the `proximity` ruling.
6. **The landmark structure carries the states, so AT users get the same navigation
   affordance by a different route.** Photos, work and résumé are each a `<section>` with an
   accessible name, reachable by the rotor / landmark list. The sighted user gets a prompt;
   the screen-reader user gets a landmark. Neither is a lesser path.

### §5.7 — The one thing that cannot hold, stated plainly

Read strictly, *"only work+resume sections are visible in the view"* asks for the work band
**and** the résumé section to fit inside one viewport. With **five projects** (D-38) plus a
résumé section, that is **not achievable at any of the six classes** — not at 1440 × 900,
let alone at 344 × 882. The approved Act-2 composition alone (a full-width design-system
flagship row above a 2 × 2 grid at 40 × 56 gaps, `00-PUBLIC-DESIGN-NOTES.md` §OQ-1) occupies
most of a 900px viewport before the résumé section exists.

**The two directions collide.** *"The sections for photos, work, resume as they exist on home
right now stay as is"* and *"only work+resume visible in the view"* cannot both hold at five
projects plus a résumé section. Something gives, and the resolution taken here is:

> **"Photos moves fully up" is exact and enforceable. "Only work + résumé are visible" is a
> statement about what fills the view at the end of the transition, not a promise that the
> whole of both sections fits one viewport.** State A is exactly one viewport, so one
> viewport of scroll clears it completely and what then fills the view is the top of the
> work + résumé block. That block continues below the fold — at all six classes.

The content constraint wins because it was stated more emphatically and because it protects
content: honouring the other reading would require cutting projects or the résumé section
from Home, which the user explicitly ruled out in the same message.

**This is flagged for the user in §10, not buried.** If the intended reading really is that
work + résumé must itself be exactly one viewport, then Home's content has to shrink — fewer
projects on Home with the rest on `/work`, or a résumé section reduced to a single link —
and that is a content decision this document is not authorised to take.

---

## §6 — Foldable posture and the hinge

**The folded cover screen is a different reading context, not merely a narrower one.**
344–374px, tall, cramped, used one-handed and briefly. Three rulings.

**1 — No content is hidden. Reflow only.** Every section, every project, every peek photo
and every filter category exists at 344px. The justification is not purity: a hiring manager
reading on a cover screen who cannot see a project has lost that project, and there is no
alternate mobile edition of this site to fall back to. Where something cannot fit its
designed arrangement it changes *arrangement* (§5.3's budget, §2's filter rail, §4's dropped
rail) — never its *presence*. The one thing that genuinely reduces is the case-study measure,
and that is the device, not a decision (§4).

**2 — The posture change is a live resize, not a navigation.** Unfolding takes the viewport
from ~344px to ~841px **in one frame, with no reload and no route change.** That is a
stronger constraint than any width threshold, and it is the real reason this contract is
CSS-only:

> **No layout may depend on a viewport measurement taken once.** No `window.innerWidth`
> branch stored in component state, no JS-measured layout, no build-time viewport
> assumption, no server-side device sniff. Every responsive decision must be expressed in
> CSS that re-evaluates on resize.

Combined with §1's ban on aspect-ratio branching, this rules out the two implementations
that would visibly break on a fold gesture.

**3 — The hinge is not targeted.** The Viewport Segments API
(`env(viewport-segment-width …)`, `@media (horizontal-viewport-segments: 2)`) exists but is
not broadly shipped, and designing against it would add a code path that almost nobody
executes and nobody reviews. It is not needed here, for a checkable reason:

> **No two-column layout exists at the foldable-unfolded class, so nothing straddles the
> hinge.** The only two-column composition in the design is the case-study 200px rail beside
> the 68ch measure, and §4 puts its floor at **1024px** — above class 3's 884px ceiling.
> Home's state A and state B are single-column compositions at class 3. The property holds
> **by construction**, and it is verifiable: if a future two-column layout is introduced
> below 1024px, this claim fails and the hinge becomes a real problem.

---

## §7 — Case studies: one tier, one route per case

**D-39 is superseded.** The user's direction, clarified: *"cases can scroll, but one page per
case, not like scroll to 10 cases in single page scrolling down."* That is a statement about
**routing**, not about length.

| | Before (D-39, as built in plan 00-10) | After |
|---|---|---|
| Tiers | two — long (design system, Cairn) · short (hued, Momentum, TimeShift) | **one** |
| Routes | two — `/case/long`, `/case/short`, each stacking every study of its tier on one page | **five — one route per case** |
| Internal scroll | yes | **yes, unchanged** — cases may scroll |
| Length | 1,700 words long tier · ~750 short tier | **materially shorter, one target (§10)** |

**Current lengths, and why two different totals are both correct.** The whole-file counts are
Cairn 2,005 · design system 1,943 · Momentum 1,197 · TimeShift 943 · hued 923 = **7,011
words**. Plan 00-10 measured **5,686** over *the four required sections only*. The 1,325-word
delta is the leads and the drafting comments, which are meta about each study rather than the
study. Both numbers are right; quoting one against the other looks like an arithmetic error,
so both are recorded.

**What survives from plan 00-10, and it is most of the machinery:**

| Survives | Why |
|----------|-----|
| `.playground/src/lib/copy.mjs` — the build-time loader | Reads committed drafts in place. Route shape is not its concern. |
| The 68ch measure and its derivation | §4. |
| The per-tier heading table and its fail-loud throw | Still needed — see the note below. |
| The `## Decision` vs `## Decisions` handling | See the note below. |
| The tier-mismatch negative controls | Reusable as route-level negative controls. |
| The three non-final-content treatments (`[NEEDS AKHIL]`, `[source: …]`, HTML comments) | Unchanged. D-40 and the Phase 6 strip/fill split are untouched. |
| The 200px rail, `case.css`, the gap-block `--wire` rule, the D-41 asset plan | Unchanged, except §4's 900 → 1024. |

**Does not survive:** the two-tier split itself, and the two stacked routes.

**One live trap the collapse creates.** The two tiers **do not spell their middle heading the
same way** — long form is `## Decisions` (plural), short form is `## Decision` (singular).
Plan 00-10's loader throws, naming the file and the difference, precisely because a loader
assuming one spelling *silently drops a section from three of the five studies and still
renders a page*. Collapsing to one tier does **not** make that safe: the five committed
drafts still carry both spellings on disk. So the single template must accept **either**
spelling and continue to throw when it finds **neither** — or the drafts must be normalised
to one spelling as part of the compression pass. Either is fine; doing neither reintroduces
a silent-drop bug the previous plan had already closed.

**Route shape** — `/work/{id}` is proposed, using the D-38 ids (`design-system`, `cairn`,
`hued`, `momentum`, `timeshift`), because a case study is evidence *under* Work and this
makes the Work page the index of its own children. `/case/{id}` is the alternative. Flagged
in §10; it is a routing decision the user did not state.

---

## §8 — What this contract asks of the design system

Per the Core Value, a gap is an upstream finding and never a local workaround. Three items,
and **none of them edits `00-FINDINGS.md`**, per that file's own fixed-denominator rule.

| # | Item | Disposition |
|---|------|-------------|
| 1 | **`AppShell` has no responsive posture.** UI-SPEC assigns `Sheet side="left"` for the phone sidebar (D-09), but nothing states *at what width* the sidebar becomes a Sheet, or whether `AppShell` decides that or the consumer does. With two viewports it was latent. With six classes it is load-bearing: at class 3 (673–884, **coarse pointer**) and class 4 (768–834, coarse) — sidebar, or Sheet? A 240px sidebar (`--ds-sidebar-w`, on the MUST-NOT-redefine list) inside 777px of content is 31% of the screen for a tool whose content column is capped at 960px. | **Candidate NEW gap.** Recorded in `00-RESPONSIVE-SUMMARY.md`, not appended to the register. Distinct from G-8, which is about a missing `banner` slot, not about responsive behaviour. |
| 2 | **G-2 acceptance clause:** density variation gated on `@media (pointer: fine)`, never on width and never on `any-pointer`. | Addition to an existing row's criteria (§2). Apply when G-2 is next opened. |
| 3 | **G-9 acceptance clause:** the proposed `FilterNav` meets the 44px hit-area floor on coarse pointers without growing its drawn geometry, and supports the classes-1–2 horizontal rail. | Addition to an existing row's criteria (§2). |

Item 1 needs answering **before** the admin sketches, because the answer changes what
`S-*` looks like at classes 3 and 4 and there is no point sketching it twice.

---

## §9 — The screenshot contract multiplies, and by how much

Plan 00-17's contract assumes two viewports. Its filename regex is
`^00-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(1440|390)\.png$` and its automated gate
asserts `SHOTS -ge 35`. Both need rewriting. **Six classes does not mean six times the
files** — the same reduction logic UI-SPEC applied to the 42-cell state matrix applies here.

**Canonical capture sizes** (from §1), so the viewport token stays enumerable:

```
344 × 882   390 × 844   768 × 1024   841 × 768   1024 × 768   1440 × 900
```

**New regex:**

```
^00-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(344|390|768|841|1024|1440)\.png$
```

**Per-class capture policy, with the reasoning for each asymmetry:**

| Class of artefact | Captured at | Files | Why not all six |
|-------------------|-------------|------:|-----------------|
| `S- E- T- O-` (admin desktop, 29 artefacts) | **1440 only** — unchanged | 29 | The admin has one user, at a laptop. Density is decided by pointer, and pointer has **two** values, not six — so 116 extra admin files would measure a distinction that does not exist. |
| `P- R-` (admin phone, 6 artefacts) | **390 + 344** | 12 | 344 is the class that actually breaks a phone layout, and D-09's four capabilities plus two refusals must survive it. |
| `X-` public — `X-work-recolour`, `X-work`, `X-photos` | **all six** | 18 | This is where responsive is the hard requirement, and where the audience is on unknown hardware. |
| `X-home` **state A** and **state B** | **all six, both states** | 12 | The transition is the artefact. One state is not evidence of a two-state design. |
| `X-case` — longest and shortest study | **all six** | 12 | Two studies bracket the measure (§4). Five studies × six classes would be 30 files photographing one template. |
| `X-contact-sheet` | **1440 only** | 1 | Review chrome, not a design. |
| | | **≈ 84** | up from **≈ 49** |

**Mode is unchanged and still non-negotiable.** Every admin file is `-light-`; every public
file is `-dark-`. Plan 00-17's assertion that
`ls … | grep -E '^00-[SETOPR]-' | grep -c dark` prints `0` survives verbatim.

**Three of plan 00-17's automated assertions break and must be updated:** the `(1440|390)`
regex, the `SHOTS -ge 35` floor (→ **≥ 80**), and *"every `X-` id has both a `-dark-1440.png`
and a `-dark-390.png`"` (→ all six sizes). The full-page-capture assertion and the
admin-never-dark assertion are unaffected.

---

## §10 — Confirm-or-override

Each item below is a derivation this document took rather than a value it was given.
Following UI-SPEC's convention, each **proceeds as stated unless overridden** — so silence
is not neutral and each needs an explicit CONFIRMED or OVERRIDDEN.

| # | Item | Stated position | If overridden |
|---|------|-----------------|---------------|
| **R-1** | **Case-study target length** | **500–700 words** over the four required sections, one tier. Below the current *short* tier (698–822), because the user said even the short ones are very long. Long-tier studies compress ~60%; short-tier ~20%. | Any number; the compression pass takes it. This is the only item that changes the copy. |
| **R-2** | **"Only work + résumé visible" (§5.7)** | Read as *what fills the view after the transition*, **not** as a promise that both sections fit one viewport. It cannot hold at five projects plus a résumé section at any class. | Home's content must shrink — fewer projects on Home, or a résumé section reduced to a link. That is a content decision, not a layout one. |
| **R-3** | **Case route shape** | `/work/{id}` using D-38 ids. | `/case/{id}`, or anything else. Nothing else in the contract depends on the choice. |
| **R-4** | **Canonical heights in §1** | Standard heights for each class's representative hardware, **derived not measured from devices in hand.** Only the widths are the user's approved contract. | Any height within ~±10% leaves §5's arithmetic conclusions unchanged; a larger change re-runs §5.2 and §5.3. |
| **R-5** | **The gutter ladder (§3)** | 16 / 24 / 32 / **48**, with ≥ 1024 deliberately unchanged so nothing already approved moves. | A different ladder; every content-width number in §3–§5 recomputes. |
| **R-6** | **Reflow, never hide (§6)** | All six peek photos and all eight filter categories exist at 344px. | Hiding content at narrow classes, which needs a stated rule for *what* and *why*. |
| **R-7** | **`scroll-snap` at all** | Adopted as a `proximity` enhancement inside `prefers-reduced-motion: no-preference`, never load-bearing. | Drop it. The design still meets the user's sentence without it — that is the test it was held to. |

---

## §11 — What is deliberately not in this contract

- **No code.** Every CSS fragment above is a specification of required behaviour, quoted for
  precision. `.playground/` is untouched by this document.
- **No admin screen designs.** Those are 00-12 → 00-16, which must now be built **to** this
  contract natively. §8 item 1 has to be answered first.
- **No copy.** §7 and R-1 set a target and route the work; they do not do it.
- **No `00-FINDINGS.md` edit**, per that file's fixed-denominator rule. §8 routes its one
  candidate new gap into `00-RESPONSIVE-SUMMARY.md` and its two acceptance clauses to the
  rows they belong to.
- **No verdict on plan 00-11's three by-eye judgements.** They are unanswered, they require a
  human eye, and the artefacts they judge are about to change. **Plan 00-11 remains OPEN**
  and must re-run against the reworked sketches.
- **No hinge targeting**, and no Viewport Segments API. §6 item 3 explains why it is not
  needed and states the condition under which that stops being true.

---

*Phase 0 · off-plan, by direct user direction. Sources: the user's two messages and one
decision approval (recorded verbatim-in-substance in `00-PUBLIC-DESIGN-NOTES.md`
§"Responsive direction"); `00-UI-SPEC.md` §"Viewport and mode contract", §Density Contract,
§Spacing, §Typography, §"Screenshot record", §"Named gaps"; `00-CONTEXT.md`
D-08/D-09/D-38/D-39/D-40/D-41/D-44/D-45; `00-FINDINGS.md` §"How to read this register" (the
fixed-denominator rule) and rows G-2, G-8, G-9; `00-PUBLIC-DESIGN-NOTES.md` resolutions 3, 6
and 8, §OQ-1 and §"Case-study templates"; `00-09-SUMMARY.md`, `00-10-SUMMARY.md`,
`00-11-PLAN.md`, `00-17-PLAN.md`; `PROJECT.md` §Constraints. The seven measurements in §3
were taken read-only from `.playground/src/` during this session and are the only figures
here not quoted from a committed document; every height arithmetic in §5 is derived from
them and from §1's canonical sizes, and is marked as derived.*
