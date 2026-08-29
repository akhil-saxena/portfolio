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
export const NAV_ITEMS: ReadonlyArray<{ readonly href: string; readonly label: string }> = [
  { href: '/work', label: 'work' },
  { href: '/photos', label: 'photographs' },
  { href: '/resume', label: 'résumé' },
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
export type PublicNavVariant = 'bar' | 'plain';

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
 * Prefix-matched, not equality-matched: `/photos/architecture` and `/photos/architecture/singapore`
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
function ThemeToggle({ size }: { size: 'md' | 'lg' }) {
  return (
    <IconButton
      id={THEME_TOGGLE_ID}
      className="pub-toggle"
      size={size}
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
  const navVariant = variant === 'plain' ? 'quiet' : 'default';

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      variant={navVariant}
      className="pub-nav-link"
      aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
    >
      {item.label}
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
    return (
      <nav className="pub-nav-plain">
        <div className="pub-nav-links">{navLinks}</div>
        <ThemeToggle size="lg" />
      </nav>
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
          <Link href="/" variant="default" className="pub-logo">
            {siteTitle}
          </Link>
        ) : (
          false
        )
      }
      nav={navLinks}
      actions={<ThemeToggle size="md" />}
    />
  );
}
