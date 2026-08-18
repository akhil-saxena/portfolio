# Compression note — one reference draft, for the user to react to

**Off-plan.** No PLAN.md, no SUMMARY. One case study was compressed as a reference shape. The
other four are untouched. Nothing was applied to them, and nothing should be until the
judgement calls at the bottom are ruled on.

**Artefact:** `.planning/phases/00-design-ideation/00-COPY/case-design-system-COMPRESSED.md`
**Source, left untouched on disk for comparison:** `00-COPY/case-design-system.md`

---

## Word count, both measures

§7 of the responsive contract warns that two different totals are in circulation and that
quoting one against the other looks like an arithmetic error. So both are recorded:

| Measure | Source | Compressed | Cut |
|---|---|---|---|
| Whole file (`wc -w`) | 1,943 | **693** | −64% |
| Four required sections only | 1,761 | **645** | −63% |

Both land inside R-1's 500–700. The per-section split of the 645:

| Section | Words |
|---|---|
| `## Problem` | 131 |
| `## Decisions` | 265 |
| `## Outcome` | 178 |
| `## Assets` | 71 |

`node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs` → **exit 0**
(`PASS: 7 file(s) scanned, 6 [NEEDS AKHIL] marker(s), shortest placeholder block 106 words`).

---

## What was cut

**Three of six decisions.** The source carried six. Decisions 1 (semantic tone names), 2
(deprecate-and-alias), and 4 (the generated per-component CSS split) were dropped whole. This
is the single largest saving and the one most worth arguing about. The three that survived are
the three where the *cost of the alternative is a specific named defect* rather than a general
principle — contrast-as-a-test, screenshot-baselines-are-not-an-oracle, and
report-the-overclaim. The three cut were all real decisions, but their rejected alternatives
cost "API surface you can never rename" and "two sources of truth that drift", which are
arguments rather than incidents.

**The 150-word provenance lead.** The source opened with a paragraph explaining that every
claim carries a `[source:]` marker and that the repo's own `.planning/` is excluded by name.
That is meta about the study, not the study. It is now a one-line HTML comment pointing here.

**The third example everywhere it appeared.** The Problem section carried three measured
failures; it now carries two (the focus ring, and `--ink-4`). The dropped one — 28 font
declarations silently discarded because `--font-body`/`--font-display`/`--font-mono` were
never defined — was the least self-explanatory of the three. Decision 2's list of hidden
defects went from three to one (the FileInput dropzone in 13px Arial), which is the most
vivid and needs no setup.

**The Assets section, from 265 words to 71.** Three bulleted asset specs with a paragraph of
rationale each became one sentence naming all three with a clause of rationale each, plus one
sentence for the D-42 routing. Nothing was dropped — hero, both inline shots, the R2 path and
the explicit "not through the photo pipeline" all survive. Only the prose around them went.

**The `CAIRN-CONSOLIDATION.md` detail.** The source named the three undecided value-collisions
(`--ink`, `--green`, `--red`) and the v1.5.0 additive merge. The compressed version keeps the
load-bearing half — that the one documented second consumer is documented as a *plan, not a
result* — and drops the token names.

**Twelve of twenty `[source:]` markers.** See below; this was deliberate, not attrition.

---

## What was refused, and why

**Every `The option not taken:` / `What it would have cost:` pair.** All three surviving
decisions keep both halves, verbatim in that phrasing. This is CASE-01's defining requirement
and the thing that separates this study from a feature list. Verified by grep, not assumed:
`grep -c "The option not taken:"` → **3**, `grep -c "What it would have cost:"` → **3**.

One real fix came out of that check. In an intermediate draft the phrase
`**What it would have cost:**` had line-wrapped as `What it would\nhave cost:`, so a
line-oriented grep found 3 of one marker and 2 of the other — the pair was present to a reader
and invisible to the checker that plan 00-05 used to verify it. **Both marker phrases now
always start a line and are never wrapped mid-phrase.** That is a rule the other four
compressions need to inherit.

**The `[NEEDS AKHIL]` block.** Kept at paragraph scale (D-40), kept as a blockquote, and kept
*before* the closing paragraph rather than after it. All three are load-bearing:

- Plan 00-10 established that a marker inside a blockquote owns only the blockquote, while a
  marker outside one owns everything to the end of its section. The design-system study's
  closing paragraph — the one pointing at the page the reader is on — must render as ordinary
  prose, not muted-and-provisional. The long template **asserts** that. Changing the
  blockquote to a bare marker would silently re-break it.
- `check-copy-length.mjs` still counts to the next heading regardless, so the closing paragraph
  is inside the *counting* block even though it is outside the *rendering* block. It is
  therefore written digit-free, or rule 3 would fire on it. Preserved from the source.

**The closing "the page you are reading" paragraph.** Shortened, never cut. It is the one
outcome claim in the whole corpus that needs no interview, and UI-SPEC rule 5 requires it.

**Every number that survived was re-verified against shipped code this session**, not carried
forward on the source draft's word. Details below.

---

## Provenance: 8 of 20 `[source:]` markers survive

The rule applied: **every quantitative claim carries a marker; adjacent claims from the same
file share one.** At 645 words, 20 markers cost roughly 10% of the budget for repetition. Eight
is the number at which every number in the draft is still checkable.

Each surviving number was read out of a file this session — and, per the brief, out of *code*
rather than a README wherever a code source exists:

| Claim | Verified against | Result |
|---|---|---|
| version 1.11.4 | `package.json` | confirmed |
| 386-line sheet, one light + one dark scope | `src/tokens.css` (`:root` at 26, `:root.dark, .dark` at 291–292) | confirmed |
| focus ring `--amber` **2.09:1** vs 3:1 | `src/tokens.test.ts` (not the CHANGELOG) | confirmed |
| `--ink-4` at **1.96:1** in dark, ~28 places | `src/tokens.test.ts` | confirmed |
| `field-contract.test.tsx` widened to **fifteen** | the shipped test file, controls array counted | confirmed — 15 entries |
| 1.11.1 titled "…1.11.0 overclaimed", seven controls | `CHANGELOG.md` | confirmed |
| 1.11.3 baselines / two audits / three more defects | `CHANGELOG.md` | confirmed |
| axe violations **105 → 27** | `CHANGELOG.md` 1.10.0 | confirmed |
| ten categories | `src/` directory structure | confirmed |

**Two numbers changed as a result. Both were wrong in the source draft.**

1. **Test files: 115 → 118.** The source said 115, "measured in `src` and `tests`". Counting
   `*.test.ts(x)` and `*.spec.ts(x)` under both directories this session gives **118**. The
   repo has moved on — its newest commit is 1.11.4, which added test infrastructure the draft
   predates. Corrected, and the marker now reads `[counted this session]` so the next reader
   knows to recount rather than trust.

2. **"80 components" was dropped, not corrected — see the judgement calls.**

---

## Judgement calls for the user

### 1. The heading spelling is now `## Decisions` (plural), and three files must be normalised

The corpus currently spells the middle heading two ways — `## Decisions` in design-system and
Cairn, `## Decision` in hued, Momentum and TimeShift. With one tier there is one template, and
§7 is explicit that a loader assuming one spelling **silently drops a section from three of
five studies while still rendering a page**.

**Chosen: `## Decisions`, plural.** Reason: the compressed design-system study carries three
decisions, so the singular would be actively false on the flagship. Plural also reads correctly
over a section containing exactly one item, whereas singular does not read correctly over
three. The cost is that **three files change instead of two** — hued, Momentum and TimeShift
each need `## Decision` → `## Decisions` when they are compressed.

**This is reversible and costs one line each. If you prefer the singular, say so now** — after
the other four are compressed it is four files instead of three.

Separately, and regardless of which spelling wins: the loader should keep throwing when it
finds **neither**. Normalisation removes today's ambiguity; it does not remove the failure mode
if someone later types the wrong one.

### 2. "80 components" cannot be verified, and the one-liner is shipping it

This is the finding I most want ruled on, because it is not confined to the case study.

The source draft, `one-liners.md`, and the Work card description all state **80 components**,
all sourced from `README.md`. Counted this session, three sources give three answers:

| Source | Count |
|---|---|
| `README.md` line 5 (what the copy currently cites) | 80 |
| `src/` component directories across the ten categories | **81** |
| `src/OverviewPage.tsx`, the shipped in-product catalog | **79** (omits `Field` and `IconButton`) |

Nothing in the repo asserts 80. The README sits between the two shipped sources and matches
neither. This is the same failure the phase has now caught six times — a doc describing code,
rather than the code.

**What the compressed draft does:** states "ten categories at version 1.11.4" and drops the
component count entirely. Ten categories is the one figure all three sources agree on, and the
Work card that links to the study already carries a count, so the study repeating it was
redundant compression fat anyway.

**What it does not do:** touch `one-liners.md`, which is outside this task's write scope. That
file still ships `80` in both the one-liner and the card. **It needs a decision.** Note that
79, 80 and 81 are all two characters, so the D-43 budgets are unaffected whichever way it goes.

My recommendation: **81**, sourced as `src/`, because the case study's audience opens the repo
and counts directories. But `Field` and `IconButton` being absent from the product's own
catalog is a real signal that Akhil may consider them not-components, in which case 79 is
right and the Overview page is the authority. **This one needs him, not me.**

### 3. Two smaller shape changes, flagged rather than asked

- **Frontmatter:** `tier: long` removed (tiering is dead), `badge: Live` added to match hued's
  shape and the badge already recorded in `one-liners.md`. If badges are not meant to live in
  case-study frontmatter, this comes back out of all five.
- **Title:** `# Design System — case study (long form)` → `# Design System`, matching hued's
  bare `# hued`. Five studies, five bare project names.

---

## If this shape is approved, the other four are mechanical

Each of hued (923), Momentum (1,197), TimeShift (943) and Cairn (2,005) compresses to the same
four sections at the same target using the same rules: drop the meta lead to a comment, cut
decisions to those whose rejected alternative names a real incident, keep every
`The option not taken:` / `What it would have cost:` pair unwrapped and line-leading, keep the
`[NEEDS AKHIL]` block at paragraph scale, and keep one `[source:]` per claim cluster. Cairn is
the only one carrying materially more than the target and it is also, like design-system, one
of the two repos that actually record their rejected options — so it is the one where cutting
decisions will hurt most and should be done last, with this draft to measure against.
