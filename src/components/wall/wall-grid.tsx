"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChecklistItemView } from "@/types/domain";

type WallMember = {
  userId: string;
  name: string;
  isMe: boolean;
  countsByDate: Record<string, number>;
  itemsByDate: Record<string, string[]>;
};

export function cellClass(count: number | null, itemCount: number) {
  if (count === null) return "bg-future";
  if (count === 0) return "bg-zero";
  if (count === itemCount) return "bg-ok";
  if (count >= itemCount * 0.6) return "bg-ok-3";
  return "bg-ok-4";
}

export function WallGrid({
  members,
  dates,
  today,
  items,
}: {
  members: WallMember[];
  dates: string[];
  today: string;
  items: ChecklistItemView[];
}) {
  const [selected, setSelected] = useState<{ userId: string; date: string } | null>(null);
  const sorted = [...members].sort((a, b) => {
    const totalA = Object.values(a.countsByDate).reduce((s, n) => s + n, 0);
    const totalB = Object.values(b.countsByDate).reduce((s, n) => s + n, 0);
    return totalB - totalA;
  });

  const selectedMember = selected ? members.find((m) => m.userId === selected.userId) : null;

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto pb-1.5 pl-4">
        <div className="inline-block min-w-max pr-4">
          <div className="mb-1.5 ml-[84px] flex gap-[3px]">
            {dates.map((date, i) => (
              <span
                key={date}
                className={cn(
                  "w-[15px] flex-none text-center text-[8.5px] font-bold",
                  // This row sits on the page background, not a dark panel,
                  // so it needs the on-page "muted" tone rather than
                  // panel-soft (which is only readable against bg-panel).
                  date === today ? "text-accent-d" : "text-muted",
                )}
              >
                {i + 1}
              </span>
            ))}
          </div>

          {sorted.map((member) => (
            <div key={member.userId} className="mb-[3px] flex items-center gap-[3px]">
              <span
                className={cn(
                  "w-[78px] flex-none truncate pr-1.5 text-[11.5px] font-bold",
                  member.isMe ? "text-accent-d" : "text-text",
                )}
              >
                {member.isMe ? "You" : member.name}
              </span>
              {dates.map((date, i) => {
                const isFuture = date > today;
                const count = isFuture ? null : (member.countsByDate[date] ?? 0);
                const isSelected = selected?.userId === member.userId && selected.date === date;
                const who = member.isMe ? "you" : member.name;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={isFuture}
                    onClick={() => setSelected({ userId: member.userId, date })}
                    aria-label={`${who}, day ${i + 1}${count === null ? "" : `, ${count} of ${items.length} done`}`}
                    className={cn(
                      "h-[15px] w-[15px] flex-none rounded-[4px] p-0",
                      cellClass(count, items.length),
                      isSelected && "ring-panel ring-2",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selected && selectedMember && (
        <div className="animate-rise bg-panel text-on-panel mx-4 mt-4.5 rounded-[28px] px-5 py-4.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-heading text-[18px]">
                {selectedMember.isMe ? "You" : selectedMember.name} - day{" "}
                {dates.indexOf(selected.date) + 1}
              </div>
              <div className="text-panel-soft text-[12px]">
                {selectedMember.countsByDate[selected.date] ?? 0} of {items.length} done
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="bg-on-panel/[0.12] flex h-[30px] w-[30px] items-center justify-center rounded-full"
            >
              ✕
            </button>
          </div>
          <div className="mt-3.5 flex flex-col gap-1.5">
            {items.map((item) => {
              const done = (selectedMember.itemsByDate[selected.date] ?? []).includes(item.id);
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
