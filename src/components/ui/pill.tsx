import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

/** A segmented-control style button: filled panel when active, surface otherwise. */
export function Pill({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "cursor-pointer rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
        active ? "bg-panel text-bg" : "bg-surface text-muted hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
