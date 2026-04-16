import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { CinemaAssetKind, CinemaChannelRole, CinemaScanJobStatus, CinemaSourcePlatform } from "@prisma/client";
import { prisma } from "../../prisma.js";
import type { CinemaChannelService } from "./cinema-channel-service.js";
import type { CinemaMediaService } from "./cinema-media-service.js";

export class CinemaScanJobService {
  constructor(
    private readonly mediaService: CinemaMediaService,
    private readonly channelService: CinemaChannelService,
  ) {}

  async createScanJob(input: { channelId?: string; requestedBy: string }) {
    return prisma.cinemaScanJob.create({
      data: {
        channelId: input.channelId ?? undefined,
        requestedBy: input.requestedBy,
      },
    });
  }

  async runLocalUploadJob(jobId: string, directoryPath: string) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Upload job not found.");
    await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date() } });

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
        const child = spawn("python3", pythonArgs, { env: process.env });
        let stdout = "";
        let stderr = "";

        child.on("error", (err) => {
          reject(new Error(`Failed to start Python script: ${err.message}`));
        });

        child.stdout.on("data", (data) => {
          const str = data.toString();
          stdout += str;
          console.log(`[Python Stdout]: ${str.trim()}`);
        });
        child.stderr.on("data", (data) => {
          const str = data.toString();
          stderr += str;
          console.error(`[Python Stderr]: ${str.trim()}`);
        });
        child.on("close", (code) => {
          if (code === 0) resolve(stdout);
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
          totalDetected: result.videos.length,
          totalInserted: result.videos.length,
        },
      });

      // 4. Trigger Scan to generate thumbnails
      void this.runScanJob(job.id, { autoEnsureStorage: true });

    } catch (error) {
      await prisma.cinemaScanJob.update({
        where: { id: job.id },
        data: {
          status: CinemaScanJobStatus.FAILED,
          finishedAt: new Date(),
          failureReason: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  async runScanJob(jobId: string, options?: { forceRegenerate?: boolean; autoEnsureStorage?: boolean }) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Scan job not found.");
    await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date() } });
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
      let totalDetected = 0;
      let totalInserted = 0;
      let totalFailed = 0;
      for (const item of items) {
        totalDetected += 1;
        const hasPoster = item.assets.some((asset) => asset.kind === CinemaAssetKind.POSTER);
        const hasPreview = item.assets.some((asset) => asset.kind === CinemaAssetKind.PREVIEW);
        if (!options?.forceRegenerate && hasPoster && hasPreview) continue;
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
          const generated = await this.mediaService.generatePosterAndPreview({ sourceUrl, itemId: item.id });
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
        } catch {
          totalFailed += 1;
        }
        await prisma.cinemaScanJob.update({
          where: { id: job.id },
          data: { totalDetected, totalInserted, totalFailed },
        });
      }
      const allFailed = totalDetected > 0 && totalInserted === 0 && totalFailed >= totalDetected;
      await prisma.cinemaScanJob.update({
        where: { id: job.id },
        data: {
          status: allFailed ? CinemaScanJobStatus.FAILED : CinemaScanJobStatus.SUCCEEDED,
          finishedAt: new Date(),
          totalDetected,
          totalInserted,
          totalFailed,
          failureReason: allFailed
            ? `Không tạo được preview/thumbnail cho ${totalFailed}/${totalDetected} item (kiểm tra URL nguồn hoặc ffmpeg/Telegram storage).`
            : null,
        },
      });
    } catch (error) {
      await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.FAILED, finishedAt: new Date(), totalFailed: 1, failureReason: error instanceof Error ? error.message : String(error) } });
      throw error;
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
