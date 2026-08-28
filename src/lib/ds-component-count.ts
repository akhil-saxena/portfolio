/**
 * Build-time resolution of `{{ds.componentCount}}` and `{{ds.categoryCount}}` from the
 * INSTALLED design system's own README.
 *
 * `data/projects.json` stores the design-system card copy as
 *   "{{ds.componentCount}}-component React library with semantic tokens, dark mode, and live
 *    Storybook docs."
 * and `ProjectSchema` REFUSES any description carrying a literal component figure
 * (`/\b\d+[- ]component/i`), because the number went stale three times in nine days and was
 * hand-repaired once. The schema bans the FIGURE, not the TOKEN — so `{{ds.componentCount}}`
 * passes the schema, and the only thing standing between it and the page a hiring manager
 * reads first is this module throwing.
 *
 * So: every failure here is FATAL. There is no fallback value, no "0", no empty string, and
 * no leaving the token in place. A missing count must fail the build.
 *
 * ---------------------------------------------------------------------------------------
 * WHY THE README AND NOT A DIRECTORY COUNT
 *
 * `node_modules/@akhil-saxena/design-system/dist/components/*.js` is **83**. The README says
 * **81**. Both are correct: the design system's own `src/overview-links.test.ts` names two
 * deliberate exclusions from the catalogue — `Field` (not a rendered component) and
 * `IconButton` (catalogued under `Button`) — and asserts that the README, the shipped
 * catalogue and the `src/` listing all agree. 83 − 2 = 81, and the two figures reconcile
 * exactly.
 *
 * Counting `dist/components/*.js` here would ship 83 AND encode that exclusion list in the
 * consumer, where nobody would ever revisit it. The README is the design system's own
 * published answer to "how many components are there", asserted by its own CI against the
 * same regex used below. Read the answer; do not recompute it.
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS IS A `?raw` IMPORT AND NOT `fs.readFileSync`, AND WHY THE PATH IS RELATIVE
 *
 * MEASURED 2026-08-28, plan 05-01, and this corrects BOTH `05-UI-SPEC.md` §6.7 and plan
 * 05-01's own task 2, which prescribe:
 *
 *     readFileSync(require.resolve('@akhil-saxena/design-system/package.json')
 *                    .replace(/package\.json$/, 'README.md'), 'utf8')
 *
 * That cannot work here, for two independent reasons, and it fails in a way a unit test
 * cannot see.
 *
 *   1. `./package.json` IS NOT IN THE PACKAGE'S `exports` MAP. The map is closed — `.`,
 *      `./hooks`, `./icons`, `./components/*` and the stylesheet subpaths, and nothing
 *      else — so Node refuses the subpath outright:
 *          ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './package.json' is not defined
 *          by "exports" in .../@akhil-saxena/design-system/package.json
 *      `./README.md` is refused the same way, by Node AND by Vite (measured: a
 *      `@akhil-saxena/design-system/README.md?raw` specifier fails the build in
 *      `rolldown:vite-resolve`).
 *
 *   2. THE PRERENDER DOES NOT RUN IN NODE. It runs inside **workerd**. Measured with a
 *      throwaway probe page built through `npm run build` — see
 *      `05-01-SUMMARY.md` §"The prerender runtime":
 *          navigator.userAgent          = Cloudflare-Workers
 *          import.meta.url              = undefined
 *          process.cwd()                = /bundle        (a virtual root, not the repo)
 *          fs.existsSync(<repo>/package.json) = false
 *          createRequire(...).resolve   = not a function
 *      So there is no `node_modules` to read, no real filesystem, and no usable module
 *      resolver at the moment the page is rendered. `createRequire(import.meta.url)` throws
 *      `TypeError: The argument 'path' ... Received 'undefined'` before it resolves anything.
 *
 * THIS IS THE TRAP THIS PLAN EXISTS TO AVOID: a `node:fs` implementation passes the vitest
 * unit suite green (vitest runs in Node) and detonates on the first real page build. It did,
 * here, and only a build-time probe caught it.
 *
 * `?raw` is the mechanism that survives both facts. Vite inlines the file's CONTENTS into
 * the bundle at build time, in Node, where the filesystem exists; the regex then runs inside
 * workerd against a plain string constant. No filesystem, no resolver, no `node:` import
 * anywhere in this module — which is also why it is safe to import from any route.
 *
 * The specifier is RELATIVE (`../../node_modules/...`) because the package's own exports map
 * blocks the bare form, per (1). That hardcodes a flat `node_modules` layout, and that is an
 * accepted, LOUD limitation: under a hoisted or pnpm-style layout the path does not exist and
 * the BUILD FAILS at resolve time. It cannot silently resolve to the wrong file or to a stale
 * copy. Vite re-reads the file on every build, so the figure cannot go stale against the
 * installed package the way a generated or committed constant could.
 */

/** The package whose README is the single source of truth for both figures. */
export const DS_PACKAGE_NAME = '@akhil-saxena/design-system';

/**
 * The README, inlined at build time. See the header for why this is a relative path and not
 * `@akhil-saxena/design-system/README.md?raw` — the bare form is refused by the package's
 * exports map, in Node and in Vite alike.
 */
import DS_README from '../../node_modules/@akhil-saxena/design-system/README.md?raw';

/** Where the figures came from, for error messages. There is no runtime path to name. */
const DS_README_SOURCE = `${DS_PACKAGE_NAME}/README.md (inlined at build time by Vite ?raw)`;

/**
 * The same regex the design system's own CI asserts its README against. Global, because
 * this module refuses a SECOND match as loudly as it refuses none — two different figures
 * in one README means the README is mid-edit and neither can be trusted.
 */
export const DS_COUNT_PATTERN = /\*\*(\d+) components across (\d+) categories\.\*\*/g;

/** The tokens this module knows how to resolve. */
export const DS_TOKENS = ['{{ds.componentCount}}', '{{ds.categoryCount}}'] as const;

/** Any `{{…}}` token at all — used to refuse a string that still carries an unresolved one. */
const ANY_TOKEN_PATTERN = /\{\{\s*[^{}]*\}\}/g;

export interface DsCounts {
  componentCount: number;
  categoryCount: number;
}

/**
 * The pure half: extract both figures from README text. Separated from the inlined constant
 * so the unit test can feed it a README body with no match, two matches, or a non-integer
 * capture, without having to write files into `node_modules`.
 *
 * @param readmeText the full README contents
 * @param sourceLabel what to name in the error
 */
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
