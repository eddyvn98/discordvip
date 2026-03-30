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
      inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
    },
    parseMode?: "HTML" | "MarkdownV2",
  ) => Promise<unknown>;
  getActiveDonatePlans: () => Promise<TelegramDonatePlan[]>;
  isAdmin: (platformUserId: string) => Promise<boolean>;
  answerCallbackQuery: (callbackQueryId: string) => Promise<void>;
};

const PROMPT_TTL_MS = 3 * 60 * 1000;
type PendingInputAction = "promo_code" | "referral_days";
const pendingInputByChat = new Map<string, { userId: string; expiresAt: number; action: PendingInputAction }>();

function redeemPromptKey(userId: string, chatId: string) {
  return `${userId}:${chatId}`;
}

function setPendingInput(userId: string, chatId: string, action: PendingInputAction) {
  pendingInputByChat.set(redeemPromptKey(userId, chatId), {
    userId,
    action,
    expiresAt: Date.now() + PROMPT_TTL_MS,
  });
}

function consumePendingInput(userId: string, chatId: string): PendingInputAction | null {
  const key = redeemPromptKey(userId, chatId);
  const pending = pendingInputByChat.get(key);
  if (!pending) {
    return null;
  }
  if (pending.expiresAt < Date.now()) {
    pendingInputByChat.delete(key);
    return null;
  }
  pendingInputByChat.delete(key);
  return pending.action;
}

function clearPendingInput(userId: string, chatId: string) {
  pendingInputByChat.delete(redeemPromptKey(userId, chatId));
}

function buildHomeMenu() {
  return {
    inline_keyboard: [
      [{ text: "Kiếm VIP", callback_data: "home_referral" }],
      [{ text: "Mua VIP", callback_data: "home_buy" }],
      [{ text: "Dùng thử VIP", callback_data: "acc_trialvip" }],
      [{ text: "VIP của tôi", callback_data: "acc_vipstatus" }],
    ],
  };
}

function buildDonateButtons(plans: TelegramDonatePlan[]) {
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
  inlineKeyboard.push([{ text: "Về Home", callback_data: "home_menu" }]);
  return inlineKeyboard;
}

async function showHome(input: RouterInput, chatId: string) {
  await input.sendMessage(chatId, "Chào mừng bạn. Chọn nhanh 1 nhóm thao tác:", buildHomeMenu());
}

async function showDonateMenu(input: RouterInput, chatId: string) {
  const plans = await input.getActiveDonatePlans();
  if (!plans.length) {
    await input.sendMessage(chatId, "Hiện tại chưa có gói VIP nào đang hoạt động.", buildHomeMenu());
    return;
  }

  const donateLines = [
    "<b>Chọn gói VIP phù hợp với bạn</b>",
    "- <b>39.000đ</b> - truy cập nhóm VIP 30 ngày",
    "- <b>99.000đ</b> - truy cập nhóm VIP 90 ngày",
    "- <b>199.000đ</b> - truy cập nhóm VIP 365 ngày",
    "",
    "Nhấn nút bên dưới để tiếp tục thanh toán.",
  ];

  await input.sendMessage(chatId, donateLines.join("\n"), { inline_keyboard: buildDonateButtons(plans) }, "HTML");
}

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

  const isCommand = text.startsWith("/");
  if (!isCommand) {
    const pendingAction = consumePendingInput(userId, chatId);
    if (pendingAction === "promo_code") {
      const code = text.trim();
      if (!code) {
        await input.sendMessage(chatId, "Mã không hợp lệ. Vui lòng nhập lại mã khuyến mãi.", buildHomeMenu());
        setPendingInput(userId, chatId, "promo_code");
        return;
      }
      await input.handlers.onRedeemVip({ userId, chatId, chatType, code });
      await input.handlers.onReferralMenu({ userId, chatId, chatType });
      return;
    }

    if (pendingAction === "referral_days") {
      const days = Number(text.trim());
      if (!Number.isInteger(days) || days < 10) {
        await input.sendMessage(chatId, "Số ngày không hợp lệ. Vui lòng nhập số nguyên từ 10 trở lên.", buildHomeMenu());
        setPendingInput(userId, chatId, "referral_days");
        return;
      }
      await input.handlers.onReferralRedeem({ userId, chatId, chatType, days });
      await input.handlers.onReferralMenu({ userId, chatId, chatType });
      return;
    }

    await showHome(input, chatId);
    return;
  }

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
      await input.sendMessage(chatId, "Đã ghi nhận ref link. Bạn có thể tiếp tục tại Home:", buildHomeMenu());
      return;
    }
    await showHome(input, chatId);
    return;
  }

  if (command === "/menu") {
    clearPendingInput(userId, chatId);
    await showHome(input, chatId);
    return;
  }

  if (command === "/invite") {
    clearPendingInput(userId, chatId);
    await input.sendMessage(chatId, "Lệnh cũ đã được chuyển sang thao tác bằng nút.", buildHomeMenu());
    await input.handlers.onReferralMenu({ userId, chatId, chatType });
    return;
  }

  if (command === "/donate") {
    clearPendingInput(userId, chatId);
    await input.sendMessage(chatId, "Lệnh cũ đã được chuyển sang thao tác bằng nút.", buildHomeMenu());
    await showDonateMenu(input, chatId);
    return;
  }

  if (command === "/vip30" || command === "/vip90" || command === "/vip365") {
    clearPendingInput(userId, chatId);
    await input.sendMessage(chatId, "Lệnh này đã ngưng sử dụng. Vui lòng dùng menu Mua VIP.", buildHomeMenu());
    await showDonateMenu(input, chatId);
    return;
  }

  if (command === "/trialvip") {
    clearPendingInput(userId, chatId);
    await input.handlers.onTrialVip({ userId, chatId, chatType });
    await showHome(input, chatId);
    return;
  }

  if (command === "/vipstatus") {
    clearPendingInput(userId, chatId);
    await input.handlers.onVipStatus({ userId, chatId, chatType });
    await showHome(input, chatId);
    return;
  }

  if (command === "/redeemvip") {
    clearPendingInput(userId, chatId);
    const code = parts[1]?.trim() ?? "";
    if (!code) {
      await input.sendMessage(chatId, "Vui lòng nhập mã: /redeemvip <ma_khuyen_mai>", buildHomeMenu());
      return;
    }
    await input.handlers.onRedeemVip({ userId, chatId, chatType, code });
    await input.handlers.onReferralMenu({ userId, chatId, chatType });
    return;
  }

  if (command === "/adminstats") {
    clearPendingInput(userId, chatId);
    if (!(await input.isAdmin(userId))) {
      await input.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
      return;
    }
    return input.handlers.onAdminStats({ userId, chatId, chatType });
  }

  if (command === "/admingrant") {
    clearPendingInput(userId, chatId);
    if (!(await input.isAdmin(userId))) {
      await input.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
      return;
    }
    const targetUserId = parts[1]?.trim() ?? "";
    const days = Number(parts[2] ?? "");
    if (!targetUserId || !Number.isInteger(days) || days === 0) {
      await input.sendMessage(chatId, "Dùng: /admingrant <telegram_user_id> <so_ngay, am de tru>");
      return;
    }
    return input.handlers.onAdminGrantVip({ userId, chatId, chatType, targetUserId, days });
  }

  if (command === "/adminrevoke") {
    clearPendingInput(userId, chatId);
    if (!(await input.isAdmin(userId))) {
      await input.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
      return;
    }
    const targetUserId = parts[1]?.trim() ?? "";
    if (!targetUserId) {
      await input.sendMessage(chatId, "Dùng: /adminrevoke <telegram_user_id>");
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

  if (data === "home_menu") await showHome(input, chatId);
  if (data === "home_referral") await input.handlers.onReferralMenu({ userId, chatId, chatType });
  if (data === "home_buy") await showDonateMenu(input, chatId);

  if (data === "acc_vipstatus") {
    await input.handlers.onVipStatus({ userId, chatId, chatType });
    await showHome(input, chatId);
  }
  if (data === "acc_trialvip") {
    await input.handlers.onTrialVip({ userId, chatId, chatType });
    await showHome(input, chatId);
  }
  if (data === "acc_redeem_help") {
    setPendingInput(userId, chatId, "promo_code");
    await input.sendMessage(
      chatId,
      "Gửi mã khuyến mãi ngay trong tin nhắn tiếp theo (không cần gõ /redeemvip).",
      buildHomeMenu(),
    );
  }
  if (data === "ref_redeem_custom") {
    setPendingInput(userId, chatId, "referral_days");
    await input.sendMessage(chatId, "Nhập số ngày VIP muốn đổi (số nguyên, tối thiểu 10).", buildHomeMenu());
  }

  if (data.startsWith("donate:")) {
    const planCode = data.replace("donate:", "").trim().toUpperCase();
    if (planCode) {
      await input.handlers.onDonate({ userId, chatId, chatType, planCode });
      await input.sendMessage(chatId, "Nếu đã thanh toán, bạn có thể bấm VIP của tôi để kiểm tra.", buildHomeMenu());
    }
  }
  if (data === "ref_menu") await input.handlers.onReferralMenu({ userId, chatId, chatType });
  if (data === "ref_create_link") await input.handlers.onReferralCreateLink({ userId, chatId, chatType });
  if (data === "ref_stats") await input.handlers.onReferralStats({ userId, chatId, chatType });
  if (data === "ref_verify") await input.handlers.onReferralVerify({ userId, chatId, chatType });
  if (
    data.startsWith("ref_redeem_") &&
    !["ref_redeem_custom"].includes(data)
  ) {
    await input.sendMessage(chatId, "Lựa chọn đổi VIP không hợp lệ. Vui lòng thử lại.");
  }

  await input.answerCallbackQuery(callbackQuery.id);
}
