"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestEmailCode } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function EmailSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestEmailCode(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const params = new URLSearchParams({ email, callbackUrl });
      router.push(`/login/code?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-0">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="border-text/[0.16] bg-surface text-text w-full rounded-full border-[1.5px] px-4.5 py-[15px] text-[16px] font-semibold"
      />
      {error && <p className="text-flame mt-2 text-[12.5px]">{error}</p>}
      <Button type="submit" disabled={pending} className="mt-2.5">
        {pending ? "Sending..." : "Send me a code"}
      </Button>
      <p className="text-faint mt-4 text-[12px] leading-relaxed">
        No passwords, ever. We email a six-digit code.
      </p>
    </form>
  );
}
