#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const DEFAULT_SCAN_ROOTS = [
  { root: 'src/pages/photography', match: /./ },
  { root: 'src/components/public', match: /^Photo/ },
  { root: 'src/lib/photo-filter.ts', match: /./ },
  { root: 'src/lib/photo-srcset.ts', match: /./ },
];

const SCAN_EXTENSIONS = ['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

const RULES = [
  {
    id: 'DATE-DOT',
    what: 'a `.date` property access',
    pattern: /\.date\b/g,
  },
  {
    id: 'DATE-COMPUTED',
    what: 'a computed `["date"]` access, in any of the three quote styles',
    pattern: /\[\s*(['"`])date\1\s*\]/g,
  },
  {
    id: 'DATE-BINDING',
    what: 'a `{ date }` destructure, or an object literal naming the field',
    pattern: /[{,]\s*date\s*[,}:]/g,
  },
];

function insideQuotes(line, index) {
  let quote = null;
  for (let i = 0; i < index; i++) {
    const c = line[i];
    if (quote) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
  }
  return quote !== null;
}

export function splitLayers(text) {
  const code = [];
  const comment = [];
  let inBlock = false;

  text.split('\n').forEach((raw, i) => {
    const lineNumber = i + 1;
    const trimmed = raw.trim();

    if (inBlock) {
      comment.push({ lineNumber, text: raw });
      if (trimmed.includes('*/')) {
        inBlock = false;
        const tail = raw.slice(raw.lastIndexOf('*/') + 2);
        if (tail.trim().length > 0) code.push({ lineNumber, text: tail });
      }
      return;
    }

    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('<!--')) {
      comment.push({ lineNumber, text: raw });
      return;
    }

    if (trimmed.startsWith('/*') || trimmed.startsWith('{/*')) {
      comment.push({ lineNumber, text: raw });
      if (!trimmed.includes('*/')) inBlock = true;
      return;
    }

    const blockAt = raw.indexOf('/*');
    if (blockAt !== -1 && !insideQuotes(raw, blockAt)) {
      code.push({ lineNumber, text: raw.slice(0, blockAt) });
      comment.push({ lineNumber, text: raw.slice(blockAt) });
      if (!raw.slice(blockAt).includes('*/')) inBlock = true;
      return;
    }

    let cut = -1;
    for (let j = 0; j < raw.length - 1; j++) {
      if (raw[j] === '/' && raw[j + 1] === '/' && !insideQuotes(raw, j)) {
        cut = j;
        break;
      }
    }
    if (cut === -1) {
      code.push({ lineNumber, text: raw });
    } else {
      code.push({ lineNumber, text: raw.slice(0, cut) });
      comment.push({ lineNumber, text: raw.slice(cut) });
    }
  });

  return { code, comment };
}

function findings(layer) {
  const hits = [];
  for (const { lineNumber, text } of layer) {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      for (const m of text.matchAll(rule.pattern)) {
        hits.push({ rule: rule.id, what: rule.what, lineNumber, match: m[0], text: text.trim() });
      }
    }
  }
  return hits;
}

const codeFindings = (text) => findings(splitLayers(text).code);
const commentFindings = (text) => findings(splitLayers(text).comment);

const CANARIES = [
  ['a plain access', 'const d = photo.date;\n', 'DATE-DOT'],
  ['a nested access', 'const d = entry.data.date;\n', 'DATE-DOT'],
  ['a double-quoted computed key', 'const d = photo["date"];\n', 'DATE-COMPUTED'],
  ['a single-quoted computed key', "const d = photo['date'];\n", 'DATE-COMPUTED'],
  ['a backtick computed key', 'const d = photo[`date`];\n', 'DATE-COMPUTED'],
  ['a destructure', 'const { date } = photo;\n', 'DATE-BINDING'],
  ['a destructure among others', 'const { id, date, alt } = photo;\n', 'DATE-BINDING'],
  ['a renaming destructure', 'const { date: taken } = photo;\n', 'DATE-BINDING'],
  ['an object literal naming the field', 'const x = { date: photo.d };\n', 'DATE-BINDING'],
  ['a sort comparator', 'photos.sort((a, b) => a.date < b.date ? -1 : 1);\n', 'DATE-DOT'],
  ['an .astro template expression', '---\nconst p = x;\n---\n<time>{p.date}</time>\n', 'DATE-DOT'],
  ['a code line with a trailing comment', 'const d = photo.date; // why\n', 'DATE-DOT'],
];

const ANTI_CANARIES = [
  ['updatedAt', 'const u = record.updatedAt;\n'],
  ['a dateFormatter identifier', 'const f = dateFormatter(x);\nconst g = intl.dateFormatter;\n'],
  ['a destructured dateFormatter', 'const { dateFormatter } = deps;\n'],
  ['a dateModified property', 'const m = schema.dateModified;\n'],
  ['a plural `dates`', 'const all = manifest.dates;\nconst { dates } = manifest;\n'],
  ['a JSDoc line naming the field', ' * §9.4: photo.date is never rendered and never sorted by.\n'],
  [
    'a block comment naming the field',
    '/*\n * SORTED BY `order`. NEVER BY photo.date.\n */\nconst x = 1;\n',
  ],
  ['a line comment naming the field', '// never read photo.date here\nconst x = 1;\n'],
  ['a URL with a double slash', "const u = 'https://images.example.com/a.webp';\nconst d = u;\n"],
  ['an unrelated field', 'const c = photo.categoryOrder;\nconst o = photo.order;\n'],
];

const selfTestFailures = [];
if (RULES.length === 0)
  selfTestFailures.push('there are no rules — a scan cannot pass on nothing.');

for (const [label, body, expectedRule] of CANARIES) {
  const hits = codeFindings(body);
  if (hits.length === 0) {
    selfTestFailures.push(
      `canary "${label}" was NOT flagged. Every clean run this gate has reported is worthless.`
    );
    continue;
  }
  if (!hits.some((h) => h.rule === expectedRule)) {
    selfTestFailures.push(
      `canary "${label}" was flagged by ${hits.map((h) => h.rule).join('/')}, not by ${expectedRule} — the rule under test is not the one firing.`
    );
  }
}

for (const [label, body] of ANTI_CANARIES) {
  const hits = codeFindings(body);
  if (hits.length > 0) {
    selfTestFailures.push(
      `anti-canary "${label}" WAS flagged by ${hits.map((h) => `${h.rule} on ${JSON.stringify(h.match)}`).join(', ')}. A rule this broad gets disabled rather than obeyed.`
    );
  }
}

if (commentFindings('// never read photo.date here\n').length === 0) {
  selfTestFailures.push(
    'the comment layer reported nothing for a comment that plainly names the field, so the residual report cannot be trusted.'
  );
}

if (selfTestFailures.length > 0) {
  err('assert-photo-date-unrendered: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const f of selfTestFailures) err(`  x ${f}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const usingDefaults = args.length === 0;

for (const a of args) {
  if (a.trim().length === 0) {
    err('assert-photo-date-unrendered: REFUSED — a scan root argument is present but empty.');
    err("  path.resolve(cwd, '') is cwd, so this would have scanned the entire repository.");
    process.exit(1);
  }
}

const roots = usingDefaults ? DEFAULT_SCAN_ROOTS : args.map((root) => ({ root, match: /./ }));

const refusals = [];
const scanned = [];

for (const { root, match } of roots) {
  const absolute = path.resolve(process.cwd(), root);
  if (!fs.existsSync(absolute)) {
    refusals.push(
      `scan root ${JSON.stringify(root)} does not exist. A PASS here would be a statement about an empty set — which is exactly how "! grep" passes on a missing path.`
    );
    continue;
  }
  const before = scanned.length;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (SCAN_EXTENSIONS.includes(path.extname(absolute)) && match.test(path.basename(absolute))) {
      scanned.push(absolute);
    }
  } else {
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
        if (!match.test(entry.name)) continue;
        scanned.push(p);
      }
    };
    walk(absolute);
  }
  if (scanned.length === before) {
    refusals.push(
      `scan root ${JSON.stringify(root)} matched ZERO files (${SCAN_EXTENSIONS.join(' ')}${match.source === '(?:)' || match.source === '.' ? '' : `, names matching ${match}`}). This run would have checked nothing there and reported it as clean.`
    );
  }
}

if (refusals.length > 0) {
  err('');
  err('  BUILD REFUSED — assert-photo-date-unrendered checked nothing');
  for (const r of refusals) err(`  x ${r}`);
  err('');
  process.exit(1);
}

const failures = [];
const residuals = [];
let bytesRead = 0;

function firstControlCharacter(text) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x1f) continue;
    if (code === 0x09 || code === 0x0a || code === 0x0d) continue;
    return { code, offset: i };
  }
  return null;
}

for (const absolute of scanned) {
  const relative = path.relative(process.cwd(), absolute).split(path.sep).join('/');
  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch (e) {
    failures.push({
      kind: 'vacuity',
      where: relative,
      detail: `unreadable — ${e.message}. A file in scope that cannot be read has not been checked.`,
    });
    continue;
  }
  bytesRead += text.length;

  const control = firstControlCharacter(text);
  if (control) {
    failures.push({
      kind: 'vacuity',
      where: relative,
      detail: `contains the C0 control character U+${control.code.toString(16).padStart(4, '0').toUpperCase()} at offset ${control.offset}. It is refused rather than skipped: a control character can hide a line from a text matcher, and a file this gate cannot read confidently is a file it has not checked.`,
    });
    continue;
  }

  for (const hit of codeFindings(text)) {
    failures.push({
      kind: 'reference',
      where: `${relative}:${hit.lineNumber}`,
      detail: `[${hit.rule}] ${JSON.stringify(hit.match)} — ${hit.what}\n      ${hit.text.slice(0, 120)}`,
    });
  }
  for (const hit of commentFindings(text)) {
    residuals.push(`${relative}:${hit.lineNumber}  [${hit.rule}] ${hit.text.trim().slice(0, 110)}`);
  }
}

if (scanned.length > 0 && bytesRead === 0) {
  failures.push({
    kind: 'vacuity',
    where: roots.map((r) => r.root).join(', '),
    detail: `${scanned.length} file(s) scanned, 0 bytes read — every file in scope was empty, so the rules were applied to nothing.`,
  });
}

if (failures.length > 0) {
  const references = failures.filter((f) => f.kind === 'reference');
  const vacuity = failures.filter((f) => f.kind !== 'reference');
  err('');
  err('==============================================================================');
  err(
    references.length > 0
      ? '  BUILD REFUSED — a photo route or component references `photo.date`'
      : '  BUILD REFUSED — assert-photo-date-unrendered could not check what it claims to check'
  );
  err('==============================================================================');
  err('');
  err(`  scan roots: ${roots.map((r) => r.root).join(', ')}`);
  err('');
  for (const f of references) err(`  x ${f.where}: ${f.detail}`);
  if (references.length > 0 && vacuity.length > 0) err('');
  for (const f of vacuity) err(`  x ${f.where}: ${f.detail}`);
  err('');
  if (references.length === 0) {
    err('  Nothing above is a rendered date. Every line is a way this run would have checked less');
    err('  than it says it does, which a green exit would have hidden.');
    err('');
    process.exit(1);
  }
  err('  The manifest carries three distinct dates across forty records — an ingest window, not a');
  err('  capture history — and the field means "published" on every record that exists today and');
  err('  "taken" on every record filed after the pipeline changes. Rendering it would state one');
  err('  meaning for both, and no backfill can tell them apart. REQUIREMENTS.md §Out of Scope and');
  err('  05-UI-SPEC.md §9.4 both settled this. Requirement PUB-14 adjacent; §9.4 owns it.');
  err('');
  process.exit(1);
}

out('assert-photo-date-unrendered: PASS');
out(`  scan roots: ${roots.map((r) => r.root).join(', ')}${usingDefaults ? ' (default)' : ''}`);
out(
  `  scanned ${scanned.length} file(s), ${bytesRead} bytes, matching ${SCAN_EXTENSIONS.join(' ')}`
);
for (const f of scanned) out(`    - ${path.relative(process.cwd(), f).split(path.sep).join('/')}`);
out(
  `  self-test: ${CANARIES.length} canaries fired on the code layer, ${ANTI_CANARIES.length} anti-canaries stayed silent, and the comment layer proved it can still see the field`
);
out(`  rules: ${RULES.map((r) => `${r.id} ${r.pattern}`).join('   ')}`);
out(`  comment-layer residuals (REPORTED, not refused): ${residuals.length}`);
for (const r of residuals) out(`    ~ ${r}`);
out(
  '  known blind spots: a split key `photo["da" + "te"]` and a computed key `photo[k]` are both invisible to a textual rule (W1, W2).'
);
