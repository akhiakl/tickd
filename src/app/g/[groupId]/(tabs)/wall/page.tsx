import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { getMyGroups } from "@/server/queries/my-groups";
import { requireValidUserId } from "@/server/auth/require-user";
import { GroupTabHeader } from "@/components/nav/group-tab-header";
import { WallGrid } from "@/components/wall/wall-grid";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "The wall" };

export default async function WallPage({ params }: PageProps<"/g/[groupId]/wall">) {
  const { groupId } = await params;
  const userId = await requireValidUserId(`/g/${groupId}/wall`);
  const [snapshot, groups] = await Promise.all([
    getGroupSnapshot(groupId, userId),
    getMyGroups(userId),
  ]);
  if (!snapshot) return null;
  const me = snapshot.members.find((m) => m.isMe)!;

  return (
    // At lg: a real, non-scrolling member sidebar with a fully labeled
    // legend, beside the calendar - see WallGrid's own comment and
    // design/project/desktop-redesign/WallDesktop.dc.html.
    <div className="pt-1.5 pb-8 lg:mx-auto lg:max-w-[1160px] lg:px-10 lg:pt-10 lg:pb-16">
      <GroupTabHeader
        groupId={groupId}
        groupName={snapshot.name}
        myName={me.name}
        myColor={me.color}
        myAvatarSeed={me.avatarSeed}
        isAdmin={snapshot.myRole === "admin"}
        groups={groups}
        subtitle={<span className="text-muted truncate text-[13px]">The wall</span>}
      />

      {/* The desktop sidebar (WallGrid) already spells out day/people
          count and a full legend, so these compact mobile-only rows hide
          at lg instead of duplicating them. */}
      <div className="px-5.5 pt-3.5 pb-3.5 lg:hidden">
        <div className="text-muted text-[13px]">
          {snapshot.durationDays} days - {snapshot.members.length} people - tap any day
        </div>
      </div>

      <div className="text-muted flex flex-wrap gap-3.5 px-5.5 pb-3.5 text-[11px] lg:hidden">
        <span className="flex items-center gap-1.5">
          <span className="bg-ok block h-[11px] w-[11px] rounded-[3px]" />
          all {snapshot.items.length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-ok-3 block h-[11px] w-[11px] rounded-[3px]" />
          partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-zero block h-[11px] w-[11px] rounded-[3px]" />
          zero
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-surface block h-[11px] w-[11px] rounded-[3px] opacity-50" />
          before the challenge started
        </span>
      </div>

      <WallGrid
        members={snapshot.members}
        startDate={snapshot.startDate}
        durationDays={snapshot.durationDays}
        items={snapshot.items}
      />
    </div>
  );
}
