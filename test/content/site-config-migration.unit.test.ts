/**
 * The losslessness proof for the `site_config.categoryColumns` → `categories[]` migration (D-25,
 * plan 03-03).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * The retired map was eight lines long. A transposed pair of column counts, or a dropped key, is
 * invisible in a diff that small — so "I read the diff" is not evidence. This file reconstructs the
 * OLD map's content out of the NEW records and compares it, key by key, against the last committed
 * revision that actually contained `categoryColumns`. Every old key must land somewhere and be
 * named; nothing is allowed to be "the remaining one".
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 * ---------------------------------------
 * It never derives an expected `label` by Title-casing an `id`. That would make it green against a
 * migration that dropped `label` entirely and let a schema default it — reintroducing, inside its
 * own regression test, the exact render-time transform D-25 exists to delete. Instead `label` is
 * checked as a VERBATIM key of the old map: the migration's claim is that the label is the old key
 * character-for-character, so a label that silently changes case stops being a key and fails.
 *
 * The direction that matters just as much: `id` must be the lowercase form and `photo.category`
 * must resolve against it, with no case transform between the two files.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The single key in the retired map that was never a category (OD-2, resolved Option A). It is
 * named here, not filtered out silently: the point of naming it is that a NINTH unexpected key
 * later fails this file instead of being quietly absorbed as "the leftover".
 */
const UNFILTERED_KEY = 'All';

/** Where the unfiltered column count went, per the OD-2 verdict. */
const UNFILTERED_DESTINATION = 'defaultColumns';

interface CategoryRecord {
  id: string;
  label: string;
  columns: number;
}

interface SiteConfig {
  categories: CategoryRecord[];
  defaultColumns: number;
  categoryColumns?: unknown;
}

type LegacyMap = Record<string, number>;

/**
 * Parse a candidate revision of `site_config.json` into the retired map, or return `null` if that
 * revision cannot serve as evidence.
 *
 * Split out and separately exercised (see "the comparison cannot pass vacuously" below) because a
 * comparison against nothing is the failure mode this project has shipped repeatedly: a proof
 * whose "previous revision" resolves to an empty string,
 * or to a revision that no longer holds `categoryColumns`, iterates zero keys and passes green
 * while proving nothing. Every one of those inputs must return `null` here, and a `null` from
 * every candidate revision must throw rather than yield an empty map.
 */
function parseLegacyMap(raw: string | null | undefined): LegacyMap | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const map = (parsed as { categoryColumns?: unknown }).categoryColumns;
  if (typeof map !== 'object' || map === null || Array.isArray(map)) return null;

  const entries = Object.entries(map);
  // An empty map is the vacuous pass in its purest form: every `for (const key of keys)` assertion
  // below would run zero times and the file would go green.
  if (entries.length === 0) return null;
  if (!entries.every(([, value]) => Number.isInteger(value) && (value as number) > 0)) return null;

  return map as LegacyMap;
}

/**
 * Walk the file's own history newest-first and return the most recent revision that still holds a
 * usable `categoryColumns` map.
 *
 * Deliberately NOT `HEAD~1`. Two other plans (03-01, 03-02) are committing to this branch in the
 * same wave, so `HEAD~1` stops being this migration's parent as soon as either of them lands, and
 * the comparison would silently start reading the already-migrated file — comparing the new shape
 * against itself. Searching the file's own log for the last revision containing the retired map is
 * stable regardless of what else commits.
 */
function findLegacyRevision(): { ref: string; map: LegacyMap } {
  const refs = execFileSync('git', ['log', '--format=%H', '--', 'data/site_config.json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const ref of refs) {
    let raw: string;
    try {
      raw = execFileSync('git', ['show', `${ref}:data/site_config.json`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
    } catch {
      continue; // the file did not exist at this revision
    }
    const map = parseLegacyMap(raw);
    if (map) return { ref, map };
  }

  throw new Error(
    'No revision of data/site_config.json containing a usable `categoryColumns` map was found. ' +
      'The losslessness proof has nothing to compare against and MUST NOT pass vacuously — ' +
      `searched ${refs.length} revision(s).`
  );
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as T;
}

const legacy = findLegacyRevision();
const config = readJson<SiteConfig>('../../data/site_config.json');
const photos = readJson<Array<{ id: string; category: string }>>(
  '../../data/portfolio_images.json'
);

const legacyKeys = Object.keys(legacy.map);
const records = Array.isArray(config.categories) ? config.categories : [];
const ids = records.map((record) => record.id);

describe('the evidence this proof rests on', () => {
  it(`resolves a previous revision that actually holds the retired map (${legacy.ref.slice(0, 7)})`, () => {
    expect(legacy.ref).toMatch(/^[0-9a-f]{40}$/);
    // Asserted as a hard number, not "> 0": an accidentally-truncated evidence revision must fail
    // rather than shrink the proof.
    expect(legacyKeys).toHaveLength(8);
    expect(legacyKeys).toContain(UNFILTERED_KEY);
  });

  it('reads all 39 photo records', () => {
    expect(photos).toHaveLength(39);
  });
});

describe('the comparison cannot pass vacuously', () => {
  // These are the inputs that have historically turned a losslessness proof into a no-op. Each one
  // must be rejected at the source rather than iterated over zero times.
  it.each([
    ['an empty previous revision', ''],
    ['a whitespace-only previous revision', '  \n '],
    ['a missing previous revision', null],
    ['a previous revision that is not JSON', 'not json'],
    ['a previous revision with no categoryColumns key', '{"categories":[]}'],
    ['a previous revision whose map is empty', '{"categoryColumns":{}}'],
    ['a previous revision whose map is an array', '{"categoryColumns":[]}'],
    ['a previous revision with a non-integer column count', '{"categoryColumns":{"All":"3"}}'],
  ])('rejects %s', (_label, raw) => {
    expect(parseLegacyMap(raw as string | null)).toBeNull();
  });
});

describe('the retired categoryColumns map is gone', () => {
  it('no longer appears in site_config.json', () => {
    expect(config.categoryColumns).toBeUndefined();
  });

  it('holds exactly 7 category records (OD-2 Option A: "all" is not a category)', () => {
    // Asserted as an exact count so a test iterating an empty or truncated array cannot pass.
    expect(records).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });
});

/**
 * Iteration is driven by the OLD keys, not the new records. Driving it from the new records would
 * make a deleted category disappear along with its own test case — the deletion would remove the
 * assertion that was supposed to catch it.
 */
describe.each(legacyKeys)('legacy key "%s" is accounted for', (key) => {
  const columns = legacy.map[key];

  if (key === UNFILTERED_KEY) {
    it(`is NOT a category record — its count survives as ${UNFILTERED_DESTINATION}`, () => {
      expect(config[UNFILTERED_DESTINATION]).toBe(columns);
      // The whole reason "All" was not migrated: 03-06's referential-integrity rule must have
      // exactly seven legal values and no exclusion list.
      expect(ids).not.toContain(key.toLowerCase());
      expect(records.map((record) => record.label)).not.toContain(key);
    });
    return;
  }

  it('maps to exactly one record, matched on the VERBATIM legacy key as its label', () => {
    // `label` is compared character-for-character against the old key. It is NOT re-derived from
    // the id — a `label` that silently lower-cases to "architecture" is not a key of the old map
    // and fails here.
    const matches = records.filter((record) => record.label === key);
    expect(matches).toHaveLength(1);
  });

  it('carries its column count across unchanged', () => {
    const record = records.find((r) => r.label === key);
    expect(record?.columns).toBe(columns);
  });

  it('became the lowercase id, with no other transform', () => {
    const record = records.find((r) => r.label === key);
    expect(record?.id).toBe(key.toLowerCase());
    expect(record?.id).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('nothing was invented on the way through', () => {
  it('every record traces back to a legacy key', () => {
    expect(records.map((record) => record.label).sort()).toEqual(
      legacyKeys.filter((key) => key !== UNFILTERED_KEY).sort()
    );
  });

  it('every record has exactly the keys id, label, columns', () => {
    for (const record of records) {
      expect(Object.keys(record).sort()).toEqual(['columns', 'id', 'label']);
      expect(Number.isInteger(record.columns)).toBe(true);
      expect(record.columns).toBeGreaterThan(0);
    }
  });

  it('sits in alphabetical id order (OD-2b — a decision, not an accident)', () => {
    expect(ids).toEqual([...ids].sort());
  });
});

describe('the id set is exactly what a photo.category may hold', () => {
  it('every photo category resolves to an id — no case transform between the two files', () => {
    const unresolved = photos
      .filter((photo) => !ids.includes(photo.category))
      .map((photo) => `${photo.id} → "${photo.category}"`);
    expect(unresolved).toEqual([]);
  });

  it.each(ids)('id "%s" is referenced by at least one photo', (id) => {
    // The direction people forget. An id nothing references ships as an empty filter tab.
    expect(photos.filter((photo) => photo.category === id).length).toBeGreaterThan(0);
  });
});
