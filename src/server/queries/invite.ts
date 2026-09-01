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
 */
export async function findGroupByInviteCode(
  inviteCode: string,
  userId: string,
): Promise<{ groupId: string; alreadyMember: boolean } | null> {
  const group = await db.query.groups.findFirst({
    where: eq(groups.inviteCode, inviteCode),
    columns: { id: true },
  });
  if (!group) return null;

  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)),
    columns: { userId: true },
  });

  return { groupId: group.id, alreadyMember: membership != null };
}
