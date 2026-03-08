import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_VIP_ROLE_ID: z.string().min(1),
  DISCORD_ADMIN_ROLE_ID: z.string().optional().default(""),
  ADMIN_DISCORD_IDS: z.string().optional().default(""),
  DISCORD_REDIRECT_URI: z.string().url(),
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
};
