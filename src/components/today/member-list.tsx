"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Flame, Hand } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Toast } from "@/components/ui/toast";
import { useLocalTime } from "@/lib/use-local-time";
import { useToast } from "@/lib/use-toast";
import { pokeMember } from "@/server/actions/nudge";
import { cn } from "@/lib/utils";

export type MemberListRow = {
  userId: string;
  name: string;
  username: string | null;
  color: string;
  avatarSeed: string;
  timezone: string | null;
  isMe: boolean;
  streak: number;
  pct: number;
  /** Whether this member has finished today's checklist, in their own
   * timezone - drives whether a poke button shows at all (no point
   * poking someone who's already done). */
  doneToday: boolean;
  /** Yesterday was a total miss and nothing's landed today either yet -
   * see member-list-section.tsx's comment for the exact rule. Drives the
   * cracked-avatar badge and the roast caption below. */
  gapped: boolean;
  /** A deterministic, playful call-out line for a gapped member - null
   * whenever `gapped` is false. Picked server-side (src/lib/roast.ts) so
   * it's the same for every viewer and doesn't reshuffle on re-render. */
  roast: string | null;
};

export function MemberList({
  groupId,
  rows,
  className,
}: {
  groupId: string;
  rows: MemberListRow[];
  className?: string;
}) {
  const { message, showToast } = useToast();

  return (
    <div className={cn("relative flex flex-col gap-0.5", className)}>
      {rows.map((row) => (
        <MemberRow key={row.userId} groupId={groupId} row={row} showToast={showToast} />
      ))}
      <Toast message={message} />
    </div>
  );
}

function MemberRow({
  groupId,
  row,
  showToast,
}: {
  groupId: string;
  row: MemberListRow;
  showToast: (message: string) => void;
}) {
  const localTime = useLocalTime(row.timezone);
  const [poked, setPoked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function poke() {
    if (poked || isPending) return;
    startTransition(async () => {
      const result = await pokeMember(groupId, row.userId);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setPoked(true);
      showToast(
        result.delivered ? `Poked ${row.name}` : `Poked ${row.name} (they'll see it later)`,
      );
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[20px] px-2.5 py-2.5",
        row.isMe && "bg-surface",
      )}
    >
      <Link
        href={`/g/${groupId}/members/${row.userId}`}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <span className="relative flex-none">
          <Avatar
            name={row.name}
            color={row.color}
            seed={row.avatarSeed}
            size={32}
            className={row.gapped ? "opacity-60 grayscale" : undefined}
          />
          {/* The crack: a small badge marking a member currently "in the
              gap" (see MemberListRow.gapped's comment), in the same
              danger tokens group settings' delete button uses - nothing
              new introduced just for this. */}
          {row.gapped && (
            <span
              aria-hidden
              className="bg-danger text-on-panel ring-surface absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2"
            >
              <svg width="8" height="9" viewBox="0 0 8 9" fill="none">
                <path d="M3 0L5 3.5H3.2L5 9L1 4.5H2.8L1 0Z" fill="currentColor" />
              </svg>
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-bold">
            {row.name}
            {row.isMe && " (you)"}
          </span>
          <span className="text-muted flex items-center gap-1 truncate text-[11.5px]">
            {row.username && <span className="truncate">@{row.username}</span>}
            {row.username && localTime && <span aria-hidden>·</span>}
            {localTime && <span className="flex-none">{localTime}</span>}
          </span>
          {row.roast ? (
            <span className="text-danger-d bg-danger-bg mt-1 inline-block truncate rounded-full px-2 py-0.5 text-[10.5px] font-bold">
              {row.roast}
            </span>
          ) : (
            <span className="bg-text/10 mt-1 block h-[5px] overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.min(100, row.pct)}%`, background: row.color }}
              />
            </span>
          )}
        </span>
      </Link>
      {!row.isMe && !row.doneToday && (
        <button
          type="button"
          onClick={poke}
          disabled={poked || isPending}
          aria-label={`Poke ${row.name}`}
          className={cn(
            "flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors",
            poked ? "text-faint" : "bg-surface-2 text-muted hover:text-text active:scale-90",
          )}
        >
          <Hand size={15} strokeWidth={2.4} />
        </button>
      )}
      <span className="flex w-[42px] flex-none items-center justify-end gap-0.5">
        <Flame size={12} className="fill-flame text-flame" />
        <span className="text-[12.5px] font-bold">{row.streak}</span>
      </span>
      <span className="text-muted w-11 flex-none text-right text-[12.5px] font-bold">
        {row.pct}%
      </span>
    </div>
  );
}
