#!/usr/bin/env node

/**
 * assert-font-families — §1.2's font contract, over the BUILT artefact.
 *
 * Usage: node scripts/assert-font-families.mjs [distRoot]      (default ./dist/client)
 *
 * ---------------------------------------------------------------------------------------------
 * THE STATIC HALF ONLY. THE BROWSER HALF IS PLAN 05-15's.
 *
 * §1.2 records an UNVERIFIED: whether Vite resolves the bare `@fontsource-variable/...` specifiers
 * inside a transitive dependency's stylesheet. This gate answers the half a static check can
 * answer — which families the artefact DECLARES, and whether the files those declarations point at
 * were emitted. It does NOT and cannot answer the other half: how many families a browser actually
 * DOWNLOADS. That is `DevTools -> Network -> Font` on a built page, it belongs to **plan 05-15's
 * audit**, and the two must not be mistaken for one another. A green run here is consistent with a
 * page that downloads four families.
 *
 * A silent failure renders Playfair as **Georgia** and looks almost right. That is why this is a
 * gate and not a note.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT ASSERTS
 *
 *   F1  the set of DISTINCT `@font-face` families is exactly the three in §1.2. The SET, never the
 *       rule count: `@fontsource` emits one rule per unicode-range subset, so a count assertion
 *       would be brittle and would say nothing. (Measured today: 12 rules — 8 + 2 + 2.)
 *   F2  each of the three has at least one EMITTED asset file, resolved from the `src: url(...)`
 *       of its own rules and checked on disk. A `@font-face` pointing at a URL that does not exist
 *       is precisely §1.2's failure: the CSS looks correct and the browser silently falls back.
 *   F3  none of Inter, Archivo, JetBrains Mono or Newsreader appears as an `@font-face` family, or
 *       as an emitted font-asset filename.
 *   F4  the font TOKENS the page actually resolves through name a family that is `@font-face`d.
 *       Not in the plan; added because the measurement below makes it the load-bearing one.
 *
 * ---------------------------------------------------------------------------------------------
 * F3 IS NARROW ON PURPOSE, AND THE PLAN SAYS SO: "NOT AS RAW BYTES ANYWHERE"
 *
 * A raw-byte sweep for those four names is UNPASSABLE on every correct build, and this was
 * re-measured here rather than taken on trust. In `dist/client/_astro/PublicLayout.*.css`:
 *
 *     :root { --font-body:   "Inter", -apple-system, …          }   <- tokens.css defaults
 *     :root { --font-mono:   "JetBrains Mono", "SF Mono", …     }
 *     :root { --font-display:"Archivo", system-ui, sans-serif   }
 *     :root { --font-serif:  "Newsreader Variable", Georgia, …  }
 *     .ds-atom-…{ font-family: var(--serif,"Newsreader", Georgia, serif) }   <- primitives.css:2821
 *
 * All five are FALLBACK STACK entries in the design system's own token defaults, in stylesheets
 * 05-01 mandates importing whole. None of them is `@font-face`d, so none of them can be
 * downloaded. The load-bearing question is not "does the string appear" but "does a browser fetch
 * a fourth family", and F1 + F2 + F3 + F4 answer that as far as static analysis can.
 *
 * ---------------------------------------------------------------------------------------------
 * F4, AND THE MEASUREMENT THAT PUT IT HERE
 *
 * Those `:root` defaults are LIVE in the artefact. What overrides them is not import order — it is
 * SPECIFICITY, and it is conditional on an attribute:
 *
 *     :root                            --font-serif: "Newsreader Variable", Georgia, serif  (0,1,0)
 *     :root[data-brand=monochrome]     --font-serif: "Playfair Display Variable", …         (0,2,0)
 *
 * So the three real families are reached ONLY while `<html>` carries `data-brand="monochrome"`.
 * Drop that attribute and every token falls back to a family with no `@font-face` — Playfair
 * becomes Georgia, DM Sans becomes system-ui, IBM Plex Mono becomes Menlo — with a green build, a
 * correct-looking stylesheet, and all twelve face rules still shipped. F1, F2 and F3 all pass on
 * that page. F4 is the one that does not.
 *
 * ---------------------------------------------------------------------------------------------
 * IT READS INLINE `<style>` BLOCKS AS WELL AS LINKED SHEETS, AND THAT IS NOT OPTIONAL
 *
 * Three plans in this phase have now been bitten by the same thing: a gate scoped to
 * `dist/client/**\/*.css` is blind to every declaration Astro inlines into a document's own
 * `<style>`. 05-07 (`assert-gutter-ladder.mjs` vs. an inlined `photos.css`), 05-08 (`grep -c
 * 'pd-exif'` returning 5 on a page rendering none) and 05-12 (`.ph-lb-caption` invisible to any
 * `dist/client/**\/*.css` reader). MEASURED here: `dist/client` emits exactly ONE linked
 * stylesheet and SEVEN distinct inline `<style>` texts. A `@font-face` in a page-scoped block
 * would be invisible to a linked-sheet-only reader. 05-10's résumé suite is the model — collect
 * both, then assert.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT THIS GATE CANNOT SEE
 *
 *  1. IT CANNOT SEE A DOWNLOAD. See the header. 05-15 owns that.
 *  2. IT PARSES CSS WITH A REGEX over `@font-face { … }`. A nested at-rule inside a `@font-face`
 *     block, or a `}` inside a quoted string in one, would end the block early. Neither is legal
 *     in a `@font-face` body; recorded because the parser is not a real one.
 *  3. F4 RESOLVES ONE LEVEL OF `var()` INDIRECTION (`--font-display: var(--font-serif)` is real
 *     and is in the artefact today). A two-level chain would be reported as unresolved rather than
 *     followed, and that is a refusal, not a pass.
 *  4. IT NEVER SHELLS OUT TO `grep`; everything is read as text in JavaScript.
 *
 * Reported with `process.stdout.write` — `console.log` prints NOTHING under this repository's
 * vitest setup.
 *
 * Requirements PUB-14 (adjacent), QUAL-01; section 1.2. Browser half: plan 05-15.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_DIST = path.join(REPO_ROOT, 'dist', 'client');
const rel = (p) => {
  const r = path.relative(REPO_ROOT, p);
  return !r || r.startsWith('..') ? p : r;
};

/**
 * The three families, each as a NAME and a MATCHER.
 *
 * §1.2 and the plan both spell them "Playfair Display", "DM Sans", "IBM Plex Mono". The artefact
 * declares "Playfair Display Variable", "DM Sans Variable" and "IBM Plex Mono" — MEASURED — because
 * `@fontsource-variable` names its variable cuts with that suffix. A set equality against the
 * spec's literals is RED ON A CORRECT BUILD, which is why each entry carries a pattern that
 * accepts the optional suffix and nothing else. The census prints the names as DECLARED, so the
 * discrepancy stays visible rather than being smoothed over.
 */
const REQUIRED_FAMILIES = [
  { name: 'Playfair Display', match: /^Playfair Display( Variable)?$/ },
  { name: 'DM Sans', match: /^DM Sans( Variable)?$/ },
  { name: 'IBM Plex Mono', match: /^IBM Plex Mono( Variable)?$/ },
];

/**
 * The four that must not appear. All four are TRANSITIVE DEPENDENCIES of
 * `@akhil-saxena/design-system` — they are in its `dependencies` — so their absence from the
 * artefact is a real property of the build and not a tautology about packages nobody installed.
 */
const FORBIDDEN_FAMILIES = [
  { name: 'Inter', match: /^Inter( Variable)?$/i, asset: /(^|[/\\])inter[-.]/i },
  { name: 'Archivo', match: /^Archivo( Variable)?$/i, asset: /(^|[/\\])archivo[-.]/i },
  {
    name: 'JetBrains Mono',
    match: /^JetBrains Mono( Variable)?$/i,
    asset: /(^|[/\\])jetbrains-mono[-.]/i,
  },
  { name: 'Newsreader', match: /^Newsreader( Variable)?$/i, asset: /(^|[/\\])newsreader[-.]/i },
];

/** The tokens F4 follows, and the role each plays. */
const FONT_TOKENS = ['--font-serif', '--font-body', '--font-mono', '--font-display'];

const FONT_ASSET_EXT = /\.(woff2?|ttf|otf|eot)$/i;

/* ---------------------------------------------------------------------------------------------
 * 1. Readers.
 * ------------------------------------------------------------------------------------------- */

const unquote = (s) =>
  s
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

/** Every `@font-face` block in a stylesheet, as `{ family, urls, raw }`. */
function fontFaces(css) {
  const faces = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1];
    const fam = /(?:^|[;{\s])font-family\s*:\s*([^;]+)/.exec(body);
    faces.push({
      family: fam ? unquote(fam[1]) : null,
      urls: [...body.matchAll(/url\(\s*([^)]*?)\s*\)/g)].map((u) => unquote(u[1])),
      raw: body,
    });
  }
  return faces;
}

/** Every declaration of `prop`, with the selector it sits under and its specificity-ish rank. */
function declarationsOf(css, prop) {
  const found = [];
  const re = new RegExp(`(?<![-\\w])${prop.replace(/[-]/g, '\\-')}\\s*:\\s*([^;}]*)`, 'g');
  for (const m of css.matchAll(re)) {
    const before = css.slice(0, m.index);
    const open = before.lastIndexOf('{');
    if (open === -1) continue;
    const prev = Math.max(before.lastIndexOf('}', open), before.lastIndexOf('{', open - 1));
    found.push({ selector: before.slice(prev + 1, open).trim(), value: m[1].trim(), at: m.index });
  }
  return found;
}

/** The first quoted or bare family name in a font stack. */
function headOfStack(value) {
  const v = value.trim();
  const q = /^\s*["']([^"']+)["']/.exec(v);
  if (q) return q[1].trim();
  return v.split(',')[0].trim();
}

/* ---------------------------------------------------------------------------------------------
 * 2. Self-test, before anything is read from disk.
 * ------------------------------------------------------------------------------------------- */

const CANARIES = [
  {
    id: 'F-PARSE-FAMILY',
    run: (s) => fontFaces(s).some((f) => f.family === 'Inter'),
    canary: '@font-face{font-family:Inter;src:url(/x.woff2) format("woff2")}',
    antiCanary: '.a{font-family:Inter}',
  },
  {
    id: 'F-PARSE-URL',
    run: (s) => fontFaces(s).some((f) => f.urls.includes('/_astro/a.woff2')),
    canary: "@font-face{font-family:'DM Sans Variable';src:url('/_astro/a.woff2')}",
    antiCanary: '@font-face{font-family:"DM Sans Variable"}',
  },
  {
    id: 'F-REQUIRED-VARIABLE-SUFFIX',
    run: (s) => REQUIRED_FAMILIES[0].match.test(s),
    canary: 'Playfair Display Variable',
    antiCanary: 'Playfair Display Variable Extra',
  },
  {
    id: 'F-FORBIDDEN-FAMILY',
    run: (s) => FORBIDDEN_FAMILIES.some((f) => f.match.test(s)),
    canary: 'Newsreader Variable',
    antiCanary: 'IBM Plex Mono',
  },
  {
    id: 'F-FORBIDDEN-ASSET',
    run: (s) => FORBIDDEN_FAMILIES.some((f) => f.asset.test(s)),
    canary: '/_astro/jetbrains-mono-latin-400-normal.abc123.woff2',
    antiCanary: '/_astro/ibm-plex-mono-latin-400-normal.abc123.woff2',
  },
  {
    id: 'F4-TOKEN-HEAD',
    run: (s) => headOfStack(s) === 'Newsreader Variable',
    canary: '"Newsreader Variable", Georgia, serif',
    antiCanary: '"Playfair Display Variable", "Playfair Display", Georgia, serif',
  },
  {
    id: 'F4-SELECTOR',
    run: (s) => declarationsOf(s, '--font-serif').some((d) => d.selector.includes('data-brand')),
    canary: ':root[data-brand=monochrome]{--font-serif:"Playfair Display Variable",serif}',
    antiCanary: ':root{--font-serif:"Newsreader Variable",serif}',
  },
];

const selfTestFailures = [];
if (CANARIES.length === 0) selfTestFailures.push('there are no rules; nothing could be checked.');
for (const c of CANARIES) {
  if (!c.run(c.canary)) selfTestFailures.push(`${c.id}: did NOT flag its own canary.`);
  if (c.run(c.antiCanary)) selfTestFailures.push(`${c.id}: flagged its own anti-canary.`);
}
if (selfTestFailures.length > 0) {
  err('assert-font-families: SELF-TEST FAILED — the gate did not check the artefact.');
  for (const f of selfTestFailures) err(`  x ${f}`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------------------------
 * 3. Refuse to pass on nothing.
 * ------------------------------------------------------------------------------------------- */

if (process.argv.length > 2 && process.argv[2] === '') {
  err('assert-font-families: the dist root argument is present but empty.');
  err("  path.resolve(cwd, '') is cwd, so this would have walked the entire repository.");
  process.exit(1);
}
const distRoot = path.resolve(process.cwd(), process.argv[2] ?? DEFAULT_DIST);
if (!fs.existsSync(distRoot) || !fs.statSync(distRoot).isDirectory()) {
  err(`assert-font-families: ${rel(distRoot)} does not exist, or is not a directory.`);
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

/* BOTH sources, always: linked sheets AND inline <style> blocks. See the header. */
const sheets = [];
for (const f of allFiles.filter((x) => x.endsWith('.css'))) {
  sheets.push({ label: rel(f), css: fs.readFileSync(f, 'utf8'), inline: false });
}
const seenInline = new Set();
for (const f of allFiles.filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  let i = 0;
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    i += 1;
    if (seenInline.has(m[1])) continue;
    seenInline.add(m[1]);
    sheets.push({ label: `${rel(f)} <style> #${i}`, css: m[1], inline: true });
  }
}

if (sheets.length === 0) {
  err(`assert-font-families: no CSS at all under ${rel(distRoot)} — no .css file and no inline`);
  err('  <style> block. This run read nothing and cannot pass.');
  process.exit(1);
}
const totalCssBytes = sheets.reduce((n, s) => n + Buffer.byteLength(s.css), 0);
if (totalCssBytes === 0) {
  err(`assert-font-families: every stylesheet under ${rel(distRoot)} is empty (${sheets.length}).`);
  process.exit(1);
}

const faces = [];
for (const s of sheets) for (const f of fontFaces(s.css)) faces.push({ ...f, from: s.label });

if (faces.length === 0) {
  err(`assert-font-families: ZERO @font-face blocks parsed from ${sheets.length} stylesheet(s)`);
  err(`  (${totalCssBytes} bytes) under ${rel(distRoot)}.`);
  err('  §1.2 says the shell imports `@akhil-saxena/design-system/fonts/monochrome.css`, which');
  err('  declares five @import entry points producing twelve face rules. Zero means either that');
  err('  import is gone or Vite did not resolve the bare `@fontsource-variable/…` specifiers —');
  err('  which is the UNVERIFIED §1.2 records. A PASS here would be a statement about nothing.');
  process.exit(1);
}

const findings = [];
const add = (id, where, message) => findings.push({ id, where, message });

/* ---------------------------------------------------------------------------------------------
 * 4. F1 — the SET of declared families is exactly the three.
 * ------------------------------------------------------------------------------------------- */

const declared = new Map(); // declared name -> face count
for (const f of faces) {
  if (f.family === null) {
    add('F1-NO-FAMILY', f.from, 'an @font-face block declares no font-family at all.');
    continue;
  }
  declared.set(f.family, (declared.get(f.family) ?? 0) + 1);
}

const matchedBy = new Map(REQUIRED_FAMILIES.map((r) => [r.name, []]));
for (const name of declared.keys()) {
  const hits = REQUIRED_FAMILIES.filter((r) => r.match.test(name));
  if (hits.length === 0) {
    add(
      'F1-EXTRA',
      rel(distRoot),
      `an @font-face declares ${JSON.stringify(name)}, which is not one of the three families ` +
        `§1.2 permits (${REQUIRED_FAMILIES.map((r) => r.name).join(', ')}).`
    );
  } else if (hits.length > 1) {
    add(
      'F1-AMBIGUOUS',
      rel(distRoot),
      `${JSON.stringify(name)} matches more than one required family.`
    );
  } else {
    matchedBy.get(hits[0].name).push(name);
  }
}
for (const r of REQUIRED_FAMILIES) {
  if (matchedBy.get(r.name).length === 0) {
    add(
      'F1-MISSING',
      rel(distRoot),
      `no @font-face declares ${JSON.stringify(r.name)}. §1.2: a silent failure here renders it as ` +
        'its fallback and looks almost right. Declared instead: ' +
        `${[...declared.keys()].map((n) => JSON.stringify(n)).join(', ') || '(nothing)'}`
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 5. F2 — every required family has at least one asset that EXISTS on disk.
 * ------------------------------------------------------------------------------------------- */

const assetsPerFamily = new Map(REQUIRED_FAMILIES.map((r) => [r.name, new Set()]));
const missingAssets = [];
for (const f of faces) {
  if (f.family === null) continue;
  const req = REQUIRED_FAMILIES.find((r) => r.match.test(f.family));
  if (!req) continue;
  for (const u of f.urls) {
    if (!FONT_ASSET_EXT.test(u.split('?')[0])) continue;
    const onDisk = path.join(distRoot, u.split('?')[0].replace(/^\//, ''));
    if (fs.existsSync(onDisk)) assetsPerFamily.get(req.name).add(u);
    else missingAssets.push({ family: req.name, url: u, from: f.from });
  }
}
for (const m of missingAssets) {
  add(
    'F2-MISSING-ASSET',
    m.from,
    `${m.family} has an @font-face pointing at ${m.url}, and no such file was emitted. This is ` +
      '§1.2 exactly: the CSS looks correct and the browser falls back silently.'
  );
}
for (const r of REQUIRED_FAMILIES) {
  if (assetsPerFamily.get(r.name).size === 0 && matchedBy.get(r.name).length > 0) {
    add(
      'F2-NO-ASSET',
      rel(distRoot),
      `${r.name} is declared but no emitted asset backs any of its rules.`
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 6. F3 — the four forbidden families, as a face family or as an emitted asset filename.
 * ------------------------------------------------------------------------------------------- */

const fontAssets = allFiles.filter((f) => FONT_ASSET_EXT.test(f));
for (const bad of FORBIDDEN_FAMILIES) {
  for (const name of declared.keys()) {
    if (bad.match.test(name)) {
      add(
        'F3-FAMILY',
        rel(distRoot),
        `${bad.name} is declared as an @font-face family (${JSON.stringify(name)}). It is a ` +
          'transitive dependency of the design system and must not reach the artefact.'
      );
    }
  }
  for (const f of fontAssets) {
    if (bad.asset.test(rel(f))) {
      add('F3-ASSET', rel(f), `an emitted font asset is named for ${bad.name}.`);
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * 7. F4 — the tokens the page resolves through name a family that is actually @font-face'd.
 * ------------------------------------------------------------------------------------------- */

const brands = new Set();
for (const f of allFiles.filter((x) => x.endsWith('.html'))) {
  const m = /<html[^>]*>/.exec(fs.readFileSync(f, 'utf8'));
  const b = m ? /\bdata-brand\s*=\s*(["'])(.*?)\1/.exec(m[0]) : null;
  brands.add(b ? b[2] : '(none)');
}
if (brands.size !== 1) {
  add(
    'F4-BRAND',
    rel(distRoot),
    `documents carry ${brands.size} distinct data-brand values: ${[...brands].join(', ')}`
  );
}
const brand = [...brands][0];

const declaredNames = [...declared.keys()];
const isFaced = (fam) => declaredNames.some((n) => n.toLowerCase() === fam.toLowerCase());

const tokenWinners = new Map();
for (const token of FONT_TOKENS) {
  const all = sheets.flatMap((s) =>
    declarationsOf(s.css, token).map((d) => ({ ...d, from: s.label }))
  );
  if (all.length === 0) {
    add('F4-UNDECLARED', rel(distRoot), `${token} is declared nowhere in the artefact.`);
    continue;
  }
  /* The winner is the last declaration whose selector the shipped <html> actually matches, and
     `:root[data-brand=…]` outranks a bare `:root` by specificity regardless of order. */
  const applicable = all.filter(
    (d) =>
      !/\[data-brand/.test(d.selector) ||
      d.selector.includes(`data-brand=${brand}`) ||
      d.selector.includes(`data-brand="${brand}"`)
  );
  const branded = applicable.filter((d) => /\[data-brand/.test(d.selector));
  const winner = (branded.length > 0 ? branded : applicable).at(-1);
  if (!winner) {
    add(
      'F4-UNREACHABLE',
      rel(distRoot),
      `no declaration of ${token} applies to data-brand=${brand}.`
    );
    continue;
  }
  let value = winner.value;
  const varRef = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  if (varRef) {
    const inner = tokenWinners.get(varRef[1]);
    if (!inner) {
      add(
        'F4-INDIRECT',
        rel(distRoot),
        `${token} resolves to ${value}, which this gate did not resolve. See blind spot 3.`
      );
      continue;
    }
    value = inner.value;
  }
  const head = headOfStack(value);
  tokenWinners.set(token, { ...winner, value, head });
  if (!isFaced(head)) {
    add(
      'F4-FALLBACK',
      rel(distRoot),
      `${token} resolves to ${JSON.stringify(head)} under \`${winner.selector}\`, and NO @font-face ` +
        `declares it. The browser will fall back. Faced families: ${declaredNames.join(', ')}.`
    );
  }
  const bad = FORBIDDEN_FAMILIES.find((b) => b.match.test(head));
  if (bad) {
    add(
      'F4-FORBIDDEN',
      rel(distRoot),
      `${token} resolves to ${bad.name}, one of the four §1.2 forbids.`
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 8. Verdict.
 * ------------------------------------------------------------------------------------------- */

if (findings.length > 0) {
  err('assert-font-families: FAIL');
  for (const f of findings) err(`  x [${f.id}] ${f.where}: ${f.message}`);
  err('');
  err(
    `  ${findings.length} finding(s) over ${sheets.length} stylesheet(s) and ${faces.length} @font-face rule(s).`
  );
  err('  §1.2: exactly three families ship — Playfair Display, DM Sans, IBM Plex Mono. A silent');
  err('  failure renders Playfair as Georgia and looks almost right.');
  err("  The BROWSER half — at most three families actually download — is plan 05-15's audit.");
  process.exit(1);
}

out('assert-font-families: PASS');
out(
  `  read ${sheets.length} stylesheet(s) (${totalCssBytes.toLocaleString('en-US')} B): ` +
    `${sheets.filter((s) => !s.inline).length} linked + ${sheets.filter((s) => s.inline).length} distinct inline <style>`
);
out(
  `  self-test: ${CANARIES.length}/${CANARIES.length} rules flagged their canary and ignored their anti-canary`
);
out(`  ${faces.length} @font-face rule(s), ${declared.size} distinct famil(y/ies):`);
for (const r of REQUIRED_FAMILIES) {
  const names = matchedBy.get(r.name);
  const rules = names.reduce((n, x) => n + (declared.get(x) ?? 0), 0);
  out(
    `    ${r.name.padEnd(17)} declared as ${names
      .map((n) => JSON.stringify(n))
      .join(', ')
      .padEnd(29)}` +
      ` ${String(rules).padStart(2)} rule(s), ${assetsPerFamily.get(r.name).size} emitted asset(s)`
  );
}
out(`  ${fontAssets.length} font asset file(s) emitted; none named for a forbidden family.`);
out(
  `  absent as an @font-face family and as an asset name: ${FORBIDDEN_FAMILIES.map((f) => f.name).join(', ')}`
);
out(`  documents carry data-brand=${JSON.stringify(brand)}; the tokens that reach the page:`);
for (const [t, w] of tokenWinners) {
  out(`    ${t.padEnd(15)} -> ${JSON.stringify(w.head).padEnd(29)} from \`${w.selector}\``);
}
out(
  "  the browser half — at most three families DOWNLOAD — is plan 05-15's audit, not this gate's."
);
