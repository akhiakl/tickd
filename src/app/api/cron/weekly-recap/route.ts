import { NextResponse } from "next/server";
import { getWeeklyRecapCandidates, getWeeklyRecapCounts } from "@/server/queries/nudge-candidates";
import {
  getPushSubscriptionsForUsers,
  deletePushSubscriptionByEndpoint,
} from "@/server/queries/push";
import { sendPush, pushConfigured } from "@/server/push/send";
import { localHour, localWeekday } from "@/lib/timezone";

const TARGET_WEEKDAY = "Sun";
const TARGET_HOUR = 18; // 6pm, in each recipient's own local time.

/**
 * Same hourly-cron, per-recipient-local-time approach as
 * src/app/api/cron/evening-nudge/route.ts - see that file's comment for
 * the reasoning and the known half-hour-zone imprecision. This one also
 * gates on local weekday, not just hour, so it only ever actually sends
 * on each person's own Sunday evening even though the schedule itself
 * runs every hour, every day.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!pushConfigured) return NextResponse.json({ sent: 0, note: "push not configured" });

  const candidates = await getWeeklyRecapCandidates();
  const dueNow = candidates.filter(
    (c) => localWeekday(c.timezone) === TARGET_WEEKDAY && localHour(c.timezone) === TARGET_HOUR,
  );
  if (dueNow.length === 0) return NextResponse.json({ candidates: candidates.length, sent: 0 });

  const counts = await getWeeklyRecapCounts(dueNow.map((c) => c.userId));
  const subscriptions = await getPushSubscriptionsForUsers(dueNow.map((c) => c.userId));

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      const count = counts.get(sub.userId) ?? 0;
      const result = await sendPush(sub, {
        title: "Tickd",
        body:
          count > 0
            ? `You checked off ${count} item${count === 1 ? "" : "s"} this week. Keep it up.`
            : "No checks this week - your list is still there whenever you're ready.",
        url: "/",
      });
      if (result.ok) sent++;
      else if ("expired" in result && result.expired) {
        await deletePushSubscriptionByEndpoint(sub.endpoint);
      }
    }),
  );

  return NextResponse.json({ candidates: candidates.length, dueNow: dueNow.length, sent });
}
