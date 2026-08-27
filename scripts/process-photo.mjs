#!/usr/bin/env node
/**
 * THE JOB. One staged upload becomes one committed, live photograph — in ten steps, in this
 * order.  (Phase 4, plan 04-09 — PIPE-01, PIPE-03, PIPE-04; criteria 1, 2 and 3.)
 *
 * ---------------------------------------------------------------------------------------------
 * WHERE THIS RUNS
 *
 * ACTIONS RUNNER ONLY, NEVER IN `workerd`. It spawns child processes and imports `sharp`
 * transitively. `.github/workflows/process-photos.yml` is its only caller.
 *
 * ---------------------------------------------------------------------------------------------
 * IT COMPOSES; IT DERIVES NOTHING OF ITS OWN
 *
 * Every rule it applies belongs to a module that already shipped and was tested on its own:
 *
 *   scripts/lib/dispatch-input.mjs (04-08)  what a dispatch may say
 *   scripts/lib/r2.mjs             (04-09)  get / put / delete, one credential path
 *   scripts/lib/photo-derive.mjs   (04-07)  variants, watermark, EXIF, the capture date
 *   scripts/lib/photo-record.mjs   (04-05)  the record, the upsert, the serialisation
 *   scripts/lib/git-publish.mjs    (04-06)  commit, push, re-derive and retry
 *   scripts/verify-photo-urls.mjs  (04-03)  liveness, over HEAD
 *   src/lib/photo-pipeline.ts      (04-02)  keys, URLs, ids, cache-control, limits
 *
 * The one thing it does own is stated where it is written: THE SLUG (see `slugFromStagingKey`),
 * because no module in the phase claimed it and `deriveAssets` requires one.
 *
 * ---------------------------------------------------------------------------------------------
 * THE ORDER, AND WHAT EACH POSITION BUYS
 *
 *    1  read the dispatch inputs and validate them          [nothing read, nothing written]
 *    2  GET the staged object out of R2                     [read-only]
 *    3  sharp: 4 variants + a 40px thumb; EXIF              [pure, in memory]
 *    4  hash each variant -> compose keys and URLs           [pure]
 *    5  read the manifest, build the record, upsert, write   [local write to the checkout only]
 *    6  `astro sync` — the whole content gate                [exit 1 stops the job]
 *    ---------------- NOTHING ABOVE THIS LINE HAS A SIDE EFFECT ----------------
 *    7  PUT the four variants to R2
 *    8  liveness: every URL in the new record, 200 image/webp
 *    9  git commit + push, with the bounded re-derive-and-retry loop
 *   10  DELETE the staged object                            [the once-only token]
 *
 * CRITERION 3 (partial failure). A crash before step 7 leaves the bucket, the manifest and `main`
 * byte-identical to how they started. A crash between 7 and 9 leaves ORPHAN BYTES in the bucket —
 * invisible, harmless, swept by the staging lifecycle rule — and never an orphan RECORD. The
 * forbidden direction is a manifest entry with no bytes behind it, which `04-RESEARCH.md` §6
 * measured that no existing gate can catch: a schema-valid record over four 404s passes
 * `astro sync` at exit 0 reporting `PASS · 40 photo(s)` and passes `gate:origin` too.
 *
 * CRITERION 2 (idempotence). Step 10 is LAST, which makes the `temp/` key a once-only token: a
 * re-run after a completed job finds nothing to fetch and exits 0 having done nothing. A re-run
 * after a step-7 failure redoes everything from a clean read, and `upsertRecord` replaces the
 * record in place rather than appending a second one (OD-4 A).
 *
 * CRITERION 1. Step 6 is the schema-valid guarantee, step 8 is the "the bytes really are in the
 * bucket" guarantee, step 9 is the commit.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY STEP 8 IS A `HEAD`, WHICH IS THE OPPOSITE OF THE CACHE RULE
 *
 * The standing rule in this phase is that every CACHE assertion must use GET, because
 * `curl -sSI` against this origin returns `cf-cache-status: DYNAMIC` and no `cache-control` at
 * all. That rule is right, and it is about a different question.
 *
 * LIVENESS asks "is the object in the bucket?". A HEAD is never served from the edge — that is
 * what `DYNAMIC` means — so it actually reaches R2. A GET can be answered `HIT` by the edge, and
 * therefore cannot distinguish "the object exists" from "the object was cached before the upload
 * silently failed". Step 8 runs immediately after writing to a MUTABLE key, so a GET-based
 * liveness check could report a previous upload's cached bytes as proof that this upload
 * succeeded — a false pass at the one step in this phase that cannot afford one.
 *
 * `scripts/verify-photo-urls.mjs` already encodes this as a frozen mode table whose runtime
 * invariant makes the module REFUSE TO LOAD if the table is edited into a mode that asserts on
 * `cache-control` over HEAD. Step 8 spawns that CLI in its default (liveness) mode and passes no
 * `--cache`, so the method is that table's, not this file's.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE GATE RUNS INSIDE THE RETRY LOOP AS WELL AS BEFORE IT  (hazard 16, measured by 04-06)
 *
 * `publishManifest` validates BYTES — a trailing newline, a string return — and never SEMANTICS.
 * 04-06 measured that a `rederive` returning stale content IS committed and pushed, silently
 * discarding a concurrent human record. The catching layer is `rederive` itself.
 *
 * And the re-derived record is genuinely a DIFFERENT record: `order` and `categoryOrder` are
 * computed from the maxima in the manifest that actually won, so a retry produces ranks the
 * step-6 run never saw. Validating only before the loop would let a retry publish a manifest that
 * never passed the gate. So `applyAndGate()` is called from step 6 AND from inside `rederive`.
 *
 * Step 8 is NOT re-run there, and that is deliberate rather than an omission: a re-derive changes
 * only the two rank integers. Every URL in the record is composed from the variant content
 * hashes, which are unchanged, so the objects step 8 already proved live are the same objects.
 *
 * ---------------------------------------------------------------------------------------------
 * SHELL DISCIPLINE
 *
 * Every child process is spawned with an argv ARRAY and never a shell string (T-04-45).
 * `temp_key`, `title` and `alt` are attacker-influenced text and must never reach a shell. The
 * workflow passes them through `env:` for the same reason: `${{ inputs.alt }}` inside a `run:`
 * block is substituted before bash starts, which makes caller-supplied text into shell source.
 *
 * ---------------------------------------------------------------------------------------------
 * SIX DISTINGUISHABLE OUTCOMES  (T-04-48)
 *
 * `gh run view` is the only diagnostic surface Akhil has, so the job prints ONE final line naming
 * its outcome and exits with a code that means only that thing. See `OUTCOMES` below.
 */

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

/**
 * The checkout root, derived from THIS FILE rather than from `process.cwd()`. A job whose working
 * directory depends on how the step was written is one that breaks the day someone adds a
 * `working-directory:`.
 */
const REPO_ROOT = resolve(HERE, '..');

/**
 * The one file this job commits. It is repo-relative because `publishManifest` requires that (it
 * is the ONLY path staged, T-04-23) and resolves it inside the repository itself.
 *
 * There is no shared constant for this path: `scripts/verify-photo-urls.mjs` keeps its own
 * private default and `git-publish.mjs` takes it as an argument. Recorded rather than glossed —
 * if a third writer appears, this is the moment to lift it into `photo-pipeline.ts`.
 */
const MANIFEST_RELATIVE = 'data/portfolio_images.json';
const MANIFEST_PATH = join(REPO_ROOT, MANIFEST_RELATIVE);

/** The content gate, spawned. See "the scripts cannot import the schema" in the plan's context. */
const ASTRO_BIN = join(REPO_ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');

/** The liveness verifier, spawned in its default (HEAD) mode. */
const VERIFIER = join(REPO_ROOT, 'scripts', 'verify-photo-urls.mjs');

/**
 * Every way this job can end, and the exit code that means ONLY that.
 *
 * `STAGED_ABSENT` is 0 on purpose and is criterion 2's mechanism: re-running a completed job is
 * a legitimate, common operator action (a browser back button, a re-dispatch after a green run),
 * and it must be a clean no-op rather than a red run that teaches Akhil to ignore red runs.
 */
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

/** Carries the outcome from wherever it is discovered up to `main`. */
class StepError extends Error {
  /** @param {keyof OUTCOMES} outcome @param {string} message @param {string} [detail] */
  constructor(outcome, message, detail = '') {
    super(message);
    this.name = 'StepError';
    this.outcome = outcome;
    this.detail = detail;
  }
}

/**
 * `console.log`/`console.info` print NOTHING under this repository's vitest setup (measured: 0
 * occurrences against 1 for `process.stdout.write`). The integration suite reads this job's
 * output, so both the runner and the test have to be able to see it.
 */
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

/** Today, in UTC. Never local getters — hazard 18: a 23:59Z capture dates a day late in +05:30. */
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
    // A gate that cannot be run is a FAILURE, never a skip. This is the whole reason the job
    // installs dependencies before it reads a single byte.
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

/* ============================================================================================ *
 * THE JOB.
 * ============================================================================================ */

async function processPhoto() {
  /* -- 1. the dispatch inputs ---------------------------------------------------------------- */
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

  /* -- 2. the staged object ------------------------------------------------------------------ */
  step(2, `reading the staged object ${inputs.temp_key}`);
  let staged;
  try {
    staged = await getStagedObject(inputs.temp_key);
  } catch (error) {
    throw new StepError('STAGED_READ_FAILED', `process-photo: ${error.message}`);
  }
  if (staged === null) {
    // NOT an error. Step 10 deletes the staged object last, so its absence means a previous run
    // of this exact dispatch completed. Criterion 2.
    return {
      outcome: 'STAGED_ABSENT',
      summary:
        `nothing staged at ${inputs.temp_key}. This is the expected result of re-running a ` +
        `completed job: the staged object is deleted LAST, which makes it a once-only token. ` +
        `Nothing was derived, uploaded or committed.`,
    };
  }
  if (staged.size > MAX_SOURCE_BYTES) {
    // T-04-42, on the DOWNLOADED LENGTH and before the buffer reaches sharp. `deriveAssets`
    // asserts the same cap; this one is here so a bomb is refused before it is handed to a
    // native decoder at all, and both read the same constant.
    throw new StepError(
      'DERIVE_FAILED',
      `process-photo: the staged object is ${staged.size} bytes, over the ${MAX_SOURCE_BYTES} ` +
        `byte cap. Refused before the decoder was reached.`
    );
  }
  say(`  ${staged.size} byte(s) read`);

  /* -- 3 and 4. derive, hash, compose --------------------------------------------------------- */
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

  /* -- 5. the candidate manifest -------------------------------------------------------------- */
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

  /* -- 6. the content gate -------------------------------------------------------------------- */
  step(6, 'running the full content gate over the candidate (astro sync)');
  await applyAndGate(candidateContent, previousContent, 'step 6');

  /* ==========================================================================================
   *              NOTHING ABOVE THIS LINE HAS A SIDE EFFECT
   *
   * Steps 1-6 read R2 and write one file in this checkout, and that file has just been restored
   * on every path that does not reach here. Below this line the job writes to a public bucket
   * and pushes to the branch the site ships from. DO NOT MOVE AN UPLOAD ABOVE IT.
   * ========================================================================================== */

  /* -- 7. the upload -------------------------------------------------------------------------- */
  step(7, `uploading ${assets.descriptors.length} variant(s) to R2`);
  const uploaded = [];
  try {
    // SEQUENTIAL, deliberately. A partial upload must be diagnosable from the run log alone, and
    // "the first two of four landed" is only a true statement if they were attempted in order.
    for (const descriptor of assets.descriptors) {
      await putVariant(descriptor);
      uploaded.push(descriptor.key);
    }
  } catch (error) {
    // The manifest goes back to its pre-run bytes. Steps 7 and 8 have taken no git action, so
    // this is safe here and deliberately NOT done for a step-9 failure: `publishManifest` may
    // already have committed or reset, and writing over that would leave the tree dirty against
    // its own HEAD.
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

  /* -- 8. liveness, over HEAD ------------------------------------------------------------------ */
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

  /* -- 9. the commit ---------------------------------------------------------------------------*/
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
      /**
       * THE CATCHING LAYER. `publishManifest` validates bytes and never semantics, so everything
       * that makes the re-derived manifest CORRECT has to happen here: the record is rebuilt
       * against the manifest that actually won (its ranks move), the upsert is re-run, and the
       * full content gate runs again over the result. A throw from here aborts the loop without
       * consuming the budget and without pushing anything.
       */
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

  /* -- 10. spend the once-only token ------------------------------------------------------------ */
  step(10, `deleting the staged object ${inputs.temp_key}`);
  let staleStagedObject = false;
  try {
    await deleteStagedObject(inputs.temp_key);
  } catch (error) {
    // A WARNING, NOT A FAILURE, and the reasoning is worth writing down: the record is committed
    // and the bytes are live, so the job has done everything it exists to do. Failing here would
    // invite a re-dispatch that can only no-op, and an undeleted staged object is swept by the
    // lifecycle rule within STAGING_EXPIRE_DAYS.
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

/* ============================================================================================ *
 * main — one line at the end naming the outcome, because `gh run view` is the only surface.
 * ============================================================================================ */

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

/**
 * CLI guard, compared by resolved path. `slugFromStagingKey` is exported for testing, and an
 * import that also RAN THE JOB would be a side effect nobody could have predicted from the
 * import statement.
 */
const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exit(await main());
}
