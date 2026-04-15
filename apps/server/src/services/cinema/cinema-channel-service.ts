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
  }) {
    const platform = input.platform === "discord" ? CinemaSourcePlatform.DISCORD : CinemaSourcePlatform.TELEGRAM;
    if (input.id) {
      return prisma.cinemaChannel.update({
        where: { id: input.id },
        data: {
          platform,
          sourceChannelId: input.sourceChannelId.trim(),
          role: input.role,
          displayName: input.displayName.trim(),
          slug: input.slug.trim().toLowerCase(),
          isEnabled: input.isEnabled,
        },
      });
    }
    return prisma.cinemaChannel.create({
      data: {
        platform,
        sourceChannelId: input.sourceChannelId.trim(),
        role: input.role,
        displayName: input.displayName.trim(),
        slug: input.slug.trim().toLowerCase(),
        isEnabled: input.isEnabled,
      },
    });
  }

  async listAllChannels() {
    return prisma.cinemaChannel.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: { _count: { select: { items: true, scanJobs: true } } },
    });
  }

  async deleteChannel(id: string) {
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
}
