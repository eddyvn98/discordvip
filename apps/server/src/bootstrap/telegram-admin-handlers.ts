import { formatCurrency } from "../lib/billing.js";
import { AdminService } from "../services/admin-service.js";
import { TelegramService } from "../services/telegram-service.js";

export function createTelegramAdminHandlers(input: {
  telegramService: TelegramService;
  adminService: AdminService;
}) {
  const { telegramService, adminService } = input;
  return {
    onAdminStats: async ({ userId, chatId, chatType }: { userId: string; chatId: string; chatType: string }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(
          chatId,
          "Vì bảo mật, lệnh /adminstats chỉ được phép dùng trong private chat với bot.",
        );
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }

      const stats = await adminService.getVipStatsByPlatform("telegram");
      await telegramService.sendMessage(
        chatId,
        [
          `Thong ke VIP (${stats.label}):`,
          `VIP đang active: ${stats.activeVipCount}`,
          `VIP hết hạn hôm nay: ${stats.expiringTodayCount}`,
          `Doanh thu khớp VIP paid: ${formatCurrency(stats.alignedRevenue)}`,
        ].join("\n"),
      );
    },
    onAdminGrantVip: async ({
      userId,
      chatId,
      chatType,
      targetUserId,
      days,
    }: {
      userId: string;
      chatId: string;
      chatType: string;
      targetUserId: string;
      days: number;
    }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(
          chatId,
          "Vì bảo mật, lệnh admin chỉ được phép dùng trong private chat với bot.",
        );
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }

      try {
        const membership = await adminService.adjustTelegramMembershipDuration({
          telegramUserId: targetUserId,
          durationDays: days,
        });
        await telegramService.sendMessage(
          chatId,
          `Đã điều chỉnh VIP cho ${targetUserId}. Hạn mới: ${membership.expireAt.toLocaleString("vi-VN")}.`,
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể điều chỉnh VIP Telegram.",
        );
      }
    },
    onAdminRevokeVip: async ({
      userId,
      chatId,
      chatType,
      targetUserId,
    }: {
      userId: string;
      chatId: string;
      chatType: string;
      targetUserId: string;
    }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(
          chatId,
          "Vì bảo mật, lệnh admin chỉ được phép dùng trong private chat với bot.",
        );
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng lệnh này.");
        return;
      }

      try {
        await adminService.revokeTelegramMembershipByUserId(targetUserId);
        await telegramService.sendMessage(chatId, `Đã thu hồi VIP của ${targetUserId}.`);
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể thu hồi VIP Telegram.",
        );
      }
    },
    onAdminAdjustReferralPoints: async ({
      userId,
      chatId,
      chatType,
      platform,
      targetUserId,
      deltaPoints,
      note,
    }: {
      userId: string;
      chatId: string;
      chatType: string;
      platform: "telegram" | "discord";
      targetUserId: string;
      deltaPoints: number;
      note?: string;
    }) => {
      if (chatType !== "private") {
        await telegramService.sendMessage(chatId, "Tính năng admin chỉ được phép dùng trong private chat với bot.");
        return;
      }

      const canAccess = await telegramService.isAdmin(userId);
      if (!canAccess) {
        await telegramService.sendMessage(chatId, "Bạn không có quyền sử dụng tính năng này.");
        return;
      }

      try {
        const resolvedUserId = await adminService.resolveReferralTargetUserId({
          platform,
          rawUserInput: targetUserId,
        });
        await adminService.adjustReferralPoints({
          platform,
          userId: resolvedUserId,
          deltaPoints,
          note,
        });
        await telegramService.sendMessage(
          chatId,
          [
            "Đã điều chỉnh điểm referral thành công.",
            `Nền tảng: ${platform}`,
            `User ID: ${resolvedUserId}`,
            `Điểm thay đổi: ${deltaPoints > 0 ? `+${deltaPoints}` : String(deltaPoints)}`,
            note ? `Ghi chú: ${note}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể điều chỉnh điểm referral.",
        );
      }
    },
  };
}
