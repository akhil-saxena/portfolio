/**
 * `ExperienceEntry.metric` — the three approved employment figures, and the refusal that stops a
 * placeholder from reaching a reader (OQ-1b, plan 05-03).
 *
 * WHAT THIS FILE PROVES, AND THE ONE THING IT REFUSES TO DO
 * --------------------------------------------------------
 * It never asserts the number 3. The count of employment records is data, and 04-09 turned `main`
 * red by literalling a figure (39 photographs) that a real photograph then changed. Every claim
 * below derives its id set from `data/resume.json` itself and compares SETS, so a fourth job is a
 * correct event that adds a required assertion rather than breaking one.
 *
 * The values themselves ARE literalled, and that is the opposite case: they are not derived from
 * anything, they were approved at a checkpoint, and a test that recomputed them from the same
 * table the migration uses would prove only that the table equals itself. They are written out
 * here as the reviewed answer, so an edit to the table without a decision fails here.
 *
 * WHY THE PROVENANCE IS ASSERTED AS AN ASYMMETRY
 * ----------------------------------------------
 * §15 OQ-1 rejected deriving each metric from its entry's first bold span, because MAQ's headline
 * figure is in its FOURTH bullet — the derivation yields "7+ data sources", which is a true fact
 * about the job and not its result. That rejection is only as durable as the measurement behind
 * it, so the measurement is here: the supporting bullet index is computed from the file, and at
 * least one entry's is proven NOT to be the first. Whoever proposes "we could just derive this"
 * gets a red test with the reason in its name rather than a paragraph in a plan nobody opens.
 *
 * THE GATE'S DETECTOR IS TESTED HERE TOO, INCLUDING WHAT IT CANNOT SEE
 * --------------------------------------------------------------------
 * `findPlaceholders` is IMPORTED from the gate rather than restated. A second regex would prove
 * that two regexes written by the same author on the same afternoon agree. The known residual — a
 * token split between its two braces — is asserted as a PASSING (undetected) case, so the hole is
 * pinned as a measured fact. If someone later closes it, this test goes red and they update it
 * deliberately; a residual recorded only in prose is a residual nobody re-measures.
 *
 * `process.stdout.write`, never `console.log`: console output is swallowed by this repository's
 * vitest setup, which makes evidence indistinguishable from silence.
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import {
  decodeBraceEntities,
  findPlaceholders,
} from '../../scripts/assert-no-unresolved-placeholders.mjs';
import { METRICS } from '../../scripts/migrate-experience-metric.mjs';
import { ResumeSchema } from '../../src/schemas';

type MetricRecord = { value: string; label: string };
type ExperienceRecord = {
  id: string;
  company: string;
  bullets: string[];
  metric?: MetricRecord;
};

const RESUME = JSON.parse(
  readFileSync(new URL('../../data/resume.json', import.meta.url), 'utf8')
) as {
  experience: ExperienceRecord[];
  education: Record<string, unknown>[];
};

/**
 * The reviewed answer from the plan 05-03 task 1 checkpoint, option `approve-sketch`. Written out
 * rather than imported from the migration table: see the header.
 */
const APPROVED: Record<string, MetricRecord> = {
  brevo: { value: '+15%', label: 'CONVERSION' },
  pharmeasy: { value: '4K+', label: 'FRANCHISES' },
  maq: { value: '6×', label: 'FASTER PIPELINES' },
};

/** Derived from the file on every run. Never a literal count. */
const experienceIds = RESUME.experience.map((entry) => entry.id);

describe('data/resume.json carries an employment metric on every experience record', () => {
  it('has a non-empty experience array — without this every assertion below is vacuous', () => {
    expect(Array.isArray(RESUME.experience)).toBe(true);
    expect(RESUME.experience.length).toBeGreaterThan(0);
    expect(experienceIds.length).toBe(new Set(experienceIds).size);
  });

  it('carries a metric on EVERY experience record, by derived id set and not by count', () => {
    const withMetric = RESUME.experience
      .filter((entry) => entry.metric !== undefined)
      .map((entry) => entry.id);
    expect(new Set(withMetric)).toEqual(new Set(experienceIds));
  });

  it('carries exactly the value/label pairs approved at the checkpoint', () => {
    // The approved set and the file's id set must be the same set, in both directions — an
    // approved pair for a record that no longer exists is as much a defect as a record with no
    // approved pair, and only one of the two is visible in a per-record loop.
    expect(new Set(Object.keys(APPROVED))).toEqual(new Set(experienceIds));

    for (const entry of RESUME.experience) {
      expect(entry.metric, `${entry.id} has no metric`).toBeDefined();
      expect(entry.metric, `${entry.id}`).toEqual(APPROVED[entry.id]);
    }
  });

  it('stores no {{…}} placeholder in any metric string', () => {
    // `approve-sketch` was chosen, so no token was ever stored. This asserts the outcome of that
    // decision at the STORED layer; the gate asserts it at the rendered layer, which is the one
    // that decides whether a reader sees it. Both are needed: this one cannot see a token
    // introduced by a renderer, and that one cannot see a token that never reaches a page.
    const strings = RESUME.experience.flatMap((entry) => [
      entry.metric?.value ?? '',
      entry.metric?.label ?? '',
    ]);
    expect(strings.length).toBeGreaterThan(0);
    for (const value of strings) {
      expect(findPlaceholders(value), `stored metric string ${JSON.stringify(value)}`).toEqual([]);
    }
  });

  it('does NOT put a metric on the education record — it is not in the employment band', () => {
    expect(RESUME.education.length).toBeGreaterThan(0);
    for (const entry of RESUME.education) {
      expect(Object.keys(entry)).not.toContain('metric');
    }
  });
});

describe('the schema requires it, and the requirement is proven able to fail', () => {
  it('accepts the committed file', () => {
    const result = ResumeSchema.safeParse(RESUME);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it('REFUSES an experience record with no metric, naming the record and the field', () => {
    const mutated = structuredClone(RESUME);
    const victim = mutated.experience[mutated.experience.length - 1];
    delete victim.metric;

    const result = ResumeSchema.safeParse(mutated);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
    expect(paths).toContain(`experience.${mutated.experience.length - 1}.metric`);
  });

  it.each([
    ['an empty value', { value: '', label: 'CONVERSION' }],
    ['an empty label', { value: '+15%', label: '' }],
    ['a missing label', { value: '+15%' }],
    ['an unknown third key', { value: '+15%', label: 'CONVERSION', unit: '%' }],
    ['a bare string instead of the pair', 'ok'],
  ])('REFUSES %s', (_name, metric) => {
    const mutated = structuredClone(RESUME);
    (mutated.experience[0] as Record<string, unknown>).metric = metric;
    expect(ResumeSchema.safeParse(mutated).success).toBe(false);
  });

  it('REFUSES a metric on the education record — strictObject, so the band cannot drift', () => {
    const mutated = structuredClone(RESUME);
    (mutated.education[0] as Record<string, unknown>).metric = {
      value: '8.4',
      label: 'CGPA',
    };
    expect(ResumeSchema.safeParse(mutated).success).toBe(false);
  });
});

describe('every metric traces to a reviewed bullet — the reason it is not derived', () => {
  const located = RESUME.experience.map((entry) => {
    const row = (METRICS as Record<string, { evidence: string }>)[entry.id];
    return {
      id: entry.id,
      bullet: entry.bullets.findIndex((line) => line.includes(row.evidence)) + 1,
      of: entry.bullets.length,
    };
  });

  it('finds the supporting sentence in that record’s own bullets', () => {
    expect(located.length).toBeGreaterThan(0);
    for (const row of located) {
      expect(row.bullet, `${row.id}: no bullet contains its evidence sentence`).toBeGreaterThan(0);
    }
  });

  it('proves the FIRST-BULLET DERIVATION would be wrong — at least one is not bullet 1', () => {
    // This is the measurement §15 OQ-1's rejection rests on. If it ever becomes false, the
    // derivation option is worth revisiting; while it is true, "just derive it from the first
    // bold span" silently mislabels a record.
    const notFirst = located.filter((row) => row.bullet !== 1);
    expect(notFirst.length).toBeGreaterThan(0);

    process.stdout.write(
      `\nexperience-metric: ${located.length} record(s), supporting bullet index derived from data/resume.json\n`
    );
    for (const row of located) {
      process.stdout.write(
        `  ${row.id.padEnd(10)} ${APPROVED[row.id].value.padEnd(5)} ${APPROVED[row.id].label.padEnd(17)} ← bullet ${row.bullet} of ${row.of}\n`
      );
    }
    process.stdout.write(
      `  first-bullet derivation would mislabel: ${notFirst.map((r) => r.id).join(', ')}\n`
    );
  });
});

describe('the placeholder detector the build gate uses', () => {
  it.each([
    ['a bare token', '<p>{{metric.value}}</p>'],
    ['a token in an HTML comment', '<!-- {{metric.label}} -->'],
    ['a triple brace, via the overlapping occurrence', '<p>{{{raw}}}</p>'],
    ['a live Phase 3 token', '<p>{{ds.componentCount}} components</p>'],
    ['a token nobody enumerated', '<p>{{some.future.token}}</p>'],
    ['an unterminated brace pair', '<p>{{metric.value</p>'],
  ])('flags %s', (_name, html) => {
    expect(findPlaceholders(html).length).toBeGreaterThan(0);
  });

  it.each([
    ['single braces in prose', '<p>a set { x } of one</p>'],
    [
      'the resolved metric, i.e. correct output',
      '<p><span>+15%</span> <span>CONVERSION</span></p>',
    ],
    ['a double-escaped entity, which renders as visible text', '<p>&amp;#123;&amp;#123;x</p>'],
    ['CSS in an inline style block', '<style>@media print{.a{color:red}}</style>'],
  ])('leaves %s alone', (_name, html) => {
    expect(findPlaceholders(html)).toEqual([]);
  });

  it.each([
    ['decimal', '<p>&#123;&#123;metric.value&#125;&#125;</p>'],
    ['hex, padded and upper-case', '<p>&#X007B;&#x7b;x&#x7D;&#x7d;</p>'],
    ['named', '<p>&lbrace;&lcub;metric.label&rcub;&rbrace;</p>'],
    ['mixed literal and entity', '<p>{&#123;metric.value}}</p>'],
  ])('flags an entity-encoded token after decoding: %s', (_name, html) => {
    expect(findPlaceholders(decodeBraceEntities(html)).length).toBeGreaterThan(0);
  });

  it('RESIDUAL, pinned: a token split between its two braces is NOT detected', () => {
    // Measured, not assumed, and asserted as the current behaviour so it cannot rot silently.
    // The whitespace-tolerant rule that would close it is a false-positive risk against inline
    // <style> and minified inline <script>, and a gate that fires on correct output gets switched
    // off rather than obeyed. Reasoning in the gate's own header, blind spot 1. If this test goes
    // red, someone closed the hole — update it deliberately rather than deleting it.
    const split = '<p>{\n{metric.value}}</p>';
    expect(findPlaceholders(split)).toEqual([]);
    expect(findPlaceholders(decodeBraceEntities(split))).toEqual([]);
  });
});
