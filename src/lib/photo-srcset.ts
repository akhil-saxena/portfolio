/**
 * `srcset`, `sizes`, and the photograph's own URL. (Phase 5, plan 05-05, Task 3.)
 *
 * Four functions. Each of them has a failure mode with NO visible symptom, which is why they are
 * derived once here rather than written into a page.
 *
 * ================================================================================================
 * `photoSlug` / `photoHref` — BL-8. THE SINGLE DEFINITION, AND WHY IT HAD TO BE MADE ONE.
 * ================================================================================================
 *
 * `PhotoSchema` has no `slug` field. The id is `abstract-intothemist` and the category is
 * `abstract`, so `/photos/<category>/<slug>` is RECOVERED, not stored — that is real work, and it
 * needs exactly one definition.
 *
 * **05-07's gallery tile and 05-08's detail route both import these. Neither may re-derive.** They
 * are both wave 4, so neither can read the other's output, and no gate in the phase checks an
 * emitted tile href against an emitted page. Two independent derivations that disagree produce
 * every tile 404ing against a page that exists under a different slug — with a green build, a
 * green suite and a green gate. First detection would be a human clicking a tile in wave 7.
 *
 * The inverse direction is `photoIdFor` in `src/lib/photo-pipeline.ts`, and both read
 * `PHOTO_ID_SEPARATOR` from `./photo-variants.ts`, so they cannot disagree about the separator
 * either. `photo-pipeline.ts` itself is unreachable from here: it imports `node:crypto` and this
 * module runs inside a prerendered page.
 *
 * `photoSlug` REFUSES an id that does not carry its category prefix rather than slicing blindly.
 * A silent slice turns a malformed id into a plausible-looking slug and a 404; a throw is the only
 * outcome a prerender can act on.
 *
 * ================================================================================================
 * `srcsetFor` — §7.4's expression, and the sentence the shape invites
 * ================================================================================================
 *
 * Resize is `sharp(buf).resize({ width: Math.min(maxWidth, sourceWidth), withoutEnlargement:
 * true })` — by width, capped, never enlarged. So the descriptor for every variant is exactly
 * `Math.min(variant.maxWidth, photo.dimensions.width)` and NO SERVED SIZE NEEDS STORING. §7.4
 * verified that against real served bytes on four records spanning the edge cases, including the
 * two whose source is under a cap: `min(2000, 1920) = 1920` and `min(1200, 1318) = 1200`.
 *
 * **`dimensions` supplies the RATIO and this arithmetic, and NOTHING ELSE (§7.2's ruling). Do not
 * emit `width`/`height` attributes from anything downstream of this module, and do not add a
 * helper here that would.** `aspect-ratio` plus `width: 100%` reserves the box; writing
 * `width={photo.dimensions.width}` on an `<img>` whose `src` is `urls.original` states 4608 for a
 * 2000px image — harmless for layout, wrong for anything reasoning about bytes, and exactly the
 * mistake having a `dimensions.width` in scope invites. §7.2 records the escape hatch if
 * Lighthouse's `unsized-images` audit ever rejects a CSS aspect-ratio: emit the SERVED variant's
 * size, never the manifest's raw numbers.
 *
 * The function reads `photo.urls[variant.urlKey]` and never composes a URL. There is no origin in
 * this file and its suite asserts there is none — OD-3's rule, that the hostname is written in
 * `src/lib/image-origin.ts` and nowhere else, applies to consumers too.
 *
 * ================================================================================================
 * `sizesFor` — the one that fails silently
 * ================================================================================================
 *
 * A `sizes` that disagrees with the layout is a silently wrong DOWNLOAD size. Nothing renders
 * incorrectly; the browser just fetches the wrong file. There is no error and no visual symptom,
 * so the only defence is that the string and the stylesheet are computed from one set of numbers —
 * `./layout-ladder.ts` — and that the built CSS is gated against those numbers in 05-06
 * (`scripts/assert-gutter-ladder.mjs`).
 *
 * The arithmetic, per clause: content width is `min(100vw, PAGE_MAX.photos)` at the top rung and
 * `100vw` below it, minus `2 × gutter`, minus `(columns − 1) × gap`, divided by the column count
 * in force at that rung. The column count per rung is §7.1's ladder — 1 at base, 2 at ≥375, then
 * the category's own count from ≥673 up — so the function takes the category's class-5/6 count and
 * derives the rest.
 *
 * The base clause is `calc(100vw - 2×gutter)`: one column, so there is no divisor and no gap term.
 *
 * NO LADDER NUMBER IS TYPED IN THIS FILE. Every gutter, gap, breakpoint and page maximum comes
 * from `./layout-ladder.ts`, and the suite proves it by searching this module's comment-stripped
 * source for each of those values, with the search list DERIVED from the constants rather than
 * hand-typed — so a fifth rung would be covered without anyone remembering to add it.
 */

import { GUTTER_RUNGS, MASONRY_GAP, PAGE_MAX } from './layout-ladder.ts';
import { PHOTO_ID_SEPARATOR, VARIANTS } from './photo-variants.ts';

/**
 * The minimum a photograph must carry for its URL to be derived. Structural on purpose: it is a
 * SUBSET of `Photo` from `src/schemas/photo.ts`, not a rival declaration of it, so `gate:schema`'s
 * single-definition rule is not being worked around — a real `Photo` satisfies it, and so does the
 * `{ id, category }` pair a route already has in hand without loading the whole record.
 */
export type PhotoIdentity = {
  readonly id: string;
  readonly category: string;
};

/** The minimum a photograph must carry for its `srcset` to be derived. */
export type PhotoSources = {
  readonly urls: Readonly<Record<string, string>>;
  readonly dimensions: { readonly width: number; readonly height: number };
};

/**
 * The photograph's slug: its id with the `category + PHOTO_ID_SEPARATOR` prefix removed.
 *
 * `abstract-intothemist` in category `abstract` → `intothemist`. Only the FIRST prefix goes; every
 * later separator is part of the slug, so `nature-river-bend-2024` → `river-bend-2024`. A
 * `split('-')[1]` implementation looks right on the first example and truncates the second.
 *
 * Throws rather than returning a wrong slug — see the header.
 */
export function photoSlug(photo: PhotoIdentity): string {
  const prefix = `${photo.category}${PHOTO_ID_SEPARATOR}`;
  if (!photo.id.startsWith(prefix)) {
    throw new Error(
      `photoSlug: id ${JSON.stringify(photo.id)} does not begin with its category prefix ` +
        `${JSON.stringify(prefix)}. Slicing anyway would produce a plausible-looking slug and a ` +
        '404 at a URL nothing in the build checks. The invariant is `id === category + "-" + ' +
        'slug` (src/lib/photo-pipeline.ts, photoIdFor).'
    );
  }
  const slug = photo.id.slice(prefix.length);
  if (slug.length === 0) {
    throw new Error(
      `photoSlug: id ${JSON.stringify(photo.id)} is its category prefix and nothing else, so it ` +
        'has no slug. An empty slug composes the href of the category page, so the photograph ' +
        'would silently link to the gallery it sits in.'
    );
  }
  return slug;
}

/**
 * The photograph's own page. `/photos/<category>/<slug>` and nothing else.
 *
 * THIS IS THE SINGLE DEFINITION. 05-07's gallery tile and 05-08's `getStaticPaths` both import it.
 * If either re-derives, they can disagree and nothing in the phase would notice.
 */
export function photoHref(photo: PhotoIdentity): string {
  return `/photos/${photo.category}/${photoSlug(photo)}`;
}

/**
 * The `srcset` attribute: every variant's own URL with its width descriptor, in `VARIANTS` order.
 *
 * Refuses a record missing a url key or carrying an unusable width, because both produce a string
 * a browser accepts and misuses: a missing URL yields `undefined 800w`, and a width of 0 yields
 * `0w` descriptors, which a browser reads as "no information" and answers by taking the last
 * candidate regardless of the viewport.
 */
export function srcsetFor(photo: PhotoSources): string {
  const dimensions = photo.dimensions;
  if (!dimensions || !Number.isFinite(dimensions.width) || dimensions.width <= 0) {
    throw new Error(
      'srcsetFor: photo.dimensions.width must be a positive, finite number of pixels; received ' +
        `${JSON.stringify(dimensions)}. It is the intrinsic width of the SOURCE photograph ` +
        '(OD-11) and it caps every descriptor, so an unusable value makes every candidate wrong ' +
        'in a way the browser will not report.'
    );
  }

  return VARIANTS.map((variant) => {
    const url = photo.urls?.[variant.urlKey];
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error(
        `srcsetFor: photo.urls.${variant.urlKey} is missing. Every variant in VARIANTS must have ` +
          'a URL on the record; emitting the other three would silently drop a candidate and ' +
          'ship a heavier or blurrier image than the layout asked for.'
      );
    }
    return `${url} ${Math.min(variant.maxWidth, dimensions.width)}w`;
  }).join(', ');
}

/**
 * The column counts `site_config.json` really carries (MEASURED: `3` for abstract and
 * architecture, `2` for the other five, `defaultColumns: 3`). Anything else is refused rather than
 * rendered — a `sizes` built for a column count the layout does not use is silently wrong, and an
 * unexpected config value is something to be heard about.
 */
const SUPPORTED_COLUMN_COUNTS: readonly number[] = [2, 3];

/** §7.1: the masonry is a single column below the first breakpoint, at every category. */
const COLUMNS_AT_BASE = 1;

/**
 * §7.1: at the FIRST breakpoint the ladder is two columns for every category — a 3-column category
 * does not reach its third column until the second breakpoint. Capped rather than assigned, so a
 * hypothetical single-column category would not be widened to two.
 */
const COLUMNS_AT_FIRST_BREAKPOINT = 2;

/** The number of columns in force at a rung, given the category's class-5/6 column count. */
function columnsAtRung(rung: (typeof GUTTER_RUNGS)[number], categoryColumns: number): number {
  if (rung.minWidth === null) return COLUMNS_AT_BASE;
  const firstBreakpoint = GUTTER_RUNGS.find((candidate) => candidate.minWidth !== null)?.minWidth;
  if (rung.minWidth === firstBreakpoint) {
    return Math.min(COLUMNS_AT_FIRST_BREAKPOINT, categoryColumns);
  }
  return categoryColumns;
}

/**
 * The `sizes` attribute for a category rendered at `columns` columns from the second breakpoint up.
 *
 * Clause order is descending by `min-width`, because a `sizes` list is evaluated first-match-wins.
 * The widths are right-aligned to the longest breakpoint, which is why §7.4's string reads
 * `(min-width:1024px)` with no space and `(min-width: 673px)` with one. That padding is derived
 * from the breakpoint list, so a four-digit breakpoint appearing or disappearing re-aligns the
 * whole string rather than leaving one clause out of step.
 */
export function sizesFor(columns: number): string {
  if (!SUPPORTED_COLUMN_COUNTS.includes(columns)) {
    throw new Error(
      `sizesFor: ${JSON.stringify(columns)} is not a column count this site uses. ` +
        `site_config.json only ever holds ${SUPPORTED_COLUMN_COUNTS.join(' or ')} (measured). ` +
        'A sizes string built for the wrong column count downloads the wrong file with no error ' +
        'and no visual difference, so an unexpected value is refused rather than rendered.'
    );
  }

  const conditioned = GUTTER_RUNGS.filter((rung) => rung.minWidth !== null);
  const pad = Math.max(...conditioned.map((rung) => String(rung.minWidth).length));
  const descending = [...conditioned].reverse();
  const widest = descending[0];

  const clauses = descending.map((rung) => {
    const cols = columnsAtRung(rung, columns);
    const content = rung === widest ? `min(100vw, ${PAGE_MAX.photos}px)` : '100vw';
    const gutterTerm = 2 * rung.px;
    const gapTerm = (cols - 1) * MASONRY_GAP.px;
    const condition = `(min-width:${String(rung.minWidth).padStart(pad)}px)`;
    return `${condition} calc((${content} - ${gutterTerm}px - ${gapTerm}px) / ${cols})`;
  });

  // The unconditioned fallback. One column, so there is no divisor and no gap term — writing it
  // through the same template would emit `calc((100vw - 32px - 0px) / 1)`, which is correct
  // arithmetic and noise in an attribute a person has to read.
  const base = GUTTER_RUNGS.find((rung) => rung.minWidth === null);
  if (!base) {
    throw new Error(
      'sizesFor: GUTTER_RUNGS has no unconditioned base rung, so there is no fallback clause. ' +
        'Every sizes list needs one: without it a viewport below the first breakpoint gets no ' +
        'match and the browser falls back to 100vw, which is wider than the gutters allow.'
    );
  }
  clauses.push(`calc(100vw - ${2 * base.px}px)`);

  return clauses.join(', ');
}
