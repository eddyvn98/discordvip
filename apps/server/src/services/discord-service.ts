import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

import { env } from "../config.js";
import { logger } from "../lib/logger.js";

export class DiscordService {
  readonly client: Client;
  private guildPromise: Promise<Guild> | null = null;
  private adminChannelPromise: Promise<TextChannel | null> | null = null;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    });
  }

  async start() {
    if (!env.DISCORD_BOT_ENABLED) {
      logger.info("Discord bot startup skipped", {
        reason: "DISCORD_BOT_ENABLED=false",
      });
      return;
    }

    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID || !env.DISCORD_VIP_ROLE_ID) {
      throw new Error(
        "Missing Discord bot configuration. Set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and DISCORD_VIP_ROLE_ID.",
      );
    }

    this.client.once(Events.ClientReady, async () => {
      logger.info("Discord bot connected", {
        user: this.client.user?.tag,
      });

      const guild = await this.getGuild();
      await guild.commands.set([
        {
          name: "donate",
          description: "Tạo đơn ủng hộ server",
          options: [
            {
              name: "plan",
              description: "Chọn gói ủng hộ",
              type: 3,
              required: true,
              choices: [
                { name: "39.000đ tặng VIP 31 ngày", value: "VIP_30_DAYS" },
                { name: "99.000đ tặng VIP 90 ngày", value: "VIP_90_DAYS" },
                { name: "199.000đ tặng VIP 365 ngày", value: "VIP_365_DAYS" },
              ],
            },
          ],
        },
        {
          name: "trialvip",
          description: "Nhận trial VIP 24h (mỗi 30 ngày 1 lần)",
        },
        {
          name: "vipstatus",
          description: "Xem trạng thái VIP hiện tại",
        },
        {
          name: "redeemvip",
          description: "Nhập mã khuyến mãi để nhận thêm ngày VIP",
          options: [
            {
              name: "code",
              description: "Mã khuyến mãi",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "adminstats",
          description: "Xem thống kê VIP và doanh thu tháng",
          default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        },
        {
          name: "grantvip",
          description: "Điều chỉnh hạn VIP của thành viên",
          default_member_permissions: PermissionFlagsBits.Administrator.toString(),
          options: [
            {
              name: "user",
              description: "Thành viên cần điều chỉnh VIP",
              type: 6,
              required: true,
            },
            {
              name: "days",
              description: "Số ngày điều chỉnh, âm để trừ",
              type: 4,
              required: true,
            },
          ],
        },
        {
          name: "revokevip",
          description: "Thu hồi VIP của thành viên",
          default_member_permissions: PermissionFlagsBits.Administrator.toString(),
          options: [
            {
              name: "user",
              description: "Thành viên cần thu hồi VIP",
              type: 6,
              required: true,
            },
          ],
        },
      ]);
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) {
        return;
      }
      if (message.channel.type !== ChannelType.GuildText) {
        return;
      }
      if (!message.channel.name.toLowerCase().endsWith("donate_vip")) {
        return;
      }

      try {
        await message.delete();
      } catch (error) {
        logger.warn("Failed to delete non-command message in donate_vip channel", {
          messageId: message.id,
          channelId: message.channelId,
          authorId: message.author.id,
          error,
        });
      }
    });

    await this.client.login(env.DISCORD_BOT_TOKEN);
  }

  private async getGuild() {
    if (!this.guildPromise) {
      this.guildPromise = this.client.guilds.fetch(env.DISCORD_GUILD_ID);
    }

    return this.guildPromise;
  }

  private async getAdminChannel() {
    if (!env.DISCORD_ADMIN_CHANNEL_ID) {
      return null;
    }

    if (!this.adminChannelPromise) {
      this.adminChannelPromise = this.client.channels
        .fetch(env.DISCORD_ADMIN_CHANNEL_ID)
        .then((channel) => {
          if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error("DISCORD_ADMIN_CHANNEL_ID must point to a guild text channel.");
          }

          return channel;
        });
    }

    return this.adminChannelPromise;
  }

  async getGuildMember(discordUserId: string) {
    if (!env.DISCORD_BOT_ENABLED) {
      throw new Error("Discord bot is disabled in this environment.");
    }

    const guild = await this.getGuild();
    return guild.members.fetch(discordUserId);
  }

  async addVipRole(discordUserId: string) {
    const member = await this.getGuildMember(discordUserId);
    await member.roles.add(env.DISCORD_VIP_ROLE_ID);
  }

  async sendVipActivatedNotice(discordUserId: string, expireAt: Date) {
    const user = await this.client.users.fetch(discordUserId);
    await user.send({
      content: [
        "Thanh toán đã được xác nhận thành công. VIP của bạn đã được kích hoạt.",
        `Hạn sử dụng hiện tại: <t:${Math.floor(expireAt.getTime() / 1000)}:F>.`,
        "Bạn có thể tự kiểm tra bất kỳ lúc nào bằng lệnh `/vipstatus` trong server.",
      ].join("\n"),
    });
  }

  async sendManualOrderReview(order: {
    id: string;
    orderCode: string;
    discordUserId: string;
    amount: number;
    expiresAt: Date;
    plan: {
      name: string;
      durationDays: number;
    };
  }) {
    const channel = await this.getAdminChannel();
    if (!channel) {
      return;
    }

    const approveButton = new ButtonBuilder()
      .setCustomId(`manual_confirm:${order.id}`)
      .setLabel("Xác nhận")
      .setStyle(ButtonStyle.Success);
    const rejectButton = new ButtonBuilder()
      .setCustomId(`manual_reject:${order.id}`)
      .setLabel("Từ chối")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveButton, rejectButton);
    await channel.send({
      content: `Đơn ủng hộ server mới từ <@${order.discordUserId}>`,
      embeds: [
        {
          title: `Duyệt donate ${order.orderCode}`,
          fields: [
            { name: "Người ủng hộ", value: `<@${order.discordUserId}>`, inline: true },
            { name: "Gói ủng hộ", value: order.plan.name, inline: true },
            { name: "Số tiền", value: `${order.amount.toLocaleString("vi-VN")} VND`, inline: true },
            { name: "Hết hạn", value: `<t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>` },
          ],
        },
      ],
      components: [row],
      flags: MessageFlags.SuppressNotifications,
    });
  }

  async removeVipRole(discordUserId: string) {
    try {
      const member = await this.getGuildMember(discordUserId);
      if (member.roles.cache.has(env.DISCORD_VIP_ROLE_ID)) {
        await member.roles.remove(env.DISCORD_VIP_ROLE_ID);
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === 10007
      ) {
        logger.warn("Skip VIP role removal because member is no longer in guild", {
          discordUserId,
        });
        return;
      }

      throw error;
    }
  }

  async sendVipExpiryReminder(discordUserId: string, expireAt: Date, thresholdDays: number) {
    const user = await this.client.users.fetch(discordUserId);
    await user.send({
      content: [
        `VIP của bạn sẽ hết hạn <t:${Math.floor(expireAt.getTime() / 1000)}:R>.`,
        `Mốc nhắc hiện tại: còn khoảng ${thresholdDays} ngày.`,
        "Nếu muốn gia hạn, hãy dùng lệnh `/donate` trong server.",
      ].join("\n"),
    });
  }

  async sendAdminVipExpiryReminder(
    discordUserId: string,
    expireAt: Date,
    thresholdDays: number,
  ) {
    const channel = await this.getAdminChannel();
    if (!channel) {
      return;
    }

    let userLabel = `ID ${discordUserId}`;
    let membershipHint = "";
    try {
      const member = await this.getGuildMember(discordUserId);
      userLabel = `<@${member.id}>`;
    } catch {
      try {
        const user = await this.client.users.fetch(discordUserId);
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

  async sendAdminAutoPaymentConfirmedNotice(input: {
    discordUserId: string;
    orderCode: string;
    amount: number;
    expireAt: Date;
    providerTransactionId: string;
  }) {
    const channel = await this.getAdminChannel();
    if (!channel) {
      return;
    }

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

  async checkHealth() {
    if (!env.DISCORD_BOT_ENABLED) {
      return;
    }

    if (!this.client.isReady() || !this.client.user) {
      throw new Error("Discord client is not ready.");
    }

    await this.getGuild();
  }

  async sendOpsAlert(message: string) {
    const channel = await this.getAdminChannel();
    if (!channel) {
      return;
    }

    await channel.send({
      content: `CANH BAO HE THONG: ${message}`,
      flags: MessageFlags.SuppressNotifications,
    });
  }

  async memberHasAdminAccess(discordUserId: string) {
    if (env.adminDiscordIds.includes(discordUserId)) {
      return true;
    }

    if (!env.DISCORD_ADMIN_ROLE_ID) {
      return false;
    }

    const member: GuildMember = await this.getGuildMember(discordUserId);
    return member.roles.cache.has(env.DISCORD_ADMIN_ROLE_ID);
  }
}
