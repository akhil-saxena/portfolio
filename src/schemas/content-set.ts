/**
 * The cross-file assertions no per-file schema can express.
 *
 * WHY THIS FILE IS THE SHARP END OF ADR-002
 * -----------------------------------------
 * ADR-002 deleted `/admin/site` on the argument that "a guard does not need a screen". The guard
 * is RI-1 below: every `photo.category` must exist in `site_config`'s ids. There is now no UI
 * between a hand-edit of `data/site_config.json` and fourteen orphaned photographs, so this
 * function is the only thing standing there. Two further rules — RI-3 and RI-4 — were found by
 * probing `home_config.json` rather than by reading a specification; both hold today, neither was
 * written down anywhere, and `/admin/home` edits both fields in Phase 7.
 *
 * EVERY VIOLATION IS ACCUMULATED. NOTHING THROWS ON THE FIRST BAD RECORD.
 * ----------------------------------------------------------------------
 * A validator that stops at the first failure makes fixing 39 records a 39-run loop, and the
 * person doing the fixing has no idea after run 1 whether they are looking at one problem or
 * thirty. Same convention as `scripts/check` gates in this repository: all findings first, one
 * exit at the end.
 *
 * THE VACUITY CONTRACT — READ THIS BEFORE TRUSTING A GREEN RESULT
 * --------------------------------------------------------------
 * Phase 3 has shipped eight gates that could not fail, several of them by iterating an empty
 * collection and reporting success. So:
 *
 *   1. Every per-file schema carries `.min(1)` on its top-level arrays. An empty manifest, an
 *      empty category list and an empty peek list are FAILURES, not clean runs.
 *   2. `report.checked` states how many things each rule looked at. A run that examined zero
 *      photographs cannot be mistaken for a run that examined thirty-nine, by a human or by a
 *      test.
 *   3. A rule whose inputs did not survive their own schema is NOT run and is NOT counted as
 *      passing — it is listed by name in `checked.rulesSkipped` with the reason. Silence about a
 *      rule that could not run is the specific failure this contract exists to prevent.
 *
 * WHAT THIS FUNCTION CANNOT SEE
 * -----------------------------
 * It validates the content SET it is handed. It has no opinion on whether the caller handed it
 * the committed files or something else, and it does not read from disk — these modules run
 * inside `workerd` during prerender, where there is no filesystem. The build gate (03-07) is what
 * binds it to `data/*.json`.
 */

import { describeIssue } from '../lib/content-errors';
import { HomeConfigSchema } from './home';
import { PhotoManifestSchema } from './photo';
import { ProjectsSchema } from './projects';
import { ResumeSchema } from './resume';
import { SiteConfigSchema } from './site';

export interface ContentSetInput {
  photos: unknown;
  site: unknown;
  home: unknown;
  projects: unknown;
  resume: unknown;
}

export interface ContentSetViolation {
  /** `RI-1`…`RI-6`, or `SCHEMA-<file>` for a per-file failure. */
  rule: string;
  /** The file, and the path within it, so the reader can go straight there. */
  where: string;
  /** What is wrong, naming the offending value. */
  detail: string;
  /** Why it matters — the consequence, not a restatement of the rule. */
  why: string;
}

export interface SkippedRule {
  rule: string;
  why: string;
}

export interface ContentSetChecked {
  photos: number;
  categories: number;
  peekIds: number;
  peekPositions: number;
  projects: number;
  categoryOrderGroups: number;
  rulesRun: string[];
  rulesSkipped: SkippedRule[];
}

export interface ContentSetReport {
  ok: boolean;
  violations: ContentSetViolation[];
  checked: ContentSetChecked;
}

const FILE = {
  photos: 'data/portfolio_images.json',
  site: 'data/site_config.json',
  home: 'data/home_config.json',
  projects: 'data/projects.json',
  resume: 'data/resume.json',
} as const;

/**
 * The name of the top-level array in the two files that ARE arrays.
 *
 * A zod issue path for `photos[12].order` begins at the index, so it carries no name for the thing
 * being indexed. The formatter needs one to render `landscape-hillsandgreens [photos[12] of 39]`, and
 * it comes from here rather than from a string literal at the call site so the two array files and
 * the three object files are described by one table.
 */
const ROOT_NAME = {
  photos: 'photos',
  site: 'site',
  home: 'home',
  projects: 'projects',
  resume: 'resume',
} as const;

/** Every value that appears more than once, with the indices it appeared at. */
function duplicates<T>(values: T[]): Map<T, number[]> {
  const seen = new Map<T, number[]>();
  values.forEach((value, index) => {
    const at = seen.get(value);
    if (at) at.push(index);
    else seen.set(value, [index]);
  });
  const out = new Map<T, number[]>();
  for (const [value, at] of seen) if (at.length > 1) out.set(value, at);
  return out;
}

type ParsedPhotos = ReturnType<typeof PhotoManifestSchema.parse>;
type ParsedSite = ReturnType<typeof SiteConfigSchema.parse>;
type ParsedHome = ReturnType<typeof HomeConfigSchema.parse>;
type ParsedProjects = ReturnType<typeof ProjectsSchema.parse>;

export function validateContentSet(input: ContentSetInput): ContentSetReport {
  const violations: ContentSetViolation[] = [];
  const rulesRun: string[] = [];
  const rulesSkipped: SkippedRule[] = [];

  /* ------------------------------------------------------------------------------------------
   * 1. The per-file schemas. Every issue from every file, not the first file that fails.
   * ---------------------------------------------------------------------------------------- */

  const runSchema = <T>(
    key: keyof typeof FILE,
    schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } }
  ): T | null => {
    const result = schema.safeParse(input[key]);
    if (result.success) return result.data as T;
    const issues = (result.error as { issues?: { path: PropertyKey[]; message: string }[] })
      .issues ?? [{ path: [], message: String(result.error) }];
    for (const issue of issues) {
      // NAMED, not merely located. `data/resume.json experience[0].bullets[2]` tells the reader
      // where to click and not which company's bullet it is; `describeIssue` walks the same path
      // through the DATA and reports `Brevo … [experience[0] of 3] → bullets[2]`. That difference
      // is criterion 2's "readable", and it is why this function has the raw input in scope.
      const framed = describeIssue(FILE[key], ROOT_NAME[key], input[key], issue);
      violations.push({
        rule: `SCHEMA-${key}`,
        where: framed.where,
        detail: framed.detail,
        why: `${FILE[key]} does not match its schema in src/schemas, so nothing downstream may assume its shape.`,
      });
    }
    return null;
  };

  const photos = runSchema<ParsedPhotos>('photos', PhotoManifestSchema);
  const site = runSchema<ParsedSite>('site', SiteConfigSchema);
  const home = runSchema<ParsedHome>('home', HomeConfigSchema);
  const projects = runSchema<ParsedProjects>('projects', ProjectsSchema);
  runSchema('resume', ResumeSchema);

  /* ------------------------------------------------------------------------------------------
   * 2. The census. Counted from the RAW input, so a file that failed its schema still reports
   *    how much of it there was — including zero, which is the number that matters.
   * ---------------------------------------------------------------------------------------- */

  const rawPhotos = Array.isArray(input.photos) ? (input.photos as unknown[]) : [];
  const rawCategories =
    input.site &&
    typeof input.site === 'object' &&
    Array.isArray((input.site as { categories?: unknown }).categories)
      ? (input.site as { categories: unknown[] }).categories
      : [];
  const rawHome = (input.home ?? {}) as { peekIds?: unknown; peekPositions?: unknown };
  const rawPeekIds = Array.isArray(rawHome.peekIds) ? rawHome.peekIds : [];
  const rawPeekPositions =
    rawHome.peekPositions && typeof rawHome.peekPositions === 'object'
      ? Object.keys(rawHome.peekPositions as object)
      : [];

  const checked: ContentSetChecked = {
    photos: rawPhotos.length,
    categories: rawCategories.length,
    peekIds: rawPeekIds.length,
    peekPositions: rawPeekPositions.length,
    projects: Array.isArray(input.projects) ? (input.projects as unknown[]).length : 0,
    categoryOrderGroups: 0,
    rulesRun,
    rulesSkipped,
  };

  /** Record a rule that could not run. It did not pass; it was not attempted. */
  const skip = (rule: string, missing: string[]): void => {
    rulesSkipped.push({
      rule,
      why: `not run — ${missing.map((m) => FILE[m as keyof typeof FILE]).join(' and ')} did not satisfy its own schema, so the values this rule compares are not trustworthy. It did NOT pass.`,
    });
  };

  /* ------------------------------------------------------------------------------------------
   * RI-1 — every photo.category resolves in site_config. THE ADR-002 RULE.
   * ---------------------------------------------------------------------------------------- */

  if (photos && site) {
    rulesRun.push('RI-1');
    const declared = site.categories.map((category) => category.id);
    const ids = new Set(declared);
    for (const photo of photos) {
      if (ids.has(photo.category)) continue;
      violations.push({
        rule: 'RI-1',
        where: `${FILE.photos} → ${photo.id} → category`,
        detail: `category ${JSON.stringify(photo.category)} does not exist in ${FILE.site}`,
        why: `the ${declared.length} declared ids are: ${declared.join(', ')}. Comparison is exact — no case transform on either side. ADR-002 §4 removed the screen that used to make this impossible, so this rule is the only thing between a hand-edit and an orphaned photograph.`,
      });
    }
  } else {
    skip('RI-1', photos ? ['site'] : site ? ['photos'] : ['photos', 'site']);
  }

  /* ------------------------------------------------------------------------------------------
   * RI-2 — the other direction: a declared id no photograph uses.
   * ---------------------------------------------------------------------------------------- */

  if (photos && site) {
    rulesRun.push('RI-2');
    const used = new Set(photos.map((photo) => photo.category));
    for (const category of site.categories) {
      if (used.has(category.id)) continue;
      violations.push({
        rule: 'RI-2',
        where: `${FILE.site} → ${category.id}`,
        detail: `no photograph is filed under ${JSON.stringify(category.id)}`,
        why: 'a declared category no photograph uses ships as a filter tab that opens an empty gallery. RI-1 alone cannot see this: it is clean in exactly this case.',
      });
    }
  } else {
    skip('RI-2', photos ? ['site'] : site ? ['photos'] : ['photos', 'site']);
  }

  /* ------------------------------------------------------------------------------------------
   * RI-3 — every home_config.peekIds entry is a real photo id.
   * ---------------------------------------------------------------------------------------- */

  if (photos && home) {
    rulesRun.push('RI-3');
    const photoIds = new Set(photos.map((photo) => photo.id));
    home.peekIds.forEach((id, index) => {
      if (photoIds.has(id)) return;
      violations.push({
        rule: 'RI-3',
        where: `${FILE.home} → peekIds[${index}]`,
        detail: `${JSON.stringify(id)} is not the id of any photograph`,
        why: 'a peek id pointing at a deleted photograph renders a blank tile in the Home hero. It reads as a slow image rather than a broken one, so nothing surfaces it.',
      });
    });
  } else {
    skip('RI-3', photos ? ['home'] : home ? ['photos'] : ['photos', 'home']);
  }

  /* ------------------------------------------------------------------------------------------
   * RI-4 — every peekPositions key is one of the peeked photographs.
   * ---------------------------------------------------------------------------------------- */

  if (home) {
    rulesRun.push('RI-4');
    const peeked = new Set(home.peekIds);
    for (const key of Object.keys(home.peekPositions)) {
      if (peeked.has(key)) continue;
      violations.push({
        rule: 'RI-4',
        where: `${FILE.home} → peekPositions[${JSON.stringify(key)}]`,
        detail: `${JSON.stringify(key)} is not one of the peeked photographs`,
        why: 'a crop override for a photograph the hero does not show is never read, so it is dead configuration that looks live. OD-5 kept this field alongside photo.focalPoint on the argument that they answer different questions; this is the assertion that keeps that argument honest.',
      });
    }
  } else {
    skip('RI-4', ['home']);
  }

  /* ------------------------------------------------------------------------------------------
   * RI-5 — photo ids, photo order values and project ids are each unique.
   * ---------------------------------------------------------------------------------------- */

  if (photos && projects) {
    rulesRun.push('RI-5');

    for (const [id, at] of duplicates(photos.map((photo) => photo.id))) {
      violations.push({
        rule: 'RI-5',
        where: `${FILE.photos} → indices ${at.join(', ')}`,
        detail: `duplicate photo id ${JSON.stringify(id)}`,
        why: 'ids address photographs from home_config and from every URL. Two records sharing one means one of them is unreachable.',
      });
    }

    for (const [order, at] of duplicates(photos.map((photo) => photo.order))) {
      violations.push({
        rule: 'RI-5',
        where: `${FILE.photos} → indices ${at.join(', ')}`,
        detail: `duplicate global order value ${String(order)}`,
        why: 'the global order is the gallery sequence. A tie is resolved by whatever the sort happens to do, which is not a decision anyone made.',
      });
    }

    for (const [id, at] of duplicates(projects.map((project) => project.id))) {
      violations.push({
        rule: 'RI-5',
        where: `${FILE.projects} → indices ${at.join(', ')}`,
        detail: `duplicate project id ${JSON.stringify(id)}`,
        why: 'project ids are the anchor for case-study routes; two records sharing one collides at build.',
      });
    }
  } else {
    skip('RI-5', photos ? ['projects'] : projects ? ['photos'] : ['photos', 'projects']);
  }

  /* ------------------------------------------------------------------------------------------
   * RI-6 — categoryOrder is unique WITHIN its category.
   *
   * Per group, deliberately. Every category restarts at 1, so a global uniqueness check would
   * reject the data as it stands — and one written that way would look identical in a diff.
   * `categoryOrderGroups` counts the groups actually iterated, which is what makes a run over
   * zero groups distinguishable from a run over seven.
   * ---------------------------------------------------------------------------------------- */

  if (photos) {
    rulesRun.push('RI-6');
    const byCategory = new Map<string, { id: string; rank: number }[]>();
    for (const photo of photos) {
      const group = byCategory.get(photo.category) ?? [];
      group.push({ id: photo.id, rank: photo.categoryOrder });
      byCategory.set(photo.category, group);
    }

    for (const [category, group] of byCategory) {
      checked.categoryOrderGroups += 1;
      for (const [rank, at] of duplicates(group.map((entry) => entry.rank))) {
        violations.push({
          rule: 'RI-6',
          where: `${FILE.photos} → category ${category}`,
          detail: `categoryOrder ${String(rank)} is used by ${at.map((index) => group[index].id).join(' and ')}`,
          why: 'categoryOrder is the sequence within a filtered gallery. A tie there is the same silent arbitrary sort as a duplicate global order, restricted to one tab.',
        });
      }
    }

    if (checked.categoryOrderGroups === 0) {
      violations.push({
        rule: 'RI-6',
        where: FILE.photos,
        detail: 'zero category groups were iterated',
        why: 'this rule reported no findings because it examined nothing. That is the failure mode eight gates in this phase shipped with, so it is a violation rather than a pass.',
      });
    }
  } else {
    skip('RI-6', ['photos']);
  }

  return { ok: violations.length === 0, violations, checked };
}

/** One human-readable block, in the shape the repository's other gates report in. */
export function formatContentSetReport(report: ContentSetReport): string {
  const lines: string[] = [];
  if (report.ok) {
    lines.push('content set: PASS');
  } else {
    lines.push(`content set: REFUSED — ${report.violations.length} finding(s)`);
    for (const violation of report.violations) {
      lines.push(`  ✖ [${violation.rule}] ${violation.where}: ${violation.detail}`);
      lines.push(`      ${violation.why}`);
    }
  }
  const { checked } = report;
  lines.push(
    `  checked: ${checked.photos} photo(s), ${checked.categories} category record(s), ` +
      `${checked.peekIds} peek id(s), ${checked.peekPositions} peek position(s), ` +
      `${checked.projects} project(s), ${checked.categoryOrderGroups} categoryOrder group(s)`
  );
  lines.push(`  rules run: ${checked.rulesRun.join(', ') || '(none)'}`);
  for (const skipped of checked.rulesSkipped) {
    lines.push(`  rule NOT run: ${skipped.rule} — ${skipped.why}`);
  }
  return lines.join('\n');
}

/** Throwing wrapper, for callers whose correct response to a bad content set is to stop. */
export function assertContentSet(input: ContentSetInput): void {
  const report = validateContentSet(input);
  if (!report.ok) throw new Error(formatContentSetReport(report));
}
