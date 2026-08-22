---
phase: 01-design-system-charcoal-theme
plan: 17
subsystem: design-system
tags: [e10, g-3, g-4, f-14-1, f-14-2, richtext, data-loss, bold-only-markdown, opt-in-dependency, gate-repair, typescript-ast]

# Dependency graph
requires:
  - phase: 01-design-system-charcoal-theme
    plan: 08
    provides: "the per-component subpath entries and tests/treeshake/subpath.test.ts — the DS-09 gate whose RichText inverse control had to keep passing while lowlight moved"
  - phase: 01-design-system-charcoal-theme
    plan: 19.1
    provides: "the story-mode convention (no story declares its own dark wrapper), the TypeScript-AST-over-hand-rolled-stripper lesson, and the disk-derived baseline accounting this plan extends from 21 to 27"
  - phase: 01-design-system-charcoal-theme
    plan: 18
    provides: "the 'prove the edit landed before trusting the run' discipline used on all five mutations here"
provides:
  - "$DS/src/interaction/RichText/segments.ts — a bold-only segment/inline-markdown codec with no editor dependency, mutually inverse over an 18-string corpus, reporting every mark and node type it cannot carry"
  - "$DS/src/interaction/RichText/codeBlockExtension.ts — everything that mentions lowlight, reachable only through a dynamic import"
  - "RichTextProps.allow — restricts marks AND node types by configuring the TipTap extension list; RICHTEXT_DEFAULT_FEATURES exported so codeBlock can be added back"
  - "RichTextProps.onSerializeLoss + a console fallback — there is no configuration in which the loss is silent"
  - "outputFormat gains \"markdown\" (ADR-002's stored shape) and \"segments\" (D-20's)"
  - "$DS/src/interaction/RichText/toolbar-suppression.test.ts — a TypeScript-AST guard (11 cases) against reintroducing the nullish-coalescing fallthrough"
  - "$DS/tests/treeshake/richtext-codeblock.test.ts — 6 cases asserting the eager/async module partition, replacing a gate that was unfailable in both directions"
  - "$DS/tests/visual/richtext-marks.spec.ts — 15 Chromium cases driving the real key combinations, including Chromium's NATIVE contenteditable path"
  - "01-20's capture list grows from 21 ids to 27; no recorded baseline moves"
affects: [01-20, 01-21, phase-07-admin]

# Tech stack
tech-stack:
  added: []
  patterns:
    - "A restriction prop configures the extension list, never the toolbar. Toolbar filtering is a consequence — the finding's whole complaint was doing it the other way round"
    - "A lossy serialiser reports what it dropped. Merging adjacent same-marked runs is correct normalisation; erasing the evidence of why they became adjacent is the bug"
    - "A heavy optional dependency lives in its own module reached only by dynamic import, and the gate asserts the eager/async partition from esbuild's metafile rather than grepping a file for the dependency's name"
    - "A gate that must not match prose parses with the TypeScript compiler. A gate that must not match a comment surviving into dist does not match text at all"
    - "A negative browser assertion of the form toBe(before) needs its precondition asserted. A keystroke that never landed leaves the document unchanged, which reads as 'restricted'"

key-files:
  created:
    - "$DS/src/interaction/RichText/segments.ts"
    - "$DS/src/interaction/RichText/segments.test.ts"
    - "$DS/src/interaction/RichText/codeBlockExtension.ts"
    - "$DS/src/interaction/RichText/toolbar-suppression.test.ts"
    - "$DS/tests/treeshake/richtext-codeblock.test.ts"
    - "$DS/tests/visual/richtext-marks.spec.ts"
  modified:
    - "$DS/src/interaction/RichText/index.tsx"
    - "$DS/src/interaction/RichText/RichText.test.tsx"
    - "$DS/src/interaction/RichText/RichText.stories.tsx"
    - "$DS/src/index.ts"
    - "$DS/README.md"

key-decisions:
  - "The restriction prop is named `allow`, not `marks`. It governs node types too, because ⌘⌥2 produced an <h2> and a heading is not a mark — a prop called `marks` would either leave headings reachable or lie in its own name"
  - "`outputFormat=\"markdown\"` is the primary new format, not `\"segments\"`. The plan's <interfaces> assumed D-20's segment array; ADR-001 §1 superseded that and ADR-002 §2 confirms it — the stored shape is bold-only inline markdown. Both are implemented, markdown is the recommended one"
  - "Code blocks left RICHTEXT_DEFAULT_FEATURES. Every *mark* still ships by default including the inline `code` mark; only the codeBlock *node* moved behind the flag, so Task 1's eighth behaviour (nothing changes without the prop) holds exactly"
  - "`tsup.config.ts` was NOT changed. The plan anticipated needing `lowlight` in `external`; measured, the deferral works without it and bundling into the async chunk keeps the package self-contained"
  - "A markdown `value` is parsed as markdown, so HTML passed there renders as literal escaped text. Sniffing 'does this look like HTML' would guess, and a wrong guess is a silent content change; escaped angle brackets on screen are impossible to miss"
  - "The escape set is exactly `*` and `\\`. Widening it to CommonMark's would make a hand-edited JSON file unreadable, and the project parses these strings with this module at build time"
  - "The Tabs DarkMode a11y failure was left alone — pre-existing, caused by 01-19.1's story conversion, zero dependency on anything this plan touched. Logged to deferred-items.md"

patterns-established:
  - "Five mutations, each diffed against a `cp` backup before the run and restored to a verified shasum after — including two that reproduced the pre-plan module partition byte-for-byte"
  - "A gate's three-way proof extended to name which assertions go red and which stay green, so the failure is shown to be targeted rather than blanket"

requirements-completed: [DS-01, DS-09]

# Metrics
duration: ~1h50m active
completed: 2026-08-22
---

# Phase 01 Plan 17: RichText Restriction, Suppression and Output Shape Summary

**A résumé bullet can now be edited in a browser without the editor being able to create a mark the stored shape cannot carry — and when a consumer restricts less than it serialises, the loss is named instead of vanishing.** `toolbar={null}` suppresses the toolbar; `allow` configures the extension list so a suppressed mark is unreachable by keyboard, by Chromium's own contenteditable commands and by autolink; bold-only inline markdown round-trips losslessly over an 18-string corpus; and the six-language highlighter left the eager path, taking 8,010 B gzip with it.

## Performance

- **Duration:** ~1h50m active
- **Tasks:** 2/2
- **Files:** 6 created, 5 modified
- **Commits:** 5
- **Sibling gates at the final commit:** `npm test` **1938 passed / 123 files** (was 1800 / 120), `npm run check` 0, `npm run typecheck` 0, `npm run css:check` **79 byte-exact**
- **Chromium spec:** 15/15, five consecutive runs
- **`test:a11y`:** `RichText.stories.tsx` **PASS**, all 18 stories. One unrelated suite fails — see *Findings raised*.

## Commits

| Commit | Subject |
|---|---|
| `54b99aa` | `feat(richtext): add a bold-only segment and inline-markdown codec (G-4)` |
| `37800dd` | `fix(richtext): honour toolbar={null} and restrict marks at the extension list (E10, G-3, F-14-1)` |
| `f87803e` | `fix(richtext): type the live-editor test handle so tsconfig.test typechecks` |
| `9dd94c7` | `feat(richtext): opt-in code blocks and a lossless bold-only output shape (G-4, F-14-2)` |
| `2bfc5da` | `test(richtext): retry the select-all instead of polling it` |

`charcoal-theme` is now **57 commits** ahead of `main` (was 52). Tracked-clean at every boundary; `?? design_handoff/design_handoff_ds_overview/` never staged.

---

## The seven measured rows, before and after

Re-run against both configurations. The **before** column is not quoted from the plan — it is the pre-plan `index.tsx` restored from a `cp` backup (shasum verified `e8afc8f9…`, matching `PREPLAN.sha256`) with the probes run against it.

| Input | pre-plan, `toolbar={null}` | shipped, `allow={["bold"]}` |
|---|---|---|
| ⌘B | `<p><strong>hello</strong> world</p>` | `<p><strong>hello</strong> world</p>` ✔ still works |
| ⌘I | `<p><em>hello</em> world</p>` | `<p>hello world</p>` — no `<em>` |
| ⌘U | `<p><u>hello</u> world</p>` | `<p>hello world</p>` — no `<u>` |
| ⌘K | *no change* | *no change* — never a keyboard binding |
| type `example.com ` | `<p><a target="_blank" rel="noopener noreferrer nofollow" href="http://example.com">example.com</a> </p>` | `<p>example.com </p>` — no anchor |
| ⌘⇧H | `<p><mark>hello</mark> world</p>` | `<p>hello world</p>` — no `<mark>` |
| ⌘⌥2 | `<h2>hello world</h2><p></p>` | `<p>hello world</p>` — no `<h2>` |
| `toolbar={null}` | **a `<div role="toolbar">` with 12 buttons** | no toolbar, 0 buttons |

Two rows worth their own line:

- **The initial value is filtered too.** `<p>a <em>b</em> <u>c</u> <mark>d</mark> <a href='…'>e</a></p>` handed to `allow={["bold"]}` comes out `<p>a b c d e</p>`. The marks are not in the schema, so a crafted or pasted value cannot smuggle one in either.
- **`allow={[]}` is a plain-text editor** — ⌘B produces no `<strong>`. Asserted, so the restriction is not silently floored at "bold always".

---

## Plan premises falsified

### 1. The plan's Task-2 gate was unfailable in both directions

```bash
if grep -qi 'lowlight' "$DS/dist/components/RichText.js"; then FAIL; fi
```

`dist/components/RichText.js` is a **508-byte re-export shim**:

```js
"use client";
export { RichText } from '../chunk-MA6ZAU7Y.js';
import '../chunk-XNCTJ2KV.js';
… eleven more bare chunk imports …
```

`grep -o lowlight | wc -l` on the **pre-plan** build: **0** — with `CodeBlockLowlight` registered unconditionally three files down the graph. So the gate "passed" on the untouched tree and passes now, and measures nothing either way. This is the twelfth defective gate of the phase and a new species: not a comment match, not unpassable — *unfailable on an artefact that never contained the thing*.

### 2. And following the shim into the chunks does not fix it — it matches a comment

The transitive static graph from that shim is 14 dist files. On the **shipped** tree the only occurrence of `lowlight` anywhere in it is:

```
dist/chunk-IWFL3GEK.js:240:      // when it is allowed at all it arrives as CodeBlockLowlight instead.
```

A source comment of mine, surviving into `dist`. A text gate over the graph would have gone red on prose. Found in my own instrument before shipping it, which is the point of writing it down.

### 3. `<interfaces>`'s "D-20 segment shape" is superseded — the stored shape is markdown

The plan states the target as `Array<{ text: string; emphasis?: boolean }>`. **ADR-001 §"Consequent decisions" 1** replaced that with bold-only inline markdown, and **ADR-002 §2** confirms it after un-skipping this plan: *"WYSIWYG is the editing surface; markdown is the storage. Making those two agree losslessly is 01-17's actual job."*

So `"markdown"` is implemented as the primary format and `"segments"` as the in-memory shape it is built on. Saying this rather than silently building to a segment array, as instructed: **a plan that only shipped `"segments"` would have left the actual round trip — including the `*`-escaping problem — in a consumer adapter**, which is the arrangement G-4 objects to.

### 4. `tsup.config.ts` did not need `lowlight` in `external`

The plan offered this conditionally. Measured: the dynamic import stays dynamic without it, `lowlight` is bundled into the async chunk, and the package stays self-contained. `tsup.config.ts` is unchanged — `git diff bd6bdd0..HEAD --name-only | grep -c tsup.config.ts` = **0**.

### 5. The grammars were *already* lazy; what was eager was everything around them

The plan reads as though the six-language download was itself the un-deferred part. Pre-plan `index.tsx` already did `import("highlight.js/lib/languages/…")` from a `useEffect`. What was eager was the `lowlight` instance, `CodeBlockLowlight` and the `highlight.js` core — **and the loader ran from an unconditional effect, so every mount fetched all six grammar chunks regardless.** Deferring the *registration* is what stops the fetch. F-14-2's cost figure is right; its stated mechanism was half the story.

### 6. "⌘⇧H produced `<mark>` … from a real keypress in Chromium" — not with ⌘, in this repo's harness

`playwright.config.ts` uses `devices["Desktop Chrome"]`, whose UA makes **`navigator.platform === "Win32"`**. prosemirror-keymap picks Meta vs Ctrl from that property, so every `Mod-x` binding in this browser resolves to `Ctrl-x`. Measured in real Chromium on the unrestricted story:

| pressed | result |
|---|---|
| `Control+Shift+h` | `<p><mark>…</mark></p>` |
| `Meta+Shift+h` | **no change** |
| `Control+Alt+Digit2` | `<h2>…</h2><p></p>` |
| `Meta+Alt+Digit2` | **no change** |

The marks are reachable; the modifier in the finding is not, here. On a real macOS Chrome (`MacIntel`) the same bindings answer to ⌘. Recorded because a spec that pressed ⌘⇧H and asserted `not.toContain("<mark>")` would be green against **any** implementation.

### 7. A discovery that strengthens the fix: ⌘B/⌘I/⌘U do not go through the keymap at all

Chromium implements bold/italic/underline **natively** on a `contenteditable`, and ProseMirror re-parses the resulting DOM mutation. Measured with `Mod-` bound to Ctrl throughout:

| story | `Meta+b` | `Meta+i` | `Meta+u` |
|---|---|---|---|
| unrestricted | `<strong>` | `<em>` | `<u>` |
| `allow={["bold"]}` | `<strong>` | **no change** | **no change** |

So the restriction holds against a **second, independent input path that no finding named** — and it is the path a macOS operator's ⌘I actually takes. A mark absent from the schema cannot survive ProseMirror's parse of the browser's own edit. This is a stronger result than the plan asked for, and `tests/visual/richtext-marks.spec.ts` asserts both paths.

### 8. `Ctrl+K` is macOS kill-line, so the two modifiers are not interchangeable for a negative assertion

The spec's first draft asserted "no change" for ⌘K **and** Ctrl+K. Ctrl+K emptied the paragraph — it is the system kill-to-end-of-line binding. One modifier is inert and the other destructive, so only the ⌘ result speaks to G-3's link claim. Both are now asserted, separately, for what each actually does.

---

## Gates repaired, each with its three-way proof

### A. `tests/treeshake/richtext-codeblock.test.ts` (6 cases) — replaces the unfailable grep

Asserts the **eager/async partition** from esbuild's metafile on a code-split bundle, not any file's text. Eager = the entry plus the transitive closure of `import-statement` edges; async = the rest. Sourcemap `sources` are folded in, because a module tsup bundled into a dist chunk is nameless to the metafile (without it the async side reads 3 modules instead of 19).

| | Result |
|---|---|
| **FAIL with the fix disabled** — mutation D: `import("./codeBlockExtension")` → a static import (2-line diff, shown below) then a full rebuild | **RED, 3 failed / 3 passed.** `eager 436021 B / 140898 B gzip / 129 modules {highlightjs:2, lucide:44, prosemirror:10, tiptap:33, lowlight:3}`. The async side read `33395 B / 12743 B gzip / 12 modules` — **byte-identical to the pre-plan measurement**, which is how I know the mutation restored the pre-plan partition rather than something merely similar |
| **PASS on shipped** — restored, shasum `a50df250…` verified, rebuilt | **6/6.** `eager 410418 B / 131270 B gzip / 123 modules {lucide:44, tiptap:32, prosemirror:10}` — lowlight and highlight.js both **0** |
| **Walk-through** | Deleting code-block support entirely → caught by *"both ARE still reachable asynchronously"*. Deferring TipTap too → caught by *"the editor stack itself stays eager"*. A bundle that resolved nothing → caught by the lucide + `modules > 50` floor. A comment mentioning lowlight → **not** matched, by construction |

The mutation was diffed before the run:

```
159c159
< import type { CodeBlockSupport } from "./codeBlockExtension";
> import { type CodeBlockSupport, createCodeBlockSupport } from "./codeBlockExtension";
445,446c445,446
<   import("./codeBlockExtension").then(async (module) => {
<     const support = await module.createCodeBlockSupport();
>   Promise.resolve().then(async () => {
>     const support = await createCodeBlockSupport();
```

**01-08's gate still passes, unmodified.** `subpath.test.ts` 4/4 in both configurations — `RichText DOES still carry the editor stack` stayed green throughout, including its strict `counts.highlightjs > metafileOnly.highlightjs` sourcemap-chaining control. Only `lowlight` moved, exactly as the plan required.

### B. `src/interaction/RichText/toolbar-suppression.test.ts` (11 cases) — the AST guard

Bans `??` **whose left operand is the identifier `toolbar`** — narrowly, because `placeholder ?? ""`, `editor?.isActive(…) ?? false` and `attrs?.href ?? ""` in the same file are all legitimate and a blanket ban would be unpassable.

| | Result |
|---|---|
| **FAIL on the pre-plan tree** (`cp` backup, shasum `e8afc8f9…`) | **RED, 2 failed / 9 passed**, naming `732:toolbar ?? defaultToolbar` — the same expression the plan cites at `dist/index.js:9143` |
| **FAIL with the fix disabled** (mutation A: one line back to `??`) | **RED, 2 failed / 9 passed**, naming `1037:toolbar ?? defaultToolbar` |
| **PASS on shipped** | **11/11** |

Both legs also reddened the *positive* half (`comparesToUndefined` → false), so that assertion is not decoration.

**Walk-through, recorded:** a line comment, a JSDoc block, a string literal, a template literal and an apostrophe in adjacent JSX text are all **not matched** (the last is the exact `don't` desync that broke 01-19.1's hand-rolled stripper). `??` on a different identifier is not matched. An **aliased** `toolbar` (`const t = toolbar; t ?? default`) **slips** — pinned as a known limit in a test, and covered by the behavioural test, which reads the rendered DOM.

**The plan's own Task-1 shell gate is sound**, and I kept it that way: it fails on the pre-plan file for *both* clauses, passes on shipped, and I deliberately wrote the docstring as "the nullish-coalescing fallback" so no prose in `index.tsx` contains the literal the gate greps for. `grep -n 'toolbar ??' index.tsx` = 0 lines.

### C. The behavioural suite — proven to bite in two independent directions

A throwaway 7-case probe importing only `RichText` (so it loads against the pre-plan component too):

| | Result |
|---|---|
| **FAIL on the pre-plan tree** | **6 failed / 1 passed.** The six defects, each with its measured HTML (the table above). P7 — *bold still works* — **passed**, so the failure is targeted, not blanket |
| **FAIL with mutation A** (toolbar fix only reverted) | **1 failed / 6 passed** — exactly P1 |
| **FAIL with mutation B** (`allow` filters the toolbar but `buildExtensions` ignores it) | **5 failed / 2 passed** — exactly P2–P6. P1 and P7 green: **the toolbar filtered correctly while every mark stayed reachable by keyboard.** This is literally the finding's complaint, reproduced, and caught |
| **FAIL with mutation C** (`reportLoss` made a no-op — G-4's silence, restored) | **3 failed / 70 passed** — exactly the three reporting cases |
| **PASS on shipped** | 7/7, then the probe deleted |

Mutation B's first attempt is worth recording because it found a real constraint: placing the reassignment *after* `const lists = …` produced `SyntaxError: No node type or group 'listItem' found (in content expression 'listItem+')`. **`listItem: false` while `bulletList` is enabled is a hard crash**, which is why `buildExtensions` couples them.

### D. The Chromium spec — non-inert, and its own flake was a false-pass hazard

Pointing `STORY.boldOnly` at the unrestricted story turns exactly the **three** bold-only restriction cases red (native ⌘I/⌘U, the keymap combos, autolink) and leaves the other 12 green. Restored byte-identically.

The spec flaked 1 run in 3 before `2bfc5da`, and **the direction matters more than the flake**: a mark command dispatched onto an *empty* selection sets a stored mark rather than wrapping text, so `getHTML()` is unchanged. In the unrestricted block that is a false failure. In the bold-only block, where every assertion is `expect(html).toBe(before)`, **the identical race is a false pass** — the test would report "the mark is unreachable" having observed only its own timing. Measured cause: the editor is not focused when `click()` resolves, so `Meta+A` reaches the document. Polling cannot deliver a keystroke that never arrived, so the click-and-press is retried and the selection width is asserted. **Five consecutive runs: 15/15 each.**

---

## Controls that are non-inert, and how each file was proven to have changed

Every mutation was diffed against a `cp` backup **before** the run, and restored to a verified `shasum -a 256` after. Never `git checkout --`, never `git stash`, never `git clean`. Python for in-place edits, per 01-18's finding that bash ate `$1` inside `perl -i`.

| Control | Edit proven by | Restored |
|---|---|---|
| pre-plan `index.tsx` (behavioural + AST guard) | `shasum` on disk == `PREPLAN.sha256` line, plus `grep -c 'toolbar ?? defaultToolbar'` = 1 | `shasum` == `a50df250…` |
| mutation A — `??` restored | `diff` vs backup: 1 line, `1037c1037` shown | byte-identical `diff` |
| mutation B — toolbar-only filtering | `diff` vs backup: 2 added lines, printed | byte-identical `diff` |
| mutation C — silent `reportLoss` | `diff` vs backup: `463a464`, printed | `shasum` == `a50df250…` |
| mutation D — static import | `diff` vs backup: 4 lines, printed above | `diff` reported nothing + `shasum` match |
| Chromium non-inertness probe | `diff` vs backup: `53c53`, printed | `diff -q` → identical |

**Inverse controls inside the shipped gates**, so none of them can pass by measuring nothing:

- The 12-button count is asserted alongside `toolbar={null}` → 0 buttons. A component that never rendered a toolbar fails one of the two.
- `allow={["bold"]}` → exactly 1 button; the default → 12; the bold-only-no-toolbar story → 0. Three mutually exclusive counts, all green on one tree.
- `RICHTEXT_DEFAULT_FEATURES` is asserted to *contain* each feature whose button-removal is tested.
- The AST guard asserts the file's *other* `??` expressions still exist (`total > 0`).
- The treeshake gate asserts lucide is present and `modules > 50`, and that an async set exists at all before reading it.
- The codec's round-trip suite asserts `loss.count === 0` on the whole corpus — if the codec grew an asymmetry the identity tests alone would not catch it.
- The Chromium spec asserts bold still works through **both** input paths in the restricted story.

---

## G-4: the bold-only markdown shape round-trips losslessly, and no italic run can be dropped

### The round trip

`markdown → segments → doc → segments → markdown` is the **identity** on an 18-string corpus, and idempotent over three passes. The corpus is chosen for hazards, not coverage: `2 \* 3 = 6`, `a literal backslash \\ here`, `an unmatched \*\* pair`, `**bold with \* inside**`, `\*\*not bold\*\*`, `**bold**\n**bold on the next line**`, `emoji ✅ and accents é **bold é**`.

The escaping rule is exactly two characters — `*` and `\` — escaped on serialise, unescaped on parse. `_`, `[`, `]` and backticks are left alone: this is a two-token dialect with its own parser, not CommonMark, and the project parses these strings with this module at build time. Stated in the module header rather than left to be discovered.

Three correctness points a naive implementation gets wrong, each a test:

- **Edge whitespace goes outside the delimiters.** ` **bold** `, never `** bold **` — CommonMark refuses to open emphasis on `** `, so a downstream renderer would show the asterisks verbatim.
- **An unmatched `**` is literal text, not an unterminated mark.** `markdownToSegments("a ** b")` → `[{text: "a ** b"}]`. A hand-edited JSON file is the authoring surface; a stray pair must not swallow the rest of a bullet. Nine adversarial inputs asserted not to throw.
- **A `hardBreak` is encoded, not lost.** `\n` inside a segment and a `hardBreak` node encode each other exactly, so reporting it would be a false positive — and a loss report that cries wolf is one a consumer learns to ignore.

### How I proved no italic run can be dropped

Three layers, and the third is the one that answers the question:

**1. The finding's transcript is reproduced, then named.** Seven authored runs — plain, **bold**, plain, *italic*, plain, **bold**, plain — serialise to **five segments**, with the italic run back as plain text and its two neighbours merged around it, exactly as measured. The merge is kept: two adjacent identically-marked runs *are* one run, and a serialiser that emitted them separately would make the `JSON.stringify` equality the controlled-value guard depends on unstable across a no-op edit. What changed is that the merge no longer erases the evidence:

```
1 thing(s) dropped on serialize — Marks the shape cannot carry: italic.
The editor still shows them. The stored value does not.
```

Asserted string-exact against the Phase 0 prototype's wording. `droppedMarks` = `["italic"]`, `count` = 1. Every one of italic / underline / strike / code / highlight / link is asserted individually, plus heading / bulletList / listItem / blockquote / horizontalRule / codeBlock / `paragraph-break` on the node side, plus an inline node with no textual form at all. **Text always survives** — a dropped mark never drops its characters, a dropped block never drops its words.

**2. The report cannot be switched off.** `onSerializeLoss` gets it; with no handler the component `console.warn`s (deduped by message so a per-keystroke `onUpdate` does not flood, never suppressed). Asserted in the component, in a browser, and via mutation C.

**3. The report fires *before anyone has typed*.** The dangerous case never reaches `onUpdate`: a document that arrives already carrying an unrepresentable mark. A mount-time serialise covers it. Asserted with a TipTap JSON doc handed to a segment-output editor — which `value: string | object` accepts, so it typechecks, and is exactly how an italic enters a bold-only pipeline without a keystroke.

**And the composition is what makes the loss unreachable rather than merely visible.** With `allow={["bold"]}` the marks are not in the schema, so there is nothing to report and nothing to lose — asserted: after ⌘I, ⌘U and ⌘⇧H on a bold-only editor, `onSerializeLoss` has **not** been called and the HTML is `<p>Reduced <strong>p95</strong> by 40% and more</p>`. Neither half is redundant, and the docstring says why: `allow` stops the loss being *created*; the report catches a consumer that restricted **less** than it serialises, which is what `<RichText outputFormat="markdown" />` with no `allow` is — a perfectly typed call in which every mark is reachable and one is storable. That is the original defect's shape. Delete either and a real path reopens.

### One deliberate loudness

A markdown `value` is parsed as markdown, so HTML passed there renders as **literal escaped text** — `<p>a <em>b</em></p>` appears on screen with its angle brackets. Asserted. Sniffing "does this look like HTML" would guess, and a wrong guess is a silent content change; escaped brackets are impossible to miss.

---

## The restriction prop: widened, and renamed to say so

**Named `allow`, not `marks`** — the plan authorised this explicitly ("name the prop honestly if it now governs more than marks") and `<output>` asks which. It governs 7 marks and 6 node types:

```ts
type RichTextFeature =
  | "bold" | "italic" | "underline" | "strike" | "code" | "highlight" | "link"
  | "heading" | "bulletList" | "orderedList" | "blockquote" | "horizontalRule" | "codeBlock";
```

`RICHTEXT_DEFAULT_FEATURES` is the first twelve — everything except `codeBlock` — and is **exported**, so a consumer who wants code blocks writes `allow={[...RICHTEXT_DEFAULT_FEATURES, "codeBlock"]}` rather than re-listing twelve and silently missing one a later version adds.

This falsifies the plan's frontmatter `key_links` entry `from: "RichTextProps.marks"`. Recorded rather than quietly renamed.

Four things the extension configuration gets right, one per measured behaviour:

1. **`autolink` travels with the link mark.** Omitting `"link"` drops the whole Link extension. It was the only mark reachable with no keystroke at all.
2. **Highlight is conditional.** It was registered unconditionally, which is why ⌘⇧H produced `<mark>`.
3. **Node types too.** StarterKit's own options are the mechanism — it pushes each sub-extension only when the option is not `false` — so `heading: false` removes the extension rather than hiding a button. `listItem`/`listKeymap` are coupled to the two list types (see mutation B's crash).
4. **Absent `allow` changes nothing.** Every *mark* is still registered, including the inline `code` mark. Only the codeBlock *node* moved, so Task 1's eighth behaviour holds exactly and the 27 pre-existing tests passed unmodified.

Toolbar buttons and the ⌘-hint strip are filtered as a **consequence**: `allow={["bold"]}` with `hints` shows `["⌘B", "⌘↵", "Esc"]` — ⌘I, ⌘U, ⌘⇧H and the never-bound ⌘K all gone.

---

## The measured bundle cost, before and after

Consumer-shaped: `dist/components/RichText.js` bundled with esbuild `--bundle --minify --format=esm --splitting`, partitioned into eager (entry + transitive static imports) and async.

| | chunks | eager raw | eager gzip | eager modules | lowlight | highlight.js | async raw | async gzip | async modules |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **before** (real pre-plan `dist/`) | 8 = 2+6 | 431,344 B | **139,280 B** | 127 | **3** | **2** | 33,395 B | 12,743 B | 12 |
| **after** | 10 = 3+7 | 410,418 B | **131,270 B** | 123 | **0** | **0** | 59,257 B | 23,022 B | 19 |
| **delta (eager)** | | −20,926 B | **−8,010 B** | −4 | −3 | −2 | | | |

- **F-14-2's "12,718 B gzip" is corroborated at 12,743 B** — the six grammar chunks, which is what that figure measures. Individually gzipped they are 20,291 B; concatenated, 13,887 B. The measurement path matters and the plan's number is the right one.
- The async side grew by what left the eager side: the `lowlight` instance, `CodeBlockLowlight` and the `highlight.js` core joined the grammars.
- The static bare-specifier list lost `lowlight` and `@tiptap/extension-code-block-lowlight` — the crisp, structural fact underneath the byte counts.
- **Nothing is fetched at all** unless a consumer passes `"codeBlock"`. Pre-plan the loader ran from an unconditional effect, so every mount fetched all six grammars.

A bonus the deferral bought: awaiting the grammars *before* the extension exists deleted the old "re-set the whole document with `{ emitUpdate: false }` to force a re-highlight, then restore the selection" dance, and its interaction with the controlled-value guard. Strictly less machinery.

---

## Baselines for 01-20

Derived from disk using `src/visual-baseline-coherence.test.ts`'s own oracle, so it is comparable with 01-19.1's numbers rather than re-counted by hand.

| | after 01-19.1 | after 01-17 |
|---|---:|---:|
| Storybook stories | 502 | **508** |
| recorded PNGs in `storybook.spec.ts-snapshots/` | 488 | **488** (untouched) |
| denominator (covered by the one snapshotting spec) | 498 | **504** |
| backed | 477 | **477** |
| **unbacked — 01-20's capture list** | **21** | **27** |
| orphaned | 11 | **11** |

**Six ids added to the capture list, all `Interaction/RichText`:**

```
interaction-richtext--bold-only
interaction-richtext--bold-only-no-toolbar
interaction-richtext--code-block-opt-in
interaction-richtext--no-toolbar
interaction-richtext--segment-output
interaction-richtext--serialize-loss-reported
```

**No recorded baseline moves.** No existing story was renamed, removed or re-rendered; 01-19.1's 72 moving baselines are unaffected by this plan. `tests/visual/richtext-marks.spec.ts` calls **no** snapshot matcher, so it adds nothing to either store — it reads the editor's own serialised HTML, which is the artefact the finding was stated in.

Two notes for the capture:

- **`interaction-richtext--code-block-opt-in` renders a loading skeleton for one dynamic-import round trip.** A capture that lands inside that window records the skeleton, not the editor. Give it a settle wait or accept the skeleton deliberately.
- **`interaction-richtext--serialize-loss-reported` shows live editor state** (the stored markdown and the loss line). Its initial state is deterministic; it changes only on a keystroke, so it is stable for capture but not idempotent under interaction.

None of the six declares a dark wrapper or pins a page colour, per 01-19.1's convention. `src/story-mode.test.ts` and `tests/visual/brand-isolation.spec.ts` both pass.

---

## `CHANGELOG.md` wording for 01-20 (paste-ready)

```markdown
### Fixed

- **`RichText`: `toolbar={null}` now suppresses the toolbar.** It previously
  selected the *default* twelve-button toolbar, because the fallback was nullish
  coalescing and `null` falls through it — the exact value the prop's own
  docstring prescribes for suppression.
- **`RichText`: the loading placeholder no longer carries a prohibited ARIA
  attribute.** `aria-label` on a role-less `<div>` is invalid; the placeholder is
  now `role="status"`.

### Added

- **`RichText` `allow`** — restricts which marks *and node types* the editor may
  produce by configuring the TipTap extension list, so a suppressed feature is
  unreachable by keyboard, by input rule and by autolink, not merely absent from
  the toolbar. `allow={["bold"]}` is a bold-only editor; `allow={[]}` is plain
  text. Omit it and nothing changes. `RICHTEXT_DEFAULT_FEATURES` is exported.
- **`RichText` `outputFormat="markdown"` and `"segments"`** — two lossless
  bold-only shapes. `"markdown"` emits `Reduced **p95 latency** by 40%`;
  `"segments"` emits `Array<{ text, emphasis? }>`. Neither can express a markup
  string, which designs the stored-XSS class out rather than filtering it.
- **`RichText` `onSerializeLoss`** — a mark or node type the bold-only shapes
  cannot carry is reported by name instead of disappearing. With no handler the
  component warns on the console; there is no configuration in which the loss is
  silent. `allow={["bold"]}` makes the case unreachable, and the two compose
  deliberately: the restriction prevents the loss, the report catches a consumer
  that restricted less than it serialises.

### Changed

- **`RichText` code blocks are opt-in.** `"codeBlock"` is the one feature not in
  `RICHTEXT_DEFAULT_FEATURES`, and its `lowlight`/`highlight.js` grammars are now
  reached only through a dynamic import. The eager path of a code-split consumer
  bundle drops from 139,280 B to 131,270 B gzip and loses both families entirely;
  a default editor fetches none of the six grammar chunks. Pass
  `allow={[...RICHTEXT_DEFAULT_FEATURES, "codeBlock"]}` to restore them.
  **This is the one behaviour change for an existing consumer** — every *mark*,
  including the inline `code` mark, still ships by default.
- `outputFormat="html"` is unchanged and still supported, but is no longer the
  recommended choice for stored prose. See the README for the reasoning.
```

Suggested bump: **minor** (`1.11.4` → `1.12.0`). Additive props and two new output formats; the code-block default is a behaviour change with a one-line migration, documented above.

---

## Findings raised (not fixed)

### 1. `npm run test:a11y` is not clean on this tree, and it is not this plan's doing

`Data Display/Tabs › DarkMode` fails `color-contrast` (serious, 2 nodes) on the two inactive tab labels. `Tabs.stories.tsx` was last modified by `380d979` (01-19.1) — the story now renders a dark **page** rather than a dark island, and the inactive-label ink that cleared AA against a light page does not clear it against a dark one. This is the a11y-shaped half of a consequence 01-19.1 measured and accepted for the visual baselines, surfacing in a gate it did not re-run.

Left alone per the scope boundary: nothing in Tabs imports anything this plan touched (`grep -c` = 0 in both Tabs files), and fixing it means choosing a token, which is a charcoal dark-ramp decision. **Logged to `deferred-items.md` with reproduction.** `Tests: 1 failed, 507 passed, 508 total`; `RichText.stories.tsx` passes all 18.

### 2. The loading skeleton's `aria-label` was invalid the whole time — deferral is what made axe reach it

`<div class="ds-atom-richtext--loading" aria-label=… aria-busy="true">` is the `generic` role, and `aria-label` on generic is **prohibited** — the same rule the component's own `editorProps` comment already cites for `readOnly`. It went unnoticed because the branch lasted one tick and axe samples after render. Holding it open for a dynamic import made axe report `aria-prohibited-attr` immediately. Fixed here (`role="status"`, with ProgressBar and Lightbox as precedent), but the general lesson is the finding: **a transient render branch is invisible to `test:a11y`.** Anything in this repo that renders a skeleton for less than a frame is unscanned.

### 3. `test:a11y` still scans no portaled content, and `RichText` portals

`checkA11y` is scoped to `#storybook-root`; `DSPortal` mounts to `document.body`. `RichText`'s link popover — a `<dialog open>` with a `TextInput` — is therefore **never scanned**, in any story. The `allow={["bold"]}` configuration has no link button so it cannot open, but the default configuration can. Pre-existing and unchanged by this plan; recorded because this component is a concrete instance of the carried tooling fact.

### 4. `playwright.config.ts` cannot drive a macOS modifier

`devices["Desktop Chrome"]` reports `navigator.platform === "Win32"`, so every `Mod-` keybinding in this repo's Playwright harness is Ctrl. Any future spec asserting a ⌘ shortcut *works* will be red for the wrong reason; any spec asserting a ⌘ shortcut *does nothing* will be green for the wrong reason. A `devices["Desktop Safari"]`-style Mac UA, or an explicit `userAgent` override, would fix it — a config change with a blast radius across 14 specs, so not taken here.

### 5. A JSX string attribute does not process backslash escapes

`value="2 \\* 3"` in TSX is **two** real backslashes, not one, so a test written that way never exercises the escape path. Cost one red run; fixed with an expression container. Same family as measuring the wrong file.

### 6. `--danger` is not a token

`var(--danger, #b3261e)` in a new story failed `src/tokens.test.ts` ("defines every custom property referenced anywhere in src") by name, on the first full run. The ramp has `--red`, `--red-ink`, `--red-bg`, `--red-vivid` and `--error-ring`; `--red-ink` was correct. **That gate has now caught something in three consecutive plans.**

---

## What later plans need

- **01-20** — the capture list is **27**, not 21; the six new ids and their two capture caveats are above. No recorded baseline moves. `CHANGELOG.md` wording is paste-ready; suggested bump `1.12.0`. Two decisions are owed: the Tabs dark-mode contrast token (finding 1) and 01-19.1's still-open five `backgrounds.default: "white"` stories.
- **01-21** — nothing published here. `tsup.config.ts` untouched; `dist/` is current as of the final commit but `clean: true` means any later build is authoritative.
- **Phase 7 (admin)** — the résumé bullet editor is
  `<RichText value={bullet} onChange={setBullet} outputFormat="markdown" allow={["bold"]} toolbar={null} inline hints />`. That configuration cannot create a mark the stored shape cannot carry, so `onSerializeLoss` will never fire — but wire it to a visible error anyway, because it is the guard against a future edit widening `allow` without widening the storage. `interaction-richtext--bold-only-no-toolbar` is that story.
- **Phase 3 (schemas)** — `markdownToSegments` / `segmentsToMarkdown` are importable from the package and carry no editor dependency, so the build-time parse ADR-001 §1 describes ("parsed to segments at build time") can use the same codec the editor writes with. That is the only way the two agree by construction rather than by review. `RichTextSegment` and the codec are exported from the barrel.
- **E10 on `00-HUMAN-CHECKLIST.md`** is satisfied by this plan but **not ticked** — no artefact outside this SUMMARY was written, per the standing instruction. Same for the `00-FINDINGS.md` rows G-3, G-4, F-14-1 and F-14-2.

## Verification

| Gate | Result |
|---|---|
| `npm test` | **1938 passed / 123 files** (was 1800 / 120) |
| `npm run check` | 0 |
| `npm run typecheck` | 0 |
| `npm run css:check` | 0 — 79 files, round-trip byte-exact |
| `npx vitest run src/interaction/RichText tests/treeshake` | **169 passed / 5 files** |
| `npx playwright test tests/visual/richtext-marks.spec.ts` | **15 passed**, five consecutive runs |
| `npm run test:a11y` — `RichText.stories.tsx` | **PASS**, 18 stories |
| `npm run build` | 0 |
| plan Task-1 gate 2 (`toolbar === undefined` present, `toolbar ??` absent) | passes on shipped, fails both clauses pre-plan |
| plan Task-2 gate 2 (`grep -qi lowlight dist/components/RichText.js`) | **unfailable — replaced**, see *Plan premises falsified* 1 |
| `git status --porcelain` in `$DS` (protocol-filtered) | empty at every commit |

## Self-Check: PASSED

All 11 named files exist on disk; all 5 commits (`54b99aa`, `37800dd`, `f87803e`, `9dd94c7`, `2bfc5da`) resolve in `git log --all`. `tsup.config.ts` confirmed absent from `git diff bd6bdd0..HEAD --name-only`. No AI attribution in any commit subject, body or trailer.
