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

const APPROVED: Record<string, MetricRecord> = {
  brevo: { value: '+15%', label: 'CONVERSION' },
  pharmeasy: { value: '4K+', label: 'FRANCHISES' },
  maq: { value: '6×', label: 'FASTER PIPELINES' },
};

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
    expect(new Set(Object.keys(APPROVED))).toEqual(new Set(experienceIds));

    for (const entry of RESUME.experience) {
      expect(entry.metric, `${entry.id} has no metric`).toBeDefined();
      expect(entry.metric, `${entry.id}`).toEqual(APPROVED[entry.id]);
    }
  });

  it('stores no {{…}} placeholder in any metric string', () => {
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
    const split = '<p>{\n{metric.value}}</p>';
    expect(findPlaceholders(split)).toEqual([]);
    expect(findPlaceholders(decodeBraceEntities(split))).toEqual([]);
  });
});
