import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { Logo } from "@/components/ui/logo";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const redirectTo = typeof callbackUrl === "string" ? callbackUrl : "/";

  return (
    <Screen className="flex min-h-dvh flex-col pt-2 pb-10">
      <div className="mt-1.5 mb-7">
        <BackButton href="/" />
      </div>

      <Logo size={44} />
      <h1 className="font-heading mt-5 mb-2 text-[33px] leading-[1.05]">Sign in to Tickd</h1>
      <p className="text-muted mb-6.5 text-[15px]">So your streak follows you to a new phone.</p>

      <ProviderButtons callbackUrl={redirectTo} />

      <div className="my-6 flex items-center gap-2.5">
        <div className="bg-text/[0.14] h-px flex-1" />
        <span className="text-faint text-[11px] tracking-[0.12em] uppercase">or email</span>
        <div className="bg-text/[0.14] h-px flex-1" />
      </div>

      <EmailSignInForm callbackUrl={redirectTo} />
    </Screen>
  );
}
