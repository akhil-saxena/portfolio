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
