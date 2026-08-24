"use client";

import { useEffect, useState } from "react";
import { streakMilestoneMessage } from "@/lib/streak-milestones";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { Confetti } from "@/components/ui/confetti";

function storageKey(groupId: string) {
  return `tickd-streak-celebrated-${groupId}`;
}

function alreadyCelebrated(groupId: string, streak: number): boolean {
  try {
    return streak <= Number(localStorage.getItem(storageKey(groupId)) ?? 0);
  } catch {
    // Storage blocked/unavailable - treat as "not yet celebrated" so the
    // toast still fires; it just risks repeating on a later visit instead
    // of staying silent forever. Not worth failing the celebration over.
    return false;
  }
}

/**
 * Celebrates the moment `streak` first reaches one of STREAK_MILESTONES,
 * once per crossing - not every time the Today page happens to render
 * with a milestone streak (which would otherwise fire again on every
 * navigation back to a group sitting at, say, exactly 7). The "already
 * celebrated" mark lives in localStorage rather than component state: the
 * Today page is a fresh server render each visit, so in-memory state
 * wouldn't survive a reload, and this only needs to be right for the one
 * browser it's running in anyway.
 *
 * Deliberately its own Toast+Confetti pair rather than sharing
 * TodayChecklist's: that one fires from a tap gesture mid-interaction,
 * this one fires from a prop that can already be at its final value on
 * first render (e.g. arriving at the page with today's last item already
 * checked) - keeping them independent means neither has to reason about
 * the other's timing.
 */
export function StreakMilestoneToast({ groupId, streak }: { groupId: string; streak: number }) {
  const { message, showToast } = useToast(2600);
  const [celebration, setCelebration] = useState(0);

  useEffect(() => {
    const text = streakMilestoneMessage(streak);
    if (!text || alreadyCelebrated(groupId, streak)) return;

    // Deferred rather than called synchronously in the effect body: these
    // are the actual state updates (and the localStorage write marking
    // this crossing celebrated), kept out of the effect's own call stack
    // so they run as a reaction to the streak changing, not as part of
    // rendering it.
    const id = setTimeout(() => {
      showToast(text);
      setCelebration((n) => n + 1);
      try {
        localStorage.setItem(storageKey(groupId), String(streak));
      } catch {
        // Same as alreadyCelebrated's fallback - a missed write just
        // means a possible repeat later, not a broken celebration.
      }
    }, 0);
    return () => clearTimeout(id);
    // Only re-check when the streak itself changes (a real check-in), not
    // on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  return (
    <div className="relative">
      <Toast message={message} />
      <Confetti trigger={celebration} />
    </div>
  );
}
