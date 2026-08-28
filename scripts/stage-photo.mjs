#!/usr/bin/env node

/**
 * PIPE-02, the half nothing else owned: how a photograph gets INTO staging from a command line.
 * (Phase 4, plan 04-10, Task 1.)
 *
 * Usage:
 *   node scripts/stage-photo.mjs --file <path> --category <id> [--dry-run] [--name <stem>]
 *
 * `.github/workflows/process-photos.yml` documents how the pipeline is *dispatched*; it takes a
 * `temp_key` and assumes an object is already sitting behind it. Until this file existed, the
 * only way to put one there was an admin UI that does not exist yet, or a hand-typed `wrangler`
 * line — and a hand-typed `wrangler` line is precisely the thing that goes wrong silently (see
 * the `--remote` section below). So this is the documented command a person can run, and the
 * dispatch line it prints at the end is copy-pasteable.
 *
 * ---------------------------------------------------------------------------------------------
 * `--remote` IS NOT OPTIONAL, AND ITS ABSENCE IS SILENT
 *
 * Measured on the installed wrangler (4.123.0), 04-VALIDATION hazard 21: with neither `--local`
 * nor `--remote`, `wrangler r2 object put|get|delete` operates on LOCAL miniflare storage. A GET
 * of a key that certainly exists in the real bucket reports "The specified key does not exist";
 * a PUT writes a file under `.wrangler/` on this laptop and **exits 0 with a success banner**.
 *
 * So a staging command that forgot the flag would report a staged photograph, and the dispatch
 * that followed would fail at step 2 having burned a workflow run — or worse, if the key happened
 * to exist from an earlier correct run, would process the WRONG bytes. Nothing downstream can
 * see the difference. The flag is therefore appended by `wranglerPutArgv()` and by nothing else,
 * and `assertRemote()` re-reads the composed argv immediately before spawning. Two layers,
 * because one of them is a line somebody could delete while "simplifying".
 *
 * This is a second copy of the control that `scripts/lib/r2.mjs` already carries, and that is a
 * deliberate, recorded cost rather than an oversight: `r2.mjs` calls `assertCredentials()` at
 * MODULE SCOPE, so importing it would make `--dry-run` — whose entire purpose is to be reviewable
 * before anything touches a live bucket — require live credentials. `r2.mjs` also exposes no
 * staging PUT: `putVariant` runs `parsePublishedKey` on its key, which makes a staging key
 * structurally unwritable there (correctly — it is the module that must never write outside the
 * published prefix). Lifting a `putStagedObject` into `r2.mjs` is the right consolidation and is
 * recorded in the plan summary as a follow-up, not smuggled in here from a later wave.
 *
 * What is NOT duplicated: on the real path this file dynamically imports `r2.mjs`, so the
 * credential check that fires is the canonical one, with the canonical message, and the child's
 * output is passed through `redactCredentials` from the same module.
 *
 * ---------------------------------------------------------------------------------------------
 * THE KEY, AND WHY ITS FILE NAME IS LOAD-BEARING
 *
 * The composed key is
 *
 *     <STAGING_PREFIX><category>/<stem><ext>
 *
 * and `STAGING_PREFIX` is IMPORTED from `src/lib/photo-pipeline.ts`. It is not spelled anywhere
 * in this file, on purpose: 04-10 Task 3 asserts that the R2 lifecycle rule's prefix is
 * byte-equal to that constant, and a second copy here would let the two drift while every check
 * still agreed with itself. Grep this file for a quoted staging prefix and you will find none.
 *
 * `<stem>` is NOT cosmetic. `slugFromStagingKey()` in `scripts/process-photo.mjs` derives the
 * record's slug from the staged file's name, and `photoIdFor()` joins that to the category to
 * make the record id that `upsertRecord` keys on. So the name chosen here decides the identity of
 * the published record, and two consequences follow that a caller must be able to see:
 *
 *   1. RE-STAGING THE SAME PHOTOGRAPH MUST REUSE THE SAME NAME. There is no timestamp and no
 *      nonce in this key, deliberately. A timestamped key would give every re-stage a new slug,
 *      hence a new id, hence an INSERT beside the record it was meant to replace — the OD-4
 *      upsert would never fire and CONT-05's "re-upload replaces the photograph" would silently
 *      become "re-upload duplicates the photograph". The key is a pure function of
 *      (category, file name, decoded format).
 *   2. THE NAME IS NORMALISED TO THE SLUG GRAMMAR HERE. `<stem>` is lower-cased with every run of
 *      non-alphanumerics collapsed to a single `-`, which is what `slugFromStagingKey` will do to
 *      it anyway. Doing it up front makes that function the IDENTITY on this stem, which is what
 *      lets this script print the resulting record id honestly instead of guessing at it.
 *
 * That coupling is real and no runtime gate enforces it — `slugFromStagingKey` cannot be imported
 * here, because it lives in `process-photo.mjs`, which imports `r2.mjs`, which needs credentials.
 * `test/pipeline/stage-photo.unit.test.ts` therefore re-implements the slug rule INDEPENDENTLY
 * (the convention this suite states in `photo-enrichment.unit.test.ts`: importing the producer's
 * own helper would only prove the module agrees with itself) and asserts the identity property.
 * If somebody changes `slugFromStagingKey`, that test goes red here rather than a wrong id going
 * quietly into the manifest.
 *
 * `<ext>` is read from the DECODED FORMAT, never from the supplied filename. An extension is a
 * claim; `sharp(...).metadata().format` is a magic-byte reading. This mirrors the allowlist in
 * `photo-derive.mjs`, whose `ALLOWED_SOURCE_FORMATS` is imported rather than restated, so a file
 * this laptop accepts is one the runner will accept and the operator finds out in 200 ms instead
 * of after a dispatch.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IS VALIDATED BEFORE A SINGLE BYTE IS SENT
 *
 *   - the source path exists and is a regular file
 *   - it is under `MAX_SOURCE_BYTES` and non-empty (imported cap, checked BEFORE the decoder, so
 *     a crafted header cannot spend this laptop on a decompression bomb — same order as the
 *     runner)
 *   - it DECODES, and its format is in `ALLOWED_SOURCE_FORMATS`
 *   - the category is a declared id in `data/site_config.json`, read via `readCategoryIds` so
 *     there is no stale copy of the list here
 *   - the composed key satisfies `assertStagingKey` — anchored at both ends and rooted at the
 *     imported prefix, so `..`, a leading `/`, a backslash and a different case of the prefix are
 *     all unmatchable rather than blocklisted (T-04-42)
 *
 * A refusal names the offending value and exits non-zero. It never normalises an input into
 * validity: a `--name` that reduces to nothing is a refusal, not a silently invented stem.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  assertStagingKey,
  photoIdFor,
  STAGING_BUCKET,
  STAGING_PREFIX,
} from '../src/lib/photo-pipeline.ts';
import { DEFAULT_SITE_CONFIG_PATH, readCategoryIds } from './lib/dispatch-input.mjs';
import { ALLOWED_SOURCE_FORMATS, MAX_SOURCE_BYTES } from './lib/photo-derive.mjs';

/* ==============================================================================================
 * Output. `console.log` is swallowed under the vitest setup this repository uses (hazard 7:
 * measured 0 occurrences for console.log/info against 1 for process.stdout.write), and this file
 * is exercised as a child process from a test, so everything it wants seen is written directly.
 * ============================================================================================ */

/** @param {string} line */
const say = (line) => process.stdout.write(`${line}\n`);

/** @param {string} line */
const warn = (line) => process.stderr.write(`${line}\n`);

/** A refusal this script raised itself, as opposed to a crash. Carries no credential. */
export class StagingRefusal extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'StagingRefusal';
  }
}

/* ==============================================================================================
 * 1. The extension table — cosmetic, and self-checked so it cannot go stale.
 * ============================================================================================ */

/**
 * The extension written onto a staged key for each format the runner will decode.
 *
 * It is COSMETIC: `slugFromStagingKey` strips the final extension before deriving the slug, and
 * `photo-derive.mjs` reads the format from the bytes. It exists so the bucket is legible to a
 * human browsing it, and so a staged object opens in an image viewer when downloaded.
 *
 * The keys are checked against the imported allowlist at module load. If plan 04-07 (or its
 * successor) adds a format to `ALLOWED_SOURCE_FORMATS`, this file fails LOUDLY on the next run
 * rather than composing a key ending in the four characters `undefined`.
 */
const EXTENSION_FOR_FORMAT = Object.freeze({
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
  tiff: '.tif',
  avif: '.avif',
  heif: '.heic',
});

for (const format of ALLOWED_SOURCE_FORMATS) {
  if (!Object.hasOwn(EXTENSION_FOR_FORMAT, format)) {
    throw new Error(
      `stage-photo: photo-derive.mjs permits the source format ${JSON.stringify(format)} but ` +
        `this file has no extension for it, so it would compose a key ending in "undefined". ` +
        `Add it to EXTENSION_FOR_FORMAT. (Known: ${Object.keys(EXTENSION_FOR_FORMAT).join(', ')}.)`
    );
  }
}

/**
 * @param {string} format  as reported by the decoder, already allowlisted
 * @returns {string}
 */
export function extensionForFormat(format) {
  const extension = /** @type {Record<string, string>} */ (EXTENSION_FOR_FORMAT)[format];
  if (extension === undefined) {
    throw new StagingRefusal(
      `stage-photo: no staged-key extension is defined for the decoded format ` +
        `${JSON.stringify(format)}.`
    );
  }
  return extension;
}

/* ==============================================================================================
 * 2. The key.
 * ============================================================================================ */

/**
 * Reduce a file name to the slug grammar `/^[a-z0-9-]+$/`.
 *
 * The FINAL extension is removed first and only then are separators collapsed, which reproduces
 * what `slugFromStagingKey` does to the name later — see the header. A name that reduces to
 * nothing is refused rather than replaced with an invented stem: the record id is built from it,
 * and a silently invented id is not something its author could guess at.
 *
 * @param {string} name  a file name, not a path
 * @returns {string}
 */
export function stemFrom(name) {
  if (typeof name !== 'string') {
    throw new StagingRefusal(`stage-photo: the name must be a string; got ${typeof name}.`);
  }
  // T-04-42, and the reason this is a REFUSAL rather than part of the reduction below. The
  // reduction cannot emit a separator or a dot in any case — its output alphabet is [a-z0-9-] —
  // so traversal is structurally unrepresentable in a composed key, and `assertStagingKey` is a
  // second backstop after that. But silently turning `../../etc/passwd` into `etc-passwd` would
  // upload a photograph under a name its author never chose and never saw refused. The recorded
  // stance is to refuse traversal rather than normalise it, so the refusal is explicit and named.
  if (/[/\\]/.test(name) || /^\.+$/.test(name)) {
    throw new StagingRefusal(
      `stage-photo: the name ${JSON.stringify(name)} contains a path separator or a parent-` +
        `directory segment. A staged key's last segment is a FILE NAME, not a path; refusing ` +
        `rather than normalising it, so nothing is uploaded under a name you did not choose.`
    );
  }
  const withoutExtension = name.replace(/\.[^.]+$/, '');
  const stem = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (stem.length === 0) {
    throw new StagingRefusal(
      `stage-photo: the name ${JSON.stringify(name)} reduces to an empty stem. The stem becomes ` +
        `the second half of the published record id and must match /^[a-z0-9-]+$/, so it needs ` +
        `at least one letter or digit. Rename the file, or pass --name <stem>.`
    );
  }
  return stem;
}

/**
 * Compose the staging key, rooted at the IMPORTED prefix.
 *
 * `assertStagingKey` is the load-bearing control here, not the composition: it is anchored at
 * both ends against `STAGING_PREFIX` itself, so a key composed from a mutated prefix (say one
 * with `temp` spelled `tmp`) is refused by the same constant Task 3's lifecycle assertion reads.
 * A grep for a quoted prefix in this file can be satisfied by a wrong key; this cannot.
 *
 * @param {{ category: string, stem: string, extension: string }} parts
 * @returns {string}
 */
export function stagingKeyFor({ category, stem, extension }) {
  const key = `${STAGING_PREFIX}${category}/${stem}${extension}`;
  assertStagingKey(key);
  return key;
}

/* ==============================================================================================
 * 3. The argv. One composer, and a re-check at the spawn.
 * ============================================================================================ */

/** Never omitted, never optional, never passed in by a caller. See the header. */
const REMOTE_FLAG = '--remote';

/**
 * `wrangler r2 object put <bucket>/<key> --file <path> --content-type <t> --remote`.
 *
 * THE ONLY place this argv is built, so a call site cannot forget the flag.
 *
 * @param {{ key: string, file: string, contentType: string }} parts
 * @returns {string[]}
 */
export function wranglerPutArgv({ key, file, contentType }) {
  return [
    'r2',
    'object',
    'put',
    `${STAGING_BUCKET}/${key}`,
    '--file',
    file,
    '--content-type',
    contentType,
    REMOTE_FLAG,
  ];
}

/**
 * The second of the two checks. An argv that reached here without the flag would address a
 * miniflare directory on this laptop and report success, so this refuses to spawn rather than
 * report a result it did not measure.
 *
 * @param {readonly string[]} argv
 * @returns {void}
 */
export function assertRemote(argv) {
  if (!argv.includes(REMOTE_FLAG)) {
    throw new StagingRefusal(
      `stage-photo: refusing to spawn \`wrangler ${argv.join(' ')}\` — it carries no ` +
        `${REMOTE_FLAG}. wrangler defaults to LOCAL storage when neither --local nor --remote is ` +
        `given (measured on 4.123.0), so this would write to a miniflare directory on this ` +
        `machine, print a success banner, and stage nothing.`
    );
  }
  if (argv.includes('--local')) {
    throw new StagingRefusal(
      `stage-photo: refusing to spawn \`wrangler ${argv.join(' ')}\` — it carries --local.`
    );
  }
}

/* ==============================================================================================
 * 4. The source: size before decode, then the allowlist.
 * ============================================================================================ */

/**
 * @param {string} filePath
 * @returns {Promise<{ path: string, bytes: number, format: string, width: number, height: number }>}
 */
export async function inspectSource(filePath) {
  const absolute = resolve(filePath);

  let stats;
  try {
    stats = statSync(absolute);
  } catch (error) {
    throw new StagingRefusal(
      `stage-photo: ${absolute} cannot be read — ${/** @type {Error} */ (error).message}.`
    );
  }
  if (!stats.isFile()) {
    throw new StagingRefusal(`stage-photo: ${absolute} is not a regular file.`);
  }
  if (stats.size === 0) {
    throw new StagingRefusal(
      `stage-photo: ${absolute} is empty — zero bytes cannot be a photograph.`
    );
  }
  // The cap is checked BEFORE the decoder is reached, the same order photo-derive.mjs uses. The
  // order is the control, not the cap alone.
  if (stats.size > MAX_SOURCE_BYTES) {
    throw new StagingRefusal(
      `stage-photo: ${absolute} is ${stats.size} bytes, over the ${MAX_SOURCE_BYTES} byte cap ` +
        `that scripts/lib/photo-derive.mjs enforces on the runner. Staging it would upload bytes ` +
        `the pipeline will then refuse.`
    );
  }

  let metadata;
  try {
    metadata = await sharp(readFileSync(absolute)).metadata();
  } catch (error) {
    throw new StagingRefusal(
      `stage-photo: ${absolute} did not decode as an image — ` +
        `${/** @type {Error} */ (error).message}. The format is read from the bytes, never from ` +
        `the filename.`
    );
  }
  const format = metadata?.format;
  if (typeof format !== 'string' || !ALLOWED_SOURCE_FORMATS.includes(format)) {
    throw new StagingRefusal(
      `stage-photo: ${absolute} decodes as ${JSON.stringify(format ?? null)}, which is not one ` +
        `of the formats the pipeline accepts (${ALLOWED_SOURCE_FORMATS.join(', ')}). This is the ` +
        `same allowlist scripts/lib/photo-derive.mjs applies on the runner, imported rather than ` +
        `copied.`
    );
  }
  return {
    path: absolute,
    bytes: stats.size,
    format,
    width: Number(metadata.width ?? 0),
    height: Number(metadata.height ?? 0),
  };
}

/* ==============================================================================================
 * 5. argv parsing. An unknown flag is a refusal, never an ignored typo.
 * ============================================================================================ */

/**
 * @param {readonly string[]} argv  process.argv.slice(2)
 * @returns {{ file: string, category: string, name: string | null, dryRun: boolean }}
 */
export function parseArgv(argv) {
  /** @type {string | null} */ let file = null;
  /** @type {string | null} */ let category = null;
  /** @type {string | null} */ let name = null;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--file' || arg === '--category' || arg === '--name') {
      const value = argv[index + 1];
      index += 1;
      if (value === undefined || value.startsWith('--')) {
        throw new StagingRefusal(`stage-photo: ${arg} requires a value.`);
      }
      if (arg === '--file') file = value;
      else if (arg === '--category') category = value;
      else name = value;
    } else {
      throw new StagingRefusal(
        `stage-photo: unknown argument ${JSON.stringify(arg)}. Known flags: --file <path>, ` +
          `--category <id>, --name <stem>, --dry-run.`
      );
    }
  }

  if (file === null) throw new StagingRefusal(`stage-photo: --file <path> is required.`);
  if (category === null) throw new StagingRefusal(`stage-photo: --category <id> is required.`);
  return { file, category, name, dryRun };
}

/* ==============================================================================================
 * 6. The plan — everything decided before anything is spawned.
 * ============================================================================================ */

/**
 * @param {{ file: string, category: string, name: string | null }} request
 * @param {{ siteConfigPath?: string }} [options]
 * @returns {Promise<{ source: Awaited<ReturnType<typeof inspectSource>>, category: string,
 *   stem: string, key: string, photoId: string, contentType: string, argv: string[] }>}
 */
export async function planStaging(request, options = {}) {
  const siteConfigPath = options.siteConfigPath ?? DEFAULT_SITE_CONFIG_PATH;
  const categoryIds = readCategoryIds(siteConfigPath);
  if (!categoryIds.includes(request.category)) {
    throw new StagingRefusal(
      `stage-photo: ${JSON.stringify(request.category)} is not a declared category. The legal ` +
        `ids are: ${categoryIds.join(', ')}. They are compared with no case transform on either ` +
        `side, so a capitalised value is a refusal rather than a silent match.`
    );
  }

  const source = await inspectSource(request.file);
  const stem = stemFrom(request.name ?? basename(source.path));
  const extension = extensionForFormat(source.format);
  const key = stagingKeyFor({ category: request.category, stem, extension });
  const contentType = `image/${source.format}`;
  const argv = wranglerPutArgv({ key, file: source.path, contentType });
  assertRemote(argv);

  return {
    source,
    category: request.category,
    stem,
    key,
    photoId: photoIdFor({ category: request.category, slug: stem }),
    contentType,
    argv,
  };
}

/* ==============================================================================================
 * 7. The upload, and the report.
 * ============================================================================================ */

/**
 * THE TWO CREDENTIAL MODES, and why this does not route through `scripts/lib/r2.mjs`.
 *
 * `r2.mjs` calls `assertCredentials()` at MODULE SCOPE and requires `CLOUDFLARE_API_TOKEN` plus
 * `CLOUDFLARE_ACCOUNT_ID`. That is exactly right for the Actions runner, where the only possible
 * authentication is a token supplied by the workflow step and a missing one must DENY rather than
 * degrade. It is wrong for this file, which is an OPERATOR'S LOCAL COMMAND: the plan's own
 * preflight is a bare `npx wrangler r2 object put … --remote` typed into a shell, and on this
 * machine wrangler is authenticated by a stored OAuth session
 * (`wrangler login`) with no token in the environment at all. Routing through `r2.mjs` made the
 * documented command unusable by the person it was written for — measured, not theorised: the
 * first real staging attempt refused with r2.mjs's token message on a machine that could and did
 * write to the bucket seconds earlier.
 *
 * So both modes are supported and neither degrades:
 *
 *   TOKEN MODE   — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are both set. They are
 *                  passed through and are the only credentials the child receives.
 *   SESSION MODE — neither is set. `HOME` (and `XDG_CONFIG_HOME`, which wrangler honours) are
 *                  passed so wrangler can find its own stored session, and NOTHING else
 *                  credential-shaped is.
 *
 * IT STILL FAILS CLOSED. If neither a token nor a session exists, wrangler exits non-zero and
 * this refuses — the check is wrangler's own authentication, which is the thing that actually
 * knows. And an empty-string `CLOUDFLARE_API_TOKEN` is never set: an empty value is not "absent"
 * to wrangler, and handing it one would turn a working session into an auth failure.
 *
 * `process.env` is NEVER passed wholesale (T-04-46). The environment is assembled key by key.
 */

/** The credential names, restated locally so this file needs no import from `r2.mjs`. */
const CREDENTIAL_ENV = Object.freeze(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']);

/**
 * Replace any literal credential value with a marker before anything is printed. Identical in
 * behaviour to `r2.mjs`'s: values under 8 characters are left alone, because a two-character
 * "secret" would turn every occurrence of those two characters into noise and is not a
 * credential anyone can use.
 *
 * @param {string} text
 * @returns {string}
 */
export function redactCredentials(text) {
  let out = String(text ?? '');
  for (const name of CREDENTIAL_ENV) {
    const value = process.env[name];
    if (typeof value === 'string' && value.length >= 8) {
      out = out.split(value).join(`[redacted:${name}]`);
    }
  }
  return out;
}

/** The child's environment, assembled key by key. See the two-modes note above. */
function childEnv() {
  /** @type {Record<string, string>} */
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    TMPDIR: process.env.TMPDIR ?? '/tmp',
    CI: 'true',
    WRANGLER_SEND_METRICS: 'false',
  };
  if (typeof process.env.XDG_CONFIG_HOME === 'string' && process.env.XDG_CONFIG_HOME !== '') {
    env.XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
  }
  for (const name of CREDENTIAL_ENV) {
    const value = process.env[name];
    // Only when genuinely present. An empty string is not "absent" to wrangler.
    if (typeof value === 'string' && value !== '') env[name] = value;
  }
  return env;
}

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const WRANGLER_ENTRY = join(REPO_ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

/**
 * Spawn wrangler with an argv ARRAY, never a shell string — the file path is operator-supplied
 * text and must never reach a shell.
 *
 * @param {readonly string[]} argv
 * @returns {Promise<{ code: number, out: string }>}
 */
function runWrangler(argv) {
  assertRemote(argv);
  return new Promise((settle, reject) => {
    const child = spawn(process.execPath, [WRANGLER_ENTRY, ...argv], {
      cwd: REPO_ROOT,
      env: childEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      out += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => settle({ code: code ?? 1, out: redactCredentials(out) }));
  });
}

/**
 * Upload, then READ THE OBJECT BACK and compare its length to the source's.
 *
 * The read-back is not ceremony. Everything else in this file that guards hazard 21 inspects the
 * ARGV — `wranglerPutArgv` appends the flag and `assertRemote` re-checks it — and an argv check
 * can only ever prove that the flag was written, never that bytes arrived. The read-back is the
 * one step that measures the object's existence at the composed key. Its honest limit is stated
 * here rather than left implied: a put AND a get that both went local would agree with each
 * other, so the read-back does not discriminate on its own — it is the argv assertions that fix
 * the destination, and this that confirms something is actually there.
 *
 * @param {{ key: string, argv: readonly string[], expectedBytes: number }} plan
 * @returns {Promise<void>}
 */
async function upload({ key, argv, expectedBytes }) {
  const put = await runWrangler(argv);
  if (put.code !== 0) {
    throw new StagingRefusal(
      `stage-photo: wrangler exited ${put.code}. Nothing was staged.\n${put.out.trim()}`
    );
  }

  const scratch = mkdtempSync(join(tmpdir(), 'gsd-stage-verify-'));
  const readBack = join(scratch, 'staged.bin');
  try {
    const get = await runWrangler([
      'r2',
      'object',
      'get',
      `${STAGING_BUCKET}/${key}`,
      '--file',
      readBack,
      REMOTE_FLAG,
    ]);
    if (get.code !== 0) {
      throw new StagingRefusal(
        `stage-photo: the object was reported uploaded, but reading it back from ` +
          `${STAGING_BUCKET}/${key} failed (wrangler exit ${get.code}). Refusing to report a ` +
          `staged photograph that cannot be read.\n${get.out.trim()}`
      );
    }
    const got = statSync(readBack).size;
    if (got !== expectedBytes) {
      throw new StagingRefusal(
        `stage-photo: ${key} read back as ${got} bytes but the source is ${expectedBytes}. ` +
          `Refusing — the staged object is not the photograph.`
      );
    }
    say(`  verified      read back ${got} bytes from ${STAGING_BUCKET}/${key}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * @param {Awaited<ReturnType<typeof planStaging>>} plan
 * @param {boolean} dryRun
 * @returns {void}
 */
function report(plan, dryRun) {
  const { source, category, key, photoId, argv } = plan;
  say('');
  say(dryRun ? 'stage-photo: DRY RUN — nothing was uploaded.' : 'stage-photo: staged.');
  say('');
  say(`  source        ${source.path}`);
  say(`  decoded as    ${source.format} ${source.width}x${source.height}, ${source.bytes} bytes`);
  say(`  staging key   ${key}`);
  say(`  prefix        ${JSON.stringify(STAGING_PREFIX)} (imported from photo-pipeline.ts)`);
  say(`  bucket        ${STAGING_BUCKET}`);
  say(`  record id     ${photoId}   <- the slug comes from the staged file name`);
  say('');
  say(`  wrangler ${argv.join(' ')}`);
  say('');
  say('  next, once the alt text is written (it is the whole non-visual experience of');
  say('  this photograph — the public pages ship no JavaScript, so nothing can add one later):');
  say('');
  say('    gh workflow run process-photos.yml --ref main \\');
  say(`      -f temp_key=${key} \\`);
  say(`      -f category=${category} \\`);
  say(`      -f title='<title>' \\`);
  say('      -F alt=@alt.txt');
  say('');
  say(`  re-staging THIS photograph later must reuse --name ${plan.stem}, or the record id`);
  say('  changes and the pipeline inserts a duplicate instead of replacing the record.');
  say('');
}

/* ==============================================================================================
 * 8. Entry point.
 * ============================================================================================ */

/** @returns {Promise<number>} */
export async function main(argv) {
  const { file, category, name, dryRun } = parseArgv(argv);
  const plan = await planStaging({ file, category, name });
  if (!dryRun) {
    await upload({ key: plan.key, argv: plan.argv, expectedBytes: plan.source.bytes });
  }
  report(plan, dryRun);
  return 0;
}

const isEntrypoint =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      warn('');
      warn(error instanceof Error ? error.message : String(error));
      warn('');
      process.exitCode = 1;
    }
  );
}
