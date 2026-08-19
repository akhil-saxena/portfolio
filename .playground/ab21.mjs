// Did the ladder CAUSE /home-act2/'s overflow, or expose one that was already
// there? Same build, same browser, one CSS variable overridden at runtime —
// no file is touched, so nothing can drift between the two readings.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "playwright";
const DIST = "/Users/akhilsaxena/Documents/Personal/Repositories/portfolio/.playground/dist";
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
	let f = join(DIST, decodeURIComponent(req.url.split("?")[0]));
	if (!extname(f)) f = join(f, "index.html");
	if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
	res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
	res.end(await readFile(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch();
const ROUTES = ["/", "/work/", "/photos/", "/home-act2/"];
for (const route of ROUTES) {
	const out = [];
	for (const w of [344, 390]) {
		for (const gutter of [null, "48px"]) {
			const c = await b.newContext({ viewport: { width: w, height: 882 }, hasTouch: true, reducedMotion: "reduce" });
			const p = await c.newPage();
			await p.goto(`${base}${route}`, { waitUntil: "networkidle" });
			if (gutter) await p.addStyleTag({ content: `.pub-shell{--pub-gutter:${gutter} !important}` });
			await p.waitForTimeout(120);
			const doc = await p.evaluate(() => document.documentElement.scrollWidth);
			out.push(`${w}@${gutter ?? "ladder"}=${doc}`);
			await c.close();
		}
	}
	console.log(`${route.padEnd(14)} ${out.join("  ")}`);
}
await b.close(); server.close();
