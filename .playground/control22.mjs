// control22.mjs — plan 00-22's negative control, plus the leak check.
//
// A CONTROL THAT DOES NOT BITE IS NOT A CONTROL. This one breaks state A's
// height budget — 100svh becomes 60svh — and asserts the departure FAILS at
// every one of the six classes. It then restores the file and compares SHA-256
// with the original, because a control that leaves the tree different from how
// it found it has quietly become a change.
//
// IT ASSERTS ON THE MEASURED RESULT, NEVER ON A grep OF THE DECLARATION.
// `grep -c` counts LINES rather than matches, and this phase already had a
// control nearly report a false result that way (plan 16, control 4).
//
// It also runs the two things that are not controls but are cheap here:
//   LEAK — /work, /photos, /home-act2 and a case study must have NO scroll-snap
//          container. home.astro reaches the document element through
//          `:global(html:has(.hm-a))`, and the whole point of the `:has()` is
//          that the rule cannot land on a page without a state A. Asserted
//          rather than assumed, because a stray snap container on another route
//          is exactly the kind of bug found six months later.
//   SNAP-OFF — snap removed at runtime, departure re-measured. Snap is an
//          enhancement, never the mechanism, and this is the test it has to pass.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const ROOT = "/Users/akhilsaxena/Documents/Personal/Repositories/portfolio/.playground";
const SRC = join(ROOT, "src/pages/home.astro");
const DIST = join(ROOT, "dist");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
const CLASSES = [[344,882,true],[390,844,true],[673,620,true],[768,1024,true],[1024,768,true],[1440,900,false]];
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

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

// ── 1. LEAK CHECK ──────────────────────────────────────────────────────────
console.log("── leak check: no other route may be a scroll-snap container ──");
let leak = 0;
for (const route of ["/", "/work/", "/photos/", "/home-act2/", "/work/cairn/", "/home/"]) {
	const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
	const p = await c.newPage();
	await p.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle" });
	const t = await p.evaluate(() => getComputedStyle(document.scrollingElement).scrollSnapType);
	const want = route === "/home/" ? "y" : "none";
	const ok = t === want;
	if (!ok) leak = 1;
	console.log(`  ${route.padEnd(16)} scroll-snap-type=${String(t).padEnd(6)} want=${want.padEnd(5)} ${ok ? "OK" : "*** LEAK ***"}`);
	await c.close();
}

// ── 2. SNAP IS NOT LOAD-BEARING ────────────────────────────────────────────
console.log("\n── snap removed at runtime: the departure must still hold ──");
let snapoff = 0;
for (const [w, h, coarse] of CLASSES) {
	const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: coarse, isMobile: false });
	const p = await c.newPage();
	await p.goto(`http://127.0.0.1:${port}/home/`, { waitUntil: "networkidle" });
	const r = await p.evaluate((h) => {
		const s = document.createElement("style");
		s.textContent = "html{scroll-snap-type:none !important}*{scroll-snap-align:none !important}";
		document.head.appendChild(s);
		document.documentElement.style.scrollBehavior = "auto";
		window.scrollTo(0, h);
		return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res({
			snap: getComputedStyle(document.scrollingElement).scrollSnapType,
			bottom: Math.round(document.querySelector("#photos").getBoundingClientRect().bottom),
		}))));
	}, h);
	if (r.bottom > 0) snapoff = 1;
	console.log(`  ${(w + "x" + h).padEnd(9)} snap=${r.snap.padEnd(5)} photosBottom=${r.bottom} ${r.bottom <= 0 ? "DEPARTED" : "*** NOT DEPARTED ***"}`);
	await c.close();
}

// ── 3. THE TWO NEGATIVE CONTROLS ───────────────────────────────────────────
//
// THE PLAN SPECIFIED ONE CONTROL AND IT TESTED A PROPERTY ITS OWN MUTATION
// COULD NOT BREAK. It said: change `100svh` to `60svh` and confirm the DEPARTURE
// assertion fails at every class. Run exactly as written it reported
// `departed` at all six — and the reason is arithmetic, not instrumentation. A
// SHORTER state A departs MORE easily, not less: one viewport of scroll clears
// a 60svh block with room to spare. The mutation is real and the assertion is
// real; they simply do not meet.
//
// State A being EXACTLY one viewport is two requirements wearing one
// declaration, and each fails in its own direction:
//
//   TOO SHORT -> the landing no longer shows one viewport of photographs. The
//                work band is already on screen before the reader scrolls, and
//                "just the homepage landing shows the photos section" is false.
//   TOO TALL  -> one viewport of scroll no longer clears state A. Photographs
//                are still on screen after the transition and "the photo section
//                moves fully up" is false.
//
// So there are two controls, one per direction, and each asserts on the
// property its own mutation actually breaks. Reporting the plan's version as a
// pass would have recorded a control that cannot fail.
//
// BOTH MEASURE WITH SNAP DISABLED. Proximity snap pulls to the work band's snap
// point and can park `photosBottom` at exactly 0 even when the budget is wrong —
// which is the enhancement masking the mechanism. The controls are testing the
// mechanism.
async function departures(disableSnap = true) {
	const out = [];
	for (const [w, h, coarse] of CLASSES) {
		const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: coarse, isMobile: false });
		const p = await c.newPage();
		await p.goto(`http://127.0.0.1:${port}/home/`, { waitUntil: "networkidle" });
		const r = await p.evaluate(([h, disableSnap]) => {
			if (disableSnap) {
				const s = document.createElement("style");
				s.textContent = "html{scroll-snap-type:none !important}*{scroll-snap-align:none !important}";
				document.head.appendChild(s);
			}
			const probe = document.createElement("div");
			probe.style.cssText = "position:absolute;top:0;left:0;width:1px;height:100svh";
			document.body.appendChild(probe);
			const svh = Math.round(probe.getBoundingClientRect().height);
			probe.remove();
			const a = document.querySelector("#photos");
			const rest = { svh, aH: Math.round(a.getBoundingClientRect().height), landingBottom: Math.round(a.getBoundingClientRect().bottom), workTopAtRest: Math.round(document.querySelector("#work").getBoundingClientRect().top) };
			document.documentElement.style.scrollBehavior = "auto";
			window.scrollTo(0, h);
			return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res({
				...rest, bottom: Math.round(a.getBoundingClientRect().bottom),
			}))));
		}, [h, disableSnap]);
		out.push({
			vp: `${w}x${h}`, ...r,
			departed: r.bottom <= 0,
			fillsView: r.landingBottom >= r.svh,
		});
		await c.close();
	}
	return out;
}

const before = sha(SRC);
const original = readFileSync(SRC, "utf8");
const NEEDLE = "min-height: calc(100svh - var(--hm-above));";
if (!original.includes(NEEDLE)) throw new Error("control22: the declaration under test is not in home.astro");
let bad = leak || snapoff;

async function control(label, replacement, predicate, what) {
	console.log(`\n── control: ${label} — must break "${what}" at every class ──`);
	let bit = true;
	try {
		await writeFile(SRC, original.replace(NEEDLE, replacement));
		execSync("npx astro build", { cwd: ROOT, stdio: "ignore" });
		const r = await departures();
		for (const x of r) {
			const broke = predicate(x);
			if (!broke) bit = false;
			console.log(`    ${x.vp.padEnd(9)} svh=${String(x.svh).padEnd(5)} stateA h=${String(x.aH).padEnd(5)} landingBottom=${String(x.landingBottom).padEnd(5)} workTopAtRest=${String(x.workTopAtRest).padEnd(5)} afterScroll photosBottom=${String(x.bottom).padEnd(6)} ${broke ? "BROKEN — control bites" : "*** still holds — control did NOT bite ***"}`);
		}
	} finally {
		await writeFile(SRC, original);
		execSync("npx astro build", { cwd: ROOT, stdio: "ignore" });
	}
	if (!bit) bad = 1;
	return bit;
}

console.log(`\n  sha256 before ${before}`);
// TOO SHORT — 60svh, the mutation the plan named, asserted against the property
// it can actually break: state A no longer reaches the fold, so the work band is
// on screen before the reader has scrolled at all.
await control("100svh -> 60svh", "min-height: calc(60svh - var(--hm-above));",
	(x) => !x.fillsView && x.workTopAtRest < x.svh,
	"state A fills the landing view");
// TOO TALL — 160svh. This is the direction the departure assertion is sensitive
// to, and it is the half the user's sentence states outright.
await control("100svh -> 160svh", "min-height: calc(160svh - var(--hm-above));",
	(x) => !x.departed,
	"one viewport of scroll clears state A");

const after = sha(SRC);
console.log(`\n  sha256 after  ${after}  ${before === after ? "BYTE-IDENTICAL RESTORE" : "*** RESTORE DIFFERS ***"}`);
if (before !== after) bad = 1;
const restored = await departures();
console.log("  RESTORED build — both properties must hold again:");
for (const r of restored) {
	const ok = r.departed && r.fillsView;
	if (!ok) bad = 1;
	console.log(`    ${r.vp.padEnd(9)} svh=${String(r.svh).padEnd(5)} stateA h=${String(r.aH).padEnd(5)} landingBottom=${String(r.landingBottom).padEnd(5)} afterScroll photosBottom=${String(r.bottom).padEnd(6)} ${ok ? "FILLS + DEPARTS" : "*** FAIL ***"}`);
}
await b.close(); server.close();
console.log(bad ? "\nCONTROL22: FAIL" : "\nCONTROL22: PASS — no leak, snap non-load-bearing, both controls bite at 6/6, restore SHA-256-identical");
process.exit(bad ? 1 : 0);
