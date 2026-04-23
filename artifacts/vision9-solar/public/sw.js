/* Vision9 Solar admin push service worker */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_e) {
      payload = { title: "Vision9 Solar", body: event.data.text() };
    }
  }
  const title = payload.title || "Vision9 Solar";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/admin" },
    badge: "/favicon.svg",
    icon: "/favicon.svg",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const target = new URL(targetPath, self.location.origin).href;
      for (const client of allClients) {
        if (client.url === target && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of allClients) {
        if ("navigate" in client) {
          await client.navigate(target).catch(() => undefined);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    })(),
  );
});
