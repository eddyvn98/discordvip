import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CinemaAssetKind, CinemaChannelRole, CinemaSourcePlatform } from "@prisma/client";
import { env } from "../../config.js";
import { prisma } from "../../prisma.js";
import { callTelegramApi, pickTelegramMessageFileId } from "./cinema-utils.js";

export class CinemaMediaService {
  public readonly localMediaRoot = path.resolve(process.cwd(), "storage", "cinema-media");

  async runFfmpeg(args: string[]) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`ffmpeg exited with code ${code}. ${stderr.slice(-500)}`));
      });
    });
  }

  async generatePosterAndPreview(input: { sourceUrl: string; itemId: string }) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cinema-scan-"));
    const posterPath = path.join(tmpDir, `${input.itemId}-poster.jpg`);
    const previewPath = path.join(tmpDir, `${input.itemId}-preview.mp4`);
    try {
      await this.runFfmpeg(["-y", "-ss", "00:00:03", "-i", input.sourceUrl, "-frames:v", "1", "-vf", "scale='min(720,iw)':-2", "-q:v", "3", posterPath]);
      await this.runFfmpeg(["-y", "-ss", "00:00:05", "-i", input.sourceUrl, "-t", "6", "-vf", "scale='min(640,iw)':-2", "-an", "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart", previewPath]);
      return { tmpDir, posterPath, previewPath };
    } catch (error) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }
  }

  async persistGeneratedLocalAssets(input: { itemId: string; posterPath: string; previewPath: string }) {
    const thumbsDir = path.join(this.localMediaRoot, "thumbnails");
    const previewsDir = path.join(this.localMediaRoot, "previews");
    await fs.mkdir(thumbsDir, { recursive: true });
    await fs.mkdir(previewsDir, { recursive: true });
    const posterTarget = path.join(thumbsDir, `${input.itemId}.jpg`);
    const previewTarget = path.join(previewsDir, `${input.itemId}.mp4`);
    await fs.copyFile(input.posterPath, posterTarget);
    await fs.copyFile(input.previewPath, previewTarget);
    return {
      posterRef: `localfile://thumbnails/${input.itemId}.jpg`,
      previewRef: `localfile://previews/${input.itemId}.mp4`,
    };
  }

  async upsertGeneratedLocalAssetRefs(input: { itemId: string; posterRef: string; previewRef: string }) {
    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: input.itemId, kind: CinemaAssetKind.POSTER } },
      update: { provider: "local", fileRef: input.posterRef, mimeType: "image/jpeg" },
      create: { itemId: input.itemId, kind: CinemaAssetKind.POSTER, provider: "local", fileRef: input.posterRef, mimeType: "image/jpeg" },
    });
    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: input.itemId, kind: CinemaAssetKind.PREVIEW } },
      update: { provider: "local", fileRef: input.previewRef, mimeType: "video/mp4" },
      create: { itemId: input.itemId, kind: CinemaAssetKind.PREVIEW, provider: "local", fileRef: input.previewRef, mimeType: "video/mp4" },
    });
  }

  async telegramUploadFile(input: { chatId: string; method: "sendPhoto" | "sendVideo"; fieldName: "photo" | "video"; filePath: string }) {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${input.method}`;
    const form = new FormData();
    form.set("chat_id", input.chatId);
    const bytes = await fs.readFile(input.filePath);
    const filename = path.basename(input.filePath);
    const mime = input.fieldName === "photo" ? "image/jpeg" : "video/mp4";
    form.set(input.fieldName, new Blob([bytes], { type: mime }), filename);
    const response = await fetch(url, { method: "POST", body: form });
    if (!response.ok) {
      throw new Error(`Telegram ${input.method} failed with status ${response.status}`);
    }
    const data = (await response.json()) as { ok: boolean; result?: { photo?: Array<{ file_id: string }>; video?: { file_id: string } }; description?: string };
    if (!data.ok || !data.result) {
      throw new Error(data.description || `Telegram ${input.method} returned error`);
    }
    if (input.fieldName === "photo") {
      const photo = data.result.photo?.[data.result.photo.length - 1];
      if (!photo?.file_id) throw new Error("Telegram photo upload missing file_id");
      return photo.file_id;
    }
    const video = data.result.video;
    if (!video?.file_id) throw new Error("Telegram video upload missing file_id");
    return video.file_id;
  }

  async upsertGeneratedAssets(input: { itemId: string; posterFileId: string; previewFileId: string }) {
    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: input.itemId, kind: CinemaAssetKind.POSTER } },
      update: { provider: "telegram", fileRef: `tgfile://${input.posterFileId}`, mimeType: "image/jpeg" },
      create: { itemId: input.itemId, kind: CinemaAssetKind.POSTER, provider: "telegram", fileRef: `tgfile://${input.posterFileId}`, mimeType: "image/jpeg" },
    });
    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: input.itemId, kind: CinemaAssetKind.PREVIEW } },
      update: { provider: "telegram", fileRef: `tgfile://${input.previewFileId}`, mimeType: "video/mp4" },
      create: { itemId: input.itemId, kind: CinemaAssetKind.PREVIEW, provider: "telegram", fileRef: `tgfile://${input.previewFileId}`, mimeType: "video/mp4" },
    });
  }

  async findTelegramStorageChatId(channelId: string) {
    const fullChannel = await prisma.cinemaChannel.findUnique({ where: { id: channelId }, select: { platform: true } });
    if (!fullChannel) throw new Error("Channel not found.");
    if (fullChannel.platform !== CinemaSourcePlatform.TELEGRAM) {
      throw new Error("Scan upload to Telegram storage currently supports TELEGRAM source channels only.");
    }
    const storage = await prisma.cinemaChannel.findFirst({
      where: { isEnabled: true, platform: CinemaSourcePlatform.TELEGRAM, role: { in: [CinemaChannelRole.POSTER_STORAGE, CinemaChannelRole.PREVIEW_STORAGE] } },
      orderBy: [{ updatedAt: "desc" }],
      select: { sourceChannelId: true },
    });
    if (!storage?.sourceChannelId) {
      throw new Error("Chưa cấu hình kênh Telegram storage (POSTER_STORAGE/PREVIEW_STORAGE).");
    }
    return storage.sourceChannelId;
  }

  async refreshTelegramFullAssetFileIdByItemId(itemId: string) {
    const item = await prisma.cinemaItem.findUnique({
      where: { id: itemId },
      include: { channel: { select: { sourceChannelId: true, platform: true } } },
    });
    if (!item?.channel?.sourceChannelId || item.channel.platform !== CinemaSourcePlatform.TELEGRAM) {
      throw new Error("Item/channel Telegram source not found.");
    }
    const sourceMessageId = Number(item.sourceMessageId);
    if (!Number.isFinite(sourceMessageId) || sourceMessageId <= 0) {
      throw new Error("Invalid source message id.");
    }
    const toChatId = String(env.TELEGRAM_VIP_CHAT_ID ?? "").trim();
    if (!toChatId) {
      throw new Error("TELEGRAM_VIP_CHAT_ID is missing.");
    }
    const forwarded = await callTelegramApi<any>("forwardMessage", {
      chat_id: toChatId,
      from_chat_id: item.channel.sourceChannelId,
      message_id: sourceMessageId,
      disable_notification: true,
    });
    const media = pickTelegramMessageFileId(forwarded);
    if (!media?.fileId) {
      throw new Error("Forwarded message has no playable media.");
    }
    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.FULL } },
      update: { provider: "telegram", fileRef: `tgfile://${media.fileId}`, mimeType: media.mimeType || null },
      create: { itemId: item.id, kind: CinemaAssetKind.FULL, provider: "telegram", fileRef: `tgfile://${media.fileId}`, mimeType: media.mimeType || null },
    });
    return media.fileId;
  }
}
