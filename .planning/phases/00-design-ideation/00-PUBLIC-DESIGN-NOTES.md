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
