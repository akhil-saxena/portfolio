/**
 * `src/lib/ds-component-count.ts` — the build-time resolver for `{{ds.componentCount}}`.
 *
 * THE FIGURES ARE NEVER LITERALLED HERE. This file re-reads the installed README and
 * re-extracts both numbers with its own regex, then asserts the module agrees. Plan 04-09
 * broke exactly this rule and the standing lesson is: derive record counts, never literal
 * them. A test asserting `componentCount === 81` would go red the day the design system
 * publishes an 82nd component — which is a CORRECT event, and the whole reason this token
 * is resolved rather than typed.
 *
 * The independence is real, not cosmetic: the test's regex is written out separately below
 * rather than imported from the module, so a broken regex in the module cannot make this
 * file agree with it by construction.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearDsCountsCache,
  __dsReadmeText,
  extractDsCounts,
  resolveDsCounts,
  resolveDsTokens,
} from '../../src/lib/ds-component-count.ts';

/**
 * The test's OWN copy of the README location and the regex, reached by a GENUINELY different
 * route than the module's: the module receives the README inlined by Vite's `?raw` at build
 * time, whereas this file reads it off disk with `node:fs` at test time. Two mechanisms, one
 * file — so a defect in either is visible as a disagreement.
 *
 * The anchor is the `tokens.css` subpath because `./package.json` is not in the package's
 * exports map (measured — ERR_PACKAGE_PATH_NOT_EXPORTED). See the module header.
 */
const require = createRequire(import.meta.url);
const README_PATH = path.join(
  path.dirname(path.dirname(require.resolve('@akhil-saxena/design-system/tokens.css'))),
  'README.md'
);
const OWN_PATTERN = /\*\*(\d+) components across (\d+) categories\.\*\*/;

function readmeFigures(): { components: number; categories: number } {
  const text = fs.readFileSync(README_PATH, 'utf8');
  const m = OWN_PATTERN.exec(text);
  if (!m) throw new Error(`the test could not find the count sentence in ${README_PATH}`);
  return { components: Number(m[1]), categories: Number(m[2]) };
}

beforeEach(() => {
  __clearDsCountsCache();
});

describe('resolveDsCounts', () => {
  it("the plan's prescribed mechanism is genuinely unavailable, which is why ?raw is used", () => {
    // Guards the module header's central claim. The day this stops throwing, the simpler
    // `require.resolve(pkg/package.json)` form from 05-UI-SPEC.md 6.7 becomes available
    // again and this test is the thing that will say so.
    expect(() => require.resolve('@akhil-saxena/design-system/package.json')).toThrow(
      /ERR_PACKAGE_PATH_NOT_EXPORTED|not defined by "exports"/
    );
    expect(fs.existsSync(README_PATH)).toBe(true);
  });

  it('the text Vite inlined is byte-identical to the README on disk', () => {
    expect(__dsReadmeText()).toBe(fs.readFileSync(README_PATH, 'utf8'));
  });

  it('imports nothing from node:, so it is safe inside workerd', () => {
    // The prerender runs in workerd (measured: navigator.userAgent = Cloudflare-Workers,
    // import.meta.url undefined, process.cwd() = /bundle, no real filesystem). A node:fs
    // implementation passes this suite and detonates on the first page build; it did.
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ds-component-count.ts'),
      'utf8'
    );
    const imports = [...source.matchAll(/^\s*import\s[^;]*?from\s*'([^']+)'/gm)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.filter((s) => s.startsWith('node:'))).toEqual([]);
  });

  it('returns integers', () => {
    const counts = resolveDsCounts();
    expect(Number.isInteger(counts.componentCount)).toBe(true);
    expect(Number.isInteger(counts.categoryCount)).toBe(true);
    expect(counts.componentCount).toBeGreaterThan(0);
    expect(counts.categoryCount).toBeGreaterThan(0);
  });

  it("returns the README's own two figures, re-extracted independently by this test", () => {
    const expected = readmeFigures();
    expect(resolveDsCounts()).toEqual({
      componentCount: expected.components,
      categoryCount: expected.categories,
    });
  });

  it('reconciles with dist/components/*.js minus the two catalogue exclusions', () => {
    // 83 shipped entry points, 81 catalogued. `Field` and `IconButton` are the design
    // system's own named exclusions (its src/overview-links.test.ts). Both sides are
    // DERIVED: the directory is counted, the exclusions are counted by looking for them.
    const distComponents = path.join(path.dirname(README_PATH), 'dist', 'components');
    const entries = fs.readdirSync(distComponents).filter((f) => f.endsWith('.js'));
    const excluded = ['Field.js', 'IconButton.js'].filter((f) => entries.includes(f));
    expect(excluded).toHaveLength(2);
    expect(entries.length - excluded.length).toBe(resolveDsCounts().componentCount);
  });
});

describe('extractDsCounts refusals', () => {
  it('THROWS on a README body with no match', () => {
    expect(() => extractDsCounts('# Design System\n\nNo counts here at all.\n', 'fake')).toThrow(
      /NO MATCH/
    );
  });

  it('names the source and the regex in the no-match error', () => {
    expect(() => extractDsCounts('nothing', '/some/where/README.md')).toThrow(
      /\/some\/where\/README\.md/
    );
    expect(() => extractDsCounts('nothing', 'fake')).toThrow(/components across/);
  });

  it('THROWS on a second match rather than picking one', () => {
    const body = '**81 components across 10 categories.**\n\n**42 components across 7 categories.**';
    expect(() => extractDsCounts(body, 'fake')).toThrow(/2 MATCHES/);
  });

  it('accepts the real README body it is given', () => {
    const expected = readmeFigures();
    expect(extractDsCounts(fs.readFileSync(README_PATH, 'utf8'), README_PATH)).toEqual({
      componentCount: expected.components,
      categoryCount: expected.categories,
    });
  });

  it('THROWS on an empty README rather than treating it as "no components"', () => {
    expect(() => extractDsCounts('', 'fake')).toThrow(/empty or is not a string/);
    expect(() => extractDsCounts('   \n  ', 'fake')).toThrow(/empty or is not a string/);
  });
});

describe('resolveDsTokens', () => {
  it('substitutes both tokens with the README figures', () => {
    const expected = readmeFigures();
    const out = resolveDsTokens(
      '{{ds.componentCount}}-component library across {{ds.categoryCount}} categories.'
    );
    expect(out).toBe(`${expected.components}-component library across ${expected.categories} categories.`);
  });

  it('leaves a string with no tokens untouched', () => {
    const text = 'A React library with semantic tokens, dark mode, and live Storybook docs.';
    expect(resolveDsTokens(text)).toBe(text);
  });

  it('THROWS on a string still holding an unknown {{token}}', () => {
    expect(() => resolveDsTokens('Improved conversion by {{metric.value}}.')).toThrow(
      /unresolved token/
    );
  });

  it('names the surviving token and the input in the error', () => {
    expect(() => resolveDsTokens('band: {{metric.label}}')).toThrow(/\{\{metric\.label\}\}/);
    expect(() => resolveDsTokens('band: {{metric.label}}')).toThrow(/band: \{\{metric\.label\}\}/);
  });

  it('THROWS even when a known token resolved but an unknown one survived', () => {
    expect(() =>
      resolveDsTokens('{{ds.componentCount}} components, {{metric.value}} conversion')
    ).toThrow(/unresolved token/);
  });
});
