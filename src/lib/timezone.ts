/**
 * Local wall-clock hour (0-23) and weekday for a person's own IANA zone,
 * used to decide "is it their 8pm right now" rather than the server's -
 * see the cron routes under src/app/api/cron. `null` falls back to UTC
 * (a user whose browser hasn't synced one yet, or a stored value that
 * somehow isn't a real zone Intl recognizes) - notifications still work
 * for them, just on UTC clock time until a sync happens.
 */
export function localHour(timezone: string | null): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone ?? "UTC",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value;
  // Intl's 24-hour format can render midnight as "24" depending on the
  // runtime's ICU data - normalize it to 0 rather than let a strict
  // `=== targetHour` check silently miss it.
  return hour ? Number(hour) % 24 : new Date().getUTCHours();
}

export type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export function localWeekday(timezone: string | null): Weekday {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone ?? "UTC",
    weekday: "short",
  }).format(new Date()) as Weekday;
}

/**
 * `YYYY-MM-DD` for a given instant, read in a person's own IANA zone - the
 * timezone-aware counterpart to challenge-stats' `toISODate` (which always
 * reads UTC, and stays UTC for the Wall's shared grid and for the raw
 * `daily_checks.date` column). Used two ways: bucketing a `checkedAt`
 * timestamp into that person's own calendar day for their personal
 * streak/history, and finding their own "today" for framing their own
 * pages. `null` falls back to UTC, same convention as localHour/localWeekday.
 */
export function localISODate(date: Date, timezone: string | null): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
