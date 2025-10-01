/* public/push-sw.js — push/notification handlers imported by next-pwa generated SW */
self.addEventListener('push', (event) => {
  try { console.log('[p4h-sw] push event'); } catch {}
  let data = {};
  try {
    data = event.data ? (event.data.json ? event.data.json() : JSON.parse(event.data.text())) : {};
  } catch { /* ignore */ }

  const title = data.title || 'Plan4Host';
  const body = data.body || 'You have a new notification.';
  const icon = data.icon || '/icons/icon-192.png';
  const badge = data.badge || '/icons/icon-192.png';
  const tag = data.tag || 'p4h';
  const url = data.url || '/app/guest';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/app/guest';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = allClients.find((c) => (c.url || '').includes(url));
      if (client) {
        client.focus();
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
