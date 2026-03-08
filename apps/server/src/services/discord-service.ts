import { Client, GatewayIntentBits, GuildMember } from "discord.js";

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
    this.client.once("ready", async () => {
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
    const guild = await this.client.guilds.fetch(env.DISCORD_GUILD_ID);
    return guild.members.fetch(discordUserId);
  }

  async addVipRole(discordUserId: string) {
    const member = await this.getGuildMember(discordUserId);
    await member.roles.add(env.DISCORD_VIP_ROLE_ID);
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
