"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { CheckSquare, Grid3x3, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Desktop's replacement for BottomNav (see that component's own comment) -
 * an in-flow pill tab row rather than a fixed bar, since a real desktop
 * viewport has no need to pin navigation to the bottom edge. Same three
 * destinations, same active-tab logic; hidden below `lg` where BottomNav
 * takes over instead. See design/project/desktop-redesign/TodayDesktop.dc.html.
 */
export function DesktopTabs({ groupId }: { groupId: string }) {
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
    <div className="mb-8 hidden gap-2.5 lg:flex">
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href as Route}
          className={cn(
            "font-heading flex items-center gap-2 rounded-full px-5.5 py-2.5 text-[14.5px]",
            active ? "bg-accent text-on-panel" : "bg-surface text-text hover:bg-surface-2",
          )}
        >
          <Icon size={16} strokeWidth={2.4} />
          {label}
        </Link>
      ))}
    </div>
  );
}
