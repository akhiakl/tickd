import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared mobile-first shell: content is authored for a phone-width column
 * and stays centered rather than stretching full-width. The column itself
 * widens in steps on larger viewports - by default just a wider single
 * column (no sidebar nav, no multi-column reflow), but a screen with its
 * own desktop composition (see design/project/desktop-redesign) can pass
 * `maxWidthClassName` to take a different, usually wider, `lg:` ceiling
 * instead - the per-screen desktop grid inside `children` is what actually
 * does the multi-column reflow, this just stops the column itself from
 * capping how wide that grid is allowed to get.
 */
export function Screen({
  children,
  className,
  bare = false,
  maxWidthClassName = "max-w-md md:max-w-xl lg:max-w-2xl",
}: {
  children: ReactNode;
  className?: string;
  bare?: boolean;
  maxWidthClassName?: string;
}) {
  return (
    <div className={cn("bg-bg relative mx-auto min-h-dvh w-full", maxWidthClassName)}>
      <div className={cn(!bare && "px-6 pt-2 pb-10", className)}>{children}</div>
    </div>
  );
}
