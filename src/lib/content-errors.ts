/**
 * The readable half of criterion 2.
 *
 * WHAT THIS FILE IS FOR, STATED AS THE DIFFERENCE IT MAKES
 * -------------------------------------------------------
 * `astro/zod`'s own rendering of a wrong type on a résumé bullet, measured on the resolved
 * zod 4.4.3 in this repository (plan 03-08, experiment 5):
 *
 *     ✖ Invalid input: expected string, received number
 *       → at experience[0].bullets[2]
 *
 * Accurate, and it names neither the FILE the bullet came from nor the COMPANY whose bullet it
 * is. Criterion 2 is *"fails the build with a readable error"*, and the phase prompt is explicit
 * that a stack trace naming a zod path is not the same as telling the author which file and which
 * record. What this module adds is exactly the two things zod cannot know:
 *
 *     ✖ data/resume.json → Brevo (Formerly Sendinblue) [experience[0] of 3] → bullets[2]
 *           Invalid input: expected string, received number
 *           expected string · received 12345
 *
 * The per-issue BODY is zod's own `issue.message`, unedited. That is deliberate: zod formats
 * "expected string, received number" better than a hand-rolled sentence would, and every custom
 * refinement in `src/schemas` already carries a written-out `error` explaining its decision. This
 * module adds framing and nothing else. `z.prettifyError` was measured as an alternative and is
 * NOT used: it renders a whole error at once with its own `→ at path` line, so wrapping it
 * per-issue would print the same path twice — once framed and once not.
 *
 * HOW A RECORD GETS A HUMAN NAME
 * ------------------------------
 * `experience[0]` is a position; `Brevo` is a record. The formatter therefore takes the DATA as
 * well as the error, walks the issue path through it, and every time it passes through an array
 * element that carries an identifying string field it emits a crumb. Nested arrays chain, so a
 * bad badge URL reads
 * `data/projects.json → design-system [projects[0] of 5] → Storybook [badges[1] of 2] → href`
 * rather than `projects[0].badges[1].href`.
 *
 * The array length is printed with the index (`[photos[12] of 39]`) because "record 12" is
 * meaningless without knowing whether there are 13 records or 400, and because a count of zero in
 * that position is the loudest possible signal that a file was emptied rather than edited.
 *
 * THREE THINGS THIS FILE MUST NOT DO
 * ----------------------------------
 * 1. NO NODE-ONLY IMPORT. It is imported by `src/schemas/content-set.ts`, which runs inside
 *    `workerd` during prerender. `test/content/schemas.unit.test.ts` asserts that for every file
 *    in `src/schemas`; this module is on the far side of that import, so the same rule binds it.
 *    It receives already-parsed data and never reads from disk.
 * 2. NO SHAPE OF ITS OWN. It knows the names of identifying FIELDS, not the shape of any record.
 *    `IDENTIFYING_KEYS` is an ordered preference list over strings, not a schema — a rival
 *    `interface Photo` here would be caught by `scripts/assert-single-schema-source.mjs`, and
 *    correctly.
 * 3. NO THROWING ON THE FIRST ISSUE. Zod accumulates; so does this. A validator that reports one
 *    problem per run turns a five-field mistake into five builds.
 */

/**
 * One zod issue, structurally. Declared rather than imported from `astro/zod` so this module has
 * no dependency on the validator that produced the issue: the same formatter frames an issue from
 * a `safeParse` result, from a caught `ZodError`, and from anything else that reports a path and a
 * message. `expected` is present on `invalid_type` issues and absent on custom refinements.
 */
export interface ContentIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
  readonly code?: string;
  readonly expected?: string;
}

/** `where` and `detail`, as `src/schemas/content-set.ts` reports every other finding. */
export interface IssueDescription {
  /** `data/resume.json → Brevo … [experience[0] of 3] → bullets[2]` */
  where: string;
  /** zod's own message, plus the expectation and the received value when they add anything. */
  detail: string;
}

/**
 * The field that ADDRESSES a record — what you grep the file for, and what another file references
 * it by (`home_config.peekIds`, a case-study route slug). Always shown first when present.
 */
const ADDRESSING_KEYS = ['id'] as const;

/**
 * The field that NAMES a record for a human — what the author recognises it as.
 *
 * Both lists are needed and neither is sufficient, which was found by planting a defect rather
 * than by reasoning. `data/resume.json`'s first experience entry has `id: "brevo"` and
 * `company: "Brevo (Formerly Sendinblue)"`. With `id` alone the message said `brevo`, which is
 * correct and is not what the author calls the record; with the display field alone a photograph
 * would be reported as "Hills and Greens" when `peekIds` and every URL address it as
 * `nature-hillsandgreens`. So both are printed when both exist and differ.
 *
 * Order matters within this list, and the order below was corrected by planting a defect too:
 * `category` started above `title` and a photograph came out as
 * `nature-hillsandgreens — nature`, which repeats a facet instead of naming the picture. `category`
 * is now LAST, where it serves only the one record that has nothing better — a skill group, whose
 * `category` genuinely is its name ("Frontend"). Otherwise: `company` for experience, `school` for
 * education, `title` for a photograph or a project, `label` for a badge or a social link, `text`
 * for a CTA.
 */
const DISPLAY_KEYS = ['company', 'school', 'title', 'label', 'text', 'name', 'category'] as const;

/** A display name longer than this is a sentence, not a name, and is cut. */
const MAX_LABEL_CHARS = 60;

/**
 * How much of a received value is printed.
 *
 * `urls.thumb` is a base64 LQIP several kilobytes long. Printed in full it buries the one line of
 * the message that says what is wrong with it, so the value is cut and the cut is announced —
 * silently truncating would make a long value indistinguishable from a short one.
 */
const MAX_VALUE_CHARS = 120;

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Render an issue path as something a reader can find in the file: `urls.large`, `bullets[2]`. */
export function renderPath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
}

/** A received value, JSON-rendered and cut to something that fits beside its own message. */
export function showValue(value: unknown): string {
  let rendered: string;
  try {
    rendered = JSON.stringify(value) ?? String(value);
  } catch {
    rendered = String(value);
  }
  if (rendered.length <= MAX_VALUE_CHARS) return rendered;
  const dropped = rendered.length - MAX_VALUE_CHARS;
  return `${rendered.slice(0, MAX_VALUE_CHARS)}… (+${dropped} more character${dropped === 1 ? '' : 's'})`;
}

/**
 * The human name of a record, or `null` when it has none.
 *
 * `null` rather than a fallback string, so a caller can tell "this array element is a bullet, not
 * a record" apart from "this record is unnamed". The framing below relies on that distinction:
 * `bullets[2]` stays part of the FIELD path instead of becoming a crumb of its own.
 */
export function humanLabel(value: unknown): string | null {
  if (!isRecordLike(value)) return null;

  const pick = (keys: readonly string[]): string | null => {
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (trimmed.length === 0) continue;
      return trimmed.length > MAX_LABEL_CHARS ? `${trimmed.slice(0, MAX_LABEL_CHARS)}…` : trimmed;
    }
    return null;
  };

  const address = pick(ADDRESSING_KEYS);
  const display = pick(DISPLAY_KEYS);
  if (address === null) return display;
  if (display === null || display === address) return address;
  return `${address} — ${display}`;
}

/** Read the value an issue path points at. `undefined` when the path does not resolve. */
export function valueAtPath(data: unknown, path: readonly PropertyKey[]): unknown {
  let current: unknown = data;
  for (const segment of path) {
    if (Array.isArray(current) && typeof segment === 'number') {
      current = current[segment];
      continue;
    }
    if (isRecordLike(current)) {
      current = current[String(segment)];
      continue;
    }
    return undefined;
  }
  return current;
}

/** The named records an issue path passes through, and the field path below the last of them. */
export interface IssueFraming {
  /** `nature-hillsandgreens [photos[12] of 39]`, outermost first. Empty when none is named. */
  records: string[];
  /** What is left of the path below the innermost named record. May be empty. */
  field: string;
}

export function frameIssuePath(
  rootName: string,
  data: unknown,
  path: readonly PropertyKey[]
): IssueFraming {
  const records: string[] = [];
  let current: unknown = data;
  let fieldFrom = 0;

  for (let index = 0; index < path.length; index++) {
    const segment = path[index];
    const parent = current;
    current = valueAtPath(parent, [segment]);

    // Only an ARRAY ELEMENT can be a record, and only a NAMED one becomes a crumb. Everything
    // else — an object property, an unnamed element such as a bullet string — stays in the field
    // path, which is where a reader expects to find it.
    if (typeof segment !== 'number' || !Array.isArray(parent)) continue;
    const label = humanLabel(current);
    if (label === null) continue;

    const container = renderPath(path.slice(0, index)) || rootName;
    records.push(`${label} [${container}[${segment}] of ${parent.length}]`);
    fieldFrom = index + 1;
  }

  return { records, field: renderPath(path.slice(fieldFrom)) };
}

/**
 * `file → record → field`, the one line the whole module exists to produce.
 *
 * `rootName` names the top-level array of a file that IS an array (`photos`, `projects`), because
 * the issue path for `photos[12].order` starts at the index and so carries no name for what it is
 * indexing into. For the three object files it is never reached.
 */
export function describeIssueLocation(
  file: string,
  rootName: string,
  data: unknown,
  path: readonly PropertyKey[]
): string {
  const { records, field } = frameIssuePath(rootName, data, path);
  const parts = [file, ...records];
  if (field.length > 0) parts.push(field);
  return parts.join(' → ');
}

/** `where` and `detail` for one issue, for a caller that reports findings in that shape. */
export function describeIssue(
  file: string,
  rootName: string,
  data: unknown,
  issue: ContentIssue
): IssueDescription {
  const notes: string[] = [issue.message];
  if (typeof issue.expected === 'string' && issue.expected.length > 0) {
    notes.push(`expected ${issue.expected}`);
  }
  const received = valueAtPath(data, issue.path);
  if (received !== undefined) notes.push(`received ${showValue(received)}`);

  return {
    where: describeIssueLocation(file, rootName, data, issue.path),
    detail: notes.join(' · '),
  };
}

/** One issue as an indented block: the location, then the message, then what was expected. */
export function formatIssue(
  file: string,
  rootName: string,
  data: unknown,
  issue: ContentIssue
): string {
  const { where, detail } = describeIssue(file, rootName, data, issue);
  const [message, ...rest] = detail.split(' · ');
  const lines = [`  ✖ ${where}`, `        ${message}`];
  if (rest.length > 0) lines.push(`        ${rest.join(' · ')}`);
  return lines.join('\n');
}

/**
 * Pull the issue list out of whatever a validator threw or returned.
 *
 * Structural rather than `instanceof ZodError`, for the reason the interface above is structural:
 * a `ZodError` crossing a Vite module boundary is not always the same class object, and an
 * `instanceof` that quietly fails would degrade this formatter to `String(error)` — which is the
 * unreadable output the module exists to replace.
 */
export function issuesOf(error: unknown): ContentIssue[] {
  const candidate = (error as { issues?: unknown } | null | undefined)?.issues;
  if (!Array.isArray(candidate)) {
    return [{ path: [], message: String(error) }];
  }
  return candidate as ContentIssue[];
}

/**
 * A whole schema failure for one file, as a block ending in a count.
 *
 * The count is there so a reader can tell a truncated report from a complete one, and so that
 * "0 problems" — which this function is never called with — could never be mistaken for a pass.
 */
export function formatSchemaFailure(
  file: string,
  rootName: string,
  data: unknown,
  error: unknown
): string {
  const issues = issuesOf(error);
  const lines = [
    `${file} does not match its schema in src/schemas — ${issues.length} problem${
      issues.length === 1 ? '' : 's'
    }:`,
  ];
  for (const issue of issues) lines.push(formatIssue(file, rootName, data, issue));
  return lines.join('\n');
}
