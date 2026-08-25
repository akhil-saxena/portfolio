#!/usr/bin/env node
/**
 * CONT-04 migration — move every remote photo URL in the manifest onto the canonical,
 * CDN-cached image origin, idempotently, and prove the addresses it produced resolve.
 *
 * Usage: node scripts/migrate-photo-origin.mjs [manifestPath]
 *        node scripts/migrate-photo-origin.mjs [manifestPath] --verify
 *        (manifest defaults to ./data/portfolio_images.json)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS IS A SCRIPT AND NOT A FIND-AND-REPLACE
 *
 * The legacy origin was a development-only R2 subdomain: no CDN cache, no WAF, rate limited.
 * Plan 02-02 measured the consequence — `cf-cache-status` is not merely MISS on that origin, it
 * is ABSENT ENTIRELY on two consecutive requests, with no `cache-control` and no `age`. All 39
 * gallery images therefore reach the origin on every single request, which makes a Lighthouse
 * number on the gallery unreproducible for reasons that have nothing to do with the code.
 *
 * This is a data migration of 156 committed values, so it is written as a migration:
 *
 *   - HOST SUBSTITUTION ONLY. Each value is parsed with `new URL()`, its origin replaced, and
 *     the URL reassembled. A whole-file string replace is forbidden: it would also rewrite the
 *     hostname anywhere else it appeared, it would not notice a malformed path, and it could not
 *     tell a URL from prose.
 *   - PATHNAMES ARE ASSERTED UNCHANGED. `/photos/<category>/<name>.webp` — the category segment
 *     is part of the path, so anything resembling a basename rewrite produces 156 addresses that
 *     all 404 while looking plausible in a diff.
 *   - THE COUNT IS ASSERTED. A migration that rewrote 152 of 156 and reported success is exactly
 *     the failure this refuses to permit.
 *   - `thumb` IS SKIPPED BY CONSTRUCTION. The four remote keys are iterated by name from
 *     `src/lib/image-origin.ts`. Note that `data:image/webp;base64,...` DOES parse as a URL, so
 *     an "iterate everything and skip what isn't a URL" filter would quietly rewrite the LQIP
 *     previews while appearing to be the careful option.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY IT IS IDEMPOTENT
 *
 * Re-running must be a no-op so the migration is safe to run again after a merge, and so the
 * claim "the data is migrated" is checkable at any time rather than only once. A value already
 * on the canonical origin is counted, not rewritten. A second run reports `0 rewritten` and
 * exits 0, and the file on disk is byte-identical.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY `--verify` EXISTS AND WHY IT REFUSES A SHORT LIST
 *
 * A host substitution that preserved the pathname is *very likely* correct. "Very likely" is not
 * evidence. `--verify` issues a real HEAD request for every one of the 156 URLs and requires 200
 * with `content-type: image/webp` on each.
 *
 * It exits 1 BEFORE issuing a single request if the list it assembled is not exactly the expected
 * length. A verifier that checked zero URLs and printed "all OK" is the vacuous-gate failure this
 * project has shipped repeatedly; a check that cannot fail when its input vanishes is not a check.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../src/lib/image-origin.ts';

/**
 * Both figures are asserted rather than discovered, so that a manifest which lost records — or
 * gained them without this script being updated — stops the run instead of silently migrating a
 * different amount of data than the plan reviewed.
 */
const EXPECTED_RECORDS = 39;
const EXPECTED_REMOTE_URLS = EXPECTED_RECORDS * REMOTE_URL_KEYS.length; // 39 x 4 = 156

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
if (manifest.length !== EXPECTED_RECORDS) {
  fail(
    `expected ${EXPECTED_RECORDS} records, found ${manifest.length}. The manifest changed under ` +
      `the migration; the 156-URL arithmetic no longer holds. Re-derive before proceeding.`
  );
}

/**
 * Collect every remote value with its identity, so failures can be named `<id>.<key>` rather than
 * reported as an anonymous count. Runs before anything is mutated or requested.
 */
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

/**
 * The guard-against-nothing, applied in BOTH modes. If the collected list is not exactly the
 * expected length, stop here — before a single byte is written and before a single request is
 * made. This is the difference between "found no violations" and "found nothing to look at".
 */
if (targets.length !== EXPECTED_REMOTE_URLS) {
  fail(
    `assembled ${targets.length} remote URLs, expected ${EXPECTED_REMOTE_URLS} ` +
      `(${EXPECTED_RECORDS} records x ${REMOTE_URL_KEYS.length} remote keys: ` +
      `${REMOTE_URL_KEYS.join(', ')}). Refusing to ${verifyMode ? 'verify' : 'migrate'} a partial set.`
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

    // Host substitution: keep pathname, search and hash exactly as they were.
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

  // Idempotent no-op: everything is already on the canonical origin.
  if (rewritten.length === 0) {
    console.log(`migrate-photo-origin: 0 rewritten — already migrated, nothing to do.`);
    console.log(`  manifest: ${manifestPath}`);
    console.log(
      `  ${alreadyCanonical.length} of ${EXPECTED_REMOTE_URLS} remote URLs already on ${IMAGE_ORIGIN}`
    );
    console.log(`  ${manifest.length} thumb data URIs untouched. File not written.`);
    process.exit(0);
  }

  // A partial state is an anomaly, not a resumable job. Refuse rather than half-fix it.
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
        // Retry transient network errors only; a final failure is reported, never swallowed.
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

  // Second guard-against-nothing: the loop must have visited every collected target. A worker
  // that threw and left the queue half-drained must not be able to report success.
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
