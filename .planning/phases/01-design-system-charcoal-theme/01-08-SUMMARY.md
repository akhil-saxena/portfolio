---
phase: 01-design-system-charcoal-theme
plan: 08
subsystem: design-system
tags: [packaging, exports, tree-shaking, g-15, ds-09, criterion-5b, ci-gate, mutation-battery]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 06
    provides: the exports map this plan extends, and the finding that packaging.test.ts validates targets but never keys
  - phase: 00-design-ideation
    plan: measurements
    provides: check-bundle.mjs and the .playground probe the G-15 baseline was measured against
provides:
  - "$DS/tsup.config.ts — a generated per-component entry map (81 entries) with a count floor and a leaf-name collision guard"
  - "$DS/package.json — exports gains ./components/*; build now runs tsup under a raised heap"
  - "$DS/tests/treeshake/subpath.test.ts — the DS-09 CI gate, 4 cases, collected by npm test"
  - "$DS/vitest.config.ts — include narrowed to tests/treeshake only, never the whole tests/ tree"
  - "$DS/.github/workflows/publish.yaml — build before test, so dist-dependent gates stop skipping in CI"
  - "$DS/.gitignore — *.tgz, removing the pack trap for 01-21"
affects: [01-21 publish + registry re-measure, Phase 5 island imports, PUB-14, QUAL-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tsup `entry` as an OBJECT keyed by output path; the three barrels must be re-spelled index / hooks/index / icons/index or their dist paths move"
    - "dts bundles the full type graph once PER ENTRY — 3 -> 84 entries takes peak RSS to ~9.3 GB and OOMs the tsup dts worker at 4096 and 8192"
    - "a tsup dts worker inherits process.execArgv, NOT NODE_OPTIONS, so --max-old-space-size must be a real CLI arg on the node process that spawns tsup"
    - "esbuild --metafile inputs name externals honestly but NOT modules bundled into a dist chunk; recover those from the chunk's own .js.map sources"
    - "a positive control is the only thing that catches an inert mechanism — the chaining control here exposed a false claim in my own test"

key-files:
  created:
    - ../design-system/tests/treeshake/subpath.test.ts
  modified:
    - ../design-system/tsup.config.ts
    - ../design-system/package.json
    - ../design-system/scripts/postbuild.mjs
    - ../design-system/src/packaging.test.ts
    - ../design-system/vitest.config.ts
    - ../design-system/tests/treeshake/README.md
    - ../design-system/README.md
    - ../design-system/.gitignore
    - ../design-system/.github/workflows/publish.yaml

key-decisions:
  - "Kept dts:true and raised the heap rather than dropping types from the subpaths — a typeless subpath is a worse API than the barrel it replaces. experimentalDts was rejected because it needs @microsoft/api-extractor, a new registry package T-08-SC forbids."
  - "Reordered publish.yaml so build precedes test: with test first, BOTH this gate and packaging.test.ts skipped themselves in CI for want of dist/, green and measuring nothing."
  - "Added *.tgz to $DS/.gitignore rather than deleting the tarball by hand, closing 01-06 finding 2 permanently for 01-21."
  - "Proceeded despite the barrel measuring clean — the plan's stop condition is a MYSTERIOUSLY clean barrel, and the mechanism here is measured and explained (dist/index.js 328 KB -> 6.7 KB)."

requirements-completed: [DS-09]

# Metrics
duration: 2h 55m
completed: 2026-08-19
---

# Phase 1 Plan 08: Per-Component Subpath Exports Summary

**G-15 is closed, and by more than the plan predicted: 81 per-component JS entries land as
`./components/*`, and the same `import { Chip }` island that measured 570,555 B / 176,922 B
gzip / 99 modules now measures 1,620 B / 785 B gzip / 2 modules through a real Astro 7 /
Rolldown build. The barrel improved too — `splitting: true` across 84 entries turned
`dist/index.js` from a 328 KB monolith into 6.7 KB of re-export lines, which Rolldown can
shake — so the plan's expected control (the barrel still failing) did not hold, and the
reason is measured rather than assumed.**

## Performance

- **Duration:** ~2h 55m
- **Tasks:** 3 of 3
- **Files:** 1 created, 9 modified (all in `$DS`)
- **Suite:** 115 files / 1564 tests → **116 files / 1568 tests**, all passing
- **Biome:** 347 → **348** files, no fixes applied
- **Mutation battery:** **4 mutations**, each verified to fail for its stated reason; 1 of
  them found a real defect in my own gate

---

## The measurement — three rows beside the G-15 baseline

Taken through `npx astro build` (astro 7.2.2, Vite 8 / Rolldown) against a freshly packed
tarball, caches cleared per Pitfall 1, in `.playground`. The verdict line is the
`ChipIsland.*.js` chunk — the only chunk the probe page loads besides Astro's React runtime.

| Import style | raw B | gzip B | modules | prosemirror | tiptap | lowlight | highlight.js | dnd-kit | lucide |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| G-15 baseline, barrel @1.11.4 | 570,555 | 176,922 | 99 | 10 | 23 | 4 | 4 | 3 | 43 |
| barrel @ this build | **1,620** | **785** | **2** | 0 | 0 | 0 | 0 | 0 | 0 |
| subpath @ this build | **1,620** | **786** | **2** | 0 | 0 | 0 | 0 | 0 | 0 |

**352× smaller raw, 225× smaller gzip.** The 1 B gzip difference between the two rows is the
differing chunk hash in the sourcemap reference; the two are otherwise the same bytes and
resolve to the same source chunk.

### Why the barrel went clean, and why I did not treat that as a broken measurement

The plan expected the barrel to keep failing and said a barrel that "has mysteriously gone
clean" means stop and report. It went clean — but not mysteriously. Four independent checks:

1. **The mechanism is visible in the artefact.** `dist/index.js` was a **328,320 B**
   monolith whose lines 8–19 were literal top-level `import … from '@tiptap/…'`,
   `'lowlight'`, `'@dnd-kit/core'`. It is now **6,724 B** — 85 `export … from './chunk-*.js'`
   lines. `splitting: true` across 84 entries put every component in its own chunk, so the
   barrel became re-exports Rolldown can resolve individually.
2. **Bytes cannot lie about ProseMirror.** The emitted chunk is 1,620 B. TipTap + ProseMirror
   is ~450 KB. No naming or sourcemap subtlety can hide that.
3. **The component actually rendered.** `dist/probe/island/index.html` contains
   `class="ds-atom-chip"`, so the import was not silently dropped — the failure mode that
   would also produce a small clean bundle.
4. **The measurement is not stale.** `node_modules/@akhil-saxena`, `node_modules/.vite` and
   `dist` were removed before the install and again before each build; every chunk hash
   changed (`ChipIsland.D0ISvrsm` → `Hk9iH7o9` → `CoBaoqZ5`); the installed package was
   verified to carry 81 `dist/components/*.js` and the `./components/*` key.

**This does not make the subpath redundant.** The barrel's cleanliness is a consequence of
chunking decisions a future build change could quietly reverse, and the CI gate covers the
subpaths only. That is exactly what the README now says.

### Full `check-bundle.mjs` stdout — the `<manual>` block's requirement

Both runs report `FAIL` lines and exit 1. **Neither comes from the DS-09 fixture.** They come
from admin fixture islands on other pages that legitimately use those stacks —
`PhotoLayoutBoard` renders Sortable (dnd-kit), `RichTextBullets` renders RichText (TipTap).
`client.*.js` is Astro's React runtime, over the unconfirmed A8 budget in the baseline too.

**Barrel run:**

```
ChipIsland.Hk9iH7o9.js  1620 B raw  785 B gzip  2 modules {}
FocalPointSketch.CRRoixxY.js  7130 B raw  3010 B gzip  1 modules {}
PhotoLayoutBoard.BzMf0Tkv.js  66224 B raw  21919 B gzip  7 modules { dndkit: 4 }
RichTextBullets.B-LjVjOl.js  465545 B raw  148278 B gzip  59 modules { lucide: 1, prosemirror: 10, tiptap: 23, highlightjs: 4, lowlight: 4 }
ThemeCssIsland.CENhaCuc.js  254 B raw  221 B gzip  1 modules {}
TokensCssIsland.CDWAbQt8.js  248 B raw  220 B gzip  1 modules {}
chunk-PO73BDUV.o_N0GjKg.js  3198 B raw  1318 B gzip  4 modules {}
chunk-TG25XACB.Dfnvnuqu.js  7820 B raw  3115 B gzip  43 modules { lucide: 42 }
client.Cc48bxZQ.js  180706 B raw  56548 B gzip  6 modules {}
css-W3EDTG4F.D5l_8KUR.js  11838 B raw  4264 B gzip  1 modules {}
javascript-FVTGYGYA.w9aIBC1S.js  6434 B raw  2651 B gzip  1 modules {}
json-FO57KJAQ.DS4EA3dC.js  463 B raw  360 B gzip  1 modules {}
jsx-runtime.BPMVGbCv.js  484 B raw  346 B gzip  2 modules {}
python-AEGVDJPP.DwhXSSGr.js  3311 B raw  1508 B gzip  1 modules {}
react-dom.fxZhUCVR.js  3630 B raw  1396 B gzip  2 modules {}
react.CyOsqXVf.js  7575 B raw  2921 B gzip  2 modules {}
typescript-RK5OCB3E.CTV1Js34.js  7734 B raw  3113 B gzip  1 modules {}
xml-XKLQZ4NN.DasnpDVC.js  1948 B raw  823 B gzip  1 modules {}
```

**Subpath run** — identical except the two ChipIsland/RichTextBullets hashes:

```
ChipIsland.CoBaoqZ5.js  1620 B raw  786 B gzip  2 modules {}
FocalPointSketch.CRRoixxY.js  7130 B raw  3010 B gzip  1 modules {}
PhotoLayoutBoard.BzMf0Tkv.js  66224 B raw  21919 B gzip  7 modules { dndkit: 4 }
RichTextBullets.CLPVfNJz.js  465545 B raw  148295 B gzip  59 modules { lucide: 1, prosemirror: 10, tiptap: 23, highlightjs: 4, lowlight: 4 }
ThemeCssIsland.CENhaCuc.js  254 B raw  221 B gzip  1 modules {}
TokensCssIsland.CDWAbQt8.js  248 B raw  220 B gzip  1 modules {}
chunk-PO73BDUV.o_N0GjKg.js  3198 B raw  1318 B gzip  4 modules {}
chunk-TG25XACB.Dfnvnuqu.js  7820 B raw  3115 B gzip  43 modules { lucide: 42 }
client.Cc48bxZQ.js  180706 B raw  56548 B gzip  6 modules {}
css-W3EDTG4F.D5l_8KUR.js  11838 B raw  4264 B gzip  1 modules {}
javascript-FVTGYGYA.w9aIBC1S.js  6434 B raw  2651 B gzip  1 modules {}
json-FO57KJAQ.DS4EA3dC.js  463 B raw  360 B gzip  1 modules {}
jsx-runtime.BPMVGbCv.js  484 B raw  346 B gzip  2 modules {}
python-AEGVDJPP.DwhXSSGr.js  3311 B raw  1508 B gzip  1 modules {}
react-dom.fxZhUCVR.js  3630 B raw  1396 B gzip  2 modules {}
react.CyOsqXVf.js  7575 B raw  2921 B gzip  2 modules {}
typescript-RK5OCB3E.CTV1Js34.js  7734 B raw  3113 B gzip  1 modules {}
xml-XKLQZ4NN.DasnpDVC.js  1948 B raw  823 B gzip  1 modules {}
```

The island page loads exactly `/_astro/ChipIsland.*.js` + `/_astro/client.*.js`, and the
ChipIsland chunk's sourcemap sources are exactly
`node_modules/@akhil-saxena/design-system/dist/chunk-AK364PCA.js` and `ChipIsland.tsx`.

---

## Entry count and build cost

`src/<category>/<Component>/index.tsx` matched **81** components across 11 categories
(inputs 25, data-display 11, overlays 10, feedback 7, interaction 7, display 6, foundation 6,
layout 4, patterns 3, surfaces 2). `_internals/`, `hooks/`, `icons/`, `fonts/` and `themes/`
hold no `*/index.tsx` at all, so they fall out of the scan naturally — **verified, not
assumed**, as the plan required. Zero leaf-name collisions.

| | before | after |
|---|---:|---:|
| `npm run build` wall time | **3.05 s** | **29.74 s** |
| dts pass | 2,587 ms | ~28 s |
| peak RSS | not measured | **9.31 GB** |
| `dist/` files | 106 | **542** |
| `dist/` bytes | 2,197,187 | **2,282,454** |
| `dist/*.js` | 11 | **188** |
| `dist/*.d.ts` | 4 | **86** |
| `dist/index.js` | 328,320 B | **6,724 B** |
| stamped with `"use client"` | 11 | **188** |
| packed tarball | 502,695 B (01-06) | **582,854 B** |

Build time grew **9.7×** but stays under 30 s, so per the plan's threshold it is a recorded
cost rather than a finding. `dist/` grew only 3.9% in bytes despite 5× the file count —
`splitting: true` shares chunks rather than duplicating component code.

### The one thing that genuinely blocked, and how it was resolved

`dts: true` across 84 entries **OOM-kills the tsup declaration worker**:
`ERR_WORKER_OUT_OF_MEMORY` at the default heap, again at `--max-old-space-size=4096` (peak
4.53 GB) and again at `8192` (peak 8.42 GB). `12288` passes at a 9.31 GB peak.

`NODE_OPTIONS=--max-old-space-size=… npm run build` **does not work**: tsup spawns the dts
pass with `new Worker(path)` and no `resourceLimits`, and a worker inherits
`process.execArgv`, which `NODE_OPTIONS` does not populate. The flag has to be a real CLI
argument, so `build` names tsup's declared bin file directly:

```
"build": "node --max-old-space-size=12288 ./node_modules/tsup/dist/cli-default.js"
```

Types were kept deliberately (plan's instruction: a typeless subpath is a worse API than the
barrel). `experimentalDts` would likely be cheaper but requires `@microsoft/api-extractor` —
a new registry package, which T-08-SC forbids and which Rule 3 excludes from auto-fixing.

---

## The CI gate

`tests/treeshake/subpath.test.ts`, 4 cases, **537 ms**, now collected by `npm test`
(115 → **116** files, 1564 → **1568** tests).

`vitest.config.ts` `include` gained exactly `tests/treeshake/**/*.{test,spec}.ts`. Verified
**both** directions the plan demanded: `npx vitest list` reports 4 entries from
`subpath.test.ts` and **0** from `tests/visual`. The coverage ratchet (86 / 79 / 85 / 88) is
byte-untouched.

| Sample | Why it is in the set | modules | minified B | families found |
|---|---|---:|---:|---|
| **Chip** | the exact component G-15 measured — the before/after anchor. Also imports an icon (`X` via `../../icons`), so it doubles as the case proving lucide is tolerated rather than accidentally excluded | 1,721 | 11,405 | lucide 1,714 |
| **Lightbox** | the public-island component this project actually hydrates; pulls IconButton, DSPortal and four hooks, so it exercises the shared-chunk path rather than a leaf | 1,733 | 15,111 | lucide 1,714 |
| **RichText** | inverse control — must still contain TipTap/ProseMirror, else the suite could pass by dropping every import | 2,003 | 464,513 | prosemirror 10, tiptap 34, highlightjs 200, lowlight 5, lucide 1,714 |
| **Sortable** | second inverse control, for the other heavy stack (dnd-kit). Not in the plan; added so both failure families have a positive case | 10 | 48,800 | dndkit 4 |

Gated on **module families only**, never bytes — `check-bundle.mjs`'s 50 KB gzip figure is
research assumption A8 and is explicitly UNCONFIRMED.

### Mutation battery — 4 mutations, all restored byte-identically

| # | Mutation | Result | Failed for the stated reason? |
|---|---|---|---|
| M1 | plant `import "@tiptap/react"` in `dist/components/Chip.js` | RED, 1 of 4 | yes — `Chip subpath bundle (1744 modules, 11405 B minified) reached prosemirror (7 modules), tiptap (9 modules)` |
| M2 | disable the sourcemap chaining in the gate | RED, 1 of 4 | yes — `the sourcemap chaining recovered no highlight.js modules beyond what the metafile already named (194)` |
| M3 | plant `@dnd-kit/core` in `dist/components/Lightbox.js` | RED, 1 of 4 | yes — `reached dndkit (3 modules)` |
| M4 | redirect the icons chunk away from `lucide-react` | RED, 2 of 4 | yes — line 202, `counts.lucide`, on both Chip and Lightbox |
| — | positive control: unmutated | **GREEN 4/4** | — |

Every mutated file's SHA-256 matched its pre-mutation value after restore, and the suite was
re-run green after each.

**M2 is the reason this section exists.** On its first run it did **not** bite — all four
tests stayed green with the chaining disabled — which proved that a claim written into my own
test ("this specifically proves the sourcemap chaining works") was **false**: highlight.js is
visible to the metafile directly, 194 modules of it. Measuring the delta showed chaining
contributes exactly the 6 dynamically-imported grammars tsup bundled into dist chunks
(194 → 200). The assertion was rewritten from `> 0` to `> metafileOnly.highlightjs`, and M2
then bit. Without a positive control that mechanism would have shipped as decoration with a
comment asserting it was load-bearing.

**M4 also failed to bite on its first attempt**, but for the opposite reason — the mutation
never landed. `dist/components/Chip.js` is a 3-line re-export shim with no lucide import to
strip; lucide enters through `chunk-TG25XACB.js`. That is an *ineffective mutation*, not an
inert assertion, and the two are worth distinguishing: re-aimed at the real chunk, it bit.

---

## Task Commits

| Task | Commit | What |
|---|---|---|
| 1 | `f070d72` | `build(exports): add per-component JS subpath entries` — tsup.config.ts, package.json, postbuild.mjs, packaging.test.ts |
| 2 | `3a1bc74` | `test(treeshake): gate subpath imports against the editor and drag-drop stacks` — subpath.test.ts, vitest.config.ts, README, publish.yaml |
| 3 | `eb4a94c` | `docs(readme): document the per-component subpath contract for hydrated islands` |
| 3 | `0886f99` | `chore(git): ignore npm pack output` |

Branch `charcoal-theme` in `../design-system`, now **18 commits ahead** of that repo's `main`
(was 14). Author `Akhil Saxena <saxena.akhil42@gmail.com>`. **No AI attribution** — verified
across all four commits (`grep -icE 'claude|anthropic|co-authored|ai-generated|generated with'`
→ `0`).

## Sibling gates at exit

`npm test` **116 files / 1568 tests**; `npm run check` **348 files, no fixes applied**;
`npm run typecheck` both projects clean; `npm run css:check` **74 files round-trip
byte-exact**. Tree shows only the permitted `?? design_handoff/design_handoff_ds_overview/`.

## D-02 scope fence

Fence recorded **before** any edit, over `island.astro` **and** `ChipIsland.tsx` — the plan
named only the former, but the barrel import lives in the latter, so a fence on
`island.astro` alone would have watched a file I never touched.

```
src/pages/probe/island.astro: OK
src/components/ChipIsland.tsx: OK
```

`git status --porcelain -- .playground` empty throughout. `.playground` was restored to its
Phase 0 baseline at exit: the new tarball deleted, `node_modules/@akhil-saxena` reinstalled
from the original `akhil-saxena-design-system-1.11.4.tgz` (verified: `./components/*` absent
again), and `.fence-island.sha` removed. `package.json` and `package-lock.json` were never
modified — the measurement install used `--no-save`.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `dts: true` across 84 entries OOM-kills the tsup declaration worker**

- **Found during:** Task 1, first `npm run build` after adding the entries.
- **Issue:** `ERR_WORKER_OUT_OF_MEMORY`. The ESM pass succeeded (188 files stamped); the dts
  pass died. `NODE_OPTIONS` does not fix it — the worker inherits `execArgv`, which
  `NODE_OPTIONS` does not populate. Measured: 4096 and 8192 both die, 12288 passes at 9.31 GB.
- **Fix:** `build` invokes tsup's declared bin through `node --max-old-space-size=12288`.
  Rationale recorded in `tsup.config.ts`'s header, because `package.json` cannot hold comments.
- **Rejected alternative:** `experimentalDts` needs `@microsoft/api-extractor` — a new
  registry package, forbidden by T-08-SC and excluded from Rule 3.
- **Commit:** `f070d72`

**2. [Rule 2 — Correctness] The gate would have silently skipped in CI**

- **Found during:** Task 2, writing the `skipIf` guard.
- **Issue:** `publish.yaml` ran `npm test` **before** `npm run build`. Both this gate and
  `src/packaging.test.ts` are `skipIf`-guarded on `dist/`, so on a fresh CI checkout they
  skipped — green, having measured nothing. The plan's must-have is "a CI gate … fails if a
  subpath import ever regains a heavy dependency"; a gate that skips is not one.
- **Fix:** reordered the two steps so `npm run build` runs first, with the reason in a comment.
- **Note:** `.github/workflows/publish.yaml` is outside the plan's `files_modified`. Making a
  declared gate actually run is fulfilling the plan rather than widening it, but it is
  recorded here because it touches the publish path 01-21 depends on. Steps are independent;
  the reorder changes nothing else.
- **Commit:** `3a1bc74`

**3. [Rule 1 — Bug] My own gate carried a false claim, caught by its positive control**

- **Found during:** Task 2, mutation M2.
- **Issue:** the RichText case asserted `highlightjs > 0` under a comment claiming it proved
  the sourcemap chaining worked. Disabling the chaining left the suite **green** — 194
  highlight.js modules are visible to the metafile directly, so the assertion could not
  detect the mechanism's removal.
- **Fix:** `measureSubpath` now also returns the metafile-only tally, and the assertion is
  `counts.highlightjs > metafileOnly.highlightjs`. Re-ran M2: RED for the stated reason.
- **Commit:** `3a1bc74`

**4. [Rule 3 — Blocking] My own comment would have failed the plan's own gate**

- **Found during:** Task 2, running the plan's verify block.
- **Issue:** the plan's gate fails if `vitest.config.ts` matches `"tests/\*\*`. The comment I
  wrote to explain the narrowing said `never "tests/**"` — containing the literal token, so
  the file invalidated its own gate. This is protocol §7's "a header can invalidate its own
  gate", live.
- **Fix:** reworded to "never a whole-directory glob over tests/". Meaning preserved, token gone.
- **Commit:** `3a1bc74`

**5. [Rule 2 — Correctness] `npm pack` leaves an untracked tarball (01-06 finding 2)**

- **Found during:** Task 3.
- **Issue:** `$DS/.gitignore` had no `*.tgz` rule, so packing trips the tracked-clean gate that
  opens every plan in this phase. 01-06 hit it and deleted the tarball by hand; 01-21 packs too.
- **Fix:** added `*.tgz` with a comment naming the three plans. **This is the choice the
  orchestrator asked me to state: I added the ignore rule rather than deleting by hand**, so
  the trap is gone for 01-21 rather than deferred to it.
- **Commit:** `0886f99`

**6. [Rule 2 — Correctness] The plan's `npm test` collection gate cannot pass as written**

- **Found during:** Task 2, gate 3.
- **Issue:** `npm test | grep 'subpath.test.ts'` fails because vitest's default reporter prints
  no filenames on a green run — only the summary. The gate's *intent* (prove `npm test`
  collects the gate) is right; its mechanism cannot succeed.
- **Fix:** satisfied the intent with `npm test -- --reporter=verbose` (same script, same
  config), which prints all four cases by name, corroborated by the file count moving
  115 → 116 and by `npx vitest list`. `--reporter=basic` was **not** used: it does not exist
  in Vitest 4 and throws while loading, which is how two earlier batteries in this phase were
  themselves inert.

### Scope additions, declared

- **`Sortable` added as a second inverse control.** The plan named one (RichText, for the
  editor stack); dnd-kit had no positive case, so the `dndkit` regex was never proven to bite.
- **Two extra config guards proven, not assumed.** The plan required the entry scan to throw
  on a low count and on a leaf-name collision; both were executed as negative controls (below)
  rather than trusted.

**Total deviations:** 6 auto-fixed (2 × Rule 3 blocking, 3 × Rule 2 correctness, 1 × Rule 1
bug) plus 2 declared strengthenings. No gate was weakened. No portfolio-side workaround was
added and G-15's failure set was not adjusted.

---

## Negative controls beyond the mutation battery

| Control | Result | Restored |
|---|---|---|
| duplicate leaf name (`src/layout/Chip/index.tsx`) | build exit 1: `two components share the leaf name "Chip" — src/inputs/Chip/index.tsx and src/layout/Chip/index.tsx` | dir removed, tree clean |
| `MIN_COMPONENTS` raised to 200 | build exit 1: `the component scan matched 81 entries, below the floor of 200` | `tsup.config.ts` SHA identical |
| strip `"use client"` from a sampled component entry | `npx vitest run src/packaging.test.ts` exit 1: `components/Kbd.js is missing the directive`, 1 failed / 3 passed | file SHA identical, re-run 4/4 green |

The packaging control matters because the sample is computed (`components[0]`, middle, last of
the sorted `dist/components/` listing) — `Kbd.js` being named proves the sampling reached the
middle element rather than a hardcoded name.

---

## Findings raised (not fixed)

Per protocol §10 — recorded here, **not** added to `00-FINDINGS.md`.

1. **The publish path now needs ~9.3 GB of RAM, and 01-21 runs it.** `publish.yaml` uses
   `ubuntu-latest` (16 GB), and `npm publish` runs `prepublishOnly` = `build && test`, so the
   build happens twice per publish. 9.3 GB fits, but the headroom is thin and grows with every
   component added. If 01-21's publish dies with `ERR_WORKER_OUT_OF_MEMORY`, this is why. A
   real fix is emitting thin re-export `.d.ts` files over one `tsc --emitDeclarationOnly` pass
   instead of bundling the type graph 84 times; that is an architectural change and was out of
   scope here.

2. **The barrel is now clean but ungated, and that combination invites regression.** The gate
   covers `./components/*` only. A future build change that alters chunking could return
   `dist/index.js` to a monolith and nothing would fail. A cheap guard would be a byte ceiling
   on `dist/index.js` (currently 6,724 B; it was 328,320 B) — it is a build artefact with a
   stable meaning, unlike the A8 gzip budget.

3. **`sideEffects: ["*.css"]` makes esbuild drop the bare chunk imports in dist entries.**
   Every measurement logged `[ignored-bare-import] Ignoring this import because
   "dist/chunk-XXXX.js" was marked as having no side effects`. Heavy deps arrive through named
   imports and are unaffected, so the gate is sound — but esbuild is being more aggressive here
   than a consumer's bundler may be, which is one more reason the authoritative measurement is
   the Astro/Rolldown build and not this gate.

4. **`dist/components/*.js` carry a duplicated `//# sourceMappingURL=` line.** Every component
   entry ends with the comment twice (verified on the original build output, not an artefact of
   my mutations). Harmless — bundlers read the last one — but it suggests both the esbuild and
   rollup passes are appending one. Pre-existing shape, now multiplied across 81 files.

5. **`check-bundle.mjs`'s failure message is now misleading in this repo.** It says "The
   design-system barrel is not tree-shaking" on *any* chunk with a heavy family, including
   `PhotoLayoutBoard` and `RichTextBullets`, which are admin fixtures legitimately rendering
   Sortable and RichText. Reading its exit code alone would now produce a false negative
   verdict for DS-09. 01-21 re-measures against the registry and should read the
   `ChipIsland.*.js` line specifically, as this plan did.

6. **`tests/treeshake/main.ts`'s check is still manual.** The plan asked for the fixture to be
   wired into CI; only the subpath half was, because the icon-size check gates on a 5,000 B
   threshold and hardening a byte threshold was explicitly out of scope. The README now says
   which of the two is automated instead of claiming neither is.

7. **Still unaddressed, carried from 01-04 and 01-06:** `src/tokens.css`'s header still reads
   `v1.5.0` while `package.json` is `1.11.4`; `check-no-ivory.sh` line 142 still uses a
   case-sensitive `grep -cE` against uppercase hex. 01-21 owns the version bump.

---

## Self-Check: PASSED

Files claimed, verified on disk in `$DS`:

```
FOUND: tsup.config.ts                    b56a28558476
FOUND: vitest.config.ts                  344e1432d75c
FOUND: package.json                      d89ac3f84841
FOUND: scripts/postbuild.mjs             4ca6caa505b7
FOUND: src/packaging.test.ts             dee26a682641
FOUND: tests/treeshake/subpath.test.ts   f014bf5bd8e4
FOUND: tests/treeshake/README.md         ccc56428be2c
FOUND: README.md                         70f3482ca8db
FOUND: .gitignore                        036a0bdf8f62
```

Commits claimed, verified present on `charcoal-theme`:

```
FOUND: f070d72  build(exports): add per-component JS subpath entries
FOUND: 3a1bc74  test(treeshake): gate subpath imports against the editor and drag-drop stacks
FOUND: eb4a94c  docs(readme): document the per-component subpath contract for hydrated islands
FOUND: 0886f99  chore(git): ignore npm pack output
```

Build artefacts: `dist/components/` holds **81** `.js` and **81** `.d.ts`; `dist/components/Chip.js`
is stamped `"use client"`; `dist/components/DSPortal.js` does **not** exist (`_internals`
excluded, T-08-01).

No server was started. Ports 4321, 6006, 6008 and 6009 were never bound by this plan.
