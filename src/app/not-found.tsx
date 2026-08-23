import Link from "next/link";
import { Home, CirclePlus, Link2, CircleUserRound, ChevronRight } from "lucide-react";
import { Screen } from "@/components/layout/screen";
import { Logo } from "@/components/ui/logo";
import { LinkButton } from "@/components/ui/link-button";

const SUGGESTIONS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/create", label: "Start a group", icon: CirclePlus },
  { href: "/join", label: "Join with a code", icon: Link2 },
  { href: "/account", label: "Your account", icon: CircleUserRound },
] as const;

export default function NotFound() {
  return (
    <Screen className="flex min-h-dvh flex-col px-6 pt-6 pb-10">
      <div className="flex items-center gap-2.5">
        <Logo size={30} />
        <span className="font-heading text-[19px] tracking-tight">Tickd</span>
      </div>

      <div className="mt-14 flex flex-col items-center text-center">
        <div className="bg-surface flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full leading-none">
          <span className="font-heading text-flame text-[30px]">404</span>
          <span className="text-faint mt-1 text-[9px] tracking-[0.12em]">PAGE</span>
        </div>

        <h1 className="font-heading mt-6.5 text-[34px] leading-[1.05] tracking-tight text-balance">
          This page never
          <br />
          got Tickd.
        </h1>
        <p className="text-muted mt-3 max-w-[280px] text-[15.5px] leading-relaxed text-pretty">
          Nobody&apos;s checked this one off - not today, not ever.
        </p>
      </div>

      <div className="mt-13 flex items-center gap-2.5">
        <div className="bg-text/[0.16] h-px flex-1" />
        <span className="text-faint text-[10.5px] tracking-[0.12em] uppercase">
          Try one of these
        </span>
        <div className="bg-text/[0.16] h-px flex-1" />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {SUGGESTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-surface hover:bg-surface-2 flex items-center gap-3.5 rounded-3xl px-4.5 py-4 transition-colors"
          >
            <Icon size={20} strokeWidth={2} className="flex-none" />
            <span className="flex-1 text-[15px] font-bold">{label}</span>
            <ChevronRight size={16} strokeWidth={2.75} className="text-faint flex-none" />
          </Link>
        ))}
      </div>

      <LinkButton href="/" className="mt-6">
        Take me home
      </LinkButton>
    </Screen>
  );
}
