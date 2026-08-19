/**
 * The fail-closed guarantee asserted over real HTTP, against the built site served by real
 * `workerd` (`astro preview` runs the build output through `@cloudflare/vite-plugin`).
 *
 * This is the plan's Roadmap Criterion 2 evidence, and it is deliberately NOT in the
 * workers pool project. Plan 02-05 measured why: the pool `path.resolve()`s wrangler's
 * bare-specifier `main`, so the pool is pointed at a no-op stub instead of the Astro
 * Worker, and `SELF` from `cloudflare:test` therefore reaches that stub — which answers
 * **501** to everything. A `/admin` assertion against `SELF` would look like a fail-closed
 * pass for entirely the wrong reason. HTTP auth assertions belong here, on the other end of
 * a real socket, where the thing answering is the site.
 *
 * Everything below asserts `401` exactly, never `>= 400` and never "not 200". Plan 02-04
 * left all three surfaces answering **503** on purpose so these assertions start genuinely
 * red; a `>= 400` assertion would have been green before a line of auth code existed.
 *
 * No `node:*` import appears in this file, on purpose. `@types/node` is absent from the
 * dependency set (plan 02-05 finding 4) and `astro check` gates `npm run build`, so a
 * `node:fs` import here would break the build for everyone. `fetch` is a global in Node 22.
 */
import { describe, expect, inject, it } from 'vitest';

const previewBaseUrl = inject('previewBaseUrl');

/**
 * The committed placeholder values from `.env.example` / `.dev.vars.example`, which
 * `npm run bootstrap:local` seeds into the gitignored local files the preview server reads.
 * They are here so the disclosure assertions have something concrete to look for: if a 401
 * body ever contains either of these, the refusal is echoing the Access configuration back
 * to an unauthenticated caller.
 */
const PLACEHOLDER_TEAM_DOMAIN = 'placeholder.cloudflareaccess.invalid';
const PLACEHOLDER_AUD = '0'.repeat(64);

const GARBAGE_JWT = 'garbage.not-a-real-jwt.at-all';

/** Every protected surface, in the shape each is actually reached. */
const protectedRequests = {
  admin: () => fetch(`${previewBaseUrl}/admin`, { redirect: 'manual' }),
  adminWithQuery: () => fetch(`${previewBaseUrl}/admin?debug=1`, { redirect: 'manual' }),
  health: () => fetch(`${previewBaseUrl}/api/health`, { redirect: 'manual' }),
  ping: () =>
    fetch(`${previewBaseUrl}/_actions/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      redirect: 'manual',
    }),
};

function withGarbageToken(init: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      'Cf-Access-Jwt-Assertion': GARBAGE_JWT,
    },
  };
}

const garbageRequests = {
  admin: () => fetch(`${previewBaseUrl}/admin`, withGarbageToken({ redirect: 'manual' })),
  adminWithQuery: () =>
    fetch(`${previewBaseUrl}/admin?debug=1`, withGarbageToken({ redirect: 'manual' })),
  health: () => fetch(`${previewBaseUrl}/api/health`, withGarbageToken({ redirect: 'manual' })),
  ping: () =>
    fetch(
      `${previewBaseUrl}/_actions/ping`,
      withGarbageToken({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    ),
};

describe('an unauthenticated request to a protected prefix is refused with 401', () => {
  it('refuses GET /admin', async () => {
    const response = await protectedRequests.admin();
    expect(response.status).toBe(401);
  });

  it('refuses GET /api/health', async () => {
    const response = await protectedRequests.health();
    expect(response.status).toBe(401);
  });

  // AUTH-01 names /_actions/* explicitly because it is the prefix most easily forgotten:
  // no page declares it, Astro injects /_actions/[...path] itself. Plan 02-04 additionally
  // measured that Astro's security.checkOrigin does NOT cover it for JSON POSTs, so the
  // Access JWT check carries this prefix alone. (threat_flag: csrf-not-covered)
  it('refuses POST /_actions/ping', async () => {
    const response = await protectedRequests.ping();
    expect(response.status).toBe(401);
  });
});

describe('a request carrying a garbage Access token is refused with 401', () => {
  it('refuses GET /admin with a garbage Cf-Access-Jwt-Assertion header', async () => {
    const response = await garbageRequests.admin();
    expect(response.status).toBe(401);
  });

  it('refuses GET /api/health with a garbage Cf-Access-Jwt-Assertion header', async () => {
    const response = await garbageRequests.health();
    expect(response.status).toBe(401);
  });

  it('refuses POST /_actions/ping with a garbage Cf-Access-Jwt-Assertion header', async () => {
    const response = await garbageRequests.ping();
    expect(response.status).toBe(401);
  });

  // Doubles as evidence that /admin is genuinely on-demand rather than prerendered. Under
  // output: 'static' Astro strips the query string AND discards request headers for a
  // prerendered route (astro/dist/core/request.js — `if (isPrerendered) url.search = ""`),
  // so a prerendered /admin could not have seen either the `debug=1` or the header. (FND-02)
  it('refuses GET /admin?debug=1 with a garbage header', async () => {
    const response = await garbageRequests.adminWithQuery();
    expect(response.status).toBe(401);
  });
});

describe('the middleware did not run at build time', () => {
  // The build-time trap, caught behaviourally. Astro middleware runs during `astro build`
  // for every prerendered page, so a guard not gated on `context.isPrerendered` would have
  // denied the public site AT BUILD TIME — this page would be a 401 body baked into static
  // HTML, or the build would have failed outright. `stack-proof-ok` comes from a React 19
  // component rendered with no client directive, so finding it proves the page was built
  // and served intact. (threat T-02-35)
  it('serves GET / with 200 and the static build marker', async () => {
    const response = await fetch(`${previewBaseUrl}/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('stack-proof-ok');
  });
});

describe('a 401 discloses nothing about the Access configuration', () => {
  // Anything the refusal says, it says to an attacker. A 401 that names the team domain
  // hands over the Access tenant; one that names the AUD hands over the application ID; one
  // that mentions the cookie advertises the legacy fallback as something to go looking for.
  // (threat T-02-36)
  it('leaks neither the team domain, the AUD, nor any mention of a cookie', async () => {
    const responses = await Promise.all([
      protectedRequests.admin(),
      protectedRequests.health(),
      protectedRequests.ping(),
      garbageRequests.admin(),
      garbageRequests.adminWithQuery(),
      garbageRequests.health(),
      garbageRequests.ping(),
    ]);

    const bodies: string[] = [];
    for (const response of responses) {
      expect(response.status).toBe(401);
      bodies.push(await response.text());
    }

    // Guards the assertion itself: an empty body would satisfy every `not.toContain` below
    // while proving nothing at all about what a real refusal says.
    expect(bodies.some((body) => body.length > 0)).toBe(true);

    for (const body of bodies) {
      expect(body).not.toContain(PLACEHOLDER_TEAM_DOMAIN);
      expect(body).not.toContain(PLACEHOLDER_AUD);
      expect(body).not.toContain('cloudflareaccess');
      expect(body.toLowerCase()).not.toContain('cookie');
    }
  });
});
