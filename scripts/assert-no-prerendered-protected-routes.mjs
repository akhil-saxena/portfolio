#!/usr/bin/env node
/**
 * AUTH-03 / FND-02 build gate — refuse a build in which a protected route was prerendered.
 *
 * Usage: node scripts/assert-no-prerendered-protected-routes.mjs [distDir]   (default ./dist)
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * Two independently reasonable behaviours compose into a fail-open path:
 *
 *   1. Astro prerenders every route under src/pages by default. An endpoint that does not
 *      opt out is evaluated once, at build time, and its response is frozen into a file.
 *   2. Cloudflare Workers Static Assets serve a matching static file BEFORE the Worker runs.
 *      run_worker_first covers the prefixes, but a materialised file is still the thing the
 *      platform is asked to serve first, and the Worker — with it the middleware and every
 *      requireAccess() call — is not the code path that answers.
 *
 * Forget the opt-out on one endpoint and that endpoint's build-time output is published as a
 * static file at its own URL, unauthenticated, looking entirely correct. A smoke test passes.
 * Nothing in the response says the auth code never executed.
 *
 * The only defence that scales past human memory is a gate in the build, which is this file.
 * ---------------------------------------------------------------------------------------------
 * TWO CHECKS, NEITHER REDUNDANT
 *
 * SOURCE SIDE catches the mistake at the origin, in a tree that may not have been built, and
 * names the file the author has to edit. It rests on a model of Astro's routing (see
 * ROUTED_EXTENSIONS and the underscore rule below), and a model can be wrong.
 *
 * OUTPUT SIDE catches anything the source side's model misses — including a route materialised
 * by a mechanism nobody anticipated — but it can only see what a completed build emitted.
 *
 * ---------------------------------------------------------------------------------------------
 * TWO MEASURED FACTS THIS GATE IS BUILT ON. Both were proven with a planted violation, not
 * reasoned about, and a gate written without either is a no-op that reports success.
 *
 * (a) THE ASSETS ROOT IS NOT dist/. With an adapter attached Astro splits output into
 *     dist/client (what Static Assets serve) and dist/server (the Worker). Plan 02-04 planted a
 *     prerendered endpoint and measured that `test -d dist/api` reported ABSENT while the
 *     artifact sat in dist/client/api/. Every dist/-rooted assertion passes no matter what the
 *     build emits. This gate therefore RESOLVES the root from dist/server/wrangler.json's
 *     assets.directory rather than hardcoding it.
 *
 * (b) THE ARTIFACT IS EXTENSIONLESS. That same probe emitted dist/client/api/tmp-prerender-probe
 *     with no extension, so a companion glob for '*.json' or '*.html' would also have missed it.
 *     This gate matches on PATH SEGMENTS, not on extensions.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE SOURCE-SIDE MATCH IS NOT A grep. Phase 0 recorded that `grep -c` counts lines rather
 * than matches, and plan 02-07 caught two of its own assertions passing because the literal they
 * searched for appeared in a comment it had written itself. A commented-out declaration must not
 * satisfy this gate, so comments are stripped in Node before matching, and a file whose ONLY
 * declaration survives in the raw text but not the stripped text is reported with that exact
 * diagnosis. Control 2 in 02-NEGATIVE-CONTROLS.md exists solely to prove that branch bites.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const distDir = path.resolve(repoRoot, process.argv[2] ?? './dist');
const pagesDir = path.join(repoRoot, 'src', 'pages');

/**
 * Route prefixes that must never be answered by a static file. Kept identical to
 * wrangler.jsonc's assets.run_worker_first and to src/middleware.ts's pattern list — those
 * three lists describing the same set is the invariant; if one moves, all three move.
 */
const PROTECTED_PREFIXES = ['/admin', '/api', '/_actions'];

/**
 * Directory names that must not appear as a path segment anywhere under the assets root.
 * Segment matching rather than extension matching, for measured fact (b) above.
 */
const PROTECTED_SEGMENTS = new Set(['admin', 'api', '_actions']);

/**
 * Extensions Astro will route, transcribed from
 * node_modules/astro/dist/core/routing/create-manifest.js:
 *   validPageExtensions     = ['.astro', ...SUPPORTED_MARKDOWN_FILE_EXTENSIONS, ...pageExtensions]
 *   validEndpointExtensions = ['.js', '.ts']
 * Anything else under src/pages is not routed and is reported as skipped rather than failed —
 * .tsx and .jsx included, which Astro treats as invalidPotentialPages and warns about.
 */
const ROUTED_EXTENSIONS = new Set([
  '.astro',
  '.js',
  '.ts',
  '.md',
  '.markdown',
  '.mdown',
  '.mkdn',
  '.mkd',
  '.mdwn',
  '.mdx',
]);

/** Markdown-family extensions cannot carry a module export at all — see checkSourceSide(). */
const MARKDOWN_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.mdown',
  '.mkdn',
  '.mkd',
  '.mdwn',
  '.mdx',
]);

const failures = [];
const skipped = [];
const checked = [];

// ------------------------------------------------------------------------------------------
// Comment stripping
// ------------------------------------------------------------------------------------------

/**
 * Replace every comment in JS/TS source with spaces, preserving newlines so reported line
 * numbers stay true. Strings and template literals are tracked so that a `//` inside a string
 * is not mistaken for a comment, and — the direction that actually matters — a `//` that opens
 * a real comment is seen before any apostrophe inside it can open a phantom string.
 *
 * Regex literals are detected with the standard previous-significant-character heuristic. A
 * misread there can only cause this gate to lose a declaration it should have seen, which fails
 * loudly; it cannot cause a commented-out declaration to survive, which would fail silently.
 */
function stripJsComments(source) {
  const out = [];
  let i = 0;
  let prevSignificant = '';
  const n = source.length;

  const keep = (ch) => {
    out.push(ch);
    if (!/\s/.test(ch)) prevSignificant = ch;
  };
  const blank = (ch) => out.push(ch === '\n' ? '\n' : ' ');

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') blank(source[i++]);
      continue;
    }

    if (ch === '/' && next === '*') {
      blank(source[i++]);
      blank(source[i++]);
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) blank(source[i++]);
      if (i < n) {
        blank(source[i++]);
        blank(source[i++]);
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      keep(source[i++]);
      while (i < n) {
        if (source[i] === '\\') {
          keep(source[i++]);
          if (i < n) keep(source[i++]);
          continue;
        }
        if (source[i] === quote) {
          keep(source[i++]);
          break;
        }
        keep(source[i++]);
      }
      continue;
    }

    if (
      ch === '/' &&
      (prevSignificant === '' || '(,=:[!&|?{};+-*%~^<>'.includes(prevSignificant))
    ) {
      keep(source[i++]);
      let closed = false;
      while (i < n && source[i] !== '\n') {
        if (source[i] === '\\') {
          keep(source[i++]);
          if (i < n) keep(source[i++]);
          continue;
        }
        if (source[i] === '/') {
          keep(source[i++]);
          closed = true;
          break;
        }
        keep(source[i++]);
      }
      if (!closed) continue;
      continue;
    }

    keep(source[i++]);
  }

  return out.join('');
}

/** Strip HTML comments — only reached for the template half of an .astro file. */
function stripHtmlComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * The JS half of an .astro file is its frontmatter, between the first `---` fence and the
 * next one at line start. A `prerender` export anywhere else is not a module export and does
 * not opt the route out, so only the frontmatter is searched.
 */
function astroFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  return match ? match[1] : null;
}

/**
 * The authoritative match, run against comment-stripped source: a real module-scope declaration.
 * The leading alternation is what keeps `const s = "export const prerender = false"` from
 * counting — inside a string the keyword is preceded by a quote, which is not a statement
 * boundary.
 */
const PRERENDER_FALSE =
  /(^|[\s;}])export\s+const\s+prerender\s*(:\s*[A-Za-z_$][\w$]*\s*)?=\s*false\b/m;

/**
 * Deliberately looser, and run only against the RAW text to choose a diagnosis — never to
 * decide pass or fail. Its whole job is to tell "the author wrote this and it is inert" apart
 * from "the author never wrote it", so that the failure message names the actual mistake. It
 * must stay looser than the strict form above: a JSX comment (`{/* ... *\/}`) leaves no
 * statement terminator, and an author who has just commented out the line deserves to be told
 * that rather than told the line is missing.
 */
const PRERENDER_FALSE_ANYWHERE = /export\s+const\s+prerender\s*(:[^=]*)?=\s*false\b/;

// ------------------------------------------------------------------------------------------
// Source side
// ------------------------------------------------------------------------------------------

/**
 * Astro's own skip rules, transcribed from create-manifest.js (both walk implementations):
 *   const name = ext ? basename.slice(0, -ext.length) : basename;
 *   if (name[0] === "_") continue;
 *   if (basename[0] === "." && basename !== ".well-known") continue;
 * The rule applies to directories as well as files, which is why a single `_`-prefixed
 * ancestor takes an entire subtree out of routing.
 */
function astroSkipReason(basename, isDir) {
  const ext = isDir ? '' : path.extname(basename);
  const name = ext ? basename.slice(0, -ext.length) : basename;
  if (name[0] === '_')
    return 'basename begins with "_" — Astro never routes it (create-manifest.js)';
  if (basename[0] === '.' && basename !== '.well-known') return 'dotfile — Astro never routes it';
  return null;
}

/** Derive the URL path Astro will serve a page file at, the way Astro derives it. */
function routePathFor(relPosixPath) {
  const ext = path.posix.extname(relPosixPath);
  let withoutExt = ext ? relPosixPath.slice(0, -ext.length) : relPosixPath;
  if (path.posix.basename(withoutExt) === 'index') {
    withoutExt = path.posix.dirname(withoutExt);
    if (withoutExt === '.') withoutExt = '';
  }
  return `/${withoutExt}`.replace(/\/+$/, '') || '/';
}

function isProtectedRoute(routePath) {
  return PROTECTED_PREFIXES.some((p) => routePath === p || routePath.startsWith(`${p}/`));
}

function walkPages(dir, relParts = []) {
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = path.join(dir, entry.name);
    const rel = [...relParts, entry.name].join('/');
    const skipReason = astroSkipReason(entry.name, entry.isDirectory());

    if (skipReason) {
      // Reported rather than dropped. A silently skipped file under a protected prefix is
      // exactly where a defect hides, and a reader of the build log should see the skip and
      // its reason. Plan 02-06's Control 1 fixture is deliberately NOT underscore-prefixed
      // for this reason: an underscore fixture is skipped here AND never routed by Astro, so
      // it would prove nothing while appearing to.
      skipped.push({ file: `src/pages/${rel}`, reason: skipReason });
      continue;
    }

    if (entry.isDirectory()) {
      walkPages(abs, [...relParts, entry.name]);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!ROUTED_EXTENSIONS.has(ext)) {
      skipped.push({
        file: `src/pages/${rel}`,
        reason: `${ext || '(no extension)'} is not a routed extension`,
      });
      continue;
    }

    const routePath = routePathFor(rel);
    if (!isProtectedRoute(routePath)) continue;

    checkSourceFile(abs, `src/pages/${rel}`, routePath, ext);
  }
}

function checkSourceFile(abs, display, routePath, ext) {
  checked.push({ file: display, route: routePath });
  const raw = fs.readFileSync(abs, 'utf8');

  if (MARKDOWN_EXTENSIONS.has(ext)) {
    failures.push({
      file: display,
      route: routePath,
      reason:
        'a markdown route cannot declare `export const prerender = false` at all, so it is ' +
        'always prerendered and can never sit behind auth. Move it out of the protected prefix.',
    });
    return;
  }

  let js = raw;
  if (ext === '.astro') {
    const frontmatter = astroFrontmatter(raw);
    if (frontmatter === null) {
      failures.push({
        file: display,
        route: routePath,
        reason:
          'no `---` frontmatter fence, so the file cannot declare `export const prerender = false` ' +
          'and is prerendered.',
      });
      return;
    }
    js = stripHtmlComments(frontmatter);
  }

  const stripped = stripJsComments(js);

  if (PRERENDER_FALSE.test(stripped)) return;

  const survivesRaw = PRERENDER_FALSE_ANYWHERE.test(raw);
  failures.push({
    file: display,
    route: routePath,
    reason: survivesRaw
      ? 'the text `export const prerender = false` IS present but is not a live declaration — it ' +
        'survives only inside a comment, a string or a regex literal. It opts nothing out: the ' +
        'route is prerendered exactly as if the line had never been written.'
      : 'no uncommented `export const prerender = false`, so Astro prerenders this route.',
  });
}

// ------------------------------------------------------------------------------------------
// Output side
// ------------------------------------------------------------------------------------------

/**
 * Resolve the directory Cloudflare Static Assets will actually serve. See measured fact (a):
 * assuming ./dist here is how this whole gate becomes a no-op.
 */
function resolveAssetsRoot() {
  const deployConfig = path.join(distDir, 'server', 'wrangler.json');
  if (fs.existsSync(deployConfig)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(deployConfig, 'utf8'));
      const declared = parsed?.assets?.directory;
      if (typeof declared === 'string' && declared.length > 0) {
        return {
          root: path.resolve(path.dirname(deployConfig), declared),
          how: `resolved from ${path.relative(repoRoot, deployConfig)} (assets.directory = ${JSON.stringify(declared)})`,
        };
      }
    } catch (error) {
      return { root: null, how: `dist/server/wrangler.json is unreadable: ${error.message}` };
    }
    return { root: null, how: 'dist/server/wrangler.json declares no assets.directory' };
  }

  const clientDir = path.join(distDir, 'client');
  if (fs.existsSync(clientDir)) {
    return {
      root: clientDir,
      how: 'no adapter deploy config found; fell back to <dist>/client, which exists',
    };
  }
  return {
    root: distDir,
    how: 'no adapter deploy config and no <dist>/client; fell back to <dist> itself',
  };
}

function walkFiles(dir, relParts = [], acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = [...relParts, entry.name];
    if (entry.isDirectory()) {
      acc.push({ rel: rel.join('/'), isDir: true });
      walkFiles(path.join(dir, entry.name), rel, acc);
    } else {
      acc.push({ rel: rel.join('/'), isDir: false });
    }
  }
  return acc;
}

function checkOutputSide() {
  if (!fs.existsSync(distDir)) {
    failures.push({
      file: path.relative(repoRoot, distDir) || 'dist',
      route: '(build output)',
      reason:
        'the build output does not exist, so the output-side half of this gate has nothing to ' +
        'inspect. This is a failure and not a skip on purpose: a gate that quietly passes when ' +
        'there is nothing to check is how a phase ships an assertion that never ran. Run ' +
        '`astro build` first.',
    });
    return null;
  }

  const { root, how } = resolveAssetsRoot();
  if (root === null || !fs.existsSync(root)) {
    failures.push({
      file: path.relative(repoRoot, distDir),
      route: '(build output)',
      reason: `could not resolve the Static Assets root — ${how}. Refusing to guess: an unresolved root means every output-side assertion below would pass vacuously.`,
    });
    return null;
  }

  for (const entry of walkFiles(root)) {
    const segments = entry.rel.split('/');
    const hit = segments.find((s) => PROTECTED_SEGMENTS.has(s));
    if (hit) {
      failures.push({
        file: `${path.relative(repoRoot, root)}/${entry.rel}`,
        route: `/${entry.rel}`,
        reason: `materialised under a protected path segment "${hit}" in the directory Static Assets serve.`,
      });
      continue;
    }
    if (!entry.isDir && /(^|\/)(admin|api)\.html$/.test(entry.rel)) {
      failures.push({
        file: `${path.relative(repoRoot, root)}/${entry.rel}`,
        route: `/${entry.rel.replace(/\.html$/, '')}`,
        reason:
          'a protected route materialised as a static HTML file (build.format: "file" shape).',
      });
    }
  }

  // The literal dist/-rooted forms, kept underneath the resolved check rather than instead of
  // it. With an adapter attached these can never fire (measured fact (a)); without one — a
  // future static-only build, or someone running this gate against a fixture — they are the
  // only thing that would.
  for (const name of [...PROTECTED_SEGMENTS, 'admin.html']) {
    const literal = path.join(distDir, name);
    if (fs.existsSync(literal) && path.resolve(literal) !== path.resolve(root, name)) {
      failures.push({
        file: path.relative(repoRoot, literal),
        route: `/${name}`,
        reason: 'a protected path exists directly under <dist>, outside the resolved assets root.',
      });
    }
  }

  return { root, how };
}

// ------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------

if (!fs.existsSync(pagesDir)) {
  console.error(
    'assert-no-prerendered-protected-routes: src/pages does not exist — nothing to check.'
  );
  process.exit(1);
}

walkPages(pagesDir);
const output = checkOutputSide();

if (failures.length > 0) {
  console.error('');
  console.error(
    '══════════════════════════════════════════════════════════════════════════════════'
  );
  console.error('  BUILD REFUSED — AUTH-03: a protected route is (or would be) prerendered');
  console.error(
    '══════════════════════════════════════════════════════════════════════════════════'
  );
  console.error('');
  for (const failure of failures) {
    console.error(`  ✖ ${failure.file}`);
    console.error(`      route:  ${failure.route}`);
    console.error(`      reason: ${failure.reason}`);
    console.error('');
  }
  console.error('  WHY THIS IS FATAL, not a warning:');
  console.error('');
  console.error(
    '    Cloudflare Workers Static Assets serve a matching static file BEFORE the Worker'
  );
  console.error(
    '    runs. A prerendered route under /admin, /api or /_actions is therefore published'
  );
  console.error(
    '    as a plain file at its own URL: src/middleware.ts never executes, requireAccess()'
  );
  console.error(
    '    never executes, and the response looks completely correct to anyone testing it —'
  );
  console.error(
    '    including to a smoke test that asserts a 200 and a valid body. Nothing about the'
  );
  console.error(
    '    response reveals that no authentication happened. There is no runtime signal.'
  );
  console.error('');
  console.error('  HOW TO FIX:');
  console.error('');
  console.error(
    '    Add `export const prerender = false;` to each source file above — uncommented, at'
  );
  console.error(
    '    module scope (in the `---` frontmatter for a .astro page). Then rebuild, so the'
  );
  console.error('    stale artifact is removed from the assets directory as well.');
  console.error('');
  console.error(`  ${failures.length} finding(s). Requirement AUTH-03; threats T-02-14, T-02-24.`);
  console.error('');
  process.exit(1);
}

console.log('assert-no-prerendered-protected-routes: PASS');
console.log(
  `  source side: ${checked.length} routed file(s) under ${PROTECTED_PREFIXES.join(', ')} each declare an uncommented \`export const prerender = false\``
);
for (const entry of checked) console.log(`    ✓ ${entry.file}  →  ${entry.route}`);
if (skipped.length > 0) {
  console.log(`  not routed by Astro, so not checked (${skipped.length}):`);
  for (const entry of skipped) console.log(`    · ${entry.file}  —  ${entry.reason}`);
}
console.log(`  output side: no api/, admin/ or _actions/ path under the Static Assets root`);
console.log(`    root: ${path.relative(repoRoot, output.root)}  (${output.how})`);
