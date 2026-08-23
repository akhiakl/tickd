"use client";

import { useEffect } from "react";
import { setTimezone } from "@/server/actions/account";

const STORAGE_KEY = "tickd-tz-synced";

/**
 * Sets the signed-in user's timezone to the browser's detected IANA zone,
 * but only as a one-time *default* - a person's timezone is an elected
 * preference (changeable any time in Account settings), never something
 * silently overwritten by whatever a later visit's browser/network
 * happens to report. The actual "only if not already set" guard lives
 * server-side in `setTimezone` (src/server/actions/account.ts), so this
 * component staying dumb and firing on every mount is harmless - it's
 * mounted unconditionally in the root layout (including for anonymous
 * visitors; setTimezone reads the session itself and no-ops when there
 * isn't one) precisely so there's nothing to gate here.
 *
 * localStorage is only a "don't bother the server every navigation"
 * optimization, not the source of truth - a viewer with storage blocked
 * or cleared just re-syncs (a harmless no-op once a timezone is set),
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
