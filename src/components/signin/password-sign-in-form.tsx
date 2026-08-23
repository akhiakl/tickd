"use client";

import { useState, useTransition } from "react";
import { signInWithPassword } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function PasswordSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInWithPassword({ username, password, callbackUrl });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <label className="text-faint mb-2 block text-[11px] tracking-[0.1em] uppercase">
        Username
      </label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        maxLength={24}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        aria-label="Username"
        placeholder="ada"
        className="border-text/[0.16] bg-surface font-heading text-text w-full rounded-[22px] border-[1.5px] px-4.5 py-4 text-[20px]"
      />

      <label className="text-faint mt-4 mb-2 block text-[11px] tracking-[0.1em] uppercase">
        Password
      </label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        maxLength={72}
        aria-label="Password"
        className="border-text/[0.16] bg-surface font-heading text-text w-full rounded-[22px] border-[1.5px] px-4.5 py-4 text-[20px]"
      />

      {error && <p className="text-flame mt-3 text-[12.5px]">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-5.5">
        {pending ? "One sec..." : "Log in"}
      </Button>
    </form>
  );
}
