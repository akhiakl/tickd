"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { updatePrefsSchema, updateProfileSchema } from "@/server/validation/schemas";
import type { ActionResult } from "./result";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const userId = await requireUserId();

  await db.update(users).set(parsed.data).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePreferences(input: unknown): Promise<ActionResult> {
  const parsed = updatePrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save that preference." };
  const userId = await requireUserId();

  await db.update(users).set(parsed.data).where(eq(users.id, userId));
  revalidatePath("/account");
  return { ok: true };
}
