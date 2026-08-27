/**
 * The liveness verifier with its TRANSPORT faked and NOTHING ELSE.
 * (Phase 4, plan 04-09, used by `test/pipeline/partial-failure.node.test.ts`.)
 *
 * THIS FILE IS COPIED TO `scripts/verify-photo-urls.mjs` IN A THROWAWAY `git clone`, after the
 * real file has been moved aside to `scripts/verify-photo-urls.real.mjs`. Its import paths are
 * written for THAT location.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY A SHIM AND NOT A STUB, AND WHAT IS STILL REAL
 *
 * The sandbox's objects live in a fake bucket on local disk; there is nothing at
 * `images.akhilsaxena.com` to fetch. So the network has to be replaced — but only the network.
 * Everything that makes the verifier a GATE is imported from the real module and still runs:
 *
 *   - `parseArgv`, including its refusal of an unknown flag and its DEFAULT MODE;
 *   - `readManifest`, including its refusal of a missing or non-array manifest;
 *   - `assembleTargets`, including all three floors — an empty manifest, `--only` matching no
 *     record (the refusal 04-10's live-run gate depends on), and the derived count check;
 *   - the origin equality check, which rejects a foreign URL before any lookup.
 *
 * What is replaced is one line: instead of `fetch(url, { method: mode.method })`, the object is
 * looked up in the fake bucket's index. A key that was never written answers 404, exactly as the
 * origin would.
 *
 * ---------------------------------------------------------------------------------------------
 * IT RECORDS THE METHOD, AND THAT IS THE POINT
 *
 * `mode` comes from the real module's FROZEN mode table, whose runtime invariant makes that
 * module refuse to load if the table is ever edited into a mode that asserts on `cache-control`
 * over HEAD. This shim writes `mode.method` and `mode.name` into the fake bucket's log, so the
 * test can assert that step 8 probed with HEAD in liveness mode — read out of the real table at
 * run time, rather than by grepping the entrypoint for a string.
 *
 * A GET could be answered from the edge cache and so cannot distinguish "the object exists" from
 * "the object was cached before the upload failed". Step 8 runs immediately after writing to a
 * mutable key, which is the one place in this phase where that difference decides whether a
 * record with no bytes behind it gets committed.
 */

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
