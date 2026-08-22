"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { CheckSquare, Grid3x3, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ groupId }: { groupId: string }) {
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
    <div className="border-text/10 bg-bg flex flex-none gap-1 border-t px-2.5 pt-1.5 pb-5">
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href as Route}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-[18px] py-2 text-[11px] font-bold",
            active ? "bg-accent text-on-panel" : "text-muted bg-transparent",
          )}
        >
          <Icon size={21} strokeWidth={2.4} />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}
