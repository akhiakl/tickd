import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { Screen } from "@/components/layout/screen";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Membership gate shared by every screen under a group: middleware already
 * keeps anonymous visitors out of `/g/**`, this catches a signed-in user
 * who isn't actually a member of this particular group.
 */
export default async function GroupLayout({ children, params }: LayoutProps<"/g/[groupId]">) {
  const { groupId } = await params;
  const session = await auth();
  const snapshot = await getGroupSnapshot(groupId, session!.user!.id);
  if (!snapshot) redirect("/");

  return <Screen bare>{children}</Screen>;
}
