#!/usr/bin/env node
/**
 * check-case-length.mjs — the R-1 length band over the case-study corpus.
 *
 * The regression this guards: D-39's two tiers are superseded by
 * `00-RESPONSIVE-CONTRACT.md` §7 — one tier, one template, one length. R-1 sets
 * that length at 500-700 words measured over the FOUR REQUIRED SECTIONS, not over
 * the whole file. Two totals are therefore in circulation for every draft, and
 * quoting one against the other reads as an arithmetic error, so this script
 * measures the one R-1 actually specifies and prints it per slug.
 *
 * Why a second script rather than a rule inside check-copy-length.mjs: that gate
 * enforces D-40 (placeholder realism) and D-43 (slot budgets) over the whole copy
 * corpus including `one-liners.md`. This one enforces a band over case studies
 * only. Keeping them separate keeps each failure message about one decision.
 *
 * Rules, all accumulated before exiting so one run names every problem:
 *   1. Required sections — every case draft carries `## Problem`, a middle heading,
 *      `## Outcome` and `## Assets`. The middle heading is ONE slot matching EITHER
 *      `## Decisions` or `## Decision`. A draft carrying neither is an error naming
 *      the file, both accepted spellings, and the headings actually found. This
 *      matters because a required-heading list that silently skips a missing
 *      `Decisions` counts three sections and reports a LOW word count as a PASS —
 *      the gate would then certify the exact defect it exists to catch.
 *   2. Band compliance (R-1) — 500-700 words over those four sections, enforced on
 *      the slugs in OWNED, reported for every other slug.
 *   3. Provenance survival — `[source: ...]` markers are stripped BEFORE counting
 *      (they are provenance furniture, not prose; counting them would let a
 *      compression pass reach the band by keeping citations and cutting sentences)
 *      and asserted separately, so stripping them cannot also hide their loss.
 *
 * Run:  node .planning/phases/00-design-ideation/scripts/check-case-length.mjs
 * Deps: none beyond node:fs and node:path. No install, no config, no network.
 * Exit: 0 with a per-slug report, or 1 with one named failure per line. This
 *       script never warns and exits 0 — a gate that degrades is not a gate.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

/** R-1, via `00-RESPONSIVE-CONTRACT.md` §7. Measured over the four required sections. */
const MIN_WORDS = 500;
const MAX_WORDS = 700;

/**
 * The slugs whose band is ENFORCED. `design-system` is measured and printed but
 * never fails the run: it was compressed to this same 500-700 target by a parallel
 * off-plan run (`00-COMPRESSION-NOTE.md`), and plan 00-18 must not edit a file
 * another agent holds open — a collision between two agents in one directory loses
 * work with no conflict marker, because they are different files in the same tree.
 *
 * This exclusion is a SCHEDULING artefact, not a permanent carve-out. It ends when
 * plan 00-20 lands its build-time loader assertion, which covers all five studies
 * at render time regardless of which plan wrote them. At that point `design-system`
 * moves into OWNED here and this exclusion is deleted.
 */
const OWNED = ["cairn", "hued", "momentum", "timeshift"];

/** Rule 1's middle slot: one section, two accepted spellings. */
const MIDDLE_HEADING_SPELLINGS = ["## Decisions", "## Decision"];

/**
 * The four required H2s in document order. The middle entry is an array because it
 * is one slot with two accepted spellings, not two optional sections.
 */
const REQUIRED_HEADINGS = ["## Problem", MIDDLE_HEADING_SPELLINGS, "## Outcome", "## Assets"];

const PHASE_DIR = join(import.meta.dirname, "..");
const CORPUS_DIR = join(PHASE_DIR, "00-COPY");

/**
 * `countWords` and `stripComments` below are DUPLICATED from
 * `check-copy-length.mjs` rather than imported. The reason is deliberate: scripts
 * under `.planning/` must run with `node <path>` and no install step — there is no
 * package.json, no module boundary and no build here, so a shared module would add
 * a resolution dependency between two files that are otherwise independently
 * runnable. The duplication is load-bearing in one direction: if either copy
 * changes, BOTH must, or the two gates will disagree about what a word is and the
 * corpus will pass one and fail the other for no visible reason.
 */

/**
 * HTML comments carry drafting notes and D-40 rule 4's "what was searched and why
 * it came up empty". That is meta ABOUT the study, not the study, and it routinely
 * carries real counts — so it is stripped before counting, or a compression pass
 * could reach the band on the strength of its own drafting notes.
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

/**
 * `[source: ...]` markers, which may wrap across lines — `[^\]]` matches newlines,
 * so a marker split over two lines is still one match.
 */
const SOURCE_MARKER = /\[source:[^\]]*\]/g;

/** Provenance stripped from the prose it annotates, so it cannot pad the count. */
function stripSourceMarkers(block) {
	return block.replace(SOURCE_MARKER, " ");
}

/** Every `case-*.md` in the corpus. `one-liners.md` is slots, not a case study. */
function caseFiles(dir) {
	const acc = [];
	for (const entry of readdirSync(dir).sort()) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) continue;
		if (entry.startsWith("case-") && entry.endsWith(".md")) acc.push(p);
	}
	return acc;
}

/** `case-timeshift.md` -> `timeshift`. */
function slugOf(file) {
	return basename(file).replace(/^case-/, "").replace(/\.md$/, "");
}

/** Every `## ` heading in the file, in document order, with its offset. */
function headings(text) {
	const found = [];
	for (const m of text.matchAll(/^##[ \t]+(.+?)[ \t]*$/gm)) {
		found.push({ text: `## ${m[1]}`, start: m.index, bodyStart: m.index + m[0].length });
	}
	return found;
}

/** The prose a heading owns: everything after its line, up to the next `## `. */
function sectionBody(text, found, i) {
	const end = i + 1 < found.length ? found[i + 1].start : text.length;
	return text.slice(found[i].bodyStart, end);
}

const violations = [];
const rows = [];

let files = [];
try {
	files = caseFiles(CORPUS_DIR);
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

if (files.length === 0) {
	console.error(
		`FAIL: no case-*.md files found under ${relative(process.cwd(), CORPUS_DIR)}.\n` +
			"  This gate must never pass by finding nothing to check.",
	);
	process.exit(1);
}

for (const file of files) {
	const text = readFileSync(file, "utf8");
	const rel = relative(process.cwd(), file);
	const slug = slugOf(file);
	const owned = OWNED.includes(slug);
	const found = headings(text);
	const foundTexts = found.map((h) => h.text);

	// --- Rule 1: the four required sections, middle heading either spelling ---
	let total = 0;
	let missing = false;
	const perSection = [];

	for (const required of REQUIRED_HEADINGS) {
		const accepted = Array.isArray(required) ? required : [required];
		const i = found.findIndex((h) => accepted.includes(h.text));
		if (i === -1) {
			missing = true;
			violations.push(
				`MISSING-SECTION: ${rel} — no ${accepted.map((a) => `"${a}"`).join(" or ")} heading.\n` +
					`    accepted spelling(s): ${accepted.join(" | ")}\n` +
					`    headings found:       ${foundTexts.length ? foundTexts.join(" | ") : "(none)"}\n` +
					"    A missing required section is silent at render time: the template finds no\n" +
					"    heading, drops the whole section, and still returns a page.",
			);
			continue;
		}
		const body = stripSourceMarkers(stripComments(sectionBody(text, found, i)));
		const words = countWords(body);
		perSection.push(`${found[i].text.replace(/^## /, "")} ${words}`);
		total += words;
	}

	// --- Rule 3: provenance survives compression ---
	const sources = (text.match(SOURCE_MARKER) || []).length;
	if (owned && sources === 0) {
		violations.push(
			`NO-PROVENANCE: ${rel} — zero [source: ...] markers survive. Markers are stripped\n` +
				"    from the word count so they cannot pad the band; losing all of them means the\n" +
				"    study's numbers are no longer checkable by a reader who opens the repo.",
		);
	}

	// --- Rule 2: the R-1 band, enforced on OWNED, reported for the rest ---
	let verdict;
	if (missing) {
		verdict = "ERROR (required section missing — count is partial)";
	} else if (total < MIN_WORDS || total > MAX_WORDS) {
		const bound = total < MIN_WORDS ? "UNDER" : "OVER";
		verdict = owned ? `FAIL (${bound} band)` : `${bound} band — reported, not owned`;
		if (owned) {
			violations.push(
				`BAND (R-1): ${rel} — ${total} words over the four required sections, ` +
					`${bound} the ${MIN_WORDS}-${MAX_WORDS} band.\n` +
					`    sections: ${perSection.join(" · ")}`,
			);
		}
	} else {
		verdict = owned ? "PASS" : "in band — reported, not owned";
	}

	rows.push({ slug, owned, total, verdict, sources, perSection });
}

console.log(
	`Case-study length band (R-1): ${MIN_WORDS}-${MAX_WORDS} words over ${REQUIRED_HEADINGS.length} required sections.`,
);
console.log(`Enforced on: ${OWNED.join(", ")}. Reported only: every other slug.\n`);
for (const r of rows) {
	const own = r.owned ? "owned   " : "reported";
	console.log(
		`  ${own} ${r.slug.padEnd(26)} ${String(r.total).padStart(5)} words  [source:] x${r.sources}  ${r.verdict}`,
	);
	if (r.perSection.length) console.log(`           ${r.perSection.join(" · ")}`);
}
console.log("");

if (violations.length > 0) {
	console.error(`FAIL: ${violations.length} case-study violation(s) in ${files.length} file(s) under 00-COPY/\n`);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

console.log(`PASS: ${files.length} case file(s) scanned, ${OWNED.length} enforced, all inside ${MIN_WORDS}-${MAX_WORDS}.`);
