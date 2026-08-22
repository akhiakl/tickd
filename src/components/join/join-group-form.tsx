"use client";

import { useState, useTransition } from "react";
import { joinGroup } from "@/server/actions/groups";
import { Button } from "@/components/ui/button";

export function JoinGroupForm({ initialCode }: { initialCode: string }) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinGroup({ inviteCode });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <label className="text-faint mb-2 block text-[11px] tracking-[0.1em] uppercase">
        Invite code
      </label>
      <input
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
        required
        aria-label="Invite code"
        className="border-text/[0.16] bg-surface font-heading text-text w-full rounded-[22px] border-[1.5px] px-2.5 py-4 text-center text-[26px] tracking-[0.18em]"
      />

      {error && <p className="text-flame mt-3 text-[12.5px]">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-5.5">
        {pending ? "Joining..." : "Join the group"}
      </Button>
      <p className="text-faint mt-3.5 text-center text-[12px]">
        Your account carries over - no extra sign-up.
      </p>
    </form>
  );
}
