import { describe, expect, inject, it } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import siteConfig from '../../data/site_config.json';
import { COUNT_ID, TITLE_ID } from '../../src/lib/photo-filter';
import { photoHref } from '../../src/lib/photo-srcset';

const previewBaseUrl = inject('previewBaseUrl');
const report = (line: string) => process.stdout.write(`${line}\n`);

if (!Array.isArray(manifest) || manifest.length === 0) {
  throw new Error('gallery-island: data/portfolio_images.json holds no records; nothing to check.');
}
if (!Array.isArray(siteConfig.categories) || siteConfig.categories.length === 0) {
  throw new Error(
    'gallery-island: data/site_config.json declares no categories; nothing to check.'
  );
}

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

const ZERO_JS_ROUTES = [
  { name: '/', url: '/' },
  { name: '/development', url: '/development/' },
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

const decode = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

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
    /*
     * `+ 2`, DOWN FROM `+ 3`: `/` and `/development` are the fixed routes now. `/resume` was the
     * third until the route was removed on 2026-09-05. Derived from the manifest plus a NAMED
     * count rather than from `ZERO_JS_ROUTES.length` itself, which would compare the list to itself
     * and pass however many entries it lost.
     */
    expect(ZERO_JS_ROUTES.length).toBe(manifest.length + 2);
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

      expect(anchors.map((a) => a.index)).toEqual(SHIPPED.map((_, i) => String(i)));

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
      expect(occurrences(html, '<astro-island')).toBe(1);
      expect(occurrences(html, '</astro-island>')).toBe(1);
    }
    report(`no client: directive on any tile anchor across ${GALLERY_ROUTES.length} routes`);
  });
});

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

describe('the heading does not move with the filter (Akhil, 2026-09-04)', () => {
  const words = (fragment: string) =>
    decode(fragment.replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();

  it('serves the fixed heading on /photography, and the category routes keep their own name', async () => {
    const all = await body('/photography', '/photography/');
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(all)?.[1] ?? '';
    expect(words(h1), '/photography does not serve "Photographs" as its heading').toBe(
      'Photographs'
    );
    expect(all, `the heading has lost its ${TITLE_ID} hook`).toContain(`id="${TITLE_ID}"`);

    const category = siteConfig.categories[0] as { id: string; label: string };
    const one = await body(`/photography/${category.id}`, `/photography/${category.id}/`);
    const catH1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(one)?.[1] ?? '';
    expect(words(catH1), `/photography/${category.id} does not name itself`).toBe(category.label);

    report(
      `heading: /photography serves "Photographs", /photography/${category.id} serves ` +
        `"${category.label}" — the page names itself, the view does not rename it`
    );
  });

  it('ships no client code that writes to the heading', async () => {
    const html = await body('/photography', '/photography/');
    const { componentUrl } = island(html);
    const bundle = await (await fetch(`${previewBaseUrl}${componentUrl}`)).text();

    expect(
      bundle.length,
      'the island bundle is empty — the assertions below would read nothing'
    ).toBeGreaterThan(0);
    expect(bundle, 'the bundle does not carry the count id, so this is the wrong file').toContain(
      COUNT_ID
    );

    expect(bundle, `the island still reaches for ${TITLE_ID}`).not.toContain(TITLE_ID);
    expect(bundle, 'the island still carries the retired heading helper').not.toContain(
      'headingFor'
    );

    report(`island bundle: writes ${COUNT_ID}, never reaches ${TITLE_ID} — heading is server-only`);
  });
});
