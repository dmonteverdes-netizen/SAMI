import express from 'express';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  createAuthenticateToken,
  requirePermission,
  createOptionalSession
} from '../middleware/auth';
import { logger } from '../../core/services/logger';

const router = express.Router();

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionObj {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

export interface UserSubscription {
  userId: string;
  subscription: PushSubscriptionObj;
  device: string;
  subscribedAt: string;
}

export const activeSubscriptions: UserSubscription[] = [];

// VAPID keys setup
const keysDir = path.join(process.cwd(), 'data');
const keysPath = path.join(keysDir, 'vapid_keys.json');

let vapidPublicKey = '';
let vapidPrivateKey = '';

function getValidVapidSubject(): string {
  const envSubject = (process.env.VAPID_SUBJECT || '').trim();
  if (envSubject && (envSubject.startsWith('mailto:') || envSubject.startsWith('https://') || envSubject.startsWith('http://'))) {
    return envSubject;
  }
  return 'mailto:soporte@sami.pe';
}

export function initVapidKeys() {
  const vapidSubject = getValidVapidSubject();
  const envPub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();

  // 1. Env vars
  if (envPub && envPriv && !envPub.includes('•') && !envPriv.includes('•')) {
    try {
      webpush.setVapidDetails(vapidSubject, envPub, envPriv);
      vapidPublicKey = envPub;
      vapidPrivateKey = envPriv;
      logger.info('[VAPID] Keys loaded from environment');
      return;
    } catch {
      logger.warn('[VAPID] Invalid environment keys, falling back to persisted/generated');
    }
  }

  // 2. Persisted file
  if (fs.existsSync(keysPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
      if (saved.publicKey && saved.privateKey && !saved.publicKey.includes('•')) {
        webpush.setVapidDetails(vapidSubject, saved.publicKey, saved.privateKey);
        vapidPublicKey = saved.publicKey;
        vapidPrivateKey = saved.privateKey;
        logger.info('[VAPID] Keys loaded from data/vapid_keys.json');
        return;
      }
    } catch {
      logger.warn('[VAPID] Persisted file invalid, generating fresh keypair');
    }
  }

  // 3. Dynamic generation
  try {
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    const keys = webpush.generateVAPIDKeys();
    webpush.setVapidDetails(vapidSubject, keys.publicKey, keys.privateKey);
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    fs.writeFileSync(keysPath, JSON.stringify({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey }, null, 2), 'utf-8');
    logger.info('[VAPID] Generated and persisted fresh VAPID keys');
  } catch (err: any) {
    logger.error('[VAPID] Error generating keys:', {}, err);
  }
}

initVapidKeys();

/**
 * 1. GET /notifications/vapid-public-key & GET /notifications/vapid-key
 */
router.get('/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: vapidPublicKey
  });
});

router.get('/vapid-key', (req, res) => {
  res.json({
    success: true,
    publicKey: vapidPublicKey
  });
});

/**
 * 1b. GET /notifications/vapid-keys/status
 */
router.get('/vapid-keys/status', (req, res) => {
  const isCustomEnv = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const hasLocalJson = fs.existsSync(keysPath);
  res.json({
    publicKey: vapidPublicKey,
    persistence: isCustomEnv ? 'environment' : (hasLocalJson ? 'file' : 'ephemeral'),
    filePath: keysPath,
    clientsRegisteredCount: activeSubscriptions.length
  });
});

/**
 * 1c. POST /notifications/vapid-keys/regenerate
 */
router.post('/vapid-keys/regenerate', (req, res) => {
  try {
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;

    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    fs.writeFileSync(keysPath, JSON.stringify({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey }, null, 2), 'utf-8');

    webpush.setVapidDetails(
      getValidVapidSubject(),
      vapidPublicKey,
      vapidPrivateKey
    );

    logger.info('[SAMI Backend VAPID] Regenerated and saved fresh VAPID keys on-demand.');
    res.json({ 
      success: true, 
      publicKey: vapidPublicKey, 
      message: 'Llaves VAPID regeneradas exitosamente y guardadas persistentemente en data/vapid_keys.json.' 
    });
  } catch (err: any) {
    logger.error('[SAMI Backend VAPID] Failed on-demand key generation:', {}, err);
    res.status(500).json({ error: 'No se pudieron regenerar las llaves: ' + (err.message || err) });
  }
});

/**
 * 2. POST /notifications/subscribe
 */
router.post(
  '/subscribe',
  createOptionalSession(),
  (req, res) => {
    try {
      const { subscription, device } = req.body;
      const userId = req.user?.id || req.body.userId || 'anonymous-mype';

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'invalid_subscription', message: 'Suscripción Push inválida' });
      }

      // Check if endpoint already registered
      const existingIdx = activeSubscriptions.findIndex(s => s.subscription.endpoint === subscription.endpoint);
      const newSub: UserSubscription = {
        userId,
        subscription,
        device: device || 'Dispositivo Web',
        subscribedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        activeSubscriptions[existingIdx] = newSub;
      } else {
        activeSubscriptions.push(newSub);
      }

      logger.info(`[Notifications] Usuario ${userId} suscrito a notificaciones Push.`);

      res.json({
        success: true,
        message: 'Suscripción Push registrada exitosamente.',
        count: activeSubscriptions.length
      });
    } catch (err: any) {
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

/**
 * 2b. POST /notifications/verify
 */
router.post('/verify', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint de verificación requerido.' });
  }
  const exists = activeSubscriptions.some(
    (sub) => sub.subscription.endpoint === endpoint
  );
  res.json({ registered: exists });
});

/**
 * 2c. POST /notifications/unsubscribe
 */
router.post('/unsubscribe', (req, res) => {
  const { endpoint, userId } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint de desuscripción requerido.' });
  }

  const initialLen = activeSubscriptions.length;
  for (let i = activeSubscriptions.length - 1; i >= 0; i--) {
    if (activeSubscriptions[i].subscription.endpoint === endpoint) {
      activeSubscriptions.splice(i, 1);
    }
  }

  logger.info(`[SAMI Push] Desregistro exitoso para usuario "${userId || 'default'}". Antes: ${initialLen}, Después: ${activeSubscriptions.length}`);
  res.json({ success: true, count: activeSubscriptions.length });
});

/**
 * 2d. GET /notifications/subscriptions
 */
router.get('/subscriptions', (req, res) => {
  res.json({
    subscriptions: activeSubscriptions.map((sub) => ({
      userId: sub.userId,
      endpoint: sub.subscription.endpoint.length > 55 ? `${sub.subscription.endpoint.substring(0, 55)}...` : sub.subscription.endpoint,
      device: sub.device.length > 40 ? `${sub.device.substring(0, 40)}...` : sub.device,
      subscribedAt: sub.subscribedAt
    }))
  });
});

/**
 * 3. POST /notifications/send
 */
router.post(
  '/send',
  createAuthenticateToken(),
  requirePermission('NOTIFICATIONS_DISPATCH'),
  async (req, res) => {
    try {
      const { title, body, icon, data, targetUserId } = req.body;

      const payload = JSON.stringify({
        title: title || 'Notificación de SAMI',
        body: body || '',
        icon: icon || '/icons/icon-192.png',
        data: data || {}
      });

      const targets = targetUserId
        ? activeSubscriptions.filter(s => s.userId === targetUserId)
        : activeSubscriptions;

      const results = await Promise.allSettled(
        targets.map(t => webpush.sendNotification(t.subscription as any, payload))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;

      res.json({
        success: true,
        sent: successful,
        totalTargets: targets.length
      });
    } catch (err: any) {
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

export default router;
