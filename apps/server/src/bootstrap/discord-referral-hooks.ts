import { logger } from "../lib/logger.js";
import { prisma } from "../prisma.js";
import { DiscordService } from "../services/discord-service.js";
import { ReferralService } from "../services/referral-service.js";

export function registerDiscordReferralHooks(input: {
  discordService: DiscordService;
  referralService: ReferralService;
}) {
  const { discordService, referralService } = input;
  discordService.setReferralHandlers({
    onJoin: async ({ inviteeUserId, inviteCode, guildId }) => {
      if (!inviteCode) {
        return;
      }
      const inviteLink = `https://discord.gg/${inviteCode}`;
      const tokenRecord = await prisma.referralInviteToken.findFirst({
        where: {
          platform: "DISCORD",
          inviteLink: {
            contains: inviteCode,
          },
          isActive: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (!tokenRecord) {
        logger.info("Discord referral join ignored because invite code is not mapped to token", {
          inviteeUserId,
          inviteLink,
        });
        return;
      }
      const joinResult = await referralService.registerJoinByToken({
        platform: "discord",
        token: tokenRecord.token,
        inviteeUserId,
        inviteeChatId: guildId,
      });
      if (!joinResult.ok) {
        logger.warn("Discord referral join registration failed", {
          inviteeUserId,
          inviteLink,
          reason: joinResult.reason,
        });
        return;
      }
      logger.info("Referral join registered from Discord invite", { inviteeUserId, inviteLink });
    },
    onVerify: async ({ inviteeUserId }) => {
      const result = await referralService.verifyAndReward({
        platform: "discord",
        inviteeUserId,
      });
      if (!result.ok) {
        logger.warn("Discord referral verify failed", {
          inviteeUserId,
          reason: result.reason,
        });
        return;
      }
      if (result.ok && !result.alreadyRewarded && result.inviterUserId) {
        const user = await discordService.client.users.fetch(result.inviterUserId);
        await user.send(`Bạn vừa nhận ${result.pointsAwarded ?? 0} điểm từ một lượt mời thành công.`);
      }
    },
  });
}
