---
phase: 0
plan: none — OFF-PLAN, by direct user direction
subsystem: design-ideation
tags: [responsive, six-class-matrix, density-axis, pointer-fine, full-viewport-scroll, svh, scroll-snap, reduced-motion, foldable, d-39-superseded]
requirements: []
dependency_graph:
  requires:
    - 00-UI-SPEC.md §"Viewport and mode contract" — the three-row table this extends
    - 00-UI-SPEC.md §Density Contract — both invariants, carried verbatim
    - 00-UI-SPEC.md §"Screenshot record" — the naming contract whose viewport token changes
    - 00-CONTEXT.md D-08, D-09, D-38, D-39, D-44, D-45
    - 00-FINDINGS.md §"How to read this register" — the fixed-denominator rule that kept it unedited
    - 00-PUBLIC-DESIGN-NOTES.md resolutions 3/6/8, §OQ-1, §Case-study templates
  provides:
    - path: ".planning/phases/00-design-ideation/00-RESPONSIVE-CONTRACT.md"
      provides: "The six-class device contract, mode+density resolved by pointer type, and the full-viewport scroll constraints every later sketch and build phase is held to"
    - path: ".planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md §Responsive direction"
      provides: "The permanent record of the user's mid-phase direction, what it supersedes, and its six invalidations"
  affects:
    - 00-12 → 00-16 (admin sketches — not yet built, must be built to this contract natively)
    - 00-17 (screenshot contract: regex, floor and per-class policy all change)
    - 00-11 (remains OPEN; must re-run against reworked sketches)
    - Phase 06.1 / DS-11 (G-2 gains a pointer-gating acceptance clause)
    - Phase 5 / PUB-01, PUB-02, PUB-04 (Home landing, case routing, filter row)
tech_stack:
  added: []
  patterns:
    - "Density resolved by `pointer: fine`, never by width and never by `any-pointer: fine`"
    - "Full-viewport states specified in `100svh` + DOM order, never in `vh`, `dvh` or `aspect-ratio`"
    - "`scroll-snap-type: y proximity` as a non-load-bearing enhancement inside `prefers-reduced-motion: no-preference`"
    - "Reflow, never hide — arrangement changes across classes, presence does not"
key_files:
  created:
    - .planning/phases/00-design-ideation/00-RESPONSIVE-CONTRACT.md
    - .planning/phases/00-design-ideation/00-RESPONSIVE-SUMMARY.md
  modified:
    - .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md
decisions:
  - "Width alone cannot decide density — a 1024px coarse-pointer tablet and a 1024px fine-pointer laptop window need different densities at the same width, so `pointer: fine` decides it and UI-SPEC's breakpoint form of density invariant 2 is provably insufficient"
  - "`any-pointer: fine` is forbidden for any density purpose — it returns TRUE for a tablet with a trackpad keyboard, which is the one case that decides the mechanism"
  - "The Home two-state landing is a plain document scroll (`min-height: 100svh` + a real `<a href=\"#work\">`), not a scroll-driven animation and not a JS-pinned section — zero JS, keyboard-safe, and aspect-ratio-independent by construction"
  - "`100svh` required, `100vh`/`100lvh` forbidden (prompt below the fold at first paint), `100dvh` forbidden on any scroll-transition participant (its target moves mid-gesture)"
  - "`scroll-snap-type: y proximity` only, never `mandatory`, and only inside `prefers-reduced-motion: no-preference` — snap converts a small gesture into a large involuntary viewport translation"
  - "Nothing is hidden from AT: `display:none`, `visibility:hidden`, `aria-hidden` and `inert` are all forbidden on either Home state"
  - "State A is a per-class height budget, and column count rises as viewport height falls — fewer columns means more rows means taller, so width alone decides the composition no more than it decides the density"
  - "Reflow, never hide: all six peek photos and all eight filter categories exist at 344px"
  - "D-39 superseded — one case-study tier, five routes, cases may scroll internally"
  - "\"Only work+résumé visible\" is read as what fills the view after the transition, not as a promise both sections fit one viewport — it cannot hold at five projects plus a résumé section at any of the six classes"
  - "`00-FINDINGS.md` deliberately not edited, per its own fixed-denominator rule — the one candidate new gap is recorded here instead"
metrics:
  duration: ~35 min
  completed: 2026-08-17
  artefacts_written: 2
  artefacts_appended: 1
  contract_lines: 786
  contract_words: 8037
  notes_section_lines: 216
  notes_section_words: 2205
  playground_measurements: 7
---

# Phase 0 — Responsive Device Contract Summary

**A six-class device contract that resolves density by pointer type rather than by width,
specifies the Home two-state full-viewport landing as a zero-JS plain document scroll in
`100svh`, and records honestly that D-39, plan 00-10's routing and plan 00-17's screenshot
arithmetic are all superseded — while plan 00-11 stays open.**

## Scope note — this is off-plan

There is no `PLAN.md` for this work. It was added by **direct user direction mid-phase**,
after plans 00-09 and 00-10 were built and before the admin sketches (00-12 → 00-16) were
started. The filename is deliberately **`00-RESPONSIVE-SUMMARY.md`**, not an `NN-SUMMARY.md`,
so the orchestrator's plan-completion scan does not read it as a planned plan finishing.

**`STATE.md` and `ROADMAP.md` were not touched** — the orchestrator owns those.
**`.playground/` was not touched** — it was read, read-only, for the seven measurements below.
**No code was written.** **`00-FINDINGS.md` was not edited**, for the reason in "Findings"
below. **Plan 00-11 was not marked complete and no `00-11-SUMMARY.md` exists.**

## What was delivered

| # | Artefact | Shape |
|---|----------|-------|
| 1 | `00-RESPONSIVE-CONTRACT.md` — **new** | 786 lines / 8,037 words. Eleven sections: the six-class matrix, density-by-pointer, the gutter ladder, the 68ch measure across classes, the Home two-state landing in seven parts, foldable posture, one-tier case routing, DS consequences, the screenshot arithmetic, confirm-or-override, and an explicit out-of-scope list. |
| 2 | `00-PUBLIC-DESIGN-NOTES.md` §"Responsive direction" — **appended** | 216 lines / 2,205 words. The direction verbatim, the five confirmed readings, what it supersedes, the six invalidations, the finding the matrix forces, and the DS consequences. Frontmatter `appended:` ledger updated with a `supersedes: [D-39]` entry. |
| 3 | `00-RESPONSIVE-SUMMARY.md` | This file. |

## The derivation that was the point

UI-SPEC states density invariant 2 as a **breakpoint** rule — *"`data-density="compact"` MUST
NOT apply below the phone breakpoint"* — and defers the mechanism to Phase 06.1, naming two
candidates (the DS gates on `@media (pointer: fine)`, or the consumer sets the attribute
responsively). With six classes the breakpoint form is **provably insufficient**:

> A **1024px laptop browser window** is a fine pointer and `compact`'s 30px controls are
> correct. A **1024px tablet in landscape** is a coarse pointer and 30px is **14px below the
> 44px floor**. Same width, opposite correct answer. Width is not the variable that differs.

So **`pointer: fine` decides density**, the mechanism is promoted from a Phase 06.1 choice to
a Phase 0 requirement, and one of UI-SPEC's two candidates is now known to be wrong.

**The sub-distinction that actually decides the mechanism** — and the reason the contract
forbids the obvious-looking alternative:

| Device | `pointer: fine` | `any-pointer: fine` | Correct |
|--------|----------------|--------------------|---------|
| Laptop | ✅ | ✅ | `compact` |
| Phone / cover / tablet | ❌ | ❌ | `comfortable` |
| **Tablet + trackpad keyboard** | **❌** | **✅** | **`comfortable`** |

`any-pointer: fine` gets the third row wrong, so it is forbidden for any density purpose.

**UI-SPEC's three-row table survives unchanged.** 1440 is fine-pointer, 390 is coarse-pointer —
its existing rows are a correct special case of the new rule. Admin stays light (*"sketching
the admin in dark mode is an anti-pattern"* — carried), public stays dark, phone stays
`comfortable`, desktop stays `compact`. **This is an extension with zero contradictions**, and
both density invariants are carried verbatim.

**The same shape of derivation recurred**, which is what turned it into the document's
through-line: at a short viewport the Home peek gallery needs *more* columns, not fewer,
because fewer columns means more rows means taller. **Width alone decides neither the density
nor the full-viewport composition.**

## Measured, not asserted

Seven read-only measurements from `.playground/src/`, which are the only figures in the
contract not quoted from a committed document. They establish the honest baseline:

| Fact | Location | Value |
|------|----------|-------|
| Public shell gutter | `layouts/Public.astro:100` | `--space-12` — **48px, unconditional** |
| Width media queries, whole playground | `src/**` | **one** — `case.css:423`, `max-width: 900px` |
| `pointer:` queries | `src/**` | **zero** |
| `dvh` / `svh` / `lvh` | `src/**` | **zero** |
| `100vh` | `layouts/Public.astro:95` | **one**, on `body` |
| `scroll-snap` | `src/**` | **zero** |
| `prefers-reduced-motion` | `pages/photos.astro:361` | **one**, guarding the tile hover |

So the public sketches carry **essentially no responsive work** — which is not a criticism of
plans 09 and 10, since responsive was not a requirement when they were written, but it does
mean plan 00-17's existing requirement to capture every `X-` at 390 would currently photograph
a 1440 design squeezed into 390px. At the narrowest class the fixed 48px gutter spends **28%
of a 344px viewport on padding**, which is what forces the 16 / 24 / 32 / **48** ladder — with
the ≥ 1024 rung deliberately unchanged so nothing already approved moves.

## The two things stated plainly rather than softened

**1 — One reading of the direction cannot hold.** *"Only work+resume sections are visible in
the view"*, read strictly, asks both sections to fit one viewport. At five projects (D-38) plus
a résumé section that is **unachievable at all six classes, including 1440 × 900**, and it
collides with the same message's *"the sections … stay as is."* Resolved as: *"photos moves
fully up" is exact and enforceable; "only work + résumé visible" describes what fills the view
at the end of the transition.* The content constraint won because it was stated more
emphatically and because it protects content. **Escalated to the user as R-2**, not buried — if
the strict reading is intended, Home's content must shrink, which is a content decision this
work was not authorised to take.

**2 — The near-square foldable does not break the transition, and the reason is worth having.**
The mechanism references only `svh` and DOM order, neither of which is a function of aspect
ratio — so the "moves fully up and out" property holds at 1.10 for the same reason it holds at
0.39 and 1.80, **not** because 1.10 was special-cased. What *does* get tight at ~1.1 is state
A's **composition**: worked at both ends of class 3's band, the wide end (841 × 768) fits with
~38px of headroom and the **narrow end (673 × 612) overflows by ~44px**. That is a composition
problem with a composition fix (the height budget), and it makes class 3's narrow end the first
thing to check in the sketch phase — which is why the screenshot matrix captures 841 × 768 at
all.

## All seven technical constraints addressed

| # | Constraint | Ruling |
|---|-----------|--------|
| 1 | `100vh` broken on mobile | **`min-height: 100svh` required.** `vh`/`lvh` forbidden — the prompt, the one element whose job is to be seen at first paint, lands below the fold. `dvh` forbidden on any scroll-transition participant — it changes *during* the scroll, so the target distance moves mid-gesture. `min-height` not `height`, so overflow is visible rather than clipped. The `lvh − svh` delta is reframed as a **feature**: a ~60–100px peek of the next section arrives exactly when it is useful. Desktop unaffected (`svh == vh` with no dynamic chrome). |
| 2 | Near-square ~1.1 foldable | See above. Mechanism is aspect-ratio-independent by construction; §1 therefore **forbids aspect-ratio branching** outright, since that is what would forfeit the property. |
| 3 | `scroll-snap-type` | **Adopted narrowly**: `y proximity`, two snap points, as a non-load-bearing enhancement. `mandatory` **forbidden** — state B is taller than the viewport at every class, which is exactly the shape `mandatory` traps. All five failure modes named and individually answered (fights user scroll; traps keyboard focus; variable-height content; SR non-participation). Test it had to pass: **every state reachable with snap is reachable without it.** |
| 4 | `prefers-reduced-motion` | Four rules. The non-obvious one: **`scroll-snap-type` lives *inside* `no-preference`**, because snap converts a small gesture into a large involuntary viewport translation. `scroll-behavior: smooth` is opt-in, never opt-out. Scroll-driven animation is disabled, not slowed. `photos.astro:361` is the carried precedent. Noted that user-initiated scroll is exempt and must not be suppressed. |
| 5 | Keyboard + screen reader | Six rules. DOM order = reading order = tab order, enforced as **zero `order`, zero `position:fixed` on a focusable, zero `tabindex` > 0 — if a composition cannot be built inside that, the composition is wrong.** The prompt is a real `<a href="#work">`. `scroll-margin-top` = sticky nav height, a per-class number. **`display:none` / `visibility:hidden` / `aria-hidden` / `inert` all forbidden on either state** — the two-state framing invites hiding the inactive state, which would delete the gallery from every SR user. Refusing `mandatory` is what makes focus-reveal scroll positions stable. |
| 6 | Foldable posture / hinge | **Reflow, never hide** — no content is hidden at 344px; a hiring manager who cannot see a project has lost it, and there is no summary edition. The posture change is a **live resize, not a navigation**, which bans any layout depending on a once-taken viewport measurement (no `window.innerWidth` in state, no build-time assumption, no device sniff). **The hinge is not targeted**, justified by a checkable claim: no two-column layout exists below 1024px, so nothing straddles it — and the claim states its own falsification condition. |
| 7 | 44px floor on every coarse class | Binds on **five of six classes**, so it is the common case, not the exception. It is a floor on the **hit area, not the drawn control** — otherwise every control becomes a slab and the editorial identity goes with it. Worked instance: eight Photos filter anchors at 312px content would wrap to **176px of viewport**, so the row wraps at classes 3–6 and becomes an `x proximity` rail at classes 1–2 — safe *there* specifically because Photos has no vertical snap container, which is also why Home's peek gallery is **not** a rail. |

## Findings — and why the register was left alone

`00-FINDINGS.md` states its own rule: *"Rows are **not** added or re-litigated by a measurement
plan — a plan that finds something outside the sixteen records it in its own SUMMARY instead,
so the tier-pull contract keeps a fixed denominator."* **Honoured. The register is unedited.**

**Candidate NEW gap — `AppShell` has no responsive posture.** UI-SPEC assigns
`Sheet side="left"` for the phone sidebar (D-09), but nothing states *at what width* the
sidebar becomes a Sheet, or whether `AppShell` decides it or the consumer does. Latent with two
viewports; **load-bearing with six**: at class 3 (673–884, coarse) and class 4 (768–834,
coarse) — sidebar or Sheet? A 240px `--ds-sidebar-w` (on the MUST-NOT-redefine list) inside
777px of content is **31% of the screen** for a tool whose content column caps at 960px.
Distinct from **G-8**, which is a missing `banner` slot, not responsive behaviour. Proposed
tiers if adopted: `blocks-Phase-7`, `should-fix-in-Phase-1`. **This must be answered before the
admin sketches**, because the answer changes what `S-*` looks like at two classes and there is
no point sketching it twice.

**Two acceptance clauses for existing rows**, to be applied when those rows are next opened —
not new rows:

- **G-2** — density variation must gate on `@media (pointer: fine)`, never on a width
  breakpoint and never on `any-pointer`. A DS that varies `--control-h` by width ships a
  sub-44px control to every tablet.
- **G-9** — the proposed `FilterNav` must reach the 44px hit area without growing its drawn
  geometry, and must support the classes-1–2 horizontal rail.

**Three existing findings carried, not re-litigated**, because all three pass every automated
gate while being visibly wrong — which is the standing argument for why the by-eye review must
re-run rather than be closed on the old artefacts: the accent reaching no declarative accent
(`tone="accent"` → `#fbbf24` at ~11:1, so no contrast check catches it); `Card` / `Chip` unable
to express a boundary on charcoal dark; and a page being unable to recolour a DS `Text`, only
to tell it a tone.

## Screenshot arithmetic

**≈ 49 files → ≈ 84.** Deliberately **not** a 6× multiplier — the same reduction logic UI-SPEC
applied to its 42-cell state matrix applies here.

| Artefact class | Captured at | Files | Reason |
|---|---|---:|---|
| `S- E- T- O-` (29) | 1440 only, unchanged | 29 | One user, at a laptop. Density has **two** pointer values, not six. |
| `P- R-` (6) | 390 + **344** | 12 | 344 is the class that breaks a phone layout. |
| `X-work-recolour`, `X-work`, `X-photos` | all six | 18 | Where responsive is the hard requirement. |
| `X-home` states **A and B** | all six, both | 12 | The transition is the artefact; one state is not evidence of two. |
| `X-case` — longest + shortest | all six | 12 | Two studies bracket the measure; five × six would photograph one template. |
| `X-contact-sheet` | 1440 only | 1 | Review chrome, not a design. |

Canonical sizes `344×882 · 390×844 · 768×1024 · 841×768 · 1024×768 · 1440×900`; new regex
`^00-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(344|390|768|841|1024|1440)\.png$`. Three of
plan 00-17's automated assertions break: the `(1440|390)` regex, the `-ge 35` floor (→ **≥ 80**),
and the "both 1440 and 390 per `X-` id" check. **The mode rules are untouched** — the assertion
that no admin artefact was captured in dark mode survives verbatim.

## Deviations from plan

**There is no plan.** This was off-plan work by direct user direction, so there is nothing to
deviate from. Three judgement calls worth recording as deviations-in-spirit:

**1 — `00-FINDINGS.md` was deliberately not appended to.** The objective permitted appending
"only if you find a genuine new DS gap". One was found — and the register's own
fixed-denominator rule routes exactly this case to the SUMMARY instead. Following the register's
stated rule beats following the permission, so the gap is recorded here.

**2 — A collapsed-tier bug was caught that neither the direction nor the objective mentioned.**
The five committed drafts spell the middle heading two different ways — `## Decisions` (long)
vs `## Decision` (short). Plan 00-10's loader throws on the mismatch precisely because a loader
assuming one spelling **silently drops a section from three of five studies and still renders a
page**. Collapsing to one tier does not make that safe: the drafts on disk are unchanged. The
single template must accept either spelling and still throw on neither, or the drafts must be
normalised during the compression pass. Recorded in both artefacts, because doing neither
reintroduces a bug the previous plan had already closed.

**3 — Both case-study word-count totals are recorded, not one.** The user's whole-file counts
total **7,011**; plan 00-10 measured **5,686** over the four required sections. The 1,325-word
delta is the leads and drafting comments. Quoting either alone against the other reads as an
arithmetic error, so both are stated with the delta named.

## Open — seven confirm-or-override items

Following UI-SPEC's convention, each **proceeds as stated unless overridden**, so silence is
not neutral: **R-1** case length (500–700 words, one tier) · **R-2** the "only work+résumé
visible" reading · **R-3** route shape (`/work/{id}`) · **R-4** the canonical heights (derived,
not measured from devices in hand) · **R-5** the gutter ladder · **R-6** reflow-never-hide ·
**R-7** whether to adopt `scroll-snap` at all.

**R-2 is the one that needs a real answer**, because overriding it is a content decision about
Home rather than a layout preference.

## What this leaves for the orchestrator

- **`STATE.md` and `ROADMAP.md` are untouched** and are the orchestrator's to update.
- **Plan 00-11 remains OPEN.** Its three by-eye verdicts — 44px vs 52px Playfair header
  (G-11), the 22px `--ochre-d-strong` cross-link and its 24px fallback, the 1080px Brevo band
  cap — are unanswered, require a human eye, and sit on artefacts about to change. **No
  `00-11-SUMMARY.md` exists and none should be written until those verdicts are given.** It
  should re-run against the reworked sketches.
- **Next in the approved sequence: the admin sketches (00-12 → 00-16)**, built to this contract
  natively. Answer the `AppShell` responsive-posture question first.
- **Then the public rework**: Home's two-state landing, five case routes, the copy compression,
  and the gutter ladder applied to the existing sketches.

## Known stubs

**None.** No code was written. Every number in the contract is quoted from a committed document,
measured read-only from `.playground/src/`, or derived with the derivation and its inputs stated
inline. The seven derived height budgets in §5 are marked as derived and their sensitivity is
stated (R-4: ±10% on the canonical heights leaves the conclusions unchanged).

## Self-Check: PASSED

Created files:

- `.planning/phases/00-design-ideation/00-RESPONSIVE-CONTRACT.md` — FOUND (786 lines, 8,037 words)
- `.planning/phases/00-design-ideation/00-RESPONSIVE-SUMMARY.md` — FOUND
- `.planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md` §"Responsive direction" — FOUND (216 lines, 2,205 words), frontmatter `appended:` ledger updated

Untouched, as required:

- `.planning/STATE.md` — not in `git status` ✅
- `.planning/ROADMAP.md` — not in `git status` ✅
- `.planning/phases/00-design-ideation/00-FINDINGS.md` — not in `git status` ✅ (deliberate; see Findings)
- `.playground/` — read only, no writes ✅
- No `NN-SUMMARY.md` created for any planned plan; no `00-11-SUMMARY.md` ✅
- `.planning/config.json` shows as modified in `git status` but is the **orchestrator's**
  `_auto_chain_active` flag, not this work's — **deliberately not staged** ✅

Success criteria:

- Six-class matrix with mode + density per class resolved by **pointer type**, with the
  width-is-insufficient derivation stated as a first-class finding — ✅ §1, §2
- All seven technical constraints addressed with justification — ✅ §5.1–§5.6, §6, §2
- Home two-state behaviour specified, including its ~1.1 aspect case, reduced-motion path and
  keyboard path — ✅ §5, §5.2, §5.5, §5.6
- `00-PUBLIC-DESIGN-NOTES.md` appended with the direction, D-39's supersession and all six
  invalidations — ✅
- No code written — ✅

---

*Phase 0 · off-plan, by direct user direction, 2026-08-17.*
