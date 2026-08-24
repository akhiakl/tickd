"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { drainController } from "@/lib/sync/drain";

const POLL_INTERVAL_MS = 15_000;
// A little over one poll interval: covers a sync that landed just before
// this poll fired, without reaching so far back that an old sync could
// mask a genuinely new groupmate change. See the self-sync guard below.
const SELF_SYNC_GRACE_MS = POLL_INTERVAL_MS * 1.5;

/**
 * Phase 3 (docs/local-first-sync-engine-plan.md): the read side of live
 * sync. Polls `/api/g/[groupId]/sync-status` and triggers a
 * `router.refresh()` (a normal, cache-aware server re-render - not a
 * client-side merge) the moment it sees the group's shared tag timestamp
 * move, so a groupmate's tick shows up without the viewer having to
 * navigate away and back. Polling, not a persistent connection - see the
 * plan's Phase 3 section for why that's the actual fit for this app's
 * REST-only Redis client and serverless hosting, not a compromise made
 * casually.
 *
 * Paused while the tab is hidden (no `setTimeout` chain running at all,
 * not just skipped fetches - a backgrounded tab shouldn't burn requests
 * for updates nobody's looking at) and resumed immediately on refocus or
 * reconnect, rather than waiting out the rest of the interval.
 */
export function useGroupLiveSync(groupId: string) {
  const router = useRouter();
  // null until the first successful poll - that first response is just
  // "where we already are," not a change to react to (there's nothing to
  // compare it against yet).
  const lastSeenRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    lastSeenRef.current = null;

    async function poll() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/g/${groupId}/sync-status`, { cache: "no-store" });
        if (res.ok) {
          const { updatedAt } = (await res.json()) as { updatedAt: number };
          if (lastSeenRef.current === null) {
            lastSeenRef.current = updatedAt;
          } else if (updatedAt > lastSeenRef.current) {
            lastSeenRef.current = updatedAt;
            // setChecked et al. touch the same tag:group:<id> timestamp
            // this poll watches, so this device's own write landing looks
            // identical to a groupmate's change. Refreshing for your own
            // already-reflected tap is exactly the jarring
            // reload-right-after-you-just-did-something this guard
            // exists to avoid - see DrainController.getLastLocalSyncAt's
            // own doc. A genuine groupmate change inside this same grace
            // window is the one case this misses; it's picked up on the
            // very next poll instead; see SELF_SYNC_GRACE_MS's comment.
            const lastLocalSyncAt = drainController.getLastLocalSyncAt();
            const selfCaused =
              lastLocalSyncAt !== null && Date.now() - lastLocalSyncAt < SELF_SYNC_GRACE_MS;
            if (!selfCaused) router.refresh();
          }
        }
      } catch {
        // Transient network error on a read - nothing to persist or
        // retry-with-backoff (unlike the tx queue's writes); just try
        // again next tick.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    function resume() {
      if (timer) return; // already running
      void poll();
    }

    // The first poll only ever establishes a baseline (lastSeenRef starts
    // null, so it can't trigger a refresh) - there's nothing to act on
    // yet, so it doesn't need to compete with the page's own initial data
    // fetching for network/attention. Scheduled like any other tick
    // instead of fired immediately; `resume()` (tab refocus/reconnect)
    // still polls right away, since that *is* meant to catch up promptly.
    if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [groupId, router]);
}
