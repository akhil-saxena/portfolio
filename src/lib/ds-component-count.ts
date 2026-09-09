export const DS_PACKAGE_NAME = '@akhil-saxena/design-system';

import DS_README from '../../node_modules/@akhil-saxena/design-system/README.md?raw';

const DS_README_SOURCE = `${DS_PACKAGE_NAME}/README.md (inlined at build time by Vite ?raw)`;

export const DS_COUNT_PATTERN = /\*\*(\d+) components across (\d+) categories\.\*\*/g;

export const DS_TOKENS = ['{{ds.componentCount}}', '{{ds.categoryCount}}'] as const;

const ANY_TOKEN_PATTERN = /\{\{\s*[^{}]*\}\}/g;

export interface DsCounts {
  componentCount: number;
  categoryCount: number;
}

export function extractDsCounts(readmeText: string, sourceLabel: string): DsCounts {
  if (typeof readmeText !== 'string' || readmeText.trim().length === 0) {
    throw new Error(
      `ds-component-count: ${sourceLabel} is empty or is not a string. The README did not ` +
        `reach this module, so there is nothing to extract and nothing to render.`
    );
  }

  DS_COUNT_PATTERN.lastIndex = 0;
  const matches = [...readmeText.matchAll(DS_COUNT_PATTERN)];

  if (matches.length === 0) {
    throw new Error(
      `ds-component-count: NO MATCH for ${DS_COUNT_PATTERN.source} in ${sourceLabel}.\n` +
        `  The design system's README no longer carries the literal ` +
        `"**<n> components across <m> categories.**".\n` +
        `  This is fatal on purpose: data/projects.json stores {{ds.componentCount}}, and ` +
        `rendering that token literally on a public page is the exact failure deriving the ` +
        `number exists to prevent. Fix the upstream README or this regex — do not hardcode a ` +
        `figure here.`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `ds-component-count: ${matches.length} MATCHES for ${DS_COUNT_PATTERN.source} in ` +
        `${sourceLabel}, and they must be unambiguous.\n` +
        `  Found: ${matches.map((m) => `"${m[0]}"`).join(', ')}\n` +
        `  Two answers to "how many components are there" means the README is mid-edit; ` +
        `picking the first would be picking one at random.`
    );
  }

  const [, rawComponents, rawCategories] = matches[0];
  const componentCount = Number(rawComponents);
  const categoryCount = Number(rawCategories);

  for (const [label, raw, value] of [
    ['componentCount', rawComponents, componentCount],
    ['categoryCount', rawCategories, categoryCount],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(
        `ds-component-count: ${label} captured "${raw}" from ${sourceLabel}, which is not a ` +
          `positive integer. Refusing to render it.`
      );
    }
  }

  return { componentCount, categoryCount };
}

let cached: DsCounts | undefined;

/**
 * Both figures, from the installed package's README.
 *
 * Throws — never returns a placeholder — on an empty README, no regex match, more than one
 * match, or a non-integer capture. A missing package is caught earlier still: the `?raw`
 * import above fails the build at resolve time.
 */
export function resolveDsCounts(): DsCounts {
  if (!cached) cached = extractDsCounts(DS_README, DS_README_SOURCE);
  return cached;
}

/** Test seam. Not for production use; the memo is correct for a build. */
export function __clearDsCountsCache(): void {
  cached = undefined;
}

/** The inlined README text, exposed so a test can assert what the module actually read. */
export function __dsReadmeText(): string {
  return DS_README;
}

/**
 * Replace `{{ds.componentCount}}` / `{{ds.categoryCount}}` in `text`, then REFUSE any
 * `{{…}}` token that survives.
 *
 * The refusal is the point, and it is wider than this module's own two tokens on purpose.
 * `05-UI-SPEC.md` §14.5 OQ-1b establishes the same mechanism for the three employment
 * metrics (`{{metric.value}}` / `{{metric.label}}`): a placeholder must FAIL THE BUILD, not
 * sit quietly, because Phase 4 measured that `alt: "TODO"` passed all four content rules.
 * The employment band is the first thing a hiring manager reads on Work.
 *
 * CONSEQUENCE FOR LATER PLANS, stated here so it is not discovered at 2am: this function
 * throws on `{{metric.value}}`. It is the LAST pass over a string, not the first. A plan
 * that resolves metric tokens must do so BEFORE calling this, or extend `DS_TOKENS`.
 */
export function resolveDsTokens(text: string): string {
  const counts = resolveDsCounts();

  const replaced = text
    .replaceAll('{{ds.componentCount}}', String(counts.componentCount))
    .replaceAll('{{ds.categoryCount}}', String(counts.categoryCount));

  ANY_TOKEN_PATTERN.lastIndex = 0;
  const survivors = [...replaced.matchAll(ANY_TOKEN_PATTERN)].map((m) => m[0]);

  if (survivors.length > 0) {
    const unique = [...new Set(survivors)];
    throw new Error(
      `ds-component-count: ${unique.length} unresolved token(s) survived resolveDsTokens: ` +
        `${unique.join(', ')}\n` +
        `  input: ${JSON.stringify(text)}\n` +
        `  This function resolves only ${DS_TOKENS.join(' and ')}. An unresolved {{…}} token ` +
        `must never reach a rendered public route — see 05-UI-SPEC.md §14.5 OQ-1b. Resolve it ` +
        `upstream of this call, or add it to DS_TOKENS here.`
    );
  }

  return replaced;
}
