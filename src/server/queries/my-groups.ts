import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { groupMembers, groups } from "@/server/db/schema";
import { challengeDayIndex, todayISODate } from "@/lib/challenge-stats";

export type MyGroupCard = {
  id: string;
  name: string;
  dayIndex: number;
  durationDays: number;
  isAdmin: boolean;
};

/** The groups a user belongs to, for the landing page and the group switcher. */
export const getMyGroups = cache(async (userId: string): Promise<MyGroupCard[]> => {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      startDate: groups.startDate,
      durationDays: groups.durationDays,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId));

  const today = todayISODate();
  return rows
    .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
    .map((row) => ({
      id: row.id,
      name: row.name,
      dayIndex: challengeDayIndex(row.startDate, row.durationDays, today),
      durationDays: row.durationDays,
      isAdmin: row.role === "admin",
    }));
});
