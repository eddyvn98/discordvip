import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  GuildMember,
  MessageFlags,
  TextChannel,
} from "discord.js";

export async function sendDiscordVipActivatedNotice(client: Client, discordUserId: string, expireAt: Date) {
  const user = await client.users.fetch(discordUserId);
  await user.send({
    content: [
      "Thanh toán đã được xác nhận thành công. VIP của bạn đã được kích hoạt.",
      `Hạn sử dụng hiện tại: <t:${Math.floor(expireAt.getTime() / 1000)}:F>.`,
      "Bạn có thể tự kiểm tra bất kỳ lúc nào bằng lệnh `/vipstatus` trong server.",
    ].join("\n"),
  });
}

export async function sendDiscordManualOrderReview(
  channel: TextChannel | null,
  order: {
    id: string;
    orderCode: string;
    discordUserId: string;
    amount: number;
    expiresAt: Date;
    plan: { name: string; durationDays: number };
  },
) {
  if (!channel) return;

  const approveButton = new ButtonBuilder().setCustomId(`manual_confirm:${order.id}`).setLabel("Xác nhận").setStyle(ButtonStyle.Success);
  const rejectButton = new ButtonBuilder().setCustomId(`manual_reject:${order.id}`).setLabel("Từ chối").setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveButton, rejectButton);

  await channel.send({
    content: `Đơn ủng hộ server mới từ <@${order.discordUserId}>`,
    embeds: [{
      title: `Duyệt donate ${order.orderCode}`,
      fields: [
        { name: "Người ủng hộ", value: `<@${order.discordUserId}>`, inline: true },
        { name: "Gói ủng hộ", value: order.plan.name, inline: true },
        { name: "Số tiền", value: `${order.amount.toLocaleString("vi-VN")} VND`, inline: true },
        { name: "Hết hạn", value: `<t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>` },
      ],
    }],
    components: [row],
    flags: MessageFlags.SuppressNotifications,
  });
}

export async function sendDiscordVipExpiryReminder(
  client: Client,
  discordUserId: string,
  expireAt: Date,
  thresholdDays: number,
) {
  const user = await client.users.fetch(discordUserId);
  await user.send({
    content: [
      `VIP của bạn sẽ hết hạn <t:${Math.floor(expireAt.getTime() / 1000)}:R>.`,
      `Mốc nhắc hiện tại: còn khoảng ${thresholdDays} ngày.`,
      "Nếu muốn gia hạn, hãy dùng lệnh `/donate` trong server.",
    ].join("\n"),
  });
}

export async function sendDiscordAdminVipExpiryReminder(input: {
  channel: TextChannel | null;
  client: Client;
  discordUserId: string;
  expireAt: Date;
  thresholdDays: number;
  getGuildMember: (discordUserId: string) => Promise<GuildMember>;
}) {
  const { channel, client, discordUserId, expireAt, thresholdDays, getGuildMember } = input;
  if (!channel) return;

  let userLabel = `ID ${discordUserId}`;
  let membershipHint = "";
  try {
    const member = await getGuildMember(discordUserId);
    userLabel = `<@${member.id}>`;
  } catch {
    try {
      const user = await client.users.fetch(discordUserId);
      userLabel = `${user.username} (${user.id})`;
      membershipHint = " [không còn trong guild]";
    } catch {
      userLabel = `ID ${discordUserId}`;
    }
  }

  await channel.send({
    content: [
      `Nhắc hết hạn VIP: ${userLabel}${membershipHint}`,
      `Hết hạn: <t:${Math.floor(expireAt.getTime() / 1000)}:F>`,
      `Mốc nhắc: còn khoảng ${thresholdDays} ngày`,
    ].join("\n"),
    flags: MessageFlags.SuppressNotifications,
  });
}

export async function sendDiscordAdminAutoPaymentConfirmedNotice(
  channel: TextChannel | null,
  input: { discordUserId: string; orderCode: string; amount: number; expireAt: Date; providerTransactionId: string },
) {
  if (!channel) return;
  await channel.send({
    content: [
      "Đã xác nhận thanh toán tự động.",
      `User: <@${input.discordUserId}>`,
      `Order: ${input.orderCode}`,
      `Số tiền: ${input.amount.toLocaleString("vi-VN")} VND`,
      `Mã giao dịch: ${input.providerTransactionId}`,
      `VIP hết hạn: <t:${Math.floor(input.expireAt.getTime() / 1000)}:F>`,
    ].join("\n"),
    flags: MessageFlags.SuppressNotifications,
  });
}

export async function sendDiscordOpsAlert(channel: TextChannel | null, message: string) {
  if (!channel) return;
  await channel.send({
    content: `CANH BAO HE THONG: ${message}`,
    flags: MessageFlags.SuppressNotifications,
  });
}

export async function fetchDiscordAdminChannel(client: Client, channelId: string | null | undefined) {
  if (!channelId) return null;
  const channel = await client.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error("DISCORD_ADMIN_CHANNEL_ID must point to a guild text channel.");
  }
  return channel as TextChannel;
}
