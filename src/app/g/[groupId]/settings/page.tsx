import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { InviteCodePanel } from "@/components/settings/invite-code-panel";
import { MembersSettingsList } from "@/components/settings/members-settings-list";
import { DangerZone } from "@/components/settings/danger-zone";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Split dnd-kit's drag-and-drop editor out of the settings page's initial
// bundle - most visits read the page without touching the checklist.
const ChecklistSettingsEditor = dynamic(
  () =>
    import("@/components/settings/checklist-settings-editor").then(
      (m) => m.ChecklistSettingsEditor,
    ),
  { loading: () => <div className="bg-surface h-40 animate-pulse rounded-3xl" /> },
);

export const metadata = { title: "Group settings" };

export default async function GroupSettingsPage({ params }: PageProps<"/g/[groupId]/settings">) {
  const { groupId } = await params;
  const session = await auth();
  const snapshot = await getGroupSnapshot(groupId, session!.user!.id);
  if (!snapshot) return null;
  if (snapshot.myRole !== "admin") redirect(`/g/${groupId}`);

  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-4.5">
        <BackButton href={`/g/${groupId}`} />
        <span className="font-heading text-[21px]">Group settings</span>
      </div>

      <InviteCodePanel groupId={groupId} initialCode={snapshot.inviteCode} />

      <div className="text-faint px-2 pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">
        Checklist items
      </div>
      <div className="px-0">
        <ChecklistSettingsEditor groupId={groupId} items={snapshot.items} />
      </div>

      <div className="text-faint px-2 pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">
        Members
      </div>
      <MembersSettingsList
        groupId={groupId}
        members={snapshot.members.map((m) => ({
          userId: m.userId,
          name: m.name,
          color: m.color,
          avatarSeed: m.avatarSeed,
          isMe: m.isMe,
        }))}
      />

      <div className="pt-6.5">
        <DangerZone groupId={groupId} dayIndex={snapshot.dayIndex} />
      </div>
    </Screen>
  );
}
