import { redirect } from "next/navigation";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { CodeEntryForm } from "@/components/auth/code-entry-form";

export default async function LoginCodePage({ searchParams }: PageProps<"/login/code">) {
  const { email, callbackUrl } = await searchParams;
  if (typeof email !== "string") redirect("/login");
  const redirectTo = typeof callbackUrl === "string" ? callbackUrl : "/";

  return (
    <Screen className="min-h-dvh pt-2 pb-10">
      <div className="mt-1.5 mb-10">
        <BackButton href="/login" />
      </div>

      <h1 className="font-heading mb-2 text-[31px] leading-[1.08]">Check your email</h1>
      <p className="text-muted mb-7.5 text-[15px]">Six digits sent to {email}</p>

      <CodeEntryForm email={email} callbackUrl={redirectTo} />
    </Screen>
  );
}
