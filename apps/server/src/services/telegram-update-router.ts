import { logger } from "../lib/logger.js";
import { TelegramDonatePlan, TelegramHandlers, TelegramReplyMarkup, TelegramUpdate } from "./telegram-types.js";

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
    replyMarkup?: TelegramReplyMarkup,
    parseMode?: "HTML" | "MarkdownV2",
  ) => Promise<unknown>;
  getActiveDonatePlans: () => Promise<TelegramDonatePlan[]>;
  isAdmin: (platformUserId: string) => Promise<boolean>;
  answerCallbackQuery: (callbackQueryId: string) => Promise<void>;
};

const PROMPT_TTL_MS = 3 * 60 * 1000;
type PendingInputAction = "promo_code" | "referral_days" | "admin_referral_adjust";
const pendingInputByChat = new Map<
  string,
  {
    userId: string;
    expiresAt: number;
    action: PendingInputAction;
    adminAdjustPlatform?: "telegram" | "discord";
    adminAdjustDelta?: number;
  }
>();
const HOME_BUTTONS = {
  referral: "🎁 Kiếm VIP",
  buy: "💎 Mua VIP",
  trial: "👀 Dùng thử VIP",
  status: "📅 VIP của tôi",
} as const;

const HOME_BUTTON_ALIASES: Record<keyof typeof HOME_BUTTONS, string[]> = {
  referral: [HOME_BUTTONS.referral, "Kiếm VIP"],
  buy: [HOME_BUTTONS.buy, "Mua VIP"],
  trial: [HOME_BUTTONS.trial, "Dùng thử VIP"],
  status: [HOME_BUTTONS.status, "VIP của tôi"],
};

const REFERRAL_BUTTONS = {
  createLink: "🔗 Tạo link mời",
  stats: "📊 Điểm của tôi",
  redeem: "💎 Đổi VIP (1 điểm = 1 ngày VIP)",
  promo: "🎟 Nhập mã khuyến mãi",
  home: "🏠 Về Home",
} as const;

const BUY_BUTTONS = {
  vip30: "💎 VIP 30 ngày",
  vip90: "💎 VIP 90 ngày",
  vip365: "💎 VIP 365 ngày",
  home: "🏠 Về Home",
} as const;

const ADMIN_BUTTONS = {
  panel: "🛠 Admin điểm",
  tgPlus1: "➕ TG +1",
  tgPlus5: "➕ TG +5",
  tgMinus1: "➖ TG -1",
  tgMinus5: "➖ TG -5",
  dcPlus1: "➕ DC +1",
  dcPlus5: "➕ DC +5",
  dcMinus1: "➖ DC -1",
  dcMinus5: "➖ DC -5",
  home: "🏠 Về Home",
} as const;

function redeemPromptKey(userId: string, chatId: string) {
  return `${userId}:${chatId}`;
}

function setPendingInput(
  userId: string,
  chatId: string,
  action: PendingInputAction,
  options?: { adminAdjustPlatform?: "telegram" | "discord"; adminAdjustDelta?: number },
) {
  pendingInputByChat.set(redeemPromptKey(userId, chatId), {
    userId,
    action,
    expiresAt: Date.now() + PROMPT_TTL_MS,
    ...options,
  });
}

function consumePendingInput(
  userId: string,
  chatId: string,
): {
  action: PendingInputAction;
  adminAdjustPlatform?: "telegram" | "discord";
  adminAdjustDelta?: number;
} | null {
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
  return {
    action: pending.action,
    adminAdjustPlatform: pending.adminAdjustPlatform,
    adminAdjustDelta: pending.adminAdjustDelta,
  };
}

function clearPendingInput(userId: string, chatId: string) {
  pendingInputByChat.delete(redeemPromptKey(userId, chatId));
}

function buildHomeMenu(isAdmin = false) {
  const keyboard: Array<Array<{ text: string }>> = [
    [{ text: HOME_BUTTONS.referral }, { text: HOME_BUTTONS.buy }],
    [{ text: HOME_BUTTONS.trial }, { text: HOME_BUTTONS.status }],
  ];
  if (isAdmin) {
    keyboard.push([{ text: ADMIN_BUTTONS.panel }]);
  }
  return {
    keyboard,
    is_persistent: true,
    resize_keyboard: true,
    input_field_placeholder: "Chọn chức năng từ menu bên dưới",
  };
}

function buildAdminReferralMenu() {
  return {
    keyboard: [
      [{ text: ADMIN_BUTTONS.tgPlus1 }, { text: ADMIN_BUTTONS.tgPlus5 }],
      [{ text: ADMIN_BUTTONS.tgMinus1 }, { text: ADMIN_BUTTONS.tgMinus5 }],
      [{ text: ADMIN_BUTTONS.dcPlus1 }, { text: ADMIN_BUTTONS.dcPlus5 }],
      [{ text: ADMIN_BUTTONS.dcMinus1 }, { text: ADMIN_BUTTONS.dcMinus5 }],
      [{ text: ADMIN_BUTTONS.home }],
    ],
    is_persistent: true,
    resize_keyboard: true,
    input_field_placeholder: "Chọn thao tác điểm cho user",
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
  const has30 = buttonPlans.some((p) => p.amount === 39_000);
  const has90 = buttonPlans.some((p) => p.amount === 99_000);
  const has365 = buttonPlans.some((p) => p.amount === 199_000);

  const keyboard: Array<Array<{ text: string }>> = [];
  const row: Array<{ text: string }> = [];
  if (has30) row.push({ text: BUY_BUTTONS.vip30 });
  if (has90) row.push({ text: BUY_BUTTONS.vip90 });
  if (has365) row.push({ text: BUY_BUTTONS.vip365 });
  if (row.length > 0) keyboard.push(row);
  keyboard.push([{ text: BUY_BUTTONS.home }]);

  return {
    keyboard,
    is_persistent: true,
    resize_keyboard: true,
    input_field_placeholder: "Chọn gói VIP để thanh toán",
  };
}

async function showHome(input: RouterInput, chatId: string, userId?: string) {
  const isAdmin = userId ? await input.isAdmin(userId) : false;
  await input.sendMessage(
    chatId,
    "👋 Chào mừng bạn đến với BOT VIP\nTại đây bạn có thể:\n• Kiếm điểm để đổi VIP 🎁\n• Mua VIP nhanh chóng ⚡\n• Dùng thử trước khi quyết định 👀",
    buildHomeMenu(isAdmin),
  );
}

async function showDonateMenu(input: RouterInput, chatId: string) {
  const plans = await input.getActiveDonatePlans();
  if (!plans.length) {
    await input.sendMessage(chatId, "Hiện tại chưa có gói VIP nào đang hoạt động.", buildHomeMenu());
    return;
  }

  const donateLines = [
    "<b>💎 Chọn gói VIP phù hợp với bạn</b>",
    "• 30 ngày – 39.000đ",
    "• 90 ngày – 99.000đ (tiết kiệm hơn)",
    "• 365 ngày – 199.000đ (rẻ nhất 🔥)",
    "",
    "👉 Nhấn nút bên dưới để thanh toán nhanh chóng",
  ];

  await input.sendMessage(chatId, donateLines.join("\n"), buildDonateButtons(plans), "HTML");
}

function getHomeButtonAction(text: string): keyof typeof HOME_BUTTONS | null {
  const normalized = text.trim();
  if (HOME_BUTTON_ALIASES.referral.includes(normalized)) return "referral";
  if (HOME_BUTTON_ALIASES.buy.includes(normalized)) return "buy";
  if (HOME_BUTTON_ALIASES.trial.includes(normalized)) return "trial";
  if (HOME_BUTTON_ALIASES.status.includes(normalized)) return "status";
  return null;
}

function getReferralButtonAction(text: string): keyof typeof REFERRAL_BUTTONS | null {
  const normalized = text.trim();
  if (normalized === REFERRAL_BUTTONS.createLink) return "createLink";
  if (normalized === REFERRAL_BUTTONS.stats) return "stats";
  if (normalized === REFERRAL_BUTTONS.redeem) return "redeem";
  if (normalized === REFERRAL_BUTTONS.promo) return "promo";
  if (normalized === REFERRAL_BUTTONS.home) return "home";
  return null;
}

function getBuyButtonPlanCode(text: string): string | null {
  const normalized = text.trim();
  if (normalized === BUY_BUTTONS.vip30) return "VIP_30_DAYS";
  if (normalized === BUY_BUTTONS.vip90) return "VIP_90_DAYS";
  if (normalized === BUY_BUTTONS.vip365) return "VIP_365_DAYS";
  return null;
}

function getAdminAdjustPreset(
  text: string,
): { platform: "telegram" | "discord"; deltaPoints: number } | null {
  const normalized = text.trim();
  if (normalized === ADMIN_BUTTONS.tgPlus1) return { platform: "telegram", deltaPoints: 1 };
  if (normalized === ADMIN_BUTTONS.tgPlus5) return { platform: "telegram", deltaPoints: 5 };
  if (normalized === ADMIN_BUTTONS.tgMinus1) return { platform: "telegram", deltaPoints: -1 };
  if (normalized === ADMIN_BUTTONS.tgMinus5) return { platform: "telegram", deltaPoints: -5 };
  if (normalized === ADMIN_BUTTONS.dcPlus1) return { platform: "discord", deltaPoints: 1 };
  if (normalized === ADMIN_BUTTONS.dcPlus5) return { platform: "discord", deltaPoints: 5 };
  if (normalized === ADMIN_BUTTONS.dcMinus1) return { platform: "discord", deltaPoints: -1 };
  if (normalized === ADMIN_BUTTONS.dcMinus5) return { platform: "discord", deltaPoints: -5 };
  return null;
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
    const normalizedText = text.trim();
    // Allow users to escape pending-input mode via menu buttons (especially "Về Home").
    if (
      getHomeButtonAction(normalizedText) ||
      getReferralButtonAction(normalizedText) ||
      getBuyButtonPlanCode(normalizedText) ||
      normalizedText === ADMIN_BUTTONS.panel ||
      normalizedText === ADMIN_BUTTONS.home ||
      getAdminAdjustPreset(normalizedText)
    ) {
      clearPendingInput(userId, chatId);
    }

    const pendingAction = consumePendingInput(userId, chatId);
    if (pendingAction?.action === "promo_code") {
      const code = text.trim();
      if (!code) {
        await input.sendMessage(chatId, "Mã không hợp lệ. Vui lòng nhập lại mã khuyến mãi.", buildHomeMenu(isAdminUser));
        setPendingInput(userId, chatId, "promo_code");
        return;
      }
      await input.handlers.onRedeemVip({ userId, chatId, chatType, code });
      await input.handlers.onReferralMenu({ userId, chatId, chatType });
      return;
    }

    if (pendingAction?.action === "referral_days") {
      const days = Number(text.trim());
      if (!Number.isInteger(days) || days < 10) {
        await input.sendMessage(chatId, "Số ngày không hợp lệ. Vui lòng nhập số nguyên từ 10 trở lên.", buildHomeMenu(isAdminUser));
        setPendingInput(userId, chatId, "referral_days");
        return;
      }
      await input.handlers.onReferralRedeem({ userId, chatId, chatType, days });
      await input.handlers.onReferralMenu({ userId, chatId, chatType });
      return;
    }

    if (pendingAction?.action === "admin_referral_adjust") {
      const platform = pendingAction.adminAdjustPlatform;
      const deltaPoints = pendingAction.adminAdjustDelta;
      if (!platform || !deltaPoints) {
        await input.sendMessage(chatId, "Thiếu cấu hình thao tác admin, vui lòng chọn lại từ menu Admin.");
        await showHome(input, chatId, userId);
        return;
      }
      const [targetUserIdRaw, ...noteParts] = text.split("|");
      const targetUserId = targetUserIdRaw?.trim() ?? "";
      const note = noteParts.join("|").trim();
      if (!targetUserId) {
        setPendingInput(userId, chatId, "admin_referral_adjust", {
          adminAdjustPlatform: platform,
          adminAdjustDelta: deltaPoints,
        });
        await input.sendMessage(
          chatId,
          "Vui lòng nhập đúng định dạng:\n<userId> | <ghi chú tùy chọn>\nVí dụ: 123456789 | Bù điểm khiếu nại",
          buildAdminReferralMenu(),
        );
        return;
      }
      await input.handlers.onAdminAdjustReferralPoints({
        userId,
        chatId,
        chatType,
        platform,
        targetUserId,
        deltaPoints,
        note: note || undefined,
      });
      await showHome(input, chatId, userId);
      return;
    }

    const referralAction = getReferralButtonAction(text);
    if (referralAction === "createLink") {
      await input.handlers.onReferralCreateLink({ userId, chatId, chatType });
      return;
    }
    if (referralAction === "stats") {
      await input.handlers.onReferralStats({ userId, chatId, chatType });
      return;
    }
    if (referralAction === "redeem") {
      setPendingInput(userId, chatId, "referral_days");
      await input.sendMessage(chatId, "Nhập số ngày VIP muốn đổi (số nguyên, tối thiểu 10).", buildHomeMenu(isAdminUser));
      return;
    }
    if (referralAction === "promo") {
      setPendingInput(userId, chatId, "promo_code");
      await input.sendMessage(chatId, "Gửi mã khuyến mãi ngay trong tin nhắn tiếp theo (không cần gõ /redeemvip).", buildHomeMenu(isAdminUser));
      return;
    }
    if (referralAction === "home") {
      await showHome(input, chatId, userId);
      return;
    }

    const planCodeFromButton = getBuyButtonPlanCode(text);
    if (planCodeFromButton) {
      await input.handlers.onDonate({ userId, chatId, chatType, planCode: planCodeFromButton });
      await input.sendMessage(chatId, "Nếu đã thanh toán, bạn có thể bấm VIP của tôi để kiểm tra.", buildHomeMenu(isAdminUser));
      return;
    }

    if (text.trim() === ADMIN_BUTTONS.panel) {
      if (chatType !== "private" || !(await input.isAdmin(userId))) {
        await showHome(input, chatId, userId);
        return;
      }
      await input.sendMessage(
        chatId,
        "Chọn thao tác điểm referral, sau đó gửi:\n<userId> | <ghi chú tùy chọn>",
        buildAdminReferralMenu(),
      );
      return;
    }
    if (text.trim() === ADMIN_BUTTONS.home) {
      await showHome(input, chatId, userId);
      return;
    }
    const adminPreset = getAdminAdjustPreset(text);
    if (adminPreset) {
      if (chatType !== "private" || !(await input.isAdmin(userId))) {
        await showHome(input, chatId, userId);
        return;
      }
      setPendingInput(userId, chatId, "admin_referral_adjust", {
        adminAdjustPlatform: adminPreset.platform,
        adminAdjustDelta: adminPreset.deltaPoints,
      });
      await input.sendMessage(
        chatId,
        `Đã chọn: ${adminPreset.platform.toUpperCase()} ${adminPreset.deltaPoints > 0 ? `+${adminPreset.deltaPoints}` : adminPreset.deltaPoints} điểm.\nGửi tiếp:\n<userId> | <ghi chú tùy chọn>`,
        buildAdminReferralMenu(),
      );
      return;
    }
    const homeAction = getHomeButtonAction(text);
    if (homeAction === "referral") {
      await input.handlers.onReferralMenu({ userId, chatId, chatType });
      return;
    }
    if (homeAction === "buy") {
      await showDonateMenu(input, chatId);
      return;
    }
    if (homeAction === "trial") {
      await input.handlers.onTrialVip({ userId, chatId, chatType });
      await showHome(input, chatId, userId);
      return;
    }
    if (homeAction === "status") {
      await input.handlers.onVipStatus({ userId, chatId, chatType });
      await showHome(input, chatId, userId);
      return;
    }

    await showHome(input, chatId, userId);
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
      const joinResult = await input.handlers.onReferralJoinByToken({ userId, chatId, chatType, token: referralToken });
      if (joinResult.ok) {
        await input.sendMessage(chatId, "Đã ghi nhận ref link. Bạn có thể tiếp tục tại Home:", buildHomeMenu(isAdminUser));
      }
      return;
    }
    await showHome(input, chatId, userId);
    return;
  }

  if (command === "/invite") {
    clearPendingInput(userId, chatId);
    await input.sendMessage(chatId, "Lệnh cũ đã được chuyển sang thao tác bằng nút.", buildHomeMenu(isAdminUser));
    await input.handlers.onReferralMenu({ userId, chatId, chatType });
    return;
  }

  if (command === "/donate") {
    clearPendingInput(userId, chatId);
    await input.sendMessage(chatId, "Lệnh cũ đã được chuyển sang thao tác bằng nút.", buildHomeMenu(isAdminUser));
    await showDonateMenu(input, chatId);
    return;
  }

  if (command === "/vip30" || command === "/vip90" || command === "/vip365") {
    clearPendingInput(userId, chatId);
    await input.sendMessage(chatId, "Lệnh này đã ngưng sử dụng. Vui lòng dùng menu Mua VIP.", buildHomeMenu(isAdminUser));
    await showDonateMenu(input, chatId);
    return;
  }

  if (command === "/trialvip") {
    clearPendingInput(userId, chatId);
    await input.handlers.onTrialVip({ userId, chatId, chatType });
    await showHome(input, chatId, userId);
    return;
  }

  if (command === "/vipstatus") {
    clearPendingInput(userId, chatId);
    await input.handlers.onVipStatus({ userId, chatId, chatType });
    await showHome(input, chatId, userId);
    return;
  }

  if (command === "/redeemvip") {
    clearPendingInput(userId, chatId);
    const code = parts[1]?.trim() ?? "";
    if (!code) {
      await input.sendMessage(chatId, "Vui lòng nhập mã: /redeemvip <ma_khuyen_mai>", buildHomeMenu(isAdminUser));
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

  if (data === "home_menu") await showHome(input, chatId, userId);
  if (data === "home_referral") await input.handlers.onReferralMenu({ userId, chatId, chatType });
  if (data === "home_buy") await showDonateMenu(input, chatId);

  if (data === "acc_vipstatus") {
    await input.handlers.onVipStatus({ userId, chatId, chatType });
    await showHome(input, chatId, userId);
  }
  if (data === "acc_trialvip") {
    await input.handlers.onTrialVip({ userId, chatId, chatType });
    await showHome(input, chatId, userId);
  }
  if (data === "acc_redeem_help") {
    setPendingInput(userId, chatId, "promo_code");
    await input.sendMessage(
      chatId,
      "Gửi mã khuyến mãi ngay trong tin nhắn tiếp theo (không cần gõ /redeemvip).",
      buildHomeMenu(await input.isAdmin(userId)),
    );
  }
  if (data === "ref_redeem_custom") {
    setPendingInput(userId, chatId, "referral_days");
    await input.sendMessage(chatId, "Nhập số ngày VIP muốn đổi (số nguyên, tối thiểu 10).", buildHomeMenu(await input.isAdmin(userId)));
  }

  if (data.startsWith("donate:")) {
    const planCode = data.replace("donate:", "").trim().toUpperCase();
    if (planCode) {
      await input.handlers.onDonate({ userId, chatId, chatType, planCode });
      await input.sendMessage(chatId, "Nếu đã thanh toán, bạn có thể bấm VIP của tôi để kiểm tra.", buildHomeMenu(await input.isAdmin(userId)));
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

