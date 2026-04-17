import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, type ChatInputCommandInteraction } from "discord.js";

import { env } from "../config.js";
import { formatCurrency } from "../lib/billing.js";
import { AdminService } from "../services/admin-service.js";
import { DiscordPlatformAdapter } from "../services/discord-platform-adapter.js";
import { DiscordService } from "../services/discord-service.js";
import { MembershipService } from "../services/membership-service.js";
import { OrderService } from "../services/order-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";

type BuildOrderMessageFn = (order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string; durationDays: number };
}, platform: "telegram" | "discord") => Promise<{ qrImageUrl: string | null; paymentInstruction: string }>;
type BuildVipAccessTitleFn = (order: { amount: number; plan: { durationDays: number } }) => string;

function adminReferralRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("admin_refpts:telegram:1").setLabel("? TG +1").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("admin_refpts:telegram:5").setLabel("? TG +5").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("admin_refpts:telegram:-1").setLabel("? TG -1").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("admin_refpts:telegram:-5").setLabel("? TG -5").setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("admin_refpts:discord:1").setLabel("? DC +1").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("admin_refpts:discord:5").setLabel("? DC +5").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("admin_refpts:discord:-1").setLabel("? DC -1").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("admin_refpts:discord:-5").setLabel("? DC -5").setStyle(ButtonStyle.Danger),
    ),
  ];
}

export async function handleDiscordChatCommand(
  input: {
    interaction: ChatInputCommandInteraction;
    discordService: DiscordService;
    discordAdapter: DiscordPlatformAdapter;
    orderService: OrderService;
    membershipService: MembershipService;
    promoCodeService: PromoCodeService;
    adminService: AdminService;
    buildOrderMessage: BuildOrderMessageFn;
    buildVipAccessTitle: BuildVipAccessTitleFn;
  },
) {
  const {
    interaction,
    discordService,
    discordAdapter,
    orderService,
    membershipService,
    promoCodeService,
    adminService,
    buildOrderMessage,
    buildVipAccessTitle,
  } = input;

  if (interaction.commandName === "donate") {
    const planCode = interaction.options.getString("plan", true);
    const order = await orderService.createOrder({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId!,
      planCode,
    });
    const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order, "discord");
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        {
          title: buildVipAccessTitle(order),
          description: [
            `S? ti?n: **${formatCurrency(order.amount)}**`,
            `N?i dung CK: \`DONATE ${order.orderCode}\``,
            `Quét QR ho?c chuy?n kho?n tru?c: <t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>`,
            paymentInstruction,
            qrImageUrl ? `M? ?nh QR tr?c ti?p: ${qrImageUrl}` : "?? QR t?m th?i không t?o du?c, vui lòng chuy?n kho?n th? công theo thông tin bên trên.",
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
    return true;
  }

  if (interaction.commandName === "trialvip") {
    try {
      const membership = await membershipService.grantTrial({
        platform: "discord",
        platformUserId: interaction.user.id,
        platformChatId: interaction.guildId!,
      });
      await discordAdapter.grantAccess({ platform: "discord", platformUserId: interaction.user.id, platformChatId: interaction.guildId! });
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Ðã kích ho?t trial VIP t?i <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>.` });
    } catch (error) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: error instanceof Error ? error.message : "Không th? kích ho?t trial." });
    }
    return true;
  }

  if (interaction.commandName === "vipstatus") {
    const current = await membershipService.getActiveMembership({
      platform: "discord",
      platformUserId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
    });
    const membership =
      current ??
      (interaction.guildId && interaction.guildId !== env.DISCORD_GUILD_ID
        ? await membershipService.getActiveMembership({ platform: "discord", platformUserId: interaction.user.id, platformChatId: env.DISCORD_GUILD_ID })
        : null);
    if (!membership || membership.expireAt.getTime() <= Date.now()) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n chua có VIP dang ho?t d?ng." });
      return true;
    }
    const source = membership.source === "TRIAL" ? "Trial" : membership.source === "MANUAL" ? "Manual" : "Paid";
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: [`Ngu?n VIP: **${source}**`, `H?t h?n: <t:${Math.floor(membership.expireAt.getTime() / 1000)}:F>`].join("\n") });
    return true;
  }

  if (interaction.commandName === "redeemvip") {
    const code = interaction.options.getString("code", true);
    try {
      await discordService.getGuildMember(interaction.user.id);
      const result = await promoCodeService.redeemPromoCode({
        code,
        platform: "discord",
        platformUserId: interaction.user.id,
        platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      });
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: [`Ðã s? d?ng mã ${result.promoCode.code} thành công.`, `C?ng thêm ${result.pointsAdded} di?m referral.`, `Ði?m hi?n có: ${result.balanceAfter}.`].join("\n") });
    } catch (error) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: error instanceof Error ? error.message : "Không th? s? d?ng mã khuy?n mãi, vui lòng th? l?i." });
    }
    return true;
  }

  if (interaction.commandName === "adminstats") {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n không có quy?n s? d?ng l?nh này." });
      return true;
    }
    const stats = await adminService.getVipStatsByPlatform("discord");
    await interaction.reply({ flags: MessageFlags.Ephemeral, embeds: [{ title: `Th?ng kê VIP (${stats.label})`, fields: [{ name: "VIP dang active", value: String(stats.activeVipCount), inline: true }, { name: "VIP h?t h?n hôm nay", value: String(stats.expiringTodayCount), inline: true }, { name: "Doanh thu kh?p VIP paid", value: formatCurrency(stats.alignedRevenue), inline: true }] }] });
    return true;
  }

  if (interaction.commandName === "grantvip") {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n không có quy?n s? d?ng l?nh này." });
      return true;
    }
    const targetUser = interaction.options.getUser("user", true);
    const durationDays = interaction.options.getInteger("days", true);
    const result = await adminService.adjustDiscordMembershipDuration({ discordUserId: targetUser.id, durationDays, grantedBy: interaction.user.id, grantedFrom: "discord_command" });
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: [durationDays > 0 ? `Ðã c?ng thêm ${durationDays} ngày VIP cho <@${targetUser.id}>.` : `Ðã tr? ${Math.abs(durationDays)} ngày VIP c?a <@${targetUser.id}>.`, `H?n m?i: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>.`].join("\n") });
    return true;
  }

  if (interaction.commandName === "revokevip") {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n không có quy?n s? d?ng l?nh này." });
      return true;
    }
    const targetUser = interaction.options.getUser("user", true);
    await adminService.revokeDiscordMembershipByUserId(targetUser.id);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Ðã thu h?i VIP c?a <@${targetUser.id}>.` });
    return true;
  }

  if (interaction.commandName === "adminpoints") {
    const canAccess = await discordAdapter.isAdmin(interaction.user.id);
    if (!canAccess) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "B?n không có quy?n s? d?ng l?nh này." });
      return true;
    }
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Ch?n preset c?ng/tr? di?m referral, sau dó nh?p `mention/userId/username | ghi chú` trong modal.",
      components: adminReferralRows(),
    });
    return true;
  }

  return false;
}
