"use client";

import { useLocalTime } from "@/lib/use-local-time";
import { cn } from "@/lib/utils";

/**
 * A member's live local time ("4:15 PM"), muted, next to their name -
 * renders nothing until mounted (see useLocalTime) and nothing at all for
 * a member with no elected timezone yet, rather than falling back to UTC
 * silently for someone else's clock.
 */
export function LocalTimeBadge({
  timezone,
  className,
}: {
  timezone: string | null;
  className?: string;
}) {
  const time = useLocalTime(timezone);
  if (!time) return null;
  return <span className={cn("text-muted", className)}>{time}</span>;
}
