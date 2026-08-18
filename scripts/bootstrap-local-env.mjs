#!/usr/bin/env node
/**
 * Seed the two gitignored local env files from their committed examples.
 *
 * `astro:env` is configured with `validateSecrets: true` and both Access secrets
 * declared non-optionally, so a build or `astro dev` with either file missing fails
 * outright. That is the intended fail-closed behaviour — this script exists so the
 * first-run failure is "copy the examples" rather than "guess the variable names".
 *
 * Contract:
 *   - Copies `<target>.example` -> `<target>` if and only if `<target>` is absent.
 *   - NEVER overwrites an existing target. A developer's real local secrets must
 *     survive every invocation, including the one wired into `npm run dev`.
 *   - Exits 0 when both targets are present afterwards, non-zero with a readable
 *     message when an example file is missing.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Each target is seeded from `<target>.example`, both at the repo root. */
const TARGETS = ['.env', '.dev.vars'];

const created = [];
const kept = [];
const missingExamples = [];

for (const target of TARGETS) {
  const targetPath = resolve(repoRoot, target);
  const examplePath = `${targetPath}.example`;

  if (existsSync(targetPath)) {
    kept.push(target);
    continue;
  }

  if (!existsSync(examplePath)) {
    missingExamples.push(`${target}.example`);
    continue;
  }

  // `copyFileSync` with COPYFILE_EXCL would also refuse to clobber, but the
  // existsSync check above already decided, and this keeps the error surface small.
  copyFileSync(examplePath, targetPath);
  created.push(target);
}

for (const target of created) {
  console.log(`created  ${target}  (from ${target}.example — placeholder values, edit before use)`);
}
for (const target of kept) {
  console.log(`kept     ${target}  (already present — left untouched)`);
}

if (missingExamples.length > 0) {
  console.error(
    `\nbootstrap-local-env: cannot seed local env — missing committed example file(s): ${missingExamples.join(', ')}`
  );
  console.error(
    'These are tracked in git. Restore them (git checkout -- <file>) rather than hand-writing them,'
  );
  console.error('so the placeholder values stay on the non-resolving .invalid TLD.');
  process.exit(1);
}

const stillMissing = TARGETS.filter((target) => !existsSync(resolve(repoRoot, target)));
if (stillMissing.length > 0) {
  console.error(`\nbootstrap-local-env: expected file(s) still absent: ${stillMissing.join(', ')}`);
  process.exit(1);
}

console.log('\nbootstrap-local-env: ok — .env and .dev.vars are present.');
