import cors from "cors";
import pgSession from "connect-pg-simple";
import express from "express";
import session from "express-session";
import { Pool } from "pg";

import { env } from "../config.js";
import { getCinemaPublicOrigin, isTryCloudflareOrigin } from "../lib/public-base-url.js";
import { AdminService } from "../services/admin-service.js";
import { AuthService } from "../services/auth-service.js";
import { CinemaService } from "../services/cinema-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";
import { registerAdminRoutes } from "./admin.js";
import { registerAdminCinemaRoutes } from "./admin-cinema.js";
import { registerAuthRoutes } from "./auth.js";
import { registerCinemaRoutes } from "./cinema.js";
import { registerLocalCinemaControlRoutes } from "./local-cinema-control.js";
import { registerWebhookRoutes } from "./webhooks.js";

const PostgresStore = pgSession(session);

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  if ([env.ADMIN_APP_URL, env.PUBLIC_BASE_URL, env.CINEMA_PUBLIC_BASE_URL, getCinemaPublicOrigin()].includes(origin)) {
    return true;
  }

  if (isTryCloudflareOrigin(origin)) {
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
  cinemaService,
}: {
  adminService: AdminService;
  authService: AuthService;
  paymentService: PaymentService;
  promoCodeService: PromoCodeService;
  cinemaService: CinemaService;
}) {
  const app = express();
  const trustProxy = env.TRUST_PROXY || env.APP_ENV === "production";

  if (trustProxy) {
    app.set("trust proxy", 1);
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  const useDevSessionCookie = env.DEV_BYPASS_ADMIN_AUTH;

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
      proxy: trustProxy,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // Telegram WebView runs in a cross-site context (inside web.telegram.org),
        // so production needs SameSite=None to allow session cookie round-trips.
        sameSite: env.APP_ENV === "production" && !useDevSessionCookie ? "none" : "lax",
        secure: env.APP_ENV === "production" && !useDevSessionCookie,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use((req, res, next) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api/cinema/e/") || req.path.startsWith("/cinema/e/")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  registerAuthRoutes(app, authService);
  registerAdminRoutes(app, adminService, paymentService, promoCodeService);
  registerAdminCinemaRoutes(app, cinemaService);
  registerCinemaRoutes(app, cinemaService);
  registerLocalCinemaControlRoutes(app, cinemaService);
  registerWebhookRoutes(app, paymentService);

  return app;
}
