/**
 * The gallery island, over HTTP, against the built site served by real `workerd`.
 *
 * ================================================================================================
 * 🔴 THIS FILE USED TO BE `lightbox.node.test.ts`, AND THE RENAME IS THE POINT
 * ================================================================================================
 *
 * The overlay it was written for no longer exists. Akhil replaced it with a real document —
 * *"build this in place of lightbox, allow nav, scroll etc"* — so `/photography/<category>/<slug>`
 * IS the photo view now, and every tile is a plain link to it rather than a click the island
 * intercepts. `PhotoLightbox.tsx` and `src/lib/photo-lightbox.ts` were deleted with it.
 *
 * The island did not go, it CHANGED OWNER. `gate:public-js` permits one `<astro-island>` per
 * document, and the filter controller had been living inside the lightbox only because of that
 * budget; with the lightbox gone the filter is the island. Same budget, one fewer component.
 *
 * WHAT SURVIVED FROM THE OLD FILE, and why each is still worth asserting:
 *
 *   - which route families hydrate and which ship nothing (PUB-14) — unchanged in substance
 *   - the grid is static HTML and every tile is a working link (§9.2) — MORE important now, since
 *     the link IS the navigation rather than a fallback behind a click handler
 *   - what the page hands the island — the props changed shape completely
 *
 * WHAT DID NOT SURVIVE: the caption assertions. `captionFor` was a lightbox export; the caption is
 * rendered by the photo document now and is asserted in `photo-detail.node.test.ts`, where the
 * markup it describes actually lives.
 *
 * ================================================================================================
 * 🔴 "EXACTLY ONE MODULE SCRIPT" IS THE WRONG PREDICATE. MEASURED.
 * ================================================================================================
 *
 * **Astro 7 emits ZERO `<script type="module">` for an island.** A hydrated gallery document
 * carries `<astro-island component-url=… component-export=… renderer-url=…>` plus classic
 * `<script>` blocks, one of which `import()`s the chunk dynamically. So `<script type="module">`
 * is 0 on a page that ships React, and a suite asserting 1 would be red against a correct build
 * while a suite asserting 0 would be green on a page that hydrates. Both are useless. The predicate
 * used here is the `<astro-island>` ELEMENT and the chunk it names.
 *
 * ================================================================================================
 * EVERY EXPECTATION IS DERIVED AT CHECK TIME
 * ================================================================================================
 *
 * Tile counts, item counts and route lists all come from `data/` and `src/lib/` when the assertion
 * runs. §13.3 applies to tests as much as to copy: 03-01's `--verify` hardcoded 39 and stopped
 * being true the day the 40th landed. There is no literal count in this file.
 *
 * Reporting is `process.stdout.write`. Under this repository's vitest setup `console.log` prints
 * NOTHING (04-01 measured it with a probe), and a check reporting through a swallowed channel is
 * indistinguishable from one that found nothing.
 */

import { describe, expect, inject, it } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import siteConfig from '../../data/site_config.json';
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
  throw new Error('gallery-island: data/portfolio_images.json holds no records; nothing to check.');
}
if (!Array.isArray(siteConfig.categories) || siteConfig.categories.length === 0) {
  throw new Error(
    'gallery-island: data/site_config.json declares no categories; nothing to check.'
  );
}

/** The eight documents permitted to hydrate, and the photographs each must hand the island. */
const GALLERY_ROUTES = [
  {
    name: '/photography',
    url: '/photography/',
    expected: [...manifest].sort((a, b) => a.order - b.order),
  },
  ...siteConfig.categories.map((category) => ({
    name: `/photography/${category.id}`,
    url: `/photography/${category.id}/`,
    expected: manifest
      .filter((record) => record.category === category.id)
      .sort((a, b) => a.categoryOrder - b.categoryOrder),
  })),
];

/**
 * Four route families that must ship NO island. `/photography/<category>/<slug>` is represented by every
 * one of its pages, derived from the manifest rather than sampled: PUB-14's claim is about all of
 * them, and one spot check would pass on a build that hydrated the other thirty-nine.
 */
const ZERO_JS_ROUTES = [
  { name: '/', url: '/' },
  { name: '/development', url: '/development/' },
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
      `gallery-island: ${name} answered ${response.status}; there is nothing to assert on.`
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
      'gallery-island: no <astro-island> in the response. Every assertion about the island would ' +
        'otherwise run over an empty string and pass, which is exactly how a page that stopped ' +
        'hydrating would look identical to one that never did.'
    );
  }
  const attr = (name: string) => decode(new RegExp(`\\s${name}="([^"]*)"`).exec(tag[0])?.[1] ?? '');
  const raw = attr('props');
  if (raw.length === 0) {
    throw new Error('gallery-island: the <astro-island> carries no props attribute.');
  }
  const props = untag([0, JSON.parse(raw)]) as {
    categories: Array<Record<string, unknown>>;
    photos: Array<Record<string, unknown>>;
    pathname: string;
    total: number;
    defaultColumns: number;
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
    '%s carries one island, and it is the PhotoFilters chunk',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const islands = occurrences(html, '<astro-island');
      const found = island(html);
      report(
        `${route.name}: astro-island × ${islands}  ${found.componentExport} ← ${found.componentUrl}  ` +
          `client="${found.client}"  renderer ${found.rendererUrl}`
      );
      expect(islands).toBe(1);
      expect(found.componentExport).toBe('PhotoFilters');
      expect(found.componentUrl).toMatch(/^\/_astro\/PhotoFilters\.[^/]+\.js$/);
      /*
       * `load`, NOT `idle`, AND THE CHANGE OF DIRECTIVE IS A CHANGE OF JOB. The lightbox could
       * afford `client:idle` because nothing it owned was visible until a click; the filter owns
       * controls that are on screen from the first frame, and a pill that does nothing for the
       * first few hundred milliseconds is worse than one that reloads the page. Asserted so a
       * silent move back to `idle` is visible.
       */
      expect(found.client).toBe('load');
    }
  );

  it.each(ZERO_JS_ROUTES.map((r) => [r.name, r] as const))(
    '%s ships no island at all',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      expect(occurrences(html, '<astro-island')).toBe(0);
    }
  );

  it('reports the zero-island sweep it just ran, so a green line cannot mean an empty loop', () => {
    // Not a literal: the count is the manifest's plus the three singleton routes.
    expect(ZERO_JS_ROUTES.length).toBe(manifest.length + 3);
    expect(bodies.size).toBeGreaterThanOrEqual(ZERO_JS_ROUTES.length);
    report(
      `zero-island sweep: ${ZERO_JS_ROUTES.length} documents ` +
        `(/, /development, /resume and all ${manifest.length} photo pages) — 0 astro-island`
    );
  });

  it('the photo documents ship a router module and no island — the third route class', async () => {
    /*
     * A PHOTO PAGE IS NEITHER OF THE OLD TWO CLASSES, and that is why the assertion above stops at
     * `<astro-island>` rather than also demanding zero module scripts, which it used to.
     *
     * Akhil: *"it seems like header/footer and other elements are refreshing when i move across
     * photos ... keep those elements fixed."* The fix was Astro's `ClientRouter`, so every photo
     * document now carries ONE module script — the router — while hydrating no component at all.
     * A suite that read "no island" as "no JavaScript" would have called that a regression.
     */
    const sample = ZERO_JS_ROUTES.filter((r) => r.name.startsWith('/photography/'));
    expect(sample.length).toBe(manifest.length);
    for (const route of sample) {
      const html = await body(route.name, route.url);
      expect(occurrences(html, '<astro-island')).toBe(0);
      expect(occurrences(html, '<script type="module"')).toBe(1);
    }
    report(`${sample.length} photo documents: 0 islands, exactly 1 module script (the router)`);
  });
});

/* ============================================================================================
 * §9.2 — the grid is static, and every tile is still a link
 * ========================================================================================== */

describe('the grid is static HTML and every tile is a working link (§9.2)', () => {
  /*
   * EVERY GALLERY ROUTE SHIPS EVERY PHOTOGRAPH, IN ONE ORDER. Filtering became client-side —
   * Akhil: *"Only the images should get filtered, without page reload"* — so a category document
   * is the same forty tiles as `/photography`, with the ones that do not belong carrying `hidden`.
   * MEASURED: the tile sequence on `/photography/portraits` and `/photography/wildlife` is
   * byte-identical to `/photography`'s, href for href and index for index.
   */
  const SHIPPED = [...manifest].sort((a, b) => a.order - b.order);

  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s: every tile carries a real href and a dense data-lb-index',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const anchors = [
        ...html.matchAll(/<a class="ph-tile" href="([^"]*)" data-lb-index="([^"]*)"/g),
      ].map((m) => ({ href: decode(m[1]), index: m[2] }));

      report(
        `${route.name}: ${anchors.length} tiles shipped, ${route.expected.length} of them this ` +
          `category's, indices ${anchors.length > 0 ? `${anchors[0].index}..${anchors[anchors.length - 1].index}` : '(none)'}`
      );

      expect(route.expected.length).toBeGreaterThan(0);
      expect(anchors.length).toBe(SHIPPED.length);

      // DENSE 0..n-1, derived: equality against a constructed sequence catches a gap, a duplicate,
      // a wrong order and an off-by-one, where `length === n` catches only the first.
      expect(anchors.map((a) => a.index)).toEqual(SHIPPED.map((_, i) => String(i)));

      // The href is the imported one, never re-derived here — 05-08's join, in the third place.
      expect(anchors.map((a) => a.href)).toEqual(SHIPPED.map((r) => photoHref(r)));
      for (const a of anchors) expect(a.href.startsWith('/photography/')).toBe(true);
    }
  );

  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s hides exactly the tiles that are not its own, with the `hidden` attribute',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const tags = html.match(/<a class="ph-tile"[^>]*>/g) ?? [];
      const hidden = tags.filter((t) => /\shidden(?=[\s>=])/.test(t));
      const visible = tags.length - hidden.length;
      report(`${route.name}: ${visible} visible, ${hidden.length} hidden, ${tags.length} shipped`);

      expect(visible).toBe(route.expected.length);
      expect(hidden.length).toBe(SHIPPED.length - route.expected.length);

      /*
       * THE HIDDEN SET IS THE COMPLEMENT, not merely the right SIZE. A page that hid the wrong
       * thirty-eight would satisfy the counts above and show a reader someone else's category.
       */
      const own = new Set(route.expected.map((r) => photoHref(r)));
      for (const tag of tags) {
        const href = decode(/href="([^"]*)"/.exec(tag)?.[1] ?? '');
        const isHidden = /\shidden(?=[\s>=])/.test(tag);
        expect(isHidden).toBe(!own.has(href));
      }
    }
  );

  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s has exactly one #ph-grid, and it is the masonry the island filters',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      expect(occurrences(html, 'id="ph-grid"')).toBe(1);
      expect(html).toContain('<div id="ph-grid" class="ph-masonry"');
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
       * Anchored to markup instead.
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

describe('the island is handed the whole manifest, and the route it is standing on', () => {
  const SHIPPED = [...manifest].sort((a, b) => a.order - b.order);

  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s hands the island every photograph, in the grid’s order',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const { props } = island(html);

      report(
        `${route.name}: props ${Object.keys(props).join(', ')} — ${props.photos.length} photos, ` +
          `total ${props.total}, pathname ${JSON.stringify(props.pathname)}`
      );

      /*
       * THE ISLAND SEES ALL FORTY ON EVERY ROUTE. It must: it recomputes the count line and the
       * pill states for whichever category the reader picks, without another request. A category
       * page that handed it only its own photographs could not filter to anything else.
       */
      expect(props.photos).toHaveLength(SHIPPED.length);
      expect(props.total).toBe(manifest.length);
      expect(props.photos.map((p) => p.id)).toEqual(SHIPPED.map((r) => r.id));
    }
  );

  it.each(GALLERY_ROUTES.map((r) => [r.name, r] as const))(
    '%s hands the island its own pathname, UN-normalised',
    async (_name, route) => {
      const html = await body(route.name, route.url);
      const { props } = island(html);
      /*
       * THE TRAILING SLASH IS DELIBERATE AND IS THE SEAM. `PhotoFilters` normalises the pathname
       * itself; the page passes `Astro.url.pathname` raw. If normalising moved into the page, a
       * pathname with a trailing slash would match no pill and NOTHING would be marked current —
       * silently, on every route. Asserting the raw value here is what keeps the seam where the
       * component's own header says it is.
       */
      expect(props.pathname).toBe(route.url);
    }
  );

  it('hands the island the config’s categories, in the config’s order', async () => {
    const html = await body('/photography', '/photography/');
    const { props } = island(html);
    expect(props.categories.map((c) => c.id)).toEqual(siteConfig.categories.map((c) => c.id));
    expect(props.categories.map((c) => c.label)).toEqual(siteConfig.categories.map((c) => c.label));
    expect(props.defaultColumns).toBe(siteConfig.defaultColumns);
    report(
      `categories handed to the island: ${props.categories.map((c) => c.id).join(', ')} ` +
        `(defaultColumns ${props.defaultColumns})`
    );
  });
});
