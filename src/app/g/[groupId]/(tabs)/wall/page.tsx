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
    // One responsive layout at every width: WallGrid's own member list +
    // legend (see its comment) carry the day/people count and full legend
    // at every size now, not just at lg, so there's no separate compact
    // mobile-only summary here any more. See
    // design/project/desktop-redesign/WallDesktop.dc.html - its own
    // "Mobile" and "Desktop" artboards are byte-identical HTML, reflowed
    // purely by that file's own `@media` rules - and that folder's
    // NOTES.md.
    // pb-28 (not the old pb-8) clears GroupNav's fixed bottom bar below
    // lg - it hides itself above lg, no clearance needed there.
    <div className="px-5 pt-1.5 pb-28 sm:px-6 lg:mx-auto lg:max-w-[1160px] lg:px-10 lg:pt-10 lg:pb-16">
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

      <div className="mt-3.5">
        <WallGrid
          members={snapshot.members}
          startDate={snapshot.startDate}
          durationDays={snapshot.durationDays}
          items={snapshot.items}
        />
      </div>
    </div>
  );
}
