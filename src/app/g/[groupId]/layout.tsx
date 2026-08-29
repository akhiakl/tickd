import { redirect } from "next/navigation";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { requireValidUserId } from "@/server/auth/require-user";
import { Screen } from "@/components/layout/screen";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Membership gate shared by every screen under a group: middleware already
 * keeps anonymous visitors out of `/g/**`, `requireValidUserId` catches a
 * stale-but-valid session (see its own doc), and the snapshot lookup below
 * catches a signed-in user who isn't actually a member of this particular
 * group.
 */
export default async function GroupLayout({ children, params }: LayoutProps<"/g/[groupId]">) {
  const { groupId } = await params;
  const userId = await requireValidUserId(`/g/${groupId}`);
  const snapshot = await getGroupSnapshot(groupId, userId);
  if (!snapshot) redirect("/");

  // Uncapped at lg: every screen under a group has its own desktop
  // composition (see design/project/desktop-redesign) with its own ideal
  // width, so the cap moves down to each page's own wrapper instead of
  // being fixed once here.
  return (
    <Screen bare maxWidthClassName="max-w-md md:max-w-xl lg:max-w-none">
      {children}
    </Screen>
  );
}
