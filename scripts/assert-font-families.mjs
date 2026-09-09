#!/usr/bin/env node

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

const REQUIRED_FAMILIES = [
  { name: 'Libre Baskerville', match: /^Libre Baskerville$/ },
  { name: 'DM Sans', match: /^DM Sans( Variable)?$/ },
  { name: 'IBM Plex Mono', match: /^IBM Plex Mono( Variable)?$/ },
];

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

const FONT_TOKENS = ['--font-serif', '--font-body', '--font-mono', '--font-display'];

const FONT_ASSET_EXT = /\.(woff2?|ttf|otf|eot)$/i;

const unquote = (s) =>
  s
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

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

function headOfStack(value) {
  const v = value.trim();
  const q = /^\s*["']([^"']+)["']/.exec(v);
  if (q) return q[1].trim();
  return v.split(',')[0].trim();
}

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
    run: (s) => REQUIRED_FAMILIES.find((f) => f.name === 'DM Sans').match.test(s),
    canary: 'DM Sans Variable',
    antiCanary: 'DM Sans Variable Extra',
  },
  {
    id: 'F-REQUIRED-BARE-FAMILY',
    run: (s) => REQUIRED_FAMILIES.find((f) => f.name === 'Libre Baskerville').match.test(s),
    canary: 'Libre Baskerville',
    antiCanary: 'Libre Baskerville Variable',
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
