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
        <Avatar name={row.name} color={row.color} seed={row.avatarSeed} size={32} />
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
          <span className="bg-text/10 mt-1 block h-[5px] overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.min(100, row.pct)}%`, background: row.color }}
            />
          </span>
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
