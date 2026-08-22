---
phase: 0
plan: 09
subsystem: design-ideation
requirement: DSGN-03
status: sketched — awaiting the eye review in plan 11
created: 2026-08-17
artefacts:
  - X-work-recolour
  - X-work
  - X-photos
  - X-home-act2
  - X-contact-sheet
supersedes: >
  design_handoff_portfolio/Work.dc.html and Photos.dc.html — the ivory iteration.
  The handoff's own note says to port them onto the dark palette; this records how.
appended:
  - plan: 10
    requirement: DSGN-02
    date: 2026-08-17
    section: Case-study templates
    artefacts: [X-case-long, X-case-short]
  - plan: none — OFF-PLAN, by direct user direction
    date: 2026-08-17
    section: Responsive direction
    artefacts: []
    supersedes: [D-39]
    companion: 00-RESPONSIVE-CONTRACT.md
---

# Public design notes — the ivory→charcoal resolution, OQ-1, and the case-study templates

`Work.dc.html` and `Photos.dc.html` are the handoff's earlier ivory iteration: 103 and 69
lines of inline styles, hardcoded hex, not one class name. Every substitution in them is
mechanical and individually reviewable, which makes them look like a find-and-replace job.
**Nine of them are not straight swaps, and mapping those mechanically regresses the design
while looking like progress.** This document is what survives the playground's deletion.

Sketches live under `.playground/`, which is gitignored and thrown away at phase exit.
Screenshots are taken in plan 17, before deletion. If a claim here is not also in a
screenshot or in `00-FINDINGS.md`, this file is the only place it exists.

**What the automated guard does and does not do.** `check-no-ivory.sh` greps the sketch
sources for the seven ivory values and exits non-zero on any hit. It proves the **absence of
ivory** and nothing else — a page that replaced every ivory value with magenta passes it. All
nine resolutions below are judgements and all nine are reviewed **by eye in plan 11**. The
script says so in its own output, on every run, so a green line in a log cannot be quoted as
"the colours are right".

---

## Straight substitutions

Applied mechanically wherever the exceptions below do not override them. Dark is the public
default (DSGN-03); light is carried for completeness because the same tokens serve the admin.

| Ivory value | Role it played | Charcoal DARK | Charcoal LIGHT |
|-------------|----------------|---------------|----------------|
| `#F4F1EB` | page field | `#161616` — `--page-bg` | `#F4F1EA` — `--page-bg` |
| `#26231E` | primary ink | `#EAE7E0` — `--ink` (14.65:1) | `#1A1815` — `--ink` (15.71:1) |
| `#FFFEFB` | card surface | `#1E1E1D` — `--cream-2` | `#FBF9F4` — `--cream-2` |
| `#8D8779` | muted text | `#B1AEA8` — `--ink-3` (8.18:1 AAA) | `#4F4C42` — `--ink-3` (7.61:1 AAA) |
| `#E6E0D2` | card border | **see resolution 3** — `--wire`, not `--rule` | `#D5CFC2` — `--rule` |
| `#DDD6C8` | control border | `#727268` — `--wire` (3.72:1) | `#878173` — `--wire` (3.44:1) |
| `#C4BDAD` | placeholder-marker grey | **deleted, not recoloured** | same |
| `#B0722A` as small accent text | metrics, pill labels, the 22px cross-link | `#D4A66D` — `--ochre-d-strong` (8.16:1) | `#6B4417` — `--ochre-d-strong` (7.55:1) |
| `#B0722A` as display / non-text accent | the header period, hover borders, focus | `#C6883A` — `--ochre-d` (6.02:1) | `#8C591F` — `--ochre-d` (5.22:1) |
| `#B0722A` as fill | the hued icon square | `#B0722A` — `--ochre`, unchanged | `#B0722A` — `--ochre`, unchanged |
| `#3E5A48` | Momentum icon | unchanged — 7.61:1 with white | unchanged |
| `#52585E` | TimeShift icon | unchanged — 7.20:1 with white | unchanged |
| Newsreader | display serif | **Playfair Display** — the handoff's own §Type says unify on Playfair | same |

**The placeholder row is the one that is not a colour change.** `#C4BDAD` painted the
handoff's two bracketed markers on the Work cards. Those markers are **deleted** and plan
02's real copy takes their place, verbatim. A recoloured placeholder is a placeholder that
survived the port and now looks intentional.

**Two of the seven collide with legitimate charcoal light-mode tokens.** The ivory muted grey
`#8D8779` is charcoal's `--ink-5` (decorative only, never text) and the ivory placeholder grey
`#C4BDAD` is charcoal's `--rule-strong`. Both are in UI-SPEC's own light-mode table. UI-SPEC
specifies the guard as a grep over the whole of `src/`, which therefore **can never go green**
against plan 04's theme file. Resolved by excluding that one file by exact name and asserting
separately that those two values appear in it only as those two declarations — so the
exclusion permits exactly what UI-SPEC specifies and cannot smuggle anything else through.
See `check-no-ivory.sh`'s header. Correction to UI-SPEC's stated command, not to its intent.

---

## The nine resolutions

Each states the substitution a mechanical port would have made, the measurement that rules it
out, and the artefact where the resolution is visible.

### 1 — Ochre as text inverts its role, and splits into two tokens

**Mechanical port:** accent → accent. `#B0722A` everywhere it appeared.

**Why it fails, twice.** The Brevo metrics (`+15% CONVERSION`) and the italic cross-link are
`#B0722A` on ivory: **3.52:1, already failing AA before the port**. On charcoal dark the same
value reaches 4.56:1 on the page but **4.20:1 on a raised card and 3.91:1 on an inset panel** —
so it carries the existing failure across and then adds a second one on exactly the surfaces
Work's project cards sit on. Both are small accent text, so Rule C-6 puts both on
**`--ochre-d-strong`**: 8.16:1 dark, 7.55:1 light. The Work header's period is 44px display
and stays on `--ochre-d` — above 22px the darker value reads brown rather than ochre and the
identity goes with it.

**Artefact:** `X-work-recolour` (all three appearances, marked inline), `X-work`.

**Consequence for the token contract:** `--ochre` is a **fill**, never text. Rule C-1 holds
directionally in `check-contrast.mjs`, so darkening `--ochre` to make a lint pass now breaks
the build.

### 2 — The hued icon's ink is wrong in both themes

**Mechanical port:** keep the white glyph, recolour nothing — the icon is already `#B0722A`.

**Why it fails.** The handoff specifies a white italic `h` on `#B0722A`: **3.97:1, fails**. The
handoff's *Home* spec proposes `#EAE7E0` on the same square, which is **worse at 3.22:1**. On
charcoal the square keeps `--ochre` and takes `#161616` ink — **4.56:1**. Work's other two
squares keep white at **7.61:1** and **7.20:1**.

**So the ink colour is PER-ICON, not global.** That is the part a mechanical port gets wrong,
because "icon text is white" reads like a rule and is true of two icons out of three.

**Artefact:** `X-work-recolour`, `X-work`, `X-home-act2` — all three carry the corrected ink.

### 3 — Card boundaries invert which property carries them

**Mechanical port:** `#E6E0D2` → `--rule`, the decorative hairline.

**Why it fails.** On ivory the card is *lighter* than the page (`#FFFEFB` over `#F4F1EB`) and
the **fill** draws the boundary; the border is decorative. On charcoal dark the fill delta
between `--cream-2` `#1E1E1D` and the page `#161616` is **~1.08:1**, so the fill draws nothing
and the **border** becomes the sole boundary. `--rule` is **1.43:1**. Cards mapped that way
visually dissolve into the page. Work's project cards therefore take **`--wire`** `#727268`
at **3.72:1**.

> **The rule: on dark, a card's boundary is carried by its border; on light, by its fill.**

**Artefact:** `X-work-recolour`, `X-work`.

**Design-system gap this exposes.** `Card` binds `border-color` to `--rule` in both the
`glass` and `subtle` surfaces and **exposes no prop that reaches it**, so the sketches carry a
one-line override. The same collapse hits `Chip`, whose `default` tone fills with `--cream-3`
on a `--cream-2` card — about **1.05:1**, drawing nothing at all. Generalised: **every
design-system surface primitive draws its boundary from `--rule` and its fill from the
`--cream-*` ramp, and on charcoal dark both are sub-1.5:1 deltas.** This is the single most
consequential DSGN-03 finding for Phase 1 and is listed under Open for review.

### 4 — Shadows do not port at all

**Mechanical port:** carry `--shadow-1/2/3` unchanged.

**Why it fails.** They are black-alpha (`rgba(0,0,0,.05–.12)`) and therefore **invisible on
`#161616`**. Every card below overlay level would read as flat. Charcoal's dark block restates
them as surface plus hairline — `--shadow-1: none`, `--shadow-2: 0 0 0 1px var(--rule)` — and
keeps a real drop shadow only on `--shadow-3`, because modals and the lightbox sit over a
scrim where a black shadow does read.

Shadow is a **geometry accent**, which D-31 puts on the theme side of the ownership line, so
this is a charcoal deliverable and **not** a `00-FINDINGS.md` entry. It must be *restated*
rather than omitted, or the exhaustiveness invariant fails.

**Artefact:** every sketch, by what is absent — no elevation anywhere in the four public pages
is expressed as a shadow. Elevation is `--cream-2` / `--cream-3` plus a `--wire` hairline.

### 5 — Photographs need an edge they did not need on ivory

**Mechanical port:** tiles keep `overflow: hidden` and a radius, no border either way.

**Why it fails.** On a near-white field every photograph has an implicit boundary. On
`#161616` a dark-toned photograph bleeds into the page, and **this gallery skews dark** —
architecture at night, `Into The Mist`, the five-photo wildlife set. Tiles take
`box-shadow: inset 0 0 0 1px var(--rule)` in **dark only**; in light the field already does
the job and the ring would be noise.

**Second consequence, and it is a Phase 5 build note that originates here.** The LQIP blur-up
placeholder must sit on **the charcoal page colour, not white**. All 39 photos carry a base64
placeholder in `urls.thumb` (21.6 KB for the set); a white-backed placeholder flashes hard on
`#161616` before the file lands.

The `scale(1.03)` / 0.6s hover, the 10px radius and `overflow: hidden` all port unchanged.

**Artefact:** `X-photos`, all 39 tiles.

### 6 — The active filter pill flips colour, because its meaning is "maximum contrast"

**Mechanical port:** active pill is `#26231E` fill with `#F4F1EB` text → `--ink`-ish dark fill.

**Why it fails.** The semantic is not "dark". It is *"maximum contrast against the field"*,
and on charcoal the field is the dark one. Mapped literally you get a near-black pill on a
near-black page — invisible. On charcoal dark the active pill is filled **light**: `--ink`
`#EAE7E0` background with `--page-bg` `#161616` text, **14.65:1**.

Inactive pills keep an outline and that outline is **`--wire`**, not `--rule`: a filter pill is
an interactive control whose border is its only boundary, so WCAG 1.4.11's 3:1 governs and
`--rule`'s 1.43:1 would be illegal — even though `--rule` is perfectly correct as the hairline
between two rows on the same page.

Pill labels are 9.5px, the smallest accent text on the site, so where they are accented at all
they take `--ochre-d-strong`. **The accent-reserved list includes the active pill in LIGHT
MODE ONLY**; in dark it is the ink ramp, per the flip above, which is why nothing in the
sketch's filter row is ochre-filled.

**Artefact:** `X-photos`, eight anchors.

### 7 — Newsreader → Playfair is not size-neutral

**Mechanical port:** swap the family, keep the number.

**Why it fails.** Playfair Display has a larger x-height and heavier stems than Newsreader at
the same pixel size, so the 52px headers read **heavier and larger** after the swap — before
the G-11 snap to 44px is even considered. **Do not blind-swap the family and keep the
number.** The italic "Photographs" is the worst case, because italic serif amplifies the stem
difference.

Both headers are sketched at `--text-4xl` **44px** with the handoff's authored **52px**
rendered beside them, labelled and not shipped, so Phase 1 has evidence rather than an
assertion. 52px falls in the shared scale's 44→60 hole; `--text-*` is sizing and therefore
design-system-owned, so the hole is filed upstream as **G-11**, a new step available to every
brand, never a theme-local override.

**Artefact:** `X-work-recolour` and `X-photos`, each carrying its labelled 52px reference.

**Compounding, and unresolved:** the face layer ships **no italic axis** (plan 04's Option A —
four roman entry points, 8 face rules). Charcoal has two italic roles: the 22px display
subtitle and the italic serif cross-link at the foot of Work and Photos. Both currently render
as **browser-synthesised oblique**, not Playfair's drawn italic, which on an editorial serif is
visible. Adding `playfair-display/wght-italic.css` costs 4 more rules and moves a recorded
acceptance baseline from 8 to 12. Listed under Open for review — it is a Phase 1 decision
about what the face layer is *for*, and this plan deliberately did not take it alone.

### 8 — Measure length: 1280px is too wide for muted body on dark

**Mechanical port:** the band spans the page, as it does on ivory.

**Why it fails.** Work and Photos are 1280px; Home is 1080px. The sub-paragraph is already
capped at 480px and stays. But the employment band's hairline rows put a serif title at the
left edge and a mono metric at the right edge of a 1280px dark field, where the two ends stop
reading as one row. **The band is capped at 1080px to match Home**, while the page stays at
1280px for the card grid and the masonry.

**This is a DSGN-03 decision, not a token change.** Judge it by eye — it is listed under Open
for review.

**Artefact:** `X-work`, the employment band.

### 9 — Work's structure changes independently of colour, and must not be conflated with it

**Mechanical port:** recolour the page and ship it.

**Why it fails.** Three locked decisions restructure the page while it is being recoloured:

- **D-44** replaces the ivory 2×2 card grid plus its trailing engineering strip with **two
  bands: employment first, then projects.** Brevo, PharmEasy and MAQ are a
  professional-experience band; the five own projects sit below. Different kinds of evidence,
  read for different reasons — and burying employment under a tail made it read as a footnote
  to a side project.
- **D-45** adds `Live` / `Maintained` / `Archived` status badges and removes date reliance, so
  a reader learns whether a project is real and current without the page ageing on its own.
- **D-38** makes it **five** projects, not four, so the 2×2 grid is gone regardless.

So the recolour and the restructure ship as **two separate artefacts**. If a reviewer dislikes
the result, they need to be able to say which change caused it — the same attributability
argument that split cascade layers out of Phase 1 (D-28).

**Artefacts:** `X-work-recolour` (structure untouched) and `X-work` (restructured), adjacent
in the contact sheet index so the pairing is unmissable.

**What D-45 exposed.** Only two of the three status values occur in the real data — two `Live`
and three `Maintained`, per `00-COPY/one-liners.md`. `Archived` is rendered in a legend rather
than pinned to a project, because labelling a live project archived to fill a swatch is
inventing a fact. Looking at that legend on a raised card shows the real problem:
`Badge`'s `neutral` and `pending` tones both fill with `--cream-2` and `count` fills with
`--cream-3`, and on charcoal dark those three surfaces sit within ~1.1:1 of one another. D-45
needs three distinguishable neutral statuses and the tone palette supplies roughly one.

---

## OQ-1

**The question.** The handoff's Home Act-2 grid is a 2×2 for four projects and omits Cairn
entirely. D-38 locks five. Home is not in DSGN-03's scope — DSGN-03 covers Work and Photos,
and **PUB-01 owns Home in Phase 5**. UI-SPEC flagged this as having **no owner in Phase 0
despite Phase 0 being the design phase**, and required the planner to do one of exactly two
things: scope a single Act-2 sketch, or record an explicit Phase 5 deferral citing OQ-1.
Leaving it implicit was named as the failure mode, because Phase 5 would then improvise a
layout the handoff never specified, under build pressure, with no reviewer looking at it.

**The decision taken.** **Phase 0 scoped the sketch.** `X-home-act2` exists, renders all five
projects in charcoal dark, and resolves the five-into-four problem. One resolution is rendered
rather than a menu of options — a menu is a decision postponed with extra steps.

**What the sketch resolved.** The design system is promoted to a **full-width flagship row**
above the grid, and the handoff's approved **2×2 is kept intact** beneath it for the four
projects it actually drew, at its stated gaps of 40px × 56px (`--space-10` row, `--space-14`
column — both real steps, nothing off-grid). Three reasons, in order of weight:

1. D-38 already names the design system the flagship, and gives it a reason no other project
   has: it is the only one whose outcome the reader is looking at while reading about it. A
   layout that says so costs nothing extra, and the copywriting contract's rule 5 already
   requires its one-liner to close by pointing at the page the reader is on.
2. It adds the fifth project **without leaving a hole**. A 2×3 grid holding five entries has an
   empty cell, and an empty cell in a 2×2-derived layout reads as a missing project rather
   than as a composition.
3. It is the **smallest possible change to an approved design**. Every other resolution — 3+2,
   a five-across row, a scrolling strip — restyles Act 2 wholesale, and Act 2 is the one part
   of Home the handoff got signed off.

The sketch also checks the copywriting contract's one-liner budget in the slot it was written
for: 60–110 characters at `--text-base` 13px in a ~380px column really does land on two lines.

**What remains Phase 5's.** **The rest of Home is PUB-01's, in Phase 5.** Act 1 — the name
treatment, the italic subtitle, the tagline, the 3×2 peek gallery and its single stored
`peekPosition` — is out of DSGN-03's scope and is **outlined, not designed**, in the sketch,
so the Act-2 grid can be judged where it actually sits rather than floating on an empty page.
Restyling Act 1 here would have quietly annexed Home into a phase that does not own it.

**Status:** OQ-1 is closed as *resolved by sketch*. Phase 5 inherits a rendered layout to
build against, not an open question to improvise around.

---

## Open for review

The eye review in plan 11 owns these. Each is a judgement this plan took deliberately and
would not defend to the death; each is cheap to reverse and expensive to leave undiscussed.

**1 — The 44px vs 52px page header (G-11).** The primary headers on Work and Photos are
`--text-4xl` **44px**, because the shared scale runs 44 then 60 and `--text-*` is
design-system-owned. The handoff authored **52px**. Both are rendered side by side on
`X-work-recolour` and `X-photos`, the 52px labelled and not shipped. **The question is not
which number is right in the abstract — it is whether 44px Playfair, with its larger x-height
and heavier stems, already carries the weight the handoff wanted at 52px Newsreader.** If it
does, G-11 stops being urgent and becomes a backlog nicety. If it does not, G-11 blocks Phase
5 and needs to land in Phase 1.

**2 — The 1080px employment band cap (resolution 8).** `X-work`'s employment band is capped at
1080px inside a 1280px page. It is a DSGN-03 decision rather than a token change, and it is
the kind of thing that looks obviously right to whoever made it and arbitrary to everyone
else. If the cap reads as an unexplained indent rather than as a measure, the alternative is
to keep the band full-width and close the gap another way — a middle column, or moving the
metric under the title.

**3 — The 22px cross-link on `--ochre-d-strong`, and its stated fallback.** WCAG's large-text
threshold is 24px. The italic serif cross-link is **22px**, two pixels below it, so a strict
reading requires 7:1 and `--ochre-d` reaches only **6.02:1** (dark) / **5.22:1** (light). It
takes `--ochre-d-strong`. **This is a judgement, not arithmetic** — the arithmetic only says
22 < 24. The judgement is that a 2px shortfall against a threshold is not worth defending when
the alternative token already exists, costs nothing, and the element is a navigational link,
the one class of accent text where a reader who cannot resolve it loses a route rather than a
decoration. **The stated fallback is to raise the link to 24px and revert it to `--ochre-d`**,
resolving the ambiguity by arithmetic instead. Both are rendered side by side on
`X-work-recolour`. If `#6B4417` reads too heavy for a 22px italic serif, take the fallback.

**4 — The italic axis (resolution 7).** Charcoal's two italic roles currently render as
synthesised oblique. Adding the axis costs 4 face rules and moves a recorded baseline from 8
to 12. **Not resolved unilaterally by this plan**, because that baseline is an acceptance
criterion elsewhere and silently changing what "8" measures would invalidate it.

**5 — The accent does not flow through the design system's `tone` axis.** This is the largest
thing this plan found and it is new. The design system resolves `tone="accent"` to
`var(--amber-d)`, and charcoal declares `--ochre` / `--ochre-d` / `--ochre-d-strong` as **new
names** without redeclaring `--amber*`. So every declarative accent in the system — `tone="accent"`
on `Heading`/`Text`/`Eyebrow`, `Card variant="amber"`, `Divider accent="amber"`, `Link`'s
amber hover underline, `Timeline`'s dot — renders the design system's **yellow** `#fbbf24` on
a charcoal page. High contrast, wrong identity. The sketches therefore reach for the charcoal
token by name via the legacy `color` prop rather than pretending the tone axis works.
UI-SPEC's ownership allowlist already anticipates this — it says charcoal's `--ochre*`
*replaces* `--amber*` — but plan 04 implemented the new names without the replacement, and
nothing was asserting the difference. **Phase 1 must either alias `--amber*` onto the ochre
ramp in the charcoal blocks, or repoint the components' semantic accent at a role token.**

**6 — Surface primitives cannot express a boundary on dark (resolution 3).** `Card` and `Chip`
both bind their border to `--rule` and their fill to the `--cream-*` ramp, and on charcoal dark
both are sub-1.5:1 deltas, so neither draws a boundary. No prop reaches either. The sketches
carry one-line overrides; the upstream fix is a boundary axis, or binding the dark-mode
surface border to `--wire`. Related: `Badge`'s three neutral tones collapse into each other on
a raised card, which is what D-45 needs three of.

**7 — Five design-system surface tokens still have no charcoal mapping**, carried forward from
plan 04 and now with a concrete instance: `AppBar` fills from `--surf-2`, which charcoal does
not declare, so the public nav's background comes from the design system's neutral translucent
white rather than from a charcoal surface. Add `--panel`, `--bg`, `--pg`, `--paper-warm`,
`--paper-deep` and `--surf-1/2/3` to the charcoal blocks, or state that they are retired.

**8 — `Footer` has no ReactNode slot on either side.** The handoff's footer is one row:
socials left, the italic serif cross-link right. `Footer` compact takes a **string** for its
left slot and a **link array** for its right, so that row cannot be composed from it. The
cross-link is promoted to its own right-aligned row above the footer, which arguably reads
better at 22px anyway — but it is a layout change forced by a component API, and it should be
a deliberate choice rather than an accident.

---

*Phase 0 · plan 09 · DSGN-03. Sources: `00-UI-SPEC.md` §Ivory→Charcoal and §Color,
`00-CONTEXT.md` D-25/D-38/D-43/D-44/D-45, `00-COPY/one-liners.md`, `00-FINDINGS.md`,
`design_handoff_portfolio/{Work,Photos}.dc.html` and `README.md`, `data/*.json`. Every ratio
quoted was computed in plan 04 by `check-contrast.mjs` and reproduces UI-SPEC to two decimal
places; every ratio not from that set is marked where it appears.*

---
---

## Case-study templates

*Appended by plan 10 · DSGN-02 · artefacts `X-case-long` and `X-case-short`.*

**No case-study page has ever existed in this repository.** Not on the legacy branch, not in
the handoff, not in the design system — the handoff's own README says it contains no design
for case-study pages at all. That void is why DSGN-02 exists, and it means there was nothing
to port and nothing to recolour. The nearest structural cousin in the whole handoff is
`Resume.dc.html`, the only long-scroll editorial page it drew, and the register the prose is
written in is `../design-system/CHANGELOG.md`. Both are used below and both are named where
they are used.

Two templates, five studies, and **every word on both pages is the committed first-pass draft
read in place at build time** — nothing is lorem, and nothing is a six-word stub standing in
for a paragraph. That is DSGN-02's success criterion in the terms it is written in, and it is
the whole reason D-40 required length-realistic drafts in the first place.

---

### Which study renders through which template, and why the split is not arbitrary

| Study | Tier | Words | Sourced claims | Gap blocks |
|-------|------|------:|---------------:|-----------:|
| Design System | long | 1,699 | 18 | 1 |
| Cairn | long | 1,764 | 22 | 1 |
| Momentum | short | 822 | 6 | 1 |
| TimeShift | short | 703 | 6 | 1 |
| hued | short | 698 | 5 | 1 |

Counted at build time over the four required sections of each draft; the leads and the
drafting comments are excluded, because they are meta about the study rather than the study.
Totals: **5,686 words and 57 provenance markers across the corpus.**

**The tiering is a consequence of the evidence, not a ranking of the projects.** The two
studies D-39 assigns the long form are *exactly* the two projects that have a `.planning/`
directory, a rationale-carrying decisions record and a register of options not taken —
`CHANGELOG.md` and `REMOVED.md`. Both already write in the register RESEARCH names as the one
reliable tell of a case study done well: *state the option not taken and what it would have
cost.* Drafting them was selection and compression rather than authoring, and both landed at
roughly 1,700 words with a six-entry register without being padded to get there.

The other three have no such record: 19 commits for hued, 59 for TimeShift, 396 for Momentum,
and **not one of them argues with an alternative anywhere**. A six-entry register for a
project whose repository holds one recoverable decision would be *inventing decisions* in
front of the audience most likely to open the repository — which D-40 rules out in as many
words. So the short tier is a real problem statement, ONE decision that is visible in shipped
code, and an admitted gap at paragraph scale. All three landed between 698 and 822 words.

**That is what makes the split correct rather than coincidental**, and it is why the ratio is
2:1 rather than something tidier. Had the tiering been a judgement about which projects
matter, the design system and Momentum would have been the long ones — Momentum has by far
the most commits and hued by far the fewest.

**The short tier is not a truncated long form, and the templates are built so a reviewer can
check that claim.** Both tiers share one loader, one stylesheet, one component set and one
measure. The differences are exactly three and all three are structural:

1. `## Decision` (singular) is one running section; there is no numbered register and no
   inset "option not taken" paragraphs, because those constructions do not occur in the
   drafts.
2. One hero plus **at most one** inline figure, against the long tier's one plus two.
3. The inline figure attaches to a *section* rather than to a register entry, because there
   is no register to attach it to.

**The spacing is deliberately NOT tightened**, and that is a decision rather than an
omission. The plan's phrasing permits "a shorter overall rhythm" and the first instinct was to
take one step off the section gap. It was not taken: plan 11 has to answer whether the short
form reads as a deliberate tier or as a truncated long form, and if the rhythm differed too, a
reviewer could not tell whether their answer was about the tier or about the gap. Same
attributability argument that split `X-work-recolour` from `X-work`, and that D-28 used to
move cascade layers out of Phase 1. The short pages are shorter because there is less to say,
which is the only reason they should be.

**Both claims are asserted at build time, not left to discipline.** The short template throws
if a short draft ever grows numbered sub-headings under `## Decision` — the point at which the
two tiers would have converged and the split would need re-arguing — and both templates throw
if their asset plan exceeds D-41's budget for their tier.

---

### The measure: 68ch, and one declaration that decides it

**68ch**, from UI-SPEC's layout maxima. The derivation: at `--text-md` **15px** DM Sans, 68ch
is about **620px**, which sits inside the standard **55–75ch** readability band and scales the
handoff's 480px-capped sub-paragraph convention up for long-form body. Prose is DM Sans
`--text-md` 15 at `--lh-relaxed` 1.55.

The literal `68ch` is written in **both** page sources, so the derived number is visible in
each artefact rather than buried in a shared file — and the shared prose renderer then
**asserts the two pages declare the same value**. A source grep on its own passes happily on
two different literals, which is precisely the drift D-39 forbids; the assertion is what makes
the grep mean something.

**The page is 980px and carries a 200px mono rail beside the measure at a 48px gap.** That
shape is taken from `Resume.dc.html` — 980px page, 200px rail, 1fr column, 48px gap — because
it is the only long-scroll editorial page in the handoff and is therefore the stated reference
for measure and heading rhythm. 48px is `--space-12`, a real step; 200px and 68ch are declared
once each in `case.css`.

**What the rail carries is not the section name.** Repeating the heading beside the heading is
furniture. It carries the section's position in the four-part spine (`01 / 04` … `04 / 04`)
and the section's **real length in words**, measured from the committed draft at build time.
Two things follow. The problem → decisions → outcome spine becomes a property of the rendered
page rather than of the source Markdown, without a table of contents. And a reviewer judging
"does 68ch hold up here" can read the number next to the thing they are judging — the same
argument the contact sheet's Part 4 makes for putting the byte counts beside the design.

Section lengths, for the two extremes: Cairn's `## Decisions` is **1,016 words** at 68ch,
which is the longest single stretch either template has to hold; hued's `## Outcome` is
**117 words**, of which the gap block is most of it.

**Body prose is `tone="secondary"` (`--ink-2`, 10.51:1), not `--ink`.** UI-SPEC specifies the
family, size and line height for case-study prose and does not specify a tone. `--ink` at
14.65:1 is the display and heading ink, and running 1,700 words of it on a dark field is
glaring; `--ink-2` is still comfortably AAA. This is a judgement, it is cheap to reverse, and
it is listed for the eye review below.

---

### The three kinds of non-final content, and what happens to each

The corpus carries three things that are not finished prose. Each gets one labelled treatment,
all three treatments live in one file, and **both tiers render all three identically** so that
a reviewer comparing the tiers is comparing structure rather than styling.

| | What it is | Treatment | What happens to it |
|---|---|---|---|
| `[NEEDS AKHIL]` | D-40 gap: placeholder prose at finished length | Paragraph scale, `--ink-3`, behind a 2px `--wire` rule, marker text kept inline | **FILLED** in the final-phase interview |
| `[source: …]` | Provenance on every factual claim | Inline mono at `--text-2xs` on `--cream-2` | **STRIPPED** in Phase 6 |
| HTML comment | What was searched and why it came up empty; corrections to stale figures | Offset mono block, dashed `--rule`, labelled | **STRIPPED** in Phase 6 |

**Correction to the plan's own phrasing.** Plan 10 asks for "the decision that gap blocks
render visibly during design review and are stripped in Phase 6". Gap blocks are **not**
stripped — they are *filled*, by the interview D-40 defers to the final phase. It is the
provenance markers and the drafting comments that are stripped, which is what the plan's own
earlier paragraph says. The distinction matters because it decides what Phase 6's copy pass is
actually doing: two mechanical deletions and one interview, not three deletions.

**The gap blocks render at paragraph scale and are never collapsed to a marker.** Their
*length* is the entire reason D-40 required length-realistic placeholders — a reviewer has to
be able to see that a paragraph-scale gap occupies a paragraph-scale slot, because that is
what tells them whether the finished copy will fit the layout they are approving. The literal
`[NEEDS AKHIL]` text stays inside the prose rather than being replaced by the label: a block
that reads as provisional because of its styling alone stops reading that way the moment
somebody screenshots it into a slide.

**The gap rule is `--wire`, not `--rule`.** The plan suggests `--rule` as an example. On
charcoal dark `--rule` is **1.43:1** against the page and would be very nearly invisible,
which defeats the stated intent of the treatment; `--wire` is **3.72:1**. This is resolution 3
generalised: on dark, a boundary that carries meaning is carried by a border strong enough to
draw. `--rule` is still used, correctly, for the decorative hairline that insets the "option
not taken" paragraphs and for the section dividers — resolution 6's rule, that `--rule` is
right between two rows on the same page and wrong as a meaningful boundary. **Both are on the
same page on purpose**, so the difference between the two values is visible in one glance.

**A review affordance, and it is not part of the design.** Both pages carry a labelled
checkbox that hides the provenance markers and the drafting notes — CSS only, one `:has()`
selector, no script and no hydration. It exists because one of plan 11's questions cannot be
answered by looking at the page once: whether the visible scaffolding is legible enough to
audit *without dominating the page*. It does **not** hide the gap blocks, because those are
the artefact. It is fenced inside a bordered band with the rest of the review chrome and
labelled as scaffolding.

---

### The gap boundary rule, and the one paragraph it protects

`check-copy-length.mjs` measures a `[NEEDS AKHIL]` block as **everything from the marker to
the next heading**. That is the right rule for a length *floor* — it is generous, and being
generous is safe when what you are enforcing is a minimum.

**It is the wrong rule for rendering, in exactly one file.** In `case-design-system.md` the
marker sits inside a block quote, the quote closes, and a *finished* paragraph follows before
`## Assets`: the closing that points at the page the reader is on. Applied literally, the
counter's rule would render that paragraph muted, hairlined and labelled provisional — a false
statement about the only claim in the corpus that is **already true**, and about the one
project D-38 makes the flagship precisely because its outcome is the thing the reader is
looking at while reading about it.

So the render boundary is: **a marker inside a block quote owns the block quote; a marker
outside one owns everything to the end of its section.** For four of the five studies the two
rules agree exactly. For the fifth the difference is one paragraph, and it is the most
important paragraph on the page — so the long template asserts at build time that the
design-system study's `## Outcome` still *ends* with that paragraph as ordinary prose, and
fails the build if the boundary rule ever changes underneath it.

**The trap underneath all of this**, and the reason the loader carries an explicit per-tier
heading table: the two tiers **do not spell their middle heading the same way**. Long form is
`## Decisions` (plural); short form is `## Decision` (singular). Within a tier the sequences
are byte-identical — which is exactly why D-39's two tiers become two templates rather than
five bespoke pages — but a loader assuming one spelling across both silently drops a section
from three of the five studies **and still renders a page**. The loader therefore throws,
naming the file, the missing heading, the headings that were found, and the difference between
the two tiers. A negative control confirms it: removing `## Outcome` from `case-cairn.md`
fails the build with that message; restoring it returns exit 0, byte-identically.

It throws a second time for a failure that looks like a passing check: a heading present with
**nothing under it**. `sections[heading]` is then `[]`, which is truthy, so a presence check
passes while the page renders an empty section that looks entirely deliberate.

---

### D-41: the asset plan, per study

Eleven slots across five studies. Every caption and every source below is taken from the
study's own `## Assets` section — the templates render the asset plan the drafts state rather
than one invented for them.

| Study | Hero | Inline | Where the inline sits |
|-------|------|--------|------------------------|
| Design System | this site, rendered *(capture)* | both themes side by side · Storybook a11y panel *(capture)* | after decisions **3** and **6** |
| Cairn | the board, populated *(capture from cairn.co.in)* | the Rejection Reframe · a detail page in dark mode *(capture)* | after decisions **1** and **6** |
| hued | `publishing/feature-graphic.png` **(in repo)** | `publishing/screenshots/final/01.png` **(in repo)** | end of `## Decision` |
| Momentum | `store-listing/feature-graphic.png` **(in repo)** | a goal card with the day's required amount *(capture)* | end of `## Problem` |
| TimeShift | the right-click conversion on a real page *(capture)* | the resolver reporting medium confidence *(capture)* | end of `## Decision` |

**Placement is the substance of D-41, not decoration.** "Where a decision is easier shown than
described" is a claim about a *position in the argument*. The long template therefore anchors
an inline figure to the register entry it illustrates, and asserts that the ordinal exists — a
mistyped ordinal would otherwise be a silent design error. Momentum's inline sits under
`## Problem` rather than `## Decision` because its argument *is* the number on the goal card,
and that number is the problem statement.

**No figure renders an image, including the two that exist.** Three reasons, in order of
weight. Not one of the eleven assets has been through D-42's path, so a file dropped into the
playground would be a different artefact from the one that ships — different origin, no
dimensions captured at upload. Four of the eleven exist in no repository at all and have to be
captured from live store listings. And rendering hued's two for real while the other nine
stayed reserved would make one study look different from the rest for a reason that has
nothing to do with the design, which is exactly the confound a tier review must not carry.

Every slot instead **reserves space at its intended aspect ratio** and states its role, its
source and whether the file exists today. That answers the question a reviewer actually has —
where does a screenshot sit and how much vertical room does it take — and answers it for the
assets that do not exist yet as well as the ones that do. The two Play Store feature graphics
are reserved at **1024 × 500**, which is that asset's published spec and what both files were
produced to.

**The hero breaks the measure; inline figures respect it.** The hero sits outside the sections
and runs the full 884px content width, because its job is to establish the project before the
argument starts. An inline figure is evidence *inside* the argument and is capped at the same
68ch, because a screenshot running wider than the paragraph it supports pulls the eye out of
the reading column exactly when the prose is making its point. Both tiers use both roles.

---

### D-42: the asset path

Screenshots take the **simple R2 asset path**: the admin uploads them **straight to R2 under
`assets/`**, on the **same custom domain as the photos**, with **width and height captured at
upload** so the case-study page reserves the space and does not shift as images land. The
legacy `/api/upload-asset` route is the precedent — it wrote directly to the R2 binding and
returned a public URL, without a commit.

They **do not go through the photo pipeline.** That pipeline composites a watermark and
extracts EXIF, and neither belongs on a screenshot of an interface: a watermarked UI capture
reads as a photograph that has been processed for the gallery, and EXIF on a screenshot is
either empty or misleading. Skipping it also means no Actions run, so publishing a case study
stays fast.

Every reserved slot on both pages prints this path in its caption, so the rule is on the
artefact rather than only in this document.

---

### Design-system findings this plan adds

Two, both new, both small and both the same shape as findings already recorded.

**1. A design-system `Text` cannot be recoloured by the page that contains it.** `Text`
inlines its variant's colour **whenever the `tone` prop is absent**, and an inline style beats
a stylesheet — so `.case-gap .ds-atom-text { color: … }` was written, looked correct, and did
nothing at all: the gap blocks rendered at exactly the same colour as the prose around them.
The fix is to pass `tone="muted"` and route the colour through the data-attribute path, which
is the design system's own preferred API. Generalised: **a wrapper class cannot restyle a
design-system Text; it can only be told its tone.** Same family as G-2 (Button's inline
padding) and plan 09's observation 3 (Badge is entirely inline-styled). Worth knowing before
Phase 5 tries to theme a component from its container.

**2. `Heading`'s line-height binding bites again, on every heading these templates use.** Plan
09 recorded that `data-size="3xl"` and `"4xl"` both carry `--lh-tight` 0.94 while UI-SPEC
assigns `--lh-snug` 1.08 to headings at 40–44px. These templates use `4xl` for the page
header, `3xl` for every section heading and `xl` for every register entry, and **all three**
carry an inline override. That is now four artefacts overriding the same binding, which
promotes it from an observation to a thing Phase 1 should fix.

**Carried, not re-litigated:** every accent on both pages reaches the charcoal token by name
rather than through `tone="accent"`, because the tone axis resolves to `--amber-d` and
charcoal never redeclares it (plan 09's finding 5). Nothing here uses `Card` or `Chip`, so
the boundary collapse (finding 6) does not bite — the figure slots are dashed `--wire` rules
because a placeholder should look like a placeholder, not like a card.

---

### Open for the eye review in plan 11

The two the plan names, plus three this one took and would not defend to the death.

**A — Does the short form read as a deliberate tier, or as a truncated long form?** This is
the question the whole D-39 split rests on, and it is the reason the spacing was deliberately
left identical: the answer has to be about the structure. If the short pages read as thin
rather than as tight, the fix is structural — a fourth section, a pull-quote, or promoting the
one decision to a titled entry — not a spacing change.

**B — Are the visible gap blocks legible enough to judge length without dominating the page?**
Every study carries exactly one, all five sit in `## Outcome`, and in the short tier the gap is
most of that section. Use the scaffolding toggle to read each page both ways. If the gaps
dominate, the alternatives are a lighter rule or a collapsed label — but **not** shortening the
placeholder prose, which would defeat D-40 outright.

**C — 57 provenance markers inline.** They are unmistakably not prose and they are also
frequent: Cairn's `## Decisions` carries 22 of them in 1,016 words. The judgement taken is that
auditable provenance is worth the visual cost during review and that Phase 6 removes the cost
entirely. The toggle exists so this can be judged rather than argued.

**D — Body prose at `--ink-2` rather than `--ink`.** See the measure section above. If 1,700
words of `--ink-2` reads washed out rather than comfortable, the change is one prop.

**E — The 200px rail carrying counts rather than the section name.** It is borrowed from
`Resume.dc.html`, and word counts in it are review scaffolding that Phase 5 will not ship. The
question is what the rail carries *then* — nothing, and the prose recentres; or the section
name, and it becomes furniture; or something the shipped page actually needs.

---

*Phase 0 · plan 10 · DSGN-02. Sources: `00-UI-SPEC.md` §Spacing (the 68ch derivation and the
layout maxima) and §Typography (the public/editorial role table), `00-CONTEXT.md`
D-38/D-39/D-40/D-41/D-42/D-45, `00-RESEARCH.md` §"What 'done well' looks like for an
engineering case study" and Pattern 4, `00-COPY/case-*.md` and `00-COPY/one-liners.md`,
`design_handoff_portfolio/Resume.dc.html`, and the six resolutions above. Every word count and
marker count quoted was produced at build time by `src/lib/copy.mjs` reading the committed
drafts in place; every contrast ratio quoted was computed in plan 04 by `check-contrast.mjs`.*

---
---

## Responsive direction

*Appended OFF-PLAN, by direct user direction, 2026-08-17. There is no PLAN.md for this work.
Technical companion: `00-RESPONSIVE-CONTRACT.md`, which carries the six-class matrix, the
mode and density resolution, and the full-viewport scroll constraints. **This section records
the direction and its consequences; that document specifies the behaviour.***

Everything above this line was written when the public design had **one viewport** (1440) and
**two case-study tiers**. Neither is true any more. This section is the record of what
changed, in the user's own terms, and of what it invalidates — recorded plainly, because the
temptation with a mid-phase direction change is to soften the consequences and let a later
phase discover them.

---

### The direction, as given

Two messages, and one approved decision prompt.

**Message 1:**

> *"I don't need long cases. Even short ones are very long. Also, one page per case, not a
> long scroll. On homepage, have a single scroll, to scroll to work + resume section. make it
> fit for all screen types, mobile, tab, foldable, laptop, etc"*

**Message 2**, clarifying after *"one page per case"* was initially misread as a no-scroll
length constraint:

> *"cases can scroll, but one page per case, not like scroll to 10 cases in single page
> scrolling down"*
>
> *"the sections for photos, work, resume as they exist on home right now stay as is. pages
> for work/resume/photos stay as is too. just the homepage landing shows the photos section
> and prompts user to scroll. as scrolled, the photo section moves fully up and only
> work+resume sections are visible in the view"*

**And, via a decision prompt, approved explicitly:** the sequencing —
*"Responsive spec, then admin, then public rework"* — and the six-class device matrix **"as
proposed", including the folded cover screen**.

### What it means, confirmed with the user

Five readings, because four of the five could have gone the other way and one of them already
did.

1. **"One page per case" is about ROUTING, not length.** One dedicated route per case study
   instead of five stacked on one scrolling page. **Cases may scroll internally.** This was
   misread once already, which is why it is stated first and stated twice.
2. **Case copy must still get materially shorter.** "Even short ones are very long" is a
   separate complaint from the routing one, and it is about the *short* tier — so the target
   is below the current short tier, not between the two.
3. **The long/short tiering is DROPPED. One tier.**
4. **Nothing collapses.** Home keeps its photos, work and résumé sections. `/work`,
   `/resume` and `/photos` all survive as their own pages. **No route is removed.** The only
   route change is additive: five case routes replace two tier routes.
5. **Responsive across mobile, tablet, foldable and laptop is now a hard requirement**, not
   a nicety and not a Phase 5 concern.

### What it supersedes

> **D-39 is superseded.** *"Case studies are tiered by depth — a long form for the design
> system and Cairn, a short form for hued, Momentum and TimeShift. Two templates to design
> and sketch."* **One tier now. One template.**

The tiering argument recorded above under §Case-study templates was not wrong on its own
terms — the two studies D-39 gave the long form really are the only two with a
rationale-carrying decisions record, and that really is why they landed at ~1,700 words
without padding. **It is superseded because the user does not want a 1,700-word case study at
all**, which removes the thing the split was distributing. The observation survives as an
observation about the source material; it stops being a structural decision.

**What survives of §Case-study templates, and it is most of it:** the build-time loader, the
68ch measure and its derivation, the 200px rail, `case.css`, the three non-final-content
treatments and their strip-vs-fill split, the gap-block `--wire` rule, the D-41 asset plan,
the `## Decision` / `## Decisions` heading trap and its fail-loud throw, and the tier-mismatch
negative controls. **What does not survive: the two-tier split and the two stacked routes.**

### The new Home landing behaviour

Home gains a **two-state, full-viewport** landing that did not exist in any prior document,
in the handoff, or in `X-home-act2`:

- The **photos section fills the landing view** and prompts the user to scroll.
- On scroll it **moves fully up and out**, leaving the **work + résumé** sections in the view.

`00-RESPONSIVE-CONTRACT.md` §5 specifies it: a plain document scroll with the photos section
at `min-height: 100svh` and the prompt as a real `<a href="#work">`, zero JavaScript, with
`scroll-snap` adopted only as a `proximity` enhancement inside
`prefers-reduced-motion: no-preference` and never load-bearing.

**One reading of the direction cannot hold, and it is recorded rather than quietly resolved.**
*"Only work+resume sections are visible in the view"*, read strictly, asks both sections to
fit one viewport. At **five projects** (D-38) plus a résumé section that is unachievable at
every one of the six classes — including 1440 × 900. It also collides directly with the same
message's *"the sections … stay as is."* The resolution taken: **"photos moves fully up" is
exact and enforceable; "only work + résumé visible" describes what fills the view at the end
of the transition, not a promise that the whole block fits it.** The block continues below the
fold at all six classes. The content constraint won because it was stated more emphatically
and because it protects content. **Flagged for the user** as R-2 in the contract's
confirm-or-override table — if the strict reading is the intended one, Home's content has to
shrink, and that is a content decision this work was not authorised to take.

### What this invalidates

Six items. None of them is soft.

**1 — `X-home-act2` (plan 00-09) does not implement the new landing behaviour.** It resolved
OQ-1 — five projects into the handoff's approved 2 × 2 grid, via a full-width design-system
flagship row — and that resolution **stands**. But its Act 1 is deliberately *outlined, not
designed* (Act 1 was PUB-01's, in Phase 5), and the two-state full-viewport landing is
precisely an Act-1-into-Act-2 transition. **The sketch has no scroll behaviour to inspect.**
OQ-1 stays closed; the landing is new work.

**2 — Plan 00-10's two templates are obsolete as built.** It built `/case/long` (design system
+ Cairn) and `/case/short` (hued, Momentum, TimeShift), **each rendering every study of its
tier through one template on ONE page.** That stacked arrangement is exactly what the user
rejected. The template work is **not wasted** — the loader, the 68ch measure, the
tier-mismatch negative controls and the `## Decision` vs `## Decisions` handling are all
reusable — **but the routing and the two-tier split are not.**

*And the collapse re-opens a bug plan 00-10 had already closed.* The five committed drafts on
disk still spell the middle heading **two different ways**. A single template assuming one
spelling silently drops a section from three of the five studies **and still renders a page**
— which is why the previous loader threw. The single template must accept either spelling and
still throw on neither, or the drafts must be normalised during the compression pass.

**3 — All five drafts need compressing.** **7,011 words whole-file** (Cairn 2,005 · design
system 1,943 · Momentum 1,197 · TimeShift 943 · hued 923); **5,686** over the four required
sections only, which is the figure plan 00-10 measured. The 1,325-word delta is the leads and
drafting comments. Both counts are recorded because quoting either one alone against the other
looks like an arithmetic error. Proposed target: **500–700 words** over the four required
sections, one tier — below the current *short* tier, because that is what "even short ones are
very long" says. Flagged as R-1.

**4 — Plan 00-17's screenshot contract multiplies.** It assumes 1440 and 390; its filename
regex hardcodes `(1440|390)` and its gate asserts `≥ 35` files. Six classes takes the record
from **≈ 49 files to ≈ 84**, and three of its automated assertions have to be rewritten. Six
classes is deliberately **not** a 6× multiplier — the contract's §9 states which artefact
classes get all six and which do not, and why. The mode rules are untouched: admin light,
public dark, and the assertion that no admin artefact was captured in dark mode survives
verbatim.

**5 — Plan 00-11 remains OPEN, and should re-run against the reworked sketches.** Its three
by-eye judgements are unanswered: the **44px vs 52px** Playfair page header (G-11), the
**22px `--ochre-d-strong`** cross-link and its stated 24px fallback, and the **1080px** Brevo
employment-band cap inside a 1280px page. All three require a human eye that no script can
substitute for, and all three sit on artefacts that are about to change. **It is not marked
complete and no `00-11-SUMMARY.md` exists.** Re-running it after the rework is cheaper than
answering it twice.

**6 — The admin sketches (00-12 → 00-16) have not been built, and must be built to this
contract natively.** That is the entire reason the contract was written before them, and it is
the sequencing the user approved. One question has to be answered first: **`AppShell` has no
stated responsive posture** — UI-SPEC assigns `Sheet side="left"` for the phone sidebar (D-09)
but nothing says at what width the switch happens, or whether `AppShell` or the consumer
decides. At the foldable-unfolded (673–884) and tablet-portrait (768–834) classes, both
**coarse pointer**, is it a sidebar or a Sheet? A 240px `--ds-sidebar-w` inside 777px of
content is 31% of the screen. Answer it before sketching, not twice.

### The finding the matrix forces, and why it belongs here

The matrix produced one result worth reading even by someone who never opens the contract:

> **Width alone cannot decide density.** A 1024px tablet in landscape (coarse pointer) and a
> 1024px laptop window (fine pointer) need **different densities at the same width**. UI-SPEC
> states its second density invariant as a *breakpoint* rule and deferred the mechanism to
> Phase 06.1; with six classes the breakpoint form is provably insufficient, so the mechanism
> is promoted to a **Phase 0 requirement** and resolved by **`pointer: fine`** — never
> `any-pointer: fine`, which returns the wrong answer for a tablet with a trackpad keyboard
> attached.

UI-SPEC's three-row viewport table is **unchanged by this**: 1440 is a fine pointer and 390 is
a coarse pointer, so its existing rows are a correct special case of the new rule. Admin stays
light, public stays dark, phone stays `comfortable`, desktop stays `compact`.

The same shape of derivation appears a second time, in the Home landing: at a **short**
viewport the peek gallery needs *more* columns, not fewer, because fewer columns means more
rows means taller. So **width alone decides neither the density nor the full-viewport
composition** — which is the through-line of the whole contract.

### Design-system consequences

**No new row is added to `00-FINDINGS.md`.** That file states its own rule — *"Rows are **not**
added or re-litigated by a measurement plan — a plan that finds something outside the sixteen
records it in its own SUMMARY instead, so the tier-pull contract keeps a fixed denominator."*
This work honours it: the one candidate new gap (`AppShell` responsive posture, invalidation 6
above) is recorded in `00-RESPONSIVE-SUMMARY.md`, and two acceptance clauses are attached to
existing rows for whoever next opens them — **G-2** (density must gate on `pointer: fine`,
never on width, never on `any-pointer`) and **G-9** (the proposed `FilterNav` must reach the
44px hit area without growing its drawn geometry).

**Three findings already recorded above bear directly on this work and are carried, not
re-litigated:** the accent reaching no declarative accent (finding 5 — every `tone="accent"`
renders the design system's `#fbbf24` on charcoal, at ~11:1, so no contrast check catches it);
`Card` and `Chip` unable to express a boundary on charcoal dark (finding 6 / resolution 3);
and a page being unable to recolour a design-system `Text`, only to tell it a tone
(§Case-study templates, finding 1). All three pass every automated gate while being visibly
wrong, which is the reason the by-eye review in plan 00-11 cannot be skipped — and the reason
it must re-run rather than be closed on the strength of the old artefacts.

**The 44px touch floor is now the common case, not the exception.** UI-SPEC states it for "a
phone layout". Under the six-class matrix it binds on **five of six classes** — every coarse
pointer. It is a floor on the **hit area**, not on the drawn control: a 9.5px mono filter pill
keeps its geometry and reaches 44px through padding or a `::after` overlay. Read the other way
it would grow every control into a slab and take the editorial identity with it.

---

*Phase 0 · off-plan, by direct user direction. Sources: the user's two messages and one
approved decision prompt, quoted above; `00-RESPONSIVE-CONTRACT.md` (the technical companion,
which carries every number); `00-UI-SPEC.md` §"Viewport and mode contract", §Density Contract,
§"Screenshot record"; `00-CONTEXT.md` D-09/D-38/D-39/D-40; `00-FINDINGS.md` §"How to read this
register"; `00-09-SUMMARY.md`, `00-10-SUMMARY.md`, `00-11-PLAN.md`, `00-17-PLAN.md`; and the
nine resolutions, §OQ-1 and §Case-study templates above. The whole-file word counts are the
user's; the four-required-sections counts are plan 00-10's build-time measurement. No contrast
ratio in this section is new — every one is carried from plan 04's `check-contrast.mjs`.*

---

## Case-study compression

*Appended by plan 00-18 · DSGN-02, DSGN-06 · R-1.*

The user's instruction was "I don't need long cases. Even short ones are very long."
`00-RESPONSIVE-CONTRACT.md` §7 supersedes D-39 — one tier, not two — and R-1 sets the target at
**500–700 words over the four required sections**. This section records what the collapse cost
each study, so that a Phase 6 executor reading a study with three decisions instead of six knows
it was a choice and not an omission.

### Before and after

Measured by the committed gate `scripts/check-case-length.mjs`, which strips HTML comments **and
`[source: ...]` markers** before counting. Markers are stripped so a compression pass cannot
reach the band by keeping citations and cutting sentences; the consequence is that these numbers
run below plan 00-10's for the same files, and **this** is the measure R-1 is now enforced
against. Every number below is what the script printed, not a figure carried from another
document.

| Study | Before | After | Cut | Sections after (Problem · Decisions · Outcome · Assets) |
|---|---|---|---|---|
| cairn | 1,713 | **680** | −60% | 150 · 305 · 152 · 73 |
| momentum | 798 | **682** | −15% | 173 · 274 · 135 · 100 |
| timeshift | 682 | **647** | −5% | 140 · 278 · 118 · 111 |
| hued | 682 | **619** | −9% | 156 · 268 · 117 · 78 |
| design-system | 1,633 | **597** | −63% | 122 · 243 · 164 · 68 |

**The design-system row is measured, not owned.** It was compressed off-plan by a parallel
reference run recorded in `00-COMPRESSION-NOTE.md`, whose output
`00-COPY/case-design-system-COMPRESSED.md` is the accepted shape the other four were written
against. Plan 00-18 left both `case-design-system.md` and `case-design-system-COMPRESSED.md`
byte-identical (`git diff --quiet`, exit 0 on both) and excludes the slug from the gate's `OWNED`
array. That exclusion is a scheduling artefact, not a carve-out: plan 00-20's build-time loader
assertion covers all five, at which point the slug moves into `OWNED` and the exclusion goes.

Note the un-compressed `case-design-system.md` still measures 1,633 and is reported OVER band by
the gate. That is expected — it is the superseded source, kept on disk for comparison.

> **Superseded by plan 00-20.** The two paragraphs above describe a corpus of SIX case files
> that no longer exists. 00-20 deleted the 1,633-word source and renamed
> `case-design-system-COMPRESSED.md` into `case-design-system.md`, so the corpus is five files,
> all five are in the gate's `OWNED` array, and `-COMPRESSED` appears in no filename. The
> exclusion this section calls a scheduling artefact has been deleted, on schedule. See
> `## Case routing` at the end of this file. Kept rather than rewritten because it is plan
> 00-18's own record of what it did, and a record edited to match a later state stops being one.

### What each study lost

**Cairn (1,713 → 680), the deep cut.** Three of six register entries dropped **whole**, by name:
*3. Cut the Settings page rather than keep the two toggles that justified it* (Cohort Blur, Rest
Day); *4. Multi-tenancy is structural and lint-enforced*; and *5. The free tier is a hard ship
gate* (`scryptSync` over JS bcrypt/argon2, the 10 ms Workers envelope). The three kept are the
three whose rejected alternative costs a **named incident** rather than an argument — the rule
the reference draft set. Also cut: the ~150-word provenance lead (now an HTML comment carrying
the same rule and the same three code-vs-planning-doc conflicts), the six-bullet `## Assets` list
(now one sentence), and the cross-repo coda under decision 3.

Two of those are worth arguing with. **Decision 4 was the security one** — its cost, "one
forgotten predicate is a cross-tenant leak", is a named *failure mode* but not an incident that
happened, which is why the rule cut it; if Phase 6 wants a security decision on this page, that
is the entry to restore. And the **coda** — the design system later aliasing `--ink-4` away for
its own measured dark-mode failure at 1.96:1, making two independent contrast failures on one
token in two repositories — was retained as an HTML comment inside the file rather than deleted,
because it is the corpus's only two-repo finding. It was dropped from prose as the third example
of a point decision 3 already carries with a measured incident, and because the design-system
study meets that defect from its own side.

**Momentum (798 → 682), the lightest structural change.** Nothing was dropped from the decision:
the engine-layer decision is intact, still the one verifiable in shipped code (five files under
`engine/`, zero `android.*`/`androidx.*` imports). Lost: the D-39 / plan-10 two-template lead,
the third `## Problem` paragraph enumerating streak, checkpoints and heatmap (reduced to one
clause), and about a third of `## Assets`. The `docs/MIGRATION_PLAN.md` sourcing refusal (T-00-07
— unreleased migration-plan internals must not cross into public prose) survives as an HTML
comment and is unchanged.

**TimeShift (682 → 647), the lightest touch.** Lost the third worked example in `## Problem`
(`The ceremony begins at 7:00 PM CET on March 20th`, the least self-explanatory of three) and the
"short form per D-39" lead. The six-priority confidence ladder, the `resolveTimezoneLegacy` cost
and the 179-test count are intact.

**hued (682 → 619).** Lost the D-39 lead and the `## Assets` inventory of the six finished
screenshots and three share-card renders. The CIELAB clustering decision and its greedy,
single-pass cost are intact.

### What every study gained: the explicit pair

CASE-01's defining requirement is a decision section naming the alternative rejected **and its
cost**. All four drafts already carried that reasoning — but only Cairn carried it in the marker
phrasing the reference draft uses. hued, Momentum and TimeShift argued the alternative inside
running prose, where it is neither greppable nor, at render time, visually distinct from the
paragraph around it. Each now carries one `**The option not taken:**` /
`**What it would have cost:**` pair; Cairn carries three.

**Both phrases start a line in every owned file, and that is verified rather than assumed** — by
comparing a line-anchored count against a total-occurrence count, which is the only way to catch
a wrapped marker. Across the four: 6 line-leading == 6 total, for each phrase.

The check earns its keep immediately. `case-design-system.md`, which plan 00-18 does not own, has
**6** total occurrences of `What it would have cost:` but only **4** that start a line — lines 64
and 106 carry the marker mid-line, after other prose. A line-oriented grep reports that file's
pair as 6/4 and therefore broken. Recorded here for whoever next opens that file; deliberately
not fixed by this plan.

### The heading ruling, both halves

**The corpus is normalised to `## Decisions` (plural)**, and plan 00-20's loader will **accept
either spelling and throw on neither**. Both halves are load-bearing:

- Normalising alone leaves a loader that breaks the next time somebody types the singular by hand.
- An either-accepting loader alone leaves a corpus that reads inconsistently.

Plural, because the flagship carries three decisions and the singular would be actively false on
it; and because plural reads correctly over a section containing one item, whereas singular does
not read correctly over three. Three files changed: `case-hued.md`, `case-momentum.md`,
`case-timeshift.md`. `case-cairn.md` and both design-system files already used the plural.

**The failure this guards is silent** — a template that finds no middle heading drops the whole
section and still returns a page. The negative control below shows the second half of that
danger: with the heading removed, the orphaned decision prose is absorbed upward into
`## Problem`, which grows from 140 to 418 words, while the file's **total stays 647 — inside the
band**. A length check alone would have passed the broken file. That is why the gate treats the
middle heading as a required slot and errors when neither spelling is present, rather than
counting whatever headings it happens to find.

### `tier:` is now inert

`tier: short` / `tier: long` remain in all five frontmatters and mean nothing. Left in place
deliberately: deleting the key here while the parallel run leaves it on `case-design-system.md`
would split the corpus into two frontmatter shapes for no gain. Plan 00-20 stops reading it.
**Phase 6 should strip it as a deliberate act, not treat it as live metadata.**

One frontmatter key was *added*: `badge: Live` on `case-cairn.md`, the only study that carried no
badge, sourced from the value already recorded for cairn in `00-COPY/one-liners.md`. All five
studies now carry identical frontmatter keys, which is what a single template wants. If badges
are not meant to live in case-study frontmatter, they come out of all five together.

### D-39 is superseded

D-39 (two tiers, long and short) is superseded by `00-RESPONSIVE-CONTRACT.md` §7 — one tier, one
template, one route per case. Plan 00-10's two-template artefacts **`X-case-long` and
`X-case-short` are retired by plan 00-20**. **Everything else plan 00-10 built survives**,
including the four-section sequence, the D-40 placeholder floor, and the blockquote-versus-bare
`[NEEDS AKHIL]` rendering rule (a marker inside a blockquote owns only the blockquote; a bare
marker owns everything to the end of its section).

All five `[NEEDS AKHIL]` blocks survive the compression and stay above the D-40 40-word floor —
`check-copy-length.mjs` passes unchanged at 7 files, 6 markers, shortest block **85 words**. The
blocks are contracts to be filled by interview, not prose to be trimmed to hit a target.

### Negative control

Asserted on the script's **exit code and message** — behaviour — not on a substring count in the
file. `grep -c` counts LINES, not matches, and this phase already had a control nearly report a
false result that way (plan 00-16, control 4).

| Step | Result |
|---|---|
| Target | `00-COPY/case-timeshift.md` |
| SHA-256 before | `1c1599b7176d210c5a7fca6d2e3a77204e430ed0c3026d441d8a6e1505010ff1` |
| Mutation | line 28, the `## Decisions` heading, deleted |
| Gate exit | **1** |
| Message | `MISSING-SECTION: … — no "## Decisions" or "## Decision" heading.` · `accepted spelling(s): ## Decisions \| ## Decision` · `headings found: ## Problem \| ## Outcome \| ## Assets` |
| Also observed | verdict `ERROR (required section missing — count is partial)`; `## Problem` absorbed the orphaned prose at 418 words |
| Restore | `git checkout --` on that path only |
| SHA-256 after | `1c1599b7176d210c5a7fca6d2e3a77204e430ed0c3026d441d8a6e1505010ff1` — **identical** |
| `git status --porcelain` | empty for that path |
| Gate after restore | **0** |

---

*Phase 0 · plan 00-18. Sources: `00-RESPONSIVE-CONTRACT.md` §7 and R-1; `00-COMPRESSION-NOTE.md`
and `00-COPY/case-design-system-COMPRESSED.md` (the accepted reference shape, not owned here);
`00-CONTEXT.md` D-39/D-40/D-41/D-42/D-43; `00-06-SUMMARY.md` and `00-10-SUMMARY.md`. Every
word count is the output of `scripts/check-case-length.mjs` run this session. Every project fact
re-verified against shipped code this session, never a README — see the SUMMARY for the four
stale-README figures that check caught.*

---

## Case routing

*Phase 0 · plan 00-20. Supersedes D-39 and the two stacked tier routes.*

### The five routes, and the two that are gone

| Artefact | Route | Words (R-1) | Register | Inline figures | Middle heading |
|---|---|---|---|---|---|
| `X-case-design-system` | `/work/design-system/` | 597 | 3 entries | 2 | `## Decisions` |
| `X-case-cairn` | `/work/cairn/` | 692 | 3 entries | 1 | `## Decisions` |
| `X-case-hued` | `/work/hued/` | 619 | none | 1 | `## Decisions` |
| `X-case-momentum` | `/work/momentum/` | 682 | none | 1 | `## Decisions` |
| `X-case-timeshift` | `/work/timeshift/` | 647 | none | 1 | `## Decisions` |

**Retired:** `X-case-long` (`/case/long`, two studies on one scroll) and `X-case-short`
(`/case/short`, three). `src/pages/case/` no longer exists. Those ids are NOT renamed — they
named a design that was superseded, and the citations of them elsewhere in this file and in
`00-10-SUMMARY.md` remain true about what they were.

**Why `/work/{id}` and not `/case/{id}`.** R-3. A case study is evidence *under* Work, so
nesting it there makes the Work page the index of its own children rather than a page linking
sideways into an unrelated top-level section. `/work` and `/work/{id}` coexist without
collision — `src/pages/work.astro` was left where it is and did not need moving to
`work/index.astro`.

**§7 reads the direction as ROUTING, not length.** The user's words were "one page per case,
not like scroll to 10 cases in single page scrolling down". A case may still scroll internally;
what it may not do is share a scroll with four others.

### Registry

`CANONICAL_IDS` goes 42 → 45: two tier ids out, five study ids in. Checked before changing it —
every use of that array is either a membership test (`coverage.mjs`, twice) or a printed total
(`check-coverage.mjs:166`); nothing derives a shape from its length. The 42-that-was-also-the-cell-count
coincidence the file warned about is now broken, and the cell count did not move: still 42.

The five ids and the five routes are now reconciled *mechanically*. `CASE_STUDIES` lives in
`artefacts.mjs` beside `CANONICAL_IDS`, and an import-time assertion throws if a study has no
`X-case-*` id or an `X-case-*` id has no study. `CANONICAL_IDS` stays transcribed rather than
derived — deriving it would make it agree with itself by construction and stop it being a
transcription of anything — so the two are written twice and checked once.

*Recorded because it cost a build:* Astro **hoists** `export function getStaticPaths` above the
rest of a route's frontmatter, so a `const` declared there is in the temporal dead zone when it
runs. The route's first draft held the id array locally and failed with `STUDIES is not defined`,
pointing at Astro's own `route-cache.js` — nowhere near the mistake. Importing the array
sidesteps the hoist.

### The heading gate, proven twice

The trap is one slot with two spellings: `## Decisions` (plural) or `## Decision` (singular).
Plan 00-18 normalised all five drafts to the plural, which removed the drift **and, in the same
move, removed every exercise of the singular branch**. So the branch is load-bearing and
unexercised at once. That is why there are two controls and why the second one matters more than
it looks.

Both were run against the real `astro build`, mutating with **Node**, not `sed`. This is macOS:
BSD sed, and `sed -i '' '0,/re/s//X/'` is a **silent no-op** here — it accepts the syntax,
changes nothing, and exits 0. A control that mutated that way and then asserted a PASS would
certify a control that never ran. Both assertions are on the build's **exit code and printed
message**, never on `grep -c` of the edited string (`grep -c` counts LINES, not matches — plan
16 control 4 nearly reported a false result that way).

Both used `00-COPY/case-timeshift.md`, SHA-256
`1c1599b7176d210c5a7fca6d2e3a77204e430ed0c3026d441d8a6e1505010ff1`.

**Control 1 — NEGATIVE. `## Decisions` → `## Findings`.**

| | |
|---|---|
| `astro build` exit | **1** |
| Message | `copy.mjs: …/case-timeshift.md must carry ONE of the headings "## Decisions" or "## Decision", and carries neither.` |
| Headings it printed as found | `## Problem \| ## Findings \| ## Outcome \| ## Assets` |
| SHA-256 before / after | `1c1599b7…` / `1c1599b7…` — **identical** |

**Control 2 — POSITIVE, and it is the one guarding the unexercised branch.
`## Decisions` → `## Decision`.**

| | |
|---|---|
| `astro build` exit | **0** — 92 pages built |
| Singular heading rendered | `>Decision<` ×1, `>Decisions<` ×0 |
| Middle section still has prose | yes — "confidence level" present in the built HTML |
| Figure still attached to it | yes — the inline caption rendered under the resolved section |
| Header readout | `## Decision · no register entries` |
| SHA-256 before / after | `1c1599b7…` / `1c1599b7…` — **identical** |

Control 2 also exercises a second either-branch one layer up. The route's asset plan writes
`section: MIDDLE`, a sentinel resolved at render to whichever spelling the draft used. Hard-coding
`"Decisions"` there would work today and would silently drop the figure from any draft spelling
it singular — the figure list is a *filter*, so a section name matching nothing yields no figure
and no error. That is the same class of silent drop the loader exists to prevent, and only a
positive control can catch it.

### Browser audit — five routes, six device classes

`node audit15.mjs /work/design-system/ /work/cairn/ /work/hued/ /work/momentum/ /work/timeshift/`

Run in Chromium against the built `dist/`, not by grep — two of this phase's recorded 44px
measurements were wrong because a 1px visually-hidden input masks the label that is the real
hit area, and a grep cannot tell a CSS rule from prose describing one.

**44px offenders, per route, per class (identical on all five routes):**

| Class | Pointer | Before | After | Remaining owner |
|---|---|---|---|---|
| 344 folded | coarse | 17 | **6** | D-16-1 only |
| 390 phone | coarse | 17 | **6** | D-16-1 only |
| 673 foldable-unfolded | coarse | 17 | **6** | D-16-1 only |
| 768 tablet-portrait | coarse | 17 | **6** | D-16-1 only |
| 1024 tablet-landscape | coarse | 17 | **6** | D-16-1 only |
| 1440 laptop | **fine** | 17 | 17 | floor does not apply |

`audit15.mjs` de-duplicates its printed offenders on `tag + class`, which reported 17 boxes as
3 lines and hid every unclassed `<a>` behind the AppBar brand link. Re-measured with the same
geometry but no de-duplication, the 17 attribute as:

| Count/class | Owner | Disposition |
|---|---|---|
| 5 | `.case-index a` — the chrome's corpus index | **fixed** — `case.css` |
| 5 | `.case-index-end a` — the end-of-page index | **fixed** — `case.css` |
| 1 | `.case-toggle input` — the review toggle | **fixed** — `case.css` |
| 3 | `.ds-atom-appbar a` — brand, Work, Photographs | **D-16-1 — deferred, not patched** |
| 3 | `.ds-atom-footer-link` — GitHub, LinkedIn, Email | **D-16-1 — deferred, not patched** |

**The 36 deferred boxes (6 per class × 6 classes) are a decision, not an oversight.** `AppBar`
and `Footer` paint their own geometry inside `@akhil-saxena/design-system`. Reaching past a
component to restate its geometry from the consuming app is exactly the local workaround
PROJECT.md's Core Value forbids: a design-system gap is a **finding**, never a patch at the call
site. Recorded as D-16-1, owned by Phase 1 with G-2.

The fix for the three that *are* ours is keyed on `(pointer: coarse)` and never on width — a
1440 touch laptop needs the floor and a 390px desktop window does not — and it lands on the hit
area rather than the paint: the anchors keep their type, colour and rule, with the rule moving
from `border-bottom` (which would detach and sit at the bottom of a 44px box) to a
`text-decoration` underline that hugs the text wherever the box ends.

**R-6 reflow, 344 against 1440.** Two routes failed and three did not: `/work/hued/` rendered
**373px of document into a 344px viewport** and `/work/momentum/` **387px**. The cause was not
layout. It was one code span each — `app/src/main/java/app/hued/processing/ColorAggregator.kt`
and its Momentum equivalent — inside a `[source: …]` marker. A file path has no spaces, so the
default `overflow-wrap: normal` treats it as one unbreakable word, and an unbreakable word wider
than the column widens the **column**. `overflow-wrap: anywhere` on `.case-code` only, so
ordinary prose is never broken mid-syllable. After: **doc width == viewport width on all five
routes at 344**, and no other class changed.

### `900px` → `1024px`

`case.css` carries the only width media query in the whole playground, which makes the number it
states worth more than the behaviour it produces.

900 was correct **by accident**. Per §4 it lands in the dead zone between class 3's ceiling
(884) and class 5's floor (1024), so no viewport in the six classes sits between them and the
rendered behaviour is identical either way. What changes is what the number *means*: 900 is a
round number that happens to work and can only ever be re-guessed; 1024 is a class boundary and
can be checked against the contract. The reason is in a comment at the rule, because a bare
number change is indistinguishable from a typo.

### The band is now enforced in two places, and they agree exactly

`check-case-length.mjs` enforces R-1's 500–700 from the command line, on **all five** slugs — the
`design-system` exclusion plan 00-18 recorded as a schedule has been deleted, on schedule, along
with the superseded 1,943-word draft it existed for. `loadStudy` enforces the same band **inside
the build**, so it runs whether or not anybody remembers to run the script.

Two gates for one contract is a liability unless they measure the same thing, and at first they
did not: the loader read **3 words low** on cairn (689 vs 692) and design-system (594 vs 597),
and agreed exactly on the three studies with no register. The delta was one word per numbered
`###` — the loader parses `### 3. Multi-tenancy…` into an ordinal and a title, so the ordinal
never reached the count. Three words is nothing until a draft sits within three of a band edge,
and then it is a build that fails against a gate that passes. Reconciled at the parser rather
than argued about: **597 · 692 · 619 · 682 · 647 from both.**

### What the corpus looks like after this plan

Five case files, no `-COMPRESSED` in any filename, all five owned and enforced. The band gate
gained a corpus-membership rule in both directions, because the failure it catches is not
hypothetical: for one whole plan the corpus held **six** case files — a 1,943-word
`case-design-system.md` and its 597-word replacement — and because neither slug was in `OWNED`,
the gate printed `OVER band` on its own stdout and **exited 0**. An unrecognised slug is now a
failure rather than a report.

Retiring that draft also removed the corpus's last **wrap-class marker failure**: it carried 6
occurrences of `What it would have cost:` with only 4 line-anchored, so a line-oriented grep
reported its pair as broken. Corpus-wide now: **9 total / 9 line-anchored** for both marker
phrases, in all five files.

### Cairn's register was changed on a user override

Cairn now carries **multi-tenancy** as decision 3 and no longer carries the pa11y contrast
decision. The count stayed at three.

Plan 00-18's compression rule was *keep the decisions whose rejected alternative cost a named
incident, cut the ones whose alternative cost only an argument*, and multi-tenancy failed it —
"one forgotten predicate is a cross-tenant leak" is a named failure **mode**, not an incident
that occurred. The user overrode that for this one entry: it is Cairn's only security decision,
and Cairn holds personal job-search data, so a register with no security entry misrepresents the
product.

**Cut to make room: the contrast decision**, and the reason is coherence rather than quality.
`## Problem` ends on one question — *how do you make a refusal load-bearing?* Decisions 1 and 3
now answer it with the same mechanism at different stakes (both guards run inside the same
`lint:all`), and decision 2 answers it by carrying a removal through to the security code that
defended it. The contrast entry argues measurement over deference to an upstream: a good
argument, and a different study's. **Nothing is lost from the corpus** — the design-system study
carries the same `--ink-4` defect as its own decision 1, in the stronger form, because there the
bug was invisible in review *by construction* (light mode set `--ink-4` and `--ink-3` to the
identical value, so it existed in one theme only).

Consequence on the asset plan: cairn drops to a hero plus **one** inline, inside D-41's
"one or two". The cut decision was the only remaining one that was photographable — the other
two are a removal and a query layer, both invisible by construction. That leaves the single
template with two figure counts to be laid out against instead of one, which is worth more as
evidence than a third reserved rectangle.

**A second Ghost Watch residue, found while re-verifying rather than by looking for it.**
`scripts/lint-scoped.sh`'s allowlist still exempts `src/server/scheduled.ts`, described in its
own header as the nightly source-live-ping cron. That file does not exist, and neither do the
`last_pinged_at` / `last_ping_status` columns the exemption says it writes. The multi-tenancy
guard therefore carries a standing hole for a deleted file — harmless while nothing occupies the
path, and exactly the kind of exemption that stops being harmless the day something is written
there. This is the *second* residue of the same removal; `ghost_flagged` in the
`timeline_events.kind` enum was the first. Worth resolving before Phase 6 quotes the removal as
total.

### `one-liners.md`: 80 → 79, and the README retired as an authority

The user ruled the design-system component count is **79**, matching
`../design-system/src/OverviewPage.tsx` — the shipped catalog, whose ten categories sum to 79 and
which computes that total itself as `TOTAL`. Applied in both places the figure ships: the
one-liner and the Work card.

`README.md` is retired as the source for it. It says **80** and matches neither shipped
artefact: the catalog lists **79**, the ten category directories under `src/` hold **81**. Three
numbers, and the README's is the count of nothing. The difference was measured rather than
inferred — `Field` and `IconButton` are the two directories present on disk and absent from the
catalog, so their omission is deliberate rather than missed.

Budgets unmoved, as predicted: one-liner **97**, card **160**, `check-copy-length.mjs` exit 0.

### Build state at the end of this plan

| | |
|---|---|
| `npx astro build` | **92 pages** (89 before: −2 tier routes, +5 case routes) |
| `check-no-js.sh` | **0** — 66 static routes at zero framework JS, 26 island routes verified to hydrate |
| `check-coverage.mjs` | **0** — 42/42 cells, no blanks, every ref canonical |
| `check-states` · `check-no-ivory` · `check-theme-exhaustive` · `check-font-names` · `check-contrast` · `check-css-size` | all **0** |
| `check-case-length.mjs` | **0** — 5 files scanned, **5 enforced**, all inside 500–700 |
| `check-copy-length.mjs` | **0** — 6 files, 5 `[NEEDS AKHIL]` markers, shortest block 85 words |
| `check-bundle.mjs` | **1 — BY DESIGN.** This is finding G-15, not breakage |

---

## Responsive shell

Plan 00-21 put the shared public shell on `00-RESPONSIVE-CONTRACT.md`. Everything below was
measured in real Chromium at the contract's six device classes, never read off the CSS — the
contract's own baseline was that the public sketches carried **one** width media query, **zero**
`pointer:` queries and **zero** `svh`, and two of this phase's earlier 44px figures were wrong
because they came from source reading.

### The gutter ladder, as shipped

`.pub-shell` used `padding: 0 var(--space-12)` unconditionally — 48px a side, so **96px of a
344px viewport, 28% of the screen, spent on padding.** Four rungs now, every value a real step
on the 4px grid, written mobile-first so class 1 is the unstyled base:

| Classes | Rung | Token | Gutter | Content at the class's narrowest |
|---|---|---|---|---|
| 1 · folded cover | base (no query) | `--space-4` | 16px | 344 − 32 = **312px** |
| 2 · phone portrait | `min-width: 375px` | `--space-6` | 24px | 360 − 48 = **312px** |
| 3–4 · foldable unfolded, tablet portrait | `min-width: 673px` | `--space-8` | 32px | 673 − 64 = **609px** |
| 5–6 · tablet landscape, laptop | `min-width: 1024px` | `--space-12` | 48px | 1024 − 96 = **928px** |

**The ≥ 1024 rung is deliberately unchanged**, and that is the point of it: classes 5 and 6 keep
the exact gutter the approved 1440 design was signed off at, so the ladder cannot move anything
a reviewer has already accepted. At 1024 the resulting 928px sits under Home's 1080 cap, so the
cap stays inert and no new cap interaction appears. Confirmed by measurement — every route reads
`doc=1440/1440` and `doc=1024/1024`.

It is CSS only. §6 rule 2 forbids any layout that depends on a viewport measurement taken once,
because unfolding a foldable moves the viewport from ~344px to ~841px **in one frame, with no
reload**. A media query re-evaluates on resize; a `window.innerWidth` branch in state does not.

### `--pub-gutter`, and the trap it exists to make unrepresentable

The ladder is **one custom property**, not four values. `.pub-shell` declares `--pub-gutter` and
steps *that*; the shell pads by it, and the two full-bleed rows cancel it and pay it back:

| Rule | Before | After |
|---|---|---|
| `.pub-shell` padding | `0 var(--space-12)` | `0 var(--pub-gutter)` |
| `.pub-bar` margin | `0 calc(var(--space-12) * -1)` | `0 calc(var(--pub-gutter) * -1)` |
| `.pub-bar .ds-atom-appbar` padding | `var(--space-6) var(--space-12)` | `var(--space-6) var(--pub-gutter)` |
| `.pub-footer` margin | `0 calc(var(--space-12) * -1)` | `0 calc(var(--pub-gutter) * -1)` |
| `.pub-footer .ds-atom-footer` padding | `var(--space-4) var(--space-12) var(--space-10)` | `var(--space-4) var(--pub-gutter) var(--space-10)` |

**Name the trap out loud, because it is circular.** The negative margins exist to pull the
AppBar and Footer back out to the viewport edge. Step the shell's padding to 16px and leave the
margins at −48px and the two rows overhang by 32px a side — which presents as **a horizontal
scroll**, i.e. precisely the R-6 violation this plan was closing, reintroduced by the fix for
it. `.pub-footer` is easy to miss: the plan's own interface note listed only `.pub-bar`, and the
footer carries the identical rule four declarations further down. Deriving all five from one
property is what makes the drift unrepresentable rather than merely unlikely. (T-00-59.)

### `100vh` → `100svh`

`body`'s `min-height` was the phase's only viewport-height declaration and it used the wrong
unit. Plain `vh` is the **large** viewport — the height with the mobile address bar retracted —
so at first paint on iOS Safari and Android Chrome it is taller than what the reader can see. It
was harmless here (it only made short pages fill the screen), but it was wrong **in the one
place in the codebase that will be copied from**, and plan 00-22 copies from it to build a
landing whose entire job is to fit the first paint.

- **`min-height`, never `height`** — content taller than the budget must overflow *visibly*
  rather than clip invisibly. A visible overflow is a failure a screenshot catches; a clip is
  one it hides.
- **`dvh` is forbidden on any scroll-transition participant** (§5.1) and is stated as such in
  the comment beside the declaration, so **plan 00-22 does not reach for it**. It tracks the
  live viewport, so it changes *during* the scroll and moves the transition's own target
  distance mid-gesture.
- Desktop is unaffected: with no dynamic chrome, `svh == lvh == dvh == vh` at classes 5 and 6.

### `/work`'s horizontal scroll: what it actually was

Recorded before this plan: `doc=385/344` and `doc=416/390`. Re-measured here, and the ladder
**did not close it on its own** — it moved the number the wrong way:

| Reading | 344 | 390 |
|---|---|---|
| Before this plan (48px gutter) | `doc=385/344` — 41px over | `doc=416/390` — 26px over |
| After the ladder alone (16/24px gutter) | `doc=396/344` — **52px over** | `doc=424/390` — 34px over |
| After the reflow | **`doc=344/344`** | **`doc=390/390`** |

**The offender was not the grid.** Found in a browser by walking every box whose right edge
passed the viewport: a single unclassed `<span>` — the **status Badge** inside `.wk-card-top` —
at `right=396 (w=78 left=318)` in a 344px viewport. Three columns of a 312px content width is
90.7px per column; the Card's `lg` padding leaves roughly 43px inside, and a 44px icon plus a
12px gap plus a 78px nowrap Badge needs 134px. `minmax(0, 1fr)` let the **card** shrink, so the
card never overflowed — the Badge did, and escaped. Giving the page a wider content box moved
the third column further right, which is why the ladder made the absolute number worse.

Fixed by **reflow, never hide**: `.wk-grid` is one column at classes 1–2, two at 3–4, three at
5–6 — the same three rungs the shell steps at, so page and shell never disagree about which
class they are in. `overflow-x: hidden` was **not** used; it would have clipped the one word
that tells a reader whether a project is Live while leaving the instrument's reading clean.

### The Photos filter rail, and why the same pattern is forbidden on Home

Eight category anchors. At class 1's 312px content, eight anchors at a 44px hit height wrap to
as many as four rows. Measured: the wrapped row is **100px** at classes 3–5, and would be far
worse once the floor applied at 312px. As a rail it is **52px**.

- **Classes 3–6: unchanged.** The row wraps, `scroll-snap-type: none`, two rows at 673–1024 and
  one at 1440 — exactly as approved.
- **Classes 1–2: a rail.** `flex-wrap: nowrap`, `overflow-x: auto`,
  `scroll-snap-type: x proximity` on the container and `scroll-snap-align: start` on the pills.
  `proximity`, never `mandatory`.

> **The rail is safe on Photos *because of the container*, and that is the whole reason.** §5.4's
> nested-scroll hazard is that a horizontal rail inside a **vertical snap container** steals the
> vertical gesture on iOS. **Photos has no vertical snap container anywhere on the route**, so
> the hazard has nothing to bite on. **Home's two-state landing does have one** — §5.4 puts
> `scroll-snap-type: y proximity` on `.home` — which is why Home's peek gallery stays a grid at
> every class and **must never be turned into this rail**. Same pattern, opposite verdict.

Two things about the rail were only visible in a browser:

- **`min-width: 0` is load-bearing.** `.ph-filters` is a flex item of `.ph-header`, and a flex
  item's default `min-width: auto` refuses to shrink below min-content — which, once the row is
  `nowrap`, is the sum of all eight pills. Without it the rail does not scroll, it blows the
  header out and reopens the horizontal scroll.
- **`scroll-snap-type` without `scroll-snap-align` is a rail that declares snapping and does not
  snap.** The first build shipped exactly that. A probe caught it:
  `getComputedStyle(pill).scrollSnapAlign` read `none` while the container read `x`. Note that
  Chromium serialises `x proximity` as **`x`** — `proximity` is the initial strictness and is
  omitted — so `snap=x` in a probe is confirmation it is *not* `mandatory`, verified against a
  synthetic control.

### The 44px floor on the hit area, not on the drawn control

A 9.5px mono pill grown into a 44px slab is a different design. So the **paint moved to a
pseudo-element and the anchor became the hit box**, under `@media (pointer: coarse)` only:

| Class | Pointer | Anchor box (hit area) | `::before` (drawn pill) |
|---|---|---|---|
| 344, 390, 673, 768, 1024 | coarse | **46px** | **25.5px** |
| 1440 | fine | 25.5px | *no pseudo-element at all* |

The drawn geometry is identical to the pixel — 25.5px is `calc(var(--text-2xs) + 16px)`, derived
from the type scale rather than typed as a magic number, so the pill and its hit box cannot
drift apart if the scale moves. Exception 6 survives intact: the active pill still fills
`rgb(234, 231, 224)` on `rgb(22, 22, 22)`, just painted one box in. **At class 6 not one
declaration in the block applies**, so the approved 1440 design renders exactly the CSS it was
signed off at.

Gated on `pointer: coarse` — five of six classes, the common case. **Never on width**, because a
1024px tablet in landscape and a 1024px laptop window are the same width and want opposite
answers. **Never on `any-pointer`**, which the contract forbids for any density or hit-area
purpose: a tablet in a trackpad keyboard case reports a fine pointer as merely *attached* while
touch stays primary, so it returns true and the user, still touching the screen, gets the
sub-44px target.

### Two more R-6 violations, found because the ladder reaches every route

The ladder is in the shared shell, so the audit had to cover routes this plan did not open. Two
overflows nobody had measured turned up.

**`/photos/` scrolled horizontally too** — never recorded, because the only R-6 figures in this
phase were `/work`'s. `doc=429/344` and `doc=429/390` before, `doc=397/344` and `doc=405/390`
after the ladder alone. The offender was the **G-11 reference specimen**: `.ph-g11` is a flex
row that did not wrap, holding a 296px 52px sample. `flex-wrap: wrap` closes it above 374px; at
344 the 52px word is itself wider than the box's 286px inside, so the sample takes
`min-width: 0` and `overflow-wrap: anywhere` and breaks across two lines. **Breaking the word is
the deliberate choice**: the thing this specimen measures is the 52px glyph, and 52px is exactly
what survives — shrinking the font to make it fit would have made the reference report a size it
is not.

**`/home-act2/` scrolled horizontally at 344**, `doc=356/344`. **It was not caused by the
ladder, and that was measured rather than assumed** — same build, same browser, `--pub-gutter`
overridden at runtime:

```
/home-act2/    344@ladder=356   344@48px=356     <- identical: pre-existing
/              344@ladder=344   344@48px=344
/work/         344@ladder=344   344@48px=344
/photos/       344@ladder=344   344@48px=344
```

`.ha-grid`'s two columns of a 312px content width with a 56px column-gap is 128px a column, and
`.ha-entry` spends 44px on its index plus a 16px gap, leaving 68px for a title whose min-content
width is 96px — 28px of escape, and 328 + 28 = 356, the measured document width. One column at
classes 1–2, two at 3–6. **Plan 00-22 rebuilds this landing: that rung is the only responsive
rule in the file, and if the two-state landing replaces `.ha-grid` it must be re-measured at 344
rather than assumed to have survived the rewrite.**

### The audit table — nine public routes, six classes each

Zero `H-SCROLL` across the whole surface. `doc == viewport` at every one of the 54 combinations.

| Route | doc/viewport, all six classes | under44 at the five coarse classes | at 1440 (no floor) |
|---|---|---|---|
| `/` | equal | 6 | 166 |
| `/work/` | equal | 7 | 7 |
| `/photos/` | equal | **7** (was 15) | 15 |
| `/home-act2/` | equal (was `356/344`) | 9 | 9 |
| `/work/design-system/` | equal | 6 | 17 |
| `/work/cairn/` | equal | 6 | 17 |
| `/work/hued/` | equal | 6 | 17 |
| `/work/momentum/` | equal | 6 | 17 |
| `/work/timeshift/` | equal | 6 | 17 |

The 1440 column is expected to be non-zero and is not a failure: class 6 is fine-pointer and the
44px floor does not bind there (§2). `/photos/` reading 15 at 1440 and 7 at every coarse class is
the positive evidence that the coarse block is the only thing touching the pills.

**Every remaining offender is D-16-1.** Nothing else on the public surface is under the floor.

| Offender | Height | Routes | Owner |
|---|---|---|---|
| `<a>` × 3 — AppBar brand + nav | 20px | all 9 | **design system** — deferred, Phase 1 with G-2 |
| `<a class="ds-atom-link ds-atom-footer-link">` × 3 | 22.5px | all 9 | **design system** — deferred, Phase 1 with G-2 |
| `a.wk-xlink` / `a.ph-xlink` / `a.ha-xlink` | 30px | `/work/`, `/photos/`, `/home-act2/` | **layout** — page-owned |
| `a.ha-all` × 2 | 14px, 28px | `/home-act2/` | **layout** — page-owned |

**The design-system six stay, on purpose.** `AppBar`'s brand link and `Footer`'s link list paint
their own geometry inside the component, so a consumer clearing the floor reaches past the
component to restate it — the same shape as `F-15-7` and the `G-2` control-geometry family, and
exactly the local workaround PROJECT.md's Core Value forbids. A clean screenshot bought by a
local override would be evidence of a fix that does not exist. (T-00-61, accepted.)

**One D-16-1 figure has changed and `deferred-items.md`'s number is now stale.** It records the
AppBar brand link as *"20px (40px at 344)"*. It is **20px at 344 as well** now: the 40px was the
brand link wrapping to two lines inside a 248px content box, and 312px fits it on one. The
ladder did not fix it — it removed an accidental second line that had been masking how far below
the floor the link really is.

**The third row is layout-owned, not design-system-owned, and D-16-1 already implies it** ("two
of the three"). The crosslink shape recurs on **three** routes, not the one D-16-1 recorded, and
`/home-act2/` adds two more page-owned anchors. Unlike the six above, these need no design-system
change. Left untouched here because plan 00-21's scope names them as not-fixed, and recorded so
whoever closes D-16-1 knows the layout half is unblocked.

### R-6: nothing is dropped at 344

Counted in a rendered browser at 344 **and** 1440 and compared, filtering to boxes that are
actually visible — a `display: none` is invisible to a grep of the source.

| Route | Subject | 344 | 1440 |
|---|---|---|---|
| `/work/` | employment rows · project cards · status badges · tech chips · project titles · legend rows · sections | 3 · 5 · 5 · 14 · 5 · 2 · 2 | identical |
| `/photos/` | filter categories · photo tiles · masonry · header | **8** · 39 · 1 · 1 | identical |
| `/home-act2/` | work entries · sections · strip links | 5 · 2 · 1 | identical |
| `/` | sections · links | 4 · 166 | identical |

All eight Photos categories and all five Work projects exist on a folded cover screen.

### The negative control

`photos.astro` before: `sha256 073d6561606c801d5bd1a9f73a396bd48530b8a5d75fc694c14465b732fd6d8c`

The `@media (pointer: coarse)` hit-area block — 43 lines, 1039 bytes — was cut by brace
matching, the site rebuilt, and `audit15.mjs /photos/` re-run. Asserted on **the audit's reported
counts**, never on `grep -c`, which counts lines rather than matches and nearly produced a false
result for plan 16's control 4.

| Class | With the block | Without | Δ |
|---|---|---|---|
| 344 folded | 7 | 15 | **+8** |
| 390 phone | 7 | 15 | **+8** |
| 673 foldable-unfolded | 7 | 15 | **+8** |
| 768 tablet-portrait | 7 | 15 | **+8** |
| 1024 tablet-landscape | 7 | 15 | **+8** |
| 1440 laptop (fine, no floor) | 15 | 15 | 0 |

**The control bites** — exactly +8 on all five coarse classes, the eight filter anchors, and
**zero** change at class 6, which independently confirms the block is the only thing touching
the pills and that the fine-pointer design is untouched.

`photos.astro` after: `sha256 073d6561606c801d5bd1a9f73a396bd48530b8a5d75fc694c14465b732fd6d8c` —
**byte-identical**, and the restored counts equal the pre-control counts on all six classes.

### A design-system finding this audit turned up: `Card` and `Chip` drop `class`

Not a responsive issue, found while building the R-6 counter, and recorded here rather than as a
new `00-FINDINGS.md` row — that register states its own fixed denominator of sixteen and that a
plan finding something outside them records it in its own write-up.

`<Card class="wk-card">` renders `class="ds-atom-card"`. The `class` prop is **silently dropped**
— no type error, no console warning, the page builds and looks plausible.
`document.querySelectorAll(".wk-card").length` is **0**. Same for `<Chip class="wk-chip">`.

The consequence is that **Ivory→Charcoal exception 3 has never applied on `/work`'s project
cards.** `work.astro` believes it overrode the card border to `--wire`; measured, the painted
border is `rgb(51, 51, 47)` — that is `--rule`, at the 1.43:1 the exception exists to escape —
and not `--wire`'s `rgb(114, 114, 104)`. `.wk-card`'s `display: flex; flex-direction: column`
never applied either; the card computes `display: block`. The rules are present and correctly
scoped in the built CSS (`.wk-card[data-astro-cid-r3bc3sjw]{…border-color:var(--wire)!important}`)
— they simply have nothing to match.

`Badge` is a third variant of the same gap: it renders an **unclassed `<span>` with inline
styles**, so it cannot be reached or restyled from a page at all — the same shape as the
recorded finding that `Text` inlines its variant colour and beats any stylesheet.

Not worked around. Restyling `.ds-atom-card` from the consumer is precisely what `work.astro`'s
own header forbids ("nothing below restyles a design-system class") and what the Core Value
forbids. This is the site doing its job: **a real product built on the library is what exposes
the gap.**

### Instruments left in `.playground/`

`audit15.mjs` de-duplicates its printed offender lines on `tag + class`, so `/work`'s seven
offenders printed as three and all three AppBar anchors hid behind one line. Its `under44=`
**count** is raw and correct; only the listing under-reports. Added alongside it:

| Script | What it does |
|---|---|
| `audit21.mjs` | The audit with de-duplication **off**, plus it names the overflowing box and skips boxes contained by a scroll container (a pill inside the rail is not an overflow — the first run flagged its own fix) |
| `probe21.mjs` | Pill hit box vs. drawn `::before`, rail wrap/snap/scrollability, G-11 box, per class |
| `control21.mjs` | The negative control: hash, cut by brace matching, rebuild, count, restore, re-hash |
| `r6count21.mjs` | Visible-element counts at 344 vs 1440 |
| `ab21.mjs` | Runtime `--pub-gutter` override — the ladder A/B that proved `/home-act2/` pre-existing |
| `cardprobe21.mjs` | The `class`-forwarding measurement above |

### Build state at the end of this plan

| | |
|---|---|
| `npx astro build` | **92 pages** — unchanged |
| `check-no-js.sh` | **0** — 66 static routes at zero framework JS, 26 island routes verified to hydrate |
| `check-theme-exhaustive` · `check-font-names` · `check-contrast` · `check-css-size` · `check-states` · `check-coverage` · `check-no-ivory` | all **0** |
| `check-bundle.mjs` | **1 — BY DESIGN.** Finding G-15, not breakage |
| `audit21.mjs`, 9 routes × 6 classes | **zero H-SCROLL**; remaining `under44` is D-16-1 only |

---

## Home two-state landing

`X-home` at `/home` — the landing the user asked for in as many words, built as
`00-RESPONSIVE-CONTRACT.md` §5 specifies rather than re-derived. **Everything below is
measured in a real browser at all six device classes. The contract's own tables are derived,
and where a measurement disagrees with one, the measurement is what is recorded here.**

> *"just the homepage landing shows the photos section and prompts user to scroll. as
> scrolled, the photo section moves fully up and only work+resume sections are visible in the
> view"* — and, from the same message, *"the sections for photos, work, resume as they exist
> on home right now stay as is."*

Nothing was removed. No route collapsed. No section was cut to make a budget fit.

### The mechanism, and the one number it needs

A plain document scroll. State A is one viewport tall, state B follows it in DOM order, the
prompt is a real `<a href="#work">`. Zero framework JS, zero aspect-ratio branch, zero JS
viewport measurement — the whole thing names a viewport-height unit and DOM order, and neither
is a function of aspect ratio, which is why the near-square foldable needed no special case.

**State A is not `100svh` — it is `100svh` minus the chrome above it, and that turns out to
matter by 131 pixels.** State A does not start at the top of the document; the AppBar row and
`.pub-main`'s top padding are above it. A full `100svh` section would have its *bottom* one
viewport **plus** that chrome down the page, and one viewport of scroll would leave a band of
photographs on screen. So the chrome comes out of the budget, which is also exactly how §5.2's
own arithmetic counts it — its class-3 table spends "Nav 56" *inside* the 712px it budgets.

Measured with `navprobe22.mjs`, on `/work/` and then again on `/home/`:

| | 344×882 | 390×844 | 673×620 | 768×1024 | 1024×768 | 1440×900 |
|---|---|---|---|---|---|---|
| `.pub-bar` height | 87 | 87 | 87 | 87 | 87 | 87 |
| `.pub-main` padding-top | 44 | 44 | 44 | 44 | 44 | 44 |
| first section top | 131 | 131 | 131 | 131 | 131 | 131 |

**Constant at all six — the AppBar does not wrap even at 344.** So
`min-height: calc(100svh - var(--hm-above))`, `--hm-above: calc(87px + var(--space-11))`.

**The 87px is a hard-coded measurement, and that is a design-system gap rather than a
shortcut.** `AppBar` paints its own geometry and exposes no custom property carrying its
height, so a consumer building a full-viewport landing underneath it has nowhere to read the
number from. It is not left to rot: `audit22.mjs` measures state A's bottom edge against the
viewport at all six classes, so if AppBar's height ever moves the gate goes red rather than the
landing going quietly wrong.

### The peek arrangement, per class, with measured heights

All six `peekIds` render at all six classes — R-6, reflow never hide. Column count and tile
aspect are the variables; tile count is not. **Column count steps on the settled 375 / 673 /
1024 width rungs; tile aspect steps on a *height* rung at 800px**, because what is being solved
is a height. That is not an aspect-ratio branch — it is a query on the axis the budget is
denominated in, which is what §5.3 asks for in as many words.

| Class | Viewport | `svh` | State A budget | Arrangement | Tile (measured) | Gallery | Result |
|---|---|---|---|---|---|---|---|
| 1 folded cover | 344×882 | 882 | 751 | 2 × 3 at 3:2 | 148 × 99 | 329 | fits, 751 = budget |
| 2 phone | 390×844 | 844 | 713 | 2 × 3 at 3:2 | 163 × 109 | 359 | fits |
| 3 foldable narrow | 673×620 | 620 | 489 | **3 × 2 at 16:9** | **192 × 108** | **232** | **fits** |
| 4 tablet portrait | 768×1024 | 1024 | 893 | 3 × 2 at 3:2 | 224 × 149 | 314 | fits, wide margin |
| 5 tablet landscape | 1024×768 | 768 | 637 | 3 × 2 at 16:9 | 299 × 168 | 352 | fits |
| 6 desktop | 1440×900 | 900 | 769 | 3 × 2 at 3:2 | 317 × 212 | 440 | fits |

**Class 3's narrow end was checked first and it is the binding case, exactly as §5.2 said.**
At 673 × 620 the tile measures **192 × 108** — 16:9, and the contract's derived table predicted
192 × 108 for that arrangement to the pixel. 3:2 at the same width would be 192 × 128, two rows
plus the gap being 272px, which is the ~44px overflow §5.2 names. 16:9 keeps more of the
photograph than 2:1 and fits, so 16:9 is what shipped.

The 800px height rung is where the arithmetic crosses rather than a round number: at 1024 × 768
three 3:2 tiles are 301 × 201, two rows plus the gap are 418px, and 418 plus the ~246px of
name, prompt and padding is 664px against the 637px that 768 − 131 leaves. It does not fit. At
900 it does.

Gaps are `--space-4` (16px) — the same value `X-home-act2` snapped the handoff's off-grid 14px
to, so the two peek grids agree. Using it reproduces §5.3's arithmetic exactly at both ends.

**The grid is a grid at every class and never a horizontal rail.** A rail fits any budget,
which is what makes it tempting, but it nests a horizontal scroller inside this page's vertical
snap container and on iOS a horizontal rail readily steals the vertical gesture. The Photos
filter row *is* a rail at classes 1–2 (plan 00-21) precisely because `/photos` has **no**
vertical snap container. Same pattern, opposite verdict, and the reason is the container.

`home_config.peekPositions`' single entry — `architecture-hawamahaldaytime: "50% 25%"` — is
applied as `object-position`; the other five default to `50% 50%`. Measured at 1440:
`["50% 50%","50% 50%","50% 50%","50% 25%","50% 50%","50% 50%"]`. The string is the same shape
plan 00-19's schema decision 6 gives the per-photo `focalPoint` field, deliberately, so the two
do not diverge into two representations of one concept before Phase 3 migrates them.

### The departure, measured at six classes

`audit22.mjs` scrolls by exactly one viewport height and reads the photos section's bottom edge
in viewport coordinates.

| Class | `svh` | State A: top / height / bottom | After scrolling one viewport | State B below the fold |
|---|---|---|---|---|
| 344×882 | 882 | 131 / 751 / **882** | `photosBottom=0` **departed** | 1475px |
| 390×844 | 844 | 131 / 713 / **844** | `photosBottom=0` **departed** | 1388px |
| 673×620 | 620 | 131 / 489 / **620** | `photosBottom=0` **departed** | 1062px |
| 768×1024 | 1024 | 131 / 893 / **1024** | `photosBottom=0` **departed** | 1182px |
| 1024×768 | 768 | 131 / 637 / **768** | `photosBottom=0` **departed** | 1001px |
| 1440×900 | 900 | 131 / 769 / **900** | `photosBottom=0` **departed** | 1058px |

State A's bottom edge equals `svh` exactly at all six. No class overflows, so no class needs
the visible-overflow escape `min-height` (never `height`) exists to provide.

`doc == viewport` at all six on both `/home` and `/home-act2` — zero horizontal scroll. The
`.ha-grid` reflow plan 00-21 added survived the rewrite; re-measured rather than assumed, as
that file's note asks.

### R-2, as implemented

**"Photos moves fully up" is exact and enforceable, and it is the table above.** *"Only work +
résumé are visible"* describes what **fills** the view at the end of the transition — it is not
a promise that both sections fit inside one viewport. With five projects (D-38) plus a résumé
section that is unachievable at every one of the six classes including 1440 × 900, and
honouring the strict reading would mean cutting projects or the résumé section from Home, which
the user explicitly ruled out in the same message.

**State B continues below the fold at all six classes — between 1001px and 1475px of it — and
that is the resolution, not a defect.**

**State B is also *at least* one viewport tall, and that is a rule the user's own sentence
forces.** For work and résumé to be what fills the view once state A has gone, they have to be
able to fill it. It failed at exactly one class and only a browser found it: at 768 × 1024 the
whole of state B — work, résumé, crosslink and footer together — came to **1012px against a
1024px viewport**. Twelve pixels short. The consequence was not cosmetic: the document was
2036px tall, so its maximum scroll offset was 1012px, and *a page that cannot scroll a full
viewport cannot complete the departure*. The audit read `scrollY=1012, photosBottom=12, NOT
DEPARTED`. Tablet portrait is the only class in the matrix tall enough in absolute pixels to
run out of document before it runs out of viewport; the other five clear it by 71px to 563px.
`.hm-b { min-height: 100svh }` closes it.

### Snap and reduced motion, as shipped

```css
@media (prefers-reduced-motion: no-preference) {
  html:has(.hm-a) { scroll-snap-type: y proximity; scroll-behavior: smooth; }
  .hm-a           { scroll-snap-align: start; scroll-margin-top: var(--hm-above); }
  #work           { scroll-snap-align: start; }
}
```

Measured, `no-preference`: `{type:"y", photos:"start", work:"start", behavior:"smooth"}`.
Chromium serialises `y proximity` as `y` because `proximity` is the initial strictness — plan
00-21 verified that against a synthetic control, so `y` is positive confirmation it is **not**
the strict value. The strict value appears nowhere in the file.

Measured, `reduce`: `{type:"none", photos:"none", work:"none", behavior:"auto"}` — all four
reduced-motion rules confirmed at once, and **the departure still succeeds at all six classes
in that run**, which is itself the proof that snap is not load-bearing.

**Without the `scroll-margin-top` on state A the page snaps on load.** A snap area starts at
the element's own box, and state A's box begins 131px down the document. That puts a snap
position at 131 rather than at 0 — close enough to the initial scroll offset for proximity to
pull it — and the page would scroll itself 131px at first paint and hide the nav, which is
precisely the *"large involuntary viewport translation"* the whole block exists to avoid.
Outsetting the snap area by the chrome above it puts snap point one at 0, where the landing
actually is. Snap point two needs no outset: the work band starts exactly one viewport down.

### `scroll-margin-top` per class — it is zero, and that is a measurement

| | 344 | 390 | 673 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| `.pub-bar` / `.ds-atom-appbar` computed `position` | static | static | static | static | static | static |
| `scroll-margin-top` on `#work` and `#resume` | 0 | 0 | 0 | 0 | 0 | 0 |

§5.6 rule 3 requires the anchor target to clear a sticky nav *"and if the public nav is not
sticky at a given class, the value is 0 there"*. It is not sticky at any class, so it is 0 at
all six — the nav scrolls away with the page and any positive value would open a gap rather
than close one. It ships as `--hm-sticky-nav` rather than being left out, because the value is
a function of the shell rather than of this page: the moment PUB-09 makes the nav sticky, that
is the one line to change.

**Zero is indistinguishable from "the rule never matched", so it was proved rather than
assumed.** `audit22.mjs` overrides `--hm-sticky-nav` with an inline style on `<html>` — which
outranks the stylesheet rule that sets it — and reads `#work`'s computed `scroll-margin-top`
back as **37px**. The declaration reaches its target.

### Two scoping traps, both caught by a browser and neither by a grep

**1 — a page's scoped CSS cannot reach a component's root.** Astro scopes a page's rules with
the *page's* cid and a component renders with its *own*. The work band is
`components/HomeAct2.astro`, so it emits `data-astro-cid-53zdqmy2` while every rule in
`home.astro` compiles to `data-astro-cid-vbfttlze`. A bare `#work { }` in the page silently
matched nothing: `getComputedStyle(work).scrollSnapAlign` read `none` while the source said
`start`. **That is plan 00-21's rail defect exactly, in a new costume** — and the plan's grep
gate passes the broken version in both cases. Fixed with `:global(html:has(.hm-a) #work)`, and
the page's three measurements moved onto the document element so they *inherit* into the
component.

**2 — the snap container had to reach `<html>` without leaking there.** `scroll-snap-type` sits
on the scrollport, and a page stylesheet has no other way to reach it; a bare global `html { }`
would be correct only for as long as the bundler keeps that stylesheet on one page, which is a
build-tool behaviour rather than a guarantee. `:has(.hm-a)` makes the scoping a property of the
markup. Asserted, not assumed — `control22.mjs` reads `scroll-snap-type` on `/`, `/work/`,
`/photos/`, `/home-act2/` and `/work/cairn/`: **`none` on all five, `y` on `/home/` only.**

### The negative controls — and the one the plan specified could not fail

The plan specified: change `100svh` to `60svh` and confirm the **departure** assertion fails at
every class. Run exactly as written it reported `departed` at all six. **The reason is
arithmetic, not instrumentation: a *shorter* state A departs more easily, not less.** One
viewport of scroll clears a 60svh block with room to spare. The mutation is real and the
assertion is real; they simply do not meet. Reporting that as a pass would have recorded a
control that cannot fail — which is the thing a control exists to rule out.

State A being *exactly* one viewport is two requirements wearing one declaration, and each
fails in its own direction. So there are two controls, each asserting on the property its own
mutation actually breaks. Both measure with snap disabled, because proximity snap parks
`photosBottom` at exactly 0 even when the budget is wrong — the enhancement masking the
mechanism.

| Control | Breaks | 344 | 390 | 673 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|---|
| `60svh` (too short) | state A fills the landing view | 717/882 | 747/844 | 618/620 | 700/1024 | 738/768 | 797/900 |
| `160svh` (too tall) | one viewport of scroll clears state A | +529 | +506 | +372 | +614 | +461 | +540 |

Row one is state A's bottom against `svh` at rest — the work band is on screen before the
reader scrolls at all, so *"just the homepage landing shows the photos section"* is false at
6/6. Row two is `photosBottom` after one viewport of scroll — photographs are still on screen,
so *"the photo section moves fully up"* is false at 6/6.

**Both bite at 6/6. Both restore to a byte-identical file:**

```
sha256 before  27d04a4f4163f587b581e1a91ab8890034e1c15946669b95e58d4f81b5ba0ac8
sha256 after   27d04a4f4163f587b581e1a91ab8890034e1c15946669b95e58d4f81b5ba0ac8
```

Restored, all six classes read **FILLS + DEPARTS** again.

### Accessibility — the six rules, measured

| Rule | Measured |
|---|---|
| DOM order is reading order is tab order | `photos > work > resume` in the built HTML at byte offsets 7725 < 16207 < 19886 |
| Zero `order`, zero `position: fixed` on a focusable, zero positive `tabindex` | none present; the transition needs none of them |
| Prompt is a real anchor | `<a href="#work">`, one Tab and one Enter from the landing |
| Nothing hidden from AT | `display:flex`, `visibility:visible`, no `aria-hidden`, no `inert` on either state |
| Focus visible after it moves | `--focus` ring inherited from the shell; `proximity` (not the strict value) means nothing re-snaps a revealed element away |
| Three named landmarks | `aria-label="Photographs"`, `aria-labelledby="hm-work-h"` → "The work", `aria-labelledby="hm-resume-h"` → "The résumé" |

State A moving out of view is a **scroll position**. A screen-reader user reads photos → work →
résumé linearly and never encounters the two-state framing at all, which is the correct
outcome, not a degraded one.

Hit areas at the five coarse classes, measured: the scroll prompt is **44px**, the résumé CTA
is **44px**, and both drop to their painted height at 1440 where the pointer is fine. The floor
is gated on `pointer: coarse`, never on width. `/home`'s remaining nine `under44` offenders are
**identical to every other public route's** — three AppBar anchors at 20px, three Footer links
at 22.5px (both halves of D-16-1, design-system owned), two `.ha-all` at 14px and 28px and one
`.hm-xlink` at 30px (the layout-owned third of D-16-1, which plan 00-21 recorded as recurring).
Nothing this plan added is under the floor.

### Observations recorded rather than fixed

**`home_config.ctas` points at `/portfolio`, which is a legacy route.** The public routes are
`/work`, `/photos` and `/resume`. Rendered as committed. Silently rewriting fixture data here
would hide a real content migration Phase 3 has to make.

**`resume.json` has no prose summary field.** It is experience / projects / skills / education
and nothing else. Home's résumé section therefore states the shape of the record — the current
role, "3 roles and 5 projects", the three skill category names — rather than paraphrasing it.
Inventing a summary sentence would put copy on Home that exists in no fixture and that Phase 5
would then have to find an owner for.

**`Card` inlines `display`, so a consumer cannot change it from a stylesheet.** Separate from
the `class`/`className` finding below and only visible once that one was fixed:
`.wk-card { display: flex; flex-direction: column }` now matches its element, and
`flex-direction` applies while `display` does **not** — `Card` sets `display: block` as an
inline style, which beats a class rule without `!important`. Measured `{cardDisplay:"block",
cardFlexDirection:"column", cardInlineDisplay:"block"}`. The consequence is real:
`.wk-tags { margin-top: auto }` does nothing outside a flex column, so `/work`'s cards do not
bottom-align their tech chips as designed. Not patched with `!important` from the consumer —
same shape as the recorded "`Text` inlines its variant colour" finding, and the Core Value says
a gap the design system exposes is a finding rather than a workaround.

### `class` vs `className` on a design-system component — closed

Plan 00-21 recorded that `Card` and `Chip` "silently drop the `class` prop" and attributed it
upstream. **It is a consumer usage error.** `class` is not a recognised React prop; `className`
is, and `Card` supports it — `../design-system/src/surfaces/Card/index.tsx:115` reads
``className={`ds-atom-card${className ? ` ${className}` : ""}`}``. Four call sites fixed:
`work.astro:219` `.wk-card`, `work.astro:236` `.wk-chip`, `work.astro:265` `.wk-legend-card`,
`work-recolour.astro:176` `.wr-card`.

Measured in a browser before and after, on both routes:

| | before | after |
|---|---|---|
| `class` attribute on the card | `ds-atom-card` | `ds-atom-card wk-card` |
| elements matching `.wk-card` | **0** | **5** |
| elements matching `.wk-chip` | **0** | **14** |
| card border-colour | `rgb(51,51,47)` = `--rule`, **1.43:1** | `rgb(114,114,104)` = `--wire` |
| chip border-colour | `rgb(51,51,47)` | `rgb(114,114,104)` |

**Ivory→Charcoal exception 3 now applies on `/work`'s project cards for the first time.** The
painted border had been sitting at exactly the contrast the exception exists to escape.
`/work-recolour` moved with it. A sweep of every design-system component on every `.astro` page
finds the corrected total is **0** remaining `class=` usages.

**`Chip` clobbers rather than concatenates, and that is a finding.** Its implementation
destructures `className` into `...rest` and spreads it *after* `className="ds-atom-chip"`, so a
consumer `className` **replaces** the atom hook: measured `chipClassAttr: "wk-chip"`,
`chipKeepsAtomClass: false`. `Card` concatenates; `Chip` does not. The net visual change here
is nil and that was measured too — `.dark .ds-atom-chip`'s three declarations were already
fully overridden by Chip's own inline `baseStyle`/`toneStyles`, and its `[data-interactive]`
focus rules do not apply to a non-interactive chip. Background stayed `rgb(36,36,35)` =
`--cream-3` and colour `rgb(234,231,224)` = `--ink` across the change. But the class hook is
gone from the DOM, and on an interactive chip it would take the focus ring with it. Not worked
around by hand-writing `ds-atom-chip` in the consumer — that reaches into design-system
internals and breaks silently if the atom class is ever renamed.

### Instruments left in `.playground/`

| Script | What it does |
|---|---|
| `audit22.mjs` | The six-class landing audit: state A's height against `svh`, the departure, R-6 doc-width, all six tiles painted and non-degenerate, computed snap on all three participants, the `scroll-margin-top` reachability probe, title size, prompt hit box. `RM=reduce` runs the whole thing under a reduced-motion preference |
| `control22.mjs` | The leak check, the snap-off control, and the two negative controls with SHA-256 before/after |
| `navprobe22.mjs` | The chrome-above-state-A measurement and the nav-stickiness reading, per class |
| `snap22.mjs` | Geometry + text snapshot of a route at six classes — how the `HomeAct2` extraction was proved visually neutral |
| `classprobe22.mjs` | The `className` measurement above, on `/work` and `/work-recolour` |

The `HomeAct2` extraction was proved rather than asserted: `snap22.mjs` compared every box's
position, size, colour, font-family, font-size, display and text content on `/home-act2` at all
six classes before and after the move — **2 592 boxes, 432 lines, byte-identical diff.** Astro
rehashes `data-astro-cid-*` when a rule changes file, so comparing the HTML itself would have
reported a difference that is not a visual one.

### Build state at the end of this plan

| | |
|---|---|
| `npx astro build` | **93 pages** — 92 plus `/home` |
| `check-no-js.sh` | **0** — 67 static routes at zero framework JS, 26 island routes verified to hydrate. `/home` is one of the 67 |
| `check-theme-exhaustive` · `check-font-names` · `check-contrast` · `check-css-size` · `check-states` · `check-coverage` · `check-no-ivory` | all **0** |
| `check-bundle.mjs` | **1 — BY DESIGN.** Finding G-15, not breakage |
| `audit21.mjs`, `/home` + `/home-act2` × 6 classes | **zero H-SCROLL**; `under44` is D-16-1 only, and identical on both routes |
| `audit22.mjs` | **PASS** at 6/6, and PASS again under `RM=reduce` |
| `control22.mjs` | **PASS** — no leak, snap non-load-bearing, both controls bite 6/6, restore SHA-256-identical |

---

## Re-review brief

**For the human reviewer at plan `00-11-PLAN.md`. Written by plan 00-25.**

**What this is, and what it is not.** Plan 00-11 is one of the phase's two open human checkpoints
and it was written in wave 6, against artefacts that have since been rebuilt underneath it.
`00-RESPONSIVE-CONTRACT.md` §11 says so in as many words: *"No verdict on plan 00-11's three
by-eye judgements. They are unanswered, they require a human eye, and the artefacts they judge are
about to change. Plan 00-11 remains OPEN and must re-run against the reworked sketches."*

This section is a **brief for that re-run, not a replacement of it.** It changes nothing in
`00-11-PLAN.md`, which is unmodified. It does **not** answer 00-11's three by-eye judgements —
the 44px-versus-52px Playfair header, the 22px `--ochre-d-strong` cross-link, and the 1080px Brevo
band cap. Those are the reviewer's to give, and they were deliberately deferred precisely because
the artefacts under them moved. Their answers still belong in `## Review outcome`, which 00-11's
own task 3 writes.

The one thing to know before opening 00-11: **a reviewer following its route list today will look
for `/case/long` and `/case/short`, and neither exists.**

### 1. Route map, before and after

| Route in 00-11's list | Status now | Note |
|---|---|---|
| `/work-recolour` | **survives** | X-work-recolour, unchanged in structure |
| `/work` | **survives, changed** | Responsive shell landed here; see §3 |
| `/photos` | **survives, changed** | Responsive shell; filter row behaviour differs by class |
| `/home-act2` | **survives** | Still the OQ-1 resolution, and now also rendered inside `/home`'s state B through one shared component |
| `/` | **survives** | The contact sheet |
| `/case/long` | **GONE** | Retired by plan 00-20 |
| `/case/short` | **GONE** | Retired by plan 00-20 |

**New since 00-11 was written:**

| Route | Artefact | Built by |
|---|---|---|
| `/home` | `X-home` — the two-state landing | plan 00-22 |
| `/work/design-system/` | `X-case-design-system` — 597 words | plans 00-18 + 00-20 |
| `/work/cairn/` | `X-case-cairn` — 692 words | plans 00-18 + 00-20 |
| `/work/hued/` | `X-case-hued` — 619 words | plans 00-18 + 00-20 |
| `/work/momentum/` | `X-case-momentum` — 682 words | plans 00-18 + 00-20 |
| `/work/timeshift/` | `X-case-timeshift` — 647 words | plans 00-18 + 00-20 |

`/work` and `/work/{id}` coexist with no routing collision. `src/pages/case/` no longer exists.

### 2. What each of 00-11's tasks now reviews

**Task 1** — the charcoal resolution of Work, Photos and Home Act 2. Its eight steps still apply
and its three by-eye judgements are still the three it names. Two changes to what you will be
looking at: `/work`'s cards now carry Ivory→Charcoal **exception 3** for the first time (§3), and
both routes now respond across six device classes rather than two, so each judgement can be taken
at more than one width if the width turns out to matter.

**Task 2** — written as *"the two case-study templates against real drafted copy"*. **It is now
one template against five compressed studies.** D-39's stacked two-tier scheme is superseded:
there is **one tier**, five studies at **500–700 words** (597 · 692 · 619 · 682 · 647), and one
route per case at `/work/{id}`.

The judgement task 2 asks for is unchanged — *does this read as deliberate rather than as lorem,
and does the 68ch measure hold with real prose in it.* What changed is the artefact, and one of
task 2's eight steps no longer has a subject: **step 6, "does the short form read as a deliberate
tier, or as a truncated long form"**, cannot be answered because there is no short form. The tier
question is closed by construction; the measure question is not, and is now asked of five
documents instead of two.

Task 2's step 5 still holds and is worth keeping: the design-system study still closes by pointing
at the page you are reading it on.

### 3. What is newly in front of the eye

Each with the plan that built it and where to look.

**The Home two-state landing — plan 00-22, at `/home`.** State A is
`min-height: calc(100svh - var(--hm-above))`, **not** `100svh`. The chrome above it measures a
constant **131px** at all six classes, measured rather than assumed; a bare `100svh` would leave a
band of photographs on screen after one viewport of scroll while the CSS looked correct. The
transition is a plain document scroll, `scroll-snap` is a `proximity` enhancement inside
`prefers-reduced-motion: no-preference` and is never load-bearing. **Both states are the artefact
— judging state A alone judges half a design.**

**The compressed case studies — plans 00-18 and 00-20, at `/work/{id}`.** Compression was ~60% on
the former long tier and ~20% on the former short tier, which is why the **shortest** study today
is `design-system` at 597 words — a former *long* study. Two of Cairn's decisions changed on the
user's ruling: **multi-tenancy restored, the contrast decision cut.** The middle heading is
normalised to `## Decisions` (plural) across all five.

**The real-layout photo board — plan 00-23, at `/admin/photos`.** The order view is now the
**real public masonry**, drawn at the public surface's spacing rather than the admin chrome's
density-scaled tokens, with an **editable focal point on all 39 photos**. `SortableReorder.tsx` is
gone; `PhotoLayoutBoard.tsx` replaced it. `FocalPointSketch.tsx` is reused byte-identical, not
forked.

**The responsive shell — plan 00-21, across the public routes.** Gutter ladder **16 / 24 / 32 /
48**, `svh` rather than `vh`, and `/work`'s horizontal overflow at **344 and 390 closed**. This is
also where **Ivory→Charcoal exception 3 lands on `/work`'s cards for the first time**: four
`class=` → `className=` fixes, and the card border moved `rgb(51,51,47)` → `rgb(114,114,104)`. If
the cards read differently from how they read in wave 6, that is why.

**The four photo fields, plus a revived fifth.** **Source note: this paragraph is written from
`00-19-SUMMARY.md`, the schema *specification*, because `00-24-SUMMARY.md` — the *implementation*
— did not exist when this brief was written.** 00-19 is complete and authoritative about *what*
changes; it is not evidence of what shipped. **Before the review runs, check `00-24-SUMMARY.md`
for deviations from the spec below.**

| Field | Type | Required | Rule as specified |
|---|---|---|---|
| `alt` | `string` | **required** | Describes the frame. Separate from `title`. Machine-enforced. |
| `place` | `string` | optional | **Manual. Never derived** — EXIF GPS is stripped, so an empty `place` is a privacy decision that already happened. |
| `description` | `string` | optional | Lightbox only, **and present in the served HTML** — not injected by JS. |
| `focalPoint` | `string` | optional, default `"50% 50%"` | Reuses `home_config.peekPositions`' `"50% 25%"` string shape. |
| `tags` | `string[]` | optional | Revived by the owner of the content. Empty on all 39 today. |

**No alt text was invented** — all 39 cells carry `[AKHIL-ALT]` and nothing else, and none of the
five fields was written into `data/portfolio_images.json`. That is deliberate: Phase 3 owns the
migration, and a required field present-and-empty is a worse artefact than an absent one. The 39
alt texts are tracked human content and a **Phase 5 shipping blocker**, not a Phase 0 one.

**One correction worth carrying into the review:** the component count is **79**, corrected from
80 in `one-liners.md`. The design system's README is **retired as an authority** — it matches
neither shipped source; the catalog says 79 and `src/` has 81 directories.

### 4. What is deliberately still broken — do not report these as findings

A reviewer who does not know this list spends the review re-finding it. Every item below is known,
written down, and already has an owner.

| Item | What you will see | Owner |
|---|---|---|
| **D-16-1** | `AppBar`'s brand link and `Footer`'s link list sit **under the 44px floor on every public route**. They paint their own geometry **inside the design system**, so no app-side CSS can fix them without violating Core Value. | **Phase 1**, with **G-2**'s control-geometry token layer |
| **`/photos/` at the coarse classes** | `/photos/` **fails the 44px floor at five of the six classes**: wordmark **20px**, `.ph-xlink` **30px**, footer links **22.5px**. Not closed by this rework and **design-system-owned**. | **Phase 1** |
| **G-13** | On the photo board, the drag announcer **speaks record slugs and no position** — "moved `abstract-intothemist`" rather than "moved to position 4 of 39". `Sortable` exposes no announcer passthrough. | **Phase 1** owns the passthrough |
| **G-15** | `check-bundle.mjs` **still exits 1**. That is the finding, not breakage. Every other check exits 0. | filed, tiered |

**One stale figure, corrected.** D-16-1's write-up quotes the AppBar brand link at 40px. At class
1 it is **20px at 344**, not 40px. Use 20px.

**And on the register's size:** `00-FINDINGS.md` carries **fifteen** `G-` rows, G-1 through G-15.
If a document you open during the review says sixteen, it is wrong — the figure was propagated by
mistake through this phase. **Do not add a row to make a count agree**; the register states its own
fixed-denominator rule, and a plan that finds something outside it records the finding in its own
SUMMARY instead.

### 5. Still confirm-or-override — silence here is a decision, not an omission

`00-RESPONSIVE-CONTRACT.md` §10 states seven derivations that **proceed unless overridden.** Three
of them were **acted on** by this rework, and acting on an item is not the same as confirming it —
the code exists either way, and only an explicit answer closes the item.

| # | Item | Stated position | What overriding costs now |
|---|---|---|---|
| **R-1** | Case-study target length | **500–700 words**, one tier | Any number; the compression pass takes it. This is the only item that changes the copy — and the copy has now been compressed once, so a new number is a second pass over five documents. |
| **R-2** | *"Only work + résumé visible"* (§5.7) | Read as **what fills the view after the transition**, not as a promise that both sections fit one viewport. It cannot hold at five projects plus a résumé section at **any** class. | **Home's content has to shrink** — fewer projects on Home, or the résumé section reduced to a link. **That is a content decision, and no plan in this phase is authorised to take it.** This is the one to answer deliberately. |
| **R-3** | Case route shape | **`/work/{id}`** using D-38 ids | `/case/{id}`, or anything else. Nothing else in the contract depends on the choice, and five routes move. |

The other four §10 items — R-4 (canonical heights), R-5 (the gutter ladder), R-6 (reflow never
hide), R-7 (`scroll-snap` at all) — are unchanged by this rework and are not re-opened here.

### 6. The screenshot record you will be walking at plan 00-17

Plan 00-17 is the phase's **other** open checkpoint, and its review passes are walked over a
screenshot record. That record is now defined by **`00-SCREENSHOT-CONTRACT.md`**, and it is **six
device classes, not two**: 344 · 390 · 768 · 841 · 1024 · 1440.

Roughly **88 files**, against an asserted floor of **80**. The contract's §2 explains every
asymmetry — why the 29 admin desktop artefacts stay at 1440 only, why the 6 phone artefacts get
390 **and** 344, and why two case studies are captured at all six classes while three are captured
once. `841 × 768` is the single most demanding capture in the set: class 3 is the only class whose
aspect band contains **1.0**, and the only one that can cross it without a navigation.

Plan 00-17 has been amended to match that contract — four viewport and count literals, and the
prose that quoted them. **Nothing about its six review passes, its human checkpoint or its
`.playground` deletion fence changed, and it remains OPEN.**

*Recorded by plan 00-25. Sources: `00-RESPONSIVE-CONTRACT.md` §9, §10 and §11; `00-11-PLAN.md`
(read only, unmodified); `00-17-PLAN.md`; `00-18-SUMMARY.md`, `00-19-SUMMARY.md`,
`00-20-SUMMARY.md`, `00-21-SUMMARY.md`, `00-22-SUMMARY.md`, `00-23-SUMMARY.md`;
`00-SCREENSHOT-CONTRACT.md`. The photo-field table is from `00-19-SUMMARY.md` — the specification
— because `00-24-SUMMARY.md` did not yet exist; see the source note in §3.*

---

## Review outcome

Recorded 2026-08-19 from Akhil's answers to the three judgements UI-SPEC flagged as
confirm-or-override. **These proceed unless overridden, so silence would have been assent** — all
three now have an explicit answer on the record, which is what survives the playground's deletion.

### J1 · 44px vs 52px page header — **44px CONFIRMED**

The 44px Playfair primary stands; the 52px G-11 reference is **not** adopted for the Work and Photos
headers. Playfair's larger x-height and heavier stems mean it already carries the weight the handoff
got from Newsreader at a larger size, so matching the handoff's number would have overshot its
intent.

**The 52px step still ships**, and that is not a contradiction. Plan 01-12 added
`--text-4xl-plus: 52px` to the shared type scale in `tokens.css` because G-11 was filed as a
*design-system* gap under D-31 — sizing is design-system-owned, so a brand needing a missing step
files it upstream as a step available to every brand. The step exists; this page does not use it.
Phase 5 renders these headers at **`--text-4xl` (44px)**.

### J2 · the 22px italic serif cross-link — **OVERRIDDEN, and not by the offered fallback**

Verdict: *"too big and heavy, can keep smaller font too."* Both axes rejected — the size **and** the
colour weight.

**Neither offered option was taken.** The plan framed the choice as keeping 22px in
`--ochre-d-strong`, or raising to **24px** in `--ochre-d` "to resolve the WCAG large-text ambiguity
by arithmetic instead of by judgement." Measuring the tokens shows **there was no ambiguity to
resolve**:

| Mode | Token | Value | On page | Ratio | AA-small (4.5:1) |
|---|---|---|---|---:|---|
| light | `--ochre-d-strong` | `#6B4417` | `#F4F1EA` | 7.55 | PASS |
| light | `--ochre-d` | `#8C591F` | `#F4F1EA` | 5.22 | PASS |
| dark | `--ochre-d-strong` | `#D4A66D` | `#161616` | 8.16 | PASS |
| dark | `--ochre-d` | `#C6883A` | `#161616` | 6.02 | PASS |

**Every combination clears the stricter small-text bar in both modes.** The 24px fallback existed to
buy the 3:1 large-text allowance, and that allowance was never needed. So size is a pure design
decision here, unconstrained by contrast — and the direction Akhil chose is *down*, which the
arithmetic permits.

**Resolved treatment for Phase 5:** `--text-lg` (**17px**) in **`--ochre-d`**, italic serif.

- **17px** is the next existing step down from 22px (`--text-xl`); 15px (`--text-md`) sits too close
  to body copy at 13px base. No new scale step is introduced — unlike G-11, this needs none.
- **`--ochre-d` rather than `--ochre-d-strong`** answers "heavy": it is the lighter of the two accent
  text steps, at 5.22:1 light / 6.02:1 dark. Still AA-small with margin.
- Recorded as a decision rather than applied to the sketch, because the sketch is deleted at 00-17
  and **Phase 5 is the consumer**.

**Implementation warning for Phase 5 — this exact link will lose its colour silently if built
naively.** Three consecutive Phase 1 plans hit this. `Link`'s default variant is `inline`, which sets
`color` as an **inline style** and cannot be recoloured from a stylesheet at all; only the
stylesheet-only `default` and `quiet` variants are composable. And
`.ds-atom-link[data-variant="default"]` is **(0,2,0)**, so an app-level rule at (0,1,0) or (0,1,1)
loses on specificity — while every unit test passes, because jsdom implements no CSS specificity.
01-11 shipped a grey link inside a red error box this way. **Verify the computed colour in a real
browser.**

### J3 · the 1080px Brevo band cap — **CONFIRMED**

Verdict: *"it's fine."* The employment band capped at 1080px reads as one row per line rather than a
serif title and a mono metric floating apart, and the two bands read as two different kinds of
evidence. Phase 5 keeps the cap.

### The remaining review passes — completed 2026-08-22

Walked with Akhil against the live sketches at 1440×900 and 390×844.

| Item | Route | Verdict |
|---|---|---|
| `--wire` project cards on dark | `/work-recolour` | **PASS** — cards hold their edges; the `--wire` treatment took. Borders carry the boundary rather than the fill, as the charcoal resolution intended. |
| Photo tiles + active filter pill | `/photos` @ 1440 and 390 | **PASS** on both. Dark-toned photographs do not bleed — the inset 1px `--rule` ring gives each tile the edge it did not need on ivory — and the active pill reads as filled LIGHT, avoiding the literal-colour-mapping trap that made it invisible. |
| 68ch prose measure | the five `/work/{id}` pages | **CONFIRMED at 68ch.** This is now a reviewed number rather than a derived one, and it is what **Phase 6 builds against**. |
| Act-2 project grid | `/home-act2` | **REWORK** — see below. |
| `[NEEDS AKHIL]` block lengths | the five case pages | **TOO LONG.** They overstate how much prose each section needs, so a template judged against them is being judged against padded text and the real copy will read thin beside it. Shorten to realistic finished lengths **when the real copy is written in Phase 6** (copy approval was deliberately deferred there). |
| `[source:]` annotations | the five case pages | **NOT CHECKED — recorded as unverified, not as passed.** Must resurface before Phase 6 consumes the copy. Note the corpus has already caught one self-contradiction unaided: hued's colour-name count is 18,000+ in its README, 31,000+ in its store listing, and **31,898** in the actual JSON. |

#### Act-2 grid — the arrangement, and the constraint that decided it

The five-project 2×2-plus-one arrangement is rejected. Akhil intends to **add more projects** and wants
**every project to carry equal weight**, which rules out a featured-first layout and rules out any
fixed arrangement that has to be redesigned each time the count changes.

**The deciding constraint is the two-act Home's own mechanism.** Act 2 must hold work *and* résumé
within one viewport after a single scroll. A grid that grows with the project count eventually pushes
the résumé below the fold and breaks the thing it lives inside — so the layout has to be
**count-independent**, not merely larger.

**Chosen: an auto-fitting grid, capped at six, with a link to `/work` for the remainder.**

```css
grid-template-columns: repeat(auto-fit, minmax(~300px, 1fr));
```

- **Equal weight by construction** — identical cards, no featured slot, so nothing reads as ranked.
- **Adding a project changes no layout code.** Three columns at 1440, two at 768, one at phone, all
  from one rule.
- **Act 2's height is bounded** regardless of how many projects exist, so the single-scroll two-act
  Home keeps working. This is the property the other candidates lost.
- **The cap is deliberate, not a limitation.** `/work` is already the complete two-band list (D-44),
  so the Home grid is a *teaser* by design; a seventh project appears there and needs no Home change.

Phase 5 builds this. The exact `minmax()` minimum and the cap's overflow behaviour (most recent first,
or a curated order) are Phase 5's to settle — the shape and the height-boundedness are fixed here.

### 00-11 is CLOSED

All three flagged judgements answered, all remaining review passes walked. Two items carry forward as
work rather than as open review: **shorten the `[NEEDS AKHIL]` blocks** and **verify the `[source:]`
claims**, both when Phase 6 writes the real copy. The Act-2 grid is respecified above. The tier-split
question from the plan's Task 2 is **void** — the mid-phase redirection removed the long/short
tiering.
