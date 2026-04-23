import type { Session, SessionData } from "express-session";

export type CinemaSession = Session &
  Partial<SessionData> & {
    cinemaUser?: {
      platform: "discord" | "telegram";
      platformUserId: string;
      platformChatId: string;
      isVip: boolean;
      fingerprint: string;
      expiresAt: number;
      lastSeenAt: number;
    };
  };

export type EntryTicketPayload = {
  tid: string;
  platform: "discord" | "telegram";
  userId: string;
  chatId: string;
  exp: number;
};

export type TelegramInitDataUser = {
  id: string | number;
};

export type ListItemsForWebInput = {
  sort?: "newest" | "oldest" | "most_viewed" | "least_viewed" | "unseen" | "random";
  userKey?: string;
};

export type TelegramChannelPostInput = {
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
