import { env } from "../../config.js";
import { logger } from "../../lib/logger.js";
import type { AccessTarget, PlatformAdapter } from "../platform-adapter.js";
import { TelegramApiClient } from "./api.js";
import { TelegramCommandSync } from "./command-sync.js";
import { getAllConfiguredVipChatIds, getVipChatIdsForPlan } from "./db-helpers.js";
import { TelegramUpdateHandler } from "./update-handler.js";
import { isIgnorableRevokeError } from "./utils.js";
import type { TelegramHandlers, TelegramMessage, TelegramUpdate } from "./types.js";

export class TelegramService implements PlatformAdapter {
  readonly platform = "telegram" as const;
  private polling = false;
  private offset = 0;

  private apiClient = new TelegramApiClient();
  private commandSync = new TelegramCommandSync(this.apiClient);
  private updateHandler = new TelegramUpdateHandler(this.apiClient, this.commandSync);

  setHandlers(handlers: TelegramHandlers) {
    this.updateHandler.handlers = handlers;
  }

  setChannelVerificationHandler(
    handler: (input: {
      token: string;
      telegramUserId: string;
      chatId: string;
      chatTitle: string;
    }) => Promise<{ ok: boolean; reason?: string }>,
  ) {
    this.updateHandler.channelVerificationHandler = handler;
  }

  setChannelPostHandler(
    handler: (input: { chatId: string; chatTitle: string; message: TelegramMessage }) => Promise<void>,
  ) {
    this.updateHandler.channelPostHandler = handler;
  }

  async start() {
    if (!env.TELEGRAM_BOT_ENABLED) {
      logger.info("Telegram bot startup skipped", {
        reason: "TELEGRAM_BOT_ENABLED=false",
      });
      return;
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_VIP_CHAT_ID) {
      throw new Error(
        "Missing Telegram bot configuration. Set TELEGRAM_BOT_TOKEN and TELEGRAM_VIP_CHAT_ID.",
      );
    }

    if (this.polling) {
      return;
    }

    try {
      await this.commandSync.syncCommands();
    } catch (error) {
      logger.warn("Telegram command sync failed on startup", { error });
    }
    this.polling = true;
    logger.info("Telegram bot polling started");
    void this.pollLoop();
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        const updates = await this.apiClient.apiCall<TelegramUpdate[]>("getUpdates", {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ["message", "callback_query", "chat_join_request", "channel_post"],
        });

        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.updateHandler.handleUpdate(update);
        }
      } catch (error) {
        logger.warn("Telegram polling failed", { error });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: Parameters<typeof this.apiClient.sendMessage>[2],
    parseMode?: "HTML" | "MarkdownV2",
  ) {
    return this.apiClient.sendMessage(chatId, text, replyMarkup, parseMode);
  }

  async sendWebAppButton(chatId: string, text: string, webAppUrl: string, buttonText = "Mo Cinema VIP") {
    return this.apiClient.sendWebAppButton(chatId, text, webAppUrl, buttonText);
  }

  async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string,
    parseMode?: "HTML" | "MarkdownV2",
  ) {
    return this.apiClient.sendPhoto(chatId, photoUrl, caption, parseMode);
  }

  async clearPaymentPromptMessage(input: { chatId: string; messageId: number }) {
    return this.apiClient.clearPaymentPromptMessage(input);
  }

  async sendVipEntryLinks(input: { userId: string; planCode?: string; headerText?: string }) {
    const chatIds = await getVipChatIdsForPlan(input.planCode);
    const inviteLinks = await Promise.all(chatIds.map((chatId) => this.apiClient.createVipInviteLink(chatId)));
    const normalizedLinksText = inviteLinks.join("\n");
    await this.apiClient.sendMessage(
      input.userId,
      [
        input.headerText ?? "Link vào kênh VIP (hiệu lực 24h):",
        normalizedLinksText,
      ].join("\n"),
    );
  }

  async grantAccess(target: AccessTarget) {
    await this.sendVipEntryLinks({ userId: target.platformUserId, planCode: target.planCode });
  }

  async revokeAccess(target: AccessTarget) {
    const chatIds = await getAllConfiguredVipChatIds();
    const userId = Number(target.platformUserId);
    if (!Number.isFinite(userId)) {
      logger.warn("Telegram revoke skipped due to invalid user id", {
        platformUserId: target.platformUserId,
        platformChatId: target.platformChatId,
      });
      return;
    }

    const failures: Array<{ chatId: string; error: unknown }> = [];

    await Promise.all(
      chatIds.map(async (chatId) => {
        try {
          await this.apiClient.apiCall("banChatMember", {
            chat_id: chatId,
            user_id: userId,
            revoke_messages: false,
          });
          await this.apiClient.apiCall("unbanChatMember", {
            chat_id: chatId,
            user_id: userId,
            only_if_banned: true,
          });
        } catch (error) {
          if (isIgnorableRevokeError(error)) {
            logger.info("Telegram revoke skipped due to ignorable condition", {
              chatId,
              userId: target.platformUserId,
              error: error instanceof Error ? error.message : String(error),
            });
            return;
          }

          failures.push({ chatId, error });
        }
      }),
    );

    if (failures.length > 0) {
      const details = failures
        .map((item) =>
          item.error instanceof Error
            ? `[chat ${item.chatId}] ${item.error.message}`
            : `[chat ${item.chatId}] ${String(item.error)}`,
        )
        .join("; ");
      throw new Error(`Telegram revoke failed for ${failures.length}/${chatIds.length} chats: ${details}`);
    }
  }

  async sendVipActivatedNotice(target: AccessTarget, expireAt: Date) {
    await this.apiClient.sendMessage(
      target.platformUserId,
      `Thanh toan da duoc xac nhan. VIP cua ban da kich hoat den ${expireAt.toLocaleString("vi-VN")}.`,
    );
  }

  async sendVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    await this.apiClient.sendMessage(
      target.platformUserId,
      [
        `VIP cua ban se het han vao ${expireAt.toLocaleString("vi-VN")} (con khoang ${thresholdDays} ngay).`,
        "Gia gia han ngay bang /donate de khong bi ngat quyen truy cap nhom VIP.",
      ].join("\n"),
    );
  }

  async sendAdminVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    const text = [
      "Nhac het han VIP (Telegram)",
      `User: ${target.platformUserId}`,
      `Het han: ${expireAt.toLocaleString("vi-VN")}`,
      `Moc nhac: ${thresholdDays} ngay`,
    ].join("\n");

    await Promise.all(env.adminTelegramIds.map((adminId) => this.apiClient.sendMessage(adminId, text)));
  }

  async sendAdminAutoPaymentConfirmedNotice(input: {
    target: AccessTarget;
    orderCode: string;
    amount: number;
    expireAt: Date;
    providerTransactionId: string;
  }) {
    const text = [
      "Da xac nhan thanh toan tu dong (Telegram).",
      `User: ${input.target.platformUserId}`,
      `Order: ${input.orderCode}`,
      `So tien: ${input.amount.toLocaleString("vi-VN")} VND`,
      `Ma giao dich: ${input.providerTransactionId}`,
      `VIP het han: ${input.expireAt.toLocaleString("vi-VN")}`,
    ].join("\n");

    await Promise.all(env.adminTelegramIds.map((adminId) => this.apiClient.sendMessage(adminId, text)));
  }

  async checkHealth() {
    if (!env.TELEGRAM_BOT_ENABLED) {
      return;
    }

    await this.apiClient.apiCall("getMe");
  }

  async sendOpsAlert(message: string) {
    if (!env.adminTelegramIds.length) {
      return;
    }

    const text = `CANH BAO HE THONG: ${message}`;
    await Promise.all(env.adminTelegramIds.map((adminId) => this.apiClient.sendMessage(adminId, text)));
  }

  async isAdmin(platformUserId: string) {
    return env.adminTelegramIds.includes(platformUserId);
  }

  // Khai báo thêm các types vào namespace nếu cần thiết (optional)
  // Thực tế các nơi khác có thể import types từ ./telegram/types.js
}
