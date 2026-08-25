"use client";

/**
 * The Today tab's subtitle for `GroupTabHeader` - split out as its own
 * client component (rather than computed in the Server Component page and
 * passed down as a plain string) specifically so `new Date()` runs in the
 * viewer's own browser, not on the server: the server has no idea what
 * timezone the viewer is actually in, and this app is otherwise careful
 * to never assume "now" server-side means anything to a particular person
 * (see `localToday`/`localDayIndex` throughout src/types/domain.ts) - a
 * server-computed date string here would silently reintroduce exactly
 * that assumption for the one thing on this page that's just cosmetic
 * (the written-out date), not the actual `dayIndex`/`durationDays` count,
 * which the server already computes correctly per-viewer.
 */
export function TodayDateLabel({
  dayIndex,
  durationDays,
}: {
  dayIndex: number;
  durationDays: number;
}) {
  const today = new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <span className="text-muted truncate text-[13px]" data-testid="today-header-day">
      Day {dayIndex} of {durationDays} - {today}
    </span>
  );
}
