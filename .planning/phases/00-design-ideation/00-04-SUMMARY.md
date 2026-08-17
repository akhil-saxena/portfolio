---
phase: 0
plan: 04
subsystem: design-ideation
tags: [charcoal-theme, tokens, cascade, contrast, fonts, dsgn-05, measurement]

requires:
  - .playground/ harness (plan 01)
provides:
  - charcoal token contract as running CSS (theme-charcoal.css, light + dark)
  - D-29 font split as running CSS (fonts-charcoal.css, faces only)
  - check-theme-exhaustive.mjs — the cascade order-independence invariant
  - check-font-names.mjs — token family vs. face family agreement
  - check-contrast.mjs — three-surface WCAG gate at tiered bars
  - AAA-1 and G-11 evidence in 00-FINDINGS.md
  - the 8-vs-73 @font-face baseline
affects:
  - Phase 1 (DS-01/02/03 implementation target; three scripts become tokens.test.ts cases)
  - Phase 0 plans 05-16 (every sketch imports these two stylesheets)
  - Phase 07 (cascade probe consumes the two blocks as constructed)

tech-stack:
  added:
    - "@fontsource-variable/playfair-display 5.3.0"
    - "@fontsource-variable/dm-sans 5.3.0"
    - "@fontsource/ibm-plex-mono 5.3.0 (static — no variable build exists)"
  patterns:
    - exhaustive dark block (cascade order-independence by construction)
    - tokens/faces split as two files (D-29)
    - ported-not-hand-rolled WCAG helpers
    - grep-as-acceptance, so prose in a comment can fail a check

key-files:
  created:
    - .playground/src/styles/theme-charcoal.css (gitignored)
    - .playground/src/styles/fonts-charcoal.css (gitignored)
    - .playground/src/pages/probe/tokens.astro (gitignored)
    - .playground/check-theme-exhaustive.mjs (gitignored)
    - .playground/check-font-names.mjs (gitignored)
    - .playground/check-contrast.mjs (gitignored)
  modified:
    - .planning/phases/00-design-ideation/00-FINDINGS.md
    - .playground/package.json (gitignored)

decisions:
  - "--ink-4, --page-bg, --paper, --panel2, --rule-s, --weight-extrabold and --weight-black are declared as var() aliases rather than duplicated literals — the design system's own pattern, and the invariant binds an alias exactly as it binds a value"
  - "--shadow-1/2/3 are declared in BOTH blocks, light restating the design system's values verbatim, so the theme is exhaustive in both directions and not only the one the invariant checks"
  - "Hex literals are uppercase to match UI-SPEC's tables verbatim, against the design system's lowercase convention"
  - "check-*.mjs resolve paths from import.meta.url rather than cwd, so they cannot silently read nothing when run from elsewhere"

metrics:
  duration: ~14 min
  completed: 2026-08-17
---

# Phase 0 Plan 04: Charcoal Theme Prototype & DSGN-05 Invariants Summary

Built the charcoal token contract as running CSS in the playground — 37 tokens, light and
dark, tokens and faces in separate files per D-29 — and stood up three static checks that
turn DSGN-05 from an assertion into a tested specification: **the cascade is now
order-independent by construction (37/37 tokens restated), the face layer is 8 rules against
the design system's 73, and every foreground token clears its tiered bar on all three
surfaces of both modes with all 54 ratios reproducing UI-SPEC exactly.**

## What Was Built

| Task | Output | Commit |
|------|--------|--------|
| 1 | 3 Fontsource packages, `theme-charcoal.css`, `fonts-charcoal.css`, `probe/tokens.astro` | *(no commit — gitignored)* |
| 2 | `check-theme-exhaustive.mjs`, `check-font-names.mjs` | *(no commit — gitignored)* |
| 3 | `check-contrast.mjs`, AAA-1 + G-11 + font-baseline evidence | `<pending>` |

**Tasks 1 and 2 produced no commit by design.** Every file they create lives inside
`.playground/`, which plan 01 gitignored. That is the D-02 fence working as specified, not a
skipped step — `git status` was clean of playground paths after each. Their durable output is
the evidence transcribed into `00-FINDINGS.md` by task 3. Same precedent as plan 01 task 2.

## The Measurements

**Exhaustiveness — HOLDS, 37/37.** `check-theme-exhaustive.mjs` reports every one of the 37
properties declared in `:root[data-brand="charcoal"]` restated in
`:root[data-brand="charcoal"].dark`, and the reverse direction too. The reverse is the design
system's own `tokens.test.ts` assertion; PATTERNS asks for both because they catch different
bugs, so charcoal was authored to satisfy both from the start rather than only the one this
plan's check enforces.

**Contrast — HOLDS at the tiered bars, 54 ratios, zero deviations from UI-SPEC.** Every ratio
the script computed matches UI-SPEC §Color's tables to two decimal places, in both modes and
on all three surfaces. The binding constraint in both modes is the panel (`--cream-3`), which
is precisely the surface a page-only measurement never sees:

| Tier | Tokens | Tightest measured (mode / surface) |
|------|--------|-----------------------------------|
| 7:1 AAA | `--ink-3`, `--ink-4`, `--ochre-d-strong` | **7.01** (dark `--ochre-d-strong` on panel) |
| 4.5:1 AA | `--ink`, `--ink-2`, `--ochre-d` | **4.86** (light `--ochre-d` on panel) |
| 3:1 SC 1.4.11 | `--wire`, `--focus` | **3.20** (both modes, `--wire` on panel) |

**Rule C-1 holds directionally.** `--ochre` `#B0722A` fails the 4.5:1 text bar on **2 of 3**
dark surfaces (4.20 paper, 3.91 panel) and passes only on the page at 4.56 — which is exactly
the "dark mode is already clean" claim, and exactly why it does not survive elevation. The
check asserts that failure, so darkening `--ochre` to make a lint pass now breaks the build.

**Font split — HOLDS, 8 against 73.** Counted twice independently, by grep on the emitted
chunk and by `check-font-names.mjs` parsing the installed packages. Asset trees from one
build that loads both layers: charcoal **10 files / 200864 B**, design system **128 files /
2174132 B**.

**All three negative controls bite.** Each was applied to a backed-up copy and the file
verified byte-identical after restore:

| Control | Applied | Result |
|---------|---------|--------|
| Exhaustiveness | delete `--ochre-d-strong` from the dark block | exit 1, names `--ochre-d-strong`, message contains `(0,2,0)` |
| Font names | strip `Variable` from `--font-serif`'s head | exit 1, names `--font-serif` **and the three aliases that resolve through it** |
| Contrast | light `--ink-3` → `#6E6A5E` | exit 1, 6 assertions fail at 4.79 / 5.14 / **4.46** — reproduces D-47 |

The font-name control is worth reading twice: breaking one token surfaced four
(`--font-serif`, `--font-display`, `--display`, `--serif`), because the check follows `var()`
aliases. A per-token check that did not resolve aliases would have reported one failure and
left three tokens silently rendering Georgia.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `--shadow-1/2/3` declared in the light block too**

- **Found during:** Task 1
- **Issue:** the plan specifies the three shadow restatements only in the dark block (Rule
  C-5). That satisfies this plan's invariant, which is one-directional (light ⊆ dark) — but
  it violates the *other* direction, the assertion the design system's `tokens.test.ts`
  already ships, and PATTERNS explicitly says both belong in the Phase 1 handoff *"because
  they catch different bugs"*. A dark-only property is the `--rule-strong` regression the
  design system's own comment records.
- **Fix:** light restates the design system's black-alpha values verbatim (correct on a cream
  page) with a comment saying why it is a restatement and not a change. The theme is now
  exhaustive in both directions, and `check-theme-exhaustive.mjs` asserts both.
- **Files modified:** `.playground/src/styles/theme-charcoal.css`
- **Commit:** none (gitignored)

**2. [Rule 2 - Missing critical functionality] the exhaustiveness check guards its own parse**

- **Found during:** Task 2
- **Issue:** RESEARCH's finished script diffs two sets. If `block()` truncates — an indented
  closing brace, a nested rule — both sets come back nearly empty and the diff is trivially
  empty, so the check **passes for the wrong reason**. UI-SPEC calls the block formatting
  load-bearing precisely because of this, but nothing was asserting it.
- **Fix:** a floor assertion (the light block must parse to ≥ 25 properties) that fails with
  "that is not a small theme, it is a truncated parse". Also added the reverse-direction
  check described in deviation 1.
- **Files modified:** `.playground/check-theme-exhaustive.mjs`
- **Commit:** none (gitignored)

**3. [Rule 1 - Bug] dead branch in the contrast script's `--ochre` reporting line**

- **Found during:** Task 3 self-review
- **Issue:** `ratio >= 4.5 ? "—" : "—"` — both branches identical, a leftover that implied a
  verdict was being computed for a token the script deliberately does not gate.
- **Fix:** replaced with the literal. `--ochre` is printed for context and asserted only by
  the directional Rule C-1 check below it.
- **Files modified:** `.playground/check-contrast.mjs`
- **Commit:** none (gitignored)

### Corrections to the Plan's Own Content

**4. [Rule 3 - Blocking] the `@import` / `@font-face` acceptance greps read comments as code**

Three of task 1's acceptance criteria are plain counts over the source:
`grep -c '@import' theme-charcoal.css` must be `0`, `grep -c '@import' fonts-charcoal.css`
must be exactly `4`, and `grep -c 'ochre-d-strong' theme-charcoal.css` must be exactly `2`.
None can distinguish a rule from prose describing a rule. A file-header comment explaining
*why* the token layer carries no face rules would have failed the check it was explaining —
the same class of defect plan 01 hit with `client:` in `probe/static.astro`.

Resolved by writing around it rather than loosening the checks: both files say "face rule",
"at-rule inclusion" and "the strong accent step" where they mean the literal tokens, and both
carry an explicit **EDITING THIS FILE** paragraph naming each grep so the next author does not
rediscover this by breaking it. Recording it here because it is now a *convention* for every
`.playground` stylesheet in this phase, not a one-off.

**5. `@fontsource-variable/ibm-plex-mono` — confirmed absent, and the reason matters**

The plan says do not attempt it. Confirmed independently: only `@fontsource/ibm-plex-mono`
(static) exists, which is why the face layer needs two per-weight entry points rather than one
axis file. The name being *unclaimed* rather than merely absent is the security-relevant part
(T-00-12) and is written into `fonts-charcoal.css` as a comment, so a future reader who tries
it is warned before installing. The literal string is kept out of that file so the acceptance
grep asserting its absence stays honest.

### Supply Chain

`npm install` reported "added 5 packages" for three requested. Investigated rather than
assumed: all three declare **zero dependencies and zero scripts**, and the only new leaf
packages under `node_modules` are the three (timestamped 12:04 against the rest of the tree's
11:44). The `@bruits/satteri-*` platform binaries whose directory mtimes changed are Astro's
own optional deps, already present from plan 01. No package outside RESEARCH §Package
Legitimacy Audit's cleared set was added. 0 vulnerabilities. **T-00-01 and T-00-SC hold.**

## Observations Not Recorded as Findings

Following plan 01's precedent: this plan is authoring-plus-measurement against a fixed
sixteen-row register, so real gaps found outside those rows are flagged here rather than added
as untriaged rows that would sit outside Phase 1's tier-pull contract.

**1. Option A loads no italic axis, and charcoal has two italic roles.** The four entry points
are all roman. UI-SPEC gives two real editorial-italic roles — the 22px display subtitle and
the italic serif cross-link at the foot of Work and Photos — and both will render as a
browser-synthesised oblique, not Playfair's drawn italic, which for an editorial serif
identity is visible. Adding `playfair-display/wght-italic.css` costs 4 more rules and takes
the baseline from **8 to 12**. Not done here: the count is an acceptance criterion and a
recorded baseline, and changing what "8" measures mid-plan would silently invalidate it. This
is a Phase 1 decision about what the face layer is *for*, and it should be made explicitly.
Documented in `fonts-charcoal.css`'s header as a KNOWN GAP.

**2. Five design-system surface tokens have no charcoal mapping.** UI-SPEC's three-surface
model names `--cream` / `--cream-2` / `--cream-3` and aliases `--page-bg` / `--paper` /
`--panel2` onto them. The design system also ships `--panel`, `--bg`, `--pg`, `--paper-warm`
and `--paper-deep`, which charcoal leaves at their neutral values — so a component reaching
for `--panel` renders `#1c1c1c` in charcoal dark instead of `#1E1E1D`. Declaring them was out
of this plan's scope (no measured ratios exist for them, and this phase's rule is
measured-not-asserted), but the token-ownership allowlist explicitly permits `--panel*`,
`--bg` and `--pg`, so Phase 1 should either map them or state that they are retired.

**3. The emitted cascade order is currently the hazardous one, and it does not matter.** In
this build Astro links the chunk carrying the design system's `:root.dark, .dark` *before* the
chunk carrying charcoal, so charcoal light at (0,2,0) would win the tie against `:root.dark`
on source order. That is the exact configuration the invariant exists to neutralise, and it
does: every charcoal token is restated at (0,3,0), so nothing is decided by the tie. Recorded
because it means the hazard is not hypothetical in this stack — it is the default. Plan 07
owns the four-order probe; this is one observed data point, not that measurement.

**4. `StatCard`'s generic `class="glass"` (carried forward from plan 01).** Not touched by this
plan — no contrast or exhaustiveness work reached it. Re-flagging only so it does not get lost
between summaries. Still worth a decision at verify-phase.

## Threat Flags

None. No network endpoint, auth path, file-access pattern or trust-boundary schema was
introduced. The three scripts read files this plan authored at fixed paths plus installed
package CSS, all inside the repository; nothing parses external or user-supplied input.

## Self-Check: PASSED

**Files verified present:**

- `.planning/phases/00-design-ideation/00-FINDINGS.md` — FOUND (modified, 169 lines)
- `.planning/phases/00-design-ideation/00-04-SUMMARY.md` — FOUND
- `.playground/src/styles/theme-charcoal.css`, `src/styles/fonts-charcoal.css`,
  `src/pages/probe/tokens.astro`, `check-theme-exhaustive.mjs`, `check-font-names.mjs`,
  `check-contrast.mjs` — all FOUND (gitignored, so present on disk only)

**Plan `<verification>` block, all five:**

- `cd .playground && npx astro build` exits 0 — PASS (3 pages)
- all three scripts exit 0 — PASS (37 tokens · 16 type tokens · 54 ratios)
- each script fails correctly on its stated negative control — PASS (3/3, restores verified
  byte-identical)
- `theme-charcoal.css` declares zero face rules and zero must-not-redefine tokens — PASS
  (0 / 0 / 0)
- `00-FINDINGS.md` carries AAA-1 and G-11 evidence and the 8-vs-73 baseline — PASS (22
  numeric ratios in AAA-1; `44` and `52` both in G-11; **8** and **73** under Measured
  baselines)

**Task acceptance criteria:** 10/10 task 1, 6/6 task 2, 7/7 task 3.

**Playground left intact for downstream plans:** `astro build` 3 pages exit 0;
`check-no-js.sh` PASS on 2 static routes (the new probe adds no framework JS);
`check-bundle.mjs` unchanged at 570555 B raw / 176922 B gzip / 99 modules, so the DS-09
measurement is undisturbed; exactly 1 real React runtime, all consumers deduped; D-02 fence
holds (no adapter, no wrangler, no vitest, no `src/pages/api`, no root `package.json`).

**Not touched, as instructed:** `STATE.md`, `ROADMAP.md`, `00-COPY/`.
