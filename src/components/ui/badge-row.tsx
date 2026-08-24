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
              has ? "bg-ok-bg text-ok-d dark:text-ok" : "bg-surface text-faint opacity-50",
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
