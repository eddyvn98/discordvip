import { env } from "../config.js";
import { TelegramApiResponse, TelegramErrorResponse } from "./telegram-types.js";

type ErrorWithCause = Error & {
  cause?: {
    code?: string;
    errno?: string | number;
    message?: string;
  };
};

function describeErrorCause(error: unknown) {
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

export async function telegramApiCall<T>(method: string, body?: Record<string, unknown>) {
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
