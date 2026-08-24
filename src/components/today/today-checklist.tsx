"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleCheck } from "@/server/actions/checklist";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { Confetti } from "@/components/ui/confetti";
import type { ChecklistItemView } from "@/types/domain";

function confettiStorageKey(groupId: string, today: string) {
  return `tickd-confetti-${groupId}-${today}`;
}

export function TodayChecklist({
  groupId,
  items,
  checkedItemIds,
  today,
  disabled = false,
}: {
  groupId: string;
  items: ChecklistItemView[];
  checkedItemIds: string[];
  /** The viewer's own local "today" (see getGroupSnapshot) - just used as
   * a cooldown key so confetti fires once per day, not once per fumbled
   * checkbox. */
  today: string;
  /** True before the group's start date (in the viewer's own timezone) -
   * items render read-only, greyed, with nothing to tap. `toggleCheck`
   * itself rejects the same case server-side, so this is UI-only backstop
   * against nothing to do, not the actual guard. */
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();
  const { message, showToast } = useToast();
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(new Set(checkedItemIds));
  // Bumped (never reset) each time a checkmark lands the last item and
  // hasn't already been celebrated today - see Confetti's own comment for
  // why a changing value is its whole trigger API, rather than a boolean
  // it'd have to be reset back to false.
  const [celebration, setCelebration] = useState(0);

  function toggle(itemId: string) {
    if (disabled) return;
    const willBeDone = !optimisticChecked.has(itemId);
    const doneCountAfter = optimisticChecked.size + (willBeDone ? 1 : -1);

    startTransition(async () => {
      setOptimisticChecked((current) => {
        const next = new Set(current);
        if (willBeDone) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
      if (willBeDone) {
        const cleanSweep = doneCountAfter === items.length;
        showToast(
          cleanSweep
            ? `Clean sweep. All ${items.length} done.`
            : `Ticked - ${doneCountAfter}/${items.length}`,
        );
        // The toast above still fires every time - only the confetti gets
        // a once-a-day cooldown, so someone un/re-checking the last item a
        // few times (by accident, or just fiddling) doesn't get a burst
        // each time.
        if (cleanSweep) {
          const key = confettiStorageKey(groupId, today);
          let celebratedToday = false;
          try {
            celebratedToday = localStorage.getItem(key) === "1";
          } catch {
            // Storage blocked/unavailable - fine, worst case confetti
            // fires more than once today instead of not at all.
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
      await toggleCheck(groupId, itemId);
    });
  }

  return (
    <div className="relative flex flex-col gap-2 px-4">
      {items.map((item) => {
        const done = optimisticChecked.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            disabled={disabled}
            aria-disabled={disabled}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-[22px] px-4 py-3.5 text-left transition-colors",
              done ? "bg-ok-bg" : "bg-surface",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span
              className={cn(
                "flex h-[27px] w-[27px] flex-none items-center justify-center rounded-[9px] border-2 transition-all",
                done ? "border-ok bg-ok" : "border-text/30 bg-transparent",
              )}
            >
              {done && (
                <Check size={17} strokeWidth={3.4} className="animate-tick-pop text-on-panel" />
              )}
            </span>
            <span
              className={cn(
                "flex-1 text-[15.5px] font-semibold",
                done ? "text-ok-d decoration-ok-d/45 line-through" : "text-text",
              )}
            >
              {item.label}
            </span>
            {item.isSideQuest && (
              <span
                // text-ok reads at 4.45:1 against bg-ok-bg (light theme),
                // just under WCAG AA's 4.5:1 for normal text; accent-d
                // clears it while dark mode's own ok/ok-bg pairing already
                // passes on its own.
                className="bg-ok-bg text-accent-d dark:text-ok flex-none rounded-full px-2 py-0.5 text-[9.5px] tracking-[0.08em]"
              >
                SIDE QUEST
              </span>
            )}
          </button>
        );
      })}
      <Toast message={message} />
      <Confetti trigger={celebration} />
    </div>
  );
}
