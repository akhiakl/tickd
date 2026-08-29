import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { requireValidUserId } from "@/server/auth/require-user";
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
  const userId = await requireValidUserId(`/g/${groupId}/settings`);
  const snapshot = await getGroupSnapshot(groupId, userId);
  if (!snapshot) return null;
  if (snapshot.myRole !== "admin") redirect(`/g/${groupId}`);

  return (
    // At lg: a two-column composition (invite + members on the left,
    // checklist editor + danger zone on the right) instead of one long
    // stacked column. See
    // design/project/desktop-redesign/GroupSettingsDesktop.dc.html and
    // that folder's NOTES.md.
    <Screen
      className="pt-2 pb-10 lg:px-10 lg:pt-10 lg:pb-16"
      maxWidthClassName="max-w-md md:max-w-xl lg:max-w-[1000px]"
    >
      <div className="flex items-center gap-3 py-1.5 pb-4.5">
        <BackButton href={`/g/${groupId}`} />
        <span className="font-heading text-[21px] lg:text-[28px]">Group settings</span>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <InviteCodePanel
          groupId={groupId}
          initialCode={snapshot.inviteCode}
          className="lg:col-start-1"
        />

        <div className="text-faint px-2 pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase lg:col-start-2 lg:px-0">
          Checklist items
        </div>
        <div className="px-0 lg:col-start-2">
          <ChecklistSettingsEditor groupId={groupId} items={snapshot.items} />
        </div>

        <div className="text-faint px-2 pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase lg:col-start-1 lg:px-0">
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
          className="lg:col-start-1"
        />

        <div className="pt-6.5 lg:col-start-2">
          <DangerZone groupId={groupId} dayIndex={snapshot.dayIndex} />
        </div>
      </div>
    </Screen>
  );
}
