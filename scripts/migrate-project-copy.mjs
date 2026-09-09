#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECTS_PATH = fileURLToPath(new URL('../data/projects.json', import.meta.url));
export const COPY_SOURCE_PATH = fileURLToPath(
  new URL('../.planning/phases/00-design-ideation/00-COPY/one-liners.md', import.meta.url)
);

export const COPY_SOURCE_LABEL = '.planning/phases/00-design-ideation/00-COPY/one-liners.md';

export const COPY_LINES = /** @type {const} */ ({
  'one-liner': 'oneLiner',
  card: 'description',
  badge: 'status',
});

export const BADGE_TO_STATUS = /** @type {const} */ ({
  Live: 'live',
  Maintained: 'maintained',
  Archived: 'archived',
});

export const TOKEN_RULES = [
  {
    name: 'ds.componentCount',
    pattern: /\b\d+ components\b/g,
    replacement: '{{ds.componentCount}} components',
  },
  {
    name: 'ds.categoryCount',
    pattern: /\bin \d+ categories\b/g,
    replacement: 'in {{ds.categoryCount}} categories',
  },
];

const LITERAL_COMPONENT_FIGURE = /\b\d+[- ]component/i;

export const PROJECT_KEY_ORDER = [
  'id',
  'title',
  'label',
  'status',
  'oneLiner',
  'description',
  'tech',
  'icon',
  'href',
  'badges',
];

export const MIGRATED_KEYS = ['status', 'oneLiner', 'description'];

class MigrationError extends Error {}

function fail(message) {
  throw new MigrationError(message);
}

/**
 * Parse `00-COPY/one-liners.md` into `{ [id]: { 'one-liner', card, badge } }`.
 *
 * Exported so the test can call THIS function rather than restate the regexes. A second definition
 * of the extraction would agree with itself — it would prove that the test's parser and the
 * script's parser produce the same answer only when they are the same parser.
 *
 * @param markdown the full file contents
 * @param sourceLabel what to name in an error
 */
export function parseCopySource(markdown, sourceLabel = COPY_SOURCE_LABEL) {
  if (typeof markdown !== 'string' || markdown.trim() === '') {
    fail(`${sourceLabel} is empty or is not a string — there is no copy to migrate.`);
  }

  const lines = markdown.split('\n');
  /** @type {Record<string, Record<string, string>>} */
  const sections = {};
  /** @type {string | null} */
  let current = null;

  for (const line of lines) {
    const heading = /^##[ \t]+(\S+)[ \t]*$/.exec(line);
    if (heading) {
      current = heading[1];
      if (sections[current]) fail(`${sourceLabel} declares the section "## ${current}" twice.`);
      sections[current] = {};
      continue;
    }
    if (!current) continue;

    for (const key of Object.keys(COPY_LINES)) {
      const match = new RegExp(`^-[ \\t]+${key}:[ \\t]*(.+?)[ \\t]*$`).exec(line);
      if (!match) continue;
      if (sections[current][key] !== undefined) {
        fail(`${sourceLabel} section "## ${current}" carries two "- ${key}:" lines.`);
      }
      sections[current][key] = match[1];
    }
  }

  const ids = Object.keys(sections);
  if (ids.length === 0) {
    fail(
      `${sourceLabel} yielded ZERO "## <id>" sections. Nothing would be migrated and every ` +
        'assertion downstream would iterate an empty set, which is a pass that proves nothing.'
    );
  }

  for (const id of ids) {
    for (const key of Object.keys(COPY_LINES)) {
      if (sections[id][key] === undefined) {
        fail(
          `${sourceLabel} section "## ${id}" has no "- ${key}:" line, so ` +
            `\`${COPY_LINES[key]}\` would be absent on that record — a schema-REQUIRED field ` +
            'missing, which reads as a schema bug rather than as a skipped migration.'
        );
      }
    }
  }

  return sections;
}

/**
 * Apply the two token rules and report every site substituted.
 *
 * @param text the verbatim source line
 * @returns {{ text: string, sites: Array<{ rule: string, from: string, to: string }> }}
 */
export function applyTokenRules(text) {
  let out = text;
  const sites = [];
  for (const rule of TOKEN_RULES) {
    for (const match of out.matchAll(rule.pattern)) {
      sites.push({ rule: rule.name, from: match[0], to: rule.replacement });
    }
    out = out.replace(rule.pattern, rule.replacement);
  }
  return { text: out, sites };
}

export function serialise(records) {
  return `${JSON.stringify(records, null, 2)}\n`;
}

/**
 * The transform. Pure: same records + same source ⇒ same output, which is what makes the
 * idempotence measurement below meaningful rather than circular.
 *
 * @param records the parsed `data/projects.json`
 * @param sections the parsed copy source
 */
export function migrateRecords(records, sections) {
  if (!Array.isArray(records) || records.length === 0) {
    fail('data/projects.json is not a non-empty array — there are no records to migrate.');
  }

  const sectionIds = Object.keys(sections);
  if (sectionIds.length < records.length) {
    fail(
      `${COPY_SOURCE_LABEL} yields ${sectionIds.length} section(s) but data/projects.json has ` +
        `${records.length} record(s): ${records.map((r) => r.id).join(', ')}. A record with no ` +
        'section would keep its pre-Phase-0 copy and lose two required fields.'
    );
  }

  /** @type {Array<{ id: string, field: string, rule: string, from: string, to: string }>} */
  const substitutions = [];

  const migrated = records.map((record) => {
    const id = record?.id;
    if (typeof id !== 'string' || id === '') fail('a record in data/projects.json has no `id`.');

    const section = sections[id];
    if (!section) {
      fail(
        `${COPY_SOURCE_LABEL} has no "## ${id}" section, so there is no reviewed copy for that ` +
          `record. Present sections: ${sectionIds.join(', ')}.`
      );
    }

    const unknown = Object.keys(record).filter((key) => !PROJECT_KEY_ORDER.includes(key));
    if (unknown.length > 0) {
      fail(
        `record "${id}" carries key(s) this migration has never heard of: ${unknown.join(', ')}. ` +
          'Refusing rather than dropping them — add them to PROJECT_KEY_ORDER deliberately.'
      );
    }

    const status = BADGE_TO_STATUS[section.badge];
    if (!status) {
      fail(
        `record "${id}": badge "${section.badge}" is outside D-45's vocabulary ` +
          `(${Object.keys(BADGE_TO_STATUS).join(', ')}). \`status\` is a three-value enum and ` +
          'StatusPill has nothing to render for a fourth.'
      );
    }

    /** @type {Record<string, unknown>} */
    const next = { ...record, status };

    for (const [line, field] of Object.entries(COPY_LINES)) {
      if (field === 'status') continue;
      const { text, sites } = applyTokenRules(section[line]);
      if (LITERAL_COMPONENT_FIGURE.test(text)) {
        fail(
          `record "${id}", field \`${field}\`: still carries a literal component figure after ` +
            `substitution — ${JSON.stringify(text)}. ProjectSchema (OD-6) refuses this, so the ` +
            'build would fail; hear it here instead. Check the TOKEN_RULES against the wording ' +
            `in ${COPY_SOURCE_LABEL}.`
        );
      }
      for (const site of sites) substitutions.push({ id, field, ...site });
      next[field] = text;
    }

    // Rebuild in a fixed key order so the diff is the copy change and nothing else. Keys absent
    // from the record (none today) are skipped rather than written as `undefined`.
    /** @type {Record<string, unknown>} */
    const ordered = {};
    for (const key of PROJECT_KEY_ORDER) {
      if (key in next) ordered[key] = next[key];
    }
    return ordered;
  });

  // The script's own pre-flight losslessness check. The independent proof, against the
  // pre-migration git revision, is in test/content/project-copy.unit.test.ts; this is not a
  // substitute for it.
  records.forEach((before, index) => {
    const after = migrated[index];
    for (const key of Object.keys(before)) {
      if (MIGRATED_KEYS.includes(key)) continue;
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        fail(
          `record "${before.id}": key \`${key}\` changed, and this migration only writes ` +
            `${MIGRATED_KEYS.join(', ')}. Before: ${JSON.stringify(before[key])}; after: ` +
            `${JSON.stringify(after[key])}.`
        );
      }
    }
  });

  return { migrated, substitutions };
}

/**
 * Read both inputs, transform, and prove idempotence in process. Writes nothing.
 *
 * `transform` IS A TEST SEAM AND EXISTS FOR ONE REASON. The idempotence comparison below cannot be
 * made to fire by feeding this script bad DATA, because `migrateRecords` derives all three written
 * fields from the source on every pass and never reads the record's current copy — so it converges
 * structurally, not by luck. That is a stronger property than "a second run happens to be a no-op",
 * and it also means a control that only varies the inputs proves nothing about the comparison
 * itself. The seam lets a caller substitute a deliberately non-idempotent transform and watch the
 * check refuse, which is the only honest way to know the check is not decorative. The guard is
 * defence against a FUTURE edit — the day someone makes the transform append to, or read from, the
 * record it is rewriting, this is what catches it.
 *
 * @param {{ transform?: typeof migrateRecords }} [seams]
 */
export function runMigration({ transform = migrateRecords } = {}) {
  const rawProjects = readFileSync(PROJECTS_PATH, 'utf8');
  const sections = parseCopySource(readFileSync(COPY_SOURCE_PATH, 'utf8'));
  const records = JSON.parse(rawProjects);

  const { migrated, substitutions } = transform(records, sections);
  const first = serialise(migrated);

  // IDEMPOTENCE, measured on the transform rather than on the working tree: run it again over its
  // own output. `git diff --quiet` would answer a different question — see the header.
  const second = serialise(transform(JSON.parse(first), sections).migrated);
  if (first !== second) {
    fail(
      'the migration is NOT idempotent: running it over its own output produced a different ' +
        'file. A second run must be a no-op.'
    );
  }

  return { raw: rawProjects, output: first, records, migrated, substitutions, sections };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  let result;
  try {
    result = runMigration();
  } catch (error) {
    if (error instanceof MigrationError) {
      console.error(`FAIL: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const { raw, output, migrated, substitutions } = result;
  const changed = raw !== output;

  console.log(`migrate-project-copy: ${migrated.length} record(s) from ${COPY_SOURCE_LABEL}`);
  for (const record of migrated) {
    console.log(
      `  ${record.id.padEnd(14)} status=${record.status.padEnd(11)} ` +
        `oneLiner=${String(record.oneLiner.length).padStart(3)} ` +
        `description=${String(record.description.length).padStart(3)} (stored lengths)`
    );
  }
  console.log(`  ${substitutions.length} token substitution site(s):`);
  for (const site of substitutions) {
    console.log(`    ${site.id}.${site.field}: "${site.from}" → "${site.to}" [${site.rule}]`);
  }
  console.log('  idempotence: re-running the transform over its own output is byte-identical');

  if (checkOnly) {
    console.log(changed ? '  --check: the file WOULD change' : '  --check: no change');
    process.exit(changed ? 1 : 0);
  }

  writeFileSync(PROJECTS_PATH, output, 'utf8');
  console.log(changed ? '  wrote data/projects.json' : '  data/projects.json already up to date');
}

// Only when run as a script. This module is imported by test/content/project-copy.unit.test.ts,
// which must not trigger a write.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
