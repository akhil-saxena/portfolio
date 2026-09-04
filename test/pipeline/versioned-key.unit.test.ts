/**
 * CONT-05 — two different byte sequences for the same photograph cannot share a URL.
 * (Plan 04-05, Task 2. OD-1 option A: content-hashed keys.)
 *
 * WHAT THIS IS A PROOF OF, AND WHAT IT IS NOT
 * -------------------------------------------
 * `04-RESEARCH.md` §4 measured the problem: a GET of an existing photograph returns
 * `cache-control: max-age=14400` — a FOUR-HOUR BROWSER cache injected by the zone, which no
 * server-side purge can reach. So re-uploading a photograph at the same path serves stale bytes to
 * a returning visitor for up to four hours and there is no operational fix. The only mechanism that
 * works is a URL that changes when the bytes change.
 *
 * This file proves the MECHANISM: the URL a record carries is a function of the bytes that were
 * derived for it, so new bytes get a new URL and identical bytes get the identical URL. It does NOT
 * prove that the CDN then serves the new bytes — that needs a real write and real edge propagation,
 * and `04-VALIDATION.md` lists it as manual (`curl` GET twice, never HEAD: HEAD returns `DYNAMIC`
 * with no `cache-control` at all and will mislead).
 *
 * THE FAILURE THIS FILE IS WRITTEN AGAINST
 * ----------------------------------------
 * Hashing the SOURCE once and stamping that one hash onto all four variant keys. It looks correct,
 * it satisfies "the URL changes when the photograph changes", and it defeats the point for three
 * of the four variants: re-encoding at a new quality changes `-lg` and `-sm` while leaving the
 * source byte-identical, so those two would keep their old URLs and keep serving old bytes. Every
 * variant is hashed from ITS OWN emitted buffer, and section 3 below is the assertion that says so.
 *
 * IT DOES NOT CALL THE PRODUCER'S COMPOSERS. Per the suite convention stated in
 * `photo-enrichment.unit.test.ts`, the expected key, URL and hash are written out here — origin
 * from `src/lib/image-origin.ts` (the one place the hostname is written; a local copy could assert
 * an origin the data does not use and still pass), everything else from string literals and a
 * locally written sha256. `contentHash`, `publishedKey` and `publishedUrl` are deliberately NOT
 * imported.
 *
 * The derived-assets builder is local rather than in `test/pipeline/fixtures/` because plan 04-04
 * owns that directory in the same wave.
 *
 * FILENAME CONTRACT: `*.unit.test.ts` — the three Vitest project globs are mutually exclusive.
 */

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

/** Restated, never imported: sha256 truncated to four bytes = eight hex characters. */
const sha8 = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 8);

/** The four remote variants and the suffix each key carries. Written out. */
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

/** Build the assets object with an explicit payload per variant, so each can be varied alone. */
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

/** Independently composed expectation: origin + literal path + locally computed hash. */
const expectUrl = (payload: string, suffix: string): string =>
  `${IMAGE_ORIGIN}/photos/${CATEGORY}/${SLUG}-${sha8(encode(payload))}${suffix}.webp`;

/* ==============================================================================================
 * 1. The URL is a function of the bytes.
 * ========================================================================================== */

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
    // If this failed, "different bytes give different URLs" would be satisfied by a random
    // suffix, and idempotence (PIPE-03) would be impossible: every re-run would produce four new
    // objects and an ever-growing bucket.
    expect(urlOf(build(V1), 'original')).toBe(urlOf(build(V1), 'original'));
    expect(JSON.stringify(build(V1).urls)).toBe(JSON.stringify(build(V1).urls));
  });
});

/* ==============================================================================================
 * 2. The previous version's bytes are never overwritten.
 * ========================================================================================== */

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
    // The record is committed JSON, so the previous version's four addresses are in the previous
    // commit of `data/portfolio_images.json`. This asserts the property the recovery depends on:
    // the old URL is still a well-formed address of the OLD bytes, distinct from the new one, so
    // nothing was mutated in place.
    const first = build(V1);
    const second = build(V2);
    expect(urlOf(first, 'original')).toBe(expectUrl(V1.original, ''));
    expect(urlOf(second, 'original')).toBe(expectUrl(V2.original, ''));
    expect(new URL(urlOf(first, 'original')).origin).toBe(IMAGE_ORIGIN);
  });

  it('a change confined to metadata does not move the URLs', () => {
    // Only the bytes address the object. Re-running with the same buffers and different source
    // dimensions must not orphan four live objects.
    const same = build(V1, { width: 3000, height: 2000 });
    const first = build(V1);
    expect(JSON.stringify(same.urls)).toBe(JSON.stringify(first.urls));
    expect(same.dimensions).not.toEqual(first.dimensions);
  });
});

/* ==============================================================================================
 * 3. EVERY VARIANT IS HASHED FROM ITS OWN BUFFER.  The failure this file exists for.
 * ========================================================================================== */

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
    // The single-source-hash bug passes every assertion above this one and fails this one. It is
    // the whole reason the assertion exists: re-encoding at a new quality changes `-sm` while the
    // source stays byte-identical, and a source-derived hash would keep serving the old thumbnail.
    const first = build(V1);
    const tweaked = build({ ...V1, small: 'SMALL-v2' });

    expect(urlOf(tweaked, 'small')).not.toBe(urlOf(first, 'small'));
    expect(urlOf(tweaked, 'original')).toBe(urlOf(first, 'original'));
    expect(urlOf(tweaked, 'large')).toBe(urlOf(first, 'large'));
    expect(urlOf(tweaked, 'medium')).toBe(urlOf(first, 'medium'));
  });

  it('identical buffers across all four variants produce four identical hashes', () => {
    // The converse control. It proves the hash comes from the BUFFER and not from the suffix or
    // the url key — if it were salted per variant this would be four different hashes and the
    // previous test would pass for the wrong reason.
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

/* ==============================================================================================
 * 4. A hash the caller supplies is CHECKED, not trusted.
 * ========================================================================================== */

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
    // The uploader (04-09) addresses an object by a key it composed from a hash. If that hash and
    // the hash in the record ever disagreed, the manifest would point at objects that were never
    // written — the exact failure `scripts/verify-photo-urls.mjs` exists to catch, caught here
    // instead, before anything is uploaded.
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
    // Rebuilt without `medium` rather than `delete`d: an index-signature delete is a type error
    // under this tsconfig, and rebuilding says the same thing without one.
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
