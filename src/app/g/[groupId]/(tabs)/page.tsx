import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { getMyGroups } from "@/server/queries/my-groups";
import { computeTotal, currentStreakWithToday, dateRange } from "@/lib/challenge-stats";
import { TodayHeader } from "@/components/today/today-header";
import { TodayStatsPanel } from "@/components/today/today-stats-panel";
import { TodayChecklist } from "@/components/today/today-checklist";
import { MemberList, type MemberListRow } from "@/components/today/member-list";
import { ShareButton } from "@/components/today/share-button";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function TodayPage({ params }: PageProps<"/g/[groupId]">) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id;

  const [snapshot, groups] = await Promise.all([
    getGroupSnapshot(groupId, userId),
    getMyGroups(userId),
  ]);
  if (!snapshot) return null;

  const { items, members, today, dayIndex, durationDays } = snapshot;
  const me = members.find((m) => m.isMe)!;
  // `today`/`dayIndex` are already the viewer's own (see getGroupSnapshot),
  // and `me`'s local* fields are bucketed in that same timezone since
  // me.isMe - so these two stay in lockstep for the viewer's own checklist.
  const dates = dateRange(snapshot.startDate, dayIndex);

  const doneToday = me.localCountsByDate[today] ?? 0;
  const myCounts = dates.map((d) => me.localCountsByDate[d] ?? 0);
  const myStreak = currentStreakWithToday(myCounts);

  // Every other member's row walks *their own* timezone (localDayIndex/
  // localCountsByDate), independent of the viewer's today/dayIndex above -
  // see src/types/domain.ts's MemberSnapshot comments.
  const memberRows: MemberListRow[] = [...members]
    .map((m) => {
      const mDates = dateRange(snapshot.startDate, m.localDayIndex);
      const counts = mDates.map((d) => m.localCountsByDate[d] ?? 0);
      const total = computeTotal(counts);
      const pct = Math.round((total / (m.localDayIndex * items.length)) * 100);
      return {
        userId: m.userId,
        name: m.name,
        username: m.username,
        color: m.color,
        avatarSeed: m.avatarSeed,
        timezone: m.timezone,
        isMe: m.isMe,
        streak: currentStreakWithToday(counts),
        pct,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const groupToday = members.reduce((sum, m) => sum + (m.localCountsByDate[m.localToday] ?? 0), 0);

  // Compared in the viewer's own local terms (today/startDate are both
  // plain YYYY-MM-DD, so a string compare is a chronological one) - the
  // real guard is toggleCheck itself rejecting the same case server-side;
  // this just keeps the UI from pretending there's a "today" to check off
  // before the challenge exists yet.
  const notStartedYet = today < snapshot.startDate;

  return (
    <div className="pt-1.5 pb-30">
      <TodayHeader
        groupId={groupId}
        groupName={snapshot.name}
        dayIndex={dayIndex}
        durationDays={durationDays}
        myName={me.name}
        myColor={me.color}
        myAvatarSeed={me.avatarSeed}
        isAdmin={snapshot.myRole === "admin"}
        groups={groups}
      />

      <TodayStatsPanel
        doneToday={doneToday}
        itemCount={items.length}
        dayIndex={dayIndex}
        durationDays={durationDays}
        streak={myStreak}
      />

      {notStartedYet && (
        <div className="bg-surface mx-4 mt-5.5 rounded-3xl px-4.5 py-4">
          <div className="text-[15px] font-bold">This challenge hasn&apos;t started yet</div>
          <div className="text-muted mt-0.5 text-[12.5px]">
            Starts {snapshot.startDate} - the checklist unlocks that day.
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between px-6 pt-6.5 pb-2.5">
        <span className="text-faint text-[11px] tracking-[0.12em] uppercase">
          Today&apos;s list
        </span>
        <span className="text-muted text-[12px]">
          {notStartedYet ? "not started yet" : "tap to tick"}
        </span>
      </div>
      <TodayChecklist
        groupId={groupId}
        items={items}
        checkedItemIds={me.localItemsByDate[today] ?? []}
        disabled={notStartedYet}
      />

      <div className="mx-4 mt-5.5 flex gap-2.5">
        <div className="bg-surface flex-1 rounded-3xl px-4.5 py-4">
          <div className="text-faint text-[10.5px] tracking-[0.1em]">GROUP TODAY</div>
          <div className="font-heading mt-0.5 text-2xl">
            {groupToday}
            <span className="text-faint text-sm">/{members.length * items.length}</span>
          </div>
        </div>
        <div className="bg-surface flex-1 rounded-3xl px-4.5 py-4">
          <div className="text-faint text-[10.5px] tracking-[0.1em]">YOUR TOTAL</div>
          <div className="font-heading mt-0.5 text-2xl">
            {computeTotal(myCounts)}
            <span className="text-faint text-sm">/{durationDays * items.length}</span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between px-6 pt-6.5 pb-2.5">
        <span className="text-faint text-[11px] tracking-[0.12em] uppercase">The group</span>
        <span className="text-muted text-[12px]">{members.length} people</span>
      </div>
      <MemberList groupId={groupId} rows={memberRows} />

      <ShareButton groupId={groupId} />
    </div>
  );
}
