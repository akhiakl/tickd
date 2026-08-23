"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/db";
import { checklistItems, dailyChecks, groupMembers } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { checklistItemLabelSchema, reorderSchema } from "@/server/validation/schemas";
import { todayISODate } from "@/lib/challenge-stats";
import type { ActionResult } from "./result";

/** Invalidates both the route cache and `getGroupCore`'s cross-request
 * cache (tagged `group:<id>` in src/server/queries/group-snapshot.ts) so a
 * write is visible immediately instead of waiting out its short TTL.
 * `updateTag`, not `revalidateTag`: every caller here is a Server Action,
 * and this is a read-your-own-writes case (the person who just ticked an
 * item should see it ticked, not stale-while-revalidate). */
function refreshGroup(groupId: string) {
  revalidatePath(`/g/${groupId}`, "layout");
  updateTag(`group:${groupId}`);
}

async function requireMembership(groupId: string, userId: string) {
  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  });
  if (!membership) throw new Error("You're not a member of this group.");
  return membership;
}

async function requireAdminMembership(groupId: string, userId: string) {
  const membership = await requireMembership(groupId, userId);
  if (membership.role !== "admin") throw new Error("Only the group admin can do that.");
}

/** Toggles today's tick for one checklist item, for the signed-in member. */
export async function toggleCheck(groupId: string, checklistItemId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireMembership(groupId, userId);
  const date = todayISODate();

  const existing = await db.query.dailyChecks.findFirst({
    where: and(
      eq(dailyChecks.userId, userId),
      eq(dailyChecks.checklistItemId, checklistItemId),
      eq(dailyChecks.date, date),
    ),
  });

  if (existing) {
    await db.delete(dailyChecks).where(eq(dailyChecks.id, existing.id));
  } else {
    await db.insert(dailyChecks).values({
      id: crypto.randomUUID(),
      groupId,
      userId,
      checklistItemId,
      date,
    });
  }

  refreshGroup(groupId);
  return { ok: true };
}

export async function addChecklistItem(groupId: string, label: string): Promise<ActionResult> {
  const parsed = checklistItemLabelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: "Give the item a name." };
  const userId = await requireUserId();
  await requireAdminMembership(groupId, userId);

  const last = await db
    .select({ position: checklistItems.position })
    .from(checklistItems)
    .where(eq(checklistItems.groupId, groupId))
    .orderBy(desc(checklistItems.position))
    .limit(1);

  await db.insert(checklistItems).values({
    id: crypto.randomUUID(),
    groupId,
    label: parsed.data,
    position: (last.at(0)?.position ?? -1) + 1,
  });

  refreshGroup(groupId);
  return { ok: true };
}

export async function renameChecklistItem(
  groupId: string,
  itemId: string,
  label: string,
): Promise<ActionResult> {
  const parsed = checklistItemLabelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: "Give the item a name." };
  const userId = await requireUserId();
  await requireAdminMembership(groupId, userId);

  await db.update(checklistItems).set({ label: parsed.data }).where(eq(checklistItems.id, itemId));
  refreshGroup(groupId);
  return { ok: true };
}

export async function removeChecklistItem(groupId: string, itemId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAdminMembership(groupId, userId);

  await db.delete(checklistItems).where(eq(checklistItems.id, itemId));
  refreshGroup(groupId);
  return { ok: true };
}

/** Persists a full new item order after a drag-and-drop reorder. */
export async function reorderChecklistItems(input: unknown): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save that order." };
  const { groupId, orderedItemIds } = parsed.data;
  const userId = await requireUserId();
  await requireAdminMembership(groupId, userId);

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedItemIds.map((itemId, position) =>
        tx.update(checklistItems).set({ position }).where(eq(checklistItems.id, itemId)),
      ),
    );
  });

  refreshGroup(groupId);
  return { ok: true };
}
