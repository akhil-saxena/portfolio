---
phase: 0
plan: 08
subsystem: design-ideation
tags: [charcoal-theme, theme-api, cascade, tokens, fonts, packaging, dsgn-05, handoff]

requires:
  - 00-04-SUMMARY.md (theme build — 37 tokens, 54 ratios, 8-vs-73 face baseline)
  - 00-07-SUMMARY.md (cascade probe, D-33 manifest, D-35 exports shape)
  - 00-FINDINGS.md (gap register + all measured evidence)
provides:
  - 00-THEME-API.md — the charcoal theme public API decided in writing (DSGN-05)
  - Phase 1's direct implementation input for DS-01 through DS-09
  - the token contract with all 54 three-surface ratios, self-contained after .playground/ is deleted
  - the exhaustiveness invariant and the font-name check handed over as tokens.test.ts cases
  - the Phase 1 scope boundary expressed by findings ID rather than restatement
affects:
  - Phase 1 (DS-01…DS-09 implemented from this document alone)
  - Phase 06.1 (D-28 layers + D-32 density axis scoped out of Phase 1 by name)
  - Phase 5 (the D-33 manifest byte figures that supersede research's)

tech-stack:
  added: []
  patterns:
    - measured-not-asserted, with every superseded figure named rather than quietly corrected
    - findings cited by ID so two documents cannot drift
    - self-contained handoff — no number lives behind a path that gets deleted

key-files:
  created:
    - .planning/phases/00-design-ideation/00-THEME-API.md
  modified: []

decisions:
  - "Research's on-disk tokens.css figure of 14,948 B is superseded by a direct measurement of 16,007 B (src and dist agree); the bundled 65,493 B figure stands, corroborated independently by plan 07's ~65 KB token-layer split of the public route"
  - "The 81-@font-face consumer measurement is written into the font-delivery section as the reason D-36 must actually remove faces from tokens.css — without it the 8-vs-73 win reads as already banked"
  - "The five unmapped design-system surface tokens and the missing italic axis are surfaced as open Phase 1 decisions rather than resolved here, since neither has a Phase 0 measurement behind it"
  - "An intro H2 (## What this document is) was added beyond the eleven the plan names, so the provenance and self-containment rules are stated before the first decision"

metrics:
  duration: ~20 min
  completed: 2026-08-17
---

# Phase 0 Plan 08: Charcoal Theme API Document Summary

Wrote DSGN-05's deliverable — `00-THEME-API.md`, 995 lines — as a decision document carrying
every measurement plans 04 and 07 took: **the cascade decision with its specificity
arithmetic, the exhaustiveness invariant with the 136-assertions-per-run evidence that makes
it load-bearing, the complete token contract with all 54 three-surface ratios, the ownership
allowlist, and the font, packaging, release and test-handoff decisions — all of it
self-contained, so Phase 1 can implement DS-01 through DS-09 after `.playground/` no longer
exists.**

## What Was Built

| Task | Output | Commit |
|------|--------|--------|
| 1 | `00-THEME-API.md` — cascade and scoping, the exhaustiveness invariant, the token contract, the ownership boundary | `8367e63` |
| 2 | font delivery, packaging and exports, no-flash module, release and versioning, CSS assembly, tests Phase 1 inherits, open items | `54121e7` |

Eleven required H2 headings, all spelled exactly and in the specified order, plus one intro
heading. 995 lines against a 220-line floor.

## The Document's Job, and How It Was Met

The plan is explicit that this artefact **survives the playground's deletion carrying the
measurements**. That constraint drove every content decision:

- **No number lives behind a path that gets deleted.** The document contains zero
  `.playground/<path>` references (asserted by regex over every line). The playground is named
  only as historical provenance — *where this number came from* — never as somewhere to go and
  read one.
- **Every figure came from the committed SUMMARY and FINDINGS files, not from RESEARCH.md.**
  The playground is not present in this worktree, so re-deriving was impossible by
  construction, which is the right default. Where research and a Phase 0 measurement disagree,
  **the measurement is quoted and research's figure is named as superseded** rather than
  silently dropped — three times: `primitives.css` 181,861 (not 178,398), `base.css` 8,741
  (not 7,094), the 74-sheet concatenation 221,032 (not 217,569), all off by exactly 3,463 B.

## Content That Would Have Been Lost

Three findings the plan's action text does not name but which belong in a theme API document,
each written in as a full subsection (see *Deviations*, Rule 2):

**1. The 8-vs-73 font win does not survive a real consumer.** Each D-33 manifest emits **81**
`@font-face` rules — the design system's 73 plus charcoal's 8 — because the manifest must
import `tokens.css` for the values charcoal overrides. Recorded with its consequence stated
bluntly: shipping `fonts/charcoal.css` while leaving `tokens.css` unchanged adds 8 rules and
removes none, which is *strictly worse than doing nothing*. This is the load-bearing argument
for D-36 being a major, and without it the 8-vs-73 figure reads as already banked.

**2. Five design-system surface tokens have no charcoal mapping** — `--panel`, `--bg`, `--pg`,
`--paper-warm`, `--paper-deep`. A component reaching for `--panel` renders `#1c1c1c` instead of
`#1E1E1D`. This is squarely a *what a brand theme may and may not redefine* question, the
allowlist explicitly permits all five, and the document states that **leaving them unmapped is
the one outcome that is not a decision.**

**3. Option A ships no italic axis, and charcoal has two italic roles** — the 22px display
subtitle and the 22px italic serif cross-link, both rendering as browser-synthesised oblique
rather than Playfair's drawn italic. Adding `playfair-display/wght-italic.css` costs 4 rules
and moves the baseline from **8 to 12**. Plan 04 deliberately did not do it because 8 is a
recorded acceptance criterion; the document surfaces it as an open Phase 1 decision **and
states that a Phase 1 which adds it must restate every downstream comparison against 12**.

Also carried across because it is a second, independent argument for the invariant: **an
island's CSS position is decided by the component's own `import` statement, not by being an
island**, so an import sorter or lint autofix can silently flip which stylesheet wins a tie.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] research's on-disk `tokens.css` byte figure is wrong**

- **Found during:** Task 2, verifying the figures before writing them
- **Issue:** the plan's `<interfaces>` block states `tokens.css` inflates *"from 14,948 bytes
  on disk to 65,493 bytes bundled"*. Read directly, `../design-system/src/tokens.css` and
  `dist/tokens.css` both measure **16,007 bytes** — a 1,059 B discrepancy, and notably **not**
  the systematic 3,463 B delta that affects research's other CSS figures, so it is a separate
  error rather than the same one. Research also records "14-15 `@fontsource` imports"; the
  actual count is **15**. Writing 14,948 into a document whose stated purpose is to be the
  numbers Phase 1 works from would have propagated it into a published package (T-00-18).
- **Fix:** the document states 16,007 as measured, names 14,948 as superseded, and says "Use
  16,007." The **bundled** 65,493 figure is kept — it is corroborated independently and from
  the other direction by plan 07, which measured the public route at 86,593 B of CSS split
  ~65 KB token layer / ~21 KB everything else.
- **Files modified:** `00-THEME-API.md`
- **Commit:** `54121e7`

**2. [Rule 2 - Missing critical functionality] three findings added that the action text does not name**

- **Found during:** Tasks 1 and 2
- **Issue:** the plan's action text covers the decisions but not three measured findings that
  bear directly on the sections it asks for — the 81-face consumer measurement (font delivery
  and versioning), the five unmapped surface tokens (what a theme may redefine), and the
  missing italic axis (how fonts are delivered). Each is exactly the kind of result that dies
  with the playground, and the first is the reason D-36 is a major at all.
- **Fix:** written in as full subsections with their measurements, listed again under
  *Open items carried to Phase 1* so they cannot be read past.
- **Files modified:** `00-THEME-API.md`
- **Commit:** `8367e63`, `54121e7`

**3. [Rule 2 - Missing critical functionality] two of plan 04's own deviations carried into the test handoff**

- **Found during:** Task 2, writing `## Tests Phase 1 inherits`
- **Issue:** the plan lists three test families for Phase 1. Plan 04 built two additional
  guards as its own deviations, and both would have been lost at the handoff. (a) The
  **parse-guard floor** — if the block parser truncates on an indented closing brace, both
  token sets come back nearly empty, the set difference is trivially empty, and **the
  exhaustiveness check passes for the wrong reason.** (b) The **directional Rule C-1
  assertion** — `--ochre` must be asserted to *fail* the text bar on 2 of 3 dark surfaces, or
  someone quietly darkens it to make a lint pass and the fill/text distinction is silently
  lost.
- **Fix:** both handed over explicitly, each with the bug it catches, including the failure
  message plan 04 wrote for the parse guard (*"that is not a small theme, it is a truncated
  parse"*).
- **Files modified:** `00-THEME-API.md`
- **Commit:** `54121e7`

### Structural Note

**An intro H2 was added beyond the eleven the plan names.** `## What this document is` states
the self-containment rule, the provenance rule and the cite-findings-by-ID rule before the
first decision is read. A checker counting H2s will find **12**, not 11; all eleven required
headings are present, spelled exactly, and in the specified order (verified programmatically).

### Corrections Recorded Rather Than Applied

The document names three of its source documents as wrong in specific places, in writing, so a
future reader does not re-import the errors:

| Source | What is wrong | What supersedes it |
|--------|---------------|--------------------|
| PROJECT.md contrast table | *"the dark palette is clean"*; the `~#6E6A5E` muted fix | `--ochre` fails AA at 4.20 / 3.91 with elevation; `#4F4C42` / `#B1AEA8`. **Root cause: every ratio was page-only.** |
| D-30 | premise that all three families ship variable | `@fontsource-variable/ibm-plex-mono` returns npm **404** and the name is **unclaimed**. Goal survives; premise does not. Two of three. |
| RESEARCH split-CSS figures | `178398` / `41281` / `8923`, and `14,948` | 181,861 / 8,741 / 221,032 (systematic 3,463 B), and 16,007 |

## Threat Model

All four register entries are addressed by content rather than by code:

- **T-00-18** (a wrong token value shipping to two consumers) — every value and every ratio in
  the token contract is a plan 04 measurement against all three surfaces of its mode, and the
  method rule is stated at the top of the section. This is also what caught deviation 1.
- **T-00-12** (typosquat exposure via a non-existent package name) — the npm 404 is written
  into the spec, together with the part that makes it security-relevant rather than merely
  factual: **the name is unclaimed, so installing it resolves to whatever eventually claims
  it.**
- **T-00-19** (the v2.0.0 font break) — D-36 recorded with its reason and its mitigation, and
  the break is stated as *definite* rather than hedged.
- **T-00-20** (order-dependent theming reaching production) — the invariant is written as a
  testable sentence and handed over alongside the design system's existing mirror assertion,
  with an explicit table showing they catch different bugs so neither is dropped as redundant.

**T-00-SC: no package was installed.** This plan wrote one Markdown file.

## Threat Flags

None. No network endpoint, auth path, file-access pattern or trust-boundary schema was
introduced. The document contains no secret, token, binding or credential — every value in it
is a colour, a font name, a byte count or a package path, all destined to be public in a
published stylesheet.

## Known Stubs

None. No placeholder, TODO or unwired value. The three items marked open — the italic axis,
the five unmapped surface tokens, the automated-manifest scope owner — are **deliberate
undecided decisions with their tradeoffs written out**, listed under *Open items carried to
Phase 1*, and none of them blocks DSGN-05's stated deliverable.

## Self-Check: PASSED

**Files verified present:**

- `.planning/phases/00-design-ideation/00-THEME-API.md` — FOUND (995 lines)
- `.planning/phases/00-design-ideation/00-08-SUMMARY.md` — FOUND

**Commits verified:** `8367e63` and `54121e7` both present in `git log`.

**Plan `<verification>` block, all four:**

- all eleven H2 headings present, spelled exactly and in order — PASS (verified
  programmatically; one additional intro H2, noted above)
- every charcoal token hex value from both modes appears in the token contract — PASS (20/20)
- the npm-404 correction, the four Fontsource entry points and the two proposed export strings
  all appear — PASS
- `wc -l` at least 220 — PASS (995); no instruction sends a Phase 1 reader into the deleted
  playground for a number — PASS (zero `.playground/<path>` references)

**Task acceptance criteria:** 47/47 task 1 (4 headings, 3 specificity strings, 2 selectors,
20 hex values, 2 failing ochre ratios, `#6E6A5E` + 4.46, 6 colour rules, 3 prohibitions,
9 allowlist names, G-11), 24/24 task 2 (7 headings, the 404 correction, 4 entry points,
5 font-delivery figures, 2 export strings, 2 named files, v2.0.0 + `fonts/default.css`,
3 contrast tiers, the findings citation and the G-2 / G-1 / G-7 boundary, the line floor, and
the no-playground-path assertion).

**`must_haves` key_links:** `G-1[12]|AAA-1` matches (findings cited by ID, not restated);
`tokens.test.ts` matches (both invariant assertions handed over as test cases).

**Not touched, as instructed:** `STATE.md`, `ROADMAP.md`, `.playground/`,
`00-PUBLIC-DESIGN-NOTES.md`, `00-COPY/`, `../design-system/`. `git diff --name-only` against
the base commit returns exactly one path — `00-THEME-API.md` — and the working tree is clean.
