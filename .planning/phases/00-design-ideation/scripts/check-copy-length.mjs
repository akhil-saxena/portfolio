#!/usr/bin/env node
/**
 * check-copy-length.mjs — the D-40 / D-43 gate over the Phase 0 copy corpus.
 *
 * The regression this guards: a six-word `[NEEDS AKHIL]` stub written where a
 * paragraph belongs. DSGN-06 exists so that build phases lay their templates out
 * against REAL text lengths — a short marker silently hands them a measure the
 * finished copy will never fit, and the layout then breaks in the phase that can
 * least afford it. That failure has a second face, which is the same lie told the
 * other way round: a guessed number that reads as a fact. In front of engineers
 * who can open the repo, an invented figure is worse than an admitted gap.
 * Both faces are caught here, before any copy reaches a sketch.
 *
 * Three rules, all accumulated before exiting so one run names every problem:
 *   1. Length realism (D-40)   — a `[NEEDS AKHIL]` marker must be followed by
 *                                >= 40 words of prose before the next heading,
 *                                horizontal rule, next marker, or end of file.
 *   2. Budget compliance (D-43) — in `one-liners.md`, `- one-liner:` payloads are
 *                                60-110 characters and `- card:` payloads are
 *                                120-200 characters (UI-SPEC Copywriting Contract).
 *   3. Guess visibility (D-40 rule 2) — inside a `[NEEDS AKHIL]` block, a bare run
 *                                of two or more digits is a guess wearing a fact's
 *                                clothes. `<n>`, `<month>`, `<metric>` are the
 *                                sanctioned form.
 *
 * Run:  node .planning/phases/00-design-ideation/scripts/check-copy-length.mjs
 * Deps: none beyond node:fs and node:path. No install, no config, no network.
 * Exit: 0 with a scan report, or 1 with one named failure mode per line. This
 *       script never warns and exits 0 — a gate that degrades is not a gate.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

/** D-40: the floor for placeholder prose at paragraph scale. */
const MIN_PLACEHOLDER_WORDS = 40;

/** D-43 budgets, from UI-SPEC "Copywriting Contract". */
const BUDGETS = {
	"- one-liner:": { min: 60, max: 110, slot: "one-liner (Home Act-2 grid, 2 lines)" },
	"- card:": { min: 120, max: 200, slot: "card description (Work project card, 3 lines)" },
};

/** Rule 2 applies to this file only; the rest of the corpus is prose, not slots. */
const BUDGETED_FILE = "one-liners.md";

const MARKER = "[NEEDS AKHIL]";

const PHASE_DIR = join(import.meta.dirname, "..");
const CORPUS_DIR = join(PHASE_DIR, "00-COPY");

/**
 * Every Markdown file in the corpus. Mirrors the design system's own
 * tokens.test.ts walk(): recurse, filter by extension, accumulate.
 */
function walk(dir, acc = []) {
	for (const entry of readdirSync(dir).sort()) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) walk(p, acc);
		else if (entry.endsWith(".md")) acc.push(p);
	}
	return acc;
}

/** Line number (1-based) of a character offset. */
function lineAt(text, index) {
	let line = 1;
	for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
	return line;
}

/**
 * The span a `[NEEDS AKHIL]` marker owns: everything after it up to the next
 * Markdown heading, horizontal rule, further marker, or end of file. A heading
 * or rule ends the section, so prose past it belongs to something else.
 */
function blockAfter(text, markerEnd) {
	const rest = text.slice(markerEnd);
	const terminator = /^(?:#{1,6}\s|\s*(?:-{3,}|\*{3,}|_{3,})\s*$)/m;
	const nextMarker = rest.indexOf(MARKER);
	const m = terminator.exec(rest);
	let end = rest.length;
	if (m && m.index < end) end = m.index;
	if (nextMarker !== -1 && nextMarker < end) end = nextMarker;
	return rest.slice(0, end);
}

/**
 * HTML comments carry D-40 rule 4's "what was searched and why it came up empty".
 * That is meta about the gap, not the finished-length prose, and it routinely
 * carries real counts — so it is stripped before both the word count and the
 * digit scan, or it would inflate rule 1 and false-trip rule 3.
 */
function stripComments(block) {
	return block.replace(/<!--[\s\S]*?-->/g, " ");
}

/** Markdown furniture removed; anything with a letter or digit counts as a word. */
function countWords(block) {
	const prose = block
		.replace(/^\s*>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/[`*_]/g, "");
	return prose.split(/\s+/).filter((t) => /[A-Za-z0-9]/.test(t)).length;
}

/** Character ranges covered by an `<angle-bracket>` slot. */
function slotRanges(block) {
	const ranges = [];
	for (const m of block.matchAll(/<[^<>\n]*>/g)) ranges.push([m.index, m.index + m[0].length]);
	return ranges;
}

const violations = [];

let files = [];
try {
	files = walk(CORPUS_DIR);
} catch (err) {
	// A missing corpus directory is a structural break, not an empty state: the
	// gate would otherwise pass by scanning nothing at all.
	console.error(
		`FAIL: corpus directory is unreadable — ${relative(process.cwd(), CORPUS_DIR)}\n` +
			`  ${err.message}\n` +
			"  This gate must never pass by finding nothing to check.",
	);
	process.exit(1);
}

let markerCount = 0;
let minWords = Infinity;

for (const file of files) {
	const text = readFileSync(file, "utf8");
	const rel = relative(process.cwd(), file);

	// --- Rule 1 + Rule 3: every [NEEDS AKHIL] marker and the block it owns ---
	let from = 0;
	for (;;) {
		const at = text.indexOf(MARKER, from);
		if (at === -1) break;
		from = at + MARKER.length;
		markerCount++;

		const line = lineAt(text, at);
		const block = stripComments(blockAfter(text, from));

		const words = countWords(block);
		if (words < minWords) minWords = words;
		if (words < MIN_PLACEHOLDER_WORDS) {
			violations.push(
				`LENGTH-REALISM (D-40): ${rel}:${line} — ${MARKER} is followed by ${words} words, ` +
					`below the ${MIN_PLACEHOLDER_WORDS}-word floor. A short stub hands the build phase a ` +
					"measure the finished copy will not fit.",
			);
		}

		const slots = slotRanges(block);
		for (const d of block.matchAll(/\d{2,}/g)) {
			const inSlot = slots.some(([s, e]) => d.index >= s && d.index + d[0].length <= e);
			if (!inSlot) {
				violations.push(
					`GUESS-VISIBILITY (D-40 rule 2): ${rel}:${line} — the ${MARKER} block contains the bare ` +
						`number "${d[0]}" outside an <angle-bracket> slot. A guess that looks like a fact is ` +
						"worse than a gap; write it as <n>, <month> or <metric>.",
				);
			}
		}
	}

	// --- Rule 2: D-43 character budgets, in one-liners.md only ---
	if (basename(file) !== BUDGETED_FILE) continue;
	const lines = text.split("\n");
	for (const [prefix, budget] of Object.entries(BUDGETS)) {
		lines.forEach((raw, i) => {
			if (!raw.startsWith(prefix)) return;
			const payload = raw.slice(prefix.length).trim();
			const n = payload.length;
			if (n < budget.min || n > budget.max) {
				const bound = n < budget.min ? `below the ${budget.min}-char floor` : `over the ${budget.max}-char ceiling`;
				violations.push(
					`BUDGET (D-43): ${rel}:${i + 1} — ${budget.slot} is ${n} characters, ${bound} ` +
						`(${budget.min}-${budget.max}). Copy outside the budget reflows the slot it was measured for.`,
				);
			}
		});
	}
}

if (violations.length > 0) {
	console.error(`FAIL: ${violations.length} copy violation(s) in ${files.length} file(s) under 00-COPY/\n`);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

const floor = markerCount === 0 ? "n/a (no markers)" : `${minWords} words`;
console.log(
	`PASS: ${files.length} file(s) scanned, ${markerCount} ${MARKER} marker(s), ` +
		`shortest placeholder block ${floor} (floor ${MIN_PLACEHOLDER_WORDS}).`,
);
