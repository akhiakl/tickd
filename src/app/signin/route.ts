import type { NextRequest } from "next/server";
import { signIn } from "@/auth";

/**
 * Pass-through redirect, not a screen. `signIn()` sets cookies via
 * `next/headers`, which Next.js only allows inside a Server Action or Route
 * Handler - not while rendering a Server Component (see
 * https://nextjs.org/docs/app/api-reference/functions/cookies#options) -
 * so this has to be a route handler rather than a page. It exists purely so
 * `src/proxy.ts` has somewhere to send unauthenticated users that forwards
 * them straight on to Auth0's hosted Universal Login; nothing here renders.
 */
export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/";
  await signIn("auth0", { redirectTo: callbackUrl });
}
