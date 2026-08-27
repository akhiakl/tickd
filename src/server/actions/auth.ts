"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { hashPassword } from "@/server/auth/password";
import { requireUserId } from "@/server/auth/require-user";
import { getUserByUsername, setUserCredentials } from "@/server/queries/users";
import { rateLimit, getClientIp } from "@/server/rate-limit";
import {
  guestNameSchema,
  credentialsSignInSchema,
  setCredentialsSchema,
  usernameSchema,
  timezoneSchema,
} from "@/server/validation/schemas";
import type { ActionResult } from "./result";

const TOO_MANY_ATTEMPTS: ActionResult = { ok: false, error: "Too many attempts. Try again later." };

/**
 * Signs in as a brand-new guest with just a typed name - no password,
 * email, or OAuth. On success `signIn()` redirects internally (it throws
 * Next's redirect signal), so this only ever returns for the error path;
 * the happy path never reaches the `return { ok: true }` below.
 */
export async function signInAsGuest(input: {
  name: string;
  callbackUrl: string;
  /** Browser-detected IANA zone, best-effort - see guest-sign-in-form.tsx.
   * Silently dropped rather than failing sign-in when it's missing or
   * doesn't parse; the account still creates fine without it. */
  timezone?: string;
}): Promise<ActionResult> {
  const parsed = guestNameSchema.safeParse(input.name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const parsedTimezone = timezoneSchema.safeParse(input.timezone);

  // Every call inserts a fresh users row with no auth barrier at all - the
  // cheapest thing in the app for a bot to spam, so it gets the tightest
  // limit. Generous enough for someone genuinely switching devices a lot.
  const ip = await getClientIp();
  const allowed = await rateLimit(`guest-signup:${ip}`, 8, 600);
  if (!allowed) return TOO_MANY_ATTEMPTS;

  await signIn("guest", {
    name: parsed.data,
    timezone: parsedTimezone.success ? parsedTimezone.data : undefined,
    redirectTo: input.callbackUrl,
  });
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

  // Per-IP rather than per-username: also blunts one IP brute-forcing
  // across many different usernames, not just repeated guesses at one.
  const ip = await getClientIp();
  const allowed = await rateLimit(`password-signin:${ip}`, 20, 600);
  if (!allowed) return TOO_MANY_ATTEMPTS;

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

export type UsernameCheck = { status: "available" | "taken" | "invalid"; reason?: string };

/**
 * Live availability check for the username field (an Instagram-style
 * "is this taken" as you type, not a submit-and-find-out) - just an
 * indexed lookup against the `username` unique constraint, no hashing or
 * writes, so it's fast enough to call on every keystroke's debounce.
 * Returns *why* it's unavailable (bad format vs. actually taken) rather
 * than a plain boolean - collapsing those into one generic "unavailable"
 * would show "That username is taken" for someone who just typed a
 * capital letter, which is simply the wrong answer, not a simplification.
 */
export async function checkUsernameAvailable(username: string): Promise<UsernameCheck> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return { status: "invalid", reason: parsed.error.issues[0].message };

  const ip = await getClientIp();
  const allowed = await rateLimit(`username-check:${ip}`, 60, 300);
  if (!allowed) return { status: "invalid", reason: "Too many checks. Try again in a moment." };

  const existing = await getUserByUsername(parsed.data);
  return existing ? { status: "taken" } : { status: "available" };
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
  const allowed = await rateLimit(`set-credentials:${userId}`, 5, 3600);
  if (!allowed) return TOO_MANY_ATTEMPTS;

  const passwordHash = await hashPassword(parsed.data.password);
  const updated = await setUserCredentials(userId, parsed.data.username, passwordHash);
  if (!updated) return { ok: false, error: "That username is taken." };

  return { ok: true };
}
