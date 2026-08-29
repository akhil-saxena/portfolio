/**
 * `/work`, asserted over HTTP against the built artefact served by real `workerd`. Plan 05-09,
 * task 3.
 *
 * ================================================================================================
 * WHY THIS IS AN HTTP SUITE AND NOT A RENDER TEST
 * ================================================================================================
 *
 * Every claim below is about SHIPPED BYTES. "No framework JavaScript reaches this route", "the
 * component figure is resolved rather than tokenised", "every outbound anchor announces itself" are
 * facts about `dist/` and about what the origin answers; asked of a component in jsdom they become
 * inferences. The prerender that produces those bytes runs inside `workerd`, not Node — no
 * filesystem, `process.cwd()` is `/bundle`, `import.meta.url` is undefined — so a green unit run
 * proves nothing about this page. The `integration` project's `globalSetup` runs a real
 * `astro build` and serves it through `@cloudflare/vite-plugin`.
 *
 * ================================================================================================
 * NOT ONE COUNT IN THIS FILE IS A LITERAL
 * ================================================================================================
 *
 * There is no `3`, no `5`, no `13`, no `81` and no `1080` below. `data/resume.json` and
 * `data/projects.json` are reviewed content Akhil edits, the component figure is the design
 * system's own published answer, and the band's cap is `PAGE_MAX.band`. Every expected value is
 * read from its one source at test time, and every derived expectation is preceded by an
 * ANTI-VACUITY assertion — a suite that derives `0` from an emptied fixture and then passes zero
 * comparisons is the failure this phase's register is full of.
 *
 * Nothing here asserts the WORDING of an employment metric. The three values on disk are
 * placeholders Akhil intends to revise (OQ-1b); they are compared to the file, never to a string.
 *
 * Evidence is written with `process.stdout.write`. MEASURED by plan 04-01 with a probe: under this
 * repository's vitest setup `console.log` and `console.info` print NOTHING, so a check reporting
 * through them is indistinguishable from a check that found nothing.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { resolveDsCounts, resolveDsTokens } from '../../src/lib/ds-component-count';
import { BREAKPOINTS, PAGE_MAX } from '../../src/lib/layout-ladder';
import { formatPeriod } from '../../src/lib/period';
import type { Project, Resume } from '../../src/schemas';

const previewBaseUrl = inject('previewBaseUrl');

const say = (line: string) => process.stdout.write(`${line}\n`);

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8')) as T;
}

const resume = readJson<Resume>('../../data/resume.json');
const projects = readJson<Project[]>('../../data/projects.json');

/** The route under test and the one it points at, in one place each. */
const WORK_PATH = '/work';
const PHOTOS_PATH = '/photos';

/** §10 item 7 / §13.2 — the cross-link's reviewed copy, character for character. */
const CROSSLINK_COPY = 'see the photographs →';

/** The announcement every outbound anchor must carry (§10.1). */
const NEW_TAB = '(opens in a new tab)';

/**
 * ONE pass of entity decoding, which is what an HTML parser does. A second pass would turn a
 * double-encoded `&amp;amp;` back into `&` and hide exactly the defect a text comparison exists to
 * catch.
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
      nbsp: ' ',
    };
    return named[body] ?? whole;
  });
}

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '');
const text = (value: string) => decodeEntitiesOnce(stripTags(value)).replace(/\s+/g, ' ').trim();

let page = '';
let response: Response;

async function loadPage(): Promise<void> {
  if (page) return;
  response = await fetch(`${previewBaseUrl}${WORK_PATH}`);
  page = await response.text();
}

/**
 * Every project card, sliced out by matching its own `<div>` depth.
 *
 * SCOPED, and that is the point: 05-10 measured a page-wide `/<li/g` count that also matched
 * `<link`, and a page-wide `li < nb` predicate that could not fire until nine bullets were gone.
 * A claim about a card is asserted inside that card.
 */
function sliceCards(source: string): string[] {
  const CARD_OPEN = '<div class="ds-atom-card wk-card"';
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf(CARD_OPEN, from);
    if (start === -1) return out;
    let depth = 0;
    let i = start;
    for (;;) {
      const open = source.indexOf('<div', i);
      const close = source.indexOf('</div>', i);
      if (close === -1) return out;
      if (open !== -1 && open < close) {
        depth += 1;
        i = open + 4;
      } else {
        depth -= 1;
        i = close + 6;
        if (depth === 0) break;
      }
    }
    out.push(source.slice(start, i));
    from = i;
  }
}

interface Anchor {
  attrs: string;
  inner: string;
}

function anchors(source: string): Anchor[] {
  return [...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    attrs: m[1] as string,
    inner: m[2] as string,
  }));
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? (m[1] as string) : null;
}

describe('/work — the route answers with the projects and the employment strip', () => {
  it('is served, as HTML, by the built origin', async () => {
    await loadPage();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type') ?? '').toContain('text/html');
    say(`work: ${page.length} bytes of HTML from ${previewBaseUrl}${WORK_PATH}`);
  });

  it('carries exactly one <h1>, and the accent is on the full stop alone', async () => {
    await loadPage();

    const headings = page.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? [];
    expect(headings.length, `the page carries ${headings.length} <h1> elements`).toBe(1);

    const h1 = headings[0] as string;
    // §4.3 item 1 — the stop is wrapped, the heading is not coloured.
    expect(h1).toContain('<span class="wk-stop">.</span>');
    expect(text(h1).endsWith('.'), 'the header does not end in the accent stop').toBe(true);

    say(`h1: 1 element, ${JSON.stringify(text(h1))}, stop wrapped in .wk-stop`);
  });
});

describe('/work — the employment strip renders every stored record', () => {
  it('renders one row per experience entry, with the period from formatPeriod', async () => {
    await loadPage();

    const stored = resume.experience;
    // ANTI-VACUITY. An emptied fixture derives an empty expectation and every comparison passes.
    expect(
      stored.length,
      'data/resume.json yielded no experience records — the assertions below would compare nothing'
    ).toBeGreaterThan(0);

    const rows = [...page.matchAll(/<article class="wk-row">([\s\S]*?)<\/article>/g)].map(
      (m) => m[1] as string
    );
    expect(
      rows.length,
      'no .wk-row was found in the served page — the renderer, not the data, is missing'
    ).toBe(stored.length);

    stored.forEach((entry, index) => {
      const row = rows[index] as string;
      expect(text(row), `row ${index} is not ${entry.id}`).toContain(entry.company);
      expect(text(row)).toContain(`${entry.role} · ${formatPeriod(entry)}`);
    });

    say(
      `rows: ${rows.length} rendered against ${stored.length} stored, every period from formatPeriod`
    );
  });

  it('renders each metric value and label INSIDE the row they belong to', async () => {
    await loadPage();

    const rows = [...page.matchAll(/<article class="wk-row">([\s\S]*?)<\/article>/g)].map(
      (m) => m[1] as string
    );
    expect(rows.length).toBeGreaterThan(0);

    /*
     * Scoped to the row on purpose. A page-wide "does this value appear" check passes when two
     * metrics are swapped between companies — a claim about the wrong employer, rendered correctly.
     * Nothing below reads the wording: both halves are compared to the record.
     */
    resume.experience.forEach((entry, index) => {
      const row = rows[index] as string;
      expect(row, `${entry.id}'s metric value is not in its own row`).toContain(
        `<span class="wk-metric-value">${entry.metric.value}</span>`
      );
      expect(row, `${entry.id}'s metric label is not in its own row`).toContain(
        `<span class="wk-metric-label">${entry.metric.label}</span>`
      );
    });

    say(
      `metrics: ${resume.experience.length} value+label pair(s), each inside its own row, none compared to a literal`
    );
  });

  it('caps the band at PAGE_MAX.band, read from the ladder rather than restated', async () => {
    await loadPage();
    expect(page).toContain(`style="--wk-band-max: ${PAGE_MAX.band}px"`);
    say(`band: --wk-band-max is ${PAGE_MAX.band}px, which is PAGE_MAX.band`);
  });
});

describe('/work — the project cards', () => {
  it('renders one card per project, in the order data/projects.json stores them', async () => {
    await loadPage();

    expect(
      projects.length,
      'data/projects.json holds no projects — the assertions below would compare nothing'
    ).toBeGreaterThan(0);

    const cards = sliceCards(page);
    expect(cards.length, 'the card renderer is missing, not the data').toBe(projects.length);

    /*
     * ORDER IS ASSERTED, and it is not decoration. MEASURED during this plan: `getCollection`
     * returns the records sorted by `id`, not in file order, so the first build put the
     * design-system card second. `work.astro` re-imposes the file's order; this is what holds it.
     */
    projects.forEach((project, index) => {
      expect(text(cards[index] as string), `card ${index} is not ${project.id}`).toContain(
        project.title
      );
    });

    say(`cards: ${cards.length} rendered, in file order (${projects.map((p) => p.id).join(', ')})`);
  });

  it('resolves the component figure from the design system README, never a token', async () => {
    await loadPage();

    const counts = resolveDsCounts();
    expect(counts.componentCount, 'the resolver returned no component count').toBeGreaterThan(0);
    expect(counts.categoryCount, 'the resolver returned no category count').toBeGreaterThan(0);

    const cards = sliceCards(page);
    expect(cards.length).toBe(projects.length);

    /*
     * Every description, compared to the RESOLVED string the resolver produces from the stored one.
     * The figure is read from `src/lib/ds-component-count.ts` at test time and never written as 81;
     * §13.3 says no hand-maintained copy of that number may exist, and a test is a copy.
     */
    let tokenised = 0;
    projects.forEach((project, index) => {
      const card = cards[index] as string;
      const rendered = [...card.matchAll(/<p class="wk-card-desc">([\s\S]*?)<\/p>/g)].map((m) =>
        text(m[1] as string)
      );
      expect(rendered.length, `card ${project.id} renders ${rendered.length} descriptions`).toBe(1);
      expect(rendered[0], `card ${project.id}'s description is not the resolved stored one`).toBe(
        resolveDsTokens(project.description)
      );
      if (/\{\{/.test(project.description)) tokenised += 1;
    });

    // ANTI-VACUITY for the claim this test is really about: at least one stored description must
    // CARRY a token, or "no token survives" is true of a fixture that never had one.
    expect(
      tokenised,
      'no stored description carries a {{…}} token, so the resolution claim is vacuous'
    ).toBeGreaterThan(0);

    const designSystem = cards[projects.findIndex((p) => /\{\{ds\./.test(p.description))] as string;
    expect(designSystem).toContain(String(counts.componentCount));
    expect(designSystem).toContain(String(counts.categoryCount));
    expect(designSystem).not.toContain('{{ds.componentCount}}');
    expect(designSystem).not.toContain('{{ds.categoryCount}}');
    expect(page, 'a {{…}} token survived into the served page').not.toMatch(/\{\{/);

    // Printed side by side so the evidence line shows the two numbers being compared, rather than
    // one number and an assurance. Read out of the SERVED bytes, not out of the expectation.
    const servedDescription = text(
      (/<p class="wk-card-desc">([\s\S]*?)<\/p>/.exec(designSystem)?.[1] ?? '') as string
    );
    const servedFigures = servedDescription.match(/\d+/g) ?? [];
    expect(servedFigures.length, 'the served design-system card carries no figure at all').toBe(2);

    say(
      `ds figures: resolver ${counts.componentCount} components / ${counts.categoryCount} categories · ` +
        `served card ${servedFigures.join(' / ')} · neither token survives · ` +
        `${tokenised} stored description(s) carry a token`
    );
  });

  it('opens every outbound anchor safely and announces the target change', async () => {
    await loadPage();

    const cards = sliceCards(page);
    expect(cards.length).toBe(projects.length);

    let external = 0;
    let announced = 0;

    projects.forEach((project, index) => {
      const card = cards[index] as string;
      const cardAnchors = anchors(card);

      const cardLinks = cardAnchors.filter((a) =>
        (attr(a.attrs, 'class') ?? '').includes('wk-card-link')
      );
      expect(cardLinks.length, `${project.id} has ${cardLinks.length} stretched card links`).toBe(
        1
      );
      expect(attr((cardLinks[0] as Anchor).attrs, 'href')).toBe(project.href);

      const badgeLinks = cardAnchors.filter((a) =>
        (attr(a.attrs, 'class') ?? '').includes('wk-badge')
      );
      expect(badgeLinks.length, `${project.id}'s badge row`).toBe(project.badges.length);
      for (const badge of project.badges) {
        expect(
          badgeLinks.some((a) => attr(a.attrs, 'href') === badge.href),
          `${project.id} is missing the badge href ${badge.href}`
        ).toBe(true);
      }

      // T-05-09-01 — asserted per anchor, not as two page totals that can balance while an
      // individual anchor is unpaired.
      for (const a of cardAnchors) {
        if (attr(a.attrs, 'target') !== '_blank') continue;
        external += 1;
        expect(attr(a.attrs, 'rel'), `${project.id}: an outbound anchor's rel`).toBe(
          'noopener noreferrer'
        );
        expect(a.inner, `${project.id}: an outbound anchor is not announced`).toContain(NEW_TAB);
        announced += 1;
      }

      // No anchor nests inside another: the card link and the badges are siblings by construction,
      // and this is what would catch a structure that quietly went back to a card-shaped anchor.
      expect(card, `${project.id} nests an anchor inside an anchor`).not.toMatch(
        /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/
      );
    });

    const expected = projects.length + projects.reduce((n, p) => n + p.badges.length, 0);
    expect(
      external,
      'the grid does not carry one outbound anchor per card plus one per badge'
    ).toBe(expected);
    expect(announced).toBe(external);

    say(`outbound: ${external} anchor(s) in the grid, ${announced} announced, all rel-paired`);
  });

  it('carries exactly one StatusPill per card, on the generic path, and no Badge', async () => {
    await loadPage();

    const cards = sliceCards(page);
    expect(cards.length).toBe(projects.length);

    projects.forEach((project, index) => {
      const card = cards[index] as string;
      const pills = card.match(/class="ds-atom-statuspill"/g) ?? [];
      expect(pills.length, `${project.id} carries ${pills.length} StatusPill spans`).toBe(1);
      // The generic path always renders a <span> and marks itself non-interactive.
      expect(card).toContain('data-interactive="false"');
      expect(card, `${project.id} uses Badge, which §10.2 forbids here`).not.toContain(
        'ds-atom-badge'
      );
      // The label is the stored status, capitalised — never `badges[0].label`.
      const label = project.status.charAt(0).toUpperCase() + project.status.slice(1);
      expect(card, `${project.id}'s pill does not read its own status`).toContain(`>${label}<`);
    });

    say(
      `statuses: ${projects.length} pill(s), one per card, generic path, zero Badge; ` +
        `tones ${[...new Set(projects.map((p) => p.status))].join(', ')}`
    );
  });

  it('renders every stored tech chip, inside the card it belongs to', async () => {
    await loadPage();

    const cards = sliceCards(page);
    expect(cards.length).toBe(projects.length);

    const totalStored = projects.reduce((n, p) => n + p.tech.length, 0);
    expect(
      totalStored,
      'no project stores a tech list — this assertion would compare nothing'
    ).toBeGreaterThan(0);

    let rendered = 0;
    projects.forEach((project, index) => {
      const card = cards[index] as string;
      const list = /<ul class="wk-tags">([\s\S]*?)<\/ul>/.exec(card)?.[1] ?? '';
      expect(list.length, `${project.id} renders no tech list at all`).toBeGreaterThan(0);
      const chips = [...list.matchAll(/class="ds-atom-chip"[^>]*>([\s\S]*?)<\/span>/g)].map((m) =>
        text(m[1] as string)
      );
      expect(chips, `${project.id}'s chips are not its stored tech list`).toEqual(project.tech);
      // §4.6c warns that a consumer `className` clobbers the atom hook. MEASURED: it concatenates in
      // 2.0.0-beta.1 — but this component wraps rather than passes one, so the hook must be intact.
      rendered += chips.length;
    });

    expect(rendered).toBe(totalStored);
    say(`chips: ${rendered} rendered against ${totalStored} stored, each inside its own card`);
  });

  it('spells the projects count from the data and never types it', async () => {
    await loadPage();

    const lines = [...page.matchAll(/<p class="wk-count">([\s\S]*?)<\/p>/g)].map((m) =>
      text(m[1] as string)
    );
    expect(lines.length, `the page carries ${lines.length} count lines`).toBe(1);

    const SPELLED = [
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
    ];
    const word = SPELLED[projects.length - 1];
    expect(
      word,
      `this suite spells 1-${SPELLED.length}; the fixture holds ${projects.length}`
    ).toBeDefined();
    expect(lines[0]).toBe(`${word} — shipped on my own`);
    // The digit itself must never reach the line.
    expect(lines[0]).not.toMatch(/\d/);

    say(`count line: ${JSON.stringify(lines[0])} for ${projects.length} stored project(s)`);
  });
});

describe('/work — the cross-link, the metadata and the JavaScript budget', () => {
  it('carries the italic serif cross-link with its exact reviewed copy', async () => {
    await loadPage();

    const rows = [...page.matchAll(/<p class="wk-crosslink-row">([\s\S]*?)<\/p>/g)].map(
      (m) => m[1] as string
    );
    expect(rows.length, `the page carries ${rows.length} cross-link rows`).toBe(1);

    const link = anchors(rows[0] as string);
    expect(link.length).toBe(1);
    expect(attr((link[0] as Anchor).attrs, 'href')).toBe(PHOTOS_PATH);
    expect(text((link[0] as Anchor).inner)).toBe(CROSSLINK_COPY);

    // J2 — 17px in --ochre-d, italic serif. The role is inline because `Link` inline-sets
    // font-family on every variant; asserting the served bytes is the only place it can be checked.
    const style = attr((link[0] as Anchor).attrs, 'style') ?? '';
    expect(style).toContain('var(--font-display)');
    expect(style).toContain('italic');
    expect(style).toContain('var(--text-lg)');
    expect(style).toContain('var(--ochre-d)');
    // §4.3 keeps --ochre-d-strong for the metric; J2 explicitly rejected it here.
    expect(style).not.toContain('var(--ochre-d-strong)');

    // It is INTERNAL: no new tab, so no announcement and no rel are owed.
    expect(attr((link[0] as Anchor).attrs, 'target')).toBeNull();

    say(
      `cross-link: ${JSON.stringify(text((link[0] as Anchor).inner))} → ${PHOTOS_PATH}, italic serif in --ochre-d`
    );
  });

  it('carries SEO-01 metadata with an absolute canonical', async () => {
    await loadPage();

    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(page)?.[1] ?? '';
    expect(canonical, 'the canonical is not absolute').toMatch(/^https?:\/\//);
    expect(canonical.endsWith(WORK_PATH), `the canonical is ${canonical}`).toBe(true);

    for (const property of [
      'og:title',
      'og:description',
      'og:type',
      'og:url',
      'og:image',
      'og:image:alt',
    ]) {
      expect(page, `${property} is missing`).toContain(`property="${property}"`);
    }
    expect(page).toContain('name="twitter:card"');

    const ogUrl = /<meta property="og:url" content="([^"]+)"/.exec(page)?.[1] ?? '';
    expect(ogUrl, 'og:url and the canonical disagree').toBe(canonical);

    say(
      `seo: canonical === og:url === ${canonical}; og:title/description/type/image/image:alt and twitter:card present`
    );
  });

  it('ships zero framework JavaScript (§5.1 route 2)', async () => {
    await loadPage();

    const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(
      scripts.length,
      `the page carries ${scripts.length} <script> tag(s); §5.2 permits exactly one — the shell's ` +
        'inline theme block — so both a missing block and an extra one are failures here'
    ).toBe(1);

    // Both quote forms. 03-06 shipped four predicates that could not fire because they matched
    // only double quotes in a repository whose formatter enforces single ones.
    expect(page).not.toMatch(/type\s*=\s*["']module["']/);
    expect(page).not.toContain('astro-island');
    expect(page).not.toContain('client:');
    expect(page).not.toMatch(/type\s*=\s*["']application\/ld\+json["']/);

    // The one script is the shell's inline theme block, identified by what it does rather than by
    // its bytes — the layout owns its text and this route must not depend on that text.
    const body = (scripts[0]?.[2] ?? '') as string;
    expect(body).toContain('beforeprint');
    expect(body).toContain('pub-theme-toggle');

    say(
      `scripts: ${scripts.length} tag(s), 0 type=module, 0 astro-island, 0 ld+json; the one block is the shell's theme script`
    );
  });

  it('steps the card grid at the ladder’s own breakpoints', async () => {
    await loadPage();

    const hrefs = [...page.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
      (m) => m[1] as string
    );
    const inline = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
      (m) => m[1] as string
    );
    const fetched = await Promise.all(
      hrefs.map(async (href) => (await fetch(`${previewBaseUrl}${href}`)).text())
    );
    const css = [...inline, ...fetched].join('\n');
    expect(css.length, 'no CSS was served with the page at all').toBeGreaterThan(0);
    expect(css, 'the grid rule did not ship').toContain('.wk-grid');

    /*
     * THE TWO NUMBERS IN `work.css` ARE A SECOND COPY OF `BREAKPOINTS`, and a media query cannot
     * read a TypeScript constant. This is the same situation `public-shell.css` is in and it is
     * resolved the same way: compare the SERVED stylesheet against the ladder here, so a divergence
     * is a red test rather than a page and a shell that disagree about which device class they are
     * in. The minifier rewrites `(min-width: 673px)` as `(width>=673px)`, so both spellings count.
     */
    expect(BREAKPOINTS.length, 'the ladder declares no breakpoints').toBeGreaterThan(2);
    const gridSteps = [BREAKPOINTS[1], BREAKPOINTS[2]] as number[];
    for (const px of gridSteps) {
      const query = new RegExp(`@media\\s*\\((?:min-width:\\s*${px}px|width>=${px}px)\\)`);
      expect(css, `the grid does not step at ${px}px, which the ladder declares`).toMatch(query);
    }
    // And it must not step anywhere the ladder does not.
    const declared = new Set(BREAKPOINTS.map(String));
    const found = [...css.matchAll(/@media\s*\((?:min-width:\s*(\d+)px|width>=(\d+)px)\)/g)].map(
      (m) => (m[1] ?? m[2]) as string
    );
    for (const px of found) {
      expect(declared.has(px), `the served CSS steps at ${px}px, which is not in BREAKPOINTS`).toBe(
        true
      );
    }

    say(
      `grid: steps at ${gridSteps.join('px, ')}px; every @media width in the served CSS is one of ${[...declared].join(', ')}`
    );
  });
});
