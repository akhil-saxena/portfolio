/**
 * The eight gallery routes, over HTTP, against the built site served by real `workerd`.
 * Plan 05-07, Task 3. (PUB-03, PUB-04, PUB-05; §7.1-§7.5, §8.1-§8.3, §13.3, §16 item 6.)
 *
 * ================================================================================================
 * WHY THIS IS AN HTTP SUITE AND NOT A UNIT ONE
 * ================================================================================================
 *
 * Every claim below is about what SHIPPED. The prerender runs inside workerd — 05-01 measured that
 * a module passing thirteen unit tests can detonate on the first real page — so a green vitest run
 * over the source would be evidence about a runtime the site does not have. The `integration`
 * project builds the site and serves it through `@astrojs/cloudflare`'s preview entrypoint, which
 * runs the built Worker in genuine `workerd`; these assertions read the bytes off a socket.
 *
 * ================================================================================================
 * EVERY EXPECTATION IS DERIVED AT CHECK TIME. THERE IS ONE NUMBER IN THIS FILE.
 * ================================================================================================
 *
 * Tile counts, per-pill counts, route lists and column counts all come from `data/` and from
 * `src/lib/` at check time, so the day a 41st photograph or an eighth category lands, this file
 * strengthens instead of turning red. §13.3's rule applies to tests as much as to copy: 03-01's
 * `--verify` hardcoded 39 and stopped being true the day the 40th landed.
 *
 * THE ONE NUMBER IS `EAGER_TILES_PER_SPEC`. It is §7.5's REQUIREMENT, written here independently of
 * the component that implements it, which is what a test is for. It is stated as a CAP rather than
 * as an equality — see its own comment.
 *
 * ================================================================================================
 * REPORTING IS `process.stdout.write`, NEVER `console.log`
 * ================================================================================================
 *
 * 04-01 measured it with a probe: under this repository's vitest setup `console.log` and
 * `console.info` print NOTHING, and a check reporting its findings through a swallowed channel is
 * indistinguishable from one that found nothing.
 */

import { beforeAll, describe, expect, inject, it } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import siteConfig from '../../data/site_config.json';
import { BREAKPOINTS } from '../../src/lib/layout-ladder';
import { sizesFor } from '../../src/lib/photo-srcset';

const previewBaseUrl = inject('previewBaseUrl');
const report = (line: string) => process.stdout.write(`${line}\n`);

/**
 * §7.5: the first four tiles are eager so the LCP candidate is not deferred.
 *
 * A CAP, not a count. MEASURED: `portraits` and `product` hold TWO photographs each, so "exactly
 * four tiles carry loading=eager" is FALSE on two of the seven category routes — and on any
 * category Phase 7 adds before its fourth photograph. The claim that is true on all eight routes is
 * `min(4, tiles)`, and asserting the literal four would have made this suite red against correct
 * code on five of the eight pages the moment it was written.
 */
const EAGER_TILES_PER_SPEC = 4;

/** The filter rail's accessible name, which is also how this suite finds the nav. §8.2. */
const FILTER_NAV_LABEL = 'Photo categories';

type Route = {
  /** The URL fetched. Trailing slash: Astro's directory build format is what is served. */
  readonly url: string;
  /** The href `FilterNav` must mark current — derived here, NOT imported from the component. */
  readonly activeHref: string;
  /** The class-5/6 column count this route renders at. */
  readonly columns: number;
  /** The photographs this route must show, filtered from the manifest at check time. */
  readonly expected: ReadonlyArray<(typeof manifest)[number]>;
  readonly name: string;
  /**
   * The `<Eyebrow>` line under the heading, composed here from the manifest.
   *
   * IT IS ASSERTED CHARACTER FOR CHARACTER BECAUSE OF A DEFECT THIS SUITE DID NOT CATCH. Written
   * in the route as two adjacent expressions inside a framework component's children — `{count}
   * {noun}` — the space between them is DROPPED by Astro's slot serialisation, and every category
   * route shipped `14photographs`. Nothing else on the page was wrong, the build was green and all
   * 59 assertions here were green; it was found by the empty-category control. So the exact string
   * is now a standing assertion rather than an appearance.
   */
  readonly countLine: string;
};

/*
 * ANTI-VACUITY, BEFORE ANY ROUTE IS BUILT. An empty manifest or an empty category list would make
 * every loop below iterate zero times and every assertion pass. `it()` blocks that never run are
 * reported as a green file.
 */
if (!Array.isArray(manifest) || manifest.length === 0) {
  throw new Error('photos-routes: data/portfolio_images.json holds no records; nothing to check.');
}
if (!Array.isArray(siteConfig.categories) || siteConfig.categories.length === 0) {
  throw new Error('photos-routes: data/site_config.json declares no categories; nothing to check.');
}

const ROUTES: readonly Route[] = [
  {
    name: '/photos',
    url: '/photos/',
    activeHref: '/photos',
    columns: siteConfig.defaultColumns,
    expected: manifest,
    countLine: `${manifest.length} photographs — all of them`,
  },
  ...siteConfig.categories.map((category) => ({
    name: `/photos/${category.id}`,
    url: `/photos/${category.id}/`,
    activeHref: `/photos/${category.id}`,
    columns: category.columns,
    expected: manifest.filter((record) => record.category === category.id),
    countLine: (() => {
      const n = manifest.filter((record) => record.category === category.id).length;
      return `${n} ${n === 1 ? 'photograph' : 'photographs'}`;
    })(),
  })),
];

/** Every pill the rail must carry, in order: the unfiltered one, then the config's records. */
const EXPECTED_PILLS: ReadonlyArray<{ href: string; label: string; count: number }> = [
  { href: '/photos', label: 'All', count: manifest.length },
  ...siteConfig.categories.map((category) => ({
    href: `/photos/${category.id}`,
    label: category.label,
    count: manifest.filter((record) => record.category === category.id).length,
  })),
];

const bodies = new Map<string, string>();
const statuses = new Map<string, number>();

/** The whole document, decoded. Astro escapes attribute values; these are the five it emits. */
const decode = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/**
 * The `<nav>` `FilterNav` renders, sliced out by its accessible name.
 *
 * SCOPED, AND THAT IS THE POINT. §16 item 6 asks for exactly one `aria-current="page"` per gallery
 * page; the PAGE carries two, because `PublicNav` also marks the AppBar's "photographs" link
 * current on every route under `/photos`. Counting document-wide would assert 2 and prove nothing
 * about the filter; counting inside this slice asserts the thing PUB-04 actually needs. Both are
 * checked below, separately.
 */
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

/** `[{ href, text }]` for every anchor in the rail, in document order. */
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
    // Not `toBe(8)`: the count is the config's, so an eighth category strengthens this.
    expect(ROUTES.length).toBe(siteConfig.categories.length + 1);
    expect(ROUTES.length).toBeGreaterThan(1);
    report(`routes under test: ${ROUTES.map((r) => r.name).join(', ')}`);
  });

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s answers 200 and holds exactly its own photographs',
    (_name, route) => {
      expect(statuses.get(route.name)).toBe(200);
      const html = bodies.get(route.name) as string;
      const tiles = occurrences(html, 'class="ph-tile"');
      report(`${route.name}: ${tiles} tiles, manifest says ${route.expected.length}`);
      expect(route.expected.length).toBeGreaterThan(0);
      expect(tiles).toBe(route.expected.length);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s prints its derived count line with its spaces intact',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const eyebrow = /class="ds-atom-eyebrow"[^>]*>([^<]*)</.exec(html);
      if (!eyebrow) throw new Error(`${route.name}: no .ds-atom-eyebrow in the response.`);
      const text = decode(eyebrow[1]);
      report(`${route.name}: count line ${JSON.stringify(text)}`);
      expect(text).toBe(route.countLine);
    }
  );

  it('emits no synthetic /photos/all route — §8.1 forbids inventing one', async () => {
    const response = await fetch(`${previewBaseUrl}/photos/all/`);
    report(`/photos/all/ → ${response.status}`);
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

      // EQUALITY, never `>= 1`. Zero (an un-normalised activeHref matching nothing) and two (a
      // duplicated href) are both real failure modes and only an equality catches both.
      expect(inRail).toBe(1);

      // The page's second one is the AppBar's own "photographs" link, which `PublicNav` marks
      // current on every route under /photos. Asserted so that §16 item 6's "exactly once" is
      // recorded as WRONG about the document and right about the rail.
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
        // The label and the count, in one string: `Architecture · 14`.
        expect(actual.text).toBe(`${expectedPill.label} · ${expectedPill.count}`);
      }

      // `FilterNav` renders an href it does not consider in-app as `<span data-rejected="true">`
      // — still visible, no longer clickable, and no error anywhere.
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
      expect(anchors.length).toBe(route.expected.length);
      for (const anchor of anchors) {
        expect(anchor).toMatch(/aspect-ratio:\s*\d+\s*\/\s*\d+/);
        expect(decode(anchor)).toContain("background-image: url('data:image/webp;base64,");
      }

      const imgs = html.match(/<img\b[^>]*>/g) ?? [];
      expect(imgs.length).toBe(route.expected.length);
      // §7.2's ruling. `dimensions` is the SOURCE photograph's size, not the served variant's.
      expect(imgs.filter((tag) => /\swidth\s*=/.test(tag))).toHaveLength(0);
      expect(imgs.filter((tag) => /\sheight\s*=/.test(tag))).toHaveLength(0);

      const expectedSizes = sizesFor(route.columns);
      const sizesAttrs = [...html.matchAll(/\ssizes="([^"]*)"/g)].map((m) => decode(m[1]));
      expect(sizesAttrs).toHaveLength(route.expected.length);
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
      expect(lazy).toBe(tiles - wanted);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s announces each photograph by its alt, never by its title (D-24-1)',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const alts = [...html.matchAll(/<img\b[^>]*\salt="([^"]*)"/g)].map((m) => decode(m[1]));
      expect(alts).toHaveLength(route.expected.length);

      const expectedAlts = new Set(route.expected.map((record) => record.alt));
      const titles = new Set(manifest.map((record) => record.title));
      for (const alt of alts) {
        expect(expectedAlts.has(alt)).toBe(true);
        expect(titles.has(alt)).toBe(false);
      }
      report(`${route.name}: ${alts.length} alt values, all from the manifest, none a title`);
    }
  );

  it.each(ROUTES.map((route) => [route.name, route] as const))(
    '%s ships no framework JavaScript yet — the island arrives in 05-12',
    (_name, route) => {
      const html = bodies.get(route.name) as string;
      const modules = occurrences(html, '<script type="module"');
      report(`${route.name}: <script type="module"> × ${modules}`);
      expect(modules).toBe(0);
    }
  );
});

describe('the masonry ladder in the BUILT stylesheet matches src/lib/layout-ladder.ts', () => {
  /**
   * `scripts/assert-gutter-ladder.mjs` covers the `--pub-gutter` rungs and the page maxima. It does
   * NOT cover `.ph-masonry`'s media queries, which restate the same three breakpoints in
   * `src/styles/photos.css` — CSS cannot import the module, so this is the other half.
   *
   * The minifier rewrites `min-width: 375px` as `(width>=375px)` (MEASURED by 05-06 in this
   * repository's own output), so both spellings are read. The check is a SUBSET claim plus a
   * presence floor rather than set equality: the 1024px rule §7.1 prescribes is a no-op against the
   * 673px one above it and a minifier is entitled to drop it. The set found is reported either way.
   */
  it('every media minimum attached to a .ph-masonry rule is a ladder breakpoint', async () => {
    const html = bodies.get('/photos') as string;

    /*
     * BOTH SOURCES, AND THE SECOND ONE IS THE FINDING. Astro's `build.inlineStylesheets` defaults
     * to `'auto'`, which INLINES a stylesheet under ~4 kB into a `<style>` element instead of
     * emitting a file. MEASURED on this route: `src/styles/photos.css` ships inline and the built
     * `dist/client/` holds exactly ONE `.css` file, which is the layout's bundle. A check that read
     * only the linked sheets found no `.ph-masonry` at all and failed against correct code — this
     * suite's own first revision did exactly that.
     *
     * RECORDED FOR `scripts/assert-gutter-ladder.mjs`, which walks `dist/client` for `*.css` files
     * and would be blind the same way: the gutter ladder is safe TODAY only because
     * `public-shell.css` is bundled with the design system's 126 kB sheet and is therefore a file.
     * If that ever changes, the gate hits its "not one --pub-gutter declaration" refusal and exits
     * 1 — it fails closed, which is the right direction, but the message would name the wrong cause.
     */
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

    /*
     * A brace walker that yields every declaration with the AT-RULE PRELUDES enclosing it. It
     * carries its own canaries, checked on every run: a rule that cannot fire is not a rule, and
     * this file's FIRST attempt at the rail assertion below could not fire — see its comment.
     */
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

    // Anti-vacuity: an empty set would satisfy the subset claim below over nothing.
    expect(minima.size).toBeGreaterThanOrEqual(2);
    for (const minimum of minima) expect(BREAKPOINTS).toContain(minimum);
    // The two rungs that actually change the column count.
    expect(minima.has(BREAKPOINTS[0])).toBe(true);
    expect(minima.has(BREAKPOINTS[1])).toBe(true);

    /*
     * THE RAIL IS NOT WIDTH-SCOPED, AND THIS ASSERTION EXISTS BECAUSE THE SCOPED VERSION SHIPPED.
     *
     * §8.3 puts `overflow-x: auto` inside `@media (max-width: 672px)`. MEASURED in Chromium against
     * that build: at 673, 700 and 800px the eight pills need ~873px, the rail rule was off, and
     * `document.documentElement.scrollWidth` read 873 against a 673px viewport — 200px of
     * horizontal scroll on three device classes and all eight routes, with nothing else wrong.
     *
     * 🔴 THE FIRST VERSION OF THIS ASSERTION COULD NOT FAIL, and the control caught it. It took the
     * FIRST `.ph-filters{` in the sheet and checked its brace depth — and with `max-width: 100%`
     * still unconditional, that first block is at depth 0 whatever the rail is scoped to. Planted
     * against a deliberately re-scoped stylesheet it reported "depth 0" and passed. This version
     * asks the question that was meant: is the `overflow-x` DECLARATION ON `.ph-filters` inside any
     * at-rule at all.
     */
    const railOverflow = decls.filter(
      (d) => d.selector.includes('.ph-filters') && d.prop === 'overflow-x'
    );
    report(
      `.ph-filters overflow-x declarations: ${railOverflow
        .map((d) => `${d.value} under [${d.atRules.join(' ') || 'no at-rule'}]`)
        .join('; ')}`
    );
    expect(railOverflow.length).toBeGreaterThan(0);
    for (const decl of railOverflow) {
      expect(decl.value).toBe('auto');
      expect(decl.atRules).toHaveLength(0);
    }
  });
});
