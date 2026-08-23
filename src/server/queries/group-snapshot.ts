import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { checklistItems, dailyChecks, groupMembers, groups, users } from "@/server/db/schema";
import { challengeDayIndex, todayISODate } from "@/lib/challenge-stats";
import { SIDE_QUEST_PATTERN } from "@/lib/constants";
import type { GroupSnapshot, MemberSnapshot } from "@/types/domain";

type GroupCore = {
  id: string;
  name: string;
  inviteCode: string;
  startDate: string;
  durationDays: number;
  archived: boolean;
  items: GroupSnapshot["items"];
  members: Omit<MemberSnapshot, "isMe">[];
};

/**
 * The part of a group's data that's identical for every viewer: the group
 * itself, its checklist, every member, and every daily check. Cached by
 * `groupId` alone (not per viewer, and not closing over the viewer's id -
 * that's what keeps the cache key just the group) with a short remote TTL,
 * so a burst of navigations - one member tabbing between Today/Wall/Ranks,
 * several members opening the group within the same few seconds - shares
 * one query instead of re-running the full check-history scan per request.
 * See `cacheHandlers.remote` in next.config.ts for where this is actually
 * stored (Redis in production, in-memory otherwise).
 *
 * Deliberately excludes anything that depends on either the viewer (isMe,
 * "my" role) or the real clock (today/dayIndex) - both belong in
 * `getGroupSnapshot` below, computed *after* this cache lookup, since a
 * cached value can't safely read `Date.now()` (it would freeze "today" for
 * the cache's lifetime) and shouldn't fragment the cache key per user.
 *
 * Trade-off worth knowing: `getGroupSnapshot`'s membership check below
 * reads this cached `members` list, so someone removed from a group can
 * stay able to load it for up to the cache's revalidate window (a few
 * seconds) rather than instantly. Fine for this app's stakes; revisit if
 * that ever needs to be immediate.
 */
async function getGroupCore(groupId: string): Promise<GroupCore | null> {
  "use cache: remote";
  cacheTag(`group:${groupId}`);
  cacheLife({ stale: 5, revalidate: 2, expire: 30 });

  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  if (!group) return null;

  const [items, memberRows, checks] = await Promise.all([
    db.query.checklistItems.findMany({
      where: eq(checklistItems.groupId, groupId),
      orderBy: (t, { asc }) => asc(t.position),
    }),
    db
      .select({
        userId: users.id,
        name: users.name,
        color: users.color,
        avatarSeed: users.avatarSeed,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId)),
    db.query.dailyChecks.findMany({ where: eq(dailyChecks.groupId, groupId) }),
  ]);

  const members: Omit<MemberSnapshot, "isMe">[] = memberRows.map((m) => ({
    userId: m.userId,
    name: m.name,
    color: m.color,
    avatarSeed: m.avatarSeed,
    role: m.role,
    countsByDate: {},
    itemsByDate: {},
  }));
  const memberById = new Map(members.map((m) => [m.userId, m]));

  for (const check of checks) {
    const member = memberById.get(check.userId);
    if (!member) continue;
    member.countsByDate[check.date] = (member.countsByDate[check.date] ?? 0) + 1;
    (member.itemsByDate[check.date] ??= []).push(check.checklistItemId);
  }

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    startDate: group.startDate,
    durationDays: group.durationDays,
    archived: group.archivedAt !== null,
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      position: item.position,
      isSideQuest: SIDE_QUEST_PATTERN.test(item.label),
    })),
    members,
  };
}

/**
 * Loads everything a group's screens need in one round trip, for one
 * viewer. Memoized per request with React `cache()` on top of the shared,
 * cross-request `getGroupCore` above: the layout and the page both call
 * this for the same group without a duplicate lookup, and most of the
 * work behind it is shared with every other member viewing the same group.
 */
export const getGroupSnapshot = cache(
  async (groupId: string, viewerUserId: string): Promise<GroupSnapshot | null> => {
    const core = await getGroupCore(groupId);
    if (!core) return null;

    const membership = core.members.find((m) => m.userId === viewerUserId);
    if (!membership) return null;

    const today = todayISODate();
    const dayIndex = challengeDayIndex(core.startDate, core.durationDays, today);

    return {
      id: core.id,
      name: core.name,
      inviteCode: core.inviteCode,
      startDate: core.startDate,
      durationDays: core.durationDays,
      archived: core.archived,
      today,
      dayIndex,
      items: core.items,
      members: core.members.map((m) => ({ ...m, isMe: m.userId === viewerUserId })),
      myRole: membership.role,
    };
  },
);
