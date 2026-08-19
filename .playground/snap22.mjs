// snap22.mjs — plan 00-22. A geometry + text snapshot of a route at six device
// classes, for proving the HomeAct2 extraction is a refactor and not a redesign.
// Astro rehashes data-astro-cid-* when a rule moves file, so byte-comparing the
// HTML would report a difference that is not a visual one. This compares what a
// reviewer would actually see: every element's box and its text.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "playwright";
const DIST = "/Users/akhilsaxena/Documents/Personal/Repositories/portfolio/.playground/dist";
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
	let f = join(DIST, decodeURIComponent(req.url.split("?")[0]));
	if (!extname(f)) f = join(f, "index.html");
	if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
	res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
	res.end(await readFile(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const CLASSES = [[344,882],[390,844],[673,620],[768,1024],[1024,768],[1440,900]];
const route = process.argv[2];
const out = process.argv[3];
const b = await chromium.launch();
const lines = [];
for (const [w, h] of CLASSES) {
	const c = await b.newContext({ viewport: { width: w, height: h } });
	const p = await c.newPage();
	await p.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle" });
	const rows = await p.evaluate(() => {
		const r = [];
		for (const el of document.querySelectorAll("body *")) {
			const b = el.getBoundingClientRect();
			const cs = getComputedStyle(el);
			const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(" ").replace(/\s+/g, " ");
			r.push([el.tagName, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height),
				cs.color, cs.backgroundColor, cs.fontSize, cs.fontFamily.slice(0,24), cs.display, txt].join("|"));
		}
		return r;
	});
	lines.push(`### ${w}x${h} (${rows.length} boxes)`, ...rows);
	await c.close();
}
await b.close(); server.close();
await writeFile(out, lines.join("\n") + "\n");
console.log(`wrote ${out} — ${lines.length} lines`);
