# Phase 2 — Package Legitimacy Audit

Audited 2026-08-18, before `package.json` exists at the repo root. Every plan in Phase 2 that
installs a dependency (only **02-03**) cites this file and may install nothing outside the
approved set below.

Phase 0's installs were confined to the gitignored `.playground/`. This is the first phase that
installs into the **tracked** repo root, and the first time these packages enter the supply chain
of the deployed Worker and of CI (which holds a Cloudflare API token). That is why the gate runs
before the manifest exists, not after.

---

## Package Legitimacy Audit

Run with `slopcheck` 0.6.1 (at `/opt/homebrew/bin/slopcheck`), plus an independent `npm view`
cross-check of every field in the table.

**Method note — `-e npm` is mandatory, carried forward from the Phase 0 audit.** `slopcheck
install <pkgs>` auto-detects the ecosystem from project files. Run from a directory with no
`package.json` it defaults to **PyPI**, and Phase 0 measured that failure directly: 6 of 8
packages came back `[SLOP]`, including `react-dom`. The repo root has no `package.json` yet, so
this audit ran in exactly that failure condition and **`-e npm` was passed on the invocation**.
Cross-ecosystem confusion is a documented ~9% hallucination vector and it cuts both ways — it
manufactures false positives as readily as it misses real slop.

**Method note — the check ran without installing.** `slopcheck install` is check-then-install: it
prints verdicts and then shells out to `npm install <clean packages>` in the working directory.
Run literally at the repo root that would have created `package.json`, `package-lock.json` and
`node_modules/` — the exact outcome this gate exists to prevent, and a violation of this plan's
own success criterion. The check was therefore run from a scratch directory outside the repo with
a no-op `npm` shim first on `PATH`, so all registry checks executed for real while the install
passthrough was recorded and discarded. Recorded passthrough:

```
[shim] SUPPRESSED install passthrough: npm install jose @types/react @astrojs/check
  @astrojs/react @astrojs/cloudflare astro react react-dom @types/react-dom @biomejs/biome
  prettier typescript prettier-plugin-astro wrangler @cloudflare/vitest-pool-workers
```

(The shim deliberately prints `SUPPRESSED` rather than the all-caps blocked-disposition keyword.
This plan's verify greps for that keyword as the marker of a `[SLOP]` row, so **any** occurrence
of it anywhere in this file — even inside a method note or a prose explanation — satisfies the
grep and silently defeats the guard. The keyword therefore appears nowhere in this document, which
is correct: no package returned that verdict. Caught by a negative control during execution; see
§Verification of this file's own guards.)

Exact check invocation (from the scratch directory, with the shim on `PATH`):

```bash
slopcheck install -e npm astro @astrojs/cloudflare @astrojs/react react react-dom jose \
  wrangler typescript @astrojs/check @types/react @types/react-dom @biomejs/biome \
  prettier prettier-plugin-astro vitest @cloudflare/vitest-pool-workers
```

Result: **15 OK, 1 SUS, 0 SLOP** over 16 packages.

Per-package fields (`version`, `repository.url`, `time.created`, `scripts`, `maintainers`) came
from `npm view`; weekly download counts came from
`https://api.npmjs.org/downloads/point/last-week/<pkg>` for the window
**2026-08-09 → 2026-08-15**.

| Package | Kind | Pinned version | Registry | First published | Weekly downloads | Source repo | Declares postinstall | slopcheck verdict | Disposition |
|---------|------|----------------|----------|-----------------|-----------------:|-------------|----------------------|-------------------|-------------|
| `astro` | runtime | `^7.2.2` → 7.2.2 | npm | 2021-03-13 | 3.94M/wk | github.com/withastro/astro | No | [OK] | Approved (inherited from Phase 0 audit) |
| `@astrojs/cloudflare` | runtime | `^14.2.1` → 14.2.1 | npm | 2022-06-16 | 513K/wk | github.com/withastro/astro | No | [OK] | Approved (inherited from Phase 0 audit) |
| `@astrojs/react` | runtime | `^6.0.2` → 6.0.2 | npm | 2022-03-18 | 1.30M/wk | github.com/withastro/astro | No | [OK] | Approved (inherited from Phase 0 audit) |
| `react` | runtime | `^19.2.8` → 19.2.8 | npm | 2011-10-26 | 115.6M/wk | github.com/react/react | No | [OK] | Approved (inherited from Phase 0 audit) |
| `react-dom` | runtime | `^19.2.8` → 19.2.8 | npm | 2014-05-06 | 135.8M/wk | github.com/react/react | No | [OK] | Approved (inherited from Phase 0 audit) |
| `jose` | runtime | `^6.2.9` → 6.2.9 | npm | 2014-02-27 | 80.1M/wk | github.com/panva/jose | No | [OK] | Approved |
| `wrangler` | dev | `^4.123.0` → 4.123.0 | npm | 2012-06-19 | 16.5M/wk | github.com/cloudflare/workers-sdk | No | [OK] | Approved |
| `typescript` | dev | `~6.0.2` → 6.0.3 | npm | 2012-10-01 | 180.4M/wk | github.com/microsoft/TypeScript | No | [OK] | Approved |
| `@astrojs/check` | dev | `^0.9.10` → 0.9.10 | npm | 2023-07-31 | 2.12M/wk | github.com/withastro/astro | No | [OK] | Approved |
| `@types/react` | dev | `^19` → 19.2.18 | npm | 2016-05-17 | 132.2M/wk | github.com/DefinitelyTyped/DefinitelyTyped | No | [OK] | Approved |
| `@types/react-dom` | dev | `^19` → 19.2.4 | npm | 2016-05-17 | 88.1M/wk | github.com/DefinitelyTyped/DefinitelyTyped | No | [OK] | Approved |
| `@biomejs/biome` | dev | `^2.5.9` → 2.5.9 | npm | 2023-08-17 | 8.93M/wk | github.com/biomejs/biome | No | [OK] | Approved |
| `prettier` | dev | `^3.9.6` → 3.9.6 | npm | 2017-01-10 | 111.1M/wk | github.com/prettier/prettier | No | [OK] | Approved |
| `prettier-plugin-astro` | dev | `^0.14.1` → 0.14.1 | npm | 2021-09-22 | 715K/wk | github.com/withastro/prettier-plugin-astro | No | [OK] | Approved |
| `vitest` | dev | `^4.1.10` → 4.1.10 | npm | 2021-12-03 | 77.6M/wk | github.com/vitest-dev/vitest | No | [SUS] | Needs human verification |
| `@cloudflare/vitest-pool-workers` | dev | `^0.21.3` → 0.21.3 | npm | 2024-03-14 | 2.09M/wk | github.com/cloudflare/workers-sdk | No | [OK] | Approved |

Every pin above was confirmed to resolve with `npm view '<pkg>@<range>' version`. All 16 resolve.

---

## Findings the reviewer needs

### 1. `vitest` is the only non-`[OK]` verdict, and it reads as a false positive

slopcheck's reason: *"Suspiciously close to 'vite'. Could be a typosquat. Did you mean: vite"* —
an edit-distance heuristic firing on the one-character difference between `vitest` and `vite`. The
supporting evidence points the other way on every axis:

- 77.6M downloads/week, first published 2021-12-03 (4.7 years of history).
- Repository `github.com/vitest-dev/vitest`.
- Maintainers include `yyx990803` (Evan You, creator of Vite/Vue), `antfu`, `ariperkkio`,
  `hiogawa` — the Vite core team.
- `@cloudflare/vitest-pool-workers@0.21.3` peers `vitest ^4.1.0`, so this is the package
  Cloudflare's own Workers test pool requires.

It is recorded as `Needs human verification` rather than `Approved` because the automated check did
not clear it, and the gate's rule is that anything slopcheck could not clear gets confirmed by a
human against the live registry page — not talked out of by the executor.

### 2. The TypeScript pin must stay inside 6.x — verified, not assumed

`npm view @astrojs/check peerDependencies --json` returns:

```json
{ "typescript": "^5.0.0 || ^6.0.0" }
```

The range has **not** widened to include 7. Meanwhile `typescript` `latest` is **7.0.2**, so
installing `typescript@latest` would be an immediate peer break against `@astrojs/check@0.9.10`.
The pin is therefore `~6.0.2`, which resolves to **6.0.3**, the current 6-line release. This is the
one row where the pinned version is deliberately *not* `latest`.

### 3. No direct dependency declares an install script — but two transitive ones do

All 16 packages were checked with `npm view <pkg> scripts --json`. **None** declares `postinstall`,
`preinstall` or `install`. Notably `@biomejs/biome@2.5.9` has no scripts at all — it ships its
platform binaries as `optionalDependencies` rather than downloading them in a `postinstall`.

That is not the whole story, and the reviewer should see the rest of it. Two well-known
**transitive** dependencies of this set do declare install scripts:

| Transitive package | Script | Arrives via |
|--------------------|--------|-------------|
| `esbuild` | `postinstall: node install.js` | `astro` → `vite`, and `wrangler` |
| `workerd` | `postinstall: node install.js` | `wrangler` → `miniflare`, and `@cloudflare/vitest-pool-workers` |

Both are expected for this stack (`workerd` *is* the Cloudflare runtime; `esbuild` is Vite's
bundler), and both are first-party packages of their respective vendors. They are surfaced here
because `npm install` **will** execute them on the developer's machine and in CI, and the
`Declares postinstall: No` column would otherwise read as "nothing runs code at install time",
which is not true.

### 4. Two package names are older than their current owners

`wrangler` first published **2012-06-19** and `jose` first published **2014-02-27** — both predate
Cloudflare Workers (2017) and panva's JOSE library respectively. These are name transfers, and the
current maintainers are the expected ones (`wrangler-publisher <workers-devprod@cloudflare.com>`;
`panva`). Flagged so the "first published" column is not read as unbroken provenance under the
present owner.

### 5. `prettier-plugin-astro` is first-party, not community

The plan anticipated a community plugin author. The registry says otherwise: repository
`github.com/withastro/prettier-plugin-astro`, maintainer `fredkschott` (Astro co-founder).
Stronger provenance than assumed — recorded as a correction, not a concern.

### 6. Two pins moved since `.planning/research/STACK.md` was written

| Package | STACK.md | Registry now | Action |
|---------|----------|--------------|--------|
| `@biomejs/biome` | `^2.5.8` | 2.5.9 | Pin bumped to `^2.5.9` |
| `typescript` | `~6.0.2` | `latest` is 7.0.2 | Pin held at `~6.0.2` (→ 6.0.3) — see finding 2 |

Also carried forward from STACK.md: Biome states TypeScript **5.9** as its supported ceiling while
this project is on 6.0.3. Low practical risk (this codebase uses no exotic syntax) and `astro
check` / `tsc` is the real type gate — but it is a known, accepted mismatch rather than an
oversight.

---

## Reductions against STACK.md's install list

`.planning/research/STACK.md` §Installation lists more packages than this audit covers. The shorter
list is deliberate — each omission is deferred to the phase whose code actually consumes it, and
none is dropped. A later reader should not read this as an omission:

| Deferred package(s) | Deferred to | Why not Phase 2 |
|---------------------|-------------|-----------------|
| `@akhil-saxena/design-system` | Phase 5 | `CLAUDE.md` states Phase 2 consumes no design system at all. Also gated on the Phase 1 charcoal-theme publish. |
| `ultrahtml` | Phases 3–5 | HTML sanitization is needed when résumé/bullet HTML is rendered, which is not Phase 2. |
| `sharp`, `exifr`, `@aws-sdk/client-s3` | Phases 3–5 | GitHub Actions photo pipeline only. Never bundled into the Worker; `sharp` cannot run in `workerd` at all. |
| `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test` | Phases 3–5 | Component and E2E testing arrives with the components and pages. Phase 2's tests are Workers-pool tests via `@cloudflare/vitest-pool-workers`. |
| `@vitest/coverage-v8` | Not in Phase 2's approved set | Present in STACK.md's dev list but **not** installed by 02-03, and 02-05 (which adds the `test` scripts) does not install it either. If coverage reporting is later wanted it must come back through this gate rather than being added inline. |

Two packages are on a permanent do-not-install list rather than deferred:

- `@cloudflare/workers-types` — superseded by `wrangler types`, and a hand-added copy can conflict
  with the generated declarations.
- `zod` as a separate install — `astro` bundles `zod ^4.3.6`; a second copy causes type-identity
  mismatches with `defineCollection`. Use `astro/zod`.

---

## Verification of this file's own guards

The plan's automated verify for this file was run, and then run again against deliberately
mutated copies (in a scratch directory, never the repo) to confirm each assertion can actually
fail rather than passing vacuously:

| Mutation | Expected | Result |
|----------|----------|--------|
| none (unmutated) | pass | pass |
| `## Package Legitimacy Audit` heading renamed | fail | fail — "heading missing" |
| the `-e npm` method note removed | fail | fail — "-e npm note missing" |
| a slop verdict injected into a table row with no blocked disposition present | fail | fail — "slop row without a blocked disposition" |
| every backtick stripped from one package name | fail | **passed at first** — see below |

Two things this exercise caught, both fixed:

1. **The blocked-keyword grep was defeatable by prose.** The slop guard is "if a slop verdict
   appears in a table row, the blocked keyword must appear somewhere in the file" — it is not
   scoped to the Disposition column. An earlier draft of this document quoted the shim's output
   using that keyword as its status word, which satisfied the grep on its own. A slop row could
   then have been added later and still passed. The shim was reworded to print `SUPPRESSED`, and
   the keyword now appears nowhere in this file. For the same reason the mutation table above
   spells the verdict in lower case: a literal in a table cell here would arm the guard against
   this document's own commentary.
2. **The per-package row check is file-scoped, not row-scoped.** It greps for the backticked
   package name anywhere in the document. Because most package names are also mentioned in the
   findings and reductions sections, deleting a name from the *table* alone would not fail the
   check. This is a known limit of the verify, recorded here rather than silently relied upon:
   the table's completeness rests on the 16-row count and the audit ↔ install-set correspondence
   below, not on that grep.

---

## Audit ↔ install-set correspondence

02-03 is the **only** plan in Phase 2 that runs `npm install` (verified by grep across all ten
Phase 2 plans). Its Task 1 enumerates 6 runtime and 10 dev dependencies. Those 16 names are exactly
the 16 rows above — one audit row per installed package, with no row left over and no install
lacking a row.

---

**Packages removed due to slopcheck [SLOP] verdict:** none — zero packages returned that verdict.

**Packages flagged as suspicious [SUS]:** `vitest` (edit-distance heuristic against `vite`; see
finding 1). Escalated to the human gate rather than force-installed.

**Packages requiring the Task 2 human gate:** `vitest` (the only non-`[OK]` verdict, mandatory
confirmation), plus the four names the plan singles out as most exposed to typosquatting because
they are scoped or hyphenated and must be confirmed against the live registry page rather than
against this table — `@astrojs/check` (expect withastro), `@cloudflare/vitest-pool-workers`
(expect cloudflare), `prettier-plugin-astro` (expect withastro / fredkschott), `@biomejs/biome`
(expect biomejs). Five rows total.

**Install state at the time of writing:** nothing installed. `package.json`, `package-lock.json`
and `node_modules/` do not exist at the repo root.
