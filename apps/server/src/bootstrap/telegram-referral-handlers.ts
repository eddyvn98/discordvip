import { MembershipService } from "../services/membership-service.js";
import { prisma } from "../prisma.js";
import { ReferralService } from "../services/referral-service.js";
import { TelegramService } from "../services/telegram-service.js";

export function buildTelegramReferralMenu() {
  return {
    keyboard: [
      [{ text: "🔗 Tạo link mời" }, { text: "📊 Điểm của tôi" }],
      [{ text: "💎 Đổi VIP (1 điểm = 1 ngày VIP)" }, { text: "🎟️ Nhập mã khuyến mãi" }],
      [{ text: "↩️ Quay lại" }],
    ],
    is_persistent: true,
    resize_keyboard: true,
    input_field_placeholder: "Chọn chức năng kiếm VIP",
  };
}

export function createTelegramReferralHandlers(input: {
  telegramService: TelegramService;
  membershipService: MembershipService;
  referralService: ReferralService;
}) {
  const { telegramService, membershipService, referralService } = input;
  const autoVerifyJoinedInvites = async (inviterUserId: string) => {
    const joinedEvents = await prisma.referralInviteEvent.findMany({
      where: {
        platform: "TELEGRAM",
        inviterUserId,
        status: "JOINED",
      },
      select: { inviteeUserId: true },
      take: 100,
    });

    for (const event of joinedEvents) {
      await referralService.verifyAndReward({
        platform: "telegram",
        inviteeUserId: event.inviteeUserId,
      });
    }
  };
  const buildJoinByTokenFailMessage = (reason: string) => {
    switch (reason) {
      case "self_invite":
        return "Bạn vừa tự mở link mời của chính mình nên không được tính điểm.\n👉 Hãy gửi link này cho bạn bè chưa vào bot để nhận điểm referral.";
      case "token_not_found":
        return "Link mời không hợp lệ hoặc đã hết hiệu lực. Vui lòng tạo link mới và thử lại.";
      case "join_not_found":
        return "Chưa ghi nhận lượt vào từ link mời. Vui lòng thử lại sau ít phút.";
      default:
        return "Link mời không hợp lệ hoặc không thể ghi nhận.";
    }
  };
  return {
    onReferralMenu: async ({ chatId }: { userId: string; chatId: string; chatType: string }) => {
      await telegramService.sendMessage(
        chatId,
        "🎁 Cách kiếm VIP miễn phí\n\n• Mỗi lượt mời bạn bè vào nhóm thành công = +1 điểm\n• 1 điểm = 1 ngày VIP\n\n📌 Cần tối thiểu 10 điểm để đổi VIP\n👉 Nhấn nút bên dưới để lấy link mời nhé!",
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
      await autoVerifyJoinedInvites(userId);
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
        await telegramService.sendMessage(chatId, buildJoinByTokenFailMessage(result.reason), buildTelegramReferralMenu());
        return { ok: false, reason: result.reason };
      }
      await telegramService.sendMessage(
        chatId,
        "Bạn đã vào bằng link mời. Nhấn Verify để xác nhận người thật.",
        {
          inline_keyboard: [[{ text: "Verify", callback_data: "ref_verify" }]],
        },
      );
      return { ok: true };
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
      await telegramService.sendMessage(
        chatId,
        "Verify thành công. Mời bạn vào kênh chính @rapphim18 tại đây:",
        {
          inline_keyboard: [[{ text: "Vào kênh chính @rapphim18", url: "https://t.me/rapphim18" }]],
        },
      );
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

