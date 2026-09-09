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
import {
  PHOTO_ID_SEPARATOR as DECLARED_PHOTO_ID_SEPARATOR,
  THUMB as DECLARED_THUMB,
  VARIANTS as DECLARED_VARIANTS,
} from '../../src/lib/photo-variants';
import { THUMB_PREFIX } from '../../src/schemas/photo';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (relative: string): string => readFileSync(`${REPO_ROOT}${relative}`, 'utf8');

const RECORD_FLOOR = 39;

type ManifestRecord = { id: string; title: string; alt: string; category: string };
const manifest = JSON.parse(read('data/portfolio_images.json')) as ManifestRecord[];

function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (two === '/*') {
      while (i < source.length && source.slice(i, i + 2) !== '*/') {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      out += ch;
      i += 1;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === '\\') {
          out += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += source[i];
        i += 1;
      }
      out += source[i] ?? '';
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

describe('the constants eight plans import', () => {
  it('STAGING_PREFIX is temp/ (OD-6) and PUBLISHED_PREFIX is photos/ (OD-1)', () => {
    expect(STAGING_PREFIX).toBe('temp/');
    expect(PUBLISHED_PREFIX).toBe('photos/');
  });

  it('STAGING_BUCKET is byte-equal to wrangler.jsonc r2_buckets[].bucket_name', () => {
    const matches = [...read('wrangler.jsonc').matchAll(/"bucket_name"\s*:\s*"([^"]+)"/g)];
    expect(matches).toHaveLength(1);
    expect(STAGING_BUCKET).toBe(matches[0][1]);
  });

  it('STAGING_EXPIRE_DAYS is a positive whole number of days', () => {
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
    expect(CONTENT_HASH_BYTES).toBe(4);
    expect(CONTENT_HASH_HEX_LENGTH).toBe(8);
    expect(CONTENT_HASH_HEX_LENGTH).toBe(CONTENT_HASH_BYTES * 2);
  });
});

describe('contentHash — the CONT-05 mechanism', () => {
  const alpha = new TextEncoder().encode('the first photograph, as bytes');
  const beta = new TextEncoder().encode('the second photograph, as bytes');

  it('two different byte buffers produce two different published keys', () => {
    const first = publishedKey({
      category: 'landscape',
      slug: 'riverbend',
      hash: contentHash(alpha),
      suffix: '-lg',
    });
    const second = publishedKey({
      category: 'landscape',
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
    expect(contentHash('hello')).toBe('2cf24dba');
    expect(contentHash('hello')).not.toBe('5d41402a');
  });

  it('publishedKey REFUSES a hash that is not eight hex characters', () => {
    expect(() =>
      publishedKey({ category: 'landscape', slug: 'riverbend', hash: '2cf2', suffix: '' })
    ).toThrow(/hex/i);
    expect(() =>
      publishedKey({ category: 'landscape', slug: 'riverbend', hash: '2CF24DBA', suffix: '' })
    ).toThrow(/hex/i);
  });
});

describe('publishedKey / publishedUrl', () => {
  it('composes photos/<category>/<slug>-<hash8><suffix>.webp', () => {
    expect(
      publishedKey({ category: 'landscape', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '-lg' })
    ).toBe('photos/landscape/riverbend-a1b2c3d4-lg.webp');
    expect(
      publishedKey({ category: 'landscape', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '' })
    ).toBe('photos/landscape/riverbend-a1b2c3d4.webp');
  });

  it('refuses a category or slug outside the schema slug grammar', () => {
    expect(() =>
      publishedKey({ category: 'Nature', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '' })
    ).toThrow(/a-z0-9/);
    expect(() =>
      publishedKey({ category: 'landscape', slug: 'river bend', hash: 'a1b2c3d4', suffix: '' })
    ).toThrow(/a-z0-9/);
    expect(() =>
      publishedKey({ category: 'landscape', slug: '../etc', hash: 'a1b2c3d4', suffix: '' })
    ).toThrow(/a-z0-9/);
  });

  it('refuses a suffix that is not one of the four variants', () => {
    expect(() =>
      publishedKey({ category: 'landscape', slug: 'riverbend', hash: 'a1b2c3d4', suffix: '-xl' })
    ).toThrow(/suffix/i);
  });

  it('publishedUrl parses to an origin EXACTLY equal to IMAGE_ORIGIN', () => {
    const url = publishedUrl('photos/landscape/riverbend-a1b2c3d4-lg.webp');
    expect(new URL(url).origin).toBe(IMAGE_ORIGIN);
    expect(new URL(url).pathname).toBe('/photos/landscape/riverbend-a1b2c3d4-lg.webp');
  });

  it('publishedUrl refuses a key that is not a published key', () => {
    expect(() => publishedUrl('temp/riverbend.jpg')).toThrow(/published key/);
    expect(() => publishedUrl('')).toThrow(/published key/);
  });

  it('the module contains no hostname literal (OD-3)', () => {
    const source = read('src/lib/photo-pipeline.ts');
    expect(source).not.toContain(new URL(IMAGE_ORIGIN).hostname);
    expect(source).not.toMatch(/process\.env\s*[.[]\s*['"]?R2_PUBLIC_URL/);
    expect(source).not.toMatch(/\benv\s*[.[]\s*['"]?R2_PUBLIC_URL/);
    expect(source).not.toMatch(/import\s*\{[^}]*R2_PUBLIC_URL[^}]*\}/);
    expect(source).toMatch(/import\s*\{[^}]*IMAGE_ORIGIN[^}]*\}\s*from\s*'\.\/image-origin\.ts'/);
  });

  it('every relative import in the module carries a .ts extension', () => {
    const source = read('src/lib/photo-pipeline.ts');
    const relativeImports = [...source.matchAll(/from\s*'(\.[^']*)'/g)].map((m) => m[1]);
    expect(relativeImports.length).toBeGreaterThan(0);
    for (const specifier of relativeImports) {
      expect(specifier.endsWith('.ts')).toBe(true);
    }
  });
});

describe('slugFromPublishedKey is the inverse of publishedKey', () => {
  const suffixes = ['', '-lg', '-md', '-sm'] as const;
  const slugs = [
    'riverbend',
    'river-bend',
    'hawamahal-daytime-2024',
    '40-4-boats',
    'pano-lg', // a slug that ENDS in a variant suffix
    'landscape-deadbeef', // a slug that ends in something hash-shaped
    'a', // one character
  ] as const;

  for (const slug of slugs) {
    for (const suffix of suffixes) {
      it(`round-trips ${slug || '(empty)'} with suffix "${suffix}"`, () => {
        const key = publishedKey({ category: 'landscape', slug, hash: 'a1b2c3d4', suffix });
        expect(slugFromPublishedKey(key)).toBe(slug);
      });
    }
  }

  it('refuses a key it cannot parse rather than returning a wrong slug', () => {
    expect(() => slugFromPublishedKey('photos/landscape/riverbend.webp')).toThrow(/published key/);
    expect(() => slugFromPublishedKey('temp/riverbend.jpg')).toThrow(/published key/);
  });
});

describe('VARIANTS', () => {
  it('urlKeys deep-equal REMOTE_URL_KEYS, in order', () => {
    expect(VARIANTS.map((variant) => variant.urlKey)).toEqual([...REMOTE_URL_KEYS]);
  });

  it('carries the widths and qualities measured from the legacy pipeline', () => {
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
    expect(THUMB.dataUriPrefix).toBe(THUMB_PREFIX);
  });

  it('thumb is NOT a remote url key — it carries no hostname', () => {
    expect([...REMOTE_URL_KEYS]).not.toContain('thumb');
  });
});

describe('the variant table moved down, and there is still exactly one of it', () => {
  it('the re-exported VARIANTS is the SAME OBJECT as the declared one (toBe, not toEqual)', () => {
    expect(VARIANTS).toBe(DECLARED_VARIANTS);
  });

  it('the re-exported THUMB is the SAME OBJECT as the declared one (toBe, not toEqual)', () => {
    expect(THUMB).toBe(DECLARED_THUMB);
  });

  it('PHOTO_ID_SEPARATOR agrees — and identity is asserted STRUCTURALLY, not by toBe', () => {
    expect(PHOTO_ID_SEPARATOR).toBe(DECLARED_PHOTO_ID_SEPARATOR);
  });

  it('photo-pipeline.ts DECLARES none of the three and re-exports all three', () => {
    const source = read('src/lib/photo-pipeline.ts');
    for (const name of ['VARIANTS', 'THUMB', 'PHOTO_ID_SEPARATOR']) {
      expect(source).not.toMatch(new RegExp(`^\\s*export\\s+(?:const|let|var)\\s+${name}\\b`, 'm'));
      expect(source).not.toMatch(new RegExp(`^\\s*(?:const|let|var)\\s+${name}\\b`, 'm'));
    }
    expect(source).toMatch(/^\s*export\s+(?:const|let|var)\s+STAGING_PREFIX\b/m);
    expect(source).toMatch(/^\s*(?:const|let|var)\s+SUFFIX_ALTERNATION\b/m);
    expect(source).toMatch(/export\s*\{[^}]*\bVARIANTS\b[^}]*\}\s*from\s*'\.\/photo-variants\.ts'/);
  });

  it('photo-pipeline.ts cannot hold a RENAMED copy of the separator either', () => {
    const pipelineCode = stripComments(read('src/lib/photo-pipeline.ts'));
    expect([...pipelineCode.matchAll(/'-'/g)]).toHaveLength(0);
    const variantsCode = stripComments(read('src/lib/photo-variants.ts'));
    expect([...variantsCode.matchAll(/'-'/g)]).toHaveLength(1);
    expect(stripComments("const a = 1; // '-' in a line comment")).not.toContain("'-'");
    expect(stripComments("const a = 1; /* '-' in a block comment */")).not.toContain("'-'");
    expect(stripComments("const sep = '-';")).toContain("'-'");
    expect(stripComments("const s = '// not a comment';")).toContain('// not a comment');
    expect(stripComments("const s = '/* not a comment */';")).toContain('/* not a comment */');
  });

  it('photo-variants.ts imports nothing from node: — that is the whole point of the move', () => {
    const source = read('src/lib/photo-variants.ts');
    const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((spec) => spec.startsWith('node:'))).toEqual([]);
    expect(specifiers).toContain('./image-origin.ts');
    expect(source).toContain('node:crypto');
  });
});

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
    expect(STAGING_KEY_RE.test('x/temp/y.jpg')).toBe(false);
  });

  it('is stricter than the legacy /api/dispatch validator it replaces', () => {
    const legacy = /^temp\/[a-zA-Z0-9._/-]+$/;
    expect(legacy.test('temp/../secrets')).toBe(true);
    expect(STAGING_KEY_RE.test('temp/../secrets')).toBe(false);
  });
});

describe('photoIdFor', () => {
  it('is category + "-" + slug and satisfies the schema slug grammar', () => {
    expect(photoIdFor({ category: 'landscape', slug: 'riverbend' })).toBe('landscape-riverbend');
    expect(PHOTO_ID_SEPARATOR).toBe('-');
    expect(photoIdFor({ category: 'landscape', slug: 'river-bend-2' })).toMatch(/^[a-z0-9-]+$/);
  });

  it('agrees with every existing record id, which is the OLD era read forwards', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    for (const record of manifest) {
      const slug = record.id.slice(`${record.category}-`.length);
      expect(record.id.startsWith(`${record.category}-`)).toBe(true);
      expect(photoIdFor({ category: record.category, slug })).toBe(record.id);
    }
  });

  it('refuses a category or slug outside the grammar rather than joining them anyway', () => {
    expect(() => photoIdFor({ category: 'Nature', slug: 'riverbend' })).toThrow(/a-z0-9/);
    expect(() => photoIdFor({ category: 'landscape', slug: 'river bend' })).toThrow(/a-z0-9/);
  });
});

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
    for (const word of ['alt', 'photo', 'image', 'picture']) {
      expect(ALT_PLACEHOLDER_LEADING).not.toContain(word);
    }
  });
});

describe('altRefusalReason — OD-2b ACCEPTS legitimate alt text', () => {
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
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    const rejections: string[] = [];
    for (const record of manifest) {
      const reason = altRefusalReason({ alt: record.alt, title: record.title });
      if (reason !== null) rejections.push(`${record.id}: ${reason}`);
    }
    expect(rejections).toEqual([]);
  });
});

describe('module boundary', () => {
  it('nothing else under src/ imports the pipeline contract', () => {
    const files = listSourceFiles(`${REPO_ROOT}src`);
    expect(files.length).toBeGreaterThan(10);
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
