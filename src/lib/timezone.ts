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
