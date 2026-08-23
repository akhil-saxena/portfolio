#!/usr/bin/env node
/**
 * PROPOSAL, NOT AN ACTION. Plan 01-20 leaves this unapplied on purpose.
 *
 * 01-19.1 measured that 164 of the 186 apparent "orphans" in
 * $DS/tests/visual-baselines/ are CATEGORY RENAMES, not deletions: the library
 * moved components between categories, which changes a story id while the story
 * itself is unchanged. A renamed story wants its baseline MOVED, not dropped,
 * and moving 164 recorded image directories is exactly the bulk act that loses
 * work quietly -- so it is a human's call, taken at plan 01-20's review gate.
 *
 * SCOPE, AND WHY IT IS NOT THE VISUAL GATE. tests/visual-baselines/ is written
 * by `npm run test:visual:capture` (DS_TEST_MODE=visual, D-31) and is
 * deliberately NOT a CI job. NOTHING COMPARES AGAINST IT. The regression gate is
 * Playwright's own tests/visual/storybook.spec.ts-snapshots/, which is a
 * different store and is untouched by this script. So the value of applying this
 * is provenance -- keeping a component's recorded history attached to its
 * current id -- not gate correctness. Declining costs nothing that a re-run of
 * `npm run test:visual:capture` would not regenerate.
 *
 *   node 01-20-rename-baselines.mjs            # dry run: print the mapping and the moves
 *   node 01-20-rename-baselines.mjs --apply    # perform them with `git mv`
 *   node 01-20-rename-baselines.mjs --revert   # move them back
 *
 * Reversible by construction: --revert inverts the same manifest, so the
 * operation has an exact inverse rather than needing a backup. Refuses to
 * clobber: if a destination already exists, that pair is skipped and reported.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DS = process.env.DS ?? "/Users/akhilsaxena/Documents/Personal/Repositories/design-system";
const DIR = "tests/visual-baselines";
const MANIFEST = path.join(DS, DIR, "RENAME-PENDING.json");

const mode = process.argv.includes("--apply")
	? "apply"
	: process.argv.includes("--revert")
		? "revert"
		: "dry";

if (!existsSync(MANIFEST)) {
	console.error(`No manifest at ${MANIFEST}`);
	process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const renames = Object.entries(manifest.categoryRenames);
const unresolved = Object.keys(manifest.unresolved ?? {});

// ── the mapping, printed ──
const transitions = new Map();
for (const [from, to] of renames) {
	const key = `${from.split("-")[0]} -> ${to.split("-")[0]}`;
	if (!transitions.has(key)) transitions.set(key, []);
	transitions.get(key).push([from, to]);
}
console.log(`RENAME MAPPING  (${renames.length} category renames, ${unresolved.length} unresolved)`);
console.log(`store: ${DS}/${DIR}   [local-only capture; nothing compares against it]\n`);
for (const [t, pairs] of [...transitions].sort((a, b) => b[1].length - a[1].length)) {
	console.log(`  ${t.padEnd(26)} ${String(pairs.length).padStart(3)} directories`);
	for (const [from, to] of pairs.slice(0, 3)) console.log(`      ${from}\n        -> ${to}`);
	if (pairs.length > 3) console.log(`      ... and ${pairs.length - 3} more`);
	console.log();
}
console.log(`  UNRESOLVED (story-name changes, no target -- left alone by every mode):`);
for (const u of unresolved) console.log(`      ${u}`);

// ── the moves ──
const pairs = mode === "revert" ? renames.map(([a, b]) => [b, a]) : renames;
let ok = 0;
const missing = [];
const blocked = [];
const cmds = [];
for (const [from, to] of pairs) {
	const src = path.join(DS, DIR, from);
	const dst = path.join(DS, DIR, to);
	if (!existsSync(src)) {
		missing.push(from);
		continue;
	}
	if (existsSync(dst)) {
		blocked.push(`${from} -> ${to} (destination exists)`);
		continue;
	}
	cmds.push([from, to]);
}

console.log(`\n${"─".repeat(72)}`);
console.log(`mode: ${mode.toUpperCase()}`);
console.log(`  movable        : ${cmds.length}`);
console.log(`  source missing : ${missing.length}`);
console.log(`  blocked        : ${blocked.length}`);
for (const b of blocked.slice(0, 10)) console.log(`      ${b}`);

if (mode === "dry") {
	console.log(`\nThe exact command list (${cmds.length} moves), runnable as-is from ${DS}:\n`);
	for (const [from, to] of cmds) console.log(`git mv "${DIR}/${from}" "${DIR}/${to}"`);
	console.log(`\nNothing was changed. Re-run with --apply to perform these, or --revert to undo.`);
	console.log(`After --apply, RENAME-PENDING.json's categoryRenames entries are spent: the`);
	console.log(`keys stay dead ids so src/visual-baseline-coherence.test.ts remains green either`);
	console.log(`way, but the file should then be trimmed to the ${unresolved.length} unresolved entries.`);
	process.exit(0);
}

for (const [from, to] of cmds) {
	execFileSync("git", ["-C", DS, "mv", `${DIR}/${from}`, `${DIR}/${to}`], { stdio: "inherit" });
	ok++;
}
console.log(`\n${mode === "revert" ? "Reverted" : "Applied"} ${ok} directory moves, staged in git.`);
console.log(`Review with:  git -C ${DS} status --porcelain ${DIR} | head -40`);
console.log(`Undo with:    node ${path.basename(process.argv[1])} --${mode === "revert" ? "apply" : "revert"}`);
