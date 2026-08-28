#!/usr/bin/env node

/**
 * PUB-14 / DS-09 structural gate — the design system is imported from its own subpaths, and
 * never given a `class` attribute.
 *
 * Usage: node scripts/assert-ds-import-contract.mjs [scanRoot ...]
 *        (with no argument, scans the DEFAULT_SCAN_TARGETS below)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL
 *
 * Two failure modes, both silent, both measured, both cheap to make loud.
 *
 * 1. THE BARREL. MEASURED, 05-UI-SPEC.md §1.1, transitive module graphs resolved from `dist/`:
 *
 *        components/Lightbox      9 files    15,351 B   react, react-dom, lucide-react   no tiptap, no dnd-kit
 *        the barrel  "."        101 files   416,590 B   tiptap x6, dnd-kit x3            PRESENT
 *
 *    One `import { Chip } from '@akhil-saxena/design-system'` reintroduces ~400 KB of rich-text
 *    editor and drag-and-drop into a public route whose budget is zero framework JavaScript.
 *    The page still renders. Nothing errors. PUB-14 is simply gone.
 *
 *    STATE.md records that the barrel now tree-shakes (an `import { Chip }` island fell from
 *    570,555 B to 1,620 B). That is a Rolldown behaviour measured in a DIFFERENT REPOSITORY, and
 *    G-15/DS-09 is satisfied BY CONSTRUCTION on the subpath path rather than by trusting a
 *    bundler to keep behaving. This gate does not depend on tree-shaking and must not be
 *    weakened on the grounds that tree-shaking exists.
 *
 * 2. `class` IS NOT `className`. Phase 0 lost this twice. `<Card class="wk-card">` renders
 *    `class="ds-atom-card"` — the consumer's class is dropped, with no error, no warning and a
 *    plausible-looking page. `querySelectorAll('.wk-card').length` was 0. Every layout rule
 *    written against that class silently applies to nothing.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY [DS-BARREL] ENUMERATES THE PERMITTED SHAPE INSTEAD OF DENY-LISTING THE BARREL
 *
 * This is the standing lesson of this project, and it was paid for. A git-argv deny-list was
 * defeated THREE WAYS — `push -f`, a `+refspec`, and `git add .` — with the guard silent and the
 * case green. A deny-list enumerates what its author thought of. A permitted-shape allow-list
 * enumerates what is known to be safe and refuses everything else, so the failure mode of an
 * imagination gap is a FALSE ALARM (loud, fixable) rather than a MISS (silent, shipped).
 *
 * The permitted set here is small and closed, so the allow-list is cheap:
 *
 *        @akhil-saxena/design-system/icons
 *        @akhil-saxena/design-system/components/<Name>
 *        @akhil-saxena/design-system/<anything>.css
 *        @akhil-saxena/design-system/css/<name>
 *
 * Everything else under that package name fails, INCLUDING subpaths that do not exist yet.
 * `/hooks` is a real export and is deliberately NOT permitted: it is a barrel of its own.
 *
 * The scan is over STRING LITERALS, not over `import` statements, and that is the second half of
 * the same idea. A specifier is a string, whatever syntax carries it — so `import x from`,
 * `import '...'` side-effect form, `export ... from`, `require(...)`, and dynamic
 * `await import(...)` are all covered by construction rather than by five separate patterns,
 * four of which someone would forget. Single, double and backtick quotes are all read: 03-06
 * shipped four predicates that could not fire because they matched only double quotes in a
 * repository whose formatter enforces single ones.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS GATE CANNOT SEE. Each was found by trying to WALK THROUGH it, not by imagining.
 *
 *  R1. A SPECIFIER SPLIT ACROSS LITERALS. `'@akhil-saxena/design-' + 'system'` is invisible,
 *      because no single literal carries the package name. This is the same class as
 *      assert-no-raw-html-sinks.mjs's blind spot 1 (`el["inner" + "HTML"]`) and closing it needs
 *      an AST pass. A specifier assembled from a template literal WITH the package name still
 *      inside it IS caught, because the literal is still there. RECORDED, NOT CLOSED.
 *
 *  R2. `scripts/` IS NOT SCANNED BY DEFAULT, and this file is the reason: it names the barrel
 *      specifier in its own canaries and prose, so it would flag itself. `src/`, `test/` and
 *      `astro.config.mjs` ARE scanned by default — the plan asked only for `src`, but a barrel
 *      import from `astro.config.mjs` reaches the build graph and a plan-check named exactly
 *      that escape. If a script ever imports the design system, add it explicitly.
 *
 *  R3. IT SAYS NOTHING ABOUT THE BUILT OUTPUT. A dependency of a permitted subpath could pull
 *      the forbidden families in without any source file naming the barrel. Plan 05-14 checks
 *      the emitted chunks independently, which is a different claim and needs a different gate.
 *
 *  R4. [DS-CLASS] READS `.astro` ONLY. A `class=` on a design-system component inside a `.tsx`
 *      island is not checked here — in TSX `class` is a plain unknown prop, and React would warn
 *      at runtime. The measured, silent loss is the Astro one.
 *
 * ---------------------------------------------------------------------------------------------
 * THE SELF-TEST, WHICH RUNS ON EVERY INVOCATION
 *
 * This project has shipped nineteen gates that could not fail. So every rule carries a CANARY it
 * must flag and an ANTI-CANARY it must leave alone, both checked before the real scan on every
 * run; a rule failing either aborts the gate rather than reporting a clean tree. The scan also
 * refuses to pass when the root is missing, when it matched no files, or when every file it read
 * was empty — three separate ways a run can check nothing and still look green.
 *
 * Reporting is `process.stdout.write` / `process.stderr.write`, NEVER `console.log`. Under this
 * repository's vitest setup console output prints nothing (measured by 04-01 with a probe: both
 * console markers appeared 0 times, the stdout marker once), and a gate reporting findings
 * through a swallowed channel is indistinguishable from a gate that found nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

/** See R2. `scripts/` is excluded because this file would flag itself. */
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

/** Which PERMITTED_DEEP_SPECIFIERS were actually used, so a stale one can be reported. */
const deepSpecifiersSeen = new Set();

/**
 * THE PERMITTED SHAPE. Anything under the package name that does not match this is refused.
 * `/hooks` is intentionally absent — it is a barrel of its own. The bare package name is
 * intentionally absent — it is THE barrel.
 */
const PERMITTED_SUBPATH =
  /^@akhil-saxena\/design-system\/(icons|components\/[A-Za-z][A-Za-z0-9]*|[a-z0-9./-]+\.css|css\/[a-z0-9-]+)$/;

/**
 * Deep paths that reach into `node_modules/@akhil-saxena/design-system/...` bypass the package's
 * exports map entirely, so PERMITTED_SUBPATH never sees them —
 * `'../../node_modules/@akhil-saxena/design-system/dist/index.js'` IS the barrel, spelled so that
 * a subpath rule cannot notice. Enumerated permitted set, pinned to the one file allowed to do
 * it, rather than an allowlist that forgives a category.
 */
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

/**
 * SPECIFIER POSITION. A string is only a specifier when something imports it, so these patterns
 * capture the string OUT OF an import construct rather than scanning every literal in the file.
 *
 * This is what keeps the gate usable. An earlier revision matched every string literal and
 * produced SEVEN findings against correct code — all of them prose in this repository's own
 * comments explaining the contract. A gate that fires on every push is a gate that gets turned
 * off within a day, which is the failure mode where a gate is worse than no gate.
 *
 * It does NOT skip comments. A commented-out `// import { Chip } from '@akhil-saxena/design-system'`
 * still matches, because the comment still contains the import construct — and a scanner that
 * skips comments is defeated the day someone uncomments a line. What no longer matches is prose
 * that merely NAMES a specifier without importing it. That distinction is the whole point.
 *
 * `require.resolve(...)` is deliberately excluded: it returns a path and creates no edge in the
 * module graph, so it cannot carry tiptap into a chunk. The rule is about graph edges.
 */
const SPECIFIER_PATTERNS = [
  // import ... from '<s>'   /   export ... from '<s>'   (clause may span lines)
  /\b(?:import|export)\b[\s\S]{0,400}?\bfrom\s*(['"`])([^'"`\n]+)\1/g,
  // side-effect: import '<s>'
  /\bimport\s*(['"`])([^'"`\n]+)\1/g,
  // dynamic: import('<s>')
  /\bimport\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)/g,
  // require('<s>') but NOT require.resolve('<s>')
  /\brequire\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)/g,
  // css: @import '<s>'  /  @import url('<s>')
  /@import\s+(?:url\(\s*)?(['"`])([^'"`\n]+)\1/g,
];

/** Every specifier in the file, deduped by (line, specifier). */
function specifiers(text) {
  const seen = new Map();
  const lines = text.split('\n');
  for (const re of SPECIFIER_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const value = m[2];
      if (value === undefined) continue;
      // Report the line the SPECIFIER sits on, not the line the construct started on.
      const idx = m.index + m[0].lastIndexOf(value);
      const line = text.slice(0, idx).split('\n').length;
      const key = `${line}\u0000${value}`;
      if (seen.has(key)) continue;
      seen.set(key, { value, line, lineText: (lines[line - 1] ?? '').trim() });
    }
  }
  return [...seen.values()];
}

/**
 * The indirection walk-through, scoped so it cannot be noisy. Assembling a specifier in a
 * variable and dynamically importing it defeats any textual specifier rule:
 *
 *     const B = '@akhil-saxena/design-system';
 *     const ds = await import(B);
 *
 * The second line alone is legitimate almost everywhere, so this fires ONLY when the same file
 * also names the package in a string. That pairing is the evasion; either half alone is not.
 */
const DYNAMIC_CALL = /\b(?:import|require)\s*\(\s*([^)]*)\)/g;
const NAMES_PACKAGE = /['"`][^'"`\n]*@akhil-saxena\/design-system/;

/**
 * A specifier is "static" only if the whole argument is ONE plain literal with no interpolation.
 * A backtick string carrying `${...}` is NOT static — that hole was found by this gate's own
 * self-test, against its own canary, after an earlier revision excluded every backtick string
 * indiscriminately. Recorded because it is the argument for canaries: the rule was wrong for
 * about four minutes and the canary is what said so.
 */
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
