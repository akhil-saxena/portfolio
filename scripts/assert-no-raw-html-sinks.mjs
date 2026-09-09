#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SCAN_ROOT = 'src';
const scanRootArg = process.argv[2];
const usingDefaultRoot = scanRootArg === undefined;

if (scanRootArg !== undefined && scanRootArg.trim().length === 0) {
  console.error('assert-no-raw-html-sinks: REFUSED — the scan root argument is present but empty.');
  console.error(
    "  path.resolve(cwd, '') is cwd, so this would have scanned the entire repository rather " +
      'than the directory you meant. Pass a real path, or pass no argument to scan ' +
      `${DEFAULT_SCAN_ROOT}/.`
  );
  process.exit(1);
}

const scanRoot = path.resolve(process.cwd(), scanRootArg ?? DEFAULT_SCAN_ROOT);

const display = (absolute) => {
  const relative = path.relative(process.cwd(), absolute);
  return relative === '' || relative.startsWith('..') ? absolute : relative;
};

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.astro'];

const RULES = [
  {
    id: 'REACT-RAW-HTML',
    what: "React's raw-HTML prop",
    why:
      'this is the sink the legacy repository actually used, in four places, with no sanitiser ' +
      'anywhere in it. Render runs as elements and text children instead — src/components/' +
      'Bullets.tsx is the worked example, and React escapes text children by construction.',
    pattern: /dangerouslySetInnerHTML/g,
    usePattern: /dangerouslySetInnerHTML\s*[=:]/,
    canary: 'export const A = <div dangerouslySetInnerHTML={{ __html: x }} />;\n',
    antiCanary: 'export const A = <div data-html-safe="yes">{x}</div>;\n',
  },
  {
    id: 'ASTRO-SET-HTML',
    what: "Astro's raw-HTML directive",
    why:
      'the same mistake in Astro spelling, and Phase 5 writes the first pages. Use set:text for ' +
      'text, or render the content through a React component that emits elements.',
    pattern: /set:html(?![\w-])/g,
    usePattern: /set:html\s*=/,
    canary: '<div set:html={x} />\n',
    antiCanary: '<div set:text={x} data-set-html-note="not a sink" />\n',
  },
  {
    id: 'DOM-INNERHTML-ASSIGN',
    what: 'assignment to .innerHTML / .outerHTML',
    why:
      'the plain-DOM spelling, reachable from the delegated inline-script pattern ' +
      'research/ARCHITECTURE.md Pattern 3 recommends for the theme toggle. Use textContent, or ' +
      'build nodes with createElement.',
    pattern: /\.\s*(?:inner|outer)HTML\s*(?:\+=|=(?!=))/g,
    canary: 'el.innerHTML = markup;\n',
    antiCanary: 'if (el.innerHTML === markup) { const s = el.outerHTML; }\n',
  },
  {
    id: 'DOM-INSERT-ADJACENT-HTML',
    what: 'insertAdjacentHTML',
    why:
      'parses an HTML string exactly as .innerHTML does; banning one and not the other is a ban ' +
      'on a spelling rather than on a behaviour.',
    pattern: /\binsertAdjacentHTML\s*\(/g,
    canary: 'el.insertAdjacentHTML("beforeend", markup);\n',
    antiCanary: 'el.insertAdjacentElement("beforeend", node);\n',
  },
  {
    id: 'DOM-DOCUMENT-WRITE',
    what: 'document.write / document.writeln',
    why: 'the oldest HTML-string sink of the lot, and still reachable from an inline script.',
    pattern: /\bdocument\s*\.\s*write(?:ln)?\s*\(/g,
    antiCanary: 'const written = document.querySelector("[data-write]");\n',
    canary: 'document.write(markup);\n',
  },
];

const ALLOWLIST = [
  {
    rule: 'REACT-RAW-HTML',
    file: 'src/schemas/resume.ts',
    context: 'the legacy app rendered these strings through',
    reason:
      "the zod refinement's own error message, which tells whoever trips it WHY bold-only markdown is the stored shape. An error message that explains itself is worth more than a clean grep.",
  },
];

function occurrences(rule, text) {
  rule.pattern.lastIndex = 0;
  const out = [];
  for (const match of text.matchAll(rule.pattern)) {
    const before = text.slice(0, match.index);
    const line = before.split('\n').length;
    const column = match.index - before.lastIndexOf('\n');
    const lineText = text.split('\n')[line - 1] ?? '';
    out.push({ line, column, match: match[0], lineText: lineText.trim() });
  }
  return out;
}

const selfTestFailures = [];

if (RULES.length === 0) {
  selfTestFailures.push('there are no rules — a scan with nothing to look for cannot pass.');
}

for (const rule of RULES) {
  if (occurrences(rule, rule.canary).length === 0) {
    selfTestFailures.push(
      `${rule.id}: did NOT flag its own canary. The rule is broken, and every clean run it has ` +
        'ever reported is worthless.'
    );
  }
  if (occurrences(rule, rule.antiCanary).length > 0) {
    selfTestFailures.push(
      `${rule.id}: flagged its own anti-canary. The rule is too broad and would be disabled ` +
        'rather than obeyed.'
    );
  }
  if (rule.usePattern && !rule.usePattern.test(rule.canary)) {
    selfTestFailures.push(
      `${rule.id}: its usePattern does not match its own canary, so the allowlist would forgive ` +
        'a real sink in this rule.'
    );
  }
}

for (const entry of ALLOWLIST) {
  if (!RULES.some((rule) => rule.id === entry.rule)) {
    selfTestFailures.push(
      `allowlist entry for ${entry.file} names rule ${entry.rule}, which does not exist.`
    );
  }
  if (!entry.reason || entry.reason.trim().length < 20) {
    selfTestFailures.push(
      `allowlist entry for ${entry.file} carries no usable reason. An exemption without a reason ` +
        'is an exemption nobody can review.'
    );
  }
}

if (selfTestFailures.length > 0) {
  console.error('assert-no-raw-html-sinks: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const failure of selfTestFailures) console.error(`  x ${failure}`);
  process.exit(1);
}

const failures = [];
const scanned = [];
let bytesRead = 0;

if (!fs.existsSync(scanRoot) || !fs.statSync(scanRoot).isDirectory()) {
  failures.push({
    where: display(scanRoot),
    detail: 'scan root is missing or is not a directory',
    why: 'there is nothing to scan, so a PASS would be a statement about an empty set.',
  });
} else {
  const walk = (dir) => {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SCAN_EXTENSIONS.includes(path.extname(entry.name))) continue;
      scanned.push({
        absolute,
        relative: path.relative(process.cwd(), absolute).split(path.sep).join('/'),
      });
    }
  };
  walk(scanRoot);
}

if (scanned.length === 0 && failures.length === 0) {
  failures.push({
    where: display(scanRoot),
    detail: 'zero files scanned',
    why:
      `no file under it matched ${SCAN_EXTENSIONS.join(' ')}. Either the tree moved or the ` +
      'extension list is wrong; either way this run checked nothing and cannot pass.',
  });
}

const allowlistHits = new Map(ALLOWLIST.map((entry) => [entry, 0]));
let findings = 0;

for (const file of scanned) {
  let text;
  try {
    text = fs.readFileSync(file.absolute, 'utf8');
  } catch (error) {
    failures.push({
      where: file.relative,
      detail: `unreadable — ${error.message}`,
      why: 'a file in scope that cannot be read has not been checked, so it cannot be passed.',
    });
    continue;
  }
  bytesRead += text.length;

  for (const rule of RULES) {
    for (const hit of occurrences(rule, text)) {
      const exemption = ALLOWLIST.find(
        (entry) =>
          entry.rule === rule.id &&
          entry.file === file.relative &&
          hit.lineText.toLowerCase().includes(entry.context.toLowerCase())
      );
      const isUse = rule.usePattern ? rule.usePattern.test(hit.lineText) : true;
      if (exemption && !isUse) {
        allowlistHits.set(exemption, allowlistHits.get(exemption) + 1);
        continue;
      }
      findings++;
      failures.push({
        where: `${file.relative}:${hit.line}:${hit.column}`,
        detail: `[${rule.id}] ${hit.match}  —  ${hit.lineText.slice(0, 100)}`,
        why: rule.why,
      });
    }
  }
}

if (scanned.length > 0 && bytesRead === 0) {
  failures.push({
    where: display(scanRoot),
    detail: `${scanned.length} file(s) scanned, 0 bytes read`,
    why: 'every file in scope was empty, so the rules were applied to nothing.',
  });
}

if (usingDefaultRoot && failures.length === 0) {
  for (const [entry, hits] of allowlistHits) {
    if (hits === 0) {
      failures.push({
        where: entry.file,
        detail: `allowlist entry for [${entry.rule}] matched nothing`,
        why:
          `the exempted line ("${entry.context}") is no longer there. Delete the entry — a ` +
          'standing exemption for text that no longer exists is a hole waiting for a name ' +
          'collision.',
      });
    }
  }
}

if (failures.length > 0) {
  console.error('');
  console.error('==============================================================================');
  console.error('  BUILD REFUSED — CONT-03: a raw-HTML sink is reachable under the scan root');
  console.error('==============================================================================');
  console.error('');
  console.error(`  scan root: ${scanRoot}`);
  console.error('');
  for (const failure of failures) {
    console.error(`  x ${failure.where}: ${failure.detail}`);
    console.error(`      ${failure.why}`);
  }
  console.error('');
  console.error('  WHY THIS MATTERS:');
  console.error('');
  console.error('    The legacy stored-XSS class here was entirely a rendering defect: four call');
  console.error('    sites passed resume bullet strings to a raw-HTML sink, with no sanitiser');
  console.error('    anywhere in the repository. The stored shape cannot express a tag and the');
  console.error('    schema rejects one - but a correct store with a careless renderer reopens');
  console.error('    the hole exactly. src/components/Bullets.tsx is the worked alternative.');
  console.error('');
  console.error(`  ${failures.length} finding(s) (${findings} sink occurrence(s)).`);
  console.error('  Requirement CONT-03; criterion 3; threats T-03-07-01, T-03-07-02.');
  console.error('');
  process.exit(1);
}

const exempted = [...allowlistHits.values()].reduce((a, b) => a + b, 0);

console.log('assert-no-raw-html-sinks: PASS');
console.log(`  scan root: ${scanRoot}`);
console.log(
  `  scanned ${scanned.length} files (${bytesRead} bytes) matching ${SCAN_EXTENSIONS.join(' ')}, ` +
    `${RULES.length} rules applied`
);
console.log(
  `  self-test: ${RULES.length}/${RULES.length} rules flagged their canary and ignored their anti-canary`
);
console.log(`  rules: ${RULES.map((rule) => rule.id).join(', ')}`);
console.log(
  `  allowlist: ${ALLOWLIST.length} entr(y/ies), ${exempted} documentation mention(s) exempted` +
    `${usingDefaultRoot ? ', all still matching' : ' (freshness not enforced on a non-default root)'}`
);
for (const entry of ALLOWLIST) {
  console.log(`    - [${entry.rule}] ${entry.file} — ${entry.reason}`);
}
