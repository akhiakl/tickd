import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { auth0Enabled } from "@/lib/flags";
import { upsertUserFromIdentity, createGuestUser, getUserByUsername } from "@/server/queries/users";
import { verifyPassword } from "@/server/auth/password";
import {
  guestNameSchema,
  credentialsSignInSchema,
  timezoneSchema,
} from "@/server/validation/schemas";

// The full Auth.js instance: real providers, DB-backed callbacks. Used by
// the /api/auth/[...nextauth] route, Server Actions, and Server
// Components - never by middleware (see src/auth-edge.ts for that).
//
// This is a config *function*, not a plain object, specifically so the
// flag read and the provider choice can be async and per-request: Auth.js
// resolves it once per request rather than once at module load, which is
// what makes the dynamic `import()`s below actually code-split (only the
// active provider's module is ever fetched/bundled at runtime) instead of
// both providers loading unconditionally the way two static imports would.
export const { handlers, auth, signIn, signOut } = NextAuth(async (request) => {
  // The Flags SDK's App Router call signature (`myFlag()`, reading via
  // `next/headers`) doesn't accept `undefined` as an explicit argument -
  // fall back to it when Auth.js hands us no request (e.g. some internal
  // resolution paths), and use the request-aware form when it does.
  const useAuth0 = request ? await auth0Enabled(request) : await auth0Enabled();
  const providers = useAuth0
    ? [
        (await import("next-auth/providers/auth0")).default({
          clientId: process.env.AUTH0_CLIENT_ID,
          clientSecret: process.env.AUTH0_CLIENT_SECRET,
          issuer: process.env.AUTH0_ISSUER,
        }),
      ]
    : [
        (await import("next-auth/providers/credentials")).default({
          id: "guest",
          name: "Guest",
          credentials: {
            name: { label: "Name", type: "text" },
            // Optional: the browser-detected IANA zone (see
            // guest-sign-in-form.tsx), set at creation so there's no gap
            // where a brand-new account has no timezone until
            // TimezoneSync's next-page-load round trip catches up. Left
            // out entirely (undefined, not a bad-value error) when
            // detection failed client-side or on an older client - the
            // account still creates fine, just null here as before.
            timezone: { label: "Timezone", type: "text" },
          },
          async authorize(credentials) {
            const parsed = guestNameSchema.safeParse(credentials?.name);
            if (!parsed.success) return null;
            const parsedTimezone = timezoneSchema.safeParse(credentials?.timezone);
            const dbUser = await createGuestUser({
              name: parsed.data,
              timezone: parsedTimezone.success ? parsedTimezone.data : undefined,
            });
            return { id: dbUser.id, name: dbUser.name };
          },
        }),
        // Optional upgrade on top of a guest row (see `setCredentials` in
        // src/server/actions/auth.ts) - lets someone who's already set a
        // username/password log back into that same row from another
        // device. Not a replacement for the guest flow above, which stays
        // the frictionless default.
        (await import("next-auth/providers/credentials")).default({
          id: "password",
          name: "Username and password",
          credentials: {
            username: { label: "Username", type: "text" },
            password: { label: "Password", type: "password" },
          },
          async authorize(credentials) {
            const parsed = credentialsSignInSchema.safeParse(credentials);
            if (!parsed.success) return null;

            const dbUser = await getUserByUsername(parsed.data.username);
            if (!dbUser?.passwordHash) return null;

            const valid = await verifyPassword(parsed.data.password, dbUser.passwordHash);
            if (!valid) return null;

            return { id: dbUser.id, name: dbUser.name };
          },
        }),
      ];

  return {
    ...authConfig,
    // No `pages.signIn` override: we want Auth.js's own `/api/auth/signin/*`
    // route to redirect straight to Auth0's hosted Universal Login rather
    // than rendering any in-app screen first.
    providers,
    callbacks: {
      async jwt({ token, account, profile, user }) {
        // Sync the Auth0 profile into our own users table on first sign-in
        // and stash our internal id on the token.
        if (account?.provider === "auth0" && profile?.sub) {
          const identity = {
            authSub: String(profile.sub),
            email: String(profile.email ?? ""),
            name: String(profile.name ?? profile.email ?? "there"),
          };
          const dbUser = await upsertUserFromIdentity(identity);
          token.appUserId = dbUser.id;
        } else if (
          (account?.provider === "guest" || account?.provider === "password") &&
          user?.id
        ) {
          // authorize() already resolved (or created) the row and returned
          // its id, for either provider.
          token.appUserId = user.id;
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user && typeof token.appUserId === "string") {
          session.user.id = token.appUserId;
        }
        return session;
      },
    },
  };
});
