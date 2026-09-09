#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd(), process.argv[2] ?? '.');

const SCHEMA_DIR = 'src/schemas';

const SCAN_ROOT = 'src';

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.astro'];

const REQUIRED_EXPORTS = [
  'PhotoSchema',
  'ResumeSchema',
  'ProjectsSchema',
  'HomeConfigSchema',
  'SiteConfigSchema',
];

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

const ZOD_OBJECT = /\bz\s*\.\s*(?:strictObject|looseObject|object)\s*\(/;

const contentFieldKey = new RegExp(`(?:^|[\\s{,(])(${alternation(CONTENT_FIELDS)})\\s*:`, 'gm');

const rivalTypeDeclaration = new RegExp(
  `\\b(?:export\\s+)?(?:declare\\s+)?(interface|type)\\s+(${alternation(CONTENT_TYPE_NAMES)})\\b\\s*(?:<[^>\\n]*>)?\\s*(?:=|\\{|extends)`,
  'g'
);

const contentGuard = new RegExp(
  `if\\s*\\([^)\\n]*\\b(?:${alternation(CONTENT_FIELDS)})\\b[^)\\n]*\\)`
);

const schemaLoosening =
  /\b\w*Schema\s*\.\s*(partial|deepPartial|passthrough|catchall|nonstrict)\s*\(/g;

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

const selfTestFailures = [];
for (const rule of RULES) {
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
