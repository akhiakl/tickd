"use server";

import { and, eq, isNull } from "drizzle-orm";
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
 * Best-effort *default* for a person who's never chosen a timezone -
 * called unconditionally from TimezoneSync on every page, including for
 * anonymous visitors, so this reads the session itself (`auth()`, not
 * `requireUserId()`) and quietly no-ops rather than throwing when there
 * isn't one.
 *
 * Deliberately conditional on `timezone IS NULL`: a person's elected
 * timezone (this column) drives their own "today"/streak and what other
 * members see as their clock, so once it's set - by this default firing
 * once, or by them picking one in Account settings - it must never get
 * silently overwritten by whatever the browser happens to detect on a
 * later visit (a different device, a VPN, travel). Account settings'
 * `setTimezonePreference` below is the only path that can change it after
 * this first write.
 */
export async function setTimezone(timezone: string): Promise<ActionResult> {
  if (!IANA_TIMEZONE_PATTERN.test(timezone)) return { ok: false, error: "Invalid timezone." };

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  await db
    .update(users)
    .set({ timezone })
    .where(and(eq(users.id, userId), isNull(users.timezone)));
  return { ok: true };
}

/**
 * Explicit, always-overwrites set of a person's elected timezone - the
 * Account settings picker, pre-filled with the browser's detected zone
 * but changeable to anything, e.g. before traveling. Unlike `setTimezone`
 * above this requires a real session (a signed-in change, not a
 * best-effort background sync).
 */
export async function setTimezonePreference(timezone: string): Promise<ActionResult> {
  if (!IANA_TIMEZONE_PATTERN.test(timezone)) return { ok: false, error: "Invalid timezone." };
  const userId = await requireUserId();

  await db.update(users).set({ timezone }).where(eq(users.id, userId));
  revalidatePath("/account");
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
