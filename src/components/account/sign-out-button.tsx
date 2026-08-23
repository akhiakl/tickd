import type { Route } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signOut } from "@/auth";
import { auth0Enabled } from "@/lib/flags";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirect: false });

        if (!(await auth0Enabled())) {
          // Guests have no external session to end - clearing our own
          // cookie above is the whole story.
          redirect("/");
        }

        // Clearing our own session cookie isn't enough: Auth0 still holds
        // its own hosted-login session, so stopping here would let the
        // user land back on Auth0's Universal Login and get silently
        // re-authenticated without ever seeing it. Log out of Auth0 too,
        // then bounce back to the app.
        //
        // `returnTo` has to be an absolute URL (Auth0 redirects back
        // cross-origin), built from the actual request's headers rather
        // than a static env var - a hardcoded origin here is exactly what
        // broke sign-in earlier (it drifted out of sync with how the dev
        // server was actually being run). Same trust level Auth.js's own
        // default host-header-based origin detection already uses.
        const hdrs = await headers();
        const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
        const proto = hdrs.get("x-forwarded-proto") ?? "https";
        const logoutUrl = new URL("/v2/logout", process.env.AUTH0_ISSUER);
        logoutUrl.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID!);
        logoutUrl.searchParams.set("returnTo", `${proto}://${host}`);
        redirect(logoutUrl.toString() as Route);
      }}
    >
      <button
        type="submit"
        className="border-text/20 font-heading text-text hover:bg-text/6 w-full cursor-pointer rounded-full border-[1.5px] bg-transparent py-3.5 text-[15px] transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
