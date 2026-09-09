#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const DEFAULT_SCAN_TARGETS = ['src', 'test', 'astro.config.mjs'];

const SCAN_EXTENSIONS = [
  '.astro',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
];

const DS_PACKAGE = '@akhil-saxena/design-system';

const deepSpecifiersSeen = new Set();

const PERMITTED_SUBPATH =
  /^@akhil-saxena\/design-system\/(icons|components\/[A-Za-z][A-Za-z0-9]*|[a-z0-9./-]+\.css|css\/[a-z0-9-]+)$/;

const PERMITTED_DEEP_SPECIFIERS = new Map([
  [
    '../../node_modules/@akhil-saxena/design-system/README.md?raw',
    {
      file: 'src/lib/ds-component-count.ts',
      reason:
        'the component-count resolver reads the published README. The package exports map does ' +
        'not expose ./README.md (measured: ERR_PACKAGE_PATH_NOT_EXPORTED from Node, and a build ' +
        'failure in rolldown:vite-resolve from Vite), so a relative path is the only route. It ' +
        'is a .md read through ?raw and carries no JavaScript into any chunk.',
    },
  ],
]);

const SPECIFIER_PATTERNS = [
  /\b(?:import|export)\b[\s\S]{0,400}?\bfrom\s*(['"`])([^'"`\n]+)\1/g,
  /\bimport\s*(['"`])([^'"`\n]+)\1/g,
  /\bimport\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)/g,
  /\brequire\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)/g,
  /@import\s+(?:url\(\s*)?(['"`])([^'"`\n]+)\1/g,
];

function specifiers(text) {
  const seen = new Map();
  const lines = text.split('\n');
  for (const re of SPECIFIER_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const value = m[2];
      if (value === undefined) continue;
      const idx = m.index + m[0].lastIndexOf(value);
      const line = text.slice(0, idx).split('\n').length;
      const key = `${line}\u0000${value}`;
      if (seen.has(key)) continue;
      seen.set(key, { value, line, lineText: (lines[line - 1] ?? '').trim() });
    }
  }
  return [...seen.values()];
}

const DYNAMIC_CALL = /\b(?:import|require)\s*\(\s*([^)]*)\)/g;
const NAMES_PACKAGE = /['"`][^'"`\n]*@akhil-saxena\/design-system/;

function isStaticSpecifier(arg) {
  const a = arg.trim();
  if (/^'[^'\n]*'$/.test(a) || /^"[^"\n]*"$/.test(a)) return true;
  if (/^`[^`\n]*`$/.test(a)) return !a.includes('${');
  return false;
}

function dynamicFindings(text) {
  if (!NAMES_PACKAGE.test(text)) return [];
  const lines = text.split('\n');
  const hits = [];
  DYNAMIC_CALL.lastIndex = 0;
  for (const m of text.matchAll(DYNAMIC_CALL)) {
    const arg = m[1];
    if (arg.trim().length === 0) continue;
    if (isStaticSpecifier(arg)) continue;
    // `import.meta` / `require.resolve` are not module-graph edges.
    if (/\.\s*(meta|resolve)\s*\(?$/.test(text.slice(0, m.index + m[0].indexOf('(')))) continue;
    const line = text.slice(0, m.index).split('\n').length;
    hits.push({ line, lineText: (lines[line - 1] ?? '').trim(), expression: m[0].slice(0, 80) });
  }
  return hits;
}

/* ---------------------------------------------------------------------------------------------
 * The rules.
 * ------------------------------------------------------------------------------------------- */

function barrelFindings(text, relativePath) {
  const hits = [];
  for (const lit of specifiers(text)) {
    const v = lit.value;

    if (v.includes(`node_modules/${DS_PACKAGE}`)) {
      const permitted = PERMITTED_DEEP_SPECIFIERS.get(v);
      if (permitted && permitted.file === relativePath) {
        deepSpecifiersSeen.add(v);
        continue;
      }
      hits.push({
        line: lit.line,
        lineText: lit.lineText,
        specifier: v,
        why:
          'this reaches into node_modules and bypasses the package exports map entirely. ' +
          (permitted
            ? `that specifier is permitted only in ${permitted.file}.`
            : 'a deep path can name dist/index.js — the barrel — without matching any subpath rule.'),
      });
      continue;
    }

    if (v !== DS_PACKAGE && !v.startsWith(`${DS_PACKAGE}/`)) continue;
    if (PERMITTED_SUBPATH.test(v)) continue;

    hits.push({
      line: lit.line,
      lineText: lit.lineText,
      specifier: v,
      why:
        v === DS_PACKAGE
          ? 'this is THE BARREL: 101 files, 416,590 B, carrying tiptap x6 and dnd-kit x3 into a ' +
            'route budgeted for zero framework JavaScript. Import from components/<Name> instead.'
          : `this specifier is not in the permitted set. Permitted: ${DS_PACKAGE}/icons, ` +
            `${DS_PACKAGE}/components/<Name>, any .css subpath, ${DS_PACKAGE}/css/<name>. ` +
            '(/hooks is deliberately excluded — it is a barrel of its own.)',
    });
  }
  return hits;
}

/** Identifiers imported from `.../components/<Name>` in this file, including `as` aliases. */
function importedComponentNames(text) {
  const names = new Set();
  const re =
    /import\s+([^;]*?)\s+from\s*['"`]@akhil-saxena\/design-system\/components\/([A-Za-z][A-Za-z0-9]*)['"`]/g;
  for (const m of text.matchAll(re)) {
    const clause = m[1];
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const piece = part.trim();
        if (!piece) continue;
        const alias = piece.split(/\s+as\s+/);
        names.add((alias[1] ?? alias[0]).trim());
      }
    }
    const def = clause
      .replace(/\{[^}]*\}/, '')
      .replace(/,/g, '')
      .trim();
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(def)) names.add(def);
    if (!named && !def) names.add(m[2]);
  }
  return names;
}

/**
 * `class=` / `class:list=` on an element whose tag name was imported from the design system.
 * The name set is DERIVED PER FILE from that file's own imports, so the rule cannot go stale
 * against a component nobody has used yet, and cannot fire on an app component of the same name.
 */
function classFindings(text) {
  const names = importedComponentNames(text);
  if (names.size === 0) return [];

  const hits = [];
  for (const name of names) {
    const openTag = new RegExp(String.raw`<${name}(?=[\s/>])`, 'g');
    for (const m of text.matchAll(openTag)) {
      // Walk to the end of the opening tag, ignoring `>` inside quotes.
      let i = m.index + m[0].length;
      let quote = null;
      let depth = 0;
      let end = -1;
      for (; i < text.length; i++) {
        const c = text[i];
        if (quote) {
          if (c === quote) quote = null;
          continue;
        }
        if (c === "'" || c === '"' || c === '`') {
          quote = c;
          continue;
        }
        if (c === '{') {
          depth++;
          continue;
        }
        if (c === '}') {
          depth--;
          continue;
        }
        if (c === '>' && depth === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) continue;
      const attrs = text.slice(m.index, end + 1);
      const classAttr = /(^|\s)(class(?::list)?)\s*=/.exec(attrs);
      if (!classAttr) continue;

      const line = text.slice(0, m.index).split('\n').length;
      hits.push({
        line,
        component: name,
        attribute: classAttr[2],
        lineText: (text.split('\n')[line - 1] ?? '').trim(),
      });
    }
  }
  return hits;
}

const RULES = [
  {
    id: 'DS-BARREL',
    what: 'a design-system specifier outside the permitted set',
    find: barrelFindings,
    extensions: SCAN_EXTENSIONS,
    canary: `import { Chip } from '${DS_PACKAGE}';\n`,
    antiCanary: `import { Chip } from '${DS_PACKAGE}/components/Chip';\nimport '${DS_PACKAGE}/tokens.css';\nimport { Sun } from '${DS_PACKAGE}/icons';\n`,
    extraCanaries: [
      ['double-quoted barrel', `import { Chip } from "${DS_PACKAGE}";\n`],
      ['side-effect barrel', `import '${DS_PACKAGE}';\n`],
      ['dynamic import', `const m = await import('${DS_PACKAGE}');\n`],
      ['backtick specifier', `const m = await import(\`${DS_PACKAGE}\`);\n`],
      ['export-from barrel', `export { Chip } from '${DS_PACKAGE}';\n`],
      ['require barrel', `const ds = require('${DS_PACKAGE}');\n`],
      ['hooks barrel', `import { useTheme } from '${DS_PACKAGE}/hooks';\n`],
      [
        'deep node_modules path to the barrel',
        `import x from '../../node_modules/${DS_PACKAGE}/dist/index.js';\n`,
      ],
    ],
  },
  {
    id: 'DS-DYNAMIC',
    what: 'a dynamic import whose specifier is not a literal, in a file that names the design system',
    find: dynamicFindings,
    extensions: SCAN_EXTENSIONS,
    canary: `const B = '${DS_PACKAGE}';\nconst ds = await import(B);\n`,
    antiCanary:
      `import { Chip } from '${DS_PACKAGE}/components/Chip';\n` +
      `const other = await import('node:fs');\n`,
    extraCanaries: [
      [
        'concatenated specifier',
        `const B = '${DS_PACKAGE}';\nconst ds = await import(B + '/hooks');\n`,
      ],
      ['template specifier', `const B = '${DS_PACKAGE}';\nconst ds = await import(\`\${B}\`);\n`],
      ['require of a variable', `const B = '${DS_PACKAGE}';\nconst ds = require(B);\n`],
    ],
  },
  {
    id: 'DS-CLASS',
    what: '`class` instead of `className` on a design-system component',
    find: classFindings,
    extensions: ['.astro'],
    canary: `---\nimport { Card } from '${DS_PACKAGE}/components/Card';\n---\n<Card class="wk-card">x</Card>\n`,
    antiCanary: `---\nimport { Card } from '${DS_PACKAGE}/components/Card';\n---\n<div class="wk-card"><Card className="wk-card">x</Card></div>\n`,
    extraCanaries: [
      [
        'class:list directive',
        `---\nimport { Card } from '${DS_PACKAGE}/components/Card';\n---\n<Card class:list={['a']}>x</Card>\n`,
      ],
      [
        'aliased import',
        `---\nimport { Card as Panel } from '${DS_PACKAGE}/components/Card';\n---\n<Panel class="wk-card">x</Panel>\n`,
      ],
      [
        'attribute on a later line',
        `---\nimport { Card } from '${DS_PACKAGE}/components/Card';\n---\n<Card\n  data-x="1"\n  class="wk-card"\n>x</Card>\n`,
      ],
      [
        'self-closing',
        `---\nimport { Card } from '${DS_PACKAGE}/components/Card';\n---\n<Card class="wk-card" />\n`,
      ],
    ],
  },
];

/* ---------------------------------------------------------------------------------------------
 * 0. Self-test. A rule that cannot fire is not a rule.
 * ------------------------------------------------------------------------------------------- */

const selfTestFailures = [];
let canariesChecked = 0;

if (RULES.length === 0)
  selfTestFailures.push('there are no rules — a scan with nothing to look for cannot pass.');

for (const rule of RULES) {
  canariesChecked++;
  if (rule.find(rule.canary, '__canary__').length === 0) {
    selfTestFailures.push(
      `${rule.id}: did NOT flag its own canary. The rule is broken, and every clean run it has ever reported is worthless.`
    );
  }
  if (rule.find(rule.antiCanary, '__canary__').length > 0) {
    selfTestFailures.push(
      `${rule.id}: flagged its own anti-canary. The rule is too broad and would be turned off rather than obeyed.`
    );
  }
  for (const [label, body] of rule.extraCanaries ?? []) {
    canariesChecked++;
    if (rule.find(body, '__canary__').length === 0) {
      selfTestFailures.push(
        `${rule.id}: did NOT flag its "${label}" canary — that walk-through is open.`
      );
    }
  }
}

for (const [spec, meta] of PERMITTED_DEEP_SPECIFIERS) {
  if (!meta.reason || meta.reason.trim().length < 20) {
    selfTestFailures.push(`permitted deep specifier "${spec}" carries no usable reason.`);
  }
}

if (selfTestFailures.length > 0) {
  err('assert-ds-import-contract: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const f of selfTestFailures) err(`  x ${f}`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------------------------
 * 1. The scan.
 * ------------------------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const usingDefaultTargets = args.length === 0;

// An argument that is PRESENT but empty is not the same as no argument: path.resolve(cwd, '')
// silently returns cwd, so this would scan the whole repository while looking like a narrow scan.
for (const a of args) {
  if (a.trim().length === 0) {
    err('assert-ds-import-contract: REFUSED — a scan root argument is present but empty.');
    err("  path.resolve(cwd, '') is cwd, so this would have scanned the entire repository.");
    process.exit(1);
  }
}

const targets = usingDefaultTargets ? DEFAULT_SCAN_TARGETS : args;
const failures = [];
const scanned = [];
let bytesRead = 0;

for (const target of targets) {
  const absolute = path.resolve(process.cwd(), target);
  if (!fs.existsSync(absolute)) {
    // A missing EXPLICIT target is a refusal. A missing DEFAULT target is also a refusal —
    // silently skipping it is how a gate starts checking less than it says it does.
    failures.push({
      where: target,
      detail: 'scan root is missing',
      why: 'there is nothing to scan there, so a PASS would be a statement about an empty set.',
    });
    continue;
  }
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (SCAN_EXTENSIONS.includes(path.extname(absolute))) {
      scanned.push({
        absolute,
        relative: path.relative(process.cwd(), absolute).split(path.sep).join('/'),
      });
    }
    continue;
  }
  const walk = (dir) => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SCAN_EXTENSIONS.includes(path.extname(entry.name))) continue;
      scanned.push({
        absolute: p,
        relative: path.relative(process.cwd(), p).split(path.sep).join('/'),
      });
    }
  };
  walk(absolute);
}

if (scanned.length === 0 && failures.length === 0) {
  failures.push({
    where: targets.join(', '),
    detail: 'zero files scanned',
    why: `no file matched ${SCAN_EXTENSIONS.join(' ')}. This run checked nothing and cannot pass.`,
  });
}

/*
 * Every rule HIT, whether or not it became a failure. Reported on the PASS line below.
 *
 * It was written and then never read — biome's `noUnusedVariables` was right about the symptom and
 * wrong about the cure. Deleting it would remove the only number that distinguishes "no rule
 * matched anything" from "rules matched and every hit was permitted", and those are very different
 * states for a gate whose whole job is an allow-list: the second says the allow-list is doing work,
 * the first is what a broken matcher also looks like.
 */
let findingCount = 0;

for (const file of scanned) {
  let text;
  try {
    text = fs.readFileSync(file.absolute, 'utf8');
  } catch (e) {
    failures.push({
      where: file.relative,
      detail: `unreadable — ${e.message}`,
      why: 'a file in scope that cannot be read has not been checked.',
    });
    continue;
  }
  bytesRead += text.length;

  for (const rule of RULES) {
    if (!rule.extensions.includes(path.extname(file.relative))) continue;
    for (const hit of rule.find(text, file.relative)) {
      findingCount++;
      if (rule.id === 'DS-BARREL') {
        failures.push({
          where: `${file.relative}:${hit.line}`,
          detail: `[DS-BARREL] "${hit.specifier}"  —  ${hit.lineText.slice(0, 100)}`,
          why: hit.why,
        });
        continue;
      }
      if (rule.id === 'DS-DYNAMIC') {
        failures.push({
          where: `${file.relative}:${hit.line}`,
          detail: `[DS-DYNAMIC] ${hit.expression}  —  ${hit.lineText.slice(0, 100)}`,
          why:
            'this file names the design system in a string AND imports a non-literal specifier. ' +
            'That pairing is how a textual specifier rule is walked through: assemble the barrel ' +
            'name in a variable, then import the variable. Import from a literal subpath instead.',
        });
        continue;
      }
      failures.push(
        (() => ({
          where: `${file.relative}:${hit.line}`,
          detail: `[DS-CLASS] <${hit.component} ${hit.attribute}=...>  —  ${hit.lineText.slice(0, 100)}`,
          why:
            `\`${hit.attribute}\` is not \`className\`. <${hit.component} ${hit.attribute}="x"> renders the ` +
            "design system's own atom class and drops yours, with no error and a plausible-looking page. " +
            'Use className, or wrap the component in an element that carries the class.',
        }))()
      );
    }
  }
}

if (scanned.length > 0 && bytesRead === 0) {
  failures.push({
    where: targets.join(', '),
    detail: `${scanned.length} file(s) scanned, 0 bytes read`,
    why: 'every file in scope was empty, so the rules were applied to nothing.',
  });
}

// A permitted deep specifier that no longer appears is an exemption nobody is reviewing.
if (usingDefaultTargets && failures.length === 0) {
  for (const [spec, meta] of PERMITTED_DEEP_SPECIFIERS) {
    if (!deepSpecifiersSeen.has(spec)) {
      failures.push({
        where: meta.file,
        detail: `permitted deep specifier "${spec}" matched nothing`,
        why:
          'the exemption is stale. Delete the entry — a standing permission for an import that ' +
          'no longer exists is a hole waiting for a name collision.',
      });
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * 2. Report. One named failure per line; never warn-and-exit-0.
 * ------------------------------------------------------------------------------------------- */

if (failures.length > 0) {
  err('');
  err('==============================================================================');
  err('  BUILD REFUSED — the design-system import contract is broken');
  err('==============================================================================');
  err('');
  err(`  scan targets: ${targets.join(', ')}`);
  err('');
  for (const f of failures) {
    err(`  x ${f.where}: ${f.detail}`);
    err(`      ${f.why}`);
  }
  err('');
  err(`  ${failures.length} finding(s). Requirements PUB-14, DS-09; threat T-05-01-03.`);
  err('');
  process.exit(1);
}

out('assert-ds-import-contract: PASS');
out(`  scan targets: ${targets.join(', ')}${usingDefaultTargets ? ' (default)' : ''}`);
out(`  scanned ${scanned.length} files (${bytesRead} bytes) matching ${SCAN_EXTENSIONS.join(' ')}`);
out(
  `  rule hits: ${findingCount} (a hit is a match; a hit on a permitted specifier is not a failure)`
);
out(
  `  self-test: ${RULES.length}/${RULES.length} rules flagged their canary and ignored their anti-canary; ${canariesChecked} canaries checked in total`
);
out(`  rules: ${RULES.map((r) => r.id).join(', ')}`);
out(`  permitted subpath shape: ${PERMITTED_SUBPATH.source}`);
out(`  permitted deep specifiers: ${PERMITTED_DEEP_SPECIFIERS.size}`);
for (const [spec, meta] of PERMITTED_DEEP_SPECIFIERS) out(`    - ${spec}  (only in ${meta.file})`);
out(
  '  prose that merely NAMES a specifier is not matched; a commented-out import still is — ' +
    'matching is by specifier position, not by string literal'
);
