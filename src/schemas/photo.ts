/**
 * The shape of one record in `data/portfolio_images.json`.
 *
 * This file, and the four beside it, are the ONE definition of every content shape in this
 * project. `scripts/assert-single-schema-source.mjs` is what makes that a checked property
 * rather than a convention: a rival zod object or a rival `interface Photo` anywhere else under
 * `src/` fails by name. Criterion 1 is not "validation exists" — it is "validation cannot drift
 * between the build, the write path and the admin's form errors", and a module that is merely
 * *first* is not the same as a module that is *only*.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * 1. NO `z.enum` OF THE SEVEN CATEGORY NAMES. `category` is a plain string here and is checked
 *    against the real id set from `data/site_config.json` in `content-set.ts`. An enum would be
 *    the second source of truth about what a category IS — exactly the thing D-25 collapsed and
 *    ADR-002 §4 deleted `/admin/site` on the strength of. Adding a category would then mean
 *    editing two files, and the day someone edits only one is the day fourteen photographs
 *    silently orphan.
 * 2. NO HOSTNAME LITERAL. The canonical origin is imported from `src/lib/image-origin.ts`, which
 *    that file's header states is the only place in the repository it is written. If the schema
 *    held its own copy it could assert an origin the data does not use and still pass.
 * 3. NO `.default()` ON `focalPoint`, even though the shape contract in `03-CONTEXT.md` §2 writes
 *    it as `optional, default "50% 50%"`. A zod default makes `parse()` RETURN a value the input
 *    did not contain — harmless when the schema only reads, corrupting when it also writes. This
 *    module is the Phase 7 write boundary: an admin that parses a record and commits the parse
 *    OUTPUT would materialise `focalPoint` on all 39 records the first time anything is saved,
 *    which is 39 lines of churn nobody asked for and a diff that hides the real edit. The default
 *    is exported as a constant instead, for the renderer to apply at the point of use.
 *
 * THE STRICT OBJECT, AND WHY `tags` IS SPELLED OUT RATHER THAN JUST OMITTED
 * ------------------------------------------------------------------------
 * `z.strictObject` rejects unknown keys, so omitting `tags` would already refuse it. It is
 * declared as `z.never().optional()` anyway so the refusal carries the DECISION rather than a
 * generic "Unrecognized key". OD-3 was contested by three live documents at once and someone will
 * re-add the field believing it was an oversight; the error tells them it was not.
 */

import { z } from 'astro/zod';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../lib/image-origin';

/**
 * What a renderer should use when a photograph declares no crop of its own. Exported as a
 * constant rather than baked in as a zod `.default()` — see note 3 in the header.
 */
export const DEFAULT_FOCAL_POINT = '50% 50%';

/** A slug: lowercase letters, digits and hyphens. Asserted, never transformed. */
const SLUG = /^[a-z0-9-]+$/;

/** ISO calendar date, as every one of the 39 records stores it. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The `background-position` shape both `photo.focalPoint` and `home_config.peekPositions` use.
 * OD-5 kept the two fields because they answer different questions; they share this grammar, so
 * the grammar is written once, here, and imported by `home.ts`.
 */
export const POSITION = /^\d{1,3}% \d{1,3}%$/;

/** The prefix the photo-content brief used for values Akhil had not filled in yet. */
const BRIEF_MARKER_PREFIX = '[AKHIL-';

/**
 * Alt text that announces the role before it reads the string. A screen reader already says
 * "image", so "Image of a kingfisher" is heard as "image image of a kingfisher".
 *
 * These three rules — non-empty, not equal to the title, no role prefix — were enforced on the
 * BRIEF (`00-PHOTO-CONTENT.md`) while it was being filled in. After 03-04 merged, the manifest is
 * the authority and the brief is history, so they move onto the data. Note for the record: plan
 * 03-06 attributes them to a `scripts/check-photo-content.mjs` that does not exist; the live copy
 * was in `test/content/photo-enrichment.unit.test.ts`, which asserts them about the migration
 * rather than about the shape. They are stated here because this is now the authority.
 */
const ROLE_PREFIXES = ['image of', 'photo of', 'picture of'];

/** Collapse for comparison only. The stored value is never rewritten. */
const normalise = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * A remote variant URL.
 *
 * ORIGIN EQUALITY, NOT `startsWith`. Both agree on the data as it stands, and they disagree on
 * two inputs a hand-edit can produce. Writing the canonical host as HOST (it is not spelled out
 * anywhere in this file on purpose — see note 2 in the header, and the unit suite asserts the
 * absence): `https://HOST.evil.test/x.webp` is a different registrable domain that merely shares
 * a prefix, and `https://HOST@evil.test/x.webp` puts the real host after an `@` where a prefix
 * comparison never looks. `URL` parsing resolves both correctly, so the comparison is on what a
 * fetch would actually contact rather than on what the string looks like.
 */
const remoteUrl = z
  .string()
  .min(1)
  .refine(
    (value) => {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return false;
      }
      return parsed.origin === IMAGE_ORIGIN;
    },
    {
      error: `must be an absolute URL whose origin is exactly ${IMAGE_ORIGIN} (imported from src/lib/image-origin.ts). A relative path, a different host, or a host that merely starts with those characters is refused.`,
    }
  );

/**
 * The LQIP. Not an address at all, which is why it is excluded from REMOTE_URL_KEYS.
 *
 * EXPORTED since plan 04-02 (W6). Phase 4's pipeline declares the same prefix in
 * `src/lib/photo-pipeline.ts` (`THUMB.dataUriPrefix`) because that module must stay loadable by
 * plain `node` on the Actions runner and cannot import this file — measured: this file imports
 * the origin extensionless, which Node's ESM resolver will not resolve. Without this `export`
 * the only available agreement check compared the pipeline's value against a literal re-typed in
 * a test, which agrees with itself and proves nothing.
 *
 * The `export` is a VISIBILITY change and nothing else: no zod rule moved, and a bare string
 * constant is not a rival content shape, so `npm run gate:schema` is unaffected (verified, exit
 * 0). `test/pipeline/photo-pipeline-contract.unit.test.ts` imports both sides and asserts they
 * are byte-equal, so the two cannot drift.
 */
export const THUMB_PREFIX = 'data:image/webp;base64,';

const thumbUri = z
  .string()
  .min(1)
  .refine((value) => value.startsWith(THUMB_PREFIX), {
    error: `urls.thumb is a base64 LQIP and must start with "${THUMB_PREFIX}" — it carries no hostname, so it is never rewritten by an origin migration.`,
  });

/**
 * `urls` is built from `REMOTE_URL_KEYS` rather than typed out, so the set of remote keys has one
 * definition. `thumb` is added explicitly, for the same reason `image-origin.ts` leaves it out of
 * that list: a `data:` URI parses perfectly well as a URL, so a "skip what isn't a URL" filter
 * would silently include it while looking careful.
 */
export const PhotoUrlsSchema = z.strictObject({
  ...Object.fromEntries(REMOTE_URL_KEYS.map((key) => [key, remoteUrl])),
  thumb: thumbUri,
} as { [K in (typeof REMOTE_URL_KEYS)[number]]: typeof remoteUrl } & { thumb: typeof thumbUri });

/**
 * EXIF is present on all 39 records with NULLABLE fields — not optional. `still-life-peppers` has all
 * six null, `architecture-redbuilding` five of six, and `lens` is null on 11. A schema declaring
 * these optional-but-complete would reject 11 real records; one declaring the object optional
 * would let a future record ship with no EXIF block at all.
 */
export const PhotoExifSchema = z.strictObject({
  camera: z.string().min(1).nullable(),
  lens: z.string().min(1).nullable(),
  aperture: z.string().min(1).nullable(),
  shutter: z.string().min(1).nullable(),
  iso: z.number().int().positive().nullable(),
  focalLength: z.string().min(1).nullable(),
});

/**
 * `dimensions` IS THE INTRINSIC SIZE OF THE SOURCE PHOTOGRAPH. (OD-11, decided 2026-08-26.)
 *
 * It is NOT the size of `urls.original`, and the difference is not theoretical — it is already
 * true of the committed data. MEASURED: `landscape-fairwayreflections` is `4608x3072` here while
 * `urls.original` serves `2000x1333`, because the pipeline caps the largest variant at 2000px.
 * Two other records differ the same way. The aspect ratios agree to within 0.03%.
 *
 * WHAT A CONSUMER MAY USE IT FOR: the ASPECT RATIO, and nothing else. That is what PUB-05's CLS
 * reservation needs — `aspect-ratio: width / height` on the element, so the box is reserved
 * before the bytes arrive.
 *
 * WHAT IT MUST NOT BE USED FOR: the pixel dimensions of any served variant. Writing
 * `width={photo.dimensions.width}` on an `<img>` whose `src` is `urls.original` states 4608 for a
 * 2000px image. It happens to be harmless for layout, because the ratio is preserved, and it is
 * wrong for anything that reasons about bytes — `srcset` descriptors, a density decision, a
 * "don't upscale" check. Phase 5 builds `srcset` on top of this field, which is why the contract
 * is written down now rather than inferred later from three records that disagree.
 *
 * WHO GUARANTEES IT: Phase 4's pipeline is the producer. It reads the dimensions from the SOURCE
 * file's metadata before any resize, so `dimensions` describes the photograph as it came off the
 * camera. `src/lib/photo-pipeline.ts` carries the same statement beside the variant table.
 *
 * This block changes no zod rule. It is a contract being written down where the field is
 * declared, because that is where a reader looks for it; the enforcement is 04-07's derivation
 * test (source metadata, never emitted variant size).
 */
export const PhotoDimensionsSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const PhotoSchema = z
  .strictObject({
    id: z.string().regex(SLUG, { error: 'photo id must be lowercase slug /^[a-z0-9-]+$/' }),
    title: z.string().min(1),
    alt: z.string().min(1),
    category: z.string().regex(SLUG, {
      error:
        'category must be a lowercase slug. It is compared to site_config ids with NO case transform on either side, so "Abstract" is a different value from "abstract" and is refused here rather than silently coerced.',
    }),
    date: z.string().regex(ISO_DATE, { error: 'date must be YYYY-MM-DD' }),
    exif: PhotoExifSchema,
    urls: PhotoUrlsSchema,
    order: z.number().int().positive(),
    categoryOrder: z.number().int().positive(),
    dimensions: PhotoDimensionsSchema,

    // --- optional, and they stay optional: parse() returns exactly what it was given ---
    place: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    focalPoint: z
      .string()
      .regex(POSITION, {
        error: `focalPoint uses the same "50% 25%" grammar as home_config.peekPositions (OD-5). Default when absent is ${DEFAULT_FOCAL_POINT}, applied by the renderer, not by this schema.`,
      })
      .optional(),

    // --- forbidden, by decision ---
    tags: z
      .never({
        error:
          'OD-3: `tags` is dropped. It was empty on all 39 records and nothing renders it; the gallery filters by category, and a second taxonomy with no consumer is metadata that rots. Resolved 2026-08-25 against three live documents that disagreed. Re-adding it is a deliberate schema change, not a field you forgot.',
      })
      .optional(),
  })
  .superRefine((photo, ctx) => {
    const alt = photo.alt;

    if (alt.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['alt'],
        message: 'alt is whitespace only — a screen reader announces nothing.',
      });
      return;
    }

    if (normalise(alt) === normalise(photo.title)) {
      ctx.addIssue({
        code: 'custom',
        path: ['alt'],
        message: `alt duplicates its own title (${JSON.stringify(photo.title)}). Compared case- and whitespace-insensitively, because "Into The Mist" and "into the mist" are the same non-description.`,
      });
    }

    const lower = normalise(alt);
    for (const prefix of ROLE_PREFIXES) {
      if (lower.startsWith(prefix)) {
        ctx.addIssue({
          code: 'custom',
          path: ['alt'],
          message: `alt opens with the role prefix "${prefix}" — assistive technology already announces the role, so this is heard twice.`,
        });
        break;
      }
    }

    if (alt.includes(BRIEF_MARKER_PREFIX)) {
      ctx.addIssue({
        code: 'custom',
        path: ['alt'],
        message: `alt still carries a ${BRIEF_MARKER_PREFIX}…] marker from the photo-content brief — a pending value reached the manifest.`,
      });
    }
  });

/** The manifest. `.min(1)` is the anti-vacuity guard: an empty file is a failure, not a pass. */
export const PhotoManifestSchema = z.array(PhotoSchema).min(1, {
  error:
    'data/portfolio_images.json holds no photos. An empty manifest satisfies every per-record rule trivially, so it is refused rather than passed.',
});

export type Photo = z.infer<typeof PhotoSchema>;
export type PhotoExif = z.infer<typeof PhotoExifSchema>;
export type PhotoUrls = z.infer<typeof PhotoUrlsSchema>;
