import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import {
  computeBestStreak,
  computeTotal,
  currentStreakWithToday,
  dateRange,
} from "@/lib/challenge-stats";
import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default async function MemberProfilePage({
  params,
}: PageProps<"/g/[groupId]/members/[memberId]">) {
  const { groupId, memberId } = await params;
  const session = await auth();
  const snapshot = await getGroupSnapshot(groupId, session!.user!.id);
  if (!snapshot) return null;

  const member = snapshot.members.find((m) => m.userId === memberId);
  if (!member) notFound();

  const { items, dayIndex, durationDays } = snapshot;
  const dates = dateRange(snapshot.startDate, dayIndex);
  const counts = dates.map((d) => member.countsByDate[d] ?? 0);
  const allDates = dateRange(snapshot.startDate, durationDays);

  const perItem = items.map((item) => {
    const doneDays = dates.filter((d) => (member.itemsByDate[d] ?? []).includes(item.id)).length;
    return { ...item, pct: dayIndex > 0 ? Math.round((doneDays / dayIndex) * 100) : 0 };
  });

  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5">
        <BackButton href={`/g/${groupId}`} />
        <span className="text-faint text-[11px] tracking-[0.12em] uppercase">Member</span>
      </div>

      <div className="flex items-center gap-4 pt-4.5">
        <Avatar name={member.name} color={member.color} size={62} />
        <div>
          <div className="font-heading text-[27px] leading-tight">
            {member.name}
            {member.isMe && " (you)"}
          </div>
          <div className="text-muted text-[13px]">
            joined day 1 - {Math.round((computeTotal(counts) / (dayIndex * items.length)) * 100)}%
            of the challenge
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-0 pt-5">
        {[
          { value: currentStreakWithToday(counts), label: "Current streak" },
          { value: computeBestStreak(counts), label: "Longest run" },
          { value: computeTotal(counts), label: "Items done" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface flex-1 rounded-[22px] px-3 py-3.5 text-center"
          >
            <div className="font-heading text-2xl">{stat.value}</div>
            <div className="text-faint mt-0.5 text-[10px] tracking-[0.08em] uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="text-faint pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">
        Per item
      </div>
      <div className="flex flex-col gap-2.5">
        {perItem.map((item) => (
          <div key={item.id}>
            <div className="mb-1.5 flex justify-between text-[13.5px] font-semibold">
              <span>{item.label}</span>
              <span className="text-muted">{item.pct}%</span>
            </div>
            <div className="bg-text/10 h-[7px] overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${item.pct}%`, background: member.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-faint pt-6.5 pb-2.5 text-[11px] tracking-[0.12em] uppercase">
        History
      </div>
      <div className="flex max-w-[340px] flex-wrap gap-1.5">
        {allDates.map((date, i) => {
          const future = date > snapshot.today;
          const count = future ? null : (member.countsByDate[date] ?? 0);
          const full = count === items.length;
          const partial = count !== null && count > 0 && !full;
          return (
            <span
              key={date}
              className={cn(
                "flex h-[34px] w-[38px] items-center justify-center rounded-[10px] text-[11px] font-bold",
                future && "border-text/20 text-muted border border-dashed",
                !future && count === 0 && "bg-zero text-muted",
                !future && full && "bg-ok text-bg",
                !future && partial && "bg-ok-4 text-muted",
              )}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
    </Screen>
  );
}
