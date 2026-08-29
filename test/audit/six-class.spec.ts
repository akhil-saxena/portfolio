/**
 * The six-class audit — the measurements no static gate can see. Plan 05-15, tasks 1 and 2.
 *
 * ================================================================================================
 * WHAT THIS FILE IS FOR, AND WHY IT IS NOT IN `npm test`
 * ================================================================================================
 *
 * `05-UI-SPEC.md` §16 lists eight measurements the executor owes *beyond* the gates, and notes
 * that each has already been wrong once in this project. Four of them need a real browser:
 *
 *   - a page's scoped CSS silently not reaching a component's root (Astro's `data-astro-cid-*`),
 *   - an inline style beating an app rule while jsdom implements no CSS specificity at all,
 *   - a full-viewport section whose `calc()` is invalid at computed-value time and resolves `auto`,
 *   - a font falling back to Georgia while the stylesheet looks correct.
 *
 * None is visible to a grep and none is visible to jsdom. Hence Chromium, and hence a separate
 * script: `npm run audit:public`. It is deliberately NOT chained into `npm test` — see the reason
 * beside the script in `package.json`.
 *
 * ================================================================================================
 * THE ANTI-VACUITY RULE THIS FILE IS BUILT ON  (threat T-05-15-01)
 * ================================================================================================
 *
 * The one integrity concern in an audit is a pass it did not measure. Every measurement below
 * therefore does three things:
 *
 *   1. **Refuses a missing subject.** `measureHome` throws naming which selector was absent; a
 *      route that failed to load reports a hard error rather than an empty geometry.
 *   2. **Records the number**, not a verdict. Everything is appended to a JSONL file so the audit
 *      document is written FROM the measurements rather than beside them.
 *   3. **Carries its own control where a control exists.** The two state-A mutations are
 *      permanent test cases, not a one-off plant: a control that stops firing reds the suite.
 *
 * ================================================================================================
 * TWO MUTATION CONTROLS, AND WHY BOTH ARE MANDATORY  (§16.2)
 * ================================================================================================
 *
 * "State A is exactly one viewport" is TWO requirements wearing one declaration, and each fails in
 * its own direction:
 *
 *     a `60svh`  mutation must break **fills**    — state A no longer reaches the fold
 *     a `160svh` mutation must break **departs**  — one viewport of scroll no longer clears it
 *
 * Phase 0's plan specified only the second, and it could not fail: a SHORTER state A departs more
 * easily, not less. 05-11 then measured that the FIRST is also mis-stated — a one-sided `fills`
 * ("the prompt is above the fold") stays true under `60svh` at every class, because a shorter
 * state A keeps the prompt on screen and simply brings the work band up with it. Both corrections
 * are carried here: `fills` is two-sided, and each control asserts what it breaks AND what it must
 * NOT break.
 *
 * The mutation is injected at RUNTIME (`page.addStyleTag`) rather than planted in
 * `src/styles/home.css` and rebuilt. That is a narrower claim, stated so nobody reads it as a
 * wider one: it proves the PREDICATE is two-sided and would catch a wrong height. It does not
 * re-prove the source→artefact path, which 05-11 proved by source plant and byte-identical
 * restore (`src/styles/home.css` sha256 `1b8cc50d…`). Runtime injection was chosen because a
 * permanent control that runs on every audit is worth more than a control that ran once, and
 * because a plant in the working tree is the thing that killed an agent in this phase.
 *
 * Specificity: the injected `.hm-a { min-height: … }` is (0,1,0), identical to the rule it
 * replaces, and later in document order — so it wins by order, with no `!important` anywhere.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
// The import attribute is REQUIRED here and is not decoration: Playwright's ESM loader refuses a
// JSON module without it ("needs an import attribute of \"type: json\""), where Astro's Vite
// pipeline does not — so the same specifier that works in `index.astro` fails in this file.
import manifest from '../../data/portfolio_images.json' with { type: 'json' };
import { BREAKPOINTS, GUTTER_RUNGS, gutterAt } from '../../src/lib/layout-ladder.ts';
import { photoHref, photoSlug } from '../../src/lib/photo-srcset.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const PHASE_DIR = join(REPO, '.planning', 'phases', '05-public-site');

/**
 * Where the measurements land. Outside the repository by default — a run's raw record is scratch,
 * and the deliverable is `05-AUDIT.md`, which is written from it.
 */
const OUT = process.env.AUDIT_OUT ?? join(process.env.TMPDIR ?? '/tmp', '05-15-audit');
mkdirSync(OUT, { recursive: true });
const LOG = join(OUT, 'measurements.jsonl');
if (!existsSync(LOG)) writeFileSync(LOG, '');

/** Append one measurement. Written eagerly, because a suite that dies mid-run must not lose them. */
function record(kind: string, fields: Record<string, unknown>): void {
  appendFileSync(LOG, `${JSON.stringify({ kind, at: Date.now(), ...fields })}\n`);
}

/* ══ THE SIX CANONICAL VIEWPORTS ═══════════════════════════════════════════════════════════════
 *
 * `00-RESPONSIVE-CONTRACT.md` §1, and its §2 "resolved mode and density" table for the pointer.
 * ONE declared table; no viewport literal appears anywhere else in this file.
 *
 * 🔴 THE PLAN'S `key_links` ENTRY IS WRONG AND IS CORRECTED HERE, NOT SILENTLY SATISFIED.
 * It says "the six canonical viewports and the breakpoints come from the module
 * `src/lib/layout-ladder.ts`, pattern `BREAKPOINTS`". `BREAKPOINTS` is `[375, 673, 1024]` — the
 * three widths at which the GUTTER steps. It does not contain a viewport and never did; the
 * viewports are the user's approved device matrix and live in the responsive contract. What the
 * module really owns is the gutter in force at a width, so the link is made load-bearing the only
 * way it can be: `gutterAt(width)` is asserted against the value Chromium actually computes at
 * every class, and the matrix is asserted to straddle every rung. A decorative import would have
 * satisfied the letter of the link and measured nothing.
 *
 * Class 5 is `ambiguous` in the contract — a 1024px tablet and a 1024px laptop window want
 * opposite answers, which is why §2.3 forbids gating on width. It is walked as COARSE here,
 * because coarse is the case that has a floor to miss; the fine half of class 5 is class 6's
 * geometry at a shorter viewport and is covered by class 6's assertions.
 */
type DeviceClass = {
  readonly n: number;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** The contract's primary pointer. Emulated with `hasTouch`; see `POINTER EMULATION` below. */
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

/* ══ THE SIX ROUTES, DERIVED FROM THE DATA ═════════════════════════════════════════════════════
 *
 * The category and the photograph are DERIVED — first by `order` — rather than named, so the
 * audit follows the content. `photoHref` is imported rather than composed: 05-08 recorded that a
 * hand-rolled `/photos/${category}/${id.split('-')[1]}` produces a plausible slug and a 404 at a
 * URL nothing in the build checks.
 */
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
  { id: 'work', path: '/work', shot: 'work-populated' },
  { id: 'photos', path: '/photos', shot: 'photos-populated' },
  {
    id: 'category',
    path: `/photos/${FIRST_BY_ORDER.category}`,
    shot: 'photos-category',
  },
  { id: 'photo', path: photoHref(FIRST_BY_ORDER), shot: 'photo-detail' },
  { id: 'resume', path: '/resume', shot: 'resume-populated' },
];

/** The eight gallery routes §8.2 asks for exactly one `aria-current="page"` on. */
const GALLERY_ROUTES: readonly string[] = [
  '/photos',
  ...[...new Set(PHOTOS.map((p) => p.category))].sort().map((c) => `/photos/${c}`),
];

/* ══ POINTER EMULATION — MEASURED, BECAUSE THE OBVIOUS OPTION MOVES THE LAYOUT ═════════════════
 *
 * `hasTouch: true` alone resolves `(pointer: coarse)` in Chromium: MEASURED at 390 × 844,
 * `matchMedia('(pointer: coarse)').matches` is `false` by default and `true` with `hasTouch`, and
 * `.ds-atom-appbar` renders 67px against 69px across that switch — the design system's own coarse
 * rule firing.
 *
 * `isMobile: true` ALSO resolves coarse and was NOT used: it installs a mobile layout viewport,
 * and the same page measured `aBottom` 847 under it against 865 without — an 18px difference in
 * the exact quantity the height budget is judged on. The emulation must not move the measurement.
 *
 * Each class asserts its own pointer before measuring anything, so an emulation that silently
 * stopped working reports itself instead of reporting 44px controls as 40px ones.
 */

/* ══ THE HOME MEASUREMENT ══════════════════════════════════════════════════════════════════════ */

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
  workHeadTop: number;
  resumeHeadBottom: number;
  resumeBlockBottom: number;
  vh: number;
  declaredBandGap: string;
  declaredBydayGap: string;
  renderedGapGridToByday: number;
  renderedGapWorkToResume: number;
};

/**
 * State A at first paint. THROWS if any of the three subjects is missing rather than returning
 * zeroes — a `null` rect coerced to 0 would report `fills: false` as a layout failure when the
 * real failure was that the page never rendered.
 */
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

/** Act 2, after exactly one viewport of scroll. */
async function measureAfterOneViewport(page: Page): Promise<HomeAfterScroll> {
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight);
  });
  // `scroll-behavior: smooth` is declared on `html` under `no-preference`, so the scroll is
  // ANIMATED in the normal run and instant under `reduce`. Waiting for it to settle is the
  // difference between measuring the departure and measuring the middle of it.
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
    const resume = need('.hm-resume').getBoundingClientRect();
    const byday = need('.hm-byday');
    const grid = need('.hm-grid').getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      peekBottom: Math.round(peek.bottom),
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

/** `fills` — TWO-SIDED, per 05-11. One-sided, it cannot fail; see this file's header. */
const fillsOf = (m: HomeAtLoad): boolean => m.promptBottom <= m.vh && m.aBottom >= m.vh;

/** `departs` — one viewport of scroll leaves no photograph on screen. */
const departsOf = (m: HomeAfterScroll): boolean => m.peekBottom <= 0;

/** Load Home and let the webfonts settle; every geometry here is font-dependent. */
async function openHome(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(120);
}

/* ══ THE PER-CLASS SUITE ═══════════════════════════════════════════════════════════════════════ */

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
      // The viewport itself, asserted: a config that silently fell back to 1280 × 720 would make
      // every number below a measurement of the wrong device.
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
       * measuring it: `/photos` at classes 1–2 is a horizontal RAIL by design (§8.3), so five
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
        `departs at class ${c.n}: peek bottom ${after.peekBottom} after ${after.scrollY}px`
      ).toBe(true);

      /*
       * THE SELF-SCROLL AT FIRST PAINT — FIXED, AND NOW ASSERTED AT ZERO IN BOTH RUNS.
       *
       * WHAT THIS ASSERTION USED TO BE, AND WHY IT WAS RIGHT AT THE TIME. `.hm-a` carried
       * `scroll-snap-align: start` with a 116px outset that was supposed to clamp state A's snap
       * position to scroll offset 0. It did not hold: 116px of outset against 113px of chrome left
       * `proximity` close enough to pull the initial offset, and the page scrolled ITSELF 8–20px at
       * first paint. Under `reduce` — the one setting that removes snap — it was 0 every time.
       * This line therefore asserted only `loadY < barHeight` under `no-preference`, because an
       * equality against a real intermittency is a flake, and a flaky assertion teaches a re-run.
       *
       * WHAT CHANGED. Akhil's decision after reading the audit was to drop state A's snap point and
       * keep `#work`'s. Re-measured 8 loads per class per motion setting, over the built artefact,
       * by this suite's own method:
       *
       *     before   `no-preference`  15 of 48 loads self-scrolled (8, 18, 20 px), 5 of 6 classes
       *     before   `reduce`          0 of 48
       *     after    `no-preference`   0 of 48
       *     after    `reduce`          0 of 48
       *
       * `fills` and `departs` stayed 6/6 in both settings across the change, which is the half that
       * says the mechanism did not pay for the fix.
       *
       * SO THE EQUALITY IS NOW THE HONEST ASSERTION, and it is the same one in both runs: with no
       * snap area within a viewport of the document top there is nothing left to pull. If this ever
       * goes red under `no-preference` it is a FINDING — the mechanism returned — and not a reason
       * to re-run. One load per class cannot see a 12.5% intermittency, which is exactly how 05-11
       * measured `loadY = 0` at 7 of 7 and missed this; the 48-load re-measurement is recorded in
       * `05-AUDIT.md` §2 and is what this line stands on.
       */
      expect(
        at.scrollY,
        `the page must not scroll itself at first paint (AppBar ${at.barHeight}px; state A has no snap point)`
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
      // The half that makes it a CONTROL rather than a second copy of the other one. A shorter
      // state A departs MORE easily, so this must stay true — if it ever goes false, the two
      // controls have collapsed into one and "exactly one viewport" is proven in one direction.
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

      /*
       * 🔴 THE PLAN'S SECOND CONTROL IS STILL MIS-STATED, AND THIS IS THE THIRD CORRECTION IT HAS
       * TAKEN. §16.2 says "a `160svh` mutation must break **departs**". Phase 0 wrote it, 05-11
       * measured that it breaks departs at only 5 of its 7 classes, and this run measured WHY:
       *
       *     under `reduce`, `160svh` breaks `departs` at 0 of 6 classes.
       *
       * The peek grid sits near the TOP of state A and the scroll prompt is pinned to its bottom
       * by `margin-block-start: auto`, so making state A taller moves the PROMPT down and leaves
       * the photographs where they were. One viewport of scroll still clears them. What actually
       * happened under `no-preference` is that `scroll-snap-type: y proximity` pulled the
       * programmatic scroll back to a snap point short of a full viewport — MEASURED, class 6:
       * `scrollTo(0, 900)` settled at 665. So the "departure failure" this control produces is a
       * SNAP artefact, not a geometry one, and a control that fires through the mechanism it is
       * not testing is not a control.
       *
       * It is kept as the `fills`-from-above control, which it genuinely is, and the real
       * `departs` control is the next test.
       */
      if (ti.project.name === 'reduce') {
        expect(
          departs,
          `with snap suppressed, 160svh leaves departs TRUE at class ${c.n}: peek bottom ${after.peekBottom}`
        ).toBe(true);
      }
    });

    test('CONTROL — a document too short to scroll a viewport breaks `departs` alone', async ({
      page,
    }, ti) => {
      /*
       * THE `departs` CONTROL THIS PLAN OWED AND HAD TO CONSTRUCT, because neither of the two it
       * was handed can fail on geometry.
       *
       * `departs` is `peekBottom(load) <= min(vh, scrollMax)`. The prompt sits BELOW the peek grid,
       * so any mutation that pushes the photographs past the fold pushes the prompt past it too
       * and breaks `fills` in the same breath — MEASURED with `.hm-tile { aspect-ratio: 1/2 }`,
       * which breaks both at 6 of 6. The ONLY way to break `departs` while `fills` stays true is
       * the second term: the document running out of scroll before it runs out of viewport.
       *
       * That is exactly §6.2's documented failure — "at 768 × 1024, work + résumé + crosslink +
       * footer came to 1012px against a 1024px viewport … `scrollY=1012, photosBottom=12, NOT
       * DEPARTED`" — and it is what `.hm-b { min-height: 100svh }` exists to prevent.
       *
       * 🔴 AND THE GUARD IS NO LONGER LOAD-BEARING ON ITS OWN. MEASURED: with `.hm-b`'s
       * `min-height` removed and nothing else, `departs` stays TRUE at 6 of 6 — Act 2's real
       * content is now taller than a viewport by itself at five classes, and at class 6 it clears
       * by 24px (`scrollMax` 791 against a peek bottom of 767). Removing the padding as well takes
       * `scrollMax` to 727 and the departure fails. So the mutation is two declarations, and the
       * 24px is the honest measure of how much margin §6.2's guard has left.
       */
      await openHome(page);
      await page.addStyleTag({ content: '.hm-b { min-height: 0; padding-block: 0 }' });
      await page.waitForTimeout(150);
      const at = await measureAtLoad(page);
      const after = await measureAfterOneViewport(page);
      const fills = fillsOf(at);
      const departs = departsOf(after);
      record('control-short-document', {
        project: ti.project.name,
        class: c.n,
        at,
        after,
        fills,
        departs,
      });

      // The half that makes it a control and not a second `fills` mutation.
      expect(fills, `the short-document control must NOT break fills at class ${c.n}`).toBe(true);

      if (c.n === 6) {
        expect(
          departs,
          `the short-document control must break departs at class 6: scrollMax ${at.scrollMax}, peek bottom ${after.peekBottom}`
        ).toBe(false);
      } else {
        // Recorded, not asserted as a failure: the other five classes have more Act-2 content per
        // viewport and survive the same mutation. Naming which class fires is the difference
        // between a control and a coincidence.
        expect(departs, `class ${c.n} survives the short-document control`).toBe(true);
      }
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

    test('the snap declarations reach `#work`, and reduced motion removes them', async ({
      page,
    }, ti) => {
      await openHome(page);
      const snap = await page.evaluate(() => {
        const work = document.querySelector('#work');
        const a = document.querySelector('.hm-a');
        if (work === null || a === null) {
          throw new Error('six-class audit: #work or .hm-a is not in the document.');
        }
        return {
          workAlign: getComputedStyle(work).scrollSnapAlign,
          workMargin: getComputedStyle(work).scrollMarginTop,
          aAlign: getComputedStyle(a).scrollSnapAlign,
          aMargin: getComputedStyle(a).scrollMarginTop,
          htmlType: getComputedStyle(document.documentElement).scrollSnapType,
          htmlBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        };
      });
      record('snap', { project: ti.project.name, class: c.n, ...snap });

      if (ti.project.name === 'reduce') {
        // §12.2. The suppression must be REAL, not merely declared inside a query that never
        // applies — which is what a source grep would have confirmed either way.
        expect(snap.htmlType, 'snap must be gone under `reduce`').toBe('none');
        expect(snap.htmlBehavior, 'smooth scrolling must be gone under `reduce`').not.toBe(
          'smooth'
        );
        expect(snap.aAlign, 'state A carries no snap alignment under `reduce`').toBe('none');
        expect(snap.workAlign, '#work carries no snap alignment under `reduce`').toBe('none');
        return;
      }

      /*
       * THE ASTRO SCOPING TRAP, WHICH A GREP CANNOT SEE (§6.5).
       *
       * `#work` is `HomeActTwo.astro`'s root. A bare `#work { }` written in `index.astro`'s
       * `<style>` block is scoped with THAT file's `data-astro-cid-*` and matches nothing, so the
       * computed value reads `none` while the source reads `start`. This defect has appeared twice
       * in this project in two costumes and passed a grep gate both times. The only instrument
       * that sees it is this line.
       */
      expect(snap.workAlign, "#work's scroll-snap-align, read in a browser").toBe('start');

      /*
       * 🔴 STATE A HAS NO SNAP POINT, AND THIS LINE ASSERTED `start` UNTIL IT DID.
       *
       * `.hm-a { scroll-snap-align: start }` with a 116px outset was what pulled the page 8–20px
       * at first paint — 15 of 48 loads under `no-preference` when this suite's own method was
       * re-run, 0 of 48 under `reduce`. Akhil's decision after reading the audit was to drop state
       * A's snap point and keep `#work`'s, which is the one that makes Act 2 land. Asserted at
       * `none` rather than deleted, so the day the rule comes back this line says so.
       */
      expect(snap.aAlign, 'state A must carry NO snap alignment — see loadY below').toBe('none');

      /*
       * Chromium serialises `y proximity` as `y`, because `proximity` is the INITIAL strictness
       * and is therefore dropped from the serialisation. Reading `y` is POSITIVE confirmation the
       * snap is not `mandatory` — under `mandatory` this reads `y mandatory`. Recorded so the
       * short string is never misread as a partial declaration.
       */
      expect(snap.htmlType, 'the html snap type').toBe('y');
      /*
       * 0px, and it used to be 116px. The outset existed ONLY to clamp state A's snap position to
       * scroll offset 0, and it did not hold — 116px of outset against 113px of chrome left
       * `proximity` close enough to pull. With the snap point gone the outset has nothing to
       * offset, so it went with it. `--hm-above` itself stays: it is the height budget's own
       * subtrahend and is load-bearing there.
       */
      expect(snap.aMargin, "state A's scroll outset went with its snap point").toBe('0px');
      expect(snap.workMargin, "#work's outset is 0 because the public nav is static").toBe('0px');
    });

    test('the `Link` colours, read in a browser rather than in jsdom', async ({ page }, ti) => {
      await openHome(page);
      const colours = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('.ds-atom-appbar a[href="/work"]');
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

      /*
       * §4.6a: `Link` sets `color` as an INLINE style on `inline`, `footer` and `action`; an app
       * rule at (0,1,0) loses to it and every jsdom test still passes, because jsdom implements no
       * CSS specificity. Three consecutive Phase 1 plans hit this.
       *
       * The nav uses `variant="default"`, which IS stylesheet-only — so it lands on §4.2's ramp:
       * `--ink-2` = `#bfbfc5` = rgb(191, 191, 197), 10.61 : 1 on the dark page. Confirmed here.
       */
      expect(colours.nav.color, "the nav link's colour is §4.2's --ink-2").toBe(
        'rgb(191, 191, 197)'
      );

      /*
       * 🔴 §4.6b's PREDICTION, CONFIRMED IN A BROWSER, AND IT SHIPS.
       *
       * §4.6b says Phase 5 "uses `variant='default'` in the footer, which is stylesheet-only and
       * therefore correct". THAT ESCAPE DOES NOT EXIST: `Footer`'s own `renderLink` hardcodes
       * `<Link variant="footer">` and exposes no per-item hook, so every consumer gets the inline
       * `text-decoration-color: rgba(0,0,0,.25)`. On `#0d0d0f` that underline is invisible. The
       * link TEXT is `--ink` (#f2f2f4) and correct, so this degrades appearance, not function.
       *
       * Asserted at the WRONG value on purpose, with the finding named (D-4). The day
       * `2.0.0-beta.2` moves the variant's colour into the stylesheet, this line fails and tells
       * you the good news.
       */
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

        /*
         * THE WIDTH COMPARISON, AND THE TRAP IT WALKED INTO ONCE ALREADY.
         *
         * A family NAME in the computed style is not evidence that a file loaded — the computed
         * value is the declared list, resolved or not. So a fixed string is measured in the h1's
         * OWN resolved family stack and against Georgia; equal widths mean a silent fallback.
         *
         * The first version of this probe wrote `font-family: "Playfair Display"` and measured
         * 1025.109375px — IDENTICAL to `font-family: serif`. The loaded family is "Playfair
         * Display **Variable**", so the probe had silently fallen back to Times and would have
         * reported a fallback as a pass. The h1's own computed stack is used instead, and a
         * deliberately absent family is measured as a third control: if the instrument cannot
         * tell a fallback from a hit, `absent` and `georgia` will not be equal.
         */
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

      // §1.2's UNVERIFIED, answered: the bare `@import "@fontsource-variable/…"` specifiers inside
      // the design system's own stylesheet DO resolve through Vite from a transitive dependency.
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

      // The instrument's own control: an absent family MUST fall through to Georgia and measure
      // exactly Georgia's width. If this fails, the width comparison below proves nothing.
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
      await page.goto('/photos', { waitUntil: 'load' });
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
          nav: h('.ds-atom-appbar a[href="/work"]'),
          footer: h('.ds-atom-footer-link'),
          pill: h('.ph-filters .ds-atom-segmented-btn'),
        };
      });
      record('hit-areas', { project: ti.project.name, class: c.n, coarse: c.coarse, ...boxes });

      if (!c.coarse) {
        // Class 6 is fine-pointer; §2.3's floor does not bind and the drawn geometry is the
        // design. Recorded rather than asserted, so the numbers exist for the audit document.
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

      /*
       * 🔴 OQ-4 — THE RECORDED SHORTFALL, ASSERTED AT ITS SHORTFALL.
       *
       * `.ds-atom-segmented[data-size="lg"] .ds-atom-segmented-btn { height: 40px }` and
       * `primitives.css` carries no `pointer: coarse` rule touching it. `FilterNav`'s `className`
       * reaches the `<nav>` only, so a consumer cannot add one without reaching a design-system
       * class name — which belongs in OQ-4, not in a workaround here.
       *
       * Asserted at 40, not at ">= 44" and not at ">= 40". The day the upstream `min-height: 44px`
       * lands, this line fails and tells you the good news.
       */
      expect(
        boxes.pill,
        'OQ-4 / D-3: the filter pill must meet the 44px coarse floor (fixed in 2.0.0-beta.2)'
      ).toBe(44);
    });
  });
}

/* ══ THE MEASUREMENTS THAT ARE NOT PER-CLASS ═══════════════════════════════════════════════════ */

test.describe('the whole gallery, in a real DOM', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('`aria-current="page"` appears exactly once IN THE RAIL on each gallery route', async ({
    page,
  }, ti) => {
    /*
     * Re-confirmed here in a PARSED DOM because a static string count and a parsed document can
     * disagree: `aria-current` inside a comment, an attribute value or a `<script>` counts in a
     * grep and does not exist to a screen reader. 05-07 asserted the string counts; this asserts
     * the elements.
     *
     * 🔴 SCOPED TO THE RAIL, AND THE SCOPE IS THE FINDING. §16 item 6 says "exactly once" and the
     * DOCUMENT carries TWO on every gallery route: the FilterNav's active pill, and the AppBar's
     * own "photographs" link, which `PublicNav` marks current on every route under `/photos`.
     * Written document-wide first, this assertion failed at 2 on all eight routes — independently
     * reproducing the correction 05-07 already recorded in
     * `test/public/photos-routes.node.test.ts`. Both numbers are asserted, so §16's sentence is
     * recorded as wrong about the document and right about the rail.
     *
     * Markup is not viewport-dependent, so this runs at one class rather than six — stated rather
     * than left to be inferred from the absence of the other five.
     */
    expect(GALLERY_ROUTES.length, 'the gallery route set must be non-trivial').toBeGreaterThan(1);
    for (const route of GALLERY_ROUTES) {
      await page.goto(route, { waitUntil: 'load' });
      const rail = page.locator('nav[aria-label="Photo categories"] [aria-current="page"]');
      const inRail = await rail.count();
      const inPage = await page.locator('[aria-current="page"]').count();
      record('aria-current', { project: ti.project.name, route, inRail, inPage });

      // The count is asserted BEFORE the href is read. Reading an attribute off a locator that
      // resolves to nothing waits out the whole 60s timeout and reports a timeout instead of
      // "there is no current pill" — measured, on the vacuity run.
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
    expect(ROUTES.map((r) => r.path)).toContain(`/photos/${FIRST_BY_ORDER.category}`);
    expect(ROUTES.map((r) => r.path)).toContain(
      `/photos/${FIRST_BY_ORDER.category}/${photoSlug(FIRST_BY_ORDER)}`
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
