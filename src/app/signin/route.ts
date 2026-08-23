import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { auth0Enabled } from "@/lib/flags";

/**
 * Pass-through redirect, not a screen. `signIn()` sets cookies via
 * `next/headers`, which Next.js only allows inside a Server Action or Route
 * Handler - not while rendering a Server Component (see
 * https://nextjs.org/docs/app/api-reference/functions/cookies#options) -
 * so this has to be a route handler rather than a page. It exists purely so
 * `src/proxy.ts` has somewhere to send unauthenticated users. With Auth0
 * enabled it forwards straight on to Auth0's hosted Universal Login;
 * otherwise it hands off to the in-app name-only guest join screen (which
 * *does* render, unlike this route - see src/app/signin/guest/page.tsx).
 *
 * The guest-path redirect below is deliberately a relative path built with
 * `next/navigation`'s `redirect()`, not `NextResponse.redirect(new
 * URL(path, req.nextUrl.origin))`. `req.nextUrl.origin` is reliable in
 * Middleware (see src/proxy.ts) but NOT inside a Route Handler under `next
 * dev` - it resolves to a `localhost` origin regardless of the actual Host
 * the request came in on (confirmed via curl against a real dev server),
 * which set the session cookie on a different host than the browser was
 * using and made sign-in look like it silently failed. A relative path
 * sidesteps the whole problem: the browser resolves it against whatever
 * origin it's already on.
 */
export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/";

  if (await auth0Enabled()) {
    await signIn("auth0", { redirectTo: callbackUrl });
    return;
  }

  redirect(`/signin/guest?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
