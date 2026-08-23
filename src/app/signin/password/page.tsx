import { Suspense } from "react";
import Link from "next/link";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { PasswordSignInForm } from "@/components/signin/password-sign-in-form";

export const metadata = { title: "Log in" };

/** `searchParams` is request-time-only under Cache Components - awaited here,
 * inside the Suspense boundary below, rather than in the page itself. */
async function PasswordForm({
  searchParams,
}: {
  searchParams: PageProps<"/signin/password">["searchParams"];
}) {
  const { callbackUrl } = await searchParams;
  const callback = typeof callbackUrl === "string" ? callbackUrl : "/";

  return (
    <>
      <PasswordSignInForm callbackUrl={callback} />
      <p className="text-faint mt-3.5 text-center text-[12px]">
        No account yet?{" "}
        <Link
          href={`/signin/guest?callbackUrl=${encodeURIComponent(callback)}`}
          className="underline"
        >
          Continue as a guest
        </Link>{" "}
        instead.
      </p>
    </>
  );
}

export default function PasswordSignInPage({ searchParams }: PageProps<"/signin/password">) {
  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-5.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">Log in</span>
      </div>

      <Suspense>
        <PasswordForm searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}
