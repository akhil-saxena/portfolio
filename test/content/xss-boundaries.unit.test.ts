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

const RESUME = read('data/resume.json') as ResumeShape;

const ALL_BULLETS: string[] = RESUME.experience.flatMap((entry) => entry.bullets);

const JOINT_PAYLOAD = 'Reduced p95 <script>alert(1)</script> latency by **40%**';

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
    const plain =
      'Delivered a client-side recommendation system leveraging a rule engine to enable product upsell & cross-sell';
    expect(plain.includes('**')).toBe(false);

    const html = render([plain]);

    expect(countOf(html, '<strong>')).toBe(0);
    expect(decodeReactEntities(html)).toBe(`<ul><li>${plain}</li></ul>`);
  });

  it('renders two adjacent bold runs as two separate <strong> elements, not one merged element', () => {
    const source = '**alpha****beta**';
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
    expect(ResumeSchema.safeParse(RESUME).success).toBe(true);
  });

  it('the two boundaries disagree about the grammar, and that is the point', () => {
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
    const ampersandBullets = ALL_BULLETS.filter((bullet) => bullet.includes('&'));
    expect(ampersandBullets).toHaveLength(1);
    expect(ampersandBullets[0]).toContain('upsell & cross-sell');

    const html = render(ALL_BULLETS);

    expect(countOf(html, '&')).toBe(1);
    expect(countOf(html, '&amp;')).toBe(1);
    expect(html).not.toContain('&amp;amp;');
    expect(html).toContain('upsell &amp; cross-sell');
    expect(countOf(decodeReactEntities(html), '&')).toBe(1);
    expect(decodeReactEntities(html)).toContain(ampersandBullets[0]);
  });

  it('renders the en dash as a raw character rather than an entity', () => {
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
