/**
 * R2 I/O for the photo pipeline — get the staged object, put a published variant, delete the
 * staged object.  (Phase 4, plan 04-09 — PIPE-01, PIPE-03, PIPE-04.)
 *
 * ---------------------------------------------------------------------------------------------
 * WHERE THIS RUNS — DEPENDENCY TIER
 *
 * ACTIONS RUNNER ONLY, NEVER IN `workerd`. It spawns the `wrangler` CLI as a child process, which
 * no Workers runtime can do at any version. Nothing under `src/` may import this file.
 *
 * The Worker's `PORTFOLIO_BUCKET` binding is a READ/SERVE path and is not this. The pipeline does
 * not run in the Worker and does not use that binding; the two reach the same bucket by two
 * different mechanisms for two different reasons, and conflating them is how a "guard the binding"
 * habit from the legacy Worker routes ends up in a job where an absent credential is a real
 * failure (see FAIL CLOSED below).
 *
 * ---------------------------------------------------------------------------------------------
 * OD-5 = B · `wrangler r2 object`, NOT the S3 SDK.  (Decided by Akhil in review on 2026-08-26;
 * the resolutions block at the head of `04-RESEARCH.md` § Open decisions is the record.)
 *
 * The research recommended A (`@aws-sdk/client-s3` with the five existing `R2_*` secrets) but
 * conditioned it on OD-6: *"unless OD-6 forces a Cloudflare API token anyway (it does, for
 * lifecycle) — in which case B becomes the tidier answer."* OD-6 resolved to A, the condition is
 * met, and the recommendation flips. One credential system instead of two, ~27 fewer packages,
 * and the same token that creates the staging lifecycle rule does the object I/O.
 *
 * The credential surface is therefore `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, which is
 * what `REQUIRED_ENV` below says — and `REQUIRED_ENV` is exported precisely because a probe
 * cannot know it: it differs between OD-5's two branches, and hardcoding a guess is how a probe
 * ends up asserting nothing.
 *
 * CONTINGENCY, recorded rather than assumed: B needs `CLOUDFLARE_API_TOKEN` to carry
 * **R2 Storage → Edit**, which is unverified from here. 04-10 Task 2's blocking checkpoint tests
 * it. If it fails, Akhil adds the scope; falling back to A is the last resort and is a deviation
 * to record, not an executor's call.
 *
 * ---------------------------------------------------------------------------------------------
 * `--remote` IS ON EVERY INVOCATION, AND ITS ABSENCE IS THE WORST BUG THIS FILE COULD HAVE
 *
 * MEASURED in the installed wrangler 4.123.0 bundle (`node_modules/wrangler/wrangler-dist/cli.js`,
 * `src/utils/is-local.ts`), not inferred from the docs:
 *
 *     function isLocal(args, defaultValue = true) {
 *       if (args.local === void 0 && args.remote === void 0) return defaultValue;   // ← TRUE
 *       return args.local === true || args.remote === false;
 *     }
 *
 * With neither `--local` nor `--remote`, `wrangler r2 object get|put|delete` operates on LOCAL
 * miniflare storage under `.wrangler/`. A pipeline that omitted the flag would:
 *
 *   - "get" the staged object from an empty local directory, find nothing, and — because an
 *     absent staged object is deliberately EXIT 0 (the once-only token, criterion 2) — report a
 *     clean no-op for every dispatch, forever;
 *   - "put" four variants into a directory that is deleted with the runner;
 *   - "delete" nothing.
 *
 * That is a silent fail-open, so the flag is not passed by call sites at all: `wranglerArgv()` is
 * the only argv composer here and it appends `REMOTE_FLAG` itself, and `assertRemote()` re-checks
 * the composed argv immediately before every spawn. Two checks for one flag is deliberate — the
 * failure it prevents is invisible from the run log.
 *
 * ---------------------------------------------------------------------------------------------
 * FAIL CLOSED · `CLAUDE.md`: "auth fails closed … a missing configuration denies rather than
 * degrades."  (Threat T-04-47.)
 *
 * Every name in `REQUIRED_ENV` is asserted present AND non-empty AT MODULE INIT, and the throw
 * names which one is missing. Importing this module without credentials is an error, not a
 * degraded mode.
 *
 * It is explicitly NOT the legacy Worker guard pattern (`try { getRequestContext().env } catch`).
 * That pattern exists because Cloudflare bindings are genuinely unavailable under `next dev`, and
 * copying it here would let the job skip the upload and commit a record anyway — a manifest entry
 * with no bytes behind it, which is the single worst outcome available to this phase and the one
 * §6 measured that no existing gate can see.
 *
 * `scripts/lib/r2-fail-closed.probe.mjs` is the executable enforcement of this paragraph.
 *
 * ---------------------------------------------------------------------------------------------
 * IT COMPOSES NO KEYS
 *
 * There is no `temp/` here, no `photos/`, no `-lg`, no hostname. The module takes a key and does
 * I/O with it. `STAGING_PREFIX` and `publishedKey()` live in `src/lib/photo-pipeline.ts`, which
 * that file's header states is the only place the scheme is written — a second opinion here is
 * exactly how the delete step ends up pointed at a different object from the get step.
 *
 * What it does compose is `<bucket>/<key>`, which is `wrangler r2 object`'s own positional
 * argument grammar (`objectPath`), not a key scheme. The bucket comes from `STAGING_BUCKET`,
 * whose own comment says it is "the R2 bucket both halves of the pipeline use" and which the
 * contract test holds byte-equal to `wrangler.jsonc`'s `bucket_name`.
 *
 * Both directions are additionally CHECKED rather than trusted: a staging op runs
 * `assertStagingKey` (T-04-04 — `temp_key` is caller-supplied text naming an object in a bucket
 * this job can write to), and `putVariant` runs `parsePublishedKey`, so the only keys this module
 * can ever WRITE are ones `publishedKey()` could have produced. That second check is also where
 * OD-9 lands at the I/O boundary: a `private/…` key is unwritable here, not merely unproduced.
 *
 * ---------------------------------------------------------------------------------------------
 * NEVER ECHO A CREDENTIAL  (T-04-46)
 *
 * Workflow logs are readable by anyone with repository access. Three things follow:
 *
 *   1. The child gets a MINIMAL environment — the two credentials plus `PATH`/`HOME`/`TMPDIR`/
 *      `CI` — never `process.env` wholesale. The App installation token that authorises the git
 *      push is in the job's environment and has no business inside a `wrangler` process.
 *   2. Failures are reported as status + message + KEY. The endpoint, the account id and the
 *      token never appear in a thrown message.
 *   3. `redactCredentials()` scrubs any literal credential value out of captured child output
 *      before it is logged — belt and braces behind (1), never instead of it.
 */

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

/**
 * The environment variables this module requires, under OD-5 option B.
 *
 * EXPORTED because `scripts/lib/r2-fail-closed.probe.mjs` cannot know them: option A's surface is
 * five `R2_*` secrets and option B's is these two, so a probe with a hardcoded list would assert
 * something about a module that is not this one. The probe reads this array, REFUSES if it is
 * empty, and then empties exactly one name at a time.
 */
export const REQUIRED_ENV = Object.freeze(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']);

/** The one bucket. See "IT COMPOSES NO KEYS" above. */
const BUCKET = STAGING_BUCKET;

/** Never omitted, never optional. See the `--remote` block in the header. */
const REMOTE_FLAG = '--remote';

/** `node <path>` rather than a `.bin` shim: an argv array with no shell and no PATH lookup. */
const WRANGLER_ENTRY = join(REPO_ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

/** Bounded, and only for reasons that mean "ask again". A 4xx is never retried. */
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 500;

/**
 * R2 documents ONE write per second to the SAME key. Writes are therefore serialised per key and
 * spaced by this much; five objects per photograph is far below the 1,200-per-5-minutes REST
 * budget, so nothing else needs throttling (T-04-49).
 */
const SAME_KEY_WRITE_INTERVAL_MS = 1000;

/**
 * wrangler's own words for "the object is not there", from the installed bundle — BOTH the local
 * and the remote handler throw this exact `UserError`. Matched narrowly on purpose.
 *
 * `The specified bucket does not exist.` is deliberately NOT in here. A wrong bucket is a
 * configuration failure and must fail the job; treating it as "nothing staged" would make every
 * dispatch a silent exit-0 no-op, which is the same fail-open shape as a missing `--remote`.
 */
const NOT_FOUND_PATTERN = /the specified key does not exist/i;

/** Reasons to ask again. Everything else — auth, 4xx, not-found — is reported on sight. */
const TRANSIENT_PATTERN =
  /\b5\d\d\b|internal server error|service unavailable|bad gateway|gateway time-?out|econnreset|etimedout|enotfound|eai_again|socket hang up|fetch failed|network error/i;

/* ==============================================================================================
 * 1. FAIL CLOSED, AT MODULE INIT.
 * ============================================================================================ */

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
    // Non-interactive. wrangler's data-catalog conflict prompt falls back rather than blocking a
    // runner that can never answer it.
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

/** An R2 failure carrying the key and the child's exit code — and never a credential. */
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

/* ==============================================================================================
 * 4. Per-key write serialisation.  (T-04-49)
 * ============================================================================================ */

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
  // Keep the chain alive on failure so a rejected write does not poison the next one.
  writeChains.set(
    key,
    next.catch(() => undefined)
  );
  return next;
}

/* ==============================================================================================
 * 5. THE THREE OPERATIONS.
 * ============================================================================================ */

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
      throw new R2Error(`r2: reading ${key} failed (wrangler exit ${result.code}) — ` + summarise(result), {
        key,
        code: result.code,
      });
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
