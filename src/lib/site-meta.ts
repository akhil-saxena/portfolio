import manifest from '../../data/portfolio_images.json';

export const SITE_OG_IMAGE_ID = 'architecture-singapore';

const SITE_OG_IMAGE_VARIANT = 'large';

type ManifestRecord = {
  readonly id?: unknown;
  readonly alt?: unknown;
  readonly urls?: Readonly<Record<string, unknown>>;
};

function resolveOgImage(): { readonly url: string; readonly alt: string } {
  const records: readonly ManifestRecord[] = manifest;

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

export const SITE_OG_IMAGE: string = resolved.url;

export const SITE_OG_IMAGE_ALT: string = resolved.alt;

export function canonicalPath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(
      `canonicalPath: expected a root-relative path beginning with "/", received "${path}". ` +
        'A bare "work" resolves against the current directory, so the canonical of ' +
        '/photography/architecture/ would silently become /photography/architecture/development.'
    );
  }
  return path.endsWith('/') ? path : `${path}/`;
}
