import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGroupSnapshot } from "@/server/queries/group-snapshot";
import { currentStreakWithToday, dateRange } from "@/lib/challenge-stats";
import { ShareCard, SHARE_CARD_SIZE } from "@/server/share-card";

// Needs a real TCP connection to Postgres (via the `postgres` driver), which
// the edge runtime doesn't support. No `runtime = "nodejs"` export needed
// (or allowed) under Cache Components - it requires the Node.js runtime
// everywhere, so this is already guaranteed.
export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const snapshot = await getGroupSnapshot(groupId, session.user.id);
  if (!snapshot) return new NextResponse("Not found", { status: 404 });

  const me = snapshot.members.find((m) => m.isMe);
  if (!me) return new NextResponse("Not found", { status: 404 });

  const dates = dateRange(snapshot.startDate, snapshot.dayIndex);
  const counts = dates.map((date) => me.countsByDate[date] ?? 0);
  const streak = currentStreakWithToday(counts);
  const doneToday = me.countsByDate[snapshot.today] ?? 0;
  const checkedItemIds = new Set(me.itemsByDate[snapshot.today] ?? []);

  return new ImageResponse(
    <ShareCard
      name={me.name}
      color={me.color}
      avatarSeed={me.avatarSeed}
      dayIndex={snapshot.dayIndex}
      durationDays={snapshot.durationDays}
      doneToday={doneToday}
      itemCount={snapshot.items.length}
      streak={streak}
      items={snapshot.items}
      checkedItemIds={checkedItemIds}
    />,
    SHARE_CARD_SIZE,
  );
}
