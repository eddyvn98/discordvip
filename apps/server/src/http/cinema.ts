import type { Express, Request, Response } from "express";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

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
  const proxyTelethonBigStream = async (req: Request, res: Response, itemId: string) => {
    const source = await cinemaService.getTelegramSourceForItem(itemId);
    if (!source) {
      res.status(404).json({ error: "Telegram source not found for item." });
      return;
    }
    const range = String(req.headers.range ?? "");
    const upstream = await fetch(`http://telethon-stream:8090/stream/${source.channelId}/${source.messageId}`, {
      headers: range ? { range } : undefined,
    });
    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 502).end();
      return;
    }
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    res.setHeader("Cache-Control", "public, max-age=3600");
    Readable.fromWeb(upstream.body as any).pipe(res);
  };

  app.get("/cinema", renderCinemaHtml);
  app.get("/api/cinema", renderCinemaHtml);

  const renderEntry = (_req: Request, res: Response) => {
    const token = String(_req.params.entryTicket ?? "");
    if (!token) {
      renderCinemaHtml(_req, res);
      return;
    }
    renderEntryBootstrapHtml(token, res);
  };
  app.get("/cinema/e/:entryTicket", renderEntry);
  app.get("/api/cinema/e/:entryTicket", renderEntry);

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
    const sortRaw = String(req.query.sort ?? "").trim().toLowerCase();
    const sort =
      sortRaw === "oldest" ||
      sortRaw === "random" ||
      sortRaw === "newest" ||
      sortRaw === "most_viewed" ||
      sortRaw === "least_viewed" ||
      sortRaw === "unseen"
        ? sortRaw
        : "newest";
    res.json(
      await cinemaService.listItemsForWeb(String(req.params.channelId ?? ""), {
        sort,
        userKey: `${session.platform}:${session.platformUserId}`,
      }),
    );
  });

  app.get("/api/cinema/feed/items", async (req: Request, res: Response) => {
    const session = requireVip(cinemaService, req, res);
    if (!session) return;
    const limit = Math.max(20, Math.min(Number(req.query.limit ?? 120), 400));
    res.json(
      await cinemaService.listFeedItemsForWeb({
        limit,
        userKey: `${session.platform}:${session.platformUserId}`,
      }),
    );
  });

  app.post("/api/cinema/items/:itemId/view", async (req: Request, res: Response) => {
    const session = requireVip(cinemaService, req, res);
    if (!session) return;
    await cinemaService.markItemViewed(String(req.params.itemId ?? ""), `${session.platform}:${session.platformUserId}`);
    res.json({ ok: true });
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

  app.get("/api/cinema/local-media/*", async (req: Request, res: Response) => {
    try {
      if (!isSameOriginPlaybackRequest(req)) {
        res.status(403).json({ error: "Cross-origin media hotlink is blocked." });
        return;
      }
      const session = requireVip(cinemaService, req, res);
      if (!session) return;
      const wildcard = (req.params as Record<string, string | string[] | undefined>)["0"];
      const rel = String(Array.isArray(wildcard) ? wildcard[0] : wildcard ?? "").replace(/^\/+/u, "");
      if (!rel || rel.includes("..")) {
        res.status(400).json({ error: "Invalid media path." });
        return;
      }
      const root = path.resolve(process.cwd(), "storage", "cinema-media");
      const fullPath = path.resolve(root, rel);
      if (!fullPath.startsWith(root)) {
        res.status(400).json({ error: "Invalid media path." });
        return;
      }
      const file = await stat(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const contentType =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : "video/mp4";
      const range = String(req.headers.range ?? "").trim();
      if (!range) {
        res.status(200);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", String(file.size));
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "public, max-age=86400");
        createReadStream(fullPath).pipe(res);
        return;
      }
      const m = /^bytes=(\d*)-(\d*)$/u.exec(range);
      if (!m) {
        res.status(416).end();
        return;
      }
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Number(m[2]) : file.size - 1;
      const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
      const safeEnd = Number.isFinite(end) ? Math.min(file.size - 1, end) : file.size - 1;
      if (safeStart > safeEnd) {
        res.status(416).end();
        return;
      }
      res.status(206);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Range", `bytes ${safeStart}-${safeEnd}/${file.size}`);
      res.setHeader("Content-Length", String(safeEnd - safeStart + 1));
      res.setHeader("Cache-Control", "public, max-age=86400");
      createReadStream(fullPath, { start: safeStart, end: safeEnd }).pipe(res);
    } catch {
      res.status(404).end();
    }
  });

  app.get("/api/cinema/media/telegram/:fileId", async (req: Request, res: Response) => {
    try {
      if (!isSameOriginPlaybackRequest(req)) {
        res.status(403).json({ error: "Cross-origin media hotlink is blocked." });
        return;
      }
      const session = requireVip(cinemaService, req, res);
      if (!session) return;
      const fileId = String(req.params.fileId ?? "").trim();
      if (!fileId) {
        res.status(400).json({ error: "Invalid file id." });
        return;
      }
      let media;
      const range = typeof req.headers.range === "string" ? req.headers.range.trim() : "";
      try {
        media = await cinemaService.resolveTelegramFile(fileId, range || undefined);
      } catch {
        const itemId = String(req.query.itemId ?? "").trim();
        const kind = String(req.query.kind ?? "").trim().toLowerCase();
        if (itemId && kind === "full") {
          try {
            const refreshedFileId = await cinemaService.refreshTelegramFullAssetFileIdByItemId(itemId);
            media = await cinemaService.resolveTelegramFile(refreshedFileId, range || undefined);
          } catch {
            await proxyTelethonBigStream(req, res, itemId);
            return;
          }
        } else {
          throw new Error("telegram file not found");
        }
      }
      res.status(media.statusCode || 200);
      res.setHeader("Content-Type", media.contentType);
      if (media.contentLength) {
        res.setHeader("Content-Length", media.contentLength);
      }
      if (media.contentRange) {
        res.setHeader("Content-Range", media.contentRange);
      }
      if (media.acceptRanges) {
        res.setHeader("Accept-Ranges", media.acceptRanges);
      }
      res.setHeader("Cache-Control", media.cacheControl);
      Readable.fromWeb(media.stream as any).pipe(res);
    } catch {
      res.status(404).end();
    }
  });

  app.get("/api/cinema/media/telegram-big/:itemId", async (req: Request, res: Response) => {
    try {
      if (!isSameOriginPlaybackRequest(req)) {
        res.status(403).json({ error: "Cross-origin media hotlink is blocked." });
        return;
      }
      const session = requireVip(cinemaService, req, res);
      if (!session) return;
      await proxyTelethonBigStream(req, res, String(req.params.itemId ?? ""));
    } catch {
      res.status(404).end();
    }
  });

  app.get("/api/cinema/stream/:itemId/:kind", async (req: Request, res: Response) => {
    try {
      if (rateLimit(`stream:${req.ip}`, 240, 60_000)) {
        res.status(429).json({ error: "Rate limit exceeded." });
        return;
      }
      if (String(req.params.kind ?? "") !== "full") {
        res.status(403).json({ error: "Only full stream is available for VIP cinema." });
        return;
      }
      const { asset, userId } = await cinemaService.resolveStream({
        itemId: String(req.params.itemId ?? ""),
        kind: "full",
        token: String(req.query.token ?? ""),
      });

      if (asset.fileRef.startsWith("telefilm://movie/")) {
        const movieId = asset.fileRef.slice("telefilm://movie/".length).trim();
        if (!movieId) {
          res.status(404).json({ error: "Telefilm movie id is missing." });
          return;
        }
        const initData = makeTelefilmInitData(userId);
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
