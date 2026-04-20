import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { env } from "../config.js";
import { prisma } from "../prisma.js";
import { CinemaAdminAccessService, type CinemaAccessProfile, type CinemaPermissionAction } from "../services/cinema/cinema-admin-access-service.js";
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

const upsertAdminSchema = z.object({
  platform: z.enum(["discord", "telegram"]),
  platformUserId: z.string().trim().min(1),
  displayName: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

const upsertPermissionSchema = z.object({
  adminId: z.string().trim().min(1),
  channelId: z.string().trim().optional(),
  canView: z.coerce.boolean().optional(),
  canUpload: z.coerce.boolean().optional(),
  canForward: z.coerce.boolean().optional(),
  canManage: z.coerce.boolean().optional(),
  canDelete: z.coerce.boolean().optional(),
});

const resolveRequestSchema = z.object({
  defaultGlobalView: z.coerce.boolean().optional().default(true),
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
  const accessService = new CinemaAdminAccessService();

  const resolveProfile = async (req: Request, res: Response): Promise<CinemaAccessProfile | null> => {
    const actor = accessService.resolveActorFromRequest(req);
    if (!actor) {
      res.status(401).json({ error: "Cannot resolve admin actor from request." });
      return null;
    }
    return accessService.getAccessProfile(actor);
  };

  const requireGlobalAction = async (
    req: Request,
    res: Response,
    action: CinemaPermissionAction,
  ): Promise<CinemaAccessProfile | null> => {
    const profile = await resolveProfile(req, res);
    if (!profile) return null;
    if (accessService.canAccessGlobal(profile, action)) return profile;
    res.status(403).json({ error: `Forbidden: missing ${action} permission.` });
    return null;
  };

  const requireChannelAction = async (
    req: Request,
    res: Response,
    action: CinemaPermissionAction,
    channelId: string,
  ): Promise<CinemaAccessProfile | null> => {
    const profile = await resolveProfile(req, res);
    if (!profile) return null;
    if (accessService.canAccessChannel(profile, channelId, action)) return profile;
    res.status(403).json({ error: `Forbidden: missing ${action} permission for this channel.` });
    return null;
  };

  app.get("/api/admin/cinema/access/me", requireAdmin, async (req, res) => {
    const profile = await resolveProfile(req, res);
    if (!profile) return;

    res.json({
      actor: profile.actor,
      isSuperAdmin: profile.isSuperAdmin,
      mode: profile.mode,
      principal: profile.principal,
      capabilities: {
        globalView: accessService.canAccessGlobal(profile, "view"),
        globalUpload: accessService.canAccessGlobal(profile, "upload"),
        globalForward: accessService.canAccessGlobal(profile, "forward"),
        globalManage: accessService.canAccessGlobal(profile, "manage"),
        globalDelete: accessService.canAccessGlobal(profile, "delete"),
      },
    });
  });

  // Used by telegram_bot_manager with x-internal-secret + x-telegram-user-id
  app.get("/api/admin/cinema/access/telegram/me", requireAdmin, async (req, res) => {
    const profile = await resolveProfile(req, res);
    if (!profile) return;
    if (profile.actor.platform !== "telegram") {
      res.status(400).json({ error: "Actor is not telegram." });
      return;
    }
    const channels = accessService.filterChannelsByAction(profile, await cinemaService.listAllChannels(), "upload");
    res.json({
      actor: profile.actor,
      isSuperAdmin: profile.isSuperAdmin,
      mode: profile.mode,
      uploadChannels: channels.map((channel) => ({
        id: channel.id,
        displayName: channel.displayName,
        sourceChannelId: channel.sourceChannelId,
      })),
    });
  });

  app.get("/api/admin/cinema/access/admins", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    res.json(await accessService.listAdminsWithPermissions());
  });

  app.get("/api/admin/cinema/access/requests", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    res.json(await accessService.listPendingAdminRequests());
  });

  app.post("/api/admin/cinema/access/requests/:id/approve", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    try {
      const body = resolveRequestSchema.parse(req.body ?? {});
      const id = String(req.params.id ?? "");
      res.json(await accessService.approveAdminRequest({ id, defaultGlobalView: body.defaultGlobalView }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot approve request" });
    }
  });

  app.post("/api/admin/cinema/access/requests/:id/reject", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    try {
      const id = String(req.params.id ?? "");
      res.json(await accessService.rejectAdminRequest({ id }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot reject request" });
    }
  });

  app.post("/api/admin/cinema/access/admins/upsert", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    try {
      const body = upsertAdminSchema.parse(req.body);
      res.json(await accessService.upsertAdminPrincipal(body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot upsert admin principal" });
    }
  });

  app.post("/api/admin/cinema/access/permissions/upsert", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    try {
      const body = upsertPermissionSchema.parse(req.body);
      res.json(
        await accessService.upsertPermission({
          ...body,
          channelId: body.channelId?.trim() || null,
        }),
      );
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot upsert cinema permission" });
    }
  });

  app.post("/api/admin/cinema/storage/ensure", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "upload");
    if (!profile) return;
    try {
      await cinemaService.ensureTelegramStorageChannels();
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot ensure storage channel" });
    }
  });

  app.get("/api/admin/cinema/channels", requireAdmin, async (req, res) => {
    const profile = await resolveProfile(req, res);
    if (!profile) return;
    const channels = await cinemaService.listAllChannels();
    res.json(accessService.filterChannelsByAction(profile, channels, "view"));
  });

  app.get("/api/admin/cinema/channels/:id", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      if (!channelId) {
        res.status(400).json({ error: "channel id is required" });
        return;
      }
      const profile = await requireChannelAction(req, res, "view", channelId);
      if (!profile) return;
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
      const profile = await requireChannelAction(req, res, "manage", channelId);
      if (!profile) return;
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
      const profile = await requireChannelAction(req, res, "delete", channelId);
      if (!profile) return;
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
      if (body.id) {
        const profile = await requireChannelAction(req, res, "manage", body.id);
        if (!profile) return;
      } else {
        const profile = await requireGlobalAction(req, res, "manage");
        if (!profile) return;
      }
      res.json(await cinemaService.createOrUpdateChannel({ ...body, platform: body.platform as PlatformKey }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot save cinema channel" });
    }
  });

  app.post("/api/admin/cinema/channels/:id/delete", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      const profile = await requireChannelAction(req, res, "delete", channelId);
      if (!profile) return;
      await cinemaService.deleteChannel(channelId);
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot delete cinema channel" });
    }
  });

  app.post("/api/admin/cinema/channels/create-auto", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "manage");
    if (!profile) return;
    try {
      const { title } = req.body as { title: string };
      res.json(await cinemaService.createNewTelegramChannel(title));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot create auto channel" });
    }
  });

  app.post("/api/admin/cinema/channels/:id/prepare", requireAdmin, async (req, res) => {
    const channelId = String(req.params.id ?? "");
    const profile = await requireChannelAction(req, res, "manage", channelId);
    if (!profile) return;
    try {
      res.json(await cinemaService.ensureTelegramChannelReady(channelId));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot prepare channel" });
    }
  });

  app.post("/api/admin/cinema/admin-copy", requireAdmin, async (req, res) => {
    try {
      const { fromChatId, messageId, targetChannelId } = req.body as { fromChatId: string; messageId: string; targetChannelId: string };
      const profile = await requireChannelAction(req, res, "forward", String(targetChannelId ?? ""));
      if (!profile) return;
      res.json(await cinemaService.adminCopyToChannel({ fromChatId, messageId, targetChannelId }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Admin copy failed" });
    }
  });

  app.get("/api/admin/cinema/movies/web", requireAdmin, async (req, res) => {
    const profile = await resolveProfile(req, res);
    if (!profile) return;
    try {
      const rows = await cinemaService.listWebMoviesForAdmin();
      res.json(rows.filter((row) => accessService.canAccessChannel(profile, row.channelId, "view")));
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
      const target = await prisma.cinemaItem.findUnique({ where: { id: movieId }, select: { channelId: true } });
      if (!target) {
        res.status(404).json({ error: "Movie not found" });
        return;
      }
      const profile = await requireChannelAction(req, res, "manage", target.channelId);
      if (!profile) return;
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
      const target = await prisma.cinemaItem.findUnique({ where: { id: movieId }, select: { channelId: true } });
      if (!target) {
        res.status(404).json({ error: "Movie not found" });
        return;
      }
      const profile = await requireChannelAction(req, res, "delete", target.channelId);
      if (!profile) return;
      await cinemaService.deleteMovie(movieId);
      res.status(204).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot delete movie";
      res.status(message.toLowerCase().includes("not found") ? 404 : 400).json({ error: message });
    }
  });

  app.get("/api/admin/cinema/jobs", requireAdmin, async (req, res) => {
    const profile = await resolveProfile(req, res);
    if (!profile) return;
    const limit = Number(req.query.limit ?? 50);
    const rows = await cinemaService.listScanJobs(Number.isFinite(limit) ? limit : 50);
    const canGlobalView = accessService.canAccessGlobal(profile, "view");
    res.json(
      rows.filter((row) => {
        if (!row.channelId) return canGlobalView;
        return accessService.canAccessChannel(profile, row.channelId, "view");
      }),
    );
  });

  app.get("/api/admin/cinema/stats", requireAdmin, async (req, res) => {
    const profile = await resolveProfile(req, res);
    if (!profile) return;
    try {
      if (accessService.canAccessGlobal(profile, "view")) {
        res.json(await cinemaService.getGlobalStats());
        return;
      }
      const channels = accessService.filterChannelsByAction(profile, await cinemaService.listAllChannels(), "view");
      const channelIds = channels.map((row) => row.id);
      const totalUniqueMovies = channelIds.length
        ? await prisma.cinemaItem.count({
          where: {
            channelId: { in: channelIds },
            remoteStatus: { notIn: ["MISSING_REMOTE", "DELETED_REMOTE"] },
          },
        })
        : 0;
      res.json({
        totalUniqueMovies,
        totalChannels: channels.filter((channel) => channel.role === "FULL_SOURCE").length,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot fetch stats" });
    }
  });

  app.get("/api/admin/cinema/channels/:id/remote-stats", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      const profile = await requireChannelAction(req, res, "view", channelId);
      if (!profile) return;

      const channel = await prisma.cinemaChannel.findUnique({ where: { id: channelId } });
      if (!channel || channel.platform !== "TELEGRAM") {
        res.status(404).json({ error: "Channel not found or not Telegram" });
        return;
      }

      const response = await fetch(`${env.TELETHON_BACKEND_URL}/channel_stats/${channel.sourceChannelId}`);
      if (!response.ok) throw new Error("Failed to fetch remote stats");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot fetch remote stats" });
    }
  });

  app.get("/api/admin/cinema/channels/:id/sync", requireAdmin, async (req, res) => {
    try {
      const channelId = String(req.params.id ?? "");
      const profile = await requireChannelAction(req, res, "manage", channelId);
      if (!profile) return;
      await cinemaService.verifyTelegramChannelStatus(channelId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot sync channel status" });
    }
  });

  app.post("/api/admin/cinema/upload-local", requireAdmin, async (req, res) => {
    const profile = await requireGlobalAction(req, res, "upload");
    if (!profile) return;
    try {
      const body = req.body as { directoryPath: string };
      const directoryPath = String(body.directoryPath ?? "").trim();
      if (!directoryPath) {
        res.status(400).json({ error: "directoryPath is required" });
        return;
      }

      const job = await cinemaService.createScanJob({
        requestedBy: req.session.adminUser?.id ?? `${profile.actor.platform}:${profile.actor.platformUserId}`,
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
      const profile = await requireChannelAction(req, res, "upload", channelId);
      if (!profile) return;
      const job = await cinemaService.createScanJob({
        channelId,
        requestedBy: req.session.adminUser?.id ?? `${profile.actor.platform}:${profile.actor.platformUserId}`,
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
      const profile = await requireChannelAction(req, res, "upload", channelId);
      if (!profile) return;
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
      if (target.channelId) {
        const profile = await requireChannelAction(req, res, "upload", target.channelId);
        if (!profile) return;
      } else {
        const profile = await requireGlobalAction(req, res, "upload");
        if (!profile) return;
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
      const target = (await cinemaService.listScanJobs(200)).find((job) => job.id === jobId);
      if (!target) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      if (target.channelId) {
        const profile = await requireChannelAction(req, res, "manage", target.channelId);
        if (!profile) return;
      } else {
        const profile = await requireGlobalAction(req, res, "manage");
        if (!profile) return;
      }
      await cinemaService.scanJobService.cancelJob(jobId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Cannot cancel cinema job" });
    }
  });
}
