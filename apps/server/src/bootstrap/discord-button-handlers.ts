import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { env } from "../config.js";
import { formatCurrency } from "../lib/billing.js";
import { DiscordPlatformAdapter } from "../services/discord-platform-adapter.js";
import { DiscordService } from "../services/discord-service.js";
import { MembershipService } from "../services/membership-service.js";
import { OrderService } from "../services/order-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";
import { ReferralService } from "../services/referral-service.js";

type BuildOrderMessageFn = (order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string; durationDays: number };
}) => Promise<{ qrImageUrl: string | null; paymentInstruction: string }>;
type BuildVipAccessTitleFn = (order: { amount: number; plan: { durationDays: number } }) => string;

function homeRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_referral").setLabel("Kiếm VIP").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("home_buy").setLabel("Mua VIP").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("home_account").setLabel("Tài khoản").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function referralRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ref_create_link").setLabel("Tạo link mời").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ref_stats").setLabel("Điểm của tôi").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ref_redeem_10").setLabel("Đổi 10 ngày").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ref_redeem_30").setLabel("Đổi 30 ngày").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ref_redeem_90").setLabel("Đổi 90 ngày").setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_menu").setLabel("Về Home").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buyRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("buy_vip30").setLabel("VIP 30 ngày").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_vip90").setLabel("VIP 90 ngày").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_vip365").setLabel("VIP 365 ngày").setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_menu").setLabel("Về Home").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function accountRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_vipstatus").setLabel("VIP của tôi").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("acc_trialvip").setLabel("Dùng thử VIP").setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_redeem_help").setLabel("Dùng mã khuyến mãi").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("home_menu").setLabel("Về Home").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export async function handleDiscordMenuCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName !== "menu" && interaction.commandName !== "invite") {
    return false;
  }
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "Home menu: chọn nhanh 1 nhóm thao tác bằng nút.",
    components: homeRows(),
  });
  return true;
}

export async function handleDiscordButton(input: {
  interaction: ButtonInteraction;
  discordService: DiscordService;
  discordAdapter: DiscordPlatformAdapter;
  paymentService: PaymentService;
  referralService: ReferralService;
  orderService: OrderService;
  membershipService: MembershipService;
  buildOrderMessage: BuildOrderMessageFn;
  buildVipAccessTitle: BuildVipAccessTitleFn;
}) {
  const {
    interaction,
    discordService,
    discordAdapter,
    paymentService,
    referralService,
    orderService,
    membershipService,
    buildOrderMessage,
    buildVipAccessTitle,
  } = input;

  if (interaction.customId.startsWith("manual_")) {
    const [action, orderId] = interaction.customId.split(":");
    if (!orderId) throw new Error("Manual review action is invalid.");
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) throw new Error("Bạn không có quyền duyệt đơn này.");
    if (action === "manual_confirm") await paymentService.confirmManualOrder(orderId);
    else if (action === "manual_reject") await paymentService.rejectManualOrder(orderId);
    else throw new Error("Unknown manual review action.");
    const statusText = action === "manual_confirm" ? "DA_XAC_NHAN" : "DA_TU_CHOI";
    const responseText = action === "manual_confirm" ? "Đã xác nhận khoản ủng hộ và cấp VIP." : "Đã từ chối đơn ủng hộ.";
    const currentContent = interaction.message.content || "";
    const auditLine = `Trạng thái: ${statusText} bởi <@${interaction.user.id}>`;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`manual_confirm:${orderId}`).setLabel("Xác nhận").setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId(`manual_reject:${orderId}`).setLabel("Từ chối").setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
    await interaction.update({
      content: currentContent.includes("Trạng thái:") ? currentContent.replace(/Trạng thái:.*/u, auditLine) : `${currentContent}\n${auditLine}`.trim(),
      components: [row],
    });
    await interaction.followUp({ flags: MessageFlags.Ephemeral, content: responseText });
    return true;
  }

  if (interaction.customId === "home_menu") {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Home menu:", components: homeRows() });
    return true;
  }
  if (interaction.customId === "home_referral") {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Menu Kiếm VIP: mời thành công +1 điểm (tương đương +1 ngày VIP). Cần tối thiểu 10 điểm để bắt đầu đổi VIP.",
      components: referralRows(),
    });
    return true;
  }
  if (interaction.customId === "home_buy") {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Chọn gói VIP:\n- 39.000đ (30 ngày)\n- 99.000đ (90 ngày)\n- 199.000đ (365 ngày)",
      components: buyRows(),
    });
    return true;
  }
  if (interaction.customId === "home_account") {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Menu Tài khoản:", components: accountRows() });
    return true;
  }

  if (interaction.customId === "buy_vip30" || interaction.customId === "buy_vip90" || interaction.customId === "buy_vip365") {
    const planCode =
      interaction.customId === "buy_vip30"
        ? "VIP_30_DAYS"
        : interaction.customId === "buy_vip90"
          ? "VIP_90_DAYS"
          : "VIP_365_DAYS";
    const order = await orderService.createOrder({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
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
      components: accountRows(),
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
    return true;
  }

  if (interaction.customId === "acc_trialvip") {
    try {
      const membership = await membershipService.grantTrial({
        platform: "discord",
        platformUserId: interaction.user.id,
        platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      });
      await discordAdapter.grantAccess({
        platform: "discord",
        platformUserId: interaction.user.id,
        platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      });
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Đã kích hoạt trial VIP tới <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.`,
        components: accountRows(),
      });
    } catch (error) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: error instanceof Error ? error.message : "Không thể kích hoạt trial.",
        components: accountRows(),
      });
    }
    return true;
  }

  if (interaction.customId === "acc_vipstatus") {
    const current = await membershipService.getActiveMembership({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
    });
    const membership =
      current ??
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
        components: accountRows(),
      });
      return true;
    }

    const source = membership.source === "TRIAL" ? "Trial" : membership.source === "MANUAL" ? "Manual" : "Paid";
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [`Nguồn VIP: **${source}**`, `Hết hạn: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`].join("\n"),
      components: accountRows(),
    });
    return true;
  }

  if (interaction.customId === "acc_redeem_help") {
    const modal = new ModalBuilder().setCustomId("redeemvip_modal").setTitle("Dùng mã khuyến mãi");
    const codeInput = new TextInputBuilder()
      .setCustomId("promo_code")
      .setLabel("Nhập mã khuyến mãi")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(64)
      .setPlaceholder("VD: WELCOME10");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === "ref_create_link") {
    const token = await referralService.ensureInviteToken({
      platform: "discord",
      inviterUserId: interaction.user.id,
      inviterChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
    });
    const inviteLink = await discordAdapter.createReferralInviteLink?.({
      inviterUserId: interaction.user.id,
      inviterChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      referralToken: token.token,
    });
    if (!inviteLink) throw new Error("Không tạo được link mời referral.");
    await referralService.ensureInviteToken({
      platform: "discord",
      inviterUserId: interaction.user.id,
      inviterChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      inviteLink,
    });
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Link mời của bạn: ${inviteLink}`, components: referralRows() });
    return true;
  }

  if (interaction.customId === "ref_stats") {
    const stats = await referralService.getInviteStats({
      platform: "discord",
      inviterUserId: interaction.user.id,
    });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [`Điểm hiện có: ${stats.points}`, `Lượt mời thành công: ${stats.successCount}`, `Lượt đã vào chờ verify: ${stats.joinedCount}`].join("\n"),
      components: referralRows(),
    });
    return true;
  }

  if (interaction.customId.startsWith("ref_redeem_")) {
    const days = Number(interaction.customId.replace("ref_redeem_", ""));
    if (![10, 30, 90].includes(days)) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Lựa chọn đổi VIP không hợp lệ.",
        components: referralRows(),
      });
      return true;
    }
    const result = await referralService.redeemVipDays({
      platform: "discord",
      userId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      vipDays: days,
    });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [
        `Đổi VIP thành công: +${days} ngày.`,
        `Điểm đã trừ: ${result.pointsSpent}`,
        `Điểm còn lại: ${result.balanceAfter}`,
        `Hạn VIP mới: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>`,
      ].join("\n"),
      components: referralRows(),
    });
    return true;
  }

  if (interaction.customId === "referral_verify") {
    await discordService.consumeVerify(interaction.user.id);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Verify thành công." });
    return true;
  }
  return false;
}

export async function handleDiscordModal(input: {
  interaction: ModalSubmitInteraction;
  promoCodeService: PromoCodeService;
}) {
  const { interaction, promoCodeService } = input;
  if (interaction.customId !== "redeemvip_modal") {
    return false;
  }

  const code = interaction.fields.getTextInputValue("promo_code").trim();
  if (!code) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Mã khuyến mãi không hợp lệ.",
      components: accountRows(),
    });
    return true;
  }

  try {
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
      components: accountRows(),
    });
  } catch (error) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: error instanceof Error ? error.message : "Không thể sử dụng mã khuyến mãi, vui lòng thử lại.",
      components: accountRows(),
    });
  }
  return true;
}
