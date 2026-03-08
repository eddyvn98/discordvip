import type { Express, Request, Response } from "express";

import { AuthService } from "../services/auth-service.js";

export function registerAuthRoutes(app: Express, authService: AuthService) {
  app.get("/api/auth/discord/login", (req: Request, res: Response) => {
    const returnTo =
      typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
    const loginUrl = authService.createLoginUrl(req.session, returnTo);
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

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });
}
