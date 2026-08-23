import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared mobile-first shell: content is authored for a phone-width column
 * and stays centered rather than stretching full-width, but the column
 * itself widens in steps on larger viewports instead of staying pinned to
 * phone width - so desktop gets more breathing room without a layout
 * redesign (no sidebar nav, no multi-column reflow).
 */
export function Screen({
  children,
  className,
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <div className="bg-bg relative mx-auto min-h-dvh w-full max-w-md md:max-w-xl lg:max-w-2xl">
      <div className={cn(!bare && "px-6 pt-2 pb-10", className)}>{children}</div>
    </div>
  );
}
