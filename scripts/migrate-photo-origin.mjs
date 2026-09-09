#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../src/lib/image-origin.ts';

const MIN_RECORDS = 39;

const THUMB_PREFIX = 'data:image/webp;base64,';

const args = process.argv.slice(2);
const verifyMode = args.includes('--verify');
const manifestArg = args.find((a) => !a.startsWith('--')) ?? './data/portfolio_images.json';
const manifestPath = path.resolve(process.cwd(), manifestArg);

const fail = (lines) => {
  for (const line of [].concat(lines)) console.error(`migrate-photo-origin: ${line}`);
  process.exit(1);
};

if (!fs.existsSync(manifestPath)) {
  fail(`no manifest at ${manifestPath} — refusing to report success with nothing to migrate.`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`${manifestPath} is not valid JSON — ${error.message}`);
}

if (!Array.isArray(manifest)) {
  fail(`${manifestPath} is not a top-level array — the manifest shape changed.`);
}
if (manifest.length < MIN_RECORDS) {
  fail(
    `found ${manifest.length} records, expected at least ${MIN_RECORDS}. The CONT-04 migration ` +
      `cohort was ${MIN_RECORDS} records; a manifest that lost one is a data loss, not a smaller ` +
      `job, and a shorter manifest trivially holds fewer URLs to get wrong. Refusing to run.`
  );
}

const EXPECTED_REMOTE_URLS = manifest.length * REMOTE_URL_KEYS.length;

const targets = [];
const collectionErrors = [];

for (const record of manifest) {
  const id = record?.id ?? '(record with no id)';

  const thumb = record?.urls?.thumb;
  if (typeof thumb !== 'string' || !thumb.startsWith(THUMB_PREFIX)) {
    collectionErrors.push(`${id}.thumb is not a "${THUMB_PREFIX}..." data URI — refusing to run.`);
  }

  for (const key of REMOTE_URL_KEYS) {
    const value = record?.urls?.[key];
    if (typeof value !== 'string') {
      collectionErrors.push(`${id}.${key} is missing or not a string.`);
      continue;
    }
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      collectionErrors.push(`${id}.${key} is not a parseable URL: ${value}`);
      continue;
    }
    if (parsed.protocol !== 'https:') {
      collectionErrors.push(`${id}.${key} is not https: ${value}`);
      continue;
    }
    targets.push({ record, id, key, value, parsed });
  }
}

if (collectionErrors.length > 0) fail(collectionErrors);

if (targets.length === 0 || targets.length !== EXPECTED_REMOTE_URLS) {
  fail(
    `assembled ${targets.length} remote URLs, expected ${EXPECTED_REMOTE_URLS} ` +
      `(${manifest.length} records x ${REMOTE_URL_KEYS.length} remote keys: ` +
      `${REMOTE_URL_KEYS.join(', ')}), and it must be non-zero. ` +
      `Refusing to ${verifyMode ? 'verify' : 'migrate'} a partial set.`
  );
}

if (verifyMode) {
  await runVerify();
} else {
  runMigrate();
}

function runMigrate() {
  const rewritten = [];
  const alreadyCanonical = [];
  const pathnameDrift = [];

  for (const target of targets) {
    if (target.parsed.origin === IMAGE_ORIGIN) {
      alreadyCanonical.push(target);
      continue;
    }

    const next = new URL(target.parsed.href);
    const canonical = new URL(IMAGE_ORIGIN);
    next.protocol = canonical.protocol;
    next.host = canonical.host;
    next.port = canonical.port;

    if (next.pathname !== target.parsed.pathname) {
      pathnameDrift.push(
        `${target.id}.${target.key}: ${target.parsed.pathname} -> ${next.pathname}`
      );
      continue;
    }
    target.next = next.href;
    rewritten.push(target);
  }

  if (pathnameDrift.length > 0) {
    fail(['host substitution altered a pathname — nothing written:', ...pathnameDrift]);
  }

  if (rewritten.length === 0) {
    console.log(`migrate-photo-origin: 0 rewritten — already migrated, nothing to do.`);
    console.log(`  manifest: ${manifestPath}`);
    console.log(
      `  ${alreadyCanonical.length} of ${EXPECTED_REMOTE_URLS} remote URLs already on ${IMAGE_ORIGIN}`
    );
    console.log(`  ${manifest.length} thumb data URIs untouched. File not written.`);
    process.exit(0);
  }

  if (rewritten.length !== EXPECTED_REMOTE_URLS) {
    fail(
      `would rewrite ${rewritten.length} URLs, expected ${EXPECTED_REMOTE_URLS} ` +
        `(${alreadyCanonical.length} were already canonical). A partially migrated manifest is ` +
        `not a state this script will silently complete — inspect it. Nothing written.`
    );
  }

  for (const target of rewritten) target.record.urls[target.key] = target.next;

  const serialised = `${JSON.stringify(manifest, null, 2)}\n`;
  fs.writeFileSync(manifestPath, serialised);

  console.log(`migrate-photo-origin: ${rewritten.length} rewritten.`);
  console.log(`  manifest: ${manifestPath}`);
  console.log(`  origin:   ${IMAGE_ORIGIN}  (from src/lib/image-origin.ts)`);
  console.log(`  keys:     ${REMOTE_URL_KEYS.join(', ')}  —  thumb skipped by construction`);
  console.log(`  ${manifest.length} thumb data URIs untouched; every pathname preserved verbatim.`);
}

async function runVerify() {
  const CONCURRENCY = 8;
  const ATTEMPTS = 3;
  const failures = [];
  let checked = 0;

  const head = async (target) => {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const response = await fetch(target.value, { method: 'HEAD', redirect: 'follow' });
        const contentType = response.headers.get('content-type') ?? '(none)';
        if (response.status !== 200) {
          failures.push(`${target.id}.${target.key}: HTTP ${response.status} — ${target.value}`);
        } else if (!contentType.toLowerCase().startsWith('image/webp')) {
          failures.push(
            `${target.id}.${target.key}: content-type "${contentType}" — ${target.value}`
          );
        }
        checked++;
        return;
      } catch (error) {
        if (attempt === ATTEMPTS) {
          failures.push(`${target.id}.${target.key}: network error — ${error.message}`);
          checked++;
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  };

  const queue = [...targets];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    let next = queue.pop();
    while (next) {
      await head(next);
      next = queue.pop();
    }
  });
  const started = Date.now();
  await Promise.all(workers);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (checked !== EXPECTED_REMOTE_URLS) {
    fail(
      `checked ${checked} URLs but assembled ${EXPECTED_REMOTE_URLS} — the verification loop did ` +
        `not visit every target, so its result means nothing.`
    );
  }

  if (failures.length > 0) {
    fail([
      `${failures.length} of ${checked} URLs did not return 200 image/webp:`,
      ...failures.map((f) => `  x ${f}`),
    ]);
  }

  console.log(`migrate-photo-origin --verify: PASS`);
  console.log(`  manifest: ${manifestPath}`);
  console.log(`  checked ${checked} of ${EXPECTED_REMOTE_URLS} URLs in ${elapsed}s`);
  console.log(`  every one returned HTTP 200 with content-type image/webp from ${IMAGE_ORIGIN}`);
}
