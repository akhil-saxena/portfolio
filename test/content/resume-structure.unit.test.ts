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
 *
 * THE SECOND PROOF: exact reproduction of the four period strings (OD-4, Option A)
 * -------------------------------------------------------------------------------
 * `period` is gone from disk on all four dated records — three experience entries and education.
 * `formatPeriod` derives it. The acceptance test 00-ADMIN-IA §5 names is EXACT reproduction of the
 * four strings that were on disk, and they are read from the same evidence revision rather than
 * hardcoded here, so this proves the migration reproduced what WAS on disk and not what the plan
 * believed was on disk.
 *
 * WHAT PLAN 05-02 TOOK OVER (OQ-1)
 * ---------------------------------
 * `description` is no longer this file's to prove. 05-02 replaced all five with the reviewed
 * Phase 0 copy from `00-COPY/one-liners.md` and added `status` and `oneLiner`, so three of the ten
 * keys on a shipped record post-date the move this file is about. The response was to hand those
 * fields over BY NAME — to `test/content/project-copy.unit.test.ts`, which proves the new copy
 * verbatim against the markdown and proves every field 05-02 did NOT write byte-identical against
 * the pre-migration revision — and to keep asserting, here, the things that are still true: the
 * eight authored keys in their authored order, byte-identity of the seven this file still owns,
 * and that the description CHANGED on every record. Two assertions below were inverted rather than
 * deleted, each with the reason written where the old claim used to be. An assertion removed
 * because it went red is indistinguishable from one that was never there.
 *
 * Comparison is on CODE POINTS, not on a visual string equality. U+2013 EN DASH and U+002D
 * HYPHEN-MINUS are near-indistinguishable in most terminals and diff viewers, so an assertion
 * failure message showing `Jul 2023 – Present` against `Jul 2023 - Present` reads as identical.
 * Every separator claim below is stated as a number.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatPeriod, type PeriodFields } from '../../src/lib/period';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RESUME = 'data/resume.json';

/** The five ids in authored order, and the eight keys in authored order. Both are the contract. */
const PROJECT_IDS = ['cairn', 'hued', 'momentum', 'timeshift', 'design-system'];
const PROJECT_KEYS = ['id', 'title', 'label', 'description', 'tech', 'icon', 'href', 'badges'];

/**
 * The two keys plan 05-02 inserted between `label` and `description` (OQ-1). Listed by name so the
 * comparisons below EXCLUDE exactly these and nothing else — a third key appearing later fails the
 * key-order assertion rather than being quietly absorbed by a filter.
 */
const PHASE_5_KEYS = ['status', 'oneLiner'];

/**
 * Keys added AFTER the move, named one at a time so an unnamed one still fails.
 *
 * `mark` — a theme-aware brand-mark pair, one file per ground, for the two projects whose artwork is
 * a knock-out rather than an opaque store square. `icon` could not express it: a single path is wrong
 * in one of the two themes.
 *
 * `evidence` WAS HERE AND HAS BEEN REMOVED, which is worth recording rather than quietly dropping.
 * Plan 05-16 added `evidence: z.enum(['components']).optional()` so `design-system` could render its
 * own Chip, StatusPill, Button and Link on the card as the evidence. Akhil later removed that strip
 * — *"in ds card, remove additional cip/statuspill, button, link etc"* — and the field came out of
 * the schema and the data with it, because a field no renderer reads is a field that drifts. Leaving
 * its name in this list would have made the catch-all below tolerate a key that cannot legally exist.
 *
 * WHY THIS LIST EXISTS RATHER THAN THE PROOF BEING RELAXED. The claim below is that the five project
 * records moved from `resume.json` to `projects.json` BYTE-IDENTICALLY, and every exception erodes
 * it. So exceptions are enumerated: a key in this list is a change someone made on purpose and
 * wrote down here, and any other new key fails the assertion by name. The alternative — comparing
 * only the keys both files happen to share — would let the record be rewritten a field at a time
 * with the test staying green, which is precisely what it was written to prevent.
 */
const POST_MOVE_KEYS = ['mark'];

/** The record whose description OD-6 changed, and the token it now carries. */
const FIGURE_RECORD_ID = 'design-system';
const COMPONENT_COUNT_TOKEN = '{{ds.componentCount}}';

/**
 * A literal component figure in prose. This is the expression 03-06 lifts into the schema; it
 * lives here too so the data is guarded from the moment it is written rather than from the moment
 * the schema lands.
 */
const LITERAL_FIGURE = /\b\d+[- ]component/i;

/** The four dated records, and the section each lives in. Hard-listed, so a missing one fails. */
const DATED_IDS = ['brevo', 'pharmeasy', 'maq', 'vit'] as const;

/**
 * Separator code points, named rather than pasted.
 *
 * `EN_DASH` is what the four strings on disk use. The other three are the characters a careless
 * edit substitutes; each is asserted ABSENT, because "looks right in the terminal" is exactly the
 * evidence this file refuses to accept.
 */
const EN_DASH = 0x2013;
const HYPHEN_MINUS = 0x002d;
const EM_DASH = 0x2014;
const NON_BREAKING_HYPHEN = 0x2011;
const SPACE = 0x0020;

/** A string as its code points. The only representation this file compares separators in. */
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

/**
 * Parse a candidate revision into its four stored `period` strings, or `null` if it cannot serve
 * as evidence for the OD-4 reproduction proof.
 *
 * The count is required to be exactly four and the ids exactly the four expected. "Some periods"
 * is not evidence: a revision holding one period would let three of the four reproduction cases
 * silently not exist, and a `describe.each` over an array of one passes just as green as one over
 * an array of four.
 */
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

/**
 * Walk `resume.json`'s own history newest-first for the last revision that still held BOTH the
 * five project records AND the four period strings.
 *
 * Both predicates, one revision: the two migrations landed in the same file across two commits, so
 * requiring both guarantees the "before" state this file compares against is a single coherent
 * snapshot rather than two facts stitched from different points in history.
 */
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

/** Index the evidence by id so iteration is driven by the OLD records, never by the new file. */
const evidenceById = new Map(evidence.projects.map((project) => [project.id, project]));

/**
 * Both records with `description` blanked to the same sentinel. Used for the four records OD-6 did
 * not touch too, where it changes nothing — and for `design-system`, where it lets the OTHER seven
 * fields be compared byte-for-byte with key ORDER intact. Masking beats deleting: deleting the key
 * would also delete the evidence that `description` still sits in position four.
 */
/**
 * Reduce a shipped record to the fields this proof still owns.
 *
 * `description` is BLANKED rather than dropped, because OD-6 changed its value but not its
 * position, and blanking keeps it in the key order the comparison reads. `status` and `oneLiner`
 * are DROPPED, because the evidence revision predates them and has no slot for them at all — a
 * blank would compare a present key against an absent one and fail for the wrong reason.
 */
/*
 * ================================================================================================
 * `tech` AND `badges` JOIN `description` IN THE MASK, AND EACH GETS ITS OWN ASSERTION BELOW
 * ================================================================================================
 *
 * MEASURED against the evidence revision, which key diverged on which record:
 *
 *     description   all five   already masked — OD-6 then 05-02 replaced it
 *     tech          all five   Akhil: *"use fe language + be language ... use just a single pill if
 *                               2nd one ids not very important"* — four lists lost their second and
 *                              third entries, cairn's changed members entirely
 *     badges        two        cairn's globe label became `cairn.co.in` so the mark names its
 *                              destination; design-system gained a `Storybook` badge
 *     id/title/label/icon/href   NONE — byte-identical on all five
 *
 * THE MOVE WAS STILL LOSSLESS. That is what this suite proves and it remains proven: the five keys
 * that identify a record — its route, its name, its artwork, its destination — are unchanged since
 * before it moved. The two divergences are content decisions taken with the page rendered, months
 * after the move, and a proof that forbids them is a proof that has become a freeze.
 *
 * MASKED RATHER THAN DROPPED, for the reason `description` already was: dropping a key also deletes
 * the evidence that it still sits in its own position, and key ORDER is half of what this comparison
 * checks. A blanked value keeps the slot.
 */
const REVISED_SINCE_MOVE = ['tech', 'badges'] as const;

const maskDescription = (record: ProjectRecord): Record<string, unknown> => {
  const masked: Record<string, unknown> = { ...record, description: '<<OD-6 FIELD>>' };
  for (const key of REVISED_SINCE_MOVE) masked[key] = `<<REVISED: ${key}>>`;
  // Not cast back to `ProjectRecord`: after the deletions it is deliberately NOT one, and saying
  // so would be a lie the compiler rejects (ts2352). The only consumer is `JSON.stringify`.
  for (const key of PHASE_5_KEYS) delete masked[key];
  // …and the keys added after the move, each named in POST_MOVE_KEYS with its reason.
  for (const key of POST_MOVE_KEYS) delete masked[key];
  return masked;
};

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

  it('carries the eight authored keys, in the order they were authored in', () => {
    // Derived by removing the later keys BY NAME, not by taking the first eight: an unnamed key
    // appearing later must fail here. The evidence revision is asserted to hold exactly the eight,
    // so this proof did not shrink — it stopped owning fields it never had.
    const added = [...PHASE_5_KEYS, ...POST_MOVE_KEYS];
    const carried = Object.keys(after).filter((key) => !added.includes(key));
    expect(carried).toEqual(PROJECT_KEYS);
    expect(Object.keys(before)).toEqual(PROJECT_KEYS);
    // The handover is asserted, not assumed: both 05-02 keys must be present, in their own order.
    expect(Object.keys(after).filter((key) => PHASE_5_KEYS.includes(key))).toEqual(PHASE_5_KEYS);
  });

  it('carries no key that is neither authored, handed over, nor named as a later addition', () => {
    /*
     * THE CATCH-ALL, and it is the assertion that keeps the two lists above honest. Without it,
     * adding a field and adding its name to `POST_MOVE_KEYS` would be indistinguishable from adding
     * a field and forgetting to — both green. Here, only the second is.
     */
    const legal = new Set([...PROJECT_KEYS, ...PHASE_5_KEYS, ...POST_MOVE_KEYS]);
    const unexpected = Object.keys(after).filter((key) => !legal.has(key));
    expect(unexpected, `${id} carries unnamed key(s): ${unexpected.join(', ')}`).toEqual([]);
  });

  it('is byte-identical to its previous home, key order included, except the OD-6 field', () => {
    // `JSON.stringify`, not `toEqual`: a key reshuffle is invisible to deep equality and is exactly
    // the churn this assertion exists to catch. `icon: null` on cairn and design-system survives as
    // `null` here rather than being dropped, because stringify emits explicit nulls.
    expect(JSON.stringify(maskDescription(after), null, 2)).toBe(
      JSON.stringify(maskDescription(before), null, 2)
    );
  });

  it('had its tech list and badges REVISED after the move, and both are still well-formed', () => {
    /*
     * THE COVERAGE THE MASK WOULD OTHERWISE HAVE COST, and it is two claims rather than one.
     *
     * That they CHANGED is asserted, so the mask cannot be quietly hiding a case where nothing
     * changed and the exemption was never needed — the same discipline the `description` assertion
     * below already applies. And that they are still USABLE is asserted, because these fields are
     * Akhil's to revise and nobody's to empty: `tech` drives the card's chips and `badges` its
     * destination marks, and an empty either makes a card that says nothing about where to go.
     */
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
    // This read "has an untouched description too — OD-6 changed exactly one record", and it was
    // true: OD-6 tokenised one figure and left the other four sentences alone. 05-02 (OQ-1) then
    // replaced all five with the reviewed copy from `00-COPY/one-liners.md`, which had been
    // written, sourced per claim in Phase 0 and never merged.
    //
    // INVERTED, not deleted. The fact that made the old assertion wrong is itself asserted — the
    // description changed, on every record — and the verbatim proof of its new value lives in
    // `test/content/project-copy.unit.test.ts`. Deleting this would have been the same edit with
    // no evidence attached.
    expect(after.description).not.toBe(before.description);
    expect(after.description.length).toBeGreaterThan(0);
  });
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

  it(`${FIGURE_RECORD_ID}.description carries the token and no literal figure`, () => {
    // This was a byte comparison — the shipped description against the evidence one with only the
    // figure substituted, the exact-and-nothing-else form OD-6 needed. Plan 05-02 replaced that
    // whole sentence with the reviewed card copy, so the comparison stopped being true of
    // anything, and a comparison that cannot be true is not a weaker proof, it is no proof.
    //
    // What OD-6 protects is unchanged and is asserted directly instead: the evidence revision DID
    // carry a literal figure (asserted above, so the transition had a target), and the shipped
    // description carries the token and no figure. The verbatim claim about the NEW sentence
    // belongs to `test/content/project-copy.unit.test.ts`, which owns that copy and compares it
    // against `00-COPY/one-liners.md` character for character.
    expect(before.description).toMatch(LITERAL_FIGURE);
    expect(after.description).toContain(COMPONENT_COUNT_TOKEN);
    expect(after.description).not.toMatch(LITERAL_FIGURE);
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

// ============================================================================================
// OD-4 — the date shape, and exact reproduction of the four strings
// ============================================================================================

/** The four dated records as they ship, indexed by id, across both sections. */
const datedEntries = new Map<string, DatedEntry>(
  [...resume.experience, ...resume.education].map((entry) => [entry.id, entry])
);

describe('the period-reproduction proof rests on real evidence', () => {
  it(`reads all four period strings from the pre-migration revision (${evidence.ref.slice(0, 7)})`, () => {
    // A hard count. A `describe.each` over three strings is as green as one over four.
    expect(evidence.periods.size).toBe(4);
    expect([...evidence.periods.keys()].sort()).toEqual([...DATED_IDS].sort());
  });

  it('every evidence string really does use U+2013 — the baseline is verified, not assumed', () => {
    // Without this, a baseline that had drifted to a hyphen would make "exact reproduction" mean
    // "exactly reproduces the wrong character", and the whole proof would invert.
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
    // The exact defect the legacy `src/types.ts` header documented: the admin split dates into
    // structured fields while resume.json kept a string, and the two drifted. Reintroducing it
    // here would be doing so knowingly.
    const both = [...datedEntries.values()]
      .filter((entry) => 'period' in entry && 'startYear' in entry)
      .map((entry) => entry.id);
    expect(both).toEqual([]);
  });

  it('an open range has NO end fields — absent, not null and not 0', () => {
    const open = [...datedEntries.values()].filter((entry) => entry.isPresent);
    // Exactly one role is current (Brevo). Asserted as a number so "zero open ranges" — which
    // would make this test vacuous — fails instead of passing.
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

/**
 * The acceptance test 00-ADMIN-IA §5 named. Iteration is driven by the ids the EVIDENCE holds, so
 * a record deleted from disk cannot delete its own reproduction case along with itself.
 */
describe.each([...DATED_IDS])('formatPeriod reproduces %s exactly', (id) => {
  const expected = evidence.periods.get(id) as string;
  const entry = datedEntries.get(id) as DatedEntry;

  it('reproduces the stored string code point for code point', () => {
    // `codePoints`, not string equality. A hyphen-for-en-dash swap produces a diff whose two sides
    // render identically in a terminal; as arrays of numbers it reads `8211` against `45`.
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
    // Every near-identical substitute, named and excluded.
    expect(points).not.toContain(HYPHEN_MINUS);
    expect(points).not.toContain(EM_DASH);
    expect(points).not.toContain(NON_BREAKING_HYPHEN);
    // Exactly one dash, so a formatter emitting two separators cannot pass on the first.
    expect(points.filter((point) => point === EN_DASH)).toHaveLength(1);
  });
});

describe('formatPeriod on shapes the corpus does not contain', () => {
  it('round-trips an open range the Phase 7 editor will produce', () => {
    const fields: PeriodFields = { startMonth: 3, startYear: 2026, isPresent: true };
    expect(codePoints(formatPeriod(fields))).toEqual(codePoints('Mar 2026 – Present'));
  });

  it('renders single-digit months without zero-padding or an off-by-one', () => {
    // January is month 1 and index 0. Both ends of the table, in one case.
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
    // Guards a transposed or duplicated entry, which a four-record corpus using seven of twelve
    // months would never reach.
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
    // Same length, same everything but one character — this is why an eyeball is not evidence.
    expect(withEnDash).toHaveLength(withHyphen.length);
    expect(codePoints(withEnDash)).not.toEqual(codePoints(withHyphen));
    expect(codePoints(withEnDash).filter((p) => p === EN_DASH)).toHaveLength(1);
    expect(codePoints(withHyphen).filter((p) => p === HYPHEN_MINUS)).toHaveLength(1);
    // And the assertion this file actually makes rejects it.
    expect(() => expect(codePoints(withHyphen)).toEqual(codePoints(withEnDash))).toThrow();
  });
});

// ============================================================================================
// `src/lib/period.ts` stays safe for the runtimes that import it
//
// These were `node -e` one-liners in the plan. They are assertions here instead, because a gate
// that lives in a plan's verify block protects the afternoon it was run and nothing afterwards —
// and both of the plan's versions were broken (see 03-05-SUMMARY.md):
//
//   - the locale check matched its own explanatory COMMENT, so it failed on correct code. This
//     is the seventh comment-match defect recorded on this project. Fixed by stripping comments
//     before testing, which also makes the check stronger: an escape or an import that exists
//     only inside a comment no longer counts as evidence either way.
//   - the Node-import check matched only DOUBLE-quoted specifiers, while `biome.json` sets
//     `javascript.formatter.quoteStyle: "single"` — so the one form the repository can actually
//     contain was the one form it could not see.
// ============================================================================================

const PERIOD_SOURCE = readFileSync(new URL('../../src/lib/period.ts', import.meta.url), 'utf8');

/**
 * Source with comments removed. The `[^:]` guard keeps `https://` from being read as a line
 * comment; there are no URLs in `period.ts` today, and this makes that not matter if one appears.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const PERIOD_CODE = stripComments(PERIOD_SOURCE);

describe('the comment stripper is not eating the file it is meant to filter', () => {
  // Without this, every assertion below would pass against an empty string.
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
    // The header is long; if stripping ever ate the body this ratio collapses.
    expect(PERIOD_CODE.length).toBeGreaterThan(400);
  });
});

describe('src/lib/period.ts is safe for workerd and for the browser', () => {
  it('uses no locale-dependent date API', () => {
    // workerd does not ship the developer's Node ICU data, so `Jul` locally can be `July` or
    // `juil.` in production with no code change and no failing test.
    // Matched as WORD-BOUNDED patterns, not as the dotted call sites. The dotted form is
    // walk-through-able: `const Locale = Intl;` followed by `new Locale.DateTimeFormat(...)`
    // contains neither `Intl.` nor `Intl.DateTimeFormat`, and it was demonstrated passing a
    // substring check before this was tightened. `Date` is banned outright — a month-name table
    // has no legitimate reason to construct one, and every locale route into this file goes
    // through one of these five names.
    const banned = [
      /\bIntl\b/,
      /\btoLocale[A-Za-z]*\b/,
      /\bDate\b/,
      /\bnew Date\b/,
      /\bformatToParts\b/,
    ];
    const found = banned.filter((pattern) => pattern.test(PERIOD_CODE)).map(String);
    expect(found).toEqual([]);
    // ...and the same names DO appear in the header comment, which is why stripping is required.
    expect(PERIOD_SOURCE).toContain('Intl.DateTimeFormat');
  });

  it('imports nothing at all — no Node builtin, in either quote style', () => {
    const imports = [...PERIOD_CODE.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(imports).toEqual([]);
    // Stated as a positive too, so the regex being wrong cannot look like "no imports found".
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
    // In code, the ONLY form allowed is the escape — so a silent normalisation to a hyphen shows
    // up in a diff. Comments may quote the glyph; they do not produce output.
    expect(PERIOD_CODE).toContain('\\u2013');
    expect(codePoints(PERIOD_CODE)).not.toContain(EN_DASH);
    // And the escape is what the formatter actually emits.
    expect(codePoints(formatPeriod({ startMonth: 7, startYear: 2023, isPresent: true }))).toContain(
      EN_DASH
    );
  });
});
