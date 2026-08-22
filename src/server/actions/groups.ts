"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { checklistItems, groupMembers, groups } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { createGroupSchema, joinGroupSchema } from "@/server/validation/schemas";
import type { ActionResult } from "./auth";

function randomInviteCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const alnum = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (chars: string, length: number) =>
    Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(letters, 4)}-${pick(alnum, 4)}`;
}

/** Creates a group, seeds its checklist, and makes the caller its admin. */
export async function createGroup(input: unknown): Promise<ActionResult & { groupId?: string }> {
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const userId = await requireUserId();
  const { name, durationDays, startDate, items } = parsed.data;

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
  redirect(`/g/${groupId}`);
}

/** Joins the caller into a group by invite code. */
export async function joinGroup(input: unknown): Promise<ActionResult & { groupId?: string }> {
  const parsed = joinGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const userId = await requireUserId();

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
  return { ok: true, code };
}

export async function archiveGroup(groupId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAdmin(groupId, userId);
  await db.update(groups).set({ archivedAt: new Date() }).where(eq(groups.id, groupId));
  revalidatePath(`/g/${groupId}`);
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAdmin(groupId, userId);
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath("/");
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
  return { ok: true };
}
