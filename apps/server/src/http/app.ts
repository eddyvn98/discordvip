import cors from "cors";
import pgSession from "connect-pg-simple";
import express from "express";
import session from "express-session";
import { Pool } from "pg";

import { env } from "../config.js";
import { AdminService } from "../services/admin-service.js";
import { AuthService } from "../services/auth-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";
import { registerAdminRoutes } from "./admin.js";
import { registerAuthRoutes } from "./auth.js";
import { registerWebhookRoutes } from "./webhooks.js";

const PostgresStore = pgSession(session);

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  if ([env.ADMIN_APP_URL, env.PUBLIC_BASE_URL].includes(origin)) {
    return true;
  }

  if (!env.DEV_BYPASS_ADMIN_AUTH) {
    return false;
  }

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function createApp({
  adminService,
  authService,
  paymentService,
  promoCodeService,
}: {
  adminService: AdminService;
  authService: AuthService;
  paymentService: PaymentService;
  promoCodeService: PromoCodeService;
}) {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    }),
  );

  app.use(
    "/api/webhooks/sepay",
    express.text({
      type: "*/*",
      verify: (req, _res, buffer) => {
        (req as express.Request & { rawBody?: string }).rawBody = buffer.toString();
      },
    }),
  );

  app.use(
    express.json({
      verify: (req, _res, buffer) => {
        (req as express.Request & { rawBody?: string }).rawBody = buffer.toString();
      },
    }),
  );

  app.use(
    session({
      store: new PostgresStore({
        pool,
        createTableIfMissing: true,
      }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: env.APP_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  registerAuthRoutes(app, authService);
  registerAdminRoutes(app, adminService, paymentService, promoCodeService);
  registerWebhookRoutes(app, paymentService);

  return app;
}
