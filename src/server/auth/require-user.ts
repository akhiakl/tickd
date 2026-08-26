import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById } from "@/server/queries/users";

/**
 * `auth()` decrypts/verifies the session JWE on every call - real CPU work
 * (~5-10ms measured against a local build), not just a cheap object read -
 * and unlike `getUserById` below it wasn't deduped anywhere upstream. Every
 * group screen calls `requireValidUserId` twice per navigation (once from
 * `GroupLayout`, once from the tab page itself), so without this it paid
 * for that decrypt twice. React `cache()` dedupes by argument identity, so
 * this only helps because it's called with no arguments - `currentPath`
 * varies per call site and stays out of the memoized part.
 */
const getSession = cache(() => auth());

/** Resolves the signed-in user's internal id, or throws. Middleware already
 * redirects anonymous visitors away from protected routes; this is the
 * defense-in-depth check inside server actions themselves. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) throw new Error("You need to be signed in to do that.");
  return id;
}

/**
 * The page-level equivalent of `requireUserId` above, for the ~8 pages
 * that read `session!.user!.id` directly (group layout/settings/member
 * profile, account, join, ...). Handles a case middleware (`src/proxy.ts`)
 * can't: it decides "protected route, no session" without ever touching
 * the database (`src/auth-edge.ts`'s whole reason for existing), so a JWT
 * that's cryptographically valid but references a user row that's since
 * been deleted - a stale cookie from a wiped/reseeded dev database, or an
 * account that was actually removed - sails right through it. Every page
 * used to hit that as `getUserById`/`getGroupSnapshot` quietly returning
 * nothing (`if (!user) return null`), rendering a blank screen with no
 * explanation instead of the same "you need to sign in" experience an
 * anonymous visitor gets.
 *
 * `currentPath` becomes the `callbackUrl` on both redirect targets, so
 * either one lands the visitor back on the exact page they were trying to
 * reach once they're properly signed in again - `redirect(request.url)`
 * isn't an option here (this runs during render, not in a request
 * handler), so the caller passes its own route (e.g. `` `/g/${groupId}` ``).
 */
export async function requireValidUserId(currentPath: string): Promise<string> {
  const session = await getSession();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  const user = await getUserById(sessionUserId);
  if (!user) {
    // Route Handler, not straight to /signin: the stale cookie itself has
    // to actually be cleared (next/headers' cookies() is only mutable in
    // a Server Action or Route Handler, never during a Server Component's
    // render - see src/app/signin/route.ts's own comment on the same
    // constraint) - otherwise middleware would keep seeing a "valid"
    // session and this exact page would just redirect here again.
    redirect(`/api/auth/clear-session?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return sessionUserId;
}
