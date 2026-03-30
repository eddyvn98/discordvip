import { env } from "../config.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../prisma.js";
import { AccessTarget, PlatformAdapter } from "./platform-adapter.js";
import { telegramApiCall } from "./telegram-api.js";
import { getTelegramAdminCommands, getTelegramUserCommands } from "./telegram-commands.js";
import { getAllConfiguredVipChatIds, getVipChatIdsForPlan } from "./telegram-data.js";
import { isIgnorableTelegramRevokeError } from "./telegram-errors.js";
import { routeTelegramUpdate } from "./telegram-update-router.js";
import type { TelegramBotCommand, TelegramHandlers, TelegramMessage, TelegramUpdate } from "./telegram-types.js";

export class TelegramService implements PlatformAdapter {
  readonly platform = "telegram" as const;
  private offset = 0;
  private polling = false;
  private readonly adminCommandsSynced = new Set<string>();
  private readonly userCommandsSynced = new Set<string>();
  private handlers: TelegramHandlers | null = null;
  private channelVerificationHandler:
    | ((input: {
        token: string;
        telegramUserId: string;
        chatId: string;
        chatTitle: string;
      }) => Promise<{ ok: boolean; reason?: string }>)
    | null = null;

  setHandlers(handlers: TelegramHandlers) {
    this.handlers = handlers;
  }

  setChannelVerificationHandler(
    handler: (input: {
      token: string;
      telegramUserId: string;
      chatId: string;
      chatTitle: string;
    }) => Promise<{ ok: boolean; reason?: string }>,
  ) {
    this.channelVerificationHandler = handler;
  }

  async start() {
    if (!env.TELEGRAM_BOT_ENABLED) {
      logger.info("Telegram bot startup skipped", { reason: "TELEGRAM_BOT_ENABLED=false" });
      return;
    }
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_VIP_CHAT_ID) {
      throw new Error("Missing Telegram bot configuration. Set TELEGRAM_BOT_TOKEN and TELEGRAM_VIP_CHAT_ID.");
    }
    if (this.polling) {
      return;
    }

    try {
      await this.syncCommands();
    } catch (error) {
      logger.warn("Telegram command sync failed on startup", { error });
    }

    this.polling = true;
    logger.info("Telegram bot polling started");
    void this.pollLoop();
  }

  private async syncCommands() {
    const userCommands = this.getUserCommands();
    const adminCommands = this.getAdminCommands();

    await telegramApiCall("setMyCommands", { commands: userCommands });
    await telegramApiCall("setMyCommands", {
      commands: userCommands,
      scope: { type: "all_private_chats" },
    });

    for (const adminId of env.adminTelegramIds) {
      await this.syncAdminCommandsForUser(adminId, userCommands, adminCommands);
    }
  }

  private getUserCommands(): TelegramBotCommand[] {
    return getTelegramUserCommands();
  }

  private getAdminCommands(): TelegramBotCommand[] {
    return getTelegramAdminCommands();
  }

  private async syncAdminCommandsForUser(
    userId: string,
    userCommands: TelegramBotCommand[],
    adminCommands: TelegramBotCommand[],
  ) {
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      return;
    }

    await telegramApiCall("setMyCommands", {
      commands: [...userCommands, ...adminCommands],
      scope: { type: "chat", chat_id: id },
    });
    this.adminCommandsSynced.add(String(id));
  }

  private async syncUserCommandsForUser(userId: string, userCommands: TelegramBotCommand[]) {
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      return;
    }
    await telegramApiCall("setMyCommands", {
      commands: userCommands,
      scope: { type: "chat", chat_id: id },
    });
    this.userCommandsSynced.add(String(id));
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        const updates = await telegramApiCall<TelegramUpdate[]>("getUpdates", {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ["message", "callback_query", "chat_join_request", "channel_post"],
        });
        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        logger.warn("Telegram polling failed", { error });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
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

    await routeTelegramUpdate({
      update,
      handlers: this.handlers,
      adminTelegramIds: env.adminTelegramIds,
      adminCommandsSynced: this.adminCommandsSynced,
      userCommandsSynced: this.userCommandsSynced,
      getUserCommands: this.getUserCommands.bind(this),
      getAdminCommands: this.getAdminCommands.bind(this),
      syncAdminCommandsForUser: this.syncAdminCommandsForUser.bind(this),
      syncUserCommandsForUser: this.syncUserCommandsForUser.bind(this),
      sendMessage: this.sendMessage.bind(this),
      getActiveDonatePlans: async () => {
        const { getActiveDonatePlans } = await import("./telegram-data.js");
        return getActiveDonatePlans();
      },
      isAdmin: this.isAdmin.bind(this),
      answerCallbackQuery: async (callbackQueryId: string) => {
        await telegramApiCall("answerCallbackQuery", { callback_query_id: callbackQueryId });
      },
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
      await telegramApiCall("declineChatJoinRequest", {
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
        expireAt: { gt: now },
      },
      orderBy: { expireAt: "desc" },
    });

    if (!activeMembership) {
      await telegramApiCall("declineChatJoinRequest", {
        chat_id: chatId,
        user_id: Number(userId),
      });
      await this.sendMessage(
        userId,
        "Yeu cau vao kenh VIP bi tu choi vi tai khoan chua co VIP hop le. Vui long thanh toan bang /donate.",
      );
      return;
    }

    await telegramApiCall("approveChatJoinRequest", {
      chat_id: chatId,
      user_id: Number(userId),
    });
    await this.sendMessage(userId, "Yeu cau vao kenh VIP da duoc duyet.");
  }

  private async handleChannelPost(message: TelegramMessage) {
    if (!this.channelVerificationHandler) {
      return;
    }
    const text = message.text?.trim().toUpperCase();
    if (!text || !text.startsWith("VIP-VERIFY-")) {
      return;
    }

    const token = text.split(/\s+/)[0];
    const chatId = String(message.chat.id);
    const chatTitle =
      message.chat.title?.trim() ||
      (message.chat.type === "channel" ? `Channel ${chatId}` : `Chat ${chatId}`);
    const telegramUserId = String(message.from?.id ?? "");
    if (!telegramUserId) {
      return;
    }

    try {
      const result = await this.channelVerificationHandler({
        token,
        telegramUserId,
        chatId,
        chatTitle,
      });
      if (result.ok) {
        await this.sendMessage(
          telegramUserId,
          `Da xac thuc kenh ${chatId} thanh cong. Ban co the vao web admin de gan plan.`,
        );
      }
    } catch (error) {
      logger.warn("Telegram channel verification failed", { error, chatId, telegramUserId });
    }
  }

  async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: {
      inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
    },
    parseMode?: "HTML" | "MarkdownV2",
  ) {
    return telegramApiCall<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
      parse_mode: parseMode,
    });
  }

  async sendPhoto(chatId: string, photoUrl: string, caption?: string, parseMode?: "HTML" | "MarkdownV2") {
    return telegramApiCall<TelegramMessage>("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: parseMode,
    });
  }

  async clearPaymentPromptMessage(input: { chatId: string; messageId: number }) {
    await telegramApiCall("deleteMessage", {
      chat_id: input.chatId,
      message_id: input.messageId,
    });
  }

  async createVipInviteLink(chatId: string) {
    const result = await telegramApiCall<{ invite_link: string }>("createChatInviteLink", {
      chat_id: chatId,
      creates_join_request: true,
      expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });
    return result.invite_link;
  }

  async createReferralStartLink(token: string) {
    const me = await telegramApiCall<{ username?: string }>("getMe");
    if (!me.username) {
      throw new Error("Không thể lấy username bot Telegram để tạo link mời referral.");
    }
    return `https://t.me/${me.username}?start=ref_${token}`;
  }

  async sendVipEntryLinks(input: { userId: string; planCode?: string; headerText?: string }) {
    const chatIds = await getVipChatIdsForPlan(input.planCode);
    const inviteLinks = await Promise.all(chatIds.map((chatId) => this.createVipInviteLink(chatId)));
    await this.sendMessage(
      input.userId,
      [input.headerText ?? "Link vào kênh VIP (hiệu lực 24h):", inviteLinks.join("\n")].join("\n"),
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
          await telegramApiCall("banChatMember", {
            chat_id: chatId,
            user_id: userId,
            revoke_messages: false,
          });
          await telegramApiCall("unbanChatMember", {
            chat_id: chatId,
            user_id: userId,
            only_if_banned: true,
          });
        } catch (error) {
          if (isIgnorableTelegramRevokeError(error)) {
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
    await this.sendMessage(
      target.platformUserId,
      `Thanh toan da duoc xac nhan. VIP cua ban da kich hoat den ${expireAt.toLocaleString("vi-VN")}.`,
    );
  }

  async sendVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    await this.sendMessage(
      target.platformUserId,
      [
        `VIP cua ban se het han vao ${expireAt.toLocaleString("vi-VN")} (con khoang ${thresholdDays} ngay).`,
        "Gia han ngay bang /donate de khong bi ngat quyen truy cap nhom VIP.",
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
    await Promise.all(env.adminTelegramIds.map((adminId) => this.sendMessage(adminId, text)));
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
    await Promise.all(env.adminTelegramIds.map((adminId) => this.sendMessage(adminId, text)));
  }

  async checkHealth() {
    if (!env.TELEGRAM_BOT_ENABLED) {
      return;
    }
    await telegramApiCall("getMe");
  }

  async sendOpsAlert(message: string) {
    if (!env.adminTelegramIds.length) {
      return;
    }
    await Promise.all(env.adminTelegramIds.map((adminId) => this.sendMessage(adminId, `CANH BAO HE THONG: ${message}`)));
  }

  async isAdmin(platformUserId: string) {
    return env.adminTelegramIds.includes(platformUserId);
  }

  async createReferralInviteLink(input: {
    inviterUserId: string;
    inviterChatId?: string;
    referralToken: string;
  }) {
    return this.createReferralStartLink(input.referralToken);
  }

  async checkUserInCommunity(input: { userId: string; chatId?: string }) {
    const chatId = input.chatId ?? env.TELEGRAM_VIP_CHAT_ID;
    try {
      const result = await telegramApiCall<{ status: string }>("getChatMember", {
        chat_id: chatId,
        user_id: Number(input.userId),
      });
      return ["member", "administrator", "creator"].includes(result.status);
    } catch {
      return false;
    }
  }
}
