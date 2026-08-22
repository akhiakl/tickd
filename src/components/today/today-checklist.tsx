"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleCheck } from "@/server/actions/checklist";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import type { ChecklistItemView } from "@/types/domain";

export function TodayChecklist({
  groupId,
  items,
  checkedItemIds,
}: {
  groupId: string;
  items: ChecklistItemView[];
  checkedItemIds: string[];
}) {
  const [, startTransition] = useTransition();
  const { message, showToast } = useToast();
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(new Set(checkedItemIds));

  function toggle(itemId: string) {
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
        showToast(
          doneCountAfter === items.length
            ? `Clean sweep. All ${items.length} done.`
            : `Ticked - ${doneCountAfter}/${items.length}`,
        );
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
            className={cn(
              "flex w-full items-center gap-3.5 rounded-[22px] px-4 py-3.5 text-left transition-colors",
              done ? "bg-ok-bg" : "bg-surface",
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
    </div>
  );
}
