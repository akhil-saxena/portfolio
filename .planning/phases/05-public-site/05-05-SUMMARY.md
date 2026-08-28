---
phase: 05-public-site
plan: 05
subsystem: public-image-pipeline-contract
tags: [srcset, sizes, layout-ladder, photo-slug, bl-8, pub-05, pub-14, workerd]
requires:
  - "05-01 (registry install, gate:ds chained into gate:content)"
provides:
  - "src/lib/photo-variants.ts — VARIANTS, THUMB, PHOTO_ID_SEPARATOR, VariantTable types. Zero node: imports."
  - "src/lib/layout-ladder.ts — GUTTER_RUNGS, BREAKPOINTS, MASONRY_GAP, PAGE_MAX, gutterAt. Zero imports at all."
  - "src/lib/photo-srcset.ts — srcsetFor, sizesFor, photoSlug, photoHref"
  - "photoSlug / photoHref: the SINGLE definition of /photos/<category>/<slug> (BL-8)"
affects:
  - "05-06 (writes the CSS the ladder is gated against; owns scripts/assert-gutter-ladder.mjs)"
  - "05-07 (gallery tile: MUST import photoHref and srcsetFor/sizesFor, never re-derive)"
  - "05-08 (photo detail route: MUST import photoSlug/photoHref for getStaticPaths)"
  - "05-14 (§5.3 assertion 5 — photo-pipeline.ts in no client chunk)"
  - "every Phase 4 Actions script, via the photo-pipeline.ts re-export (unchanged surface)"
tech-stack:
  added: []
  patterns:
    - "constants move DOWN into a node-free leaf and are re-exported, never copied"
    - "referential identity (toBe) as the assertion that a move was a move"
    - "textual rules count over COMMENT-STRIPPED source, with the stripper carrying its own canaries"
    - "a probe route that renders the module in workerd, because a green vitest run is not evidence"
key-files:
  created:
    - src/lib/photo-variants.ts
    - src/lib/layout-ladder.ts
    - src/lib/photo-srcset.ts
    - test/public/layout-ladder.unit.test.ts
    - test/public/photo-srcset.unit.test.ts
  modified:
    - src/lib/photo-pipeline.ts
    - test/pipeline/photo-pipeline-contract.unit.test.ts
    - .planning/phases/05-public-site/deferred-items.md
decisions:
  - "PHOTO_ID_SEPARATOR moved into photo-variants.ts too — photoSlug is the id join read backwards and runs in workerd, so a local '-' would be a second definition of the separator"
  - "MASONRY_GAP is declared, not derived from GUTTER_RUNGS[0]: both are --space-4 by coincidence, not by rule"
  - "the plan's no-literals grep is replaced by a comment-stripping node read whose forbidden list is derived from the ladder"
  - "sizesFor refuses any column count outside {2,3}, and the suite proves the refusal is safe against the real site_config"
metrics:
  duration: "~2h"
  tasks: 3
  commits: 6
  completed: 2026-08-28
---

# Phase 5 Plan 05: srcset, sizes and the photo href — Summary

§7.4's UNVERIFIED is measured, the hazard it names is structurally removed, and **BL-8 — the slug
and href definition two wave-4 plans were both told to assume and neither defines — now exists,
is exported, and is asserted against all 40 real records.**

**Three things the plan or the UI-SPEC said did not survive contact.** The plan's own probe
filename could never have produced a measurement. Its final `grep -rn "node:"` verification can
never pass. And its no-literals grep fires on correct code — reproduced, both directions.

---

## The exports two wave-4 plans depend on

```ts
// src/lib/photo-srcset.ts
export function photoSlug(photo: PhotoIdentity): string   // id minus `category + '-'`
export function photoHref(photo: PhotoIdentity): string   // `/photos/${category}/${slug}`
export function srcsetFor(photo: PhotoSources): string
export function sizesFor(columns: number): string
export type PhotoIdentity = { readonly id: string; readonly category: string }
export type PhotoSources  = { readonly urls: Readonly<Record<string, string>>
                              readonly dimensions: { readonly width: number; readonly height: number } }

// src/lib/layout-ladder.ts
export const GUTTER_RUNGS: readonly GutterRung[]   // 4 rungs, base first
export const BREAKPOINTS: readonly number[]        // DERIVED from GUTTER_RUNGS
export const MASONRY_GAP: { token: string; px: number }
export const PAGE_MAX: { home; work; photos; band }
export function gutterAt(width: number): number
export type GutterRung = { minWidth: number | null; token: string; px: number }

// src/lib/photo-variants.ts
export const VARIANTS, THUMB, PHOTO_ID_SEPARATOR
export type VariantTable, VariantTableFor
```

**`05-07` and `05-08` must IMPORT `photoHref` / `photoSlug`. Neither may re-derive.** `PhotoIdentity`
is deliberately `{ id, category }` and not `Photo`, so a route that has only those two fields in
hand — a `getStaticPaths` entry, say — can call it without loading a whole record.

`PhotoIdentity` and `PhotoSources` are **subsets** of `Photo` from `src/schemas/photo.ts`, not rival
declarations of it. `gate:schema` passes (`assert-single-schema-source: PASS`); a real `Photo`
satisfies both.

---

## BL-8 — the slug proofs, against the real 40 records

Not fixtures. `test/public/photo-srcset.unit.test.ts` reads `data/portfolio_images.json` and
iterates it. **No assertion anywhere counts the records** — floors only (`>= 39`), so record 41
strengthens every loop instead of turning it red.

| Proof | Result |
|---|---|
| every id begins with `category + '-'` | **40/40** |
| `category + '-' + photoSlug(photo) === photo.id` round-trips | **40/40** |
| no empty slug | **40/40** |
| distinct `category + '/' + slug` pairs === `manifest.length` | **40 === 40** |
| `photoHref(photo) === '/photos/' + category + '/' + photoSlug(photo)` | **40/40** |
| every href unique across the WHOLE manifest, not just per category | **40 distinct** |
| every href root-relative, four segments, no trailing slash, no `//`, no `..` | **40/40** |

Rendered in workerd — the probe page below emitted `data-n="40" data-unique="40"`, so the
uniqueness claim holds in the deployed runtime and not only under vitest.

**The collision gate was proven able to fail by planting the failure itself.** In a
`git clone --no-hardlinks` sandbox I edited `data/portfolio_images.json` so two `abstract` records
shared the slug `intothemist`:

```
× NO TWO photographs in one category produce the same slug
× every href is unique across the whole manifest, not merely within a category
  Tests  2 failed | 30 passed (32)
```

That is the exact wave-7 failure — every tile 404ing against a page under a different slug —
caught in wave 2 by a test rather than by a human clicking a tile.

`photoSlug` **refuses** an id without its category prefix rather than slicing. A silent slice turns
a malformed id into a plausible slug and a 404; the throw names the category so the message is
actionable.

---

## 🔴 The plan's own probe filename could not have measured anything

Task 1 names the probe **`src/pages/__probe-variants.astro`**. I created it, ran `npm run build`,
and got **exit 0** — which reads as "the import is clean."

It is not. `gate:routes` printed the reason in the same run:

```
  not routed by Astro, so not checked (1):
    · src/pages/__probe-variants.astro  —  basename begins with "_" — Astro never routes it
                                           (create-manifest.js)
```

`find dist -iname '*probe*'` → **nothing**. **The page was never built.** The leading underscore is
Astro's convention for a file `src/pages/` should ignore, so the plan's probe measures the build of
a project that does not contain the probe. Exit 0 was vacuous, and §7.4's UNVERIFIED would have
been recorded as resolved on the strength of a build that never compiled the import.

Renamed to `src/pages/probe-variants.astro` and re-run. **This is the fifth-plus instance of a
plan's own verification scaffolding being the defect surface**, and it is a new mechanism: not a
regex that cannot match, but a filename the framework refuses to route.

---

## §7.4's UNVERIFIED, measured — and why the fix was taken anyway

With a routable probe whose frontmatter does `import { VARIANTS } from '../lib/photo-pipeline'`:

| Measurement | Result |
|---|---|
| `npm run build` | **exit 0** |
| page emitted | **yes** — `dist/client/probe-variants/index.html` |
| prerendered content | `<pre data-n="4">VARIANTS.length = 4</pre>` |
| `grep -rl 'node:crypto\|createHash' dist/client/` | **exit 1** (no match), 11 files under `dist/client` |
| `grep -rl 'node:crypto' dist/server/` | **exit 1** (no match), 30 files under `dist/server` |

**A prerendered Astro page CAN import `photo-pipeline.ts` cleanly under the Cloudflare adapter.**
§7.4's UNVERIFIED resolves in the affirmative.

**That is the hazard, not the reassurance.** It works because `wrangler.jsonc` sets
`nodejs_compat`, so workerd supplies `node:crypto` — which is precisely the sentence
`photo-pipeline.ts`'s own header already carries about accidental imports: *"an accidental import
would NOT fail loudly — it would just quietly ship the pipeline into the Worker."* §5.3 assertion 5
requires that boundary to be **provable**, not currently-true, so §7.4's named fix was taken
unconditionally: move the numbers down, **never a second copy**.

The anti-vacuity guard on those greps is the point. `grep` on a missing path exits **2**, which an
`if` reads as clean — five gates in this phase were passing vacuously over paths that do not exist.
Every grep above counted its scan set first (`11 files`, `30 files`) and the exit code is reported
explicitly rather than swallowed by `|| true`.

The probe was deleted inside the task. `test -e` on **both** filenames, plus Task 3's
`probe-srcset.astro`: all absent, working tree clean.

---

## The move is a move, not a copy — proven by making it fail

`VARIANTS`, `THUMB`, `PHOTO_ID_SEPARATOR` and the two `VariantTable*` types now live in
`src/lib/photo-variants.ts` (zero `node:` imports) and are re-exported from `photo-pipeline.ts`.
Every existing importer — five `.mjs` Actions scripts, six Phase 4 plans, the contract test — is
untouched. `photo-pipeline.ts`'s header no longer claims to define the table; it says where it went
and why, and the OD-1 / OD-11 rationale travelled **with** the constants.

**Why `PHOTO_ID_SEPARATOR` moved too, which the plan did not ask for.** `photoSlug` is `photoIdFor`
read backwards and it runs in a prerendered page, so it cannot import `photo-pipeline.ts`. If it
spelled `'-'` itself there would be two definitions of the separator, one invisible to `photoIdFor`
— the same silent, total failure BL-8 exists to prevent. `photoIdFor` itself stays put: it
validates both halves against the schema slug grammar and only the pipeline composes new ids.

`toBe`, not `toEqual`, because referential identity is only possible with one declaration.

### Four-step proof — shell: **bash 5.3.9(1)-release**, in a `git clone --no-hardlinks` sandbox

| Control | Exit | Firing assertion |
|---|---:|---|
| **PLANTED** — re-export replaced by a spread copy | **1** | `toBe` ×2 + the structural rule |
| **PLANTED** — re-inline `export const VARIANTS = […]` | **1** | 4 red |
| **PLANTED** — `const THUMB = {…}; export { THUMB }` | **1** | 2 red |
| **PLANTED** — `export let PHOTO_ID_SEPARATOR = '-'` | **1** | 2 red |
| **PLANTED** — `const SEP = '-'; export { SEP as PHOTO_ID_SEPARATOR }` | **1** | the literal count |
| **PLANTED** — a `node:` import inside `photo-variants.ts` | **1** | the node-free rule |
| **NOTHING TO CHECK** — `photo-pipeline.ts` replaced by `export {};` | **1** | refuses; does not pass over an empty file |
| **CORRECT CODE** — before and after every plant | **0** | 114/114 |

The spread-copy failure, verbatim, and it is the whole argument for `toBe`:

```
AssertionError: expected [ { urlKey: 'original', …(3) }, …(3) ]
             to be [ { urlKey: 'original', …(3) }, …(3) ] // Object.is equality
Expected: [ { urlKey: 'original', …(3) }, …(3) ]
Received: serializes to the same string
```

**"Serializes to the same string" is exactly what `toEqual` would have accepted.**

### Two of those controls exist because the walk-through found holes in my own repair

1. **`const` alone let `export let PHOTO_ID_SEPARATOR = '-'` straight through.** A string is a
   primitive, so `toBe` on it is value equality and cannot tell a re-export from a second
   declaration. The two object exports were never exposed — a fresh array fails `toBe` whatever
   keyword declares it — but the primitive was. Widened to `(?:const|let|var)`, and a separate rule
   added: `photo-pipeline.ts`'s **code** must contain the literal `'-'` zero times, which closes the
   renamed-copy shape (`const SEP = '-'; export { SEP as … }`) that no name-based rule can see.

2. **The literal count fired on its own rationale.** The first revision counted `'-'` raw and
   reported **two** separators in a file with one, because `photo-variants.ts`'s header spells `'-'`
   while explaining why the constant lives there. This is the project's recurring comment-match
   class — the eighth-plus instance. Both files are now counted over **comment-stripped** source,
   with a character scanner rather than a regex (a regex block-comment stripper deletes anything
   between a `/*` inside a string and the next `*/`), and the stripper carries five canaries of its
   own: it must drop a `//` comment, drop a `/* */` comment, keep a real string, and keep
   `'// not a comment'` and `'/* not a comment */'` inside string literals.

**Residual, measured rather than claimed closed:** a separator copy assembled without the literal —
`String.fromCharCode(45)`, `'a-b'.slice(1, 2)` — is invisible to every textual rule here and needs
an AST pass. Same class as 05-01's R1 and `assert-no-raw-html-sinks`'s blind spot 1. The `toBe`
assertions cover the two **object** exports regardless of how a copy is assembled; only the
primitive has this residual, and it is recorded in the test's own comment.

---

## The layout ladder — 32/32, with the token pinned to the real stylesheet

`GUTTER_RUNGS` is the four rungs; `BREAKPOINTS` is `[375, 673, 1024]` **derived**; `MASONRY_GAP` is
`{ '--space-4', 16 }`; `PAGE_MAX` is `{ home: 1080, work: 1280, photos: 1280, band: 1080 }`;
`gutterAt` is the step function.

**The px values are checked against the design system's real `dist/tokens.css`, read off disk**, not
only against `4 × N`. Arithmetic catches a typo in one half of a rung and is blind to the package
renumbering its scale — the one thing a portfolio consuming a published package actually has to
survive. Both checks are made, so neither can ratify the other.

**"Derived" is a fact here, not a claim.** Beyond comparing `BREAKPOINTS` to the rungs, the suite
counts each breakpoint number in the module's comment-stripped code and requires **exactly one**
occurrence. Two literal lists that agree today are the duplication this module removes.

`MASONRY_GAP` is **declared, not derived** from `GUTTER_RUNGS[0]`, even though both are `--space-4`.
That is a coincidence — one is the space between two photographs, the other between the page and
the edge of the screen. Deriving it would make "the gallery needs more air between tiles" silently
move the page gutter.

`gutterAt` **throws** on `NaN`, `Infinity` and negatives. Quietly answering 16 for `NaN` would
present as "the ladder is broken at wide viewports" in 05-15's browser audit — days later, in the
wrong file, looking like a CSS bug.

### Four-step proof — shell: **bash 5.3.9(1)-release**, sandbox

| Control | Exit | Red assertions |
|---|---:|---|
| **PLANTED** — one rung's px `32 → 20` *(the control the plan names)* | **1** | 6, incl. the token/px agreement |
| **PLANTED** — token `--space-8 → --space-9` (no such DS token) | **1** | 2 |
| **PLANTED** — `MASONRY_GAP.px 16 → 20` | **1** | 2 |
| **PLANTED** — `PAGE_MAX.photos 1280 → 1200` | **1** | 1 |
| **PLANTED** — `BREAKPOINTS` restated as its own literal list | **1** | 1 — the exactly-once count, the only rule that can see this |
| **PLANTED** — `gutterAt` `>=` → `>` | **1** | 3 — exactly the three boundary widths |
| **PLANTED** — a `node:path` import | **1** | `expected [ 'node:path' ] to deeply equal []` |
| **PLANTED** — header drops `.pub-footer` | **1** | 1 |
| **PLANTED** — header drops `assert-gutter-ladder.mjs` | **1** | 1 |
| **NOTHING TO CHECK** — token source has no `--space-*` | **1** | 3, refuses |
| **NOTHING TO CHECK** — token source absent | **1** | 3, refuses |
| **CORRECT CODE** — before and after | **0** | 32/32 |

### 🔴 Two of those "results" were harness failures reporting PASS for a defect never planted

The first attempt ran the planters inside `bash -c '…'`. The plant text contains `'--space-8'` —
**single quotes, which terminate the outer single-quoted string.** The substitution never happened
and the harness printed:

```
AssertionError: { minWidth: 673, token: \x27--space-8\x27, px: 32 }
  exit 0  PASS
```

**A harness that reports PASS for an unplanted defect is indistinguishable from a gate that cannot
fail.** It was caught only because the planter asserts its anchor is present and exits 9 otherwise;
without that assertion I would have written "proven able to fail" about two controls that never
ran. This is the same family as Phase 3's 13 subshell harnesses and the zsh `${PIPESTATUS[0]}`
harnesses — a third mechanism. All planting now goes through a file-based script that refuses.

---

## `srcsetFor` and `sizesFor`

### `sizesFor(3)`, verbatim, character for character with §7.4

```
(min-width:1024px) calc((min(100vw, 1280px) - 96px - 32px) / 3), (min-width: 673px) calc((100vw - 64px - 32px) / 3), (min-width: 375px) calc((100vw - 48px - 16px) / 2), calc(100vw - 32px)
```

```
(min-width:1024px) calc((min(100vw, 1280px) - 96px - 32px) / 3),
(min-width: 673px) calc((100vw - 64px - 32px) / 3),
(min-width: 375px) calc((100vw - 48px - 16px) / 2),
calc(100vw - 32px)
```

**Identical to §7.4's block, including the colon spacing.** `(min-width:1024px)` has no space and
`(min-width: 673px)` has one because the widths are **right-aligned to the longest breakpoint** —
`String(minWidth).padStart(pad)` where `pad` is derived from the breakpoint list, so a four-digit
breakpoint appearing or disappearing re-aligns the whole string rather than leaving one clause out
of step. That quirk is reproduced deliberately, not accidentally.

`sizesFor(2)`:

```
(min-width:1024px) calc((min(100vw, 1280px) - 96px - 16px) / 2), (min-width: 673px) calc((100vw - 64px - 16px) / 2), (min-width: 375px) calc((100vw - 48px - 16px) / 2), calc(100vw - 32px)
```

The third and fourth clauses are **identical** to the 3-column form, and a test asserts exactly
that: at ≥375 the ladder is two columns for every category (§7.1), so those clauses cannot differ.

**The expectation does not agree with itself.** The suite types §7.4's string out AND re-reads the
`sizes="…"` block from `05-UI-SPEC.md` on disk, comparing character for character. The chain runs
**committed spec → the test's literal → the module's output**, with no step ratifying itself.
Proven able to fail: editing the spec's `- 32px` to `- 48px` in the sandbox turned that assertion
red.

### `srcsetFor` — §7.4's four measured records, plus the whole corpus

| Record | source w | descriptors emitted |
|---|---:|---|
| `nature-fairwayreflections` | 4608 | `2000w, 1200w, 800w, 400w` |
| `architecture-redbuilding` | 1920 | `1920w, 1200w, 800w, 400w` — the cap does not enlarge |
| `abstract-plane` | 1318 | `1318w, 1200w, 800w, 400w` |
| `architecture-officegreens` | 2000 | `2000w, 1200w, 800w, 400w` — exactly at the cap |

Plus the same claim over **all 40**, with the expectation computed in the test from `VARIANTS`
rather than read from the module. Every URL is the record's own `urls[variant.urlKey]`; the module
contains no origin, no `image-origin` import and no `photo-pipeline` import, and the suite asserts
all three structurally as well as against the data. No `thumb` candidate is ever emitted.

`srcsetFor` **throws** on a missing url key and on a width of `0`, `-1` or `NaN`. A `0w` descriptor
is not an error to a browser — it reads as "no information" and answers by taking the last candidate
regardless of viewport.

`sizesFor` **refuses** anything outside `{2, 3}`. The other half of that refusal, which is what
keeps it honest: the suite reads the real `data/site_config.json` and asserts `sizesFor` accepts
**every** column value that actually occurs there (seven categories plus `defaultColumns`).

### Four-step proof — shell: **bash 5.3.9(1)-release**, sandbox, 12 controls

| Control | Exit | Red |
|---|---:|---|
| `MASONRY_GAP.px 16 → 20` *(the anti-vacuity control the plan names)* | **1** | 2 |
| gutter rung `48 → 40` | **1** | 2 |
| `PAGE_MAX.photos 1280 → 1080` | **1** | 2 |
| `photoSlug` via `split('-')[1]` | **1** | 1 — right on `intothemist`, wrong on a real slug |
| `photoHref` emits `/photo/` | **1** | 3 |
| `srcsetFor` drops `Math.min` | **1** | 3 — the two under-cap records plus the corpus sweep |
| a bare `96` typed into the module | **1** | 1 |
| **slug collision planted in the manifest** | **1** | 2 |
| a record id without its category prefix | **1** | 7 |
| **NOTHING TO CHECK** — manifest is `[]` | **1** | 7, refuses |
| the UI-SPEC `sizes` string edited | **1** | 1 |
| **CORRECT CODE**, before and after | **0** | 32/32 |

**The first three prove the tests read the constants rather than agreeing with literals of their
own** — the anti-vacuity control the plan asks for, and it is now a standing assertion rather than
a one-off experiment: one test recomputes every term of the emitted string from `GUTTER_RUNGS`,
`MASONRY_GAP` and `PAGE_MAX`.

### A defect of mine that failed on CORRECT output

The suite first split the `sizes` list on `', '`. That **also splits inside `min(100vw, 1280px)`**,
so it reported five clauses where there are four and went red against a correct module. Now split at
paren depth zero, with its own canary (`splitClauses('min(1, 2), b')` must be two clauses).

**05-06 will parse this same string in `scripts/assert-gutter-ladder.mjs` and inherits the mistake
if it splits naively — a gate that fires on a correct stylesheet gets turned off.**

---

## Proven in workerd, because a green vitest run is not evidence

05-01's finding: a `node:fs` module passed 13/13 unit tests and detonated on the first real page.
`photo-srcset.ts` is imported by no route in this plan, so `astro check` alone would only typecheck
it. A probe route calling **all four** functions was built, prerendered and deleted:

```html
<pre data-slug="intothemist" data-gutter="48" data-unique="40" data-n="40">/photos/abstract/intothemist</pre>
<img src="…/intothemist-md.webp"
     srcset="…/intothemist.webp 2000w, …-lg.webp 1200w, …-md.webp 800w, …-sm.webp 400w"
     sizes="(min-width:1024px) calc((min(100vw, 1280px) - 96px - 32px) / 3), (min-width: 673px) calc((100vw - 64px - 32px) / 3), (min-width: 375px) calc((100vw - 48px - 16px) / 2), calc(100vw - 32px)"
     alt="Two bundles of overhead cables descend from opposite corners and vanish into flat grey fog.">
```

This settles four things a unit test cannot: the explicit `.ts` import specifiers resolve under
Vite; all four functions execute in workerd; the emitted `sizes` attribute is byte-equal to §7.4;
and **40 records produce 40 unique hrefs in the deployed runtime.**

**§5.3 assertion 5, with the probe page in that dist so the graph really was built:**
`grep -rl 'node:crypto\|createHash' dist/client/` → **exit 1**, 11 files.
`grep -rl 'photo-pipeline' dist/client/` → **exit 1**.
`grep -rl 'node:crypto' dist/server/` → **exit 1**, 30 files.

---

## Corrections to the plan and the UI-SPEC

1. **🔴 `src/pages/__probe-variants.astro` is unroutable.** The leading `_` makes Astro skip the
   file; the probe never built and `exit 0` meant nothing. Any future plan prescribing a probe route
   must not prefix it with an underscore. *(Task 1, and it is the plan's own instruction.)*

2. **🔴 The plan's final verification `grep -rn "node:" src/lib/photo-variants.ts
   src/lib/layout-ladder.ts src/lib/photo-srcset.ts` can never pass.** It finds **10 matches**, all
   prose: every one of those headers has to explain `node:crypto`, because that is the reason the
   files exist. A rule that fires on its own rationale is a rule that gets deleted. The correct form
   is a **specifier-position** check, which is what the suites use and what was run:

   ```
   src/lib/photo-variants.ts  specifiers: [./image-origin.ts]                    node: 0
   src/lib/layout-ladder.ts   specifiers: []                                     node: 0
   src/lib/photo-srcset.ts    specifiers: [./layout-ladder.ts, ./photo-variants.ts]  node: 0
   ```

3. **🔴 The plan's no-literals grep is broken in both directions, and both were reproduced** rather
   than assumed. With a comment reading `/* At the widest rung the gutter term is 96px. Not code. */`
   in an otherwise correct module:

   ```
   $ grep -nE "\b(16|32|48|64|96|1280|375|673|1024)px?\b" src/lib/photo-srcset.ts \
       | grep -v "^\s*[0-9]*:\s*\*" | grep -v "//"
   178:/* At the widest rung the gutter term is 96px. Not code. */
   => FIRES on correct code
   ```

   and `grep -v "//"` silently drops any line carrying a URL, so a real literal on a line with a
   comment containing `https://` is invisible. **The replacement**, whose exact command is below,
   strips comments with a character scanner and **derives** the forbidden values from
   `layout-ladder.ts` instead of hand-typing them:

   ```
   $ node scripts-local/assert-no-ladder-literals.mjs src/lib/photo-srcset.ts
   OK: no literal ladder numbers in src/lib/photo-srcset.ts (checked 11 values:
   16, 24, 32, 48, 375, 673, 1024, 64, 96, 1080, 1280; 13077 code bytes)      exit 0
   ```

   Proven able to fail (a bare `96` in code → exit 1 naming the line), proven **not** to false-alarm
   (the same number in a block comment and in a `//` comment containing a URL → exit 0), and it
   refuses with exit 1 given no argument, a missing file or an empty file. **The enforcing copy is
   the unit test**, which runs on every `npm test` and derives the same list from the same
   constants — a check that only exists in a plan's verify block runs once.

4. **The UI-SPEC's photo count is stale in §7.1 and §7.3** (39 · "all 39 small variants" · "the 39
   `thumb` values"). The manifest is at **40**. Confirms 05-01's finding. **Nothing in this plan
   literals it**; every assertion uses a floor. 05-07 and 05-13 should do the same.

5. **§7.2's `href="/photos/{category}/{slug}"` sketch has no definition of `slug` behind it.** That
   is BL-8 and it is now closed — but the UI-SPEC still reads as though `slug` were a field.
   `PhotoSchema` has no such field; it is derived.

6. **`PHOTO_ID_SEPARATOR` moved, which the plan's artefact list does not mention.** Recorded as a
   deviation below. `must_haves.artifacts` for `photo-variants.ts` should read
   `["VARIANTS", "THUMB", "PHOTO_ID_SEPARATOR"]`.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] The prescribed probe route could not be built**
- **Found during:** Task 1, by reading `gate:routes`' output rather than the exit code
- **Fix:** renamed to `probe-variants.astro`. Both names asserted absent at the end of the task.
- **Commit:** `506866c`

**2. [Rule 2 — Missing critical functionality] `PHOTO_ID_SEPARATOR` moved into `photo-variants.ts`**
- **Issue:** `photoSlug` runs in workerd and so cannot import `photo-pipeline.ts`. A local `'-'`
  would be a second definition of the separator, invisible to `photoIdFor` — the exact silent
  failure BL-8 exists to prevent.
- **Fix:** moved and re-exported, same pattern as `VARIANTS`/`THUMB`. Public surface unchanged.
- **Commit:** `506866c`

**3. [Rule 1 — Bug] The identity control could not see `export let`, and fired on its own prose**
- Both found by the walk-through, not by reading. Widened to `(?:const|let|var)`; added the
  zero-`'-'`-literals rule for renamed copies; both now count over comment-stripped source.
- **Commit:** `506866c`

**4. [Rule 1 — Bug] My own suite split the `sizes` list inside `min(100vw, 1280px)`**
- Failed on correct output. Now splits at paren depth zero, with a canary. Flagged for 05-06.
- **Commit:** `5affcd8`

**5. [Rule 2] The plan's Task 3 verify runs only vitest**
- 05-01 proved that is not evidence on this platform. Added the workerd probe (§ above).

**6. [Rule 2] The no-literals check made enforcing**
- The plan puts it only in a `<verify>` block, which runs once. The same rule, with its list derived
  from the ladder, is now an assertion in `test/public/photo-srcset.unit.test.ts`.

### Out of scope, logged not fixed

Three pre-existing `npm run check` findings (`scripts/lib/r2.mjs`,
`scripts/assert-ds-import-contract.mjs`, `test/pipeline/workflow-contract.unit.test.ts` ×5). All
three files are byte-identical to `HEAD` in this plan's tree, so they are not 05-05's. Recorded in
`deferred-items.md` with the reasoning, and **not** autofixed: `biome check --write` across a shared
index while three plans are mid-edit is the 04-06 sweep with a different tool. 05-05 formatted only
its own five files, by explicit path.

### A rule of my own that I broke

**I ran `git checkout-index -f` once, inside the throwaway sandbox clone**, as the restore step of
control D11. It is on my prohibited list and I should have used the `git show HEAD:<path> >` form I
had already written as its fallback on the same line. **No effect on the live repository** — it ran
in `$SCRATCH/sandbox`, and `git diff --quiet HEAD -- .planning/…/05-UI-SPEC.md` and
`-- data/portfolio_images.json` both confirm the live tree was never touched by any control.
Reported rather than omitted.

---

## Concurrency notes for the coordinator

- **05-02 broke `npm run build` for roughly 40 minutes mid-wave** by committing
  `src/schemas/projects.ts` ahead of its `data/projects.json` counterpart; the content gate refused
  with 10 findings. **05-04's `efca690` also left `astro check` red on `main`** — a TDD RED commit
  whose `test/public/exif-display.unit.test.ts` imports a module that did not yet exist (5 ts errors).
  Both are resolved now (build exit 0, suite 1174/1174), but for ~40 minutes any wave-2 agent
  running `npm run build` got a red result it did not cause.
- **Mitigation used, and worth reusing:** every build and every negative control in this plan ran in
  a `git clone --no-hardlinks` sandbox with `node_modules` symlinked, so my signal was never
  contaminated by another plan's in-flight state and no control could touch the live tree. It also
  removed any temptation to "fix" a neighbour's file.
- **I took the same risk I am flagging**, for the two TDD tasks: a `test(...)` commit that is red on
  its own. Both were followed by their `feat(...)` commit in the same `git commit && git commit`
  invocation, so the window is milliseconds rather than minutes — but the risk is not zero and the
  cleaner shape is a single commit per TDD task in a shared-index wave.

---

## Verification

| Check | Result |
|---|---|
| `npm run build` (live repo, includes `gate:content`) | **exit 0** |
| `npx vitest run` | **1174 passed / 1174, 32 files** (was 1023/1023, 28 files) |
| tests added by this plan | **70** — 32 ladder, 32 srcset, +6 contract (108 → 114) |
| `npx vitest run test/pipeline/` | **529 passed / 529, 15 files** — the Actions regression surface |
| `npm run gate:content` | 5/5 **PASS** (schema, sinks, origin, routes, ds) |
| `npx biome check` on this plan's 5 files | **exit 0** |
| specifier check on the three modules | **0** `node:` specifiers |
| `node assert-no-ladder-literals.mjs src/lib/photo-srcset.ts` | **exit 0**, 11 derived values |
| probe routes absent (3 names) | **all absent** |
| `git diff HEAD -- data/ .planning/…/05-UI-SPEC.md` | **unchanged** |
| working tree | **clean** |
| author/committer on all 6 commits | `Akhil Saxena <saxena.akhil42@gmail.com>` |
| AI attribution anywhere in the 6 commits | **none** |

---

## Known Stubs

None. All four functions are fully implemented and exercised against the real manifest and in
workerd. Nothing in this plan renders to a public route; `05-07` and `05-08` wire the first
consumers.

## Threat Flags

None. No network endpoint, auth path or schema change. `T-05-05-01` (`node:crypto` reaching a
browser chunk) is dispositioned `mitigate` and the mitigation is in place and asserted three ways:
the extraction itself, the `toBe` identity assertion, and the built-artefact grep above. 05-14
re-checks it independently against the emitted chunks, which is the check that matters — this
plan's greps are over a `dist/` it built itself.

---

## For the plans that depend on this one

- **05-07 and 05-08: IMPORT `photoHref` and `photoSlug` from `src/lib/photo-srcset.ts`. Do not
  re-derive.** You are both wave 4, you cannot read each other, and no gate in the phase checks a
  tile href against an emitted page. Two derivations that disagree give a green build, a green suite
  and a 404 on every tile.
- **05-08's `getStaticPaths` must produce exactly `photoSlug(photo)`** for the `[slug]` param. The
  40 hrefs are unique and asserted here; the pages must land on those same 40 strings.
- **Someone should add the check neither of you can:** every emitted tile `href` resolves to a built
  page. The definition is closed; the end-to-end assertion is not, and it belongs to whichever plan
  builds the detail pages.
- **Do not emit `width` / `height` attributes on a gallery `<img>` (§7.2).** `aspect-ratio` plus
  `width: 100%` reserves the box. `width={photo.dimensions.width}` on an `<img>` whose `src` is
  `urls.original` states 4608 for a 2000px image. This module deliberately provides no helper that
  would make it easy; the escape hatch, if Lighthouse's `unsized-images` audit ever objects, is
  §7.2's — emit the **served variant's** size, never the manifest's raw numbers.
- **05-06:** `scripts/assert-gutter-ladder.mjs` compares the built CSS to `GUTTER_RUNGS` rung for
  rung. The five gutter sites are named in `layout-ladder.ts`'s header — `.pub-shell` padding,
  `.pub-bar` margin, the AppBar's own padding, `.pub-footer` margin, the Footer's own padding — and
  **`.pub-footer` is the one that gets missed**. If your gate parses a `sizes` or a `calc()`, split
  on commas at **paren depth zero**; `min(100vw, 1280px)` owns a comma.
- **Derive counts; never literal them.** The manifest is at **40** and the UI-SPEC says 39 in seven
  places. Every assertion in this plan uses a floor.
- **`grep` on a missing path exits 2, which an `if` reads as clean.** Count your scan set first and
  report the count, as every measurement above does.
- **A green vitest run is not evidence that a module works.** The prerender is workerd. If your
  module is not yet imported by a route, build a probe page, read the emitted HTML, then delete it.

---

## Self-Check: PASSED

All five created files and both modified source files exist on disk. All six claimed commits
(`506866c`, `218dc9e`, `50d6fd3`, `5affcd8`, `eb2dfdf`, `0f2a547`) exist in `git log`. The working
tree is clean, no probe route survives under any of the three names, and no commit message, author
or committer field carries AI attribution.
