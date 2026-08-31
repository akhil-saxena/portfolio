#!/usr/bin/env node

/**
 * §9.4 — `photo.date` may not be referenced from anything that renders a photograph.
 *
 * Usage: node scripts/assert-photo-date-unrendered.mjs [scanRoot ...]
 *        (with no argument, scans DEFAULT_SCAN_ROOTS below)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE FIELD IS UNRENDERABLE, WHICH IS NOT THE SAME AS "NOT WORTH RENDERING"
 *
 * MEASURED on the committed manifest: forty records carry THREE distinct dates. That is an ingest
 * window, not a capture history. §9.4 measured two when the corpus was 39; the number moved and
 * the conclusion did not, which is the point — nothing here counts them.
 *
 * `REQUIREMENTS.md` §Out of Scope settled it: *"Photo date display or sorting — The stored dates
 * are ingest dates from a 10-day window, not capture dates — showing them would misrepresent the
 * work."*
 *
 * The reason it needs a GATE rather than a note is the permanent split the field carries: existing
 * records mean "published", future records will mean "taken". A renderer that displayed it would
 * imply ONE meaning for both, and there is no backfill that could reconcile them — the information
 * to tell the two apart was never captured. So the failure mode of a future edit is not an ugly
 * page; it is a page that makes a false claim about when forty photographs were made, and looks
 * completely correct while doing it. That is what a standing refusal is for.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT REFUSES, AND WHY THESE FOUR FORMS
 *
 *   R1  `.date`               — the ordinary access, `photo.date` / `record.data.date`
 *   R2  `["date"]` `['date']` `[\`date\`]`  — the computed access, all three quote styles
 *   R3  `{ date }` `{ date: x }`  — the destructure, and the object literal that names the field
 *
 * ALL THREE QUOTE STYLES ARE READ. 03-06 shipped four predicates that could not fire because they
 * matched only double quotes in a repository whose formatter enforces single ones — a gate that
 * cannot fire is indistinguishable from a clean tree, and this project has shipped nineteen of them.
 *
 * `\b` after `date` is what keeps the rule from being a substring match on the four letters:
 * `updatedAt`, `dateFormatter`, `.dateModified` and `dates` are all left alone, and each is an
 * anti-canary below. A rule that reddened legitimate code would be turned off within a day, which
 * is the failure mode where a gate is worse than no gate.
 *
 * ---------------------------------------------------------------------------------------------
 * THE COMMENT LAYER IS REPORTED, NOT FAILED — AND THAT IS THE HARDEST DECISION HERE
 *
 * This repository's recurring defect class is a text matcher reading its own explanation as the
 * violation: 05-06 (`Seo.astro` vs `gate:sinks`), 05-07 (`gate:schema` refusing the comment that
 * explained why the condition was phrased as it was), 05-08 (`grep -c 'pd-exif'` returning 5 on a
 * page that renders none). Every route this gate scans carries a comment saying the field is never
 * rendered, and 05-12's own island header quotes the rule. A gate that fired on those would be
 * disabled the first time it ran.
 *
 * So the file is split into a CODE layer and a COMMENT layer. Findings on the code layer are a
 * REFUSAL. Findings on the comment layer are PRINTED as residuals with their line and text, and
 * exit 0 — visible, auditable, and not a red build. The walk-through in the plan's `<done>` asks
 * for exactly that disclosure rather than a claim of completeness.
 *
 * THE SPLIT IS LINE-BASED, WITH A BLOCK TRACKER, and it is canaried in both directions. It is not
 * a JavaScript parser and does not pretend to be:
 *
 *   - a line inside a block comment, or whose trimmed form opens with `*`, `//`, `/*` or `<!--`,
 *     is COMMENT;
 *   - on a code line, a trailing `//` outside quotes is cut and the tail joins the comment layer.
 *
 * A full-string tokeniser was written first and REJECTED on measurement: an apostrophe in template
 * prose (`Phantom Manor's mansard roof` — 8 of the 40 records carry one, 05-08's finding) opens a
 * string the tokeniser never closes, and everything after it silently becomes "inside a string",
 * i.e. invisible. A hiding failure is worse than a noisy one, and the line-based split cannot hide
 * a whole file behind one apostrophe.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT CANNOT SEE. Each was found by trying to walk THROUGH it, not by imagining.
 *
 *  W1. A SPLIT KEY. `photo['da' + 'te']` carries no literal `date`, so no textual rule reaches it.
 *      Closing it needs an AST pass with constant folding. RECORDED, NOT CLOSED — and the same
 *      residual `assert-ds-import-contract.mjs` records for `'@akhil-saxena/design-' + 'system'`.
 *  W2. A DYNAMIC KEY. `photo[k]` where `k` is computed. Same reason, same disposition.
 *  W3. THE COMMENT LAYER, by construction — see above. Printed rather than refused.
 *  W4. A REFERENCE FROM OUTSIDE THE SCAN ROOTS. A component elsewhere that took `date` as a prop
 *      and was rendered by a photo route would not be seen. The roots are the answer to "what
 *      renders a photograph" as of plan 05-12; widening them is a one-line edit below.
 *
 * ---------------------------------------------------------------------------------------------
 * IT REFUSES TO PASS ON NOTHING. Three separate ways a run can check nothing and look green are
 * each a named refusal: a scan root that does not exist, a scan root that matches zero files, and
 * a set of files that are all empty. `! grep` passes on a missing path and that shape has appeared
 * three times in this project.
 *
 * A LITERAL CONTROL CHARACTER MAKES A SOURCE FILE INVISIBLE TO `grep`, which is why this reads
 * files as text and matches in JavaScript. Any C0 control character other than tab, newline or
 * carriage return is a REFUSAL naming the file and the offset, rather than a file quietly skipped.
 *
 * Reporting is `process.stdout.write`, never `console.log`: 04-01 measured with a probe that under
 * this repository's vitest setup both console markers print nothing and the stdout marker prints
 * once, and a gate reporting through a swallowed channel is indistinguishable from one that found
 * nothing.
 *
 * NOT WIRED INTO package.json. Plan 05-14 owns the chaining.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

/**
 * §9.4 names `src/pages/photography*` and `src/components/Photo*`. The third entry is a deliberate
 * widening by plan 05-12 and is recorded rather than slipped in: `src/lib/photo-lightbox.ts` is the
 * module that decides which fields reach the lightbox island, so it is exactly the place a `date`
 * would be added by someone who thought they were only touching a data shape.
 */
const DEFAULT_SCAN_ROOTS = [
  { root: 'src/pages/photography', match: /./ },
  { root: 'src/components/public', match: /^Photo/ },
  { root: 'src/lib/photo-lightbox.ts', match: /./ },
];

const SCAN_EXTENSIONS = ['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/* ---------------------------------------------------------------------------------------------
 * The rules.
 * ------------------------------------------------------------------------------------------- */

const RULES = [
  {
    id: 'DATE-DOT',
    what: 'a `.date` property access',
    // `\b` is load-bearing: without it this matches `dateFormatter` and `dateModified`.
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
    // `[{,]` anchors it to a property position, so a bare local named `date` elsewhere is not
    // matched; the trailing `[,}:]` is what keeps `{ dateFormatter }` out.
    pattern: /[{,]\s*date\s*[,}:]/g,
  },
];

/* ---------------------------------------------------------------------------------------------
 * The code / comment split.
 * ------------------------------------------------------------------------------------------- */

/** True when `index` in `line` sits inside a quoted run. Cheap, and only used to place `//`. */
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

/**
 * Split a file into its code lines and its comment lines. Both layers keep 1-based line numbers,
 * so a finding can name a line whichever layer it came from.
 */
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
        // Anything after `*/` on the closing line is code again.
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

    // A code line that opens a block comment part-way through: keep the head, defer the tail.
    const blockAt = raw.indexOf('/*');
    if (blockAt !== -1 && !insideQuotes(raw, blockAt)) {
      code.push({ lineNumber, text: raw.slice(0, blockAt) });
      comment.push({ lineNumber, text: raw.slice(blockAt) });
      if (!raw.slice(blockAt).includes('*/')) inBlock = true;
      return;
    }

    // A trailing line comment on a code line. `https://` lives inside quotes and is not one.
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

/** Every rule hit in a layer, with the rule that found it and the text of the line. */
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

/* ---------------------------------------------------------------------------------------------
 * 0. The self-test. A rule that cannot fire is not a rule; a rule that fires on anything is not
 *    one either, and the second is how a gate gets disabled.
 * ------------------------------------------------------------------------------------------- */

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

// The comment layer must still SEE what it declines to fail on — otherwise the residual report is
// itself vacuous and nobody would know the gate is blind there.
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

/* ---------------------------------------------------------------------------------------------
 * 1. Resolve the scan roots.
 * ------------------------------------------------------------------------------------------- */

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

/* ---------------------------------------------------------------------------------------------
 * 2. The scan.
 * ------------------------------------------------------------------------------------------- */

const failures = [];
const residuals = [];
let bytesRead = 0;

// Everything C0 except tab (09), newline (0A) and carriage return (0D). A literal control
// character makes a file invisible to grep; here it is a named refusal instead of a silent skip.
/**
 * The first C0 control character in `text` other than tab, newline or carriage return, or `null`.
 *
 * A CODEPOINT SCAN RATHER THAN A REGULAR EXPRESSION, and that is not style. Biome's
 * `lint/suspicious/noControlCharactersInRegex` refuses a character class holding them — correctly,
 * for almost every other file — and it fires on the `\u0000` escapes as readily as on the literal
 * characters. Suppressing the rule in the one gate whose job is to FIND control characters would
 * mean carrying a standing exemption for a hazard; counting codepoints needs no exemption at all,
 * and it can report the code and the offset, which a class match cannot.
 */
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

/* ---------------------------------------------------------------------------------------------
 * 3. Report.
 * ------------------------------------------------------------------------------------------- */

if (failures.length > 0) {
  /*
   * TWO BANNERS, AND THE SPLIT IS A REPAIR. The first revision printed "a photo route references
   * photo.date" over EVERY refusal, so control 3c — a scan root whose only file was empty — was
   * announced as a rendered date. The diagnostic underneath was correct and the headline was a
   * different, false claim, which is the shape of message a reader trusts and then debugs the
   * wrong thing from. Found by running the control, not by reading the code.
   */
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
