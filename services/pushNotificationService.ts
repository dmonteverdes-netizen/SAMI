/**
 * SAMI Browser Push Notification Service
 */

const STORAGE_KEY = 'sami_notification_permission_preference';

/**
 * Registers the Service Worker
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[SAMI SW] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[SAMI SW] Registration failed:', error);
    return null;
  }
};

/**
 * Gets the raw browser Notification permission status
 */
export const getNotificationPermissionStatus = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Gets the persistent permission choice stored in localStorage
 */
export const getPersistentPermissionPreference = (): 'prompt' | 'granted' | 'denied' => {
  if (typeof window === 'undefined') return 'prompt';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'granted' || saved === 'denied' || saved === 'prompt') {
    return saved as 'granted' | 'denied' | 'prompt';
  }
  return 'prompt';
};

/**
 * Saves the persistent permission preference to localStorage
 */
export const setPersistentPermissionPreference = (pref: 'granted' | 'denied' | 'prompt'): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, pref);
  }
};

/**
 * Requests the push notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[SAMI Notification] API de notificaciones no soportada.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    setPersistentPermissionPreference(permission === 'default' ? 'prompt' : permission);
    return permission;
  } catch (error) {
    console.error('[SAMI Notification] Error requesting permission:', error);
    return 'denied';
  }
};

/**
 * Displays a push notification using either the Service Worker or fallback standard Notification API.
 */
export const showLocalPushNotification = async (title: string, body: string, data?: any): Promise<void> => {
  // Always dispatch a custom DOM event for in-app toast notifications (ideal for iframe sandbox fallback)
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('sami-toast', {
      detail: { title, body, data }
    });
    window.dispatchEvent(event);
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  
  const permission = Notification.permission;
  if (permission !== 'granted') {
    console.warn('[SAMI Notification] Intento de mostrar notificación sin permisos:', title);
    return;
  }

  // Use Service Worker if active and supportive of showNotification
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        registration.showNotification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>',
          data: data || {},
          tag: 'sami-instant'
        });
        return;
      }
    }
  } catch (err) {
    console.error('[SAMI Notification] Error utilizing SW to show notification:', err);
  }

  // Standard fallback
  try {
    const notification = new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%234F46E5"/><text y="155" x="30" font-size="140">🛡️</text></svg>'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.error('[SAMI Notification] Fallback notification failed:', err);
  }
};

/**
 * Utility helper to convert public VAPID key from URL-safe base64 string to Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the current browser to Push notifications using VAPID keys fetched from the server,
 * then sends the details to the backend `/api/v1/notifications/subscribe`.
 */
export const subscribeUserToPush = async (userId: string = 'default'): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push Service] Push API or Service Workers not fully supported in this browser.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[Push Service] No active or ready Service Worker found.');
      return false;
    }

    // 1. Fetch public VAPID key from backend
    const keyRes = await fetch('/api/v1/notifications/vapid-key');
    if (!keyRes.ok) {
      throw new Error(`Failed to fetch VAPID key, status: ${keyRes.status}`);
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      console.warn('[Push Service] Backend did not return a valid public VAPID key.');
      return false;
    }

    // 2. Unsubscribe any existing subscription to ensure fresh alignment
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }

    // Convert and request subscription
    const convertedKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    console.log('[Push Service] Created push subscription:', subscription);

    // 3. Register the subscription with our backend
    const subRes = await fetch('/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        subscription,
        device: navigator.userAgent || 'Web Browser'
      })
    });

    if (!subRes.ok) {
      throw new Error(`Server rejected subscription registration: ${subRes.status}`);
    }

    console.log('[Push Service] Subscription registered successfully on backend.');
    return true;
  } catch (error) {
    console.error('[Push Service] Subscribing process failed:', error);
    return false;
  }
};

/**
 * Unsubscribes client from push notifications and informs the backend to discard the token.
 */
export const unsubscribeUserFromPush = async (userId: string = 'default'): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Inform server to remove the subscription
      await fetch('/api/v1/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint, userId })
      });

      console.log('[Push Service] Successfully unsubscribed user on server and client.');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Push Service] Unsubscribing process failed:', error);
    return false;
  }
};

/**
 * Verifies if the current browser subscription exists and matches the backend configuration.
 * If unregistered, or a connection error occurs, tries to perform a silent re-subscription.
 */
export const verifyAndSyncSubscription = async (userId: string = 'default'): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  // Only attempt if permission is already granted
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[Push Service Monitor] No Service Worker ready.');
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[Push Service Monitor] No subscription found in browser, but permission is granted. Attempting silent subscribe...');
      return await subscribeUserToPush(userId);
    }

    // Call verify endpoint on backend
    const res = await fetch('/api/v1/notifications/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    if (!res.ok) {
      throw new Error(`Verification endpoint responded with status: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.registered) {
      console.log('[Push Service Monitor] Subscription is active and verified on the server.');
      return true;
    } else {
      console.warn('[Push Service Monitor] Subscription mismatch or missing in backend. Initiating silent re-subscription...');
      return await subscribeUserToPush(userId);
    }
  } catch (error) {
    console.error('[Push Service Monitor] Verification check failed. Attempting recovery re-subscription...', error);
    try {
      return await subscribeUserToPush(userId);
    } catch (subErr) {
      console.error('[Push Service Monitor] Silent re-subscription fallback failed:', subErr);
      return false;
    }
  }
};

/**
 * Starts a periodic interval to verify local subscription status against the backend.
 * Returns an unsubscribe/stop function.
 */
export const startPeriodicSubscriptionCheck = (userId: string = 'default', intervalMs: number = 60000): () => void => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Perform initial verification check immediately
  verifyAndSyncSubscription(userId).catch(err => {
    console.error('[Push Service Monitor] Initial subscription check failed:', err);
  });

  const intervalId = setInterval(() => {
    verifyAndSyncSubscription(userId).catch(err => {
      console.error('[Push Service Monitor] Periodic subscription check encountered error:', err);
    });
  }, intervalMs);

  console.log(`[Push Service Monitor] Scheduled verification interval every ${intervalMs}ms for user "${userId}".`);

  return () => {
    clearInterval(intervalId);
    console.log(`[Push Service Monitor] Cleared verification interval for user "${userId}".`);
  };
};

