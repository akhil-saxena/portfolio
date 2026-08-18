#!/usr/bin/env node
/**
 * check-photo-content.mjs — the completeness and quality gate over 00-PHOTO-CONTENT.md.
 *
 * The regression this guards: a photograph shipping to a screen-reader user with no
 * usable alt text. The public gallery ships ZERO framework JS, so `alt` is delivered
 * on the `<img>` element and is the entire non-visual experience of the page — there
 * is no hover, no tooltip and no later interaction that could supply a description,
 * because there is no JavaScript on the page to implement one. That makes three
 * failure modes indistinguishable from "done" on inspection, and this gate exists to
 * tell them apart:
 *
 *   - a photo with no row at all, because a row was hand-added and one was forgotten;
 *   - a row whose alt cell is blank, which is neither filled nor tracked;
 *   - a row whose alt is the title, or opens with "Photo of", which reads as filled
 *     and carries no information a listener can use.
 *
 * The row set is derived from `data/portfolio_images.json` and NEVER from a list kept
 * inside this file. That is the property that makes a newly published photograph
 * impossible to miss: publishing it adds a manifest record, and the next run names it.
 *
 * Four rules, all accumulated before exiting so one run names every problem:
 *   1. Completeness   — every manifest id has exactly one row; missing ids are named.
 *   2. Alt presence   — every alt cell is either the pending marker or a non-empty
 *                       string. A blank cell is the untracked state and fails.
 *   3. Alt != title   — a FILLED alt equal to its title (case- and whitespace-
 *                       insensitive) fails. A title names a photograph; alt describes
 *                       one. This is the exact failure the field exists to prevent.
 *   4. No role prefix — a FILLED alt must not open with "Image of" / "Photo of" /
 *                       "Picture of". A screen reader announces the role already, so
 *                       the prefix is the same word twice on every image.
 *
 * Rules 3 and 4 apply only to FILLED values. A pending marker is a tracked gap, not a
 * bad answer, and the 40-word floor in check-copy-length.mjs deliberately does NOT
 * reach this file — alt text is one sentence, and a 40-word alt string is itself an
 * accessibility defect.
 *
 * Run:  node .planning/phases/00-design-ideation/scripts/check-photo-content.mjs
 * Deps: none beyond node:fs and node:path. No install, no config, no network.
 * Exit: 0 with a per-category report, or 1 with one named failure per line. This
 *       script never warns and exits 0 — a gate that degrades is not a gate.
 *
 * WRITING A NEGATIVE CONTROL FOR THIS GATE — one portability trap, measured here:
 *   `sed -i '' '0,/\[AKHIL-ALT\]/s//.../' 00-PHOTO-CONTENT.md` is a GNU-sed idiom.
 *   On the BSD sed shipped with macOS it **silently changes nothing and exits 0** —
 *   no error, no diff. A control built on it never mutates the file, so the gate
 *   correctly passes and the control has proven nothing while appearing to run.
 *   That is the same false-control class as asserting with `grep -c`, which counts
 *   LINES rather than matches. Mutate with node (`String.prototype.replace`) or
 *   `perl -0pi -e`, and assert on this script's EXIT CODE plus the id it names.
 */

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

const PHASE_DIR = join(import.meta.dirname, "..");
const REPO_ROOT = join(PHASE_DIR, "..", "..", "..");
const MANIFEST = join(REPO_ROOT, "data", "portfolio_images.json");
const BRIEF = join(PHASE_DIR, "00-PHOTO-CONTENT.md");

/** The pending-value markers. Distinct from copy's marker, on purpose — see header. */
const ALT_MARKER = "[AKHIL-ALT]";
const OPT_MARKER = "[AKHIL-OPT]";

/** Rule 4: a screen reader announces the role before it reads the string. */
const ROLE_PREFIXES = ["image of", "photo of", "picture of"];

/** Case- and whitespace-insensitive comparison key (rule 3). */
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// --- Load the manifest. It is the row set; nothing here is hand-listed. ---

let manifest;
try {
	manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (err) {
	console.error(`FAIL: manifest is unreadable — ${relative(process.cwd(), MANIFEST)}\n  ${err.message}`);
	process.exit(1);
}
if (!Array.isArray(manifest)) {
	console.error(`FAIL: manifest is not an array — ${relative(process.cwd(), MANIFEST)}`);
	process.exit(1);
}

const photos = new Map(manifest.map((p) => [p.id, p]));

let brief;
try {
	brief = readFileSync(BRIEF, "utf8");
} catch (err) {
	console.error(`FAIL: brief is unreadable — ${relative(process.cwd(), BRIEF)}\n  ${err.message}`);
	process.exit(1);
}

// --- Parse the table rows. A line is a data row iff its first cell is a manifest id. ---
// Split on unescaped pipes so a title containing "\|" cannot shift every later column.

const COLUMNS = ["id", "title", "category", "date", "alt", "place", "description", "tags"];
const rows = new Map();
const violations = [];

brief.split("\n").forEach((raw, i) => {
	const line = raw.trim();
	if (!line.startsWith("|")) return;

	const cells = line
		.split(/(?<!\\)\|/)
		.slice(1, -1)
		.map((c) => c.trim().replace(/\\\|/g, "|"));
	if (cells.length !== COLUMNS.length) return;

	const id = cells[0].replace(/^`|`$/g, "").trim();
	if (!photos.has(id)) return; // header, separator, or prose table — not a data row

	const row = { lineNo: i + 1 };
	COLUMNS.forEach((name, c) => {
		row[name] = name === "id" ? id : cells[c];
	});

	if (rows.has(id)) {
		violations.push(
			`DUPLICATE-ROW: ${id} appears twice — line ${rows.get(id).lineNo} and line ${row.lineNo}. ` +
				"Two rows for one photo means one of them is edited and the other silently ignored.",
		);
		return;
	}
	rows.set(id, row);
});

// --- Rule 1: completeness, derived from the manifest ---

const missing = manifest.filter((p) => !rows.has(p.id));
for (const p of missing) {
	violations.push(
		`COMPLETENESS (rule 1): no row for "${p.id}" (${p.category}, titled "${p.title}"). ` +
			"Every published photograph needs a row, or its alt text is never written and never missed.",
	);
}

// --- Rules 2-4, per row ---

for (const [id, row] of rows) {
	const photo = photos.get(id);
	const alt = row.alt;

	// Rule 2: presence. Blank is the untracked state — neither filled nor pending.
	if (alt === "") {
		violations.push(
			`ALT-PRESENCE (rule 2): "${id}" has a blank alt cell. A blank is neither filled nor ` +
				`tracked — put ${ALT_MARKER} back if it is still pending, or write the description.`,
		);
		continue;
	}
	if (alt === ALT_MARKER) continue; // pending, and tracked as such — rules 3 and 4 do not apply

	// Rule 3: a filled alt that is just the title.
	const titles = new Set([norm(photo.title), norm(row.title)]);
	if (titles.has(norm(alt))) {
		violations.push(
			`ALT-EQUALS-TITLE (rule 3): "${id}" — alt is its own title, "${photo.title}". A title ` +
				"names a photograph; alt text describes one. A listener receives a name they cannot " +
				"resolve into an image, and the field looks filled.",
		);
	}

	// Rule 4: redundant role prefix.
	const opener = ROLE_PREFIXES.find((p) => norm(alt).startsWith(p));
	if (opener) {
		violations.push(
			`ALT-ROLE-PREFIX (rule 4): "${id}" — alt opens with "${alt.slice(0, opener.length)}". ` +
				"A screen reader announces the role before reading the text, so the prefix is the same " +
				"word twice. Start with the subject instead.",
		);
	}
}

// --- Report ---

if (violations.length > 0) {
	console.error(
		`FAIL: ${violations.length} photo-content violation(s) across ${manifest.length} manifest ` +
			`record(s) in ${relative(process.cwd(), BRIEF)}\n`,
	);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

const byCategory = new Map();
for (const p of manifest) {
	if (!byCategory.has(p.category)) byCategory.set(p.category, { filled: 0, pending: 0 });
	const bucket = byCategory.get(p.category);
	if (rows.get(p.id).alt === ALT_MARKER) bucket.pending += 1;
	else bucket.filled += 1;
}

const totalFilled = [...byCategory.values()].reduce((s, b) => s + b.filled, 0);
const optionalPending = [...rows.values()].reduce(
	(s, r) => s + [r.place, r.description, r.tags].filter((v) => v === OPT_MARKER).length,
	0,
);

console.log(
	`PASS: ${rows.size}/${manifest.length} manifest record(s) have a row; ` +
		`${totalFilled} alt text(s) written, ${manifest.length - totalFilled} outstanding.`,
);
for (const [cat, b] of [...byCategory].sort((a, b2) => b2[1].filled + b2[1].pending - (a[1].filled + a[1].pending) || a[0].localeCompare(b2[0]))) {
	console.log(`  ${cat.padEnd(14)} ${String(b.filled).padStart(2)} written / ${String(b.pending).padStart(2)} outstanding`);
}
console.log(`  ${"optional".padEnd(14)} ${optionalPending} pending place/description/tags cell(s) — optional, never blocking.`);
