---
phase: 02-astro-foundation-fail-closed-auth
plan: 06
subsystem: build-gates
tags: [auth-03, fnd-02, fnd-04, fnd-05, negative-control, supply-chain, cloudflare-static-assets, prerender]

# Dependency graph
requires:
  - phase: 02-03
    provides: astro:env with both Access secrets non-optional and validateSecrets true; wrangler.jsonc run_worker_first on all four prefixes; bootstrap-local-env.mjs
  - phase: 02-04
    provides: the /admin, /api/health and /_actions/ping surfaces, and the MEASURED facts that the assets root is dist/client and that a prerendered endpoint emits an extensionless artifact
  - phase: 02-05
    provides: the two Vitest projects and the astro preview global setup whose rebuild of dist/ is why the deploy chain runs gate:routes twice
  - phase: 02-07
    provides: src/lib/access.ts, the importer that makes validateSecrets live — without it Control 4 would have asserted against a build that legitimately passes
provides:
  - "scripts/assert-no-prerendered-protected-routes.mjs — the AUTH-03 gate: comment-stripped source check plus an output check against the RESOLVED Static Assets root, wired into every build"
  - "scripts/assert-no-local-dep-specs.mjs — the FND-05 ship gate: file:/link:/portal: specs across six maps plus symlinked node_modules entries, with a non-blocking --advisory mode"
  - "package.json: build ends with gate:routes; a deploy script chaining gate:deps -> build -> test -> gate:routes -> wrangler deploy"
  - "@types/node, and the deletion of the tsconfig.json exclusion 02-05 left as a stopgap — astro check now covers 24 files"
  - "02-NEGATIVE-CONTROLS.md — four controls plus three sub-cases, each observed to fail for its stated reason, with a matching before/after tree digest"
  - "MEASURED and CORRECTIVE: plain process.env does NOT satisfy validateSecrets — the failure is raised inside the adapter's prerender sandbox, which reads secrets from an on-disk file. CI must write .env or .dev.vars"
  - "MEASURED: 20/20 and 17/17 planted violations caught by the two gates, re-run after Biome reformatted both"
affects: [02-08, 02-09, 05, 07]

# Tech tracking
tech-stack:
  added:
    - "@types/node ^22.20.1 (dev) — pinned to the 22.x line because the major tracks the Node major it describes, and .nvmrc/engines both pin 22.x"
  patterns:
    - "A gate resolves the path it asserts against rather than hardcoding it — dist/server/wrangler.json's assets.directory, not dist/"
    - "A gate matches on path segments, not extensions, because the artifact that proves the hazard is extensionless"
    - "Nothing to inspect is a FAILURE, not a skip: a missing dist or an unresolvable assets root exits non-zero rather than passing vacuously"
    - "Comment stripping is byte-length-preserving, so the removed text is recoverable and the failure message can name the actual mistake"
    - "A gate is not trusted until a planted-violation battery covers both directions — and the battery needs a positive case, because a broken harness fails everything and looks thorough"
    - "Ship gates are scoped to the ship path with an --advisory twin, so a sanctioned development workflow is reported rather than blocked"

key-files:
  created:
    - scripts/assert-no-prerendered-protected-routes.mjs
    - scripts/assert-no-local-dep-specs.mjs
    - .planning/phases/02-astro-foundation-fail-closed-auth/02-NEGATIVE-CONTROLS.md
  modified:
    - package.json
    - package-lock.json
    - tsconfig.json
    - .planning/phases/02-astro-foundation-fail-closed-auth/02-PACKAGE-AUDIT.md

key-decisions:
  - "Installed @types/node and deleted the tsconfig exclusion despite this plan's threat register saying it installs nothing — audited first by 02-01's method, recorded as an addendum rather than by mutating the 17-row table"
  - "The source-side check derives each file's ROUTE PATH the way Astro does, so src/pages/admin.astro is checked as /admin even though it is not under src/pages/admin/"
  - "Scanned overrides and resolutions too, because an override can pin a transitive package to a local path while all four dependency maps stay clean"
  - "Scanned every top-level node_modules entry for symlinks, not only declared ones — npm link in the consumer creates the symlink without touching the manifest at all"
  - "Accepted and documented the 187 KB unreferenced React client chunk rather than pruning it; pruning would have to be undone the moment the first island lands"
  - "Re-took the control baseline digest after Control 1's first run changed the gate, and said so in the document rather than presenting a bracket that did not exist"

patterns-established:
  - "Predict-then-run, carried forward from 02-07: each control states its expected failure and mechanism before execution"
  - "A control only counts if it discriminates from its neighbours — Controls 1 and 2 must produce DIFFERENT reasons, or Control 2 proves nothing"

requirements-completed: [AUTH-03, FND-02, FND-04, FND-05]

# Metrics
duration: 30min
completed: 2026-08-19
---

# Phase 2 Plan 06: Build Gates and Their Negative Controls Summary

**The build now refuses a prerendered protected route and the ship path refuses a locally-pathed or symlinked dependency — and both refusals were watched, from a tree whose SHA-256 digest is identical before and after, with 37 planted violations caught between them.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-19T09:00 (local, IST)
- **Completed:** 2026-08-19T09:26 (local, IST)
- **Tasks:** 3 of 3, plus one deviation commit and one fix commit
- **Files created:** 3 · **modified:** 4

## Task Commits

| # | Commit | Type | What |
|---|--------|------|------|
| 0 | `f924374` | chore | `@types/node` + deletion of the `tsconfig.json` exclusion 02-05 left behind (deviation 1) |
| 1 | `e519210` | feat | The AUTH-03 prerender gate and the `package.json` wiring |
| 2 | `219b1a4` | feat | The FND-05 ship-scoped dependency gate |
| — | `b9f11b5` | fix | The gate's failure diagnosis, made byte-precise — found by Control 1 (deviation 2) |
| 3 | `d73b285` | docs | `02-NEGATIVE-CONTROLS.md`, four controls plus three sub-cases |

## The final script strings, verbatim — 02-08 wires CI around these

```
build:              wrangler types && astro check && astro build && npm run gate:routes
deploy:             npm run gate:deps && npm run build && npm test && npm run gate:routes && wrangler deploy
gate:routes:        node scripts/assert-no-prerendered-protected-routes.mjs
gate:deps:          node scripts/assert-no-local-dep-specs.mjs
gate:deps:advisory: node scripts/assert-no-local-dep-specs.mjs --advisory
```

`gate:deps` appears in `deploy` and in **neither `build` nor `check`** — that scoping is what keeps
Phase 5's sanctioned `file:*.tgz` tarball workflow from being blocked, and Task 1's verify fails if
it ever moves. The second `gate:routes`, after `npm test`, is not redundant: the integration
project's global setup runs its own `astro build`, which **overwrites the `dist/` the in-build gate
already inspected**. Without it, the bytes `wrangler deploy` ships would never have been gated.

## Accomplishments

- **Both gates proven before being trusted.** 20 of 20 planted violations caught by the prerender
  gate, 17 of 17 by the dependency gate, each battery re-run after Biome reformatted the scripts.
- **Four controls run against the real tree**, each observed to fail *for its stated reason*, plus
  three sub-cases the plan did not ask for. Tree digest identical before and after.
- **`npm test` still 29 passed across 4 files**; `npm run build`, `npm run check` and both gates
  green on the restored tree.
- **The `@types/node` debt 02-05 documented is paid.** `astro check` now covers 24 files instead of
  23, with the previously excluded `test/setup/preview-server.ts` back under the checker, 0 errors.
- **A briefing this plan was given turned out to be wrong**, and the correction changes what 02-08
  has to build. See Finding 1.

## Findings

### 1. Plain `process.env` does NOT satisfy `validateSecrets` — CI must write a file

This plan was told: *"Build-time validation is satisfied INDEPENDENTLY by `.env`, `.dev.vars`, or
plain `process.env` — it fails only when all three are absent. (So CI need not write a `.env`.)"*

The third disjunct is false, and the practical consequence is the **opposite** of the briefing's.
Measured five ways, every case from a wiped `dist/` and `.astro/`:

| `.env` | `.dev.vars` | process env | `npm run build` |
|:---:|:---:|:---:|:---|
| no  | yes | no  | **exit 0** |
| yes | no  | no  | **exit 0** |
| yes | no  | yes | **exit 0** |
| no  | no  | yes | **exit 1** — `CF_ACCESS_TEAM_DOMAIN is missing` |
| no  | no  | no  | **exit 1** — `CF_ACCESS_TEAM_DOMAIN is missing` |

The process-env-only case was run twice — once as a command prefix, once `export`ed in a subshell —
and failed both times. A sanity check (`npm run env | grep -c '^CF_ACCESS_AUD='` → 1) confirms the
variables genuinely reached npm, so this is not a plumbing mistake.

**Mechanism.** The error is raised during *prerendering*, inside the sandbox `@astrojs/cloudflare`
runs for prerendered routes. A successful build logs three separate sources — `Using secrets defined
in .env`, `... in .dev.vars`, and `... in dist/server/.prerender/.dev.vars` — and the adapter writes
that third one **from the on-disk file**. The process environment does not reach the sandbox.

**What 02-08 must do:** a CI job that only exports `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` as
environment variables **will fail the build**. It has to write `.env` or `.dev.vars` from its
secrets first. Either works; `.dev.vars` is the closer match to the Worker's runtime source.

### 2. The gate's own failure message was fooled by a comment — on its first contact with a real file

Control 1's first run reported *"the declaration is present but not live"* for a fixture that had no
declaration anywhere. The diagnosis was testing the **raw** file text, and the fixture's header
comment described the mistake it was demonstrating, in words that included the literal.

This is precisely the shape 02-07 caught twice — a check reading a file's prose and believing it is
reading its code — reproduced inside this plan's own gate. The verdict was never affected (pass/fail
is decided on comment-stripped source only), but two things were: the message would have sent
someone hunting for a line that was never written, and it made **Controls 1 and 2 report
identically**, which would have left Control 2 proving nothing about comment stripping while
appearing to pass.

Repaired on both sides, as 02-07 established: the literal was removed from the fixture's comment,
**and** the diagnosis was made byte-precise. `stripJsComments` preserves length and newlines, so the
removed text is recoverable exactly — a position where the stripped text holds a space and the
source does not was inside a comment. Three distinct tiers now: commented out / present but not a
declaration / absent entirely.

### 3. The first mutation battery was itself inert, and only a positive case caught it

The prerender gate's battery stored its command in a shell variable and invoked it as `$G`. zsh
executed that as a single word — `no such file or directory: node /path... /path...` — so the gate
never ran and **every case reported FAIL**, including the ones expected to pass. Read carelessly it
looked like a thorough battery with 13 catches.

It was caught only because the battery contained cases that were supposed to PASS. A harness needs a
positive case for the same reason a gate needs a negative one: a check that fails everything is
indistinguishable from a check that works, if you only ever look at the failures.

### 4. The 187 KB React client chunk — accepted and documented, with a trigger for revisiting

`dist/client/_astro/client.CJ90BtjY.js`, 187.1 KB, is emitted because astro core adds every
registered renderer's `clientEntrypoint` unconditionally, islands or not. Measured on the shipped
build:

- `<script>` tags in shipped HTML: **0**
- HTML files referencing the chunk: **0**
- total files Static Assets would upload: **10**

So it is uploaded and **never fetched by any visitor** — no effect on CLAUDE.md's Lighthouse 95+
budget, and nowhere near Cloudflare's 20,000-file / 25 MiB-per-file limits. Pruning was rejected on
two grounds: removing `@astrojs/react` would have to be undone in Phase 5/7, where the admin is a
React island by design (D-05); and a post-build `rm` would silently delete a file that becomes
load-bearing the moment the first `client:*` directive appears — a booby trap for a future phase.

**Trigger for revisiting:** if the first island lands and the chunk is *still* unreferenced, that is
a real bug worth chasing.

### 5. The source-side check models Astro's routing from Astro's source, not from memory

Transcribed from `node_modules/astro/dist/core/routing/create-manifest.js` rather than assumed:

- `const name = ext ? basename.slice(0, -ext.length) : basename; if (name[0] === "_") continue;` —
  appears in **both** walk implementations, and applies to directories as well as files.
- `if (basename[0] === "." && basename !== ".well-known") continue;`
- `validEndpointExtensions = ['.js', '.ts']`; `validPageExtensions = ['.astro', ...markdown,
  ...pageExtensions]`; `.tsx`/`.jsx` are `invalidPotentialPages` and are **not** routed.

Every file the gate skips is **printed with its reason**, because a silently skipped file under a
protected prefix is exactly where a defect hides. Two rules follow that the plan did not specify: a
markdown route under a protected prefix always fails (it cannot carry a module export, so it can
never opt out), and route paths are derived Astro's way so `src/pages/admin.astro` is checked as
`/admin` even though it never appears under `src/pages/admin/`.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking, and explicitly directed] Installed `@types/node` and deleted the tsconfig exclusion**

- **Found during:** setup, before Task 1
- **Issue:** `tsconfig.json` excluded `test/setup/preview-server.ts` — a stopgap 02-05 introduced
  because `@types/node` was absent, so every `node:*` import failed to resolve and `astro check`
  (which `build` chains) reported 12 errors. 02-05 documented it as *"THE REAL FIX is adding
  @types/node"* and could not do it: its own threat register said it installs nothing.
- **Tension with this plan's register:** T-02-SC states *"This plan installs nothing."* That is no
  longer true. The executing instruction directed the install and required it be audited to the
  02-01 standard, so the mitigation the register actually asks for — audit before install — was
  performed rather than the install being skipped on a technicality that would have left the
  exclusion in place for the rest of the project.
- **Audit:** `slopcheck install -e npm` from a scratch directory with a no-op `npm` shim (02-01's
  method, so the install passthrough is recorded and discarded), plus `npm view` provenance and
  download counts for the same 2026-08-09 → 2026-08-15 window. `@types/node` **[OK]**;
  `undici-types`, the single transitive addition, **[OK]**. Recorded as an *addendum* in
  `02-PACKAGE-AUDIT.md` rather than by mutating the 17-row 02-03 table, so that file's internal
  counts and its own self-guards stay consistent.
- **Version:** `^22.20.1`, not `^26`. The major tracks the Node major it describes; `.nvmrc` and
  `engines.node` both pin 22.x. `^26` would typecheck against APIs the runtime does not have.
- **Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `02-PACKAGE-AUDIT.md` ·
  **Commit:** `f924374`

**2. [Rule 1 — Bug] The prerender gate's failure diagnosis read the file's prose**

- **Found during:** Task 3, Control 1's first run. See Finding 2.
- **Fix:** Byte-aligned recovery of the comment regions; three-tier diagnosis; literal removed from
  the fixture's comment. Battery re-run: 20/20 with all three tiers distinguished.
- **Files:** `scripts/assert-no-prerendered-protected-routes.mjs` · **Commit:** `b9f11b5`

**3. [Rule 2 — Missing critical] Five checks the interface spec did not list**

Each closes a way the specified gate could have passed a real defect:

| Addition | Why it is not optional |
|---|---|
| Route-path derivation instead of a directory walk | `src/pages/admin.astro` routes to `/admin` but is not under `src/pages/admin/`; the specified walk would never have opened it |
| `overrides` / `resolutions` scanned recursively | An override pins a **transitive** package to a local path while all four dependency maps stay clean |
| Every top-level `node_modules` entry scanned, not only declared ones | `npm link` in the consumer creates the symlink and touches the manifest **not at all** |
| Markdown under a protected prefix always fails | It cannot declare a module export, so it can never opt out of prerendering |
| Missing `dist`, or an unresolvable assets root, is a failure | The alternative is a gate that reports success when it inspected nothing — the exact failure mode this plan exists to prevent |

**4. [Rule 3 — Blocking] One exclusion added to Task 3's verify**

`git status --porcelain` shows ` M .planning/config.json` — an orchestrator-owned
`_auto_chain_active` flag, already modified before this plan began. `git diff` on it shows exactly
that one key and nothing else. It is not this plan's change to commit, so it was added to the
verify's exclusion list alongside `package.json` and `package-lock.json`, with the reason written
into the verify script. No other tracked file was modified.

### Scope additions

**5. Controls 2b, 3c and 4b, plus two mutation batteries**

- **2b** isolates the source-side check against a clean `dist/` — without it, "the source check
  works" rests on a run where the output check would have failed anyway.
- **3c** exercises the symlink branch on a manifest with *zero* `file:`/`link:`/`portal:` matches,
  which is the case a manifest-only gate passes.
- **4b** is Finding 1, and it changes what 02-08 must build.
- The two batteries (20 and 17 cases) are the reason either gate can be trusted at all.

### Not done, deliberately

**6. The 187 KB client chunk was not pruned.** Accepted and documented with measurements and a
revisit trigger — see Finding 4. The plan named this plan as the owner of the call.

**7. `ROADMAP.md`, `STATE.md` and `REQUIREMENTS.md` were not updated**, per the executing
instruction. `requirements-completed` lists AUTH-03, FND-02, FND-04 and FND-05 as satisfied by this
plan's evidence; recording them is the orchestrator's step.

## Verification Evidence

- Task 1 verify → `GATE_PASSES_ON_CLEAN_TREE`. Task 2 → `DEP_GATE_CLEAN`. Task 3 →
  `CONTROLS_RECORDED_AND_TREE_RESTORED`. All three transcribed to scripts and run with `bash`,
  using the plan's `<verify_idiom>` (no bare commands; no reliance on `PIPESTATUS`, empty under zsh).
- Planted-violation batteries: **20/20** (prerender gate) and **17/17** (dependency gate), both
  re-run after Biome reformatted the scripts.
- Controls: 1 → build exit 1 from `gate:routes` with `astro check` reporting 0 errors on the same
  run; 2 → exit 1 with a *different* reason, where a bare `grep` exits 0; 2b → exactly 1 offending
  path; 3a → exit 1 citing FND-05; 3b → exit 0, byte-identical finding, on stdout; 3c → exit 1 on a
  clean manifest; 4 → `[EnvInvalidVariables]`; 4b → the five-row matrix above.
- Tree digest `08876631163cc0a1c2e35c8c5a62cfa05956f25fe8664123f690f7f0c577673d` before and after,
  recomputed rather than assumed. `.env` and `.dev.vars` SHA-256-identical to their pre-control state.
- `npm test` → **29 passed, 4 files**. `npm run build` exit 0. `npm run check` (Biome + Prettier)
  exit 0. `astro check` → 24 files, 0 errors.
- `gate:routes` re-run on the `dist/` that `npm test` rebuilt → exit 0, which is the deploy chain's
  second call doing its job.
- No orphaned servers: `.astro/preview.json` absent, no `astro preview` process. The two running
  `astro dev` processes are the user's `.playground/` review server on :4321 and were left alone.

## Known Stubs

None. Both gate scripts are complete and exercised; neither has a placeholder branch.

## Threat Flags

No new security-relevant surface. One register correction rather than a new flag:

| Flag | File | Description |
|------|------|-------------|
| register-correction: T-02-SC | `package.json` | This plan's threat register states *"This plan installs nothing."* It installed `@types/node` (+ `undici-types` transitively) under explicit instruction. The register's intent — audit before install — was satisfied by 02-01's method and recorded in `02-PACKAGE-AUDIT.md`. Flagged so the discrepancy between the plan text and the tree is visible rather than silently reconciled. |

## Notes for 02-08 and 02-09

1. **02-08 — the big one.** A CI job that only sets `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` as
   environment variables **will fail the build**. Write `.env` or `.dev.vars` from the secrets
   first. Finding 1 has the full matrix.
2. **02-08.** Wire `gate:deps:advisory` into the everyday job and `gate:deps` into the deploy job
   only. Do not add either to `build` or `check` — Task 1's verify enforces that, and Phase 5's
   tarball workflow depends on it.
3. **02-08.** `npm run build` already runs `gate:routes`. If the CI job runs `npm test` after
   `npm run build`, it must run `npm run gate:routes` again afterwards, for the same reason `deploy`
   does — `npm test` rebuilds `dist/`.
4. **02-09.** `npm run deploy` is the ship path and chains everything. `wrangler deploy --dry-run`
   was green throughout.
5. **All.** Both gate scripts take an optional path argument, so they can be aimed at a fixture
   without touching the repo. That is how Control 3 ran without ever modifying `package.json`.
6. **Phase 5.** When the design-system tarball arrives, `gate:deps` will report it on every advisory
   run. That is intended and non-blocking. It becomes blocking at ship time, which is the moment the
   package must be published rather than packed.

## Self-Check: PASSED

All 4 created files and all 4 modified files verified present on disk. All 5 commit hashes verified present in `git log`. `src/pages/api/prerender-fixture.ts` confirmed absent.
