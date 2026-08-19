---
phase: 01-design-system-charcoal-theme
plan: 01
subsystem: ui
tags: [design-system, css-custom-properties, theming, cascade, wcag, playwright]

# Dependency graph
requires:
  - phase: 00-design-ideation
    provides: the tested 37-token charcoal prototype, 00-THEME-API.md's token contract and D-31 ownership allowlist, and the E1 handover item
provides:
  - "$DS/src/themes/charcoal.css — the charcoal brand token layer, both modes, 49 declarations per block"
  - "the charcoal-theme branch in the sibling design-system repo, cut off main"
  - "a browser-verified guarantee that charcoal's --amber* redeclaration reaches inline var(--amber) consumers"
  - "a closed mapping for the five previously-orphaned design-system surface tokens"
affects: [01-02 cascade harness, 01-03 CI gates, 01-04 font layer, 01-06 exports map, 01-20 visual baselines]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Brand themes ship as a token-only stylesheet scoped to :root[data-brand=NAME] / :root[data-brand=NAME].dark, declaring custom properties and nothing else"
    - "Cross-brand accent remapping is done by var() aliasing in the token layer, never by editing a component"
    - "Exhaustiveness invariant: the dark block restates every property the light block declares, making the cascade order-independent without @layer"

key-files:
  created:
    - ../design-system/src/themes/charcoal.css
  modified: []

key-decisions:
  - "THEME-API open decision 2 closed by MAPPING the five orphaned surface tokens onto charcoal's three measured surfaces, not by retiring them"
  - "--amber-l and --amber-soft alias the full-strength --ochre fill because no ochre tint step was ever measured; --amber-ink pairs with them via --ink-inverse at 4.56:1"
  - "Hex literals lowercased to satisfy the sibling repo's own Biome formatter; values are unchanged and browser-verified"

patterns-established:
  - "Inline-style var() consumers are repointed from the token layer: proven by getComputedStyle, never by grep"
  - "Negative control for a cascade claim: measure the same page with the theme sheet omitted and assert the upstream value appears"

requirements-completed: [DS-01, DS-02, DS-03]

# Metrics
duration: ~30 min active (834 min wall clock — includes a watchdog stall and a long suspension between kill and resume)
completed: 2026-08-19
---

# Phase 1 Plan 01: Charcoal Brand Token Layer Summary

**The charcoal identity now exists as a real stylesheet in the design system — 49 tokens per mode, ported byte-for-byte from the measured prototype — and Chromium confirms its ochre accent reaches even the inline `background: var(--amber)` that the primary button sets, which is the whole of E1.**

## Performance

- **Duration:** ~30 min active execution (834 min wall clock; the agent was killed by a 600s watchdog during a silent gate run and resumed later)
- **Started:** 2026-08-18T11:26:53Z
- **Completed:** 2026-08-19T01:21:18Z
- **Tasks:** 3 of 3
- **Files modified:** 1 created (`../design-system/src/themes/charcoal.css`, 381 lines)

## Accomplishments

- **DS-01/DS-02/DS-03 are implemented.** `src/themes/charcoal.css` declares two flat blocks — `:root[data-brand="charcoal"]` at specificity (0,2,0) and `:root[data-brand="charcoal"].dark` at (0,3,0) — so charcoal light ties `:root.dark` and charcoal dark wins by arithmetic. All 74 prototype declarations (37 light + 37 dark) are present verbatim; not one measured value was re-derived.
- **E1 is closed and proven in a real browser.** The seven `--amber*` tokens are redeclared as `var()` aliases onto ochre in both blocks. A Chromium `getComputedStyle` read — not a grep — shows an inline `style="background: var(--amber)"` computing to `rgb(176, 114, 42)` under charcoal in both modes.
- **THEME-API open decision 2 is closed by mapping.** All five orphaned surface tokens (`--bg`, `--panel`, `--pg`, `--paper-warm`, `--paper-deep`) now resolve to charcoal surfaces. `--panel` in particular was rendering **pure white** in charcoal light, contradicting the identity's own never-pure-white rule; it now computes `rgb(251, 249, 244)`.
- **The exhaustiveness invariant holds in both directions:** identical 49-property name sets per block (37 ported + 7 accent + 5 surfaces), verified with comments stripped as well as raw, so no comment invented or hid a token.
- **The sibling suite stayed green at every boundary:** 115 test files / 1444 tests, Biome across 342 files, both typecheck passes, and `css:check` byte-exact — measured as a baseline before any edit and again after the commit, with identical counts.

## Task Commits

Per the plan, tasks 1 and 2 build the file and task 3 commits it once (the plan explicitly says "Do not add the file to git yet; task 3 commits the finished file once").

1. **Task 1: Gate the sibling repo, cut the branch, port the stylesheet verbatim** — no commit (by plan design)
2. **Task 2: Close E1 and map the five orphaned surface tokens** — no commit (by plan design)
3. **Task 3: Prove the amber bridge in a browser, then commit** — `decfd90` (feat)

All work is on branch **`charcoal-theme`** in `/Users/akhilsaxena/Documents/Personal/Repositories/design-system`, exactly one commit ahead of that repo's `main`, authored `Akhil Saxena <saxena.akhil42@gmail.com>` with **no AI attribution of any kind**.

## Files Created/Modified

- `../design-system/src/themes/charcoal.css` — the charcoal token layer, both modes. 381 lines, 49 declarations per block, zero design-system-owned properties, zero at-rules, zero face rules.

## Measured values (task 3, Chromium)

Read via `getComputedStyle` on a page loading `tokens.css` → `themes/charcoal.css` → `primitives.css`, with `data-brand="charcoal"` on `<html>`, run once per mode. Re-measured against the **committed** bytes after formatting; triples identical.

| Probe | charcoal light | charcoal dark |
|---|---|---|
| inline `style="background: var(--amber)"` (the Button `primary` mechanism) | **`rgb(176, 114, 42)`** | **`rgb(176, 114, 42)`** |
| inline `style="background: var(--panel)"` (the Button `secondary` mechanism) | **`rgb(251, 249, 244)`** | **`rgb(30, 30, 29)`** |
| `class="ds-atom-text" data-tone="accent"` (resolves `--amber-d`) | **`rgb(140, 89, 31)`** | **`rgb(198, 136, 58)`** |

**Negative control — the same probe with `charcoal.css` omitted**, which is what proves the measurement is attributable to this file rather than to something else in the sheet:

| Probe | baseline light | baseline dark |
|---|---|---|
| inline `var(--amber)` | `rgb(245, 158, 11)` (#f59e0b) | `rgb(245, 158, 11)` (#f59e0b) |
| inline `var(--panel)` | `rgb(255, 255, 255)` (pure white) | `rgb(28, 28, 28)` |
| `data-tone="accent"` | `rgb(180, 83, 9)` | **`rgb(251, 191, 36)`** (#fbbf24 — the exact value E1 names) |

Under charcoal, no probed property renders either forbidden value. The probe's assertion machinery was itself verified to bite: a copy with one expectation corrupted to `rgb(1, 2, 3)` exited 1 reporting 2 failed assertions. The probe was deleted after the run, as the plan requires.

## Token counts

| | light block | dark block |
|---|---|---|
| ported from prototype | 37 | 37 |
| `--amber*` accent bridge | 7 | 7 |
| orphaned surfaces mapped | 5 | 5 |
| **total** | **49** | **49** |

Name sets are identical in both directions (zero light-only, zero dark-only). The `--amber*` family was enumerated from `src/tokens.css` at execution time rather than from the plan's list, and returned exactly the seven expected tokens — no token had been added upstream since planning.

## Decisions Made

### THEME-API open decision 2 — the five unmapped design-system surface tokens — CLOSED BY MAPPING

`--bg`, `--panel`, `--pg`, `--paper-warm` and `--paper-deep` sit on the *may redefine* side of the D-31 allowlist and charcoal left them at design-system neutrals. They are now mapped onto the charcoal surface whose role each one matches, as `var()` aliases so no new literal enters the file:

| Token | Role upstream | charcoal alias | resolves to (light / dark) |
|---|---|---|---|
| `--bg` | app background | `var(--cream)` | page / page |
| `--panel` | raised white panel | `var(--cream-2)` | paper / paper |
| `--paper-warm` | warm paper | `var(--cream-2)` | paper / paper |
| `--paper-deep` | deeper inset paper | `var(--cream-3)` | panel / panel |
| `--pg` | deepest well | `var(--cream-3)` | panel / panel |

**Rationale.** They are mapped rather than retired because shipped components already read them — `Button variant="secondary"` sets `background: var(--panel)` as an inline style — and retiring a token by omission makes it resolve to nothing. Leaving them unmapped was the one outcome the contract says is not a decision: `--panel` was rendering `#ffffff` in charcoal light, which contradicts the identity's never-pure-white rule outright.

**Why this needs no new measurement.** All five collapse onto `--cream`, `--cream-2` or `--cream-3`, so every foreground ratio Phase 0 already measured against page / paper / panel covers them unchanged. Plan 01-03's contrast gate inherits that coverage for free. The reasoning is recorded as an inline comment above the group in the stylesheet itself.

### Alias substitutions in the `--amber*` bridge

The plan's mapping table was followed exactly except where it explicitly delegated the choice. **This file declares no `--ochre-l`** (it has `--ochre`, `--ochre-d` and the strong step only), so:

| Token | Prescribed | Landed | Why |
|---|---|---|---|
| `--amber-l` | `var(--ochre-l)` if present, else `var(--ochre)` | **`var(--ochre)`** | No `--ochre-l` exists; aliased to the fill rather than inventing an unmeasured tint |
| `--amber-soft` | same rule | **`var(--ochre)`** | Same |
| `--amber-warm` | `var(--ochre)` | `var(--ochre)` | No separate warm ochre was measured (plan asked this be noted) |
| `--amber` | `var(--ochre)` | `var(--ochre)` | Fill-only accent, Rule C-1 |
| `--amber-d` | `var(--ochre-d)` | `var(--ochre-d)` | Accent-as-text, Rule C-6 |
| `--amber-ink` | `var(--ink-inverse)` | `var(--ink-inverse)` | Ink on a filled accent, Rule C-2 |
| `--amber-vivid` | `var(--ochre)` | `var(--ochre)` | Static across modes upstream; `--ochre` is identical in both blocks, preserving that property exactly |

**The substitution has a semantic consequence worth stating plainly.** Upstream, `--amber-l` / `--amber-soft` / `--amber-warm` are *pale tint backgrounds* and `--amber-ink` is the text painted **on** them (`#92400e` light, `#f5c56b` dark). Aliasing the tints onto the full-strength ochre fill collapses the design system's tinted-pill model onto its filled-accent model. That is coherent only because both halves moved together: `--amber-ink` → `--ink-inverse` (`#161616`), which measures **4.56:1 on `--ochre`** in both modes and clears AA. Had only the tints been remapped, badge and chip labels would have been near-black on a mid-tone fill. No new hex literal was introduced anywhere in the file — asserted programmatically, not by eye.

`--focus` was deliberately not touched; it still resolves to `var(--ochre-d)` in both blocks (Rule C-6 prohibition 2). Aliasing `--amber-d` onto `--ochre-d` is consistent with that binding rather than a second route into it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hex literals lowercased to satisfy the sibling repo's Biome formatter**
- **Found during:** Task 3 (running the four sibling gates before committing)
- **Issue:** `npm run check` failed. Biome formats CSS in this repository and enforces **lowercase hex**; the prototype was authored in the playground with uppercase (`#B0722A`, `#F4F1EA`, …). The design system's own `tokens.css` is lowercase throughout. Protocol §5 makes all four gates a hard precondition for the final commit, so this blocked the plan.
- **Fix:** Ran `biome format --write` on that one file only (from inside `$DS`, so its config resolved). 22 declarations changed case; **44 diff lines, every one a bare hex declaration** — asserted by filtering the diff, no structural or comment change. Protocol §5 explicitly sanctions running `format` when `check` complains about formatting only.
- **Why this does not violate "do not change a single hex value":** case is not value. Verified two ways: (a) programmatic case-insensitive comparison of all 74 prototype declarations against the file, name-by-name and value-by-value, zero drift; (b) the Chromium probe was **re-run against the post-format committed bytes** and reproduced every triple identically.
- **Files modified:** `../design-system/src/themes/charcoal.css`
- **Verification:** all four gates green; `cmp` byte-equality against the prototype was performed *before* any edit, as T-01-02's mitigation specifies
- **Committed in:** `decfd90`

**2. [Rule 2 - Missing critical correctness] The file's own editing warning would have mis-taught the next gate author**
- **Found during:** Task 2 (running the structural checks the file's `EDITING THIS FILE` header demands)
- **Issue:** That header tells future editors this file contains "zero at-rule inclusions", and warns in the same breath that "the acceptance checks are plain greps that cannot tell code from prose". Plan-mandated header edit 1 introduced the published specifier `@akhil-saxena/design-system/themes/charcoal.css` — putting the **first at-sign** into a file whose own documentation implies a count of zero. A future gate written as a bare at-sign tally would fail on prose, permanently.
- **Fix:** Extended the same warning paragraph (which edit 3 already authorised me to extend) with one sentence: count at-rules in **statement position**, never as a bare tally of at-signs, because the scoped package name in the header contributes exactly one at-sign inside a comment and always will.
- **Verified the underlying claim rather than assuming it:** the file has **zero** at-rules in statement position (`^\s*@`) and zero at-rule names (`@font-face`, `@import`, `@media`, `@supports`, `@layer`, `@charset`, `@keyframes`). The reference gates were also read first — `check-font-names.mjs` greps `@font-face\s*\{` and `@import\s+["']…` against the *fonts* file, so nothing existing regresses.
- **Files modified:** `../design-system/src/themes/charcoal.css`
- **Committed in:** `decfd90`

---

**Total deviations:** 2 auto-fixed (1 × Rule 3 blocking, 1 × Rule 2 correctness)
**Impact on plan:** No scope creep. Deviation 1 was forced by the host repository's own committed lint config and changes no value; deviation 2 is one sentence inside a paragraph the plan already told me to extend. Both are confined to the single file in `files_modified`.

## Issues Encountered

- **The executing agent was killed mid-run by a 600-second no-output watchdog** while the four sibling gates ran with output redirected to a log file. No work was lost: `decfd90` was already committed and the sibling tree was tracked-clean. On resume the gates were re-run **individually with visible output** and all four passed. Worth recording as a process note: long gate runs should not be silenced with `>log 2>&1` in a single call.
- **`PIPESTATUS` is empty under zsh** (it is `pipestatus`, 1-indexed), so the first attempts to capture gate exit codes through a pipe reported nothing. Switched to `if cmd; then … else … fi`, which is shell-agnostic. Flagging it because several verify idioms in this phase's plans capture exit codes through pipes.
- **`biome` must be invoked with `$DS` as the working directory**, or it exits with "the configuration resulted in errors" and silently changes nothing — a formatter that no-ops while exiting non-zero is the same false-pass shape §7 warns about.
- **`lint-staged` runs `biome check --write` in a pre-commit hook and takes its own `git stash` backup.** It cleaned up after itself (stash list empty, committed bytes identical to the verified bytes, sha `eb151bb…`). No `git stash` was ever run by me; noting it so a future executor seeing that output in a commit log does not mistake it for a protocol violation.

## Findings raised (not fixed)

Per protocol §10 these are recorded here only. **No row was added to `00-FINDINGS.md`.**

1. **`check-no-ivory.sh` line 142 will false-fail on a lowercased theme file — plan 01-03 must port it with `-i`.** The reference gate's `theme_expect` helper asserts exact declarations with `grep -cE "^[[:space:]]*${token}:[[:space:]]*${value};"` — **case-sensitive** — against uppercase constants (`--ink-5` `#8D8779`, `--rule-strong` `#C4BDAD`). The shipped file is now lowercase, so a literal port of that line fails for reasons of case alone. Its sibling checks on lines 121 and 141 already use `-i` and are unaffected, as are every numeric gate in `check-contrast.mjs` and `tokens.test.ts` (all parse via `Number.parseInt(h, 16)`, which is case-insensitive). One-character fix, but invisible until 01-03 runs.
2. **Charcoal changes the badge/chip contrast *model*, not just its hue.** Upstream, pill labels are ink-on-a-pale-tint; under charcoal they become `--ink-inverse` on a full-strength `--ochre` fill at 4.56:1. Any pill/badge contrast assertion 01-03 writes must measure `#161616` on `#b0722a`, not ink-on-tint — and 4.56:1 clears AA but leaves little headroom for the 9.5–12px labels those components use. Directly downstream of the `--ochre-l` gap noted above; if a measured ochre tint is ever added, `--amber-l` / `--amber-soft` should be repointed at it.
3. **`src/tokens.css` carries 15+ bare `@import "@fontsource/…"` specifiers** which cannot resolve in a browser without a bundler. Harmless here (the probe stripped them; they carry face rules only), but plan 01-04's font work and any future browser-based harness that loads `tokens.css` directly will hit it.

## User Setup Required

None — no external service configuration, no package installs. (T-01-SC held: this plan installed nothing.)

## Next Phase Readiness

**Ready.** `charcoal-theme` exists with one clean commit and the four gates green, which is the boundary invariant the rest of Phase 1 depends on.

- **01-02** (cascade harness) gets the file it needs to parse and to break-and-restore. Note its negative control deletes and restores a line in this same file — the pre-break `shasum -a 256` of the committed file is `eb151bbc5b63b55dc6bacafd1204775a1129a121ef98d329f950a6f86e9211cb`.
- **01-03** (CI gates) inherits the exhaustiveness case named in this file's header, plus the contrast coverage argument for the five mapped surfaces. **Read finding 1 above before porting `check-no-ivory.sh`.**
- **01-06** (exports map) must wire `@akhil-saxena/design-system/themes/charcoal.css` — the specifier is already named in the file's header.
- **No blockers.** The design system's `.planning/` was never touched, and the only portfolio-side write from this plan is this SUMMARY.

---
*Phase: 01-design-system-charcoal-theme*
*Completed: 2026-08-19*

## Self-Check: PASSED

Verified after writing this SUMMARY:
- `../design-system/src/themes/charcoal.css` exists, 381 lines, sha256 `eb151bbc…9211cb` matching the committed blob
- commit `decfd90` exists on `charcoal-theme`, exactly 1 ahead of the sibling's `main`, and contains that one file and nothing else
- the commit touches no path under `.planning/` in either repository
- this SUMMARY is the only file this plan wrote in the portfolio repo
