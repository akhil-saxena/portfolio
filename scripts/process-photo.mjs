#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PUBLISH_BRANCH, photoIdFor } from '../src/lib/photo-pipeline.ts';
import {
  DispatchInputError,
  inputsFromEnv,
  validateDispatchInputs,
} from './lib/dispatch-input.mjs';
import { PublishConflictError, publishManifest } from './lib/git-publish.mjs';
import { deriveAssets, MAX_SOURCE_BYTES } from './lib/photo-derive.mjs';
import { buildRecord, serialiseManifest, upsertRecord } from './lib/photo-record.mjs';
import { deleteStagedObject, getStagedObject, putVariant } from './lib/r2.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(HERE, '..');

const MANIFEST_RELATIVE = 'data/portfolio_images.json';
const MANIFEST_PATH = join(REPO_ROOT, MANIFEST_RELATIVE);

const ASTRO_BIN = join(REPO_ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');

const VERIFIER = join(REPO_ROOT, 'scripts', 'verify-photo-urls.mjs');

const OUTCOMES = {
  PUBLISHED: { code: 0, why: 'the record is committed, the bytes are live' },
  STAGED_ABSENT: {
    code: 0,
    why: 'nothing staged at that key — the expected result of re-running a completed job',
  },
  INTERNAL: { code: 1, why: 'an unclassified failure; the stack is above' },
  INPUTS_REJECTED: { code: 2, why: 'the dispatch inputs were refused; nothing was read' },
  STAGED_READ_FAILED: { code: 3, why: 'the staged object could not be read from R2' },
  DERIVE_FAILED: { code: 4, why: 'the staged bytes could not be turned into variants' },
  GATE_REJECTED: { code: 5, why: 'the content gate refused the candidate manifest' },
  UPLOAD_FAILED: { code: 6, why: 'a variant did not reach R2; nothing was committed' },
  LIVENESS_FAILED: { code: 7, why: 'a URL in the new record does not resolve; nothing committed' },
  PUBLISH_CONFLICT: { code: 8, why: 'the push kept losing to a concurrent writer' },
  PUBLISH_FAILED: { code: 9, why: 'the commit or push failed, and it was not a conflict' },
};

class StepError extends Error {
  /** @param {keyof OUTCOMES} outcome @param {string} message @param {string} [detail] */
  constructor(outcome, message, detail = '') {
    super(message);
    this.name = 'StepError';
    this.outcome = outcome;
    this.detail = detail;
  }
}

const say = (line) => {
  process.stdout.write(`${line}\n`);
};
const step = (n, line) => say(`\n[step ${n}] ${line}`);

/**
 * Spawn with an argv ARRAY. Never a shell string, never `shell: true` (T-04-45).
 *
 * @param {string} command @param {readonly string[]} argv @param {{ env?: Record<string,string> }} [options]
 * @returns {Promise<{ code: number, output: string }>}
 */
function run(command, argv, options = {}) {
  return new Promise((settle, reject) => {
    const child = spawn(command, [...argv], {
      cwd: REPO_ROOT,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => settle({ code: code ?? 1, output }));
  });
}

/**
 * THE SLUG, and this file owns it.
 *
 * No module in Phase 4 claimed slug derivation — `deriveAssets` takes one, `buildRecord` reads
 * `assets.slug`, and `photoIdFor` joins it to the category — so the composer has to decide, and
 * the decision belongs in the source rather than in a plan nobody can evaluate in two years.
 *
 * IT COMES FROM THE STAGED FILE NAME, not from the title. Three reasons, in order of weight:
 *
 *   1. IDENTITY. `id === category + "-" + slug`, and the id is what `upsertRecord` keys on. A
 *      re-dispatch to repair a half-finished run must produce the SAME id, and the file name is
 *      the one input that is stable across such a re-dispatch. A title-derived slug would make
 *      fixing a typo in the title orphan the record it was meant to repair.
 *   2. GRAMMAR. `assertStagingKey` has already constrained the key to `[A-Za-z0-9._-]`, so the
 *      stem is ASCII by the time it gets here. A title is free text and may be entirely
 *      non-Latin, which would reduce to an empty slug and refuse a perfectly good photograph for
 *      a reason its author could not guess.
 *   3. PRECEDENT. All 39 committed ids are `<category>-<file stem>` (`abstract-intothemist` from
 *      `intothemist.jpg`). Continuity is worth something in a manifest a human reads.
 *
 * The one visible departure from legacy: legacy stripped every non-alphanumeric character,
 * INCLUDING the dot before the extension, which is why `hauntedmansion.jpg.jpg` is committed as
 * `architecture-hauntedmansionjpg`. Here the final extension is removed first and separators
 * collapse to `-`, which the id grammar `/^[a-z0-9-]+$/` allows and `parsePublishedKey` resolves
 * (its slug group is greedy, so the LAST `-<hash8>` is read as the hash — see its comment).
 *
 * @param {string} stagingKey  already validated by `assertStagingKey`
 * @returns {string}
 */
export function slugFromStagingKey(stagingKey) {
  const base = stagingKey.slice(stagingKey.lastIndexOf('/') + 1);
  const stem = base.replace(/\.[^.]+$/, '');
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length === 0) {
    throw new StepError(
      'INPUTS_REJECTED',
      `process-photo: the staged file name ${JSON.stringify(base)} reduces to an empty slug. ` +
        `The slug is the second half of the record id and must match /^[a-z0-9-]+$/. Rename the ` +
        `file to something with at least one letter or digit and re-stage it.`
    );
  }
  return slug;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * Write `candidate` to the manifest and run the FULL content gate over it. On rejection, put
 * `previous` back BEFORE throwing (T-04-44) — otherwise a record the gate refused sits in the
 * working tree waiting for the next thing that commits.
 *
 * @param {string} candidate  the bytes to validate
 * @param {string} previous   the bytes to restore if the gate refuses
 * @param {string} where      named in the failure, so a retry rejection is distinguishable
 * @returns {Promise<void>}
 */
async function applyAndGate(candidate, previous, where) {
  if (!existsSync(ASTRO_BIN)) {
    throw new StepError(
      'INTERNAL',
      `process-photo: ${ASTRO_BIN} is not present, so the content gate cannot run. Refusing to ` +
        `continue: a skipped gate looks exactly like a gate that passed.`
    );
  }

  writeFileSync(MANIFEST_PATH, candidate);
  const result = await run(process.execPath, [ASTRO_BIN, 'sync']);

  if (result.code !== 0) {
    writeFileSync(MANIFEST_PATH, previous);
    throw new StepError(
      'GATE_REJECTED',
      `process-photo: the content gate refused the candidate manifest at ${where} ` +
        `(astro sync exit ${result.code}). The manifest has been restored to its pre-run bytes ` +
        `and nothing was uploaded or committed.`,
      result.output
    );
  }
  say(result.output.trimEnd());
}

async function processPhoto() {
  step(1, 'validating the dispatch inputs');
  let inputs;
  try {
    inputs = validateDispatchInputs(inputsFromEnv(process.env));
  } catch (error) {
    const findings =
      error instanceof DispatchInputError ? error.findings : [String(error?.message ?? error)];
    throw new StepError(
      'INPUTS_REJECTED',
      'process-photo: the dispatch inputs were refused. Nothing was read and nothing was written.',
      findings.map((f) => `  - ${f}`).join('\n')
    );
  }
  const slug = slugFromStagingKey(inputs.temp_key);
  const id = photoIdFor({ category: inputs.category, slug });
  say(`  inputs accepted · id will be ${id} (slug ${JSON.stringify(slug)})`);

  step(2, `reading the staged object ${inputs.temp_key}`);
  let staged;
  try {
    staged = await getStagedObject(inputs.temp_key);
  } catch (error) {
    throw new StepError('STAGED_READ_FAILED', `process-photo: ${error.message}`);
  }
  if (staged === null) {
    return {
      outcome: 'STAGED_ABSENT',
      summary:
        `nothing staged at ${inputs.temp_key}. This is the expected result of re-running a ` +
        `completed job: the staged object is deleted LAST, which makes it a once-only token. ` +
        `Nothing was derived, uploaded or committed.`,
    };
  }
  if (staged.size > MAX_SOURCE_BYTES) {
    throw new StepError(
      'DERIVE_FAILED',
      `process-photo: the staged object is ${staged.size} bytes, over the ${MAX_SOURCE_BYTES} ` +
        `byte cap. Refused before the decoder was reached.`
    );
  }
  say(`  ${staged.size} byte(s) read`);

  step(3, 'deriving 4 variants + a 40px thumb, and reading EXIF');
  const ingestionDate = todayUtc();
  let assets;
  try {
    assets = await deriveAssets({
      bytes: staged.bytes,
      category: inputs.category,
      slug,
      ingestionDate,
    });
  } catch (error) {
    throw new StepError('DERIVE_FAILED', `process-photo: ${error.message}`);
  }
  say(
    `  source ${assets.dimensions.width}x${assets.dimensions.height} · ` +
      `date ${assets.date} (${assets.date === ingestionDate ? 'ingestion' : 'EXIF capture'}, OD-10 B)`
  );

  step(4, 'composing the content-hashed keys and URLs');
  for (const descriptor of assets.descriptors) say(`  ${descriptor.key}`);
  if (assets.descriptors.length === 0) {
    throw new StepError(
      'DERIVE_FAILED',
      'process-photo: the deriver emitted no upload descriptors. Refusing rather than publishing ' +
        'a record whose URLs nothing will ever be written to.'
    );
  }

  step(5, `building the record and upserting it into ${MANIFEST_RELATIVE}`);
  const previousContent = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(previousContent);
  const record = buildRecord({ inputs, assets, date: assets.date, manifest });
  const candidateContent = serialiseManifest(upsertRecord(manifest, record));
  const replacing = manifest.some((existing) => existing?.id === record.id);
  say(
    `  ${replacing ? 'replacing' : 'inserting'} ${record.id} · order ${record.order} · ` +
      `categoryOrder ${record.categoryOrder} · ${manifest.length} record(s) before`
  );

  step(6, 'running the full content gate over the candidate (astro sync)');
  await applyAndGate(candidateContent, previousContent, 'step 6');

  step(7, `uploading ${assets.descriptors.length} variant(s) to R2`);
  const uploaded = [];
  try {
    for (const descriptor of assets.descriptors) {
      await putVariant(descriptor);
      uploaded.push(descriptor.key);
    }
  } catch (error) {
    writeFileSync(MANIFEST_PATH, previousContent);
    throw new StepError(
      'UPLOAD_FAILED',
      `process-photo: ${error.message}\n` +
        `  ${uploaded.length} of ${assets.descriptors.length} variant(s) had landed. Those are ` +
        `orphan bytes: harmless, unreferenced, and swept by the staging lifecycle rule. The ` +
        `manifest was NOT changed and the staged object was NOT deleted, so re-dispatching the ` +
        `same temp_key repairs this run.`
    );
  }

  step(8, `verifying every URL in ${record.id} resolves 200 image/webp`);
  const verified = await run(process.execPath, [VERIFIER, MANIFEST_PATH, '--only', record.id]);
  say(verified.output.trimEnd());
  if (verified.code !== 0) {
    writeFileSync(MANIFEST_PATH, previousContent);
    throw new StepError(
      'LIVENESS_FAILED',
      `process-photo: the liveness check failed (exit ${verified.code}), so the record is NOT ` +
        `being committed. This is the check that no other gate in this repository can perform: ` +
        `a schema-valid record pointing at four 404s passes astro sync at exit 0. The manifest ` +
        `has been restored and the staged object kept, so a re-dispatch repairs this run.`
    );
  }

  step(9, `committing ${MANIFEST_RELATIVE} to ${PUBLISH_BRANCH} and pushing`);
  let published;
  try {
    published = await publishManifest({
      repoDir: REPO_ROOT,
      branch: PUBLISH_BRANCH,
      filePath: MANIFEST_RELATIVE,
      message: `photo: publish ${record.id}`,
      committerName: process.env.GIT_AUTHOR_NAME,
      committerEmail: process.env.GIT_AUTHOR_EMAIL,
      rederive: async (fetchedContent) => {
        const fetched = JSON.parse(fetchedContent);
        const rebuilt = buildRecord({ inputs, assets, date: assets.date, manifest: fetched });
        const next = serialiseManifest(upsertRecord(fetched, rebuilt));
        say(
          `  re-derived against the fetched manifest: ${fetched.length} record(s), ` +
            `order ${rebuilt.order}, categoryOrder ${rebuilt.categoryOrder}`
        );
        await applyAndGate(next, fetchedContent, 'step 9 re-derive');
        return next;
      },
    });
  } catch (error) {
    if (error instanceof StepError) throw error;
    if (error instanceof PublishConflictError) {
      throw new StepError(
        'PUBLISH_CONFLICT',
        `process-photo: ${error.message}\n` +
          `  The four variants ARE live in R2 and are orphan bytes until a re-dispatch. Nothing ` +
          `was committed, so the manifest on ${PUBLISH_BRANCH} is untouched.`
      );
    }
    throw new StepError('PUBLISH_FAILED', `process-photo: ${error.message}`);
  }
  say(`  ${published.commit} on ${published.branch} after ${published.attempts} attempt(s)`);

  step(10, `deleting the staged object ${inputs.temp_key}`);
  let staleStagedObject = false;
  try {
    await deleteStagedObject(inputs.temp_key);
  } catch (error) {
    staleStagedObject = true;
    process.stderr.write(
      `process-photo: WARNING — the staged object could not be deleted: ${error.message}\n` +
        `  The record is committed and the bytes are live, so this run SUCCEEDED. The object at ` +
        `${inputs.temp_key} will be removed by the staging lifecycle rule.\n`
    );
  }

  return {
    outcome: 'PUBLISHED',
    summary:
      `${record.id} · commit ${published.commit} on ${published.branch} · ` +
      `${assets.descriptors.length} variant(s) live · ` +
      `staged object ${staleStagedObject ? 'NOT deleted (see warning above)' : 'deleted'}`,
  };
}

async function main() {
  let outcome = 'INTERNAL';
  let summary = '';
  try {
    const result = await processPhoto();
    outcome = result.outcome;
    summary = result.summary;
  } catch (error) {
    if (error instanceof StepError) {
      outcome = error.outcome;
      summary = error.message;
      process.stderr.write(`${error.message}\n`);
      if (error.detail) process.stderr.write(`${error.detail}\n`);
    } else {
      summary = String(error?.stack ?? error);
      process.stderr.write(`${summary}\n`);
    }
  }

  const { code, why } = OUTCOMES[outcome] ?? OUTCOMES.INTERNAL;
  say(`\nprocess-photo: OUTCOME=${outcome} exit=${code} — ${why}`);
  if (summary) say(`process-photo: ${summary.split('\n')[0]}`);
  return code;
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exit(await main());
}
