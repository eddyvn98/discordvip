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
import { CinemaService } from "./services/cinema-service.js";
import { DiscordPlatformAdapter } from "./services/discord-platform-adapter.js";
import { DiscordService } from "./services/discord-service.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PaymentService } from "./services/payment-service.js";
import { PlatformRegistry } from "./services/platform-registry.js";
import { PromoCodeService } from "./services/promo-code-service.js";
import { TelegramService } from "./services/telegram-service.js";

const discordService = new DiscordService();
const telegramService = new TelegramService();
const discordAdapter = new DiscordPlatformAdapter(discordService);
const platformRegistry = new PlatformRegistry([discordAdapter, telegramService]);
const orderService = new OrderService();
const membershipService = new MembershipService();
const paymentService = new PaymentService(orderService, membershipService, platformRegistry);
const adminService = new AdminService(membershipService, discordService, platformRegistry);
const promoCodeService = new PromoCodeService(membershipService, platformRegistry);
const authService = new AuthService(discordService);
const cinemaService = new CinemaService(membershipService);

async function buildOrderMessage(order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string; durationDays: number };
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
      : "Bot sẽ tự động gửi link mời vào nhóm sau khi hệ thống xác nhận chuyển khoản.\nCần hỗ trợ hoặc báo lỗi, liên hệ admin @socsuc18";

  return {
    qrImageUrl,
    paymentInstruction,
  };
}

function buildVipAccessTitle(order: { amount: number; plan: { durationDays: number } }) {
  const displayDurationDays = order.amount === 39_000 ? 30 : order.plan.durationDays;
  return `Ủng hộ server ${formatCurrency(order.amount)} - Nhận quyền truy cập nhóm VIP ${displayDurationDays} ngày`;
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
        title: buildVipAccessTitle(order),
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

  const sourceLabel =
    membership.source === "TRIAL" ? "Trial" : membership.source === "MANUAL" ? "Manual" : "Paid";
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: [
      `Nguồn VIP: **${sourceLabel}**`,
      `Hết hạn: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`,
    ].join("\n"),
  });
}

async function handleRedeemVip(interaction: ChatInputCommandInteraction) {
  const code = interaction.options.getString("code", true);

  try {
    await discordService.getGuildMember(interaction.user.id);

    const result = await promoCodeService.redeemPromoCode({
      code,
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
    });

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [
        `Đã sử dụng mã ${result.promoCode.code} thành công.`,
        `Cộng thêm ${result.promoCode.durationDays} ngày VIP.`,
        `Hạn mới: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>.`,
      ].join("\n"),
    });
  } catch (error) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        error instanceof Error
          ? error.message
          : "Không thể sử dụng mã khuyến mãi, vui lòng thử lại.",
    });
  }
}

async function handleWebVip(interaction: ChatInputCommandInteraction) {
  try {
    const isDiscordAdmin = await discordAdapter.isAdmin(interaction.user.id);
    const url = await cinemaService.createEntryUrl({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      bypassVipCheck: isDiscordAdmin,
    });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Bấm nút bên dưới để mở web VIP (link ngắn hạn, không chia sẻ).",
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel("Mở web VIP").setStyle(ButtonStyle.Link).setURL(url),
        ),
      ],
    });
  } catch (error) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: error instanceof Error ? error.message : "Không thể mở web VIP lúc này.",
    });
  }
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

  const stats = await adminService.getVipStatsByPlatform("discord");
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [
      {
        title: `Thống kê VIP (${stats.label})`,
        fields: [
          { name: "VIP đang active", value: String(stats.activeVipCount), inline: true },
          { name: "VIP hết hạn hôm nay", value: String(stats.expiringTodayCount), inline: true },
          { name: "Doanh thu khớp VIP paid", value: formatCurrency(stats.alignedRevenue), inline: true },
        ],
      },
    ],
  });
}

async function handleGrantVip(interaction: ChatInputCommandInteraction) {
  const canAccess = await discordAdapter.isAdmin(interaction.user.id);
  if (!canAccess) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Bạn không có quyền sử dụng lệnh này.",
    });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const durationDays = interaction.options.getInteger("days", true);
  const result = await adminService.adjustDiscordMembershipDuration({
    discordUserId: targetUser.id,
    durationDays,
    grantedBy: interaction.user.id,
    grantedFrom: "discord_command",
  });

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: [
      durationDays > 0
        ? `Đã cộng thêm ${durationDays} ngày VIP cho <@${targetUser.id}>.`
        : `Đã trừ ${Math.abs(durationDays)} ngày VIP của <@${targetUser.id}>.`,
      `Hạn mới: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>.`,
    ].join("\n"),
  });
}

async function handleRevokeVip(interaction: ChatInputCommandInteraction) {
  const canAccess = await discordAdapter.isAdmin(interaction.user.id);
  if (!canAccess) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Bạn không có quyền sử dụng lệnh này.",
    });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  await adminService.revokeDiscordMembershipByUserId(targetUser.id);

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `Đã thu hồi VIP của <@${targetUser.id}>.`,
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
      const platformChatId = await membershipService.resolveTelegramPlatformChatId({
        platformUserId: userId,
      });
      const order = await orderService.createOrder({
        platform: "telegram",
        platformUserId: userId,
        platformChatId,
        planCode,
      });

      const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order);
      const donateText = [
        `<b>${buildVipAccessTitle(order)}</b>`,
        `<b>Số tiền:</b> ${formatCurrency(order.amount)}`,
        `<b>Nội dung CK:</b> <code>DONATE ${order.orderCode}</code>`,
        `<b>Hạn thanh toán:</b> ${order.expiresAt.toLocaleString("vi-VN")}`,
        paymentInstruction,
      ].join("\n");

      let sentMessage: { message_id: number } | null = null;
      if (qrImageUrl) {
        sentMessage = await telegramService.sendPhoto(chatId, qrImageUrl, donateText, "HTML");
      } else {
        sentMessage = await telegramService.sendMessage(chatId, donateText, undefined, "HTML");
      }

      if (sentMessage?.message_id) {
        await orderService.savePaymentPromptMessage(order.id, chatId, sentMessage.message_id);
      }
    },
    onTrialVip: async ({ userId, chatId }) => {
      try {
        const platformChatId = await membershipService.resolveTelegramPlatformChatId({
          platformUserId: userId,
        });
        const membership = await membershipService.grantTrial({
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
        });

        await telegramService.grantAccess({
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
        });
        await telegramService.sendMessage(
          chatId,
          `Đã kích hoạt trial VIP tới ${membership.expireAt.toLocaleString("vi-VN")}.`,
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể kích hoạt trial.",
        );
      }
    },
    onVipStatus: async ({ userId, chatId }) => {
      const defaultPlatformChatId = await membershipService.resolveTelegramPlatformChatId({
        platformUserId: userId,
      });
      const membership =
        (await membershipService.getActiveMembership({
          platform: "telegram",
          platformUserId: userId,
          platformChatId: defaultPlatformChatId,
        })) ??
        (await membershipService.getLatestActiveMembershipForPlatformUser({
          platform: "telegram",
          platformUserId: userId,
        }));
      if (!membership || membership.expireAt.getTime() <= Date.now()) {
        await telegramService.sendMessage(chatId, "Bạn chưa có VIP đang hoạt động.");
        return;
      }
      const sourceLabel =
        membership.source === "TRIAL"
          ? "Trial"
          : membership.source === "MANUAL"
            ? "Manual"
            : "Paid";
      await telegramService.sendMessage(
        chatId,
        [
          `Nguồn VIP: ${sourceLabel}`,
          `Hết hạn: ${membership.expireAt.toLocaleString("vi-VN")}`,
        ].join("\n"),
      );
      await telegramService.sendVipEntryLinks({
        userId,
        headerText: "Link vào kênh VIP (hiệu lực 24h):",
      });
    },
    onWebVip: async ({ userId, chatId }) => {
      try {
        const platformChatId = await membershipService.resolveTelegramPlatformChatId({
          platformUserId: userId,
        });
        const isTelegramAdmin = env.adminTelegramIds.includes(userId);
        const url = await cinemaService.createEntryUrl({
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
          bypassVipCheck: isTelegramAdmin,
        });
        await telegramService.sendWebAppButton(
          chatId,
          "Nhan nut ben duoi de mo <b>Cinema VIP</b> trong Telegram WebView.",
          url,
          "Open Cinema VIP",
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể mở web VIP lúc này.",
        );
      }
    },
    onRedeemVip: async ({ userId, chatId, code }) => {
      try {
        const platformChatId = await membershipService.resolveTelegramPlatformChatId({
          platformUserId: userId,
        });
        const result = await promoCodeService.redeemPromoCode({
          code,
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
        });
        await telegramService.sendMessage(
          chatId,
          [
            `Đã sử dụng mã ${result.promoCode.code} thành công.`,
            `Cộng thêm ${result.promoCode.durationDays} ngày VIP.`,
            `Hạn mới: ${result.membership.expireAt.toLocaleString("vi-VN")}.`,
          ].join("\n"),
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể sử dụng mã khuyến mãi.",
        );
      }
    },
    onAdminStats: async ({ userId, chatId, chatType }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(
          chatId,
          "Vì bảo mật, lệnh /adminstats chỉ được phép dùng trong private chat với bot.",
        );
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }

      const stats = await adminService.getVipStatsByPlatform("telegram");
      await telegramService.sendMessage(
        chatId,
        [
          `Thong ke VIP (${stats.label}):`,
          `VIP đang active: ${stats.activeVipCount}`,
          `VIP hết hạn hôm nay: ${stats.expiringTodayCount}`,
          `Doanh thu khớp VIP paid: ${formatCurrency(stats.alignedRevenue)}`,
        ].join("\n"),
      );
    },
    onAdminGrantVip: async ({ userId, chatId, chatType, targetUserId, days }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(
          chatId,
          "Vì bảo mật, lệnh admin chỉ được phép dùng trong private chat với bot.",
        );
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }

      try {
        const membership = await adminService.adjustTelegramMembershipDuration({
          telegramUserId: targetUserId,
          durationDays: days,
        });
        await telegramService.sendMessage(
          chatId,
          `Đã điều chỉnh VIP cho ${targetUserId}. Hạn mới: ${membership.expireAt.toLocaleString("vi-VN")}.`,
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể điều chỉnh VIP Telegram.",
        );
      }
    },
    onAdminRevokeVip: async ({ userId, chatId, chatType, targetUserId }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(
          chatId,
          "Vì bảo mật, lệnh admin chỉ được phép dùng trong private chat với bot.",
        );
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }

      try {
        await adminService.revokeTelegramMembershipByUserId(targetUserId);
        await telegramService.sendMessage(chatId, `Đã thu hồi VIP của ${targetUserId}.`);
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể thu hồi VIP Telegram.",
        );
      }
    },
  });

  telegramService.setChannelVerificationHandler(async ({ token, telegramUserId, chatId, chatTitle }) =>
    adminService.confirmTelegramChannelVerification({
      token,
      telegramUserId,
      chatId,
      chatTitle,
    }),
  );
  telegramService.setChannelPostHandler(async ({ chatId, chatTitle, message }) => {
    await cinemaService.importTelegramChannelPost({
      chatId,
      chatTitle,
      messageId: Number(message.message_id),
      date: message.date,
      text: message.text,
      caption: message.caption,
      video: message.video
        ? {
          fileId: message.video.file_id,
          mimeType: message.video.mime_type,
          duration: message.video.duration,
          thumbnailFileId: message.video.thumbnail?.file_id,
        }
        : undefined,
      photoFileIds: message.photo?.map((item) => item.file_id),
      document: message.document
        ? {
          fileId: message.document.file_id,
          mimeType: message.document.mime_type,
        }
        : undefined,
    });
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
      if (interaction.commandName === "webvip") {
        await handleWebVip(interaction);
        return;
      }

      if (interaction.commandName === "redeemvip") {
        await handleRedeemVip(interaction);
        return;
      }

      if (interaction.commandName === "adminstats") {
        await handleAdminStats(interaction);
        return;
      }

      if (interaction.commandName === "grantvip") {
        await handleGrantVip(interaction);
        return;
      }

      if (interaction.commandName === "revokevip") {
        await handleRevokeVip(interaction);
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
    promoCodeService,
    cinemaService,
    orderService,
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

