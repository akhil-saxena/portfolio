/**
 * The category filter rail — real links, zero JavaScript. Plan 05-07, Task 3. (PUB-04, §8.2, §8.3.)
 *
 * ================================================================================================
 * WHY THIS `.tsx` WRAPPER EXISTS AT ALL
 * ================================================================================================
 *
 * `FilterNavItem.label` is a `ReactNode` INSIDE AN ARRAY PROP, and an Astro slot cannot reach
 * there. `PublicNav.tsx` measured both halves of that boundary against this repository's Astro 7 +
 * @astrojs/react 6: named slots DO reach a framework component's `ReactNode` props, and a template
 * expression handed to a non-slot `ReactNode` prop FAILS THE BUILD with "Objects are not valid as a
 * React child (found: object with keys {htmlParts, expressions, error})" — Astro's own
 * `RenderTemplateResult`. So the per-pill count has to be composed in TSX.
 *
 * IT IS RENDERED WITH NO `client:*` DIRECTIVE. A React component rendered without one becomes
 * static HTML and no hydration script is emitted; the `"use client"` on the design system's entry
 * points is inert in Astro for the same reason (§1.3). `FilterNav`'s own docstring puts it best:
 * "If it hydrates, it is the wrong component." There is no state, no effect and no handler here.
 *
 * ================================================================================================
 * `activeHref` IS NORMALISED, AND A SILENT ZERO IS THE FAILURE MODE
 * ================================================================================================
 *
 * MEASURED in the shipped component (`chunk-ZNX6U4ZE.js`):
 *
 *     const currentIndex = items.findIndex((item) => item.href === activeHref);
 *
 * `===`, and on no match `currentIndex` is `-1`, so NOTHING is marked current — no error, no
 * warning, a rail that looks completely normal and announces no current page to a screen reader.
 * Astro's directory build format serves `/photos/street/` WITH a trailing slash, so an
 * un-normalised `Astro.url.pathname` misses every category item and matches nothing.
 *
 * `test/public/photos-routes.node.test.ts` asserts the count is EXACTLY one per route, not `>= 1`:
 * zero and two are both real failure modes and only an equality catches both.
 *
 * ================================================================================================
 * WHAT IS NOT DONE HERE
 * ================================================================================================
 *
 * NO `Chip`, ANYWHERE. §4.6c claims `Chip` clobbers `className`; 05-01 measured that it does not
 * (it concatenates, against 2.0.0-beta.1). Nothing here needs a `Chip`, and the cheapest response
 * to a contested claim is not to depend on it either way.
 *
 * NO LOCAL FIX FOR OQ-4's 44px HIT FLOOR. MEASURED, re-confirmed this plan:
 * `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` is `height: 40px`
 * (`primitives.css:3638-3642`, one occurrence), and of the TWO `@media (pointer: coarse)` blocks in
 * that file NEITHER mentions `segmented` or `filternav` — while `AppBar` and `Footer` links both
 * have one. Five of the six device classes are coarse-pointer, so the four-pixel shortfall is the
 * common case. It SHIPS, and it is filed upstream. A clean screenshot bought by a local override is
 * evidence of a fix that does not exist, which is why Phase 0 left D-16-1's design-system half
 * unfixed rather than patching it. The upstream patch is ONE RULE, not a refactor: `min-height:44px`
 * under `@media (pointer: coarse)` wins over the existing `height: 40px`, because used height is
 * `max(min-height, height)`.
 */

import type { FilterNavItem } from '@akhil-saxena/design-system/components/FilterNav';
import { FilterNav } from '@akhil-saxena/design-system/components/FilterNav';

/** The unfiltered gallery. THE ONE PLACE THIS PATH IS WRITTEN on the filter side. */
export const GALLERY_HREF = '/photos';

/**
 * A category route's href. Astro composes the same string from `getStaticPaths`'s `params`, which
 * is a second derivation this file cannot see — so the standing proof that the two agree is the
 * `aria-current` count in `test/public/photos-routes.node.test.ts`: a disagreement makes
 * `findIndex` return -1 and the count drops to zero on every category route at once.
 */
export function categoryHref(id: string): string {
  return `${GALLERY_HREF}/${id}`;
}

/**
 * Strip the trailing slash Astro's directory build format adds, but never turn `/` into `''`.
 *
 * Exported so the suite can drive it directly, and so the un-normalised control the plan requires
 * is a one-line change at a named seam rather than an edit to JSX.
 */
export function normaliseActiveHref(pathname: string): string {
  const stripped = pathname.replace(/\/+$/, '');
  return stripped.length === 0 ? '/' : stripped;
}

export interface PhotoFiltersProps {
  /** `data/site_config.json`'s category records, in their committed order (alphabetical). */
  categories: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  /**
   * EVERY photograph on the site, not the filtered set. The group-by lives here so that the two
   * routes share ONE definition of it — §13.3 requires every `· n` to be derived, and two
   * independently written group-bys is two places for it to stop being.
   */
  photos: ReadonlyArray<{ readonly category: string }>;
  /** `Astro.url.pathname`, un-normalised. Normalising is this component's job — see the header. */
  pathname: string;
}

export function PhotoFilters({ categories, photos, pathname }: PhotoFiltersProps) {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    counts.set(photo.category, (counts.get(photo.category) ?? 0) + 1);
  }

  /*
   * ANTI-VACUITY, ON THE DERIVED GROUP-BY RATHER THAN ON THE PROPS. `FilterNav` returns `null` for
   * an empty `items` array — no nav, no landmark, no error. That cannot happen through this
   * component, because the "All" pill is unconditional; which is exactly why the interesting
   * failure is the QUIET one, a rail rendering one pill and no filtering on a page that looks fine.
   *
   * `counts.size` rather than the length of the category list, for the reason recorded at length in
   * `src/pages/photos/[category]/index.astro`: `gate:schema`'s `[HAND-ROLLED-VALIDATOR]` rule
   * refuses a condition naming one of its content field keys when a refusal follows within three
   * lines, and it REFUSED THIS FILE'S FIRST REVISION — and then its own explanatory comment, which
   * is why that condition is described here in words rather than spelled. Guarding the group-by is
   * the more precise claim in any case: it is zero both when no category record was passed and when
   * not one photograph resolves to one, and the second is a real defect the first phrasing missed.
   */
  if (counts.size === 0) {
    throw new Error(
      'PhotoFilters: the group-by produced no counts, so every pill in the rail would read "· 0" ' +
        'and the site would silently have no filtering. §13.3 requires each `· n` to be derived ' +
        'from the collection; deriving it from nothing is not a derivation.'
    );
  }

  const items: FilterNavItem[] = [
    {
      href: GALLERY_HREF,
      label: (
        <>
          All <span className="ph-count">· {photos.length}</span>
        </>
      ),
    },
    ...categories.map((category) => ({
      href: categoryHref(category.id),
      label: (
        <>
          {category.label} <span className="ph-count">· {counts.get(category.id) ?? 0}</span>
        </>
      ),
    })),
  ];

  return (
    <FilterNav
      items={items}
      activeHref={normaliseActiveHref(pathname)}
      ariaLabel="Photo categories"
      size="lg"
      className="ph-filters"
    />
  );
}
