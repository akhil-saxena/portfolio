#!/usr/bin/env node
/**
 * PIPE-04 — does the manifest tell the truth about the bucket?
 *
 * Usage: node scripts/verify-photo-urls.mjs [manifestPath]
 *        node scripts/verify-photo-urls.mjs [manifestPath] --only <photoId>
 *        node scripts/verify-photo-urls.mjs [manifestPath] --cache
 *        node scripts/verify-photo-urls.mjs [manifestPath] --concurrency 8
 *        (manifest defaults to ./data/portfolio_images.json)
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS CATCHES THAT NOTHING ELSE IN THIS REPOSITORY CAN
 *
 * A manifest record can be entirely well-formed and still be a lie. `04-RESEARCH.md` §6 measured
 * it by planting one: a 40th record with the correct origin, a slug matching the regex, real-looking
 * `alt`, `order: 40`, `categoryOrder: 9` and a valid thumb prefix, whose four R2 objects DO NOT
 * EXIST.
 *
 *     npx astro sync   -> EXIT=0
 *     [content-gate] content set: PASS · checked: 40 photo(s) … rules run: RI-1…RI-6
 *
 *     curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
 *       https://images.akhilsaxena.com/photos/nature/newphoto.webp
 *     -> 404 text/html
 *
 * `npm run gate:origin` passes the same record, because it checks each URL's ORIGIN and never its
 * liveness. `PhotoSchema`'s `remoteUrl` refinement does exactly the same. So the build is green,
 * `astro sync` reports PASS over 40 photos, and the site ships four broken images. This script is
 * the only thing in the repository that can see that, and it is why PIPE-04 exists.
 *
 * It is a generalisation of `scripts/migrate-photo-origin.mjs --verify`, which does the same
 * fetching but is pinned to the migration cohort: that script asserts EXACTLY 39 records and so
 * stops working the day a 40th lands. Its liveness half is what became this file.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE COUNT IS DERIVED AND NOT ASSERTED
 *
 * `migrate-photo-origin.mjs` hardcodes `EXPECTED_RECORDS = 39`, and that is correct THERE: a
 * migration is a one-off over a reviewed cohort, and a manifest that changed size underneath it
 * invalidates the arithmetic the plan approved. This verifier is the opposite — it is a standing
 * gate that must still work at 40, 200 and 2000 records, and the Phase 4 pipeline's whole job is
 * to add records. A constant here would make the gate fail on correct work on the first upload.
 *
 * So the expected URL count is computed at run time as
 *
 *     records.length * REMOTE_URL_KEYS.length
 *
 * from the manifest actually read. That trades one protection for another, and the trade is only
 * safe because the floors below are absolute: a derived count over an empty list is zero, and
 * "zero targets" must be a REFUSAL, never a pass. A verifier that checked nothing and printed
 * "all OK" is the vacuous-gate failure this project has shipped repeatedly — Phase 3 alone
 * shipped ten gates that could not fail. Hence, before a single request is issued:
 *
 *   - a missing manifest, invalid JSON, or a non-array top level is a failure naming the path;
 *   - zero records is a failure, not a pass;
 *   - the assembled target count must equal records.length * REMOTE_URL_KEYS.length AND be > 0;
 *   - `--only <id>` matching no record is a failure NAMING THE ID. This one is load-bearing for
 *     04-10, whose criterion-1 gate depends on an unknown id being a refusal rather than a silent
 *     pass — that is what makes a live-run gate unable to go green over a run that never happened.
 *
 * ---------------------------------------------------------------------------------------------
 * THE HEAD/GET RULE — MEASURED, NOT ASSUMED
 *
 * Liveness is checked with HEAD. Cache headers CANNOT be, and this script makes the wrong
 * combination unrepresentable rather than merely discouraged.
 *
 * `04-RESEARCH.md` §4 measured it over three objects x three tries, and it reproduced again on
 * 2026-08-27 while this file was being written:
 *
 *     curl -sSI https://images.akhilsaxena.com/photos/abstract/intothemist.webp
 *     -> HTTP/2 200 · content-type: image/webp · cf-cache-status: DYNAMIC · NO cache-control
 *
 *     curl -sS -o /dev/null -D - https://images.akhilsaxena.com/photos/abstract/intothemist.webp
 *     -> HTTP/2 200 · content-type: image/webp · cf-cache-status: REVALIDATED
 *                   · cache-control: max-age=14400
 *
 * A HEAD against this origin reports `DYNAMIC` and carries no `cache-control` AT ALL, on an object
 * a GET reports as cached with `max-age=14400`. So a HEAD-based cache assertion would conclude the
 * CDN is not caching and be wrong — it would make a working CDN look broken, and (asserting the
 * absence instead) a broken one look fine. HEAD remains sufficient for status and content-type;
 * that is what all 156 URLs of the 39 committed records were verified with.
 *
 * `--cache` therefore SWITCHES THE METHOD to GET as part of the same decision. Method and
 * cache-assertion are not two flags that a caller can combine wrongly: they are two fields of one
 * frozen `REQUEST_MODES` entry, selected together, with a runtime invariant below that throws if
 * anyone ever edits the table into a mode that asserts on `cache-control` over HEAD.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY `gate:liveness` IS NOT CHAINED INTO `gate:content`
 *
 * `gate:content` is four OFFLINE gates (`gate:schema && gate:sinks && gate:origin && gate:routes`)
 * that run on every `npm run build` and in every CI job. This one makes one network request per
 * remote URL — 156 today. Putting it on the build path would mean a CDN blip, a DNS hiccup or an
 * offline laptop reds a build whose code is fine, which teaches the team to ignore it. Its two real
 * homes are step 8 of the pipeline job (04-09), between the R2 upload and the commit, where a
 * failed upload becomes a failed job with NO manifest change; and a deliberate manual/e2e run
 * (04-10).
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT CANNOT SEE
 *
 * That the bytes at a live URL are the RIGHT image. A 200 `image/webp` at the expected key proves
 * an object exists and is a WebP; it cannot prove it is the photograph the record describes, or
 * that it has the dimensions the record claims. `thumb` is not checked at all — it is a
 * `data:image/webp;base64,` LQIP carrying no hostname, and it is excluded BY CONSTRUCTION because
 * the four remote keys are iterated by name from `src/lib/image-origin.ts`. That matters: a
 * `data:` URI parses perfectly well as a URL, so an "iterate `urls` and skip what isn't a URL"
 * filter would quietly include the thumb while looking like the careful option.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../src/lib/image-origin.ts';

const DEFAULT_MANIFEST = './data/portfolio_images.json';
const DEFAULT_CONCURRENCY = 8;
const ATTEMPTS = 3;

/**
 * The two request modes, as whole units. Method and cache-assertion travel together so that
 * "assert cache-control over HEAD" — the combination §4 measured as reporting a result it did not
 * measure — is not a state a caller can construct. See the HEAD/GET rule in the header.
 */
const REQUEST_MODES = Object.freeze({
  liveness: Object.freeze({ name: 'liveness', method: 'HEAD', assertCacheControl: false }),
  cache: Object.freeze({ name: 'cache', method: 'GET', assertCacheControl: true }),
});

/**
 * Defence against a future edit to the table above rather than against a caller. If a mode ever
 * asserts on `cache-control` without using GET, every result it produces is meaningless, so it
 * must not be reachable.
 */
for (const mode of Object.values(REQUEST_MODES)) {
  if (mode.assertCacheControl && mode.method !== 'GET') {
    throw new Error(
      `verify-photo-urls: request mode "${mode.name}" asserts on cache-control over ` +
        `${mode.method}. A HEAD against this origin returns no cache-control at all (04-RESEARCH ` +
        `§4, measured); such a mode reports a result it did not measure. Refusing to run.`
    );
  }
}

/**
 * A refusal is distinct from a finding. Findings are accumulated and all printed; a refusal means
 * the run cannot produce a meaningful result at all and stops before any request. Both exit 1 —
 * the distinction is for the reader of the output and for the unit test, which asserts on refusals
 * without opening a socket.
 */
export class VerifierRefusal extends Error {
  constructor(lines) {
    const all = [].concat(lines);
    super(all.join('\n'));
    this.name = 'VerifierRefusal';
    this.lines = all;
  }
}

/**
 * Read and shape-check the manifest. Every failure names the path, because the most common way to
 * get a false green out of a file-reading gate is to point it at the wrong file.
 */
export function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new VerifierRefusal(
      `no manifest at ${manifestPath} — there is nothing to check, which is a failure and ` +
        `never a pass.`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new VerifierRefusal(`${manifestPath} is not valid JSON — ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new VerifierRefusal(
      `${manifestPath} is not a top-level array — the manifest shape changed, so the ` +
        `records.length x ${REMOTE_URL_KEYS.length}-keys arithmetic does not apply. Refusing.`
    );
  }
  return parsed;
}

/**
 * Assemble the list of `{ id, key, url }` to request, and apply every floor. Pure: no network, no
 * filesystem, no process exit. The CLI and the unit test both go through this, so the behaviour
 * the test proves is the behaviour the gate has.
 *
 * @param {unknown[]} manifest  the parsed manifest array
 * @param {{ only?: string|null, manifestPath?: string }} options
 * @returns {{ id: string, key: string, url: string }[]}
 */
export function assembleTargets(manifest, options = {}) {
  const { only = null, manifestPath = DEFAULT_MANIFEST } = options;

  if (!Array.isArray(manifest)) {
    throw new VerifierRefusal(`manifest is not an array — refusing to assemble targets.`);
  }

  // Floor 1: an empty manifest. Derived counts make this the dangerous case, because
  // 0 === 0 * 4 is arithmetically true and would satisfy a naive count check.
  if (manifest.length === 0) {
    throw new VerifierRefusal(
      `${manifestPath} holds 0 records — a verifier that checked zero URLs and reported PASS is ` +
        `the vacuous gate this file exists to not be. Refusing.`
    );
  }

  let records = manifest;
  if (only !== null) {
    records = manifest.filter((record) => record?.id === only);
    // Floor 2: --only naming nothing. 04-10's criterion-1 gate depends on this being a refusal.
    if (records.length === 0) {
      throw new VerifierRefusal(
        `--only "${only}" matched no record in ${manifestPath} (${manifest.length} record(s) ` +
          `present) — a single-record check that silently found nothing to check would let a ` +
          `live-run gate go green over a run that never happened. Refusing.`
      );
    }
  }

  const expected = records.length * REMOTE_URL_KEYS.length;
  const targets = [];
  const findings = [];

  for (const record of records) {
    const id = typeof record?.id === 'string' && record.id ? record.id : '(record with no id)';
    for (const key of REMOTE_URL_KEYS) {
      const value = record?.urls?.[key];
      if (typeof value !== 'string') {
        findings.push(
          `${id}.${key}: missing or not a string — ${JSON.stringify(value) ?? 'absent'}`
        );
        continue;
      }
      let parsed;
      try {
        parsed = new URL(value);
      } catch {
        findings.push(`${id}.${key}: not a parseable URL — ${value}`);
        continue;
      }
      // The origin check happens HERE, before any request is issued (T-04-10). A record whose URL
      // points somewhere else is a finding, not something to go and fetch: fetching it would send
      // a request to a host the manifest chose, and a foreign 200 would be reported as proof of
      // liveness for an asset that is not on our origin at all.
      if (parsed.origin !== IMAGE_ORIGIN) {
        findings.push(
          `${id}.${key}: origin is "${parsed.origin}", expected exactly "${IMAGE_ORIGIN}" — ` +
            `not requested — ${value}`
        );
        continue;
      }
      targets.push({ id, key, url: value });
    }
  }

  if (findings.length > 0) {
    throw new VerifierRefusal([
      `${findings.length} target(s) were rejected before any request was made:`,
      ...findings.map((f) => `  x ${f}`),
    ]);
  }

  // Floor 3: the derived count, and a hard `> 0` that does not depend on the arithmetic above.
  if (targets.length !== expected) {
    throw new VerifierRefusal(
      `assembled ${targets.length} remote URLs, expected ${expected} ` +
        `(${records.length} record(s) x ${REMOTE_URL_KEYS.length} remote keys: ` +
        `${REMOTE_URL_KEYS.join(', ')}). Refusing to verify a partial set.`
    );
  }
  if (targets.length === 0) {
    throw new VerifierRefusal(
      `assembled 0 remote URLs — nothing to check. This is a failure, never a pass.`
    );
  }

  return targets;
}

/**
 * Parse argv. Unknown flags are a refusal rather than being ignored: a typo'd `--onlyy` that was
 * silently dropped would run the FULL corpus while the caller believed it had scoped the check,
 * or — worse in a pipeline — appear to have checked one record when it checked all of them.
 *
 * @param {string[]} argv  process.argv.slice(2)
 */
export function parseArgv(argv) {
  let manifestArg = null;
  let only = null;
  let mode = REQUEST_MODES.liveness;
  let concurrency = DEFAULT_CONCURRENCY;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cache') {
      mode = REQUEST_MODES.cache;
    } else if (arg === '--only') {
      only = argv[++i] ?? null;
      if (only === null || only.startsWith('--')) {
        throw new VerifierRefusal(`--only requires a photo id.`);
      }
    } else if (arg === '--concurrency') {
      const raw = argv[++i];
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        throw new VerifierRefusal(`--concurrency requires a positive integer, got "${raw}".`);
      }
      concurrency = n;
    } else if (arg.startsWith('--')) {
      throw new VerifierRefusal(
        `unknown flag "${arg}". Known flags: --only <photoId>, --cache, --concurrency <n>.`
      );
    } else if (manifestArg === null) {
      manifestArg = arg;
    } else {
      throw new VerifierRefusal(
        `more than one manifest path given ("${manifestArg}" and "${arg}").`
      );
    }
  }

  return { manifestArg: manifestArg ?? DEFAULT_MANIFEST, only, mode, concurrency };
}

/**
 * Request one target. Returns a failure string or null. Transient network errors are retried;
 * a final one is REPORTED, never swallowed — an unreachable object is indistinguishable from a
 * missing one from here, and both are reasons not to commit the record.
 */
async function checkTarget(target, mode) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(target.url, { method: mode.method, redirect: 'follow' });
      // Drain the body in GET mode so the socket is released promptly. `fetch` keeps the
      // connection open until the body is consumed or cancelled.
      if (mode.method === 'GET') await response.arrayBuffer();

      const contentType = response.headers.get('content-type') ?? '(none)';
      if (response.status !== 200) {
        return `${target.id}.${target.key}: HTTP ${response.status} — ${target.url}`;
      }
      if (!contentType.toLowerCase().startsWith('image/webp')) {
        return (
          `${target.id}.${target.key}: content-type "${contentType}" is not image/webp — ` +
          `${target.url}`
        );
      }
      if (mode.assertCacheControl) {
        const cacheControl = response.headers.get('cache-control');
        if (!cacheControl) {
          return (
            `${target.id}.${target.key}: no cache-control header on a ${mode.method} — ` +
            `${target.url}`
          );
        }
      }
      return null;
    } catch (error) {
      if (attempt === ATTEMPTS) {
        return `${target.id}.${target.key}: network error — ${error.message} — ${target.url}`;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  /* c8 ignore next */
  return `${target.id}.${target.key}: exhausted ${ATTEMPTS} attempts with no verdict.`;
}

/**
 * Fetch every target with bounded concurrency (T-04-12) and report. Returns `1` on failure (having
 * already printed every finding) or `{ checked, elapsed }` on success; the caller owns
 * `process.exit` so this stays testable.
 */
export async function verify(targets, mode, concurrency) {
  const failures = [];
  let checked = 0;

  const queue = [...targets];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    let next = queue.pop();
    while (next) {
      const failure = await checkTarget(next, mode);
      if (failure) failures.push(failure);
      checked++;
      next = queue.pop();
    }
  });

  const started = Date.now();
  await Promise.all(workers);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  // The loop must have visited every assembled target. A worker that threw and left the queue
  // half-drained must not be able to report success over the part it managed to reach.
  if (checked !== targets.length) {
    console.error(
      `verify-photo-urls: checked ${checked} URLs but assembled ${targets.length} — the loop did ` +
        `not visit every target, so its result means nothing.`
    );
    return 1;
  }

  if (failures.length > 0) {
    console.error(
      `verify-photo-urls: ${failures.length} of ${checked} URL(s) did not satisfy ` +
        `HTTP 200 + content-type image/webp${mode.assertCacheControl ? ' + cache-control' : ''}:`
    );
    for (const failure of failures.sort()) console.error(`  x ${failure}`);
    return 1;
  }

  return { checked, elapsed };
}

async function main() {
  let code = 0;
  try {
    const { manifestArg, only, mode, concurrency } = parseArgv(process.argv.slice(2));
    const manifestPath = path.resolve(process.cwd(), manifestArg);
    const manifest = readManifest(manifestPath);
    const targets = assembleTargets(manifest, { only, manifestPath });

    const recordCount = only === null ? manifest.length : 1;
    const result = await verify(targets, mode, concurrency);
    if (result === 1) return 1;

    // Not a bare PASS. The report names what was checked, so a reader can tell a real run from a
    // run over nothing without trusting the word PASS.
    console.log(`verify-photo-urls: PASS`);
    console.log(`  manifest:  ${manifestPath}`);
    console.log(
      `  scope:     ${only === null ? `all ${manifest.length} record(s)` : `--only ${only} (1 of ${manifest.length} record(s))`}`
    );
    console.log(
      `  checked:   ${result.checked} remote URL(s) = ${recordCount} record(s) x ` +
        `${REMOTE_URL_KEYS.length} remote key(s), derived from the manifest at run time`
    );
    console.log(`  keys:      ${REMOTE_URL_KEYS.join(', ')}`);
    console.log(`  origin:    ${IMAGE_ORIGIN}  (from src/lib/image-origin.ts)`);
    console.log(
      `  method:    ${mode.method} (${mode.name} mode)${mode.assertCacheControl ? ' — cache-control required' : ''}`
    );
    console.log(
      `  excluded:  urls.thumb — a data:image/webp;base64 LQIP with no hostname, excluded by ` +
        `construction (REMOTE_URL_KEYS does not contain it)`
    );
    console.log(`  every one returned HTTP 200 with content-type image/webp in ${result.elapsed}s`);
  } catch (error) {
    if (error instanceof VerifierRefusal) {
      for (const line of error.lines) console.error(`verify-photo-urls: ${line}`);
      code = 1;
    } else {
      throw error;
    }
  }
  return code;
}

/**
 * CLI guard. Compared by resolved path rather than using `import.meta.main` so the module can be
 * imported by the unit test on any Node in `engines` (>=22.12.0) without the CLI running — and
 * without opening a socket the moment the test file is loaded.
 */
const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exit(await main());
}
