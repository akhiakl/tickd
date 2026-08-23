"use server";

import { signIn } from "@/auth";
import { guestNameSchema } from "@/server/validation/schemas";
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
