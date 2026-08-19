/**
 * Cloudflare Access JWT verification. Pure, injectable, and with **no branch that returns
 * `true` without a completed `jwtVerify`** — read that sentence before changing anything
 * here, because it is the entire requirement.
 *
 * ## AUTH-02: there is no permissive path, and there must never be one
 *
 * The legacy Next.js app (`git show legacy/nextjs-portfolio:src/lib/access.ts`) had the
 * right structure — jose, a remote JWKS with a module-level cache, and both the `iss` and
 * `aud` claims checked — and the wrong ending. When `CF_ACCESS_TEAM_DOMAIN` or
 * `CF_ACCESS_AUD` was unset it fell back to checking that a `CF_Authorization` cookie was
 * merely *present*, under a comment conceding "Not a security boundary on its own". The
 * justification was sympathetic and is the reason this comment exists: it was there so
 * that enabling strict mode "can never lock the live admin out before the env vars are
 * configured". Read plainly, that sentence says **missing configuration grants access**.
 *
 * So the rules here are absolute:
 *
 *   1. An absent, empty, or unparseable token is a denial.
 *   2. An empty `teamDomain` or `aud` is a denial — a plain `false`, not a throw the
 *      caller might swallow into a permissive default.
 *   3. Any thrown error — JWKS unreachable, signature mismatch, expired, wrong `iss`,
 *      wrong `aud` — is a denial. A JWKS outage locking the admin out is the correct
 *      trade for a personal CMS (threat T-02-37); permitting the request is not.
 *   4. `true` is returned from exactly one place: immediately after `jwtVerify` resolved.
 *
 * Plan 02-07's Control A mutates rule 3 to return `true` and observes the deny suite go
 * red, so the fail-closed direction of the catch is measured rather than asserted.
 *
 * ## Why this is a separate module from `access.ts`
 *
 * `access.ts` reads `astro:env/server`, a build-time virtual module that does not exist
 * inside the Vitest workers pool. Keeping the verification logic free of that import is
 * what lets it be unit-tested inside real `workerd` with a real keypair — see
 * `test/auth/access-jwt.workerd.test.ts`. The split is a testability requirement, not
 * layering for its own sake.
 *
 * ## Header, not cookie
 *
 * This module never sees a cookie because its caller never reads one. Cloudflare's own
 * guidance, verbatim: *"We recommend validating the `Cf-Access-Jwt-Assertion` header
 * instead of the `CF_Authorization` cookie, since the cookie is not guaranteed to be
 * passed."*
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * One remote JWKS per team domain, alive for the life of the isolate.
 *
 * jose's remote set already owns fetching, in-memory caching and a re-fetch cooldown;
 * this Map is only what stops a brand-new (and therefore empty) set being constructed on
 * every request, which would turn each admin request into a fresh JWKS round trip. A KV
 * cache layer is deliberately NOT added on top: it would put another failure mode inside
 * the auth path in exchange for nothing this project needs (threat T-02-37).
 *
 * `test/auth/access-jwt.workerd.test.ts` asserts one fetch across two verifications, which
 * is the behaviour this Map exists to produce.
 */
const jwksByTeamDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksByTeamDomain.get(teamDomain);
  if (cached !== undefined) return cached;

  const jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
  jwksByTeamDomain.set(teamDomain, jwks);
  return jwks;
}

export interface VerifyAccessJwtInput {
  /** The raw `Cf-Access-Jwt-Assertion` header value, or its absence. */
  token: string | null | undefined;
  /** e.g. `myteam.cloudflareaccess.com` — both the JWKS host and the expected `iss`. */
  teamDomain: string;
  /** The Access application's AUD tag. */
  aud: string;
}

/**
 * Resolves `true` only for a token that `jwtVerify` accepted against the team domain's
 * published keys, with `iss` equal to `https://<teamDomain>` and `aud` equal to `aud`.
 * `exp` is checked implicitly by `jwtVerify`. Resolves `false` in every other case, and
 * never rejects.
 *
 * Note on the prose in this file: the tokens plan 02-07's verify greps for — the remote-set
 * factory, the certs path, and the two claim-option names — appear ONLY in code here, never
 * in a comment. Removing the `aud` option and watching the grep stay green is how that rule
 * was arrived at; a literal in prose turns an assertion into a check on documentation.
 */
export async function verifyAccessJwt({
  token,
  teamDomain,
  aud,
}: VerifyAccessJwtInput): Promise<boolean> {
  // Rules 1 and 2. Deliberately before any URL construction or network call: an empty team
  // domain must not become a schema-only certs URL and go looking for an answer.
  if (!token || !teamDomain || !aud) return false;

  try {
    await jwtVerify(token, getJwks(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
  } catch {
    // Rule 3. The one line Control A inverts.
    return false;
  }

  // Rule 4. The only `true` in this file, and it is unreachable unless the await above
  // completed without throwing.
  return true;
}
