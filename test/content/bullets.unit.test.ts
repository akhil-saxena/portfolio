/**
 * The spec for the one grammar that defines a stored résumé bullet.
 *
 * ## Why this file is shaped the way it is
 *
 * The load-bearing claim here is the round trip: `serializeBullet(parseBullet(s)) === s`.
 * Stated on its own that claim is worthless, because the identity pair
 *
 *     parseBullet     = (s) => [{ text: s, bold: false }]
 *     serializeBullet = (runs) => runs.map((r) => r.text).join('')
 *
 * satisfies every string round trip there is, for every input, while parsing nothing at
 * all. A suite built only out of string round trips is the "34 tests all focused on the
 * first item" defect in another costume: green, plentiful, and carrying no information.
 *
 * So every fixture below is asserted twice — once on the round-tripped STRING and once on
 * the RUN ARRAY — and the fixture table carries an explicit `identityAgrees` column
 * naming the handful of inputs an identity parse would get right by accident. A meta-test
 * (`the fixture set cannot be satisfied by an identity parse`) asserts that column is
 * exactly correct, so the suite's own resistance to a degenerate implementation is itself
 * a checked property rather than a claim in a comment.
 *
 * ## What this file deliberately does not test
 *
 * Rendering. `parseBullet` returns data; turning runs into elements is plan 03-07's job,
 * proven against `renderToStaticMarkup` — the real server path. There is no jsdom here
 * and no `environment` override in `vitest.unit.config.ts`, because this project's
 * register already records that a rendered claim verified in a browser simulation is not
 * verified.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { BulletRun } from '../../src/lib/bullets';
import { containsHtmlTag, parseBullet, serializeBullet } from '../../src/lib/bullets';

const p = (text: string): BulletRun => ({ text, bold: false });
const b = (text: string): BulletRun => ({ text, bold: true });

/**
 * Every stored bullet, read off disk at test time rather than pasted in.
 *
 * Reading the live file is what makes this suite cover the real corpus in both of its
 * lives: before the task-2 migration these strings carry `<strong>` (inert text under
 * this grammar, since `<` is not a production), and after it they carry `**`. The
 * conversion-specific proof — that the migration moved the encoding and nothing else —
 * lives in `bullets-migration.unit.test.ts`, which compares against the previous git
 * revision. This file only asserts that whatever is on disk survives a round trip.
 */
function readStoredBullets(): { id: string; text: string }[] {
  const resumePath = fileURLToPath(new URL('../../data/resume.json', import.meta.url));
  const resume = JSON.parse(readFileSync(resumePath, 'utf8')) as {
    experience: { id: string; bullets: string[] }[];
  };
  return resume.experience.flatMap((entry) =>
    entry.bullets.map((text, index) => ({ id: `${entry.id}#${index}`, text }))
  );
}

const STORED_BULLETS = readStoredBullets();

/**
 * `identityAgrees` is true only where `[{ text: source, bold: false }]` happens to BE the
 * correct parse — a bullet with no emphasis and no escape sequence. Everywhere else the
 * identity implementation produces the wrong run array, which is the property that gives
 * the round-trip assertions their teeth.
 */
type Fixture = { name: string; source: string; runs: BulletRun[]; identityAgrees: boolean };

const FIXTURES: Fixture[] = [
  {
    name: 'plain text with no emphasis at all',
    source: 'Delivered a client-side recommendation system with a rule engine',
    runs: [p('Delivered a client-side recommendation system with a rule engine')],
    identityAgrees: true,
  },
  {
    name: 'the pharmeasy#2 shape — prose, an ampersand, no markup',
    source: 'enable product upsell & cross-sell',
    runs: [p('enable product upsell & cross-sell')],
    identityAgrees: true,
  },
  {
    name: 'a bold run in the middle, the three-run case',
    source: 'a **b** c',
    runs: [p('a '), b('b'), p(' c')],
    identityAgrees: false,
  },
  {
    name: 'a bold run at index 0',
    source: '**Reduced p95 latency** by 40%',
    runs: [b('Reduced p95 latency'), p(' by 40%')],
    identityAgrees: false,
  },
  {
    name: 'a bold run at the very end',
    source: 'scaling access for **1K+ enterprise users**',
    runs: [p('scaling access for '), b('1K+ enterprise users')],
    identityAgrees: false,
  },
  {
    name: 'the whole string is one bold run',
    source: '**everything**',
    runs: [b('everything')],
    identityAgrees: false,
  },
  {
    name: 'two bold runs separated by prose',
    source: 'Integrated **18+ GoLang APIs** and reduced **API response size by 50%**',
    runs: [
      p('Integrated '),
      b('18+ GoLang APIs'),
      p(' and reduced '),
      b('API response size by 50%'),
    ],
    identityAgrees: false,
  },
  {
    name: 'adjacent bold runs, which must not be merged or the round trip loses a boundary',
    source: 'a **b****c** d',
    runs: [p('a '), b('b'), b('c'), p(' d')],
    identityAgrees: false,
  },
  {
    name: 'an empty bold run, which serialises as **** and must survive',
    source: 'a ****b',
    runs: [p('a '), b(''), p('b')],
    identityAgrees: false,
  },
  {
    name: 'a literal asterisk in plain text, escaped',
    source: 'the answer is 5 \\* 3',
    runs: [p('the answer is 5 * 3')],
    identityAgrees: false,
  },
  {
    name: 'a literal asterisk inside a bold run',
    source: '**5 \\* 3**',
    runs: [b('5 * 3')],
    identityAgrees: false,
  },
  {
    name: 'a literal doubled asterisk, escaped, which must not open emphasis',
    source: 'a \\*\\*b\\*\\* c',
    runs: [p('a **b** c')],
    identityAgrees: false,
  },
  {
    name: 'a literal backslash, escaped',
    source: 'C:\\\\Users\\\\akhil',
    runs: [p('C:\\Users\\akhil')],
    identityAgrees: false,
  },
  {
    name: 'a backslash immediately before an emphasis delimiter',
    source: 'ends with a slash \\\\**bold**',
    runs: [p('ends with a slash \\'), b('bold')],
    identityAgrees: false,
  },
  {
    name: 'angle brackets survive as literal characters',
    source: 'p95 < 50ms and **p99 > 80ms**',
    runs: [p('p95 < 50ms and '), b('p99 > 80ms')],
    identityAgrees: false,
  },
  {
    name: 'a script payload is inert prose, not a production',
    source: '<script>alert(1)</script> and **bold**',
    runs: [p('<script>alert(1)</script> and '), b('bold')],
    identityAgrees: false,
  },
  {
    name: 'ampersands and double quotes are ordinary characters',
    source: 'upsell & cross-sell, "quoted", and **A&B "C"**',
    runs: [p('upsell & cross-sell, "quoted", and '), b('A&B "C"')],
    identityAgrees: false,
  },
  {
    name: 'the en dash and the multiplication sign from the real corpus',
    source: 'Reduced tickets by **12–20%** and execution time by **6×**',
    runs: [p('Reduced tickets by '), b('12–20%'), p(' and execution time by '), b('6×')],
    identityAgrees: false,
  },
  {
    name: 'the empty string',
    source: '',
    runs: [],
    identityAgrees: false,
  },
];

describe('parseBullet — the shape of a parse', () => {
  it('splits "a **b** c" into three runs: plain, bold, plain', () => {
    expect(parseBullet('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  it('returns exactly one plain run for a bullet with no emphasis — the pharmeasy#2 case', () => {
    const source = 'Delivered a client-side recommendation system to enable upsell & cross-sell';
    const runs = parseBullet(source);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual({ text: source, bold: false });
  });

  it('never emits an empty plain run, so a leading or trailing delimiter costs no run', () => {
    expect(parseBullet('**a**')).toEqual([{ text: 'a', bold: true }]);
    expect(parseBullet('')).toEqual([]);
  });

  it.each(FIXTURES)('decomposes $name', ({ source, runs }) => {
    expect(parseBullet(source)).toEqual(runs);
  });
});

describe('serializeBullet — the inverse, on the normal form parseBullet produces', () => {
  it.each(FIXTURES)('re-emits $name', ({ source, runs }) => {
    expect(serializeBullet(runs)).toBe(source);
  });

  it('serialises the empty run list to the empty string', () => {
    expect(serializeBullet([])).toBe('');
  });
});

describe('the round trip — the property the Phase 7 editor depends on', () => {
  /**
   * Asserted on the run array as well as the string. The string half alone is satisfied
   * by `s => s`; see the header note. `identityAgrees` is the fixture-level record of
   * which inputs that degenerate pair would get right anyway.
   */
  it.each(FIXTURES)('round-trips $name as both a string and a run array', ({ source, runs }) => {
    const parsed = parseBullet(source);
    expect(parsed).toEqual(runs);
    expect(serializeBullet(parsed)).toBe(source);
  });

  it('is idempotent — parse ∘ serialize ∘ parse equals parse, for every fixture', () => {
    for (const { name, source } of FIXTURES) {
      const once = parseBullet(source);
      const twice = parseBullet(serializeBullet(once));
      expect(twice, name).toEqual(once);
    }
  });

  it('the fixture set cannot be satisfied by an identity parse', () => {
    const identityParse = (s: string): BulletRun[] => [{ text: s, bold: false }];
    const agreed = FIXTURES.filter(
      (f) => JSON.stringify(identityParse(f.source)) === JSON.stringify(f.runs)
    ).map((f) => f.name);
    const declared = FIXTURES.filter((f) => f.identityAgrees).map((f) => f.name);

    // The set an identity parse gets right is exactly the set the table says it does.
    // If a fixture is added that quietly agrees with identity without being declared,
    // this fails — so the suite's resistance to a degenerate implementation is checked,
    // not asserted in prose.
    expect(agreed.sort()).toEqual(declared.sort());

    // And that set has to be a small minority, or the table above is decorative.
    expect(agreed.length).toBeLessThanOrEqual(2);
    expect(FIXTURES.length - agreed.length).toBeGreaterThanOrEqual(15);
  });
});

describe('the stored corpus round-trips, every bullet of it', () => {
  it('reads 13 bullets across 3 experience entries', () => {
    expect(STORED_BULLETS).toHaveLength(13);
  });

  it.each(STORED_BULLETS)('round-trips $id', ({ text }) => {
    const parsed = parseBullet(text);
    expect(serializeBullet(parsed)).toBe(text);
    // A parse that returned [] for a non-empty bullet would still round-trip to '' !==
    // text and fail above, but assert the projection explicitly: the concatenated run
    // text is the bullet's plain-text projection and must lose nothing but delimiters.
    expect(parsed.map((r) => r.text).join('')).toBe(
      text.replace(/\\([\\*])/g, '$1').replace(/\*\*/g, '')
    );
  });
});

describe('unbalanced and malformed emphasis is a named throw, never a silent literal', () => {
  it('throws on an unclosed ** , naming the bullet and the offending index', () => {
    let thrown: unknown;
    try {
      parseBullet('a **b c');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    const err = thrown as Error & { bullet?: string; index?: number };
    expect(err.name).toBe('BulletSyntaxError');
    expect(err.bullet).toBe('a **b c');
    expect(err.index).toBe(2);
    expect(err.message).toContain('a **b c');
  });

  it('throws on a lone ** at the very start', () => {
    expect(() => parseBullet('**')).toThrowError(/BulletSyntaxError|unbalanced/i);
  });

  it('reports the index of the delimiter that was left open, not of the first one', () => {
    let index: number | undefined;
    try {
      parseBullet('a ** b ** c ** d');
    } catch (error) {
      index = (error as { index?: number }).index;
    }
    expect(index).toBe(12);
  });

  it('throws on a lone unescaped asterisk rather than guessing it was literal', () => {
    let thrown: unknown;
    try {
      parseBullet('the answer is 5 * 3');
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error | undefined)?.name).toBe('BulletSyntaxError');
    expect((thrown as { index?: number } | undefined)?.index).toBe(16);
  });

  it('throws on an invalid escape sequence and on a trailing backslash', () => {
    expect(() => parseBullet('a \\b')).toThrowError();
    expect(() => parseBullet('a \\')).toThrowError();

    let name = 'no throw';
    try {
      parseBullet('a \\b');
    } catch (error) {
      name = (error as Error).name;
    }
    expect(name).toBe('BulletSyntaxError');
  });

  it('does not throw on the escapes it defines', () => {
    expect(() => parseBullet('a \\\\ b')).not.toThrow();
    expect(() => parseBullet('a \\* b')).not.toThrow();
  });
});

describe('the grammar has no production that emits an angle bracket', () => {
  /**
   * The structural claim behind criterion 3's storage half. It is not "we escape angle
   * brackets" — it is that no input to `serializeBullet` can cause one to appear that was
   * not already a character of some run's text.
   */
  it.each(FIXTURES)('emits the same angle brackets its run text carried, for $name', ({ runs }) => {
    const fromText = runs
      .map((r) => r.text)
      .join('')
      .replace(/[^<>]/g, '');
    expect(serializeBullet(runs).replace(/[^<>]/g, '')).toBe(fromText);
  });

  it('emits no angle bracket at all when no run text carries one', () => {
    const sweep: BulletRun[][] = [
      [p('plain')],
      [b('bold')],
      [p('a'), b('b'), p('c')],
      [b('a'), b('b')],
      [b('')],
      [p('* ** *** \\ \\\\ ****')],
      [b('quotes " and & and % and — and ×')],
      [],
    ];
    for (const runs of sweep) {
      expect(serializeBullet(runs)).not.toMatch(/[<>]/);
    }
  });

  it('cannot be made to emit a tag by putting one in a run, because it stays text', () => {
    const runs = parseBullet('<img src=x onerror=alert(1)> and **<b>bold</b>**');
    // The payload survives byte for byte as run TEXT — which is the point. It is data at
    // this layer; making it inert at the render boundary is plan 03-07's assertion.
    expect(runs.map((r) => r.text).join('')).toContain('<img src=x onerror=alert(1)>');
    expect(serializeBullet(runs)).toBe('<img src=x onerror=alert(1)> and **<b>bold</b>**');
  });
});

describe('containsHtmlTag — the predicate that recognises markup in a string', () => {
  const TRUE_CASES = [
    '<script>',
    '</strong>',
    '<img src=x onerror=1>',
    '<b >',
    '<a href="x">y</a>',
    'prose then <em>emphasis</em> then prose',
    '<SCRIPT>',
    '<svg/onload=alert(1)>',
    '<!-- a comment -->',
    '<!DOCTYPE html>',
  ];

  const FALSE_CASES = [
    'p95 < 50ms',
    'a < b > c',
    '2 <3',
    '',
    'Improved **conversion by 15%** for **2.5M+ users**',
    'upsell & cross-sell',
    'x > y and y > z',
    '5 < 6 but 7 > 6',
    'a < 1 > b',
  ];

  it.each(TRUE_CASES)('is true for %j', (source) => {
    expect(containsHtmlTag(source)).toBe(true);
  });

  it.each(FALSE_CASES)('is false for %j', (source) => {
    expect(containsHtmlTag(source)).toBe(false);
  });

  it('is false for every bullet on disk, whatever encoding they are currently in', () => {
    // Before the task-2 migration this is expected to be FALSE only after conversion, so
    // the assertion is deliberately conditional on what is on disk: it asserts the
    // predicate agrees with the raw text, not that the migration has happened. The
    // unconditional "zero tags remain" claim is task 2's gate.
    for (const { id, text } of STORED_BULLETS) {
      expect(containsHtmlTag(text), id).toBe(/<\/?[a-zA-Z]/.test(text));
    }
  });
});
