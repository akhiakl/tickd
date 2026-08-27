import { notFound } from "next/navigation";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { requireValidUserId } from "@/server/auth/require-user";
import {
  computeBestStreak,
  computeTotal,
  currentStreakWithToday,
  dateRange,
} from "@/lib/challenge-stats";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { Avatar } from "@/components/ui/avatar";
import { LocalTimeBadge } from "@/components/ui/local-time-badge";
import { BadgeRow } from "@/components/ui/badge-row";
import { HistoryGrid } from "@/components/member/history-grid";
import { earnedBadges } from "@/lib/achievements";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function MemberProfilePage({
  params,
}: PageProps<"/g/[groupId]/members/[memberId]">) {
  const { groupId, memberId } = await params;
  const userId = await requireValidUserId(`/g/${groupId}/members/${memberId}`);
  const snapshot = await getGroupSnapshot(groupId, userId);
  if (!snapshot) return null;

  const member = snapshot.members.find((m) => m.userId === memberId);
  if (!member) notFound();

  const { items, durationDays } = snapshot;
  // This member's own profile - everything here is walked over *their own*
  // elected timezone (localDayIndex/localCountsByDate/localItemsByDate),
  // not the viewer's, per src/types/domain.ts's MemberSnapshot comments.
  const { localDayIndex: dayIndex, localToday } = member;
  const dates = dateRange(snapshot.startDate, dayIndex);
  const counts = dates.map((d) => member.localCountsByDate[d] ?? 0);
  const allDates = dateRange(snapshot.startDate, durationDays);

  const perItem = items.map((item) => {
    const doneDays = dates.filter((d) =>
      (member.localItemsByDate[d] ?? []).includes(item.id),
    ).length;
    return { ...item, pct: dayIndex > 0 ? Math.round((doneDays / dayIndex) * 100) : 0 };
  });

  const badges = earnedBadges({
    startDate: snapshot.startDate,
    itemCount: items.length,
    localToday: member.localToday,
    localDayIndex: member.localDayIndex,
    localCountsByDate: member.localCountsByDate,
    localCheckHours: member.localCheckHours,
  });

  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5">
        <BackButton href={`/g/${groupId}`} />
        <span className="text-faint text-[11px] tracking-[0.12em] uppercase">Member</span>
      </div>

      <div className="flex items-center gap-4 pt-4.5">
        <Avatar name={member.name} color={member.color} seed={member.avatarSeed} size={62} />
        <div>
          <div className="font-heading text-[27px] leading-tight">
            {member.name}
            {member.isMe && " (you)"}
          </div>
          <div className="text-muted flex items-center gap-1.5 text-[13px]">
            <span>
              joined day 1 - {Math.round((computeTotal(counts) / (dayIndex * items.length)) * 100)}%
              of the challenge
            </span>
            <LocalTimeBadge timezone={member.timezone} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-0 pt-5">
        {[
          { value: currentStreakWithToday(counts), label: "Current streak" },
          { value: computeBestStreak(counts), label: "Longest run" },
          { value: computeTotal(counts), label: "Items done" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface flex-1 rounded-[22px] px-3 py-3.5 text-center"
          >
            <div className="font-heading text-2xl">{stat.value}</div>
            <div className="text-faint mt-0.5 text-[10px] tracking-[0.08em] uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="text-faint pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">Badges</div>
      <BadgeRow earned={badges} />

      <div className="text-faint pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">
        Per item
      </div>
      <div className="flex flex-col gap-2.5">
        {perItem.map((item) => (
          <div key={item.id}>
            <div className="mb-1.5 flex justify-between text-[13.5px] font-semibold">
              <span>{item.label}</span>
              <span className="text-muted">{item.pct}%</span>
            </div>
            <div className="bg-text/10 h-[7px] overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${item.pct}%`, background: member.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-faint pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">
        History - tap a day
      </div>
      <HistoryGrid
        dates={allDates}
        localToday={localToday}
        itemCount={items.length}
        items={items}
        memberName={member.name}
        isMe={member.isMe}
        localCountsByDate={member.localCountsByDate}
        localItemsByDate={member.localItemsByDate}
      />
    </Screen>
  );
}
