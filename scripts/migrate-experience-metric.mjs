#!/usr/bin/env node
/**
 * Add `metric` — the right-aligned figure at the end of each employment row on `/work` — to every
 * entry in `data/resume.json`'s `experience` array (OQ-1b, plan 05-03).
 *
 * WHY THIS EXISTS
 * ---------------
 * `05-UI-SPEC.md` §0.3 measured that `ExperienceEntrySchema` has no `metric` and §10 renders one
 * on every employment row. The figure existed only in a Phase 0 sketch. §14.5 traced all three
 * sketch values back to specific reviewed bullets already on disk, and the checkpoint in task 1 of
 * plan 05-03 approved them as final.
 *
 * WHY THE VALUES ARE NOT DERIVED FROM THE BULLETS
 * -----------------------------------------------
 * §15 OQ-1 measured that option, and it is the reason this table is a table. Taking each entry's
 * FIRST bold span yields `conversion by 15%`, `4K+ franchises` and `7+ data sources`. Two of three
 * are close; the third is wrong, because MAQ's real figure is in its FOURTH bullet. A derivation
 * that is right two times in three does not have a bug — it encodes a false relationship ("the
 * headline figure is the first one") into a renderer, where it is invisible and permanent. So the
 * mapping is authored, and the provenance is checked instead (see EVIDENCE below).
 *
 * THE PROVENANCE IS A CONTROL, NOT A COMMENT
 * -------------------------------------------
 * Each row carries the substring of the reviewed bullet it came from, and the migration REFUSES if
 * that substring is not present in that entry's bullets. This is the part that would otherwise rot:
 * a quoted bullet in a header is prose nobody re-reads, and the claim "every metric traces to
 * reviewed copy" stops being true the first time a bullet is rewritten, silently. Here the claim is
 * re-checked on every run and the matching bullet's 1-based index is printed — which is also how
 * "MAQ's is bullet 4" is a measurement rather than an assertion.
 *
 * It deliberately does NOT check that the metric's own text appears in the bullet. It does not:
 * `FASTER PIPELINES` compresses "Improved pipeline execution time", and a rule demanding textual
 * containment would refuse the reviewed wording. What is checked is that the supporting sentence is
 * still there.
 *
 * WHAT IT REFUSES ON
 * ------------------
 * The table and the file disagreeing on the id set IN EITHER DIRECTION (a table row with no record
 * would be a typo that silently does nothing; a record with no table row would leave a
 * schema-REQUIRED field absent, which then reads as a schema bug rather than as a skipped
 * migration); an entry whose bullets no longer contain its evidence sentence; an unknown key on a
 * record; an empty value or label; and a non-idempotent transform.
 *
 * IDEMPOTENCE — MEASURED IN PROCESS, NOT WITH `git diff`
 * ------------------------------------------------------
 * `git diff --quiet` answers a different question: plan 03-04 shipped exactly that and it read the
 * changes the first run had just made, reporting "not idempotent" on correct code — and after a
 * commit it would have reported OK for a script that never ran. So the transform is run over its
 * own output and the two serialisations are compared. See `runMigration`'s `transform` seam for why
 * that comparison is provably able to fire.
 *
 * Usage:
 *   node scripts/migrate-experience-metric.mjs            write
 *   node scripts/migrate-experience-metric.mjs --check    report only, exit 1 if it would change
 */

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RESUME_PATH = fileURLToPath(new URL('../data/resume.json', import.meta.url));
export const RESUME_LABEL = 'data/resume.json';

/**
 * The three approved metrics, keyed by experience `id`, each with the reviewed bullet it comes
 * from. `evidence` is matched against that entry's bullets on every run; see the header.
 *
 * Approved at the plan 05-03 task 1 checkpoint (option `approve-sketch`).
 */
export const METRICS = /** @type {const} */ ({
  brevo: {
    value: '+15%',
    label: 'CONVERSION',
    evidence: 'Improved **conversion by 15%** by transforming a one-page checkout',
  },
  pharmeasy: {
    value: '4K+',
    label: 'FRANCHISES',
    evidence: 'enhancing productivity for **4K+ franchises** across **4 countries**',
  },
  maq: {
    value: '6×',
    label: 'FASTER PIPELINES',
    // Bullet FOUR. This is the row that made the derive-from-the-first-bullet option wrong: MAQ's
    // first bullet is "**7+ data sources**", which is a true fact about the job and not its
    // headline result. The printed bullet index is the proof.
    evidence: 'Improved pipeline execution time by **6×** by replacing Power Automate workflows',
  },
});

/**
 * Every key an experience record may hold, in the order it is written back.
 *
 * An ALLOW-LIST: an unknown key throws rather than being dropped or appended. `ExperienceEntry` is
 * a `z.strictObject`, so a key silently appended "to be safe" would fail the build — which is a
 * worse place to hear about it than here. `metric` is last, matching its declaration order in
 * `src/schemas/resume.ts`.
 */
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

/** The only key this migration writes. Everything else must survive byte-identically. */
export const MIGRATED_KEYS = ['metric'];

class MigrationError extends Error {}

function fail(message) {
  throw new MigrationError(message);
}

/** Serialise exactly as `data/resume.json` is stored: 2-space JSON, one trailing newline. */
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

  // THE ID SET, CHECKED IN BOTH DIRECTIONS. Named separately because the two failures are
  // different: a record with no row leaves a required field absent, and a row with no record is a
  // typo that does nothing at all and looks like it worked.
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
