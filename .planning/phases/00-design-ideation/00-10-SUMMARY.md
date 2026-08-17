---
phase: 0
plan: 10
subsystem: design-ideation
tags: [dsgn-02, case-studies, d-39, d-40, d-41, d-42, build-time-loader, zero-js, 68ch]

requires:
  - .playground/ harness (plan 01)
  - theme-charcoal.css + fonts-charcoal.css (plan 04)
  - manifest.css — the D-33 public CSS manifest (plan 07)
  - 00-COPY/case-design-system.md + case-cairn.md (plan 05)
  - 00-COPY/case-hued.md + case-momentum.md + case-timeshift.md (plan 06)
  - 00-COPY/one-liners.md (plan 02)
  - Public.astro + PublicNav.tsx + the contact sheet (plan 09)
provides:
  - X-case-long — one template rendering both drafted long studies
  - X-case-short — one template rendering all three drafted short studies
  - src/lib/copy.mjs — the build-time loader that reads the committed drafts in place
  - src/styles/case.css — one stylesheet for both tiers, which is what makes the split structural
  - 00-PUBLIC-DESIGN-NOTES.md §Case-study templates — the committed record
affects:
  - Phase 5 (PUB-02 inherits two rendered templates, a measure, and a per-study asset plan)
  - Phase 6 (the copy pass now has a defined shape: two mechanical strips and one interview)
  - Phase 1 (two more design-system findings; Heading's line-height binding now has four overriding artefacts)
  - Phase 0 plans 11 (eye review), 16 (contact sheet Parts 2-3), 17 (screenshots)

tech-stack:
  added: []
  patterns:
    - read the committed source in place at build time, never duplicate it into the playground
    - one stylesheet for two templates, so a tier split cannot become a brand split
    - declare a derived number as a literal in each artefact, then assert the artefacts agree
    - a render boundary that deliberately differs from a counting boundary, asserted where it matters
    - reserve the slot at the intended ratio rather than render an asset that has not taken its real path

key-files:
  created:
    - .playground/src/lib/copy.mjs (gitignored)
    - .playground/src/styles/case.css (gitignored)
    - .playground/src/components/CaseSpans.astro (gitignored)
    - .playground/src/components/CaseProse.astro (gitignored)
    - .playground/src/components/CaseSection.astro (gitignored)
    - .playground/src/components/CaseHeader.astro (gitignored)
    - .playground/src/components/CaseFigure.astro (gitignored)
    - .playground/src/components/CaseChrome.astro (gitignored)
    - .playground/src/pages/case/long.astro (gitignored)
    - .playground/src/pages/case/short.astro (gitignored)
  modified:
    - .planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md
    - .playground/src/pages/index.astro (gitignored)

decisions:
  - "The D-39 tier split is enforced by construction rather than by convention: both tiers share one loader, one stylesheet, one component set and one 68ch measure, so the difference can only be structural"
  - "The short form's spacing is deliberately NOT tightened, because plan 11 has to judge whether it reads as a deliberate tier and a rhythm change would confound that answer"
  - "A [NEEDS AKHIL] block opened inside a block quote is scoped to that block quote, deliberately diverging from check-copy-length.mjs's counting boundary, so the design-system study's page-pointing closing does not render as provisional"
  - "No figure renders an image, including the two that exist: none of the eleven assets has taken D-42's path, four exist in no repository, and rendering one study's for real would make the tiers look different for a reason unrelated to the tier"
  - "The gap block's hairline is --wire (3.72:1), not the --rule the plan suggested (1.43:1 on dark), because the treatment's stated purpose is that the block reads as provisional"
  - "Body prose is tone=\"secondary\" (--ink-2, 10.51:1) rather than --ink, because 1,700 words of 14.65:1 on a dark field is glaring; UI-SPEC specifies size and leading for case-study prose but not tone"

metrics:
  duration: ~35 min
  completed: 2026-08-17
---

# Phase 0 Plan 10: The Two Case-Study Templates Summary

Built the long-form and short-form case-study templates and rendered **all five drafted
studies — 5,686 words and 57 provenance markers — through two templates**, reading the
committed Markdown **in place** at build time so the sketch and the draft cannot drift. The
D-39 tier split is enforced by construction rather than asserted: both tiers share one loader,
one stylesheet, one component set and one 68ch measure, so the only thing that *can* differ is
structure. Zero framework JavaScript on both, on **14 static routes**.

## What Was Built

| Task | Output | Commit |
|------|--------|--------|
| 1 | `src/lib/copy.mjs`, `src/styles/case.css`, five `Case*.astro` components, `src/pages/case/long.astro` | *(no commit — gitignored)* |
| 2 | `src/pages/case/short.astro`, contact-sheet registration, `00-PUBLIC-DESIGN-NOTES.md` §Case-study templates | `6542a50` |

**Task 1 produced no commit by design.** Every file it creates lives inside `.playground/`,
which plan 01 gitignored. That is the D-02 fence working as specified — `git status` was clean
of playground paths after it. Same precedent as plan 01 task 2, plan 04 tasks 1–2, plan 07
tasks 1–2 and plan 09 tasks 1–2. The durable output is the design notes committed by task 2,
plus the screenshots plan 17 takes before deletion.

## The Artefacts

| ID | Route | What it proves |
|----|-------|----------------|
| `X-case-long` | `/case/long` | One template carries **both** drafted long studies — a six-entry decisions register, a paragraph-scale gap block and three reserved figure slots — at 68ch, for two independently written ~1,700-word documents, without the measure breaking down. |
| `X-case-short` | `/case/short` | The short tier is **one template, not three**. hued, Momentum and TimeShift render through the identical composition, differing in exactly three structural ways. |

## The Measurements

**Every word on both pages is the committed first-pass draft.** Nothing is lorem and nothing
is a six-word stub, which is DSGN-02's success criterion in the terms it is written in.
Measured at build time by `copy.mjs` over the four required sections of each draft:

| Study | Tier | Words | Sourced claims | Longest section |
|-------|------|------:|---------------:|-----------------|
| Design System | long | 1,699 | 18 | `## Decisions` — 794 |
| Cairn | long | 1,764 | 22 | `## Decisions` — **1,016** |
| Momentum | short | 822 | 6 | `## Decision` — 296 |
| TimeShift | short | 703 | 6 | `## Decision` — 233 |
| hued | short | 698 | 5 | `## Decision` — 243 |

**5,686 words · 57 provenance markers · 5 gap blocks · 11 reserved asset slots.**

**The tier split is visible in the built HTML, not just in the source.** `/case/long/` emits
13 register entries and 12 inset "option not taken" paragraphs; `/case/short/` emits **zero of
each**, because those constructions do not occur in the short drafts. Both emit the same
four-part rail spine, the same gap treatment and the same figure treatment.

**Zero framework JS holds.** `check-no-js.sh` PASSes on **14 static routes**, up from 12, with
no widening of its exclusion list. Two new routes, seven new files, zero hydration directives —
asserted per file.

**The five pre-existing checks are undisturbed.** `check-no-ivory.sh`,
`check-theme-exhaustive.mjs`, `check-font-names.mjs`, `check-contrast.mjs` and
`check-css-size.mjs` all exit 0. `check-bundle.mjs` still exits 1, which remains the recorded
G-15 finding rather than breakage. `check-copy-length.mjs` still exits 0 with exactly the same
readout it had before this plan: *6 files, 5 markers, shortest placeholder block 106 words*.

### Negative controls, all three biting

| Control | Applied | Result |
|---------|---------|--------|
| Missing required heading | `## Outcome` deleted from `case-cairn.md` | build exits 1, naming the file, the heading, the headings found, and the fact that the two tiers spell the middle heading differently. Restore verified **byte-identical** (SHA-256 match, `git status` clean). |
| Heading present, nothing under it | a synthetic study whose `## Outcome` holds only an HTML comment | throws — *"carries the heading but nothing parsed under it — 1 block(s), all drafting notes"*. This is the failure a truthy check on `sections[h]` would pass. |
| Tier mismatch, both directions | `case-timeshift` rendered as `long`; `case-cairn` rendered as `short` | both throw, naming the declared tier and the template |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] the gap blocks rendered at exactly the same colour as the prose around them**

- **Found during:** Task 1, inspecting the built HTML rather than trusting the stylesheet
- **Issue:** the muting was written as `.case-gap .ds-atom-text { color: var(--ink-3) }` and it
  did nothing at all. `Text` inlines its variant's colour **whenever the `tone` prop is
  absent**, and an inline style beats a stylesheet — so every gap block rendered at `--ink-2`,
  identical to finished prose, while a rule that looked correct sat in the sheet. The treatment
  whose entire job is to read as provisional was invisible.
- **Fix:** pass `tone="muted"`, which routes the colour through the data-attribute path — the
  design system's own preferred API and the only one a wrapping class can reach. The dead rule
  was replaced with a comment recording why there is no colour rule there.
- **Files modified:** `.playground/src/components/CaseProse.astro`, `.playground/src/styles/case.css`
- **Commit:** none (gitignored). Recorded as a design-system finding in the notes.

**2. [Rule 2 - Missing critical functionality] the corpus path appeared only in a comment**

- **Found during:** Task 1, checking the acceptance criteria
- **Issue:** `CORPUS_REL` was assembled with `join(".planning", "phases", …)`, so the path the
  module actually reads appeared nowhere in the module's source — the only place a reader or a
  grep could find it was a comment. That is the inverse of the defect plans 01, 04, 07 and 09
  each hit: a comment satisfying a check the code does not.
- **Fix:** one literal, in the code, with the reasoning written above it.
- **Files modified:** `.playground/src/lib/copy.mjs`
- **Commit:** none (gitignored)

### Corrections to the Plan's Own Content

**3. Gap blocks are FILLED, not stripped**

The plan asks for "the decision that gap blocks render visibly during design review **and are
stripped in Phase 6**". They are not stripped — they are *filled*, by the D-40 interview
deferred to the final phase. It is the `[source:]` markers and the drafting comments that are
stripped, which is what the plan's own earlier paragraph says. The distinction decides what
Phase 6's copy pass actually is: **two mechanical deletions and one interview, not three
deletions.** Recorded that way in the notes and in the on-page legend.

**4. The plan's suggested `--rule` for the gap hairline would be nearly invisible**

The plan offers "a left hairline in `--rule`" as an example treatment. On charcoal dark
`--rule` is **1.43:1** against the page, so a gap block behind it would not read as marked at
all — defeating the treatment's stated purpose. The gap rule is **`--wire` (3.72:1)**, per
resolution 3's rule that on dark a boundary carrying meaning must be drawn by a border that
draws. `--rule` is still used, correctly, for the section dividers and for the inset on the
"option not taken" paragraphs — resolution 6's case. **Both are on the same page on purpose**,
so the difference between the two values is visible in one glance.

**5. The short template's rhythm is not tightened, and that is the point**

The plan permits "a shorter overall rhythm" for the short tier. Taken literally that means a
spacing change, and it was not made. Plan 11 has to answer whether the short form reads as a
deliberate tier or as a truncated long form; if the spacing differed too, a reviewer could not
tell whether their answer was about the tier or about the gap. Same attributability argument
that split `X-work-recolour` from `X-work` and that D-28 used to move cascade layers out of
Phase 1. The short pages *are* shorter — 698–822 words against 1,699–1,764 — for the only
reason they should be.

### Design Decisions Taken Beyond the Plan

**6. The render boundary for a gap block deliberately differs from the counter's.**
`check-copy-length.mjs` measures a block as everything from the marker to the next heading —
right for a length floor, generous, safe. Applied to *rendering* it would swallow the
design-system study's closing paragraph, the one that points at the page the reader is on, and
render it muted and labelled provisional: a false statement about the only claim in the corpus
that is already true. So a marker inside a block quote owns the block quote; a marker outside
one owns everything to the end of its section. Four of five studies are unaffected. The long
template **asserts** the consequence — that the design-system `## Outcome` still ends with that
paragraph as ordinary prose — so the boundary cannot change underneath it silently. This is
the plan's explicit instruction not to truncate that closing, turned into a build failure.

**7. No figure renders an image.** Three reasons, in the notes. The short version: not one of
the eleven assets has been through D-42's R2 path, four exist in no repository, and rendering
hued's two for real while the other nine stayed reserved would make one study look different
from the rest for a reason unrelated to the design — the exact confound a tier review must not
carry. Every slot reserves space at its intended aspect ratio and states its role, its source
and whether the file exists.

**8. The page is 980px with a 200px mono rail at a 48px gap**, taken from `Resume.dc.html` —
the only long-scroll editorial page in the handoff and the plan's stated reference for measure
and heading rhythm. The rail carries the section's position in the four-part spine and its
**real word count**, not the section name: that makes problem → decisions → outcome a property
of the rendered page without a table of contents, and puts the length beside the layout it is
testing. Same argument the contact sheet's Part 4 makes for the byte counts.

**9. A CSS-only review toggle**, one checkbox and one `:has()` selector, no script and no
hydration. It hides the provenance markers and the drafting notes and deliberately does **not**
hide the gap blocks. It exists because one of plan 11's questions — whether the scaffolding is
legible enough to audit without dominating the page — cannot be answered by looking once.
Fenced inside the review band and labelled as not part of the design.

**10. Body prose is `tone="secondary"`.** UI-SPEC specifies family, size and line height for
case-study prose and does not specify a tone. `--ink` at 14.65:1 is the display ink and 1,700
words of it on a dark field is glaring; `--ink-2` at 10.51:1 is still AAA. Listed for the eye
review.

### Supply Chain

**No package was installed.** This plan composes components already present from plan 01 and
adds no dependency, no script and no fixture package. `package.json` and `package-lock.json`
are untouched. T-00-SC is not applicable and holds trivially.

## Observations Not Recorded as Findings

Following plans 01, 04, 07 and 09: this phase measures against a fixed sixteen-row register, so
real gaps found outside those rows are flagged here and in `00-PUBLIC-DESIGN-NOTES.md` rather
than added as untriaged rows outside Phase 1's tier-pull contract. **Two are new.**

**1. A design-system `Text` cannot be recoloured by the page that contains it.** `Text` inlines
its variant's colour whenever `tone` is absent, and an inline style outranks a stylesheet — so
a wrapper class can style everything about a Text except the one property a wrapper usually
wants. It can only be *told its tone*. Same family as G-2 (Button's inline padding, off the 4px
grid by design and unreachable by the cascade) and plan 09's observation 3 (Badge is entirely
inline-styled with no CSS class at all). Worth knowing before Phase 5 tries to theme a
component from its container.

**2. `Heading`'s line-height binding now has four artefacts overriding it.** Plan 09 recorded
that `data-size="3xl"` and `"4xl"` both carry `--lh-tight` 0.94 while UI-SPEC assigns
`--lh-snug` 1.08 at 40–44px. These templates use `4xl` for the page header, `3xl` for every
section heading and `xl` for every register entry, and all three carry an inline override. Four
artefacts overriding one binding promotes it from an observation to something Phase 1 should
fix: size and line-height cannot be chosen independently through the declarative path.

**Carried, not re-litigated:** every accent on both pages reaches the charcoal token by name
rather than through `tone="accent"`, because the tone axis resolves to `--amber-d` and charcoal
never redeclares it (plan 09's finding 5). Neither template uses `Card` or `Chip`, so the
boundary collapse (finding 6) does not bite here — the figure slots are dashed `--wire` rules,
because a placeholder should look like a placeholder rather than like a card.

## Known Stubs

None that block DSGN-02. Two deliberate scope boundaries, both labelled in the artefact itself:

- **The eleven figure slots are reserved rather than filled**, each stating its role, its
  intended aspect ratio, where the capture has to come from, and whether the file exists in a
  repository today. This is decision 7 above, argued in the notes, not an omission — and the
  slots are the thing that answers D-41's actual question. Resolved when the admin's D-42
  upload path exists (Phase 4/5) and the four uncaptured images are taken.
- **The `[NEEDS AKHIL]` blocks are unfilled by design.** D-40 defers the interview that fills
  them to the final phase and requires them to be length-realistic in the meantime, which is
  the property these templates were laid out against. Filling them here would have been
  inventing motivation and outcome, which D-40 forbids in as many words.

## Threat Flags

None. No network endpoint, auth path, binding or trust-boundary schema was introduced. Both
pages are static, with no user input, no session and no credential. Four register entries are
worth confirming positively rather than by silence:

- **T-00-24 holds and is the substance of this plan.** Provisional prose cannot be mistaken for
  final: gap blocks render at paragraph scale with the literal marker kept inside the prose, and
  every provenance marker and drafting comment renders visibly and is labelled. The notes state
  which of the three Phase 6 strips and which it fills.
- **T-00-25 holds by construction.** `copy.mjs` reads the Markdown in place from the committed
  phase directory and writes nothing — verified: it imports only `existsSync` and `readFileSync`
  from `node:fs`, and there is zero occurrence of any write call in the file. There is no
  duplicated copy to fall out of date, and a structural divergence fails the build.
- **T-00-08 holds.** All 57 `[source:]` markers render on the page, so provenance is auditable
  where the claim is rather than in a file the reviewer has to open separately.
- **T-00-23 holds.** Zero hydration directives across all ten new and modified playground files,
  asserted per file, gated by `check-no-js.sh` on 14 routes.
- **T-00-04 holds.** `.playground/` is gitignored; the only committed output of this plan is the
  appended section of `00-PUBLIC-DESIGN-NOTES.md` and this summary.

## Self-Check: PASSED

**Files verified present:**

- `.planning/phases/00-design-ideation/00-PUBLIC-DESIGN-NOTES.md` — FOUND (730 lines, was 389)
- `.planning/phases/00-design-ideation/00-10-SUMMARY.md` — FOUND
- All ten playground artefacts listed in `key-files` — FOUND (gitignored, on disk only)
- `.playground/dist/case/long/index.html` — FOUND (61,445 bytes)
- `.playground/dist/case/short/index.html` — FOUND (49,592 bytes)

**Commit verified:** `6542a50` present in `git log`. No file deletions in it.

**Plan `<verification>` block, all four:**

- `npx astro build` exits 0 (17 pages) and `bash check-no-js.sh` exits 0 (14 routes) — PASS
- Both `dist/case/long/index.html` and `dist/case/short/index.html` exist — PASS
- All five project names render, gap blocks are visible, both templates share one loader —
  PASS (`grep -l 'lib/copy'` lists both page files; `NEEDS AKHIL` appears 3× on long and 4× on
  short; `[source:` appears 46× on long and 18× on short)
- `00-PUBLIC-DESIGN-NOTES.md` carries `## Case-study templates` with the 68ch derivation and
  the D-42 photo-pipeline exclusion — PASS

**Task acceptance criteria:** 9/9 task 1, 8/8 task 2.

**Playground left intact for downstream plans (11–17):** `astro build` 17 pages exit 0;
`check-no-js.sh` PASS on 14 static routes; `check-no-ivory.sh`, `check-theme-exhaustive.mjs`,
`check-font-names.mjs`, `check-contrast.mjs` and `check-css-size.mjs` all exit 0;
`check-bundle.mjs` exits 1, which remains the recorded G-15 finding; `check-copy-length.mjs`
exits 0 with an unchanged readout. D-02 fence holds — no adapter, no wrangler, no vitest, no
`src/pages/api`, no root `package.json`, and no package was installed.

**Not touched, as instructed:** `STATE.md`, `ROADMAP.md`, `00-THEME-API.md`, `00-FINDINGS.md`,
`.planning/config.json`, `../design-system/`. `00-COPY/` was touched only by the negative
control and restored byte-identically, confirmed by SHA-256 and by a clean `git status` on the
directory.
