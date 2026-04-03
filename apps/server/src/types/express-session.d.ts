import "express-session";

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    returnTo?: string;
    adminUser?: {
      id: string;
      username: string;
      avatarUrl: string | null;
    };
    cinemaUser?: {
      platform: "discord" | "telegram";
      platformUserId: string;
      platformChatId: string;
      isVip: boolean;
      fingerprint: string;
      expiresAt: number;
    };
  }
}
