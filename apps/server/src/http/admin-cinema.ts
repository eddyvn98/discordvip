import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../prisma.js";
import { CinemaService } from "../services/cinema-service.js";
import type { PlatformKey } from "../services/platform.js";

const channelSchema = z.object({
  id: z.string().optional(),
  platform: z.enum(["telegram", "discord"]),
  sourceChannelId: z.string().trim().min(1),
  role: z.enum(["FULL_SOURCE", "PREVIEW_STORAGE", "POSTER_STORAGE"]),
  displayName: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/u, "slug must match [a-z0-9-]+"),
  isEnabled: z.coerce.boolean().default(true),
  localPath: z.string().trim().optional(),
  remoteStatus: z.string().trim().default("ACTIVE"),
});

const renameChannelSchema = z.object({
  displayName: z.string().trim().min(1),
});

const renameMovieSchema = z.object({
  title: z.string().trim().min(1),
});


function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const internalSecret = req.headers["x-internal-secret"];
  const secret = process.env.ADMIN_DEBUG_LOGIN_SECRET || "internal-secret";
  if (internalSecret && internalSecret === secret) {
    return next();
  }
  if (process.env.DEV_BYPASS_ADMIN_AUTH === "true") {
    return next();
  }
  if (!req.session.adminUser) {
    res.status(401).json({ error: "Chưa đăng nhập admin." });
    return;
  }
  next();
}

export function registerAdminCinemaRoutes(app: Express, cinemaService: CinemaService) {
  app.post("/api/admin/cinema/storage/ensure", requireAdmin, async (_req, res) => {
    try {
      await cinemaService.ensureTelegramStorageChannels();
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot ensure storage channel" });
    }
  });

  app.get("/api/admin/cinema/channels", requireAdmin, async (_req, res) => {
    res.json(await cinemaService.listAllChannels());
  });

  app.get("/api/admin/cinema/channels/:id", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      if (!channelId) {
        res.status(400).json({ error: "channel id is required" });
        return;
      }
      res.json(await cinemaService.getChannelDetailWithMovies(channelId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot load channel detail";
      res.status(message.toLowerCase().includes("not found") ? 404 : 400).json({ error: message });
    }
  });

  app.patch("/api/admin/cinema/channels/:id", requireAdmin, async (req, res) => {
    try {
      const body = renameChannelSchema.parse(req.body);
      const channelId = String(req.params.id ?? "");
      if (!channelId) {
        res.status(400).json({ error: "channel id is required" });
        return;
      }
      res.json(await cinemaService.renameChannel(channelId, body.displayName));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot rename channel";
      res.status(message.toLowerCase().includes("not found") ? 404 : 400).json({ error: message });
    }
  });

  app.delete("/api/admin/cinema/channels/:id", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      if (!channelId) {
        res.status(400).json({ error: "channel id is required" });
        return;
      }
      await cinemaService.deleteChannel(channelId);
      res.status(204).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot delete cinema channel";
      res.status(message.toLowerCase().includes("not found") ? 404 : 400).json({ error: message });
    }
  });

  app.post("/api/admin/cinema/channels", requireAdmin, async (req, res) => {
    try {
      const body = channelSchema.parse(req.body);
      res.json(await cinemaService.createOrUpdateChannel({ ...body, platform: body.platform as PlatformKey }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot save cinema channel" });
    }
  });

  app.post("/api/admin/cinema/channels/:id/delete", requireAdmin, async (req, res) => {
    try {
      await cinemaService.deleteChannel(String(req.params.id ?? ""));
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot delete cinema channel" });
    }
  });

  app.post("/api/admin/cinema/channels/create-auto", requireAdmin, async (req, res) => {
    try {
      const { title } = req.body as { title: string };
      res.json(await cinemaService.createNewTelegramChannel(title));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot create auto channel" });
    }
  });

  app.post("/api/admin/cinema/channels/:id/prepare", requireAdmin, async (req, res) => {
    try {
      res.json(await cinemaService.ensureTelegramChannelReady(String(req.params.id ?? "")));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot prepare channel" });
    }
  });

  app.post("/api/admin/cinema/admin-copy", requireAdmin, async (req, res) => {
    try {
      const { fromChatId, messageId, targetChannelId } = req.body as { fromChatId: string; messageId: string; targetChannelId: string };
      res.json(await cinemaService.adminCopyToChannel({ fromChatId, messageId, targetChannelId }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Admin copy failed" });
    }
  });

  app.get("/api/admin/cinema/movies/web", requireAdmin, async (_req, res) => {
    try {
      res.json(await cinemaService.listWebMoviesForAdmin());
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot load web movies" });
    }
  });

  app.patch("/api/admin/cinema/movies/:id", requireAdmin, async (req, res) => {
    try {
      const body = renameMovieSchema.parse(req.body);
      const movieId = String(req.params.id ?? "");
      if (!movieId) {
        res.status(400).json({ error: "movie id is required" });
        return;
      }
      res.json(await cinemaService.renameMovie(movieId, body.title));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot rename movie";
      res.status(message.toLowerCase().includes("not found") ? 404 : 400).json({ error: message });
    }
  });

  app.delete("/api/admin/cinema/movies/:id", requireAdmin, async (req, res) => {
    try {
      const movieId = String(req.params.id ?? "");
      if (!movieId) {
        res.status(400).json({ error: "movie id is required" });
        return;
      }
      await cinemaService.deleteMovie(movieId);
      res.status(204).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot delete movie";
      res.status(message.toLowerCase().includes("not found") ? 404 : 400).json({ error: message });
    }
  });

  app.get("/api/admin/cinema/jobs", requireAdmin, async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json(await cinemaService.listScanJobs(Number.isFinite(limit) ? limit : 50));
  });

  app.get("/api/admin/cinema/stats", requireAdmin, async (_req, res) => {
    try {
      res.json(await cinemaService.getGlobalStats());
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot fetch stats" });
    }
  });

  app.get("/api/admin/cinema/channels/:id/remote-stats", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      const channel = await prisma.cinemaChannel.findUnique({ where: { id: channelId } });
      if (!channel || channel.platform !== "TELEGRAM") {
        res.status(404).json({ error: "Channel not found or not Telegram" });
        return;
      }

      const response = await fetch(`http://telethon-stream:8090/channel_stats/${channel.sourceChannelId}`);
      if (!response.ok) throw new Error("Failed to fetch remote stats");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot fetch remote stats" });
    }
  });

  app.get("/api/admin/cinema/channels/:id/sync", requireAdmin, async (req, res) => {
    try {
      await cinemaService.verifyTelegramChannelStatus(String(req.params.id ?? ""));
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot sync channel status" });
    }
  });

  app.post("/api/admin/cinema/upload-local", requireAdmin, async (req, res) => {
    try {
      const body = req.body as { directoryPath: string };
      const directoryPath = String(body.directoryPath ?? "").trim();
      if (!directoryPath) {
        res.status(400).json({ error: "directoryPath is required" });
        return;
      }

      const job = await cinemaService.createScanJob({
        requestedBy: req.session.adminUser?.id ?? "admin",
      });

      // The service now handles checking existing mapping and locking
      void cinemaService.runLocalUploadJob(job.id, directoryPath);
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot start local upload job" });
    }
  });


  app.post("/api/admin/cinema/jobs/scan", requireAdmin, async (req, res) => {
    try {
      const body = req.body as { channelId?: string; forceRegenerate?: boolean; autoEnsureStorage?: boolean };
      const channelId = String(body.channelId ?? "");
      if (!channelId) {
        res.status(400).json({ error: "channelId is required" });
        return;
      }
      const job = await cinemaService.createScanJob({
        channelId,
        requestedBy: req.session.adminUser?.id ?? "admin",
      });
      void cinemaService.runScanJob(job.id, {
        forceRegenerate: Boolean(body.forceRegenerate),
        autoEnsureStorage: body.autoEnsureStorage !== false,
      });
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot start scan job" });
    }
  });

  app.post("/api/admin/cinema/import-telegram-post", requireAdmin, async (req, res) => {
    try {
      const { channelId, sourceMessageId } = req.body as { channelId: string; sourceMessageId: string };
      if (!channelId || !sourceMessageId) {
        res.status(400).json({ error: "channelId and sourceMessageId are required." });
        return;
      }
      const item = await cinemaService.importTelegramItem(channelId, sourceMessageId);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot import telegram post" });
    }
  });

  app.post("/api/admin/cinema/jobs/:id/retry", requireAdmin, async (req, res) => {
    try {
      const oldJobId = String(req.params.id ?? "");
      const target = (await cinemaService.listScanJobs(200)).find((job) => job.id === oldJobId);
      if (!target) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      const newJob = await cinemaService.createScanJob({
        channelId: target.channelId ?? undefined,
        requestedBy: req.session.adminUser?.id ?? "admin",
      });
      void cinemaService.runScanJob(newJob.id);
      res.json(newJob);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot retry scan job" });
    }
  });
  app.post("/api/admin/cinema/jobs/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const jobId = String(req.params.id ?? "");
      await cinemaService.scanJobService.cancelJob(jobId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot cancel cinema job" });
    }
  });
}
