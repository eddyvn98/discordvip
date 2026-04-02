import { formatCurrency } from "../lib/billing.js";
import { AdminService } from "../services/admin-service.js";
import { MembershipService } from "../services/membership-service.js";
import { OrderService } from "../services/order-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";
import { ReferralService } from "../services/referral-service.js";
import { TelegramService } from "../services/telegram-service.js";
import { createTelegramAdminHandlers } from "./telegram-admin-handlers.js";
import { createTelegramReferralHandlers } from "./telegram-referral-handlers.js";

type BuildOrderMessageFn = (order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string; durationDays: number };
}, platform: "telegram" | "discord") => Promise<{
  qrImageUrl: string | null;
  paymentInstruction: string;
}>;

type BuildVipAccessTitleFn = (order: { amount: number; plan: { durationDays: number } }) => string;

function escapeTelegramHtml(input: string) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function registerTelegramHandlers(input: {
  telegramService: TelegramService;
  membershipService: MembershipService;
  orderService: OrderService;
  promoCodeService: PromoCodeService;
  adminService: AdminService;
  referralService: ReferralService;
  buildOrderMessage: BuildOrderMessageFn;
  buildVipAccessTitle: BuildVipAccessTitleFn;
}) {
  const {
    telegramService,
    membershipService,
    orderService,
    promoCodeService,
    adminService,
    referralService,
    buildOrderMessage,
    buildVipAccessTitle,
  } = input;
  const referralHandlers = createTelegramReferralHandlers({
    telegramService,
    membershipService,
    referralService,
  });
  const adminHandlers = createTelegramAdminHandlers({
    telegramService,
    adminService,
  });

  telegramService.setHandlers({
    onDonate: async ({ userId, chatId, planCode }) => {
      const platformChatId = await membershipService.resolveTelegramPlatformChatId({
        platformUserId: userId,
      });
      const order = await orderService.createOrder({
        platform: "telegram",
        platformUserId: userId,
        platformChatId,
        planCode,
      });

      const { qrImageUrl, paymentInstruction } = await buildOrderMessage(order, "telegram");
      const donateText = [
        `<b>${escapeTelegramHtml(buildVipAccessTitle(order))}</b>`,
        `<b>Số tiền:</b> ${formatCurrency(order.amount)}`,
        `<b>Nội dung CK:</b> <code>DONATE ${order.orderCode}</code>`,
        `<b>Hạn thanh toán:</b> ${order.expiresAt.toLocaleString("vi-VN")}`,
        escapeTelegramHtml(paymentInstruction),
      ].join("\n");

      let sentMessage: { message_id: number } | null = null;
      if (qrImageUrl) {
        sentMessage = await telegramService.sendPhoto(chatId, qrImageUrl, donateText, "HTML");
      } else {
        sentMessage = await telegramService.sendMessage(chatId, donateText, undefined, "HTML");
      }

      if (sentMessage?.message_id) {
        await orderService.savePaymentPromptMessage(order.id, chatId, sentMessage.message_id);
      }
    },
    onTrialVip: async ({ userId, chatId }) => {
      try {
        const platformChatId = await membershipService.resolveTelegramPlatformChatId({
          platformUserId: userId,
        });
        const membership = await membershipService.grantTrial({
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
        });

        await telegramService.grantAccess({
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
        });
        await telegramService.sendMessage(
          chatId,
          `Đã kích hoạt trial VIP tới ${membership.expireAt.toLocaleString("vi-VN")}.`,
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể kích hoạt trial.",
        );
      }
    },
    onVipStatus: async ({ userId, chatId }) => {
      const defaultPlatformChatId = await membershipService.resolveTelegramPlatformChatId({
        platformUserId: userId,
      });
      const membership =
        (await membershipService.getActiveMembership({
          platform: "telegram",
          platformUserId: userId,
          platformChatId: defaultPlatformChatId,
        })) ??
        (await membershipService.getLatestActiveMembershipForPlatformUser({
          platform: "telegram",
          platformUserId: userId,
        }));
      if (!membership || membership.expireAt.getTime() <= Date.now()) {
        await telegramService.sendMessage(chatId, "Bạn chưa có VIP đang hoạt động.");
        return;
      }
      const sourceLabel =
        membership.source === "TRIAL"
          ? "Trial"
          : membership.source === "MANUAL"
            ? "Manual"
            : "Paid";
      await telegramService.sendMessage(
        chatId,
        [
          `Nguồn VIP: ${sourceLabel}`,
          `Hết hạn: ${membership.expireAt.toLocaleString("vi-VN")}`,
        ].join("\n"),
      );
      await telegramService.sendVipEntryLinks({
        userId,
        headerText: "Link vào kênh VIP (hiệu lực 24h):",
      });
    },
    onRedeemVip: async ({ userId, chatId, code }) => {
      try {
        const platformChatId = await membershipService.resolveTelegramPlatformChatId({
          platformUserId: userId,
        });
        const result = await promoCodeService.redeemPromoCode({
          code,
          platform: "telegram",
          platformUserId: userId,
          platformChatId,
        });
        await telegramService.sendMessage(
          chatId,
          [
            `Đã sử dụng mã ${result.promoCode.code} thành công.`,
            `Cộng thêm ${result.promoCode.durationDays} ngày VIP.`,
            `Hạn mới: ${result.membership.expireAt.toLocaleString("vi-VN")}.`,
          ].join("\n"),
        );
      } catch (error) {
        await telegramService.sendMessage(
          chatId,
          error instanceof Error ? error.message : "Không thể sử dụng mã khuyến mãi.",
        );
      }
    },
    ...adminHandlers,
    ...referralHandlers,
  });

  telegramService.setChannelVerificationHandler(async ({ token, telegramUserId, chatId, chatTitle }) =>
    adminService.confirmTelegramChannelVerification({
      token,
      telegramUserId,
      chatId,
      chatTitle,
    }),
  );
}

