// shoot.mjs — THE SCREENSHOT RECORD. The artefacts outlive the code.
//
// Run AFTER `npx astro build`:
//     rm -rf node_modules/.vite dist && npx astro build && node shoot.mjs
//
// ═══ WHAT THIS IS FOR ══════════════════════════════════════════════════════
// D-02 makes `.playground/` throwaway and names a Phase 0 exit task that
// DELETES it as a mandatory scope fence. The directory is gitignored on purpose,
// so nothing in it is recoverable from git history — which means that after the
// exit task runs, this record is ALL THAT SURVIVES of the phase's design work.
// A finding that cites an artefact, a review comment, a Phase 7 reference: each
// has to resolve to a file in
// `.planning/phases/00-design-ideation/screenshots/` or it resolves to nothing.
//
// So the bar here is not "produce some images". It is: every canonical artefact
// is photographed, in the mode that shows its defects, at the device classes
// where its defects live, with its real fonts and its real photographs loaded,
// and NO FILE claims to be something it is not.
//
// ═══ THE POLICY IS A DOCUMENT, NOT A GUESS ═════════════════════════════════
// `00-SCREENSHOT-CONTRACT.md` (plan 00-25) owns the capture policy and plan
// 00-17's `<capture_policy_precedence>` block says the contract wins wherever
// 00-17's older two-viewport prose disagrees. Every asymmetry below is that
// document's §2 and §8, and the reason for each is recorded there rather than
// re-argued here. Six device classes, not two. `min_files` 80, derived total 88.
//
// ═══ THE ONE RULE THAT MATTERS MOST (contract §7) ══════════════════════════
//   The capture list is built from CANONICAL_IDS plus each route's own
//   declarations. It is NEVER a hand-listed URL set.
//
// A hand-listed URL set silently omits whatever was added last, and whatever was
// added last is always the least-reviewed thing in the set. In this phase that
// would have been `X-home` — the two-state landing, built in plan 00-22, three
// plans before this capture runs. An omission there is not a missing file; it is
// the newest design decision in the phase going unphotographed on the one day
// the playground still exists.
//
// Concretely, every route below is DERIVED:
//   · S- E- T- O- P- R- : from the coverage matrix's own `hosts` map — the union
//     of every `designed` cell and every ARTEFACT / ARTEFACTS export — read
//     through src/lib/declarations.mjs, the same reader check-coverage.mjs uses.
//   · /admin/projects/[id]/ : resolved from that route's own `export const
//     PINNED`, so the concrete URL is the one the route itself names.
//   · the 8 ids with no coverage cell : from `data-artefact="<id>"` in the BUILT
//     HTML — the DOM declaring which artefact it hosts. Where that appears twice
//     (T-error-network is restated on the overlays index) the restatement carries
//     `data-claimed-at="<route>"`, which names the canonical host, so the
//     ambiguity is resolved by the markup rather than by a tie-break I invented.
//   · X-case-* : from CASE_STUDIES, which artefacts.mjs already reconciles
//     against CANONICAL_IDS at import time.
//   · the remaining X- : `X-{slug}` → `/{slug}/`, plus the contact sheet at `/`.
//
// AND EVERY DERIVED ROUTE IS CHECKED AGAINST THE BUILT ROUTE SET before the
// browser starts. A derivation that guessed wrong fails by name here instead of
// producing a 404 page under an artefact's filename.
//
// ═══ FAIL LOUD, ALWAYS ═════════════════════════════════════════════════════
// Plan 01's convention, and it is load-bearing for this script specifically:
// this is the last chance to record anything at all. If any member of
// CANONICAL_IDS produced no file, this exits non-zero AND NAMES THE ID. It never
// warns and exits 0.
//
// ═══ THE THREE THINGS A PASSING FILE COUNT DOES NOT PROVE ══════════════════
// Four defects in this phase shipped source that read correctly while proving
// nothing. The capture equivalents, each checked here:
//
//   1. A file that is BLANK or under-loaded. /photos carries 39 photographs, 35
//      of them `loading="lazy"`. A capture taken on `networkidle` alone records
//      35 empty frames and passes every count. So lazy images are forced eager
//      and every `document.images` entry is awaited before the shutter.
//   2. A file in the WRONG MODE. Asserted per artefact rather than trusted from
//      the page: `data-brand` must be `charcoal`, `.dark` must be present for
//      public and ABSENT for admin, and `--page-bg` must resolve to the value
//      theme-charcoal.css declares for that mode — parsed out of the stylesheet,
//      with its var() alias resolved, so the check cannot drift from the theme.
//      The two expected values are also asserted to DIFFER, because an assertion
//      that would pass in either mode is not an assertion.
//   3. Two files that are BYTE-IDENTICAL under different names. This is the
//      failure the contract's §9 was written about, and it is not hypothetical:
//      `X-home`'s two states live at ONE URL, so a full-page capture renders the
//      whole ~1058px document identically at both scroll positions and twelve
//      files would claim a two-state design had been photographed. Every output
//      is hashed and a collision fails by filename pair.
//
// ═══ TWO DOCUMENTED EXCEPTIONS TO FULL-PAGE CAPTURE ════════════════════════
// Everything is full-page — the 39-photo grid, the 11-bullet résumé entry, the
// conflict diff are all taller than 900px and a clipped capture would record the
// top of the screen the review passes are about. Two exceptions:
//
//   1. X-home (contract §9). THE VIEWPORT IS THE ARTEFACT. State A is
//      `calc(100svh - var(--hm-above))` under a constant 131px of chrome, so
//      state B's top sits at exactly `100svh` and one viewport of scroll lands on
//      it. Captured as two VIEWPORT shots at scroll 0 and scroll innerHeight.
//   2. A CO-TENANT id — two canonical ids resolving to the same route at the
//      same device class. `/admin/dirty/` hosts both T-dirty-badge (its
//      `designed` cell) and T-ready-badge (declared only in the DOM). A
//      full-page capture for both would write two byte-identical files under two
//      artefact names — a record whose filenames claim more than its pixels
//      contain. The route's OWNER (the id the coverage matrix hosts there) keeps
//      the full-page capture; each co-tenant is captured as the element that
//      declares it, `[data-artefact="<id>"]`, because on a shared route the
//      element is the artefact and the DOM is what says so.
//
// Plan 00-17's assertion is "at least one capture is taller than 900px, proving
// full-page rather than viewport-clipped capture". It is checked at the end and
// satisfied by the tall admin artefacts, so neither exception weakens it.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { join, relative } from "node:path";
import { chromium } from "playwright";

import { CANONICAL_IDS, CASE_STUDIES } from "./src/lib/artefacts.mjs";
import { buildMatrix } from "./src/lib/coverage.mjs";
import { loadStudy } from "./src/lib/copy.mjs";
import { PLAYGROUND, extractString, readAdminModules } from "./src/lib/declarations.mjs";

const DIST = join(PLAYGROUND, "dist");
const THEME = join(PLAYGROUND, "src", "styles", "theme-charcoal.css");
const SHOTS = join(PLAYGROUND, "..", ".planning", "phases", "00-design-ideation", "screenshots");
const ASTRO_BIN = join(PLAYGROUND, "node_modules", "astro", "bin", "astro.mjs");
const READY_TIMEOUT_MS = 120_000;

/** Nothing smaller than this can be a rendered page. Catches a blank PNG. */
const MIN_PNG_BYTES = 3_000;

// ── §1 The six canonical capture sizes ──────────────────────────────────────
// The viewport token in a filename is THE WIDTH ALONE; the height is fixed by
// this table, so `-841.png` always means 841 x 768 and never anything else.
// That is what keeps the token enumerable and the filename regex closed.
//
// 841 x 768 is the most demanding capture in the matrix, and not because it sits
// in the middle: class 3 is the only class whose aspect band CONTAINS 1.0 and
// the only one that can cross it without a navigation. 1.095 is deliberately
// just above 1.0, so a layout that branches on aspect ratio flips inside this
// one capture rather than between two of them.
const CLASSES = Object.freeze([
	{ token: "344", w: 344, h: 882, pointer: "coarse", name: "foldable folded" },
	{ token: "390", w: 390, h: 844, pointer: "coarse", name: "phone portrait" },
	{ token: "768", w: 768, h: 1024, pointer: "coarse", name: "tablet portrait" },
	{ token: "841", w: 841, h: 768, pointer: "coarse", name: "foldable unfolded" },
	{ token: "1024", w: 1024, h: 768, pointer: "ambiguous", name: "tablet landscape" },
	{ token: "1440", w: 1440, h: 900, pointer: "fine", name: "laptop / desktop" },
]);
const CLASS_BY_TOKEN = new Map(CLASSES.map((c) => [c.token, c]));
const ALL_SIX = CLASSES.map((c) => c.token);

/** The grammar, and it is the assertion. Contract §3. */
const NAME_RE = /^00-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(344|390|768|841|1024|1440)\.png$/;

const fail = (msg) => {
	throw new Error(msg);
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. THE EXPECTED THEME VALUES, PARSED OUT OF THE STYLESHEET
// ═══════════════════════════════════════════════════════════════════════════
// Copied in shape from probe.mjs (itself from check-theme-exhaustive.mjs, itself
// from the design system's own tokens.test.ts) so all four share one parse and
// one failure mode. Token blocks are flat, so the next `}` at column 0 closes
// the block — which is why theme-charcoal.css calls its own formatting
// load-bearing.

function cssBlock(source, selector) {
	const start = source.indexOf(selector);
	if (start === -1) fail(`shoot: selector not found in theme-charcoal.css: ${selector}`);
	const open = source.indexOf("{", start);
	const close = source.indexOf("\n}", open);
	if (close === -1) fail(`shoot: unterminated block for selector: ${selector}`);
	return source.slice(open, close);
}

function declarations(blockSource) {
	const stripped = blockSource.replace(/\/\*[\s\S]*?\*\//g, "");
	const out = new Map();
	for (const m of stripped.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
		out.set(m[1], m[2].trim());
	}
	return out;
}

function resolveAlias(map, value, seen = new Set()) {
	const m = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);
	if (!m) return value;
	if (seen.has(m[1])) fail(`shoot: circular var() alias at ${m[1]}`);
	seen.add(m[1]);
	const next = map.get(m[1]);
	if (next === undefined) fail(`shoot: alias ${value} points at an undeclared token`);
	return resolveAlias(map, next, seen);
}

const themeSrc = readFileSync(THEME, "utf8");
const EXPECTED_PAGE_BG = {
	light: (() => {
		const m = declarations(cssBlock(themeSrc, ':root[data-brand="charcoal"] {'));
		return resolveAlias(m, m.get("--page-bg")).toLowerCase();
	})(),
	dark: (() => {
		const m = declarations(cssBlock(themeSrc, ':root[data-brand="charcoal"].dark {'));
		return resolveAlias(m, m.get("--page-bg")).toLowerCase();
	})(),
};

// An assertion that would pass in either mode is not an assertion. If the two
// modes ever declare the same page background, the mode check below becomes
// decorative and must be replaced rather than silently kept.
if (EXPECTED_PAGE_BG.light === EXPECTED_PAGE_BG.dark) {
	fail(
		"shoot: theme-charcoal.css declares the same --page-bg in light and dark " +
			`(${EXPECTED_PAGE_BG.light}). The per-artefact mode assertion could not then tell the two ` +
			"apart, so it would pass on a page that had lost its `dark` class. Fix the theme or " +
			"replace the assertion with a token that does differ — do not keep a check that cannot fail.",
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. THE ROUTE FOR EVERY CANONICAL ID — DERIVED, NEVER LISTED
// ═══════════════════════════════════════════════════════════════════════════

const { modules, frontmatters } = readAdminModules();
const matrix = buildMatrix(modules);

/** Every `export const PINNED` any admin route declares, for `[param]` routes. */
const PINNED = new Map();
for (const [rel, fm] of Object.entries(frontmatters)) {
	const p = extractString(fm, "PINNED");
	if (p !== undefined) PINNED.set(rel, p);
}

/** The built route set, plus which routes' DOM declares which artefact. */
const builtRoutes = new Set();
const declaredAt = new Map(); // id -> Set<route>
const claimedAt = new Map(); // id -> route named by data-claimed-at
if (!existsSync(DIST)) {
	fail(
		`shoot: ${relative(PLAYGROUND, DIST)} does not exist. Run \`npx astro build\` first — the ` +
			"route set and the id → route mapping are both read out of the built HTML, so without it " +
			"this script could only guess at URLs, which is the one thing contract §7 forbids.",
	);
}
for (const f of walkHtml(DIST)) {
	const route = "/" + relative(DIST, f).replace(/index\.html$/, "");
	builtRoutes.add(route);
	const html = readFileSync(f, "utf8");
	for (const m of html.matchAll(/data-artefact="([^"]+)"(?:\s+data-claimed-at="([^"]+)")?/g)) {
		const [, id, at] = m;
		if (!declaredAt.has(id)) declaredAt.set(id, new Set());
		declaredAt.get(id).add(route);
		if (at) claimedAt.set(id, at);
	}
}

/** `walk` only takes .astro; the built tree is .html. Same shape, one line. */
function walkHtml(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walkHtml(p));
		else if (name === "index.html") out.push(p);
	}
	return out.sort();
}

/** `/admin/projects/[id]/` → the route's own PINNED value. */
function substitutePinned(route) {
	const r = route.endsWith("/") ? route : `${route}/`;
	const m = /\[([a-z]+)\]/.exec(r);
	if (!m) return r;
	const values = [...new Set(PINNED.values())];
	if (values.length !== 1) {
		fail(
			`shoot: ${r} carries the dynamic segment ${m[0]} and ${values.length} distinct PINNED ` +
				"values were found across the admin routes " +
				`(${values.join(", ") || "none"}). The concrete URL cannot be resolved from the route's ` +
				"own declaration, and guessing one would screenshot a record nobody pinned.",
		);
	}
	return r.replace(m[0], values[0]);
}

const CASE_ID_TO_SLUG = new Map(CASE_STUDIES.map((s) => [`X-case-${s.id}`, s.id]));

/** The whole derivation, one id at a time, with how it was derived recorded. */
function resolveRoute(id) {
	if (id.startsWith("X-")) {
		// The contact sheet is review chrome served at the site root; it has no
		// slug of its own, which is why it is the one X- id with a stated route.
		if (id === "X-contact-sheet") return { route: "/", how: "site root (contact sheet)" };
		if (CASE_ID_TO_SLUG.has(id)) {
			return { route: `/work/${CASE_ID_TO_SLUG.get(id)}/`, how: "CASE_STUDIES → /work/{id}/" };
		}
		return { route: `/${id.slice(2)}/`, how: "X-{slug} → /{slug}/" };
	}

	const hosted = matrix.hosts.get(id);
	if (hosted) return { route: substitutePinned(hosted), how: "coverage hosts", owner: true };

	// A restatement names its canonical host explicitly, so the markup resolves
	// the ambiguity rather than a tie-break rule invented here.
	if (claimedAt.has(id)) return { route: claimedAt.get(id), how: "data-claimed-at" };

	const seen = declaredAt.get(id);
	if (!seen || seen.size === 0) {
		fail(
			`shoot: ${id} IS UNCAPTURED. It is a member of CANONICAL_IDS, no coverage cell hosts it, ` +
				'and no built page carries `data-artefact="' +
				id +
				'"`.\n' +
				"      An id in the registry with nothing to photograph means either the artefact was " +
				"never built, or it was built without declaring itself. Either way this is the last day " +
				"the playground exists, so it is a failure and not a warning.",
		);
	}
	if (seen.size > 1) {
		fail(
			`shoot: ${id} is AMBIGUOUS — declared on ${seen.size} routes (${[...seen].join(", ")}) ` +
				"with no `data-claimed-at` naming the canonical one.\n" +
				"      Picking one here would be a hand-listed URL wearing a derivation's clothes. Add " +
				"`data-claimed-at=\"<route>\"` to the restatement, as /admin/overlays/error-network/ does.",
		);
	}
	return { route: [...seen][0], how: "data-artefact (unique)" };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. THE PER-CLASS CAPTURE POLICY — CONTRACT §2, §4 AND §8
// ═══════════════════════════════════════════════════════════════════════════
// This is policy, and policy cannot be derived from code — but it can be
// expressed as RULES OVER THE DERIVED LIST rather than as a list of its own, and
// then every id is checked to have matched a rule. That is the difference
// between a policy and a hand-list: add an artefact and it gets captured; add an
// artefact nobody wrote a rule for and this fails by name.

// The bracket on the length measure, SELECTED BY MEASUREMENT rather than by
// memory of the retired tiers. Contract §8: after plan 00-18's compression the
// five studies measure 597 / 692 / 619 / 682 / 647 words, and `design-system` —
// a former LONG-tier study that compressed ~60% — is now the SHORTEST. Anyone
// choosing the pair from memory of the tiers picks the wrong pair, so the pair is
// re-derived here from the same loader the routes render through.
const studyWords = CASE_STUDIES.map((s) => ({ id: s.id, words: loadStudy(`case-${s.id}`).counts.bandWords }));
const longest = studyWords.reduce((a, b) => (b.words > a.words ? b : a));
const shortest = studyWords.reduce((a, b) => (b.words < a.words ? b : a));
if (longest.id === shortest.id) {
	fail("shoot: the case-study bracket collapsed to one study — the five drafts all measure the same.");
}
const BRACKET = new Set([`X-case-${longest.id}`, `X-case-${shortest.id}`]);

/**
 * What to capture for one id: the device classes, the mode, the density, and the
 * state slot(s) in the filename. Returns null when no rule matched, which is a
 * failure the caller names.
 */
function policyFor(id) {
	const cls = id[0];

	// Admin desktop, 29 artefacts, 1440 only. Density resolves by POINTER TYPE
	// and pointer has TWO values, not six — `compact` is photographed at 1440
	// (fine) and `comfortable` at 390 and 344 (coarse), so both ends of a
	// two-valued axis are already on the record. Six classes x 29 artefacts
	// would be 174 files measuring a distinction that does not exist.
	if (cls === "S" || cls === "E" || cls === "T" || cls === "O") {
		return { classes: ["1440"], mode: "light", density: "compact", states: ["populated"] };
	}

	// Admin phone, 6 artefacts, 390 + 344. 344 is the class that actually breaks
	// a phone layout; 390 alone has never broken anything. `comfortable`,
	// because compact's 30px controls sit under the 44px touch floor D-09
	// implies.
	if (cls === "P" || cls === "R") {
		return { classes: ["390", "344"], mode: "light", density: "comfortable", states: ["populated"] };
	}

	if (cls === "X") {
		const mode = "dark";
		// The two-state landing. The transition IS the artefact: one state is not
		// evidence of a two-state design. Contract §9 fixes the state slots here
		// so they are stable rather than invented per run.
		if (id === "X-home") {
			return { classes: ALL_SIX, mode, density: null, states: ["state-a", "state-b"], viewportOnly: true };
		}
		// Where responsive is the hard requirement and the audience is on unknown
		// hardware.
		if (id === "X-work" || id === "X-work-recolour" || id === "X-photos") {
			return { classes: ALL_SIX, mode, density: null, states: ["populated"] };
		}
		// Two studies bracket the measure; five studies x six classes would be 30
		// files photographing one template.
		if (BRACKET.has(id)) return { classes: ALL_SIX, mode, density: null, states: ["populated"] };
		// The other three studies: one capture each, as proof the template
		// rendered their content at all. X-home-act2: the same Act-2 composition
		// X-home already carries at six classes, through ONE SHARED COMPONENT.
		// X-contact-sheet: review chrome, not a design.
		if (CASE_ID_TO_SLUG.has(id) || id === "X-home-act2" || id === "X-contact-sheet") {
			return { classes: ["1440"], mode, density: null, states: ["populated"] };
		}
	}

	return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. BUILD THE CAPTURE PLAN AND CHECK IT BEFORE THE BROWSER STARTS
// ═══════════════════════════════════════════════════════════════════════════

const plan = [];
for (const id of CANONICAL_IDS) {
	const { route, how, owner } = resolveRoute(id);
	if (!builtRoutes.has(route)) {
		fail(
			`shoot: ${id} resolved to ${route} (via ${how}) and THE BUILD DOES NOT EMIT THAT ROUTE.\n` +
				"      A derivation that guessed wrong would otherwise photograph a 404 page under an " +
				"artefact's filename. Either the artefact moved or the derivation is stale.",
		);
	}
	const policy = policyFor(id);
	if (!policy) {
		fail(
			`shoot: ${id} matched NO CAPTURE RULE, so it would be silently left out of the record.\n` +
				"      Every id needs a per-class policy from 00-SCREENSHOT-CONTRACT.md §2 and §8. A new " +
				"artefact class needs a rule here; a new id inside an existing class needs nothing.",
		);
	}
	for (const token of policy.classes) {
		for (const state of policy.states) {
			plan.push({
				id,
				route,
				how,
				owner: Boolean(owner),
				token,
				klass: CLASS_BY_TOKEN.get(token),
				mode: policy.mode,
				density: policy.density,
				state,
				viewportOnly: Boolean(policy.viewportOnly),
				file: `00-${id}-${state}-${policy.mode}-${token}.png`,
			});
		}
	}
}

// ── Filenames must satisfy the grammar BEFORE anything is written ───────────
// Cheaper to catch here than to discover as an unmatched file at the end, and it
// makes a malformed id (an uppercase letter, an underscore) fail with the id
// rather than with a mystery filename.
for (const c of plan) {
	if (!NAME_RE.test(c.file)) {
		fail(
			`shoot: the filename ${c.file} for ${c.id} does not match the contract grammar\n` +
				`      ${NAME_RE}\n` +
				"      Contract §3: `00-{class}-{id}-{state}-{mode}-{viewport}.png`.",
		);
	}
}

// ── Co-tenants: one full-page owner per (route, class, state) ──────────────
// See this file's header. Two ids on one route at one class cannot BOTH be
// full-page captures without writing two byte-identical files under two artefact
// names.
const groups = new Map();
for (const c of plan) {
	const key = `${c.route}|${c.token}|${c.state}`;
	if (!groups.has(key)) groups.set(key, []);
	groups.get(key).push(c);
}
const coTenants = [];
for (const [key, members] of groups) {
	if (members.length === 1) continue;
	const owners = members.filter((m) => m.owner);
	if (owners.length !== 1) {
		fail(
			`shoot: ${members.length} artefacts share ${key} and ${owners.length} of them is the ` +
				"route's coverage-declared owner.\n" +
				`      (${members.map((m) => m.id).join(", ")})\n` +
				"      Exactly one may hold the full-page capture; the rest are captured as the element " +
				"that declares them. With none or several owners there is no non-arbitrary choice, and " +
				"an arbitrary one would put a byte-identical file under an artefact's name.",
		);
	}
	for (const m of members) {
		if (m.owner) continue;
		m.element = `[data-artefact="${m.id}"]`;
		coTenants.push(m);
	}
}

// ── Duplicate filenames would silently overwrite one another ───────────────
{
	const seen = new Map();
	for (const c of plan) {
		if (seen.has(c.file)) {
			fail(
				`shoot: two captures would both be written to ${c.file} (${seen.get(c.file)} and ` +
					`${c.id}). The second would overwrite the first and the count would still look right.`,
			);
		}
		seen.set(c.file, c.id);
	}
}

// ── The readout of the plan, before a single pixel ─────────────────────────
const byClassPrefix = (prefix) => new Set(plan.filter((c) => c.id.startsWith(prefix)).map((c) => c.id)).size;
console.log(`shoot: ${CANONICAL_IDS.length} canonical ids → ${plan.length} captures`);
console.log(
	`  artefacts  S-${byClassPrefix("S-")} E-${byClassPrefix("E-")} T-${byClassPrefix("T-")} ` +
		`O-${byClassPrefix("O-")} P-${byClassPrefix("P-")} R-${byClassPrefix("R-")} X-${byClassPrefix("X-")}`,
);
console.log(
	`  classes    ${CLASSES.map((c) => `${c.token}:${plan.filter((p) => p.token === c.token).length}`).join("  ")}`,
);
console.log(
	`  bracket    longest ${longest.id} ${longest.words}w · shortest ${shortest.id} ${shortest.words}w ` +
		`(measured, not remembered)`,
);
if (coTenants.length > 0) {
	console.log(
		`  co-tenant  ${coTenants.map((c) => `${c.id} → element on ${c.route}`).join("; ")}`,
	);
}
console.log("");

// ═══════════════════════════════════════════════════════════════════════════
// 5. THE DEV SERVER
// ═══════════════════════════════════════════════════════════════════════════
// `astro dev`, not a static server: contract §10. `--ignore-lock` and
// `ASTRO_DEV_BACKGROUND` are both REQUIRED, not conveniences — see
// check-states.mjs's header for the full account. Astro 7 refuses to start a
// second dev server for a project and EXITS 0 doing so, which would read here as
// a successful start followed by a readiness timeout against an unbound port;
// and it force-enables background mode when it auto-detects an agent
// environment, which it then refuses to combine with `--ignore-lock`.

async function freePort() {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.on("error", reject);
		srv.listen(0, "127.0.0.1", () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
	});
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const log = [];

const child = spawn(
	process.execPath,
	[ASTRO_BIN, "dev", "--ignore-lock", "--port", String(port), "--host", "127.0.0.1"],
	{
		cwd: PLAYGROUND,
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, ASTRO_DEV_BACKGROUND: "1" },
	},
);
child.stdout.on("data", (d) => log.push(d.toString()));
child.stderr.on("data", (d) => log.push(d.toString()));

async function waitForReady() {
	const deadline = Date.now() + READY_TIMEOUT_MS;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${base}/`);
			if (res.ok) return;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	fail(
		`shoot: astro dev did not serve / within ${READY_TIMEOUT_MS / 1000}s.\n` +
			`Dev server output follows:\n${log.join("")}`,
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. CAPTURE
// ═══════════════════════════════════════════════════════════════════════════

let failed = false;
let browser = null;
// Counted so the toolbar removal is EVIDENCED rather than trusted. A removal that
// never finds anything is not a fix, it is a no-op that reads like one — the same
// "a control that does not bite is not a control" rule this phase applies to its
// negative controls. The final readout prints the total.
let chromeRemovedTotal = 0;

try {
	await waitForReady();

	// Stale PNGs are removed rather than left. A retired artefact's file would
	// otherwise survive in the record and keep the count passing while pointing
	// at a design that no longer exists — X-case-long and X-case-short are
	// exactly that case (contract §8 records them as retired).
	mkdirSync(SHOTS, { recursive: true });
	let removed = 0;
	for (const f of readdirSync(SHOTS)) {
		if (f.startsWith("00-") && f.endsWith(".png")) {
			rmSync(join(SHOTS, f));
			removed++;
		}
	}
	if (removed > 0) console.log(`shoot: removed ${removed} stale PNG(s) before capturing\n`);

	browser = await chromium.launch();

	// One context per device class, reused across every capture at that class:
	// a context carries the viewport and the pointer capability, and recreating
	// it per shot would re-pay the browser-context cost 88 times for no gain.
	for (const klass of CLASSES) {
		const shots = plan.filter((c) => c.token === klass.token);
		if (shots.length === 0) continue;

		const ctx = await browser.newContext({
			viewport: { width: klass.w, height: klass.h },
			// `hasTouch` is what makes `(pointer: coarse)` resolve, and density
			// resolves by pointer type (contract §2), so this is the mechanism the
			// density assertion below is actually testing.
			hasTouch: klass.pointer === "coarse",
			isMobile: false,
			// A capture is a still. An in-flight transition would make the same
			// artefact photograph differently on two runs, and `X-home`'s two
			// states are distinguished by scroll position, which is exactly what a
			// smooth-scroll animation would blur.
			reducedMotion: "reduce",
			deviceScaleFactor: 1,
		});
		const page = await ctx.newPage();

		for (const c of shots) {
			const url = `${base}${c.route}`;
			const res = await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
			if (!res || !res.ok()) {
				fail(
					`shoot: GET ${url} for ${c.id} returned HTTP ${res ? res.status() : "no response"}.\n` +
						"      The route is in the built output but the dev server does not serve it, so " +
						"plan 16 reviewed a set this capture cannot photograph.",
				);
			}

			// ── Settle: fonts, then images, then fonts again ────────────────
			// The three Fontsource families load as variable fonts with
			// `font-display: swap`, so a capture taken early records the fallback
			// stack and makes the typography review worthless. And 35 of /photos'
			// 39 photographs are `loading="lazy"`, which `networkidle` does not
			// wait for because they are never requested until they scroll in.
			const settle = await page.evaluate(async () => {
				// ── THE DEV TOOLBAR IS NOT PART OF THE DESIGN ────────────────
				// `astro dev` injects its own floating toolbar as a custom element,
				// and the first run of this script photographed it: a dark pill
				// sitting OVER the conflict diff's rows and over T-ready-badge's
				// "waiting for the next publish" copy. It is dev-server chrome. A
				// reviewer walking pass 4 or pass 5 would be looking at Astro's UI
				// where the artefact should be, and — worse — would have no way to
				// tell from the image that something had been hidden underneath.
				//
				// The contract mandates `astro dev` (§10) rather than a static
				// server, so the toolbar cannot be avoided by not starting it; it is
				// removed here instead, and its ABSENCE IS ASSERTED below rather
				// than assumed. Matching on the `astro-dev-` tag prefix rather than
				// one element name means a rename (it was `astro-dev-overlay`
				// before Astro 4) fails the assertion instead of silently
				// reappearing in the record.
				const chrome = [...document.querySelectorAll("*")].filter((el) =>
					el.tagName.toLowerCase().startsWith("astro-dev-"),
				);
				for (const el of chrome) el.remove();

				for (const img of document.querySelectorAll('img[loading="lazy"]')) {
					img.loading = "eager";
				}
				await Promise.all(
					[...document.images]
						.filter((i) => !i.complete)
						.map(
							(i) =>
								new Promise((r) => {
									i.addEventListener("load", r, { once: true });
									i.addEventListener("error", r, { once: true });
									setTimeout(r, 30_000);
								}),
						),
				);
				await document.fonts.ready;
				const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0);
				return {
					chromeRemoved: chrome.length,
					images: document.images.length,
					broken: broken.map((i) => i.currentSrc || i.src).slice(0, 3),
					brokenCount: broken.length,
					fonts: document.fonts.size,
					brand: document.documentElement.dataset.brand ?? null,
					dark: document.documentElement.classList.contains("dark"),
					density: document.documentElement.dataset.density ?? null,
					pageBg: getComputedStyle(document.documentElement)
						.getPropertyValue("--page-bg")
						.trim()
						.toLowerCase(),
				};
			});
			await page.waitForTimeout(250);

			// ── Assert the dev toolbar is GONE, not assume it ───────────────
			// Checked AFTER the settle wait, because the toolbar is injected by a
			// client script and could be re-inserted while fonts and images were
			// still loading. An assertion here is the difference between "it was
			// removed" and "it is not in the image".
			const devChrome = await page.evaluate(() =>
				[...document.querySelectorAll("*")]
					.filter((el) => el.tagName.toLowerCase().startsWith("astro-dev-"))
					.map((el) => el.tagName.toLowerCase()),
			);
			if (devChrome.length > 0) {
				fail(
					`shoot: ${c.id} at ${c.route} still carries the dev-server toolbar ` +
						`(${devChrome.join(", ")}) at capture time.\n` +
						"      It is injected after load and re-appeared after the settle wait, so it " +
						"would be photographed OVER the artefact — which is how the first run of this " +
						"script put a floating Astro pill across the conflict diff's rows. Dev chrome in " +
						"the record is indistinguishable from design once the playground is gone.",
				);
			}

			// ── Assert the MODE per artefact, not per page default ──────────
			// A page that lost its `data-brand` must FAIL the capture rather than
			// produce a quietly wrong PNG that the review then reasons about as if
			// it were the design.
			if (settle.brand !== "charcoal") {
				fail(
					`shoot: ${c.id} at ${c.route} has data-brand=${JSON.stringify(settle.brand)}, not ` +
						'"charcoal".\n' +
						"      Without it the page renders the design system's own neutral palette, and " +
						"every contrast judgement made from the screenshot would be about a theme that is " +
						"not this one.",
				);
			}
			const wantDark = c.mode === "dark";
			if (settle.dark !== wantDark) {
				fail(
					`shoot: ${c.id} must be captured in charcoal ${c.mode.toUpperCase()} and the page ` +
						`${settle.dark ? "HAS" : "DOES NOT HAVE"} the \`dark\` class.\n` +
						"      Every admin file carries -light-, every public file carries -dark-, with no " +
						"exception at any class. Capturing an admin artefact in dark mode is an " +
						"ANTI-PATTERN, not a preference: the light palette is where the DS-02 / DS-03 " +
						"contrast failures live, and dark hides them.",
				);
			}
			if (settle.pageBg !== EXPECTED_PAGE_BG[c.mode]) {
				fail(
					`shoot: ${c.id} resolved --page-bg to ${JSON.stringify(settle.pageBg)} and ` +
						`theme-charcoal.css declares ${EXPECTED_PAGE_BG[c.mode]} for ${c.mode}.\n` +
						"      The attributes are right and the cascade is not — the theme sheet did not " +
						"reach this page, or something later in the order overrode it. This is the D-02 " +
						"ordering hazard, measured; see probe.mjs.",
				);
			}
			// Density is admin-only. The public surfaces are `comfortable` at every
			// class and do not set the attribute, so `null` is expected there.
			if (c.density !== null) {
				// THE ONE EXCEPTION, AND IT IS AUTHORED RATHER THAN ACCIDENTAL:
				// O-phone-sidebar is an O- id (so contract §2 captures it at 1440)
				// whose host is a phone route, and Admin.astro authors phone routes
				// at `comfortable` because compact's 30px controls sit under the
				// 44px touch floor. The touch geometry is a property of the
				// artefact, not of the capture width, so the route's own authored
				// value is the correct expectation.
				const want = /(^|\/)phone(\/|$)/.test(c.route) ? "comfortable" : c.density;
				if (settle.density !== want) {
					fail(
						`shoot: ${c.id} at ${c.route} rendered data-density=` +
							`${JSON.stringify(settle.density)} and the contract wants ${want}.\n` +
							"      Density is asserted rather than trusted: a route that lost its `density` " +
							"prop would otherwise be photographed at the wrong control geometry and the " +
							"44px-floor judgement made from the image would be about the wrong page.",
					);
				}
			}
			if (settle.brokenCount > 0) {
				fail(
					`shoot: ${c.id} at ${c.route} has ${settle.brokenCount} image(s) that failed to ` +
						`load (${settle.broken.join(", ")}).\n` +
						"      A photography artefact photographed without its photographs is a file that " +
						"exists, passes every count, and evidences nothing.",
				);
			}

			// ── The shutter ────────────────────────────────────────────────
			const out = join(SHOTS, c.file);
			if (c.viewportOnly) {
				// Contract §9. State A occupies document y 131 → 100svh because its
				// height is `calc(100svh - var(--hm-above))` and the chrome above it
				// is a constant 131px, so state B's top sits at exactly 100svh and
				// one viewport of scroll lands the viewport top on it. THIS ONLY
				// WORKS BECAUSE STATE A IS THE BUDGET AND NOT A BARE 100svh — with
				// `100svh`, state A would end at `131 + 100svh` and one viewport of
				// scroll would leave a 131px band of state A's photographs on screen
				// while the CSS looked correct.
				const y = c.state === "state-a" ? 0 : klass.h;
				await page.evaluate((top) => window.scrollTo(0, top), y);
				await page.waitForTimeout(300);
				const at = await page.evaluate(() => Math.round(window.scrollY));
				if (Math.abs(at - y) > 2) {
					fail(
						`shoot: ${c.id} ${c.state} asked for scrollY ${y} and the document stopped at ` +
							`${at}.\n` +
							"      The page is shorter than two viewports at this class, so state B's top " +
							"is not reachable and the two captures would come out BYTE-IDENTICAL while " +
							"claiming a two-state design had been photographed. That is exactly the " +
							"failure 00-SCREENSHOT-CONTRACT.md §9 was written about.",
					);
				}
				await page.screenshot({ path: out, fullPage: false });
			} else if (c.element) {
				const el = page.locator(c.element);
				const n = await el.count();
				if (n !== 1) {
					fail(
						`shoot: ${c.id} is a co-tenant of ${c.route} and \`${c.element}\` matched ${n} ` +
							"elements, not 1.\n" +
							"      A co-tenant is captured as the element that declares it, because two " +
							"full-page captures of one route would be two byte-identical files under two " +
							"artefact names.",
					);
				}
				await el.screenshot({ path: out });
			} else {
				// Full-page everywhere else: several artefacts are taller than 900px
				// and a clipped capture would record the top of the screen the review
				// passes are about.
				await page.screenshot({ path: out, fullPage: true });
			}

			chromeRemovedTotal += settle.chromeRemoved;
			const bytes = statSync(out).size;
			console.log(
				`  ${c.token.padStart(4)}  ${c.id.padEnd(24)} ${c.state.padEnd(10)} ${c.mode.padEnd(5)} ` +
					`${String(Math.round(bytes / 1024)).padStart(5)} KB  ` +
					`${c.viewportOnly ? "viewport" : c.element ? "element " : "fullpage"}  ` +
					`${settle.images} img  ${c.route}`,
			);
		}

		await ctx.close();
	}
} catch (err) {
	failed = true;
	console.error("\n" + String(err.message ?? err));
} finally {
	// The listener is closed HERE so a thrown assertion cannot leave a dev server
	// bound to a port. T-00-17 accepts the local listener as a nuisance rather
	// than an exposure precisely because this block exists.
	if (browser) {
		try {
			await browser.close();
		} catch {
			/* already gone */
		}
	}
	child.kill("SIGTERM");
	await new Promise((r) => {
		if (child.exitCode !== null || child.signalCode !== null) return r();
		child.once("exit", r);
		setTimeout(() => {
			child.kill("SIGKILL");
			r();
		}, 5000);
	});
}

if (failed) process.exit(1);

// ═══════════════════════════════════════════════════════════════════════════
// 7. THE RECORD IS CHECKED AFTER IT IS WRITTEN
// ═══════════════════════════════════════════════════════════════════════════
// Everything above asserts what was captured. This asserts what is ON DISK,
// which is the only thing that survives the playground's deletion.

const problems = [];
const files = readdirSync(SHOTS).filter((f) => f.endsWith(".png")).sort();

// ── 1. Every canonical id produced at least one file ──────────────────────
// Name the id. "expected 88, got 87" tells the reader nothing they could act on.
{
	const written = new Set(files);
	for (const c of plan) {
		if (!written.has(c.file)) problems.push(`${c.id}: no file at ${c.file}`);
	}
	const uncaptured = CANONICAL_IDS.filter((id) => !plan.some((c) => c.id === id && written.has(c.file)));
	for (const id of uncaptured) problems.push(`${id}: UNCAPTURED — nothing in the record evidences it`);
}

// ── 2. The grammar, asserted as the ABSENCE of violators ──────────────────
// Contract §3: check for violators rather than counting matches. `grep -c`
// counts LINES, not matches, and this phase already had a control nearly report
// a false result that way.
for (const f of files) {
	if (!NAME_RE.test(f)) problems.push(`${f}: filename violates the contract grammar`);
}

// ── 3. No admin artefact in dark mode ────────────────────────────────────
for (const f of files) {
	if (/^00-[SETOPR]-/.test(f) && f.includes("-dark-")) {
		problems.push(`${f}: an admin artefact captured in DARK, which hides the light-palette failures`);
	}
}
// And the retired ids must not reappear: a file named 00-X-case-long-… would
// mean the capture list was hand-written and stale.
for (const f of files) {
	if (/^00-X-case-(long|short)-/.test(f)) {
		problems.push(`${f}: X-case-long / X-case-short are RETIRED (contract §8) and must not appear`);
	}
}

// ── 4. Nothing blank, nothing byte-identical ─────────────────────────────
const hashes = new Map();
let tallest = { file: null, h: 0 };
for (const f of files) {
	const buf = readFileSync(join(SHOTS, f));
	if (buf.length < MIN_PNG_BYTES) {
		problems.push(`${f}: only ${buf.length} bytes — too small to be a rendered page`);
	}
	// PNG IHDR: 8-byte signature, 4-byte length, 4-byte type, then width/height
	// as big-endian uint32 at offsets 16 and 20.
	if (buf.length > 24 && buf.readUInt32BE(1) === 0x504e470d) {
		const h = buf.readUInt32BE(20);
		if (h > tallest.h) tallest = { file: f, h };
	}
	const digest = createHash("sha256").update(buf).digest("hex");
	if (hashes.has(digest)) {
		problems.push(
			`${f} is BYTE-IDENTICAL to ${hashes.get(digest)} — two artefact names, one image, so one ` +
				"of them is unphotographed while the count says otherwise",
		);
	} else {
		hashes.set(digest, f);
	}
}

// ── 5. At least one capture is taller than 900px ─────────────────────────
if (tallest.h <= 900) {
	problems.push(
		`the tallest capture is ${tallest.h}px (${tallest.file}) — nothing exceeds the 900px viewport, ` +
			"so the captures are viewport-clipped rather than full-page and the review passes would be " +
			"reading the top of each screen only",
	);
}

// ── 6. The floor ────────────────────────────────────────────────────────
const FLOOR = 80;
if (files.length < FLOOR) {
	problems.push(`${files.length} PNG(s) on disk and the floor is ${FLOOR} (contract §5)`);
}

// ── The readout ─────────────────────────────────────────────────────────
console.log("");
const perClass = CLASSES.map(
	(c) => `${c.token}:${files.filter((f) => f.endsWith(`-${c.token}.png`)).length}`,
).join("  ");
const perPrefix = ["S", "E", "T", "O", "P", "R", "X"]
	.map((p) => `${p}-${files.filter((f) => f.startsWith(`00-${p}-`)).length}`)
	.join("  ");
console.log(`  files      ${files.length}  (floor ${FLOOR}, derived total 88)`);
console.log(`  by class   ${perClass}`);
console.log(`  by prefix  ${perPrefix}`);
console.log(`  modes      light:${files.filter((f) => f.includes("-light-")).length}  dark:${files.filter((f) => f.includes("-dark-")).length}`);
console.log(`  tallest    ${tallest.h}px  ${tallest.file}`);
console.log(`  distinct   ${hashes.size} of ${files.length} images are byte-unique`);
console.log(`  dev chrome ${chromeRemovedTotal} toolbar element(s) removed before the shutter (0 would mean the removal never bit)`);
console.log("");

if (problems.length > 0) {
	console.error(
		`shoot: FAILURE MODE — the screenshot record does not describe the artefacts. ` +
			`${problems.length} problem(s):\n`,
	);
	for (const p of problems) console.error(`  · ${p}`);
	console.error(
		"\nThis directory is deleted at phase exit and is gitignored, so nothing here is recoverable " +
			"from git history. A record that is wrong today is wrong forever.",
	);
	process.exit(1);
}

console.log(
	`PASS: ${files.length} PNG(s) for ${CANONICAL_IDS.length} canonical ids across ` +
		`${CLASSES.length} device classes — every id captured, every filename legal, every admin file ` +
		`light, every public file dark, no two images identical, tallest ${tallest.h}px.`,
);
