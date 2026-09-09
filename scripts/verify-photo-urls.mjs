#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../src/lib/image-origin.ts';

const DEFAULT_MANIFEST = './data/portfolio_images.json';
const DEFAULT_CONCURRENCY = 8;
const ATTEMPTS = 3;

const REQUEST_MODES = Object.freeze({
  liveness: Object.freeze({ name: 'liveness', method: 'HEAD', assertCacheControl: false }),
  cache: Object.freeze({ name: 'cache', method: 'GET', assertCacheControl: true }),
});

for (const mode of Object.values(REQUEST_MODES)) {
  if (mode.assertCacheControl && mode.method !== 'GET') {
    throw new Error(
      `verify-photo-urls: request mode "${mode.name}" asserts on cache-control over ` +
        `${mode.method}. A HEAD against this origin returns no cache-control at all (04-RESEARCH ` +
        `§4, measured); such a mode reports a result it did not measure. Refusing to run.`
    );
  }
}

export class VerifierRefusal extends Error {
  constructor(lines) {
    const all = [].concat(lines);
    super(all.join('\n'));
    this.name = 'VerifierRefusal';
    this.lines = all;
  }
}

export function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new VerifierRefusal(
      `no manifest at ${manifestPath} — there is nothing to check, which is a failure and ` +
        `never a pass.`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new VerifierRefusal(`${manifestPath} is not valid JSON — ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new VerifierRefusal(
      `${manifestPath} is not a top-level array — the manifest shape changed, so the ` +
        `records.length x ${REMOTE_URL_KEYS.length}-keys arithmetic does not apply. Refusing.`
    );
  }
  return parsed;
}

/**
 * Assemble the list of `{ id, key, url }` to request, and apply every floor. Pure: no network, no
 * filesystem, no process exit. The CLI and the unit test both go through this, so the behaviour
 * the test proves is the behaviour the gate has.
 *
 * @param {unknown[]} manifest  the parsed manifest array
 * @param {{ only?: string|null, manifestPath?: string }} options
 * @returns {{ id: string, key: string, url: string }[]}
 */
export function assembleTargets(manifest, options = {}) {
  const { only = null, manifestPath = DEFAULT_MANIFEST } = options;

  if (!Array.isArray(manifest)) {
    throw new VerifierRefusal(`manifest is not an array — refusing to assemble targets.`);
  }

  if (manifest.length === 0) {
    throw new VerifierRefusal(
      `${manifestPath} holds 0 records — a verifier that checked zero URLs and reported PASS is ` +
        `the vacuous gate this file exists to not be. Refusing.`
    );
  }

  let records = manifest;
  if (only !== null) {
    records = manifest.filter((record) => record?.id === only);
    if (records.length === 0) {
      throw new VerifierRefusal(
        `--only "${only}" matched no record in ${manifestPath} (${manifest.length} record(s) ` +
          `present) — a single-record check that silently found nothing to check would let a ` +
          `live-run gate go green over a run that never happened. Refusing.`
      );
    }
  }

  const expected = records.length * REMOTE_URL_KEYS.length;
  const targets = [];
  const findings = [];

  for (const record of records) {
    const id = typeof record?.id === 'string' && record.id ? record.id : '(record with no id)';
    for (const key of REMOTE_URL_KEYS) {
      const value = record?.urls?.[key];
      if (typeof value !== 'string') {
        findings.push(
          `${id}.${key}: missing or not a string — ${JSON.stringify(value) ?? 'absent'}`
        );
        continue;
      }
      let parsed;
      try {
        parsed = new URL(value);
      } catch {
        findings.push(`${id}.${key}: not a parseable URL — ${value}`);
        continue;
      }
      if (parsed.origin !== IMAGE_ORIGIN) {
        findings.push(
          `${id}.${key}: origin is "${parsed.origin}", expected exactly "${IMAGE_ORIGIN}" — ` +
            `not requested — ${value}`
        );
        continue;
      }
      targets.push({ id, key, url: value });
    }
  }

  if (findings.length > 0) {
    throw new VerifierRefusal([
      `${findings.length} target(s) were rejected before any request was made:`,
      ...findings.map((f) => `  x ${f}`),
    ]);
  }

  if (targets.length !== expected) {
    throw new VerifierRefusal(
      `assembled ${targets.length} remote URLs, expected ${expected} ` +
        `(${records.length} record(s) x ${REMOTE_URL_KEYS.length} remote keys: ` +
        `${REMOTE_URL_KEYS.join(', ')}). Refusing to verify a partial set.`
    );
  }
  if (targets.length === 0) {
    throw new VerifierRefusal(
      `assembled 0 remote URLs — nothing to check. This is a failure, never a pass.`
    );
  }

  return targets;
}

/**
 * Parse argv. Unknown flags are a refusal rather than being ignored: a typo'd `--onlyy` that was
 * silently dropped would run the FULL corpus while the caller believed it had scoped the check,
 * or — worse in a pipeline — appear to have checked one record when it checked all of them.
 *
 * @param {string[]} argv  process.argv.slice(2)
 */
export function parseArgv(argv) {
  let manifestArg = null;
  let only = null;
  let mode = REQUEST_MODES.liveness;
  let concurrency = DEFAULT_CONCURRENCY;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cache') {
      mode = REQUEST_MODES.cache;
    } else if (arg === '--only') {
      only = argv[++i] ?? null;
      if (only === null || only.startsWith('--')) {
        throw new VerifierRefusal(`--only requires a photo id.`);
      }
    } else if (arg === '--concurrency') {
      const raw = argv[++i];
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        throw new VerifierRefusal(`--concurrency requires a positive integer, got "${raw}".`);
      }
      concurrency = n;
    } else if (arg.startsWith('--')) {
      throw new VerifierRefusal(
        `unknown flag "${arg}". Known flags: --only <photoId>, --cache, --concurrency <n>.`
      );
    } else if (manifestArg === null) {
      manifestArg = arg;
    } else {
      throw new VerifierRefusal(
        `more than one manifest path given ("${manifestArg}" and "${arg}").`
      );
    }
  }

  return { manifestArg: manifestArg ?? DEFAULT_MANIFEST, only, mode, concurrency };
}

export const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const RETRY_BACKOFF_MS = 250;

export async function checkTarget(target, mode, { backoffMs = RETRY_BACKOFF_MS } = {}) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(target.url, { method: mode.method, redirect: 'follow' });
      if (mode.method === 'GET') await response.arrayBuffer();

      const contentType = response.headers.get('content-type') ?? '(none)';
      if (response.status !== 200) {
        if (RETRYABLE_STATUSES.has(response.status) && attempt < ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
          continue;
        }
        const retried = RETRYABLE_STATUSES.has(response.status)
          ? ` (after ${ATTEMPTS} attempts)`
          : '';
        return `${target.id}.${target.key}: HTTP ${response.status}${retried} — ${target.url}`;
      }
      if (!contentType.toLowerCase().startsWith('image/webp')) {
        return (
          `${target.id}.${target.key}: content-type "${contentType}" is not image/webp — ` +
          `${target.url}`
        );
      }
      if (mode.assertCacheControl) {
        const cacheControl = response.headers.get('cache-control');
        if (!cacheControl) {
          return (
            `${target.id}.${target.key}: no cache-control header on a ${mode.method} — ` +
            `${target.url}`
          );
        }
      }
      return null;
    } catch (error) {
      if (attempt === ATTEMPTS) {
        return `${target.id}.${target.key}: network error — ${error.message} — ${target.url}`;
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }
  /* c8 ignore next */
  return `${target.id}.${target.key}: exhausted ${ATTEMPTS} attempts with no verdict.`;
}

export async function verify(targets, mode, concurrency) {
  const failures = [];
  let checked = 0;

  const queue = [...targets];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    let next = queue.pop();
    while (next) {
      const failure = await checkTarget(next, mode);
      if (failure) failures.push(failure);
      checked++;
      next = queue.pop();
    }
  });

  const started = Date.now();
  await Promise.all(workers);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (checked !== targets.length) {
    console.error(
      `verify-photo-urls: checked ${checked} URLs but assembled ${targets.length} — the loop did ` +
        `not visit every target, so its result means nothing.`
    );
    return 1;
  }

  if (failures.length > 0) {
    console.error(
      `verify-photo-urls: ${failures.length} of ${checked} URL(s) did not satisfy ` +
        `HTTP 200 + content-type image/webp${mode.assertCacheControl ? ' + cache-control' : ''}:`
    );
    for (const failure of failures.sort()) console.error(`  x ${failure}`);
    return 1;
  }

  return { checked, elapsed };
}

async function main() {
  let code = 0;
  try {
    const { manifestArg, only, mode, concurrency } = parseArgv(process.argv.slice(2));
    const manifestPath = path.resolve(process.cwd(), manifestArg);
    const manifest = readManifest(manifestPath);
    const targets = assembleTargets(manifest, { only, manifestPath });

    const recordCount = only === null ? manifest.length : 1;
    const result = await verify(targets, mode, concurrency);
    if (result === 1) return 1;

    console.log(`verify-photo-urls: PASS`);
    console.log(`  manifest:  ${manifestPath}`);
    console.log(
      `  scope:     ${only === null ? `all ${manifest.length} record(s)` : `--only ${only} (1 of ${manifest.length} record(s))`}`
    );
    console.log(
      `  checked:   ${result.checked} remote URL(s) = ${recordCount} record(s) x ` +
        `${REMOTE_URL_KEYS.length} remote key(s), derived from the manifest at run time`
    );
    console.log(`  keys:      ${REMOTE_URL_KEYS.join(', ')}`);
    console.log(`  origin:    ${IMAGE_ORIGIN}  (from src/lib/image-origin.ts)`);
    console.log(
      `  method:    ${mode.method} (${mode.name} mode)${mode.assertCacheControl ? ' — cache-control required' : ''}`
    );
    console.log(
      `  excluded:  urls.thumb — a data:image/webp;base64 LQIP with no hostname, excluded by ` +
        `construction (REMOTE_URL_KEYS does not contain it)`
    );
    console.log(`  every one returned HTTP 200 with content-type image/webp in ${result.elapsed}s`);
  } catch (error) {
    if (error instanceof VerifierRefusal) {
      for (const line of error.lines) console.error(`verify-photo-urls: ${line}`);
      code = 1;
    } else {
      throw error;
    }
  }
  return code;
}

const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exit(await main());
}
