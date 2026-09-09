import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { NAV_ITEMS } from '../../src/components/public/PublicNav';
import { ACT_ONE_MAX, BREAKPOINTS, PEEK_GAP } from '../../src/lib/layout-ladder';

const previewBaseUrl = inject('previewBaseUrl');

const response = await fetch(`${previewBaseUrl}/`);
const html = await response.text();

const barRouteHtml = await (await fetch(`${previewBaseUrl}/development`)).text();

const HOME_CSS_PATH = 'src/styles/home.css';
const homeCss = readFileSync(HOME_CSS_PATH, 'utf8');

const shellCssCode = readFileSync('src/styles/public-shell.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

const homeRecord = JSON.parse(
  readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
) as { title: string; subtitle: string; intro: string; ctas: ReadonlyArray<unknown> };

const cssCode = homeCss.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the check-instruments themselves', () => {
  it('the comment stripper removes prose and leaves code', () => {
    expect(cssCode.replace(/\s/g, '').length).toBeGreaterThan(0);
    expect('/* display: none */\n.x{color:red}'.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(
      /display:\s*none/
    );
    expect('.y{display:none}'.replace(/\/\*[\s\S]*?\*\//g, '')).toMatch(/display:\s*none/);
    expect(cssCode).toMatch(/\.hm-a\s*\{/);
  });

  it('the served document is non-empty, so no assertion below is vacuous', () => {
    expect(response.status).toBe(200);
    expect(html.length).toBeGreaterThan(1000);
  });
});

describe('Home ships zero framework JavaScript (PUB-14, §5.1 route 1)', () => {
  it('emits no <script type="module">', () => {
    expect(html.match(/<script[^>]*type="module"/g)).toBeNull();
  });

  it('emits no client:* hydration directive', () => {
    expect(html).not.toMatch(/astro-island/);
  });
});

describe('Home ships no scroll cue — the doors replaced it (2026-09-02)', () => {
  const doors = [...html.matchAll(/<a class="ds-atom-btn hm-door"[^>]*>([\s\S]*?)<\/a>/g)];

  const givenTheDoorsRendered = (): void => {
    expect(
      doors.length,
      'Act 1 ships no doors, so this document is not the page under test — the absence asserted ' +
        'below would be true of a blank response and of a 404 alike. Fix the page or the harness ' +
        'before reading the failure under this one.'
    ).toBe(2);
  };

  it('ends Act 1 in two doors rather than an invitation to scroll', () => {
    expect(
      doors.length,
      'Act 1 ships no doors. Everything else in this block asserts an ABSENCE, and without a ' +
        'positive fact about the same document every one of them passes on a blank page.'
    ).toBe(2);
    expect(doors.map((m) => m[1] as string)).toEqual(['Development →', 'Photography →']);

    const variants = doors.map((m) => /data-variant="([^"]*)"/.exec(m[0] as string)?.[1]);
    expect(variants, 'the doors are not ranked primary-then-secondary').toEqual([
      'primary',
      'secondary',
    ]);
    expect(new Set(variants).size, 'the two doors carry the same weight').toBe(2);
  });

  it('emits no anchor pointing at #work, and no ↓ DEVELOPMENT copy', () => {
    givenTheDoorsRendered();
    expect(
      html,
      'the cue is back, and there is still nothing below Act 1 for it to reach — it would scroll ' +
        'the reader to the footer'
    ).not.toMatch(/href="#work"/);
    expect(html, 'the 05-17 cue copy is back on the page').not.toMatch(/↓ DEVELOPMENT/);
  });

  it('no longer ships the shouted string 05-16 pinned', () => {
    givenTheDoorsRendered();
    expect(html, 'the shouted 05-16 cue string is back on the page').not.toMatch(
      /SCROLL FOR THE WORK/
    );
  });

  it('emits no #work target, because there is no second act to target', () => {
    givenTheDoorsRendered();
    expect(
      html,
      'an id="work" landing place is back. Act 2 was removed on 2026-09-02; an in-page anchor ' +
        'target with no section under it scrolls to the end of the document.'
    ).not.toMatch(/<[a-z]+[^>]*\sid="work"/);
  });

  it('ships no element carrying the cue class, so .hm-cue in home.css is dead', () => {
    givenTheDoorsRendered();
    expect(html, 'a cue element is back in the document').not.toMatch(
      /class="[^"]*\bhm-cue\b[^"]*"/
    );
  });

  it('is not a button, a chevron or a div calling scrollIntoView', () => {
    givenTheDoorsRendered();
    expect(
      html,
      'a scripted scroll reached this route — PUB-14 forbids it in any shape'
    ).not.toMatch(/scrollIntoView/);
    expect(html, 'the cue came back as a button').not.toMatch(/<button[^>]*class="[^"]*hm-cue/);
  });
});

describe('<Seo> reached the page and the canonical is absolute (SEO-01)', () => {
  it('emits a canonical whose href is absolute', () => {
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html);
    expect(canonical).not.toBeNull();
    expect(() => new URL(canonical?.[1] ?? '')).not.toThrow();
    expect(canonical?.[1]).toMatch(/^https:\/\//);
  });

  it('emits a title, a description and an absolute og:image', () => {
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    const image = /<meta property="og:image" content="([^"]+)"/.exec(html);
    expect(image).not.toBeNull();
    expect(image?.[1]).toMatch(/^https:\/\//);
  });
});

describe('the arrangement ladder agrees with src/lib/layout-ladder.ts', () => {
  it('every min-width in home.css is one of BREAKPOINTS', () => {
    const widths = [...cssCode.matchAll(/\(min-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) expect(BREAKPOINTS).toContain(width);
  });

  it('the peek column count steps at a rung the ladder declares', () => {
    expect(cssCode).toMatch(/@media\s*\(min-width:\s*673px\)\s*\{\s*\.hm-peek-grid/);
    expect(BREAKPOINTS).toContain(673);
  });

  it('the tile aspect steps on a height rung at 800px', () => {
    expect(cssCode).toMatch(/@media\s*\(min-height:\s*800px\)/);
  });

  it('nothing branches on aspect ratio', () => {
    const conditions = [...cssCode.matchAll(/@media([^{]*)\{/g)].map((m) => m[1]);
    expect(conditions.length).toBeGreaterThan(0);
    for (const condition of conditions) expect(condition).not.toMatch(/aspect-ratio/);
    expect(cssCode).toMatch(/aspect-ratio:\s*\d+\s*\/\s*\d+/);
  });
});

describe('Home is one screen — Act 1 fills what is left, and there is no Act 2 (2026-09-02)', () => {
  it('uses svh, and never vh or dvh', () => {
    expect(
      shellCssCode,
      'the shell stopped declaring a viewport height, so `.hm-a { flex: 1 }` has nothing to fill'
    ).toMatch(/\.pub-shell\s*\{[^}]*min-height:\s*100svh/);
    for (const [label, source] of [
      ['home.css', cssCode],
      ['public-shell.css', shellCssCode],
    ] as const) {
      expect(source, `${label} names dvh`).not.toMatch(/\d+dvh/);
      expect(source, `${label} names vh — the LARGE viewport, not the small one`).not.toMatch(
        /(?<![sd])\d+vh\b/
      );
    }
  });

  it('states A and B use min-height, never height', () => {
    const stateRules = [...cssCode.matchAll(/\.hm-[ab]\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(stateRules.length).toBeGreaterThanOrEqual(2);
    for (const rule of stateRules) expect(rule).not.toMatch(/(?<!min-)height:/);
  });

  it('state A is flex: 1 and border-box — the height budget is gone, not merely unused', () => {
    const a = /\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode);
    expect(a, 'no .hm-a rule at all').not.toBeNull();
    const body = (a as RegExpExecArray)[1] as string;

    expect(
      body,
      'box-sizing went — a padding added later would resolve against the content box'
    ).toMatch(/box-sizing:\s*border-box/);
    expect(
      body,
      'Act 1 lost `flex: 1`, so it no longer grows into the space between the row and the footer ' +
        'and collapses to its content height'
    ).toMatch(/flex:\s*1/);

    expect(
      body,
      'the height budget is back. Under a footer that is now IN FLOW, `100svh - --hm-above` ' +
        "overflows by the footer's height — MEASURED at 49px at 1440, 1280, 390 and 344. Use " +
        '`flex: 1`, which has to know neither height.'
    ).not.toMatch(/min-height:\s*calc\(100svh/);
    expect(
      body,
      'the centring padding is back. It over-corrects by the footer height now that the footer is ' +
        'in flow — MEASURED identically at 1440, 1280 and 390.'
    ).not.toMatch(/padding/);
  });

  it('state A is NOT sticky — the reveal is gone and the page scrolls normally', () => {
    const rules = [...cssCode.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      selector: (m[1] as string).replace(/\s+/g, ' ').trim(),
      body: m[2] as string,
    }));
    expect(rules.length, 'the rule parser found no CSS rules at all').toBeGreaterThan(10);
    const targetsA = rules.filter((rule) =>
      rule.selector.split(',').some((part) => /(^|[\s>+~])\.hm-a$/.test(part.trim()))
    );
    expect(targetsA.length, 'no rule targets .hm-a at all').toBeGreaterThan(0);
    const sticky = targetsA.filter((r) => /position:\s*sticky/.test(r.body));
    expect(
      sticky.length,
      '.hm-a is sticky again. Act 2 will scroll OVER Act 1 instead of after it, one gesture will ' +
        'no longer land in Act 2, and the <h1> dock in home.css §4 will silently stop working — ' +
        'a sticky child of a sticky parent that never moves relative to the viewport never pins.'
    ).toBe(0);
  });

  it('the name does not dock — no sticky, no scroll timeline, no orphaned keyframes', () => {
    expect(cssCode, 'a scroll timeline came back').not.toMatch(/animation-timeline/);
    expect(cssCode, 'the dock keyframes are back').not.toMatch(/@keyframes\s+hm-dock/);
    expect(cssCode, 'the shed keyframes are back').not.toMatch(/@keyframes\s+hm-shed/);
    expect(cssCode, 'a dock custom property survived the removal').not.toMatch(/--hm-dock-/);
    expect(cssCode, 'nothing on this page is sticky any more').not.toMatch(/position:\s*sticky/);
  });

  it('the served document is one screen — no Act 2 renders', () => {
    expect(html, 'Act 1 is not in the document at all').toMatch(/<div class="hm-a">/);

    for (const [what, pattern] of [
      ['the Act-2 root', /class="[^"]*\bhm-b\b[^"]*"/],
      ['the work band', /class="[^"]*\bhm-work\b[^"]*"/],
      ['the résumé band', /class="[^"]*\bhm-resume\b[^"]*"/],
      ['the project grid', /class="[^"]*\bhm-grid\b[^"]*"/],
      ['a project card', /class="[^"]*\bhm-card\b[^"]*"/],
      ['the band CTAs', /class="[^"]*\bhm-more\b[^"]*"/],
    ] as const) {
      expect(html, `${what} is back in the document — Home is one screen`).not.toMatch(pattern);
    }

    const a = /\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode);
    expect(a, 'no .hm-a rule at all').not.toBeNull();
    expect(
      (a as RegExpExecArray)[1],
      'Act 1 computes a height again. It fills the shell instead — see the block docstring.'
    ).toMatch(/flex:\s*1/);
  });

  it('no scroll-snap declaration survives anywhere on this page', () => {
    expect(cssCode).not.toMatch(/scroll-snap-/);
    expect(cssCode).not.toMatch(/--hm-sticky-nav/);
    expect(cssCode, 'Act 1 has no flex basis — the anchor for this check is gone').toMatch(
      /\.hm-a\s*\{[\s\S]*?flex:\s*1/
    );
    expect(cssCode.replace(/\s/g, '').length).toBeGreaterThan(500);
  });

  it('--hm-above has no reader left — nothing derives a height from the row above Act 1', () => {
    expect(
      [...cssCode.matchAll(/var\(--hm-above\)/g)].length,
      'something reads --hm-above again. The only thing it can be used for is a height derived ' +
        'from the row above Act 1, and that is the arithmetic which overflowed by the footer.'
    ).toBe(0);
    expect(cssCode).not.toMatch(/scroll-margin-top:\s*var\(--hm-above\)/);
    expect(
      cssCode,
      'home.css does not mention --hm-above at all — read the file, not this test'
    ).toMatch(/--hm-above\s*:/);
  });

  it('every motion declaration sits inside prefers-reduced-motion: no-preference', () => {
    const blocks = [
      ...cssCode.matchAll(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g),
    ];
    expect(
      blocks.length,
      'expected two no-preference blocks: the toggle glyph fade (§1) and the tile hover + cue ' +
        'nudge (§7). A count, not a floor — a third is a motion source nobody argued for.'
    ).toBe(2);

    const bodyOf = (m: RegExpMatchArray): { inside: string; end: number } => {
      const start = (m.index ?? 0) + m[0].length;
      let depth = 1;
      let i = start;
      while (i < cssCode.length && depth > 0) {
        if (cssCode[i] === '{') depth++;
        else if (cssCode[i] === '}') depth--;
        i++;
      }
      return { inside: cssCode.slice(start, i - 1), end: i };
    };

    const parts = blocks.map(bodyOf);
    const inside = parts.map((p) => p.inside).join('\n');

    let outside = cssCode;
    for (let k = blocks.length - 1; k >= 0; k--) {
      outside = outside.slice(0, blocks[k].index ?? 0) + outside.slice(parts[k].end);
    }
    outside = outside.replace(/@[a-z-]+[^{;]*/gi, '');

    expect(inside).toMatch(/transition-duration/);
    expect(inside).toMatch(/transform:\s*scale/);
    expect(inside, 'the photographs stopped responding to hover').toMatch(
      /\.hm-tile:hover img\s*\{[^}]*transform:\s*scale/
    );
    expect(html, 'no theme toggle in the document').toMatch(/class="ds-atom-iconbtn pub-toggle"/);
    expect(html, 'no peek tiles in the document').toMatch(/class="hm-tile"/);

    expect(
      outside,
      'a transform, transition, animation or sticky escaped the motion query — a reader who asked ' +
        'for less motion would get it anyway, and every other test here would still be green'
    ).not.toMatch(/transform:|transition-|animation-|position:\s*sticky/);
  });

  it('the hover transition carries no literal duration or easing', () => {
    expect(cssCode).toMatch(/transition-duration:\s*var\(--dur-\d\)/);
    expect(cssCode).toMatch(/transition-timing-function:\s*var\(--ease-[a-z-]+\)/);
    expect(cssCode, 'the transition shorthand cannot be written token-only').not.toMatch(
      /\btransition:\s/
    );
  });

  it('does not write :global() into a plain stylesheet', () => {
    expect(cssCode).not.toMatch(/:global\(/);
    expect(cssCode).toMatch(/\.hm-a\s*\{/);
  });
});

describe('Act 1 is the approved design, and its measures come from the ladder', () => {
  it('Act 1 is ONE column capped at ACT_ONE_MAX, written as min(cap, 100%)', () => {
    expect(
      cssCode,
      '`.hm-stage` is back. Act 1 is one column in the approved design, and a nested one breaks ' +
        "the <h1>'s sticky containing block — see home.css §4."
    ).not.toMatch(/\.hm-stage/);

    const rule = /\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode);
    expect(rule, 'no .hm-a rule — Act 1 has no column').not.toBeNull();
    const body = (rule as RegExpExecArray)[1] as string;
    expect(body).toContain(`min(${ACT_ONE_MAX}px, 100%)`);
    expect(body).toMatch(/max-width:\s*min\(\d+px,\s*100%\)/);
    expect(body).toMatch(/margin-inline:\s*auto/);
    expect(body).toMatch(/align-items:\s*center/);
    expect(body).toMatch(/text-align:\s*center/);
  });

  it('state A centres its column on BOTH axes', () => {
    const body = (/\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode) as RegExpExecArray)[1] as string;
    expect(body, 'the vertical centring — the dead band above the fold is the complaint').toMatch(
      /justify-content:\s*center/
    );
    expect(body).toMatch(/align-items:\s*center/);
  });

  it('nothing resolves against a container query any more — the dock was its only reader', () => {
    expect(
      [...cssCode.matchAll(/\d+cq[wibhm]/g)].map((m) => m[0]),
      'a container-query unit is back. The dock was removed on 2026-09-02 ("remove the motion in ' +
        'heading text"); re-adding one means re-adding the interaction, which is a decision.'
    ).toEqual([]);
    const body = (/\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode) as RegExpExecArray)[1] as string;
    expect(
      body,
      'container-type has gone from .hm-a too — then this test has nothing left to say and should ' +
        'be deleted along with the note about layout containment above'
    ).toMatch(/container-type:\s*inline-size/);
  });

  it('the display roles ship the chosen sizes, in the brand serif', () => {
    const heading = (cls: string) => {
      const m = new RegExp(`<[a-z0-9]+ [^>]*\\b${cls}\\b[^>]*>`).exec(html);
      expect(m, `no element carrying .${cls} in the served page`).not.toBeNull();
      return (m as RegExpExecArray)[0];
    };

    for (const cls of ['hm-name', 'hm-subtitle']) {
      expect(heading(cls), `${cls} is not set in the display face`).toContain(
        'font-family:var(--display)'
      );
    }
    expect(heading('hm-subtitle'), 'the subtitle size moved').toContain('font-size:18px');

    if (homeRecord.intro.length === 0) {
      expect(
        html,
        'the tagline ships while home_config.intro is empty — an empty <p> still takes its ' +
          'padding-block-start, so the gap under the subtitle is wrong with nothing to explain it'
      ).not.toMatch(/class="[^"]*\bhm-intro\b[^"]*"/);
    } else {
      expect(heading('hm-intro'), 'the restored tagline is not in the display face').toContain(
        'font-family:var(--display)'
      );
      expect(heading('hm-intro'), 'the tagline size moved').toContain('font-size:16px');
    }

    expect(heading('hm-name'), 'the name stopped reading --hm-name').toContain(
      'font-size:var(--hm-name)'
    );
    expect(heading('hm-name'), 'the name stopped carrying data-weight').toMatch(
      /data-weight="regular"/
    );
    expect(
      heading('hm-name'),
      'the name inlines a font-weight again, which no stylesheet can correct'
    ).not.toMatch(/font-weight:/);
    const nameRungs = [...cssCode.matchAll(/--hm-name:\s*var\((--text-[a-z0-9]+)\)/g)].map(
      (m) => m[1] as string
    );
    expect(
      nameRungs,
      'the name jumped a rung. Akhil chose these on 2026-08-30 after comparing nine pairings: ' +
        '--text-2xl below the 673px rung, --text-3xl above it. 3xl/4xl was the first pass and ' +
        '5xl is the prototype 60px, which he rejected.'
    ).toEqual(['--text-2xl', '--text-4xl']);

    process.stdout.write(
      `  type: name var(--hm-name) = ${nameRungs.join(' -> ')}/700 · subtitle 18 · tagline ${
        homeRecord.intro.length === 0 ? 'not rendered (record empty)' : '16'
      } · all var(--display)\n`
    );
  });

  it('the peek grid rounds and clips itself, and no tile carries a radius of its own', () => {
    const grid = (/\.hm-peek-grid\s*\{([^}]*)\}/.exec(cssCode) as RegExpExecArray)?.[1] as string;
    expect(grid, 'no .hm-peek-grid rule').toBeTruthy();
    expect(grid, 'the container lost its radius — four rounded corners, not none').toMatch(
      /border-radius:\s*var\(--radius-md\)/
    );
    expect(grid, 'the container must clip, or the tiles square off its corners').toMatch(
      /overflow:\s*hidden/
    );
    expect(grid, 'the gap must be PEEK_GAP, from the ladder').toContain(`var(${PEEK_GAP.token})`);

    const tile = (/\.hm-tile\s*\{([^}]*)\}/.exec(cssCode) as RegExpExecArray)?.[1] as string;
    expect(tile, 'no .hm-tile rule').toBeTruthy();
    expect(
      tile,
      'a tile regained a radius — that is twenty-four rounded corners, not four'
    ).not.toMatch(/border-radius:/);
    expect(tile).toMatch(/overflow:\s*hidden/);
  });

  it('no ring is drawn around the photo grid', () => {
    expect(cssCode).not.toMatch(/\.hm-peek-grid\s*\{[^}]*box-shadow/);
    expect(cssCode).not.toMatch(/\.dark\s+\.hm-peek-grid/);
  });

  it('the sizes attribute is composed from the SAME gap and cap the stylesheet uses', () => {
    const sizes =
      /<img[^>]*class="[^"]*"?[^>]*sizes="([^"]*)"/.exec(html) ??
      /<img[^>]*\ssizes="([^"]*)"/.exec(html);
    expect(sizes, 'no sizes attribute on the page at all').not.toBeNull();
    const value = (sizes as RegExpExecArray)[1] as string;
    expect(value, 'the widest clause must cap at ACT_ONE_MAX, not at PAGE_MAX.home').toContain(
      `min(100vw, ${ACT_ONE_MAX}px)`
    );
    expect(value, 'the gap term must be PEEK_GAP').toContain(`${2 * PEEK_GAP.px}px) / 3`);
  });

  it('ships no ALL n → badge, and no hardcoded count in its place', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../data/portfolio_images.json', import.meta.url), 'utf8')
    ) as unknown[];
    expect(manifest.length, 'the manifest is empty, so the claim below is vacuous').toBeGreaterThan(
      0
    );
    expect(html, 'the ALL n → badge is back').not.toContain('hm-peek-all');
    expect(html, 'a hardcoded photograph count reached Home').not.toContain(
      `ALL ${manifest.length}`
    );

    expect((html.match(/<a class="hm-peek-all"/g) ?? []).length).toBe(0);
  });

  it('renders exactly the CTAs data/home_config.json declares — none, today', () => {
    const home = JSON.parse(
      readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
    ) as { ctas: ReadonlyArray<{ text: string; link: string }> };

    expect(html, 'Act 1 is not in the document — this is not the page under test').toMatch(
      /<div class="hm-a">/
    );

    const rendered = [...html.matchAll(/<a[^>]*class="ds-atom-btn hm-cta"[^>]*>([\s\S]*?)<\/a>/g)];
    expect(rendered.length, 'the CTA row does not match the record').toBe(home.ctas.length);

    if (home.ctas.length === 0) {
      expect(
        html,
        'an empty .hm-ctas container still ships — it takes its gap and margins'
      ).not.toMatch(/class="hm-ctas"/);
      return;
    }

    for (const [i, cta] of home.ctas.entries()) {
      const markup = (rendered[i] as RegExpMatchArray)[0] as string;
      expect((rendered[i] as RegExpMatchArray)[1]?.replace(/<[^>]*>/g, '').trim()).toBe(cta.text);
      expect(markup).toContain(`href="${cta.link}"`);
      const variant = /data-variant="([^"]*)"/.exec(markup)?.[1];
      expect(['primary', 'secondary'], `hm-cta shipped variant="${variant}"`).toContain(variant);
      expect(markup, 'a literal colour reached the page through a variant').not.toMatch(
        /rgba\(0, 0, 0/
      );
    }
  });

  it('the identity lines ship in the display face, not the body face', () => {
    const lines = ['hm-subtitle', ...(homeRecord.intro.length > 0 ? ['hm-intro'] : [])];
    expect(lines.length, 'the list of identity lines came out empty').toBeGreaterThan(0);

    for (const cls of lines) {
      const el = new RegExp(`<p[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`).exec(html);
      expect(el, `no <p> carrying ${cls}`).not.toBeNull();
      const markup = (el as RegExpExecArray)[0] as string;
      expect(markup, `${cls} did not receive var(--display)`).toContain(
        'font-family:var(--display)'
      );
      expect(markup, `${cls} still ships the body face`).not.toContain('font-family:var(--font)');
    }

    if (homeRecord.intro.length === 0) {
      expect(html, 'hm-intro ships while the record holds no intro').not.toMatch(
        /class="[^"]*\bhm-intro\b[^"]*"/
      );
    }
  });

  it('no page-level font-family escape hatch survives on the identity lines', () => {
    const source = readFileSync('src/pages/index.astro', 'utf8');
    expect(
      source.replace(/\/\*[\s\S]*?\*\//g, ''),
      'the fontFamily escape hatch is back — use `Heading as="p"`, which is serif by construction'
    ).not.toMatch(/fontFamily:/);
  });
});

describe('Home ships no app bar (05-17)', () => {
  it('emits no AppBar on this route', () => {
    expect(
      html,
      'the design-system AppBar is back on Home. It paints a --surf-2 band with a hard bottom ' +
        'edge, which is the "header" the owner rejected on sight.'
    ).not.toMatch(/ds-atom-appbar/);

    expect(html, 'the plain row is not in the document — this is not the page under test').toMatch(
      /<div class="pub-nav-plain">/
    );
    expect(
      barRouteHtml,
      '/development lost its AppBar too — this is not a Home-only change'
    ).toMatch(/ds-atom-appbar/);
  });

  it('composes the row from the theme toggle alone — the doors are the navigation now', () => {
    expect(html, 'no plain row at all').toMatch(/<div class="pub-nav-plain">/);
    expect(
      html,
      'the plain row is a <nav> again — a navigation landmark holding only a theme toggle sends a ' +
        'screen-reader user somewhere with nothing in it'
    ).not.toMatch(/<nav class="pub-nav-plain"/);
    expect(html, 'no theme toggle in the row').toMatch(
      /<button[^>]*class="ds-atom-iconbtn pub-toggle"/
    );
    expect(html, 'the toggle is not the 42px `lg` rung the design asks for').toMatch(
      /class="ds-atom-iconbtn pub-toggle"[^>]*data-size="lg"/
    );

    expect(
      [...html.matchAll(/class="ds-atom-link pub-nav-link"/g)].length,
      "nav links are back in Home's top row. The doors under the photographs already go to both " +
        'of those destinations; this is the same two links twice, in a weaker treatment.'
    ).toBe(0);

    expect(NAV_ITEMS.length, 'NAV_ITEMS is empty — the nav was deleted, not omitted').toBe(2);
    expect(
      [...barRouteHtml.matchAll(/class="ds-atom-link pub-nav-link"/g)].length,
      "/development lost its nav links too. Emptying Home's row is a Home-only decision; if the " +
        'links have gone site-wide, that is a regression wearing this test as cover.'
    ).toBe(NAV_ITEMS.length);
  });

  it('Home ships no nav links, and the surviving arrangement uses the default variant', () => {
    expect(
      [...html.matchAll(/<a[^>]*class="ds-atom-link pub-nav-link"[^>]*>/g)].length,
      'a nav link is back on Home'
    ).toBe(0);

    const barLinks = [
      ...barRouteHtml.matchAll(/<a[^>]*class="ds-atom-link pub-nav-link"[^>]*>/g),
    ].map((m) => m[0] as string);
    expect(barLinks.length, 'the bar arrangement ships no nav links either').toBe(NAV_ITEMS.length);
    for (const markup of barLinks) {
      expect(/data-variant="([^"]*)"/.exec(markup)?.[1], `bar nav link shipped ${markup}`).toBe(
        'quiet'
      );
      expect(markup, 'a literal colour reached the nav through a Link variant').not.toMatch(
        /rgba\(0, 0, 0/
      );
    }
  });

  it('the nav-link hover rule keeps the specificity that made it apply, dead or not', () => {
    const rule = /\.pub-nav-plain \.pub-nav-link\[data-variant="quiet"\]:hover\s*\{([^}]*)\}/.exec(
      cssCode
    );
    expect(
      rule,
      'no (0,4,0) hover rule — a (0,3,0) selector TIES with the design system and loses on file ' +
        'order. If the nav-link rules were removed on purpose, remove this test in the same commit.'
    ).not.toBeNull();
    expect((rule as RegExpExecArray)[1], 'the hover no longer removes the underline').toMatch(
      /text-decoration:\s*none/
    );

    expect(
      html,
      'a .pub-nav-link is back in the document — then this rule is LIVE again and the note above ' +
        'is stale; update it rather than leaving two readings in the file'
    ).not.toMatch(/class="ds-atom-link pub-nav-link"/);
  });

  it('the nav links keep their coarse-pointer floor, dead or not', () => {
    expect(
      cssCode,
      'the nav links lost their coarse-pointer floor — 30 x 20 targets on a phone the moment the ' +
        'plain row carries links again. If the nav-link rules were removed on purpose, remove ' +
        'this test in the same commit.'
    ).toMatch(
      /@media \(pointer: coarse\)[\s\S]{0,320}\.pub-nav-plain \.pub-nav-link\s*\{[^}]*min-height:\s*44px/
    );
  });

  it('the toggle is a re-pointed IconButton reduced to its glyph', () => {
    const shellCode = readFileSync(
      new URL('../../src/styles/public-shell.css', import.meta.url),
      'utf8'
    ).replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = /\.pub-shell \.pub-toggle\s*\{([^}]*)\}/.exec(shellCode);
    expect(rule, 'no .pub-toggle rule').not.toBeNull();
    const body = (rule as RegExpExecArray)[1] as string;
    expect(body).toMatch(/border-radius:\s*var\(--radius-full\)/);
    expect(body, 'the border came back — the toggle is a glyph now').toMatch(
      /border-color:\s*transparent/
    );
    expect(body, 'the fill came back').toMatch(/background-color:\s*transparent/);
    expect(shellCode, 'the toggle glyph lost its resting recession').toMatch(
      /\.pub-shell \.pub-toggle\s*\{[^}]*color:\s*var\(--ink-3\)/
    );
    expect(shellCode, 'the toggle stopped answering hover').toMatch(
      /\.pub-shell \.pub-toggle:hover\s*\{[^}]*color:\s*var\(--ink\)/
    );
    expect(shellCode, "the toggle's colour transition is unguarded").toMatch(
      /@media \(prefers-reduced-motion: no-preference\)[\s\S]{0,400}\.pub-shell \.pub-toggle\s*\{[^}]*transition-property:\s*color/
    );

    expect(cssCode, 'the coarse-pointer touch floor is gone').toMatch(
      /@media \(pointer: coarse\)[\s\S]{0,240}min-height:\s*44px/
    );
    expect(
      body,
      "the toggle sets its own size — take the design system's `size` prop instead, which is " +
        'what `[data-size="lg"]` is for'
    ).not.toMatch(/width:|height:/);
  });
});

describe('nothing is hidden from assistive technology (§6.6.3)', () => {
  it('neither state is hidden in the stylesheet', () => {
    const hiding = [
      ...cssCode.matchAll(/([^{}]*)\{[^}]*(?:display:\s*none|visibility:\s*hidden)/g),
    ];
    for (const [, selector] of hiding) expect(selector).not.toMatch(/\.hm-[ab]\b/);
  });

  it('emits no positive tabindex and no order property', () => {
    expect(html).not.toMatch(/tabindex="[1-9]/);
    expect(cssCode).not.toMatch(/[^-]order:\s*-?\d/);
  });

  it('carries exactly one named landmark — the photographs', () => {
    const named = html.match(/<section[^>]*aria-label(?:ledby)?="/g) ?? [];
    expect(
      named.length,
      'the named-region count moved. Act 2 took two of the original three with it on 2026-09-02; ' +
        'a new one is a change to how this page announces itself.'
    ).toBe(1);
    expect(html, 'the photographs lost their accessible name').toMatch(
      /<section[^>]*aria-label="Photographs"/
    );

    for (const [what, pattern] of [
      ['the development band', /aria-labelledby="hm-work-h"/],
      ['the résumé band', /aria-labelledby="hm-resume-h"/],
    ] as const) {
      expect(html, `${what} is back — Home is one screen`).not.toMatch(pattern);
    }

    expect(
      html,
      'a <nav> landmark is back on Home. The row holds only the theme toggle, which is a control ' +
        'and not a destination.'
    ).not.toMatch(/<nav[\s>]/);
    expect(html, 'the plain row is not in the document at all').toMatch(
      /<div class="pub-nav-plain">/
    );
  });
});
