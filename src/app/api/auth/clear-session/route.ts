import type { NextRequest } from "next/server";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";

/**
 * Clears a session whose JWT is cryptographically valid but whose
 * referenced user no longer exists in the database - see
 * `requireValidUserId` in src/server/auth/require-user.ts for where that's
 * detected and redirected here. A Route Handler, not a plain redirect from
 * the page itself: clearing the cookie needs `next/headers`' `cookies()`
 * to be mutable, which Next.js only allows inside a Server Action or Route
 * Handler, never while a Server Component is rendering.
 *
 * Landing back on `callbackUrl` (the page the visitor was actually trying
 * to reach) rather than a fixed destination is what makes this a clean
 * "sign back in and continue" instead of a dead end: with the stale cookie
 * now gone, that same request re-enters `src/proxy.ts`'s normal
 * protected-route check, which - correctly, this time - sends them on to
 * `/signin?callbackUrl=...` itself. No Auth0-hosted-logout step here (contrast
 * `SignOutButton`, which does end that too): an Auth0 identity re-signing in
 * through the hosted session that's still valid just re-runs `upsertUserFromIdentity`
 * and quietly recreates the row - the self-healing outcome this path wants,
 * not a second logout screen for a session the visitor never asked to end.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("callbackUrl") ?? "/";
  // Same-origin relative path only - never follow an attacker-supplied
  // absolute/external callbackUrl (an open-redirect otherwise).
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  await signOut({ redirect: false });

  // A relative redirect via next/navigation, not
  // `NextResponse.redirect(new URL(...))` - see src/app/signin/route.ts's
  // own comment: the request's own origin isn't reliable to rebuild a URL
  // from inside a Route Handler under `next dev`. The browser resolves a
  // relative path against whatever origin it's already on instead. Cast
  // needed because typedRoutes can't verify an arbitrary runtime string
  // against the route table - same pattern as sign-out-button.tsx's own
  // dynamically-built redirect target.
  redirect(callbackUrl as Route);
}
