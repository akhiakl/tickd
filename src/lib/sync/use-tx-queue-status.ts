"use client";

import { useCallback, useSyncExternalStore } from "react";
import { drainController } from "@/lib/sync/drain";

/** Live view of the tx queue's backlog - starts the drain loop on first use
 * (idempotent, see DrainController.start) and re-renders whenever the
 * pending/stuck counts change. Used by `today-header.tsx` to show "syncing
 * N…" and a manual retry affordance once something's stuck. */
export function useTxQueueStatus() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    drainController.start();
    return drainController.subscribe(onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => drainController.getSnapshot(), []);
  // Same snapshot shape server-side (empty queue) - the real state only
  // exists client-side, so SSR always renders "nothing pending."
  const getServerSnapshot = useCallback(() => ({ pendingCount: 0, stuckCount: 0 }), []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
