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
import { ACT_ONE_MAX, BREAKPOINTS, PEEK_GAP } from '../../src/lib/layout-ladder';

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

describe('the height budget and the Act-2 reveal (§6.2, §6.5, PUB-13)', () => {
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

  /**
   * 🔴 `box-sizing: border-box` ON STATE A IS LOAD-BEARING, AND ITS ABSENCE WAS A MEASURED DEFECT.
   *
   * The design system ships no `*` reset, so the initial `content-box` applies and state A's
   * `padding-block-end` ADDED to its `min-height`. MEASURED in Chromium on the built artefact
   * before the fix: state A painted the budget plus exactly `--space-6` at all six classes — 790
   * against a 766 budget at 344 × 882 — which put Act 2's document offset 24px below one viewport
   * at every class and left a 19px strip of state A on screen after a full-viewport scroll.
   *
   * It was invisible because the strip happened to be state A's own bottom padding. Asserted here
   * rather than left to the browser audit, because the browser audit is not in CI and this is.
   */
  it('state A is border-box, so its padding comes OUT of the budget rather than adding to it', () => {
    const a = /\.hm-a\s*\{([^}]*)\}/.exec(cssCode);
    expect(a, 'no .hm-a rule at all').not.toBeNull();
    const body = (a as RegExpExecArray)[1] as string;
    expect(body).toMatch(/box-sizing:\s*border-box/);
    expect(body).toMatch(/min-height:\s*calc\(100svh\s*-\s*var\(--hm-above\)\)/);

    /*
     * THE PADDING THAT CAUSED IT IS GONE, AND THAT IS ASSERTED TOO. State A is a centring
     * container with one child, so its own padding bought no visual air and cost 24px of budget at
     * the one class that had none (390 x 844 coarse: a stage of 738 in a 731 budget). Its painted
     * height now equals its budget at all six classes.
     *
     * `box-sizing` stays with nothing to absorb, on purpose: it is what keeps `min-height` meaning
     * "exactly one budget tall" for any padding or border added later. This plan measured that
     * going wrong once; the declaration is the guard against measuring it again, and this
     * assertion is what stops the guard being deleted as unused.
     */
    expect(
      body,
      'state A has padding again — the budget is no longer what min-height says'
    ).not.toMatch(/padding/);
  });

  /**
   * ================================================================================================
   * THE MECHANISM IS A STICKY ACT 1, AND SNAP IS GONE — 05-16, ON A MEASUREMENT
   * ================================================================================================
   *
   * Two candidates were built and measured on the built artefact in Chromium at all six device
   * classes in both motion settings. The deciding quantity is the CONTINUITY of the reveal: the
   * page is scrolled to 0, ¼, ½, ¾ and 1 viewport and the fraction of the viewport occupied by
   * Act 2 is recorded. A continuous reveal steps 25 points per quarter.
   *
   *     snap,   no-preference    1%  26%  51% 100% 100%    worst step 49   6 of 6 classes
   *     snap,   reduce           1%  26%  51%  76% 100%    worst step 25   6 of 6 classes
   *     sticky, no-preference    1%  26%  51%  76% 100%    worst step 25   6 of 6 classes
   *     sticky, reduce           1%  26%  51%  76% 100%    worst step 25   6 of 6 classes
   *
   * Snap skipped the second half of the transition — a 239px involuntary pull, 27% of the viewport
   * — and did so ONLY under `no-preference`, because snap correctly lives inside that query. The
   * default path was the one that jumped and the accessible path was already smooth. Sticky is
   * linear everywhere and makes the two settings identical.
   *
   * The full run, and the occlusion measurement that replaces the geometric `departs`, are in
   * `test/audit/six-class.spec.ts` and in `src/styles/home.css` §5.
   */
  it('state A is sticky at the top, so Act 2 scrolls OVER it rather than after it', () => {
    const rules = [...cssCode.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      selector: (m[1] as string).replace(/\s+/g, ' ').trim(),
      body: m[2] as string,
    }));
    expect(rules.length, 'the rule parser found no CSS rules at all').toBeGreaterThan(10);

    /** Rules whose SUBJECT is `.hm-a` — the last compound selector, not a mention anywhere in it. */
    const targetsA = rules.filter((rule) =>
      rule.selector.split(',').some((part) => /(^|[\s>+~])\.hm-a$/.test(part.trim()))
    );
    expect(targetsA.length, 'no rule targets .hm-a at all').toBeGreaterThan(0);

    const sticky = targetsA.filter((r) => /position:\s*sticky/.test(r.body));
    expect(sticky.length, '.hm-a carries no `position: sticky` — the reveal has no mechanism').toBe(
      1
    );
    expect(
      (sticky[0] as { body: string }).body,
      '`position: sticky` without an inset never sticks: the element resolves `top: auto` and ' +
        'behaves exactly like `position: relative`, which is the silent version of this failure'
    ).toMatch(/top:\s*0/);
  });

  /**
   * The occlusion proof depends on Act 2 being OPAQUE and painted ABOVE the stuck Act 1. Without
   * `position` there is no stacking context for `z-index` to act in, and without the background
   * the photographs show through the work band at every scroll offset. All three are asserted,
   * because "the transition looks right" is carried by them and by nothing else.
   *
   * The background is asserted as a TOKEN and not as a value: `var(--cream)` is the same page
   * surface `public-shell.css` puts on `<body>`, so Act 2 stays indistinguishable from the page in
   * both themes and after the next design-system release. A literal here would be an origination
   * `gate:app-css` would refuse, and a DIFFERENT token would be a visible seam.
   */
  it('Act 2 is opaque and stacked above state A, which is what makes the reveal a reveal', () => {
    const rules = [...cssCode.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((m) => ({
        selector: (m[1] as string).replace(/\s+/g, ' ').trim(),
        body: m[2] as string,
      }))
      .filter((rule) =>
        rule.selector.split(',').some((part) => /(^|[\s>+~])\.hm-b$/.test(part.trim()))
      );
    expect(rules.length, 'no rule targets .hm-b at all').toBeGreaterThan(0);

    const all = rules.map((r) => r.body).join('\n');
    expect(all, 'Act 2 is not positioned, so its z-index does nothing').toMatch(
      /position:\s*relative/
    );
    expect(all, 'Act 2 is not stacked above state A').toMatch(/z-index:\s*[1-9]/);
    expect(all, 'Act 2 is transparent — the stuck state A would show through it').toMatch(
      /background-color:\s*var\(--cream\)/
    );
    expect(all, 'Act 2 must still be a full viewport tall — it is the covering panel').toMatch(
      /min-height:\s*100svh/
    );
  });

  /**
   * ASSERTED AS AN ABSENCE, ACROSS THE WHOLE STYLESHEET. Not "snap is configured differently" —
   * snap is GONE, and re-adding a snap point on `#work` on top of the sticky reveal would
   * reintroduce the 239px pull the sticky reveal was chosen to remove. The two are alternatives,
   * not layers, so this is a flat refusal rather than a shape check.
   *
   * `--hm-sticky-nav` goes with it: it was the snap outset for a nav that is `position: static` at
   * all six classes, and an outset with no snap point is a property nothing reads.
   */
  it('no scroll-snap declaration survives anywhere on this page', () => {
    expect(cssCode).not.toMatch(/scroll-snap-/);
    expect(cssCode).not.toMatch(/--hm-sticky-nav/);
    // ANTI-VACUITY: the stripper did not simply delete the file, and the sheet still has rules.
    expect(cssCode).toMatch(/position:\s*sticky/);
    expect(cssCode.replace(/\s/g, '').length).toBeGreaterThan(500);
  });

  /**
   * `--hm-above` keeps its FIRST job — the height budget's subtrahend (§1) — and lost its second
   * (a snap outset) in 05-15. Both halves are asserted, because deleting the property outright
   * would break §1 silently and a test that only checked the absence would have called that a pass.
   */
  it('--hm-above is still the budget’s subtrahend and is no longer a scroll outset', () => {
    expect(cssCode).toMatch(/min-height:\s*calc\(100svh\s*-\s*var\(--hm-above\)\)/);
    expect(cssCode).not.toMatch(/scroll-margin-top:\s*var\(--hm-above\)/);
  });

  /**
   * §12.2 / PUB-13, and this is the rule that is easy to get backwards. Every motion declaration
   * this page makes must sit INSIDE `no-preference`, so that the accessible path is the DEFAULT
   * and an animation added later that forgets the query is visible in review as a rule outside the
   * block — rather than the other way round, where the one that forgets to opt out ships.
   *
   * The page's only motion is now the peek tile's hover scale. `position: sticky` is deliberately
   * NOT in the block and must not be: it is layout, not animation, and it makes LESS translate
   * during a user-initiated scroll. Suppressing it under `reduce` would give a reader who asked
   * for less motion the variant in which MORE of the page moves.
   *
   * 🔴 THE HOVER CANNOT BE LEFT TO THE DESIGN SYSTEM'S OWN GUARD. MEASURED in the installed
   * package: `primitives.css`'s system-wide `prefers-reduced-motion: reduce` block is anchored to
   * `[class^="ds-"]` / `[class*=" ds-"]`, deliberately, so it cannot reach a consumer selector.
   * `.hm-tile img` is a consumer selector. Written outside the query this scale would animate
   * under `reduce` with every test still green.
   */
  it('every motion declaration sits inside prefers-reduced-motion: no-preference', () => {
    const blocks = [
      ...cssCode.matchAll(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g),
    ];
    expect(blocks.length).toBe(1);
    const start = (blocks[0].index ?? 0) + blocks[0][0].length;
    let depth = 1;
    let i = start;
    while (i < cssCode.length && depth > 0) {
      if (cssCode[i] === '{') depth++;
      else if (cssCode[i] === '}') depth--;
      i++;
    }
    const inside = cssCode.slice(start, i - 1);
    const outside = cssCode.slice(0, blocks[0].index ?? 0) + cssCode.slice(i);

    expect(inside).toMatch(/transition-duration/);
    expect(inside).toMatch(/transform:\s*scale/);
    expect(outside, 'a transform or transition escaped the motion query').not.toMatch(
      /transform:|transition-/
    );
    // and the mechanism is NOT in the query — see this test's docstring
    expect(outside).toMatch(/position:\s*sticky/);
  });

  /**
   * The transition is fully tokenised, which the `transition` SHORTHAND cannot be: its first term
   * is a property NAME, so `gate:app-css` reads the whole value as a motion-dimension origination
   * — that is precisely what DEBT-CARD-TRANSITION records on `/work`. Longhand is the only
   * spelling in which a consumer transition carries no literal at all.
   */
  it('the hover transition carries no literal duration or easing', () => {
    expect(cssCode).toMatch(/transition-duration:\s*var\(--dur-\d\)/);
    expect(cssCode).toMatch(/transition-timing-function:\s*var\(--ease-[a-z-]+\)/);
    expect(cssCode, 'the transition shorthand cannot be written token-only').not.toMatch(
      /\btransition:\s/
    );
  });

  /**
   * `:global()` is Astro `<style>` syntax. In a plain imported stylesheet it is an unknown
   * pseudo-class, which invalidates the whole selector and DROPS the rule — the exact defect §6.5
   * warns about, arriving through the fix for it. The computed-style read that proves `.hm-b`
   * really resolves `position: relative` from here is a browser measurement, in this plan's report.
   */
  it('does not write :global() into a plain stylesheet', () => {
    // Over the COMMENT-STRIPPED source, and this one bit on its first run: the header explains
    // why `:global()` must not be written here, so a rule reading the raw file was falsified by
    // the sentence recording the reason.
    expect(cssCode).not.toMatch(/:global\(/);
    // anti-vacuity: the stripper did not simply delete the file
    expect(cssCode).toMatch(/\.hm-b\s*\{/);
  });
});

/*
 * ══ THE ACT-1 COMPOSITION — 05-16, AND EVERY NUMBER HERE HAS A SOURCE ═══════════════════════════
 *
 * These assert the three values that make the approved composition what it is, each against the
 * TypeScript constant it comes from rather than against a literal typed twice. `assert-gutter-
 * ladder.mjs` does the same job for the gutter rungs and the page maxima one level up; `ACT_ONE_MAX`
 * and `PEEK_GAP` are deliberately NOT in `PAGE_MAX`/`MASONRY_GAP` (each says why at its
 * declaration), so they have no gate and are asserted here instead.
 */
describe('Act 1 is the legacy composition, and its measures come from the ladder', () => {
  it('the stage is capped at ACT_ONE_MAX, written as min(cap, 100%)', () => {
    const rule = /\.hm-stage\s*\{([^}]*)\}/.exec(cssCode);
    expect(rule, 'no .hm-stage rule — Act 1 has no column').not.toBeNull();
    const body = (rule as RegExpExecArray)[1] as string;
    expect(body).toContain(`min(${ACT_ONE_MAX}px, 100%)`);
    // the `100%` half is what keeps the column inside the shell below the cap — §2.2's rule
    expect(body).toMatch(/max-width:\s*min\(\d+px,\s*100%\)/);
    // and it is CENTRED, which is the whole complaint about what Phase 5 shipped
    expect(body).toMatch(/margin-inline:\s*auto/);
    expect(body).toMatch(/align-items:\s*center/);
    expect(body).toMatch(/text-align:\s*center/);
  });

  it('state A centres its column on BOTH axes, as .home-d did', () => {
    const body = (/\.hm-a\s*\{([^}]*)\}/.exec(cssCode) as RegExpExecArray)[1] as string;
    expect(body, 'the vertical centring — the dead band above the fold is the complaint').toMatch(
      /justify-content:\s*center/
    );
    expect(body).toMatch(/align-items:\s*center/);
  });

  /**
   * 🔴 THE DETAIL THAT CARRIES THE COMPOSITION. `.hd-gallery { border-radius: 10px; overflow:
   * hidden }` puts the radius and the clip on the CONTAINER, so the block's four outer corners are
   * rounded and its twenty interior ones are square — six photographs read as one object. Phase 5
   * put the radius on the TILE and shipped six separately-rounded cards.
   *
   * Asserted in BOTH directions, because only the absence half can catch the regression: a tile
   * that regains a radius re-draws the grid while the container still has one and every other
   * assertion in this file stays green.
   */
  it('the peek block rounds and clips on the CONTAINER, and the tile has no radius of its own', () => {
    const grid = (/\.hm-peek-grid\s*\{([^}]*)\}/.exec(cssCode) as RegExpExecArray)?.[1] as string;
    expect(grid, 'no .hm-peek-grid rule').toBeTruthy();
    expect(grid).toMatch(/border-radius:/);
    expect(grid).toMatch(/overflow:\s*hidden/);
    expect(grid, 'PEEK_GAP, not MASONRY_GAP — the flush block needs the tight gap').toContain(
      `var(${PEEK_GAP.token})`
    );

    const tile = (/\.hm-tile\s*\{([^}]*)\}/.exec(cssCode) as RegExpExecArray)?.[1] as string;
    expect(tile, 'no .hm-tile rule').toBeTruthy();
    expect(
      tile,
      'the tile has its own border-radius again — six rounded cards, not one flush block'
    ).not.toMatch(/border-radius:/);
    // the tile keeps its own clip, which the hover scale needs; that is not the same declaration
    expect(tile).toMatch(/overflow:\s*hidden/);
  });

  it('the sizes attribute is composed from the SAME gap and cap the stylesheet uses', () => {
    // The failure this closes has no visual symptom: a `sizes` string that disagrees with the
    // stylesheet downloads a different variant of all six photographs and nothing goes red.
    const sizes =
      /<img[^>]*class="[^"]*"?[^>]*sizes="([^"]*)"/.exec(html) ?? /sizes="([^"]*)"/.exec(html);
    expect(sizes, 'no sizes attribute on the page at all').not.toBeNull();
    const value = (sizes as RegExpExecArray)[1] as string;
    expect(value, 'the widest clause must cap at ACT_ONE_MAX, not at PAGE_MAX.home').toContain(
      `min(100vw, ${ACT_ONE_MAX}px)`
    );
    expect(value, 'the gap term must be PEEK_GAP').toContain(`${2 * PEEK_GAP.px}px) / 3`);
  });

  /**
   * The badge's figure is the MANIFEST's length and is never typed. `05-UI-SPEC.md` says 39, the
   * manifest holds 40, and a hardcoded photograph count turned `main` red in Phase 4 the moment a
   * real photograph landed. Read off the served bytes and compared with the file.
   */
  it('the ALL n → badge is a real link and n is derived from the manifest', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../data/portfolio_images.json', import.meta.url), 'utf8')
    ) as unknown[];
    expect(manifest.length, 'the manifest is empty, so the count below is vacuous').toBeGreaterThan(
      0
    );
    const badge = /<a class="hm-peek-all" href="\/photos">([\s\S]*?)<\/a>/.exec(html);
    expect(badge, 'no .hm-peek-all anchor — the badge is decoration or gone').not.toBeNull();
    expect((badge as RegExpExecArray)[1]).toBe(`ALL ${manifest.length} →`);

    /*
     * 🔴 EXACTLY ONE, AND IT COUNTS THE ANCHOR RATHER THAN THE CLASS NAME. A PLANT CAUGHT THIS.
     *
     * Written first as `html.match(/hm-peek-all/g).length === 1`, this line went red under an
     * unrelated plant (`transition: transform 0.4s ease` in place of the tokenised longhands) and
     * the reason is worth keeping: **Astro's `build.inlineStylesheets` default is `auto`, which
     * inlines a stylesheet under 4,096 bytes**, and MEASURED, the built Home chunk is
     * `dist/client/_astro/index.*.css` at **4,131 bytes — thirty-five over the threshold**. Any
     * edit that shortens the built CSS by 35 bytes moves the whole sheet into a `<style>` block in
     * the document, at which point every `.hm-peek-all` RULE is also in `html` and a class-name
     * count reads 2.
     *
     * That is a false alarm on correct code, in a file that would then have to be edited under
     * time pressure — the worst kind. Counting `<a class="hm-peek-all"` cannot be satisfied by a
     * stylesheet in either delivery. The 35-byte margin itself is recorded in `deferred-items.md`:
     * it is not this test's to fix, and it affects any artefact-side grep on this route.
     */
    expect((html.match(/<a class="hm-peek-all"/g) ?? []).length).toBe(1);
  });

  /**
   * The CTAs are `home_config.ctas` and nothing else. Asserted against the RECORD, never against a
   * literal — they are CMS content Akhil edits, so editing the record must move both sides.
   */
  it('renders every CTA in data/home_config.json, in order, as a design-system Link', () => {
    const home = JSON.parse(
      readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
    ) as { ctas: ReadonlyArray<{ text: string; link: string }> };
    expect(home.ctas.length, 'home_config.json declares no CTAs').toBeGreaterThan(0);

    const rendered = [...html.matchAll(/<a[^>]*class="ds-atom-link hm-cta"[^>]*>([\s\S]*?)<\/a>/g)];
    expect(rendered.length, 'the CTA row is not rendered from the record').toBe(home.ctas.length);
    for (const [i, cta] of home.ctas.entries()) {
      const markup = (rendered[i] as RegExpMatchArray)[0] as string;
      expect((rendered[i] as RegExpMatchArray)[1]?.replace(/<[^>]*>/g, '').trim()).toBe(cta.text);
      expect(markup).toContain(`href="${cta.link}"`);
    }
  });

  /**
   * D-4's consequence, pinned so it cannot be "improved" back. `inline`, `footer` and `action` set
   * `color` as an INLINE style and the latter two also inline
   * `textDecorationColor: rgba(0, 0, 0, 0.25)` — a literal colour, invisible on `#0d0d0f`, that no
   * app rule can beat at any specificity while every jsdom test still passes, because jsdom
   * implements no CSS specificity. Three consecutive Phase 1 plans hit this.
   */
  it('the CTAs use only the two stylesheet-only Link variants', () => {
    const rendered = [...html.matchAll(/<a[^>]*class="ds-atom-link hm-cta"[^>]*>/g)].map(
      (m) => m[0] as string
    );
    expect(rendered.length).toBeGreaterThan(0);
    for (const markup of rendered) {
      const variant = /data-variant="([^"]*)"/.exec(markup)?.[1];
      expect(['default', 'quiet'], `hm-cta shipped variant="${variant}"`).toContain(variant);
    }
    // Scoped to the ANCHOR's own tag, for the same reason the badge count is — a rule in an
    // inlined `<style>` block must not be able to satisfy or falsify a claim about markup.
    for (const markup of rendered) {
      expect(markup, 'a literal colour reached the page through a Link variant').not.toMatch(
        /rgba\(0, 0, 0/
      );
    }
  });

  /**
   * The serif voice. Both design sources put all three identity lines in Playfair; Phase 5 shipped
   * the intro as sans `--text-base`, which is the drift Akhil saw first. `Text` inlines
   * `fontFamily: var(--font)` and exposes no serif selector (D-22), so the family arrives through
   * the component's own `style` prop — asserted on the SERVED BYTES, because that is the only
   * place the inline style and the class can be seen to have resolved together.
   */
  it('the subtitle and the intro ship in the display face, not the body face', () => {
    for (const cls of ['hm-subtitle', 'hm-intro']) {
      const el = new RegExp(`<p[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`).exec(html);
      expect(el, `no <p> carrying ${cls}`).not.toBeNull();
      const markup = (el as RegExpExecArray)[0] as string;
      expect(markup, `${cls} did not receive var(--display)`).toContain(
        'font-family:var(--display)'
      );
      expect(markup, `${cls} still ships the body face`).not.toContain('font-family:var(--font)');
    }
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
