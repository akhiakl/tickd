import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import {
  computeStreak,
  computeTotal,
  currentStreakWithToday,
  dateRange,
} from "@/lib/challenge-stats";
import { TodayLive } from "@/components/today/today-live";
import { GroupMascot } from "@/components/today/group-mascot";

/**
 * The checklist half of the Today page ("today's list"), split out so it
 * can stream in behind its own Suspense boundary (see (tabs)/page.tsx)
 * instead of holding up the header/stats shell above it. Re-fetches via
 * `getGroupSnapshot`, but that's a React `cache()` + `"use cache: remote"`
 * lookup already resolved for this request by the group layout's own
 * membership check - this doesn't cost a second query, just a second read
 * of the same cached value.
 */
export async function TodayChecklistSection({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const snapshot = await getGroupSnapshot(groupId, userId);
  if (!snapshot) return null;

  const { items, members, today, dayIndex, durationDays } = snapshot;
  const me = members.find((m) => m.isMe)!;
  const dates = dateRange(snapshot.startDate, dayIndex);
  const myCounts = dates.map((d) => me.localCountsByDate[d] ?? 0);
  const myPriorStreak = computeStreak(myCounts.slice(0, -1));

  // Only needed here for the mascot's growth stage - see member-list-section
  // for the equivalent (and slightly fuller) per-member computation.
  const avgStreak =
    members.reduce((sum, m) => {
      const mDates = dateRange(snapshot.startDate, m.localDayIndex);
      const counts = mDates.map((d) => m.localCountsByDate[d] ?? 0);
      return sum + currentStreakWithToday(counts);
    }, 0) / Math.max(1, members.length);

  const notStartedYet = today < snapshot.startDate;

  return (
    <>
      <TodayLive
        groupId={groupId}
        items={items}
        checkedItemIds={me.localItemsByDate[today] ?? []}
        today={today}
        disabled={notStartedYet}
        dayIndex={dayIndex}
        durationDays={durationDays}
        priorStreak={myPriorStreak}
        mascot={<GroupMascot avgStreak={avgStreak} />}
        banner={
          notStartedYet && (
            <div className="bg-surface rounded-3xl px-4.5 py-4">
              <div className="text-[15px] font-bold">This challenge hasn&apos;t started yet</div>
              <div className="text-muted mt-0.5 text-[12.5px]">
                Starts {snapshot.startDate} - the checklist unlocks that day.
              </div>
            </div>
          )
        }
      />

      <div className="flex gap-2.5 lg:col-start-1">
        <div className="bg-surface flex-1 rounded-3xl px-4.5 py-4">
          <div className="text-faint text-[10.5px] tracking-[0.1em]">GROUP TODAY</div>
          <div className="font-heading mt-0.5 text-2xl">
            {members.reduce((sum, m) => sum + (m.localCountsByDate[m.localToday] ?? 0), 0)}
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
    </>
  );
}
