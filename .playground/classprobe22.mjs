// classprobe22.mjs — plan 00-22 EXTRA FIX.
// Measures, in a real browser, whether `className` on a design-system component
// actually lands, and what each of the two components does with it. A grep
// proving the source says `className` is not proof the style applied.
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
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
for (const [route, cardSel, chipSel] of [
	["/work/", ".wk-grid > *", ".wk-tags > *"],
	["/work-recolour/", ".wr-grid > *", null],
]) {
	await p.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle" });
	const out = await p.evaluate(([cardSel, chipSel]) => {
		const card = document.querySelector(cardSel);
		const chip = chipSel ? document.querySelector(chipSel) : null;
		const probe = document.createElement("div");
		document.body.appendChild(probe);
		const tok = (n) => { probe.style.color = `var(${n})`; return getComputedStyle(probe).color; };
		const cs = getComputedStyle(card);
		const r = {
			cardClassAttr: card.getAttribute("class"),
			cardBorder: cs.borderTopColor,
			cardDisplay: cs.display,
			cardFlexDirection: cs.flexDirection,
			cardInlineDisplay: card.style.display || "(none)",
			"--wire": tok("--wire"), "--rule": tok("--rule"), "--cream-3": tok("--cream-3"),
		};
		if (chip) {
			const ch = getComputedStyle(chip);
			Object.assign(r, {
				chipClassAttr: chip.getAttribute("class"),
				chipKeepsAtomClass: chip.classList.contains("ds-atom-chip"),
				chipBorder: ch.borderTopColor,
				chipBackground: ch.backgroundColor,
				chipColor: ch.color,
				chipInteractive: chip.hasAttribute("data-interactive"),
			});
		}
		probe.remove();
		return r;
	}, [cardSel, chipSel]);
	console.log(route, JSON.stringify(out, null, 2));
}
await b.close(); server.close();
