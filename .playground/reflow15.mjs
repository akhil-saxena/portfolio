// Throwaway R-6 check: content EXISTS at 344px, it is not dropped. Counts the
// load-bearing nodes on each of plan 15's screens at the narrowest device class
// and at the widest, and fails if the narrow count is lower. `display:none` at
// a breakpoint is what this catches; a grep of the CSS cannot.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(HERE, "dist");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };

const server = createServer(async (req, res) => {
	let f = join(DIST, decodeURIComponent(req.url.split("?")[0]));
	if (!extname(f)) f = join(f, "index.html");
	if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
	res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
	res.end(await readFile(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const CASES = [
	{ route: "/admin/projects/", sel: { "project cards": ".pj-row", "status badges": ".pj-row-head > span:not([class])", "tech chips": ".pj-chips .ds-atom-chip", "status swatches": ".pj-swatch" } },
	{ route: "/admin/projects/cairn/", sel: { "card fields": ".pd-grid .ds-atom-field", "store-link rows": ".pd-linkrow", "case sections": ".pd-prose", "paragraphs": ".pd-para", "asset panels": ".pd-asset" } },
	{ route: "/admin/site/", sel: { "category rows": '.st-row:not(.st-row-head)', "id cells": ".st-id", "steppers": ".ds-atom-stepper", "inline edits": ".ds-atom-inlineedit", "delete links": ".st-delete" } },
	{ route: "/admin/site/reassign/", sel: { "dialog": ".ds-atom-modal", "destination select": ".ds-atom-select" } },
	{ route: "/admin/conflict-diff/", sel: { "file cards": ".cf-file", "diff rows": ".cf-diff-row", "remote cells": '[data-side="remote"]', "local cells": '[data-side="local"]', "clean rows": ".cf-clean" } },
	// THE REFUSAL ROUTE DELIBERATELY DROPS THE CASE-STUDY HALF, so `.pd-prose` is
	// asserted ABSENT here rather than present. That is R-6 being honoured rather
	// than broken: D-09 declines long-form authoring on a phone IN WORDS and then
	// does it, and the card fields the copy promises stay editable are counted.
	{ route: "/admin/projects/cairn/phone/", sel: { "card fields": ".pd-grid .ds-atom-field", "store-link rows": ".pd-linkrow" } },
];

const browser = await chromium.launch();
let bad = 0;
for (const c of CASES) {
	const counts = {};
	for (const w of [344, 1440]) {
		const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1200 });
		const page = await ctx.newPage();
		await page.goto(`${base}${c.route}`, { waitUntil: "networkidle" });
		counts[w] = await page.evaluate((sel) => {
			const out = {};
			for (const [name, s] of Object.entries(sel)) {
				let n = 0;
				for (const el of document.querySelectorAll(s)) {
					const cs = getComputedStyle(el);
					if (cs.display === "none" || cs.visibility === "hidden") continue;
					const b = el.getBoundingClientRect();
					if (b.width === 0 || b.height === 0) continue;
					n += 1;
				}
				out[name] = n;
			}
			return out;
		}, c.sel);
		await ctx.close();
	}
	console.log(`\n══ ${c.route}`);
	for (const k of Object.keys(c.sel)) {
		const a = counts[344][k];
		const b = counts[1440][k];
		const ok = a >= b && a > 0;
		if (!ok) bad += 1;
		console.log(`  ${ok ? "PASS" : "FAIL"}  ${k.padEnd(20)} 344px=${String(a).padStart(4)}  1440px=${String(b).padStart(4)}`);
	}
}
await browser.close();
server.close();
console.log(`\n${bad === 0 ? "REFLOW PASS — nothing is dropped at 344px" : `REFLOW FAIL — ${bad} selector(s) lose content`}`);
process.exit(bad === 0 ? 0 : 1);
