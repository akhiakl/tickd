"use client";

import { useCallback, useSyncExternalStore } from "react";
import { drainController } from "@/lib/sync/drain";

// Module-level, not created inside the hook: useSyncExternalStore requires
// getServerSnapshot() to return a *referentially stable* value when
// nothing's changed (React warns "should be cached to avoid an infinite
// loop" otherwise, confirmed via this hook triggering exactly that in a
// real browser - jsdom under Vitest never exercises the SSR snapshot path,
// so unit tests alone didn't catch it). A `useCallback`-wrapped function
// that *returns a fresh object literal every call* doesn't satisfy that:
// memoizing the getter itself isn't the same as memoizing its result.
const SERVER_SNAPSHOT = { pendingCount: 0, stuckCount: 0 };

/** Live view of the tx queue's backlog - starts the drain loop on first use
 * (idempotent, see DrainController.start) and re-renders whenever the
 * pending/stuck counts change. Used by `group-tab-header.tsx` to show
 * "syncing N…" and a manual retry affordance once something's stuck. */
export function useTxQueueStatus() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    drainController.start();
    return drainController.subscribe(onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => drainController.getSnapshot(), []);
  // Same snapshot shape server-side (empty queue) - the real state only
  // exists client-side, so SSR always renders "nothing pending."
  const getServerSnapshot = useCallback(() => SERVER_SNAPSHOT, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
