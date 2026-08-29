/**
 * The six-class audit's Playwright configuration. Plan 05-15, task 1.
 *
 * ================================================================================================
 * THIS AUDIT RUNS LOCALLY AND NOT IN CI, AND THAT IS A DECISION WITH A REASON
 * ================================================================================================
 *
 * A browser measurement is deterministic PER MACHINE, not per platform. libvips encodes
 * differently on darwin/arm64 than on ubuntu/x64, and the same class of divergence applies to
 * font rasterisation and to sub-pixel layout — the two things this file measures. A cross-platform
 * pixel assertion is a flake generator, and a flaky gate is worse than no gate because it teaches
 * a team to re-run rather than to read.
 *
 * It also avoids a ~130 MB browser download on every push, for a measurement that changes only
 * when the layout does.
 *
 * **Phase 8 owns the decision** about whether any of this becomes a CI gate under QUAL-01 and
 * QUAL-04. The hand-off is written out in `.planning/phases/05-public-site/05-AUDIT.md`.
 *
 * ================================================================================================
 * `workers: 1` AND `fullyParallel: false` ARE MEASUREMENT DECISIONS, NOT PERFORMANCE ONES
 * ================================================================================================
 *
 * Six Chromium contexts competing for one machine's CPU move layout and paint timing, and this
 * suite measures a scroll position at first paint — a quantity that is intermittent under
 * `prefers-reduced-motion: no-preference` (see the `loadY` finding in `05-AUDIT.md`). Parallelism
 * would turn a real 12.5% intermittency into an unattributable flake.
 *
 * `retries: 0` for the same reason. A retry on a measurement harness converts "this was wrong
 * once" into "this passed", which is precisely the reporting failure T-05-15-01 names.
 */

import { defineConfig, devices } from '@playwright/test';

/** The origin the audit walks. Overridable so the same spec can be pointed at a preview deploy. */
const PORT = Number(process.env.AUDIT_PORT ?? 4399);

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Every public capture is `-dark-` and the public site's default is dark
    // (`00-RESPONSIVE-CONTRACT.md` §9, and §2's per-class table). Setting the OS preference here
    // rather than clicking the toggle measures the DEFAULT a first-time visitor gets.
    colorScheme: 'dark',
    // A trace on a 90-test measurement run is tens of megabytes of scratch for a suite whose
    // output is a document. Failures print their measured numbers in the assertion message.
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },

  projects: [
    {
      name: 'normal',
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'no-preference' } },
    },
    {
      // §12.2 / PUB-13. The whole audit runs twice; the departure must succeed in both, which is
      // the proof that snap is an enhancement rather than the mechanism.
      // MEASURED: `reducedMotion` is a `browser.newContext` option and is NOT a top-level
      // Playwright TEST option in 1.62 — `use: { reducedMotion: … }` type-errors with
      // "'reducedMotion' does not exist in type 'UseOptions<…>'", and `astro check` runs over
      // `test/**`, so it would break `npm run build`. It goes through `contextOptions`.
      name: 'reduce',
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
  ],

  webServer: {
    // `AUDIT_ROOT` exists for ONE purpose: pointing the harness at a document that carries none
    // of its subjects, to prove the audit fails loudly rather than passing on nothing (the second
    // half of T-05-15-01). It defaults to the real artefact; see the vacuity walk-through in
    // `05-AUDIT.md` for the run and its output.
    command: `node ${new URL('serve-dist.mjs', import.meta.url).pathname} ${process.env.AUDIT_ROOT ?? 'dist/client'}`,
    // `webServer.cwd` defaults to the CONFIG's directory, so a bare `dist/client` would resolve
    // to `test/audit/dist/client`, which does not exist — and `serve-dist.mjs` would exit 1
    // naming it rather than serving an empty root.
    cwd: new URL('../../', import.meta.url).pathname,
    url: `http://127.0.0.1:${PORT}/`,
    // Never reuse: a server left running from an earlier build would serve the PREVIOUS artefact
    // and the audit would report yesterday's measurements as today's.
    reuseExistingServer: false,
    stdout: 'pipe',
    timeout: 20_000,
  },
});
