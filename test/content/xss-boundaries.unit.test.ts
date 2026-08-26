/**
 * Criterion 3, both halves, one payload (plan 03-07, requirement CONT-03).
 *
 * The criterion reads: *"A résumé bullet containing a script tag is stripped at both the write
 * boundary and the render boundary, verified by a test — the legacy stored-XSS class is closed
 * structurally, not by convention."*
 *
 * WHY THE PAYLOAD ARRIVES THROUGH THE RENDERER RATHER THAN THROUGH THE STORE
 * -------------------------------------------------------------------------
 * The stored shape is bold-only markdown, so `<script>` cannot be *expressed* as grammar — 03-02
 * made the emitters incapable of producing an angle bracket, and 03-06 made the schema refuse a
 * string carrying one. A test that stores a script tag and observes it not rendering is therefore
 * testing a case the schema already refuses to admit, and would sit green against a renderer that
 * was wide open. The only question the schema has not already answered is what a renderer does
 * with run text that carries the payload directly — which is exactly what any future code path
 * constructing runs programmatically produces.
 *
 * WHY ONE FIXTURE AND NOT TWO
 * ---------------------------
 * `JOINT_PAYLOAD` below carries a genuine bold run AND a script payload in one string, and both
 * facts are asserted about the SAME rendered output. That is what makes the suite unable to pass
 * for a degenerate renderer:
 *
 *   - a pass-through renderer (the legacy `<li>` fed from a raw HTML string) emits `<script`
 *     literally and fails the escape assertion;
 *   - an escape-everything renderer that treats the whole bullet as one text node emits no
 *     `<strong>` and fails the emphasis assertion;
 *   - a renderer that returns its input, or nothing at all, fails both.
 *
 * Two assertions over two fixtures would let one renderer be right about one and wrong about the
 * other — the same defect this project already found in its keyboard suite, where *"34 tests all
 * focused the first item, so 'the item picked up' and 'the first item' were always the same
 * element."*
 *
 * WHY `renderToStaticMarkup` AND NOT jsdom
 * ----------------------------------------
 * This project's register is explicit that a rendered claim verified in jsdom is not verified.
 * `renderToStaticMarkup` is not a simulation: it is the code path Astro uses to server-render a
 * React island, and it returns a string — which is precisely the artefact every assertion here is
 * about. A jsdom test would additionally be checking jsdom's parser rather than React's escaping.
 *
 * WHAT THIS FILE DOES NOT CLAIM
 * -----------------------------
 * Nothing renders a bullet yet — there is no `/resume` page until Phase 5. This proves
 * `src/components/Bullets.tsx` is safe, not that the site is. The structural half of that gap is
 * `scripts/assert-no-raw-html-sinks.mjs`, which makes the unsafe alternative fail by name.
 */

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Bullets } from '../../src/components/Bullets';
import { parseBullet } from '../../src/lib/bullets';
import { ResumeSchema } from '../../src/schemas';

const read = (relative: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8'));

type ResumeShape = {
  experience: { id: string; bullets: string[] }[];
};

/** The real committed résumé, read once and never mutated. Clones are what get changed. */
const RESUME = read('data/resume.json') as ResumeShape;

/** Every stored bullet, in file order. Measured this session: 13 of them, 17 bold runs. */
const ALL_BULLETS: string[] = RESUME.experience.flatMap((entry) => entry.bullets);

/**
 * The load-bearing fixture. One string, two boundaries.
 *
 * Its runs, per `parseBullet`:
 *   run 0 (plain): "Reduced p95 <script>alert(1)</script> latency by "
 *   run 1 (bold):  "40%"
 *
 * Note that `parseBullet` ACCEPTS it — the emphasis delimiters balance and there is no lone
 * asterisk — which is the whole point. The grammar has no opinion about angle brackets; the
 * schema's `containsHtmlTag` refinement is what refuses it at the write boundary, and React's
 * text-child escaping is what neutralises it at the render boundary. Two independent mechanisms,
 * one string, asserted below in that order.
 */
const JOINT_PAYLOAD = 'Reduced p95 <script>alert(1)</script> latency by **40%**';

/** Render one or more stored bullet strings through the real component and the real server path. */
const render = (items: string[]): string => renderToStaticMarkup(createElement(Bullets, { items }));

const countOf = (haystack: string, needle: string): number => {
  if (needle.length === 0) throw new Error('countOf with an empty needle counts nothing');
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return count;
    count += 1;
    from = at + needle.length;
  }
};

/**
 * The inverse of React's text-child escaping, for the ampersand proof only.
 *
 * It lives HERE and not in the component on purpose: `src/components/Bullets.tsx` contains no
 * escaping code of its own, because a hand-rolled escaper is a second implementation of something
 * React already does correctly and is the classic place to forget an entity. A DEcoder in the test
 * is the opposite risk profile — if it is wrong, the assertion fails, which is the safe direction.
 *
 * Single pass with a map, never sequential `.replace` calls: decoding `&lt;` before `&amp;` is
 * correct and decoding `&amp;` first turns `&amp;lt;` into `<`, which is the bug this proof is
 * looking for.
 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
};
const decodeReactEntities = (html: string): string =>
  html.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity] ?? entity);

describe('the render boundary — runs become elements, never HTML strings', () => {
  it('renders one bold run as exactly one <strong> holding exactly that run text', () => {
    const html = render(['Improved **conversion by 15%** by transforming a one-page checkout']);

    expect(countOf(html, '<strong>')).toBe(1);
    expect(html).toContain('<strong>conversion by 15%</strong>');
    expect(html).toContain('Improved <strong>');
    expect(html).not.toContain('**');
  });

  it('renders a bullet with no bold run as one text node and no <strong> at all', () => {
    // pharmeasy#9, the one bullet in the corpus carrying no markup. Real prose, not a fixture.
    const plain =
      'Delivered a client-side recommendation system leveraging a rule engine to enable product upsell & cross-sell';
    expect(plain.includes('**')).toBe(false);

    const html = render([plain]);

    expect(countOf(html, '<strong>')).toBe(0);
    expect(decodeReactEntities(html)).toBe(`<ul><li>${plain}</li></ul>`);
  });

  it('renders two adjacent bold runs as two separate <strong> elements, not one merged element', () => {
    const source = '**alpha****beta**';
    // The grammar's claim, restated as an assertion so the render claim below is about two runs
    // rather than about whatever the parser happened to produce.
    expect(parseBullet(source)).toEqual([
      { text: 'alpha', bold: true },
      { text: 'beta', bold: true },
    ]);

    const html = render([source]);

    expect(countOf(html, '<strong>')).toBe(2);
    expect(html).toContain('<strong>alpha</strong><strong>beta</strong>');
    expect(html).not.toContain('<strong>alphabeta</strong>');
  });
});

describe('criterion 3 — one payload, both boundaries', () => {
  const html = render([JOINT_PAYLOAD]);

  it('renders a run that is not empty, so every negative assertion below has something to be about', () => {
    // The vacuity guard. `not.toContain('<script')` is satisfied by rendering nothing; this is
    // what stops that from counting as a pass.
    expect(html.length).toBeGreaterThan(JOINT_PAYLOAD.length);
    expect(countOf(html, '<li>')).toBe(1);
    expect(html).toContain('Reduced p95 ');
    expect(html).toContain(' latency by ');
  });

  it('render boundary: the script payload is inert text', () => {
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('</script');
  });

  it('render boundary: the SAME output still carries a real <strong> for the genuine bold run', () => {
    expect(html).toContain('<strong>40%</strong>');
    expect(countOf(html, '<strong>')).toBe(1);
  });

  it('render boundary: nothing survives that a browser would execute', () => {
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
    expect(decodeReactEntities(html)).toContain('<script>alert(1)</script>');
  });

  it('write boundary: ResumeSchema rejects the SAME string as a stored bullet', () => {
    const mutated = structuredClone(RESUME) as ResumeShape;
    mutated.experience[0].bullets[0] = JOINT_PAYLOAD;

    const result = ResumeSchema.safeParse(mutated);

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toContain('experience.0.bullets.0');
    expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain('HTML tag');
  });

  it('write boundary control: the unmutated résumé PASSES, so the rejection is attributable', () => {
    // Without this, the rejection above could be caused by anything else on the record — which is
    // how a schema test proves the fixture wrong rather than proving the rule right.
    expect(ResumeSchema.safeParse(RESUME).success).toBe(true);
  });

  it('the two boundaries disagree about the grammar, and that is the point', () => {
    // parseBullet ACCEPTS the payload — the grammar has no angle-bracket production to violate.
    // So the render assertion above is a real claim about React, not a restatement of the parser.
    expect(() => parseBullet(JOINT_PAYLOAD)).not.toThrow();
    expect(parseBullet(JOINT_PAYLOAD)).toEqual([
      { text: 'Reduced p95 <script>alert(1)</script> latency by ', bold: false },
      { text: '40%', bold: true },
    ]);
  });
});

describe('the whole committed corpus', () => {
  it('holds the 13 bullets and 17 bold runs measured on disk', () => {
    expect(ALL_BULLETS).toHaveLength(13);
    expect(ALL_BULLETS.flatMap(parseBullet).filter((run) => run.bold)).toHaveLength(17);
  });

  it('renders all 13 as 17 <strong> elements with no tag, image or handler surviving', () => {
    const html = render(ALL_BULLETS);

    expect(countOf(html, '<li>')).toBe(13);
    expect(countOf(html, '<strong>')).toBe(17);
    expect(countOf(html, '</strong>')).toBe(17);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('**');
  });

  it('escapes the corpus’s one literal ampersand exactly once, and never twice', () => {
    // Flagged by 03-02: pharmeasy#9 carries `upsell & cross-sell`, the only entity-shaped
    // character in the corpus. `&amp;` IS the correct single escaping of one `&` character —
    // double escaping would be `&amp;amp;`, which is two `&` characters and renders visibly wrong.
    const ampersandBullets = ALL_BULLETS.filter((bullet) => bullet.includes('&'));
    expect(ampersandBullets).toHaveLength(1);
    expect(ampersandBullets[0]).toContain('upsell & cross-sell');

    const html = render(ALL_BULLETS);

    // Exactly one `&` CHARACTER in the entire rendered corpus. A double escape puts two there.
    expect(countOf(html, '&')).toBe(1);
    expect(countOf(html, '&amp;')).toBe(1);
    expect(html).not.toContain('&amp;amp;');
    expect(html).toContain('upsell &amp; cross-sell');
    // And decoding returns exactly the stored text — one `&`, nothing lost, nothing added.
    expect(countOf(decodeReactEntities(html), '&')).toBe(1);
    expect(decodeReactEntities(html)).toContain(ampersandBullets[0]);
  });

  it('renders the en dash as a raw character rather than an entity', () => {
    // brevo#4 carries U+2013. React escapes `"&<>` and nothing else, so a `&ndash;` appearing
    // here would mean something other than React did the encoding.
    const html = render(ALL_BULLETS);
    expect(html).toContain('12–20%');
    expect(html).not.toContain('&ndash;');
  });
});

describe('vacuity', () => {
  it('renders an empty list as an empty list, distinguishably from rendering nothing', () => {
    expect(render([])).toBe('<ul></ul>');
  });
});
