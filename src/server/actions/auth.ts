"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { hashPassword } from "@/server/auth/password";
import { requireUserId } from "@/server/auth/require-user";
import { setUserCredentials } from "@/server/queries/users";
import {
  guestNameSchema,
  credentialsSignInSchema,
  setCredentialsSchema,
} from "@/server/validation/schemas";
import type { ActionResult } from "./result";

/**
 * Signs in as a brand-new guest with just a typed name - no password,
 * email, or OAuth. On success `signIn()` redirects internally (it throws
 * Next's redirect signal), so this only ever returns for the error path;
 * the happy path never reaches the `return { ok: true }` below.
 */
export async function signInAsGuest(input: {
  name: string;
  callbackUrl: string;
}): Promise<ActionResult> {
  const parsed = guestNameSchema.safeParse(input.name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await signIn("guest", { name: parsed.data, redirectTo: input.callbackUrl });
  return { ok: true };
}

/** Signs in with a previously-set username/password (see `setCredentials`
 * below). Same "only returns on the error path" shape as `signInAsGuest`. */
export async function signInWithPassword(input: {
  username: string;
  password: string;
  callbackUrl: string;
}): Promise<ActionResult> {
  const parsed = credentialsSignInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    await signIn("password", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirectTo: input.callbackUrl,
    });
    return { ok: true };
  } catch (err) {
    // Auth.js throws its own redirect signal on success (re-thrown below,
    // unchanged) and wraps a failed authorize() in AuthError - anything
    // else is a real bug, not a wrong password.
    if (err instanceof AuthError) {
      return { ok: false, error: "Wrong username or password." };
    }
    throw err;
  }
}

/**
 * Sets username + password on the signed-in user's own row - the "save
 * your account" upgrade a guest can do from /account so they can log back
 * in from another device without losing this row's id/history. Doesn't
 * change `isGuest`: that field only ever means "not an Auth0 identity."
 */
export async function setCredentials(input: unknown): Promise<ActionResult> {
  const parsed = setCredentialsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const userId = await requireUserId();
  const passwordHash = await hashPassword(parsed.data.password);
  const updated = await setUserCredentials(userId, parsed.data.username, passwordHash);
  if (!updated) return { ok: false, error: "That username is taken." };

  return { ok: true };
}
