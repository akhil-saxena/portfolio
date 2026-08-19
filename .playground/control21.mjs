// NEGATIVE CONTROL for the 44px hit-area block on .ph-pill.
//
// A control that does not bite is not a control. This deletes the block, proves
// the audit's COUNT changes, restores it, and proves the restore is byte-
// identical by SHA-256. It asserts on audit15.mjs's reported under44 counts and
// never on `grep -c` — grep -c counts LINES, not matches, and this phase already
// had a control nearly report a false result that way.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const F = "src/pages/photos.astro";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const original = readFileSync(F);
const shaBefore = sha(original);
console.log(`SHA-256 before : ${shaBefore}`);

// Locate `@media (pointer: coarse) {` and cut to its matching close brace.
const src = original.toString("utf8");
const start = src.indexOf("\t@media (pointer: coarse) {");
if (start < 0) throw new Error("coarse block not found");
let i = src.indexOf("{", start), depth = 0, end = -1;
for (; i < src.length; i++) {
	if (src[i] === "{") depth++;
	else if (src[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error("unbalanced braces");
const block = src.slice(start, end);
console.log(`block: ${block.split("\n").length} lines, ${block.length} bytes`);

// Read the per-class under44 counts out of audit15's own output.
const counts = () => {
	execSync("rm -rf dist && npx astro build", { stdio: "ignore" });
	let out;
	try { out = execSync("node audit15.mjs /photos/", { encoding: "utf8" }); }
	catch (e) { out = e.stdout; }               // audit exits 1 while D-16-1 is open
	return out.split("\n").filter((l) => l.includes("under44=")).map((l) => {
		const cls = l.match(/(PASS|FAIL)\s+(\S+ \S+)/)[2];
		return [cls, Number(l.match(/under44=\s*(\d+)/)[1])];
	});
};

const withBlock = counts();
console.log("\nWITH the block:");
for (const [c, n] of withBlock) console.log(`  ${c.padEnd(24)} under44=${n}`);

writeFileSync(F, src.slice(0, start) + src.slice(end));
const withoutBlock = counts();
console.log("\nWITHOUT the block (control):");
for (const [c, n] of withoutBlock) console.log(`  ${c.padEnd(24)} under44=${n}`);

writeFileSync(F, original);
const shaAfter = sha(readFileSync(F));
const restored = counts();
console.log("\nRESTORED:");
for (const [c, n] of restored) console.log(`  ${c.padEnd(24)} under44=${n}`);

console.log(`\nSHA-256 after  : ${shaAfter}`);
const coarse = withBlock.slice(0, 5).map(([, n], i) => withoutBlock[i][1] - n);
console.log(`\nDelta on the five COARSE classes (without − with): ${JSON.stringify(coarse)}`);
console.log(`Control BITES on all five coarse classes : ${coarse.every((d) => d === 8)}  (expected +8, the eight filter anchors)`);
console.log(`Class 6 (fine, no floor) unchanged        : ${withoutBlock[5][1] === withBlock[5][1]}  (${withBlock[5][1]} → ${withoutBlock[5][1]})`);
console.log(`Restore is byte-identical                 : ${shaBefore === shaAfter}`);
console.log(`Restored counts equal the pre-control ones: ${JSON.stringify(restored) === JSON.stringify(withBlock)}`);
