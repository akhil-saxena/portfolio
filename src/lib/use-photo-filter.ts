import { useEffect } from 'react';

import {
  COUNT_ID,
  categoryFromPathname,
  columnsFor,
  countLineFor,
  FILTER_EVENT,
  type FilterCategory,
  GRID_CATEGORY_ATTRIBUTE,
  headingFor,
  isVisibleIn,
  TILE_CATEGORY_ATTRIBUTE,
  TITLE_ID,
} from './photo-filter';

/**
 * Turns the filter rail from eight navigations into one attribute.
 *
 * ================================================================================================
 * A HOOK, NOT A SECOND ISLAND — AND THE GATE IS WHAT FOUND THAT
 * ================================================================================================
 *
 * This was written as `PhotoFilterController`, an island of its own with `client:load`. It built,
 * it worked, and `gate:public-js` refused it on two counts:
 *
 *     x [A3-COUNT] dist/client/photography/index.html: carries 2 <astro-island> element(s);
 *                  exactly one is permitted.
 *     x [A6-APP]   APP client JavaScript is 19,705 B, over the 19,000 B ceiling by 705 B
 *
 * Both were correct, and the second was a consequence of the first: a second island is a second
 * entry chunk with its own hydration glue, for a listener that belongs on an element another island
 * is already listening to. `PhotoLightbox` takes the grid's selector, attaches a delegated click
 * handler to it, and now has to know the active category anyway to narrow next/prev. So the filter
 * is the same island's second concern rather than a second island's first.
 *
 * Kept as a HOOK in its own module rather than inlined, so the two concerns stay legible apart and
 * this one can be tested without opening a lightbox.
 *
 * ================================================================================================
 * IT RENDERS NOTHING, AND IT DOES NOT OWN THE RAIL
 * ================================================================================================
 *
 * `PhotoFilters` stays a plain Astro-rendered `FilterNav` — real anchors, real `href`s, prerendered
 * pages behind every one of them. This island attaches ONE delegated listener above them and
 * intercepts the click. That is the same shape `PhotoLightbox` already uses on the grid, and it is
 * chosen for the same reason: with JavaScript off, or in the window before hydration, every pill is
 * still a working link to a document that renders the same view. The enhancement is removable
 * without removing the feature.
 *
 * Hydrating `PhotoFilters` itself would have worked too — its props are plain JSON. It is not done
 * because then the rail's markup would exist twice (once from Astro, once from React) and the
 * no-JavaScript path would depend on React's output matching Astro's.
 *
 * ================================================================================================
 * WHAT A SWITCH HAS TO CHANGE, WHICH IS MORE THAN THE TILES
 * ================================================================================================
 *
 * Discovered by reading the two routes rather than assumed — the eight documents differed in six
 * ways, not one:
 *
 *   1. which tiles show          `hidden` on each `.ph-tile`
 *   2. the grid's column count   `nature` is 2 columns, `architecture` is 3 (`site_config.json`)
 *   3. the heading               "Photographs" vs the category's label
 *   4. the count line            "40 photographs — all of them" vs "14 photographs"
 *   5. which pill is current     `aria-current="page"`
 *   6. the address              so Back works and the view is still shareable
 *
 * Miss any one and the page is subtly lying: a 3-column grid of 2-column photographs, or a heading
 * that says Photographs over eight of them. Every one of the six is derived in `photo-filter.ts`,
 * which the server also uses, so the two paths cannot disagree.
 *
 * The lightbox is the seventh, and it is not done here — this dispatches `ph:filter` and the
 * lightbox narrows its own item list, because its index remapping is its own business.
 */
export interface UsePhotoFilterOptions {
  readonly categories: readonly FilterCategory[];
  /** The whole corpus's size — the `all` count line's only source. */
  readonly total: number;
  readonly defaultColumns: number;
  readonly gridSelector: string;
}

export function usePhotoFilter({
  categories,
  total,
  defaultColumns,
  gridSelector,
}: UsePhotoFilterOptions): void {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>(gridSelector);
    if (grid === null) return;

    /*
     * The rail is found through the grid's own document rather than by a second selector prop: one
     * `<nav>` with this label per page, and `PhotoFilters` owns the label.
     */
    const rail = document.querySelector<HTMLElement>('.ph-filters');
    if (rail === null) return;

    const tiles = Array.from(grid.querySelectorAll<HTMLElement>('.ph-tile'));
    const pills = Array.from(rail.querySelectorAll<HTMLAnchorElement>('a[href]'));

    const apply = (category: string) => {
      for (const tile of tiles) {
        const own = tile.getAttribute(TILE_CATEGORY_ATTRIBUTE);
        /*
         * A tile with no category attribute is left ALONE rather than hidden. Hiding it would turn
         * one bad record into an invisible photograph; leaving it visible in every view is wrong in
         * a way somebody can see and report.
         */
        if (own === null) continue;
        tile.hidden = !isVisibleIn(own, category);
      }

      grid.setAttribute(GRID_CATEGORY_ATTRIBUTE, category);
      grid.dataset.cols = String(columnsFor(category, categories, defaultColumns));

      const visible = tiles.filter((tile) => !tile.hidden).length;

      const title = document.getElementById(TITLE_ID);
      if (title !== null) title.textContent = headingFor(category, categories);

      const count = document.getElementById(COUNT_ID);
      if (count !== null) count.textContent = countLineFor(category, visible, total);

      for (const pill of pills) {
        const isCurrent = categoryFromPathname(pill.pathname, categories) === category;
        /*
         * `aria-current` is REMOVED, not set to "false". `aria-current="false"` is a valid value
         * meaning "not current", but it is announced by some screen readers as a state on every
         * pill, which is noisier than the eight-anchor rail already is.
         */
        if (isCurrent) pill.setAttribute('aria-current', 'page');
        else pill.removeAttribute('aria-current');
        /*
         * REMOVED, NEVER SET TO "false". `primitives.css:3704` is
         * `.ds-atom-segmented-btn[data-active] { background: var(--amber); color: var(--ink-inverse) }`
         * — an ATTRIBUTE-PRESENCE selector, not a value match. So `data-active="false"` reads to the
         * design system as ACTIVE, and this line used to write it onto every pill the visitor had
         * NOT chosen.
         *
         * Akhil saw the result: *"clicking on filter pills in dark mode has a weird effect, the
         * non selected items pill's turn full white, fix this."* Exactly that — five pills filled
         * `--amber` and one left outlined, i.e. the selection inverted, and only after a click
         * because the server-rendered markup sets the attribute on the active pill alone.
         *
         * This repository's own rules use `[data-active="true"]` and were therefore right about
         * which pill was current while the design system was painting the other five. Filed D-30.
         */
        if (isCurrent) pill.dataset.active = 'true';
        else pill.removeAttribute('data-active');
      }

      document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: { category } }));
    };

    const onClick = (event: MouseEvent) => {
      /*
       * MODIFIED CLICKS ARE NOT OURS. Cmd/Ctrl-click, shift-click, middle-click and a non-primary
       * button all mean "open this somewhere else", and the pill IS a real URL — so letting the
       * browser handle it is not a fallback, it is the correct behaviour. Intercepting them would
       * make a filter rail the one place on the site where opening a link in a new tab silently
       * does nothing.
       */
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('.ph-filters a[href]');
      if (anchor === null || anchor === undefined) return;
      if (anchor.origin !== window.location.origin) return;

      const next = categoryFromPathname(anchor.pathname, categories);
      event.preventDefault();

      /*
       * pushState even when the category is unchanged is avoided — clicking the pill you are
       * already on should not grow the history stack, or Back would appear broken.
       */
      if (grid.getAttribute(GRID_CATEGORY_ATTRIBUTE) !== next) {
        window.history.pushState({ category: next }, '', anchor.href);
      }
      apply(next);
    };

    /*
     * BACK AND FORWARD. Derived from the address rather than from the pushed state object, because
     * `popstate` also fires for entries this island never pushed — a deep link into a category,
     * navigated away from and returned to.
     */
    const onPopState = () => {
      apply(categoryFromPathname(window.location.pathname, categories));
    };

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
    };
  }, [categories, total, defaultColumns, gridSelector]);
}
