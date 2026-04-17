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
  Message,
  TextChannel,
} from "discord.js";

import { env } from "../config.js";
import { logger } from "../lib/logger.js";
import { getDiscordGuildCommands } from "./discord-commands.js";
import { DiscordReferralRuntime } from "./discord-referral-runtime.js";
import {
  fetchDiscordAdminChannel,
  sendDiscordAdminAutoPaymentConfirmedNotice,
  sendDiscordAdminVipExpiryReminder,
  sendDiscordManualOrderReview,
  sendDiscordOpsAlert,
  sendDiscordVipActivatedNotice,
  sendDiscordVipExpiryReminder,
} from "./discord-notify.js";

export class DiscordService {
  readonly client: Client;
  private readonly referralRuntime: DiscordReferralRuntime;
  private guildPromise: Promise<Guild> | null = null;
  private adminChannelPromise: Promise<TextChannel | null> | null = null;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    });
    this.referralRuntime = new DiscordReferralRuntime(this.client);
  }

  setReferralHandlers(input: {
    onJoin: (payload: { inviteeUserId: string; inviteCode?: string; guildId: string }) => Promise<void>;
    onVerify: (payload: { inviteeUserId: string }) => Promise<void>;
  }) {
    this.referralRuntime.setHandlers(input);
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
      await guild.commands.set(getDiscordGuildCommands());
      await this.referralRuntime.onReady(guild);
      await this.ensureHomePanelMessage();
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

    this.referralRuntime.registerMemberAddListener();

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
      this.adminChannelPromise = fetchDiscordAdminChannel(this.client, env.DISCORD_ADMIN_CHANNEL_ID);
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

  async hasVipRole(discordUserId: string) {
    try {
      const member = await this.getGuildMember(discordUserId);
      return member.roles.cache.has(env.DISCORD_VIP_ROLE_ID);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === 10007
      ) {
        return false;
      }
      throw error;
    }
  }

  async sendVipActivatedNotice(discordUserId: string, expireAt: Date) {
    await sendDiscordVipActivatedNotice(this.client, discordUserId, expireAt);
  }

  async sendTrialExpiredNotice(discordUserId: string) {
    const user = await this.client.users.fetch(discordUserId);
    await user.send({
      content: [
        "Bạn đã hết thời gian thử nghiệm VIP",
        "Nếu thấy nội dung phù hợp với mình, bạn có thể dùng BOT VIP tại kênh <#1480627066272485487> để nâng cấp VIP tự động nhé ✨",
      ].join("\n"),
    });
  }

  private async ensureHomePanelMessage() {
    if (!env.DISCORD_MENU_CHANNEL_ID) {
      return;
    }

    const channel = await this.client.channels.fetch(env.DISCORD_MENU_CHANNEL_ID);
    if (!channel || channel.type !== ChannelType.GuildText) {
      logger.warn("DISCORD_MENU_CHANNEL_ID is not a valid guild text channel", {
        channelId: env.DISCORD_MENU_CHANNEL_ID,
      });
      return;
    }

    const textChannel = channel as TextChannel;
    const rows = [
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
        new ButtonBuilder()
          .setCustomId("acc_redeem_help")
          .setLabel("🎟️ Nhập mã khuyến mãi")
          .setStyle(ButtonStyle.Secondary),
      ),
    ];
    const content =
      "🔥 Chào mừng bạn đến với BOT VIP\n\nTại đây bạn có thể:\n• Kiếm điểm để đổi VIP 🎁\n• Donate nhanh để nhận VIP ⚡\n• Dùng thử trước khi quyết định 👀\n• Kích hoạt mã khuyến mãi siêu tiện 🎟️\n\n👉 Chọn một tùy chọn bên dưới để bắt đầu ngay!";

    const isHomePanelMessage = (message: Message) => {
      if (message.author.id !== this.client.user?.id) return false;
      const componentsSignature = JSON.stringify(message.components ?? []);
      return componentsSignature.includes("home_referral") && componentsSignature.includes("home_buy");
    };

    let panelMessage: Message | null =
      (await textChannel.messages
        .fetchPinned()
        .then((messages) => messages.find((message) => isHomePanelMessage(message)) ?? null)
        .catch(() => null)) ?? null;

    if (!panelMessage) {
      panelMessage = await textChannel.messages
        .fetch({ limit: 50 })
        .then((messages) => messages.find((message) => isHomePanelMessage(message)) ?? null)
        .catch(() => null);
    }

    if (panelMessage) {
      await panelMessage.edit({ content, components: rows });
    } else {
      panelMessage = await textChannel.send({ content, components: rows });
    }

    if (!panelMessage.pinned) {
      await panelMessage.pin().catch(() => undefined);
    }

    const pinnedMessages = await textChannel.messages.fetchPinned().catch(() => null);
    if (pinnedMessages) {
      await Promise.all(
        pinnedMessages
          .filter((message) => message.id !== panelMessage!.id && isHomePanelMessage(message))
          .map((message) => message.unpin().catch(() => undefined)),
      );
    }
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
    await sendDiscordManualOrderReview(channel, order);
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
    await sendDiscordVipExpiryReminder(this.client, discordUserId, expireAt, thresholdDays);
  }

  async sendAdminVipExpiryReminder(
    discordUserId: string,
    expireAt: Date,
    thresholdDays: number,
  ) {
    const channel = await this.getAdminChannel();
    await sendDiscordAdminVipExpiryReminder({
      channel,
      client: this.client,
      discordUserId,
      expireAt,
      thresholdDays,
      getGuildMember: this.getGuildMember.bind(this),
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
    await sendDiscordAdminAutoPaymentConfirmedNotice(channel, input);
  }

  async checkHealth() {
    if (!env.DISCORD_BOT_ENABLED) return;
    if (!this.client.isReady() || !this.client.user) {
      throw new Error("Discord client is not ready.");
    }
    await this.getGuild();
  }

  async sendOpsAlert(message: string) {
    const channel = await this.getAdminChannel();
    await sendDiscordOpsAlert(channel, message);
  }

  async memberHasAdminAccess(discordUserId: string) {
    if (env.adminDiscordIds.includes(discordUserId)) return true;
    if (!env.DISCORD_ADMIN_ROLE_ID) return false;
    const member: GuildMember = await this.getGuildMember(discordUserId);
    return member.roles.cache.has(env.DISCORD_ADMIN_ROLE_ID);
  }

  async createReferralInviteLink(referralToken: string) {
    const guild = await this.getGuild();
    const channel =
      guild.systemChannel ??
      guild.channels.cache.find(
        (item) => item.isTextBased() && item.type === ChannelType.GuildText,
      );
    if (!channel || !("createInvite" in channel)) {
      throw new Error("KhÃ´ng tÃ¬m tháº¥y kÃªnh text Ä‘á»ƒ táº¡o link má»i Discord.");
    }
    const invite = await (channel as TextChannel).createInvite({
      maxAge: 60 * 60 * 24 * 7,
      unique: true,
      reason: `Referral token ${referralToken}`,
    });
    return invite.url;
  }

  async consumeVerify(discordUserId: string) {
    await this.referralRuntime.consumeVerify(discordUserId);
  }

  async hasGuildMember(discordUserId: string) {
    try {
      await this.getGuildMember(discordUserId);
      return true;
    } catch {
      return false;
    }
  }
}


