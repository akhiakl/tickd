"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItemView } from "@/types/domain";

/**
 * Purely presentational - the checked set and what happens on a tap both
 * come from the caller (src/components/today/today-live.tsx), which is
 * also what renders the ring (TodayStatsPanel) that needs to react to the
 * exact same taps instantly. Splitting the state out of this component is
 * what makes that possible: two sibling pieces of UI sharing one live
 * source of truth, instead of each only finding out about a tap on its
 * own schedule.
 */
export function TodayChecklist({
  items,
  checkedIds,
  onToggle,
  disabled = false,
}: {
  items: ChecklistItemView[];
  checkedIds: Set<string>;
  onToggle: (itemId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 lg:px-0">
      {items.map((item) => {
        const done = checkedIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
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
    </div>
  );
}
