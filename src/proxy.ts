import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/g", "/account", "/create", "/join"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (needsAuth && !req.auth) {
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
