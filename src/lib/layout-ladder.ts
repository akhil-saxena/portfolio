/**
 * The gutter ladder, the masonry gap and the page maxima — one home, in TypeScript.
 * (Phase 5, plan 05-05, Task 2. Numbers CARRIED from `05-UI-SPEC.md` §2.1 and §2.2, which carried
 * them verbatim from `00-PUBLIC-DESIGN-NOTES.md` §"Responsive shell".)
 *
 * ================================================================================================
 * THE TRAP THIS MODULE EXISTS TO MAKE UNREPRESENTABLE  (§2.1)
 * ================================================================================================
 *
 * The ladder is ONE custom property and FIVE derived rules. Every full-bleed row cancels the
 * gutter with a negative margin and pays it back as padding. Hardcode the widest rung in one of
 * them and the AppBar or the Footer overhangs by 32px a side — which presents as a horizontal
 * scroll, i.e. the exact R-6 violation the ladder exists to close, reintroduced by the fix for it.
 *
 * THE FIVE SITES, so the CSS author in 05-06 has the list rather than the warning:
 *
 *   1. `.pub-shell`  padding          — the ladder itself, where `--pub-gutter` is declared
 *   2. `.pub-bar`    negative margin  — the AppBar row breaking out of the shell
 *   3. the AppBar's own padding       — paying the gutter back inside the bar
 *   4. `.pub-footer` negative margin  — the Footer row breaking out of the shell
 *   5. the Footer's own padding       — paying it back inside the footer
 *
 * **`.pub-footer` is the one that gets missed.** It is last in the file, it is the one nobody
 * scrolls to when checking a layout change, and it is visually identical to a correct footer until
 * the page is 32px wider than the viewport.
 *
 * ================================================================================================
 * CSS CANNOT IMPORT TYPESCRIPT, SO THESE NUMBERS LIVE IN TWO PLACES. A GATE CLOSES THAT, NOT HOPE.
 * ================================================================================================
 *
 * `src/styles/public-shell.css` will hold the same four rungs as `@media (min-width: …)` blocks
 * declaring `--pub-gutter`. That is a genuine duplication and it cannot be removed — a stylesheet
 * has no import mechanism that reaches a module.
 *
 * **05-06 owns `scripts/assert-gutter-ladder.mjs`**, which parses the BUILT CSS for the
 * `--pub-gutter` declarations and their media-query minima and asserts they match this module rung
 * for rung. It is named here, on this side of the duplication, so the constraint is discoverable
 * from either end: a reader who arrives at this file and changes a number must be able to find out
 * that a stylesheet and a gate also encode it, without having read the plan that said so.
 *
 * ================================================================================================
 * WHY IT IS A MODULE AT ALL, GIVEN THE CSS CANNOT READ IT
 * ================================================================================================
 *
 * Two consumers that are not CSS:
 *
 *   - `sizesFor` in `src/lib/photo-srcset.ts`. A `sizes` attribute that disagrees with the layout
 *     is a SILENTLY wrong download size: nothing renders incorrectly, the browser just fetches the
 *     wrong file. There is no visual symptom and no error, so the only defence is that the string
 *     and the layout are computed from one set of numbers.
 *   - 05-15's six-class browser audit, which runs in a browser context and needs to know what the
 *     gutter should be at each width in order to assert what it is.
 *
 * Both of those reach this file from a PRERENDERED page, which executes inside **workerd** (05-01
 * measured it: `import.meta.url` is `undefined`, `process.cwd()` is `/bundle`, there is no
 * filesystem). So this module imports NOTHING — not `node:`, not the design system, not a data
 * file — and its test asserts that the specifier list is empty rather than merely `node:`-free.
 *
 * ================================================================================================
 * WHERE THE NUMBERS CAME FROM
 * ================================================================================================
 *
 * Measured in a real browser at all six device classes, reaching zero horizontal scroll on 54
 * route×class combinations. The tokens are the design system's — `monochrome.css` declares no
 * `--space-*` of its own (MEASURED; the ownership allowlist in its header), so the scale is
 * `@akhil-saxena/design-system`'s and this file composes it rather than adding a step.
 *
 * `test/public/layout-ladder.unit.test.ts` checks each `token`/`px` pair against the design
 * system's real `dist/tokens.css`, not against `4 × N` arithmetic alone: a portfolio consuming a
 * published package has to survive that package renumbering its scale, and arithmetic that agrees
 * with itself would ratify the drift instead of catching it.
 */

/** One rung of the ladder. `minWidth: null` is the unconditioned base rung. */
export type GutterRung = {
  /** The `min-width` in px at which this rung takes force, or `null` for the base rung. */
  readonly minWidth: number | null;
  /** The design-system spacing token the CSS declares. */
  readonly token: string;
  /** What that token resolves to, in px. Both halves are carried so a typo in either is caught. */
  readonly px: number;
};

/**
 * The four rungs, base first, ascending. §2.1.
 *
 * ```css
 * .pub-shell { --pub-gutter: var(--space-4);  padding: 0 var(--pub-gutter); }  // class 1, base
 * @media (min-width:  375px) { .pub-shell { --pub-gutter: var(--space-6);  } } // class 2
 * @media (min-width:  673px) { .pub-shell { --pub-gutter: var(--space-8);  } } // classes 3-4
 * @media (min-width: 1024px) { .pub-shell { --pub-gutter: var(--space-12); } } // classes 5-6
 * ```
 *
 * This is the ONLY place in the module where any of these numbers is written. `BREAKPOINTS` below
 * is derived from it, and the suite counts each breakpoint's occurrences in this file's code to
 * prove that — two literal lists that agree today are the duplication this module removes.
 */
export const GUTTER_RUNGS: readonly GutterRung[] = [
  { minWidth: null, token: '--space-4', px: 16 },
  { minWidth: 375, token: '--space-6', px: 24 },
  { minWidth: 673, token: '--space-8', px: 32 },
  { minWidth: 1024, token: '--space-12', px: 48 },
];

/**
 * The three viewport widths at which the ladder steps — DERIVED, never restated.
 *
 * `flatMap` rather than `filter().map()` so the `null` is removed at the type level too and no
 * cast is needed; a cast here would be the one place a wrong assumption could hide.
 */
export const BREAKPOINTS: readonly number[] = GUTTER_RUNGS.flatMap((rung) =>
  rung.minWidth === null ? [] : [rung.minWidth]
);

/**
 * The masonry column-gap and the tile bottom margin, at EVERY device class. §2.1, §7.1.
 *
 * It is `--space-4` and the base gutter rung is also `--space-4`, and that is a COINCIDENCE rather
 * than a rule — one is the space between two photographs, the other is the space between the page
 * and the edge of the screen, and they are free to diverge. So this is declared, not derived from
 * `GUTTER_RUNGS[0]`. Deriving it would encode the coincidence as a constraint and make a future
 * "the gallery needs more air between tiles" edit silently move the page gutter as well.
 */
export const MASONRY_GAP: { readonly token: string; readonly px: number } = {
  token: '--space-4',
  px: 16,
};

/**
 * The layout maxima, in px. §2.2 — each is `min(cap, 100%)` in effect, so none needs a breakpoint.
 *
 *   home   1080
 *   work   1280
 *   photos 1280
 *   band   1080   Work's employment band (J3, CONFIRMED by Akhil 2026-08-19)
 *
 * The prose measure (`68ch`) is deliberately NOT here: it is a typographic unit, not a pixel one,
 * and putting it in a px-valued record would invite `min(68, …)` arithmetic that means nothing.
 */
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

/**
 * The gutter in force at a given viewport width, in px.
 *
 * The last rung whose `minWidth` is `null` or `<= width` wins, which is exactly how the cascade
 * resolves the four `@media (min-width: …)` blocks. `<=` and not `<`: a media query fires AT its
 * minimum, so `gutterAt(375)` is the ≥375 rung and `gutterAt(374)` is the base one.
 *
 * REFUSES a width that is not a finite non-negative number rather than returning the base rung for
 * it. A `NaN` from a caller's arithmetic that quietly answered 16 would present as "the ladder is
 * broken at wide viewports" in 05-15's browser audit — days later, in the wrong file, and looking
 * like a CSS bug.
 */
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
