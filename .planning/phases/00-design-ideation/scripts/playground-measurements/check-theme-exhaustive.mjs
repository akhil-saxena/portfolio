// check-theme-exhaustive.mjs — the load-bearing DSGN-05 invariant.
//
// Asserts: :root[data-brand="charcoal"].dark declares EVERY custom property
// that :root[data-brand="charcoal"] declares. Same count, same names, no
// exceptions — including properties whose value is identical in both modes and
// properties that are pure aliases.
//
// WHY THIS EXISTS, and why it is not the specificity check you might expect.
// D-27's arithmetic is already correct: the compound dark selector computes
// (0,3,0) and outranks :root.dark unconditionally. The measured failure is not
// a specificity bug, it is an EXHAUSTIVENESS bug. A charcoal property declared
// in the light block and never restated in the dark block ties :root.dark at
// (0,2,0), and a tie is broken by source order — so its dark value is decided
// by whichever stylesheet the bundler happened to emit last. Across four
// deliberately-constructed import orders, one order applies the LIGHT value in
// dark mode and another loses charcoal entirely. Light mode never breaks,
// because (0,2,0) always beats :root at (0,1,0), which is exactly why this
// class of bug survives review and ships.
//
// Hold the invariant and the cascade is order-independent by construction: no
// dependence on cascade layers (deferred to Phase 06.1 by D-28), and none on
// the D-33 manifest's import order.
//
// This is the mirror of the design system's existing tokens.test.ts assertion
// "declares a light value for every token the dark theme overrides", whose
// comment records the regression that motivated it ("--rule-strong shipped
// that way"). The two directions catch DIFFERENT bugs and Phase 1 should ship
// both: the existing one catches a token that resolves to nothing in light,
// this one catches a token whose dark value depends on emit order.
//
// Handed to Phase 1 as a tokens.test.ts case, not as advice. It is DS-01's
// real acceptance criterion expressed as code.

import { readFileSync } from "node:fs";

const THEME = new URL("./src/styles/theme-charcoal.css", import.meta.url);
const css = readFileSync(THEME, "utf8");

const LIGHT_SELECTOR = ':root[data-brand="charcoal"] {';
const DARK_SELECTOR = ':root[data-brand="charcoal"].dark {';

/**
 * Extract the declarations inside the first `{...}` block of a selector.
 * Copied from ../design-system/src/tokens.test.ts so the two stay in step.
 * Token blocks are flat (no nesting), so the next `}` at column 0 closes it —
 * which is why theme-charcoal.css's header calls its own formatting
 * load-bearing. An indented closing brace or a nested rule truncates this
 * slice and the check then passes for the wrong reason.
 */
function block(source, selector) {
	const start = source.indexOf(selector);
	if (start === -1) throw new Error(`selector not found: ${selector}`);
	const open = source.indexOf("{", start);
	const close = source.indexOf("\n}", open);
	if (close === -1) throw new Error(`unterminated block for selector: ${selector}`);
	return source.slice(open, close);
}

function declaredIn(source) {
	const out = new Set();
	for (const m of source.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) out.add(m[1]);
	return out;
}

const light = declaredIn(block(css, LIGHT_SELECTOR));
const dark = declaredIn(block(css, DARK_SELECTOR));

// Guard against the silent-truncation failure mode above: a block that parsed
// to almost nothing would make the diff below trivially empty.
if (light.size < 25) {
	console.error(
		`FAIL: the light block parsed to only ${light.size} properties, which is far ` +
			"below the charcoal token contract.\n" +
			"That is not a small theme, it is a truncated parse — check that the block is " +
			"flat and its closing brace sits at column 0.",
	);
	process.exit(1);
}

const missing = [...light].filter((token) => !dark.has(token));

if (missing.length > 0) {
	console.error(
		`FAIL: ${missing.length} charcoal token(s) are declared in the light block and ` +
			"never restated in the dark block.\n" +
			"\n" +
			"This is not a style nit. Each one below ties :root.dark at (0,2,0), so its " +
			"dark-mode value is\n" +
			"decided by whichever stylesheet the bundler emitted last — the light value " +
			"wins in one import\n" +
			"order and the design system's neutral dark wins in another. Light mode will " +
			"look correct either\n" +
			"way, which is why this ships. Restate each of these in the dark block, even " +
			"if the value is\n" +
			"identical and even if it is a pure alias:\n" +
			`  ${missing.join("\n  ")}`,
	);
	process.exit(1);
}

// The reverse direction is the design system's own assertion. Charcoal holds
// both, so report it rather than leaving it implied — a dark-only property
// resolves to nothing in light mode.
const darkOnly = [...dark].filter((token) => !light.has(token));
if (darkOnly.length > 0) {
	console.error(
		`FAIL: ${darkOnly.length} charcoal token(s) exist only in the dark block, so they ` +
			"resolve to nothing in light mode\n" +
			"(this is the direction the design system's own tokens.test.ts already " +
			"guards — --rule-strong shipped that way):\n" +
			`  ${darkOnly.join("\n  ")}`,
	);
	process.exit(1);
}

console.log(
	`PASS: all ${light.size} charcoal tokens are restated in the dark block ` +
		`(dark declares ${dark.size}).`,
);
console.log(
	"Every charcoal token therefore resolves at (0,3,0) in dark mode and the cascade is " +
		"order-independent by construction.",
);
