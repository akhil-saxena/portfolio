#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_SCAN_ROOT = 'dist';
const SCAN_EXTENSIONS = ['.html'];

const out = (line) => process.stdout.write(`${line}\n`);

const BRACE_ENTITIES = [
  { re: /&#0*123;|&#[xX]0*7[bB];|&lbrace;|&lcub;/g, char: '{' },
  { re: /&#0*125;|&#[xX]0*7[dD];|&rbrace;|&rcub;/g, char: '}' },
];

export function decodeBraceEntities(text) {
  let decoded = text;
  for (const entity of BRACE_ENTITIES) {
    decoded = decoded.replace(entity.re, entity.char);
  }
  return decoded;
}

/**
 * The detection rule itself: `{{` not immediately followed by another `{`. Exported so the unit
 * suite tests THIS function rather than a second regex that would only ever prove it agrees with
 * itself.
 *
 * @returns {Array<{ index: number, token: string }>} one entry per occurrence
 */
export function findPlaceholders(text) {
  if (typeof text !== 'string') return [];
  const hits = [];
  for (const match of text.matchAll(/\{\{(?!\{)/g)) {
    const window = text.slice(match.index, match.index + 200);
    const closed = /^\{\{[^}]*\}\}/.exec(window);
    hits.push({ index: match.index, token: closed ? closed[0] : '{{' });
  }
  return hits;
}

function locate(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const context = text
    .slice(Math.max(0, index - 30), index + 30)
    .replace(/\n/g, '\\n')
    .trim();
  return { line, context };
}

const RULES = [
  {
    id: 'PH-RAW',
    what: 'an unresolved template placeholder in shipped HTML',
    find: (text) => findPlaceholders(text),
    canaries: [
      { name: 'a bare token', text: '<p>{{metric.value}}</p>', expect: true },
      { name: 'a token in an HTML comment', text: '<!-- {{metric.label}} -->', expect: true },
      {
        name: 'a triple brace, caught by the overlapping occurrence',
        text: '<p>{{{raw}}}</p>',
        expect: true,
      },
      { name: 'single braces in prose', text: '<p>a set { x } of one</p>', expect: false },
      {
        name: 'a resolved metric, which is what correct output looks like',
        text: '<p><span>+15%</span><span>CONVERSION</span></p>',
        expect: false,
      },
      {
        name: 'a double-escaped entity',
        text: '<p>&amp;#123;&amp;#123;metric.value&amp;#125;&amp;#125;</p>',
        expect: false,
      },
    ],
  },
  {
    id: 'PH-ENTITY',
    what: 'an entity-encoded placeholder that a browser paints as {{…}}',
    find: (text) => findPlaceholders(decodeBraceEntities(text)),
    canaries: [
      {
        name: 'decimal entities',
        text: '<p>&#123;&#123;metric.value&#125;&#125;</p>',
        expect: true,
      },
      {
        name: 'hex entities, padded and upper-case',
        text: '<p>&#X007B;&#x7b;x&#x7D;&#x7d;</p>',
        expect: true,
      },
      {
        name: 'named entities',
        text: '<p>&lbrace;&lcub;metric.label&rcub;&rbrace;</p>',
        expect: true,
      },
      {
        name: 'a mixed literal-and-entity pair',
        text: '<p>{&#123;metric.value}}</p>',
        expect: true,
      },
      {
        name: 'a single encoded brace in prose',
        text: '<p>the &#123; character</p>',
        expect: false,
      },
      { name: 'a double-escaped entity', text: '<p>&amp;#123;&amp;#123;x</p>', expect: false },
    ],
  },
];

export function main() {
  const selfTestFailures = [];
  let canariesChecked = 0;

  if (RULES.length === 0) {
    selfTestFailures.push('there are no rules — a scan with nothing to look for cannot pass.');
  }

  for (const rule of RULES) {
    if (rule.canaries.length === 0) {
      selfTestFailures.push(`${rule.id}: has no canaries, so nothing proves it can fire.`);
    }
    if (!rule.canaries.some((c) => c.expect) || !rule.canaries.some((c) => !c.expect)) {
      selfTestFailures.push(
        `${rule.id}: needs at least one canary AND one anti-canary. A rule tested only against ` +
          'material it should flag cannot be shown to be too broad, and vice versa.'
      );
    }
    for (const canary of rule.canaries) {
      canariesChecked++;
      const fired = rule.find(canary.text).length > 0;
      if (fired !== canary.expect) {
        selfTestFailures.push(
          canary.expect
            ? `${rule.id}: did NOT flag its canary "${canary.name}". The rule is broken, and every ` +
                'clean run it has ever reported is worthless.'
            : `${rule.id}: flagged its anti-canary "${canary.name}". The rule is too broad and ` +
                'would be switched off rather than obeyed.'
        );
      }
    }
  }

  if (selfTestFailures.length > 0) {
    out('assert-no-unresolved-placeholders: SELF-TEST FAILED — the gate cannot be trusted.');
    for (const failure of selfTestFailures) out(`  x ${failure}`);
    process.exit(1);
  }

  const scanRootArg = process.argv[2];

  if (scanRootArg !== undefined && scanRootArg.trim().length === 0) {
    out(
      'assert-no-unresolved-placeholders: REFUSED — the scan root argument is present but empty.'
    );
    out(
      "  path.resolve(cwd, '') is cwd, so this would have scanned the whole repository rather than " +
        `the directory you meant. Pass a real path, or pass no argument to scan ${DEFAULT_SCAN_ROOT}/.`
    );
    process.exit(1);
  }

  const scanRoot = path.resolve(process.cwd(), scanRootArg ?? DEFAULT_SCAN_ROOT);
  const display = (absolute) => {
    const relative = path.relative(process.cwd(), absolute);
    return relative === '' || relative.startsWith('..') ? absolute : relative;
  };

  const failures = [];
  const scanned = [];
  let bytesRead = 0;
  let occurrences = 0;

  if (!fs.existsSync(scanRoot) || !fs.statSync(scanRoot).isDirectory()) {
    failures.push({
      where: display(scanRoot),
      detail: 'scan root is missing or is not a directory',
      why:
        'a gate that read nothing is indistinguishable from a gate that found nothing. Build ' +
        'first, or pass the right path.',
    });
  } else {
    const walk = (dir) => {
      for (const entry of fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(absolute);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!SCAN_EXTENSIONS.includes(path.extname(entry.name))) continue;
        scanned.push(absolute);
      }
    };
    walk(scanRoot);
  }

  if (scanned.length === 0 && failures.length === 0) {
    failures.push({
      where: display(scanRoot),
      detail: 'scan root matched no HTML',
      why:
        'a gate that read nothing is indistinguishable from a gate that found nothing. No file ' +
        `under it matched ${SCAN_EXTENSIONS.join(' ')}, so this run checked nothing and cannot pass.`,
    });
  }

  for (const absolute of scanned) {
    let text;
    try {
      text = fs.readFileSync(absolute, 'utf8');
    } catch (error) {
      failures.push({
        where: display(absolute),
        detail: `unreadable — ${error.message}`,
        why: 'a file in scope that cannot be read has not been checked, so it cannot be passed.',
      });
      continue;
    }
    bytesRead += text.length;

    const lines = text.split('\n');
    lines.forEach((lineText, lineIndex) => {
      const raw = findPlaceholders(lineText);
      for (const hit of raw) {
        occurrences++;
        const { context } = locate(lineText, hit.index);
        failures.push({
          where: `${display(absolute)}:${lineIndex + 1}`,
          detail: `[PH-RAW] ${hit.token}`,
          why: `…${context}…`,
        });
      }
      if (raw.length > 0) return;
      const decoded = decodeBraceEntities(lineText);
      for (const hit of findPlaceholders(decoded)) {
        occurrences++;
        const { context } = locate(decoded, hit.index);
        failures.push({
          where: `${display(absolute)}:${lineIndex + 1}`,
          detail: `[PH-ENTITY] ${hit.token}  (after decoding numeric/named brace references)`,
          why: `…${context}… — the browser paints this as a brace pair, so it ships as a placeholder`,
        });
      }
    });
  }

  if (scanned.length > 0 && bytesRead === 0) {
    failures.push({
      where: display(scanRoot),
      detail: `${scanned.length} file(s) scanned, 0 bytes read`,
      why: 'every file in scope was empty, so the rules were applied to nothing.',
    });
  }

  if (failures.length > 0) {
    out('');
    out('==============================================================================');
    out('  BUILD REFUSED — OQ-1b: an unresolved placeholder reached rendered HTML');
    out('==============================================================================');
    out('');
    out(`  scan root: ${scanRoot}`);
    out('');
    for (const failure of failures) {
      out(`  x ${failure.where}: ${failure.detail}`);
      out(`      ${failure.why}`);
    }
    out('');
    out('  WHY THIS MATTERS:');
    out('');
    out('    A placeholder in dist/ is a placeholder a reader sees. The employment band is the');
    out(
      '    first thing a hiring manager reads on /development, and this project has twice measured a'
    );
    out("    placeholder passing every rule it was subject to - Phase 3's stale component figure");
    out('    and Phase 4\'s alt: "TODO". Resolve the token, or remove it from the page.');
    out('');
    out(`  ${failures.length} finding(s) (${occurrences} occurrence(s)).`);
    out('  Open question OQ-1b; requirement PUB-02; threat T-05-03-01.');
    out('');
    process.exit(1);
  }

  out('assert-no-unresolved-placeholders: PASS');
  out(`  scan root: ${scanRoot}`);
  out(
    `  scanned ${scanned.length} file(s) (${bytesRead} bytes) matching ${SCAN_EXTENSIONS.join(' ')}`
  );
  out(
    `  self-test: ${RULES.length}/${RULES.length} rules flagged every canary and ignored every ` +
      `anti-canary; ${canariesChecked} canaries checked`
  );
  out(`  rules: ${RULES.map((rule) => rule.id).join(', ')}`);
  out('  no token names are enumerated — any {{…}} in shipped HTML is a failure');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
