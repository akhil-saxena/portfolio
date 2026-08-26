/**
 * The shape of `data/site_config.json` — the seven category records D-25 created and ADR-002 §4
 * made load-bearing.
 *
 * WHY `all` IS REFUSED HERE RATHER THAN EXCLUDED IN THE RULE (OD-2)
 * ----------------------------------------------------------------
 * `categoryColumns` used to have eight keys; the eighth, `"All": 3`, was the column count for the
 * unfiltered gallery, not a category. If it were admitted as a record with `id: "all"`, then the
 * referential-integrity rule in `content-set.ts` — the rule ADR-002 traded `/admin/site` for —
 * would accept `photo.category === "all"` as valid, and a photograph filed under it would appear
 * in no filter tab while passing every check.
 *
 * The fix could have been an exclusion inside that rule. It is not, because an exclusion list
 * inside a referential-integrity check is a second source of truth about what a category is, and
 * a special case inside the rule that exists to prevent silent orphaning is where the next silent
 * orphan comes from. So `all` is refused at the point of definition, the unfiltered count lives in
 * the sibling scalar `defaultColumns`, and RI-1 has exactly seven legal values and carries no
 * exception at all.
 *
 * The array order is alphabetical and deliberate (OD-2b): self-maintaining when a category is
 * added, and scannable by name. It is not asserted here — an order rule would freeze the filter
 * row against a future decision to sort by photo count — but it is why the file looks sorted.
 */

import { z } from 'astro/zod';

const SLUG = /^[a-z0-9-]+$/;

/** The one value that is a rendered affordance rather than a data record. See the header. */
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
    /** The column count for the unfiltered gallery — OD-2's home for the former `"All"` key. */
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
