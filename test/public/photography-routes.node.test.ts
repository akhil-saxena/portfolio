import { beforeAll, describe, expect, inject, it } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import siteConfig from '../../data/site_config.json';
import { BREAKPOINTS } from '../../src/lib/layout-ladder';
import { ALL, countLineFor } from '../../src/lib/photo-filter';
import { sizesFor } from '../../src/lib/photo-srcset';

const previewBaseUrl = inject('previewBaseUrl');
const report = (line: string) => process.stdout.write(`${line}\n`);

const EAGER_TILES_PER_SPEC = 4;

const FILTER_NAV_LABEL = 'Photo categories';

type Route = {
  readonly url: string;
  readonly activeHref: string;
  readonly columns: number;
  readonly expected: ReadonlyArray<(typeof manifest)[number]>;
  readonly name: string;
  readonly countLine: string;
};

if (!Array.isArray(manifest) || manifest.length === 0) {
  throw new Error('photos-routes: data/portfolio_images.json holds no records; nothing to check.');
}
if (!Array.isArray(siteConfig.categories) || siteConfig.categories.length === 0) {
  throw new Error('photos-routes: data/site_config.json declares no categories; nothing to check.');
}

const ROUTES: readonly Route[] = [
  {
    name: '/photography',
    url: '/photography/',
    activeHref: '/photography',
    columns: siteConfig.defaultColumns,
    expected: manifest,
    countLine: countLineFor(ALL, manifest.length, manifest.length),
  },
  ...siteConfig.categories.map((category) => ({
    name: `/photography/${category.id}`,
    url: `/photography/${category.id}/`,
    activeHref: `/photography/${category.id}`,
    columns: category.columns,
    expected: manifest.filter((record) => record.category === category.id),
    countLine: countLineFor(
      category.id,
      manifest.filter((record) => record.category === category.id).length,
      manifest.length
    ),
  })),
];

const EXPECTED_PILLS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/photography', label: 'All' },
  ...siteConfig.categories.map((category) => ({
    href: `/photography/${category.id}`,
    label: category.label,
  })),
];

const bodies = new Map<string, string>();
const statuses = new Map<string, number>();

const decode = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

function filterNav(html: string): string {
  const marker = html.indexOf(`aria-label="${FILTER_NAV_LABEL}"`);
  if (marker === -1) {
    throw new Error(
      `photos-routes: no element carrying aria-label="${FILTER_NAV_LABEL}" in the response. ` +
        'Every assertion scoped to the rail would otherwise run over an empty string and pass.'
    );
  }
  const open = html.lastIndexOf('<nav', marker);
  const close = html.indexOf('</nav>', marker);
  if (open === -1 || close === -1) {
    throw new Error('photos-routes: found the rail label but no enclosing <nav> … </nav>.');
  }
  return html.slice(open, close + '</nav>'.length);
}

function pills(nav: string): ReadonlyArray<{ href: string; text: string; current: boolean }> {
  return [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const attrs = match[1];
    const href = /href="([^"]*)"/.exec(attrs)?.[1] ?? '';
    return {
      href: decode(href),
      text: decode(match[2].replace(/<[^>]*>/g, ''))
        .replace(/\s+/g, ' ')
        .trim(),
      current: /aria-current="page"/.test(attrs),
    };
  });
}

beforeAll(async () => {
  for (const route of ROUTES) {
    const response = await fetch(`${previewBaseUrl}${route.url}`);
    statuses.set(route.name, response.status);
    bodies.set(route.name, await response.text());
  }
}, 60_000);

describe('the gallery routes exist and hold every photograph, derived at check time', () => {
  it('has a route per category record, plus the unfiltered one', () => {
    expect(ROUTES.length).toBe(siteConfig.categories.length + 1);
    expect(ROUTES.length).toBeGreaterThan(1);
    report(`routes under test: ${ROUTES.map((r) => r.name).join(', ')}`);
  });

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s answers 200 and holds exactly its own photographs',
    (_name, route) => {
      expect(statuses.get(route.name)).toBe(200);
      const html = bodies.get(route.name) as string;

      const anchors = html.match(/<a class="ph-tile"[^>]*>/g) ?? [];
      const hidden = anchors.filter((a) => /\shidden(?=[\s>=])/.test(a));
      const visible = anchors.length - hidden.length;
      report(
        `${route.name}: ${anchors.length} tiles shipped, ${visible} visible, ` +
          `manifest says ${route.expected.length} in this category`
      );
      expect(route.expected.length).toBeGreaterThan(0);
      expect(anchors.length).toBe(manifest.length);
      expect(visible).toBe(route.expected.length);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s prints its derived count line with its spaces intact',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const node = /id="ph-count"[^>]*>([^<]*)</.exec(html);
      if (!node) throw new Error(`${route.name}: no #ph-count in the response.`);
      const text = decode(node[1]);
      report(`${route.name}: count line ${JSON.stringify(text)}`);
      expect(text).toBe(route.countLine);
    }
  );

  it('emits no synthetic /photography/all route — §8.1 forbids inventing one', async () => {
    const response = await fetch(`${previewBaseUrl}/photography/all/`);
    report(`/photography/all/ → ${response.status}`);
    expect(response.status).not.toBe(200);
  });
});

describe('exactly one filter pill is marked as the current page (§16 item 6)', () => {
  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s marks exactly one pill current, and it is its own',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const nav = filterNav(html);

      const inRail = occurrences(nav, 'aria-current="page"');
      const inPage = occurrences(html, 'aria-current="page"');
      report(`${route.name}: aria-current="page" — ${inRail} in the rail, ${inPage} in the page`);

      expect(inRail).toBe(1);

      expect(inPage).toBe(2);

      const current = pills(nav).filter((pill) => pill.current);
      expect(current).toHaveLength(1);
      expect(current[0].href).toBe(route.activeHref);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s renders every pill with its derived count and rejects none',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const nav = filterNav(html);
      const rendered = pills(nav);

      expect(rendered).toHaveLength(EXPECTED_PILLS.length);

      for (const [index, expectedPill] of EXPECTED_PILLS.entries()) {
        const actual = rendered[index];
        expect(actual.href).toBe(expectedPill.href);
        expect(actual.text).toBe(expectedPill.label);
      }

      const rejected = occurrences(html, 'data-rejected="true"');
      report(`${route.name}: ${rendered.length} pills, ${rejected} rejected`);
      expect(rejected).toBe(0);
    }
  );
});

describe('the tiles reserve their box and carry the right bytes (§7.2-§7.5)', () => {
  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s reserves every box, emits no width/height, and sizes agrees with the ladder',
    (_name, route) => {
      const html = bodies.get(route.name) as string;

      const anchors = html.match(/<a class="ph-tile"[^>]*>/g) ?? [];
      expect(anchors.length).toBe(manifest.length);
      for (const anchor of anchors) {
        expect(anchor).toMatch(/aspect-ratio:\s*\d+\s*\/\s*\d+/);
        expect(decode(anchor)).toContain("background-image: url('data:image/webp;base64,");
      }

      const imgs = html.match(/<img\b[^>]*>/g) ?? [];
      expect(imgs.length).toBe(manifest.length);
      expect(imgs.filter((tag) => /\swidth\s*=/.test(tag))).toHaveLength(0);
      expect(imgs.filter((tag) => /\sheight\s*=/.test(tag))).toHaveLength(0);

      const expectedSizes = sizesFor(route.columns);
      const sizesAttrs = [...html.matchAll(/<img[^>]*\ssizes="([^"]*)"/g)].map((m) => decode(m[1]));
      expect(sizesAttrs).toHaveLength(manifest.length);
      for (const attr of sizesAttrs) expect(attr).toBe(expectedSizes);
      report(`${route.name}: data-cols ${route.columns}, sizes agrees with sizesFor on all tiles`);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s defers everything below the fold — eager is min(4, tiles), not four',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const tiles = route.expected.length;
      const wanted = Math.min(EAGER_TILES_PER_SPEC, tiles);

      const eager = occurrences(html, 'loading="eager"');
      const lazy = occurrences(html, 'loading="lazy"');
      const priority = occurrences(html, 'fetchpriority="high"');
      report(`${route.name}: eager ${eager} (min(4, ${tiles}) = ${wanted}), lazy ${lazy}`);

      expect(eager).toBe(wanted);
      expect(priority).toBe(wanted);
      expect(lazy).toBe(manifest.length - wanted);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s announces each photograph by its alt, never by its title (D-24-1)',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const alts = [...html.matchAll(/<img\b[^>]*\salt="([^"]*)"/g)].map((m) => decode(m[1]));
      expect(alts).toHaveLength(manifest.length);

      const expectedAlts = new Set(manifest.map((record) => record.alt));
      const titles = new Set(manifest.map((record) => record.title));
      for (const alt of alts) {
        expect(expectedAlts.has(alt)).toBe(true);
        expect(titles.has(alt)).toBe(false);
      }
      report(`${route.name}: ${alts.length} alt values, all from the manifest, none a title`);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s hydrates exactly one island, and it is PhotoFilters (PUB-14, §5.1)',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const modules = occurrences(html, '<script type="module"');
      const islands = occurrences(html, '<astro-island');
      const component = /<astro-island[^>]*\scomponent-url="([^"]*)"/.exec(html)?.[1] ?? '';
      const exported = /<astro-island[^>]*\scomponent-export="([^"]*)"/.exec(html)?.[1] ?? '';
      report(
        `${route.name}: astro-island × ${islands} (${exported} ← ${component}), ` +
          `<script type="module"> × ${modules}`
      );
      expect(islands).toBe(1);
      expect(exported).toBe('PhotoFilters');
      expect(component).toMatch(/^\/_astro\/PhotoFilters\.[^/]*\.js$/);
      expect(modules).toBe(0);
    }
  );
});

describe('the masonry ladder in the BUILT stylesheet matches src/lib/layout-ladder.ts', () => {
  it('every media minimum attached to a .ph-masonry rule is a ladder breakpoint', async () => {
    const html = bodies.get('/photography') as string;

    const hrefs = [...html.matchAll(/<link\b[^>]*\shref="([^"]+\.css)"/g)].map((m) => m[1]);
    const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    expect(hrefs.length + inline.length).toBeGreaterThan(0);

    let css = inline.join('\n');
    for (const href of hrefs) {
      const response = await fetch(`${previewBaseUrl}${href}`);
      expect(response.status).toBe(200);
      css += await response.text();
    }
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('.ph-masonry');

    type Decl = { selector: string; atRules: string[]; prop: string; value: string };
    function declarations(sheet: string): Decl[] {
      const found: Decl[] = [];
      const stack: string[] = [];
      let buffer = '';
      for (const character of sheet) {
        if (character === '{') {
          stack.push(buffer.trim());
          buffer = '';
          continue;
        }
        if (character === '}' || character === ';') {
          const text = buffer.trim();
          buffer = '';
          const top = stack[stack.length - 1];
          if (text && top && !top.startsWith('@')) {
            const colon = text.indexOf(':');
            if (colon > 0) {
              found.push({
                selector: top,
                atRules: stack.filter((prelude) => prelude.startsWith('@')),
                prop: text.slice(0, colon).trim(),
                value: text.slice(colon + 1).trim(),
              });
            }
          }
          if (character === '}') stack.pop();
          continue;
        }
        buffer += character;
      }
      return found;
    }

    const canary = declarations('@media (width>=1px){.a{b:1}}.c{d:2}');
    expect(canary).toHaveLength(2);
    expect(canary[0].atRules).toHaveLength(1);
    expect(canary[1].atRules).toHaveLength(0);
    expect(canary[0].selector).toBe('.a');

    const decls = declarations(css);
    expect(decls.length).toBeGreaterThan(100);

    const masonry = decls.filter((d) => d.selector.includes('.ph-masonry'));
    expect(masonry.length).toBeGreaterThan(0);
    const minima = new Set<number>();
    for (const decl of masonry) {
      for (const prelude of decl.atRules) {
        const match = /(?:min-width\s*:\s*|width\s*>=\s*)(\d+)px/.exec(prelude);
        if (match) minima.add(Number(match[1]));
      }
    }

    report(
      `.ph-masonry media minima found in the built CSS: [${[...minima].sort((a, b) => a - b)}]`
    );
    report(`BREAKPOINTS from src/lib/layout-ladder.ts: [${BREAKPOINTS.join(', ')}]`);

    expect(minima.size).toBeGreaterThanOrEqual(2);
    for (const minimum of minima) expect(BREAKPOINTS).toContain(minimum);
    expect(minima.has(BREAKPOINTS[0])).toBe(true);
    expect(minima.has(BREAKPOINTS[1])).toBe(true);

    const railOverflow = decls.filter(
      (d) => d.selector.includes('.ph-filters') && d.prop === 'overflow-x'
    );
    const railWrap = decls.filter(
      (d) => d.selector.includes('.ph-filters') && d.prop === 'flex-wrap'
    );
    report(
      `.ph-filters overflow-x: ${railOverflow.length === 0 ? 'none (they wrap)' : railOverflow.map((d) => d.value).join('; ')}` +
        ` · flex-wrap: ${railWrap.map((d) => `${d.value} under [${d.atRules.join(' ') || 'no at-rule'}]`).join('; ') || 'none'}`
    );
    expect(railOverflow).toHaveLength(0);
    expect(railWrap.length).toBeGreaterThan(0);
    for (const decl of railWrap) {
      expect(decl.value).toBe('wrap');
      expect(decl.atRules).toHaveLength(0);
    }
  });
});

describe('§13.2’s returning cross-link is retired — no route under /photography carries one', () => {
  const rows = (html: string): string[] =>
    [...html.matchAll(/<p class="ph-crosslink-row">([\s\S]*?)<\/p>/g)].map((m) => m[1] as string);

  const RETIRED_COPY = '← see the work';

  it('carries no cross-link row on /photography or on any category route', () => {
    expect(ROUTES.length).toBeGreaterThan(1);

    for (const route of ROUTES) {
      const html = bodies.get(route.name) as string;
      expect(html, `no body was fetched for ${route.name}`).toBeTruthy();
      expect(rows(html), `${route.name} must not carry a cross-link row`).toHaveLength(0);
    }

    const counts = ROUTES.map((route) => rows(bodies.get(route.name) as string).length);
    report(`cross-link rows: [${counts.join(', ')}] across ${ROUTES.length} route(s) — all zero`);
  });

  it('does not ship the retired copy under any other wrapper', () => {
    for (const route of ROUTES) {
      const html = decode(bodies.get(route.name) as string);
      expect(html.includes(RETIRED_COPY), `${route.name} still ships ${RETIRED_COPY}`).toBe(false);
    }
    report(`"${RETIRED_COPY}" appears on none of the ${ROUTES.length} routes`);
  });

  it('and the OUTGOING half is retired too — /development carries no row either', async () => {
    const response = await fetch(`${previewBaseUrl}/development/`);
    expect(response.status).toBe(200);
    const html = decode(await response.text());
    expect(html, '/development still ships the outgoing cross-link copy').not.toContain(
      'see the photographs'
    );
    expect(
      [...html.matchAll(/<p class="wk-crosslink-row">/g)],
      '/development still ships a cross-link row'
    ).toHaveLength(0);
    report('/development carries neither row nor copy — §13.2\u2019s pair is fully retired');
  });
});
