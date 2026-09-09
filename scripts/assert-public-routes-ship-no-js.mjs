#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_DIST = path.join(REPO_ROOT, 'dist', 'client');
const SITE_CONFIG = path.join(REPO_ROOT, 'data', 'site_config.json');
const PHOTO_MANIFEST = path.join(REPO_ROOT, 'data', 'portfolio_images.json');

const rel = (p) => {
  const r = path.relative(REPO_ROOT, p);
  return !r || r.startsWith('..') ? p : r;
};

const CEILINGS = {
  app: {
    limit: 21_000,
    measured: 20_032,
    what: 'the island entry chunks a document names as `component-url` (not their imports)',
    why: 'set 968 B below measured, which is under the 1,901 B un-tree-shaken-helper regression 05-12 measured, so that event is still red',
  },
  router: {
    limit: 20_000,
    measured: 16_338,
    what: "Astro's view-transition router, the one module script a routed document may name",
    why: 'set just above the measurement, so the bucket cannot absorb anything else',
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

const PIPELINE_MARKERS = [
  { id: 'PIPELINE-PATH', pattern: /photo-pipeline/i },
  { id: 'PIPELINE-CRYPTO', pattern: /node:crypto|createHash/ },
];

const DEV_BUILD_MARKERS = [/Invalid hook call/, /Each child in a list/, /unique "key"/];
const PROD_BUILD_MARKER = /Minified React error/;

const ROUTER_URL = /^\/_astro\/ClientRouter\.[A-Za-z0-9_.-]+\.js$/;

const ISLAND_EXPORT = 'PhotoFilters';
const ISLAND_URL = /^\/_astro\/PhotoFilters\.[A-Za-z0-9_-]+\.js$/;

function scriptBlocks(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({
    attrs: m[1],
    text: m[2],
  }));
}

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
    canary: '<astro-island component-url="/_astro/PhotoFilters.aaaaaaaa.js"></astro-island>',
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
      '<astro-island component-url="/_astro/PhotoFilters.jLpnyao1.js" component-export="PhotoFilters" props="{&quot;a&quot;:&quot;it\'s here&quot;}"></astro-island>',
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
    /* `photo-srcset.js`, not `photo-lightbox.js`: that module was deleted with the overlay it
       served. The anti-canary only has to be near-miss vocabulary that must not red a correct
       build, but naming a module that no longer exists makes the self-test read as stale. */
    antiCanary: 'import{srcsetFor}from"../lib/photo-srcset.js";',
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

/* ---------------------------------------------------------------------------------------------
 * THE THIRD ROUTE CLASS — ROUTED. Added 2026-09-03, and this is a widening of a reviewed
 * guarantee, so it is argued rather than asserted.
 * ---------------------------------------------------------------------------------------------
 *
 * This gate had two classes: HYDRATING (the gallery routes, one island each) and ZERO-JS
 * (everything else, no JavaScript at all). A photograph's own page was zero-JS, and its previous
 * and next arrows were ordinary links — so every step was a full document navigation. MEASURED at
 * 330ms with 16,624 bytes re-fetched, the bar and the footer re-parsed and repainted each time.
 *
 * Akhil: *"only the photo part is the one that re renders or updates and the text updates, but rest
 * of the elements since they are in the existing same position, we don't move at all, and they
 * don't re render."* That is `<ClientRouter />` with `transition:persist`, and it cannot be done
 * without a module script.
 *
 * THE ARITHMETIC IS WHY THIS IS A WIDENING AND NOT A HOLE: 16,338 bytes raw, 5,635 gzipped, ONCE,
 * cached across all 40 documents — against 16,624 bytes re-fetched on EVERY step. A visitor who
 * moves twice has already paid for it. The old guarantee bought nothing on this route family; it
 * cost bytes.
 *
 * WHAT A ROUTED DOCUMENT MAY CARRY, and it is narrower than a hydrating one:
 *
 *   - the theme block, like every document
 *   - Astro's view-transition bootstrap, one inline block
 *   - exactly one `<script type="module" src>`, and it must resolve to the ClientRouter chunk
 *   - NO `<astro-island>`. A routed page is still framework-free; a client:* directive here is
 *     still a failure, and A4-ROUTED-ISLAND below says so.
 *
 * DERIVED FROM THE MANIFEST, never listed. The set is every photograph's own page, computed the
 * way the route computes it, so a photograph added or removed changes this set too — the same
 * property `expectHydrating` has, and for the same reason: a hand-written list cannot notice a
 * route that appeared, and cannot notice one that vanished.
 */
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(PHOTO_MANIFEST, 'utf8'));
} catch (e) {
  err(`assert-public-routes-ship-no-js: could not read ${rel(PHOTO_MANIFEST)} — ${e.message}`);
  err('  The routed route set is derived from it and cannot be guessed.');
  process.exit(1);
}
if (!Array.isArray(manifest) || manifest.length === 0) {
  err(`assert-public-routes-ship-no-js: ${rel(PHOTO_MANIFEST)} yielded no photographs.`);
  err('  The routed set would be empty and this gate would pass by having nothing to check.');
  process.exit(1);
}

const expectRouted = new Set(
  manifest.map((photo) => {
    const prefix = `${photo.category}-`;
    if (!String(photo.id).startsWith(prefix)) {
      err(
        `assert-public-routes-ship-no-js: ${JSON.stringify(photo.id)} does not begin with its ` +
          `category prefix ${JSON.stringify(prefix)}, so its route cannot be derived.`
      );
      process.exit(1);
    }
    const slug = String(photo.id).slice(prefix.length);
    return path.join(distRoot, 'photography', photo.category, slug, 'index.html');
  })
);

const missingRouted = [...expectRouted].filter((f) => !fs.existsSync(f));
if (missingRouted.length > 0) {
  err(
    'assert-public-routes-ship-no-js: a photograph route derived from the manifest was not built:'
  );
  for (const f of missingRouted) err(`  ${rel(f)}`);
  err('  The routed set is incomplete, so a PASS would be about the routes that happen to exist.');
  process.exit(1);
}

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
const routed = htmlFiles.filter((f) => expectRouted.has(f));
const zeroJs = htmlFiles.filter(
  (f) => !expectHydrating.has(f) && !expectRouted.has(f) && path.basename(f) !== '404.html'
);

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

/*
 * ONLY GENUINELY INLINE BLOCKS. A `<script type="module" src=…>` has an EMPTY inner text, and
 * counting that empty string as an inline script is what made the router look like a third
 * bootstrap: A2-SCRIPT-SET reported `0 B on 40 doc(s)`. A block with a `src` is an external
 * reference and is checked as one — A4-MODULE-URL and A1-SRC both look at exactly that attribute.
 */
const scriptTexts = new Map(); // text -> Set(files)
for (const f of htmlFiles) {
  for (const b of scriptBlocks(fs.readFileSync(f, 'utf8'))) {
    if (hasSrc(b.attrs)) continue;
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
  /* A routed document is permitted Astro's view-transition bootstrap, so it is not "zero-JS" for
     the purpose of this leak check. It is still refused an ISLAND and any chunk but the router's —
     see the A4 branch. */
  const onZero = [...files].filter((f) => !expectHydrating.has(f) && !expectRouted.has(f));
  if (onZero.length > 0) {
    add(
      'A2-BOOTSTRAP-LEAK',
      rel(onZero[0]),
      `a non-theme inline script (${Buffer.byteLength(t)} B) appears on ${onZero.length} zero-JS ` +
        'document(s). Only the hydrating and routed routes may carry one.'
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
  const isRouted = expectRouted.has(f);
  const is404 = path.basename(f) === '404.html' && !isHydrating && !isRouted;

  if (isRouted) {
    /* ---------------------------------------------------------------------------------------
     * A4 — a ROUTED document. Framework-free, and permitted exactly one module script.
     * ---------------------------------------------------------------------------------------
     * Narrower than the hydrating branch on purpose: the point of the third class is that these
     * pages navigate without reloading, NOT that they may run anything.
     */
    if (islands.length !== 0) {
      add(
        'A4-ISLAND',
        where,
        `carries ${islands.length} <astro-island> element(s). A routed document may carry the ` +
          'view-transition router and nothing else — a client:* directive here is still a ' +
          `failure. Chunk(s): ${islands.map((t) => attr(t, 'component-url') ?? '(unnamed)').join(', ')}`
      );
    }

    const modules = blocks.filter((b) => isModule(b.attrs));
    if (modules.length !== 1) {
      add(
        'A4-MODULE-COUNT',
        where,
        `carries ${modules.length} <script type="module"> block(s); a routed document may carry ` +
          'exactly one, the view-transition router.'
      );
    }
    for (const b of modules) {
      const src = /\bsrc=(?:"([^"]*)"|'([^']*)')/.exec(b.attrs);
      const url = src ? (src[1] ?? src[2]) : null;
      if (url === null || !ROUTER_URL.test(url)) {
        add(
          'A4-MODULE-URL',
          where,
          `names ${JSON.stringify(url)} as its module script, which is not the ClientRouter ` +
            'chunk. Some other JavaScript reached this route.'
        );
      } else if (!sizeOf.has(url)) {
        add('A4-MISSING', where, `names ${url}, and no such file exists under the dist root.`);
      }
    }

    /* Every chunk this document names must be the router's. `chunkPathsNamedBy` is broader than
       the module-src check above — it also catches a preload or a bare reference — so a second
       chunk sneaking in by another spelling is caught here rather than passing. */
    const strays = named.filter((u) => !ROUTER_URL.test(u));
    if (strays.length !== 0) {
      add(
        'A4-CHUNKREF',
        where,
        `names ${strays.length} chunk(s) that are not the router: ${strays.join(', ')}`
      );
    }

    /* theme + router module + Astro's view-transition bootstrap. */
    /* TWO, measured, not three. Astro's router is a single `<script type="module" src>`; there is
       no separate inline bootstrap on these documents — the "third script" the first version of
       this rule expected was that module tag's own empty inner text, which `scriptTexts` no longer
       collects. */
    if (blocks.length !== 2) {
      add(
        'A4-COUNT',
        where,
        `carries ${blocks.length} <script> block(s); a routed document carries exactly two — the ` +
          "theme block and the view-transition router's module script."
      );
    }
    /* The router is one shared chunk, not per-route weight; the ceiling below counts it once. */
    perRouteBytes.set(where, 0);
  } else if (!isHydrating) {
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

/*
 * THE ROUTER GETS ITS OWN BUCKET, and that is the point rather than a convenience.
 *
 * Left in VENDOR it took that bucket to 208,037 B against a 200,000 ceiling — and the refusal read
 * "React + @astrojs/react client runtime ... a second framework runtime cannot fit under it", which
 * would have been blaming React for a view-transition router. A ceiling that names the wrong cause
 * is the failure this file's own header warns about twice.
 *
 * Separated, each number still means what it says: VENDOR is the framework runtime and its old
 * ceiling still refuses a duplicated React; ROUTER is one shared 16 KB chunk with a tight ceiling of
 * its own, so it cannot grow into a general JavaScript allowance.
 */
const routerChunks = [...sizeOf.keys()].filter((p) => ROUTER_URL.test(p));
const vendorChunks = [...sizeOf.keys()].filter((p) => !appChunks.has(p) && !ROUTER_URL.test(p));
const bytesOf = (paths) => [...paths].reduce((n, p) => n + (sizeOf.get(p) ?? 0), 0);

const buckets = {
  app: { paths: [...appChunks], bytes: bytesOf(appChunks) },
  router: { paths: routerChunks, bytes: bytesOf(routerChunks) },
  vendor: { paths: vendorChunks, bytes: bytesOf(vendorChunks) },
  total: { paths: [...sizeOf.keys()], bytes: bytesOf(sizeOf.keys()) },
};
if (buckets.app.bytes + buckets.router.bytes + buckets.vendor.bytes !== buckets.total.bytes) {
  add(
    'A6-PARTITION',
    rel(distRoot),
    `app (${buckets.app.bytes} B) + router (${buckets.router.bytes} B) + vendor ` +
      `(${buckets.vendor.bytes} B) !== total (${buckets.total.bytes} B). The three buckets are ` +
      'meant to partition the artefact, so a chunk is counted twice or not at all, and the ' +
      'ceilings mean less than they say.'
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
  `    ${zeroJs.length} zero-JS + ${routed.length} routed + ${hydrating.length} hydrating + 1 404 = ` +
    `${zeroJs.length + routed.length + hydrating.length + 1}`
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
