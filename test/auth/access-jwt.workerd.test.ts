/**
 * `verifyAccessJwt` exercised INSIDE real `workerd`, against a real RS256 keypair minted
 * in this file and a JWKS endpoint that is intercepted rather than reached.
 *
 * ## The most important test in this file is the POSITIVE one
 *
 * Every other case here asserts a denial. A suite of nothing but denials is fully
 * satisfied by an implementation that returns `false` unconditionally — which would ship
 * an admin nobody can enter, with a green test run vouching for it. `it('verifies a
 * correctly signed, correctly audienced token')` is what makes the other eleven
 * discriminating, and plan 02-07's Control B proves that by forcing `verifyAccessJwt` to
 * always deny and observing that exactly this case goes red.
 *
 * ## Why the JWKS interception is hand-rolled instead of `fetchMock` from `cloudflare:test`
 *
 * The plan specifies `fetchMock`. **It does not exist in the installed
 * `@cloudflare/vitest-pool-workers@0.21.3`** — this was measured, not assumed:
 *
 *   - `grep -rn fetchMock node_modules/@cloudflare/vitest-pool-workers/` returns nothing
 *     at all: not in `dist/`, not in `types/cloudflare-test.d.ts`, not in the sourcemaps.
 *   - The module's runtime export list (`dist/worker/lib/cloudflare/test-internal.mjs`,
 *     final line) names 30 exports and `fetchMock` is not among them.
 *   - The undici `MockAgent` / `MockInterceptor` *types* are still declared in
 *     `types/cloudflare-test.d.ts`, but nothing exports a value of that type — they are
 *     orphaned declarations left behind by the removal.
 *   - What replaced it is visible in `src/worker/fetch-mock.ts` (via the sourcemap): the
 *     pool now monkeypatches `globalThis.fetch` with a pass-through wrapper whose comment
 *     reads *"This looks like a no-op, but it's not. It allows MSW to intercept fetch
 *     calls using its Fetch interceptor."* So interception is now expected to happen at
 *     the global-`fetch` layer, and `msw` is not in this project's dependency set.
 *
 * This is the same class of finding as plan 02-05's `defineWorkersConfig`: the pool's API
 * moved under the plan. Installing `msw` is not an option — plan 02-06 owns `package.json`
 * this wave, and a package install is explicitly excluded from auto-fix. So `fetchMock`
 * below is a local object with the same job, installed over the very global the pool
 * monkeypatches for exactly this purpose. It is deliberately named `fetchMock` so the
 * plan's `grep` matches a real interceptor rather than a comment about one.
 *
 * It is strictly *stronger* than the removed helper in one respect: an un-intercepted
 * request does not fall through to the network, it throws and is recorded, and
 * `fetchMock.assertNoEscapedRequests()` fails the suite if any occurred. Combined with the
 * `.invalid` TLD (RFC 2606, can never resolve) that is two independent reasons no test
 * here can reach a real Cloudflare Access endpoint. (threat T-02-38)
 *
 * ## Why every case gets its own team domain
 *
 * `verifyAccessJwt` memoises its `createRemoteJWKSet` in a module-level `Map` keyed by team
 * domain — that Map is production code and is shared across every test in this file. Two
 * cases sharing a domain therefore share cached JWKS state, and the cache test ("fetched
 * exactly once") would be measuring whatever an earlier test left behind, passing or
 * failing on file order. A distinct `tN.cloudflareaccess.invalid` per case makes each one
 * independent WITHOUT exporting a cache-reset hook from production code — a reset hook
 * would be a way to clear the auth cache that did not previously exist, and this file is
 * not worth adding one for.
 */
import {
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTPayload,
  SignJWT,
} from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { verifyAccessJwt } from '../../src/lib/verify-access-jwt';

/** The AUD tag every case uses unless it is deliberately testing an `aud` mismatch. */
const AUD = 'a'.repeat(64);

/** Cloudflare Access publishes its signing keys here, and jose is pointed at it by URL. */
const jwksUrl = (teamDomain: string) => `https://${teamDomain}/cdn-cgi/access/certs`;

// ---------------------------------------------------------------------------------------
// fetchMock — the JWKS interceptor. See the header comment for why it is not the pool's.
// ---------------------------------------------------------------------------------------

interface JwksRoute {
  status: number;
  body: string;
}

const routes = new Map<string, JwksRoute>();
const requestCounts = new Map<string, number>();
const escaped: string[] = [];

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

const interceptingFetch: typeof globalThis.fetch = async (input) => {
  const url = urlOf(input);
  requestCounts.set(url, (requestCounts.get(url) ?? 0) + 1);

  const route = routes.get(url);
  if (route === undefined) {
    // Not a silent pass-through. An un-intercepted request is a defect in the test, and
    // letting it hit the network would make the result depend on a DNS failure — a slow,
    // ambiguous reason to deny that would look identical to a real denial.
    escaped.push(url);
    throw new Error(`fetchMock: blocked an un-intercepted request to ${url}`);
  }

  return new Response(route.body, {
    status: route.status,
    headers: { 'content-type': 'application/jwk-set+json' },
  });
};

const fetchMock = {
  /** Serve `jwks` at the given team domain's `/cdn-cgi/access/certs`. */
  publishJwks(teamDomain: string, keys: JWK[]): void {
    routes.set(jwksUrl(teamDomain), { status: 200, body: JSON.stringify({ keys }) });
  },
  /** Serve a failure at the given team domain, to exercise the JWKS-unavailable path. */
  publishFailure(teamDomain: string, status: number): void {
    routes.set(jwksUrl(teamDomain), { status, body: '{"error":"nope"}' });
  },
  /** How many times the JWKS endpoint for this team domain was requested. */
  jwksRequestCount(teamDomain: string): number {
    return requestCounts.get(jwksUrl(teamDomain)) ?? 0;
  },
  /** Every request this mock saw, across all origins. */
  totalRequestCount(): number {
    let total = 0;
    for (const count of requestCounts.values()) total += count;
    return total;
  },
  assertNoEscapedRequests(): void {
    expect(escaped).toStrictEqual([]);
  },
};

// ---------------------------------------------------------------------------------------
// Key material. One trusted keypair, plus a rogue one for the wrong-signature case.
// ---------------------------------------------------------------------------------------

const KID = 'test-signing-key';

let trustedPrivateKey: CryptoKey;
let roguePrivateKey: CryptoKey;
let trustedJwks: JWK[];

/**
 * Mints a token the way Cloudflare Access does: RS256, a `kid` in the header, `iss` set to
 * the team domain's origin, `aud` set to the Access application's AUD tag.
 */
async function mintToken(options: {
  key?: CryptoKey;
  issuer: string;
  audience?: string;
  expiresIn?: string | number;
  claims?: JWTPayload;
}): Promise<string> {
  return new SignJWT({ email: 'akhil@example.invalid', ...options.claims })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuedAt()
    .setIssuer(options.issuer)
    .setAudience(options.audience ?? AUD)
    .setExpirationTime(options.expiresIn ?? '1h')
    .sign(options.key ?? trustedPrivateKey);
}

let originalFetch: typeof globalThis.fetch;

beforeAll(async () => {
  // `extractable: true` so the public half can be exported as a JWK and published through
  // the mock. The private half never leaves this isolate.
  const trusted = await generateKeyPair('RS256', { extractable: true });
  const rogue = await generateKeyPair('RS256', { extractable: true });
  trustedPrivateKey = trusted.privateKey;
  roguePrivateKey = rogue.privateKey;

  const publicJwk = await exportJWK(trusted.publicKey);
  trustedJwks = [{ ...publicJwk, alg: 'RS256', use: 'sig', kid: KID }];

  originalFetch = globalThis.fetch;
  globalThis.fetch = interceptingFetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('verifyAccessJwt authorises a genuine Cloudflare Access token', () => {
  // THE DISCRIMINATING CASE. Without it, Control B's always-deny implementation would pass
  // every other test in this file.
  it('verifies a correctly signed, correctly audienced, unexpired token', async () => {
    const teamDomain = 't1.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    const token = await mintToken({ issuer: `https://${teamDomain}` });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(true);
    expect(fetchMock.jwksRequestCount(teamDomain)).toBe(1);
  });
});

describe('verifyAccessJwt denies an absent or malformed token', () => {
  it('denies a null token without touching the JWKS endpoint', async () => {
    const teamDomain = 't2.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    await expect(verifyAccessJwt({ token: null, teamDomain, aud: AUD })).resolves.toBe(false);

    // The absence of the fetch is the assertion that matters: a null token must be refused
    // by inspection, not by an outbound request that could fail open on a timeout.
    expect(fetchMock.jwksRequestCount(teamDomain)).toBe(0);
  });

  it('denies an empty-string token', async () => {
    const teamDomain = 't3.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    await expect(verifyAccessJwt({ token: '', teamDomain, aud: AUD })).resolves.toBe(false);
    expect(fetchMock.jwksRequestCount(teamDomain)).toBe(0);
  });

  it('denies a syntactically invalid token', async () => {
    const teamDomain = 't4.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    await expect(verifyAccessJwt({ token: 'not-a-jwt', teamDomain, aud: AUD })).resolves.toBe(
      false
    );
  });
});

describe('verifyAccessJwt denies a token that fails cryptographic or claim verification', () => {
  it('denies a well-formed token signed by a different keypair', async () => {
    const teamDomain = 't5.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    // Deliberately the SAME `kid` as the published key. A different `kid` would be refused
    // at key lookup, which proves far less: this way the JWKS is found, the right key is
    // selected, and the RS256 signature check itself is what rejects the token.
    const token = await mintToken({ key: roguePrivateKey, issuer: `https://${teamDomain}` });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(false);
  });

  it('denies a validly signed token carrying a different aud', async () => {
    const teamDomain = 't6.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    const token = await mintToken({ issuer: `https://${teamDomain}`, audience: 'b'.repeat(64) });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(false);
  });

  it('denies a validly signed token issued by a different team domain', async () => {
    const teamDomain = 't7.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    const token = await mintToken({ issuer: 'https://t7other.cloudflareaccess.invalid' });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(false);
  });

  it('denies an expired token', async () => {
    const teamDomain = 't8.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    // Signed correctly, issued in the past, expired in the past. jose checks `exp`
    // implicitly inside jwtVerify with zero clock tolerance by default.
    const token = await mintToken({
      issuer: `https://${teamDomain}`,
      expiresIn: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(false);
  });
});

describe('verifyAccessJwt denies when the Access configuration is empty (AUTH-02)', () => {
  // The runtime half of AUTH-02. The structural half is astro:env's validateSecrets, which
  // makes an absent secret a BUILD failure. This is what happens if a secret is somehow
  // present-but-empty at runtime: a plain deny, never a throw the caller might swallow and
  // never the legacy cookie-presence fallback.
  it('denies an otherwise valid token when teamDomain is empty', async () => {
    const teamDomain = 't9.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);
    const token = await mintToken({ issuer: `https://${teamDomain}` });

    const before = fetchMock.totalRequestCount();
    await expect(verifyAccessJwt({ token, teamDomain: '', aud: AUD })).resolves.toBe(false);

    // No outbound request at all — an empty team domain must not even be turned into a URL.
    expect(fetchMock.totalRequestCount()).toBe(before);
  });

  it('denies an otherwise valid token when aud is empty', async () => {
    const teamDomain = 't10.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);
    const token = await mintToken({ issuer: `https://${teamDomain}` });

    const before = fetchMock.totalRequestCount();
    await expect(verifyAccessJwt({ token, teamDomain, aud: '' })).resolves.toBe(false);
    expect(fetchMock.totalRequestCount()).toBe(before);
  });
});

describe('verifyAccessJwt reuses the JWKS across requests and fails closed on JWKS failure', () => {
  it('fetches the JWKS endpoint exactly once for two successive verifications', async () => {
    // A domain used by NO other case in this file, so the count below is this test's own.
    const teamDomain = 't11.cloudflareaccess.invalid';
    fetchMock.publishJwks(teamDomain, trustedJwks);

    const token = await mintToken({ issuer: `https://${teamDomain}` });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(true);
    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(true);

    // Without the module-level Map a fresh createRemoteJWKSet would be built per call and
    // this would be 2. That Map is the whole reason the auth path does not re-fetch keys on
    // every admin request inside a warm isolate.
    expect(fetchMock.jwksRequestCount(teamDomain)).toBe(1);
  });

  it('denies when the JWKS endpoint fails, rather than permitting the request', async () => {
    // The Control A regression in test form: a developer sees JWKS fetch failures and
    // "fixes" them by allowing the request through. The correct direction is a denial, and
    // a JWKS outage locking the admin out is the right trade for a personal CMS (T-02-37).
    const teamDomain = 't12.cloudflareaccess.invalid';
    fetchMock.publishFailure(teamDomain, 500);

    const token = await mintToken({ issuer: `https://${teamDomain}` });

    await expect(verifyAccessJwt({ token, teamDomain, aud: AUD })).resolves.toBe(false);
  });
});

describe('the suite reached no real network', () => {
  it('made no request the interceptor did not serve', () => {
    fetchMock.assertNoEscapedRequests();
  });
});
