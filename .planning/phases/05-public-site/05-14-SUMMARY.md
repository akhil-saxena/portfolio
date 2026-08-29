---
phase: 05-public-site
plan: 14
subsystem: build-gates
tags: [pub-14, ds-09, byte-ceiling, fonts, ci, tree-shaking, node-env, gate]

requires:
  - phase: 05-12
    provides: the one island, its measured chunk bytes, and the two findings this plan closes
  - phase: 05-13
    provides: the 51-URL route census the gate's derived denominators agree with
provides:
  - "scripts/assert-public-routes-ship-no-js.mjs — PUB-14 and DS-09 over the artefact, six assertions, ten canaries, a byte ceiling in three buckets"
  - "scripts/assert-font-families.mjs — §1.2's static half, four assertions, seven canaries"
  - ".planning/phases/05-public-site/05-DS-FINDINGS.md — twenty upstream findings, each re-measured"
  - "gate:content chains ELEVEN gates, and CI runs all eleven twice"
  - "test/setup/preview-server.ts builds with NODE_ENV=production — the artefact CI re-asserts now matches the one that ships"
affects: [05-15, 06-case-studies, 08-cutover]

tech-stack:
  added: []
  patterns:
    - "a byte ceiling is asserted in RAW BYTES ON DISK, in buckets that partition the artefact and are proven to partition it"
    - "the barrel import tree-shakes to +539 B here — the artefact is the WRONG layer to catch it; gate:ds at source is the control"
    - "a family-name pattern over minified output is not evidence: `dnd-kit` is absent from a chunk that carries dnd-kit"
    - "vitest sets NODE_ENV=test, so a harness that runs `astro build` leaves a React DEVELOPMENT bundle behind"
    - "the theme script is identified as the one inline text present on EVERY document, not read from one page"

key-files:
  created:
    - scripts/assert-public-routes-ship-no-js.mjs
    - scripts/assert-font-families.mjs
    - .planning/phases/05-public-site/05-DS-FINDINGS.md
  modified:
    - scripts/assert-gutter-ladder.mjs
    - test/setup/preview-server.ts
    - package.json
    - .github/workflows/ci.yml

decisions:
  - "D-05-14-1: the ceiling's unit is RAW BYTES ON DISK, not gzip or brotli — compression is a property of the serving edge, raw bytes are a function of the lockfile, and parse cost scales with raw"
  - "D-05-14-2: three ceilings, not one — app 19,000 / vendor 200,000 / total 240,000 — because one number cannot both catch an order-of-magnitude event and a 2 KB regression"
  - "D-05-14-3: the plan's 40,000 B ceiling is RED on a correct build and was replaced with measured numbers"
  - "D-05-14-4: §5.3's assertions 1 and 3 are re-spelled for Astro 7; §5.2's one-inline-script rule is re-stated as an exact permitted set"
  - "D-05-14-5: A6 is not compared against a development artefact — it reports the cause instead"

metrics:
  duration: "~4h"
  completed: "2026-08-29"
  tasks: 3
  commits: 4
  suite: "1488/1488 across 41 files (unchanged — this plan adds gates, not tests)"

requirements: [PUB-14]
---

# Phase 5 Plan 14: The Byte Ceiling Summary

**Eleven gates now run on every push, and the sixth assertion is a byte ceiling in raw bytes on
disk — 17,451 / 19,000 for the app chunk, 191,717 / 200,000 for React, 209,168 / 240,000 for the
whole artefact. It would have caught 05-12's un-tree-shaken helper by 298 B, and it caught something
nobody was looking for: the artefact CI re-asserts its gates against was 411,410 B of React
DEVELOPMENT bundle, 197 KB that never ships.**

Three of the plan's own premises did not survive contact with the build, and each is measured below.
**The 40,000 B ceiling is red on a correct build.** **The barrel import is not a usable control** —
it tree-shakes to +539 B and fires neither assertion 4 nor assertion 6. **Assertion 4 cannot fire on
dnd-kit at all**, because the hyphenated npm name does not survive minification and the camelCased
runtime identifier does.

---

## The ceiling: its unit, its value, and why

### RAW BYTES ON DISK. Not gzip, not brotli.

Three reasons, in order of weight:

1. **Compression ratio is a property of the serving edge, not of the artefact.** Cloudflare picks
   the encoding from `Accept-Encoding` and picks the quality level itself. A ceiling over
   `brotli -q11` measures a tool version as much as it measures the bundle, and it would move under
   this project when nothing in this project changed.
2. **Raw bytes are a deterministic function of the committed source plus the lockfile**, so the
   number a developer sees is the number CI sees. That is the entire reason to have a ceiling.
3. **What PUB-14 cares about is main-thread cost, and parse/compile time scales with raw bytes** —
   the browser decompresses before it parses. TBT does not care what the wire carried. 05-12
   measured TBT at 0 ms in all eight of its runs; the thing to protect is that it stays there.

### Three ceilings, because one number cannot do both jobs

| bucket | what it governs | today | ceiling | headroom |
|---|---|---:|---:|---:|
| **app** | the island ENTRY chunks a document names as `component-url` — not their imports | **17,451 B** | 19,000 B | **1,549 B** |
| **vendor** | everything else — React + `@astrojs/react`'s client runtime | 191,717 B | 200,000 B | 8,283 B |
| **total** | every `.js` under `dist/client` | **209,168 B** | 240,000 B | 30,832 B |

`app` and `vendor` **partition** the artefact, and `app + vendor === total` is **asserted**, not
assumed — a chunk counted twice or not at all would make the ceilings mean less than they say.

**Per-route, not per-artefact, is asserted too — but as an equality against zero.** Every one of the
43 zero-JS documents reaches **0 B** of chunk, derived by following `/_astro/*.js` references out of
the document and then transitively through the chunks' own relative specifiers. That last step
matters: `react-dom.*.js` is named by **no** document — `client.*.js` imports it — so a reader that
only looked at the HTML would under-report a gallery route by 11,087 B. The worst route is
`dist/client/photos/abstract/index.html` at **209,168 B**, and the census prints it.

The ceilings are on the **artefact** rather than per route because a chunk that exists is a chunk
some route can reach, and per-route reachability is exactly the thing an import spelling can be used
to argue about.

### 🔴 The plan's 40,000 B is red on a correct build

The plan derives it from *"§1.1's measured Lightbox baseline (9 files / 15,351 B)"*. That figure is
the **source module graph of the design-system component**, and it omits the 191,717 B of React and
`@astrojs/react` that *any* island necessarily drags in. The real artefact is **209,168 B**. A
40,000 B ceiling exits 1 on every correct build from 05-12 onward.

Corroboration that the replacement numbers are right rather than merely self-consistent: they match
05-12's independent production measurement **exactly**, chunk for chunk.

---

## Would it have caught 05-12's un-tree-shaken helper? YES — measured, not argued

05-12 measured that `lightboxRecordsFor`, exported beside the island, was **not** tree-shaken:
19,336 B against 17,435 B, **+1,901 B**, with `srcsetFor` / `VARIANTS` in the browser chunk.

**Control 8 reproduces it faithfully** — `export { lightboxRecordsFor } from '../../lib/photo-lightbox';`
re-added to the island's own module:

```
island chunk: PhotoLightbox.Czn2NwQw.js  19298 B (was 17,451)
  symbol "srcsetFor"          -> PRESENT
  symbol "VARIANTS"           -> PRESENT
  symbol "lightboxRecordsFor" -> PRESENT
GATE EXIT (planted) = 1
  x [A6-APP] APP client JavaScript is 19,298 B, over the 19,000 B ceiling by 298 B
             (1 chunk(s); largest /_astro/PhotoLightbox.Czn2NwQw.js at 19,298 B)
```

**19,298 B against 19,336 B** — my reproduction lands within 38 B of 05-12's measurement, and the
`app` ceiling's 1,549 B of headroom sits **below** the 1,901 B regression on purpose. That is why
the `app` bucket is the island entry chunk and **not** its transitive imports: fold React DOM's
11,087 B in and the tight ceiling becomes useless. The first version of the bucket did exactly that
and reported 28,538 B on a correct build; the control found it.

**A single total ceiling would NOT have caught it.** 30,832 B of headroom against a 1,901 B
regression. That is the argument for three buckets rather than one, and it is the reason the brief's
question has a real answer instead of a hopeful one.

---

## 🔴 The barrel import is not a usable control — it tree-shakes to +539 B

The plan requires: *"Control #3's barrel plant must trip assertion 6 as well as assertion 4 — require
both, so the two controls check each other."* and *"A barrel import blows the byte ceiling by an
order of magnitude (416,590 B against a 40,000 B limit), so if assertion 6 stays silent it is not
firing."*

**Measured. Assertion 6 stays silent, and it IS firing.**

```
plant: import { Eyebrow, Lightbox, Text } from '@akhil-saxena/design-system';
astro build exit = 0
GATE EXIT (planted) = 0
      17470  PhotoLightbox.B4zYkBGw.js
     180642  client.C13xZyFS.js
      11595  react-dom.QJ355Qv8.js
  TOTAL 209707        <- against 209,168 B correct.  +539 B.
```

Rolldown tree-shakes the barrel **completely** in this repository. §1.1's 416,590 B is the barrel
entry's **source module graph**, not what any chunk ends up containing — and §1.1 says so itself:
*"G-15 / DS-09 is satisfied by construction on the subpath path — not by trusting the bundler…
`STATE.md` records that the barrel now tree-shakes too… but that is a Rolldown behaviour measured in
a different repository."* It is now measured in **this** one.

**The consequence is the important part: the artefact is the wrong layer at which to catch a barrel
import.** `scripts/assert-ds-import-contract.mjs` catches it **at source**, and was run under the
same plant:

```
gate:ds EXIT = 1
  x src/components/public/PhotoLightbox.tsx:126: [DS-BARREL] "@akhil-saxena/design-system"
      —  import { Eyebrow, Lightbox, Text } from '@akhil-saxena/design-system';
```

That is the control that must not be weakened, and `gate:ds` was already chained. The two controls
still check each other — just not the two the plan named.

### The two that DO work are the other two §1.1 names

| plant | chunk | A4 | A6 |
|---|---:|---|---|
| `components/RichText` (§1.1: 6 × @tiptap) | 143,597 B | **fires ×3** — `ProseMirror` @51616, `highlight.js`, `prosemirror` | **fires ×3** — app 144,405 / vendor 558,873 / total **703,278 B** |
| `components/Sortable` (§1.1: 3 × @dnd-kit) | 68,427 B | **SILENT** | **fires ×2** — app 68,442, total 260,679 B |
| barrel `.` | 17,470 B | silent | silent |

**RichText is the control the plan wanted**: A4 and A6 fire together, each naming what it found.
**Sortable is the control that proves A6 is not redundant with A4.**

---

## 🔴 Assertion 4, as §5.3 spells it, cannot fire on dnd-kit

Read out of the 68,427 B chunk that unambiguously contains dnd-kit:

```
/prosemirror/i  -> ABSENT      /dnd-kit/i -> ABSENT
/tiptap/i       -> ABSENT      /dndkit/i  -> "dndKit" @48218
marker "DndContext"    -> PRESENT
marker "droppable"     -> PRESENT
marker "Draggable item"-> PRESENT
```

The hyphenated npm name does not survive minification; the camelCased runtime identifier does. The
roadmap calls a forbidden family in a public chunk a **stop** — so this was a gate that could not
fail for a case the project treats as fatal. It is the tenth of its kind in this repository, and the
first found *before* shipping.

**Repaired, not weakened.** §5.3's five names are kept verbatim in `FAMILY_NPM_NAMES`; a second rule
`FAMILY_MINIFIED_IDENTIFIERS` carries `dndKit | DndContext | useDroppable | useDraggable |
SortableContext`, and its canary is the string that was actually read out of the chunk. Both fire
independently and both are named separately in the output.

**Accepted residual, found by the gate's own self-test on its first run:** the case-insensitive form
matches `lowLight`, a plausible identifier. Kept rather than narrowed — the case-*sensitive* form
matches 0 chunks of the published barrel where `ProseMirror` matches 1, so case sensitivity is the
worse error by a wide margin. Written into the source beside the canary.

---

## 🔴 The finding nobody was looking for: CI re-asserts a DEVELOPMENT bundle

The chain's first post-`npm test` run went red, and the ceiling is what surfaced it.

```
assert-public-routes-ship-no-js: FAIL
  x [A6-TOTAL] TOTAL client JavaScript is 411,410 B, over the 240,000 B ceiling by 171,410 B
```

| | `npm run build` | what `npm test` left behind |
|---|---:|---:|
| `PhotoLightbox.*.js` | 17,451 | **28,141** |
| `client.*.js` | 180,630 | **353,843** |
| `react-dom.*.js` | 11,087 | **29,426** |
| **total** | **209,168 B** | **411,410 B** |

Not a stale artefact and not unminified — the chunks are 11, 218 and 17 lines. It is React's
**development** bundle, identified by strings absent from the production build:

```
"Invalid hook call"    PRESENT      "Minified React error"  absent
"Each child in a list" PRESENT      (production carries the error-CODE form instead)
"Warning:"             PRESENT
```

**Cause.** Vitest sets `NODE_ENV=test`; Vite resolves React through the `development` export
condition for anything that is not `production`; and `test/setup/preview-server.ts:276` runs
`astro build` **directly** — deliberately, so the harness does not depend on a gate appended to the
npm script.

**197 KB that never ships, in the artefact CI's "Re-assert the gates against the artefact the test
run rebuilt" step points at.** Nothing was wrong before this plan — the four gates that ran there
(`origin`, `routes`, and this phase's `placeholders`, `ladder`) are all mode-independent. It is the
arrival of a **size** assertion that makes the mode matter, and it made a claim about what *ships*
compare against something that never does.

**Fixed at the source.** The harness build gets `NODE_ENV=production`. The two artefacts are now
byte-identical — same three chunks, same hashes, same 209,168 B — which is what that CI step always
claimed to be doing. Only the build gets it; `astro preview` merely serves `dist/` and has no React
to resolve. `npm test` is **1488/1488** after the change.

**Belt and braces, and it is proven:** the gate detects a development bundle and reports *that*
instead of comparing ceilings, so a reverted harness names its own cause. Control 9, planted by
undoing this plan's own fix:

```
GATE EXIT (planted) = 1
  x [A6-DEV-BUILD] dist/client: 2 chunk(s) carry React's DEVELOPMENT bundle —
      /_astro/client.5m2k_p1H.js, /_astro/react-dom.D90H2Hkf.js. The three byte ceilings are
      claims about the PRODUCTION artefact and were NOT compared, because "over the ceiling by
      N bytes" would name the symptom and hide the cause. Total here is 411,410 B. CAUSE:
      something built this with NODE_ENV != "production" …
  A6-APP/VENDOR/TOTAL findings: 0        <- the misleading message is suppressed, not merely added to
RESTORE: cmp byte-identical to the pristine backup; sha256 identical
```

The census now prints the mode on every PASS:
`build mode: PRODUCTION — 2 chunk(s) carry React's production error-code form, 0 carry a development message`.

---

## The §5.2 / §5.3 reconciliation

05-12 measured that `<script type="module">` is the wrong predicate under Astro 7 and logged it for
this plan. Re-measured here on every run: **0 module scripts across the whole artefact**, hydrating
routes included. The census prints that count so the fact stays visible rather than becoming folklore.

| §5.3 as written | Verdict | As implemented |
|---|---|---|
| **1.** zero `<script type="module" src=` outside `/photos/` | **VACUOUSLY TRUE** — would pass on a page shipping 209 KB of React | **A1**, stated four ways: no `<astro-island>`, no `<script src>`, no `type="module"`, **and** the document names no `/_astro/*.js` — so its reachable chunk bytes are **0**. Any one spelling alone is something to route around. |
| **2.** exactly one inline block, matching the theme script | **REFUSES THE ONE ROUTE IT PERMITS** — a gallery route carries three blocks; two are Astro's bootstraps | **A2**, as an exact permitted SET derived from the artefact: **3** distinct inline texts exist across 52 documents — theme ×52 (1,452 B), bootstrap ×8 (316 B), bootstrap ×8 (4,380 B). A fourth distinct text anywhere is a second authored script and fails. Zero-JS routes carry exactly 1 block; hydrating routes exactly 3. |
| **3.** exactly one island entry, `<script type="module" src=` | **RED against a correct build** | **A3**, on `<astro-island>` whose `component-export` is `PhotoLightbox`, whose `component-url` matches `/^\/_astro\/PhotoLightbox\.[A-Za-z0-9_-]+\.js$/`, and which **exists on disk**. |
| **4.** no chunk matches the five families | fires on tiptap, **silent on dnd-kit** | **A4**, two patterns — see above. |
| **5.** `photo-pipeline.ts` in no client chunk | sound | **A5**, two markers. |
| **§5.2** "at most one `<script is:inline>`" | same defect as assertion 2 | folded into A2. |

**The theme script is identified as the one inline text present on EVERY document**, not read from
`index.html`. The first version did read `index.html`, and control 2 made it exit 1 with
*"`index.html` carries 2 `<script>` blocks, not 1"* — right direction, **wrong cause**: it points a
reader at Home when the defect is in the shared layout and is on all 52 pages. Under the derivation
that shipped, the same plant reports two *universal* candidates, which is exactly what a second
layout script is.

**A5's two markers earned their keep.** Control 4 planted a real
`export { contentHash, PUBLISHED_PREFIX } from '../../lib/photo-pipeline'` in the island:

```
x [A5-PIPELINE-CRYPTO] …/PhotoLightbox.DzI4LMEc.js: matches /node:crypto|createHash/ —
    found "createHash" at offset 14738
```

`PIPELINE-PATH` stayed silent — the module path does **not** survive bundling into the chunk. One
marker would have been a gate that could not fail.

---

## The inline-`<style>` blindness — third sighting, closed

`assert-gutter-ladder.mjs` read `dist/client/**/*.css` and nothing else. Astro emits a linked
stylesheet only for CSS a shared module imports; everything a single route imports is **inlined into
that route's own `<style>`**.

Three plans hit this from three directions — 05-07 (this gate, blind while `photos.css` ships
inline), 05-08 (`grep -c 'pd-exif'` returning **5** on a page rendering none), 05-12
(`.ph-lb-caption` invisible to any `dist/client/**/*.css` reader, which made a negative control
refuse rather than pass — the right outcome, by luck). **This is a phase-level fix, not a
plan-level one.**

**Measured:** `dist/client` emits **1** linked stylesheet (126,892 B) and **7** distinct inline
`<style>` texts (142 + 59 + 819 + 1,198 + 3,112 + 3,657 + 3,669 B). The gate now reads
**8 sources, 139,548 B**.

**Proven load-bearing rather than assumed.** `--pub-gutter: var(--space-2)` planted in `.hm-a`:

```
   in a linked .css file : 0
   in an inline <style>  : 1
GATE EXIT (planted) = 1
  x rung COUNT: layout-ladder.ts declares 4 rung(s); the built CSS carries 5 `--pub-gutter`
      declaration(s) [base:--space-4, base:--space-2, 375:--space-6, …]
  x rung 2 TOKEN: layout-ladder.ts says `--space-6`; the built CSS says `var(--space-2)`
      (at the base rung, in dist/client/index.html <style> #1)
```

Before the repair that declaration was invisible while silently disagreeing with `GUTTER_RUNGS` —
which composes the `sizes` attribute of every gallery image, so a divergence downloads the wrong
variant of all 40 photographs with no visual symptom at all.

**No verdict changes today** — none of the seven declares `--pub-gutter` or a `.pub-max-*` rule.
That is precisely when to make a change like this. `rel()` is now idempotent, because a declaration
source carries a **label** (`dist/client/index.html <style> #1`) rather than a path.

**`assert-font-families.mjs` reads both sources from its first line**, for the same reason.

---

## The font gate

```
assert-font-families: PASS
  read 8 stylesheet(s) (139,548 B): 1 linked + 7 distinct inline <style>
  self-test: 7/7 rules flagged their canary and ignored their anti-canary
  12 @font-face rule(s), 3 distinct famil(y/ies):
    Playfair Display  declared as "Playfair Display Variable"    8 rule(s), 8 emitted asset(s)
    DM Sans           declared as "DM Sans Variable"             2 rule(s), 2 emitted asset(s)
    IBM Plex Mono     declared as "IBM Plex Mono"                2 rule(s), 4 emitted asset(s)
  14 font asset file(s) emitted; none named for a forbidden family.
  absent as an @font-face family and as an asset name: Inter, Archivo, JetBrains Mono, Newsreader
  documents carry data-brand="monochrome"; the tokens that reach the page:
    --font-serif    -> "Playfair Display Variable"   from `:root[data-brand=monochrome].dark`
    --font-body     -> "DM Sans Variable"            from `:root[data-brand=monochrome].dark`
    --font-mono     -> "IBM Plex Mono"               from `:root[data-brand=monochrome].dark`
    --font-display  -> "Playfair Display Variable"   from `:root[data-brand=monochrome].dark`
```

**12 face rules, 8 + 2 + 2** — the plan's measurement confirmed exactly.

### 🔴 The plan's three family names are red on a correct build

`<interfaces>` states *"The three families are **Playfair Display, DM Sans, IBM Plex Mono**"* and
task 2 says to *"assert it is **exactly** the three"*. The artefact declares **"Playfair Display
Variable"** and **"DM Sans Variable"** — `@fontsource-variable` names its variable cuts with that
suffix. A set equality against the spec's literals fails on every correct build. Each required family
now carries a **pattern** that accepts the optional suffix and nothing else, and the census prints
the names **as declared**, so the discrepancy stays visible rather than being smoothed over.

### 🔴 F4 — the assertion the plan does not have, and it is the load-bearing one

The plan asserts a family set and an emitted asset per family. Both pass on a page that renders
Playfair as Georgia. Measured: **`tokens.css`'s defaults are live in the artefact**, and what
overrides them is not import order but **specificity, conditional on an attribute**:

```
:root                          --font-serif: "Newsreader Variable", Georgia, serif   (0,1,0)
:root[data-brand=monochrome]   --font-serif: "Playfair Display Variable", …          (0,2,0)
```

So **F4** follows the four font tokens to their winning declaration (resolving one level of `var()`
— `--font-display: var(--font-serif)` is real and ships) and asserts the head of each stack is a
family that is actually `@font-face`d.

**Control 5 proves it can fail.** `data-brand` removed from `<html>`:

```
  @font-face rules still shipped: 12          <- F1 passes.  F2 passes.  F3 passes.
GATE EXIT (planted) = 1
  x [F4-FALLBACK]  --font-serif   resolves to "Newsreader Variable" under `:root`, and NO
                                  @font-face declares it. The browser will fall back.
  x [F4-FORBIDDEN] --font-serif   resolves to Newsreader, one of the four §1.2 forbids.
  x [F4-FALLBACK]  --font-body    resolves to "Inter" …
  x [F4-FALLBACK]  --font-mono    resolves to "JetBrains Mono" …
  x [F4-FALLBACK]  --font-display resolves to "Archivo" …          (8 findings)
```

**Every face rule still ships, every asset still exists, and all four tokens fall back to the four
forbidden families.** That is §1.2's named failure — *"renders Playfair as Georgia and looks almost
right"* — caught statically, on a build the plan's assertions all pass.

**F3 is narrow, and the plan is right that it must be.** Re-measured rather than trusted: the
emitted CSS carries `--font-body: "Inter"`, `--font-mono: "JetBrains Mono"`,
`--font-display: "Archivo"`, `--font-serif: "Newsreader Variable"` and
`primitives.css:2821`'s `font-family: var(--serif, "Newsreader", Georgia, serif)`. All five are
**fallback stack entries in the design system's own token defaults**, in stylesheets 05-01 mandates
importing whole. A raw-byte sweep is unpassable on every correct build.

**The browser half is handed to 05-15 by name**, in the gate's header and in its PASS output:
*"the browser half — at most three families DOWNLOAD — is plan 05-15's audit, not this gate's."*

---

## Every gate proven able to fail

The interactive shell is **zsh 5.9**; **every control ran as `bash <file>`**, never `bash -c '…'`.
No `${PIPESTATUS[0]}`, no `( cmd && R=0 || R=1 )` — `if cmd; then …; else …; fi` throughout. Every
planter asserted its anchor occurs **exactly once** before writing, **re-asserted the plant at check
time**, and verified the restore by sha256 (and `cmp`) against a backup **outside the repository**.

### `assert-public-routes-ship-no-js.mjs` — nine controls, in bash

| # | Control | Exit | Diagnostic |
|---|---|---:|---|
| **1** | **THE NAMED NEGATIVE CONTROL (§5.3, §16.7)** — `client:load` on `<Chip>` in `src/pages/resume.astro` | **1** | **6 findings.** `[A1-ISLAND] dist/client/resume/index.html: carries 16 <astro-island> element(s) — a client:* directive reached this route. Chunk(s): /_astro/Chip.BEnYfVhu.js …` plus `[A1-CHUNKREF]`, `[A2-COUNT]`, `[A2-SCRIPT-SET]`, 2 × `[A2-BOOTSTRAP-LEAK]` |
| | restored, rebuilt | **0** | census printed |
| **2** | PLANTED — a second `<script is:inline>` in `PublicLayout.astro` | **1** | `x [A2-THEME] dist/client: 2 distinct inline script text(s) appear on ALL 52 document(s); §5.2 permits exactly one` — both candidates listed with byte counts and a document |
| **3** | PLANTED — the design-system **barrel** | **0** | **THE CONTROL DOES NOT RUN.** +539 B; A4 and A6 both silent. `gate:ds` exit **1** at source. See above. |
| **3b** | PLANTED — `components/Sortable` (§1.1's dnd-kit positive) | **1** | `[A6-APP] 68,442 B over by 49,442` · `[A6-TOTAL] 260,679 B over by 20,679`. **A4 silent** |
| **3c** | the same chunk, read directly | — | `/dnd-kit/i -> ABSENT`; `dndKit` @48218, `DndContext`, `droppable`, `Draggable item` PRESENT |
| **3d** | PLANTED — `components/RichText` (§1.1's tiptap positive) | **1** | **A4 ×3 AND A6 ×3.** `[A4-FAMILY] … found "ProseMirror" at offset 51616` · `"highlight.js"` · `"prosemirror"` · totals 144,405 / 558,873 / **703,278 B** |
| **4** | PLANTED — the island imports `src/lib/photo-pipeline.ts` | **1** | `[A5-PIPELINE-CRYPTO] … matches /node:crypto\|createHash/ — found "createHash" at offset 14738`. `PIPELINE-PATH` silent — two markers required |
| **5** | **NOTHING TO CHECK** — six shapes, all exit **1** | **1** ×6 | a missing root · an empty directory · a directory with no HTML · HTML but no gallery route (`a gallery route derived from site_config.json was not built`) · the empty-string argument (`path.resolve(cwd, '') is cwd, so this would have walked the entire repository`) · a file rather than a directory |
| **6** | **CORRECT CODE** — the real `dist/client` | **0** | the census, quoted below |
| **7** | **WALK-THROUGH** — three attempts | **1** ×3 | see below |
| **8** | 05-12's un-tree-shaken helper, reproduced | **1** | `[A6-APP] 19,298 B, over by 298 B` |
| **9** | this plan's own `NODE_ENV=production` fix reverted | **1** | `[A6-DEV-BUILD]`, both dev chunks named, **0** ceiling findings |

**Control 1's two hashes, in full, as the control printed them:**

```
sha256 BEFORE = db420d3037720e187e3cd0e6d35b5494204f5d50986d0cfccdba5f1da0d9aaea
GATE EXIT (planted)  = 1        6 findings, naming dist/client/resume/index.html
                                and /_astro/Chip.BEnYfVhu.js
sha256 AFTER  = db420d3037720e187e3cd0e6d35b5494204f5d50986d0cfccdba5f1da0d9aaea
RESTORE: byte-identical
GATE EXIT (restored) = 0        census printed
```

Every other planted file, same discipline:

```
src/layouts/PublicLayout.astro          f56e907cc8acb131ae042216a3d12a85c05eaa5bb0843b029cec2652a8544810  (×3 plants)
src/components/public/PhotoLightbox.tsx bea7cbcd73c36e26224840c19ef2713c9b38a72edb776747b23eec682ebe7749  (×5 plants)
src/components/public/ExifList.astro    156d5f55c2e2da5ab585bda71ca595bfe2c4cf5c6a15bd4bba32b07bd9d34fba
src/styles/design-system.css            850549b989e4a4cf623799beaadf9d29593b5e7b1582abe86010b9524bfed1d8
src/styles/home.css                     1b8cc50df898362eae030bce744ffa695b9f2291eea93c70ca7c969ed83fec91
test/setup/preview-server.ts            769cdf570c841c4c9650b7d2f93eb98e3b21607d0680f6daa5f12253a7c661e7  (cmp + sha256)
```

All twelve restores byte-identical; backups in `mktemp -d` directories **outside the repository**.

### Control 7 — the walk-through, recorded as residuals rather than as completeness

| Attempt | Result |
|---|---|
| **W1 · `client:only="react"` on a static route** | **CAUGHT**, 6 findings. `client:only` emits an `<astro-island>` with no SSR output, so A1 catches it by the same predicate as `client:load`. Not special-cased, and does not need to be. |
| **W2 · a hand-written `<script is:inline src="/_astro/react-dom…js">` in a page** | **CAUGHT**, 18 findings — 16 × `[A1-SRC]` naming the attribute verbatim, plus `[A1-CHUNKREF]` and `[A2-COUNT] carries 17 <script> block(s)`. |
| **W3 · a directive two levels below the route** — `[slug].astro` → `ExifList.astro` → `<Eyebrow client:visible>`, on 40 zero-JS documents that name neither the component nor the file | **CAUGHT**, **120 findings**, `[A1-ISLAND]` on **39** documents (the 40th is `product-peppers`, which renders no EXIF — 05-12 measured the same 39). |

**Named residuals, OPEN:**

- **A4 is case-insensitive and therefore matches `lowLight`.** Found by the gate's own self-test on
  its first run. Accepted, with the reason in the source.
- **A4 is a text match on minified output.** Two patterns now, both measured against real chunks —
  but a third family whose minified identifier nobody has read is still invisible. **A6 is the
  answer to that class, and is why it exists.**
- **A2 cannot tell an authored script from Astro's own by reading it.** Closed by *counting* —
  exactly two non-theme texts, on the hydrating documents and nowhere else. Relax that to "at most"
  and a script planted only in the gallery template gets through. The count is exact for that reason.
- **`public/` could ship a hand-written `.js`.** It would count against `total` but no document
  would name it, so it would land in `vendor` and be blamed on React. None exists today.
- **`dist/client` is only as good as the last build.** `gate:origin`'s blind spot 3, in a second
  place. Closed by CI running the chain twice — and this plan made the second run mean what it says.

### `assert-font-families.mjs` — five controls

| # | Control | Exit | Diagnostic |
|---|---|---:|---|
| 1 | PLANTED — a CSS file declaring `font-family: Inter` | **1** | `[F3-FAMILY] Inter is declared as an @font-face family ("Inter")` plus `[F1-EXTRA]` and 3 × `[F1-MISSING]` |
| 2 | PLANTED — the `fonts/monochrome.css` `@import` removed, rebuilt | **1** | `ZERO @font-face blocks parsed from 8 stylesheet(s)` — the refusal that names §1.2's UNVERIFIED by name |
| 3 | **NOTHING TO CHECK** — four shapes | **1** ×4 | an empty directory · CSS with no `@font-face` · the empty-string argument · a missing root |
| 4 | PLANTED — one forbidden **asset filename** in a root that otherwise **PASSES** (verified exit 0 first, or the control proves nothing) | **1** | `[F3-ASSET] …/jetbrains-mono-latin-400-normal.abc12345.woff2: an emitted font asset is named for JetBrains Mono` |
| 5 | PLANTED — `data-brand` removed from `<html>` | **1** | 8 × F4 findings; see above |
| 6 | **CORRECT CODE** | **0** | the census above |

**Control 2 is narrower than the plan expects, and that is the artefact's shape, not a weakening.**
The plan asks to *"remove one of the three `@import` lines … exit 1 naming the missing family"*.
There is **one** `@import` producing all three families and all twelve rules, so removing it removes
everything and the gate answers with its zero-`@font-face` refusal. Per-family `F1-MISSING` is
proven separately by control 1, which names all three.

### The chain names its failing gate

| Plant | Result |
|---|---|
| a second inline script → `gate:public-js` (8th of 11) | `npm run gate:content` exit **1**, last banner `> akhilsaxena-portfolio@0.0.0 gate:public-js` |
| a barrel import → `gate:ds` (3rd of 11) | exit **1**, banner `> akhilsaxena-portfolio@0.0.0 gate:ds`, and **2** PASSes before it — the chain short-circuits where it fails |

Each of the seven gates was additionally run with an empty root and each exits **1**.
`gate:public-js`, `gate:fonts`, `gate:ladder` and `gate:exif` name themselves on their first line;
`gate:placeholders` and `gate:ds` print a `BUILD REFUSED` banner naming their **concern** rather than
their filename — npm's own banner supplies the script name, so the chain is not anonymous either way.

---

## The census on PASS

```
assert-public-routes-ship-no-js: PASS
  scanned 52 document(s) under dist/client
    43 zero-JS + 8 hydrating + 1 404 = 52
  self-test: 10/10 rules flagged their canary and ignored their anti-canary
  <script type="module"> across the whole artefact: 0
    (Astro 7 emits none — §5.3's assertion 1 is spelled for Astro 4 and would pass on a page
     shipping React. See this file's header.)
  inline script texts: 1 theme (1452 B, on all 52) + 2 bootstrap
       316 B on 8 doc(s)
      4380 B on 8 doc(s)
  chunks: 3; forbidden-family sweep read 215,316 B across 6 source(s)
  build mode: PRODUCTION — 2 chunk(s) carry React's production error-code form, 0 carry a
              development message
  client JavaScript, RAW BYTES ON DISK:
    app       17,451 B /  19,000 B ceiling   (1 chunk(s),  1,549 B headroom)
    vendor   191,717 B / 200,000 B ceiling   (2 chunk(s),  8,283 B headroom)
    total    209,168 B / 240,000 B ceiling   (3 chunk(s), 30,832 B headroom)
    app is the island entry chunk(s); vendor is everything else. They partition the artefact,
    and app + vendor === total is asserted, not assumed.
        180,630 B  /_astro/client.CHz_MA6t.js
         17,451 B  /_astro/PhotoLightbox.jLpnyao1.js  [app]
         11,087 B  /_astro/react-dom.CAGmFW3z.js
  worst route by reachable chunk bytes: dist/client/photos/abstract/index.html — 209,168 B
  every zero-JS route reaches 0 B, asserted rather than sampled (43 document(s)).
```

**"PASS over zero pages and PASS over fifty-two are the same sentence, and only one of them is a
pass."** The route sets are **derived** — `dist/client/photos/index.html` plus one per record in
`data/site_config.json` (7 categories), everything else `*.html` that is not `404.html`. A gallery
route in the config that was not built is a refusal naming it, so a route that **vanishes** is caught
as well as one that is added.

---

## CI — the measurement, and the answer

**No new step was needed, and that was measured rather than asserted.** `npm run build` ends with
`gate:content`, so the four dist-scoped additions run against the artefact the Build step just made;
the existing "Re-assert the gates" step runs the same eleven against the artefact `npm test`
rebuilt. Both were run in exactly that sequence:

```
npm run check        EXIT=0
npm run typecheck    EXIT=0
npm run build        EXIT=0
gate:content (1)     EXIT=0        11/11 PASS
npm test             EXIT=0        41 files, 1488/1488
gate:content (2)     EXIT=0        11/11 PASS
```

`.github/workflows/ci.yml` changed **by comment only** — the eleven gates in order, the measurement
above, the note that a failing gate is named, and a strengthened warning on the re-assert step
(it now protects six dist-scoped gates rather than two).

### The chain, and a stale instruction in the plan

The plan lists `gate:ds-imports` and `gate:ladder` as additions. **Both already exist** —
`gate:ds` since 05-01 and `gate:ladder` since 05-07, and both were already chained. Adding
`gate:ds-imports` would have been a second name for one script. Five were genuinely new:

```
gate:content = gate:schema && gate:sinks && gate:ds && gate:photo-date && gate:exif
             && gate:origin && gate:routes && gate:public-js && gate:fonts
             && gate:placeholders && gate:ladder
```

Source-scoped and cheap first; dist-scoped after.

---

## `05-DS-FINDINGS.md` — twenty findings, none blocking

Read out of `05-06` … `05-13` and **re-opened against the installed `2.0.0-beta.1` before being
written down** — every citation was verified, not remembered. The plan expects eight; there are
twenty, in three groups: the eight it names, D-9's correction, and eleven more the same plans
produced.

Sample of what re-verification changed or confirmed:

- **D-2** `--ds-appbar-h` is declared at `primitives.css:5584`, **inside** `.ds-atom-appbar`, while
  the docstring at `:5560` tells a consumer to use it from a sibling. Custom properties do not
  inherit to siblings. **And the declared 47px is 10px short of the 57px the bar renders**, so even
  a faithful local copy would be wrong. The UI-SPEC's *"closed upstream — do not re-measure"* is
  **false**, now measured three times.
- **D-3** `primitives.css:3638` — `height: 40px`; the file carries exactly **two**
  `@media (pointer: coarse)` blocks and neither mentions the segmented button.
- **D-5 / D-6** `Button.d.ts:11` has no `as`; `Link.d.ts:20` has `as?: ElementType`. Three
  components have it, four do not — filed as **one** finding, because the inconsistency is the defect.
- **D-7** `Heading.d.ts:6` stops at `4xl`; `tokens.css:212` ships `--text-4xl-plus: 52px` and the
  file also ships `--text-5xl: 60px`.
- **D-8** `@media print` occurs **0** times across `themes/monochrome.css`, `primitives.css` and
  `tokens.css`; `force-light` **0** times.
- **D-9** §4.6c's *"`Chip` clobbers `className`"* does **not** reproduce — it concatenates. The
  stale precaution is **retired**, not carried into 05-15.
- **D-17** `.ds-atom-lightbox-close` declares 40px at (0,1,0); `.ds-atom-iconbtn[data-size="md"]`
  declares 32px at (0,2,0) — `primitives.css:1743` and `:244`. The component's own rule never
  applies. `size="lg"` at `:248` is already 40px.

**No `!important` in any stylesheet** — `git grep -c '!important' -- src/styles/` matches nothing;
the three occurrences under `src/` are prose explaining why it was not used.

---

## 🔴 Defective verify commands and premises in the plan

| # | Where | What |
|---|---|---|
| **1** | Task 1 `<action>` + `<done>` #3, and the objective | **The 40,000 B ceiling is red on a correct build** (209,168 B). Derived from §1.1's Lightbox *source module graph*, which omits the 191,717 B of React any island requires. Replaced with three measured ceilings. |
| **2** | Task 1 `<done>` #3, and the objective's *"Its negative control is free"* | **The barrel plant fires neither A4 nor A6** — it tree-shakes to +539 B. The plan requires both to fire, which no correct implementation can satisfy here. Replaced with §1.1's two other named controls; `gate:ds` is the real control and was run under the same plant. |
| **3** | `<interfaces>` assertion 4 / §5.3 | **`/dnd-kit/i` cannot fire on a chunk that carries dnd-kit.** Second pattern added, canaried against the string read out of the chunk. |
| **4** | `<interfaces>` font families / Task 2 `<action>` | *"exactly the three families … Playfair Display, DM Sans, IBM Plex Mono"* — the artefact declares **"Playfair Display Variable"** and **"DM Sans Variable"**. A literal set equality is red. |
| **5** | Task 2 `<done>` #2 | *"remove one of the three `@import` lines … exit 1 naming the missing family"* — there is **one** `@import` for all three families, so the correct answer is the zero-`@font-face` refusal. Per-family naming proven by a different control. |
| **6** | `<interfaces>` §5.3 assertions 1 and 3, §5.2 | **Spelled for Astro 4.** 05-12 logged this; re-measured and re-spelled here. Assertion 1 vacuous, assertion 3 red, §5.2 refuses the one route it permits. |
| **7** | Task 3 `<action>` script list | `gate:ds-imports` and `gate:ladder` **already exist and were already chained.** Five gates were genuinely new, not seven. |
| **8** | Task 3 `<done>` | *"Seven reverts, seven quoted messages"* against `gate:content` — decomposed instead: seven per-gate refusals, plus two chain runs proving npm names the failing script. Recorded rather than silently reinterpreted. |
| **9** | §16.5 / §1.2 | The browser half (*"exactly three families download"*) is **not** answered by this plan and is handed to 05-15 by name, in the gate's header and its PASS output. |
| **10** | Task 1 `<verify>` and Task 2 `<verify>` | **Both are sound and both pass as written.** Recorded because eight of the nine items above are defective, which makes the two that are not worth confirming rather than assuming. |

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Bug] The plan's byte ceiling is red on a correct build**
- **Found during:** Task 1, the first run. **Fix:** three measured ceilings replacing one guessed
  one, each a named sum with its measurement in the source. **Commit:** `a0d394b`

**2. [Rule 2 — Missing critical functionality] Assertion 4 could not fire on dnd-kit**
- **Found during:** Task 1 control 3c. **Fix:** `FAMILY_MINIFIED_IDENTIFIERS`, canaried against the
  string read from a real chunk. §5.3's five names kept verbatim beside it. **Commit:** `a0d394b`

**3. [Rule 1 — Bug, in my own gate] The `app` bucket followed transitive imports**
- **Found during:** the first PASS attempt — it reported 28,538 B against its own 19,000 B ceiling,
  because `react-dom` is reachable from the island. **Fix:** `app` is the island **entry** chunks;
  `app + vendor === total` is now asserted. **Commit:** `a0d394b`

**4. [Rule 1 — Bug, in my own gate] The A4 anti-canary was flagged by its own rule**
- **Found during:** the self-test, before the gate ever read the artefact. **Fix:** anti-canary
  corrected and `lowLight` recorded as an accepted residual rather than silently broadening or
  narrowing. **Commit:** `a0d394b`

**5. [Rule 1 — Bug, in my own gate] An unauthorised island's chunk was blamed on `vendor`**
- **Found during:** control 1. `Chip.*.js` landed in the React bucket because `appEntries` was
  collected only inside the *permitted* branch. **Fix:** attribution first, permission second.
  **Commit:** `a0d394b`

**6. [Rule 1 — Bug, in my own gate] The theme-script refusal named the wrong cause**
- **Found during:** control 2. **Fix:** the theme is the one text present on every document.
  **Commit:** `a0d394b`

**7. [Rule 1 — Bug] `assert-gutter-ladder.mjs` was blind to every inlined declaration**
- **Found during:** Task 3, and named in the brief as the phase's third sighting. **Fix:** 1 source
  → 8. Proven load-bearing with a plant that lands in **0** `.css` files and **1** inline `<style>`.
  **Commit:** `3b34998`

**8. [Rule 3 — Blocking] `npm test` left a React DEVELOPMENT bundle for CI to re-assert against**
- **Found during:** Task 3's first full verify — `gate:content` exit 1 at 411,410 B. **Fix:**
  `NODE_ENV=production` for the harness build, plus in-gate detection that reports the cause instead
  of comparing ceilings. Both proven. **Commit:** `fa1ce74`

### Deliberate additions to the plan's file list

**1. `scripts/assert-gutter-ladder.mjs`** — the brief instructs: *"If your plan does not already own
this, fix `assert-gutter-ladder.mjs` and say so."* It does not; it is fixed; this says so.

**2. `test/setup/preview-server.ts`** — required by finding 8. Without it, chaining `gate:public-js`
into `gate:content` turns CI red on `main`, because CI runs the chain after `npm test`. Not a
preference: the gate cannot be wired without it.

**3. `assert-font-families.mjs`'s F4** — the plan's three assertions all pass on a page that renders
Playfair as Georgia. Rule 2.

### Investigated and left alone

- **`test/content/build-fails-loudly.node.test.ts` failed once**, on the run immediately after the
  `NODE_ENV` change (`expected 1 to be +0`, the sandbox build exiting 1). **It is the recorded
  intermittent** (`deferred-items.md`, `d305905`). Checked whether it could be mine: that suite runs
  `astro build` **directly** via `execFile`, not `npm run build`, so the eleven-gate chain is not in
  its path, and it inherits `process.env` unchanged by my edit — `productionBuildEnv` is a different
  code path used only by the integration harness's own build. Re-run in isolation: **11/11 green**.
  Re-run as part of the full suite: **1488/1488 green**, twice. Not reproduced consistently, not
  mine.
- **`astro check` prints six warnings while reporting "0 warnings"** — 05-12's finding, reproduced,
  out of scope. `ts(6196)` on `PhotoGrid.astro:57` remains pre-existing.

### Deliberate non-actions

- **`data/*.json` was read and never written.** `git status data/` is empty. `site_config.json` is
  read by the gate to derive the hydrating route set and is never modified.
- **No local workaround for any design-system gap.** Twenty findings, zero `!important`, zero forks.
- **No `git add -A`, no `git add .`, no `git checkout -- <file>`, no `stash`/`reset`/`clean`/
  `worktree`.** Every commit used explicit paths in both `git add` and `git commit -- <paths>`, and
  each was checked with `git diff --diff-filter=D --name-only HEAD~1 HEAD` — all four empty.
- **No scratch file in the repository.** Every planter, control and backup lives in `/tmp` outside
  the tree. `npm run check` scans untracked files and is green.
- **Ports 6006 and 5173 untouched.** The integration harness binds an ephemeral port.
- **`STATE.md` and `ROADMAP.md` not modified**, per the brief.
- **`package.json` left buildable for 05-15**, which edits it next: the change is additive — five new
  `gate:*` keys and one rewritten `gate:content` line. No dependency was added or moved, and
  `package-lock.json` is untouched.

---

## What 05-15 inherits

- **`gate:fonts` answers the static half of §1.2 and says so in its own output.** The browser half —
  *at most three families download, and Playfair is not Georgia* — is 05-15's, and §16.5 still owes it.
- **`package.json` is additive-only from this plan**, so a dependency edit will not conflict.
- **`05-DS-FINDINGS.md` is the input to `2.0.0-beta.2`**, with D-9 recorded as a **retirement** so
  the stale `Chip` precaution is not carried further.
- **The ceilings are tight by design.** `app` has 1,549 B of headroom. Anything 05-15 adds to the
  island's module — including a build-time helper exported beside it — will red the build, by
  design. `src/lib/photo-lightbox.ts` is where such a helper goes.

---

## Self-Check: PASSED

```
FOUND: scripts/assert-public-routes-ship-no-js.mjs            (918 lines)
FOUND: scripts/assert-font-families.mjs                       (559 lines)
FOUND: .planning/phases/05-public-site/05-DS-FINDINGS.md
FOUND: a0d394b  feat(05-14): the public-JS gate, and a byte ceiling in raw bytes on disk
FOUND: 54949e6  feat(05-14): the font gate — three families, and the token that reaches the page
FOUND: 3b34998  fix(05-14): the ladder gate was blind to every declaration Astro inlines
FOUND: fa1ce74  feat(05-14): chain eleven gates into gate:content, and stop CI re-asserting a dev bundle
```

`min_lines` for `assert-public-routes-ship-no-js.mjs` is 80; it is **918**.
No commit in this plan deleted a tracked file.
