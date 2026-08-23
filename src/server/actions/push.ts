"use server";

import { requireUserId } from "@/server/auth/require-user";
import {
  savePushSubscription,
  deletePushSubscription,
  type PushSubscriptionInput,
} from "@/server/queries/push";
import type { ActionResult } from "./result";

export async function subscribeToPush(subscription: PushSubscriptionInput): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { ok: false, error: "That subscription looks incomplete." };
  }

  await savePushSubscription(userId, subscription);
  return { ok: true };
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await deletePushSubscription(userId, endpoint);
  return { ok: true };
}
