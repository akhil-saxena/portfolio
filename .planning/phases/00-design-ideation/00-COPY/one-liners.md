---
phase: 0
status: reviewed
reviewed: 2026-09-04
---

<!--
  THE CARD DESCRIPTIONS BELOW ARE AKHIL'S, WRITTEN AFTER THIS DECK'S FIRST PASS.

  This file was `status: first-pass` / `awaiting: akhil-edit`. That edit happened on 2026-09-04:
  all five `- card:` lines were rewritten directly, judged on the rendered page over four rounds,
  and the one-liner's em dash became a colon with the site-wide "no em dashes" decision. The lines
  here are updated to match what ships, so the deck is not a stale contradiction of the site.

  BUT THE CARD LINES ARE NO LONGER A COMPARISON SOURCE. `test/content/project-copy.unit.test.ts`
  compares only the ONE-LINER against this file now. Comparing the card copy would compare Akhil's
  text against a transcription of Akhil's text — it would prove the transcription, and it would put
  this file in the path of every future copy edit. The `- source:` notes below stay as PROVENANCE
  for the facts each line asserts, which is the part that still earns its keep.

  Figures are written as digits here and stored as `{{ds.*}}` tokens, which is what the token rules
  in `scripts/migrate-project-copy.mjs` exist to do. `79` is what the catalog listed when this deck
  was written; the token resolves from the installed package at build time, so the deck's digit is
  documentation and the shipped figure cannot go stale.
-->

# Project one-liners and card descriptions

First-pass replacement copy for the five projects in `data/resume.json`, written to D-43's
shape — **idea first in plain language, then one hard fact** — and to the UI-SPEC Copywriting
Contract budgets: one-liner **60–110 characters** (Home Act-2 grid, 2 lines), card description
**120–200 characters** (Work project card, 3 lines).

The hard fact in every entry is a number, a constraint or a named technique, never an
adjective. Per D-45, currency lives in the `- badge:` value only: no sentence says whether a
project is alive and none carries a date. Every `- source:` line names the file the fact was
read out of this session, so a reviewer can audit provenance rather than trust it, and closes
with the measured character counts so the budget is visible rather than asserted.

Budgets are enforced by `../scripts/check-copy-length.mjs`.

## design-system

- one-liner: Accessible React primitives with semantic tokens: 79 components, and this page is built on them.
- card: A React component library that makes it easy to build consistent interfaces. 79 accessible components across 10 categories with built-in theming.
- badge: Live
- source: `../design-system/src/OverviewPage.tsx` — the shipped catalog, parsed this session: 10 categories summing to **79** components (Inputs 23 · Overlays 10 · Data Display 11 · Feedback 7 · Interaction 7 · Surfaces 2 · Layout 4 · Display 6 · Patterns 3 · Foundation 6), and the file computes that same total itself as `TOTAL`. Storybook is deployed at design-system-ed1.pages.dev. Badge Live because `../design-system/package.json` is at 1.11.4 and `CHANGELOG.md`'s newest entry is that same release, so work is still landing. Deliberately NOT sourced from `../design-system/.planning/PROJECT.md`, which is stale on product name, count and theming mechanism. Closes by pointing at the page the reader is on, per UI-SPEC rule 5 and D-38. (one-liner 97 · card 160)
- source-note: **`README.md` was the citation here and has been retired as an authority for this figure**, per the user's ruling. It claims "80 components" and matches neither shipped artefact: the catalog lists **79**, while the ten category directories under `src/` hold **81** (Inputs is 23 in the catalog and 25 on disk). Three numbers, and the README's is the only one that is not the count of anything. The exact difference was measured this session, not inferred: the two directories present on disk and absent from the catalog are `Field` and `IconButton` — so the copy quotes the catalog, and those two are omitted deliberately rather than missed. `README.md` remains fine for prose about the library; it is not evidence for its size.

## cairn

- one-liner: A job application tracker with no streaks, no cohort comparisons and no confetti anywhere in it.
- card: Job hunting is already stressful. Cairn keeps track of where you've applied, what comes next, and what still needs attention, without turning the process into a game.
- badge: Live
- source: `../cairn/.planning/REMOVED.md` — the forever-no list verbatim ("no streaks, no cohort comparisons, no AI cover letters / resume scoring … no confetti") and its own framing that "that restraint is the product". Free-tier claim carried forward from the existing `resume.json` description. Badge Live because the site is deployed at cairn.co.in and `REMOVED.md` is the current v1 scope of record. The refusal was already this project's idea; it was tightened to budget, not replaced. (one-liner 96 · card 196)

## hued

- one-liner: Turns your camera roll into the colours you actually lived in, with no network permission.
- card: Your camera roll is a diary in colour. hued turns a month of photos into a palette that reveals the moods, places, and moments that defined it.
- badge: Maintained
- source: `../hued/publishing/play-store-listing.md` — "Colors are then clustered in CIELAB color space so perceptually similar shades merge into one"; corroborated in `../hued/app/src/main/java/app/hued/processing/PoeticDescriptionMatcher.kt:111`. The network claim is `../hued/publishing/privacy-policy.md:17`, "no network permissions requested". Badge Maintained because `app/build.gradle.kts` ships versionName 1.1.0 to the Play Store and the repo carries no changelog showing continuing work — the conservative reading, per D-45. NOTE for later phases: the colour-name count is contradictory in-repo — `README.md` says 18,000+, the store listing says 31,000+, and `app/src/main/res/raw/color_names.json` actually holds 31,898 entries. The store listing is right and the README is stale; the count is left out of the copy above rather than quoted from the wrong file. (one-liner 90 · card 194)

## momentum

- one-liner: Breaks a long goal into a number for today, recomputed in a pure-Kotlin engine layer.
- card: Turn a long-term goal into today's task. Momentum calculates the pace you need, adapts when you miss days, and keeps progress realistic instead of perfect.
- badge: Maintained
- source: `../Momentum/ARCHITECTURE.md` — "an engine layer of pure Kotlin business logic with zero Android dependencies", named as the key design decision, with `DailyTarget · Streak · Badge · Milestone` shown in the layer diagram as its contents. Badge Maintained because `app/build.gradle.kts` ships versionName 1.1.0 and the repo carries no changelog showing continuing work. This entry replaces the six-noun feature run outright, per D-43 rule 1: one architectural fact in place of a changelog. (one-liner 85 · card 189)

## timeshift

- one-liner: Right-click any time on a page and read it in your own zone, CST and IST disambiguated.
- card: Convert times across time zones directly from any webpage. Highlight a time, right-click, and instantly see it in your local zone.
- badge: Maintained
- source: `../TimeShift/README.md` — "disambiguates CST (US Central vs China), IST (India vs Israel), BST (British vs Bangladesh) using context clues" and "always shows current DST state, never stale". Badge Maintained because `manifest.json` is at version 2.2.0 on the Chrome Web Store and the repo carries no changelog showing continuing work. Already the right shape; adjusted only to fit budget and to let the disambiguation carry the fact instead of the word "smart". (one-liner 87 · card 191)
