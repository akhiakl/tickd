"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { CheckSquare, Grid3x3, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The three group tabs (Today/Wall/Ranks), one component reflowing across
 * the whole width range instead of two separate mobile/desktop
 * components each toggled with `hidden`: narrow, it's a row of icon+label
 * pills fixed to the viewport bottom (`fixed` takes it out of flow
 * regardless of where in the DOM it's rendered, so it stays pinned
 * without any scroll-containment wrapper); at `lg` and up it becomes an
 * ordinary in-flow row of pill buttons above the page content, matching
 * design/project/desktop-redesign - which is itself one responsive
 * document (its "Mobile" and "Desktop" artboards are byte-identical
 * HTML, reflowed by its own `@media` rules), not two designs.
 */
export function GroupNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/g/${groupId}`;
  const tabs = [
    { href: base, label: "Today", icon: CheckSquare, active: pathname === base },
    { href: `${base}/wall`, label: "Wall", icon: Grid3x3, active: pathname === `${base}/wall` },
    {
      href: `${base}/ranks`,
      label: "Ranks",
      icon: BarChart3,
      active: pathname === `${base}/ranks`,
    },
  ];

  return (
    // Below lg this is `fixed`, which positions against the viewport, not
    // Screen's own centered column - without this wrapper matching
    // Screen's own max-w-md/md:max-w-xl tiers, the bar would span the
    // full viewport width and visibly stop lining up with the (narrower,
    // centered) content above it on anything wider than a phone (a
    // tablet-width viewport, most obviously). At lg the wrapper goes back
    // to being an ordinary, unconstrained in-flow box.
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md md:max-w-xl lg:static lg:z-auto lg:mx-0 lg:max-w-none">
      <div
        className={cn(
          "border-text/10 bg-bg flex gap-1 border-t px-2.5 pt-1.5 pb-5",
          "lg:mb-8 lg:gap-2.5 lg:border-none lg:bg-transparent lg:p-0",
        )}
      >
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href as Route}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[18px] py-2 text-[11px] font-bold",
              "lg:font-heading lg:flex-none lg:flex-row lg:gap-2 lg:rounded-full lg:px-5.5 lg:py-2.5 lg:text-[14.5px] lg:font-normal",
              active
                ? "bg-accent text-on-panel"
                : "text-muted lg:bg-surface lg:text-text bg-transparent",
            )}
          >
            <Icon size={21} strokeWidth={2.4} className="lg:size-4" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
