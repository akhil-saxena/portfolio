---
phase: 03-content-layer-image-origin
plan: 07
subsystem: content
tags: [react, render-boundary, xss, escaping, gate, tdd, criterion-3]

requires:
  - phase: 03-02
    provides: "src/lib/bullets.ts — parseBullet, the single definition of the bullet grammar"
  - phase: 03-06
    provides: "src/schemas — ResumeSchema, which rejects a bullet containing an HTML tag"
provides:
  - "src/components/Bullets.tsx — the render boundary; runs become React elements and text children, never HTML strings"
  - "test/content/xss-boundaries.unit.test.ts — the single test criterion 3 names, both boundaries, one payload"
  - "scripts/assert-no-raw-html-sinks.mjs — the structural ban on raw-HTML sinks under src/, in the React, Astro and plain-DOM spellings"
affects: [03-08, phase-5-render, phase-7-admin]

tech-stack:
  added: []
  patterns:
    - "React text children ARE the escaping mechanism; the component contains no escaping code of its own, because a hand-rolled escaper double-encodes and forgets entities"
    - "One fixture, two boundaries, two assertions with no overlap — so neither a pass-through renderer nor an escape-everything one can be green"
    - "Gate self-test on every invocation: canary + anti-canary per rule, plus a usePattern check so an allowlist can never forgive a real sink"
    - "Occurrence-level reporting (file:line:column), never line-level, because grep -c reports 1 for three sinks on one line"

key-files:
  created:
    - src/components/Bullets.tsx
    - test/content/xss-boundaries.unit.test.ts
    - scripts/assert-no-raw-html-sinks.mjs
  modified: []

key-decisions:
  - "The renderer takes string[] and calls parseBullet itself, per the plan's recommendation — the grammar stays in one place and the Phase 5 call site hands over what is on disk."
  - "Two extra sink rules beyond the plan's three: insertAdjacentHTML and document.write/writeln. Both parse an HTML string exactly as .innerHTML does; banning one spelling and not another is a ban on a spelling rather than on a behaviour."
  - "The allowlist keys on (file, line-substring), never on a line number, and an exemption is still refused if the occurrence is in USE form. Proven by planting a real sink on the exempted line."
  - "A stale allowlist entry is a hard failure. An exemption for text that no longer exists is a standing hole waiting for a name collision."
  - "The ampersand claim is asserted at the CHARACTER level plus a round-trip decode, not as `output contains a bare &`. The literal form of that instruction is satisfied only by the raw-HTML-sink renderer — see 'Contradictions' below."

patterns-established:
  - "A control must prove the gate RAN and NAMED the rule, not merely that something exited non-zero. Exit 127 is non-zero too, and that is how three verdicts in this plan's own verification came back vacuous."
  - "Every harness records the shell it ran in. Two plan harnesses and one of this executor's own were shell-dependent."

requirements-completed: [CONT-03]
owns-criteria: [criterion-3]

metrics:
  duration: "~35 min"
  tasks: 2
  commits: 4
  files-created: 3
  tests-added: 15
  suite: "473 passed / 473, 11 files (was 458 / 10)"
  completed: 2026-08-26
---

# Phase 3 Plan 07: The Render Boundary Summary

**Bold-only bullet runs render as real React elements with React's own text-child escaping as the
only mechanism, proven by one fixture that a pass-through renderer, an escape-everything renderer,
an empty renderer and a double-escaping renderer each fail for four different reasons — plus a
five-rule structural ban on raw-HTML sinks under `src/` that covers `.astro` before Phase 5 writes
its first page.**

## What was built

### 1. `src/components/Bullets.tsx` — the render half of criterion 3

`Bullets({ items: string[] })` renders `<ul><li>`, calling `parseBullet` per item. Bold runs become
`<strong>` elements; plain runs become keyed `Fragment` text children. That is the whole component.

What is deliberately **absent**:

- **No raw-HTML sink**, in any spelling, for any reason. The literal string
  `dangerouslySetInnerHTML` does not appear in the file — not even in the header prose, which refers
  to "React's raw-HTML prop" instead, because the plan's own hygiene harness greps the file for it.
- **No escaping code.** React escapes text children by construction. A hand-rolled escaper would be
  a second implementation of that, and — demonstrated as CONTROL D below — would *double*-encode the
  one literal `&` in the corpus.
- **No parser.** `parseBullet` is imported. The grammar still has exactly one definition across the
  migration, the schema and now the renderer.
- **No `parseBullet` try/catch.** A throw means content reached the renderer without passing
  `ResumeSchema`, whose own refinement *is* `parseBullet`. That is a build-time failure worth having
  loudly.

The three `biome-ignore lint/suspicious/noArrayIndexKey` suppressions are load-bearing, not
decorative: stripping them produces three real Biome errors (verified by deleting them, running
`npm run check`, and restoring from a `cp` backup with a matching `shasum`).

### 2. `test/content/xss-boundaries.unit.test.ts` — one payload, both boundaries

15 tests. **The exact fixture string:**

```
Reduced p95 <script>alert(1)</script> latency by **40%**
```

`parseBullet` **accepts** it — the emphasis delimiters balance and there is no lone asterisk — which
is the point. The grammar has no angle-bracket production to violate, so the render assertion is a
real claim about React rather than a restatement of the parser. Its runs:

```
run 0 (plain): "Reduced p95 <script>alert(1)</script> latency by "
run 1 (bold):  "40%"
```

Rendered by `renderToStaticMarkup` — the real Astro server path, not jsdom:

```html
<ul><li>Reduced p95 &lt;script&gt;alert(1)&lt;/script&gt; latency by <strong>40%</strong></li></ul>
```

Both halves asserted on the **same string**:

| Half | Assertion |
|---|---|
| render | `toContain('&lt;script&gt;alert(1)&lt;/script&gt;')`, `not.toContain('<script')` |
| render | `toContain('<strong>40%</strong>')` and `countOf(html,'<strong>') === 1` — on the same output |
| write | `ResumeSchema.safeParse` fails with issue path `experience.0.bullets.0`, message containing `HTML tag` |
| write control | the **unmutated** résumé passes, so the rejection is attributable to the payload and not to anything else on the record |

Plus a vacuity guard (`html.length > payload.length`, one `<li>`, the surrounding prose present), so
`not.toContain('<script')` cannot be satisfied by rendering nothing; the whole-corpus assertion
(13 `<li>`, 17 `<strong>`, no `<script`/`<img`/`onerror`/`**`); the ampersand proof; an en-dash
assertion (`12–20%` raw, no `&ndash;`) pinning that React and not something else did the encoding;
and `render([]) === '<ul></ul>'`, so an empty render is distinguishable from no render.

### 3. `scripts/assert-no-raw-html-sinks.mjs` — the structural ban

Clean-tree transcript:

```
assert-no-raw-html-sinks: PASS
  scan root: /Users/akhilsaxena/Documents/Personal/Repositories/portfolio/src
  scanned 21 files (94290 bytes) matching .ts .tsx .mts .cts .js .jsx .mjs .cjs .astro, 5 rules applied
  self-test: 5/5 rules flagged their canary and ignored their anti-canary
  rules: REACT-RAW-HTML, ASTRO-SET-HTML, DOM-INNERHTML-ASSIGN, DOM-INSERT-ADJACENT-HTML, DOM-DOCUMENT-WRITE
  allowlist: 2 entr(y/ies), 2 documentation mention(s) exempted, all still matching
```

Five rules, three from the plan and two added (`insertAdjacentHTML`, `document.write`/`writeln`).
Reports **one entry per occurrence** with `file:line:column`. Matches inside comments and string
literals on purpose. Refuses to pass on: a missing scan root, zero files scanned, zero bytes read,
an empty-string scan-root argument, an allowlist entry that no longer matches, an allowlist entry
without a usable reason, or any rule that fails its own canary/anti-canary.

## The four-step proof, per gate, with the shell each control ran in

**The shell matters and is reported everywhere.** The interactive shell here is **zsh**. Two
plan-supplied harnesses use `${PIPESTATUS[0]}`, which zsh does not define (it has lowercase
`pipestatus`, 1-indexed), so run verbatim they invert their own verdict. Everything below ran under
**`bash 5.3.9(1)-release`** unless stated.

### Gate A — the boundary suite (`test/content/xss-boundaries.unit.test.ts`)

| Step | What was done | Result | Shell |
|---|---|---|---|
| 1. plant the defect | CONTROL A: the legacy renderer — bullet string into React's raw-HTML prop with a `**`→`<strong>` regex | **RED**, `Tests 2 failed \| 13 passed`, on `to contain '&lt;script&gt;alert(1)&lt;/script&gt;'` | bash |
| 1. plant the defect | CONTROL B: escape everything, emit no emphasis (`<li>{s}</li>`) | **RED**, `Tests 4 failed \| 11 passed`, on `to contain '<strong>40%</strong>'` | bash |
| 1. plant the defect | CONTROL D (added): a hand-rolled escaper layered on React's own — the mirror-image bug | **RED**, `Tests 4 failed \| 11 passed`, incl. `not to contain '&amp;amp;'` | bash |
| 2. nothing to check | CONTROL C (added): renderer returns `null` | **RED**, `Tests 11 failed \| 4 passed` — every `not.toContain` has something to be about | bash |
| 3. correct code | the real renderer | **GREEN 15/15**; full `unit` project 444/444; whole suite **473/473 across 11 files** | bash |
| 4. walk-through | attempted: a renderer satisfying both halves while being unsafe | **none found.** The two assertions have no overlap — escaping the payload and emitting a real `<strong>` from the same string cannot both be faked by a string transform of the input, because a raw-HTML pass-through fails the first and a single text node fails the second | — |

Note on control C: only **4** of 15 tests stay green against a `null` renderer, and those four are
the write-boundary and grammar assertions, which are correctly independent of the renderer. That is
the shape a non-vacuous render suite should have.

Backup discipline: every control did `cp src/components/Bullets.tsx /tmp/bl.bak` first and restored
by `cp`, with the `shasum` printed after each restore and compared to the baseline
`03d6146cd7fa25ac818d075caf015d39105b9e84`. No `git checkout`, `stash`, `reset` or `clean` was used
at any point.

### Gate B — the renderer-hygiene harness (plan Task 1 verify #2)

Probed predicate by predicate against a planted defect. **31 probes, 0 unexpected.**

| Step | Probe | Result |
|---|---|---|
| 1 | `dangerouslySetInnerHTML` present (as JSX, as an object key, as a comment) | RED, named |
| 1 | `escapeHtml` / `htmlEscape` / `escapeHtmlBeltAndBraces` present | RED, named |
| 1 | `parseBullet` renamed away (renderer grew its own parser) | RED, named |
| 1 | `import fs from "node:fs"` (**double**-quoted) | RED, named |
| 1 | `import fs from 'node:fs'` (**single**-quoted) | **PASSED — predicate could not fire. REPAIRED.** |
| 1 | `import 'node:fs';` (bare side-effect) | **PASSED — REPAIRED** |
| 1 | `require('node:fs')` | **PASSED — REPAIRED** |
| 2 | empty file | RED (via the `parseBullet` predicate) — then made explicit by the repair |
| 2 | missing file | RED, but as an unhandled `ENOENT` stack trace — made a named refusal by the repair |
| 3 | the real `Bullets.tsx` | GREEN: `OK renderer hygiene (src/components/Bullets.tsx, 82 lines, 5 predicates)` |
| 4 | walk-through: `const S = 'dangerously' + 'SetInnerHTML'; props[S] = { __html: x }` | **PASSES the harness.** Recorded as blind spot 1 in the shipped gate's header |

### Gate C — `scripts/assert-no-raw-html-sinks.mjs`

**Step 1 — plant the specific defect each rule targets. 16 probes, all RED, each naming its rule.**

```
  [ok ] REACT-RAW-HTML  .tsx     FAIL | src/lib/p.tsx:1:23:   [REACT-RAW-HTML] dangerouslySetInnerHTML
  [ok ] REACT-RAW-HTML  .ts      FAIL | src/lib/p.ts:1:20:    [REACT-RAW-HTML] dangerouslySetInnerHTML
  [ok ] REACT-RAW-HTML  .astro   FAIL | src/pages/p.astro:1:6:[REACT-RAW-HTML] dangerouslySetInnerHTML
  [ok ] REACT-RAW-HTML  .js      FAIL | src/lib/p.js:1:24:    [REACT-RAW-HTML] dangerouslySetInnerHTML
  [ok ] ASTRO-SET-HTML  .astro   FAIL | src/pages/p.astro:1:6:[ASTRO-SET-HTML] set:html
  [ok ] ASTRO-SET-HTML  .tsx     FAIL | src/lib/p.tsx:1:20:   [ASTRO-SET-HTML] set:html
  [ok ] DOM  innerHTML =         FAIL | src/lib/p.ts:1:3:     [DOM-INNERHTML-ASSIGN] .innerHTML =
  [ok ] DOM  outerHTML =         FAIL | src/lib/p.ts:1:3:     [DOM-INNERHTML-ASSIGN] .outerHTML =
  [ok ] DOM  innerHTML +=        FAIL | src/lib/p.ts:1:3:     [DOM-INNERHTML-ASSIGN] .innerHTML +=
  [ok ] DOM  innerHTML = spaced  FAIL | src/lib/p.ts:1:6:     [DOM-INNERHTML-ASSIGN] . innerHTML   =
  [ok ] DOM  insertAdjacentHTML  FAIL | src/lib/p.ts:1:4:     [DOM-INSERT-ADJACENT-HTML] insertAdjacentHTML(
  [ok ] DOM  document.write      FAIL | src/lib/p.ts:1:1:     [DOM-DOCUMENT-WRITE] document.write(
  [ok ] DOM  document.writeln    FAIL | src/lib/p.ts:1:1:     [DOM-DOCUMENT-WRITE] document.writeln(
  [ok ] sink in a // comment     FAIL | src/lib/p.ts:1:6:     [DOM-INNERHTML-ASSIGN] .innerHTML =
  [ok ] sink in a block comment  FAIL | src/lib/p.ts:1:18:    [ASTRO-SET-HTML] set:html
  [ok ] sink in a string literal FAIL | src/lib/p.ts:1:18:    [REACT-RAW-HTML] dangerouslySetInnerHTML
```

Occurrence counting, which is the requirement `grep -c` cannot meet — three sinks on **one** line:

```
  x src/lib/p.ts:1:2:  [DOM-INNERHTML-ASSIGN] .innerHTML =  —  a.innerHTML = x; b.innerHTML = y; c.outerHTML = z;
  x src/lib/p.ts:1:19: [DOM-INNERHTML-ASSIGN] .innerHTML =  —  a.innerHTML = x; b.innerHTML = y; c.outerHTML = z;
  x src/lib/p.ts:1:36: [DOM-INNERHTML-ASSIGN] .outerHTML =  —  a.innerHTML = x; b.innerHTML = y; c.outerHTML = z;
  3 finding(s) (3 sink occurrence(s)).
```

**Step 2 — nothing to check must be RED. Nine vacuous gates have shipped in this phase; five ways
this one was made to fail on purpose:**

```
  [ok ] empty scan root                  FAIL | /tmp/emptysrc: zero files scanned
  [ok ] missing scan root                FAIL | /tmp/nosuchroot: scan root is missing or is not a directory
  [ok ] root of only-empty files         FAIL | /tmp/emptyfiles: 2 file(s) scanned, 0 bytes read
  [ok ] no file matches extension list   FAIL | /tmp/onlyother: zero files scanned
  [ok ] empty-string scan root           FAIL | the scan root argument is present but empty
```

and four ways the *gate itself* is made to fail rather than reporting a clean tree:

```
  A  a real sink planted ON the allowlisted line
     x src/lib/bullets.ts:10:50: [REACT-RAW-HTML] dangerouslySetInnerHTML — * The legacy app rendered
       these strings through dangerouslySetInnerHTML={{ __html: b }}
  B  the allowlisted prose reworded (stale exemption)
     x src/lib/bullets.ts:10:51: [REACT-RAW-HTML] dangerouslySetInnerHTML — * The old app piped these
       strings straight into `dangerouslySetInnerHTML`
  C  the exempted text deleted (deleting the thing under test must not be what makes it green)
     x src/schemas/resume.ts: allowlist entry for [REACT-RAW-HTML] matched nothing
  E  one rule regex broken
     assert-no-raw-html-sinks: SELF-TEST FAILED — the gate cannot be trusted.
       x ASTRO-SET-HTML: did NOT flag its own canary. The rule is broken, and every clean run it has
         ever reported is worthless.
  F  one allowlist reason shortened to a non-reason
     assert-no-raw-html-sinks: SELF-TEST FAILED — the gate cannot be trusted.
       x allowlist entry for src/lib/bullets.ts carries no usable reason. An exemption without a
         reason is an exemption nobody can review.
```

A, B and C edit reviewed source (`src/lib/bullets.ts`, `src/schemas/resume.ts`). Each was `cp`-backed
up first and restored by `cp`, with `shasum` printed before and after and compared:
`bullets.ts ccc1d40391d0b58e94ee86afbb4dbb6143a556c3`,
`resume.ts ae170a24db690ed5bae6680b77bdfbf8d2fb6748`. Both matched after every restore.

**Step 3 — correct code must be GREEN. Seven anti-canaries, all PASS:** the real clean tree;
`if (el.innerHTML === m) { const s = el.outerHTML; }` (comparison and read, not assignment);
`set:text`; `set:htmlLabel`; `insertAdjacentElement`; `const written = document.querySelector(…)`;
and a verbatim copy of the real `Bullets.tsx`. A rule that fired on any of these would be disabled
inside a week, at which point it protects nothing.

**Step 4 — walk-through attempts. Three succeeded**, i.e. three inputs satisfy the gate while
violating its intent. All three are written into the shipped gate's own header as blind spots, not
buried here:

```
  [ok] dynamic DOM property name        PASS   el["inner" + "HTML"] = markup;
  [ok] dynamic React prop name          PASS   const K = "dangerously" + "SetInnerHTML"; { [K]: { __html: x } }
  [ok] sink in an unscanned extension   PASS   src/lib/p.svelte  <div>{@html markup}</div>
```

### The sink gate's blind spots, stated as blind spots

Verbatim from the gate's header, each found by walking through rather than by imagining:

1. **It reads text, not syntax.** A dynamically assembled sink is invisible. Demonstrated above,
   twice. Closing it needs an AST pass or a CSP; neither is in Phase 3's scope.
2. **It scans one root, `src/` by default.** `public/` ships JavaScript straight to the browser and
   is not scanned. It holds no `.js` today (a PDF, an SVG, three PNGs), so widening now would assert
   about an empty set — but the moment `public/` gains a script, the list must grow. `scripts/` and
   `test/` are unscanned deliberately: this gate names all five sinks in prose and would flag itself.
3. **Its extension list is finite.** A sink in a `.svelte`, `.vue`, `.html` or `.md` file under
   `src/` is invisible. Demonstrated above.
4. **It cannot tell a mention from a use — so it does not try.** It matches comments and strings on
   purpose. The two genuine mentions are allowlisted, and an allowlisted occurrence is still refused
   in use form, so the allowlist can never forgive a real sink.
5. **It says nothing about whether the safe renderer is used.** Nothing renders a bullet until
   Phase 5. This gate proves the unsafe path fails; it does not prove the safe path is taken.

### The allowlist, with reasons

| Rule | File | Reason |
|---|---|---|
| `REACT-RAW-HTML` | `src/lib/bullets.ts` | prose in the grammar module's header, recording the legacy defect this whole shape exists to close. Deleting the sentence to satisfy a grep would delete the reason the shape is the shape. |
| `REACT-RAW-HTML` | `src/schemas/resume.ts` | the zod refinement's own error message, which tells whoever trips it WHY bold-only markdown is the stored shape. An error message that explains itself is worth more than a clean grep. |

Both are matched by `(file, line-substring)` — never by line number — and both are re-checked against
`usePattern` so neither can shelter an actual sink. Proofs A, B and C above.

## The `&` proof

`pharmeasy#2` — **0-indexed within the role**, i.e. `experience[pharmeasy].bullets[2]`, the ninth
bullet in the corpus. It is simultaneously the only bullet containing `&` (1 of 13) and the only
bullet containing no `**` markup (1 of 13), which is what makes it the right fixture: the round-trip
identity below only holds for a markup-free bullet.

```
stored on disk:
  "Delivered a client-side recommendation system leveraging a rule engine to enable product upsell & cross-sell"

rendered by src/components/Bullets.tsx via renderToStaticMarkup:
  <ul><li>Delivered a client-side recommendation system leveraging a rule engine to enable product upsell &amp; cross-sell</li></ul>

"&" characters in the rendered output ........... 1
"&amp;" occurrences (correct single encoding) ... 1
"&amp;amp;" occurrences (DOUBLE encoding) ....... 0
"&#38;" / "&#x26;" numeric forms ................ 0

round trip — decode the entity references:
  "<ul><li>Delivered a client-side recommendation system leveraging a rule engine to enable product upsell & cross-sell</li></ul>"
  byte-identical to `<ul><li>` + stored + `</li></ul>` ... true
  "&" characters after decoding .......................... 1

whole corpus, all 13 bullets in one render:
  <li> 13   <strong> 17   "&" chars 1   "&amp;" 1   "&amp;amp;" 0
```

So: **exactly one `&` character in the entire rendered corpus, encoded exactly once, decoding back
to exactly the stored bytes.** No double escaping, nothing lost, nothing added.

**Proof that the assertion can fail** (step 1, applied to this claim specifically): CONTROL D plants
a hand-rolled escaper on top of React's — `s.replace(/&/g,'&amp;')` before handing the text to a
React child, which then escapes the `&` again. The suite goes **RED 4/15**, and the named failure is
the ampersand test:

```
× escapes the corpus’s one literal ampersand exactly once, and never twice
AssertionError: expected '<ul><li>Improved <strong>conversion b…' not to contain '&amp;amp;'
```

The same fixture is also caught independently by the renderer-hygiene predicate
(`escapeHtmlBeltAndBraces` matches `escapeHtml`), and by the round-trip decode, which yields
`upsell &amp; cross-sell` instead of the stored text. Three independent detectors; a note in the
test records that the character count **alone** does not catch `&amp;` → `&amp;amp;` (both contain
one `&` character), which is why `not.toContain('&amp;amp;')` sits beside it.

## Contradictions with the plan, the context doc and the brief

### 1. The literal reading of the `&` instruction is satisfied only by the vulnerable renderer

The brief asks to "prove the rendered output contains exactly one `&`, **not `&amp;`**". Taken as a
claim about the HTML source, that is not achievable by any correct renderer and was not asserted.
React's `renderToStaticMarkup` escapes `"`, `'`, `&`, `<`, `>` in text children — `&amp;` **is** one
literal `&` correctly encoded, and it is what a browser must be given to display a single ampersand.

What actually emits a bare `&` with no `&amp;` in the source is a renderer with no encoding at all:

```
<ul><li>… product upsell & cross-sell</li></ul>       contains a bare "&" and no "&amp;": true
```

That is **CONTROL A** — the legacy raw-HTML-sink renderer, the exact defect this plan closes. So an
assertion of the literal form would have *rewarded* the vulnerability and gone red against the safe
renderer. It was replaced with the character-level claim (`exactly one "&" character`), the
correct-encoding claim (`&amp;` once, `&amp;amp;` never), and the round-trip identity — all three of
which the safe renderer satisfies and all three of which CONTROL D breaks.

The mirror-image bug the brief is guarding against is real, and it is **double** escaping
(`&amp;amp;`), not encoding at all. It is asserted directly and proven able to fail.

### 2. `pharmeasy#2` is 0-indexed within its role

Recorded because it cost a wrong measurement here. A 1-indexed reading points at *"Developed UIs for
receipt generation and editing, reducing support tickets and `**response time by 30%**`"* — which
contains markup and no `&`, and would have made the whole proof about the wrong bullet. The
0-indexed reading agrees with 03-CONTEXT.md §1 row 2, which names `pharmeasy#2` as the one bullet
containing no markup. Both statements point at `bullets[2]`.

### 3. Two plan harnesses invert their verdict under this repo's shell — see "Repairs" below

### 4. Not a contradiction, checked and confirmed

- **`focalPoint` is untouched.** This plan renders résumé prose, not photographs, so
  `DEFAULT_FOCAL_POINT` is not its business. Verified: 39 records, **0** carrying `focalPoint`, and
  `test/content/schemas.unit.test.ts` including *"does NOT materialise focalPoint on parse"* is green
  (107/107).
- **13 bullets / 17 bold runs**, exactly as the plan's behaviour clause states, measured from disk
  rather than carried.
- Nothing was installed. `react-dom/server` was already a dependency; `astro/zod` only; no
  sanitiser, consistent with `research/STACK.md` ruling out `isomorphic-dompurify` and
  `sanitize-html` for `workerd`.
- The plan's `<output>` block is well formed (single `</output>` at line 318). An earlier reading
  that suggested a duplicated closing tag was a display artefact, not a defect.

## Plan-supplied gates and harnesses repaired

### R1 — `${PIPESTATUS[0]}` in two harnesses (plan Task 1 verify #1, Task 2 verify #1)

Bash-only. zsh provides lowercase `pipestatus`, 1-indexed; `PIPESTATUS` is undefined, so
`test ${PIPESTATUS[0]} -eq 0` becomes `test -eq 0`.

**Before**, run verbatim in **zsh** against a 15/15-green suite and an exit-0 gate:

```
zsh:test:1: unknown condition: -eq
FAIL: boundary suite red                 <- suite was 15/15 GREEN
zsh exit=1

zsh:test:1: unknown condition: -eq
FAIL: gate fires on the clean tree       <- gate had exited 0
zsh exit=1
```

**After** — same text, run under `bash -c`:

```
bash exit=0
HARNESS 2-1 OK
bash exit=0
```

**Repair:** run both under `bash -c` explicitly. A durable fix would be
`node … ; rc=$?; … | tail -50; exit $rc`, which needs no `PIPESTATUS` at all.

### R2 — renderer-hygiene predicate 4 could not fire (plan Task 1 verify #2)

**Before:** `/^\s*import[^\n]*from\s+"(node:[^"]+|fs|path)"/m` — matches only **double-quoted**
specifiers. `biome.json` sets `"quoteStyle": "single"`, so every file that passes `npm run check`
uses single quotes and this predicate could never fire on lint-clean source. Probes:

```
P4dq   FAIL (exit 1)  Node-only import in a component rendered in workerd   <- double quotes: fires
P4sq   PASS (exit 0)  <-- BLIND to single quotes, the style biome.json enforces
P4bare PASS (exit 0)  <-- BLIND to a bare side-effect import
```

This is the same class as 03-06's three double-quote predicates and the tenth uncatchable predicate
found in this phase.

**After** — quote-agnostic, plus bare side-effect imports and `require()`, plus a widened specifier
list, plus a named refusal on a missing or empty target file:

```
4dq    FAIL (exit 1) Node-only import in a component rendered in workerd
4sq    FAIL (exit 1) Node-only import in a component rendered in workerd
4bare  FAIL (exit 1) Node-only import in a component rendered in workerd
4req   FAIL (exit 1) Node-only import in a component rendered in workerd
clean  OK renderer hygiene (src/components/Bullets.tsx, 82 lines, 5 predicates)
empty  FAIL: /tmp/probe/empty.tsx is empty — a hygiene check over no source checks nothing
miss   FAIL: /tmp/probe/nope.tsx does not exist — there is nothing to check, which is not a pass
```

Run in **bash**. Note this predicate lives only in the plan's `<verify>` block, not in a shipped
gate — see the handoff below.

### R3 — my own gate's `writeln?` regex, caught by its own self-test before its first real run

**Before:** `/\bdocument\s*\.\s*writeln?\s*\(/g`. `writeln?` is `writel` + optional `n`, **not**
`write` + optional `ln`, so it matched neither `document.write(` nor `document.writeln(`. The
gate's first invocation refused to run:

```
assert-no-raw-html-sinks: SELF-TEST FAILED — the gate cannot be trusted.
  x DOM-DOCUMENT-WRITE: did NOT flag its own canary. The rule is broken, and every clean run it has
    ever reported is worthless.
```

**After:** `/\bdocument\s*\.\s*write(?:ln)?\s*\(/g`; both spellings now flagged. This is the
canary/anti-canary discipline paying for itself on the first run — a tenth vacuous gate that never
shipped.

### R4 — my own probe harness, defeated by zsh word-splitting (the third distinct shell failure in this phase, and the first inside an executor's harness rather than a plan)

**Before:** the harness did `GATE="node scripts/assert-no-raw-html-sinks.mjs"` and then `$GATE`.
**zsh does not word-split unquoted parameter expansions**, so `$GATE` ran as one malformed command
name and exited **127**. A harness testing only for a non-zero exit reads 127 as "the gate failed" —
so three allowlist proofs reported `ok FAIL, as required` while the gate had never executed:

```
=== A. the allowlist must NOT forgive a real sink ===
  ok  FAIL, as required:          <- and then no evidence lines at all
=== D. more vacuity ===
  missing root:   empty files:    no matching ext:      <- every probe silently empty
    (eval):57: no such file or directory: node scripts/assert-no-raw-html-sinks.mjs
```

Caught because the evidence lines were blank, not because the exit codes were wrong.

**After:** the harness runs under `bash`, invokes `node` directly rather than through a variable,
and — the actual fix — carries an **evidence assertion**: a control that expects RED must find a
`^  x ` / `REFUSED` / `SELF-TEST FAILED` line in the captured output and, where a rule is named,
must find that rule's id. Anything else is reported as `[VAC]`, not as a pass:

```
verdict() {
  if [ "$got" = FAIL ] && ! grep -q '^  x \|REFUSED\|SELF-TEST FAILED' /tmp/pg.txt; then
    printf '  [VAC] %-42s non-zero exit, NO named failure line — not evidence\n' "$label"; ...
```

Re-run under bash: **31 probes as expected, 0 unexpected-or-vacuous** for the sink gate; all six
allowlist/self-test proofs producing named failure lines; renderer controls asserted on
`AssertionError` presence rather than on exit code alone.

### R5 — a real hole in the shipped gate, found by R4's bug (commit `62248a5`)

The broken harness passed `"${4:-}"` for an unset positional, i.e. an **empty string** as
`process.argv[2]`. `path.resolve(cwd, '')` returns `cwd`, so the gate silently scanned the entire
repository — reporting real `.innerHTML =` hits in vendored `design_handoff_portfolio/support.js`
for a caller that had asked about `src/`, while presenting as a deliberate narrow scan.

**After:** an argument that is present but empty is a named refusal.

```
assert-no-raw-html-sinks: REFUSED — the scan root argument is present but empty.
  path.resolve(cwd, '') is cwd, so this would have scanned the entire repository rather than the
  directory you meant. Pass a real path, or pass no argument to scan src/.
```

### Transcription note

The plan's CONTROL A heredoc writes `'<strong>$1</strong>'` in single quotes. Nesting that heredoc
inside `bash -c '…'` required re-quoting to `"<strong>$1</strong>"`. Semantically identical — inside
a quoted `<<'TSX'` heredoc neither form is expanded, and `$1` is a regex backreference consumed by
`String.replace`, not a shell positional. Recorded so the transcript is not mistaken for a different
control.

## Verification state

| Check | Result |
|---|---|
| `xss-boundaries.unit.test.ts` | 15 / 15 |
| `vitest run --project unit` | 444 / 444, 7 files |
| `npm test` (all three projects) | **473 / 473, 11 files** (was 458 / 10) |
| `npm run check` (biome + prettier) | 54 files, 0 errors |
| `npm run typecheck` (`astro check`) | 0 errors, 0 warnings, 6 hints |
| `node scripts/assert-no-raw-html-sinks.mjs` | exit 0, 21 files / 94290 bytes / 5 rules / self-test 5/5 |
| `npm run gate:schema` | `assert-single-schema-source: PASS` |
| `npm run gate:origin` | `assert-no-r2dev-urls: PASS` |
| `npm run gate:routes` | `assert-no-prerendered-protected-routes: PASS` |

`src/components/Bullets.tsx` is new source under `src/` and therefore newly in scope for
`gate:schema`; it trips none of its four rules (no rival zod object, no rival content type — the prop
is `items`, not `bullets` — no hand-rolled content guard, no schema loosening).

### What these checks cannot see

1. **Nothing renders a bullet.** There is no `/resume` page until Phase 5. This proves
   `Bullets.tsx` is safe, not that the site is. The sink gate is the only thing making the
   alternative fail.
2. **`renderToStaticMarkup` is the server path, not the client one.** If Phase 5 hydrates a bullet
   list as an island, the client render is React's too and the same escaping applies — but that is
   an argument, not an observation, and no test here makes it.
3. **The gate reads text, not syntax.** Three walk-throughs succeeded; all three are in the gate's
   own header.
4. **The Node-only-import predicate is not a shipped gate.** It exists only in this plan's
   `<verify>` block, so nothing stops a future `src/` component importing `node:fs` and breaking
   prerender in `workerd`. Flagged for 03-08.

## Handoff

- **03-08 owns wiring `assert-no-raw-html-sinks.mjs` into `build` and CI.** It is deliberately **not**
  in `package.json`; 03-08 registers and chains every Phase 3 gate in one place. Suggested entry:
  `"gate:sinks": "node scripts/assert-no-raw-html-sinks.mjs"`, chained into `build` alongside
  `gate:routes`.
- **Also for 03-08:** consider promoting the repaired Node-only-import predicate (R2) into a shipped
  gate over all of `src/`. Every component under `src/` prerenders in `workerd`, and there is
  currently no build-time check for a `node:` specifier there.
- **For Phase 5:** `Bullets.tsx` takes `string[]` straight off `data/resume.json`. Use it; do not
  reach for a string. The gate makes the alternative fail by name. When `public/` gains its first
  `.js`, widen the gate's scan roots — blind spot 2 says so in the gate source.

## Self-Check: PASSED

- `src/components/Bullets.tsx` — FOUND
- `test/content/xss-boundaries.unit.test.ts` — FOUND
- `scripts/assert-no-raw-html-sinks.mjs` — FOUND
- `75e1168` `test(03-07): add failing both-boundaries spec for criterion 3` — FOUND
- `a76ba1d` `feat(03-07): render bullets as elements, never as HTML strings` — FOUND
- `69445a8` `feat(03-07): ban raw-HTML sinks under src/, in all three spellings` — FOUND
- `62248a5` `fix(03-07): refuse an empty-string scan root instead of widening to cwd` — FOUND
