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
import { AdminService } from "../services/admin-service.js";
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

const QR_PANEL_TTL_MS = 10 * 60 * 1000;

function homeRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_referral").setLabel("🎁 Kiếm VIP").setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_buy").setLabel("💸 Donate VIP").setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_trialvip").setLabel("✨ Dùng thử VIP").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_vipstatus").setLabel("📅 VIP của tôi").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_redeem_help").setLabel("🎟️ Nhập mã khuyến mãi").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function referralRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ref_create_link").setLabel("🔗 Tạo link mời").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ref_stats").setLabel("📊 Điểm của tôi").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ref_redeem_custom").setLabel("💎 Đổi VIP (1 điểm = 1 ngày VIP)").setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("nav_back_home").setLabel("↩️ Quay lại").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buyRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("buy_vip30").setLabel("💎 VIP 30 ngày").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_vip90").setLabel("💎 VIP 90 ngày").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_vip365").setLabel("💎 VIP 365 ngày").setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("nav_back_home").setLabel("↩️ Quay lại").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function qrRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("nav_back_buy").setLabel("↩️ Quay lại").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function welcomeContent() {
  return "🔥 Chào mừng bạn đến với BOT VIP\n\nTại đây bạn có thể:\n• Kiếm điểm để đổi VIP 🎁\n• Donate nhanh để nhận VIP ⚡\n• Dùng thử trước khi quyết định 👀\n• Kích hoạt mã khuyến mãi siêu tiện 🎟️\n\n👉 Chọn một tùy chọn bên dưới để bắt đầu ngay!";
}

function isEphemeralContext(interaction: ButtonInteraction) {
  return interaction.message.flags.has(MessageFlags.Ephemeral);
}

async function respondPanel(
  interaction: ButtonInteraction,
  payload: { content?: string; components?: ActionRowBuilder<ButtonBuilder>[]; embeds?: Array<Record<string, unknown>> },
) {
  if (isEphemeralContext(interaction)) {
    await interaction.update(payload);
    return;
  }
  await interaction.reply({ flags: MessageFlags.Ephemeral, ...payload });
}

function scheduleEphemeralCleanup(interaction: ButtonInteraction, timeoutMs = QR_PANEL_TTL_MS) {
  setTimeout(async () => {
    try {
      await interaction.deleteReply();
    } catch {
      // ignore
    }
  }, timeoutMs);
}

export async function handleDiscordMenuCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName !== "menu" && interaction.commandName !== "invite") {
    return false;
  }
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: welcomeContent(),
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

  if (interaction.customId.startsWith("admin_refpts:")) {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Bạn không có quyền dùng chức năng này." });
      return true;
    }
    const [, platform, deltaRaw] = interaction.customId.split(":");
    if (!platform || !deltaRaw || !["telegram", "discord"].includes(platform)) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Preset admin không hợp lệ." });
      return true;
    }
    const delta = Number(deltaRaw);
    if (!Number.isInteger(delta) || delta === 0) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Preset admin không hợp lệ." });
      return true;
    }
    const modal = new ModalBuilder()
      .setCustomId(`admin_refpts_modal:${platform}:${delta}`)
      .setTitle(`Điều chỉnh điểm (${platform.toUpperCase()} ${delta > 0 ? `+${delta}` : delta})`);
    const inputText = new TextInputBuilder()
      .setCustomId("target_and_note")
      .setLabel("Nhập userId/username | ghi chú (tùy chọn)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(180)
      .setPlaceholder("123456789 | Bù điểm khiếu nại");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(inputText));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === "home_menu" || interaction.customId === "nav_back_home") {
    await respondPanel(interaction, { content: welcomeContent(), components: homeRows(), embeds: [] });
    return true;
  }
  if (interaction.customId === "nav_back_buy") {
    await respondPanel(interaction, {
      content: "💎 Chọn gói VIP phù hợp với bạn\n\n• 30 ngày – 39.000đ\n• 90 ngày – 99.000đ (tiết kiệm hơn)\n• 365 ngày – 199.000đ (rẻ nhất 🔥)",
      components: buyRows(),
      embeds: [],
    });
    return true;
  }

  if (interaction.customId === "home_referral") {
    await respondPanel(interaction, {
      content:
        "🎁 Cách kiếm VIP miễn phí\n\n• Mỗi lượt mời bạn bè vào nhóm thành công = +1 điểm\n• 1 điểm = 1 ngày VIP\n\n📌 Cần tối thiểu 10 điểm để đổi VIP\n👉 Nhấn nút bên dưới để lấy link mời nhé!",
      components: referralRows(),
    });
    return true;
  }

  if (interaction.customId === "home_buy") {
    await respondPanel(interaction, {
      content: "💎 Chọn gói VIP phù hợp với bạn\n\n• 30 ngày – 39.000đ\n• 90 ngày – 99.000đ (tiết kiệm hơn)\n• 365 ngày – 199.000đ (rẻ nhất 🔥)",
      components: buyRows(),
    });
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
    await respondPanel(interaction, {
      content: "",
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
      components: qrRows(),
    });
    scheduleEphemeralCleanup(interaction);
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
      await respondPanel(interaction, {
        content: `Đã kích hoạt trial VIP tới <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.`,
        components: homeRows(),
      });
    } catch (error) {
      await respondPanel(interaction, {
        content: error instanceof Error ? error.message : "Không thể kích hoạt trial.",
        components: homeRows(),
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
      await respondPanel(interaction, { content: "Bạn chưa có VIP đang hoạt động.", components: homeRows() });
      return true;
    }

    const source = membership.source === "TRIAL" ? "Trial" : membership.source === "MANUAL" ? "Manual" : "Paid";
    await respondPanel(interaction, {
      content: [`Nguồn VIP: **${source}**`, `Hết hạn: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`].join("\n"),
      components: homeRows(),
    });
    return true;
  }

  if (interaction.customId === "ref_redeem_custom") {
    const modal = new ModalBuilder().setCustomId("ref_redeem_modal").setTitle("Đổi điểm sang VIP");
    const daysInput = new TextInputBuilder()
      .setCustomId("redeem_days")
      .setLabel("Nhập số ngày VIP muốn đổi (tối thiểu 10)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4)
      .setPlaceholder("Ví dụ: 15");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(daysInput));
    await interaction.showModal(modal);
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
    await respondPanel(interaction, { content: `Link mời của bạn: ${inviteLink}`, components: referralRows() });
    return true;
  }

  if (interaction.customId === "ref_stats") {
    const stats = await referralService.getInviteStats({
      platform: "discord",
      inviterUserId: interaction.user.id,
    });
    await respondPanel(interaction, {
      content: [`Điểm hiện có: ${stats.points}`, `Lượt mời thành công: ${stats.successCount}`, `Lượt đã vào chờ verify: ${stats.joinedCount}`].join("\n"),
      components: referralRows(),
    });
    return true;
  }

  if (interaction.customId.startsWith("ref_redeem_")) {
    const days = Number(interaction.customId.replace("ref_redeem_", ""));
    if (![10, 30, 90].includes(days)) {
      await respondPanel(interaction, { content: "Lựa chọn đổi VIP không hợp lệ.", components: referralRows() });
      return true;
    }
    const result = await referralService.redeemVipDays({
      platform: "discord",
      userId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      vipDays: days,
    });
    await respondPanel(interaction, {
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
  referralService: ReferralService;
  adminService: AdminService;
  discordAdapter: DiscordPlatformAdapter;
}) {
  const { interaction, promoCodeService, referralService, adminService, discordAdapter } = input;

  if (interaction.customId.startsWith("admin_refpts_modal:")) {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Bạn không có quyền dùng chức năng này." });
      return true;
    }
    const [, platform, deltaRaw] = interaction.customId.split(":");
    if (!platform || !deltaRaw || !["telegram", "discord"].includes(platform)) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Yêu cầu admin không hợp lệ." });
      return true;
    }
    const deltaPoints = Number(deltaRaw);
    if (!Number.isInteger(deltaPoints) || deltaPoints === 0) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Yêu cầu admin không hợp lệ." });
      return true;
    }
    const raw = interaction.fields.getTextInputValue("target_and_note").trim();
    const [targetUserIdRaw, ...noteParts] = raw.split("|");
    const targetUserInput = targetUserIdRaw?.trim() ?? "";
    const note = noteParts.join("|").trim();
    if (!targetUserInput) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Vui lòng nhập user hợp lệ." });
      return true;
    }
    const resolvedUserId = await adminService.resolveReferralTargetUserId({
      platform: platform as "telegram" | "discord",
      rawUserInput: targetUserInput,
    });
    await adminService.adjustReferralPoints({
      platform: platform as "telegram" | "discord",
      userId: resolvedUserId,
      deltaPoints,
      note: note || `Admin adjust by ${interaction.user.id}`,
    });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [
        "Đã điều chỉnh điểm referral thành công.",
        `Nền tảng: ${platform}`,
        `User ID: ${resolvedUserId}`,
        `Điểm thay đổi: ${deltaPoints > 0 ? `+${deltaPoints}` : String(deltaPoints)}`,
      ].join("\n"),
    });
    return true;
  }

  if (interaction.customId === "ref_redeem_modal") {
    const rawDays = interaction.fields.getTextInputValue("redeem_days").trim();
    const days = Number(rawDays);
    if (!Number.isInteger(days) || days < 10) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Số ngày không hợp lệ. Vui lòng nhập số nguyên từ 10 trở lên.",
        components: referralRows(),
      });
      return true;
    }

    try {
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
    } catch (error) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: error instanceof Error ? error.message : "Không thể đổi điểm VIP.",
        components: referralRows(),
      });
    }
    return true;
  }

  if (interaction.customId !== "redeemvip_modal") {
    return false;
  }

  const code = interaction.fields.getTextInputValue("promo_code").trim();
  if (!code) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Mã khuyến mãi không hợp lệ.",
      components: referralRows(),
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
      components: referralRows(),
    });
  } catch (error) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: error instanceof Error ? error.message : "Không thể sử dụng mã khuyến mãi, vui lòng thử lại.",
      components: referralRows(),
    });
  }
  return true;
}
