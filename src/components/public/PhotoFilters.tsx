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
 * Astro's directory build format serves `/photography/street/` WITH a trailing slash, so an
 * un-normalised `Astro.url.pathname` misses every category item and matches nothing.
 *
 * `test/public/photography-routes.node.test.ts` asserts the count is EXACTLY one per route, not `>= 1`:
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
 * NO LOCAL FIX FOR OQ-4's 44px HIT FLOOR WAS EVER ADDED — AND THE FLOOR IS NOW MET UPSTREAM.
 *
 * Against `2.0.0-beta.1`: `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` was
 * `height: 40px` (`primitives.css:3638-3642`), and of the TWO `@media (pointer: coarse)` blocks in
 * that file NEITHER mentioned `segmented` or `filternav` — while `AppBar` and `Footer` links both
 * had one. Five of the six device classes are coarse-pointer, so the shortfall was the common case.
 * It SHIPPED, and it was filed upstream as D-3.
 *
 * ✅ FIXED IN `2.0.0-beta.2`, and it is the ONE RULE this comment predicted, unchanged.
 * `primitives.css:3742`:
 *
 *     @media (pointer: coarse) {
 *       .ds-atom-segmented-btn { box-sizing: border-box; min-height: 44px; }
 *     }
 *
 * It wins over `[data-size="lg"]`'s `height: 40px` at (0,3,0) without entering a specificity
 * contest at all, because used height is `max(min-height, height)` — a different property, no
 * contest to lose — and it leaves the drawn geometry untouched. MEASURED here 2026-08-29 on the
 * built `/photography`: the pill is 44px at all five coarse classes and 40px at 1440 fine, where the
 * floor does not bind. The declaration is now at `primitives.css:3702`; the line numbers above are
 * beta.1's and are left as they were measured.
 *
 * THE SHORTFALL WAS WORSE THAN THE "four pixels" THIS COMMENT USED TO CLAIM. This site runs
 * `size="lg"` (40px), so it was 4px short here — but the component's DEFAULT is `md`, which is
 * 32px, and `sm` is 28px. Every one of the three declared sizes was under the floor, and a consumer
 * on the default was 12px short. The fix is on the shared `.ds-atom-segmented-btn` class precisely
 * so it covers all three.
 *
 * ONE RESIDUAL, AND IT DOES NOT REACH THIS SITE. Upstream deliberately did NOT floor the WIDTH,
 * recording that a short `md` label ("All") measures 42.98px against 44 and that a min-width would
 * visibly redraw a control whose segments are sized to their labels. Every pill here measures
 * 77.09px wide, because each label carries its `· n` count — so the un-floored axis is not reached.
 *
 * WHY THE NO-LOCAL-FIX DECISION IS WHAT MADE THIS CHEAP. A clean screenshot bought by a local
 * override is evidence of a fix that does not exist, which is why Phase 0 left D-16-1's
 * design-system half unfixed rather than patching it. Had this file carried a `min-height: 44px`
 * reaching into `.ds-atom-segmented-btn`, consuming beta.2 would now mean finding and removing it;
 * instead the fix arrived by version number and this comment became a changelog. The rail's OTHER
 * half — `scroll-snap-align` on the anchors — was NOT shipped in beta.2 (`scroll-snap` occurs zero
 * times in `primitives.css`), so the descendant selector above is still the only route to it.
 */

import type { FilterNavItem } from '@akhil-saxena/design-system/components/FilterNav';
import { FilterNav } from '@akhil-saxena/design-system/components/FilterNav';

import { type FilterCategory, GRID_ID } from '../../lib/photo-filter';
import { usePhotoFilter } from '../../lib/use-photo-filter';

/** The unfiltered gallery. THE ONE PLACE THIS PATH IS WRITTEN on the filter side. */
export const GALLERY_HREF = '/photography';

/**
 * A category route's href. Astro composes the same string from `getStaticPaths`'s `params`, which
 * is a second derivation this file cannot see — so the standing proof that the two agree is the
 * `aria-current` count in `test/public/photography-routes.node.test.ts`: a disagreement makes
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
  /*
   * THE CONTROLLER'S CONFIGURATION MOVED HERE when the lightbox island was removed. It lived on
   * `PhotoLightbox` only because `gate:public-js` allows one `<astro-island>` per document and the
   * lightbox was that island. With the lightbox gone this component is hydrated instead, and it is
   * the better host anyway: the rail is what the hook listens to.
   */
  readonly total: number;
  readonly defaultColumns: number;
  /** `data/site_config.json`'s category records, in their committed order (alphabetical). */
  categories: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  /**
   * EVERY photograph on the site, not the filtered set. The group-by lives here so that the two
   * routes share ONE definition of it — §13.3 requires every `· n` to be derived, and two
   * independently written group-bys is two places for it to stop being.
   */
  /**
   * TWO FIELDS PER PHOTOGRAPH, AND THE NARROWNESS IS LOAD-BEARING RATHER THAN TIDY.
   *
   * The pages used to pass their full records and this type accepted them structurally, so Astro
   * serialised all ten fields of all forty into the `props` attribute. MEASURED on `/photography`:
   * 58,180 bytes of `photos`, inside a 74,322-byte props attribute, in a 169,515-byte document —
   * **43.8% of the page**, on all six gallery routes, against a Lighthouse-95 budget. This
   * component reads exactly ONE of those fields (`photo.category`, for the group-by below).
   *
   * Projected to `id` + `category` the props attribute is 5,136 bytes — 5.1% of the document.
   *
   * AND THE COMPRESSED PICTURE IS DIFFERENT FROM THE RAW ONE, which is why both are recorded rather
   * than the flattering one. MEASURED on `/photography`, before and after, same build:
   *
   *              raw        gzip       brotli
   *   before   169,515     53,238     29,813
   *   after    100,329     31,376     27,280
   *   saved     69,186     21,862      2,533
   *
   * Forty near-identical JSON records compress extraordinarily well, so brotli — which is what
   * Cloudflare serves a modern browser — recovers most of what the raw figure promises. The honest
   * transfer win is ~2.5KB per document, not 69KB.
   *
   * IT IS STILL WORTH DOING, for the reason the transfer number does not show: 69KB of HTML that no
   * longer has to be parsed, tokenised and held as DOM on a phone, and 58KB that no longer has to be
   * JSON-parsed on the main thread before the island mounts. That is main-thread time on the exact
   * route with the tightest budget.
   *
   * `id` IS KEPT THOUGH NOTHING READS IT YET, and that is the deliberate half. A category→count map
   * would be ~200 bytes and would also end the island's ability to recompute anything positional
   * client-side — which is the property that made filtering-without-reload possible at all. An array
   * of identities keeps that door open for 2KB.
   */
  photos: ReadonlyArray<{ readonly id: string; readonly category: string }>;
  /** `Astro.url.pathname`, un-normalised. Normalising is this component's job — see the header. */
  pathname: string;
}

export function PhotoFilters({
  categories,
  photos,
  pathname,
  total,
  defaultColumns,
}: PhotoFiltersProps) {
  /*
   * The delegated listener that turns a pill click into an attribute instead of a navigation. Same
   * hook, same contract; see `use-photo-filter.ts` for why it is a hook and not an island.
   */
  usePhotoFilter({
    categories: categories as readonly FilterCategory[],
    total,
    defaultColumns,
    gridSelector: `#${GRID_ID}`,
  });

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
   * `src/pages/photography/[category]/index.astro`: `gate:schema`'s `[HAND-ROLLED-VALIDATOR]` rule
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
    /*
     * NO `· n` ON THE PILLS. Each label used to carry its own count in a `.ph-count` span. Akhil
     * removed them on 2026-09-02 — the rail reads as six words rather than six words and six
     * numbers, and the total still shows once, on the count line beside the rail.
     *
     * REMOVED FROM THE MARKUP, not hidden with `display: none`. A hidden span is still in the
     * anchor's accessible name, so a screen reader would announce "Portraits dot 2" for a pill
     * that visibly says "Portraits" — the numbers would be gone for everyone except the people
     * who cannot see them.
     *
     * `counts` is still computed and still guarded below: it is what proves the group-by produced
     * something, and it is one edit away from being rendered again.
     */
    { href: GALLERY_HREF, label: 'All' },
    ...categories.map((category) => ({
      href: categoryHref(category.id),
      label: category.label,
    })),
  ];

  return (
    <FilterNav
      items={items}
      activeHref={normaliseActiveHref(pathname)}
      ariaLabel="Photo categories"
      /*
       * `sm`, NOT `lg`. The four candidate sizes were compared in the browser and Akhil chose the
       * small end. IT IS THE PROP AND NOT A STYLESHEET OVERRIDE, because
       * `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn` is (0,3,0) and primitives.css
       * says so at that very rule: it "would otherwise beat anything a single-class rule could
       * say". An app-CSS height would have needed (0,4,0) to win a contest the component already
       * offers a prop to avoid.
       *
       * `sm` is 28px tall at 12px. The header nav is 12.5px (`--text-sm`), so the two rows of
       * interactive text are half a pixel apart rather than identical — the design system's
       * segmented sizes are literal 12/13/14px rather than type-scale rungs. Recorded as D-27,
       * not overridden: half a pixel is not worth re-entering the specificity contest this prop
       * exists to skip.
       */
      size="sm"
      className="ph-filters"
    />
  );
}
