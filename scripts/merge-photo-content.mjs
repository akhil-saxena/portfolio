#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const MANIFEST = join(REPO_ROOT, 'data', 'portfolio_images.json');
const BRIEF = join(REPO_ROOT, '.planning', 'phases', '00-design-ideation', '00-PHOTO-CONTENT.md');

const ALT_MARKER = '[AKHIL-ALT]';
const OPT_MARKER = '[AKHIL-OPT]';

const COLUMNS = ['id', 'title', 'category', 'date', 'alt', 'place', 'description', 'tags'];

const failures = [];
const fail = (msg) => failures.push(msg);

const read = (path, label) => {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error(
      `FAIL: ${label} is unreadable — ${relative(process.cwd(), path)}\n  ${err.message}`
    );
    process.exit(1);
  }
};

const briefText = read(BRIEF, 'the photo content brief');
let manifest;
try {
  manifest = JSON.parse(read(MANIFEST, 'the manifest'));
} catch (err) {
  console.error(`FAIL: the manifest is not valid JSON — ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error('FAIL: the manifest is not a non-empty array. Nothing to merge into.');
  process.exit(1);
}

const rows = [];
const malformed = [];
briefText.split('\n').forEach((line, i) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|') || trimmed.length < 2) return;
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
  if (cells.length === COLUMNS.length && cells.every((c, n) => c === COLUMNS[n])) return;
  if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return;
  if (cells.length !== COLUMNS.length) {
    malformed.push(
      `  line ${i + 1}: ${cells.length} cells, expected ${COLUMNS.length} — ${trimmed.slice(0, 80)}`
    );
    return;
  }
  const row = Object.fromEntries(COLUMNS.map((name, n) => [name, cells[n]]));
  row.id = row.id.replace(/^`(.*)`$/, '$1');
  row.line = i + 1;
  rows.push(row);
});

if (malformed.length > 0) {
  fail(
    `malformed table row(s) — a cell count other than ${COLUMNS.length} means a literal pipe reached a cell:\n${malformed.join('\n')}`
  );
}

if (rows.length === 0) {
  console.error(
    `FAIL: no table rows parsed out of ${relative(process.cwd(), BRIEF)}. The merge has nothing to read; refusing to rewrite the manifest.`
  );
  process.exit(1);
}

const rowById = new Map();
for (const row of rows) {
  if (rowById.has(row.id)) {
    fail(`duplicate row for id "${row.id}" (lines ${rowById.get(row.id).line} and ${row.line})`);
    continue;
  }
  rowById.set(row.id, row);
}

if (rows.length !== manifest.length) {
  fail(`the brief has ${rows.length} rows against a manifest of ${manifest.length} records`);
}

for (const photo of manifest) {
  if (!rowById.has(photo.id)) fail(`manifest id "${photo.id}" has no row in the brief`);
}
const manifestIds = new Set(manifest.map((p) => p.id));
for (const row of rows) {
  if (!manifestIds.has(row.id))
    fail(`brief row "${row.id}" (line ${row.line}) has no manifest record`);
}

for (const photo of manifest) {
  const row = rowById.get(photo.id);
  if (!row) continue; // already named above
  if (row.alt === ALT_MARKER || row.alt === OPT_MARKER) {
    fail(
      `"${photo.id}" still carries the pending marker ${row.alt} in its required alt cell (line ${row.line}). A marker is not an alt value; refusing to write it.`
    );
  } else if (row.alt === '') {
    fail(`"${photo.id}" has an EMPTY alt cell (line ${row.line}) — neither filled nor tracked.`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL: refusing to merge. ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const ordersSeen = new Map();
for (const photo of manifest) {
  if (!Number.isInteger(photo.order)) {
    fail(
      `"${photo.id}" has no integer global \`order\` (${JSON.stringify(photo.order)}), so no per-category rank can be derived from it`
    );
    continue;
  }
  if (typeof photo.category !== 'string' || photo.category.trim() === '') {
    fail(`"${photo.id}" has no category, so there is no group to rank it within`);
    continue;
  }
  if (ordersSeen.has(photo.order)) {
    fail(
      `global \`order\` ${photo.order} is used by both "${ordersSeen.get(photo.order)}" and "${photo.id}" — the rank derivation would depend on array position, which nobody reviewed. Refusing to break the tie.`
    );
    continue;
  }
  ordersSeen.set(photo.order, photo.id);
}

if (failures.length > 0) {
  console.error(`FAIL: refusing to merge. ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const categoryRank = new Map();
const byCategory = new Map();
for (const photo of manifest) {
  if (!byCategory.has(photo.category)) byCategory.set(photo.category, []);
  byCategory.get(photo.category).push(photo);
}
for (const group of byCategory.values()) {
  const ranked = [...group].sort((a, b) => a.order - b.order);
  ranked.forEach((photo, i) => {
    categoryRank.set(photo.id, i + 1);
  });
}

const isAbsent = (cell) => cell === '' || cell === OPT_MARKER || cell === ALT_MARKER;

const changes = [];

const merged = manifest.map((photo) => {
  const row = rowById.get(photo.id);
  const next = {};
  for (const [key, value] of Object.entries(photo)) {
    if (key === 'alt' || key === 'place' || key === 'categoryOrder') continue;
    next[key] = value;
    if (key === 'title') {
      next.alt = row.alt;
      if (!isAbsent(row.place)) next.place = row.place;
    }
    if (key === 'order') next.categoryOrder = categoryRank.get(photo.id);
  }
  if (!('alt' in next)) {
    fail(`"${photo.id}" has no "title" key, so there is no anchor to insert alt after`);
  }
  if (!('categoryOrder' in next)) {
    fail(`"${photo.id}" has no "order" key, so there is no anchor to insert categoryOrder after`);
  }
  if (photo.alt !== next.alt)
    changes.push(`${photo.id}: alt ${photo.alt === undefined ? 'added' : 'changed'}`);
  const hadPlace = 'place' in photo;
  const hasPlace = 'place' in next;
  if (hadPlace !== hasPlace) changes.push(`${photo.id}: place ${hasPlace ? 'added' : 'removed'}`);
  else if (hasPlace && photo.place !== next.place) changes.push(`${photo.id}: place changed`);
  if (photo.categoryOrder !== next.categoryOrder)
    changes.push(
      `${photo.id}: categoryOrder ${photo.categoryOrder === undefined ? 'added' : 'changed'} (${photo.category} ${next.categoryOrder}, global ${photo.order})`
    );
  return next;
});

if (failures.length > 0) {
  console.error(`FAIL: refusing to merge. ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const serialised = `${JSON.stringify(merged, null, 2)}\n`;
const before = readFileSync(MANIFEST, 'utf8');
if (serialised !== before) writeFileSync(MANIFEST, serialised);

const withAlt = merged.filter((p) => typeof p.alt === 'string' && p.alt.trim() !== '').length;
const withPlace = merged.filter((p) => 'place' in p).length;

console.log(`Read ${rows.length} rows from ${relative(process.cwd(), BRIEF)}`);
console.log(
  `Merged into ${merged.length} manifest records: ${withAlt} alt, ${withPlace} place, ${merged.length - withPlace} with no place key at all`
);
console.log(
  changes.length === 0
    ? 'No changes — the manifest already matches the brief.'
    : `${changes.length} change(s):`
);
for (const c of changes) console.log(`  ${c}`);
