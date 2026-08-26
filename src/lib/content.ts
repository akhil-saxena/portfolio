/**
 * The three singleton content files, as typed and validated exports.
 *
 * `resume.json`, `site_config.json` and `home_config.json` are OBJECTS, not arrays. Astro's
 * `file()` loader takes "an array of objects with a unique `id` field, or an object with IDs as
 * keys" (`research/STACK.md` §"Content and Validation"), and none of the three is either — forcing
 * them through it would turn `resume.experience` into a collection entry called `experience` and
 * `site_config.defaultColumns` into an entry called `defaultColumns`, which is not a content
 * collection, it is a JSON file wearing one. So they are plain imports parsed here, and the two
 * array files go through `src/content.config.ts` instead.
 *
 * MEASURED, BEFORE THIS FILE WAS WRITTEN: A MODULE-SCOPE PARSE IS NOT A BUILD GATE
 * -------------------------------------------------------------------------------
 * `research/ARCHITECTURE.md` §"Pattern 2" asserts that a module-scope `Schema.parse(raw)` here
 * *"aborts `astro build` with the zod issue path — no bad page is emitted"*, because *"Astro
 * evaluates this during prerender."* Plan 03-08 measured that claim in this repository rather than
 * citing it. It is FALSE as things stand: with `data/resume.json` carrying a numeric value at
 * `experience[0].bullets[2]` and this module written exactly as below, `astro build` exited **0**
 * and emitted `dist/`. Astro only evaluates a module something imports, and nothing imports this
 * one — `src/pages/index.astro` renders `StackProof` and no content, and there is no `/resume`,
 * `/photos` or `/work` until Phase 5.
 *
 * The claim is not wrong in general; it is wrong about a repository with no consuming page, which
 * is the repository it was written for. So the load-bearing cross-file rules do NOT depend on it:
 * `astro.config.mjs` carries them in an integration hook that runs whether or not a page exists.
 *
 * This file is still correct and still worth having, for the reason a Phase 5 page will import it:
 * from that moment the parse below runs during prerender, and a bad `resume.json` breaks the page
 * that renders it rather than shipping a broken one. It is written so that it is already right when
 * that happens, and the summary for 03-08 records that it is not, today, an enforcement point.
 *
 * WHY THE ERROR IS FORMATTED HERE RATHER THAN LEFT AS A ZodError
 * -------------------------------------------------------------
 * `ResumeSchema.parse(raw)` throws `Invalid input: expected string, received number` with
 * `path: ["experience", 0, "bullets", 2]`. That names neither the file nor the company. Criterion 2
 * is about the difference, so the throw goes through `content-errors.ts`, and the stack is dropped:
 * the useful frame is `data/resume.json → Brevo … → bullets[2]`, and the twelve frames of Vite
 * internals underneath it are what makes a build failure something people scroll past.
 */

import rawHome from '../../data/home_config.json';
import rawResume from '../../data/resume.json';
import rawSite from '../../data/site_config.json';
import type { HomeConfig, Resume, SiteConfig } from '../schemas';
import { HomeConfigSchema, ResumeSchema, SiteConfigSchema } from '../schemas';
import { formatSchemaFailure } from './content-errors';

/**
 * Parse, or refuse with a message that names the file, the record and the field.
 *
 * The schema parameter is structural rather than a zod type so that this helper does not import
 * `astro/zod` to describe something it only calls. `safeParse` rather than `parse` because the
 * error has to be reformatted before it is thrown, and catching a throw to reformat it would
 * discard the typed result on the success path.
 */
function validated<T>(
  file: string,
  rootName: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } },
  raw: unknown
): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data as T;
  const refusal = new Error(formatSchemaFailure(file, rootName, raw, result.error));
  refusal.stack = '';
  throw refusal;
}

export const resume: Resume = validated(
  'data/resume.json',
  'resume',
  ResumeSchema,
  rawResume as unknown
);

export const site: SiteConfig = validated(
  'data/site_config.json',
  'site',
  SiteConfigSchema,
  rawSite as unknown
);

export const home: HomeConfig = validated(
  'data/home_config.json',
  'home',
  HomeConfigSchema,
  rawHome as unknown
);
