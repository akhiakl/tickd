import { NextResponse } from "next/server";
import { auth } from "@/auth-edge";
import { isLinkPreviewBot } from "@/lib/link-preview-bots";

const PROTECTED_PREFIXES = ["/g", "/account", "/create", "/join"];

// /join is also the one protected route people paste into a chat to invite
// someone - exempting it (and only it) from the auth redirect for a
// recognized link-preview crawler is what lets that link show "Join
// <Group>" instead of whatever the sign-in redirect would otherwise leave
// the crawler looking at. The page itself is unchanged: a real visitor
// still can't join without signing in, and /join's own generateMetadata is
// the thing actually deciding what a crawler sees. Scoped as tightly as
// the exemption can be: the exact path only (there's no /join/* route to
// widen into), and GET/HEAD only (a crawler only ever reads HTML - no
// reason to also let a spoofed UA through on a state-changing method).
const PUBLIC_PREVIEW_PATH = "/join";
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isPublicPreview =
    pathname === PUBLIC_PREVIEW_PATH &&
    SAFE_METHODS.has(req.method) &&
    isLinkPreviewBot(req.headers.get("user-agent"));

  if (needsAuth && !req.auth && !isPublicPreview) {
    // Skip any in-app login screen entirely: `/signin` is a pass-through
    // Server Component (see src/app/signin/page.tsx) that calls `signIn()`
    // directly and redirects straight on to Auth0's hosted Universal Login.
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
