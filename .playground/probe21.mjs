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
const browser = await chromium.launch();
for (const c of [{ n: "344", w: 344, h: 882, t: true }, { n: "390", w: 390, h: 844, t: true }, { n: "673", w: 673, h: 620, t: true }, { n: "768", w: 768, h: 1024, t: true }, { n: "1024", w: 1024, h: 768, t: true }, { n: "1440", w: 1440, h: 900, t: false }]) {
	const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: c.t, reducedMotion: "reduce" });
	const p = await ctx.newPage();
	await p.goto(`${base}/photos/`, { waitUntil: "networkidle" });
	const r = await p.evaluate(() => {
		const nav = document.querySelector(".ph-filters");
		const pills = [...document.querySelectorAll(".ph-pill")];
		const cs = getComputedStyle(nav);
		const rows = new Set(pills.map((x) => Math.round(x.getBoundingClientRect().top)));
		const active = document.querySelector('.ph-pill[data-active="true"]');
		const ab = getComputedStyle(active, "::before");
		const painted = pills.map((x) => { const b = getComputedStyle(x, "::before"); return b.content === "none" ? null : parseFloat(b.height); });
		return {
			pills: pills.length,
			labels: pills.map((x) => x.textContent.trim()),
			hitH: [...new Set(pills.map((x) => Math.round(x.getBoundingClientRect().height * 10) / 10))],
			paintH: [...new Set(painted)],
			minHit: Math.min(...pills.map((x) => x.getBoundingClientRect().height)),
			rows: rows.size,
			wrap: cs.flexWrap, snap: cs.scrollSnapType, ovx: cs.overflowX,
			scrollable: nav.scrollWidth > nav.clientWidth + 1,
			snapAlign: getComputedStyle(pills[0]).scrollSnapAlign,
			activeFill: ab.content === "none" ? getComputedStyle(active).backgroundColor : ab.backgroundColor,
			activeInk: getComputedStyle(active).color,
			navH: Math.round(nav.getBoundingClientRect().height),
			g11: (() => { const g = document.querySelector(".ph-g11"); const s = document.querySelector(".ph-g11-sample"); return { boxW: Math.round(g.getBoundingClientRect().width), boxRight: Math.round(g.getBoundingClientRect().right), sampleFont: getComputedStyle(s).fontSize, sampleLines: Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight)) }; })(),
		};
	});
	console.log(`${c.n.padEnd(5)} pointer=${c.t ? "coarse" : "fine "} pills=${r.pills} rows=${r.rows} wrap=${r.wrap.padEnd(6)} snap=${r.snap.padEnd(12)} ovx=${r.ovx.padEnd(7)} scrollable=${String(r.scrollable).padEnd(5)} snapAlign=${r.snapAlign.padEnd(6)} hit=${JSON.stringify(r.hitH)} paint=${JSON.stringify(r.paintH)} navH=${r.navH} minHit=${Math.round(r.minHit * 10) / 10}`);
	console.log(`      activeFill=${r.activeFill} activeInk=${r.activeInk}  g11: w=${r.g11.boxW} right=${r.g11.boxRight} font=${r.g11.sampleFont} lines=${r.g11.sampleLines}`);
	if (c.n === "344") console.log(`      labels: ${r.labels.join(" | ")}`);
	await ctx.close();
}
await browser.close(); server.close();
