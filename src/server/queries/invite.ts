import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { groupMembers, groups } from "@/server/db/schema";

/**
 * Resolves an invite code to the group it belongs to, and whether the
 * given user already has a membership row there. Not cached (unlike the
 * read paths used once a session is inside a group, e.g. my-groups.ts) -
 * this only runs once, on load of the join page itself, and needs to
 * reflect the current state: a code from a group created moments ago
 * shouldn't lag behind a cache TTL, and joining/leaving shouldn't either.
 *
 * One query, not two: the membership lookup is joined onto the group
 * lookup rather than run as a separate follow-up call, so an invalid code
 * and a valid-but-not-a-member code cost the same round trip instead of
 * the latter taking measurably longer.
 */
export async function findGroupByInviteCode(
  inviteCode: string,
  userId: string,
): Promise<{ groupId: string; alreadyMember: boolean } | null> {
  const [row] = await db
    .select({ groupId: groups.id, memberUserId: groupMembers.userId })
    .from(groups)
    .leftJoin(
      groupMembers,
      and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)),
    )
    .where(eq(groups.inviteCode, inviteCode))
    .limit(1);
  if (!row) return null;

  return { groupId: row.groupId, alreadyMember: row.memberUserId != null };
}
