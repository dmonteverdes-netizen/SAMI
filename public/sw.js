// SAMI Service Worker — PWA & Offline Support (WCAG 2.2 & Resiliencia MYPE)
const CACHE_NAME = 'sami-static-v2';

// Recursos esenciales del esqueleto de la aplicación
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/icon-512.svg'
];

/**
 * PENDIENTE ARQUITECTURA / DECISIÓN DE NEGOCIO:
 * Cola de ventas y comprobantes registrados sin conexión (Offline Sync) para sincronizar 
 * automáticamente al recuperar la señal.
 * 
 * Requisitos técnicos y de negocio pendientes:
 * 1. Implementación de base de datos local en IndexedDB con soporte transaccional.
 * 2. Definición comercial y regulatoria sobre el manejo de correlativos de comprobantes de pago 
 *    electrónicos (CPE SUNAT): acordar con el PSE (Proveedor de Servicios Electrónicos) 
 *    si se reservan bloques de correlativos locales o si se asignan en backend al reanudar la conexión, 
 *    previniendo saltos en la numeración correlativa fiscal o duplicidades.
 */

// 1. Instalación y Precaché de activos base
self.addEventListener('install', (event) => {
  console.log('[SAMI SW] Instalando Service Worker y precacheando esqueleto...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SAMI SW] Advertencia al precachear algunos recursos:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación y limpieza de cachés obsoletas
self.addEventListener('activate', (event) => {
  console.log('[SAMI SW] Activando Service Worker y depurando cachés antiguas...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name.startsWith('sami-')) {
            console.log('[SAMI SW] Eliminando versión de caché antigua:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Manejador de Peticiones Fetch
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Regla 1: Solo peticiones GET y solo del mismo origen
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Regla 2: NINGUNA respuesta de /api/ se guarda en caché, jamás.
  // Sin conexión devuelve un 503 JSON reconocible en español.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'offline',
            offline: true,
            message: 'Sin conexión a internet. No fue posible sincronizar los datos con el servidor de SAMI en este momento.'
          }),
          {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
          }
        );
      })
    );
    return;
  }

  // Regla 3: Navegación de páginas (HTML) -> Primero la red, respaldo al esqueleto en caché
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Regla 4: Estáticos versionados (JS, CSS, imágenes, fuentes, iconos)
  // Caché primero con actualización en segundo plano
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y no estaba en caché, fallback silencioso
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Notificaciones Push Web
self.addEventListener('push', (event) => {
  console.log('[SAMI SW] Notificación Push recibida.');
  
  let data = {
    title: 'SAMI Alerta',
    body: 'Tienes una nueva actualización en tu panel de SAMI.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
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
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
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

// 5. Clicks en Notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// 6. Mensajes desde el hilo principal de la aplicación
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, data } = event.data;
    const options = {
      body: body || '',
      icon: icon || '/icons/icon-192.png',
      badge: badge || '/icons/icon-192.png',
      tag: 'sami-local-notification',
      data: data || {},
      vibrate: [100, 50, 100]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );

    if (event.source) {
      event.source.postMessage({
        type: 'NOTIFICATION_ACK',
        title: title,
        timestamp: new Date().toISOString()
      });
    }
  } else if (event.data && event.data.type === 'PING') {
    if (event.source) {
      event.source.postMessage({
        type: 'PONG',
        payload: event.data.payload || '',
        timestamp: new Date().toISOString()
      });
    }
  }
});
