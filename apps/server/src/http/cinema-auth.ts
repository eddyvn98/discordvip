import type { Request, Response } from "express";

import { CinemaService } from "../services/cinema-service.js";

function adminFallbackSession(req: Request) {
  if (!req.session.adminUser) return null;
  return {
    platform: "discord" as const,
    platformUserId: `admin:${req.session.adminUser.id}`,
    platformChatId: "",
    isVip: true,
    fingerprint: "admin-bypass",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

export function requireCinemaSession(cinemaService: CinemaService, req: Request, res: Response) {
  try {
    return cinemaService.requireCinemaSession(req);
  } catch (error) {
    const adminSession = adminFallbackSession(req);
    if (adminSession) return adminSession;
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized cinema session" });
    return null;
  }
}

export function requireVip(cinemaService: CinemaService, req: Request, res: Response) {
  const session = requireCinemaSession(cinemaService, req, res);
  if (!session) return null;
  if (!session.isVip) {
    res.status(403).json({ error: "VIP required." });
    return null;
  }
  return session;
}
