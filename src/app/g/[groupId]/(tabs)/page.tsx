import { Suspense } from "react";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { getMyGroups } from "@/server/queries/my-groups";
import { requireValidUserId } from "@/server/auth/require-user";
import { GroupTabHeader } from "@/components/nav/group-tab-header";
import { TodayDateLabel } from "@/components/today/today-date-label";
import { ShareButton } from "@/components/today/share-button";
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
    // pb-40 (not the old pb-30) reserves enough room for ShareButton, now
    // that it's genuinely fixed to the viewport at all scroll positions
    // instead of an absolute-positioned element that happened to render
    // near the bottom: fixed bottom-24 + the button's own ~54px height
    // puts its top edge ~150px above the viewport bottom, so the last
    // checklist/member row needs at least that much clearance to never
    // sit underneath it when scrolled all the way down.
    <div className="pt-1.5 pb-40">
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

      <ShareButton groupId={groupId} />
      <NewBadgeToast groupId={groupId} earnedBadgeIds={myBadgeIds} />
    </div>
  );
}

/** Stand-in for TodayChecklistSection while it streams in. */
function ChecklistSkeleton() {
  return (
    <div className="px-4">
      <div className="skeleton mt-5.5 h-24 rounded-3xl" />
      <div className="skeleton mt-6 h-14 rounded-2xl" />
      <div className="skeleton mt-2 h-14 rounded-2xl" />
      <div className="skeleton mt-2 h-14 rounded-2xl" />
    </div>
  );
}

/** Stand-in for MemberListSection while it streams in. */
function MemberListSkeleton() {
  return (
    <div className="mt-11 flex flex-col gap-2 px-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-14 rounded-2xl" />
      ))}
    </div>
  );
}
