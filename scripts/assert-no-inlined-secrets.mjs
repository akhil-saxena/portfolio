#!/usr/bin/env node
/**
 * Fail the build if a committed placeholder value reached the artifact. (T-02-41)
 *
 * WHY THIS EXISTS
 * ---------------
 * CI builds with the fake values from `.env.example` / `.dev.vars.example` and holds no
 * real secret at all, which removes secret exposure from pull-request builds entirely.
 * That is only safe because `astro:env` server secrets are read at RUNTIME from the
 * Cloudflare environment rather than inlined into the bundle at build time.
 *
 * This gate is the assertion of that premise rather than an assumption of it: if a
 * placeholder value is found in the artifact, then secrets ARE being inlined, production
 * would ship the fake value instead of reading the real one, `/admin` would be verifying
 * tokens against a domain that cannot resolve, and the entire CI-without-secrets design
 * rests on something false.
 *
 * WHAT IS SCANNED
 * ---------------
 * Everything under `dist/`, which covers both halves of the hazard:
 *   - the Static Assets root (resolved from `dist/server/wrangler.json`, not hardcoded),
 *     every byte of which is publicly fetchable
 *   - the Worker modules, which are private but would still carry a wrong value into
 *     production
 *   - `dist/server/wrangler.json` itself, which is NOT excluded: it is the effective
 *     deploy config (reached by the adapter's `.wrangler/deploy/config.json` redirect),
 *     so a secret landing in its `vars` block would deploy as a plaintext Worker var.
 *
 * THE ONE EXCLUSION, AND WHY IT CANNOT GO STALE
 * ---------------------------------------------
 * `.dev.vars` is skipped. It is not output — it is the adapter's INPUT: `@astrojs/cloudflare`
 * copies the on-disk `.dev.vars` next to the server entry so its prerender sandbox can read
 * the secrets `validateSecrets` requires (measured in 02-06: the process environment does
 * not reach that sandbox, which is why CI must write the file at all). It is never uploaded.
 *
 * An exclusion justified by prose is an exclusion that quietly stops being true, so this one
 * is justified by a check instead: the gate asserts that `.dev.vars` is named in the assets
 * root's `.assetsignore`. The day the adapter stops excluding it from the upload, this gate
 * fails rather than continuing to skip a file that has started to ship.
 *
 * DRIFT PROTECTION
 * ----------------
 * The values to search for are passed in as arguments, so the caller states them in
 * executable position. The gate then cross-checks them against every value in the committed
 * example files: if an example value is not covered by the arguments, the gate is hunting a
 * string nobody uses, and it fails saying so. That is the failure mode where a gate is still
 * green, still runs, and no longer checks anything.
 *
 * Usage: node scripts/assert-no-inlined-secrets.mjs <value> [<value> ...]
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(repoRoot, 'dist');

/** Basenames skipped, each with the reason printed in the report. */
const SKIPPED_BASENAME = '.dev.vars';

/** Committed example files whose values must all be covered by the search patterns. */
const EXAMPLE_FILES = ['.env.example', '.dev.vars.example'];

/** @param {string} message */
function fail(message) {
  console.error(`\nassert-no-inlined-secrets: FAIL\n${message}\n`);
  process.exit(1);
}

/**
 * Collect every file under `dir`, including dotfiles.
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full));
    } else if (entry.isFile()) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Parse `KEY=VALUE` lines, dropping comments and surrounding quotes.
 * @param {string} text
 * @returns {string[]}
 */
function parseEnvValues(text) {
  /** @type {string[]} */
  const values = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (value !== '') values.push(value);
  }
  return values;
}

// ---------------------------------------------------------------------------
// 1. The patterns to search for must be stated by the caller.
// ---------------------------------------------------------------------------
const patterns = [...new Set(process.argv.slice(2).filter((arg) => arg.trim() !== ''))];
if (patterns.length === 0) {
  fail(
    'No values to search for were given. This gate takes the placeholder values as arguments\n' +
      'so the caller states them where they can be read as code:\n' +
      '  node scripts/assert-no-inlined-secrets.mjs <team-domain> <aud>\n' +
      'Running it with no arguments would scan for nothing and pass, which is worse than not\n' +
      'running it at all.'
  );
}

// ---------------------------------------------------------------------------
// 2. Nothing to inspect is a FAILURE, not a skip. (02-06's rule.)
// ---------------------------------------------------------------------------
if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  fail(
    `There is no dist/ to inspect at ${distDir}.\n` +
      'This gate runs after a build. A missing artifact means the build did not happen, not\n' +
      'that the artifact is clean — so this exits non-zero rather than passing vacuously.'
  );
}

// ---------------------------------------------------------------------------
// 3. Resolve the Static Assets root the way the deploy does, and check the exclusion
//    the scan depends on is still guaranteed.
// ---------------------------------------------------------------------------
const generatedConfigPath = resolve(distDir, 'server/wrangler.json');
if (!existsSync(generatedConfigPath)) {
  fail(
    `The adapter's generated config is missing at ${relative(repoRoot, generatedConfigPath)}.\n` +
      'The Static Assets root is read from it rather than hardcoded, so without it this gate\n' +
      'cannot know which bytes are public and must not guess.'
  );
}

/** @type {{ assets?: { directory?: string } }} */
let generatedConfig;
try {
  generatedConfig = JSON.parse(readFileSync(generatedConfigPath, 'utf8'));
} catch (error) {
  fail(`Could not parse ${relative(repoRoot, generatedConfigPath)}: ${error.message}`);
}

const assetsDirectory = generatedConfig.assets?.directory;
if (typeof assetsDirectory !== 'string' || assetsDirectory === '') {
  fail(
    `${relative(repoRoot, generatedConfigPath)} declares no assets.directory.\n` +
      'Without it the publicly served subtree is unknown.'
  );
}
const assetsRoot = resolve(dirname(generatedConfigPath), assetsDirectory);

const assetsIgnorePath = resolve(assetsRoot, '.assetsignore');
const assetsIgnore = existsSync(assetsIgnorePath) ? readFileSync(assetsIgnorePath, 'utf8') : '';
const ignoredNames = assetsIgnore
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'));

if (!ignoredNames.includes(SKIPPED_BASENAME)) {
  fail(
    `This gate skips files named ${SKIPPED_BASENAME} because the adapter writes one as INPUT to\n` +
      'its prerender sandbox and never uploads it. That exclusion is only safe while the adapter\n' +
      `keeps excluding it, and ${relative(repoRoot, assetsIgnorePath)} no longer lists it.\n` +
      'Either the adapter changed or the file moved. Re-derive the exclusion before trusting it —\n' +
      'a skipped file that has started to ship is exactly how a placeholder reaches production.'
  );
}

// ---------------------------------------------------------------------------
// 4. The patterns must still describe the committed placeholders.
// ---------------------------------------------------------------------------
for (const exampleFile of EXAMPLE_FILES) {
  const examplePath = resolve(repoRoot, exampleFile);
  if (!existsSync(examplePath)) {
    fail(
      `The committed ${exampleFile} is missing, so the values this gate was asked to search for\n` +
        'cannot be confirmed to be the ones the build actually uses.'
    );
  }
  for (const value of parseEnvValues(readFileSync(examplePath, 'utf8'))) {
    if (!patterns.some((pattern) => value.includes(pattern))) {
      fail(
        `${exampleFile} contains a value this gate was not asked to look for:\n` +
          `  ${value}\n` +
          'The caller passes the placeholder values in as arguments; they have drifted from the\n' +
          'committed examples. The gate would still run, still pass, and no longer be checking the\n' +
          'value the build is actually using. Update the caller to pass this value.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Scan.
// ---------------------------------------------------------------------------
const files = walk(distDir);
if (files.length === 0) {
  fail(`dist/ exists but contains no files. There is nothing to inspect, so this fails.`);
}

/** @type {string[]} */
const skipped = [];
/** @type {{ file: string; pattern: string }[]} */
const hits = [];
let scanned = 0;

for (const file of files) {
  if (basename(file) === SKIPPED_BASENAME) {
    skipped.push(relative(repoRoot, file));
    continue;
  }
  scanned += 1;
  const contents = readFileSync(file);
  for (const pattern of patterns) {
    if (contents.includes(pattern)) {
      hits.push({ file: relative(repoRoot, file), pattern });
    }
  }
}

console.log('assert-no-inlined-secrets:');
console.log(`  artifact root   ${relative(repoRoot, distDir)}`);
console.log(`  assets root     ${relative(repoRoot, assetsRoot)}  (resolved, not hardcoded)`);
console.log(`  patterns        ${patterns.length}`);
console.log(`  files scanned   ${scanned}`);
for (const file of skipped) {
  console.log(`  skipped         ${file}  (adapter input, named in .assetsignore)`);
}

if (hits.length > 0) {
  fail(
    'A PLACEHOLDER SECRET IS PRESENT IN THE BUILT ARTIFACT:\n' +
      hits.map((hit) => `  ${hit.file}\n    contains: ${hit.pattern}`).join('\n') +
      '\n\n' +
      'This means astro:env server secrets are NOT runtime-only — they are being inlined into\n' +
      'the bundle at build time. Two things follow, both serious:\n' +
      '  1. Production would ship this fake value instead of reading the real Worker secret, so\n' +
      '     Access verification would run against a domain that cannot resolve and every\n' +
      '     authenticated request would be denied.\n' +
      '  2. Building CI without secrets is no longer safe, because whatever value CI supplies\n' +
      '     would be baked into the artifact.\n' +
      'Do not silence this by changing the placeholder. Find out why the value was inlined.'
  );
}

console.log('  result          ok — no placeholder value reached the artifact');
