/**
 * The public shell's standing assertions. Plan 05-06, Task 3.
 *
 * ================================================================================================
 * WHAT THIS FILE CAN AND CANNOT ASSERT, STATED BEFORE THE ASSERTIONS RATHER THAN AFTER
 * ================================================================================================
 *
 * The plan offers two ways to check `<Seo>`'s output: Astro's container API, or the built HTML.
 * NEITHER IS AVAILABLE TO A STANDING TEST IN THIS REPOSITORY TODAY, and both reasons were measured
 * rather than assumed:
 *
 *   1. THE CONTAINER API NEEDS THE ASTRO VITE PLUGIN, AND THE `unit` PROJECT HAS NONE BY DESIGN.
 *      `import Seo from '../../src/components/public/Seo.astro'` under `vitest.unit.config.ts`
 *      fails in `vite:import-analysis`:
 *
 *          Failed to parse source for import analysis because the content contains invalid JS
 *          syntax.  File: src/components/public/Seo.astro:132:22   <title>{title}</title>
 *
 *      `vitest.unit.config.ts`'s own header states "NO `globalSetup`, NO plugins and NO
 *      `environment` override", and it is a deliberate decision with reasons written next to it.
 *      Adding the Astro plugin to reach one component would change module resolution for the
 *      thirty-odd unit files already in that project. Not worth it, and not this plan's to spend.
 *
 *   2. THERE IS NO BUILT HTML TO READ. `<Seo>` and `PublicLayout` are consumed by no route until
 *      wave 4 (05-07 … 05-11); this plan's own `<verification>` block forbids touching
 *      `src/pages/**`. A test that read `dist/` today would read nothing, and a test that passes
 *      over nothing is the exact failure class this repository has paid for nineteen times.
 *
 * So this file asserts three things it CAN assert honestly, and names the fourth it cannot:
 *
 *   A. `src/lib/site-meta.ts` — BEHAVIOURAL. Real imports, real manifest, and all four refusals
 *      driven by mocking the manifest module. Nothing here is source-shaped.
 *   B. `src/components/public/Seo.astro` — STRUCTURAL, over the source. It catches a deleted tag,
 *      a hard-coded value where an expression belongs, a removed refusal, and any `set:html`. It
 *      does NOT catch a wrong runtime value.
 *   C. `src/layouts/PublicLayout.astro` — STRUCTURAL, over the source. The PUB-14 / §5.2 script
 *      budget, and the single-CSS-import rule, both of which are properties of the source.
 *
 *   D. NOT ASSERTED HERE: that a BUILT page carries exactly one inline script, no module script,
 *      an absolute canonical and an absolute og:image. That is 05-14's §5.3 assertion 2, over
 *      `dist/`, and it becomes possible the moment the first route uses the layout. Plan 05-06
 *      verified all of it against a real build with a temporary probe route and recorded the
 *      emitted HTML in its SUMMARY; that was a measurement, not a standing gate.
 *
 * Every assertion below counts its input before judging it. A `readFileSync` that returned an
 * empty string would otherwise satisfy every `not.toContain` in this file.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import manifest from '../../data/portfolio_images.json';
import { GUTTER_RUNGS, PAGE_MAX } from '../../src/lib/layout-ladder';
import { SITE_OG_IMAGE, SITE_OG_IMAGE_ALT, SITE_OG_IMAGE_ID } from '../../src/lib/site-meta';

const read = (relative: string): string => {
  const text = readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), 'utf8');
  // ANTI-VACUITY. An empty read satisfies every absence assertion in this file.
  expect(text.length, `${relative} is empty, so nothing below checked anything`).toBeGreaterThan(
    500
  );
  return text;
};

const SEO_SRC = 'src/components/public/Seo.astro';
const LAYOUT_SRC = 'src/layouts/PublicLayout.astro';
const NAV_SRC = 'src/components/public/PublicNav.tsx';
const SHELL_CSS = 'src/styles/public-shell.css';

/**
 * EVERY ABSENCE ASSERTION IN THIS FILE RUNS OVER COMMENT-STRIPPED SOURCE, AND THAT IS NOT
 * FASTIDIOUSNESS — the first draft of this test had NINE failures and every one of them was the
 * test matching PROSE in a file header rather than code:
 *
 *   `not.toContain('set:html')`           fired on the paragraph explaining why there is none
 *   `not.toContain('https://akhilsaxena.com')`  fired on the paragraph explaining Astro.site
 *   `<script>` counted 2                  the frontmatter comment says the word
 *   the inline script measured 157 lines  `indexOf('<script')` found the prose occurrence first
 *   the `@media print` block had no @page the first occurrence of the string is in the header
 *
 * That is the eighth-plus instance of this class in this project (05-05 hit it counting `'-'`
 * literals, 04-02 and 03-06 before that). A rule that fires on its own rationale is a rule that
 * gets deleted.
 *
 * A CHARACTER SCANNER, NOT A REGEX. A regex block-comment stripper deletes everything between a
 * `/*` that lives inside a STRING and the next `*` + `/`, which silently removes real code. The
 * scanner below tracks string state, and its canaries are checked as real tests further down.
 */
function stripComments(source: string): string {
  let kept = '';
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const ch = source[i];
    if (quote) {
      kept += ch;
      if (ch === '\\') {
        kept += source[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      kept += ch;
      i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      i = end === -1 ? source.length : end + 3;
      continue;
    }
    kept += ch;
    i++;
  }
  return kept;
}

/** `{ frontmatter, template }` for an `.astro` file, split at the real closing fence. */
function splitAstro(source: string): { frontmatter: string; template: string } {
  const lines = source.split('\n');
  expect(lines[0].trim(), 'the file does not open with a frontmatter fence').toBe('---');
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  expect(close, 'no closing frontmatter fence found').toBeGreaterThan(0);
  return {
    frontmatter: lines.slice(1, close).join('\n'),
    template: lines.slice(close + 1).join('\n'),
  };
}

/** The template half. Comments intact — the script budget counts the bytes that SHIP. */
const templateOf = (source: string): string => splitAstro(source).template;

/** The whole file with comments removed, for every absence assertion. */
const codeOf = (source: string): string => stripComments(source);

describe('the comment stripper this file depends on', () => {
  it('drops a block comment', () => {
    expect(stripComments('a{/* set:html */b:1}')).not.toContain('set:html');
  });
  it('drops a line comment', () => {
    expect(stripComments('const a = 1; // set:html\nconst b = 2;')).not.toContain('set:html');
  });
  it('drops an HTML comment', () => {
    expect(stripComments('<p>x</p><!-- set:html -->')).not.toContain('set:html');
  });
  it('KEEPS a comment-looking string literal, which a regex stripper would eat', () => {
    expect(stripComments(`const a = '/* not a comment */'; const b = 2;`)).toContain('const b = 2');
  });
  it('KEEPS a URL inside a string, which a naive // stripper would truncate', () => {
    expect(stripComments(`const a = 'https://x/y'; const b = 2;`)).toContain('const b = 2');
  });
  it('leaves real code alone', () => {
    expect(stripComments('const a = 1;')).toBe('const a = 1;');
  });
});

/* ============================================================================================
 * A. src/lib/site-meta.ts — behavioural
 * ========================================================================================== */

describe('site-meta — the site-wide OG image (OQ-6a)', () => {
  it('resolves to the chosen photograph, read from the manifest rather than pasted', () => {
    // The expectation is DERIVED from the same data the module reads, but by a separately written
    // lookup. It never restates the URL: a literal here would agree with a pasted literal there.
    expect(manifest.length, 'the manifest is empty').toBeGreaterThanOrEqual(39);
    const record = manifest.find((entry) => entry.id === SITE_OG_IMAGE_ID);
    expect(record, `no record with id ${SITE_OG_IMAGE_ID}`).toBeDefined();
    expect(SITE_OG_IMAGE).toBe(record?.urls.large);
    expect(SITE_OG_IMAGE_ALT).toBe(record?.alt);
  });

  it('is a landscape photograph, which is what a summary_large_image card wants', () => {
    const record = manifest.find((entry) => entry.id === SITE_OG_IMAGE_ID);
    expect(record?.dimensions.width).toBeGreaterThan(record?.dimensions.height ?? 0);
  });

  it('is an absolute https URL, because a relative og:image is dropped by every scraper', () => {
    expect(() => new URL(SITE_OG_IMAGE)).not.toThrow();
    expect(new URL(SITE_OG_IMAGE).protocol).toBe('https:');
  });

  it('carries the photograph own alt, not a summary and not a placeholder', () => {
    // The floor is 05-04's measured shortest real alt (83 characters), halved. It is a floor and
    // not an equality, so a 41st photograph cannot turn this red.
    expect(SITE_OG_IMAGE_ALT.length).toBeGreaterThan(40);
    expect(SITE_OG_IMAGE_ALT.toLowerCase()).not.toContain('portfolio');
  });
});

describe('site-meta — every refusal, driven by replacing the manifest', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const loadWith = async (records: unknown) => {
    vi.doMock('../../data/portfolio_images.json', () => ({ default: records }));
    return import('../../src/lib/site-meta');
  };

  it('refuses an EMPTY manifest, naming it as a content failure rather than a missing id', async () => {
    await expect(loadWith([])).rejects.toThrow(/holds no records at all/);
  });

  it('refuses a manifest with no such id, naming the id and the record count', async () => {
    await expect(
      loadWith([{ id: 'nature-somethingelse', alt: 'x', urls: { large: 'https://x/y' } }])
    ).rejects.toThrow(new RegExp(`no record with id "${SITE_OG_IMAGE_ID}"`));
  });

  it('refuses a record with no urls.large, rather than emitting an empty og:image', async () => {
    await expect(
      loadWith([{ id: SITE_OG_IMAGE_ID, alt: 'a'.repeat(50), urls: { medium: 'https://x/y' } }])
    ).rejects.toThrow(/no usable urls\.large/);
  });

  it('refuses a record with no alt, rather than announcing the card as nothing', async () => {
    await expect(
      loadWith([{ id: SITE_OG_IMAGE_ID, alt: '', urls: { large: 'https://x/y' } }])
    ).rejects.toThrow(/no usable alt/);
  });
});

/* ============================================================================================
 * B. src/components/public/Seo.astro — structural
 * ========================================================================================== */

describe('Seo.astro — SEO-01 emits the whole tag set, once, from props', () => {
  /**
   * §12.3's list, in full. A test that checked "some og tags are present" would pass a component
   * missing `og:image:alt`, which is the one nobody notices because it is only ever read aloud.
   */
  const REQUIRED_META = [
    ['og:title', 'property'],
    ['og:description', 'property'],
    ['og:type', 'property'],
    ['og:url', 'property'],
    ['og:image', 'property'],
    ['og:image:alt', 'property'],
    ['twitter:card', 'name'],
    ['description', 'name'],
  ] as const;

  it.each(REQUIRED_META)('emits <meta %s=...> exactly once', (tag, attr) => {
    const template = templateOf(read(SEO_SRC));
    const occurrences = template.split(`${attr}="${tag}"`).length - 1;
    expect(occurrences, `${attr}="${tag}" appears ${occurrences} time(s)`).toBe(1);
  });

  it('emits a canonical link and a title', () => {
    const template = templateOf(read(SEO_SRC));
    expect(template).toContain('rel="canonical"');
    expect(template).toContain('<title>{title}</title>');
  });

  it('takes every value from an expression — no tag carries a hard-coded content string', () => {
    const template = templateOf(read(SEO_SRC));
    const contentAttrs = [...template.matchAll(/content=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
    expect(contentAttrs.length, 'no content= attributes found at all').toBeGreaterThanOrEqual(
      REQUIRED_META.length
    );
    const literal = contentAttrs.filter((v) => v.startsWith('"'));
    // `twitter:card` is the one legitimate literal: `summary_large_image` is a fixed vocabulary
    // value, not content. Anything else being literal means a page cannot set it.
    expect(literal).toEqual(['"summary_large_image"']);
  });

  it('uses summary_large_image, not summary — the card is a 3:2 landscape photograph', () => {
    expect(templateOf(read(SEO_SRC))).toContain('content="summary_large_image"');
  });

  it('never names Astro raw-HTML directive at all, in code OR in prose', () => {
    /* RAW source, not comment-stripped, and deliberately stronger than the rest of this file:
       `assert-no-raw-html-sinks.mjs` matches by string anywhere in a scanned file, comments
       included. MEASURED — a paragraph in this component's own header explaining why it avoids
       the directive failed the build with two findings, both prose. So the standing rule for this
       file is that the token does not appear, full stop, and this test holds the same line the
       gate does rather than a weaker version of it. */
    expect(read(SEO_SRC)).not.toContain(['set', 'html'].join(':'));
  });

  it('keeps its three build-time refusals', () => {
    const source = read(SEO_SRC);
    // Each is matched by the message it throws, so renaming a variable does not silently pass
    // while deleting the guard does not silently fail.
    expect(source).toMatch(/Astro\.site` is not set/);
    expect(source).toMatch(/canonical must be a root-relative path/);
    expect(source).toMatch(/og:image must be an ABSOLUTE URL/);
  });

  it('builds both absolute URLs from Astro.site rather than from a second copy of the origin', () => {
    const source = read(SEO_SRC);
    expect(source).toContain('new URL(normalisedPath, Astro.site)');
    // The trailing-slash rule has ONE definition, shared with resume.astro's Person url.
    expect(source).toContain('canonicalPath(canonical)');
    expect(codeOf(source)).not.toContain('https://akhilsaxena.com');
  });
});

/* ============================================================================================
 * C. src/layouts/PublicLayout.astro — the PUB-14 / §5.2 budget, over the source
 * ========================================================================================== */

describe('PublicLayout.astro — PUB-14 and §5.2', () => {
  const scriptBlocks = (source: string) =>
    [...source.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);

  it('carries exactly one <script>, and it is is:inline', () => {
    const blocks = scriptBlocks(templateOf(read(LAYOUT_SRC)));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('is:inline');
  });

  it('that script is under 40 lines, tags included', () => {
    const source = templateOf(read(LAYOUT_SRC));
    const start = source.indexOf('<script');
    const end = source.indexOf('</script>', start);
    expect(start, 'no <script> in the layout at all').toBeGreaterThan(-1);
    expect(end, 'unterminated <script>').toBeGreaterThan(start);
    const lines = source.slice(start, end + '</script>'.length).split('\n').length;
    expect(lines, `the inline script is ${lines} lines`).toBeLessThan(40);
  });

  it('the one script is the THEME script and nothing else', () => {
    const source = templateOf(read(LAYOUT_SRC));
    const body = source.slice(source.indexOf('<script'), source.indexOf('</script>'));
    // The four jobs §12.1 and OQ-5 allow it, and no fifth.
    expect(body).toContain('localStorage');
    expect(body).toContain('beforeprint');
    expect(body).toContain('afterprint');
    expect(body).toContain('pub-theme-toggle');
    // `prefers-color-scheme` is NOT consulted: REQUIREMENTS.md Out of Scope says two states, dark
    // by default. A three-state toggle would arrive here first.
    expect(body).not.toContain('prefers-color-scheme');
    // The localStorage read must be inside a try. Safari private mode throws on ACCESS, and an
    // unhandled throw aborts the script before the class is corrected.
    expect(body).toMatch(/try\s*\{[^}]*localStorage\.getItem/);
  });

  it('carries no client:* directive — zero framework JavaScript is a property of the shell', () => {
    expect(codeOf(read(LAYOUT_SRC))).not.toMatch(/client:(load|idle|visible|media|only)/);
    expect(codeOf(read(NAV_SRC))).not.toMatch(/client:(load|idle|visible|media|only)/);
  });

  it('server-renders the theme attributes rather than setting them from script', () => {
    const template = templateOf(read(LAYOUT_SRC));
    // A script that SETS data-brand paints one frame of the default brand first (§12.1).
    expect(template).toMatch(/<html[^>]*data-brand="monochrome"[^>]*class="dark"/);
    const body = codeOf(template.slice(template.indexOf('<script'), template.indexOf('</script>')));
    expect(body).not.toContain('data-brand');
  });

  it('reserves a named head slot so no page hand-writes a meta tag (SEO-01)', () => {
    expect(templateOf(read(LAYOUT_SRC))).toContain('<slot name="head" />');
  });

  it('emits no <title> or <meta name="description"> of its own', () => {
    // A default title would give every route that forgot <Seo> a plausible wrong one instead of a
    // visibly missing one.
    const template = codeOf(templateOf(read(LAYOUT_SRC)));
    expect(template).not.toContain('<title>');
    expect(template).not.toContain('name="description"');
  });
});

describe('the design-system stylesheet is imported once, from the shell, and nowhere else', () => {
  it('PublicLayout imports it', () => {
    expect(read(LAYOUT_SRC)).toContain("import '../styles/design-system.css'");
  });

  it('no other file under src/ imports any of the four design-system stylesheets directly', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = fileURLToPath(new URL('../../src', import.meta.url));
    const files: string[] = [];
    (function walk(dir: string) {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(astro|ts|tsx|css)$/.test(name)) files.push(full);
      }
    })(root);
    // ANTI-VACUITY: a walk that found nothing would satisfy the loop below trivially.
    expect(files.length, 'the walk over src/ found no files').toBeGreaterThan(20);

    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith('design-system.css')) continue;
      const text = readFileSync(file, 'utf8');
      const code = stripComments(text);
      if (/@akhil-saxena\/design-system\/(tokens|primitives|utilities)\.css/.test(code))
        offenders.push(file);
      if (/@akhil-saxena\/design-system\/(themes|fonts)\//.test(code)) offenders.push(file);
    }
    expect(
      offenders,
      'the four sheets must be reached only through src/styles/design-system.css'
    ).toEqual([]);
  });
});

/* ============================================================================================
 * The stylesheet's five gutter sites. The BUILT check is scripts/assert-gutter-ladder.mjs; this
 * is the source-side companion, and the two ask different questions on purpose.
 * ========================================================================================== */

describe('public-shell.css — the five sites the ladder has to be paid back at (§2.1)', () => {
  const SITES = [
    ['1 · the shell pays the gutter', /\.pub-shell\s*\{[^}]*padding:\s*0 var\(--pub-gutter\)/],
    ['2 · the bar breaks out', /\.pub-bar\s*\{[^}]*margin-inline:\s*calc\(var\(--pub-gutter\)/],
    [
      '3 · the bar pays it back',
      /\.pub-bar \.ds-atom-appbar\s*\{[^}]*padding-inline:\s*var\(--pub-gutter\)/,
    ],
    [
      '4 · the footer breaks out',
      /\.pub-footer\s*\{[^}]*margin-inline:\s*calc\(var\(--pub-gutter\)/,
    ],
    [
      '5 · the footer pays it back',
      /\.pub-footer \.ds-atom-footer\s*\{[^}]*padding-inline:\s*var\(--pub-gutter\)/,
    ],
  ] as const;

  it.each(SITES)('site %s is present', (_label, pattern) => {
    expect(codeOf(read(SHELL_CSS))).toMatch(pattern);
  });

  it('declares --pub-gutter exactly as many times as there are rungs', () => {
    const source = codeOf(read(SHELL_CSS));
    const declarations = source.match(/--pub-gutter\s*:/g) ?? [];
    expect(declarations).toHaveLength(GUTTER_RUNGS.length);
  });

  it('names every rung breakpoint and token from layout-ladder.ts, never a bare pixel gutter', () => {
    const source = codeOf(read(SHELL_CSS));
    for (const rung of GUTTER_RUNGS) {
      if (rung.minWidth !== null)
        expect(source, `rung at ${rung.minWidth}`).toContain(`min-width: ${rung.minWidth}px`);
      expect(source, `token ${rung.token}`).toContain(`--pub-gutter: var(${rung.token})`);
      // The px value must NOT appear as a literal length anywhere in the stylesheet: the whole
      // point of the ladder is that the numbers live in tokens.
      expect(source, `${rung.px}px literal`).not.toMatch(
        new RegExp(`[^-\\d]${rung.px}px(?![a-z])`, 'i')
      );
    }
  });

  it('writes every page maximum as min(cap, 100%), with the cap from PAGE_MAX', () => {
    const source = codeOf(read(SHELL_CSS));
    for (const [key, px] of Object.entries(PAGE_MAX)) {
      expect(source, `.pub-max-${key}`).toContain(`.pub-max-${key}`);
      expect(source, `cap for ${key}`).toContain(`max-width: min(${px}px, 100%)`);
    }
  });

  it('puts scroll-behaviour INSIDE prefers-reduced-motion: no-preference, never the reverse', () => {
    const source = codeOf(read(SHELL_CSS));
    expect(source).toContain('@media (prefers-reduced-motion: no-preference)');
    // Written the other way round, the accessible path becomes the exception and every animation
    // added later has to remember to opt out (§12.2).
    expect(source).not.toContain('prefers-reduced-motion: reduce');
    const query = source.slice(source.indexOf('@media (prefers-reduced-motion: no-preference)'));
    expect(query.slice(0, 200)).toContain('scroll-behavior: smooth');
  });

  it('restates no design-system colour inside @media print (§11.3, OQ-5)', () => {
    const source = codeOf(read(SHELL_CSS));
    const start = source.indexOf('@media print');
    expect(start, 'no @media print block').toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf('\n}\n', start) + 3);
    expect(block.length, 'the print block read as empty').toBeGreaterThan(50);
    for (const property of ['color:', 'background:', 'background-color:', 'border-color:'])
      expect(block, `@media print declares ${property}`).not.toContain(property);
    expect(block).toContain('@page');
    expect(block).toContain('15mm');
  });

  it('hides the bar, the footer and the theme toggle when printing', () => {
    const css = codeOf(read(SHELL_CSS));
    const block = css.slice(css.indexOf('@media print'));
    for (const selector of ['.pub-bar', '.pub-footer', '#pub-theme-toggle'])
      expect(block, `${selector} is not hidden in print`).toContain(selector);
  });
});
