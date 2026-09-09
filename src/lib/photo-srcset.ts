import { GUTTER_RUNGS, MASONRY_GAP, PAGE_MAX } from './layout-ladder.ts';
import { PHOTO_ID_SEPARATOR, VARIANTS } from './photo-variants.ts';

export type PhotoIdentity = {
  readonly id: string;
  readonly category: string;
};

export type PhotoSources = {
  readonly urls: Readonly<Record<string, string>>;
  readonly dimensions: { readonly width: number; readonly height: number };
};

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

export function photoHref(photo: PhotoIdentity): string {
  return `/photography/${photo.category}/${photoSlug(photo)}`;
}

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

const SUPPORTED_COLUMN_COUNTS: readonly number[] = [2, 3];

const COLUMNS_AT_BASE = 1;

const COLUMNS_AT_FIRST_BREAKPOINT = 2;

function columnsAtRung(rung: (typeof GUTTER_RUNGS)[number], categoryColumns: number): number {
  if (rung.minWidth === null) return COLUMNS_AT_BASE;
  const firstBreakpoint = GUTTER_RUNGS.find((candidate) => candidate.minWidth !== null)?.minWidth;
  if (rung.minWidth === firstBreakpoint) {
    return Math.min(COLUMNS_AT_FIRST_BREAKPOINT, categoryColumns);
  }
  return categoryColumns;
}

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
