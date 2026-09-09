import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { IMAGE_ORIGIN } from '../src/lib/image-origin.ts';
import {
  assembleTargets,
  parseArgv,
  readManifest,
  VerifierRefusal,
} from './verify-photo-urls.real.mjs';

const STATE_PATH = process.env.FAKE_R2_STATE;
if (typeof STATE_PATH !== 'string' || STATE_PATH.length === 0) {
  process.stderr.write('verifier-shim: FAKE_R2_STATE is not set — refusing.\n');
  process.exit(1);
}

const record = (entry) => {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  state.log.push(entry);
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
  return state;
};

function main() {
  const argv = process.argv.slice(2);
  let parsed;
  try {
    parsed = parseArgv(argv);
  } catch (error) {
    record({ op: 'verify-refused', argv, why: String(error.message).slice(0, 200) });
    process.stderr.write(`verify-photo-urls: ${error.message}\n`);
    return 1;
  }

  const { manifestArg, only, mode, concurrency } = parsed;
  const manifestPath = path.resolve(process.cwd(), manifestArg);

  let targets;
  try {
    targets = assembleTargets(readManifest(manifestPath), { only, manifestPath });
  } catch (error) {
    if (!(error instanceof VerifierRefusal)) throw error;
    record({ op: 'verify-refused', argv, why: String(error.message).slice(0, 200) });
    for (const line of error.lines) process.stderr.write(`verify-photo-urls: ${line}\n`);
    return 1;
  }

  const state = record({
    op: 'verify',
    argv,
    only,
    method: mode.method,
    modeName: mode.name,
    assertCacheControl: mode.assertCacheControl,
    concurrency,
    targets: targets.length,
  });

  const failures = [];
  for (const target of targets) {
    const key = target.url.slice(`${IMAGE_ORIGIN}/`.length);
    const object = state.objects[key];
    if (object === undefined) {
      failures.push(`${target.id}.${target.key}: HTTP 404 — ${target.url}`);
    } else if (!String(object.contentType ?? '').startsWith('image/webp')) {
      failures.push(
        `${target.id}.${target.key}: content-type "${object.contentType}" is not image/webp — ` +
          `${target.url}`
      );
    }
  }

  if (failures.length > 0) {
    process.stderr.write(
      `verify-photo-urls: ${failures.length} of ${targets.length} URL(s) did not satisfy ` +
        `HTTP 200 + content-type image/webp:\n`
    );
    for (const failure of failures.sort()) process.stderr.write(`  x ${failure}\n`);
    return 1;
  }

  process.stdout.write(
    `verify-photo-urls: PASS (fake bucket)\n` +
      `  scope:   ${only === null ? 'all records' : `--only ${only}`}\n` +
      `  checked: ${targets.length} remote URL(s)\n` +
      `  method:  ${mode.method} (${mode.name} mode, from the real frozen mode table)\n`
  );
  return 0;
}

process.exit(main());
