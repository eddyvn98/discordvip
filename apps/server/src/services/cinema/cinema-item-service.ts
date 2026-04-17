import { CinemaAssetKind, CinemaChannelRole, CinemaSourcePlatform } from "@prisma/client";
import crypto from "node:crypto";
import { prisma } from "../../prisma.js";
import type { CinemaViewService } from "./cinema-view-service.js";
import { extractActorsAndGenres, inferMediaTypeFromMime, toPrettyMovieTitle, toWebAssetRef, callTelegramApi } from "./cinema-utils.js";

import type { ListItemsForWebInput, TelegramChannelPostInput } from "./types.js";

export class CinemaItemService {
  constructor(private readonly viewService: CinemaViewService) {}

  async listWebMoviesForAdmin() {
    const items = await prisma.cinemaItem.findMany({
      where: {
        remoteStatus: { notIn: ["MISSING_REMOTE", "DELETED_REMOTE"] },
        assets: {
          some: { kind: CinemaAssetKind.FULL },
        },
      },
      include: {
        channel: {
          select: {
            id: true,
            displayName: true,
            sourceChannelId: true,
            platform: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return items.map((item) => ({
      id: item.id,
      channelId: item.channelId,
      title: item.title,
      remoteStatus: item.remoteStatus,
      createdAt: item.createdAt,
      channel: item.channel,
    }));
  }

  async renameMovie(itemId: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) {
      throw new Error("title is required.");
    }
    const item = await prisma.cinemaItem.findUnique({
      where: { id: itemId },
      select: { id: true, channelId: true },
    });
    if (!item) {
      throw new Error("Movie not found.");
    }

    const duplicate = await prisma.cinemaItem.findFirst({
      where: {
        channelId: item.channelId,
        id: { not: itemId },
        title: {
          equals: nextTitle,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error("A movie with the same name already exists in this channel.");
    }

    return prisma.cinemaItem.update({
      where: { id: itemId },
      data: { title: nextTitle },
    });
  }

  async deleteMovie(itemId: string) {
    const item = await prisma.cinemaItem.findUnique({
      where: { id: itemId },
      select: { id: true },
    });
    if (!item) {
      throw new Error("Movie not found.");
    }
    return prisma.cinemaItem.delete({
      where: { id: itemId },
    });
  }

  async listItems(channelId: string) {
    return prisma.cinemaItem.findMany({ where: { channelId }, orderBy: [{ createdAt: "desc" }], include: { assets: true } });
  }

  async listItemsForWeb(channelId: string, options: ListItemsForWebInput = {}) {
    await this.viewService.ensureViewTables();
    const items = await prisma.cinemaItem.findMany({
      where: { 
        channelId, 
        remoteStatus: { notIn: ["MISSING_REMOTE", "DELETED_REMOTE"] }
      },
      orderBy: [{ createdAt: "desc" }],

      include: {
        assets: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });

    const viewStats = await this.viewService.getViewStatsMap(items.map((item) => item.id), options.userKey);
    let rows = items.map((item) => {
      const displayTitle = toPrettyMovieTitle(item.title, item.sourceMessageId ?? item.id);
      const entities = extractActorsAndGenres({ title: displayTitle, description: item.description });
      const fullAsset = item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL);
      const stats = viewStats.get(item.id) ?? { viewCount: 0, viewedByCurrentUser: false };
      return {
        id: item.id,
        channelId: item.channelId,
        title: displayTitle,
        description: item.description,
        createdAt: item.createdAt,
        posterUrl: toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null),
        previewUrl: toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.PREVIEW)?.fileRef ?? null),
        hasFull: item.assets.some((asset) => asset.kind === CinemaAssetKind.FULL),
        mediaType: inferMediaTypeFromMime(fullAsset?.mimeType),
        actors: entities.actors,
        genres: entities.genres,
        viewCount: stats.viewCount,
        viewedByCurrentUser: stats.viewedByCurrentUser,
      };
    });

    const sort = options.sort ?? "newest";
    if (sort === "oldest") {
      rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else if (sort === "most_viewed") {
      rows.sort((a, b) => b.viewCount - a.viewCount || b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sort === "least_viewed") {
      rows.sort((a, b) => a.viewCount - b.viewCount || b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sort === "unseen") {
      rows = rows.filter((item) => !item.viewedByCurrentUser);
    } else if (sort === "random") {
      rows = rows
        .map((item) => ({ item, rand: crypto.randomInt(0, 1_000_000_000) }))
        .sort((a, b) => a.rand - b.rand)
        .map((entry) => entry.item);
    } else {
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return rows;
  }

  async listFeedItemsForWeb(input: { userKey?: string; limit?: number }) {
    const limit = Math.max(20, Math.min(Number(input.limit ?? 120), 400));
    const items = await prisma.cinemaItem.findMany({
      where: { remoteStatus: { notIn: ["MISSING_REMOTE", "DELETED_REMOTE"] } },
      orderBy: [{ createdAt: "desc" }],

      include: {
        channel: { select: { id: true, displayName: true, slug: true } },
        assets: { orderBy: [{ createdAt: "desc" }] },
      },
      take: limit,
    });

    return items
      .map((item) => {
        const fullAsset = item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL);
        if (!fullAsset) return null;
        return {
          id: item.id,
          channelId: item.channelId,
          title: toPrettyMovieTitle(item.title, item.sourceMessageId ?? item.id),
          createdAt: item.createdAt,
          posterUrl: toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null),
          previewUrl: toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.PREVIEW)?.fileRef ?? null),
          mediaType: inferMediaTypeFromMime(fullAsset.mimeType),
          channel: {
            id: item.channel.id,
            displayName: item.channel.displayName,
            slug: item.channel.slug,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getItemForWeb(itemId: string) {
    const item = await prisma.cinemaItem.findUnique({
      where: { id: itemId },
      include: {
        channel: {
          select: { id: true, displayName: true, slug: true },
        },
        assets: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
    if (!item) throw new Error("Item not found.");

    const related = await prisma.cinemaItem.findMany({
      where: { channelId: item.channelId, id: { not: item.id } },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
      include: {
        assets: {
          where: { kind: CinemaAssetKind.POSTER },
          take: 1,
        },
      },
    });

    return {
      id: item.id,
      channel: item.channel,
      title: toPrettyMovieTitle(item.title, item.sourceMessageId ?? item.id),
      description: item.description,
      posterUrl: toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null),
      mediaType: inferMediaTypeFromMime(item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL)?.mimeType),
      related: related.map((row) => ({
        id: row.id,
        title: toPrettyMovieTitle(row.title, row.sourceMessageId ?? row.id),
        posterUrl: toWebAssetRef(row.assets[0]?.fileRef ?? null),
      })),
    };
  }

  async getTelegramSourceForItem(itemId: string) {
    const item = await prisma.cinemaItem.findUnique({
      where: { id: itemId },
      select: {
        sourceMessageId: true,
        channel: { select: { sourceChannelId: true, platform: true } },
      },
    });
    const sourceChannelId = String(item?.channel?.sourceChannelId ?? "").trim();
    const sourceMessageId = String(item?.sourceMessageId ?? "").trim();
    if (item?.channel?.platform !== CinemaSourcePlatform.TELEGRAM) return null;
    if (!/^-100\d+$/u.test(sourceChannelId) || !/^\d+$/u.test(sourceMessageId)) return null;
    return {
      channelId: Number(sourceChannelId),
      messageId: Number(sourceMessageId),
    };
  }

  async importTelegramChannelPost(input: TelegramChannelPostInput) {
    const channel = await prisma.cinemaChannel.findFirst({
      where: {
        isEnabled: true,
        role: CinemaChannelRole.FULL_SOURCE,
        platform: CinemaSourcePlatform.TELEGRAM,
        sourceChannelId: input.chatId,
      },
      select: { id: true, displayName: true },
    });
    if (!channel) return;

    const sourceMessageId = String(input.messageId);
    const titleBase = (input.caption || input.text || "").trim();
    const title = toPrettyMovieTitle(titleBase || `Telegram post #${sourceMessageId}`, sourceMessageId);
    const description = (input.caption || input.text || "").trim() || null;
    const createdAt = input.date ? new Date(input.date * 1000) : undefined;

    const item = await prisma.cinemaItem.upsert({
      where: { channelId_sourceMessageId: { channelId: channel.id, sourceMessageId } },
      update: {
        title,
        description,
      },
      create: {
        channelId: channel.id,
        sourceMessageId,
        title,
        description,
        createdAt,
      },
    });

    let fullFileId = "";
    let fullMimeType = "";
    let durationSeconds: number | null = null;
    let posterFileId = "";

    if (input.video?.fileId) {
      fullFileId = input.video.fileId;
      fullMimeType = input.video.mimeType || "video/mp4";
      durationSeconds = input.video.duration ?? null;
      posterFileId = input.video.thumbnailFileId ?? "";
    } else if (input.photoFileIds?.length) {
      fullFileId = input.photoFileIds[input.photoFileIds.length - 1]!;
      fullMimeType = "image/jpeg";
      posterFileId = fullFileId;
    } else if (input.document?.fileId) {
      fullFileId = input.document.fileId;
      fullMimeType = input.document.mimeType || "";
      if (fullMimeType.startsWith("image/")) posterFileId = fullFileId;
    } else {
      return;
    }

    await prisma.cinemaItem.update({
      where: { id: item.id },
      data: {
        durationSeconds,
      },
    });

    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.FULL } },
      update: {
        provider: "telegram",
        fileRef: `tgfile://${fullFileId}`,
        mimeType: fullMimeType || null,
      },
      create: {
        itemId: item.id,
        kind: CinemaAssetKind.FULL,
        provider: "telegram",
        fileRef: `tgfile://${fullFileId}`,
        mimeType: fullMimeType || null,
      },
    });

    if (posterFileId) {
      await prisma.cinemaAsset.upsert({
        where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.POSTER } },
        update: { provider: "telegram", fileRef: `tgfile://${posterFileId}`, mimeType: "image/jpeg" },
        create: { itemId: item.id, kind: CinemaAssetKind.POSTER, provider: "telegram", fileRef: `tgfile://${posterFileId}`, mimeType: "image/jpeg" },
      });
    }

    if (input.video?.fileId) {
      await prisma.cinemaAsset.upsert({
        where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.PREVIEW } },
        update: { provider: "telegram", fileRef: `tgfile://${input.video.fileId}`, mimeType: input.video.mimeType || "video/mp4" },
        create: { itemId: item.id, kind: CinemaAssetKind.PREVIEW, provider: "telegram", fileRef: `tgfile://${input.video.fileId}`, mimeType: input.video.mimeType || "video/mp4" },
      });
    }
  }

  async verifyTelegramItemStatus(id: string, storageChatId: string) {

    const item = await prisma.cinemaItem.findUnique({
      where: { id },
      include: { channel: { select: { sourceChannelId: true, platform: true } } },
    });
    if (!item || item.channel?.platform !== CinemaSourcePlatform.TELEGRAM) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`http://telethon-stream:8090/check_message/${item.channel.sourceChannelId}/${item.sourceMessageId}`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error("message to forward not found");
      }

      await prisma.cinemaItem.update({
        where: { id },
        data: { remoteStatus: "SYNCED" },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("message to forward not found") || msg.includes("forbidden") || msg.includes("chat not found") || msg.includes("Not Found")) {
        await prisma.cinemaItem.update({
          where: { id },
          data: { remoteStatus: "MISSING_REMOTE" },
        });
      } else {
        console.error(`[CinemaItemService] Unknown verify status for ${item.id}:`, error);
      }
    }
  }
}
