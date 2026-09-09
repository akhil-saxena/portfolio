import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import sharp from 'sharp';
import manifest from '../../data/portfolio_images.json' with { type: 'json' };
import { BREAKPOINTS, GUTTER_RUNGS, gutterAt } from '../../src/lib/layout-ladder.ts';
import { photoHref, photoSlug } from '../../src/lib/photo-srcset.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const PHASE_DIR = join(REPO, '.planning', 'phases', '05-public-site');

const OUT = process.env.AUDIT_OUT ?? join(process.env.TMPDIR ?? '/tmp', '05-15-audit');
mkdirSync(OUT, { recursive: true });
const LOG = join(OUT, 'measurements.jsonl');
if (!existsSync(LOG)) writeFileSync(LOG, '');

function record(kind: string, fields: Record<string, unknown>): void {
  appendFileSync(LOG, `${JSON.stringify({ kind, at: Date.now(), ...fields })}\n`);
}

type DeviceClass = {
  readonly n: number;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly coarse: boolean;
};

const CLASSES: readonly DeviceClass[] = [
  { n: 1, label: 'folded cover', width: 344, height: 882, coarse: true },
  { n: 2, label: 'phone portrait', width: 390, height: 844, coarse: true },
  { n: 3, label: 'foldable unfolded', width: 841, height: 768, coarse: true },
  { n: 4, label: 'tablet portrait', width: 768, height: 1024, coarse: true },
  { n: 5, label: 'tablet landscape', width: 1024, height: 768, coarse: true },
  { n: 6, label: 'laptop', width: 1440, height: 900, coarse: false },
];

type PhotoRecord = { readonly id: string; readonly category: string; readonly order?: number };
const PHOTOS = manifest as readonly PhotoRecord[];

const FIRST_BY_ORDER = [...PHOTOS].sort(
  (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
)[0];

if (FIRST_BY_ORDER === undefined) {
  throw new Error(
    'six-class.spec: data/portfolio_images.json is empty, so the category and photograph routes ' +
      'would be composed from nothing. An audit that walked four routes instead of six and ' +
      'reported six passes is the failure this refusal exists to prevent.'
  );
}

type Route = { readonly id: string; readonly path: string; readonly shot: string };

const ROUTES: readonly Route[] = [
  { id: 'home', path: '/', shot: 'home-state-a' },
  { id: 'work', path: '/development', shot: 'work-populated' },
  { id: 'photos', path: '/photography', shot: 'photos-populated' },
  {
    id: 'category',
    path: `/photography/${FIRST_BY_ORDER.category}`,
    shot: 'photos-category',
  },
  { id: 'photo', path: photoHref(FIRST_BY_ORDER), shot: 'photo-detail' },
  { id: 'resume', path: '/resume', shot: 'resume-populated' },
];

const GALLERY_ROUTES: readonly string[] = [
  '/photography',
  ...[...new Set(PHOTOS.map((p) => p.category))].sort().map((c) => `/photography/${c}`),
];

type HomeAtLoad = {
  scrollY: number;
  vw: number;
  vh: number;
  aTopDoc: number;
  aBottom: number;
  promptBottom: number;
  peekBottom: number;
  scrollMax: number;
  barHeight: number;
  docWidth: number;
};

type HomeAfterScroll = {
  scrollY: number;
  peekBottom: number;
  gallerySampled: number;
  galleryVisible: number;
  actTwoCover: number;
  workHeadTop: number;
  resumeHeadBottom: number;
  resumeBlockBottom: number;
  vh: number;
  declaredBandGap: string;
  declaredBydayGap: string;
  renderedGapGridToByday: number;
  renderedGapWorkToResume: number;
};

async function measureAtLoad(page: Page): Promise<HomeAtLoad> {
  return await page.evaluate(() => {
    const need = (sel: string): HTMLElement => {
      const el = document.querySelector<HTMLElement>(sel);
      if (el === null) {
        throw new Error(
          `six-class audit: ${sel} is not in the document. The page did not render what the ` +
            'measurement is about, and a geometry read on a missing element is not a measurement.'
        );
      }
      return el;
    };
    const a = need('.hm-a').getBoundingClientRect();
    const prompt = need('.hm-prompt').getBoundingClientRect();
    const peek = need('.hm-peek-grid').getBoundingClientRect();
    const bar = need('.ds-atom-appbar').getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      vw: window.innerWidth,
      vh: window.innerHeight,
      aTopDoc: Math.round(a.top + window.scrollY),
      aBottom: Math.round(a.bottom),
      promptBottom: Math.round(prompt.bottom),
      peekBottom: Math.round(peek.bottom),
      scrollMax: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      barHeight: Math.round(bar.height),
      docWidth: document.documentElement.scrollWidth,
    };
  });
}

async function measureAfterOneViewport(page: Page): Promise<HomeAfterScroll> {
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight);
  });
  await page.waitForTimeout(600);
  return await page.evaluate(() => {
    const need = (sel: string): HTMLElement => {
      const el = document.querySelector<HTMLElement>(sel);
      if (el === null) throw new Error(`six-class audit: ${sel} is not in the document.`);
      return el;
    };
    const peek = need('.hm-peek-grid').getBoundingClientRect();
    const band = need('.hm-b');
    const work = need('.hm-work').getBoundingClientRect();

    const peekRegion = need('.hm-peek');
    let gallerySampled = 0;
    let galleryVisible = 0;
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const x = peek.left + (peek.width * (i + 0.5)) / 5;
        const y = peek.top + (peek.height * (j + 0.5)) / 5;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
        gallerySampled++;
        const hit = document.elementFromPoint(x, y);
        if (hit !== null && peekRegion.contains(hit)) galleryVisible++;
      }
    }

    const bandRect = band.getBoundingClientRect();
    const actTwoCover = Math.round(
      (Math.max(0, Math.min(window.innerHeight, bandRect.bottom) - Math.max(0, bandRect.top)) /
        window.innerHeight) *
        100
    );
    const resume = need('.hm-resume').getBoundingClientRect();
    const byday = need('.hm-byday');
    const grid = need('.hm-grid').getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      peekBottom: Math.round(peek.bottom),
      gallerySampled,
      galleryVisible,
      actTwoCover,
      workHeadTop: Math.round(need('#hm-work-h').getBoundingClientRect().top),
      resumeHeadBottom: Math.round(need('#hm-resume-h').getBoundingClientRect().bottom),
      resumeBlockBottom: Math.round(resume.bottom),
      vh: window.innerHeight,
      declaredBandGap: getComputedStyle(band).rowGap,
      declaredBydayGap: getComputedStyle(byday).marginBlockStart,
      renderedGapGridToByday: Math.round(byday.getBoundingClientRect().top - grid.bottom),
      renderedGapWorkToResume: Math.round(resume.top - work.bottom),
    };
  });
}

const fillsOf = (m: HomeAtLoad): boolean => m.promptBottom <= m.vh && m.aBottom >= m.vh;

const departsOf = (m: HomeAfterScroll): boolean => m.galleryVisible === 0;

type GalleryPaint = {
  clip: { x: number; y: number; width: number; height: number } | null;
  differingBytes: number;
  maxDelta: number;
};

async function measureGalleryPaint(page: Page): Promise<GalleryPaint> {
  const clip = await page.evaluate(() => {
    const el = document.querySelector('.hm-peek-grid');
    if (el === null) throw new Error('six-class audit: .hm-peek-grid is not in the document.');
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.round(r.left));
    const y = Math.max(0, Math.round(r.top));
    const width = Math.min(window.innerWidth - x, Math.round(r.width));
    const height = Math.min(window.innerHeight - y, Math.round(r.height));
    return width > 0 && height > 0 ? { x, y, width, height } : null;
  });
  if (clip === null) return { clip: null, differingBytes: 0, maxDelta: 0 };

  const rawOf = async (png: Buffer): Promise<Buffer> => await sharp(png).raw().toBuffer();
  const painted = await rawOf(await page.screenshot({ clip }));
  await page.addStyleTag({ content: '.hm-peek { visibility: hidden }' });
  await page.waitForTimeout(200);
  const hidden = await rawOf(await page.screenshot({ clip }));

  let differingBytes = 0;
  let maxDelta = 0;
  const n = Math.min(painted.length, hidden.length);
  for (let i = 0; i < n; i++) {
    const d = Math.abs((painted[i] as number) - (hidden[i] as number));
    if (d !== 0) {
      differingBytes++;
      if (d > maxDelta) maxDelta = d;
    }
  }
  if (painted.length !== hidden.length) {
    throw new Error(
      `six-class audit: the two clipped renders differ in SIZE (${painted.length} vs ` +
        `${hidden.length}). \`visibility: hidden\` must preserve layout; if it did not, this ` +
        'comparison is between two different rectangles and means nothing.'
    );
  }
  return { clip, differingBytes, maxDelta };
}

async function openHome(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(120);
}

for (const c of CLASSES) {
  test.describe(`class ${c.n} — ${c.label}, ${c.width} × ${c.height}, ${c.coarse ? 'coarse' : 'fine'}`, () => {
    test.use({
      viewport: { width: c.width, height: c.height },
      hasTouch: c.coarse,
    });

    test('the emulated pointer is the one the contract assigns this class', async ({
      page,
    }, ti) => {
      await page.goto('/');
      const ptr = await page.evaluate(() => ({
        coarse: matchMedia('(pointer: coarse)').matches,
        fine: matchMedia('(pointer: fine)').matches,
        vw: window.innerWidth,
        vh: window.innerHeight,
      }));
      record('pointer', { project: ti.project.name, class: c.n, ...ptr });
      expect(ptr.coarse, `class ${c.n} must resolve (pointer: coarse) === ${c.coarse}`).toBe(
        c.coarse
      );
      expect(ptr.fine, `class ${c.n} must resolve (pointer: fine) === ${!c.coarse}`).toBe(
        !c.coarse
      );
      expect(ptr.vw, 'the layout viewport is not the class width').toBe(c.width);
      expect(ptr.vh, 'the layout viewport is not the class height').toBe(c.height);
    });

    test('the gutter in force is the one `gutterAt()` computes', async ({ page }, ti) => {
      await page.goto('/');
      const measured = await page.evaluate(() => {
        const shell = document.querySelector('.pub-shell');
        if (shell === null) throw new Error('six-class audit: .pub-shell is not in the document.');
        return getComputedStyle(shell).getPropertyValue('--pub-gutter').trim();
      });
      const expected = `${gutterAt(c.width)}px`;
      record('gutter', { project: ti.project.name, class: c.n, measured, expected });
      expect(measured, `the ladder's rung at ${c.width}px`).toBe(expected);
    });

    test('doc == viewport on all six routes — no horizontal scroll', async ({ page }, ti) => {
      /*
       * THE PREDICATE, AND WHY IT IS THE DOCUMENT'S AND NOT AN ELEMENT'S.
       *
       * `document.documentElement.scrollWidth === window.innerWidth`. `clientWidth` was rejected:
       * on the root element it is the viewport width minus a classic scrollbar, so it EQUALS
       * `innerWidth` whether or not the document overflows and the comparison is vacuous.
       * `scrollWidth` is the overflowing content width, which is the thing R-6 is about.
       *
       * An element-level check (`rect.right > innerWidth`) was written first and REJECTED after
       * measuring it: `/photography` at classes 1–2 is a horizontal RAIL by design (§8.3), so five
       * filter pills legitimately sit past the right edge inside `overflow-x: auto` and the
       * element check reports ten violations on a page whose document does not overflow at all.
       * The rail is the design; the document is the requirement.
       */
      for (const r of ROUTES) {
        await page.goto(r.path, { waitUntil: 'load' });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const m = await page.evaluate(() => ({
          docWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          title: document.title,
        }));
        const overflow = m.docWidth - m.innerWidth;
        record('doc-vs-viewport', {
          project: ti.project.name,
          class: c.n,
          route: r.path,
          ...m,
          overflow,
        });

        // Anti-vacuity: a 404 also has `scrollWidth === innerWidth`. The route must have rendered
        // the document it claims to be, or all 36 cells are a measurement of the error page.
        expect(m.title, `${r.path} did not render a titled document`).not.toBe('');

        /*
         * D-21 IS FIXED UPSTREAM, so every class now asserts zero and the special case is gone.
         *
         * At the folded cover (344px, the narrowest class in the approved matrix) the document was
         * 358px wide on EVERY route: 14px of horizontal scroll, the overflowing element being the
         * AppBar's theme toggle at `left: 326, right: 358`. `AppBar` rendered two unnamed `<div>`s
         * with INLINE `gap: 28px` and `gap: 18px` inside a `justify-content: space-between` row
         * with 16px of padding — 16 + 310 + 32 + 16 = 374 minimum against a 344px viewport — and an
         * inline gap cannot be beaten by a consumer stylesheet without `!important`, the workaround
         * the Core Value forbids.
         *
         * It was asserted AT 14 rather than tolerated, precisely so that the day the upstream fix
         * landed this line would fail and say so. It did: `2.0.0-beta.2` gave the layout gaps a
         * class, and this redded on 2 cells while the pill redded on 10 — 12 failures, all of them
         * the good news. Re-measured against beta.2: 0px at both pointers on all six routes, with
         * 360/375/380/390/768/841/1024/1440 unchanged.
         *
         * Deleted rather than flipped to 0, because a branch asserting the same thing as its
         * `else` is a branch that can only rot.
         */
        expect(
          overflow,
          `${r.path} at ${c.width} × ${c.height}: doc ${m.docWidth} against viewport ${m.innerWidth}`
        ).toBe(0);
      }
    });

    test('state A fills the view, and one viewport of scroll departs', async ({ page }, ti) => {
      await openHome(page);
      const at = await measureAtLoad(page);
      const after = await measureAfterOneViewport(page);
      const fills = fillsOf(at);
      const departs = departsOf(after);
      record('state-a', {
        project: ti.project.name,
        class: c.n,
        mutation: null,
        at,
        after,
        fills,
        departs,
      });

      /*
       * 🔴 §16.2 SAYS "State A's bottom edge EQUALS `svh`". MEASURED, IT DOES NOT, AND IT MUST NOT.
       *
       * `.hm-a` is `min-height`, never `height` (§6.2), precisely so that content taller than the
       * budget overflows VISIBLY. At class 1 the identity block plus the peek grid plus the prompt
       * come to 903px against an 882px viewport — 21px of legitimate overflow. An equality
       * assertion would red a correct page at the narrowest class and would have to be "fixed" by
       * clipping, which is the failure `min-height`-never-`height` exists to prevent.
       *
       * So the real predicate is `aBottom >= vh` — state A reaches AT LEAST the fold — and it is
       * one half of the two-sided `fills`.
       */
      expect(
        fills,
        `fills at class ${c.n}: prompt ${at.promptBottom} / A ${at.aBottom} / vh ${at.vh}`
      ).toBe(true);
      expect(
        departs,
        `departs at class ${c.n}: ${after.galleryVisible} of ${after.gallerySampled} lattice ` +
          `points still answered by the gallery after ${after.scrollY}px; Act 2 covers ` +
          `${after.actTwoCover}% of the viewport (peek bottom ${after.peekBottom})`
      ).toBe(true);

      /*
       * ANTI-VACUITY FOR THE PREDICATE ITSELF, and it is not decoration: `galleryVisible === 0` is
       * trivially satisfied by a lattice that sampled nothing. Under the sticky reveal the peek
       * block is still WHERE IT WAS — stuck at the top of the viewport, underneath Act 2 — so
       * every one of the 25 points is inside the viewport and every one must be answered by Act 2.
       * If `gallerySampled` ever drops to 0 the mechanism has changed back to one that MOVES Act 1,
       * and this line says so rather than reporting a pass.
       */
      expect(
        after.gallerySampled,
        `the occlusion lattice sampled ${after.gallerySampled} points at class ${c.n} — with a ` +
          'sticky Act 1 the peek block stays in the viewport and all 25 must be testable'
      ).toBe(25);
      expect(
        after.actTwoCover,
        `Act 2 covers only ${after.actTwoCover}% of the viewport at class ${c.n}`
      ).toBeGreaterThanOrEqual(99);

      /*
       * THE VISIBILITY PROOF, and it is the one that actually answers Akhil's requirement. The
       * lattice above proves the gallery is not HIT-TESTABLE; this proves it is not VISIBLE, which
       * a transparent Act 2 would break while the lattice went on reading zero. See
       * `measureGalleryPaint`. It mutates the page, so it is the last thing this test does.
       */
      const paint = await measureGalleryPaint(page);
      record('gallery-paint', { project: ti.project.name, class: c.n, ...paint });
      expect(
        paint.clip,
        'the peek block left the viewport entirely — the mechanism moves Act 1 again, and this ' +
          'proof is about a mechanism that covers it'
      ).not.toBeNull();
      expect(
        paint.differingBytes,
        `${paint.differingBytes} bytes of the gallery's rect at class ${c.n} change when the ` +
          'photographs are hidden — so that many pixels of them are still visible through Act 2 ' +
          `(max delta ${paint.maxDelta})`
      ).toBe(0);

      expect(
        at.scrollY,
        `the page must not scroll itself at first paint (AppBar ${at.barHeight}px; there is no ` +
          'snap point anywhere on this page — 05-16 removed the mechanism entirely)'
      ).toBe(0);
    });

    test('CONTROL — `60svh` breaks `fills` and cannot break `departs`', async ({ page }, ti) => {
      await openHome(page);
      await page.addStyleTag({ content: '.hm-a { min-height: 60svh }' });
      await page.waitForTimeout(150);
      const at = await measureAtLoad(page);
      const after = await measureAfterOneViewport(page);
      const fills = fillsOf(at);
      const departs = departsOf(after);
      record('control-60svh', { project: ti.project.name, class: c.n, at, after, fills, departs });

      expect(
        fills,
        `60svh must break fills at class ${c.n}: A ${at.aBottom} against vh ${at.vh}`
      ).toBe(false);
      expect(departs, `60svh must NOT break departs at class ${c.n}`).toBe(true);
    });

    test('CONTROL — `160svh` breaks `fills`, and does NOT break `departs` on geometry', async ({
      page,
    }, ti) => {
      await openHome(page);
      await page.addStyleTag({ content: '.hm-a { min-height: 160svh }' });
      await page.waitForTimeout(150);
      const at = await measureAtLoad(page);
      const after = await measureAfterOneViewport(page);
      const fills = fillsOf(at);
      const departs = departsOf(after);
      record('control-160svh', { project: ti.project.name, class: c.n, at, after, fills, departs });

      expect(fills, `160svh must break fills at class ${c.n} (from above)`).toBe(false);

      expect(
        departs,
        `160svh must break departs at class ${c.n}: ${after.galleryVisible} of ` +
          `${after.gallerySampled} lattice points still show the gallery, Act 2 covers ` +
          `${after.actTwoCover}%`
      ).toBe(false);
    });

    test('CONTROL — a transparent Act 2 breaks the visibility proof and nothing else', async ({
      page,
    }, ti) => {
      await openHome(page);
      await page.addStyleTag({ content: '.hm-b { background-color: transparent }' });
      await page.waitForTimeout(150);
      const at = await measureAtLoad(page);
      const after = await measureAfterOneViewport(page);
      const fills = fillsOf(at);
      const departs = departsOf(after);
      const paint = await measureGalleryPaint(page);
      record('control-transparent-act-2', {
        project: ti.project.name,
        class: c.n,
        fills,
        departs,
        differingBytes: paint.differingBytes,
        maxDelta: paint.maxDelta,
        actTwoCover: after.actTwoCover,
      });

      expect(fills, `the transparency control must NOT break fills at class ${c.n}`).toBe(true);
      expect(
        after.actTwoCover,
        `the transparency control must NOT change Act 2's geometry at class ${c.n}`
      ).toBeGreaterThanOrEqual(99);

      /*
       * 🔴 THE HIT-TEST HOLE, ASSERTED AS A KNOWN LIMITATION RATHER THAN LEFT AS A SURPRISE.
       * `elementFromPoint` returns the topmost element whether or not it is opaque, so the lattice
       * reads "0 visible" through a fully transparent Act 2. This line pins that, so nobody later
       * mistakes the lattice for a visibility proof — and so that if a future Playwright or
       * Chromium changes the behaviour, the change is announced here rather than silently
       * strengthening a claim this file makes carefully.
       */
      expect(
        departs,
        'the lattice is a HIT-TEST and cannot see transparency — if this ever goes false, ' +
          'elementFromPoint has changed and the visibility proof below is no longer the only one'
      ).toBe(true);

      expect(
        paint.differingBytes,
        `a transparent Act 2 must reveal the photographs at class ${c.n}, and the differential ` +
          `render found ${paint.differingBytes} differing bytes`
      ).toBeGreaterThan(0);
    });

    test('Act 2 after the departure, and the two gaps §6.4 closed', async ({ page }, ti) => {
      await openHome(page);
      const after = await measureAfterOneViewport(page);
      const resumeInside = after.resumeHeadBottom <= after.vh;
      record('act-2', { project: ti.project.name, class: c.n, ...after, resumeInside });

      // Both gaps are DECLARED `--space-8` (32px). Asserted as computed values, because §6.4's
      // claim is about the declarations 05-11 changed.
      expect(after.declaredBandGap, "the band gap before 'The résumé'").toBe('32px');
      expect(after.declaredBydayGap, "the gap between the grid and 'By day —'").toBe('32px');

      if (c.n === 3) {
        /*
         * THE BINDING CASE (§6.4, and the plan's `must_haves`). The reviewed capture at 841 × 768
         * put "The résumé" on the bottom edge with its content cut off. It is the only class the
         * plan asks to fit, and R-2 is why: "only work and résumé visible" was agreed to mean what
         * FILLS the view after the transition, not a promise that both fit one viewport — which
         * cannot hold at five projects plus a résumé at any class.
         */
        expect(
          resumeInside,
          `Act 2 at 841 × 768: the résumé heading's bottom is ${after.resumeHeadBottom} against a ${after.vh} viewport`
        ).toBe(true);
      }
    });

    test('the reveal reaches `.hm-b` and `.hm-a`, read in a browser rather than in a stylesheet', async ({
      page,
    }, ti) => {
      await openHome(page);
      const reveal = await page.evaluate(() => {
        const work = document.querySelector('#work');
        const a = document.querySelector('.hm-a');
        if (work === null || a === null) {
          throw new Error('six-class audit: #work or .hm-a is not in the document.');
        }
        const w = getComputedStyle(work);
        const s = getComputedStyle(a);
        return {
          aPosition: s.position,
          aTop: s.top,
          workPosition: w.position,
          workZIndex: w.zIndex,
          workBackground: w.backgroundColor,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          aSnapAlign: s.scrollSnapAlign,
          workSnapAlign: w.scrollSnapAlign,
          htmlType: getComputedStyle(document.documentElement).scrollSnapType,
          htmlBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        };
      });
      record('reveal', { project: ti.project.name, class: c.n, ...reveal });

      expect(reveal.aPosition, "state A's position, read in a browser").toBe('sticky');
      expect(
        reveal.aTop,
        '`position: sticky` with `top: auto` never sticks — it behaves exactly like `relative`, ' +
          'which is the silent version of this failure'
      ).toBe('0px');
      expect(reveal.workPosition, "Act 2's position, read in a browser").toBe('relative');
      expect(Number(reveal.workZIndex), "Act 2's stacking order").toBeGreaterThanOrEqual(1);

      expect(
        reveal.workBackground,
        'Act 2 is transparent — the stuck Act 1 shows through'
      ).not.toBe('rgba(0, 0, 0, 0)');
      expect(
        reveal.workBackground,
        "Act 2's surface must be the page's own token, not a second opaque colour"
      ).toBe(reveal.bodyBackground);

      expect(reveal.htmlType, 'no snap type survives anywhere').toBe('none');
      expect(reveal.aSnapAlign, 'state A carries no snap alignment').toBe('none');
      expect(reveal.workSnapAlign, '#work carries no snap alignment').toBe('none');

      if (ti.project.name === 'reduce') {
        expect(reveal.htmlBehavior, 'smooth scrolling must be gone under `reduce`').not.toBe(
          'smooth'
        );
        return;
      }
      expect(reveal.htmlBehavior, 'smooth scrolling under no-preference').toBe('smooth');
    });

    test('the Act-2 reveal is CONTINUOUS — the measurement that chose the mechanism', async ({
      page,
    }, ti) => {
      await openHome(page);
      const covers: number[] = [];
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await page.evaluate((f: number) => {
          window.scrollTo({ top: window.innerHeight * f, behavior: 'instant' });
        }, fraction);
        await page.waitForTimeout(250);
        covers.push(
          await page.evaluate(() => {
            const band = document.querySelector('.hm-b');
            if (band === null) throw new Error('six-class audit: .hm-b is not in the document.');
            const r = band.getBoundingClientRect();
            return Math.round(
              (Math.max(0, Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top)) /
                window.innerHeight) *
                100
            );
          })
        );
      }
      const steps = covers.slice(1).map((v, i) => v - (covers[i] as number));
      const worst = Math.max(...steps);
      record('reveal-continuity', {
        project: ti.project.name,
        class: c.n,
        covers,
        steps,
        worst,
      });

      expect(covers[0], `Act 2 must be off-stage at scroll 0 (class ${c.n})`).toBeLessThanOrEqual(
        5
      );
      expect(
        covers[4],
        `Act 2 must fill the view after one viewport (class ${c.n}): ${covers.join(' → ')}`
      ).toBeGreaterThanOrEqual(99);

      expect(
        worst,
        `the reveal jumps at class ${c.n}: coverage went ${covers.join(' → ')} (worst step ` +
          `${worst}). A snap point anywhere on this page reproduces exactly this.`
      ).toBeLessThanOrEqual(30);
    });

    test('the `Link` colours, read in a browser rather than in jsdom', async ({ page }, ti) => {
      await openHome(page);
      const colours = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('.ds-atom-appbar a[href="/development"]');
        const foot = document.querySelector<HTMLElement>('.ds-atom-footer-link');
        if (nav === null || foot === null) {
          throw new Error('six-class audit: a nav link or a footer link is not in the document.');
        }
        const read = (el: HTMLElement) => {
          const s = getComputedStyle(el);
          return {
            color: s.color,
            textDecorationColor: s.textDecorationColor,
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
          };
        };
        return { nav: read(nav), footer: read(foot), theme: document.documentElement.className };
      });
      record('link-colours', { project: ti.project.name, class: c.n, ...colours });

      expect(colours.theme, 'the public default is dark').toContain('dark');

      expect(colours.nav.color, "the nav link's colour is §4.2's --ink-2").toBe(
        'rgb(191, 191, 197)'
      );

      expect(colours.footer.color, "the footer link's text colour is --ink and is correct").toBe(
        'rgb(242, 242, 244)'
      );
      expect(
        colours.footer.textDecorationColor,
        'D-4 / §4.6b: the footer underline is black at 25% on a dark page, from an inline style'
      ).toBe('rgba(0, 0, 0, 0.25)');
    });

    test('exactly three font families download, and Playfair is not Georgia', async ({
      page,
    }, ti) => {
      const files: string[] = [];
      page.on('response', (r) => {
        const url = r.url();
        if (/\.(woff2?|ttf|otf)(\?|$)/.test(url))
          files.push(`${r.status()} ${url.split('/').pop()}`);
      });
      await openHome(page);

      const fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        const loaded = new Set<string>();
        document.fonts.forEach((f) => {
          if (f.status === 'loaded') loaded.add(f.family);
        });
        const h1 = document.querySelector('h1');
        if (h1 === null) throw new Error('six-class audit: the page has no <h1>.');
        const h1Family = getComputedStyle(h1).fontFamily;

        const widthIn = (family: string): number => {
          const el = document.createElement('span');
          el.textContent = 'Handgloves 0123456789';
          el.style.cssText = `position:absolute;left:-9999px;white-space:pre;font-size:100px;font-weight:700;font-family:${family}`;
          document.body.appendChild(el);
          const w = el.getBoundingClientRect().width;
          el.remove();
          return w;
        };

        return {
          loaded: [...loaded].sort(),
          h1Family,
          wDisplay: widthIn(h1Family),
          wGeorgia: widthIn('Georgia'),
          wAbsent: widthIn('"No Such Family 9x7", Georgia'),
        };
      });
      record('fonts', { project: ti.project.name, class: c.n, ...fonts, files });

      expect(fonts.loaded, 'exactly three families load').toEqual([
        'DM Sans Variable',
        'IBM Plex Mono',
        'Playfair Display Variable',
      ]);
      for (const banned of ['Inter', 'Archivo', 'JetBrains Mono', 'Newsreader']) {
        expect(fonts.loaded.join('|'), `${banned} must not load`).not.toContain(banned);
      }
      expect(fonts.h1Family, "the h1's family stack begins with Playfair").toContain(
        'Playfair Display'
      );

      expect(
        fonts.wAbsent,
        'the fallback control must measure Georgia exactly, or the instrument cannot see a fallback'
      ).toBe(fonts.wGeorgia);
      expect(
        fonts.wDisplay,
        `Playfair ${fonts.wDisplay} against Georgia ${fonts.wGeorgia} — equal would mean a silent fallback`
      ).not.toBe(fonts.wGeorgia);
    });

    test('the 44px hit floor — a nav link, a footer link and a filter pill', async ({
      page,
    }, ti) => {
      await page.goto('/photography', { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const boxes = await page.evaluate(() => {
        const h = (sel: string): number => {
          const el = document.querySelector<HTMLElement>(sel);
          if (el === null) throw new Error(`six-class audit: ${sel} is not in the document.`);
          return Math.round(el.getBoundingClientRect().height);
        };
        return {
          nav: h('.ds-atom-appbar a[href="/development"]'),
          footer: h('.ds-atom-footer-link'),
          pill: h('.ph-filters .ds-atom-segmented-btn'),
        };
      });
      record('hit-areas', { project: ti.project.name, class: c.n, coarse: c.coarse, ...boxes });

      if (!c.coarse) {
        expect(boxes.nav, 'a nav link still has a box on a fine pointer').toBeGreaterThan(0);
        return;
      }

      expect(
        boxes.nav,
        'the AppBar link meets the coarse floor (design system, appbar.css)'
      ).toBeGreaterThanOrEqual(44);
      expect(
        boxes.footer,
        'the Footer link meets the coarse floor (primitives.css:5763)'
      ).toBeGreaterThanOrEqual(44);

      expect(
        boxes.pill,
        'OQ-4 / D-3: the filter pill must meet the 44px coarse floor (fixed in 2.0.0-beta.2)'
      ).toBe(44);
    });
  });
}

test.describe('the whole gallery, in a real DOM', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('`aria-current="page"` appears exactly once IN THE RAIL on each gallery route', async ({
    page,
  }, ti) => {
    expect(GALLERY_ROUTES.length, 'the gallery route set must be non-trivial').toBeGreaterThan(1);
    for (const route of GALLERY_ROUTES) {
      await page.goto(route, { waitUntil: 'load' });
      const rail = page.locator('nav[aria-label="Photo categories"] [aria-current="page"]');
      const inRail = await rail.count();
      const inPage = await page.locator('[aria-current="page"]').count();
      record('aria-current', { project: ti.project.name, route, inRail, inPage });

      expect(inRail, `${route}: exactly one pill in the rail is current`).toBe(1);
      const href = await rail.first().getAttribute('href');
      record('aria-current-href', { project: ti.project.name, route, href });
      expect(href, `${route}'s current pill must point at ${route}`).toBe(route);
      expect(inPage, `${route}: the document carries the rail's pill AND the AppBar's link`).toBe(
        2
      );
    }
  });

  test('the derived route set matches what the build actually emitted', async ({ page }) => {
    // Anti-vacuity for the DERIVATION itself. Every route above is composed from the manifest; if
    // the composition were wrong, each page would 404 and `document.title` would still be a
    // string. So each derived route is asserted to be the page it claims to be.
    for (const r of ROUTES) {
      const response = await page.goto(r.path, { waitUntil: 'load' });
      expect(response?.status(), `${r.path} must be a real prerendered document`).toBe(200);
    }
    expect(ROUTES.map((r) => r.path)).toContain(`/photography/${FIRST_BY_ORDER.category}`);
    expect(ROUTES.map((r) => r.path)).toContain(
      `/photography/${FIRST_BY_ORDER.category}/${photoSlug(FIRST_BY_ORDER)}`
    );
  });

  test('the device matrix straddles every rung of the gutter ladder', () => {
    // The `key_links` obligation, made load-bearing rather than decorative. Every breakpoint the
    // module declares must have a class on each side of it, or the six-class matrix would be
    // walking one rung twice and calling it coverage.
    expect(BREAKPOINTS.length, 'the ladder must declare more than one rung').toBeGreaterThan(1);
    for (const bp of BREAKPOINTS) {
      const below = CLASSES.some((c) => c.width < bp);
      const atOrAbove = CLASSES.some((c) => c.width >= bp);
      expect(below, `no class sits below the ${bp}px rung`).toBe(true);
      expect(atOrAbove, `no class sits at or above the ${bp}px rung`).toBe(true);
    }
    expect(GUTTER_RUNGS.length, 'four rungs, base first').toBe(BREAKPOINTS.length + 1);
  });
});

/* ══ PUB-13 — THE LIGHTBOX, MEASURED IN A BROWSER RATHER THAN READ IN A STYLESHEET ═════════════
 *
 * 🔴 THIS IS THE ONE PART OF PUB-13 THAT WAS PROVEN AT THE GREP TIER, AND THIS BLOCK IS THE FIX.
 *
 * `05-AUDIT.md` §2 measured suppression on the SHELL — `loadY` is 0 of 48 under `reduce` — and
 * `test/public/*` assert that every snap and scroll-behaviour declaration sits inside a
 * `no-preference` query. Neither touches the lightbox. The overlay declares
 * `animation: lightboxFade 0.2s ease-out` (`.ds-atom-lightbox-backdrop`, `primitives.css`), the
 * consumer adds no motion of its own (`PhotoLightbox.tsx` § MOTION), and the ONLY thing that
 * suppresses that animation is the design system's own system-wide guard:
 *
 *     @media (prefers-reduced-motion: reduce) {
 *       [class^="ds-"], … { animation-duration: 0.01ms !important; … }
 *     }
 *
 * Until this test existed, that sentence was the entire proof — a line read out of a stylesheet.
 * §2's `reduce` run never opened the lightbox, and §8a opened it at DEFAULT motion. So the
 * requirement's weakest clause was carried by a grep, in a project whose own standard is that a
 * computed style beats a grep and a browser beats both.
 *
 * WHAT IS MEASURED: `getComputedStyle(backdrop).animationName` and `.animationDuration`, on the
 * real element, in the built artefact, in both motion projects.
 *
 * ================================================================================================
 * WHY `animationName` IS ASSERTED AND NOT ONLY THE DURATION — THIS IS THE VACUITY TRAP
 * ================================================================================================
 *
 * The guard is a BLANKET rule keyed on the class-name prefix, not on the lightbox. It applies
 * `animation-duration: 0.01ms !important` to every `ds-`-prefixed element whether or not that
 * element animates. So under `reduce` a duration read of `0.01ms` is ALSO what an element with NO
 * ANIMATION AT ALL returns — the assertion would stay green if `lightboxFade` were deleted
 * upstream, if the backdrop stopped carrying a `ds-` class, or if the overlay never animated in
 * the first place. A duration-only check is a gate that cannot distinguish "the motion is
 * suppressed" from "there is no motion", which is the same shape as the nineteen vacuous gates
 * this project has already shipped.
 *
 * Hence two reads, and the pairing is the proof:
 *
 *   `animationName` must be `lightboxFade` in BOTH projects — there IS an animation to suppress,
 *                   and it is still declared under `reduce` (the guard collapses the duration
 *                   rather than removing the animation, which is deliberate upstream: many entry
 *                   animations land their final opacity with `both`/forwards, and
 *                   `animation: none` would revert the element to its invisible pre-animation
 *                   frame. Its own comment says so).
 *   `animationDuration` must be `0.2s` under `no-preference` and `0.01ms` under `reduce`.
 *
 * The `no-preference` half is the DISCRIMINATING CONTROL and is not decoration: the same read, on
 * the same element, through the same instrument, returns a real 200ms. So `0.01ms` under `reduce`
 * is a measurement of the guard rather than a property of the harness. A control that cannot
 * return the failing value proves nothing.
 *
 * ================================================================================================
 * VIEWPORT, AND WHY ONE CLASS
 * ================================================================================================
 *
 * The guard is keyed on a media feature and a class prefix; no rule in the chain is width
 * conditional, and the backdrop is `position: fixed` at every class. So this runs at ONE class —
 * §8a's, taken from the declared table by label rather than typed — and that choice is stated
 * here rather than left to be inferred from the absence of the other five.
 *
 * ================================================================================================
 * THE OPEN IS A POLL, BECAUSE THE ISLAND IS `client:idle`
 * ================================================================================================
 *
 * `PhotoLightbox` hydrates on idle, and BEFORE it hydrates a tile is still a working anchor to a
 * prerendered page (that is PUB-04/PUB-09 working, not a defect). A single unconditional click
 * would therefore NAVIGATE on a fast machine and open the overlay on a slow one — a coin flip
 * that would land as an unattributable flake. So the click is retried until either the overlay
 * appears or the attempt budget runs out, and a navigation is walked back. The attempt count is
 * recorded, and exhausting the budget is a FAILURE naming the URL — never a skip.
 */

const LB_CLASS = CLASSES.find((c) => c.label === 'phone portrait');

if (LB_CLASS === undefined) {
  throw new Error(
    'six-class.spec: the device table no longer declares a "phone portrait" class, so the ' +
      'lightbox measurement has no viewport. Refusing to run it at an arbitrary one.'
  );
}

/** The overlay the design system paints, and the animation it declares on it. */
const LB_BACKDROP = '.ds-atom-lightbox-backdrop';
const LB_ANIMATION = 'lightboxFade';

/**
 * What each motion project must read back, IN SECONDS. `0.2` is `primitives.css`'s own
 * declaration on the backdrop; `0.00001` is the 0.01ms the reduced-motion guard collapses it to.
 *
 * 🔴 SECONDS, NOT THE STRING CHROMIUM PRINTS, AND THAT IS A CORRECTION RATHER THAN A PREFERENCE.
 * Written first as a string comparison against `'0.01ms'`, this assertion failed on correct code:
 * Chromium serialises the computed value in SECONDS and in exponential form, so the read is
 * `"1e-05s"` and not `"0.01ms"`. A string equality would have to be "fixed" by pasting whatever
 * the browser happened to print, which pins the assertion to a serialisation instead of to the
 * quantity. `durationSeconds` parses and REFUSES anything it cannot read, so an unparseable value
 * is a failure rather than a silent zero — a zero would satisfy "motion is suppressed" for free.
 */
const LB_EXPECTED_SECONDS: Readonly<Record<string, number>> = {
  normal: 0.2,
  reduce: 0.00001,
};

/**
 * `"0.2s"` / `"1e-05s"` / `"200ms"` -> seconds. Throws on anything else: a duration this cannot
 * read has NOT been measured, and returning 0 would look exactly like perfect suppression.
 */
function durationSeconds(computed: string): number {
  const m = /^\s*(-?[0-9.]+(?:e[-+]?[0-9]+)?)(ms|s)\s*$/i.exec(computed);
  if (m === null) {
    throw new Error(
      `six-class.spec: cannot read "${computed}" as a CSS duration. Refusing to convert an ` +
        'unreadable value into a number, because 0 would read as perfect suppression.'
    );
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n))
    throw new Error(`six-class.spec: "${computed}" is not a finite duration`);
  return m[2].toLowerCase() === 'ms' ? n / 1000 : n;
}

test.describe('PUB-13 — the lightbox backdrop, in both motion settings', () => {
  test.use({ viewport: { width: LB_CLASS.width, height: LB_CLASS.height }, hasTouch: true });

  test('the backdrop animates for 0.2s normally and is collapsed under `reduce`', async ({
    page,
  }, ti) => {
    const expected = LB_EXPECTED_SECONDS[ti.project.name];
    expect(
      expected,
      `no expected duration is declared for project "${ti.project.name}" — a new motion project ` +
        'must state what it expects rather than inherit a pass'
    ).toBeDefined();

    // The emulation is asserted before anything is measured, for the reason every other block
    // here asserts its pointer: an emulation that silently stopped working would report the
    // DEFAULT motion setting's number as the reduced one, which is the exact false green.
    const prefersReduce = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    expect(
      prefersReduce,
      `project "${ti.project.name}" must actually resolve (prefers-reduced-motion: reduce) as ` +
        `${ti.project.name === 'reduce'}`
    ).toBe(ti.project.name === 'reduce');

    const gallery = '/photography';
    const response = await page.goto(gallery, { waitUntil: 'load' });
    expect(response?.status(), `${gallery} must be a real prerendered document`).toBe(200);

    // Anti-vacuity 1: there must be something to click. A gallery that rendered no tile would
    // otherwise take the "never opened" path and report a timeout instead of an empty page.
    const tiles = page.locator('#ph-grid a[data-lb-index]');
    const tileCount = await tiles.count();
    expect(
      tileCount,
      `${gallery} rendered no tile carrying data-lb-index — there is nothing to open, so this ` +
        'measurement cannot pass'
    ).toBeGreaterThan(0);

    const backdrop = page.locator(LB_BACKDROP);
    const galleryUrl = page.url();
    const ATTEMPTS = 20;
    let attempts = 0;
    let opened = false;
    for (; attempts < ATTEMPTS && !opened; attempts++) {
      await tiles.first().click();
      if ((await backdrop.count()) > 0) {
        opened = true;
        break;
      }
      // Not hydrated yet: the anchor navigated. Walk it back and try again.
      if (page.url() !== galleryUrl) {
        await page.goBack({ waitUntil: 'load' });
      }
      await page.waitForTimeout(150);
    }

    // Anti-vacuity 2: an overlay that never opened is a FAILURE. Skipping here would report a
    // green audit over a measurement that was never taken.
    expect(
      opened,
      `the lightbox never opened on ${gallery} after ${ATTEMPTS} clicks — the island did not ` +
        'hydrate, or the overlay no longer carries ' +
        LB_BACKDROP
    ).toBe(true);

    const measured = await backdrop.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        animationDelay: cs.animationDelay,
        transitionDuration: cs.transitionDuration,
      };
    });

    record('lightbox-motion', {
      project: ti.project.name,
      class: LB_CLASS.n,
      width: LB_CLASS.width,
      height: LB_CLASS.height,
      tiles: tileCount,
      attempts: attempts + 1,
      ...measured,
    });

    // The pairing. Name first — without it, `0.01ms` is what a non-animating element reads too.
    expect(
      measured.animationName,
      `${LB_BACKDROP} must still DECLARE ${LB_ANIMATION} under "${ti.project.name}" — the guard ` +
        'collapses the duration and must not remove the animation, and a duration assertion over ' +
        'an element with no animation measures nothing'
    ).toBe(LB_ANIMATION);

    expect(
      durationSeconds(measured.animationDuration),
      `${LB_BACKDROP} computed animation-duration under "${ti.project.name}" ` +
        `(read back as "${measured.animationDuration}")`
    ).toBe(expected);

    // The guard sets the delay too, and it is asserted so that a partial edit upstream is loud.
    expect(
      durationSeconds(measured.animationDelay),
      `${LB_BACKDROP} computed animation-delay under "${ti.project.name}" ` +
        `(read back as "${measured.animationDelay}")`
    ).toBe(0);
  });
});

/* ══ THE SCREENSHOT SET (task 2) ═══════════════════════════════════════════════════════════════
 *
 * `00-RESPONSIVE-CONTRACT.md` §9: every public capture is `-dark-` and the viewport token is one
 * of the six canonical sizes. The regex is §9's with `00` → `05`.
 *
 * 🔴 THE CAPTURES ARE VIEWPORT-SIZED, NOT FULL-PAGE, AND THAT IS FORCED RATHER THAN CHOSEN.
 * §9's contract asks for Home's state A **and** state B at all six classes, because "one state is
 * not evidence of a two-state design". A full-page capture ignores the scroll position, so state A
 * and state B would be the SAME IMAGE twice — 12 files photographing one state. Every claim this
 * audit makes is about what fits in the viewport, so the viewport is what is captured.
 */

const SHOT_RE =
  /^05-[SETOPRX]-[a-z0-9-]+-[a-z0-9-]+-(light|dark)-(344|390|768|841|1024|1440)\.png$/;

test.describe('the screenshot set', () => {
  for (const c of CLASSES) {
    test(`captures at ${c.width} × ${c.height}`, async ({ browser }, ti) => {
      // The captures are the artefact of the NORMAL run. Under `reduce` the page is identical at
      // rest — the query removes snap and smooth scrolling, neither of which paints — so a second
      // set would be 42 duplicate files. (The `test.skip(fn, reason)` form is typed
      // `(condition: boolean, …)` in 1.62 and rejects a predicate, so the guard is in the body.)
      test.skip(ti.project.name !== 'normal', 'the captures are the artefact of the normal run');
      const context = await browser.newContext({
        viewport: { width: c.width, height: c.height },
        hasTouch: c.coarse,
        colorScheme: 'dark',
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      const written: string[] = [];

      const shoot = async (name: string): Promise<void> => {
        const file = `05-X-${name}-dark-${c.width}.png`;
        expect(file, 'the capture name must match the responsive contract').toMatch(SHOT_RE);
        await page.screenshot({ path: join(PHASE_DIR, file) });
        written.push(file);
      };

      for (const r of ROUTES) {
        await page.goto(r.path, { waitUntil: 'load' });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await page.waitForTimeout(400);
        await shoot(r.shot);
        if (r.id === 'home') {
          await page.evaluate(() => {
            window.scrollTo(0, window.innerHeight);
          });
          await page.waitForTimeout(700);
          await shoot('home-state-b');
        }
      }

      record('screenshots', { project: ti.project.name, class: c.n, written });
      expect(written.length, `every route plus Home's second state at class ${c.n}`).toBe(
        ROUTES.length + 1
      );
      await context.close();
    });
  }
});
