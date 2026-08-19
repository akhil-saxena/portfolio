---
phase: 02-astro-foundation-fail-closed-auth
plan: 09
subsystem: deploy
tags: [fnd-01, fnd-07, auth-01, cloudflare-workers, custom-domain, cloudflare-access, ci-gate]

# Dependency graph
requires:
  - phase: 02-02
    provides: the WORKER_CUSTOM_DOMAIN decision (preview.akhilsaxena.com), the Cloudflare-managed nameserver verdict without which a Workers custom domain is impossible, and the confirmation that the subdomain was free of conflicting records
  - phase: 02-08
    provides: ci.yml and deploy.yml, the workflow_run gate pinned to head_sha, and the exact secret/variable/token-scope list this plan's checkpoint handed to the developer
provides:
  - "A deployed Cloudflare Worker (akhilsaxena-portfolio, Version ID 0012c4a0-5c96-41c5-b53d-81af37763938) serving on preview.akhilsaxena.com"
  - "02-DEPLOY-VERIFICATION.md — deploy evidence, observed CI-gate ordering, public-route proof and the three edge-layer refusal probes"
  - "MEASURED: wrangler deploy requires Workers R2 Storage:Edit, falsifying 02-08's 'probably not needed' rating"
  - "MEASURED: the plan's ordering assertion has two blind spots (unbound commit, stale legacy run named 'ci') and a misfiring diagnostic on skipped deploys"
  - "A deploy pipeline that tolerates a credential pasted with a trailing newline"
affects: [02-10, 03, 05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A gate-ordering assertion binds runs to the commit actually pushed, not merely to each other — otherwise a stale consistent pair passes"
    - "Workflow-name matching in run-list assertions is anchored (/^CI$/), because a repository accumulates historical runs whose names substring-match"
    - "Credentials are whitespace-stripped at the point of use; a pasted secret carries a trailing newline far more often than not"
    - "DNS assertions after a domain is created query public resolvers, never the local one, which may hold a negative cache entry from before the record existed"

key-files:
  created:
    - .planning/phases/02-astro-foundation-fail-closed-auth/02-DEPLOY-VERIFICATION.md
  modified:
    - .github/workflows/deploy.yml

key-decisions:
  - "Added Workers R2 Storage:Edit to the API token after measuring the failure, rather than pre-granting it — 02-08's start-minimal-and-widen instruction is what produced the measurement"
  - "Did NOT add User Details:Read or Memberships:Read; they appear only in wrangler's post-failure diagnostics, not the deploy path, because CLOUDFLARE_ACCOUNT_ID is supplied"
  - "Re-ran the failed Deploy run rather than pushing an empty commit: a workflow_run re-run replays the original event payload, so the if: guard re-evaluates against the same green CI run and the gate is not bypassed"
  - "Left REQUIREMENTS.md untouched — AUTH-01 cannot be closed on edge-layer evidence alone"

patterns-established:
  - "Predict-then-run, carried forward from 02-06/02-07/02-08: 22 ordering fixtures across two batteries, every verdict declared before the run"

requirements-advanced: [FND-01, FND-07, AUTH-01]
requirements-completed: []

# Metrics
duration: ~45min (excluding two human checkpoints)
completed: 2026-08-19
---

# Phase 2 Plan 09: First Deploy and Production Verification Summary

**`akhilsaxena-portfolio` is live on `preview.akhilsaxena.com` with both bindings, its deploy observed to have started 2s after the CI run for the same commit completed — and all three protected prefixes are refused at the edge by Cloudflare Access, which is emphatically not the same claim as the Worker's own auth code working.**

## Performance

- **Duration:** ~45 min of execution, across two human checkpoints
- **Tasks:** 2 of 2
- **Files created:** 1 · **modified:** 1

## Task Commits

| # | Commit | Type | What |
|---|--------|------|------|
| — | `b0b2b3c` | fix | Strip whitespace from deploy credentials (unplanned, Rule 3) |
| 2 | *(this commit)* | docs | `02-DEPLOY-VERIFICATION.md` and this summary |

## The deployed hostname

**`https://preview.akhilsaxena.com`** — non-apex, attached by `wrangler deploy` itself from the
`routes` entry in `wrangler.jsonc` (`custom_domain: true`), with no dashboard step and no redeploy.
Worker `akhilsaxena-portfolio`, Version ID `0012c4a0-5c96-41c5-b53d-81af37763938`, 27 modules /
642.96 KiB, 12 asset files, bindings `PORTFOLIO_BUCKET` (R2) and `ASSETS`.

The apex `akhilsaxena.com` remains unattached and still holds no DNS record at all. Cutover owns it.

## What this plan proves, and the much larger thing it does not

**Proves:** a push to `main` produced a deployed Worker; the deploy ran only after CI for that same
commit succeeded (observed, not inferred from YAML); `/` returns 200 with the `stack-proof-ok`
marker from Static Assets; the committed 404 page is served for unknown paths; and `/admin`,
`/api/health` and `POST /_actions/ping` are each refused.

**Does not prove:** anything about `src/lib/access.ts` or `src/middleware.ts`. Every refusal
recorded here is a **302 to the Access team domain**, which means Cloudflare intercepted the request
*before the Worker ran*. The Worker's own code was never reached on any protected prefix. That is
precisely the gap the legacy app fell into — its `access.ts` claimed the in-code gate existed *"so
the write endpoints aren't a single dashboard toggle away from being open"* while shipping a
fallback that made them exactly that.

**Plan 02-10 turns the toggle off and requires 401 from our own code.** `02-DEPLOY-VERIFICATION.md`
carries its two sections as empty headings on purpose, so the missing half of the evidence is
visible rather than implied. Do not let the 302s here stand in for 401s.

The status code is the whole distinction and is why it is recorded rather than "refused": a **401**
on any of those three prefixes would have meant Access did *not* intercept and the Worker was
carrying that prefix alone. All three were 302, with `www-authenticate: Cloudflare-Access`,
`cdn-cgi/access/login/` and a `CF_AppSession` cookie. `/_actions/*` — the prefix most easily
forgotten because no page declares it — is covered.

## Findings

### 1. `wrangler deploy` requires the R2 scope — 02-08's "probably not needed" is falsified

Deploy attempt 2 died with `A request to the Cloudflare API (/accounts/***/r2/buckets/portfolio-photos)
failed. Authentication error [code: 10000]`. `wrangler deploy` validates every binding against the
API on each deploy, so **Workers R2 Storage : Edit** is required for this `wrangler.jsonc`, not
optional as 02-08 rated it.

This is the start-minimal-and-widen instruction working exactly as intended: the token was created
with three scopes, the deploy named the missing one, and one scope was added. A reflexive
"Edit Cloudflare Workers" template token would have deployed on the first try and taught nothing
about its own blast radius. The two scopes 02-08 rated optional for account resolution were
confirmed genuinely unnecessary and **not** added.

### 2. A trailing newline in a secret killed the deploy at the latest possible point

Deploy attempt 1: `✘ [ERROR] Invalid account ID "***\n"`. The `CLOUDFLARE_ACCOUNT_ID` repository
secret was pasted with a trailing newline. It failed **after** the enforcing dependency gate, the
build, both route-gate runs and all 29 tests had passed — roughly 90 seconds of green output
followed by a failure caused by one invisible byte.

Fixed in `deploy.yml`: both credentials are stripped with `tr -d '[:space:]'` before wrangler reads
them. Stripping cannot mask a well-formed value — wrangler's own error states that account IDs are
alphanumeric with hyphens and underscores — and neither credential is ever echoed.

### 3. The plan's ordering assertion had two blind spots and a misfiring diagnostic

The assertion is Criterion 1's *only* evidence that the deploy was gated, so it was extracted
verbatim from the plan and mutation-tested before being trusted: **14 fixtures, all as predicted**
(4 positives, 10 negatives). It does bite — an empty run list fails with `no CI run found` rather
than passing vacuously, and the `updatedAt` comparison correctly rejects a deploy that started
after CI *began* but before it *finished*.

Three defects measured, then closed in a hardened variant (**8 further fixtures, all as predicted**):

| # | Defect | Consequence |
|---|---|---|
| B1 | runs bound to each other but not to the pushed commit | a stale-but-consistent CI+Deploy pair from an earlier push passes |
| — | `/ci/i` is unanchored | matches this repo's **live stale legacy run literally named `ci`** (`27702280883`, commit `1435ac1`, 2026-06-17), still inside a 15-run window |
| N5 | a skipped deploy job yields `conclusion: "skipped"`, which **is** found | the plan's "no deploy run found — DEPLOY_ENABLED was not set" diagnostic can never fire for the case it was written for |

The hardened variant was confirmed non-vacuous on real data: it passes for `b0b2b3c` and fails with
`the deploy did not succeed: failure` when pointed at `9c84030`.

### 4. `dig` said the domain did not resolve while `curl` fetched it

Immediately post-deploy, this machine's resolver returned nothing for `preview.akhilsaxena.com` —
the pre-deploy probes had queried the name before it existed and the zone's SOA minimum (1800s)
negatively cached that. Meanwhile `curl` returned 200 over the same hostname, because macOS's
`getaddrinfo` and `dig`'s direct query do not share a cache.

Read carelessly this is "wrangler did not attach the custom domain" — the exact opposite of the
truth. DNS assertions after creating a record must query public resolvers. Authoritative, 1.1.1.1
and 8.8.8.8 all agreed the record existed; the local negative entry expired on its own.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking issue] Deploy credentials not whitespace-tolerant**

- **Found during:** Task 2, first deploy run
- **Issue:** Finding 2 above.
- **Fix:** whitespace strip in `deploy.yml`'s publish step, with the reason in a comment.
  Re-validated the file structurally afterwards — **14/14 checks**: guard folds to one line with all
  five clauses intact, `workflow_run` on `[CI]` only, no `workflow_dispatch`, no `push` trigger,
  checkout still pinned to `head_sha`, credentials still scoped to the single step, and no literal
  moved into a comment (which would break 02-08's one-occurrence discipline).
- **Files:** `.github/workflows/deploy.yml` · **Commit:** `b0b2b3c`

**2. [Rule 3 — Blocking issue] DNS gate asserted against a poisoned local resolver**

- **Issue:** Finding 4 above; the probe script's `dig +short` would have reported a successful
  deploy as a failed attach.
- **Fix:** the probe script asserts against 1.1.1.1 and 8.8.8.8 and records the authoritative
  answer. The plan's own verify block uses the local resolver and was run **verbatim, unmodified**
  once the negative entry expired — it passed (`PRODUCTION_EDGE_PROBES_OK`, exit 0).

### Deliberate departures

**3. The successful deploy was a re-run, not a fresh push**

After the R2 scope was added there was nothing to push (`main` clean, HEAD `b0b2b3c` already on
origin) and `deploy.yml` deliberately has no `workflow_dispatch`. The failed Deploy run was re-run
instead. This is **not** a gate bypass: a `workflow_run` re-run replays the original event payload,
so the job's `if:` guard re-evaluated against the same green CI run for the same commit, and
`conclusion == 'success'` still had to hold. Recorded because "the deploy succeeded" and "a fresh
push deployed" are different claims and the run timestamps show the difference
(`created 06:27:23`, `updated 06:57:11`).

Committing this summary then produced a chain with **no re-run in it** — CI `32226174187` success
on `41de8e3`, Deploy `32226248052` success on `41de8e3`, created 2s after CI completed, green on
the first attempt — so the caveat above is retired rather than merely disclosed.

**4. `REQUIREMENTS.md` deliberately untouched**

FND-01 and FND-07 are now evidenced by a live deployment. **AUTH-01 is not** — it is about auth
failing closed, and every refusal here came from the edge rather than from our code. Closing it on
this evidence would record exactly the conflation this plan's objective warns against. 02-10 closes
it. `ROADMAP.md` and `STATE.md` were left to the orchestrator as instructed.

## Authentication gates

Two, both normal flow rather than defects:

1. **Credentials checkpoint (Task 1).** Seven dashboard steps. All seven completed by the developer.
   No token, team domain or AUD entered the transcript or any file.
2. **Token scope widening (mid-Task 2).** The R2 failure required a dashboard edit only the
   developer could make. Reported with the precise scope name and an explicit recommendation
   *against* adding the two optional scopes.

## Known Stubs

None. Every route probed serves real behaviour; no placeholder or hardcoded empty value was
introduced by this plan.

## Threat Flags

None. This plan added no network surface — it deployed surface that already existed and was
declared in 02-03's `wrangler.jsonc` and 02-07's middleware.

Threat dispositions discharged: **T-02-51** (apex not attached — verified, and the verify hard-fails
if the `custom_domain` pattern is ever the apex), **T-02-52** (ordering recorded and asserted
programmatically against `ci.updatedAt`), **T-02-53** (each refusal body checked individually, not
once after a loop), **T-02-49** (no secret in the transcript or any committed file), **T-02-47**
(`/_actions/*` covered by the Access application, verified by probe), **T-02-54** (`DEPLOY_ENABLED`
set last; no skipped Deploy run exists). **T-02-46 remains open by design** and is 02-10's.
**T-02-48** (Workers Builds disconnected) was confirmed by the developer and is re-confirmed in
02-10. **T-02-50** stays a transfer, but the token is now measured-minimal at four scopes rather
than a template superset.

## Self-Check: PASSED

- `02-DEPLOY-VERIFICATION.md` — FOUND (276 lines), all five required headings present, and both
  sections belonging to 02-10 confirmed **empty** (0 body lines each) rather than merely present
- `02-09-SUMMARY.md` — FOUND (229 lines)
- `.github/workflows/deploy.yml` — FOUND (133 lines), 14/14 structural checks after the edit
- commit `b0b2b3c` — FOUND
- The plan's verify block, extracted verbatim from `02-09-PLAN.md` and run unmodified —
  `PRODUCTION_EDGE_PROBES_OK`, exit 0
- No secret in either committed file: no team domain (2 occurrences, both `<TEAM-REDACTED>`), no
  AUD, no long hex strings, `kid`/`meta`/`CF_AppSession` values redacted
- `b0b2b3c` deletes no tracked file
- Working tree otherwise clean apart from two pre-existing unrelated entries: the modified
  `.planning/config.json` (orchestrator-owned `_auto_chain_active` flag) and the untracked
  `.planning/phases/06.1-…/` directory
