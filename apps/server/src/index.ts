import { env } from "./config.js";
import { registerDiscordInteractions } from "./bootstrap/discord-interactions.js";
import { registerDiscordReferralHooks } from "./bootstrap/discord-referral-hooks.js";
import { registerTelegramHandlers } from "./bootstrap/telegram-handlers.js";
import { buildVietQrImageUrl, formatCurrency } from "./lib/billing.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./http/app.js";
import { prisma } from "./prisma.js";
import { startSchedulers } from "./scheduler.js";
import { AdminService } from "./services/admin-service.js";
import { AuthService } from "./services/auth-service.js";
import { DiscordPlatformAdapter } from "./services/discord-platform-adapter.js";
import { DiscordService } from "./services/discord-service.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PaymentService } from "./services/payment-service.js";
import { PlatformRegistry } from "./services/platform-registry.js";
import { PromoCodeService } from "./services/promo-code-service.js";
import { ReferralService } from "./services/referral-service.js";
import { TelegramService } from "./services/telegram-service.js";

const discordService = new DiscordService();
const telegramService = new TelegramService();
const discordAdapter = new DiscordPlatformAdapter(discordService);
const platformRegistry = new PlatformRegistry([discordAdapter, telegramService]);
const orderService = new OrderService();
const membershipService = new MembershipService();
const paymentService = new PaymentService(orderService, membershipService, platformRegistry);
const adminService = new AdminService(membershipService, discordService, platformRegistry);
const promoCodeService = new PromoCodeService();
const authService = new AuthService(discordService);
const referralService = new ReferralService(membershipService);

async function buildOrderMessage(order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string; durationDays: number };
}, platform: "telegram" | "discord") {
  const qrImageUrl = buildVietQrImageUrl({
    bankBin: env.SEPAY_BANK_BIN,
    accountNumber: env.SEPAY_ACCOUNT_NO,
    accountName: env.SEPAY_ACCOUNT_NAME,
    amount: order.amount,
    orderCode: order.orderCode,
  });

  const paymentInstruction =
    env.PAYMENT_MODE === "manual"
      ? "Admin sẽ xác nhận khoản ủng hộ thủ công và cấp VIP sau khi kiểm tra."
      : platform === "telegram"
        ? "Bot sẽ tự động gửi link mời vào nhóm VIP cho bạn sau khi hệ thống xác nhận chuyển khoản.\nCần hỗ trợ hoặc báo lỗi, liên hệ admin Telegram @socsuc18."
        : "Bot sẽ tự động cấp role VIP cho bạn sau khi hệ thống xác nhận chuyển khoản.\nCần hỗ trợ hoặc báo lỗi, liên hệ admin Discord ID: 1133916215375568967.";

  return { qrImageUrl, paymentInstruction };
}

function buildVipAccessTitle(order: { amount: number; plan: { durationDays: number } }) {
  const displayDurationDays = order.amount === 39_000 ? 30 : order.plan.durationDays;
  return `Ủng hộ server ${formatCurrency(order.amount)} - Nhận quyền truy cập kênh VIP ${displayDurationDays} ngày`;
}

async function bootstrap() {
  await membershipService.backfillPlatformColumns();

  await registerTelegramHandlers({
    telegramService,
    membershipService,
    orderService,
    promoCodeService,
    adminService,
    referralService,
    buildOrderMessage,
    buildVipAccessTitle,
  });

  registerDiscordReferralHooks({
    discordService,
    referralService,
  });

  await Promise.all(platformRegistry.list().map((adapter) => adapter.start()));

  registerDiscordInteractions({
    discordService,
    discordAdapter,
    orderService,
    membershipService,
    promoCodeService,
    paymentService,
    adminService,
    referralService,
    buildOrderMessage,
    buildVipAccessTitle,
  });

  startSchedulers(membershipService, platformRegistry, orderService, referralService);

  const app = createApp({
    adminService,
    authService,
    paymentService,
    promoCodeService,
  });

  app.listen(env.SERVER_PORT, () => {
    logger.info("Server started", { port: env.SERVER_PORT });
  });
}

bootstrap().catch(async (error) => {
  logger.error("Failed to bootstrap server", { error });
  await prisma.$disconnect();
  process.exit(1);
});

