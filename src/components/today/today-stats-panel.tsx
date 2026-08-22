import { ProgressRing } from "@/components/ui/progress-ring";
import { Flame } from "lucide-react";

export function TodayStatsPanel({
  doneToday,
  itemCount,
  dayIndex,
  durationDays,
  streak,
}: {
  doneToday: number;
  itemCount: number;
  dayIndex: number;
  durationDays: number;
  streak: number;
}) {
  const statusLine =
    doneToday === itemCount
      ? "All done today"
      : doneToday === 0
        ? "Nothing yet today"
        : `${itemCount - doneToday} left today`;

  return (
    <div className="bg-panel text-on-panel mx-4 mt-4 flex items-center gap-4.5 rounded-[30px] px-5.5 py-5">
      <ProgressRing done={doneToday} total={itemCount} />
      <div className="flex-1">
        <div className="text-panel-soft text-[10.5px] tracking-[0.13em]">
          DAY {dayIndex} OF {durationDays}
        </div>
        <div className="font-heading my-0.5 text-xl">{statusLine}</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Flame size={15} className="fill-flame-light text-flame-light" />
          <span className="text-[13px] font-bold">{streak}-day streak</span>
        </div>
      </div>
    </div>
  );
}
