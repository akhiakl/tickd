import type { ReactNode } from "react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Flame } from "lucide-react";

export function TodayStatsPanel({
  doneToday,
  itemCount,
  dayIndex,
  durationDays,
  streak,
  share,
}: {
  doneToday: number;
  itemCount: number;
  dayIndex: number;
  durationDays: number;
  streak: number;
  /** Rendered inline below a divider, at every width - Share lives inside
   * this same panel instead of floating over the checklist (which used
   * to visually collide with the last row on a wide viewport). See
   * ShareButton's "inline" variant and
   * design/project/desktop-redesign/TodayDesktop.dc.html - one responsive
   * document, not a separate mobile/desktop pair. */
  share: ReactNode;
}) {
  const statusLine =
    doneToday === itemCount
      ? "All done today"
      : doneToday === 0
        ? "Nothing yet today"
        : `${itemCount - doneToday} left today`;

  return (
    <div className="bg-panel text-on-panel rounded-[30px] px-5.5 py-5">
      <div className="flex items-center gap-4.5">
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
      <div className="border-on-panel/[0.14] mt-5 border-t pt-4.5">{share}</div>
    </div>
  );
}
