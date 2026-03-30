import { MembershipService } from "../services/membership-service.js";
import { ReferralService } from "../services/referral-service.js";
import { TelegramService } from "../services/telegram-service.js";

export function buildTelegramReferralMenu() {
  return {
    inline_keyboard: [
      [
        { text: "Tạo link mời", callback_data: "ref_create_link" },
        { text: "Điểm của tôi", callback_data: "ref_stats" },
      ],
      [
        { text: "Đổi 10 ngày VIP", callback_data: "ref_redeem_10" },
        { text: "Đổi 30 ngày VIP", callback_data: "ref_redeem_30" },
        { text: "Đổi 90 ngày VIP", callback_data: "ref_redeem_90" },
      ],
      [{ text: "Verify", callback_data: "ref_verify" }],
    ],
  };
}

export function createTelegramReferralHandlers(input: {
  telegramService: TelegramService;
  membershipService: MembershipService;
  referralService: ReferralService;
}) {
  const { telegramService, membershipService, referralService } = input;
  return {
    onReferralMenu: async ({ chatId }: { userId: string; chatId: string; chatType: string }) => {
      await telegramService.sendMessage(
        chatId,
        "Menu Referral: tạo link mời, theo dõi điểm, đổi VIP bằng nút.",
        buildTelegramReferralMenu(),
      );
    },
    onReferralCreateLink: async ({ userId, chatId }: { userId: string; chatId: string; chatType: string }) => {
      const token = await referralService.ensureInviteToken({
        platform: "telegram",
        inviterUserId: userId,
        inviterChatId: chatId,
      });
      const inviteLink = await telegramService.createReferralInviteLink({
        inviterUserId: userId,
        inviterChatId: chatId,
        referralToken: token.token,
      });
      await referralService.ensureInviteToken({
        platform: "telegram",
        inviterUserId: userId,
        inviterChatId: chatId,
        inviteLink,
      });
      await telegramService.sendMessage(chatId, `Link mời của bạn:\n${inviteLink}`, buildTelegramReferralMenu());
    },
    onReferralStats: async ({ userId, chatId }: { userId: string; chatId: string; chatType: string }) => {
      const stats = await referralService.getInviteStats({
        platform: "telegram",
        inviterUserId: userId,
      });
      await telegramService.sendMessage(
        chatId,
        [
          `Điểm hiện có: ${stats.points}`,
          `Lượt mời thành công: ${stats.successCount}`,
          `Lượt đã vào chờ verify: ${stats.joinedCount}`,
        ].join("\n"),
        buildTelegramReferralMenu(),
      );
    },
    onReferralRedeem: async ({
      userId,
      chatId,
      days,
    }: {
      userId: string;
      chatId: string;
      chatType: string;
      days: number;
    }) => {
      try {
        const platformChatId = await membershipService.resolveTelegramPlatformChatId({
          platformUserId: userId,
        });
        const result = await referralService.redeemVipDays({
          platform: "telegram",
          userId,
          platformChatId,
          vipDays: days,
        });
        await telegramService.sendMessage(
          chatId,
          [
            `Đổi VIP thành công: +${days} ngày.`,
            `Điểm đã trừ: ${result.pointsSpent}`,
            `Điểm còn lại: ${result.balanceAfter}`,
            `Hạn VIP mới: ${result.membership.expireAt.toLocaleString("vi-VN")}`,
          ].join("\n"),
          buildTelegramReferralMenu(),
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể đổi điểm VIP.",
          buildTelegramReferralMenu(),
        );
      }
    },
    onReferralJoinByToken: async ({
      userId,
      chatId,
      token,
    }: {
      userId: string;
      chatId: string;
      chatType: string;
      token: string;
    }) => {
      const result = await referralService.registerJoinByToken({
        platform: "telegram",
        token,
        inviteeUserId: userId,
        inviteeChatId: chatId,
      });
      if (!result.ok) {
        await telegramService.sendMessage(chatId, "Link mời không hợp lệ hoặc không thể ghi nhận.");
        return;
      }
      await telegramService.sendMessage(
        chatId,
        "Bạn đã vào bằng link mời. Nhấn Verify để xác nhận người thật.",
        {
          inline_keyboard: [[{ text: "Verify", callback_data: "ref_verify" }]],
        },
      );
    },
    onReferralVerify: async ({ userId, chatId }: { userId: string; chatId: string; chatType: string }) => {
      const result = await referralService.verifyAndReward({
        platform: "telegram",
        inviteeUserId: userId,
      });
      if (!result.ok) {
        await telegramService.sendMessage(chatId, "Không thể verify referral. Vui lòng thử lại.");
        return;
      }
      await telegramService.sendMessage(chatId, "Verify thành công.");
      if (!result.alreadyRewarded && result.inviterUserId) {
        await telegramService.sendMessage(
          result.inviterUserId,
          `Bạn vừa nhận ${result.pointsAwarded ?? 0} điểm từ một lượt mời thành công.`,
          buildTelegramReferralMenu(),
        );
      }
    },
  };
}
