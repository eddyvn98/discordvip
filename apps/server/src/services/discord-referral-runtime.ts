import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  Guild,
} from "discord.js";

import { logger } from "../lib/logger.js";

export class DiscordReferralRuntime {
  private joinHandler:
    | ((input: { inviteeUserId: string; inviteCode?: string; guildId: string }) => Promise<void>)
    | null = null;
  private verifyHandler: ((input: { inviteeUserId: string }) => Promise<void>) | null = null;
  private inviteUses = new Map<string, number>();

  constructor(private readonly client: Client) {}

  setHandlers(input: {
    onJoin: (payload: { inviteeUserId: string; inviteCode?: string; guildId: string }) => Promise<void>;
    onVerify: (payload: { inviteeUserId: string }) => Promise<void>;
  }) {
    this.joinHandler = input.onJoin;
    this.verifyHandler = input.onVerify;
  }

  async consumeVerify(discordUserId: string) {
    await this.verifyHandler?.({ inviteeUserId: discordUserId });
  }

  async onReady(guild: Guild) {
    const invites = await guild.invites.fetch();
    this.inviteUses = new Map(invites.map((invite) => [invite.code, invite.uses ?? 0]));
  }

  registerMemberAddListener() {
    this.client.on(Events.GuildMemberAdd, async (member) => {
      try {
        const invites = await member.guild.invites.fetch();
        let matchedCode: string | null = null;
        for (const invite of invites.values()) {
          const previousUses = this.inviteUses.get(invite.code) ?? 0;
          const currentUses = invite.uses ?? 0;
          if (currentUses > previousUses) {
            matchedCode = invite.code;
          }
          this.inviteUses.set(invite.code, currentUses);
        }

        await this.joinHandler?.({
          inviteeUserId: member.id,
          inviteCode: matchedCode ?? undefined,
          guildId: member.guild.id,
        });

        await member.send({
          content: "Chào mừng bạn! Nhấn Verify để xác nhận người thật.",
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder().setCustomId("referral_verify").setLabel("Verify").setStyle(ButtonStyle.Success),
            ),
          ],
        });
      } catch (error) {
        logger.warn("Failed to process referral join for member", {
          userId: member.id,
          error,
        });
      }
    });
  }
}
