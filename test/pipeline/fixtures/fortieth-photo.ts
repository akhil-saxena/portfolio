import { IMAGE_ORIGIN } from '../../../src/lib/image-origin';
import type { Photo } from '../../../src/schemas';

const SLUG = 'fortiethproof';
const CATEGORY = 'landscape';

export const FIXTURE_THUMB =
  'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

const variantUrl = (suffix: string): string =>
  `${IMAGE_ORIGIN}/photos/${CATEGORY}/${SLUG}${suffix}.webp`;

export const FORTIETH_PHOTO: Photo = {
  id: `${CATEGORY}-${SLUG}`,
  title: 'Fortieth Proof',
  alt: 'A shallow stream folds around three dark boulders while low light catches the spray above them.',
  category: CATEGORY,
  date: '2026-08-27',
  exif: {
    camera: 'NIKON CORPORATION NIKON D5300',
    lens: '18.0-55.0 mm f/3.5-5.6',
    aperture: 'f/8',
    shutter: '1/250',
    iso: 100,
    focalLength: '35mm',
  },
  urls: {
    original: variantUrl(''),
    large: variantUrl('-lg'),
    medium: variantUrl('-md'),
    small: variantUrl('-sm'),
    thumb: FIXTURE_THUMB,
  },
  order: 1,
  categoryOrder: 1,
  dimensions: { width: 2000, height: 1333 },
};

export function appendFortieth(manifest: readonly Photo[]): Photo[] {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error(
      'appendFortieth: refusing to derive order/categoryOrder from an empty manifest — ' +
        'there is no maximum of an empty set, and inventing one would hide the real defect.'
    );
  }

  const sameCategory = manifest.filter((photo) => photo.category === CATEGORY);
  if (sameCategory.length === 0) {
    throw new Error(
      `appendFortieth: no existing record in category "${CATEGORY}", so a dense categoryOrder ` +
        'cannot be derived. RI-6 requires 1…n with no gap; guessing 1 would only look right.'
    );
  }

  const record = structuredClone(FORTIETH_PHOTO) as Photo;
  record.order = Math.max(...manifest.map((photo) => photo.order)) + 1;
  record.categoryOrder = Math.max(...sameCategory.map((photo) => photo.categoryOrder)) + 1;

  return [...manifest, record];
}

export const FIXTURE_CATEGORY = CATEGORY;
