"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChecklistItemView } from "@/types/domain";

/**
 * The member profile's day-block History grid, made tappable - same
 * interaction as Wall's own calendar (tap a day, see that day's actual
 * checklist), just laid out as the flat "day 1, day 2, ..." strip this
 * page already had rather than a real month calendar. The overall-
 * progression stats above (streaks, Per item %, "X% of the challenge")
 * stay exactly as they were; this only adds a way to drill into any one
 * day instead of just seeing its aggregate color.
 */
export function HistoryGrid({
  dates,
  localToday,
  itemCount,
  items,
  memberName,
  isMe,
  localCountsByDate,
  localItemsByDate,
}: {
  dates: string[];
  localToday: string;
  itemCount: number;
  items: ChecklistItemView[];
  memberName: string;
  isMe: boolean;
  localCountsByDate: Record<string, number>;
  localItemsByDate: Record<string, string[]>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <div>
      <div className="flex max-w-[340px] flex-wrap gap-1.5">
        {dates.map((date, i) => {
          const future = date > localToday;
          const count = future ? null : (localCountsByDate[date] ?? 0);
          const full = count === itemCount;
          const partial = count !== null && count > 0 && !full;
          return (
            <button
              key={date}
              type="button"
              disabled={future}
              onClick={() => setSelectedDate(date)}
              aria-label={`Day ${i + 1}${count === null ? "" : `, ${count} of ${itemCount} done`}`}
              className={cn(
                "flex h-[34px] w-[38px] items-center justify-center rounded-[10px] text-[11px] font-bold",
                future && "border-text/20 text-muted cursor-not-allowed border border-dashed",
                !future && count === 0 && "bg-zero text-muted",
                !future && full && "bg-ok text-bg",
                !future && partial && "bg-ok-4 text-muted",
                selectedDate === date && "ring-panel ring-2",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="animate-rise bg-panel text-on-panel mt-4.5 rounded-[28px] px-5 py-4.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-heading text-[18px]">
                {isMe ? "You" : memberName} - {selectedDate}
              </div>
              <div className="text-panel-soft text-[12px]">
                {localCountsByDate[selectedDate] ?? 0} of {itemCount} done
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Close"
              className="bg-on-panel/[0.12] flex h-[30px] w-[30px] items-center justify-center rounded-full"
            >
              ✕
            </button>
          </div>
          <div className="mt-3.5 flex flex-col gap-1.5">
            {items.map((item) => {
              const done = (localItemsByDate[selectedDate] ?? []).includes(item.id);
              return (
                <div key={item.id} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "h-[15px] w-[15px] flex-none rounded-[5px]",
                      done ? "bg-ok-2" : "border-on-panel/30 border-[1.5px]",
                    )}
                  />
                  <span className={cn("text-[13.5px]", done ? "text-bg" : "text-faint")}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
