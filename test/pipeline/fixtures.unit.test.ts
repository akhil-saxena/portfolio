import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, rmSync, statSync } from 'node:fs';
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
      expect(expected.tags[tag]).toBeDefined();
      expect(lookup(parsed, tag)).toStrictEqual(expected.tags[tag].parsed);
    });
  }

  it('names the fixture it describes, so the table cannot be pointed at another file', () => {
    expect(expected.fixture).toBe('rich-exif.jpg');
  });

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
    expect(meta.width).toBeLessThan(narrowest);
  });
});

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
      expect(() =>
        execFileSync('git', ['ls-files', '--error-unmatch', relative], {
          cwd: REPO,
          stdio: 'pipe',
        })
      ).not.toThrow();
    });
  }

  it('regenerates byte-identically — the generator is deterministic', () => {
    const backups = GENERATED.map((relative) => {
      const abs = join(REPO, relative);
      const bak = `${abs}.determinism-backup`;
      copyFileSync(abs, bak);
      return { abs, bak };
    });
    try {
      execFileSync('node', [GENERATOR], { cwd: REPO, stdio: 'pipe' });
      const first = GENERATED.map((r) => sha256(join(REPO, r)));
      execFileSync('node', [GENERATOR], { cwd: REPO, stdio: 'pipe' });
      const second = GENERATED.map((r) => sha256(join(REPO, r)));
      expect(GENERATED.length).toBeGreaterThan(0);
      for (const [index, relative] of GENERATED.entries()) {
        expect(`${relative}:${second[index]}`).toBe(`${relative}:${first[index]}`);
      }
    } finally {
      for (const { abs, bak } of backups) {
        copyFileSync(bak, abs);
        rmSync(bak, { force: true });
      }
    }
  });

  it('the committed fixtures are not left dirty in the working tree', () => {
    expect(() =>
      execFileSync('git', ['diff', '--quiet', '--', ...GENERATED], { cwd: REPO, stdio: 'pipe' })
    ).not.toThrow();
  });
});
