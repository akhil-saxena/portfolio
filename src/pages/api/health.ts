import type { APIRoute } from 'astro';
import { requireAccess } from '@/lib/access';
import { getPortfolioBucket } from '@/lib/r2';
export const prerender = false;

// ^ Mandatory, and one half of the composed fail-open hazard this phase exists to
// close. Astro prerenders everything under src/pages/api/* BY DEFAULT, and a
// prerendered endpoint is a static JSON snapshot of its build-time output. If that
// snapshot ever lands in the client build, Cloudflare Static Assets serve it before
// the Worker runs, no auth code executes at all, and the stale response still looks
// entirely correct to a smoke test. Plan 02-06 turns this into a permanent build
// gate with a negative control. (FND-02, threat T-02-14)
//
// It is also what makes the auth below possible at all: a prerendered route cannot
// read request headers, so it could never see a Cf-Access-Jwt-Assertion to verify.

/**
 * Authenticated liveness check for the R2 binding.
 *
 * `requireAccess()` runs before anything else, and this is defence in depth rather than
 * the primary guard — `src/middleware.ts` already refuses `/api/*` for every request that
 * fails verification. Both exist because they fail in different directions: the middleware
 * covers routes nobody has written yet, and this call covers the day someone changes the
 * middleware's prefix list. Plan 02-07's Control C removes one and observes the other.
 */
export const GET: APIRoute = async ({ request }) => {
  const denied = await requireAccess(request);
  if (denied) return denied;

  // A real round trip, not a type-level reference — only an actual call proves the
  // binding resolved from cloudflare:workers under real workerd. Deliberately not
  // wrapped in anything; see the header comment in src/lib/r2.ts. Now that the route is
  // authenticated, a 500 from a broken binding is exactly the loud failure FND-03 wants,
  // and it is only ever visible to a caller who already proved who they are. (FND-03)
  await getPortfolioBucket().list({ limit: 1 });

  // One word for R2 and nothing else. Object keys, bucket names and counts are
  // excluded on purpose: even an authenticated response should not become the place
  // bucket contents are enumerated (threat T-02-16). "reachable" is still complete
  // proof, because it is unreachable unless the .list() above resolved.
  return new Response(JSON.stringify({ status: 'ok', r2: 'reachable' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
