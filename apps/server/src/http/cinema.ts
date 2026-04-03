import type { Express, Request, Response } from "express";

import { CinemaService } from "../services/cinema-service.js";
import { requireVip } from "./cinema-auth.js";
import { renderEntryBootstrapHtml } from "./cinema-bootstrap-html.js";
import { renderCinemaHtml } from "./cinema-html.js";
import { rateLimit } from "./cinema-rate-limiter.js";
import {
  isSameOriginPlaybackRequest,
  makeTelefilmInitData,
  proxyStaticFile,
  proxyTelefilmStream,
} from "./cinema-stream-utils.js";

export function registerCinemaRoutes(app: Express, cinemaService: CinemaService) {
  app.get("/cinema", renderCinemaHtml);
  app.get("/api/cinema", renderCinemaHtml);

  app.get("/api/cinema/e/:entryTicket", (_req: Request, res: Response) => {
    const token = String(_req.params.entryTicket ?? "");
    if (!token) {
      renderCinemaHtml(_req, res);
      return;
    }
    renderEntryBootstrapHtml(token, res);
  });

  app.post("/api/cinema/session/exchange-ticket", async (req: Request, res: Response) => {
    try {
      if (rateLimit(`exchange:${req.ip}`, 20, 60_000)) {
        res.status(429).json({ error: "Too many ticket exchange attempts. Please retry later." });
        return;
      }
      const body = req.body as { entryTicket?: string; initData?: string };
      const token = String(body.entryTicket ?? "");
      if (!token) {
        res.status(400).json({ error: "entryTicket is required" });
        return;
      }
      res.json(await cinemaService.exchangeEntryTicket(req.session, req, token, String(body.initData ?? "")));
    } catch (error) {
      res.status(403).json({ error: error instanceof Error ? error.message : "Ticket exchange failed" });
    }
  });

  app.post("/api/cinema/session/exchange-telegram-init", async (req: Request, res: Response) => {
    try {
      if (rateLimit(`exchange-init:${req.ip}`, 30, 60_000)) {
        res.status(429).json({ error: "Too many exchange attempts. Please retry later." });
        return;
      }
      const body = req.body as { initData?: string };
      const initData = String(body.initData ?? "");
      if (!initData) {
        res.status(400).json({ error: "initData is required" });
        return;
      }
      res.json(await cinemaService.exchangeTelegramWebAppSession(req.session, req, initData));
    } catch (error) {
      res.status(403).json({ error: error instanceof Error ? error.message : "Telegram session exchange failed" });
    }
  });

  app.get("/api/cinema/session/me", (req: Request, res: Response) => {
    const session = requireVip(cinemaService, req, res);
    if (!session) return;
    res.json({ expiresAt: session.expiresAt, isVip: session.isVip });
  });

  app.get("/api/cinema/channels", async (req: Request, res: Response) => {
    const session = requireVip(cinemaService, req, res);
    if (!session) return;
    res.json(await cinemaService.listChannelsForWeb());
  });

  app.get("/api/cinema/channels/:channelId/items", async (req: Request, res: Response) => {
    const session = requireVip(cinemaService, req, res);
    if (!session) return;
    res.json(await cinemaService.listItemsForWeb(String(req.params.channelId ?? "")));
  });

  app.get("/api/cinema/items/:itemId", async (req: Request, res: Response) => {
    try {
      const session = requireVip(cinemaService, req, res);
      if (!session) return;
      res.json(await cinemaService.getItemForWeb(String(req.params.itemId ?? "")));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "Item not found." });
    }
  });

  app.get("/api/cinema/items/:itemId/playback", async (req: Request, res: Response) => {
    const session = requireVip(cinemaService, req, res);
    if (!session) return;
    res.json(
      await cinemaService.getSignedPlaybackLinks({
        itemId: String(req.params.itemId ?? ""),
        userId: `${session.platform}:${session.platformUserId}`,
      }),
    );
  });

  app.get("/api/cinema/telefilm-static/*", async (req: Request, res: Response) => {
    try {
      if (!isSameOriginPlaybackRequest(req)) {
        res.status(403).json({ error: "Cross-origin media hotlink is blocked." });
        return;
      }
      const session = requireVip(cinemaService, req, res);
      if (!session) return;
      const wildcard = (req.params as Record<string, string | string[] | undefined>)["0"];
      const path = String(Array.isArray(wildcard) ? wildcard[0] : wildcard ?? "").replace(/^\/+/u, "");
      if (!path || path.includes("..")) {
        res.status(400).json({ error: "Invalid static path." });
        return;
      }
      await proxyStaticFile(path, res);
    } catch {
      res.status(404).end();
    }
  });

  app.get("/api/cinema/stream/:itemId/:kind", async (req: Request, res: Response) => {
    try {
      if (!isSameOriginPlaybackRequest(req)) {
        res.status(403).json({ error: "Cross-origin media hotlink is blocked." });
        return;
      }
      if (rateLimit(`stream:${req.ip}`, 240, 60_000)) {
        res.status(429).json({ error: "Rate limit exceeded." });
        return;
      }
      const session = cinemaService.requireCinemaSession(req);
      if (!session.isVip) {
        res.status(403).json({ error: "VIP required." });
        return;
      }
      if (String(req.params.kind ?? "") !== "full") {
        res.status(403).json({ error: "Only full stream is available for VIP cinema." });
        return;
      }
      const asset = await cinemaService.resolveStream({
        itemId: String(req.params.itemId ?? ""),
        kind: "full",
        token: String(req.query.token ?? ""),
        userId: `${session.platform}:${session.platformUserId}`,
      });

      if (asset.fileRef.startsWith("telefilm://movie/")) {
        const movieId = asset.fileRef.slice("telefilm://movie/".length).trim();
        if (!movieId) {
          res.status(404).json({ error: "Telefilm movie id is missing." });
          return;
        }
        const initData = makeTelefilmInitData(session.platformUserId);
        await proxyTelefilmStream(req, res, movieId, initData);
        return;
      }

      if (/^https?:\/\//u.test(asset.fileRef)) {
        res.redirect(asset.fileRef);
        return;
      }
      res.status(501).json({ error: "Only http(s) asset references are supported in v1." });
    } catch (error) {
      res.status(403).json({ error: error instanceof Error ? error.message : "Stream access denied" });
    }
  });
}
