import { CinemaChannelRole, CinemaSourcePlatform } from "@prisma/client";
import { env } from "../../config.js";
import { prisma } from "../../prisma.js";
import type { PlatformKey } from "../platform.js";
import { toWebAssetRef } from "./cinema-utils.js";

export class CinemaChannelService {
  async listChannels() {
    return prisma.cinemaChannel.findMany({
      where: { isEnabled: true, role: CinemaChannelRole.FULL_SOURCE },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, displayName: true, slug: true, platform: true, sourceChannelId: true, updatedAt: true },
    });
  }

  async listChannelsForWeb() {
    const channels = await prisma.cinemaChannel.findMany({
      where: { isEnabled: true, role: CinemaChannelRole.FULL_SOURCE },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: [{ createdAt: "desc" }],
          take: 1,
          include: {
            assets: {
              where: { kind: "POSTER" },
              take: 1,
              orderBy: [{ createdAt: "desc" }],
            },
          },
        },
      },
    });

    return channels.map((channel) => ({
      id: channel.id,
      slug: channel.slug,
      displayName: channel.displayName,
      itemCount: channel._count.items,
      posterUrl: toWebAssetRef(channel.items[0]?.assets[0]?.fileRef ?? null),
      updatedAt: channel.updatedAt,
    }));
  }

  async createOrUpdateChannel(input: {
    id?: string;
    platform: PlatformKey;
    sourceChannelId: string;
    role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE";
    displayName: string;
    slug: string;
    isEnabled: boolean;
    localPath?: string;
    remoteStatus?: string;
  }) {
    const platform = input.platform === "discord" ? CinemaSourcePlatform.DISCORD : CinemaSourcePlatform.TELEGRAM;
    const data = {
      platform,
      sourceChannelId: input.sourceChannelId.trim(),
      role: input.role,
      displayName: input.displayName.trim(),
      slug: input.slug.trim().toLowerCase(),
      isEnabled: input.isEnabled,
      localPath: input.localPath?.trim() || null,
      remoteStatus: input.remoteStatus || "ACTIVE",
    };

    if (input.id) {
      return prisma.cinemaChannel.update({
        where: { id: input.id },
        data,
      });
    }
    return prisma.cinemaChannel.create({
      data,
    });
  }

  async findByLocalPath(localPath: string) {
    if (!localPath) return null;
    return prisma.cinemaChannel.findUnique({
      where: { localPath: localPath.trim() },
    });
  }


  async listAllChannels() {
    const channels = await prisma.cinemaChannel.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        items: {
          orderBy: [{ createdAt: "desc" }],
          take: 1,
          include: {
            assets: {
              where: { kind: "POSTER" },
              take: 1,
              orderBy: [{ createdAt: "desc" }],
            },
          },
        },
        _count: {
          select: { scanJobs: true },
        },
      },
    });

    // Map channels with item counts
    return await Promise.all(
      channels.map(async (channel) => {
        const [totalItems, syncedItems] = await Promise.all([
          prisma.cinemaItem.count({ where: { channelId: channel.id } }),
          prisma.cinemaItem.count({
            where: {
              channelId: channel.id,
              remoteStatus: { notIn: ["MISSING_REMOTE", "DELETED_REMOTE"] },
            },
          }),
        ]);

        return {
          ...channel,
          _count: {
            ...channel._count,
            items: totalItems,
          },
          syncedItemsCount: syncedItems,
          posterUrl: toWebAssetRef(channel.items[0]?.assets[0]?.fileRef ?? null),
        };
      })
    );
  }

  async getChannelDetailWithMovies(id: string) {
    const channel = await prisma.cinemaChannel.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ createdAt: "desc" }],
          include: {
            assets: {
              where: { kind: "POSTER" },
              take: 1,
              orderBy: [{ createdAt: "desc" }],
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
    if (!channel) {
      throw new Error("Channel not found.");
    }
    return {
      id: channel.id,
      displayName: channel.displayName,
      role: channel.role,
      platform: channel.platform,
      sourceChannelId: channel.sourceChannelId,
      isEnabled: channel.isEnabled,
      remoteStatus: channel.remoteStatus,
      movieCount: channel._count.items,
      movies: channel.items.map((item) => ({
        id: item.id,
        title: item.title,
        remoteStatus: item.remoteStatus,
        createdAt: item.createdAt,
        posterUrl: toWebAssetRef(item.assets[0]?.fileRef ?? null),
      })),
    };
  }

  async renameChannel(id: string, displayName: string) {
    const nextName = displayName.trim();
    if (!nextName) {
      throw new Error("displayName is required.");
    }
    return prisma.cinemaChannel.update({
      where: { id },
      data: { displayName: nextName },
    });
  }

  async deleteChannel(id: string) {
    const channel = await prisma.cinemaChannel.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!channel) {
      throw new Error("Channel not found.");
    }
    if (channel.role !== CinemaChannelRole.FULL_SOURCE) {
      throw new Error("Only FULL_SOURCE channels can be deleted in admin.");
    }

    const runningJobsCount = await prisma.cinemaScanJob.count({
      where: {
        channelId: id,
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });
    if (runningJobsCount > 0) {
      throw new Error("Channel has running scan jobs. Please stop jobs before deleting.");
    }

    return prisma.cinemaChannel.delete({ where: { id } });
  }

  async ensureTelegramStorageChannels() {
    const defaultChatId = String(env.TELEGRAM_VIP_CHAT_ID ?? "").trim();
    if (!defaultChatId) {
      throw new Error("TELEGRAM_VIP_CHAT_ID chưa được cấu hình.");
    }
    const bySlug = await prisma.cinemaChannel.findUnique({
      where: { slug: "tg-storage-preview" },
      select: { id: true },
    });
    if (bySlug) {
      await prisma.cinemaChannel.update({
        where: { id: bySlug.id },
        data: {
          platform: CinemaSourcePlatform.TELEGRAM,
          role: CinemaChannelRole.PREVIEW_STORAGE,
          isEnabled: true,
          displayName: "Telegram Storage Preview",
        },
      });
      return;
    }

    await prisma.cinemaChannel.create({
      data: {
        platform: CinemaSourcePlatform.TELEGRAM,
        sourceChannelId: defaultChatId,
        role: CinemaChannelRole.PREVIEW_STORAGE,
        isEnabled: true,
        slug: "tg-storage-preview",
        displayName: "Telegram Storage Preview",
      },
    });
  }

  async verifyTelegramChannelStatus(id: string) {
    const channel = await prisma.cinemaChannel.findUnique({ where: { id } });
    if (!channel || channel.platform !== CinemaSourcePlatform.TELEGRAM) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${env.TELETHON_BACKEND_URL}/check_channel/${channel.sourceChannelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: channel.platform }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error("chat not found");
      }

      await prisma.cinemaChannel.update({
        where: { id },
        data: { remoteStatus: "ACTIVE" },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("chat not found") || msg.includes("forbidden") || msg.includes("Not Found")) {
        await prisma.cinemaChannel.update({
          where: { id },
          data: { remoteStatus: "DELETED_REMOTE" },
        });
      } else {
        console.error(`[CinemaChannelService] Unknown verify status for ${channel.id}:`, error);
      }
    }
  }

  async ensureTelegramChannelReady(id: string) {
    const channel = await prisma.cinemaChannel.findUnique({ where: { id } });
    if (!channel || channel.platform !== CinemaSourcePlatform.TELEGRAM) {
      throw new Error("Channel not found or not Telegram");
    }

    try {
      // 1. Check if bot is admin
      // We can try to setup bot admin regardless to ensure permissions
      const botId = process.env.TELEGRAM_BOT_TOKEN?.split(":")[0];
      if (!botId) throw new Error("TELEGRAM_BOT_TOKEN is missing in server env");

      const res = await fetch(`${env.TELETHON_BACKEND_URL}/setup_bot_admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: Number(channel.sourceChannelId), // This should be numeric
          bot_id: botId,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`[CinemaChannelService] Failed to setup bot admin for ${channel.id}:`, err);
        // We don't throw yet, as it might already be admin
      }

      return { ok: true };
    } catch (error) {
      console.error(`[CinemaChannelService] Error in ensureTelegramChannelReady:`, error);
      throw error;
    }
  }

  async createNewTelegramChannel(title: string) {
    const res = await fetch(`${env.TELETHON_BACKEND_URL}/create_channel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create channel: ${await res.text()}`);
    }

    const data = await res.json() as { channel_id: number; id: number };

    // Register in DB
    const channel = await this.createOrUpdateChannel({
      platform: "telegram",
      sourceChannelId: String(data.channel_id),
      role: "FULL_SOURCE",
      displayName: title,
      slug: `tg-${Date.now()}`,
      isEnabled: true,
    });

    // Setup bot as admin
    await this.ensureTelegramChannelReady(channel.id);

    return channel;
  }
}
