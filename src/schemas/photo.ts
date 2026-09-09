import { z } from 'astro/zod';
import { IMAGE_ORIGIN, REMOTE_URL_KEYS } from '../lib/image-origin';

export const DEFAULT_FOCAL_POINT = '50% 50%';

const SLUG = /^[a-z0-9-]+$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const POSITION = /^\d{1,3}% \d{1,3}%$/;

const BRIEF_MARKER_PREFIX = '[AKHIL-';

const ROLE_PREFIXES = ['image of', 'photo of', 'picture of'];

const normalise = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

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

export const THUMB_PREFIX = 'data:image/webp;base64,';

const thumbUri = z
  .string()
  .min(1)
  .refine((value) => value.startsWith(THUMB_PREFIX), {
    error: `urls.thumb is a base64 LQIP and must start with "${THUMB_PREFIX}" — it carries no hostname, so it is never rewritten by an origin migration.`,
  });

export const PhotoUrlsSchema = z.strictObject({
  ...Object.fromEntries(REMOTE_URL_KEYS.map((key) => [key, remoteUrl])),
  thumb: thumbUri,
} as { [K in (typeof REMOTE_URL_KEYS)[number]]: typeof remoteUrl } & { thumb: typeof thumbUri });

export const PhotoExifSchema = z.strictObject({
  camera: z.string().min(1).nullable(),
  lens: z.string().min(1).nullable(),
  aperture: z.string().min(1).nullable(),
  shutter: z.string().min(1).nullable(),
  iso: z.number().int().positive().nullable(),
  focalLength: z.string().min(1).nullable(),
});

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

    place: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    focalPoint: z
      .string()
      .regex(POSITION, {
        error: `focalPoint uses the same "50% 25%" grammar as home_config.peekPositions (OD-5). Default when absent is ${DEFAULT_FOCAL_POINT}, applied by the renderer, not by this schema.`,
      })
      .optional(),

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

export const PhotoManifestSchema = z.array(PhotoSchema).min(1, {
  error:
    'data/portfolio_images.json holds no photos. An empty manifest satisfies every per-record rule trivially, so it is refused rather than passed.',
});

export type Photo = z.infer<typeof PhotoSchema>;
export type PhotoExif = z.infer<typeof PhotoExifSchema>;
export type PhotoUrls = z.infer<typeof PhotoUrlsSchema>;
