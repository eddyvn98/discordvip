import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";

import { env } from "../config.js";
import { DiscordPlatformAdapter } from "../services/discord-platform-adapter.js";
import { DiscordService } from "../services/discord-service.js";
import { PaymentService } from "../services/payment-service.js";
import { ReferralService } from "../services/referral-service.js";

export async function handleDiscordMenuCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName !== "menu" && interaction.commandName !== "invite") {
    return false;
  }
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "Menu Referral: dùng các nút bên dưới để mời bạn và đổi VIP.",
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("ref_create_link").setLabel("Tạo link mời").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ref_stats").setLabel("Điểm của tôi").setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("ref_redeem_10").setLabel("Đổi 10 ngày VIP").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("ref_redeem_30").setLabel("Đổi 30 ngày VIP").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("ref_redeem_90").setLabel("Đổi 90 ngày VIP").setStyle(ButtonStyle.Success),
      ),
    ],
  });
  return true;
}

export async function handleDiscordButton(input: {
  interaction: ButtonInteraction;
  discordService: DiscordService;
  discordAdapter: DiscordPlatformAdapter;
  paymentService: PaymentService;
  referralService: ReferralService;
}) {
  const { interaction, discordService, discordAdapter, paymentService, referralService } = input;

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
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Link mời của bạn: ${inviteLink}` });
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
    });
    return true;
  }

  if (interaction.customId.startsWith("ref_redeem_")) {
    const days = Number(interaction.customId.replace("ref_redeem_", ""));
    const result = await referralService.redeemVipDays({
      platform: "discord",
      userId: interaction.user.id,
      platformChatId: interaction.guildId ?? env.DISCORD_GUILD_ID,
      vipDays: days,
    });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [`Đổi VIP thành công: +${days} ngày.`, `Điểm đã trừ: ${result.pointsSpent}`, `Điểm còn lại: ${result.balanceAfter}`, `Hạn VIP mới: <t:${Math.floor(result.membership.expireAt.getTime() / 1000)}:F>`].join("\n"),
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
