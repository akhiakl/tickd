"use server";

import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/db";
import { checklistItems, groupMembers, groups } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { rateLimit } from "@/server/rate-limit";
import { createGroupSchema, joinGroupSchema } from "@/server/validation/schemas";
import { getUserById } from "@/server/queries/users";
import { localISODate } from "@/lib/timezone";
import type { ActionResult } from "./result";

const TOO_MANY_ATTEMPTS: ActionResult = { ok: false, error: "Too many attempts. Try again later." };

/** Invite codes gate group membership, so they're drawn from a CSPRNG rather than Math.random(). */
function randomInviteCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const alnum = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (chars: string, length: number) =>
    Array.from({ length }, () => chars[randomInt(chars.length)]).join("");
  return `${pick(letters, 4)}-${pick(alnum, 4)}`;
}

/** Creates a group, seeds its checklist, and makes the caller its admin. */
export async function createGroup(input: unknown): Promise<ActionResult & { groupId?: string }> {
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const userId = await requireUserId();

  // Bounds a scripted account spamming empty groups (each insert also
  // seeds up to 20 checklist item rows), not normal usage.
  const allowed = await rateLimit(`create-group:${userId}`, 10, 3600);
  if (!allowed) return TOO_MANY_ATTEMPTS;

  const { name, durationDays, startDate, items } = parsed.data;

  // "Today" in the creator's own elected timezone (UTC if they haven't
  // set one) - the client already disables past dates in the picker (see
  // CreateGroupForm), this is the server-side backstop against a stale
  // client clock or a direct call bypassing the form.
  const creator = await getUserById(userId);
  const creatorToday = localISODate(new Date(), creator?.timezone ?? null);
  if (startDate < creatorToday) {
    return { ok: false, error: "Start date can't be in the past." };
  }

  const groupId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(groups).values({
      id: groupId,
      name,
      inviteCode: randomInviteCode(),
      startDate,
      durationDays,
      createdByUserId: userId,
    });
    await tx.insert(groupMembers).values({ groupId, userId, role: "admin" });
    await tx.insert(checklistItems).values(
      items.map((label, position) => ({
        id: crypto.randomUUID(),
        groupId,
        label,
        position,
      })),
    );
  });

  revalidatePath("/");
  updateTag(`my-groups:${userId}`);
  redirect(`/g/${groupId}`);
}

/** Joins the caller into a group by invite code. */
export async function joinGroup(input: unknown): Promise<ActionResult & { groupId?: string }> {
  const parsed = joinGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const userId = await requireUserId();

  // Invite codes are an 8-character CSPRNG string (see randomInviteCode
  // above), not brute-forceable in practice - but this still bounds how
  // many guesses an account can throw at it per hour, cheaply.
  const allowed = await rateLimit(`join-group:${userId}`, 20, 3600);
  if (!allowed) return TOO_MANY_ATTEMPTS;

  const group = await db.query.groups.findFirst({
    where: eq(groups.inviteCode, parsed.data.inviteCode),
  });
  if (!group) return { ok: false, error: "No group matches that code." };

  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)),
  });
  if (!existing) {
    await db.insert(groupMembers).values({ groupId: group.id, userId, role: "member" });
  }

  revalidatePath("/");
  updateTag(`group:${group.id}`);
  updateTag(`my-groups:${userId}`);
  redirect(`/g/${group.id}`);
}

async function requireAdmin(groupId: string, userId: string) {
  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  });
  if (!membership || membership.role !== "admin") {
    throw new Error("Only the group admin can do that.");
  }
}

export async function regenerateInvite(groupId: string): Promise<ActionResult & { code?: string }> {
  const userId = await requireUserId();
  await requireAdmin(groupId, userId);
  const code = randomInviteCode();
  await db.update(groups).set({ inviteCode: code }).where(eq(groups.id, groupId));
  revalidatePath(`/g/${groupId}/settings`);
  updateTag(`group:${groupId}`);
  return { ok: true, code };
}

export async function archiveGroup(groupId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAdmin(groupId, userId);
  await db.update(groups).set({ archivedAt: new Date() }).where(eq(groups.id, groupId));
  revalidatePath(`/g/${groupId}`);
  updateTag(`group:${groupId}`);
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAdmin(groupId, userId);
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath("/");
  updateTag(`group:${groupId}`);
  // Other members' own my-groups:${theirId} tags aren't touched here -
  // same staleness trade-off getGroupCore's own comment accepts for
  // membership changes: they stop being able to load the group within
  // the cache's revalidate window, well before it'd still show in their
  // switcher.
  updateTag(`my-groups:${userId}`);
  redirect("/");
}

export async function removeMember(groupId: string, memberUserId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAdmin(groupId, userId);
  if (memberUserId === userId) return { ok: false, error: "You can't remove yourself." };
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberUserId)));
  revalidatePath(`/g/${groupId}/settings`);
  updateTag(`group:${groupId}`);
  updateTag(`my-groups:${memberUserId}`);
  return { ok: true };
}
