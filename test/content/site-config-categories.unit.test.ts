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
      expect(record.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(record.id).toBe(record.id.toLowerCase());

      expect(typeof record.label).toBe('string');
      expect(record.label.trim()).toBe(record.label);
      expect(record.label.length).toBeGreaterThan(0);
      expect(record.label).not.toBe(record.id);

      expect(Number.isInteger(record.columns)).toBe(true);
      expect(record.columns).toBeGreaterThan(0);
    }
  );

  it('declares a defaultColumns for the unfiltered gallery', () => {
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
    const byLower = new Map(config.categories.map((c) => [c.id.toLowerCase(), c.id]));
    for (const photo of manifest) {
      const exact = byLower.get(photo.category.toLowerCase());
      expect(exact).toBeDefined();
      expect(photo.category).toBe(exact);
    }
  });

  it('leaves no declared category with nothing in it', () => {
    const counts = config.categories.map((c) => ({
      id: c.id,
      n: manifest.filter((p) => p.category === c.id).length,
    }));
    report(counts.map((c) => `${c.id} ${c.n}`).join(' · '));
    expect(counts.filter((c) => c.n === 0).map((c) => c.id)).toEqual([]);
  });

  it('accounts for every photograph exactly once across the sections', () => {
    const total = config.categories.reduce(
      (sum, c) => sum + manifest.filter((p) => p.category === c.id).length,
      0
    );
    expect(total).toBe(manifest.length);
  });
});
