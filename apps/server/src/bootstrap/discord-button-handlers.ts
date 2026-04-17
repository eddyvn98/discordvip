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
}, platform: "telegram" | "discord") => Promise<{ qrImageUrl: string | null; paymentInstruction: string }>;
type BuildVipAccessTitleFn = (order: { amount: number; plan: { durationDays: number } }) => string;

const QR_PANEL_TTL_MS = 10 * 60 * 1000;

function homeRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_referral").setLabel("?? Ki?m VIP").setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("home_buy").setLabel("?? Donate VIP").setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_trialvip").setLabel("? Dùng th? VIP").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_vipstatus").setLabel("?? VIP c?a tôi").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("acc_redeem_help").setLabel("??? Nh?p mã khuy?n mãi").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function referralRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ref_create_link").setLabel("?? T?o link m?i").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ref_stats").setLabel("?? Ði?m c?a tôi").setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ref_redeem_custom").setLabel("?? Ð?i VIP (1 di?m = 1 ngày VIP)").setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("nav_back_home").setLabel("?? Quay l?i").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buyRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("buy_vip30").setLabel("?? VIP 30 ngày").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_vip90").setLabel("?? VIP 90 ngày").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_vip365").setLabel("?? VIP 365 ngày").setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("nav_back_home").setLabel("?? Quay l?i").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function qrRows(orderCode: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`pay_check:${orderCode}`).setLabel("? Tôi dã thanh toán").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("nav_back_buy").setLabel("?? Quay l?i").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function welcomeContent() {
  return "?? Chào m?ng b?n d?n v?i BOT VIP\n\nT?i dây b?n có th?:\n• Ki?m di?m d? d?i VIP ??\n• Donate nhanh d? nh?n VIP ?\n• Dùng th? tru?c khi quy?t d?nh ??\n• Kích ho?t mã khuy?n mãi siêu ti?n ???\n\n?? Ch?n m?t tùy ch?n bên du?i d? b?t d?u ngay!";
}

function isEphemeralContext(interaction: ButtonInteraction) {
  return interaction.message.flags.has(MessageFlags.Ephemeral);
}

async function respondPanel(
  interaction: ButtonInteraction,
  payload: { content?: string; components?: ActionRowBuilder<ButtonBuilder>[]; embeds?: Array<Record<string, unknown>> },
) {
  // Ephemeral interactions should be updated in place.
  if (isEphemeralContext(interaction)) {
    await interaction.update(payload);
    return;
  }

  // Public panel should stay unchanged; user interactions are handled via ephemeral replies.
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
    if (!canAccess) throw new Error("B?n không có quy?n duy?t don này.");
    if (action === "manual_confirm") await paymentService.confirmManualOrder(orderId);
    else if (action === "manual_reject") await paymentService.rejectManualOrder(orderId);
    else throw new Error("Unknown manual review action.");
    const statusText = action === "manual_confirm" ? "DA_XAC_NHAN" : "DA_TU_CHOI";
    const responseText = action === "manual_confirm" ? "Ðã xác nh?n kho?n ?ng h? và c?p VIP." : "Ðã t? ch?i don ?ng h?.";
    const currentContent = interaction.message.content || "";
    const auditLine = `Tr?ng thái: ${statusText} b?i <@${interaction.user.id}>`;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`manual_confirm:${orderId}`).setLabel("Xác nh?n").setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId(`manual_reject:${orderId}`).setLabel("T? ch?i").setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
    await interaction.update({
      content: currentContent.includes("Tr?ng thái:") ? currentContent.replace(/Tr?ng thái:.*/u, auditLine) : `${currentContent}\n${auditLine}`.trim(),
      components: [row],
    });
    await interaction.followUp({ flags: MessageFlags.Ephemeral, content: responseText });
    return true;
  }

  if (interaction.customId.startsWith("admin_refpts:")) {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n không có quy?n dùng ch?c nang này." });
      return true;
    }
    const [, platform, deltaRaw] = interaction.customId.split(":");
    if (!platform || !deltaRaw || !["telegram", "discord"].includes(platform)) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Preset admin không h?p l?." });
      return true;
    }
    const delta = Number(deltaRaw);
    if (!Number.isInteger(delta) || delta === 0) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Preset admin không h?p l?." });
      return true;
    }
    const modal = new ModalBuilder()
      .setCustomId(`admin_refpts_modal:${platform}:${delta}`)
      .setTitle(`Ði?u ch?nh di?m (${platform.toUpperCase()} ${delta > 0 ? `+${delta}` : delta})`);
    const inputText = new TextInputBuilder()
      .setCustomId("target_and_note")
      .setLabel("Nh?p userId/username | ghi chú (tùy ch?n)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(180)
      .setPlaceholder("123456789 | Bù di?m khi?u n?i");
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
      content: "?? Ch?n gói VIP phù h?p v?i b?n\n\n• 30 ngày – 39.000d\n• 90 ngày – 99.000d (ti?t ki?m hon)\n• 365 ngày – 199.000d (r? nh?t ??)",
      components: buyRows(),
      embeds: [],
    });
    return true;
  }

  if (interaction.customId.startsWith("pay_check:")) {
    const orderCode = interaction.customId.replace("pay_check:", "").trim().toUpperCase();
    const order = await orderService.findByCode(orderCode);
    if (!order) {
      await respondPanel(interaction, {
        content: "Không tìm th?y don thanh toán. Vui lòng t?o don m?i trong m?c Donate VIP.",
        components: buyRows(),
        embeds: [],
      });
      return true;
    }

    if (order.status !== "PAID") {
      const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order, "discord");
      const discordPaymentInstruction = paymentInstruction.replace(
        /Discord ID:\s*(\d{5,})/gu,
        "<@$1>",
      );
      await respondPanel(interaction, {
        content: "",
        embeds: [
          {
            title: buildVipAccessTitle(order),
            description: [
              `S? ti?n: **${formatCurrency(order.amount)}**`,
              `N?i dung CK: \`DONATE ${order.orderCode}\``,
              `Quét QR ho?c chuy?n kho?n tru?c: <t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>`,
              discordPaymentInstruction,
              qrImageUrl ? `M? ?nh QR tr?c ti?p: ${qrImageUrl}` : "?? QR t?m th?i không t?o du?c, vui lòng chuy?n kho?n th? công theo thông tin bên trên.",
              "",
              "? H? th?ng chua ghi nh?n thanh toán.",
            ].join("\n"),
            image: qrImageUrl ? { url: qrImageUrl } : undefined,
          },
        ],
        components: qrRows(order.orderCode),
      });
      return true;
    }

    const membership = await membershipService.getLatestActiveMembershipForPlatformUser({
      platform: "discord",
      platformUserId: interaction.user.id,
    });
    const expiryLine =
      membership && membership.expireAt.getTime() > Date.now()
        ? `?? H?n VIP c?a b?n du?c kích ho?t d?n <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.`
        : "?? VIP c?a b?n dã du?c kích ho?t thành công.";
    await respondPanel(interaction, {
      content: [
        "? Thanh toán c?a b?n dã du?c xác nh?n thành công! C?m on b?n dã ?ng h? server.",
        `?? M?i b?n vào kênh <#${env.DISCORD_VIP_CHANNEL_ID}> d? b?t d?u tr?i nghi?m VIP ngay nhé!`,
        expiryLine,
      ].join("\n"),
      components: homeRows(),
      embeds: [],
    });
    return true;
  }

  if (interaction.customId === "home_referral") {
    await respondPanel(interaction, {
      content:
        "?? Cách ki?m VIP mi?n phí\n\n• M?i lu?t m?i b?n bè vào nhóm thành công = +1 di?m\n• 1 di?m = 1 ngày VIP\n\n?? C?n t?i thi?u 10 di?m d? d?i VIP\n?? Nh?n nút bên du?i d? l?y link m?i nhé!",
      components: referralRows(),
    });
    return true;
  }

  if (interaction.customId === "home_buy") {
    await respondPanel(interaction, {
      content: "?? Ch?n gói VIP phù h?p v?i b?n\n\n• 30 ngày – 39.000d\n• 90 ngày – 99.000d (ti?t ki?m hon)\n• 365 ngày – 199.000d (r? nh?t ??)",
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
    const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order, "discord");
    const discordPaymentInstruction = paymentInstruction.replace(
      /Discord ID:\s*(\d{5,})/gu,
      "<@$1>",
    );
    await respondPanel(interaction, {
      content: "",
      embeds: [
        {
          title: buildVipAccessTitle(order),
          description: [
            `S? ti?n: **${formatCurrency(order.amount)}**`,
            `N?i dung CK: \`DONATE ${order.orderCode}\``,
            `Quét QR ho?c chuy?n kho?n tru?c: <t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>`,
            discordPaymentInstruction,
            qrImageUrl ? `M? ?nh QR tr?c ti?p: ${qrImageUrl}` : "?? QR t?m th?i không t?o du?c, vui lòng chuy?n kho?n th? công theo thông tin bên trên.",
          ].join("\n"),
          image: qrImageUrl ? { url: qrImageUrl } : undefined,
        },
      ],
      components: qrRows(order.orderCode),
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
        content: `Ðã kích ho?t trial VIP t?i <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.`,
        components: homeRows(),
      });
    } catch (error) {
      await respondPanel(interaction, {
        content: error instanceof Error ? error.message : "Không th? kích ho?t trial.",
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
      await respondPanel(interaction, { content: "B?n chua có VIP dang ho?t d?ng.", components: homeRows() });
      return true;
    }

    const source = membership.source === "TRIAL" ? "Trial" : membership.source === "MANUAL" ? "Manual" : "Paid";
    await respondPanel(interaction, {
      content: [`Ngu?n VIP: **${source}**`, `H?t h?n: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`].join("\n"),
      components: homeRows(),
    });
    return true;
  }

  if (interaction.customId === "ref_redeem_custom") {
    const modal = new ModalBuilder().setCustomId("ref_redeem_modal").setTitle("Ð?i di?m sang VIP");
    const daysInput = new TextInputBuilder()
      .setCustomId("redeem_days")
      .setLabel("Nh?p s? ngày VIP mu?n d?i (t?i thi?u 10)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4)
      .setPlaceholder("Ví d?: 15");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(daysInput));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === "acc_redeem_help") {
    const modal = new ModalBuilder().setCustomId("redeemvip_modal").setTitle("Dùng mã khuy?n mãi");
    const codeInput = new TextInputBuilder()
      .setCustomId("promo_code")
      .setLabel("Nh?p mã khuy?n mãi")
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
    if (!inviteLink) throw new Error("Không t?o du?c link m?i referral.");
    await referralService.ensureInviteToken({
      platform: "discord",
      inviterUserId: interaction.user.id,
      inviterChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      inviteLink,
    });
    await respondPanel(interaction, { content: `Link m?i c?a b?n: ${inviteLink}`, components: referralRows() });
    return true;
  }

  if (interaction.customId === "ref_stats") {
    const stats = await referralService.getInviteStats({
      platform: "discord",
      inviterUserId: interaction.user.id,
    });
    await respondPanel(interaction, {
      content: [`Ði?m hi?n có: ${stats.points}`, `Lu?t m?i thành công: ${stats.successCount}`, `Lu?t dã vào ch? verify: ${stats.joinedCount}`].join("\n"),
      components: referralRows(),
    });
    return true;
  }

  if (interaction.customId.startsWith("ref_redeem_")) {
    const days = Number(interaction.customId.replace("ref_redeem_", ""));
    if (![10, 30, 90].includes(days)) {
      await respondPanel(interaction, { content: "L?a ch?n d?i VIP không h?p l?.", components: referralRows() });
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
        `Ð?i VIP thành công: +${days} ngày.`,
        `Ði?m dã tr?: ${result.pointsSpent}`,
        `Ði?m còn l?i: ${result.balanceAfter}`,
        `H?n VIP m?i: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>`,
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
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n không có quy?n dùng ch?c nang này." });
      return true;
    }
    const [, platform, deltaRaw] = interaction.customId.split(":");
    if (!platform || !deltaRaw || !["telegram", "discord"].includes(platform)) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Yêu c?u admin không h?p l?." });
      return true;
    }
    const deltaPoints = Number(deltaRaw);
    if (!Number.isInteger(deltaPoints) || deltaPoints === 0) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Yêu c?u admin không h?p l?." });
      return true;
    }
    const raw = interaction.fields.getTextInputValue("target_and_note").trim();
    const [targetUserIdRaw, ...noteParts] = raw.split("|");
    const targetUserInput = targetUserIdRaw?.trim() ?? "";
    const note = noteParts.join("|").trim();
    if (!targetUserInput) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Vui lòng nh?p user h?p l?." });
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
        "Ðã di?u ch?nh di?m referral thành công.",
        `N?n t?ng: ${platform}`,
        `User ID: ${resolvedUserId}`,
        `Ði?m thay d?i: ${deltaPoints > 0 ? `+${deltaPoints}` : String(deltaPoints)}`,
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
        content: "S? ngày không h?p l?. Vui lòng nh?p s? nguyên t? 10 tr? lên.",
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
          `Ð?i VIP thành công: +${days} ngày.`,
          `Ði?m dã tr?: ${result.pointsSpent}`,
          `Ði?m còn l?i: ${result.balanceAfter}`,
          `H?n VIP m?i: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>`,
        ].join("\n"),
        components: referralRows(),
      });
    } catch (error) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: error instanceof Error ? error.message : "Không th? d?i di?m VIP.",
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
      content: "Mã khuy?n mãi không h?p l?.",
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
        `Ðã s? d?ng mã ${result.promoCode.code} thành công.`,
        `C?ng thêm ${result.pointsAdded} di?m referral.`,
        `Ði?m hi?n có: ${result.balanceAfter}.`,
      ].join("\n"),
      components: referralRows(),
    });
  } catch (error) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: error instanceof Error ? error.message : "Không th? s? d?ng mã khuy?n mãi, vui lòng th? l?i.",
      components: referralRows(),
    });
  }
  return true;
}
