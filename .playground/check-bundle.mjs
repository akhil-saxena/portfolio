// check-bundle.mjs — the DS-09 tree-shaking measurement (MEASURE-1).
// Run after `astro build`.
//
// What this measures and why it is a sourcemap walk rather than a bundle
// visualiser: every emitted chunk ships a `.js.map` whose `sources` array
// names every module that contributed to it, by path. That is exact,
// greppable, and needs zero extra dependencies. `rollup-plugin-visualizer`
// would answer the same question with another package in the tree.
//
// The regression this guards: `@akhil-saxena/design-system` has no
// per-component JS subpath exports — `dist/index.js` is one barrel that
// statically imports @tiptap/*, lowlight, @dnd-kit/* and lucide-react at top
// level. If Rolldown cannot shake those out, a single `import { Chip }` on a
// hydrated public route drags ProseMirror into the browser, and /photos is the
// one hydrating public route in the whole roadmap.
//
// Astro 7 ships Vite 8, which is ROLLDOWN-based. Tree-shaking semantics are
// Rolldown's, not Rollup's — Rollup-era advice about sideEffects and PURE
// annotations does not transfer, and three such fixes were measured
// byte-identical during research.
//
// EXIT CODE IS NOT A GATE IN PHASE 0. At design-system v1.11.4 this exits 1,
// and that non-zero exit IS the finding, recorded in 00-FINDINGS.md as G-15.
// Plan 01 runs it with `|| true` and asserts on the report contents instead.
// The 50 KB gzip threshold below is research assumption A8, derived from the
// Lighthouse 95+ goal rather than a stated budget — it is UNCONFIRMED and must
// not be hardened into a gate until a human settles it. No threshold choice
// changes the v1.11.4 verdict, which fails by ~3.5x on gzip alone.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const HEAVY = {
	prosemirror: /prosemirror/i,
	tiptap: /tiptap/i,
	lowlight: /lowlight/i,
	highlightjs: /highlight\.js/i,
	dndkit: /dnd-kit/i,
	lucide: /lucide/i,
};

// lucide-react is excluded from the failure set deliberately: it is a
// tree-shakeable icon package whose modules are individually small, and the
// DS legitimately renders icons. The editor stack (ProseMirror/TipTap/
// lowlight/highlight.js) and the drag-and-drop stack (dnd-kit) are the
// families that have no business on a public island.
const FAIL_ON = Object.keys(HEAVY).filter((k) => k !== "lucide");

// UNCONFIRMED — research assumption A8. See the header note.
const GZIP_BUDGET = 50 * 1024;

const dir = "dist/_astro";
let failed = false;

let entries;
try {
	entries = readdirSync(dir);
} catch {
	console.error(
		`check-bundle: ${dir} does not exist. Run \`npx astro build\` first — and if you ` +
			`just reinstalled the design-system tarball, \`rm -rf node_modules/.vite dist\` ` +
			`before building or you will measure the previous copy.`,
	);
	process.exit(2);
}

const maps = entries.filter((f) => f.endsWith(".js.map"));

if (maps.length === 0) {
	console.error(
		"check-bundle: no .js.map files in dist/_astro — no client chunk was emitted at all. " +
			"DS-09 is observable ONLY on a hydrated island, so this means probe/island.astro " +
			"lost its `client:load` directive. A static page proves nothing here (Pitfall 2).",
	);
	process.exit(2);
}

for (const f of maps) {
	const map = JSON.parse(readFileSync(join(dir, f), "utf8"));
	const js = f.replace(/\.map$/, "");
	const jsPath = join(dir, js);

	const counts = {};
	for (const s of map.sources) {
		for (const [k, re] of Object.entries(HEAVY)) {
			if (re.test(s)) counts[k] = (counts[k] ?? 0) + 1;
		}
	}

	const raw = statSync(jsPath).size;
	const gzip = gzipSync(readFileSync(jsPath)).length;

	console.log(`${js}  ${raw} B raw  ${gzip} B gzip  ${map.sources.length} modules`, counts);

	const heavy = FAIL_ON.filter((k) => counts[k]);
	if (heavy.length) {
		failed = true;
		// Name the failure MODE, not just the assertion (DS convention: the
		// message should explain what broke and what it costs).
		console.error(
			`  FAIL: ${heavy.map((k) => `${k} (${counts[k]} modules)`).join(", ")} reached a ` +
				`hydrated client chunk. The design-system barrel is not tree-shaking: importing ` +
				`one atom pulled the editor/drag-drop stack into the browser. On /photos — the ` +
				`only hydrating public route — this makes PUB-14 and QUAL-01 unreachable. ` +
				`The fix is upstream per-component JS subpath exports, never a local workaround.`,
		);
	}

	if (gzip > GZIP_BUDGET) {
		failed = true;
		console.error(
			`  FAIL: ${gzip} B gzip exceeds the ${GZIP_BUDGET} B budget by ` +
				`${(gzip / GZIP_BUDGET).toFixed(1)}x. NOTE: this budget is research assumption ` +
				`A8 and is UNCONFIRMED — it gates nothing in Phase 0. Treat the byte count as ` +
				`the finding, not this comparison.`,
		);
	}
}

process.exit(failed ? 1 : 0);
