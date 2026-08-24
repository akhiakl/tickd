"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { txQueue } from "@/lib/sync/tx-queue";
import { drainController } from "@/lib/sync/drain";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { Confetti } from "@/components/ui/confetti";
import { TodayStatsPanel } from "@/components/today/today-stats-panel";
import { TodayChecklist } from "@/components/today/today-checklist";
import { StreakMilestoneToast } from "@/components/today/streak-milestone-toast";
import type { ChecklistItemView } from "@/types/domain";

function confettiStorageKey(groupId: string, today: string) {
  return `tickd-confetti-${groupId}-${today}`;
}

/**
 * Owns everything on the Today page that needs to react to a tap the
 * instant it happens: the ring/streak (TodayStatsPanel), the checklist
 * itself, and the milestone celebration - previously three independent
 * consumers of server-rendered props, so ticking a box moved the
 * checklist's own optimistic checkmark right away but left the ring,
 * streak count, and milestone toast waiting on a full round trip (a real
 * lag, not just a cosmetic one) before they caught up.
 */
export function TodayLive({
  groupId,
  items,
  checkedItemIds,
  today,
  disabled = false,
  dayIndex,
  durationDays,
  priorStreak,
  children,
}: {
  groupId: string;
  items: ChecklistItemView[];
  checkedItemIds: string[];
  /** The viewer's own local "today" (see getGroupSnapshot) - used as a
   * cooldown key so confetti fires once per day, not once per fumbled
   * checkbox. */
  today: string;
  /** True before the group's start date (in the viewer's own timezone) -
   * see TodayChecklist's own comment; `setChecked` rejects the same case
   * server-side, this is UI-only. */
  disabled?: boolean;
  dayIndex: number;
  durationDays: number;
  /** currentStreakWithToday's value with *today's own* contribution
   * excluded - i.e. the streak walking back through yesterday only.
   * Today can only ever add up to +1 (crossing from zero checks to any),
   * so the live ring derives the real streak from this plus whether
   * anything's currently checked, without re-running the full history
   * calculation on every tap. */
  priorStreak: number;
  /** Rendered between the ring and the checklist - the not-started banner,
   * group mascot, and "Today's list" heading all need to sit there, but
   * none of them need the live state this component owns. */
  children?: ReactNode;
}) {
  const [, startTransition] = useTransition();
  const { message, showToast } = useToast();
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(new Set(checkedItemIds));
  // Bumped (never reset) each time a checkmark lands the last item and
  // hasn't already been celebrated today - see Confetti's own comment for
  // why a changing value is its whole trigger API, rather than a boolean
  // it'd have to be reset back to false.
  const [celebration, setCelebration] = useState(0);

  // Surfaces a terminal queue failure (bad input, "hasn't started yet", a
  // membership check that failed server-side) the same way a direct
  // rejected setChecked call used to - a transport failure never reaches
  // here, it's retried by the drain controller instead. See
  // docs/local-first-sync-engine-plan.md and src/lib/sync/drain.ts.
  useEffect(() => {
    drainController.setErrorHandler(showToast);
    drainController.start();
    return () => drainController.setErrorHandler(null);
  }, [showToast]);

  // The running true count of checked items, mutated synchronously on
  // every tap - not derived from `optimisticChecked` (React state) at
  // toggle-call time. Two taps fired back to back are both handled
  // synchronously *before* React re-renders between them, so a second
  // `toggle()` call can still see the pre-first-tap render's stale
  // closure over `optimisticChecked` - which made "check the last two
  // boxes quickly" sometimes never compute a real doneCountAfter of
  // `items.length`, so the clean-sweep toast/confetti just silently
  // didn't fire. This ref is always current regardless of render timing;
  // `optimisticChecked` (via setOptimisticChecked below) becomes a mirror
  // of it for rendering, not the source of truth for this math anymore.
  const checkedRef = useRef(new Set(checkedItemIds));

  function toggle(itemId: string) {
    if (disabled) return;
    const willBeDone = !checkedRef.current.has(itemId);
    if (willBeDone) checkedRef.current.add(itemId);
    else checkedRef.current.delete(itemId);
    const doneCountAfter = checkedRef.current.size;
    const snapshot = new Set(checkedRef.current);

    // Toast + confetti are plain state (not useOptimistic), so they're
    // fired here, *outside* the transition below, rather than alongside
    // the `await setChecked(...)` call - a regular setState made inside
    // a still-pending transition doesn't actually paint until that
    // transition's async work settles (useOptimistic's dispatch is the
    // one deliberate exception to that, which is why the checkbox itself
    // already looked instant while these didn't). Keeping them here means
    // they paint in the same tick as the tap, not once the real network
    // round trip finishes.
    if (willBeDone) {
      const cleanSweep = doneCountAfter === items.length;
      showToast(
        cleanSweep
          ? `Clean sweep. All ${items.length} done.`
          : `Ticked - ${doneCountAfter}/${items.length}`,
      );
      // The toast above still fires every time - only the confetti gets a
      // once-a-day cooldown, so someone un/re-checking the last item a
      // few times (by accident, or just fiddling) doesn't get a burst
      // each time.
      if (cleanSweep) {
        const key = confettiStorageKey(groupId, today);
        let celebratedToday = false;
        try {
          celebratedToday = localStorage.getItem(key) === "1";
        } catch {
          // Storage blocked/unavailable - fine, worst case confetti fires
          // more than once today instead of not at all.
        }
        if (!celebratedToday) {
          setCelebration((n) => n + 1);
          try {
            localStorage.setItem(key, "1");
          } catch {
            // Same tradeoff as above.
          }
        }
      }
    }

    startTransition(async () => {
      setOptimisticChecked(snapshot);

      // Persisted (IndexedDB-backed, falling back to in-memory where
      // IndexedDB isn't available) rather than sent directly - a tap made
      // offline survives a reload and drains once connectivity returns,
      // instead of silently reverting the next time this data refetches.
      // Same-item taps coalesce onto one queued row (tx-queue.ts's
      // coalesceKey), so rapid re-toggling doesn't grow the queue or
      // replay intermediate states - only the final one is ever sent.
      // Ordering is still strictly one write in flight at a time
      // (drain.ts's drainLoop), which is what keeps each write's cache
      // invalidation (setChecked's revalidatePath/updateTag) from racing
      // a later one - the same invariant the old in-memory queue enforced.
      await txQueue.enqueue("setChecked", {
        groupId,
        checklistItemId: itemId,
        checked: willBeDone,
      });
      drainController.kick();
    });
  }

  const doneToday = optimisticChecked.size;
  const liveStreak = priorStreak + (doneToday > 0 ? 1 : 0);

  return (
    <>
      <TodayStatsPanel
        doneToday={doneToday}
        itemCount={items.length}
        dayIndex={dayIndex}
        durationDays={durationDays}
        streak={liveStreak}
      />

      {children}

      <div className="relative">
        <TodayChecklist
          items={items}
          checkedIds={optimisticChecked}
          onToggle={toggle}
          disabled={disabled}
        />
        <Toast message={message} />
        <Confetti trigger={celebration} />
      </div>

      <StreakMilestoneToast groupId={groupId} streak={liveStreak} />
    </>
  );
}
