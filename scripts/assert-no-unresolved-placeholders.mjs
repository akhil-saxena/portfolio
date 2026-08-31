#!/usr/bin/env node

/**
 * OQ-1b build refusal — no unresolved `{{…}}` placeholder survives into rendered HTML.
 *
 * Usage: node scripts/assert-no-unresolved-placeholders.mjs [scanRoot]   (scanRoot defaults to dist)
 *
 * ---------------------------------------------------------------------------------------------
 * IT READS THE ARTEFACT, NOT THE SOURCE, AND THAT IS THE WHOLE POINT
 *
 * "A placeholder survived into a rendered public route" is a FACT about `dist/`. Asked of `src/`
 * or of `data/`, the same question is an INFERENCE — it requires knowing which strings reach a
 * page, through which component, under which condition, and being right about all three. A stored
 * token is additionally a legitimate intermediate state: it is exactly what plan 05-03's `defer`
 * option would have committed on purpose. A rendered one never is. So the gate is pointed at the
 * only place where the distinction is observable, and no token SPELLING can outrun it, because it
 * does not know any token names.
 *
 * This project has paid for the alternative twice. Phase 3 stored `{{ds.componentCount}}` and made
 * the schema refuse the literal figure so a stale number could not come back. Phase 4 measured that
 * `alt: "TODO"` passes all four content rules — which is why Akhil then asked for a placeholder
 * refusal on `alt` at all. An unguarded placeholder ships, and the employment band is the first
 * thing a hiring manager reads on `/development`.
 *
 * ---------------------------------------------------------------------------------------------
 * IT ENUMERATES NOTHING
 *
 * Any `{{…}}` in shipped HTML is a failure. There is no list of known token names, because a
 * deny-list of names is a list of the names its author thought of: `{{metric.value}}` and
 * `{{ds.componentCount}}` are guarded, and `{{metric.lable}}` — the typo — is not. This repository
 * has a measured precedent for exactly that failure mode; the git-argv deny-list in Phase 4 was
 * defeated three separate ways with the guard silent.
 *
 * The premise that makes a blanket rule safe: THIS SITE EMITS NO TEMPLATE SYNTAX TO THE BROWSER.
 * Astro resolves its expressions at build time and there is no Handlebars, Mustache, Vue or Angular
 * anywhere in the dependency tree. A double brace in `dist/**.html` is therefore always either an
 * unresolved placeholder or a new templating dependency that needs a deliberate decision. Measured
 * on the real build at the time of writing: 2 HTML files, 0 occurrences.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS GATE CANNOT SEE — measured by trying to walk through it, not by imagining failures
 *
 *  1. A TOKEN SPLIT BETWEEN ITS TWO BRACES. `{` + newline + `{metric.value}}` in the HTML source
 *     is invisible: no `{{` exists in the byte stream. OPEN, deliberately. The whitespace-tolerant
 *     rule that would close it (`/\{\s*\{/`) is a false-positive risk against inline `<style>` and
 *     minified inline `<script>`, and a gate that fires on correct output gets switched off rather
 *     than obeyed — which costs more than this hole does. It is also not reachable by the
 *     mechanism this gate exists for: a stored token arrives as ONE string and Astro emits it
 *     contiguously, so producing this shape takes deliberate effort rather than an oversight.
 *     Re-open the decision if a page ever hand-writes braces across a line break.
 *
 *  2. DOUBLE-ESCAPED ENTITIES. `&amp;#123;&amp;#123;` renders to the visible TEXT "&#123;&#123;",
 *     not to "{{", so it is not this gate's failure. Recorded because it looks like a hole and is
 *     not one.
 *
 *  3. TEXT ASSEMBLED IN THE BROWSER. A token concatenated by client-side JavaScript after load is
 *     not in the artefact. Nothing on the public routes does this today; a DOM-level assertion
 *     (05-15's Playwright audit) is the tool for that claim, not a file scan.
 *
 *  4. NON-HTML ARTEFACTS. `.html` only. A token inside a shipped `.json`, `.txt` or `.xml`
 *     (05-13 adds a sitemap) is not seen. Widen the extension list when one of those starts
 *     carrying content copy.
 *
 * WHAT IT DOES SEE, contrary to reasonable expectation, because it matches TEXT and not a parsed
 * DOM: a token inside an HTML comment. That is intentional and correct — a commented-out token is
 * one uncomment away from shipping, and the comment is served to the browser regardless.
 *
 * ---------------------------------------------------------------------------------------------
 * ON THE `(?!\{)` IN THE RAW RULE, WHICH DOES NOT MEAN WHAT IT LOOKS LIKE
 *
 * The rule is "`{{` followed by anything other than `{`". Read quickly, that says a triple brace is
 * forgiven. It is not: in `{{{raw}}}` the match at offset 0 is skipped by the lookahead, and then
 * the scan advances one character and matches offsets 1-2, whose next character is `r`. The
 * OVERLAPPING occurrence catches it. This is asserted in the self-test below rather than left to
 * whoever reads the regex next, because an exemption that does not actually exempt is worth more
 * as a pinned behaviour than as a comment.
 *
 * ---------------------------------------------------------------------------------------------
 * THE SELF-TEST, WHICH RUNS ON EVERY INVOCATION
 *
 * Every rule carries a canary it must flag and an anti-canary it must leave alone, both checked
 * before the real scan. A rule that does not match its own canary forgives everything, and this
 * repository has now shipped eleven gates that could not fail. The scan additionally refuses to
 * pass if the root is missing, is not a directory, matched no HTML, or if every file it read was
 * empty — `! grep` passes on a missing file, and that exact shape has appeared here three times.
 *
 * Output goes through `process.stdout.write`. `console.log` is swallowed by this repository's
 * vitest setup, which makes a gate that found something indistinguishable from one that found
 * nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_SCAN_ROOT = 'dist';
const SCAN_EXTENSIONS = ['.html'];

const out = (line) => process.stdout.write(`${line}\n`);

/**
 * The HTML spellings of `{` and `}` that a browser renders as the brace itself. Numeric decimal,
 * numeric hex (with or without leading zeros, either case) and the two HTML5 named references.
 * Decoding these is what closes the entity walk-through — see rule PH-ENTITY.
 */
const BRACE_ENTITIES = [
  { re: /&#0*123;|&#[xX]0*7[bB];|&lbrace;|&lcub;/g, char: '{' },
  { re: /&#0*125;|&#[xX]0*7[dD];|&rbrace;|&rcub;/g, char: '}' },
];

/**
 * Replace entity-encoded braces with the character the browser will paint.
 *
 * Applied PER LINE by the scanner, so line numbers stay exact — no brace entity contains a
 * newline, so decoding can never move one. Column offsets do shift within a line, which is why an
 * entity finding reports its DECODED context and says so.
 */
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
    // The token verbatim, when it terminates: `{{` through the next `}}` within a sane window.
    // 200 characters, so an unterminated brace pair in a large minified line reports the brace
    // pair rather than the rest of the file.
    const window = text.slice(match.index, match.index + 200);
    const closed = /^\{\{[^}]*\}\}/.exec(window);
    hits.push({ index: match.index, token: closed ? closed[0] : '{{' });
  }
  return hits;
}

/** 1-based line number of a byte offset, and the ~60 characters of text around it. */
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
        // Pinned, not assumed. See the header note on the lookahead.
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
        // The escaped form renders as visible text "&#123;", not as a brace. Not this gate's job,
        // and firing on it would be a false positive on correct escaping.
        name: 'a double-escaped entity',
        text: '<p>&amp;#123;&amp;#123;metric.value&amp;#125;&amp;#125;</p>',
        expect: false,
      },
    ],
  },
  {
    id: 'PH-ENTITY',
    what: 'an entity-encoded placeholder that a browser paints as {{…}}',
    // Runs on the DECODED line, and only where PH-RAW did not already fire — see the scan loop.
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

/* --------------------------------------------------------------------------------------------
 * 0. SELF-TEST. Before the scan, on every invocation. A rule that cannot fire is not a rule.
 * -------------------------------------------------------------------------------------------- */

/**
 * The gate proper, behind a function because `test/content/experience-metric.unit.test.ts` imports
 * `findPlaceholders` from this file to test the REAL detector rather than a restated copy of it.
 * At module scope this body would run — and `process.exit(1)` — inside the vitest worker, taking
 * the suite down on import. Same guard, and the same reason, as the migration scripts' `main()`.
 */
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

  /* --------------------------------------------------------------------------------------------
   * 1. Resolve the scan root. An absent argument and an empty one are different mistakes.
   * -------------------------------------------------------------------------------------------- */

  const scanRootArg = process.argv[2];

  // `path.resolve(cwd, '')` is cwd, so an empty argument would silently scan the entire repository
  // while looking like a deliberate narrow scan. Measured on assert-no-raw-html-sinks.mjs, where a
  // harness passing an unset positional got real findings from a directory nobody had asked about.
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

  /* --------------------------------------------------------------------------------------------
   * 2. The scan.
   * -------------------------------------------------------------------------------------------- */

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

  // REFUSE TO PASS ON NOTHING.
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
      // Only where the raw rule did not already fire, so one token is not reported twice.
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

  /* --------------------------------------------------------------------------------------------
   * 3. Report. Never warn-and-exit-0.
   * -------------------------------------------------------------------------------------------- */

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

// Only when run as a script. See `main()`.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
