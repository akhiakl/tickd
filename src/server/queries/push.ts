import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { pushSubscriptions } from "@/server/db/schema";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Upserts by `endpoint`: re-subscribing the same device (permission
 * re-granted, keys rotated by the browser) replaces the old row rather
 * than accumulating duplicates. */
export async function savePushSubscription(userId: string, sub: PushSubscriptionInput) {
  await db
    .insert(pushSubscriptions)
    .values({
      id: crypto.randomUUID(),
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

/** Scoped to the caller's own subscriptions - `endpoint` isn't secret
 * enough to trust as sole authorization for a delete. */
export async function deletePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  const row = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.userId, userId),
  });
  return !!row;
}

/** Used by the cron routes to fan a notification out to every device a
 * user has subscribed from. */
export async function getPushSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db.query.pushSubscriptions.findMany({
    where: inArray(pushSubscriptions.userId, userIds),
  });
}

/** Called when a send comes back 404/410 (the browser or OS has
 * definitively dropped the subscription) - keeping a dead row around just
 * means paying to fail against it again next time. */
export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
