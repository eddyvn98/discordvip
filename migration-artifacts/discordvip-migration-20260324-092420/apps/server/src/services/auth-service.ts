import crypto from "node:crypto";

import type { Session, SessionData } from "express-session";

import { env } from "../config.js";
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
    const canAccess = await this.discordService.memberHasAdminAccess(user.id);

    if (!canAccess) {
      throw new Error("Discord account khong co quyen truy cap admin panel.");
    }

    session.adminUser = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
    };

    delete session.oauthState;

    return {
      redirectTo: this.getSafeReturnTo(session.returnTo),
      adminUser: session.adminUser,
    };
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
