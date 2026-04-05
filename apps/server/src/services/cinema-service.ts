import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

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

type ListItemsForWebInput = {
  sort?: "newest" | "oldest" | "most_viewed" | "least_viewed" | "unseen" | "random";
  userKey?: string;
};

type TelegramChannelPostInput = {
  chatId: string;
  chatTitle: string;
  messageId: number;
  date?: number;
  text?: string;
  caption?: string;
  video?: {
    fileId: string;
    mimeType?: string;
    duration?: number;
    thumbnailFileId?: string;
  };
  photoFileIds?: string[];
  document?: {
    fileId: string;
    mimeType?: string;
  };
};

export class CinemaService {
  constructor(private readonly membershipService: MembershipService) {}
  private readonly localMediaRoot = path.resolve(process.cwd(), "storage", "cinema-media");

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
  private toWebAssetRef(fileRef?: string | null) {
    const ref = String(fileRef ?? "");
    if (!ref) return null;
    if (ref.startsWith("tgfile://")) {
      const fileId = ref.slice("tgfile://".length).trim();
      if (!fileId) return null;
      return `/api/cinema/media/telegram/${encodeURIComponent(fileId)}`;
    }
    if (ref.startsWith("localfile://")) {
      const rel = ref.slice("localfile://".length).replace(/^\/+/u, "");
      if (!rel) return null;
      return `/api/cinema/local-media/${rel.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
    }
    return ref;
  }  private buildFingerprint(req: Request) {
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

  async createEntryUrl(input: {
    platform: "discord" | "telegram";
    platformUserId: string;
    platformChatId: string;
    bypassVipCheck?: boolean;
  }) {
    if (!env.CINEMA_WEB_ENABLED) throw new Error("Cinema web feature is currently disabled.");
    if (!input.bypassVipCheck && !env.DEV_BYPASS_ADMIN_AUTH) {
      const vip = await this.membershipService.getLatestActiveMembershipForPlatformUser({
        platform: input.platform,
        platformUserId: input.platformUserId,
      });
      if (!vip || vip.expireAt.getTime() <= Date.now()) throw new Error("VIP is required to access the cinema web.");
    }

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
      posterUrl: this.toWebAssetRef(channel.items[0]?.assets[0]?.fileRef ?? null),
      updatedAt: channel.updatedAt,
    }));
  }

  private extractEntityList(text: string, labels: string[]) {
    const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|");
    const rx = new RegExp(`(?:^|\\n|\\r)\\s*(?:${escapedLabels})\\s*[:：-]\\s*([^\\n\\r]+)`, "giu");
    const out = new Set<string>();
    let match: RegExpExecArray | null = null;
    while ((match = rx.exec(text)) !== null) {
      const raw = String(match[1] ?? "");
      raw
        .split(/[;,|/]|(?:\s{2,})|(?:\s[-–]\s)|(?:\s{0,1}&\s{0,1})|(?:\s{0,1}và\s{0,1})|(?:\s{0,1}and\s{0,1})/giu)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => out.add(item));
    }
    return [...out];
  }

  private extractActorsAndGenres(input: { title: string; description: string | null }) {
    const text = `${input.title}\n${input.description ?? ""}`;
    const actors = this.extractEntityList(text, ["diễn viên", "dien vien", "actor", "cast", "actors", "starring"]);
    const genres = this.extractEntityList(text, ["thể loại", "the loai", "genre", "genres", "tag", "tags", "category", "categories"]);
    return { actors, genres };
  }
  private toPrettyMovieTitle(rawTitle: string, fallbackId?: string) {
    let title = String(rawTitle ?? "").trim();
    if (!title) return fallbackId ? `Phim #${fallbackId}` : "Phim";
    title = title.replace(/^file\s*[:\-]\s*/iu, "");
    if (/^telegram\s+post\s*#\d+$/iu.test(title)) title = "";
    title = title.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/iu, "");
    title = title.replace(/[_]+/gu, " ");
    title = title.replace(/[.]{2,}/gu, " ");
    title = title.replace(/\s+/gu, " ").trim();
    if (!title) return fallbackId ? `Phim #${fallbackId}` : "Phim";
    if (/^[a-z]/u.test(title)) title = title.charAt(0).toUpperCase() + title.slice(1);
    return title.slice(0, 180);
  }

  async listItemsForWeb(channelId: string, options: ListItemsForWebInput = {}) {
    await this.ensureViewTables();
    const items = await prisma.cinemaItem.findMany({
      where: { channelId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        assets: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });

    const viewStats = await this.getViewStatsMap(items.map((item) => item.id), options.userKey);
    let rows = items.map((item) => {
      const displayTitle = this.toPrettyMovieTitle(item.title, item.sourceMessageId ?? item.id);
      const entities = this.extractActorsAndGenres({ title: displayTitle, description: item.description });
      const fullAsset = item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL);
      const stats = viewStats.get(item.id) ?? { viewCount: 0, viewedByCurrentUser: false };
      return {
        id: item.id,
        channelId: item.channelId,
        title: displayTitle,
        description: item.description,
        createdAt: item.createdAt,
        posterUrl: this.toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null),
        previewUrl: this.toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.PREVIEW)?.fileRef ?? null),
        hasFull: item.assets.some((asset) => asset.kind === CinemaAssetKind.FULL),
        mediaType: this.inferMediaTypeFromMime(fullAsset?.mimeType),
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

  private async ensureViewTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cinema_item_view_stats (
        item_id TEXT PRIMARY KEY,
        view_count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cinema_user_item_views (
        item_id TEXT NOT NULL,
        user_key TEXT NOT NULL,
        first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (item_id, user_key)
      );
    `);
  }

  private async getViewStatsMap(itemIds: string[], userKey?: string) {
    const out = new Map<string, { viewCount: number; viewedByCurrentUser: boolean }>();
    if (!itemIds.length) return out;
    const result = (await prisma.$queryRawUnsafe(`
      SELECT
        i.id AS item_id,
        COALESCE(s.view_count, 0)::BIGINT AS view_count,
        CASE
          WHEN $2::TEXT IS NULL THEN FALSE
          ELSE EXISTS (
            SELECT 1
            FROM cinema_user_item_views u
            WHERE u.item_id = i.id AND u.user_key = $2::TEXT
          )
        END AS viewed_by_current_user
      FROM unnest($1::text[]) AS i(id)
      LEFT JOIN cinema_item_view_stats s ON s.item_id = i.id
    `, itemIds, userKey ?? null)) as Array<{ item_id: string; view_count: bigint | number; viewed_by_current_user: boolean }>;
    for (const row of result) {
      out.set(row.item_id, {
        viewCount: typeof row.view_count === "bigint" ? Number(row.view_count) : Number(row.view_count ?? 0),
        viewedByCurrentUser: Boolean(row.viewed_by_current_user),
      });
    }
    return out;
  }

  async markItemViewed(itemId: string, userKey: string) {
    await this.ensureViewTables();
    await prisma.$executeRawUnsafe(
      `INSERT INTO cinema_item_view_stats (item_id, view_count, updated_at)
       VALUES ($1::TEXT, 1, NOW())
       ON CONFLICT (item_id)
       DO UPDATE SET view_count = cinema_item_view_stats.view_count + 1, updated_at = NOW();`,
      itemId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO cinema_user_item_views (item_id, user_key, first_viewed_at)
       VALUES ($1::TEXT, $2::TEXT, NOW())
       ON CONFLICT (item_id, user_key) DO NOTHING;`,
      itemId,
      userKey,
    );
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
      title: this.toPrettyMovieTitle(item.title, item.sourceMessageId ?? item.id),
      description: item.description,
      posterUrl: this.toWebAssetRef(item.assets.find((asset) => asset.kind === CinemaAssetKind.POSTER)?.fileRef ?? null),
      mediaType: this.inferMediaTypeFromMime(item.assets.find((asset) => asset.kind === CinemaAssetKind.FULL)?.mimeType),
      related: related.map((row) => ({
        id: row.id,
        title: this.toPrettyMovieTitle(row.title, row.sourceMessageId ?? row.id),
        posterUrl: this.toWebAssetRef(row.assets[0]?.fileRef ?? null),
      })),
    };
  }

  private async runFfmpeg(args: string[]) {
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

  private async generatePosterAndPreview(input: { sourceUrl: string; itemId: string }) {
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

  private async telegramUploadFile(input: { chatId: string; method: "sendPhoto" | "sendVideo"; fieldName: "photo" | "video"; filePath: string }) {
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

  private async upsertGeneratedAssets(input: { itemId: string; posterFileId: string; previewFileId: string }) {
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

  private async findTelegramStorageChatId(channelId: string) {
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
    const item = await prisma.cinemaItem.findUnique({
      where: { id: input.itemId },
      select: {
        id: true,
        sourceMessageId: true,
        channel: { select: { sourceChannelId: true, platform: true } },
      },
    });
    const fullAsset = await prisma.cinemaAsset.findFirst({
      where: { itemId: input.itemId, kind: CinemaAssetKind.FULL },
      select: { mimeType: true, fileRef: true },
    });
    const fullRef = String(fullAsset?.fileRef ?? "");
    const mediaType = this.inferMediaTypeFromMime(fullAsset?.mimeType);
    if (fullRef.startsWith("tgfile://")) {
      const fileId = fullRef.slice("tgfile://".length).trim();
      try {
        await this.callTelegramApi("getFile", { file_id: fileId });
      } catch (error) {
        const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        const sourceChatId = String(item?.channel?.sourceChannelId ?? "").trim();
        const sourceMessageId = String(item?.sourceMessageId ?? "").trim();
        if (
          msg.includes("file is too big") &&
          item?.channel?.platform === CinemaSourcePlatform.TELEGRAM &&
          /^-100\d+$/u.test(sourceChatId) &&
          /^\d+$/u.test(sourceMessageId)
        ) {
          return {
            fullUrl: `/api/cinema/media/telegram-big/${encodeURIComponent(input.itemId)}`,
            mediaType,
            external: false,
          };
        }
      }
      return {
        fullUrl: `/api/cinema/media/telegram/${encodeURIComponent(fileId)}?itemId=${encodeURIComponent(input.itemId)}&kind=full`,
        mediaType,
        external: false,
      };
    }
    return {
      fullUrl: `/api/cinema/stream/${input.itemId}/full?token=${encodeURIComponent(this.makeStreamToken({ itemId: input.itemId, kind: "full", userId: input.userId }))}`,
      mediaType,
      external: false,
    };
  }

  private async persistGeneratedLocalAssets(input: { itemId: string; posterPath: string; previewPath: string }) {
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

  private async upsertGeneratedLocalAssetRefs(input: { itemId: string; posterRef: string; previewRef: string }) {
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

  async resolveTelegramFile(fileId: string, rangeHeader?: string) {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!response.ok) throw new Error(`Telegram getFile failed: ${response.status}`);
    const data = (await response.json()) as { ok: boolean; result?: { file_path?: string }; description?: string };
    if (!data.ok || !data.result?.file_path) {
      throw new Error(data.description || "Telegram getFile returned error");
    }
    const filePath = data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const fileResponse = await fetch(fileUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
    });
    if (!fileResponse.ok || !fileResponse.body) {
      throw new Error(`Telegram file download failed: ${fileResponse.status}`);
    }
    return {
      statusCode: fileResponse.status,
      stream: fileResponse.body,
      contentType: fileResponse.headers.get("content-type") || "application/octet-stream",
      contentLength: fileResponse.headers.get("content-length"),
      contentRange: fileResponse.headers.get("content-range"),
      acceptRanges: fileResponse.headers.get("accept-ranges"),
      cacheControl: fileResponse.headers.get("cache-control") || "public, max-age=86400",
    };
  }

  private async callTelegramApi<T = any>(method: string, body: Record<string, unknown>) {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Telegram ${method} failed: ${response.status}`);
    const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) throw new Error(data.description || `Telegram ${method} returned error`);
    return data.result as T;
  }

  private pickTelegramMessageFileId(message: any) {
    if (message?.video?.file_id) {
      return { fileId: String(message.video.file_id), mimeType: String(message.video.mime_type || "video/mp4") };
    }
    if (Array.isArray(message?.photo) && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1];
      if (photo?.file_id) return { fileId: String(photo.file_id), mimeType: "image/jpeg" };
    }
    if (message?.document?.file_id) {
      return { fileId: String(message.document.file_id), mimeType: String(message.document.mime_type || "application/octet-stream") };
    }
    return null;
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
    const forwarded = await this.callTelegramApi<any>("forwardMessage", {
      chat_id: toChatId,
      from_chat_id: item.channel.sourceChannelId,
      message_id: sourceMessageId,
      disable_notification: true,
    });
    const media = this.pickTelegramMessageFileId(forwarded);
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
  async runScanJob(jobId: string, options?: { forceRegenerate?: boolean; autoEnsureStorage?: boolean }) {
    const job = await prisma.cinemaScanJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Scan job not found.");
    await prisma.cinemaScanJob.update({ where: { id: job.id }, data: { status: CinemaScanJobStatus.RUNNING, startedAt: new Date() } });
    try {
      if (options?.autoEnsureStorage) {
        await this.ensureTelegramStorageChannels();
      }
      await this.findTelegramStorageChatId(job.channelId);
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
          const generated = await this.generatePosterAndPreview({ sourceUrl, itemId: item.id });
          const localRefs = await this.persistGeneratedLocalAssets({
            itemId: item.id,
            posterPath: generated.posterPath,
            previewPath: generated.previewPath,
          });
          await this.upsertGeneratedLocalAssetRefs({
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
    const title = this.toPrettyMovieTitle(titleBase || `Telegram post #${sourceMessageId}`, sourceMessageId);
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
}






