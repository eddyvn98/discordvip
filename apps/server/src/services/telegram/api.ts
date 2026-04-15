import { env } from "../../config.js";
import { describeErrorCause } from "./utils.js";
import type { TelegramApiResponse, TelegramErrorResponse, TelegramMessage, TelegramReplyMarkup } from "./types.js";

export class TelegramApiClient {
  async apiCall<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      throw new Error(`Telegram API ${method} network error: ${describeErrorCause(error)}`);
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
}
