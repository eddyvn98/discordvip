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

type TelegramBotCommand = {
  command: string;
  description: string;
};

type TelegramReplyMarkup =
  | {
      inline_keyboard: Array<
        Array<
          | { text: string; callback_data: string }
          | { text: string; url: string }
          | { text: string; web_app: { url: string } }
        >
      >;
    }
  | {
      keyboard: Array<Array<{ text: string; web_app?: { url: string } }>>;
      resize_keyboard?: boolean;
      is_persistent?: boolean;
      one_time_keyboard?: boolean;
    };

type ErrorWithCause = Error & {
  cause?: {
    code?: string;
    errno?: string | number;
    message?: string;
  };
};

type TelegramHandlers = {
  onDonate: (input: { userId: string; chatId: string; chatType: string; planCode: string }) => Promise<void>;
  onTrialVip: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onVipStatus: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onWebVip: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
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

  private buildHomeReplyKeyboard(): TelegramReplyMarkup {
    const webAppUrl = new URL("/api/cinema", env.CINEMA_PUBLIC_BASE_URL).toString();
    return {
      keyboard: [
        [{ text: "🎁 Kiếm VIP" }, { text: "💸 Donate VIP" }],
        [{ text: "✨ Dùng thử VIP" }, { text: "📅 VIP của tôi" }],
        [{ text: "🎬 Mở web phim", web_app: { url: webAppUrl } }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  }

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

    await this.apiCall("setMyCommands", {
      commands: userCommands,
    });
    await this.apiCall("setMyCommands", {
      commands: userCommands,
      scope: {
        type: "all_private_chats",
      },
    });

    for (const adminId of env.adminTelegramIds) {
      await this.syncAdminCommandsForUser(adminId, userCommands, adminCommands);
    }
  }

  private getUserCommands(): TelegramBotCommand[] {
    return [
      { command: "start", description: "Bat dau va xem huong dan su dung" },
      { command: "donate", description: "Chon goi VIP 39k / 99k / 199k" },
      { command: "trialvip", description: "Kich hoat VIP trial (1 lan/30 ngay)" },
      { command: "vipstatus", description: "Xem trang thai VIP hien tai" },
      { command: "webvip", description: "Mo web phim VIP" },
    ];
  }

  private getAdminCommands(): TelegramBotCommand[] {
    return [
      { command: "adminstats", description: "Thong ke VIP (chi admin)" },
      { command: "admingrant", description: "Admin cong/tru VIP. Vi du: /admingrant 123456 30" },
      { command: "adminrevoke", description: "Admin thu hoi VIP. Vi du: /adminrevoke 123456" },
    ];
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

    await this.apiCall("setMyCommands", {
      commands: [...userCommands, ...adminCommands],
      scope: {
        type: "chat",
        chat_id: id,
      },
    });
    this.adminCommandsSynced.add(String(id));
  }

  private async syncUserCommandsForUser(userId: string, userCommands: TelegramBotCommand[]) {
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      return;
    }

    await this.apiCall("setMyCommands", {
      commands: userCommands,
      scope: {
        type: "chat",
        chat_id: id,
      },
    });
    this.userCommandsSynced.add(String(id));
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
    let command = parts[0];
    if (text === "🎁 Kiếm VIP") command = "/donate";
    if (text === "💸 Donate VIP") command = "/donate";
    if (text === "✨ Dùng thử VIP") command = "/trialvip";
    if (text === "📅 VIP của tôi") command = "/vipstatus";
    if (text === "🎬 Mở web phim") command = "/webvip";
    const isAdminUser = env.adminTelegramIds.includes(userId);

    if (isAdminUser && !this.adminCommandsSynced.has(userId)) {
      try {
        await this.syncAdminCommandsForUser(userId, this.getUserCommands(), this.getAdminCommands());
      } catch (error) {
        logger.warn("Failed to sync admin Telegram commands for user scope", { userId, error });
      }
    }
    if (!isAdminUser && !this.userCommandsSynced.has(userId)) {
      try {
        await this.syncUserCommandsForUser(userId, this.getUserCommands());
      } catch (error) {
        logger.warn("Failed to sync regular Telegram commands for user scope", { userId, error });
      }
    }

    if (command === "/start") {
      await this.sendMessage(
        chatId,
        [
          "<b>HƯỚNG DẪN DONATE THAM GIA NHÓM VIP TỰ ĐỘNG</b>",
          "• Gõ lệnh /donate trong kênh này và chọn gói VIP",
          "• Bot sẽ gửi thông tin chuyển khoản",
          "• Thanh toán xong → hệ thống xác nhận → nhận link tham gia nhóm VIP",
          "",
          "<b>MỘT SỐ LỆNH KHÁC</b>",
          "• Lệnh /trialvip",
          "Dùng thử VIP 24h (mỗi người được 1 lần / 1 tháng)",
          "",
          "• Lệnh /vipstatus",
          "Xem thời hạn VIP hiện tại",
          "",
          "<b>QUYỀN LỢI KHI VÀO NHÓM VIP</b>",
          "• Xem video trực tiếp, không cần vượt link, không có quảng cáo",
          "• Xem video sớm hơn nhóm thường",
          "• Được tải bất kì video nào yêu thích",
          "",
          "Bạn cần hỗ trợ liên hệ admin @socsuc18",
        ].join("\n"),
        this.buildHomeReplyKeyboard(),
        "HTML",
      );
      return;
    }

    if (command === "/donate") {
      const plans = await this.getActiveDonatePlans();
      if (!plans.length) {
        await this.sendMessage(chatId, "Hiện tại chưa có gói VIP nào đang hoạt động.");
        return;
      }

      const planByCode = new Map(plans.map((plan) => [plan.code.toUpperCase(), plan]));
      const pickPlan = (codes: string[], amount: number) =>
        codes.map((code) => planByCode.get(code)).find(Boolean) ?? plans.find((plan) => plan.amount === amount);
      const vip30 = pickPlan(["VIP_30_DAYS", "VIP30"], 39_000);
      const vip90 = pickPlan(["VIP_90_DAYS", "VIP90"], 99_000);
      const vip365 = pickPlan(["VIP_365_DAYS", "VIP365"], 199_000);
      const orderedPlans = [vip30, vip90, vip365].filter((plan): plan is TelegramDonatePlan => !!plan);
      const buttonPlans = orderedPlans.length > 0 ? orderedPlans : plans;

      const inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = buttonPlans.map((plan) => [
        {
          text:
            plan.amount === 39_000
              ? "VIP 30 ngày"
              : plan.amount === 99_000
                ? "VIP 90 ngày"
                : "VIP 365 ngày",
          callback_data: `donate:${plan.code}`,
        },
      ]);

        const donateLines = [
          "<b>Chọn gói VIP phù hợp với bạn</b>",
          "• <b>39.000đ</b> - quyền truy cập nhóm VIP trong 30 ngày",
          "• <b>99.000đ</b> - quyền truy cập nhóm VIP trong 90 ngày",
          "• <b>199.000đ</b> - quyền truy cập nhóm VIP trong 365 ngày",
          "",
          "Nhấn nút bên dưới để tiếp tục thanh toán.",
          "Cần hỗ trợ hoặc báo lỗi, liên hệ admin @socsuc18",
        ];

      await this.sendMessage(
        chatId,
        donateLines.join("\n"),
        {
          inline_keyboard: inlineKeyboard,
        },
        "HTML",
      );
      return;
    }

    if (command === "/vip30" || command === "/vip90" || command === "/vip365") {
      await this.sendMessage(chatId, "Lenh nay da ngung su dung. Vui long dung /donate de chon goi VIP.");
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

    if (command === "/webvip") {
      await this.handlers.onWebVip({ userId, chatId, chatType });
      return;
    }

    if (command === "/redeemvip") {
      const code = parts[1]?.trim() ?? "";
      if (!code) {
        await this.sendMessage(chatId, "Vui long nhap ma: /redeemvip <ma_khuyen_mai>");
        return;
      }
      await this.handlers.onRedeemVip({ userId, chatId, chatType, code });
      return;
    }

    if (command === "/adminstats") {
      if (!(await this.isAdmin(userId))) {
        await this.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }
      await this.handlers.onAdminStats({ userId, chatId, chatType });
      return;
    }

    if (command === "/admingrant") {
      if (!(await this.isAdmin(userId))) {
        await this.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }
      const targetUserId = parts[1]?.trim() ?? "";
      const days = Number(parts[2] ?? "");
      if (!targetUserId || !Number.isInteger(days) || days === 0) {
        await this.sendMessage(chatId, "Dung: /admingrant <telegram_user_id> <so_ngay, am de tru>");
        return;
      }
      await this.handlers.onAdminGrantVip({ userId, chatId, chatType, targetUserId, days });
      return;
    }

    if (command === "/adminrevoke") {
      if (!(await this.isAdmin(userId))) {
        await this.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }
      const targetUserId = parts[1]?.trim() ?? "";
      if (!targetUserId) {
        await this.sendMessage(chatId, "Dung: /adminrevoke <telegram_user_id>");
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
        "Yeu cau vao kenh VIP bi tu choi vi tai khoan chua co VIP hop le. Vui long thanh toan bang /donate.",
      );
      return;
    }

    await this.apiCall("approveChatJoinRequest", {
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
          `Da xac thuc kenh ${chatId} thanh cong. Ban co the vao web admin de gan plan.`,
        );
      }
    } catch (error) {
      logger.warn("Telegram channel verification failed", { error, chatId, telegramUserId });
    }
  }

  private async apiCall<T>(method: string, body?: Record<string, unknown>) {
    let response: Response;
    try {
      response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      throw new Error(`Telegram API ${method} network error: ${this.describeErrorCause(error)}`);
    }

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

  private async getAllConfiguredVipChatIds() {
    const channels = await prisma.telegramVipChannel.findMany({
      where: { isActive: true },
      select: { chatId: true },
    });
    return Array.from(new Set([env.TELEGRAM_VIP_CHAT_ID, ...channels.map((channel) => channel.chatId)].filter(Boolean)));
  }

  private describeErrorCause(error: unknown) {
    if (error instanceof Error) {
      const withCause = error as ErrorWithCause;
      const parts = [
        withCause.message,
        withCause.cause?.code,
        withCause.cause?.errno ? String(withCause.cause.errno) : undefined,
        withCause.cause?.message,
      ].filter(Boolean);
      return parts.join(" | ");
    }

    return String(error);
  }

  private async getVipChatIdsForPlan(planCode?: string) {
    const normalizedPlanCode = planCode?.toUpperCase().trim();
    if (!normalizedPlanCode) {
      return this.getAllConfiguredVipChatIds();
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

    return this.getAllConfiguredVipChatIds();
  }

  async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: TelegramReplyMarkup,
    parseMode?: "HTML" | "MarkdownV2",
  ) {
    return this.apiCall<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
      parse_mode: parseMode,
    });
  }

  async sendWebAppButton(chatId: string, text: string, webAppUrl: string, buttonText = "Mo Cinema VIP") {
    return this.sendMessage(
      chatId,
      text,
      {
        inline_keyboard: [
          [
            {
              text: buttonText,
              web_app: { url: webAppUrl },
            },
          ],
        ],
      },
      "HTML",
    );
  }

  async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string,
    parseMode?: "HTML" | "MarkdownV2",
  ) {
    return this.apiCall<TelegramMessage>("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: parseMode,
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
  async sendVipEntryLinks(input: { userId: string; planCode?: string; headerText?: string }) {
    const chatIds = await this.getVipChatIdsForPlan(input.planCode);
    const inviteLinks = await Promise.all(chatIds.map((chatId) => this.createVipInviteLink(chatId)));
    const normalizedLinksText = inviteLinks.join("\n");
    await this.sendMessage(
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
    const chatIds = await this.getAllConfiguredVipChatIds();
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


