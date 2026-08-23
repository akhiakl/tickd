"use client";

import { subscribeToPush } from "@/server/actions/push";

/**
 * Client-side push subscribe flow, called from a toggle's own click
 * handler (a genuine user gesture - `Notification.requestPermission()`
 * silently no-ops without one in most browsers). One browser subscription
 * covers both notification preferences (evening nudge, weekly recap) -
 * which content actually gets sent is decided server-side by the cron
 * routes reading those prefs, not by subscribing twice.
 */

/** VAPID keys are base64url; `pushManager.subscribe` wants a raw byte
 * array for `applicationServerKey`. Standard conversion, no library for
 * something this small. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export type EnsureSubscribedResult =
  { ok: true } | { ok: false; reason: "unsupported" | "denied" | "unconfigured" | "error" };

/**
 * Idempotent: safe to call every time a notification preference is
 * switched on, whether or not this device already has a subscription
 * (the server action upserts by endpoint either way).
 */
export async function ensurePushSubscribed(): Promise<EnsureSubscribedResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return { ok: false, reason: "unsupported" };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return { ok: false, reason: "unconfigured" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: pushManager.subscribe's DOM typings want an
        // ArrayBufferView<ArrayBuffer> specifically, but Uint8Array.from
        // (below) is typed with the broader ArrayBufferLike - it's a real
        // Uint8Array over a real ArrayBuffer at runtime either way.
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "error" };
    }
    await subscribeToPush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
