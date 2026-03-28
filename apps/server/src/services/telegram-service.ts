import { env } from "../config.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../prisma.js";
import { AccessTarget, PlatformAdapter } from "./platform-adapter.js";

type TelegramMessage = {
  message_id: number;
  chat: { id: number | string; type: string; title?: string };
  text?: string;
  from?: { id: number | string; username?: string; first_name?: string };
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from?: { id: number | string; username?: string; first_name?: string };
  message?: TelegramMessage;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  chat_join_request?: {
    chat: { id: number | string; type: string };
    from: { id: number | string; username?: string; first_name?: string };
  };
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
};

type TelegramErrorResponse = {
  ok?: boolean;
  description?: string;
  error_code?: number;
};

type TelegramDonatePlan = {
  code: string;
  name: string;
  amount: number;
};

type TelegramHandlers = {
  onDonate: (input: { userId: string; chatId: string; chatType: string; planCode: string }) => Promise<void>;
  onTrialVip: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onVipStatus: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onRedeemVip: (input: { userId: string; chatId: string; chatType: string; code: string }) => Promise<void>;
  onAdminStats: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onAdminGrantVip: (input: {
    userId: string;
    chatId: string;
    chatType: string;
    targetUserId: string;
    days: number;
  }) => Promise<void>;
  onAdminRevokeVip: (input: {
    userId: string;
    chatId: string;
    chatType: string;
    targetUserId: string;
  }) => Promise<void>;
};

export class TelegramService implements PlatformAdapter {
  readonly platform = "telegram" as const;
  private offset = 0;
  private polling = false;
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

    await this.syncCommands();
    this.polling = true;
    logger.info("Telegram bot polling started");
    void this.pollLoop();
  }

  private async syncCommands() {
    await this.apiCall("setMyCommands", {
      commands: [
        { command: "start", description: "Bắt đầu và xem hướng dẫn sử dụng" },
        { command: "vip30", description: "Tạo đơn gói VIP 30 ngày" },
        { command: "vip90", description: "Tạo đơn gói VIP 90 ngày" },
        { command: "vip365", description: "Tạo đơn gói VIP 365 ngày" },
        { command: "donate", description: "Mở menu chọn gói VIP bằng nút bấm" },
        { command: "trialvip", description: "Kích hoạt VIP trial (1 lần/30 ngày)" },
        { command: "vipstatus", description: "Xem trạng thái VIP hiện tại" },
        { command: "redeemvip", description: "Nhập mã khuyến mãi. Ví dụ: /redeemvip VIP-XXXX" },
        { command: "adminstats", description: "Thống kê VIP (chỉ admin)" },
        { command: "admingrant", description: "Admin cộng/trừ VIP. Ví dụ: /admingrant 123456 30" },
        { command: "adminrevoke", description: "Admin thu hồi VIP. Ví dụ: /adminrevoke 123456" },
      ],
    });
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        const updates = await this.apiCall<TelegramUpdate[]>("getUpdates", {
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

    const userId = String(from.id);
    const chatId = String(message.chat.id);
    const chatType = message.chat.type;
    const parts = text.split(/\s+/).filter(Boolean);
    const command = parts[0];

    if (command === "/start") {
      await this.sendMessage(
        chatId,
        [
          "Chào mừng bạn đến với bot VIP.",
          "Lệnh hỗ trợ:",
          "/vip30 | /vip90 | /vip365",
          "/donate (chon goi bang nut)",
          "/trialvip",
          "/vipstatus",
          "/redeemvip <ma>",
        ].join("\n"),
      );
      return;
    }

    if (command === "/donate") {
      const plans = await this.getActiveDonatePlans();
      if (!plans.length) {
        await this.sendMessage(chatId, "Hiện tại chưa có gói VIP nào đang hoạt động.");
        return;
      }

      const planLines = plans.map(
        (plan, index) => `${index + 1}. ${plan.name} - ${plan.amount.toLocaleString("vi-VN")} VND`,
      );
      const inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = [];
      for (let i = 0; i < plans.length; i += 2) {
        inlineKeyboard.push(
          plans.slice(i, i + 2).map((plan) => ({
            text: `${plan.amount.toLocaleString("vi-VN")}d`,
            callback_data: `donate:${plan.code}`,
          })),
        );
      }

      await this.sendMessage(
        chatId,
        ["Vui lòng chọn gói:", ...planLines].join("\n"),
        {
          inline_keyboard: inlineKeyboard,
        },
      );
      return;
    }

    if (command === "/vip30") {
      await this.handlers.onDonate({ userId, chatId, chatType, planCode: "VIP_30_DAYS" });
      return;
    }

    if (command === "/vip90") {
      await this.handlers.onDonate({ userId, chatId, chatType, planCode: "VIP_90_DAYS" });
      return;
    }

    if (command === "/vip365") {
      await this.handlers.onDonate({ userId, chatId, chatType, planCode: "VIP_365_DAYS" });
      return;
    }

    if (command === "/trialvip") {
      await this.handlers.onTrialVip({ userId, chatId, chatType });
      return;
    }

    if (command === "/vipstatus") {
      await this.handlers.onVipStatus({ userId, chatId, chatType });
      return;
    }

    if (command === "/redeemvip") {
      const code = parts[1]?.trim() ?? "";
      if (!code) {
        await this.sendMessage(chatId, "Vui lòng nhập mã: /redeemvip <mã_khuyến_mãi>");
        return;
      }
      await this.handlers.onRedeemVip({ userId, chatId, chatType, code });
      return;
    }

    if (command === "/adminstats") {
      await this.handlers.onAdminStats({ userId, chatId, chatType });
      return;
    }

    if (command === "/admingrant") {
      const targetUserId = parts[1]?.trim() ?? "";
      const days = Number(parts[2] ?? "");
      if (!targetUserId || !Number.isInteger(days) || days === 0) {
        await this.sendMessage(chatId, "Dùng: /admingrant <telegram_user_id> <số_ngày, âm để trừ>");
        return;
      }
      await this.handlers.onAdminGrantVip({ userId, chatId, chatType, targetUserId, days });
      return;
    }

    if (command === "/adminrevoke") {
      const targetUserId = parts[1]?.trim() ?? "";
      if (!targetUserId) {
        await this.sendMessage(chatId, "Dùng: /adminrevoke <telegram_user_id>");
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

    if (data.startsWith("donate:")) {
      const planCode = data.replace("donate:", "").trim().toUpperCase();
      if (planCode) {
        await this.handlers.onDonate({ userId, chatId, chatType, planCode });
      }
    }

    await this.apiCall("answerCallbackQuery", {
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
    const allowedChatIds = await this.getAllConfiguredVipChatIds();

    if (!allowedChatIds.includes(chatId)) {
      await this.apiCall("declineChatJoinRequest", {
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
      await this.apiCall("declineChatJoinRequest", {
        chat_id: chatId,
        user_id: Number(userId),
      });
      await this.sendMessage(
        userId,
        "Yêu cầu vào kênh VIP bị từ chối vì tài khoản chưa có VIP hợp lệ. Vui lòng thanh toán bằng /donate.",
      );
      return;
    }

    await this.apiCall("approveChatJoinRequest", {
      chat_id: chatId,
      user_id: Number(userId),
    });
    await this.sendMessage(userId, "Yêu cầu vào kênh VIP đã được duyệt.");
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
    const chatTitle = message.chat.title?.trim() || (message.chat.type === "channel" ? `Channel ${chatId}` : `Chat ${chatId}`);
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
          `Đã xác thực kênh ${chatId} thành công. Bạn có thể vào web admin để gán plan.`,
        );
      }
    } catch (error) {
      logger.warn("Telegram channel verification failed", { error, chatId, telegramUserId });
    }
  }

  private async apiCall<T>(method: string, body?: Record<string, unknown>) {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as TelegramErrorResponse | null;
      const description = payload?.description?.trim();
      throw new Error(
        description
          ? `Telegram API ${method} failed: ${response.status} - ${description}`
          : `Telegram API ${method} failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as TelegramApiResponse<T>;
    if (!data.ok) {
      const description = data.description?.trim();
      throw new Error(
        description
          ? `Telegram API ${method} returned error: ${description}`
          : `Telegram API ${method} returned error`,
      );
    }

    return data.result;
  }

  private isIgnorableRevokeError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes("user not found") ||
      message.includes("user_id_invalid") ||
      message.includes("participant_id_invalid") ||
      message.includes("member not found") ||
      message.includes("chat not found") ||
      message.includes("can't remove chat owner")
    );
  }

  private async getActiveDonatePlans(): Promise<TelegramDonatePlan[]> {
    const mappedPlans = await prisma.plan.findMany({
      where: {
        isActive: true,
        telegramChannelMappings: {
          some: {
            channel: {
              isActive: true,
            },
          },
        },
      },
      orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
      select: { code: true, name: true, amount: true },
    });

    const plans =
      mappedPlans.length > 0
        ? mappedPlans
        : await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
            select: { code: true, name: true, amount: true },
          });

    return plans.map((plan) => ({
      code: plan.code,
      name: plan.name,
      amount: plan.amount,
    }));
  }

  private getFallbackVipChatIds() {
    return [env.TELEGRAM_VIP_CHAT_ID].filter(Boolean);
  }

  private async getAllConfiguredVipChatIds() {
    const channels = await prisma.telegramVipChannel.findMany({
      where: { isActive: true },
      select: { chatId: true },
    });
    return Array.from(new Set([...this.getFallbackVipChatIds(), ...channels.map((channel) => channel.chatId)]));
  }

  private async getVipChatIdsForPlan(planCode?: string) {
    const normalizedPlanCode = planCode?.toUpperCase().trim();
    if (!normalizedPlanCode) {
      return this.getFallbackVipChatIds();
    }

    const channels = await prisma.telegramPlanChannel.findMany({
      where: {
        plan: {
          code: normalizedPlanCode,
          isActive: true,
        },
        channel: {
          isActive: true,
        },
      },
      select: {
        channel: {
          select: { chatId: true },
        },
      },
    });

    const fromPlan = channels.map((item) => item.channel.chatId);
    if (fromPlan.length > 0) {
      return fromPlan;
    }

    return this.getFallbackVipChatIds();
  }

  async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: {
      inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
    },
  ) {
    return this.apiCall<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    });
  }

  async sendPhoto(chatId: string, photoUrl: string, caption?: string) {
    return this.apiCall<TelegramMessage>("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption,
    });
  }

  async clearPaymentPromptMessage(input: { chatId: string; messageId: number }) {
    await this.apiCall("deleteMessage", {
      chat_id: input.chatId,
      message_id: input.messageId,
    });
  }

  async createVipInviteLink(chatId: string) {
    const result = await this.apiCall<{ invite_link: string }>("createChatInviteLink", {
      chat_id: chatId,
      creates_join_request: true,
      expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });
    return result.invite_link;
  }

  async grantAccess(target: AccessTarget) {
    const chatIds = await this.getVipChatIdsForPlan(target.planCode);
    const inviteLinks = await Promise.all(chatIds.map((chatId) => this.createVipInviteLink(chatId)));
    const normalizedLinksText = inviteLinks.map((link, index) => `Kênh VIP ${index + 1}: ${link}`).join("\n");
    await this.sendMessage(
      target.platformUserId,
      [
        "Thanh toán đã được xác nhận. VIP của bạn đã kích hoạt.",
        `Link vào kênh VIP (hiệu lực 24h):\n${normalizedLinksText}`,
      ].join("\n"),
    );
  }

  async revokeAccess(target: AccessTarget) {
    const chatIds = await this.getAllConfiguredVipChatIds();
    const userId = Number(target.platformUserId);
    if (!Number.isFinite(userId)) {
      throw new Error(`Telegram revoke failed: invalid user id ${target.platformUserId}`);
    }

    const failures: Array<{ chatId: string; error: unknown }> = [];

    await Promise.all(
      chatIds.map(async (chatId) => {
        try {
        await this.apiCall("banChatMember", {
          chat_id: chatId,
            user_id: userId,
          revoke_messages: false,
        });
        await this.apiCall("unbanChatMember", {
          chat_id: chatId,
            user_id: userId,
          only_if_banned: true,
        });
        } catch (error) {
          if (this.isIgnorableRevokeError(error)) {
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
      `VIP của bạn đã kích hoạt đến ${expireAt.toLocaleString("vi-VN")}.`,
    );
  }

  async sendVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    await this.sendMessage(
      target.platformUserId,
      `VIP của bạn sẽ hết hạn vào ${expireAt.toLocaleString("vi-VN")} (còn khoảng ${thresholdDays} ngày).`,
    );
  }

  async sendAdminVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    const text = [
      "Nhắc hết hạn VIP (Telegram)",
      `User: ${target.platformUserId}`,
      `Hết hạn: ${expireAt.toLocaleString("vi-VN")}`,
      `Mốc nhắc: ${thresholdDays} ngày`,
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
      "Đã xác nhận thanh toán tự động (Telegram).",
      `User: ${input.target.platformUserId}`,
      `Order: ${input.orderCode}`,
      `Số tiền: ${input.amount.toLocaleString("vi-VN")} VND`,
      `Mã giao dịch: ${input.providerTransactionId}`,
      `VIP hết hạn: ${input.expireAt.toLocaleString("vi-VN")}`,
    ].join("\n");

    await Promise.all(env.adminTelegramIds.map((adminId) => this.sendMessage(adminId, text)));
  }

  async checkHealth() {
    if (!env.TELEGRAM_BOT_ENABLED) {
      return;
    }

    await this.apiCall("getMe");
  }

  async sendOpsAlert(message: string) {
    if (!env.adminTelegramIds.length) {
      return;
    }

    const text = `CANH BAO HE THONG: ${message}`;
    await Promise.all(env.adminTelegramIds.map((adminId) => this.sendMessage(adminId, text)));
  }

  async isAdmin(platformUserId: string) {
    return env.adminTelegramIds.includes(platformUserId);
  }
}
