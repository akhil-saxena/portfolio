/**
 * Proof that each photo-pipeline fixture is what it claims to be (plan 04-04, Task 3).
 *
 * WHY THIS FILE CARRIES MORE WEIGHT THAN IT LOOKS LIKE IT SHOULD
 * -------------------------------------------------------------
 * 04-04 Task 1 measured that the EXIF regression corpus OD-12's decision rested on DOES NOT
 * EXIST. All 39 live originals are single-chunk WebP with no EXIF, XMP or ICC — the legacy
 * encoder never called `withMetadata()` and sharp strips by default, and the camera sources
 * were never committed. `test/pipeline/fixtures/exif-differential.txt` has one row per record.
 *
 * So the "re-extract from 39 reviewed photographs" proof is unavailable at any price, and these
 * three synthetic files are the ONLY evidence that `exif-reader` reads what the pipeline thinks
 * it reads. That is a downgrade, it is recorded as one in `fixtures/README.md`, and it is why
 * every assertion below names the field it checks: a single `toEqual` on the whole object would
 * tell a future reader that something regressed without telling them what.
 *
 * WHAT IS IMPORTED AND WHAT IS RE-TYPED
 * -------------------------------------
 * Following `photo-pipeline-contract.unit.test.ts`'s stated convention — importing a producer's
 * own parser makes a test assert that the producer agrees with itself:
 *   - `VARIANTS` IS imported from `src/lib/photo-pipeline.ts`. It is the other side of the
 *     agreement: the claim is "`small-320px.jpg` is narrower than the smallest variant", and
 *     writing `400` here would let the fixture and the variant table drift apart together while
 *     this file kept passing. The plan says explicitly: import it, do not write 400.
 *   - `expected-exif.json` IS read rather than re-typed, because it is the expectation table —
 *     the artefact whose whole job is to state the values independently of the reader.
 *   - The six-field MAPPING is re-typed below from the legacy extractor, deliberately. 04-07
 *     owns the real mapper and does not exist yet; restating the formula here is what makes the
 *     two halves of `expected-exif.json` (`tags` and `fields`) check each other.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import exifReader from 'exif-reader';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { VARIANTS } from '../../src/lib/photo-pipeline';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const FIXTURES = join(HERE, 'fixtures');
const GENERATOR = join(REPO, 'scripts', 'generate-photo-fixtures.mjs');

const RICH = join(FIXTURES, 'rich-exif.jpg');
const BARE = join(FIXTURES, 'no-exif.jpg');
const SMALL = join(FIXTURES, 'small-320px.jpg');
const TABLE = join(FIXTURES, 'expected-exif.json');

/** The four artefacts the generator emits, as repo-relative paths for `git` to be asked about. */
const GENERATED = [
  'test/pipeline/fixtures/rich-exif.jpg',
  'test/pipeline/fixtures/no-exif.jpg',
  'test/pipeline/fixtures/small-320px.jpg',
  'test/pipeline/fixtures/expected-exif.json',
] as const;

type ExpectationTable = {
  readonly fixture: string;
  readonly tags: Record<string, { readonly ifd: string; readonly parsed: string | number }>;
  readonly fields: {
    readonly camera: string | null;
    readonly lens: string | null;
    readonly aperture: string | null;
    readonly shutter: string | null;
    readonly iso: number | null;
    readonly focalLength: string | null;
  };
};

const expected = JSON.parse(readFileSync(TABLE, 'utf8')) as ExpectationTable;

/**
 * `exif-reader` returns `{ bigEndian, Image, Photo, ... }`. `Make`/`Model` land in `Image`
 * (IFD0); the other five land in `Photo` (the Exif sub-IFD). Looking a tag up in both, rather
 * than hard-coding which section each lives in, means an IFD placement change in the generator
 * surfaces as a *value* mismatch naming the tag rather than as `undefined`.
 */
type ParsedExif = { Image?: Record<string, unknown>; Photo?: Record<string, unknown> };
const lookup = (parsed: ParsedExif, tag: string): unknown =>
  parsed.Image?.[tag] ?? parsed.Photo?.[tag];

const sha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

describe('fixture: rich-exif.jpg', () => {
  it('is wider than every variant in VARIANTS, so all four genuinely downscale', async () => {
    const meta = await sharp(RICH).metadata();
    const widest = Math.max(...VARIANTS.map((v) => v.maxWidth));
    expect(meta.width).toBe(2400);
    expect(meta.width).toBeGreaterThan(widest);
  });

  it('carries a non-empty EXIF buffer that sharp surfaces', async () => {
    const meta = await sharp(RICH).metadata();
    expect(meta.exif).toBeInstanceOf(Buffer);
    expect((meta.exif as Buffer).length).toBeGreaterThan(0);
  });

  // One `it` per tag, named. Seven separate failures beat one opaque object diff.
  for (const tag of [
    'Make',
    'Model',
    'LensModel',
    'FNumber',
    'ExposureTime',
    'ISOSpeedRatings',
    'FocalLength',
  ]) {
    it(`yields the picked tag ${tag} with the value expected-exif.json states`, async () => {
      const meta = await sharp(RICH).metadata();
      const parsed = exifReader(meta.exif as Buffer) as ParsedExif;
      // Anti-vacuity: driven by the expectation table, not by the data. If the table ever
      // stopped naming this tag, the test would silently compare undefined to undefined.
      expect(expected.tags[tag]).toBeDefined();
      expect(lookup(parsed, tag)).toStrictEqual(expected.tags[tag].parsed);
    });
  }

  it('names the fixture it describes, so the table cannot be pointed at another file', () => {
    expect(expected.fixture).toBe('rich-exif.jpg');
  });

  /**
   * Ties the two halves of `expected-exif.json` together. `tags` is what the reader returns;
   * `fields` is what a human declared those tags ought to become. The mapping below is the
   * legacy extractor's, re-typed from
   * `git show legacy/nextjs-portfolio:scripts/process-images.js`. 04-07 will assert its real
   * mapper against `fields`; this asserts `fields` was not simply invented.
   */
  it('has an expectation table whose six fields agree with its seven tags', () => {
    const t = expected.tags;
    const shutterSeconds = t.ExposureTime.parsed as number;
    const derived = {
      camera: [t.Make.parsed, t.Model.parsed].filter(Boolean).join(' ') || null,
      lens: (t.LensModel.parsed as string) || null,
      aperture: t.FNumber.parsed ? `f/${t.FNumber.parsed}` : null,
      shutter: shutterSeconds
        ? shutterSeconds < 1
          ? `1/${Math.round(1 / shutterSeconds)}`
          : `${shutterSeconds}s`
        : null,
      iso: (t.ISOSpeedRatings.parsed as number) || null,
      focalLength: t.FocalLength.parsed ? `${t.FocalLength.parsed}mm` : null,
    };
    for (const key of Object.keys(derived) as (keyof typeof derived)[]) {
      expect(`${key}=${String(expected.fields[key])}`).toBe(`${key}=${String(derived[key])}`);
    }
  });

  it('exercises all six schema fields — none is left null by the fixture', () => {
    const missing = Object.entries(expected.fields)
      .filter(([, value]) => value === null)
      .map(([key]) => key);
    // The plan's rule: a fixture that silently exercises five of six fields, with a test named
    // as though it exercised six, is the shape this project has shipped ten times. If a field
    // ever becomes unexercisable, this fails and `fixtures/README.md` must say which and why.
    expect(missing).toStrictEqual([]);
  });
});

describe('fixture: no-exif.jpg', () => {
  it('has the same dimensions as rich-exif.jpg, so the two differ only in metadata', async () => {
    const [rich, bare] = await Promise.all([sharp(RICH).metadata(), sharp(BARE).metadata()]);
    expect(bare.width).toBe(rich.width);
    expect(bare.height).toBe(rich.height);
  });

  it('reports no EXIF buffer at all', async () => {
    const meta = await sharp(BARE).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("reaches exif-reader's FAILURE PATH rather than quietly returning nulls", async () => {
    const meta = await sharp(BARE).metadata();
    // The plan is explicit: assert the failure path FIRED. A test that only checked the result
    // was all-null would pass for a reader that returned nulls for a file it never opened.
    // Measured: `exif-reader` THROWS on an absent or non-EXIF buffer — it never returns a
    // null-filled object — which is why 04-07's `try/catch` around it is load-bearing and not
    // defensive decoration.
    let threw: unknown;
    try {
      exifReader(meta.exif as unknown as Buffer);
    } catch (error) {
      threw = error;
    }
    expect(threw).toBeInstanceOf(Error);
  });

  it('makes exif-reader throw on an empty buffer too, not just on undefined', () => {
    expect(() => exifReader(Buffer.alloc(0))).toThrow(/Invalid EXIF data/);
  });
});

describe('fixture: small-320px.jpg', () => {
  it('is exactly 320px wide and narrower than the smallest VARIANTS maxWidth', async () => {
    const meta = await sharp(SMALL).metadata();
    const narrowest = Math.min(...VARIANTS.map((v) => v.maxWidth));
    expect(meta.width).toBe(320);
    // `400` is never written here — it is read from the variant table, so a change to that
    // table cannot leave this fixture silently no longer exercising `withoutEnlargement`.
    expect(meta.width).toBeLessThan(narrowest);
  });
});

/**
 * `exif-differential.txt` is the ONLY artefact recording why OD-12's mandatory 39-record proof
 * was not run. Without it the verdict is a sentence somebody wrote rather than a measurement
 * somebody took, and a sentence rots silently.
 *
 * ADDED BEYOND THE PLAN (deviation, Rule 2). The plan verified that file with a one-shot shell
 * check: `>= 3 lines matching /^\S+\s+\d+\/\d+/`. Proven walkable — three fabricated rows
 * (`x 1/1`) satisfy the shape and the check passes. These assertions bind the rows to the
 * committed manifest instead, so a fabricated or trimmed evidence file fails by name.
 */
describe('the OD-12 differential evidence', () => {
  const rows = readFileSync(join(FIXTURES, 'exif-differential.txt'), 'utf8')
    .split('\n')
    .filter((line) => /^\S+\s+\d+\/\d+/.test(line))
    .map((line) => line.split(/\s+/)[0]);

  const manifestIds = new Set<string>(
    (
      JSON.parse(readFileSync(join(REPO, 'data', 'portfolio_images.json'), 'utf8')) as {
        id: string;
      }[]
    ).map((record) => record.id)
  );

  it('covers at least the 39 records that existed when the measurement was taken', () => {
    // A FLOOR, never a count — Phase 4 appends records, and the repo convention (see
    // `photo-pipeline-contract.unit.test.ts`) is that a 40th record must strengthen a proof
    // rather than falsify it.
    expect(rows.length).toBeGreaterThanOrEqual(39);
  });

  it('names only real record ids — no row can be fabricated to satisfy a row count', () => {
    const unknown = rows.filter((id) => !manifestIds.has(id));
    expect(unknown).toStrictEqual([]);
  });

  it('names each record at most once, so rows cannot be padded by repetition', () => {
    expect(new Set(rows).size).toBe(rows.length);
  });

  it('states the verdict in README.md, not only in the data file', () => {
    const readme = readFileSync(join(FIXTURES, 'README.md'), 'utf8');
    expect(readme).toContain('The differential corpus is NOT available.');
  });
});

describe('the fixtures as committed artefacts', () => {
  for (const relative of GENERATED) {
    it(`${relative} exists, is non-empty and is TRACKED BY GIT`, () => {
      expect(statSync(join(REPO, relative)).size).toBeGreaterThan(0);
      // A gitignored fixture passes locally and does not exist on the runner. `--error-unmatch`
      // exits non-zero for an untracked path, so this throws rather than passing vacuously.
      expect(() =>
        execFileSync('git', ['ls-files', '--error-unmatch', relative], {
          cwd: REPO,
          stdio: 'pipe',
        })
      ).not.toThrow();
    });
  }

  it('regenerates byte-identically — the generator is deterministic', () => {
    const before = GENERATED.map((r) => sha256(join(REPO, r)));
    execFileSync('node', [GENERATOR], { cwd: REPO, stdio: 'pipe' });
    const after = GENERATED.map((r) => sha256(join(REPO, r)));
    for (const [index, relative] of GENERATED.entries()) {
      expect(`${relative}:${after[index]}`).toBe(`${relative}:${before[index]}`);
    }
  });

  it('leaves the working tree clean against git after regenerating', () => {
    execFileSync('node', [GENERATOR], { cwd: REPO, stdio: 'pipe' });
    // KNOWN TRAP, and the reason this test is paired with the tracked-by-git test above:
    // `git diff` is BLIND to untracked files. On a first run — fixtures new and never added —
    // `git diff --quiet` exits 0 whether or not the generator is deterministic, so on its own
    // this assertion would be vacuous exactly when it mattered most. The `--error-unmatch`
    // test above is what closes that hole: an untracked fixture fails there, loudly and by
    // name, so by the time control reaches here every path below is known to git.
    //
    // `git add` is deliberately NOT called from inside a test. Several Phase 4 plans work in
    // this tree concurrently and staging from a test would push files into a shared index that
    // another plan's commit could sweep up.
    expect(() =>
      execFileSync('git', ['diff', '--quiet', '--', ...GENERATED], { cwd: REPO, stdio: 'pipe' })
    ).not.toThrow();
  });
});
