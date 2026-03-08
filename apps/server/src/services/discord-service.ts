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
          name: "buyvip",
          description: "Tạo đơn mua VIP",
          options: [
            {
              name: "plan",
              description: "Chọn gói VIP",
              type: 3,
              required: true,
              choices: [
                { name: "30.000đ / 30 ngày", value: "VIP_30_DAYS" },
                { name: "300.000đ / 365 ngày", value: "VIP_365_DAYS" },
              ],
            },
          ],
        },
        {
          name: "trialvip",
          description: "Nhận trial VIP 24h (mỗi account 1 lần)",
        },
        {
          name: "vipstatus",
          description: "Xem trạng thái VIP hiện tại",
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
      content: `Don mua VIP moi tu <@${order.discordUserId}>`,
      embeds: [
        {
          title: `Duyet don ${order.orderCode}`,
          fields: [
            { name: "Nguoi mua", value: `<@${order.discordUserId}>`, inline: true },
            { name: "Goi", value: order.plan.name, inline: true },
            { name: "So tien", value: `${order.amount.toLocaleString("vi-VN")} VND`, inline: true },
            { name: "Het han", value: `<t:${Math.floor(order.expiresAt.getTime() / 1000)}:R>` },
          ],
        },
      ],
      components: [row],
      flags: MessageFlags.SuppressNotifications,
    });
  }

  async removeVipRole(discordUserId: string) {
    const member = await this.getGuildMember(discordUserId);
    if (member.roles.cache.has(env.DISCORD_VIP_ROLE_ID)) {
      await member.roles.remove(env.DISCORD_VIP_ROLE_ID);
    }
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
