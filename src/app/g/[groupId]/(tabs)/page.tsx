import { Suspense } from "react";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { getMyGroups } from "@/server/queries/my-groups";
import { requireValidUserId } from "@/server/auth/require-user";
import { GroupTabHeader } from "@/components/nav/group-tab-header";
import { TodayDateLabel } from "@/components/today/today-date-label";
import { NewBadgeToast } from "@/components/today/new-badge-toast";
import { earnedBadges } from "@/lib/achievements";
import { TodayChecklistSection } from "./today-checklist-section";
import { MemberListSection } from "./member-list-section";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function TodayPage({ params }: PageProps<"/g/[groupId]">) {
  const { groupId } = await params;
  const userId = await requireValidUserId(`/g/${groupId}`);

  const [snapshot, groups] = await Promise.all([
    getGroupSnapshot(groupId, userId),
    getMyGroups(userId),
  ]);
  if (!snapshot) return null;

  const { items, members, dayIndex, durationDays } = snapshot;
  const me = members.find((m) => m.isMe)!;

  const myBadgeIds = earnedBadges({
    startDate: snapshot.startDate,
    itemCount: items.length,
    localToday: me.localToday,
    localDayIndex: me.localDayIndex,
    localCountsByDate: me.localCountsByDate,
    localCheckHours: me.localCheckHours,
  }).map((b) => b.id);

  return (
    // One responsive grid at every width - single column below lg, then
    // checklist + a sticky sidebar (stats/streak panel with Share inline,
    // plus the mascot) at lg - instead of a desktop-only layout bolted
    // onto an unrelated mobile one. pb-28 reserves room for GroupNav's
    // fixed bottom bar below lg (it hides itself above lg, no clearance
    // needed there). See
    // design/project/desktop-redesign/TodayDesktop.dc.html - its own
    // "Mobile" and "Desktop" artboards are byte-identical HTML, reflowed
    // purely by that file's own `@media` rules - and that folder's
    // NOTES.md.
    <div className="px-5 pt-1.5 pb-28 sm:px-6 lg:mx-auto lg:max-w-[1160px] lg:px-10 lg:pt-10 lg:pb-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_372px] lg:items-start">
        <GroupTabHeader
          groupId={groupId}
          groupName={snapshot.name}
          myName={me.name}
          myColor={me.color}
          myAvatarSeed={me.avatarSeed}
          isAdmin={snapshot.myRole === "admin"}
          groups={groups}
          subtitle={<TodayDateLabel dayIndex={dayIndex} durationDays={durationDays} />}
        />

        {/* Streamed in behind its own boundary - see today-checklist-section's
            comment for why this doesn't cost a second DB round trip. */}
        <Suspense fallback={<ChecklistSkeleton />}>
          <TodayChecklistSection groupId={groupId} userId={userId} />
        </Suspense>

        {/* Streamed in behind its own boundary - see member-list-section's
            comment for why this doesn't cost a second DB round trip. */}
        <Suspense fallback={<MemberListSkeleton />}>
          <MemberListSection groupId={groupId} userId={userId} />
        </Suspense>
      </div>

      <NewBadgeToast groupId={groupId} earnedBadgeIds={myBadgeIds} />
    </div>
  );
}

/** Stand-in for TodayChecklistSection while it streams in. */
function ChecklistSkeleton() {
  return (
    <div className="lg:col-start-1">
      <div className="skeleton h-24 rounded-3xl" />
      <div className="skeleton mt-6 h-14 rounded-2xl" />
      <div className="skeleton mt-2 h-14 rounded-2xl" />
      <div className="skeleton mt-2 h-14 rounded-2xl" />
    </div>
  );
}

/** Stand-in for MemberListSection while it streams in. */
function MemberListSkeleton() {
  return (
    <div className="mt-11 flex flex-col gap-2 lg:col-start-1">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-14 rounded-2xl" />
      ))}
    </div>
  );
}
