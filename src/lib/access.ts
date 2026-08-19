/**
 * `requireAccess(request)` — the single gate every protected surface goes through.
 *
 * Usage, and it is the legacy app's idiom kept deliberately:
 *
 *     const denied = await requireAccess(request);
 *     if (denied) return denied;
 *
 * ## The one thing that must never be added back
 *
 * The legacy `src/lib/access.ts` ended with this, and requirement AUTH-02 exists to
 * delete it:
 *
 *     // Fallback: Access already gates these paths at the edge; confirm the session
 *     // cookie is present. Not a security boundary on its own.
 *     const cookie = request.headers.get("cookie") || "";
 *     if (!cookie.includes("CF_Authorization=")) return unauthorized();
 *     return null;
 *
 * It ran whenever `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` was unset, so **missing
 * configuration granted access** to anyone who could set one header. It was not added
 * carelessly: the file's own comment explains it was there so that enabling strict mode
 * "can never lock the live admin out before the env vars are configured". That is a
 * genuinely sympathetic worry, which is exactly why it is written out here in full —
 * someone acting in good faith, staring at a locked-out admin, will re-invent it. The
 * answer to that worry is `npx wrangler secret put`, not a permissive branch.
 *
 * Three independent layers now make it structurally unnecessary, none of which depends on
 * a reviewer noticing something:
 *
 *   1. `astro.config.mjs` declares both secrets non-optional with `validateSecrets: true`,
 *      so absent configuration is a **build failure** — not a runtime surprise on the
 *      first admin request. This module is the virtual-env importer that makes that
 *      validation run at all — before it existed the schema was configured but dormant,
 *      because Astro only validates when something imports the module.
 *   2. `verifyAccessJwt` denies on an empty team domain or AUD, and has no branch that
 *      returns permission.
 *   3. This file reads the header and nothing else. It cannot degrade, because there is
 *      nothing here to degrade to.
 *
 * Plan 02-07's verify greps this file for cookie handling **with comments stripped**,
 * precisely so the paragraph above can exist. Prose here is free; code is not.
 *
 * ## No runtime absence check
 *
 * Neither secret is checked for emptiness here. `validateSecrets: true` already makes
 * absence a build failure, so a runtime branch would be dead code that a future reader
 * could only make live by making it permissive. The defence-in-depth that IS wanted lives
 * one layer down, in `verifyAccessJwt`, and it denies.
 */
import { CF_ACCESS_AUD, CF_ACCESS_TEAM_DOMAIN } from 'astro:env/server';
import { verifyAccessJwt } from './verify-access-jwt';

/**
 * The refusal, and its body is the whole body.
 *
 * No team domain, no AUD tag, no token echo, no reason string, no "invalid signature"
 * versus "expired" distinction. Everything a 401 says, it says to an attacker: naming the
 * team domain hands over the Access tenant, naming the AUD hands over the application ID,
 * and distinguishing failure modes is an oracle. 401 rather than 403 matches the legacy
 * error-code convention this project keeps — 401 unauthorized, 400 malformed input, 409
 * conflict, 502 upstream, 504 timeout. (threat T-02-36)
 */
function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Returns `null` when the request carries a valid Cloudflare Access JWT, or a `401`
 * `Response` when it does not. Never throws.
 */
export async function requireAccess(request: Request): Promise<Response | null> {
  // The header, never the CF_Authorization cookie — Cloudflare's own recommendation, since
  // the cookie is not guaranteed to be passed. `Headers.get` is case-insensitive, so the
  // canonical casing here is documentation rather than a constraint on the caller.
  const token = request.headers.get('Cf-Access-Jwt-Assertion');

  const verified = await verifyAccessJwt({
    token,
    teamDomain: CF_ACCESS_TEAM_DOMAIN,
    aud: CF_ACCESS_AUD,
  });

  return verified ? null : unauthorized();
}
