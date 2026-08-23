"use client";

import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type CardStyle = "classic" | "bold";

const CARD_STYLES: { id: CardStyle; label: string; aspectRatio: string }[] = [
  { id: "classic", label: "Classic", aspectRatio: "600 / 750" },
  { id: "bold", label: "Bold", aspectRatio: "600 / 880" },
];

export function ShareButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [cardStyle, setCardStyle] = useState<CardStyle>("classic");
  const [loaded, setLoaded] = useState(false);
  const { message, showToast } = useToast();

  const activeStyle = CARD_STYLES.find((style) => style.id === cardStyle)!;
  const imageUrl = `/api/share/${groupId}?style=${cardStyle}`;

  // The Sheet unmounts its children on close, so the <img> below is a fresh
  // element every time it opens and needs to load again - the skeleton is
  // reset explicitly wherever `open` or `cardStyle` changes below, rather
  // than in an effect, so there's no extra render between the state change
  // and the skeleton reappearing.
  function openSheet() {
    setLoaded(false);
    setOpen(true);
  }

  function selectStyle(style: CardStyle) {
    if (style === cardStyle) return;
    setLoaded(false);
    setCardStyle(style);
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
        <div
          className="bg-surface relative w-full overflow-hidden rounded-3xl shadow-lg"
          style={{ aspectRatio: activeStyle.aspectRatio }}
        >
          {!loaded && <div className="bg-surface-2 absolute inset-0 animate-pulse" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered PNG, not an optimizable asset */}
          <img
            key={imageUrl}
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

        <div className="mt-3 flex justify-center gap-1.5">
          {CARD_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => selectStyle(style.id)}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                cardStyle === style.id
                  ? "bg-accent text-on-panel"
                  : "bg-surface text-muted hover:bg-surface-2",
              )}
            >
              {style.label}
            </button>
          ))}
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
