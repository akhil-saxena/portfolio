/**
 * Home — the static half. Plans 05-11, 05-16 and 05-17.
 *
 * ================================================================================================
 * 🔴 05-17 REWROTE MOST OF THIS FILE, AND THE REASON IS THAT IT WAS PINNING A REJECTED DESIGN
 * ================================================================================================
 *
 * Every assertion 05-16 wrote here passed on the page Akhil called *"rudimentary… like something
 * made by a ten year old"*. That is not a failure of the assertions — each was true, precisely, of
 * the thing it described. It is what a suite looks like when it pins an implementation nobody
 * checked against the design: the sticky reveal, the 800px column, the flush photo slab and the
 * `SCROLL FOR THE WORK ↓` cue were all asserted, and all four were wrong.
 *
 * So the pins below are re-derived from `design_handoff_portfolio/Akhil Saxena - Home.dc.html`,
 * MEASURED in Chromium at 1280x860, and the four that changed are marked `05-17` where they sit.
 * The ones that did NOT change — zero framework JS, the three landmarks, the derived `ALL n →`
 * count, the CMS-driven CTAs, no scroll-snap — are untouched, because they were about behaviour
 * rather than about a composition.
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

describe('the scroll cue is a real anchor with a real target (§6.1, §13.2)', () => {
  /**
   * 05-17: the string changed, and the change is the point rather than a detail.
   *
   *     was  `SCROLL FOR THE WORK ↓`   05-16's, kept over the handoff's on the argument that it
   *                                     "says what the control DOES rather than where it points"
   *     now  `↓ THE WORK`               the handoff's own wording, verbatim
   *
   * Akhil on the result of the first choice: *"The scroll for work should not be this apparent. It
   * should just be a small animation with an arrow showcasing that I need to scroll, not this."*
   *
   * The arrow LEADS. `THE WORK ↓` would be the same four characters in the wrong order — the
   * design puts the arrow first so the eye meets the direction before the destination — so the
   * assertion is an equality and not a `toContain`.
   */
  it('is <a href="#work"> carrying the design handoff copy verbatim', () => {
    expect(html).toMatch(/<a[^>]*href="#work"[^>]*>↓ THE WORK<\/a>/);
  });

  it('no longer ships the shouted string 05-16 pinned', () => {
    expect(html).not.toMatch(/SCROLL FOR THE WORK/);
  });

  it('is not underlined — the cue recedes, which is the whole complaint about the old one', () => {
    const rule = /\.hm-cue\s*\{([^}]*)\}/.exec(cssCode);
    expect(rule, 'no .hm-cue rule at all').not.toBeNull();
    expect((rule as RegExpExecArray)[1]).toMatch(/text-decoration:\s*none/);
  });

  it('is not a button, a chevron or a div calling scrollIntoView', () => {
    expect(html).not.toMatch(/scrollIntoView/);
    expect(html).not.toMatch(/<button[^>]*class="[^"]*hm-cue/);
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
     * THE PADDING IS BACK, DELIBERATELY, AND IT IS EXACTLY `--hm-above`.
     *
     * It was removed once for a good reason: state A's own padding bought no visual air and cost
     * 24px of budget at the one class that had none — 390 x 844 coarse, a stage of 738 in a 731
     * budget. That measurement was true of the page as it then was.
     *
     * Akhil, 2026-08-30: "it should occupy the center of the page, not the bottom." The content WAS
     * centred — 114px above and below — but centred inside this box, which starts `--hm-above`
     * down under the nav row. From the VIEWPORT that read 178 above and 114 below: a content centre
     * of 482 against a viewport centre of 450. A padding-bottom of `--hm-above` shortens the
     * centring box by exactly the offset above it, so the two midpoints coincide.
     *
     * RE-MEASURED at all six classes after the type and tile sizes came down: drift is 0 at every
     * one, and the cue stays above the fold at every one. At 390 x 844 COARSE — the class that had
     * no budget before — the stage is now 598 in a 780 budget, 115px of headroom, because the name,
     * the tiles and the CTA count all shrank. The old constraint was real and is no longer binding.
     *
     * Asserted as an EQUALITY against the token, not as an absence: arbitrary padding here would
     * still eat the budget silently, and `box-sizing: border-box` is what keeps `min-height`
     * meaning "exactly one budget tall" while this padding is inside it.
     */
    expect(body, 'state A lost the padding that centres it on the viewport').toMatch(
      /padding-bottom:\s*var\(--hm-above\)/
    );
    expect(
      body.replace(/padding-bottom:\s*var\(--hm-above\);?/, ''),
      'state A has padding beyond the one that centres it — that eats the budget silently'
    ).not.toMatch(/padding/);
    expect(body, 'box-sizing went with it — min-height stops meaning one budget').toMatch(
      /box-sizing:\s*border-box/
    );
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
  /**
   * 05-17 — THIS ASSERTION IS THE INVERSE OF THE ONE IT REPLACES, AND THAT IS DELIBERATE.
   *
   * 05-16 asserted `.hm-a` carried `position: sticky; top: 0` so that Act 2 scrolled OVER a pinned
   * Act 1, and asserted `.hm-b` was opaque and `z-index`-stacked to make the reveal read. Both
   * were true of the shipped page and both are now gone, for two reasons that are worth keeping:
   *
   *   1. THE READER ASKED FOR IT. *"I should be able to scroll in a single go from the first
   *      section to the second section."* With the reveal, Act 1 is pinned and Act 2 slides over
   *      it — one gesture moves the panel but never lands you anywhere.
   *   2. IT IS INCOMPATIBLE WITH THE DOCK. §4 of `home.css` docks the `<h1>` with its own
   *      `position: sticky`, and sticky resolves against the nearest SCROLLPORT — an element
   *      inside a sticky ancestor that never moves relative to the viewport can never trigger.
   *
   * What replaces it is arithmetic, asserted two tests below: Act 1 is `100svh - --hm-above` under
   * an `--hm-above`-tall row, so the two sum to exactly one viewport and one viewport of scroll
   * lands Act 2 flush at the top.
   */
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

  /**
   * 05-17 — the one element that IS sticky, and everything about how it is guarded.
   *
   * The dock is the page's headline interaction and it is also the thing most likely to be
   * "tidied" into something that breaks a requirement, so each half is asserted separately:
   * PUB-14 (no JavaScript), PUB-13 (inert under reduce) and the progressive-enhancement guard.
   */
  it('the <h1> docks with sticky + a scroll timeline, behind BOTH guards, with no JavaScript', () => {
    const supports = /@supports\s*\(animation-timeline:\s*scroll\(\)\)\s*\{/.exec(cssCode);
    expect(supports, 'the dock is not behind an @supports guard — no fallback path').not.toBeNull();

    // Walk to the matching close brace so "inside" is the real block and not a prefix.
    const start = (supports?.index ?? 0) + (supports?.[0]?.length ?? 0);
    let depth = 1;
    let i = start;
    while (i < cssCode.length && depth > 0) {
      if (cssCode[i] === '{') depth++;
      else if (cssCode[i] === '}') depth--;
      i++;
    }
    const inside = cssCode.slice(start, i - 1);
    const outside = cssCode.slice(0, supports?.index ?? 0) + cssCode.slice(i);

    expect(inside, 'the @supports block does not also gate on reduced motion').toMatch(
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)/
    );
    expect(inside).toMatch(/position:\s*sticky/);
    expect(inside).toMatch(/animation-timeline:\s*scroll\(root block\)/);
    expect(inside, 'the name never moves left, so it docks nowhere').toMatch(/50cqw/);

    expect(
      outside,
      'a sticky/animation declaration escaped the @supports + reduced-motion guard. A reader who ' +
        'asked for less motion would get the pinned name with nothing fading the photographs out ' +
        'from under it, which is worse than no dock at all.'
    ).not.toMatch(/position:\s*sticky|animation-timeline|animation-range/);

    // PUB-14: the whole interaction is CSS. No island, no listener, no inline handler on the page.
    expect(html).not.toMatch(/astro-island/);
    expect(html, 'a scroll listener appeared on a route that ships zero framework JS').not.toMatch(
      /addEventListener\(\s*['"]scroll/
    );
  });

  /**
   * 05-17 — "one gesture lands in Act 2, fully", asserted as the arithmetic that makes it true.
   *
   * MEASURED in Chromium at 1280x860 on the built artefact: `document.scrollHeight` 1833, Act 2's
   * top edge at y=860 when scrollY is 0 and at y=0 when scrollY is 860. Exactly one viewport.
   *
   * The stylesheet cannot be asked for that number, so what is asserted here is the two facts it
   * follows from — Act 1 is the viewport minus the row above it, and Act 2 is a full viewport — and
   * `05-AUDIT.md` owns the browser measurement. Two facts that agree today are a duplication; these
   * two are a derivation.
   */
  it('Act 1 + the row above it is exactly one viewport, and Act 2 is a full one', () => {
    const a = /\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode);
    expect(a, 'no .hm-a rule at all').not.toBeNull();
    expect((a as RegExpExecArray)[1]).toMatch(
      /min-height:\s*calc\(100svh\s*-\s*var\(--hm-above\)\)/
    );
    expect(
      (a as RegExpExecArray)[1],
      '--hm-above must be composed from the tokens the nav row is built from, not measured off it'
    ).toMatch(/--hm-above:\s*calc\(var\(--space-\d+\)\s*\+\s*var\(--space-\d+\)\)/);

    const b = /\.hm-b\s*\{([^}]*)\}/.exec(cssCode);
    expect(b, 'no .hm-b rule at all').not.toBeNull();
    expect(
      (b as RegExpExecArray)[1],
      'Act 2 is shorter than a viewport, so one gesture cannot land in it fully'
    ).toMatch(/min-height:\s*100svh/);
  });

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
   * 🔴 05-17 REVERSED THE `position: sticky` HALF OF THIS TEST, AND THE REVERSAL IS ARGUED.
   * 05-16 asserted that sticky was deliberately OUTSIDE the query, on the reasoning that it is
   * layout rather than animation and makes LESS translate during a scroll. That was correct about
   * the sticky it described — a whole act pinned so the next one could slide over it.
   *
   * It is not correct about this one. The `<h1>`'s sticky is one half of a two-part effect whose
   * other half is a scroll-driven fade; pinned WITHOUT the fade, the name sits at the top-left with
   * the photographs sliding underneath it and nothing removing them, which is a worse page than
   * either the docked version or the plain one. The two halves are therefore guarded together, and
   * the reduced-motion path is the prototype's composition scrolling normally — which is a real
   * design, not a degraded one.
   *
   * So there are now TWO `no-preference` blocks: §4's (inside `@supports`, the dock) and §7's (the
   * tile hover and the cue's breath). The count is asserted, because a THIRD one appearing is how
   * a motion declaration gets added somewhere nobody is looking.
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
    expect(
      blocks.length,
      'expected four no-preference blocks — the dock (§4), the hover + cue (§7), the toggle ' +
        "glyph's fade (§1) and the scroll cue's bob (§7a). A count, not a floor: a fifth is a " +
        'motion source nobody argued for, and this assertion is the argument.'
    ).toBe(4);

    /** Everything between a block's opening brace and its matching close. */
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

    // OUTSIDE = the sheet with both blocks cut out. Built back-to-front so the earlier block's
    // indices are still valid when the later one is removed.
    let outside = cssCode;
    for (let k = blocks.length - 1; k >= 0; k--) {
      outside = outside.slice(0, blocks[k].index ?? 0) + outside.slice(parts[k].end);
    }
    /*
     * AT-RULE PRELUDES ARE REMOVED BEFORE THE MATCH, AND THIS CAUGHT ITSELF ON ITS FIRST RUN.
     *
     * The dock lives inside `@supports (animation-timeline: scroll())`. That prelude is a FEATURE
     * TEST — it asks the browser a question and declares nothing — but it contains the substring
     * `animation-`, so the rule below flagged the guard that exists to make the animation safe.
     * A test that reds on correct code is as expensive as one that greens on broken code, and the
     * fault was in the instrument rather than in the stylesheet: this assertion is about
     * DECLARATIONS, so the preludes have to go before it looks.
     */
    outside = outside.replace(/@[a-z-]+[^{;]*/gi, '');

    expect(inside).toMatch(/transition-duration/);
    expect(inside).toMatch(/transform:\s*scale/);
    expect(inside, 'the dock is not inside a motion query').toMatch(/position:\s*sticky/);
    expect(inside, 'the cue does not breathe').toMatch(/animation-name:\s*hm-nudge/);

    expect(
      outside,
      'a transform, transition, animation or sticky escaped the motion query — a reader who asked ' +
        'for less motion would get it anyway, and every other test here would still be green'
    ).not.toMatch(/transform:|transition-|animation-|position:\s*sticky/);
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
   * warns about, arriving through the fix for it. The computed-style reads that prove these rules
   * really apply in a browser are in this plan's report.
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
describe('Act 1 is the approved design, and its measures come from the ladder', () => {
  /**
   * 05-17 — `.hm-stage` is GONE and the cap moved onto `.hm-a`.
   *
   * 05-16 split the act in two: `.hm-a` owned the viewport budget and an inner `.hm-stage` owned
   * an 800px centred column, taken from the legacy `.home-d`. The design has no such split —
   * MEASURED, the prototype's identity block and photo grid share ONE 1000px column — and the
   * split had a cost beyond the width: `position: sticky` on the `<h1>` resolves against its
   * nearest block container, so inside `.hm-stage` the name would unpin the moment the stage's
   * short box ran out, hundreds of pixels before Act 2 arrives.
   *
   * So one element carries the cap AND the budget, and `ACT_ONE_MAX` is 1000.
   */
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
    // the `100%` half is what keeps the column inside the shell below the cap — §2.2's rule
    expect(body).toMatch(/max-width:\s*min\(\d+px,\s*100%\)/);
    // and it is CENTRED, which is the whole complaint about what Phase 5 shipped
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

  /**
   * 05-17 — the containment context the dock measures itself against.
   *
   * `translateX(calc(50% - 50cqw))` is the whole X axis of the interaction, and `50cqw` silently
   * resolves against the VIEWPORT if no ancestor is a container — which would send the name off
   * the left edge of the screen instead of onto the photo column, with no error anywhere.
   */
  it('Act 1 is the container the dock resolves 50cqw against', () => {
    const body = (/\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode) as RegExpExecArray)[1] as string;
    expect(
      body,
      'no container-type on .hm-a — `50cqw` falls back to the viewport and the name docks off-screen'
    ).toMatch(/container-type:\s*inline-size/);
  });

  /**
   * AKHIL'S CALL, 2026-08-30 — THIS ASSERTION HAS NOW BEEN INVERTED TWICE. READ THE HISTORY BEFORE
   * INVERTING IT A THIRD TIME.
   *
   * 05-16 put the radius and the clip on the CONTAINER, read off the legacy
   * `.hd-gallery { border-radius: 10px; overflow: hidden }`. 05-17 moved them ONTO THE TILE, on the
   * measurement that the approved prototype rounds each of its six photographs at 8px with a 14px
   * gap, and argued the slab was what made the page read as a contact sheet.
   *
   * Akhil looked at both and asked for the slab, by name: "in legacy, the image grid only has 4
   * rounded corners, not all images have rounded corners. That's what I want in the new app too."
   *
   * So the container rounds and clips, `PEEK_GAP` is 8px, and no tile carries a radius. The
   * prototype's per-tile treatment is OVERRULED, not unmeasured — a measurement decides what IS, it
   * does not decide what he wants.
   *
   * Asserted in BOTH directions, because only the absence half catches the regression: a tile that
   * regains a radius re-draws twenty-four corners while every other assertion here stays green.
   */
  /**
   * THE TYPE SCALE WAS ENTIRELY UNGUARDED, AND THAT IS HOW THE WRONG SERIF SHIPPED.
   *
   * Before this test, changing the name from 60px to 44px — a 27% change to the largest element on
   * the page — reddened nothing in 1532 assertions. The whole rebuild swapped the brand serif from
   * Libre Baskerville to Playfair Display and no gate, suite or审 review saw it; Akhil found it by
   * eye, twice, and named it as "the font is also not looking great".
   *
   * So the three display roles are pinned against the SERVED markup. `Heading`'s numeric path
   * inlines `font-size`, which is why 18 and 16 appear literally; the name reads `var(--hm-name)`
   * because `home.css` drives it for the dock animation, so its RUNG is asserted in the stylesheet
   * instead.
   *
   * Sizes are the original site's, which Akhil chose on 2026-08-30 after comparing nine pairings:
   * name 48 (nearest rungs 40/44), subtitle 18, tagline 16. Not the prototype's 60/20/21.
   */
  it('the three display roles ship the chosen sizes, in the brand serif', () => {
    const heading = (cls: string) => {
      const m = new RegExp(`<[a-z0-9]+ [^>]*\\b${cls}\\b[^>]*>`).exec(html);
      expect(m, `no element carrying .${cls} in the served page`).not.toBeNull();
      return (m as RegExpExecArray)[0];
    };

    // All three are the DISPLAY face, not the body sans. This is the assertion that would have
    // caught the Playfair swap had it existed — via the token, which `design-system.css` binds.
    for (const cls of ['hm-name', 'hm-subtitle', 'hm-intro']) {
      expect(heading(cls), `${cls} is not set in the display face`).toContain(
        'font-family:var(--display)'
      );
    }

    expect(heading('hm-subtitle'), 'the subtitle size moved').toContain('font-size:18px');
    expect(heading('hm-intro'), 'the tagline size moved').toContain('font-size:16px');

    // The name is driven from the stylesheet, so assert the rung rather than a pixel value —
    // a literal here would be the thing `gate:app-css` refuses in the CSS.
    expect(heading('hm-name'), 'the name stopped reading --hm-name').toContain(
      'font-size:var(--hm-name)'
    );
    expect(heading('hm-name'), 'the name lost its weight').toContain('font-weight:700');
    const nameRung = /--hm-name:\s*var\((--text-[a-z0-9]+)\)/.exec(cssCode);
    expect(nameRung, 'no --hm-name declaration in the stylesheet').not.toBeNull();
    expect(
      (nameRung as RegExpExecArray)[1],
      'the name jumped a rung — 3xl/4xl was the first pass, 5xl is the prototype 60px'
    ).toBe('--text-2xl');

    process.stdout.write(
      '  type: name var(--hm-name) = --text-2xl/700 · subtitle 18 · tagline 16 · all var(--display)\n'
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
    // The tile keeps its own clip: the hover scale needs it, and it rounds nothing.
    expect(tile).toMatch(/overflow:\s*hidden/);
  });

  /**
   * 05-17 — the hairline that used to ring the slab is gone with it.
   *
   * `.dark .hm-peek-grid { box-shadow: 0 0 0 1px var(--rule) }` outlined the flush block. Around six
   * separated tiles it outlines a rectangle of page background, which is worse than nothing and is
   * exactly the kind of leftover that survives a rewrite unnoticed.
   */
  it('no ring is drawn around the photo grid', () => {
    expect(cssCode).not.toMatch(/\.hm-peek-grid\s*\{[^}]*box-shadow/);
    expect(cssCode).not.toMatch(/\.dark\s+\.hm-peek-grid/);
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
   * ACT 1 HAS NO CALLS TO ACTION, AND THIS ASSERTS BOTH HALVES OF THAT.
   *
   * `home_config.ctas` is empty — Akhil, 2026-08-30. The approved prototype's Act 1 carries none;
   * the legacy site added them and the rebuild inherited them. The button was also the only filled
   * element on the page, so the eye reached it before the photographs.
   *
   * Still asserted against the RECORD rather than a literal, and it holds in BOTH directions: an
   * empty record must render no control AND no empty container, and a refilled record must render
   * exactly what it declares. That second half is why the mapping stays in the page — this is CMS
   * content, and putting a CTA back must not need a code change.
   *
   * The container half is the one that matters today: an empty `.hm-ctas` div would still take its
   * `gap` and its margins, so the spacing under the grid would be wrong with nothing visible to
   * explain why.
   */
  it('renders exactly the CTAs data/home_config.json declares — none, today', () => {
    const home = JSON.parse(
      readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
    ) as { ctas: ReadonlyArray<{ text: string; link: string }> };

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
      // D-4: `inline`, `footer` and `action` inline a literal colour no app rule can beat at any
      // specificity, while every jsdom test still passes. Pinned so it cannot be "improved" back.
      expect(markup, 'a literal colour reached the page through a variant').not.toMatch(
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
  /**
   * 05-17 — the assertion is unchanged and the MECHANISM behind it is completely different, which
   * is why the docstring is rewritten rather than left alone.
   *
   * 05-16 rendered these two lines as `Text` and forced the serif through
   * `style={{ fontFamily: 'var(--display)' }}`, filing `Text`'s missing family lever as D-22. That
   * escape hatch is gone. MEASURED, `dist/components/Heading.d.ts`: `as?: ElementType`; and
   * `chunk-DQHLFJNO.js` inlines `fontFamily: "var(--display)"` on every render. **`Heading as="p"`
   * IS body text in the display face**, through the component's own API.
   *
   * So `font-family:var(--display)` still appears in the markup — put there by the design system
   * this time, not by the page. The assertion is deliberately left reading the SHIPPED attribute
   * rather than the source: it is a claim about what a reader gets, and it must stay true however
   * the page obtains it.
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

  /**
   * 05-17 — the page no longer needs `Text`'s escape hatch, and that is worth an assertion of its
   * own so it cannot creep back. A `style={{ fontFamily: … }}` here would mean someone reached for
   * `Text` again and re-opened D-22 on a page that no longer depends on it.
   */
  it('no page-level font-family escape hatch survives on the identity lines', () => {
    const source = readFileSync('src/pages/index.astro', 'utf8');
    expect(
      source.replace(/\/\*[\s\S]*?\*\//g, ''),
      'the fontFamily escape hatch is back — use `Heading as="p"`, which is serif by construction'
    ).not.toMatch(/fontFamily:/);
  });
});

/*
 * ══ 05-17 — THE TOP ROW. THE DESIGN HAS NO BAR, AND THAT WAS THE FIRST THING AKHIL SAID ═════════
 *
 * *"I didn't agree with the header initially… the header is not required for such a page."*
 *
 * MEASURED against `design_handoff_portfolio/Akhil Saxena - Home.dc.html` in Chromium at 1280x860:
 * the row is a flex row of two muted links and a 42px bordered circle, painted directly on the page
 * background — no fill, no bottom edge. `AppBar` cannot render that: `.ds-atom-appbar` declares
 * `background: var(--surf-2); backdrop-filter: blur(14px)` and none of its four variants removes
 * either (MEASURED, `primitives.css` + `AppBar.d.ts`).
 *
 * These assertions read the SERVED DOCUMENT, not the source, because the claim is about what a
 * reader receives — and they are scoped to `/` on purpose. The other 51 documents keep the AppBar.
 */
describe('Home ships no app bar (05-17)', () => {
  it('emits no AppBar on this route', () => {
    expect(
      html,
      'the design-system AppBar is back on Home. It paints a --surf-2 band with a hard bottom ' +
        'edge, which is the "header" the owner rejected on sight.'
    ).not.toMatch(/ds-atom-appbar/);
  });

  it('composes the row from Link + IconButton directly', () => {
    expect(html, 'no plain nav row').toMatch(/<nav class="pub-nav-plain">/);
    const links = [...html.matchAll(/<a[^>]*class="ds-atom-link pub-nav-link"[^>]*>/g)];
    expect(links.length, 'the nav links are not design-system Links').toBeGreaterThan(0);
    expect(html, 'no theme toggle in the row').toMatch(
      /<button[^>]*class="ds-atom-iconbtn pub-toggle"/
    );
  });

  /**
   * `quiet`, not `default`, and this is the variant 05-16 got wrong. MEASURED, `primitives.css`:
   *
   *     [data-variant="default"]  color: var(--ink-2);  text-decoration: underline;
   *     [data-variant="quiet"]    color: var(--ink-3);  text-decoration: none;
   *
   * The design's nav is muted and NOT underlined. Shipping `default` is why the rejected capture
   * has three underlined links across the top. Both are stylesheet-only variants, so neither
   * smuggles the `rgba(0, 0, 0, 0.25)` underline D-4 files against `inline`/`footer`/`action`.
   */
  it('the nav links are quiet — muted and not underlined', () => {
    const links = [...html.matchAll(/<a[^>]*class="ds-atom-link pub-nav-link"[^>]*>/g)].map(
      (m) => m[0] as string
    );
    expect(links.length).toBeGreaterThan(0);
    for (const markup of links) {
      expect(/data-variant="([^"]*)"/.exec(markup)?.[1], `nav link shipped ${markup}`).toBe(
        'quiet'
      );
      expect(markup, 'a literal colour reached the nav through a Link variant').not.toMatch(
        /rgba\(0, 0, 0/
      );
    }
  });

  /**
   * The bordered circle, drawn by re-pointing two properties `.ds-atom-iconbtn` already declares
   * (`border` and `border-radius`) at two tokens that already exist. Asserted against the SOURCE,
   * because the claim is about HOW the shape was obtained — a hand-rolled `width`/`height`/`border`
   * block would look identical in the artefact and would be the workaround QUAL-03 forbids.
   */
  it('the toggle is a re-pointed IconButton reduced to its glyph', () => {
    const rule = /\.pub-nav-plain \.pub-toggle\s*\{([^}]*)\}/.exec(cssCode);
    expect(rule, 'no .pub-toggle rule').not.toBeNull();
    const body = (rule as RegExpExecArray)[1] as string;
    expect(body).toMatch(/border-radius:\s*var\(--radius-full\)/);
    expect(body, 'the border came back — the toggle is a glyph now').toMatch(
      /border-color:\s*transparent/
    );
    expect(body, 'the fill came back').toMatch(/background-color:\s*transparent/);
    expect(cssCode, 'the glyph lost its resting opacity').toMatch(
      /\.pub-toggle \.ds-atom-iconbtn-glyph\s*\{[^}]*opacity:\s*0\.7/
    );
    expect(cssCode, 'the glyph never returns to full strength on hover').toMatch(
      /\.pub-toggle:hover \.ds-atom-iconbtn-glyph\s*\{[^}]*opacity:\s*1/
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

  it('carries exactly three named landmarks', () => {
    const named = html.match(/<section[^>]*aria-label(?:ledby)?="/g) ?? [];
    expect(named.length).toBe(3);
    expect(html).toMatch(/<section[^>]*aria-label="Photographs"/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="hm-work-h"/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="hm-resume-h"/);
  });
});
