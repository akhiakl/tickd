import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getMyGroups } from "@/server/queries/my-groups";
import { Screen } from "@/components/layout/screen";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/link-button";
import { ChevronRight } from "lucide-react";

/**
 * The only part of this page that needs the session (`auth()`) is the
 * signed-in user's group list - isolating it here, behind Suspense, lets
 * the hero/CTA copy above prerender as a static shell instead of the
 * whole page being forced dynamic by one `auth()` call.
 */
async function MyGroups() {
  const session = await auth();
  const groups = session?.user?.id ? await getMyGroups(session.user.id) : [];
  if (groups.length === 0) return null;

  return (
    <>
      <div className="mt-10 flex items-center gap-2.5">
        <div className="bg-text/[0.16] h-px flex-1" />
        <span className="text-faint text-[10.5px] tracking-[0.12em] uppercase">Your groups</span>
        <div className="bg-text/[0.16] h-px flex-1" />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {groups.map((group) => (
          <Link
            key={group.id}
            href={`/g/${group.id}`}
            className="bg-surface hover:bg-surface-2 flex items-center gap-3.5 rounded-3xl px-4.5 py-4 transition-colors"
          >
            <div className="bg-bg flex h-[42px] w-[42px] flex-none flex-col items-center justify-center rounded-full leading-none">
              <span className="font-heading text-[15px]">{group.dayIndex}</span>
              <span className="text-faint text-[8px] tracking-[0.1em]">DAY</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-bold">{group.name}</div>
              <div className="text-muted text-[12.5px]">
                day {group.dayIndex} of {group.durationDays}
              </div>
            </div>
            <ChevronRight size={17} strokeWidth={2.75} className="text-faint flex-none" />
          </Link>
        ))}
      </div>
    </>
  );
}

function MyGroupsSkeleton() {
  return (
    <>
      <div className="mt-10 flex items-center gap-2.5">
        <div className="bg-text/[0.16] h-px flex-1" />
        <span className="text-faint text-[10.5px] tracking-[0.12em] uppercase">Your groups</span>
        <div className="bg-text/[0.16] h-px flex-1" />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="skeleton h-[74px] rounded-3xl" />
        ))}
      </div>
    </>
  );
}

export default function LandingPage() {
  return (
    <Screen className="flex min-h-dvh flex-col px-6 pt-6 pb-10">
      <div className="flex items-center gap-2.5">
        <Logo size={34} />
        <span className="font-heading text-[22px] tracking-tight">Tickd</span>
      </div>

      <h1 className="font-heading mt-11 text-[52px] leading-[0.96] tracking-tight text-balance">
        Everyone&apos;s
        <br />
        in. Every day.
      </h1>
      <p className="text-muted mt-4 max-w-[290px] text-[16.5px] leading-relaxed text-pretty">
        A shared daily checklist for your group. Tick your list, watch the wall fill in, don&apos;t
        be the one with the gap.
      </p>

      <div className="mt-8 flex flex-col gap-2.5">
        <LinkButton href="/create">Start a group</LinkButton>
        <LinkButton href="/join" variant="outline">
          Join with a code
        </LinkButton>
      </div>

      <Suspense fallback={<MyGroupsSkeleton />}>
        <MyGroups />
      </Suspense>
    </Screen>
  );
}
