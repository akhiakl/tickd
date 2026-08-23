import type { NextAuthConfig } from "next-auth";

/**
 * The part of the Auth.js config shared between the full instance
 * (src/auth.ts - providers, DB-backed callbacks, used by the API route,
 * Server Actions, Server Components) and the middleware-only instance
 * (src/auth-edge.ts). Deliberately just this: no providers, no database
 * import. Verifying an *existing* session cookie only needs `secret`
 * (picked up automatically from `AUTH_SECRET`) and the session strategy -
 * providers are only consulted during an actual sign-in, which middleware
 * never performs. Keeping this file minimal is what lets
 * `src/auth-edge.ts` avoid pulling Auth0/Credentials or `@/server/db` into
 * middleware's bundle at all.
 */
export const authConfig = {
  session: { strategy: "jwt" },
} satisfies Omit<NextAuthConfig, "providers">;
