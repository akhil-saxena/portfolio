// check-contrast.mjs — the three-surface WCAG gate at charcoal's tiered bars.
//
// Asserts every charcoal foreground token against ALL THREE surfaces of its
// own mode — page (--cream), paper (--cream-2) and panel (--cream-3) — never
// against the page alone.
//
// THE METHOD RULE IS THE FINDING. Page-only measurement is why two values in
// PROJECT.md's contrast table were wrong and nobody noticed:
//   - "dark mode is already clean" rests on --ochre measuring 4.56 on #161616.
//     True on the page. On a raised card it is 4.20 and on an inset panel 3.91,
//     both below the text bar — and Work's project cards, the case-study
//     screenshots and the entire admin sit on raised surfaces.
//   - the proposed muted value #6E6A5E measures 4.79 on the page, which reads
//     like a pass. On the panel it is 4.46 and fails AA outright, and the panel
//     is exactly where admin table zebra, disabled fields and the pending
//     dashboard put muted text.
// Both errors are invisible to a page-only check and obvious to this one.
//
// TIERED, NOT BLANKET. A single bar would either fail the decorative tokens or
// let the muted ramp slide. Charcoal's bars are:
//   7:1   --ink-3, --ink-4, --ochre-d-strong   targeted AAA (adopted, not
//                                              contingent)
//   4.5:1 --ink, --ink-2, --ochre-d            body-text AA
//   3:1   --wire, --focus                      non-text, WCAG SC 1.4.11
//   none  --ink-5, --rule, --rule-strong       decorative; asserted only to
//                                              EXIST, never to clear a text bar
//
// Plus one DIRECTIONAL assertion for Rule C-1: --ochre must FAIL the text bar
// on at least one dark surface. That is not a bug queued for repair, it is the
// measured reason ochre is fill-only, and asserting it stops someone quietly
// darkening --ochre to make a lint pass and losing the identity in the process.
//
// The ratio helpers below are PORTED from ../design-system/src/tokens.test.ts
// rather than hand-rolled. That implementation is already tested and already in
// CI; a second, subtly different WCAG formula is how two files come to disagree
// about whether the same pair passes.
//
// Handed to Phase 1 as a tokens.test.ts case.

import { readFileSync } from "node:fs";

const THEME = new URL("./src/styles/theme-charcoal.css", import.meta.url);
const css = readFileSync(THEME, "utf8");

const LIGHT = ':root[data-brand="charcoal"] {';
const DARK = ':root[data-brand="charcoal"].dark {';
const MODES = [
	["light", LIGHT],
	["dark", DARK],
];

// The three surfaces of a mode, in elevation order. --cream-3 is the deepest
// and is the one a page-only measurement never sees.
const SURFACES = [
	["page", "--cream"],
	["paper", "--cream-2"],
	["panel", "--cream-3"],
];

const TIERS = [
	{
		bar: 7,
		label: "AAA",
		note: "targeted AAA — muted text and small accent labels",
		tokens: ["--ink-3", "--ink-4", "--ochre-d-strong"],
	},
	{
		bar: 4.5,
		label: "AA",
		note: "body text",
		tokens: ["--ink", "--ink-2", "--ochre-d"],
	},
	{
		bar: 3,
		label: "SC 1.4.11",
		note: "non-text: control boundaries and the focus indicator",
		tokens: ["--wire", "--focus"],
	},
];

// Decorative — hairlines and separators. Asserted only to EXIST in both blocks.
// Holding them to a text bar would be meaningless: a 1.38:1 hairline is
// correct, and a --rule that cleared 4.5:1 would be a border, not a rule.
const DECORATIVE = ["--ink-5", "--rule", "--rule-strong"];

// ── Ported verbatim from ../design-system/src/tokens.test.ts ────────────────
function srgb(c) {
	const v = c / 255;
	return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
	const h = hex.replace("#", "");
	const full =
		h.length === 3
			? h
					.split("")
					.map((c) => c + c)
					.join("")
			: h;
	const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
	return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

function block(source, selector) {
	const start = source.indexOf(selector);
	if (start === -1) throw new Error(`selector not found: ${selector}`);
	const open = source.indexOf("{", start);
	const close = source.indexOf("\n}", open);
	if (close === -1) throw new Error(`unterminated block for selector: ${selector}`);
	return source.slice(open, close);
}

/**
 * Resolve a token to its literal hex in one mode, following `var()` aliases.
 * This is what lets --focus: var(--ochre-d) and --ink-4: var(--ink-3) be
 * declared as aliases and still measure per-mode.
 *
 * The design system's version falls back to the base :root block when a theme
 * does not override a token. Charcoal has no such fallback by design: the
 * exhaustiveness invariant means every token is declared in BOTH blocks, so a
 * missing declaration here is a broken invariant, not a cascade fallback — and
 * it is reported as such rather than papered over.
 */
function resolve(selector, name, seen = new Set()) {
	if (seen.has(name)) throw new Error(`circular alias at ${name}`);
	seen.add(name);
	const re = new RegExp(`${name}:\\s*([^;]+);`);
	const raw = block(css, selector).match(re)?.[1]?.trim();
	if (!raw) {
		console.error(
			`FAIL: ${name} is not declared in ${selector}\n` +
				"Every charcoal token must be declared in BOTH blocks — that is the " +
				"exhaustiveness invariant.\n" +
				"Run check-theme-exhaustive.mjs; it names the failure mode precisely.",
		);
		process.exit(1);
	}
	const alias = raw.match(/var\((--[a-z0-9-]+)\)/);
	return alias ? resolve(selector, alias[1], seen) : raw;
}

// ── Measure ─────────────────────────────────────────────────────────────────
const failures = [];
let ratioLines = 0;

const line = (mode, token, surfaceName, surfaceToken, ratio, bar, verdict) => {
	ratioLines += 1;
	console.log(
		`  ${mode.padEnd(5)} ${token.padEnd(17)} on ${surfaceName.padEnd(5)} ` +
			`(${surfaceToken.padEnd(9)}) = ${ratio.toFixed(2).padStart(6)}  ` +
			`${bar}  ${verdict}`,
	);
};

for (const [mode, selector] of MODES) {
	console.log(
		`\n${mode.toUpperCase()} — surfaces: ` +
			SURFACES.map(([name, token]) => `${name} ${resolve(selector, token)}`).join(" · "),
	);

	for (const tier of TIERS) {
		console.log(`  [${tier.bar}:1 ${tier.label}] ${tier.note}`);
		for (const token of tier.tokens) {
			const fg = resolve(selector, token);
			for (const [surfaceName, surfaceToken] of SURFACES) {
				const ratio = contrast(fg, resolve(selector, surfaceToken));
				const pass = ratio >= tier.bar;
				line(
					mode,
					token,
					surfaceName,
					surfaceToken,
					ratio,
					`>= ${tier.bar.toFixed(2)}`,
					pass ? "OK" : "FAIL",
				);
				if (!pass) {
					failures.push(
						`${mode} ${token} (${fg}) on ${surfaceName} ${surfaceToken} = ` +
							`${ratio.toFixed(2)}, below its ${tier.bar}:1 bar (${tier.label})`,
					);
				}
			}
		}
	}

	// --ochre is measured in both modes and asserted only in dark (Rule C-1
	// below). Printed here because the light numbers are the other half of the
	// argument: it fails as text on the light page too, at 3.52.
	console.log("  [fill only] --ochre is never text — Rule C-1, asserted below");
	for (const [surfaceName, surfaceToken] of SURFACES) {
		const ratio = contrast(resolve(selector, "--ochre"), resolve(selector, surfaceToken));
		line(mode, "--ochre", surfaceName, surfaceToken, ratio, "fill only", "—");
	}
}

// ── Decorative tokens: existence only ───────────────────────────────────────
console.log("\nDECORATIVE — asserted to exist in both blocks, never to clear a text bar");
for (const [mode, selector] of MODES) {
	for (const token of DECORATIVE) {
		const value = resolve(selector, token);
		console.log(`  ${mode.padEnd(5)} ${token.padEnd(17)} = ${value}  (no text bar applies)`);
	}
}

// ── Rule C-1, directional ───────────────────────────────────────────────────
// --ochre MUST fail the text bar on at least one dark surface. If it ever
// passes everywhere, someone has darkened the brand accent to satisfy a check,
// and the fill/text split that Rule C-1 rests on has quietly dissolved.
console.log("\nRULE C-1 (directional) — --ochre must FAIL the 4.5:1 text bar on a dark surface");
const ochreDark = resolve(DARK, "--ochre");
const ochreDarkFails = SURFACES.filter(
	([, surfaceToken]) => contrast(ochreDark, resolve(DARK, surfaceToken)) < 4.5,
);
console.log(
	`  --ochre ${ochreDark} fails the text bar on ` +
		`${ochreDarkFails.length}/${SURFACES.length} dark surfaces: ` +
		`${ochreDarkFails.map(([name]) => name).join(", ") || "none"}`,
);
if (ochreDarkFails.length === 0) {
	failures.push(
		"--ochre now clears 4.5:1 on every dark surface. That is a REGRESSION, not an " +
			"improvement: Rule C-1 makes --ochre a fill and --ochre-d the text colour " +
			"precisely because the brand accent does not clear the text bar on raised " +
			"surfaces. If --ochre passes everywhere it has been darkened away from the " +
			"identity, and the fill/text split no longer has a reason to exist.",
	);
}

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log(`\n${ratioLines} ratios computed across 2 modes x 3 surfaces.`);

if (failures.length > 0) {
	console.error(
		`\nFAIL: ${failures.length} contrast assertion(s) did not hold.\n` +
			"Every ratio is measured against all three surfaces of its own mode, so a " +
			"failure on 'panel'\n" +
			"with a pass on 'page' is the normal shape of this bug, not an anomaly — the " +
			"panel is where\n" +
			"table zebra, disabled fields and inset wells put text.\n" +
			`  ${failures.join("\n  ")}`,
	);
	process.exit(1);
}

console.log(
	"PASS: every charcoal foreground token clears its tiered bar on page, paper and panel " +
		"in both modes,\nand --ochre still fails the text bar in dark, so it remains fill-only.",
);
