import { z } from 'astro/zod';

const SLUG = /^[a-z0-9-]+$/;

const NOT_A_CATEGORY = 'all';

export const CategorySchema = z.strictObject({
  id: z
    .string()
    .regex(SLUG, {
      error:
        'a category id is a lowercase slug. Photo records are compared to it with NO case transform on either side, so a capitalised id here would orphan every photograph filed under the lowercase spelling.',
    })
    .refine((id) => id !== NOT_A_CATEGORY, {
      error:
        'OD-2: "all" is not a category record. It is the unfiltered gallery affordance, and its column count is the sibling scalar `defaultColumns`. Admitting it as an id would force the ADR-002 referential-integrity rule to special-case exactly one value — and a special case inside the rule that prevents silent orphaning is where the next silent orphan comes from.',
    }),
  label: z.string().min(1),
  columns: z.number().int().positive(),
});

export const SiteConfigSchema = z
  .strictObject({
    categories: z.array(CategorySchema).min(1, {
      error:
        'site_config.categories is empty. Every referential-integrity rule over categories passes trivially against an empty id set, so an empty list is refused rather than passed.',
    }),
    defaultColumns: z.number().int().positive(),
  })
  .superRefine((site, ctx) => {
    const seen = new Map<string, number>();
    site.categories.forEach((category, index) => {
      const first = seen.get(category.id);
      if (first !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['categories', index, 'id'],
          message: `duplicate category id ${JSON.stringify(category.id)} — already declared at index ${first}. Two records for one id means one of them can never be selected.`,
        });
        return;
      }
      seen.set(category.id, index);
    });
  });

export type Category = z.infer<typeof CategorySchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
