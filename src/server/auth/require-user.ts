import "server-only";
import { auth } from "@/auth";

/** Resolves the signed-in user's internal id, or throws. Middleware already
 * redirects anonymous visitors away from protected routes; this is the
 * defense-in-depth check inside server actions themselves. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("You need to be signed in to do that.");
  return id;
}
