# Phase 0 — Screenshot Contract

**Status:** binding on plan `00-17-PLAN.md` task 1, which implements it, and on task 3, whose
pre-flight count is read from §6 below.

**What this is.** `00-UI-SPEC.md` §"Screenshot record" and §"Viewport and mode contract" wrote the
record at **two** viewports. `00-RESPONSIVE-CONTRACT.md` §1 replaced two viewports with **six
device classes**, and §9 stated the consequence: the screenshot record multiplies, and three of
plan 00-17's automated assertions break. This document is the whole capture policy in one place,
amended for the artefacts the rework added after §9 was written.

**Why it is separate from plan 00-17.** 00-17 is an OPEN plan with a human checkpoint in it. A
capture policy that changes as artefacts are added does not belong inside a plan whose approval is
pending — it belongs in a contract the plan references. 00-17 asserts the *grammar* and the
*floor*; this document owns the *policy*.

**How to read it.** Every line here is something the capture script can be checked against. It is
written to be complete enough to write `.playground/shoot.mjs` from **without** re-reading
`00-RESPONSIVE-CONTRACT.md` §9.

---

## §1 — The six canonical capture sizes

From `00-RESPONSIVE-CONTRACT.md` §1. These are the only six viewport sizes any capture may use.

| # | Class | Canonical capture | Aspect | Primary pointer | Viewport token |
|---|-------|-------------------|-------:|-----------------|----------------|
| 1 | Foldable, folded (cover screen) | **344 × 882** | 0.39 | coarse | `344` |
| 2 | Phone portrait | **390 × 844** | 0.46 | coarse | `390` |
| 3 | Foldable, unfolded | **841 × 768** | **1.10** | coarse | `841` |
| 4 | Tablet portrait | **768 × 1024** | 0.75 | coarse | `768` |
| 5 | Tablet landscape / small laptop | **1024 × 768** | 1.33 | **ambiguous** | `1024` |
| 6 | Laptop / desktop | **1440 × 900** | 1.60 | fine | `1440` |

**The viewport token in a filename is the width alone.** The height is fixed by this table, so
`-841.png` always means 841 × 768 and never anything else. Recording only the width is what keeps
the token enumerable and the filename regex closed — a token that carried the height would have to
be a free integer pair, and a free integer pair cannot be asserted.

**841 × 768 is the single most demanding capture in the matrix**, and the reason is not that it
sits in the middle. **Class 3 is the only class whose aspect band contains 1.0**, and it is the
only class that can cross 1.0 **without a navigation**: unfolding takes a 344px viewport to ~841px
in one frame, and rotating the unfolded device crosses 1.0 again. Its band runs ~0.81 (unfolded
portrait) to ~1.35 (unfolded landscape). The canonical 841 × 768 gives **1.095** — deliberately
just above 1.0, so any layout that branches on aspect ratio flips inside this one capture rather
than between two of them. If exactly one capture per artefact is ever spot-checked by eye, it is
this one.

**344 is the narrowest real target in the matrix**, and every arithmetic check in
`00-RESPONSIVE-CONTRACT.md` §3–§5 is run against it. It is also the width at which plan 00-21
found and closed `/work`'s horizontal overflow. A record without 344 is a record that cannot
evidence the fix.

---

## §2 — The per-class capture policy

The asymmetries below are the load-bearing part of this document. Without the stated reasons the
next person captures 116 extra admin files to measure a distinction that does not exist.

| Class of artefact | Captured at | Files | Why not all six |
|-------------------|-------------|------:|-----------------|
| `S- E- T- O-` — admin desktop, **29** artefacts | **1440 only** | 29 | The admin has one user, at a laptop. Density is resolved by **pointer type**, not width (`00-RESPONSIVE-CONTRACT.md` §2), and pointer has **two** values, not six. Six classes × 29 artefacts would be 174 files photographing a two-valued axis. |
| `P- R-` — admin phone, **6** artefacts | **390 + 344** | 12 | 344 is the class that actually breaks a phone layout, and D-09's four capabilities plus two refusals must survive it. 390 alone has never broken anything. |
| `X-work-recolour`, `X-work`, `X-photos` | **all six** | 18 | This is where responsive is the hard requirement and the audience is on unknown hardware. |
| `X-home` — **state A and state B** | **all six, both states** | 12 | The transition **is** the artefact. One state is not evidence of a two-state design. |
| `X-case` — longest and shortest study | **all six** | 12 | Two studies bracket the measure (§4 of the responsive contract). Five studies × six classes would be 30 files photographing one template. |
| `X-case` — the other three studies | **1440 only** | 3 | One capture each, as proof the template rendered their content at all. The measure question is already answered by the bracket. |
| `X-home-act2` | **1440 only** | 1 | It is the same Act-2 composition `X-home` already carries at six classes, through **one shared component**. Six captures would photograph one design twice. |
| `X-contact-sheet` | **1440 only** | 1 | Review chrome, not a design. |

**The admin record photographs the density axis at both of its values, and that is the whole
justification for `1440 only`.** `compact` is captured at 1440 (class 6, `pointer: fine`);
`comfortable` is captured at 390 and 344 (classes 1–2, coarse). Both ends of a two-valued axis are
on the record. The one case the record does *not* contain is class 5's ambiguous pointer for admin
chrome — and that is correct, because class 5 resolves to whichever of the two photographed values
`pointer: fine` returns. It is not a third state.

---

## §3 — Filename grammar

```
00-{class}-{id}-{state}-{mode}-{viewport}.png
```

Written into `.planning/phases/00-design-ideation/screenshots/`. Worked examples, all real:

```
00-S-photos-populated-light-1440.png
00-O-conflict-diff-populated-light-1440.png
00-P-photo-reorder-populated-light-390.png
00-P-photo-reorder-populated-light-344.png
00-X-work-populated-dark-841.png
00-X-home-state-a-dark-344.png
00-X-case-cairn-populated-dark-768.png
```

**The regex, and it is the assertion:**

```
^00-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(344|390|768|841|1024|1440)\.png$
```

It replaces `(1440|390)`, which rejects every one of the four new viewport tokens.

Two notes for whoever writes the check:

- **The grammar is validated, not parsed.** Both `{id}` and `{state}` admit hyphens, so the two
  `[a-z0-9-]+` groups cannot be used to split a filename back into its fields. That was already
  true of `00-X-work-recolour-populated-…`. The regex's job is to reject a malformed name, and the
  authoritative id list is `CANONICAL_IDS` (§7), never a filename split.
- **Assert the set, not a line count.** Check for the *absence* of violators, as plan 00-17
  already does with `test -z "$(ls … | grep -vE …)"`. Do not count matches with `grep -c` — it
  counts **lines**, not matches, and this phase already had a control nearly report a false result
  that way (plan 00-16, control 4).

---

## §4 — Mode rules: non-negotiable

| Class | Mode | Density |
|-------|------|---------|
| `S- E- T- O-` (admin, desktop) | charcoal **LIGHT** | `compact` |
| `P- R-` (admin, phone) | charcoal **LIGHT** | **`comfortable`** |
| `X-` (public) | charcoal **DARK** | `comfortable` |

**Every admin file carries `-light-`. Every public file carries `-dark-`.** There is no exception
at any class, and six classes changes nothing here.

Capturing an admin artefact in dark mode is an **anti-pattern, not a preference**: the light
palette is where the DS-02/DS-03 contrast failures live, and dark hides them. The assertion that
enforces this survives verbatim from plan 00-17 —

```
ls .planning/phases/00-design-ideation/screenshots/ | grep -E '^00-[SETOPR]-' | grep -c dark
```

— must print `0`. It is unaffected by the viewport change because it matches on class prefix and
mode only.

**Assert the mode inside the capture script, per artefact, rather than trusting the page default.**
A page that lost its `data-brand` attribute must fail the capture, not produce a quietly wrong PNG
that the review then reasons about as if it were the design.

`comfortable` for public at every class is carried unchanged from `00-UI-SPEC.md`: the density axis
is **admin-only**, while the 44px floor is a **both-surfaces** floor.

---

## §5 — The floor

**`SHOTS >= 80`.**

It replaces `-ge 35`, which was the floor for a two-viewport record and is now less than half the
real count.

**80 is a floor, not a target.** The count derived in §6 is **88**. The floor is set below the
derived count deliberately, so that retiring one artefact does not fail a gate that has nothing to
say about whether the design is good. A gate pinned to the exact count is a gate that fails on the
next correct change.

The corresponding frontmatter value in plan 00-17's `must_haves.artifacts` is `min_files: 80`.

---

## §6 — The derived total, with the arithmetic shown

Do not transcribe this number into a new assertion. Recompute it from §2 whenever the artefact set
changes; a contract whose count is asserted rather than derived goes stale the first time an
artefact is added, and then the staleness is discovered by a failing gate instead of by reading.

```
admin desktop   S- 7 + E- 5 + T- 8 + O- 9  = 29 artefacts x 1 viewport   = 29
admin phone     P- 4 + R- 2                =  6 artefacts x 2 viewports  = 12
public six      X-work-recolour, X-work, X-photos
                                           =  3 artefacts x 6 viewports  = 18
public six      X-home state A + state B   =  2 states    x 6 viewports  = 12
public six      X-case bracket: cairn + design-system
                                           =  2 artefacts x 6 viewports  = 12
public one      X-case hued, momentum, timeshift
                                           =  3 artefacts x 1 viewport   =  3
public one      X-home-act2                =  1 artefact  x 1 viewport   =  1
public one      X-contact-sheet            =  1 artefact  x 1 viewport   =  1
                                                                          ---
                                                              TOTAL        88
```

Check: `29 + 12 = 41`; `41 + 18 = 59`; `59 + 12 = 71`; `71 + 12 = 83`; `83 + 3 = 86`;
`86 + 1 = 87`; `87 + 1 = 88`. **88 ≥ 80**, so the floor holds with eight files of headroom.

For orientation, the same artefact set under the old two-viewport policy was ≈ 49 files.
`00-RESPONSIVE-CONTRACT.md` §9 estimated ≈ 84; that figure predates the rework and did not carry
`X-home-act2` or the three non-bracket case studies. **88 supersedes 84.**

---

## §7 — The derivation rule, and it is the one that matters most

> **The capture list is built from `CANONICAL_IDS` plus each route's own `STATES` export. It is
> never a hand-listed URL set.**

This is already plan 00-17's own stated key link — `.playground/shoot.mjs` →
`.playground/src/lib/artefacts.mjs`, `pattern: "CANONICAL_IDS"` — so the two documents agree by
construction rather than by coincidence. Plan 00-16 already wrote the glob logic that reads each
route's `STATES` for the coverage matrix; `shoot.mjs` reuses it rather than reimplementing it.

**The failure it prevents, stated plainly:** a hand-listed URL set silently omits whatever was
added last, and whatever was added last is always the least-reviewed thing in the set. In this
phase that would have been `X-home` — the two-state landing, built in plan 00-22, three plans
before the capture runs. An omission there is not a missing file; it is the newest design decision
in the phase going unphotographed on the one day the playground still exists.

**Therefore the script fails loud, it does not warn.** If any member of `CANONICAL_IDS` produced no
file, `shoot.mjs` exits non-zero and **names the id**. It never warns and exits 0. Its negative
control is already specified in plan 00-17: adding a fake id to `CANONICAL_IDS` must make the
script exit non-zero naming that id, and removing the fake id must restore exit 0.

**The derivation rule also owns the count.** Because the list is derived, adding an artefact adds
its captures automatically and moves §6's total; the floor in §5 does not move. That asymmetry is
intentional and is what keeps the gate about the design rather than about bookkeeping.

---

## §8 — The amended `X-` inventory

`00-RESPONSIVE-CONTRACT.md` §9 was written before plans 00-20 and 00-22 landed, so its `X-` set is
one route retirement and one new artefact out of date. This is the current set. Eleven public ids.

| Artefact id | Route | Captured at | Reason |
|-------------|-------|-------------|--------|
| `X-work-recolour` | `/work-recolour` | **all six** | Carries resolutions 1, 2 and 3; the recolour is the control the restructure is read against, so it must exist at every class its partner does. |
| `X-work` | `/work` | **all six** | The public surface whose horizontal overflow at 344 and 390 plan 00-21 closed, and where Ivory→Charcoal exception 3 lands on cards for the first time. Both are only visible at the narrow classes. |
| `X-photos` | `/photos` | **all six** | 39 photographs, eight anchor filters. The filter row **wraps at classes 3–6 and becomes a horizontal scroll rail at classes 1–2** — a documented behaviour change inside the matrix, so the classes on either side of it are both required. |
| `X-home` | `/home` | **all six, both states** | See §9. |
| `X-home-act2` | `/home-act2` | **1440 only** | Plan 09's OQ-1 resolution. It is now also rendered inside `X-home`'s state B **through one shared component**, so its responsive behaviour is already photographed six times under `X-home`. Six more captures would photograph one design twice. Kept at 1440 because the id is cited by OQ-1 and must resolve to an image. |
| `X-case-cairn` | `/work/cairn/` | **all six** | **The longest study: 692 words.** The upper bracket on the measure. |
| `X-case-design-system` | `/work/design-system/` | **all six** | **The shortest study: 597 words.** The lower bracket on the measure. |
| `X-case-hued` | `/work/hued/` | **1440 only** | Inside the bracket at 619 words. One capture as proof the template rendered its content. |
| `X-case-momentum` | `/work/momentum/` | **1440 only** | Inside the bracket at 682 words. |
| `X-case-timeshift` | `/work/timeshift/` | **1440 only** | Inside the bracket at 647 words. |
| `X-contact-sheet` | `/` | **1440 only** | Review chrome, not a design. |

**Retired, and they must not appear in the record:** `X-case-long` and `X-case-short`. Plan 00-20
replaced the stacked two-tier routing (`/case/long`, `/case/short`) with **one tier, five studies,
one route per case at `/work/{id}`**. `src/pages/case/` no longer exists. A capture named
`00-X-case-long-…` would mean the script was hand-listed and stale — the exact failure §7 exists to
prevent.

### The four ids §9 could not resolve, each with a stated reason

**1. The five `X-case-*` ids that replaced two tier ids.** Two at all six classes, three at 1440.

**2. Which two are the bracket — named by measurement, not by memory.** After plan 00-18's
compression the five studies measure **597 · 692 · 619 · 682 · 647** words, all inside R-1's
500–700 band. So:

- **longest = `X-case-cairn`, 692 words**
- **shortest = `X-case-design-system`, 597 words**

**This is a different pair than it would have been before plan 00-18 ran**, and the difference is
the point: `design-system` was a *long*-tier study that compressed ~60%, while the old short tier
compressed ~20%, so the shortest study today is a former long one. Anyone selecting the bracket
from memory of the tiers picks the wrong pair. Select it by re-reading the word counts — they are
recorded in `00-20-SUMMARY.md` §"The five routes" and are enforced by the loader's band check.

**3. `X-home`, both states, all six.** §9's row already said so; §9 just did not know the artefact's
id, because plan 00-22 had not run.

**4. `X-home-act2`, 1440 only** — the shared-component reason above.

---

## §9 — How `X-home`'s two states are captured

Both states live at **one URL**, `/home`, reached by a plain document scroll. The state slot values
in the filename are fixed here so they are stable rather than invented per run:

| State | State slot | Filenames |
|-------|-----------|-----------|
| State A — the landing | **`state-a`** | `00-X-home-state-a-dark-{344,390,768,841,1024,1440}.png` |
| State B — after the transition | **`state-b`** | `00-X-home-state-b-dark-{344,390,768,841,1024,1440}.png` |

**Capture method:**

1. **State A** — `window.scrollTo(0, 0)`, settle, capture.
2. **State B** — scroll **exactly one viewport height**: `window.scrollTo(0, window.innerHeight)`,
   settle, capture.

**Why exactly one viewport height is the right instruction, and why it is verifiable.** The chrome
above state A measures a **constant 131px** at all six classes (AppBar row plus main padding —
measured in plan 00-22, not assumed), and state A's height budget is
`calc(100svh - var(--hm-above))`. So state A occupies document y `131 → 100svh`, and state B's top
sits at exactly `100svh`. Scrolling by one viewport height therefore lands the viewport top on
state B's top. **This only works because state A is the budget and not a bare `100svh`** — with
`100svh`, state A would end at `131 + 100svh` and one viewport of scroll would leave a 131px band
of state A's photographs on screen while the CSS looked correct. The capture instruction and the
height budget are the same fact stated twice; if either changes, both change.

**These two captures are the one documented exception to full-page capture.** Every other artefact
is captured **full-page**, because several are taller than 900px — the 39-photo grid, the 11-bullet
résumé entry, the conflict diff — and a clipped capture would record only the top of the screen the
review passes are about. `X-home` inverts that: **the viewport is the artefact.** A full-page
capture of `/home` produces one image of the whole ~1058px document at both scroll positions, so
state A and state B come out **byte-identical** and the two-state design goes unphotographed while
twelve files claim otherwise.

Plan 00-17's assertion is *"at least one capture is taller than 900px, proving full-page rather
than viewport-clipped capture"*. It is satisfied by any of the tall admin artefacts, so this
exception does not weaken it and no amendment to that assertion is needed.

---

## §10 — Capture hygiene, carried forward unchanged

These are plan 00-17 task 1's requirements, restated because a capture that violates them produces
files that pass every assertion in this document and are still worthless.

- **Wait for network idle and for fonts to settle before every shot.** The three Fontsource
  families load as variable fonts with `font-display: swap`; a capture taken early records the
  fallback stack and makes the typography review worthless.
- **Full-page, not viewport-clipped**, everywhere except §9's stated exception.
- **Start `astro dev`, not a static build.** `?state=` variants are served by `astro dev` only, and
  the non-populated states are not otherwise reachable.
- **Tear the server down in a `finally` block**, so a failed capture cannot leave a listener behind.
- **Print a final count**, and fail if any canonical id produced no file.

---

## §11 — What this document does not do

- **It does not replan plan 00-17.** 00-17's three tasks, its one human checkpoint, its
  `autonomous: false`, its six review passes, its full-page assertion, its admin-never-dark
  assertion and every clause of its `.playground` deletion fence are untouched by this contract.
  What changed in 00-17 is four literals and the two prose clauses that quote them.
- **It does not edit `00-FINDINGS.md`.** That register keeps a fixed denominator of **fifteen** `G-`
  rows and states its own scope rule: a plan that finds something outside it records the finding in
  its own SUMMARY rather than adding a row.
- **It does not decide anything by eye.** Nothing here answers a question that needs a human
  looking at an image. The record is what the human at plan 00-11 and plan 00-17 looks at; this is
  only the policy that decides which images exist.

---

*Phase 0 · plan 00-25. Sources: `00-RESPONSIVE-CONTRACT.md` §1, §2, §9 and §10 (R-1);
`00-UI-SPEC.md` §"Artefact classes and ID scheme", §"Viewport and mode contract", §"Screenshot
record", §"The six review passes"; `00-17-PLAN.md` tasks 1 and 3; `00-20-SUMMARY.md` §"The five
routes" for the five case ids and their word counts; `00-22-SUMMARY.md` for `X-home`, the two-state
landing and the measured 131px; `00-21-SUMMARY.md` for the responsive shell and the 344/390
overflow closure; `00-09-SUMMARY.md` for the original `X-` set. Every count in §6 is derived from
§2's policy and shown as arithmetic; no count here is transcribed from another document.*
