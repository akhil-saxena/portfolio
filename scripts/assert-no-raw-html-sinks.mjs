#!/usr/bin/env node

/**
 * CONT-03 structural gate — no raw-HTML sink exists anywhere under `src/`, in the React spelling,
 * the Astro one, or the plain-DOM one.
 *
 * Usage: node scripts/assert-no-raw-html-sinks.mjs [scanRoot]     (scanRoot defaults to ./src)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL
 *
 * The legacy stored-XSS class in this repository was ENTIRELY a rendering defect. `Timeline.tsx:48`
 * plus three admin components passed résumé bullet strings to `dangerouslySetInnerHTML`, and there
 * was no sanitiser anywhere in the repository. ADR-001's answer was not to add one: 03-02 made the
 * stored shape unable to express a tag and 03-06 made the schema reject one.
 *
 * But a correct store with a careless renderer reproduces the hole exactly. `src/components/
 * Bullets.tsx` is the safe renderer; this gate is what makes the unsafe alternative FAIL rather
 * than merely being un-chosen. Those are different claims, and only the second one survives a
 * future author who has not read ADR-001.
 *
 * `set:html` is here even though this plan writes no `.astro` component. It is Astro's spelling of
 * the same mistake, Phase 5 writes the first pages, and a gate added after those pages exist is a
 * gate added after the mistake became available to make. The `.astro` control is run INDEPENDENTLY
 * of the `.tsx` one in the plan's verification for exactly this reason: a scanner that only reads
 * `.ts`/`.tsx` passes the React control while being blind to every page Phase 5 will write, and a
 * combined control hides precisely that.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS GATE CANNOT SEE
 *
 * Written here, in the gate's own source, because a boundary that lives in a plan file is a
 * boundary nobody can evaluate in two years. Each was found by trying to WALK THROUGH this gate —
 * looking for an input that satisfies it while violating its intent — not by imagining failures.
 *
 *  1. IT READS TEXT, NOT SYNTAX. A sink assembled dynamically is invisible:
 *     `el["inner" + "HTML"] = x`, `const K = "dangerously" + "SetInnerHTML"; props[K] = …`,
 *     `Reflect.set(el, ATTR, html)`. This is a real, demonstrated hole — the plan's renderer
 *     hygiene control was walked through with exactly the second form. Closing it needs an AST
 *     pass or a CSP, neither of which is in Phase 3's scope; it is recorded rather than hidden.
 *
 *  2. IT SCANS ONE ROOT, AND THAT ROOT IS `src/` BY DEFAULT. `public/` ships JavaScript straight
 *     to the browser and is NOT scanned. It contains no `.js` today (a PDF, an SVG and three
 *     PNGs), so widening now would assert about an empty set; the moment `public/` gains a script,
 *     this list must grow. `scripts/` and `test/` are also unscanned, deliberately — this file
 *     names all three sinks in prose and would flag itself.
 *
 *  3. ITS EXTENSION LIST IS FINITE. A sink inside a `.svelte`, `.vue`, `.html` or `.md` file under
 *     `src/` is invisible. None exists; the list is one line and should grow with the stack.
 *
 *  4. IT CANNOT TELL A MENTION FROM A USE — so it does not try to. It matches inside comments and
 *     strings ON PURPOSE: a scanner that skips comments is defeated the day a commented-out line
 *     is uncommented. The two genuine documentation mentions in this repository are ALLOWLISTED
 *     BY NAME below, each with its reason on the same entry, and an allowlisted occurrence is
 *     still refused if it appears in USE form (`dangerouslySetInnerHTML=` / `:`). The allowlist can
 *     therefore never forgive an actual sink — only prose about one.
 *
 *  5. IT SAYS NOTHING ABOUT WHETHER THE SAFE RENDERER IS USED. Nothing renders a bullet until
 *     Phase 5. This gate proves the unsafe path fails; it does not prove the safe path is taken.
 *
 * ---------------------------------------------------------------------------------------------
 * THE SELF-TEST, WHICH RUNS ON EVERY INVOCATION
 *
 * Phase 3 has now shipped NINE gates that could not fail — a grep matching prose, a loop iterating
 * zero groups that still printed "OK 7 categories", four predicates in 03-06 that matched
 * double-quoted specifiers in a repository whose formatter enforces single quotes. Every one was
 * found by an executor detonating the gate rather than reading it.
 *
 * So every rule below carries a CANARY it must flag and an ANTI-CANARY it must leave alone, and
 * both are checked before the real scan on every run. A rule that fails either aborts the gate, so
 * a silently-broken regex cannot present as a clean tree. The scan additionally refuses to pass if
 * it visited zero files, if the scan root is absent, if every file it read was empty, or if an
 * allowlist entry no longer matches anything — a stale exemption is an exemption nobody is
 * reviewing.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Scan root. Defaults to `src/`; overridable so the "empty root" control can be run. */
const DEFAULT_SCAN_ROOT = 'src';
const scanRootArg = process.argv[2];
const usingDefaultRoot = scanRootArg === undefined;

// An argument that is PRESENT but empty is not the same as no argument: `path.resolve(cwd, '')`
// silently returns cwd, so `node assert-no-raw-html-sinks.mjs ""` would scan the whole repository
// — including vendored material nobody ships — while looking like a deliberate narrow scan. Found
// by a probe harness that passed `"${4:-}"` for an unset positional; the gate reported real hits
// in design_handoff_portfolio/ for a caller that had asked about src/. A caller that got its own
// argument wrong must be told, not quietly given a different scan.
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

/** Report paths relative to cwd when that is shorter and readable, absolute when it is not. */
const display = (absolute) => {
  const relative = path.relative(process.cwd(), absolute);
  return relative === '' || relative.startsWith('..') ? absolute : relative;
};

/**
 * Wider than the plan's `.ts/.tsx/.astro/.js/.mjs`. A sink written in `.cjs` or `.jsx` under
 * `src/` would otherwise be invisible for no reason other than its extension. See blind spot 3.
 */
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.astro'];

/**
 * The rules. `find` returns one entry per OCCURRENCE, never per line: `grep -c` counts lines, so
 * three sinks on one line report 1, and "1 finding" beside a three-sink line is how a partial fix
 * looks like a complete one.
 */
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
    // `=` but not `==`/`===`, so a comparison or a read is left alone. `+=` is included.
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

/**
 * THE ALLOWLIST. Every entry carries its reason on the entry itself, per the plan: a blanket
 * comment-skipping rule is what this replaces, because it would also skip a commented-out sink
 * waiting to be uncommented.
 *
 * `context` is matched against the OFFENDING LINE, not against a line number — line numbers drift
 * the moment anything above them is edited, and an allowlist that silently stops applying is
 * worse than no allowlist. An allowlisted occurrence is STILL refused if it is in use form (see
 * `usePattern` above), so nothing here can forgive an actual sink.
 */
const ALLOWLIST = [
  {
    rule: 'REACT-RAW-HTML',
    file: 'src/lib/bullets.ts',
    context: 'The legacy app rendered these strings through',
    reason:
      "prose in the grammar module's header, recording the legacy defect this whole shape exists to close. Deleting the sentence to satisfy a grep would delete the reason the shape is the shape.",
  },
  {
    rule: 'REACT-RAW-HTML',
    file: 'src/schemas/resume.ts',
    context: 'the legacy app rendered these strings through',
    reason:
      "the zod refinement's own error message, which tells whoever trips it WHY bold-only markdown is the stored shape. An error message that explains itself is worth more than a clean grep.",
  },
];

/* --------------------------------------------------------------------------------------------
 * 0. SELF-TEST. Runs before the scan, on every invocation. A rule that cannot fire is not a rule.
 * -------------------------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------------------------
 * 1. The scan.
 * -------------------------------------------------------------------------------------------- */

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

// GUARD AGAINST NOTHING. Three separate ways a run can check nothing and still look clean.
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
      // An exemption never forgives a USE, only prose about one.
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

// A stale exemption is an exemption nobody is reviewing. Only enforced on the default root,
// because scanning a subdirectory legitimately will not contain every allowlisted file.
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

/* --------------------------------------------------------------------------------------------
 * 2. Report. One named failure per line; never warn-and-exit-0.
 * -------------------------------------------------------------------------------------------- */

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
