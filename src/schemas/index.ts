/**
 * The single import surface for every content shape in this project.
 *
 * Criterion 1 is not "validation exists". It is "the same module is what the build, the write
 * path and the admin's form errors all consume — validation cannot drift between them". Three
 * copies that agree today is a failure, not a pass.
 *
 * Two of those three consumers are real in Phase 3: 03-07's build gate, and the migration scripts
 * that wrote `data/*.json`. The third, the admin's form errors, is Phase 7 and cannot be
 * demonstrated now, so it is guarded STRUCTURALLY instead (OD-7): `scripts/assert-single-schema-source.mjs`
 * fails if a second definition of a content shape appears anywhere under `src/`. That is a weaker
 * claim than a third caller, and the phase's verification says so out loud rather than counting
 * three consumers it does not have.
 *
 * Import from here, not from the individual files, so that a change to the file layout is not a
 * change to every call site.
 */

export {
  assertContentSet,
  type ContentSetInput,
  type ContentSetReport,
  type ContentSetViolation,
  formatContentSetReport,
  type SkippedRule,
  validateContentSet,
} from './content-set';
export { type HomeConfig, HomeConfigSchema } from './home';
export {
  DEFAULT_FOCAL_POINT,
  type Photo,
  type PhotoExif,
  PhotoExifSchema,
  PhotoManifestSchema,
  PhotoSchema,
  type PhotoUrls,
  PhotoUrlsSchema,
  POSITION,
} from './photo';
export {
  type Badge,
  BadgeSchema,
  type Project,
  ProjectSchema,
  ProjectsSchema,
} from './projects';
export {
  type EducationEntry,
  EducationEntrySchema,
  type ExperienceEntry,
  ExperienceEntrySchema,
  type Resume,
  ResumeSchema,
  type SkillGroup,
  SkillGroupSchema,
} from './resume';
export { type Category, CategorySchema, type SiteConfig, SiteConfigSchema } from './site';
