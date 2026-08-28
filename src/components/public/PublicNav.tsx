/**
 * The public AppBar — logo, three nav links, and the theme toggle. Plan 05-06, Task 1.
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

export interface PublicNavProps {
  /** The site name, from `data/home_config.json`. Never typed here — see the layout. */
  siteTitle: string;
  /** `Astro.url.pathname`, so the current section can be announced. */
  pathname: string;
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

export function PublicNav({ siteTitle, pathname }: PublicNavProps) {
  return (
    <AppBar
      logo={
        <Link href="/" variant="default" className="pub-logo">
          {siteTitle}
        </Link>
      }
      nav={NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          /* `default` and `quiet` are the only two stylesheet-only variants. §4.6a MEASURED that
             `inline`, `footer` and `action` set `color` as an INLINE style, which beats any app
             rule at (0,1,0) while every jsdom test still passes, because jsdom implements no CSS
             specificity. Three consecutive Phase 1 plans hit this and 01-11 shipped a grey link
             inside a red error box. Do not "improve" this to `inline`. */
          variant="default"
          aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
      actions={
        <IconButton
          id={THEME_TOGGLE_ID}
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
      }
    />
  );
}
