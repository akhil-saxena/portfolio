/**
 * A FAKE R2, substituted for `scripts/lib/r2.mjs` inside a sandbox clone.
 * (Phase 4, plan 04-09, used by `test/pipeline/partial-failure.node.test.ts`.)
 *
 * THIS FILE IS COPIED TO `scripts/lib/r2.mjs` IN A THROWAWAY `git clone` AND RUN FROM THERE.
 * Its import paths and its position in the module graph are written for THAT location, not for
 * `test/pipeline/fixtures/`. It is never imported from where it lives.
 *
 * It is a drop-in for the real module's three operations, plus:
 *
 *   - a persistent LOG of every operation, so a test can assert what the job actually did rather
 *     than infer it from the state it left behind. "The manifest did not change" is a claim about
 *     convergence; "zero puts were recorded" is a claim about work.
 *   - INJECTION points, so a failure can be placed at a chosen boundary. Every injected throw
 *     writes an `inject` entry to the log BEFORE throwing, which is what lets each negative case
 *     assert that its defect actually fired rather than passing because the job failed early for
 *     an unrelated reason.
 *
 * It fails closed on its own single required variable, for the same reason the real module does:
 * a fake that silently ran against an unset directory would write its log nowhere and every
 * assertion built on that log would be vacuous.
 *
 * WHAT IT DELIBERATELY DOES NOT FAKE: the key grammar. `assertStagingKey` and `parsePublishedKey`
 * are the real ones, imported from the real contract module, so a test cannot accidentally prove
 * the job works with keys the real module would refuse.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { assertStagingKey, parsePublishedKey } from '../../src/lib/photo-pipeline.ts';

export const REQUIRED_ENV = Object.freeze(['FAKE_R2_STATE']);

const STATE_PATH = process.env.FAKE_R2_STATE;
if (typeof STATE_PATH !== 'string' || STATE_PATH.length === 0) {
  throw new Error(
    'fake-r2: FAKE_R2_STATE is not set. The fake bucket has nowhere to record what happened, so ' +
      'every assertion about its log would be vacuous. Refusing.'
  );
}

const read = () => JSON.parse(readFileSync(STATE_PATH, 'utf8'));
const write = (state) => writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);

const append = (entry) => {
  const state = read();
  state.log.push(entry);
  write(state);
  return state;
};

/** Mirrors the real module's error shape closely enough that the entrypoint cannot tell. */
export class R2Error extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'R2Error';
    this.key = detail.key;
    this.code = detail.code ?? 1;
    this.notFound = detail.notFound === true;
  }
}

function injected(at) {
  append({ op: 'inject', at });
  throw new R2Error(`fake-r2: INJECTED FAILURE at ${at}`, { key: at, code: 99 });
}

export async function getStagedObject(key) {
  assertStagingKey(key);
  const state = append({ op: 'get', key });

  if (state.injection.throwAt === 'get') injected('get');
  if (state.injection.stagedAbsent === true || state.staged.key !== key) {
    append({ op: 'get-miss', key });
    return null;
  }

  const bytes = new Uint8Array(readFileSync(state.staged.file));
  return { bytes, size: bytes.length };
}

export async function putVariant(descriptor) {
  const { key, bytes, contentType, cacheControl } = descriptor ?? {};
  // The REAL guard, not a fake one: only a key `publishedKey()` could have produced is writable.
  parsePublishedKey(key);

  const state = read();
  const putsSoFar = state.log.filter((entry) => entry.op === 'put').length;
  if (
    typeof state.injection.putFailAfter === 'number' &&
    putsSoFar >= state.injection.putFailAfter
  ) {
    injected(`put#${putsSoFar + 1}`);
  }

  state.log.push({ op: 'put', key, size: bytes.length, contentType, cacheControl });
  // `putsDoNotPersist` is the step-8 injection: the write is ACCEPTED and does not land. That is
  // the real-world shape of the failure step 8 exists to catch — an upload that reports success
  // over an object the bucket does not hold — rather than a forced verdict in the verifier.
  if (state.injection.putsDoNotPersist !== true) {
    state.objects[key] = { size: bytes.length, contentType, cacheControl };
  }
  write(state);
  return { key, size: bytes.length };
}

export async function deleteStagedObject(key) {
  assertStagingKey(key);
  const state = read();
  if (state.injection.throwAt === 'delete') injected('delete');
  state.log.push({ op: 'delete', key });
  delete state.staged.key;
  state.staged.key = null;
  write(state);
  return { key, deleted: true };
}
