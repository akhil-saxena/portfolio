# 00-17 — Capture, review, and retire the playground

**Status:** COMPLETE. All six review passes walked with Akhil on 2026-08-22, verdicts recorded,
`.playground/` deleted. **Phase 0 closes at 25/25.**

## The six passes

| Pass | Verdict |
|---|---|
| **1 · Coverage table** | **UNVERIFIED — recorded as such, not as passed.** Akhil could not judge it from the table alone. Resolved incidentally: the one `n/a` reason put to the test — *"`/admin/site` has no async load"* — belongs to a screen **cut from the admin the same day** (see ADR-002), so the claim is moot. The table stands as a record of what was sketched; it is not evidence that a skipped state was deliberately skipped. A later phase should not lean on it. |
| **2 · Seven `S-` screens** | **SCOPE CHANGE, not a defect.** Rather than a per-screen verdict, this pass produced a revision of what the admin is: dashboard, home, photos, **résumé** and a **projects list**, with **case-study authoring** (`/admin/projects/cairn`) and **`/admin/site`** removed. Recorded as **ADR-002**, superseding ADR-001. |
| **3 · Five `E-` empty states** | **PASS.** Each states what is missing *and* what to do about it, and an empty filter result is distinguishable from an empty dataset — the confusion that makes an operator think the filter is broken. |
| **4 · Eight `T-` treatments** | **FAIL on the error treatments.** They blur together. Fix specified below. The `dirty` half was not reported as broken. |
| **5 · Nine `O-` overlays** | **PASS on the question that matters, verified structurally.** See below. |
| **6 · Four `P-` phone + two `R-` refusals** | **PASS.** The four phone capabilities read as complete tasks rather than teasers ending in "open on desktop", and both refusals read as deliberate design. |

## Pass 5 — D-16, answered

`/admin/conflict-diff/` was checked **structurally** rather than by eye, because *"can you resolve one
file without abandoning another"* is a question about mechanism, not taste. The rendered screen
carries **per-file `Reload` / `Overwrite` controls across all five conflicted files** (7 and 6
instances respectively) and **zero** global `Resolve all` / `Apply all` / `Reload all` affordance.

So the all-or-nothing dead end D-16 exists to prevent **is not present**, and per-file resolution is
expressed. This is the largest single surface in the admin and the one with **zero design-system
coverage (G-7)**, so having its central question answered before Phase 7 builds it is the point of
the whole gate.

Recorded honestly: this is a **structural** verification. Whether the diff is *legible* at a glance
remains unjudged — Akhil delegated the call and that half cannot be delegated to a DOM query.

## Pass 4 — the error treatments, and the fix

The three treatments were reported as blurring together. That is the defect with the highest real
cost in the set: **mistaking a transport failure for a validation failure means editing your data
when the network was the problem.**

**Chosen fix: separate them by the action each demands, not by severity.**

| Treatment | Leads with | Tone | Never says |
|---|---|---|---|
| **Incomplete draft** (D-18 lenient) | what remains — *"3 fields left before publish"*, naming them | neutral, **no red** | anything implying rejection |
| **Validation** | *"fix this value"*, anchored to the offending field | red, field-anchored | anything implying the transport failed |
| **Transport** | **`[ Retry ]`**, plus *"your edits are safe"* | amber | anything blaming your data |

Distinguishable by **affordance**, so the right action is inferable without parsing colour — which
also means it survives for anyone who does not parse colour at all. Colour and icon differences alone
were rejected as insufficient: they would not stop the edit-when-you-should-retry mistake.

This preserves D-18's lenient-draft distinction rather than collapsing incomplete into invalid.
Phase 7 builds three treatments, not two.

**Note for Phase 1 / 06.1:** the publish-block summary needs to deep-link to the offending screen,
which is **G-6** — closed by plan 01-11, so the anchor mechanism now exists.

## The deletion

`.playground/` is gone, and this time the deletion is **reversible** — a mid-phase decision preserved
the sketches on the `playground/phase-0-sketches` branch before this gate ran. Four safety nets were
verified immediately beforehand:

- **113 playground files on the branch**, and the branch is **present on `origin`**
- **88 screenshots tracked** in `screenshots/`
- **11 measurement scripts** tracked under `scripts/playground-measurements/`
- **6 theme-prototype files** tracked under `theme-prototype/`

To restore: `git checkout playground/phase-0-sketches -- .playground` (then `npm install` inside it).

**D-02's fence, restated.** The fence existed so the playground could not become the Phase 2
foundation. Phase 2 is **complete** — built from scratch, deployed to `preview.akhilsaxena.com`, and
its auth gate proven by five 401s observed with the edge layer removed. The contamination the fence
guarded against can no longer occur. What remains of it is intact: `main` tracks **zero** playground
files and `.gitignore` still fences the directory, so nothing can drift into the rebuild. The gate's
history assertion was rescoped from all refs to `main` accordingly, with the override documented in
the plan.

## What survives

| Artefact | Consumed by |
|---|---|
| `screenshots/` — 88 PNGs | the permanent visual record; Phase 5, 6 and 7 read it |
| `00-FINDINGS.md` | Phase 1 and 06.1 — the design-system gap register |
| `00-ADMIN-IA.md` | Phase 7 — the field catalog, now amended by ADR-002 |
| `00-PUBLIC-DESIGN-NOTES.md` | Phase 5 — including the confirmed 68ch measure and the respecified Act-2 grid |
| `00-COPY/*.md` | Phase 6 — still `awaiting: akhil-edit` by decision; gap blocks are too long and `[source:]` claims unverified |
| `00-RESPONSIVE-CONTRACT.md` | Phase 5 and 7 — the six-class matrix |
| `00-THEME-API.md` | Phase 1 — the charcoal public API |
| `scripts/playground-measurements/` — 11 scripts | Phase 1's DS-09 bundle gate and Phase 5's budget |
| `theme-prototype/` — 6 CSS files | Phase 1 |
| `playground/phase-0-sketches` branch | nothing by design — the recovery path only |

## Carried forward as work, not as open review

- **`[NEEDS AKHIL]` gap blocks are too long** — shorten to realistic finished lengths when Phase 6
  writes the real copy.
- **`[source:]` claims unverified** — must resurface before Phase 6 consumes the copy. The corpus has
  already caught one self-contradiction unaided (hued's colour-name count: 18,000+ in its README,
  31,000+ in its store listing, **31,898** in the actual JSON).
- **The coverage table is unverified** — do not treat it as proof a state was deliberately skipped.
- **Error treatments** — three, separated by affordance, per the table above.
</content>
</invoke>
