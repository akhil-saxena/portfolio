/**
 * Home — the static half. Plan 05-11, Task 3.
 *
 * This is an `integration` file (`*.node.test.ts`), so it runs in plain Node against the built
 * site served by real `workerd` — `astro preview` under `@astrojs/cloudflare` runs the build output
 * through `@cloudflare/vite-plugin`. That matters here more than usual: **the prerender runs inside
 * workerd, not Node**, so a green `unit` run over the same modules would say nothing about whether
 * `index.astro`'s frontmatter can execute where it actually executes. `import.meta.url` is
 * undefined there, `process.cwd()` is `/bundle`, and there is no filesystem.
 *
 * THE DYNAMIC HALF IS NOT HERE. The six-class departure audit and its two mutation controls belong
 * to plan 05-15 and are not duplicated: this file asserts what is true of the DOCUMENT, and
 * "state A fills the viewport" is a fact about a laid-out page in a browser. The two controls 05-15
 * owes are named in 05-11's SUMMARY so they cannot be lost between the plans.
 *
 * Several assertions read SOURCE files with `node:fs` rather than the response body, and each says
 * why at the point it does so. The rule: a claim about what SHIPPED is read off the artefact; a
 * claim about how a value was OBTAINED is read off the source, because an artefact can only show
 * the value and never the derivation.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { BREAKPOINTS } from '../../src/lib/layout-ladder';

const previewBaseUrl = inject('previewBaseUrl');

/** Fetched once per file; every assertion below reads the same served bytes. */
const response = await fetch(`${previewBaseUrl}/`);
const html = await response.text();

const HOME_CSS_PATH = 'src/styles/home.css';
const homeCss = readFileSync(HOME_CSS_PATH, 'utf8');

/**
 * Comment-stripped CSS. Every textual rule below counts over THIS, never over the raw file: this
 * stylesheet's header discusses `display: none`, `mandatory`, `:global()` and `aspect-ratio` in
 * prose, and a rule reading the raw text would be satisfied — or falsified — by a sentence.
 *
 * The stripper carries its own canary and anti-canary in the first test, because a stripper that
 * removed everything would make every rule below vacuously true.
 */
const cssCode = homeCss.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the check-instruments themselves', () => {
  it('the comment stripper removes prose and leaves code', () => {
    expect(cssCode.replace(/\s/g, '').length).toBeGreaterThan(0);
    // canary: a declaration inside a comment must not survive
    expect('/* display: none */\n.x{color:red}'.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(
      /display:\s*none/
    );
    // anti-canary: a real declaration must survive
    expect('.y{display:none}'.replace(/\/\*[\s\S]*?\*\//g, '')).toMatch(/display:\s*none/);
    // and the real file must still carry recognisable code after stripping
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

describe('the scroll prompt is a real anchor with a real target (§6.1, §13.2)', () => {
  it('is <a href="#work"> carrying the contract copy verbatim', () => {
    expect(html).toMatch(/<a[^>]*href="#work"[^>]*>SCROLL FOR THE WORK ↓<\/a>/);
  });

  it('is not a button, a chevron or a div calling scrollIntoView', () => {
    expect(html).not.toMatch(/scrollIntoView/);
    expect(html).not.toMatch(/<button[^>]*class="[^"]*hm-prompt/);
  });

  it('the #work id exists on an element in the document', () => {
    expect(html).toMatch(/<[a-z]+[^>]*\sid="work"/);
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
  /**
   * A media query cannot contain a `var()`, so `home.css`'s breakpoints are literals. They are not
   * ALLOWED to be arbitrary literals: every one must be a rung the ladder already declares, so the
   * page and the shell can never disagree about which class they are in. This is the same shape as
   * `scripts/assert-gutter-ladder.mjs`, one level up — that gate compares the built stylesheet's
   * gutter VALUES against the ladder; this one compares this page's breakpoint CHOICES.
   */
  it('every min-width in home.css is one of BREAKPOINTS', () => {
    const widths = [...cssCode.matchAll(/\(min-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) expect(BREAKPOINTS).toContain(width);
  });

  it('the peek column count steps at a rung the ladder declares', () => {
    expect(cssCode).toMatch(/@media\s*\(min-width:\s*673px\)\s*\{\s*\.hm-peek-grid/);
    expect(BREAKPOINTS).toContain(673);
  });

  /**
   * The height rung. §6.3: tile aspect steps on a HEIGHT rung at 800px, which is not an
   * aspect-ratio branch — it is a query on the axis the budget is denominated in.
   */
  it('the tile aspect steps on a height rung at 800px', () => {
    expect(cssCode).toMatch(/@media\s*\(min-height:\s*800px\)/);
  });

  /**
   * §6.1: the mechanism is aspect-ratio-INDEPENDENT, which is the whole answer to the near-square
   * foldable at ~1.1. Any layout decision that branches on aspect ratio flips mid-gesture there.
   * `aspect-ratio` as a PROPERTY on a tile is fine and is how the box is reserved; `aspect-ratio`
   * inside a media CONDITION is not.
   */
  it('nothing branches on aspect ratio', () => {
    const conditions = [...cssCode.matchAll(/@media([^{]*)\{/g)].map((m) => m[1]);
    expect(conditions.length).toBeGreaterThan(0);
    for (const condition of conditions) expect(condition).not.toMatch(/aspect-ratio/);
    // and the property is used, so this test is not passing on an empty stylesheet
    expect(cssCode).toMatch(/aspect-ratio:\s*\d+\s*\/\s*\d+/);
  });
});

describe('the height budget and the snap rules (§6.2, §6.5, PUB-13)', () => {
  it('uses svh, and never vh or dvh', () => {
    expect(cssCode).toMatch(/100svh/);
    expect(cssCode).not.toMatch(/\d+dvh/);
    expect(cssCode).not.toMatch(/(?<![sd])\d+vh\b/);
  });

  it('states A and B use min-height, never height', () => {
    const stateRules = [...cssCode.matchAll(/\.hm-[ab]\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(stateRules.length).toBeGreaterThanOrEqual(2);
    for (const rule of stateRules) expect(rule).not.toMatch(/(?<!min-)height:/);
  });

  it('scroll-snap-type exists, is proximity, and never mandatory', () => {
    expect(cssCode).toMatch(/scroll-snap-type:\s*y\s+proximity/);
    expect(cssCode).not.toMatch(/scroll-snap-type:\s*[xy]\s+mandatory/);
  });

  /**
   * The whole point of §6.5, and the reason this is a structural read rather than a grep for the
   * declaration: snap converts a small user gesture into a large involuntary viewport translation.
   * The assertion is that the declaration sits INSIDE the `no-preference` block, not merely that
   * both strings appear in the file.
   */
  it('every snap declaration sits inside prefers-reduced-motion: no-preference', () => {
    const blocks = [
      ...cssCode.matchAll(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g),
    ];
    expect(blocks.length).toBe(1);
    const start = (blocks[0].index ?? 0) + blocks[0][0].length;
    // walk to the matching brace
    let depth = 1;
    let i = start;
    while (i < cssCode.length && depth > 0) {
      if (cssCode[i] === '{') depth++;
      else if (cssCode[i] === '}') depth--;
      i++;
    }
    const inside = cssCode.slice(start, i - 1);
    const outside = cssCode.slice(0, blocks[0].index ?? 0) + cssCode.slice(i);

    expect(inside).toMatch(/scroll-snap-type/);
    expect(inside).toMatch(/scroll-snap-align/);
    expect(outside).not.toMatch(/scroll-snap-/);
  });

  /**
   * 🔴 STATE A HAS NO SNAP POINT, AND THIS TEST ASSERTED THE OPPOSITE UNTIL IT DID.
   *
   * `.hm-a` carried `scroll-snap-align: start` with `scroll-margin-top: var(--hm-above)` — 116px of
   * outset meant to clamp state A's snap position to scroll offset 0. MEASURED by 05-15's audit and
   * re-measured on this machine 8 loads per class per motion setting: it did not hold. The page
   * scrolled ITSELF 8–20px at first paint on 15 of 48 loads under `no-preference` and 0 of 48 under
   * `reduce`, which is the setting that removes snap.
   *
   * Akhil's decision was to drop state A's snap point and keep `#work`'s — the one that makes Act 2
   * land. After the change: 0 of 48 in BOTH motion settings, with `fills` and `departs` still 6/6.
   *
   * ASSERTED AS AN ABSENCE, WHICH NEEDS THE SELECTORS PARSED RATHER THAN GREPPED. A plain
   * `not.toMatch(/scroll-snap-align/)` over the file would be FALSE — `#work` still carries one,
   * and must. A plain search for `.hm-a` in a selector would be too WIDE — `html:has(.hm-a) #work`
   * mentions state A and targets Act 2. So the rules are parsed and the ones that TARGET `.hm-a`
   * are the ones checked.
   */
  it('state A has NO snap point, and #work carries the only one on the page', () => {
    const rules = [...cssCode.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      selector: (m[1] as string).replace(/\s+/g, ' ').trim(),
      body: m[2] as string,
    }));
    // ANTI-VACUITY: a parser that matched nothing would make every loop below pass.
    expect(rules.length, 'the rule parser found no CSS rules at all').toBeGreaterThan(10);

    /** Rules whose SUBJECT is `.hm-a` — the last compound selector, not a mention anywhere in it. */
    const targetsA = rules.filter((rule) =>
      rule.selector.split(',').some((part) => /(^|[\s>+~])\.hm-a$/.test(part.trim()))
    );
    /*
     * ANTI-VACUITY, AND IT IS A FLOOR RATHER THAN AN EQUALITY ON PURPOSE.
     *
     * The first draft asserted `=== 1` here, and the plant that put state A's snap point back made
     * it fail with the message "no rule targets .hm-a at all" while TWO rules targeted it. A
     * misreported failure is the same defect class as an unmeasured pass, so the two claims are now
     * separate: this one says the loop below is not iterating an empty set, and the loop itself
     * names the offending selector. A later layout rule on `.hm-a` is legitimate; a `scroll-`
     * declaration on it is not, and that is the claim worth pinning.
     */
    expect(
      targetsA.length,
      'no rule targets .hm-a at all — the parser or the stylesheet changed, and the loop below ' +
        'would then assert nothing'
    ).toBeGreaterThan(0);
    for (const rule of targetsA) {
      expect(
        rule.body,
        `"${rule.selector}" still carries a scroll- declaration; state A must have no snap point`
      ).not.toMatch(/scroll-/);
    }

    /** The snap point that STAYS, and the outset the shell owns rather than this page. */
    const workRules = rules.filter((rule) => rule.selector.endsWith('#work'));
    expect(workRules.length, 'exactly one rule targets #work').toBe(1);
    expect((workRules[0] as { body: string }).body).toMatch(/scroll-snap-align:\s*start/);
    expect((workRules[0] as { body: string }).body).toMatch(
      /scroll-margin-top:\s*var\(--hm-sticky-nav\)/
    );
    expect(cssCode).toMatch(/--hm-sticky-nav:\s*0px/);

    // `--hm-above` keeps its FIRST job — the height budget's subtrahend (§6.2) — and loses only its
    // second. Both halves are asserted, because deleting the property outright would break §6.2
    // silently and a test that only checked the absence would have called that a pass.
    expect(cssCode).toMatch(/min-height:\s*calc\(100svh\s*-\s*var\(--hm-above\)\)/);
    expect(cssCode).not.toMatch(/scroll-margin-top:\s*var\(--hm-above\)/);
  });

  /**
   * `:global()` is Astro `<style>` syntax. In a plain imported stylesheet it is an unknown
   * pseudo-class, which invalidates the whole selector and DROPS the rule — the exact defect §6.5
   * warns about, arriving through the fix for it. The computed-style read that proves `#work`
   * really resolves `scroll-snap-align: start` is a browser measurement, recorded in the SUMMARY.
   */
  it('does not write :global() into a plain stylesheet', () => {
    // Over the COMMENT-STRIPPED source, and this one bit on its first run: the header explains
    // why `:global()` must not be written here, so a rule reading the raw file was falsified by
    // the sentence recording the reason. That is the same shape as the plan's own
    // `grep -rn StackProof` — a rule matching a word rather than a construct.
    expect(cssCode).not.toMatch(/:global\(/);
    // anti-vacuity: the stripper did not simply delete the file
    expect(cssCode).toMatch(/scroll-snap-align/);
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

  it('carries exactly three named landmarks', () => {
    const named = html.match(/<section[^>]*aria-label(?:ledby)?="/g) ?? [];
    expect(named.length).toBe(3);
    expect(html).toMatch(/<section[^>]*aria-label="Photographs"/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="hm-work-h"/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="hm-resume-h"/);
  });
});
