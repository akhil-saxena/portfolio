---
phase: 0
plan: 07
subsystem: design-ideation
tags: [cascade, playwright, css-manifest, exports-map, packaging, dsgn-04, dsgn-05, measurement]

requires:
  - .playground/ harness (plan 01)
  - theme-charcoal.css + fonts-charcoal.css (plan 04)
provides:
  - probe.mjs — the cascade order-independence probe (4 orders x 2 modes x 2 inlineStylesheets)
  - the four constructed cascade variants + two CSS-carrier islands
  - manifest.css / manifest-admin.css — D-33's hand-maintained single-file manifests
  - check-css-size.mjs — the D-33 measurement (shipped-per-route and component-set)
  - fixtures/stub-theme-pkg — D-35's exports shape, proven by a build
  - G-12 evidence, the manifest byte counts and the cascade result in 00-FINDINGS.md
affects:
  - Phase 1 (DS-01 acceptance criterion as code; D-35 packaging spec now tested; D-36's face removal now has a measured consumer-side case)
  - Phase 06.1 (@layer deferral now backed by measurement rather than assumption)
  - Phase 0 plans 09-16 (every sketch imports one of the two manifests)

tech-stack:
  added:
    - "stub-theme-pkg (local, private, zero-dependency fixture — file: dependency)"
  patterns:
    - construct both orderings and assert, never wait to observe nondeterminism
    - assert the expected value as well as cross-variant agreement
    - derive a probe's expectations by parsing the artefact under test
    - single-file CSS manifest as the cascade-order mechanism
    - prove a packaging shape against a stub rather than editing a non-throwaway repo

key-files:
  created:
    - .playground/probe.mjs (gitignored)
    - .playground/check-css-size.mjs (gitignored)
    - .playground/src/pages/probe/casc-a.astro (gitignored)
    - .playground/src/pages/probe/casc-b.astro (gitignored)
    - .playground/src/pages/probe/casc-c.astro (gitignored)
    - .playground/src/pages/probe/casc-d.astro (gitignored)
    - .playground/src/components/ThemeCssIsland.tsx (gitignored)
    - .playground/src/components/TokensCssIsland.tsx (gitignored)
    - .playground/src/styles/manifest.css (gitignored)
    - .playground/src/styles/manifest-admin.css (gitignored)
    - .playground/src/pages/probe/manifest-public.astro (gitignored)
    - .playground/src/pages/probe/manifest-admin.astro (gitignored)
    - .playground/src/pages/probe/exports.astro (gitignored)
    - .playground/fixtures/stub-theme-pkg/{package.json,README.md,LICENSE,themes/charcoal.css,fonts/charcoal.css} (gitignored)
  modified:
    - .planning/phases/00-design-ideation/00-FINDINGS.md
    - .playground/check-no-js.sh (gitignored)
    - .playground/package.json (gitignored)

decisions:
  - "probe.mjs asserts the EXPECTED value as well as cross-variant agreement — agreement alone passes if charcoal fails to apply on all four pages"
  - "probe.mjs derives expectations by parsing theme-charcoal.css (resolving var() aliases) rather than hardcoding them, so probe and theme cannot drift"
  - "a token missing from the dark block does NOT short-circuit the probe — the matrix runs first, so the negative control exercises the browser rather than the file parser"
  - "check-no-js.sh's exclusion list widened by exact route name for casc-c/casc-d, never by glob — a glob would stop checking the pages the script exists to defend"
  - "the two manifests are independent files; the admin does not import the public one, because chaining would put the shared set at a different graph depth"
  - "check-css-size.mjs reports two numbers (shipped-per-route, component-set) because the first buries D-33's comparison under the 65 KB token layer"
  - "the stub's exports targets point at themes/ and fonts/ rather than dist/ — pattern and target substitute independently, so target depth is irrelevant to what is under test"

metrics:
  duration: ~22 min
  completed: 2026-08-17
---

# Phase 0 Plan 07: Cascade Probe, D-33 Manifest & D-35 Exports Summary

Closed the third and last D-02 claim by measurement and settled the two remaining DSGN-05
packaging mechanics: **the charcoal cascade is order-independent across four deliberately
constructed import orders, two colour modes and both `inlineStylesheets` settings — 136
assertions green per run where research measured a failure; D-33's manifest ships 41,179 B
raw / 9,447 B gzip of component CSS against the whole sheet's 181,861 B / 36,083 B; and
D-35's proposed `exports` shape builds against a stub package without a single edit to
`../design-system`.**

## What Was Built

| Task | Output | Commit |
|------|--------|--------|
| 1 | 4 cascade variants, 2 CSS-carrier islands, `probe.mjs` | *(no commit — gitignored)* |
| 2 | `manifest.css`, `manifest-admin.css`, 2 probe pages, `check-css-size.mjs` | *(no commit — gitignored)* |
| 3 | `stub-theme-pkg`, `probe/exports.astro`, G-12 + baselines evidence | `ddaf79f` |

**Tasks 1 and 2 produced no commit by design** — every file lives inside `.playground/`,
which plan 01 gitignored. Same precedent as plan 01 task 2 and plan 04 tasks 1-2. Their
durable output is the evidence transcribed into `00-FINDINGS.md` by task 3. `git status` was
clean of playground paths after each.

## The Measurements

### The cascade — HOLDS, and this is where research measured a failure

17 tokens x 4 constructed import orders x 2 modes = **8 cells, 136 assertions per run**, run
twice (`INLINE_CSS=auto` and `never`) for **272 green assertions**. Every cell identical, and
every value equal to what `theme-charcoal.css` declares for that mode.

| Anchor token | dark | light |
|--------------|------|-------|
| `--cream` — the token research measured breaking in **both** orderings | `#161616` | `#f4f1ea` |
| `--ochre-d-strong` — the AAA-1 accent step | `#d4a66d` | `#6b4417` |

**The difference from research is the invariant, not luck.** Research probed a deliberately
non-exhaustive prototype; plan 04's theme restates 37/37 tokens at (0,3,0), so there is no
tie left to lose. Plan 04 also recorded that this stack's *default* emitted order is the
hazardous one — so the probe passes against a live hazard, not a benign configuration.

**The negative control reproduces research's exact failure shape.** Deleting the single
`--wire` declaration from the dark block gives **two different wrong answers from one
omission**:

| Variants | dark `--wire` | What happened |
|----------|---------------|---------------|
| `casc-a`, `casc-d` | `#878173` | charcoal's **light** value applied in dark mode |
| `casc-b`, `casc-c` | `#ffffff38` | `:root.dark` won the (0,2,0) tie; charcoal lost entirely |

Exit 1, three failures, all naming `--wire`. Restoring the line returned the file to a
byte-identical SHA-256 (`fdf233f4…`) and the probe to exit 0.

**`inlineStylesheets` does not change ordering — read out of the HTML, not assumed.** Under
`'auto'` the ~2 KB charcoal sheet inlines as `<style>` and the 65 KB token layer links; under
`'never'` both link. The emitted sequence is identical under both: `casc-a`/`casc-d`
tokens-then-charcoal, `casc-b`/`casc-c` charcoal-then-tokens.

**New mechanism finding — island CSS is not "last".** `casc-c` imports its island component
*before* `tokens.css` and emits charcoal first; moving the `tokens.css` line above the
component import flips the page to tokens-first (measured both ways). An island's cascade
position is decided by the position of the **component's** import statement, not by the fact
that it is an island. **An import sorter or lint autofix can therefore flip which stylesheet
wins a tie** — a second, independent argument for exhaustiveness, since it is the only thing
that makes the result insensitive to a reformat. It also means the matrix could have
silently halved itself: if both island variants emitted the same order, the probe would
still pass while testing one order twice. Both files now say so in their headers.

**`@layer` stays deferred on evidence.** Compound selectors plus exhaustiveness are
sufficient across the entire matrix with no cascade layers and no `!important` anywhere.

### The D-33 manifest — measured, and two corrections fall out

| Set | Sheets | Raw | Gzip |
|-----|-------:|----:|-----:|
| Public component set (`base` + 13) | 14 | **41,179 B** | **9,447 B** |
| Admin component set (public + 24) | 38 | **109,864 B** | **19,763 B** |
| `primitives.css` whole — the alternative | 1 | 181,861 B | 36,083 B |
| Public route, everything it ships | — | 86,593 B | 33,867 B |
| Admin route, everything it ships | — | 122,964 B | 39,177 B |

The public surface ships **77.4% less raw / 73.8% less gzip** of component CSS than the whole
sheet; even the admin — every form control, the data grid, the editor, the overlays — comes
in below it.

**Correction 1: `primitives.css` is 181,861 B, not research's 178,398 B.** Identical in all
three places it can be read (installed tarball, `../design-system/dist/`,
`../design-system/src/`). Research's other split-CSS figures are low by the same margin —
`base.css` 7,094 vs **8,741**; all 74 sheets concatenated 217,569 vs **221,032**, a delta of
exactly **3,463 B** in both the concatenation and `primitives.css` — so it is systematic, not
a typo. Research's `178398` / `41281` / `8923` should not be re-quoted; D-33's conclusion is
unaffected and slightly strengthened.

**Correction 2: each manifest emits 81 `@font-face` rules, not 8.** The design system's **73**
(inlined by its `tokens.css`, which the manifest must import) plus charcoal's **8**. So plan
04's 8-vs-73 win is a win *for the charcoal layer in isolation* and **does not survive a
consumer that also imports the current `tokens.css`**. This is the first measurement of what
D-29's split is worth **at the consumer**, and the answer is that D-36's major version must
actually remove the faces from `tokens.css` for the manifest to benefit. It is also why the
last two table rows are so much closer than the first three: the public route's 86,593 B is
~65 KB token layer and ~21 KB of everything else.

**The negative control bites, and reveals a worse error message.** Suffixing one specifier
(`…/css/card` → `…/css/card.css`) fails the build with `` [vite] Unable to resolve `@import
"…/css/card.css"` `` and `` [postcss] ENOENT: no such file or directory, open
'@akhil-saxena/design-system/css/card.css' `` — which quotes the **bare specifier as though
it were a path** and never mentions the doubled extension. The manifest is entirely CSS
`@import` statements, so D-33 gets the *less* diagnostic of the two G-12 failure modes.
Reverting restored exit 0 and a byte-identical SHA-256.

### D-35's exports shape — proven by a build, `../design-system` untouched

`stub-theme-pkg` (private, zero dependencies, **zero lifecycle scripts**, two near-empty
stylesheets) installs as a `file:` dependency; `probe/exports.astro` imports both
`…/themes/charcoal.css` and `…/fonts/charcoal.css` and **builds clean**, with both sheets'
content present in the emitted page.

**The counter-proof is the part that makes it a measurement.** Respelling the entry as
`"./themes/*"` — the shape the existing `./css/*` entry has — makes the `*` capture
`charcoal.css`, substitutes to `themes/charcoal.css.css`, and fails with `[vite]: Rolldown
failed to resolve import "stub-theme-pkg/themes/charcoal.css"`. **The `.css` inside the
wildcard is what makes D-35's specifier string work**, now demonstrated on the exact string
rather than reasoned about.

**`import.meta.resolve()`'s under-reporting is now measured, not inherited.** Run directly
against both spellings: the broken one **returns `…/dist/css/base.css.css` and does not
throw**, and `existsSync` on that exact returned path is **false**. The resolver reports a
path it never checked.

**Both G-12 error shapes captured.** JS import: `[vite]: Rolldown failed to resolve import
"@akhil-saxena/design-system/css/base.css" from "…/scratch-broken.astro"` — research's
message verbatim. CSS `@import`: the postcss ENOENT above. The scratch page was deleted; the
committed state builds clean.

**`../design-system` verified untouched three ways:** `git status --porcelain
--untracked-files=no` is empty; no file under the repo has an mtime after 12:00 today; the
one entry `git status --porcelain` does print is an untracked `design_handoff/` directory
dated **2026-06-17**, two months before this session.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] the probe asserts expected values, not only agreement**

- **Found during:** Task 1, designing the assertion
- **Issue:** the plan specifies "fail when any token's value differs across the four variants
  within the same mode". That is necessary but **not sufficient**: if `data-brand` were
  misspelled on all four pages, or the theme sheet stopped being imported, all four variants
  would agree on the design system's neutral values and the probe would pass while measuring
  nothing. The one thing this probe must never do is give a green light to a page where
  charcoal is absent.
- **Fix:** a second assertion checks every cell against the value `theme-charcoal.css`
  declares for that mode. Expectations are **parsed out of the stylesheet** (with `var()`
  aliases resolved) rather than hardcoded, so probe and theme cannot drift — the same
  self-maintaining approach `check-font-names.mjs` uses.
- **Files modified:** `.playground/probe.mjs`
- **Commit:** none (gitignored)

**2. [Rule 2 - Missing critical functionality] a missing dark token must not short-circuit the probe**

- **Found during:** Task 1, running the negative control
- **Issue:** with deviation 1 in place, deleting `--wire` from the dark block made the probe
  exit 1 *before launching the browser*, because the expectation parse found nothing. It
  named `--wire` and exited non-zero, so it technically satisfied the acceptance criterion —
  while reducing the negative control from a browser measurement to a file lint. The control
  is the only direct evidence that the hazard is real in this stack; degrading it would have
  been a silent loss.
- **Fix:** a token missing from the **light** block is still a hard fail (it is a typo in the
  probe's own list, not a finding), but a token missing from the **dark** block is precisely
  the condition under test — so the matrix runs, the evidence prints, and the failure is
  reported afterwards with both the structural reason and the measured disagreement. This is
  what produced the two-different-wrong-answers table above.
- **Files modified:** `.playground/probe.mjs`
- **Commit:** none (gitignored)

**3. [Rule 3 - Blocking] `check-no-js.sh` extended for the two hydrating cascade variants**

- **Found during:** Task 1, after the first green probe run
- **Issue:** `casc-c` and `casc-d` carry `client:load` by design — the acceptance criteria
  require it, and without it the island path is never exercised. That made `check-no-js.sh`
  fail on two routes, breaking a check plans 09-17 depend on.
- **Fix:** both routes excluded **by exact name**, alongside `probe/island`. The script's own
  header calls widening this list a tripwire, so the resolution is documented in place: each
  entry must be a page whose entire purpose is to hydrate, named individually, **never a
  glob** — `*/probe/*` would silently stop checking `probe/static` and `probe/tokens`, the
  pages the script exists to defend.
- **Files modified:** `.playground/check-no-js.sh`
- **Commit:** none (gitignored)

**4. [Rule 3 - Blocking] a second island component, and two manifest probe pages**

- **Found during:** Tasks 1 and 2
- **Issue:** the plan's file list names one island component but its action text requires
  "distinct import lines rather than sharing one component with a prop" — a CSS import is a
  module-level statement and its position is the variable under test, so one component cannot
  express two positions. Separately, task 2's file list contains no page, but its acceptance
  criterion requires both manifests "imported by at least one page each".
- **Fix:** added `TokensCssIsland.tsx` (mirror of `ThemeCssIsland.tsx`, opposite sheet) and
  `probe/manifest-public.astro` / `probe/manifest-admin.astro`. The admin page renders plain
  markup rather than admin components: several of them need a DOM at construction and cannot
  be server-rendered without a hydration directive, and the CSS a page ships is decided by
  what it **imports**, not what it renders — so the byte count is unaffected.
- **Files modified:** the four files above
- **Commit:** none (gitignored)

**5. [Rule 2 - Missing critical functionality] `check-css-size.mjs` reports two numbers**

- **Found during:** Task 2, reading the first result
- **Issue:** the plan asks for the total per manifest route. Measured alone, that number is
  86,593 B public against 122,964 B admin — a 42% difference that makes the manifest look
  nearly pointless, because **~65 KB of both is the design system's token layer** and the
  component sheets are a minority of the bytes. D-33's tradeoff is against `primitives.css`,
  and reporting only the route total buries exactly the comparison the decision rests on.
- **Fix:** two sections. (1) shipped-per-route, including inlined `<style>` bytes, which a
  link-only walk would miss under `'auto'`; (2) the manifest's component set measured from
  the package's own files, directly comparable to `primitives.css` whole. Section 2 also
  double-checks every extensionless specifier resolves to a real file — the check
  `import.meta.resolve()` cannot perform.
- **Files modified:** `.playground/check-css-size.mjs`
- **Commit:** none (gitignored)

**6. [Rule 3 - Blocking] the stub's `files` field made truthful**

- **Found during:** Task 3
- **Issue:** the plan says to copy the real package's `files` shape, which is
  `["dist", "README.md", "LICENSE"]`. Listing files that do not exist is the kind of
  unverified claim this phase exists to eliminate, in a fixture whose entire purpose is to
  make a packaging claim checkable.
- **Fix:** `README.md` and `LICENSE` were written, so `files: ["themes", "fonts",
  "README.md", "LICENSE"]` is accurate. The README carries the reasoning that JSON cannot.
- **Files modified:** `.playground/fixtures/stub-theme-pkg/{README.md,LICENSE}`
- **Commit:** none (gitignored)

### Corrections to the Plan's Own Content

**7. The `@import` acceptance grep counts prose — plan 04's lesson, recurring**

`grep -c '@import' manifest.css` must print at least 16. Both manifests' first drafts wrote
the literal `@import` inside their **EDITING THIS FILE** headers — the paragraph explaining
the rule inflated the count of the thing it was explaining, to 18 and 43 against 17 and 41
real imports. The threshold still passed, which is the dangerous part: the number silently
stopped meaning "how many sheets this manifest pulls in".

Resolved by writing around it, as plan 04 did: both headers now say "inclusion at-rule" where
they mean the literal, and both state the constraint explicitly so the next author does not
rediscover it by breaking it. Same for `primitives.css` and the suffixed per-component form —
both greps assert **absence**, so the header describes those traps in words and never spells
them. **This is now a settled convention for every `.playground` stylesheet in this phase.**

**8. `cd ../design-system && git status --porcelain` cannot print nothing**

The repo carries a pre-existing untracked directory, `design_handoff/design_handoff_ds_overview/`,
dated **2026-06-17**. The criterion's *intent* — no modification by this plan — holds and is
proven three ways (see above). Future plans should assert
`git status --porcelain --untracked-files=no` instead, which is empty and actually tests the
claim.

**9. The token list — research's `--amber-d` does not exist**

RESEARCH's `probe.mjs` names `--amber-d`. Charcoal's accent ramp is `--ochre` / `--ochre-d` /
`--ochre-d-strong`. Copying the list verbatim would have probed a token declared nowhere;
with deviation 1 in place that now fails loudly instead of silently returning empty strings.
The list is the 17 charcoal names the plan specifies.

### Supply Chain

One `file:` install (`stub-theme-pkg`), authored entirely by this plan: `"private": true`,
zero dependencies, **zero lifecycle scripts**, two near-empty stylesheets and no JavaScript.
`npm install` reported "added 1 package", 0 vulnerabilities. `playwright@1.59.1` was already
present from plan 01 and is `[OK]` in RESEARCH §Package Legitimacy Audit; its Chromium
revision 1217 was already cached, so nothing was downloaded. **T-00-01, T-00-15 and T-00-SC
hold.** No registry install occurred at all.

**The duplicate-React guard still passes** (using the corrected form from `00-01-SUMMARY.md`,
not the plan's buggy glob): `find node_modules -type f -path '*/react/package.json' -not -path
'*/@*/*'` returns exactly **1**, and `npm ls react react-dom` shows every consumer deduped.
The stub adds no React because it contains no JavaScript.

## Observations Not Recorded as Findings

Following plans 01 and 04: this plan measures against a fixed sixteen-row register, so
anything outside those rows is flagged here rather than added as an untriaged row.

**1. The stub installs as a symlink, and that is safe here but only here.** `npm install
./fixtures/stub-theme-pkg` creates `node_modules/stub-theme-pkg -> ../fixtures/stub-theme-pkg`.
CLAUDE.md forbids symlinked dependencies for the design system specifically because of the
duplicate-React "invalid hook call" hazard. **The stub ships zero JavaScript**, so the hazard
cannot apply — but the shape looks identical to the forbidden one and a future reader could
reasonably take it as precedent. It is not. The design system stays a packed tarball.

**2. `segmentedcontrol` is deliberately absent from the public manifest.** Research's
plausible-manifest baseline included it; **G-9** reclassified `SegmentedControl` as a
radiogroup that cannot serve PUB-04's crawlable `/photos/[category]` links, with a new sibling
`FilterNav` as the fix. The public set is therefore 13 sheets, not 14, and its sheet
(2,287 B) is excluded on purpose. When `FilterNav` lands upstream the manifest gains a line.

**3. The two manifests duplicate 17 lines and must be kept in step by hand.** The admin
deliberately does not import the public manifest — chaining would put the shared set at a
different module-graph depth from the admin-only sheets, which is exactly the ordering
subtlety the single-file rule exists to eliminate, and it would make the byte split harder to
read. The cost is real and is stated in both headers. If a third surface ever appears, this
is the decision to revisit.

**4. `check-bundle.mjs` now reports 570,274 B / 176,798 B / 97 modules** rather than plan 01's
570,555 / 176,922 / 99, because two trivial islands caused Rolldown to factor `jsx-runtime`
into its own shared chunk. **The heavy-module counts are byte-for-byte unchanged** (prosemirror
10, tiptap 23, lowlight 4, highlight.js 4, dnd-kit 3, lucide 43), so G-15's verdict and
mechanism are untouched. Recorded as a footnote in `00-FINDINGS.md` so a re-run is not
mistaken for measurement drift; the original figures remain canonical.

**5. `StatCard`'s generic `class="glass"`** (carried from plans 01 and 04). Not touched.
Re-flagging only so it does not get lost between summaries. Still worth a decision at
verify-phase.

## Threat Flags

None. No network endpoint, auth path or trust-boundary schema was introduced. The probe's
`node:http` server binds `127.0.0.1` explicitly, serves only static files from this
repository's own `dist/`, is closed by the script before exit, and loads no remote origin.
Every input to every script is a file this repository authored at a fixed path.

## Self-Check: PASSED

**Files verified present:**

- `.planning/phases/00-design-ideation/00-FINDINGS.md` — FOUND (modified, 269 lines)
- `.planning/phases/00-design-ideation/00-07-SUMMARY.md` — FOUND
- all 15 playground artefacts listed in `key-files` — FOUND (gitignored, on disk only)

**Commit verified:** `ddaf79f` present in `git log`.

**Plan `<verification>` block, all five:**

- `node probe.mjs` exits 0 after both an `INLINE_CSS=auto` and an `INLINE_CSS=never` build —
  PASS (8 ROW lines and 136 assertions each)
- `node check-css-size.mjs` exits 0 and prints raw and gzip totals for both manifests — PASS
- `npx astro build` exits 0 with the stub's two subpaths imported — PASS (10 pages)
- every negative control fails as described and recovers — PASS (4/4: `--wire` deletion,
  suffixed manifest specifier, suffixed JS import, `./themes/*` respelling; all three
  restores verified byte-identical or by diff)
- `../design-system` unmodified — PASS with a wording correction (see deviation 8): zero
  tracked-file changes, zero files with a post-noon mtime, one pre-existing untracked
  directory from 2026-06-17

**Task acceptance criteria:** 8/8 task 1, 8/8 task 2, 9/9 task 3.

**Playground left intact for downstream plans (09, 10, 12-17):** `astro build` 10 pages exit
0; `check-no-js.sh` PASS on 7 static routes; `check-theme-exhaustive.mjs`,
`check-font-names.mjs`, `check-contrast.mjs`, `probe.mjs` and `check-css-size.mjs` all exit 0;
`check-bundle.mjs` exits 1, which remains the recorded G-15 finding. D-02 fence holds — no
adapter, no wrangler, no vitest, no `src/pages/api`, no root `package.json`, and `probe.mjs`
uses a plain `node:http` server rather than the adapter-aware preview command.

**Not touched, as instructed:** `STATE.md`, `ROADMAP.md`, `00-COPY/`, `../design-system/`.
