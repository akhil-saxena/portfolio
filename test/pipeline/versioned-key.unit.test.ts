import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildRecord } from '../../scripts/lib/photo-record.mjs';
import { IMAGE_ORIGIN } from '../../src/lib/image-origin';
import { type Photo, PhotoSchema } from '../../src/schemas';

const COMMITTED = JSON.parse(
  readFileSync(new URL('../../data/portfolio_images.json', import.meta.url), 'utf8')
) as Photo[];

const CATEGORY = 'landscape';
const SLUG = 'versionproof';
const TITLE = 'Version Proof';
const ALT =
  'Wet stones step down a shallow rapid while spray catches the last of the light above them.';
const DATE = '2026-08-27';
const TEMP_KEY = 'temp/versionproof.jpg';
const THUMB_URI = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

const sha8 = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 8);

const VARIANTS: ReadonlyArray<readonly [string, string]> = [
  ['original', ''],
  ['large', '-lg'],
  ['medium', '-md'],
  ['small', '-sm'],
];

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

interface VariantEntry {
  bytes: Uint8Array;
  hash?: string;
}

interface DerivedAssets {
  slug: string;
  variants: Record<string, VariantEntry>;
  thumb: string;
  dimensions: { width: number; height: number };
  exif: Record<string, string | number | null>;
}

interface Bufs {
  original: string;
  large: string;
  medium: string;
  small: string;
}

const assetsFor = (bufs: Bufs, dimensions = { width: 4608, height: 3072 }): DerivedAssets => ({
  slug: SLUG,
  variants: {
    original: { bytes: encode(bufs.original) },
    large: { bytes: encode(bufs.large) },
    medium: { bytes: encode(bufs.medium) },
    small: { bytes: encode(bufs.small) },
  },
  thumb: THUMB_URI,
  dimensions,
  exif: {
    camera: 'NIKON CORPORATION NIKON D5300',
    lens: '18.0-55.0 mm f/3.5-5.6',
    aperture: 'f/8',
    shutter: '1/250',
    iso: 100,
    focalLength: '35mm',
  },
});

const V1: Bufs = {
  original: 'ORIGINAL-v1',
  large: 'LARGE-v1',
  medium: 'MEDIUM-v1',
  small: 'SMALL-v1',
};
const V2: Bufs = {
  original: 'ORIGINAL-v2',
  large: 'LARGE-v2',
  medium: 'MEDIUM-v2',
  small: 'SMALL-v2',
};

const build = (bufs: Bufs, dimensions?: { width: number; height: number }): Photo =>
  buildRecord({
    inputs: { temp_key: TEMP_KEY, category: CATEGORY, title: TITLE, alt: ALT },
    assets: assetsFor(bufs, dimensions),
    date: DATE,
    manifest: COMMITTED,
  }) as Photo;

const urlOf = (record: Photo, urlKey: string): string =>
  (record.urls as unknown as Record<string, string>)[urlKey];

const expectUrl = (payload: string, suffix: string): string =>
  `${IMAGE_ORIGIN}/photos/${CATEGORY}/${SLUG}-${sha8(encode(payload))}${suffix}.webp`;

describe('a URL is content-addressed', () => {
  it('the composed URL is exactly origin + /photos/<cat>/<slug>-<hash8><suffix>.webp', () => {
    const record = build(V1);
    expect(urlOf(record, 'original')).toBe(expectUrl(V1.original, ''));
    expect(urlOf(record, 'large')).toBe(expectUrl(V1.large, '-lg'));
    expect(urlOf(record, 'medium')).toBe(expectUrl(V1.medium, '-md'));
    expect(urlOf(record, 'small')).toBe(expectUrl(V1.small, '-sm'));
    expect(PhotoSchema.safeParse(record).success).toBe(true);
  });

  it('the hash is exactly eight lowercase hex characters', () => {
    const record = build(V1);
    for (const [urlKey] of VARIANTS) {
      const basename = urlOf(record, urlKey).split('/').pop() ?? '';
      const hash = basename
        .replace(/\.webp$/, '')
        .replace(/-(?:lg|md|sm)$/, '')
        .slice(-8);
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('TWO DIFFERENT BYTE SEQUENCES PRODUCE TWO DIFFERENT urls.original — CONT-05', () => {
    const first = build(V1);
    const second = build(V2);
    expect(urlOf(first, 'original')).not.toBe(urlOf(second, 'original'));
  });

  it('THE SAME BYTES PRODUCE THE SAME URL — content-addressed, not random', () => {
    expect(urlOf(build(V1), 'original')).toBe(urlOf(build(V1), 'original'));
    expect(JSON.stringify(build(V1).urls)).toBe(JSON.stringify(build(V1).urls));
  });
});

describe('a re-run cannot overwrite the bytes a live page is reading', () => {
  it('no URL of the new record equals any URL of the old one', () => {
    const first = build(V1);
    const second = build(V2);
    const oldUrls = new Set(VARIANTS.map(([urlKey]) => urlOf(first, urlKey)));
    expect(oldUrls.size).toBe(4);
    for (const [urlKey] of VARIANTS) {
      expect(oldUrls.has(urlOf(second, urlKey))).toBe(false);
    }
  });

  it('the old URLs stay recoverable — they are values, and git history holds them', () => {
    const first = build(V1);
    const second = build(V2);
    expect(urlOf(first, 'original')).toBe(expectUrl(V1.original, ''));
    expect(urlOf(second, 'original')).toBe(expectUrl(V2.original, ''));
    expect(new URL(urlOf(first, 'original')).origin).toBe(IMAGE_ORIGIN);
  });

  it('a change confined to metadata does not move the URLs', () => {
    const same = build(V1, { width: 3000, height: 2000 });
    const first = build(V1);
    expect(JSON.stringify(same.urls)).toBe(JSON.stringify(first.urls));
    expect(same.dimensions).not.toEqual(first.dimensions);
  });
});

describe('each of the four variants carries its own version', () => {
  it('four different buffers produce four different hashes', () => {
    const record = build(V1);
    const hashes = VARIANTS.map(([urlKey]) => {
      const basename = urlOf(record, urlKey).split('/').pop() ?? '';
      return basename
        .replace(/\.webp$/, '')
        .replace(/-(?:lg|md|sm)$/, '')
        .slice(-8);
    });
    expect(new Set(hashes).size).toBe(4);
  });

  it('changing ONLY the small buffer changes ONLY urls.small', () => {
    const first = build(V1);
    const tweaked = build({ ...V1, small: 'SMALL-v2' });

    expect(urlOf(tweaked, 'small')).not.toBe(urlOf(first, 'small'));
    expect(urlOf(tweaked, 'original')).toBe(urlOf(first, 'original'));
    expect(urlOf(tweaked, 'large')).toBe(urlOf(first, 'large'));
    expect(urlOf(tweaked, 'medium')).toBe(urlOf(first, 'medium'));
  });

  it('identical buffers across all four variants produce four identical hashes', () => {
    const flat = build({ original: 'SAME', large: 'SAME', medium: 'SAME', small: 'SAME' });
    const hashes = VARIANTS.map(([urlKey]) => {
      const basename = urlOf(flat, urlKey).split('/').pop() ?? '';
      return basename
        .replace(/\.webp$/, '')
        .replace(/-(?:lg|md|sm)$/, '')
        .slice(-8);
    });
    expect(new Set(hashes).size).toBe(1);
    expect(hashes[0]).toBe(sha8(encode('SAME')));
  });
});

describe('a precomputed hash cannot drift from the bytes it claims to describe', () => {
  it('a matching hash is accepted', () => {
    const assets = assetsFor(V1);
    for (const [urlKey] of VARIANTS) {
      assets.variants[urlKey].hash = sha8(assets.variants[urlKey].bytes);
    }
    const record = buildRecord({
      inputs: { temp_key: TEMP_KEY, category: CATEGORY, title: TITLE, alt: ALT },
      assets,
      date: DATE,
      manifest: COMMITTED,
    }) as Photo;
    expect(urlOf(record, 'original')).toBe(expectUrl(V1.original, ''));
  });

  it('A HASH THAT DOES NOT MATCH ITS BYTES IS REFUSED', () => {
    const assets = assetsFor(V1);
    assets.variants.large.hash = 'deadbeef';
    expect(() =>
      buildRecord({
        inputs: { temp_key: TEMP_KEY, category: CATEGORY, title: TITLE, alt: ALT },
        assets,
        date: DATE,
        manifest: COMMITTED,
      })
    ).toThrow(/deadbeef|hash/);
  });

  it('a missing variant is refused rather than producing a record with three URLs', () => {
    const complete = assetsFor(V1);
    const { medium: _dropped, ...withoutMedium } = complete.variants;
    const assets = { ...complete, variants: withoutMedium };
    expect(() =>
      buildRecord({
        inputs: { temp_key: TEMP_KEY, category: CATEGORY, title: TITLE, alt: ALT },
        assets,
        date: DATE,
        manifest: COMMITTED,
      })
    ).toThrow(/medium/);
  });

  it('a thumb that is not a webp data URI is refused', () => {
    const assets = { ...assetsFor(V1), thumb: 'https://example.test/thumb.webp' };
    expect(() =>
      buildRecord({
        inputs: { temp_key: TEMP_KEY, category: CATEGORY, title: TITLE, alt: ALT },
        assets,
        date: DATE,
        manifest: COMMITTED,
      })
    ).toThrow(/thumb/);
  });
});
