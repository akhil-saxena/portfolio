/**
 * The shape of `data/resume.json`.
 *
 * THE ONE THING THIS FILE MUST NOT DO
 * -----------------------------------
 * Restate the bullet grammar. `containsHtmlTag` and `parseBullet` are IMPORTED from
 * `src/lib/bullets.ts`, which 03-02 established as the single definition of what a stored bullet
 * is. A regex written here that happened to agree with the parser today would be precisely the
 * second definition this plan exists to prevent — authored by the plan that forbids it — and it
 * would drift the first time the grammar gained an escape the schema had not heard of.
 *
 * The agreement is not merely stylistic. `containsHtmlTag` is deliberately narrower than
 * "contains an angle bracket": it fires on a bracket followed immediately by an ASCII letter, a
 * bang or a question mark, because real prose in this résumé contains comparison operators —
 * "p95 under 50ms" written with the operator, "a less-than b greater-than c", "2 under 3". A
 * lookalike character-class rule would reject that prose while agreeing on every malicious input,
 * which is why the unit suite tests those three strings as ACCEPTED rather than testing the
 * import with a grep.
 *
 * The second refinement is the one `containsHtmlTag` cannot make: an unbalanced emphasis
 * delimiter is not markup and is not visible to a tag predicate, but it is a bullet the renderer
 * cannot parse. `parseBullet` throwing IS the check, so the accepted language here is exactly the
 * language `serializeBullet` emits.
 *
 * WHAT IS ABSENT, AND IS ABSENT ON PURPOSE
 * ----------------------------------------
 * - `projects` (D-24, plan 03-05). The five records live in `data/projects.json` now. The object
 *   is strict, so putting the key back is a build failure rather than a quietly-ignored duplicate.
 * - `period` (OD-4, plan 03-05). Deleted from disk for all four dated records — three roles and
 *   education — and derived by `src/lib/period.ts`. Storing both the structured fields and the
 *   rendered string is the exact drift the legacy `src/types.ts` header documented. Strictness
 *   refuses the resurrection; the refinement below refuses the halfway states the structured
 *   fields alone can still express.
 *
 * That refinement calls `formatPeriod` and treats a throw as the failure, rather than restating
 * "isPresent implies no end date" as a boolean here. Same reasoning as the bullets: the invariant
 * has one implementation, and the schema asks it rather than repeating it.
 */

import { z } from 'astro/zod';
import { containsHtmlTag, parseBullet } from '../lib/bullets';
import { formatPeriod } from '../lib/period';

const SLUG = /^[a-z0-9-]+$/;

/**
 * A line of authored résumé prose: a role bullet, or a line of education leadership. Both are
 * rendered through the same path in 03-07, so both are held to the same grammar.
 */
const proseLine = z
  .string()
  .min(1)
  .refine((line) => !containsHtmlTag(line), {
    error:
      'contains an HTML tag. Stored résumé prose is bold-only inline markdown; the legacy app rendered these strings through dangerouslySetInnerHTML with no sanitiser anywhere in the repository, and ADR-001 answered that by making markup unrepresentable rather than by filtering it. Predicate imported from src/lib/bullets.ts.',
  })
  .refine(
    (line) => {
      try {
        parseBullet(line);
        return true;
      } catch {
        return false;
      }
    },
    {
      error:
        'is not in the stored bullet grammar — an unbalanced emphasis delimiter, a lone unescaped asterisk, or an unrecognised escape. A tag predicate cannot see any of these. parseBullet imported from src/lib/bullets.ts is the check.',
    }
  );

/** The structured date fields OD-4 put on disk in place of the rendered `period` string. */
const dateFields = {
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int().min(1000).max(9999),
  endMonth: z.number().int().min(1).max(12).optional(),
  endYear: z.number().int().min(1000).max(9999).optional(),
  isPresent: z.boolean(),
};

/**
 * Ask `src/lib/period.ts` whether the range is coherent, rather than restating its invariant.
 * A range that is both open and closed, or closed with no end, throws there and fails here.
 */
function checkPeriod(
  entry: {
    startMonth: number;
    startYear: number;
    endMonth?: number;
    endYear?: number;
    isPresent: boolean;
  },
  ctx: { addIssue: (issue: { code: 'custom'; path: (string | number)[]; message: string }) => void }
): void {
  try {
    formatPeriod(entry);
  } catch (error) {
    ctx.addIssue({
      code: 'custom',
      path: ['isPresent'],
      message: `incoherent date range — ${(error as Error).message}. The invariant lives in src/lib/period.ts and is asked, not repeated.`,
    });
  }
}

export const ExperienceEntrySchema = z
  .strictObject({
    id: z.string().regex(SLUG),
    company: z.string().min(1),
    role: z.string().min(1),
    ...dateFields,
    location: z.string().min(1),
    // Nullable, NOT optional: all three records carry an explicit null, and "absent" would be a
    // second way of saying the same thing.
    logo: z.string().min(1).nullable(),
    url: z.url().nullable(),
    bullets: z.array(proseLine).min(1),
    // OQ-1b, plan 05-03. The right-aligned figure at the end of each employment row on /work.
    //
    // REQUIRED, not optional: all three records carry one and the reviewed design (05-UI-SPEC
    // §10) has no employment row without it. An optional field would make "absent" a second way
    // of saying something the design cannot render.
    //
    // TWO FIELDS, not one string, for two independent reasons. §10 gives the value
    // `--ochre-d-strong` and the label the ink ramp at the same size, so a renderer needs them
    // apart; and a single "+15% CONVERSION" string forces every consumer to parse it back into
    // the two things it already was.
    //
    // DELIBERATELY NOT HERE: a refusal on the `{{…}}` placeholder form. It is tempting, and it
    // is the wrong layer. The question OQ-1b actually asks is whether a placeholder can reach a
    // reader, and that is a fact about RENDERED OUTPUT, not about stored text — a stored token
    // is a legitimate intermediate state (it is what option `defer` would have committed) while
    // a rendered one is always a defect. `scripts/assert-no-unresolved-placeholders.mjs` asks
    // that question of `dist/`, where it is a fact rather than an inference.
    //
    // NOT ON `EducationEntrySchema`, for the same reason `period` is derived rather than stored:
    // the education record is not in the employment band and has no figure to right-align.
    metric: z.strictObject({
      value: z.string().min(1),
      label: z.string().min(1),
    }),
  })
  .superRefine(checkPeriod);

export const EducationEntrySchema = z
  .strictObject({
    id: z.string().regex(SLUG),
    school: z.string().min(1),
    logo: z.string().min(1).nullable(),
    degree: z.string().min(1),
    cgpa: z.string().min(1),
    ...dateFields,
    url: z.url().nullable(),
    leadership: z.array(proseLine).min(1),
  })
  .superRefine(checkPeriod);

export const SkillGroupSchema = z.strictObject({
  category: z.string().min(1),
  icon: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

export const ResumeSchema = z.strictObject({
  experience: z.array(ExperienceEntrySchema).min(1, {
    error: 'resume.experience is empty — every bullet rule then passes without reading a bullet.',
  }),
  skills: z.array(SkillGroupSchema).min(1),
  education: z.array(EducationEntrySchema).min(1),
});

export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Resume = z.infer<typeof ResumeSchema>;
