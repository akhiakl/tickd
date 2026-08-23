"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { updatePrefsSchema, updateProfileSchema } from "@/server/validation/schemas";
import type { ActionResult } from "./result";

/** A loose IANA-zone-shaped check ("Region/City", "Region/City/City", or
 * "UTC") - not validating against the real tz database, just guarding
 * against obviously-wrong input before it lands in a column the cron
 * routes trust. */
const IANA_TIMEZONE_PATTERN = /^[A-Za-z_]+(\/[A-Za-z_]+){0,2}$|^UTC$/;

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

/**
 * Best-effort sync of the browser's IANA timezone, called unconditionally
 * from HydrationMarker on every page - including for anonymous visitors,
 * so this reads the session itself (`auth()`, not `requireUserId()`) and
 * quietly no-ops rather than throwing when there isn't one.
 */
export async function setTimezone(timezone: string): Promise<ActionResult> {
  if (!IANA_TIMEZONE_PATTERN.test(timezone)) return { ok: false, error: "Invalid timezone." };

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  await db.update(users).set({ timezone }).where(eq(users.id, userId));
  return { ok: true };
}

/** Rerolls the identicon pattern only - the chosen color is untouched. */
export async function randomizeAvatar(): Promise<ActionResult & { avatarSeed?: string }> {
  const userId = await requireUserId();
  const avatarSeed = crypto.randomUUID();

  await db.update(users).set({ avatarSeed }).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { ok: true, avatarSeed };
}
