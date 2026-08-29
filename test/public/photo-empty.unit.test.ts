/**
 * §13.2's empty-category copy, pinned — and the test `PhotoEmpty.tsx` was written for.
 *
 * ================================================================================================
 * 🔴 THE COMPONENT'S HEADER PROMISED THIS FILE AND IT DID NOT EXIST
 * ================================================================================================
 *
 * `src/components/public/PhotoEmpty.tsx` opens with "WHY THIS IS A COMPONENT AND NOT FIVE LINES
 * INSIDE THE ROUTE", and the answer it gives is, verbatim: *"Its markup lives in
 * `src/components/public/PhotoEmpty.tsx` so that it can be rendered by a test."* MEASURED
 * 2026-08-29: `grep -rn "PhotoEmpty" test/` returned **nothing**. The component was shaped by a
 * requirement that was then never met — a whole plan's reasoning about how to reach an unreachable
 * branch, ending in no assertion. That is the same defect class as a citation to evidence that does
 * not exist, and it is why this file leads with it rather than mentioning it in passing.
 *
 * ================================================================================================
 * WHY IT CANNOT BE ASSERTED OVER HTTP, WHICH IS THE REST OF THAT REASONING
 * ================================================================================================
 *
 * Both facts are measured and recorded in `src/pages/photos/[category]/index.astro`:
 *
 *   1. **No build can reach this branch.** `validateContentSet`'s RI-2 refuses a declared category
 *      that no photograph uses, and it runs in `astro:config:done` — so `build`, `check` and `sync`
 *      all fail before a page is emitted. There is no URL that serves this state.
 *   2. **No test can render the `.astro` route either.** `test/public/shell.unit.test.ts` measured
 *      that the `unit` project deliberately has no Astro Vite plugin, so importing an `.astro`
 *      component fails in `vite:import-analysis` on the first template expression.
 *
 * A React component with no `client:*` directive is static HTML on the page and an ordinary import
 * here. `renderToStaticMarkup` is the same server path the route takes, and it is already how
 * `test/content/bullets.unit.test.ts` and `xss-boundaries.unit.test.ts` assert rendered output in
 * this repository.
 *
 * ================================================================================================
 * WHAT IS PINNED AND WHAT IS DERIVED
 * ================================================================================================
 *
 * The two sentences are PINNED, character for character — they are the page's only explanation of
 * why a reader is looking at nothing, and §13.2 makes them a contract row. The link text carries a
 * DERIVED count and is asserted against the number passed in, never against a literal: §13.3 says
 * the photograph count comes from the collection and a group-by, and §13.2's own table prints `39`
 * against a manifest that is at 40, which is exactly the drift the rule exists to prevent.
 *
 * **The arrow is not copy here**, and that reading is `PhotoEmpty.tsx`'s, carried rather than
 * re-derived: §13.2 writes this row as `→ \`See all 39\``, with the arrow OUTSIDE the backticks,
 * identically to the 404 row's `→ \`Go to the home page\``. Rows whose arrow IS copy carry it
 * inside — `ALL WORK →`, `SCROLL FOR THE WORK ↓`. So the link's text is `See all {n}` and nothing
 * else, and this file asserts the absence of the arrow so the reading cannot be quietly reversed.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PhotoEmpty } from '../../src/components/public/PhotoEmpty';

const say = (line: string) => process.stdout.write(`${line}\n`);

/** §13.2, verbatim. `{Category}` is the category's own label from `data/site_config.json`. */
const HEADING = (label: string) => `No photographs in ${label} yet.`;
const EXPLANATION = 'Every category on this site has at least one today; this one is new.';

/** One pass of entity decoding, which is what an HTML parser does. See the sibling suites. */
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
      '#x27': "'",
    };
    return named[body] ?? whole;
  });
}

const text = (markup: string): string =>
  decodeEntitiesOnce(markup.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A label and a total that are NOT the fixture's, on purpose. Using `Portraits` and `40` would let
 * a component that ignored its props and hardcoded today's data pass every assertion below.
 */
const LABEL = 'Kites';
const TOTAL = 137;

const html = renderToStaticMarkup(PhotoEmpty({ label: LABEL, total: TOTAL }));

describe('§13.2 — the empty-category state, rendered', () => {
  it('renders at all, so nothing below is asserted over an empty string', () => {
    expect(html.length, 'PhotoEmpty rendered nothing').toBeGreaterThan(40);
    expect(html).toContain('class="ph-empty"');
    say(`photo-empty: ${html.length} bytes of markup`);
  });

  it('carries §13.2’s heading, character for character, with the label interpolated', () => {
    const heading = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    expect(heading, 'no <h2> in the rendered empty state').not.toBeNull();
    // `toBe`, never `toContain`. Astro drops the space between two adjacent expressions and this
    // component's heading is exactly that shape — `No photographs in {label} yet.` — which shipped
    // as `14photographs` on seven category routes when it was written the other way in the route.
    expect(text((heading as RegExpMatchArray)[1] as string)).toBe(HEADING(LABEL));
  });

  it('carries §13.2’s explanation, character for character', () => {
    // `<p>`, not `<span>`: MEASURED against the installed 2.0.0-beta.1, `Text` renders a `<p>` for
    // `variant="small"` where `photos.css`'s lightbox-caption rule reaches a `<span class=
    // "ds-atom-text">` for the default body variant. The first draft of this line assumed the span
    // and failed on correct code, which is the failure direction to prefer but is still a defect.
    const body = html.match(/<p[^>]*class="[^"]*ds-atom-text[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    expect(body, 'no design-system Text element in the rendered empty state').not.toBeNull();
    expect(text((body as RegExpMatchArray)[1] as string)).toBe(EXPLANATION);
  });

  it('offers `See all {n}` with the count DERIVED from the prop, and no arrow in the text', () => {
    const link = html.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/);
    expect(link, 'no anchor in the rendered empty state').not.toBeNull();

    const attrs = (link as RegExpMatchArray)[1] as string;
    expect(/href="([^"]*)"/.exec(attrs)?.[1]).toBe('/photos');

    const label = text((link as RegExpMatchArray)[2] as string);
    // Derived from the prop, so a 41st photograph changes the page and not this file.
    expect(label).toBe(`See all ${TOTAL}`);

    // §13.2's `→` is the table's "then a link" marker for this row, not copy. Asserted as an
    // ABSENCE so the reading cannot be reversed by someone reading the table the other way.
    expect(label).not.toContain('→');

    say(`photo-empty: ${JSON.stringify(label)} → /photos, count derived from the prop`);
  });

  it('uses the prop rather than a hardcoded category or count', () => {
    // The negative half of the two assertions above, and the reason LABEL/TOTAL are not fixture
    // values: a component that ignored its props entirely could still satisfy an equality against
    // today's data. It cannot satisfy one against a category that does not exist.
    const other = renderToStaticMarkup(PhotoEmpty({ label: 'Bicycles', total: 2 }));
    expect(other).not.toBe(html);
    expect(text(other)).toContain('No photographs in Bicycles yet.');
    expect(text(other)).toContain('See all 2');
    expect(text(other)).not.toContain(LABEL);
    expect(text(other)).not.toContain(String(TOTAL));
  });
});
