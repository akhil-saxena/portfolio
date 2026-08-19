# 02-10 — Prove the code gate refuses without the edge layer

**Status:** COMPLETE. Both of `02-DEPLOY-VERIFICATION.md`'s deliberately verified-empty headings are
filled; criteria 2 and 4 are closed.

## What this plan was for

Every unauthenticated probe recorded earlier in this phase was answered by **Cloudflare Access at the
edge, before the Worker ran**. Those probes prove the dashboard is configured. They cannot tell a
correct implementation apart from the legacy one, whose in-code gate fell back to a
**cookie-presence check** whenever its Access configuration was missing. The only way to distinguish
them is to remove the edge layer briefly and observe the Worker alone.

## Result

With the Access application disabled for **one second** (`09:37:41Z` → `09:37:42Z`), all five request
shapes returned **exactly 401** from the Worker's own code:

| Shape | Status | Body |
|---|---:|---:|
| `GET /admin` | 401 | 24 B |
| `GET /api/health` | 401 | 24 B |
| `POST /_actions/ping` | 401 | 24 B |
| `GET /admin` + garbage `Cf-Access-Jwt-Assertion` | 401 | 24 B |
| `GET /admin?debug=1` + garbage header | 401 | 24 B |

Exactly 401, not merely non-2xx: a 403 or 3xx would mean something other than this code answered, a
500 that the path threw rather than denied. Each body checked **individually** for `cookie`,
`cloudflareaccess`, the team domain, the AUD, and `/api/health`'s `"r2"` key. All clean.

Authenticated path, developer-confirmed in a browser (the only source of a real Access JWT):
`/admin` rendered, and `/api/health` returned `{"status":"ok","r2":"reachable"}`.

## What made the evidence trustworthy

The **pre-check**, and it earned its place. The same verify was executed **with Access still
enabled** and correctly refused to record anything:

> Access is still intercepting (got 302) — the window is not open, so a 401 could not be attributed
> to the Worker's code.

So a window that never opened could not be written up as a passing code-gate proof. The first
`access-off` attempt in fact hit exactly this: all three protected prefixes still returned 302 to a
`cloudflareaccess.com` host while `/` returned 200, and nothing was recorded until a poll observed
the redirect actually disappear.

**This is why the plan was split into checkpoint → auto-with-real-verify → checkpoint.** Folding
"log in and confirm" into one checkpoint would have left the phase's most important assertion resting
on a human's report of a status code, with edge redirects recordable as code-layer 401s.

## Deviations

- **Executed by the orchestrator, not a subagent.** The original 02-10 agent had terminated before the
  developer's reply arrived. Respawning one would have spent the open window on agent startup, so the
  plan's `<verify>` block was run verbatim instead — same commands, same assertions, plus the
  per-body disclosure checks from the `<action>`.
- **Task 3 step 5 machine-verified instead of eyeballed.** `wrangler deployments list` shows 7
  deployments across `Unknown (deployment)` ×3, `Secret Change` ×3, `Upload` ×1, and **no Workers
  Builds source anywhere**. Stronger than the human confirmation the plan asked for.

## Findings

1. **A plan premise is false: the apex is not on legacy Pages.** `akhilsaxena.com` has **no DNS
   record at all** — no `A`, no `CNAME`, `curl` cannot resolve it. So it is attached to neither the
   Worker nor legacy Pages. The security-relevant half (not attached to the Worker) holds. Already an
   accepted condition: CLAUDE.md states the live site is down until cutover.
2. **The R2 token scope was a deploy-time requirement, not a runtime one.** `wrangler deploy`
   validates every declared binding on each deploy, which is why adding the scope was necessary. The
   binding needed no dashboard configuration to resolve at request time. This falsified 02-08's guess
   that the scope was *"probably not needed."*
3. **A Bypass policy is not reliably equivalent to disabling the application.** Access evaluates
   policies top-down, so a Bypass added beneath an existing Allow never gets reached. Disabling the
   application is the unambiguous action; the plan's own preference for it is correct and worth
   keeping in any re-run.
