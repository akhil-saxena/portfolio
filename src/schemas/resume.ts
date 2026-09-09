import { z } from 'astro/zod';
import { containsHtmlTag, parseBullet } from '../lib/bullets';
import { formatPeriod } from '../lib/period';

const SLUG = /^[a-z0-9-]+$/;

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

const dateFields = {
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int().min(1000).max(9999),
  endMonth: z.number().int().min(1).max(12).optional(),
  endYear: z.number().int().min(1000).max(9999).optional(),
  isPresent: z.boolean(),
};

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
    logo: z.string().min(1).nullable(),
    url: z.url().nullable(),
    bullets: z.array(proseLine).min(1),
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
