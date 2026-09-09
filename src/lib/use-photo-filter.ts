import { useEffect } from 'react';

import {
  COUNT_ID,
  categoryFromPathname,
  columnsFor,
  countLineFor,
  FILTER_EVENT,
  type FilterCategory,
  GRID_CATEGORY_ATTRIBUTE,
  isVisibleIn,
  TILE_CATEGORY_ATTRIBUTE,
  TITLE_ID,
} from './photo-filter';

export interface UsePhotoFilterOptions {
  readonly categories: readonly FilterCategory[];
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

    const rail = document.querySelector<HTMLElement>('.ph-filters');
    if (rail === null) return;

    const tiles = Array.from(grid.querySelectorAll<HTMLElement>('.ph-tile'));
    const pills = Array.from(rail.querySelectorAll<HTMLAnchorElement>('a[href]'));

    const apply = (category: string) => {
      for (const tile of tiles) {
        const own = tile.getAttribute(TILE_CATEGORY_ATTRIBUTE);
        if (own === null) continue;
        tile.hidden = !isVisibleIn(own, category);
      }

      grid.setAttribute(GRID_CATEGORY_ATTRIBUTE, category);
      grid.dataset.cols = String(columnsFor(category, categories, defaultColumns));

      const visible = tiles.filter((tile) => !tile.hidden).length;

      const count = document.getElementById(COUNT_ID);
      if (count !== null) count.textContent = countLineFor(category, visible, total);

      for (const pill of pills) {
        const isCurrent = categoryFromPathname(pill.pathname, categories) === category;
        if (isCurrent) pill.setAttribute('aria-current', 'page');
        else pill.removeAttribute('aria-current');
        if (isCurrent) pill.dataset.active = 'true';
        else pill.removeAttribute('data-active');
      }

      document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: { category } }));
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('.ph-filters a[href]');
      if (anchor === null || anchor === undefined) return;
      if (anchor.origin !== window.location.origin) return;

      const next = categoryFromPathname(anchor.pathname, categories);
      event.preventDefault();

      if (grid.getAttribute(GRID_CATEGORY_ATTRIBUTE) !== next) {
        window.history.pushState({ category: next }, '', anchor.href);
      }
      apply(next);
    };

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
