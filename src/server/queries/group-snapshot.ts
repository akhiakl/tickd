import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { checklistItems, dailyChecks, groupMembers, groups, users } from "@/server/db/schema";
import { challengeDayIndex } from "@/lib/challenge-stats";
import { localISODate } from "@/lib/timezone";
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
  // localToday/localDayIndex aren't here - they read Date.now(), so like
  // the group's own today/dayIndex they're computed fresh per request in
  // getGroupSnapshot below, never cached. localCountsByDate/localItemsByDate
  // ARE cacheable: they're a deterministic reinterpretation of each check's
  // fixed checkedAt instant in the member's own (also stored, so also
  // stable within the cache's lifetime) timezone.
  members: Omit<MemberSnapshot, "isMe" | "localToday" | "localDayIndex">[];
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
        username: users.username,
        color: users.color,
        avatarSeed: users.avatarSeed,
        role: groupMembers.role,
        timezone: users.timezone,
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId)),
    db.query.dailyChecks.findMany({ where: eq(dailyChecks.groupId, groupId) }),
  ]);

  const members: Omit<MemberSnapshot, "isMe" | "localToday" | "localDayIndex">[] = memberRows.map(
    (m) => ({
      userId: m.userId,
      name: m.name,
      username: m.username,
      color: m.color,
      avatarSeed: m.avatarSeed,
      role: m.role,
      timezone: m.timezone,
      countsByDate: {},
      itemsByDate: {},
      localCountsByDate: {},
      localItemsByDate: {},
    }),
  );
  const memberById = new Map(members.map((m) => [m.userId, m]));

  for (const check of checks) {
    const member = memberById.get(check.userId);
    if (!member) continue;
    member.countsByDate[check.date] = (member.countsByDate[check.date] ?? 0) + 1;
    (member.itemsByDate[check.date] ??= []).push(check.checklistItemId);

    const localDate = localISODate(check.checkedAt, member.timezone);
    member.localCountsByDate[localDate] = (member.localCountsByDate[localDate] ?? 0) + 1;
    (member.localItemsByDate[localDate] ??= []).push(check.checklistItemId);
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

    // Each member's own "today", read fresh (not cached in getGroupCore -
    // see its comment) in their own elected timezone. The viewer's own
    // entry becomes the snapshot's today/dayIndex below, so the Today
    // page's "Day X of Y" and checklist frame around *their* day; every
    // other member carries their own alongside for their streak/profile.
    const now = new Date();
    const members: MemberSnapshot[] = core.members.map((m) => {
      const localToday = localISODate(now, m.timezone);
      return {
        ...m,
        isMe: m.userId === viewerUserId,
        localToday,
        localDayIndex: challengeDayIndex(core.startDate, core.durationDays, localToday),
      };
    });
    const me = members.find((m) => m.isMe)!;

    return {
      id: core.id,
      name: core.name,
      inviteCode: core.inviteCode,
      startDate: core.startDate,
      durationDays: core.durationDays,
      archived: core.archived,
      today: me.localToday,
      dayIndex: me.localDayIndex,
      items: core.items,
      members,
      myRole: membership.role,
    };
  },
);
