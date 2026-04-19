import type { Express, Request, Response } from "express";

import { env } from "../config.js";
import { AuthService } from "../services/auth-service.js";

export function registerAuthRoutes(app: Express, authService: AuthService) {
  const applyDevCinemaLogin = (req: Request) => {
    req.session.adminUser = {
      id: "dev-cinema-admin",
      username: "Dev Cinema Admin",
      avatarUrl: null,
    };
  };
  app.get("/api/auth/discord/login", (req: Request, res: Response) => {
    const returnTo =
      typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
    const loginUrl = authService.createLoginUrl(req.session, returnTo);
    res.redirect(loginUrl);
  });

  app.get("/api/auth/discord/request", (req: Request, res: Response) => {
    const returnTo =
      typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
    const loginUrl = authService.createRequestLoginUrl(req.session, returnTo);
    res.redirect(loginUrl);
  });

  app.get("/api/auth/discord/callback", async (req: Request, res: Response) => {
    try {
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");
      const result = await authService.handleCallback(req.session, code, state);
      res.redirect(result.redirectTo);
    } catch (error) {
      res.status(403).send(error instanceof Error ? error.message : "OAuth failed");
    }
  });

  app.post("/api/auth/debug-login", (req: Request, res: Response) => {
    try {
      const body = req.body as { secret?: string; returnTo?: string };
      const result = authService.handleDebugLogin(
        req.session,
        String(body.secret ?? ""),
        typeof body.returnTo === "string" ? body.returnTo : undefined,
      );
      res.json(result);
    } catch (error) {
      res.status(403).json({
        error: error instanceof Error ? error.message : "Debug login failed",
      });
    }
  });

  app.post("/api/auth/admin-request/telegram", async (req: Request, res: Response) => {
    try {
      const body = req.body as { telegramUserId?: string; displayName?: string };
      const request = await authService.createTelegramAdminRequest({
        telegramUserId: String(body.telegramUserId ?? ""),
        displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      });
      res.json({
        ok: true,
        request: {
          id: request.id,
          platform: request.platform,
          platformUserId: request.platformUserId,
          displayName: request.displayName,
          isActive: request.isActive,
        },
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Cannot create telegram admin request",
      });
    }
  });

  app.post("/api/auth/dev-cinema-login", (req: Request, res: Response) => {
    if (!env.DEV_BYPASS_ADMIN_AUTH) {
      res.status(403).json({ error: "Dev cinema login is disabled." });
      return;
    }

    applyDevCinemaLogin(req);

    res.json({ ok: true, redirectTo: "/cinema" });
  });

  app.get("/api/auth/dev-cinema-login", (req: Request, res: Response) => {
    if (!env.DEV_BYPASS_ADMIN_AUTH) {
      res.status(403).send("Dev cinema login is disabled.");
      return;
    }

    applyDevCinemaLogin(req);
    res.redirect("/cinema");
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });
}
