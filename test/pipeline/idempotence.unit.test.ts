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

const readText = (relative: string): string =>
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
const readJson = (relative: string): unknown => JSON.parse(readText(relative));

const MANIFEST_BYTES = readText('data/portfolio_images.json');
const COMMITTED = JSON.parse(MANIFEST_BYTES) as Photo[];
const SITE = readJson('data/site_config.json');
const HOME = readJson('data/home_config.json');
const PROJECTS = readJson('data/projects.json');
const RESUME = readJson('data/resume.json');

const MIN_PHOTOS = 39;

const COMMITTED_SNAPSHOT = JSON.stringify(COMMITTED);

const contentSet = (photos: unknown) => ({
  photos,
  site: SITE,
  home: HOME,
  projects: PROJECTS,
  resume: RESUME,
});

const CATEGORY = 'landscape';
const SLUG = 'pipelineproof';
const ID = 'landscape-pipelineproof';
const TITLE = 'Pipeline Proof';
const ALT =
  'A narrow footbridge crosses a slow river while mist gathers under the far bank at first light.';
const DATE = '2026-08-27';
const TEMP_KEY = 'temp/pipelineproof.jpg';

const THUMB_URI = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

const sha8 = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 8);

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

describe('the committed manifest is what this file reasons about', () => {
  it('loaded, and is at or above the reviewed floor', () => {
    expect(Array.isArray(COMMITTED)).toBe(true);
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    expect(COMMITTED.some((photo) => photo.id === ID)).toBe(false);
  });
});

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

describe('buildRecord produces a record the Phase 3 schema accepts', () => {
  const record = build('v1', COMMITTED);

  it('passes PhotoSchema.safeParse, and names the field if it ever stops', () => {
    const result = PhotoSchema.safeParse(record);
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

describe('upsertRecord — a re-run repairs in place and never renumbers', () => {
  it('INSERTING A NEW ID CHANGES THE MANIFEST — asserted first, so nothing below is vacuous', () => {
    const record = build('v1', COMMITTED);
    const after = upsertRecord(COMMITTED, record) as Photo[];

    expect(after.length).toBe(COMMITTED.length + 1);
    expect(after.some((photo) => photo.id === ID)).toBe(true);
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
    expect(after.map((photo) => photo.id).join('|')).toBe(
      between.map((photo) => photo.id).join('|')
    );
  });

  it('carries EVERY non-rank field from the rebuilt record — including place', () => {
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
    expect(after.order).toBe(find(first, ID).order);
    expect(after.order).not.toBe(rebuilt.order);
  });

  it('never mutates its input array or any record object in it', () => {
    const first = upsertRecord(COMMITTED, build('v1', COMMITTED)) as Photo[];
    const firstSnapshot = JSON.stringify(first);

    upsertRecord(first, build('v2', first));

    expect(JSON.stringify(first)).toBe(firstSnapshot);
    expect(first.length).toBe(COMMITTED.length + 1);
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

    expect(ranksOf(second)).toBe(ranksOf(first));
    expect(ranksOf(first)).toBe(ranksOf(COMMITTED));
    expect(ranksOf(first).split('|').length).toBe(COMMITTED.length);
  });

  it('a re-dispatch under a DIFFERENT category is an insert, not a repair', () => {
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
      expect(report.checked.photos).toBe(manifest.length);
      expect(report.checked.rulesRun).toEqual(['RI-1', 'RI-2', 'RI-3', 'RI-4', 'RI-5', 'RI-6']);
      expect(report.checked.rulesSkipped).toEqual([]);
    }
  });

  it('a duplicate append — the thing the upsert prevents — is caught by RI-5 and RI-6', () => {
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

describe('serialiseManifest', () => {
  it('ends with exactly one newline', () => {
    const text = serialiseManifest(COMMITTED);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.slice(-2)).toBe(']\n');
  });

  it('round-trips the COMMITTED manifest byte-for-byte', () => {
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
