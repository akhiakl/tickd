"use server";

import { requireUserId } from "@/server/auth/require-user";
import { requireMembership } from "@/server/actions/checklist";
import { getPushSubscriptionsForUsers } from "@/server/queries/push";
import { getUserById } from "@/server/queries/users";
import { sendPush, pushConfigured } from "@/server/push/send";
import { rateLimit } from "@/server/rate-limit";

const NUDGE_MESSAGES = [
  (name: string) => `${name} is giving you the look 👀`,
  (name: string) => `${name} noticed your list is still sitting there`,
  (name: string) => `${name} says: any day now`,
  (name: string) => `A wild nudge from ${name} appeared`,
  (name: string) => `${name} thinks you forgot something`,
];

// One poke per (poker, target) pair per hour - playful, not a way to spam
// someone's lock screen. Keyed on both ids so it doesn't cap how many
// *different* teammates one person can poke in an hour, only repeats at
// the same one.
const NUDGE_LIMIT = 1;
const NUDGE_WINDOW_SECONDS = 60 * 60;

export type PokeResult = { ok: true; delivered: boolean } | { ok: false; error: string };

/**
 * A lighthearted poke, riding the same push pipe as the evening-nudge/
 * weekly-recap crons (src/server/push/send.ts) rather than a new delivery
 * mechanism. `delivered: false` on success means the poke was allowed and
 * "sent" in the sense that there was nothing left to block it, but the
 * target has no push subscription to actually receive it on - not an
 * error, just nothing to deliver to.
 */
export async function pokeMember(groupId: string, targetUserId: string): Promise<PokeResult> {
  const userId = await requireUserId();
  if (userId === targetUserId) return { ok: false, error: "You can't poke yourself." };
  await requireMembership(groupId, userId);
  await requireMembership(groupId, targetUserId);

  const allowed = await rateLimit(
    `nudge:${userId}:${targetUserId}`,
    NUDGE_LIMIT,
    NUDGE_WINDOW_SECONDS,
  );
  if (!allowed) return { ok: false, error: "Already poked them recently - give it a bit." };

  if (!pushConfigured) return { ok: true, delivered: false };

  const [poker, subscriptions] = await Promise.all([
    getUserById(userId),
    getPushSubscriptionsForUsers([targetUserId]),
  ]);
  if (subscriptions.length === 0) return { ok: true, delivered: false };

  const message = NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)];
  const body = message(poker?.name ?? "Someone");

  const results = await Promise.all(
    subscriptions.map((sub) => sendPush(sub, { title: "Tickd", body, url: `/g/${groupId}` })),
  );
  return { ok: true, delivered: results.some((r) => r.ok) };
}
