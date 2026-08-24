"use client";

import Link from "next/link";
import { Settings, RefreshCw, TriangleAlert } from "lucide-react";
import { GroupSwitcher } from "@/components/group-switcher/group-switcher";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { useTxQueueStatus } from "@/lib/sync/use-tx-queue-status";
import { drainController } from "@/lib/sync/drain";
import type { MyGroupCard } from "@/server/queries/my-groups";

export function TodayHeader({
  groupId,
  groupName,
  dayIndex,
  durationDays,
  myName,
  myColor,
  myAvatarSeed,
  isAdmin,
  groups,
}: {
  groupId: string;
  groupName: string;
  dayIndex: number;
  durationDays: number;
  myName: string;
  myColor: string;
  myAvatarSeed: string;
  isAdmin: boolean;
  groups: MyGroupCard[];
}) {
  const today = new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const { pendingCount, stuckCount } = useTxQueueStatus();

  return (
    <div className="flex items-start justify-between gap-3 px-5.5 pt-1.5">
      <div className="min-w-0 flex-1">
        <GroupSwitcher groups={groups} currentGroupId={groupId} groupName={groupName} />
        <div className="mt-0.5 flex min-w-0 items-center gap-2.5">
          <span className="text-muted truncate text-[13px]" data-testid="today-header-day">
            Day {dayIndex} of {durationDays} - {today}
          </span>
          {/* Sits with the group's own title block, not the account-level
              icons on the right (ThemeToggle/Avatar apply the same
              regardless of which group is open) - this is scoped to
              *this* group, so it reads as part of the group identity, not
              global nav. Text link, not a circular icon button, so it
              doesn't visually match that row either. */}
          {isAdmin && (
            <Link
              href={`/g/${groupId}/settings`}
              className="text-muted hover:text-text flex flex-none items-center gap-1 text-[12px] font-bold"
            >
              <Settings size={12} strokeWidth={2.4} />
              Manage
            </Link>
          )}
        </div>
        {/* Only rendered once there's something to say - "all synced" is
            the default, silent state; this only shows up mid-offline
            (pending) or once auto-retry has given up on something
            (stuck), matching the app's existing minimal-chrome style. See
            docs/local-first-sync-engine-plan.md's "Observability" section. */}
        {stuckCount > 0 ? (
          <button
            type="button"
            onClick={() => void drainController.retryAllStuck()}
            className="text-flame mt-1 flex items-center gap-1 text-[11.5px] font-bold"
          >
            <TriangleAlert size={12} strokeWidth={2.4} />
            {stuckCount === 1 ? "1 change couldn't sync" : `${stuckCount} changes couldn't sync`} -
            Retry
          </button>
        ) : (
          pendingCount > 0 && (
            <span className="text-muted mt-1 flex items-center gap-1 text-[11.5px] font-semibold">
              <RefreshCw size={12} strokeWidth={2.4} className="animate-spin" />
              Syncing{pendingCount > 1 ? ` ${pendingCount}` : ""}...
            </span>
          )
        )}
      </div>
      <ThemeToggle />
      <Link href="/account" aria-label="Your account" className="flex-none">
        <Avatar name={myName} color={myColor} seed={myAvatarSeed} size={36} />
      </Link>
    </div>
  );
}
