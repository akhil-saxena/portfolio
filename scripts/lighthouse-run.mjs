/**
 * The Lighthouse run `05-UI-SPEC.md` §7.2 and §9.2 were both waiting on, and the measurement
 * behind the project's "Lighthouse 95+ on public pages" constraint.
 *
 * ================================================================================================
 * WHAT THIS MEASURES, AND WHY IT IS A LOCAL RUN RATHER THAN A GATE
 * ================================================================================================
 *
 * Six route FAMILIES, not six URLs: `/`, `/photos`, one `/photos/[category]`, one
 * `/photos/[category]/[slug]`, `/work`, `/resume`. Every other route in the build is one of these
 * six with different content, so a seventh URL would cost a minute and add no information.
 *
 * It is deliberately NOT chained into `npm test` or `npm run build`, for the same reason
 * `audit:public` is not (see the `//audit:public` sibling key in `package.json`): a Lighthouse
 * score is deterministic PER MACHINE, not per platform. CPU contention, thermal state and the
 * remote image origin all move it. Phase 8 owns whether any of it becomes a CI gate under QUAL-01.
 *
 * ================================================================================================
 * THE ORIGIN IS SERVED HERE, GZIPPED, AND THAT IS A FIDELITY DECISION
 * ================================================================================================
 *
 * `test/audit/serve-dist.mjs` exists and serves the same artefact, but it answers `no-store` and
 * sends every byte uncompressed — both correct for a geometry audit, both wrong here:
 *
 *   - Cloudflare compresses text assets. Serving `/photos`'s document uncompressed presents
 *     Lighthouse with ~106 KB where production sends ~20 KB, and simulated throttling turns
 *     transfer bytes directly into FCP and LCP milliseconds. The score would be a measurement of
 *     this server rather than of the site.
 *   - `dist/client/_headers` declares `Cache-Control: public, max-age=31536000, immutable` for
 *     `/_astro/*`. It is replicated below so the cache-policy audit reads what will ship.
 *
 * Images are NOT served from here and must not be: `IMAGE_ORIGIN` is
 * `https://images.akhilsaxena.com`, so the 39 gallery photographs are fetched from the real CDN
 * exactly as a visitor fetches them. That is the point — the gallery's weight is the thing under
 * measurement, and a local copy of it would measure a fiction.
 *
 * ================================================================================================
 * MEDIAN OF THREE, AND THE BROWSER IS PINNED
 * ================================================================================================
 *
 * A single Lighthouse run is not a measurement; TBT and LCP move several points between
 * consecutive runs on an unloaded machine. Three runs per route per preset, median reported,
 * spread printed — so a wide spread is visible rather than averaged away.
 *
 * `CHROME_PATH` defaults to Playwright's pinned Chrome for Testing, the same binary
 * `npm run audit:public` drives. Using the developer's own Chrome would put extensions, a warm
 * profile and an auto-update channel inside the measurement.
 */

import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const ROOT = resolve('dist/client');
const OUT_DIR = resolve('lighthouse-report');
const PORT = Number(process.env.LH_PORT ?? 4400);
const RUNS = Number(process.env.LH_RUNS ?? 3);

/** The six route families. `label` is what the report table is keyed on. */
const ROUTES = [
  { label: 'Home', path: '/' },
  { label: 'Photos (39-photo gallery)', path: '/photos' },
  { label: 'Photos category', path: '/photos/architecture' },
  { label: 'Photo detail', path: '/photos/architecture/hawamahaldaytime' },
  { label: 'Work', path: '/work' },
  { label: 'Résumé', path: '/resume' },
];

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

if (!existsSync(join(ROOT, 'index.html'))) {
  process.stderr.write(
    `lighthouse-run: ${ROOT}/index.html does not exist. Run \`npm run build\` first — scoring an ` +
      'empty root would report six 404 pages as six passing ones.\n'
  );
  process.exit(1);
}

/* ══ 1. WHICH BUNDLE IS BEING MEASURED — printed, never assumed ════════════════════════════════
 *
 * Plan 05-14 measured that a build run under `NODE_ENV=test` resolves React through the
 * `development` export condition and leaves 411,410 B of React devtools plumbing in `dist/` —
 * 197 KB that never ships. A score taken against that artefact is not a score of this site, so
 * the run states which artefact it read and proves it by the absence of React's dev-only strings.
 */
const DEV_ONLY_STRINGS = ['Invalid hook call', 'Each child in a list'];
function bundleProvenance() {
  const dir = join(ROOT, '_astro');
  const chunks = readdirSync(dir).filter((f) => f.endsWith('.js'));
  let devMarkers = 0;
  const sizes = {};
  for (const f of chunks) {
    const body = readFileSync(join(dir, f), 'utf8');
    sizes[f] = statSync(join(dir, f)).size;
    for (const s of DEV_ONLY_STRINGS) if (body.includes(s)) devMarkers += 1;
  }
  return { sizes, devMarkers, total: Object.values(sizes).reduce((a, b) => a + b, 0) };
}

/* ══ 2. THE ORIGIN ════════════════════════════════════════════════════════════════════════════ */

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

/** Cloudflare compresses these and not the already-compressed ones (woff2, webp, png). */
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt']);

/** `/work` -> `dist/client/work/index.html`; a miss is a loud 404, never an empty 200. */
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
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`404 ${url.pathname}`);
    return;
  }
  const ext = extname(file);
  const headers = {
    'content-type': TYPES.get(ext) ?? 'application/octet-stream',
    // Replicates dist/client/_headers. Everything else gets the Cloudflare default for an
    // unconfigured asset, which is a short revalidating TTL rather than no-store.
    'cache-control': url.pathname.startsWith('/_astro/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  };
  const wantsGzip = (req.headers['accept-encoding'] ?? '').includes('gzip');
  if (wantsGzip && COMPRESSIBLE.has(ext)) {
    headers['content-encoding'] = 'gzip';
    headers.vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    createReadStream(file).pipe(createGzip()).pipe(res);
    return;
  }
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
});

/* ══ 3. THE RUN ═══════════════════════════════════════════════════════════════════════════════ */

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function scoreOnce(chrome, url, preset) {
  const options = {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: CATEGORIES,
  };
  const config = preset === 'desktop' ? desktopConfig : undefined;
  const runnerResult = await lighthouse(url, options, config);
  const lhr = runnerResult.lhr;
  const scores = {};
  for (const c of CATEGORIES) scores[c] = Math.round((lhr.categories[c].score ?? 0) * 100);
  return {
    scores,
    metrics: {
      FCP: Math.round(lhr.audits['first-contentful-paint'].numericValue),
      LCP: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
      TBT: Math.round(lhr.audits['total-blocking-time'].numericValue),
      CLS: Math.round((lhr.audits['cumulative-layout-shift'].numericValue ?? 0) * 1000) / 1000,
      SI: Math.round(lhr.audits['speed-index'].numericValue),
    },
    // The two audits §7.2 and §9.2 turn on, carried through so the answer is in the record
    // rather than re-derived from a score.
    unsizedImages: lhr.audits['unsized-images']?.score ?? null,
    unsizedImageCount: lhr.audits['unsized-images']?.details?.items?.length ?? null,
    failedAudits: Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === 'binary')
      .map((a) => a.id),
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const provenance = bundleProvenance();

  process.stdout.write('lighthouse-run: artefact provenance\n');
  for (const [f, n] of Object.entries(provenance.sizes)) {
    process.stdout.write(`  ${f.padEnd(34)} ${String(n).padStart(9)} B\n`);
  }
  process.stdout.write(
    `  total ${provenance.total} B · React dev-only strings: ${provenance.devMarkers}\n`
  );
  if (provenance.devMarkers > 0) {
    process.stderr.write(
      'lighthouse-run: REFUSING TO SCORE. The artefact contains React development strings, so it ' +
        'is the development bundle (05-14). Rebuild with `npm run build` from a shell where ' +
        'NODE_ENV is unset.\n'
    );
    process.exit(1);
  }

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  process.stdout.write(`lighthouse-run: ${ROOT} on http://127.0.0.1:${PORT} (gzip)\n\n`);

  // Playwright's pinned Chrome for Testing, resolved through its own API rather than by pasting
  // a cache path that carries a build number. `undefined` lets chrome-launcher find a system
  // Chrome, which is the documented fallback and is stated in the output either way.
  const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
  const usePinned = Boolean(chromePath) && existsSync(chromePath);
  process.stdout.write(
    `lighthouse-run: browser ${usePinned ? chromePath : 'system Chrome (chrome-launcher default)'}\n`
  );
  const chrome = await launch({
    chromePath: usePinned ? chromePath : undefined,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });

  const results = [];
  for (const preset of ['mobile', 'desktop']) {
    for (const route of ROUTES) {
      const url = `http://127.0.0.1:${PORT}${route.path}`;
      const runs = [];
      for (let i = 0; i < RUNS; i++) runs.push(await scoreOnce(chrome, url, preset));
      const row = {
        preset,
        label: route.label,
        path: route.path,
        scores: Object.fromEntries(
          CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])
        ),
        spread: Object.fromEntries(
          CATEGORIES.map((c) => {
            const xs = runs.map((r) => r.scores[c]);
            return [c, `${Math.min(...xs)}-${Math.max(...xs)}`];
          })
        ),
        metrics: Object.fromEntries(
          Object.keys(runs[0].metrics).map((m) => [m, median(runs.map((r) => r.metrics[m]))])
        ),
        unsizedImages: runs[0].unsizedImages,
        unsizedImageCount: runs[0].unsizedImageCount,
        failedAudits: [...new Set(runs.flatMap((r) => r.failedAudits))].sort(),
      };
      results.push(row);
      const s = row.scores;
      process.stdout.write(
        `${preset.padEnd(8)} ${route.path.padEnd(38)} ` +
          `perf ${String(s.performance).padStart(3)}  a11y ${String(s.accessibility).padStart(3)}  ` +
          `bp ${String(s['best-practices']).padStart(3)}  seo ${String(s.seo).padStart(3)}\n`
      );
    }
  }

  // `chrome-launcher`'s `kill()` is typed as returning void in the version installed here, so
  // `await` on it draws ts(80007) under `astro check`, which runs over `scripts/**`. It is
  // synchronous in effect; called without await rather than suppressed with a comment directive.
  chrome.kill();
  server.close();

  const record = { runs: RUNS, provenance, results, when: new Date().toISOString() };
  writeFileSync(join(OUT_DIR, 'lighthouse.json'), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`\nlighthouse-run: wrote ${join(OUT_DIR, 'lighthouse.json')}\n`);

  const under95 = results.filter((r) => CATEGORIES.some((c) => r.scores[c] < 95));
  if (under95.length > 0) {
    process.stdout.write('\nUNDER 95 — reported, not fixed:\n');
    for (const r of under95) {
      const bad = CATEGORIES.filter((c) => r.scores[c] < 95).map((c) => `${c} ${r.scores[c]}`);
      process.stdout.write(`  ${r.preset} ${r.path}: ${bad.join(', ')}\n`);
    }
  }
}

await main();
