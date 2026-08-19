import type { APIRoute } from 'astro';
import { getPortfolioBucket } from '@/lib/r2';
export const prerender = false;

// ^ Mandatory, and one half of the composed fail-open hazard this phase exists to
// close. Astro prerenders everything under src/pages/api/* BY DEFAULT, and a
// prerendered endpoint is a static JSON snapshot of its build-time output. If that
// snapshot ever lands in the client build, Cloudflare Static Assets serve it before
// the Worker runs, no auth code executes at all, and the stale response still looks
// entirely correct to a smoke test. Plan 02-06 turns this into a permanent build
// gate with a negative control. (FND-02, threat T-02-14)

/**
 * TODO(02-07): plan 02-07 replaces the unconditional 503 below with `requireAccess()`
 * — a 200 once the signed Cloudflare Access JWT verifies, a 401 when the
 * Cf-Access-Jwt-Assertion header is missing or invalid. Until then this endpoint
 * refuses every caller.
 *
 * The refusal is deliberately 503 and NOT 401. Plan 02-07 must be able to write a
 * genuinely failing test that asserts 401, and a stub already returning 401 would
 * satisfy that test with no auth code behind it. 503 is nonetheless a refusal: there
 * is no point at which this endpoint returns a success status to an unauthenticated
 * caller. (threat T-02-15)
 */
export const GET: APIRoute = async () => {
  // A real round trip, not a type-level reference — only an actual call proves the
  // binding resolved from cloudflare:workers under real workerd. Deliberately not
  // wrapped in anything; see the header comment in src/lib/r2.ts. (FND-03)
  await getPortfolioBucket().list({ limit: 1 });

  // One word for R2 and nothing else. Object keys, bucket names and counts are
  // excluded on purpose: an unauthenticated caller must learn nothing about bucket
  // contents (threat T-02-16). "reachable" is still complete proof, because it is
  // unreachable unless the .list() above resolved.
  return new Response(JSON.stringify({ status: 'auth-unwired', r2: 'reachable' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
};
