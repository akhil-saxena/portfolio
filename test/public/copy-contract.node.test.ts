import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { NAV_ITEMS } from '../../src/components/public/PublicNav';
import type { HomeConfig } from '../../src/schemas';

const previewBaseUrl = inject('previewBaseUrl');
const say = (line: string) => process.stdout.write(`${line}\n`);

const home = JSON.parse(
  readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
) as HomeConfig;

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

const text = (markup: string): string =>
  decodeEntitiesOnce(markup.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

const pages = new Map<string, string>();

async function load(path: string): Promise<string> {
  const cached = pages.get(path);
  if (cached !== undefined) return cached;
  const response = await fetch(`${previewBaseUrl}${path}`);
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`copy-contract: ${path} answered ${response.status}, not 200.`);
  }
  pages.set(path, body);
  return body;
}

type Pin = {
  readonly what: string;
  readonly route: string;
  readonly slice: RegExp;
  readonly copy: string;
  readonly why: string;
};

const PINS: readonly Pin[] = [
  {
    what: 'the résumé link on /development, which is now the only route to the PDF',
    route: '/development',
    slice: /<a[^>]*href="\/resume\.pdf"[^>]*>([\s\S]*?)<\/a>/,
    copy: 'Resume (PDF)',
    why:
      'THE PIN MOVED WITH THE FILE IT NAMES. It read "Download the PDF" on `/resume`, the HTML ' +
      'résumé page — removed on 2026-09-05, Akhil: *"delete page or hide page /resume for now"*. ' +
      'The PDF still ships, and the only link to it is now the rail on `/development`, so that is ' +
      'where the string is pinned. Deleting the pin instead would have left the last route to a ' +
      '131KB asset unasserted; a reader who cannot find the file is the failure this row exists ' +
      'to catch, and it does not care which page carries the link.',
  },
];

type RetiredPin = Pin & {
  readonly retired: string;
};

const RETIRED_PINS: readonly RetiredPin[] = [
  {
    what: '§13.2 Secondary CTA — Home Act 2, the work band',
    route: '/',
    slice: /<a class="hm-more" href="\/development">([\s\S]*?)<\/a>/,
    copy: 'ALL DEVELOPMENT →',
    why: 'the control that leaves Home for the complete project list',
    retired: '2026-09-02 — Akhil: Home is one screen. Act 2, and this band with it, is gone.',
  },
  {
    what: '§13.2 Secondary CTA — Home Act 2, the résumé band',
    route: '/',
    slice: /<a class="hm-more" href="\/resume">([\s\S]*?)<\/a>/,
    copy: 'RÉSUMÉ →',
    why: 'the same control for the other destination; the accent and the arrow are both copy',
    retired:
      '2026-09-02 — with Act 2. NOTE: this was the ONLY route to /resume from Home, and the ' +
      'nav has carried no `résumé` item since 2026-08-30 either. /resume is now reachable from ' +
      'Home only by way of /development. Recorded, not fixed — it is a navigation decision.',
  },
  {
    what: '§13.2 Secondary CTA — Home Act 2, the résumé band’s second link',
    route: '/',
    slice: /<a class="hm-resume-cta" href="\/resume">([\s\S]*?)<\/a>/,
    copy: 'View résumé',
    why: 'the second route to the same page, and the only one below the fold of Act 2',
    retired: '2026-09-02 — with Act 2.',
  },
  {
    what: '§6.4 Act-2 band heading — the work',
    route: '/',
    slice: /<h2[^>]*id="hm-work-h"[^>]*>([\s\S]*?)<\/h2>/,
    copy: 'Development',
    why:
      'it named the band a reader was sent to by the scroll cue, and was the accessible name of ' +
      'the region (`aria-labelledby="hm-work-h"`), so it was structure and not description',
    retired:
      '2026-09-02 — with Act 2. The cue that pointed at it went in the same change; ' +
      'test/public/home.node.test.ts asserts both absences and the landmark count that fell ' +
      'from three to one.',
  },
  {
    what: '§6.4 Act-2 band heading — the résumé',
    route: '/',
    slice: /<h2[^>]*id="hm-resume-h"[^>]*>([\s\S]*?)<\/h2>/,
    copy: 'The résumé',
    why: 'the same, for the second of Act 2’s two named regions',
    retired: '2026-09-02 — with Act 2.',
  },
];

let navMarkup = '';

describe('§13.2 — the navigational strings, character for character on the served bytes', () => {
  it.each(PINS.map((pin) => [pin.what, pin] as const))('%s', async (_name, pin) => {
    const page = await load(pin.route);

    const found = page.match(pin.slice);
    expect(
      found,
      `${pin.route}: nothing matched ${pin.slice} — the element carrying this copy is gone, and a ` +
        'string assertion over a missing element is not an assertion'
    ).not.toBeNull();

    expect(text((found as RegExpMatchArray)[1] as string)).toBe(pin.copy);
  });

  it('reports what it pinned, derived from the table rather than typed', async () => {
    expect(PINS.length, 'the pin table is empty — this file would assert nothing').toBeGreaterThan(
      0
    );
    for (const pin of PINS) {
      expect(pin.copy.length, `${pin.what} pins the empty string`).toBeGreaterThan(0);
      expect(pin.why.length, `${pin.what} carries no reason`).toBeGreaterThan(20);
    }
    say(`copy contract: ${PINS.length} pinned string(s)`);
    for (const pin of PINS) say(`  ${pin.route.padEnd(8)} ${JSON.stringify(pin.copy)}`);
  });
});

describe('§13.2 — the retired strings, asserted as absences on the same served bytes', () => {
  it.each(RETIRED_PINS.map((pin) => [pin.what, pin] as const))(
    'RETIRED · %s',
    async (_name, pin) => {
      const page = await load(pin.route);

      if (pin.route === '/') {
        expect(
          page,
          'the served Home document has no <h1> marker — nothing below is a claim'
        ).toMatch(/<h1[^>]*data-home-marker="home-render-ok"/);
      }

      expect(
        page.match(pin.slice),
        `${pin.route}: ${pin.slice} MATCHED. This copy was retired — ${pin.retired} — so its ` +
          'element is back. If that is deliberate, move this row from RETIRED_PINS into PINS: it ' +
          'is a navigational string again and it must be asserted character for character.'
      ).toBeNull();

      const leaves = [...page.matchAll(/>([^<>]+)</g)].map((m) => text(m[1] as string));
      if (pin.route === '/') {
        expect(
          leaves.filter((leaf) => leaf === 'Photography →' || leaf === 'Development →'),
          'the leaf-text extractor found neither door — it is the same expression the absence ' +
            'check below reads, so every retired row would pass on nothing'
        ).toEqual(expect.arrayContaining(['Photography →', 'Development →']));
      }
      expect(
        leaves.filter((leaf) => leaf === pin.copy),
        `${pin.route}: an element still carries the retired copy ${JSON.stringify(pin.copy)} as ` +
          'its full text, even though the element this row named is gone — so the band was ' +
          'rebuilt with new markup around the old words. Move the row back into PINS with a ' +
          'slice that matches the new markup.'
      ).toEqual([]);
    }
  );

  it('reports what it retired, and refuses a row with no date and no reason', () => {
    expect(
      RETIRED_PINS.length,
      'the retired table is empty. Rows are RETIRED here, never deleted — see the block comment.'
    ).toBeGreaterThan(0);

    for (const pin of RETIRED_PINS) {
      expect(pin.copy.length, `${pin.what} retires the empty string`).toBeGreaterThan(0);
      expect(pin.why.length, `${pin.what} carries no reason`).toBeGreaterThan(20);
      expect(
        pin.retired.length,
        `${pin.what} was retired with no date and no decision recorded`
      ).toBeGreaterThan(20);
      expect(pin.retired, `${pin.what} names no date`).toMatch(/\d{4}-\d{2}-\d{2}/);
    }

    const live = new Set(PINS.map((pin) => `${pin.route} ${pin.copy}`));
    for (const pin of RETIRED_PINS) {
      expect(
        live.has(`${pin.route} ${pin.copy}`),
        `${JSON.stringify(pin.copy)} on ${pin.route} is in PINS and RETIRED_PINS at once`
      ).toBe(false);
    }

    say(`copy contract: ${RETIRED_PINS.length} retired string(s), asserted absent`);
    for (const pin of RETIRED_PINS) say(`  ${pin.route.padEnd(8)} ${JSON.stringify(pin.copy)}`);
  });
});

const NAV_CONTRACT: ReadonlyArray<{ readonly href: string; readonly label: string }> = [
  { href: '/development', label: 'development' },
  { href: '/photography', label: 'photography' },
];

describe('the AppBar’s nav labels — the most navigational strings on the site', () => {
  it('pins the source constant: NAV_ITEMS is exactly the contract, in order', () => {
    expect(NAV_CONTRACT.length, 'the nav contract is empty').toBeGreaterThan(0);
    expect(NAV_ITEMS.map((item) => ({ href: item.href, label: item.label }))).toEqual([
      ...NAV_CONTRACT,
    ]);
  });

  it('pins the served bar: the same labels, hrefs and order, in the shipped bytes', async () => {
    const page = await load('/development');
    const bar = page.match(/<header class="ds-atom-appbar"[\s\S]*?<\/header>/);
    expect(bar, 'no .ds-atom-appbar in the served /development document').not.toBeNull();
    navMarkup = (bar as RegExpMatchArray)[0];

    const anchors = [...navMarkup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
      href: /href="([^"]*)"/.exec(m[1] as string)?.[1] ?? '',
      label: text(m[2] as string),
    }));

    const nav = anchors.filter((a) => NAV_CONTRACT.some((item) => item.href === a.href));
    expect(nav).toEqual([...NAV_CONTRACT]);

    say(`nav: ${nav.map((a) => `${JSON.stringify(a.label)} → ${a.href}`).join(' · ')}`);
  });
});

describe('Home’s three CMS strings — DERIVED from home_config.json, never pinned', () => {
  it('renders the title, the subtitle and the intro exactly as data/home_config.json holds them', async () => {
    const page = await load('/');

    const fields: ReadonlyArray<[string, string, RegExp]> = [
      ['title', home.title, /<h1[^>]*data-home-marker="[^"]*"[^>]*>([\s\S]*?)<\/h1>/],
      ['subtitle', home.subtitle, /<p[^>]*class="[^"]*\bhm-subtitle\b[^"]*"[^>]*>([\s\S]*?)<\/p>/],
      ['intro', home.intro, /<p[^>]*class="[^"]*\bhm-intro\b[^"]*"[^>]*>([\s\S]*?)<\/p>/],
    ];

    const OPTIONAL = new Set(['intro']);

    for (const [name, expected, slice] of fields) {
      const found = page.match(slice);

      if (OPTIONAL.has(name) && expected.length === 0) {
        expect(
          found,
          `home_config.${name} is empty and Home still renders an element for it. An empty <p> ` +
            'takes its padding-block-start, so the spacing is wrong with nothing on screen to ' +
            'explain why — see the guard in src/pages/index.astro.'
        ).toBeNull();
        continue;
      }

      expect(
        expected.length,
        `home_config.json's ${name} is empty. It is not in OPTIONAL, so HomeConfigSchema requires ` +
          'it — if that changed, change both together.'
      ).toBeGreaterThan(0);
      expect(found, `Home renders no element matching ${slice} for ${name}`).not.toBeNull();
      expect(text((found as RegExpMatchArray)[1] as string)).toBe(expected);
    }

    say(
      `home_config: title ${JSON.stringify(home.title)} · subtitle ${JSON.stringify(home.subtitle)} · intro ${JSON.stringify(home.intro)}${
        home.intro.length === 0 ? ' (empty — asserted ABSENT from the page)' : ''
      } — all derived`
    );
  });

  /*
   * ══ THE WORDMARK — ABSENT ON HOME, PRESENT EVERYWHERE ELSE, AND BOTH HALVES ARE PINNED ═══════
   *
   * This test used to assert the logo on `/` alone. 05-16 suppressed the wordmark on Home and only
   * on Home, and both halves of that decision are now asserted, because an absence nobody checks
   * is indistinguishable from a regression:
   *
   *   - the DESIGN SOURCE. `Work.dc.html:24` and `Photos.dc.html:24` both carry
   *     `<a href="…Home…">akhil saxena</a>`; `Akhil Saxena - Home.dc.html` carries none. Three
   *     files, consistent, and the reason is that Home's `<h1>` IS the wordmark at 60px.
   *   - the MEASUREMENT. At 344 and 390 on a fine pointer the wordmark wraps to two lines and the
   *     bar paints 67px against `--ds-appbar-h`'s declared 57 — the one case the design system's
   *     own docstring says the property cannot promise.
   *
   * `/development` is the positive half, and it is what keeps this from being a test that passes because
   * the wordmark was deleted site-wide. `PublicNav.tsx` records the full reasoning.
   */
  /**
   * 05-16 suppressed the WORDMARK on Home. 05-17 removed the BAR that carried it, so the absence
   * this test guards is now structural rather than conditional — and it is asserted more strongly
   * because of it, not less.
   *
   * The D-23 anti-vacuity half is kept and is still the half that matters. `AppBar` renders its own
   * ink box captioned "DS" when `logo` is nullish (`logo ?? <DefaultLogo />`, MEASURED,
   * `chunk-Q7KBVLX4.js:77`), so "no wordmark" and "someone else's placeholder" look identical to
   * any assertion that only checks for `pub-logo`. If a future plan puts a bar back on Home, this
   * catches the placeholder on the way in.
   */
  it('renders NO bar and NO wordmark on Home — the <h1> is the wordmark there (05-16, 05-17)', async () => {
    const page = await load('/');
    expect(
      page.match(/ds-atom-appbar/),
      'an AppBar is back on Home. The approved design has no bar on this route — see ' +
        'src/components/public/PublicNav.tsx.'
    ).toBeNull();
    expect(
      page.match(/\bpub-logo\b/),
      'Home ships a wordmark; the design handoff suppresses it on this route alone'
    ).toBeNull();
    expect(page.includes('>DS<'), 'the DefaultLogo placeholder shipped').toBe(false);

    // ANTI-VACUITY: the two absences above are claims about a page that really rendered, and the
    // bar-bearing routes really do still have one — so this is not passing because `load` is broken.
    expect(page, 'the served Home document has no <h1> at all').toMatch(/<h1[^>]*data-home-marker/);
    expect(
      await load('/development'),
      '/development lost its AppBar too — this is not a Home-only change'
    ).toMatch(/ds-atom-appbar/);
  });

  it('renders the site title in the AppBar logo on every other route, from the same record', async () => {
    const page = await load('/development');
    const bar = (page.match(/<header class="ds-atom-appbar"[\s\S]*?<\/header>/) ?? [''])[0];
    const logo = (bar as string).match(/<a[^>]*class="[^"]*pub-logo[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    expect(logo, 'no .pub-logo anchor in /development’s served AppBar').not.toBeNull();
    expect(text((logo as RegExpMatchArray)[1] as string)).toBe(home.title);
    expect(
      /href="\/"/.test((logo as RegExpMatchArray)[0] as string),
      'the wordmark points home'
    ).toBe(true);
  });
});
