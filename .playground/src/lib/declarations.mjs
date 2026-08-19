// declarations.mjs — reading a route's own SCREEN / STATES / ARTEFACT(S)
// declarations out of its .astro frontmatter, for callers that are NOT a page
// render.
//
// ═══ WHY THIS FILE EXISTS, AND WHY IT IS AN EXTRACTION RATHER THAN A COPY ═══
// coverage.mjs's header states the doctrine this file serves: "TWO CALLERS, ONE
// IMPLEMENTATION … Both paths share this file exactly; neither has its own copy
// of a rule." That was true of the matrix rules and NOT of the extraction that
// feeds them — check-coverage.mjs owned the only source reader, as top-level
// statements in a script that exits on failure, so it could not be imported.
//
// Plan 00-17's shoot.mjs is the THIRD caller. It needs the same id → route
// mapping the coverage matrix already derives, and the only way to get it
// outside an Astro render is to read the same declarations. Giving it a private
// copy of this ~80 lines is exactly the failure artefacts.mjs's header warns
// about: two readers of one contract, either of which can drift into a weaker
// parse while still exiting 0. So the reader moved here verbatim and
// check-coverage.mjs now imports it. Nothing about the parse changed.
//
// `import.meta.glob` IS NOT AVAILABLE HERE. It is a Vite transform, so it only
// exists inside a module Vite compiles — src/pages/index.astro has it and a
// plain `node script.mjs` does not. That asymmetry is the whole reason a source
// reader exists at all, and it is why both non-render callers walk the directory
// themselves.
//
// EXTRACTION FAILURE IS A FAILURE, NEVER A SKIP. A route whose STATES could not
// be read would otherwise silently become a route with no cells and no
// artefacts — a screen missing from the coverage table, or an artefact missing
// from the screenshot record, with nothing anywhere saying so.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** The playground root, resolved from this file rather than from cwd. */
export const PLAYGROUND = fileURLToPath(new URL("../../", import.meta.url));

/** Every `.astro` under `dir`, recursively, in a stable order. */
export function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walk(p));
		else if (name.endsWith(".astro")) out.push(p);
	}
	return out.sort();
}

/** The frontmatter, which is where every declaration lives. */
export function frontmatter(src, file) {
	if (!src.startsWith("---")) {
		throw new Error(
			`declarations: ${file} has no frontmatter fence. Every admin route is an .astro file ` +
				"whose SCREEN / STATES / ARTEFACTS live between the two `---` lines; a file shaped " +
				"differently cannot be read and must not be silently ignored.",
		);
	}
	const end = src.indexOf("\n---", 3);
	if (end < 0) {
		throw new Error(`declarations: ${file} has an unterminated frontmatter fence.`);
	}
	return src.slice(3, end);
}

// ── Read one balanced literal starting at `from` ───────────────────────────
// Handles nested braces and brackets, single/double/back-quoted strings with
// escapes, and both comment forms. Deliberately small: the inputs are literals
// written by hand in this repository, not arbitrary JavaScript.
export function readLiteral(src, from, file, name) {
	let i = from;
	while (i < src.length && /\s/.test(src[i])) i++;
	const open = src[i];
	const close = open === "{" ? "}" : open === "[" ? "]" : null;
	if (!close) {
		throw new Error(
			`declarations: ${file} exports ${name} but it does not begin with an object or array ` +
				`literal (found ${JSON.stringify(open)}). UI-SPEC's contract is a literal declaration; ` +
				"anything computed cannot be read without executing the page.",
		);
	}
	let depth = 0;
	for (; i < src.length; i++) {
		const c = src[i];
		const next = src[i + 1];
		if (c === "/" && next === "/") {
			i = src.indexOf("\n", i);
			if (i < 0) break;
			continue;
		}
		if (c === "/" && next === "*") {
			i = src.indexOf("*/", i + 2) + 1;
			continue;
		}
		if (c === '"' || c === "'" || c === "`") {
			const quote = c;
			i++;
			for (; i < src.length; i++) {
				if (src[i] === "\\") i++;
				else if (src[i] === quote) break;
			}
			continue;
		}
		if (c === "{" || c === "[") depth++;
		else if (c === "}" || c === "]") {
			depth--;
			if (depth === 0) return src.slice(from, i + 1);
		}
	}
	throw new Error(`declarations: ${file}'s ${name} literal is unterminated.`);
}

/** One object/array literal export, evaluated. `undefined` if not declared. */
export function extract(src, file, name) {
	const m = new RegExp(`export\\s+const\\s+${name}\\s*=`).exec(src);
	if (!m) return undefined;
	const text = readLiteral(src, m.index + m[0].length, file, name);
	try {
		// eslint-disable-next-line no-new-func
		return new Function(`"use strict"; return (${text});`)();
	} catch (err) {
		throw new Error(
			`declarations: ${file}'s ${name} literal could not be evaluated — ${err.message}\n` +
				"This is a FAILURE and not a skip: an unreadable declaration would otherwise become a " +
				"screen with no cells, which is exactly the silent collapse this gate exists to catch.",
		);
	}
}

/**
 * One STRING literal export, unquoted. `undefined` if not declared.
 *
 * `readLiteral` deliberately refuses anything that does not open with `{` or
 * `[`, because a computed declaration cannot be read without executing the
 * page. A pinned dynamic-segment value — `export const PINNED = "cairn"` on
 * /admin/projects/[id] — is neither: it is a bare string, and it is the only
 * honest way to resolve that route's `[id]` to a concrete URL without a
 * hand-listed guess. Its own route file names it once; this reads that name.
 */
export function extractString(src, name) {
	const m = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*("[^"]*"|'[^']*')`).exec(src);
	return m ? m[1].slice(1, -1) : undefined;
}

/**
 * Every admin route's declarations, keyed by path relative to the playground
 * root — the exact shape `buildMatrix` expects from
 * `import.meta.glob("./admin/**\/*.astro", { eager: true })`.
 *
 * Also returns each route's raw frontmatter, so a caller needing a declaration
 * the matrix does not model (`PINNED`, `VARIANTS`) reads it from the same parse
 * rather than opening the file a second time.
 */
export function readAdminModules() {
	const admin = join(PLAYGROUND, "src", "pages", "admin");
	const files = walk(admin);
	if (files.length === 0) {
		throw new Error(
			`declarations: no .astro routes found under ${admin}. Every gate that reads them would ` +
				"pass vacuously, and the screenshot record would be silently empty.",
		);
	}

	const modules = {};
	const frontmatters = {};
	for (const f of files) {
		const rel = relative(PLAYGROUND, f);
		const fm = frontmatter(readFileSync(f, "utf8"), rel);
		frontmatters[rel] = fm;
		modules[rel] = {
			SCREEN: extract(fm, rel, "SCREEN"),
			STATES: extract(fm, rel, "STATES"),
			ARTEFACT: extract(fm, rel, "ARTEFACT"),
			ARTEFACTS: extract(fm, rel, "ARTEFACTS"),
		};
	}

	return { files, modules, frontmatters };
}
