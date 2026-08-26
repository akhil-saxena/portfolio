/**
 * The byte-identity proof for the 00-PHOTO-CONTENT.md → data/portfolio_images.json merge
 * (CONT-01, plan 03-04).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * The 39 `alt` strings were written by looking at every photograph and reviewed with Akhil on
 * 2026-08-23. The public gallery ships zero framework JS, so `alt` is delivered on the `<img>`
 * element and is the entire non-visual experience of 39 images — there is no hover, no tooltip
 * and no later interaction that could supply a description, because there is no JavaScript on
 * the page to implement one. A string that was re-wrapped, curly-quote-normalised, truncated or
 * "improved" in transit is no longer the string that was reviewed, and a diff of 55 added lines
 * of prose is not evidence that it survived: nobody proof-reads 39 sentences against a markdown
 * table by eye. So this file compares them character for character.
 *
 * WHY IT PARSES THE BRIEF ITSELF
 * ------------------------------
 * It does NOT import `scripts/merge-photo-content.mjs`, and the duplicated parser below is
 * deliberate rather than an oversight. Importing the merge's own parser would make this file
 * assert that the merge agrees with itself — green for any consistent misreading of the table,
 * including one that dropped a column or mistook a header for a row. Two independent parsers
 * that disagree about where a cell ends is exactly the failure worth catching.
 *
 * WHAT IT CANNOT SEE
 * ------------------
 * Nothing here can check whether an alt value is TRUE OF THE PHOTOGRAPH. That is what the
 * 2026-08-23 review was for and no gate replaces it. Nor can it see whether `alt` ever reaches a
 * rendered `<img>`: no page renders a photo until Phase 5, so today this is a string in a JSON
 * file. Phase 5 must assert the attribute on rendered HTML.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST_PATH = `${REPO_ROOT}data/portfolio_images.json`;
const BRIEF_PATH = `${REPO_ROOT}.planning/phases/00-design-ideation/00-PHOTO-CONTENT.md`;

/** The pending-value markers. A marker that reached the manifest is the failure, not the fix. */
const ALT_MARKER = '[AKHIL-ALT]';
const OPT_MARKER = '[AKHIL-OPT]';
/** Matched as a PREFIX so a marker that was mangled on the way in still fails. */
const MARKER_PREFIX = '[AKHIL-';

/** The brief's table header, in order. Every data row must produce exactly this many cells. */
const COLUMNS = ['id', 'title', 'category', 'date', 'alt', 'place', 'description', 'tags'] as const;

/** Brief rule 3: a screen reader announces the role before it reads the string. */
const ROLE_PREFIXES = ['image of', 'photo of', 'picture of'];

/** The census this migration was planned against, re-derived below rather than trusted. */
const EXPECTED_RECORDS = 39;
const EXPECTED_PLACES = 16;

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

/**
 * Parse the brief's seven tables. Row-level split on `|`, then trim the markdown cell padding —
 * and nothing else. Deliberately NOT a CSV parse and NOT a whole-file regex: the alt strings are
 * real sentences full of commas, parentheses, em dashes and apostrophes, every one of which
 * breaks a naive `\|(.*?)\|` sweep, and a parser that silently loses a row would make the
 * comparison below pass on the rows that survived.
 */
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

/** An optional cell is "absent" when it is empty or still holds a pending marker. */
const isAbsent = (cell: string) => cell === '' || cell === OPT_MARKER || cell === ALT_MARKER;

/** Case- and whitespace-insensitive comparison key, matching check-photo-content.mjs's `norm`. */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const manifest: Photo[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const rows = parseBrief(readFileSync(BRIEF_PATH, 'utf8'));
const rowById = new Map(rows.map((r) => [r.id, r]));

describe('the merge read something', () => {
  /**
   * The vacuous-pass guard, and the reason it is first. Every assertion in this file is a loop
   * over one of these two collections; a parser that matched nothing, or a manifest that failed
   * to load, would make all of them iterate zero times and report green. This project has shipped
   * that failure before, so the counts are asserted before anything is compared against them.
   */
  it('parses the same number of brief rows as there are manifest records, and it is not zero', () => {
    expect(manifest.length).toBe(EXPECTED_RECORDS);
    expect(rows.length).toBe(EXPECTED_RECORDS);
    expect(rowById.size).toBe(EXPECTED_RECORDS); // no duplicate ids collapsing the map
  });

  it('has a brief row for every manifest id and a manifest record for every brief row', () => {
    const manifestIds = new Set(manifest.map((p) => p.id));
    expect(manifest.filter((p) => !rowById.has(p.id)).map((p) => p.id)).toEqual([]);
    expect(rows.filter((r) => !manifestIds.has(r.id)).map((r) => r.id)).toEqual([]);
  });
});

describe('alt survived the crossing byte for byte', () => {
  it('every record carries the brief cell for its id, character for character', () => {
    let compared = 0;
    for (const photo of manifest) {
      const row = rowById.get(photo.id);
      expect(row, `no brief row for ${photo.id}`).toBeDefined();
      // toBe on strings is === : no normalisation, no trim, no case folding. An en dash that
      // became a hyphen, or a curly apostrophe that became straight, fails here.
      expect(photo.alt, `alt mismatch on ${photo.id}`).toBe((row as BriefRow).alt);
      compared += 1;
    }
    expect(compared).toBe(EXPECTED_RECORDS);
  });

  it('has a non-empty alt on all 39 records', () => {
    const missing = manifest
      .filter((p) => typeof p.alt !== 'string' || (p.alt as string).trim() === '')
      .map((p) => p.id);
    expect(missing).toEqual([]);
    expect(manifest.filter((p) => typeof p.alt === 'string' && p.alt.trim() !== '')).toHaveLength(
      EXPECTED_RECORDS
    );
  });

  it('contains no pending marker anywhere in the manifest, in any field', () => {
    // Whole-record serialisation rather than a per-field check: a marker that landed in
    // `description`, or in a tag, is the same defect wearing a different key.
    const leaked = manifest
      .filter((p) => JSON.stringify(p).includes(MARKER_PREFIX))
      .map((p) => p.id);
    expect(leaked).toEqual([]);
  });
});

describe('place is present exactly where the brief filled it, and ABSENT elsewhere', () => {
  it('has 16 place keys, each byte-identical to its brief cell', () => {
    const expected = rows.filter((r) => !isAbsent(r.place));
    expect(expected).toHaveLength(EXPECTED_PLACES); // the brief itself still says 16
    for (const row of expected) {
      const photo = manifest.find((p) => p.id === row.id);
      expect(photo, `no manifest record for ${row.id}`).toBeDefined();
      expect(photo?.place, `place mismatch on ${row.id}`).toBe(row.place);
    }
    expect(manifest.filter((p) => 'place' in p)).toHaveLength(EXPECTED_PLACES);
  });

  it('gives the other 23 records NO place key at all — not an empty string', () => {
    // `'place' in record` and not `!record.place`. The distinction is the whole point: an empty
    // string is falsy, so a truthiness check would call `place: ""` absent and let it through —
    // and `""` renders as a real, empty element where the brief's rule is "nothing at all: no em
    // dash, no gap".
    const absentInBrief = rows.filter((r) => isAbsent(r.place)).map((r) => r.id);
    expect(absentInBrief).toHaveLength(EXPECTED_RECORDS - EXPECTED_PLACES);
    const stillKeyed = manifest.filter((p) => absentInBrief.includes(p.id) && 'place' in p);
    expect(stillKeyed.map((p) => p.id)).toEqual([]);
    const emptyString = manifest
      .filter((p) => 'place' in p && String(p.place).trim() === '')
      .map((p) => p.id);
    expect(emptyString).toEqual([]);
  });
});

describe("the brief's own rules, re-asserted after the strings left the file that guards them", () => {
  /**
   * `check-photo-content.mjs` enforces rules 2 and 3 inside 00-PHOTO-CONTENT.md. The merge is the
   * first time these strings leave that file's jurisdiction, and from here on the manifest is the
   * authority. Re-asserting rather than trusting is the point: a future hand-edit to the manifest
   * is not reachable by the brief's gate at all.
   */
  it('has no alt that merely repeats its own title', () => {
    const echoes = manifest
      .filter((p) => typeof p.alt === 'string' && norm(p.alt) === norm(p.title))
      .map((p) => p.id);
    expect(echoes).toEqual([]);
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
  });
});

// ---------------------------------------------------------------------------------------------
// D-22: the per-category order (plan 03-04, task 2)
// ---------------------------------------------------------------------------------------------

/**
 * Locate the last revision of the manifest that PREDATES this migration — the newest one in which
 * no record carries `categoryOrder` — and return its global `order` per id. That revision is, by
 * definition, the ordering the ranks were derived from.
 *
 * Deliberately NOT `HEAD~1`. Plan 03-05 is committing to this branch in the same wave, so `HEAD~1`
 * stops being this migration's parent the moment it lands, and the comparison would silently start
 * reading an already-migrated revision — comparing the shipped ranks against themselves. Searching
 * the file's own log for the last pre-migration revision is stable regardless of what else commits,
 * and it is the pattern `site-config-migration.unit.test.ts` already established here.
 *
 * Every rejection below returns `null` rather than an empty map, and exhausting the log throws.
 * A "previous revision" that resolves to nothing would make the loop over its ids run zero times
 * and the file go green having compared nothing — the failure this project has shipped repeatedly.
 */
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
  // Post-migration revisions are not evidence about what the migration derived from.
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
  /**
   * A gap or a duplicate is a reorder bug that surfaces as two photographs fighting for one slot
   * in the filtered view. `n` is taken from the group's own size rather than from a table of
   * expected counts, so publishing a photograph does not make this assertion wrong — but the
   * totals below ARE pinned, because a group that silently lost a member would otherwise be dense
   * over its survivors.
   */
  it('gives every record an integer categoryOrder', () => {
    const notInteger = manifest.filter((p) => !Number.isInteger(p.categoryOrder)).map((p) => p.id);
    expect(notInteger).toEqual([]);
    expect(manifest).toHaveLength(EXPECTED_RECORDS);
  });

  it('ranks each category exactly 1…n with no gap and no duplicate', () => {
    const byCategory = new Map<string, Photo[]>();
    for (const photo of manifest) {
      const group = byCategory.get(photo.category) ?? [];
      group.push(photo);
      byCategory.set(photo.category, group);
    }
    expect(byCategory.size).toBe(7); // the seven real categories, per OD-2
    let counted = 0;
    for (const [category, group] of byCategory) {
      const ranks = group.map((p) => p.categoryOrder as number).sort((a, b) => a - b);
      const dense = group.map((_, i) => i + 1);
      expect(ranks, `ranks in ${category} are not dense 1…n`).toEqual(dense);
      counted += group.length;
    }
    expect(counted).toBe(EXPECTED_RECORDS);
  });
});

describe('categoryOrder agrees with the global order it was derived from', () => {
  /**
   * The assertion that carries the information. Density alone is satisfied by shuffling every
   * category's ranks — the file would look perfectly valid while the filtered gallery Akhil has
   * already looked at had quietly rearranged itself.
   *
   * SCOPE, AND READ THIS BEFORE DELETING IT. This describe block is true OF THIS MIGRATION ONLY.
   * D-22 exists precisely because the two orderings are allowed to diverge, and Phase 7's
   * `/admin/photos` reorders photographs inside an active category filter — which changes
   * `categoryOrder` without changing the global `order` and WILL make this red on purpose. When
   * that happens, retire this block by name, with the reason written beside it, and leave the
   * density block above alone: density and uniqueness stay true forever. Weakening this assertion
   * in place, rather than retiring it deliberately, is how a real reorder bug would get through.
   */
  const previous = findPreMigrationOrder();

  it('found a pre-migration revision to compare against', () => {
    expect(previous.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(previous.orders.size).toBe(EXPECTED_RECORDS);
  });

  it('covers every shipped record — a photo published after the migration is out of scope', () => {
    const uncovered = manifest.filter((p) => !previous.orders.has(p.id)).map((p) => p.id);
    expect(
      uncovered,
      `these ids did not exist at ${previous.ref.slice(0, 7)}, so this migration did not derive their rank; re-scope or retire this block rather than weakening it`
    ).toEqual([]);
  });

  it('orders each category the same way the pre-migration global order did', () => {
    const byCategory = new Map<string, Photo[]>();
    for (const photo of manifest) {
      const group = byCategory.get(photo.category) ?? [];
      group.push(photo);
      byCategory.set(photo.category, group);
    }
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
    expect(compared).toBe(EXPECTED_RECORDS);
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
  it('writes focalPoint onto no record — the default lives in 03-06 schema, not on disk', () => {
    const carriers = manifest.filter((p) => 'focalPoint' in p).map((p) => p.id);
    expect(carriers).toEqual([]);
    expect(manifest).toHaveLength(EXPECTED_RECORDS); // not vacuous: there are 39 records to check
  });

  it('stores no explicit copy of the "50% 50%" default, whatever focalPoint values appear', () => {
    // DECLARED VACUOUS TODAY, deliberately. No record carries `focalPoint` at all — the assertion
    // above pins that — so this one currently filters an empty set. It is written now rather than
    // later because the moment Phase 7's focal-marker editor authors the first real value is the
    // moment it stops being vacuous, and a rule added after the data exists is a rule added after
    // the violation. When that day comes, retire the assertion above by name and keep this one.
    const defaulted = manifest.filter((p) => p.focalPoint === '50% 50%').map((p) => p.id);
    expect(defaulted).toEqual([]);
  });
});
