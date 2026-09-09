import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  type Photo,
  PhotoManifestSchema,
  PhotoSchema,
  validateContentSet,
} from '../../src/schemas';
import {
  appendFortieth,
  FIXTURE_CATEGORY,
  FIXTURE_THUMB,
  FORTIETH_PHOTO,
} from './fixtures/fortieth-photo';

const read = (relative: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8'));

const COMMITTED = read('data/portfolio_images.json') as Photo[];
const SITE = read('data/site_config.json');
const HOME = read('data/home_config.json');
const PROJECTS = read('data/projects.json');
const RESUME = read('data/resume.json');

const MIN_PHOTOS = 39;

const COMMITTED_BEFORE_JSON = JSON.stringify(COMMITTED);
const COMMITTED_BEFORE_LENGTH = COMMITTED.length;

const GROWN = appendFortieth(COMMITTED);

const contentSet = (photos: unknown) => ({
  photos,
  site: SITE,
  home: HOME,
  projects: PROJECTS,
  resume: RESUME,
});

describe('the 40th record is a real record', () => {
  it('satisfies PhotoSchema on its own, including all four alt rules', () => {
    const result = PhotoSchema.safeParse(FORTIETH_PHOTO);
    expect(result.success ? null : JSON.stringify(result.error?.issues)).toBeNull();
  });

  it('carries a real WebP data URI, a complete six-key exif block, and no tags', () => {
    expect(FORTIETH_PHOTO.urls.thumb).toBe(FIXTURE_THUMB);
    expect(FIXTURE_THUMB.startsWith('data:image/webp;base64,')).toBe(true);
    expect(Object.keys(FORTIETH_PHOTO.exif).sort()).toEqual([
      'aperture',
      'camera',
      'focalLength',
      'iso',
      'lens',
      'shutter',
    ]);
    expect('tags' in FORTIETH_PHOTO).toBe(false);
    expect(FORTIETH_PHOTO.category).toBe(FIXTURE_CATEGORY);
  });

  it('is a record the committed manifest does not already contain', () => {
    expect(COMMITTED.map((p) => p.id)).not.toContain(FORTIETH_PHOTO.id);
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS); // FLOOR
  });
});

describe('appendFortieth is a pure append', () => {
  it('returns an array one longer, with the fixture last', () => {
    expect(GROWN.length).toBe(COMMITTED.length + 1);
    expect(GROWN[GROWN.length - 1].id).toBe(FORTIETH_PHOTO.id);
    expect(GROWN).not.toBe(COMMITTED); // a new array, not the same reference
  });

  it('leaves its argument untouched — length, ids and bytes', () => {
    expect(COMMITTED.length).toBe(COMMITTED_BEFORE_LENGTH);
    expect(JSON.stringify(COMMITTED)).toBe(COMMITTED_BEFORE_JSON);
    expect(COMMITTED.map((p) => p.id)).not.toContain(FORTIETH_PHOTO.id);
    expect(JSON.stringify(read('data/portfolio_images.json'))).toBe(COMMITTED_BEFORE_JSON);
  });

  it('derives order and categoryOrder rather than hardcoding them', () => {
    const added = GROWN[GROWN.length - 1];
    const maxOrder = Math.max(...COMMITTED.map((p) => p.order));
    const maxInCategory = Math.max(
      ...COMMITTED.filter((p) => p.category === FIXTURE_CATEGORY).map((p) => p.categoryOrder)
    );
    expect(added.order).toBe(maxOrder + 1);
    expect(added.categoryOrder).toBe(maxInCategory + 1);
    expect(added.order).not.toBe(FORTIETH_PHOTO.order);
  });

  it('does not share nested objects with the exported fixture', () => {
    const added = GROWN[GROWN.length - 1];
    expect(added).not.toBe(FORTIETH_PHOTO);
    expect(added.urls).not.toBe(FORTIETH_PHOTO.urls);
    expect(added.exif).not.toBe(FORTIETH_PHOTO.exif);
    expect(added.dimensions).not.toBe(FORTIETH_PHOTO.dimensions);
  });

  it('refuses an empty manifest rather than inventing order: -Infinity', () => {
    expect(() => appendFortieth([])).toThrow(/empty manifest/);
  });

  it('refuses a manifest with no record in the fixture category', () => {
    const wrongCategory = COMMITTED.filter((p) => p.category !== FIXTURE_CATEGORY);
    expect(wrongCategory.length).toBeGreaterThan(0); // ANTI-VACUITY for the throw below
    expect(() => appendFortieth(wrongCategory)).toThrow(/dense categoryOrder/);
  });
});

describe('the grown manifest passes validateContentSet', () => {
  const report = validateContentSet(contentSet(GROWN));

  it('reports PASS with no violations', () => {
    expect(
      report.violations.map((v) => `${v.rule} ${v.where}: ${v.detail}`),
      'the grown set must be as valid as the committed one'
    ).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('counts what it was given, and runs all six referential-integrity rules', () => {
    expect(report.checked.photos).toBe(GROWN.length);
    expect(report.checked.photos).toBeGreaterThan(MIN_PHOTOS); // it really did grow
    expect(report.checked.rulesRun).toHaveLength(6);
    expect(report.checked.rulesSkipped).toEqual([]);
  });

  it('accepts the grown array as a whole manifest', () => {
    const result = PhotoManifestSchema.safeParse(GROWN);
    expect(result.success ? null : JSON.stringify(result.error?.issues)).toBeNull();
  });
});

describe('the re-scoped invariants hold at a larger corpus', () => {
  it('alt is non-empty on every record — INVARIANT, whole array', () => {
    const missing = GROWN.filter((p) => typeof p.alt !== 'string' || p.alt.trim() === '').map(
      (p) => p.id
    );
    expect(missing).toEqual([]);
    expect(GROWN.length).toBeGreaterThan(MIN_PHOTOS);
  });

  it('no alt repeats its own title and none opens with a role prefix — INVARIANT', () => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const echoes = GROWN.filter((p) => norm(p.alt) === norm(p.title)).map((p) => p.id);
    expect(echoes).toEqual([]);
    const prefixed = GROWN.filter((p) =>
      ['image of', 'photo of', 'picture of'].some((r) => norm(p.alt).startsWith(r))
    ).map((p) => p.id);
    expect(prefixed).toEqual([]);
  });

  it('every record carries a complete six-key exif block — INVARIANT, not a census', () => {
    const keys = ['aperture', 'camera', 'focalLength', 'iso', 'lens', 'shutter'];
    const incomplete = GROWN.filter(
      (p) => JSON.stringify(Object.keys(p.exif ?? {}).sort()) !== JSON.stringify(keys)
    ).map((p) => p.id);
    expect(incomplete).toEqual([]);
    expect(GROWN.filter((p) => 'exif' in p)).toHaveLength(GROWN.length);
  });

  it('categoryOrder stays dense 1…n inside the grown category — INVARIANT', () => {
    const group = GROWN.filter((p) => p.category === FIXTURE_CATEGORY);
    expect(group.length).toBe(COMMITTED.filter((p) => p.category === FIXTURE_CATEGORY).length + 1);
    const ranks = group.map((p) => p.categoryOrder).sort((a, b) => a - b);
    expect(ranks).toEqual(group.map((_, i) => i + 1));
  });

  it('global order stays unique across the grown array — INVARIANT (RI-5)', () => {
    const orders = GROWN.map((p) => p.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(new Set(GROWN.map((p) => p.id)).size).toBe(GROWN.length);
  });

  it('tags is absent from every record, the new one included — INVARIANT', () => {
    expect(GROWN.filter((p) => 'tags' in p)).toHaveLength(0);
    expect(GROWN.length).toBeGreaterThan(MIN_PHOTOS);
  });

  it('no record stores the focalPoint default explicitly — INVARIANT', () => {
    expect(GROWN.filter((p) => p.focalPoint === '50% 50%')).toHaveLength(0);
    expect(GROWN.length).toBeGreaterThan(MIN_PHOTOS);
  });
});

describe('nothing to check is a failure, never a pass', () => {
  it('PhotoManifestSchema refuses an empty array, naming what is empty', () => {
    const result = PhotoManifestSchema.safeParse([]);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/holds no photos/);
  });

  it('validateContentSet refuses an empty photo set rather than reporting PASS', () => {
    const report = validateContentSet(contentSet([]));
    expect(report.ok).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
  });

  it('validateContentSet refuses a manifest that is not an array at all', () => {
    const report = validateContentSet(contentSet({}));
    expect(report.ok).toBe(false);
  });

  it('every loop in this file ran over something', () => {
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    expect(GROWN.length).toBe(COMMITTED.length + 1);
    expect(GROWN.filter((p) => p.category === FIXTURE_CATEGORY).length).toBeGreaterThan(1);
  });
});
