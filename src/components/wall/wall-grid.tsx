"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildMonthGrid, monthIndexFor, monthsInRange, WEEKDAY_LABELS } from "@/lib/calendar-grid";
import { dateRange } from "@/lib/challenge-stats";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChecklistItemView } from "@/types/domain";

type WallMember = {
  userId: string;
  name: string;
  color: string;
  avatarSeed: string;
  isMe: boolean;
  localToday: string;
  localCountsByDate: Record<string, number>;
  localItemsByDate: Record<string, string[]>;
};

export function cellClass(count: number | null, itemCount: number) {
  if (count === null) return "bg-future";
  if (count === 0) return "bg-zero";
  if (count === itemCount) return "bg-ok";
  if (count >= itemCount * 0.6) return "bg-ok-3";
  return "bg-ok-4";
}

/** The day-number text needs a color that actually contrasts with
 * whichever `cellClass` background it's drawn on - `bg-ok`'s green only
 * clears WCAG AA against `text-bg`, not the plain dark text every other
 * cell state uses (same pairing the member profile's History grid already
 * uses for the same bg-ok/bg-zero/bg-ok-4 backgrounds). */
export function cellTextClass(count: number | null, itemCount: number) {
  if (count === null) return "text-faint";
  if (count === itemCount) return "text-bg";
  return "text-muted";
}

/**
 * A real month calendar, one member at a time (switch via the avatar row)
 * rather than the whole group's rows stacked in one grid - each member's
 * cells are colored from *their own* localCountsByDate/localToday (see
 * src/types/domain.ts's MemberSnapshot comments), so what counts as
 * "today" or "done" here always matches what that member sees on their
 * own Today page. Only ever pages through the months the challenge's own
 * date range touches (monthsInRange) - not a full year of mostly-empty
 * calendar either side of a short challenge.
 */
export function WallGrid({
  members,
  startDate,
  durationDays,
  items,
}: {
  members: WallMember[];
  startDate: string;
  durationDays: number;
  items: ChecklistItemView[];
}) {
  const me = members.find((m) => m.isMe) ?? members[0];
  const [selectedMemberId, setSelectedMemberId] = useState(me?.userId);
  const member = members.find((m) => m.userId === selectedMemberId) ?? me;

  const lastDate = dateRange(startDate, durationDays).at(-1) ?? startDate;
  const months = monthsInRange(startDate, lastDate);
  const [monthIndex, setMonthIndex] = useState(() =>
    monthIndexFor(months, member?.localToday ?? startDate),
  );
  const month = months[monthIndex];
  const weeks = month ? buildMonthGrid(month.year, month.month) : [];

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function selectMember(userId: string) {
    setSelectedMemberId(userId);
    setSelectedDate(null);
    const next = members.find((m) => m.userId === userId);
    setMonthIndex(monthIndexFor(months, next?.localToday ?? startDate));
  }

  if (!member || !month) return null;

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5.5 pb-3.5">
        {members.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={() => selectMember(m.userId)}
            aria-label={m.isMe ? "You" : m.name}
            aria-pressed={m.userId === member.userId}
            className={cn(
              "flex-none rounded-full ring-2 transition-colors",
              m.userId === member.userId ? "ring-accent" : "ring-transparent",
            )}
          >
            <Avatar name={m.name} color={m.color} seed={m.avatarSeed} size={40} />
          </button>
        ))}
      </div>

      <div className="mx-5.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => i - 1)}
          disabled={monthIndex === 0}
          aria-label="Previous month"
          className="text-muted disabled:text-faint flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span className="font-heading text-[17px]">{month.label}</span>
        <button
          type="button"
          onClick={() => setMonthIndex((i) => i + 1)}
          disabled={monthIndex === months.length - 1}
          aria-label="Next month"
          className="text-muted disabled:text-faint flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mx-5.5 mt-2.5">
        <div className="text-faint grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
              {week.map((date, dayIndex) => {
                if (!date) return <span key={dayIndex} />;

                const beforeStart = date < startDate;
                const isFuture = date > member.localToday;
                const count =
                  beforeStart || isFuture ? null : (member.localCountsByDate[date] ?? 0);
                const dayOfMonth = Number(date.slice(-2));

                return (
                  <button
                    key={date}
                    type="button"
                    disabled={beforeStart || isFuture}
                    onClick={() => setSelectedDate(date)}
                    aria-label={`${date}${count === null ? "" : `, ${count} of ${items.length} done`}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[9px] text-[10.5px] font-bold",
                      beforeStart
                        ? "bg-surface text-faint opacity-50"
                        : cn(cellClass(count, items.length), cellTextClass(count, items.length)),
                      selectedDate === date && "ring-panel ring-2",
                    )}
                  >
                    {dayOfMonth}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-rise bg-panel text-on-panel mx-4 mt-4.5 rounded-[28px] px-5 py-4.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-heading text-[18px]">
                {member.isMe ? "You" : member.name} - {selectedDate}
              </div>
              <div className="text-panel-soft text-[12px]">
                {member.localCountsByDate[selectedDate] ?? 0} of {items.length} done
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
              const done = (member.localItemsByDate[selectedDate] ?? []).includes(item.id);
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
