import { Suspense } from "react";
import Link from "next/link";
import { Circle, Check, Grid2x2, Flame, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { getMyGroups } from "@/server/queries/my-groups";
import { getUserById } from "@/server/queries/users";
import { Screen } from "@/components/layout/screen";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/link-button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/nav/theme-toggle";

/**
 * Signed-in indicator, doubling as the way back into /account from the
 * landing page - previously only reachable from inside a group
 * (TodayHeader). Reads the session, so it's isolated behind Suspense for
 * the same reason MyGroups below is.
 */
async function AccountLink() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await getUserById(session.user.id);
  if (!user) return null;

  return (
    <Link href="/account" aria-label="Your account" className="flex-none">
      <Avatar name={user.name} color={user.color} seed={user.avatarSeed} size={34} />
    </Link>
  );
}

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

/** Illustrative sample data for the desktop hero's wall preview graphic -
 * not real app data, same as the rest of this bundle's demo content. See
 * design/project/desktop-redesign/Main.dc.html and that folder's NOTES.md. */
const PREVIEW_AVATARS = [
  { letter: "A", className: "bg-accent" },
  { letter: "P", className: "bg-flame" },
  { letter: "M", className: "bg-sage" },
  { letter: "L", className: "bg-panel-2" },
  { letter: "T", className: "bg-flame-light text-panel" },
] as const;

const PREVIEW_CELLS = [
  1, 2, 2, 0, 2, 1, 2, 2, 2, 1, 2, 0, 2, 1, 2, 1, 2, 2, 2, 0, 1, 2, 2, 1, 2, 2, 2, 1,
] as const;

const PREVIEW_CELL_CLASS = ["bg-zero", "bg-ok-3", "bg-ok-4"] as const;

/**
 * One responsive composition at every width, not a desktop-only overlay
 * bolted onto an unrelated mobile page: a two-column hero with this
 * illustrative "wall" graphic below the headline/CTA on narrow widths and
 * beside it at lg, a "how it works" section, and a closing CTA band. See
 * design/project/desktop-redesign/Main.dc.html - its own "Mobile" and
 * "Desktop" artboards are byte-identical HTML, reflowed purely by that
 * file's own `@media` rules - and that folder's NOTES.md.
 */
function WallPreview() {
  return (
    <div className="relative py-5">
      <div className="bg-surface-2 absolute inset-6 -rotate-3 rounded-[28px]" />
      <div className="bg-panel relative mx-auto max-w-[440px] rotate-[1.4deg] rounded-[28px] p-6.5 shadow-[0_30px_60px_-20px_rgba(29,32,25,0.35)]">
        <div className="flex">
          {PREVIEW_AVATARS.map((a, i) => (
            <div
              key={a.letter}
              style={i > 0 ? { marginLeft: -10 } : undefined}
              className={`border-panel font-heading text-on-panel flex h-8.5 w-8.5 items-center justify-center rounded-full border-2 text-[13px] ${a.className}`}
            >
              {a.letter}
            </div>
          ))}
        </div>
        <div className="text-panel-soft mt-4.5 text-[10.5px] tracking-[0.13em]">THE WALL</div>
        <div className="mt-2.5 grid grid-cols-7 gap-1.5">
          {PREVIEW_CELLS.map((v, i) => (
            <div key={i} className={`aspect-square rounded-[5px] ${PREVIEW_CELL_CLASS[v]}`} />
          ))}
        </div>
      </div>
      <div className="bg-flame text-on-panel absolute right-6 bottom-5 flex -rotate-4 items-center gap-1.5 rounded-full py-2.5 pr-4.5 pl-3.5 shadow-[0_14px_26px_-8px_rgba(208,122,60,0.55)]">
        <Flame size={15} className="fill-current" />
        <span className="font-heading text-[14px]">6-day streak</span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: Circle,
    title: "Start or join",
    body: "Create a group or drop in an invite code - no email, no password, just a name.",
  },
  {
    icon: Check,
    title: "Tick your list",
    body: "A few things, once a day. Tap to check them off before the day resets.",
  },
  {
    icon: Grid2x2,
    title: "Watch the wall fill in",
    body: "Everyone's day lands on one shared grid. Miss one, and it shows.",
  },
] as const;

/** "How it works" section - see WallPreview's own comment. */
function HowItWorks() {
  return (
    <div className="mt-16 lg:mt-37">
      <h2 className="font-heading text-[26px] lg:text-[34px]">Three habits, one shared list.</h2>
      <p className="text-muted mt-2.5 text-[15px] lg:text-[16px]">
        No app-store gimmicks - just a list your group actually keeps up with.
      </p>
      <div className="mt-7 grid grid-cols-1 gap-4 lg:mt-10 lg:grid-cols-3 lg:gap-7">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-surface rounded-3xl p-6 lg:p-7">
            <div className="bg-ok-bg text-accent-d mb-4.5 flex h-12 w-12 items-center justify-center rounded-full">
              <Icon size={22} strokeWidth={2} />
            </div>
            <div className="font-heading text-[19px]">{title}</div>
            <p className="text-muted mt-2 text-[14.5px] leading-normal">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Closing CTA band - see WallPreview's own comment. */
function ClosingCta() {
  return (
    <div className="bg-panel mt-14 flex flex-col items-start gap-6 rounded-[28px] p-8 lg:mt-30 lg:flex-row lg:items-center lg:justify-between lg:p-12">
      <div className="font-heading text-on-panel max-w-[420px] text-[22px] leading-[1.15] lg:text-[27px]">
        Ready to keep each other honest?
      </div>
      <LinkButton href="/create" className="lg:w-auto lg:flex-none">
        Start a group
      </LinkButton>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Screen
      className="flex min-h-dvh flex-col px-6 pt-6 pb-10 lg:px-10 lg:pt-10 lg:pb-18"
      maxWidthClassName="max-w-md md:max-w-xl lg:max-w-[1160px]"
    >
      <div className="flex items-center justify-between gap-2.5 lg:mb-22">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-heading text-[22px] tracking-tight">Tickd</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Suspense fallback={<div className="skeleton h-[34px] w-[34px] rounded-full" />}>
            <AccountLink />
          </Suspense>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
        <div>
          <h1 className="font-heading mt-11 text-[52px] leading-[0.96] tracking-tight text-balance lg:mt-0 lg:text-[74px]">
            Everyone&apos;s
            <br />
            in. Every day.
          </h1>
          <p className="text-muted mt-4 max-w-[290px] text-[16.5px] leading-relaxed text-pretty lg:max-w-[460px] lg:text-[19px]">
            A shared daily checklist for your group. Tick your list, watch the wall fill in,
            don&apos;t be the one with the gap.
          </p>

          <div className="mt-8 flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            <LinkButton href="/create" className="lg:w-auto">
              Start a group
            </LinkButton>
            <LinkButton href="/join" variant="outline" className="lg:w-auto">
              Join with a code
            </LinkButton>
          </div>

          <Suspense fallback={<MyGroupsSkeleton />}>
            <MyGroups />
          </Suspense>
        </div>

        <WallPreview />
      </div>

      <HowItWorks />
      <ClosingCta />
    </Screen>
  );
}
