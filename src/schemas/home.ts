import { z } from 'astro/zod';
import { POSITION } from './photo';

const SLUG = /^[a-z0-9-]+$/;

const photoId = z.string().regex(SLUG, {
  error: 'a peek entry references a photo by id, which is a lowercase slug',
});

const position = z.string().regex(POSITION, {
  error:
    'a peek position is a CSS background-position pair in the "50% 25%" grammar — the same grammar photo.focalPoint uses, imported from photo.ts rather than restated (OD-5).',
});

export const HomeConfigSchema = z.strictObject({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  intro: z.string(),

  description: z.string().min(1),

  peekIds: z.array(photoId).min(1, {
    error:
      'home_config.peekIds is empty. RI-3 iterates it, so an empty list makes that rule pass without looking at anything.',
  }),

  peekPositions: z.record(photoId, position),

  socialLinks: z
    .array(
      z.strictObject({
        icon: z.string().min(1),
        url: z.url(),
        label: z.string().min(1),
      })
    )
    .min(1),

  ctas: z.array(
    z.strictObject({
      text: z.string().min(1),
      link: z.string().min(1).startsWith('/'),
      style: z.enum(['primary', 'secondary']),
    })
  ),
});

export type HomeConfig = z.infer<typeof HomeConfigSchema>;
