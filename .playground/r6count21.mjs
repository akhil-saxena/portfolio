// R-6: content exists at 344, it is not dropped. §6 rule 1 — every section,
// every project and every filter category exists on the folded cover screen.
// Counted in a rendered browser at 344 AND 1440 and compared, because a CSS
// `display:none` is invisible to a grep of the source.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const DIST = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
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

// SELECTORS ARE THE DS CLASS, NOT THE PAGE'S. `<Card class="wk-card">` renders
// `class="ds-atom-card"` — the design system drops the `class` prop — so
// `.wk-card` matches ZERO elements and a count keyed on it reads 0 at BOTH
// widths and looks like agreement. The first run of this script did exactly
// that. Badge is worse: it renders an unclassed <span> with inline styles, so it
// can only be reached positionally. Recorded as a finding, not worked around.
const SUBJECTS = {
	"/work/": { "employment rows": ".wk-row", "project cards": ".wk-grid > .ds-atom-card", sections: "section", "status badges": ".wk-card-top > span:last-child", "tech chips": ".wk-tags > .ds-atom-chip", "legend rows": ".wk-legend-row", "project titles": ".wk-grid .ds-atom-heading" },
	"/photos/": { "filter categories": ".ph-pill", "photo tiles": ".ph-tile", masonry: ".ph-masonry", header: ".ph-header" },
	"/home-act2/": { "work entries": ".ha-entry", sections: "section", "strip links": ".ha-strip a" },
	"/": { sections: "section", "all links": "a[href]" },
};
const b = await chromium.launch();
let bad = 0;
for (const [route, subs] of Object.entries(SUBJECTS)) {
	const read = async (w, h, touch) => {
		const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, reducedMotion: "reduce" });
		const p = await c.newPage();
		await p.goto(`${base}${route}`, { waitUntil: "networkidle" });
		const r = await p.evaluate((subs) => {
			const out = {};
			for (const [k, sel] of Object.entries(subs)) {
				// VISIBLE, not merely present: a node hidden by CSS is dropped content.
				out[k] = [...document.querySelectorAll(sel)].filter((e) => {
					const cs = getComputedStyle(e);
					if (cs.display === "none" || cs.visibility === "hidden") return false;
					const bb = e.getBoundingClientRect();
					return bb.width > 0 || bb.height > 0;
				}).length;
			}
			return out;
		}, subs);
		await c.close();
		return r;
	};
	const at344 = await read(344, 882, true);
	const at1440 = await read(1440, 900, false);
	console.log(`\n══ ${route}`);
	for (const k of Object.keys(subs)) {
		const ok = at344[k] === at1440[k] && at344[k] > 0;
		if (!ok) bad++;
		console.log(`  ${ok ? "OK  " : "DROP"}  ${k.padEnd(20)} 344=${String(at344[k]).padStart(3)}  1440=${String(at1440[k]).padStart(3)}`);
	}
}
await b.close(); server.close();
console.log(`\n${bad === 0 ? "R-6 PASS — nothing is dropped at 344" : `R-6 FAIL — ${bad} subject(s) differ`}`);
process.exit(bad === 0 ? 0 : 1);
