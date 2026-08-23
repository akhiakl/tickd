import { auth } from "@/auth";
import { getUserById } from "@/server/queries/users";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { Avatar } from "@/components/ui/avatar";
import { JoinGroupForm } from "@/components/join/join-group-form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "Join a group" };

export default async function JoinGroupPage({ searchParams }: PageProps<"/join">) {
  const { code } = await searchParams;
  const session = await auth();
  const user = await getUserById(session!.user!.id);
  if (!user) return null;

  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-5.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">Join a group</span>
      </div>

      <div className="bg-surface mb-6 flex items-center gap-3.5 rounded-[26px] px-4.5 py-4">
        <Avatar name={user.name} color={user.color} seed={user.avatarSeed} size={44} />
        <div>
          <div className="text-[15.5px] font-bold">{user.name}</div>
          <div className="text-muted text-[12.5px]">joining as this account</div>
        </div>
      </div>

      <JoinGroupForm initialCode={typeof code === "string" ? code.toUpperCase() : ""} />
    </Screen>
  );
}
