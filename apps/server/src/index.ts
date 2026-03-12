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
import { DiscordPlatformAdapter } from "./services/discord-platform-adapter.js";
import { DiscordService } from "./services/discord-service.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PaymentService } from "./services/payment-service.js";
import { PlatformRegistry } from "./services/platform-registry.js";
import { TelegramService } from "./services/telegram-service.js";

const discordService = new DiscordService();
const telegramService = new TelegramService();
const discordAdapter = new DiscordPlatformAdapter(discordService);
const platformRegistry = new PlatformRegistry([discordAdapter, telegramService]);
const orderService = new OrderService();
const membershipService = new MembershipService();
const paymentService = new PaymentService(orderService, membershipService, platformRegistry);
const adminService = new AdminService(discordService, platformRegistry);
const authService = new AuthService(discordService);

async function buildOrderMessage(order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string };
}) {
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
      : "Bot sẽ tự cấp VIP sau khi hệ thống xác nhận chuyển khoản.";

  return {
    qrImageUrl,
    paymentInstruction,
  };
}

async function handleDonate(interaction: ChatInputCommandInteraction) {
  const planCode = interaction.options.getString("plan", true);
  const order = await orderService.createOrder({
    platform: "discord",
    platformUserId: interaction.user.id,
    platformChatId: interaction.guildId!,
    planCode,
  });

  const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order);

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
    await discordAdapter.sendManualOrderReview?.({
      id: order.id,
      orderCode: order.orderCode,
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId!,
      amount: order.amount,
      expiresAt: order.expiresAt,
      plan: order.plan,
    });
  }
}

async function handleTrial(interaction: ChatInputCommandInteraction) {
  try {
    const membership = await membershipService.grantTrial({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId!,
    });
    await discordAdapter.grantAccess({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId!,
    });

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
  const membershipInCurrentGuild = await membershipService.getActiveMembership({
    platform: "discord",
    platformUserId: interaction.user.id,
    platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
  });
  const membership =
    membershipInCurrentGuild ??
    (interaction.guildId && interaction.guildId !== env.DISCORD_GUILD_ID
      ? await membershipService.getActiveMembership({
          platform: "discord",
          platformUserId: interaction.user.id,
          platformChatId: env.DISCORD_GUILD_ID,
        })
      : null);

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
  const canAccess = await discordAdapter.isAdmin(interaction.user.id);
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

  const canAccess = await discordAdapter.isAdmin(adminDiscordUserId);
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

async function bootstrapTelegramHandlers() {
  telegramService.setHandlers({
    onDonate: async ({ userId, chatId, planCode }) => {
      const order = await orderService.createOrder({
        platform: "telegram",
        platformUserId: userId,
        platformChatId: env.TELEGRAM_VIP_CHAT_ID,
        planCode,
      });

      const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order);
      await telegramService.sendMessage(
        chatId,
        [
          `Ung ho server - ${order.plan.name}`,
          `So tien: ${formatCurrency(order.amount)}`,
          `Noi dung CK: DONATE ${order.orderCode}`,
          `Han thanh toan: ${order.expiresAt.toLocaleString("vi-VN")}`,
          paymentInstruction,
          qrImageUrl ? `QR: ${qrImageUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
    onTrialVip: async ({ userId, chatId }) => {
      try {
        const membership = await membershipService.grantTrial({
          platform: "telegram",
          platformUserId: userId,
          platformChatId: env.TELEGRAM_VIP_CHAT_ID,
        });

        await telegramService.grantAccess({
          platform: "telegram",
          platformUserId: userId,
          platformChatId: env.TELEGRAM_VIP_CHAT_ID,
        });
        await telegramService.sendMessage(
          chatId,
          `Da kich hoat trial VIP toi ${membership.expireAt.toLocaleString("vi-VN")}.`,
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Khong the kich hoat trial.",
        );
      }
    },
    onVipStatus: async ({ userId, chatId }) => {
      const membership = await membershipService.getActiveMembership({
        platform: "telegram",
        platformUserId: userId,
        platformChatId: env.TELEGRAM_VIP_CHAT_ID,
      });
      if (!membership || membership.expireAt.getTime() <= Date.now()) {
        await telegramService.sendMessage(chatId, "Ban chua co VIP dang hoat dong.");
        return;
      }
      const sourceLabel = membership.source === "TRIAL" ? "Trial" : "Paid";
      await telegramService.sendMessage(
        chatId,
        [
          `Nguon VIP: ${sourceLabel}`,
          `Het han: ${membership.expireAt.toLocaleString("vi-VN")}`,
        ].join("\n"),
      );
    },
    onAdminStats: async ({ userId, chatId }) => {
      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Ban khong co quyen su dung lenh nay.");
        return;
      }

      const stats = await adminService.getVipStats();
      await telegramService.sendMessage(
        chatId,
        [
          "Thong ke VIP (Discord):",
          `VIP dang active: ${stats.activeVipCount}`,
          `VIP het han hom nay: ${stats.expiringTodayCount}`,
          `Doanh thu thang: ${formatCurrency(stats.monthlyRevenue)}`,
        ].join("\n"),
      );
    },
  });
}

async function bootstrap() {
  await membershipService.backfillPlatformColumns();
  await bootstrapTelegramHandlers();

  await Promise.all(platformRegistry.list().map((adapter) => adapter.start()));

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

  startSchedulers(membershipService, platformRegistry, orderService);

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
