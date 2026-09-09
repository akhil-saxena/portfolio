import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BREAKPOINTS,
  GUTTER_RUNGS,
  gutterAt,
  MASONRY_GAP,
  PAGE_MAX,
} from '../../src/lib/layout-ladder';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (relative: string): string => readFileSync(`${REPO_ROOT}${relative}`, 'utf8');

function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (two === '/*') {
      while (i < source.length && source.slice(i, i + 2) !== '*/') {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      out += ch;
      i += 1;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === '\\') {
          out += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += source[i];
        i += 1;
      }
      out += source[i] ?? '';
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

const DS_TOKENS_CSS = 'node_modules/@akhil-saxena/design-system/dist/tokens.css';

function designSystemSpaceScale(): Map<string, number> {
  const css = read(DS_TOKENS_CSS);
  const scale = new Map<string, number>();
  for (const match of css.matchAll(/(--space-\d+)\s*:\s*(\d+)px\s*;/g)) {
    scale.set(match[1], Number(match[2]));
  }
  return scale;
}

describe('the design system really is the source of the spacing scale', () => {
  it('tokens.css declares a --space-* scale this suite can read', () => {
    const scale = designSystemSpaceScale();
    expect(scale.size).toBeGreaterThanOrEqual(10);
    for (const [token, px] of scale) {
      const step = Number(token.slice('--space-'.length));
      expect(Number.isInteger(step)).toBe(true);
      expect(px).toBe(step * 4);
    }
  });
});

describe('GUTTER_RUNGS — 05-UI-SPEC §2.1', () => {
  it('is the four rungs, in ascending order, base first', () => {
    expect(GUTTER_RUNGS).toEqual([
      { minWidth: null, token: '--space-4', px: 16 },
      { minWidth: 375, token: '--space-6', px: 24 },
      { minWidth: 673, token: '--space-8', px: 32 },
      { minWidth: 1024, token: '--space-12', px: 48 },
    ]);
  });

  it('exactly one rung is unconditioned, and it is the first', () => {
    const unconditioned = GUTTER_RUNGS.filter((rung) => rung.minWidth === null);
    expect(unconditioned).toHaveLength(1);
    expect(GUTTER_RUNGS[0].minWidth).toBeNull();
  });

  it('minWidths strictly ascend, so the ladder has no unreachable rung', () => {
    const conditioned = GUTTER_RUNGS.slice(1).map((rung) => rung.minWidth as number);
    for (let i = 1; i < conditioned.length; i += 1) {
      expect(conditioned[i]).toBeGreaterThan(conditioned[i - 1]);
    }
    expect(conditioned.length).toBeGreaterThan(0);
  });

  it('px values ascend too — a ladder that narrows as the viewport grows is a typo', () => {
    for (let i = 1; i < GUTTER_RUNGS.length; i += 1) {
      expect(GUTTER_RUNGS[i].px).toBeGreaterThan(GUTTER_RUNGS[i - 1].px);
    }
  });

  it('EVERY rung: its token and its px agree with the design system, both halves checked', () => {
    const scale = designSystemSpaceScale();
    for (const rung of GUTTER_RUNGS) {
      expect(scale.has(rung.token)).toBe(true);
      expect(rung.px).toBe(scale.get(rung.token));
      expect(rung.px).toBe(Number(rung.token.slice('--space-'.length)) * 4);
    }
  });
});

describe('BREAKPOINTS is DERIVED from the rungs, not typed a second time', () => {
  it('is the three conditioned minima from 05-UI-SPEC §2.1', () => {
    expect(BREAKPOINTS).toEqual([375, 673, 1024]);
  });

  it('equals the rungs read forwards', () => {
    expect(BREAKPOINTS).toEqual(
      GUTTER_RUNGS.filter((rung) => rung.minWidth !== null).map((rung) => rung.minWidth)
    );
  });

  it('each breakpoint number appears EXACTLY ONCE in the module code', () => {
    const code = stripComments(read('src/lib/layout-ladder.ts'));
    for (const breakpoint of [375, 673, 1024]) {
      const occurrences = [...code.matchAll(new RegExp(`\\b${breakpoint}\\b`, 'g'))];
      expect(occurrences).toHaveLength(1);
    }
    expect(code).toContain('--space-12');
    expect(stripComments('const a = 1; // 375')).not.toContain('375');
    expect(stripComments('const a = 375;')).toContain('375');
  });
});

describe('MASONRY_GAP and PAGE_MAX', () => {
  it('MASONRY_GAP is --space-4 / 16px, at every class', () => {
    expect(MASONRY_GAP).toEqual({ token: '--space-4', px: 16 });
  });

  it('MASONRY_GAP agrees with the design system too', () => {
    const scale = designSystemSpaceScale();
    expect(scale.has(MASONRY_GAP.token)).toBe(true);
    expect(MASONRY_GAP.px).toBe(scale.get(MASONRY_GAP.token));
  });

  it('PAGE_MAX is §2.2: Home 1080, Work and Photos 1280, the employment band 1080', () => {
    expect(PAGE_MAX).toEqual({ home: 1080, work: 1280, photos: 1280, band: 1080 });
  });

  it('every maximum is above the widest breakpoint, or a cap would fight the ladder', () => {
    const widest = BREAKPOINTS[BREAKPOINTS.length - 1];
    for (const [surface, max] of Object.entries(PAGE_MAX)) {
      expect(max, `PAGE_MAX.${surface}`).toBeGreaterThan(widest);
    }
  });
});

describe('gutterAt — the step function, asserted at its boundaries', () => {
  const cases: ReadonlyArray<readonly [number, number]> = [
    [0, 16],
    [344, 16],
    [374, 16],
    [375, 24],
    [376, 24],
    [672, 24],
    [673, 32],
    [674, 32],
    [1023, 32],
    [1024, 48],
    [1025, 48],
    [1440, 48],
    [3840, 48],
  ];

  for (const [width, expected] of cases) {
    it(`gutterAt(${width}) is ${expected}`, () => {
      expect(gutterAt(width)).toBe(expected);
    });
  }

  it('returns a px value that is one of the rungs and never something in between', () => {
    const known = new Set(GUTTER_RUNGS.map((rung) => rung.px));
    for (let width = 0; width <= 1500; width += 1) {
      expect(known.has(gutterAt(width))).toBe(true);
    }
  });

  it('is monotonic across every integer width up to 1500', () => {
    let previous = gutterAt(0);
    for (let width = 1; width <= 1500; width += 1) {
      const current = gutterAt(width);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('REFUSES a width that is not a finite non-negative number', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, -0.5]) {
      expect(() => gutterAt(bad), String(bad)).toThrow(/width/i);
    }
    expect(() => gutterAt(0)).not.toThrow();
  });
});

describe('the header carries what 05-06 needs, because CSS cannot import TypeScript', () => {
  it('names all five gutter sites, including the one that gets missed', () => {
    const header = read('src/lib/layout-ladder.ts');
    for (const site of ['.pub-shell', '.pub-bar', 'AppBar', '.pub-footer', 'Footer']) {
      expect(header, `header must name ${site}`).toContain(site);
    }
  });

  it('names the gate that closes the CSS/TypeScript duplication, and who owns it', () => {
    const header = read('src/lib/layout-ladder.ts');
    expect(header).toContain('assert-gutter-ladder.mjs');
    expect(header).toContain('05-06');
  });
});

describe('the module is safe to import from a prerendered page', () => {
  it('imports nothing at all — no node:, no design system, no data', () => {
    const source = read('src/lib/layout-ladder.ts');
    const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((m) => m[1]);
    expect(specifiers.filter((spec) => spec.startsWith('node:'))).toEqual([]);
    expect(specifiers).toEqual([]);
    const sample = "import { x } from 'node:fs';\nimport y from './z.ts';";
    expect([...sample.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((m) => m[1])).toEqual([
      'node:fs',
      './z.ts',
    ]);
  });
});
