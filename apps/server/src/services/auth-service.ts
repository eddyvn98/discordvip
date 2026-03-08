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

  createLoginUrl(session: AdminSession, returnTo?: string) {
    const state = crypto.randomUUID();
    session.oauthState = state;
    session.returnTo = returnTo || env.ADMIN_APP_URL;

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
    if (!session.oauthState || state !== session.oauthState) {
      throw new Error("OAuth state không hợp lệ.");
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
      throw new Error("Không exchange được Discord OAuth token.");
    }

    const token = (await tokenResponse.json()) as DiscordTokenResponse;
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Không lấy được thông tin Discord user.");
    }

    const user = (await userResponse.json()) as DiscordUser;
    const canAccess = await this.discordService.memberHasAdminAccess(user.id);

    if (!canAccess) {
      throw new Error("Discord account không có quyền truy cập admin panel.");
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
      redirectTo: session.returnTo || env.ADMIN_APP_URL,
      adminUser: session.adminUser,
    };
  }
}
