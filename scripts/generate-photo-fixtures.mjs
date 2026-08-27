#!/usr/bin/env node
/**
 * Regenerate the three photo-pipeline fixtures and their expectation table.
 *
 * ---------------------------------------------------------------------------------------
 * WHERE THIS RUNS — DEPENDENCY TIER (threat T-04-15)
 *
 * NODE ONLY. This script imports `sharp`, a **devDependency** and a native binary that can
 * never load inside `workerd`. Nothing under `src/` may import it, and nothing here may be
 * imported by anything under `src/`. It is run by a human, or by CI, never by the Worker.
 * `gate:schema` and the adapter build would surface a `src/` import; this header states the
 * rule so a reader does not have to derive it from a build failure.
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS SCRIPT IS COMMITTED RATHER THAN THE FIXTURES BEING HAND-MADE
 *
 * 04-04 Task 1 measured that the EXIF regression corpus OD-12 assumed — the 39 live
 * originals — DOES NOT EXIST: all 39 objects in R2 are single-chunk WebP with no EXIF, XMP
 * or ICC, because the legacy encoder never called `withMetadata()`. See
 * `test/pipeline/fixtures/README.md` and `exif-differential.txt` for the byte-level proof.
 *
 * That makes these fixtures the ONLY evidence the EXIF mapping is correct. So they have to
 * be regenerable: when someone later swaps the reader library, or bumps sharp across a
 * libvips major, the question "does the mapping still hold?" must be answerable by running
 * this file, not by squinting at three committed binaries nobody can rebuild.
 *
 * ---------------------------------------------------------------------------------------
 * WHY `EXPECTED_FIELDS` IS WRITTEN OUT BY HAND AND NOT COMPUTED
 *
 * `expected-exif.json` is the EXPECTATION TABLE. It is emitted by this script, from the
 * same run that writes the EXIF, so the file and its expectation cannot drift apart — but
 * the six schema values in it are **declared as literals below, not derived by running the
 * mapper**. If they were computed, a broken mapper would rewrite the expectation to match
 * itself and the test would agree with the bug. 03-04's lesson, applied: the anti-vacuity
 * clause is driven by the expectation table, never by the data.
 *
 * Usage:  node scripts/generate-photo-fixtures.mjs
 * Output: test/pipeline/fixtures/{rich-exif.jpg,no-exif.jpg,small-320px.jpg,expected-exif.json}
 *
 * Byte-determinism is a property this script MUST hold — `test/pipeline/fixtures.unit.test.ts`
 * asserts that regenerating leaves `git diff --quiet` clean. Everything below is therefore a
 * pure function of the constants in this file: the pixels come from a fixed-seed integer
 * generator, never `Math.random()`, and no timestamp, hostname or path is embedded.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'test', 'pipeline', 'fixtures');

/**
 * The seven tags the legacy extractor picks, verbatim:
 *   exifr.parse(f, { pick: ['Make','Model','LensModel','FNumber','ExposureTime','ISO','FocalLength'] })
 * (`git show legacy/nextjs-portfolio:scripts/process-images.js`)
 *
 * `ifd` is where sharp's `withExif` must put each one, and it is not a free choice:
 * `Make`/`Model` are IFD0 (the main image directory) and the other five live in the Exif
 * sub-IFD, which sharp names `IFD2`. Putting a Exif-IFD tag in IFD0 writes a tag libvips
 * does not recognise there and it is silently dropped — measured, which is why the round
 * trip below is asserted rather than assumed.
 *
 * `write` is the string handed to libvips. Rational tags (`FNumber`, `ExposureTime`,
 * `FocalLength`) take `numerator/denominator` form; short/long tags take a decimal string.
 *
 * `parsed` is what `exif-reader` gives back for that tag — MEASURED, then written here.
 * Note two things a "tidy" edit would break:
 *   - the key is `ISOSpeedRatings`, NOT `ISO`. `exifr` surfaced tag 0x8827 as `ISO`;
 *     `exif-reader` surfaces it under its TIFF name. This is precisely the kind of mapping
 *     difference OD-12's differential proof existed to catch, and it is real.
 *   - `ExposureTime` comes back as the NUMBER 0.002, not the string "1/500". The `1/N`
 *     rendering is the mapper's job, not the reader's.
 */
const EXIF_SOURCE = {
  Make: { ifd: 'IFD0', write: 'NIKON CORPORATION', parsed: 'NIKON CORPORATION' },
  Model: { ifd: 'IFD0', write: 'NIKON D5300', parsed: 'NIKON D5300' },
  LensModel: { ifd: 'IFD2', write: '18.0-55.0 mm f/3.5-5.6', parsed: '18.0-55.0 mm f/3.5-5.6' },
  FNumber: { ifd: 'IFD2', write: '11/1', parsed: 11 },
  ExposureTime: { ifd: 'IFD2', write: '1/500', parsed: 0.002 },
  ISOSpeedRatings: { ifd: 'IFD2', write: '200', parsed: 200 },
  FocalLength: { ifd: 'IFD2', write: '40/1', parsed: 40 },
};

/**
 * The six `PhotoExifSchema` fields `rich-exif.jpg` must yield. DECLARED, NOT DERIVED — see
 * the header. Each line is a human asserting what the six values above ought to become
 * under the mapping the legacy extractor defined:
 *
 *   camera      = [Make, Model].filter(Boolean).join(' ')   || null
 *   lens        = LensModel                                  || null
 *   aperture    = FNumber ? `f/${FNumber}` : null
 *   shutter     = ExposureTime < 1 ? `1/${Math.round(1/t)}` : `${t}s`
 *   iso         = ISO || null
 *   focalLength = FocalLength ? `${FocalLength}mm` : null
 *
 * 1/0.002 is exactly 500, so `shutter` has no rounding slack to hide in.
 */
const EXPECTED_FIELDS = {
  camera: 'NIKON CORPORATION NIKON D5300',
  lens: '18.0-55.0 mm f/3.5-5.6',
  aperture: 'f/11',
  shutter: '1/500',
  iso: 200,
  focalLength: '40mm',
};

/**
 * `rich-exif.jpg` and `no-exif.jpg` are 2400px wide so that ALL FOUR variants in
 * `VARIANTS` (2000 / 1200 / 800 / 400) genuinely downscale. `small-320px.jpg` is 320px,
 * i.e. below the smallest of them, which is the `withoutEnlargement` case a naive
 * `resize({ width })` gets wrong by upscaling. The widths are stated here and re-derived
 * from `src/lib/photo-pipeline.ts` in the test, so a change to the variant table that
 * invalidated these fixtures would fail rather than pass quietly.
 */
const WIDE = { width: 2400, height: 1600 };
const SMALL = { width: 320, height: 213 };
const JPEG = { quality: 82, chromaSubsampling: '4:2:0' };

/**
 * Deterministic pixels. A fixed-seed xorshift32 supplies fine dither (+-2); the structure is a
 * smooth two-axis gradient plus low-frequency bands.
 *
 * Both halves matter. A flat colour would compress to almost nothing and would make every
 * later variant-size assertion meaningless — four resizes of a solid rectangle are all the
 * same handful of bytes. Pure noise would be honest but would commit a multi-megabyte
 * binary. This is the middle: real entropy, real edges, ~140 KB.
 *
 * `Math.random()` is deliberately not used anywhere in this file.
 */
function pixels({ width, height }) {
  const buf = Buffer.allocUnsafe(width * height * 3);
  let seed = 0x9e3779b9;
  const next = () => {
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed;
  };
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = (x / width) * 255;
      const gy = (y / height) * 255;
      const band = 40 * Math.sin((x / width) * 12 * Math.PI) * Math.cos((y / height) * 7 * Math.PI);
      const dither = (next() % 5) - 2;
      buf[i++] = clamp(gx * 0.7 + band + dither);
      buf[i++] = clamp((gx + gy) * 0.4 + band * 0.5 + dither);
      buf[i++] = clamp(gy * 0.8 - band + dither);
    }
  }
  return buf;
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

const source = (dims) =>
  sharp(pixels(dims), { raw: { width: dims.width, height: dims.height, channels: 3 } });

/** `{ IFD0: { Make, Model }, IFD2: { ... } }` — assembled from EXIF_SOURCE, never restated. */
function withExifArgument() {
  const out = {};
  for (const [tag, spec] of Object.entries(EXIF_SOURCE)) {
    out[spec.ifd] ??= {};
    out[spec.ifd][tag] = spec.write;
  }
  return out;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const w = (s) => process.stdout.write(`${s}\n`);

mkdirSync(FIXTURES, { recursive: true });

const written = [];
const emit = (name, buf) => {
  writeFileSync(join(FIXTURES, name), buf);
  written.push({ name, bytes: buf.length, sha256: sha256(buf) });
};

// 1. Rich EXIF, wider than every variant.
emit('rich-exif.jpg', await source(WIDE).withExif(withExifArgument()).jpeg(JPEG).toBuffer());

// 2. Identical pixels, NO EXIF written at all. `PhotoExifSchema` is a strictObject of six
//    NULLABLE, NON-OPTIONAL fields, so this file must still yield a complete six-key object
//    of nulls — an absent `exif` object is a schema failure and a null-filled one is not.
emit('no-exif.jpg', await source(WIDE).jpeg(JPEG).toBuffer());

// 3. Narrower than the smallest variant. 04-07's `withoutEnlargement` test depends on it.
emit('small-320px.jpg', await source(SMALL).jpeg(JPEG).toBuffer());

// 4. The expectation table. Emitted from the same run and the same constants as the EXIF
//    above, with a trailing newline so it is a well-formed text file under git.
const expectation = {
  $comment:
    'GENERATED by scripts/generate-photo-fixtures.mjs — do not hand-edit. The six values in ' +
    '"fields" are DECLARED in that script, not computed by any mapper, so a broken mapper ' +
    'cannot rewrite the expectation to agree with itself.',
  fixture: 'rich-exif.jpg',
  reader: 'exif-reader, fed from sharp(...).metadata().exif (OD-12 option B)',
  tags: Object.fromEntries(
    Object.entries(EXIF_SOURCE).map(([tag, spec]) => [tag, { ifd: spec.ifd, parsed: spec.parsed }])
  ),
  fields: EXPECTED_FIELDS,
};
emit('expected-exif.json', Buffer.from(`${JSON.stringify(expectation, null, 2)}\n`, 'utf8'));

for (const f of written) w(`${f.name}  ${f.bytes} bytes  sha256=${f.sha256.slice(0, 16)}`);
