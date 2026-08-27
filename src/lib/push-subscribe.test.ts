import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { subscribeToPush } = vi.hoisted(() => ({ subscribeToPush: vi.fn() }));
vi.mock("@/server/actions/push", () => ({ subscribeToPush }));

import { ensurePushSubscribed } from "./push-subscribe";

// "serviceWorker" in navigator / "PushManager" in window check *property
// presence*, not truthiness - so "absent" has to mean actually deleting the
// property, not defining it with value `undefined` (which would still make
// `"x" in obj` true).
function clearBrowserApis() {
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  delete (window as unknown as Record<string, unknown>).PushManager;
  delete (window as unknown as Record<string, unknown>).Notification;
}

describe("ensurePushSubscribed", () => {
  const originalVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  beforeEach(() => {
    subscribeToPush.mockReset();
    clearBrowserApis();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "dGVzdC1rZXk"; // base64url, no padding
  });

  afterEach(() => {
    if (originalVapidKey === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalVapidKey;
    clearBrowserApis();
  });

  function stubSupported() {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, "PushManager", { value: function () {}, configurable: true });
  }

  function stubNotification(permission: "granted" | "denied" | "default") {
    Object.defineProperty(window, "Notification", {
      value: { requestPermission: vi.fn().mockResolvedValue(permission) },
      configurable: true,
    });
  }

  it("reports unsupported when the browser has no PushManager/serviceWorker", async () => {
    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: false, reason: "unsupported" });
  });

  it("reports unconfigured when no VAPID public key is set", async () => {
    stubSupported();
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: false, reason: "unconfigured" });
  });

  it("reports denied when the user declines the permission prompt", async () => {
    stubSupported();
    stubNotification("denied");

    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: false, reason: "denied" });
  });

  it("subscribes and forwards the subscription on success", async () => {
    stubSupported();
    stubNotification("granted");
    subscribeToPush.mockResolvedValue({ ok: true });

    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/abc",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    };
    const register = vi.fn().mockResolvedValue({
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(subscription),
      },
    });
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });

    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: true });
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(subscribeToPush).toHaveBeenCalledWith({
      endpoint: "https://push.example/abc",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    });
  });

  it("reuses an existing subscription instead of creating a new one", async () => {
    stubSupported();
    stubNotification("granted");
    subscribeToPush.mockResolvedValue({ ok: true });

    const subscribe = vi.fn();
    const existing = {
      toJSON: () => ({
        endpoint: "https://push.example/existing",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn().mockResolvedValue({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(existing), subscribe },
        }),
      },
      configurable: true,
    });

    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: true });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("reports error when the resulting subscription is missing required fields", async () => {
    stubSupported();
    stubNotification("granted");

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({ toJSON: () => ({}) }),
            subscribe: vi.fn(),
          },
        }),
      },
      configurable: true,
    });

    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: false, reason: "error" });
    expect(subscribeToPush).not.toHaveBeenCalled();
  });

  it("reports error when registration throws", async () => {
    stubSupported();
    stubNotification("granted");
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn().mockRejectedValue(new Error("boom")) },
      configurable: true,
    });

    await expect(ensurePushSubscribed()).resolves.toEqual({ ok: false, reason: "error" });
  });
});
