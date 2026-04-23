import { env } from "../../config.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../prisma.js";
import type { TelegramApiClient } from "./api.js";
import type { TelegramCommandSync } from "./command-sync.js";
import { getAllConfiguredVipChatIds } from "./db-helpers.js";
import { buildHomeReplyKeyboard } from "./utils.js";
import type {
  TelegramCallbackQuery,
  TelegramHandlers,
  TelegramMessage,
  TelegramUpdate,
} from "./types.js";

export class TelegramUpdateHandler {
  handlers: TelegramHandlers | null = null;
  channelVerificationHandler:
    | ((input: {
      token: string;
      telegramUserId: string;
      chatId: string;
      chatTitle: string;
    }) => Promise<{ ok: boolean; reason?: string }>)
    | null = null;
  channelPostHandler:
    | ((input: { chatId: string; chatTitle: string; message: TelegramMessage }) => Promise<void>)
    | null = null;

  constructor(
    private apiClient: TelegramApiClient,
    private commandSync: TelegramCommandSync,
  ) { }

  async handleUpdate(update: TelegramUpdate) {
    const callbackQuery = update.callback_query;
    if (callbackQuery) {
      await this.handleCallbackQuery(callbackQuery);
      return;
    }

    const joinRequest = update.chat_join_request;
    if (joinRequest) {
      await this.handleChatJoinRequest(joinRequest);
      return;
    }

    const channelPost = update.channel_post;
    if (channelPost) {
      await this.handleChannelPost(channelPost);
      return;
    }

    const message = update.message;
    const text = message?.text?.trim();
    const from = message?.from;
    if (!message || !text || !from || !this.handlers) {
      return;
    }

    await this.handleMessage(message, text, from);
  }

  private async handleMessage(
    message: TelegramMessage,
    text: string,
    from: { id: number | string; username?: string; first_name?: string },
  ) {
    const userId = String(from.id);
    const chatId = String(message.chat.id);
    const chatType = message.chat.type;
    const parts = text.split(/\s+/).filter(Boolean);
    let command = parts[0];
    if (text === "📅 VIP của tôi") command = "/vipstatus";
    if (text === "🎬 Mở web phim") command = "/webvip";
    const isAdminUser = env.adminTelegramIds.includes(userId);

    if (isAdminUser && !this.commandSync.adminCommandsSynced.has(userId)) {
      try {
        await this.commandSync.syncAdminCommandsForUser(
          userId,
          this.commandSync.getUserCommands(),
          this.commandSync.getAdminCommands(),
        );
      } catch (error) {
        logger.warn("Failed to sync admin Telegram commands for user scope", { userId, error });
      }
    }
    if (!isAdminUser && !this.commandSync.userCommandsSynced.has(userId)) {
      try {
        await this.commandSync.syncUserCommandsForUser(userId, this.commandSync.getUserCommands());
      } catch (error) {
        logger.warn("Failed to sync regular Telegram commands for user scope", { userId, error });
      }
    }

    await this.routeCommand({ command, parts, userId, chatId, chatType });
  }

  private async routeCommand(input: {
    command: string;
    parts: string[];
    userId: string;
    chatId: string;
    chatType: string;
  }) {
    const { command, parts, userId, chatId, chatType } = input;
    if (!this.handlers) return;

    if (command === "/start") {
      await this.apiClient.sendMessage(
        chatId,
        [
          "<b>VIP CINEMA BOT</b>",
          "? L?nh /webvip ?? m? web phim",
          "? L?nh /vipstatus ?? ki?m tra h?n VIP",
          "",
          "Li?n h? admin n?u c?n c?p/gia h?n VIP.",
        ].join("\n"),
        buildHomeReplyKeyboard(),
        "HTML",
      );
      return;
    }

    if (command === "/vipstatus") {
      await this.handlers.onVipStatus({ userId, chatId, chatType });
      return;
    }

    if (command === "/webvip" || command === "/webphim") {
      await this.handlers.onWebVip({ userId, chatId, chatType });
      return;
    }
    if (command === "/adminstats") {
      if (!env.adminTelegramIds.includes(userId)) {
        await this.apiClient.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }
      await this.handlers.onAdminStats({ userId, chatId, chatType });
      return;
    }

    if (command === "/admingrant") {
      if (!env.adminTelegramIds.includes(userId)) {
        await this.apiClient.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }
      const targetUserId = parts[1]?.trim() ?? "";
      const days = Number(parts[2] ?? "");
      if (!targetUserId || !Number.isInteger(days) || days === 0) {
        await this.apiClient.sendMessage(chatId, "Dung: /admingrant <telegram_user_id> <so_ngay, am de tru>");
        return;
      }
      await this.handlers.onAdminGrantVip({ userId, chatId, chatType, targetUserId, days });
      return;
    }

    if (command === "/adminrevoke") {
      if (!env.adminTelegramIds.includes(userId)) {
        await this.apiClient.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }
      const targetUserId = parts[1]?.trim() ?? "";
      if (!targetUserId) {
        await this.apiClient.sendMessage(chatId, "Dung: /adminrevoke <telegram_user_id>");
        return;
      }
      await this.handlers.onAdminRevokeVip({ userId, chatId, chatType, targetUserId });
    }
  }

  private async handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
    const from = callbackQuery.from;
    const chat = callbackQuery.message?.chat;
    const data = callbackQuery.data ?? "";

    if (!from || !chat || !this.handlers) {
      return;
    }

    const userId = String(from.id);
    const chatId = String(chat.id);
    const chatType = chat.type;
    await this.apiClient.apiCall("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
    });
  }

  private async handleChatJoinRequest(input: {
    chat: { id: number | string; type: string };
    from: { id: number | string; username?: string; first_name?: string };
  }) {
    const chatId = String(input.chat.id);
    const userId = String(input.from.id);
    const now = new Date();
    const allowedChatIds = await getAllConfiguredVipChatIds();

    if (!allowedChatIds.includes(chatId)) {
      await this.apiClient.apiCall("declineChatJoinRequest", {
        chat_id: chatId,
        user_id: Number(userId),
      });
      return;
    }

    const activeMembership = await prisma.membership.findFirst({
      where: {
        platform: "TELEGRAM",
        platformUserId: userId,
        status: "ACTIVE",
        expireAt: {
          gt: now,
        },
      },
      orderBy: {
        expireAt: "desc",
      },
    });

    if (!activeMembership) {
      await this.apiClient.apiCall("declineChatJoinRequest", {
        chat_id: chatId,
        user_id: Number(userId),
      });
      await this.apiClient.sendMessage(
        userId,
        "Yeu cau vao kenh VIP bi tu choi vi tai khoan chua co VIP hop le. Vui long lien he admin de duoc cap VIP.",
      );
      return;
    }

    await this.apiClient.apiCall("approveChatJoinRequest", {
      chat_id: chatId,
      user_id: Number(userId),
    });
    await this.apiClient.sendMessage(userId, "Yeu cau vao kenh VIP da duoc duyet.");
  }

  private async handleChannelPost(message: TelegramMessage) {
    const chatId = String(message.chat.id);
    const chatTitle =
      message.chat.title?.trim() || (message.chat.type === "channel" ? `Channel ${chatId}` : `Chat ${chatId}`);

    if (this.channelVerificationHandler) {
      const text = message.text?.trim().toUpperCase();
      if (text && text.startsWith("VIP-VERIFY-")) {
        const token = text.split(/\s+/)[0];
        const telegramUserId = String(message.from?.id ?? "");
        if (telegramUserId) {
          try {
            const result = await this.channelVerificationHandler({
              token,
              telegramUserId,
              chatId,
              chatTitle,
            });
            if (result.ok) {
              await this.apiClient.sendMessage(
                telegramUserId,
                `Da xac thuc kenh ${chatId} thanh cong. Ban co the vao web admin de gan plan.`,
              );
            }
          } catch (error) {
            logger.warn("Telegram channel verification failed", { error, chatId, telegramUserId });
          }
        }
      }
    }

    if (this.channelPostHandler) {
      try {
        await this.channelPostHandler({ chatId, chatTitle, message });
      } catch (error) {
        logger.warn("Telegram channel post import failed", { error, chatId, messageId: message.message_id });
      }
    }
  }
}
