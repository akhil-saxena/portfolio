import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PhotoEmpty } from '../../src/components/public/PhotoEmpty';

const say = (line: string) => process.stdout.write(`${line}\n`);

const HEADING = (label: string) => `No photographs in ${label} yet.`;
const EXPLANATION = 'Every category on this site has at least one today; this one is new.';

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
    expect(text((heading as RegExpMatchArray)[1] as string)).toBe(HEADING(LABEL));
  });

  it('carries §13.2’s explanation, character for character', () => {
    const body = html.match(/<p[^>]*class="[^"]*ds-atom-text[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    expect(body, 'no design-system Text element in the rendered empty state').not.toBeNull();
    expect(text((body as RegExpMatchArray)[1] as string)).toBe(EXPLANATION);
  });

  it('offers `See all {n}` with the count DERIVED from the prop, and no arrow in the text', () => {
    const link = html.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/);
    expect(link, 'no anchor in the rendered empty state').not.toBeNull();

    const attrs = (link as RegExpMatchArray)[1] as string;
    expect(/href="([^"]*)"/.exec(attrs)?.[1]).toBe('/photography');

    const label = text((link as RegExpMatchArray)[2] as string);
    expect(label).toBe(`See all ${TOTAL}`);

    expect(label).not.toContain('→');

    say(`photo-empty: ${JSON.stringify(label)} → /photography, count derived from the prop`);
  });

  it('uses the prop rather than a hardcoded category or count', () => {
    const other = renderToStaticMarkup(PhotoEmpty({ label: 'Bicycles', total: 2 }));
    expect(other).not.toBe(html);
    expect(text(other)).toContain('No photographs in Bicycles yet.');
    expect(text(other)).toContain('See all 2');
    expect(text(other)).not.toContain(LABEL);
    expect(text(other)).not.toContain(String(TOTAL));
  });
});
