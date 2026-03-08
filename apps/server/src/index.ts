import { Events, type ChatInputCommandInteraction } from "discord.js";

import { env } from "./config.js";
import { buildVietQrImageUrl, formatCurrency } from "./lib/billing.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./http/app.js";
import { prisma } from "./prisma.js";
import { startSchedulers } from "./scheduler.js";
import { AdminService } from "./services/admin-service.js";
import { AuthService } from "./services/auth-service.js";
import { DiscordService } from "./services/discord-service.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PaymentService } from "./services/payment-service.js";

const discordService = new DiscordService();
const orderService = new OrderService();
const membershipService = new MembershipService();
const paymentService = new PaymentService(orderService, membershipService, discordService);
const adminService = new AdminService();
const authService = new AuthService(discordService);

async function handleBuyVip(interaction: ChatInputCommandInteraction) {
  const planCode = interaction.options.getString("plan", true);
  const order = await orderService.createOrder(interaction.user.id, interaction.guildId!, planCode);

  const qrImageUrl = buildVietQrImageUrl({
    bankBin: env.SEPAY_BANK_BIN,
    accountNumber: env.SEPAY_ACCOUNT_NO,
    accountName: env.SEPAY_ACCOUNT_NAME,
    amount: order.amount,
    orderCode: order.orderCode,
  });

  await interaction.reply({
    ephemeral: true,
    embeds: [
      {
        title: `Mua ${order.plan.name}`,
        description: [
          `Số tiền: **${formatCurrency(order.amount)}**`,
          `Nội dung CK: \`VIP ${order.orderCode}\``,
          `Hạn thanh toán: <t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>`,
          "Bot sẽ tự cấp role VIP sau khi SePay báo đã nhận tiền.",
        ].join("\n"),
        image: qrImageUrl ? { url: qrImageUrl } : undefined,
      },
    ],
  });
}

async function handleTrial(interaction: ChatInputCommandInteraction) {
  try {
    const membership = await membershipService.grantTrial(interaction.user.id);
    await discordService.addVipRole(interaction.user.id);

    await interaction.reply({
      ephemeral: true,
      content: `Đã kích hoạt trial VIP tới <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.`,
    });
  } catch (error) {
    await interaction.reply({
      ephemeral: true,
      content: error instanceof Error ? error.message : "Không thể kích hoạt trial.",
    });
  }
}

async function handleVipStatus(interaction: ChatInputCommandInteraction) {
  const membership = await membershipService.getActiveMembership(interaction.user.id);

  if (!membership || membership.expireAt.getTime() <= Date.now()) {
    await interaction.reply({
      ephemeral: true,
      content: "Bạn chưa có VIP đang hoạt động.",
    });
    return;
  }

  const sourceLabel = membership.source === "TRIAL" ? "Trial" : "Paid";
  await interaction.reply({
    ephemeral: true,
    content: [
      `Nguồn VIP: **${sourceLabel}**`,
      `Hết hạn: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`,
    ].join("\n"),
  });
}

async function bootstrap() {
  await discordService.start();

  discordService.client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    try {
      if (interaction.commandName === "buyvip") {
        await handleBuyVip(interaction);
        return;
      }

      if (interaction.commandName === "trialvip") {
        await handleTrial(interaction);
        return;
      }

      if (interaction.commandName === "vipstatus") {
        await handleVipStatus(interaction);
      }
    } catch (error) {
      logger.error("Interaction handling failed", { error });
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          ephemeral: true,
          content: "Đã có lỗi xảy ra, vui lòng thử lại.",
        });
      } else {
        await interaction.reply({
          ephemeral: true,
          content: "Đã có lỗi xảy ra, vui lòng thử lại.",
        });
      }
    }
  });

  startSchedulers(membershipService, discordService, orderService);

  const app = createApp({
    adminService,
    authService,
    paymentService,
  });

  app.listen(env.SERVER_PORT, () => {
    logger.info("Server started", {
      port: env.SERVER_PORT,
    });
  });
}

bootstrap().catch(async (error) => {
  logger.error("Failed to bootstrap server", { error });
  await prisma.$disconnect();
  process.exit(1);
});
