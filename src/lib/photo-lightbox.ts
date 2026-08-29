/**
 * The island's `items` prop, built at BUILD TIME. Plan 05-12, Task 2. (§9.2, §5.3 assertion 5.)
 *
 * ================================================================================================
 * 🔴 WHY THIS IS ITS OWN MODULE AND NOT AN EXPORT OF `PhotoLightbox.tsx`. MEASURED, NOT ASSUMED.
 * ================================================================================================
 *
 * It was written as a second export of the island's own file first, on the reasoning that a
 * function producing `PhotoLightboxRecord[]` belongs beside the type — and that Rolldown would
 * tree-shake it out of the browser chunk, because the component never calls it.
 *
 * IT DID NOT. Measured on the built artefact:
 *
 *     dist/client/_astro/PhotoLightbox.<hash>.js   19,336 B
 *       /srcsetFor|VARIANTS|GUTTER_RUNGS|sizesFor/ -> PRESENT
 *
 * The island's client entry is the MODULE, not the component, so everything the module's top level
 * reaches is in the graph — `srcsetFor`, and through it `photo-variants.ts` and `layout-ladder.ts`,
 * three modules the browser never executes. Nothing broke; the chunk was simply bigger than it
 * claimed to be, which is the exact shape of the failure PUB-14's budget exists to catch.
 *
 * Splitting the file is what actually removes them, and it also makes the claim in the island's
 * header true rather than aspirational: `srcSet` and the caption's inputs arrive as FINISHED,
 * JSON-serialisable values, and the module that computes them is not part of any browser chunk.
 * `05-12-SUMMARY.md` records the byte delta.
 *
 * THE TYPE STAYS HERE TOO. The island imports it with `import type`, which is erased, so the edge
 * runs one way only: a build-time module may not import the component, and the component may not
 * import anything from here at runtime. There is still exactly ONE definition of the shape and one
 * of the mapping — two gallery routes each writing their own map is how `items[i]` and a tile's
 * `data-lb-index="i"` would drift, and that drift renders a page where clicking one photograph
 * opens another.
 *
 * ================================================================================================
 * WHAT IS DELIBERATELY NOT ON THE RECORD
 * ================================================================================================
 *
 * `sizes` — §9.6's masonry-column string answers a question the lightbox does not have. The image
 * is `max-width: 90vw` (`primitives.css`, `.ds-atom-lightbox-image`), and `LightboxItem.sizes`'
 * own docstring says a `srcset` with no `sizes` is read as 100vw, "which is already correct for a
 * full-bleed lightbox". Passing `sizesFor(columns)` would ask the browser for a column-width file
 * to fill a screen: no error, no warning, a blurrier photograph.
 *
 * `date` — §9.4, and `scripts/assert-photo-date-unrendered.mjs` refuses it by name. The field is an
 * ingest window, not a capture history.
 *
 * `title` — the lightbox's accessible name and its slide announcement are both built from `alt` by
 * the design system. D-24-1 is this project's record of what a title reaching a description's slot
 * costs, and `PhotoTile` leaves it out of its props for the same reason.
 */

import type { PhotoExif } from '../schemas/photo.ts';
import type { PhotoSources } from './photo-srcset.ts';
import { srcsetFor } from './photo-srcset.ts';

/**
 * One photograph, as the PAGE passes it to the island — every field JSON-serialisable, because an
 * island's props are serialised into the document.
 */
export interface PhotoLightboxRecord {
  /** `urls.large` — the fallback `src`, and what `alt` pairs with. */
  readonly src: string;
  /** The photograph's own reviewed `alt`. Never its title. */
  readonly alt: string;
  /** A finished `srcsetFor(photo)` string, computed here and never in the browser. */
  readonly srcSet: string;
  /** `place`, when the record carries one. MEASURED: present on 17 of 40. */
  readonly place?: string;
  /** The record's stored exif object, whole. The island never receives a single field. */
  readonly exif: PhotoExif;
}

/** The subset this module reads. A real `Photo` satisfies it; it is not a rival shape. */
type GalleryRecord = PhotoSources & {
  readonly alt: string;
  readonly exif: PhotoExif;
  readonly place?: string;
};

export function lightboxRecordsFor(photos: readonly GalleryRecord[]): PhotoLightboxRecord[] {
  /*
   * ANTI-VACUITY, and it is the same contract `PhotoGrid` states for the grid. `Lightbox` requires
   * a non-empty item array when open, and a route with nothing to show must choose §13.2's empty
   * state before it reaches here. An empty array would hydrate an island that can never open.
   */
  if (photos.length === 0) {
    throw new Error(
      'lightboxRecordsFor: called with zero photographs. Lightbox requires a non-empty item ' +
        'array when open, and a gallery route that has nothing to show must choose the empty ' +
        'state (§13.2) before it gets here.'
    );
  }

  return photos.map((photo) => {
    const src = photo.urls.large;
    if (typeof src !== 'string' || src.length === 0) {
      throw new Error(
        'lightboxRecordsFor: a record is missing urls.large, so the lightbox would open on ' +
          '`src="undefined"` — a real request to a URL that 404s, which reads as a broken ' +
          'photograph rather than as a broken record.'
      );
    }
    return {
      src,
      alt: photo.alt,
      srcSet: srcsetFor(photo),
      // Spread conditionally: `"place": undefined` is not JSON, and a `place` key holding `null`
      // would be a value the caption has to test for. Absent is absent.
      ...(photo.place ? { place: photo.place } : null),
      exif: photo.exif,
    };
  });
}
