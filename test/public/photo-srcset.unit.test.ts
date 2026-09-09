import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GUTTER_RUNGS, MASONRY_GAP, PAGE_MAX } from '../../src/lib/layout-ladder';
import { photoHref, photoSlug, sizesFor, srcsetFor } from '../../src/lib/photo-srcset';
import { VARIANTS } from '../../src/lib/photo-variants';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (relative: string): string => readFileSync(`${REPO_ROOT}${relative}`, 'utf8');

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

function splitClauses(sizes: string): string[] {
  const clauses: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of sizes) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      clauses.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  clauses.push(current.trim());
  return clauses;
}

type ManifestRecord = {
  id: string;
  category: string;
  urls: Record<string, string>;
  dimensions: { width: number; height: number };
};

const manifest = JSON.parse(read('data/portfolio_images.json')) as ManifestRecord[];

const RECORD_FLOOR = 39;

function record(id: string): ManifestRecord {
  const found = manifest.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(
      `test fixture: no record with id "${id}" in data/portfolio_images.json. This suite is ` +
        'pinned to real records by id; if one was renamed, repoint the test rather than ' +
        'hand-typing the record.'
    );
  }
  return found;
}

describe('the corpus this suite reads is real and non-trivial', () => {
  it('the manifest is present and above the floor', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    expect(Array.isArray(manifest)).toBe(true);
  });
});

describe('photoSlug — the id with its category prefix removed', () => {
  it('strips the prefix on the documented example', () => {
    expect(photoSlug({ id: 'architecture-intothemist', category: 'architecture' })).toBe(
      'intothemist'
    );
  });

  it('keeps every later hyphen — only the FIRST category prefix is removed', () => {
    expect(photoSlug({ id: 'landscape-river-bend-2024', category: 'landscape' })).toBe(
      'river-bend-2024'
    );
  });

  it('does not strip a prefix that merely LOOKS like the category', () => {
    expect(photoSlug({ id: 'landscape-naturewatch', category: 'landscape' })).toBe('naturewatch');
  });

  it('ROUND-TRIPS for every record in the real manifest', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    const failures: string[] = [];
    for (const entry of manifest) {
      if (!entry.id.startsWith(`${entry.category}-`)) {
        failures.push(`${entry.id}: does not begin with category "${entry.category}-"`);
        continue;
      }
      const slug = photoSlug(entry);
      if (`${entry.category}-${slug}` !== entry.id) {
        failures.push(`${entry.id}: recomposed as "${entry.category}-${slug}"`);
      }
      if (slug.length === 0) failures.push(`${entry.id}: empty slug`);
    }
    expect(failures).toEqual([]);
  });

  it('NO TWO photographs in one category produce the same slug', () => {
    const pairs = new Set(manifest.map((entry) => `${entry.category}/${photoSlug(entry)}`));
    expect(pairs.size).toBe(manifest.length);
  });

  it('REFUSES an id that does not carry its category prefix', () => {
    expect(() => photoSlug({ id: 'intothemist', category: 'architecture' })).toThrow(
      /architecture/
    );
    expect(() => photoSlug({ id: 'landscape-riverbend', category: 'architecture' })).toThrow(
      /architecture/
    );
    expect(() => photoSlug({ id: 'architecture', category: 'architecture' })).toThrow();
    expect(() => photoSlug({ id: 'architecture-', category: 'architecture' })).toThrow();
  });
});

describe('photoHref — the ONE definition 05-07 and 05-08 both import', () => {
  it('is exactly /photography/<category>/<slug>', () => {
    expect(photoHref({ id: 'architecture-intothemist', category: 'architecture' })).toBe(
      '/photography/architecture/intothemist'
    );
  });

  it('composes photoSlug and nothing else, for every record', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    for (const entry of manifest) {
      expect(photoHref(entry)).toBe(`/photography/${entry.category}/${photoSlug(entry)}`);
    }
  });

  it('every href is root-relative, single-segment-per-part, and has no trailing slash', () => {
    for (const entry of manifest) {
      const href = photoHref(entry);
      expect(href.startsWith('/photography/')).toBe(true);
      expect(href.endsWith('/')).toBe(false);
      expect(href).not.toContain('//');
      expect(href).not.toContain('..');
      expect(href.split('/')).toHaveLength(4);
    }
  });

  it('every href is unique across the whole manifest, not merely within a category', () => {
    const hrefs = new Set(manifest.map((entry) => photoHref(entry)));
    expect(hrefs.size).toBe(manifest.length);
  });
});

describe('srcsetFor — descriptors are min(variant.maxWidth, source width)', () => {
  const expected = (entry: ManifestRecord, widths: readonly number[]): string =>
    VARIANTS.map((variant, index) => `${entry.urls[variant.urlKey]} ${widths[index]}w`).join(', ');

  it('landscape-fairwayreflections (source 4608) → 2000w, 1200w, 800w, 400w', () => {
    const entry = record('landscape-fairwayreflections');
    expect(entry.dimensions.width).toBe(4608);
    expect(srcsetFor(entry)).toBe(expected(entry, [2000, 1200, 800, 400]));
  });

  it('architecture-redbuilding (source 1920) → 1920w, … — the cap does not ENLARGE', () => {
    const entry = record('architecture-redbuilding');
    expect(entry.dimensions.width).toBe(1920);
    expect(srcsetFor(entry)).toBe(expected(entry, [1920, 1200, 800, 400]));
  });

  it('landscape-plane (source 1318) → 1318w, 1200w, 800w, 400w', () => {
    const entry = record('landscape-plane');
    expect(entry.dimensions.width).toBe(1318);
    expect(srcsetFor(entry)).toBe(expected(entry, [1318, 1200, 800, 400]));
  });

  it('architecture-officegreens (source 2000, exactly at the cap) → 2000w, …', () => {
    const entry = record('architecture-officegreens');
    expect(entry.dimensions.width).toBe(2000);
    expect(srcsetFor(entry)).toBe(expected(entry, [2000, 1200, 800, 400]));
  });

  it('holds for EVERY record in the manifest, computed independently', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    for (const entry of manifest) {
      const widths = VARIANTS.map((variant) => Math.min(variant.maxWidth, entry.dimensions.width));
      expect(srcsetFor(entry), entry.id).toBe(expected(entry, widths));
    }
  });

  it('emits four candidates, in VARIANTS order, joined by ", "', () => {
    const parts = srcsetFor(record('architecture-intothemist')).split(', ');
    expect(parts).toHaveLength(VARIANTS.length);
    for (const [index, variant] of VARIANTS.entries()) {
      expect(parts[index].startsWith(record('architecture-intothemist').urls[variant.urlKey])).toBe(
        true
      );
    }
  });

  it('every URL is the record OWN url — the function never builds one', () => {
    for (const entry of manifest) {
      for (const candidate of srcsetFor(entry).split(', ')) {
        const url = candidate.slice(0, candidate.lastIndexOf(' '));
        expect(Object.values(entry.urls)).toContain(url);
      }
    }
    const source = read('src/lib/photo-srcset.ts');
    expect(source).not.toMatch(/from\s*'[^']*image-origin/);
    expect(source).not.toMatch(/from\s*'[^']*photo-pipeline/);
    expect(source).not.toContain('https://');
  });

  it('never emits a thumb candidate — the LQIP is a data URI with no width', () => {
    for (const entry of manifest) {
      expect(srcsetFor(entry)).not.toContain('data:image/webp;base64,');
    }
  });

  it('THROWS if any of the four url keys is missing on the record', () => {
    const base = record('architecture-intothemist');
    for (const variant of VARIANTS) {
      const urls = { ...base.urls };
      delete urls[variant.urlKey];
      expect(() => srcsetFor({ ...base, urls }), variant.urlKey).toThrow(
        new RegExp(variant.urlKey)
      );
    }
  });

  it('THROWS on a missing or nonsensical source width', () => {
    const base = record('architecture-intothemist');
    for (const width of [0, -1, Number.NaN]) {
      expect(() => srcsetFor({ ...base, dimensions: { ...base.dimensions, width } })).toThrow(
        /width/i
      );
    }
    expect(() =>
      srcsetFor({ ...base, dimensions: undefined as unknown as { width: number; height: number } })
    ).toThrow(/dimensions/i);
  });
});

const SPEC_SIZES_LINES_3 = [
  '(min-width:1024px) calc((min(100vw, 1280px) - 96px - 32px) / 3),',
  '(min-width: 673px) calc((100vw - 64px - 32px) / 3),',
  '(min-width: 375px) calc((100vw - 48px - 16px) / 2),',
  'calc(100vw - 32px)',
] as const;

const joinClauses = (lines: readonly string[]): string =>
  lines.map((line) => line.replace(/,$/, '')).join(', ');

const SPEC_SIZES_3 = joinClauses(SPEC_SIZES_LINES_3);

const SPEC_SIZES_2 = joinClauses([
  '(min-width:1024px) calc((min(100vw, 1280px) - 96px - 16px) / 2),',
  '(min-width: 673px) calc((100vw - 64px - 16px) / 2),',
  '(min-width: 375px) calc((100vw - 48px - 16px) / 2),',
  'calc(100vw - 32px)',
]);

describe('the expectation above is the SPEC document, not my memory of it', () => {
  it('matches the sizes="…" block in 05-UI-SPEC.md §7.4, character for character', () => {
    const spec = read('.planning/phases/05-public-site/05-UI-SPEC.md');
    const start = spec.indexOf('sizes="(min-width:1024px)');
    expect(start, '§7.4 sizes block not found in 05-UI-SPEC.md').toBeGreaterThan(-1);
    const end = spec.indexOf('"', spec.indexOf('calc(100vw - 32px)', start));
    const block = spec.slice(start + 'sizes="'.length, end);
    const fromSpec = joinClauses(block.split('\n').map((line) => line.trim()));
    expect(fromSpec).toBe(SPEC_SIZES_3);
  });
});

describe('sizesFor', () => {
  it('sizesFor(3) is §7.4s string, character for character', () => {
    expect(sizesFor(3)).toBe(SPEC_SIZES_3);
  });

  it('sizesFor(2) is the same shape with /2 and a recomputed gap term', () => {
    expect(sizesFor(2)).toBe(SPEC_SIZES_2);
  });

  it('the two differ ONLY in the first two clauses', () => {
    expect(splitClauses('a, b')).toEqual(['a', 'b']);
    expect(splitClauses('min(1, 2), b')).toEqual(['min(1, 2)', 'b']);
    const three = splitClauses(sizesFor(3));
    const two = splitClauses(sizesFor(2));
    expect(three).toHaveLength(4);
    expect(two).toHaveLength(4);
    expect(two[2]).toBe(three[2]);
    expect(two[3]).toBe(three[3]);
    expect(two[0]).not.toBe(three[0]);
    expect(two[1]).not.toBe(three[1]);
  });

  it('READS the ladder constants — every term traces to GUTTER_RUNGS, MASONRY_GAP, PAGE_MAX', () => {
    const descending = [...GUTTER_RUNGS].reverse();
    const conditioned = descending.filter((rung) => rung.minWidth !== null);
    const clauses = splitClauses(sizesFor(3));

    for (const [index, rung] of conditioned.entries()) {
      const columns = rung.minWidth === conditioned[conditioned.length - 1].minWidth ? 2 : 3;
      const gutterTerm = 2 * rung.px;
      const gapTerm = (columns - 1) * MASONRY_GAP.px;
      expect(clauses[index], `rung ${rung.minWidth}`).toContain(`- ${gutterTerm}px - ${gapTerm}px`);
      expect(clauses[index]).toContain(`/ ${columns}`);
      expect(clauses[index]).toContain(`${rung.minWidth}px)`);
    }
    expect(clauses[0]).toContain(`min(100vw, ${PAGE_MAX.photos}px)`);
    expect(clauses[1]).not.toContain('min(100vw');
    const base = GUTTER_RUNGS[0];
    expect(clauses[3]).toBe(`calc(100vw - ${2 * base.px}px)`);
  });

  it('REFUSES 1 and 4 — site_config only ever holds 2 or 3', () => {
    for (const columns of [0, 1, 4, 5, -1, 2.5, Number.NaN]) {
      expect(() => sizesFor(columns), String(columns)).toThrow(/column/i);
    }
  });

  it('accepts EVERY column count that really occurs in site_config.json', () => {
    const config = JSON.parse(read('data/site_config.json')) as {
      categories: { id: string; columns: number }[];
      defaultColumns: number;
    };
    expect(config.categories.length).toBeGreaterThan(0);
    const occurring = new Set([
      ...config.categories.map((category) => category.columns),
      config.defaultColumns,
    ]);
    expect(occurring.size).toBeGreaterThan(0);
    for (const columns of occurring) {
      expect(() => sizesFor(columns), `site_config carries columns: ${columns}`).not.toThrow();
    }
  });

  it('is a single line — a sizes attribute with a newline in it is a parsing risk', () => {
    for (const columns of [2, 3]) {
      expect(sizesFor(columns)).not.toContain('\n');
      expect(sizesFor(columns).trim()).toBe(sizesFor(columns));
    }
  });
});

describe('the module holds no ladder literal of its own', () => {
  it('none of the gutter, gap, breakpoint or page-max numbers appears in the CODE', () => {
    const code = stripComments(read('src/lib/photo-srcset.ts'));
    const forbidden = [
      ...GUTTER_RUNGS.map((rung) => rung.px),
      ...GUTTER_RUNGS.flatMap((rung) => (rung.minWidth === null ? [] : [rung.minWidth])),
      ...GUTTER_RUNGS.map((rung) => 2 * rung.px),
      MASONRY_GAP.px,
      ...Object.values(PAGE_MAX),
    ];
    expect(forbidden.length).toBeGreaterThan(8);
    const found: string[] = [];
    for (const value of new Set(forbidden)) {
      for (const match of code.matchAll(new RegExp(`\\b${value}\\b`, 'g'))) {
        found.push(`${value} at offset ${match.index}`);
      }
    }
    expect(found).toEqual([]);
    expect(code.length).toBeGreaterThan(200);
    expect(code).toContain('GUTTER_RUNGS');
    expect(stripComments('const a = 1; // 96px').match(/\b96\b/)).toBeNull();
    expect(stripComments('const a = 96;')).toContain('96');
  });

  it('imports the three constant modules rather than restating them', () => {
    const source = read('src/lib/photo-srcset.ts');
    expect(source).toMatch(/from\s*'\.\/layout-ladder(\.ts)?'/);
    expect(source).toMatch(/from\s*'\.\/photo-variants(\.ts)?'/);
  });

  it('imports nothing from node: — it runs in a prerendered page, in workerd', () => {
    const source = read('src/lib/photo-srcset.ts');
    const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((spec) => spec.startsWith('node:'))).toEqual([]);
  });
});
