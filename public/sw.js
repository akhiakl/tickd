// Minimal push service worker: it only ever needs to (1) show a
// notification when a push arrives, and (2) focus/open the app when the
// user taps it. No offline caching, no fetch interception - this app
// isn't a full PWA, it just needs push delivery.

self.addEventListener("push", (event) => {
  let payload = { title: "Tickd", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // A malformed/empty payload still shows a generic notification rather
    // than silently dropping it.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
