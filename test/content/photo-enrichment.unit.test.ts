import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST_PATH = `${REPO_ROOT}data/portfolio_images.json`;
const BRIEF_PATH = `${REPO_ROOT}.planning/phases/00-design-ideation/00-PHOTO-CONTENT.md`;

const ALT_MARKER = '[AKHIL-ALT]';
const OPT_MARKER = '[AKHIL-OPT]';
const MARKER_PREFIX = '[AKHIL-';

const COLUMNS = ['id', 'title', 'category', 'date', 'alt', 'place', 'description', 'tags'] as const;

const ROLE_PREFIXES = ['image of', 'photo of', 'picture of'];

const EXPECTED_PLACES = 16;

const COHORT_BASELINE = 39;

interface Photo {
  id: string;
  title: string;
  alt?: unknown;
  place?: unknown;
  category: string;
  order: number;
  categoryOrder?: unknown;
  focalPoint?: unknown;
}

type BriefRow = Record<(typeof COLUMNS)[number], string>;

function parseBrief(text: string): BriefRow[] {
  const rows: BriefRow[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length < 2 || !trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    if (cells.length !== COLUMNS.length) continue;
    if (cells.every((c, i) => c === COLUMNS[i])) continue; // header
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator
    const row = Object.fromEntries(COLUMNS.map((name, i) => [name, cells[i]])) as BriefRow;
    row.id = row.id.replace(/^`(.*)`$/, '$1');
    rows.push(row);
  }
  return rows;
}

const isAbsent = (cell: string) => cell === '' || cell === OPT_MARKER || cell === ALT_MARKER;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const manifest: Photo[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

const SITE_CATEGORY_IDS: string[] = (
  JSON.parse(readFileSync(`${REPO_ROOT}data/site_config.json`, 'utf8')) as {
    categories: { id: string }[];
  }
).categories.map((c) => c.id);
const rows = parseBrief(readFileSync(BRIEF_PATH, 'utf8'));
const rowById = new Map(rows.map((r) => [r.id, r]));

const COHORT: ReadonlySet<string> = new Set(rows.map((r) => r.id));

const slugOf = (id: string, category?: string): string =>
  category !== undefined && id.startsWith(`${category}-`) ? id.slice(category.length + 1) : id;

const bySlug = new Map(manifest.map((p) => [slugOf(p.id, p.category), p]));

const inCohort = (p: Photo): boolean => briefSlugs.has(slugOf(p.id, p.category));

const recordFor = (rowId: string): Photo | undefined => {
  const slug = rowId.slice(rowId.indexOf('-') + 1);
  return bySlug.get(slug);
};

const briefSlugs = new Set([...COHORT].map((id) => id.slice(id.indexOf('-') + 1)));
const outOfCohortIds = (): string[] => manifest.filter((p) => !inCohort(p)).map((p) => p.id);

const report = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

describe('the merge read something', () => {
  it('parses exactly the cohort the frozen brief describes, and it is not zero', () => {
    expect(rows.length).toBe(COHORT_BASELINE);
    expect(rowById.size).toBe(COHORT_BASELINE); // no duplicate ids collapsing the map
    expect(COHORT.size).toBe(COHORT_BASELINE);
    expect(COHORT.size).toBeGreaterThan(0);
  });

  it('has a manifest record for every brief row, and names the records outside the cohort', () => {
    expect(rows.filter((r) => recordFor(r.id) === undefined).map((r) => r.id)).toEqual([]);

    expect(manifest.filter(inCohort)).toHaveLength(COHORT.size);

    const outside = outOfCohortIds();
    expect(COHORT.size + outside.length).toBe(manifest.length);
    if (outside.length > 0) {
      report(
        `photo-enrichment: ${outside.length} manifest record(s) are outside the 03-04 cohort and ` +
          `so out of scope for every COHORT assertion in this file: ${outside.join(', ')}`
      );
    }
  });
});

describe('alt survived the crossing byte for byte', () => {
  it('every cohort record carries the brief cell for its id, character for character', () => {
    let compared = 0;
    for (const row of rows) {
      const photo = recordFor(row.id);
      expect(photo, `no manifest record for cohort id ${row.id}`).toBeDefined();
      expect((photo as Photo).alt, `alt mismatch on ${row.id}`).toBe(row.alt);
      compared += 1;
    }
    expect(compared).toBe(COHORT.size);
    expect(compared).toBeGreaterThan(0); // ANTI-VACUITY
  });

  it('has a non-empty alt on every record in the manifest', () => {
    const missing = manifest
      .filter((p) => typeof p.alt !== 'string' || (p.alt as string).trim() === '')
      .map((p) => p.id);
    expect(missing).toEqual([]);
    expect(manifest.filter((p) => typeof p.alt === 'string' && p.alt.trim() !== '')).toHaveLength(
      manifest.length
    );
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size);
  });

  it('contains no pending marker anywhere in the manifest, in any field', () => {
    const leaked = manifest
      .filter((p) => JSON.stringify(p).includes(MARKER_PREFIX))
      .map((p) => p.id);
    expect(leaked).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

describe('place is present exactly where the brief filled it, and ABSENT elsewhere', () => {
  it('has 16 cohort place keys, each byte-identical to its brief cell', () => {
    const expected = rows.filter((r) => !isAbsent(r.place));
    expect(expected).toHaveLength(EXPECTED_PLACES); // the brief itself still says 16
    for (const row of expected) {
      const photo = recordFor(row.id);
      expect(photo, `no manifest record for ${row.id}`).toBeDefined();
      expect(photo?.place, `place mismatch on ${row.id}`).toBe(row.place);
    }
    expect(manifest.filter((p) => inCohort(p) && 'place' in p)).toHaveLength(EXPECTED_PLACES);
  });

  it('gives the remaining cohort records NO place key at all — not an empty string', () => {
    const absentInBrief = rows.filter((r) => isAbsent(r.place)).map((r) => r.id);
    expect(absentInBrief).toHaveLength(COHORT.size - EXPECTED_PLACES);
    expect(absentInBrief.length).toBeGreaterThan(0); // ANTI-VACUITY for the loop below
    const stillKeyed = manifest.filter((p) => absentInBrief.includes(p.id) && 'place' in p);
    expect(stillKeyed.map((p) => p.id)).toEqual([]);

    const emptyString = manifest
      .filter((p) => 'place' in p && String(p.place).trim() === '')
      .map((p) => p.id);
    expect(emptyString).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

describe("the brief's own rules, re-asserted after the strings left the file that guards them", () => {
  it('has no alt that merely repeats its own title', () => {
    const echoes = manifest
      .filter((p) => typeof p.alt === 'string' && norm(p.alt) === norm(p.title))
      .map((p) => p.id);
    expect(echoes).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });

  it('has no alt opening with "Image of" / "Photo of" / "Picture of"', () => {
    const prefixed = manifest
      .filter(
        (p) =>
          typeof p.alt === 'string' &&
          ROLE_PREFIXES.some((r) => norm(p.alt as string).startsWith(r))
      )
      .map((p) => p.id);
    expect(prefixed).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

function parsePreMigrationOrder(raw: string | null | undefined): Map<string, number> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const records = parsed as Photo[];
  if (records.some((p) => 'categoryOrder' in p)) return null;
  if (!records.every((p) => typeof p.id === 'string' && Number.isInteger(p.order))) return null;
  const orders = new Map<string, number>(records.map((p) => [p.id, p.order]));
  if (orders.size !== records.length) return null; // duplicate ids
  if (new Set(records.map((p) => p.order)).size !== records.length) return null; // duplicate orders
  return orders;
}

function findPreMigrationOrder(): { ref: string; orders: Map<string, number> } {
  const refs = execFileSync('git', ['log', '--format=%H', '--', 'data/portfolio_images.json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const ref of refs) {
    let raw: string;
    try {
      raw = execFileSync('git', ['show', `${ref}:data/portfolio_images.json`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
    } catch {
      continue; // the file did not exist at this revision
    }
    const orders = parsePreMigrationOrder(raw);
    if (orders) return { ref, orders };
  }

  throw new Error(
    'No revision of data/portfolio_images.json predating the categoryOrder backfill was found. ' +
      'The consistency invariant has nothing to compare against and MUST NOT pass vacuously — ' +
      `searched ${refs.length} revision(s).`
  );
}

describe('categoryOrder is dense and unique inside every category', () => {
  it('gives every record an integer categoryOrder', () => {
    const notInteger = manifest.filter((p) => !Number.isInteger(p.categoryOrder)).map((p) => p.id);
    expect(notInteger).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size);
  });

  it('ranks each category exactly 1…n with no gap and no duplicate', () => {
    const byCategory = new Map<string, Photo[]>();
    for (const photo of manifest) {
      const group = byCategory.get(photo.category) ?? [];
      group.push(photo);
      byCategory.set(photo.category, group);
    }
    expect(byCategory.size).toBe(SITE_CATEGORY_IDS.length);
    expect(byCategory.size).toBeGreaterThan(0);
    let counted = 0;
    for (const [category, group] of byCategory) {
      const ranks = group.map((p) => p.categoryOrder as number).sort((a, b) => a - b);
      const dense = group.map((_, i) => i + 1);
      expect(ranks, `ranks in ${category} are not dense 1…n`).toEqual(dense);
      counted += group.length;
    }
    expect(counted).toBe(manifest.length);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});

describe('categoryOrder agrees with the global order it was derived from', () => {
  const previous = findPreMigrationOrder();

  it('found a pre-migration revision holding the whole cohort', () => {
    expect(previous.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(previous.orders.size).toBe(COHORT.size);
  });

  it('covers the whole cohort — a photo published after the migration is reported, not failed', () => {
    let checked = 0;
    const uncovered: string[] = [];
    for (const id of COHORT) {
      if (!previous.orders.has(id)) uncovered.push(id);
      checked += 1;
    }
    expect(
      uncovered,
      `these cohort ids did not exist at ${previous.ref.slice(0, 7)}, so this migration did not derive their rank; re-scope or retire this block rather than weakening it`
    ).toEqual([]);

    expect(COHORT.size).toBeGreaterThan(0);
    expect(checked).toBe(COHORT.size);

    const outside = outOfCohortIds();
    if (outside.length > 0) {
      report(
        `photo-enrichment: ${outside.length} record(s) postdate ${previous.ref.slice(0, 7)} and ` +
          `are out of scope for this migration's rank claim: ${outside.join(', ')}`
      );
    }
  });

  it('orders each cohort category the same way the pre-migration global order did', () => {
    // COHORT. Each category's group is filtered to cohort members BEFORE comparing: a photograph
    // published later has no rank in `previous.orders` at all, so including it would compare a
    // real id against `undefined` and make a true claim about 39 records unfalsifiable at 40.
    const byCategory = new Map<string, Photo[]>();
    for (const photo of manifest) {
      if (!inCohort(photo)) continue; // matched on the slug — the brief's ids are pre-re-author
      const group = byCategory.get(photo.category) ?? [];
      group.push(photo);
      byCategory.set(photo.category, group);
    }
    /*
     * DERIVED. This read `7` and the taxonomy is five now; worse, it was the COHORT's category
     * count, and the cohort spans whatever sections its thirty-nine photographs happen to occupy
     * TODAY — three of the five, as it turns out, because the re-author concentrated them. So the
     * claim cannot be a number at all: it is that every section the cohort touches is ranked 1…n.
     */
    expect(byCategory.size).toBeGreaterThan(0);
    expect(byCategory.size).toBeLessThanOrEqual(SITE_CATEGORY_IDS.length);
    let compared = 0;
    for (const [category, group] of byCategory) {
      const byRank = [...group]
        .sort((a, b) => (a.categoryOrder as number) - (b.categoryOrder as number))
        .map((p) => p.id);
      const byGlobal = [...group]
        .sort(
          (a, b) => (previous.orders.get(a.id) as number) - (previous.orders.get(b.id) as number)
        )
        .map((p) => p.id);
      expect(
        byRank,
        `${category} disagrees with the global order at ${previous.ref.slice(0, 7)}`
      ).toEqual(byGlobal);
      compared += group.length;
    }
    // ANTI-VACUITY. Every cohort member must have been compared; the cohort-filter above is
    // precisely the kind of predicate that could silently empty every group.
    expect(compared).toBe(COHORT.size);
    expect(compared).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// OD-5, resolved by Akhil on 2026-08-25: BOTH FIELDS SURVIVE (option A)
// ---------------------------------------------------------------------------------------------

/**
 * `photo.focalPoint` does NOT supersede `home_config.peekPositions`. Both survive.
 *
 * THE ARGUMENT, WRITTEN DOWN HERE BECAUSE IT IS THE ONE PLACE IN PHASE 3 WHERE TWO FIELDS OF THE
 * SAME SHAPE ARE DEFENDED RATHER THAN DELETED. D-25 deleted `site_config.categoryColumns` and
 * 00-ADMIN-IA §5 deleted the résumé's `period` for exactly the duplication these two look like:
 * both hold a `"50% 25%"` string, and one of them holds a single value while the other holds
 * none. So the burden is on the defence, and the defence is that they answer different questions:
 *
 *   - `focalPoint` is "where is the subject in this photograph" — a property of the IMAGE, true
 *     in any crop, anywhere on the site: a hero, a grid tile, a lightbox, a peek frame.
 *   - `peekPositions` is "how should this photo sit in HOME'S 3:2 peek frame" — a property of one
 *     PLACEMENT in one layout.
 *
 * The distinction is load-bearing rather than theoretical: overriding how a photograph sits in one
 * frame, without changing how it is cropped everywhere else, is not expressible with a single
 * field. Folding them would mean a photo has exactly one crop in every context forever, and undoing
 * that later would mean undoing it with Phase 7's focal-marker editor already built on top.
 *
 * WHAT THIS MIGRATION THEREFORE DID: nothing. The single existing value,
 * `{"architecture-hawamahaldaytime": "50% 25%"}`, stays in `data/home_config.json` untouched, and
 * `focalPoint` is written onto no record. 03-06 adds `focalPoint` to `PhotoSchema` as optional
 * with the default `"50% 50%"` DECLARED IN THE SCHEMA — an explicitly stored default is a value
 * nobody edited that looks like one somebody chose. 03-06 also owns the referential rule that
 * `peekPositions` keys are a subset of `peekIds`; it is not duplicated here.
 */
describe('OD-5: focalPoint is added to the schema, not to the data', () => {
  it('writes focalPoint onto no COHORT record — the default lives in 03-06 schema, not on disk', () => {
    // COHORT. What this migration did was nothing, to 39 records. A photograph published later may
    // legitimately carry a crop — Phase 7's focal-marker editor exists to author exactly that — so
    // scoping to the cohort is what keeps this a claim about the migration rather than a ban on the
    // field. The whole-manifest half of the OD-5 claim is the next `it`, which stays unscoped.
    // Matched on the slug: `COHORT.has(p.id)` compared a post-re-author id against pre-re-author
    // ones and silently found 21 of 39, which a length assertion caught and a filter would not have.
    const cohortRecords = manifest.filter(inCohort);
    const carriers = cohortRecords.filter((p) => 'focalPoint' in p).map((p) => p.id);
    expect(carriers).toEqual([]);
    // ANTI-VACUITY: there are COHORT.size records to check, and they were all found.
    expect(cohortRecords).toHaveLength(COHORT.size);
    expect(COHORT.size).toBeGreaterThan(0);
  });

  it('stores no explicit copy of the "50% 50%" default, whatever focalPoint values appear', () => {
    // DECLARED VACUOUS TODAY, deliberately. No record carries `focalPoint` at all — the assertion
    // above pins that — so this one currently filters an empty set. It is written now rather than
    // later because the moment Phase 7's focal-marker editor authors the first real value is the
    // moment it stops being vacuous, and a rule added after the data exists is a rule added after
    // the violation. When that day comes, retire the assertion above by name and keep this one.
    // INVARIANT, whole manifest, deliberately NOT cohort-scoped: "never store the default
    // explicitly" is a rule about every record that will ever exist, and the pipeline is the first
    // thing in this project that could write one.
    const defaulted = manifest.filter((p) => p.focalPoint === '50% 50%').map((p) => p.id);
    expect(defaulted).toEqual([]);
    expect(manifest.length).toBeGreaterThanOrEqual(COHORT.size); // FLOOR
  });
});
