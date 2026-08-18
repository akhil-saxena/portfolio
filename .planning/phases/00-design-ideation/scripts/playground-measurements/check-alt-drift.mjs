// THE DRIFT GATE — plan 00-24.
//
// Two files hold the same 39 facts: the fixture/manifest the pages render, and
// 00-PHOTO-CONTENT.md, the brief the photographer actually writes into. They
// drift the moment one is edited alone, and the drift is silent: filling a row
// in the brief without filling the data leaves the page still claiming the alt
// text is outstanding, and filling the data without the brief leaves the brief
// asking for work already done. Neither shows up in a build.
//
// So the count of `[ALT PENDING]` placeholders in the BUILT HTML must equal the
// count of UNFILLED ROWS in the brief, and inequality is a failure.
//
// ═══ WHY THIS COUNTS TABLE ROWS AND NOT OCCURRENCES ════════════════════════
// The plan's own one-liner counted every `[AKHIL-ALT]` in the brief and expected
// 39. The brief contains FORTY: 39 table cells plus one PROSE mention on the
// line that explains what the two markers mean. A raw occurrence count therefore
// over-reports by exactly one and the gate would fail on a correct page — the
// same class of mistake as counting lines with `grep -c` when you meant matches.
// The gate below parses TABLE ROWS: a pipe-delimited row whose alt cell is the
// bare marker. Prose can then say the marker's name as often as it likes.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const HTML = join(HERE, "dist/photos/index.html");
const BRIEF = join(HERE, "../.planning/phases/00-design-ideation/00-PHOTO-CONTENT.md");

const PLACEHOLDER = "[ALT PENDING";
const MARKER = "[AKHIL-ALT]";

const html = readFileSync(HTML, "utf8");
const brief = readFileSync(BRIEF, "utf8");

// Placeholders in the built HTML, counted INSIDE alt ATTRIBUTES rather than
// anywhere in the document. Same lesson as the brief's fortieth occurrence and
// the same one this phase keeps re-learning: count the STRUCTURE, not the string.
// The page also NAMES the marker in a visible note about the outstanding work,
// and a document-wide match counted that prose as a fortieth image. Matches, not
// lines, either way — Astro emits the whole masonry on very few lines and a
// line-anchored count reports 1.
const pending = [...html.matchAll(/\balt="([^"]*)"/g)].filter((m) => m[1].startsWith(PLACEHOLDER)).length;
const pendingAnywhere = (html.match(/\[ALT PENDING/g) ?? []).length;

// Unfilled rows in the brief. A row is a markdown table row; its alt cell is
// unfilled when the cell content is exactly the marker.
const rows = brief
	.split("\n")
	.filter((l) => l.trimStart().startsWith("|"))
	.map((l) => l.split("|").map((c) => c.trim()));
const unfilled = rows.filter((cells) => cells.some((c) => c === MARKER)).length;

// The prose mention, isolated and reported, so the discrepancy the plan's
// one-liner would have hit is visible rather than mysterious.
const occurrences = (brief.match(/\[AKHIL-ALT\]/g) ?? []).length;

// The defect this gate exists downstream of: the title must never be the alt.
// Every caption is also a title, so a title appearing in an alt attribute is
// checked directly against the attribute rather than against the page text.
const altValues = [...html.matchAll(/\balt="([^"]*)"/g)].map((m) => m[1]);
const captions = [...html.matchAll(/class="ph-caption"[^>]*>([^<]*)</g)].map((m) => m[1].trim());
const titleAsAlt = altValues.filter((a) => a && captions.includes(a));

// description must be in the SERVED HTML, not created by an island at runtime.
const descNodes = (html.match(/data-lightbox-caption/g) ?? []).length;

console.log(`  placeholders in ALT ATTRIBUTES           : ${pending}`);
console.log(`  the marker named anywhere in the page   : ${pendingAnywhere} (${pendingAnywhere - pending} in the visible note)`);
console.log(`  unfilled [AKHIL-ALT] ROWS in the brief : ${unfilled}`);
console.log(`  raw [AKHIL-ALT] occurrences (39 rows + ${occurrences - unfilled} prose) : ${occurrences}`);
console.log(`  alt attributes equal to a tile caption  : ${titleAsAlt.length}`);
console.log(`  lightbox description nodes in the HTML  : ${descNodes}`);

let fail = 0;
if (pending !== unfilled) {
	console.error(`FAIL DRIFT pending=${pending} brief=${unfilled}`);
	fail += 1;
}
if (titleAsAlt.length > 0) {
	console.error(`FAIL the alt-equals-title defect is back on ${titleAsAlt.length} image(s): ${titleAsAlt.slice(0, 3).join(" / ")}`);
	fail += 1;
}
if (descNodes === 0) {
	console.error("FAIL no description reached the served HTML — schema decision 7 requires it there, not injected");
	fail += 1;
}
console.log(fail === 0 ? `ALT_IN_SYNC ${pending}` : "ALT_DRIFT");
process.exit(fail === 0 ? 0 : 1);
