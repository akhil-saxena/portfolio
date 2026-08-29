/**
 * The lightbox island, over HTTP, against the built site served by real `workerd`.
 * Plan 05-12, Task 3. (PUB-06, PUB-07, PUB-14; §5.1, §5.3, §9.2, §9.3, §9.4.)
 *
 * ================================================================================================
 * WHAT THIS FILE CAN AND CANNOT SAY, STATED FIRST SO NO ASSERTION HERE IS OVER-READ
 * ================================================================================================
 *
 * The island renders NOTHING server-side — `Lightbox` returns `null` while `open` is false — so
 * there is no lightbox markup in any document and no HTTP assertion can reach the interaction.
 * Escape, the backdrop, the swipe, the arrow keys, the `aria-live` announcement and the Back button
 * were all measured in real Chromium instead, and every reading is quoted in `05-12-SUMMARY.md`.
 *
 * What HTTP CAN say is the static half, and it is the half PUB-14 lives in: which routes hydrate,
 * what the island is handed, and that every tile is still a link.
 *
 * ================================================================================================
 * 🔴 "EXACTLY ONE MODULE SCRIPT" IS THE WRONG PREDICATE. MEASURED.
 * ================================================================================================
 *
 * The plan's Task 3 asks for "for each gallery page, exactly one module script", and §5.3's
 * assertions 1 and 3 are written against the same spelling. **Astro 7 emits ZERO
 * `<script type="module">` for an island.** A hydrated gallery document carries:
 *
 *     <astro-island component-url="/_astro/PhotoLightbox.<hash>.js"
 *                   component-export="PhotoLightbox"
 *                   renderer-url="/_astro/client.<hash>.js" ...>
 *
 * plus THREE classic `<script>` blocks — the shell's theme block, and two Astro bootstrap blocks,
 * the second of which `import()`s the chunk dynamically. So `<script type="module">` is 0 on a page
 * that ships 209 KB of React, and a suite asserting 1 would be red against a correct build while a
 * suite asserting 0 would be green on a page that hydrates. Both are useless.
 *
 * The predicate used here is the `<astro-island>` element and the chunk it names. 05-08 flagged the
 * hole this closes: *"Not closed by anything today: a dynamic `import()` inside a classic script."*
 *
 * ================================================================================================
 * EVERY EXPECTATION IS DERIVED AT CHECK TIME
 * ================================================================================================
 *
 * Tile counts, item counts, `src` values and route lists all come from `data/` and `src/lib/` when
 * the assertion runs. §13.3 applies to tests as much as to copy: 03-01's `--verify` hardcoded 39
 * and stopped being true the day the 40th landed. There is no literal count in this file.
 *
 * Reporting is `process.stdout.write`. Under this repository's vitest setup `console.log` prints
 * NOTHING (04-01 measured it with a probe), and a check reporting through a swallowed channel is
 * indistinguishable from one that found nothing.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, inject, it } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import siteConfig from '../../data/site_config.json';
import { captionFor } from '../../src/components/public/PhotoLightbox';
import { exifRows } from '../../src/lib/exif-display';
import { lightboxRecordsFor } from '../../src/lib/photo-lightbox';
import { photoHref } from '../../src/lib/photo-srcset';

const previewBaseUrl = inject('previewBaseUrl');
const report = (line: string) => process.stdout.write(`${line}\n`);

/*
 * ANTI-VACUITY, BEFORE ANY ROUTE IS DERIVED. An empty manifest or an empty category list would make
 * every loop below iterate zero times and every assertion pass; `it()` blocks that never run are
 * reported as a green file. 05-08 measured the right failure shape for this: the FILE fails and
 * vitest prints "no tests", which is unmistakable.
 */
if (!Array.isArray(manifest) || manifest.length === 0) {
  throw new Error('lightbox: data/portfolio_images.json holds no records; nothing to check.');
}
if (!Array.isArray(siteConfig.categories) || siteConfig.categories.length === 0) {
  throw new Error('lightbox: data/site_config.json declares no categories; nothing to check.');
}

/** The eight documents permitted to hydrate, and the photographs each must hand the island. */
const GALLERY_ROUTES = [
  {
    name: '/photos',
    url: '/photos/',
    expected: [...manifest].sort((a, b) => a.order - b.order),
  },
  ...siteConfig.categories.map((category) => ({
    name: `/photos/${category.id}`,
    url: `/photos/${category.id}/`,
    expected: manifest
      .filter((record) => record.category === category.id)
      .sort((a, b) => a.categoryOrder - b.categoryOrder),
  })),
];

/**
 * Four route families that must ship NO island. `/photos/<category>/<slug>` is represented by every
 * one of its pages, derived from the manifest rather than sampled: PUB-14's claim is about all of
 * them, and one spot check would pass on a build that hydrated the other thirty-nine.
 */
const ZERO_JS_ROUTES = [
  { name: '/', url: '/' },
  { name: '/work', url: '/work/' },
  { name: '/resume', url: '/resume/' },
  ...manifest.map((record) => ({ name: photoHref(record), url: `${photoHref(record)}/` })),
];

const bodies = new Map<string, string>();

async function body(name: string, url: string): Promise<string> {
  const cached = bodies.get(name);
  if (cached !== undefined) return cached;
  const response = await fetch(`${previewBaseUrl}${url}`);
  const text = await response.text();
  if (response.status !== 200) {
    throw new Error(
      `lightbox: ${name} answered ${response.status}; there is nothing to assert on.`
    );
  }
  bodies.set(name, text);
  return text;
}

/** The five entities Astro emits in an attribute value. */
const decode = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/**
 * Astro serialises island props as `[tag, value]` pairs — MEASURED against this build: `0` is a
 * plain value and `1` is an array, and every property of a plain object is itself tagged. Decoding
 * rather than regexing the attribute is what lets the assertions below talk about the ITEMS the
 * island receives instead of about a string that happens to contain a URL.
 */
type Tagged = [number, unknown];

function untag(node: unknown): unknown {
  if (!Array.isArray(node) || node.length !== 2 || typeof node[0] !== 'number') return node;
  const [tag, value] = node as Tagged;
  if (tag === 1) return (value as unknown[]).map(untag);
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, untag(v)])
    );
  }
  return value;
}

/** The `<astro-island>` on a page, with its attributes and its decoded props. */
function island(html: string) {
  const tag = /<astro-island\b[^>]*>/.exec(html);
  if (!tag) {
    throw new Error(
      'lightbox: no <astro-island> in the response. Every assertion about the island would ' +
        'otherwise run over an empty string and pass, which is exactly how a page that stopped ' +
        'hydrating would look identical to one that never did.'
    );
  }
  const attr = (name: string) => decode(new RegExp(`\\s${name}="([^"]*)"`).exec(tag[0])?.[1] ?? '');
  const raw = attr('props');
  if (raw.length === 0) {
    throw new Error('lightbox: the <astro-island> carries no props attribute.');
  }
  const props = untag([0, JSON.parse(raw)]) as {
    items: Array<Record<string, unknown>>;
    gridSelector: string;
  };
  return {
    componentUrl: attr('component-url'),
    componentExport: attr('component-export'),
    rendererUrl: attr('renderer-url'),
    client: attr('client'),
    props,
  };
}

/* ============================================================================================
 * PUB-14 — exactly one route family hydrates
 * ========================================================================================== */

describe('exactly one route family hydrates, and it is the gallery (PUB-14, §5.1)', () => {
  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s carries one island, and it is the Lightbox chunk',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const islands = occurrences(html, '<astro-island');
      const found = island(html);
      report(
        `${route.name}: astro-island × ${islands}  ${found.componentExport} ← ${found.componentUrl}  ` +
          `client="${found.client}"  renderer ${found.rendererUrl}`
      );
      expect(islands).toBe(1);
      expect(found.componentExport).toBe('PhotoLightbox');
      expect(found.componentUrl).toMatch(/^\/_astro\/PhotoLightbox\.[^/]+\.js$/);
      // §9.2 chose `client:idle` over `client:load`; the four measurements behind keeping it are
      // in the summary. The attribute is asserted so a silent change to `load` is visible.
      expect(found.client).toBe('idle');
    }
  );

  it.each(ZERO_JS_ROUTES.map((r) => [r.name, r] as const))(
    '%s ships no island at all',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      expect(occurrences(html, '<astro-island')).toBe(0);
      expect(occurrences(html, '<script type="module"')).toBe(0);
      expect(occurrences(html, "<script type='module'")).toBe(0);
    }
  );

  it('reports the zero-JS sweep it just ran, so a green line cannot mean an empty loop', () => {
    // Not `toBe(43)`: the count is the manifest's plus the three singleton routes.
    expect(ZERO_JS_ROUTES.length).toBe(manifest.length + 3);
    expect(bodies.size).toBeGreaterThanOrEqual(ZERO_JS_ROUTES.length);
    report(
      `zero-island sweep: ${ZERO_JS_ROUTES.length} documents ` +
        `(/, /work, /resume and all ${manifest.length} photo pages) — 0 astro-island, 0 module scripts`
    );
  });
});

/* ============================================================================================
 * §9.2 — the grid is static, and every tile is still a link
 * ========================================================================================== */

describe('the grid is static HTML and every tile is a working link (§9.2)', () => {
  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s: every tile carries a real href and a dense data-lb-index',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const anchors = [
        ...html.matchAll(/<a class="ph-tile" href="([^"]*)" data-lb-index="([^"]*)"/g),
      ].map((m) => ({ href: decode(m[1]), index: m[2] }));

      report(
        `${route.name}: ${anchors.length} tiles, manifest ${route.expected.length}, ` +
          `indices ${anchors.length > 0 ? `${anchors[0].index}..${anchors[anchors.length - 1].index}` : '(none)'}`
      );

      expect(route.expected.length).toBeGreaterThan(0);
      expect(anchors.length).toBe(route.expected.length);

      // DENSE 0..n-1, derived: equality against a constructed sequence catches a gap, a duplicate,
      // a wrong order and an off-by-one, where `length === n` catches only the first.
      const indices = anchors.map((a) => a.index);
      expect(indices).toEqual(route.expected.map((_, i) => String(i)));

      // The href is the imported one, never re-derived here — 05-08's join, in the third place.
      expect(anchors.map((a) => a.href)).toEqual(route.expected.map((r) => photoHref(r)));
      for (const a of anchors) expect(a.href.startsWith('/photos/')).toBe(true);
    }
  );

  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s has exactly one #ph-grid, and it is the masonry the island is pointed at',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      expect(occurrences(html, 'id="ph-grid"')).toBe(1);
      expect(html).toContain('<div id="ph-grid" class="ph-masonry"');
      expect(island(html).props.gridSelector).toBe('#ph-grid');
    }
  );

  it('no tile anchor carries a client directive, so the grid itself never hydrates', async () => {
    for (const route of GALLERY_ROUTES) {
      const html = await body(route.name, route.url);
      expect(html).not.toMatch(/<a class="ph-tile"[^>]*client:/);
      /*
       * 🔴 THE FIRST VERSION COUNTED THE BARE STRING `astro-island` AND EXPECTED 2 — the open and
       * close tag. It measured SEVEN. Astro's bootstrap block contains
       * `customElements.define('astro-island', ...)` and several other mentions, so a bare
       * substring count reads the runtime that DEFINES the element as further instances of it.
       * This is the same class as 05-08's `grep -c 'pd-exif'` returning 5 on a page that renders
       * none, found here in my own assertion. Anchored to markup instead.
       */
      expect(occurrences(html, '<astro-island')).toBe(1);
      expect(occurrences(html, '</astro-island>')).toBe(1);
    }
    report(`no client: directive on any tile anchor across ${GALLERY_ROUTES.length} routes`);
  });
});

/* ============================================================================================
 * The island's props — what the page actually hands it
 * ========================================================================================== */

describe("the island's items are the page's photographs, in the page's order", () => {
  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s: one item per tile, and items[i] is the photograph at data-lb-index="i"',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const items = island(html).props.items;
      report(`${route.name}: ${items.length} island items, ${route.expected.length} tiles`);
      expect(items.length).toBe(route.expected.length);
      expect(items.map((i) => i.src)).toEqual(route.expected.map((r) => r.urls.large));
      expect(items.map((i) => i.alt)).toEqual(route.expected.map((r) => r.alt));
    }
  );

  it('the items are exactly what lightboxRecordsFor produces — no second derivation', async () => {
    for (const route of GALLERY_ROUTES) {
      const html = await body(route.name, route.url);
      expect(island(html).props.items).toEqual(lightboxRecordsFor(route.expected));
    }
    report(`island props reconcile with lightboxRecordsFor on all ${GALLERY_ROUTES.length} routes`);
  });

  it('🔴 no item carries `date` — §9.4, and the gate that keeps it that way', async () => {
    let checked = 0;
    for (const route of GALLERY_ROUTES) {
      const html = await body(route.name, route.url);
      for (const item of island(html).props.items) {
        checked++;
        expect(Object.keys(item)).not.toContain('date');
        // The whole serialised attribute, not just the keys: a date reaching the page under any
        // other name would still be an ingest date on the wire.
        expect(JSON.stringify(item)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    }
    expect(checked).toBeGreaterThan(manifest.length);
    report(`${checked} island items across 8 routes, none carrying a date or a date-shaped string`);
  });

  it('no item carries `sizes`: the lightbox is full-bleed and 100vw is the correct default', async () => {
    const html = await body('/photos', '/photos/');
    const items = island(html).props.items;
    for (const item of items) {
      expect(Object.keys(item)).not.toContain('sizes');
      expect(typeof item.srcSet).toBe('string');
      expect((item.srcSet as string).length).toBeGreaterThan(0);
    }
    report(`${items.length} items: srcSet on every one, sizes on none`);
  });

  it('`place` is present on exactly the records that carry one, and absent elsewhere', async () => {
    const html = await body('/photos', '/photos/');
    const items = island(html).props.items;
    const sorted = [...manifest].sort((a, b) => a.order - b.order);
    const withPlace = sorted.filter((r) => 'place' in r && r.place).length;
    let seen = 0;
    items.forEach((item, i) => {
      const record = sorted[i] as { place?: string };
      if (record.place) {
        expect(item.place).toBe(record.place);
        seen++;
      } else {
        expect(Object.keys(item)).not.toContain('place');
      }
    });
    // Derived from the manifest, and required to be a real subset — 0 or all-40 would both mean the
    // conditional spread is not doing anything and this assertion is measuring nothing.
    expect(seen).toBe(withPlace);
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThan(items.length);
    report(`place: present on ${seen} of ${items.length} items, matching the manifest`);
  });
});

/* ============================================================================================
 * PUB-07 in the lightbox — the same omit-null rule, from the same module
 * ========================================================================================== */

describe('the caption obeys PUB-07, and it is exifRows that decides (§9.3)', () => {
  const sorted = [...manifest].sort((a, b) => a.order - b.order);
  const records = lightboxRecordsFor(sorted);

  it('🔴 a record whose exifRows is empty and which has no place gets NO caption at all', () => {
    const degenerate = sorted
      .map((record, i) => ({ record, item: records[i] }))
      .filter(({ record }) => exifRows(record.exif).length === 0 && !('place' in record));
    // FOUND, not named: the corpus is required to still contain the degenerate case, so the day it
    // disappears this assertion refuses rather than passing over an empty list.
    expect(degenerate.length).toBeGreaterThan(0);
    for (const { record, item } of degenerate) {
      expect(captionFor(item)).toBeUndefined();
      report(`no caption: ${record.id} — exifRows 0, no place`);
    }
  });

  it('every other record renders one row per surviving field, and no placeholder', () => {
    let rowsRendered = 0;
    let blocks = 0;
    for (const [i, record] of sorted.entries()) {
      const caption = captionFor(records[i]);
      const expectedRows = exifRows(record.exif);
      if (expectedRows.length === 0 && !('place' in record)) continue;
      blocks++;
      const html = renderToStaticMarkup(caption as React.ReactElement);
      const rows = occurrences(html, 'class="ph-lb-row"');
      rowsRendered += rows;
      expect(rows).toBe(expectedRows.length);
      for (const row of expectedRows) {
        expect(html).toContain(row.label);
      }
      // PUB-07's forbidden three, and the em dash is U+2014 only: LENS_DISPLAY_NAMES renders EN
      // dashes on purpose (`18–55mm f/3.5–5.6` is a range) and conflating them would red two
      // thirds of the corpus against correct code. 05-08 measured that on 26 of 40 pages.
      expect(html).not.toContain('—');
      expect(html).not.toContain('Unknown');
      expect(html).not.toContain('N/A');
      expect(html).not.toMatch(/<span class="ph-lb-row"><\/span>/);
    }
    expect(blocks).toBeGreaterThan(0);
    expect(rowsRendered).toBeGreaterThan(0);
    report(`captions: ${blocks} blocks, ${rowsRendered} rows, 0 em dashes / Unknown / N/A`);
  });

  it('a record with a place but no EXIF renders the place and no rows', () => {
    // A CONSTRUCTED record, not a manifest one: the branch is unreachable against committed data
    // (the only all-null record has no place), and the rule still has to be right the day one
    // arrives. `data/` is reviewed content and is never written by a test.
    const caption = captionFor({
      src: 'https://example.invalid/a-lg.webp',
      alt: 'a constructed record used only to reach a branch the corpus cannot',
      srcSet: 'https://example.invalid/a-lg.webp 1200w',
      place: 'Sintra, Portugal',
      exif: {
        camera: null,
        lens: null,
        aperture: null,
        shutter: null,
        iso: null,
        focalLength: null,
      },
    });
    expect(caption).toBeDefined();
    const html = renderToStaticMarkup(caption as React.ReactElement);
    expect(html).toContain('Sintra, Portugal');
    expect(occurrences(html, 'class="ph-lb-row"')).toBe(0);
    report(`constructed place-only record: ${html}`);
  });

  it('the caption never carries a design-system tone, so the always-dark surface owns the colour', () => {
    const withExif = sorted.findIndex((r) => exifRows(r.exif).length > 0);
    expect(withExif).toBeGreaterThan(-1);
    const html = renderToStaticMarkup(captionFor(records[withExif]) as React.ReactElement);
    // `data-tone` on the value would beat a consumer class at (0,2,0) and paint a theme ink on a
    // 92%-black backdrop. Proven load-bearing by a browser negative control — see the summary.
    expect(html).not.toMatch(/class="ds-atom-text"[^>]*data-tone=/);
    expect(html).not.toMatch(/class="ds-atom-text"[^>]*style="[^"]*\bcolor:/);
    // `Eyebrow` is the opposite case: it INLINES `var(--ink-3)` unless told otherwise and offers
    // no cascade path, so the island passes its documented `color` prop. Asserted on the element
    // that carries it rather than on the document, so a stray `color:inherit` elsewhere cannot
    // satisfy this.
    expect(html).toMatch(/class="ds-atom-eyebrow"[^>]*style="[^"]*color:inherit/);
    report(`caption markup for ${sorted[withExif].id}: ${html.slice(0, 200)}`);
  });
});
