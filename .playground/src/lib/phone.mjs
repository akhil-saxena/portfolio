// phone.mjs — the D-09 phone contract, in one place.
//
// WHY A MODULE RATHER THAN FOUR COPIES. Exactly the argument artefacts.mjs's
// header makes about the canonical registry: four route files each carrying
// their own private copy of "the four capabilities and the two refusals" is
// four chances for one of them to drift, and a drifted copy still builds and
// still renders. D-09's whole design is that the permitted set is CLOSED — four
// things, not "roughly four" — so the set belongs in one importable place and
// the contact sheet's Part 3 reads the same array the screens do.
//
// THIS FILE IS AN ADDITION THE PLAN DOES NOT NAME, and it is recorded as such
// in the SUMMARY. Same shape of addition as plan 15's project-detail.json.
//
// THE NAV IS TRANSCRIBED FROM Admin.astro's DEFAULT_NAV, not re-derived. The
// sheet on P-dashboard renders the SAME AdminSidebar the desktop shell renders,
// so the entries have to be the same seven rows in the same D-05 order; the
// layout keeps its own copy because it is a layout default and this one exists
// because the sheet is composed outside the layout. If they diverge, the sheet
// is no longer the sidebar — which is the one claim O-phone-sidebar makes.

/** Per-entity D-13 state for the phone session — the dashboard's `dirty` set. */
export const phoneNav = Object.freeze({
	home: "draft",
	photos: "draft",
	resume: "ready",
	site: "ready",
});

/** The seven sidebar rows, in D-05 order with D-24's implied seventh nested. */
export const PHONE_NAV = Object.freeze([
	{ id: "dashboard", label: "Dashboard", monogram: "DB", href: "/admin/", state: "published" },
	{ id: "home", label: "Home", monogram: "HM", href: "/admin/home/", state: "draft" },
	{ id: "photos", label: "Photos", monogram: "PH", href: "/admin/photos/", state: "draft" },
	{ id: "resume", label: "Résumé", monogram: "RS", href: "/admin/resume/", state: "ready" },
	{ id: "projects", label: "Projects", monogram: "PJ", href: "/admin/projects/", state: "published" },
	{
		id: "project-detail",
		label: "Cairn",
		monogram: "PD",
		href: "/admin/projects/cairn/",
		child: true,
		state: "published",
	},
	{ id: "site", label: "Site", monogram: "ST", href: "/admin/site/", state: "ready" },
]);

/**
 * THE FOUR CAPABILITIES D-09 PERMITS. Verbatim from CONTEXT.md D-09: "on a
 * phone the sidebar collapses to a Sheet and you can review pending changes,
 * fix text, reorder photos and publish."
 *
 * Part 3 of the contact sheet is a SIX-ROW LIST — these four plus the two
 * refusals below — and not a 7x multiplier on the 42-cell matrix. That
 * reduction is what makes ~35 admin artefacts reviewable instead of ~108, and
 * it is only honest because the permitted set is closed.
 */
export const PHONE_ROUTES = Object.freeze([
	{
		id: "P-dashboard",
		route: "/admin/phone/dashboard",
		capability: "review pending changes",
		what: "Review pending changes — the grouped pending list at one column.",
	},
	{
		id: "P-text-edit",
		route: "/admin/phone/text-edit",
		capability: "fix text",
		what: "Fix text — one résumé bullet, edited at touch scale against its real length.",
	},
	{
		id: "P-photo-reorder",
		route: "/admin/phone/photo-reorder",
		capability: "reorder photos",
		what: "Reorder photos — the gallery order, with every target at or above 44px.",
	},
	{
		id: "P-publish",
		route: "/admin/phone/publish",
		capability: "publish",
		what: "Publish — the same confirm, the same list and the same counts as O-publish-valid.",
	},
]);

/**
 * THE TWO REFUSALS, both already sketched: R-crop-picker in plan 14 and
 * R-case-study-authoring in plan 15. Listed here so Part 3's six rows all
 * resolve to something a reviewer can open, and cross-linked from the phone
 * routes because D-09's design is as much about what a phone does not do.
 */
export const REFUSALS = Object.freeze([
	{
		id: "R-crop-picker",
		route: "/admin/home/phone",
		capability: "set a focal point",
		what: "Refused — dragging a marker inside a 3:2 frame does not work on a phone. Everything else on Home still does.",
	},
	{
		id: "R-case-study-authoring",
		route: "/admin/projects/cairn/phone",
		capability: "author a case study",
		what: "Refused — long-form editing on a phone loses more than it gains. The project's card fields stay editable.",
	},
]);
