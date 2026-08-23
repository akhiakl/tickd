"use client";

import { useEffect } from "react";
import { setTimezone } from "@/server/actions/account";

const STORAGE_KEY = "tickd-tz-synced";

/**
 * Syncs the browser's IANA timezone to the signed-in user's row (used by
 * the notification cron routes to fire at each person's own local time,
 * not one fixed UTC hour for everyone - see the `timezone` column's
 * comment in src/server/db/schema/users.ts). Mounted unconditionally in
 * the root layout, so this runs for anonymous visitors too; setTimezone
 * itself reads the session and no-ops rather than throwing when there
 * isn't one, so there's nothing to gate here.
 *
 * localStorage is only a "don't bother the server every navigation"
 * optimization, not the source of truth - a viewer with storage blocked
 * or cleared just re-syncs (or resyncs once more than strictly needed),
 * never breaks.
 */
export function TimezoneSync() {
  useEffect(() => {
    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected) return;

    try {
      if (localStorage.getItem(STORAGE_KEY) === detected) return;
    } catch {
      // Storage unavailable (private mode, blocked) - fall through and
      // sync anyway rather than never syncing.
    }

    setTimezone(detected).then((result) => {
      if (!result.ok) return;
      try {
        localStorage.setItem(STORAGE_KEY, detected);
      } catch {
        // Nothing to do if storage can't be written - just means this
        // syncs again next visit instead of being remembered.
      }
    });
  }, []);

  return null;
}
