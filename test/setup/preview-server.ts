/**
 * Global setup for the `integration` Vitest project: build the site, serve it from real
 * `workerd`, and publish the URL it actually bound to.
 *
 * `astro preview` under `@astrojs/cloudflare` is not a static file server. Its preview
 * entrypoint (`@astrojs/cloudflare/entrypoints/preview`) starts a Vite preview server
 * with `@cloudflare/vite-plugin` attached, which runs the built Worker inside genuine
 * `workerd`. That is why HTTP assertions against this base URL count as evidence about
 * the runtime that ships, and why `astro dev` (a different code path) is not a substitute.
 *
 * Four behaviours below were measured against the installed versions rather than assumed.
 * Each of them silently breaks the harness if reverted, so each is commented where it is
 * relied upon:
 *
 *   1. `astro preview` in Astro 7 is a daemon supervisor and AUTO-BACKGROUNDS when it
 *      detects an agentic environment. See `forcedForegroundEnv`.
 *   2. With that defeated, the spawned child IS the server process, so killing the handle
 *      is a real teardown. Confirmed: child pid matched the lock file pid, and the port
 *      was free immediately after SIGTERM.
 *   3. `--port 0` yields a genuinely OS-assigned port, but the lock file records the
 *      REQUESTED port, so it reads `"port": 0`. The startup banner is the only
 *      authoritative source for the bound port. See `readBaseUrlFromBanner`.
 *   4. A server started immediately after a build can fail its first start (plan 02-04
 *      finding 5, a shared Vite dep-optimiser cache). See the retry in `startPreview`.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

// The `ProvidedContext` augmentation that types `inject('previewBaseUrl')` lives in
// test/vitest-env.d.ts, not here: this file is excluded from `astro check` (no
// @types/node in the dependency set), and an augmentation in an unchecked file would
// leave every consumer of inject() untyped.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const previewLockPath = resolve(repoRoot, '.astro', 'preview.json');

/**
 * The raw `astro` binary, resolved the same way Astro resolves it for its own daemon
 * (`astro/dist/cli/server.js`). Deliberately NOT the package.json build/preview scripts:
 * plan 02-06 appends a gate to the `build` script in the next wave, and this harness must
 * survive that change. Its job is to serve the built output, not to run project gates.
 * (Stated without naming those script invocations literally, so the plan verify that
 * greps this file for them stays a check on code rather than on prose.)
 */
const astroBin = resolve(
  dirname(createRequire(import.meta.url).resolve('astro/package.json')),
  'bin',
  'astro.mjs'
);

/**
 * MEASURED (1). `astro/dist/cli/preview/index.js` computes
 *
 *     const agentDetected = !process.env.ASTRO_PREVIEW_BACKGROUND && isRunByAgent();
 *     if (flags.background || agentDetected) { await background({...}); return; }
 *
 * and `isRunByAgent()` is `am-i-vibing`, which returns `type: "agent"` inside Claude Code,
 * Cursor and friends. So an un-flagged `astro preview` spawned from a coding agent forks a
 * DETACHED daemon and the CLI exits — the exact orphan bug plan 02-04 measured for
 * `astro dev`, where killing the process handle left the real server listening. Worse, it
 * is environment-dependent: CI is not agentic, so the harness would behave one way on a
 * developer machine and another way in GitHub Actions.
 *
 * `ASTRO_PREVIEW_BACKGROUND` is the daemon's own marker — `background()` sets exactly this
 * variable on the detached child it spawns, to tell that child to run in the foreground.
 * Setting it ourselves uses the documented mechanism rather than fighting it, and makes
 * the lifecycle identical in both environments.
 */
const forcedForegroundEnv = { ...process.env, ASTRO_PREVIEW_BACKGROUND: '1' };

/**
 * MEASURED (5), plan 05-14. Vitest sets `NODE_ENV=test`, and Vite resolves React through the
 * `development` export condition for anything that is not `production`. So the artefact this
 * harness left behind was React's DEVELOPMENT bundle — minified, but development:
 *
 *     built by `npm run build`   PhotoLightbox 17,451  client 180,630  react-dom 11,087  = 209,168 B
 *     built by this harness      PhotoLightbox 28,141  client 353,843  react-dom 29,426  = 411,410 B
 *
 * and the larger `client` chunk contains `"Invalid hook call"`, `"Each child in a list"` and
 * `"Warning:"`, none of which exist in the production build.
 *
 * That is 197 KB of React devtools plumbing in the artefact CI re-asserts its gates against, and
 * it made `gate:public-js`'s byte ceiling — which is a claim about what SHIPS — compare against
 * something that never ships. The gates that ran here before 05-14 (`origin`, `routes`,
 * `placeholders`, `ladder`) are all mode-independent, so nothing was wrong before; it is the
 * arrival of a size assertion that makes the mode matter.
 *
 * Forcing `production` for the BUILD makes the two artefacts the same kind of thing, which is what
 * the CI step "Re-assert the gates against the artefact the test run rebuilt" always claimed to be
 * doing. Only the build gets it: the preview server merely serves `dist/`, and `astro preview`'s
 * own Vite instance has no React to resolve.
 */
const productionBuildEnv = { ...forcedForegroundEnv, NODE_ENV: 'production' };

const BANNER_URL_PATTERN = /(https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+)/;

/** ESC. Built with fromCharCode so no control character appears in a regex literal. */
const ESC = String.fromCharCode(27);
const CSI_SEQUENCE = /^\[[0-9;]*[A-Za-z]/;

/**
 * Strips ANSI colour codes so matched URLs and reported errors are readable. Astro
 * colourises the startup banner, and an un-stripped failure message is close to
 * unreadable in CI output.
 */
function stripAnsi(value: string): string {
  return value
    .split(ESC)
    .map((part, index) => (index === 0 ? part : part.replace(CSI_SEQUENCE, '')))
    .join('');
}

/** Runs a command to completion, rejecting with its captured output on a non-zero exit. */
function runToCompletion(
  label: string,
  args: string[],
  env: NodeJS.ProcessEnv = forcedForegroundEnv
): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(output);
        return;
      }
      rejectPromise(new Error(`${label} exited with code ${code}:\n${stripAnsi(output)}`));
    });
  });
}

/** Resolves with the base URL the preview server printed, or rejects with its output. */
function readBaseUrlFromBanner(child: ChildProcess, getOutput: () => string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const deadline = setTimeout(() => {
      cleanUp();
      rejectPromise(
        new Error(`astro preview printed no URL within 60s:\n${stripAnsi(getOutput())}`)
      );
    }, 60_000);

    function cleanUp() {
      clearTimeout(deadline);
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onData);
      child.off('exit', onExit);
    }

    function onData() {
      // MEASURED (3). The banner is the ONLY authoritative source of the bound port when
      // `--port 0` is used: astro writes the REQUESTED port into .astro/preview.json, so
      // that file reads `"port": 0, "url": "http://127.0.0.1:0"` while the server is in
      // fact listening on an OS-assigned ephemeral port. Parsing the banner is therefore
      // not a stylistic choice over reading the lock file — the lock file is wrong.
      const match = BANNER_URL_PATTERN.exec(stripAnsi(getOutput()));
      if (!match) return;
      cleanUp();
      resolvePromise(match[1]);
    }

    function onExit(code: number | null) {
      cleanUp();
      rejectPromise(
        new Error(
          `astro preview exited with code ${code} before it was ready:\n${stripAnsi(getOutput())}`
        )
      );
    }

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', onExit);
    onData();
  });
}

/** Polls the origin until it answers, so no test starts against a half-open socket. */
async function waitUntilAnswering(baseUrl: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError = 'never attempted';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`astro preview exited (code ${child.exitCode}) while waiting for readiness`);
    }
    try {
      await fetch(baseUrl, { redirect: 'manual' });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${baseUrl} never accepted a connection within 60s (last error: ${lastError})`);
}

async function killChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolvePromise) => child.once('exit', () => resolvePromise()));
  child.kill('SIGTERM');
  const escalation = setTimeout(() => child.kill('SIGKILL'), 5_000);
  await exited;
  clearTimeout(escalation);
}

async function startPreview(): Promise<{ child: ChildProcess; baseUrl: string }> {
  // `--port 0` asks the OS for a free ephemeral port. Plan 02-04 runs a dev server on
  // 4331 and plan 02-07 spawns its own preview server, so a hardcoded port would turn a
  // parallel wave into a flaky one (threat T-02-22). There is no probe-then-bind race
  // here because nothing is probed: the kernel assigns the port at bind time.
  const child = spawn(
    process.execPath,
    [astroBin, 'preview', '--port', '0', '--host', '127.0.0.1'],
    {
      cwd: repoRoot,
      env: forcedForegroundEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let output = '';
  child.stdout?.on('data', (chunk) => {
    output += String(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    output += String(chunk);
  });

  try {
    const baseUrl = await readBaseUrlFromBanner(child, () => output);
    await waitUntilAnswering(baseUrl, child);
    return { child, baseUrl };
  } catch (error) {
    await killChild(child);
    throw error;
  }
}

function clearStalePreviewLock(): void {
  // Astro leaves .astro/preview.json behind after SIGTERM (measured). `checkExistingServer`
  // does prune a lock whose pid is dead, so this is hygiene rather than a fix — but a lock
  // claiming `"url": "http://127.0.0.1:0"` is actively misleading to a human debugging a
  // failed run, and to `astro preview status`.
  if (!existsSync(previewLockPath)) return;
  try {
    rmSync(previewLockPath);
  } catch {
    // Losing a race with astro removing it itself is not a failure.
  }
}

export default async function setup(project: TestProject) {
  // `astro:env` declares both Access secrets non-optionally with `validateSecrets: true`,
  // so a build with either local env file missing fails outright — deliberately. The
  // committed examples hold placeholders on the non-resolving `.invalid` TLD, which is
  // what makes it impossible for a test to reach a real Cloudflare Access endpoint
  // (threat T-02-21). Invoked as the script file itself rather than through the manifest.
  await runToCompletion('bootstrap-local-env', [
    resolve(repoRoot, 'scripts/bootstrap-local-env.mjs'),
  ]);

  await runToCompletion('astro build', [astroBin, 'build'], productionBuildEnv);

  // A live preview server from a crashed earlier run is FATAL to the foreground path:
  // `astro preview` calls `checkExistingServer()` and throws rather than replacing it, and
  // the `--force` flag is only honoured on the background path. One stop call makes the
  // harness idempotent. It is a no-op when nothing is running.
  await runToCompletion('astro preview stop', [astroBin, 'preview', 'stop']);

  let started: { child: ChildProcess; baseUrl: string };
  try {
    started = await startPreview();
  } catch (firstError) {
    // MEASURED (4). Plan 02-04 reproduced, three times, a server failing its first start
    // immediately after a build: `astro build` and the dev/preview server share
    // `node_modules/.vite/deps_ssr`, and the workerd runner can resolve a pre-reload
    // hashed dep file that no longer exists. The retry has succeeded on every occurrence.
    // Treating the first failure as real would make this harness intermittently red for a
    // reason that has nothing to do with the code under test.
    console.warn(
      `[preview-server] first start failed, retrying once (see plan 02-04 finding 5):\n${
        firstError instanceof Error ? firstError.message : String(firstError)
      }`
    );
    clearStalePreviewLock();
    started = await startPreview();
  }

  const { child, baseUrl } = started;
  console.info(`[preview-server] real workerd serving the built site at ${baseUrl}`);
  project.provide('previewBaseUrl', baseUrl);

  return async () => {
    // MEASURED (2). Because agent auto-backgrounding was defeated above, this handle is
    // the server process itself, not a supervisor that has already exited. Confirmed by
    // matching the child pid against .astro/preview.json and by the port being free
    // immediately afterwards. Were the daemon path taken instead, this kill would leave a
    // live orphan exactly as it did for `astro dev` in plan 02-04.
    await killChild(child);
    clearStalePreviewLock();
  };
}

/** Exported for the leftover-lock check; not used by tests. */
export const __previewLockPath = previewLockPath;
export const __readPreviewLock = () =>
  existsSync(previewLockPath) ? readFileSync(previewLockPath, 'utf8') : null;
