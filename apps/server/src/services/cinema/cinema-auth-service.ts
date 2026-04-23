import { Platform } from "@prisma/client";
import type { Request } from "express";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import { env } from "../../config.js";
import { getCinemaPublicBaseUrl } from "../../lib/public-base-url.js";
import { prisma } from "../../prisma.js";
import type { MembershipService } from "../membership-service.js";
import { buildFingerprint, hashStr, nowSec, platformToPrisma } from "./cinema-utils.js";
import type { CinemaSession, EntryTicketPayload, TelegramInitDataUser } from "./types.js";

export class CinemaAuthService {
  constructor(private readonly membershipService: MembershipService) { }

  verifyTelegramInitData(initData: string) {
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
    if (Math.abs(nowSec() - authDate) > maxAgeSec) throw new Error("Telegram initData expired.");
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
    // Allow entry URL generation for all users.
    // VIP check will be deferred to session handling and stream endpoints.

    const ticketTtlSeconds =
      input.platform === "discord"
        ? env.CINEMA_DISCORD_ENTRY_TICKET_TTL_SECONDS
        : env.CINEMA_ENTRY_TICKET_TTL_SECONDS;

    const payload: EntryTicketPayload = {
      tid: nanoid(24),
      platform: input.platform,
      userId: input.platformUserId,
      chatId: input.platformChatId,
      exp: nowSec() + ticketTtlSeconds,
    };
    /* Short opaque token for Telegram WebApp URL reliability. */
    const token = nanoid(32);
    if (input.platform === "discord") {
      // Keep only one active Discord ticket per user to reduce share/copy reuse.
      await prisma.cinemaAccessTicket.updateMany({
        where: {
          platform: Platform.DISCORD,
          platformUserId: input.platformUserId,
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
        },
      });
    }

    await prisma.cinemaAccessTicket.create({
      data: {
        tokenHash: hashStr(token),
        platform: platformToPrisma(input.platform),
        platformUserId: input.platformUserId,
        platformChatId: input.platformChatId,
        expiresAt: new Date(payload.exp * 1000),
        isAdminBypass: input.bypassVipCheck === true,
      },
    });
    const url = new URL(`/api/cinema/e/${token}`, getCinemaPublicBaseUrl());
    return url.toString();
  }

  async exchangeEntryTicket(session: CinemaSession, req: Request, token: string, telegramInitData?: string) {
    const tokenHash = hashStr(token);
    const fingerprint = buildFingerprint(req);
    const dbTicket = await prisma.cinemaAccessTicket.findUnique({ where: { tokenHash } });
    if (!dbTicket) throw new Error("Entry ticket is invalid.");
    if (dbTicket.platform === Platform.TELEGRAM) {
      const verified = this.verifyTelegramInitData(String(telegramInitData ?? ""));
      if (verified.userId !== dbTicket.platformUserId) {
        throw new Error("Telegram account does not match this entry ticket.");
      }
    }
    if (dbTicket.status === "USED") {
      if (dbTicket.platform !== Platform.TELEGRAM) {
        throw new Error("Entry ticket is invalid or already used.");
      }
      /* Idempotent reopen support for Telegram WebView reloads on the same device. */
      if (dbTicket.usedFingerprint === fingerprint && dbTicket.expiresAt.getTime() > Date.now()) {
        const expiresAt = Date.now() + env.CINEMA_WEB_SESSION_TTL_HOURS * 60 * 60 * 1000;
        const platform = dbTicket.platform === "TELEGRAM" ? "telegram" : "discord";
        // Re-check VIP status on reuse to ensure accuracy.
        // Admin-bypass tickets are always treated as VIP.
        let isVip = dbTicket.isAdminBypass;
        if (!isVip) {
          const vip = await this.membershipService.getLatestActiveMembershipForPlatformUser({
            platform,
            platformUserId: dbTicket.platformUserId,
          });
          isVip = !!vip && vip.expireAt.getTime() > Date.now();
        }
        session.cinemaUser = {
          platform,
          platformUserId: dbTicket.platformUserId,
          platformChatId: dbTicket.platformChatId,
          isVip,
          fingerprint,
          expiresAt,
          lastSeenAt: Date.now(),
        };
        return {
          ok: true,
          reused: true,
          expiresAt,
          user: { platform, platformUserId: dbTicket.platformUserId },
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
    // Admin-bypass tickets skip the membership check — the admin always gets VIP access.
    let isVip = dbTicket.isAdminBypass;
    if (!isVip) {
      const vip = await this.membershipService.getLatestActiveMembershipForPlatformUser({
        platform,
        platformUserId: dbTicket.platformUserId,
      });
      isVip = !!vip && vip.expireAt.getTime() > Date.now();
    }

    await prisma.cinemaAccessTicket.update({
      where: { id: dbTicket.id },
      data: { status: "USED", usedAt: new Date(), usedFingerprint: fingerprint },
    });
    const expiresAt = Date.now() + env.CINEMA_WEB_SESSION_TTL_HOURS * 60 * 60 * 1000;
    session.cinemaUser = {
      platform,
      platformUserId: dbTicket.platformUserId,
      platformChatId: dbTicket.platformChatId,
      isVip,
      fingerprint,
      expiresAt,
      lastSeenAt: Date.now(),
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
    const isVip = !!vip && vip.expireAt.getTime() > Date.now();

    const fingerprint = buildFingerprint(req);
    const expiresAt = Date.now() + env.CINEMA_WEB_SESSION_TTL_HOURS * 60 * 60 * 1000;
    session.cinemaUser = {
      platform,
      platformUserId,
      platformChatId: vip?.platformChatId ?? "",
      isVip,
      fingerprint,
      expiresAt,
      lastSeenAt: Date.now(),
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
    if (buildFingerprint(req) !== cinemaUser.fingerprint) throw new Error("Cinema session is invalid on this device.");
    if (cinemaUser.platform === "discord") {
      const idleMs = env.CINEMA_DISCORD_SESSION_IDLE_SECONDS * 1000;
      const lastSeenAt = cinemaUser.lastSeenAt ?? 0;
      if (Date.now() - lastSeenAt > idleMs) {
        delete session.cinemaUser;
        throw new Error("Cinema session has expired.");
      }
      cinemaUser.lastSeenAt = Date.now();
    }
    return cinemaUser;
  }
}
