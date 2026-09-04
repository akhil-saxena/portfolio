/**
 * THE 40th PHOTOGRAPH — the growth control for Phase 4 (plan 04-01, requirements PIPE-01/PIPE-03).
 *
 * WHY A FIXTURE AND NOT A LITERAL IN EACH TEST
 * -------------------------------------------
 * Phase 4's pipeline appends records to `data/portfolio_images.json`. Measured on 2026-08-27:
 * appending ONE schema-valid record turned 15 assertions across 4 files red while `astro build`
 * stayed green — the suite forbade the corpus from growing, and `astro sync` reported
 * `PASS · 40 photo(s)` while it did. Plan 04-01 re-scoped those 15; this file is the record they
 * were re-scoped against, so that plans 04-05 and 04-09 assert about the SAME record rather than
 * each writing a fixture that happens to pass its own author's expectations.
 *
 * IT LIVES UNDER `test/`, DELIBERATELY
 * ------------------------------------
 * `scripts/assert-no-r2dev-urls.mjs` classifies every tracked path exhaustively and stops the build
 * with `unclassified path` on one it has no rule for (pitfall P-7). `test/**` is already a named
 * SKIP there — *"a test asserting that the migration or this gate works must be free to name the
 * string it forbids as a fixture. Tests do not ship."* So no new top-level directory is created and
 * `gate:origin` needs no new rule. That placement is a decision, not an accident.
 *
 * AND YET THE HOSTNAME IS IMPORTED, NOT WRITTEN
 * ---------------------------------------------
 * `gate:origin` would not catch a literal `https://images.akhilsaxena.com` here, precisely because
 * of the SKIP above. `IMAGE_ORIGIN` is imported anyway: `src/lib/image-origin.ts` states it is the
 * only place in the repository the host is written, and a fixture holding its own copy is a second
 * source of truth that agrees today. The day the origin moves, this file must move with it —
 * silently continuing to pass against a stale hostname is the failure worth designing out.
 *
 * WHAT MAKES IT NOT A STRAWMAN
 * ----------------------------
 *   - All four `alt` rules in `PhotoSchema.superRefine` are satisfied by a real sentence: non-empty,
 *     not a case-folded repeat of `title`, no "image of"/"photo of"/"picture of" role prefix, no
 *     `[AKHIL-` marker left over from the brief.
 *   - The `exif` block has all six keys, because `PhotoExifSchema` is a required strict object whose
 *     fields are NULLABLE rather than optional. A record with five keys is rejected; the legacy
 *     pipeline's output was, on exactly this ground among others (04-RESEARCH §6).
 *   - `tags` is absent. `PhotoSchema` declares it `z.never().optional()` so the refusal carries OD-3
 *     rather than a generic "unrecognized key".
 *   - `urls.thumb` is a REAL WebP, not a plausible-looking blob. The base64 below decodes to a
 *     34-byte RIFF/VP8L image; measured with `file` (`RIFF (little-endian) data, Web/P image`) and
 *     `sips -g pixelWidth -g pixelHeight` (`1 × 1`). It is 1×1 rather than a realistic LQIP because
 *     the schema checks the `data:image/webp;base64,` prefix and nothing beyond it — but a fixture
 *     whose "image" does not decode is a fixture that lies about what it is, and this project has
 *     shipped enough controls that could not fail without adding one that cannot be looked at.
 *   - `PhotoSchema.parse(FORTIETH_PHOTO)` is asserted in `manifest-growth.unit.test.ts`, so a change
 *     here that made it invalid fails immediately rather than making a later test pass for the wrong
 *     reason.
 *
 * WHY `order` AND `categoryOrder` ARE RECOMPUTED AT CALL TIME
 * ----------------------------------------------------------
 * They are GLOBALLY and PER-CATEGORY unique (RI-5 and RI-6). Hardcoding `order: 40` would make this
 * fixture single-use and would break the moment the corpus reaches 40 for real — and pitfall P-5
 * records the live version of the same mistake: two pipeline runs that both read `maxOrder = 39` and
 * both wrote 40. The values on `FORTIETH_PHOTO` itself are therefore PROVISIONAL and marked as such;
 * `appendFortieth` derives the real ones from the manifest in hand. Tests that want a duplicate on
 * purpose can still write one, which is proof step 1 of plan 04-01.
 */

import { IMAGE_ORIGIN } from '../../../src/lib/image-origin';
import type { Photo } from '../../../src/schemas';

/** `photos/<category>/<name>` — the path shape every committed record uses. */
const SLUG = 'fortiethproof';
/*
 * `landscape`, not `nature`. The taxonomy was re-authored from seven categories to five — Akhil:
 * *"5 is better"* — and `nature` was one of the four retired. A fixture naming a category the
 * config no longer declares is refused by the pipeline's own validation, which is how it was found:
 * every one of `partial-failure.node.test.ts`'s ten cases failed at the same line.
 */
const CATEGORY = 'landscape';

/**
 * A genuine 1×1 lossless WebP. Verified decodable rather than assumed — see the header.
 *
 * The `data:image/webp;base64,` prefix is written out here rather than imported. `src/schemas/photo.ts`
 * is owned by plan 04-02, which is in flight in the same wave and exporting a `THUMB_PREFIX`
 * constant as part of its own work; importing an export that is not yet committed would couple this
 * fixture to another plan's uncommitted tree. It is not a second source of truth in any case,
 * because `manifest-growth.unit.test.ts` runs this value through `PhotoSchema.parse` — and
 * `thumbUri`'s refinement compares it against the schema's own prefix. A drift fails there, by
 * name, which is the check an imported constant would have been standing in for.
 */
export const FIXTURE_THUMB =
  'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

/** The four remote variants, built from the ONE hostname definition. `thumb` carries no host. */
const variantUrl = (suffix: string): string =>
  `${IMAGE_ORIGIN}/photos/${CATEGORY}/${SLUG}${suffix}.webp`;

/**
 * The record. `order` and `categoryOrder` are PROVISIONAL — schema-valid so this object parses on
 * its own, and overwritten by `appendFortieth`. Never append this constant directly to a real
 * manifest: at 39 records it collides with `order: 1`, which is RI-5 doing its job.
 */
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

/**
 * Return a NEW array with the 40th record appended, its `order` and `categoryOrder` derived from
 * `manifest`.
 *
 * PURE, and both halves of that are load-bearing. It must not mutate its argument, because the
 * committed manifest is read once at module scope in several test files and a shared mutation would
 * make one file's assertions depend on another file's execution order. It must not touch disk,
 * because `data/portfolio_images.json` is reviewed content and no test may write to it — the four
 * migration proofs read it, and `build-fails-loudly.node.test.ts` asserts by SHA-256 that the
 * repository's own copy was never a participant.
 *
 * `structuredClone` rather than a spread: a shallow copy would share `urls`, `exif` and
 * `dimensions` with the exported constant, so a test that mutated the returned record to plant a
 * defect would silently corrupt the fixture for every test after it in the same file.
 *
 * THROWS on an empty manifest rather than returning a one-record array. There is no maximum of an
 * empty set, so the derivation would produce `-Infinity + 1`; a fixture helper that quietly
 * invented `order: -Infinity` would push the failure into an assertion far away from its cause.
 */
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

/** The category the fixture belongs to, exported so a test need not restate the string. */
export const FIXTURE_CATEGORY = CATEGORY;
