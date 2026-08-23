import type { Route } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        // Clearing our own session cookie isn't enough: Auth0 still holds
        // its own hosted-login session, so a plain signOut() would let the
        // user land back on Auth0's Universal Login and get silently
        // re-authenticated without ever seeing it. Log out of Auth0 too,
        // then bounce back to the app.
        await signOut({ redirect: false });
        const logoutUrl = new URL("/v2/logout", process.env.AUTH0_ISSUER);
        logoutUrl.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID!);
        logoutUrl.searchParams.set("returnTo", process.env.NEXT_PUBLIC_APP_URL!);
        redirect(logoutUrl.toString() as Route);
      }}
    >
      <button
        type="submit"
        className="border-text/20 font-heading text-text hover:bg-text/[0.06] w-full cursor-pointer rounded-full border-[1.5px] bg-transparent py-3.5 text-[15px] transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
