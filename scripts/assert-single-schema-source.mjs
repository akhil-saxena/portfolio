#!/usr/bin/env node

/**
 * CONT-01 structural gate — there is exactly ONE definition of every content shape, and it lives
 * in `src/schemas`.
 *
 * Usage: node scripts/assert-single-schema-source.mjs [repoRoot]
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL  (open decision OD-7)
 *
 * Success criterion 1 is not "validation exists". It is that the same module is what the build,
 * the write path and the admin's form errors all consume — "validation cannot drift between
 * them". Three copies that agree today is a failure, not a pass.
 *
 * Phase 3 has TWO of those three consumers: 03-07's build gate, and the migration scripts that
 * wrote `data/*.json`. The third — the admin's form errors — is Phase 7 and cannot be
 * demonstrated now. OD-7 resolved that the criterion is met STRUCTURALLY instead: no second
 * definition of a content shape may exist anywhere under `src/`, proven by planting one. Phase 7
 * then has no way to add a parallel validator without going red.
 *
 * That is a WEAKER CLAIM than a third caller and this file says so rather than letting the phase
 * count three consumers it does not have. Nothing here proves a future writer will IMPORT the
 * schema. It proves only that it cannot successfully write a rival one in the vocabulary below.
 *
 * The alternative considered and rejected was a `validateContent` Astro Action shipped purely so
 * a third importer literally exists. It would have been the only `prerender = false` surface in
 * the repository that nothing calls — a route written to satisfy a checklist.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS GATE CANNOT SEE
 *
 * Written down here, in the gate's own source, because a boundary that lives in a plan file is a
 * boundary nobody can evaluate in two years. Each is a real hole, found by trying to walk through
 * this gate rather than by imagining how it might fail.
 *
 *  1. IT CANNOT SEE ANYTHING OUTSIDE `src/`. `scripts/`, `test/` and a future `functions/` are
 *     not scanned. This is not hypothetical: `test/content/photo-enrichment.unit.test.ts`
 *     declares its own `interface Photo` TODAY and passes this gate. That is deliberate — a test
 *     asserting about a migration has to be free to describe the shape it migrated, and a
 *     migration script has to be able to run on a Node runner with no `src/` import. But it means
 *     a private schema inside a migration script would drift undetected, which is exactly how the
 *     legacy repository's `src/types.ts` drifted from the admin's local copies.
 *
 *  2. IT KNOWS A FIXED VOCABULARY OF NAMES, AND ONLY THAT VOCABULARY. `interface Photo` is
 *     caught; `interface Picture`, `type GalleryItem =` and `type Thing =` are not. A rival that
 *     avoids every name in CONTENT_TYPE_NAMES below is invisible. Widening the list is cheap and
 *     should happen the moment a new content shape is named.
 *
 *  3. IT IS A TEXT SCANNER, NOT A TYPESCRIPT PARSER. Consequences in both directions:
 *       - an anonymous inline object type on a function parameter, `(p: { id: string; category:
 *         string })`, declares a rival shape and is not matched;
 *       - a `satisfies` expression over an object literal is not matched;
 *       - a rival produced by a code generator at build time does not exist on disk to be read;
 *       - conversely, a rival written inside a STRING or a COMMENT is a false positive. That is
 *         accepted: the fix is to not write it, never to add an exclusion list.
 *
 *  4. IT CANNOT SEE SEMANTIC DRIFT THAT GOES THROUGH THE REAL SCHEMA. Rule 4 below catches the
 *     direct textual forms — `PhotoSchema.partial()`, `.passthrough()`, `.catchall()` — but a
 *     loosening reached indirectly (assign the schema to a variable first, or build it in a
 *     helper that returns it) is invisible. `.extend()` and `.omit()` are deliberately NOT
 *     matched at all: they are how 03-07 legitimately derives a content-collection schema, so
 *     banning them would ban the intended use.
 *
 *  5. IT DOES NOT MATCH A BARE EARLY `return` IN RULE 3, only a `throw` or a 4xx `Response`. An
 *     `if (photo.urls.thumb) return …` inside a component is ordinary render control flow, and a
 *     rule that fires on it would be noisy enough to be deleted inside a week — at which point it
 *     protects nothing at all. The narrowing is the price of the rule surviving.
 *
 *  IN ONE SENTENCE, and deliberately in lower case so a case-sensitive search for the phrase
 *  finds it: this gate cannot see a rival that lives outside `src/`, a rival named outside its
 *  fixed vocabulary, a rival its text scanner cannot parse, an indirect loosening of the real
 *  schema, or a bare early `return`. Five holes, enumerated above with the reason each is open.
 *
 * ---------------------------------------------------------------------------------------------
 * THE SELF-TEST, WHICH RUNS ON EVERY INVOCATION
 *
 * Phase 3 has shipped EIGHT gates that could not fail — a grep matching prose, a loop iterating
 * zero groups that still printed "OK 7 categories", a mutual-exclusivity check reading no config.
 * Every one was found by an executor detonating it rather than reading it.
 *
 * So every rule below carries two fixtures: a CANARY it must flag, and an ANTI-CANARY it must
 * leave alone. Both are checked before the real scan on every run, and a rule that fails either
 * one aborts the gate. A silently-broken regex therefore cannot present as a clean tree. The scan
 * also refuses to pass if it visited zero files, or if `src/schemas` is missing or does not export
 * the five named schemas — because deleting the thing under test must never be what makes a gate
 * green.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd(), process.argv[2] ?? '.');

/** The one directory allowed to define a content shape. Excluded from the scan, asserted present. */
const SCHEMA_DIR = 'src/schemas';

/** The scanned root. Everything under it except SCHEMA_DIR. */
const SCAN_ROOT = 'src';

/**
 * Wider than the plan's `.ts/.tsx/.astro`. A rival written in plain JS under `src/` would
 * otherwise be invisible for no reason other than its extension.
 */
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.astro'];

/** The five `src/schemas/index.ts` must expose. Fewer than five is a failure, not a smaller scope. */
const REQUIRED_EXPORTS = [
  'PhotoSchema',
  'ResumeSchema',
  'ProjectsSchema',
  'HomeConfigSchema',
  'SiteConfigSchema',
];

/**
 * Field names that identify an object as being ABOUT this project's content.
 *
 * The threshold is TWO, not one. `z.object({ category: … })` in an unrelated context is entirely
 * possible — a form control, a analytics event — and a gate that fires on it is a gate somebody
 * disables within a week. Requiring two co-occurring content fields is what keeps it credible.
 */
const CONTENT_FIELDS = [
  'category',
  'categoryOrder',
  'focalPoint',
  'peekIds',
  'peekPositions',
  'bullets',
  'leadership',
  'badges',
  'categories',
  'defaultColumns',
  'exif',
  'urls',
];

/** Type/interface names that are content shapes. See blind spot 2: this list is the vocabulary. */
const CONTENT_TYPE_NAMES = [
  'Photo',
  'PhotoExif',
  'PhotoUrls',
  'PhotoManifest',
  'PhotoDimensions',
  'Resume',
  'ResumeEntry',
  'ExperienceEntry',
  'EducationEntry',
  'SkillGroup',
  'Project',
  'Projects',
  'Badge',
  'HomeConfig',
  'SiteConfig',
  'Category',
  'ContentSet',
];

const alternation = (names) => names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

/** `z.object(`, `z.strictObject(`, `z.looseObject(` — all three build a shape. */
const ZOD_OBJECT = /\bz\s*\.\s*(?:strictObject|looseObject|object)\s*\(/;

/** A content field used as an object KEY: `category:` at a plausible key position. */
const contentFieldKey = new RegExp(`(?:^|[\\s{,(])(${alternation(CONTENT_FIELDS)})\\s*:`, 'gm');

/** `interface Photo {`, `type Project = `, `export interface HomeConfig extends …`. */
const rivalTypeDeclaration = new RegExp(
  `\\b(?:export\\s+)?(?:declare\\s+)?(interface|type)\\s+(${alternation(CONTENT_TYPE_NAMES)})\\b\\s*(?:<[^>\\n]*>)?\\s*(?:=|\\{|extends)`,
  'g'
);

/** A guard whose condition reaches into a content field. Paired with a throw / 4xx below. */
const contentGuard = new RegExp(
  `if\\s*\\([^)\\n]*\\b(?:${alternation(CONTENT_FIELDS)})\\b[^)\\n]*\\)`
);

/** Loosening a schema after importing it. See blind spot 4 for what is deliberately not here. */
const schemaLoosening =
  /\b\w*Schema\s*\.\s*(partial|deepPartial|passthrough|catchall|nonstrict)\s*\(/g;

/* --------------------------------------------------------------------------------------------
 * The rules. Each carries a canary it MUST flag and an anti-canary it MUST leave alone.
 * -------------------------------------------------------------------------------------------- */

const RULES = [
  {
    id: 'RIVAL-ZOD-OBJECT',
    what: "a second zod object describing this project's content",
    why:
      'a parallel validator is the drift criterion 1 forbids. Import the schema from src/schemas ' +
      'instead; if the shape you need is genuinely different, it belongs in src/schemas too.',
    find(text) {
      if (!ZOD_OBJECT.test(text)) return [];
      const fields = new Set();
      for (const match of text.matchAll(contentFieldKey)) fields.add(match[1]);
      if (fields.size < 2) return [];
      const line = lineOf(text, text.search(ZOD_OBJECT));
      return [{ line, detail: `zod object over content fields: ${[...fields].sort().join(', ')}` }];
    },
    canary:
      "import { z } from 'astro/zod';\nexport const S = z.object({ category: z.string(), urls: z.object({}) });\n",
    antiCanary:
      "import { z } from 'astro/zod';\nexport const S = z.object({ category: z.string() });\n",
  },
  {
    id: 'RIVAL-TYPE',
    what: 'a second type declaration for a content shape',
    why:
      'the legacy repository\'s src/types.ts header documented this exact failure — "the /admin ' +
      'editor still defines its own local copies that have drifted from these". Import the type ' +
      'from src/schemas, where it is inferred from the schema and cannot disagree with it.',
    find(text) {
      const out = [];
      for (const match of text.matchAll(rivalTypeDeclaration)) {
        out.push({
          line: lineOf(text, match.index),
          detail: `${match[1]} ${match[2]} declared outside ${SCHEMA_DIR}`,
        });
      }
      return out;
    },
    canary: 'export interface Photo { id: string; category: string }\n',
    antiCanary: "import type { Photo } from '@/schemas';\nconst p: Photo | null = null;\n",
  },
  {
    id: 'HAND-ROLLED-VALIDATOR',
    what: 'content shape checked by hand instead of by the schema',
    why:
      'a guard written beside the code that uses the data is a rule the schema does not know ' +
      'about, and it is the rule that gets forgotten at the second call site.',
    find(text) {
      const lines = text.split('\n');
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        if (!contentGuard.test(lines[i])) continue;
        const window = lines.slice(i, i + 3).join('\n');
        // Narrowed on purpose — a bare early `return` is ordinary render control flow.
        // See blind spot 5.
        if (!/\bthrow\b/.test(window) && !/new Response\([^)]*\b4\d\d\b/.test(window)) continue;
        out.push({
          line: i + 1,
          detail: `guard on a content field followed by a throw / 4xx: ${lines[i].trim()}`,
        });
      }
      return out;
    },
    canary: 'function f(p) {\n  if (!p.category) {\n    throw new Error("no category");\n  }\n}\n',
    antiCanary: 'function f(p) {\n  if (!p.category) {\n    return null;\n  }\n}\n',
  },
  {
    id: 'SCHEMA-LOOSENED',
    what: 'the real schema imported and then weakened',
    why:
      'a .partial() or .passthrough() downstream re-admits exactly what the schema refused, so ' +
      'the single definition stops being the single ENFORCEMENT. Narrow at the definition site.',
    find(text) {
      const out = [];
      for (const match of text.matchAll(schemaLoosening)) {
        out.push({
          line: lineOf(text, match.index),
          detail: `${match[0].trim()} weakens the schema`,
        });
      }
      return out;
    },
    canary:
      "import { PhotoSchema } from '@/schemas';\nexport const Loose = PhotoSchema.partial();\n",
    antiCanary: "import { PhotoSchema } from '@/schemas';\nexport const P = PhotoSchema;\n",
  },
];

function lineOf(text, index) {
  if (index === undefined || index < 0) return 1;
  return text.slice(0, index).split('\n').length;
}

/* --------------------------------------------------------------------------------------------
 * 0. SELF-TEST. Runs before the scan, on every invocation. A rule that cannot fire is not a rule.
 * -------------------------------------------------------------------------------------------- */

const selfTestFailures = [];
for (const rule of RULES) {
  // Regexes with the `g` flag carry lastIndex; reset defensively before every use below too.
  const fired = rule.find(rule.canary);
  if (fired.length === 0) {
    selfTestFailures.push(
      `${rule.id}: did NOT flag its own canary. The rule is broken and every clean run it has ` +
        `ever reported is worthless.`
    );
  }
  const quiet = rule.find(rule.antiCanary);
  if (quiet.length > 0) {
    selfTestFailures.push(
      `${rule.id}: flagged its own anti-canary (${quiet[0].detail}). The rule is too broad and ` +
        `would be disabled rather than obeyed.`
    );
  }
}

if (selfTestFailures.length > 0) {
  console.error('assert-single-schema-source: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const failure of selfTestFailures) console.error(`  ✖ ${failure}`);
  process.exit(1);
}

/* --------------------------------------------------------------------------------------------
 * 1. The positive half. The module under test must exist and must export the five schemas.
 * -------------------------------------------------------------------------------------------- */

const failures = [];
const schemaDirAbsolute = path.join(repoRoot, SCHEMA_DIR);

if (!fs.existsSync(schemaDirAbsolute) || !fs.statSync(schemaDirAbsolute).isDirectory()) {
  failures.push({
    where: SCHEMA_DIR,
    detail: 'missing',
    why:
      'the single definition this gate exists to protect is not there. Finding no rivals in a ' +
      'repository that has no schema at all is not a pass; it is the absence of both.',
  });
} else {
  const indexPath = path.join(schemaDirAbsolute, 'index.ts');
  if (!fs.existsSync(indexPath)) {
    failures.push({
      where: `${SCHEMA_DIR}/index.ts`,
      detail: 'missing',
      why: 'the single import surface is what makes "import from one place" enforceable.',
    });
  } else {
    const indexText = fs.readFileSync(indexPath, 'utf8');
    const exported = new Set();
    for (const block of indexText.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const raw of block[1].split(',')) {
        const name = raw
          .replace(/\btype\b/, '')
          .split(/\bas\b/)[0]
          .trim();
        if (name) exported.add(name);
      }
    }
    for (const match of indexText.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)) {
      exported.add(match[1]);
    }
    const missing = REQUIRED_EXPORTS.filter((name) => !exported.has(name));
    if (missing.length > 0) {
      failures.push({
        where: `${SCHEMA_DIR}/index.ts`,
        detail: `does not export ${missing.join(', ')}`,
        why:
          'a shrinking export surface is how a shape quietly moves back out of the one module. ' +
          `All ${REQUIRED_EXPORTS.length} are required: ${REQUIRED_EXPORTS.join(', ')}.`,
      });
    }
  }
}

/* --------------------------------------------------------------------------------------------
 * 2. The scan. Every scannable file under src/ except src/schemas/.
 * -------------------------------------------------------------------------------------------- */

const scanRootAbsolute = path.join(repoRoot, SCAN_ROOT);
const scanned = [];

if (!fs.existsSync(scanRootAbsolute)) {
  failures.push({
    where: SCAN_ROOT,
    detail: 'missing',
    why: 'there is nothing to scan, so a PASS would be a statement about an empty set.',
  });
} else {
  const walk = (dir) => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(repoRoot, absolute).split(path.sep).join('/');
      if (relative === SCHEMA_DIR) continue;
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SCAN_EXTENSIONS.includes(path.extname(entry.name))) continue;
      scanned.push({ relative, absolute });
    }
  };
  walk(scanRootAbsolute);
}

// GUARD AGAINST NOTHING: a scan that visited no files must never read as a clean tree.
if (scanned.length === 0 && !failures.some((f) => f.where === SCAN_ROOT)) {
  failures.push({
    where: SCAN_ROOT,
    detail: 'zero files scanned',
    why:
      `no file under ${SCAN_ROOT}/ matched ${SCAN_EXTENSIONS.join(' ')}. Either the tree moved or ` +
      'the extension list is wrong; either way this run checked nothing and cannot pass.',
  });
}

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
  for (const rule of RULES) {
    for (const hit of rule.find(text)) {
      findings++;
      failures.push({
        where: `${file.relative}:${hit.line}`,
        detail: `[${rule.id}] ${hit.detail}`,
        why: rule.why,
      });
    }
  }
}

/* --------------------------------------------------------------------------------------------
 * 3. Report. One named failure per line, or a pass that says how much it looked at.
 * -------------------------------------------------------------------------------------------- */

if (failures.length > 0) {
  console.error('');
  console.error('══════════════════════════════════════════════════════════════════════════════');
  console.error('  BUILD REFUSED — CONT-01: a content shape is defined more than once');
  console.error('══════════════════════════════════════════════════════════════════════════════');
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
  console.error(
    '    Criterion 1 is not "validation exists" — it is that the build, the write path'
  );
  console.error("    and the admin's form errors consume the SAME module, so validation cannot");
  console.error('    drift between them. Three copies that agree today is a failure, not a pass.');
  console.error(`    The one definition is ${SCHEMA_DIR}. Import from there.`);
  console.error('');
  console.error(`  ${failures.length} finding(s) (${findings} rival definition(s)).`);
  console.error('  Requirement CONT-01; decision OD-7; threat T-03-06-04.');
  console.error('');
  process.exit(1);
}

console.log('assert-single-schema-source: PASS');
console.log(`  repo: ${repoRoot}`);
console.log(
  `  scanned ${scanned.length} files under ${SCAN_ROOT}/ (excluding ${SCHEMA_DIR}/), ` +
    `${RULES.length} rules applied`
);
console.log(
  `  self-test: ${RULES.length}/${RULES.length} rules flagged their canary and ignored their anti-canary`
);
console.log(`  ${SCHEMA_DIR}/index.ts exports all ${REQUIRED_EXPORTS.length} required schemas`);
console.log(`  rules: ${RULES.map((r) => r.id).join(', ')}`);
