import { type NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Server-side Cloudflare Access check (defense-in-depth).
 *
 * Cloudflare Access is enforced at the edge in front of /admin and every
 * /api/* path except /api/track. This helper adds a second, in-code gate so
 * the write endpoints aren't a single dashboard toggle away from being open.
 *
 * STRICT mode — verifies the signed `Cf-Access-Jwt-Assertion` JWT — activates
 * only when BOTH env vars are set:
 *   - CF_ACCESS_TEAM_DOMAIN  e.g. "myteam.cloudflareaccess.com"
 *   - CF_ACCESS_AUD          the Access application's AUD tag
 * Until then it falls back to a cookie-presence check, so enabling this can
 * never lock the live admin out before the env vars are configured.
 */

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Returns a 401 response if the request is not authenticated, or `null` if it
 * may proceed. Usage: `const denied = await requireAccess(req); if (denied) return denied;`
 */
export async function requireAccess(request: NextRequest): Promise<NextResponse | null> {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;

  if (teamDomain && aud) {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) return unauthorized();
    try {
      await jwtVerify(token, getJwks(teamDomain), {
        issuer: `https://${teamDomain}`,
        audience: aud,
      });
      return null;
    } catch {
      return unauthorized();
    }
  }

  // Fallback: Access already gates these paths at the edge; confirm the session
  // cookie is present. Not a security boundary on its own.
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("CF_Authorization=")) return unauthorized();
  return null;
}
