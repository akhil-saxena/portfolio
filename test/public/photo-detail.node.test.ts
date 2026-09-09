import { beforeAll, describe, expect, inject, it } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import siteConfig from '../../data/site_config.json';
import { CAMERA_DISPLAY_NAMES, exifRows, LENS_DISPLAY_NAMES } from '../../src/lib/exif-display';
import { photoHref } from '../../src/lib/photo-srcset';
import { VARIANTS } from '../../src/lib/photo-variants';

const previewBaseUrl = inject('previewBaseUrl');
const report = (line: string) => process.stdout.write(`${line}\n`);

type Record_ = (typeof manifest)[number];

if (!Array.isArray(manifest) || manifest.length === 0) {
  throw new Error('photo-detail: data/portfolio_images.json holds no records; nothing to check.');
}
if (!Array.isArray(siteConfig.categories) || siteConfig.categories.length === 0) {
  throw new Error('photo-detail: data/site_config.json declares no categories; nothing to check.');
}

const LARGE = VARIANTS.find((variant) => variant.urlKey === 'large');
if (!LARGE || LARGE.suffix.length === 0) {
  throw new Error(
    'photo-detail: VARIANTS carries no `large` entry with a suffix, so the og:image assertion ' +
      'would compare against undefined and pass on anything.'
  );
}

const SEQUENCES: ReadonlyArray<{ id: string; photos: Record_[] }> = siteConfig.categories.map(
  (category) => ({
    id: category.id,
    photos: manifest
      .filter((record) => record.category === category.id)
      .sort((a, b) => a.categoryOrder - b.categoryOrder),
  })
);

const GALLERY_URLS: readonly string[] = [
  '/photography/',
  ...siteConfig.categories.map((category) => `/photography/${category.id}/`),
];

const pages = new Map<string, { status: number; html: string; redirected: boolean }>();

async function get(pathname: string) {
  const cached = pages.get(pathname);
  if (cached) return cached;
  const response = await fetch(`${previewBaseUrl}${pathname}`);
  const entry = {
    status: response.status,
    html: await response.text(),
    redirected: response.redirected,
  };
  pages.set(pathname, entry);
  return entry;
}

function decodeEntitiesOnce(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X'))
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    };
    return named[body] ?? whole;
  });
}

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '');

function attr(tag: string, name: string): string | null {
  return tag.match(new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`))?.[2] ?? null;
}

/** Every opening `<name …>` tag, sliced with quote awareness. */
function tagsNamed(html: string, name: string): string[] {
  const out: string[] = [];
  const opener = new RegExp(`<${name}\\b`, 'g');
  let match = opener.exec(html);
  while (match) {
    let index = match.index + match[0].length;
    let quote: string | null = null;
    while (index < html.length) {
      const character = html[index];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        break;
      }
      index += 1;
    }
    out.push(html.slice(match.index, index + 1));
    opener.lastIndex = index;
    match = opener.exec(html);
  }
  return out;
}

/** The `content` of the `<meta>` identified by one attribute, whichever quote spelling it uses. */
function meta(html: string, attribute: string, name: string): string | null {
  const found = tagsNamed(html, 'meta').filter((tag) => attr(tag, attribute) === name);
  if (found.length !== 1) return null;
  return attr(found[0], 'content');
}

/** Every `<a …>` open tag on the page, as raw strings. */
const anchorTags = (html: string) => tagsNamed(html, 'a');

/** The `href` of the single anchor carrying `rel="<relation>"`, or null. Attribute-order blind. */
function relHref(html: string, relation: string): string | null {
  const tags = anchorTags(html).filter((tag) => attr(tag, 'rel') === relation);
  if (tags.length !== 1) return null;
  return attr(tags[0], 'href');
}

/** The path a detail page is fetched at. The route's own directory build format. */
const pageUrl = (record: Record_) => `${photoHref(record)}/`;

describe('every photograph has its own prerendered page (PUB-09)', () => {
  beforeAll(async () => {
    for (const record of manifest) await get(pageUrl(record));
  });

  it('answers 200 with exactly one <h1>, and the h1 is never the alt text', () => {
    let checked = 0;
    let bytes = 0;
    for (const record of manifest) {
      const page = pages.get(pageUrl(record));
      expect(page, `no response captured for ${record.id}`).toBeDefined();
      if (!page) continue;
      expect(page.status, `${record.id} did not answer 200`).toBe(200);
      bytes += page.html.length;

      const headings = page.html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? [];
      expect(headings.length, `${record.id} carries ${headings.length} <h1> elements`).toBe(1);

      // `?? ''` and not a non-null assertion: `html.match(…) ?? []` types the index as
      // `string | undefined`, and `astro check` reports it as ts(2345) even though the length was
      // just asserted. MEASURED — vitest was green on this file while `npm run build` was red.
      const headingText = decodeEntitiesOnce(stripTags(headings[0] ?? '')).trim();
      expect(headingText, `${record.id}'s <h1> is not its title`).toBe(record.title);

      const frame = page.html.match(/<div class="pd-shot"[\s\S]*?<\/div>/)?.[0] ?? '';
      const alt = decodeEntitiesOnce(attr(frame, 'alt') ?? '');
      expect(alt, `${record.id}'s frame has no alt text`).toBe(record.alt);
      expect(alt, `${record.id} announces its title where its description belongs`).not.toBe(
        headingText
      );
      checked += 1;
    }
    expect(checked, 'no page was checked').toBe(manifest.length);
    report(`pages: ${checked} of ${manifest.length} answered 200, ${bytes} bytes of HTML in total`);
  });

  it('ships the router and nothing else — no island, no framework JS (PUB-14, §5.1 route 4)', () => {
    let islands = 0;
    let modules = 0;
    for (const record of manifest) {
      const html = pages.get(pageUrl(record))?.html ?? '';
      expect(html.length, `${record.id} returned an empty document`).toBeGreaterThan(0);
      modules += (html.match(/<script[^>]*\btype=["']module["']/g) ?? []).length;
      islands += (html.match(/<astro-island\b/g) ?? []).length;
    }
    report(
      `javascript: ${modules} module script(s), ${islands} island(s) across ${manifest.length} pages`
    );
    /*
     * 🔴 EXACTLY ONE MODULE SCRIPT PER PAGE, AND IT USED TO BE ZERO.
     *
     * Akhil, stepping between photographs: *"it seems like header/footer and other elements are
     * refreshing when i move across photos … keep those elements fixed."* The fix is Astro's
     * `ClientRouter`, which ships one module script per document and swaps the body instead of
     * reloading it — MEASURED afterwards: 0 document fetches across a four-photograph walk.
     *
     * So this route family is a THIRD class, not one of the original two: it hydrates NO component
     * and still ships JavaScript. `gate:public-js` gained the same third class for the same reason.
     * The assertion is an equality per page rather than a floor, so a second module script — an
     * island arriving by accident, a stray inline import — turns it red.
     */
    expect(modules, 'expected exactly one module script per page: the router').toBe(
      manifest.length
    );
    expect(islands, 'a hydrated island reached a photo page').toBe(0);
  });

  it('carries the social card, pointing at the large variant (SEO-01, §9.6)', () => {
    let withSuffix = 0;
    for (const record of manifest) {
      const html = pages.get(pageUrl(record))?.html ?? '';

      const image = meta(html, 'property', 'og:image');
      expect(image, `${record.id} has no og:image`).toBeTruthy();
      // ABSOLUTE. A relative og:image is dropped by every scraper: no picture, no error.
      expect(
        () => new URL(image as string),
        `${record.id}'s og:image is not absolute`
      ).not.toThrow();
      expect(image, `${record.id}'s og:image is not its own large variant`).toBe(record.urls.large);

      // The suffix comes from VARIANTS, never from a literal typed here.
      const basename = new URL(image as string).pathname.split('/').pop() ?? '';
      expect(
        new RegExp(`${LARGE.suffix}\\.[a-z0-9]+$`).test(basename),
        `${record.id}'s og:image basename ${basename} does not end in the large suffix ${LARGE.suffix}`
      ).toBe(true);
      withSuffix += 1;

      expect(meta(html, 'property', 'og:image:alt'), `${record.id}'s og:image:alt`).toBe(
        record.alt
      );
      expect(meta(html, 'property', 'og:type'), `${record.id}'s og:type`).toBe('article');
      expect(meta(html, 'name', 'twitter:card'), `${record.id}'s twitter:card`).toBe(
        'summary_large_image'
      );

      const canonicalTag = tagsNamed(html, 'link').find((tag) => attr(tag, 'rel') === 'canonical');
      const canonical = attr(canonicalTag ?? '', 'href') ?? '';
      expect(canonical, `${record.id} has no canonical`).toBeTruthy();
      // The origin 307s the unslashed form, so the canonical names `${photoHref(record)}/` —
      // exact equality, not a prefix match, so a wrong slug still fails here.
      expect(new URL(canonical).pathname, `${record.id}'s canonical is not its own path`).toBe(
        `${photoHref(record)}/`
      );
      expect(meta(html, 'property', 'og:url'), `${record.id}'s og:url`).toBe(canonical);
    }
    report(
      `social card: ${withSuffix} og:image(s), every one absolute and ending "${LARGE.suffix}"; ` +
        'og:type=article, twitter:card=summary_large_image, canonical=own path, on all of them'
    );
  });
});

describe('the EXIF omits rather than placeholds (PUB-07, PUB-08)', () => {
  it('renders one row per surviving field, and no block at all when none survives', () => {
    const rowsPerRecord = manifest.map((record) => exifRows(record.exif).length);
    const withNoRows = rowsPerRecord.filter((n) => n === 0).length;
    const totalRows = rowsPerRecord.reduce((a, b) => a + b, 0);

    // ANTI-VACUITY: both degenerate shapes must exist in the corpus, or this asserts nothing.
    expect(totalRows, 'no record yields any EXIF row').toBeGreaterThan(0);
    expect(
      withNoRows,
      'no record has an entirely null exif — the omit-the-block case is untested'
    ).toBeGreaterThan(0);

    let renderedRows = 0;
    let renderedBlocks = 0;
    for (const [index, record] of manifest.entries()) {
      const html = pages.get(pageUrl(record))?.html ?? '';
      const section = html.match(/<section class="pd-exif"[\s\S]*?<\/section>/)?.[0] ?? '';
      const dt = (section.match(/<dt[\s>]/g) ?? []).length;
      const dd = (section.match(/<dd[\s>]/g) ?? []).length;

      expect(dt, `${record.id} rendered ${dt} rows against ${rowsPerRecord[index]} stored`).toBe(
        rowsPerRecord[index]
      );
      expect(dd, `${record.id} rendered ${dd} values against ${dt} labels`).toBe(dt);

      if (rowsPerRecord[index] === 0) {
        expect(section, `${record.id} rendered an EXIF panel over nothing`).toBe('');
        expect(html, `${record.id} rendered a "Details" heading over nothing`).not.toContain(
          '>Details<'
        );
      } else {
        renderedBlocks += 1;
        renderedRows += dt;
        // Never a placeholder. The em dash is U+2014 ONLY: LENS_DISPLAY_NAMES renders EN dashes
        // (U+2013) on purpose, because a focal range is a range.
        expect(section, `${record.id}'s EXIF list contains an em dash`).not.toContain('—');
        expect(section, `${record.id}'s EXIF list says "Unknown"`).not.toContain('Unknown');
        expect(section, `${record.id}'s EXIF list says "N/A"`).not.toContain('N/A');
        expect(section, `${record.id}'s EXIF list has an empty value`).not.toContain('<dd></dd>');
      }
    }
    report(
      `exif: ${renderedRows} row(s) across ${renderedBlocks} block(s); ` +
        `${withNoRows} record(s) with an entirely null exif rendered no block at all`
    );
  });

  it('ships no raw camera or lens string anywhere (PUB-08)', () => {
    const raw = [
      ...Object.keys(CAMERA_DISPLAY_NAMES).map((value) => ['camera', value] as const),
      ...Object.keys(LENS_DISPLAY_NAMES).map((value) => ['lens', value] as const),
    ];
    expect(
      raw.length,
      'the display tables are empty — this would search for nothing'
    ).toBeGreaterThan(0);

    let hits = 0;
    for (const record of manifest) {
      const html = pages.get(pageUrl(record))?.html ?? '';
      for (const [field, value] of raw) {
        if (html.includes(value)) {
          hits += 1;
          expect.fail(`${record.id} ships the raw ${field} string ${JSON.stringify(value)}`);
        }
      }
    }
    report(
      `raw strings: ${raw.length} searched (${Object.keys(CAMERA_DISPLAY_NAMES).length} camera, ` +
        `${Object.keys(LENS_DISPLAY_NAMES).length} lens) across ${manifest.length} pages; ${hits} hit(s)`
    );
  });
});

describe('previous and next are real anchors that wrap inside the category (§9.6)', () => {
  it('links only to pages that exist, and links back the way it came', () => {
    for (const sequence of SEQUENCES) {
      expect(
        sequence.photos.length,
        `category ${sequence.id} holds no photographs`
      ).toBeGreaterThan(0);
      for (const record of sequence.photos) {
        const html = pages.get(pageUrl(record))?.html ?? '';
        const previous = relHref(html, 'prev');
        const next = relHref(html, 'next');

        if (sequence.photos.length < 2) {
          // The decision recorded in the route: a link that reloads the page you are on is a
          // control that does nothing, so the row is absent. Unreachable against today's corpus.
          expect(
            previous,
            `${record.id} is alone in its category and still offers a previous`
          ).toBeNull();
          expect(next, `${record.id} is alone in its category and still offers a next`).toBeNull();
          continue;
        }

        expect(previous, `${record.id} has no previous anchor`).toBeTruthy();
        expect(next, `${record.id} has no next anchor`).toBeTruthy();

        const nextPage = pages.get(`${next}/`);
        const previousPage = pages.get(`${previous}/`);
        expect(nextPage?.status, `${record.id}'s next (${next}) is not a generated page`).toBe(200);
        expect(
          previousPage?.status,
          `${record.id}'s previous (${previous}) is not a generated page`
        ).toBe(200);

        // Symmetry: the page next points at must point back here. This is what makes a single
        // reversed pair fail rather than shifting the whole cycle by one and still closing.
        expect(
          relHref(nextPage?.html ?? '', 'prev'),
          `${record.id}'s next does not point back at it`
        ).toBe(photoHref(record));
      }
    }
  });

  it('returns to the start after following next exactly as many times as the category is long', () => {
    const walked: string[] = [];
    for (const sequence of SEQUENCES) {
      const size = sequence.photos.length;
      if (size < 2) {
        walked.push(`${sequence.id} 1 (no row rendered)`);
        continue;
      }
      const start = photoHref(sequence.photos[0]);
      let current = start;
      const visited = new Set<string>();
      for (let step = 0; step < size; step += 1) {
        visited.add(current);
        const html = pages.get(`${current}/`)?.html ?? '';
        const next = relHref(html, 'next');
        expect(next, `${current} has no next anchor to follow`).toBeTruthy();
        current = next as string;
      }
      expect(
        current,
        `following next ${size} times in ${sequence.id} did not return to the start`
      ).toBe(start);
      expect(visited.size, `the walk through ${sequence.id} revisited a page before closing`).toBe(
        size
      );
      walked.push(`${sequence.id} ${size}`);
    }
    report(`cycles walked (category length): ${walked.join(' · ')}`);
  });

  it('offers one back link — the section eyebrow, pointing at its own category', () => {
    for (const category of siteConfig.categories) {
      const sequence = SEQUENCES.find((entry) => entry.id === category.id);
      expect(sequence?.photos.length, `category ${category.id} holds no photographs`).toBeTruthy();
      for (const record of sequence?.photos ?? []) {
        const html = pages.get(pageUrl(record))?.html ?? '';
        const context = html.match(/<p class="pd-context"[\s\S]*?<\/p>/)?.[0] ?? '';
        expect(context, `${record.id} has no context line`).not.toBe('');

        const anchors = anchorTags(context);
        expect(anchors, `${record.id}'s context line holds no anchor`).toHaveLength(1);
        const tag = anchors[0] as string;

        expect(attr(tag, 'href'), `${record.id}'s back link`).toBe(`/photography/${category.id}`);

        const text = decodeEntitiesOnce(stripTags(context)).replace(/\s+/g, ' ').trim();
        expect(text, `${record.id}'s eyebrow`).toBe(`← ${category.label.toUpperCase()}`);

        // A LABEL, because the visible text is an arrow and a shouted word. Announced as "Back to
        // Architecture" rather than "left arrow architecture".
        expect(attr(tag, 'aria-label'), `${record.id}'s eyebrow is unlabelled`).toBe(
          `Back to ${category.label}`
        );
      }
    }
    report(
      `back link: 1 per page on all ${manifest.length} pages — "← {CATEGORY}", labelled and linked`
    );
  });
});

describe('🔴 the join: every gallery tile resolves to a page this route generated (BL-8)', () => {
  it('answers 200 for the exact href every built tile carries', async () => {
    const generated = new Set(manifest.map((record) => photoHref(record)));
    const seen = new Set<string>();
    let tiles = 0;
    let redirected = 0;

    for (const url of GALLERY_URLS) {
      const gallery = await get(url);
      expect(gallery.status, `${url} did not answer 200`).toBe(200);

      const hrefs = anchorTags(gallery.html)
        .filter((tag) => (attr(tag, 'class') ?? '').split(/\s+/).includes('ph-tile'))
        .map((tag) => attr(tag, 'href') ?? '');
      expect(
        hrefs.length,
        `${url} rendered no tiles — the join would compare nothing`
      ).toBeGreaterThan(0);

      for (const href of hrefs) {
        tiles += 1;
        seen.add(href);
        expect(
          generated.has(href),
          `${url} links to ${href}, which no page was generated for`
        ).toBe(true);
        const page = await get(href);
        expect(page.status, `the tile href ${href} is not answered by a page`).toBe(200);
        if (page.redirected) redirected += 1;
        expect(
          page.html,
          `${href} answered, but with something that is not a photo page`
        ).toContain('class="pd-shot"');
      }
    }

    expect(seen.size, 'the tiles do not cover every generated page').toBe(generated.size);
    report(
      `join: ${tiles} tile href(s) across ${GALLERY_URLS.length} built gallery documents, ` +
        `${seen.size} distinct, every one fetched VERBATIM and answered 200 by a photo page ` +
        `(${redirected} of ${tiles} through one 307 to the slashed form); ` +
        `${generated.size} pages generated`
    );
  });
});
