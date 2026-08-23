import NextAuth from "next-auth";
import Auth0 from "next-auth/providers/auth0";
import { upsertUserFromIdentity } from "@/server/queries/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions: the app's own `users` table (synced in the callbacks
  // below) is the source of truth for profile data, so no database adapter
  // is needed for the session itself. This keeps session reads a pure
  // cookie decode - no database round trip on every request.
  session: { strategy: "jwt" },
  // No `pages.signIn` override: we want Auth.js's own `/api/auth/signin/*`
  // route to redirect straight to Auth0's hosted Universal Login rather
  // than rendering any in-app screen first.
  providers: [
    Auth0({
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      issuer: process.env.AUTH0_ISSUER,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
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
});
