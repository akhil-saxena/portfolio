/**
 * The SEO surface, asserted over HTTP against the built artefact served by real `workerd`.
 * Plan 05-13, tasks 1 and 3.
 *
 * ================================================================================================
 * WHY EVERY CLAIM HERE IS ABOUT SHIPPED BYTES
 * ================================================================================================
 *
 * A sitemap is not a rendering; it is a file a crawler fetches. A canonical is not a component's
 * return value; it is an attribute in a document somebody else's scraper reads. Neither is
 * observable from a unit test, and the prerender that produces them runs inside `workerd` — no
 * filesystem, `process.cwd()` is `/bundle`, `import.meta.url` is undefined (MEASURED, 05-01). The
 * `integration` project's `globalSetup` runs a real `astro build` and serves the output through
 * `@cloudflare/vite-plugin`, which is genuine workerd, so this suite reads `dist/client/` for the
 * artefact and fetches `previewBaseUrl` for what the origin actually answers.
 *
 * ================================================================================================
 * NOT ONE ROUTE COUNT IN THIS FILE IS A LITERAL — AND THAT IS THE POINT OF THE FILE
 * ================================================================================================
 *
 * There is no `4`, no `7`, no `39`, no `40`, no `49` and no `51` below. The plan's own
 * `<interfaces>` prints a 51-URL census and the UI-SPEC §12.3 still says 49; the corpus moved to 40
 * records when Phase 4 published `wildlife-gentlegiants`, and 03-01's `--verify` hardcoded 39 and
 * turned `main` red the day the 40th landed. So:
 *
 *   - the fixed public routes are ENUMERATED FROM `src/pages/`, by walking it — a route added
 *     tomorrow is covered without editing this file;
 *   - the category routes come from `data/site_config.json`;
 *   - the photo routes come from `data/portfolio_images.json` through `photoHref`, the ONE
 *     definition of that path (05-08 imports the same function, so a disagreement is impossible
 *     rather than merely unlikely).
 *
 * Every derived set is preceded by an ANTI-VACUITY refusal. A suite that derives an empty expected
 * set from an emptied fixture and then compares it against an empty sitemap passes having proven
 * nothing, which is the failure this phase's register is full of.
 *
 * ================================================================================================
 * THE SITEMAP IS PROVEN BY FETCHING, NOT BY COMPARING TWO DERIVATIONS
 * ================================================================================================
 *
 * "A sitemap that lists a route the site does not serve" is SEO-03's named failure mode and threat
 * T-05-13-02's whole content. It cannot be closed by checking the sitemap against the same data the
 * sitemap was generated from — that is self-confirming. So every URL the sitemap claims is FETCHED
 * VERBATIM from the running origin and its status asserted, the way 05-08 proved its tile→page join
 * by fetching all 80 hrefs rather than comparing two derivations of the slug.
 *
 * Evidence is written with `process.stdout.write`. MEASURED by 04-01 with a probe: under this
 * repository's vitest setup `console.log` and `console.info` print NOTHING, so a check reporting
 * through them is indistinguishable from a check that found nothing.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, inject, it } from 'vitest';
import { photoHref } from '../../src/lib/photo-srcset';
import type { Photo, SiteConfig } from '../../src/schemas';

const previewBaseUrl = inject('previewBaseUrl');

const say = (line: string) => process.stdout.write(`${line}\n`);

const repoRoot = new URL('../../', import.meta.url);
const distClient = new URL('dist/client/', repoRoot);
const pagesDir = new URL('src/pages/', repoRoot);

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(new URL(relative, repoRoot), 'utf8')) as T;
}

const manifest = readJson<Photo[]>('data/portfolio_images.json');
const siteConfig = readJson<SiteConfig>('data/site_config.json');

/* ============================================================================================= */
/* The configured origin — read from the one file that defines it, never typed twice.             */
/* ============================================================================================= */

/**
 * `astro.config.mjs` sets `site`, and `@astrojs/sitemap` and `<Seo>` (via `Astro.site`) both read
 * that same field. Restating the origin here would be a third definition, and Phase 8's cutover
 * moves it — so it is read out of the config's source text.
 *
 * It is read rather than imported because importing the config would execute the `content-gate`
 * integration's module graph, which resolves `./src/schemas/index.ts` through Vite's extensionless
 * re-export handling (see the config's own first comment). A regex over the source has one job and
 * cannot have a side effect.
 */
function readConfiguredSite(): string {
  const source = readFileSync(new URL('astro.config.mjs', repoRoot), 'utf8');

  // EVERY `site:` assignment, then the ones whose value is an absolute http(s) URL — not the
  // first match. The first version of this reader took `/^\s*site:\s*(['"])(.+?)\1,/m` and got
  // `'./data/site_config.json'`, because `CONTENT_FILES` in that same config has a key called
  // `site` and it is declared ~120 lines ABOVE the one this wants. It failed loudly here
  // (`TypeError: Invalid URL`) only by luck: a config that happened to declare a second absolute
  // URL first would have made every origin assertion below compare against the wrong host and
  // pass. So the candidates are filtered by shape and the count is asserted.
  const candidates = [...source.matchAll(/\bsite:\s*(['"])([^'"]+)\1/g)]
    .map((match) => match[2] as string)
    .filter((value) => /^https?:\/\//.test(value));

  if (candidates.length !== 1) {
    throw new Error(
      `seo: astro.config.mjs yielded ${candidates.length} absolute-URL \`site:\` value(s) ` +
        `(${candidates.join(', ') || 'none'}), and exactly one is required. Every absolute-URL ` +
        'assertion below compares against it, so a wrong or absent value would make this suite ' +
        'pass on anything.'
    );
  }
  return candidates[0] as string;
}

const SITE_ORIGIN_HREF = readConfiguredSite();
const SITE_ORIGIN = new URL(SITE_ORIGIN_HREF).origin;

/* ============================================================================================= */
/* The route census — three derivations, each from its own source                                 */
/* ============================================================================================= */

/**
 * Every fixed public route, by WALKING `src/pages/`. Not a list.
 *
 * A hand list stops covering the site the day a route is added, and this phase adds routes in six
 * separate plans. The exclusions are each a measured property of the tree rather than a guess:
 *
 *   - a path segment containing `[` is a dynamic route; its instances come from the data below,
 *     and the template itself is not a URL;
 *   - `404.astro` is not a sitemap entry by definition (SEO-03) and is asserted absent separately;
 *   - a page carrying `export const prerender = false` is served by the Worker, not by Static
 *     Assets. `/admin` is the only one today and it is behind Cloudflare Access — MEASURED: an
 *     unfiltered `sitemap()` listed `https://akhilsaxena.com/admin/`, a route that emits no file
 *     under dist/client at all. That is what the config's filter now removes;
 *   - `src/pages/api/` holds `.ts` endpoints, which this walk never sees because it takes `.astro`
 *     only.
 */
function enumerateFixedPublicRoutes(): string[] {
  const found: string[] = [];

  const walk = (dir: URL, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const child = new URL(entry, dir);
      if (statSync(child).isDirectory()) {
        if (entry.includes('[')) continue;
        walk(new URL(`${entry}/`, dir), `${prefix}${entry}/`);
        continue;
      }
      if (!entry.endsWith('.astro')) continue;
      if (entry.includes('[')) continue;
      if (entry === '404.astro') continue;

      const source = readFileSync(child, 'utf8');
      if (/export\s+const\s+prerender\s*=\s*false/.test(source)) continue;

      const base = entry.slice(0, -'.astro'.length);
      found.push(base === 'index' ? `/${prefix}` : `/${prefix}${base}/`);
    }
  };

  walk(pagesDir, '');
  return found.sort();
}

const FIXED_ROUTES = enumerateFixedPublicRoutes();

/** `/photos/<category>/` — one per category record. */
const CATEGORY_ROUTES = siteConfig.categories.map((category) => `/photos/${category.id}/`).sort();

/**
 * `/photos/<category>/<slug>/` — one per photograph, through `photoHref`.
 *
 * `photoHref` is the single definition of this path (BL-8). Recomputing `id.replace(category, '')`
 * here would be a second one, and 05-08's own header records what two derivations of that slug
 * cost: every tile 404ing against a page that exists under a different name, with a green build.
 */
const PHOTO_ROUTES = manifest.map((photo) => `${photoHref(photo)}/`).sort();

/** The full expected set, deduplicated and sorted. Derived three ways, typed zero. */
const EXPECTED_PATHS = [...new Set([...FIXED_ROUTES, ...CATEGORY_ROUTES, ...PHOTO_ROUTES])].sort();

/* ============================================================================================= */
/* Reading the built artefact                                                                     */
/* ============================================================================================= */

/**
 * Every `.html` under `dist/client/`, as root-relative URL paths with Astro's trailing slash.
 *
 * `grep` on a missing file exits 2 and an `if` reads that as clean (this phase's register, twice),
 * so this refuses outright rather than returning an empty list.
 */
function builtHtmlPaths(): string[] {
  if (!existsSync(distClient)) {
    throw new Error(
      `seo: ${fileURLToPath(distClient)} does not exist. Every assertion in this file reads it, ` +
        'so this run would compare nothing against nothing and pass. The `integration` project ' +
        'builds the site in its globalSetup — if it is absent, the build is what failed.'
    );
  }

  const out: string[] = [];
  const walk = (dir: URL, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const child = new URL(entry, dir);
      if (statSync(child).isDirectory()) {
        walk(new URL(`${entry}/`, dir), `${prefix}${entry}/`);
        continue;
      }
      if (!entry.endsWith('.html')) continue;
      out.push(entry === 'index.html' ? `/${prefix}` : `/${prefix}${entry.slice(0, -5)}/`);
    }
  };
  walk(distClient, '');
  return out.sort();
}

const BUILT_HTML_PATHS = builtHtmlPaths();

/** The 404 document's own path, named once so the exclusions below cannot disagree about it. */
const NOT_FOUND_PATH = '/404/';

/** Every built HTML document that is a public page — i.e. everything except the 404. */
const PUBLIC_HTML_PATHS = BUILT_HTML_PATHS.filter((path) => path !== NOT_FOUND_PATH);

/** `<loc>` values, in document order. XML entity decoding is one pass, like a parser's. */
function locsIn(xml: string): string[] {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) =>
    (match[1] as string)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .trim()
  );
}

/* ============================================================================================= */

const fetched = new Map<string, { status: number; body: string; contentType: string }>();

async function get(path: string) {
  const cached = fetched.get(path);
  if (cached) return cached;
  const response = await fetch(`${previewBaseUrl}${path}`);
  const entry = {
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get('content-type') ?? '',
  };
  fetched.set(path, entry);
  return entry;
}

/* ============================================================================================= */
/* SEO-03 — the sitemap                                                                           */
/* ============================================================================================= */

describe('SEO-03 · the sitemap', () => {
  /** Populated by the first test and read by the rest; each guards against its being empty. */
  let indexLocs: string[] = [];
  let sitemapUrls: string[] = [];
  let sitemapPaths: string[] = [];

  beforeAll(() => {
    // ANTI-VACUITY, BEFORE ANYTHING ELSE. Three derivations feed the census and an empty one
    // would make the comparison below trivially true against an empty sitemap.
    if (FIXED_ROUTES.length === 0) {
      throw new Error(
        `seo: walking ${fileURLToPath(pagesDir)} found no fixed public route at all. The expected ` +
          'route set would then be data-only and this suite could not notice a deleted page.'
      );
    }
    if (siteConfig.categories.length === 0) {
      throw new Error('seo: data/site_config.json declares no categories — nothing to compare.');
    }
    if (manifest.length === 0) {
      throw new Error('seo: data/portfolio_images.json holds no photographs — nothing to compare.');
    }

    say(
      `census: ${FIXED_ROUTES.length} fixed route(s) walked from src/pages · ` +
        `${CATEGORY_ROUTES.length} category route(s) from site_config.json · ` +
        `${PHOTO_ROUTES.length} photo route(s) from portfolio_images.json ` +
        `= ${EXPECTED_PATHS.length} expected URL(s)`
    );
    say(`fixed routes walked: ${FIXED_ROUTES.join(' · ')}`);
    say(
      `artefact: ${BUILT_HTML_PATHS.length} .html under dist/client, ` +
        `${PUBLIC_HTML_PATHS.length} of them public (404 excluded)`
    );
  });

  it('the sitemap index is on disk AND served by the origin as XML', async () => {
    const onDisk = new URL('sitemap-index.xml', distClient);
    expect(
      existsSync(onDisk),
      `${fileURLToPath(onDisk)} was not emitted — the @astrojs/sitemap integration is not wired`
    ).toBe(true);

    const served = await get('/sitemap-index.xml');
    expect(served.status, 'the sitemap index must be fetchable, not merely present').toBe(200);
    expect(served.contentType).toMatch(/xml/);

    indexLocs = locsIn(served.body);
    expect(
      indexLocs.length,
      'a sitemap index naming no child sitemap indexes nothing'
    ).toBeGreaterThan(0);
    say(`sitemap index: ${indexLocs.length} child sitemap(s) — ${indexLocs.join(', ')}`);
  });

  it('every child sitemap the index names is itself served, and the union is read from them', async () => {
    expect(
      indexLocs.length,
      'the index test must run first and must have found children'
    ).toBeGreaterThan(0);

    const collected: string[] = [];
    for (const loc of indexLocs) {
      const path = new URL(loc).pathname;
      const child = await get(path);
      expect(child.status, `the index names ${loc}, which the origin did not serve`).toBe(200);
      collected.push(...locsIn(child.body));
    }

    sitemapUrls = collected;
    expect(
      sitemapUrls.length,
      'the child sitemaps between them list no URL at all'
    ).toBeGreaterThan(0);
    sitemapPaths = sitemapUrls.map((url) => new URL(url).pathname).sort();
    say(`sitemap: ${sitemapUrls.length} <loc> across ${indexLocs.length} child sitemap(s)`);
  });

  it('every URL is absolute and on the configured site origin', () => {
    expect(sitemapUrls.length).toBeGreaterThan(0);

    const wrong = sitemapUrls.filter((url) => {
      try {
        return new URL(url).origin !== SITE_ORIGIN;
      } catch {
        return true;
      }
    });
    expect(
      wrong,
      `read from astro.config.mjs, the site origin is ${SITE_ORIGIN}; these <loc> values are ` +
        'relative or on another origin, which makes them useless to a crawler'
    ).toEqual([]);
    say(`origin: ${sitemapUrls.length}/${sitemapUrls.length} absolute on ${SITE_ORIGIN}`);
  });

  it('the sitemap URL set equals the derived census exactly, in both directions', () => {
    expect(sitemapPaths.length).toBeGreaterThan(0);

    const inSitemap = new Set(sitemapPaths);
    const expected = new Set(EXPECTED_PATHS);

    const advertisedButNotExpected = [...inSitemap].filter((path) => !expected.has(path)).sort();
    const expectedButNotAdvertised = [...expected].filter((path) => !inSitemap.has(path)).sort();

    expect(
      advertisedButNotExpected,
      "the sitemap advertises route(s) the census does not derive — SEO-03's named failure mode"
    ).toEqual([]);
    expect(
      expectedButNotAdvertised,
      'the census derives route(s) the sitemap omits — the opposite bug, and only a two-way ' +
        'check catches both'
    ).toEqual([]);
    say(
      `census join: ${inSitemap.size} advertised = ${expected.size} derived, no residue either way`
    );
  });

  it('no sitemap URL is missing from dist/client, and no public document is missing from the sitemap', () => {
    expect(sitemapPaths.length).toBeGreaterThan(0);
    expect(
      PUBLIC_HTML_PATHS.length,
      'no public HTML was built — nothing to correspond to'
    ).toBeGreaterThan(0);

    const built = new Set(PUBLIC_HTML_PATHS);
    const advertised = new Set(sitemapPaths);

    const advertisedWithNoFile = [...advertised].filter((path) => !built.has(path)).sort();
    const builtButUnadvertised = [...built].filter((path) => !advertised.has(path)).sort();

    expect(
      advertisedWithNoFile,
      'these sitemap URLs have no document under dist/client — Static Assets cannot serve them'
    ).toEqual([]);
    expect(
      builtButUnadvertised,
      'these built public documents are not in the sitemap and will not be crawled'
    ).toEqual([]);
    say(`artefact join: ${advertised.size} advertised = ${built.size} built public document(s)`);
  });

  it('the 404 is absent from the sitemap, and its absence is asserted against a page that exists', () => {
    expect(sitemapPaths.length).toBeGreaterThan(0);

    // THE GUARD THAT MAKES THIS AN ASSERTION RATHER THAN A TAUTOLOGY. `/404` is only worth
    // excluding if the build emits one; against a build with no 404 document the check below
    // would pass having proven nothing. MEASURED and recorded in astro.config.mjs: @astrojs/sitemap
    // drops the 404 route by itself, so this is NOT evidence that the config's filter works — it is
    // evidence of the OUTCOME SEO-03 requires, which is what the requirement asks for.
    expect(
      BUILT_HTML_PATHS,
      'dist/client emitted no 404 document, so "the sitemap excludes it" is vacuously true'
    ).toContain(NOT_FOUND_PATH);

    const offenders = sitemapPaths.filter((path) => path.startsWith('/404'));
    expect(offenders, 'a sitemap advertising the 404 page is a crawl-budget bug').toEqual([]);
    say(`404: dist/client/404.html present, 0 sitemap entries under /404`);
  });

  it('no protected route is advertised', () => {
    expect(sitemapPaths.length).toBeGreaterThan(0);

    // MEASURED: with a bare `sitemap()` and no filter, `https://akhilsaxena.com/admin/` WAS listed
    // — the Access-gated CMS, which emits no file under dist/client at all. This is the control
    // that keeps the config's filter honest, and unlike the 404 exclusion it genuinely fires when
    // the filter is removed.
    const protectedPrefixes = ['/admin', '/api', '/_actions'];
    const offenders = sitemapPaths.filter((path) =>
      protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    );
    expect(
      offenders,
      'the sitemap advertises an Access-gated or Worker-only route to every crawler'
    ).toEqual([]);
    say(`protected: 0 entries under ${protectedPrefixes.join(', ')}`);
  });

  it('every URL the sitemap claims is fetched VERBATIM from the origin and answers 200', async () => {
    expect(sitemapUrls.length, 'nothing to fetch — the sitemap read as empty').toBeGreaterThan(0);

    const failures: string[] = [];
    let redirected = 0;
    let ok = 0;

    for (const url of sitemapUrls) {
      const path = new URL(url).pathname;
      const response = await fetch(`${previewBaseUrl}${path}`);
      if (response.redirected) redirected += 1;
      if (response.status === 200) ok += 1;
      else failures.push(`${path} → ${response.status}`);
    }

    expect(
      failures,
      'the sitemap names URLs this origin does not serve — the exact SEO-03 failure mode, and it ' +
        'is caught here by fetching rather than by comparing two derivations of the same data'
    ).toEqual([]);
    expect(ok).toBe(sitemapUrls.length);
    say(
      `fetch: ${ok}/${sitemapUrls.length} sitemap URL(s) fetched verbatim answered 200 ` +
        `(${redirected} through a redirect)`
    );
  });
});

/* ============================================================================================= */
/* SEO-05 — the legacy redirect, and the 404 as the origin actually serves it                     */
/* ============================================================================================= */

/**
 * These assertions live in the suite rather than in a hand-run `curl` because a status code
 * measured once by a person is not protected against anything. The plan verifies SEO-05 by asking
 * the executor to run `curl -sI` and quote the line; that proves it worked on the day, and says
 * nothing about the day somebody switches to `astro.config`'s `redirects` key.
 *
 * 🔴 THE PLAN IS WRONG ABOUT THE RUNTIME, AND IT IS WRONG IN THE DIRECTION THAT COSTS.
 *
 * It says: *"`astro preview` does not [serve `_redirects`] — it is a plain static server … Do not
 * substitute `astro preview` — it is a plain static server and will 404, which would read as a
 * failure of correct code."*
 *
 * MEASURED, against this repository's `astro preview`:
 *
 *     HTTP/1.1 301 Moved Permanently
 *     location: /photos
 *
 * Under `@astrojs/cloudflare`, `astro preview` is NOT a static server: its preview entrypoint
 * starts a Vite preview server with `@cloudflare/vite-plugin` attached, which runs the built Worker
 * inside genuine `workerd`. `test/setup/preview-server.ts` says so in its own header, and it is why
 * every `*.node.test.ts` in this phase counts as evidence about the runtime that ships. Had the
 * plan's instruction been followed, SEO-05 would have been verified by hand against a separate
 * `wrangler dev` and left ungated here.
 */
describe('SEO-05 · /portfolio 301s, and the 404 belongs to this site', () => {
  const REDIRECTS_FILE = new URL('_redirects', distClient);

  /** Both forms, because a rule does NOT match its own trailing-slash variant — measured below. */
  const LEGACY_PATHS = ['/portfolio', '/portfolio/'];
  const REDIRECT_TARGET = '/photos';

  it('the _redirects file reached dist/client and carries both literal rules', () => {
    expect(
      existsSync(REDIRECTS_FILE),
      `${fileURLToPath(REDIRECTS_FILE)} is absent. Astro copies public/ into the build client ` +
        'directory verbatim, and the adapter points Static Assets at exactly that directory ' +
        '(dist/server/wrangler.json: "assets": {"directory": "../client"}). Without this file ' +
        'there is no 301 at all.'
    ).toBe(true);

    const rules = readFileSync(REDIRECTS_FILE, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    expect(rules.length, 'the file is all comment and no rule').toBeGreaterThan(0);

    for (const path of LEGACY_PATHS) {
      const rule = rules.find((line) => line.split(/\s+/)[0] === path);
      expect(
        rule,
        `no rule whose source is exactly "${path}" — rules present: ${rules.join(' | ')}`
      ).toBeDefined();
      const [, target, code] = (rule as string).split(/\s+/);
      expect(target, `the rule for ${path} points somewhere other than ${REDIRECT_TARGET}`).toBe(
        REDIRECT_TARGET
      );
      expect(code, `the rule for ${path} is not a 301`).toBe('301');
    }

    // T-05-13-01. A capture placed into the DESTINATION is what turns a redirects file into an
    // open redirect; a literal source to a literal same-origin target cannot be one. Asserted
    // rather than merely intended, because the wildcard form is the one a future edit reaches for.
    const withCaptures = rules.filter((line) =>
      /:splat|:[a-z]\w*|\*/i.test(line.split(/\s+/)[1] ?? '')
    );
    expect(
      withCaptures,
      'a redirect destination carries a capture — the open-redirect construct'
    ).toEqual([]);

    // 🔴 THE ONE ASSERTION THAT PINS THE MECHANISM, and it exists because a control produced a
    // FALSE PASS without it. MEASURED: with public/_redirects deleted and `redirects: {...}` set in
    // astro.config instead, every other check in this describe block stayed GREEN —
    // @astrojs/cloudflare compiles that config key into this same file, as real 301s, emitting no
    // HTML page at all. So "no /portfolio document was emitted" cannot tell the two mechanisms
    // apart here, and on its own this block would have certified the rejected mechanism.
    //
    // A byte comparison can tell them apart. It also catches the collision case, MEASURED: with
    // BOTH mechanisms present the adapter APPENDS its rules to the copied file, silently yielding
    // four rules where two were reviewed, two of them duplicates, with no warning anywhere.
    const sourceFile = new URL('../../public/_redirects', import.meta.url);
    expect(
      existsSync(sourceFile),
      'public/_redirects is absent, so whatever reached dist/client came from somewhere else — ' +
        "almost certainly astro.config's `redirects` key, an unreviewed second source of routing " +
        'decisions served to every visitor'
    ).toBe(true);
    expect(
      readFileSync(REDIRECTS_FILE, 'utf8'),
      'dist/client/_redirects is not a verbatim copy of public/_redirects — a second mechanism is ' +
        'contributing redirect rules that nobody reviewed'
    ).toBe(readFileSync(sourceFile, 'utf8'));

    say(
      `_redirects: ${rules.length} rule(s), no capture in any destination — ${rules.join(' | ')}`
    );
    say('_redirects: dist/client copy byte-identical to public/_redirects — no second source');
  });

  it.each(LEGACY_PATHS)(
    '%s answers a real 301 with an empty body, not a meta-refresh page',
    async (path) => {
      const response = await fetch(`${previewBaseUrl}${path}`, { redirect: 'manual' });
      const body = await response.text();

      expect(response.status, `${path} did not answer 301`).toBe(301);
      expect(response.headers.get('location')).toBe(REDIRECT_TARGET);

      // THE DISCRIMINATOR. A meta-refresh page is a 200 with an HTML body; a rewrite is a 200 with
      // the target's body. Only a real redirect returns a status in the 3xx range AND nothing to
      // render — so the body is asserted empty rather than merely asserted not to contain a tag.
      expect(
        body.length,
        `${path} returned a ${body.length}-byte body with its 301 — a real redirect has nothing to render`
      ).toBe(0);
      expect(body).not.toMatch(/http-equiv/i);

      say(
        `${path} -> HTTP ${response.status} ${response.statusText} · location: ${response.headers.get('location')} · ${body.length}-byte body`
      );
    }
  );

  it('following the redirect lands on the gallery, which answers 200', async () => {
    const followed = await fetch(`${previewBaseUrl}${LEGACY_PATHS[0]}`);
    expect(followed.status).toBe(200);
    expect(followed.redirected, 'the client did not observe a redirect at all').toBe(true);
    expect(new URL(followed.url).pathname.replace(/\/$/, '')).toBe(REDIRECT_TARGET);
    say(`follow: ${LEGACY_PATHS[0]} -> ${new URL(followed.url).pathname} -> ${followed.status}`);
  });

  /**
   * 🔴 RECORDED AS NON-DISCRIMINATING RATHER THAN DELETED — it is the plan's own check, and the
   * next reader deserves to be told it carries no weight here rather than re-derive that.
   *
   * The plan's `<done>` treats "no dist/client/portfolio/ HTML page was emitted" as the proof that
   * the meta-refresh mechanism was not used. MEASURED: under `adapter: cloudflare()` the config
   * key emits no HTML page either, so this check passes under BOTH mechanisms and can never fire.
   * It is kept because it WOULD fire if the adapter were ever dropped and the config key left
   * behind, and because a check silently deleted is a check nobody knows was considered.
   *
   * The weight is carried by two assertions that ARE discriminating: the byte comparison above,
   * and the 0-byte-body assertion below — a meta-refresh page is a 200 with an HTML body, and a
   * real redirect is a 3xx with nothing to render.
   */
  it('no /portfolio document was emitted (non-discriminating under this adapter — see above)', () => {
    // ANTI-VACUITY. An absence assertion over a tree that does not exist is true and worthless,
    // and this phase has shipped that shape before. So the presence of siblings is asserted first.
    expect(
      BUILT_HTML_PATHS.length,
      'dist/client holds no HTML at all — this absence proves nothing'
    ).toBeGreaterThan(1);

    const emitted = BUILT_HTML_PATHS.filter((path) => path.startsWith('/portfolio'));
    expect(emitted, 'a /portfolio HTML document exists under dist/client').toEqual([]);
    say(
      `meta-refresh: 0 documents under /portfolio, against ${BUILT_HTML_PATHS.length} built ` +
        'HTML files (NON-DISCRIMINATING under this adapter — see the block comment)'
    );
  });

  it('a path that certainly does not exist gets THIS 404 page, with a 404 status', async () => {
    const nonsense = `/nope-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const response = await fetch(`${previewBaseUrl}${nonsense}`);
    const body = await response.text();

    expect(response.status, `${nonsense} did not answer 404`).toBe(404);

    // The status alone would also be satisfied by a bare platform response, which is exactly what
    // `assets.not_found_handling: "404-page"` exists to replace. So the BODY is compared against
    // the built artefact — this is the site's own document, not the platform's.
    const built = readFileSync(new URL('404.html', distClient), 'utf8');
    expect(body, 'the origin answered 404 with something other than the built 404 document').toBe(
      built
    );

    say(
      `404: GET ${nonsense} -> HTTP ${response.status} ${response.statusText}, body byte-identical to dist/client/404.html (${body.length} bytes)`
    );
  });

  it('the 404 page is noindex, carries §13.2 verbatim, declares no canonical and ships no module script', () => {
    const html = readFileSync(new URL('404.html', distClient), 'utf8');
    expect(html.length, 'the built 404 is empty').toBeGreaterThan(0);

    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex"\s*\/?>/);

    for (const line of ['Not found.', 'There is nothing at this address.', 'Go to the home page']) {
      expect(html, `§13.2 copy missing from the built 404: "${line}"`).toContain(line);
    }

    // It carries the shell — the nav and the footer, so a reader who mistypes a URL has a way back
    // that is not the browser's back button. The Phase 2 placeholder this replaced had neither.
    expect(html, 'the 404 does not carry the public shell').toContain('ds-atom-appbar');

    // NOT an oversight: a canonical on a 404 declares the not-found URL to be a canonical page of
    // this site, which is the definition of a soft 404. See the route file's own docstring.
    expect(html, 'the 404 declares a canonical, which makes it a soft 404').not.toMatch(
      /rel="canonical"/
    );
    expect(
      html,
      'the 404 carries an og:image, so a not-found URL would share as a real page'
    ).not.toMatch(/og:image/);

    expect(
      (html.match(/<script\b[^>]*type="module"/g) ?? []).length,
      'the 404 ships a module script — this route has no island'
    ).toBe(0);

    say(
      `404 page: noindex present · §13.2 copy verbatim · shell present · 0 canonical · 0 og:image · 0 module scripts`
    );
  });
});
