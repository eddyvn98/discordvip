import crypto from "node:crypto";

import {
  CinemaAssetKind,
  CinemaChannelRole,
  CinemaScanJobStatus,
  CinemaSourcePlatform,
  Platform,
} from "@prisma/client";
import type { Request } from "express";
import type { Session, SessionData } from "express-session";
import { nanoid } from "nanoid";

import { env } from "../config.js";
import { prisma } from "../prisma.js";
import { MembershipService } from "./membership-service.js";
import type { PlatformKey } from "./platform.js";

type CinemaSession = Session &
  Partial<SessionData> & {
    cinemaUser?: {
      platform: "discord" | "telegram";
      platformUserId: string;
      platformChatId: string;
      isVip: boolean;
      fingerprint: string;
      expiresAt: number;
    };
  };

type EntryTicketPayload = {
  tid: string;
  platform: "discord" | "telegram";
  userId: string;
  chatId: string;
  exp: number;
};

type TelegramInitDataUser = {
  id: string | number;
};

export class CinemaService {
  constructor(private readonly membershipService: MembershipService) {}

  private b64(input: string) {
    return Buffer.from(input, "utf8").toString("base64url");
  }
  private fromB64(input: string) {
    return Buffer.from(input, "base64url").toString("utf8");
  }
  private sign(input: string) {
    return crypto.createHmac("sha256", env.CINEMA_ENTRY_SECRET).update(input).digest("base64url");
  }
  private hash(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
  }
  private nowSec() {
    return Math.floor(Date.now() / 1000);
  }
  private inferMediaTypeFromMime(mimeType?: string | null) {
    const mime = String(mimeType ?? "").toLowerCase();
    if (mime.startsWith("image/")) return "image" as const;
    return "video" as const;
  }
  private buildFingerprint(req: Request) {
    const ip = req.ip || req.socket.remoteAddress || "";
    const ua = String(req.headers["user-agent"] ?? "");
    return this.hash(`${ip}|${ua}`);
  }
  private platformToPrisma(platform: "discord" | "telegram") {
    return platform === "discord" ? Platform.DISCORD : Platform.TELEGRAM;
  }
  private verifyTelegramInitData(initData: string) {
    if (!initData?.trim()) throw new Error("Missing Telegram initData.");
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) throw new Error("Missing Telegram hash.");
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(env.TELEGRAM_BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (expectedHash !== hash) throw new Error("Invalid Telegram initData signature.");
    const authDate = Number(params.get("auth_date") ?? "0");
    if (!Number.isFinite(authDate) || authDate <= 0) throw new Error("Invalid Telegram auth_date.");
    const maxAgeSec = 60 * 15;
    if (Math.abs(this.nowSec() - authDate) > maxAgeSec) throw new Error("Telegram initData expired.");
    const userRaw = params.get("user");
    if (!userRaw) throw new Error("Missing Telegram user payload.");
    const user = JSON.parse(userRaw) as TelegramInitDataUser;
    const userId = String(user.id ?? "").trim();
    if (!userId) throw new Error("Invalid Telegram user payload.");
    return { userId };
  }

  async createEntryUrl(input: { platform: "discord" | "telegram"; platformUserId: string; platformChatId: string }) {
    if (!env.CINEMA_WEB_ENABLED) throw new Error("Cinema web feature is currently disabled.");
    const vip = await this.membershipService.getLatestActiveMembershipForPlatformUser({
      platform: input.platform,
      platformUserId: input.platformUserId,
    });
    if (!vip || vip.expireAt.getTime() <= Date.now()) throw new Error("VIP is required to access the cinema web.");

    const payload: EntryTicketPayload = {
      tid: nanoid(24),
      platform: input.platform,
      userId: input.platformUserId,
      chatId: input.platformChatId,
      exp: this.nowSec() + env.CINEMA_ENTRY_TICKET_TTL_SECONDS,
    };
    // Short opaque token for Telegram WebApp URL reliability.
    const token = nanoid(32);
    await prisma.cinemaAccessTicket.create({
      data: {
        tokenHash: this.hash(token),
        platform: this.platformToPrisma(input.platform),
        platformUserId: input.platformUserId,
        platformChatId: input.platformChatId,
        expiresAt: new Date(payload.exp * 1000),
      },
    });
    const url = new URL(`/api/cinema/e/${token}`, env.CINEMA_PUBLIC_BASE_URL);
    return url.toString();
  }

  async exchangeEntryTicket(session: CinemaSession, req: Request, token: string, telegramInitData?: string) {
    const tokenHash = this.hash(token);
    const fingerprint = this.buildFingerprint(req);
    const dbTicket = await prisma.cinemaAccessTicket.findUnique({ where: { tokenHash } });
    if (!dbTicket) throw new Error("Entry ticket is invalid.");
    if (dbTicket.platform === Platform.TELEGRAM) {
      const verified = this.verifyTelegramInitData(String(telegramInitData ?? ""));
      if (verified.userId !== dbTicket.platformUserId) {
        throw new Error("Telegram account does not match this entry ticket.");
      }
    }
    if (dbTicket.status === "USED") {
      // Idempotent reopen support for Telegram WebView reloads on the same device.
      if (dbTicket.usedFingerprint === fingerprint && dbTicket.expiresAt.getTime() > Date.now()) {
        const expiresAt = Date.now() + env.CINEMA_WEB_SESSION_TTL_HOURS * 60 * 60 * 1000;
        session.cinemaUser = {
          platform: dbTicket.platform === "TELEGRAM" ? "telegram" : "discord",
          platformUserId: dbTicket.platformUserId,
          platformChatId: dbTicket.platformChatId,
          isVip: true,
          fingerprint,
          expiresAt,
        };
        return {
          ok: true,
          reused: true,
          expiresAt,
          user: {
            platform: dbTicket.platform === "TELEGRAM" ? "telegram" : "discord",
            platformUserId: dbTicket.platformUserId,
          },
        };
      }
      throw new Error("Entry ticket is invalid or already used.");
    }
    if (dbTicket.status !== "ACTIVE") throw new Error("Entry ticket is invalid or already used.");
    if (dbTicket.expiresAt.getTime() <= Date.now()) {
      await prisma.cinemaAccessTicket.update({ where: { id: dbTicket.id }, data: { status: "EXPIRED" } });
      throw new Error("Entry ticket has expired.");
    }
    const platform = dbTicket.platform === "TELEGRAM" ? "telegram" : "discord";
    const vip = await this.membershipService.getLatestActiveMembershipForPlatformUser({
      platform,
      platformUserId: dbTicket.platformUserId,
    });
    if (!vip || vip.expireAt.getTime() <= Date.now()) throw new Error("VIP is required to access the cinema web.");

    await prisma.cinemaAccessTicket.update({
      where: { id: dbTicket.id },
      data: { status: "USED", usedAt: new Date(), usedFingerprint: fingerprint },
    });
    const expiresAt = Date.now() + env.CINEMA_WEB_SESSION_TTL_HOURS * 60 * 60 * 1000;
    session.cinemaUser = {
      platform,
      platformUserId: dbTicket.platformUserId,
      platformChatId: dbTicket.platformChatId,
      isVip: true,
      fingerprint,
      expiresAt,
    };
    return { ok: true, expiresAt, user: { platform, platformUserId: dbTicket.platformUserId } };
  }

  async exchangeTelegramWebAppSession(session: CinemaSession, req: Request, telegramInitData: string) {
    const verified = this.verifyTelegramInitData(telegramInitData);
    const platform = "telegram" as const;
    const platformUserId = verified.userId;
    const vip = await this.membershipService.getLatestActiveMembershipForPlatformUser({
      platform,
      platformUserId,
    });
    if (!vip || vip.expireAt.getTime() <= Date.now()) throw new Error("VIP is required to access the cinema web.");

    const fingerprint = this.buildFingerprint(req);
    const expiresAt = Date.now() + env.CINEMA_WEB_SESSION_TTL_HOURS * 60 * 60 * 1000;
    session.cinemaUser = {
      platform,
      platformUserId,
      platformChatId: vip.platformChatId ?? "",
      isVip: true,
      fingerprint,
      expiresAt,
    };
    return { ok: true, expiresAt, user: { platform, platformUserId } };
  }

  requireCinemaSession(req: Request) {
    const session = req.session as CinemaSession;
    const cinemaUser = session.cinemaUser;
    if (!cinemaUser) throw new Error("Cinema session not found.");
    if (cinemaUser.expiresAt <= Date.now()) {
      delete session.cinemaUser;
      throw new Error("Cinema session has expired.");
    }
    if (this.buildFingerprint(req) !== cinemaUser.fingerprint) throw new Error("Cinema session is invalid on this device.");
    return cinemaUser;
  }

  async listChannels() {
    return prisma.cinemaChannel.findMany({
      where: { isEnabled: true, role: CinemaChannelRole.FULL_SOURCE },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, displayName: true, slug: true, platform: true, sourceChannelId: true, updatedAt: true },
    });
  }

  async listItems(channelId: string) {
    return prisma.cinemaItem.findMany({ where: { channelId }, orderBy: [{ createdAt: "desc" }], include: { assets: true } });
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
              where: { kind: CinemaAssetKind.POSTER },
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
      posterUrl: channel.items[0]?.assets[0]?.fileRef ?? null,
      updatedAt: channel.updatedAt,
    }));
  }

  async listItemsForWeb(channelId: string) {
    const items = await prisma.cinemaItem.findMany({
      where: { channelId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        assets: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });

    return items.map((item) => {
      const fullAsset = item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL);
      return {
      id: item.id,
      channelId: item.channelId,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt,
      posterUrl: item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null,
      previewUrl: item.assets.find((asset) => asset.kind === CinemaAssetKind.PREVIEW)?.fileRef ?? null,
      hasFull: item.assets.some((asset) => asset.kind === CinemaAssetKind.FULL),
      mediaType: this.inferMediaTypeFromMime(fullAsset?.mimeType),
      };
    });
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
      title: item.title,
      description: item.description,
      posterUrl: item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null,
      mediaType: this.inferMediaTypeFromMime(item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL)?.mimeType),
      related: related.map((row) => ({
        id: row.id,
        title: row.title,
        posterUrl: row.assets[0]?.fileRef ?? null,
      })),
    };
  }

  private makeStreamToken(input: { itemId: string; kind: "full"; userId: string }) {
    const exp = this.nowSec() + env.CINEMA_STREAM_TOKEN_TTL_SECONDS;
    const payload = this.b64(JSON.stringify({ ...input, exp }));
    return `${payload}.${this.sign(payload)}`;
  }
  private parseStreamToken(token: string) {
    const [payloadEncoded, signature] = token.split(".");
    if (!payloadEncoded || !signature || this.sign(payloadEncoded) !== signature) throw new Error("Invalid stream token.");
    const payload = JSON.parse(this.fromB64(payloadEncoded)) as { itemId: string; kind: "full"; userId: string; exp: number };
    if (payload.exp <= this.nowSec()) throw new Error("Stream token has expired.");
    return payload;
  }

  async getSignedPlaybackLinks(input: { itemId: string; userId: string }) {
    const fullAsset = await prisma.cinemaAsset.findFirst({
      where: { itemId: input.itemId, kind: CinemaAssetKind.FULL },
      select: { mimeType: true },
    });
    const mediaType = this.inferMediaTypeFromMime(fullAsset?.mimeType);
    return {
      fullUrl: `/api/cinema/stream/${input.itemId}/full?token=${encodeURIComponent(this.makeStreamToken({ itemId: input.itemId, kind: "full", userId: input.userId }))}`,
      mediaType,
    };
  }

  async resolveStream(input: { itemId: string; kind: "full"; token: string; userId: string }) {
    const payload = this.parseStreamToken(input.token);
    if (payload.userId !== input.userId || payload.itemId !== input.itemId || payload.kind !== input.kind) {
      throw new Error("Stream token does not match this user or item.");
    }
    return prisma.cinemaAsset.findFirst({
      where: { itemId: input.itemId, kind: CinemaAssetKind.FULL },
    }).then((asset) => {
      if (!asset) throw new Error("Asset not found.");
      return asset;
    });
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
  async createScanJob(input: { channelId: string; requestedBy: string }) {
    return prisma.cinemaScanJob.create({ data: { channelId: input.channelId, requestedBy: input.requestedBy } });
  }
  async runScanJob(jobId: string) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Scan job not found.");
    await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date() } });
    try {
      const item = await prisma.cinemaItem.create({
        data: { channelId: job.channelId, sourceMessageId: nanoid(12), title: `Imported item ${new Date().toISOString()}`, description: "Auto-imported placeholder item from scan job." },
      });
      await prisma.cinemaAsset.createMany({
        data: [
          { itemId: item.id, kind: CinemaAssetKind.PREVIEW, provider: "placeholder", fileRef: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", mimeType: "video/mp4" },
          { itemId: item.id, kind: CinemaAssetKind.FULL, provider: "placeholder", fileRef: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", mimeType: "video/mp4" },
        ],
      });
      await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.SUCCEEDED, finishedAt: new Date(), totalDetected: 1, totalInserted: 1 } });
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
