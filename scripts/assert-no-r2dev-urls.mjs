#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../src/lib/image-origin.ts';

const repoRoot = path.resolve(process.cwd(), process.argv[2] ?? '.');

const LEGACY_SUFFIX_LABELS = ['r2', 'dev'];

const LEGACY_SUFFIX_RE = LEGACY_SUFFIX_LABELS.join('\\.');

const LEGACY_ORIGIN_PATTERN = new RegExp(
  `pub-[0-9a-f]+\\.${LEGACY_SUFFIX_RE}|\\.${LEGACY_SUFFIX_RE}`,
  'gi'
);

const MANIFEST_RELATIVE = 'data/portfolio_images.json';
const EXPECTED_RECORDS = 39;

const RULES = [
  {
    scan: true,
    label: 'data/**',
    test: (p) => p.startsWith('data/'),
    why: 'the committed content itself — the manifest CONT-04 exists to keep migrated.',
  },
  {
    scan: true,
    label: 'src/**',
    test: (p) => p.startsWith('src/'),
    why: 'every module that ships, either into the Worker or into prerendered HTML.',
  },
  {
    scan: true,
    label: 'public/**',
    test: (p) => p.startsWith('public/'),
    why: 'copied verbatim into dist/ and served as-is.',
  },
  {
    scan: true,
    label: 'scripts/**',
    test: (p) => p.startsWith('scripts/'),
    why: 'the migration and the gates; a wrong origin here would rewrite the data wrongly.',
  },
  {
    scan: true,
    label: 'astro.config.mjs',
    test: (p) => p === 'astro.config.mjs',
    why: 'build configuration — a value here reaches the build output.',
  },
  {
    scan: true,
    label: 'wrangler.jsonc',
    test: (p) => p === 'wrangler.jsonc',
    why: 'deploy configuration and vars — a value here reaches the runtime.',
  },
  {
    scan: true,
    label: '.github/**',
    test: (p) => p.startsWith('.github/'),
    why:
      'SKIP UNTIL 2026-08-27, MOVED TO SCAN BY PLAN 04-02 (decision OD-3). The rule used to say ' +
      '"CI configuration, not a shipped artefact … REVISIT IN PHASE 4: the Actions photo ' +
      'pipeline is the only future writer of new URLs, so once it exists its workflow env ' +
      'genuinely can carry an origin". Phase 4 has landed, that pipeline is being built, and ' +
      '03-01 named this rule in its own summary as the one most likely to be wrong once it did. ' +
      'A workflow that published photos while carrying a legacy origin in an `env:` block would ' +
      'write that origin into the manifest, which is the exact failure this gate exists to stop. ' +
      'BLIND SPOT, and it is the reason OD-3 chose to refuse the secret rather than repoint it: ' +
      'this gate reads TEXT, so a `secrets.R2_PUBLIC_URL` interpolation in a workflow is a ' +
      'REFERENCE, not a literal, and its VALUE is invisible ' +
      'to it — measured 2026-08-27, plan 04-02 Task 3 step 4. Nothing in this repository can see ' +
      'a wrong value inside a secret. That is why the pipeline imports IMAGE_ORIGIN instead of ' +
      'reading any secret at all; scanning .github/** closes the literal half only.',
  },

  {
    scan: false,
    label: '.migration/**',
    why:
      'the receipt the key migration writes — one entry per object it copied, with the old key, ' +
      'the new key and the hash. It is a RECORD OF WHAT WAS DONE, so its old keys are the ' +
      'evidence rather than a mistake: rewriting them would erase the before-half of the ' +
      'before/after this file exists to prove. Same reasoning as .planning/** below. Nothing here ' +
      'is imported, copied into dist/ or read at runtime — `astro build` never looks at it. It ' +
      'refused the build on 2026-09-04 by being unclassified, which is the rule working: a file ' +
      'appeared and nobody had decided whether it ships.',
    test: (p) => p.startsWith('.migration/'),
  },
  {
    scan: false,
    label: '.planning/**',
    test: (p) => p.startsWith('.planning/'),
    why:
      'the written record. 02-DNS-R2-PREREQS.md is ENTIRELY a before/after measurement of the ' +
      'two hostnames; a blanket replace would delete the evidence the migration was worth doing. ' +
      '01-23 precedent: a document recording what was true on a date is falsified, not updated, ' +
      'by a blanket replace. Nothing here has a path into the build.',
  },
  {
    scan: false,
    label: 'CLAUDE.md',
    test: (p) => p === 'CLAUDE.md',
    why:
      "its Technology Stack section quotes the legacy app's config value, under a blockquote " +
      'that already scopes the whole section to the legacy/nextjs-portfolio branch. Same ' +
      'historical-record reason as .planning/**. Named explicitly in OD-1.',
  },
  {
    scan: false,
    label: 'design_handoff_portfolio/**',
    test: (p) => p.startsWith('design_handoff_portfolio/'),
    why:
      'exported design-tool HTML, never built, imported or served — it is a reference artefact. ' +
      'Excluded from Biome and Prettier for the same reason. Not in OD-1 shipped set.',
  },
  {
    scan: false,
    label: 'test/**',
    test: (p) => p.startsWith('test/'),
    why:
      'a test asserting that the migration or this gate works must be free to name the string it ' +
      'forbids as a fixture. Tests do not ship. Not in OD-1 shipped set.',
  },
  {
    scan: false,
    label: 'worker-configuration.d.ts',
    test: (p) => p === 'worker-configuration.d.ts',
    why: 'generated by `wrangler types` from wrangler.jsonc, which IS scanned. Not hand-edited.',
  },
  {
    scan: false,
    label: 'package-lock.json',
    test: (p) => p === 'package-lock.json',
    why: 'npm-generated resolution graph; registry URLs only, and no hand edits reach it.',
  },
  {
    scan: false,
    label: 'repo tooling manifests and docs',
    test: (p) =>
      [
        'package.json',
        'tsconfig.json',
        'biome.json',
        '.prettierrc.json',
        '.prettierignore',
        '.gitignore',
        '.nvmrc',
        'README.md',
      ].includes(p) || /^vitest(\.[a-z]+)?\.config\.ts$/.test(p),
    why:
      'build/lint/test tooling configuration and the repo README. None declares an image origin ' +
      'and none is served. Not in OD-1 shipped set.',
  },
];

const failures = [];
const notes = [];

let tracked;
try {
  tracked = execFileSync('git', ['-C', repoRoot, 'ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
} catch (error) {
  console.error(
    `assert-no-r2dev-urls: could not list tracked files in ${repoRoot} — ${error.message}`
  );
  process.exit(1);
}

if (tracked.length === 0) {
  console.error(
    `assert-no-r2dev-urls: git ls-files returned no files in ${repoRoot}. There is nothing to ` +
      `scan, so a PASS would be meaningless. Refusing.`
  );
  process.exit(1);
}

const toScan = [];
const skipped = new Map();
const scannedByLabel = new Map(RULES.filter((r) => r.scan).map((r) => [r.label, 0]));

for (const relative of tracked) {
  const rule = RULES.find((r) => r.test(relative));
  if (!rule) {
    failures.push({
      where: relative,
      detail: 'unclassified path',
      why:
        'this path matches no SCAN or SKIP rule, so nobody has decided whether it ships. Add a ' +
        'rule to RULES in this file, with its reason, before the build can proceed.',
    });
    continue;
  }
  if (rule.scan) {
    toScan.push({ relative, absolute: path.join(repoRoot, relative) });
    scannedByLabel.set(rule.label, scannedByLabel.get(rule.label) + 1);
  } else {
    skipped.set(rule.label, (skipped.get(rule.label) ?? 0) + 1);
  }
}

for (const [label, count] of scannedByLabel) {
  if (count === 0) {
    failures.push({
      where: `RULES → ${label}`,
      detail: 'SCAN rule matched no tracked file',
      why:
        'a scan rule that reaches nothing is indistinguishable from a skip, so this gate would ' +
        'report a clean result over files it never opened. Either the path moved and the rule ' +
        'needs updating, or the rule is dead and should be deleted on purpose.',
    });
  }
}

const distRoot = path.join(repoRoot, 'dist');
if (fs.existsSync(distRoot)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile())
        toScan.push({ relative: path.relative(repoRoot, absolute), absolute });
    }
  };
  walk(distRoot);
} else {
  notes.push(
    'dist/ absent — not built in this working tree, so the build-output half was a no-op.'
  );
}

let occurrences = 0;

for (const file of toScan) {
  let content;
  try {
    content = fs.readFileSync(file.absolute, 'utf8');
  } catch (error) {
    failures.push({
      where: file.relative,
      detail: `unreadable — ${error.message}`,
      why: 'a file in scope that cannot be read has not been checked, so it cannot be passed.',
    });
    continue;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(LEGACY_ORIGIN_PATTERN)) {
      occurrences++;
      failures.push({
        where: `${file.relative}:${i + 1}`,
        detail: match[0],
        why: 'the legacy uncached, rate-limited development origin. Use IMAGE_ORIGIN instead.',
      });
    }
  }
}

const manifestPath = path.join(repoRoot, MANIFEST_RELATIVE);
let manifestChecked = 0;

if (!fs.existsSync(manifestPath)) {
  failures.push({
    where: MANIFEST_RELATIVE,
    detail: 'missing',
    why:
      'the manifest this gate exists to protect is not there. Deleting the thing under test must ' +
      'not turn the gate green.',
  });
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    failures.push({
      where: MANIFEST_RELATIVE,
      detail: `not valid JSON — ${error.message}`,
      why: 'an unparseable manifest cannot be asserted about, so it cannot pass.',
    });
  }

  if (manifest !== null) {
    if (!Array.isArray(manifest)) {
      failures.push({
        where: MANIFEST_RELATIVE,
        detail: 'not a top-level array',
        why: 'the manifest shape changed; this gate is asserting about something it does not know.',
      });
    } else if (manifest.length < EXPECTED_RECORDS) {
      failures.push({
        where: MANIFEST_RELATIVE,
        detail: `${manifest.length} records, expected at least ${EXPECTED_RECORDS}`,
        why:
          'records were removed. A shorter manifest trivially contains fewer legacy URLs, so ' +
          'passing on it would reward deletion.',
      });
    } else {
      for (const record of manifest) {
        const id = record?.id ?? '(record with no id)';
        for (const key of REMOTE_URL_KEYS) {
          const value = record?.urls?.[key];
          if (typeof value !== 'string') {
            failures.push({
              where: `${MANIFEST_RELATIVE} ${id}.${key}`,
              detail: 'missing or not a string',
              why: 'a remote URL key that is absent is not a URL on the canonical origin.',
            });
            continue;
          }
          if (!value.startsWith(`${IMAGE_ORIGIN}/`)) {
            failures.push({
              where: `${MANIFEST_RELATIVE} ${id}.${key}`,
              detail: value,
              why: `does not start with ${IMAGE_ORIGIN}/ — the canonical origin from src/lib/image-origin.ts.`,
            });
            continue;
          }
          manifestChecked++;
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error('');
  console.error(
    '══════════════════════════════════════════════════════════════════════════════════'
  );
  console.error(
    '  SHIP REFUSED — CONT-04: a shipped artefact does not use the canonical image origin'
  );
  console.error(
    '══════════════════════════════════════════════════════════════════════════════════'
  );
  console.error('');
  console.error(`  repo: ${repoRoot}`);
  console.error('');
  for (const failure of failures) {
    console.error(`  ✖ ${failure.where}: ${failure.detail}`);
    console.error(`      ${failure.why}`);
  }
  console.error('');
  console.error('  WHY THIS MATTERS:');
  console.error('');
  console.error('    The legacy origin is documented by Cloudflare as development-only: no CDN');
  console.error(
    '    cache, no WAF, rate limited. Plan 02-02 measured no cache header at all on two'
  );
  console.error(
    '    consecutive requests, so every one of the 39 gallery images reached the origin'
  );
  console.error('    on every request. A single URL slipping back reintroduces an uncacheable,');
  console.error('    rate-limited request into the render path and makes the Lighthouse budget on');
  console.error('    the gallery unreproducible.');
  console.error('');
  console.error(`    The canonical origin is ${IMAGE_ORIGIN}, exported as IMAGE_ORIGIN from`);
  console.error('    src/lib/image-origin.ts. Import it; do not retype it.');
  console.error('');
  console.error(`  ${failures.length} finding(s) (${occurrences} legacy-origin occurrence(s)).`);
  console.error('  Requirement CONT-04; threats T-03-01-01, T-03-01-05. Scope decided in OD-1.');
  console.error('');
  process.exit(1);
}

console.log('assert-no-r2dev-urls: PASS');
console.log(`  repo: ${repoRoot}`);
console.log(
  `  scanned ${toScan.length} in-scope file(s) — 0 occurrences of the legacy development origin`
);
console.log(
  `  manifest: ${manifestChecked} remote URL(s) across ${EXPECTED_RECORDS}+ records all start with ${IMAGE_ORIGIN}/`
);
console.log(
  `  scanned by named rule: ${[...scannedByLabel.entries()].map(([label, n]) => `${label} (${n})`).join(', ')}`
);
console.log(
  `  skipped by named rule: ${[...skipped.entries()].map(([label, n]) => `${label} (${n})`).join(', ')}`
);
for (const note of notes) console.log(`  note: ${note}`);
