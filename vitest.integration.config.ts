/**
 * The `integration` Vitest project — an HTTP client, running in plain Node.
 *
 * It is deliberately NOT a workers-pool project. Its job is to talk to the built site
 * over the wire while that site is served by real `workerd` (`astro preview` runs the
 * build output through `@cloudflare/vite-plugin`, so the runtime under test is genuine
 * even though the test process itself is Node). Making this a pool project instead would
 * put the assertions inside the same isolate as the thing being asserted about, which is
 * exactly the class of self-confirming evidence this phase exists to avoid.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['test/**/*.node.test.ts'],

    // Builds the site and spawns `astro preview` on real workerd, then publishes the
    // base URL it actually bound to. Tests read it via `inject('previewBaseUrl')`.
    globalSetup: ['./test/setup/preview-server.ts'],

    // A production build plus a server start is minutes of work in the worst case, and
    // the default 60s applies to the whole globalSetup. Raising it here rather than
    // per-test keeps the failure mode honest: a timeout means the harness could not come
    // up, not that an assertion was slow.
    testTimeout: 30_000,
    hookTimeout: 300_000,
  },
});
