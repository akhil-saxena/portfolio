import type { PhotoExif } from '../schemas/photo';

export interface ExifRow {
  label: string;
  value: string;
}

export const CAMERA_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'NIKON CORPORATION NIKON D5300': 'Nikon D5300',
  'samsung Galaxy Z Fold5': 'Samsung Galaxy Z Fold5',
  'SONY ILCE-7CM2': 'Sony α7C II',
  'samsung SM-N970F': 'Samsung Galaxy Note10',
  'OnePlus AC2001': 'OnePlus Nord',
});

export const LENS_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  '18.0-55.0 mm f/3.5-5.6': '18–55mm f/3.5–5.6',
  '70.0-300.0 mm f/4.5-6.3': '70–300mm f/4.5–6.3',
  'Samsung Galaxy Z Fold5 Rear Wide Camera': 'Wide',
  'FE 28-60mm F4-5.6': 'Sony FE 28–60mm f/4–5.6',
});

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

export function displayCamera(raw: string | null): string | null {
  return lookup(CAMERA_DISPLAY_NAMES, raw, 'camera');
}

export function displayLens(raw: string | null): string | null {
  return lookup(LENS_DISPLAY_NAMES, raw, 'lens');
}

export const EXIF_ROW_ORDER = Object.freeze([
  'camera',
  'lens',
  'focalLength',
  'aperture',
  'shutter',
  'iso',
] as const satisfies readonly (keyof PhotoExif)[]);

export const EXIF_LABELS: Readonly<Record<keyof PhotoExif, string>> = Object.freeze({
  camera: 'Camera',
  lens: 'Lens',
  focalLength: 'Focal length',
  aperture: 'Aperture',
  shutter: 'Shutter',
  iso: 'ISO',
});

export function exifRows(exif: PhotoExif): ExifRow[] {
  const { camera, lens, aperture, shutter, iso, focalLength } = exif;

  const values: Record<keyof PhotoExif, string | null> = {
    camera: displayCamera(camera),
    lens: displayLens(lens),
    focalLength: focalLength,
    aperture: aperture,
    shutter: shutter,
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
