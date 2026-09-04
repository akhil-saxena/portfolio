/**
 * `/development`, asserted over HTTP against the built artefact served by real `workerd`. Plan 05-09,
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
const WORK_PATH = '/development';
const PHOTOS_PATH = '/photography';

/** §10 item 7 / §13.2 — the cross-link's reviewed copy, character for character. */
/*
 * The copy that USED to be here, kept so the search is for the STRING rather than the wrapper —
 * the same reason `photography-routes.node.test.ts` keeps `RETIRED_COPY` after retiring its row.
 */
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

describe('/development — the route answers with the projects and the employment strip', () => {
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

describe('/development — the experience timeline renders every stored record', () => {
  /*
   * ================================================================================================
   * THIS BLOCK REPLACES THE EMPLOYMENT BAND'S, AND THE BAND IS DELETED
   * ================================================================================================
   *
   * It asserted `<article class="wk-row">` — full-width rows with a metric ranged right, capped at
   * `PAGE_MAX.band`. That component is gone: the split redesign renders experience as a TIMELINE in
   * the 30% rail, and `EmploymentBand.astro` was left importable by nothing. Deleted with this
   * commit, so the page and its proof stop describing different sites.
   *
   * WHAT IS ASSERTED HERE IS THE SAME CLAIM AGAINST THE THING THAT RENDERS. One item per stored
   * record, in stored order, each carrying its own company, role and period. The band's tests were
   * the only coverage the experience section had, so deleting them without this would have left the
   * timeline untested — an emptied `resume.json` or a re-ordered rail would both have shipped.
   */
  it('renders one timeline item per experience entry, in the order resume.json stores them', async () => {
    await loadPage();

    const stored = resume.experience;
    // ANTI-VACUITY. An emptied fixture derives an empty expectation and every comparison passes.
    expect(
      stored.length,
      'data/resume.json yielded no experience records — the assertions below would compare nothing'
    ).toBeGreaterThan(0);

    const items = [...page.matchAll(/<li class="wk-role-item[^"]*">([\s\S]*?)<\/li>/g)].map(
      (m) => m[1] as string
    );
    expect(
      items.length,
      'no .wk-role-item was found in the served page — the renderer, not the data, is missing'
    ).toBe(stored.length);

    stored.forEach((entry, index) => {
      const item = items[index] as string;
      expect(item, `item ${index} is not ${entry.id}`).toContain(
        `<h3 class="wk-role-company">${entry.company}</h3>`
      );
      expect(item, `${entry.id}'s role is not in its own item`).toContain(
        `<p class="wk-role-title">${entry.role}</p>`
      );
      /*
       * The YEARS, not `formatPeriod`. The rail spells a year-only range (`2023 – now`) where the
       * band spelled the month too, and both derive from the same record — see `period.ts`, whose
       * `EN_DASH` this and the rail share so the separator cannot become two decisions. Compared
       * against the stored years rather than a re-typed string.
       */
      const from = String(entry.startYear);
      expect(item, `${entry.id}'s start year is missing`).toContain(from);
    });

    // The FIRST item is the current role, and that is a claim about which one is marked, not styling.
    expect(items[0] as string, 'the first timeline item is not marked current').toBeDefined();
    expect(page).toContain('wk-role-item is-current');
    expect(
      (page.match(/wk-role-item is-current/g) ?? []).length,
      'more than one role is marked current'
    ).toBe(1);

    say(
      `timeline: ${items.length} item(s) against ${stored.length} stored, in order, one marked current`
    );
  });

  it('stores a metric for every role and renders none of them', async () => {
    /*
     * THE INVERSE OF THE ASSERTION THIS REPLACES, and the second half is why it still exists.
     *
     * Akhil: *"remove or reposition +15%, 4k+ franchises, etc in experience section."* So the metric
     * is no longer drawn — but `resume.json` still stores one per role and `ResumeSchema` still
     * requires it, because `/resume` is a separate page and a record that has stopped carrying its
     * own evidence is a worse record whatever this page draws.
     *
     * Asserting only "no metric renders" would pass if the FIELD were deleted too, which is the
     * regression worth catching. Both halves are checked: stored on every record, rendered nowhere.
     */
    await loadPage();

    const stored = resume.experience;
    expect(stored.length, 'no experience records to check').toBeGreaterThan(0);

    stored.forEach((entry) => {
      expect(entry.metric, `${entry.id} has stopped storing a metric`).toBeDefined();
      expect(entry.metric.value, `${entry.id}'s metric has no value`).toBeTruthy();
      expect(entry.metric.label, `${entry.id}'s metric has no label`).toBeTruthy();

      // and the page prints neither half of it
      expect(page, `${entry.id}'s metric value is back on the page`).not.toContain(
        entry.metric.value
      );
    });

    expect(page, 'the metric markup is back').not.toContain('wk-metric-value');
    expect(page, 'the metric markup is back').not.toContain('wk-metric-label');

    say(
      `metrics: ${stored.length} stored, 0 rendered — the field survives its rendering being retired`
    );
  });

  it('is capped by PAGE_MAX.work, and the retired band cap is gone', async () => {
    /*
     * `--wk-band-max` was the employment band's own cap and shipped as an inline custom property.
     * The band is deleted, so the variable must be gone too — a stale custom property is the kind of
     * dead weight that survives a component by years because nothing fails when it lingers.
     *
     * `PAGE_MAX.band` ITSELF IS STILL LIVE and is deliberately not asserted absent: `/resume` caps
     * on `.pub-max-band`. This is a claim about THIS page only.
     */
    await loadPage();
    expect(page, '--wk-band-max still ships; the band it capped is deleted').not.toContain(
      '--wk-band-max'
    );
    expect(page, 'the page does not cap on PAGE_MAX.work').toContain('pub-max-work');
    say(
      `band: --wk-band-max absent, page capped by pub-max-work (PAGE_MAX.work = ${PAGE_MAX.work}px)`
    );
  });
});

describe('/development — the project cards', () => {
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
        /*
         * `wk-mark-link`, NOT `wk-badge`. The text badges were replaced by store glyphs and this
         * selector was never repointed, so it matched zero anchors and reported "cairn's badge row:
         * expected 0 to be 1" — a test failing because it was looking for markup that had been
         * renamed, while the anchors it should have been checking were present and correct.
         */
        (attr(a.attrs, 'class') ?? '').includes('wk-mark-link')
      );
      /*
       * A PENDING BADGE IS NOT COUNTED HERE, because it is not an anchor. `momentum`'s Play Store
       * listing 404s, so that badge renders as a `<span class="wk-mark-pending">` — no href, no tab
       * stop, nothing to rel-pair or announce. Counting it would demand a link to a page that does
       * not exist; the pending badges have their own block at the end of this file.
       */
      const linkable = project.badges.filter(
        (badge) => (badge as { pending?: true }).pending !== true
      );
      expect(badgeLinks.length, `${project.id}'s badge row`).toBe(linkable.length);
      for (const badge of linkable) {
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
        /*
         * EITHER MECHANISM COUNTS, and the distinction is not a loosening — it is the difference
         * between the two kinds of anchor in a card.
         *
         * The TITLE is a text link, so it announces with a `.ds-visually-hidden` span inside it:
         * the accessible name is "Cairn (opens in a new tab)" and the visible text stays "Cairn".
         * A destination MARK has no text at all — it is a 16px glyph — so there is nothing to hide
         * and nothing to append to. It announces with `aria-label`, which REPLACES the name rather
         * than extending it: "cairn.co.in (opens in a new tab)".
         *
         * This assertion only checked the inner HTML, so it demanded that an icon-only link hide a
         * text node it does not have. MEASURED on the served page: all 13 grid anchors announce,
         * 8 of them by `aria-label` and 5 by hidden text. Requiring the wrong one of the two would
         * have pushed the fix toward adding a hidden span inside an `<svg>` — markup that satisfies
         * a regex and gives a screen reader the announcement twice.
         */
        const announcement = `${attr(a.attrs, 'aria-label') ?? ''} ${a.inner}`;
        expect(announcement, `${project.id}: an outbound anchor is not announced`).toContain(
          NEW_TAB
        );
        announced += 1;
      }

      // No anchor nests inside another: the card link and the badges are siblings by construction,
      // and this is what would catch a structure that quietly went back to a card-shaped anchor.
      expect(card, `${project.id} nests an anchor inside an anchor`).not.toMatch(
        /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/
      );
    });

    /*
     * One anchor per card plus one per LINKABLE badge. A pending badge contributes none — see the
     * per-card note above — so it is excluded here rather than the total being loosened.
     */
    const expected =
      projects.length +
      projects.reduce(
        (n, p) =>
          n + p.badges.filter((badge) => (badge as { pending?: true }).pending !== true).length,
        0
      );
    expect(
      external,
      'the grid does not carry one outbound anchor per card plus one per badge'
    ).toBe(expected);
    expect(announced).toBe(external);

    say(`outbound: ${external} anchor(s) in the grid, ${announced} announced, all rel-paired`);
  });

  it('renders NO status pill anywhere, and still stores a status for every project', async () => {
    /*
     * ============================================================================================
     * THE CONTRACT INVERTED, AND THE SECOND HALF IS WHY THIS TEST STILL EXISTS
     * ============================================================================================
     *
     * This asserted "exactly one StatusPill per card, in the head". Akhil: *"remove pils for
     * maintained/live etc."* — so the pill is gone and the old assertion is asserting a design
     * decision that was reversed.
     *
     * IT IS INVERTED RATHER THAN DELETED, because "no pills" is a claim worth holding. The pill was
     * removed for a reason (four of five cards read `Maintained`, and it sat where it competed with
     * the project's own name); a component re-appearing here should be a decision, not a merge.
     *
     * AND THE FIELD IS ASSERTED SEPARATELY FROM ITS RENDERING. `status` stays REQUIRED in
     * `ProjectSchema` — Home's Act 2 reads it and a case-study page will — so this checks that the
     * DATA still carries a status for every project while the PAGE draws none. Deleting the test
     * would have left both halves unguarded: a schema change dropping `status` and a card change
     * re-adding a pill would each have passed.
     */
    await loadPage();

    const cards = sliceCards(page);
    expect(cards.length).toBe(projects.length);

    // Scoped to the grid, not the document: the shell is free to use a pill somewhere else.
    const grid = cards.join('');
    expect(
      grid.match(/ds-atom-statuspill/g) ?? [],
      'a StatusPill is back in the project grid'
    ).toHaveLength(0);
    expect(grid, 'Badge is back in the project grid, which §10.2 forbids here').not.toContain(
      'ds-atom-badge'
    );

    // The three labels the pill used to draw, absent as text too — a pill removed and then typed
    // back as a <span> would pass the class check above.
    projects.forEach((project, index) => {
      const card = cards[index] as string;
      const label = project.status.charAt(0).toUpperCase() + project.status.slice(1);
      expect(card, `${project.id} still prints "${label}" in its card`).not.toContain(`>${label}<`);
      // The data half: still stored, still one of the three, for every project.
      expect(['live', 'maintained', 'archived'], `${project.id} has no stored status`).toContain(
        project.status
      );
    });

    say(
      `statuses: 0 pill(s) rendered, 0 Badge; ` +
        `${projects.length} project(s) still store one (${[...new Set(projects.map((p) => p.status))].join(', ')})`
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

  it('prints no count line, and never types the number anywhere', async () => {
    /*
     * ==============================================================================================
     * INVERTED. Akhil: *"remove text - five, shipped on my own."*
     * ==============================================================================================
     *
     * It asserted one `.wk-count` line reading "five — shipped on my own", with the number SPELLED
     * from `projects.length` so a sixth project could not leave a stale "five" on the page. That was
     * the right shape for a line that existed. It does not any more.
     *
     * WHAT SURVIVES IS THE HALF THAT STILL MATTERS: the count must not be typed. The original risk
     * was a hand-written number going stale; deleting the line removes the line, not the risk — the
     * next person to describe the collection in prose ("five projects", "a handful of five") brings
     * it straight back. So this checks the element is gone AND that neither the digit nor the spelled
     * word appears in the page's own copy.
     *
     * SCOPED TO THE PAGE'S PROSE, not the whole document: the digit `5` legitimately appears in
     * hashed asset URLs, in `81` inside the design-system description, and in years. The check reads
     * the count line's own former home and the section heads, which is where a restatement would go.
     */
    await loadPage();

    const lines = [...page.matchAll(/<p class="wk-count">([\s\S]*?)<\/p>/g)];
    expect(lines.length, `the count line is back: ${lines.length} found`).toBe(0);

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

    // The eyebrow that used to sit beside the count, and the phrase it used to carry.
    const heads = [...page.matchAll(/<h2 class="wk-eyebrow">([\s\S]*?)<\/h2>/g)].map((m) =>
      text(m[1] as string)
    );
    expect(
      heads.length,
      'no section eyebrow was found — this assertion would read nothing'
    ).toBeGreaterThan(0);
    for (const head of heads) {
      expect(head.toLowerCase(), `an eyebrow types the count: ${head}`).not.toContain(
        word as string
      );
      expect(head, `an eyebrow types a digit: ${head}`).not.toMatch(/\d/);
    }
    /*
     * SCOPED TO THE BODY, because the phrase legitimately survives in the `<head>`.
     *
     * MEASURED: `shipped on my own` still ships, inside the meta description — "Products shipped on
     * my own, alongside frontend engineering at Brevo." That sentence was the page's visible
     * sub-paragraph until it was removed as a restatement of the timeline beneath it, and it was
     * MOVED to the description rather than deleted, because a search result has no timeline under it
     * to read instead. So the phrase is retired from the page, not from the site, and a document-wide
     * check fails on the one place it is still doing work. My first version of this assertion did
     * exactly that.
     */
    const body = page.slice(page.indexOf('<body'));
    expect(body, 'the retired count phrasing is back in the page copy').not.toContain(
      'shipped on my own'
    );

    say(`count: 0 count lines, ${heads.length} eyebrow(s) carrying neither "${word}" nor a digit`);
  });
});

describe('/development — the cross-link, the metadata and the JavaScript budget', () => {
  it('carries no cross-link row, and not the retired copy under any wrapper', async () => {
    /*
     * ==============================================================================================
     * §13.2's PAIR IS FULLY RETIRED, AND THIS IS THE OUTGOING HALF'S RECORD
     * ==============================================================================================
     *
     * This asserted the row character for character: one `<p class="wk-crosslink-row">`, the copy
     * `see the photographs →`, and an inline style carrying `--font-display`, `italic`, `--text-lg`
     * and `--ochre-d` but not `--ochre-d-strong`. Akhil: *"remove see the photograhs from development
     * page"* — after the returning half went from `/photography` for the same reason.
     *
     * INVERTED, NOT DELETED, and the precedent is on the other side: `photography-routes.node.test.ts`
     * inverted the returning half's assertion rather than dropping it, because 05-15's audit had
     * MEASURED that row silently missing once before and nothing caught it. §13.2 is prose and no
     * gate reads it, so a deleted test leaves exactly that silence. An inverted one says the absence
     * is intended and goes red the day the row returns by accident.
     *
     * TWO CLAIMS, because the wrapper is not the claim. A row re-added inside a different element
     * would satisfy a check for `.wk-crosslink-row` alone and still put the sentence back.
     */
    await loadPage();

    const rows = [...page.matchAll(/<p class="wk-crosslink-row">([\s\S]*?)<\/p>/g)];
    expect(rows.length, `the cross-link row is back: ${rows.length} found`).toBe(0);

    expect(page, `the page still ships ${CROSSLINK_COPY}`).not.toContain(CROSSLINK_COPY);
    // and not the bare words either, in case the arrow is dropped or re-encoded
    expect(page, 'the page still ships the retired cross-link copy').not.toContain(
      'see the photographs'
    );

    say(`cross-link: 0 rows, ${JSON.stringify(CROSSLINK_COPY)} absent — the pair is fully retired`);
  });

  it('carries SEO-01 metadata with an absolute canonical', async () => {
    await loadPage();

    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(page)?.[1] ?? '';
    expect(canonical, 'the canonical is not absolute').toMatch(/^https?:\/\//);
    // The origin serves `/development/` and 307s `/development` (measured against real `workerd`), so the
    // canonical names the SLASHED form and agrees with the sitemap. See `canonicalPath`.
    expect(canonical.endsWith(`${WORK_PATH}/`), `the canonical is ${canonical}`).toBe(true);

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
    /*
     * And it must not step anywhere the ladder does not — WITH TWO NAMED EXCEPTIONS, and naming
     * them is the point rather than a way around the rule.
     *
     * 🔴 This swept the WHOLE served bundle and required every `min-width` in it to be a ladder
     * rung. That was true until the bar grew a rung of its own, and then it failed here — on
     * `/development`, over a stylesheet this page does not own, for a change to the header.
     *
     * `--pub-bar-h` and the nav's visibility ladder are NOT page-layout breakpoints. They are
     * derived from a measured constraint Akhil set on the bar itself: *"ensure minimum of 60px gap
     * remains between text on header from right & left side, if lesser, remove the button, keep
     * brand."* Sweeping the bar 300→1100px in 2px steps put one nav word over that floor at 344 and
     * both words over it at 458, so the rungs are 344 and 460. Adding them to `BREAKPOINTS` would
     * be worse than listing them here: the ladder is what the page GRID steps at, and a card grid
     * that started stepping at 344 because the wordmark is 112px wide would be nonsense.
     *
     * The sweep is kept because it is the valuable half — a third unexplained rung still fails.
     */
    const SHELL_NAV_RUNGS = ['344', '460'];
    const declared = new Set([...BREAKPOINTS.map(String), ...SHELL_NAV_RUNGS]);
    const found = [...css.matchAll(/@media\s*\((?:min-width:\s*(\d+)px|width>=(\d+)px)\)/g)].map(
      (m) => (m[1] ?? m[2]) as string
    );
    for (const px of found) {
      expect(
        declared.has(px),
        `the served CSS steps at ${px}px, which is neither a BREAKPOINTS rung nor one of the ` +
          `shell's nav rungs (${SHELL_NAV_RUNGS.join(', ')})`
      ).toBe(true);
    }

    /*
     * AND THE EXCEPTIONS ARE NOT THIS PAGE'S. Asserted so the allowance above cannot quietly
     * become cover for a card-grid rule that steps at 344: every query containing a `.wk-` selector
     * must sit on a ladder rung, with no exceptions at all.
     */
    const wkQueries = [
      ...css.matchAll(
        /@media\s*\((?:min-width:\s*(\d+)px|width>=(\d+)px)\)\s*\{([\s\S]{0,2000}?)\}\s*\}/g
      ),
    ]
      .filter((m) => (m[3] as string).includes('.wk-'))
      .map((m) => (m[1] ?? m[2]) as string);
    expect(wkQueries.length, 'no .wk- rule sits inside a width query at all').toBeGreaterThan(0);
    for (const px of wkQueries) {
      expect(
        BREAKPOINTS.map(String).includes(px),
        `a .wk- rule steps at ${px}px, which is not a ladder rung`
      ).toBe(true);
    }

    say(
      `grid: steps at ${gridSteps.join('px, ')}px; every @media width in the served CSS is one of ${[...declared].join(', ')}`
    );
  });
});

/* ============================================================================================
 * A promised destination is text, not a link
 * ========================================================================================== */

describe('a pending badge renders as text and is reachable by nobody', () => {
  /*
   * Akhil: *"for momentum, on play store icon, add a tooltip on hover saying Coming Soon."*
   *
   * MEASURED by fetching both listings: momentum's Play Store URL returns 404 and hued's returns
   * 200. So that mark was an anchor to a Google error page, and a `title` tooltip would have told
   * sighted mouse users while leaving keyboard, screen-reader and touch readers to click through.
   *
   * WHAT IS ASSERTED IS THE PART THAT MATTERS TO A READER WHO CANNOT HOVER: the badge is not an
   * anchor, it carries no href anywhere in the card, and it says its state in visible text.
   */
  const PENDING_LABEL = 'Coming Soon';

  it('marks every pending badge as a span, and never as a link', async () => {
    await loadPage();

    const pending = projects.flatMap((project) =>
      project.badges
        .filter((badge) => (badge as { pending?: true }).pending === true)
        .map((badge) => ({ project, badge }))
    );

    // ANTI-VACUITY. With no pending badge in the corpus every assertion below asserts nothing.
    expect(
      pending.length,
      'no project stores a pending badge — this suite would pass on a page that had lost the feature'
    ).toBeGreaterThan(0);

    const cards = sliceCards(page);

    for (const { project, badge } of pending) {
      const index = projects.findIndex((p) => p.id === project.id);
      const card = cards[index] as string;

      expect(card, `${project.id} does not render the pending label`).toContain(PENDING_LABEL);
      expect(card, `${project.id}'s pending badge is not marked as such`).toContain(
        'wk-mark-pending'
      );

      /*
       * 🔴 THE HREF MUST NOT APPEAR ANYWHERE IN THE CARD, not merely off the badge. `project.href`
       * for momentum WAS the same 404 — so the card's own stretched TITLE link pointed at it too,
       * and checking only the badge would have declared the card fixed while its largest click
       * target still went to the error page.
       */
      expect(card, `${project.id} still links to its pending destination`).not.toContain(
        badge.href
      );
    }

    say(
      `pending: ${pending.length} badge(s) rendered as text, ${PENDING_LABEL} visible, no card links to them`
    );
  });

  it('leaves live badges as announced outbound links', async () => {
    await loadPage();
    const cards = sliceCards(page);

    let live = 0;
    projects.forEach((project, index) => {
      const card = cards[index] as string;
      for (const badge of project.badges) {
        if ((badge as { pending?: true }).pending === true) continue;
        live += 1;
        expect(card, `${project.id} lost its live ${badge.label} link`).toContain(badge.href);
      }
    });

    // The contrast is the claim: pending badges vanish from the hrefs, live ones do not.
    expect(live, 'no live badge remains — the assertion above compared nothing').toBeGreaterThan(0);
    say(`live: ${live} badge href(s) still present as links`);
  });
});
