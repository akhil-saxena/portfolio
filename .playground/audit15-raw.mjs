// Throwaway 44px / reflow audit for plan 15's routes. Serves dist/ over HTTP
// and walks every focusable box in a real browser at every device class in
// 00-RESPONSIVE-CONTRACT.md. A grep cannot see source order, an inherited line
// box, or a box that overflows its viewport — plan 14 found two real failures
// this way that greps reported clean.
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

// The six device classes, verbatim from 00-RESPONSIVE-CONTRACT.md. Five of the
// six are COARSE pointer; density keys off `pointer: fine`, never width.
const CLASSES = [
	{ name: "344 folded", w: 344, h: 882, coarse: true },
	{ name: "390 phone", w: 390, h: 844, coarse: true },
	{ name: "673 foldable-unfolded", w: 673, h: 620, coarse: true },
	{ name: "768 tablet-portrait", w: 768, h: 1024, coarse: true },
	{ name: "1024 tablet-landscape", w: 1024, h: 768, coarse: true },
	{ name: "1440 laptop", w: 1440, h: 900, coarse: false },
];

const ROUTES = process.argv.slice(2);
if (ROUTES.length === 0) throw new Error("usage: node audit15.mjs /admin/projects/ ...");

const browser = await chromium.launch();
let failures = 0;

for (const route of ROUTES) {
	console.log(`\n══ ${route}`);
	for (const c of CLASSES) {
		const ctx = await browser.newContext({
			viewport: { width: c.w, height: c.h },
			hasTouch: c.coarse,
			isMobile: false,
			reducedMotion: "reduce",
		});
		const page = await ctx.newPage();
		// Playwright's `hasTouch` drives `pointer: coarse` in Chromium.
		const errs = [];
		page.on("pageerror", (e) => errs.push(String(e)));
		page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
		await page.goto(`${base}${route}`, { waitUntil: "networkidle" });

		const r = await page.evaluate(() => {
			const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]';
			const under = [];
			for (const el of document.querySelectorAll(sel)) {
				let b = el.getBoundingClientRect();
				if (b.width === 0 && b.height === 0) continue;      // not rendered
				if (getComputedStyle(el).display === "none") continue;
				// A VISUALLY-HIDDEN INPUT IS NOT THE TARGET; ITS LABEL IS. The design
				// system's Checkbox and DataGrid selection cell both render a 1px
				// clipped <input class="ds-visually-hidden"> with the painted control
				// and the hit area on the wrapping <label>. Measuring the input would
				// report a 1px failure on every checkbox in the product and hide the
				// question that actually matters, which is whether the LABEL clears
				// the floor. So the box is swapped for the label's and the result is
				// still reported — a label under 44px is a real failure.
				if (el.classList.contains("ds-visually-hidden")) {
					const lbl = el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
					if (!lbl) continue;
					b = lbl.getBoundingClientRect();
				}
				if (b.height < 44) {
					under.push({
						h: Math.round(b.height * 10) / 10,
						tag: el.tagName.toLowerCase(),
						cls: (el.className && String(el.className).slice(0, 44)) || "",
						txt: (el.textContent || "").trim().slice(0, 34),
					});
				}
			}
			return {
				pointerCoarse: matchMedia("(pointer: coarse)").matches,
				pointerFine: matchMedia("(pointer: fine)").matches,
				density: document.documentElement.dataset.density,
				docW: document.documentElement.scrollWidth,
				viewW: window.innerWidth,
				focusables: document.querySelectorAll(sel).length,
				under,
			};
		});

		const hScroll = r.docW > r.viewW + 1;
		const expectFloor = c.coarse;
		const bad = (expectFloor && r.under.length > 0) || hScroll || errs.length > 0;
		if (bad) failures += 1;
		console.log(
			`  ${bad ? "FAIL" : "PASS"}  ${c.name.padEnd(24)} pointer=${r.pointerCoarse ? "coarse" : "fine"} ` +
				`density=${String(r.density).padEnd(11)} doc=${r.docW}/${r.viewW} ` +
				`focusables=${String(r.focusables).padStart(3)} under44=${String(r.under.length).padStart(3)}` +
				`${hScroll ? "  H-SCROLL" : ""}${errs.length ? `  ERRORS=${errs.length}` : ""}`,
		);
		if (expectFloor && r.under.length > 0) {
			const seen = new Set(); const NODEDUP = true;
			for (const u of r.under) {
				const k = `${u.tag}.${u.cls}`;
				if (!NODEDUP && seen.has(k)) continue;
				seen.add(k);
				console.log(`          ${String(u.h).padStart(5)}px  <${u.tag}> ${u.cls}  "${u.txt}"`);
			}
		}
		if (errs.length) for (const e of errs.slice(0, 3)) console.log(`          ERR ${e.slice(0, 120)}`);
		await ctx.close();
	}
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "AUDIT PASS" : `AUDIT FAIL — ${failures} class/route combination(s)`}`);
process.exit(failures === 0 ? 0 : 1);
