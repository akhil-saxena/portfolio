// navprobe22.mjs — plan 00-22. How much vertical space sits ABOVE the first
// section of a public page, per device class, and is the nav sticky?
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
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
const b = await chromium.launch();
const route = process.argv[2] ?? "/work/";
console.log("route", route);
for (const [w, h] of CLASSES) {
	const c = await b.newContext({ viewport: { width: w, height: h } });
	const p = await c.newPage();
	await p.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle" });
	console.log(w + "x" + h, JSON.stringify(await p.evaluate(() => {
		const bar = document.querySelector(".pub-bar");
		const main = document.querySelector(".pub-main");
		const shell = document.querySelector(".pub-shell");
		const cs = getComputedStyle(main);
		const probe = document.createElement("div"); document.body.appendChild(probe);
		probe.style.height = "100svh"; const svh = probe.getBoundingClientRect().height;
		probe.style.height = "100vh"; const vh = probe.getBoundingClientRect().height;
		probe.remove();
		return {
			barH: +bar.getBoundingClientRect().height.toFixed(1),
			barPos: getComputedStyle(bar).position,
			appbarPos: getComputedStyle(bar.firstElementChild).position,
			mainPadTop: cs.paddingTop,
			mainTopY: +main.getBoundingClientRect().top.toFixed(1),
			firstSectionTopY: +(main.firstElementChild?.getBoundingClientRect().top ?? -1).toFixed(1),
			shellPadTop: getComputedStyle(shell).paddingTop,
			svh, vh, innerH: window.innerHeight,
		};
	})));
	await c.close();
}
await b.close(); server.close();
