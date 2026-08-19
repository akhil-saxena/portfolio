// D-15-1 measurement harness. Reports, for every device class, the BOX HEIGHT of
// each .adm-group-link and the gap between the bottom of its text line box and
// its bottom border edge — the second number is what proves the DRAWN underline
// did not move when the HIT AREA grew. A grep can see neither.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(HERE, "dist");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
	let p = decodeURIComponent(req.url.split("?")[0]);
	let f = join(DIST, p);
	if (!extname(f)) f = join(f, "index.html");
	if (!existsSync(f)) { res.writeHead(404); res.end("nope"); return; }
	res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
	res.end(await readFile(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const CLASSES = [
	{ name: "344 folded", w: 344, h: 882, coarse: true },
	{ name: "390 phone", w: 390, h: 844, coarse: true },
	{ name: "673 foldable", w: 673, h: 620, coarse: true },
	{ name: "768 tablet-port", w: 768, h: 1024, coarse: true },
	{ name: "1024 tablet-land", w: 1024, h: 768, coarse: true },
	{ name: "1440 laptop", w: 1440, h: 900, coarse: false },
];

const browser = await chromium.launch();
console.log("  class                pointer  n  heights            text-bottom→border gap");
for (const c of CLASSES) {
	const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: c.coarse, reducedMotion: "reduce" });
	const page = await ctx.newPage();
	await page.goto(`${base}/admin/`, { waitUntil: "networkidle" });
	const r = await page.evaluate(() => {
		const out = [];
		for (const a of document.querySelectorAll(".adm-group-link")) {
			const box = a.getBoundingClientRect();
			// The TEXT's own rect, via a Range over the text node — this is the drawn
			// glyph run, independent of how tall the element's box is.
			const range = document.createRange();
			range.selectNodeContents(a);
			const t = range.getBoundingClientRect();
			const cs = getComputedStyle(a);
			out.push({
				h: Math.round(box.height * 10) / 10,
				textH: Math.round(t.height * 10) / 10,
				// distance from the bottom of the glyph run to the border edge
				gap: Math.round((box.bottom - t.bottom) * 10) / 10,
				fs: cs.fontSize,
				display: cs.display,
				border: cs.borderBottomWidth + " " + cs.borderBottomColor,
			});
		}
		return { pointer: matchMedia("(pointer: coarse)").matches ? "coarse" : "fine", links: out };
	});
	const hs = r.links.map((l) => l.h).join("/");
	const gaps = r.links.map((l) => l.gap).join("/");
	const under = r.links.filter((l) => l.h < 44).length;
	console.log(`  ${c.name.padEnd(20)} ${r.pointer.padEnd(8)} ${r.links.length}  ${hs.padEnd(18)} ${gaps}${c.coarse ? (under ? `   UNDER44=${under}` : "   ok") : "   (floor n/a)"}`);
	if (c.name === "390 phone") console.log("      detail:", JSON.stringify(r.links[0]));
	await ctx.close();
}
await browser.close();
server.close();
