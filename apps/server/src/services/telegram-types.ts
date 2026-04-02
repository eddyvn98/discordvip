export type TelegramMessage = {
  message_id: number;
  chat: { id: number | string; type: string; title?: string };
  text?: string;
  from?: { id: number | string; username?: string; first_name?: string };
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from?: { id: number | string; username?: string; first_name?: string };
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  chat_join_request?: {
    chat: { id: number | string; type: string };
    from: { id: number | string; username?: string; first_name?: string };
  };
};

export type TelegramApiResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
};

export type TelegramErrorResponse = {
  ok?: boolean;
  description?: string;
  error_code?: number;
};

export type TelegramDonatePlan = {
  code: string;
  name: string;
  amount: number;
};

export type TelegramBotCommand = {
  command: string;
  description: string;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
};

export type TelegramReplyKeyboardMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  is_persistent?: boolean;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
};

export type TelegramReplyMarkup = TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;

export type TelegramHandlers = {
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
  onAdminAdjustReferralPoints: (input: {
    userId: string;
    chatId: string;
    chatType: string;
    platform: "telegram" | "discord";
    targetUserId: string;
    deltaPoints: number;
    note?: string;
  }) => Promise<void>;
  onReferralMenu: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onReferralCreateLink: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onReferralStats: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
  onReferralRedeem: (input: { userId: string; chatId: string; chatType: string; days: number }) => Promise<void>;
  onReferralJoinByToken: (input: {
    userId: string;
    chatId: string;
    chatType: string;
    token: string;
  }) => Promise<{ ok: boolean; reason?: string }>;
  onReferralVerify: (input: { userId: string; chatId: string; chatType: string }) => Promise<void>;
};
