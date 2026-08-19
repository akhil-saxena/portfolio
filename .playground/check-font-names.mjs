// check-font-names.mjs — token family name vs. face family name agreement.
//
// Asserts: the FIRST family named in every charcoal type stack has a matching
// face rule in one of the four package entry points fonts-charcoal.css pulls
// in. Both charcoal blocks are checked, and `var()` aliases are followed, so
// --display and --serif are held to the same bar as --font-display and
// --font-serif.
//
// WHY THE FIRST FAMILY AND NOT ALL OF THEM. The head of the stack is what
// actually renders. Every entry after it is a fallback and is SUPPOSED to be
// unmatched — Georgia, system-ui and monospace have no face rule anywhere and
// asserting on them would be nonsense. A stack whose head is unmatched does
// not fail: it silently falls through to the next entry, which is how
// "Playfair Display" becomes Georgia while the page still looks almost right.
//
// WHY THIS EXISTS SEPARATELY FROM D-29. D-29 splits tokens from faces so that
// forgetting the face file fails LOUDLY — every family at once, noticed in a
// second. That design catches a MISSING IMPORT. It does not catch a NAME
// MISMATCH, which is the failure actually waiting here: Fontsource registers
// its variable families with "Variable" appended, while the handoff spec and
// every design reference call the font "Playfair Display". Charcoal names two
// variable families, so it has two chances to get this wrong; the design
// system's own token layer names only one and got away with it by luck.
//
// The warning sign in a browser, for anyone debugging this by hand:
// document.fonts.check('16px "Playfair Display"') returns false.
//
// Handed to Phase 1 as a tokens.test.ts case.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const THEME = new URL("./src/styles/theme-charcoal.css", import.meta.url);
const FONTS = new URL("./src/styles/fonts-charcoal.css", import.meta.url);
const NODE_MODULES = new URL("./node_modules/", import.meta.url);

const themeCss = readFileSync(THEME, "utf8");
const fontsCss = readFileSync(FONTS, "utf8");

const BLOCKS = [
	["light", ':root[data-brand="charcoal"] {'],
	["dark", ':root[data-brand="charcoal"].dark {'],
];

// CSS generic and system keywords. None of these has — or should have — a face
// rule. They are legal as fallbacks and illegal as the head of a charcoal
// stack, because a generic head means no webfont ever renders.
const GENERICS = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"ui-serif",
	"ui-sans-serif",
	"ui-monospace",
	"ui-rounded",
	"math",
	"emoji",
	"fangsong",
	"-apple-system",
	"blinkmacsystemfont",
]);

function block(source, selector) {
	const start = source.indexOf(selector);
	if (start === -1) throw new Error(`selector not found: ${selector}`);
	const open = source.indexOf("{", start);
	const close = source.indexOf("\n}", open);
	if (close === -1) throw new Error(`unterminated block for selector: ${selector}`);
	return source.slice(open, close);
}

/** Every type-stack declaration in a block, in source order. */
function typeDeclarations(source) {
	const out = new Map();
	const re = /^\s*(--(?:font[a-z0-9-]*|display|mono|serif))\s*:\s*([^;]+);/gim;
	for (const m of source.matchAll(re)) out.set(m[1], m[2].trim());
	return out;
}

/** Follow `var()` aliases within a block until a literal stack is reached. */
function resolveStack(declarations, name, seen = new Set()) {
	if (seen.has(name)) throw new Error(`circular type alias at ${name}`);
	seen.add(name);
	const raw = declarations.get(name);
	if (raw === undefined) throw new Error(`${name} referenced but not declared in this block`);
	const alias = raw.match(/^var\((--[a-z0-9-]+)\)$/);
	return alias ? resolveStack(declarations, alias[1], seen) : raw;
}

const stripQuotes = (s) => s.trim().replace(/^["']|["']$/g, "").trim();

/** Resolve one entry-point specifier to a real path under node_modules. */
function entryPointPath(specifier) {
	const url = new URL(specifier, NODE_MODULES);
	const path = fileURLToPath(url);
	if (!existsSync(path)) {
		console.error(
			`FAIL: fonts-charcoal.css pulls in "${specifier}", which does not exist on disk.\n` +
				`Resolved to: ${path}\n` +
				"Either the package is not installed, or the entry point was renamed by a " +
				"Fontsource release.\n" +
				"Do NOT guess a nearby package name to make this pass — an unclaimed name on " +
				"the registry\n" +
				"resolves to whatever eventually claims it (T-00-12). Check the installed " +
				"package's own files.",
		);
		process.exit(1);
	}
	return path;
}

// ── Collect the families the face layer actually provides ───────────────────
const specifiers = [...fontsCss.matchAll(/@import\s+["']([^"']+)["']\s*;/g)].map((m) => m[1]);

if (specifiers.length === 0) {
	console.error(
		"FAIL: fonts-charcoal.css pulls in no package entry points at all.\n" +
			"Every charcoal type token would name a family the browser has never heard of. " +
			"That is D-29's\n" +
			"loud-failure mode working as designed — restore the entry points rather than " +
			"relaxing this check.",
	);
	process.exit(1);
}

const provided = new Map(); // lowercased family -> { family, sources: [] }
let faceCount = 0;

for (const specifier of specifiers) {
	const path = entryPointPath(specifier);
	const source = readFileSync(path, "utf8");
	for (const face of source.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
		faceCount += 1;
		const family = face[1].match(/font-family:\s*([^;]+);/);
		if (!family) continue;
		const name = stripQuotes(family[1]);
		const key = name.toLowerCase();
		const entry = provided.get(key) ?? { family: name, sources: [] };
		if (!entry.sources.includes(specifier)) entry.sources.push(specifier);
		provided.set(key, entry);
	}
}

// ── Check every type stack in both blocks ───────────────────────────────────
const failures = [];
let checked = 0;

for (const [mode, selector] of BLOCKS) {
	const declarations = typeDeclarations(block(themeCss, selector));
	if (declarations.size === 0) {
		console.error(`FAIL: the ${mode} charcoal block declares no type tokens at all.`);
		process.exit(1);
	}
	for (const token of declarations.keys()) {
		const stack = resolveStack(declarations, token);
		const head = stripQuotes(stack.split(",")[0]);
		checked += 1;
		if (GENERICS.has(head.toLowerCase())) {
			failures.push(
				`${mode} ${token} — head of stack is the generic "${head}", so no webfont can ever ` +
					"render for this token",
			);
			continue;
		}
		if (!provided.has(head.toLowerCase())) {
			failures.push(
				`${mode} ${token} — claims "${head}", which no face rule declares. It will fall ` +
					`through to the next entry in the stack instead: ${stack}`,
			);
		}
	}
}

if (failures.length > 0) {
	console.error(
		`FAIL: ${failures.length} charcoal type token(s) name a first family with no matching ` +
			"face rule.\n" +
			"The head of a stack is what renders; an unmatched head does not error, it " +
			"silently falls back,\n" +
			"which is how a Playfair heading becomes Georgia while the page still looks " +
			"almost right.\n" +
			`  ${failures.join("\n  ")}\n` +
			"\n" +
			`Families actually provided by fonts-charcoal.css (${faceCount} face rules across ` +
			`${specifiers.length} entry points):\n` +
			[...provided.values()]
				.map((entry) => `  ${entry.family}  <- ${entry.sources.join(", ")}`)
				.join("\n"),
	);
	process.exit(1);
}

console.log(
	`PASS: ${checked} charcoal type tokens across both blocks name a first family that a ` +
		"face rule declares.",
);
console.log(
	`Face layer provides ${provided.size} families in ${faceCount} face rules from ` +
		`${specifiers.length} entry points:`,
);
for (const entry of [...provided.values()].sort((a, b) => a.family.localeCompare(b.family))) {
	console.log(`  ${entry.family}  <- ${entry.sources.join(", ")}`);
}
