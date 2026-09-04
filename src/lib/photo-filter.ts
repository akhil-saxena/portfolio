/**
 * The gallery's filter contract, shared by the server that renders the first view and the island
 * that switches every view after it.
 *
 * ================================================================================================
 * WHY THIS EXISTS AS A MODULE AND NOT AS TWO COPIES
 * ================================================================================================
 *
 * Filtering used to be routing: `/photography/architecture` was a separate prerendered document, so
 * every click on a pill was a full navigation. Akhil: *"when i click any filter button or anything.
 * why does the whole page reload, it shouldnt. Only the images should get filtered, without page
 * reload."*
 *
 * The eight routes are KEPT — they are prerendered, canonical, crawlable and they work with
 * JavaScript off. What changed is that each one now renders EVERY photograph and marks the
 * non-matching ones `hidden`, with the active category written on the grid. That makes the first
 * paint identical to what it was, and it makes the switch a DOM attribute rather than a request.
 *
 * Which means the same four facts — heading, count line, column count, which tiles show — are
 * derived twice: once in Astro at build, once in the browser on a click. Deriving them in two
 * places is how the two views drift, so both callers import from here.
 */

/** The grid's element id. The lightbox already takes it as a selector; so does the controller. */
export const GRID_ID = 'ph-grid';

/** The heading's element id — the controller rewrites its text on a switch. */
export const TITLE_ID = 'ph-title';

/** The count line's element id — likewise. */
export const COUNT_ID = 'ph-count';

/** The sentinel for "no category", i.e. the `/photography` view. NEVER a category id. */
export const ALL = 'all';

/** What the grid carries so CSS and the controller can both read the active view. */
export const GRID_CATEGORY_ATTRIBUTE = 'data-category';

/** What each tile carries so it can be matched without consulting the record it came from. */
export const TILE_CATEGORY_ATTRIBUTE = 'data-cat';

/** Broadcast on `document` after a switch, so the lightbox can narrow its own item list. */
export const FILTER_EVENT = 'ph:filter';

export interface FilterCategory {
  readonly id: string;
  readonly label: string;
  readonly columns: number;
}

/**
 * `/photography` → `all`; `/photography/nature` → `nature`; a trailing slash is tolerated because
 * `Astro.url.pathname` carries one under some `trailingSlash` settings and a mismatch here would
 * silently mark nothing active.
 *
 * An UNKNOWN segment returns `all` rather than itself. That matters: the value is written into an
 * attribute and compared against tile attributes, so an unrecognised id would hide every tile and
 * render an empty gallery that looks like a content state.
 */
export function categoryFromPathname(
  pathname: string,
  categories: readonly FilterCategory[]
): string {
  const trimmed = pathname.replace(/\/+$/, '');
  const segment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  if (segment === '' || segment === 'photography') return ALL;
  return categories.some((category) => category.id === segment) ? segment : ALL;
}

/*
 * `headingFor` IS DELETED, AND ITS ONLY CALLER WAS THE THING THAT WAS WRONG.
 *
 * It returned "Photographs" for the all view and the category's own label otherwise, and the filter
 * island called it to rewrite the `<h1>` on every pill click. Akhil: *"Photographs page should not
 * have title changing on filters. keep it stuck at Photographs."* With that call gone the function
 * had no callers at all — the pre-rendered category routes set their own heading from
 * `{category.label}` directly and never used it.
 *
 * `ALL_HEADING` GOES WITH IT rather than being kept as "the page's title": the title now lives in
 * exactly one place per route, in the markup, which is where a heading that never changes belongs.
 * A constant read by nothing is a second source of truth waiting for someone to trust it.
 */

/**
 * §13.3: every count is derived, no literal appears in any copy string.
 *
 * ONE SHAPE FOR BOTH VIEWS. `/photography` used to read `40 photographs — all of them` while a
 * category read `14 photographs`, so the two views had two spellings and the switch between them
 * changed the words as well as the number. Akhil removed the tail on 2026-09-02, which collapses
 * the two into one expression — and on the `all` view `visible` IS `total`, so the branch that
 * distinguished them had nothing left to decide.
 *
 * `category` and `total` are still taken. They are not used, and that is deliberate: the caller
 * that switches views passes all three, and a signature that narrows to what today's copy happens
 * to need would have to widen again the moment the `all` view wants different words. Marked with
 * `void` so the linter agrees rather than being silenced.
 */
export function countLineFor(category: string, visible: number, total: number): string {
  void category;
  void total;
  return `${visible} ${visible === 1 ? 'photograph' : 'photographs'}`;
}

export function columnsFor(
  category: string,
  categories: readonly FilterCategory[],
  defaultColumns: number
): number {
  if (category === ALL) return defaultColumns;
  return categories.find((c) => c.id === category)?.columns ?? defaultColumns;
}

/** Does this photograph belong in this view? The one place the `all` sentinel is interpreted. */
export function isVisibleIn(photoCategory: string, activeCategory: string): boolean {
  return activeCategory === ALL || photoCategory === activeCategory;
}
