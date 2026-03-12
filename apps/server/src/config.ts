import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DISCORD_BOT_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
  DEV_BYPASS_ADMIN_AUTH: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
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
  TELEGRAM_ADMIN_IDS: z.string().optional().default(""),
  DISCORD_REDIRECT_URI: z.string().url().optional().default("http://localhost:3000/api/auth/discord/callback"),
  SERVER_PORT: z.coerce.number().default(3000),
  ADMIN_APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(1),
  SEPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  SEPAY_ACCOUNT_NO: z.string().optional().default(""),
  SEPAY_BANK_BIN: z.string().optional().default(""),
  SEPAY_ACCOUNT_NAME: z.string().optional().default(""),
  PUBLIC_BASE_URL: z.string().url(),
  TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  adminDiscordIds: parsed.ADMIN_DISCORD_IDS.split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  adminTelegramIds: parsed.TELEGRAM_ADMIN_IDS.split(",")
    .map((item) => item.trim())
    .filter(Boolean),
};
