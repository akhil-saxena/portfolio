/**
 * `src/lib/photo-srcset.ts` — `srcsetFor`, `sizesFor`, `photoSlug`, `photoHref`.
 * (Phase 5, plan 05-05, Task 3.)
 *
 * FOUR FUNCTIONS, FOUR DIFFERENT WAYS OF BEING WRONG SILENTLY
 * ----------------------------------------------------------
 * Every one of these has a failure mode with NO visible symptom, which is why they are derived in
 * one module and asserted here rather than typed into a page.
 *
 *   - `photoSlug` / `photoHref`. `PhotoSchema` has no `slug` field, so `/photography/<category>/<slug>`
 *     is RECOVERED from the id. 05-07's gallery tile and 05-08's detail route both import these;
 *     they are both wave 4 and cannot read each other, so two independent derivations would
 *     disagree and every tile would 404 against a page that exists under a different slug — with a
 *     green build, a green suite and a green gate. First detection would be a human clicking a
 *     tile. So the round trip is asserted against EVERY record in the real manifest, and the
 *     absence of a collision is asserted as a count of distinct pairs rather than as a spot check.
 *   - `srcsetFor`. A wrong width descriptor makes the browser pick the wrong candidate. Nothing
 *     renders incorrectly; the page is just heavier or blurrier than it should be.
 *   - `sizesFor`. A `sizes` that disagrees with the layout is a silently wrong DOWNLOAD size. No
 *     error, no visual difference, no way to notice without measuring bytes.
 *
 * WHAT THIS SUITE REFUSES TO DO
 * -----------------------------
 *   - It does not hand-type photo records. The three `srcsetFor` cases are looked up BY ID in the
 *     real `data/portfolio_images.json`, so the test tracks the data. A fixture would keep passing
 *     after a re-process changed a record's dimensions.
 *   - It does not assert the number of records anywhere. The manifest is at 40 and will grow; a
 *     count would make a correct publish look like a regression. Floors only, and the per-record
 *     loops get STRONGER as records are added.
 *   - It does not compute the `sizes` string the way the module does. §7.4's string is typed out
 *     verbatim below AND re-read from `05-UI-SPEC.md` on disk, so the chain runs
 *     spec file → this file's literal → the module's output, with no step agreeing with itself.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GUTTER_RUNGS, MASONRY_GAP, PAGE_MAX } from '../../src/lib/layout-ladder';
import { photoHref, photoSlug, sizesFor, srcsetFor } from '../../src/lib/photo-srcset';
import { VARIANTS } from '../../src/lib/photo-variants';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (relative: string): string => readFileSync(`${REPO_ROOT}${relative}`, 'utf8');

/** See the twin in `test/public/layout-ladder.unit.test.ts` for why this is duplicated. */
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

/**
 * Split a `sizes` list into its clauses — on commas at PAREN DEPTH ZERO only.
 *
 * A naive `split(', ')` also splits inside `min(100vw, 1280px)`, which is a comma the CSS
 * `min()` function owns. The first revision of this suite did exactly that and reported five
 * clauses where there are four, failing on CORRECT output. Recorded rather than quietly fixed:
 * the same mistake in 05-06's gate would make it fire on a correct stylesheet, and a gate that
 * fires on correct code gets turned off.
 */
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

/** A FLOOR, never a count. The manifest grows; §16 forbids literalling its size. */
const RECORD_FLOOR = 39;

function record(id: string): ManifestRecord {
  const found = manifest.find((entry) => entry.id === id);
  if (!found) {
    // A missing reference record must fail LOUDLY here. `find` returning undefined and the test
    // then asserting against `undefined?.urls` is how a suite quietly stops checking anything.
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
    // ANTI-VACUITY, FIRST: every per-record loop below iterates `manifest`. An empty array makes
    // all of them pass without checking a single photograph, which is the exact shape of the nine
    // vacuous gates this project has paid for.
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    expect(Array.isArray(manifest)).toBe(true);
  });
});

/* ==============================================================================================
 * 1. photoSlug / photoHref — BL-8. The definition two wave-4 plans import.
 * ============================================================================================ */

describe('photoSlug — the id with its category prefix removed', () => {
  it('strips the prefix on the documented example', () => {
    expect(photoSlug({ id: 'abstract-intothemist', category: 'abstract' })).toBe('intothemist');
  });

  it('keeps every later hyphen — only the FIRST category prefix is removed', () => {
    // The failure this catches is a `split('-')[1]` or a `replace(/-.*$/, '')` implementation,
    // both of which look right against `abstract-intothemist` and truncate a real slug.
    expect(photoSlug({ id: 'nature-river-bend-2024', category: 'nature' })).toBe('river-bend-2024');
  });

  it('does not strip a prefix that merely LOOKS like the category', () => {
    // `naturewatch-x` starts with "nature" but not with "nature-". A `startsWith(category)` plus a
    // fixed-length slice would return "watch-x" here and be wrong by one character forever.
    expect(photoSlug({ id: 'nature-naturewatch', category: 'nature' })).toBe('naturewatch');
  });

  it('ROUND-TRIPS for every record in the real manifest', () => {
    // The whole point of BL-8. Asserted over all of them, not a sample, and the assertion
    // strengthens as records are added.
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
    // A collision is a 404 with no build error and no failing test anywhere else in the phase.
    // Counted as distinct `category/slug` pairs against the record count, so a future collision
    // fails HERE rather than in a browser in wave 7.
    const pairs = new Set(manifest.map((entry) => `${entry.category}/${photoSlug(entry)}`));
    expect(pairs.size).toBe(manifest.length);
  });

  it('REFUSES an id that does not carry its category prefix', () => {
    // Silently slicing would produce a wrong slug from a malformed id and route to a page that
    // does not exist. A throw is the only outcome a prerender can act on.
    expect(() => photoSlug({ id: 'intothemist', category: 'abstract' })).toThrow(/abstract/);
    expect(() => photoSlug({ id: 'nature-riverbend', category: 'abstract' })).toThrow(/abstract/);
    expect(() => photoSlug({ id: 'abstract', category: 'abstract' })).toThrow();
    expect(() => photoSlug({ id: 'abstract-', category: 'abstract' })).toThrow();
  });
});

describe('photoHref — the ONE definition 05-07 and 05-08 both import', () => {
  it('is exactly /photography/<category>/<slug>', () => {
    expect(photoHref({ id: 'abstract-intothemist', category: 'abstract' })).toBe(
      '/photography/abstract/intothemist'
    );
  });

  it('composes photoSlug and nothing else, for every record', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    for (const entry of manifest) {
      expect(photoHref(entry)).toBe(`/photography/${entry.category}/${photoSlug(entry)}`);
    }
  });

  it('every href is root-relative, single-segment-per-part, and has no trailing slash', () => {
    // 05-08 builds `getStaticPaths` from `category` and `slug`. A leading `//`, a trailing slash
    // or an embedded `..` would each route somewhere else while looking correct in a template.
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

/* ==============================================================================================
 * 2. srcsetFor — §7.4's expression, and nothing else.
 * ============================================================================================ */

describe('srcsetFor — descriptors are min(variant.maxWidth, source width)', () => {
  const expected = (entry: ManifestRecord, widths: readonly number[]): string =>
    VARIANTS.map((variant, index) => `${entry.urls[variant.urlKey]} ${widths[index]}w`).join(', ');

  it('nature-fairwayreflections (source 4608) → 2000w, 1200w, 800w, 400w', () => {
    const entry = record('nature-fairwayreflections');
    expect(entry.dimensions.width).toBe(4608);
    expect(srcsetFor(entry)).toBe(expected(entry, [2000, 1200, 800, 400]));
  });

  it('architecture-redbuilding (source 1920) → 1920w, … — the cap does not ENLARGE', () => {
    const entry = record('architecture-redbuilding');
    expect(entry.dimensions.width).toBe(1920);
    expect(srcsetFor(entry)).toBe(expected(entry, [1920, 1200, 800, 400]));
  });

  it('abstract-plane (source 1318) → 1318w, 1200w, 800w, 400w', () => {
    const entry = record('abstract-plane');
    expect(entry.dimensions.width).toBe(1318);
    expect(srcsetFor(entry)).toBe(expected(entry, [1318, 1200, 800, 400]));
  });

  it('architecture-officegreens (source 2000, exactly at the cap) → 2000w, …', () => {
    // §7.4's fourth measured record. `min(2000, 2000)` is the boundary case of the cap and the one
    // an off-by-one in a `<` vs `<=` would move.
    const entry = record('architecture-officegreens');
    expect(entry.dimensions.width).toBe(2000);
    expect(srcsetFor(entry)).toBe(expected(entry, [2000, 1200, 800, 400]));
  });

  it('holds for EVERY record in the manifest, computed independently', () => {
    // The three named cases are the measured ones; this is the same claim over the whole corpus,
    // with the expectation computed here from VARIANTS rather than read from the module.
    expect(manifest.length).toBeGreaterThanOrEqual(RECORD_FLOOR);
    for (const entry of manifest) {
      const widths = VARIANTS.map((variant) => Math.min(variant.maxWidth, entry.dimensions.width));
      expect(srcsetFor(entry), entry.id).toBe(expected(entry, widths));
    }
  });

  it('emits four candidates, in VARIANTS order, joined by ", "', () => {
    const parts = srcsetFor(record('abstract-intothemist')).split(', ');
    expect(parts).toHaveLength(VARIANTS.length);
    for (const [index, variant] of VARIANTS.entries()) {
      expect(parts[index].startsWith(record('abstract-intothemist').urls[variant.urlKey])).toBe(
        true
      );
    }
  });

  it('every URL is the record OWN url — the function never builds one', () => {
    // §7.2 / OD-3: the module must not compose a URL from an origin. Asserted against the data
    // AND structurally against the source, because "it happens to return the right string" and
    // "it cannot return a wrong one" are different claims.
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
    const base = record('abstract-intothemist');
    for (const variant of VARIANTS) {
      const urls = { ...base.urls };
      delete urls[variant.urlKey];
      expect(() => srcsetFor({ ...base, urls }), variant.urlKey).toThrow(
        new RegExp(variant.urlKey)
      );
    }
  });

  it('THROWS on a missing or nonsensical source width', () => {
    // `dimensions` supplies the ratio and the descriptor arithmetic. A record with width 0 would
    // make every descriptor `0w`, which a browser treats as "no information" and silently falls
    // back to the last candidate.
    const base = record('abstract-intothemist');
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

/* ==============================================================================================
 * 3. sizesFor — the string that must agree with a stylesheet nobody has written yet.
 * ============================================================================================ */

/**
 * §7.4's target string for a 3-column category, typed out here from the spec.
 *
 * The odd colon spacing is NOT a typo and is reproduced deliberately: `(min-width:1024px)` has no
 * space and `(min-width: 673px)` has one, because the widths are right-aligned to four characters.
 * The module derives that padding from the breakpoint list rather than hardcoding it.
 */
const SPEC_SIZES_LINES_3 = [
  '(min-width:1024px) calc((min(100vw, 1280px) - 96px - 32px) / 3),',
  '(min-width: 673px) calc((100vw - 64px - 32px) / 3),',
  '(min-width: 375px) calc((100vw - 48px - 16px) / 2),',
  'calc(100vw - 32px)',
] as const;

const joinClauses = (lines: readonly string[]): string =>
  lines.map((line) => line.replace(/,$/, '')).join(', ');

const SPEC_SIZES_3 = joinClauses(SPEC_SIZES_LINES_3);

/**
 * The 2-column form, derived from §7.4's stated rule — "emit the `/2` form for `columns: 2`
 * categories" — by changing ONLY the divisor and the gap term, which is `(cols − 1) × 16`.
 * Everything else, including the third and fourth clauses, is identical: at ≥375 the ladder is two
 * columns for every category (§7.1), so those clauses cannot differ.
 */
const SPEC_SIZES_2 = joinClauses([
  '(min-width:1024px) calc((min(100vw, 1280px) - 96px - 16px) / 2),',
  '(min-width: 673px) calc((100vw - 64px - 16px) / 2),',
  '(min-width: 375px) calc((100vw - 48px - 16px) / 2),',
  'calc(100vw - 32px)',
]);

describe('the expectation above is the SPEC document, not my memory of it', () => {
  it('matches the sizes="…" block in 05-UI-SPEC.md §7.4, character for character', () => {
    // Without this the chain is: I read the spec, typed it here, and the module agrees with what
    // I typed. With it the chain starts at the committed document. If the spec is ever edited or
    // moved, this goes red LOUDLY rather than silently ratifying a stale literal.
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
    // ANTI-VACUITY on the splitter, because it is now load-bearing for two assertions: it must
    // split at depth zero and NOT inside a function call.
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
    // The anti-vacuity control the plan asks for, expressed as an assertion rather than only as a
    // one-off manual experiment: each number in the emitted string is recomputed here from the
    // constants. If `sizesFor` held literals of its own, changing a constant would move this
    // expectation and not the output.
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
    // The top rung is the only one that caps at the page maximum.
    expect(clauses[0]).toContain(`min(100vw, ${PAGE_MAX.photos}px)`);
    expect(clauses[1]).not.toContain('min(100vw');
    // The unconditioned clause: no media condition, no divisor, gutter only.
    const base = GUTTER_RUNGS[0];
    expect(clauses[3]).toBe(`calc(100vw - ${2 * base.px}px)`);
  });

  it('REFUSES 1 and 4 — site_config only ever holds 2 or 3', () => {
    // An unexpected column count must be HEARD about rather than rendered. A 1-column `sizes` is
    // not obviously wrong to look at; it just downloads a file that is twice the size it needs.
    for (const columns of [0, 1, 4, 5, -1, 2.5, Number.NaN]) {
      expect(() => sizesFor(columns), String(columns)).toThrow(/column/i);
    }
  });

  it('accepts EVERY column count that really occurs in site_config.json', () => {
    // The other half of the refusal, and the half that keeps it honest: the throw is only correct
    // if the real config never carries a value it rejects. Read from the data, not asserted from
    // the spec's summary of it.
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

/* ==============================================================================================
 * 4. No ladder number may be typed into this module.
 * ============================================================================================ */

describe('the module holds no ladder literal of its own', () => {
  it('none of the gutter, gap, breakpoint or page-max numbers appears in the CODE', () => {
    // The plan's own shell grep is fragile in both directions and says so: `grep -v "//"` drops
    // any line containing a URL, and a single "16px" inside a block comment makes it unpassable.
    // Both failure modes are removed by stripping comments properly and then searching only code.
    const code = stripComments(read('src/lib/photo-srcset.ts'));
    const forbidden = [
      ...GUTTER_RUNGS.map((rung) => rung.px),
      ...GUTTER_RUNGS.flatMap((rung) => (rung.minWidth === null ? [] : [rung.minWidth])),
      ...GUTTER_RUNGS.map((rung) => 2 * rung.px),
      MASONRY_GAP.px,
      ...Object.values(PAGE_MAX),
    ];
    // DERIVED from the constants, not a hand-typed deny-list, so a new rung is covered
    // automatically. That is the difference between a rule and a list of things I thought of.
    expect(forbidden.length).toBeGreaterThan(8);
    const found: string[] = [];
    for (const value of new Set(forbidden)) {
      for (const match of code.matchAll(new RegExp(`\\b${value}\\b`, 'g'))) {
        found.push(`${value} at offset ${match.index}`);
      }
    }
    expect(found).toEqual([]);
    // ANTI-VACUITY on the stripper and the matcher together — otherwise "found nothing" is a
    // statement about a broken regex or an emptied string rather than about the module.
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
