"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Settings, RefreshCw, TriangleAlert } from "lucide-react";
import { GroupSwitcher } from "@/components/group-switcher/group-switcher";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { GroupNav } from "@/components/nav/group-nav";
import { Avatar } from "@/components/ui/avatar";
import { useTxQueueStatus } from "@/lib/sync/use-tx-queue-status";
import { drainController } from "@/lib/sync/drain";
import type { MyGroupCard } from "@/server/queries/my-groups";

/**
 * Shared top bar for every tab inside a group - Today, Wall, and Ranks all
 * render this exact shell (group switcher, sync status, theme toggle,
 * account avatar), each supplying only its own one-line `subtitle`
 * (Today's "Day X of Y - date", Wall's "The wall", Ranks' "Standings").
 * Previously each tab hand-rolled its own header, so switching tabs meant
 * the whole top bar's shape changed, not just the content below it -
 * `Deliberately NOT` used by Settings or the member profile: those are
 * drill-in detail screens reached *from* these tabs (back-button pattern),
 * not top-level destinations of their own, so a different header there is
 * intentional, not the inconsistency this component fixes.
 */
export function GroupTabHeader({
  groupId,
  groupName,
  myName,
  myColor,
  myAvatarSeed,
  isAdmin,
  groups,
  subtitle,
}: {
  groupId: string;
  groupName: string;
  myName: string;
  myColor: string;
  myAvatarSeed: string;
  isAdmin: boolean;
  groups: MyGroupCard[];
  subtitle: ReactNode;
}) {
  const { pendingCount, stuckCount } = useTxQueueStatus();

  return (
    <>
      <div className="flex items-start justify-between gap-3 pt-1.5 lg:col-span-2">
        <div className="min-w-0 flex-1">
          <GroupSwitcher groups={groups} currentGroupId={groupId} groupName={groupName} />
          <div className="mt-0.5 flex min-w-0 items-center gap-2.5">
            {subtitle}
            {/* Sits with the group's own title block, not the account-level
              icons on the right (ThemeToggle/Avatar apply the same
              regardless of which group or tab is open) - this is scoped
              to *this* group, so it reads as part of the group identity,
              not global nav. Text link, not a circular icon button, so it
              doesn't visually match that row either. Shown on every tab,
              not just Today, for the same reason this header exists: an
              admin shouldn't have to detour through Today to reach
              Settings from Wall or Ranks. */}
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
            docs/local-first-sync-engine-plan.md's "Observability" section.
            Shown on every tab (not just Today) since the queue itself is
            one shared, origin-wide singleton (src/lib/sync/drain.ts) - a
            write made from Today is just as relevant to know about while
            looking at Wall or Ranks. */}
          {stuckCount > 0 ? (
            <button
              type="button"
              onClick={() => void drainController.retryAllStuck()}
              className="text-flame mt-1 flex items-center gap-1 text-[11.5px] font-bold"
            >
              <TriangleAlert size={12} strokeWidth={2.4} />
              {stuckCount === 1
                ? "1 change couldn't sync"
                : `${stuckCount} changes couldn't sync`}{" "}
              - Retry
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
      {/* lg:col-span-2: full-width tab row below the header at lg; below
          that GroupNav fixes itself to the viewport bottom instead (see
          its own comment) - either way this is the one place it renders. */}
      <div className="lg:col-span-2">
        <GroupNav groupId={groupId} />
      </div>
    </>
  );
}
