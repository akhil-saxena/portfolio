/**
 * The shape of `data/home_config.json`.
 *
 * No migration touched this file in Phase 3. What this plan adds is the referential integrity it
 * has always relied on and nothing has ever asserted: all six `peekIds` are photo ids, and every
 * `peekPositions` key is one of those six. Both hold today; neither was written down anywhere.
 * Those two rules cannot live here — they need the photo manifest — so they are in
 * `content-set.ts` as RI-3 and RI-4. This file carries the shape, and the position grammar.
 *
 * WHY THAT MATTERS MORE AFTER PHASE 7 THAN BEFORE IT
 * --------------------------------------------------
 * `/admin/home` edits both fields. A peek id left pointing at a deleted photograph does not error
 * — it renders a blank tile in the hero, which looks like a slow image rather than a broken one.
 * A `peekPositions` entry for a photo no longer in the peek set is quieter still: it is simply
 * never read. Neither shows up in a smoke test.
 *
 * The position grammar is imported from `photo.ts` rather than restated. OD-5 kept `focalPoint`
 * and `peekPositions` as two fields because they answer different questions — the photograph's own
 * default crop, and the Home hero's specific one — but they are the same GRAMMAR, and two copies
 * of a regex is how the two fields would drift into meaning slightly different things.
 */

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
  intro: z.string().min(1),

  peekIds: z.array(photoId).min(1, {
    error:
      'home_config.peekIds is empty. RI-3 iterates it, so an empty list makes that rule pass without looking at anything.',
  }),

  /**
   * Keyed by photo id. A record rather than an array because it is a sparse override: exactly one
   * of the six peeked photographs currently declares one.
   */
  peekPositions: z.record(photoId, position),

  socialLinks: z
    .array(
      z.strictObject({
        icon: z.string().min(1),
        // Not `z.url()`-only by accident: one of the three is a `mailto:`, which URL parsing
        // accepts and a naive https-only rule would reject.
        url: z.url(),
        label: z.string().min(1),
      })
    )
    .min(1),

  /*
   * NO `.min(1)`, AND THE EMPTY ARRAY IS THE POINT.
   *
   * It required at least one until 2026-08-30, on the reasonable premise that a landing page needs
   * a call to action. The approved prototype's Act 1 has none — the legacy site added them and the
   * rebuild inherited them — and Akhil removed them, because the button was the only filled element
   * on the page and the eye reached it before the photographs.
   *
   * The FIELD stays, and each record is still validated as strictly as before: this is CMS content
   * he can refill from the admin without a schema change. What is no longer asserted is that he
   * must. Nothing became unreachable — `/photos` is the nav and the grid's own `ALL 40 →` badge,
   * `/work` is the nav and Act 2, `/resume` is Act 2.
   */
  ctas: z.array(
    z.strictObject({
      text: z.string().min(1),
      // A site-relative path, so URL parsing is the wrong check here.
      link: z.string().min(1).startsWith('/'),
      style: z.enum(['primary', 'secondary']),
    })
  ),
});

export type HomeConfig = z.infer<typeof HomeConfigSchema>;
