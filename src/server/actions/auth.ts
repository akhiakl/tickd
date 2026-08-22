"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { startEmailOtp } from "@/server/auth/auth0-otp";
import { emailSchema, otpCodeSchema } from "@/server/validation/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Step 1 of email sign-in: ask Auth0 to email a six-digit code. */
export async function requestEmailCode(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  try {
    await startEmailOtp(parsed.data);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't send a code right now. Try again shortly." };
  }
}

/** Step 2: verify the code and, on success, establish the session. */
export async function verifyEmailCode(email: string, code: string): Promise<ActionResult> {
  const parsedCode = otpCodeSchema.safeParse(code);
  if (!parsedCode.success) return { ok: false, error: parsedCode.error.issues[0].message };

  try {
    await signIn("email-otp", { email, code, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "That code didn't match. Check it and try again." };
    }
    throw error;
  }
}
