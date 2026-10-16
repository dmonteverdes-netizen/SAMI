import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import { checkDatabaseHealth } from "./core/services/db";
import { logger } from "./core/services/logger";
import { requirePhase, getServerActivePhase } from "./server/middleware/phaseGuard";

// ============================================================================
// IMPORTACIÓN DE ROUTERS MODULARES POR FASE
// ============================================================================
// Regla de Arquitectura de Seguridad: La fase del servidor manda. Si el frontend tiene fase 2 y el servidor fase 1, gana el servidor.
//
// En SAMI, el control de activación por fases en el frontend es puramente una capa
// de presentación y UX. La verdadera barrera de seguridad contra accesos a endpoints
// no auditados o no desplegados reside en este servidor Express.

// --- FASE 1: Operación & Contabilidad (MVP) ---
import authRouter from "./server/routes/auth";
import consentRouter from "./server/routes/consent";
import accountingRouter from "./server/routes/accounting";
import expensesRouter from "./server/routes/expenses";
import ocrRouter from "./server/routes/ocr";
import notificationsRouter from "./server/routes/notifications";

// --- FASE 2: Financiamiento & Entidades Financieras Aliadas ---
import creditRouter from "./server/routes/credit";
import bankRouter from "./server/routes/bank";
import profilingRouter from "./server/routes/profiling";

// --- FASE 3: Aprender, Academia y Glosario MYPE ---
import educationRouter from "./server/routes/education";
import glossaryRouter from "./server/routes/glossary";

// --- FASE 4: Productividad, SAMI AI, Tareas y Fidelización ---
import chatRouter from "./server/routes/chat";
import tasksRouter from "./server/routes/tasks";
import loyaltyRouter from "./server/routes/loyalty";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === "production";
  const activePhase = getServerActivePhase();

  logger.info(`[SAMI Backend] Iniciando servidor Express. Fase activa del servidor: FASE ${activePhase}`);

  // --- OWASP ASVS V13: Trust Proxy Configuration ---
  // Trust exactly 1 upstream reverse proxy hop (Cloud Run / Nginx) to securely resolve req.ip
  app.set("trust proxy", 1);

  // --- Strict Security Config & High-Fidelity Headers ---
  // Los orígenes permitidos deben ser URLs completas y exactas para evitar ataques de bypass por substring.
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ais-dev-xevhgycak76zsh7664h7m4-646409277303.us-east1.run.app",
    "https://ais-pre-xevhgycak76zsh7664h7m4-646409277303.us-east1.run.app",
    "https://ai.studio"
  ];

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.use(cors({
    origin: (origin, callback) => {
      // Comparación exacta contra la lista blanca para mitigar ataques como 'https://sami.pe.attacker.com'
      if (!origin || allowedOrigins.includes(origin)) {
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

  // --- OWASP ASVS V14.4.3: Content Security Policy & Security Headers ---
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https://placehold.co", "https://images.unsplash.com"],
        connectSrc: [
          "'self'",
          "https://ais-dev-xevhgycak76zsh7664h7m4-646409277303.us-east1.run.app",
          "https://ais-pre-xevhgycak76zsh7664h7m4-646409277303.us-east1.run.app"
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com"],
        upgradeInsecureRequests: [],
      }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: isProduction ? { policy: "same-origin-allow-popups" } : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // --- OWASP ASVS V13.2.4: Body Parser Size Limits ---
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // --- Standard In-Memory Rate Limiter (Token Bucket) ---
  interface RateLimitBucket {
    tokens: number;
    lastRefill: number;
  }
  const rateLimitStore = new Map<string, RateLimitBucket>();
  const LIMIT_CAPACITY = 100;
  const REFILL_RATE_MS = 60000;
  const REFILL_AMOUNT = 50;

  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || "unknown-client";
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
        message: "Límite de solicitudes de seguridad excedido. Por favor, espere antes de reintentar.",
        retryAfterSeconds: 60
      });
    }

    bucket.tokens--;
    next();
  };

  app.use("/api/", rateLimiter);

  // ============================================================================
  // MONTAJE MODULAR DE RUTAS POR FASE (DEFENSA EN PROFUNDIDAD)
  // ============================================================================
  // Regla de Arquitectura de Seguridad: La fase del servidor manda. Si el frontend tiene fase 2 y el servidor fase 1, gana el servidor.
  //
  // Todo endpoint perteneciente a una fase superior a SAMI_ACTIVE_PHASE responde
  // con HTTP 404 (Not Found) para no confirmar la existencia de la ruta ni revelar
  // endpoints no auditados o en desarrollo.

  // --- FASE 1: Operación & Contabilidad (SAMI_ACTIVE_PHASE >= 1) ---
  app.use("/api/v1/auth", requirePhase(1), authRouter);
  app.use("/api/v1", requirePhase(1), consentRouter);
  app.use("/api/v1/accounting", requirePhase(1), accountingRouter);
  app.use("/api/v1/expenses", requirePhase(1), expensesRouter);
  app.use("/api/v1/ocr", requirePhase(1), ocrRouter);
  app.use("/api/v1/notifications", requirePhase(1), notificationsRouter);

  // --- FASE 2: Financiamiento & Entidades Financieras Aliadas (SAMI_ACTIVE_PHASE >= 2) ---
  app.use("/api/v1/bank", requirePhase(2), bankRouter);
  app.use("/api/v1/profiling", requirePhase(2), profilingRouter);

  // --- FASE 3: Marketplace de Microcréditos, Aprender y Glosario MYPE (SAMI_ACTIVE_PHASE >= 3) ---
  app.use("/api/v1/credit", requirePhase(3), creditRouter);
  app.use("/api/v1/education", requirePhase(3), educationRouter);
  app.use("/api/v1/glossary", requirePhase(3), glossaryRouter);

  // --- FASE 4: Productividad, SAMI AI, Tareas y Fidelización (SAMI_ACTIVE_PHASE >= 4) ---
  app.use("/api/v1/chat", requirePhase(4), chatRouter);
  app.use("/api/v1/tasks", requirePhase(4), tasksRouter);
  app.use("/api/v1/loyalty", requirePhase(4), loyaltyRouter);

  // Health Check Endpoint
  app.get("/api/health", async (req, res) => {
    const isDbHealthy = await checkDatabaseHealth();
    if (!isDbHealthy) {
      logger.error("[HEALTH CHECK FAIL] PostgreSQL database check failed (Fail-Fast).");
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        environment: process.env.NODE_ENV,
        activeServerPhase: getServerActivePhase(),
        message: "SAMI relational DB is unreachable. Service is currently unavailable."
      });
    }

    res.json({
      status: "ok",
      database: "connected",
      environment: process.env.NODE_ENV,
      activeServerPhase: getServerActivePhase(),
      timestamp: Date.now()
    });
  });

  // --- OWASP ASVS V7.4.1: Centralized Error Handler ---
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error("[SAMI Unhandled Server Error]", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errorMessage: err?.message,
      errorStack: err?.stack
    }, err);

    if (res.headersSent) {
      return next(err);
    }

    const statusCode = typeof err?.status === "number" 
      ? err.status 
      : (typeof err?.statusCode === "number" ? err.statusCode : 500);

    res.status(statusCode).json({
      success: false,
      error: "Ha ocurrido un error inesperado al procesar su solicitud. Por favor, inténtelo de nuevo más tarde.",
      code: "INTERNAL_SERVER_ERROR"
    });
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
    console.log(`SAMI MVP Server running on http://localhost:${PORT} (Active Phase: ${activePhase})`);
  });
}

startServer();
