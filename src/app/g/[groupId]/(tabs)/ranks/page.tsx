import Link from "next/link";
import type { Route } from "next";
import { Flame, Trophy } from "lucide-react";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { getMyGroups } from "@/server/queries/my-groups";
import { requireValidUserId } from "@/server/auth/require-user";
import {
  currentStreakWithToday,
  dateRange,
  rankScore,
  type RankWindow,
} from "@/lib/challenge-stats";
import { GroupTabHeader } from "@/components/nav/group-tab-header";
import { Avatar } from "@/components/ui/avatar";
import { LocalTimeBadge } from "@/components/ui/local-time-badge";
import { cn } from "@/lib/utils";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "Standings" };

/** Top-3 medal styling - gold/silver/bronze badge + a tinted row
 * background, so the leaderboard's top 3 actually stand out instead of
 * every row looking identical regardless of rank. See
 * design/project/desktop-redesign/RanksDesktop.dc.html and that folder's
 * NOTES.md - applies at every viewport, not just desktop (the mobile
 * artboard carries the same fix). */
const MEDALS = [
  { bg: "bg-gold-bg", badge: "bg-gold" },
  { bg: "bg-silver-bg", badge: "bg-silver" },
  { bg: "bg-bronze-bg", badge: "bg-bronze" },
] as const;

const WINDOWS: { value: RankWindow; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

export default async function RanksPage({ params, searchParams }: PageProps<"/g/[groupId]/ranks">) {
  const { groupId } = await params;
  const { w } = await searchParams;
  const window: RankWindow = w === "week" || w === "all" ? w : "month";

  const userId = await requireValidUserId(`/g/${groupId}/ranks`);
  const [snapshot, groups] = await Promise.all([
    getGroupSnapshot(groupId, userId),
    getMyGroups(userId),
  ]);
  if (!snapshot) return null;
  const me = snapshot.members.find((m) => m.isMe)!;

  // Each member's score/streak is walked over *their own* elected timezone
  // - localDayIndex/localCountsByDate - not the viewer's, so two people can
  // legitimately be a day apart in how far their own count goes back.
  const ranked = snapshot.members
    .map((m) => {
      const dates = dateRange(snapshot.startDate, m.localDayIndex);
      const counts = dates.map((d) => m.localCountsByDate[d] ?? 0);
      return { ...m, score: rankScore(counts, window), streak: currentStreakWithToday(counts) };
    })
    .sort((a, b) => b.score - a.score);

  return (
    // pb-28 (not the old pb-8) clears GroupNav's fixed bottom bar below
    // lg - it hides itself above lg, no clearance needed there.
    <div className="px-5 pt-1.5 pb-28 sm:px-6 lg:mx-auto lg:max-w-[760px] lg:px-10 lg:pt-10 lg:pb-16">
      <GroupTabHeader
        groupId={groupId}
        groupName={snapshot.name}
        myName={me.name}
        myColor={me.color}
        myAvatarSeed={me.avatarSeed}
        isAdmin={snapshot.myRole === "admin"}
        groups={groups}
        subtitle={<span className="text-muted truncate text-[13px]">Standings</span>}
      />

      <div className="pt-3.5 pb-3.5">
        <div className="text-muted text-[13px]">by items completed</div>
      </div>

      <div className="flex gap-1.5 pb-4">
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

      <div className="flex flex-col gap-1.5">
        {ranked.map((m, i) => (
          <Link
            key={m.userId}
            href={`/g/${groupId}/members/${m.userId}`}
            className={cn(
              "flex items-center gap-2.5 rounded-[22px] px-3 py-2.5",
              // Medal tint wins for the top 3 - unless it's the viewer's
              // own row, which keeps its usual bg-panel "you" highlight
              // (the medal badge below still shows either way, so rank
              // is never lost, just layered under the existing isMe cue
              // instead of replacing it).
              i < 3 && !m.isMe
                ? MEDALS[i].bg
                : m.isMe
                  ? "bg-panel text-bg"
                  : "bg-surface text-text",
            )}
          >
            {i < 3 ? (
              <span
                className={cn(
                  "text-on-panel flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full",
                  MEDALS[i].badge,
                )}
              >
                <Trophy size={17} strokeWidth={2.4} />
              </span>
            ) : (
              <span
                className={cn(
                  "font-heading w-[22px] flex-none text-center text-[15px]",
                  m.isMe ? "text-panel-soft" : "text-muted",
                )}
              >
                {i + 1}
              </span>
            )}
            <Avatar name={m.name} color={m.color} seed={m.avatarSeed} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">
                {m.name}
                {m.isMe && " (you)"}
              </span>
              {(m.username || m.timezone) && (
                <span
                  className={cn(
                    "flex items-center gap-1 truncate text-[11.5px]",
                    m.isMe ? "text-panel-soft" : "text-muted",
                  )}
                >
                  {m.username && <span className="truncate">@{m.username}</span>}
                  {m.username && m.timezone && <span aria-hidden>·</span>}
                  <LocalTimeBadge
                    timezone={m.timezone}
                    className={cn("flex-none", m.isMe ? "text-panel-soft" : "text-muted")}
                  />
                </span>
              )}
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
