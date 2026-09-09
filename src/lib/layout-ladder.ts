/*
 * The single source of the gutter ladder. CSS cannot import TypeScript, so the same rungs are
 * written twice and `scripts/assert-gutter-ladder.mjs` is what keeps the two copies honest.
 *
 * Five sites take the gutter: `.pub-shell`, `.pub-bar` (the design system's AppBar), and
 * `.pub-footer` (its Footer). The AppBar and Footer pair is the one that gets missed, because
 * their padding comes from the design system rather than from here. Filed under 05-06.
 */
export type GutterRung = {
  readonly minWidth: number | null;
  readonly token: string;
  readonly px: number;
};

export const GUTTER_RUNGS: readonly GutterRung[] = [
  { minWidth: null, token: '--space-4', px: 16 },
  { minWidth: 375, token: '--space-6', px: 24 },
  { minWidth: 673, token: '--space-8', px: 32 },
  { minWidth: 1024, token: '--space-12', px: 48 },
];

export const BREAKPOINTS: readonly number[] = GUTTER_RUNGS.flatMap((rung) =>
  rung.minWidth === null ? [] : [rung.minWidth]
);

export const MASONRY_GAP: { readonly token: string; readonly px: number } = {
  token: '--space-4',
  px: 16,
};

export const PEEK_GAP: { readonly token: string; readonly px: number } = {
  token: '--space-2',
  px: 8,
};

export const ACT_ONE_MAX = 880;

export const PAGE_MAX: {
  readonly home: number;
  readonly work: number;
  readonly photos: number;
  readonly band: number;
} = {
  home: 1080,
  work: 1280,
  photos: 1280,
  band: 1080,
};

export function gutterAt(width: number): number {
  if (!Number.isFinite(width) || width < 0) {
    throw new TypeError(
      `gutterAt: width must be a finite, non-negative number of pixels; received ${String(width)}. ` +
        'Returning the base rung for an unusable width would present as a layout bug at a ' +
        'viewport size nobody is looking at.'
    );
  }

  let inForce = GUTTER_RUNGS[0];
  for (const rung of GUTTER_RUNGS) {
    if (rung.minWidth === null || width >= rung.minWidth) inForce = rung;
  }
  return inForce.px;
}
