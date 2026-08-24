import { NextResponse } from "next/server";
import {
  getReminderCandidates,
  getUsersWithUncheckedItemsToday,
} from "@/server/queries/nudge-candidates";
import {
  getPushSubscriptionsForUsers,
  deletePushSubscriptionByEndpoint,
} from "@/server/queries/push";
import { sendPush, pushConfigured } from "@/server/push/send";
import { localHour } from "@/lib/timezone";
import { withCronAuth } from "@/server/cron-auth";

const TARGET_HOUR = 20; // 8pm, in each recipient's own local time.

/**
 * Runs hourly rather than once a day at a fixed UTC time: every run, each
 * candidate's *own* local hour is checked against TARGET_HOUR, so someone
 * in Tokyo and someone in Denver each get nudged at their own 8pm, not
 * UTC 8pm for everyone. The hourly beat itself comes from an Upstash
 * QStash schedule calling this route directly (see README's "Notification
 * cron" section for how it's set up) - not Vercel's own Cron feature,
 * that's once-a-day-only on the Hobby plan, and not GitHub Actions either,
 * to leave that usage for CI. A candidate with no elected timezone yet
 * (see src/components/timezone-sync.tsx) falls back to matching on UTC
 * 8pm - still works, just not personalized until they get one.
 *
 * Known imprecision, accepted rather than engineered around: hourly
 * granularity means a half-hour-offset zone (India, Newfoundland, ...)
 * can occasionally fire up to ~30 minutes off from a clean 8:00, or in
 * rare cron-timing-drift cases skip/double an hour at the boundary. Fine
 * for "roughly evening," not worth a minute-level cron for.
 */
export const GET = withCronAuth(async () => {
  if (!pushConfigured) return NextResponse.json({ sent: 0, note: "push not configured" });

  const candidates = await getReminderCandidates();
  const dueNow = candidates.filter((c) => localHour(c.timezone) === TARGET_HOUR);
  if (dueNow.length === 0) return NextResponse.json({ candidates: candidates.length, sent: 0 });

  const toNudge = await getUsersWithUncheckedItemsToday(dueNow.map((c) => c.userId));
  if (toNudge.size === 0) {
    return NextResponse.json({ candidates: candidates.length, dueNow: dueNow.length, sent: 0 });
  }

  const subscriptions = await getPushSubscriptionsForUsers([...toNudge]);
  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPush(sub, {
        title: "Tickd",
        body: "You've still got items open today.",
        url: "/",
      });
      if (result.ok) sent++;
      else if ("expired" in result && result.expired) {
        await deletePushSubscriptionByEndpoint(sub.endpoint);
      }
    }),
  );

  return NextResponse.json({
    candidates: candidates.length,
    dueNow: dueNow.length,
    nudged: toNudge.size,
    sent,
  });
});
