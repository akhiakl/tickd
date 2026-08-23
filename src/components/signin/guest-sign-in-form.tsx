"use client";

import { useState, useTransition } from "react";
import { signInAsGuest } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function GuestSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInAsGuest({ name, callbackUrl });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <label className="text-faint mb-2 block text-[11px] tracking-[0.1em] uppercase">
        Your name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={40}
        autoFocus
        aria-label="Your name"
        placeholder="Ada"
        className="border-text/[0.16] bg-surface font-heading text-text w-full rounded-[22px] border-[1.5px] px-4.5 py-4 text-[20px]"
      />

      {error && <p className="text-flame mt-3 text-[12.5px]">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-5.5">
        {pending ? "One sec..." : "Continue"}
      </Button>
      <p className="text-faint mt-3.5 text-center text-[12px]">
        No password, no email - just a name your group will see.
      </p>
    </form>
  );
}
