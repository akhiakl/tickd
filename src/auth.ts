import NextAuth from "next-auth";
import Auth0 from "next-auth/providers/auth0";
import Credentials from "next-auth/providers/credentials";
import { verifyEmailOtp } from "@/server/auth/auth0-otp";
import { upsertUserFromIdentity } from "@/server/queries/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions: the app's own `users` table (synced in the callbacks
  // below) is the source of truth for profile data, so no database adapter
  // is needed for the session itself. This keeps session reads a pure
  // cookie decode - no database round trip on every request.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Auth0({
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      issuer: process.env.AUTH0_ISSUER,
    }),
    Credentials({
      id: "email-otp",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const code = String(credentials?.code ?? "");
        if (!email || code.length !== 6) return null;

        const identity = await verifyEmailOtp(email, code);
        const user = await upsertUserFromIdentity(identity);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Credentials provider: `authorize()` already resolved our internal
      // user id above, so `user.id` is already the app id.
      if (user && account?.provider === "email-otp") {
        token.appUserId = user.id;
      }

      // Auth0 OAuth (Google/Apple): sync the profile into our own users
      // table on first sign-in and stash our internal id on the token.
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
