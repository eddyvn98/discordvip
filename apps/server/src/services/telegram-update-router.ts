import { logger } from "../lib/logger.js";
import { TelegramDonatePlan, TelegramHandlers, TelegramUpdate } from "./telegram-types.js";

type RouterInput = {
  update: TelegramUpdate;
  handlers: TelegramHandlers | null;
  adminTelegramIds: string[];
  adminCommandsSynced: Set<string>;
  userCommandsSynced: Set<string>;
  getUserCommands: () => Array<{ command: string; description: string }>;
  getAdminCommands: () => Array<{ command: string; description: string }>;
  syncAdminCommandsForUser: (
    userId: string,
    userCommands: Array<{ command: string; description: string }>,
    adminCommands: Array<{ command: string; description: string }>,
  ) => Promise<void>;
  syncUserCommandsForUser: (
    userId: string,
    userCommands: Array<{ command: string; description: string }>,
  ) => Promise<void>;
  sendMessage: (
    chatId: string,
    text: string,
    replyMarkup?: {
      inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
    },
    parseMode?: "HTML" | "MarkdownV2",
  ) => Promise<unknown>;
  getActiveDonatePlans: () => Promise<TelegramDonatePlan[]>;
  isAdmin: (platformUserId: string) => Promise<boolean>;
  answerCallbackQuery: (callbackQueryId: string) => Promise<void>;
};

export async function routeTelegramUpdate(input: RouterInput) {
  const callbackQuery = input.update.callback_query;
  if (callbackQuery) {
    await handleCallbackQuery(input, callbackQuery);
    return;
  }

  const message = input.update.message;
  const text = message?.text?.trim();
  const from = message?.from;
  if (!message || !text || !from || !input.handlers) {
    return;
  }

  const userId = String(from.id);
  const chatId = String(message.chat.id);
  const chatType = message.chat.type;
  const parts = text.split(/\s+/).filter(Boolean);
  const command = parts[0];
  const isAdminUser = input.adminTelegramIds.includes(userId);

  if (isAdminUser && !input.adminCommandsSynced.has(userId)) {
    try {
      await input.syncAdminCommandsForUser(userId, input.getUserCommands(), input.getAdminCommands());
    } catch (error) {
      logger.warn("Failed to sync admin Telegram commands for user scope", { userId, error });
    }
  }
  if (!isAdminUser && !input.userCommandsSynced.has(userId)) {
    try {
      await input.syncUserCommandsForUser(userId, input.getUserCommands());
    } catch (error) {
      logger.warn("Failed to sync regular Telegram commands for user scope", { userId, error });
    }
  }

  if (command === "/start") {
    const referralToken = parts[1]?.startsWith("ref_") ? parts[1].replace(/^ref_/u, "") : "";
    if (referralToken) {
      await input.handlers.onReferralJoinByToken({ userId, chatId, chatType, token: referralToken });
    }
    await input.handlers.onReferralMenu({ userId, chatId, chatType });
    return;
  }

  if (command === "/invite" || command === "/menu") {
    await input.handlers.onReferralMenu({ userId, chatId, chatType });
    return;
  }

  if (command === "/donate") {
    const plans = await input.getActiveDonatePlans();
    if (!plans.length) {
      await input.sendMessage(chatId, "Hiện tại chưa có gói VIP nào đang hoạt động.");
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
        text: plan.amount === 39_000 ? "VIP 30 ngày" : plan.amount === 99_000 ? "VIP 90 ngày" : "VIP 365 ngày",
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

    await input.sendMessage(chatId, donateLines.join("\n"), { inline_keyboard: inlineKeyboard }, "HTML");
    return;
  }

  if (command === "/vip30" || command === "/vip90" || command === "/vip365") {
    await input.sendMessage(chatId, "Lenh nay da ngung su dung. Vui long dung /donate de chon goi VIP.");
    return;
  }

  if (command === "/trialvip") return input.handlers.onTrialVip({ userId, chatId, chatType });
  if (command === "/vipstatus") return input.handlers.onVipStatus({ userId, chatId, chatType });
  if (command === "/redeemvip") {
    const code = parts[1]?.trim() ?? "";
    if (!code) {
      await input.sendMessage(chatId, "Vui long nhap ma: /redeemvip <ma_khuyen_mai>");
      return;
    }
    return input.handlers.onRedeemVip({ userId, chatId, chatType, code });
  }

  if (command === "/adminstats") {
    if (!(await input.isAdmin(userId))) {
      await input.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
      return;
    }
    return input.handlers.onAdminStats({ userId, chatId, chatType });
  }

  if (command === "/admingrant") {
    if (!(await input.isAdmin(userId))) {
      await input.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
      return;
    }
    const targetUserId = parts[1]?.trim() ?? "";
    const days = Number(parts[2] ?? "");
    if (!targetUserId || !Number.isInteger(days) || days === 0) {
      await input.sendMessage(chatId, "Dung: /admingrant <telegram_user_id> <so_ngay, am de tru>");
      return;
    }
    return input.handlers.onAdminGrantVip({ userId, chatId, chatType, targetUserId, days });
  }

  if (command === "/adminrevoke") {
    if (!(await input.isAdmin(userId))) {
      await input.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
      return;
    }
    const targetUserId = parts[1]?.trim() ?? "";
    if (!targetUserId) {
      await input.sendMessage(chatId, "Dung: /adminrevoke <telegram_user_id>");
      return;
    }
    await input.handlers.onAdminRevokeVip({ userId, chatId, chatType, targetUserId });
  }
}

async function handleCallbackQuery(input: RouterInput, callbackQuery: NonNullable<TelegramUpdate["callback_query"]>) {
  const from = callbackQuery.from;
  const chat = callbackQuery.message?.chat;
  const data = callbackQuery.data ?? "";

  if (!from || !chat || !input.handlers) {
    return;
  }

  const userId = String(from.id);
  const chatId = String(chat.id);
  const chatType = chat.type;

  if (data.startsWith("donate:")) {
    const planCode = data.replace("donate:", "").trim().toUpperCase();
    if (planCode) {
      await input.handlers.onDonate({ userId, chatId, chatType, planCode });
    }
  }
  if (data === "ref_menu") await input.handlers.onReferralMenu({ userId, chatId, chatType });
  if (data === "ref_create_link") await input.handlers.onReferralCreateLink({ userId, chatId, chatType });
  if (data === "ref_stats") await input.handlers.onReferralStats({ userId, chatId, chatType });
  if (data === "ref_verify") await input.handlers.onReferralVerify({ userId, chatId, chatType });
  if (data === "ref_redeem_10") await input.handlers.onReferralRedeem({ userId, chatId, chatType, days: 10 });
  if (data === "ref_redeem_30") await input.handlers.onReferralRedeem({ userId, chatId, chatType, days: 30 });
  if (data === "ref_redeem_90") await input.handlers.onReferralRedeem({ userId, chatId, chatType, days: 90 });

  await input.answerCallbackQuery(callbackQuery.id);
}
