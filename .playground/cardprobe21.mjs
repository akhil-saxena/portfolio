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
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto(`http://127.0.0.1:${server.address().port}/work/`, { waitUntil: "networkidle" });
console.log(await p.evaluate(() => {
	const card = document.querySelector(".wk-grid > *");
	const chip = document.querySelector(".wk-tags > *");
	const badge = document.querySelector(".wk-card-top > span:last-child");
	const cs = getComputedStyle(card);
	const probe = document.createElement("div");
	document.body.appendChild(probe);
	const tok = (n) => { probe.style.color = `var(${n})`; return getComputedStyle(probe).color; };
	const out = {
		classAttrPassedToCard: card.getAttribute("class"),
		anyElementWithWkCard: document.querySelectorAll(".wk-card").length,
		anyElementWithWkChip: document.querySelectorAll(".wk-chip").length,
		cardBorderColour: cs.borderTopColor,
		cardDisplay: cs.display,
		cardFlexDirection: cs.flexDirection,
		chipClass: chip.getAttribute("class"),
		chipBorderColour: getComputedStyle(chip).borderTopColor,
		badgeClass: badge.getAttribute("class"),
		badgeHasInlineStyle: badge.hasAttribute("style"),
		"--wire": tok("--wire"),
		"--rule": tok("--rule"),
	};
	probe.remove();
	return out;
}, null), );
await b.close(); server.close();
