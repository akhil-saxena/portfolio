/**
 * §13.2's contract table, asserted against the SERVED BYTES — the strings a reader navigates by.
 *
 * ================================================================================================
 * WHY THIS FILE EXISTS, AND WHAT IT DELIBERATELY DOES NOT DO
 * ================================================================================================
 *
 * 05-09 and 05-10 both recorded, in passing, that rewriting `/development`'s `<h1>` leaves the entire suite
 * green. 05-15 went looking and MEASURED the whole of it. §13.2's contract table has ten rows, one
 * of them `n/a`. **Three of them carried no assertion anywhere in `test/` or `scripts/`** — the
 * Home Act-2 secondary CTAs, `Download the PDF` and the empty-category state, five strings between
 * them — **and a fourth had never been built at all**, which is the `/photography` cross-link. 1,488
 * tests passed over a site whose navigation could be rewritten silently.
 *
 * (That sentence read "of §13.2's eleven contract rows, five had no assertion" in this file's first
 * commit. Ten rows, three of them unasserted, five strings. A string count wearing a row count's
 * units is a small error and it is exactly the kind this file exists to make expensive, so it is
 * corrected here rather than quietly.)
 *
 * Akhil's decision was to pin **the structural strings only**. This file is that decision, in one
 * place, because the finding was not "a string was wrong" — it was "nobody could tell which strings
 * were guarded". A reader of this file can tell.
 *
 * ------------------------------------------------------------------------------------------------
 * 🔴 2026-09-02 — FIVE OF THE SIX PINS WERE RETIRED, NOT DELETED. `RETIRED_PINS` IS WHY.
 * ------------------------------------------------------------------------------------------------
 *
 * Home became ONE SCREEN and Act 2 went with it, taking the elements that carried `ALL DEVELOPMENT
 * →`, `RÉSUMÉ →`, `View résumé`, `Development` and `The résumé`. All five reddened with this file's
 * own message: *"the element carrying this copy is gone, and a string assertion over a missing
 * element is not an assertion"*.
 *
 * Deleting the rows would have returned those five strings to the exact state this file was written
 * to end — unguarded, with nothing recording that they ever were guarded. So they moved to a second
 * table and their assertions INVERTED: the slice must match nothing, and no element on the route may
 * carry the copy as its full text. Each row also gains a `retired` field naming the date and the
 * decision, and a row with neither is refused.
 *
 * If Act 2 returns, all five red at once and say to move the row back into `PINS`. That is a
 * one-line edit — the same cost a pin has always carried, in the other direction.
 *
 * ------------------------------------------------------------------------------------------------
 * THE LINE BETWEEN PINNED AND FREE, STATED SO IT CAN BE ARGUED WITH
 * ------------------------------------------------------------------------------------------------
 *
 * **PINNED — a string that names a destination or an action.** `ALL WORK →` is not a sentence about
 * the work; it is the control that goes there. Its wording is part of the site's structure, an edit
 * to it is a navigation change, and a navigation change should be deliberate. These are asserted
 * character for character, and an intentional edit costs one line here.
 *
 * **FREE — prose.** Every `<h1>`, every sub-paragraph, every eyebrow that describes content rather
 * than pointing at a page. *"Things I design and build."* is Akhil's voice and he must be able to
 * change it on a Sunday without a test telling him not to. Nothing here asserts a word of it, and
 * that is the decision rather than an oversight — the full list is in this file's FREE section
 * below, with a reason for each, so "unguarded" is a recorded state and not a gap.
 *
 * **DERIVED — CMS content.** Home's title, subtitle and intro live in `data/home_config.json`,
 * which is content Akhil edits through `/admin`. Pinning them would red the build the day he
 * changes his own subtitle. They are asserted **against the file**, never against a literal: the
 * page must render exactly what the record says. Editing the record moves both sides together; the
 * string *disappearing* is still red. That is derivation, not pinning, and the distinction is the
 * whole reason those three are in a different section of this file.
 *
 * ------------------------------------------------------------------------------------------------
 * CHARACTER FOR CHARACTER, AND WHY THAT IS NOT PEDANTRY HERE
 * ------------------------------------------------------------------------------------------------
 *
 * **Astro drops the whitespace between two adjacent expressions** inside a framework component's
 * children. Written `{count} {noun}`, the category routes shipped `14photographs` — on all seven of
 * them, through a green build and 59 green assertions in `test/public/photography-routes.node.test.ts`.
 * It was found by an unrelated control, not by a test. A `toContain` would have passed. Only an
 * exact string catches it, which is why every assertion below is `toBe` over a decoded, tag-stripped
 * slice and never a substring check.
 *
 * The arrows are part of the copy and are asserted: `→` U+2192, `↓` U+2193, `←` U+2190. §13.2 puts
 * them inside the backticks for these rows, which is what distinguishes them from the table's own
 * `→ \`link text\`` marker — a reading `PhotoEmpty.tsx` records at length.
 *
 * ------------------------------------------------------------------------------------------------
 * WHAT IS ASSERTED ELSEWHERE, AND IS NOT DUPLICATED HERE
 * ------------------------------------------------------------------------------------------------
 *
 * A second copy of an assertion is a second thing to update, and the two disagree eventually.
 *
 *   the scroll cue                   RETIRED. `test/public/home.node.test.ts` now asserts its
 *                                     ABSENCE. The string was `SCROLL FOR THE WORK ↓` (05-16),
 *                                     then `↓ DEVELOPMENT` (05-17, the handoff's wording, arrow
 *                                     leading), then nothing — Home became one screen on
 *                                     2026-09-02 and there is nothing below to point at.
 *   `Photography →` `Development →`   `test/public/home.node.test.ts` — Act 1's two doors, the
 *                                     controls that REPLACED the cue and Act 2's band CTAs. They
 *                                     are navigational by any reading of the line below, and they
 *                                     are asserted there rather than duplicated into PINS because
 *                                     that file already owns the composition they sit in.
 *   `see the photographs →`          RETIRED 2026-09-04 — `development.node.test.ts` now asserts its
 *                                     ABSENCE, and `photography-routes.node.test.ts` asserts the
 *                                     same from the other side
 *   `← see the work`                 RETIRED — `photography-routes.node.test.ts` asserts its absence.
 *                                     §13.2's pair is gone in both directions; the bar carries them
 *   `← All photographs` · `← {Cat}`  `test/public/photo-detail.node.test.ts`
 *   `All · n` and `{Label} · n`      `test/public/photography-routes.node.test.ts`, derived
 *   the three 404 lines              `test/public/seo.node.test.ts`
 *   the empty-category copy          `test/public/photo-empty.unit.test.ts` — it CANNOT be asserted
 *                                    from here: `validateContentSet`'s RI-2 refuses a declared
 *                                    category no photograph uses, so no build can reach the branch
 *                                    and no route serves it. `PhotoEmpty.tsx` is a `.tsx` precisely
 *                                    so a test can render it, and until now none did.
 *
 * Evidence is written with `process.stdout.write`. MEASURED by 04-01: under this repository's
 * vitest setup `console.log` prints NOTHING, so a check reporting through it is indistinguishable
 * from a check that found nothing.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { NAV_ITEMS } from '../../src/components/public/PublicNav';
import type { HomeConfig } from '../../src/schemas';

const previewBaseUrl = inject('previewBaseUrl');
const say = (line: string) => process.stdout.write(`${line}\n`);

const home = JSON.parse(
  readFileSync(new URL('../../data/home_config.json', import.meta.url), 'utf8')
) as HomeConfig;

/**
 * ONE pass of entity decoding, which is what an HTML parser does. A second pass would turn a
 * double-encoded `&amp;amp;` back into `&` and hide the exact defect an exact comparison exists to
 * catch.
 */
function decodeEntitiesOnce(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X'))
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    };
    return named[body] ?? whole;
  });
}

/** The text a reader sees inside a slice of markup: tags removed, entities decoded once. */
const text = (markup: string): string =>
  decodeEntitiesOnce(markup.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

const pages = new Map<string, string>();

async function load(path: string): Promise<string> {
  const cached = pages.get(path);
  if (cached !== undefined) return cached;
  const response = await fetch(`${previewBaseUrl}${path}`);
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`copy-contract: ${path} answered ${response.status}, not 200.`);
  }
  pages.set(path, body);
  return body;
}

/**
 * ONE pinned string.
 *
 * `slice` is a regular expression with ONE capture group: the markup the copy lives inside. It is
 * scoped rather than page-wide on purpose — 05-10 measured a page-wide `/<li/g` count on this site
 * that also matched `<link`, and a page-wide search for `The work` would be satisfied by the phrase
 * appearing anywhere, including inside a comment or a `<title>`.
 */
type Pin = {
  readonly what: string;
  readonly route: string;
  readonly slice: RegExp;
  readonly copy: string;
  readonly why: string;
};

/*
 * ══ THE PINNED STRINGS ═══════════════════════════════════════════════════════════════════════════
 *
 * Every one names a destination or an action. To change any of them: change the page and change
 * the `copy` here, in the same commit. That is the cost, and it is the point.
 */
const PINS: readonly Pin[] = [
  {
    what: '§13.2 Primary CTA — Résumé',
    route: '/resume',
    slice: /<a[^>]*href="\/resume\.pdf"[^>]*>([\s\S]*?)<\/a>/,
    copy: 'Download the PDF',
    why:
      'the action the roadmap amendment put on this page rather than in the nav, "for the ' +
      'recruiter who wants the file"',
  },
];

/*
 * ══ THE RETIRED PINS — FIVE STRINGS WHOSE ELEMENT NO LONGER EXISTS ═══════════════════════════════
 *
 * 🔴 THESE ARE NOT DELETED, AND THE DECISION IS THE WHOLE POINT OF THE MECHANISM BELOW.
 *
 * Home became ONE SCREEN on 2026-09-02 — Akhil. Act 2 went with it: the development band, the
 * résumé band, the project grid, the `By day —` line. All five of the strings below lived in Act 2,
 * so all five reddened, with the same message: *"nothing matched … the element carrying this copy is
 * gone, and a string assertion over a missing element is not an assertion"*. That message is
 * correct, and it is exactly why the rows cannot simply be dropped.
 *
 * WHY NOT DELETE THEM.
 *
 *   1. THIS FILE EXISTS BECAUSE THREE OF §13.2's TEN ROWS HAD NO ASSERTION ANYWHERE. 1,488 tests
 *      passed over a site whose navigation could be rewritten silently. Deleting a row returns it
 *      to exactly that state — unguarded, and with nothing recording that it ever was guarded. The
 *      finding was never "a string was wrong"; it was "nobody could tell which strings were
 *      guarded".
 *   2. THE COPY IS A DECISION WITH A HISTORY. `ALL DEVELOPMENT →` was `ALL WORK →` until the route
 *      was renamed; `RÉSUMÉ →` carries its accent and its arrow deliberately; `Development` and
 *      `The résumé` were the ACCESSIBLE NAMES of two regions. If Act 2 returns, these are the
 *      strings it must return with, and re-deriving them from a git log is not the same as reading
 *      them here.
 *   3. THE ELEMENT MIGHT COME BACK WITHOUT THE COPY. `HomeActTwo.astro` is still on disk — modified
 *      rather than removed in the session that stopped rendering it, which reads as parked. A
 *      restored band carrying different wording is precisely the silent navigation change this file
 *      was written to make expensive.
 *
 * SO EACH ROW IS INVERTED IN PLACE: the slice must match NOTHING, and the copy must appear NOWHERE
 * on the route. If Act 2 is restored, all five red at once and the message says to move the row back
 * into `PINS` — which is a one-line edit and the same cost a pin has always carried.
 */
type RetiredPin = Pin & {
  /** When it was retired and by whose decision — so a row is never silently un-pinned. */
  readonly retired: string;
};

const RETIRED_PINS: readonly RetiredPin[] = [
  {
    what: '§13.2 Secondary CTA — Home Act 2, the work band',
    route: '/',
    slice: /<a class="hm-more" href="\/development">([\s\S]*?)<\/a>/,
    copy: 'ALL DEVELOPMENT →',
    why: 'the control that leaves Home for the complete project list',
    retired: '2026-09-02 — Akhil: Home is one screen. Act 2, and this band with it, is gone.',
  },
  {
    what: '§13.2 Secondary CTA — Home Act 2, the résumé band',
    route: '/',
    slice: /<a class="hm-more" href="\/resume">([\s\S]*?)<\/a>/,
    copy: 'RÉSUMÉ →',
    why: 'the same control for the other destination; the accent and the arrow are both copy',
    retired:
      '2026-09-02 — with Act 2. NOTE: this was the ONLY route to /resume from Home, and the ' +
      'nav has carried no `résumé` item since 2026-08-30 either. /resume is now reachable from ' +
      'Home only by way of /development. Recorded, not fixed — it is a navigation decision.',
  },
  {
    what: '§13.2 Secondary CTA — Home Act 2, the résumé band’s second link',
    route: '/',
    slice: /<a class="hm-resume-cta" href="\/resume">([\s\S]*?)<\/a>/,
    copy: 'View résumé',
    why: 'the second route to the same page, and the only one below the fold of Act 2',
    retired: '2026-09-02 — with Act 2.',
  },
  {
    what: '§6.4 Act-2 band heading — the work',
    route: '/',
    slice: /<h2[^>]*id="hm-work-h"[^>]*>([\s\S]*?)<\/h2>/,
    copy: 'Development',
    why:
      'it named the band a reader was sent to by the scroll cue, and was the accessible name of ' +
      'the region (`aria-labelledby="hm-work-h"`), so it was structure and not description',
    retired:
      '2026-09-02 — with Act 2. The cue that pointed at it went in the same change; ' +
      'test/public/home.node.test.ts asserts both absences and the landmark count that fell ' +
      'from three to one.',
  },
  {
    what: '§6.4 Act-2 band heading — the résumé',
    route: '/',
    slice: /<h2[^>]*id="hm-resume-h"[^>]*>([\s\S]*?)<\/h2>/,
    copy: 'The résumé',
    why: 'the same, for the second of Act 2’s two named regions',
    retired: '2026-09-02 — with Act 2.',
  },
];

/*
 * ══ WHAT IS DELIBERATELY LEFT FREE, AND WHY ═════════════════════════════════════════════════════
 *
 * Recorded as PROSE and not as data, because a list of free strings held in a variable invites the
 * next person to loop over it and assert something — at which point they are pinned, and the
 * decision is reversed by accident.
 *
 *   `/development`   <h1>        "Things I design and build."   — Akhil’s voice, reviewed copy, his to change
 *   `/development`   sub-para    "Products shipped on my own …" — the same
 *   `/development`   eyebrows    "Professional experience", "Projects"
 *                                                        — they label content; they are not links
 *   `/development`   count line  "five — shipped on my own"     — DERIVED and already asserted by
 *                                                          work.node.test.ts against projects.json
 *   `/photography` <h1>        "Photographs"                  — describes the page, does not navigate
 *   `/photography` eyebrow     "40 photographs — all of them" — the COUNT is derived and asserted by
 *                                                          photos-routes.node.test.ts; the WORDING
 *                                                          is prose and stays free
 *   `/resume` eyebrows    "Experience", "Skills", "Education"
 *                                                        — content section labels
 *   Home      by-day line "By day — {role} at {company}." — GONE with Act 2 on 2026-09-02. It was
 *                                                          free, so nothing here reddened; recorded
 *                                                          so the list does not describe a page
 *                                                          that no longer exists.
 *   Home      résumé line "{n} roles and {m} projects."   — GONE with Act 2. It was derived, and
 *                                                          05-11 measured that string equality
 *                                                          cannot prove derivation, so it was never
 *                                                          asserted as a string anywhere.
 *
 * The `<h1>`s are the specific case 05-09 and 05-10 raised, and the answer is: still free, on
 * purpose, now written down.
 */

let navMarkup = '';

describe('§13.2 — the navigational strings, character for character on the served bytes', () => {
  it.each(PINS.map((pin) => [pin.what, pin] as const))('%s', async (_name, pin) => {
    const page = await load(pin.route);

    const found = page.match(pin.slice);
    expect(
      found,
      `${pin.route}: nothing matched ${pin.slice} — the element carrying this copy is gone, and a ` +
        'string assertion over a missing element is not an assertion'
    ).not.toBeNull();

    // The whole point. `toBe`, never `toContain`: `14photographs` passed a substring check on
    // seven routes for two plans.
    expect(text((found as RegExpMatchArray)[1] as string)).toBe(pin.copy);
  });

  it('reports what it pinned, derived from the table rather than typed', async () => {
    // ANTI-VACUITY: an empty table would make `it.each` register zero cases and the file would be
    // reported green having asserted nothing at all. Five rows moved to RETIRED_PINS on
    // 2026-09-02, so this dropped from six to one and the floor is what caught that it is still
    // non-zero rather than that it is still six.
    expect(PINS.length, 'the pin table is empty — this file would assert nothing').toBeGreaterThan(
      0
    );
    for (const pin of PINS) {
      expect(pin.copy.length, `${pin.what} pins the empty string`).toBeGreaterThan(0);
      expect(pin.why.length, `${pin.what} carries no reason`).toBeGreaterThan(20);
    }
    say(`copy contract: ${PINS.length} pinned string(s)`);
    for (const pin of PINS) say(`  ${pin.route.padEnd(8)} ${JSON.stringify(pin.copy)}`);
  });
});

describe('§13.2 — the retired strings, asserted as absences on the same served bytes', () => {
  it.each(RETIRED_PINS.map((pin) => [pin.what, pin] as const))(
    'RETIRED · %s',
    async (_name, pin) => {
      const page = await load(pin.route);

      /*
       * ANTI-VACUITY FIRST, AND IT IS NOT OPTIONAL HERE. Every assertion in this block is an
       * ABSENCE, and an absence over a page that failed to load passes silently. `load` already
       * throws on a non-200, so the page is real — but "real" is not "the page we mean", so this
       * anchors on Home's `<h1>` marker, which is the one element `src/middleware.ts` and two other
       * suites also treat as proof that `GET /` rendered.
       */
      if (pin.route === '/') {
        expect(
          page,
          'the served Home document has no <h1> marker — nothing below is a claim'
        ).toMatch(/<h1[^>]*data-home-marker="home-render-ok"/);
      }

      // 1. THE ELEMENT IS GONE. The inverse of the pinned block's `.not.toBeNull()`.
      expect(
        page.match(pin.slice),
        `${pin.route}: ${pin.slice} MATCHED. This copy was retired — ${pin.retired} — so its ` +
          'element is back. If that is deliberate, move this row from RETIRED_PINS into PINS: it ' +
          'is a navigational string again and it must be asserted character for character.'
      ).toBeNull();

      /*
       * 2. AND NO ELEMENT ANYWHERE ON THE ROUTE HAS THAT COPY AS ITS TEXT. (1) is scoped to one
       *    selector, so a band REBUILT WITH DIFFERENT MARKUP around the same words slips past it —
       *    which is the more likely regression than the exact old markup returning.
       *
       *    IT IS A LEAF-TEXT EQUALITY, NOT `page.includes(copy)`, AND THAT IS A CORRECTNESS FIX
       *    RATHER THAN A REFINEMENT. `Development` is one of the retired strings AND a substring of
       *    the live door `Development →`, so a substring search over the document would red on
       *    correct code — the same class of error as the `14photographs` false pass this file was
       *    written for, in the opposite direction.
       *
       *    Comparison is through `text()`, so it survives Astro's whitespace and one pass of entity
       *    decoding: `RÉSUMÉ →` and `ALL DEVELOPMENT →` carry an accent and a U+2192 that are copy.
       */
      const leaves = [...page.matchAll(/>([^<>]+)</g)].map((m) => text(m[1] as string));
      /*
       * ANTI-VACUITY: a document whose leaf text did not parse would satisfy the check below for
       * every row at once. Anchored on the two DOORS rather than on a count — they are the copy
       * that REPLACED Act 2's bands, they are extracted by the same `leaves` expression the
       * absence check uses, and if either is missing the instrument is broken rather than the page.
       */
      if (pin.route === '/') {
        expect(
          leaves.filter((leaf) => leaf === 'Photography →' || leaf === 'Development →'),
          'the leaf-text extractor found neither door — it is the same expression the absence ' +
            'check below reads, so every retired row would pass on nothing'
        ).toEqual(['Photography →', 'Development →']);
      }
      expect(
        leaves.filter((leaf) => leaf === pin.copy),
        `${pin.route}: an element still carries the retired copy ${JSON.stringify(pin.copy)} as ` +
          'its full text, even though the element this row named is gone — so the band was ' +
          'rebuilt with new markup around the old words. Move the row back into PINS with a ' +
          'slice that matches the new markup.'
      ).toEqual([]);
    }
  );

  it('reports what it retired, and refuses a row with no date and no reason', () => {
    /*
     * ANTI-VACUITY for the table itself: `it.each([])` registers ZERO cases and reports the file
     * green. That is the exact failure this file's header records for its first commit — a
     * derivation check wearing a pin's description — so the retired table gets the same floor the
     * live one has.
     */
    expect(
      RETIRED_PINS.length,
      'the retired table is empty. Rows are RETIRED here, never deleted — see the block comment.'
    ).toBeGreaterThan(0);

    for (const pin of RETIRED_PINS) {
      expect(pin.copy.length, `${pin.what} retires the empty string`).toBeGreaterThan(0);
      expect(pin.why.length, `${pin.what} carries no reason`).toBeGreaterThan(20);
      // The date-and-decision half. A retirement with no attribution is indistinguishable from
      // someone deleting an assertion they could not make pass.
      expect(
        pin.retired.length,
        `${pin.what} was retired with no date and no decision recorded`
      ).toBeGreaterThan(20);
      expect(pin.retired, `${pin.what} names no date`).toMatch(/\d{4}-\d{2}-\d{2}/);
    }

    // No string may be in both tables — that would assert its presence and its absence at once.
    const live = new Set(PINS.map((pin) => `${pin.route} ${pin.copy}`));
    for (const pin of RETIRED_PINS) {
      expect(
        live.has(`${pin.route} ${pin.copy}`),
        `${JSON.stringify(pin.copy)} on ${pin.route} is in PINS and RETIRED_PINS at once`
      ).toBe(false);
    }

    say(`copy contract: ${RETIRED_PINS.length} retired string(s), asserted absent`);
    for (const pin of RETIRED_PINS) say(`  ${pin.route.padEnd(8)} ${JSON.stringify(pin.copy)}`);
  });
});

/*
 * ══ THE APPBAR'S THREE NAV LABELS ═══════════════════════════════════════════════════════════════
 *
 * The most navigational strings on the site: they are the site's top-level map, on all fifty-two
 * documents. §13.2 does not have a row for them — its table is about page copy — and Akhil's
 * instruction was "any equivalent navigational string you find", which these plainly are.
 *
 * 🔴 THE FIRST VERSION OF THIS BLOCK COULD NOT FAIL, AND A PLANT CAUGHT IT.
 *
 * It imported `NAV_ITEMS` from the component and asserted the served bar matched it, with a comment
 * congratulating itself for not keeping a second list. Planted with `photographs` shortened to
 * `photos` — the exact edit `05-AUDIT.md`'s decision 2 contemplates — it reported **10 passed**.
 * Of course it did: both sides of the comparison came from the same edited constant. It was a
 * derivation check wearing a pin's description, which is the failure this whole file exists to fix,
 * reproduced inside the fix.
 *
 * So the labels are a LITERAL here, and both halves are asserted separately:
 *
 *   1. `NAV_ITEMS` — the source constant — equals this table. A relabel in the component reds.
 *   2. the SERVED bar's anchors equal this table. A relabel that arrives any other way reds too.
 *
 * Neither implies the other, and only (2) is a fact about what ships.
 *
 * 🔴 AND IT HAS A LIVE INTERACTION WORTH KNOWING ABOUT. D-21 measures the bar overflowing 344px by
 * 14px on every route, and decision 2 names the only consumer-side lever: shortening `photographs`
 * — 94px of the 310px group — to `photos`, which measured under 344. That edit is now two lines
 * instead of one: the component, and this table. That is what a pin costs and it is the point.
 */
const NAV_CONTRACT: ReadonlyArray<{ readonly href: string; readonly label: string }> = [
  { href: '/development', label: 'development' },
  { href: '/photography', label: 'photography' },
];

describe('the AppBar’s nav labels — the most navigational strings on the site', () => {
  it('pins the source constant: NAV_ITEMS is exactly the contract, in order', () => {
    expect(NAV_CONTRACT.length, 'the nav contract is empty').toBeGreaterThan(0);
    // Structural equality over the whole array, so a reorder, an addition and a relabel are all
    // red.
    //
    // THE COUNT IS TWO, not the three OQ-6b resolved. Akhil cut `résumé` on 2026-08-30, with the
    // hero's Resume button, so the CV is reached from Act 2's `RÉSUMÉ →` link instead. The
    // approved design carries two and says why: "No résumé button on home hero; résumé linked
    // from Act-2 strip." OQ-6b's three was the rebuild's addition, not the design's.
    expect(NAV_ITEMS.map((item) => ({ href: item.href, label: item.label }))).toEqual([
      ...NAV_CONTRACT,
    ]);
  });

  /**
   * 05-17 — THIS READS `/development`, NOT `/`, AND THE CHANGE IS THE FINDING RATHER THAN A REPAIR.
   *
   * Home no longer has an AppBar. Akhil: *"the header is not required for such a page"*, and the
   * approved prototype has none — the row there is two `Link`s and an `IconButton` composed
   * directly on the page background (see `src/components/public/PublicNav.tsx`).
   *
   * `/development` is now the representative route for the BAR arrangement, and it is a better subject
   * for this assertion than `/` ever was: the bar is site-wide furniture on 51 documents and Home
   * was always the one route with an exception in it (the wordmark, suppressed by 05-16). Pinning
   * navigational copy to the page that opts out of the navigation was a latent trap.
   *
   * The PLAIN arrangement's three labels are asserted from the same `NAV_CONTRACT` in
   * `test/public/home.node.test.ts`, so neither arrangement can drift from the contract or from
   * the other.
   */
  it('pins the served bar: the same labels, hrefs and order, in the shipped bytes', async () => {
    const page = await load('/development');
    const bar = page.match(/<header class="ds-atom-appbar"[\s\S]*?<\/header>/);
    expect(bar, 'no .ds-atom-appbar in the served /development document').not.toBeNull();
    navMarkup = (bar as RegExpMatchArray)[0];

    const anchors = [...navMarkup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
      href: /href="([^"]*)"/.exec(m[1] as string)?.[1] ?? '',
      label: text(m[2] as string),
    }));

    // The logo is an anchor too and is not a nav item — it is asserted separately below, as CMS
    // content. Filtering by the CONTRACT's hrefs (not by NAV_ITEMS') keeps the two claims apart
    // without reintroducing the dependency that made this block unfailable.
    const nav = anchors.filter((a) => NAV_CONTRACT.some((item) => item.href === a.href));
    expect(nav).toEqual([...NAV_CONTRACT]);

    say(`nav: ${nav.map((a) => `${JSON.stringify(a.label)} → ${a.href}`).join(' · ')}`);
  });
});

describe('Home’s three CMS strings — DERIVED from home_config.json, never pinned', () => {
  /*
   * These are the strings Akhil edits through `/admin`, and §13.2 does not list them for exactly
   * that reason. What is asserted is that the page renders WHAT THE RECORD SAYS — so editing the
   * record is free and both sides move together, while the string vanishing, or the page rendering
   * a hardcoded copy of it, is red.
   *
   * That second failure is not hypothetical on this project: `05-UI-SPEC.md` §13.3 records a
   * component count that went stale three times in nine days because a derived figure had been
   * typed out somewhere, and 04-09 turned `main` red with a literal `39`.
   */
  it('renders the title, the subtitle and the intro exactly as data/home_config.json holds them', async () => {
    const page = await load('/');

    /*
     * The slices are the elements as they actually SHIP, read off `dist/client/index.html` rather
     * than guessed from the source: the `<h1>` carries no `hm-*` class at all — it is the design
     * system's `Heading` plus `data-home-marker` — and the intro is `class="ds-atom-text hm-intro"`,
     * so an `class="hm-intro"` equality would have matched nothing and this test would have failed
     * on correct code. `\b…\b` around the class, so the inline `<style>` block's own `hm-intro{…}`
     * cannot satisfy it either.
     *
     * 🔴 THE SUBTITLE'S SLICE WAS `class="hm-subtitle"` — AN EQUALITY — AND 05-16 HAD TO WIDEN IT.
     * That is a change to the SLICE and not to the ASSERTION, and the distinction is the whole
     * point of this file: the string is still compared with `toBe` against the record. The subtitle
     * used to be a hand-written `<p>`, which is why an equality worked; it is now a design-system
     * `Text` — the Core Value, on the one Act-1 line that was still bypassing the design system —
     * and `Text` prepends `ds-atom-text` to every `className` it is given. Left as an equality this
     * test would have failed on correct code, exactly as it would have for the intro. It is now the
     * same shape as the intro's, which is the shape a `className`-concatenating component needs.
     */
    const fields: ReadonlyArray<[string, string, RegExp]> = [
      ['title', home.title, /<h1[^>]*data-home-marker="[^"]*"[^>]*>([\s\S]*?)<\/h1>/],
      ['subtitle', home.subtitle, /<p[^>]*class="[^"]*\bhm-subtitle\b[^"]*"[^>]*>([\s\S]*?)<\/p>/],
      ['intro', home.intro, /<p[^>]*class="[^"]*\bhm-intro\b[^"]*"[^>]*>([\s\S]*?)<\/p>/],
    ];

    /*
     * 🔴 THE ANTI-VACUITY FLOOR BECAME A CONDITIONAL ON 2026-09-02, AND THE DISTINCTION MATTERS.
     *
     * This loop asserted `expected.length > 0` for all three fields — a real floor, and the right
     * one: "the page renders what the record says" is satisfied trivially by an emptied record and
     * a blank page, so a derivation check MUST refuse to compare against `''`.
     *
     * Then Akhil emptied `intro`. From `src/schemas/home.ts`: the phrase "everything else"
     * subordinated the photography to the development, while Act 1 IS six photographs filling the
     * screen — the words and the picture led with different things, and `Interfaces & Imagery`
     * already names both as equals. The FIELD stays (no `.min(1)`, deliberately) so he can restore
     * the line from `/admin` without a schema change.
     *
     * SO THE FLOOR IS NOW PER-FIELD, DERIVED FROM THE SCHEMA RATHER THAN ASSUMED:
     *
     *   title, subtitle   `.min(1)` in `HomeConfigSchema` — the build refuses an empty one, so the
     *                     floor is real and stays. Emptying either is caught by the schema, not
     *                     here, which is where it belongs.
     *   intro             no `.min(1)`. Both directions are asserted instead: an empty record must
     *                     render NO ELEMENT — an empty `<p>` still takes its
     *                     `padding-block-start`, so the gap under the subtitle would be wrong with
     *                     nothing visible to explain it — and a filled record must render exactly
     *                     what it holds.
     *
     * This is the same shape `test/public/home.node.test.ts` uses for the other emptied field
     * (`renders exactly the CTAs data/home_config.json declares`), and for the same reason: an
     * assertion that simply stopped mentioning the intro would let a restored line ship in the
     * wrong face at the wrong size with the suite green.
     */
    const OPTIONAL = new Set(['intro']);

    for (const [name, expected, slice] of fields) {
      const found = page.match(slice);

      if (OPTIONAL.has(name) && expected.length === 0) {
        expect(
          found,
          `home_config.${name} is empty and Home still renders an element for it. An empty <p> ` +
            'takes its padding-block-start, so the spacing is wrong with nothing on screen to ' +
            'explain why — see the guard in src/pages/index.astro.'
        ).toBeNull();
        continue;
      }

      // ANTI-VACUITY, per field: for everything not in OPTIONAL the record must be non-empty, or
      // a comparison against `''` would pass over a blank page. `HomeConfigSchema` requires these.
      expect(
        expected.length,
        `home_config.json's ${name} is empty. It is not in OPTIONAL, so HomeConfigSchema requires ` +
          'it — if that changed, change both together.'
      ).toBeGreaterThan(0);
      expect(found, `Home renders no element matching ${slice} for ${name}`).not.toBeNull();
      expect(text((found as RegExpMatchArray)[1] as string)).toBe(expected);
    }

    say(
      `home_config: title ${JSON.stringify(home.title)} · subtitle ${JSON.stringify(home.subtitle)} · intro ${JSON.stringify(home.intro)}${
        home.intro.length === 0 ? ' (empty — asserted ABSENT from the page)' : ''
      } — all derived`
    );
  });

  /*
   * ══ THE WORDMARK — ABSENT ON HOME, PRESENT EVERYWHERE ELSE, AND BOTH HALVES ARE PINNED ═══════
   *
   * This test used to assert the logo on `/` alone. 05-16 suppressed the wordmark on Home and only
   * on Home, and both halves of that decision are now asserted, because an absence nobody checks
   * is indistinguishable from a regression:
   *
   *   - the DESIGN SOURCE. `Work.dc.html:24` and `Photos.dc.html:24` both carry
   *     `<a href="…Home…">akhil saxena</a>`; `Akhil Saxena - Home.dc.html` carries none. Three
   *     files, consistent, and the reason is that Home's `<h1>` IS the wordmark at 60px.
   *   - the MEASUREMENT. At 344 and 390 on a fine pointer the wordmark wraps to two lines and the
   *     bar paints 67px against `--ds-appbar-h`'s declared 57 — the one case the design system's
   *     own docstring says the property cannot promise.
   *
   * `/development` is the positive half, and it is what keeps this from being a test that passes because
   * the wordmark was deleted site-wide. `PublicNav.tsx` records the full reasoning.
   */
  /**
   * 05-16 suppressed the WORDMARK on Home. 05-17 removed the BAR that carried it, so the absence
   * this test guards is now structural rather than conditional — and it is asserted more strongly
   * because of it, not less.
   *
   * The D-23 anti-vacuity half is kept and is still the half that matters. `AppBar` renders its own
   * ink box captioned "DS" when `logo` is nullish (`logo ?? <DefaultLogo />`, MEASURED,
   * `chunk-Q7KBVLX4.js:77`), so "no wordmark" and "someone else's placeholder" look identical to
   * any assertion that only checks for `pub-logo`. If a future plan puts a bar back on Home, this
   * catches the placeholder on the way in.
   */
  it('renders NO bar and NO wordmark on Home — the <h1> is the wordmark there (05-16, 05-17)', async () => {
    const page = await load('/');
    expect(
      page.match(/ds-atom-appbar/),
      'an AppBar is back on Home. The approved design has no bar on this route — see ' +
        'src/components/public/PublicNav.tsx.'
    ).toBeNull();
    expect(
      page.match(/\bpub-logo\b/),
      'Home ships a wordmark; the design handoff suppresses it on this route alone'
    ).toBeNull();
    expect(page.includes('>DS<'), 'the DefaultLogo placeholder shipped').toBe(false);

    // ANTI-VACUITY: the two absences above are claims about a page that really rendered, and the
    // bar-bearing routes really do still have one — so this is not passing because `load` is broken.
    expect(page, 'the served Home document has no <h1> at all').toMatch(/<h1[^>]*data-home-marker/);
    expect(
      await load('/development'),
      '/development lost its AppBar too — this is not a Home-only change'
    ).toMatch(/ds-atom-appbar/);
  });

  it('renders the site title in the AppBar logo on every other route, from the same record', async () => {
    const page = await load('/development');
    const bar = (page.match(/<header class="ds-atom-appbar"[\s\S]*?<\/header>/) ?? [''])[0];
    const logo = (bar as string).match(/<a[^>]*class="[^"]*pub-logo[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    expect(logo, 'no .pub-logo anchor in /development’s served AppBar').not.toBeNull();
    expect(text((logo as RegExpMatchArray)[1] as string)).toBe(home.title);
    expect(
      /href="\/"/.test((logo as RegExpMatchArray)[0] as string),
      'the wordmark points home'
    ).toBe(true);
  });
});
