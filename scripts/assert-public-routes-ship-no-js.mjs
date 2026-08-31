#!/usr/bin/env node

/**
 * assert-public-routes-ship-no-js — PUB-14 and DS-09, asserted over the BUILT artefact.
 *
 * Usage: node scripts/assert-public-routes-ship-no-js.mjs [distRoot]   (default ./dist/client)
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT CLAIMS
 *
 * Four of the five public route patterns ship ZERO framework JavaScript; the fifth — `/photography`
 * plus `/photography/<category>`, ONE pattern by OQ-6c — ships exactly one Lightbox island. No public
 * chunk carries a forbidden design-system family, none carries the photo pipeline, and the whole
 * of `dist/client` stays under three byte ceilings.
 *
 * ---------------------------------------------------------------------------------------------
 * THE §5.2 / §5.3 RECONCILIATION — READ THIS BEFORE "FIXING" AN ASSERTION
 *
 * `05-UI-SPEC.md` §5.3 spells assertions 1 and 3 as `<script type="module" src=`, and §5.2 as
 * "at most one `<script is:inline>`". BOTH SPELLINGS ARE WRONG AGAINST ASTRO 7, measured by
 * plan 05-12 and re-measured here on every run (the census prints the module-script count):
 *
 *   - A hydrated `/photography` document carries **zero** `<script type="module">`. Astro 7 emits
 *     `<astro-island component-url=… component-export=… renderer-url=…>` plus classic
 *     attribute-less `<script>` blocks, the last of which reaches the chunk through a dynamic
 *     `import()`. So §5.3's assertion 1 is VACUOUSLY TRUE on a page shipping 209 KB of React,
 *     and its assertion 3 is RED against a correct build.
 *   - A gallery route carries THREE `<script>` blocks: the authored theme block and two of
 *     Astro's own hydration bootstraps. §5.2's rule, read literally, refuses the one route it
 *     exists to permit.
 *
 * The repair, in both cases, is to ENUMERATE THE PERMITTED SHAPE rather than deny a spelling:
 *
 *   A1  a zero-JS document has no `<astro-island>`, no `<script src>`, no `type="module"`, and
 *       names no `/_astro/*.js` — so its reachable chunk bytes are 0. Stated four ways because
 *       any one of them alone is a spelling somebody can route around.
 *   A2  the set of inline script TEXTS across the artefact must be exactly three: the theme
 *       block, on every document, and two bootstrap blocks, on the hydrating documents and
 *       nowhere else. A fourth distinct text anywhere is a second authored script and fails.
 *       The theme text is IDENTIFIED AS THE ONE TEXT PRESENT ON EVERY DOCUMENT, not read from
 *       `index.html` and not kept as a copy in this file — so pages are compared against each
 *       other, and a second script added to the shared layout shows up as what it is: a second
 *       universal text. See the note beside the derivation for the control that forced this.
 *   A6  and, underneath all of it, a byte ceiling — because a spelling argument cannot be won
 *       and a byte total cannot be argued with.
 *
 * ---------------------------------------------------------------------------------------------
 * ASSERTION 6 — THE CEILING'S UNIT, AND WHY IT IS THE ONE IT IS
 *
 * RAW BYTES ON DISK, not gzip and not brotli. Three reasons, in order of weight:
 *
 *   1. Compression ratio is a property of the SERVING EDGE, not of the artefact. Cloudflare picks
 *      the encoding from `Accept-Encoding` and picks the quality level itself. A ceiling over
 *      `brotli -q11` measures a tool version as much as it measures the bundle, and it would move
 *      under this project when nothing in this project changed.
 *   2. Raw bytes are a deterministic function of the committed source plus the lockfile, so the
 *      number a developer sees is the number CI sees. That is the whole reason to have a ceiling.
 *   3. What PUB-14 actually cares about is main-thread cost, and parse/compile time scales with
 *      RAW bytes — the browser decompresses before it parses. TBT does not care what the wire
 *      carried.
 *
 * THREE CEILINGS, NOT ONE, because one number cannot both catch an order-of-magnitude event and
 * catch a 2 KB regression:
 *
 *   APP     every chunk ANY document names as an island `component-url` — the island ENTRY
 *           chunks, and deliberately not their transitive imports. Collected from every document,
 *           permitted or not, so that an unauthorised island's chunk is blamed on the island
 *           rather than on React. This is the unit this repository
 *           controls. TIGHT on purpose: today 17,451 B against a 19,000 B ceiling, i.e. 1,549 B
 *           of headroom.
 *           Plan 05-12 shipped a build-time helper alongside its island and Rolldown did not
 *           tree-shake it — 19,336 B against 17,435 B, a 1,901 B regression with no symptom.
 *           THIS CEILING IS SET BELOW THAT DELTA SO THAT EXACTLY THAT EVENT IS A RED BUILD.
 *   VENDOR  everything else under `dist/client/**\/*.js` — React and `@astrojs/react`'s client
 *           runtime, today 191,717 B. Fixed cost of having any island at all; a second framework
 *           runtime, or a duplicated React, blows it.
 *   TOTAL   every `.js` under `dist/client`, today 209,168 B. The backstop. A chunk that is
 *           neither named by a document nor imported by one — a bare dynamic `import()` target —
 *           is invisible to APP and VENDOR and still lands here.
 *
 * The ceilings are on the ARTEFACT, not per route, and that is deliberate: a chunk that exists is
 * a chunk some route can reach, and per-route reachability is exactly the thing an import
 * spelling can be used to argue about. The per-route number IS asserted, but as an equality
 * against zero (A1) rather than against a budget.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS GATE CANNOT SEE — found by walking through it, not by imagining failures
 *
 *  1. IT READS `dist/client`, AND `dist/client` IS ONLY AS GOOD AS THE LAST BUILD. This is
 *     `gate:origin`'s blind spot 3 in a second place. `npm run build` ends with `gate:content`,
 *     so the local path is covered; CI re-runs the chain AFTER `npm test`, because
 *     `test/setup/preview-server.ts` runs `astro build` directly and leaves an artefact no
 *     dist-scoped gate has looked at. Do not delete that step.
 *  2. IT CANNOT DISTINGUISH AN AUTHORED SCRIPT FROM ASTRO'S OWN by reading it — nothing in the
 *     text says who wrote it. A2 closes this by counting: exactly two non-theme texts, present on
 *     the hydrating documents and on no other. A third one fails whoever wrote it. What gets
 *     through: nothing, at this count. What WOULD get through if the count were relaxed to "at
 *     most": an authored script planted only in the gallery template. The count is exact for that
 *     reason.
 *  3. A4 IS A TEXT MATCH ON MINIFIED OUTPUT, and minified Rollup output does not reliably carry
 *     npm package names. Measured here, not assumed: a chunk carrying `components/Sortable` holds
 *     `dndKit`, `DndContext`, `droppable` and `Draggable item` and holds NO `dnd-kit` at all. That
 *     is why there are two family patterns and why A6 exists. A4 alone is not evidence.
 *  3a. A4 IS CASE-INSENSITIVE AND THEREFORE MATCHES `lowLight`, a plausible identifier. Found by
 *     this gate's own self-test, which flagged the anti-canary the first time it ran; kept rather
 *     than narrowed, for the reason written beside the A4 canary.
 *  3b. THE BARREL IMPORT IS NOT A USABLE POSITIVE CONTROL FOR A4 OR A6 IN THIS REPOSITORY, and
 *     the plan that commissioned this gate assumed it was. MEASURED 2026-08-29: replacing the
 *     island's four subpath imports with `import { Eyebrow, Lightbox, Text } from
 *     '@akhil-saxena/design-system'` moves the artefact from 209,168 B to 209,707 B — plus 539 B —
 *     and NEITHER A4 NOR A6 fires. Rolldown tree-shakes the barrel completely here, which is the
 *     behaviour `STATE.md` recorded from a different repository and which §1.1 explicitly declines
 *     to rely on. §1.1's 416,590 B is the barrel entry's SOURCE MODULE GRAPH, not what any chunk
 *     ends up containing.
 *
 *     CONSEQUENCE, and it is the important one: THE ARTEFACT IS THE WRONG LAYER AT WHICH TO CATCH
 *     A BARREL IMPORT. `scripts/assert-ds-import-contract.mjs` (`gate:ds`) catches it AT SOURCE —
 *     verified, exit 1, `PhotoLightbox.tsx:126: [DS-BARREL]` — and that is the control that must
 *     not be weakened. A4 and A6 are proven able to fire by §1.1's OTHER two named controls, which
 *     genuinely pull the families in: `components/RichText` (A4 x3 AND all three ceilings) and
 *     `components/Sortable` (A6 only, A4 silent — see item 3).
 *  4. IT NEVER SHELLS OUT TO `grep`. A literal control character makes a file invisible to grep,
 *     so every grep gate over it passes vacuously. Everything here is read as text in JavaScript.
 *  5. `client:only` IS NOT SPECIAL-CASED and does not need to be — it emits an `<astro-island>`
 *     with no SSR output, so A1 catches it by the same predicate as `client:load`. Recorded
 *     because it looks like a hole.
 *  6. IT SAYS NOTHING ABOUT `public/`. A hand-written `.js` under `public/` is copied to
 *     `dist/client` verbatim and WOULD count against TOTAL, but no document would name it, so it
 *     would land in VENDOR and be blamed on React. There is no such file today.
 *
 * Reported with `process.stdout.write`. `console.log` and `console.info` print NOTHING under this
 * repository's vitest setup — verified with a probe by 04-01 — and a gate reporting through them
 * is indistinguishable from a gate that found nothing.
 *
 * Requirements PUB-14, DS-09. Sections 1.1, 5.1, 5.2, 5.3, 7.3. OQ-6c.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_DIST = path.join(REPO_ROOT, 'dist', 'client');
const SITE_CONFIG = path.join(REPO_ROOT, 'data', 'site_config.json');

const rel = (p) => {
  const r = path.relative(REPO_ROOT, p);
  return !r || r.startsWith('..') ? p : r;
};

/* The ceilings. Each is a named sum with its measurement beside it; see the header for the unit. */
const CEILINGS = {
  app: {
    limit: 19_000,
    measured: 17_451,
    what: 'the island entry chunks a document names as `component-url` (not their imports)',
    why: 'set below the 1,901 B un-tree-shaken-helper regression 05-12 measured, so that event is red',
  },
  vendor: {
    limit: 200_000,
    measured: 191_717,
    what: 'every other .js under the dist root (React + @astrojs/react client runtime)',
    why: 'a second framework runtime, or a duplicated React, cannot fit under it',
  },
  total: {
    limit: 240_000,
    measured: 209_168,
    what: 'every .js under the dist root',
    why: 'the backstop no import spelling can evade, dynamic import() included',
  },
};

/* §5.3 assertion 4 / DS-09, in TWO patterns, and the second one is not decoration.
 *
 * MEASURED 2026-08-29, by planting each of §1.1's two named positive controls into the island and
 * reading the emitted chunk — not by reasoning about what a minifier does:
 *
 *   plant `components/RichText` (§1.1: 6 x @tiptap)   -> 143,597 B chunk.
 *       /prosemirror/i  -> "ProseMirror" @51616   FIRES
 *       /tiptap/i       -> "tiptap"      @70603   FIRES
 *   plant `components/Sortable` (§1.1: 3 x @dnd-kit) ->  68,427 B chunk.
 *       /dnd-kit/i      -> ABSENT                 DOES NOT FIRE
 *       but `dndKit` @48218, and `DndContext`, `droppable`, `Draggable item` are all PRESENT.
 *
 * So §5.3's assertion 4 AS SPELLED CANNOT FIRE ON dnd-kit — the hyphenated npm name does not
 * survive minification and the camelCased runtime identifier does. That is a gate that could not
 * fail for a case that the roadmap calls a STOP. The spec's five names are kept verbatim in
 * FAMILY_NPM_NAMES, and FAMILY_MINIFIED_IDENTIFIERS carries the identifiers measured above.
 * Each is canaried against the string that was actually read out of a chunk.
 *
 * Neither pattern is sufficient on its own and neither is trusted on its own — that is what
 * assertion 6 is for. The barrel control that was supposed to prove this method bites does NOT:
 * see the header note under `WHAT THIS GATE CANNOT SEE`, item 3b. */
const FAMILY_NPM_NAMES = /prosemirror|tiptap|lowlight|highlight\.js|dnd-kit/i;
const FAMILY_MINIFIED_IDENTIFIERS =
  /\bdndKit\b|\bDndContext\b|\buseDroppable\b|\buseDraggable\b|\bSortableContext\b/;
const FAMILY_RULES = [
  { id: 'A4-FAMILY', pattern: FAMILY_NPM_NAMES, note: 'the npm package name, as §5.3 spells it' },
  {
    id: 'A4-FAMILY-MINIFIED',
    pattern: FAMILY_MINIFIED_IDENTIFIERS,
    note: 'a runtime identifier that survives minification where the package name does not',
  },
];

/* §5.3 assertion 5 / §7.3. Two markers, because a bundler may rename one and not the other:
   the module path, and the Node built-in the module reaches. */
const PIPELINE_MARKERS = [
  { id: 'PIPELINE-PATH', pattern: /photo-pipeline/i },
  { id: 'PIPELINE-CRYPTO', pattern: /node:crypto|createHash/ },
];

/**
 * A6 IS A CLAIM ABOUT THE PRODUCTION ARTEFACT, so the gate has to know which one it is holding.
 *
 * MEASURED 2026-08-29. Vitest sets `NODE_ENV=test`, and Vite resolves React through the
 * `development` export condition for anything that is not `production`. Until plan 05-14 fixed
 * `test/setup/preview-server.ts`, the artefact `npm test` left behind was React's DEVELOPMENT
 * bundle — minified, but development — and CI's "Re-assert the gates" step ran against it:
 *
 *     npm run build   PhotoLightbox 17,451  client 180,630  react-dom 11,087  =  209,168 B
 *     npm test        PhotoLightbox 28,141  client 353,843  react-dom 29,426  =  411,410 B
 *
 * Comparing that against a production ceiling produces "over the ceiling by 171,410 B", which
 * names the symptom and hides the cause. So the ceilings are SKIPPED and a finding is raised that
 * says what actually happened. It is still a refusal — a development React bundle under
 * `dist/client` is a defect in its own right, because Cloudflare would serve it — but it is a
 * refusal a reader can act on.
 *
 * Both marker sets were read out of real chunks, not invented. The dev markers are absent from
 * the production build and the prod marker is absent from the development one; React ships full
 * message text in development and an error-code URL in production.
 */
const DEV_BUILD_MARKERS = [/Invalid hook call/, /Each child in a list/, /unique "key"/];
const PROD_BUILD_MARKER = /Minified React error/;

/* The island the one hydrating route pattern is permitted to carry. */
const ISLAND_EXPORT = 'PhotoLightbox';
const ISLAND_URL = /^\/_astro\/PhotoLightbox\.[A-Za-z0-9_-]+\.js$/;

/* ---------------------------------------------------------------------------------------------
 * 1. Tiny HTML readers.
 *
 * Attribute values are read with the QUOTE CHARACTER THE ATTRIBUTE OPENED WITH, never with
 * `["']([^"']*)["']` — that character class truncates at the first apostrophe, and 8 of the 40
 * photograph records contain one (05-13 measured it). An island's `props` attribute carries the
 * whole manifest.
 * ------------------------------------------------------------------------------------------- */

function scriptBlocks(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({
    attrs: m[1],
    text: m[2],
  }));
}

/** Islands, counted on a document with every `<script>` and comment REMOVED FIRST.
 *  Astro's bootstrap contains `customElements.define("astro-island", …)`, so a bare substring
 *  count reads the runtime that DEFINES the element as further instances of it — it measures 7
 *  where the truth is 1. That is 05-08's `grep -c 'pd-exif'` returning 5 on a page rendering
 *  none, in a third place. */
function stripScriptsAndComments(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

function islandTags(html) {
  return [...stripScriptsAndComments(html).matchAll(/<astro-island\b([^>]*?)\/?>/g)].map(
    (m) => m[1]
  );
}

function attr(tagAttrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])`);
  const m = re.exec(tagAttrs);
  if (!m) return null;
  const quote = m[1];
  const start = m.index + m[0].length;
  const end = tagAttrs.indexOf(quote, start);
  return end === -1 ? null : tagAttrs.slice(start, end);
}

/** Every `/_astro/<name>.js` path a document names, wherever it names it. */
function chunkPathsNamedBy(text) {
  return [...new Set([...text.matchAll(/\/_astro\/[A-Za-z0-9._-]+\.js/g)].map((m) => m[0]))];
}

const hasSrc = (attrs) => /\bsrc\s*=/.test(attrs);
const isModule = (attrs) => /\btype\s*=\s*["']module["']/.test(attrs);

/* ---------------------------------------------------------------------------------------------
 * 2. The self-test. Every detection function is run against a canary it MUST flag and an
 *    anti-canary it MUST NOT, before the gate is allowed to look at the artefact. A rule that
 *    has silently stopped matching is otherwise indistinguishable from a clean build.
 * ------------------------------------------------------------------------------------------- */

const CANARIES = [
  {
    id: 'A1-ISLAND',
    run: (s) => islandTags(s).length > 0,
    canary:
      '<body><astro-island uid="x" component-url="/_astro/X.aaaaaaaa.js"></astro-island></body>',
    antiCanary: '<script>customElements.define("astro-island", class {});</script>',
  },
  {
    id: 'A1-SRC',
    run: (s) => scriptBlocks(s).some((b) => hasSrc(b.attrs)),
    canary: '<script src="/_astro/x.js"></script>',
    antiCanary: '<script>var src = 1;</script>',
  },
  {
    id: 'A1-MODULE',
    run: (s) => scriptBlocks(s).some((b) => isModule(b.attrs)),
    canary: '<script type="module" src="/_astro/x.js"></script>',
    antiCanary: '<script>/* type="module" named in a comment */</script>',
  },
  {
    id: 'A1-CHUNKREF',
    run: (s) => chunkPathsNamedBy(s).length > 0,
    canary: '<astro-island component-url="/_astro/PhotoLightbox.aaaaaaaa.js"></astro-island>',
    antiCanary: '<link rel="stylesheet" href="/_astro/PublicLayout.aaaaaaaa.css">',
  },
  {
    id: 'A3-ISLAND-URL',
    run: (s) => {
      const tags = islandTags(s);
      return (
        tags.length === 1 &&
        attr(tags[0], 'component-export') === ISLAND_EXPORT &&
        ISLAND_URL.test(attr(tags[0], 'component-url') ?? '')
      );
    },
    canary:
      '<astro-island component-url="/_astro/PhotoLightbox.jLpnyao1.js" component-export="PhotoLightbox" props="{&quot;a&quot;:&quot;it\'s here&quot;}"></astro-island>',
    antiCanary:
      '<astro-island component-url="/_astro/SomethingElse.jLpnyao1.js" component-export="SomethingElse"></astro-island>',
  },
  {
    id: 'A4-FAMILY',
    run: (s) => FAMILY_NPM_NAMES.test(s),
    canary:
      'var e=require("ProseMirror-state");/* minified, and the npm name survived in CamelCase */',
    /* `lowLight` is deliberately NOT in this anti-canary, and the self-test is why: it flagged the
       first version of this line, because the case-insensitive form matches `lowLight`. That is an
       ACCEPTED RESIDUAL, not an oversight. The case-SENSITIVE form matches 0 chunks of the
       published barrel where `ProseMirror` matches 1, so case sensitivity is the worse error by a
       wide margin. A local variable named `lowLight` would red this gate; rename the variable. */
    antiCanary: 'var highlightRow=1;var brightness=3;var lightbox=4;',
  },
  {
    /* Both strings below were READ OUT OF A REAL CHUNK, not invented: see the measurement beside
       FAMILY_MINIFIED_IDENTIFIERS. The canary is what a dnd-kit-carrying chunk actually contains;
       the anti-canary is near-miss vocabulary that must NOT red a correct build. */
    id: 'A4-FAMILY-MINIFIED',
    run: (s) => FAMILY_MINIFIED_IDENTIFIERS.test(s),
    canary: 'var q=Symbol("dndKit");function Z(e){return DndContext(e)}',
    antiCanary: 'var myDndKitLike=1;const dndkit=2;const sortableContext=3;',
  },
  {
    id: 'A6-DEV-BUILD',
    run: (s) => DEV_BUILD_MARKERS.some((m) => m.test(s)),
    canary:
      'throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component.")',
    antiCanary: 'throw Error("Minified React error #321; visit https://react.dev/errors/321")',
  },
  {
    id: 'A5-PIPELINE-PATH',
    run: (s) => PIPELINE_MARKERS[0].pattern.test(s),
    canary: 'import{VARIANTS}from"../lib/photo-pipeline.js";',
    antiCanary: 'import{srcsetFor}from"../lib/photo-lightbox.js";',
  },
  {
    id: 'A5-PIPELINE-CRYPTO',
    run: (s) => PIPELINE_MARKERS[1].pattern.test(s),
    canary: 'import{createHash}from"node:crypto";',
    antiCanary: 'const hashed="createhash";const c="crypto";',
  },
];

const selfTestFailures = [];
if (CANARIES.length === 0) {
  selfTestFailures.push('there are no rules — a scan with nothing to look for cannot pass.');
}
for (const c of CANARIES) {
  if (!c.run(c.canary)) {
    selfTestFailures.push(
      `${c.id}: did NOT flag its own canary. The rule is broken, and every clean run it has ever ` +
        'produced was vacuous.'
    );
  }
  if (c.run(c.antiCanary)) {
    selfTestFailures.push(
      `${c.id}: flagged its own anti-canary. The rule is too broad and would be disabled the first ` +
        'day it ran.'
    );
  }
}
if (selfTestFailures.length > 0) {
  err('assert-public-routes-ship-no-js: SELF-TEST FAILED — the gate did not check the artefact.');
  for (const f of selfTestFailures) err(`  x ${f}`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------------------------
 * 3. Refuse to pass on nothing. Every one of these is a case where a `PASS` would be a statement
 *    about the empty set.
 * ------------------------------------------------------------------------------------------- */

const distRoot = path.resolve(process.cwd(), process.argv[2] ?? DEFAULT_DIST);

if (process.argv.length > 2 && process.argv[2] === '') {
  err('assert-public-routes-ship-no-js: the dist root argument is present but empty.');
  err("  path.resolve(cwd, '') is cwd, so this would have walked the entire repository.");
  process.exit(1);
}
if (!fs.existsSync(distRoot) || !fs.statSync(distRoot).isDirectory()) {
  err(`assert-public-routes-ship-no-js: ${rel(distRoot)} does not exist, or is not a directory.`);
  err('  Run `npm run build` first. A check over a missing directory is not a pass.');
  process.exit(1);
}

const allFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else allFiles.push(full);
  }
})(distRoot);

const htmlFiles = allFiles.filter((f) => f.endsWith('.html')).sort();
const jsFiles = allFiles.filter((f) => f.endsWith('.js')).sort();

if (htmlFiles.length === 0) {
  err(`assert-public-routes-ship-no-js: no .html file anywhere under ${rel(distRoot)}.`);
  err('  This run read nothing and cannot pass. Most likely a stale or emptied dist.');
  process.exit(1);
}

/* The route sets are DERIVED, never enumerated. A hardcoded list stops covering the site the day
   a route is added, and — worse — cannot notice a route that vanished. */
let categories;
try {
  const cfg = JSON.parse(fs.readFileSync(SITE_CONFIG, 'utf8'));
  categories = (cfg.categories ?? []).map((c) => c.id);
} catch (e) {
  err(`assert-public-routes-ship-no-js: could not read ${rel(SITE_CONFIG)} — ${e.message}`);
  err('  The hydrating route set is derived from it and cannot be guessed.');
  process.exit(1);
}
if (categories.length === 0) {
  err(`assert-public-routes-ship-no-js: ${rel(SITE_CONFIG)} declares no category.`);
  err(
    '  The hydrating set would be `/photography` alone, which is not the site this gate describes.'
  );
  process.exit(1);
}

const expectHydrating = new Set(
  [path.join(distRoot, 'photography', 'index.html')].concat(
    categories.map((id) => path.join(distRoot, 'photography', id, 'index.html'))
  )
);

const missing = [...expectHydrating].filter((f) => !fs.existsSync(f));
if (missing.length > 0) {
  err(
    'assert-public-routes-ship-no-js: a gallery route derived from site_config.json was not built:'
  );
  for (const m of missing) err(`  x ${rel(m)}`);
  err(
    '  The hydrating set is incomplete, so a PASS would be about the routes that happen to exist.'
  );
  process.exit(1);
}

const hydrating = htmlFiles.filter((f) => expectHydrating.has(f));
const zeroJs = htmlFiles.filter((f) => !expectHydrating.has(f) && path.basename(f) !== '404.html');

if (hydrating.length === 0) {
  err('assert-public-routes-ship-no-js: the HYDRATING route set is empty.');
  process.exit(1);
}
if (zeroJs.length === 0) {
  err('assert-public-routes-ship-no-js: the ZERO-JS route set is empty.');
  err(
    '  Every built page is a gallery route, which is not this site. Refusing rather than passing.'
  );
  process.exit(1);
}

const findings = [];
const add = (id, where, message) => findings.push({ id, where, message });

/* ---------------------------------------------------------------------------------------------
 * 4. A2 — the permitted script shape, derived from the artefact rather than restated here.
 * ------------------------------------------------------------------------------------------- */

const scriptTexts = new Map(); // text -> Set(files)
for (const f of htmlFiles) {
  for (const b of scriptBlocks(fs.readFileSync(f, 'utf8'))) {
    if (!scriptTexts.has(b.text)) scriptTexts.set(b.text, new Set());
    scriptTexts.get(b.text).add(f);
  }
}

/* THE THEME SCRIPT IS THE ONE TEXT THAT APPEARS ON EVERY DOCUMENT, and it is identified that way
   rather than by reading `index.html` and taking its only block.
   The first version did read `index.html`. Control 2 — a second `<script is:inline>` planted in
   `PublicLayout.astro` — made it exit 1 with `index.html carries 2 <script> block(s), not 1`,
   which is the right direction and the WRONG CAUSE: it points a reader at Home when the defect is
   in the shared layout and is on all 52 pages. Deriving the theme as "universal across documents"
   turns that same plant into two universal candidates, which is exactly what a second layout
   script IS, and the refusal below names both and says so. */
const universal = [...scriptTexts.entries()].filter(([, files]) => files.size === htmlFiles.length);
if (universal.length !== 1) {
  err('assert-public-routes-ship-no-js: FAIL');
  err(
    `  x [A2-THEME] ${rel(distRoot)}: ${universal.length} distinct inline script text(s) appear on ` +
      `ALL ${htmlFiles.length} document(s); §5.2 permits exactly one — the theme block in the ` +
      'shared layout.'
  );
  for (const [t, files] of universal) {
    err(
      `      ${Buffer.byteLength(t)} B on ${files.size} doc(s), e.g. ${rel([...files].sort()[0])}` +
        ` :: ${t.trim().slice(0, 90).replace(/\s+/g, ' ')}…`
    );
  }
  if (universal.length === 0) {
    err(
      '      Zero candidates means no script is shared by every page, so there is no theme block'
    );
    err(
      '      to compare pages against and this run has no anchor. That is a refusal, not a pass.'
    );
  } else {
    err('      More than one means a SECOND inline script was added to the shared layout. §5.2:');
    err('      a public route may carry exactly one authored inline script and it is the theme');
    err('      script. Requirement PUB-14; section 5.2.');
  }
  process.exit(1);
}
const themeText = universal[0][0];

/* `/` is still checked, as a finding rather than as the anchor: it is the one route with nothing
   to hydrate and no page-specific script, so a second block there is a real defect. */
const homeDoc = path.join(distRoot, 'index.html');
if (fs.existsSync(homeDoc)) {
  const homeBlocks = scriptBlocks(fs.readFileSync(homeDoc, 'utf8'));
  if (homeBlocks.length !== 1) {
    add(
      'A2-HOME',
      rel(homeDoc),
      `carries ${homeBlocks.length} <script> block(s); Home hydrates nothing and must carry only ` +
        'the theme block.'
    );
  }
} else {
  add('A2-HOME', rel(homeDoc), 'is missing from the artefact entirely.');
}

const nonTheme = [...scriptTexts.entries()].filter(([t]) => t !== themeText);
if (nonTheme.length !== 2) {
  add(
    'A2-SCRIPT-SET',
    rel(distRoot),
    `the artefact carries ${nonTheme.length} distinct non-theme inline script text(s); exactly 2 are ` +
      "permitted (Astro's two hydration bootstraps). " +
      nonTheme
        .map(
          ([t, files]) =>
            `[${Buffer.byteLength(t)} B on ${files.size} doc(s): ${rel([...files][0])}]`
        )
        .join(' ')
  );
}
for (const [t, files] of nonTheme) {
  const onZero = [...files].filter((f) => !expectHydrating.has(f));
  if (onZero.length > 0) {
    add(
      'A2-BOOTSTRAP-LEAK',
      rel(onZero[0]),
      `a non-theme inline script (${Buffer.byteLength(t)} B) appears on ${onZero.length} zero-JS ` +
        'document(s). Only the hydrating routes may carry one.'
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 5. Per-document assertions, and the per-route reachable-byte total.
 * ------------------------------------------------------------------------------------------- */

const sizeOf = new Map(
  jsFiles.map((f) => [
    `/${path.relative(distRoot, f).split(path.sep).join('/')}`,
    fs.statSync(f).size,
  ])
);
const textOf = new Map(
  jsFiles.map((f) => [
    `/${path.relative(distRoot, f).split(path.sep).join('/')}`,
    fs.readFileSync(f, 'utf8'),
  ])
);

/** Chunks reachable from a set of entry chunk paths, following relative `./x.hash.js` specifiers.
 *  `react-dom.*.js` is named by no document — it is imported by `client.*.js` — so a gate that
 *  only read the document would under-report a gallery route by 11,087 B. */
function reachable(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length > 0) {
    const p = queue.shift();
    if (seen.has(p) || !textOf.has(p)) continue;
    seen.add(p);
    const dir = p.slice(0, p.lastIndexOf('/'));
    for (const m of textOf.get(p).matchAll(/["'`](\.\/[A-Za-z0-9._-]+\.js)["'`]/g)) {
      queue.push(`${dir}/${m[1].slice(2)}`);
    }
    for (const m of textOf.get(p).matchAll(/["'`](\/_astro\/[A-Za-z0-9._-]+\.js)["'`]/g)) {
      queue.push(m[1]);
    }
  }
  return seen;
}

const appEntries = new Set();
let moduleScriptCount = 0;
const perRouteBytes = new Map();

for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const where = rel(f);
  const blocks = scriptBlocks(html);
  const islands = islandTags(html);
  const named = chunkPathsNamedBy(html);
  moduleScriptCount += blocks.filter((b) => isModule(b.attrs)).length;

  /* Every island entry chunk ANY document names, not only the permitted ones. Attribution first,
     permission second: the first version of this gate collected these only inside the hydrating
     branch, so control 1's planted `client:load` on `/resume` put `Chip.*.js` in the VENDOR bucket
     and A6 blamed React for it. The ceiling still fired, but it named the wrong cause — and a
     refusal that names the wrong cause is how 05-12's own gate nearly shipped. */
  for (const t of islands) {
    const u = attr(t, 'component-url');
    if (u !== null && sizeOf.has(u)) appEntries.add(u);
  }

  const themeBlocks = blocks.filter((b) => b.text === themeText);
  if (themeBlocks.length !== 1) {
    add(
      'A2-THEME',
      where,
      `carries ${themeBlocks.length} copy/copies of the theme script; §5.2 permits exactly one, ` +
        'in the shared layout.'
    );
  }

  const isHydrating = expectHydrating.has(f);
  const is404 = path.basename(f) === '404.html' && !isHydrating;

  if (!isHydrating) {
    /* A1 — stated four ways, because any one of them alone is a spelling to route around. */
    if (islands.length !== 0) {
      add(
        'A1-ISLAND',
        where,
        `carries ${islands.length} <astro-island> element(s) — a client:* directive reached this ` +
          `route. Chunk(s): ${islands.map((t) => attr(t, 'component-url') ?? '(unnamed)').join(', ')}`
      );
    }
    for (const b of blocks) {
      if (hasSrc(b.attrs))
        add('A1-SRC', where, `carries a <script src=…> — attrs: ${b.attrs.trim()}`);
      if (isModule(b.attrs))
        add('A1-MODULE', where, `carries a <script type="module"> — attrs: ${b.attrs.trim()}`);
    }
    if (named.length !== 0) {
      add('A1-CHUNKREF', where, `names ${named.length} JavaScript chunk(s): ${named.join(', ')}`);
    }
    if (!is404 && blocks.length !== 1) {
      add(
        'A2-COUNT',
        where,
        `carries ${blocks.length} <script> block(s); a zero-JS route may carry exactly one, the ` +
          'theme block.'
      );
    }
    perRouteBytes.set(where, 0);
  } else {
    /* A3 — exactly one island entry, and it resolves to the Lightbox chunk ON DISK. */
    if (islands.length !== 1) {
      add(
        'A3-COUNT',
        where,
        `carries ${islands.length} <astro-island> element(s); exactly one is permitted.`
      );
    } else {
      const url = attr(islands[0], 'component-url');
      const exp = attr(islands[0], 'component-export');
      if (exp !== ISLAND_EXPORT) {
        add(
          'A3-EXPORT',
          where,
          `the island's component-export is ${JSON.stringify(exp)}, not "${ISLAND_EXPORT}".`
        );
      }
      if (url === null || !ISLAND_URL.test(url)) {
        add(
          'A3-URL',
          where,
          `the island's component-url is ${JSON.stringify(url)}, which is not the Lightbox chunk.`
        );
      } else if (!sizeOf.has(url)) {
        add(
          'A3-MISSING',
          where,
          `the island names ${url}, and no such file exists under the dist root.`
        );
      }
    }
    if (blocks.length !== 3) {
      add(
        'A2-COUNT',
        where,
        `carries ${blocks.length} <script> block(s); a hydrating route carries exactly three — the ` +
          "theme block and Astro's two bootstraps."
      );
    }
    perRouteBytes.set(
      where,
      [...reachable(named)].reduce((n, p) => n + (sizeOf.get(p) ?? 0), 0)
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 6. A4 and A5 — over chunk BYTES and inline script text, never over filenames. Chunk names are
 *    hashed and would not carry a package name.
 * ------------------------------------------------------------------------------------------- */

if (jsFiles.length === 0 && CEILINGS.total.measured > 0) {
  add(
    'A4-NOTHING',
    rel(distRoot),
    'there is not one .js file under the dist root. The forbidden-family sweep read zero bytes, ' +
      'and a PASS would be a statement about the empty set.'
  );
}

const scannedSources = [
  ...jsFiles.map((f) => ({ label: rel(f), text: fs.readFileSync(f, 'utf8') })),
  ...[...scriptTexts.entries()].map(([t, files]) => ({
    label: `${rel([...files][0])} (inline <script>, ${Buffer.byteLength(t)} B)`,
    text: t,
  })),
];
let sweptBytes = 0;
for (const s of scannedSources) {
  sweptBytes += Buffer.byteLength(s.text);
  for (const r of FAMILY_RULES) {
    const fam = r.pattern.exec(s.text);
    if (fam) {
      add(
        r.id,
        s.label,
        `matches ${r.pattern} — found ${JSON.stringify(fam[0])} at offset ${fam.index} ` +
          `(${r.note}). DS-09: the fix is an upstream design-system change feeding a patch ` +
          'release, NEVER a local workaround.'
      );
    }
  }
  for (const m of PIPELINE_MARKERS) {
    const hit = m.pattern.exec(s.text);
    if (hit) {
      add(
        `A5-${m.id}`,
        s.label,
        `matches ${m.pattern} — found ${JSON.stringify(hit[0])} at offset ${hit.index}. ` +
          '§7.3: `src/lib/photo-pipeline.ts` must reach no client chunk.'
      );
    }
  }
}
if (sweptBytes === 0) {
  add(
    'A4-EMPTY',
    rel(distRoot),
    'every scanned chunk and inline script was empty; nothing was swept.'
  );
}

/* ---------------------------------------------------------------------------------------------
 * 7. A6 — the ceilings. ASSERTED, not printed.
 * ------------------------------------------------------------------------------------------- */

/* APP is the island ENTRY chunks themselves — the `component-url` set — and deliberately NOT
   their transitive imports. The entry chunk is the unit that regressed in 05-12: a build-time
   helper exported beside the island landed in `PhotoLightbox.*.js` and nowhere else. Following
   imports here would fold React DOM's 11,087 B into the tight ceiling and make it useless, and it
   would also double-count `react-dom.*.js`, which both entries reach. As defined, app and vendor
   partition the artefact exactly, and that partition is asserted below rather than assumed. */
const appChunks = new Set([...appEntries].filter((p) => sizeOf.has(p)));
const vendorChunks = [...sizeOf.keys()].filter((p) => !appChunks.has(p));
const bytesOf = (paths) => [...paths].reduce((n, p) => n + (sizeOf.get(p) ?? 0), 0);

const buckets = {
  app: { paths: [...appChunks], bytes: bytesOf(appChunks) },
  vendor: { paths: vendorChunks, bytes: bytesOf(vendorChunks) },
  total: { paths: [...sizeOf.keys()], bytes: bytesOf(sizeOf.keys()) },
};
if (buckets.app.bytes + buckets.vendor.bytes !== buckets.total.bytes) {
  add(
    'A6-PARTITION',
    rel(distRoot),
    `app (${buckets.app.bytes} B) + vendor (${buckets.vendor.bytes} B) !== total ` +
      `(${buckets.total.bytes} B). The two buckets are meant to partition the artefact, so a chunk ` +
      'is counted twice or not at all, and the ceilings mean less than they say.'
  );
}

const devChunks = [...textOf.entries()]
  .filter(([, t]) => DEV_BUILD_MARKERS.some((m) => m.test(t)))
  .map(([p]) => p);

if (devChunks.length > 0) {
  add(
    'A6-DEV-BUILD',
    rel(distRoot),
    `${devChunks.length} chunk(s) carry React's DEVELOPMENT bundle — ${devChunks.join(', ')}. The ` +
      `three byte ceilings are claims about the PRODUCTION artefact and were NOT compared, because ` +
      `"over the ceiling by N bytes" would name the symptom and hide the cause. Total here is ` +
      `${buckets.total.bytes.toLocaleString('en-US')} B. CAUSE: something built this with ` +
      `NODE_ENV != "production" — vitest sets it to "test", which is why ` +
      `test/setup/preview-server.ts forces it. See the note beside DEV_BUILD_MARKERS.`
  );
}

for (const [name, c] of Object.entries(CEILINGS)) {
  if (devChunks.length > 0) break;
  const b = buckets[name];
  if (b.bytes > c.limit) {
    const largest = b.paths.map((p) => ({ p, n: sizeOf.get(p) ?? 0 })).sort((x, y) => y.n - x.n)[0];
    add(
      `A6-${name.toUpperCase()}`,
      rel(distRoot),
      `${name.toUpperCase()} client JavaScript is ${b.bytes.toLocaleString('en-US')} B, over the ` +
        `${c.limit.toLocaleString('en-US')} B ceiling by ${(b.bytes - c.limit).toLocaleString('en-US')} B ` +
        `(${b.paths.length} chunk(s); largest ${largest ? `${largest.p} at ${largest.n.toLocaleString('en-US')} B` : '(none)'}). ` +
        `The ceiling governs ${c.what}; it is set where it is because ${c.why}. ` +
        `Raw bytes on disk — see this file's header for why the unit is not gzip.`
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 8. Verdict.
 * ------------------------------------------------------------------------------------------- */

if (findings.length > 0) {
  err('assert-public-routes-ship-no-js: FAIL');
  for (const f of findings) err(`  x [${f.id}] ${f.where}: ${f.message}`);
  err('');
  err(
    `  ${findings.length} finding(s) over ${htmlFiles.length} document(s) and ${jsFiles.length} chunk(s).`
  );
  err('  PUB-14: four of the five public route patterns ship ZERO framework JavaScript, and the');
  err('  fifth ships one Lightbox island. DS-09: no forbidden family reaches a public chunk.');
  err('  Requirements PUB-14, DS-09; sections 1.1, 5.1, 5.2, 5.3, 7.3.');
  process.exit(1);
}

const worst = [...perRouteBytes.entries()].sort((a, b) => b[1] - a[1])[0];
out('assert-public-routes-ship-no-js: PASS');
out(`  scanned ${htmlFiles.length} document(s) under ${rel(distRoot)}`);
out(
  `    ${zeroJs.length} zero-JS + ${hydrating.length} hydrating + 1 404 = ${zeroJs.length + hydrating.length + 1}`
);
out(
  `  self-test: ${CANARIES.length}/${CANARIES.length} rules flagged their canary and ignored their anti-canary`
);
out(`  <script type="module"> across the whole artefact: ${moduleScriptCount}`);
out(
  `    (Astro 7 emits none — §5.3's assertion 1 is spelled for Astro 4 and would pass on a page` +
    " shipping React. See this file's header.)"
);
out(
  `  inline script texts: 1 theme (${Buffer.byteLength(themeText)} B, on all ${htmlFiles.length}) + ${nonTheme.length} bootstrap`
);
for (const [t, files] of nonTheme)
  out(`    ${String(Buffer.byteLength(t)).padStart(6)} B on ${files.size} doc(s)`);
out(
  `  chunks: ${jsFiles.length}; forbidden-family sweep read ${sweptBytes.toLocaleString('en-US')} B across ${scannedSources.length} source(s)`
);
out(
  `  build mode: PRODUCTION — ${[...textOf.values()].filter((t) => PROD_BUILD_MARKER.test(t)).length} chunk(s) carry React's production error-code form, 0 carry a development message`
);
out('  client JavaScript, RAW BYTES ON DISK:');
for (const [name, c] of Object.entries(CEILINGS)) {
  const b = buckets[name];
  out(
    `    ${name.padEnd(6)} ${String(b.bytes.toLocaleString('en-US')).padStart(9)} B / ${c.limit.toLocaleString('en-US')} B ceiling` +
      `   (${b.paths.length} chunk(s), ${(c.limit - b.bytes).toLocaleString('en-US')} B headroom)`
  );
}
out(
  '    app is the island entry chunk(s); vendor is everything else. They partition the artefact,'
);
out('    and app + vendor === total is asserted, not assumed.');
for (const p of [...sizeOf.keys()].sort((a, b) => (sizeOf.get(b) ?? 0) - (sizeOf.get(a) ?? 0))) {
  out(
    `      ${String((sizeOf.get(p) ?? 0).toLocaleString('en-US')).padStart(9)} B  ${p}${appChunks.has(p) ? '  [app]' : ''}`
  );
}
out(`  worst route by reachable chunk bytes: ${worst[0]} — ${worst[1].toLocaleString('en-US')} B`);
out(
  `  every zero-JS route reaches 0 B, asserted rather than sampled (${zeroJs.length} document(s)).`
);
