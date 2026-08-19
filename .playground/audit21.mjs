// Plan 00-21's audit. Extends audit15.mjs with the two things it could not do:
//
//   1. NO DE-DUPLICATION. audit15.mjs de-duplicates its PRINTED offender lines
//      on `tag + class`, so 17 undersized boxes print as 3 lines and every
//      unclassed anchor hides behind the AppBar brand link. Its `under44=` COUNT
//      is raw and correct; only the listing under-reports. Plan 00-20 re-measured
//      without the de-duplication and found 11 of its own plus 6 belonging to
//      D-16-1. This prints every box.
//   2. NAMES THE OVERFLOWING ELEMENT. audit15.mjs reports doc-versus-viewport but
//      not WHICH box is wider than the viewport. This walks every element whose
//      right edge exceeds the viewport, reports the widest, and reports its
//      ancestor chain — because "find it in the browser, not by reading CSS" is
//      how this phase avoided two wrong measurements already.
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
	{ name: "673 foldable-unfolded", w: 673, h: 620, coarse: true },
	{ name: "768 tablet-portrait", w: 768, h: 1024, coarse: true },
	{ name: "1024 tablet-landscape", w: 1024, h: 768, coarse: true },
	{ name: "1440 laptop", w: 1440, h: 900, coarse: false },
];

const ROUTES = process.argv.slice(2);
if (ROUTES.length === 0) throw new Error("usage: node audit21.mjs /work/ ...");

const browser = await chromium.launch();
let failures = 0;

for (const route of ROUTES) {
	console.log(`\n══ ${route}`);
	for (const c of CLASSES) {
		const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: c.coarse, isMobile: false, reducedMotion: "reduce" });
		const page = await ctx.newPage();
		await page.goto(`${base}${route}`, { waitUntil: "networkidle" });

		const r = await page.evaluate(() => {
			const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]';
			const path = (el) => { const out = []; let n = el; while (n && n !== document.body) { out.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).join(".") : "")); n = n.parentElement; } return out.join(" > "); };

			const under = [];
			for (const el of document.querySelectorAll(sel)) {
				let b = el.getBoundingClientRect();
				if (b.width === 0 && b.height === 0) continue;
				if (getComputedStyle(el).display === "none") continue;
				if (el.classList.contains("ds-visually-hidden")) {
					const lbl = el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
					if (!lbl) continue;
					b = lbl.getBoundingClientRect();
				}
				if (b.height < 44) under.push({ h: Math.round(b.height * 10) / 10, tag: el.tagName.toLowerCase(), cls: String(el.className || ""), txt: (el.textContent || "").trim().slice(0, 30), path: path(el) });
			}

			// Every box whose right edge is past the viewport, widest first.
			//
			// A BOX INSIDE A HORIZONTAL SCROLL CONTAINER IS NOT AN OVERFLOW. The
			// Photos filter rail deliberately puts eight pills past the viewport's
			// right edge and scrolls them itself; the DOCUMENT does not move, which
			// is the whole point of a rail. Reporting those as overflow made this
			// script's first run flag its own fix. Skip any box with a scrolling
			// ancestor and say which ancestor contained it.
			const vw = window.innerWidth;
			const scroller = (el) => {
				for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
					const ox = getComputedStyle(n).overflowX;
					if (ox === "auto" || ox === "scroll" || ox === "hidden") return n;
				}
				return null;
			};
			const over = [];
			const contained = [];
			for (const el of document.querySelectorAll("*")) {
				const b = el.getBoundingClientRect();
				if (b.width === 0 && b.height === 0) continue;
				if (b.right <= vw + 1) continue;
				const sc = scroller(el);
				const rec = { right: Math.round(b.right), w: Math.round(b.width), left: Math.round(b.left), path: path(el), txt: (el.textContent || "").trim().slice(0, 28) };
				if (sc) contained.push({ ...rec, by: path(sc) }); else over.push(rec);
			}
			over.sort((a, b) => b.right - a.right);
			return { docW: document.documentElement.scrollWidth, viewW: vw, under, over: over.slice(0, 8), overCount: over.length, containedCount: contained.length, containedBy: [...new Set(contained.map((c) => c.by))] };
		});

		const hScroll = r.docW > r.viewW + 1;
		const bad = (c.coarse && r.under.length > 0) || hScroll;
		if (bad) failures += 1;
		console.log(`  ${bad ? "FAIL" : "PASS"}  ${c.name.padEnd(24)} doc=${r.docW}/${r.viewW} under44=${String(r.under.length).padStart(3)}${hScroll ? `  H-SCROLL  overflowing-boxes=${r.overCount}` : ""}`);
		if (c.coarse) for (const u of r.under) console.log(`        ${String(u.h).padStart(6)}px  ${u.path}  "${u.txt}"`);
		for (const o of r.over) console.log(`        OVERFLOW right=${o.right} (w=${o.w} left=${o.left})  ${o.path}  "${o.txt}"`);
		if (r.containedCount) console.log(`        rail-contained (NOT overflow, doc unaffected): ${r.containedCount} box(es) inside ${r.containedBy.join(", ")}`);
		await ctx.close();
	}
}
await browser.close();
server.close();
console.log(`\n${failures === 0 ? "AUDIT21 PASS" : `AUDIT21 FAIL — ${failures} class/route combination(s)`}`);
process.exit(failures === 0 ? 0 : 1);
