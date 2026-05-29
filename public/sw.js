// SAMI Notification Service Worker
self.addEventListener('install', (event) => {
  console.log('[SAMI SW] Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SAMI SW] Service Worker activated.');
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SAMI SW] Push notification received.');
  
  let data = {
    title: 'SAMI Alerta',
    body: 'Tienes una nueva actualización en tu panel de SAMI.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>',
    tag: 'sami-notification',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Ver en SAMI' },
      { action: 'close', title: 'Cerrar' }
    ],
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle clicks on notification actions or body
self.addEventListener('notificationclick', (event) => {
  console.log('[SAMI SW] Notification clicked:', event.notification.tag, 'Action:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the application window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Support direct messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    console.log('[SAMI SW] Showing notification requested by app:', event.data.title);
    const { title, body, icon, badge, data } = event.data;
    const options = {
      body: body || '',
      icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>',
      badge: badge || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>',
      tag: 'sami-local-notification',
      data: data || {},
      vibrate: [100, 50, 100]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );

    // Send acknowledgement back to the sender client
    if (event.source) {
      event.source.postMessage({
        type: 'NOTIFICATION_ACK',
        title: title,
        timestamp: new Date().toISOString()
      });
    }
  } else if (event.data && event.data.type === 'PING') {
    console.log('[SAMI SW] Ping received, replying with PONG.');
    if (event.source) {
      event.source.postMessage({
        type: 'PONG',
        payload: event.data.payload || '',
        timestamp: new Date().toISOString()
      });
    }
  }
});
