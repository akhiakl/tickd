import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { getUserById } from "@/server/queries/users";
import { getMyGroups } from "@/server/queries/my-groups";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { AccountForm } from "@/components/account/account-form";
import { SignOutButton } from "@/components/account/sign-out-button";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const session = await auth();
  const userId = session!.user!.id;
  const [user, groups] = await Promise.all([getUserById(userId), getMyGroups(userId)]);
  if (!user) return null;

  return (
    <Screen bare className="pt-2 pb-10">
      <div className="flex items-center gap-3 px-5.5 pt-1.5 pb-4.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">Your account</span>
      </div>

      <AccountForm
        initialName={user.name}
        email={user.email}
        initialColor={user.color}
        initialAvatarSeed={user.avatarSeed}
        initialPrefs={{
          reminderEnabled: user.reminderEnabled,
          weeklyRecapEnabled: user.weeklyRecapEnabled,
          showStreaks: user.showStreaks,
          hideFromRanks: user.hideFromRanks,
        }}
      />

      {groups.length > 0 && (
        <>
          <div className="text-faint px-6 pt-6.5 pb-2 text-[11px] tracking-[0.12em] uppercase">
            Groups
          </div>
          <div className="flex flex-col gap-1.5 px-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={group.isAdmin ? `/g/${group.id}/settings` : `/g/${group.id}`}
                className="bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-[22px] px-4.5 py-3.5 font-bold transition-colors"
              >
                <span className="flex-1 text-[15px]">{group.name}</span>
                <span className="text-muted text-[12.5px] font-semibold">
                  {group.isAdmin ? "admin" : "member"}
                </span>
                <ChevronRight size={16} strokeWidth={2.75} className="text-faint" />
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="px-4 pt-6.5">
        <SignOutButton />
      </div>
    </Screen>
  );
}
