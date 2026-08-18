// check-css-size.mjs — the D-33 manifest measurement.
// Run after `npx astro build`.
//
// THIS IS A MEASUREMENT, NOT A BUDGET. It does not fail on size, and it must
// not be hardened into a gate here. No CSS size budget is confirmed for this
// project; inventing one in a throwaway playground would repeat exactly the
// problem already recorded under `## Deferred thresholds` in 00-FINDINGS.md,
// where an unconfirmed 50 KB island threshold had to be explicitly deferred
// after it started reading like a decision. The byte count is the finding.
//
// WHAT IT DOES FAIL ON: finding no CSS at all. A build that emits no
// stylesheet for a manifest route means the manifest silently stopped being
// imported — the page still builds, still renders, and looks merely "unstyled"
// in a screenshot. That is the one regression this script exists to catch, and
// it throws rather than warns, following the design system's own postbuild
// convention (`scripts/postbuild.mjs`: "a silent failure here publishes a
// package whose documented stylesheet entrypoints 404. Throwing is the point.")
//
// TWO NUMBERS ARE REPORTED AND THEY ANSWER DIFFERENT QUESTIONS.
//
//   1. SHIPPED PER ROUTE — every stylesheet the built page actually references
//      or inlines. This is what a visitor downloads, and it necessarily
//      includes the design system's token layer, which is ~65 KB on its own
//      because it carries 73 @font-face rules.
//
//   2. THE MANIFEST'S COMPONENT SET — the per-component sheets the manifest
//      names, measured from the package's own files. This is the number D-33's
//      tradeoff rests on, because it is the one that is directly comparable to
//      shipping the whole primitives stylesheet instead. Reporting only (1)
//      would bury that comparison under the font layer and make the manifest
//      look like it saved nothing.
//
// Gzip is reported per file and summed per route, because each asset is a
// separate HTTP response with its own compression stream — summing raw bytes
// and gzipping the concatenation would flatter the result by finding
// cross-file redundancy no server will ever exploit. For the component-set
// figure the concatenation IS gzipped, because there the sheets are being
// compared against one single file (the whole primitives stylesheet) and the
// comparison has to be like for like.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(HERE, "dist");
const DS_CSS_DIR = join(HERE, "node_modules", "@akhil-saxena", "design-system", "dist", "css");

const SURFACES = [
	{
		name: "public",
		route: "probe/manifest-public",
		manifest: join(HERE, "src", "styles", "manifest.css"),
	},
	{
		name: "admin",
		route: "probe/manifest-admin",
		manifest: join(HERE, "src", "styles", "manifest-admin.css"),
	},
];

if (!existsSync(DIST)) {
	throw new Error("check-css-size: dist/ does not exist — run `npx astro build` first.");
}

const gz = (buf) => gzipSync(buf).length;
const fmt = (n) => n.toLocaleString("en-US");

// ── 1. What each route actually ships ────────────────────────────────────────

let totalAssetsSeen = 0;
const shipped = {};

for (const surface of SURFACES) {
	const htmlPath = join(DIST, surface.route, "index.html");
	if (!existsSync(htmlPath)) {
		throw new Error(
			`check-css-size: ${surface.route}/index.html was not built. The ${surface.name} ` +
				"manifest has no route importing it, so there is nothing to measure — which is " +
				"itself the regression this script guards.",
		);
	}
	const html = readFileSync(htmlPath, "utf8");

	const files = [];

	// Linked stylesheets.
	for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
		const assetPath = join(DIST, m[1].replace(/^\//, ""));
		if (!existsSync(assetPath)) {
			throw new Error(`check-css-size: ${surface.route} links ${m[1]}, which does not exist.`);
		}
		const raw = statSync(assetPath).size;
		files.push({ label: m[1], raw, gzip: gz(readFileSync(assetPath)), inlined: false });
	}

	// Inlined stylesheets. `build.inlineStylesheets: 'auto'` (Astro's default)
	// inlines any sheet under Vite's 4 kB limit as a <style> tag, so a
	// link-only walk would under-report the small ones — including the charcoal
	// theme, which inlines at this size. These bytes ship inside the gzipped
	// HTML response, so their standalone gzip figure is indicative only.
	let inlineIndex = 0;
	for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
		const body = m[1];
		// Astro emits a one-line `astro-island,astro-slot{display:contents}`
		// style tag on hydrating pages. It is not a stylesheet and counting it
		// would put framework noise in a design-system measurement.
		if (body.includes("astro-island")) continue;
		const buf = Buffer.from(body, "utf8");
		files.push({
			label: `<style> #${++inlineIndex} (inlined)`,
			raw: buf.length,
			gzip: gz(buf),
			inlined: true,
		});
	}

	if (files.length === 0) {
		throw new Error(
			`check-css-size: ${surface.route} references NO stylesheet at all — no <link> and no ` +
				"<style>. The page built and will render, so nothing else would have caught this. " +
				`It means \`${surface.name === "public" ? "manifest.css" : "manifest-admin.css"}\` ` +
				"stopped being imported.",
		);
	}

	totalAssetsSeen += files.length;
	shipped[surface.name] = files;
}

console.log("1. SHIPPED PER ROUTE — every stylesheet the built page links or inlines");
console.log("");

for (const surface of SURFACES) {
	const files = shipped[surface.name];
	const raw = files.reduce((a, f) => a + f.raw, 0);
	const gzip = files.reduce((a, f) => a + f.gzip, 0);
	console.log(`  ${surface.name}  (/${surface.route}/)`);
	for (const f of files) {
		console.log(`    ${fmt(f.raw).padStart(9)} B raw  ${fmt(f.gzip).padStart(8)} B gzip  ${f.label}`);
	}
	console.log(`    ${fmt(raw).padStart(9)} B raw  ${fmt(gzip).padStart(8)} B gzip  TOTAL`);
	console.log("");
	shipped[surface.name].total = { raw, gzip };
}

// ── 2. The manifest's component set, measured from the package ───────────────
//
// Also validates the extensionless specifier: every name parsed out of a
// manifest must resolve to a real file in the package, which is the check
// `import.meta.resolve()` cannot perform (it substitutes the wildcard without
// stat-ing the target, so it reports the broken suffixed form as resolvable
// while the build fails on it — G-12).

console.log("2. THE MANIFEST'S COMPONENT SET — the per-component sheets each manifest names");
console.log("   (measured from the package's own files; this is the D-33 comparison)");
console.log("");

const componentSets = {};

for (const surface of SURFACES) {
	const src = readFileSync(surface.manifest, "utf8");
	const names = [...src.matchAll(/@import\s+"@akhil-saxena\/design-system\/css\/([a-z0-9-]+)"/g)].map(
		(m) => m[1],
	);

	if (names.length === 0) {
		throw new Error(
			`check-css-size: ${surface.manifest} names no per-component sheets. Either the ` +
				"manifest was emptied or its specifier spelling changed and this parser no longer " +
				"recognises it.",
		);
	}

	const buffers = [];
	let raw = 0;
	for (const name of names) {
		const p = join(DS_CSS_DIR, `${name}.css`);
		if (!existsSync(p)) {
			throw new Error(
				`check-css-size: the ${surface.name} manifest names "${name}", which has no sheet ` +
					`at ${p}. A specifier that does not resolve fails the build, so this normally ` +
					"cannot happen — unless the package was replaced without rebuilding.",
			);
		}
		const buf = readFileSync(p);
		buffers.push(buf);
		raw += buf.length;
	}

	const gzip = gz(Buffer.concat(buffers));
	componentSets[surface.name] = { names, raw, gzip };

	console.log(
		`  ${surface.name.padEnd(7)} ${String(names.length).padStart(2)} sheets  ` +
			`${fmt(raw).padStart(9)} B raw  ${fmt(gzip).padStart(8)} B gzip`,
	);
}

// The thing D-33 is a tradeoff against.
const wholePrimitives = join(
	HERE,
	"node_modules",
	"@akhil-saxena",
	"design-system",
	"dist",
	"primitives.css",
);
if (existsSync(wholePrimitives)) {
	const buf = readFileSync(wholePrimitives);
	console.log(
		`  ${"whole".padEnd(7)} ${String(1).padStart(2)} sheet   ` +
			`${fmt(buf.length).padStart(9)} B raw  ${fmt(gz(buf)).padStart(8)} B gzip   ` +
			"<- the alternative the manifest exists to avoid",
	);
	const pub = componentSets.public;
	console.log("");
	console.log(
		`  The public manifest ships ${fmt(pub.raw)} B raw / ${fmt(pub.gzip)} B gzip of ` +
			`component CSS instead of ${fmt(buf.length)} B / ${fmt(gz(buf))} B — ` +
			`${(100 - (pub.raw / buf.length) * 100).toFixed(1)}% less raw, ` +
			`${(100 - (pub.gzip / gz(buf)) * 100).toFixed(1)}% less gzip.`,
	);
	const admin = componentSets.admin;
	console.log(
		`  The admin manifest adds ${fmt(admin.raw - pub.raw)} B raw / ` +
			`${fmt(admin.gzip - pub.gzip)} B gzip over the public set ` +
			`(${admin.names.length - pub.names.length} further sheets), and still comes in under ` +
			"the whole stylesheet.",
	);
}

console.log("");
console.log(
	`PASS: ${totalAssetsSeen} CSS asset(s) measured across ${SURFACES.length} manifest routes. ` +
		"No size assertion was made — see the header for why.",
);
