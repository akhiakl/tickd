import "server-only";
import { and, eq, gte, inArray, isNull, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import {
  checklistItems,
  dailyChecks,
  groupMembers,
  groups,
  pushSubscriptions,
  users,
} from "@/server/db/schema";
import { todayISODate, toISODate } from "@/lib/challenge-stats";

export type NudgeCandidate = { userId: string; timezone: string | null };

/** Every reminder-eligible user who actually has somewhere to send a push
 * - reminderEnabled/weeklyRecapEnabled alone isn't enough to act on, a
 * subscription row is what makes sending possible at all. Carries
 * `timezone` along so the cron route can decide *when* to fire for each
 * one without a second round trip. Takes the whole `WHERE` condition
 * rather than a column reference: two different boolean columns don't
 * structurally unify under a single `PgColumn<...>` parameter type
 * (Drizzle's column types carry their literal column name), but two
 * `SQL` conditions do. */
async function getCandidates(prefCondition: SQL): Promise<NudgeCandidate[]> {
  const rows = await db
    .selectDistinct({ userId: users.id, timezone: users.timezone })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
    .where(prefCondition);
  return rows;
}

export function getReminderCandidates(): Promise<NudgeCandidate[]> {
  return getCandidates(eq(users.reminderEnabled, true));
}

export function getWeeklyRecapCandidates(): Promise<NudgeCandidate[]> {
  return getCandidates(eq(users.weeklyRecapEnabled, true));
}

/**
 * Folds three flat queries (memberships, that group's checklist items,
 * today's checks) in memory rather than one aggregate SQL query - same
 * "pull it all and fold it" approach getGroupSnapshot already uses for
 * the same reason: a habit tracker's data per person is small, and this
 * stays a lot easier to read than the equivalent multi-join HAVING
 * clause. Archived groups don't count - nobody should get nudged about a
 * challenge that's already over.
 */
export async function getUsersWithUncheckedItemsToday(
  candidateUserIds: string[],
): Promise<Set<string>> {
  if (candidateUserIds.length === 0) return new Set();
  const today = todayISODate();

  const memberships = await db
    .select({ userId: groupMembers.userId, groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(inArray(groupMembers.userId, candidateUserIds), isNull(groups.archivedAt)));
  if (memberships.length === 0) return new Set();

  const groupIds = [...new Set(memberships.map((m) => m.groupId))];

  const items = await db
    .select({ groupId: checklistItems.groupId, id: checklistItems.id })
    .from(checklistItems)
    .where(inArray(checklistItems.groupId, groupIds));

  const itemsByGroup = new Map<string, string[]>();
  for (const item of items) {
    const list = itemsByGroup.get(item.groupId);
    if (list) list.push(item.id);
    else itemsByGroup.set(item.groupId, [item.id]);
  }

  const checks = await db
    .select({ userId: dailyChecks.userId, checklistItemId: dailyChecks.checklistItemId })
    .from(dailyChecks)
    .where(
      and(
        inArray(dailyChecks.userId, candidateUserIds),
        inArray(dailyChecks.groupId, groupIds),
        eq(dailyChecks.date, today),
      ),
    );
  const checkedSet = new Set(checks.map((c) => `${c.userId}:${c.checklistItemId}`));

  const result = new Set<string>();
  for (const m of memberships) {
    const itemIds = itemsByGroup.get(m.groupId) ?? [];
    if (itemIds.some((id) => !checkedSet.has(`${m.userId}:${id}`))) result.add(m.userId);
  }
  return result;
}

/** Items checked in the last 7 days (today inclusive), per candidate. */
export async function getWeeklyRecapCounts(
  candidateUserIds: string[],
): Promise<Map<string, number>> {
  if (candidateUserIds.length === 0) return new Map();
  const since = toISODate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

  const rows = await db
    .select({ userId: dailyChecks.userId })
    .from(dailyChecks)
    .where(and(inArray(dailyChecks.userId, candidateUserIds), gte(dailyChecks.date, since)));

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
  return counts;
}
