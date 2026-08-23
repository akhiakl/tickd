import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { checklistItems, dailyChecks, groupMembers, groups, users } from "@/server/db/schema";
import { challengeDayIndex, todayISODate } from "@/lib/challenge-stats";
import { SIDE_QUEST_PATTERN } from "@/lib/constants";
import type { GroupSnapshot, MemberSnapshot } from "@/types/domain";

/**
 * Loads everything a group's screens need in one round trip: the group,
 * its checklist, every member, and every daily check. A habit-tracker
 * group is small (dozens of members, dozens of days, single-digit items),
 * so pulling the full check history and folding it in memory is simpler
 * and just as fast as a set of narrower aggregate queries - and it lets
 * every screen (Today, Wall, Ranks, Profile, Settings) share one read.
 *
 * Memoized per request with React `cache()`: the layout and the page both
 * call this for the same group without a duplicate query.
 */
export const getGroupSnapshot = cache(
  async (groupId: string, viewerUserId: string): Promise<GroupSnapshot | null> => {
    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return null;

    const membership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, viewerUserId)),
    });
    if (!membership) return null;

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

    const today = todayISODate();
    const dayIndex = challengeDayIndex(group.startDate, group.durationDays, today);

    const members: MemberSnapshot[] = memberRows.map((m) => ({
      userId: m.userId,
      name: m.name,
      color: m.color,
      avatarSeed: m.avatarSeed,
      role: m.role,
      isMe: m.userId === viewerUserId,
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
      today,
      dayIndex,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        position: item.position,
        isSideQuest: SIDE_QUEST_PATTERN.test(item.label),
      })),
      members,
      myRole: membership.role,
    };
  },
);
