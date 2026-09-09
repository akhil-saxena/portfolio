import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { containsHtmlTag, parseBullet } from '../../src/lib/bullets';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RESUME = 'data/resume.json';

type Resume = { experience: { id: string; bullets: string[] }[] };

const flatten = (resume: Resume) =>
  resume.experience.flatMap((entry) =>
    entry.bullets.map((text, index) => ({ id: `${entry.id}#${index}`, text }))
  );

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });

function readPreMigrationBullets(): { id: string; text: string }[] {
  const revs = git('log', '--format=%H', '--', RESUME).trim().split('\n').filter(Boolean);
  for (const rev of revs) {
    const parsed = JSON.parse(git('show', `${rev}:${RESUME}`)) as Resume;
    const bullets = flatten(parsed);
    if (bullets.some((b) => b.text.includes('<strong>'))) return bullets;
  }
  throw new Error(
    `No revision of ${RESUME} in this history carries <strong> in its bullets — the ` +
      'before-state this test compares against does not exist. Do not soften this into a ' +
      'skip: it means the proof has no baseline.'
  );
}

const BEFORE = readPreMigrationBullets();
const AFTER = flatten(
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../data/resume.json', import.meta.url)), 'utf8')
  )
);

const EDITED_SINCE_MIGRATION: Readonly<Record<string, { migrated: string; why: string }>> = {
  'brevo#0': {
    migrated:
      'Improved **conversion by 15%** by transforming a one-page checkout for **2.5M+ users** into a 3-step flow',
    why:
      'the bullet and the /resume metric band (`+15%` / `CONVERSION`) made the same claim twice, ' +
      'four lines apart. 05-15 found it; Akhil approved removing the figure from the prose and ' +
      'letting the band carry it. Reworded 2026-08-29 to "Improved **conversion** by transforming ' +
      'a one-page checkout for **2.5M+ users** into a 3-step flow".',
  },
};

function migratedText(id: string): string {
  const edited = EDITED_SINCE_MIGRATION[id];
  if (edited) return edited.migrated;
  const onDisk = AFTER.find((b) => b.id === id);
  if (onDisk === undefined) {
    throw new Error(
      `bullets-migration: no bullet ${id} after the migration, and no recorded reword for it. ` +
        'A bullet that vanished must fail by name rather than by comparing against nothing.'
    );
  }
  return onDisk.text;
}

const oldProjection = (html: string) => html.replace(/<\/?strong>/g, '');

const oldEmphasis = (html: string) =>
  [...html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) => m[1] as string);

function oldEmphasisPositions(html: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  let consumedTags = 0;
  for (const m of html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)) {
    const text = m[1] as string;
    out.push({ start: (m.index as number) - consumedTags, text });
    consumedTags += '<strong>'.length + '</strong>'.length;
  }
  return out;
}

function newEmphasisPositions(markdown: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  let start = 0;
  for (const run of parseBullet(markdown)) {
    if (run.bold) out.push({ start, text: run.text });
    start += run.text.length;
  }
  return out;
}

describe('the corpus is the corpus the migration was written for', () => {
  it('has 13 bullets before and 13 after, in the same order under the same ids', () => {
    expect(BEFORE).toHaveLength(13);
    expect(AFTER).toHaveLength(13);
    expect(AFTER.map((b) => b.id)).toEqual(BEFORE.map((b) => b.id));
  });

  it('carried 17 <strong> runs before, across 12 of the 13 bullets', () => {
    const perBullet = BEFORE.map((b) => oldEmphasis(b.text).length);
    expect(perBullet.reduce((a, n) => a + n, 0)).toBe(17);
    expect(perBullet.filter((n) => n > 0)).toHaveLength(12);
    expect(perBullet.filter((n) => n === 0)).toHaveLength(1);
  });

  it('carries 17 bold runs after, across the same 12 bullets', () => {
    const perBullet = AFTER.map((b) => parseBullet(b.text).filter((r) => r.bold).length);
    expect(perBullet.reduce((a, n) => a + n, 0)).toBe(17);
    expect(perBullet.filter((n) => n > 0)).toHaveLength(12);
    expect(perBullet.filter((n) => n === 0)).toHaveLength(1);
  });

  it('leaves exactly one bullet unemphasised, and it is pharmeasy#2', () => {
    const unemphasised = AFTER.filter((b) => !parseBullet(b.text).some((r) => r.bold));
    expect(unemphasised.map((b) => b.id)).toEqual(['pharmeasy#2']);
  });
});

describe('the reword table is a record, not a loophole', () => {
  it('every entry names a bullet that is on disk and is ACTUALLY reworded', () => {
    const ids = Object.keys(EDITED_SINCE_MIGRATION);
    for (const id of ids) {
      const onDisk = AFTER.find((b) => b.id === id);
      expect(onDisk, `${id} is in the reword table but is not on disk at all`).toBeDefined();
      expect(
        (onDisk as { text: string }).text,
        `${id} is recorded as reworded and is byte-identical to the migration output — a row that ` +
          'changes nothing cannot be parked here to quieten something else'
      ).not.toBe((EDITED_SINCE_MIGRATION[id] as { migrated: string }).migrated);
      expect(
        (EDITED_SINCE_MIGRATION[id] as { why: string }).why.length,
        `${id} carries no reason`
      ).toBeGreaterThan(40);
    }
  });

  it('every recorded id existed before the migration — the table cannot invent a bullet', () => {
    for (const id of Object.keys(EDITED_SINCE_MIGRATION)) {
      expect(
        BEFORE.some((b) => b.id === id),
        `${id} is in the reword table but was never in the pre-migration corpus`
      ).toBe(true);
    }
  });
});

describe('projection equality — every byte of prose survived', () => {
  it.each(BEFORE)('$id keeps its exact plain text', ({ id, text }) => {
    const projected = parseBullet(migratedText(id))
      .map((r) => r.text)
      .join('');
    expect(projected).toBe(oldProjection(text));
  });

  it('is asserted on all 13, not on an array that happened to be empty', () => {
    expect(BEFORE).toHaveLength(13);
    expect(BEFORE.every((b) => oldProjection(b.text).length > 40)).toBe(true);
  });
});

describe('emphasis equality — every emphasised span survived, in order', () => {
  it.each(BEFORE)('$id keeps its exact bold spans in their exact order', ({ id, text }) => {
    const boldRuns = parseBullet(migratedText(id))
      .filter((r) => r.bold)
      .map((r) => r.text);
    expect(boldRuns).toEqual(oldEmphasis(text));
  });

  it('is asserted over 17 real spans, not over 13 empty lists', () => {
    const total = BEFORE.reduce((n, b) => n + oldEmphasis(b.text).length, 0);
    expect(total).toBe(17);
  });
});

describe('position equality — every emphasised span is still on the same words', () => {
  it.each(BEFORE)('$id emphasises the same offsets', ({ id, text }) => {
    expect(newEmphasisPositions(migratedText(id))).toEqual(oldEmphasisPositions(text));
  });

  it('detects an emphasis that moved to a different occurrence of the same text', () => {
    const old = 'raised <strong>15%</strong> then 15%';
    const moved = 'raised 15% then **15%**';
    expect(oldProjection(old)).toBe(
      parseBullet(moved)
        .map((r) => r.text)
        .join('')
    );
    expect(oldEmphasis(old)).toEqual(
      parseBullet(moved)
        .filter((r) => r.bold)
        .map((r) => r.text)
    );
    expect(newEmphasisPositions(moved)).not.toEqual(oldEmphasisPositions(old));
  });
});

describe('the stored shape can no longer express a tag', () => {
  it('has zero HTML tags anywhere in data/resume.json, not just in bullets', () => {
    const raw = readFileSync(
      fileURLToPath(new URL('../../data/resume.json', import.meta.url)),
      'utf8'
    );
    const tags = [...raw.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g)].map((m) => m[1]);
    expect(tags).toEqual([]);
  });

  it.each(AFTER)('$id contains no tag and parses under the grammar', ({ text }) => {
    expect(containsHtmlTag(text)).toBe(false);
    expect(() => parseBullet(text)).not.toThrow();
  });
});
