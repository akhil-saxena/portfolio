// artefacts.mjs — the canonical registry every admin sketch and the contact
// sheet import. Three frozen arrays, nothing else.
//
// WHY A MODULE RATHER THAN A TABLE IN A DOCUMENT. UI-SPEC's Review Convention
// says coverage is machine-checkable only if each screen declares its own
// states. That is true, but it is only *useful* if "the canonical states" and
// "the canonical ids" are one artefact rather than one-per-screen. Seven route
// files each carrying their own private copy of the six state names is six
// chances for a typo that renders a cell blank and still builds. Importing this
// module makes a typo a build failure instead.
//
// THE THREE LISTS ARE TRANSCRIBED, NOT DERIVED. CANONICAL_SCREENS comes from
// 00-ADMIN-IA.md §Routes in D-05 order; CANONICAL_STATES from 00-CONTEXT.md
// D-03 via 00-UI-SPEC.md §Review Convention; CANONICAL_IDS verbatim from
// 00-UI-SPEC.md §"Artefact classes and ID scheme" cross-checked against
// 00-ADMIN-IA.md §"Artefact inventory". Those two documents were compared
// id-by-id while writing this file and they agree exactly, on all forty.
// Plans 12 to 16 MAY add an id; they may NOT silently rename one, because
// findings and review comments cite these strings and those citations have to
// survive this directory's deletion.

/**
 * The five case studies D-38 locks, in the order the contact sheet indexes them.
 *
 * THIS LIVES HERE RATHER THAN IN THE ROUTE, FOR TWO REASONS AND ONE ACCIDENT.
 *
 * The reason: an id that is a route AND an artefact belongs with the artefacts,
 * so `/work/{id}` and `X-case-{id}` cannot drift apart. The assertion under
 * CANONICAL_IDS makes that mechanical rather than a convention.
 *
 * The other reason: `id` is the URL segment, `project` keys into
 * `00-COPY/one-liners.md` (canonical for the one-liner and the D-45 badge) and
 * `title` is the canonical project title from `resume.json`. Three names for one
 * project, agreeing by assertion at render rather than by everyone remembering.
 *
 * The accident, recorded because it costs an hour to rediscover: Astro HOISTS
 * `export function getStaticPaths` above the rest of a route's frontmatter, so a
 * `const` declared in that frontmatter is in the temporal dead zone when
 * `getStaticPaths` runs. The route's first draft held this array locally and the
 * build failed with "STUDIES is not defined" — pointing at Astro's own
 * route-cache, which is nowhere near the mistake. Importing the array sidesteps
 * the hoist entirely.
 */
export const CASE_STUDIES = Object.freeze([
	Object.freeze({ id: "design-system", project: "design-system", title: "Design System" }),
	Object.freeze({ id: "cairn", project: "cairn", title: "Cairn" }),
	Object.freeze({ id: "hued", project: "hued", title: "hued" }),
	Object.freeze({ id: "momentum", project: "momentum", title: "Momentum" }),
	Object.freeze({ id: "timeshift", project: "timeshift", title: "TimeShift" }),
]);

/**
 * The seven admin routes, in D-05 order with D-24's implied seventh last but
 * one. The id is the `S-` artefact's suffix, so `S-${id}` is always the
 * populated-screen artefact for that route.
 */
export const CANONICAL_SCREENS = Object.freeze([
	"dashboard",
	"home",
	"photos",
	"resume",
	"projects",
	"project-detail",
	"site",
]);

/**
 * The SIX states D-03 names, and only those six.
 *
 * `populated` IS DELIBERATELY NOT HERE, and the reason is arithmetic rather
 * than taste. UI-SPEC specifies a 7 x 6 = 42-cell coverage table in which
 * `populated` is the ROW — it is the screen itself, carried by the `S-`
 * artefact — and the six below are the CELLS. Adding `populated` to this array
 * makes the product 49 and silently breaks the stated contract, while every
 * screen would still render and every check that only counts non-blank cells
 * would still pass. Screens therefore export a STATES array with SEVEN entries
 * (`populated` plus these six); the matrix is built from these six.
 */
export const CANONICAL_STATES = Object.freeze([
	"empty",
	"loading",
	"error",
	"dirty",
	"conflict",
	"success",
]);

/**
 * Every artefact id in the phase.
 *
 * The first forty are the verbatim contract from UI-SPEC and ADMIN-IA. The two
 * at the end are ADDITIONS made by plan 09 when it built the public sketches —
 * they are in neither document's list, and they are recorded here as adds so
 * the "may add, may not rename" rule is visible rather than implied.
 *
 * CANONICAL_IDS.length IS NOT A CELL COUNT. It was 42 for most of this phase,
 * which is also the number of cells in the coverage table, and the two numbers
 * had nothing to do with each other — a coincidence load-bearing enough to be
 * worth a paragraph. Plan 00-20 broke the coincidence by taking the list to 45
 * (two tier ids out, five study ids in) and the cell count did not move, which
 * is the demonstration this paragraph was written to make. Anything that needs
 * the cell count must compute CANONICAL_SCREENS.length * CANONICAL_STATES.length.
 *
 * Verified when the list changed: every use of CANONICAL_IDS is either a
 * membership test (`coverage.mjs`, twice) or a printed total
 * (`check-coverage.mjs:166`). Nothing derives a shape from its length.
 */
export const CANONICAL_IDS = Object.freeze([
	// Screens — S- (7). One per route, populated, desktop.
	"S-dashboard",
	"S-home",
	"S-photos",
	"S-resume",
	"S-projects",
	"S-project-detail",
	"S-site",

	// Empty — E- (5). `empty` is the only genuinely per-screen state.
	"E-dashboard",
	"E-photos",
	"E-projects",
	"E-resume-section",
	"E-category-filtered",

	// Treatments — T- (8). Each sketched ONCE on its most demanding host.
	"T-loading-shell",
	"T-loading-list",
	"T-dirty-badge",
	"T-ready-badge",
	"T-error-inline",
	"T-error-publish",
	"T-error-network",
	"T-success-published",

	// Overlays — O- (9). Modals, sheets, dialogs and the D-15 strip.
	"O-publish-valid",
	"O-publish-invalid",
	"O-discard-screen",
	"O-discard-all",
	"O-conflict-diff",
	"O-reauth-401",
	"O-category-reassign",
	"O-pipeline-strip",
	"O-phone-sidebar",

	// Phone — P- (4). The four capabilities D-09 permits.
	"P-dashboard",
	"P-text-edit",
	"P-photo-reorder",
	"P-publish",

	// Refusals — R- (2). The two designed "open on desktop" states.
	"R-crop-picker",
	"R-case-study-authoring",

	// Public — X- (8).
	//
	// X-case-long and X-case-short WERE here and are gone. They were the two
	// D-39 tiers, rendered as two stacked routes carrying two and three studies
	// each. 00-RESPONSIVE-CONTRACT.md §7 supersedes D-39 — one tier, one
	// template — and R-3 puts one route per study at /work/{id}. One study, one
	// route, one artefact: five ids where there were two.
	//
	// This IS a rename in the sense the header forbids, and it is deliberate
	// rather than accidental. The rule exists so that findings and review
	// comments citing an id survive this directory's deletion. X-case-long and
	// X-case-short are cited in 00-PUBLIC-DESIGN-NOTES.md and in plan 00-10's
	// SUMMARY, and those citations are still true about what those artefacts
	// were — they are records of a design that was superseded, not dangling
	// pointers to one that was renamed. The five below are new artefacts, not
	// new names for the old two, because there is no id that means "the long
	// tier" any more.
	"X-work",
	"X-photos",
	"X-case-design-system",
	"X-case-cairn",
	"X-case-hued",
	"X-case-momentum",
	"X-case-timeshift",
	"X-contact-sheet",

	// ── ADDED BY PLAN 09, not present in either document's canonical list ──
	// X-work-recolour splits the ivory-to-charcoal recolour from D-44/D-45's
	// restructure, per UI-SPEC Ivory rule 9's attributability argument.
	"X-work-recolour",
	// X-home-act2 is UI-SPEC's OQ-1 — Home's Act-2 grid holds four projects and
	// D-38 locks five. UI-SPEC recorded that it had no Phase 0 owner; plan 09
	// gave it one rather than leaving it implicit.
	"X-home-act2",

	// ── ADDED BY PLAN 00-22 ────────────────────────────────────────────────
	// X-home is the two-state landing 00-RESPONSIVE-CONTRACT §5 specifies and
	// the user asked for in as many words. It is a SEPARATE artefact from
	// X-home-act2, and both are captured: X-home-act2 is the OQ-1 grid decision
	// judged at the fold inside its own framing, X-home is the whole landing
	// with the real Act 1 and the transition. They now share ONE Act-2
	// component, so the composition cannot be approved in one screenshot and
	// quietly differ in the other — which is the reason to keep two artefacts
	// rather than collapsing them.
	"X-home",
]);

// ── The one place CASE_STUDIES and CANONICAL_IDS are reconciled ─────────────
//
// CANONICAL_IDS stays TRANSCRIBED rather than derived, per this file's own
// doctrine — deriving the five `X-case-*` entries from CASE_STUDIES would make
// the list agree with itself by construction and stop it being a transcription of
// anything. So they are written twice and checked once, here, at import time.
//
// Which means a study added to CASE_STUDIES without an id, or an id left behind
// after a study is removed, fails every build and every check script that imports
// this module — including check-coverage.mjs, which still runs when the build
// itself cannot complete. A dangling id is otherwise silent: it produces a
// screenshot set with a design missing from it, and nothing anywhere says so.
{
	const expected = CASE_STUDIES.map((s) => `X-case-${s.id}`);
	const present = CANONICAL_IDS.filter((id) => id.startsWith("X-case-"));
	const missing = expected.filter((id) => !present.includes(id));
	const extra = present.filter((id) => !expected.includes(id));
	if (missing.length > 0 || extra.length > 0) {
		throw new Error(
			"artefacts.mjs: CASE_STUDIES and CANONICAL_IDS disagree.\n" +
				(missing.length ? `  in CASE_STUDIES, missing an id: ${missing.join(", ")}\n` : "") +
				(extra.length ? `  an X-case-* id with no study: ${extra.join(", ")}\n` : "") +
				"  One study, one route at /work/{id}, one artefact id. Add or remove in both places.",
		);
	}
}
