/**
 * PUB-07 and PUB-08 — the EXIF a reader sees.
 *
 * Two rules live here, and only here.
 *
 *   PUB-07  A field whose stored value is `null` produces NO ROW. Not an em dash, not
 *           "Unknown", not an empty `<dd>`. If no row survives, the caller renders no block —
 *           no heading, no rule, no empty panel. MEASURED on the committed manifest:
 *           `product-peppers` has all six fields null and `architecture-redbuilding` has five
 *           of six, so both degenerate cases are real records rather than hypotheticals, and
 *           `lens` is null on more than a quarter of the corpus. `Lens: —` eleven times over
 *           is the defect this requirement exists to prevent.
 *
 *   PUB-08  A camera and a lens read as a HUMAN NAME. The manifest stores what the camera
 *           wrote: `NIKON CORPORATION NIKON D5300`, `SONY ILCE-7CM2`, `samsung SM-N970F`.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY A LOOKUP TABLE AND NOT A PRETTIFIER
 *
 * 05-UI-SPEC.md §9.5 measured the whole corpus before choosing. The vocabulary is closed and
 * small. A prefix-stripping, title-casing prettifier gets the Nikon right and then returns
 * `SM-N970F`, `AC2001` and `ILCE-7CM2` UNCHANGED — three of the five non-null camera strings are
 * model codes no algorithm can decode. Rendering the raw code ships `SM-N970F` to a reader.
 * Rendering a guess ships a false claim about the equipment. Refusing the build does neither,
 * and the table is a two-line edit.
 *
 * The three model codes were resolved from manufacturer and device listings, NOT guessed, so
 * the next reader can audit rather than trust:
 *
 *   SM-N970F  -> Galaxy Note10
 *                https://www.samsung.com/levant/support/model/SM-N970FZKAMID/
 *                https://www.gsmarena.com/samsung_galaxy_note10-9788.php
 *   AC2001    -> OnePlus Nord
 *                https://deviceatlas.com/device-data/devices/oneplus/ac2001/59684389
 *   ILCE-7CM2 -> Sony Alpha 7C II
 *                https://www.adorama.com/isoa7cm2s.html
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS IS NOT IN THE SCHEMA AND NOT IN THE PIPELINE
 *
 * `src/schemas/photo.ts` stores what the camera wrote; that is the source of truth and it is
 * what a re-run of the pipeline would reproduce. Rewriting at ingest would destroy the raw value
 * for every record already committed, with no path to recover it. So the transform lives at the
 * point of DISPLAY, and the raw string stays in the data.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE LOOKUP IS EXACT — a recorded decision, not an oversight
 *
 * `nikon corporation nikon d5300` and `NIKON CORPORATION NIKON D5300 ` (trailing space) are both
 * REFUSED. The pipeline writes the string EXIF gave it; a value differing by case or by
 * whitespace was therefore not produced by the pipeline, and folding it in would silently accept
 * a hand-edit that the ingest path can never reproduce. The failure mode of exactness is a loud
 * build refusal naming the value and the photograph; the failure mode of normalisation is a
 * corrupted record that renders perfectly.
 *
 * The lookup is an OWN-PROPERTY check, not `table[value]`. A plain object inherits `constructor`,
 * `toString` and `valueOf` from `Object.prototype`, so a bare index would return a FUNCTION for a
 * stored value of `"toString"` and put `function toString() { [native code] }` on the page.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE ISO ROW'S VALUE IS "200" AND NOT "ISO 200"
 *
 * 05-UI-SPEC.md §9.3 says `iso` is a number and "renders as ISO 200"; 05-04-PLAN.md repeats it.
 * The row is a `<dl>` pair — §9.3 fixes the layout as a label in IBM Plex Mono beside a value in
 * DM Sans — so the rendered row is LABEL then VALUE. Putting "ISO 200" in the value as well
 * renders "ISO ISO 200". The label carries "ISO" and the value carries the number, which is the
 * only reading of §9.3 that reaches a reader as "ISO 200". Recorded here because it is a
 * deliberate departure from the plan's literal wording, and the unit suite asserts the joined
 * form so the requirement stays checked rather than reinterpreted away.
 *
 * ---------------------------------------------------------------------------------------------
 * PURITY IS A REQUIREMENT, NOT A STYLE
 *
 * This module is imported by a PRERENDERED Astro page, by the Lightbox island (a browser chunk),
 * and later by the Phase 7 admin. 05-01 MEASURED that the Astro prerender executes inside
 * `workerd`, not Node: `import.meta.url` is undefined, `process.cwd()` is `/bundle`, there is no
 * filesystem and `createRequire().resolve` is not a function. Its first implementation passed
 * 13/13 unit tests and then died in the build. So: no `node:` import, no filesystem, no
 * `process`, no `import.meta`, and no runtime import of anything — the only import below is
 * `import type`, which is erased entirely. A value import of the schema would drag zod into a
 * public route budgeted for zero framework JavaScript.
 *
 * `test/public/exif-display.unit.test.ts` scans this file for all six forms, with a canary per
 * pattern so a broken scanner cannot present as a clean module.
 */

import type { PhotoExif } from '../schemas/photo';

/** One rendered `<dl>` pair. `value` is always a non-empty display string. */
export interface ExifRow {
  label: string;
  value: string;
}

/**
 * Raw `exif.camera` -> the name a reader knows. Every key is a string that appears in
 * `data/portfolio_images.json`; `scripts/assert-exif-display-coverage.mjs` fails the build if
 * the manifest ever carries one that is missing here.
 */
export const CAMERA_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'NIKON CORPORATION NIKON D5300': 'Nikon D5300',
  'samsung Galaxy Z Fold5': 'Samsung Galaxy Z Fold5',
  // ILCE-7CM2 is Sony's model code for the Alpha 7C II (adorama.com/isoa7cm2s.html).
  'SONY ILCE-7CM2': 'Sony α7C II',
  // SM-N970F is the Galaxy Note10 (samsung.com support model SM-N970FZKAMID; GSMArena 9788).
  'samsung SM-N970F': 'Samsung Galaxy Note10',
  // AC2001 is the OnePlus Nord (deviceatlas.com device-data oneplus/ac2001).
  'OnePlus AC2001': 'OnePlus Nord',
});

/**
 * Raw `exif.lens` -> the name a reader knows. The en dashes are deliberate: a focal range and an
 * aperture range are ranges, and `–` is the character for a range. They are NOT the em dash
 * PUB-07 forbids, which is a PLACEHOLDER standing in for an absent value — an absent value here
 * produces no row at all, so no dash of any width is ever emitted for one.
 */
export const LENS_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  '18.0-55.0 mm f/3.5-5.6': '18–55mm f/3.5–5.6',
  '70.0-300.0 mm f/4.5-6.3': '70–300mm f/4.5–6.3',
  // The body is already named on the row above, so repeating "Samsung Galaxy Z Fold5" here
  // would render the phone's name twice in a six-row list.
  'Samsung Galaxy Z Fold5 Rear Wide Camera': 'Wide',
  'FE 28-60mm F4-5.6': 'Sony FE 28–60mm f/4–5.6',
});

/**
 * The lookup both `displayCamera` and `displayLens` use.
 *
 * `Object.hasOwn` rather than `table[raw] !== undefined`: see the own-property paragraph in the
 * header. The thrown message names the offending value because that is what the person fixing it
 * has to paste into the table; the coverage gate adds the photograph id, which is what tells
 * them which file to look at.
 */
function lookup(
  table: Readonly<Record<string, string>>,
  raw: string | null,
  field: 'camera' | 'lens'
): string | null {
  if (raw === null) {
    return null;
  }
  if (!Object.hasOwn(table, raw)) {
    throw new Error(
      `exif-display: no display name for ${field} ${JSON.stringify(raw)}. ` +
        `Add it to ${field === 'camera' ? 'CAMERA_DISPLAY_NAMES' : 'LENS_DISPLAY_NAMES'} in ` +
        `src/lib/exif-display.ts, with the manufacturer listing that decodes it. The lookup is ` +
        `exact, so a difference in case or trailing whitespace is a data defect, not a missing ` +
        `entry — check the stored value before adding a second row for it.`
    );
  }
  return table[raw];
}

/** The stored camera string as a human name. `null` in, `null` out. Unknown in, THROW. */
export function displayCamera(raw: string | null): string | null {
  return lookup(CAMERA_DISPLAY_NAMES, raw, 'camera');
}

/** The stored lens string as a human name. `null` in, `null` out. Unknown in, THROW. */
export function displayLens(raw: string | null): string | null {
  return lookup(LENS_DISPLAY_NAMES, raw, 'lens');
}

/**
 * The row order, fixed in one place. Camera and lens first because they are the equipment; then
 * focal length, aperture and shutter, which are the exposure, in the order a photographer sets
 * them; then ISO.
 */
export const EXIF_ROW_ORDER = Object.freeze([
  'camera',
  'lens',
  'focalLength',
  'aperture',
  'shutter',
  'iso',
] as const satisfies readonly (keyof PhotoExif)[]);

/** The `<dt>` text for each field. */
export const EXIF_LABELS: Readonly<Record<keyof PhotoExif, string>> = Object.freeze({
  camera: 'Camera',
  lens: 'Lens',
  focalLength: 'Focal length',
  aperture: 'Aperture',
  shutter: 'Shutter',
  iso: 'ISO',
});

/**
 * The rows to render for one photograph, in order, with every null field omitted.
 *
 * THIS IS THE ONLY IMPLEMENTATION OF PUB-07's OMIT RULE. A page must not build its own row list:
 * the requirement would then have two implementations and one of them grows an em dash the first
 * time someone thinks a gap looks unbalanced.
 *
 * An empty array is a complete answer and means "render no block at all" — see `product-peppers`.
 * The caller checks `rows.length === 0`, not each field.
 *
 * `photo.date` is deliberately unreachable from here: this takes the exif object only. §9.4 rules
 * the stored date out of the rendered site (the 40 records carry two distinct values inside a
 * ten-day ingest window, so it is a publish date wearing a capture date's clothes) and 05-14
 * gates the photo routes for it.
 */
export function exifRows(exif: PhotoExif): ExifRow[] {
  const { camera, lens, aperture, shutter, iso, focalLength } = exif;

  const values: Record<keyof PhotoExif, string | null> = {
    camera: displayCamera(camera),
    lens: displayLens(lens),
    focalLength: focalLength,
    aperture: aperture,
    shutter: shutter,
    // A number, and the only field that is not already a display string. The unit is carried by
    // the LABEL, so a reader reads "ISO 200" across the pair.
    iso: iso === null ? null : String(iso),
  };

  const rows: ExifRow[] = [];
  for (const field of EXIF_ROW_ORDER) {
    const value = values[field];
    if (value === null || value === '') {
      continue;
    }
    rows.push({ label: EXIF_LABELS[field], value });
  }
  return rows;
}
