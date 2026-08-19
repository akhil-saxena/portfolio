// Throwaway browser probe for plan 00-24. A grep cannot prove a rule applied:
// this phase already shipped three rules that matched nothing while the source
// read correctly. Everything asserted here is read out of getComputedStyle or a
// bounding box in a real Chromium at a real device class.
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

const browser = await chromium.launch();
let fail = 0;
const ok = (name, cond, detail = "") => {
	console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
	if (!cond) fail += 1;
};

// ── /admin/photos/ — the four fields and the alt-debt banner ────────────────
{
	const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
	const page = await ctx.newPage();
	await page.goto(`${base}/admin/photos/`, { waitUntil: "networkidle" });
	console.log("\n══ /admin/photos/ @390 coarse");

	const r = await page.evaluate(() => {
		const vis = (el) => {
			if (!el) return false;
			const cs = getComputedStyle(el);
			const b = el.getBoundingClientRect();
			return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0 && b.width > 0 && b.height > 0;
		};
		const labelText = (t) => [...document.querySelectorAll("label")].filter((l) => l.textContent.trim() === t);
		const byId = (id) => document.getElementById(id);
		const A = "architecture-redbuilding";
		const B = "product-peppers";
		const chipSel = ".ph-chips .ds-atom-chip";
		const chips = [...document.querySelectorAll(chipSel)];
		const banner = [...document.querySelectorAll("*")].find((e) => /photos have no alt text\./.test(e.textContent || "") && e.children.length === 0);
		return {
			altLabels: labelText("Alt text (required)").length,
			altLabelsVisible: labelText("Alt text (required)").filter(vis).length,
			placeLabels: labelText("Place").filter(vis).length,
			descLabels: labelText("Description").filter(vis).length,
			tagsLegends: [...document.querySelectorAll("legend")].filter((l) => l.textContent.trim() === "Tags").filter(vis).length,
			// Alt inputs: present, EMPTY, required, and labelled by the Field label.
			altA: (() => { const el = byId(`f-${A}-alt`); return el && { vis: vis(el), value: el.value, required: el.required, h: Math.round(el.getBoundingClientRect().height) }; })(),
			altB: (() => { const el = byId(`f-${B}-alt`); return el && { vis: vis(el), value: el.value, required: el.required, h: Math.round(el.getBoundingClientRect().height) }; })(),
			// Filled vs omitted, side by side: A carries fixture values, B carries none.
			placeA: (() => { const el = byId(`f-${A}-place`); return el && { vis: vis(el), value: el.value }; })(),
			placeB: (() => { const el = byId(`f-${B}-place`); return el && { vis: vis(el), value: el.value }; })(),
			descA: (() => { const el = byId(`f-${A}-description`); return el && { vis: vis(el), tag: el.tagName.toLowerCase(), value: el.value, rows: el.rows }; })(),
			descB: (() => { const el = byId(`f-${B}-description`); return el && { vis: vis(el), tag: el.tagName.toLowerCase(), value: el.value }; })(),
			// Chip treatment: chips laid out by the flex rule, input capped beside them.
			chipCount: chips.length,
			chipsVisible: chips.filter(vis).length,
			chipWrapDisplay: chips[0] ? getComputedStyle(chips[0].parentElement).display : null,
			chipWrapFlexWrap: chips[0] ? getComputedStyle(chips[0].parentElement).flexWrap : null,
			tagInputA: (() => { const el = byId(`f-${A}-tags`); return el && { vis: vis(el), value: el.value, maxW: getComputedStyle(el).maxWidth }; })(),
			// The banner, and its number.
			bannerVisible: vis(banner),
			bannerText: banner ? banner.textContent.trim().slice(0, 60) : null,
			bannerMentionsSaving: /Saving still works/.test(document.body.textContent),
			// Nothing renders an em dash into an editable field.
			dashValues: [...document.querySelectorAll("input, textarea")].filter((e) => e.value.trim() === "—").length,
			// The zero-byte overlay check, in the browser this time.
			portals: document.querySelectorAll("[data-ds-portal], .ds-modal, .ds-sheet").length,
		};
	});
	console.log(JSON.stringify(r, null, 1));

	ok("Alt text field renders in both panels", r.altLabelsVisible === 2, `${r.altLabelsVisible} visible labels`);
	ok("Place field renders in both panels", r.placeLabels === 2);
	ok("Description field renders in both panels", r.descLabels === 2);
	ok("Tags renders as a fieldset legend in both panels", r.tagsLegends === 2);
	ok("alt is EMPTY on both pinned records", r.altA.value === "" && r.altB.value === "", "nothing invented");
	ok("alt input is marked required", r.altA.required === true && r.altB.required === true);
	ok("Description is a <textarea>", r.descA.tag === "textarea" && r.descB.tag === "textarea");
	ok("filled place shows on A, empty on B", r.placeA.value.startsWith("[FIXTURE place") && r.placeB.value === "", "omission rule: empty and editable, never an em dash");
	ok("no editable field renders an em dash", r.dashValues === 0);
	ok("tag Chips render", r.chipsVisible === 3 && r.chipCount === 3, `${r.chipsVisible} of ${r.chipCount}`);
	ok("chip set uses the flex-wrap rule (computed, not grepped)", r.chipWrapDisplay === "flex" && r.chipWrapFlexWrap === "wrap", `${r.chipWrapDisplay}/${r.chipWrapFlexWrap}`);
	ok("tag input is capped beside the chips", r.tagInputA && r.tagInputA.maxW === "192px", r.tagInputA && r.tagInputA.maxW);
	ok("alt-debt banner is VISIBLE with a derived count", r.bannerVisible && /39 of 39/.test(r.bannerText), r.bannerText);
	ok("banner says saving still works (D-18 leniency)", r.bannerMentionsSaving);
	ok("no zero-byte overlay component in the DOM", r.portals === 0);
	await ctx.close();
}

// ── /photos/ — the alt fix and the reserved lightbox slot ────────────────────
{
	const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
	const page = await ctx.newPage();
	await page.goto(`${base}/photos/`, { waitUntil: "networkidle" });
	console.log("\n══ /photos/ @390 coarse");

	const r = await page.evaluate(() => {
		const imgs = [...document.querySelectorAll("img.ph-img")];
		const caps = [...document.querySelectorAll(".ph-caption")].map((e) => e.textContent.trim());
		const descs = [...document.querySelectorAll(".ph-desc")];
		return {
			tiles: imgs.length,
			// The defect: an alt attribute that equals the tile's own visible caption.
			altEqualsCaption: imgs.filter((im, i) => im.getAttribute("alt") === caps[i]).length,
			altPending: imgs.filter((im) => (im.getAttribute("alt") || "").startsWith("[ALT PENDING")).length,
			altEmpty: imgs.filter((im) => im.getAttribute("alt") === "").length,
			altMissing: imgs.filter((im) => im.getAttribute("alt") === null).length,
			// description: IN the DOM (so not JS-injected), NOT VISIBLE in the grid.
			descNodes: descs.length,
			descComputedDisplay: descs.length ? getComputedStyle(descs[0]).display : null,
			descTextInDom: descs.length ? descs[0].textContent.slice(0, 32) : null,
			descBoxes: descs.filter((d) => d.getBoundingClientRect().height > 0).length,
			// Nothing hydrates on this route: the lightbox is absent by design (G-14).
			islands: document.querySelectorAll("astro-island").length,
			scripts: [...document.querySelectorAll("script")].filter((s) => s.src || s.textContent.trim()).length,
			// 00-21's coarse floor on the filter rail, still standing.
			pillUnder44: [...document.querySelectorAll(".ph-pill")].filter((p) => p.getBoundingClientRect().height < 44).length,
			pills: document.querySelectorAll(".ph-pill").length,
			// The visible statement of the debt.
			noteVisible: /ALT TEXT — 39 OF 39 OUTSTANDING/.test(document.body.textContent),
		};
	});
	console.log(JSON.stringify(r, null, 1));

	ok("39 tiles render", r.tiles === 39);
	ok("NO alt attribute equals its tile caption", r.altEqualsCaption === 0, "the alt-equals-title defect is gone");
	ok("every unwritten alt is a visible placeholder", r.altPending === 39, `${r.altPending} of 39`);
	ok("no alt=\"\" (would declare a photograph decorative)", r.altEmpty === 0);
	ok("no img without an alt attribute", r.altMissing === 0);
	ok("description IS in the served DOM", r.descNodes === 2 && !!r.descTextInDom, `${r.descNodes} node(s)`);
	ok("description is NOT visible in the grid", r.descComputedDisplay === "none" && r.descBoxes === 0, `display=${r.descComputedDisplay}`);
	ok("nothing hydrates — G-14 absent by design", r.islands === 0 && r.scripts === 0);
	ok("00-21's coarse floor on the filter rail intact", r.pills === 8 && r.pillUnder44 === 0, `${r.pills} pills, ${r.pillUnder44} under 44px`);
	ok("the debt is stated on the artefact", r.noteVisible);
	await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${fail === 0 ? "PROBE24 PASS" : `PROBE24 FAIL — ${fail} assertion(s)`}`);
process.exit(fail === 0 ? 0 : 1);
