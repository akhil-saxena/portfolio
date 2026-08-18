// check-states.mjs — the gate that proves `?state=` ACTUALLY VARIES THE RENDER.
//
// ═══ WHY THIS EXISTS ════════════════════════════════════════════════════════
// UI-SPEC's whole artefact reduction rests on one mechanism: seven admin route
// files cover forty-two coverage cells, because each route renders any of its
// declared states on demand rather than existing as one file per state. If
// `?state=` silently stops driving the render, every route collapses to its
// populated state and the ~35-artefact set collapses to seven — and NOTHING ELSE
// NOTICES. The build still succeeds. The pages still render. The coverage table
// still shows every cell filled, because the table is generated from the STATES
// arrays, which are declarations rather than observations. Screenshots would be
// taken of seven identical-looking screens under thirty-odd different filenames.
//
// So this is not a smoke test. It is the only thing standing between a declared
// coverage matrix and a fictional one.
//
// ═══ WHAT THIS SCRIPT DISPROVED ON ITS FIRST RUN ════════════════════════════
// Plan 00-12 and UI-SPEC both specify the state axis as
// `Astro.url.searchParams.get("state")`, on the premise that `astro build`
// evaluates search params at build time (where they are empty) while `astro dev`
// serves each request "with a real Astro.url". THE SECOND HALF IS FALSE. Read out
// of the installed astro@7.2.2:
//
//   core/request.js:20              `if (isPrerendered) url.search = "";`
//   vite-plugin-app/app.js:178      `isPrerendered: matchedRoute.routeData.prerender`
//
// Under `output: 'static'` every route is prerendered, so THE DEV SERVER STRIPS
// THE QUERY STRING TOO. The first run of this script returned seven byte-identical
// bodies. The escapes are `export const prerender = false` or an adapter, both
// forbidden by the D-02 fence.
//
// The axis is therefore a REST PARAM on one file per screen: `/admin/` is
// populated, `/admin/<state>/` is each of the six. This script was written to
// prove the mechanism rather than assume it, and that is precisely what it did.
//
// ═══ WHY IT STILL USES A DEV SERVER ═════════════════════════════════════════
// The states are now static, so `dist/` could be walked instead. The dev server
// is kept because it asserts the thing plans 16 and 17 actually do: reach each
// state OVER HTTP, at the URL a reviewer types and Playwright navigates. A
// `dist/` file walk would pass on a route the dev server 404s. Both are checked —
// assertion 4 walks `dist/` as well, so a divergence between the build and the
// dev server cannot hide.
//
// ═══ THE FOUR ASSERTIONS ════════════════════════════════════════════════════
//   1. Every state's URL returns HTTP 200. A 404 or a 500 on `/admin/conflict/`
//      is a state that does not exist.
//   2. `populated` differs from at least four of the six others. A weak
//      difference bar on purpose — two states legitimately converge on similar
//      shells — but strong enough that a constant render cannot pass.
//   3. Each state's MARKER appears in its own body and in NO other body. This is
//      the assertion with teeth. The markers live in
//      src/fixtures/dashboard.json, one per state, and each is a fragment of
//      that state's own AUTHORED COPY rather than a debug token — so a page
//      cannot satisfy the marker without rendering the state. Uniqueness is
//      checked in both directions, which is what catches a page that renders
//      every state at once (a legend, a tab strip, a debug dump) and would
//      otherwise pass assertion 3 while proving nothing.
//   4. Every state has a corresponding file under `dist/`. The build and the dev
//      server must agree about which states exist, or plan 17 screenshots a set
//      of routes plan 16 never reviewed.
//
// FAIL LOUD, ALWAYS. Following the convention the other scripts in this
// directory set: throw with the failure MODE named, never console.warn and exit
// 0. A soft warning here is worse than no check, because it would be a green
// tick beside a fictional matrix.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { CANONICAL_STATES } from "./src/lib/artefacts.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ASTRO_BIN = join(HERE, "node_modules", "astro", "bin", "astro.mjs");
const DIST = join(HERE, "dist");
const READY_TIMEOUT_MS = 90_000;

// ═══ ONE ENTRY PER SCREEN, ADDED WHEN THE SCREEN IS BUILT ═══════════════════
// Plan 12 wrote this script against a single route. Plan 13 generalised it
// rather than copying it, for the reason artefacts.mjs already gives about the
// registry: six route files each carrying their own private copy of the same
// assertions is six chances for one of them to drift into a weaker check while
// still exiting 0.
//
// The assertions are PER SCREEN, deliberately, and marker uniqueness is checked
// WITHIN a screen rather than across all of them. Two screens legitimately share
// copy — every admin route carries the same publish action and the same pipeline
// strip — so a global uniqueness rule would report a rendering fault for what is
// actually the shell doing its job.
//
// A screen with no entry here is NOT CHECKED AT ALL, which is the one failure
// mode this list can have. The readout prints the entry count so a missing
// screen shows up as a number that did not go up.
const SCREENS = [
	{ id: "dashboard", route: "/admin/", fixtures: "dashboard.json" },
	{ id: "photos", route: "/admin/photos/", fixtures: "photos.json" },
	{ id: "home", route: "/admin/home/", fixtures: "home.json" },
	{ id: "resume", route: "/admin/resume/", fixtures: "resume.json" },
	{ id: "projects", route: "/admin/projects/", fixtures: "projects.json" },
	// THE DETAIL SCREEN'S STATE AXIS IS PINNED TO ONE ID. A state is a property
	// of the SCREEN, not of the record, so /admin/projects/[id] emits its six
	// state routes for `cairn` only — the D-39 long-form study, and the id
	// Admin.astro's sidebar already points at. Emitting them for all five ids
	// would add thirty near-identical routes and thirty screenshots without
	// adding one piece of evidence. The other four ids exist at their base path.
	{ id: "project-detail", route: "/admin/projects/cairn/", fixtures: "project-detail.json" },
	{ id: "site", route: "/admin/site/", fixtures: "site.json" },
];

const READY_ROUTE = SCREENS[0].route;

/** `<route>` for the populated row, `<route><state>/` for each cell. */
const pathFor = (screen, s) => (s === "populated" ? screen.route : `${screen.route}${s}/`);

// The markers are fragments of AUTHORED COPY, and authored copy contains
// apostrophes and quotation marks. Astro escapes both on the way out — "what's"
// is emitted as `what&#x27;s` and `"deployed"` as `&quot;deployed&quot;` — so a
// naive substring match fails on exactly the two states whose contract copy is
// quoted verbatim in UI-SPEC. Decoding the five entities that can appear in
// escaped text is the right fix: rewriting the markers to dodge punctuation
// would mean asserting on copy nobody wrote.
const decode = (s) =>
	s
		.replaceAll("&#x27;", "'")
		.replaceAll("&#39;", "'")
		.replaceAll("&quot;", '"')
		.replaceAll("&#34;", '"')
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");
/** The built file each route emits. `/admin/` -> dist/admin/index.html. */
const distFor = (screen, s) => {
	const segs = screen.route.split("/").filter(Boolean);
	return s === "populated"
		? join(DIST, ...segs, "index.html")
		: join(DIST, ...segs, s, "index.html");
};

// `populated` is the row, the six are the cells — see src/lib/artefacts.mjs.
const STATES = ["populated", ...CANONICAL_STATES];

for (const screen of SCREENS) {
	const path = join(HERE, "src", "fixtures", screen.fixtures);
	const fixtures = JSON.parse(readFileSync(path, "utf8"));
	const markers = {};

	for (const s of STATES) {
		const fx = fixtures[s];
		if (!fx) {
			throw new Error(
				`check-states: src/fixtures/${screen.fixtures} has no "${s}" key. Every state in ` +
					"CANONICAL_STATES plus `populated` needs a fixture, or the state is declared in a " +
					"STATES array and rendered from the populated payload — which is the exact silent " +
					"collapse this script exists to catch.",
			);
		}
		if (typeof fx.marker !== "string" || fx.marker.length < 12) {
			throw new Error(
				`check-states: the "${screen.id}" screen's "${s}" fixture has no usable \`marker\`. ` +
					"The marker must be a fragment of that state's own rendered copy, long enough that " +
					"it cannot appear by accident. Without it, assertion 3 cannot run and the gate is " +
					"decorative.",
			);
		}
		markers[s] = fx.marker;
	}

	// Markers must be distinct from each other before any HTTP happens, otherwise
	// the cross-state uniqueness check below would report a rendering fault for
	// what is actually a fixture typo.
	for (const a of STATES) {
		for (const b of STATES) {
			if (a === b) continue;
			if (markers[a].includes(markers[b])) {
				throw new Error(
					`check-states: on "${screen.id}", the "${a}" marker contains the "${b}" marker, ` +
						"so cross-state uniqueness cannot be tested. Fix the fixture, not this script.",
				);
			}
		}
	}

	screen.markers = markers;
}

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

async function waitForReady(base, log) {
	const deadline = Date.now() + READY_TIMEOUT_MS;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${base}${READY_ROUTE}`);
			if (res.ok) return;
		} catch {
			// server not up yet
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(
		`check-states: astro dev did not serve ${READY_ROUTE} within ${READY_TIMEOUT_MS / 1000}s.\n` +
			`Dev server output follows:\n${log.join("")}`,
	);
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const log = [];

// `--ignore-lock` IS REQUIRED, NOT A CONVENIENCE, and the reason is worth
// recording because it will bite the next person. Astro 7 ships a background
// dev-server MANAGER with a lock file: `astro dev` detects an already-running
// dev server for the project and REFUSES TO START, printing
// "Dev server already running at http://localhost:4321" and exiting 0. Exiting
// zero is the dangerous part — a naive spawn here would look like a successful
// start, the readiness poll would then time out against a port nothing is bound
// to, and the failure would read as "the admin route is broken" rather than "no
// server was started".
//
// This directory is a single serial build resource and a dev server may already
// be open on it — plan 11 holds one for a blocking human review. `--ignore-lock`
// starts an instance without checking OR WRITING the lock file, so this script
// gets a private server on its own free port and the SIGTERM below cannot
// disturb the reviewer's.
//
// `ASTRO_DEV_BACKGROUND` IS THE SECOND HALF OF THE SAME PROBLEM. Astro 7 also
// AUTO-DETECTS an agentic environment (via `am-i-vibing`) and, when it finds one,
// forces background mode — which it then refuses to combine with
// `--ignore-lock`, throwing "cannot be used together with an auto-detected AI
// agent environment". The detection is written as
// `!process.env.ASTRO_DEV_BACKGROUND && isRunByAgent()`, so setting that
// variable is the supported way to say "this process IS the server" rather than
// "spawn one for me". Together the flag and the variable give a foreground,
// untracked, port-isolated instance. Recorded at this length because both
// halves fail in ways that read like a broken route rather than a missing server.
const child = spawn(
	process.execPath,
	[ASTRO_BIN, "dev", "--ignore-lock", "--port", String(port), "--host", "127.0.0.1"],
	{
		cwd: HERE,
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, ASTRO_DEV_BACKGROUND: "1" },
	},
);
child.stdout.on("data", (d) => log.push(d.toString()));
child.stderr.on("data", (d) => log.push(d.toString()));

let failed = false;

try {
	await waitForReady(base, log);

	console.log(`check-states: ${SCREENS.length} screen(s) on ${base}`);
	console.log("");

	let distChecked = 0;

	for (const screen of SCREENS) {
		const markers = screen.markers;

		// ── Assertion 1: every state is reachable ────────────────────────────
		const bodies = {};
		for (const s of STATES) {
			const url = `${base}${pathFor(screen, s)}`;
			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(
					`check-states: GET ${url} returned HTTP ${res.status}.\n` +
						"A state that does not answer is a state that does not exist, and the coverage " +
						"table would still declare it covered.\n" +
						"Check that getStaticPaths still returns `{ params: { state: undefined } }` plus " +
						"one entry per member of CANONICAL_STATES.\n" +
						"On a screen route it can ALSO mean the sibling `/admin/[...state]` swallowed " +
						"the path: a static segment must outrank a rest param, and if it stopped doing " +
						"so the dashboard would try to select a fixture named after this screen.",
				);
			}
			bodies[s] = await res.text();
		}

		// ── Assertion 2: populated differs from most of the others ───────────
		const differing = CANONICAL_STATES.filter((s) => bodies[s] !== bodies.populated);
		if (differing.length < 4) {
			throw new Error(
				`check-states: FAILURE MODE on "${screen.id}" — THE STATE AXIS IS NOT VARYING THE ` +
					"RENDER.\n\n" +
					`Only ${differing.length} of ${CANONICAL_STATES.length} states produced a body ` +
					`different from \`populated\` on ${screen.route} (at least 4 are required).\n\n` +
					"This is the silent collapse this script exists to catch. Every admin route would " +
					"still build, every page would still render, and the generated coverage table would " +
					"still show 42 filled cells — because the table is built from declared STATES " +
					"arrays, not from observed output. What would actually exist is SEVEN artefacts " +
					"wearing thirty-odd names, and plan 17 would screenshot the populated state under " +
					"every one of them.\n\n" +
					"Look first at whether the page still reads `Astro.params.state`, and second at " +
					"whether it still selects a fixture from that value. (It must NOT read " +
					'`Astro.url.searchParams` — under `output: "static"` Astro strips the query ' +
					"string in dev as well as at build; see this file's header.)\n\n" +
					`States that did NOT differ: ${CANONICAL_STATES.filter((s) => bodies[s] === bodies.populated).join(", ") || "(none)"}`,
			);
		}

		// ── Assertion 3: each marker appears in its own body and nowhere else ─
		const text = {};
		for (const s of STATES) text[s] = decode(bodies[s]);

		const problems = [];
		for (const s of STATES) {
			const own = text[s].includes(markers[s]);
			if (!own) {
				problems.push(
					`  ${s}: its marker is ABSENT from its own page — ${JSON.stringify(markers[s])}`,
				);
			}
			for (const other of STATES) {
				if (other === s) continue;
				if (text[other].includes(markers[s])) {
					problems.push(`  ${s}: its marker LEAKED onto the "${other}" page`);
				}
			}
		}
		if (problems.length > 0) {
			throw new Error(
				`check-states: FAILURE MODE on "${screen.id}" — a state variant is not the state it ` +
					"claims to be.\n\n" +
					problems.join("\n") +
					"\n\nAn absent marker means the URL answered but the page did not render that " +
					"state's copy — the variant is fake. A leaked marker means one page renders more " +
					"than one state at once, which makes every per-state screenshot a screenshot of " +
					"the same page.",
			);
		}

		// ── Assertion 4: the build agrees with the dev server ────────────────
		// Skipped rather than failed when dist/ is absent, so the script is
		// runnable before a build; the readout says which mode it ran in.
		if (existsSync(DIST)) {
			const missing = STATES.filter((s) => !existsSync(distFor(screen, s)));
			if (missing.length > 0) {
				throw new Error(
					`check-states: on "${screen.id}", the dev server serves states the BUILD does not ` +
						"emit.\n\n" +
						missing.map((s) => `  ${s}: no file at ${distFor(screen, s)}`).join("\n") +
						"\n\nPlan 16 reviews the dev server and plan 17 screenshots it, but the built " +
						"output is what any later phase inherits. A state that exists in only one of " +
						"the two is a state that will go missing.",
				);
			}
			distChecked += STATES.length;
		}

		// ── Per-screen readout ───────────────────────────────────────────────
		for (const s of STATES) {
			const diff = s === "populated" ? "row" : bodies[s] === bodies.populated ? "SAME" : "differs";
			console.log(
				`  PASS  ${screen.id.padEnd(10)} ${s.padEnd(10)} ${pathFor(screen, s).padEnd(26)} ` +
					`HTTP 200  ${String(bodies[s].length).padStart(7)} B  ${diff.padEnd(8)} marker unique`,
			);
		}
		console.log("");
	}

	const cells = SCREENS.length * STATES.length;
	console.log(
		`PASS: ${cells} state page(s) across ${SCREENS.length} screen(s) reachable and distinct — ` +
			`markers unique within each screen, ` +
			`${distChecked > 0 ? `${distChecked}/${cells} present in dist/` : "dist/ absent so the build was not cross-checked"}.`,
	);
} catch (err) {
	failed = true;
	console.error(String(err.message ?? err));
} finally {
	// Shut the listener down here so a thrown assertion cannot leave a dev server
	// bound to a port. T-00-30 accepts the local listener as a nuisance rather
	// than an exposure precisely because this block exists.
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

process.exit(failed ? 1 : 0);
