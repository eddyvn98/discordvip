import { env } from "../config.js";
import { logger } from "../lib/logger.js";
import { AccessTarget, PlatformAdapter } from "./platform-adapter.js";

type TelegramMessage = {
  chat: { id: number | string; type: string };
  text?: string;
  from?: { id: number | string; username?: string; first_name?: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
};

type TelegramHandlers = {
  onDonate: (input: { userId: string; chatId: string; planCode: string }) => Promise<void>;
  onTrialVip: (input: { userId: string; chatId: string }) => Promise<void>;
  onVipStatus: (input: { userId: string; chatId: string }) => Promise<void>;
  onAdminStats: (input: { userId: string; chatId: string }) => Promise<void>;
};

export class TelegramService implements PlatformAdapter {
  readonly platform = "telegram" as const;
  private offset = 0;
  private polling = false;
  private handlers: TelegramHandlers | null = null;

  setHandlers(handlers: TelegramHandlers) {
    this.handlers = handlers;
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

    this.polling = true;
    logger.info("Telegram bot polling started");
    void this.pollLoop();
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        const updates = await this.apiCall<TelegramUpdate[]>("getUpdates", {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ["message"],
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
    const message = update.message;
    const text = message?.text?.trim();
    const from = message?.from;
    if (!message || !text || !from || !this.handlers) {
      return;
    }

    const userId = String(from.id);
    const chatId = String(message.chat.id);
    const [command, arg] = text.split(/\s+/, 2);

    if (command === "/start") {
      await this.sendMessage(
        chatId,
        [
          "Chao mung ban den voi bot VIP.",
          "Lenh ho tro:",
          "/donate VIP_30_DAYS | VIP_90_DAYS | VIP_365_DAYS",
          "/trialvip",
          "/vipstatus",
        ].join("\n"),
      );
      return;
    }

    if (command === "/donate") {
      const planCode = (arg ?? "").toUpperCase();
      if (!planCode) {
        await this.sendMessage(chatId, "Vui long nhap goi. Vi du: /donate VIP_30_DAYS");
        return;
      }
      await this.handlers.onDonate({ userId, chatId, planCode });
      return;
    }

    if (command === "/trialvip") {
      await this.handlers.onTrialVip({ userId, chatId });
      return;
    }

    if (command === "/vipstatus") {
      await this.handlers.onVipStatus({ userId, chatId });
      return;
    }

    if (command === "/adminstats") {
      await this.handlers.onAdminStats({ userId, chatId });
    }
  }

  private async apiCall<T>(method: string, body?: Record<string, unknown>) {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
      throw new Error(`Telegram API request failed: ${response.status}`);
    }

    const data = (await response.json()) as TelegramApiResponse<T>;
    if (!data.ok) {
      throw new Error(data.description ?? "Telegram API returned error");
    }

    return data.result;
  }

  async sendMessage(chatId: string, text: string) {
    await this.apiCall("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    });
  }

  async createVipInviteLink() {
    const result = await this.apiCall<{ invite_link: string }>("createChatInviteLink", {
      chat_id: env.TELEGRAM_VIP_CHAT_ID,
      member_limit: 1,
      creates_join_request: false,
      expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });
    return result.invite_link;
  }

  async grantAccess(target: AccessTarget) {
    const inviteLink = await this.createVipInviteLink();
    await this.sendMessage(
      target.platformUserId,
      [
        "Thanh toan da duoc xac nhan. VIP cua ban da kich hoat.",
        `Link vao nhom VIP (hieu luc 24h): ${inviteLink}`,
      ].join("\n"),
    );
  }

  async revokeAccess(target: AccessTarget) {
    const chatId = target.platformChatId || env.TELEGRAM_VIP_CHAT_ID;
    await this.apiCall("banChatMember", {
      chat_id: chatId,
      user_id: Number(target.platformUserId),
      revoke_messages: false,
    });
    await this.apiCall("unbanChatMember", {
      chat_id: chatId,
      user_id: Number(target.platformUserId),
      only_if_banned: true,
    });
  }

  async sendVipActivatedNotice(target: AccessTarget, expireAt: Date) {
    await this.sendMessage(
      target.platformUserId,
      `VIP cua ban da kich hoat den ${expireAt.toLocaleString("vi-VN")}.`,
    );
  }

  async sendVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    await this.sendMessage(
      target.platformUserId,
      `VIP cua ban se het han vao ${expireAt.toLocaleString("vi-VN")} (con khoang ${thresholdDays} ngay).`,
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

  async isAdmin(platformUserId: string) {
    return env.adminTelegramIds.includes(platformUserId);
  }
}

