"use client";

import { useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { setChecked } from "@/server/actions/checklist";
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

  // Serializes the actual network writes, one at a time - the optimistic
  // checkmark above still updates instantly per tap regardless. Without
  // this, rapidly ticking several boxes fires that many *concurrent*
  // setChecked calls, each independently invalidating and repopulating
  // the group's shared server cache (getGroupCore's `use cache: remote`);
  // whichever regeneration happens to land last wins the cache, which
  // isn't guaranteed to be the one that started last. A reload shortly
  // after a fast multi-tap could then show some of those taps as never
  // having happened, even though every write itself succeeded. Running
  // them strictly in order removes the race: each write's own cache
  // invalidation only ever follows a write that's already committed.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

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

      const write = () => setChecked(groupId, itemId, willBeDone);
      // Chained onto both branches so a rejected write doesn't wedge every
      // toggle after it - the queue keeps moving either way.
      queueRef.current = queueRef.current.then(write, write);
      await queueRef.current;
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
