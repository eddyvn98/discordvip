import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";

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
const adminService = new AdminService(discordService);
const authService = new AuthService(discordService);

async function handleDonate(interaction: ChatInputCommandInteraction) {
  const planCode = interaction.options.getString("plan", true);
  const order = await orderService.createOrder(interaction.user.id, interaction.guildId!, planCode);

  const qrImageUrl = buildVietQrImageUrl({
    bankBin: env.SEPAY_BANK_BIN,
    accountNumber: env.SEPAY_ACCOUNT_NO,
    accountName: env.SEPAY_ACCOUNT_NAME,
    amount: order.amount,
    orderCode: order.orderCode,
  });

  const paymentInstruction =
    env.PAYMENT_MODE === "manual"
      ? "Admin sẽ xác nhận khoản ủng hộ thủ công và cấp role VIP sau khi kiểm tra."
      : "Bot sẽ tự cấp role VIP sau khi hệ thống xác nhận chuyển khoản.";

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [
      {
        title: `Ủng hộ server - ${order.plan.name}`,
        description: [
          `Số tiền: **${formatCurrency(order.amount)}**`,
          `Nội dung CK: \`DONATE ${order.orderCode}\``,
          `Quét QR hoặc chuyển khoản trước: <t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>`,
          paymentInstruction,
        ].join("\n"),
        image: qrImageUrl ? { url: qrImageUrl } : undefined,
      },
    ],
  });

  if (env.PAYMENT_MODE === "manual") {
    await discordService.sendManualOrderReview(order);
  }
}

async function handleTrial(interaction: ChatInputCommandInteraction) {
  try {
    const membership = await membershipService.grantTrial(interaction.user.id);
    await discordService.addVipRole(interaction.user.id);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `Đã kích hoạt trial VIP tới <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.`,
    });
  } catch (error) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: error instanceof Error ? error.message : "Không thể kích hoạt trial.",
    });
  }
}

async function handleVipStatus(interaction: ChatInputCommandInteraction) {
  const membership = await membershipService.getActiveMembership(interaction.user.id);

  if (!membership || membership.expireAt.getTime() <= Date.now()) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Bạn chưa có VIP đang hoạt động.",
    });
    return;
  }

  const sourceLabel = membership.source === "TRIAL" ? "Trial" : "Paid";
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: [
      `Nguồn VIP: **${sourceLabel}**`,
      `Hết hạn: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`,
    ].join("\n"),
  });
}

async function handleAdminStats(interaction: ChatInputCommandInteraction) {
  const canAccess = await discordService.memberHasAdminAccess(interaction.user.id);
  if (!canAccess) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Bạn không có quyền sử dụng lệnh này.",
    });
    return;
  }

  const stats = await adminService.getVipStats();
  await interaction.reply({
    embeds: [
      {
        title: "Thống kê VIP",
        fields: [
          { name: "VIP đang active", value: String(stats.activeVipCount), inline: true },
          { name: "VIP hết hạn hôm nay", value: String(stats.expiringTodayCount), inline: true },
          { name: "Doanh thu tháng", value: formatCurrency(stats.monthlyRevenue), inline: true },
        ],
      },
    ],
  });
}

function buildManualReviewComponents(orderId: string, disabled = false) {
  const approveButton = new ButtonBuilder()
    .setCustomId(`manual_confirm:${orderId}`)
    .setLabel("Xác nhận")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);
  const rejectButton = new ButtonBuilder()
    .setCustomId(`manual_reject:${orderId}`)
    .setLabel("Từ chối")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(approveButton, rejectButton)];
}

async function lockManualReviewMessage(
  interaction: ButtonInteraction,
  statusText: string,
  adminDiscordUserId: string,
) {
  const currentContent = interaction.message.content || "";
  const auditLine = `Trạng thái: ${statusText} bởi <@${adminDiscordUserId}>`;

  await interaction.update({
    content: currentContent.includes("Trạng thái:")
      ? currentContent.replace(/Trạng thái:.*/u, auditLine)
      : `${currentContent}\n${auditLine}`.trim(),
    components: buildManualReviewComponents(interaction.customId.split(":")[1] ?? "", true),
  });
}

async function handleManualReviewAction(customId: string, adminDiscordUserId: string) {
  const [action, orderId] = customId.split(":");
  if (!orderId) {
    throw new Error("Manual review action is invalid.");
  }

  const canAccess = await discordService.memberHasAdminAccess(adminDiscordUserId);
  if (!canAccess) {
    throw new Error("Bạn không có quyền duyệt đơn này.");
  }

  if (action === "manual_confirm") {
    await paymentService.confirmManualOrder(orderId);
    return {
      statusText: "DA_XAC_NHAN",
      responseText: "Đã xác nhận khoản ủng hộ và cấp VIP.",
    };
  }

  if (action === "manual_reject") {
    await paymentService.rejectManualOrder(orderId);
    return {
      statusText: "DA_TU_CHOI",
      responseText: "Đã từ chối đơn ủng hộ.",
    };
  }

  throw new Error("Unknown manual review action.");
}

async function bootstrap() {
  await discordService.start();

  discordService.client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        if (!interaction.customId.startsWith("manual_")) {
          return;
        }

        const result = await handleManualReviewAction(interaction.customId, interaction.user.id);
        await lockManualReviewMessage(interaction, result.statusText, interaction.user.id);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: result.responseText,
        });
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      if (interaction.commandName === "donate") {
        await handleDonate(interaction);
        return;
      }

      if (interaction.commandName === "trialvip") {
        await handleTrial(interaction);
        return;
      }

      if (interaction.commandName === "vipstatus") {
        await handleVipStatus(interaction);
        return;
      }

      if (interaction.commandName === "adminstats") {
        await handleAdminStats(interaction);
      }
    } catch (error) {
      logger.error("Interaction handling failed", { error });
      if (interaction.isRepliable() && (interaction.deferred || interaction.replied)) {
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: "Đã có lỗi xảy ra, vui lòng thử lại.",
        });
      } else if (interaction.isRepliable()) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
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
