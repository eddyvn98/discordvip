import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { CinemaAssetKind, CinemaChannelRole, CinemaScanJobStatus, CinemaSourcePlatform } from "@prisma/client";
import { prisma } from "../../prisma.js";
import type { CinemaChannelService } from "./cinema-channel-service.js";
import type { CinemaMediaService } from "./cinema-media-service.js";

export class CinemaScanJobService {
  private readonly activeJobs = new Map<string, AbortController>();

  constructor(
    private readonly mediaService: CinemaMediaService,
    private readonly channelService: CinemaChannelService,
  ) {
    // Proactively recover stale jobs on startup (non-blocking)
    void this.recoverStaleJobs();
  }

  async createScanJob(input: { channelId?: string; requestedBy: string }) {
    return prisma.cinemaScanJob.create({
      data: {
        channelId: input.channelId ?? undefined,
        requestedBy: input.requestedBy,
        progress: 0,
        status: CinemaScanJobStatus.QUEUED,
      },
    });
  }

  async runLocalUploadJob(jobId: string, directoryPath: string) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Upload job not found.");

    const controller = new AbortController();
    this.activeJobs.set(jobId, controller);

    await prisma.cinemaScanJob.update({
      where: { id: job.id },
      data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date(), lastHeartbeatAt: new Date() },
    });

    try {
      const folderName = path.basename(directoryPath);
      // Slugify simple
      const slug = folderName.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "local-upload";

      const pythonArgs = [
        path.join(process.cwd(), "../../scripts", "telegram_large_uploader.py"),
        "--folder", directoryPath,
        "--post-title", folderName,
      ];

      const pythonOutput = await new Promise<string>((resolve, reject) => {
        const child = spawn("python3", pythonArgs, { env: process.env, signal: controller.signal });
        let stdout = "";
        let stderr = "";

        child.on("error", (err) => {
          if (err.name === "AbortError") reject(new Error("Job was cancelled."));
          else reject(new Error(`Failed to start Python script: ${err.message}`));
        });

        child.stdout.on("data", (data) => {
          const str = data.toString();
          stdout += str;
          // Subtly update heartbeat on activity
          void prisma.cinemaScanJob.update({ where: { id: jobId }, data: { lastHeartbeatAt: new Date(), progress: 0.3 } }).catch(() => undefined);
        });
        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        child.on("close", (code) => {
          if (code === 0) resolve(stdout);
          else if (controller.signal.aborted) reject(new Error("Job was cancelled."));
          else reject(new Error(`Python script failed (code ${code}): ${stderr}`));
        });
      });

      const result = JSON.parse(pythonOutput.trim()) as {
        channelId: string;
        channelTitle: string;
        videos: Array<{ fileName: string; messageId: number; sizeBytes: number }>;
      };

      // 1. Create CinemaChannel
      const channel = await prisma.cinemaChannel.upsert({
        where: { platform_sourceChannelId: { platform: CinemaSourcePlatform.TELEGRAM, sourceChannelId: result.channelId } },
        update: { displayName: result.channelTitle, isEnabled: true },
        create: {
          platform: CinemaSourcePlatform.TELEGRAM,
          sourceChannelId: result.channelId,
          role: CinemaChannelRole.FULL_SOURCE,
          displayName: result.channelTitle,
          slug: `${slug}-${Date.now().toString(36)}`,
        },
      });

      // 2. Create Items
      for (const v of result.videos) {
        if (controller.signal.aborted) throw new Error("Job was cancelled.");
        const item = await prisma.cinemaItem.upsert({
          where: { channelId_sourceMessageId: { channelId: channel.id, sourceMessageId: String(v.messageId) } },
          update: { title: v.fileName },
          create: {
            channelId: channel.id,
            sourceMessageId: String(v.messageId),
            title: v.fileName,
          },
        });

        // 3. Create Full Asset
        await prisma.cinemaAsset.upsert({
          where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.FULL } },
          update: { fileRef: `tgfile://${result.channelId}:${v.messageId}` },
          create: {
            itemId: item.id,
            kind: CinemaAssetKind.FULL,
            provider: "telegram",
            fileRef: `tgfile://${result.channelId}:${v.messageId}`,
          },
        });
      }

      await prisma.cinemaScanJob.update({
        where: { id: job.id },
        data: {
          channelId: channel.id,
          status: CinemaScanJobStatus.SUCCEEDED,
          finishedAt: new Date(),
          progress: 1.0,
          totalDetected: result.videos.length,
          totalInserted: result.videos.length,
        },
      });

      // 4. Trigger Scan to generate thumbnails
      void this.runScanJob(job.id, { autoEnsureStorage: true });

    } catch (error) {
      const isCancelled = controller.signal.aborted || (error instanceof Error && error.message.includes("cancelled"));
      await prisma.cinemaScanJob.update({
        where: { id: job.id },
        data: {
          status: isCancelled ? CinemaScanJobStatus.CANCELLED : CinemaScanJobStatus.FAILED,
          finishedAt: new Date(),
          failureReason: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async runScanJob(jobId: string, options?: { forceRegenerate?: boolean; autoEnsureStorage?: boolean }) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Scan job not found.");

    const controller = new AbortController();
    this.activeJobs.set(jobId, controller);

    await prisma.cinemaScanJob.update({
      where: { id: job.id },
      data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date(), lastHeartbeatAt: new Date() },
    });

    try {
      if (options?.autoEnsureStorage) {
        await this.channelService.ensureTelegramStorageChannels();
      }
      if (!job.channelId) {
        throw new Error("Scan job must have a channelId.");
      }
      const channelId = job.channelId;
      await this.mediaService.findTelegramStorageChatId(channelId);
      const items = await prisma.cinemaItem.findMany({
        where: { channelId },
        include: {
          assets: true,
          channel: { select: { sourceChannelId: true, platform: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      });
      let totalDetected = items.length;
      let totalInserted = 0;
      let totalFailed = 0;

      for (let i = 0; i < items.length; i++) {
        if (controller.signal.aborted) throw new Error("Job was cancelled.");
        const item = items[i];

        // Update progress and heartbeat every item (or every few)
        const progress = Number((i / items.length).toFixed(2));
        await prisma.cinemaScanJob.update({
          where: { id: jobId },
          data: { progress, lastHeartbeatAt: new Date(), totalDetected, totalInserted, totalFailed },
        });

        const hasPoster = item.assets.some((asset) => asset.kind === CinemaAssetKind.POSTER);
        const hasPreview = item.assets.some((asset) => asset.kind === CinemaAssetKind.PREVIEW);
        if (!options?.forceRegenerate && hasPoster && hasPreview) {
          totalInserted += 1;
          continue;
        }

        const fullAsset = item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL);
        const fullRef = String(fullAsset?.fileRef ?? "");
        let sourceUrl = "";
        if (/^https?:\/\//u.test(fullRef)) {
          sourceUrl = fullRef;
        } else if (fullRef.startsWith("tgfile://")) {
          const sourceChannelId = String(item.channel?.sourceChannelId ?? "").trim();
          const sourceMessageId = String(item.sourceMessageId ?? "").trim();
          if (
            item.channel?.platform === CinemaSourcePlatform.TELEGRAM &&
            /^-100\d+$/u.test(sourceChannelId) &&
            /^\d+$/u.test(sourceMessageId)
          ) {
            sourceUrl = `http://telethon-stream:8090/stream/${encodeURIComponent(sourceChannelId)}/${encodeURIComponent(sourceMessageId)}`;
          }
        }
        if (!sourceUrl) {
          totalFailed += 1;
          continue;
        }
        try {
          const generated = await this.mediaService.generatePosterAndPreview({ sourceUrl, itemId: item.id }, controller.signal);
          const localRefs = await this.mediaService.persistGeneratedLocalAssets({
            itemId: item.id,
            posterPath: generated.posterPath,
            previewPath: generated.previewPath,
          });
          await this.mediaService.upsertGeneratedLocalAssetRefs({
            itemId: item.id,
            posterRef: localRefs.posterRef,
            previewRef: localRefs.previewRef,
          });
          await fs.rm(generated.tmpDir, { recursive: true, force: true }).catch(() => undefined);
          totalInserted += 1;
        } catch (err) {
          if (controller.signal.aborted) throw err;
          totalFailed += 1;
        }
      }

      const allFailed = totalDetected > 0 && totalInserted === 0 && totalFailed >= totalDetected;
      await prisma.cinemaScanJob.update({
        where: { id: job.id },
        data: {
          status: allFailed ? CinemaScanJobStatus.FAILED : CinemaScanJobStatus.SUCCEEDED,
          finishedAt: new Date(),
          progress: 1.0,
          totalDetected,
          totalInserted,
          totalFailed,
          failureReason: allFailed
            ? `Không tạo được preview/thumbnail cho ${totalFailed}/${totalDetected} item (kiểm tra URL nguồn hoặc ffmpeg/Telegram storage).`
            : null,
        },
      });
    } catch (error) {
      const isCancelled = controller.signal.aborted || (error instanceof Error && error.message.includes("cancelled"));
      await prisma.cinemaScanJob.update({
        where: { id: job.id },
        data: {
          status: isCancelled ? CinemaScanJobStatus.CANCELLED : CinemaScanJobStatus.FAILED,
          finishedAt: new Date(),
          failureReason: error instanceof Error ? error.message : String(error),
        },
      });
      if (!isCancelled) throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async cancelJob(jobId: string) {
    const controller = this.activeJobs.get(jobId);
    if (controller) {
      controller.abort();
      this.activeJobs.delete(jobId);
    }
    // Update DB just in case it wasn't caught in the catch block
    await prisma.cinemaScanJob.updateMany({
      where: { id: jobId, status: CinemaScanJobStatus.RUNNING },
      data: { status: CinemaScanJobStatus.CANCELLED, finishedAt: new Date() },
    });
  }

  async recoverStaleJobs() {
    // Jobs stuck in RUNNING for more than 5 minutes since last heartbeat are considered stale
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleJobs = await prisma.cinemaScanJob.findMany({
      where: {
        status: CinemaScanJobStatus.RUNNING,
        OR: [
          { lastHeartbeatAt: { lt: fiveMinutesAgo } },
          { lastHeartbeatAt: null, startedAt: { lt: fiveMinutesAgo } },
        ],
      },
    });

    if (staleJobs.length > 0) {
      console.log(`[CinemaScanJobService] Recovering ${staleJobs.length} stale jobs...`);
      for (const job of staleJobs) {
        await prisma.cinemaScanJob.update({
          where: { id: job.id },
          data: {
            status: CinemaScanJobStatus.FAILED,
            finishedAt: new Date(),
            failureReason: "Job stalled or server restarted (stale heartbeat).",
          },
        });
      }
      console.log(`[CinemaScanJobService] Successfully recovered ${staleJobs.length} stale jobs.`);
    } else {
      console.log("[CinemaScanJobService] No stale jobs found to recover.");
    }
  }

  async listScanJobs(limit = 50) {
    return prisma.cinemaScanJob.findMany({
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      include: { channel: { select: { id: true, displayName: true, platform: true, sourceChannelId: true } } },
    });
  }
}
