import Link from "next/link";
import { Settings } from "lucide-react";
import { GroupSwitcher } from "@/components/group-switcher/group-switcher";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
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
      </div>
      <ThemeToggle />
      <Link href="/account" aria-label="Your account" className="flex-none">
        <Avatar name={myName} color={myColor} seed={myAvatarSeed} size={36} />
      </Link>
    </div>
  );
}
