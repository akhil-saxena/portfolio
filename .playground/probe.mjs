// probe.mjs — the charcoal cascade order-independence probe (MEASURE-3).
//
// Run AFTER `npx astro build`:
//     rm -rf node_modules/.vite dist && INLINE_CSS=auto  npx astro build && node probe.mjs
//     rm -rf node_modules/.vite dist && INLINE_CSS=never npx astro build && node probe.mjs
//
// WHAT THIS PROVES, and why it is the third and last D-02 claim.
// `:root[data-brand="charcoal"]` and the design system's `:root.dark` both
// compute (0,2,0). A charcoal token declared in the light block and NOT
// restated in the (0,3,0) dark block therefore ties, and a tie is broken by
// source order — so its dark value is decided by whichever stylesheet the
// bundler emitted last. Research measured that failure directly: one import
// order left the charcoal LIGHT background applied in dark mode, another lost
// charcoal entirely and fell back to the design system's neutral #181818.
// Light mode never breaks, because (0,2,0) always beats :root at (0,1,0),
// which is exactly why this class of bug survives review and ships.
//
// THE METHOD IS THE FINDING. You cannot reliably reproduce Astro's ordering
// nondeterminism by hoping to observe it. You reproduce it by deterministically
// CONSTRUCTING both orderings and asserting the theme wins in each. Astro sorts
// imported stylesheets with `cssOrder(a, b)` (astro/dist/core/build/runtime.js)
// on accumulated import index ascending then module-graph depth descending, and
// the import index is literally the position of the `import` statement inside
// the importing module — so swapping two adjacent lines flips the emitted order
// every time. `src/pages/probe/casc-{a,b,c,d}.astro` are those four orders.
//
// EXPECTED RESULT DIFFERS FROM RESEARCH'S. Research measured a deliberately
// NON-exhaustive prototype theme and saw `--cream` break in both orderings.
// Plan 04's theme satisfies the exhaustiveness invariant (37/37 tokens restated
// in the dark block), so every token must now resolve identically in all four
// variants. If one does not, the defect is in `theme-charcoal.css` — fix the
// CSS, never this probe.
//
// TWO ASSERTIONS, NOT ONE. Cross-variant agreement alone is not sufficient: if
// `data-brand` were misspelled on all four pages, or the theme sheet silently
// stopped being imported, all four variants would agree on the design system's
// neutral values and an agreement-only probe would pass while measuring
// nothing. So every cell is ALSO checked against the value
// `theme-charcoal.css` declares for that mode, parsed out of the stylesheet
// itself (var() aliases resolved) rather than hardcoded here, so the two
// cannot drift apart.
//
// WHY A FIFTEEN-LINE STATIC SERVER RATHER THAN ASTRO'S OWN PREVIEW COMMAND.
// That command is adapter-aware, and the D-02 scope fence forbids an adapter —
// adding one is the single change that would turn this throwaway playground
// into a viable Phase 2 foundation. A plain `node:http` server over `dist/` is
// deterministic, starts instantly, and cannot drag an adapter in. Its absence
// is asserted by this plan's acceptance criteria.
//
// WHY A BROWSER RATHER THAN PARSING <link> ORDER OUT OF THE HTML. Order
// inspection cannot see inline <style> vs <link> interaction, @supports, or
// var() substitution. `getComputedStyle(document.documentElement)` is the only
// authority on what a token actually resolves to.

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Resolve every path from this file rather than from cwd, so running the probe
// from the repository root cannot silently serve an empty directory.
const HERE = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(HERE, "dist");
const THEME = join(HERE, "src", "styles", "theme-charcoal.css");

const PORT = 4321;
const VARIANTS = ["a", "b", "c", "d"];
const MODES = ["dark", "light"];

// The tokens under test: the charcoal names plan 04 actually declares, not
// research's placeholder list (which named `--amber-d`, a token that does not
// exist in this theme). `--cream` and `--ochre-d-strong` are the anchors —
// `--cream` is the token research measured breaking, and `--ochre-d-strong` is
// the AAA-1 addition, so both are called out explicitly in the summary.
const TOKENS = [
	"--ink",
	"--ink-2",
	"--ink-3",
	"--ink-4",
	"--ink-5",
	"--cream",
	"--cream-2",
	"--cream-3",
	"--ochre",
	"--ochre-d",
	"--ochre-d-strong",
	"--wire",
	"--rule",
	"--focus",
	"--font-serif",
	"--font-body",
	"--font-mono",
];

// ── Expected values, parsed out of theme-charcoal.css ────────────────────────
//
// `block()` is copied from check-theme-exhaustive.mjs (itself copied from
// ../design-system/src/tokens.test.ts) so all three share one parse and one
// failure mode. Token blocks are flat, so the next `}` at column 0 closes the
// block — which is why that stylesheet calls its own formatting load-bearing.

function block(source, selector) {
	const start = source.indexOf(selector);
	if (start === -1) throw new Error(`selector not found: ${selector}`);
	const open = source.indexOf("{", start);
	const close = source.indexOf("\n}", open);
	if (close === -1) throw new Error(`unterminated block for selector: ${selector}`);
	return source.slice(open, close);
}

/** Declarations of one block as a Map, comments stripped first. */
function declarations(blockSource) {
	const stripped = blockSource.replace(/\/\*[\s\S]*?\*\//g, "");
	const out = new Map();
	for (const m of stripped.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
		out.set(m[1], m[2].trim());
	}
	return out;
}

/** Resolve `var(--x)` aliases within one mode, the way the browser will. */
function resolveAlias(map, value, seen = new Set()) {
	const m = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);
	if (!m) return value;
	const target = m[1];
	if (seen.has(target)) throw new Error(`circular var() alias at ${target}`);
	seen.add(target);
	const next = map.get(target);
	if (next === undefined) throw new Error(`alias ${value} points at an undeclared token`);
	return resolveAlias(map, next, seen);
}

// Normalise for comparison AND for display. Hex colours are lowercased because
// CSS hex is case-insensitive and this theme deliberately writes uppercase to
// match UI-SPEC's tables verbatim; font stacks keep their case because family
// names are not case-insensitive in any useful sense. Whitespace runs collapse
// so a reformatted stack does not read as a value change.
function normalise(raw) {
	const v = String(raw).trim().replace(/\s+/g, " ");
	return /^#[0-9a-f]{3,8}$/i.test(v) ? v.toLowerCase() : v;
}

const themeCss = readFileSync(THEME, "utf8");
const declaredByMode = {
	light: declarations(block(themeCss, ':root[data-brand="charcoal"] {')),
	dark: declarations(block(themeCss, ':root[data-brand="charcoal"].dark {')),
};

// A token absent from the LIGHT block is not a charcoal token at all, so it is
// a bug in this probe's TOKENS list and there is nothing to measure. Fail now.
for (const token of TOKENS) {
	if (!declaredByMode.light.has(token)) {
		console.error(
			`FAIL: ${token} is not declared in the charcoal LIGHT block of ` +
				"theme-charcoal.css.\n" +
				"The probe derives its expected values from that stylesheet rather than " +
				"hardcoding them, so a\n" +
				"token it cannot find in the light block is a typo in this probe's TOKENS " +
				"list, not a finding.",
		);
		process.exit(1);
	}
}

// A token absent from the DARK block is the OPPOSITE case: it is precisely the
// condition under test, so the probe must NOT bail here. It runs the full
// matrix, prints the evidence, and then fails with both the structural reason
// (the (0,2,0) tie) and the measured disagreement it produced. Bailing early
// would reduce the negative control to a static file check and throw away the
// browser measurement that makes this a probe rather than a linter.
const missingInDark = TOKENS.filter((token) => !declaredByMode.dark.has(token));

const expected = { light: {}, dark: {} };
for (const mode of MODES) {
	const map = declaredByMode[mode];
	for (const token of TOKENS) {
		const declared = map.get(token);
		// null means "no declared value for this mode" — assertion 2 skips it and
		// assertions 1 and 3 carry the weight.
		expected[mode][token] = declared === undefined ? null : normalise(resolveAlias(map, declared));
	}
}

// ── The static server ────────────────────────────────────────────────────────

const TYPES = {
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".map": "application/json",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".svg": "image/svg+xml",
};

if (!existsSync(DIST)) {
	console.error("probe: dist/ does not exist — run `npx astro build` first.");
	process.exit(2);
}

const server = createServer((req, res) => {
	let p = join(DIST, decodeURI(req.url.split("?")[0]));
	if (existsSync(p) && !extname(p)) p = join(p, "index.html");
	if (!existsSync(p)) {
		res.writeHead(404);
		return res.end();
	}
	res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
	res.end(readFileSync(p));
});

await new Promise((resolve, reject) => {
	server.once("error", reject);
	server.listen(PORT, "127.0.0.1", resolve);
});

// ── Drive the matrix ─────────────────────────────────────────────────────────

const inlineSetting = process.env.INLINE_CSS === "never" ? "never" : "auto";
console.log(`cascade probe — build.inlineStylesheets: '${inlineSetting}'`);
console.log(`${VARIANTS.length} import orders x ${MODES.length} modes x ${TOKENS.length} tokens`);
console.log("");

const results = {}; // results[mode][variant] = { token: value }
for (const mode of MODES) results[mode] = {};

const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	for (const variant of VARIANTS) {
		for (const mode of MODES) {
			await page.goto(`http://127.0.0.1:${PORT}/probe/casc-${variant}/`);
			await page.evaluate(
				(m) => document.documentElement.classList.toggle("dark", m === "dark"),
				mode,
			);
			const got = await page.evaluate((tokens) => {
				const cs = getComputedStyle(document.documentElement);
				return Object.fromEntries(tokens.map((t) => [t, cs.getPropertyValue(t).trim()]));
			}, TOKENS);

			const row = {};
			for (const token of TOKENS) row[token] = normalise(got[token]);
			results[mode][variant] = row;
		}
	}
} finally {
	await browser.close();
	server.close();
}

// ── Print the full matrix regardless of outcome ──────────────────────────────
//
// Eight ROW lines, one per cell. The evidence has to be readable even when the
// probe passes, because "it exited 0" is not a measurement.

for (const variant of VARIANTS) {
	for (const mode of MODES) {
		const row = results[mode][variant];
		const cells = TOKENS.map((t) => `${t}=${row[t]}`).join("  ");
		console.log(`ROW casc-${variant} ${mode.padEnd(5)} ${cells}`);
	}
}
console.log("");

// Per-token cross-variant view — the same data, oriented so a disagreement is
// visible at a glance rather than by diffing two long lines.
const width = Math.max(...TOKENS.map((t) => t.length));
console.log(`${"token".padEnd(width)}  ${"dark".padEnd(46)}  light`);
for (const token of TOKENS) {
	const darkVals = new Set(VARIANTS.map((v) => results.dark[v][token]));
	const lightVals = new Set(VARIANTS.map((v) => results.light[v][token]));
	const show = (s) => (s.size === 1 ? [...s][0] : `VARIES: ${[...s].join(" | ")}`);
	console.log(`${token.padEnd(width)}  ${show(darkVals).padEnd(46)}  ${show(lightVals)}`);
}
console.log("");

// ── Assertion 1: every variant must agree, within a mode ─────────────────────

const failures = [];

for (const mode of MODES) {
	for (const token of TOKENS) {
		const reference = results[mode][VARIANTS[0]][token];
		for (const variant of VARIANTS.slice(1)) {
			const value = results[mode][variant][token];
			if (value !== reference) {
				failures.push(
					`${token} differs between import orders in ${mode} mode: ` +
						`casc-${VARIANTS[0]} = "${reference}" but casc-${variant} = "${value}". ` +
						"Two import orders resolved the same token to different values, which means " +
						"the value is being decided by emit order rather than by specificity — the " +
						"exhaustiveness invariant is broken for this token.",
				);
			}
		}
	}
}

// ── Assertion 2: every cell must match what the theme declares ───────────────

for (const mode of MODES) {
	for (const variant of VARIANTS) {
		for (const token of TOKENS) {
			const value = results[mode][variant][token];
			const want = expected[mode][token];
			if (value === "") {
				failures.push(
					`${token} resolved to nothing on casc-${variant} in ${mode} mode. ` +
						"The property is not defined at all, so the charcoal stylesheet did not " +
						"reach this page.",
				);
			} else if (want === null) {
				// Not declared for this mode — assertion 3 reports the omission and
				// assertion 1 reports whatever the browser made of it.
			} else if (value !== want) {
				failures.push(
					`${token} on casc-${variant} in ${mode} mode resolved to "${value}" but ` +
						`theme-charcoal.css declares "${want}" for that mode. ` +
						"Charcoal lost the cascade here (or the value came from the design " +
						"system's neutral block instead).",
				);
			}
		}
	}
}

// ── Assertion 3: the exhaustiveness invariant itself ─────────────────────────
//
// Reported last, after the matrix, so the omission and the damage it caused
// appear together rather than as an abstract rule violation.

for (const token of missingInDark) {
	failures.push(
		`${token} is declared in the charcoal LIGHT block but never restated in the ` +
			"dark block. It therefore ties the design system's :root.dark at (0,2,0), and " +
			"the values above are whatever each emit order happened to decide. This is the " +
			"exhaustiveness invariant, and it is the ONLY thing making the charcoal cascade " +
			"order-independent.",
	);
}

// ── Verdict ──────────────────────────────────────────────────────────────────

if (failures.length > 0) {
	console.error(`FAIL: ${failures.length} cascade assertion(s) failed.\n`);
	for (const f of failures) console.error(`  - ${f}`);
	console.error(
		"\nFix theme-charcoal.css, never this probe. The remedy is always the same: restate " +
			"the named token\nin :root[data-brand=\"charcoal\"].dark so it resolves at (0,3,0) " +
			"and stops tying :root.dark at (0,2,0).",
	);
	process.exit(1);
}

const cells = VARIANTS.length * MODES.length;
console.log(
	`PASS: ${TOKENS.length} charcoal tokens resolve identically across ${VARIANTS.length} ` +
		`constructed import orders in both modes (${cells} cells, ` +
		`${cells * TOKENS.length} assertions), and every value matches what ` +
		"theme-charcoal.css declares for that mode.",
);
console.log(
	`  --cream            dark ${results.dark.a["--cream"]}   light ${results.light.a["--cream"]}` +
		"   <- the token research measured breaking in both orderings",
);
console.log(
	`  --ochre-d-strong   dark ${results.dark.a["--ochre-d-strong"]}   ` +
		`light ${results.light.a["--ochre-d-strong"]}   <- the AAA-1 accent step`,
);
console.log(
	`Cascade order-independence holds under build.inlineStylesheets: '${inlineSetting}'. ` +
		"No @layer, no !important.",
);
