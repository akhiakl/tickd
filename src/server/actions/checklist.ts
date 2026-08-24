"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/db";
import { checklistItems, dailyChecks, groupMembers, groups } from "@/server/db/schema";
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

/** Exported for src/server/actions/nudge.ts, which needs the same
 * "both people are actually in this group" check for a poke. */
export async function requireMembership(groupId: string, userId: string) {
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

/** Sets today's tick for one checklist item to `checked`, for the signed-in
 * member. The caller (TodayLive) always already knows the state it's
 * driving the item to - it just optimistically painted that same state -
 * so this takes the target directly instead of reading the row first to
 * decide which way to flip it. That cuts what used to be a
 * read-then-write (select, then insert-or-delete: two sequential round
 * trips before the write could even start) down to a single write, and
 * makes repeated calls idempotent rather than order-sensitive - a real
 * property to have given queueRef only serializes calls from the same
 * tab, not from two tabs open on the same account.
 *
 * The Today page already hides/disables the checklist before a group's
 * start date (see TodayChecklist's `disabled` prop) - this is the
 * server-side backstop against a stale client or a direct call bypassing
 * that UI, checked against the same UTC clock `date` below is written
 * under. */
export async function setChecked(
  groupId: string,
  checklistItemId: string,
  checked: boolean,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const date = todayISODate();

  // Membership and the group's own row don't depend on each other - no
  // reason to make one wait on the other.
  const [, group] = await Promise.all([
    requireMembership(groupId, userId),
    db.query.groups.findFirst({ where: eq(groups.id, groupId) }),
  ]);
  if (!group) throw new Error("That group doesn't exist.");
  if (date < group.startDate) {
    return { ok: false, error: "This challenge hasn't started yet." };
  }

  if (checked) {
    // onConflictDoNothing against the (userId, checklistItemId, date)
    // unique index below makes this safe to call again for a state
    // that's already set, instead of erroring on a duplicate row.
    await db
      .insert(dailyChecks)
      .values({ id: crypto.randomUUID(), groupId, userId, checklistItemId, date })
      .onConflictDoNothing();
  } else {
    await db
      .delete(dailyChecks)
      .where(
        and(
          eq(dailyChecks.userId, userId),
          eq(dailyChecks.checklistItemId, checklistItemId),
          eq(dailyChecks.date, date),
        ),
      );
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
