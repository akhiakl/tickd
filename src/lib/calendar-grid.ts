import { parseISODate, toISODate } from "@/lib/challenge-stats";

export type MonthKey = { year: number; month: number }; // month is 0-11

export type MonthInfo = MonthKey & {
  key: string; // "2026-08", stable identity for a month
  label: string; // "August 2026"
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/**
 * Every calendar month a challenge's date range touches, oldest first -
 * for a start date of Aug 24 running 31 days (through Sep 23), that's
 * [August, September], not a full year of empty months either side. Used
 * to both build the Wall's prev/next month navigation and clamp it, so a
 * challenge can't be paged past its own start or end month.
 */
export function monthsInRange(startDateISO: string, endDateISO: string): MonthInfo[] {
  const start = parseISODate(startDateISO);
  const end = parseISODate(endDateISO);
  const months: MonthInfo[] = [];

  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      year,
      month,
      key: monthKey(year, month),
      label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(Date.UTC(year, month, 1)),
      ),
    });
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  return months;
}

/**
 * A month laid out as calendar weeks (Sun-first), each cell either a
 * `YYYY-MM-DD` in that month or `null` for the leading/trailing padding
 * days that fill out the first/last week - the same shape every calendar
 * UI uses, kept as plain date strings (not Date objects) so callers can
 * key straight into the countsByDate maps they already have.
 */
export function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay(); // 0 (Sun) - 6 (Sat)

  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISODate(new Date(Date.UTC(year, month, i + 1))),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Finds the index of the month containing `dateISO` within `months`,
 * clamping to the nearest end if it falls outside the range entirely -
 * used to default the Wall's initial month to "today" (clamped into the
 * challenge's own span if today is before it starts or after it ends). */
export function monthIndexFor(months: MonthInfo[], dateISO: string): number {
  if (months.length === 0) return 0;
  const date = parseISODate(dateISO);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const idx = months.findIndex((m) => m.year === year && m.month === month);
  if (idx !== -1) return idx;

  const first = months[0];
  const before = year < first.year || (year === first.year && month < first.month);
  return before ? 0 : months.length - 1;
}
