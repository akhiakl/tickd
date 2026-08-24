"use client";

import { useEffect, useState } from "react";
import { ALL_BADGES } from "@/lib/achievements";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { Confetti } from "@/components/ui/confetti";

function storageKey(groupId: string) {
  return `tickd-badges-seen-${groupId}`;
}

function readSeen(groupId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(groupId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    // Storage blocked/unavailable, or a value that isn't the JSON array
    // this code writes (shouldn't happen, but data can outlive the code
    // that wrote it) - treat as "nothing seen yet" rather than throwing.
    return new Set();
  }
}

/**
 * Celebrates the first time this page's viewer sees each of their own
 * `earnedBadgeIds` show up - same "diff against a localStorage set,
 * once" shape as StreakMilestoneToast, applied to a set of ids instead of
 * a single crossing threshold. Only meant to be mounted with the
 * *viewer's own* badges (the Today page passes `me`'s) - there's nothing
 * here that checks isMe, so it's on the caller not to wire it up for
 * someone else's.
 */
export function NewBadgeToast({
  groupId,
  earnedBadgeIds,
}: {
  groupId: string;
  earnedBadgeIds: string[];
}) {
  const { message, showToast } = useToast(2600);
  const [celebration, setCelebration] = useState(0);
  const key = earnedBadgeIds.join(",");

  useEffect(() => {
    const seen = readSeen(groupId);
    const newlyEarned = earnedBadgeIds.filter((id) => !seen.has(id));
    if (newlyEarned.length === 0) return;

    const badge = ALL_BADGES.find((b) => b.id === newlyEarned[0]);
    if (!badge) return;

    // Deferred rather than called synchronously in the effect body - see
    // StreakMilestoneToast's own comment for why.
    const id = setTimeout(() => {
      showToast(`${badge.emoji} New badge: ${badge.label}`);
      setCelebration((n) => n + 1);
      try {
        localStorage.setItem(storageKey(groupId), JSON.stringify(earnedBadgeIds));
      } catch {
        // A missed write just means this can re-fire on a later visit,
        // not a broken celebration - same tradeoff as readSeen's fallback.
      }
    }, 0);
    return () => clearTimeout(id);
    // Keyed on the joined id list (a stable string), not the array
    // reference, which is a fresh array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="relative">
      <Toast message={message} />
      <Confetti trigger={celebration} />
    </div>
  );
}
