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
        <span className="text-muted mt-0.5 block text-[13px]" data-testid="today-header-day">
          Day {dayIndex} of {durationDays} - {today}
        </span>
      </div>
      <ThemeToggle />
      <Link href="/account" aria-label="Your account" className="flex-none">
        <Avatar name={myName} color={myColor} seed={myAvatarSeed} size={36} />
      </Link>
      {isAdmin && (
        <Link
          href={`/g/${groupId}/settings`}
          aria-label="Group settings"
          className="border-text/[0.16] hover:bg-text/[0.06] flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] transition-colors"
        >
          <Settings size={17} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
