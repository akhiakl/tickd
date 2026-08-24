import { ALL_BADGES, type Badge } from "@/lib/achievements";
import { cn } from "@/lib/utils";

/**
 * All badges, earned ones lit up and the rest dimmed to a silhouette -
 * shows what's still there to chase, not just what's already won. Order
 * matches ALL_BADGES (a fixed display order, not earned-date - these are
 * recomputed from the current snapshot each render, nothing is stored).
 */
export function BadgeRow({ earned }: { earned: Badge[] }) {
  const earnedIds = new Set(earned.map((b) => b.id));

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_BADGES.map((badge) => {
        const has = earnedIds.has(badge.id);
        return (
          <div
            key={badge.id}
            title={`${badge.label} - ${badge.description}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold",
              // `text-faint` alone is already calibrated to clear WCAG AA
              // against bg-surface (see its own comment in globals.css) -
              // an added opacity-50 here halved that back below 4.5:1. The
              // emoji's grayscale filter alone carries the "not earned
              // yet" read without touching the label's own contrast.
              has ? "bg-ok-bg text-ok-d dark:text-ok" : "bg-surface text-faint",
            )}
          >
            <span className={cn(!has && "grayscale")}>{badge.emoji}</span>
            {badge.label}
          </div>
        );
      })}
    </div>
  );
}
