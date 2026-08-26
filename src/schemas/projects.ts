/**
 * The shape of `data/projects.json` — the five records D-24 lifted out of `resume.json` in 03-05.
 *
 * THE OD-6 REFINEMENT, AND WHY IT IS A SCHEMA RULE RATHER THAN A LINT
 * ------------------------------------------------------------------
 * The design-system project's description used to read "79-component React library". The figure
 * went stale three times in nine days — 80, then 79, then 81 — and was hand-repaired once already
 * (`db65b12 fix(data): repair a dead CTA route and the stale component count`). OD-6 replaced it
 * with the token `{{ds.componentCount}}`, to be resolved in Phase 5 against the design system's
 * own catalog once the package is a dependency of this repository.
 *
 * A token is only worth having if the thing it replaced cannot come back, so the schema REFUSES
 * any description carrying a literal component figure. Both spellings are covered — "81-component"
 * and "81 component" — because the second is what a well-meaning copy edit produces from the
 * first. It is a schema rule rather than a lint because the Phase 7 admin writes this field: a
 * lint would catch it at the next CI run, and the schema catches it at the moment of the save,
 * which is the only moment the author is still looking at the sentence.
 *
 * What this rule does NOT do is check that the token is present. Phase 5's resolver replaces it,
 * so a resolved description must remain legal — and a description that never had a figure at all
 * (00-COPY's alternative wording, "a React component library where one token change lands across
 * every screen at once") is legal too, deliberately. The rule bans the failure, not the shape.
 */

import { z } from 'astro/zod';

const SLUG = /^[a-z0-9-]+$/;

/**
 * A hardcoded component count in prose. Hyphen or space, any digits. Case-insensitive because
 * a sentence can start with it. Not global, so `.test` carries no `lastIndex` state between calls.
 */
const LITERAL_COMPONENT_FIGURE = /\b\d+[- ]component/i;

export const BadgeSchema = z.strictObject({
  label: z.string().min(1),
  href: z.url(),
  icon: z.string().min(1),
});

export const ProjectSchema = z.strictObject({
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  label: z.strictObject({
    text: z.string().min(1),
    icon: z.string().min(1),
  }),
  description: z
    .string()
    .min(1)
    .refine((text) => !LITERAL_COMPONENT_FIGURE.test(text), {
      error:
        'OD-6: a project description may not carry a literal component figure. It has been wrong three times in nine days. Use the {{ds.componentCount}} token, which Phase 5 resolves against the design system catalog, or reword so no figure appears.',
    }),
  tech: z.array(z.string().min(1)).min(1),
  // Nullable, NOT optional: two of the five carry an explicit null.
  icon: z.string().min(1).nullable(),
  href: z.url(),
  badges: z.array(BadgeSchema).min(1),
});

export const ProjectsSchema = z.array(ProjectSchema).min(1, {
  error:
    'data/projects.json holds no projects. The uniqueness rule over project ids passes trivially against an empty list, so an empty file is refused rather than passed.',
});

export type Badge = z.infer<typeof BadgeSchema>;
export type Project = z.infer<typeof ProjectSchema>;
