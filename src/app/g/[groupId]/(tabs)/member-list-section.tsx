import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { computeTotal, currentStreakWithToday, dateRange } from "@/lib/challenge-stats";
import { MemberList, type MemberListRow } from "@/components/today/member-list";

/**
 * The group's own member list ("the group"), split out so it can stream
 * in behind its own Suspense boundary (see (tabs)/page.tsx) rather than
 * holding up the header/checklist above it - it's the priciest bit of
 * this page's per-request work (a `dateRange`/count walk per member, then
 * a sort), and least needed the instant the page paints. Re-fetches via
 * `getGroupSnapshot`, but that's a React `cache()` + `"use cache: remote"`
 * lookup already resolved for this request, so this doesn't cost a
 * second query.
 */
export async function MemberListSection({ groupId, userId }: { groupId: string; userId: string }) {
  const snapshot = await getGroupSnapshot(groupId, userId);
  if (!snapshot) return null;

  const { items, members } = snapshot;

  // Every member's row walks *their own* timezone (localDayIndex/
  // localCountsByDate), independent of the viewer's today/dayIndex - see
  // src/types/domain.ts's MemberSnapshot comments.
  const rows: MemberListRow[] = [...members]
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
        doneToday: (m.localCountsByDate[m.localToday] ?? 0) === items.length,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <>
      <div className="flex items-baseline justify-between px-6 pt-6.5 pb-2.5">
        <span className="text-faint text-[11px] tracking-[0.12em] uppercase">The group</span>
        <span className="text-muted text-[12px]">{members.length} people</span>
      </div>
      <MemberList groupId={groupId} rows={rows} />
    </>
  );
}
