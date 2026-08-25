#!/usr/bin/env node
/**
 * Migrate `data/site_config.json` from the retired `categoryColumns` Title-cased string map
 * to canonical category records `{ id, label, columns }` (D-25), plus a sibling
 * `defaultColumns` scalar for the unfiltered gallery.
 *
 * WHY THIS EXISTS
 * ---------------
 * `portfolio_images.json` stores `architecture`; the retired map stored `Architecture`. Nothing
 * reconciled the two except a render-time transform — the legacy `PropertiesPanel` Title-cased on
 * the fly with `c.charAt(0).toUpperCase() + c.slice(1)` to fill its `<select>`. Splitting the join
 * key (`id`) from the display string (`label`) into two authored fields deletes that transform
 * rather than fixing it, and a transform that does not exist cannot disagree with the data.
 *
 * `label` is therefore carried VERBATIM from the retired map key. It is deliberately NOT
 * re-derived as `Title(id)`: the point of D-25 is that the label is authored data that can change
 * without the id moving (00-ADMIN-IA §4 — "renaming a label must not touch `id`, otherwise 14
 * photos lose their category"). Re-deriving it here would simply move the transform from the
 * renderer into the migration.
 *
 * OD-2 (resolved by Akhil, 2026-08-25, Option A) — the retired map's eighth key, `"All": 3`, is
 * NOT migrated to a record. It was never a category; it is the column count for the unfiltered
 * gallery, a property of a view. Admitting `{ id: "all" }` would make 03-06's referential-integrity
 * rule — "every `photo.category` exists in `site_config`'s ids", the rule ADR-002 §4 traded
 * `/admin/site` for — accept `photo.category === "all"`, which is the exact orphaning it exists to
 * prevent. The only repair would be a hardcoded `"all"` exclusion inside the check: a second source
 * of truth about what a category is, living inside the check that exists to have exactly one. So
 * the count moves to a sibling scalar `defaultColumns`, and the id set is exactly the seven values
 * a photo may legally hold, with no exclusion list.
 *
 * Idempotent: a second run reports 0 changes and leaves the file byte-identical.
 *
 * Usage: node scripts/migrate-site-config.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = fileURLToPath(new URL('../data/site_config.json', import.meta.url));

/**
 * The one key in the retired map that was never a category. Named as a constant rather than
 * skipped inline so that its disposition is a stated decision and a NINTH unexpected key is an
 * error rather than something silently absorbed by a filter.
 */
const UNFILTERED_KEY = 'All';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const raw = readFileSync(CONFIG_PATH, 'utf8');
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (error) {
  fail(`data/site_config.json is not valid JSON — ${error.message}`);
}

let migrated;

if (parsed && typeof parsed === 'object' && parsed.categoryColumns) {
  const map = parsed.categoryColumns;
  if (typeof map !== 'object' || Array.isArray(map)) {
    fail('categoryColumns is not an object map — the shape changed under this migration');
  }

  const keys = Object.keys(map);
  if (!keys.includes(UNFILTERED_KEY)) {
    fail(
      `the retired map has no "${UNFILTERED_KEY}" key, so there is no unfiltered column count to ` +
        'carry into defaultColumns — the shape changed under this migration'
    );
  }
  for (const [key, value] of Object.entries(map)) {
    if (!Number.isInteger(value) || value < 1) {
      fail(`categoryColumns["${key}"] is ${JSON.stringify(value)}, expected a positive integer`);
    }
  }

  const categories = keys
    .filter((key) => key !== UNFILTERED_KEY)
    .map((key) => ({
      // `id` is the lowercased key — the join key `photo.category` already holds, lowercase on
      // both sides. `label` is the key VERBATIM; see the header note on why it is not re-derived.
      id: key.toLowerCase(),
      label: key,
      columns: map[key],
    }))
    // OD-2b (resolved by Akhil, 2026-08-25): ALPHABETICAL BY `id`. Object key order was incidental
    // and read `All, Abstract, Architecture, Nature, Portraits, Street, Wildlife, Product` —
    // alphabetical except `Product`, which trailed for no recorded reason. Array order is not
    // incidental: it becomes the filter row's order and it is committed. Alphabetical was chosen
    // because it is self-maintaining when a category is added (the rule decides the slot, nobody
    // does) and scannable by name at the size this list will ever be. Do NOT re-sort this thinking
    // the order was accidental — it is a decision.
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ids = categories.map((category) => category.id);
  if (new Set(ids).size !== ids.length) {
    fail(`the retired map produced duplicate ids after lowercasing: ${ids.join(', ')}`);
  }

  migrated = { categories, defaultColumns: map[UNFILTERED_KEY] };
} else if (parsed && Array.isArray(parsed.categories)) {
  // Already migrated. Re-serialise through the same path so a hand-edited ordering or indentation
  // is normalised, and so "no change" is proven byte-for-byte rather than assumed.
  const categories = [...parsed.categories].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  migrated = { categories, defaultColumns: parsed.defaultColumns };
} else {
  fail('data/site_config.json holds neither a categoryColumns map nor a categories array');
}

const output = `${JSON.stringify(migrated, null, 2)}\n`;

if (output === raw) {
  console.log(`OK 0 changes — ${migrated.categories.length} records already canonical`);
  process.exit(0);
}

// `data/` is Biome-excluded (biome.json → "!data"), so this serialisation is the final formatting;
// nothing downstream will reformat it.
writeFileSync(CONFIG_PATH, output);
console.log(
  `OK migrated ${migrated.categories.length} records ` +
    `(${migrated.categories.map((c) => c.id).join(', ')}), defaultColumns=${migrated.defaultColumns}`
);
