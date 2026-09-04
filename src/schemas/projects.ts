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
 *
 * THE THREE FIELDS PHASE 5 ADDED, AND WHY THE BUDGETS ARE NOT HERE (plan 05-02, OQ-1)
 * -----------------------------------------------------------------------------------
 * `05-UI-SPEC.md` §0.3 measured this shape against the reviewed Phase 0 design and found two
 * fields simply absent: the D-45 status the `StatusPill` renders, and the short Home Act-2
 * sentence, which is a DIFFERENT string from the Work card's. `00-COPY/one-liners.md` had carried
 * all three since Phase 0 and was never merged; `scripts/migrate-project-copy.mjs` merges it, and
 * `test/content/project-copy.unit.test.ts` proves the merge verbatim against that same file.
 *
 * `status` is REQUIRED and is the only place currency lives (§13.1 rule 4). It is deliberately NOT
 * derived from, or cross-checked against, `badges[]`: `badges[]` is a LINK list, and the
 * coincidence that cairn's first badge label reads "Live" while hued's read "Play Store" and
 * "GitHub" is exactly the confusion this field exists to end (§10.2).
 *
 * `oneLiner` is REQUIRED for the same reason `status` is — all five records have one, and
 * "absent" would be a second way of saying something the data never means.
 *
 * THE CHARACTER BUDGETS (§13.1: one-liner 60–110, description 120–200) ARE NOT REFINEMENTS HERE,
 * and that is a measurement rather than an omission. The stored design-system one-liner is 116
 * characters because `{{ds.componentCount}}` is 19 characters longer than the figure it replaced;
 * it RESOLVES to 97. A `.min/.max` on the stored string would refuse correct data. The budget
 * belongs to the resolved string and is asserted in `test/content/project-copy.unit.test.ts`,
 * where the resolver actually runs.
 */

import { z } from 'astro/zod';

const SLUG = /^[a-z0-9-]+$/;

/**
 * A hardcoded component count in prose. Hyphen or space, any digits. Case-insensitive because
 * a sentence can start with it. Not global, so `.test` carries no `lastIndex` state between calls.
 */
const LITERAL_COMPONENT_FIGURE = /\b\d+[- ]component/i;

/**
 * The OD-6 refusal, as a reusable string schema.
 *
 * It was inline on `description` until plan 05-02 added `oneLiner`, at which point the reviewed
 * copy put the same sentence-with-a-figure in TWO fields — `00-COPY/one-liners.md`'s design-system
 * one-liner ends "…{{ds.componentCount}} components, and this page is built on them." A rule that
 * guarded one of the two would leave the figure a hand-edit away from coming back on the other,
 * and the Home Act-2 one-liner is the more visible of the pair. The refusal follows the sentence,
 * not the field it happened to be written for first.
 *
 * @param field the field name to name in the refusal, so the message points at the right string
 */
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

  /**
   * A DESTINATION THAT IS PROMISED RATHER THAN LIVE.
   *
   * Akhil: *"for momentum, on play store icon, add a tooltip on hover saying Coming Soon."* The
   * reason he asked is the fact worth recording — MEASURED by fetching both listings:
   *
   *     hued      play.google.com/.../app.hued           200
   *     momentum  play.google.com/.../com.momentum.goals  404
   *
   * So that mark was an anchor to a Google error page. A hover tooltip would have explained it to
   * sighted mouse users and left every keyboard, screen-reader and touch reader clicking through to
   * the 404 — the tooltip describes the problem instead of fixing it.
   *
   * `ProjectCard` renders a pending badge as TEXT AND NOT A LINK: same glyph-plus-label shape as
   * `cairn.co.in`, but a `<span>`, so there is nothing to click, nothing in the tab order and no
   * outbound anchor to announce. The state is readable by everyone rather than hoverable by some.
   *
   * `href` STAYS REQUIRED AND STAYS A URL. The address is already known; it just does not answer
   * yet. Keeping it means going live is deleting this one flag rather than re-finding the link — and
   * a pending badge with no href would be a badge that cannot be promoted.
   *
   * `z.literal(true).optional()` RATHER THAN `z.boolean()`: the only meaningful state is "pending",
   * so absence is the default and `"pending": false` can never be written. A boolean would allow two
   * spellings of live.
   */
  pending: z.literal(true).optional(),
});

export const ProjectSchema = z.strictObject({
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  label: z.strictObject({
    text: z.string().min(1),
    icon: z.string().min(1),
  }),
  /**
   * D-45's currency vocabulary, rendered by `StatusPill` on Work and on Home Act 2 (§10.2). Three
   * values and no fourth: the pill's generic path takes one tone per value and an unmapped status
   * would have nothing to render. Sourced per project, with a reason each, in
   * `00-COPY/one-liners.md`'s `badge:` lines.
   */
  status: z.enum(['live', 'maintained', 'archived']),
  /**
   * The Home Act-2 sentence (§13.1). A DIFFERENT string from `description` — 60–110 characters
   * against the card's 120–200, measured on the RESOLVED text (see the header) rather than here.
   */
  oneLiner: copyWithNoLiteralComponentFigure('oneLiner'),
  /** The Work card sentence (§13.1). Unchanged in shape since 03-05; only the copy was replaced. */
  description: copyWithNoLiteralComponentFigure('description'),
  tech: z.array(z.string().min(1)).min(1),
  // Nullable, NOT optional: two of the five carry an explicit null.
  icon: z.string().min(1).nullable(),

  /**
   * A THEME-AWARE BRAND MARK, and why it is not `icon`.
   *
   * `icon` holds STORE ARTWORK: `/assets/{hued,momentum,timeshift}-icon.png`, opaque squares that
   * look the same on any ground because an app icon has to. One path is the whole answer.
   *
   * Cairn's mark is not that. Taken from `cairn/public/brand/`, it is a KNOCK-OUT — a filled rounded
   * square with the cairn's stones cut out of it, so the stones show whatever is behind them. The
   * repository ships four variants for exactly that reason, and two of them are a ground pair:
   *
   *     icon-on-dark.svg   cream #FAFAF7 square — for a dark ground
   *     icon-on-light.svg  ink   #1F1B17 square — for a light ground
   *
   * Either one alone is wrong in the other theme: the cream square disappears on a near-white page.
   * A single path cannot express that, so the pair is its own field rather than a convention smuggled
   * into `icon`'s string — a `-dark`/`-light` filename swap done in code is a naming rule nothing
   * checks, and it would break silently the first time a mark is exported under another name.
   *
   * IT ALSO LEAVES `icon` UNTOUCHED, which matters: `resume-structure.unit.test.ts` pins these five
   * records byte-identical to the revision they were moved from, and `icon` is one of the eight keys
   * it compares. Adding a field is a change that can be NAMED there (`POST_MOVE_KEYS`); editing one
   * of the eight would be a change to the thing being proved.
   */
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
