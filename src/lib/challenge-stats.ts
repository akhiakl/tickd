/**
 * Pure date and scoring helpers for the daily challenge. Kept free of any
 * database or Next.js import so they're trivial to unit test and safe to
 * reuse on both server and client.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses a `YYYY-MM-DD` string as a UTC date, avoiding local-timezone drift. */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayISODate(): string {
  return toISODate(new Date());
}

/** Whole days between two `YYYY-MM-DD` dates (b - a), floor-clamped at 0. */
export function daysBetween(aISO: string, bISO: string): number {
  const diff = parseISODate(bISO).getTime() - parseISODate(aISO).getTime();
  return Math.max(0, Math.round(diff / MS_PER_DAY));
}

/** 1-based challenge day for `today`, clamped to the challenge's duration. */
export function challengeDayIndex(
  startDateISO: string,
  durationDays: number,
  todayISO: string,
): number {
  const elapsed = daysBetween(startDateISO, todayISO) + 1;
  return Math.min(Math.max(elapsed, 1), durationDays);
}

/** The list of `YYYY-MM-DD` dates from the challenge start through `count` days. */
export function dateRange(startDateISO: string, count: number): string[] {
  const start = parseISODate(startDateISO);
  return Array.from({ length: count }, (_, i) =>
    toISODate(new Date(start.getTime() + i * MS_PER_DAY)),
  );
}

/**
 * Current streak in whole days, walking backward from the end of the list.
 * A day "counts" toward the streak if its check count is greater than zero.
 * The list should be ordered oldest to newest and only cover days that have
 * already happened (today included, if applicable).
 */
export function computeStreak(countsOldToNew: number[]): number {
  let streak = 0;
  for (let i = countsOldToNew.length - 1; i >= 0; i--) {
    if (countsOldToNew[i] > 0) streak++;
    else break;
  }
  return streak;
}

/**
 * The "current streak" as shown in the UI, for a list of counts ending in
 * today. A day that hasn't happened yet (today, before you've ticked
 * anything) shouldn't zero out a streak you're still carrying in from
 * yesterday - so this counts the trailing run through yesterday, then
 * adds one back the moment today has at least one tick.
 */
export function currentStreakWithToday(countsOldToNewIncludingToday: number[]): number {
  const priorDays = countsOldToNewIncludingToday.slice(0, -1);
  const today = countsOldToNewIncludingToday.at(-1) ?? 0;
  return computeStreak(priorDays) + (today > 0 ? 1 : 0);
}

/** Longest run of consecutive days with a non-zero count. */
export function computeBestStreak(countsOldToNew: number[]): number {
  let best = 0;
  let run = 0;
  for (const count of countsOldToNew) {
    if (count > 0) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Sum of all counts - total items ticked across the challenge so far. */
export function computeTotal(countsOldToNew: number[]): number {
  return countsOldToNew.reduce((sum, n) => sum + n, 0);
}

export type RankWindow = "week" | "month" | "all";

/**
 * The score used for a leaderboard ranking: total items ticked, restricted
 * to the trailing window when one is requested.
 */
export function rankScore(countsOldToNew: number[], window: RankWindow): number {
  if (window === "week") {
    return computeTotal(countsOldToNew.slice(-7));
  }
  return computeTotal(countsOldToNew);
}
