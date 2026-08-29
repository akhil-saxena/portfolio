#!/usr/bin/env node

/**
 * SEO-01 — the social card image that ships must actually resolve.
 *
 * Usage: node scripts/assert-og-images-live.mjs [distDir]
 *        node scripts/assert-og-images-live.mjs [distDir] --concurrency 8
 *        (distDir defaults to ./dist; the served root is resolved from dist/server/wrangler.json)
 *
 * ---------------------------------------------------------------------------------------------
 * THE GAP THIS CLOSES, STATED AS THE THING THAT COULD SHIP
 *
 * `test/public/seo.node.test.ts` audits every public document and proves each `og:image` is
 * ABSOLUTE and on the IMAGE ORIGIN. Both clauses are about the string. **Nothing in this
 * repository has ever fetched one.** So a card pointing at
 * `https://images.akhilsaxena.com/photos/architecture/singapore-lg.webp` after that object was
 * renamed, re-keyed by a content hash, or lost in a partial upload is a green build, a green test
 * run, eleven green gates — and a blank preview on every share of the home page, `/work`, `/photos`
 * and `/resume`, which today all carry that one default image.
 *
 * `gate:liveness` (`scripts/verify-photo-urls.mjs`) fetches the MANIFEST's 160 remote URLs and
 * would catch that today, because every `og:image` currently emitted happens to be a manifest
 * `large` URL. **Nothing asserts that it will stay true.** A hand-written default card, a
 * `/og-default.png` on the site origin, or a `twitter:image` added later are all outside the
 * manifest and outside that gate's reach by construction. A gate that answers the right question
 * only by coincidence is the failure this phase found nineteen times, so this one takes its
 * targets from THE ARTEFACT — the tags that actually ship — and not from the data behind them.
 *
 * ---------------------------------------------------------------------------------------------
 * GET, NOT HEAD — AND THIS IS THE OPPOSITE CHOICE FROM `verify-photo-urls.mjs`, DELIBERATELY
 *
 * That script's header carries a long measured argument for HEAD, and it is right THERE: its
 * question is *"does the bucket hold this object?"*, it runs immediately after an upload writes to
 * a mutable key, and a GET satisfied from the edge cache could report a previous upload's bytes as
 * proof that this one succeeded. HEAD is `cf-cache-status: DYNAMIC` on this origin — it bypasses
 * the cache and reaches R2 — which is exactly why it is the correct probe for that question.
 *
 * THIS gate asks a DIFFERENT question: *"if a crawler fetches the URL in this tag, does it get an
 * image?"* A crawler issues a GET. If the edge answers that GET with a cached image, the card
 * works — that is not a false pass, it is the observation the requirement is about. And the two
 * methods genuinely disagree on this zone: `verify-photo-urls.mjs` measured
 * `images.akhilsaxena.com/robots.txt` answering **404 to HEAD on two runs and 200 to GET on a
 * third**, from different Cloudflare colos. Probing a social card with the method no social
 * crawler uses would import that disagreement as a false red.
 *
 * So the method follows the question, in both scripts. Neither substitutes for the other:
 *
 *     verify-photo-urls.mjs   HEAD   "the BUCKET holds the object"      (PIPE-04, pipeline step 8)
 *     this file               GET    "a CRAWLER gets an image"          (SEO-01, ship path + CI)
 *
 * WHAT GET CANNOT SEE, said plainly rather than left implied: a 200 served from the edge for an
 * object that has since been deleted from R2. This gate does not claim the object exists; it
 * claims the URL resolves to image bytes today. That is the whole of what a social card needs,
 * and `gate:liveness` is what makes the stronger claim.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY IT IS NOT IN `gate:content`, AND WHERE IT LIVES INSTEAD
 *
 * `gate:content` is eleven OFFLINE gates chained into `npm run build`. Every one of them runs on a
 * laptop on a train and in a sandbox with no egress. Putting a network call in that chain means a
 * CDN blip, a DNS hiccup or an aeroplane reds a build whose code is fine — which teaches a
 * developer to re-run rather than to read, and a gate people re-run past is worse than no gate.
 * The blip is not hypothetical: `verify-photo-urls.mjs` caught a one-off `HTTP 502` during its own
 * failure proof that ten immediate re-probes could not reproduce.
 *
 * Its two homes are both places where the network is ALREADY a precondition, so it adds no new
 * class of failure:
 *
 *   1. **The ship path.** `npm run deploy` ends in `wrangler deploy`, which cannot work offline.
 *      A dead card is refused before it is published rather than after.
 *   2. **Its own CI step**, after the build and named for what it does, so a network failure is
 *      attributable at a glance instead of arriving as "the build broke".
 *
 * `ATTEMPTS` retries below exist for the same reason: a transient 502/503/504 is not a defect, and
 * this gate must red for dead URLs and for nothing else.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT CANNOT SEE
 *
 *  R1. That the bytes are the RIGHT photograph, or the right aspect ratio for a card. A 200 with
 *      an `image/*` content-type and a non-empty body is the claim.
 *  R2. An `og:image` injected at runtime by a script. Every public route here is prerendered and
 *      the metadata is static, so there is nothing to see; if that ever changes this gate keeps
 *      answering about the served HTML and would need a browser to answer about the DOM.
 *  R3. `dist/` IS ONLY AS GOOD AS THE LAST BUILD — the standing blind spot of every dist-scoped
 *      gate in this repository. `npm test` rebuilds the artefact, which is why the ship path and
 *      CI both run the dist-scoped chain again afterwards.
 *
 * Reporting is `process.stdout.write` / `process.stderr.write`, NEVER `console.log`: under this
 * repository's vitest setup console output prints nothing, and a gate reporting through a
 * swallowed channel is indistinguishable from a gate that found nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { IMAGE_ORIGIN } from '../src/lib/image-origin.ts';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const DEFAULT_DIST = './dist';
const DEFAULT_CONCURRENCY = 6;
const ATTEMPTS = 3;

/**
 * Statuses worth a second look. A dead URL answers 404/403 and stays dead; these three are the
 * edge saying "not now". Retrying a 404 would only slow the failure down.
 */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * The metadata properties that name an IMAGE a crawler will fetch. Matched by EQUALITY, never by
 * prefix, and that is the one trap in this file: `og:image:alt` CONTAINS `og:image` and its value
 * is a sentence of prose. A `startsWith` matcher would try to fetch
 * `"The Esplanade's spiked aluminium shading shells over…"` as a URL, and the anti-canary below
 * exists to keep that from ever being true again.
 *
 * `twitter:image` is listed although the artefact emits none today: `Seo.astro` relies on
 * `twitter:card: summary_large_image` falling back to `og:image`. Listing it now means the day
 * somebody adds one it is covered BY CONSTRUCTION rather than by remembering this file exists.
 */
const IMAGE_META_PROPERTIES = Object.freeze(['og:image', 'og:image:secure_url', 'twitter:image']);

/* ---------------------------------------------------------------------------------------------
 * Extraction
 * ------------------------------------------------------------------------------------------- */

/**
 * Decode the five entities an HTML serialiser can put in an attribute value. Astro emits `&amp;`
 * for a bare ampersand, so a URL with a query string comes back wrong without this — and a URL
 * that is wrong in exactly one character fetches a 404 and reads as a real finding.
 */
function decodeEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Read one attribute off a `<meta …>` tag.
 *
 * 🔴 THE NAIVE FORM OF THIS IS `attr=["']([^"']*)["']`, AND IT IS WRONG IN THIS REPOSITORY. That
 * pattern lets a double-quoted value terminate at an APOSTROPHE, and 8 of the 40 photographs carry
 * one in their alt text (`The Esplanade's …`). The value would be silently truncated. So the
 * closing delimiter is captured from the opening one — a double-quoted value ends only at a double
 * quote — and an unquoted value is read to the next whitespace or `>`.
 */
function readAttribute(tag, name) {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(tag);
  if (quoted !== null) return decodeEntities(quoted[2]);
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s"'>]+)`, 'i').exec(tag);
  return bare === null ? null : decodeEntities(bare[1]);
}

/**
 * Every image URL a `<meta>` tag in this document points a crawler at.
 *
 * `property` and `name` are both read: the OpenGraph spec says `property`, Twitter's says `name`,
 * and every real-world serialiser emits one or the other. Reading only the one this build happens
 * to use today would make the gate blind to a correct tag written the other way.
 */
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

/* ---------------------------------------------------------------------------------------------
 * Self-test. A rule that cannot fire is not a rule.
 * ------------------------------------------------------------------------------------------- */

const IMG = `${IMAGE_ORIGIN}/photos/architecture/singapore-lg.webp`;

/** Each canary MUST be extracted; each anti-canary MUST NOT be. */
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
