/**
 * THE STANDING GROWTH PROOF (plan 04-01, requirements PIPE-01/PIPE-03).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * Phase 4 builds a pipeline whose entire job is to append a record to
 * `data/portfolio_images.json`. Before plan 04-01, the test suite forbade that: measured on
 * 2026-08-27, one schema-valid 40th record turned 15 assertions across 4 files red — 9 in
 * `photo-enrichment`, 4 in `schemas`, 1 in `site-config-migration`, 1 in `build-fails-loudly` — plus
 * `scripts/migrate-photo-origin.mjs --verify` exiting 1 before it issued a single request. `astro
 * build` stayed GREEN throughout and `astro sync` reported `PASS · 40 photo(s)`, so nothing on the
 * build path could see the problem and nothing on the build path will see it come back.
 *
 * That is what this file is: the assertion that fails the day someone reintroduces a hardcoded
 * corpus size. It is not a test of the pipeline — there is no pipeline yet. It is a test of the
 * SUITE'S OWN capacity to accept growth, written now, while getting it right is easy.
 *
 * WHY IT RESTATES ASSERTIONS THAT LIVE ELSEWHERE
 * ---------------------------------------------
 * Section 4 below re-checks the alt invariant, the exif census, `categoryOrder` density and the
 * `tags` prohibition against the GROWN array. Those four claims already exist in
 * `test/content/`, asserted against the manifest AS COMMITTED. That is precisely why they are
 * restated: a re-scoping that accidentally turned one of them into a loop over the 39 records it
 * used to cover would still pass over there, because over there the manifest still has 39 records.
 * Only a grown array can tell the difference between "iterates the manifest" and "iterates 39
 * things".
 *
 * IT DOES NOT IMPORT THE PRODUCER'S HELPERS, PER THE SUITE'S CONVENTION
 * --------------------------------------------------------------------
 * `photo-enrichment.unit.test.ts` states the rule: *"Importing the merge's own parser would make
 * this file assert that the merge agrees with itself."* The same applies here. The shape claims
 * below are written out independently; the only things imported are the SCHEMA (which is the
 * authority being tested against, not a helper) and the fixture (which is the input).
 *
 * NOTHING HERE WRITES TO DISK. The committed manifest is read once, and `appendFortieth` is pure.
 * `data/portfolio_images.json` is reviewed content; a test that wrote to it would be corrupting the
 * evidence four migration proofs depend on.
 */

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

/**
 * FLOOR, and the same one every re-scoped assertion uses. 39 is the corpus reviewed on 2026-08-23;
 * it can only grow. Asserted here because everything below reads `COMMITTED`, and a manifest that
 * failed to load would make the whole file iterate nothing.
 */
const MIN_PHOTOS = 39;

/**
 * `COMMITTED` as it stood BEFORE `appendFortieth` was called, captured at module scope because the
 * purity claim in section 2 cannot be made after the fact: if the helper mutated its argument, a
 * comparison taken inside the `it` would be comparing the corrupted array against itself.
 */
const COMMITTED_BEFORE_JSON = JSON.stringify(COMMITTED);
const COMMITTED_BEFORE_LENGTH = COMMITTED.length;

/** The grown array, derived once. Every section below asserts about THIS, not about `COMMITTED`. */
const GROWN = appendFortieth(COMMITTED);

const contentSet = (photos: unknown) => ({
  photos,
  site: SITE,
  home: HOME,
  projects: PROJECTS,
  resume: RESUME,
});

/* ============================================================================================
 * 1. The fixture is not a strawman.
 * ========================================================================================== */

describe('the 40th record is a real record', () => {
  it('satisfies PhotoSchema on its own, including all four alt rules', () => {
    const result = PhotoSchema.safeParse(FORTIETH_PHOTO);
    // The error text, not a bare boolean: a fixture that stopped parsing must say why in the
    // failure, or the next person spends the afternoon bisecting a `false`.
    expect(result.success ? null : JSON.stringify(result.error?.issues)).toBeNull();
  });

  it('carries a real WebP data URI, a complete six-key exif block, and no tags', () => {
    // Written out rather than delegated to the schema: this is the independent statement of the
    // shape the suite's convention asks for. If the schema ever stopped enforcing one of these,
    // section 1's first assertion would go green and this one would not.
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
    // Otherwise "appending it" would be appending a duplicate, and every assertion below would be
    // measuring RI-5 firing rather than growth working.
    expect(COMMITTED.map((p) => p.id)).not.toContain(FORTIETH_PHOTO.id);
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS); // FLOOR
  });
});

/* ============================================================================================
 * 2. The append actually happened, and it happened purely.
 *    ANTI-VACUITY FIRST: everything after this asserts about `GROWN`, and a helper that returned
 *    its input unchanged would make all of it a restatement of the committed-manifest tests.
 * ========================================================================================== */

describe('appendFortieth is a pure append', () => {
  it('returns an array one longer, with the fixture last', () => {
    expect(GROWN.length).toBe(COMMITTED.length + 1);
    expect(GROWN[GROWN.length - 1].id).toBe(FORTIETH_PHOTO.id);
    expect(GROWN).not.toBe(COMMITTED); // a new array, not the same reference
  });

  it('leaves its argument untouched — length, ids and bytes', () => {
    // Compared against the pre-call snapshot, not against itself: `toBe(COMMITTED.length)` would be
    // a tautology, and a helper that spliced in place and then returned a copy would sail past it.
    expect(COMMITTED.length).toBe(COMMITTED_BEFORE_LENGTH);
    expect(JSON.stringify(COMMITTED)).toBe(COMMITTED_BEFORE_JSON);
    expect(COMMITTED.map((p) => p.id)).not.toContain(FORTIETH_PHOTO.id);
    // …and against the file on disk, which is the claim that matters: nothing here wrote to
    // `data/portfolio_images.json`, so a fresh read must produce the same bytes.
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
    // The provisional values on the exported constant are NOT what landed. This is what makes the
    // fixture reusable at any corpus size, and it is pitfall P-5's failure mode stated as a test.
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

/* ============================================================================================
 * 3. The grown set passes the real build-time gate, with every rule run.
 * ========================================================================================== */

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
    // `GROWN.length`, not a literal 40. A literal here would be the exact defect this whole plan
    // exists to remove, reintroduced inside the file that proves it was removed.
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

/* ============================================================================================
 * 4. Every count-shaped assertion re-scoped by plan 04-01, restated against the GROWN array.
 *    See the header for why these are duplicated rather than trusted.
 * ========================================================================================== */

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
    // The category the fixture joined must be one member larger than it was, or the append landed
    // somewhere else and the density claim below is about the wrong group.
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

/* ============================================================================================
 * 5. THE ANTI-VACUITY CLAUSE. This is what stops a future "fix" turning any loop above into a
 *    loop over zero items and calling it green.
 * ========================================================================================== */

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
    // The guard on the guards. Each figure below is the size of a collection some assertion above
    // iterated; a module-scope read that silently produced `[]` would show up here and nowhere else.
    expect(COMMITTED.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    expect(GROWN.length).toBe(COMMITTED.length + 1);
    expect(GROWN.filter((p) => p.category === FIXTURE_CATEGORY).length).toBeGreaterThan(1);
  });
});
