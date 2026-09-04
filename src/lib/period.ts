/**
 * The one place a résumé date range becomes a display string (OD-4, Option A — including
 * education).
 *
 * WHY THIS EXISTS
 * ---------------
 * `data/resume.json` used to store `period: "Jul 2023 – Present"` alongside nothing else. That is
 * a lossy encoding of a date range: it cannot be sorted, cannot be validated, and leaves "is this
 * role current?" unmodelled except as the English word `Present`. 00-ADMIN-IA §5 chose the
 * structured shape and named this file's acceptance test — exact reproduction of the four strings
 * that were on disk, so migrating changes the stored shape and changes nothing a reader sees.
 *
 * The legacy `src/types.ts` header documented the opposite arrangement — the admin split dates
 * into `startMonth/startYear/endMonth/endYear/isPresent` while `resume.json` stored a `period`
 * string, and the two drifted. Storing both is the defect. So `period` is gone from disk and this
 * function is the only thing that produces it.
 *
 * WHAT THIS FILE MAY NOT USE, AND WHY
 * -----------------------------------
 * 1. NO Node-only imports. This module is imported by the content schema, which executes inside
 *    `workerd` during prerender, and by a React component in Phase 5. `node:fs` and friends are
 *    not available in either.
 *
 * 2. NO `Intl.DateTimeFormat`, `toLocaleString` or `toLocaleDateString`. All three are
 *    locale- AND ICU-build-dependent. `workerd` does not ship the same ICU data as the
 *    developer's Node, so the identical code can emit `Jul` on a laptop and `July` or `juil.` in
 *    production with no code change and no failing test — the same class of failure as a value
 *    that renders correctly in jsdom and wrongly in a browser. The month table below is explicit
 *    for that reason and must stay explicit.
 *
 * 3. The separator is U+2013 EN DASH with a space either side, and it is written as the ESCAPE
 *    `\u2013` rather than as a pasted glyph. U+2013 and U+002D are visually near-identical in most
 *    editors and terminals, so a well-meaning normalisation to a hyphen produces a diff that
 *    looks like no change at all. As an escape, that edit is visible.
 */

/**
 * Three-letter month names, index 0 = January. An explicit table, not a derivation — see note 2
 * in the header. Do not replace this with a locale API, however tidy that looks.
 */
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** U+2013 EN DASH. Written as an escape on purpose — see note 3 in the header. */
/**
 * EXPORTED, because a second module needs a range separator and re-typing `–` would be a second
 * decision that looks identical until one of them changes. `IdentityRail` spells year-only ranges
 * with it; `formatPeriod` below spells month ranges. One character, one definition.
 */
export const EN_DASH = '\u2013';

/** The separator as it appears between the two halves: space, en dash, space. */
const SEPARATOR = ` ${EN_DASH} `;

/** The word that stands in for an end date on a role that has not ended. */
const PRESENT = 'Present';

/**
 * A date range as it is stored. `endMonth` and `endYear` are ABSENT — not `null`, not `0` — when
 * `isPresent` is true, so the shape can hold exactly one answer to "has this ended?".
 */
export interface PeriodFields {
  startMonth: number;
  startYear: number;
  endMonth?: number;
  endYear?: number;
  isPresent: boolean;
}

function monthName(month: number, which: string): string {
  if (!Number.isInteger(month) || month < 1 || month > MONTH_NAMES.length) {
    throw new RangeError(
      `${which} must be an integer month 1-12, received ${JSON.stringify(month)}`
    );
  }
  return MONTH_NAMES[month - 1] as string;
}

function yearText(year: number, which: string): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError(
      `${which} must be a four-digit integer year, received ${JSON.stringify(year)}`
    );
  }
  return String(year);
}

/**
 * Render a stored date range as the display string.
 *
 * `Jul 2023 – Present`, `Nov 2022 – Jun 2023`. Three-letter month, four-digit year, U+2013 with a
 * space on each side.
 *
 * Throws rather than guessing. A résumé date that cannot be rendered is a content bug that should
 * stop a build, not a blank span on a page a hiring manager is reading.
 */
export function formatPeriod(fields: PeriodFields): string {
  const start = `${monthName(fields.startMonth, 'startMonth')} ${yearText(fields.startYear, 'startYear')}`;

  if (fields.isPresent) {
    // The two-representations guard, stated in code rather than only in a schema. An entry that
    // is current AND carries an end date is the exact drift this shape exists to make impossible.
    if (fields.endMonth !== undefined || fields.endYear !== undefined) {
      throw new TypeError(
        'isPresent is true but endMonth/endYear are set — a range cannot both be open and closed'
      );
    }
    return `${start}${SEPARATOR}${PRESENT}`;
  }

  if (fields.endMonth === undefined || fields.endYear === undefined) {
    throw new TypeError(
      'isPresent is false but endMonth/endYear are missing — the range has no end'
    );
  }

  const end = `${monthName(fields.endMonth, 'endMonth')} ${yearText(fields.endYear, 'endYear')}`;
  return `${start}${SEPARATOR}${end}`;
}
