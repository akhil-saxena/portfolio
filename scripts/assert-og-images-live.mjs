#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { IMAGE_ORIGIN } from '../src/lib/image-origin.ts';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const DEFAULT_DIST = './dist';
const DEFAULT_CONCURRENCY = 6;
const ATTEMPTS = 3;

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const IMAGE_META_PROPERTIES = Object.freeze(['og:image', 'og:image:secure_url', 'twitter:image']);

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function readAttribute(tag, name) {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(tag);
  if (quoted !== null) return decodeEntities(quoted[2]);
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s"'>]+)`, 'i').exec(tag);
  return bare === null ? null : decodeEntities(bare[1]);
}

export function extractImageMeta(html) {
  const found = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = readAttribute(tag, 'property') ?? readAttribute(tag, 'name');
    if (key === null) continue;
    if (!IMAGE_META_PROPERTIES.includes(key.trim().toLowerCase())) continue;
    const content = readAttribute(tag, 'content');
    found.push({ property: key.trim().toLowerCase(), content });
  }
  return found;
}

const IMG = `${IMAGE_ORIGIN}/photos/architecture/singapore-lg.webp`;

const CANARIES = [
  ['double-quoted, spec order', `<meta property="og:image" content="${IMG}">`, [IMG]],
  ['single-quoted', `<meta property='og:image' content='${IMG}'>`, [IMG]],
  ['unquoted', `<meta property=og:image content=${IMG}>`, [IMG]],
  ['attribute order reversed', `<meta content="${IMG}" property="og:image">`, [IMG]],
  ['name= instead of property=', `<meta name="og:image" content="${IMG}">`, [IMG]],
  ['uppercase tag and attribute', `<META PROPERTY="OG:IMAGE" CONTENT="${IMG}">`, [IMG]],
  [
    'extra attributes and newlines',
    `<meta\n  data-x="1"\n  property="og:image"\n  content="${IMG}">`,
    [IMG],
  ],
  ['twitter:image', `<meta name="twitter:image" content="${IMG}">`, [IMG]],
  [
    'entity-encoded ampersand',
    `<meta property="og:image" content="${IMG}?a=1&amp;b=2">`,
    [`${IMG}?a=1&b=2`],
  ],
  [
    'a double-quoted value containing an apostrophe is not truncated',
    `<meta property="og:image" content="${IMAGE_ORIGIN}/it's.webp">`,
    [`${IMAGE_ORIGIN}/it's.webp`],
  ],
];

const ANTI_CANARIES = [
  [
    'og:image:alt is prose, not a URL',
    `<meta property="og:image:alt" content="The Esplanade's spiked aluminium shading shells.">`,
  ],
  ['og:url is a page, not an image', `<meta property="og:url" content="https://akhilsaxena.com/">`],
  ['twitter:card is a keyword', `<meta name="twitter:card" content="summary_large_image">`],
  ['the words in prose are not a tag', `<p>og:image and twitter:image are meta properties.</p>`],
  ['a link rel is not a meta tag', `<link rel="preload" as="image" href="${IMG}">`],
];

const selfTestFailures = [];
let canariesChecked = 0;

if (IMAGE_META_PROPERTIES.length === 0)
  selfTestFailures.push(
    'no image properties are declared — a scan with nothing to look for cannot pass.'
  );

for (const [label, html, expected] of CANARIES) {
  canariesChecked++;
  const got = extractImageMeta(html).map((m) => m.content);
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    selfTestFailures.push(
      `canary "${label}" extracted ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}. ` +
        'The extractor is broken, and every clean run it has ever reported is worthless.'
    );
  }
}

for (const [label, html] of ANTI_CANARIES) {
  canariesChecked++;
  const got = extractImageMeta(html).map((m) => m.content);
  if (got.length > 0) {
    selfTestFailures.push(
      `anti-canary "${label}" was extracted as ${JSON.stringify(got)}. The extractor is too broad ` +
        'and would fetch prose as a URL.'
    );
  }
}

if (selfTestFailures.length > 0) {
  err('assert-og-images-live: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const f of selfTestFailures) err(`  x ${f}`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------------------------
 * Argv
 * ------------------------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
let distArg = null;
let concurrency = DEFAULT_CONCURRENCY;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--concurrency') {
    const value = Number(argv[++i]);
    if (!Number.isInteger(value) || value < 1) {
      err(
        `assert-og-images-live: REFUSED — --concurrency needs a positive integer, got "${argv[i]}".`
      );
      process.exit(1);
    }
    concurrency = value;
  } else if (arg.startsWith('--')) {
    // An unknown flag is a refusal rather than ignored: a typo'd flag silently dropped would run
    // something other than what the caller asked for while looking like it obeyed.
    err(`assert-og-images-live: REFUSED — unknown flag "${arg}".`);
    process.exit(1);
  } else if (distArg === null) {
    if (arg.trim().length === 0) {
      err('assert-og-images-live: REFUSED — the dist argument is present but empty.');
      process.exit(1);
    }
    distArg = arg;
  } else {
    err(`assert-og-images-live: REFUSED — unexpected argument "${arg}".`);
    process.exit(1);
  }
}

const distDir = path.resolve(process.cwd(), distArg ?? DEFAULT_DIST);

/* ---------------------------------------------------------------------------------------------
 * The served root, resolved rather than assumed
 * ------------------------------------------------------------------------------------------- */

/**
 * The same resolution `assert-no-prerendered-protected-routes.mjs` performs, and for the same
 * reason: assuming `dist/client` is how a dist-scoped gate becomes a no-op the day the adapter
 * changes its output shape.
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
          how: `resolved from dist/server/wrangler.json (assets.directory = ${JSON.stringify(declared)})`,
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
      how: 'dist/server/wrangler.json is absent; fell back to dist/client',
    };
  }
  return {
    root: null,
    how: `neither dist/server/wrangler.json nor dist/client exists under ${distDir}`,
  };
}

const refuse = (lines) => {
  err('');
  err('==============================================================================');
  err('  REFUSED — the social-card liveness check cannot produce a meaningful result');
  err('==============================================================================');
  err('');
  for (const line of [].concat(lines)) err(`  x ${line}`);
  err('');
  process.exit(1);
};

if (!fs.existsSync(distDir)) {
  refuse([
    `no artefact at ${path.relative(process.cwd(), distDir) || distDir} — run \`npm run build\` first.`,
    'There is nothing to check, which is a failure and never a pass.',
  ]);
}

const { root: assetsRoot, how: rootHow } = resolveAssetsRoot();
if (assetsRoot === null || !fs.existsSync(assetsRoot)) {
  refuse([`could not resolve the served root: ${rootHow}`]);
}

/* ---------------------------------------------------------------------------------------------
 * Assemble targets from the artefact
 * ------------------------------------------------------------------------------------------- */

const documents = [];
const walk = (dir) => {
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (entry.isFile() && path.extname(entry.name) === '.html') documents.push(p);
  }
};
walk(assetsRoot);

if (documents.length === 0) {
  refuse([
    `0 HTML documents under ${path.relative(process.cwd(), assetsRoot)} — this run checked nothing.`,
  ]);
}

/** url -> the documents that ship it. Deduplicated: 52 documents share 41 distinct URLs today. */
const byUrl = new Map();
const rejected = [];
let tagsFound = 0;
let documentsWithATag = 0;
let bytesRead = 0;

for (const file of documents) {
  const relative = path.relative(assetsRoot, file).split(path.sep).join('/');
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch (error) {
    rejected.push(`${relative}: unreadable — ${error.message}`);
    continue;
  }
  bytesRead += html.length;

  const metas = extractImageMeta(html);
  if (metas.length > 0) documentsWithATag++;
  for (const meta of metas) {
    tagsFound++;
    if (typeof meta.content !== 'string' || meta.content.trim().length === 0) {
      rejected.push(`${relative}: <meta ${meta.property}> carries no content — not requested`);
      continue;
    }
    let parsed;
    try {
      parsed = new URL(meta.content);
    } catch {
      rejected.push(`${relative}: ${meta.property} is not an absolute URL — ${meta.content}`);
      continue;
    }
    // The origin is checked BEFORE anything is fetched. A tag pointing somewhere else is a
    // finding, not something to go and fetch: a foreign 200 would be reported as proof of
    // liveness for an asset this site does not control.
    if (parsed.origin !== IMAGE_ORIGIN) {
      rejected.push(
        `${relative}: ${meta.property} origin is "${parsed.origin}", expected "${IMAGE_ORIGIN}" — ` +
          `not requested — ${meta.content}`
      );
      continue;
    }
    const seen = byUrl.get(meta.content);
    if (seen === undefined) byUrl.set(meta.content, [relative]);
    else seen.push(relative);
  }
}

if (rejected.length > 0) {
  refuse([`${rejected.length} tag(s) were rejected before any request was made:`, ...rejected]);
}

// The floors. Each is a distinct way for this run to have checked nothing and looked green.
if (bytesRead === 0) {
  refuse([`${documents.length} document(s) read, 0 bytes — every one was empty.`]);
}
if (tagsFound === 0) {
  refuse([
    `${documents.length} document(s) carry NO og:image or twitter:image tag at all.`,
    'SEO-01 requires one on every page; a liveness gate with zero targets is the vacuous gate',
    'this file exists not to be.',
  ]);
}
if (byUrl.size === 0) {
  refuse(['0 fetchable URLs assembled — this is a failure, never a pass.']);
}

/* ---------------------------------------------------------------------------------------------
 * Fetch
 * ------------------------------------------------------------------------------------------- */

async function probe(url) {
  let last = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      // GET, deliberately — see the header. `redirect: 'follow'` because a crawler follows too.
      const response = await fetch(url, { method: 'GET', redirect: 'follow' });
      const buffer = await response.arrayBuffer();
      const result = {
        status: response.status,
        contentType: response.headers.get('content-type') ?? '',
        bytes: buffer.byteLength,
        cache: response.headers.get('cf-cache-status') ?? '',
        attempt,
      };
      if (response.ok || !RETRYABLE_STATUSES.has(response.status)) return result;
      last = result;
    } catch (error) {
      last = { status: 0, contentType: '', bytes: 0, cache: '', attempt, error: error.message };
    }
  }
  return last;
}

const urls = [...byUrl.keys()].sort();
const results = new Map();
let cursor = 0;

async function worker() {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    results.set(url, await probe(url));
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));

/* ---------------------------------------------------------------------------------------------
 * Report
 * ------------------------------------------------------------------------------------------- */

const failures = [];
let hits = 0;

for (const url of urls) {
  const r = results.get(url);
  const where = byUrl.get(url);
  const on = `on ${where.length} document(s), e.g. ${where[0]}`;
  if (r === undefined || r.status === 0) {
    failures.push({
      url,
      detail: `no response after ${ATTEMPTS} attempts — ${r?.error ?? 'unknown'}`,
      on,
    });
    continue;
  }
  if (r.status !== 200) {
    failures.push({ url, detail: `HTTP ${r.status} after ${r.attempt} attempt(s)`, on });
    continue;
  }
  if (!/^image\//i.test(r.contentType)) {
    // A 200 whose body is an HTML error page is the shape a misconfigured origin produces, and it
    // is exactly what "the card is dead" looks like to a crawler.
    failures.push({
      url,
      detail: `HTTP 200 but content-type is "${r.contentType}", not image/*`,
      on,
    });
    continue;
  }
  if (r.bytes === 0) {
    failures.push({ url, detail: 'HTTP 200 image/* with a ZERO-BYTE body', on });
    continue;
  }
  if (r.cache.toUpperCase() === 'HIT') hits++;
}

if (failures.length > 0) {
  err('');
  err('==============================================================================');
  err('  BUILD REFUSED — a social card points at a URL that does not resolve');
  err('==============================================================================');
  err('');
  err(`  served root: ${path.relative(process.cwd(), assetsRoot)} (${rootHow})`);
  err('');
  for (const f of failures) {
    err(`  x ${f.url}`);
    err(`      ${f.detail} — ${f.on}`);
  }
  err('');
  err(`  ${failures.length} of ${urls.length} distinct URL(s) failed. Requirement SEO-01.`);
  err('');
  process.exit(1);
}

out('assert-og-images-live: PASS');
out(`  served root: ${path.relative(process.cwd(), assetsRoot)}`);
out(`  ${rootHow}`);
out(
  `  scanned ${documents.length} HTML document(s) (${bytesRead} bytes); ${documentsWithATag} carry a tag; ` +
    `${tagsFound} tag(s) -> ${urls.length} distinct URL(s)`
);
out(`  properties matched by equality: ${IMAGE_META_PROPERTIES.join(', ')}`);
out(
  `  fetched with GET (a crawler's method), ${urls.length}/${urls.length} answered 200 image/* with a non-empty body`
);
out(`  cf-cache-status HIT on ${hits}/${urls.length}`);
out(
  `  self-test: ${CANARIES.length} canaries extracted exactly, ${ANTI_CANARIES.length} anti-canaries ignored ` +
    `(${canariesChecked} checked in total) — og:image:alt among them`
);
