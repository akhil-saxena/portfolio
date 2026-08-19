---
phase: 01-design-system-charcoal-theme
plan: 06
subsystem: design-system
tags: [packaging, exports, g-12, d-35, criterion-1, postbuild, negative-control, consumer-probe]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 01
    provides: src/themes/charcoal.css — the theme this plan makes reachable by its D-35 specifier
  - phase: 01-design-system-charcoal-theme
    plan: 04
    provides: src/fonts/{charcoal,default}.css, and the finding that named this plan as the owner of the unreachable migration line
  - phase: 01-design-system-charcoal-theme
    plan: 05
    provides: the 12-face charcoal layer whose face count this plan's consumer probe independently reproduces
provides:
  - "$DS/package.json — exports gains ./themes/*.css, ./fonts/*.css and ./css/*.css; ./css/* untouched"
  - "$DS/scripts/postbuild.mjs — a per-directory copy loop that throws on a zero-copy from an existing source directory; the log reports the real count (6), not a hardcoded 3"
  - "$DS/README.md — the note recording why .css sits INSIDE the wildcard, so the next tidy-up does not remove it"
  - "The four D-35 specifiers, proven resolvable by a real astro@7.2.2 build against a packed tarball"
affects: [01-08 pack, 01-20 baselines, 01-21 v2.0.0 publish + registry re-measure, Phase 5 manifest consumption]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "exports wildcard patterns for stylesheets carry the extension INSIDE the pattern (./themes/*.css), because the * captures whatever the consumer wrote — the extensionless spelling doubles the extension and fails the consumer's build, not ours"
    - "packaging.test.ts validates export TARGETS, never KEYS. It cannot catch a key-spelling error. Only a real consumer build can, which is why the throwaway-consumer probe is not optional"
    - "npm pack leaves an untracked .tgz that violates sibling-protocol §1 — delete it before the plan closes"

key-files:
  created: []
  modified:
    - ../design-system/package.json
    - ../design-system/scripts/postbuild.mjs
    - ../design-system/README.md

key-decisions:
  - "G-12 fixed additively: ./css/*.css was ADDED and ./css/* left byte-untouched, then both spellings were proven to resolve in the same build. D-33's manifests are extensionless and Phase 5 consumes them."
  - "The zero-copy guard is per-directory, not a total, because packaging.test.ts asserts only that a directory holds at least one match — a build copying one of two theme files would pass it and publish a half-empty directory."
  - "The plan's claim that packaging.test.ts covers the new entries 'for free' was verified by planting the violation, not assumed. It bites — but only on missing targets, never on a mis-spelled key."

requirements-completed: [DS-04, DS-05, DS-08]

# Metrics
duration: 12 min
completed: 2026-08-19
---

# Phase 1 Plan 06: Packaging and the Consumable Surface Summary

**The defect 01-04 named is closed: `@akhil-saxena/design-system/fonts/default.css` — the single
migration line in D-36's `BREAKING CHANGE:` footer — now resolves, along with the charcoal theme
and the charcoal face layer, proven by a real `astro@7.2.2` build against a packed tarball rather
than by reading the map. The load-bearing extra result is that the plan's "no new test to write"
claim is half true: `packaging.test.ts` validates export *targets* and is blind to a mis-spelled
*key*, so the throwaway-consumer probe is the only thing standing between a typo and a published
404.**

## Performance

- **Duration:** ~12 min (2026-08-19T09:14+0530 → 09:26+0530)
- **Tasks:** 2 of 2
- **Files:** 0 created, 3 modified
- **Suite:** **1539** tests, 115 files, all passing (unchanged — the new entries are covered by an existing assertion)
- **Negative controls executed:** **4** (the plan named 1)

---

## What shipped

| `exports` key | Target | Status |
|---|---|---|
| `./themes/*.css` | `./dist/themes/*.css` | **added** |
| `./fonts/*.css` | `./dist/fonts/*.css` | **added** |
| `./css/*.css` | `./dist/css/*.css` | **added** (G-12) |
| `./css/*` | `./dist/css/*.css` | **untouched** (T-06-04) |

`postbuild.mjs` grew a second loop over `themes` and `fonts` that `mkdirSync`s the destination,
copies every `.css`, and throws if an existing source directory yields zero. Its final line moved
from a hardcoded `copied 3 stylesheets` to the real count:

```
postbuild: copied 6 stylesheets, stamped 11 JS files with "use client"
```

All three new files land byte-identical to source (`cmp`): `dist/themes/charcoal.css` 20,943 B,
`dist/fonts/charcoal.css` 3,572 B, `dist/fonts/default.css` 2,332 B. The packed tarball
(`akhil-saxena-design-system-1.11.4.tgz`, 502,695 B, 109 files) carries
`package/dist/themes/charcoal.css`, `package/dist/fonts/charcoal.css` and
`package/dist/fonts/default.css`.

## The consumer probe — four specifiers, four content greps

A throwaway Astro project in the scratchpad (`astro@7.2.2`, `react@19.2.8`, `react-dom@19.2.8` —
both Astro packages `[OK]`/Approved in `00-RESEARCH.md` §Package Legitimacy Audit) installed the
tarball as a `file:` dependency. `rm -rf node_modules/.vite dist` before every build, per Phase 0
Pitfall 1. **`astro build` exit 0**, 2 pages, 70,614 B of CSS and **77 woff2** emitted.

Exit code alone proves nothing — an import that is silently dropped also builds. The evidence is
the emitted content:

| Specifier | Anchor found in emitted CSS | × |
|---|---|---:|
| `@akhil-saxena/design-system/themes/charcoal.css` | `data-brand=charcoal` | 2 |
| `@akhil-saxena/design-system/fonts/charcoal.css` | `font-family:Playfair Display Variable` | 8 |
| `@akhil-saxena/design-system/fonts/default.css` | `@font-face{font-family:Inter;` | 28 |
| `@akhil-saxena/design-system/css/base.css` | `ds-atom-chip-x` | 4 |

Both charcoal blocks survived the round trip, not just the light one —
`:root[data-brand=charcoal]` **and** `:root[data-brand=charcoal].dark` are both in the bundle.
(The minifier strips the quotes; the source's `data-brand="charcoal"` becomes
`data-brand=charcoal`.)

### The face census reproduces both recorded baselines without being told them

The emitted bundle holds **85** `@font-face` rules. Nothing in the probe was seeded with an
expected count, so the split is an independent cross-check on 01-04 and 01-05:

| Family | Faces | Layer |
|---|---:|---|
| Inter | 28 | default |
| JetBrains Mono | 24 | default |
| Archivo | 15 | default |
| Newsreader Variable | 6 | default |
| **default subtotal** | **73** | **= 01-04's baseline exactly** |
| Playfair Display Variable | 8 (4 roman + 4 italic) | charcoal |
| DM Sans Variable | 2 | charcoal |
| IBM Plex Mono | 2 | charcoal |
| **charcoal subtotal** | **12** | **= 01-05's option-b baseline exactly** |

**12, not 8** — the retired figure does not appear anywhere in this measurement. The 4 italic faces
are the axis the user chose at 01-05.

This also demonstrates the whole transitive chain: `src/fonts/*.css` contain **zero** literal
`@font-face` rules (5 and 16 `@import` lines respectively). The 85 faces exist only because a real
bundler resolved those `@fontsource` specifiers out of `node_modules` — which is the same mechanism
01-04 showed makes a grep of `dist/tokens.css` meaningless.

### The extensionless spelling still resolves

`css/base` was imported from a second page. Both pages built, and both link the **same hashed
asset** `/_astro/base.BrryDIK_.css` — so `css/base` and `css/base.css` resolve to one file.
D-33's manifests are safe.

## Negative controls — all four executed, each verified to fail for its stated reason

### Control 1 — is `packaging.test.ts` really "covered for free", or decoration?

Deleted `dist/themes/` (a build artefact; no source touched) and re-ran the suite.

```
- []
+ [
+   "./dist/themes/*.css (no files match)",
+   "./dist/themes/*.css (no files match)",
+ ]
 Tests  1 failed | 3 passed (4)     vitest exit=1
```

**It bites**, and twice — the walker visits both the `style` and `default` conditions. Restored by
rebuilding.

### Control 2 — does the new zero-copy guard actually fire?

`src/themes/` made to exist while holding no `.css`. The build **failed loudly**, exit 1:

```
Error: postbuild: copied 0 stylesheets from src/themes/ although that directory exists —
package.json exports ./themes/*.css, so this build would publish a package whose documented
themes entrypoints 404.
```

| | value |
|---|---|
| `src/themes/charcoal.css` SHA before | `eb151bbc…9211cb` |
| SHA after `git checkout --` restore | `eb151bbc…9211cb` |
| Equal? | **Yes — byte-identical** |

Same value 01-01 through 01-05 each recorded; the file has not drifted across six plans.

### Control 3 — the plan's counter-proof: respell `./themes/*.css` as `./themes/*`

Edited the **installed** copy inside the scratch consumer's `node_modules`, caches cleared, rebuilt.
Exit 1, with the **exact** error Phase 0 recorded (modulo the package name, which was
`stub-theme-pkg` there):

```
[vite]: Rolldown failed to resolve import "@akhil-saxena/design-system/themes/charcoal.css" from
".../consumer/src/pages/index.astro".
`build.rolldownOptions.external`
```

Only the **key** lost its `.css`; the target was left as `./dist/themes/*.css`. So the failure is
purely the wildcard capturing `charcoal.css` and substituting to `themes/charcoal.css.css`. Restored
→ exit 0 again. **The wildcard shape is a measurement, not a preference.**

### Control 4 — is the G-12 addition load-bearing, or was `css/base.css` always fine?

Not in the plan; added because the plan asserts the fix without ever proving the *unfixed* state
fails on this package. Removed **only** `./css/*.css`, left `./css/*` intact, rebuilt:

```
[vite]: Rolldown failed to resolve import "@akhil-saxena/design-system/css/base.css" from
".../consumer/src/pages/index.astro".
```

Exit 1. **G-12 is real on this package and my addition is what closes it.** Restored → exit 0.

## Accomplishments

- **D-36's migration path is reachable.** The line in the `BREAKING CHANGE:` footer,
  `import "@akhil-saxena/design-system/fonts/default.css";`, resolves in a real consumer build. It
  did not before this plan, and 01-04 flagged that as the thing that would make the major
  unusable.

- **A build can no longer silently publish a 404 entrypoint**, in two independent layers: the
  postbuild throw (proven to fire) and `packaging.test.ts`'s wildcard assertion (proven to fire).
  The guard is per-directory precisely because the test's "at least one match" is satisfiable by a
  half-empty directory.

- **G-12 fixed additively and both spellings verified in one build** — `css/base` and
  `css/base.css` resolve to the same hashed asset, so Phase 5's extensionless manifests keep
  working while the spelling every developer reaches for first also works.

- **Success criterion 1's packaging half is met.** Four specifiers, each proven by emitted content
  rather than by an exit code or a resolver call. 01-21 closes the registry half.

- **All four sibling gates green:** `npm test` 115 files / **1539** tests, `npm run check` 347
  files no fixes applied, `npm run typecheck` both projects, `npm run css:check` 74 files
  round-trip byte-exact.

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 — exports + postbuild + README | `6a7036c` | `build(exports): add themes, fonts and extensioned css subpaths` (+83/−2 across 3 files) |
| 2 — consumer probe | *(none)* | The plan requires a commit only if the probe found something needing a fix in `$DS`. It did not. |

Branch `charcoal-theme` in `../design-system`, now **12 commits ahead** of that repo's `main`.
Author `Akhil Saxena <saxena.akhil42@gmail.com>`. **No AI attribution** — verified
(`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'` → `0`).

All three files' SHA-256 were identical before and after the commit, so `lint-staged` reformatted
nothing: **the bytes that were tested are the bytes that were committed.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The plan's `css/base.css` content anchor does not exist**

- **Found during:** Task 2, choosing grep anchors.
- **Issue:** The `<manual>` block specifies "a Chip rule for `css/base.css`". A grep for `ds-chip`
  against `dist/css/base.css` returns **nothing** — Chip's own rules live in `dist/css/chip.css`,
  a separate per-component sheet. Taken literally the anchor would have produced a false FAIL on a
  correct build.
- **Fix:** used `ds-atom-chip-x`, which *is* a chip rule and *is* in `base.css` (the shared "atom"
  rules live there), cross-checked against `ds-visually-hidden-focusable`, base.css's headline
  rule. Both found; 4 and 1 occurrences.
- **Verified:** anchors re-confirmed on the final restored build.

**2. [Rule 2 — Correctness] `npm pack` leaves an artefact that breaks the next plan's first gate**

- **Found during:** Task 2 cleanup.
- **Issue:** `.gitignore` in `$DS` has no `*.tgz` rule, so the packed tarball shows as
  `?? akhil-saxena-design-system-1.11.4.tgz`. Sibling-protocol §1 permits exactly one untracked
  line, and it is not that one — so 01-07 would have opened on a **STOP** and a spurious
  human-verify checkpoint.
- **Fix:** deleted the tarball after the probe. **Ordering matters:** task 2's automated gate 1
  asserts the tarball exists, so it must run *before* cleanup — it did, and passed
  (`OK tarball produced … 502695 B`).
- **Not fixed here:** adding `*.tgz` to `.gitignore` would be a scope widening protocol §10
  forbids. Raised as a finding below, because 01-08 and 01-21 both pack.

---

**Total deviations:** 2 auto-fixed (1 × Rule 3 blocking, 1 × Rule 2 correctness). No gate was
weakened; every specified assertion was kept and two unspecified controls were added. No
architectural change, no scope widening. `./css/*` was not modified in any way (T-06-04).

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **`packaging.test.ts` validates export *targets*, never *keys*.** Its walker reads
   `Object.values(...)` and checks paths under `dist/`. A key mis-spelled `./themes/*` with a
   correct `./dist/themes/*.css` target passes the suite **and** publishes a package no consumer
   can import — exactly control 3's defect, and the suite stays green through it. The plan's "no
   new test to write" is therefore true for the *files* and false for the *map*. **The
   throwaway-consumer build is the only gate that covers key spelling**; anyone tempted to drop
   task 2 as redundant should read this row first. A key-shape assertion (every `./x/*` pattern's
   target must end `*.css`, and every stylesheet key must too) would close it cheaply in CI.

2. **`$DS/.gitignore` has no `*.tgz` rule.** Every plan that packs (01-06, 01-08, 01-21) must
   delete its tarball or leave sibling-protocol §1 failing for the next plan. A one-line ignore
   rule would remove the trap permanently; it belongs to whichever plan legitimately owns
   `.gitignore`.

3. **Task 2's automated gate 1 and its `<done>` clause are in tension.** The gate requires the
   tarball to exist; `<done>` and §1 require it gone. Point-in-time gates that assert the presence
   of a build artefact are not re-runnable after cleanup — future plans should either assert
   against a recorded value or run cleanup as an explicit final step.

4. **The `data-brand` occurrence count drops 4 → 2 through the bundler.** Source
   `src/themes/charcoal.css` has 4 literal `data-brand="charcoal"` occurrences; the minified bundle
   has 2 selectors (`:root[data-brand=charcoal]` and `….dark`). Both blocks are present, so this
   is selector merging and not loss — but any future gate counting `data-brand` occurrences must
   count in **source**, not in emitted CSS, or pick a threshold rather than an equality.

5. **Still unaddressed, carried from 01-04 finding 2:** `src/tokens.css`'s header still reads
   `v1.5.0` while `package.json` is `1.11.4` and heading for `2.0.0`. 01-21 owns the bump.

6. **Still unaddressed, carried from 01-03/01-04:** `check-no-ivory.sh` line 142 uses a
   case-sensitive `grep -cE` against uppercase `#8D8779`/`#C4BDAD` while `charcoal.css` carries
   them lowercase. This plan did not port that script either. Whichever plan ports it must add
   `-i`.

## Self-Check: PASSED

Files claimed modified, verified on disk in `$DS`:

```
FOUND: ../design-system/package.json           d3792d4c…0479fd
FOUND: ../design-system/scripts/postbuild.mjs  8895c9ee…b9e0d0
FOUND: ../design-system/README.md              83cf508b…4cb10d
FOUND: ../design-system/dist/themes/charcoal.css   20,943 B
FOUND: ../design-system/dist/fonts/charcoal.css     3,572 B
FOUND: ../design-system/dist/fonts/default.css      2,332 B
```

Commit claimed, verified present on `charcoal-theme`:

```
FOUND: 6a7036c  build(exports): add themes, fonts and extensioned css subpaths
```

Sibling tree state at exit: `git status --porcelain` shows only the permitted
`?? design_handoff/design_handoff_ds_overview/` — the packed tarball was deleted. Branch
`charcoal-theme`, 12 commits ahead of `main`. `src/themes/charcoal.css` SHA
`eb151bbc…9211cb`, unchanged. Scratch consumer deleted. No server was started; ports 4321, 6006,
6008 and 6009 were never bound by this plan.
