#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const out = (s) => process.stdout.write(`${s}\n`);
const err = (s) => process.stderr.write(`${s}\n`);

const NO_CONSUMER_NOTE = [
  '  IS THIS THE EXPECTED RED? Astro emits a stylesheet only for CSS that some ROUTE imports, and',
  '  `src/styles/public-shell.css` is imported by `src/layouts/PublicLayout.astro`. Until a page',
  '  under `src/pages/` uses that layout (plans 05-07 through 05-11), the ladder does not reach',
  '  `dist/` at all and this refusal is correct.',
  '',
  '  DO NOT make this case exit 0. The right repair is to chain `gate:ladder` into `gate:content`',
  '  in the SAME commit that lands the first route using PublicLayout. THAT HAS NOW HAPPENED:',
  '  plan 05-07 built `/photography` and `/photography/[category]`, the first consumers of PublicLayout, and',
  '  wired `gate:ladder` into `gate:content` in the same commit. So this refusal reaching a reader',
  '  today means the stylesheet genuinely did not ship — most likely a stale or emptied `dist/`.',
  '  Rebuild before believing it: 05-06 lost an hour to a gate reading an artefact a crashed run',
  '  left behind.',
].join('\n');

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const LADDER_MODULE = new URL('../src/lib/layout-ladder.ts', import.meta.url);
const DEFAULT_DIST = path.join(REPO_ROOT, 'dist', 'client');

function splitAtDepthZero(input) {
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf.trim());
      buf = '';
    } else buf += ch;
  }
  parts.push(buf.trim());
  return parts.filter((p) => p.length > 0);
}

function stripComments(css) {
  let kept = '';
  let i = 0;
  let quote = null;
  while (i < css.length) {
    const ch = css[i];
    if (quote) {
      kept += ch;
      if (ch === '\\') {
        kept += css[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      kept += ch;
      i++;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    kept += ch;
    i++;
  }
  return kept;
}

function readDeclarations(rawCss) {
  const css = stripComments(rawCss);
  const decls = [];
  const stack = []; // { kind: 'at' | 'rule', prelude }
  let buf = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      buf += ch;
      if (ch === '\\') {
        buf += css[i + 1] ?? '';
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '{') {
      const prelude = buf.trim();
      stack.push({ kind: prelude.startsWith('@') ? 'at' : 'rule', prelude });
      buf = '';
      continue;
    }
    if (ch === '}' || ch === ';') {
      const top = stack[stack.length - 1];
      const text = buf.trim();
      buf = '';
      if (text && top && top.kind === 'rule') {
        const colon = text.indexOf(':');
        if (colon > 0) {
          decls.push({
            atRules: stack.filter((f) => f.kind === 'at').map((f) => f.prelude),
            selector: top.prelude,
            prop: text.slice(0, colon).trim(),
            value: text.slice(colon + 1).trim(),
          });
        }
      }
      if (ch === '}') stack.pop();
      continue;
    }
    buf += ch;
  }
  return decls;
}

const MIN_WIDTH_FORMS = [
  'min-width\\s*:\\s*(\\d+(?:\\.\\d+)?)px', //   @media (min-width: 673px)   — the source spelling
  'width\\s*>=\\s*(\\d+(?:\\.\\d+)?)px', //      @media (width>=673px)       — BUILT, measured here
  '(\\d+(?:\\.\\d+)?)px\\s*<=\\s*width', //      @media (673px<=width)       — the reverse form
];

function readMediaMinimum(prelude) {
  const found = new Set();
  let stripped = prelude;
  for (const source of MIN_WIDTH_FORMS) {
    stripped = stripped.replace(new RegExp(source, 'gi'), (_m, n) => {
      found.add(Number(n));
      return ' ';
    });
  }
  const extra = stripped
    .replace(/^@media/i, '')
    .replace(/\band\b/gi, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (found.size > 1) return { minWidth: 'AMBIGUOUS', extra };
  return { minWidth: found.size === 1 ? [...found][0] : null, extra };
}

const canaryFailures = [];
let canariesChecked = 0;
const canary = (name, ok) => {
  canariesChecked++;
  if (!ok) canaryFailures.push(name);
};

canary(
  'splitAtDepthZero ignores a comma inside min()',
  splitAtDepthZero('min(1, 2), b').length === 2
);
canary('splitAtDepthZero splits a real selector list', splitAtDepthZero('.a,.b').length === 2);
canary('stripComments drops a comment', !stripComments('a{/* x */b:1}').includes('x'));
canary(
  'stripComments keeps a comment-looking string literal',
  stripComments('a{b:"/* q */"}').includes('/* q */')
);
canary(
  'reads a declaration inside a media query',
  (() => {
    const d = readDeclarations('@media (width>=375px){.pub-shell{--pub-gutter:var(--space-6)}}');
    return d.length === 1 && d[0].prop === '--pub-gutter' && d[0].atRules.length === 1;
  })()
);
canary(
  'does NOT read var(--pub-gutter) as a declaration OF --pub-gutter',
  (() => {
    const d = readDeclarations('.pub-bar{margin-inline:calc(var(--pub-gutter) * -1)}');
    return d.length === 1 && d.every((x) => x.prop !== '--pub-gutter');
  })()
);
canary(
  'splits a merged selector list into its members',
  (() => {
    const d = readDeclarations('.pub-max-work,.pub-max-photos{max-width:min(1280px,100%)}');
    return splitAtDepthZero(d[0].selector).length === 2;
  })()
);
canary(
  'media minimum, source spelling',
  readMediaMinimum('@media (min-width: 673px)').minWidth === 673
);
canary(
  'media minimum, built range spelling',
  readMediaMinimum('@media (width>=673px)').minWidth === 673
);
canary(
  'media minimum, reversed range spelling',
  readMediaMinimum('@media (673px<=width)').minWidth === 673
);
canary(
  'media minimum, whitespace-free source spelling',
  readMediaMinimum('@media(min-width:673px)').minWidth === 673
);
canary(
  'an extra media condition is SEEN and REPORTED',
  (() => {
    const r = readMediaMinimum('@media screen and (min-width: 673px)');
    return r.minWidth === 673 && r.extra === 'screen';
  })()
);
canary(
  'a bare width minimum reports no extra condition',
  readMediaMinimum('@media (width>=673px)').extra === ''
);

if (canaryFailures.length > 0) {
  err('assert-gutter-ladder: SELF-TEST FAILED — the gate cannot be trusted.');
  for (const name of canaryFailures) err(`  x ${name}`);
  process.exit(1);
}

let GUTTER_RUNGS;
let PAGE_MAX;
try {
  ({ GUTTER_RUNGS, PAGE_MAX } = await import(LADDER_MODULE.href));
} catch (error) {
  err('assert-gutter-ladder: could not import src/lib/layout-ladder.ts, so there is nothing to');
  err('  compare the stylesheet against and this run cannot pass.');
  err(`  ${error instanceof Error ? error.message : String(error)}`);
  err('  Node >= 22.18 strips types on import() of a .ts file. If yours does not, take 05-04 s');
  err('  fallback and move this check into a vitest test — do NOT paste the rungs in here.');
  process.exit(1);
}

if (!Array.isArray(GUTTER_RUNGS) || GUTTER_RUNGS.length === 0) {
  err('assert-gutter-ladder: GUTTER_RUNGS is empty, so every stylesheet trivially matches it.');
  process.exit(1);
}
if (!PAGE_MAX || Object.keys(PAGE_MAX).length === 0) {
  err('assert-gutter-ladder: PAGE_MAX is empty, so every stylesheet trivially matches it.');
  process.exit(1);
}

const distRoot = path.resolve(process.argv[2] ?? DEFAULT_DIST);
const rel = (p) => {
  if (!path.isAbsolute(p)) return p;
  const r = path.relative(REPO_ROOT, p);
  return !r || r.startsWith('..') ? p : r;
};

if (!fs.existsSync(distRoot)) {
  err(`assert-gutter-ladder: ${rel(distRoot)} does not exist.`);
  err('  Run `npm run build` first. A check over a missing directory is not a pass.');
  process.exit(1);
}

const cssFiles = [];
const htmlFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.css')) cssFiles.push(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
})(distRoot);

const inlineSheets = [];
const seenInline = new Set();
for (const file of htmlFiles.sort()) {
  let n = 0;
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    n += 1;
    if (seenInline.has(m[1])) continue;
    seenInline.add(m[1]);
    inlineSheets.push({ label: `${rel(file)} <style> #${n}`, css: m[1] });
  }
}

const sources = [
  ...cssFiles.map((f) => ({ label: rel(f), css: fs.readFileSync(f, 'utf8'), inline: false })),
  ...inlineSheets.map((s) => ({ ...s, inline: true })),
];

if (sources.length === 0) {
  err(`assert-gutter-ladder: no CSS anywhere under ${rel(distRoot)} — no .css file, and no inline`);
  err(`  <style> block in ${htmlFiles.length} document(s).`);
  err('  This run read nothing and cannot pass.');
  err('');
  err(NO_CONSUMER_NOTE);
  process.exit(1);
}

let totalBytes = 0;
const allDecls = [];
for (const source of sources) {
  totalBytes += Buffer.byteLength(source.css);
  for (const d of readDeclarations(source.css)) allDecls.push({ ...d, file: source.label });
}
if (totalBytes === 0) {
  err(
    `assert-gutter-ladder: every stylesheet under ${rel(distRoot)} is empty (${sources.length} source(s)).`
  );
  process.exit(1);
}

const findings = [];

const rungDecls = allDecls.filter((d) => d.prop === '--pub-gutter');
if (rungDecls.length === 0) {
  err(
    `assert-gutter-ladder: not one \`--pub-gutter\` declaration in ${sources.length} stylesheet(s)`
  );
  err(`  (${totalBytes} bytes) under ${rel(distRoot)}. The ladder did not ship, so there is`);
  err('  nothing to compare and this run cannot pass.');
  err('');
  err(NO_CONSUMER_NOTE);
  process.exit(1);
}

const builtRungs = rungDecls.map((d) => {
  const media = d.atRules.filter((a) => /^@media/i.test(a));
  const otherAt = d.atRules.filter((a) => !/^@media/i.test(a));
  const read = media.length === 1 ? readMediaMinimum(media[0]) : { minWidth: null, extra: '' };
  const tokenMatch = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(d.value.trim());
  return {
    minWidth: media.length === 0 ? null : media.length > 1 ? 'AMBIGUOUS' : read.minWidth,
    extra: [...otherAt, read.extra].filter(Boolean).join(' + '),
    token: tokenMatch ? tokenMatch[1] : d.value.trim(),
    rawValue: d.value.trim(),
    selector: d.selector,
    file: d.file,
    mediaPrelude: media[0] ?? '(no media query)',
  };
});

builtRungs.sort(
  (a, b) =>
    (typeof a.minWidth === 'number' ? a.minWidth : -1) -
    (typeof b.minWidth === 'number' ? b.minWidth : -1)
);

if (builtRungs.length !== GUTTER_RUNGS.length) {
  findings.push(
    `rung COUNT: layout-ladder.ts declares ${GUTTER_RUNGS.length} rung(s); the built CSS carries ` +
      `${builtRungs.length} \`--pub-gutter\` declaration(s) [${builtRungs
        .map((r) => `${r.minWidth ?? 'base'}:${r.token}`)
        .join(', ')}]`
  );
}

for (let i = 0; i < Math.max(GUTTER_RUNGS.length, builtRungs.length); i++) {
  const want = GUTTER_RUNGS[i];
  const got = builtRungs[i];
  const label = `rung ${i + 1}`;
  if (!want) {
    findings.push(
      `${label}: the built CSS has an extra rung the module does not declare — ${got.minWidth ?? 'base'} / ${got.token} (${rel(got.file)})`
    );
    continue;
  }
  if (!got) {
    findings.push(
      `${label}: the module declares ${want.minWidth ?? 'base'} / ${want.token} and the built CSS has no such rung`
    );
    continue;
  }
  if (got.minWidth === 'AMBIGUOUS') {
    findings.push(
      `${label}: the media query "${got.mediaPrelude}" yields more than one width minimum, so this gate cannot say which rung it is. Refusing to guess.`
    );
  } else if ((want.minWidth ?? null) !== (got.minWidth ?? null)) {
    findings.push(
      `${label} BREAKPOINT: layout-ladder.ts says ${want.minWidth === null ? 'the unconditioned base rung' : `min-width ${want.minWidth}px`}; ` +
        `the built CSS says ${got.minWidth === null ? 'the unconditioned base rung' : `${got.minWidth}px`} — from "${got.mediaPrelude}" in ${rel(got.file)}`
    );
  }
  if (want.token !== got.token) {
    findings.push(
      `${label} TOKEN: layout-ladder.ts says \`${want.token}\`; the built CSS says \`${got.rawValue}\` ` +
        `(at ${got.minWidth === null ? 'the base rung' : `${got.minWidth}px`}, in ${rel(got.file)})`
    );
  }
  if (got.extra) {
    findings.push(
      `${label} SCOPE (R3): its media query carries a condition beyond a width minimum — "${got.extra}" ` +
        `in "${got.mediaPrelude}". The ladder in layout-ladder.ts has no such qualifier, so this rung ` +
        'would not apply on every medium.'
    );
  }
}

const maxWidthDecls = allDecls.filter((d) => d.prop === 'max-width');
const seenMax = new Map();
for (const d of maxWidthDecls) {
  for (const sel of splitAtDepthZero(d.selector)) {
    const m = /^\.pub-max-([a-z0-9-]+)$/i.exec(sel.trim());
    if (m) seenMax.set(m[1], { value: d.value.trim(), file: d.file, selector: d.selector });
  }
}

if (seenMax.size === 0) {
  err(`assert-gutter-ladder: not one \`.pub-max-*\` rule in ${sources.length} stylesheet(s) under`);
  err(`  ${rel(distRoot)}. The page maxima did not ship and this run cannot pass.`);
  process.exit(1);
}

for (const [key, wantPx] of Object.entries(PAGE_MAX)) {
  const got = seenMax.get(key);
  if (!got) {
    findings.push(
      `page maximum \`${key}\`: PAGE_MAX declares ${wantPx}px and the built CSS has no \`.pub-max-${key}\` rule`
    );
    continue;
  }
  const fn = /^min\((.*)\)$/is.exec(got.value);
  if (!fn) {
    findings.push(
      `page maximum \`${key}\`: expected \`min(<cap>px, 100%)\` — §2.2 requires the 100% half, which is ` +
        `what keeps the box inside the shell below the cap — but the built CSS says \`${got.value}\``
    );
    continue;
  }
  const args = splitAtDepthZero(fn[1]);
  const capArg = args.find((a) => /px\s*$/.test(a));
  const hasFull = args.some((a) => a.trim() === '100%');
  const gotPx = capArg ? Number(capArg.replace(/px\s*$/, '')) : Number.NaN;
  if (gotPx !== wantPx) {
    findings.push(
      `page maximum \`${key}\`: PAGE_MAX says ${wantPx}px; the built CSS says ` +
        `${Number.isNaN(gotPx) ? `\`${got.value}\`` : `${gotPx}px`} (selector "${got.selector}" in ${rel(got.file)})`
    );
  }
  if (!hasFull) {
    findings.push(
      `page maximum \`${key}\`: \`${got.value}\` has no \`100%\` term, so the box can exceed the shell's content width below the cap`
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * 8. Report.
 * ------------------------------------------------------------------------------------------- */

if (findings.length > 0) {
  err('assert-gutter-ladder: FAIL — the built stylesheet and src/lib/layout-ladder.ts disagree.');
  err('');
  for (const f of findings) err(`  x ${f}`);
  err('');
  err('  The ladder has ONE definition in TypeScript and ONE in CSS, and they cannot import each');
  err('  other. Change BOTH, or change neither. `sizesFor` composes the gutter terms into every');
  err("  gallery image's `sizes` attribute, so a disagreement downloads the wrong variant of");
  err('  every photograph with no visual symptom at all.');
  err('');
  err(`  ${findings.length} finding(s). Requirements PUB-05, QUAL-03; sections 2.1 and 2.2.`);
  process.exit(1);
}

out('assert-gutter-ladder: PASS');
out(
  `  scanned ${sources.length} stylesheet(s) (${totalBytes} bytes) under ${rel(distRoot)} — ` +
    `${cssFiles.length} linked + ${inlineSheets.length} distinct inline <style> from ${htmlFiles.length} document(s)`
);
out(`  self-test: ${canariesChecked}/${canariesChecked} canaries passed`);
out('  ladder read from src/lib/layout-ladder.ts — never restated here');
out('  rungs found, in force order:');
for (const r of builtRungs) {
  out(
    `    ${(r.minWidth === null ? 'base' : `>=${r.minWidth}px`).padStart(10)}  --pub-gutter: var(${r.token})   [${r.mediaPrelude}]`
  );
}
out('  page maxima found:');
for (const [key, wantPx] of Object.entries(PAGE_MAX)) {
  out(
    `    ${`.pub-max-${key}`.padEnd(16)} ${seenMax.get(key).value}   (PAGE_MAX.${key} = ${wantPx})`
  );
}
