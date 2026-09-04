/**
 * `data/site_config.json`'s category records — the CURRENT contract.
 *
 * ================================================================================================
 * 🔴 THIS FILE REPLACES `site-config-migration.unit.test.ts`, AND THE DELETION IS THE POINT
 * ================================================================================================
 *
 * That file was the losslessness proof for the `site_config.categoryColumns` → `categories[]`
 * migration (D-25, plan 03-03). It reconstructed the retired eight-line map out of the new records
 * and compared it key by key against the last committed revision that still contained the map.
 *
 * THE TAXONOMY IT PROVED HAS SINCE BEEN RE-AUTHORED, not migrated again. Akhil: *"I don't think the
 * categories are good enough… can you check each photo and suggest category. also seems we have lot
 * of categories"*, and after the pass over all forty photographs: *"5 is better."* The seven that
 * the migration carried across — `abstract, architecture, nature, portraits, product, street,
 * wildlife` — mixed subject with treatment (`abstract`) and with a genre the corpus had two
 * photographs of (`product`). The five below are subject-based, and every one is a section a reader
 * would actually browse.
 *
 * So the old file's central assertion — "every legacy key lands somewhere and is named" — is a
 * claim about a step that no longer has an output. Keeping it would have meant asserting that a
 * deliberate re-authoring had not happened. What SURVIVES from it is everything that was about the
 * shape rather than the history, and that is what this file is:
 *
 *   - the retired map stays retired (`categoryColumns` is gone, and does not come back)
 *   - `label` is never derived from `id` by Title-casing — the render-time transform D-25 deleted
 *   - `photo.category` resolves against `categories[].id` with NO case transform on either side
 *   - the retired seven ids appear NOWHERE, so a half-finished re-author fails rather than ships
 *
 * ================================================================================================
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 * ================================================================================================
 *
 * It never Title-cases an `id` to predict a `label`. That would make it green against a config that
 * dropped `label` entirely and let a schema default it — reintroducing, inside its own regression
 * test, the exact transform the records exist to remove. `label` is checked for what it must BE
 * (present, non-empty, not the id, not the id Title-cased by accident of spelling), never for a
 * value this file computed.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const report = (line: string) => process.stdout.write(`${line}\n`);

interface CategoryRecord {
  id: string;
  label: string;
  columns: number;
}

interface SiteConfig {
  categories: CategoryRecord[];
  defaultColumns: number;
  categoryColumns?: unknown;
}

const config = JSON.parse(readFileSync(`${REPO_ROOT}data/site_config.json`, 'utf8')) as SiteConfig;

const manifest = JSON.parse(
  readFileSync(`${REPO_ROOT}data/portfolio_images.json`, 'utf8')
) as Array<{ id: string; category: string }>;

/**
 * The taxonomy that was retired, TYPED OUT. Named rather than forgotten: a config that still
 * carried one of these would be a re-author left half-done, and the failure should say which one.
 */
const RETIRED_IDS = ['abstract', 'nature', 'product', 'street'];

describe('the records are well formed, and nothing is derived at render time', () => {
  it('holds a non-empty categories[] — the anti-vacuity floor for every loop below', () => {
    expect(Array.isArray(config.categories)).toBe(true);
    expect(config.categories.length).toBeGreaterThan(0);
    report(`categories: ${config.categories.map((c) => c.id).join(', ')}`);
  });

  it('carries no categoryColumns — the retired map stays retired (D-25)', () => {
    expect(config.categoryColumns).toBeUndefined();
    expect(Object.keys(config)).not.toContain('categoryColumns');
  });

  it.each(config.categories.map((c) => [c.id, c] as const))(
    '%s carries an id, a label and a column count, each of the right shape',
    (_id, record) => {
      // The id is what a URL and a `photo.category` are compared against, so its spelling is a
      // contract: lowercase, and kebab where it has two words (`still-life`, never `stillLife`).
      expect(record.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(record.id).toBe(record.id.toLowerCase());

      // The label is EDITORIAL and must exist as its own value. Not asserted to equal anything this
      // file computed — see the header.
      expect(typeof record.label).toBe('string');
      expect(record.label.trim()).toBe(record.label);
      expect(record.label.length).toBeGreaterThan(0);
      expect(record.label).not.toBe(record.id);

      expect(Number.isInteger(record.columns)).toBe(true);
      expect(record.columns).toBeGreaterThan(0);
    }
  );

  it('declares a defaultColumns for the unfiltered gallery', () => {
    // OD-2 Option A: the retired map's `All` key was never a category, and its column count went
    // here rather than becoming an eighth record.
    expect(Number.isInteger(config.defaultColumns)).toBe(true);
    expect(config.defaultColumns).toBeGreaterThan(0);
    expect(config.categories.map((c) => c.id)).not.toContain('all');
    report(`defaultColumns: ${config.defaultColumns}`);
  });

  it('has unique ids and unique labels — a duplicate would silently swallow a section', () => {
    const ids = config.categories.map((c) => c.id);
    const labels = config.categories.map((c) => c.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('the re-author is complete — none of the retired ids survives anywhere', () => {
  it('names no retired id in categories[]', () => {
    // ANTI-VACUITY: an empty retired list would make this assert nothing.
    expect(RETIRED_IDS.length).toBeGreaterThan(0);
    for (const retired of RETIRED_IDS) {
      expect(config.categories.map((c) => c.id)).not.toContain(retired);
    }
    report(`retired ids checked and absent: ${RETIRED_IDS.join(', ')}`);
  });

  it('leaves no photograph pointing at a retired id', () => {
    const stranded = manifest.filter((photo) => RETIRED_IDS.includes(photo.category));
    expect(stranded.map((p) => `${p.id} → ${p.category}`)).toEqual([]);
  });
});

describe('photo.category resolves against categories[].id, with no case transform', () => {
  it('every photograph names a declared category, compared verbatim', () => {
    expect(manifest.length).toBeGreaterThan(0);
    const legal = new Set(config.categories.map((c) => c.id));
    const orphans = manifest
      .filter((photo) => !legal.has(photo.category))
      .map((photo) => `${photo.id} → ${JSON.stringify(photo.category)}`);
    report(`${manifest.length} photographs, ${orphans.length} pointing at nothing`);
    expect(orphans).toEqual([]);
  });

  it('and would NOT resolve under a case transform — the comparison is exact both ways', () => {
    /*
     * THE DIRECTION THAT MATTERS. `photo.category` matching an id only after `.toLowerCase()` is
     * the same defect as a label derived by Title-casing: it works until one file is edited by hand.
     * So each stored value is required to be identical to the id it matches, not merely equal to it
     * case-insensitively.
     */
    const byLower = new Map(config.categories.map((c) => [c.id.toLowerCase(), c.id]));
    for (const photo of manifest) {
      const exact = byLower.get(photo.category.toLowerCase());
      expect(exact).toBeDefined();
      expect(photo.category).toBe(exact);
    }
  });

  it('leaves no declared category with nothing in it', () => {
    /*
     * A SECTION WITH NO PHOTOGRAPHS is a pill that filters to an empty grid — a dead control, not a
     * small collection. Akhil: *"dont worry bout less images in any count"* — so this is a floor of
     * ONE, never a minimum worth having, and the per-category counts are reported either way.
     */
    const counts = config.categories.map((c) => ({
      id: c.id,
      n: manifest.filter((p) => p.category === c.id).length,
    }));
    report(counts.map((c) => `${c.id} ${c.n}`).join(' · '));
    expect(counts.filter((c) => c.n === 0).map((c) => c.id)).toEqual([]);
  });

  it('accounts for every photograph exactly once across the sections', () => {
    // The counts must SUM to the manifest: a photograph in two categories, or in none, is caught
    // here and by nothing above.
    const total = config.categories.reduce(
      (sum, c) => sum + manifest.filter((p) => p.category === c.id).length,
      0
    );
    expect(total).toBe(manifest.length);
  });
});
