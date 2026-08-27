import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users, type User } from "@/server/db/schema";
import { AVATAR_SWATCHES } from "@/lib/constants";

/** Finds or creates the app user row for a verified Auth0 identity. */
export async function upsertUserFromIdentity(identity: {
  authSub: string;
  email: string;
  name: string;
}): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: eq(users.authSub, identity.authSub),
  });
  if (existing) return existing;

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        authSub: identity.authSub,
        email: identity.email,
        name: identity.name,
        color: AVATAR_SWATCHES[0],
        avatarSeed: crypto.randomUUID(),
      })
      .returning();

    return created;
  } catch (err) {
    // Same verified email signing in through a different Auth0 connection
    // (e.g. Google after previously using email OTP) hits the `email`
    // unique constraint here. Link it to the existing row instead of
    // failing the sign-in.
    const existingByEmail = await db.query.users.findFirst({
      where: eq(users.email, identity.email),
    });
    if (!existingByEmail) throw err;

    const [linked] = await db
      .update(users)
      .set({ authSub: identity.authSub })
      .where(eq(users.id, existingByEmail.id))
      .returning();

    return linked;
  }
}

/**
 * Creates a brand-new guest user row for a Kahoot-style "pick a name" join.
 * Unlike `upsertUserFromIdentity` there's no stable external identity to
 * key on - every guest sign-in is a fresh participant, even if two people
 * (or the same person on two devices) type the same name.
 */
export async function createGuestUser(input: { name: string; timezone?: string }): Promise<User> {
  const [created] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      color: AVATAR_SWATCHES[0],
      avatarSeed: crypto.randomUUID(),
      isGuest: true,
      // Set right at creation when the sign-in form managed to detect one
      // (see guest-sign-in-form.tsx), so there's no gap where this account
      // has no timezone until TimezoneSync's next-page-load round trip
      // catches up. Still just a default: `undefined` here leaves the
      // column null exactly like before, and TimezoneSync/Account settings
      // remain the paths that actually set or change it after this.
      timezone: input.timezone,
    })
    .returning();

  return created;
}

/** Per-request memoized lookup of a user by internal id. */
export const getUserById = cache(async (id: string) => {
  return db.query.users.findFirst({ where: eq(users.id, id) });
});

/** Looks up a user by username for the password sign-in provider. `username`
 * must already be lowercased (see `usernameSchema`) - this does a plain
 * equality lookup, not a case-insensitive one, by design. */
export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({ where: eq(users.username, username) });
}

/**
 * Sets username + password hash on an existing row - the "save your
 * account" upgrade a guest can do from /account to make their account
 * reachable from another device, without losing their id/history the way
 * signing in as a fresh guest elsewhere would. Returns `null` on a
 * username collision instead of throwing, so the caller can show a normal
 * form error rather than a 500.
 */
export async function setUserCredentials(
  userId: string,
  username: string,
  passwordHash: string,
): Promise<User | null> {
  try {
    const [updated] = await db
      .update(users)
      .set({ username, passwordHash })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  } catch {
    return null;
  }
}
