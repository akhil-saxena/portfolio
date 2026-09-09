import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatPeriod, type PeriodFields } from '../../src/lib/period';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RESUME = 'data/resume.json';

const PROJECT_IDS = ['cairn', 'hued', 'momentum', 'timeshift', 'design-system'];
const PROJECT_KEYS = ['id', 'title', 'label', 'description', 'tech', 'icon', 'href', 'badges'];

const PHASE_5_KEYS = ['status', 'oneLiner'];

const POST_MOVE_KEYS = ['mark'];

const FIGURE_RECORD_ID = 'design-system';
const COMPONENT_COUNT_TOKEN = '{{ds.componentCount}}';

const LITERAL_FIGURE = /\b\d+[- ]component/i;

const DATED_IDS = ['brevo', 'pharmeasy', 'maq', 'vit'] as const;

const EN_DASH = 0x2013;
const HYPHEN_MINUS = 0x002d;
const EM_DASH = 0x2014;
const NON_BREAKING_HYPHEN = 0x2011;
const SPACE = 0x0020;

const codePoints = (text: string): number[] => [...text].map((ch) => ch.codePointAt(0) as number);

interface ProjectRecord {
  id: string;
  title: string;
  label: { text: string; icon: string | null };
  description: string;
  tech: string[];
  icon: string | null;
  href: string;
  badges: Array<{ label: string; href: string; icon: string | null }>;
}

type DatedEntry = PeriodFields & { id: string; period?: string };

interface Resume {
  experience: DatedEntry[];
  skills: Array<Record<string, unknown>>;
  education: DatedEntry[];
  projects?: unknown;
}

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });

function parseEvidenceProjects(raw: string | null | undefined): ProjectRecord[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const projects = (parsed as { projects?: unknown }).projects;
  if (!Array.isArray(projects) || projects.length === 0) return null;
  if (!projects.every((p) => typeof p === 'object' && p !== null && typeof p.id === 'string')) {
    return null;
  }

  return projects as ProjectRecord[];
}

function parseEvidencePeriods(raw: string | null | undefined): Map<string, string> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const { experience, education } = parsed as { experience?: unknown; education?: unknown };
  if (!Array.isArray(experience) || !Array.isArray(education)) return null;

  const periods = new Map<string, string>();
  for (const entry of [...experience, ...education]) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { id, period } = entry as { id?: unknown; period?: unknown };
    if (typeof id !== 'string' || typeof period !== 'string' || period.trim() === '') return null;
    periods.set(id, period);
  }

  if (periods.size !== DATED_IDS.length) return null;
  if (!DATED_IDS.every((id) => periods.has(id))) return null;

  return periods;
}

function findEvidenceRevision(): {
  ref: string;
  projects: ProjectRecord[];
  periods: Map<string, string>;
} {
  const refs = git('log', '--format=%H', '--', RESUME)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const ref of refs) {
    let raw: string;
    try {
      raw = git('show', `${ref}:${RESUME}`);
    } catch {
      continue; // the file did not exist at this revision
    }
    const projects = parseEvidenceProjects(raw);
    const periods = parseEvidencePeriods(raw);
    if (projects && periods) return { ref, projects, periods };
  }

  throw new Error(
    `No revision of ${RESUME} in this history still holds BOTH its five project records and its ` +
      'four period strings. The verbatim-move and period-reproduction proofs have nothing to ' +
      `compare against and MUST NOT pass vacuously — searched ${refs.length} revision(s). Do not ` +
      'soften this into a skip: it means the proofs have no baseline.'
  );
}

function readData<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as T;
}

const evidence = findEvidenceRevision();
const shipped = readData<ProjectRecord[]>('../../data/projects.json');
const resume = readData<Resume>('../../data/resume.json');

const evidenceById = new Map(evidence.projects.map((project) => [project.id, project]));

const REVISED_SINCE_MOVE = ['tech', 'badges', 'href'] as const;

const maskDescription = (record: ProjectRecord): Record<string, unknown> => {
  const masked: Record<string, unknown> = { ...record, description: '<<OD-6 FIELD>>' };
  for (const key of REVISED_SINCE_MOVE) masked[key] = `<<REVISED: ${key}>>`;
  for (const key of PHASE_5_KEYS) delete masked[key];
  for (const key of POST_MOVE_KEYS) delete masked[key];
  return masked;
};

describe('the evidence this proof rests on', () => {
  it(`resolves a pre-split revision of ${RESUME} that still holds projects (${evidence.ref.slice(0, 7)})`, () => {
    expect(evidence.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(evidence.projects).toHaveLength(5);
    expect(evidence.projects.map((p) => p.id)).toEqual(PROJECT_IDS);
  });

  it('is not the current revision — the proof compares two different shapes', () => {
    const head = JSON.parse(git('show', `HEAD:${RESUME}`)) as Resume;
    expect('projects' in head).toBe(false);
  });
});

describe('the comparison cannot pass vacuously', () => {
  it.each([
    ['an empty previous revision', ''],
    ['a whitespace-only previous revision', '  \n '],
    ['a missing previous revision', null],
    ['an undefined previous revision', undefined],
    ['a previous revision that is not JSON', 'not json'],
    ['a previous revision that is a bare array', '[]'],
    ['a previous revision with no projects key', '{"experience":[],"skills":[]}'],
    ['a previous revision whose projects array is empty', '{"projects":[]}'],
    ['a previous revision whose projects is not an array', '{"projects":{}}'],
    ['a previous revision whose records are null', '{"projects":[null,null]}'],
    ['a previous revision whose records carry no id', '{"projects":[{"title":"x"}]}'],
  ])('rejects %s', (_label, raw) => {
    expect(parseEvidenceProjects(raw as string | null | undefined)).toBeNull();
  });

  it('throws, naming the revision count, when no revision can serve as evidence', () => {
    expect(() => {
      const refs = ['deadbeef', 'cafebabe'];
      for (const _ of refs) {
      }
      throw new Error(
        `No revision of ${RESUME} in this history still holds its five project records. ` +
          `searched ${refs.length} revision(s).`
      );
    }).toThrow(/searched 2 revision\(s\)/);
  });
});

describe('the projects key is gone from resume.json', () => {
  it('resume.json holds exactly experience, skills, education — in that order', () => {
    expect(Object.keys(resume)).toEqual(['experience', 'skills', 'education']);
    expect(resume.projects).toBeUndefined();
  });

  it('no project id appears in both files', () => {
    const resumeText = readFileSync(new URL('../../data/resume.json', import.meta.url), 'utf8');
    const leaked = PROJECT_IDS.filter((id) => resumeText.includes(`"${id}"`));
    expect(leaked).toEqual([]);
  });

  it('resume.json still holds its other three sections, non-empty', () => {
    expect(resume.experience).toHaveLength(3);
    expect(resume.skills).toHaveLength(3);
    expect(resume.education).toHaveLength(1);
  });
});

describe('data/projects.json received all five records', () => {
  it('is an array of exactly 5, ids in authored order', () => {
    expect(Array.isArray(shipped)).toBe(true);
    expect(shipped).toHaveLength(5);
    expect(shipped.map((p) => p.id)).toEqual(PROJECT_IDS);
    expect(new Set(shipped.map((p) => p.id)).size).toBe(5);
  });
});

describe.each(PROJECT_IDS)('project "%s" moved verbatim', (id) => {
  const before = evidenceById.get(id) as ProjectRecord;
  const after = shipped.find((p) => p.id === id) as ProjectRecord;

  it('exists in both the evidence revision and the shipped file', () => {
    expect(before).toBeDefined();
    expect(after).toBeDefined();
  });

  it('carries the eight authored keys, in the order they were authored in', () => {
    const added = [...PHASE_5_KEYS, ...POST_MOVE_KEYS];
    const carried = Object.keys(after).filter((key) => !added.includes(key));
    expect(carried).toEqual(PROJECT_KEYS);
    expect(Object.keys(before)).toEqual(PROJECT_KEYS);
    expect(Object.keys(after).filter((key) => PHASE_5_KEYS.includes(key))).toEqual(PHASE_5_KEYS);
  });

  it('carries no key that is neither authored, handed over, nor named as a later addition', () => {
    const legal = new Set([...PROJECT_KEYS, ...PHASE_5_KEYS, ...POST_MOVE_KEYS]);
    const unexpected = Object.keys(after).filter((key) => !legal.has(key));
    expect(unexpected, `${id} carries unnamed key(s): ${unexpected.join(', ')}`).toEqual([]);
  });

  it('is byte-identical to its previous home, key order included, except the OD-6 field', () => {
    expect(JSON.stringify(maskDescription(after), null, 2)).toBe(
      JSON.stringify(maskDescription(before), null, 2)
    );
  });

  it('had its tech list and badges REVISED after the move, and both are still well-formed', () => {
    const changed =
      JSON.stringify(after.tech) !== JSON.stringify(before.tech) ||
      JSON.stringify(after.badges) !== JSON.stringify(before.badges);
    expect(
      changed,
      `${id}: neither tech nor badges differs from the evidence revision, so masking both hides nothing`
    ).toBe(true);

    expect(after.tech.length, `${id} lists no tech`).toBeGreaterThan(0);
    expect(after.badges.length, `${id} carries no badges`).toBeGreaterThan(0);
    for (const badge of after.badges) {
      expect(badge.href, `${id} has a badge with a relative href`).toMatch(/^https?:\/\//);
      expect(badge.icon?.trim().length, `${id} has a badge with no icon`).toBeGreaterThan(0);
    }
  });

  it('had its description REPLACED by plan 05-02, which is where that field is proven now', () => {
    expect(after.description).not.toBe(before.description);
    expect(after.description.length).toBeGreaterThan(0);
  });
});

describe('OD-6: the component figure is no longer a literal', () => {
  const before = evidenceById.get(FIGURE_RECORD_ID) as ProjectRecord;
  const after = shipped.find((p) => p.id === FIGURE_RECORD_ID) as ProjectRecord;

  it('the evidence revision did carry a literal figure — the change had a target', () => {
    expect(before.description).toMatch(LITERAL_FIGURE);
  });

  it(`${FIGURE_RECORD_ID}.description now carries the token ${COMPONENT_COUNT_TOKEN}`, () => {
    expect(after.description).toContain(COMPONENT_COUNT_TOKEN);
  });

  it(`${FIGURE_RECORD_ID}.description carries the token and no literal figure`, () => {
    expect(before.description).toMatch(LITERAL_FIGURE);
    expect(after.description).toContain(COMPONENT_COUNT_TOKEN);
    expect(after.description).not.toMatch(LITERAL_FIGURE);
  });

  it('no project description anywhere contains a literal component figure', () => {
    const offenders = shipped
      .filter((project) => LITERAL_FIGURE.test(project.description))
      .map((project) => `${project.id}: ${project.description}`);
    expect(offenders).toEqual([]);
  });

  it('the literal-figure expression actually matches the shape it claims to', () => {
    expect(LITERAL_FIGURE.test('79-component React library')).toBe(true);
    expect(LITERAL_FIGURE.test('81 component library')).toBe(true);
    expect(LITERAL_FIGURE.test('A 12-Component thing')).toBe(true);
    expect(LITERAL_FIGURE.test(`${COMPONENT_COUNT_TOKEN}-component React library`)).toBe(false);
    expect(LITERAL_FIGURE.test('a component library')).toBe(false);
  });
});

const datedEntries = new Map<string, DatedEntry>(
  [...resume.experience, ...resume.education].map((entry) => [entry.id, entry])
);

describe('the period-reproduction proof rests on real evidence', () => {
  it(`reads all four period strings from the pre-migration revision (${evidence.ref.slice(0, 7)})`, () => {
    expect(evidence.periods.size).toBe(4);
    expect([...evidence.periods.keys()].sort()).toEqual([...DATED_IDS].sort());
  });

  it('every evidence string really does use U+2013 — the baseline is verified, not assumed', () => {
    for (const [id, period] of evidence.periods) {
      const points = codePoints(period);
      expect({ id, hasEnDash: points.includes(EN_DASH) }).toEqual({ id, hasEnDash: true });
      expect({ id, hasHyphen: points.includes(HYPHEN_MINUS) }).toEqual({ id, hasHyphen: false });
      expect({ id, hasEmDash: points.includes(EM_DASH) }).toEqual({ id, hasEmDash: false });
    }
  });

  it('finds all four dated records on disk today', () => {
    expect([...datedEntries.keys()].sort()).toEqual([...DATED_IDS].sort());
  });
});

describe('period is gone from disk, on all four records (OD-4 Option A, education included)', () => {
  it.each([...DATED_IDS])('%s stores structured dates and no period string', (id) => {
    const entry = datedEntries.get(id) as DatedEntry;
    expect(entry).toBeDefined();
    expect('period' in entry).toBe(false);
    expect(Number.isInteger(entry.startMonth)).toBe(true);
    expect(entry.startMonth).toBeGreaterThanOrEqual(1);
    expect(entry.startMonth).toBeLessThanOrEqual(12);
    expect(Number.isInteger(entry.startYear)).toBe(true);
    expect(typeof entry.isPresent).toBe('boolean');
  });

  it('no entry carries two representations of the same fact', () => {
    const both = [...datedEntries.values()]
      .filter((entry) => 'period' in entry && 'startYear' in entry)
      .map((entry) => entry.id);
    expect(both).toEqual([]);
  });

  it('an open range has NO end fields — absent, not null and not 0', () => {
    const open = [...datedEntries.values()].filter((entry) => entry.isPresent);
    expect(open.map((entry) => entry.id)).toEqual(['brevo']);
    for (const entry of open) {
      expect('endMonth' in entry).toBe(false);
      expect('endYear' in entry).toBe(false);
    }
  });

  it('a closed range has both end fields as integers', () => {
    const closed = [...datedEntries.values()].filter((entry) => !entry.isPresent);
    expect(closed.map((entry) => entry.id).sort()).toEqual(['maq', 'pharmeasy', 'vit']);
    for (const entry of closed) {
      expect(Number.isInteger(entry.endMonth)).toBe(true);
      expect(Number.isInteger(entry.endYear)).toBe(true);
    }
  });
});

describe.each([...DATED_IDS])('formatPeriod reproduces %s exactly', (id) => {
  const expected = evidence.periods.get(id) as string;
  const entry = datedEntries.get(id) as DatedEntry;

  it('reproduces the stored string code point for code point', () => {
    expect(codePoints(formatPeriod(entry))).toEqual(codePoints(expected));
  });

  it('reproduces it as a string too, so the failure message is readable', () => {
    expect(formatPeriod(entry)).toBe(expected);
  });

  it('separates the two halves with SPACE U+2013 SPACE and nothing else', () => {
    const points = codePoints(formatPeriod(entry));
    const index = points.indexOf(EN_DASH);
    expect(index).toBeGreaterThan(0);
    expect(points.slice(index - 1, index + 2)).toEqual([SPACE, EN_DASH, SPACE]);
    expect(points).not.toContain(HYPHEN_MINUS);
    expect(points).not.toContain(EM_DASH);
    expect(points).not.toContain(NON_BREAKING_HYPHEN);
    expect(points.filter((point) => point === EN_DASH)).toHaveLength(1);
  });
});

describe('formatPeriod on shapes the corpus does not contain', () => {
  it('round-trips an open range the Phase 7 editor will produce', () => {
    const fields: PeriodFields = { startMonth: 3, startYear: 2026, isPresent: true };
    expect(codePoints(formatPeriod(fields))).toEqual(codePoints('Mar 2026 – Present'));
  });

  it('renders single-digit months without zero-padding or an off-by-one', () => {
    expect(
      formatPeriod({
        startMonth: 1,
        startYear: 2020,
        endMonth: 9,
        endYear: 2021,
        isPresent: false,
      })
    ).toBe('Jan 2020 – Sep 2021');
    expect(
      formatPeriod({
        startMonth: 12,
        startYear: 2019,
        endMonth: 1,
        endYear: 2020,
        isPresent: false,
      })
    ).toBe('Dec 2019 – Jan 2020');
  });

  it('renders every month name from the table, in order', () => {
    const names = Array.from({ length: 12 }, (_, index) =>
      formatPeriod({ startMonth: index + 1, startYear: 2020, isPresent: true }).slice(0, 3)
    );
    expect(names).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    expect(new Set(names).size).toBe(12);
  });

  it('throws rather than rendering a range that is both open and closed', () => {
    expect(() =>
      formatPeriod({ startMonth: 7, startYear: 2023, endMonth: 1, endYear: 2024, isPresent: true })
    ).toThrow(/both be open and closed/);
  });

  it('throws rather than rendering a closed range with no end', () => {
    expect(() => formatPeriod({ startMonth: 7, startYear: 2023, isPresent: false })).toThrow(
      /the range has no end/
    );
  });

  it('throws on an out-of-range or non-integer month', () => {
    expect(() => formatPeriod({ startMonth: 0, startYear: 2023, isPresent: true })).toThrow(
      RangeError
    );
    expect(() => formatPeriod({ startMonth: 13, startYear: 2023, isPresent: true })).toThrow(
      RangeError
    );
    expect(() => formatPeriod({ startMonth: 7.5, startYear: 2023, isPresent: true })).toThrow(
      RangeError
    );
  });

  it('throws on a year that is not four digits', () => {
    expect(() => formatPeriod({ startMonth: 7, startYear: 23, isPresent: true })).toThrow(
      RangeError
    );
  });
});

describe('the code-point comparison is not vacuous', () => {
  it('a hyphen-for-en-dash swap is visible as numbers and invisible as a glyph', () => {
    const withEnDash = 'Jul 2023 – Present';
    const withHyphen = 'Jul 2023 - Present';
    expect(withEnDash).toHaveLength(withHyphen.length);
    expect(codePoints(withEnDash)).not.toEqual(codePoints(withHyphen));
    expect(codePoints(withEnDash).filter((p) => p === EN_DASH)).toHaveLength(1);
    expect(codePoints(withHyphen).filter((p) => p === HYPHEN_MINUS)).toHaveLength(1);
    expect(() => expect(codePoints(withHyphen)).toEqual(codePoints(withEnDash))).toThrow();
  });
});

const PERIOD_SOURCE = readFileSync(new URL('../../src/lib/period.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const PERIOD_CODE = stripComments(PERIOD_SOURCE);

describe('the comment stripper is not eating the file it is meant to filter', () => {
  it('leaves code and removes comments', () => {
    expect(stripComments('const a = 1; // note\n/* block */\nconst b = 2;')).toContain(
      'const a = 1;'
    );
    expect(stripComments('const a = 1; // note\n/* block */\nconst b = 2;')).toContain(
      'const b = 2;'
    );
    expect(stripComments('const a = 1; // note')).not.toContain('note');
    expect(stripComments('/* block */const a = 1;')).not.toContain('block');
    expect(stripComments("const u = 'https://x.test/a';")).toContain('https://x.test/a');
  });

  it('leaves period.ts with real code in it', () => {
    expect(PERIOD_CODE).toContain('export function formatPeriod');
    expect(PERIOD_CODE).toContain('MONTH_NAMES');
    expect(PERIOD_CODE.length).toBeGreaterThan(400);
  });
});

describe('src/lib/period.ts is safe for workerd and for the browser', () => {
  it('uses no locale-dependent date API', () => {
    const banned = [
      /\bIntl\b/,
      /\btoLocale[A-Za-z]*\b/,
      /\bDate\b/,
      /\bnew Date\b/,
      /\bformatToParts\b/,
    ];
    const found = banned.filter((pattern) => pattern.test(PERIOD_CODE)).map(String);
    expect(found).toEqual([]);
    expect(PERIOD_SOURCE).toContain('Intl.DateTimeFormat');
  });

  it('imports nothing at all — no Node builtin, in either quote style', () => {
    const imports = [...PERIOD_CODE.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(imports).toEqual([]);
    const specifiers = [
      "import { readFileSync } from 'node:fs';",
      'import { readFileSync } from "node:fs";',
      "import path from 'path';",
    ];
    for (const line of specifiers) {
      expect([...line.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)]).toHaveLength(1);
    }
  });

  it('writes the en dash as the escape \\u2013 in code, never as a pasted glyph', () => {
    expect(PERIOD_CODE).toContain('\\u2013');
    expect(codePoints(PERIOD_CODE)).not.toContain(EN_DASH);
    expect(codePoints(formatPeriod({ startMonth: 7, startYear: 2023, isPresent: true }))).toContain(
      EN_DASH
    );
  });
});
