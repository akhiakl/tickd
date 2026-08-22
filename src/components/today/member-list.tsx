import Link from "next/link";
import { Flame } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type MemberListRow = {
  userId: string;
  name: string;
  color: string;
  isMe: boolean;
  streak: number;
  pct: number;
};

export function MemberList({ groupId, rows }: { groupId: string; rows: MemberListRow[] }) {
  return (
    <div className="flex flex-col gap-0.5 px-4">
      {rows.map((row) => (
        <Link
          key={row.userId}
          href={`/g/${groupId}/members/${row.userId}`}
          className={cn(
            "flex items-center gap-2.5 rounded-[20px] px-2.5 py-2.5",
            row.isMe && "bg-surface",
          )}
        >
          <Avatar name={row.name} color={row.color} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-bold">
              {row.name}
              {row.isMe && " (you)"}
            </span>
            <span className="bg-text/10 mt-1 block h-[5px] overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.min(100, row.pct)}%`, background: row.color }}
              />
            </span>
          </span>
          <span className="flex w-[42px] flex-none items-center justify-end gap-0.5">
            <Flame size={12} className="fill-flame text-flame" />
            <span className="text-[12.5px] font-bold">{row.streak}</span>
          </span>
          <span className="text-muted w-11 flex-none text-right text-[12.5px] font-bold">
            {row.pct}%
          </span>
        </Link>
      ))}
    </div>
  );
}
