import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

// @types/node in the dependency set), and an augmentation in an unchecked file would

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const previewLockPath = resolve(repoRoot, '.astro', 'preview.json');

const astroBin = resolve(
  dirname(createRequire(import.meta.url).resolve('astro/package.json')),
  'bin',
  'astro.mjs'
);

const forcedForegroundEnv = { ...process.env, ASTRO_PREVIEW_BACKGROUND: '1' };

const productionBuildEnv = { ...forcedForegroundEnv, NODE_ENV: 'production' };

const BANNER_URL_PATTERN = /(https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+)/;

const ESC = String.fromCharCode(27);
const CSI_SEQUENCE = /^\[[0-9;]*[A-Za-z]/;

function stripAnsi(value: string): string {
  return value
    .split(ESC)
    .map((part, index) => (index === 0 ? part : part.replace(CSI_SEQUENCE, '')))
    .join('');
}

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
  if (!existsSync(previewLockPath)) return;
  try {
    rmSync(previewLockPath);
  } catch {}
}

export default async function setup(project: TestProject) {
  await runToCompletion('astro build', [astroBin, 'build'], productionBuildEnv);

  await runToCompletion('astro preview stop', [astroBin, 'preview', 'stop']);

  let started: { child: ChildProcess; baseUrl: string };
  try {
    started = await startPreview();
  } catch (firstError) {
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
    await killChild(child);
    clearStalePreviewLock();
  };
}

export const __previewLockPath = previewLockPath;
export const __readPreviewLock = () =>
  existsSync(previewLockPath) ? readFileSync(previewLockPath, 'utf8') : null;
