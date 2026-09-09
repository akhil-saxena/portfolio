/*
 * Runs in workerd and in the browser, so no locale-dependent date API: no `Intl.DateTimeFormat`,
 * no `toLocaleString`, no `toLocaleDateString`. All three vary by ICU build. Month names are the
 * table below; the separator is the escaped en dash, never the literal character.
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

export const EN_DASH = '\u2013';

const SEPARATOR = ` ${EN_DASH} `;

export const PRESENT = 'Present';

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

export function formatPeriod(fields: PeriodFields): string {
  const start = `${monthName(fields.startMonth, 'startMonth')} ${yearText(fields.startYear, 'startYear')}`;

  if (fields.isPresent) {
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
