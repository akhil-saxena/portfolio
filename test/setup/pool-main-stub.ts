/**
 * The `main` Worker for the `workers` Vitest project. It is a deliberate no-op, and the
 * reason it has to exist is a genuine incompatibility rather than a preference.
 *
 * ## Why this file exists
 *
 * `vitest.workers.config.ts` points the pool at the shipped `wrangler.jsonc` so it
 * inherits the real bindings (threat T-02-20). That config declares
 *
 *     "main": "@astrojs/cloudflare/entrypoints/server"
 *
 * which is a *bare module specifier* — correct for wrangler, which resolves it through
 * Node module resolution. The pool does not: `maybeGetResolvedMainPath()` in
 * `@cloudflare/vitest-pool-workers/dist/pool/index.mjs` is unconditionally
 *
 *     path.resolve(projectPath, main)
 *
 * so the specifier becomes `<repoRoot>/@astrojs/cloudflare/entrypoints/server`, a path
 * that does not exist. Without an override every test in the project fails at load with
 * `Cannot find module .../@astrojs/cloudflare/entrypoints/server`, before a single
 * assertion runs. Measured, not guessed — that is verbatim the failure this replaced.
 *
 * The same file shows the override is legitimate rather than a workaround: the pool
 * merges wrangler main with `options.main ??= main`, i.e. an explicit pool `main` wins
 * and the wrangler one is only a fallback.
 *
 * ## Why a stub rather than the real Astro Worker
 *
 * The real one could not be loaded here anyway: the `@astrojs/cloudflare` server
 * entrypoint imports the build virtual manifest modules, which only exist inside an
 * `astro build`. More to the point, the `workers` project job is to run assertions
 * *inside* workerd with real bindings — it is not the project that exercises the site
 * HTTP surface. That is the `integration` project, which fetches the genuinely built site
 * from `astro preview` (also real workerd, via `@cloudflare/vite-plugin`).
 *
 * ## Note for plan 02-07
 *
 * `SELF` from `cloudflare:test` therefore reaches THIS module, not the portfolio. Do not
 * assert `/admin`, `/api/*` or `/_actions/*` behaviour against `SELF` in the `workers`
 * project — it would return the 501 below and look like a fail-closed pass for entirely
 * the wrong reason. Auth HTTP-level assertions belong in `*.node.test.ts` against the
 * preview server; the `workers` project is where in-process auth units (JWT verification
 * with a mocked JWKS, for instance) run with real bindings available.
 */
export default {
  fetch(): Response {
    return new Response(
      'pool-main-stub: the workers Vitest project has no user Worker under test. ' +
        'HTTP assertions belong to the integration project, against astro preview.',
      { status: 501, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  },
};
