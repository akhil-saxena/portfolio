/**
 * The independent proof that converting the 13 stored bullets moved the ENCODING of
 * emphasis and nothing else.
 *
 * ## Why "independent"
 *
 * It does not import `scripts/migrate-resume-bullets.mjs`. It reads the bullets as they
 * were before the migration straight out of git, derives what the conversion was supposed
 * to produce using its own `<strong>` regex, and checks that against what is on disk now.
 * The only thing it shares with the migration is `src/lib/bullets.ts`, which is the point:
 * there is one grammar, and both the writer and this reader are held to it.
 *
 * ## Why TWO equalities, and why neither is sufficient alone
 *
 *  1. **Projection equality** — the old string with its tags deleted must equal the
 *     concatenated run text of the new one. On its own this is satisfied by a script that
 *     stripped every tag and emphasised nothing: the plain text would be perfect and all
 *     17 emphases silently gone.
 *  2. **Emphasis equality** — the ordered `<strong>…</strong>` contents of the old string
 *     must equal the ordered text of the bold runs of the new one. On its own this is
 *     satisfied by a script that got every bold span right and dropped a clause of
 *     surrounding prose.
 *
 * Only the conjunction says the conversion moved the encoding and nothing else. Both
 * halves are proven necessary by a planted defect that only the other one can see — see
 * the plan's negative controls A and B, and the transcript in 03-02-SUMMARY.md.
 *
 * ## How the "before" revision is located, and why not HEAD~1
 *
 * The plan said `git show HEAD~1:data/resume.json`. That is wrong here for two reasons.
 * Phase 3 wave 1 runs three plans concurrently against one branch, so `HEAD~1` is very
 * likely to be another plan's commit; and once ANY later commit touches this file, `HEAD~1`
 * stops meaning "before the migration" permanently.
 *
 * So the before-revision is found by content: the newest revision of `data/resume.json`
 * whose bullets still carry `<strong>`. That is a fixed point in history — the last stored
 * state that used HTML — and it stays correct no matter what lands afterwards.
 *
 * ## When this test should be retired rather than repaired
 *
 * It pins the current bullet prose to the prose that was there at migration time, which is
 * exactly what makes it a proof. If a later plan legitimately REWORDS a bullet, this will
 * go red, and the correct response is to delete this file in the same commit that makes
 * the edit — its job is done at that point. Loosening the assertions to keep it green
 * would leave a test that is present, passing, and no longer proving anything.
 *
 * ## 🔴 THAT HAPPENED, 2026-08-29, AND THE FILE WAS COMPLETED RATHER THAN DELETED OR LOOSENED
 *
 * One bullet was legitimately reworded: `brevo#0` made the same `+15%` claim as the metric
 * band four lines above it, and Akhil approved removing the figure from the prose and
 * letting the band carry it. Three ways out were available and two of them are worse:
 *
 *  1. **Delete the file**, as the paragraph above prescribes. That is the author's own
 *     instruction, and it was written on the assumption that a reword invalidates the
 *     whole proof. Here it invalidates ONE of thirteen bullets. Twelve bullets' worth of
 *     three-way equality — still able to fail, still guarding reviewed content — would go
 *     with it.
 *  2. **Point the AFTER side at git** instead of at disk, so both sides are immutable
 *     revisions. That is the worst option, and it is worth naming so it is not proposed:
 *     a comparison between two fixed revisions CANNOT FAIL, and an unfailable check is the
 *     exact class this repository has now paid for a dozen times.
 *  3. **Record the migration's own output for the reworded bullet**, which is what is done.
 *
 * `EDITED_SINCE_MIGRATION` below holds the string the MIGRATION produced for `brevo#0`, and
 * the three equalities run against that string instead of against disk for that one id. The
 * proof is therefore made for **13 of 13**, not 12 — the reword is not carved out of it, it
 * is stepped around by supplying the value the reword replaced.
 *
 * **This is not the loosening the paragraph above warns about, and here is why.** The table
 * cannot be used to make a red go green with an invented value: whatever is written in it is
 * the thing the three equalities are asserted ON, so an entry that is not the migration's
 * real output fails projection, emphasis and position equality against the `<strong>`
 * original in git — which no later editor can change. The table can only be extended with
 * the truth. A second test asserts each entry actually differs from disk, so a no-op row
 * cannot be parked there to silence something else.
 *
 * **What this file stops checking for a reworded id, stated plainly:** the bytes on disk.
 * `brevo#0`'s current prose is no longer compared to anything here. It is still held by
 * `ResumeSchema`'s grammar refinement, by `parseBullet` in the last describe block below, by
 * the corpus counts in the first one (13 bullets, 17 bold runs, twelve emphasised), and by
 * `test/content/xss-boundaries.unit.test.ts`. What is gone is the pin on its wording — which
 * is the thing that was rewritten on purpose.
 */
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

/** The newest committed revision of data/resume.json whose bullets still carry `<strong>`. */
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

/**
 * Bullets deliberately REWORDED since the migration, each with the string the migration itself
 * produced. See this file's header for why the proof is completed this way rather than by deleting
 * the file or by comparing two git revisions.
 *
 * `migrated` is not a free literal. It is the value the three equalities below are asserted ON, so
 * it is checked against the `<strong>` original in git on every run — projection, emphasis and
 * position. An invented value fails. The only string that can sit here is the migration's own.
 */
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

/**
 * The string THE MIGRATION produced for an id: what is on disk, unless the bullet has since been
 * reworded on purpose and recorded above.
 *
 * It throws rather than returning `undefined` for an id it cannot resolve — a missing bullet must
 * be a named failure and not a comparison against nothing.
 */
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

/** The old string's plain-text projection: its tags deleted, every other byte kept. */
const oldProjection = (html: string) => html.replace(/<\/?strong>/g, '');

/** The old string's ordered emphasis runs. */
const oldEmphasis = (html: string) =>
  [...html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) => m[1] as string);

/**
 * The old string's emphasis runs as `{ start, text }` — the offset being measured in the
 * PROJECTION, so it is directly comparable to the new encoding.
 *
 * ## Why this third equality exists, which the plan did not ask for
 *
 * Projection equality plus emphasis equality is not actually sufficient, and the gap is
 * reachable rather than theoretical. Take a bullet whose emphasised text occurs twice:
 *
 *     old:  "raised <strong>15%</strong> then 15%"
 *     new:  "raised 15% then **15%**"
 *
 * Both have the projection `raised 15% then 15%` and both have the ordered bold list
 * `["15%"]`, so the conjunction the plan specifies is GREEN — while the emphasis has moved
 * to a different occurrence. Nothing in the current 13 bullets repeats an emphasised span,
 * so this cannot fire today; it is here because "cannot fire against today's data" is the
 * same sentence that was true of the escaping in `src/lib/bullets.ts`, and because a proof
 * about reviewed content should not have a hole its author knows about.
 */
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

/** The new string's emphasis runs as `{ start, text }`, offsets in its own projection. */
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
    // Not `toBeGreaterThan(0)`: an empty table is the correct state for most of this file's life,
    // and asserting it is non-empty would be a rule about today rather than about the invariant.
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
    // The construction the plan's two equalities cannot see. Asserted here rather than
    // only described, so the gap is closed by a test and not by a paragraph.
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
    // ...and yet:
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
