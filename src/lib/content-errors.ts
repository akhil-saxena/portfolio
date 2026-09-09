export interface ContentIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
  readonly code?: string;
  readonly expected?: string;
}

export interface IssueDescription {
  where: string;
  detail: string;
}

const ADDRESSING_KEYS = ['id'] as const;

const DISPLAY_KEYS = ['company', 'school', 'title', 'label', 'text', 'name', 'category'] as const;

const MAX_LABEL_CHARS = 60;

const MAX_VALUE_CHARS = 120;

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function renderPath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('')
    .replace(/^\./, '');
}

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

export interface IssueFraming {
  records: string[];
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

    if (typeof segment !== 'number' || !Array.isArray(parent)) continue;
    const label = humanLabel(current);
    if (label === null) continue;

    const container = renderPath(path.slice(0, index)) || rootName;
    records.push(`${label} [${container}[${segment}] of ${parent.length}]`);
    fieldFrom = index + 1;
  }

  return { records, field: renderPath(path.slice(fieldFrom)) };
}

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

export function issuesOf(error: unknown): ContentIssue[] {
  const candidate = (error as { issues?: unknown } | null | undefined)?.issues;
  if (!Array.isArray(candidate)) {
    return [{ path: [], message: String(error) }];
  }
  return candidate as ContentIssue[];
}

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
