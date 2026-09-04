/**
 * PIPE-01 and PIPE-03 — the record producer's shape, its ranking, and what a RE-RUN does.
 * (Plan 04-05, Task 2. OD-4 resolved to option A: upsert keyed on `id`, exit 0.)
 *
 * WHAT OD-4 OPTION A ACTUALLY COMMITS TO, AND WHY THE CAVEAT IS THE HARD PART
 * --------------------------------------------------------------------------
 * "A re-run adds no duplicate manifest entry" is satisfied by three different implementations —
 * upsert, no-op, and the legacy `process.exit(1)`. Option A is the upsert: a re-dispatch after a
 * partial failure RECOMPUTES the record and replaces it in place, so repairing a job that died
 * between the R2 upload and the commit is the ordinary path rather than a manual cleanup.
 *
 * The caveat is what this file spends most of its assertions on. An upsert must NOT renumber
 * `order` or `categoryOrder`. Those two fields ARE the gallery sequence; renumbering them on a
 * retry would reorder Akhil's reviewed gallery as a side effect of an operational repair, and
 * nothing downstream would report it as anything other than a content change. So the preservation
 * is asserted directly — insert, change the bytes, upsert again, and compare the two rank fields
 * BYTE-FOR-BYTE — and it is asserted over the WHOLE manifest rather than on a sample, because a
 * renumbering bug that moved every other record while leaving the upserted one alone would pass a
 * sampled check.
 *
 * THE ANTI-VACUITY ORDER IS LOAD-BEARING, NOT STYLISTIC
 * ----------------------------------------------------
 * `expect(second.length).toBe(first.length)` is TRUE of an implementation that adds nothing at
 * all. An upsert that silently dropped its record on the floor would satisfy criterion 2's
 * sentence while proving the exact opposite of what criterion 2 is for. So every "the re-run added
 * no duplicate" assertion in this file is preceded by an assertion that THE FIRST RUN CHANGED THE
 * MANIFEST — length + 1, the id present, and the serialised bytes different. Phase 3 shipped ten
 * gates that could not fail; this is the shape of the eleventh.
 *
 * IT DOES NOT IMPORT THE PRODUCER'S OWN COMPOSERS, PER THE SUITE'S CONVENTION
 * --------------------------------------------------------------------------
 * `photo-enrichment.unit.test.ts` states the rule: *"Importing the merge's own parser would make
 * this file assert that the merge agrees with itself."* So the expected id, key, URL and hash below
 * are composed from string literals and a locally written sha256, never by calling `photoIdFor`,
 * `publishedKey`, `publishedUrl` or `contentHash`. The only shared imports are the SCHEMA (the
 * authority being tested against, not a helper) and `IMAGE_ORIGIN` — shared deliberately, because a
 * test holding its own copy of the hostname could assert an origin the data does not use and still
 * pass, which is the failure `src/lib/image-origin.ts` exists to prevent.
 *
 * NOTHING HERE WRITES TO DISK. `data/portfolio_images.json` is reviewed content and is read once,
 * read-only. The producer is pure by construction — see the header of
 * `scripts/lib/photo-record.mjs` — so there is nothing to isolate.
 *
 * WHY THE DERIVED-ASSETS FIXTURE IS LOCAL TO THIS FILE
 * ---------------------------------------------------
 * `test/pipeline/fixtures/` is owned by plan 04-04, which is in flight in the same wave. Adding a
 * file there would collide with another plan's tree. The builder below is twenty lines and is
 * restated in the two sibling suites for the same reason.
 *
 * FILENAME CONTRACT: `*.unit.test.ts` under `test/` — the three Vitest project globs are MUTUALLY
 * EXCLUSIVE and a file matching none is silently never run.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildRecord,
  nextCategoryOrder,
  nextOrder,
  serialiseManifest,
  upsertRecord,
} from '../../scripts/lib/photo-record.mjs';
import { IMAGE_ORIGIN } from '../../src/lib/image-origin';
import { type Photo, PhotoSchema, validateContentSet } from '../../src/schemas';

/* ==============================================================================================
 * The committed content set, read once, read-only.
 * ========================================================================================== */

const readText = (relative: string): string =>
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
const readJson = (relative: string): unknown => JSON.parse(readText(relative));

const MANIFEST_BYTES = readText('data/portfolio_images.json');
const COMMITTED = JSON.parse(MANIFEST_BYTES) as Photo[];
const SITE = readJson('data/site_config.json');
const HOME = readJson('data/home_config.json');
const PROJECTS = readJson('data/projects.json');
const RESUME = readJson('data/resume.json');

/** A FLOOR, not a count. The corpus reviewed on 2026-08-23 can only grow. */
const MIN_PHOTOS = 39;

/** Captured before anything runs: the purity claims cannot be made after the fact. */
const COMMITTED_SNAPSHOT = JSON.stringify(COMMITTED);

const contentSet = (photos: unknown) => ({
  photos,
  site: SITE,
  home: HOME,
  projects: PROJECTS,
  resume: RESUME,
});

/* ==============================================================================================
 * The inputs and the derived assets — written out, never imported from the producer.
 * ========================================================================================== */

const CATEGORY = 'landscape';
const SLUG = 'pipelineproof';
const ID = 'landscape-pipelineproof';
const TITLE = 'Pipeline Proof';
const ALT =
  'A narrow footbridge crosses a slow river while mist gathers under the far bank at first light.';
const DATE = '2026-08-27';
const TEMP_KEY = 'temp/pipelineproof.jpg';

/** A genuine 1x1 lossless WebP, the same bytes `fortieth-photo.ts` verified decodable. */
const THUMB_URI = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

/** The producer's own hash, restated here rather than imported. Four bytes, eight hex chars. */
const sha8 = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 8);

/** The four remote variants, in `REMOTE_URL_KEYS` order, with the suffix each one carries. */
const VARIANT_SUFFIX: ReadonlyArray<readonly [string, string]> = [
  ['original', ''],
  ['large', '-lg'],
  ['medium', '-md'],
  ['small', '-sm'],
];

const bytesFor = (version: string, urlKey: string): Uint8Array =>
  new TextEncoder().encode(`${SLUG}/${urlKey}/${version}`);

interface DerivedAssets {
  slug: string;
  variants: Record<string, { bytes: Uint8Array }>;
  thumb: string;
  dimensions: { width: number; height: number };
  exif: Record<string, string | number | null>;
}

/** What 04-07's deriver hands the producer. `version` only varies the bytes. */
function assetsFor(version: string): DerivedAssets {
  return {
    slug: SLUG,
    variants: Object.fromEntries(
      VARIANT_SUFFIX.map(([urlKey]) => [urlKey, { bytes: bytesFor(version, urlKey) }])
    ),
    thumb: THUMB_URI,
    dimensions: { width: version === 'v1' ? 4608 : 3000, height: version === 'v1' ? 3072 : 2000 },
    exif: {
      camera: 'NIKON CORPORATION NIKON D5300',
      lens: '18.0-55.0 mm f/3.5-5.6',
      aperture: version === 'v1' ? 'f/8' : 'f/11',
      shutter: '1/250',
      iso: version === 'v1' ? 100 : 200,
      focalLength: '35mm',
    },
  };
}

const INPUTS = {
  temp_key: TEMP_KEY,
  category: CATEGORY,
  title: TITLE,
  alt: ALT,
};

/** Independently composed: origin + literal path + the locally computed hash. */
const expectedUrl = (version: string, urlKey: string, suffix: string): string =>
  `${IMAGE_ORIGIN}/photos/${CATEGORY}/${SLUG}-${sha8(bytesFor(version, urlKey))}${suffix}.webp`;

const build = (version: string, manifest: readonly Photo[], extra: object = {}): Photo =>
  buildRecord({
    inputs: { ...INPUTS, ...extra },
    assets: assetsFor(version),
    date: DATE,
    manifest,
  }) as Photo;

const find = (manifest: readonly Photo[], id: string): Photo => {
  const found = manifest.find((photo) => photo.id === id);
  if (found === undefined) throw new Error(`no record with id ${id}`);
  return found;
};

/* ==============================================================================================
 * 0. The corpus loaded. Everything below iterates it; a manifest that failed to load would make
 *    every loop in this file iterate nothing.
 * ========================================================================================== */

describe('the committed manifest is what this file reasons about', () => {
  it('loaded, and is at or above the reviewed floor', () => {
    expect(Array.isArray(COMMITTED)).toBe(true);
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    expect(COMMITTED.some((photo) => photo.id === ID)).toBe(false);
  });
});

/* ==============================================================================================
 * 1. RANKING.  Derived from the manifest in hand, never from a cached read (pitfall P-5).
 * ========================================================================================== */

describe('nextOrder and nextCategoryOrder', () => {
  it('nextOrder returns max(order) + 1 over the committed manifest', () => {
    const max = COMMITTED.reduce((best, photo) => Math.max(best, photo.order), 0);
    expect(max).toBeGreaterThan(0);
    expect(nextOrder(COMMITTED)).toBe(max + 1);
  });

  it('nextOrder over an empty manifest returns 1 — not NaN, not -Infinity + 1', () => {
    const result = nextOrder([]);
    expect(result).toBe(1);
    expect(Number.isFinite(result)).toBe(true);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('nextCategoryOrder returns max within that category + 1', () => {
    for (const category of new Set(COMMITTED.map((photo) => photo.category))) {
      const group = COMMITTED.filter((photo) => photo.category === category);
      expect(group.length).toBeGreaterThan(0);
      const max = group.reduce((best, photo) => Math.max(best, photo.categoryOrder), 0);
      expect(nextCategoryOrder(COMMITTED, category)).toBe(max + 1);
    }
  });

  it('nextCategoryOrder returns 1 for a category with no records', () => {
    expect(COMMITTED.some((photo) => photo.category === 'noneofthese')).toBe(false);
    expect(nextCategoryOrder(COMMITTED, 'noneofthese')).toBe(1);
  });

  it('is derived from the argument, so a grown manifest gives a grown rank', () => {
    // P-5, the live version of this mistake: two runs that both read `maxOrder = 39` and both
    // wrote `order: 40`. The only defence is that the rank is a function of the array in hand.
    const first = nextOrder(COMMITTED);
    const grown = [...COMMITTED, { ...COMMITTED[0], id: 'x', order: first }] as Photo[];
    expect(nextOrder(grown)).toBe(first + 1);
  });

  it('refuses a manifest whose ranks are not positive integers rather than inventing one', () => {
    expect(() => nextOrder([{ ...COMMITTED[0], order: 'twelve' } as unknown as Photo])).toThrow(
      /order/
    );
  });
});

/* ==============================================================================================
 * 2. RECORD SHAPE.  The four-class porting delta the research measured, closed field by field.
 * ========================================================================================== */

describe('buildRecord produces a record the Phase 3 schema accepts', () => {
  const record = build('v1', COMMITTED);

  it('passes PhotoSchema.safeParse, and names the field if it ever stops', () => {
    const result = PhotoSchema.safeParse(record);
    // The issues, not a bare boolean: a regression must say which field, or the next person
    // spends the afternoon bisecting a `false`.
    expect(result.success ? null : JSON.stringify(result.error?.issues)).toBeNull();
    expect(result.success).toBe(true);
  });

  it('id is category + "-" + slug and is a lowercase slug', () => {
    expect(record.id).toBe(ID);
    expect(/^[a-z0-9-]+$/.test(record.id)).toBe(true);
  });

  it('carries the keys the committed records carry, in the committed order', () => {
    expect(Object.keys(record)).toEqual([
      'id',
      'title',
      'alt',
      'category',
      'date',
      'exif',
      'urls',
      'order',
      'categoryOrder',
      'dimensions',
    ]);
    // And the same order the reviewed corpus already uses, so a pipeline write is a one-record
    // diff rather than a reshuffle of an existing one.
    expect(Object.keys(record)).toEqual(Object.keys(COMMITTED[0]));
  });

  it('urls has exactly five keys; the four remote ones are on the canonical ORIGIN', () => {
    expect(Object.keys(record.urls).sort()).toEqual([
      'large',
      'medium',
      'original',
      'small',
      'thumb',
    ]);
    for (const [urlKey, suffix] of VARIANT_SUFFIX) {
      const value = (record.urls as unknown as Record<string, string>)[urlKey];
      // Origin EQUALITY, not startsWith: `https://HOST.evil.test/` and `https://HOST@evil.test/`
      // both defeat a prefix comparison.
      expect(new URL(value).origin).toBe(IMAGE_ORIGIN);
      expect(value).toBe(expectedUrl('v1', urlKey, suffix));
    }
    expect(record.urls.thumb.startsWith('data:image/webp;base64,')).toBe(true);
    expect(record.urls.thumb).toBe(THUMB_URI);
  });

  it('exif has exactly six keys, all present, each string | number | null', () => {
    expect(Object.keys(record.exif).sort()).toEqual([
      'aperture',
      'camera',
      'focalLength',
      'iso',
      'lens',
      'shutter',
    ]);
    for (const value of Object.values(record.exif)) {
      expect(['string', 'number', 'object']).toContain(typeof value);
      if (typeof value === 'object') expect(value).toBeNull();
    }
  });

  it('a source with no EXIF at all still yields a complete six-key all-null block', () => {
    const assets = assetsFor('v1');
    assets.exif = {
      camera: null,
      lens: null,
      aperture: null,
      shutter: null,
      iso: null,
      focalLength: null,
    };
    const bare = buildRecord({
      inputs: INPUTS,
      assets,
      date: DATE,
      manifest: COMMITTED,
    }) as Photo;
    expect(Object.keys(bare.exif).length).toBe(6);
    expect(Object.values(bare.exif).every((value) => value === null)).toBe(true);
    expect(PhotoSchema.safeParse(bare).success).toBe(true);
  });

  it('tags is ABSENT, not empty — OD-3', () => {
    expect('tags' in record).toBe(false);
    // And the producer refuses to be handed one, rather than dropping it silently.
    expect(() => build('v1', COMMITTED, { tags: [] })).toThrow(/OD-3|tags/);
  });

  it('focalPoint is absent, and PhotoSchema.parse does not materialise it', () => {
    expect('focalPoint' in record).toBe(false);
    const parsed = PhotoSchema.parse(record);
    expect('focalPoint' in parsed).toBe(false);
  });

  it('place is omitted when not supplied and present when it is', () => {
    expect('place' in record).toBe(false);
    const withPlace = build('v1', COMMITTED, { place: 'Coorg, Karnataka' }) as Photo;
    expect(withPlace.place).toBe('Coorg, Karnataka');
    // Placed where the committed records place it: immediately after `alt`.
    expect(Object.keys(withPlace).slice(0, 4)).toEqual(['id', 'title', 'alt', 'place']);
    expect(PhotoSchema.safeParse(withPlace).success).toBe(true);
  });

  it('dimensions is the SOURCE size it was handed (OD-11), not a variant size', () => {
    expect(record.dimensions).toEqual({ width: 4608, height: 3072 });
  });

  it('date is the caller argument — OD-10 is 04-07 Task 3, and is not decided here', () => {
    expect(record.date).toBe(DATE);
    expect(() => build('v1', COMMITTED)).not.toThrow();
    expect(() =>
      buildRecord({
        inputs: INPUTS,
        assets: assetsFor('v1'),
        date: '27-08-2026',
        manifest: COMMITTED,
      })
    ).toThrow(/date/);
    // Cast rather than omitted: `date` is a REQUIRED argument at the type level too, and the
    // point of this assertion is that the runtime refuses it rather than defaulting — which is
    // what would silently settle OD-10.
    const withoutDate = {
      inputs: INPUTS,
      assets: assetsFor('v1'),
      manifest: COMMITTED,
    } as unknown as Parameters<typeof buildRecord>[0];
    expect(() => buildRecord(withoutDate)).toThrow(/date/);
  });

  it('refuses placeholder-shaped alt before anything else happens (OD-2b)', () => {
    expect(() => build('v1', COMMITTED, { alt: 'TODO' })).toThrow(/alt/);
    expect(() => build('v1', COMMITTED, { alt: TITLE })).toThrow(/alt/);
  });

  it('refuses a temp_key that is not a staging key (T-04-04)', () => {
    expect(() => build('v1', COMMITTED, { temp_key: 'temp/../secrets' })).toThrow(/staging key/);
  });

  it('ranks the new record from the manifest it was handed', () => {
    const maxOrder = COMMITTED.reduce((best, photo) => Math.max(best, photo.order), 0);
    const maxCategory = COMMITTED.filter((photo) => photo.category === CATEGORY).reduce(
      (best, photo) => Math.max(best, photo.categoryOrder),
      0
    );
    expect(record.order).toBe(maxOrder + 1);
    expect(record.categoryOrder).toBe(maxCategory + 1);
  });
});

/* ==============================================================================================
 * 3. THE UPSERT.  OD-4 option A, and its caveat.
 * ========================================================================================== */

describe('upsertRecord — a re-run repairs in place and never renumbers', () => {
  it('INSERTING A NEW ID CHANGES THE MANIFEST — asserted first, so nothing below is vacuous', () => {
    const record = build('v1', COMMITTED);
    const after = upsertRecord(COMMITTED, record) as Photo[];

    expect(after.length).toBe(COMMITTED.length + 1);
    expect(after.some((photo) => photo.id === ID)).toBe(true);
    // Bytes, not just a length: an implementation that appended `undefined` would satisfy the
    // length check.
    expect(serialiseManifest(after)).not.toBe(serialiseManifest(COMMITTED));
    expect(find(after, ID).urls.original).toBe(expectedUrl('v1', 'original', ''));
  });

  it('the second run leaves manifest.length unchanged — criterion 2, after the above', () => {
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    expect(first.length).toBe(COMMITTED.length + 1); // anti-vacuity, restated in scope

    const second = upsertRecord(first, build('v2', first)) as Photo[];
    expect(second.length).toBe(first.length);
    expect(second.filter((photo) => photo.id === ID).length).toBe(1);
  });

  it('the second run preserves order and categoryOrder BYTE-FOR-BYTE', () => {
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const inserted = find(first, ID);
    const ranksBefore = JSON.stringify({
      order: inserted.order,
      categoryOrder: inserted.categoryOrder,
    });

    const second = upsertRecord(first, build('v2', first)) as Photo[];
    const replaced = find(second, ID);
    const ranksAfter = JSON.stringify({
      order: replaced.order,
      categoryOrder: replaced.categoryOrder,
    });

    expect(ranksAfter).toBe(ranksBefore);
    expect(replaced.order).toBe(inserted.order);
    expect(replaced.categoryOrder).toBe(inserted.categoryOrder);
  });

  it('preserves them even when the maxima HAVE moved — the renumbering trap', () => {
    // Between the two runs a different photograph lands. A naive "recompute the rank" upsert
    // would move the record to the end of the gallery on a retry; the gallery would silently
    // reorder as a side effect of an operational repair.
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const inserted = find(first, ID);

    const interloper = {
      ...inserted,
      id: 'landscape-interloper',
      order: inserted.order + 1,
      categoryOrder: inserted.categoryOrder + 1,
    };
    const between = [...first, interloper];
    expect(nextOrder(between)).toBe(inserted.order + 2);

    const third = upsertRecord(between, build('v2', between)) as Photo[];
    expect(third.length).toBe(between.length);
    expect(find(third, ID).order).toBe(inserted.order);
    expect(find(third, ID).categoryOrder).toBe(inserted.categoryOrder);
    expect(find(third, 'landscape-interloper').order).toBe(interloper.order);
  });

  it('the second run DOES update the urls, the hash, the dimensions and the exif', () => {
    // Otherwise the upsert is a no-op wearing a hat, and a retry after a partial failure cannot
    // repair the record it exists to repair.
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const before = find(first, ID);
    const second = upsertRecord(first, build('v2', first)) as Photo[];
    const after = find(second, ID);

    for (const [urlKey, suffix] of VARIANT_SUFFIX) {
      const key = urlKey as keyof typeof after.urls;
      expect(after.urls[key]).not.toBe(before.urls[key]);
      expect(after.urls[key]).toBe(expectedUrl('v2', urlKey, suffix));
    }
    expect(after.dimensions).toEqual({ width: 3000, height: 2000 });
    expect(after.dimensions).not.toEqual(before.dimensions);
    expect(after.exif.iso).toBe(200);
    expect(after.exif.aperture).toBe('f/11');
    expect(PhotoSchema.safeParse(after).success).toBe(true);
  });

  it('replaces IN PLACE — the record keeps its index, so a retry is a one-record diff', () => {
    // FOUND BY A WALK-THROUGH ATTEMPT, 2026-08-27. An implementation that preserved both ranks
    // and then returned `[...manifest.filter(notThisId), preserved]` passed all 51 assertions:
    // the rank VALUES were right and the record happened to be last anyway. It is not always
    // last, and a repair that moved a record through a 39-record file would produce a diff on
    // reviewed content out of all proportion to what changed. So the position is asserted, with
    // a record that is deliberately NOT at the end.
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const inserted = find(first, ID);
    const interloper = {
      ...inserted,
      id: 'landscape-interloper',
      order: inserted.order + 1,
      categoryOrder: inserted.categoryOrder + 1,
    };
    const between = [...first, interloper];
    const indexBefore = between.findIndex((photo) => photo.id === ID);
    expect(indexBefore).toBe(between.length - 2);

    const after = upsertRecord(between, build('v2', between)) as Photo[];
    expect(after.findIndex((photo) => photo.id === ID)).toBe(indexBefore);
    // And nothing else moved either.
    expect(after.map((photo) => photo.id).join('|')).toBe(
      between.map((photo) => photo.id).join('|')
    );
  });

  it('carries EVERY non-rank field from the rebuilt record — including place', () => {
    // ALSO FOUND BY A WALK-THROUGH ATTEMPT. An upsert that silently dropped `place` on the repair
    // path passed all 51 assertions, because no test built a record with a place and then
    // repaired it. `place` is reviewed content; a retry losing it would be a silent edit.
    //
    // Asserted as a class rather than field by field: everything except the two ranks must be
    // byte-identical to what buildRecord produced, so a field added later is covered without this
    // test being touched.
    const first = upsertRecord(
      COMMITTED,
      build('v1', COMMITTED, { place: 'Coorg, Karnataka' })
    ) as Photo[];
    const rebuilt = build('v2', first, { place: 'Chikmagalur, Karnataka' });
    const second = upsertRecord(first, rebuilt) as Photo[];
    const after = find(second, ID);

    expect(find(first, ID).place).toBe('Coorg, Karnataka');
    expect(after.place).toBe('Chikmagalur, Karnataka');

    const withoutRanks = (photo: Photo): string => {
      const { order: _order, categoryOrder: _categoryOrder, ...rest } = photo;
      return JSON.stringify(rest);
    };
    expect(withoutRanks(after)).toBe(withoutRanks(rebuilt));
    // ...and the ranks themselves are the FIRST run's, not the rebuild's.
    expect(after.order).toBe(find(first, ID).order);
    expect(after.order).not.toBe(rebuilt.order);
  });

  it('never mutates its input array or any record object in it', () => {
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const firstSnapshot = JSON.stringify(first);

    upsertRecord(first, build('v2', first));

    expect(JSON.stringify(first)).toBe(firstSnapshot);
    expect(first.length).toBe(COMMITTED.length + 1);
    // And the committed array this whole file reads is still what it was at import time.
    expect(JSON.stringify(COMMITTED)).toBe(COMMITTED_SNAPSHOT);
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
  });

  it('leaves EVERY other record’s order and categoryOrder untouched — whole manifest, not a sample', () => {
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const second = upsertRecord(first, build('v2', first)) as Photo[];

    const ranksOf = (manifest: readonly Photo[]) =>
      manifest
        .filter((photo) => photo.id !== ID)
        .map((photo) => `${photo.id}:${photo.order}:${photo.categoryOrder}`)
        .join('|');

    // A single string comparison over all 39, so a partial renumbering cannot hide in an
    // averaged or sampled check.
    expect(ranksOf(second)).toBe(ranksOf(first));
    expect(ranksOf(first)).toBe(ranksOf(COMMITTED));
    expect(ranksOf(first).split('|').length).toBe(COMMITTED.length);
  });

  it('a re-dispatch under a DIFFERENT category is an insert, not a repair', () => {
    // A consequence of OD-4's key, recorded rather than glossed. `id` is `category + "-" + slug`,
    // so changing the category changes the id, and the upsert has nothing to match. The original
    // record survives untouched — including its ranks — and the wrongly-filed one stays until
    // somebody deletes it. Deleting records is not this pipeline's job.
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const inserted = find(first, ID);

    const moved = build('v2', first, { category: 'architecture' }) as Photo;
    expect(moved.id).toBe('architecture-pipelineproof');

    const second = upsertRecord(first, moved) as Photo[];
    expect(second.length).toBe(first.length + 1);
    expect(find(second, ID).order).toBe(inserted.order);
    expect(find(second, ID).categoryOrder).toBe(inserted.categoryOrder);
    expect(find(second, 'architecture-pipelineproof').categoryOrder).toBe(
      COMMITTED.filter((photo) => photo.category === 'architecture').reduce(
        (best, photo) => Math.max(best, photo.categoryOrder),
        0
      ) + 1
    );
  });

  it('refuses a manifest that disagrees with itself about a shared id’s category', () => {
    // Impossible under the id invariant, and worth refusing rather than resolving: a preserved
    // categoryOrder ranks WITHIN a group, so carrying one across a group change would put a rank
    // in the wrong gallery. RI-6 would eventually report the collision; this names the cause.
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const corrupted = first.map((photo) =>
      photo.id === ID ? { ...photo, category: 'architecture' } : photo
    );
    expect(() => upsertRecord(corrupted, build('v2', first))).toThrow(/disagrees with itself/);
  });

  it('refuses a record that is not rank-shaped rather than writing it', () => {
    expect(() =>
      upsertRecord(COMMITTED, { id: ID, category: CATEGORY } as unknown as Photo)
    ).toThrow(/order/);
    expect(() =>
      upsertRecord(COMMITTED, { id: ID, category: CATEGORY, order: 0 } as unknown as Photo)
    ).toThrow(/order/);
    expect(() =>
      upsertRecord(COMMITTED, { id: ID, category: CATEGORY, order: 40 } as unknown as Photo)
    ).toThrow(/categoryOrder/);
    expect(() => upsertRecord(COMMITTED, { id: ID } as unknown as Photo)).toThrow(/category/);
    expect(() => upsertRecord(COMMITTED, null as unknown as Photo)).toThrow();
  });
});

/* ==============================================================================================
 * 4. THE RESULT IS A VALID CONTENT SET.  The six RI rules, run for real on the grown array.
 *    `astro sync` runs the same rules end-to-end in `record-valid.node.test.ts`; this is the
 *    cheap in-process half.
 * ========================================================================================== */

describe('the grown manifest satisfies all six referential-integrity rules', () => {
  it('one run and two runs both produce a clean content set', () => {
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const second = upsertRecord(first, build('v2', first)) as Photo[];

    for (const [label, manifest] of [
      ['first run', first],
      ['second run', second],
    ] as const) {
      const report = validateContentSet(contentSet(manifest));
      expect(report.ok ? null : `${label}: ${JSON.stringify(report.violations)}`).toBeNull();
      // Anti-vacuity on the report itself: a rule that did not run did not pass.
      expect(report.checked.photos).toBe(manifest.length);
      expect(report.checked.rulesRun).toEqual(['RI-1', 'RI-2', 'RI-3', 'RI-4', 'RI-5', 'RI-6']);
      expect(report.checked.rulesSkipped).toEqual([]);
    }
  });

  it('a duplicate append — the thing the upsert prevents — is caught by RI-5 and RI-6', () => {
    // The safety net, measured. It fires AFTER the file would have been written, which is why
    // idempotence is decided in the producer and not left to the gate.
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const duplicated = [...first, find(first, ID)];
    const report = validateContentSet(contentSet(duplicated));

    expect(report.ok).toBe(false);
    const rules = report.violations.map((violation) => violation.rule);
    expect(rules).toContain('RI-5');
    expect(rules).toContain('RI-6');
    expect(report.violations.map((violation) => violation.detail).join('\n')).toContain(ID);
  });
});

/* ==============================================================================================
 * 5. SERIALISATION.  The trailing-newline contract 03-01 established and the legacy writer broke.
 * ========================================================================================== */

describe('serialiseManifest', () => {
  it('ends with exactly one newline', () => {
    const text = serialiseManifest(COMMITTED);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.slice(-2)).toBe(']\n');
  });

  it('round-trips the COMMITTED manifest byte-for-byte', () => {
    // The regression guard against the legacy writer's `JSON.stringify(merged, null, 2)` with no
    // trailing newline, which would revert 03-01's fix and produce a spurious one-line diff on the
    // closing `]` every time the pipeline ran.
    expect(serialiseManifest(JSON.parse(MANIFEST_BYTES))).toBe(MANIFEST_BYTES);
    expect(MANIFEST_BYTES.length).toBeGreaterThan(0);
  });

  it('what it writes parses back to what it was given', () => {
    const grown = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    expect(JSON.parse(serialiseManifest(grown))).toEqual(grown);
  });

  it('refuses a non-array rather than writing "null\\n"', () => {
    expect(() => serialiseManifest(null as unknown as Photo[])).toThrow();
  });
});
