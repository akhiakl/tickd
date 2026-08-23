import { Suspense } from "react";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { GuestSignInForm } from "@/components/signin/guest-sign-in-form";

export const metadata = { title: "What should we call you?" };

/** `searchParams` is request-time-only under Cache Components - awaited here,
 * inside the Suspense boundary below, rather than in the page itself. */
async function GuestForm({
  searchParams,
}: {
  searchParams: PageProps<"/signin/guest">["searchParams"];
}) {
  const { callbackUrl } = await searchParams;
  return <GuestSignInForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"} />;
}

export default function GuestSignInPage({ searchParams }: PageProps<"/signin/guest">) {
  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-5.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">What should we call you?</span>
      </div>

      <Suspense>
        <GuestForm searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}
