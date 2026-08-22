"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** A bottom sheet modal: backdrop tap or the X closes it. */
export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  if (!open) return null;
  return (
    <div className="bg-panel-deep/60 absolute inset-0 z-20 flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="flex-1 cursor-pointer border-0 bg-transparent p-0"
      />
      <div className="animate-rise bg-bg rounded-t-[34px] px-4 pt-5 pb-7">
        <div className="mb-3.5 flex items-center justify-between px-1.5">
          <div>
            <div className="font-heading text-[19px]">{title}</div>
            {subtitle && <div className="text-muted text-[12.5px]">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-surface hover:bg-surface-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
          >
            <X size={15} strokeWidth={2.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
