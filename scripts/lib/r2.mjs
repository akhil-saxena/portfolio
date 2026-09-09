import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertStagingKey,
  OBJECT_CACHE_CONTROL,
  parsePublishedKey,
  STAGING_BUCKET,
} from '../../src/lib/photo-pipeline.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

export const REQUIRED_ENV = Object.freeze(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']);

const BUCKET = STAGING_BUCKET;

const REMOTE_FLAG = '--remote';

const WRANGLER_ENTRY = join(REPO_ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 500;

const SAME_KEY_WRITE_INTERVAL_MS = 1000;

const NOT_FOUND_PATTERN = /the specified key does not exist/i;

const TRANSIENT_PATTERN =
  /\b5\d\d\b|internal server error|service unavailable|bad gateway|gateway time-?out|econnreset|etimedout|enotfound|eai_again|socket hang up|fetch failed|network error/i;

/**
 * Throws naming the FIRST missing or empty variable. Runs at import time (call below), so there
 * is no code path in which this module exists and its credentials do not.
 *
 * Exported so the probe can call it directly as well as through the import side effect.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {void}
 */
export function assertCredentials(env = process.env) {
  for (const name of REQUIRED_ENV) {
    const value = env[name];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(
        `r2: ${name} is ${value === undefined ? 'not set' : 'empty'}. The photo pipeline reads ` +
          `and writes R2 with \`wrangler r2 object\` (OD-5 B), which needs ` +
          `${REQUIRED_ENV.join(' and ')}. A missing configuration DENIES rather than degrades ` +
          `(CLAUDE.md): a job that skipped the upload and committed the record anyway would ` +
          `publish a manifest entry with no bytes behind it, and no gate in this repository can ` +
          `see that. Set ${name} in the workflow step's env: and re-run.`
      );
    }
  }
}

assertCredentials();

/* ==============================================================================================
 * 2. Logging and redaction.
 * ============================================================================================ */

/**
 * `console.log`/`console.info` print NOTHING under this repository's vitest setup (measured: 0
 * occurrences against 1 for `process.stdout.write`). This module's log lines are read from a
 * workflow run log AND from a test's captured child output, so both have to work.
 */
const log = (line) => {
  process.stdout.write(`[r2] ${line}\n`);
};

/**
 * Replace any literal credential value with a marker. Values shorter than 8 characters are left
 * alone: a two-character "secret" would turn every occurrence of those two characters in a
 * legitimate message into noise, and a two-character token is not a credential anyone can use.
 *
 * @param {string} text
 * @returns {string}
 */
export function redactCredentials(text) {
  let out = String(text ?? '');
  for (const name of REQUIRED_ENV) {
    const value = process.env[name];
    if (typeof value === 'string' && value.length >= 8) {
      out = out.split(value).join(`[redacted:${name}]`);
    }
  }
  return out;
}

/* ==============================================================================================
 * 3. The child process. One argv composer, one spawner.
 * ============================================================================================ */

/**
 * `wrangler r2 object <subcommand> <bucket>/<key> [extra…] --remote`.
 *
 * THE ONLY place an argv is built. `--remote` is appended here rather than passed by callers, so
 * a call site cannot forget it. See the header.
 *
 * @param {'get'|'put'|'delete'} subcommand
 * @param {string} key
 * @param {readonly string[]} [extra]
 * @returns {string[]}
 */
function wranglerArgv(subcommand, key, extra = []) {
  return ['r2', 'object', subcommand, `${BUCKET}/${key}`, ...extra, REMOTE_FLAG];
}

/**
 * The second of the two `--remote` checks. A composed argv that reached here without it would
 * silently address local miniflare storage, so this refuses to spawn rather than report a result
 * it did not measure.
 *
 * @param {readonly string[]} argv
 * @returns {void}
 */
function assertRemote(argv) {
  if (!argv.includes(REMOTE_FLAG)) {
    throw new Error(
      `r2: refusing to spawn \`wrangler ${argv.join(' ')}\` — it carries no ${REMOTE_FLAG}. ` +
        `wrangler 4's isLocal() defaults to LOCAL storage when neither --local nor --remote is ` +
        `given (measured in the installed bundle), so this invocation would read or write a ` +
        `miniflare directory on the runner and report success.`
    );
  }
  if (argv.includes('--local')) {
    throw new Error(`r2: refusing to spawn \`wrangler ${argv.join(' ')}\` — it carries --local.`);
  }
}

/**
 * The child's environment, assembled rather than inherited (T-04-46). `process.env` wholesale
 * would hand a third-party CLI the App installation token that authorises the push to `main`.
 *
 * @returns {Record<string, string>}
 */
function childEnv() {
  /** @type {Record<string, string>} */
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    CI: 'true',
    WRANGLER_SEND_METRICS: 'false',
  };
  for (const name of REQUIRED_ENV) {
    env[name] = process.env[name] ?? '';
  }
  return env;
}

/**
 * Spawn wrangler with an argv ARRAY, never a shell string (T-04-45): `temp_key` is
 * attacker-influenced text and must never reach a shell.
 *
 * @param {readonly string[]} argv
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
function runWrangler(argv) {
  assertRemote(argv);
  return new Promise((settle, reject) => {
    const child = spawn(process.execPath, [WRANGLER_ENTRY, ...argv], {
      cwd: REPO_ROOT,
      env: childEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      settle({
        code: code ?? 1,
        stdout: redactCredentials(stdout),
        stderr: redactCredentials(stderr),
      });
    });
  });
}

export class R2Error extends Error {
  /** @param {string} message @param {{ key: string, code: number, notFound?: boolean }} detail */
  constructor(message, detail) {
    super(message);
    this.name = 'R2Error';
    this.key = detail.key;
    this.code = detail.code;
    this.notFound = detail.notFound === true;
  }
}

const sleep = (ms) => new Promise((settle) => setTimeout(settle, ms));

/**
 * Run one wrangler invocation with a bounded retry on transient failures only.
 *
 * `notFound` is returned rather than thrown, because two of the three operations have a correct
 * answer for it: a get returns `null` (the once-only token has been spent) and a delete succeeds
 * (it is idempotent). Only a put would find it anomalous, and a put cannot produce it.
 *
 * @param {readonly string[]} argv
 * @param {string} key
 * @param {string} what
 * @returns {Promise<{ ok: boolean, notFound: boolean, stdout: string, stderr: string, code: number }>}
 */
async function attempt(argv, key, what) {
  let last = { code: 1, stdout: '', stderr: '' };
  for (let n = 1; n <= MAX_ATTEMPTS; n += 1) {
    last = await runWrangler(argv);
    if (last.code === 0) {
      return { ok: true, notFound: false, ...last };
    }
    const text = `${last.stdout}\n${last.stderr}`;
    if (NOT_FOUND_PATTERN.test(text)) {
      return { ok: false, notFound: true, ...last };
    }
    if (!TRANSIENT_PATTERN.test(text) || n === MAX_ATTEMPTS) {
      return { ok: false, notFound: false, ...last };
    }
    log(`${what} ${key}: transient failure on attempt ${n}/${MAX_ATTEMPTS}, retrying`);
    await sleep(RETRY_BACKOFF_MS * n);
  }
  /* c8 ignore next */
  return { ok: false, notFound: false, ...last };
}

/**
 * The first line of a child's captured output, for an error message. Never the whole thing: a
 * hostile object key or a long stack in a public workflow log is noise at best.
 *
 * @param {{ stdout: string, stderr: string }} result
 * @returns {string}
 */
function summarise(result) {
  const line = `${result.stderr}\n${result.stdout}`
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('⛅'))
    .find((l) => /error|✘|✖|failed/i.test(l));
  return (line ?? 'wrangler reported no message').slice(0, 300);
}

/** @type {Map<string, Promise<unknown>>} */
const writeChains = new Map();
/** @type {Map<string, number>} */
const lastWriteAt = new Map();

/**
 * Run `task` with at most one in-flight write per key, spaced by `SAME_KEY_WRITE_INTERVAL_MS`.
 * Distinct keys do not wait on each other, which is why the four variants of one photograph
 * upload without four seconds of dead time.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function serialisePerKey(key, task) {
  const previous = writeChains.get(key) ?? Promise.resolve();
  const next = previous.then(async () => {
    const since = Date.now() - (lastWriteAt.get(key) ?? 0);
    if (since < SAME_KEY_WRITE_INTERVAL_MS) {
      await sleep(SAME_KEY_WRITE_INTERVAL_MS - since);
    }
    try {
      return await task();
    } finally {
      lastWriteAt.set(key, Date.now());
    }
  });
  writeChains.set(
    key,
    next.catch(() => undefined)
  );
  return next;
}

/**
 * Read the staged upload out of R2.
 *
 * Returns `null` when the object is not there. That is not an error: step 10 deletes the staged
 * object LAST, which makes the `temp/` key a once-only token, so "absent" is the expected result
 * of re-running a completed job and the entrypoint exits 0 on it (criterion 2).
 *
 * The bytes land in a temp file rather than on the child's stdout: `--pipe` would interleave
 * binary image data with wrangler's own banner on the same stream, and a get with neither
 * `--file` nor `--pipe` writes a file named after the KEY into the current directory.
 *
 * @param {string} key  a staging key; validated by `assertStagingKey`
 * @returns {Promise<{ bytes: Uint8Array, size: number } | null>}
 */
export async function getStagedObject(key) {
  assertStagingKey(key);

  const scratch = mkdtempSync(join(tmpdir(), 'gsd-r2-get-'));
  const file = join(scratch, 'staged.bin');
  try {
    const result = await attempt(wranglerArgv('get', key, ['--file', file]), key, 'get');

    if (result.notFound) {
      log(`get ${key}: not present`);
      return null;
    }
    if (!result.ok) {
      throw new R2Error(
        `r2: reading ${key} failed (wrangler exit ${result.code}) — ${summarise(result)}`,
        {
          key,
          code: result.code,
        }
      );
    }

    const size = statSync(file).size;
    const bytes = new Uint8Array(readFileSync(file));
    log(`get ${key}: ${size} byte(s)`);
    return { bytes, size };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Write one published variant.
 *
 * `parsePublishedKey` is the guard: the only keys this module can write are ones `publishedKey()`
 * could have produced, so `private/…` (OD-9) and `temp/…` are both unwritable here rather than
 * merely unproduced.
 *
 * `--content-type` and `--cache-control` are both set. The legacy `PutObjectCommand` set NO
 * `CacheControl`, which is why the zone default (`max-age=14400`, measured in §4) applies to the
 * 39 live objects and why a re-upload under the old scheme served stale bytes for four hours.
 *
 * @param {{ key: string, bytes: Uint8Array, contentType?: string, cacheControl?: string }} descriptor
 * @returns {Promise<{ key: string, size: number }>}
 */
export function putVariant(descriptor) {
  const { key, bytes } = descriptor ?? {};
  parsePublishedKey(key);
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new R2Error(`r2: refusing to write ${key} — the variant carries no bytes.`, {
      key,
      code: 0,
    });
  }
  const contentType = descriptor.contentType ?? 'image/webp';
  const cacheControl = descriptor.cacheControl ?? OBJECT_CACHE_CONTROL;

  return serialisePerKey(key, async () => {
    const scratch = mkdtempSync(join(tmpdir(), 'gsd-r2-put-'));
    const file = join(scratch, 'variant.webp');
    try {
      writeFileSync(file, bytes);
      const result = await attempt(
        wranglerArgv('put', key, [
          '--file',
          file,
          '--content-type',
          contentType,
          '--cache-control',
          cacheControl,
        ]),
        key,
        'put'
      );
      if (!result.ok) {
        throw new R2Error(
          `r2: writing ${key} failed (wrangler exit ${result.code}) — ${summarise(result)}`,
          { key, code: result.code, notFound: result.notFound }
        );
      }
      log(`put ${key}: ${bytes.length} byte(s), ${contentType}, cache-control ${cacheControl}`);
      return { key, size: bytes.length };
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}

/**
 * Spend the once-only token.
 *
 * IDEMPOTENT: deleting a key that is already gone is success. R2's DELETE is itself idempotent,
 * and wrangler's delete handler raises no not-found error — but the classification is written
 * down anyway, because a re-run after a completed job must exit cleanly and that behaviour is
 * criterion 2's mechanism rather than an implementation detail.
 *
 * @param {string} key
 * @returns {Promise<{ key: string, deleted: boolean }>}
 */
const UNDER_PUBLISHED_PREFIX_RE = /^photos\/[a-z][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\.webp$/;

function assertUnderPublishedPrefix(key) {
  if (typeof key !== 'string' || !UNDER_PUBLISHED_PREFIX_RE.test(key)) {
    throw new R2Error(
      `r2: ${JSON.stringify(key)} is not an object under the published prefix. It must match ` +
        `${UNDER_PUBLISHED_PREFIX_RE.source}. This guard is deliberately wider than ` +
        `parsePublishedKey — see its note — but it is still a guard: nothing outside photos/ and ` +
        `nothing that is not a .webp can be read or deleted through this module.`,
      { key, code: 0 }
    );
  }
}

/**
 * Read an object under the published prefix — the read half of a key migration.
 *
 * ================================================================================================
 * WHY THIS EXISTS, AND WHY IT IS NOT `getStagedObject` WITH A DIFFERENT GUARD
 * ================================================================================================
 *
 * Until now this module could read `temp/*` and write `photos/*` and nothing else, because that is
 * the whole shape of the publish pipeline: a once-only staging key in, a content-addressed
 * published key out. A migration needs the other two corners — read a published object, delete a
 * published object — and giving them their own names keeps the asymmetry visible rather than
 * loosening the guard on the two functions the pipeline uses.
 *
 * `assertUnderPublishedPrefix` IS THE GUARD — wider than `putVariant`'s on purpose, and the note
 * above it says why. It still refuses a staging key, a bare filename, a path outside `photos/`, and
 * anything that is not a `.webp`.
 *
 * @param {string} key  any object under `photos/`; validated by `assertUnderPublishedPrefix`
 * @returns {Promise<Uint8Array | null>}  null when the object is not present
 */
export async function getPublishedObject(key) {
  assertUnderPublishedPrefix(key);

  const scratch = mkdtempSync(join(tmpdir(), 'gsd-r2-getpub-'));
  const file = join(scratch, 'published.bin');
  try {
    const result = await attempt(wranglerArgv('get', key, ['--file', file]), key, 'get');
    if (result.notFound) {
      log(`get ${key}: not present`);
      return null;
    }
    if (!result.ok) {
      throw new R2Error(
        `r2: reading ${key} failed (wrangler exit ${result.code}) — ${summarise(result)}`,
        { key, code: result.code, notFound: false }
      );
    }
    const bytes = new Uint8Array(readFileSync(file));
    log(`get ${key}: ${bytes.length} byte(s)`);
    return bytes;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Delete a PUBLISHED object — the last step of a key migration, and the only destructive call in
 * this module that is not spending a once-only staging token.
 *
 * IDEMPOTENT, like `deleteStagedObject`: deleting a key that is already gone is success, because a
 * re-run after a completed migration must exit cleanly.
 *
 * THE CALLER MUST HAVE VERIFIED THE COPY FIRST. Nothing here can check that, which is exactly why
 * it is said out loud: `scripts/migrate-photo-keys.mjs` reads the new object back and compares its
 * length to the source before it calls this, and refuses to delete on any mismatch.
 *
 * @param {string} key  any object under `photos/`; validated by `assertUnderPublishedPrefix`
 * @returns {Promise<{ key: string, deleted: boolean }>}
 */
export function deletePublishedObject(key) {
  assertUnderPublishedPrefix(key);

  return serialisePerKey(key, async () => {
    const result = await attempt(wranglerArgv('delete', key), key, 'delete');
    if (!result.ok && !result.notFound) {
      throw new R2Error(
        `r2: deleting ${key} failed (wrangler exit ${result.code}) — ${summarise(result)}`,
        { key, code: result.code, notFound: false }
      );
    }
    log(`delete ${key}: ${result.notFound ? 'already absent' : 'removed'}`);
    return { key, deleted: !result.notFound };
  });
}

export function deleteStagedObject(key) {
  assertStagingKey(key);

  return serialisePerKey(key, async () => {
    const result = await attempt(wranglerArgv('delete', key), key, 'delete');
    if (result.notFound) {
      log(`delete ${key}: already absent — nothing to do`);
      return { key, deleted: false };
    }
    if (!result.ok) {
      throw new R2Error(
        `r2: deleting ${key} failed (wrangler exit ${result.code}) — ${summarise(result)}`,
        { key, code: result.code }
      );
    }
    log(`delete ${key}: deleted`);
    return { key, deleted: true };
  });
}
