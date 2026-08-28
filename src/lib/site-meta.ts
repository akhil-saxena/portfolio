/**
 * The one site-wide social-card image — OQ-6a, resolved. Plan 05-06, Task 3.
 *
 * ================================================================================================
 * WHY THIS CONSTANT EXISTS AT ALL, AND WHY IT IS IN WAVE 3
 * ================================================================================================
 *
 * SEO-01 requires an absolute `og:image` on EVERY page. MEASURED (`05-UI-SPEC.md` §12.3): there is
 * no site OG image — `public/` holds `resume.pdf`, `favicon.svg` and three project icons, and
 * nothing else. Commissioning one is not the answer and neither is generating one: dynamic and
 * edge-generated OG images are explicitly out of scope in `REQUIREMENTS.md`, because they
 * reintroduce exactly the server-runtime cost that got analytics cut.
 *
 * So a photograph's own `large` variant is the card. These two exports are `<Seo>`'s DEFAULTS, so
 * no route has to pass them — which is why the constant lives here in wave 3 rather than in 05-13,
 * which would otherwise have to edit five route files it does not own. The photo detail pages
 * override with their own per-photo image (05-08).
 *
 * ================================================================================================
 * WHY IT IS LOOKED UP BY ID RATHER THAN PASTED
 * ================================================================================================
 *
 * A pasted URL is a second definition of a value the manifest already owns. Phase 4 can rewrite
 * every `urls.*` in the manifest — it has a migration for exactly that (`migrate-photo-origin.mjs`,
 * `r2.dev` → `images.akhilsaxena.com`) — and a pasted copy would keep pointing at the old origin,
 * on every page, with a green build and a card that renders no picture. Reading it by id means the
 * migration reaches this too.
 *
 * The lookup THROWS when the id is absent rather than falling back. A fallback would ship a page
 * whose `og:image` is empty or wrong, and a social card is the one surface nobody sees in review
 * because it only renders inside somebody else's product.
 *
 * ================================================================================================
 * WHY IT IS A JSON IMPORT AND NOT A FILE READ
 * ================================================================================================
 *
 * `<Seo>` renders during prerender, which runs inside **workerd** — MEASURED by 05-01:
 * `import.meta.url` is `undefined`, `process.cwd()` is `/bundle`, there is no filesystem, and
 * `createRequire().resolve` is not a function. A `node:fs` implementation of this module would
 * pass every unit test and detonate on the first real page. The JSON import is resolved by Vite at
 * BUILD time, in Node, and arrives here as a plain object — the same mechanism
 * `src/lib/content.ts` already uses for the three singleton content files.
 *
 * ================================================================================================
 * WHICH PHOTOGRAPH, AND WHAT IT ACTUALLY MEASURES
 * ================================================================================================
 *
 * `architecture-singapore`, per OQ-6a: landscape, and already the first peek photograph on Home,
 * so the card matches what a visitor sees on arrival and no new asset is introduced.
 *
 * MEASURED, by fetching the object and parsing the WebP header rather than trusting the manifest:
 *
 *     GET https://images.akhilsaxena.com/photos/architecture/singapore-lg.webp
 *       200 · image/webp · 105,690 bytes · VP8 · 1200 x 800  (3:2)
 *
 * NOTE, because §12.3 and this plan both say "2000x1333": that is the RECORD's `dimensions`, which
 * describe `urls.original`. `urls.large` is its 1200-wide derivative at the same 3:2 ratio, and it
 * is the better card — 1200px wide is what `summary_large_image` and Open Graph both want, and it
 * is a fifth of the bytes. `large` is what this module exports, as the plan instructs; only the
 * stated pixel dimensions in the spec belong to a different variant.
 */

import manifest from '../../data/portfolio_images.json';

/** OQ-6a. The one place this id is written. */
export const SITE_OG_IMAGE_ID = 'architecture-singapore';

/**
 * The variant key. `large`, not `original`: see the measurement above. Named rather than inlined so
 * the throw below can say which key it looked for when a record is missing it.
 */
const SITE_OG_IMAGE_VARIANT = 'large';

type ManifestRecord = {
  readonly id?: unknown;
  readonly alt?: unknown;
  readonly urls?: Readonly<Record<string, unknown>>;
};

function resolveOgImage(): { readonly url: string; readonly alt: string } {
  const records: readonly ManifestRecord[] = manifest;

  // ANTI-VACUITY, FIRST. An emptied manifest would make the `find` below return `undefined` and
  // the message would say "no record with that id", which is true but points at the wrong repair.
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(
      'site-meta: data/portfolio_images.json holds no records at all, so the site OG image ' +
        'cannot be resolved. This is a content failure, not a missing id — fix the manifest.'
    );
  }

  const record = records.find((entry) => entry.id === SITE_OG_IMAGE_ID);
  if (!record) {
    throw new Error(
      `site-meta: no record with id "${SITE_OG_IMAGE_ID}" in data/portfolio_images.json ` +
        `(${records.length} record(s) present). The site-wide og:image is OQ-6a and it is read ` +
        'by id rather than pasted, so a renamed or deleted photograph fails the build here ' +
        'instead of shipping a social card with no picture. Either restore the id, or choose ' +
        'another landscape photograph and change SITE_OG_IMAGE_ID.'
    );
  }

  const url = record.urls?.[SITE_OG_IMAGE_VARIANT];
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error(
      `site-meta: record "${SITE_OG_IMAGE_ID}" has no usable urls.${SITE_OG_IMAGE_VARIANT}. ` +
        'An og:image with no URL renders as a card with no picture and produces no error anywhere.'
    );
  }

  const alt = record.alt;
  if (typeof alt !== 'string' || alt.length === 0) {
    throw new Error(
      `site-meta: record "${SITE_OG_IMAGE_ID}" has no usable alt. og:image:alt is the only ` +
        'description a screen-reader user gets of a social card, and an empty one is not a card ' +
        'with a missing label — it is a card announced as nothing.'
    );
  }

  return { url, alt };
}

const resolved = resolveOgImage();

/**
 * The absolute URL of the site-wide social-card image.
 *
 * Absolute because it comes from the manifest, whose `urls.*` are absolute against
 * `images.akhilsaxena.com`. `<Seo>` re-checks that rather than assuming it — a relative `og:image`
 * is ignored by every scraper and produces a card with no picture and no error.
 */
export const SITE_OG_IMAGE: string = resolved.url;

/** The photograph's own `alt`, verbatim. Never a summary, never "Portfolio". */
export const SITE_OG_IMAGE_ALT: string = resolved.alt;
