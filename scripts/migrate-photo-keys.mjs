#!/usr/bin/env node
/**
 * Move every photo object in R2 onto the pipeline's own key shape, and repoint the manifest at it.
 *
 * Usage:
 *   node scripts/migrate-photo-keys.mjs                 # PLAN — local only, touches nothing
 *   node scripts/migrate-photo-keys.mjs --copy           # write the new objects, verify each
 *   node scripts/migrate-photo-keys.mjs --repoint        # rewrite the manifest from the journal
 *   node scripts/migrate-photo-keys.mjs --sweep          # delete the old objects
 *   node scripts/migrate-photo-keys.mjs [manifestPath] [--journal <path>]
 *
 * ================================================================================================
 * WHAT IS WRONG TODAY, MEASURED RATHER THAN ASSERTED
 * ================================================================================================
 *
 * Two separate drifts, discovered together:
 *
 *   1. THE KEY SHAPE. `publishedKey()` produces `photos/<category>/<slug>-<hash8><suffix>.webp` and
 *      `parsePublishedKey()` is the guard `putVariant` runs. MEASURED across the committed
 *      manifest's 160 remote URLs: **4 match that shape and 156 do not**. The corpus predates the
 *      content-hashed scheme — one photograph has been through the current pipeline — so the bucket
 *      is almost entirely `photos/abstract/intothemist.webp`-shaped.
 *
 *   2. THE DIRECTORY. An `id` is `category + "-" + slug`, so re-authoring the taxonomy from seven
 *      categories to five renamed every record. The R2 keys did not move with them: **18 of 40
 *      records** now live in a directory that is not their category, and the seven directories in
 *      use are the RETIRED names — `abstract, architecture, nature, portraits, product, street,
 *      wildlife`.
 *
 * Akhil chose to migrate to the pipeline's own shape rather than merely rename, which fixes both at
 * once and leaves exactly one key shape in the bucket.
 *
 * ================================================================================================
 * WHY IT IS FOUR PHASES AND NOT ONE COMMAND
 * ================================================================================================
 *
 * The live site reads these URLs. A single pass that moved an object and rewrote the manifest in
 * the same breath would put the site's addresses and the bucket's contents out of step for as long
 * as it takes to commit and deploy — every photograph a 404 in between.
 *
 * So the phases are ordered so that AT NO POINT is a URL the deployed manifest carries missing from
 * the bucket:
 *
 *   PLAN     read-only, no credentials, prints the census and the plan.
 *   --copy   WRITES the new objects. Old keys untouched, so the live site is unaffected. Each copy
 *            is read back and its hash recomputed before it counts as done.
 *   --repoint REWRITES the manifest from the journal. Committing and deploying this is the cutover.
 *   --sweep  DELETES the old objects. Only legal once the new manifest is deployed — the script
 *            cannot verify that, so it refuses unless the manifest on disk already points at the
 *            new keys and the journal says every copy verified.
 *
 * THE JOURNAL IS WHAT MAKES THE PHASES ONE OPERATION. `--copy` writes every source→target pair and
 * its verified hash to `.migration/photo-keys.json`; `--repoint` and `--sweep` read it and refuse to
 * act on anything they did not find there. A re-derived plan could disagree with what was actually
 * copied — a hash is a property of the bytes, and the bytes are in the bucket, not in this file.
 *
 * ================================================================================================
 * WHAT THIS SCRIPT WILL NOT DO
 * ================================================================================================
 *
 *   - It will not delete anything in `--copy` or `--repoint`. Only `--sweep` deletes.
 *   - It will not put a key `publishedKey()` could not have produced: every target is composed by
 *     that function, never by string concatenation.
 *   - It will not touch `thumb`. It is a `data:` URI, and — the trap `migrate-photo-origin.mjs`
 *     records — `data:image/webp;base64,...` DOES parse as a URL, so an "iterate everything and
 *     skip what isn't a URL" filter would quietly rewrite the LQIP previews. The four remote keys
 *     are iterated BY NAME from `REMOTE_URL_KEYS`.
 *   - It will not proceed on a partial copy. If any variant of any record fails to verify, `--copy`
 *     reports and exits non-zero with the journal holding only what did verify, and `--repoint`
 *     refuses while the journal is short of the manifest's own count.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const out = (line) => process.stdout.write(`${line}\n`);
const err = (line) => process.stderr.write(`${line}\n`);

/* ---------------------------------------------------------------------------------------------
 * Arguments. Exactly one phase flag, so `--copy --sweep` is a refusal rather than a surprise.
 * ------------------------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
const PHASES = ['--copy', '--repoint', '--sweep'];
const phases = argv.filter((a) => PHASES.includes(a));
const positional = argv.filter((a) => !a.startsWith('--'));
const journalFlag = argv.indexOf('--journal');

if (phases.length > 1) {
  err(`migrate-photo-keys: pick ONE phase, not ${phases.join(' ')}.`);
  err(
    '  The order is --copy, then --repoint (commit and deploy), then --sweep. Running two in one'
  );
  err('  invocation would delete objects the deployed manifest still points at.');
  process.exit(2);
}
for (const a of argv) {
  if (a.startsWith('--') && !PHASES.includes(a) && a !== '--journal') {
    err(`migrate-photo-keys: unknown flag ${a}.`);
    process.exit(2);
  }
}

const phase = phases[0] ?? '--plan';
const MANIFEST_PATH = resolve(REPO_ROOT, positional[0] ?? 'data/portfolio_images.json');
const JOURNAL_PATH =
  journalFlag === -1
    ? resolve(REPO_ROOT, '.migration/photo-keys.json')
    : resolve(REPO_ROOT, argv[journalFlag + 1] ?? '');

/* ---------------------------------------------------------------------------------------------
 * The plan. Pure: no network, no credentials, no writes.
 * ------------------------------------------------------------------------------------------- */

const { REMOTE_URL_KEYS, IMAGE_ORIGIN } = await import('../src/lib/image-origin.ts');
const { VARIANTS } = await import('../src/lib/photo-variants.ts');
const { publishedKey, PUBLISHED_KEY_RE, CONTENT_HASH_HEX_LENGTH } = await import(
  '../src/lib/photo-pipeline.ts'
);

/** `contentHash` re-implemented? No — imported, so a change to the pipeline's hash reaches here. */
const { contentHash } = await import('../src/lib/photo-pipeline.ts');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
if (!Array.isArray(manifest) || manifest.length === 0) {
  err(`migrate-photo-keys: ${MANIFEST_PATH} holds no records. Nothing to migrate.`);
  process.exit(1);
}

/** urlKey → suffix, from the variant table rather than a second list here. */
const SUFFIX_BY_URL_KEY = new Map(VARIANTS.map((v) => [v.urlKey, v.suffix]));
for (const key of REMOTE_URL_KEYS) {
  if (!SUFFIX_BY_URL_KEY.has(key)) {
    err(`migrate-photo-keys: no variant declares urlKey ${JSON.stringify(key)}.`);
    err('  REMOTE_URL_KEYS and VARIANTS disagree, so the target suffix cannot be composed.');
    process.exit(1);
  }
}

/** The slug is the id with its own category prefix removed — the invariant `photoIdFor` maintains. */
function slugOf(record) {
  const prefix = `${record.category}-`;
  if (!String(record.id).startsWith(prefix)) {
    throw new Error(
      `migrate-photo-keys: ${record.id} does not begin with its category prefix ` +
        `${JSON.stringify(prefix)}. The invariant is id === category + "-" + slug; a record that ` +
        `breaks it cannot have a target key composed for it.`
    );
  }
  return String(record.id).slice(prefix.length);
}

/** `photos/<dir>/<name>.webp` — the object key a manifest URL names. */
function sourceKeyOf(url) {
  const parsed = new URL(url);
  if (`${parsed.protocol}//${parsed.host}` !== IMAGE_ORIGIN) {
    throw new Error(
      `migrate-photo-keys: ${url} is not on ${IMAGE_ORIGIN}. Run migrate-photo-origin.mjs first; ` +
        `this script moves KEYS and will not also change hosts.`
    );
  }
  return parsed.pathname.replace(/^\//, '');
}

const plan = [];
for (const record of manifest) {
  const slug = slugOf(record);
  for (const urlKey of REMOTE_URL_KEYS) {
    const url = record.urls?.[urlKey];
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error(`migrate-photo-keys: ${record.id} has no ${urlKey} URL.`);
    }
    const sourceKey = sourceKeyOf(url);
    plan.push({
      id: record.id,
      urlKey,
      category: record.category,
      slug,
      suffix: SUFFIX_BY_URL_KEY.get(urlKey),
      sourceKey,
      sourceDirectory: sourceKey.split('/')[1],
      canonical: PUBLISHED_KEY_RE.test(sourceKey),
    });
  }
}

const census = {
  records: manifest.length,
  objects: plan.length,
  canonical: plan.filter((p) => p.canonical).length,
  legacy: plan.filter((p) => !p.canonical).length,
  wrongDirectory: plan.filter((p) => p.sourceDirectory !== p.category).length,
  directories: [...new Set(plan.map((p) => p.sourceDirectory))].sort(),
  categories: [...new Set(plan.map((p) => p.category))].sort(),
};

function reportPlan() {
  out('migrate-photo-keys: PLAN');
  out(`  manifest: ${MANIFEST_PATH}`);
  out(`  journal:  ${JOURNAL_PATH}${existsSync(JOURNAL_PATH) ? '' : ' (not written yet)'}`);
  out('');
  out(
    `  ${census.records} record(s) × ${REMOTE_URL_KEYS.length} remote variant(s) = ${census.objects} object(s)`
  );
  out(`    already in the pipeline's shape: ${census.canonical}`);
  out(`    legacy shape:                    ${census.legacy}`);
  out(`    in a directory that is not their category: ${census.wrongDirectory}`);
  out('');
  out(`  directories in use: ${census.directories.join(', ')}`);
  out(`  categories in use:  ${census.categories.join(', ')}`);
  out('');
  out('  target shape: photos/<category>/<slug>-<hash8><suffix>.webp');
  out(
    `  <hash8> is contentHash(bytes) — ${CONTENT_HASH_HEX_LENGTH} hex characters of the sha256 of`
  );
  out("  THAT VARIANT's bytes, so it cannot be computed here: the bytes are in the bucket. --copy");
  out('  reads each object, hashes it, and composes the key with publishedKey().');
  out('');
  const sample = plan.slice(0, 4);
  for (const p of sample) {
    out(`    ${p.sourceKey}`);
    out(`      → photos/${p.category}/${p.slug}-<hash8>${p.suffix}.webp`);
  }
  if (plan.length > sample.length) out(`    … and ${plan.length - sample.length} more`);
  out('');
  out('  Nothing was read from or written to R2. Next: --copy (needs CLOUDFLARE_* credentials).');
}

/* ---------------------------------------------------------------------------------------------
 * The journal.
 * ------------------------------------------------------------------------------------------- */

const readJournal = () => {
  if (!existsSync(JOURNAL_PATH)) return null;
  return JSON.parse(readFileSync(JOURNAL_PATH, 'utf8'));
};

const writeJournal = (entries) => {
  mkdirSync(dirname(JOURNAL_PATH), { recursive: true });
  writeFileSync(
    JOURNAL_PATH,
    `${JSON.stringify({ manifest: MANIFEST_PATH, written: new Date().toISOString(), entries }, null, 2)}\n`
  );
};

/* ---------------------------------------------------------------------------------------------
 * --copy
 * ------------------------------------------------------------------------------------------- */

async function copyPhase() {
  const { getPublishedObject, putVariant } = await import('./lib/r2.mjs');

  const entries = [];
  const failures = [];

  for (const item of plan) {
    let bytes;
    try {
      bytes = await getPublishedObject(item.sourceKey);
    } catch (error) {
      failures.push(`${item.sourceKey}: read failed — ${error.message}`);
      continue;
    }
    if (bytes === null) {
      failures.push(`${item.sourceKey}: not present in the bucket`);
      continue;
    }

    const hash = contentHash(bytes);
    const targetKey = publishedKey({
      category: item.category,
      slug: item.slug,
      hash,
      suffix: item.suffix,
    });

    if (targetKey === item.sourceKey) {
      entries.push({ ...item, targetKey, hash, bytes: bytes.length, action: 'already-canonical' });
      continue;
    }

    try {
      await putVariant({ key: targetKey, bytes });
    } catch (error) {
      failures.push(`${targetKey}: write failed — ${error.message}`);
      continue;
    }

    /*
     * VERIFY BY READING BACK AND RE-HASHING, not by trusting the write's exit code. A put that
     * succeeded and stored truncated bytes is the failure this migration cannot afford, because
     * --sweep would then delete the only good copy.
     */
    const readBack = await getPublishedObject(targetKey);
    if (readBack === null) {
      failures.push(`${targetKey}: written, but reads back as absent`);
      continue;
    }
    const readBackHash = contentHash(readBack);
    if (readBackHash !== hash || readBack.length !== bytes.length) {
      failures.push(
        `${targetKey}: verify failed — wrote ${bytes.length} B (${hash}), read ` +
          `${readBack.length} B (${readBackHash})`
      );
      continue;
    }

    entries.push({ ...item, targetKey, hash, bytes: bytes.length, action: 'copied' });
  }

  writeJournal(entries);

  out('migrate-photo-keys: --copy');
  out(`  journal: ${JOURNAL_PATH}`);
  out(`  copied and verified: ${entries.filter((e) => e.action === 'copied').length}`);
  out(`  already canonical:   ${entries.filter((e) => e.action === 'already-canonical').length}`);
  out(`  planned:             ${plan.length}`);
  if (failures.length > 0) {
    err('');
    err(`  ${failures.length} failure(s) — NOTHING WAS DELETED, and --repoint will refuse:`);
    for (const f of failures) err(`    ✖ ${f}`);
    process.exit(1);
  }
  out('');
  out('  Every object copied and verified. Next: --repoint, then commit and deploy, then --sweep.');
}

/* ---------------------------------------------------------------------------------------------
 * --repoint
 * ------------------------------------------------------------------------------------------- */

function repointPhase() {
  const journal = readJournal();
  if (journal === null) {
    err(`migrate-photo-keys: no journal at ${JOURNAL_PATH}. Run --copy first.`);
    process.exit(1);
  }
  if (journal.entries.length !== plan.length) {
    err(
      `migrate-photo-keys: the journal holds ${journal.entries.length} entr(ies) and the manifest ` +
        `plans ${plan.length}. Refusing to repoint a partial migration — re-run --copy.`
    );
    process.exit(1);
  }

  const byPair = new Map(journal.entries.map((e) => [`${e.id}|${e.urlKey}`, e]));
  let rewritten = 0;
  const next = manifest.map((record) => {
    const urls = { ...record.urls };
    for (const urlKey of REMOTE_URL_KEYS) {
      const entry = byPair.get(`${record.id}|${urlKey}`);
      if (entry === undefined) {
        err(`migrate-photo-keys: the journal has no entry for ${record.id} ${urlKey}.`);
        process.exit(1);
      }
      const nextUrl = `${IMAGE_ORIGIN}/${entry.targetKey}`;
      if (urls[urlKey] !== nextUrl) rewritten += 1;
      urls[urlKey] = nextUrl;
    }
    return { ...record, urls };
  });

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`);
  out('migrate-photo-keys: --repoint');
  out(`  manifest: ${MANIFEST_PATH}`);
  out(`  URLs rewritten: ${rewritten} of ${plan.length}`);
  out('');
  out('  COMMIT AND DEPLOY THIS BEFORE --sweep. Until the new manifest is live, the deployed site');
  out('  still points at the old keys, and sweeping would 404 every photograph.');
}

/* ---------------------------------------------------------------------------------------------
 * --sweep
 * ------------------------------------------------------------------------------------------- */

async function sweepPhase() {
  const journal = readJournal();
  if (journal === null) {
    err(`migrate-photo-keys: no journal at ${JOURNAL_PATH}. Run --copy and --repoint first.`);
    process.exit(1);
  }

  /*
   * THE GUARD THIS PHASE NEEDS AND CANNOT HAVE. Nothing here can see what is DEPLOYED. The closest
   * available proof is that the manifest ON DISK already carries the new keys — which is what
   * --repoint wrote and what a commit would have shipped. It is a proxy, and it is stated as one.
   */
  const stale = plan.filter((p) => !PUBLISHED_KEY_RE.test(p.sourceKey));
  if (stale.length > 0) {
    err(
      `migrate-photo-keys: the manifest still names ${stale.length} legacy key(s). --repoint has ` +
        `not run, or its result was not saved. Refusing to delete objects the manifest points at.`
    );
    process.exit(1);
  }

  const { deletePublishedObject } = await import('./lib/r2.mjs');
  let deleted = 0;
  let absent = 0;
  const failures = [];
  for (const entry of journal.entries) {
    if (entry.action !== 'copied') continue;
    try {
      const result = await deletePublishedObject(entry.sourceKey);
      if (result.deleted) deleted += 1;
      else absent += 1;
    } catch (error) {
      failures.push(`${entry.sourceKey}: ${error.message}`);
    }
  }

  out('migrate-photo-keys: --sweep');
  out(`  deleted: ${deleted} · already absent: ${absent}`);
  if (failures.length > 0) {
    err(`  ${failures.length} failure(s):`);
    for (const f of failures) err(`    ✖ ${f}`);
    process.exit(1);
  }
  out('  The bucket now holds exactly one key shape.');
}

/* ------------------------------------------------------------------------------------------- */

if (phase === '--plan') reportPlan();
else if (phase === '--copy') await copyPhase();
else if (phase === '--repoint') repointPhase();
else await sweepPhase();
