import type { Request, Response } from "express";

import { CinemaService } from "../services/cinema-service.js";

export function requireCinemaSession(cinemaService: CinemaService, req: Request, res: Response) {
  try {
    return cinemaService.requireCinemaSession(req);
  } catch (error) {
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
