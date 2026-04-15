import { getCinemaPublicBaseUrl } from "../../lib/public-base-url.js";
import type { ErrorWithCause, TelegramReplyMarkup } from "./types.js";

export function buildHomeReplyKeyboard(): TelegramReplyMarkup {
  const webAppUrl = new URL("/api/cinema", getCinemaPublicBaseUrl()).toString();
  return {
    keyboard: [[{ text: "🎬 Mở web phim", web_app: { url: webAppUrl } }]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export function isIgnorableRevokeError(error: unknown): boolean {
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

export function describeErrorCause(error: unknown): string {
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

