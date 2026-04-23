import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).optional().default("development"),
  DATABASE_URL: z.string().min(1),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  RUN_DB_PUSH_ON_START: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
  RUN_DB_SEED_ON_START: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
  DISCORD_BOT_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
  DISCORD_ACTIVITY_WEBVIP_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  DEV_BYPASS_ADMIN_AUTH: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  ADMIN_DEBUG_LOGIN_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  ADMIN_DEBUG_LOGIN_SECRET: z.string().optional().default(""),
  PAYMENT_MODE: z.enum(["manual", "sepay"]).optional().default("sepay"),
  DISCORD_BOT_TOKEN: z.string().optional().default(""),
  DISCORD_CLIENT_ID: z.string().optional().default(""),
  DISCORD_CLIENT_SECRET: z.string().optional().default(""),
  DISCORD_GUILD_ID: z.string().optional().default(""),
  DISCORD_VIP_ROLE_ID: z.string().optional().default(""),
  DISCORD_ADMIN_ROLE_ID: z.string().optional().default(""),
  DISCORD_ADMIN_CHANNEL_ID: z.string().optional().default(""),
  ADMIN_DISCORD_IDS: z.string().optional().default(""),
  TELEGRAM_BOT_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_VIP_CHAT_ID: z.string().optional().default(""),
  TELEGRAM_PLAN_CHAT_IDS: z.string().optional().default(""),
  TELEGRAM_ADMIN_IDS: z.string().optional().default(""),
  DISCORD_REDIRECT_URI: z.string().url().optional().default("http://localhost:3000/api/auth/discord/callback"),
  SERVER_PORT: z.coerce.number().default(3000),
  ADMIN_APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(1),
  SEPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  SEPAY_WEBHOOK_API_KEY: z.string().optional().default(""),
  SEPAY_ACCOUNT_NO: z.string().optional().default(""),
  SEPAY_BANK_BIN: z.string().optional().default(""),
  SEPAY_ACCOUNT_NAME: z.string().optional().default(""),
  PUBLIC_BASE_URL: z.string().url(),
  CINEMA_WEB_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  CINEMA_PUBLIC_BASE_URL: z.string().url().optional().default("http://localhost:3000"),
  CINEMA_PUBLIC_BASE_URL_FILE: z.string().optional().default(""),
  CINEMA_PUBLIC_BASE_URL_LOG_FILE: z.string().optional().default(""),
  CINEMA_MEDIA_ROOT: z.string().optional().default("/app/storage/cinema-media"),
  TELEFILM_BACKEND_URL: z.string().url().optional().default("http://127.0.0.1:9999"),
  TELETHON_BACKEND_URL: z.string().url().optional().default("http://telethon-stream:8090"),
  CINEMA_ENTRY_TICKET_TTL_SECONDS: z.coerce.number().int().positive().default(90),
  CINEMA_DISCORD_ENTRY_TICKET_TTL_SECONDS: z.coerce.number().int().positive().default(45),
  CINEMA_STREAM_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  CINEMA_ENTRY_SECRET: z.string().min(16).optional().default("change-this-cinema-entry-secret"),
  CINEMA_WEB_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  CINEMA_DISCORD_SESSION_IDLE_SECONDS: z.coerce.number().int().positive().default(300),
  CINEMA_PREVIEW_SECONDS: z.coerce.number().int().min(3).max(5).default(5),
  TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
});

const parsed = envSchema.parse(process.env);

const parseTelegramPlanChatIds = () => {
  if (!parsed.TELEGRAM_PLAN_CHAT_IDS.trim()) {
    return {} as Record<string, string[]>;
  }

  try {
    const raw = JSON.parse(parsed.TELEGRAM_PLAN_CHAT_IDS) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(raw).map(([planCode, chatIds]) => [
        planCode.toUpperCase(),
        Array.isArray(chatIds)
          ? chatIds.map((chatId) => String(chatId).trim()).filter(Boolean)
          : [],
      ]),
    );
  } catch (error) {
    throw new Error(
      `TELEGRAM_PLAN_CHAT_IDS must be valid JSON object. Error: ${error instanceof Error ? error.message : "Unknown parse error"
      }`,
    );
  }
};

export const env = {
  ...parsed,
  adminDiscordIds: parsed.ADMIN_DISCORD_IDS.split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  adminTelegramIds: parsed.TELEGRAM_ADMIN_IDS.split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  telegramPlanChatIds: parseTelegramPlanChatIds(),
};
