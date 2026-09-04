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
 * The ones that did NOT change — zero framework JS, the derived `ALL n →` count, the CMS-driven
 * CTAs, no scroll-snap — are untouched, because they were about behaviour rather than about a
 * composition.
 *
 * ================================================================================================
 * 🔴 2026-09-02 — HOME BECAME ONE SCREEN, AND TEN ASSERTIONS HERE WERE INVERTED RATHER THAN DELETED
 * ================================================================================================
 *
 * WHAT THE PAGE IS NOW:
 *
 *     top      the theme toggle only, right-aligned, in a <div> (NOT a <nav>, NOT an AppBar)
 *     centre   Akhil Saxena · Interfaces & Imagery · six photographs · two doors
 *     doors    `Development →` (primary) and `Photography →` (secondary), real `Button as="a"`
 *     bottom   an app-composed footer: © left, three brand marks right, gutter-aligned
 *
 * WHAT WENT, and every one of these had an assertion here that now requires its ABSENCE:
 *
 *     Act 2 entirely      `HomeActTwo` is neither rendered nor imported by `index.astro`
 *     the scroll cue      `.hm-cue`, `↓ DEVELOPMENT`, `#work` — nothing left to scroll to
 *     the dock            `.hm-name` sticky, `@keyframes hm-dock`/`hm-shed`, every `--hm-dock-*`
 *     the height budget   `min-height: calc(100svh - var(--hm-above))` and its centring padding
 *     the intro           `home_config.intro` is `''` and the line renders only when non-empty
 *     the nav links       on HOME only — `NAV_ITEMS` still renders on the other 51 routes
 *     the DS `Footer`     `FooterProps.links` carries no icon and no per-item hook (D-26)
 *
 * ------------------------------------------------------------------------------------------------
 * INVERTED, NOT DELETED — AND THE REASON IS THAT SEVERAL OF THESE HAVE BEEN INVERTED BEFORE
 * ------------------------------------------------------------------------------------------------
 *
 * The cue's copy has changed three times. The `position: sticky` assertion has been reversed twice.
 * The peek grid's radius moved from container to tile and back. Each of those reversals was argued
 * from a measurement or from a sentence Akhil said, and deleting the assertion deletes the
 * argument — which invites the same round trip a third time. So every one below keeps its history,
 * flips to require the absence, and names who decided what and when.
 *
 * ------------------------------------------------------------------------------------------------
 * 🟠 THREE ANTI-VACUITY ANCHORS IN THIS FILE WERE POINTED AT THE THING BEING REMOVED
 * ------------------------------------------------------------------------------------------------
 *
 * This is the failure this pass had to go looking for, because none of the three was RED:
 *
 *     `position: sticky`             proved the sheet was non-empty — and was the DOCK's own
 *                                     declaration. Re-pointed at `--hm-above:` when the dock went.
 *     `--hm-above:`                  its replacement, chosen as "structural". It lost its only
 *                                     READER one commit later; the DECLARATION stayed, so it kept
 *                                     passing while proving nothing. Now `.hm-a { flex: 1 }`.
 *     `animation-name: hm-cue-bob`   proved the motion query held motion — and was the CUE's, which
 *                                     no longer renders. Now the toggle glyph's fade and the tile
 *                                     hover, both paired with a check that the element is in the
 *                                     served document.
 *
 * THE RULE THAT FALLS OUT OF IT, and it is why two of these were also wrong before this pass:
 * **AN ANTI-VACUITY ANCHOR MUST BE SOMETHING THE PAGE STILL RENDERS, NOT MERELY SOMETHING THE
 * STYLESHEET STILL SPELLS.** Grep every anchor against the artefact before trusting it.
 *
 * ------------------------------------------------------------------------------------------------
 * 🟠 `home.css` AND `HomeActTwo.astro` STILL CARRY THE REMOVED PAGE. THAT IS NOT THIS FILE'S TO FIX
 * ------------------------------------------------------------------------------------------------
 *
 * §6 of `home.css` — `.hm-b`, `.hm-work`, `.hm-resume`, `.hm-more`, `.hm-grid`, `.hm-card` — and
 * §5's `.hm-cue` with BOTH of its bob keyframes are still in the sheet, and `HomeActTwo.astro` is
 * still on disk. It was MODIFIED rather than deleted in the same session, which reads as parked for
 * a decision rather than forgotten, and deleting a section Akhil may restore is not an executor's
 * call. Consequences, so nobody has to rediscover them:
 *
 *   - Assertions about removed things read the DOCUMENT, not the stylesheet. `not.toMatch(/\.hm-b/)`
 *     over `home.css` would red today on correct behaviour.
 *   - Three custom properties are DECLARED AND UNREAD: `--hm-above`, `container-type`'s `cqw`
 *     readers, and (before the cue was removed) `@keyframes hm-cue-bob`, which was already shadowed
 *     by `hm-nudge` on the same selector. Each has an assertion below refusing a NEW reader.
 *   - The `no-preference` block count is 3 and two of the three are dead. When the cue CSS goes it
 *     becomes 2, and the assertion says so at the point it counts.
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
import { NAV_ITEMS } from '../../src/components/public/PublicNav';
import { ACT_ONE_MAX, BREAKPOINTS, PEEK_GAP } from '../../src/lib/layout-ladder';

const previewBaseUrl = inject('previewBaseUrl');

/** Fetched once per file; every assertion below reads the same served bytes. */
const response = await fetch(`${previewBaseUrl}/`);
const html = await response.text();

/**
 * A SECOND ROUTE, fetched for one job: to keep this file's Home-only ABSENCES honest.
 *
 * Since 2026-09-02 several assertions here say "Home ships no X" — no nav links, no app bar. Every
 * one of those passes just as well if X was deleted from all fifty-two documents, which would be a
 * site-wide regression reported as a Home-only design decision. `/development` is the representative
 * route for the `bar` arrangement, so pairing each absence on `/` with the matching PRESENCE here
 * is what makes the claim "Home is the exception" rather than "nothing has a nav".
 *
 * It is deliberately ONE extra route and one extra fetch. Everything else about `/development` belongs
 * to `test/public/development.node.test.ts`.
 */
const barRouteHtml = await (await fetch(`${previewBaseUrl}/development`)).text();

const HOME_CSS_PATH = 'src/styles/home.css';
const homeCss = readFileSync(HOME_CSS_PATH, 'utf8');

/**
 * The SHELL's stylesheet, read for one reason and stated here so it is not quietly widened.
 *
 * Act 1 stopped declaring its own height on 2026-09-02 — it is `flex: 1` now, and the `100svh` it
 * fills is `.pub-shell`'s. Two assertions below therefore have to read the file where that number
 * actually lives, or they anchor on `home.css`'s only remaining `100svh`, which belongs to `.hm-b`
 * — Act 2's rule, and Act 2 no longer renders. See `uses svh, and never vh or dvh`.
 *
 * Everything ELSE about the shell is `test/public/shell.unit.test.ts`'s. This file reads it for the
 * viewport-height unit and nothing more.
 */
const shellCssCode = readFileSync('src/styles/public-shell.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

/**
 * `data/home_config.json`, read once. THE RECORD, not a literal — Home's identity lines and its
 * CTAs are CMS content Akhil edits through `/admin`, so three assertions below compare the page
 * against THIS rather than against a string typed here. `test/public/copy-contract.node.test.ts`
 * carries the full argument for why that is derivation and not pinning.
 */
const homeRecord = JSON.parse(
  readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
) as { title: string; subtitle: string; intro: string; ctas: ReadonlyArray<unknown> };

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

/*
 * ══ THERE IS NO SCROLL CUE, BECAUSE THERE IS NOTHING BELOW — Akhil, 2026-09-02 ══════════════════
 *
 * 🔴 THIS BLOCK IS THE INVERSE OF THE ONE IT REPLACES. THE HISTORY IS KEPT BECAUSE THE STRING HAS
 * NOW BEEN CHANGED THREE TIMES AND REMOVED ONCE, AND EACH MOVE HAD A REASON.
 *
 *     05-16  `SCROLL FOR THE WORK ↓`   kept over the handoff's, on the argument that it "says what
 *                                       the control DOES rather than where it points"
 *     05-17  `↓ DEVELOPMENT`           the handoff's own wording, arrow leading — Akhil: *"The
 *                                       scroll for work should not be this apparent. It should
 *                                       just be a small animation with an arrow showcasing that I
 *                                       need to scroll, not this."*
 *     now    nothing                   Home is ONE SCREEN. Act 2 is gone, so the cue would be
 *                                       pointing at the footer.
 *
 * WHAT REPLACED IT, and this is why the removal is a design rather than a subtraction: Act 1 ends
 * in TWO DOORS — `Photography →` and `Development →`, real `Button as="a"` controls. The cue's job
 * was to say "there is more, below"; the doors say "there is more, and here are the two ways in".
 * A reader is not asked to discover the rest of the site by scrolling at all.
 *
 * So every assertion below requires an ABSENCE, and each one is anchored on the doors — the thing
 * that made the cue unnecessary. An absence assertion over a page that failed to render passes
 * trivially, and the doors are the positive fact that proves the document is real. Anchoring them
 * on the cue's own machinery would be the trap this file has already fallen into twice (see
 * `no scroll-snap declaration survives anywhere on this page`).
 *
 * ------------------------------------------------------------------------------------------------
 * 🟠 `home.css` STILL CARRIES `.hm-cue` AND ITS TWO BOB KEYFRAMES. THAT IS DEAD CSS, ON PURPOSE OF
 * NOBODY'S — see this file's header. These assertions therefore read the DOCUMENT and not the
 * stylesheet: the claim is that a reader gets no cue, which stays true whoever eventually deletes
 * the rules. A stylesheet-side `not.toMatch(/\.hm-cue/)` would red today on correct behaviour.
 */
describe('Home ships no scroll cue — the doors replaced it (2026-09-02)', () => {
  /** The doors, which every absence below is anchored on. Two, and both real `Button`s. */
  const doors = [...html.matchAll(/<a class="ds-atom-btn hm-door"[^>]*>([\s\S]*?)<\/a>/g)];

  /**
   * 🔴 CALLED FIRST IN EVERY ABSENCE TEST BELOW, AND A VACUITY CONTROL IS WHY IT EXISTS.
   *
   * The first version of this block anchored on the doors ONCE, in the test below, and left the
   * five absence tests to stand alone. Run with `html` forced to the empty string — the control
   * this file's contract requires — that test failed and ALL FIVE ABSENCES PASSED. Of course they
   * did: `expect('').not.toMatch(/href="#work"/)` is true.
   *
   * A per-file or per-block anti-vacuity check is not enough for an absence claim. Vitest runs
   * each `it` independently, so a sibling proving the document rendered proves nothing about THIS
   * assertion — it only makes the suite red somewhere. Every absence needs the positive fact in
   * the same test body.
   */
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
    /*
     * ==============================================================================================
     * DEVELOPMENT FIRST, AND THE TWO DOORS CARRY DIFFERENT WEIGHTS ON PURPOSE
     * ==============================================================================================
     *
     * Akhil: *"hero page to have primary and secondary cta. primary being development."*
     *
     * THIS ASSERTION HAS NOW SWUNG BOTH WAYS, and both swings are recorded because the reasons are
     * different rather than contradictory:
     *
     *   it pinned `primary|secondary` first — a hierarchy, one filled door and one outlined
     *   then `ghost` on both, EQUAL, after *"make both buttosn same weight. outline only ones. not
     *     filled. both are euqal weight"*
     *   now `primary` then `secondary` again, ranked, with development leading
     *
     * "Not filled" was the MECHANISM of "equal weight", not a separate preference: `ghost` is the
     * only variant that can be unfilled at all, because `Button` composes
     * `{...base, ...size, ...variantStyles[variant], ...style}` into the `style` ATTRIBUTE, so
     * `primary`'s and `secondary`'s fills are inline and unreachable from `src/styles` at any
     * specificity (D-4). With a hierarchy wanted again, the filled variants are the tool that
     * expresses one and the constraint that ruled them out is gone.
     *
     * 🔴 ORDER IS ASSERTED, AND IT IS THE ACCESSIBILITY HALF OF "PRIMARY". Tab order follows the
     * DOM, so a primary door that a keyboard reader reaches second is only primary to the eye. The
     * markup is swapped rather than reordered with CSS `order`, which would have made the visual
     * and focus sequences disagree — and this assertion is what stops a later "just flip them
     * visually" from passing.
     */
    expect(doors.map((m) => m[1] as string)).toEqual(['Development →', 'Photography →']);

    const variants = doors.map((m) => /data-variant="([^"]*)"/.exec(m[0] as string)?.[1]);
    expect(variants, 'the doors are not ranked primary-then-secondary').toEqual([
      'primary',
      'secondary',
    ]);
    // DIFFERENT, not merely both-present: two `primary`s would satisfy a per-door check and would
    // be the equal-weight arrangement this replaced.
    expect(new Set(variants).size, 'the two doors carry the same weight').toBe(2);

    /*
     * NO ASSERTION ABOUT THE INLINE BORDER COLOUR, AND THE ATTEMPT IS WORTH RECORDING.
     *
     * The ghost pair had to pass `style={{ borderColor: 'var(--rule-strong)' }}`, because `ghost`
     * sets `borderColor: "transparent"` inline and the edge could only be handed back through the
     * `style` prop. Removing the doors' `style` prop was part of this change, so a
     * `not.toMatch(/border-color:/)` looked like the way to pin it.
     *
     * IT IS NOT EXPRESSIBLE FROM THE SERVED BYTES. MEASURED — `primary` and `secondary` write their
     * OWN `border-color` into the same `style` attribute, so the emitted markup carries one either
     * way and nothing in it says whether a consumer added it. The check would have failed on correct
     * behaviour, which is worse than no check: it teaches the next person to delete the assertion.
     *
     * The variant pinning above is what actually guards this — a door that went back to `ghost` to
     * carry a hand-passed border fails on `data-variant`, which IS in the bytes.
     */
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
    // The ASSERTION is unchanged — it is the one here that was already an absence, and it pins a
    // specific rejected string rather than the mechanism. What is new is the anchor: without it
    // this passed on an empty document (see `givenTheDoorsRendered`).
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
    // The class, not the rule. `home.css` is delivered as a <link> today (5,965 bytes, over
    // Astro's 4,096-byte inlining threshold — D-05-16-1), but that margin has been 35 bytes
    // before now, so a bare class-name grep on this route can be satisfied by a <style> block.
    // Matching `class="…hm-cue…"` cannot be.
    expect(html, 'a cue element is back in the document').not.toMatch(
      /class="[^"]*\bhm-cue\b[^"]*"/
    );
  });

  it('is not a button, a chevron or a div calling scrollIntoView', () => {
    // The ASSERTION outlived its subject: the cue is gone, and what this refuses is the class of
    // replacement — a scripted scroll — which PUB-14 forbids on this route in any shape. It was
    // vacuous before this pass too, and the anchor is the fix.
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

/*
 * ══ HOME IS ONE SCREEN. THE HEIGHT BUDGET AND THE ACT-2 REVEAL ARE BOTH GONE ════════════════════
 *
 * 🔴 EVERY ASSERTION IN THIS BLOCK USED TO DESCRIBE ARITHMETIC THAT NO LONGER EXISTS, AND THEY ARE
 * INVERTED RATHER THAN DELETED BECAUSE THE ARITHMETIC IS WHAT THE NEXT PERSON WILL RE-DERIVE.
 *
 * The old shape, kept so the inversions below can be read against it:
 *
 *     .hm-a  min-height: calc(100svh - var(--hm-above))   one viewport, less the nav row
 *     .hm-a  padding-bottom: var(--hm-above)              so the CONTENT centred on the VIEWPORT
 *     .hm-b  min-height: 100svh                           so one gesture landed in Act 2, fully
 *
 * That was correct while Act 2 existed: Act 1 owned exactly one screen and the footer sat below the
 * fold with Act 2. Act 2 was removed on 2026-09-02, which left the footer as the only thing under
 * Act 1 — and the budget then overflowed by exactly the footer's height, MEASURED at 49px
 * identically at 1440, 1280, 390 and 344. Identical at four widths is the signature of a fixed
 * element the arithmetic forgot, not of a layout bug.
 *
 * What replaced it is `flex: 1` inside `.pub-shell`'s `100svh`: Act 1 takes whatever is left after
 * the row above and the footer below, at any viewport, WITHOUT NAMING EITHER HEIGHT. The old form
 * had to know `--hm-above`; this one has to know nothing, which is why it cannot go stale the next
 * time either end changes — and it is why `--hm-above` now has no reader at all (asserted below).
 */
describe('Home is one screen — Act 1 fills what is left, and there is no Act 2 (2026-09-02)', () => {
  /**
   * `svh`, never `vh`, never `dvh`. THE RULE IS UNCHANGED; ITS POSITIVE ANCHOR HAD TO MOVE.
   *
   * 🔴 This read `expect(cssCode).toMatch(/100svh/)` over `home.css`. Once Act 1 became `flex: 1`,
   * the ONLY `100svh` left in that file is `.hm-b`'s — Act 2's rule, on a section that no longer
   * renders. The anchor proving the unit is in use would have been satisfied by dead CSS alone,
   * which is the third time this file has anchored a check on something that had been removed.
   *
   * The live declaration is `.pub-shell`'s, because that is the box `flex: 1` resolves against, so
   * that is what the anchor reads now. The two NEGATIVES sweep BOTH files: `100vh` is the LARGE
   * viewport — the height with the mobile URL bar retracted — and it is the same defect in either
   * sheet, because either one can push Act 1's bottom edge behind that bar at first paint.
   */
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
    // UNCHANGED. It is now a claim about `.hm-a` in practice — `.hm-b` is Act 2's dead rule — but
    // the shape is deliberately left sweeping both: if Act 2 is ever restored it must come back
    // under the same rule, and narrowing this to `.hm-a` today is how that gets forgotten.
    const stateRules = [...cssCode.matchAll(/\.hm-[ab]\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(stateRules.length).toBeGreaterThanOrEqual(2);
    for (const rule of stateRules) expect(rule).not.toMatch(/(?<!min-)height:/);
  });

  /**
   * 🔴 THIS ASSERTION IS INVERTED. IT USED TO REQUIRE THE BUDGET; IT NOW REQUIRES ITS ABSENCE.
   *
   * WHAT IT USED TO SAY, and why it was right at the time. The design system ships no `*` reset,
   * so the initial `content-box` applies and state A's `padding-block-end` ADDED to its
   * `min-height`. MEASURED in Chromium on the built artefact before that fix: state A painted the
   * budget plus exactly `--space-6` at all six classes — 790 against a 766 budget at 344 × 882 —
   * which put Act 2's document offset 24px below one viewport at every class and left a 19px strip
   * of state A on screen after a full-viewport scroll. It was invisible because the strip happened
   * to be state A's own bottom padding.
   *
   * WHAT IT SAYS NOW. Both the `min-height` and the `padding-bottom` are gone (2026-09-02), so the
   * defect above cannot recur — there is no budget for a padding to be added to. What is asserted
   * instead is the mechanism that replaced them, in both directions:
   *
   *   - `flex: 1` is PRESENT, so Act 1 grows into the space between the row and the footer.
   *   - the budget arithmetic is ABSENT, because re-adding `min-height: calc(100svh - …)` under a
   *     footer that is now in flow is exactly the 49px overflow that removing it fixed.
   *   - `.hm-a` still has NO padding of any kind. That half is unchanged and is the reason this
   *     test keeps its border-box clause: padding here silently changes what `flex: 1` resolves to.
   *
   * `box-sizing: border-box` IS KEPT AND IS STILL ASSERTED. It is doing less work than it was, but
   * it is not doing none: the flex basis is resolved against the border box, so a padding added
   * later would behave the way the author expects rather than the way `content-box` would.
   */
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

    /*
     * THE INVERSION. Both of these were REQUIRED here until 2026-09-02 and are now REFUSED.
     *
     * The budget was `100svh` less the nav row, on the premise that Act 1 owned exactly one screen
     * and everything else — the footer included — sat below the fold with Act 2. Removing Act 2
     * left the footer in flow under Act 1, and the arithmetic then overflowed by exactly the
     * footer's height: MEASURED at 49px, IDENTICALLY at 1440, 1280, 390 and 344. The same number at
     * four widths is a fixed element the formula forgot, not a layout bug.
     *
     * The padding was the other half of the same premise. It shortened the centring box by exactly
     * the offset ABOVE it so the content's midpoint landed on the screen's — correct when there was
     * nothing below. With a footer below, it over-corrected by exactly the footer's height, MEASURED
     * identically at 1440, 1280 and 390. `flex: 1` centres inside the space the content actually
     * has, so the residual is (footer - row) / 2 = 9px and no literal offset is needed.
     *
     * Refused rather than merely un-asserted, because "put the budget back" is the obvious repair
     * for anyone who sees Act 1 sitting shorter than a viewport on a tall screen — and it is the
     * repair that reintroduces both measured defects at once.
     */
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
   * THE DOCK IS GONE, AND THIS ASSERTS ITS ABSENCE.
   *
   * `.hm-name` used to be `position: sticky` with a scroll timeline: the name travelled to the
   * top-left corner and shrank while the subtitle, tagline and photographs faded. Built to Akhil's
   * own description, and removed by him on 2026-09-02 after living with it — "remove the motion in
   * heading text."
   *
   * BOTH halves went, because they were coupled: sticky kept the name on screen after Act 1 had
   * scrolled past, and the shed existed only to clear the photographs out from under it.
   *
   * Asserted as an absence in BOTH the mechanism and the leftovers, because a half-removal is the
   * likely failure — a `@keyframes` nobody runs, or a `container-type` whose only reader has gone.
   */
  it('the name does not dock — no sticky, no scroll timeline, no orphaned keyframes', () => {
    expect(cssCode, 'a scroll timeline came back').not.toMatch(/animation-timeline/);
    expect(cssCode, 'the dock keyframes are back').not.toMatch(/@keyframes\s+hm-dock/);
    expect(cssCode, 'the shed keyframes are back').not.toMatch(/@keyframes\s+hm-shed/);
    expect(cssCode, 'a dock custom property survived the removal').not.toMatch(/--hm-dock-/);
    expect(cssCode, 'nothing on this page is sticky any more').not.toMatch(/position:\s*sticky/);
  });

  /**
   * 🔴 INVERTED, AND THIS IS THE ASSERTION THE WHOLE REDESIGN TURNS ON.
   *
   * IT USED TO SAY: "one gesture lands in Act 2, fully" — MEASURED in Chromium at 1280x860 on the
   * built artefact, `document.scrollHeight` 1833, Act 2's top edge at y=860 when scrollY was 0 and
   * at y=0 when scrollY was 860. Exactly one viewport. The stylesheet cannot be asked for that
   * number, so it asserted the two facts it followed from: Act 1 was the viewport minus the row
   * above it, and Act 2 was a full viewport.
   *
   * IT NOW SAYS: there is no second gesture, because there is no second act. Home is a single
   * screen — Akhil, 2026-09-02 — and `HomeActTwo.astro` is neither rendered nor imported by
   * `src/pages/index.astro`.
   *
   * ASSERTED ON THE DOCUMENT, NOT THE STYLESHEET, AND THAT CHOICE IS LOAD-BEARING.
   * `home.css` STILL CONTAINS §6's entire Act-2 block — `.hm-b`, `.hm-work`, `.hm-resume`,
   * `.hm-more`, `.hm-grid`, `.hm-card` and the rest — and `HomeActTwo.astro` still exists on disk.
   * That is dead code (see this file's header), and it is NOT this suite's to delete: the component
   * was modified rather than removed in the same session, which reads as parked for a decision
   * rather than forgotten. A stylesheet-side `not.toMatch(/\.hm-b/)` would therefore red today on
   * correct behaviour, and would red again the day someone does the cleanup. What a READER gets is
   * the durable claim, so that is what is asserted.
   */
  it('the served document is one screen — no Act 2 renders', () => {
    // ANTI-VACUITY FIRST: Act 1 really is in this document. Every absence below depends on it.
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

    // And the CSS half of the claim: Act 1 no longer derives its height from the row above it.
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
    /*
     * ANTI-VACUITY, RE-POINTED FOR THE THIRD TIME, AND THE TWO PREVIOUS CHOICES ARE THE LESSON.
     *
     *   1. `position: sticky`   — the DOCK's own declaration. When the dock was removed this
     *                             anchor asserted the very absence it existed to disprove.
     *   2. `--hm-above:`        — chosen as its replacement on the argument that it was
     *                             "structural and cannot leave while this page exists". ONE COMMIT
     *                             LATER IT LOST ITS ONLY READER (see the next test). The
     *                             DECLARATION is still in the sheet, so this kept passing — an
     *                             anchor on an orphan, which is a worse state than a red one
     *                             because nothing announces it.
     *   3. `.hm-a { … flex: 1 }` — Act 1's own box, and the property that gives it its height. It
     *                             cannot become an orphan: if it leaves, Act 1 collapses and four
     *                             other assertions in this file red in the same run.
     *
     * The general rule this file has now learnt twice: AN ANTI-VACUITY ANCHOR MUST BE SOMETHING
     * THE PAGE STILL RENDERS, not merely something the stylesheet still spells.
     */
    expect(cssCode, 'Act 1 has no flex basis — the anchor for this check is gone').toMatch(
      /\.hm-a\s*\{[\s\S]*?flex:\s*1/
    );
    expect(cssCode.replace(/\s/g, '').length).toBeGreaterThan(500);
  });

  /**
   * 🔴 INVERTED, AND IT IS A REAL FINDING RATHER THAN A BOOKKEEPING CHANGE.
   *
   * `--hm-above` had two jobs. It lost the second (a snap outset) in 05-15 and this test was
   * written to hold BOTH halves — that it was still the budget's subtrahend, and no longer an
   * outset — precisely so that deleting the property outright could not pass as a fix.
   *
   * ON 2026-09-02 IT LOST THE FIRST JOB TOO. The budget went with Act 2, and `--hm-above` is now
   * DECLARED ON `.hm-a` AND READ BY NOTHING: `var(--hm-above)` appears zero times in `home.css`.
   * MEASURED, not inferred — the grep is the assertion below.
   *
   * That is worth an assertion of its own, in this direction, for two reasons:
   *
   *   1. IT IS THE ORPHAN THAT DISARMED THE ANTI-VACUITY ANCHOR one test above. The property being
   *      unread and the anchor being satisfied are the same fact, and only one of them was visible.
   *   2. RE-INTRODUCING A READER IS THE REGRESSION. The only reason to read `--hm-above` again is
   *      to compute a height from the row above Act 1 — which is the 49px overflow that removing
   *      the budget fixed. A new `var(--hm-above)` should cost a deliberate edit here.
   *
   * DELETING THE DECLARATION IS FINE AND IS NOT ASSERTED EITHER WAY. It is `home.css`'s to remove
   * along with the rest of the Act-2 leftovers; this test only refuses a new CONSUMER.
   */
  it('--hm-above has no reader left — nothing derives a height from the row above Act 1', () => {
    expect(
      [...cssCode.matchAll(/var\(--hm-above\)/g)].length,
      'something reads --hm-above again. The only thing it can be used for is a height derived ' +
        'from the row above Act 1, and that is the arithmetic which overflowed by the footer.'
    ).toBe(0);
    expect(cssCode).not.toMatch(/scroll-margin-top:\s*var\(--hm-above\)/);
    // ANTI-VACUITY: the sheet was read and really does still mention the property, so a zero
    // above is "declared and unread" rather than "the file failed to load".
    expect(
      cssCode,
      'home.css does not mention --hm-above at all — read the file, not this test'
    ).toMatch(/--hm-above\s*:/);
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
    /*
     * THREE, AND TWO OF THE THREE ARE NOW DEAD. RECOUNTED, NOT GUESSED — the three blocks, in
     * file order, are:
     *
     *   §1   `.pub-nav-plain .pub-toggle .ds-atom-iconbtn-glyph`  opacity fade    LIVE
     *   §7a  `.hm-cue`  animation-name: hm-cue-bob                                DEAD
     *   §7   `.hm-tile img` scale on hover  +  `.hm-cue` animation-name: hm-nudge  LIVE / DEAD
     *
     * 🟠 TWO SEPARATE DEFECTS ARE VISIBLE IN THAT LIST AND BOTH ARE RECORDED RATHER THAN FIXED:
     *
     *   1. THE CUE DOES NOT RENDER AT ALL (2026-09-02), so both of its animations are dead.
     *   2. THERE ARE TWO OF THEM, TARGETING THE SAME SELECTOR. `.hm-cue { animation-name }` is
     *      declared in §7a as `hm-cue-bob` and again in §7 as `hm-nudge`. Later wins, so
     *      `hm-cue-bob` and its `@keyframes` were already dead BEFORE the cue was removed — a
     *      leftover from the pass that renamed the animation and did not delete the first copy.
     *      Nothing caught it because the anti-vacuity anchor below was pointed at it.
     *
     * THE COUNT IS KEPT AT 3 ON PURPOSE. Its job is unchanged — a FOURTH block is a motion source
     * nobody argued for — and lowering it to the two live ones would require deleting §7a here as
     * well as in the stylesheet, which is the Act-2 cleanup this suite does not own.
     *
     * >>> WHEN THE DEAD `.hm-cue` CSS GOES, THIS BECOMES 2. CHANGE IT IN THE SAME COMMIT. <<<
     */
    /*
     * TWO, DOWN FROM THREE, AND THE OLD MESSAGE PREDICTED THIS EXACT NUMBER: "a THIRD-minus-one
     * means the dead cue CSS was cleaned up, in which case this number is 2." It was. The scroll
     * cue's own `@keyframes` block went when the toggle's rules moved to `public-shell.css` and the
     * dead §7a bob went with them.
     */
    expect(
      blocks.length,
      'expected two no-preference blocks: the toggle glyph fade (§1) and the tile hover + cue ' +
        'nudge (§7). A count, not a floor — a third is a motion source nobody argued for.'
    ).toBe(2);

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

    /*
     * ANTI-VACUITY, RE-POINTED — AND THIS IS THE SECOND ANCHOR IN THIS FILE THAT WAS AIMED AT
     * SOMETHING BEING REMOVED.
     *
     * It looked for `position: sticky` (the dock's). When the dock went, it was re-pointed at
     * `animation-name: hm-cue-bob` and `animation-name: hm-nudge` — the cue's two animations —
     * on the reasoning that "the cue's bob is the motion that must be inside a no-preference
     * query". The cue was removed from the document three days later, so BOTH anchors now sit on
     * CSS that can never run, and this check went on passing while proving nothing about a reader.
     *
     * The two anchors below are the motion that a reader ACTUALLY receives on this route, verified
     * against the served document rather than against the sheet alone:
     *
     *   the peek tile's hover scale — the six photographs are the page's whole middle
     *
     * 🔴 THE THIRD RE-POINTING, AND IT IS THE SAME LESSON AGAIN. The anchor above used to be "the
     * toggle glyph's opacity fade". The toggle stopped fading its glyph: it moved out of `home.css`
     * to the shell so all ten routes share one control, and the treatment became COLOUR rather than
     * opacity — `--ink-3` at rest, `--ink` on hover — because `.ds-atom-iconbtn:hover` paints a
     * background this file's rules cannot beat, so an opacity fade left a 40px circle appearing
     * under a half-faded glyph. The transition moved with it, into `public-shell.css`.
     *
     * So the toggle's motion is no longer HOME's to assert, and this block asserts only what
     * `home.css` still owns. The toggle's own no-preference query is covered where its rules now
     * live. The anti-vacuity check on the served document below keeps both elements in scope.
     */
    expect(inside).toMatch(/transition-duration/);
    expect(inside).toMatch(/transform:\s*scale/);
    expect(inside, 'the photographs stopped responding to hover').toMatch(
      /\.hm-tile:hover img\s*\{[^}]*transform:\s*scale/
    );
    // Both anchors above are on elements the SERVED page really has, which is what the two
    // previous choices lacked.
    expect(html, 'no theme toggle in the document').toMatch(/class="ds-atom-iconbtn pub-toggle"/);
    expect(html, 'no peek tiles in the document').toMatch(/class="hm-tile"/);

    expect(
      outside,
      'a transform, transition, animation or sticky escaped the motion query — a reader who asked ' +
        'for less motion would get it anyway, and every other test here would still be green'
    ).not.toMatch(/transform:|transition-|animation-|position:\s*sticky/);
  });

  /**
   * The transition is fully tokenised, which the `transition` SHORTHAND cannot be: its first term
   * is a property NAME, so `gate:app-css` reads the whole value as a motion-dimension origination
   * — that is precisely what DEBT-CARD-TRANSITION records on `/development`. Longhand is the only
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
    // ANTI-VACUITY, RE-POINTED: this anchored on `.hm-b {` — Act 2's root, which no longer
    // renders. `.hm-a {` is Act 1's, which is the whole page now.
    expect(cssCode).toMatch(/\.hm-a\s*\{/);
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
   * 🔴 INVERTED — AND IT IS THE THIRD ORPHAN THE 2026-09-02 REDESIGN LEFT BEHIND.
   *
   * IT USED TO SAY: `.hm-a` must be a container, because the dock's `translateX(calc(50% - 50cqw))`
   * resolves `50cqw` against the nearest containment context and silently falls back to the
   * VIEWPORT when there is none — which would have sent the name off the left edge of the screen
   * with no error anywhere. That was a good assertion about a real trap.
   *
   * IT NOW SAYS: nothing reads `cqw` on this page any more. The dock was removed on 2026-09-02 and
   * `container-type: inline-size` was its only consumer, so the declaration is DECLARED AND
   * UNREAD — the same shape as `--hm-above`, and found the same way (by grepping the anchors rather
   * than trusting them).
   *
   * 🟠 THIS ORPHAN IS NOT INERT, WHICH IS WHY IT GETS AN ASSERTION AND NOT JUST A NOTE.
   * `container-type: inline-size` applies `contain: inline-size layout style`, and LAYOUT
   * CONTAINMENT MAKES `.hm-a` A CONTAINING BLOCK FOR FIXED- AND ABSOLUTELY-POSITIONED DESCENDANTS.
   * So a future `position: fixed` child of Act 1 would anchor to Act 1 rather than to the viewport,
   * for a reason nothing on the page explains. Recorded for whoever owns the Act-2 cleanup.
   *
   * WHAT IS REFUSED is a new `cqw` reader, because the only thing that wanted one was the dock.
   */
  it('nothing resolves against a container query any more — the dock was its only reader', () => {
    expect(
      [...cssCode.matchAll(/\d+cq[wibhm]/g)].map((m) => m[0]),
      'a container-query unit is back. The dock was removed on 2026-09-02 ("remove the motion in ' +
        'heading text"); re-adding one means re-adding the interaction, which is a decision.'
    ).toEqual([]);
    // ANTI-VACUITY: the containment context itself is still declared, so the empty list above is
    // "the reader went" and not "the rule went". Both halves visible in one place.
    const body = (/\.hm-a\s*\{([\s\S]*?)\n\}/.exec(cssCode) as RegExpExecArray)[1] as string;
    expect(
      body,
      'container-type has gone from .hm-a too — then this test has nothing left to say and should ' +
        'be deleted along with the note about layout containment above'
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
  it('the display roles ship the chosen sizes, in the brand serif', () => {
    const heading = (cls: string) => {
      const m = new RegExp(`<[a-z0-9]+ [^>]*\\b${cls}\\b[^>]*>`).exec(html);
      expect(m, `no element carrying .${cls} in the served page`).not.toBeNull();
      return (m as RegExpExecArray)[0];
    };

    /*
     * TWO ROLES ARE UNCONDITIONAL AND THE THIRD IS DERIVED FROM THE RECORD. THAT IS THE INVERSION.
     *
     * This asserted THREE — name, subtitle, tagline — and reddened on 2026-09-02 because the third
     * stopped rendering. `home_config.intro` is now the empty string, and `index.astro` renders the
     * line only when it is non-empty: an empty `<p>` still takes its `padding-block-start`, so the
     * gap under the subtitle would be wrong with nothing visible to explain it.
     *
     * WHY THE INTRO IS NOT SIMPLY DROPPED FROM THE LIST. `intro` is a FIELD, not a deleted feature
     * — the schema keeps it (with no `.min(1)`, deliberately) so Akhil can restore the line from
     * `/admin` without a code change. An assertion that only knows about two roles would let a
     * restored intro ship in the WRONG FACE AT THE WRONG SIZE with the suite green, which is
     * exactly how the Playfair swap got in.
     *
     * So the intro's assertion is CONDITIONAL ON THE RECORD, which is the same shape
     * `renders exactly the CTAs data/home_config.json declares` already uses for the other
     * emptied field. Both directions hold: empty record -> no element; filled record -> the
     * element, in the display face, at 16.
     *
     * Akhil's reason for emptying it, from `src/schemas/home.ts`: the phrase "everything else"
     * subordinated the photography to the development, while Act 1 IS six photographs filling the
     * screen. `Interfaces & Imagery` already names both as equals.
     */
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

    /*
     * THE NAME'S RUNG, AND BOTH RUNGS ARE PINNED NOW RATHER THAN ONLY THE BASE ONE.
     *
     * The name is driven from the stylesheet (`style={{ fontSize: 'var(--hm-name)' }}`), because it
     * steps down below the 673px rung and an inline `font-size` cannot be reached by a media query.
     * So the RUNG is asserted in the CSS and the READER in the markup.
     *
     * This used to `.exec()` once and check the FIRST declaration only — the base `--text-2xl` —
     * which left the 673px step completely unguarded: the name could jump from `--text-3xl` to
     * `--text-5xl` above 673 and nothing would say so. Both are pinned, in order. The whole reason
     * this test exists is that a 27% change to the largest element on the page reddened nothing in
     * 1,532 assertions, and half a guard is how that happens again.
     */
    expect(heading('hm-name'), 'the name stopped reading --hm-name').toContain(
      'font-size:var(--hm-name)'
    );
    /*
     * ==============================================================================================
     * THE WEIGHT MOVED OUT OF THE INLINE STYLE, WHICH IS THE POINT OF THE CHANGE
     * ==============================================================================================
     *
     * This pinned `font-weight:700` in the inline style, which is what `Heading weight={700}` emits:
     * a NUMBER goes straight into the `style` attribute, where no stylesheet can reach it.
     *
     * Akhil: *"use same font as Photographs title on hero."* The family already matched on both;
     * the weight did not. So the prop is now the TOKEN STRING `weight="regular"`, which makes the
     * component emit `data-weight="regular"` and stop writing `font-weight` inline at all — and that
     * is what lets `public-shell.css` correct it.
     *
     * 🔴 IT NEEDS CORRECTING BECAUSE `regular` RENDERS 500 AND LIBRE BASKERVILLE DOES NOT SHIP 500.
     * `primitives.css` sets `.ds-atom-heading[data-weight="regular"] { font-weight: 500 }` while
     * `--weight-regular` is 400 — two names for one word, disagreeing — and `design-system.css`
     * imports only `latin-400`, `latin-400-italic` and `latin-700`. Filed as D-37. Until it lands,
     * a (0,3,0) rule in the shell points the attribute back at its own token.
     *
     * SO BOTH HALVES ARE ASSERTED: the attribute is in the markup (the reader), and the ABSENCE of
     * an inline `font-weight` is what proves the stylesheet can still reach it. Pinning only the
     * attribute would pass on a heading that also inlined a number and ignored the correction.
     */
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
  /*
   * 🔴 INVERTED. THE `ALL n →` BADGE IS GONE, AND ITS ABSENCE IS WHAT IS ASSERTED NOW.
   *
   * Akhil: *"from hero page, remove All 40 -> pill"*. It was a derived count on a real link, which
   * is why it was worth a test in the first place — and it is why the test is inverted rather than
   * deleted: a badge re-added by hand, with a hardcoded 40, would pass an absent test and fail this
   * one. The peek grid's tiles are each still a link to the photograph, so nothing lost a route.
   */
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

    /*
     * 🔴 IT COUNTS THE ANCHOR, NOT THE CLASS NAME, AND THAT STILL MATTERS IN THE NEGATIVE.
     *
     * The positive version of this test was written first as `html.match(/hm-peek-all/g).length
     * === 1` and went red under an unrelated plant. The reason is worth keeping because it applies
     * to the ABSENCE too: **Astro's `build.inlineStylesheets` default is `auto`, which inlines a
     * stylesheet under 4,096 bytes**, and MEASURED, the built Home chunk was
     * `dist/client/_astro/index.*.css` at **4,131 bytes — thirty-five over the threshold**. Any
     * edit that shortens the built CSS by 35 bytes moves the whole sheet into a `<style>` block, at
     * which point a leftover `.hm-peek-all` RULE is in `html` and a class-name check fails on a
     * document that renders no badge.
     *
     * So the anchor form is asserted as well: zero `<a class="hm-peek-all"`, which no stylesheet in
     * either delivery can satisfy or violate. The 35-byte margin is recorded in `deferred-items.md`.
     */
    expect((html.match(/<a class="hm-peek-all"/g) ?? []).length).toBe(0);
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

    /*
     * ANCHORED, and a vacuity control is why. With `ctas` empty BOTH halves below were satisfied by
     * a blank document: `0 === 0`, and `expect('').not.toMatch(/class="hm-ctas"/)`. The record
     * being empty is exactly the state in which this check needed the anchor most.
     */
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
  it('the identity lines ship in the display face, not the body face', () => {
    /*
     * 🔴 INVERTED IN THE SAME SHAPE AS THE TEST ABOVE, AND FOR THE SAME REASON.
     *
     * It looped over `['hm-subtitle', 'hm-intro']` unconditionally and reddened on 2026-09-02 when
     * `home_config.intro` was emptied. The line the loop is REALLY making — every identity line
     * this page renders is in the display face — is unchanged; what changed is how many there are.
     *
     * Driving the list off the RECORD keeps both halves true at once: the subtitle is always
     * checked, and the intro is checked exactly when it exists. A hardcoded two-element list would
     * red today; a hardcoded one-element list would stop guarding a restored intro.
     */
    const lines = ['hm-subtitle', ...(homeRecord.intro.length > 0 ? ['hm-intro'] : [])];
    // ANTI-VACUITY: an emptied record must not empty this loop. The subtitle has no `.min(1)`
    // escape — `HomeConfigSchema` requires it — so there is always at least one line to check.
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

    // The other half, and it is what makes the conditional above honest rather than convenient:
    // when the record is empty the element must be ABSENT, not merely unchecked.
    if (homeRecord.intro.length === 0) {
      expect(html, 'hm-intro ships while the record holds no intro').not.toMatch(
        /class="[^"]*\bhm-intro\b[^"]*"/
      );
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
    // THE CLAIM FIRST, THE ANCHORS AFTER. Deliberate ordering: a plant that puts the bar back
    // must fail on the sentence about the bar, not on an anchor two lines above it. Vitest reports
    // the FIRST failing expectation, so the primary absence has to be the first thing asserted.
    expect(
      html,
      'the design-system AppBar is back on Home. It paints a --surf-2 band with a hard bottom ' +
        'edge, which is the "header" the owner rejected on sight.'
    ).not.toMatch(/ds-atom-appbar/);

    /*
     * ANCHORED, and a vacuity control is why. `expect('').not.toMatch(/ds-atom-appbar/)` passes,
     * so this said nothing about a blank response — and "Home has no bar" is ALSO true of every
     * route if the bar were deleted site-wide, which would be a regression reported as a design
     * decision. `/development` is the positive half. See this file's header on absence anchoring.
     */
    expect(html, 'the plain row is not in the document — this is not the page under test').toMatch(
      /<div class="pub-nav-plain">/
    );
    expect(
      barRouteHtml,
      '/development lost its AppBar too — this is not a Home-only change'
    ).toMatch(/ds-atom-appbar/);
  });

  /**
   * 🔴 INVERTED ON 2026-09-02. THE ROW HELD TWO LINKS AND A TOGGLE; IT NOW HOLDS THE TOGGLE ALONE.
   *
   * Akhil, once Home became a single screen: Act 1's TWO DOORS are the navigation. `Photography →`
   * and `Development →` sit under the photographs as the page's only choice, so a
   * `development · photography` pair in the row above was the SAME TWO DESTINATIONS offered twice,
   * in a weaker treatment, on a page with nothing else on it.
   *
   * TWO STRUCTURAL CHANGES CAME WITH IT AND BOTH ARE ASSERTED, because either could be undone by
   * someone "restoring" the row without reading why it emptied:
   *
   *   1. `<nav>` BECAME `<div>`. A navigation landmark with no navigation in it is a landmark a
   *      screen-reader user is sent to for nothing. The toggle is a CONTROL, not a destination.
   *      This is also why the landmark count at the foot of this file went from three to one.
   *   2. THE TOGGLE MOVED TO THE END. `justify-content` was `space-between`, which spaced it
   *      against links that no longer exist and would have parked it on the LEFT.
   *
   * `NAV_ITEMS` IS UNTOUCHED, and the assertion pairs `/` with `/development` to prove it: this is a
   * Home-only omission, not a deletion. Without that pairing, deleting the nav from all fifty-two
   * documents would pass this test.
   */
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

    // ANTI-VACUITY, AND IT IS THE HALF THAT MATTERS: the nav still exists everywhere else.
    expect(NAV_ITEMS.length, 'NAV_ITEMS is empty — the nav was deleted, not omitted').toBe(2);
    expect(
      [...barRouteHtml.matchAll(/class="ds-atom-link pub-nav-link"/g)].length,
      "/development lost its nav links too. Emptying Home's row is a Home-only decision; if the " +
        'links have gone site-wide, that is a regression wearing this test as cover.'
    ).toBe(NAV_ITEMS.length);
  });

  /**
   * 🔴 INVERTED — AND THE INVERSION SURFACED DEAD CODE IN `PublicNav.tsx` ITSELF.
   *
   * WHAT IT USED TO SAY, kept because the measurement is still the reason the OTHER arrangement is
   * the way it is. MEASURED, `primitives.css`:
   *
   *     [data-variant="default"]  color: var(--ink-2);  text-decoration: underline;
   *     [data-variant="quiet"]    color: var(--ink-3);  text-decoration: none;
   *
   * The design's plain-row nav was muted and NOT underlined; shipping `default` is why the capture
   * Akhil rejected had underlined links across the top. `quiet` was the fix.
   *
   * 🟠 `quiet` IS NOW UNREACHABLE, AND IT READS AS WORKING. `PublicNav.tsx` computes
   * `const navVariant = variant === 'plain' ? 'quiet' : 'default'` and builds `navLinks` from it
   * BEFORE the `if (variant === 'plain')` early return — and that early return renders only the
   * toggle. So on Home the `quiet` links are constructed and then discarded, and on every other
   * route `navVariant` is `default`. The `'quiet'` branch can never reach a document.
   *
   * That is precisely the failure mode that file's own header warns about for event handlers — *"a
   * React handler on a component that never hydrates is dead code that reads as working"* — arriving
   * through a different door. RECORDED, NOT FIXED: removing the branch is a change to a component
   * shared by fifty-two documents, and it belongs with the Act-2 cleanup, not with a test pass.
   *
   * So this asserts the two things that are still true and falsifiable: Home ships NO nav link at
   * all, and the bar arrangement's links are `default` — which is what pins the surviving branch.
   */
  it('Home ships no nav links, and the surviving arrangement uses the default variant', () => {
    expect(
      [...html.matchAll(/<a[^>]*class="ds-atom-link pub-nav-link"[^>]*>/g)].length,
      'a nav link is back on Home'
    ).toBe(0);

    const barLinks = [
      ...barRouteHtml.matchAll(/<a[^>]*class="ds-atom-link pub-nav-link"[^>]*>/g),
    ].map((m) => m[0] as string);
    // ANTI-VACUITY: the absence above is Home-only, and these are the links it is absent OF.
    expect(barLinks.length, 'the bar arrangement ships no nav links either').toBe(NAV_ITEMS.length);
    for (const markup of barLinks) {
      /*
       * `quiet`, NOT `default`, AND THE PIN WAS STALE RATHER THAN VIOLATED.
       *
       * The old message read: "'quiet' here would mean the plain branch was wired to the AppBar,
       * which is the arrangement Akhil rejected on sight." That inference no longer holds — the
       * plain branch is still Home's and still separate. `PublicNav` chose `quiet` for the BAR's
       * nav deliberately, so the wordmark can be full ink in the serif while its neighbours sit
       * back in `--ink-3`: a hierarchy the single `default` variant could not express at all.
       * The Home-only absence asserted above is what actually distinguishes the two arrangements.
       */
      expect(/data-variant="([^"]*)"/.exec(markup)?.[1], `bar nav link shipped ${markup}`).toBe(
        'quiet'
      );
      // D-4: `inline`, `footer` and `action` inline a literal colour no app rule can beat at any
      // specificity, while every jsdom test still passes. Pinned so it cannot be "improved" back.
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
  /**
   * THE NAV'S HOVER, PINNED — because the first attempt at it failed SILENTLY.
   *
   * `.pub-nav-plain .pub-nav-link:hover` is (0,3,0). So is the design system's
   * `.ds-atom-link[data-variant="quiet"]:hover`, which sets `text-decoration: underline`. A tie,
   * resolved by file order, and the design system's sheet won it: the underline stayed, the page
   * looked unchanged, and every assertion in this file stayed green because nothing asserted the
   * hover. It was caught by reading the computed style in a browser, not by the suite.
   *
   * So the suite asserts it now, and it asserts the SPECIFICITY rather than the outcome — the
   * variant attribute is what makes the rule (0,4,0) and wins on specificity instead of on import
   * order. A future edit that drops the attribute reads identically and breaks identically.
   *
   * The rule itself is the design: `muted #8F8B82, hover → #EAE7E0`, no underline. It also matches
   * the toggle beside it, and frees the underline to mean `aria-current="page"` and nothing else.
   */
  it('the nav-link hover rule keeps the specificity that made it apply, dead or not', () => {
    /*
     * 🟠 THIS RULE IS DEAD AS OF 2026-09-02 — `.pub-nav-plain` holds no `.pub-nav-link` any more —
     * AND THE ASSERTION IS KEPT ANYWAY. THE LESSON IN IT IS THE MOST EXPENSIVE ONE THIS PAGE HAS
     * TAUGHT, AND THE RULE IS THE TEMPLATE ANYONE RESTORING THE ROW WILL COPY.
     *
     * WHAT HAPPENED. The first attempt was `.pub-nav-plain .pub-nav-link:hover`, which is (0,3,0).
     * So is the design system's `.ds-atom-link[data-variant="quiet"]:hover`, which sets
     * `text-decoration: underline`. A TIE, resolved by file order, and the design system's sheet
     * won it. The underline stayed, the page looked unchanged, and EVERY ASSERTION IN THIS FILE
     * STAYED GREEN because nothing asserted the hover. It was caught by reading the computed style
     * in a browser, not by the suite.
     *
     * THE FIX WAS THE SPECIFICITY, NOT THE DECLARATION. Adding `[data-variant="quiet"]` makes the
     * selector (0,4,0), which wins on specificity instead of on import order. A future edit that
     * drops the attribute reads identically and breaks identically — which is why this asserts the
     * SELECTOR SHAPE and not just that `text-decoration: none` appears somewhere.
     *
     * >>> IF YOU ARE DELETING THE DEAD NAV-LINK CSS: delete this test with it, and move the
     *     specificity rule into whatever replaces it. Do not delete the rule and keep the
     *     declaration. <<<
     */
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

    // AND THE HALF THAT RECORDS WHY IT IS DEAD, so this cannot be read as "the hover ships".
    expect(
      html,
      'a .pub-nav-link is back in the document — then this rule is LIVE again and the note above ' +
        'is stale; update it rather than leaving two readings in the file'
    ).not.toMatch(/class="ds-atom-link pub-nav-link"/);
  });

  /**
   * THE 44px COARSE-POINTER FLOOR ON THE NAV — a measured defect, not a tidy-up.
   *
   * MEASURED at 390 x 844 coarse before the rule: `work` was 30 x 20 and `photographs` 78 x 20,
   * against a 44px floor, on the site's primary navigation — while the toggle, the badge and the
   * cue in the same viewport all met it.
   *
   * The design system grows `.ds-atom-appbar a` under `pointer: coarse`, but Home's nav is a plain
   * row rather than an AppBar, so nothing matched. The same gap the toggle has its own rule for,
   * and the reason inheritance here has to be checked rather than assumed.
   */
  it('the nav links keep their coarse-pointer floor, dead or not', () => {
    /*
     * 🟠 DEAD SINCE 2026-09-02, FOR THE SAME REASON AS THE HOVER RULE ABOVE, AND KEPT FOR THE SAME
     * REASON: it records a MEASURED defect, and the row it applies to may come back.
     *
     * MEASURED at 390 x 844 coarse before the rule existed: `work` was 30 x 20 and `photographs`
     * 78 x 20, against a 44px floor, on the site's primary navigation — while the toggle, the badge
     * and the cue in the same viewport all met it. The design system grows `.ds-atom-appbar a`
     * under `pointer: coarse`, but Home's row is a plain row rather than an AppBar, so NOTHING
     * MATCHED. That gap is a property of the arrangement, not of the links, so it returns the
     * moment the arrangement does.
     *
     * The toggle that IS in the row today has its own floor, and that one is live — asserted in
     * `the toggle is a re-pointed IconButton reduced to its glyph` below.
     */
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
    /*
     * 🔴 READ FROM `public-shell.css`, NOT `home.css`, AND SCOPED `.pub-shell` NOT `.pub-nav-plain`.
     *
     * These rules were Home's alone — `home.css` is imported by `src/pages/index.astro` and nothing
     * else — so every other route rendered the design system's default: a bordered circle at `md`
     * rather than `lg`. Akhil: *"I need to ensure that the placement and look/feel of dark/light
     * mode toggle remains same on the hero page and all pages therein, like photography,
     * development, etc."* Moving them to the shell made one control for all ten routes, and the
     * selector had to widen from the plain arrangement's class to the one every route has.
     *
     * The assertions themselves are unchanged, which is the point of following the rules rather
     * than deleting the test: the claim was never Home-specific.
     */
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
    /*
     * COLOUR, NOT OPACITY, and the swap is a fix rather than a preference. The glyph used to sit at
     * `opacity: 0.7`; MEASURED, `.ds-atom-iconbtn:hover` paints `rgba(255, 255, 255, 0.08)` at a
     * specificity this file's `background-color: transparent` does not reach, so a 40px circle
     * appears under the glyph on hover — and a half-faded glyph inside a visible circle reads as a
     * disabled button. `--ink-3` → `--ink` gives the same recession with nothing to fade.
     */
    expect(shellCode, 'the toggle glyph lost its resting recession').toMatch(
      /\.pub-shell \.pub-toggle\s*\{[^}]*color:\s*var\(--ink-3\)/
    );
    expect(shellCode, 'the toggle stopped answering hover').toMatch(
      /\.pub-shell \.pub-toggle:hover\s*\{[^}]*color:\s*var\(--ink\)/
    );
    // And its motion is inside a no-preference query, where `home.css` no longer owns it.
    expect(shellCode, "the toggle's colour transition is unguarded").toMatch(
      /@media \(prefers-reduced-motion: no-preference\)[\s\S]{0,400}\.pub-shell \.pub-toggle\s*\{[^}]*transition-property:\s*color/
    );
    // The hover half of the same swap: colour, asserted just above, and there is no opacity to
    // return to full strength.

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

  /**
   * 🔴 THREE BECAME ONE ON 2026-09-02, AND THE COUNT IS STILL A COUNT RATHER THAN A FLOOR.
   *
   * §6.6.4 specified three named regions and this asserted exactly three. Two of them were Act 2's
   * — `aria-labelledby="hm-work-h"` (the development band) and `aria-labelledby="hm-resume-h"` (the
   * résumé band) — and both went with Act 2. What is left is the photographs, which is the whole
   * middle of the page.
   *
   * THE ROW ABOVE LOST ITS LANDMARK TOO, and that is a separate, deliberate change rather than a
   * consequence: the plain row is a `<div>` now, not a `<nav>`, because a navigation landmark
   * holding nothing but a theme toggle is somewhere a screen-reader user is sent for no reason. It
   * is asserted here as well as in the top-row block, because THIS is the file's landmark budget
   * and a `<nav>` creeping back would change it without touching the `<section>` count.
   *
   * An EQUALITY, not `toBeGreaterThan`. The reason is unchanged from when the number was three: a
   * fourth named region is a structural change to how the page is announced, and it should cost a
   * deliberate edit here.
   */
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
    /*
     * ANTI-VACUITY: the row itself really did render, as a `<div>`. It is deliberately NOT paired
     * with "and /development has a <nav>", because MEASURED on the built artefact, /development HAS
     * NONE EITHER:
     *
     *     <header class="ds-atom-appbar"> … <div style="display:flex;gap:18px"><a …>development</a> …
     *
     * 🟠 A FINDING, NOT A PASS. `AppBar` wraps its nav group in a plain `<div>`, so NO ROUTE ON
     * THIS SITE exposes a navigation landmark — a screen-reader user cannot jump to the site's
     * top-level map on any of the fifty-two documents. That is the design system's markup and not
     * this page's to change; recorded here because this is the file that counts landmarks, and
     * because "Home has no <nav>" reads like a Home decision until you check the others.
     */
    expect(html, 'the plain row is not in the document at all').toMatch(
      /<div class="pub-nav-plain">/
    );
  });
});
