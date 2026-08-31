#!/usr/bin/env node
/**
 * merge-photo-content.mjs — the one-way merge of reviewed photo content out of
 * `.planning/phases/00-design-ideation/00-PHOTO-CONTENT.md` and into
 * `data/portfolio_images.json`.
 *
 * WHY THIS IS A SCRIPT AND NOT A HAND EDIT
 * ----------------------------------------
 * The 39 `alt` strings were written by looking at every photograph and reviewed with Akhil on
 * 2026-08-23. The public gallery ships ZERO framework JS, so `alt` is delivered on the `<img>`
 * element and is the entire non-visual experience of 39 images — not a fallback, the whole
 * channel. A value that was retyped, re-wrapped, curly-quote-normalised or "improved" in transit
 * is no longer the value that was reviewed, and nothing downstream can tell. So the strings are
 * copied by machine, byte for byte, and `test/content/photo-enrichment.unit.test.ts` re-parses
 * the brief with an INDEPENDENT parser and asserts byte-identity against what landed.
 *
 * DIRECTION: strictly one-way. This script reads the brief and never writes it. The brief keeps
 * passing its own gate (`.planning/phases/00-design-ideation/scripts/check-photo-content.mjs`)
 * after every run, and that is asserted rather than assumed.
 *
 * THE ROW SET COMES FROM THE MANIFEST, NEVER FROM THE TABLE
 * ---------------------------------------------------------
 * Exactly as `check-photo-content.mjs` does, and for the reason its header gives: "publishing it
 * adds a manifest record, and the next run names it." A merge driven by the table's own row list
 * cannot notice a photograph the table forgot — it would simply merge 38 rows and report success.
 * Here the manifest is the authority for WHICH photos must be covered, and the brief is the
 * authority for WHAT each one says. Both directions of the bijection are checked and both name
 * the offending id.
 *
 * MARKERS MEAN ABSENT, AND ABSENT MEANS THE KEY DOES NOT EXIST
 * ------------------------------------------------------------
 * `[AKHIL-ALT]` and `[AKHIL-OPT]` are pending-value markers. A record whose `alt` is the literal
 * marker is WORSE than one with no alt: it passes any "present and non-empty" check while
 * carrying nothing a listener can use. So a marker in the required `alt` column is a refusal, and
 * a marker in an optional column produces NO KEY AT ALL — not `""`, not `null`. The brief's rule
 * is that an empty `place` or `description` "renders nothing at all — no em dash, no gap", and
 * the cheapest way to make that true everywhere is for the key to be missing, so that every
 * consumer's `'place' in photo` and `photo.place ?? …` agree without a special case.
 *
 * REFUSES RATHER THAN GUESSES. Every problem below is accumulated so one run names them all:
 *   - no table rows parsed at all (the vacuous run: a parser that matched nothing would
 *     otherwise "merge" zero records and exit 0);
 *   - a pipe-delimited line inside the tables whose cell count is not 8 (an `alt` string that
 *     acquired a literal pipe would otherwise vanish from the row set silently);
 *   - the parsed row count differing from the manifest record count;
 *   - a manifest id with no row, or a row id with no manifest record;
 *   - a required `alt` cell holding the pending marker, or empty.
 *
 * NO NORMALISATION. Cells are trimmed of the markdown table's own padding and nothing else. En
 * dashes, em dashes, curly apostrophes, double spaces and comma-heavy sentences pass through
 * unchanged. The table is parsed by splitting each row on `|` — never CSV-parsed, and never
 * regexed across the whole file, because commas and parentheses inside real prose break both.
 *
 * Run:  node scripts/merge-photo-content.mjs
 * Deps: none beyond node:fs and node:path. No install, no config, no network.
 * Exit: 0 having written (or left alone) the manifest, or 1 with one named failure per line.
 *       Idempotent — a second run reports 0 changed records and leaves the file byte-identical.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const MANIFEST = join(REPO_ROOT, 'data', 'portfolio_images.json');
const BRIEF = join(REPO_ROOT, '.planning', 'phases', '00-design-ideation', '00-PHOTO-CONTENT.md');

/** The pending-value markers. Distinct from the copy drafts' marker on purpose — see the brief. */
const ALT_MARKER = '[AKHIL-ALT]';
const OPT_MARKER = '[AKHIL-OPT]';

/** The brief's table header, in order. The parser asserts this many cells on every row. */
const COLUMNS = ['id', 'title', 'category', 'date', 'alt', 'place', 'description', 'tags'];

const failures = [];
const fail = (msg) => failures.push(msg);

// --- Load both files. Neither is optional; an unreadable one is a refusal, not a skip. ---

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

// --- Parse the brief's seven tables. Row-level split on `|`, then trim. Nothing else. ---

/**
 * A markdown table row is a trimmed line that both starts and ends with `|`. Splitting the
 * interior on `|` yields exactly one cell per column — 8 — for a well-formed row. Anything else
 * is recorded and refused rather than skipped: silently dropping a malformed row is how a
 * pipe-bearing alt string would disappear from the merge without anyone noticing.
 */
const rows = [];
const malformed = [];
briefText.split('\n').forEach((line, i) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|') || trimmed.length < 2) return;
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
  // The header row and the `|---|---|` separator beneath it are structure, not data.
  if (cells.length === COLUMNS.length && cells.every((c, n) => c === COLUMNS[n])) return;
  if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return;
  if (cells.length !== COLUMNS.length) {
    malformed.push(
      `  line ${i + 1}: ${cells.length} cells, expected ${COLUMNS.length} — ${trimmed.slice(0, 80)}`
    );
    return;
  }
  const row = Object.fromEntries(COLUMNS.map((name, n) => [name, cells[n]]));
  // Ids are wrapped in backticks in the brief so they read as code; the manifest's are bare.
  row.id = row.id.replace(/^`(.*)`$/, '$1');
  row.line = i + 1;
  rows.push(row);
});

if (malformed.length > 0) {
  fail(
    `malformed table row(s) — a cell count other than ${COLUMNS.length} means a literal pipe reached a cell:\n${malformed.join('\n')}`
  );
}

// The vacuous guard. A parser that matched nothing must not report a successful merge of nothing.
if (rows.length === 0) {
  console.error(
    `FAIL: no table rows parsed out of ${relative(process.cwd(), BRIEF)}. The merge has nothing to read; refusing to rewrite the manifest.`
  );
  process.exit(1);
}

// --- The bijection, both directions, driven by the manifest. ---

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

// --- The required column. A marker here is the failure this whole gate exists to catch. ---

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

// --- The D-22 backfill: a per-category rank derived from the global order. ---

/**
 * 00-ADMIN-IA §3 (D-22): "one ordering cannot serve both views". The 39 photographs are unevenly
 * distributed — architecture 14 against product 2 — so a global sequence that reads well
 * end-to-end scatters each category's best frames arbitrarily inside its own filtered view. The
 * per-category value wins when a category filter is active; the global `order` governs the
 * unfiltered gallery and the Home peek strip.
 *
 * THE FIELD IS NAMED `categoryOrder`. 00-ADMIN-IA specifies the semantics and never names the
 * field, and three consumers have to agree on the word: 03-06's schema, Phase 5's gallery and
 * Phase 7's `/admin/photography`. `categoryOrder` was chosen over `rank`, `positionInCategory` and
 * `sortIndex` because it reads as the sibling of the `order` it sits beside — the pair
 * `order` / `categoryOrder` states the two facts in the two words that distinguish them, and a
 * reader who knows what `order` means needs no glossary for the second.
 *
 * The derivation is total and deterministic: within each category, rank by ascending global
 * `order` and assign 1…n densely. It refuses on a tie rather than breaking one, because a
 * silent tie-break would make the output depend on array position — and array position is not a
 * fact anybody reviewed.
 */
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

/** id → its 1-based rank within its own category, by ascending global order. */
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

// --- Merge. Values are copied verbatim; only the table's own cell padding was trimmed. ---

/** An optional cell is "absent" when it is empty or holds the optional marker. */
const isAbsent = (cell) => cell === '' || cell === OPT_MARKER || cell === ALT_MARKER;

const changes = [];

/**
 * Rebuild the record with `alt` immediately after `title`, `place` immediately after `alt` and
 * `categoryOrder` immediately after `order`, every other key keeping its position. The point is
 * diff legibility: an insertion at a sensible spot reads as an addition, whereas appending would
 * push the reviewer through a whole-record reshuffle to find three new values. `categoryOrder`
 * sits beside `order` specifically so that the two orderings are read together — they are the
 * one pair in the record that can silently contradict each other.
 */
const merged = manifest.map((photo) => {
  const row = rowById.get(photo.id);
  const next = {};
  for (const [key, value] of Object.entries(photo)) {
    // Re-inserted below in their canonical positions rather than kept where they were found.
    if (key === 'alt' || key === 'place' || key === 'categoryOrder') continue;
    next[key] = value;
    if (key === 'title') {
      next.alt = row.alt;
      if (!isAbsent(row.place)) next.place = row.place;
    }
    if (key === 'order') next.categoryOrder = categoryRank.get(photo.id);
  }
  if (!('alt' in next)) {
    // Defensive: a record with no `title` key would otherwise lose its alt silently.
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

// `data/` is Biome-excluded, so nothing reformats this for us. Two-space, trailing newline.
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
