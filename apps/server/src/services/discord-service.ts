import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  MessageFlags,
} from "discord.js";

import { env } from "../config.js";
import { logger } from "../lib/logger.js";

export class DiscordService {
  readonly client: Client;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
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

      const guild = await this.client.guilds.fetch(env.DISCORD_GUILD_ID);
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
          name: "adminstats",
          description: "Xem thống kê VIP và doanh thu tháng",
        },
      ]);
    });

    await this.client.login(env.DISCORD_BOT_TOKEN);
  }

  async getGuildMember(discordUserId: string) {
    if (!env.DISCORD_BOT_ENABLED) {
      throw new Error("Discord bot is disabled in this environment.");
    }

    const guild = await this.client.guilds.fetch(env.DISCORD_GUILD_ID);
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
    if (!env.DISCORD_ADMIN_CHANNEL_ID) {
      return;
    }

    const channel = await this.client.channels.fetch(env.DISCORD_ADMIN_CHANNEL_ID);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("DISCORD_ADMIN_CHANNEL_ID must point to a guild text channel.");
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
    if (!env.DISCORD_ADMIN_CHANNEL_ID) {
      return;
    }

    const channel = await this.client.channels.fetch(env.DISCORD_ADMIN_CHANNEL_ID);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("DISCORD_ADMIN_CHANNEL_ID must point to a guild text channel.");
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
    if (!env.DISCORD_ADMIN_CHANNEL_ID) {
      return;
    }

    const channel = await this.client.channels.fetch(env.DISCORD_ADMIN_CHANNEL_ID);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("DISCORD_ADMIN_CHANNEL_ID must point to a guild text channel.");
    }

    await channel.send({
      content: [
        "Da xac nhan thanh toan tu dong.",
        `User: <@${input.discordUserId}>`,
        `Order: ${input.orderCode}`,
        `So tien: ${input.amount.toLocaleString("vi-VN")} VND`,
        `Ma giao dich: ${input.providerTransactionId}`,
        `VIP het han: <t:${Math.floor(input.expireAt.getTime() / 1000)}:F>`,
      ].join("\n"),
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
