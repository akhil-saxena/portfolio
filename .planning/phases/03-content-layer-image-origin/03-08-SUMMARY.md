---
phase: 03-content-layer-image-origin
plan: 08
subsystem: content
tags: [astro-integration, content-collections, zod, build-gate, ci, criterion-2]

requires:
  - phase: 03-01
    provides: "scripts/assert-no-r2dev-urls.mjs, registered as gate:origin; src/lib/image-origin.ts"
  - phase: 03-06
    provides: "src/schemas — the single import surface, and validateContentSet / formatContentSetReport"
  - phase: 03-07
    provides: "scripts/assert-no-raw-html-sinks.mjs, deliberately left unregistered so 03-08 could wire it in one place"
provides:
  - "astro.config.mjs `content-gate` integration — the one enforcement point that does not depend on a page existing; runs on astro build, astro check and astro sync"
  - "src/lib/content-errors.ts — the zod-issue → file/record/field formatter"
  - "src/content.config.ts — photos and projects as file() collections, a measured second enforcement point"
  - "src/lib/content.ts — the three singleton files as typed validated exports (not an enforcement point today; recorded as such)"
  - "test/content/build-fails-loudly.node.test.ts — 11 cases, each spawning a real astro build"
  - "npm run gate:content — every Phase 3 gate behind one line; build ends in it, deploy and CI re-run it after the test rebuild"
affects: [phase-5-render, phase-7-admin]

tech-stack:
  added: []
  patterns:
    - "Measure the abort behaviour of the toolchain before choosing a mechanism — three of this plan's four premises were measurably different from the documents that asserted them"
    - "An astro:config:done integration hook is the unconditional build-time validation point; a module-scope parse is not, until a page imports the module"
    - "Throw with `error.stack = ''` so Astro prints the report and not twelve frames of Vite internals"
    - "A readable content error names file → record-by-its-own-identifier → field; both the addressing id and the display name are printed"
    - "Test mutations run in a disposable copy of the project, because Vitest runs the four projects concurrently and one of them reads data/*.json at import time"
    - "A control passes only when the gate exits non-zero AND its output names the rule that should have caught it"

key-files:
  created:
    - src/lib/content-errors.ts
    - src/lib/content.ts
    - src/content.config.ts
    - test/content/build-fails-loudly.node.test.ts
  modified:
    - astro.config.mjs
    - src/schemas/content-set.ts
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "The cross-file rules run from an `astro:config:done` integration hook in astro.config.mjs. Chosen over `astro:build:start` after measuring both: both fail the build, but config:done also fires on `astro check` and `astro sync`, so typecheck and dev enforce the same rules as build."
  - "`research/ARCHITECTURE.md` Pattern 2's claim was measured FALSE in this repository. A module-scope ResumeSchema.parse() with a corrupt resume.json left astro build at exit 0 with dist/ emitted, because nothing imports the module until Phase 5. src/lib/content.ts still ships, with that recorded in its own header."
  - "FIVE content files, not four. The plan's must_haves and <verification> both say four; 03-CONTEXT.md §2 is right. The gate asserts its own file count against ContentSetInput's keys and refuses on a mismatch."
  - "The formatter frames per-issue and reuses zod's own issue.message verbatim. z.prettifyError is NOT used: it renders a whole error with its own `→ at path` line, so wrapping it per-issue prints the path twice."
  - "The record crumb carries both the addressing id and the display name (`brevo — Brevo (Formerly Sendinblue)`). Found by planting: id alone said `brevo`, display alone would have called a photograph `Hills And Greens` when peekIds addresses it as `nature-hillsandgreens`."
  - "The build-fails-loudly suite mutates a disposable sandbox rather than data/. A restore narrows the corruption window; it does not close it, and schemas.unit.test.ts reads all five data files at import time in a concurrently-scheduled project."
  - "ci.yml gains one step, after Test — confirmed necessary by reading test/setup/preview-server.ts:248, which runs `astro build` directly and therefore leaves a rebuilt dist/ that no dist-scoped gate has seen."

patterns-established:
  - "gate:content: one chained script holding every gate the phase produced, so enforcement is one reviewable line rather than five plans' worth of edits"
  - "Detonate the suite, not just the gate: removing the mechanism from astro.config.mjs must turn the evidence suite red, and it turns 10 of 11 red"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04]

duration: 35min
completed: 2026-08-26
---

# Phase 3 Plan 08: Build refusal and gate chaining Summary

**A malformed `data/*.json` now stops `astro build`, `astro check` and `astro sync` with a message
that names the file, the record by its own identifier and the field — and every gate Phase 3
produced sits behind one `npm run gate:content` that `build`, `deploy` and CI all run.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 of 3 (Task 3's human-verify checkpoint deferred to review — see below)
- **Files created:** 4 · **Files modified:** 4
- **Suite:** 484 passed / 484, across 12 files (was 473 / 11)
- **Commits:** `658bd92`, `bbf8348`, `719729d`

---

## 1. The measurements, which are the point of this plan

Every number below is an exit code from this machine, this session, against the real toolchain
(Astro 7.2.2, astro/zod 4.4.3, Node 22.22.3, shell **zsh**; harnesses run under **bash** where
noted). `dist/` was removed before each run so emission is observable rather than inherited.

| # | Premise under test | Result | `dist/` |
|---|---|---|---|
| 0 | A clean tree builds | `npm run build` **exit 0**, 6s | emitted |
| 1 | A `file()` collection schema failure **aborts** the build | `astro build` **exit 1** | **not** emitted |
| 2 | A per-file schema can see a typo'd `category` | `astro build` **exit 0** — it cannot | emitted |
| 3 | `ARCHITECTURE.md` Pattern 2: a module-scope parse aborts the build | `astro build` **exit 0** — **the claim is false here** | emitted |
| 4a | A throw in `astro:config:done` fails the build | **exit 1** | not emitted |
| 4b | A throw in `astro:build:start` fails the build | **exit 1** | not emitted |
| 4c | A multi-line message with `error.stack = ''` prints verbatim, no stack trace | **exit 1**, clean output | not emitted |
| 4d | `astro:config:done` also fires under `astro check` | **exit 1** | — |
| 4e | …and under `astro sync` | **exit 1** | — |
| 4f | `astro.config.mjs` can import TypeScript out of `src/` | **exit 0**, `validateContentSet` ran over all five files | emitted |
| 5 | What `astro/zod` says on its own | see below | — |

### Experiment 1 — the collection loader does abort, and says which record

`data/portfolio_images.json`, record 12 → `order: "twelve"`. Nothing imports `getCollection`
anywhere in the repository.

```
12:03:36 [content] Syncing content
[InvalidContentEntryDataError] photos → nature-hillsandgreens data does not match collection schema.

  order**: **order: Expected type `"number"`, received `"string"`
...
  Location:
    /Users/…/portfolio/data/portfolio_images.json:0:0
  Stack trace:
    at getEntryData (…/astro/dist/content/utils.js:156:14)
```

**Exit 1, no `dist/`.** Content sync runs before the build whether or not a page reads a
collection. The message is good — it names the collection, the record's id and the field — and it is
followed by a stack trace and a `:0:0` location, which is the half this plan improves on.

### Experiment 2 — and this is the finding that justifies the whole mechanism

`architecture-singapore`'s `category` set to `"archtecture"`. A perfectly valid lowercase slug, so
`PhotoSchema.category` (`z.string()` by design — 03-06 refused an enum because it would be the
second source of truth about what a category is) cannot see it.

```
12:03:55 [build] Complete!
EXIT=0   dist emitted: YES
```

**The build was green over an orphaned photograph.** This is the exact rule ADR-002 §4 traded
`/admin/site` for. Without the mechanism below, that trade bought nothing.

### Experiment 3 — `research/ARCHITECTURE.md` Pattern 2 is false in this repository

Pattern 2 asserts that a module-scope `Schema.parse(raw)` in `src/lib/content.ts` *"aborts `astro
build` with the zod issue path — no bad page is emitted"* because *"Astro evaluates this during
prerender."*

Written exactly that way, with `data/resume.json` carrying `experience[0].bullets[2] = 12345`, and
`grep -rn "lib/content" src test` returning **nothing**:

```
EXIT=0
dist emitted: YES
12:04:11 [build] Complete!
```

The claim is not wrong in general — it is wrong about a repository with no consuming page, which is
this one until Phase 5. `src/pages/index.astro` renders `StackProof` and no content. **Had this plan
cited the document instead of measuring it, the ADR-002 rule would have shipped in dead code and the
manifest could have gone to production with 39 orphaned photographs.**

### Experiment 4 — the hook, and why the stack is emptied

4a, `astro:config:done` throwing, exit 1 — but the output was:

```
12:04:26 [ERROR] [EXPERIMENT-4-throwing-hook] An unhandled error occurred while running the "astro:config:done" hook
EXPERIMENT-4: thrown from astro:config:done
  Location:
    …/astro/dist/integrations/hooks.js:56:21
  Stack trace:
    at astro:config:done (…/astro.config.mjs?t=1787726066082:29:17)
    at withTakingALongTimeMsg (…/astro/dist/integrations/hooks.js:34:18)
    … 3 more frames
```

4b, same throw with `err.stack = ''`:

```
12:04:44 [ERROR] [EXPERIMENT-4-throwing-hook] An unhandled error occurred while running the "astro:build:start" hook
EXPERIMENT-4: thrown from astro:build:start
```

That is the whole output. 4c confirmed a multi-line message prints verbatim, indentation preserved,
no stack. 4d and 4e confirmed `config:done` fires under `astro check` and `astro sync` as well as
`astro build`. Hook names were read out of
`node_modules/astro/dist/types/public/integrations.d.ts` lines 308–380, not out of a tutorial.

4f confirmed the config file can import TS from `src/` — and turned up a constraint worth recording:
**`src/schemas/index.ts` uses extensionless relative specifiers, which only a bundler resolves.**
`node --experimental-strip-types` cannot import it (`ERR_MODULE_NOT_FOUND` on
`src/schemas/content-set`). That is why the content gate lives in the build and not in a
`scripts/*.mjs` beside the other four.

### Experiment 5 — what `astro/zod` says on its own, verbatim

Probed through Vite (the same import path the gate uses), on `experience[0].bullets[2] = 12345`:

```
=== issues JSON ===
[ { "expected": "string", "code": "invalid_type",
    "path": [ "experience", 0, "bullets", 2 ],
    "message": "Invalid input: expected string, received number" } ]
=== z.prettifyError ===
✖ Invalid input: expected string, received number
  → at experience[0].bullets[2]
=== api presence === function function
```

Both `prettifyError` and `treeifyError` exist. Neither knows the file, and neither knows that
`experience[0]` is Brevo. That gap is criterion 2.

---

## 2. The mechanism chosen, and why

**An inline Astro integration named `content-gate`, on `astro:config:done`, in
`astro.config.mjs`.** It reads all five `data/*.json` files with `node:fs`, calls
`validateContentSet` from `src/schemas`, and throws a formatted report with `stack` emptied.

Why this and not the alternatives:

- **Not a module-scope parse** — experiment 3. It does not run.
- **Not the collections alone** — experiment 2. They cannot see a cross-file rule, and their loader
  source (`astro/dist/content/loaders/file.js`) *logs and returns* on a missing or unparseable file
  and *warns* on an empty array. A deleted `data/projects.json` would leave the collection silently
  empty and the build green.
- **`config:done` over `build:start`** — both abort (4a/4b). `config:done` additionally covers
  `astro check` and `astro sync`, so `npm run typecheck` and `npm run dev` enforce the same rules.
  Three chances to hear about a bad edit instead of one.

The collections **also** ship (`src/content.config.ts`), as a genuinely independent second
enforcement point — proven in the suite, where removing the gate leaves the wrong-type case still
red via `InvalidContentEntryDataError` and the `projects.json` case still red via `ProjectSchema`.

`src/lib/content.ts` ships too, for the three object files, with experiment 3's result written into
its own header so nobody later mistakes it for a gate.

### FIVE files, not four

The plan's `must_haves` truth #4 and its `<verification>` both say *"the four committed data
files"*. **There are five**: `portfolio_images.json`, `site_config.json`, `resume.json`,
`projects.json`, `home_config.json`. `03-CONTEXT.md` §2 is correct and the plan is not —
`projects.json` was created by 03-05 under D-24, and RI-5 reads it for project-id uniqueness.

The gate does not merely read five; it **asserts** it reads five, against `ContentSetInput`'s key
list. Detonated by deleting the `projects` key:

```
12:15:41 [ERROR] [content-gate] An unhandled error occurred while running the "astro:config:done" hook
content-gate is misconfigured: it reads 4 file(s) (photos, site, home, resume) but
validateContentSet consumes 5 (photos, site, home, projects, resume). Missing: projects.
A rule whose input is absent is skipped, and a skipped rule looks exactly like a rule that passed.
```

Exit 1, no `dist/`. And on the pass path the census is logged, so a run over zero photographs cannot
present as a run over 39:

```
12:28:57 [content-gate] content set: PASS · checked: 39 photo(s), 7 category record(s), 6 peek id(s),
1 peek position(s), 5 project(s), 7 categoryOrder group(s) · rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
```

---

## 3. The deliverable: a planted defect in each of the five files, verbatim

Every message below is copied out of a real `astro build`. Each run exited **1** with **no `dist/`**,
and after each the five data files were compared byte-for-byte against a `cp` backup taken before any
edit (`cmp -s`, all `IDENTICAL`).

### 3.1 `data/portfolio_images.json` — wrong type

Planted: record 12 (`nature-hillsandgreens`), `order: "twelve"`.

```
content set: REFUSED — 1 finding(s)
  ✖ [SCHEMA-photos] data/portfolio_images.json → nature-hillsandgreens — Hills And Greens [photos[12] of 39] → order: Invalid input: expected number, received string · expected number · received "twelve"
      data/portfolio_images.json does not match its schema in src/schemas, so nothing downstream may assume its shape.
  checked: 39 photo(s), 7 category record(s), 6 peek id(s), 1 peek position(s), 5 project(s), 0 categoryOrder group(s)
  rules run: RI-4
  rule NOT run: RI-1 — not run — data/portfolio_images.json did not satisfy its own schema, so the values this rule compares are not trustworthy. It did NOT pass.
```

Compare with zod's own `Invalid input: expected number, received string → at [12].order`.

### 3.2 `data/site_config.json` — wrong type

Planted: `categories[2].columns = "three"`.

```
  ✖ [SCHEMA-site] data/site_config.json → nature [categories[2] of 7] → columns: Invalid input: expected number, received string · expected number · received "three"
```

### 3.3 `data/resume.json` — an HTML tag in a bullet

Planted: `experience[0].bullets[0] = "Improved <script>alert(1)</script> conversion"`.

```
  ✖ [SCHEMA-resume] data/resume.json → brevo — Brevo (Formerly Sendinblue) [experience[0] of 3] → bullets[0]: contains an HTML tag. Stored résumé prose is bold-only inline markdown; the legacy app rendered these strings through dangerouslySetInnerHTML with no sanitiser anywhere in the repository, and ADR-001 answered that by making markup unrepresentable rather than by filtering it. Predicate imported from src/lib/bullets.ts. · received "Improved <script>alert(1)</script> conversion"
```

The one mutation in the phase that exercises criteria 1, 2 and 3 at once.

### 3.4 `data/projects.json` — a literal component figure (OD-6)

Planted: `design-system`'s description → `"An 81-component React library with semantic tokens and dark mode."`

```
  ✖ [SCHEMA-projects] data/projects.json → design-system — Design System [projects[4] of 5] → description: OD-6: a project description may not carry a literal component figure. It has been wrong three times in nine days. Use the {{ds.componentCount}} token, which Phase 5 resolves against the design system catalog, or reword so no figure appears. · received "An 81-component React library with semantic tokens and dark mode."
```

### 3.5 `data/home_config.json` — a schema failure inside a record

Planted: `socialLinks[1].url = "github.com/akhil-saxena"`.

```
  ✖ [SCHEMA-home] data/home_config.json → LinkedIn [socialLinks[1] of 3] → url: Invalid URL · received "github.com/akhil-saxena"
```

### 3.6 The ADR-002 rule — the case the whole phase exists for

Planted: `architecture-singapore`'s `category` → `"archtecture"`. Green before this plan
(experiment 2); now:

```
  ✖ [RI-1] data/portfolio_images.json → architecture-singapore → category: category "archtecture" does not exist in data/site_config.json
      the 7 declared ids are: abstract, architecture, nature, portraits, product, street, wildlife. Comparison is exact — no case transform on either side. ADR-002 §4 removed the screen that used to make this impossible, so this rule is the only thing between a hand-edit and an orphaned photograph.
  checked: 39 photo(s), 7 category record(s), 6 peek id(s), 1 peek position(s), 5 project(s), 8 categoryOrder group(s)
  rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6
```

### 3.7 A dangling peek id, and the truncation rule

```
  ✖ [RI-3] data/home_config.json → peekIds[0]: "does-not-exist" is not the id of any photograph
```

```
  ✖ [SCHEMA-photos] data/portfolio_images.json → architecture-hauntedmansionjpg — Haunted Mansion [photos[3] of 39] → urls.thumb: urls.thumb is a base64 LQIP and must start with "data:image/webp;base64," … · received "https://evil.test/xxxxxxxxxx…xxx… (+305 more characters)"
```

A base64 thumb printed in full would bury the line that says what is wrong with it.

### 3.8 A defect found in the formatter by planting, not by reading

The first version resolved the record name from one ordered list of identifying keys. On
`resume.json` that produced **`brevo`** — correct, and not what the author calls the record. Fixing
it by preferring display fields then produced **`nature-hillsandgreens — nature`** on a photograph,
which repeats a facet instead of naming the picture. The shipped version keeps two lists — an
*addressing* key (`id`) and a *display* key — prints both when they differ, and orders `category`
**last** among display keys so it serves only the skill group, whose `category` genuinely is its
name. Both mistakes are written into the file's comments with what produced them.

---

## 4. Anti-vacuity: nothing to check is a failure

| Input | Result |
|---|---|
| `portfolio_images.json` = `[]` | exit 1 — `holds no photos`, census reports `0 photo(s)` |
| `portfolio_images.json` = `[{ "id": "oops", ]` | exit 1 — `could not be read as JSON — Expected double-quoted property name in JSON at position 17` |
| `projects.json` truncated to 0 bytes | exit 1 — `could not be read as JSON — Unexpected end of JSON input` |
| `CONTENT_FILES` missing a key | exit 1 — names `projects` (see §2) |
| the integration removed from `integrations:` | 10 of 11 suite cases go red (see §5) |

The broken-JSON and zero-byte cases matter because a file that never parses never reaches a schema,
so it produces no zod issue — and without the read-failure branch it would have produced no finding
either.

---

## 5. The evidence suite, and its detonation

`test/content/build-fails-loudly.node.test.ts`, in the `integration` project: **11 cases, 11
passing, 20.5s**. Each spawns a real `astro build` via `execFile(process.execPath, [astroBin,
'build'])` and asserts, in this order: output non-empty → exit code non-zero → `dist/` **not**
emitted → the output contains the file, the record's own identifier and the field.

The order is deliberate and so is the length check. **While prototyping this harness the astro
binary path was wrong, the spawn exited 1 with `Cannot find module …/astro.js`, and no build ever
ran** — a test asserting only `exitCode !== 0` is green in exactly that state. That is class 5 from
the brief, reproduced accidentally and then designed against.

**Detonation.** With `contentGate` removed from `astro.config.mjs`:

```
Tests  10 failed | 1 passed (11)
```

Three things that says:

1. The suite is load-bearing. Deleting the mechanism does not go unnoticed.
2. The one survivor is the `projects.json` case — because `ProjectSchema` is also the `projects`
   collection's schema, so the collection caught it. Independent enforcement, demonstrated.
3. The two "gate removed" control cases failed **at 1 ms**, before running a build, because
   `disableContentGate()` asserts its string replacement actually landed and it had not. A negative
   control that would otherwise have silently tested the wired config refused instead.

**No repository mutation.** The suite mutates a disposable copy of the project (`src`, `public`,
`data`, `astro.config.mjs` copied; `node_modules` symlinked) and asserts a SHA-256 of the
repository's own five content files is unchanged in `afterAll`. The plan asked for a byte-copy
restore in an unconditional `finally` and that is there too — but a restore only narrows the window
in which `data/` is corrupt. Vitest runs the four projects concurrently and
`test/content/schemas.unit.test.ts` reads all five content files at import time, so a
restore-only approach is a race that would surface as an unrelated test failing.

Symlinking `src` was tried first and **broke**: Astro resolves module paths through the symlink's
real path and then cannot match them against its own compile metadata (`No cached compile metadata
found for …/404.astro`). Recorded because the failure looked like a content problem and was not.

---

## 6. Chaining, and the CI answer

```
"gate:sinks":   "node scripts/assert-no-raw-html-sinks.mjs"
"gate:content": "npm run gate:schema && npm run gate:sinks && npm run gate:origin && npm run gate:routes"
"build":        "wrangler types && astro check && astro build && npm run gate:content"
"deploy":       "npm run gate:deps && npm run build && npm test && npm run gate:content && wrangler deploy"
```

`gate:sinks` registers the gate 03-07 deliberately left unregistered. `gate:content` runs
**post-build** because `gate:origin` and `gate:routes` both inspect `dist/` — `gate:origin`'s own
source records this as blind spot 3: *"dist/ IS ONLY AS GOOD AS THE LAST BUILD. Plan 03-08 wires
this gate into the build so the two cannot drift."* `deploy`'s trailing `gate:routes` became the
whole chain for the same reason.

**Does `ci.yml` need a separate step?** Confirmed by reading, not assumed — and the answer is
**yes, one, and not where you would guess.**

- The **Build** step needs nothing: `npm run build` ends in `gate:content`.
- The **Test** step does. `test/setup/preview-server.ts` line 248 runs `astro build` **directly**,
  and its own comment says why: *"Deliberately NOT the package.json build/preview scripts: plan
  02-06 appends a gate to the `build` script in the next wave, and this harness must not depend on
  one."* So `npm test` leaves behind a freshly rebuilt `dist/` that no dist-scoped gate has
  inspected. A new step, `Re-assert the gates against the artefact the test run rebuilt`, closes
  exactly that — in the same position the ship path already used.

`deploy.yml` is untouched. No step publishes anything.

---

## 7. The phase-wide negative-control sweep

Run under **`#!/usr/bin/env bash`**, stated because two harnesses in this project's register
reported the wrong thing purely because of the shell (03-06 assumed bash `${PIPESTATUS[0]}` on a
zsh machine; 03-07 relied on an unquoted `$GATE` word-splitting, which zsh does not do, so the
command ran as one word and exited 127 — read by the harness as a rejection). No subshell
assignment anywhere: every exit code is captured with a plain `$?` in the current shell.

**A control passes only when the gate exits non-zero AND its output names the rule that should have
caught it.** Full transcript in the working notes; the shape of every result:

| Gate | [1] planted defect | [2] nothing to check | [3] clean tree | [4] walk-through |
|---|---|---|---|---|
| `gate:schema` | ✓ exit 1, named **`RIVAL-TYPE`** (rival `interface Photo`) and **`RIVAL-ZOD-OBJECT`** (rival `z.object` over `category, urls`) | ✓ exit 1, `src/schemas: missing` + `src: missing` on an empty root | ✓ exit 0, **17 files scanned**, self-test 4/4 | canaries + anti-canaries run on every invocation |
| `gate:sinks` | ✓ exit 1, named **`dangerouslySetInnerHTML`** in `.tsx` and **`set:html`** in `.astro`, run **independently** | ✓ exit 1, `zero files scanned` | ✓ exit 0, **24 files / 116274 bytes**, self-test 5/5 | ✓ a present-but-empty root argument is **`REFUSED`**, not widened to cwd — 03-07's fix, re-detonated |
| `gate:origin` | ✓ exit 1, named `data/portfolio_images.json:18` and the full legacy URL | ✓ exit 1, `could not list tracked files` | ✓ exit 0, **90 in-scope files, 0 occurrences** | restore verified byte-for-byte after the plant |
| `gate:routes` | ✓ exit 1, named `src/pages/admin/index.astro → /admin` after its `prerender` export was removed (plant confirmed to have landed) | ✓ exit 1, `the build output does not exist` | ✓ exit 0 | — |
| `content-gate` | ✓ 8 planted defects, §3 and §4 | ✓ 4 ways, §4 | ✓ exit 0 with a 39-photograph census | ✓ five-file count asserted and detonated |

**A defect in my own sweep, found and fixed.** Two controls were first written with an **empty grep
needle**, and `grep -qF ''` matches any input — so those two proved only that something exited
non-zero. Both were given real needles, and the harness now **refuses to run a control with an
empty needle at all**. This is class 4 from the brief, committed by the harness written to detect
class 4.

---

## 8. Contradictions with the plan and the context doc

### 8.1 "The four content files" — there are five

Plan `must_haves.truths[4]` and `<verification>`. `03-CONTEXT.md` §2 is right. Corrected, asserted,
and the assertion detonated (§2).

### 8.2 `research/ARCHITECTURE.md` Pattern 2 is false in this repository

Experiment 3. The plan predicted this and told the executor to measure it. It was right to.

### 8.3 The plan's own Task 1 verification #4 cannot fail the way it reads

```bash
grep -q 'validateContentSet' astro.config.mjs src/lib/content.ts src/content.config.ts
```

`grep -q` with multiple files succeeds if **any one** matches. Only `astro.config.mjs` contains the
string, and the check passes. It reads as "all three are wired" and asserts "at least one mentions
it". Not corrected in the plan (it is history), but the real claim is carried by the suite instead.

### 8.4 The plan's Task 2 verification #1 cannot run in this project's shell

```bash
… | tail -60; test ${PIPESTATUS[0]} -eq 0 || …
```

`PIPESTATUS` is bash. This machine's shell is **zsh**, where the array is `$pipestatus` and is
1-indexed, so `${PIPESTATUS[0]}` expands to nothing and `test -eq 0` is a syntax error — neither a
pass nor a fail. Run under `bash -c` for this summary; all three Task 2 verifications green that way.

### 8.5 The plan's Task 2 verification #3 checks for a string the project cannot produce

```js
if(!/from\s+"zod"/.test(s)) …    // double quotes
```

`biome.json` sets `"quoteStyle": "single"` and `npm run check` enforces it, so `from "zod"` can
never appear in a checked file. Same class as the three predicates 03-06 found that could not fire.
The real protection is `test/content/schemas.unit.test.ts`'s single-quote form plus the
`package.json` assertion that no `zod` dependency exists.

### 8.6 The checkpoint's restore instruction is a command this project forbids

`how-to-verify` step 4 says `git checkout data/portfolio_images.json`. Safer: `cp` the file aside
first and copy it back, then confirm with `shasum -a 256`. That is what every plant in this plan
did.

### 8.7 `03-CONTEXT.md` §2's amended `focalPoint` entry is consistent with what shipped

Checked, because the brief flagged it. `PhotoSchema.focalPoint` is `.optional()` with no
`.default()`, `DEFAULT_FOCAL_POINT` is exported for the renderer, and 0 of 39 records carry the
field. Nothing in this plan materialises it: the formatter reads data, and the gate never writes.

---

## 9. Task 3's checkpoint — status and how to settle it in 30 seconds

`auto_advance` and `_auto_chain_active` are both `false`, so the default behaviour would have been to
stop here. The instruction for this run was explicit — *"there is no decision to ask about… run end
to end"* — and this checkpoint is a `human-verify` about **wording**, not a decision or an auth
gate, with the brief asking for the message text in the summary *"so the quality is reviewable
rather than asserted"*. So the plan was run to completion and the verdict is **deferred to review,
not auto-approved on my judgement** — readability is Akhil's call, and §3 exists so it can be made
from this document.

If you would rather produce it yourself, this is verbatim what `npm run build` prints. The report is
the **last thing on screen**, with no stack trace; the 40 lines above it are `wrangler types`, which
prints on every build:

```
12:28:04 [ERROR] [content-gate] An unhandled error occurred while running the "astro:config:done" hook

══════════════════════════════════════════════════════════════════════════════
  BUILD REFUSED — a file in data/ does not match the schema in src/schemas
══════════════════════════════════════════════════════════════════════════════

content set: REFUSED — 1 finding(s)
  ✖ [RI-1] data/portfolio_images.json → architecture-singapore → category: category "archtecture" does not exist in data/site_config.json
      the 7 declared ids are: abstract, architecture, nature, portraits, product, street, wildlife. Comparison is exact — no case transform on either side. ADR-002 §4 removed the screen that used to make this impossible, so this rule is the only thing between a hand-edit and an orphaned photograph.
  checked: 39 photo(s), 7 category record(s), 6 peek id(s), 1 peek position(s), 5 project(s), 8 categoryOrder group(s)
  rules run: RI-1, RI-2, RI-3, RI-4, RI-5, RI-6

  Each finding names the FILE, the RECORD by its own identifier, and the FIELD.
  Fix the data, or change the schema in src/schemas if the rule is wrong —
  there is exactly one definition of each shape and this is what reads it.

  Requirements CONT-01…CONT-04; criterion 2; threats T-03-08-01, T-03-08-02.
```

To reproduce: `cp data/portfolio_images.json /tmp/pi.bak`, change `architecture-singapore`'s
`"category": "architecture"` to `"archtecture"`, `npm run build`, then
`cp /tmp/pi.bak data/portfolio_images.json && shasum -a 256 data/portfolio_images.json`
(expect `e85b2a3c6226df70cdaaf21d1d4c392f4836ebf0e518c45f060325fd652786e2`).

**If the wording is wrong, the fix is `src/lib/content-errors.ts` and nothing else.** The framing is
produced in one function, `describeIssue`, and `src/schemas/content-set.ts` is its only caller.

---

## 10. What this phase's gates cannot see — carried forward for `/gsd:plan-phase 5`

The five the plan named, verbatim in substance, plus four this plan added.

1. **No page renders any of this content.** There is no `/resume`, `/photos` or `/work` until
   Phase 5. Every claim in this phase is about data and about modules; none is about a rendered
   page. `alt` is "the entire non-visual experience of 39 images" and is currently a string in a
   JSON file. **Phase 5 must assert the rendered attribute, the rendered `<strong>`, and the absence
   of `pub-*.r2.dev` in `dist/`.**
2. **Criterion 1 has two consumers in this phase, not three.** The admin's form errors are Phase 7
   and are guarded structurally by `gate:schema` rather than demonstrated. See OD-7.
3. **`scripts/` is outside `gate:schema`'s scan.** A migration script with a private schema would
   pass it. Recorded in the gate's own header.
4. **The sink gate reads text, not syntax.** A dynamically assembled sink is invisible to it.
5. **Under OD-6 = `placeholder`, nothing proves the token resolves.** Phase 5 must fail its build on
   an unresolved `{{ds.componentCount}}`, or this phase will have replaced a wrong number with a
   visible placeholder. The resolver's source is the **catalog** (`OverviewPage.tsx`), per 01-12 —
   not `README.md`, not the directory count.

New, from this plan:

6. **Nothing proves the `content-gate` integration is still in `integrations:`** except the
   build-fails-loudly suite. Deleting it turns 10 of 11 cases red, which is real protection — but it
   is a test, not a structural gate, and a future author who deletes both is not stopped. There is
   no `assert-content-gate-registered.mjs`, deliberately: a gate asserting that a config array
   contains a variable name is a text scan over the one file the whole mechanism lives in.
7. **A red build leaves the previous `dist/` on disk.** When `npm run build` fails at `astro check`
   the earlier artefact is untouched, so `dist/` is *present and stale*. Nothing deploys it —
   `wrangler deploy` runs only after the whole chain passes — but a hand-run `wrangler deploy` after
   a failed build would ship the last good artefact while the author believes the build failed
   closed. Phase 5 should consider having the gate delete `dist/` on refusal, or the deploy script
   assert `dist/` is newer than every file in `data/`.
8. **`src/lib/content.ts` is validated but unexercised.** Its parse does not run today (experiment
   3). The first Phase 5 page that imports it is the first time that code path executes; if the
   formatter has a bug reachable only from `formatSchemaFailure`, this phase would not have found
   it. The build gate exercises `describeIssue`, which is the shared half.
9. **`file()` collection failures are reported in Astro's own words, not the formatter's.**
   `InvalidContentEntryDataError` prints a stack trace and a `:0:0` location. It is legible enough
   (it names the record's id) and it is a *second* line of defence behind a gate that fires first,
   so it was left alone rather than intercepted — but it is the one build failure in this phase whose
   wording this plan does not own.

---

## 11. Verification

| Check | Result |
|---|---|
| `npm run build` (clean tree) | **exit 0**, `dist/` emitted, gate logs a 39-photograph census |
| `npm run check` | **exit 0** — 58 files, biome + prettier |
| `npm run typecheck` | **exit 0** — 0 errors, 0 warnings, 6 pre-existing hints |
| `npm test` | **exit 0** — **484 passed / 484**, 12 files |
| `npm run gate:content` | **exit 0** — 4 gates, 17 / 24 / 90 files scanned |
| `npm run gate:content` after `npm test` (the new CI step) | **exit 0** |
| Five planted defects, one per content file | each **exit 1**, no `dist/`, file + record + field named |
| `git status --porcelain data/` after everything | empty |
| `shasum -a 256 data/*.json` vs pre-execution | **identical** |
| `.github/workflows/deploy.yml` | untouched |

## Self-Check: PASSED

- `src/lib/content-errors.ts` — FOUND
- `src/lib/content.ts` — FOUND
- `src/content.config.ts` — FOUND
- `test/content/build-fails-loudly.node.test.ts` — FOUND
- `658bd92` — FOUND · `bbf8348` — FOUND · `719729d` — FOUND

## Deviations from Plan

**1. [Rule 2 — missing critical functionality] The gate asserts its own file count**
The plan described reading the content files; it did not ask for the five-file assertion. Added
because the plan's own text got the count wrong, which is evidence that the count can drift silently.
Detonated. Commit `658bd92`.

**2. [Rule 2] `src/schemas/content-set.ts` now frames its per-file findings through the formatter**
Not in the plan's file list. Without it there would be two report paths — the formatter for
`src/lib/content.ts` and the old `renderPath` for the gate — and the gate is the one a human reads.
`renderPath` moved to `content-errors.ts` and has one definition. Commit `658bd92`.

**3. [Rule 3] The evidence suite runs in a sandbox rather than mutating `data/`**
The plan specified a byte-copy restore in a `finally`. That is present, but it is not sufficient:
mutating `data/` races the concurrently-scheduled `unit` project, which reads all five files at
import time. Sandbox added; the restore kept. Commit `bbf8348`.

**4. [Rule 2] `deploy`'s trailing `gate:routes` became `gate:content`, and CI gained a post-test step**
The plan said CI "needs no new step if `build` chains it — confirm rather than assume". Confirmed,
and the confirmation found the opposite for the Test step. Commit `719729d`.

**5. Two defects fixed in artefacts this plan wrote, both found by planting**
The record-label precedence in `content-errors.ts` (§3.8) and the empty grep needles in the sweep
harness (§7).
