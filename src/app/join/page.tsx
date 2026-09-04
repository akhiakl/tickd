import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserById } from "@/server/queries/users";
import { findGroupByInviteCode, getGroupNameByInviteCode } from "@/server/queries/invite";
import { requireValidUserId } from "@/server/auth/require-user";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { Avatar } from "@/components/ui/avatar";
import { JoinGroupForm } from "@/components/join/join-group-form";

const DEFAULT_METADATA: Metadata = {
  title: "Join a group",
  description: "Join a group with an invite code.",
  robots: { index: false, follow: false },
};

/**
 * A function rather than the usual static export: an invite link's own
 * `?code=` decides what this page's link-preview card should say, and that
 * lookup doesn't need (or wait on) a session - see `getGroupNameByInviteCode`
 * and `src/proxy.ts`'s public-preview exemption for /join. Falls back to
 * the generic copy for a bare `/join`, or a code that doesn't resolve.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: PageProps<"/join">["searchParams"];
}): Promise<Metadata> {
  const { code } = await searchParams;
  const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  const groupName = normalizedCode ? await getGroupNameByInviteCode(normalizedCode) : null;
  if (!groupName) return DEFAULT_METADATA;

  const title = `Join ${groupName}`;
  const description = `You've been invited to join ${groupName} on Tickd - a shared daily checklist for your group.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

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
