#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RESUME_PATH = fileURLToPath(new URL('../data/resume.json', import.meta.url));
export const RESUME_LABEL = 'data/resume.json';

export const METRICS = /** @type {const} */ ({
  brevo: {
    value: '+15%',
    label: 'CONVERSION',
    evidence: 'Improved **conversion** by transforming a one-page checkout',
  },
  pharmeasy: {
    value: '4K+',
    label: 'FRANCHISES',
    evidence: 'enhancing productivity for **4K+ franchises** across **4 countries**',
  },
  maq: {
    value: '6×',
    label: 'FASTER PIPELINES',
    evidence: 'Improved pipeline execution time by **6×** by replacing Power Automate workflows',
  },
});

export const EXPERIENCE_KEY_ORDER = [
  'id',
  'company',
  'role',
  'startMonth',
  'startYear',
  'endMonth',
  'endYear',
  'isPresent',
  'location',
  'logo',
  'url',
  'bullets',
  'metric',
];

export const MIGRATED_KEYS = ['metric'];

class MigrationError extends Error {}

function fail(message) {
  throw new MigrationError(message);
}

export function serialise(resume) {
  return `${JSON.stringify(resume, null, 2)}\n`;
}

/**
 * The transform. Pure: same resume + same table ⇒ same output.
 *
 * @param {any} resume the parsed `data/resume.json`
 * @param {Record<string, { value: string, label: string, evidence: string }>} table
 */
export function migrateResume(resume, table = METRICS) {
  if (resume === null || typeof resume !== 'object' || Array.isArray(resume)) {
    fail(`${RESUME_LABEL} is not an object — there is nothing to migrate.`);
  }
  const entries = resume.experience;
  if (!Array.isArray(entries) || entries.length === 0) {
    fail(
      `${RESUME_LABEL} has no non-empty \`experience\` array. Every assertion below would then ` +
        'iterate an empty set, which is a pass that proves nothing.'
    );
  }

  const tableIds = Object.keys(table);
  if (tableIds.length === 0) {
    fail('the metric table is empty — this run would write nothing and report success.');
  }

  const fileIds = entries.map((entry, index) => {
    const id = entry?.id;
    if (typeof id !== 'string' || id === '') {
      fail(`${RESUME_LABEL}: experience[${index}] has no \`id\`.`);
    }
    return id;
  });
  const duplicated = fileIds.filter((id, index) => fileIds.indexOf(id) !== index);
  if (duplicated.length > 0) {
    fail(`${RESUME_LABEL} has duplicate experience id(s): ${[...new Set(duplicated)].join(', ')}.`);
  }

  const missingFromTable = fileIds.filter((id) => !tableIds.includes(id));
  const missingFromFile = tableIds.filter((id) => !fileIds.includes(id));
  if (missingFromTable.length > 0 || missingFromFile.length > 0) {
    fail(
      'the metric table and ' +
        `${RESUME_LABEL} disagree on the experience id set.\n` +
        (missingFromTable.length > 0
          ? `  in ${RESUME_LABEL} but NOT in the table: ${missingFromTable.join(', ')} — ` +
            '`metric` is REQUIRED, so these records would fail the schema with the field simply ' +
            'absent, which reads as a schema bug rather than as a skipped migration.\n'
          : '') +
        (missingFromFile.length > 0
          ? `  in the table but NOT in ${RESUME_LABEL}: ${missingFromFile.join(', ')} — this row ` +
            'writes nothing to anything, and a migration that silently does nothing is ' +
            'indistinguishable from one that worked.\n'
          : '') +
        `  table: ${tableIds.join(', ')}\n  file:  ${fileIds.join(', ')}`
    );
  }

  /** @type {Array<{ id: string, value: string, label: string, bullet: number, of: number }>} */
  const applied = [];

  const migrated = entries.map((entry) => {
    const id = entry.id;
    const row = table[id];

    const unknown = Object.keys(entry).filter((key) => !EXPERIENCE_KEY_ORDER.includes(key));
    if (unknown.length > 0) {
      fail(
        `record "${id}" carries key(s) this migration has never heard of: ${unknown.join(', ')}. ` +
          'Refusing rather than dropping them — add them to EXPERIENCE_KEY_ORDER deliberately.'
      );
    }

    for (const field of ['value', 'label']) {
      if (typeof row[field] !== 'string' || row[field].trim() === '') {
        fail(
          `record "${id}": the table's \`${field}\` is empty. The schema requires .min(1), and an ` +
            'empty string would render as a blank column rather than as an error.'
        );
      }
    }

    // THE PROVENANCE CHECK. See the header: this is what stops "every metric traces to reviewed
    // copy" from quietly ceasing to be true.
    if (typeof row.evidence !== 'string' || row.evidence.trim() === '') {
      fail(`record "${id}": the table row carries no \`evidence\`, so its metric traces nowhere.`);
    }
    const bullets = Array.isArray(entry.bullets) ? entry.bullets : [];
    const bulletIndex = bullets.findIndex(
      (bullet) => typeof bullet === 'string' && bullet.includes(row.evidence)
    );
    if (bulletIndex === -1) {
      fail(
        `record "${id}": no bullet contains the sentence this metric is derived from.\n` +
          `  expected to find: ${JSON.stringify(row.evidence)}\n` +
          `  in one of ${bullets.length} bullet(s). Either the reviewed copy changed — in which ` +
          'case re-derive the metric and update `evidence` together — or the metric is no longer ' +
          'supported by anything on the page it sits on.'
      );
    }
    applied.push({
      id,
      value: row.value,
      label: row.label,
      bullet: bulletIndex + 1,
      of: bullets.length,
    });

    /** @type {Record<string, unknown>} */
    const next = { ...entry, metric: { value: row.value, label: row.label } };

    // Rebuild in a fixed key order so the diff is the new field and nothing else. Keys absent from
    // the record (the optional end dates on `brevo`) are skipped rather than written as `undefined`
    // — `JSON.stringify` would drop them anyway, but only after they had been in the object.
    /** @type {Record<string, unknown>} */
    const ordered = {};
    for (const key of EXPERIENCE_KEY_ORDER) {
      if (key in next) ordered[key] = next[key];
    }
    return ordered;
  });

  // The script's own pre-flight losslessness check: nothing but `metric` may differ.
  entries.forEach((before, index) => {
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

  // `education` and `skills` are rebuilt by reference, untouched. Stated rather than assumed: the
  // education record is NOT in the employment band and must not gain a metric.
  return { resume: { ...resume, experience: migrated }, applied };
}

/**
 * Read, transform, and prove idempotence in process. Writes nothing.
 *
 * `transform` IS A TEST SEAM AND EXISTS FOR ONE REASON, the same one plan 05-02 documented on
 * `migrate-project-copy.mjs`. The comparison below CANNOT be made to fire by feeding this script
 * bad data: `migrateResume` derives `metric` from the table on every pass and never reads the
 * record's current `metric`, so it converges structurally rather than by luck. An idempotence check
 * that no input can make fail is exactly the unfailable-gate class this repository has now paid for
 * eleven times. The seam lets a caller drive a deliberately non-idempotent transform through it and
 * watch the comparison refuse, which is the only honest way to know the check is not decorative.
 *
 * Note for whoever writes that control: appending a CONSTANT is still idempotent, and so is any
 * transform that ignores the incoming `metric`. A control that does either passes and proves
 * nothing. It must READ what it is rewriting — that is also the real future defect this guards.
 *
 * @param {{ transform?: typeof migrateResume }} [seams]
 */
export function runMigration({ transform = migrateResume } = {}) {
  const raw = readFileSync(RESUME_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  const { resume, applied } = transform(parsed);
  const first = serialise(resume);

  const second = serialise(transform(JSON.parse(first)).resume);
  if (first !== second) {
    fail(
      'the migration is NOT idempotent: running the transform over its own output produced a ' +
        'different file. A second run must be a no-op.'
    );
  }

  return { raw, output: first, applied };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  let result;
  try {
    result = runMigration();
  } catch (error) {
    if (error instanceof MigrationError) {
      process.stderr.write(`FAIL: ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  const { raw, output, applied } = result;
  const changed = raw !== output;

  // `process.stdout.write`, not `console.log`: this repository has measured that console output is
  // swallowed under its vitest setup, and a report that may or may not print is not a report.
  process.stdout.write(
    `migrate-experience-metric: ${applied.length} record(s) in ${RESUME_LABEL}\n`
  );
  for (const row of applied) {
    process.stdout.write(
      `  ${row.id.padEnd(10)} ${row.value.padEnd(5)} ${row.label.padEnd(17)} ` +
        `← bullet ${row.bullet} of ${row.of}\n`
    );
  }
  process.stdout.write(
    '  provenance: every metric above was matched against its supporting bullet in this file\n'
  );
  process.stdout.write(
    '  idempotence: re-running the transform over its own output is byte-identical\n'
  );

  if (checkOnly) {
    process.stdout.write(changed ? '  --check: the file WOULD change\n' : '  --check: no change\n');
    process.exit(changed ? 1 : 0);
  }

  writeFileSync(RESUME_PATH, output, 'utf8');
  process.stdout.write(
    changed ? `  wrote ${RESUME_LABEL}\n` : `  ${RESUME_LABEL} already up to date\n`
  );
}

// Only when run as a script. This module is imported by
// `test/content/experience-metric.unit.test.ts`, which must not trigger a write.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
