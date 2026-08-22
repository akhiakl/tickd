"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MyGroupCard } from "@/server/queries/my-groups";

export function GroupSwitcher({
  groups,
  currentGroupId,
  groupName,
}: {
  groups: MyGroupCard[];
  currentGroupId: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-0 cursor-pointer bg-transparent p-0 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span className="font-heading truncate text-2xl leading-tight">{groupName}</span>
          <ChevronDown size={16} strokeWidth={2.75} className="text-faint flex-none" />
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Your groups">
        <div className="flex flex-col gap-1.5">
          {groups.map((group) => {
            const active = group.id === currentGroupId;
            return (
              <Link
                key={group.id}
                href={`/g/${group.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 rounded-[22px] px-3.5 py-2.5",
                  active ? "bg-accent text-on-panel" : "bg-surface text-text",
                )}
              >
                <span
                  className={cn(
                    "flex h-[42px] w-[42px] flex-none flex-col items-center justify-center rounded-full leading-none",
                    active ? "bg-on-panel/20" : "bg-bg",
                  )}
                >
                  <span className="font-heading text-[15px]">{group.dayIndex}</span>
                  <span className="text-[8px] tracking-[0.1em] opacity-70">DAY</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15.5px] font-bold">{group.name}</span>
                  <span className="mt-0.5 block text-[12.5px] opacity-70">
                    {group.isAdmin ? "you run this one" : "member"}
                  </span>
                </span>
                {active && <Check size={18} strokeWidth={3} className="flex-none" />}
              </Link>
            );
          })}
        </div>

        <div className="mt-3.5 flex gap-2">
          <Link
            href="/join"
            className="border-text/25 text-text flex-1 rounded-[20px] border-[1.5px] border-dashed py-3.5 text-center text-[14px] font-bold"
          >
            Join another
          </Link>
          <Link
            href="/create"
            className="bg-accent text-on-panel flex-1 rounded-[20px] py-3.5 text-center text-[14px] font-bold"
          >
            Start a group
          </Link>
        </div>
      </Sheet>
    </>
  );
}
