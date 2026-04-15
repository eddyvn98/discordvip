export type TelegramMessage = {
  message_id: number;
  date?: number;
  chat: { id: number | string; type: string; title?: string };
  text?: string;
  caption?: string;
  video?: {
    file_id: string;
    mime_type?: string;
    duration?: number;
    thumbnail?: { file_id: string };
  };
  photo?: Array<{ file_id: string; width: number; height: number }>;
  document?: {
    file_id: string;
    mime_type?: string;
  };
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

export type TelegramReplyMarkup =
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

export type ErrorWithCause = Error & {
  cause?: {
    code?: string;
    errno?: string | number;
    message?: string;
  };
};

export type TelegramHandlers = {
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
