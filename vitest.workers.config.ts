/**
 * The `workers` Vitest project — tests here execute INSIDE real `workerd`.
 *
 * ## API NOTE: `defineWorkersConfig` does not exist in the installed version
 *
 * Plan 02-05 was written against `@cloudflare/vitest-pool-workers` 0.8.x, where the
 * entry point was `defineWorkersConfig` / `defineWorkersProject`, imported from the
 * `@cloudflare/vitest-pool-workers/config` subpath. **Neither the helper nor that
 * subpath exists in the installed 0.21.3**, which is the Vitest 4 line:
 *
 *   - `node_modules/@cloudflare/vitest-pool-workers/package.json` declares exactly three
 *     export subpaths — `.`, `./types` and `./codemods/vitest-v3-to-v4`. There is no
 *     `./config`, so the old import specifier is an unresolvable module, not a
 *     deprecation.
 *   - The only occurrences of the string `defineWorkersProject` anywhere in the package
 *     are inside the shipped codemod that *removes* it.
 *
 * The package ships its own migration, and it is authoritative about the replacement
 * (`dist/codemods/vitest-v3-to-v4.mjs`): rewrite the import to the package root, swap
 * `defineWorkersProject(...)` for `defineConfig(...)` from `vitest/config`, and move the
 * former `test.poolOptions.workers` object verbatim into a `cloudflareTest(...)` call in
 * `plugins`. `test.poolOptions` is then deleted. The pool is a Vite plugin now, not a
 * config wrapper — `declare function cloudflareTest(options: WorkersPoolOptions | ...):
 * Vite.Plugin` in `dist/pool/index.d.mts`.
 *
 * So the shape below IS the plan's `poolOptions.workers.wrangler.configPath`, expressed
 * in the API the installed version actually exposes. Plan 02-07 extends this file and
 * should not go looking for the old helper.
 */
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Overrides the bare-specifier `main` in wrangler.jsonc, which the pool would
      // otherwise path.resolve() into a nonexistent file and fail every test at load.
      // See the long note in test/setup/pool-main-stub.ts — the pool merges with
      // `options.main ??= main`, so an explicit value here wins and the wrangler one is
      // only the fallback. The stub is intentionally not the real Astro Worker.
      main: './test/setup/pool-main-stub.ts',
      wrangler: {
        // Not ad-hoc Miniflare options, deliberately (threat T-02-20). Pointing the pool
        // at the shipped `wrangler.jsonc` is what makes it inherit the real
        // PORTFOLIO_BUCKET R2 binding, the real compatibility_date and the real
        // compatibility_flags. A hand-rolled `miniflare: {...}` block here would be
        // testing a runtime that is not the one that deploys, and the R2 `list()`
        // assertion in test/harness/runtime.workerd.test.ts is what proves the binding
        // actually arrived.
        configPath: './wrangler.jsonc',
      },
    }),
  ],
  test: {
    name: 'workers',
    // Mutually exclusive with the integration project's glob, by contract. A
    // workers-pool test picked up by the Node project fails in a way that reads as an
    // application bug rather than a configuration one, so the two globs may never
    // overlap and every *.test.ts under test/ must match exactly one of them.
    include: ['test/**/*.workerd.test.ts'],
  },
});
