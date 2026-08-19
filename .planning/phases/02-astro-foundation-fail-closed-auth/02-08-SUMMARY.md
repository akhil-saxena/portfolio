---
phase: 02-astro-foundation-fail-closed-auth
plan: 08
subsystem: ci-cd
tags: [fnd-06, fnd-01, fnd-05, github-actions, supply-chain, workflow-run, secret-scoping]

# Dependency graph
requires:
  - phase: 02-03
    provides: astro:env validateSecrets, the committed .env.example / .dev.vars.example placeholders, and bootstrap-local-env.mjs — which is the mechanism CI uses to satisfy the build
  - phase: 02-06
    provides: the verbatim build and deploy script chains these workflows call, the ship-versus-advisory scoping of gate:deps, and the MEASURED finding that plain process.env does not satisfy validateSecrets
  - phase: 02-07
    provides: src/lib/access.ts, without which validateSecrets would not be live and the inlining assertion would be asserting against a build that never reads a secret
provides:
  - ".github/workflows/ci.yml — lint, typecheck, build, inlining assertion, both test projects and the advisory dependency gate on every push and pull request, with zero secrets in scope"
  - ".github/workflows/deploy.yml — publish to Cloudflare Workers, reachable only from a successful CI run on main, pinned to that run's head_sha"
  - "scripts/assert-no-inlined-secrets.mjs — the T-02-41 gate, replacing a plan-specified grep that would have failed every green build"
  - "MEASURED: the plan's own Task 2 contract validator has 8 blind spots, including passing a deploy.yml with the CI gate deleted"
  - "The exact repository secrets, repository variable and Cloudflare API token scope plan 02-09 must create"
affects: [02-09, 02-10, 05]

# Tech tracking
tech-stack:
  added:
    - "actions/checkout pinned at 3d3c42e5aac5ba805825da76410c181273ba90b1 (v7.0.1)"
    - "actions/setup-node pinned at 820762786026740c76f36085b0efc47a31fe5020 (v7.0.0)"
  patterns:
    - "A greppable literal appears in a workflow exactly once, in executable position — never also in a comment, because a substring assertion cannot tell code from prose"
    - "Where a plan's verify is a substring check, a second validator asserts against the PARSED document, which comments cannot reach"
    - "An exclusion inside a gate is justified by a check, not by prose: skipping .dev.vars is conditional on .assetsignore still naming it"
    - "A gate takes its search values as arguments and cross-checks them against the committed source of truth, so drift makes it fail rather than silently check nothing"
    - "A workflow_run deploy pins checkout to the triggering run's head_sha — the default is the branch tip, which no gate has seen"

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/deploy.yml
    - scripts/assert-no-inlined-secrets.mjs
  modified: []

key-decisions:
  - "workflow_run rather than needs:, because must_haves requires two separate workflow files and needs: only links jobs within one file — the plan's own contains: \"needs:\" field is unsatisfiable alongside its own artifact list"
  - "Replaced the plan's `grep -rl 'cloudflareaccess.invalid' dist/` — measured to match dist/server/.dev.vars on every successful build, so as written it would have failed 100% of CI runs"
  - "Added event == 'push' and head_repository guards beyond the plan: the branches: filter matches the triggering run's HEAD branch, so a fork PR from a branch named main would otherwise reach the publish"
  - "Added ref: head_sha to checkout beyond the plan, without which the gate asserts one commit and the job ships another"
  - "No workflow_dispatch trigger on the deploy, deliberately — it would be a human-operated bypass around the only gate"
  - "Did NOT add the inlining assertion to the deploy chain, because that would mean editing package.json's deploy script, which the plan forbids; CI asserts it on the same commit"

patterns-established:
  - "Predict-then-run, carried forward from 02-06 and 02-07: every battery case declares its expected verdict AND, for negatives, the reason it must fail for"
  - "A battery reports its positive-case count next to its negative-case count, so a harness that fails everything is visible at a glance"

# Requirements: deliberately NOT marked complete. See "What is not proven" below.
requirements-advanced: [FND-06, FND-01, FND-05]
requirements-completed: []

# Metrics
duration: 35min
completed: 2026-08-19
---

# Phase 2 Plan 08: CI and the CI-Gated Deploy Summary

**A push now runs lint, typecheck, build, an anti-inlining assertion and 29 tests with no secret anywhere in scope, and the only path to `wrangler deploy` runs from a successful CI run pinned to that run's exact commit — and the plan's own verify for that deploy would have passed a file with the CI gate deleted, which is why a second validator asserts against the parsed document instead.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-19T09:52 (local, IST)
- **Completed:** 2026-08-19T10:27 (local, IST)
- **Tasks:** 2 of 2
- **Files created:** 3 · **modified:** 0

## Task Commits

| # | Commit | Type | What |
|---|--------|------|------|
| 1 | `df826a4` | feat | `.github/workflows/ci.yml` and `scripts/assert-no-inlined-secrets.mjs` |
| 2 | `4b92065` | feat | `.github/workflows/deploy.yml` |

## What was verified, and how

Every command in both pipelines except `wrangler deploy` itself was executed locally, in
order, from a wiped `dist/` and `.astro/`:

| Step | Result |
|---|---|
| `npm ci` | 414 packages, 0 vulnerabilities |
| `npm run bootstrap:local` | `.env` and `.dev.vars` present — and both are byte-identical to their committed examples, so this machine's run exercises the same values CI would seed |
| `npm run check` | 27 files, no fixes; Prettier clean |
| `npm run typecheck` | 27 files, 0 errors, 0 warnings, 3 hints |
| `npm run build` | complete, ending in the AUTH-03 route gate — PASS |
| inlining assertion | 39 files scanned, 1 skipped, no placeholder present |
| `npm test` | 4 files, **29 passed** |
| `npm run gate:deps:advisory` | exit 0, 18 deps, no local spec |
| `npm run gate:deps` (enforcing, ship path) | exit 0 |
| `npm run gate:routes` (the post-test run) | PASS on the `dist/` the test setup last rebuilt |
| `npx wrangler deploy --dry-run` | 27 modules, 12 asset files, both bindings |

The CI step's *exact folded string* was extracted from the parsed YAML and executed through
`sh`, rather than a hand-retyped equivalent. Both folded scalars were confirmed to collapse to
a single line with zero embedded newlines.

`actionlint` is not on PATH and was **not** installed — that would have been an unaudited
install, which T-02-SC forbids.

## Findings

### 1. The plan's placeholder assertion would have failed every single CI run

The plan specifies, verbatim, `if grep -rl 'cloudflareaccess.invalid' dist/; then … exit 1; fi`.
Run against a green build:

```
$ grep -rl 'cloudflareaccess.invalid' dist/
dist/server/.dev.vars
```

`@astrojs/cloudflare` copies the on-disk `.dev.vars` next to the server entry so its prerender
sandbox can read the secrets `validateSecrets` demands — the same mechanism 02-06 measured and
the reason CI must write a file at all. So the artifact of a *correct* build always contains the
placeholder, and the plan's gate would have gone red on every push, forever, for the healthiest
possible reason.

Note the shape of the trap: the plan's Task 1 verify and the CI step it describes are the same
command, so running the verify would have "confirmed" a step that can never pass in CI.

**What replaced it:** `scripts/assert-no-inlined-secrets.mjs`, which scans all of `dist/` and
skips exactly one thing. It keeps `dist/server/wrangler.json` **in** scope on purpose — that file
is the effective deploy config, reached through the adapter's `.wrangler/deploy/config.json`
redirect, so a secret landing in its `vars` block would deploy as a plaintext Worker var. Proven
by planted violation G4.

Evidence that `.dev.vars` genuinely does not ship: `.assetsignore` names it; the dry-run reads 12
asset files and bundles 27 modules, none of them it; and grepping the dry-run's own `--outdir`
output for the placeholder returns nothing.

### 2. The plan's Task 2 validator has 8 blind spots — including the gate itself

Fifteen mutations of `deploy.yml`, each prediction written before the run, each run against both
the plan's substring validator and a structural validator that asserts on the parsed document.
**All 15 behaved exactly as predicted.**

| # | Planted violation | Plan validator | Structural |
|---|---|---|---|
| P1 | file as committed | PASS | PASS |
| P2 | job display name changed | PASS | PASS |
| N1 | deploys allowed to cancel mid-publish | FAIL | FAIL |
| N2 | `DEPLOY_ENABLED` guard removed | FAIL | FAIL |
| **N3** | **`conclusion == 'success'` removed — a red CI run deploys** | **PASS** | FAIL |
| **N4** | **`event == 'push'` removed — fork-PR vector reopened** | **PASS** | FAIL |
| **N5** | **credentials widened from step scope to job scope** | **PASS** | FAIL |
| **N6** | **`workflow_dispatch` added — human bypass around CI** | **PASS** | FAIL |
| N7 | chain reimplemented in YAML, bypassing package.json | FAIL | FAIL |
| N8 | checkout repointed to a floating tag | FAIL | FAIL |
| **N9** | **`head_sha` pin removed — ships an untested commit** | **PASS** | FAIL |
| **N10** | **trigger names a workflow that does not exist** | **PASS** | FAIL |
| N11 | `permissions` block removed | FAIL | FAIL |
| **N12** | **`push:` trigger added — a second, ungated path** | **PASS** | FAIL |
| **N13** | **the entire trigger deleted, all prose left in place** | **PASS** | FAIL |

N3 is the one that matters: **the plan's verify passes a `deploy.yml` whose CI gate has been
deleted.** It survives because `/workflow_run|needs:/` is still satisfied by the `github.event.workflow_run.*`
references that remain in the job guard. N13 is the same failure taken to its limit — delete the
trigger block entirely and the substring check still reports OK.

Three of the plan's nine deploy assertions are documentation checks by construction: `/Workers
Builds/` can only ever live in a comment (the plan asks for it to be documented in the file), and
`/main/` and `/workflow_run|needs:/` are satisfied by prose. The structural validator is what
covers them, and it cannot be fooled the same way because comments do not survive parsing.

### 3. The comment-fooling trap was avoided by construction, and the residual limit is measured

`ci.yml`'s validator asserts `s.includes("cloudflareaccess.invalid")`. That literal appears in the
committed file **exactly once**, at line 96, as an argument to the assertion step — never in a
comment. Every comment in both files was written to avoid the strings their validators grep for
(`npm ci`, `npm test`, `node-version-file`, `gate:deps:advisory`, `vars.DEPLOY_ENABLED`,
`CLOUDFLARE_API_TOKEN`, `workflow_run`, …), so those assertions test executable content.

Case N2 of the CI battery proves it: delete the assertion step, leave every comment intact, and
the validator fails with `ci.yml missing: cloudflareaccess.invalid`.

Case L1 measures the residual limit honestly: delete the step **and** reintroduce the literal in a
comment, and the validator passes. The check is a substring check; what makes it meaningful is the
one-occurrence discipline, not the check itself. Anyone editing these files should keep it.

### 4. The batteries in numbers

| Battery | Cases | Positives | Negatives | Outcome |
|---|---|---|---|---|
| `ci.yml` contract | 12 | 3 | 9 | all as predicted; every negative failed for its stated reason |
| `assert-no-inlined-secrets.mjs` | 10 | 2 | 8 | all as predicted; `dist/` SHA-256 digest identical before and after |
| `deploy.yml` contract ×2 validators | 15 | 2 | 13 | all as predicted; 8 blind spots covered structurally |

Positive cases are reported alongside negatives on purpose. 02-06's mutation battery was itself
inert and only a positive case revealed it; a harness that fails everything is indistinguishable
from a thorough one if you only read the failures. No mutation was a no-op — the harness aborts a
case whose planted change did not actually change the file.

### 5. `wrangler types` stalled a build for over eight minutes, once

One `npm run build` invocation hung and was killed at the 8-minute mark with no output past the
script banner. Re-run immediately afterwards it completed in seconds, and the log showed
`⛅️ wrangler 4.123.0 (update available 4.124.0)` — wrangler's npm update check, which reaches the
registry at the start of `wrangler types`. Not a defect and not reproducible on demand, but worth
knowing: if a CI run ever appears hung at the build step, this is the first thing to suspect, and
`WRANGLER_SEND_METRICS`/update-check suppression is the lever.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The specified placeholder assertion cannot pass**

- **Found during:** Task 1, before writing any YAML
- **Issue:** Finding 1 above — `grep -rl 'cloudflareaccess.invalid' dist/` matches
  `dist/server/.dev.vars` on every successful build.
- **Fix:** `scripts/assert-no-inlined-secrets.mjs`, which resolves the assets root from
  `dist/server/wrangler.json` rather than hardcoding it (02-06's pattern), fails when there is
  nothing to inspect rather than passing vacuously, keeps the generated deploy config in scope,
  and skips only `.dev.vars` — conditionally on `.assetsignore` still naming it, so the exclusion
  fails loudly rather than going stale.
- **Files:** `scripts/assert-no-inlined-secrets.mjs`, `.github/workflows/ci.yml`
- **Commit:** `df826a4`

**2. [Rule 2 — Missing critical functionality] The deploy would not have shipped the commit CI approved**

- **Found during:** Task 2
- **Issue:** A `workflow_run` job checks out the **default branch tip**, not the commit whose CI
  run triggered it. On any push sequence where a second commit lands during CI, the gate asserts
  "commit A is green" and the job ships commit B — which no gate has seen. That directly falsifies
  this plan's own must-have truth, *"a deploy cannot happen unless that CI run passed."*
- **Fix:** `ref: ${{ github.event.workflow_run.head_sha }}` on the checkout step, with the reason
  in a comment. Asserted by the structural validator; battery case N9.
- **Commit:** `4b92065`

**3. [Rule 2 — Missing critical functionality] A fork could have reached the publish**

- **Found during:** Task 2
- **Issue:** `on.workflow_run.branches: [main]` filters on the **triggering run's head branch**.
  For a `pull_request`-triggered CI run that is the contributor's branch — so a pull request opened
  from a fork branch named `main` satisfies it. With only the plan's specified guards, that reaches
  the deploy job with credentials in scope.
- **Fix:** two further clauses in the job guard —
  `github.event.workflow_run.event == 'push'` and
  `github.event.workflow_run.head_repository.full_name == github.repository` — each with the reason
  written out, because both look redundant and are not. Battery case N4.
- **Commit:** `4b92065`

**4. [Rule 2 — Missing critical functionality] Drift protection on the new gate**

- **Issue:** A gate that greps for a literal goes inert the moment the literal changes, while
  staying green.
- **Fix:** the values are passed in as arguments (so the caller states them in executable
  position) and cross-checked against every value in `.env.example` and `.dev.vars.example`. An
  example value the caller did not ask for is a hard failure. Battery case G8.

### Deliberate departures from the written plan

**5. `workflow_run`, not `needs:` — the plan's must_haves cannot both be satisfied**

`must_haves.artifacts` requires two separate files, `ci.yml` and `deploy.yml`, and separately
requires `deploy.yml` to contain `needs:`. Those are mutually unsatisfiable: `needs:` expresses a
dependency between **jobs in the same workflow file**, so satisfying it would mean collapsing both
into one file and dropping one required artifact. The plan's body resolves this itself — its
`<interfaces>` block says "either … or", Task 2 says "whichever you judge clearer", and
`key_links.pattern` is `needs:|workflow_run`. Only the `contains` field disagrees. Recorded here so
a verifier reading `contains` alone does not read the absence of `needs:` as a miss.

**6. No `workflow_dispatch` trigger on the deploy**

The plan asks that "a manual re-run cannot slip past" the guard. A dispatch trigger is exactly that
hole, so there is none, and the omission is commented so nobody adds one as a convenience. Battery
case N6.

**7. The inlining assertion is not inside the deploy chain**

Adding it would mean editing `package.json`'s `deploy` script, which the plan explicitly forbids
touching. CI runs the assertion on the same commit the deploy is pinned to, so the shipped sources
are covered. The residual gap is a developer running `npm run deploy` from a laptop — see
"What is not proven".

## Handoff to plan 02-09 — the precise list

### GitHub repository **secrets** to create (Settings → Secrets and variables → Actions → Secrets)

| Name | Used by | Notes |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | the single publish step in `deploy.yml` | scope below |
| `CLOUDFLARE_ACCOUNT_ID` | same step | not sensitive, but wrangler reads it from the environment and keeping both together keeps the step's `env:` block honest; supplying it also stops wrangler needing account-list permission |

### GitHub repository **variable** to create (same page → Variables tab)

| Name | Value | When |
|---|---|---|
| `DEPLOY_ENABLED` | `true` | **the last step of 02-09's credentials checkpoint** |

**This is load-bearing and easy to forget.** Until it is set, the deploy job evaluates to
`skipped` on every CI success. That is the intended state right now — `deploy.yml` is live on
`main` a full wave before any credential exists — but if 02-09 finishes without setting it,
**no deploy run will ever exist** and 02-09's own `gh run list` gate-ordering evidence will find
nothing to order. Set it last, so the enabling act is explicit and dated rather than a side
effect of merging.

### Worker secrets (not GitHub secrets)

```
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
```

These are the real Access values. They must never appear in GitHub — both workflows build with
the committed placeholders, and `ci.yml` fails if a placeholder ever reaches the artifact, which
is what makes that safe.

### Minimum Cloudflare API token scope

Cloudflare's **"Edit Cloudflare Workers"** template is a superset of what is needed. The minimum
for `wrangler deploy` against *this* `wrangler.jsonc`:

| Scope | Permission | Why this config needs it | Confidence |
|---|---|---|---|
| Account · `akhilsaxena` | **Workers Scripts : Edit** | Uploads the Worker script. Static Assets are uploaded through the same script-upload API, so this covers `dist/client` too. | Required |
| Zone · `akhilsaxena.com` | **Workers Routes : Edit** | `routes: [{ pattern: "preview.akhilsaxena.com", custom_domain: true }]` — wrangler creates and attaches the custom domain during deploy. | Required for this config |
| Zone · `akhilsaxena.com` | **DNS : Edit** | Attaching a Workers custom domain creates a proxied DNS record for `preview`. | Required for this config |
| Account · `akhilsaxena` | Workers R2 Storage : Edit | The `PORTFOLIO_BUCKET` binding is configuration at deploy time, so this is **probably not needed** — 02-02 already provisioned the bucket. Add it only if the deploy returns a 403 naming R2. | Optional |
| Account / User | Account Settings : Read, Memberships : Read | Only needed when wrangler must resolve which account to use. `CLOUDFLARE_ACCOUNT_ID` is supplied, so it should not be. | Optional |

Zone scopes must be **restricted to the `akhilsaxena.com` zone**, not "All zones". T-02-43 is a
*transfer*, not a mitigation — this plan constrains only where the token is readable (one step's
`env:`, never job or workflow level); its blast radius is chosen when it is created.

Verify empirically rather than by reading: the first deploy either succeeds or returns a 403 that
names the missing permission. Start minimal and widen on a real error.

### Also for 02-09's checkpoint

- **Confirm Cloudflare Workers Builds is NOT connected to this repository.** It triggers on its own
  git event and cannot depend on an Actions check, so connecting it would create a second deploy
  path with no gate. The reasoning is written into `deploy.yml`'s header so it survives someone
  re-reading `STACK.md`, but only a human looking at the dashboard can confirm the disconnection.
- Expect the first CI run to appear on the next push; nothing has been pushed by this plan.

## What is not proven

Stated plainly, because everything above was measured and these were not:

- **Neither workflow has ever run on GitHub.** Every command in both was executed locally, in
  order, on the same Node version `.nvmrc` pins — but a runner is not a laptop. Cache behaviour,
  the `ubuntu-latest` image, and the actions themselves are unexercised.
- **`wrangler deploy` has never run.** `--dry-run` succeeded (27 modules, 12 assets, both
  bindings); the real publish needs the token 02-09 creates.
- **The `workflow_run` gate's runtime behaviour is asserted structurally, not observed.** That the
  job skips when `DEPLOY_ENABLED` is unset, and that a red CI produces no deploy, follow from the
  guard expression — which was parsed, folded to a single line and inspected clause by clause, but
  not watched. 02-09's run-ordering evidence is what observes it.
- **A local `npm run deploy` bypasses CI entirely.** The chain lives in `package.json` by the
  plan's design, precisely so a laptop deploy runs the same gates — but the *CI* gate is not among
  them, and neither is the inlining assertion. Anyone deploying from a laptop is trusting
  themselves, not the pipeline.
- **Requirements are advanced, not closed.** FND-06 says CI *runs* on every push; the workflow
  exists but has not run. FND-01 requires an app that *deploys*; nothing has deployed. FND-05's
  ship-scoping is honoured here and was closed by 02-06. `REQUIREMENTS.md` was deliberately left
  untouched — 02-09/02-10 close these once there is a deployment to point at.

## Self-Check: PASSED

- `.github/workflows/ci.yml` — FOUND (111 lines)
- `.github/workflows/deploy.yml` — FOUND (118 lines)
- `scripts/assert-no-inlined-secrets.mjs` — FOUND
- commit `df826a4` — FOUND
- commit `4b92065` — FOUND
- neither commit deletes a tracked file (`git diff --diff-filter=D` empty for both)
- working tree clean apart from two pre-existing, unrelated entries: the modified
  `.planning/config.json` (orchestrator-owned `_auto_chain_active` flag) and the untracked
  `.planning/phases/06.1-…/` directory
