/**
 * The static origin for the six-class audit. Plan 05-15, task 1.
 *
 * ================================================================================================
 * WHY THIS FILE EXISTS AT ALL — IT IS NOT IN THE PLAN'S `files_modified`
 * ================================================================================================
 *
 * The plan's task 1 says "serve the BUILT artefact — `dist/client/` behind a static server". It
 * names no server, and Playwright's `webServer` option takes a COMMAND, not a function, so the
 * server cannot live inside `playwright.config.ts` without being started once per worker process
 * and racing itself on the port. This file is the command. Recorded as a deviation in the summary.
 *
 * `npx astro preview` (real workerd, via wrangler) was the alternative and was NOT taken:
 *   - The redirect and header behaviour it would add is already asserted, over real workerd, by
 *     `test/public/seo.node.test.ts` and 05-13's `_redirects` byte comparison. This audit measures
 *     GEOMETRY, TYPE and COLOUR, none of which an origin can change.
 *   - wrangler boots a second runtime, reads `wrangler.jsonc`, binds R2 and the analytics dataset,
 *     and can prompt or warm a cache. Every one of those is a variable in a measurement harness
 *     and none of them is under measurement.
 *
 * ================================================================================================
 * THE RESOLUTION RULE, AND WHY IT IS NOT "JUST SERVE THE FILE"
 * ================================================================================================
 *
 * Astro's directory build format emits `dist/client/development/index.html` and the site links to
 * `/development` with NO trailing slash (see `dist/client/_redirects`, which 05-13 measured both ways).
 * Cloudflare Static Assets does that mapping in production. A naive `fs.readFile(url)` 404s every
 * route on the site and the audit would report six blank pages as six passing ones — the exact
 * failure class T-05-15-01 names. So the resolution order is stated, and a miss is a LOUD 404
 * carrying the path it tried, never an empty 200.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'dist/client');
const PORT = Number(process.env.AUDIT_PORT ?? 4399);

if (!existsSync(join(ROOT, 'index.html'))) {
  process.stderr.write(
    `serve-dist: ${ROOT}/index.html does not exist, so there is nothing to audit. ` +
      'Run `npm run build` first. Serving an empty root would answer every request with a 404 ' +
      'and an audit that walked it would measure a blank page at six device classes.\n'
  );
  process.exit(1);
}

/** Content types for everything this build actually emits. Anything else is served as bytes. */
const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

/**
 * `/development` -> `dist/client/development/index.html`. The order is: the literal path, then the directory
 * index, then the same path with `.html`. Returns `null` rather than guessing.
 *
 * `normalize` before `join` and a containment check after it: a request for `/../../etc/passwd`
 * must not read outside the root even in a local harness, because a harness that is exploitable
 * teaches the pattern to the next one that is not local.
 */
function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = resolve(join(ROOT, clean));
  if (base !== ROOT && !base.startsWith(`${ROOT}/`)) return null;

  for (const candidate of [base, join(base, 'index.html'), `${base}.html`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const file = resolveFile(url.pathname);

  if (file === null) {
    const notFound = join(ROOT, '404.html');
    const body = existsSync(notFound) ? null : `404 ${url.pathname}`;
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    if (body === null) createReadStream(notFound).pipe(res);
    else res.end(body);
    return;
  }

  res.writeHead(200, {
    'content-type': TYPES.get(extname(file)) ?? 'application/octet-stream',
    // The audit measures first paint at six viewports, twice. A cached document would hide a
    // rebuild between the two runs and report the old artefact as the new one.
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`serve-dist: ${ROOT} on http://127.0.0.1:${PORT}\n`);
});
