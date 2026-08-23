"use client";

import { useSyncExternalStore } from "react";

/**
 * A member's live wall-clock time in their own elected timezone, formatted
 * like "4:15 PM" - re-read every tick so it doesn't go stale while the page
 * sits open. Ticks every 30s: displayed at minute precision, so anything
 * finer just wastes renders.
 *
 * Built on `useSyncExternalStore` (same "mounted" pattern as
 * src/components/nav/theme-toggle.tsx) rather than useState+useEffect: the
 * server snapshot is always `null`, so the very first client render -
 * which has to match the server's markup - renders nothing, and the real
 * value only appears once React reconciles against the client snapshot
 * post-hydration. That's what makes this hydration-safe without a
 * setState-in-effect.
 */
export function useLocalTime(timezone: string | null): string | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!timezone) return () => {};
      const id = setInterval(onStoreChange, 30_000);
      return () => clearInterval(id);
    },
    () => format(timezone),
    () => null,
  );
}

function format(timezone: string | null): string | null {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    // An invalid/unrecognized zone string (shouldn't happen past
    // setTimezone's validation, but data can outlive the code that wrote
    // it) - just don't show a time rather than throw.
    return null;
  }
}
