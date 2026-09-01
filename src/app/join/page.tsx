import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserById } from "@/server/queries/users";
import { findGroupByInviteCode } from "@/server/queries/invite";
import { requireValidUserId } from "@/server/auth/require-user";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { Avatar } from "@/components/ui/avatar";
import { JoinGroupForm } from "@/components/join/join-group-form";

export const metadata = { title: "Join a group" };

/**
 * Everything here reads the session (`auth()`) or `searchParams`, both
 * request-time-only under Cache Components - awaiting them here, rather
 * than in the page itself, is what keeps that dynamic work inside the
 * Suspense boundary below instead of forcing the whole route dynamic.
 */
async function JoinContent({ searchParams }: { searchParams: PageProps<"/join">["searchParams"] }) {
  const { code } = await searchParams;
  // Preserves the invite code across a sign-in round trip, so a stale
  // session gets cleared and the visitor lands right back on this same
  // join flow instead of losing the code they came in with.
  const currentPath = typeof code === "string" ? `/join?code=${encodeURIComponent(code)}` : "/join";
  const userId = await requireValidUserId(currentPath);
  const user = await getUserById(userId);
  if (!user) return null;

  // Normalized once and reused below for both the membership check and
  // the form's initialCode, so the two can't disagree about a code with
  // stray leading/trailing whitespace (which trim() would drop from one
  // but not the other if computed separately).
  const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";

  // Arriving here from an invite link (a group's Manage screen, or a
  // group card someone shared) for a group the visitor is already in -
  // send them straight to it instead of making them hit "Join the group"
  // again for a no-op membership row. A code that doesn't resolve, or
  // resolves but they're not a member of yet, falls through to the form
  // below exactly as before.
  if (normalizedCode) {
    const match = await findGroupByInviteCode(normalizedCode, userId);
    if (match?.alreadyMember) redirect(`/g/${match.groupId}`);
  }

  return (
    <>
      <div className="bg-surface mb-6 flex items-center gap-3.5 rounded-[26px] px-4.5 py-4">
        <Avatar name={user.name} color={user.color} seed={user.avatarSeed} size={44} />
        <div>
          <div className="text-[15.5px] font-bold">{user.name}</div>
          <div className="text-muted text-[12.5px]">joining as this account</div>
        </div>
      </div>

      <JoinGroupForm initialCode={normalizedCode} />
    </>
  );
}

function JoinContentSkeleton() {
  return (
    <>
      <div className="bg-surface mb-6 h-[68px] animate-pulse rounded-[26px]" />
      <div className="bg-surface h-[186px] animate-pulse rounded-3xl" />
    </>
  );
}

export default function JoinGroupPage({ searchParams }: PageProps<"/join">) {
  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-5.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">Join a group</span>
      </div>

      <Suspense fallback={<JoinContentSkeleton />}>
        <JoinContent searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}
