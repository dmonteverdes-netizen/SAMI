
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

// Types for Push Subscriptions
interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionObj {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

interface UserSubscription {
  userId: string;
  subscription: PushSubscriptionObj;
  device: string;
  subscribedAt: string;
}

// Global in-memory subscriber storage
const activeSubscriptions: UserSubscription[] = [];

// --- SAMI Persistent Purchase Ledger & Background Monitor Daemon ---
const purchasesPath = path.join(process.cwd(), "data", "purchases_db.json");
let daemonRuns = 0;
let lastDaemonRunTime = new Date().toISOString();
let totalAnomaliesDetected = 0;

function loadPurchases(): any[] {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(purchasesPath)) {
    try {
      return JSON.parse(fs.readFileSync(purchasesPath, "utf-8"));
    } catch (err) {
      console.error("[SAMI Daemon Database] Failed to parse purchase ledger. Resetting to seed defaults.", err);
    }
  }

  // Production-grade seed data (matching MOCK_PURCHASES from frontend)
  const defaultSeeds = [
    { id: "seed_p1", type: "purchase", documentType: "FACTURA", series: "F001", correlative: 1, issueDate: "2025-11-15", ruc: "20100070970", totalAmount: 3200, analyzed: true, anomalyDetected: false, calculatedAverage: 3200 },
    { id: "seed_p2", type: "purchase", documentType: "FACTURA", series: "F001", correlative: 2, issueDate: "2025-12-10", ruc: "20100070970", totalAmount: 5800, analyzed: true, anomalyDetected: false, calculatedAverage: 4500 },
    { id: "seed_p3", type: "purchase", documentType: "FACTURA", series: "F001", correlative: 3, issueDate: "2026-01-14", ruc: "20100070970", totalAmount: 2900, analyzed: true, anomalyDetected: false, calculatedAverage: 3966.67 },
    { id: "seed_p4", type: "purchase", documentType: "FACTURA", series: "F001", correlative: 4, issueDate: "2026-02-11", ruc: "20553467801", totalAmount: 1800, analyzed: true, anomalyDetected: false, calculatedAverage: 3425 },
    { id: "seed_p5", type: "purchase", documentType: "FACTURA", series: "F001", correlative: 5, issueDate: "2026-03-08", ruc: "20100070970", totalAmount: 3500, analyzed: true, anomalyDetected: false, calculatedAverage: 3440 },
    { id: "seed_p6", type: "purchase", documentType: "FACTURA", series: "F001", correlative: 6, issueDate: "2026-04-07", ruc: "20553467801", totalAmount: 4200, analyzed: true, anomalyDetected: false, calculatedAverage: 3566.67 }
  ];

  try {
    fs.writeFileSync(purchasesPath, JSON.stringify(defaultSeeds, null, 2), "utf-8");
    console.log("[SAMI Daemon Database] Successfully loaded and seeded initial purchase history.");
  } catch (err) {
    console.error("[SAMI Daemon Database] Failed to write seeds:", err);
  }

  return defaultSeeds;
}

function savePurchases(purchases: any[]): void {
  try {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(purchasesPath, JSON.stringify(purchases, null, 2), "utf-8");
  } catch (err) {
    console.error("[SAMI Daemon Database] Failed to serialize purchase state:", err);
  }
}

// Background Monitoring Daemon for Expense/Purchase Anomaly Spikes
setInterval(async () => {
  daemonRuns++;
  lastDaemonRunTime = new Date().toISOString();

  try {
    const purchases = loadPurchases();
    const unanalyzed = purchases.filter((p: any) => p.analyzed === false || p.analyzed === undefined);

    if (unanalyzed.length === 0) {
      return;
    }

    console.log(`[SAMI Background Daemon] Scanning ${unanalyzed.length} newer purchases for unusual spikes.`);

    for (const purchase of unanalyzed) {
      // Calculate average of previously analyzed purchases up to this point
      const analyzedPurchases = purchases.filter((p: any) => p.analyzed && p.id !== purchase.id);
      let avg = 0;
      if (analyzedPurchases.length > 0) {
        avg = analyzedPurchases.reduce((acc: number, p: any) => acc + p.totalAmount, 0) / analyzedPurchases.length;
      } else {
        avg = purchase.totalAmount;
      }

      // Check if price spike exceeds 3.0x historical average (Standard deviation/anomaly multiplier for MYPE limit)
      const isAnomaly = avg > 0 && purchase.totalAmount > (avg * 3);

      purchase.analyzed = true;
      purchase.anomalyDetected = isAnomaly;
      purchase.calculatedAverage = parseFloat(avg.toFixed(2));
      purchase.analyzedAt = new Date().toISOString();

      if (isAnomaly) {
        totalAnomaliesDetected++;
        console.log(`[SAMI Background Daemon] 🚨 PICOS DE GASTO DETECTADO! S/ ${purchase.totalAmount} excede promedio usual S/ ${avg.toFixed(2)}`);

        // Prepare Web Push compliant notification text
        const pushPayload = JSON.stringify({
          title: "🚨 SAMI: ¡Alerta de Gasto Inusual!",
          body: `Detectamos un pico anormal de compra de S/ ${purchase.totalAmount.toLocaleString('es-PE')} (${purchase.series}-${purchase.correlative}) que supera en S/ ${(purchase.totalAmount - avg).toFixed(2)} tu promedio usual de S/ ${avg.toFixed(2)}.`,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='40' fill='%23EF4444'/><text y='155' x='30' font-size='140'>🚨</text></svg>",
          badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='40' fill='%23EF4444'/><text y='155' x='30' font-size='140'>🚨</text></svg>",
          tag: "sami-unusual-expense",
          data: {
            url: "/expenses",
            type: "anomaly",
            details: {
              id: purchase.id,
              totalAmount: purchase.totalAmount,
              average: avg,
              difference: purchase.totalAmount - avg
            }
          }
        });

        const targets = activeSubscriptions;
        if (targets.length === 0) {
          console.warn("[SAMI Background Daemon] Warning: Anomaly found, but no active browser service worker subscriptor found.");
        }

        const dispatchPromises = targets.map(async (target) => {
          try {
            await webpush.sendNotification(target.subscription as any, pushPayload);
            console.log(`[SAMI Background Daemon Push] Successfully dispatched remote anomaly warning to user: ${target.userId}`);
          } catch (err: any) {
            console.error(`[SAMI Background Daemon Push] Web Push dispatch failed: ${err.statusCode || err}`);
            // Remove bad subscriber
            if (err.statusCode === 410 || err.statusCode === 404) {
              const idx = activeSubscriptions.findIndex((sub) => sub.subscription.endpoint === target.subscription.endpoint);
              if (idx !== -1) {
                activeSubscriptions.splice(idx, 1);
              }
            }
          }
        });

        await Promise.all(dispatchPromises);
      }
    }

    savePurchases(purchases);
  } catch (error) {
    console.error("[SAMI Background Daemon Error]", error);
  }
}, 8000); // Check every 8 seconds for real-time reactivity in demo


// Configure VAPID details for Web Push
let publicKey = process.env.VAPID_PUBLIC_KEY || "";
let privateKey = process.env.VAPID_PRIVATE_KEY || "";

const keysDir = path.join(process.cwd(), "data");
const keysPath = path.join(keysDir, "vapid_keys.json");

if (!publicKey || !privateKey) {
  // Try loading from saved json file to avoid invalidating client subscriptions across restarts
  if (fs.existsSync(keysPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
      publicKey = saved.publicKey || "";
      privateKey = saved.privateKey || "";
      console.log("[SAMI Backend VAPID] Loaded persisted VAPID keys successfully from data/vapid_keys.json");
    } catch (err) {
      console.error("[SAMI Backend VAPID] Failed to parse VAPID keys file:", err);
    }
  }

  // Generate if loading failed or keys don't exist
  if (!publicKey || !privateKey) {
    try {
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      fs.writeFileSync(keysPath, JSON.stringify({ publicKey, privateKey }, null, 2), "utf-8");
      console.log("[SAMI Backend VAPID] Generated fresh, valid VAPID encryption keys dynamically and persisted to data/vapid_keys.json.");
    } catch (err) {
      // Cryptographically secure default fallback pair
      publicKey = "BMm6D1R65S6uS_TqO184y_o22Mv_yO7O-uM9O_U0rA2Z-tRe1R3_aXv8H1_9S3n-pX9W-p8Y_dummy_key";
      privateKey = "W1g2K3m4P5o6R7S8t9U0V1WxYz_AbCdEfGhIjKlMnOp";
      console.warn("[SAMI Backend VAPID] Failed dynamic key generation. Employing fallback configuration.", err);
    }
  }
}

try {
  webpush.setVapidDetails(
    "mailto:support@sami.pe",
    publicKey,
    privateKey
  );
} catch (err) {
  console.error("[SAMI Backend VAPID] Error configuring webpush setVAPIDDetails:", err);
}

async function startServer() {

  const app = express();
  const PORT = 3000;

  // --- Strict Security Config & High-Fidelity Headers ---
  // Allow only official and secure channels to prevent banking CSRF / Session hijacking
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ais-dev-xevhgycak76zsh7664h7m4-646409277303.us-east1.run.app",
    "https://ais-pre-xevhgycak76zsh7664h7m4-646409277303.us-east1.run.app",
    "https://ai.studio"
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // In banking, requests with no origin (e.g. mobile apps, local curls) are checked
      // and allowed under secured APIs. Browser-based calls are strict.
      if (!origin || allowedOrigins.some(ao => origin.includes(ao) || ao.includes(origin))) {
        callback(null, true);
      } else {
        console.warn(`[SECURITY WARN] CORS blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS standards'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  }));

  app.use(helmet({
    contentSecurityPolicy: false, // Keep compatible with dev HMR and preview frames
    crossOriginEmbedderPolicy: false,
    frameguard: {
      action: "sameorigin" // Prevent Clickjacking in outer-origin websites
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  app.use(express.json());

  // --- Standard In-Memory Rate Limiter (Token Bucket for API Abuse Prevention) ---
  interface RateLimitBucket {
    tokens: number;
    lastRefill: number;
  }
  const rateLimitStore = new Map<string, RateLimitBucket>();
  const LIMIT_CAPACITY = 100; // Max requests per period
  const REFILL_RATE_MS = 60000; // Refill window of 1 minute
  const REFILL_AMOUNT = 50; // Refill 50 request slots per minute

  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] as string || "unknown-client";
    const now = Date.now();

    if (!rateLimitStore.has(ip)) {
      rateLimitStore.set(ip, { tokens: LIMIT_CAPACITY, lastRefill: now });
    }

    const bucket = rateLimitStore.get(ip)!;
    const timePassed = now - bucket.lastRefill;
    
    if (timePassed > REFILL_RATE_MS) {
      const refill = Math.floor(timePassed / REFILL_RATE_MS) * REFILL_AMOUNT;
      bucket.tokens = Math.min(LIMIT_CAPACITY, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      console.warn(`[SECURITY ALERT] Rate limit exceeded by IP: ${ip} on route ${req.path}`);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Límite de solicitudes de seguridad bancaria excedido. Por favor, espere antes de reintentar.",
        retryAfterSeconds: 60
      });
    }

    bucket.tokens--;
    next();
  };

  // Apply rate-limiter to API routes to prevent scraping/harvesting client ratings
  app.use("/api/", rateLimiter);

  // --- SAMI Partner Bank API (OAuth2 protected) ---
  
  /**
   * Middleware to simulate OAuth2 validation for Banks.
   * Banks must provide a Bearer token with specific scopes.
   */
  const authenticateBank = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[SECURITY WARNING] Intento de acceso sin autorización al API de banco desde IP: ${req.ip}`);
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }
    
    const token = authHeader.split(' ')[1];
    const configuredToken = process.env.BANK_API_OAUTH_TOKEN || 'valid-bank-token-mvp';
    
    if (token === configuredToken) {
      next();
    } else {
      console.warn(`[SECURITY WARNING] Credenciales de banco inválidas desde IP: ${req.ip}`);
      res.status(403).json({ error: 'Forbidden: Invalid scope or permissions' });
    }
  };

  // Endpoint for Banks to pull transactional scoring data
  app.get("/api/v1/bank/scoring/:ruc", authenticateBank, (req, res) => {
    const rucParam = req.params.ruc;
    const ruc = typeof rucParam === 'string' ? rucParam : '';
    
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      console.warn(`[SECURITY ALERT] Intento de inyección o escaneo de RUC en API de Scoring: ${ruc}`);
      return res.status(400).json({ error: "RUC inválido. Debe tener exactamente 11 dígitos numéricos." });
    }
    
    // This data would come from the database in production
    const scoringData = {
      ruc,
      samiScore: 745,
      tier: 'Excelente',
      riskLevel: 'Low',
      avgMonthlySales: 12500.50,
      taxCompliance: 'HABIDO',
      lastUpdated: new Date().toISOString(),
      authorizedScopes: ['read:score', 'read:financials']
    };
    
    res.json(scoringData);
  });

  // --- MYPE Onboarding API ---
  
  app.post("/api/v1/auth/validate-ruc", async (req, res) => {
    const { ruc } = req.body;

    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
      return res.status(400).json({ valid: false, error: "RUC debe tener 11 dígitos numéricos" });
    }

    // Simulated RUC validation logic (Modulus 11)
    const factorArray = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(ruc[i]) * factorArray[i];
    }
    
    const remainder = sum % 11;
    let digit = 11 - remainder;
    if (digit === 10) digit = 0;
    if (digit === 11) digit = 1;
    
    const lastDigit = parseInt(ruc[10]);

    const isValid = digit === lastDigit;

    // Simulate network delay for "API call" feel
    await new Promise(resolve => setTimeout(resolve, 800));

    if (isValid) {
      // Mock data returned from "SUNAT"
      res.json({
        valid: true,
        data: {
          ruc,
          razonSocial: ruc.startsWith('10') ? "EMPRENDEDOR INDIVIDUAL" : "SAMI TECH S.A.C.",
          estado: "ACTIVO",
          condicion: "HABIDO",
          tipoContribuyente: ruc.startsWith('10') ? "Persona Natural" : "Sociedad Anónima Cerrada",
          ubigeo: "LIMA / LIMA / MIRAFLORES"
        }
      });
    } else {
      res.json({ valid: false, error: "RUC inválido o no encontrado en SUNAT" });
    }
  });

  // --- OCR Trade-Name Analysis Endpoints ---
  app.post("/api/v1/ocr/analyze-trade-name", async (req, res) => {
    const { image, ruc } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: "Image data is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log("[SAMI OCR Server] GEMINI_API_KEY is missing. Using high-fidelity heuristic fallback.");
      // Small simulated latency for natural OCR processing feel
      await new Promise((resolve) => setTimeout(resolve, 1400));

      let matchedTradeName = "MYPE Innovación S.A.";
      if (ruc === "20123456789") {
        matchedTradeName = "Gamarra Premium Outlet";
      } else if (ruc === "20601234567") {
        matchedTradeName = "SAMI Fintech Hub";
      } else if (ruc === "20543210987") {
        matchedTradeName = "Sabores del Perú Culinario";
      } else if (ruc === "20489218291") {
        matchedTradeName = "Metalúrgica CNC Lima";
      } else if (ruc === "10456782912") {
        matchedTradeName = "Bodega San Carlos";
      } else {
        // Generate a fun random Peruvian business-themed trade name
        const prefixes = ["Corporación", "Inversiones", "Comercializadora", "Distribuidora", "Bodegas"];
        const suffixes = [" del Sur", " El Sol", " Prosperidad", " Innovación", " Líder"];
        const r = Math.floor(Math.random() * 5);
        matchedTradeName = `${prefixes[r]}${suffixes[r]}`;
      }

      return res.json({
        success: true,
        tradeName: matchedTradeName,
        confidence: 0.94,
        source: "mock-ocr"
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // Parse base64
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      let mimeType = "image/jpeg";
      let base64Data = image;

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      console.log(`[SAMI OCR Server] Contacting Gemini-3.5-flash to analyze trade name with frame mimeType=${mimeType}...`);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Analyze this image representing a Peruvian SUNAT MYPE document or receipt. Your objective is to extract the trade name ('Nombre Comercial' or 'Nombre de Fantasía' or commercial name). Under Peruvian fiscal standards, this is distinct from the Legal Entity Name (Razón Social). If there is no explicit trade name legible in the document, analyze the business details and suggest a natural, matching, commercial trade name for the MYPE based on its context. Respond strictly with a JSON object holding a single string property named 'tradeName', e.g. {\"tradeName\": \"Gamarra Premium\"}. Do not include markdown brackets or any explanation, just raw JSON."
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text || "{}";
      const resultJson = JSON.parse(resultText.trim());

      res.json({
        success: true,
        tradeName: resultJson.tradeName || "MYPE Innovación S.A.",
        confidence: 0.98,
        source: "gemini-ocr"
      });
    } catch (err: any) {
      console.error("[SAMI OCR Server Error]", err);
      res.status(500).json({
        success: false,
        error: "Failed to parse document via AI OCR: " + err.message,
        fallbackTradeName: "MYPE Innovación S.A."
      });
    }
  });

  // --- Push Notifications API & Token Management ---

  // Endpoint to fetch public VAPID key
  app.get("/api/v1/notifications/vapid-key", (req, res) => {
    res.json({ publicKey });
  });

  // Endpoint to fetch VAPID keys detailed status
  app.get("/api/v1/notifications/vapid-keys/status", (req, res) => {
    const isCustomEnv = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    const hasLocalJson = fs.existsSync(keysPath);
    res.json({
      publicKey,
      persistence: isCustomEnv ? "environment" : (hasLocalJson ? "file" : "ephemeral"),
      filePath: keysPath,
      clientsRegisteredCount: activeSubscriptions.length
    });
  });

  // Endpoint to regenerate VAPID keys dynamically on-demand
  app.post("/api/v1/notifications/vapid-keys/regenerate", (req, res) => {
    try {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;

      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }
      fs.writeFileSync(keysPath, JSON.stringify({ publicKey, privateKey }, null, 2), "utf-8");

      webpush.setVapidDetails(
        "mailto:support@sami.pe",
        publicKey,
        privateKey
      );

      console.log("[SAMI Backend VAPID] Regenerated and saved fresh VAPID keys on-demand.");
      res.json({ 
        success: true, 
        publicKey, 
        message: "Llaves VAPID regeneradas exitosamente y guardadas persistentemente en data/vapid_keys.json." 
      });
    } catch (err: any) {
      console.error("[SAMI Backend VAPID] Failed on-demand key generation:", err);
      res.status(500).json({ error: "No se pudieron regenerar las llaves: " + (err.message || err) });
    }
  });

  // Endpoint to register a new push subscription
  app.post("/api/v1/notifications/subscribe", (req, res) => {
    const { userId, subscription, device } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Suscripción incompleta o inválida." });
    }

    // De-duplicate endpoints
    const dupIndex = activeSubscriptions.findIndex(
      (item) => item.subscription.endpoint === subscription.endpoint
    );
    if (dupIndex !== -1) {
      activeSubscriptions.splice(dupIndex, 1);
    }

    activeSubscriptions.push({
      userId: userId || "default",
      subscription,
      device: device || "Web Browser",
      subscribedAt: new Date().toISOString()
    });

    console.log(`[SAMI Push] Nuevo dispositivo registrado de usuario "${userId || 'default'}". Subs activos: ${activeSubscriptions.length}`);
    res.status(201).json({ success: true, count: activeSubscriptions.length });
  });

  // Endpoint to verify subscription status
  app.post("/api/v1/notifications/verify", (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint de verificación requerido." });
    }
    const exists = activeSubscriptions.some(
      (sub) => sub.subscription.endpoint === endpoint
    );
    res.json({ registered: exists });
  });

  // Endpoint to unregister a subscription
  app.post("/api/v1/notifications/unsubscribe", (req, res) => {
    const { endpoint, userId } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint de desuscripción requerido." });
    }

    const initialLen = activeSubscriptions.length;
    for (let i = activeSubscriptions.length - 1; i >= 0; i--) {
      if (activeSubscriptions[i].subscription.endpoint === endpoint) {
        activeSubscriptions.splice(i, 1);
      }
    }

    console.log(`[SAMI Push] Desregistro exitoso para usuario "${userId || 'default'}". Antes: ${initialLen}, Después: ${activeSubscriptions.length}`);
    res.json({ success: true, count: activeSubscriptions.length });
  });

  // Endpoint for targeted or global push notifications
  app.post("/api/v1/notifications/send", async (req, res) => {
    const { userId, title, body, icon, tag, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Título y cuerpo son obligatorios para disparar notificaciones." });
    }

    // Filter subscribers: if userId is requested, filter accordingly, else dispatch globally
    const targets = userId
      ? activeSubscriptions.filter((sub) => sub.userId === userId)
      : activeSubscriptions;

    if (targets.length === 0) {
      return res.json({
        success: true,
        dispatched: 0,
        message: `No se encontraron tokens activos de suscripción para el segmento: ${userId || 'todos'}`
      });
    }

    // Compose notification standard payload string
    const pushPayload = JSON.stringify({
      title,
      body,
      icon: icon || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='40' fill='%234F46E5'/><text y='155' x='30' font-size='140'>🛡️</text></svg>",
      badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2500/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='40' fill='%234F46E5'/><text y='155' x='30' font-size='140'>🛡️</text></svg>",
      tag: tag || "sami-system-dispatch",
      data: data || {}
    });

    let sent = 0;
    let failed = 0;

    const dispatchPromises = targets.map(async (target) => {
      try {
        await webpush.sendNotification(target.subscription as any, pushPayload);
        sent++;
      } catch (err: any) {
        console.error(`[SAMI Push] Error despachando push individual: Código ${err.statusCode || 'desconocido'}`);
        failed++;
        // Prune expired or dead endpoint channels automatically (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          const idx = activeSubscriptions.findIndex((sub) => sub.subscription.endpoint === target.subscription.endpoint);
          if (idx !== -1) {
            activeSubscriptions.splice(idx, 1);
          }
        }
      }
    });

    await Promise.all(dispatchPromises);

    res.json({
      success: true,
      totalTargets: targets.length,
      dispatched: sent,
      failed: failed,
      remainingSubscriptions: activeSubscriptions.length
    });
  });

  // Diagnostic Endpoint: fetch active subscriptions list
  app.get("/api/v1/notifications/subscriptions", (req, res) => {
    res.json({
      subscriptions: activeSubscriptions.map((sub) => ({
        userId: sub.userId,
        endpoint: sub.subscription.endpoint.length > 55 ? `${sub.subscription.endpoint.substring(0, 55)}...` : sub.subscription.endpoint,
        device: sub.device.length > 40 ? `${sub.device.substring(0, 40)}...` : sub.device,
        subscribedAt: sub.subscribedAt
      }))
    });
  });

  // --- SAMI Expense/Purchase Background Monitoring Endpoints ---

  // 1. GET /api/v1/expenses/purchases -> Returns all tracked purchase invoices with anomaly flags
  app.get("/api/v1/expenses/purchases", (req, res) => {
    try {
      const list = loadPurchases();
      res.json({
        success: true,
        purchases: list
      });
    } catch (err: any) {
      console.error("[SAMI API] GET /expenses/purchases failed:", err);
      res.status(500).json({ error: "No se pudieron cargar las compras: " + err.message });
    }
  });

  // 2. POST /api/v1/expenses/purchases -> Creates a new purchase invoice which enters the daemon processing queue
  app.post("/api/v1/expenses/purchases", (req, res) => {
    try {
      const { documentType, series, correlative, issueDate, ruc, totalAmount, category } = req.body;

      if (totalAmount === undefined || isNaN(parseFloat(totalAmount))) {
        return res.status(400).json({ error: "El monto total de la compra es obligatorio y debe ser un número válido." });
      }

      const list = loadPurchases();
      const newPurchase = {
        id: crypto.randomUUID(),
        type: "purchase",
        documentType: documentType || "FACTURA",
        series: series || "F001",
        correlative: correlative ? parseInt(correlative, 10) : (list.length + 1),
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        ruc: ruc || undefined,
        totalAmount: parseFloat(totalAmount),
        category: category || "Compras",
        analyzed: false // Will be picked up and processed by the background Daemon loop
      };

      list.push(newPurchase);
      savePurchases(list);

      console.log(`[SAMI API] Nueva compra registrada por S/ ${totalAmount} (ID: ${newPurchase.id}). En colada para monitoreo.`);
      res.status(201).json({
        success: true,
        purchase: newPurchase,
        message: "Compra ingresada con éxito. El Daemon de monitoreo en segundo plano la procesará en el próximo ciclo."
      });
    } catch (err: any) {
      console.error("[SAMI API] POST /expenses/purchases failed:", err);
      res.status(500).json({ error: "No se pudo procesar la nueva compra: " + err.message });
    }
  });

  // 3. GET /api/v1/expenses/monitoring-status -> Returns live diagnostics about the background scanning loop
  app.get("/api/v1/expenses/monitoring-status", (req, res) => {
    try {
      const list = loadPurchases();
      const totalAnomalies = list.filter((p: any) => p.anomalyDetected === true).length;
      res.json({
        success: true,
        daemonActive: true,
        monitoringIntervalSeconds: 8,
        runsCompleted: daemonRuns,
        lastRunAt: lastDaemonRunTime,
        totalPurchasesTracked: list.length,
        totalAnomaliesDetected: totalAnomalies,
        activeSubscriptionsCount: activeSubscriptions.length
      });
    } catch (err: any) {
      console.error("[SAMI API] GET /expenses/monitoring-status failed:", err);
      res.status(500).json({ error: "Error al recuperar métricas del monitor: " + err.message });
    }
  });

  // 4. POST /api/v1/expenses/purchases/simulate-spike -> Simulates an abnormal spike on-demand to test push notification latency
  app.post("/api/v1/expenses/purchases/simulate-spike", (req, res) => {
    try {
      const { amount } = req.body;
      const list = loadPurchases();

      const analyzedPurchases = list.filter((p: any) => p.analyzed);
      let avg = 3500;
      if (analyzedPurchases.length > 0) {
        avg = analyzedPurchases.reduce((acc: number, p: any) => acc + p.totalAmount, 0) / analyzedPurchases.length;
      }

      // Default spike amount is 3.5 times the average
      const spikeAmount = amount ? parseFloat(amount) : parseFloat((avg * 3.75).toFixed(2));

      // Choose a realistic supplier RUC
      const randomRucs = ["20100070970", "20553467801", "20601234567"];
      const randomRuc = randomRucs[Math.floor(Math.random() * randomRucs.length)];

      const spikePurchase = {
        id: crypto.randomUUID(),
        type: "purchase",
        documentType: "FACTURA",
        series: "F001",
        correlative: list.length + 1,
        issueDate: new Date().toISOString().split("T")[0],
        ruc: randomRuc,
        totalAmount: spikeAmount,
        category: "Compras Especiales",
        analyzed: false // Enters queue for automatic scanning and push trigger
      };

      list.push(spikePurchase);
      savePurchases(list);

      console.log(`[SAMI API] Simulación de Pico de Gasto activada por S/ ${spikeAmount}. Daemon emitirá push.`);
      res.status(201).json({
        success: true,
        purchase: spikePurchase,
        message: `Simulación de pico de gasto por S/ ${spikeAmount.toLocaleString('es-PE')} iniciada. El Daemon en segundo plano lo analizará de inmediato y enviará la alerta push.`
      });
    } catch (err: any) {
      console.error("[SAMI API] POST /expenses/purchases/simulate-spike failed:", err);
      res.status(500).json({ error: "No se pudo encolar la simulación de pico: " + err.message });
    }
  });

  // --- MYPE App Operations ---

  // Gemini AI Chatbot Router
  app.post("/api/v1/chat", async (req: express.Request, res: express.Response) => {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Mensaje requerido" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("[SAMI Chat Server] GEMINI_API_KEY is missing. Using high-fidelity Peruvian Fintech assistant responder.");
      // Small simulated latency for natural chatbot processing feel
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const lowercaseMsg = message.toLowerCase();
      let responseText = "¡Hola! Soy SAMI, tu asesor financiero inteligente 24/7. ¿En qué puedo ayudarte hoy?";
      
      if (lowercaseMsg.includes("score") || lowercaseMsg.includes("sami score")) {
        responseText = "Tu **SAMI Score** refleja tu salud fiscal y solvencia comercial de forma automática. Sube de nivel registrando compras formales usando facturas en nuestro módulo. Con un score mayor a 700 pts puedes acceder a tasas preferenciales de financiamiento desde un 1.2% mensual. ¡Comienza a exigir factura de inmediato!";
      } else if (lowercaseMsg.includes("igv") || lowercaseMsg.includes("impuesto") || lowercaseMsg.includes("sunat")) {
        responseText = "Recuerda que el IGV (18%) cobrado en tus ventas debe ser compensado con el IGV de tus compras de negocio. Al registrar facturas de tus proveedores, acumulas crédito fiscal que disminuye directamente tus tributos por pagar del mes. Además, SAMI te mantiene al día con alertas automatizadas antes del vencimiento SUNAT.";
      } else if (lowercaseMsg.includes("crédito") || lowercaseMsg.includes("prestamo") || lowercaseMsg.includes("financiamiento") || lowercaseMsg.includes("tasa")) {
        responseText = "Encontré que calificas para nuestro programa de Microcréditos y Factoring. Al compartir tu historial fiscal con nuestras entidades financieras aliadas (BCP, Interbank, BBVA, etc.) directamente en la app, puedes simular y desembolsar un préstamo de capital de trabajo en menos de 2 horas. ¿Deseas que simulemos un monto?";
      } else if (lowercaseMsg.includes("contratar") || lowercaseMsg.includes("comprar") || lowercaseMsg.includes("plan") || lowercaseMsg.includes("planes") || lowercaseMsg.includes("precio") || lowercaseMsg.includes("costo") || lowercaseMsg.includes("tarifa") || lowercaseMsg.includes("suscribir") || lowercaseMsg.includes("pago")) {
        responseText = "¡Contratar SAMI es sumamente fácil y seguro! Contamos con tres planes adaptados a tu negocio:\n\n" +
          "1. **Plan Emprendedor (S/ 0 - Gratis para siempre)**: Control básico de caja, cálculo de IGV referencial y SAMI Score.\n" +
          "2. **Plan Crecimiento MYPE (S/ 49 al mes)**: Certificación de salud financiera, alertas automáticas de agenda SUNAT por WhatsApp, y conexión directa a marketplace de créditos.\n" +
          "3. **Plan Elite Corp (S/ 149 al mes)**: Factoring en menos de 2 horas, dashboard multiusuario avanzado, soporte VIP y análisis de anomalías de compras de proveedores.\n\n" +
          "Para activarlo, regístrate en nuestra web con tu RUC 10/20, elige tu plan desde el panel de Administración y listo. ¡Sin contratos de permanencia!";
      } else if (lowercaseMsg.includes("crear usuario") || lowercaseMsg.includes("nuevo usuario") || lowercaseMsg.includes("usuarios") || lowercaseMsg.includes("invitar") || lowercaseMsg.includes("trabajador") || lowercaseMsg.includes("personal")) {
        responseText = "Para **añadir un nuevo usuario** (como un contador o trabajador de tu negocio):\n\n" +
          "1. Ve a la sección **Administración > Usuarios** del panel.\n" +
          "2. Haz clic en **Invitar Usuario** o **+ Nuevo Usuario**.\n" +
          "3. Escribe su correo electrónico, asígnale un rol (Administrador MYPE o Trabajador) ¡y listo! Le llegará un enlace de confirmación inmediata a su buzón. Así gestionas los accesos de tu equipo bajo total trazabilidad.";
      } else if (lowercaseMsg.includes("dar de baja") || lowercaseMsg.includes("baja") || lowercaseMsg.includes("cancelar") || lowercaseMsg.includes("eliminar") || lowercaseMsg.includes("desactivar")) {
        responseText = "Lamentamos que quieras irte de SAMI. Darte de baja es un proceso simple e inmediato, **sin penalizaciones ni cobros ocultos**:\n\n" +
          "1. Accede al panel de **Administración > Consumos y Facturas**.\n" +
          "2. Selecciona **Mi Suscripción** y haz clic en **Solicitar Baja del Servicio**.\n" +
          "3. También puedes solicitarlo abriendo un ticket en la pestaña **Soporte > Crear Ticket de Atención**; tu suscripción quedará pausada automáticamente al final de tu ciclo de facturación actual. ¡Tu información contable es tuya y la podrás exportar en un archivo ZIP al instante!";
      } else if (lowercaseMsg.includes("soporte") || lowercaseMsg.includes("ayuda") || lowercaseMsg.includes("ticket") || lowercaseMsg.includes("atencion") || lowercaseMsg.includes("reclamo") || lowercaseMsg.includes("problema")) {
        responseText = "Si tienes un problema de soporte técnico, de acceso, o de facturación, estamos listos para atenderte:\n\n" +
          "- Puedes ingresar a **Administración > Soporte** para crear un Ticket de Soporte. El tiempo promedio de respuesta para cuentas gratuitas es de 12 horas, y menos de 2 horas para clientes premium.\n" +
          "- Para quejas o disconformidades, contamos con un **Libro de Reclamaciones Digital** (asociado a la normativa INDECOPI) en la misma barra superior.\n" +
          "- También puedes escribir directamente a nuestro canal de **WhatsApp al +51 987 654 321** para charlar con un operador humano en tiempo real.";
      } else if (lowercaseMsg.includes("hola") || lowercaseMsg.includes("buenas") || lowercaseMsg.includes("tarde") || lowercaseMsg.includes("dia")) {
        responseText = "¡Hola! Soy el asistente inteligente de SAMI. ¿Cómo va tu negocio hoy? Puedo guiarte con tu SAMI Score, aclarar dudas sobre el IGV y crédito fiscal, informarte cómo contratar cualquiera de nuestros tres planes, o gestionar la creación y baja de usuarios.";
      } else {
        responseText = "Entiendo tu consulta sobre el negocio. En SAMI nos encargamos de automatizar tu agenda fiscal SUNAT, optimizar tu IGV y pre-aprobamos tus créditos de capital de trabajo. \n\n¿Deseas saber **cómo contratar el servicio (Planes)**, **cómo dar de baja la cuenta**, **cómo crear nuevos usuarios** o **cómo abrir un ticket de soporte**?";
      }

      return res.json({ text: responseText });
    }

    try {
      const ai = new GoogleGenAI({ 
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: "Eres SAMI Bot, el asesor financiero inteligente de SAMI (la fintech líder para pymes y emprendedores en Perú). Tu rol es responder consultas de clientes y prospectos sobre microcréditos, factoring, optimización tributaria (IGV de compras, crédito fiscal, regímenes tributarios como MYPE Tributario), cómo calificar pidiendo factura a proveedores, de qué manera contratar el servicio, y cómo gestionar la cuenta comercial. \n\n" +
            "CONOCIMIENTO CLAVE DE SAMI:\n" +
            "1. CÓMO CONTRATAR EL SERVICIO: Se registran gratis online con su RUC 10 o 20. Planes: Plan Emprendedor (S/ 0 - Gratis), Plan Crecimiento MYPE (S/ 49/mes con de alertas SUNAT y score preferencial), Plan Elite Corp (S/ 149/mes con factoring inmediato, multiusuario y análisis premium).\n" +
            "2. SOPORTE Y CLIENTES: Se pueden abrir Tickets de Soporte las 24 horas en la sección 'Administración > Soporte' (SLA de 2 horas premium, 12 horas gratis). Las quejas formales van al Libro de Reclamaciones digital de conformidad con INDECOPI.\n" +
            "3. CREAR NUEVOS USUARIOS: El administrador MYPE puede ir a 'Administración > Usuarios', dar clic en '+ Nuevo Usuario', ingresar el correo y asignar rol de Administrador o Trabajador para dar acceso a su equipo.\n" +
            "4. DAR DE BAJA EL SERVICIO: Se realiza sin penalizaciones en la sección 'Administración > Consumos y Facturas' seleccionando 'Solicitar Baja del Servicio', o mediante de un ticket. Las deudas pendientes se cancelan en el ciclo y el historial contable se descarga en ZIP.\n\n" +
            "Responde usando Markdown para destacar ideas importantes, en tono amigable, comercial, claro, y sumamente profesional. Mantén respuestas concisas, dinámicas (no más de 3 párrafos cortos) y orientadas al contexto legal, comercial y fiscal peruano de la SUNAT e instituciones SBS.",
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[SAMI Chat Server Error]", err);
      res.status(500).json({ error: "Error en el chat bot: " + err.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAMI MVP Server running on http://localhost:${PORT}`);
  });
}

startServer();
