/** Streak lengths worth celebrating. Exact matches only - see
 * StreakMilestoneToast, which fires once per crossing rather than on
 * every render where the streak happens to be one of these. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

const MESSAGES: Record<number, string> = {
  3: "🔥 3 days in a row",
  7: "🔥 A full week streak",
  14: "🔥 Two weeks straight",
  30: "🎉 30-day streak. That's a real habit now.",
  50: "🎉 50 days deep",
  100: "🏆 100-day streak. Legendary.",
  200: "🏆 200 days. Unreal.",
  365: "👑 A full year. Incredible.",
};

export function streakMilestoneMessage(streak: number): string | null {
  return STREAK_MILESTONES.includes(streak)
    ? (MESSAGES[streak] ?? `🔥 ${streak}-day streak`)
    : null;
}
