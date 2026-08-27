/**
 * The six-field EXIF mapping, the all-null path, and what `date` means.
 * (Phase 4, plan 04-07, Task 3 — PIPE-01, OD-10, OD-12.)
 *
 * THE TRAP THIS FILE EXISTS TO PIN
 * --------------------------------
 * `exifr` (the legacy reader) and `exif-reader` (OD-12 option B) DISAGREE ON A TAG NAME. EXIF tag
 * `0x8827` is `ISO` in `exifr` and `ISOSpeedRatings` in `exif-reader`. A verbatim port of the
 * legacy mapper reads `d.ISO`, gets `undefined`, and writes `iso: null` into EVERY future
 * record — schema-valid, and invisible to every gate in this repository
 * (`04-VALIDATION.md` hazard 11, found by 04-04's cross-library differential).
 *
 * So this file does not check the mapping against the legacy code and does not check it against
 * `exifr`. It checks every name against `exif-reader` SPECIFICALLY, twice over:
 *
 *   1. by parsing real bytes and asserting which key the value arrives under, and
 *   2. by feeding the mapper a synthetic parsed object under the WRONG (exifr) name and
 *      requiring the field to come back null — because a mapper that read either name would
 *      pass (1) while still being one rename away from silent data loss.
 *
 * `DateTimeOriginal` gets the same treatment. OD-10 makes `date` depend on it, and a silent
 * rename there would write the ingestion date forever while looking perfectly correct.
 *
 * WHY THE SYNTHETIC OBJECTS
 * -------------------------
 * `04-04` (wave 2) generated the fixtures and wrote exactly seven tags into them: `Make`,
 * `Model`, `LensModel`, `FNumber`, `ExposureTime`, `ISOSpeedRatings`, `FocalLength`. No date
 * tag, and this plan's `<files>` does not include the generator — requiring a date-bearing
 * fixture would invert the waves. `test/pipeline/fixtures/README.md` also names the one mapping
 * branch the fixtures cannot reach: the `>= 1s` shutter. Both are covered here by handing the
 * mapper a parsed object built in this file, in `exif-reader`'s own shape.
 *
 * WHICH OD-12 PROOF WAS AVAILABLE
 * -------------------------------
 * NOT the differential one. `04-RESEARCH.md` made a 39-record differential mandatory for option
 * B, and 04-04 Task 1 measured that the corpus does not exist: all 39 served originals — and the
 * three unwatermarked masters it also probed — are single-chunk `VP8` WebP with no `EXIF`, `XMP`
 * or `ICCP`, verified three ways. The legacy encoder never called `withMetadata()`, sharp strips
 * by default, and the camera sources were never committed. The committed `exif` blocks are the
 * OUTPUT of an extraction, not an input any extraction can be re-run against. The available
 * proof is therefore the fixtures plus these synthetic cases, and it is weaker in one stated
 * way: it shows the mapper reads what `exif-reader` produces, not that it agrees with 39
 * photographs a human reviewed in 2026-03.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import exifReader from 'exif-reader';
import sharp from 'sharp';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  captureDate,
  deriveAssets,
  EXIF_FIELDS,
  extractExif,
  mapExifFields,
} from '../../scripts/lib/photo-derive.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

const RICH = readFileSync(join(FIXTURES, 'rich-exif.jpg'));
const BARE = readFileSync(join(FIXTURES, 'no-exif.jpg'));

/** The expectation table 04-04 emits. Read, never re-typed — that is its whole job. */
const expected = JSON.parse(readFileSync(join(FIXTURES, 'expected-exif.json'), 'utf8')) as {
  fields: {
    camera: string | null;
    lens: string | null;
    aperture: string | null;
    shutter: string | null;
    iso: number | null;
    focalLength: string | null;
  };
};

/** Fixed, so nothing here depends on the day the suite runs. */
const INGESTION_DATE = '2026-08-27';

/**
 * A parsed object in `exif-reader`'s OWN shape — `{ Image, Photo }`, tags under their TIFF
 * names. Written by hand rather than produced by a reader, so the mapper is checked against the
 * library's contract instead of against itself.
 */
const parsedExif = (image: Record<string, unknown>, photo: Record<string, unknown>) => ({
  bigEndian: false,
  Image: image,
  Photo: photo,
});

/** The seven tags `rich-exif.jpg` carries, in `exif-reader`'s names, as a synthetic object. */
const FULL_IMAGE = { Make: 'NIKON CORPORATION', Model: 'NIKON D5300' };
const FULL_PHOTO = {
  LensModel: '18.0-55.0 mm f/3.5-5.6',
  FNumber: 11,
  ExposureTime: 0.002,
  ISOSpeedRatings: 200,
  FocalLength: 40,
};
const full = () => parsedExif({ ...FULL_IMAGE }, { ...FULL_PHOTO });

let richMeta: sharp.Metadata;
let bareMeta: sharp.Metadata;

beforeAll(async () => {
  richMeta = await sharp(RICH).metadata();
  bareMeta = await sharp(BARE).metadata();
}, 60_000);

afterEach(() => {
  vi.restoreAllMocks();
});

/* ============================================================================================ */

describe('the tag names, verified against exif-reader and nothing else', () => {
  it('surfaces EXIF 0x8827 as ISOSpeedRatings — `ISO`, the exifr name, is undefined', () => {
    const parsed = exifReader(richMeta.exif as Buffer) as {
      Photo?: Record<string, unknown>;
    };
    expect(parsed.Photo?.ISOSpeedRatings).toBe(200);
    expect(parsed.Photo?.ISO).toBeUndefined();
  });

  it('puts Make and Model in Image, and the other five in Photo', () => {
    const parsed = exifReader(richMeta.exif as Buffer) as {
      Image?: Record<string, unknown>;
      Photo?: Record<string, unknown>;
    };
    expect(parsed.Image?.Make).toBe('NIKON CORPORATION');
    expect(parsed.Image?.Model).toBe('NIKON D5300');
    for (const tag of ['LensModel', 'FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength']) {
      expect(parsed.Photo?.[tag]).toBeDefined();
    }
  });

  it('surfaces EXIF 0x9003 as Photo.DateTimeOriginal, already parsed to a Date', async () => {
    // A round trip through real bytes, because OD-10 depends on this name and a rename would
    // be silent: `date` would quietly become the ingestion date on every future record.
    const withDate = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .withExif({ IFD0: { Make: 'PROBE' }, IFD2: { DateTimeOriginal: '2019:07:04 18:23:45' } })
      .jpeg()
      .toBuffer();
    const meta = await sharp(withDate).metadata();
    const parsed = exifReader(meta.exif as Buffer) as { Photo?: Record<string, unknown> };
    const tag = parsed.Photo?.DateTimeOriginal;
    expect(tag).toBeInstanceOf(Date);
    expect((tag as Date).toISOString()).toBe('2019-07-04T18:23:45.000Z');
  });

  it('reads exif-reader names and NOT exifr names — the mapper, proven per trap tag', () => {
    // `ISO` is the exifr spelling. A mapper that accepted it would be one rename from writing
    // null forever, and this repo has no gate that can see a schema-valid null.
    const wrong = mapExifFields(parsedExif({}, { ISO: 200 }));
    expect(wrong.iso).toBeNull();
    const right = mapExifFields(parsedExif({}, { ISOSpeedRatings: 200 }));
    expect(right.iso).toBe(200);
  });
});

/* ============================================================================================ */

describe('rich-exif.jpg maps to the six fields the expectation table declares', () => {
  const of = () => extractExif(richMeta, { ingestionDate: INGESTION_DATE }).fields;

  // Field by field, each named. A single toEqual over the object would say something regressed
  // without saying which of six independent branches did.
  it('camera', () => expect(of().camera).toBe(expected.fields.camera));
  it('lens', () => expect(of().lens).toBe(expected.fields.lens));
  it('aperture', () => expect(of().aperture).toBe(expected.fields.aperture));
  it('shutter', () => expect(of().shutter).toBe(expected.fields.shutter));
  it('iso', () => expect(of().iso).toBe(expected.fields.iso));
  it('focalLength', () => expect(of().focalLength).toBe(expected.fields.focalLength));

  it('returns iso as a NUMBER — PhotoExifSchema is z.number().int().positive().nullable()', () => {
    expect(typeof of().iso).toBe('number');
  });

  it('returns exactly the six keys PhotoExifSchema declares, in that order', () => {
    expect(Object.keys(of())).toEqual([...EXIF_FIELDS]);
  });
});

/* ============================================================================================ */

describe('no-exif.jpg yields six nulls, and the reader is proven to have run', () => {
  it('has no exif for the reader to find — the premise of the all-null case', () => {
    expect(Object.hasOwn(bareMeta, 'exif')).toBe(false);
  });

  it('returns exactly six keys, every one null — not undefined, not a missing object', () => {
    const { fields } = extractExif(bareMeta, { ingestionDate: INGESTION_DATE });
    expect(Object.keys(fields)).toEqual([...EXIF_FIELDS]);
    for (const field of EXIF_FIELDS) {
      expect(fields[field]).toBeNull();
    }
  });

  it('proves the metadata probe RAN and found nothing, rather than never opening the file', () => {
    const { probe } = extractExif(bareMeta, { ingestionDate: INGESTION_DATE });
    expect(probe.metadataRead).toBe(true);
    expect(probe.exifPresent).toBe(false);
    expect(probe.exifBytes).toBe(0);
    expect(probe.failure).toBeNull();
  });

  it('reports a probe that never ran differently from one that found nothing', () => {
    const { probe } = extractExif(undefined, { ingestionDate: INGESTION_DATE });
    expect(probe.metadataRead).toBe(false);
  });

  it('carries the same absence through deriveAssets, on real bytes', async () => {
    const assets = await deriveAssets({
      bytes: BARE,
      category: 'nature',
      slug: 'bare',
      ingestionDate: INGESTION_DATE,
    });
    expect(assets.exifProbe.metadataRead).toBe(true);
    expect(assets.exifProbe.exifPresent).toBe(false);
    expect(Object.keys(assets.exif)).toEqual([...EXIF_FIELDS]);
    for (const field of EXIF_FIELDS) {
      expect(assets.exif[field]).toBeNull();
    }
  }, 60_000);
});

/* ============================================================================================ */

describe('a corrupt EXIF segment does not fail the job (T-04-33)', () => {
  it('returns the all-null object on ANY throw from the reader, and logs it', () => {
    // console.log and console.info print NOTHING under this vitest setup (04-VALIDATION.md
    // hazard 7), so the module writes its warning with process.stderr.write — which is both
    // visible on an Actions runner and observable here.
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const corrupt = { exif: Buffer.from('not an exif segment at all', 'utf8') };
    const { fields, probe } = extractExif(corrupt, { ingestionDate: INGESTION_DATE });
    for (const field of EXIF_FIELDS) {
      expect(fields[field]).toBeNull();
    }
    expect(probe.exifPresent).toBe(true);
    expect(probe.parsed).toBe(false);
    expect(probe.failure).toBeTruthy();
    expect(stderr).toHaveBeenCalled();
    expect(String(stderr.mock.calls[0][0])).toContain('photo-derive');
  });

  it('falls back to the ingestion date when the reader threw', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const corrupt = { exif: Buffer.from('garbage', 'utf8') };
    expect(extractExif(corrupt, { ingestionDate: INGESTION_DATE }).date).toBe(INGESTION_DATE);
  });
});

/* ============================================================================================ */

describe('the shutter mapping fires both branches', () => {
  it('renders a sub-second exposure as 1/N', () => {
    expect(mapExifFields(parsedExif({}, { ExposureTime: 1 / 250 })).shutter).toBe('1/250');
  });

  it('renders a >= 1s exposure as Ns — the branch NO fixture reaches', () => {
    // `fixtures/README.md` names this as the one gap: the generated files carry a 1/500
    // exposure, so the long branch is unreachable through them and is 04-07's to cover.
    expect(mapExifFields(parsedExif({}, { ExposureTime: 2 })).shutter).toBe('2s');
  });

  it('puts the boundary itself on the long branch', () => {
    expect(mapExifFields(parsedExif({}, { ExposureTime: 1 })).shutter).toBe('1s');
  });
});

/* ============================================================================================ */

describe('every field is independently nullable — partial EXIF is the norm', () => {
  it('camera is null, not the empty string, when both Make and Model are absent', () => {
    const mapped = mapExifFields(parsedExif({}, { ...FULL_PHOTO }));
    expect(mapped.camera).toBeNull();
    expect(mapped.camera).not.toBe('');
  });

  it('camera survives one of the two being absent', () => {
    expect(mapExifFields(parsedExif({ Model: 'NIKON D5300' }, {})).camera).toBe('NIKON D5300');
    expect(mapExifFields(parsedExif({ Make: 'NIKON CORPORATION' }, {})).camera).toBe(
      'NIKON CORPORATION'
    );
  });

  // The measured census across the 39 committed records is camera=1, lens=11, aperture=2,
  // shutter=2, iso=2, focalLength=2 null. Six cases, one per field, each dropping exactly one
  // tag and requiring the other five to survive.
  const DROP: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['camera', ['Make', 'Model']],
    ['lens', ['LensModel']],
    ['aperture', ['FNumber']],
    ['shutter', ['ExposureTime']],
    ['iso', ['ISOSpeedRatings']],
    ['focalLength', ['FocalLength']],
  ];

  for (const [field, tags] of DROP) {
    it(`${field} alone goes null when ${tags.join(' and ')} is missing`, () => {
      const parsed = full();
      for (const tag of tags) {
        delete (parsed.Image as Record<string, unknown>)[tag];
        delete (parsed.Photo as Record<string, unknown>)[tag];
      }
      const mapped = mapExifFields(parsed);
      expect(mapped[field]).toBeNull();
      for (const other of EXIF_FIELDS) {
        if (other !== field) expect(mapped[other]).not.toBeNull();
      }
    });
  }

  it('yields six nulls from a parsed object with no tags at all', () => {
    const mapped = mapExifFields(parsedExif({}, {}));
    expect(Object.keys(mapped)).toEqual([...EXIF_FIELDS]);
    for (const field of EXIF_FIELDS) {
      expect(mapped[field]).toBeNull();
    }
  });
});

/* ============================================================================================ */

describe('OD-10 option B · date is DateTimeOriginal ?? ingestionDate', () => {
  it('takes the capture date when the source carries one', () => {
    const parsed = full();
    (parsed.Photo as Record<string, unknown>).DateTimeOriginal = new Date(
      Date.UTC(2019, 6, 4, 18, 23, 45)
    );
    expect(captureDate(parsed, INGESTION_DATE)).toBe('2019-07-04');
  });

  it('falls back to the ingestion date when the source carries none', () => {
    expect(captureDate(full(), INGESTION_DATE)).toBe(INGESTION_DATE);
    expect(captureDate(null, INGESTION_DATE)).toBe(INGESTION_DATE);
  });

  it('reads the tag the camera wrote, not the runner local day', () => {
    // exif-reader parses the naive EXIF timestamp AS UTC, so the UTC parts are exactly the
    // digits the camera wrote. A local-getter implementation shifts the day for any evening
    // exposure east of Greenwich; TZ is forced here so the assertion does not depend on where
    // the suite happens to run.
    const original = process.env.TZ;
    try {
      process.env.TZ = 'Asia/Kolkata';
      const parsed = full();
      (parsed.Photo as Record<string, unknown>).DateTimeOriginal = new Date(
        Date.UTC(2019, 6, 4, 23, 59, 0)
      );
      expect(captureDate(parsed, INGESTION_DATE)).toBe('2019-07-04');
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('ignores a DateTimeOriginal that is not a usable date', () => {
    const parsed = full();
    (parsed.Photo as Record<string, unknown>).DateTimeOriginal = new Date(Number.NaN);
    expect(captureDate(parsed, INGESTION_DATE)).toBe(INGESTION_DATE);
  });

  it('accepts the raw EXIF string form as well as the parsed Date', () => {
    // `exif-reader`'s own typings declare `DateTimeOriginal` as a Date in the Exif sub-IFD and
    // as a string in IFD0, so both shapes are reachable and both are handled.
    const parsed = parsedExif({ DateTimeOriginal: '2021:11:02 06:15:00' }, {});
    expect(captureDate(parsed, INGESTION_DATE)).toBe('2021-11-02');
  });

  it('surfaces the capture date through deriveAssets on real bytes', async () => {
    const withDate = await sharp({
      create: { width: 900, height: 600, channels: 3, background: { r: 30, g: 90, b: 60 } },
    })
      .withExif({ IFD2: { DateTimeOriginal: '2019:07:04 18:23:45' } })
      .jpeg()
      .toBuffer();
    const assets = await deriveAssets({
      bytes: withDate,
      category: 'nature',
      slug: 'dated',
      ingestionDate: INGESTION_DATE,
    });
    expect(assets.date).toBe('2019-07-04');
    expect(assets.date).not.toBe(assets.ingestionDate);
  }, 60_000);

  it('falls back through deriveAssets when the source has no EXIF at all', async () => {
    const assets = await deriveAssets({
      bytes: BARE,
      category: 'nature',
      slug: 'undated',
      ingestionDate: INGESTION_DATE,
    });
    expect(assets.date).toBe(INGESTION_DATE);
  }, 60_000);
});

/* ============================================================================================ */

describe('OD-9 option A · no emitted upload descriptor is under `private/`', () => {
  it('emits descriptors at all, THEN emits none under that prefix', async () => {
    const assets = await deriveAssets({
      bytes: BARE,
      category: 'nature',
      slug: 'od-nine',
      ingestionDate: INGESTION_DATE,
    });
    // Anti-vacuity FIRST. An empty list satisfies "no key starts with private/" trivially, and
    // this repository has shipped exactly that failure before (fixtures/README.md, control 2).
    expect(assets.descriptors.length).toBeGreaterThan(0);
    for (const descriptor of assets.descriptors) {
      expect(descriptor.key.startsWith('private/')).toBe(false);
    }
  }, 60_000);
});
