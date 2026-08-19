// coverage.mjs — the 42-cell matrix, GENERATED FROM THE SCREENS THEMSELVES.
//
// ═══ WHY THIS IS GENERATED AND NOT TYPED ═══════════════════════════════════
// D-03 requires admin states covered "exhaustively". UI-SPEC keeps that promise
// not by rendering all ~108 naive screen × state × layout combinations but by
// an explicit, complete coverage matrix — and that reduction is only honest if
// the matrix is derived from each screen's OWN declaration and a blank cell is
// a build failure. A hand-typed table is a claim about the sketches; a
// generated one is a reading of them. The difference shows up the first time a
// screen changes and the table does not.
//
// ═══ THE THREE-VALUE CELL VOCABULARY, AND WHAT EACH MUST CARRY ═════════════
//   designed      a sketch exists for this exact cell   → must carry an artefact ID
//   inherits      covered by a treatment sketched elsewhere → must carry the treatment ID
//   n/a           this cell cannot occur                → must carry a one-clause reason
// A blank cell fails review. That single rule is what converts "exhaustively"
// from an aspiration into a checkable property.
//
// ═══ THE SIXTH CONDITION, AND WHY IT EXISTS ═══════════════════════════════
// UI-SPEC names five failure modes. This module checks a SIXTH that plan 15
// found by hand and handed to plan 16 as an open ruling:
//
//   the dashboard has declared `{ state: "error", coverage: "inherits",
//   ref: "T-error-publish" }` since plan 12, and until plan 16 NO SCREEN
//   DESIGNED T-error-publish.
//
// The contact sheet's existing ref guard could not catch it, because that guard
// asks whether a ref is a member of CANONICAL_IDS — and `T-error-publish` is
// one. So the cell read as covered, linked to a legal id, and pointed at
// nothing anybody had built. An `inherits` whose target does not exist is
// strictly worse than a blank cell: a blank cell is visibly undone, and this
// one is invisibly undone.
//
// UNHOSTED_INHERITS therefore requires every `inherits` ref to resolve to an
// artefact some module actually DECLARES — either a `designed` cell, or an
// `ARTEFACT` / `ARTEFACTS` export on a route that has no coverage cell of its
// own (which is what every cross-cutting O- and T- artefact is).
//
// ═══ TWO CALLERS, ONE IMPLEMENTATION ══════════════════════════════════════
// src/pages/index.astro calls buildMatrix + auditMatrix during the page render
// and THROWS, so `astro build` itself fails on a blank cell — the gate is in
// the build rather than beside it. check-coverage.mjs extracts the same
// declarations straight out of the .astro sources and calls the same two
// functions, so it still reports when the build is broken and gives the
// sampling loop in VALIDATION.md fast feedback. Both paths share this file
// exactly; neither has its own copy of a rule.

import { CANONICAL_IDS, CANONICAL_SCREENS, CANONICAL_STATES } from "./artefacts.mjs";

/** Exactly three, and nothing else is a coverage value. */
export const COVERAGE_VALUES = Object.freeze(["designed", "inherits", "n/a"]);

/**
 * The shortest string that can be a clause. Twelve characters is plan 15's
 * number, chosen so `n/a` cannot be used to make an undesigned cell look
 * decided by writing "no" in the reason field.
 */
export const MIN_REASON = 12;

const stateHref = (route, state) => (state === "populated" ? `${route}/` : `${route}/${state}/`);

/**
 * Build the matrix from a set of route modules.
 *
 * @param {Record<string, any>} modules the value of
 *   `import.meta.glob("./admin/**\/*.astro", { eager: true })`, or the same
 *   shape reconstructed from source by check-coverage.mjs.
 * @returns a structured matrix. RENDERING BELONGS TO THE PAGE — nothing here
 *   emits markup, so the same object drives the contact sheet and the gate.
 */
export function buildMatrix(modules) {
	// ── Every module that declares a screen ────────────────────────────────
	const declared = Object.entries(modules)
		.filter(([, m]) => m && m.SCREEN && m.STATES)
		.map(([file, m]) => ({ file, screen: m.SCREEN, states: m.STATES }));

	// ── Every module that declares a cross-cutting artefact ────────────────
	// `ARTEFACT` (one) and `ARTEFACTS` (many) are both accepted: conflict-diff
	// was written with the singular in plan 15 and the overlay and phone routes
	// carry several each. Renaming plan 15's export to match would have been a
	// silent edit to a file this plan does not own.
	const artefacts = Object.entries(modules).flatMap(([file, m]) => {
		if (!m) return [];
		const one = m.ARTEFACT ? [m.ARTEFACT] : [];
		const many = Array.isArray(m.ARTEFACTS) ? m.ARTEFACTS : [];
		return [...one, ...many].map((a) => ({ ...a, file }));
	});

	// ── The seven rows, in CANONICAL_SCREENS (D-05) order ──────────────────
	const rows = CANONICAL_SCREENS.map((id) => {
		const hits = declared.filter((d) => d.screen.id === id);
		const hit = hits[0];
		const byState = new Map((hit?.states ?? []).map((s) => [s.state, s]));
		return {
			id,
			found: hits.length > 0,
			duplicates: hits.length > 1 ? hits.map((h) => h.file) : null,
			file: hit?.file ?? null,
			route: hit?.screen?.route ?? null,
			entity: hit?.screen?.entity ?? null,
			// `populated` is the ROW — the screen itself, carried by the S-
			// artefact — and is deliberately not a cell. See artefacts.mjs.
			populated: byState.get("populated") ?? null,
			cells: CANONICAL_STATES.map((state) => {
				const s = byState.get(state);
				return {
					screen: id,
					state,
					declared: Boolean(s),
					coverage: s?.coverage ?? null,
					ref: s?.ref ?? null,
					reason: s?.reason ?? null,
					href: hit?.screen?.route ? stateHref(hit.screen.route, state) : null,
				};
			}),
		};
	});

	// Any screen id declared that is NOT in the registry. Reported rather than
	// dropped: silently dropping it is how a screen goes missing from a review.
	const unknownScreens = declared
		.filter((d) => !CANONICAL_SCREENS.includes(d.screen.id))
		.map((d) => ({ id: d.screen.id, file: d.file }));

	const cells = rows.flatMap((r) => r.cells);

	// ── WHERE EACH ARTEFACT ID IS ACTUALLY HOSTED ──────────────────────────
	// Two sources, unioned: a `designed` cell hosts its ref at its own state
	// route, and a route with no cell of its own hosts whatever it declares in
	// ARTEFACT / ARTEFACTS. `populated` contributes too, because the S-
	// artefacts live there.
	const hosts = new Map();
	for (const r of rows) {
		if (r.populated?.coverage === "designed" && r.populated.ref && r.route) {
			hosts.set(r.populated.ref, stateHref(r.route, "populated"));
		}
		for (const c of r.cells) {
			if (c.coverage === "designed" && c.ref && c.href) hosts.set(c.ref, c.href);
		}
	}
	for (const a of artefacts) {
		if (a.id && !hosts.has(a.id)) hosts.set(a.id, `${a.route}/`);
	}

	for (const c of cells) c.hostedAt = c.ref ? (hosts.get(c.ref) ?? null) : null;

	return {
		rows,
		cells,
		artefacts,
		unknownScreens,
		hosts,
		counts: {
			screens: CANONICAL_SCREENS.length,
			states: CANONICAL_STATES.length,
			cells: cells.length,
			expected: CANONICAL_SCREENS.length * CANONICAL_STATES.length,
			designed: cells.filter((c) => c.coverage === "designed").length,
			inherits: cells.filter((c) => c.coverage === "inherits").length,
			na: cells.filter((c) => c.coverage === "n/a").length,
		},
	};
}

/**
 * The gate. Returns a list of problems; an empty list is a pass.
 *
 * Each problem NAMES ITS FAILURE MODE rather than restating the assertion,
 * following the convention plan 01's scripts set: a message that says
 * "expected 42, got 41" tells the reader nothing they could act on.
 */
export function auditMatrix(matrix) {
	const problems = [];

	// ── 1. A screen exists on paper and not on disk ────────────────────────
	for (const r of matrix.rows) {
		if (!r.found) {
			problems.push({
				code: "MISSING_SCREEN",
				where: r.id,
				message:
					`the screen "${r.id}" is in CANONICAL_SCREENS and no route module exports a SCREEN ` +
					"for it. Six of its cells are therefore absent from the matrix and the table would " +
					"be short a row while still rendering.",
			});
		}
		if (r.duplicates) {
			problems.push({
				code: "DUPLICATE_SCREEN",
				where: r.id,
				message:
					`two modules both declare the screen "${r.id}" (${r.duplicates.join(", ")}). One of ` +
					"them is being silently ignored, so a STATES array is being read from a file nobody " +
					"is looking at.",
			});
		}
	}

	for (const c of matrix.cells) {
		const at = `${c.screen}/${c.state}`;

		// ── 2. A blank cell ────────────────────────────────────────────────
		if (!c.declared) {
			problems.push({
				code: "BLANK_CELL",
				where: at,
				message:
					`the "${c.screen}" screen declares no entry for the "${c.state}" state. A blank cell ` +
					"fails review — that single rule is what converts D-03's \"exhaustively\" from an " +
					"aspiration into a checkable property, and this is it firing.",
			});
			continue;
		}

		// ── 3. A coverage value outside the vocabulary ─────────────────────
		if (!COVERAGE_VALUES.includes(c.coverage)) {
			problems.push({
				code: "BAD_COVERAGE",
				where: at,
				message:
					`coverage is ${JSON.stringify(c.coverage)}, which is not one of designed / inherits / ` +
					"n/a. A fourth value is a cell nobody can read, and the table would print it as if " +
					"it meant something.",
			});
			continue;
		}

		// ── 4. A dangling reference ────────────────────────────────────────
		if (c.coverage !== "n/a" && !CANONICAL_IDS.includes(c.ref)) {
			problems.push({
				code: "DANGLING_REF",
				where: at,
				message:
					`the ref ${JSON.stringify(c.ref)} is not a member of CANONICAL_IDS. A ref pointing at ` +
					"nothing renders as a covered cell and is not one — this is how a coverage table " +
					"silently lies. Add the id to src/lib/artefacts.mjs (plans 12-16 may ADD one) or fix " +
					"the typo.",
			});
			continue;
		}

		// ── 5. An n/a with no reason ───────────────────────────────────────
		if (c.coverage === "n/a") {
			if (typeof c.reason !== "string" || c.reason.trim().length < MIN_REASON) {
				problems.push({
					code: "REASONLESS_NA",
					where: at,
					message:
						`coverage is n/a with reason ${JSON.stringify(c.reason)}. UI-SPEC requires ` +
						`\`n/a: <reason>\` with a one-clause reason of at least ${MIN_REASON} characters. ` +
						"An n/a with no reason is a blank cell wearing a label, which is precisely what the " +
						"coverage contract forbids.",
				});
			}
			if (c.ref) {
				problems.push({
					code: "REASONLESS_NA",
					where: at,
					message:
						`coverage is n/a and yet carries a ref (${JSON.stringify(c.ref)}). A cell that ` +
						"cannot occur has nothing to point at; carrying both is how an n/a starts reading " +
						"as a designed cell.",
				});
			}
			continue;
		}

		// ── 6. An inherits that resolves to nothing anybody built ──────────
		if (c.coverage === "inherits" && !c.hostedAt) {
			problems.push({
				code: "UNHOSTED_INHERITS",
				where: at,
				message:
					`the cell inherits ${JSON.stringify(c.ref)} and NO MODULE DESIGNS IT. The ref is a ` +
					"legal member of CANONICAL_IDS, so the older ref guard passes it — this is the exact " +
					"class of failure plan 15 found by hand on the dashboard's error cell. Either sketch " +
					"the treatment and declare it (a `designed` cell, or an ARTEFACT / ARTEFACTS export " +
					"on its own route), or change the cell to n/a with a reason.",
			});
			continue;
		}

		// A `designed` cell whose host is not itself is not an error, but a
		// `designed` cell with no host at all means the row has no route.
		if (c.coverage === "designed" && !c.href) {
			problems.push({
				code: "MISSING_SCREEN",
				where: at,
				message:
					"the cell is designed and its screen has no route, so the artefact cannot be opened. " +
					"A designed cell that cannot be reached is not reviewable.",
			});
		}
	}

	// ── The arithmetic, asserted rather than assumed ───────────────────────
	if (matrix.counts.cells !== matrix.counts.expected) {
		problems.push({
			code: "WRONG_CELL_COUNT",
			where: "matrix",
			message:
				`the matrix has ${matrix.counts.cells} cells and the contract is ` +
				`${matrix.counts.screens} x ${matrix.counts.states} = ${matrix.counts.expected}. ` +
				"CANONICAL_STATES has probably gained `populated`, which is the ROW and not a cell — " +
				"see the comment in src/lib/artefacts.mjs.",
		});
	}

	for (const u of matrix.unknownScreens) {
		problems.push({
			code: "UNKNOWN_SCREEN",
			where: u.id,
			message:
				`${u.file} declares the screen id "${u.id}", which is not in CANONICAL_SCREENS. It has ` +
				"no row in the matrix, so its states are reviewed by nobody.",
		});
	}

	return problems;
}

/** One block of text naming every failure, for a thrown error or a console. */
export function formatProblems(problems) {
	const byCode = new Map();
	for (const p of problems) byCode.set(p.code, (byCode.get(p.code) ?? 0) + 1);
	const summary = [...byCode.entries()].map(([c, n]) => `${c} x${n}`).join(" · ");
	return (
		`coverage: ${problems.length} offending cell(s) — ${summary}\n\n` +
		problems.map((p) => `  [${p.code}] ${p.where}\n      ${p.message}`).join("\n\n")
	);
}
