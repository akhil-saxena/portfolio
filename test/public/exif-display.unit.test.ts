/**
 * `src/lib/exif-display.ts` — PUB-07 (omit an absent field entirely) and PUB-08 (a camera or
 * lens reads as a human name, or the build refuses).
 *
 * THREE RULES GOVERN THIS FILE.
 *
 * 1. THE CORPUS IS THE ORACLE, NOT A FIXTURE. Every claim about the two degenerate records,
 *    about coverage, and about the ugly focal length is asserted against
 *    `data/portfolio_images.json` READ FROM DISK AT CHECK TIME. A hand-typed fixture proves
 *    only that the fixture agrees with itself; the whole reason PUB-07 exists is that
 *    `product-peppers` really has six nulls and `lens` really is null on a quarter of the
 *    corpus, and a fixture cannot go stale in a way that tells you.
 *
 * 2. NO COUNT IS LITERALLED. The record count, the distinct camera count and the distinct lens
 *    count are all derived from the file. 04-09 wrote a hardcoded count and the first real
 *    photograph turned `main` red. The manifest was 39, then 40; it will be 41.
 *
 * 3. THE DISPLAY NAMES ARE WRITTEN OUT INDEPENDENTLY BELOW, and deliberately NOT imported from
 *    the module. That duplication is the point: it is the only thing that can catch a typo in
 *    the module's table. A test that imported the table and asserted the table would agree with
 *    itself by construction — which is what `THUMB.dataUriPrefix` in `src/lib/photo-pipeline.ts`
 *    records about an earlier attempt in this repository.
 *
 * Reported failures use `process.stdout.write`, never `console.log` — STATE.md records that
 * `console.log` and `console.info` print NOTHING under this repo's vitest setup, which makes a
 * diagnostic indistinguishable from silence.
 */

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAMERA_DISPLAY_NAMES,
  displayCamera,
  displayLens,
  EXIF_LABELS,
  EXIF_ROW_ORDER,
  exifRows,
  LENS_DISPLAY_NAMES,
} from '../../src/lib/exif-display.ts';
import type { PhotoExif } from '../../src/schemas/photo.ts';

/* ---------------------------------------------------------------------------------------------
 * The corpus, read from disk at check time.
 * ------------------------------------------------------------------------------------------ */

/**
 * The corpus this suite reads. It defaults to the committed manifest and is overridable ONLY so
 * that the suite's own anti-vacuity guards can be PROVEN to fire — running against an empty
 * array and against a missing file, without moving `data/portfolio_images.json` aside in a wave
 * where three executors share one git index. CI sets nothing, so CI reads the real file.
 */
const MANIFEST_URL = process.env.EXIF_DISPLAY_CORPUS
  ? new URL(`file://${process.env.EXIF_DISPLAY_CORPUS}`)
  : new URL('../../data/portfolio_images.json', import.meta.url);
const MANIFEST_PATH = MANIFEST_URL.pathname;

interface ManifestRecord {
  id: string;
  exif: PhotoExif;
}

function readCorpus(): ManifestRecord[] {
  const raw = fs.readFileSync(MANIFEST_URL, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${MANIFEST_PATH} is not an array — this suite has nothing to assert against`);
  }
  if (parsed.length === 0) {
    // Anti-vacuity. Every per-record assertion below iterates the corpus; an empty corpus
    // satisfies all of them without reading a single record.
    throw new Error(`${MANIFEST_PATH} holds zero records — every per-record claim here is vacuous`);
  }
  return parsed as ManifestRecord[];
}

const CORPUS = readCorpus();

function recordById(id: string): ManifestRecord {
  const found = CORPUS.find((r) => r.id === id);
  if (!found) {
    throw new Error(
      `${MANIFEST_PATH} has no record with id "${id}". This suite names it because PUB-07's ` +
        `degenerate case is real; if the photograph was removed, the assertion must be re-pointed ` +
        `at another real record, not deleted.`
    );
  }
  return found;
}

const distinct = (values: (string | null)[]): string[] => [
  ...new Set(values.filter((v): v is string => v !== null)),
];

const DISTINCT_CAMERAS = distinct(CORPUS.map((r) => r.exif.camera));
const DISTINCT_LENSES = distinct(CORPUS.map((r) => r.exif.lens));

/* ---------------------------------------------------------------------------------------------
 * The expected transform, typed out here from 05-UI-SPEC.md §9.5 — INDEPENDENTLY of the module.
 * ------------------------------------------------------------------------------------------ */

const EXPECTED_CAMERA_NAMES: Record<string, string> = {
  'NIKON CORPORATION NIKON D5300': 'Nikon D5300',
  'samsung Galaxy Z Fold5': 'Samsung Galaxy Z Fold5',
  'SONY ILCE-7CM2': 'Sony α7C II',
  'samsung SM-N970F': 'Samsung Galaxy Note10',
  'OnePlus AC2001': 'OnePlus Nord',
};

const EXPECTED_LENS_NAMES: Record<string, string> = {
  '18.0-55.0 mm f/3.5-5.6': '18–55mm f/3.5–5.6',
  '70.0-300.0 mm f/4.5-6.3': '70–300mm f/4.5–6.3',
  'Samsung Galaxy Z Fold5 Rear Wide Camera': 'Wide',
  'FE 28-60mm F4-5.6': 'Sony FE 28–60mm f/4–5.6',
};

/** The row order 05-UI-SPEC.md §9.3 fixes, written out here rather than imported. */
const EXPECTED_ORDER = ['camera', 'lens', 'focalLength', 'aperture', 'shutter', 'iso'];
const EXPECTED_LABELS = ['Camera', 'Lens', 'Focal length', 'Aperture', 'Shutter', 'ISO'];

const ALL_NULL: PhotoExif = {
  camera: null,
  lens: null,
  aperture: null,
  shutter: null,
  iso: null,
  focalLength: null,
};

/* ---------------------------------------------------------------------------------------------
 * The corpus is what it is claimed to be. If these fail, every claim below is about a file
 * this suite has not understood.
 * ------------------------------------------------------------------------------------------ */

describe('the corpus this suite reads', () => {
  it('holds records, and every one carries a complete six-field exif object', () => {
    process.stdout.write(
      `exif-display suite: ${CORPUS.length} records, ` +
        `${DISTINCT_CAMERAS.length} distinct cameras, ${DISTINCT_LENSES.length} distinct lenses ` +
        `(all derived from ${MANIFEST_PATH})\n`
    );
    expect(CORPUS.length).toBeGreaterThan(0);
    for (const record of CORPUS) {
      for (const field of EXPECTED_ORDER) {
        expect(
          Object.hasOwn(record.exif, field),
          `${record.id}.exif is missing "${field}" — the schema declares it nullable, NOT optional`
        ).toBe(true);
      }
    }
  });

  it('actually exercises both tables — neither lookup is checked zero times', () => {
    // Anti-vacuity for the coverage test below. A corpus where every camera was null would
    // make "every camera resolves" pass without resolving one.
    expect(DISTINCT_CAMERAS.length).toBeGreaterThan(0);
    expect(DISTINCT_LENSES.length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * PUB-08 — human names.
 * ------------------------------------------------------------------------------------------ */

describe('displayCamera', () => {
  it('turns the Nikon model string into the name a reader knows', () => {
    expect(displayCamera('NIKON CORPORATION NIKON D5300')).toBe('Nikon D5300');
  });

  it('decodes every model code in the expectation table, written out independently', () => {
    for (const [raw, expected] of Object.entries(EXPECTED_CAMERA_NAMES)) {
      expect(displayCamera(raw), `displayCamera(${JSON.stringify(raw)})`).toBe(expected);
    }
  });

  it('returns null for null, so a null camera can produce no row', () => {
    expect(displayCamera(null)).toBeNull();
  });

  it('THROWS on a string with no table entry, naming the offending value', () => {
    // Note: `samsung SM-N970F` IS in the table. The bare model code is not, and it is exactly
    // the string that would ship to a reader if this fell back instead of throwing.
    expect(() => displayCamera('SM-N970F')).toThrow(/SM-N970F/);
  });

  it('throws rather than returning an inherited Object.prototype member', () => {
    // A plain object literal inherits `constructor`, `toString`, `valueOf`. A `table[value]`
    // lookup would return a FUNCTION for these and the row would render "[object Object]" or
    // worse. The lookup must be an own-property check.
    for (const poison of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__']) {
      expect(() => displayCamera(poison), `displayCamera(${JSON.stringify(poison)})`).toThrow();
      expect(() => displayLens(poison), `displayLens(${JSON.stringify(poison)})`).toThrow();
    }
  });

  it('matches EXACTLY — a case variant and a trailing space are both refused', () => {
    // A deliberate decision, not an oversight: the pipeline writes what the camera wrote, so a
    // value differing by case or whitespace was not produced by the pipeline. Folding it in
    // would silently accept a hand-edit that the ingest path can never reproduce.
    expect(() => displayCamera('nikon corporation nikon d5300')).toThrow();
    expect(() => displayCamera('NIKON CORPORATION NIKON D5300 ')).toThrow();
  });

  it('covers every distinct non-null camera in the real corpus', () => {
    for (const raw of DISTINCT_CAMERAS) {
      expect(() => displayCamera(raw), `uncovered camera in the manifest: ${raw}`).not.toThrow();
    }
  });
});

describe('displayLens', () => {
  it('names the Fold5 lens "Wide", because the body is already on the row above', () => {
    expect(displayLens('Samsung Galaxy Z Fold5 Rear Wide Camera')).toBe('Wide');
  });

  it('matches every lens in the expectation table, written out independently', () => {
    for (const [raw, expected] of Object.entries(EXPECTED_LENS_NAMES)) {
      expect(displayLens(raw), `displayLens(${JSON.stringify(raw)})`).toBe(expected);
    }
  });

  it('returns null for null and throws on an unknown string, naming it', () => {
    expect(displayLens(null)).toBeNull();
    expect(() => displayLens('EF 50mm f/1.8 STM')).toThrow(/EF 50mm f\/1\.8 STM/);
  });

  it('covers every distinct non-null lens in the real corpus', () => {
    for (const raw of DISTINCT_LENSES) {
      expect(() => displayLens(raw), `uncovered lens in the manifest: ${raw}`).not.toThrow();
    }
  });
});

describe('the two tables', () => {
  it('agree entry-for-entry with the independently written expectation', () => {
    expect({ ...CAMERA_DISPLAY_NAMES }).toEqual(EXPECTED_CAMERA_NAMES);
    expect({ ...LENS_DISPLAY_NAMES }).toEqual(EXPECTED_LENS_NAMES);
  });

  it('are frozen, so no caller can add an entry at runtime', () => {
    expect(Object.isFrozen(CAMERA_DISPLAY_NAMES)).toBe(true);
    expect(Object.isFrozen(LENS_DISPLAY_NAMES)).toBe(true);
  });

  it('carry no entry the corpus does not use — a dead entry is an unchecked claim', () => {
    // Not a hard rule about the future (a table entry added ahead of a photograph is fine),
    // but it must be a visible event rather than a silent one.
    const unusedCameras = Object.keys(CAMERA_DISPLAY_NAMES).filter(
      (k) => !DISTINCT_CAMERAS.includes(k)
    );
    const unusedLenses = Object.keys(LENS_DISPLAY_NAMES).filter(
      (k) => !DISTINCT_LENSES.includes(k)
    );
    if (unusedCameras.length > 0 || unusedLenses.length > 0) {
      process.stdout.write(
        `exif-display: table entries unused by the corpus — cameras ${JSON.stringify(unusedCameras)}, ` +
          `lenses ${JSON.stringify(unusedLenses)}\n`
      );
    }
    expect(unusedCameras).toEqual([]);
    expect(unusedLenses).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * PUB-07 — a null field produces no row; six nulls produce no block.
 * ------------------------------------------------------------------------------------------ */

describe('exifRows — the omit-null rule', () => {
  it('returns [] for an all-null exif, so the caller renders no block at all', () => {
    expect(exifRows(ALL_NULL)).toEqual([]);
  });

  it('returns ZERO rows for product-peppers, read out of the real manifest', () => {
    const peppers = recordById('product-peppers');
    // Guard the premise: if this record ever gains a field, the zero-row claim below stops
    // being about the degenerate case and this test must say so rather than quietly pass.
    expect(
      Object.values(peppers.exif).every((v) => v === null),
      'product-peppers no longer has six nulls — PUB-07 needs a new degenerate witness'
    ).toBe(true);
    expect(exifRows(peppers.exif)).toEqual([]);
  });

  it('returns EXACTLY ONE row, labelled Camera, for architecture-redbuilding', () => {
    const red = recordById('architecture-redbuilding');
    const nonNull = Object.entries(red.exif).filter(([, v]) => v !== null);
    expect(
      nonNull.map(([k]) => k),
      'architecture-redbuilding is no longer camera-only — the one-row claim needs a new witness'
    ).toEqual(['camera']);

    const rows = exifRows(red.exif);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Camera');
    expect(rows[0].value).toBe('Nikon D5300');
  });

  it('never emits a placeholder value anywhere in the corpus', () => {
    const forbidden = ['', ' ', '—', '–', '-', 'Unknown', 'unknown', 'N/A', 'null'];
    for (const record of CORPUS) {
      for (const row of exifRows(record.exif)) {
        expect(typeof row.value, `${record.id}: ${row.label}`).toBe('string');
        expect(
          forbidden.includes(row.value.trim()),
          `${record.id}: row "${row.label}" rendered the placeholder ${JSON.stringify(row.value)}`
        ).toBe(false);
        expect(row.value.trim().length).toBeGreaterThan(0);
        expect(row.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('emits exactly as many rows as the record has non-null fields, for every record', () => {
    for (const record of CORPUS) {
      const nonNullCount = Object.values(record.exif).filter((v) => v !== null).length;
      expect(exifRows(record.exif), record.id).toHaveLength(nonNullCount);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * Value formatting and row order.
 * ------------------------------------------------------------------------------------------ */

describe('exifRows — values and order', () => {
  it('renders the ISO row so a reader reads "ISO 200"', () => {
    // 05-UI-SPEC.md §9.3 says `iso` "renders as ISO 200". The row is a <dl> pair, so the LABEL
    // carries "ISO" and the value carries the number. Putting "ISO 200" in the value as well
    // would render "ISO: ISO 200" — see the module header for the full reasoning.
    const rows = exifRows({ ...ALL_NULL, iso: 200 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ label: 'ISO', value: '200' });
    expect(`${rows[0].label} ${rows[0].value}`).toBe('ISO 200');
  });

  it('emits no ISO row when iso is null', () => {
    expect(exifRows({ ...ALL_NULL, iso: null })).toEqual([]);
  });

  it("renders wildlife-starfish's 4.745mm verbatim, read from the real manifest", () => {
    const starfish = recordById('wildlife-starfish');
    const stored = starfish.exif.focalLength;
    expect(stored, 'wildlife-starfish has no focalLength — the verbatim claim needs a witness').not
      .toBeNull;
    const row = exifRows(starfish.exif).find((r) => r.label === 'Focal length');
    expect(row?.value).toBe(stored);
  });

  it('renders aperture, shutter and focal length verbatim for every record', () => {
    const verbatim: [string, keyof PhotoExif][] = [
      ['Aperture', 'aperture'],
      ['Shutter', 'shutter'],
      ['Focal length', 'focalLength'],
    ];
    for (const record of CORPUS) {
      const rows = exifRows(record.exif);
      for (const [label, field] of verbatim) {
        const stored = record.exif[field];
        const row = rows.find((r) => r.label === label);
        if (stored === null) {
          expect(row, `${record.id}: ${label} row emitted for a null field`).toBeUndefined();
        } else {
          expect(row?.value, `${record.id}: ${label}`).toBe(stored);
        }
      }
    }
  });

  it('orders a full exif Camera, Lens, Focal length, Aperture, Shutter, ISO', () => {
    const full: PhotoExif = {
      camera: 'SONY ILCE-7CM2',
      lens: 'FE 28-60mm F4-5.6',
      aperture: 'f/8',
      shutter: '1/250',
      iso: 400,
      focalLength: '35mm',
    };
    expect(exifRows(full).map((r) => r.label)).toEqual(EXPECTED_LABELS);
  });

  it("exports an order and a label map that agree with this file's own copy", () => {
    expect([...EXIF_ROW_ORDER]).toEqual(EXPECTED_ORDER);
    expect(EXPECTED_ORDER.map((f) => EXIF_LABELS[f as keyof PhotoExif])).toEqual(EXPECTED_LABELS);
  });

  it('keeps that order as a subsequence for every partial record in the corpus', () => {
    for (const record of CORPUS) {
      const labels = exifRows(record.exif).map((r) => r.label);
      const asSubsequence = EXPECTED_LABELS.filter((l) => labels.includes(l));
      expect(labels, `${record.id}: row order drifted`).toEqual(asSubsequence);
    }
  });

  it('does not read, and cannot leak, photo.date', () => {
    // §9.4: the stored dates are ingest dates from a ten-day window. This module is given the
    // exif object only, so it has no access to `date` by construction — asserted here because
    // "by construction" is a claim that stops being true the day someone widens the parameter.
    const rows = exifRows(recordById('wildlife-starfish').exif);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(row.value)).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * Purity. A green run of everything above says NOTHING about this: vitest runs in Node, the
 * prerender runs in workerd (measured by 05-01 — `import.meta.url` undefined, `process.cwd()`
 * = `/bundle`, no filesystem), and the Lightbox island runs in a browser. 05-01's first
 * implementation passed 13/13 unit tests and died in the build.
 * ------------------------------------------------------------------------------------------ */

const MODULE_URL = new URL('../../src/lib/exif-display.ts', import.meta.url);

/** Comments are stripped first: this module's own header NAMES the things it must not do. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const IMPURITIES: [string, RegExp][] = [
  ['a node: import', /^\s*import[^\n]*['"]node:/m],
  ['a node: dynamic import', /\bimport\s*\(\s*['"]node:/],
  ['a require() call', /\brequire\s*\(/],
  ['a process reference', /\bprocess\s*\./],
  ['an import.meta reference', /\bimport\s*\.\s*meta\b/],
  ['a globalThis escape hatch', /\bglobalThis\s*\./],
];

describe('the module is pure', () => {
  const source = fs.readFileSync(MODULE_URL, 'utf8');
  const code = stripComments(source);

  it('the impurity scanner can actually fire — canary and anti-canary', () => {
    // Without this, a broken regex presents as a clean module. Eight of this project's
    // nineteen defective predicates were in repairs to other predicates.
    const canaries: Record<string, string> = {
      'a node: import': "import fs from 'node:fs';\n",
      'a node: dynamic import': "await import('node:path');\n",
      'a require() call': "const x = require('node:fs');\n",
      'a process reference': 'const c = process.cwd();\n',
      'an import.meta reference': 'const u = import.meta.url;\n',
      'a globalThis escape hatch': 'const g = globalThis.process;\n',
    };
    for (const [name, pattern] of IMPURITIES) {
      expect(pattern.test(canaries[name]), `${name}: pattern did not flag its canary`).toBe(true);
      expect(
        pattern.test("export const T = Object.freeze({ a: 'b' });\n"),
        `${name}: pattern flagged clean code`
      ).toBe(false);
    }
  });

  it('the comment stripper removes a commented-out import that WOULD match', () => {
    // MEASURED, and it is the reason the plan's shell gate was repaired to match the IMPORT
    // STATEMENT rather than the bare token `node:`. A JSDoc line is `*`-prefixed, so it does
    // NOT match `^\s*import` — a header may name the forbidden form in prose without firing
    // the gate, which is what makes this module's own header legal:
    const jsdoc = "/**\n * import fs from 'node:fs' is forbidden here.\n */\nexport const x = 1;\n";
    expect(/^\s*import[^\n]*['"]node:/m.test(jsdoc)).toBe(false);

    // A block-commented-out import DOES start at column 0 and DOES match, so the stripper is
    // what stops a deleted-but-not-removed import from reading as a live one:
    const commentedOut = "/*\nimport fs from 'node:fs';\n*/\nexport const x = 1;\n";
    expect(/^\s*import[^\n]*['"]node:/m.test(commentedOut)).toBe(true);
    expect(/^\s*import[^\n]*['"]node:/m.test(stripComments(commentedOut))).toBe(false);
  });

  it('contains none of the six impure forms, in code', () => {
    for (const [name, pattern] of IMPURITIES) {
      const hit = pattern.exec(code);
      expect(hit === null, `${MODULE_URL.pathname} contains ${name}: ${hit?.[0]}`).toBe(true);
    }
  });

  it('imports nothing at runtime — every import it has is type-only', () => {
    // A value import would be inlined into the Lightbox island's browser chunk. The schema
    // module pulls in zod; importing it for a VALUE here would put a validator in a public
    // route budgeted for zero framework JavaScript.
    const imports = [...code.matchAll(/^\s*import\s+([^\n]*?)\s+from\s+['"][^'"]+['"]/gm)];
    for (const match of imports) {
      expect(match[1].startsWith('type '), `runtime import: ${match[0].trim()}`).toBe(true);
    }
  });
});
