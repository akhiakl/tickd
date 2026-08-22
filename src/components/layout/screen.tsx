import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared mobile-first shell: content is authored for a phone-width column
 * and stays centered on wider viewports rather than stretching full-width.
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
    <div className="bg-bg relative mx-auto min-h-dvh w-full max-w-md">
      <div className={cn(!bare && "px-6 pt-2 pb-10", className)}>{children}</div>
    </div>
  );
}
