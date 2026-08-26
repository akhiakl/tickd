import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
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

type MyGroupRow = {
  id: string;
  name: string;
  startDate: string;
  durationDays: number;
  isAdmin: boolean;
  // Epoch ms, not a `Date` - keeps this cacheable the same way
  // getGroupCore's return value is (see its own comment): plain
  // JSON-shaped data only, nothing that needs special (de)serialization
  // through the remote cache handler.
  joinedAtMs: number;
};

/**
 * The raw membership rows behind `getMyGroups`, cached the same way
 * `getGroupCore` is: this exact query re-runs on every navigation between
 * a group's Today/Wall/Ranks tabs (each tab's page fetches it
 * independently, and none of them share a layout that could dedupe it),
 * so without a cross-request cache it's a guaranteed extra DB round trip
 * on every tab switch even when nothing about a person's group list has
 * changed - noticeable overhead that has nothing to do with how much data
 * is actually in it. Same short TTL and same staleness trade-off as
 * `getGroupCore`: a just-joined/just-removed group can take up to the
 * revalidate window to show up or disappear here.
 */
async function getMyGroupRows(userId: string): Promise<MyGroupRow[]> {
  "use cache: remote";
  cacheTag(`my-groups:${userId}`);
  cacheLife({ stale: 5, revalidate: 2, expire: 30 });

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

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    durationDays: row.durationDays,
    isAdmin: row.role === "admin",
    joinedAtMs: row.joinedAt.getTime(),
  }));
}

/** The groups a user belongs to, for the landing page and the group switcher. */
export const getMyGroups = cache(async (userId: string): Promise<MyGroupCard[]> => {
  const rows = await getMyGroupRows(userId);

  // Not cached above - reads Date.now(), like getGroupSnapshot's own
  // dayIndex computation, so it can't live inside the cached scope.
  const today = todayISODate();
  return rows
    .sort((a, b) => b.joinedAtMs - a.joinedAtMs)
    .map((row) => ({
      id: row.id,
      name: row.name,
      dayIndex: challengeDayIndex(row.startDate, row.durationDays, today),
      durationDays: row.durationDays,
      isAdmin: row.isAdmin,
    }));
});
