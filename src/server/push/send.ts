import "server-only";
import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const configured = !!(publicKey && privateKey);

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@tickd.app",
    publicKey,
    privateKey,
  );
}

export type PushPayload = { title: string; body: string; url?: string };

export type SendPushResult =
  { ok: true } | { ok: false; expired: boolean } | { ok: false; unconfigured: true };

/**
 * Sends one push message to one subscription. VAPID keys missing (not set
 * up yet, or a local dev environment that never configured them) is a
 * distinct, expected outcome, not an error to throw - callers (the cron
 * routes) treat it as "nothing to do" rather than crashing the whole run.
 */
export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!configured) return { ok: false, unconfigured: true };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    // 404/410 means the push service has permanently dropped this
    // subscription (uninstalled, permission revoked, browser data
    // cleared) - the caller should delete it. Anything else (a transient
    // 5xx, a network error) isn't a reason to delete a subscription that
    // might work again next time.
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    return { ok: false, expired };
  }
}

export const pushConfigured = configured;
