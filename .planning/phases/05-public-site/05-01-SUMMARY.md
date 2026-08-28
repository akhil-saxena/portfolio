---
phase: 05-public-site
plan: 01
subsystem: design-system-integration
tags: [design-system, npm, registry-safety, gates, pub-14, ds-09, fnd-05]
requires: []
provides:
  - "@akhil-saxena/design-system@2.0.0-beta.1 as a registry dependency"
  - "src/styles/design-system.css — the four stylesheet imports, in one place"
  - "src/lib/ds-component-count.ts — resolveDsCounts / resolveDsTokens"
  - "scripts/assert-ds-import-contract.mjs — [DS-BARREL], [DS-DYNAMIC], [DS-CLASS]"
  - "npm run gate:ds, chained into gate:content"
affects:
  - "every Phase 5 plan that imports a component or a stylesheet"
  - "05-06 (imports src/styles/design-system.css once, from the public layout)"
  - "05-13 (wires @astrojs/sitemap into astro.config.mjs — untouched here)"
  - "05-15 (uses @playwright/test and the chromium browser installed here)"
tech-stack:
  added:
    - "@akhil-saxena/design-system@2.0.0-beta.1 (dependency, `next` dist-tag)"
    - "@astrojs/sitemap@3.7.3 (devDependency)"
    - "@playwright/test@1.62.1 (devDependency) + chromium 151.0.7922.34"
  patterns:
    - "Vite `?raw` to read a package file at build time, because the prerender runs in workerd"
    - "gates enumerate the permitted shape rather than deny-listing the forbidden one"
key-files:
  created:
    - src/lib/ds-component-count.ts
    - src/styles/design-system.css
    - scripts/assert-ds-import-contract.mjs
    - test/public/ds-component-count.unit.test.ts
  modified:
    - package.json
    - package-lock.json
    - test/pipeline/partial-failure.node.test.ts
decisions:
  - "The component count is read through Vite `?raw`, not `node:fs` — the prerender runs in workerd, where there is no filesystem"
  - "The import gate matches specifier position, not every string literal — a gate that fires on correct code gets turned off"
  - "gate:ds is chained into gate:content, so the contract is enforced rather than merely available"
  - "scripts/ stays outside the default scan targets (the gate names the barrel in its own canaries); src, test and astro.config.mjs are all scanned"
metrics:
  duration: "~2h"
  tasks: 3
  commits: 3
  completed: 2026-08-28
---

# Phase 5 Plan 01: Design System Integration Summary

The design system is installed from the registry at `2.0.0-beta.1`, its component count is
resolved at build time from its own README, and the two import rules PUB-14 and DS-09 rest on are
now gates that have been made to fail on purpose.

**Two source premises in the plan and the UI-SPEC did not survive measurement.** The prescribed
mechanism for reading the component count cannot work on this platform at all, and `§4.6c`'s
claim about `Chip` does not reproduce. Both are corrected below.

---

## What was installed, and at what versions

| Package | Spec in `package.json` | Resolved | Map |
|---|---|---|---|
| `@akhil-saxena/design-system` | `^2.0.0-beta.1` | **2.0.0-beta.1** | `dependencies` |
| `@astrojs/sitemap` | `^3.7.3` | **3.7.3** | `devDependencies` |
| `@playwright/test` | `^1.62.1` | **1.62.1** | `devDependencies` |

Plus the browser: `npx playwright install --with-deps chromium` → **Chrome for Testing
151.0.7922.34** (`chromium-1234`). 05-15's six-class audit aborts without it and no other plan
installs it.

Every spec is a registry range. `package-lock.json` resolves all three to
`https://registry.npmjs.org/...`:

```
node_modules/@akhil-saxena/design-system
  version=2.0.0-beta.1
  resolved=https://registry.npmjs.org/@akhil-saxena/design-system/-/design-system-2.0.0-beta.1.tgz
  integrity=sha512-dx7qMabCsvkerulrLNXg6CSuALfLCqd8MrbYad72tmix78D0rD1n41dMQd4/yZtrlM7Ez8+cFdL7B3vWh2a5zg==
  dev=false
```

**`npm run gate:deps` — the ENFORCING form, not `--advisory` — exits 0.** FND-05's CI gate is
satisfied now rather than at cutover. The `STATE.md` pending todo *"Repoint the portfolio at the
registry"* is **closed**: there is no `file:` spec and no tarball, and `05-UI-SPEC.md` §0.1's
`grep -c design-system package.json → 0` no longer holds.

Negative control on that gate, so the exit 0 means something — a fabricated manifest carrying
`"file:./local-packages/ds.tgz"`:

```
  ✖ @akhil-saxena/design-system
      dependencies["@akhil-saxena/design-system"] = "file:./local-packages/ds.tgz"
      the spec begins with "file:", so npm resolves it from the local filesystem …
  1 finding(s). Requirement FND-05; threat T-02-26.        exit 1
```

### On installing from the registry rather than a tarball

`CLAUDE.md`'s packed-tarball rule governs consuming an **unpublished local build**. `2.0.0-beta.1`
is published, `gate:deps` refuses any `file:` spec at ship time, and this plan's `must_haves`
asserts registry resolution. No conflict; the tarball bridge is retired.

---

## Task 1 — package legitimacy. Verified, not waived.

The checkpoint was answered before execution. I ran the checks anyway and looked for anything
that would contradict the answer. **Nothing did.**

### slopcheck, verbatim

`slopcheck 0.6.1`, run from the repository root (a directory *with* a `package.json`), with
`-e npm` — required, because from a directory without one it defaults to PyPI and falsely flags
`react-dom`.

```
$ slopcheck install -e npm @astrojs/sitemap
slopcheck checking 1 package(s) on npm before install...
  Installing: @astrojs/sitemap
  Running: npm install @astrojs/sitemap
  [OK] @astrojs/sitemap (npm)
==================================================
  scanned 1 packages
  1 OK
added 7 packages, and audited 423 packages in 2s
found 0 vulnerabilities                                    exit 0
```

```
$ slopcheck install -e npm @playwright/test
slopcheck checking 1 package(s) on npm before install...
  Installing: @playwright/test
  Running: npm install @playwright/test
  [OK] @playwright/test (npm)
==================================================
  scanned 1 packages
  1 OK
added 3 packages, and audited 426 packages in 2s
found 0 vulnerabilities                                    exit 0
```

No `[SLOP]` verdict on either.

### Registry provenance, queried rather than browsed

I could not open the npm web pages, so I read the same fields off the registry API, which is the
source those pages render:

| | `@astrojs/sitemap` | `@playwright/test` |
|---|---|---|
| repository | `github.com/withastro/astro` | `github.com/microsoft/playwright` |
| maintainers | `fredkschott`, `matthewp` — Astro's co-founder and core maintainer | `pavelfeldman`, `yurys`, `dgozman-ms@microsoft.com`, `playwright-npm-bot@microsoft.com` |
| created | 2022-03-18 | 2020-09-24 |
| last modified | 2026-05-26 | 2026-08-28 |
| versions | 83 | 3,338 |
| license | MIT | Apache-2.0 |

Both are first-party to the org that owns the framework/tool, with multi-year multi-version
histories. Neither is a single-version drive-by. **`@astrojs/sitemap` is Astro's own integration
and the same org as the `astro` already in `dependencies`; `@playwright/test` is Microsoft's, on
Microsoft-domain maintainer accounts.** The brief's calls hold.

### `@akhil-saxena/design-system` — the first-party row, re-derived end to end

`§14` says this row needs no verdict. I verified the evidence anyway, because the brief said to
stop if anything contradicted it.

```
dist-tags:  latest = 1.11.4      next = 2.0.0-beta.1
```
`latest` is untouched, so Cairn's `^1.9.0` is unaffected. The SLSA provenance attestation decodes
to:

```
predicateType : https://slsa.dev/provenance/v1
buildType     : slsa-framework.github.io/github-actions-buildtypes/workflow/v1
workflow      : { repository: https://github.com/akhil-saxena/design-system,
                  ref: refs/tags/v2.0.0-beta.1,
                  path: .github/workflows/publish.yaml }
builder.id    : https://github.com/actions/runner/github-hosted
invocationId  : .../actions/runs/32881101399/attempts/1
```

GitHub-hosted runner, tag-triggered, no local publish path — exactly as recorded. And the digest
chain closes completely. I downloaded the registry tarball and hashed it:

```
bytes               715,966
sha512 (hex)        771eea31a6c2b2f91eaee96b2cd5e0e824ae00b7cb0aa77c32b6d869def6b668b1efc0f4ac3d67e3574c41de3fc99b6b94cec4cfcf9c15d2fb077bd68766b9ce
attested subject    771eea31…66b9ce          ← IDENTICAL
sha1                8ef366462bb4b0d17e4b0765186568cc44272c14
registry dist.shasum 8ef36646…2c14           ← IDENTICAL
sha512 (base64)     sha512-dx7qMabCsvkerulrLNXg6CSuALfLCqd8MrbYad72tmix78D0rD1n41dMQd4/yZtrlM7Ez8+cFdL7B3vWh2a5zg==
package-lock integrity  sha512-dx7qMab…a5zg==  ← IDENTICAL
```

`npm audit signatures`: **492 packages have verified registry signatures, 202 have verified
attestations.**

**Nothing contradicted the brief. No unexpected maintainer, no missing provenance, no shasum
mismatch. Proceeded.**

---

## 🔴 The prerender runs in workerd, not Node — and it silently breaks the prescribed mechanism

This is the most important thing in this plan, and it would have shipped broken.

`05-UI-SPEC.md` §6.7 and this plan's Task 2 both prescribe:

```ts
readFileSync(require.resolve('@akhil-saxena/design-system/package.json')
               .replace(/package\.json$/, 'README.md'), 'utf8')
```

**It cannot work here, for two independent reasons.**

### 1. `./package.json` is not in the package's exports map

```
$ require.resolve('@akhil-saxena/design-system/package.json')
FAIL  ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined by "exports"
$ require.resolve('@akhil-saxena/design-system')
FAIL  ERR_PACKAGE_PATH_NOT_EXPORTED: No "exports" main defined
$ require.resolve('@akhil-saxena/design-system/README.md')
FAIL  ERR_PACKAGE_PATH_NOT_EXPORTED
```

The map is closed. Every JS subpath declares only `types` + `import` conditions and never
`require`, which is why even the barrel is unresolvable from CJS. Only the three condition-free
stylesheet subpaths resolve. Vite refuses the bare README specifier too — a
`@akhil-saxena/design-system/README.md?raw` import fails the build in `rolldown:vite-resolve`.

### 2. The prerender executes inside workerd

I built a throwaway probe page (`src/pages/ds-probe.astro`, created, measured, then deleted) that
reported its own environment. Prerendered output:

```
import.meta.url                    = undefined
typeof process                     = object
process.cwd()                      = /bundle
navigator.userAgent                = Cloudflare-Workers
fs.existsSync(<repo>/package.json) = false
readme via cwd                     = ENOENT '/bundle/node_modules/@akhil-saxena/design-system/README.md'
createRequire(...).resolve         = not a function
```

There is **no `node_modules`, no real filesystem and no usable module resolver** at the moment a
page renders. My first implementation used `createRequire(import.meta.url)`; it passed all 13 unit
tests, then died in the build with

```
TypeError: The argument 'path' must be a file URL object, a file URL string, or an absolute
path string.. Received 'undefined'
    at resolveDsPackageRoot (dist/server/.prerender/chunks/ds-probe_RKJnLCxu.mjs:128:18)
```

**A `node:fs` implementation passes the vitest suite green and detonates on the first real page.**
Vitest runs in Node; the pages do not. The plan's `<verify>` block runs only vitest, so the plan as
written would have declared this task done with a module that cannot render.

### The mechanism that works

`?raw`. Vite inlines the file's **contents** into the bundle at build time, in Node, where the
filesystem exists; the regex then runs inside workerd against a string constant. The module now
imports nothing from `node:` at all, which also makes it safe from any route.

The specifier is relative (`../../node_modules/@akhil-saxena/design-system/README.md?raw`) because
the exports map blocks the bare form. That hardcodes a flat `node_modules` layout — an accepted and
**loud** limitation: under a hoisted or pnpm layout the path does not exist and the build fails at
resolve time. It cannot silently resolve to the wrong file or a stale copy, and Vite re-reads on
every build.

Proven end to end, in the real build, prerendered inside workerd:

```html
<pre data-c="81" data-k="10">81-component React library, 10 categories.
refusal: ds-component-count: 1 unresolved token(s) survived resolveDsTokens: {{metric.value}}</pre>
```

Both the substitution and the `{{…}}` refusal fire in the deployed runtime, not just in a test.

### The 83 / 81 reconciliation

```
dist/components/*.js                                    83
README.md literal  "**81 components across 10 categories.**"   (exactly 1 occurrence)
83 − Field.js − IconButton.js                           81      ← reconciles exactly
```

`resolveDsCounts()` returns `{ componentCount: 81, categoryCount: 10 }`. The unit test derives
**both sides** — it counts the directory, finds the two exclusions by looking for them, and
re-extracts the README figures with its own separately-written regex. It never literals 81 or 10,
per the rule 04-09 broke. A future 82nd component is a correct event and must not turn this red.

---

## The import contract — four-step proof per rule

Shell for every control below: **`bash` 5.3.9(1)-release** (`/opt/homebrew/bin/bash`). The
interactive shell here is zsh and Actions runs bash, so every control was run under bash. No
`${PIPESTATUS[0]}`, no `( cmd && R=0 || R=1 )` — the form used throughout is
`if node …; then R=0; else R=$?; fi`.

`node scripts/assert-ds-import-contract.mjs`, three rules, **18 canaries checked on every
invocation** before it scans anything.

| # | Control | Exit | Verdict |
|---|---|---:|---|
| 1 | **PLANTED DEFECT** — `import { Chip } from '@akhil-saxena/design-system';` | **1** | OK |
| 2 | **PLANTED DEFECT** — `<Card class="wk-card">` beside a `components/Card` import | **1** | OK |
| 3a | **NOTHING TO CHECK** — empty directory as scan root | **1** | OK |
| 3b | **NOTHING TO CHECK** — missing directory | **1** | OK |
| 3c | **NOTHING TO CHECK** — empty-string argument | **1** | OK |
| 4 | **CORRECT CODE** — the real default targets | **0** | OK |

Control 1 output:
```
  x …/c1/bad.ts:1: [DS-BARREL] "@akhil-saxena/design-system"  —  import { Chip } from '@akhil-saxena/design-system';
      this is THE BARREL: 101 files, 416,590 B, carrying tiptap x6 and dnd-kit x3 into a
      route budgeted for zero framework JavaScript. Import from components/<Name> instead.
  1 finding(s). Requirements PUB-14, DS-09; threat T-05-01-03.
```
Control 2 output:
```
  x …/c2/Work.astro:4: [DS-CLASS] <Card class=...>  —  <Card class="wk-card">Cairn</Card>
      `class` is not `className`. <Card class="x"> renders the design system's own atom class
      and drops yours, with no error and a plausible-looking page.
```
Control 3a output — note it is a **refusal**, not a pass:
```
  x …/c3empty: zero files scanned
      no file matched .astro .ts .tsx .mts .cts .js .jsx .mjs .cjs .css. This run checked
      nothing and cannot pass.
```
Control 4 output:
```
assert-ds-import-contract: PASS
  scan targets: src, test, astro.config.mjs (default)
  scanned 62 files (784895 bytes)
  self-test: 3/3 rules flagged their canary and ignored their anti-canary; 18 canaries checked
  rules: DS-BARREL, DS-DYNAMIC, DS-CLASS
```

*(3c and 4 both display an empty `ARGS:` line in the raw log — one passes `""`, the other passes
nothing. The behaviours differ correctly and that is the point of running both.)*

### The walk-through — 22 attempts, all caught

| Attempt | Caught by |
|---|---|
| double-quoted barrel | `[DS-BARREL]` |
| side-effect `import '…'` | `[DS-BARREL]` |
| dynamic `await import('…')` | `[DS-BARREL]` |
| backtick literal specifier | `[DS-BARREL]` |
| **template-assembled** ``await import(`${B}`)`` | `[DS-DYNAMIC]` |
| **variable-assembled** `await import(B)` | `[DS-DYNAMIC]` |
| concatenated at call site `import(B + '/hooks')` | `[DS-DYNAMIC]` |
| `export { Chip } from` the barrel | `[DS-BARREL]` |
| `require(barrel)` | `[DS-BARREL]` |
| the `/hooks` barrel | `[DS-BARREL]` |
| deep `node_modules/…/dist/index.js` | `[DS-BARREL]` |
| deep `node_modules/…/dist/chunk-JVIQWPC7.js` | `[DS-BARREL]` |
| multi-line import clause | `[DS-BARREL]` |
| invented subpath `/internal/secret` | `[DS-BARREL]` |
| **commented-out** barrel import | `[DS-BARREL]` |
| CSS `@import "barrel"` | `[DS-BARREL]` |
| CSS `@import url("barrel")` | `[DS-BARREL]` |
| `class` on an **aliased** component (`Card as Panel`) | `[DS-CLASS]` |
| `class:list={[…]}` directive | `[DS-CLASS]` |
| `class` on a later line of a multi-line tag | `[DS-CLASS]` |
| `class` on a self-closing tag | `[DS-CLASS]` |
| `class` on a **default-imported** component | `[DS-CLASS]` |

And six correct-code cases that **must** pass, and do: subpath import, `icons`, the `.css`
subpaths, `className` on a component, `class` on a plain `<div>`, and `class` on an app component
that happens to share the name `Card`.

**The self-test earned its keep during this plan.** `[DS-DYNAMIC]`'s first revision excluded every
backtick-quoted argument, so ``await import(`${B}`)`` walked straight through. Its own canary
caught it before the gate ever ran against real code:

```
assert-ds-import-contract: SELF-TEST FAILED — the gate cannot be trusted.
  x DS-DYNAMIC: did NOT flag its "template specifier" canary — that walk-through is open.
```

That is the fourth defect-in-my-own-repair this phase has now produced. It was found by a canary,
not by reading.

### Why it enumerates the permitted shape

```
^@akhil-saxena/design-system/(icons|components/[A-Za-z][A-Za-z0-9]*|[a-z0-9./-]+\.css|css/[a-z0-9-]+)$
```

Anything else under the package name fails, **including subpaths that do not exist yet**. `/hooks`
is deliberately excluded — it is a barrel of its own. The standing lesson is that a deny-list
enumerates what its author thought of; the git-argv deny-list in this project was defeated three
ways with the guard silent. An allow-list's failure mode on an imagination gap is a false alarm,
which is loud and fixable, rather than a miss.

The measurement that makes it worth having, `05-UI-SPEC.md` §1.1:

```
components/Lightbox →   9 files /  15,351 B   no tiptap, no dnd-kit
the barrel  "."     → 101 files / 416,590 B   WITH them
```

---

## The two scanning residuals — decided deliberately

The plan-checker named two. Here is what I chose and why.

### Residual 1 — scan root. **CLOSED for `astro.config.mjs` and `test/`; OPEN for `scripts/`.**

The plan specified a root defaulting to `src`. I widened the default to
**`src`, `test`, `astro.config.mjs`**, because a barrel import from `astro.config.mjs` reaches the
build graph and that is precisely the named escape. 05-13 wires `@astrojs/sitemap` into that file,
so it will be edited by a later plan in this phase.

**`scripts/` remains outside the default targets, and this is a deliberate trade.** The gate names
the barrel specifier in its own canaries and prose, so scanning `scripts/` makes it flag itself —
the same reason `assert-no-raw-html-sinks.mjs` does not scan `scripts/`. Measured both halves:

```
planted barrel import inside a scripts-like dir, default run   → not seen
same file passed as an explicit target                          → exit 1 CAUGHT
```

So the capability exists; only the default coverage stops short. If a script ever imports the
design system, add it as an explicit target. Recorded here rather than hidden.

### Residual 2 — dynamic `import()`. **CLOSED, beyond what the plan asked.**

The plan listed it only as a walk-through item. I made it a rule. `[DS-DYNAMIC]` fires when a file
contains a **non-literal** import/require specifier **and** names the package inside a string —
the pairing that constitutes the evasion. Either half alone is legitimate and does not fire, which
is what keeps it quiet. All three assemble-then-import forms are caught (table above).

### Residual 3 — a specifier split across literals. **OPEN. Measured, not claimed closed.**

```
R1a: const B = "@akhil-saxena/design-" + "system"; await import(B);   → exit 0  GOT THROUGH
R1b: const B = ["@akhil-saxena","design-system"].join("/"); import(B) → exit 0  GOT THROUGH
R1c: same as R1a, with the package named in an unquoted comment       → exit 0  GOT THROUGH
```

No single literal carries the package name, so nothing textual can see it. This is the same class
as `assert-no-raw-html-sinks.mjs`'s blind spot 1 (`el["inner" + "HTML"]`) and closing it needs an
AST pass. R1c is the sharper measurement: `[DS-DYNAMIC]`'s trigger requires the package name inside
a **quoted string**, so naming it in a bare comment does not arm the rule. Recorded in the gate's
own header as R1, following 04-02, which measured three holes in the alt refusal rather than
asserting there were none.

### Residual 4 — the gate says nothing about built output

A dependency of a *permitted* subpath could pull the forbidden families in without any source file
naming the barrel. That is a different claim needing a different gate; **05-14** checks the emitted
chunks. Recorded as R3 in the header.

---

## Corrections to the plan and the UI-SPEC

1. **§4.6c does not reproduce.** The UI-SPEC states `Chip` **clobbers** `className` and calls the
   asymmetry "unchanged in `2.0.0-beta.1`". Measured against the installed
   `dist/chunk-JVIQWPC7.js`:

   ```js
   var Chip = forwardRef(function Chip2({ tone = "default", onRemove, icon, children,
                                          className, style, ...rest }, ref) {
     return jsxs("span", { ref, className: `ds-atom-chip${className ? ` ${className}` : ""}`, …
   ```

   **`Chip` CONCATENATES**, identically to `Card`, `Link`, `Badge` and `FilterNav` (all four
   re-measured, all four concatenate). `className` is destructured **out** of props before
   `...rest`, so `...rest` cannot clobber it regardless of spread order. The plan's `<interfaces>`
   block is right and §4.6c's `CARRIED` claim is stale. **"Do not pass `className` to `Chip`" is
   now a stale precaution, not a live rule** — but wrapping remains harmless if a plan already
   assumes it.

2. **Font stylesheets are at `dist/fonts/`, not `dist/client/fonts/`.** The plan's `<interfaces>`
   block gives the latter. Contents are as stated (`default.css`, `monochrome.css`); only the path
   prefix is wrong. `src/styles/design-system.css` imports through the `./fonts/*.css` export, so
   nothing depends on the literal path.

3. **`@astrojs/sitemap` declares no `peerDependencies` at all.** So it carries no Astro-version
   constraint and cannot tell us whether it supports `astro@^7.2.2`. There is no peer conflict, but
   there is also no positive signal. **05-13 must verify the integration actually works against
   Astro 7 rather than inferring it from a clean install.**

4. **Two documentation slips inside plan 05-01 itself**, noted rather than acted on, as instructed:
   the action text says **05-12** owns `astro.config.mjs` (it is **05-13**), and the threat register
   says **05-13** re-checks built chunks (it is **05-14**).

5. **The UI-SPEC's photo count is stale.** Derived, not literalled:
   `data/portfolio_images.json` holds **40** records. The UI-SPEC quotes 39 in several places.
   Nothing in this plan depends on it; flagged for the gallery plans.

6. **A family-name sweep over `primitives.css` must be case-insensitive *and* JS-only.** Measured:

   ```
   primitives.css   ProseMirror 71   tiptap 0 (case-sensitive) / 3 (case-insensitive)   lowlight 1   dnd-kit 0
   ```

   So the standing warning is sharper than recorded: a *case-sensitive* `tiptap` grep on the CSS
   returns 0 and looks clean, while a case-insensitive one returns 3 and fires on every correct
   build. 05-14's sweep must scan `*.js` only.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The prescribed count-resolution mechanism cannot work on this platform**
- **Found during:** Task 2, by building a probe page rather than trusting the unit suite
- **Issue:** `require.resolve('<pkg>/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, and
  the prerender runs in workerd where there is no filesystem and `import.meta.url` is `undefined`.
  The `node:fs` implementation passed 13/13 unit tests and failed the build.
- **Fix:** read the README through Vite `?raw`, which inlines it at build time in Node. The module
  now imports nothing from `node:`.
- **Files:** `src/lib/ds-component-count.ts`, `test/public/ds-component-count.unit.test.ts`
- **Commit:** `e778eca`

**2. [Rule 1 — Bug] `[DS-DYNAMIC]` could not see a template-literal specifier**
- **Found during:** Task 3, by the gate's own self-test against its own canary
- **Issue:** the first revision excluded every backtick-quoted argument, so ``import(`${B}`)`` passed.
- **Fix:** classify the argument — a backtick string is static only when it contains no `${`.
- **Files:** `scripts/assert-ds-import-contract.mjs`
- **Commit:** `79f6bc4`

**3. [Rule 1 — Bug] Adding `src/styles/` broke all ten pipeline-fixture cases**
- **Found during:** Task 3, full-suite run
- **Issue:** `overlayWorkingTree` copies paths from `git status --porcelain`, which reports a
  **wholly-untracked directory** as a single entry ending in `/` (`?? src/styles/`) rather than one
  entry per file. `copyFileSync` on a directory throws `ENOENT`. 10 failed / 1013 passed.
- **Why in scope:** directly caused by this plan's own new directory, **and** every remaining Phase
  5 plan creates folders under `src/` — this would have detonated wave 2 for all of them.
- **Fix:** recurse into a directory entry, preserving the fixture's refuse-rather-than-skip rule
  (an empty walk throws).
- **Files:** `test/pipeline/partial-failure.node.test.ts`
- **Commit:** `79f6bc4`

**4. [Rule 2 — Missing critical functionality] The gate was not wired to anything**
- **Issue:** the plan creates `assert-ds-import-contract.mjs` but never runs it. A gate that runs
  nowhere is not a control — the exact failure class this repository has paid for nineteen times.
- **Fix:** added `gate:ds` and chained it into `gate:content`, which `npm run build` already runs.
- **Files:** `package.json`
- **Commit:** `79f6bc4`

**5. [Housekeeping] slopcheck installs into `dependencies`**
- `slopcheck install` shells out to `npm install <pkg>`, so both third-party packages landed in
  `dependencies`. Uninstalled and reinstalled with `-D`. Both are `dev=true` in the lockfile.

### Deliberate non-actions

- **`astro.config.mjs` untouched** — `@astrojs/sitemap` is installed but not wired. 05-13 owns it.
- **`src/pages/**` untouched** — the probe page was created, measured and deleted within the task.
- **`.github/**` untouched.**
- **`STATE.md` / `ROADMAP.md` not updated** — reconciled centrally, per instruction.

---

## Verification

| Check | Result |
|---|---|
| `npm run build` (now includes `gate:ds`) | **exit 0** |
| `npx vitest run` | **1023 passed / 1023, 28 files** (was 1007/27; +16 new) |
| `npm run check` (biome + prettier) | **exit 0** |
| `npm run gate:deps` — enforcing form | **exit 0** |
| `node scripts/assert-ds-import-contract.mjs` | **exit 0**, 62 files, 18 canaries |
| `git diff 87e3384 -- astro.config.mjs` | unchanged |
| `git diff 87e3384 -- .github` | unchanged |
| `src/pages/**` tracked + untracked | unchanged |
| `test -e src/pages/ds-probe.astro` | **absent** |

**On the probe-absence assertion.** The coordinator flagged that a check for a file the action
never creates is a gate that always passes. It is meaningful here: the probe **was** created, it
**did** get built and prerendered, its output is quoted above, and it was then removed. The
assertion is over a file that genuinely existed within this plan.

**Build output is `dist/client/`, not `dist/`** — confirmed by `gate:routes`, which resolves the
Static Assets root from `dist/server/wrangler.json` (`assets.directory = "../client"`). The probe
HTML was read from `dist/client/ds-probe/index.html`.

---

## Known Stubs

None. Nothing in this plan renders to a public route; `src/styles/design-system.css` and
`src/lib/ds-component-count.ts` are both imported by exactly zero routes by design, and 05-06 wires
the first.

## Threat Flags

None. No network endpoint, auth path or schema change. `T-05-01-02` (reading `node_modules`) is
narrower than assessed: the module no longer reads the filesystem at all.

---

## For the plans that depend on this one

- Import components **only** as `@akhil-saxena/design-system/components/<Name>`. `gate:ds` runs in
  `npm run build`.
- Use **`className`**, never `class`, on a design-system component in `.astro`. `class:list` is
  banned on them too, for the same reason.
- Import **`src/styles/design-system.css`** once, from the public layout (05-06). Do not import the
  four sheets individually.
- **`resolveDsTokens()` throws on any surviving `{{…}}` token, including `{{metric.value}}`.** It is
  the **last** pass over a string, not the first. Resolve metric tokens before calling it, or extend
  `DS_TOKENS`.
- **Anything reading from disk at render time will fail.** The prerender is workerd. Read at build
  time through `?raw`, or through a Vite plugin.
- **Fonts are unverified.** `fonts/monochrome.css` uses bare `@import "@fontsource-variable/…"`
  specifiers and whether Vite resolves them from a transitive dependency's stylesheet is still
  **UNVERIFIED**. Assert in a browser that exactly three families download (Playfair Display, DM
  Sans, IBM Plex Mono) and that Inter, Archivo, JetBrains Mono and Newsreader do not. A silent
  failure renders Playfair as Georgia and looks almost right.

---

## Self-Check: PASSED

All five claimed files exist on disk; all three claimed commits (`e778eca`, `79f6bc4`, `694b7be`)
exist in `git log`; the working tree is clean; no AI attribution appears in any commit message,
author or committer field.
