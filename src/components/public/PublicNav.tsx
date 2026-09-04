/**
 * The public nav — logo, three nav links, and the theme toggle. Plan 05-06, Task 1; the second
 * arrangement (`variant="plain"`, Home) is 05-17.
 *
 * ================================================================================================
 * WHY THIS IS A `.tsx` AT ALL, WHEN ASTRO NAMED SLOTS DEMONSTRABLY WORK
 * ================================================================================================
 *
 * Both halves of that sentence were MEASURED against this repository's Astro 7 + @astrojs/react 6,
 * in a built page, not inferred.
 *
 * 1. NAMED SLOTS DO REACH A FRAMEWORK COMPONENT'S ReactNode PROPS, AND CLEANLY. A probe rendering
 *    `<AppBar><Fragment slot="nav">…three <Link>s…</Fragment></AppBar>` from `.astro` emitted:
 *
 *        <div style="display:flex;gap:18px">
 *          <a class="ds-atom-link" data-variant="default" …>work</a> …
 *
 *    The three anchors are DIRECT children of the bar's own flex row — there is no `<astro-slot>`
 *    wrapper, so the component's `gap: 18px` applies exactly as it would from React. The plan's
 *    `<interfaces>` §3 is right about slots.
 *
 * 2. IT DOES NOT REACH A ReactNode PROP THAT IS NOT A SLOT — and `IconButton`'s `icon` is one.
 *    `icon={<Sun size={16} />}` written in an `.astro` template FAILED THE BUILD:
 *
 *        Error: Objects are not valid as a React child
 *        (found: object with keys {htmlParts, expressions, error})
 *
 *    `{htmlParts, expressions, error}` is Astro's own `RenderTemplateResult`. Astro converts SLOTS
 *    to props; it does not turn a template expression into a React element, and `icon` has no slot
 *    name to be filled through. This is the same shape as `FilterNav`, whose `label: ReactNode`
 *    lives inside an array prop and which 05-07 needs a wrapper for.
 *
 *    It fails LOUDLY, at build time, which is the one good thing about it — unlike `class` vs
 *    `className`, it cannot ship a plausible-looking page.
 *
 * So the theme toggle needs React either way, and once one part of the bar is React the whole bar
 * is written once, in one mechanism, instead of split across two. `Footer` stays in the layout
 * because its `links` prop is PLAIN DATA (`Array<{label, href}>`), which crosses the boundary
 * without any of this.
 *
 * ================================================================================================
 * THIS SHIPS ZERO FRAMEWORK JAVASCRIPT (PUB-14, §5.2)
 * ================================================================================================
 *
 * There is NO `client:*` directive on this component anywhere. A React component rendered without
 * one becomes static HTML and no hydration script is emitted. The `"use client"` on every
 * design-system entry point is inert in Astro for the same reason (§1.3, MEASURED in Phase 5).
 *
 * Consequently THERE IS NO onClick HANDLER HERE and there must never be one: a React handler on a
 * component that never hydrates is dead code that reads as working. The toggle's behaviour is the
 * single inline script in `src/layouts/PublicLayout.astro`, bound by `id`.
 */

import { AppBar } from '@akhil-saxena/design-system/components/AppBar';
import { IconButton } from '@akhil-saxena/design-system/components/IconButton';
import { Link } from '@akhil-saxena/design-system/components/Link';
import { Moon, Sun } from '@akhil-saxena/design-system/icons';

/**
 * The nav, per OQ-6b: **work, photographs, résumé** — three items, not two.
 *
 * The reviewed Phase 0 captures show two; PUB-10 added a fourth route and Akhil resolved OQ-6b in
 * favour of adding it, because a recruiter should not have to scroll Home to find the résumé. The
 * "three still fit at 344" half of that resolution is no longer an inference: MEASURED in Chromium
 * at 344x882 with a coarse pointer, the bar renders the three links on ONE row
 * (`new Set(links.map(a => a.getBoundingClientRect().top)).size === 1`) with no horizontal scroll
 * (`scrollWidth === clientWidth === 344`).
 */
export const NAV_ITEMS: ReadonlyArray<{
  readonly href: string;
  readonly label: string;
  /*
   * NO `glyph` FIELD ANY MORE, and the reason the field existed is worth keeping: below 673px the
   * bar used to show `<>` and a camera instead of these words, because MEASURED at 390px the
   * wordmark ended at x131 and `development` began at x131 — zero gap, the two touching.
   *
   * The crowding was real; icons were the wrong cure. Akhil: *"on mobile, on header, im not liking
   * the icons for photo/dev ... it's all too cluttered."* What actually fits at 390 is ONE word,
   * and the item that can leave is the one pointing at the page you are already on — so the narrow
   * bar now names the section you are NOT in, in words, and the glyph vocabulary is gone with the
   * problem it was solving. `public-shell.css` carries the six-treatment measurement.
   */
}> = [
  { href: '/development', label: 'development' },
  { href: '/photography', label: 'photography' },
  // No `résumé`. The approved design carries TWO nav items and says why: "No résumé button on
  // home hero; résumé linked from Act-2 strip." The rebuild added a third. Akhil removed it on
  // 2026-08-30 along with the hero's Resume button, so the résumé is reached from Act 2's
  // `RÉSUMÉ →` link — one scroll from the landing, and the bar stays quiet.
];

/** The id the inline theme script binds its click listener to (`PublicLayout.astro`). */
export const THEME_TOGGLE_ID = 'pub-theme-toggle';

/**
 * The one route that carries NO wordmark in the bar. 05-16, and it is a design decision with a
 * source and a measurement rather than a tidy-up.
 *
 * ================================================================================================
 * THE HANDOFF SUPPRESSES THE WORDMARK ON HOME AND ONLY ON HOME — MEASURED, NOT INFERRED
 * ================================================================================================
 *
 *     design_handoff_portfolio/Work.dc.html:24    <a href="…Home…">akhil saxena</a>   present
 *     design_handoff_portfolio/Photos.dc.html:24  <a href="…Home…">akhil saxena</a>   present
 *     design_handoff_portfolio/Akhil Saxena - Home.dc.html:24                          ABSENT
 *
 * On Home the bar carries `work` and `photographs` and nothing else. That is consistent across
 * three files rather than an omission in one, and the reason is visible in any capture: Home's
 * `<h1>` is the SAME STRING at 60px, one hundred pixels below the bar. The wordmark is a way home
 * from everywhere else; on the page it points at, it is the site's name printed twice in one
 * viewport, and the smaller of the two is a link to where the reader already is.
 *
 * ------------------------------------------------------------------------------------------------
 * AND IT HAS A MEASURED COST, WHICH IS WHAT MOVED THIS FROM PREFERENCE TO DECISION
 * ------------------------------------------------------------------------------------------------
 *
 * MEASURED in Chromium on the built artefact, four widths x both pointers:
 *
 *     344 fine   bar 67px   --ds-appbar-h 57px   logo 63x42   anchors on 2 ROWS
 *     390 fine   bar 67px   --ds-appbar-h 57px   logo 61x42   anchors on 2 ROWS
 *     673 fine   bar 57px   --ds-appbar-h 57px   logo 92x21   anchors on 1 row
 *    1440 fine   bar 57px   --ds-appbar-h 57px   logo 92x21   anchors on 1 row
 *
 * The wordmark is the element that wraps: 92px of label into a 63px box, two lines, and the bar
 * paints 10px taller than the property that exists to tell a full-viewport section how much to
 * subtract. That is the one case `--ds-appbar-h`'s own docstring says it cannot promise ("squeeze
 * the row until it wraps and the bar will be taller than the property says"), and it is why
 * `home.css` §1's `--hm-bar-allowance` over-estimates by 15px at ten of twelve cells.
 *
 * ------------------------------------------------------------------------------------------------
 * WHAT IS *NOT* CHANGED: THE THIRD NAV LINK STAYS. THE HANDOFF SHIPS TWO AND WE SHIP THREE.
 * ------------------------------------------------------------------------------------------------
 *
 * The handoff's bar is `work` + `photographs` on all three pages; the résumé is reached from Act
 * 2's `RÉSUMÉ →` strip. Its README says so explicitly — *"No résumé button on home hero; résumé
 * linked from Act-2 strip"* — and that sentence is about the HERO and is already satisfied: there
 * is no résumé control in Act 1, and `RÉSUMÉ →` is exactly where it says.
 *
 * The nav is a separate question and it was answered LATER, by Akhil, as OQ-6b: three items, not
 * two, "because a recruiter should not have to scroll Home to find the résumé". A recorded owner
 * decision that postdates the design source and answers the same question wins over it. The nav
 * is also site-wide — 52 documents — and 05-16's scope is Home. So the divergence is reported and
 * kept, not silently reconciled in either direction.
 */
const WORDMARK_SUPPRESSED_ON = '/';

/**
 * How the bar is drawn.
 *
 * ================================================================================================
 * `plain` EXISTS BECAUSE `AppBar` IS THE WRONG COMPONENT FOR HOME, AND THAT IS A DESIGN DECISION
 * ================================================================================================
 *
 * Akhil, verbatim: *"I didn't agree with the header initially… the header is not required for such
 * a page."* The approved prototype agrees and is more specific than the sentence is —
 * `design_handoff_portfolio/Akhil Saxena - Home.dc.html` has **no bar at all**. Its top row is a
 * flex row of two muted links and a bordered circle, painted directly on the page background:
 *
 *     MEASURED in Chromium at 1280x860 against the prototype --
 *       row          padding 26px 40px 0    height 70    NO background, NO bottom edge
 *       nav link     x = 40    13.5px / 500 / #8F8B82,  hover -> #EAE7E0,  NOT underlined
 *       toggle       42 x 42   border 1px #33332F   border-radius 50%   x = 1196 (right edge 1240)
 *
 * `AppBar` cannot express that, and the reason was MEASURED before it was asserted:
 *
 *     primitives.css `.ds-atom-appbar`   background: var(--surf-2);  backdrop-filter: blur(14px);
 *     tokens.css     dark                --surf-2: rgba(255, 255, 255, 0.055)
 *
 * A frosted band lifted 5.5% off `#0d0d0f` — faint, but a hard horizontal edge across the full
 * width of the viewport, and it is the "header" in the capture Akhil rejected. `AppBarVariant` is
 * `minimal | withSearch | default | centered` (MEASURED, `dist/components/AppBar.d.ts`) and NONE of
 * the four drops the fill: grepping `primitives.css` for `.ds-atom-appbar[data-variant=…]` returns
 * three rules, all of them about the lead and actions groups, none about `background`. There is no
 * `transparent` prop and no `bordered={false}`. So this is not a case of reaching past the right
 * prop — it is a surface the component does not have.
 *
 * **AND IT DID NOT NEED TO BE A COMPONENT AT ALL.** The prototype's row is two `Link`s and one
 * `IconButton` in a flex row. Both are design-system primitives, both compose freely, and arranging
 * two of them in a row is precisely what QUAL-03 calls layout. Reaching for `AppBar` and then
 * shipping its band was the error; composing the primitives is not a workaround around a missing
 * component, it is the design system being used at the level the design actually asks for.
 *
 * So `bar` (every other route) and `plain` (Home) are two arrangements of the same three
 * ingredients, and the `bar` arrangement is untouched by this plan — 51 documents keep the AppBar
 * they already had.
 */
export type PublicNavVariant = 'bar' | 'plain' | 'rail';

export interface PublicNavProps {
  /** The site name, from `data/home_config.json`. Never typed here — see the layout. */
  siteTitle: string;
  /** `Astro.url.pathname`, so the current section can be announced. */
  pathname: string;
  /** `bar` everywhere; `plain` on Home, which the design gives no bar. @default 'bar' */
  variant?: PublicNavVariant;
}

/**
 * `aria-current="page"` on the nav entry for the section being viewed.
 *
 * Prefix-matched, not equality-matched: `/photography/architecture` and `/photography/architecture/singapore`
 * are both inside "photographs", and a nav that announces nothing on 47 of the 49 pages is a nav
 * that announces nothing. `/` matches no item on purpose — Home is the logo, not a nav entry, and
 * marking a nav item current on a page it does not point at is worse than marking none.
 */
function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The theme toggle, shared by both arrangements so the two cannot drift apart.
 *
 * `size` is the ONE difference between them and it is a measurement, not a preference. MEASURED,
 * `primitives.css`: `.ds-atom-iconbtn[data-size="lg"]` is 40x40 and `[data-size="md"]` is 32x32.
 * The prototype's toggle is 42x42, so `lg` is the rung that lands within 2px of the design; the bar
 * keeps `md` (the default) because `--ds-appbar-h` is derived from a 32px control and a 40px one in
 * the actions slot would make the bar taller than the property every full-viewport section on the
 * site subtracts.
 *
 * The circle and its edge are NOT drawn here. `.ds-atom-iconbtn` already carries
 * `border: 1px solid transparent` and `border-radius: var(--radius-md)`, and the component's own
 * docstring names the handover: *"All styling lives in primitives.css under `.ds-atom-iconbtn`, so
 * a composing component can restyle it through the cascade by passing its own className."* So
 * `home.css` re-points two properties that already exist at two tokens that already exist —
 * `--radius-full` and `--rule-strong` — which is (T) under QUAL-03, a handover, not an origination.
 * Nothing about the control is re-implemented.
 */
/*
 * NO `size` PROP. It took one, and the two call sites passed DIFFERENT values — `lg` on Home, `md`
 * in the bar — so the control a visitor learned on Home was a different size on every other page.
 * Akhil: *"I need to ensure that the placement and look/feel of dark/light mode toggle remains same
 * on the hero page and all pages therein."* A prop whose only job was to differ is the wrong shape
 * for that, so it is gone rather than merely passed the same value twice: the size cannot drift
 * again if there is nothing to pass.
 */
function ThemeToggle() {
  return (
    <IconButton
      id={THEME_TOGGLE_ID}
      className="pub-toggle"
      size="lg"
      /* `label` IS the accessible name — IconButton maps it to `aria-label` and marks the
         glyph `aria-hidden`. It is deliberately state-neutral: the button is static HTML and
         the inline script only toggles a class, so a name saying "Switch to light" would be a
         lie in one of the two states, on every page, with nothing to catch it. */
      label="Switch between the dark and light theme"
      /* BOTH glyphs are rendered and CSS shows one, keyed off `.dark` on <html>. That is what
         keeps the toggle correct with ZERO JavaScript beyond the class flip: swapping the icon
         in script would mean the first painted frame shows the wrong glyph for a returning
         light-mode visitor — the same flash PUB-12 exists to prevent, moved into the icon.
         The spans, rather than a className on the icon itself, so this does not depend on
         whether the design system's `Icon` forwards `className` to its lucide child. */
      icon={
        <>
          <span className="pub-theme-icon pub-theme-icon-sun">
            <Sun size={16} />
          </span>
          <span className="pub-theme-icon pub-theme-icon-moon">
            <Moon size={16} />
          </span>
        </>
      }
    />
  );
}

export function PublicNav({ siteTitle, pathname, variant = 'bar' }: PublicNavProps) {
  const showWordmark = pathname !== WORDMARK_SUPPRESSED_ON;

  /*
   * `quiet` on the plain row and `default` in the bar, and the difference is the design rather
   * than a tidy-up. MEASURED, `primitives.css`:
   *
   *     [data-variant="default"]  color: var(--ink-2);  text-decoration: underline;
   *     [data-variant="quiet"]    color: var(--ink-3);  text-decoration: none;
   *          :hover               color: var(--ink);    text-decoration: underline;
   *
   * The prototype's nav is `#8F8B82` (the muted step), NOT underlined, and goes to `#EAE7E0` on
   * hover. That is `quiet`, exactly, with no app CSS at all — and shipping `default` is why the
   * rejected capture has three underlined links where the design has three quiet ones. Both are
   * stylesheet-only variants, so neither smuggles the `rgba(0, 0, 0, 0.25)` underline that D-4
   * files against `inline`, `footer` and `action`. Do not "improve" either to `inline`.
   */
  /*
   * `quiet` ON BOTH ARRANGEMENTS, NOT ONLY `plain`. This was `variant === 'plain' ? 'quiet' :
   * 'default'`, and the `plain` branch below renders no links at all — so the ternary's true side
   * was unreachable and every link the site ships was `default`, i.e. UNDERLINED. Akhil, on the
   * result: *"The header currently has no styling. Nothing at all."* Three underlined anchors in a
   * row is what a browser does with no stylesheet, so the bar read as unstyled markup.
   *
   * `quiet` is `--ink-3` with no underline (primitives.css:7490). The wordmark takes it too and is
   * lifted back to full `--ink` in app CSS, so the brand outranks the nav rather than sitting level
   * with it — a hierarchy the single `default` variant could not express at all.
   */
  const navVariant = 'quiet';

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      variant={navVariant}
      className="pub-nav-link"
      aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
    >
      {/* NO GLYPH. The bar was `<>` and a camera below 673px and words above it; it is words at
          every width now, and on a narrow screen it shows only the section you are NOT on. Akhil:
          *"on mobile, on header, im not liking the icons for photo/dev ... it's all too
          cluttered."* The span is REMOVED rather than hidden — a `display: none` glyph would still
          ship two SVGs and 0.6KB to every reader on every route to render nothing. `public-shell.css`
          carries the measurements behind the choice. */}
      <span className="pub-nav-text">{item.label}</span>
    </Link>
  ));

  /*
   * Home. Two design-system primitives in a flex row, painted on the page background.
   *
   * `<nav>` rather than a bare `<div>`, and it is NOT given an `aria-label`: §6.6.4 specifies
   * three named landmarks on this page and `test/public/home.node.test.ts` counts them. An
   * unlabelled `<nav>` is still a navigation landmark for a screen-reader user and is still the
   * right element for a list of links; naming it would make a fourth.
   *
   * It is in normal flow and NOT sticky — "fixed-flow, not sticky" is the handoff's own wording,
   * and on this page it is load-bearing rather than cosmetic. The `<h1>` docks into the top-left
   * corner as the reader scrolls (see `home.css` §4); a sticky row would still be sitting in that
   * corner when it arrived, and the two would collide. In flow, the row has scrolled out of the
   * viewport 64px before the name starts moving, so the corner it docks into is empty.
   */
  if (variant === 'plain') {
    /*
     * NO NAV LINKS IN THE PLAIN ROW — Akhil, 2026-09-02, once Home became a single screen.
     *
     * Home's two doors ARE the navigation now: `Photography →` and `Development →` sit under the
     * photographs as the page's only choice, so a `development · photography` pair in the row above
     * was the same two destinations offered twice, in a weaker treatment, on a page with nothing
     * else on it.
     *
     * `NAV_ITEMS` is untouched — the AppBar arrangement below still renders it on every OTHER route,
     * where the links are the only navigation there is. This is a Home-only omission, not a
     * deletion.
     *
     * A `<div>` rather than a `<nav>`: a navigation landmark with no navigation in it is a landmark
     * a screen-reader user is sent to for nothing. The toggle is a control, not a destination.
     */
    return (
      <div className="pub-nav-plain">
        <ThemeToggle />
      </div>
    );
  }

  if (variant === 'rail') {
    /*
     * THE NAV ROW WITHOUT THE BAR AROUND IT — the split layout's arrangement.
     *
     * `Split Page Refinements.html` treatment A puts the identity in a left rail and says *"no top
     * header at all"*, so the AppBar cannot render: its wordmark would be the second on the page.
     * What the page still needs is the two destinations and the theme toggle.
     *
     * IT IS A VARIANT HERE RATHER THAN MARKUP IN THE PAGE, and the toggle is the reason. The shell's
     * inline script binds it by DELEGATION — `closest('#pub-theme-toggle')` on a document listener —
     * so a second implementation would work and would be a second implementation: two places that
     * must both keep the id, both render both glyphs so the first painted frame is right, and both
     * carry the state-neutral label. `ThemeToggle` is composed once and every arrangement gets it.
     *
     * `<nav>` with no `aria-label`, matching the bar: §6.6.4 wants no label, and an unlabelled nav
     * is still a landmark. The toggle sits OUTSIDE it — it is a control, not a destination.
     */
    return (
      <div className="pub-nav-rail wk-nav-rail">
        <nav className="pub-nav-rail-links">{navLinks}</nav>
        <ThemeToggle />
      </div>
    );
  }

  return (
    <AppBar
      /*
       * `false`, NOT `undefined` — and the difference is a design-system finding, filed as D-23.
       *
       * MEASURED, `chunk-Q7KBVLX4.js:77`: `const logoNode = logo ?? <DefaultLogo />`. Nullish
       * coalescing, so OMITTING the prop does not mean "no wordmark" — it means "render the design
       * system's own ink box captioned DS", on the consumer's primary route. There is no
       * `logo={null}` path either, for the same reason.
       *
       * `false` is a member of `ReactNode`, is not nullish, and React renders nothing for it, so
       * this is the one spelling inside the component's declared contract that produces an empty
       * lead. It is a gap in the API rather than a workaround around it — `AppBar` should take a
       * surface with no wordmark as a first-class case — and it is filed rather than absorbed (D-23).
       */
      logo={
        showWordmark ? (
          <Link
            href="/"
            variant="quiet"
            className="pub-logo"
            /*
             * THE SERIF IS PASSED, NOT OVERRIDDEN. `Link` builds its inline style as
             * `{...baseStyle, ...variantInline, ...color, ...style}` — the `style` prop is spread
             * LAST, so it beats `baseStyle.fontFamily: var(--font)` by the ordinary rules. Doing
             * this from `src/styles/` instead would need `!important` to outrank an inline
             * declaration, and that file tree is under a zero-`!important` policy. The component
             * offered a door; this uses it.
             */
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {siteTitle}
          </Link>
        ) : (
          false
        )
      }
      nav={navLinks}
      actions={<ThemeToggle />}
    />
  );
}
