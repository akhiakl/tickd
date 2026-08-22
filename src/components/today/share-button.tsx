"use client";

import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";

export function ShareButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const { message, showToast } = useToast();
  const imageUrl = `/api/share/${groupId}`;

  async function handleShare() {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "tickd-share.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Tickd streak" });
        setOpen(false);
        return;
      }
    } catch {
      // Fall through to the manual-save hint below.
    }
    showToast("Long-press the card to save or share it");
  }

  function handleSave() {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "tickd-share.png";
    link.click();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-accent font-heading text-on-panel absolute right-4.5 bottom-24 z-10 flex cursor-pointer items-center gap-2 rounded-full py-3.5 pr-5 pl-4.5 text-[15px] shadow-lg"
      >
        <ArrowUpFromLine size={19} strokeWidth={2.4} />
        Share today
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share this"
        subtitle="preview before you post it"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered PNG, not an optimizable asset */}
        <img src={imageUrl} alt="Your daily streak card" className="w-full rounded-3xl shadow-lg" />
        <div className="mt-4 flex gap-2">
          <Button onClick={handleShare} className="flex-1">
            Share
          </Button>
          <Button onClick={handleSave} variant="outline" className="flex-1">
            Save image
          </Button>
        </div>
      </Sheet>

      <Toast message={message} />
    </>
  );
}
