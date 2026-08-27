"use client";

import { useState, useTransition } from "react";
import { regenerateInvite } from "@/server/actions/groups";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { getBaseUrl } from "@/lib/base-url";

// Same source and fallback as src/app/layout.tsx's metadataBase - a
// hardcoded "tickd.app" here would copy a link pointing at production
// even when running locally or on a preview deployment.
const APP_HOST = new URL(getBaseUrl()).host;

export function InviteCodePanel({
  groupId,
  initialCode,
}: {
  groupId: string;
  initialCode: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [pending, startTransition] = useTransition();
  const { message, showToast } = useToast();

  function copy() {
    navigator.clipboard
      .writeText(`${APP_HOST}/join?code=${code}`)
      .then(() => showToast("Invite link copied"))
      .catch(() => showToast("Couldn't copy - try selecting the code instead"));
  }

  function regenerate() {
    startTransition(async () => {
      const result = await regenerateInvite(groupId);
      if (result.ok && result.code) {
        setCode(result.code);
        showToast(`New code: ${result.code}`);
      }
    });
  }

  return (
    <div className="bg-panel text-on-panel mx-4 rounded-[28px] px-5 py-4.5">
      <div className="text-panel-soft text-[10.5px] tracking-[0.12em]">INVITE CODE</div>
      <div className="font-heading my-1.5 text-[30px] tracking-[0.16em]">{code}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="bg-accent text-on-panel hover:bg-flame flex-1 cursor-pointer rounded-full py-2.5 text-[13.5px] font-bold"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="border-on-panel/30 text-on-panel hover:bg-on-panel/10 flex-1 cursor-pointer rounded-full border-[1.5px] py-2.5 text-[13.5px] font-bold"
        >
          Regenerate
        </button>
      </div>
      <Toast message={message} />
    </div>
  );
}
