import crypto from "node:crypto";

import type { Session, SessionData } from "express-session";

import { env } from "../config.js";
import { prisma } from "../prisma.js";
import { DiscordService } from "./discord-service.js";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
};

type DiscordUser = {
  id: string;
  username: string;
  avatar: string | null;
};

type AdminSession = Session &
  Partial<SessionData> & {
    oauthState?: string;
    oauthMode?: "login" | "request";
    returnTo?: string;
    adminUser?: {
      id: string;
      username: string;
      avatarUrl: string | null;
    };
  };

export class AuthService {
  constructor(private readonly discordService: DiscordService) {}

  private getSafeReturnTo(returnTo?: string) {
    const fallbackUrl = new URL(env.ADMIN_APP_URL);

    if (!returnTo) {
      return fallbackUrl.toString();
    }

    try {
      const candidateUrl = new URL(returnTo, fallbackUrl);

      if (candidateUrl.origin !== fallbackUrl.origin) {
        return fallbackUrl.toString();
      }

      return candidateUrl.toString();
    } catch {
      return fallbackUrl.toString();
    }
  }

  createLoginUrl(session: AdminSession, returnTo?: string) {
    if (env.DEV_BYPASS_ADMIN_AUTH) {
      session.adminUser = {
        id: "local-admin",
        username: "Local Admin",
        avatarUrl: null,
      };
      session.returnTo = this.getSafeReturnTo(returnTo);
      return session.returnTo;
    }

    const state = crypto.randomUUID();
    session.oauthState = state;
    session.oauthMode = "login";
    session.returnTo = this.getSafeReturnTo(returnTo);

    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: env.DISCORD_REDIRECT_URI,
      response_type: "code",
      scope: "identify",
      state,
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async handleCallback(session: AdminSession, code: string, state: string) {
    if (env.DEV_BYPASS_ADMIN_AUTH) {
      session.adminUser = {
        id: "local-admin",
        username: "Local Admin",
        avatarUrl: null,
      };

      return {
        redirectTo: this.getSafeReturnTo(session.returnTo),
        adminUser: session.adminUser,
      };
    }

    if (!session.oauthState || state !== session.oauthState) {
      throw new Error("OAuth state khong hop le.");
    }

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Khong exchange duoc Discord OAuth token.");
    }

    const token = (await tokenResponse.json()) as DiscordTokenResponse;
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Khong lay duoc thong tin Discord user.");
    }

    const user = (await userResponse.json()) as DiscordUser;
    const mode = session.oauthMode === "request" ? "request" : "login";
    const canAccessByDiscord = await this.discordService.memberHasAdminAccess(user.id);
    const approvedPrincipal = await prisma.adminPrincipal.findUnique({
      where: {
        platform_platformUserId: {
          platform: "DISCORD",
          platformUserId: user.id,
        },
      },
    });
    const canAccessByPrincipal = Boolean(approvedPrincipal?.isActive);

    if (mode === "request") {
      await prisma.adminPrincipal.upsert({
        where: {
          platform_platformUserId: {
            platform: "DISCORD",
            platformUserId: user.id,
          },
        },
        update: {
          displayName: user.username,
          isActive: approvedPrincipal?.isActive ?? false,
        },
        create: {
          platform: "DISCORD",
          platformUserId: user.id,
          displayName: user.username,
          isActive: false,
        },
      });

      delete session.adminUser;
      delete session.oauthState;
      delete session.oauthMode;

      return {
        redirectTo: this.withQuery(this.getSafeReturnTo(session.returnTo), "adminRequest", "submitted_discord"),
        adminUser: undefined,
      };
    }

    if (!canAccessByDiscord && !canAccessByPrincipal) {
      await prisma.adminPrincipal.upsert({
        where: {
          platform_platformUserId: {
            platform: "DISCORD",
            platformUserId: user.id,
          },
        },
        update: {
          displayName: user.username,
          isActive: false,
        },
        create: {
          platform: "DISCORD",
          platformUserId: user.id,
          displayName: user.username,
          isActive: false,
        },
      });
      delete session.adminUser;
      delete session.oauthState;
      delete session.oauthMode;
      return {
        redirectTo: this.withQuery(this.getSafeReturnTo(session.returnTo), "adminRequest", "pending_approval"),
        adminUser: undefined,
      };
    }

    session.adminUser = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
    };

    delete session.oauthState;
    delete session.oauthMode;

    return {
      redirectTo: this.getSafeReturnTo(session.returnTo),
      adminUser: session.adminUser,
    };
  }

  createRequestLoginUrl(session: AdminSession, returnTo?: string) {
    if (env.DEV_BYPASS_ADMIN_AUTH) {
      session.returnTo = this.getSafeReturnTo(returnTo);
      return this.withQuery(session.returnTo, "adminRequest", "dev_mode_no_request");
    }
    const state = crypto.randomUUID();
    session.oauthState = state;
    session.oauthMode = "request";
    session.returnTo = this.getSafeReturnTo(returnTo);
    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: env.DISCORD_REDIRECT_URI,
      response_type: "code",
      scope: "identify",
      state,
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async createTelegramAdminRequest(input: { telegramUserId: string; displayName?: string | null }) {
    const telegramUserId = input.telegramUserId.trim();
    if (!telegramUserId) {
      throw new Error("telegramUserId is required.");
    }
    const existed = await prisma.adminPrincipal.findUnique({
      where: {
        platform_platformUserId: {
          platform: "TELEGRAM",
          platformUserId: telegramUserId,
        },
      },
    });
    if (existed?.isActive) {
      throw new Error("Telegram account da la admin.");
    }
    return prisma.adminPrincipal.upsert({
      where: {
        platform_platformUserId: {
          platform: "TELEGRAM",
          platformUserId: telegramUserId,
        },
      },
      update: {
        displayName: input.displayName?.trim() || existed?.displayName || null,
        isActive: false,
      },
      create: {
        platform: "TELEGRAM",
        platformUserId: telegramUserId,
        displayName: input.displayName?.trim() || null,
        isActive: false,
      },
    });
  }

  private withQuery(url: string, key: string, value: string) {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  }

  canUseDebugLogin() {
    return env.APP_ENV !== "production" && env.ADMIN_DEBUG_LOGIN_ENABLED && Boolean(env.ADMIN_DEBUG_LOGIN_SECRET);
  }

  handleDebugLogin(session: AdminSession, secret: string, returnTo?: string) {
    if (!this.canUseDebugLogin()) {
      throw new Error("Debug login is disabled.");
    }

    const expectedBuffer = Buffer.from(env.ADMIN_DEBUG_LOGIN_SECRET);
    const actualBuffer = Buffer.from(secret);

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new Error("Debug login secret is invalid.");
    }

    session.adminUser = {
      id: "debug-admin",
      username: "Debug Admin",
      avatarUrl: null,
    };
    session.returnTo = this.getSafeReturnTo(returnTo);

    return {
      redirectTo: session.returnTo,
      adminUser: session.adminUser,
    };
  }
}
