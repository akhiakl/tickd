import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { WallGrid } from "@/components/wall/wall-grid";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "The wall" };

export default async function WallPage({ params }: PageProps<"/g/[groupId]/wall">) {
  const { groupId } = await params;
  const session = await auth();
  const snapshot = await getGroupSnapshot(groupId, session!.user!.id);
  if (!snapshot) return null;

  return (
    <div className="pt-1.5 pb-8">
      <div className="px-5.5 pb-3.5">
        <div className="font-heading text-2xl">The wall</div>
        <div className="text-muted text-[13px]">
          {snapshot.durationDays} days - {snapshot.members.length} people - tap any day
        </div>
      </div>

      <div className="text-muted flex flex-wrap gap-3.5 px-5.5 pb-3.5 text-[11px]">
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
