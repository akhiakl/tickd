import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { GuestSignInForm } from "@/components/signin/guest-sign-in-form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "What should we call you?" };

export default async function GuestSignInPage({ searchParams }: PageProps<"/signin/guest">) {
  const { callbackUrl } = await searchParams;

  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-5.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">What should we call you?</span>
      </div>

      <GuestSignInForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"} />
    </Screen>
  );
}
