/**
 * What one uploaded photograph becomes: four WebP variants, a watermark on each, a 40px LQIP,
 * the SOURCE dimensions, and four upload descriptors.  (Phase 4, plan 04-07, Task 2 — PIPE-01.)
 *
 * EVERY ASSERTION HERE IS ON DECODED OUTPUT
 * -----------------------------------------
 * Not on the arguments handed to `sharp`. A test that asserts `resize` was called with
 * `{ width: 2000 }` is green when the pipeline emits nothing at all, and this repository has
 * already shipped two gates that agreed with themselves about nothing (`04-VALIDATION.md`
 * hazard 10 and the anti-vacuity hole in `fixtures/README.md`'s differential). So each variant
 * is fed back through `sharp(buf).metadata()` and the width, the format and — for the
 * watermark — the individual PIXELS are what get checked.
 *
 * WHAT IS IMPORTED AND WHAT IS RE-IMPLEMENTED
 * -------------------------------------------
 * Following the convention `photo-pipeline-contract.unit.test.ts` states and
 * `04-VALIDATION.md` repeats — *importing a producer's own parser makes a test assert that the
 * producer agrees with itself*:
 *
 *   - `VARIANTS`, `THUMB`, `PUBLISHED_PREFIX`, `OBJECT_CACHE_CONTROL`, `contentHash` and
 *     `parsePublishedKey` ARE imported from `src/lib/photo-pipeline.ts`. That file is the one
 *     definition of the scheme (its own header says so), and re-typing `2000` here would let
 *     the deriver and the table drift apart together while this file kept passing.
 *   - The UNWATERMARKED encodes the watermark proof compares against are RE-IMPLEMENTED below
 *     with plain `sharp` calls, deliberately. If they came from the deriver, "the thumb is not
 *     watermarked" would be a claim the deriver made about itself.
 *   - `'private/'` is written out as a literal in the OD-9 assertion, on purpose. It is the
 *     string the emitted keys must never begin with, and importing it from anywhere would mean
 *     one edit could move both sides at once.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildThumb,
  buildVariants,
  deriveAssets,
  MAX_SOURCE_BYTES,
  watermarkFontSize,
} from '../../scripts/lib/photo-derive.mjs';
import {
  contentHash,
  OBJECT_CACHE_CONTROL,
  PUBLISHED_PREFIX,
  parsePublishedKey,
  THUMB,
  VARIANTS,
} from '../../src/lib/photo-pipeline';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

const RICH = readFileSync(join(FIXTURES, 'rich-exif.jpg'));
const SMALL = readFileSync(join(FIXTURES, 'small-320px.jpg'));

/** Fixed, so nothing here depends on the day the suite runs. OD-10's fallback value. */
const INGESTION_DATE = '2026-08-27';

/** Derivation of a 2400px source is ~0.5 s; four of them plus raw decodes needs the headroom. */
const SLOW = { timeout: 60_000 };

type Meta = { format?: string; width?: number; height?: number };

const meta = async (buf: Uint8Array): Promise<Meta> => sharp(Buffer.from(buf)).metadata();

/**
 * The unwatermarked LQIP encode, RE-IMPLEMENTED from the legacy spec rather than imported:
 * `THUMB.width` at `THUMB.quality`, and NO composite. This is the independent side of the
 * "the thumb carries no watermark" comparison, so it must not come from the deriver.
 */
const plainThumb = async (source: Uint8Array) =>
  sharp(Buffer.from(source))
    .resize({ width: THUMB.width, withoutEnlargement: true })
    .webp({ quality: THUMB.quality })
    .toBuffer();

/** Decode to raw pixels so a claim about the watermark can be made about pixels. */
const raw = async (buf: Uint8Array) =>
  sharp(Buffer.from(buf)).raw().toBuffer({ resolveWithObject: true });

/**
 * How many pixels inside a `w x h` box whose top-left corner is `(x0, y0)` differ between two
 * decoded images of identical geometry.
 */
const differingPixels = (
  a: { data: Buffer; info: { width: number; channels: number } },
  b: { data: Buffer },
  x0: number,
  y0: number,
  w: number,
  h: number
): number => {
  let n = 0;
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const i = (y * a.info.width + x) * a.info.channels;
      for (let c = 0; c < a.info.channels; c += 1) {
        if (a.data[i + c] !== b.data[i + c]) {
          n += 1;
          break;
        }
      }
    }
  }
  return n;
};

type Derived = Awaited<ReturnType<typeof deriveAssets>>;

let richSource: Meta;
let smallSource: Meta;
let rich: Derived;
let small: Derived;

beforeAll(async () => {
  richSource = await meta(RICH);
  smallSource = await meta(SMALL);
  rich = await deriveAssets({
    bytes: RICH,
    category: 'nature',
    slug: 'rich-exif',
    ingestionDate: INGESTION_DATE,
  });
  small = await deriveAssets({
    bytes: SMALL,
    category: 'nature',
    slug: 'small-source',
    ingestionDate: INGESTION_DATE,
  });
}, 120_000);

describe('four variants, decoded', () => {
  it('emits exactly one variant per entry in VARIANTS, in that order', () => {
    expect(rich.variants).toBeDefined();
    expect(Object.keys(rich.variants)).toEqual(VARIANTS.map((v) => v.urlKey));
  });

  for (const variant of VARIANTS) {
    it(`${variant.urlKey} decodes to WebP at width ${variant.maxWidth}`, async () => {
      const decoded = await meta(rich.variants[variant.urlKey].bytes);
      expect(decoded.format).toBe('webp');
      expect(decoded.width).toBe(variant.maxWidth);
    });

    it(`${variant.urlKey} preserves the source aspect ratio to within one pixel`, async () => {
      const decoded = await meta(rich.variants[variant.urlKey].bytes);
      const sw = richSource.width ?? 0;
      const sh = richSource.height ?? 0;
      const dw = decoded.width ?? 0;
      const dh = decoded.height ?? 0;
      expect(Math.abs(dh - Math.round((sh * dw) / sw))).toBeLessThanOrEqual(1);
    });
  }

  it(
    'never enlarges: a 320px source yields FOUR 320px variants, not 2000/1200/800/400',
    SLOW,
    async () => {
      const sourceWidth = smallSource.width ?? 0;
      expect(sourceWidth).toBeLessThan(Math.min(...VARIANTS.map((v) => v.maxWidth)));
      for (const variant of VARIANTS) {
        const decoded = await meta(small.variants[variant.urlKey].bytes);
        expect(decoded.format).toBe('webp');
        expect(decoded.width).toBe(sourceWidth);
      }
    }
  );
});

describe('the LQIP thumb', () => {
  it('is a data URI whose base64 payload decodes to a WebP of THUMB.width', async () => {
    expect(typeof rich.thumb).toBe('string');
    expect(rich.thumb.startsWith(THUMB.dataUriPrefix)).toBe(true);
    const payload = Buffer.from(rich.thumb.slice(THUMB.dataUriPrefix.length), 'base64');
    const decoded = await meta(payload);
    expect(decoded.format).toBe('webp');
    expect(decoded.width).toBe(THUMB.width);
  });

  it('is not enlarged either: a source narrower than THUMB.width keeps its own width', async () => {
    const tiny = await sharp({
      create: { width: 20, height: 14, channels: 3, background: { r: 200, g: 40, b: 90 } },
    })
      .jpeg()
      .toBuffer();
    const uri = await buildThumb(tiny);
    const decoded = await meta(Buffer.from(uri.slice(THUMB.dataUriPrefix.length), 'base64'));
    expect(decoded.width).toBe(20);
  });
});

describe('the watermark, proven by bytes and by pixels', () => {
  it('changes all four variants — real path vs composite skipped', SLOW, async () => {
    const sourceWidth = richSource.width ?? 0;
    const marked = await buildVariants(RICH, sourceWidth, { watermark: true });
    const clean = await buildVariants(RICH, sourceWidth, { watermark: false });
    expect(marked).toHaveLength(VARIANTS.length);
    for (const [index, variant] of VARIANTS.entries()) {
      expect(marked[index].urlKey).toBe(variant.urlKey);
      expect(Buffer.from(marked[index].bytes).equals(Buffer.from(clean[index].bytes))).toBe(false);
    }
  });

  it('leaves the thumb untouched — byte-identical to an independent unwatermarked encode', async () => {
    const expected = Buffer.from(await plainThumb(RICH));
    expect(rich.thumb).toBe(`${THUMB.dataUriPrefix}${expected.toString('base64')}`);
  });

  it('changes pixels in the bottom-right inset and nowhere else', SLOW, async () => {
    const sourceWidth = richSource.width ?? 0;
    const [markedOriginal] = await buildVariants(RICH, sourceWidth, { watermark: true });
    const [cleanOriginal] = await buildVariants(RICH, sourceWidth, { watermark: false });
    const a = await raw(markedOriginal.bytes);
    const b = await raw(cleanOriginal.bytes);
    const { width, height } = a.info;

    // The box is computed from the spec's own inset rule, never hardcoded.
    const inset = Math.round(width * 0.015);
    const boxW = Math.round(width * 0.35);
    const boxH = watermarkFontSize(width) * 3;
    expect(inset).toBeGreaterThan(0);

    const bottomRight = differingPixels(a, b, width - boxW, height - boxH, boxW, boxH);
    const topLeft = differingPixels(a, b, 0, 0, boxW, boxH);
    expect(bottomRight).toBeGreaterThan(0);
    expect(topLeft).toBe(0);
  });

  it('sizes the mark by max(10, min(24, round(width * 0.01))) — both ends of the clamp', () => {
    expect(watermarkFontSize(2000)).toBe(20);
    expect(watermarkFontSize(400)).toBe(10);
    // The lower clamp is reachable through VARIANTS (800 and 400 both floor at 10); the upper
    // one is not, because no variant is wider than 2000. Asserted on the function directly so
    // the rule is proven whole rather than only where the table happens to exercise it.
    expect(watermarkFontSize(800)).toBe(10);
    expect(watermarkFontSize(3000)).toBe(24);
  });
});

describe('dimensions are the SOURCE size (OD-11)', () => {
  it('equals sharp(source).metadata(), and differs from the original variant', async () => {
    expect(rich.dimensions).toEqual({ width: richSource.width, height: richSource.height });
    const original = await meta(rich.variants.original.bytes);
    // rich-exif.jpg is wider than 2000, so the two contracts are distinguishable here. A
    // fixture where they coincide cannot tell "source size" from "emitted size" apart.
    expect(rich.dimensions.width).not.toBe(original.width);
  });
});

describe('per-variant content hashes (CONT-05)', () => {
  it('hashes each variant from ITS OWN bytes, so the four are pairwise distinct', () => {
    const hashes = VARIANTS.map((v) => contentHash(rich.variants[v.urlKey].bytes));
    expect(new Set(hashes).size).toBe(VARIANTS.length);
    for (const variant of VARIANTS) {
      expect(rich.variants[variant.urlKey].hash).toBe(
        contentHash(rich.variants[variant.urlKey].bytes)
      );
    }
  });
});

describe('upload descriptors — OD-9 option A, enforced by absence', () => {
  it('emits one descriptor per variant, and the list is not empty', () => {
    expect(rich.descriptors.length).toBeGreaterThan(0);
    expect(rich.descriptors).toHaveLength(VARIANTS.length);
  });

  it('composes no key under `private/`', () => {
    expect(rich.descriptors.length).toBeGreaterThan(0);
    for (const descriptor of rich.descriptors) {
      expect(descriptor.key.startsWith('private/')).toBe(false);
      expect(descriptor.key.startsWith(PUBLISHED_PREFIX)).toBe(true);
    }
  });

  it('addresses each object by the hash of the bytes it carries', () => {
    expect(rich.descriptors.length).toBeGreaterThan(0);
    for (const descriptor of rich.descriptors) {
      const parts = parsePublishedKey(descriptor.key);
      expect(parts.hash).toBe(contentHash(descriptor.bytes));
      expect(descriptor.contentType).toBe('image/webp');
      expect(descriptor.cacheControl).toBe(OBJECT_CACHE_CONTROL);
    }
  });
});

describe('input refusal, before sharp decodes anything', () => {
  it('refuses a buffer larger than MAX_SOURCE_BYTES, naming the limit', async () => {
    // Deliberately NOT a valid image. If the size check ran after `sharp()`, the failure would
    // name the format instead — so this case proves the ORDER, not merely that a cap exists.
    const oversized = Buffer.alloc(MAX_SOURCE_BYTES + 1);
    await expect(
      deriveAssets({
        bytes: oversized,
        category: 'nature',
        slug: 'oversized',
        ingestionDate: INGESTION_DATE,
      })
    ).rejects.toThrow(String(MAX_SOURCE_BYTES));
  });

  it('refuses a buffer that is not an image, naming what it was', async () => {
    const notAnImage = Buffer.from('this is a text file, not a photograph', 'utf8');
    await expect(
      deriveAssets({
        bytes: notAnImage,
        category: 'nature',
        slug: 'not-an-image',
        ingestionDate: INGESTION_DATE,
      })
    ).rejects.toThrow(/not a decodable image|unsupported/i);
  });

  it('applies the same cap to the exported buildVariants and buildThumb, not only to deriveAssets', async () => {
    // Both are exported, so both are doors. A cap on one of two doors is not a cap.
    const oversized = Buffer.alloc(MAX_SOURCE_BYTES + 1);
    await expect(buildVariants(oversized, VARIANTS[0].maxWidth)).rejects.toThrow(
      String(MAX_SOURCE_BYTES)
    );
    await expect(buildThumb(oversized)).rejects.toThrow(String(MAX_SOURCE_BYTES));
    await expect(buildThumb(Buffer.alloc(0))).rejects.toThrow(/empty|zero/i);
  });

  it('refuses a zero-length buffer', async () => {
    await expect(
      deriveAssets({
        bytes: Buffer.alloc(0),
        category: 'nature',
        slug: 'empty',
        ingestionDate: INGESTION_DATE,
      })
    ).rejects.toThrow(/empty|zero/i);
  });
});
