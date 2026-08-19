// check-coverage.mjs — the gate on the 42-cell coverage matrix.
//
// ═══ WHAT IT PROVES ════════════════════════════════════════════════════════
// D-03 requires the admin's states covered "exhaustively", and UI-SPEC keeps
// that promise by REDUCTION: ~35 artefacts instead of ~108 combinations, held
// together by a 7 x 6 = 42-cell table in which every cell reads exactly one of
// `designed`, `inherits` or `n/a`. The reduction is only honest if the table is
// generated from each screen's own declaration AND a blank cell fails. This
// script is the second half of that sentence.
//
// ═══ SIX CONDITIONS ════════════════════════════════════════════════════════
// The five UI-SPEC names, plus one plan 15 found by hand:
//   1. MISSING_SCREEN      a screen exists on paper and not on disk
//   2. BLANK_CELL          a screen's STATES omits a canonical state
//   3. BAD_COVERAGE        a coverage value outside the three-word vocabulary
//   4. DANGLING_REF        a ref that is not a member of CANONICAL_IDS
//   5. REASONLESS_NA       an n/a with no reason (or with a ref)
//   6. UNHOSTED_INHERITS   an inherits whose target nobody actually designed
// Condition 6 is the one the older guard could not see: `T-error-publish` IS a
// canonical id, so a cell inheriting it passed every check while pointing at an
// artefact that did not exist. See src/lib/coverage.mjs for the full argument.
//
// ═══ WHY IT PARSES SOURCE RATHER THAN READING dist/ ════════════════════════
// The same matrix is built during the page render in src/pages/index.astro,
// which THROWS on any problem — so `astro build` itself fails and the gate is
// in the build rather than beside it. That is the gate with teeth. But it also
// means that when the matrix is broken THERE IS NO BUILD OUTPUT TO READ, so a
// script that inspected `dist/` could only ever report on a tree that had
// already passed. Parsing the sources instead makes this script useful in
// exactly the situation it exists for, and gives the sampling loop in
// VALIDATION.md feedback in well under a second.
//
// The declarations are plain object and array literals — that is a property of
// UI-SPEC's contract, not a coincidence — so they are read out of the
// frontmatter by balanced-delimiter scan and evaluated. EXTRACTION FAILURE IS A
// FAILURE, never a skip: a screen whose STATES could not be read would
// otherwise silently become a screen with no cells, which is the exact shape of
// the bug this file guards against.
//
// FAIL LOUD, ALWAYS — plan 01's convention. No console.warn and exit 0.

import { auditMatrix, buildMatrix, formatProblems } from "./src/lib/coverage.mjs";
import { CANONICAL_IDS, CANONICAL_SCREENS, CANONICAL_STATES } from "./src/lib/artefacts.mjs";

// ═══ THE SOURCE READER MOVED, AND NOTHING ABOUT IT CHANGED ═════════════════
// walk / frontmatter / readLiteral / extract and the module-build loop used to
// live in this file as top-level statements, which meant they could not be
// imported — a second non-render caller could only have its own copy. Plan
// 00-17's shoot.mjs is that second caller: it needs the same id → route mapping
// this matrix derives, and a private copy of the parse is exactly the drift
// artefacts.mjs's header warns about. The reader now lives in
// src/lib/declarations.mjs and both callers import it, so coverage.mjs's "one
// implementation" doctrine holds for the extraction as well as for the rules.
import { readAdminModules } from "./src/lib/declarations.mjs";

const { files, modules } = readAdminModules();

const matrix = buildMatrix(modules);
const problems = auditMatrix(matrix);

// ── The readout, whether it passes or not ──────────────────────────────────
console.log(
	`check-coverage: ${files.length} route file(s) · ${matrix.rows.filter((r) => r.found).length}/` +
		`${CANONICAL_SCREENS.length} screens declared · ${matrix.artefacts.length} cross-cutting ` +
		`artefact(s) · ${CANONICAL_IDS.length} canonical ids`,
);
console.log("");

const pad = (s, n) => String(s).padEnd(n);
console.log(`  ${pad("screen", 16)}${CANONICAL_STATES.map((s) => pad(s, 12)).join("")}`);
for (const r of matrix.rows) {
	const cells = r.cells.map((c) => {
		if (!c.declared) return pad("BLANK", 12);
		if (c.coverage === "n/a") return pad("n/a", 12);
		return pad(c.coverage === "designed" ? "designed" : "inherits", 12);
	});
	console.log(`  ${pad(r.id, 16)}${cells.join("")}`);
}
console.log("");
console.log(
	`  ${matrix.counts.cells} cells — ${matrix.counts.designed} designed, ` +
		`${matrix.counts.inherits} inherits, ${matrix.counts.na} n/a, ` +
		`${matrix.counts.cells - matrix.counts.designed - matrix.counts.inherits - matrix.counts.na} blank`,
);
console.log("");

if (problems.length > 0) {
	console.error("check-coverage: FAILURE MODE — the coverage table does not describe the sketches.\n");
	console.error(formatProblems(problems));
	console.error(
		"\nA coverage table that lies is worse than no table: a later phase reads an unaccounted " +
			"state as designed and never builds it.",
	);
	process.exit(1);
}

console.log(
	`PASS: ${matrix.counts.cells}/${matrix.counts.expected} cells, no blanks, every ref canonical, ` +
		"every inherits hosted, every n/a reasoned.",
);
