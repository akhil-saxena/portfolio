---
phase: 0
status: first-pass
awaiting: akhil-edit
---

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

- one-liner: Accessible React primitives with semantic tokens — 80 components, and this page is built on them.
- card: A React component library where one token change lands across every screen at once. 80 components in 10 categories, and this site is built entirely out of them.
- badge: Live
- source: `../design-system/README.md` — "80 components across 10 categories" and the deployed Storybook at design-system-ed1.pages.dev. Badge Live because `../design-system/package.json` is at 1.11.4 and `CHANGELOG.md`'s newest entry is that same release, so work is still landing. Deliberately NOT sourced from `../design-system/.planning/PROJECT.md`, which is stale on product name, count and theming mechanism. Closes by pointing at the page the reader is on, per UI-SPEC rule 5 and D-38. (one-liner 97 · card 160)

## cairn

- one-liner: A job application tracker with no streaks, no cohort comparisons and no confetti anywhere in it.
- card: A job application tracker for a search that runs long, where restraint is the product. Its forever-no list rules out streaks, comparisons and resume scoring, and it runs on Cloudflare's free tier.
- badge: Live
- source: `../cairn/.planning/REMOVED.md` — the forever-no list verbatim ("no streaks, no cohort comparisons, no AI cover letters / resume scoring … no confetti") and its own framing that "that restraint is the product". Free-tier claim carried forward from the existing `resume.json` description. Badge Live because the site is deployed at cairn.co.in and `REMOVED.md` is the current v1 scope of record. The refusal was already this project's idea; it was tightened to budget, not replaced. (one-liner 96 · card 196)

## hued

- one-liner: Turns your camera roll into the colours you actually lived in, with no network permission.
- card: Turns your camera roll into the colours you actually lived in, by week, month or year. Palettes are clustered in CIELAB so perceptually close shades merge, and it requests no network permission.
- badge: Maintained
- source: `../hued/publishing/play-store-listing.md` — "Colors are then clustered in CIELAB color space so perceptually similar shades merge into one"; corroborated in `../hued/app/src/main/java/app/hued/processing/PoeticDescriptionMatcher.kt:111`. The network claim is `../hued/publishing/privacy-policy.md:17`, "no network permissions requested". Badge Maintained because `app/build.gradle.kts` ships versionName 1.1.0 to the Play Store and the repo carries no changelog showing continuing work — the conservative reading, per D-45. NOTE for later phases: the colour-name count is contradictory in-repo — `README.md` says 18,000+, the store listing says 31,000+, and `app/src/main/res/raw/color_names.json` actually holds 31,898 entries. The store listing is right and the README is stale; the count is left out of the copy above rather than quoted from the wrong file. (one-liner 90 · card 194)

## momentum

- one-liner: Breaks a long goal into a number for today, recomputed in a pure-Kotlin engine layer.
- card: Breaks a long-term goal into a number for today, and recalculates it when you fall behind. The target, streak and milestone maths sits in a pure-Kotlin engine layer with no Android imports.
- badge: Maintained
- source: `../Momentum/ARCHITECTURE.md` — "an engine layer of pure Kotlin business logic with zero Android dependencies", named as the key design decision, with `DailyTarget · Streak · Badge · Milestone` shown in the layer diagram as its contents. Badge Maintained because `app/build.gradle.kts` ships versionName 1.1.0 and the repo carries no changelog showing continuing work. This entry replaces the six-noun feature run outright, per D-43 rule 1: one architectural fact in place of a changelog. (one-liner 85 · card 189)

## timeshift

- one-liner: Right-click any time on a page and read it in your own zone, CST and IST disambiguated.
- card: Right-click any time written on a page and read it in your own zone. It disambiguates CST, IST and BST from surrounding context, and follows the current DST state rather than a cached offset.
- badge: Maintained
- source: `../TimeShift/README.md` — "disambiguates CST (US Central vs China), IST (India vs Israel), BST (British vs Bangladesh) using context clues" and "always shows current DST state, never stale". Badge Maintained because `manifest.json` is at version 2.2.0 on the Chrome Web Store and the repo carries no changelog showing continuing work. Already the right shape; adjusted only to fit budget and to let the disambiguation carry the fact instead of the word "smart". (one-liner 87 · card 191)
