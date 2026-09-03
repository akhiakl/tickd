import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getUserById } from "@/server/queries/users";
import { getMyGroups } from "@/server/queries/my-groups";
import { requireValidUserId } from "@/server/auth/require-user";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { AccountForm } from "@/components/account/account-form";
import { SaveAccountForm } from "@/components/account/save-account-form";
import { SignOutButton } from "@/components/account/sign-out-button";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: "Your account",
  description: "Manage your profile and the groups you're a member of.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const userId = await requireValidUserId("/account");
  const [user, groups] = await Promise.all([getUserById(userId), getMyGroups(userId)]);
  if (!user) return null;

  return (
    // At lg: identity/colour/preferences on the left, "save your account"
    // (promoted to a real panel - see SaveAccountForm's own comment) +
    // groups + sign out on the right, instead of one long stacked column.
    // See design/project/desktop-redesign/AccountDesktop.dc.html and that
    // folder's NOTES.md.
    <Screen
      bare
      className="pt-2 pb-10 lg:px-10 lg:pt-10 lg:pb-16"
      maxWidthClassName="max-w-md md:max-w-xl lg:max-w-[1000px]"
    >
      <div className="flex items-center gap-3 px-5.5 pt-1.5 pb-4.5 lg:px-0">
        <BackButton href="/" />
        <span className="font-heading text-[21px] lg:text-[28px]">Your account</span>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <AccountForm
          initialName={user.name}
          email={user.email}
          initialColor={user.color}
          initialAvatarSeed={user.avatarSeed}
          initialTimezone={user.timezone}
          initialPrefs={{
            reminderEnabled: user.reminderEnabled,
            weeklyRecapEnabled: user.weeklyRecapEnabled,
            showStreaks: user.showStreaks,
            hideFromRanks: user.hideFromRanks,
          }}
          className="lg:col-start-1"
        />

        <div className="lg:col-start-2">
          {!user.authSub && !user.username && (
            <div className="pt-6.5 lg:pt-0">
              <SaveAccountForm />
            </div>
          )}
          {!user.authSub && user.username && (
            <div className="bg-surface mx-4 mt-6.5 rounded-[22px] px-4.5 py-4 lg:mx-0 lg:mt-0">
              <div className="text-[15px] font-bold">Account saved</div>
              <div className="text-muted mt-0.5 text-[12.5px]">
                Log in as @{user.username} from any device to get back to this account.
              </div>
            </div>
          )}

          {groups.length > 0 && (
            <>
              <div className="text-faint px-6 pt-6.5 pb-2 text-[11px] tracking-[0.12em] uppercase lg:px-0">
                Groups
              </div>
              <div className="flex flex-col gap-1.5 px-4 lg:px-0">
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

          <div className="px-4 pt-6.5 lg:px-0">
            <SignOutButton />
          </div>
        </div>
      </div>
    </Screen>
  );
}
