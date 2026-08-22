import Link from "next/link";
import type { Route } from "next";
import { Flame } from "lucide-react";
import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import {
  currentStreakWithToday,
  dateRange,
  rankScore,
  type RankWindow,
} from "@/lib/challenge-stats";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const metadata = { title: "Standings" };

const WINDOWS: { value: RankWindow; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

export default async function RanksPage({ params, searchParams }: PageProps<"/g/[groupId]/ranks">) {
  const { groupId } = await params;
  const { w } = await searchParams;
  const window: RankWindow = w === "week" || w === "all" ? w : "month";

  const session = await auth();
  const snapshot = await getGroupSnapshot(groupId, session!.user!.id);
  if (!snapshot) return null;

  const dates = dateRange(snapshot.startDate, snapshot.dayIndex);
  const ranked = snapshot.members
    .map((m) => {
      const counts = dates.map((d) => m.countsByDate[d] ?? 0);
      return { ...m, score: rankScore(counts, window), streak: currentStreakWithToday(counts) };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="pt-1.5 pb-8">
      <div className="px-5.5 pb-3.5">
        <div className="font-heading text-2xl">Standings</div>
        <div className="text-muted text-[13px]">by items completed</div>
      </div>

      <div className="flex gap-1.5 px-5.5 pb-4">
        {WINDOWS.map((w2) => (
          <Link
            key={w2.value}
            href={`/g/${groupId}/ranks?w=${w2.value}` as Route}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-center text-[12.5px] font-bold",
              window === w2.value ? "bg-panel text-bg" : "bg-surface text-muted",
            )}
          >
            {w2.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 px-4">
        {ranked.map((m, i) => (
          <Link
            key={m.userId}
            href={`/g/${groupId}/members/${m.userId}`}
            className={cn(
              "flex items-center gap-2.5 rounded-[22px] px-3 py-2.5",
              m.isMe ? "bg-panel text-bg" : "bg-surface text-text",
            )}
          >
            <span
              className={cn(
                "font-heading w-[22px] flex-none text-center text-[15px]",
                // Row background flips between bg-panel (isMe) and
                // bg-surface (everyone else), so the rank number needs a
                // color proven readable against whichever one it lands on.
                i < 3
                  ? m.isMe
                    ? "text-flame-light"
                    : "text-accent-d dark:text-accent"
                  : m.isMe
                    ? "text-panel-soft"
                    : "text-muted",
              )}
            >
              {i + 1}
            </span>
            <Avatar name={m.name} color={m.color} size={34} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
              {m.name}
              {m.isMe && " (you)"}
            </span>
            <span className="flex flex-none items-center gap-0.5">
              <Flame size={12} className="fill-flame text-flame" />
              <span className="text-muted text-[12.5px] font-bold">{m.streak}</span>
            </span>
            <span className="font-heading w-[54px] flex-none text-right text-[17px]">
              {m.score}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
