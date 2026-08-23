"use client";

import { useState, useTransition } from "react";
import { setCredentials } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";

/**
 * Optional upgrade for a guest account: setting a username/password lets
 * them log back in from another device (via /signin/password) without
 * losing this row's id/history, the way signing in as a fresh guest
 * elsewhere would. Auth0 accounts never see this (they already have a
 * real identity) - gated by the account page only rendering it when
 * `username` is null and there's no `authSub`.
 */
export function SaveAccountForm() {
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { message, showToast } = useToast();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setCredentials({ username, password });
      if (!result.ok) return setError(result.error);
      setSaved(true);
      showToast("Account saved");
    });
  }

  if (saved) {
    return (
      <div className="bg-surface mx-4 rounded-[22px] px-4.5 py-4">
        <div className="text-[15px] font-bold">Account saved</div>
        <div className="text-muted mt-0.5 text-[12.5px]">
          Log in as @{username} from any device to get back to this account.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-surface mx-4 rounded-[22px] px-4.5 py-4">
      <div className="text-[15px] font-bold">Save your account</div>
      <div className="text-muted mt-0.5 mb-3.5 text-[12.5px]">
        Set a username and password so you can log back in from another device without losing this
        one.
      </div>

      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        maxLength={24}
        autoCapitalize="none"
        autoCorrect="off"
        aria-label="Username"
        placeholder="Username"
        className="border-text/[0.16] bg-bg text-text mb-2 w-full rounded-2xl border-[1.5px] px-4 py-3 text-[15px]"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        maxLength={72}
        aria-label="Password"
        placeholder="Password"
        className="border-text/[0.16] bg-bg text-text w-full rounded-2xl border-[1.5px] px-4 py-3 text-[15px]"
      />

      {error && <p className="text-flame mt-2.5 text-[12.5px]">{error}</p>}

      <Button type="submit" disabled={pending} size="sm" className="mt-3.5">
        {pending ? "Saving..." : "Save account"}
      </Button>

      <Toast message={message} />
    </form>
  );
}
