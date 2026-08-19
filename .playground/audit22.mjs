// audit22.mjs — plan 00-22. The two things a focusable-box audit does not cover,
// measured in a real browser at all six device classes rather than asserted:
//
//   1. STATE A'S HEIGHT AGAINST THE VIEWPORT. §5.2's binding case is 673x620,
//      where the contract's own derived table says a 3:2 arrangement overflows
//      by ~44px. An overflow here is a COMPOSITION failure to fix, not a
//      mechanism failure — so it is reported as a number, per class.
//
//   2. THE DEPARTURE. Scroll by exactly one viewport height and assert the
//      photos section's bottom edge is at or above the viewport top. That is the
//      exact, enforceable half of the user's sentence, and it is the assertion
//      the 60svh negative control has to break.
//
// It also reports doc-vs-viewport width (R-6 horizontal scroll), whether the
// six peek tiles are all painted and non-degenerate, and the computed snap
// properties — because plan 00-21 shipped a rail that DECLARED snapping and did
// not snap, and only a getComputedStyle probe caught it. A grep on the source
// passes the broken version.
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

const CLASSES = [
	// The five coarse classes and the one fine one — pointer type is resolved by
	// device, never by width (§2), so class 5 (a 1024px tablet) is coarse and
	// class 6 (a 1440px laptop) is not. hasTouch is what makes `pointer: coarse`
	// match in Chromium; without it a touch-only rule reads as absent.
	["1 folded cover", 344, 882, true], ["2 phone", 390, 844, true], ["3 foldable narrow", 673, 620, true],
	["4 tablet portrait", 768, 1024, true], ["5 tablet landscape", 1024, 768, true], ["6 desktop", 1440, 900, false],
];
const REDUCED = process.env.RM === "reduce" ? "reduce" : "no-preference";
const b = await chromium.launch();
let fail = 0;
const rows = [];
for (const [name, w, h, coarse] of CLASSES) {
	const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: coarse, isMobile: false, reducedMotion: REDUCED === "reduce" ? "reduce" : "no-preference" });
	const p = await c.newPage();
	await p.goto(`http://127.0.0.1:${port}/home/`, { waitUntil: "networkidle" });
	const r = await p.evaluate(() => {
		const a = document.querySelector("#photos");
		const work = document.querySelector("#work");
		const res = document.querySelector("#resume");
		const probe = document.createElement("div"); document.body.appendChild(probe);
		probe.style.cssText = "position:absolute;top:0;left:0;width:1px;height:100svh";
		const svh = probe.getBoundingClientRect().height; probe.remove();
		const ar = a.getBoundingClientRect();
		const tiles = [...document.querySelectorAll(".hm-tile")].map((t) => {
			const b = t.getBoundingClientRect();
			const img = t.querySelector("img");
			return { w: Math.round(b.width), h: Math.round(b.height),
				painted: img.complete && img.naturalWidth > 0, pos: getComputedStyle(img).objectPosition };
		});
		return {
			svh,
			aTop: Math.round(ar.top), aH: Math.round(ar.height), aBottom: Math.round(ar.bottom),
			workTop: Math.round(work.getBoundingClientRect().top),
			docW: document.documentElement.scrollWidth, vpW: window.innerWidth,
			docH: document.documentElement.scrollHeight,
			tiles,
			snapType: getComputedStyle(document.scrollingElement).scrollSnapType,
			snapPhotos: getComputedStyle(a).scrollSnapAlign,
			snapWork: getComputedStyle(work).scrollSnapAlign,
			scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
			smWork: getComputedStyle(work).scrollMarginTop,
			// PROOF THE scroll-margin-top DECLARATION ACTUALLY REACHES #work. Its
			// honest value is 0 and the CSS initial value is also 0, so reading it
			// proves nothing at all. Overriding the custom property with an INLINE
			// style on <html> — which outranks the stylesheet rule that sets it —
			// makes the declaration observable: if the rule matched, #work's
			// computed scroll-margin-top becomes the probe value.
			smWorkProbe: (() => {
				document.documentElement.style.setProperty("--hm-sticky-nav", "37px");
				const v = getComputedStyle(work).scrollMarginTop;
				document.documentElement.style.removeProperty("--hm-sticky-nav");
				return v;
			})(),
			titleSize: getComputedStyle(document.querySelector("h1")).fontSize,
			titleFont: getComputedStyle(document.querySelector("h1")).fontFamily.split(",")[0],
			promptTag: document.querySelector(".hm-prompt").tagName,
			promptHref: document.querySelector(".hm-prompt").getAttribute("href"),
			promptBox: Math.round(document.querySelector(".hm-prompt").getBoundingClientRect().height),
			hidden: {
				photosDisplay: getComputedStyle(a).display, photosVis: getComputedStyle(a).visibility,
				photosAria: a.getAttribute("aria-hidden"), photosInert: a.hasAttribute("inert"),
				workAria: work.getAttribute("aria-hidden"), resAria: res.getAttribute("aria-hidden"),
			},
			names: { photos: a.getAttribute("aria-label"), work: work.getAttribute("aria-labelledby"), res: res.getAttribute("aria-labelledby") },
			domOrder: [...document.querySelectorAll("#photos,#work,#resume")].map((e) => e.id).join(">"),
		};
	});
	// THE DEPARTURE — scroll by exactly one viewport height, no smooth easing,
	// then read the photos section's bottom edge in viewport coordinates.
	const dep = await p.evaluate((h) => {
		document.documentElement.style.scrollBehavior = "auto";
		window.scrollTo(0, h);
		return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res({
			scrollY: Math.round(window.scrollY),
			photosBottom: Math.round(document.querySelector("#photos").getBoundingClientRect().bottom),
			workTop: Math.round(document.querySelector("#work").getBoundingClientRect().top),
		}))));
	}, h);
	const departed = dep.photosBottom <= 0;
	const fits = r.aBottom <= r.svh;
	const hScroll = r.docW > r.vpW;
	const allPainted = r.tiles.length === 6 && r.tiles.every((t) => t.painted && t.w >= 60 && t.h >= 40);
	if (!departed || hScroll || !allPainted) fail = 1;
	rows.push({ name, vp: `${w}x${h}`, r, dep, departed, fits, hScroll, allPainted });
	console.log(
		`${name.padEnd(20)} ${(w + "x" + h).padEnd(9)}` +
		` svh=${r.svh} stateA: top=${r.aTop} h=${r.aH} bottom=${r.aBottom} ${fits ? "FITS" : "OVER by " + (r.aBottom - r.svh)}` +
		` | tile=${r.tiles[0].w}x${r.tiles[0].h}` +
		` | doc=${r.docW}/${r.vpW}${hScroll ? " H-SCROLL" : ""}` +
		` | after scroll ${dep.scrollY}: photosBottom=${dep.photosBottom} workTop=${dep.workTop} ${departed ? "DEPARTED" : "*** NOT DEPARTED ***"}` +
		` | docH=${r.docH} stateB=${r.docH - r.aBottom}px`,
	);
	await c.close();
}
const f = rows[0].r;
console.log("\nsnap:", JSON.stringify({ type: f.snapType, photos: f.snapPhotos, work: f.snapWork, behavior: f.scrollBehavior, scrollMarginTopWork: f.smWork, reducedMotion: REDUCED }));
console.log("smWorkProbe (37px = the rule reaches #work):", f.smWorkProbe);
console.log("title:", JSON.stringify(rows.map((x) => x.vp + "=" + x.r.titleSize)), rows[0].r.titleFont);
console.log("prompt:", JSON.stringify({ tag: f.promptTag, href: f.promptHref, boxes: rows.map((x) => x.vp + "=" + x.r.promptBox + "px") }));
console.log("a11y:", JSON.stringify(rows[0].r.hidden), JSON.stringify(rows[0].r.names), "domOrder=" + rows[0].r.domOrder);
console.log("focal:", JSON.stringify(rows[5].r.tiles.map((t) => t.pos)));
console.log(fail ? "\nAUDIT22: FAIL" : "\nAUDIT22: PASS — six classes, departure + R-6 + six tiles painted");
await b.close(); server.close();
process.exit(fail);
