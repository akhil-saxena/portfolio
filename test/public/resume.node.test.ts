/**
 * `/resume`, asserted over HTTP against the built artefact served by real `workerd`. Plan 05-10,
 * tasks 2 and 3.
 *
 * ================================================================================================
 * WHY THIS IS AN HTTP SUITE AND NOT A RENDER TEST
 * ================================================================================================
 *
 * Every claim below is about SHIPPED BYTES. "The Person data is present", "no framework JavaScript
 * reaches this route", "the maintained PDF is actually served" are facts about `dist/` and about
 * what the origin answers — asked of a component in jsdom they become inferences, and this project
 * has a measured precedent for each of them being wrong in exactly that gap. The `integration`
 * project's `globalSetup` runs a real `astro build` and serves it through `@cloudflare/vite-plugin`,
 * so the runtime on the other end of the socket is the one that ships.
 *
 * ================================================================================================
 * NOT ONE COUNT IN THIS FILE IS A LITERAL
 * ================================================================================================
 *
 * There is no `13`, no `15`, no `3` and no `39` below. `data/resume.json` and
 * `data/home_config.json` are reviewed content Akhil edits; a hardcoded record count turned `main`
 * red in Phase 4 the moment content changed. Every expected number is computed from the committed
 * file at test time, and every derived expectation is guarded by an ANTI-VACUITY assertion first —
 * a suite that derives `0` from an emptied fixture and then passes zero comparisons is the failure
 * mode this phase's register is full of.
 *
 * Evidence is written with `process.stdout.write`. MEASURED by plan 04-01 with a probe: under this
 * repository's vitest setup `console.log` and `console.info` print NOTHING, so a check reporting
 * through them is indistinguishable from a check that found nothing.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import type { HomeConfig, Resume } from '../../src/schemas';

const previewBaseUrl = inject('previewBaseUrl');

const say = (line: string) => process.stdout.write(`${line}\n`);

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8')) as T;
}

const resume = readJson<Resume>('../../data/resume.json');
const home = readJson<HomeConfig>('../../data/home_config.json');

/** The route under test and the asset it offers, in one place each. */
const RESUME_PATH = '/resume';
const RESUME_PDF_PATH = '/resume.pdf';
const MAILTO = 'mailto:';

/**
 * ONE pass of entity decoding, which is what an HTML parser does. A second pass would turn a
 * double-encoded `&amp;amp;` back into `&` and hide the exact defect the bullet comparison exists
 * to catch — `data/resume.json` carries one literal `&` and a second encoder anywhere on the path
 * renders it visibly wrong.
 */
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
      nbsp: ' ',
    };
    return named[body] ?? whole;
  });
}

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '');

/** The plain text a reader sees for a stored bullet: the bold markers are markup, not characters. */
const bulletPlainText = (stored: string) => stored.replaceAll('**', '');

/** Bold RUNS in a stored bullet — the number of `<strong>` elements it must produce. */
const boldRunCount = (stored: string) => (stored.match(/\*\*/g) ?? []).length / 2;

let page = '';
let response: Response;

async function loadPage(): Promise<void> {
  if (page) return;
  response = await fetch(`${previewBaseUrl}${RESUME_PATH}`);
  page = await response.text();
}

describe('/resume — the route answers with the whole record', () => {
  it('is served, as HTML, by the built origin', async () => {
    await loadPage();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type') ?? '').toContain('text/html');
    say(`resume: ${page.length} bytes of HTML from ${previewBaseUrl}${RESUME_PATH}`);
  });

  it('renders every bullet in resume.json, character for character, with the count derived', async () => {
    await loadPage();

    const expected = [
      ...resume.experience.flatMap((entry) => entry.bullets),
      ...resume.education.flatMap((entry) => entry.leadership),
    ];

    // ANTI-VACUITY. An emptied fixture derives an empty expectation, and every comparison below
    // would then pass without reading a single bullet.
    expect(
      expected.length,
      'data/resume.json yielded no bullets at all — the assertions below would pass having compared nothing'
    ).toBeGreaterThan(0);

    const blocks = [...page.matchAll(/<div class="rs-bullets[^"]*">([\s\S]*?)<\/div>/g)].map(
      (match) => match[1]
    );
    expect(
      blocks.length,
      'no rs-bullets block was found in the served page — the renderer, not the data, is missing'
    ).toBeGreaterThan(0);

    const rendered = blocks
      .flatMap((block) => [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)])
      .map((match) => decodeEntitiesOnce(stripTags(match[1])));

    expect(rendered.length).toBe(expected.length);
    expect([...rendered].sort()).toEqual(expected.map(bulletPlainText).sort());

    say(`bullets: ${expected.length} stored, ${rendered.length} rendered, all matching exactly`);
  });

  it('renders bold runs as elements, not as asterisks, with the count derived', async () => {
    await loadPage();

    const stored = [
      ...resume.experience.flatMap((entry) => entry.bullets),
      ...resume.education.flatMap((entry) => entry.leadership),
    ];
    const expectedStrong = stored.reduce((total, bullet) => total + boldRunCount(bullet), 0);

    expect(
      expectedStrong,
      'no stored bullet carries a bold run — this assertion would prove nothing'
    ).toBeGreaterThan(0);

    const blocks = [...page.matchAll(/<div class="rs-bullets[^"]*">([\s\S]*?)<\/div>/g)].map(
      (match) => match[1]
    );
    const strongCount = blocks.reduce(
      (total, block) => total + (block.match(/<strong>/g) ?? []).length,
      0
    );

    expect(strongCount).toBe(expectedStrong);
    // The grammar's markers must not survive as characters anywhere in the bullet markup.
    expect(blocks.join('')).not.toContain('**');

    say(`bold runs: ${expectedStrong} stored, ${strongCount} <strong> elements rendered`);
  });

  it('encodes the one literal ampersand exactly once', async () => {
    await loadPage();

    const storedAmpersands = [
      ...resume.experience.flatMap((entry) => entry.bullets),
      ...resume.education.flatMap((entry) => entry.leadership),
    ].reduce((total, bullet) => total + (bullet.match(/&/g) ?? []).length, 0);

    expect(
      storedAmpersands,
      'no stored bullet carries an ampersand — the double-encoding assertion would prove nothing'
    ).toBeGreaterThan(0);

    // Both spellings of the double-encoded form. React emits `&amp;`; Astro's own escaper emits
    // `&#38;`; a second encoder on either path produces one of these two.
    expect(page).not.toContain('&amp;amp;');
    expect(page).not.toContain('&#38;#38;');

    say(`ampersands: ${storedAmpersands} stored, 0 double-encoded occurrences in the served page`);
  });

  it('renders every skill in every group', async () => {
    await loadPage();

    const items = resume.skills.flatMap((group) => group.items);
    expect(items.length, 'data/resume.json yielded no skills').toBeGreaterThan(0);

    // Decoded, not raw: a group category carries the second literal `&` in the fixture
    // (`Frontend & Backend`), and comparing a stored `&` against a rendered `&amp;` fails on
    // correct output — the defect class 05-05 recorded as "a check that fires on correct code".
    const decoded = decodeEntitiesOnce(page);
    for (const group of resume.skills) expect(decoded).toContain(group.category);
    for (const item of items) expect(decoded).toContain(item);

    say(`skills: ${resume.skills.length} group(s), ${items.length} item(s), all present`);
  });

  it('offers the maintained PDF, and the origin actually serves it', async () => {
    await loadPage();

    expect(page).toContain(`href="${RESUME_PDF_PATH}"`);
    expect(page).toMatch(/href="\/resume\.pdf"[^>]*download/);

    // A control pointing at a 404 is indistinguishable from a working one until it is clicked.
    const pdf = await fetch(`${previewBaseUrl}${RESUME_PDF_PATH}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type') ?? '').toContain('pdf');
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(0);
    // A PDF starts `%PDF-`; a 200 that is really an SPA fallback page would not.
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');

    say(`pdf: ${RESUME_PDF_PATH} served, ${bytes.length} bytes, magic %PDF- present`);
  });

  /**
   * §11.1 item 5 — THE EMPLOYMENT METRIC BAND, WHICH SHIPPED FOR THREE PLANS WITH NOTHING HOLDING IT.
   *
   * It has rendered here since 05-10, on Akhil's instruction, and §11.1 did not list it. 05-10
   * flagged that as a documentation disagreement; 05-15 measured the band clean at all six device
   * classes and left the direction to Akhil, whose answer was that it stays. §11.1 now lists it —
   * and a structure list that says the page must contain something, with no instrument that can
   * see it, is a claim rather than a contract. This is the instrument. Before it, "removal is one
   * block plus two rules and no test depends on it" was literally true.
   *
   * 🔴 NOT ONE STRING BELOW IS THE BAND'S WORDING. The three values on disk are PLACEHOLDERS Akhil
   * intends to revise (OQ-1b), so `+15%`, `4K+` and `6×` appear nowhere here: every expectation is
   * read out of `data/resume.json` at check time. Revising a placeholder must change rendered text
   * and nothing else; deleting the band must be red.
   *
   * SCOPED PER ENTRY, not counted page-wide. A page-wide `.rs-metric` count of three would be
   * satisfied by three bands on one record — and this suite has already recorded, in 05-10, a
   * page-wide `/<li/g` count that also matched `<link`.
   */
  it('renders one metric band per experience entry, with both halves derived (§11.1 item 5)', async () => {
    await loadPage();

    // ANTI-VACUITY, before any comparison: an emptied fixture would make the loop assert nothing.
    expect(
      resume.experience.length,
      'data/resume.json holds no experience records'
    ).toBeGreaterThan(0);

    /** Every `<article class="rs-entry">…</article>`, sliced by its own depth. */
    const entries = [...page.matchAll(/<article class="rs-entry">([\s\S]*?)<\/article>/g)].map(
      (m) => m[1] as string
    );
    expect(
      entries.length,
      `the page carries ${entries.length} .rs-entry article(s) against ` +
        `${resume.experience.length} experience record(s)`
    ).toBe(resume.experience.length);

    const seen: string[] = [];
    resume.experience.forEach((record, index) => {
      const article = entries[index] as string;

      const bands = [...article.matchAll(/<p class="rs-metric">([\s\S]*?)<\/p>/g)].map(
        (m) => m[1] as string
      );
      expect(bands.length, `${record.id} carries ${bands.length} metric band(s)`).toBe(1);

      const band = bands[0] as string;
      const value = /<span class="rs-metric-value">([\s\S]*?)<\/span>/.exec(band)?.[1];
      const label = /<span class="rs-metric-label">([\s\S]*?)<\/span>/.exec(band)?.[1];

      expect(value, `${record.id} has no .rs-metric-value span`).toBeDefined();
      expect(label, `${record.id} has no .rs-metric-label span`).toBeDefined();
      expect(decodeEntitiesOnce(value as string)).toBe(record.metric.value);
      expect(decodeEntitiesOnce(label as string)).toBe(record.metric.label);

      seen.push(`${record.id} ${record.metric.value} ${record.metric.label}`);
    });

    // The band's own §13 finding, pinned rather than described: `compressHTML` removes the newline
    // between the two spans, so `textContent` is the unspaced string and the gap is drawn by
    // `.rs-metric-value { margin-inline-end }` — which the print-stylesheet test below reads out of
    // the served CSS. Asserting the adjacency here is what stops someone "fixing" the unspaced
    // string with a `&nbsp;` and moving the gap into two places.
    expect(page).toMatch(/<\/span><span class="rs-metric-label">/);

    say(`metric band: ${entries.length} entr(ies), each with one — ${seen.join(' · ')}`);
  });
});

describe('/resume — SEO-02 Person data, as microdata (OQ-2)', () => {
  it('carries a Person itemscope with name, jobTitle, worksFor and url', async () => {
    await loadPage();

    expect(page).toContain('itemtype="https://schema.org/Person"');
    expect(page).toMatch(/itemscope[^>]*itemtype="https:\/\/schema\.org\/Person"/);

    for (const property of ['name', 'jobTitle', 'worksFor', 'url']) {
      expect(page, `itemprop="${property}" is missing from the served page`).toContain(
        `itemprop="${property}"`
      );
    }

    expect(page).toContain('itemtype="https://schema.org/Organization"');

    // The values are the record's, not a retyped copy of it.
    const current = resume.experience.find((entry) => entry.isPresent);
    expect(
      current,
      'no experience record has isPresent — jobTitle/worksFor would be absent by design and the assertions above would be checking a page that never claimed them'
    ).toBeDefined();
    expect(page).toContain(`<span itemprop="jobTitle">${current?.role}</span>`);
    expect(page).toContain(`<span itemprop="name">${current?.company}</span>`);
    expect(page).toContain(`<h1 class="rs-name" itemprop="name">${home.title}</h1>`);

    // The Person's `url` is this page. Compared against the page's OWN canonical rather than
    // against a retyped origin, so the site's address has one definition here too.
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(page)?.[1];
    const personUrl = /<link itemprop="url" href="([^"]+)"/.exec(page)?.[1];
    expect(canonical, 'the page has no canonical to compare the Person url against').toBeTruthy();
    expect(personUrl).toBe(canonical);

    say(`person: name/jobTitle/worksFor/url present; url === canonical === ${personUrl}`);
  });

  it('carries one sameAs per profile link and one email per mail link, both counts derived', async () => {
    await loadPage();

    const links = home.socialLinks;
    expect(links.length, 'home_config.json has no socialLinks').toBeGreaterThan(0);

    const expectedSameAs = links.filter((link) => !link.url.startsWith(MAILTO)).length;
    const expectedEmail = links.filter((link) => link.url.startsWith(MAILTO)).length;

    const sameAs = (page.match(/itemprop="sameAs"/g) ?? []).length;
    const email = (page.match(/itemprop="email"/g) ?? []).length;

    expect(sameAs).toBe(expectedSameAs);
    expect(email).toBe(expectedEmail);
    // The sum is asserted separately: a link that lost its microdata while another gained a
    // duplicate would leave both counts wrong in ways that could still add up by accident.
    expect(sameAs + email).toBe(links.length);

    for (const link of links) {
      if (link.url.startsWith(MAILTO)) {
        expect(page).toContain(
          `<meta itemprop="email" content="${link.url.slice(MAILTO.length)}">`
        );
      } else {
        expect(page).toContain(`<link itemprop="sameAs" href="${link.url}">`);
      }
    }

    say(
      `sameAs ${sameAs}/${expectedSameAs} · email ${email}/${expectedEmail} · links ${links.length}`
    );
  });

  it('spells every microdata attribute in the canonical lower case', async () => {
    await loadPage();

    /*
     * 🔴 THE REGRESSION GUARD FOR A MEASURED REACT 19 BEHAVIOUR.
     *
     * `itemProp` / `itemScope` / `itemType` passed to a React component are emitted VERBATIM by
     * react-dom 19.2.8's server renderer — measured through `renderToStaticMarkup`, for a bare
     * `<a>` and through the design system's `Link`, and it is React's doing rather than the design
     * system's. MEASURED at `validator.schema.org`: the camel-cased page parses to the SAME single
     * `Person` with the same six properties, so a consumer running an HTML parser is unaffected.
     * The cost is to verification — the bytes say `itemProp`, and the first version of the
     * assertion above passed the page while reporting zero `sameAs`. This fires the moment
     * microdata is put back onto a React component.
     */
    for (const camel of ['itemProp', 'itemScope', 'itemType']) {
      expect(page, `${camel} appears in the served page — see this test's comment`).not.toContain(
        camel
      );
    }

    say('microdata casing: no itemProp/itemScope/itemType in the served bytes');
  });

  it('ships no JSON-LD, by any mechanism', async () => {
    await loadPage();

    expect(page).not.toContain('application/ld+json');
    expect(page).not.toContain('ld+json');

    say('json-ld: 0 occurrences (OQ-2 option 1 — microdata, no sink, no script)');
  });
});

describe('/resume — PUB-14, and the broken-JSON-LD symptom §12.3 measured', () => {
  it('ships no framework JavaScript', async () => {
    await loadPage();

    const tags = [...page.matchAll(/<script\b([^>]*)>/gi)].map((match) => match[1]);
    for (const attributes of tags) {
      expect(attributes, 'a module script reached /resume').not.toMatch(
        /type\s*=\s*"module"|type\s*=\s*'module'/
      );
    }
    expect(page).not.toContain('client:load');
    expect(page).not.toContain('astro-island');

    say(`scripts: ${tags.length} tag(s) on the page, 0 of type=module, 0 astro-island`);
  });

  it('has no un-interpolated template expression in any script body', async () => {
    await loadPage();

    const bodies = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(
      (match) => match[1]
    );

    // ANTI-VACUITY. The shell ships exactly one inline script; zero would mean this assertion read
    // nothing, which is a different page from the one being described.
    expect(
      bodies.length,
      'the served page has no script body at all — this assertion would pass having read nothing'
    ).toBeGreaterThan(0);

    for (const body of bodies) {
      // §12.3, MEASURED with the installed compiler: a plain expression inside a script body ships
      // as the literal characters. `{j}` is that exact symptom; `{{` and `${` are the two other
      // shapes an un-interpolated body takes.
      expect(body).not.toContain('{j}');
      expect(body).not.toContain('{{');
      expect(body).not.toContain('${');
    }

    say(`script bodies: ${bodies.length} inspected, 0 carrying {j} / {{ / \${`);
  });
});

describe('/resume — PUB-11, the print stylesheet, read from the served stylesheet', () => {
  /**
   * These read the SERVED CSS rather than the source file, for the reason the gutter gate reads the
   * built stylesheet: what shipped is the claim. The source-side check — that the print block
   * restates no colour — is a separate command quoted in `05-10-SUMMARY.md`, because a minifier
   * rewrites the block's text and a colour assertion over minified CSS is a different, weaker one.
   */
  async function servedCss(): Promise<string> {
    await loadPage();
    const hrefs = [...page.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
      (match) => match[1]
    );
    const inline = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
    const fetched = await Promise.all(
      hrefs.map(async (href) => (await fetch(`${previewBaseUrl}${href}`)).text())
    );
    return [...inline, ...fetched].join('\n');
  }

  it('carries a print block with the break, measure and link-expansion rules', async () => {
    const css = await servedCss();

    expect(css.length, 'no CSS was served with the page at all').toBeGreaterThan(0);
    expect(css).toContain('@media print');
    expect(css).toContain('break-inside');
    expect(css).toContain('break-after');
    // The URL-on-paper rule. Matched on the selector head rather than the whole declaration,
    // because a minifier is free to re-quote and re-space the content string.
    expect(css).toMatch(/a\[href\^=["']?http/);
    expect(css).toMatch(/min\(68ch,\s*100%\)/);

    say(
      `print css: ${css.length} bytes served; print block, breaks, 68ch measure and href^=http present`
    );
  });

  /**
   * The metric value and its label are two adjacent spans, and `compressHTML` removes the newline
   * between them — so the markup is `+15%</span><span>CONVERSION` with no character in between and
   * the separation is CSS's job alone. Without it the page renders `+15%CONVERSION`. `/work`
   * carried `margin-right` from the start; this route shipped without it until plan 05-09 measured
   * the built page. Asserted against the SERVED CSS, because the source having the rule proves
   * nothing about what reached the reader.
   */
  it('separates the metric value from its label in the served CSS', async () => {
    const css = await servedCss();

    expect(css.length, 'no CSS was served with the page at all').toBeGreaterThan(0);
    // Anti-vacuity: the selector must be present before its declaration can mean anything.
    expect(css, 'the .rs-metric-value selector is absent from the served CSS').toMatch(
      /\.rs-metric-value/
    );
    const rule = css.match(/\.rs-metric-value\s*\{([^}]*)\}/);
    expect(rule, 'no .rs-metric-value rule body in the served CSS').not.toBeNull();
    expect(rule?.[1], 'the value would render flush against its label — `+15%CONVERSION`').toMatch(
      /margin-right/
    );

    say(`metric separator: .rs-metric-value declares ${rule?.[1].trim()}`);
  });
});
