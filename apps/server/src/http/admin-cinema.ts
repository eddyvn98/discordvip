import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

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
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
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

  app.get("/api/admin/cinema/jobs", requireAdmin, async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json(await cinemaService.listScanJobs(Number.isFinite(limit) ? limit : 50));
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
