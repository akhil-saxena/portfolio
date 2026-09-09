import { z } from 'astro/zod';

const SLUG = /^[a-z0-9-]+$/;

const LITERAL_COMPONENT_FIGURE = /\b\d+[- ]component/i;

function copyWithNoLiteralComponentFigure(field: 'description' | 'oneLiner') {
  return z
    .string()
    .min(1)
    .refine((text) => !LITERAL_COMPONENT_FIGURE.test(text), {
      error:
        `OD-6: a project ${field} may not carry a literal component figure. It has been wrong ` +
        'three times in nine days. Use the {{ds.componentCount}} token, which Phase 5 resolves ' +
        'against the design system catalog, or reword so no figure appears.',
    });
}

export const BadgeSchema = z.strictObject({
  label: z.string().min(1),
  href: z.url(),
  icon: z.string().min(1),

  pending: z.literal(true).optional(),
});

export const ProjectSchema = z.strictObject({
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  label: z.strictObject({
    text: z.string().min(1),
    icon: z.string().min(1),
  }),
  status: z.enum(['live', 'maintained', 'archived']),
  oneLiner: copyWithNoLiteralComponentFigure('oneLiner'),
  description: copyWithNoLiteralComponentFigure('description'),
  tech: z.array(z.string().min(1)).min(1),
  icon: z.string().min(1).nullable(),

  mark: z
    .strictObject({
      dark: z.string().min(1),
      light: z.string().min(1),
    })
    .optional(),

  href: z.url(),
  badges: z.array(BadgeSchema).min(1),
});

export const ProjectsSchema = z.array(ProjectSchema).min(1, {
  error:
    'data/projects.json holds no projects. The uniqueness rule over project ids passes trivially against an empty list, so an empty file is refused rather than passed.',
});

export type Badge = z.infer<typeof BadgeSchema>;
export type Project = z.infer<typeof ProjectSchema>;
