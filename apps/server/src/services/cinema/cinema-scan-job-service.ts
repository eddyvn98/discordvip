import { promises as fs } from "node:fs";
import { CinemaAssetKind, CinemaScanJobStatus, CinemaSourcePlatform } from "@prisma/client";
import { prisma } from "../../prisma.js";
import type { CinemaChannelService } from "./cinema-channel-service.js";
import type { CinemaMediaService } from "./cinema-media-service.js";

export class CinemaScanJobService {
  constructor(
    private readonly mediaService: CinemaMediaService,
    private readonly channelService: CinemaChannelService,
  ) {}

  async createScanJob(input: { channelId: string; requestedBy: string }) {
    return prisma.cinemaScanJob.create({ data: { channelId: input.channelId, requestedBy: input.requestedBy } });
  }

  async runScanJob(jobId: string, options?: { forceRegenerate?: boolean; autoEnsureStorage?: boolean }) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Scan job not found.");
    await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date() } });
    try {
      if (options?.autoEnsureStorage) {
        await this.channelService.ensureTelegramStorageChannels();
      }
      await this.mediaService.findTelegramStorageChatId(job.channelId);
      const items = await prisma.cinemaItem.findMany({
        where: { channelId: job.channelId },
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
