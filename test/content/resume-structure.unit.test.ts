/**
 * The losslessness proof for the `resume.json` → `projects.json` split (D-24, plan 03-05), and the
 * proof that the design-system component figure is no longer a literal (OD-6, Option A).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * A move is the cheapest place in a migration to lose a nested value nobody looks at twice. Five
 * records changed file; four of them carry a `badges` array and three carry an `icon` path, and a
 * diff that moves 60 lines from one file to another is not something a human reads for content.
 * So this file reconstructs what the records WERE, out of git, and compares them byte for byte
 * against what shipped.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It does not use `git show HEAD~1:data/resume.json`. Plans 03-01, 03-02 and 03-03 all commit to
 * this branch in the same phase and 03-04 is committing concurrently, so `HEAD~1` stops being this
 * migration's parent the moment any of them lands — and the stated `HEAD` fallback fails
 * identically. Plan 03-03 hit exactly this and measured both paths returning the ALREADY-MIGRATED
 * shape, i.e. a proof comparing the new file against itself and passing. The evidence revision is
 * therefore found BY CONTENT: the newest revision of `data/resume.json` that still holds the five
 * project records. Its short sha is printed in a test name, so the evidence source is visible in
 * the output rather than being something you have to trust.
 *
 * It also does not deep-equal the records. A deep-equality check is blind to key ORDER, and a key
 * reshuffle during a file move is precisely the invisible churn that makes the next diff
 * unreadable. Comparison is on `JSON.stringify` with the key order the records were authored in.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RESUME = 'data/resume.json';

/** The five ids in authored order, and the eight keys in authored order. Both are the contract. */
const PROJECT_IDS = ['cairn', 'hued', 'momentum', 'timeshift', 'design-system'];
const PROJECT_KEYS = ['id', 'title', 'label', 'description', 'tech', 'icon', 'href', 'badges'];

/** The record whose description OD-6 changed, and the token it now carries. */
const FIGURE_RECORD_ID = 'design-system';
const COMPONENT_COUNT_TOKEN = '{{ds.componentCount}}';

/**
 * A literal component figure in prose. This is the expression 03-06 lifts into the schema; it
 * lives here too so the data is guarded from the moment it is written rather than from the moment
 * the schema lands.
 */
const LITERAL_FIGURE = /\b\d+[- ]component/i;

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

interface Resume {
  experience: Array<Record<string, unknown>>;
  skills: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  projects?: unknown;
}

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });

/**
 * Parse a candidate revision of `resume.json` into its five project records, or return `null` if
 * that revision cannot serve as evidence.
 *
 * Split out and separately exercised (see "the comparison cannot pass vacuously") because a
 * comparison against nothing is the failure this project has shipped repeatedly: an evidence
 * revision that resolves to an empty string, or to a revision that no longer holds `projects`,
 * iterates zero records and goes green while proving nothing. Every one of those inputs must
 * return `null` here, and `null` from every revision must THROW rather than yield an empty list.
 */
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
  // Every record must be an object carrying an `id`. A revision holding five nulls would satisfy
  // "is a non-empty array" and then compare five `undefined`s against five `undefined`s.
  if (!projects.every((p) => typeof p === 'object' && p !== null && typeof p.id === 'string')) {
    return null;
  }

  return projects as ProjectRecord[];
}

/** Walk `resume.json`'s own history newest-first for the last revision that still held `projects`. */
function findEvidenceRevision(): { ref: string; projects: ProjectRecord[] } {
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
    if (projects) return { ref, projects };
  }

  throw new Error(
    `No revision of ${RESUME} in this history still holds its five project records. The ` +
      'verbatim-move proof has nothing to compare against and MUST NOT pass vacuously — ' +
      `searched ${refs.length} revision(s). Do not soften this into a skip: it means the proof ` +
      'has no baseline.'
  );
}

function readData<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as T;
}

const evidence = findEvidenceRevision();
const shipped = readData<ProjectRecord[]>('../../data/projects.json');
const resume = readData<Resume>('../../data/resume.json');

/** Index the evidence by id so iteration is driven by the OLD records, never by the new file. */
const evidenceById = new Map(evidence.projects.map((project) => [project.id, project]));

/**
 * Both records with `description` blanked to the same sentinel. Used for the four records OD-6 did
 * not touch too, where it changes nothing — and for `design-system`, where it lets the OTHER seven
 * fields be compared byte-for-byte with key ORDER intact. Masking beats deleting: deleting the key
 * would also delete the evidence that `description` still sits in position four.
 */
const maskDescription = (record: ProjectRecord) => ({ ...record, description: '<<OD-6 FIELD>>' });

describe('the evidence this proof rests on', () => {
  it(`resolves a pre-split revision of ${RESUME} that still holds projects (${evidence.ref.slice(0, 7)})`, () => {
    expect(evidence.ref).toMatch(/^[0-9a-f]{40}$/);
    // A hard count, not "> 0": a truncated evidence revision must fail rather than shrink the proof.
    expect(evidence.projects).toHaveLength(5);
    expect(evidence.projects.map((p) => p.id)).toEqual(PROJECT_IDS);
  });

  it('is not the current revision — the proof compares two different shapes', () => {
    const head = JSON.parse(git('show', `HEAD:${RESUME}`)) as Resume;
    // If this ever fails it means the split was never committed and the "before" is the "after".
    expect('projects' in head).toBe(false);
  });
});

describe('the comparison cannot pass vacuously', () => {
  // The inputs that have historically turned a losslessness proof into a no-op. Each must be
  // rejected at the source rather than iterated over zero times.
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
    // Proves the throw path is reachable and says something useful, without deleting history.
    expect(() => {
      const refs = ['deadbeef', 'cafebabe'];
      for (const _ of refs) {
        /* every candidate rejected */
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
    // Guards the failure mode where "lost the projects key" quietly became "lost three keys".
    expect(resume.experience).toHaveLength(3);
    expect(resume.skills).toHaveLength(3);
    expect(resume.education).toHaveLength(1);
  });
});

describe('data/projects.json received all five records', () => {
  it('is an array of exactly 5, ids in authored order', () => {
    expect(Array.isArray(shipped)).toBe(true);
    // The exact count, asserted, so a test iterating an empty array cannot report success.
    expect(shipped).toHaveLength(5);
    expect(shipped.map((p) => p.id)).toEqual(PROJECT_IDS);
    expect(new Set(shipped.map((p) => p.id)).size).toBe(5);
  });
});

/**
 * Iteration is driven by the ids the EVIDENCE holds, not by what shipped. Driving it from the
 * shipped file would make a dropped record delete its own test case along with itself.
 */
describe.each(PROJECT_IDS)('project "%s" moved verbatim', (id) => {
  const before = evidenceById.get(id) as ProjectRecord;
  const after = shipped.find((p) => p.id === id) as ProjectRecord;

  it('exists in both the evidence revision and the shipped file', () => {
    expect(before).toBeDefined();
    expect(after).toBeDefined();
  });

  it('carries the eight keys in the order they were authored in', () => {
    expect(Object.keys(after)).toEqual(PROJECT_KEYS);
    expect(Object.keys(after)).toEqual(Object.keys(before));
  });

  it('is byte-identical to its previous home, key order included, except the OD-6 field', () => {
    // `JSON.stringify`, not `toEqual`: a key reshuffle is invisible to deep equality and is exactly
    // the churn this assertion exists to catch. `icon: null` on cairn and design-system survives as
    // `null` here rather than being dropped, because stringify emits explicit nulls.
    expect(JSON.stringify(maskDescription(after), null, 2)).toBe(
      JSON.stringify(maskDescription(before), null, 2)
    );
  });

  if (id !== FIGURE_RECORD_ID) {
    it('has an untouched description too — OD-6 changed exactly one record', () => {
      expect(after.description).toBe(before.description);
    });
  }
});

describe('OD-6: the component figure is no longer a literal', () => {
  const before = evidenceById.get(FIGURE_RECORD_ID) as ProjectRecord;
  const after = shipped.find((p) => p.id === FIGURE_RECORD_ID) as ProjectRecord;

  it('the evidence revision did carry a literal figure — the change had a target', () => {
    // Without this, "no description matches a literal figure" would also be green against a
    // corpus that never had one, and the OD-6 assertions below would prove nothing.
    expect(before.description).toMatch(LITERAL_FIGURE);
  });

  it(`${FIGURE_RECORD_ID}.description now carries the token ${COMPONENT_COUNT_TOKEN}`, () => {
    // Asserted by id AND field name, so "one field differs" is a NAMED expectation rather than a
    // tolerance the verbatim comparison quietly grants.
    expect(after.description).toContain(COMPONENT_COUNT_TOKEN);
  });

  it(`${FIGURE_RECORD_ID}.description changed the figure and NOTHING else`, () => {
    // The reviewed sentence either side of the figure must survive byte for byte. Derived from the
    // evidence rather than hardcoded, so this compares against what was on disk and not against
    // what the plan believed was on disk.
    expect(after.description).toBe(
      before.description.replace(
        LITERAL_FIGURE,
        (match) => `${COMPONENT_COUNT_TOKEN}${match.replace(/^\d+/, '')}`
      )
    );
    // And stated the other way round, so a bug in the line above cannot make both sides agree:
    const [beforeHead, ...beforeRest] = before.description.split(LITERAL_FIGURE);
    expect(beforeHead).toBe('');
    expect(after.description.slice(COMPONENT_COUNT_TOKEN.length)).toBe(
      `-component${beforeRest.join('')}`
    );
  });

  it('no project description anywhere contains a literal component figure', () => {
    // The assertion 03-06 lifts into the schema. Reported as a list of offending ids so a failure
    // names the record instead of saying `false !== true`.
    const offenders = shipped
      .filter((project) => LITERAL_FIGURE.test(project.description))
      .map((project) => `${project.id}: ${project.description}`);
    expect(offenders).toEqual([]);
  });

  it('the literal-figure expression actually matches the shape it claims to', () => {
    // A gate whose regex is wrong is worse than no gate. Anchored on strings, not on the corpus.
    expect(LITERAL_FIGURE.test('79-component React library')).toBe(true);
    expect(LITERAL_FIGURE.test('81 component library')).toBe(true);
    expect(LITERAL_FIGURE.test('A 12-Component thing')).toBe(true);
    expect(LITERAL_FIGURE.test(`${COMPONENT_COUNT_TOKEN}-component React library`)).toBe(false);
    expect(LITERAL_FIGURE.test('a component library')).toBe(false);
  });
});
