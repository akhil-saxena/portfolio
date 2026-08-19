# Phase 2 — Negative Controls for the Build and Ship Gates

Plan 02-06. Written 2026-08-19.

A gate that has never refused anything is an assumption wearing a gate's clothes. This phase has
already caught six gates that were *executed*, *reviewed* and *inert* — including 01-04's headline
one, which read zero `@font-face` rules from a file that contained all 73, and 02-07's pair of
`grep -F` assertions that were matching the agent's own explanatory comments rather than its code.
Passing is not evidence. **Refusing for the stated reason is evidence.**

So each gate below was deliberately broken, watched, and restored. Every mutation was made with
Node or `cp`/`mv` — never BSD `sed`, whose `-i '' '0,/re/s//X/'` form is a silent no-op that exits
0 and would make a control appear to pass while changing nothing.

## Method: the tree digest

Before the first control, a single **sha256** was taken over the sorted per-file SHA-256 list of
`src/`, `scripts/`, `package.json`, `astro.config.mjs`, `wrangler.jsonc` and `tsconfig.json` — 17
files:

```bash
{ find src scripts -type f -print0 | xargs -0 shasum -a 256
  shasum -a 256 package.json astro.config.mjs wrangler.jsonc tsconfig.json
} | sort | shasum -a 256
```

```
DIGEST BEFORE  08876631163cc0a1c2e35c8c5a62cfa05956f25fe8664123f690f7f0c577673d
```

The after value is at the bottom of this file. They match, which is what makes "the tree was
restored" a measurement rather than a claim.

**One honesty note about that baseline.** It was re-taken after Control 1's *first* run, because
that run found a real defect in the gate and the gate had to change (see the closing section). The
digest above therefore brackets the four controls as they are recorded here, all of which were run
against the final, committed gate scripts — not against an earlier draft.

---

## Control 1 — a route with no `prerender = false` fails the build, via the gate, naming the file

**Claim under test.** AUTH-03. If an author adds an endpoint under `src/pages/api/` and forgets
`export const prerender = false`, the build must refuse rather than publish a static, auth-free
snapshot of that route.

**Mutation.** Created `src/pages/api/prerender-fixture.ts` — an `APIRoute` with a `GET` handler and
no `prerender` export. The filename deliberately does **not** begin with an underscore: Astro skips
any `src/pages` entry whose basename starts with `_` (`create-manifest.js`, `if (name[0] === "_")
continue;`, in both walk implementations), so an underscore-prefixed fixture is never routed, never
emitted, and is skipped by this gate's own source-side rule. It would have proven nothing while
looking exactly like a control that had.

**Predicted before running.** Build exits non-zero; the failure comes from `gate:routes`, not from
`astro check`; the message names `src/pages/api/prerender-fixture.ts`; and — from 02-04's planted
probe — an **extensionless** artifact appears at `dist/client/api/prerender-fixture`.

**Observed.** All four, exactly.

```
BUILD_EXIT=1
  BUILD REFUSED — AUTH-03: a protected route is (or would be) prerendered
══════════════════════════════════════════════════════════════════════════════════

  ✖ src/pages/api/prerender-fixture.ts
      route:  /api/prerender-fixture
      reason: no `export const prerender = false` at all, so Astro prerenders this route.

  ✖ dist/client/api
      route:  /api
      reason: materialised under a protected path segment "api" in the directory Static Assets serve.

  ✖ dist/client/api/prerender-fixture
      route:  /api/prerender-fixture
      reason: materialised under a protected path segment "api" in the directory Static Assets serve.

  WHY THIS IS FATAL, not a warning:

    Cloudflare Workers Static Assets serve a matching static file BEFORE the Worker
    runs. A prerendered route under /admin, /api or /_actions is therefore published
    as a plain file at its own URL: src/middleware.ts never executes, requireAccess()
    never executes, and the response looks completely correct to anyone testing it —
    including to a smoke test that asserts a 200 and a valid body. Nothing about the
    response reveals that no authentication happened. There is no runtime signal.

  HOW TO FIX:

    Add `export const prerender = false;` to each source file above — uncommented, at
    module scope (in the `---` frontmatter for a .astro page). Then rebuild, so the
    stale artifact is removed from the assets directory as well.

  3 finding(s). Requirement AUTH-03; threats T-02-14, T-02-24.
```

**The failure is the gate, not a type error.** `astro check` reported `Result (27 files): 0 errors`
on the same run, and the log shows the build reaching the `gate:routes` stage before dying:

```
> akhilsaxena-portfolio@0.0.0 gate:routes
> node scripts/assert-no-prerendered-protected-routes.mjs
```

**The emitted artifact confirms 02-04's two measurements at once.** `dist/client/api/prerender-fixture`
is extensionless and is not under `dist/` directly — so the plan's originally specified
`test -d dist/api` could never have fired, and a companion glob for `*.json` or `*.html` would have
missed it too. This gate resolves the assets root from `dist/server/wrangler.json`
(`assets.directory: "../client"`) and matches on path segments for exactly those reasons.

**Restoration.** Fixture deleted; `npm run build` exits 0; the stale `dist/client/api/` directory is
evicted by the rebuild (verified absent afterwards, not assumed).

---

## Control 2 — a commented-out declaration does not satisfy the gate

**Claim under test.** The source-side check strips comments before matching, so the gate cannot be
satisfied by a declaration that has been commented out. This is the control that separates a real
check from a `grep`.

**Mutation.** Same path, rewritten so the declaration exists only as `// export const prerender =
false;` with nothing uncommented.

**Predicted.** Build still fails, and the *reason* differs from Control 1's — "commented out" rather
than "absent". If both controls produced the same message, Control 2 would prove nothing that
Control 1 had not already proven.

**Observed.**

```
BUILD_EXIT=1
  BUILD REFUSED — AUTH-03: a protected route is (or would be) prerendered
══════════════════════════════════════════════════════════════════════════════════

  ✖ src/pages/api/prerender-fixture.ts
      route:  /api/prerender-fixture
      reason: the declaration is COMMENTED OUT. A commented-out `export const prerender = false` opts nothing out — the route is prerendered exactly as if the line had never been written. Uncomment it.
```

**What a naive gate would have concluded about the same file:**

```
$ grep -q 'export const prerender = false' src/pages/api/prerender-fixture.ts ; echo $?
0        # a bare grep MATCHES, i.e. a grep-based gate PASSES this file
```

That is the whole point of the control, and it is why the stripping is done in Node. Phase 0's
related finding — `grep -c` counts *lines*, not matches — is the same failure from a different
angle.

### Control 2b — the source side bites on its own

Controls 1 and 2 both trip the output-side check as well, because the build materialises the route.
That leaves open whether the source-side check contributes anything. Isolated by deleting the
fixture, rebuilding to a clean `dist/` (artifact confirmed evicted), then re-planting the commented
fixture and running `npm run gate:routes` **without** rebuilding:

```
GATE_EXIT=1
  BUILD REFUSED — AUTH-03: a protected route is (or would be) prerendered
══════════════════════════════════════════════════════════════════════════════════

  ✖ src/pages/api/prerender-fixture.ts
      route:  /api/prerender-fixture
      reason: the declaration is COMMENTED OUT. A commented-out `export const prerender = false` opts nothing out — the route is prerendered exactly as if the line had never been written. Uncomment it.
```

**Exactly one** offending path reported, and it is the source file. The source-side check is not
decoration on top of the output-side check.

---

## Control 3 — a `file:` spec fails the ship gate, and advisory mode reports the same finding without blocking

**Claim under test.** FND-05. Nothing ships with a dependency npm did not resolve from a registry —
while the sanctioned Phase 5 development workflow (`npm pack` → `file:*.tgz`) stays possible.

**Mutation.** No repo file was touched. A fixture manifest was written **outside the repo**, at
`<scratch>/control3/tarball/package.json`, declaring the dependency Phase 5 will actually add:

```json
{ "dependencies": { "@akhil-saxena/design-system": "file:./local-packages/ds-1.11.4.tgz" } }
```

### 3a — enforcing mode

```
  SHIP REFUSED — FND-05: a dependency was not resolved from a registry
══════════════════════════════════════════════════════════════════════════════════

  manifest: /private/tmp/claude-501/-Users-akhilsaxena-Documents-Personal-Repositories-portfolio/2818cfe4-05da-47ba-b979-8dd05d726140/scratchpad/control3/tarball/package.json

  ✖ @akhil-saxena/design-system
      dependencies["@akhil-saxena/design-system"] = "file:./local-packages/ds-1.11.4.tgz"
      the spec begins with "file:", so npm resolves it from the local filesystem instead of the registry.

  WHY THIS MATTERS:

    A locally-pathed or symlinked package is not copied into node_modules — it is
    referenced where it sits, and it resolves its own dependencies through its own
    node_modules. For a React component library that means TWO COPIES OF REACT in one
    page: hooks are read from a different module instance than the one that rendered,
    and you get "Invalid hook call" errors that are intermittent and can vanish on a
    refresh. It also means CI built from a directory that only exists on one machine.

  WHAT IS ALLOWED DURING DEVELOPMENT:

    A packed tarball — `npm pack` in ../design-system, then a file:*.tgz spec — is the
    sanctioned workflow, because npm COPIES a tarball rather than symlinking it. That is
    why this gate runs on the ship path only, and why everyday CI runs it with
    --advisory. Publish the package and depend on the published version to ship.

  1 finding(s). Requirement FND-05; threat T-02-26.
```

Exit 1, names the package, cites FND-05, and explains the duplicate-React consequence rather than
only the symptom.

### 3b — advisory mode, same fixture

```
  ADVISORY — FND-05: a dependency was not resolved from a registry
══════════════════════════════════════════════════════════════════════════════════

  manifest: /private/tmp/claude-501/-Users-akhilsaxena-Documents-Personal-Repositories-portfolio/2818cfe4-05da-47ba-b979-8dd05d726140/scratchpad/control3/tarball/package.json

  ✖ @akhil-saxena/design-system
      dependencies["@akhil-saxena/design-system"] = "file:./local-packages/ds-1.11.4.tgz"
      the spec begins with "file:", so npm resolves it from the local filesystem instead of the registry.
      ...
  1 finding(s). Advisory mode: reporting, not blocking. Exit 0.
EXIT=0
```

The finding line is **byte-identical** between the two modes (verified with `diff`), the report goes
to stdout rather than stderr, and the exit status is 0. Plan 02-08 depends on precisely this: the
everyday CI job must surface a local spec without blocking the tarball workflow that CLAUDE.md
sanctions.

### 3c — the symlink branch, which is the one a manifest-only gate would miss

`npm link` leaves **no trace in the manifest**. A fixture with an ordinary `^1.11.4` range — zero
matches for `file:`, `link:` or `portal:` anywhere in the file — plus a symlinked
`node_modules/@akhil-saxena/design-system`:

```
  SHIP REFUSED — FND-05: a dependency was not resolved from a registry
══════════════════════════════════════════════════════════════════════════════════

  manifest: /private/tmp/claude-501/-Users-akhilsaxena-Documents-Personal-Repositories-portfolio/2818cfe4-05da-47ba-b979-8dd05d726140/scratchpad/control3/linked/package.json

  ✖ @akhil-saxena/design-system
      node_modules/@akhil-saxena/design-system -> /private/tmp/claude-501/-Users-akhilsaxena-Documents-Personal-Repositories-portfolio/2818cfe4-05da-47ba-b979-8dd05d726140/scratchpad/control3/elsewhere-on-disk/design-system
      the manifest spec looks ordinary but the installed package is a symlink, which is the trace `npm link` leaves.
```

Exit 1. A manifest-only gate would have passed this tree, cleanly and confidently, on exactly the
setup CLAUDE.md names as the duplicate-React hazard.

**Restoration.** Nothing to restore: every artifact in this control lives outside the repository and
the real `package.json` was never modified.

---

## Control 4 — an unset Access secret fails the build

**Claim under test.** FND-04. `astro:env`'s `validateSecrets: true` (from 02-03) plus a module that
actually imports the virtual env (`src/lib/access.ts`, from 02-07) means a build with no Access
secrets refuses instead of producing a permissive artifact.

**Why it is re-run here rather than cited.** 02-03 ran this experiment and got a **false pass** —
the build read a stale `dist/server/.prerender/.dev.vars` left by an earlier run. 02-04 then measured
that `validateSecrets` was still dormant because nothing imported the virtual module. It only became
live with **02-07**, which is why this plan was executed after it. `dist/` and `.astro/` are wiped
before every case below for the same reason.

**Mutation.** `.env` and `.dev.vars` moved aside (both gitignored — no tracked file changes),
`dist/` and `.astro/` removed, `CF_ACCESS_*` confirmed absent from the process env (`env | grep -c
CF_ACCESS` → 0).

**Observed.**

```
[EnvInvalidVariables] The following environment variables defined in `env.schema` are invalid:
- CF_ACCESS_TEAM_DOMAIN is missing
- CF_ACCESS_AUD is missing
BUILD_EXIT=1
```

**Restoration.** Both files moved back and confirmed byte-identical by SHA-256 against the capture
taken before the control — not merely confirmed present.

### Control 4b — which secret *source* satisfies the build. This corrects a briefing given to this plan.

This plan was told that build-time validation is satisfied independently by `.env`, `.dev.vars` **or
plain `process.env`**, and therefore that CI need not write a file. Measured, that is wrong on the
third disjunct, and the practical consequence is the opposite of the briefing's:

| `.env` | `.dev.vars` | process env | `npm run build` |
|:---:|:---:|:---:|:---|
| no  | yes | no  | **exit 0** |
| yes | no  | no  | **exit 0** |
| yes | no  | yes | **exit 0** |
| no  | no  | yes | **exit 1** — `CF_ACCESS_TEAM_DOMAIN is missing` |
| no  | no  | no  | **exit 1** — `CF_ACCESS_TEAM_DOMAIN is missing` |

Every case run from a wiped `dist/` and `.astro/`. The process-env-only case was run twice — once
with a command prefix, once with `export` in a subshell — and failed both times; a sanity check
(`npm run env | grep -c '^CF_ACCESS_AUD='` → 1) confirms the variables genuinely reached npm.

**Mechanism.** The failure is raised during **prerendering**, inside the sandbox
`@astrojs/cloudflare` runs for prerendered routes. A successful build logs three distinct sources —
`Using secrets defined in .env`, `... in .dev.vars`, and `... in dist/server/.prerender/.dev.vars` —
and that third one is written by the adapter *from the on-disk file*. The process environment does
not reach the prerender sandbox.

**Consequence for 02-08 and 02-09: a CI job that only sets `CF_ACCESS_TEAM_DOMAIN` and
`CF_ACCESS_AUD` as environment variables will fail the build.** CI must write one of the two files
from its secrets before building. Either file works; `.dev.vars` is the closer match to what the
Worker uses at runtime.

---

## Gates in this phase that do NOT yet have a control, and which plan owns them

| Gate | Control status | Owner |
|---|---|---|
| `/admin`, `/api/*`, `/_actions/*` return 401 without a verified JWT | **has controls** — Controls A, B, C plus sub-cases C1/C2 | **02-07**, recorded in `02-AUTH-CONTROLS.md` |
| `verifyAccessJwt` denies on bad signature, wrong `aud`, wrong `iss`, expiry, JWKS outage | **has a control** — Control A, which produced 11 failures against a predicted 6 | **02-07** |
| `run_worker_first` genuinely routes protected prefixes to the Worker before Static Assets | **no behavioural control, and it is currently unconstructible** | **02-07** documented why: this plan's gate makes it impossible to build a tree where a static file exists under a protected prefix, which is the only tree in which the behaviour would be observable. If the gate is ever narrowed to admit a legitimate static file under a protected prefix, this control becomes both possible and necessary. |
| Authenticated `/api/health` returns 200 with `{"status":"ok","r2":"reachable"}` | **no local control possible** — the committed env examples use the RFC 2606 `.invalid` TLD, so no JWKS fetch can ever complete locally and every token fails closed by design | **02-09**, against the deployed Worker with real Access secrets |
| `gate:deps` on the real ship path (deploy CI job) | scripts proven here; the **wiring** is not yet exercised end to end | **02-08** wires `gate:deps:advisory` into everyday CI and `gate:deps` into the deploy job |

---

## What the controls changed about the gates themselves

Control 1's **first** run found a defect, which is the entire reason for running controls rather
than reasoning about them.

The gate reported *"the declaration is present but not live"* for a fixture that had no declaration
anywhere. The diagnosis was testing the **raw** file text, and the fixture's own header comment
described the mistake it was demonstrating — in words that included the literal. A check reading a
file's prose and believing it was reading its code: the identical shape to the two vacuous `grep -F`
assertions **02-07** caught, reproduced inside this plan's own gate on its first contact with a real
file.

The verdict was never affected — pass/fail is decided on comment-stripped source only — but two
things were. A wrong message sends someone hunting at 2am for a commented-out line that was never
written. And, more seriously, it made Controls 1 and 2 report **identically**, which would have left
Control 2 proving nothing about comment stripping while appearing to pass.

Repaired two ways, both of which were needed:

1. **The gate.** `stripJsComments` preserves length and newlines, so the removed text is recoverable
   byte-aligned — a position where the stripped text holds a space and the source does not was
   inside a comment. The diagnosis now has three distinct tiers: commented out / present but not a
   declaration / absent entirely.
2. **The fixture.** The literal was removed from Control 1's comment, following 02-07's rule that a
   literal an assertion depends on appears in code and nowhere else.

Both gates were then re-proven against planted violations before being trusted: **20 of 20** cases
for the prerender gate (including strings, regex literals, JSX comments, HTML comments, an
underscore-prefixed file, a `.tsx` file, a markdown route, `admin.astro` at the pages root, an
extensionless `dist` artifact, a missing `dist`, and an unresolvable assets root) and **17 of 17**
for the dependency gate. Both batteries were re-run after Biome reformatted the scripts, because a
codemod that silently changes behaviour is a documented hazard in this project.

One further note, in the same spirit: the **first** version of the prerender battery harness was
itself inert. It stored the command in a shell variable and invoked it as `$G`, which zsh executed
as a single word — every case "failed", including the ones that should have passed, and the failures
were the shell's, not the gate's. It was caught only because a case expected to PASS also reported
FAIL. A harness needs a positive case for the same reason a gate needs a negative one.

---

## Tree digest: after

```
DIGEST BEFORE  08876631163cc0a1c2e35c8c5a62cfa05956f25fe8664123f690f7f0c577673d
DIGEST AFTER   08876631163cc0a1c2e35c8c5a62cfa05956f25fe8664123f690f7f0c577673d
```

Identical. `src/pages/api/prerender-fixture.ts` no longer exists, `.env` and `.dev.vars` are
restored and SHA-256-identical to their pre-control state, and no tracked file was modified by any
control.
