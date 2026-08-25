/**
 * The `unit` Vitest project — plain Node, no build, no runtime, no DOM.
 *
 * It exists because the other two projects both charge a toll that a string function has
 * no business paying:
 *
 *   - `workers` evaluates its files inside real `workerd`. That is the right runtime for
 *     anything touching a binding and the wrong one for a regex, because the pool has to
 *     stand up an isolate per file.
 *   - `integration` runs a full `astro build` plus an `astro preview` spawn in its
 *     `globalSetup` (`hookTimeout: 300_000`). Putting a grammar test there would make
 *     every assertion about `**` wait on a production build.
 *
 * So this project has NO `globalSetup`, NO plugins and NO `environment` override. The
 * absent `environment` is deliberate and not an omission: the default is `node`, and
 * `jsdom` is specifically not wanted here. `src/lib/bullets.ts` is a pure string module;
 * a simulated DOM would add a second thing that could be wrong without adding a single
 * thing that could be proven. Rendering claims belong in plan 03-07, against
 * `renderToStaticMarkup` — the real server path — because this project's register already
 * records that a rendered claim verified in jsdom is not verified.
 *
 * Modules imported here must stay free of Node-only imports even though the runner is
 * Node: `src/lib/bullets.ts` is also imported by the content schema, which executes
 * inside `workerd` during prerender. A green test here says nothing about that, so the
 * plan gates the import surface separately.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    // The third of three mutually exclusive globs. See the contract paragraph in
    // vitest.workers.config.ts: every *.test.ts under test/ must match exactly one.
    include: ['test/**/*.unit.test.ts'],
  },
});
