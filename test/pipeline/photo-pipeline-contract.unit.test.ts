/**
 * The contract test for `src/lib/photo-pipeline.ts` (plan 04-02).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * Eight other plans in Phase 4 import that module and none of them re-derives any of it. So the
 * module is the phase's interface, and this file is what stops the interface changing silently.
 *
 * WHY IT RE-IMPLEMENTS RATHER THAN IMPORTS
 * ----------------------------------------
 * The suite's stated convention, from `test/content/photo-enrichment.unit.test.ts`: *"Importing
 * the merge's own parser would make this file assert that the merge agrees with itself."* So
 * every expected key, URL, id and regex below is COMPOSED FROM LITERALS here and compared to what
 * the producer returns. `publishedKey` is never checked with `parsePublishedKey`, and the variant
 * numbers are typed out again rather than read from `VARIANTS`.
 *
 * The two exceptions are deliberate and are the opposite of circular:
 *   - `REMOTE_URL_KEYS` and `IMAGE_ORIGIN` are imported from `src/lib/image-origin.ts`, which is
 *     the OTHER side of the agreement being asserted. A literal here would let both sides drift
 *     together.
 *   - `THUMB_PREFIX` is imported from `src/schemas/photo.ts` for the same reason — that is the
 *     schema that enforces the prefix, and comparing the pipeline's copy against a literal
 *     re-typed here would be the self-agreement this file exists to avoid. That import is why
 *     plan 04-02 added the one-word `export` in `photo.ts`.
 *
 * THE 39-RECORD CORPUS IS USED AS A **FLOOR**, NEVER AS A COUNT
 * ------------------------------------------------------------
 * Phase 4 appends records, so `manifest.length` is asserted with `toBeGreaterThanOrEqual` — the
 * shape `scripts/assert-no-r2dev-urls.mjs` already uses at its `EXPECTED_RECORDS` guard, and the
 * classification plan 04-01 introduced. The `alt` corpus below is iterated over the WHOLE
 * manifest, so a 40th record strengthens the proof instead of falsifying it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../../src/lib/image-origin';
import {
  ALT_MIN_LENGTH,
  ALT_PLACEHOLDER_EXACT,
  ALT_PLACEHOLDER_LEADING,
  altRefusalReason,
  assertPublishableAlt,
  assertStagingKey,
  CONTENT_HASH_BYTES,
  CONTENT_HASH_HEX_LENGTH,
  contentHash,
  DISPATCH_INPUTS,
  OBJECT_CACHE_CONTROL,
  PHOTO_ID_SEPARATOR,
  PUBLISH_BRANCH,
  PUBLISH_RETRY_LIMIT,
  PUBLISHED_PREFIX,
  photoIdFor,
  publishedKey,
  publishedUrl,
  STAGING_BUCKET,
  STAGING_EXPIRE_DAYS,
  STAGING_KEY_RE,
  STAGING_PREFIX,
  slugFromPublishedKey,
  THUMB,
  VARIANTS,
} from '../../src/lib/photo-pipeline';
import { THUMB_PREFIX } from '../../src/schemas/photo';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (relative: string): string => readFileSync(`${REPO_ROOT}${relative}`, 'utf8');

/** The floor from `scripts/assert-no-r2dev-urls.mjs`. A FLOOR, not a count — see the header. */
const RECORD_FLOOR = 39;

type ManifestRecord = { id: string; title: string; alt: string; category: string };
const manifest = JSON.parse(read('data/portfolio_images.json')) as ManifestRecord[];

/* ============================================================================================
 * 1. The constants. Typed out again here; if one changes, this file has to change with it, which
 *    is the point — eight plans read them.
 * ========================================================================================== */

describe('the constants eight plans import', () => {
  it('STAGING_PREFIX is temp/ (OD-6) and PUBLISHED_PREFIX is photos/ (OD-1)', () => {
    expect(STAGING_PREFIX).toBe('temp/');
    expect(PUBLISHED_PREFIX).toBe('photos/');
  });

  it('STAGING_BUCKET is byte-equal to wrangler.jsonc r2_buckets[].bucket_name', () => {
    // Read independently, by regex, so this does not depend on a JSONC parser. Exactly one
    // bucket must be declared: with two, "the bucket name" is not a well-defined value and
    // picking the first would be a guess.
    const matches = [...read('wrangler.jsonc').matchAll(/"bucket_name"\s*:\s*"([^"]+)"/g)];
    expect(matches).toHaveLength(1);
    expect(STAGING_BUCKET).toBe(matches[0][1]);
  });

  it('STAGING_EXPIRE_DAYS is a positive whole number of days', () => {
    // 04-10 compares a live lifecycle rule against this. R2 granularity is days.
    expect(Number.isInteger(STAGING_EXPIRE_DAYS)).toBe(true);
    expect(STAGING_EXPIRE_DAYS).toBeGreaterThan(0);
    expect(STAGING_EXPIRE_DAYS).toBe(7);
  });

  it('OBJECT_CACHE_CONTROL is the immutable year (OD-1 A)', () => {
    expect(OBJECT_CACHE_CONTROL).toBe('public, max-age=31536000, immutable');
  });

  it('PUBLISH_BRANCH is main and PUBLISH_RETRY_LIMIT is a small bound (OD-7 A)', () => {
    expect(PUBLISH_BRANCH).toBe('main');
    expect(PUBLISH_RETRY_LIMIT).toBe(3);
    expect(PUBLISH_RETRY_LIMIT).toBeGreaterThan(0);
  });

  it('CONTENT_HASH_BYTES is a BYTE count and the hex length is twice it', () => {
    // The naming hazard, asserted rather than only commented: a downstream
    // `hash.slice(0, CONTENT_HASH_BYTES)` would produce four characters, not eight.
    expect(CONTENT_HASH_BYTES).toBe(4);
    expect(CONTENT_HASH_HEX_LENGTH).toBe(8);
    expect(CONTENT_HASH_HEX_LENGTH).toBe(CONTENT_HASH_BYTES * 2);
  });
});

/* ============================================================================================
 * 2. CONT-05's mechanism: two byte sequences cannot share a URL.
 * ========================================================================================== */

describe('contentHash — the CONT-05 mechanism', () => {
  const alpha = new TextEncoder().encode('the first photograph, as bytes');
  const beta = new TextEncoder().encode('the second photograph, as bytes');

  it('two different byte buffers produce two different published keys', () => {
    const first = publishedKey({
      category: 'nature',
      slug: 'riverbend',
      hash: contentHash(alpha),
      suffix: '-lg',
    });
    const second = publishedKey({
      category: 'nature',
      slug: 'riverbend',
      hash: contentHash(beta),
      suffix: '-lg',
    });
    expect(first).not.toBe(second);
  });

  it('identical byte buffers produce the identical key — content-addressed, not random', () => {
    const again = new TextEncoder().encode('the first photograph, as bytes');
    expect(contentHash(again)).toBe(contentHash(alpha));
    expect(contentHash(alpha)).toBe(contentHash(alpha));
  });

  it('the hash is eight lower-case hex characters', () => {
    expect(contentHash(alpha)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is the real sha256 prefix, not a hand-rolled digest (ASVS V6)', () => {
    // A hand-rolled hash would be self-consistent and would pass every assertion above, so the
    // digest is pinned against two PUBLISHED constants rather than against itself:
    //   sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    //   md5("hello")    = 5d41402abc4b2a76b9719d911017c592
    // The pipeline must agree with the first eight characters of the former, and differ from the
    // latter — which is what catches a silent swap to a cheaper algorithm.
    expect(contentHash('hello')).toBe('2cf24dba');
    expect(contentHash('hello')).not.toBe('5d41402a');
  });

  it('publishedKey REFUSES a hash that is not eight hex characters', () => {
    // The CONTENT_HASH_BYTES misuse guard: a four-character slice fails loudly at the first
    // key composition rather than silently shortening every URL in the manifest.
    expect(() =>
      publishedKey({ category: 'nature', slug: 'riverbend', hash: '2cf2', suffix: '' })
    ).toThrow(/hex/i);
    expect(() =>
      publishedKey({ category: 'nature', slug: 'riverbend', hash: '2CF24DBA', suffix: '' })
    ).toThrow(/hex/i);
  });
});

/* ============================================================================================
 * 3. The published key and its URL.
 * ========================================================================================== */

describe('publishedKey / publishedUrl', () => {
  it('composes photos/<category>/<slug>-<hash8><suffix>.webp', () => {
    // Composed from literals, NOT from PUBLISHED_PREFIX or VARIANTS.
    expect(
      publishedKey({ category: 'nature', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '-lg' })
    ).toBe('photos/nature/riverbend-a1b2c3d4-lg.webp');
    expect(
      publishedKey({ category: 'nature', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '' })
    ).toBe('photos/nature/riverbend-a1b2c3d4.webp');
  });

  it('refuses a category or slug outside the schema slug grammar', () => {
    expect(() =>
      publishedKey({ category: 'Nature', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '' })
    ).toThrow(/a-z0-9/);
    expect(() =>
      publishedKey({ category: 'nature', slug: 'river bend', hash: 'a1b2c3d4', suffix: '' })
    ).toThrow(/a-z0-9/);
    expect(() =>
      publishedKey({ category: 'nature', slug: '../etc', hash: 'a1b2c3d4', suffix: '' })
    ).toThrow(/a-z0-9/);
  });

  it('refuses a suffix that is not one of the four variants', () => {
    expect(() =>
      publishedKey({ category: 'nature', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '-xl' })
    ).toThrow(/suffix/i);
  });

  it('publishedUrl parses to an origin EXACTLY equal to IMAGE_ORIGIN', () => {
    const url = publishedUrl('photos/nature/riverbend-a1b2c3d4-lg.webp');
    // Origin equality — the same comparison PhotoSchema's remoteUrl refinement makes. A
    // startsWith is defeated by https://HOST.evil.test/ and https://HOST@evil.test/.
    expect(new URL(url).origin).toBe(IMAGE_ORIGIN);
    expect(new URL(url).pathname).toBe('/photos/nature/riverbend-a1b2c3d4-lg.webp');
  });

  it('publishedUrl refuses a key that is not a published key', () => {
    expect(() => publishedUrl('temp/riverbend.jpg')).toThrow(/published key/);
    expect(() => publishedUrl('')).toThrow(/published key/);
  });

  it('the module contains no hostname literal (OD-3)', () => {
    // The hostname is derived from IMAGE_ORIGIN so this assertion contains no literal either.
    const source = read('src/lib/photo-pipeline.ts');
    expect(source).not.toContain(new URL(IMAGE_ORIGIN).hostname);
    // ... and it never READS the retired secret. The module NAMES it, in the OD-3 paragraph of
    // its header, which is the point of that paragraph — so the assertion is on a read, not on
    // a mention. Three read shapes: process.env.X, an `env.X` binding, and an astro:env import.
    expect(source).not.toMatch(/process\.env\s*[.[]\s*['"]?R2_PUBLIC_URL/);
    expect(source).not.toMatch(/\benv\s*[.[]\s*['"]?R2_PUBLIC_URL/);
    expect(source).not.toMatch(/import\s*\{[^}]*R2_PUBLIC_URL[^}]*\}/);
    expect(source).toMatch(/import\s*\{[^}]*IMAGE_ORIGIN[^}]*\}\s*from\s*'\.\/image-origin\.ts'/);
  });

  it('every relative import in the module carries a .ts extension', () => {
    // Not cosmetic. `scripts/**` imports this module with plain `node` on the Actions runner,
    // and Node's ESM resolver will not resolve an extensionless relative TypeScript path —
    // measured as ERR_MODULE_NOT_FOUND against src/schemas/photo.ts, which is why this module
    // does not import that file. An extensionless import added here would break every wave-5
    // script at load time, and `npm run check` (biome + prettier) cannot see it.
    const source = read('src/lib/photo-pipeline.ts');
    const relativeImports = [...source.matchAll(/from\s*'(\.[^']*)'/g)].map((m) => m[1]);
    expect(relativeImports.length).toBeGreaterThan(0);
    for (const specifier of relativeImports) {
      expect(specifier.endsWith('.ts')).toBe(true);
    }
  });
});

/* ============================================================================================
 * 4. The round trip.
 * ========================================================================================== */

describe('slugFromPublishedKey is the inverse of publishedKey', () => {
  const suffixes = ['', '-lg', '-md', '-sm'] as const;
  const slugs = [
    'riverbend',
    'river-bend',
    'hawamahal-daytime-2024',
    '40-4-boats',
    'pano-lg', // a slug that ENDS in a variant suffix
    'nature-deadbeef', // a slug that ends in something hash-shaped
    'a', // one character
  ] as const;

  for (const slug of slugs) {
    for (const suffix of suffixes) {
      it(`round-trips ${slug || '(empty)'} with suffix "${suffix}"`, () => {
        const key = publishedKey({ category: 'nature', slug, hash: 'a1b2c3d4', suffix });
        expect(slugFromPublishedKey(key)).toBe(slug);
      });
    }
  }

  it('refuses a key it cannot parse rather than returning a wrong slug', () => {
    expect(() => slugFromPublishedKey('photos/nature/riverbend.webp')).toThrow(/published key/);
    expect(() => slugFromPublishedKey('temp/riverbend.jpg')).toThrow(/published key/);
  });
});

/* ============================================================================================
 * 5. The variant table cannot drift from the manifest's remote key list.
 * ========================================================================================== */

describe('VARIANTS', () => {
  it('urlKeys deep-equal REMOTE_URL_KEYS, in order', () => {
    expect(VARIANTS.map((variant) => variant.urlKey)).toEqual([...REMOTE_URL_KEYS]);
  });

  it('carries the widths and qualities measured from the legacy pipeline', () => {
    // Typed out again from `git show legacy/nextjs-portfolio:scripts/process-images.js`, and
    // confirmed against served bytes (a 400px -sm.webp decodes to 400x267).
    expect(VARIANTS).toEqual([
      { urlKey: 'original', suffix: '', maxWidth: 2000, quality: 85 },
      { urlKey: 'large', suffix: '-lg', maxWidth: 1200, quality: 85 },
      { urlKey: 'medium', suffix: '-md', maxWidth: 800, quality: 85 },
      { urlKey: 'small', suffix: '-sm', maxWidth: 400, quality: 80 },
    ]);
  });

  it('has four distinct suffixes, one of them empty for the original', () => {
    const suffixes = VARIANTS.map((variant) => variant.suffix);
    expect(new Set(suffixes).size).toBe(suffixes.length);
    expect(suffixes).toContain('');
  });

  it('THUMB is 40px q60 and its prefix IS the one PhotoUrlsSchema enforces', () => {
    expect(THUMB.width).toBe(40);
    expect(THUMB.quality).toBe(60);
    // Imported from src/schemas/photo.ts — the enforcing side. Comparing against a literal
    // re-typed here would be the self-agreement this file exists to avoid.
    expect(THUMB.dataUriPrefix).toBe(THUMB_PREFIX);
  });

  it('thumb is NOT a remote url key — it carries no hostname', () => {
    expect([...REMOTE_URL_KEYS]).not.toContain('thumb');
  });
});

/* ============================================================================================
 * 6. T-04-04 — the staging key validator.
 * ========================================================================================== */

describe('assertStagingKey (threat T-04-04: attacker-influenced R2 object path)', () => {
  it('accepts a real staged upload key', () => {
    expect(() => assertStagingKey('temp/2026-08-26-riverbend.jpg')).not.toThrow();
    expect(() => assertStagingKey('temp/nested/2026-08-26-riverbend.jpg')).not.toThrow();
  });

  const rejected: ReadonlyArray<readonly [string, unknown]> = [
    ['wrong prefix', 'photos/x.webp'],
    ['traversal', 'temp/../secrets'],
    ['traversal, deeper', 'temp/a/../../secrets'],
    ['absolute', '/temp/x.jpg'],
    ['empty remainder', 'temp/'],
    ['prefix not at the start', '../temp/x.jpg'],
    ['wrong case', 'Temp/x.jpg'],
    ['empty string', ''],
    ['backslash separator', 'temp\\x.jpg'],
    ['dotfile segment', 'temp/.env'],
    ['bare prefix, no slash', 'temp'],
    ['not a string', 42],
    ['null', null],
    ['undefined', undefined],
  ];

  for (const [label, value] of rejected) {
    it(`REFUSES ${label}: ${JSON.stringify(value)}`, () => {
      expect(() => assertStagingKey(value)).toThrow();
      // The message must name the prefix, or the operator cannot tell what was expected.
      let message = '';
      try {
        assertStagingKey(value);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain(STAGING_PREFIX);
    });
  }

  it('STAGING_KEY_RE is anchored at both ends', () => {
    expect(STAGING_KEY_RE.source.startsWith('^')).toBe(true);
    expect(STAGING_KEY_RE.source.endsWith('$')).toBe(true);
    // An unanchored pattern would accept a key with the staging prefix buried in the middle.
    expect(STAGING_KEY_RE.test('x/temp/y.jpg')).toBe(false);
  });

  it('is stricter than the legacy /api/dispatch validator it replaces', () => {
    // The legacy pattern was /^temp\/[a-zA-Z0-9._\/-]+$/, which ACCEPTS a traversal because
    // "." and "/" are both in its class. Asserted here so a future "simplification" back to it
    // fails rather than passing quietly.
    const legacy = /^temp\/[a-zA-Z0-9._/-]+$/;
    expect(legacy.test('temp/../secrets')).toBe(true);
    expect(STAGING_KEY_RE.test('temp/../secrets')).toBe(false);
  });
});

/* ============================================================================================
 * 7. The record id — the NEW invariant, since OD-1 A broke the old one.
 * ========================================================================================== */

describe('photoIdFor', () => {
  it('is category + "-" + slug and satisfies the schema slug grammar', () => {
    expect(photoIdFor({ category: 'nature', slug: 'riverbend' })).toBe('nature-riverbend');
    expect(PHOTO_ID_SEPARATOR).toBe('-');
    // Re-implemented from src/schemas/photo.ts's SLUG, not imported.
    expect(photoIdFor({ category: 'nature', slug: 'river-bend-2' })).toMatch(/^[a-z0-9-]+$/);
  });

  it('agrees with every existing record id, which is the OLD era read forwards', () => {
    // The 39 committed ids were `category + "-" + basename(urls.original)`. For every one of
    // them the basename WAS the slug, so recomposing from category + slug must reproduce the id
    // exactly. A floor, not a count — Phase 4 appends.
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    for (const record of manifest) {
      const slug = record.id.slice(`${record.category}-`.length);
      expect(record.id.startsWith(`${record.category}-`)).toBe(true);
      expect(photoIdFor({ category: record.category, slug })).toBe(record.id);
    }
  });

  it('refuses a category or slug outside the grammar rather than joining them anyway', () => {
    expect(() => photoIdFor({ category: 'Nature', slug: 'riverbend' })).toThrow(/a-z0-9/);
    expect(() => photoIdFor({ category: 'nature', slug: 'river bend' })).toThrow(/a-z0-9/);
  });
});

/* ============================================================================================
 * 8. The dispatch interface (OD-2). 04-08 generates the workflow's inputs: block from this.
 * ========================================================================================== */

describe('DISPATCH_INPUTS', () => {
  it('names, in order, are the five OD-2 A inputs', () => {
    expect(DISPATCH_INPUTS.map((input) => input.name)).toEqual([
      'temp_key',
      'category',
      'title',
      'alt',
      'place',
    ]);
  });

  it('alt is REQUIRED — that is what OD-2 A decided', () => {
    const alt = DISPATCH_INPUTS.find((input) => input.name === 'alt');
    expect(alt?.required).toBe(true);
  });

  it('only place is optional', () => {
    expect(DISPATCH_INPUTS.filter((input) => !input.required).map((i) => i.name)).toEqual([
      'place',
    ]);
  });

  it('every name is a legal workflow_dispatch input name and every description is real', () => {
    for (const input of DISPATCH_INPUTS) {
      expect(input.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(input.description.length).toBeGreaterThan(20);
    }
    expect(DISPATCH_INPUTS.length).toBeLessThanOrEqual(10);
  });
});

/* ============================================================================================
 * 9. OD-2b — the placeholder refusal, and the proof it cannot fire on real alt text.
 * ========================================================================================== */

describe('altRefusalReason — OD-2b REFUSES a placeholder', () => {
  const TITLE = 'Into The Mist';
  const FILENAME = 'DSC_04812.JPG';

  const refused: ReadonlyArray<readonly [string, unknown]> = [
    ['TODO', 'TODO'],
    ['lower-case todo', 'todo'],
    ['mixed case with padding', '  ToDo  '],
    ['TODO with trailing punctuation', 'TODO.'],
    ['TODO used as a prefix — the walk-through hole', 'TODO: add real alt text later'],
    ['TBD', 'TBD'],
    ['TBD as a prefix', 'TBD - waiting on Akhil to write this'],
    ['FIXME', 'FIXME'],
    ['XXX', 'XXX'],
    ['???', '???'],
    ['the bare word alt', 'alt'],
    ['the bare word photo', 'Photo'],
    ['the bare word image', 'image'],
    ['the bare word picture', 'picture'],
    ['too short', 'a bird'],
    ['empty', ''],
    ['whitespace only', '   \n\t '],
    ['not a string', undefined],
    ['a number', 7],
  ];

  for (const [label, alt] of refused) {
    it(`REFUSES ${label}: ${JSON.stringify(alt)}`, () => {
      const reason = altRefusalReason({ alt, title: TITLE, filename: FILENAME });
      expect(reason).not.toBeNull();
      expect(typeof reason).toBe('string');
      expect((reason as string).length).toBeGreaterThan(20);
      expect(() => assertPublishableAlt({ alt, title: TITLE, filename: FILENAME })).toThrow();
    });
  }

  it('REFUSES a value equal to the title, verbatim or re-cased', () => {
    expect(altRefusalReason({ alt: TITLE, title: TITLE })).not.toBeNull();
    expect(altRefusalReason({ alt: 'into   the mist', title: TITLE })).not.toBeNull();
  });

  it('REFUSES a value equal to the filename, with or without its extension', () => {
    expect(altRefusalReason({ alt: FILENAME, title: TITLE, filename: FILENAME })).not.toBeNull();
    expect(altRefusalReason({ alt: 'dsc_04812', title: TITLE, filename: FILENAME })).not.toBeNull();
  });

  it('the token lists are non-empty — an emptied list must be a visible change', () => {
    expect(ALT_PLACEHOLDER_EXACT.length).toBeGreaterThanOrEqual(9);
    expect(ALT_PLACEHOLDER_LEADING.length).toBeGreaterThanOrEqual(4);
    for (const token of ALT_PLACEHOLDER_LEADING) {
      expect(ALT_PLACEHOLDER_EXACT).toContain(token);
    }
    // The four ordinary English words are exact-match ONLY. If one is ever added to the leading
    // list, the legitimate captions below start failing — this assertion says so up front.
    for (const word of ['alt', 'photo', 'image', 'picture']) {
      expect(ALT_PLACEHOLDER_LEADING).not.toContain(word);
    }
  });
});

describe('altRefusalReason — OD-2b ACCEPTS legitimate alt text', () => {
  // THE FALSE-POSITIVE PROOF. A refusal that rejects real alt text is worse than none, so every
  // caption here contains a placeholder token as a WORD or a SUBSTRING and must PASS. If anyone
  // "tightens" the rule into a substring test, these fail first.
  const accepted = [
    'Photo taken from the fort wall at dusk',
    'Image reflected in the still water below the ghat',
    'A picture window framing the ridgeline at first light',
    'Altocumulus banked over the ridge before the rain came',
    'The alto sax case propped open on a bar stool',
    'Todo el mundo crowds the square at sunset in Cartagena',
    'Kingfisher dive',
  ] as const;

  for (const alt of accepted) {
    it(`ACCEPTS ${JSON.stringify(alt)}`, () => {
      expect(
        altRefusalReason({ alt, title: 'Into The Mist', filename: 'DSC_04812.JPG' })
      ).toBeNull();
      expect(() => assertPublishableAlt({ alt })).not.toThrow();
    });
  }

  it('the shortest accepted caption is exactly at the floor, and one below it is refused', () => {
    const atFloor = 'Kingfisher dive';
    expect(atFloor.length).toBe(ALT_MIN_LENGTH);
    expect(altRefusalReason({ alt: atFloor })).toBeNull();
    expect(altRefusalReason({ alt: atFloor.slice(0, ALT_MIN_LENGTH - 1) })).not.toBeNull();
  });

  it('ACCEPTS every reviewed alt value in the manifest — the real corpus', () => {
    // Iterated over the WHOLE manifest with a floor, so a 40th record strengthens this.
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    const rejections: string[] = [];
    for (const record of manifest) {
      const reason = altRefusalReason({ alt: record.alt, title: record.title });
      if (reason !== null) rejections.push(`${record.id}: ${reason}`);
    }
    expect(rejections).toEqual([]);
  });
});

/* ============================================================================================
 * 10. The module must not reach the Worker.
 * ========================================================================================== */

describe('module boundary', () => {
  it('nothing else under src/ imports the pipeline contract', () => {
    // node:crypto lives in that module. wrangler.jsonc sets nodejs_compat, so an accidental
    // import into a Worker-side module would NOT fail loudly — it would quietly ship the
    // pipeline into the bundle. That is exactly why the boundary needs an assertion rather
    // than a runtime error.
    const files = listSourceFiles(`${REPO_ROOT}src`);
    // GUARD AGAINST NOTHING: a walk that visited no file would pass this trivially.
    expect(files.length).toBeGreaterThan(10);
    // An IMPORT, not a mention. `src/schemas/photo.ts` legitimately NAMES this module in a
    // comment explaining why the thumb prefix is declared in both places, and a bare
    // `includes('photo-pipeline')` flagged it — a rule that fires on prose is a rule that gets
    // deleted within a week, at which point it protects nothing.
    const importsPipeline = /(?:from\s*|import\s*\(\s*)['"][^'"]*photo-pipeline/;
    const offenders = files.filter((file) => {
      if (file.endsWith('/photo-pipeline.ts')) return false;
      return importsPipeline.test(readFileSync(file, 'utf8'));
    });
    expect(offenders).toEqual([]);
  });
});

function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = `${root}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listSourceFiles(absolute));
    else if (/\.(ts|tsx|astro|js|jsx|mjs)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}
