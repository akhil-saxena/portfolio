/**
 * §13.2's contract table, asserted against the SERVED BYTES — the strings a reader navigates by.
 *
 * ================================================================================================
 * WHY THIS FILE EXISTS, AND WHAT IT DELIBERATELY DOES NOT DO
 * ================================================================================================
 *
 * 05-09 and 05-10 both recorded, in passing, that rewriting `/work`'s `<h1>` leaves the entire suite
 * green. 05-15 went looking and MEASURED the whole of it: of §13.2's eleven contract rows, five had
 * no assertion anywhere in `test/` or `scripts/`, and the three Home Act-2 CTAs, `Download the PDF`
 * and the empty-category copy were among them. **1,488 tests passed over a site whose navigation
 * could be rewritten silently.**
 *
 * Akhil's decision was to pin **the structural strings only**. This file is that decision, in one
 * place, because the finding was not "a string was wrong" — it was "nobody could tell which strings
 * were guarded". A reader of this file can tell.
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
 * them, through a green build and 59 green assertions in `test/public/photos-routes.node.test.ts`.
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
 *   `SCROLL FOR THE WORK ↓`          `test/public/home.node.test.ts`
 *   `see the photographs →`          `test/public/work.node.test.ts`
 *   `← see the work`                 `test/public/photos-routes.node.test.ts`
 *   `← All photographs` · `← {Cat}`  `test/public/photo-detail.node.test.ts`
 *   `All · n` and `{Label} · n`      `test/public/photos-routes.node.test.ts`, derived
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
    what: '§13.2 Secondary CTA — Home Act 2, the work band',
    route: '/',
    slice: /<a class="hm-more" href="\/work">([\s\S]*?)<\/a>/,
    copy: 'ALL WORK →',
    why: 'the control that leaves Home for the complete project list',
  },
  {
    what: '§13.2 Secondary CTA — Home Act 2, the résumé band',
    route: '/',
    slice: /<a class="hm-more" href="\/resume">([\s\S]*?)<\/a>/,
    copy: 'RÉSUMÉ →',
    why: 'the same control for the other destination; the accent and the arrow are both copy',
  },
  {
    what: '§13.2 Secondary CTA — Home Act 2, the résumé band’s second link',
    route: '/',
    slice: /<a class="hm-resume-cta" href="\/resume">([\s\S]*?)<\/a>/,
    copy: 'View résumé',
    why: 'the second route to the same page, and the only one below the fold of Act 2',
  },
  {
    what: '§6.4 Act-2 band heading — the work',
    route: '/',
    slice: /<h2[^>]*id="hm-work-h"[^>]*>([\s\S]*?)<\/h2>/,
    copy: 'The work',
    why:
      'it names the band a reader is sent to by `SCROLL FOR THE WORK ↓` and is the accessible ' +
      'name of the region (`aria-labelledby="hm-work-h"`), so it is structure and not description',
  },
  {
    what: '§6.4 Act-2 band heading — the résumé',
    route: '/',
    slice: /<h2[^>]*id="hm-resume-h"[^>]*>([\s\S]*?)<\/h2>/,
    copy: 'The résumé',
    why: 'the same, for the second of Act 2’s two named regions',
  },
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
 * ══ WHAT IS DELIBERATELY LEFT FREE, AND WHY ═════════════════════════════════════════════════════
 *
 * Recorded as PROSE and not as data, because a list of free strings held in a variable invites the
 * next person to loop over it and assert something — at which point they are pinned, and the
 * decision is reversed by accident.
 *
 *   `/work`   <h1>        "Things I design and build."   — Akhil’s voice, reviewed copy, his to change
 *   `/work`   sub-para    "Products shipped on my own …" — the same
 *   `/work`   eyebrows    "Professional experience", "Projects"
 *                                                        — they label content; they are not links
 *   `/work`   count line  "five — shipped on my own"     — DERIVED and already asserted by
 *                                                          work.node.test.ts against projects.json
 *   `/photos` <h1>        "Photographs"                  — describes the page, does not navigate
 *   `/photos` eyebrow     "40 photographs — all of them" — the COUNT is derived and asserted by
 *                                                          photos-routes.node.test.ts; the WORDING
 *                                                          is prose and stays free
 *   `/resume` eyebrows    "Experience", "Skills", "Education"
 *                                                        — content section labels
 *   Home      by-day line "By day — {role} at {company}." — the role and company are DERIVED from
 *                                                          resume.json; the frame is prose
 *   Home      résumé line "{n} roles and {m} projects."   — derived, and 05-11 measured that string
 *                                                          equality cannot prove derivation, so it
 *                                                          is not asserted as a string anywhere
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
    // reported green having asserted nothing at all.
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
  { href: '/work', label: 'work' },
  { href: '/photos', label: 'photographs' },
  { href: '/resume', label: 'résumé' },
];

describe('the AppBar’s three nav labels — the most navigational strings on the site', () => {
  it('pins the source constant: NAV_ITEMS is exactly the contract, in order', () => {
    expect(NAV_CONTRACT.length, 'the nav contract is empty').toBeGreaterThan(0);
    // Structural equality over the whole array, so a reorder, an addition and a relabel are all
    // red. OQ-6b resolved the COUNT at three; the order is the reading order of the site.
    expect(NAV_ITEMS.map((item) => ({ href: item.href, label: item.label }))).toEqual([
      ...NAV_CONTRACT,
    ]);
  });

  it('pins the served bar: the same three labels, hrefs and order, in the shipped bytes', async () => {
    const page = await load('/');
    const bar = page.match(/<header class="ds-atom-appbar"[\s\S]*?<\/header>/);
    expect(bar, 'no .ds-atom-appbar in the served document').not.toBeNull();
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
     */
    const fields: ReadonlyArray<[string, string, RegExp]> = [
      ['title', home.title, /<h1[^>]*data-home-marker="[^"]*"[^>]*>([\s\S]*?)<\/h1>/],
      ['subtitle', home.subtitle, /<p class="hm-subtitle"[^>]*>([\s\S]*?)<\/p>/],
      ['intro', home.intro, /<p[^>]*class="[^"]*\bhm-intro\b[^"]*"[^>]*>([\s\S]*?)<\/p>/],
    ];

    for (const [name, expected, slice] of fields) {
      // ANTI-VACUITY, per field: an emptied record would derive `''` and a comparison against it
      // would pass over a blank page.
      expect(expected.length, `home_config.json's ${name} is empty`).toBeGreaterThan(0);
      const found = page.match(slice);
      expect(found, `Home renders no element matching ${slice} for ${name}`).not.toBeNull();
      expect(text((found as RegExpMatchArray)[1] as string)).toBe(expected);
    }

    say(
      `home_config: title ${JSON.stringify(home.title)} · subtitle ${JSON.stringify(home.subtitle)} · intro ${JSON.stringify(home.intro)} — all derived`
    );
  });

  it('renders the site title in the AppBar logo, from the same record', async () => {
    const page = await load('/');
    const bar =
      navMarkup || (page.match(/<header class="ds-atom-appbar"[\s\S]*?<\/header>/) ?? [''])[0];
    const logo = (bar as string).match(/<a[^>]*class="[^"]*pub-logo[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    expect(logo, 'no .pub-logo anchor in the served AppBar').not.toBeNull();
    expect(text((logo as RegExpMatchArray)[1] as string)).toBe(home.title);
  });
});
