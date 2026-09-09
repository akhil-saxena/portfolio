#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = fileURLToPath(new URL('../data/site_config.json', import.meta.url));

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
      id: key.toLowerCase(),
      label: key,
      columns: map[key],
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ids = categories.map((category) => category.id);
  if (new Set(ids).size !== ids.length) {
    fail(`the retired map produced duplicate ids after lowercasing: ${ids.join(', ')}`);
  }

  migrated = { categories, defaultColumns: map[UNFILTERED_KEY] };
} else if (parsed && Array.isArray(parsed.categories)) {
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

writeFileSync(CONFIG_PATH, output);
console.log(
  `OK migrated ${migrated.categories.length} records ` +
    `(${migrated.categories.map((c) => c.id).join(', ')}), defaultColumns=${migrated.defaultColumns}`
);
