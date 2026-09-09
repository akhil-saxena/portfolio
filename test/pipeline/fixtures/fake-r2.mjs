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
