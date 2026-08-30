"use client";

import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * A full-width button that sits inline inside TodayStatsPanel, at every
 * width - not a separate mobile "floating pill" plus a desktop "inline"
 * variant. It used to float fixed over the checklist and visually
 * collide with the last row; see
 * design/project/desktop-redesign/TodayDesktop.dc.html (one responsive
 * document, not a mobile/desktop pair) and that folder's NOTES.md.
 */
export function ShareButton({ groupId, className }: { groupId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { message, showToast } = useToast();

  const imageUrl = `/api/share/${groupId}`;

  // The Sheet unmounts its children on close, so the <img> below is a fresh
  // element every time it opens and needs to load again - reset the
  // skeleton here, rather than in an effect, so there's no extra render
  // between the state change and the skeleton reappearing.
  function openSheet() {
    setLoaded(false);
    setOpen(true);
  }

  async function handleShare() {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to load share image: ${res.status}`);
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
        onClick={openSheet}
        className={cn(
          "bg-accent font-heading text-on-panel flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 text-[15px]",
          className,
        )}
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
        <div
          className="bg-surface relative w-full overflow-hidden rounded-3xl shadow-lg"
          style={{ aspectRatio: "600 / 750" }}
        >
          {!loaded && <div className="skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered PNG, not an optimizable asset */}
          <img
            src={imageUrl}
            alt="Your daily streak card"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </div>

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
