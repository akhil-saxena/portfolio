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
